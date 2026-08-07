package com.streamstage.boothloop

import android.content.Context
import android.os.Environment
import android.util.Log
import java.io.File

/**
 * Finds the films to loop. Pure local filesystem — no network, no content provider.
 *
 * ## Why the films live in /sdcard/Movies on a Fire Stick
 *
 * This originally targeted app-scoped external storage
 * (`/sdcard/Android/data/com.streamstage.boothloop/files/media`) on the theory that `adb push`
 * can always write there without a storage permission.
 *
 * **That is false on Fire OS 8.** Verified on the real booth device (Fire TV Stick 4K Max 2nd
 * gen, `AFTKRT`, Fire OS 8 / Android 11, API 30): Amazon locks the whole `Android/data` tree
 * down harder than stock Android 11, and adb cannot write — or even list — it:
 *
 *     $ adb shell ls /sdcard/Android/data/
 *     ls: /sdcard/Android/data/: Permission denied
 *
 * `/sdcard/Movies/` and `/sdcard/Download/` are freely writable by adb on the same device, so
 * that is where the films go. Reading them back needs `READ_EXTERNAL_STORAGE` (granted
 * non-interactively with `pm grant` — see README).
 *
 * Search order — app-private first so nothing regresses if a future device does allow it:
 *
 *  1. `<externalFilesDir>/media`        app-private (blocked on Fire OS 8, fine elsewhere)
 *  2. `<externalFilesDir>`              same, films pushed flat
 *  3. `/sdcard/Movies/StreamStageBooth` **the Fire Stick path** — needs READ_EXTERNAL_STORAGE
 *  4. `/sdcard/Download/StreamStageBooth` alternate, also adb-writable
 *  5. `<filesDir>/media`                internal, reachable via `adb push` + run-as
 *
 * Ordering within a directory:
 *  - If `playlist.txt` sits there, it wins. One filename per line, `#` comments and blank
 *    lines ignored. Lines naming a file that is not present are skipped (so a half-pushed
 *    stick still plays what it has instead of failing).
 *  - Otherwise: the known StreamStage running order first, then anything else alphabetically.
 */
object Playlist {

    private const val TAG = "BoothLoop/Playlist"

    private val VIDEO_EXTENSIONS = setOf("mp4", "m4v", "mkv", "webm", "mov", "ts")

    /**
     * Default running order for the booth. streamstage-services.mp4 leads because it is the
     * "who we are" film; the six product films follow. Any file not named here still plays —
     * it just sorts after these, alphabetically.
     */
    private val PREFERRED_ORDER = listOf(
        "streamstage-services.mp4",
        "studiosage.mp4",
        "compsync.mp4",
        "callboard.mp4",
        "costumecraft.mp4",
        "reflect.mp4",
        "studiobeat.mp4"
    )

    /** The folder name used under Movies/ and Download/ on shared storage. */
    const val SHARED_SUBDIR = "StreamStageBooth"

    /** Every directory we are willing to look in, best first. */
    fun candidateDirs(context: Context): List<File> {
        val dirs = mutableListOf<File>()

        // App-private external storage. Blocked on Fire OS 8, but tried first so that any
        // device which does permit it keeps working with no permission at all.
        context.getExternalFilesDir(null)?.let {
            dirs += File(it, "media")
            dirs += it
        }

        // Shared storage — where the films actually live on the Fire Stick.
        @Suppress("DEPRECATION")
        dirs += File(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES),
            SHARED_SUBDIR
        )
        @Suppress("DEPRECATION")
        dirs += File(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
            SHARED_SUBDIR
        )

