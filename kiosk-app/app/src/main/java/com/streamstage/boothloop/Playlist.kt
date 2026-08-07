package com.streamstage.boothloop

import android.content.Context
import android.util.Log
import java.io.File

/**
 * Finds the films to loop. Pure local filesystem — no network, no content provider,
 * no runtime permission needed.
 *
 * Where the films live, in priority order:
 *
 *  1. <externalFilesDir>/media          (/sdcard/Android/data/com.streamstage.boothloop/files/media)
 *  2. <externalFilesDir>                (same dir, films pushed flat)
 *  3. <filesDir>/media                  (internal, only reachable via `adb push` + run-as)
 *
 * (1) is the one to use. It is app-scoped external storage, which means `adb push` writes
 * to it directly on every Android version from 4.4 to 15 with NO storage permission and no
 * scoped-storage dance. That is the entire reason it was chosen over /sdcard/Movies.
 *
 * Ordering:
 *  - If `playlist.txt` sits in the media dir, it wins. One filename per line, `#` comments
 *    and blank lines ignored. Lines naming a file that is not present are skipped (so a
 *    half-pushed stick still plays what it has instead of failing).
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

    /** Every directory we are willing to look in, best first. */
    fun candidateDirs(context: Context): List<File> {
        val dirs = mutableListOf<File>()
        context.getExternalFilesDir(null)?.let {
            dirs += File(it, "media")
            dirs += it
        }
        dirs += File(context.filesDir, "media")
        return dirs
    }

    /**
     * @return the ordered list of playable files, or empty if nothing was found anywhere.
     */
    fun resolve(context: Context): List<File> {
        for (dir in candidateDirs(context)) {
            val files = videosIn(dir)
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
