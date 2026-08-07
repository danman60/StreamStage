package com.streamstage.boothloop

import android.content.Context
import android.os.Build
import android.os.StatFs
import android.util.Log
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
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
 *  - Downloads land in `<media>/.staging/<file>.part`. The live file is not opened for
 *    writing at any point.
 *  - A `.part` is promoted to `<media>/.staging/<file>` only after **both** the byte count
 *    and the sha256 match the manifest. A hotel-wifi truncation dies here, which is the one
 *    failure `push-media.sh` cannot catch.
 *  - Going live is a single `rename()` within one directory — atomic. There is no window in
 *    which the film is missing or half-written.
 *  - A film that is on screen is never swapped. It waits in `.staging` for the next loop
 *    boundary (see [BoothLoopActivity.applyStagedFilms]).
 *  - Any leftover `.part` from a killed download is deleted on the next check, so a stick
 *    that lost power mid-download does not accumulate junk.
 */
object UpdateManager {

    private const val TAG = "BoothLoop/Update"

    /** Where the publish side puts things. Overridable per-stick, see [baseUrl]. */
    const val DEFAULT_BASE = "https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev/booth/"

    const val MANIFEST_NAME = "manifest.json"
    const val STAGING_DIR = ".staging"

    /**
     * Suffix for the copy of a live film that has been moved aside during a swap. It lives in
     * `.staging` so it is on the same filesystem as both the live folder and the new film, which
     * is what makes every step of the swap an atomic `rename()`.
     *
     * ## Why the swap moves the old film aside instead of renaming on top of it
     *
     * Renaming straight over the live path is the obvious implementation and it is what this
     * did originally. On Fire OS 8 it is not safe. `/sdcard` is not a real filesystem: it is
     * a FUSE mount served by MediaProvider (`/dev/fuse on /storage/emulated`, verified on the
     * booth stick). When a `rename()` replaces a path that something still has **open** through
     * that mount — and ExoPlayer always has the *next* film in the reel open, because it
     * pre-buffers it — the rename succeeds on the ext4 underneath, but the FUSE layer carries
     * on serving that path from the previous file's cached size, cached mtime and cached pages.
     *
     * Every reader on the device then sees a file that does not exist anywhere: the old byte
     * count, the old mtime, and a 4 KB-page-granular *mixture* of the old and new films.
     * Measured on the booth stick 2026-08-07: 83.8% of pages the new film, 16.2% still the old
     * one. It decodes to `Invalid NAL unit size`. Restarting MediaProvider dropped the caches
     * and the same path immediately read back as the correct new film, byte for byte — proof
     * that the disk was always right and only the view of it was wrong.
     *
     * Moving the old film to a different path first means the live path is *created* by the
     * swap rather than overwritten, so there is no previous cache entry for it to be confused
     * with. [confirm] then proves the result either way; this only makes success the normal
     * outcome instead of a rollback every time.
     */
    const val PREV_SUFFIX = ".prev"

    /** A manifest larger than this is not a manifest. Stops a hostile stream eating RAM. */
    private const val MANIFEST_MAX_BYTES = 256 * 1024

    private const val CONNECT_TIMEOUT_MS = 10_000
    private const val READ_TIMEOUT_MS = 20_000

    /** Headroom kept free on /sdcard after a download, so the stick never fills up. */
    private const val FREE_SPACE_MARGIN = 64L * 1024 * 1024

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
     * download (`.part`), a film moved aside mid-swap ([PREV_SUFFIX]), or the write probe.
     */
    private fun isStagedFilm(f: File): Boolean =
        f.isFile &&
            !f.name.endsWith(".part") &&
            !f.name.endsWith(PREV_SUFFIX) &&
            !f.name.startsWith(".")

