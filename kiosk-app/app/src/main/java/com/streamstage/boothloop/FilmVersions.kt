package com.streamstage.boothloop

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.File

/**
 * Which file on this stick *is* a given film right now — and which one it was before.
 *
 * ## Why films have version numbers in their filenames
 *
 * The booth stick's `/sdcard` is a FUSE mount served by MediaProvider. Renaming a new film over a
 * live path that ExoPlayer still has open — and it always has the *next* film in the reel open,
 * because it pre-buffers it — succeeds on the ext4 underneath while the FUSE layer carries on
 * serving that path from the old file's cached size, mtime and pages. Every reader on the device
 * then sees a page-granular mixture of two films. Measured on this stick on 2026-08-07: 83.8% new
 * bytes, 16.2% old, decoding to `Invalid NAL unit size`.
 *
 * [UpdateManager.applyStaged] catches that by reading the destination back and hashing it, and
 * that check is still there. But catching it means the update *fails*, at a booth, on a show
 * morning. So the update path no longer creates the hazard at all:
 *
 *     costumecraft.mp4   ->   costumecraft__03fcba88a2a4.mp4
 *
 * Every downloaded version gets its own filename, derived from the sha256 the manifest already
 * publishes. Going live is a rename into a path **that has never existed on this device**, so
 * there is no previous cache entry for it to be confused with, and nothing anywhere can have it
 * open. The failure mode is structurally unreachable rather than merely detected.
 *
 * The name on the server does not change — the manifest still says `costumecraft.mp4` and that is
 * still what gets fetched. The versioning is entirely local, so the publish side needed no change.
 *
 * ## What this file is
 *
 *  - [logicalName] / [versionedName]: the naming rule, in one place.
 *  - [Pointers]: `films.json`, app-private, mapping a logical film to the file that is current and
 *    the file that was current before it. The "before" is not housekeeping — it is the booth
 *    rollback, and it is why a version is never deleted the moment it is superseded.
 *
 * ## Films that predate all of this
 *
 * The seven films on the stick today are plain `costumecraft.mp4` with no pointer, pushed over adb.
 * A logical film with no pointer plays whatever single file is there, exactly as before. Installing
 * this APK over the old one and never running an update changes nothing on disk and nothing on
 * screen. The first update for a film creates its pointer, with the plain file recorded as the
 * previous version — so the very first thing you can roll back to is what was already there.
 */
object FilmVersions {

    private const val TAG = "BoothLoop/Versions"

    /** Separates a film's logical name from its version tag. Two underscores, never one. */
    const val SEP = "__"

    /** How much of the sha256 goes in the filename. 48 bits — collisions are not a real risk. */
    private const val TAG_LEN = 12

    private val TAG_RE = Regex("^[0-9a-f]{6,40}$")

    /**
     * The film this file is a version of. `costumecraft__03fcba88a2a4.mp4` -> `costumecraft.mp4`.
     *
     * A name with no `__`, or with something after it that is not a hex tag, is its own logical
     * name. That is what keeps `streamstage-services.mp4` (a hyphen, not a version) and any film
     * somebody pushes by hand behaving exactly as they always did.
     */
    fun logicalName(fileName: String): String {
        val dot = fileName.lastIndexOf('.')
        if (dot <= 0) return fileName
        val stem = fileName.substring(0, dot)
        val ext = fileName.substring(dot)
        val sep = stem.lastIndexOf(SEP)
        if (sep <= 0) return fileName
        val tag = stem.substring(sep + SEP.length)
        if (!TAG_RE.matches(tag)) return fileName
        return stem.substring(0, sep) + ext
    }

    /** True when this filename carries a version tag this app put there. */
    fun isVersioned(fileName: String): Boolean = logicalName(fileName) != fileName

