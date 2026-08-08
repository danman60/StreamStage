package com.streamstage.boothloop

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.StatFs
import android.util.Log
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors

/**
 * Everything the booth app does with the network. All of it, in one file, on demand only.
 *
 * ## The rule this file exists under
 *
 * The loop is the product. The updater is a convenience bolted to the side of it. **Every
 * failure mode here has the same consequence: nothing changes and the loop keeps playing.**
 * There is no path through this code that deletes, truncates or overwrites a live film before
 * a replacement has been downloaded in full and verified byte-for-byte and hash-for-hash.
 *
 * Concretely:
 *
 *  - Nothing here runs unless Daniel opens the panel on the remote. No boot check, no poll,
 *    no `WorkManager`, no alarm, no timer. Look for one — there isn't one to find.
 *  - Downloads land in `<media>/.staging/<versioned>.part`. No live film is ever opened for
 *    writing, and no live *path* is ever written to at all.
 *  - A `.part` is promoted to `<media>/.staging/<versioned>` only after **both** the byte count
 *    and the sha256 match the manifest. A hotel-wifi truncation dies here, which is the one
 *    failure `push-media.sh` cannot catch.
 *  - Going live is a single `rename()` within one filesystem, into a filename that has never
 *    existed on this device — see [FilmVersions]. There is no window in which a film is missing
 *    or half-written, and no path is ever replaced underneath a reader.
 *  - The destination is then **read back and hashed** before any success is recorded. That check
 *    caught the Fire OS FUSE corruption on 2026-08-07 and it stays, even though versioned
 *    filenames mean it should now never have anything to catch.
 *  - Any leftover `.part` from a killed download is resumed, not restarted — R2 serves `Range`.
 */
object UpdateManager {

    private const val TAG = "BoothLoop/Update"

    /** Where the publish side puts things. Overridable per-stick, see [baseUrl]. */
    const val DEFAULT_BASE = "https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev/booth/"

    const val MANIFEST_NAME = "manifest.json"
    const val STAGING_DIR = ".staging"

    /**
     * Suffix for a copy of a live film moved aside during a swap.
     *
     * **Nothing produces one of these any more.** Films are versioned now ([FilmVersions]): a new
     * version is written to its own filename, so there is no live path to move out of the way and
     * no rollback file to leave behind. The constant survives so [sweepPartials] can clear one
     * left by the previous build, which is the state a stick upgraded from `a1e9ace` starts in.
     *
     * ## The failure it used to defend against, kept because it explains the design
     *
     * Renaming straight over the live path is the obvious implementation and it is what this did
     * originally. On Fire OS 8 it is not safe. `/sdcard` is not a real filesystem: it is a FUSE
     * mount served by MediaProvider (`/dev/fuse on /storage/emulated`, verified on the booth
     * stick). When a `rename()` replaces a path something still has **open** through that mount —
     * and ExoPlayer always has the *next* film in the reel open, because it pre-buffers it — the
     * rename succeeds on the ext4 underneath, but the FUSE layer carries on serving that path from
     * the previous file's cached size, cached mtime and cached pages.
     *
     * Every reader on the device then sees a file that does not exist anywhere: the old byte
     * count, the old mtime, and a 4 KB-page-granular *mixture* of the old and new films. Measured
     * on the booth stick 2026-08-07: 83.8% of pages the new film, 16.2% still the old one. It
     * decodes to `Invalid NAL unit size`. Restarting MediaProvider dropped the caches and the same
     * path immediately read back as the correct new film, byte for byte — proof that the disk was
     * always right and only the view of it was wrong.
     *
     * Moving the old film aside first made success the normal outcome instead of a rollback every
     * time. Giving every version its own filename removes the question: the destination of a swap
     * is now a path nothing has ever opened.
     */
    const val PREV_SUFFIX = ".prev"

    /** A manifest larger than this is not a manifest. Stops a hostile stream eating RAM. */
    private const val MANIFEST_MAX_BYTES = 256 * 1024

    private const val CONNECT_TIMEOUT_MS = 10_000
    private const val READ_TIMEOUT_MS = 20_000

    /** Headroom kept free on /sdcard after a download, so the stick never fills up. */
    private const val FREE_SPACE_MARGIN = 256L * 1024 * 1024

    /**
     * Below this, on battery, an update is refused. A Fire Stick is mains-powered and reports no
     * battery at all, so this only ever bites on a phone or tablet used for bench testing — which
     * is exactly where a download dying at 80% is most likely.
     */
    private const val MIN_BATTERY_PCT = 25