    /**
     * Deletes half-finished downloads left by a power cut or a cancelled update, and any film
     * left moved-aside by a swap that was interrupted part way.
     *
     * A `.prev` is only ever the *old* copy of a film that has already been replaced, so it is
     * safe to drop: either the swap completed (the new film is live and the backup is dead
     * weight) or it rolled back (the backup was renamed into place and this one no longer
     * exists). It is only reached at all if the process died between those two moments, and by
     * then the live path is whatever it is — see [restoreOrReport].
     */
    fun sweepPartials(mediaDir: File) {
        runCatching {
            stagingDir(mediaDir).listFiles()
                ?.filter { it.isFile && (it.name.endsWith(".part") || it.name.endsWith(PREV_SUFFIX)) }
                ?.forEach {
                    Log.i(TAG, "Sweeping stale ${it.name}")
                    it.delete()
                }
        }
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
     * On any failure the `.part` is deleted and the booth is byte-identical to before.
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
        if (freeSpace(mediaDir) < entry.bytes + FREE_SPACE_MARGIN) {
            return DownloadResult.Failed("not enough space on the stick")
        }

        val part = File(staging, entry.file + ".part")
        val done = File(staging, entry.file)
        part.delete()
        done.delete()

        var conn: HttpURLConnection? = null
        try {
            conn = open(base + entry.file)
            val code = conn.responseCode
            if (code == 404) return DownloadResult.Failed("that film is not on the server")
            if (code != 200) return DownloadResult.Failed("server said $code — nothing changed")

            // If the server tells us a length and it disagrees with the manifest, the two
            // sides are out of step. Stop before spending 90 MB of booth wifi on it.
            val declared = conn.contentLengthLong
            if (declared > 0 && declared != entry.bytes) {
                return DownloadResult.Failed("server copy is a different size")
            }

            val digest = MessageDigest.getInstance("SHA-256")
            var written = 0L
            var lastReport = 0L

            conn.inputStream.use { input ->
                FileOutputStream(part).use { out ->
                    val buf = ByteArray(64 * 1024)
                    while (true) {
                        if (isCancelled()) {
                            part.delete()
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
                part.delete()
                return DownloadResult.Failed("stopped short — nothing changed")
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

            if (!part.renameTo(done)) {
                part.delete()
                return DownloadResult.Failed("could not stage the film")
            }

            // Remember what it is, so the boundary swap can record it without re-hashing.
            InstallRecords.pending(context).put(
                entry.file,
                InstallRecords.Rec(entry.bytes, done.lastModified(), entry.sha256, "manifest")
            )
            Log.i(TAG, "${entry.file} verified and staged")
            return DownloadResult.Staged
        } catch (t: Throwable) {
            Log.w(TAG, "Download failed for ${entry.file}", t)
            runCatching { part.delete() }
            return DownloadResult.Failed(friendlyNetworkError(t))
        } finally {
            runCatching { conn?.disconnect() }
        }
    }

    // ------------------------------------------------------------------ apply

    data class Applied(
        val names: List<String>,
        val newFilms: List<String>,
        /**
         * Films that reached the live path but did not read back correctly there, and were
         * rolled back to the film that was playing before. Never empty silently: the panel
         * says so and no success is recorded for any of them.
         */
        val failed: List<String> = emptyList()
    )

    /**
     * Promotes verified staged films into the live folder — and then **proves** it, by reading
     * the destination back and hashing it.
     *
     * **Blocking and slow. Worker thread only.** It hashes every film it swaps, which is
     * seconds per film. It used to run on the main thread on the grounds that a rename is
     * sub-millisecond; that is no longer what this does, and [BoothLoopActivity.applyStagedFilms]
     * hands it to the update worker instead.
     *
     * [isOnScreen] is asked, per film, immediately before that film is touched — the film
     * currently on screen is left in staging and picked up at the next loop boundary. That is
     * rule 5: never swap what a visitor is watching. It is a callback rather than a name
     * because this function is now slow enough that the answer can change while it runs.
     *
     * The swap, per film:
     *
     *  1. move the live film aside to `.staging/<file>.prev` — atomic, and it is *kept*, not
     *     deleted, so there is always a copy of what the booth was playing;
     *  2. rename the verified staged film into the live path;
     *  3. **read the live path back** and check its byte count and sha256 against the manifest;
     *  4. only then delete the backup and record a success.
     *
     * If step 2 or 3 fails, the backup goes back and the booth is exactly what it was. Step 3
     * is the whole point: before it existed, a swap that reported success was assumed to have
     * happened, and on Fire OS 8 that assumption was wrong (see [PREV_SUFFIX]) — the app wrote
     * `installed.json` saying "46,858,558 bytes, sha256 03fcba88…" for a path that was serving
     * a corrupt mixture of two films. **A success is now only ever recorded for bytes that were
     * read back from the final path.**
     */
    fun applyStaged(context: Context, mediaDir: File, isOnScreen: (String) -> Boolean): Applied {
        val staging = stagingDir(mediaDir)
        val ready = staging.listFiles()?.filter { isStagedFilm(it) }
            ?: return Applied(emptyList(), emptyList())
        if (ready.isEmpty()) return Applied(emptyList(), emptyList())

        val pending = InstallRecords.pending(context)
        val installed = InstallRecords.installed(context)
        val applied = mutableListOf<String>()
        val brandNew = mutableListOf<String>()
        val failed = mutableListOf<String>()

        for (staged in ready) {
            if (isOnScreen(staged.name)) continue
            val rec = pending.get(staged.name)
            if (rec == null || staged.length() != rec.bytes) {
                // Staged without a record, or changed since: we cannot vouch for it, so it
                // does not go anywhere near the live folder.
                Log.w(TAG, "Discarding unvouched staged file ${staged.name}")
                staged.delete()
                continue
            }

            val live = File(mediaDir, staged.name)
            val backup = File(staging, staged.name + PREV_SUFFIX)
            val wasThere = live.isFile

            backup.delete()
            if (wasThere && !live.renameTo(backup)) {
                Log.w(TAG, "Could not move ${staged.name} aside — leaving the old film in place")
                continue
            }
            if (!staged.renameTo(live)) {
                Log.w(TAG, "Could not swap in ${staged.name} — restoring the old film")
                if (wasThere) restoreOrReport(backup, live)
                continue
            }

            val problem = confirm(live, rec)
            if (problem != null) {
                Log.e(TAG, "${staged.name} did not verify at its final path ($problem) — " +
                        "rolling the booth back, nothing is recorded")
                live.delete()
                if (wasThere) restoreOrReport(backup, live)
                // No record, in either file. A film we could not confirm must leave no trace
                // claiming we could.
                pending.remove(staged.name)
                installed.remove(staged.name)
                failed += staged.name
                continue
            }

            backup.delete()
            installed.put(
                staged.name,
                InstallRecords.Rec(
                    rec.bytes,
                    live.lastModified(),
                    rec.sha256,
                    "manifest",
                    spotHash(live)
                )
            )
            pending.remove(staged.name)
            applied += staged.name
            if (!wasThere) brandNew += staged.name
            Log.i(TAG, "Applied ${staged.name} (new=${!wasThere}) — confirmed at its final path")
        }
        return Applied(applied, brandNew, failed)
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

    /** Puts the old film back after a failed swap, and says so loudly if it cannot. */
    private fun restoreOrReport(backup: File, live: File) {
        if (backup.renameTo(live)) {
            Log.i(TAG, "Restored the previous ${live.name}")
            return
        }
        // Nothing left to try that would not risk making it worse. Say it plainly: Playlist
        // will drop the film from the reel rather than play something it cannot vouch for,
        // and the booth carries on with the films it still has.
        Log.e(TAG, "Could not restore the previous ${live.name} — it is left out of the reel")
    }

    /** True when something is sitting in staging waiting for a loop boundary. */
    fun hasStaged(mediaDir: File): Boolean =
        stagingDir(mediaDir).listFiles()?.any { isStagedFilm(it) } == true

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

    private fun open(url: String): HttpURLConnection {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = CONNECT_TIMEOUT_MS
        conn.readTimeout = READ_TIMEOUT_MS
        conn.instanceFollowRedirects = true
        conn.useCaches = false
        // No gzip: we are counting bytes against a manifest and comparing them to a hash.
        conn.setRequestProperty("Accept-Encoding", "identity")
        conn.setRequestProperty("User-Agent", "StreamStageBoothLoop")
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

    /**
     * Turns an exception into something worth putting on a booth TV. The rule for every
     * string in here: it says what happened and reassures that the loop is fine. It never
     * says "IOException".
     */
    private fun friendlyNetworkError(t: Throwable): String = when (t) {
        is java.net.UnknownHostException,
        is java.net.ConnectException,
        is java.net.NoRouteToHostException -> "no network — the loop is unaffected"
        is java.net.SocketTimeoutException -> "network too slow — nothing changed"
        is javax.net.ssl.SSLException -> "could not secure the connection"
        is java.io.IOException -> "the network dropped — nothing changed"
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