    /**
     * The filename a given version of a film gets on this stick.
     *
     * Derived from the manifest's own sha256, so two sticks fetching the same manifest name the
     * same bytes the same way, and re-fetching a film that is already here is a no-op rather than
     * a second copy.
     */
    fun versionedName(logical: String, sha256: String): String {
        val dot = logical.lastIndexOf('.')
        val stem = if (dot > 0) logical.substring(0, dot) else logical
        val ext = if (dot > 0) logical.substring(dot) else ""
        val tag = sha256.lowercase().take(TAG_LEN)
        if (!TAG_RE.matches(tag)) return logical   // unhashable: fall back to the plain name
        return stem + SEP + tag + ext
    }

    // ------------------------------------------------------------------ the pointer store

    /**
     * @param current  filename on disk that is this film right now.
     * @param previous filename on disk of the version before it, kept for rollback. Null when this
     *                 stick has only ever seen one version.
     */
    data class Pointer(
        val current: String,
        val currentSha: String? = null,
        val currentUpdated: String = "",
        val previous: String? = null,
        val previousSha: String? = null,
        val previousUpdated: String = ""
    )

    /**
     * `films.json`. Lives in app-private internal storage for the same reason `installed.json`
     * does: Android 11 refuses a non-media file in `/sdcard/Movies` even with the storage
     * permission, and the media folder stays what `push-media.sh` and Daniel expect — films only.
     *
     * Written whole through a temp file and a rename, so a power cut cannot leave half a JSON.
     * An unreadable store degrades to "this stick has no pointers", which is the pre-versioning
     * behaviour: play the file that is there. It never degrades to a crash and never to a black
     * booth.
     */
    class Pointers(private val store: File) {

        private val map = LinkedHashMap<String, Pointer>()
        private var loaded = false

        private fun load() {
            if (loaded) return
            loaded = true
            if (!store.isFile || !store.canRead()) return
            runCatching {
                if (store.length() > 512 * 1024) {
                    Log.w(TAG, "${store.name} implausibly large — ignoring")
                    return
                }
                val films = JSONObject(store.readText()).optJSONObject("films") ?: return
                val keys = films.keys()
                while (keys.hasNext()) {
                    val logical = keys.next()
                    val o = films.optJSONObject(logical) ?: continue
                    val cur = o.optString("current", "")
                    if (cur.isEmpty()) continue
                    map[logical] = Pointer(
                        current = cur,
                        currentSha = o.optString("currentSha", "").takeIf { it.length == 64 },
                        currentUpdated = o.optString("currentUpdated", ""),
                        previous = o.optString("previous", "").takeIf { it.isNotEmpty() },
                        previousSha = o.optString("previousSha", "").takeIf { it.length == 64 },
                        previousUpdated = o.optString("previousUpdated", "")
                    )
                }
            }.onFailure {
                map.clear()
                Log.w(TAG, "${store.name} unreadable — continuing with no pointers", it)
            }
        }

        fun get(logical: String): Pointer? {
            load()
            return map[logical]
        }

        fun all(): Map<String, Pointer> {
            load()
            return LinkedHashMap(map)
        }

        /**
         * A new version is now confirmed on disk at [newFile]. It becomes current; whatever was
         * current becomes the rollback target.
         *
         * [fallbackPrevious] is what to record as the previous version when this film has no
         * pointer yet — the plain adb-pushed file that was already on the stick. Without it the
         * first update for a film would have nothing to roll back to, which is precisely the
         * moment Daniel is most likely to want one.
         */
        fun promote(
            logical: String,
            newFile: String,
            newSha: String?,
            newUpdated: String,
            fallbackPrevious: String?
        ): Boolean {
            load()
            val old = map[logical]
            val prevFile = old?.current ?: fallbackPrevious
            // Re-installing the version that is already current must not make it its own rollback.
            val prev = prevFile?.takeIf { it != newFile }
            map[logical] = Pointer(
                current = newFile,
                currentSha = newSha,
                currentUpdated = newUpdated,
                previous = prev,
                previousSha = if (prev == old?.current) old?.currentSha else null,
                previousUpdated = if (prev == old?.current) old?.currentUpdated.orEmpty() else ""
            )
            return save()
        }