    /**
     * One worker, at background priority. Two downloads at once on booth wifi helps nobody,
     * and nothing in here is allowed to compete with the video decoder for a core — the
     * playing reel outranks the update, always.
     */
    private val worker = Executors.newSingleThreadExecutor { r ->
        Thread({
            android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_BACKGROUND)
            r.run()
        }, "BoothLoopUpdate").apply { isDaemon = true }
    }

    fun run(task: () -> Unit) {
        runCatching { worker.execute(task) }
            .onFailure { Log.w(TAG, "Could not schedule update work", it) }
    }

    // ------------------------------------------------------------------ paths

    fun stagingDir(mediaDir: File): File = File(mediaDir, STAGING_DIR)

    /**
     * Base URL for this stick. Normally [DEFAULT_BASE]; a `.update-base` file in the media
     * folder overrides it, which is how this gets tested against a laptop before anything is
     * published. Only `https://` and loopback `http://` are accepted — a stray or tampered
     * override file cannot point the stick at a plaintext server on the show floor.
     */
    fun baseUrl(mediaDir: File): String = localOverride(mediaDir) ?: DEFAULT_BASE

    private fun localOverride(mediaDir: File): String? {
        val f = File(mediaDir, ".update-base")
        if (!f.isFile || !f.canRead() || f.length() > 512) return null
        val raw = runCatching { f.readText().trim() }.getOrNull().orEmpty()
        val ok = raw.startsWith("https://") ||
            raw.startsWith("http://127.0.0.1") ||
            raw.startsWith("http://localhost")
        if (!ok) {
            Log.w(TAG, ".update-base ignored — not https or loopback")
            return null
        }
        return if (raw.endsWith("/")) raw else "$raw/"
    }

    /**
     * Where the *films* come from, which is not necessarily where the manifest came from.
     *
     * Precedence, most specific first:
     *  1. `.update-base` on this stick — a deliberate local override, used for bench testing
     *     against a laptop. If it is set, everything comes from there.
     *  2. The manifest's own `base`, if it is a valid https URL. This is what lets the bucket
     *     move without reinstalling the APK on a stick that is in a box in Calgary.
     *  3. [DEFAULT_BASE], compiled in.
     */
    fun filmBase(mediaDir: File, manifest: FilmManifest?): String =
        localOverride(mediaDir) ?: manifest?.base ?: DEFAULT_BASE

    /**
     * Can this app actually put a file in the films folder?
     *
     * This is a real write, not a permission check, because on Fire OS 8 the permission and
     * the outcome are not the same question. `/sdcard/Movies` is a media collection under
     * Android 11 scoped storage: the platform lets an app write *media* files there by raw
     * path and refuses everything else with `EPERM`, and it will not let an app replace a
     * file another uid created — which is precisely what an update has to do, since the
     * existing films were pushed over adb.
     *
     * The grant that makes it work on the dedicated booth stick is all-files access, given
     * non-interactively from the laptop exactly like the read permission:
     *
     *     adb shell appops set --uid com.streamstage.boothloop MANAGE_EXTERNAL_STORAGE allow
     *
     * Without it the app is exactly what it was before this feature existed: it reads and
     * plays the films and cannot change them. The panel says so, in those words, and offers
     * no Update button it cannot honour.
     */
    fun canWriteMedia(mediaDir: File): Boolean = runCatching {
        val staging = stagingDir(mediaDir)
        staging.mkdirs()
        if (!staging.isDirectory) return false
        val probe = File(staging, ".writeprobe")
        probe.delete()
        val ok = probe.createNewFile()
        probe.delete()
        ok
    }.getOrElse {
        Log.w(TAG, "Media folder is not writable: ${mediaDir.absolutePath}", it)
        false
    }

    /** True when the stick has been given all-files access (API 30+). Diagnostics only. */
    fun hasAllFilesAccess(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.R ||
            runCatching { android.os.Environment.isExternalStorageManager() }.getOrDefault(false)

    /**
     * A file in `.staging` that is a film waiting to go live — as opposed to a half-finished
     * download (`.part`), a film moved aside by the pre-versioning swap ([PREV_SUFFIX]), or the
     * write probe.
     */
    private fun isStagedFilm(f: File): Boolean =
        f.isFile &&
            !f.name.endsWith(".part") &&
            !f.name.endsWith(PREV_SUFFIX) &&
            !f.name.startsWith(".")

    /**
     * Clears junk out of staging: a film left moved-aside by the old swap, and any `.part` too
     * stale to be worth resuming.
     *
     * A `.part` is **not** swept just for existing any more — it is the resume point for a
     * download that hotel wifi interrupted, and throwing it away is the 46 MB restart this build
     * exists partly to stop (see [download]). It is only swept when it has been sitting there for
     * more than [PART_MAX_AGE_MS], by which time the version it belongs to has probably been
     * superseded anyway. A `.part` is named for the version's hash, so a stale one can never be
     * confused with the current version's.
     */
    fun sweepPartials(mediaDir: File) {
        val now = System.currentTimeMillis()
        runCatching {
            stagingDir(mediaDir).listFiles()?.forEach { f ->
                if (!f.isFile) return@forEach
                when {
                    f.name.endsWith(PREV_SUFFIX) -> {
                        Log.i(TAG, "Sweeping ${f.name} left by an older build")
                        f.delete()
                    }
                    f.name.endsWith(".part") && now - f.lastModified() > PART_MAX_AGE_MS -> {
                        Log.i(TAG, "Sweeping stale ${f.name}")
                        f.delete()
                    }
                }
            }
        }
    }

    /** A week. Long enough to survive a show, short enough not to be a disk leak. */
    private const val PART_MAX_AGE_MS = 7L * 24 * 60 * 60 * 1000

    /**
     * Deletes versions that are neither current nor the rollback.
     *
     * **Timing is the whole safety argument.** This must only ever run when the caller knows the
     * player is not holding the file — which in practice means after a reel rebuild has dropped it
     * from the item list. [protectedNames] is the caller's belt and braces on top of that.
     */
    fun sweepSuperseded(context: Context, mediaDir: File, protectedNames: Set<String>): Int {
        val files = runCatching { mediaDir.listFiles()?.filter { it.isFile }.orEmpty() }
            .getOrElse { return 0 }
        val doomed = FilmVersions.supersededFiles(
            FilmVersions.pointers(context), files, protectedNames
        )
        var n = 0
        for (f in doomed) {
            if (f.delete()) {
                Log.i(TAG, "Removed superseded ${f.name}")
                InstallRecords.installed(context).remove(f.name)
                n++
            }
        }
        return n
    }

    // ------------------------------------------------------------------ manifest

    sealed class CheckResult {
        data class Ok(val manifest: FilmManifest) : CheckResult()
        /** [message] is written for a TV, not a log. Never a stack trace. */
        data class Failed(val message: String) : CheckResult()
    }

    /** Blocking. Worker thread only. */
    fun fetchManifest(mediaDir: File): CheckResult {
        val url = baseUrl(mediaDir) + MANIFEST_NAME
        var conn: HttpURLConnection? = null
        return try {
            conn = open(url)
            val code = conn.responseCode
            if (code == 404) return CheckResult.Failed("no film list published yet")
            if (code != 200) return CheckResult.Failed("server said $code — the loop is unaffected")

            val text = conn.inputStream.use { readCapped(it, MANIFEST_MAX_BYTES) }
                ?: return CheckResult.Failed("film list was too large to be real — ignored")

            val manifest = ManifestParser.parse(text)
                ?: return CheckResult.Failed("film list was unreadable — nothing changed")
            Log.i(TAG, "Manifest v${manifest.version}, ${manifest.films.size} film(s)")
            CheckResult.Ok(manifest)
        } catch (t: Throwable) {
            Log.w(TAG, "Manifest fetch failed", t)
            CheckResult.Failed(friendlyNetworkError(t))
        } finally {
            runCatching { conn?.disconnect() }
        }
    }

    // ------------------------------------------------------------------ preflight

    /**
     * Everything that would make a download fail half way, asked *before* the first byte.
     *
     * The booth failure this prevents is not subtle: Daniel presses Update All at 8:40am, watches
     * a progress bar crawl for four minutes, and gets "not enough space on the stick" — having
     * spent the bandwidth and the four minutes. A refusal is only useful if it is instant.
     *
     * @return null when it is safe to start, otherwise a sentence for the TV.
     */
    fun preflight(context: Context, mediaDir: File, entries: List<FilmEntry>): String? {
        if (!canWriteMedia(mediaDir)) return "this stick cannot replace films"

        // Versions coexist by design, so a download needs room for the new film on top of the old
        // one — not the difference between them. Anything already staged costs nothing more.
        val staging = stagingDir(mediaDir)
        val needed = entries.sumOf { e ->
            val target = File(staging, FilmVersions.versionedName(e.file, e.sha256))
            val already = if (target.isFile) target.length() else
                File(staging, target.name + ".part").let { if (it.isFile) it.length() else 0L }
            (e.bytes - already).coerceAtLeast(0L)
        }
        val free = freeSpace(mediaDir)
        if (free != Long.MAX_VALUE && free < needed + FREE_SPACE_MARGIN) {
            return "not enough room — ${mb(needed)} to fetch, ${mb(free)} free\n" +
                "  roll a film back, or free space, then try again"
        }

        battery(context)?.let { (pct, charging) ->
            if (!charging && pct in 0 until MIN_BATTERY_PCT) {
                return "battery is $pct% and not charging — plug in before updating"
            }
        }
        return null
    }

    /**
     * @return percent and whether it is on power, or null on a device with no battery at all —
     *         which is every Fire Stick, and is the answer "mains, carry on".
     */
    private fun battery(context: Context): Pair<Int, Boolean>? = runCatching {
        val i: Intent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            ?: return null
        if (!i.getBooleanExtra(BatteryManager.EXTRA_PRESENT, false)) return null
        val level = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = i.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
        if (level < 0 || scale <= 0) return null
        val plugged = i.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) != 0
        val status = i.getIntExtra(BatteryManager.EXTRA_STATUS, BatteryManager.BATTERY_STATUS_UNKNOWN)
        val charging = plugged ||
            status == BatteryManager.BATTERY_STATUS_CHARGING ||
            status == BatteryManager.BATTERY_STATUS_FULL
        (level * 100 / scale) to charging
    }.getOrNull()

    /** Free space on the films volume, for the panel. */
    fun freeSpaceText(mediaDir: File): String =
        freeSpace(mediaDir).let { if (it == Long.MAX_VALUE) "unknown" else mb(it) }

    // ------------------------------------------------------------------ download

    sealed class DownloadResult {
        object Staged : DownloadResult()
        object Cancelled : DownloadResult()
        data class Failed(val message: String) : DownloadResult()
    }

    /**
     * Downloads one film into staging and verifies it. Blocking. Worker thread only.
     *
     * Nothing outside `<media>/.staging/` is touched by this function, whatever happens.
     *
     * ## Resume
     *
     * R2 serves `Range` (`206 Partial Content`, `Accept-Ranges: bytes` — verified against the
     * live bucket). A `.part` left by a dropped connection is continued from its current length
     * with the sha256 seeded from the bytes already on disk, so a hotel wifi that dies at 80% of
     * a 46 MB film costs 9 MB to recover, not 46.
     *
     * The reason that is safe rather than terrifying: **the `.part` is named for the version's
     * hash**. A partial file under `costumecraft__03fcba88a2a4.mp4.part` can only ever be bytes of
     * the film whose sha256 starts `03fcba88a2a4`. There is no way to resume one film's download
     * into another's, which is the mistake that makes naive resume produce garbage. And if the
     * bytes on disk are garbage anyway, the whole-file hash at the end refuses them exactly as it
     * refuses a truncated download.
     */
    fun download(
        context: Context,
        mediaDir: File,
        base: String,
        entry: FilmEntry,
        onProgress: (downloaded: Long, total: Long) -> Unit,
        isCancelled: () -> Boolean
    ): DownloadResult {
        val staging = stagingDir(mediaDir)
        if (!staging.mkdirs() && !staging.isDirectory) {
            return DownloadResult.Failed("cannot write to the films folder")
        }

        val targetName = FilmVersions.versionedName(entry.file, entry.sha256)
        val part = File(staging, "$targetName.part")
        val done = File(staging, targetName)

        // Already fetched and waiting, or already installed: nothing to do. Free, and it makes
        // "update all" after a partial run cheap instead of 350 MB.
        if (done.isFile && done.length() == entry.bytes) {
            return vouch(context, done, entry)
        }
        val live = File(mediaDir, targetName)
        if (live.isFile && live.length() == entry.bytes) {
            Log.i(TAG, "$targetName is already on the stick")
            return DownloadResult.Staged
        }

        if (freeSpace(mediaDir) < entry.bytes + FREE_SPACE_MARGIN) {
            return DownloadResult.Failed("not enough space on the stick")
        }

        val digest = MessageDigest.getInstance("SHA-256")
        var have = if (part.isFile) part.length() else 0L
        if (have >= entry.bytes) {
            // A .part at or past the full length is not a resume point, it is a mistake.
            part.delete()
            have = 0L
        }
        if (have > 0L && !seedDigest(digest, part, have)) {
            Log.w(TAG, "Could not re-read ${part.name} — restarting the download")
            part.delete()
            have = 0L
        }
        if (have > 0L) Log.i(TAG, "Resuming $targetName at $have of ${entry.bytes}")

        var conn: HttpURLConnection? = null
        try {
            conn = open(base + entry.file, rangeFrom = have)
            val code = conn.responseCode
            if (code == 404) return DownloadResult.Failed("that film is not on the server")

            var written = have
            var append = have > 0L
            if (have > 0L && code == 200) {
                // Server ignored the Range and is sending the whole file. Honest fallback:
                // start again from zero rather than glue an offset stream onto a prefix.
                Log.i(TAG, "Server ignored Range — restarting $targetName from the top")
                digest.reset()
                written = 0L
                append = false
            } else if (have > 0L && code != 206) {
                return DownloadResult.Failed("server would not resume — nothing changed")
            } else if (have == 0L && code != 200) {
                return DownloadResult.Failed("server said $code — nothing changed")
            }

            // If the server tells us a length and it disagrees with what is still outstanding,
            // the two sides are out of step. Stop before spending 90 MB of booth wifi on it.
            val declared = conn.contentLengthLong
            val outstanding = entry.bytes - written
            if (declared > 0 && declared != outstanding) {
                return DownloadResult.Failed("server copy is a different size")
            }

            var lastReport = 0L
            onProgress(written, entry.bytes)

            conn.inputStream.use { input ->
                FileOutputStream(part, append).use { out ->
                    val buf = ByteArray(64 * 1024)
                    while (true) {
                        if (isCancelled()) {
                            // The .part is kept, deliberately. Stopping is not the same as
                            // discarding, and the next attempt resumes from here.
                            out.flush()
                            out.fd.sync()
                            return DownloadResult.Cancelled
                        }
                        val n = input.read(buf)
                        if (n < 0) break
                        if (n == 0) continue
                        // Refuse to keep writing past the size the manifest promised.
                        if (written + n > entry.bytes) {
                            part.delete()
                            return DownloadResult.Failed("server copy is larger than expected")
                        }
                        out.write(buf, 0, n)
                        digest.update(buf, 0, n)
                        written += n
                        if (written - lastReport >= 512 * 1024) {
                            lastReport = written
                            onProgress(written, entry.bytes)
                        }
                    }
                    out.flush()
                    out.fd.sync()   // on disk, not just in a page cache the power cut will eat
                }
            }
            onProgress(written, entry.bytes)

            // ---- the gate. Both checks, or it does not go live. ----
            if (written != entry.bytes) {
                Log.w(TAG, "${entry.file}: got $written bytes, expected ${entry.bytes}")
                // Short means the connection dropped. Keep the .part: that is the resume point.
                return DownloadResult.Failed("the network dropped — press update again to resume")
            }
            val got = digest.digest().toHex()
            if (got != entry.sha256) {
                Log.w(TAG, "${entry.file}: sha256 $got != ${entry.sha256}")
                part.delete()
                return DownloadResult.Failed("did not verify — nothing changed")
            }
            if (part.length() != entry.bytes) {
                // Belt and braces: what the filesystem says, not just what we counted.
                part.delete()
                return DownloadResult.Failed("staged file is the wrong size")
            }

            done.delete()
            if (!part.renameTo(done)) {
                part.delete()
                return DownloadResult.Failed("could not stage the film")
            }

            return vouch(context, done, entry)
        } catch (t: Throwable) {
            Log.w(TAG, "Download failed for ${entry.file}", t)
            // The .part stays. Whatever arrived is a resume point, and the hash gate means a
            // corrupt one can never reach the reel.
            return DownloadResult.Failed(friendlyNetworkError(t))
        } finally {
            runCatching { conn?.disconnect() }
        }
    }

    /**
     * Writes down what a staged film is, and **fails the download if that cannot be written.**
     *
     * This looks like bookkeeping and it is not. [applyStaged] refuses to install a staged file it
     * has no record for — correctly, because a file in `.staging` with nothing vouching for it
     * could be anything — and it deletes it. So a `pending.json` write that quietly failed used to
     * produce this, at a venue: the panel says "ready · swaps in when it next comes round", the
     * film is deleted at the next loop boundary, the row never changes, nothing appears on screen,
     * and no error is shown anywhere. Pressing Update again re-downloads 90 MB and loses it again.
     *
     * `InstallRecords.put` already returns whether it persisted; the whole bug was ignoring it.
     * Now an unwritable record means the staged file goes immediately, while there is still
     * somebody looking at the screen to be told why.
     */
    private fun vouch(context: Context, done: File, entry: FilmEntry): DownloadResult {
        val ok = InstallRecords.pending(context).put(
            done.name,
            InstallRecords.Rec(entry.bytes, done.lastModified(), entry.sha256, "manifest")
        )
        if (!ok) {
            Log.e(TAG, "Could not record ${done.name} as staged — discarding it rather than " +
                    "leaving a film nothing can vouch for")
            done.delete()
            return DownloadResult.Failed("this stick could not save its own notes — nothing changed")
        }
        Log.i(TAG, "${done.name} verified and staged")
        return DownloadResult.Staged
    }

    /** Feeds the bytes already on disk into [digest] so a resumed download still hashes right. */
    private fun seedDigest(digest: MessageDigest, part: File, count: Long): Boolean = runCatching {
        RandomAccessFile(part, "r").use { raf ->
            val buf = ByteArray(256 * 1024)
            var left = count
            while (left > 0) {
                val n = raf.read(buf, 0, minOf(buf.size.toLong(), left).toInt())
                if (n <= 0) return false
                digest.update(buf, 0, n)
                left -= n
            }
        }
        true
    }.getOrElse { false }

    // ------------------------------------------------------------------ apply

    data class Applied(
        /** Logical film names that are now live — `costumecraft.mp4`, not the versioned file. */
        val names: List<String>,
        /**
         * Films that reached their final path and did not read back correctly there. Never empty
         * silently: the panel says so and no success is recorded for any of them.
         */
        val failed: List<String> = emptyList()
    )

    /**
     * Promotes verified staged films into the live folder — and then **proves** it, by reading
     * the destination back and hashing it.
     *
     * **Blocking and slow. Worker thread only.** It hashes every film it swaps, which is seconds
     * per film.
     *
     * Per film:
     *
     *  1. rename the verified staged film to `<media>/<name>__<hash>.<ext>` — a path that has
     *     never existed on this device, so nothing can have it open and no FUSE cache entry can
     *     be stale for it;
     *  2. **read that path back** and check its byte count and sha256 against the manifest;
     *  3. only then point `films.json` at it and record the success.
     *
     * If step 1 or 2 fails, the new file is deleted and the pointer is untouched: the booth is
     * byte-for-byte and frame-for-frame exactly what it was. Step 2 is the check added in
     * `a1e9ace` after the Fire OS FUSE corruption, and it is kept even though versioned filenames
     * should mean it never has anything to catch. **A success is only ever recorded for bytes that
     * were read back from the final path.**
     *
     * [isOnScreen] is asked, per film, before it is touched. With versioned filenames the film on
     * screen is not at risk — its file is not the destination of anything — so this now only
     * declines to *point away* from a film mid-play, which would otherwise strand the reel on a
     * path the next rebuild removes. The visible behaviour is unchanged: what you are watching is
     * what you keep watching until it comes round again.
     */
    fun applyStaged(context: Context, mediaDir: File, isOnScreen: (String) -> Boolean): Applied {
        val staging = stagingDir(mediaDir)
        val ready = staging.listFiles()?.filter { isStagedFilm(it) }
            ?: return Applied(emptyList())
        if (ready.isEmpty()) return Applied(emptyList())

        val pending = InstallRecords.pending(context)
        val installed = InstallRecords.installed(context)
        val pointers = FilmVersions.pointers(context)
        val applied = mutableListOf<String>()
        val failed = mutableListOf<String>()

        for (staged in ready) {
            val logical = FilmVersions.logicalName(staged.name)
            if (isOnScreen(staged.name)) continue

            val rec = pending.get(staged.name)
            if (rec == null || staged.length() != rec.bytes) {
                // Staged without a record, or changed since: we cannot vouch for it, so it does
                // not go anywhere near the live folder.
                //
                // It is also **reported**. Deleting a film somebody watched download, and saying
                // nothing, is the worst outcome available here: the panel would sit on "ready"
                // for a film that no longer exists. [vouch] should make this unreachable; if it
                // happens anyway, it says so on the TV.
                Log.e(TAG, "Discarding unvouched staged file ${staged.name}")
                staged.delete()
                failed += logical
                continue
            }

            val live = File(mediaDir, staged.name)
            if (live.isFile) {
                // Same version already installed — the download short-circuit should have caught
                // this, but if a previous run died between the rename and the pointer write, this
                // is how it heals. Never overwrite: confirm what is there and move on.
                if (confirm(live, rec) == null) {
                    staged.delete()
                    promote(pointers, installed, mediaDir, logical, live, rec)
                    pending.remove(staged.name)
                    applied += logical
                    Log.i(TAG, "$logical was already installed as ${live.name} — pointer updated")
                    continue
                }
                // It is there and it is wrong. Whether it can be removed depends on whether
                // anything could still be reading it: a file some pointer names is a file the
                // reel may have open right now, and unlinking one of those is the whole family of
                // failure this versioning scheme exists to avoid. Leave it, report it, change
                // nothing. The staged copy stays for a later attempt.
                if (isReferenced(pointers, live.name)) {
                    Log.e(TAG, "${live.name} is in use and does not verify — leaving it alone")
                    failed += logical
                    continue
                }
                Log.w(TAG, "${live.name} is unreferenced and does not verify — replacing it")
                live.delete()
            }

            if (!staged.renameTo(live)) {
                Log.w(TAG, "Could not put ${staged.name} in place — nothing changed")
                continue
            }

            val problem = confirm(live, rec)
            if (problem != null) {
                Log.e(TAG, "${staged.name} did not verify at its final path ($problem) — " +
                        "removing it, the booth is unchanged")
                live.delete()
                // No record, in either file. A film we could not confirm must leave no trace
                // claiming we could. The pointer is untouched, so the reel never saw it.
                pending.remove(staged.name)
                installed.remove(staged.name)
                failed += logical
                continue
            }

            promote(pointers, installed, mediaDir, logical, live, rec)
            pending.remove(staged.name)
            applied += logical
            Log.i(TAG, "Applied $logical as ${live.name} — confirmed at its final path")
        }
        return Applied(applied.distinct(), failed.distinct())
    }

    /**
     * True when some film's pointer names this file — as its current version or its rollback.
     *
     * The one question worth asking before unlinking anything in the media folder: a referenced
     * file is one the reel can have open, and on this device removing a file out from under an
     * open fd is how the 2026-08-07 corruption started.
     */
    private fun isReferenced(pointers: FilmVersions.Pointers, name: String): Boolean =
        pointers.all().values.any { it.current == name || it.previous == name }

    /**
     * Records the confirmed file and makes it the current version.
     *
     * The pointer flip is the last thing that happens, after the bytes are on disk and have been
     * read back. Until it happens the new file is inert — present in the folder, in nobody's reel.
     */
    private fun promote(
        pointers: FilmVersions.Pointers,
        installed: InstallRecords,
        mediaDir: File,
        logical: String,
        live: File,
        rec: InstallRecords.Rec
    ) {
        installed.put(
            live.name,
            InstallRecords.Rec(rec.bytes, live.lastModified(), rec.sha256, "manifest", spotHash(live))
        )
        // First update for a film that arrived over adb: the plain file already on the stick is
        // what "roll back" has to mean, so it is recorded as the previous version.
        val legacy = File(mediaDir, logical).takeIf { it.isFile && it.name != live.name }?.name
        pointers.promote(logical, live.name, rec.sha256, rec.mtime.toString(), legacy)
    }

    /**
     * Reads the film back from where it now lives and checks it against what we downloaded.
     *
     * @return null when the destination is exactly the film the manifest describes, otherwise a
     *         short reason for the log.
     */
    private fun confirm(live: File, rec: InstallRecords.Rec): String? {
        if (!live.isFile) return "it is not there"
        val len = live.length()
        if (len != rec.bytes) return "$len bytes, expected ${rec.bytes}"
        val sha = hashFile(live) { false } ?: return "could not be read back"
        if (sha != rec.sha256) return "sha256 $sha, expected ${rec.sha256}"
        return null
    }

    /** True when something is sitting in staging waiting to be put in place. */
    fun hasStaged(mediaDir: File): Boolean =
        stagingDir(mediaDir).listFiles()?.any { isStagedFilm(it) } == true

    // ------------------------------------------------------------------ rollback

    /**
     * Put a film back to the version before it. No network, no download, no hashing, no file
     * copied — both versions are already on the stick and this moves a name in `films.json`.
     *
     * This is the recovery path for the failure that is actually most likely at a booth: not a
     * dropped connection, but a render Daniel looks at on the TV and does not like. It has to be
     * possible in seconds, with a remote, with the wifi off.
     *
     * @return the description of what is now current, or null if there was nothing to go back to.
     */
    fun rollback(context: Context, logical: String): String? {
        val pointers = FilmVersions.pointers(context)
        val now = pointers.rollback(logical) ?: return null
        Log.i(TAG, "Rolled $logical back to $now")
        return now
    }

    /** @return every logical film that has a previous version on this stick to go back to. */
    fun rollbackable(context: Context, mediaDir: File): List<String> {
        val pointers = FilmVersions.pointers(context)
        return pointers.all().filter { (_, p) ->
            p.previous != null && File(mediaDir, p.previous).isFile
        }.keys.toList()
    }

    // ------------------------------------------------------------------ check my stick

    /** One line of the "check my stick" report, already written for a TV. */
    data class CheckLine(val name: String, val ok: Boolean, val text: String)

    /**
     * Re-hashes every film on the stick and says, in English, whether it is right.
     *
     * This is the 8am question — *is this thing correct?* — and it is answered without moving a
     * byte over the network beyond the few kilobytes of manifest. It deliberately ignores the
     * cached hashes in `installed.json`: a cache that agrees with itself is not evidence. Every
     * film is read off the flash and hashed, which is where damage actually shows up.
     *
     * With a manifest it compares against what is published. Without one — no wifi at the venue,
     * which is the normal case — it compares against what this stick recorded installing, and says
     * which of the two it did. Both are useful; conflating them would not be.
     *
     * Blocking and slow (tens of seconds for 350 MB, throttled so the reel does not stutter).
     * Worker thread only.
     */
    fun checkStick(
        context: Context,
        mediaDir: File,
        manifest: FilmManifest?,
        onProgress: (done: Int, total: Int, name: String) -> Unit,
        isCancelled: () -> Boolean
    ): List<CheckLine> {
        val pointers = FilmVersions.pointers(context)
        val installed = InstallRecords.installed(context)
        val onDisk = runCatching {
            mediaDir.listFiles()?.filter {
                it.isFile && !it.name.startsWith(".") &&
                    it.extension.lowercase() in setOf("mp4", "m4v", "mkv", "webm", "mov", "ts")
            }.orEmpty()
        }.getOrElse { emptyList() }

        val current = FilmVersions.currentFiles(pointers, onDisk).associateBy {
            FilmVersions.logicalName(it.name)
        }
        val names = (manifest?.films?.map { it.file }.orEmpty() + current.keys).distinct().sorted()

        val out = mutableListOf<CheckLine>()
        names.forEachIndexed { i, logical ->
            if (isCancelled()) return out
            onProgress(i, names.size, logical)
            val file = current[logical]
            val entry = manifest?.films?.firstOrNull { it.file.equals(logical, true) }

            if (file == null) {
                out += CheckLine(logical, false, "MISSING — not on this stick")
                return@forEachIndexed
            }
            val want = entry?.sha256 ?: installed.get(file.name)?.sha256
            val wantBytes = entry?.bytes ?: installed.get(file.name)?.bytes
            if (wantBytes != null && file.length() != wantBytes) {
                out += CheckLine(
                    logical, false,
                    "DAMAGED — ${mb(file.length())} on the stick, ${mb(wantBytes)} expected"
                )
                return@forEachIndexed
            }
            if (want == null) {
                out += CheckLine(logical, true, "on this stick only — nothing to compare it to")
                return@forEachIndexed
            }
            val sha = hashFile(file) { isCancelled() }
            if (isCancelled()) return out
            when {
                sha == null -> out += CheckLine(logical, false, "could not be read")
                sha == want -> out += CheckLine(
                    logical, true,
                    if (entry != null) "correct — matches the published film"
                    else "correct — matches what this stick installed"
                )
                entry != null -> out += CheckLine(
                    logical, false, "OLD OR CHANGED — not the published version"
                )
                else -> out += CheckLine(
                    logical, false, "CHANGED since this stick installed it — damaged"
                )
            }
        }
        onProgress(names.size, names.size, "")
        return out
    }

    // ------------------------------------------------------------------ hashing

    /**
     * sha256 of a local film, with the answer cached in `.installed.json` so a 90 MB file is
     * only ever hashed once. Blocking, and slow (seconds) — worker thread only, never during
     * playback setup.
     */
    fun localSha256(context: Context, file: File, isCancelled: () -> Boolean = { false }): String? {
        val records = InstallRecords.installed(context)
        records.get(file.name)?.let { r ->
            if (file.length() == r.bytes && file.lastModified() == r.mtime) return r.sha256
        }
        val sha = hashFile(file, isCancelled) ?: return null
        records.put(
            file.name,
            InstallRecords.Rec(file.length(), file.lastModified(), sha, "local", spotHash(file))
        )
        return sha
    }

    /** How much of a film [spotHash] reads, at each of three places in it. */
    private const val SPOT_WINDOW = 256 * 1024

    /**
     * A cheap fingerprint of a film's actual contents: sha256 of the first, middle and last
     * 256 KB. Under a megabyte of reading, so [Playlist] can afford it on every launch, which
     * a full hash of 350 MB emphatically is not.
     *
     * It exists because a byte count is not evidence about contents. The Fire OS 8 failure this
     * guards against (see [PREV_SUFFIX]) hands readers a *mixture* of two films — and while the
     * one that happened had the wrong length too, nothing guarantees the next one will. A
     * mixture is scattered at page granularity, so sampling 192 pages catches it with a
     * probability that rounds to one; the measured case had 16% of pages wrong, which this
     * would miss only 1 time in 10^14.
     *
     * @return null if the file cannot be read, which callers treat as "no opinion", never as
     *         "bad" — an unreadable film is the storage permission's problem, not this one's.
     */
    fun spotHash(file: File): String? = runCatching {
        val len = file.length()
        if (len <= 0L) return null
        val digest = MessageDigest.getInstance("SHA-256")
        // The length goes in first, so two different films cannot collide by having identical
        // sampled regions and differing only in the parts that were never looked at.
        digest.update(len.toString().toByteArray())
        val window = minOf(SPOT_WINDOW.toLong(), len).toInt()
        val offsets = longArrayOf(0L, (len - window) / 2, len - window)
        FileInputStream(file).use { input ->
            val channel = input.channel
            val buf = ByteArray(window)
            for (off in offsets) {
                channel.position(off.coerceAtLeast(0L))
                var got = 0
                while (got < window) {
                    val n = input.read(buf, got, window - got)
                    if (n < 0) break
                    got += n
                }
                digest.update(buf, 0, got)
            }
        }
        digest.digest().toHex()
    }.getOrElse {
        Log.w(TAG, "Could not spot-check ${file.name}", it)
        null
    }

    private fun hashFile(file: File, isCancelled: () -> Boolean): String? = runCatching {
        val digest = MessageDigest.getInstance("SHA-256")
        FileInputStream(file).use { input ->
            val buf = ByteArray(256 * 1024)
            while (true) {
                if (isCancelled()) return null
                val n = input.read(buf)
                if (n < 0) break
                digest.update(buf, 0, n)
                // Deliberate throttle. Hashing 350 MB flat out off the same flash the decoder
                // is reading from is a good way to make the booth stutter; costing the check
                // a couple of seconds to leave the reel alone is the right trade.
                runCatching { Thread.sleep(2) }
            }
        }
        digest.digest().toHex()
    }.getOrElse {
        Log.w(TAG, "Could not hash ${file.name}", it)
        null
    }

    // ------------------------------------------------------------------ plumbing

    private fun open(url: String, rangeFrom: Long = 0L): HttpURLConnection {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = CONNECT_TIMEOUT_MS
        conn.readTimeout = READ_TIMEOUT_MS
        conn.instanceFollowRedirects = true
        conn.useCaches = false
        // No gzip: we are counting bytes against a manifest and comparing them to a hash.
        conn.setRequestProperty("Accept-Encoding", "identity")
        conn.setRequestProperty("User-Agent", "StreamStageBoothLoop")
        if (rangeFrom > 0L) conn.setRequestProperty("Range", "bytes=$rangeFrom-")
        conn.connect()
        return conn
    }

    private fun readCapped(input: InputStream, cap: Int): String? {
        val out = java.io.ByteArrayOutputStream()
        val buf = ByteArray(8 * 1024)
        while (true) {
            val n = input.read(buf)
            if (n < 0) break
            if (out.size() + n > cap) return null
            out.write(buf, 0, n)
        }
        return out.toString("UTF-8")
    }

    private fun freeSpace(dir: File): Long = runCatching {
        val stat = StatFs(dir.absolutePath)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) stat.availableBytes
        else @Suppress("DEPRECATION") (stat.availableBlocks.toLong() * stat.blockSize.toLong())
    }.getOrElse {
        // Cannot tell — assume there is room rather than blocking a legitimate update. The
        // download itself will fail cleanly on ENOSPC and leave the booth untouched.
        Long.MAX_VALUE
    }

    private fun mb(bytes: Long): String =
        if (bytes <= 0) "0 MB" else String.format("%.0f MB", bytes / 1024.0 / 1024.0)

    /**
     * Turns an exception into something worth putting on a booth TV. The rule for every
     * string in here: it says what happened and reassures that the loop is fine. It never
     * says "IOException".
     */
    private fun friendlyNetworkError(t: Throwable): String = when (t) {
        is java.net.UnknownHostException,
        is java.net.ConnectException,
        is java.net.NoRouteToHostException -> "no network — the loop is unaffected"
        is java.net.SocketTimeoutException -> "network too slow — press update again to resume"
        is javax.net.ssl.SSLException -> "could not secure the connection"
        is java.io.IOException -> "the network dropped — press update again to resume"
        else -> "could not reach the film server"
    }

    private fun ByteArray.toHex(): String {
        val sb = StringBuilder(size * 2)
        for (b in this) {
            val v = b.toInt() and 0xff
            sb.append("0123456789abcdef"[v ushr 4])
            sb.append("0123456789abcdef"[v and 0x0f])
        }
        return sb.toString()
    }
}