        dirs += File(context.filesDir, "media")
        return dirs
    }

    /** True when at least one candidate directory holds a playable file. */
    fun anyMediaVisible(context: Context): Boolean =
        candidateDirs(context).any { videosIn(it).isNotEmpty() }

    /**
     * The directory the booth is actually playing from — and therefore the one the updater
     * downloads into. If nothing is anywhere yet (a fresh stick), this is the folder films
     * *should* go in, so the first download has somewhere to land.
     */
    fun activeDir(context: Context): File {
        for (dir in candidateDirs(context)) if (videosIn(dir).isNotEmpty()) return dir
        @Suppress("DEPRECATION")
        return File(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES),
            SHARED_SUBDIR
        )
    }

    /**
     * @return the ordered list of playable files, or empty if nothing was found anywhere.
     */
    fun resolve(context: Context): List<File> {
        for (dir in candidateDirs(context)) {
            val files = verified(context, videosIn(dir))
            if (files.isNotEmpty()) {
                val ordered = order(dir, files)
                Log.i(TAG, "Using ${ordered.size} file(s) from ${dir.absolutePath}: " +
                        ordered.joinToString { it.name })
                return ordered
            }
            Log.i(TAG, "No videos in ${dir.absolutePath}")
        }
        Log.w(TAG, "No videos found in any candidate directory")
        return emptyList()
    }

    private fun videosIn(dir: File): List<File> {
        if (!dir.isDirectory) return emptyList()
        val listed = dir.listFiles() ?: return emptyList()
        return listed.filter { f ->
            f.isFile &&
                f.length() > 0 &&
                f.canRead() &&
                !f.name.startsWith(".") &&
                f.extension.lowercase() in VIDEO_EXTENSIONS
        }
    }

    /**
     * Drops films that this stick installed from a manifest and that no longer match what it
     * installed.
     *
     * `length() > 0` used to be the whole test, and that is the gap this closes: a film that
     * arrived truncated — a `push-media.sh` that lost the cable at 80%, or an update that
     * somehow got half-written — is a non-zero-length file that ExoPlayer opens, plays part
     * of, and then errors on. The error path blacklists it, and if enough films land in the
     * blacklist the booth shows a black screen. Better to notice the damage here, where the
     * only consequence is a shorter reel.
     *
     * Deliberately cheap: length against the record in `installed.json`, which is microseconds.
     * There is no hashing on this path — a booth TV waiting 40 seconds to start because the
     * app is checksumming 350 MB would be a worse failure than the one being prevented. The
     * hash *is* checked, in full, at the moment a film is downloaded (see [UpdateManager]),
     * and again on demand from the update panel.
     *
     * Only files with a `"manifest"` record are subject to this. A film pushed over adb has
     * no record and behaves exactly as it always did — this cannot reject something it was
     * never told about.
     *
     * And if this would somehow throw out everything, it throws out nothing instead. A bug in
     * the verifier must never be able to black out the booth; that is the same reasoning as
     * the decoder blacklist in BoothLoopActivity.startPlayback.
     */
    private fun verified(context: Context, files: List<File>): List<File> {
        if (files.isEmpty()) return files
        val records = runCatching { InstallRecords.installed(context) }.getOrNull() ?: return files

        val good = files.filter { f ->
            val rec = records.get(f.name)
            when {
                rec == null -> true                       // never installed by us; not ours to judge
                rec.source != "manifest" -> true          // a cached hash, not a claim about validity
                f.length() == rec.bytes -> true           // still the file we verified
                else -> {
                    Log.e(TAG, "${f.name} is ${f.length()} bytes but was installed as " +
                            "${rec.bytes} — damaged, leaving it out of the reel")
                    false
                }
            }
        }
        if (good.isEmpty()) {
            Log.e(TAG, "Verification would drop every film — ignoring it and playing them all")
            return files
        }
        return good
    }

    private fun order(dir: File, files: List<File>): List<File> {
        val byName = files.associateBy { it.name.lowercase() }

        // 1. Explicit playlist.txt wins.
        val manifest = File(dir, "playlist.txt")
        if (manifest.isFile && manifest.canRead()) {
            val named = runCatching {
                manifest.readLines()
                    .map { it.trim() }
                    .filter { it.isNotEmpty() && !it.startsWith("#") }
                    .mapNotNull { byName[it.lowercase()] }
            }.getOrElse {
                Log.w(TAG, "playlist.txt unreadable, falling back to default order", it)
                emptyList()
            }
            if (named.isNotEmpty()) {
                // Anything on disk but absent from playlist.txt is appended, never dropped —
                // a stale playlist.txt should not silently hide a film someone just pushed.
                val rest = files.filterNot { it in named }.sortedBy { it.name.lowercase() }
                return named + rest
            }
        }

        // 2. Known booth order, then the rest alphabetically.
        val preferred = PREFERRED_ORDER.mapNotNull { byName[it.lowercase()] }
        val rest = files.filterNot { it in preferred }.sortedBy { it.name.lowercase() }
        return preferred + rest
    }
}