        /**
         * Swap current and previous. This is the whole of the booth rollback: no network, no
         * download, no hashing, no file moved. Both files are already on the stick.
         *
         * @return the filename now current, or null if there was nothing to roll back to.
         */
        fun rollback(logical: String): String? {
            load()
            val p = map[logical] ?: return null
            val prev = p.previous ?: return null
            map[logical] = Pointer(
                current = prev,
                currentSha = p.previousSha,
                currentUpdated = p.previousUpdated,
                previous = p.current,
                previousSha = p.currentSha,
                previousUpdated = p.currentUpdated
            )
            return if (save()) prev else null
        }

        fun remove(logical: String): Boolean {
            load()
            if (map.remove(logical) == null) return true
            return save()
        }

        private fun save(): Boolean = runCatching {
            val films = JSONObject()
            map.forEach { (logical, p) ->
                films.put(logical, JSONObject()
                    .put("current", p.current)
                    .apply {
                        p.currentSha?.let { put("currentSha", it) }
                        if (p.currentUpdated.isNotEmpty()) put("currentUpdated", p.currentUpdated)
                        p.previous?.let { put("previous", it) }
                        p.previousSha?.let { put("previousSha", it) }
                        if (p.previousUpdated.isNotEmpty()) put("previousUpdated", p.previousUpdated)
                    })
            }
            val text = JSONObject().put("films", films).toString(2)
            store.parentFile?.mkdirs()
            val tmp = File(store.parentFile, store.name + ".tmp")
            tmp.writeText(text)
            if (!tmp.renameTo(store)) {
                store.writeText(text)
                tmp.delete()
            }
            true
        }.getOrElse {
            Log.w(TAG, "Could not write ${store.name}", it)
            false
        }
    }

    const val POINTERS = "films.json"

    fun pointers(context: Context) = Pointers(File(context.filesDir, POINTERS))

    // ------------------------------------------------------------------ resolving

    /**
     * Given every video file in the media folder, decide which one is each film.
     *
     * @return one file per logical film, in no particular order — ordering is [Playlist]'s job.
     *
     * The rule, per logical film, most trustworthy first:
     *  1. the file the pointer names as current, if it is actually there;
     *  2. the plain unversioned file, if there is one — a film pushed over adb, which this app
     *     has no business second-guessing;
     *  3. the most recently modified of what is left, so a stick whose `films.json` was lost still
     *     plays something sensible instead of nothing.
     */
    fun currentFiles(pointers: Pointers, files: List<File>): List<File> =
        files.groupBy { logicalName(it.name) }
            .mapNotNull { (logical, group) -> pick(pointers.get(logical), logical, group) }

    private fun pick(p: Pointer?, logical: String, group: List<File>): File? {
        if (group.isEmpty()) return null
        p?.current?.let { name -> group.firstOrNull { it.name == name }?.let { return it } }
        group.firstOrNull { it.name == logical }?.let { return it }
        return group.maxByOrNull { it.lastModified() }
    }

    /**
     * Versions that are neither current nor the rollback, and can therefore go.
     *
     * **Never called at the moment a film is replaced.** A file ExoPlayer has open is exactly the
     * hazard this whole scheme exists to avoid, so a superseded version is left on disk until a
     * later reel rebuild has definitely dropped it from the player's item list — see
     * [BoothLoopActivity]. Disk on the stick is measured in gigabytes and the films in tens of
     * megabytes; there is no reason to be in a hurry about this.
     *
     * [protectedNames] is whatever the caller knows is still in use. Anything in it survives.
     */
    fun supersededFiles(
        pointers: Pointers,
        files: List<File>,
        protectedNames: Set<String>
    ): List<File> {
        val out = mutableListOf<File>()
        files.groupBy { logicalName(it.name) }.forEach { (logical, group) ->
            val p = pointers.get(logical) ?: return@forEach   // no pointer: not ours to delete
            for (f in group) {
                if (f.name == p.current || f.name == p.previous) continue
                if (f.name in protectedNames) continue
                // Only ever delete something we named. A file somebody pushed by hand stays.
                if (!isVersioned(f.name)) continue
                out += f
            }
        }
        return out
    }
}
