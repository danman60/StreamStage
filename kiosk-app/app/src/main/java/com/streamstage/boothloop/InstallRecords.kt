package com.streamstage.boothloop

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.File

/**
 * What this stick knows about the films sitting in its media folder.
 *
 * Two of these exist, both in app-private internal storage (`/data/data/<pkg>/files/`):
 *
 *  - `installed.json` — a film we put there ourselves, verified byte-for-byte against a
 *    manifest at the moment we installed it. This is what lets [Playlist] refuse a file that
 *    has since been truncated, without hashing 350 MB at every launch.
 *  - `pending.json` — a film that has downloaded and verified but is not live yet because
 *    it was on screen at the time. Applied at the next loop boundary.
 *
 * **Why not next to the films?** Because Android 11 will not let this app put them there.
 * `/sdcard/Movies/` is a media collection: the platform allows an app to write *media* files
 * into it by raw path and refuses everything else, so a `.json` gets `EPERM (Operation not
 * permitted)` even with the storage permission granted. Verified on the booth stick. App
 * bookkeeping belongs in the app's own directory anyway; the media folder stays exactly what
 * `push-media.sh` and Daniel expect it to be — films, and nothing else.
 *
 * A record is only meaningful while `bytes` and `mtime` still describe the file on disk. If
 * somebody `adb push`es over a film, both change, the record goes stale, and the file falls
 * back to being treated as an ordinary local file — which is exactly the pre-update behaviour.
 *
 * `source`:
 *  - `"manifest"` — installed by this app from a verified download. **Enforced** by [Playlist]:
 *    length must still match, or the file is treated as damaged and left out of the reel.
 *  - `"local"` — a hash we computed for a file somebody else put there. Cache only, never
 *    used to reject anything, because we have nothing authoritative to compare it against.
 *
 * The file is rewritten whole, via a temp file and a rename, so a power cut during a write
 * cannot leave a half-JSON that would then be unreadable on the next boot. An unreadable or
 * corrupt records file is not fatal: it degrades to "we know nothing", never to a crash.
 */
class InstallRecords(private val store: File) {

    data class Rec(
        val bytes: Long,
        val mtime: Long,
        val sha256: String,
        val source: String,
        /**
         * sha256 of three 256 KB samples of the file as it was when we confirmed it — see
         * [UpdateManager.spotHash]. Null for records written before this existed, and for
         * anything we could not read; both mean "no opinion", never "bad".
         */
        val spot: String? = null
    )

    private val recs = LinkedHashMap<String, Rec>()
    private var loaded = false

    private fun load() {
        if (loaded) return
        loaded = true
        if (!store.isFile || !store.canRead()) return
        runCatching {
            // A records file bigger than this is not one we wrote.
            if (store.length() > 512 * 1024) {
                Log.w(TAG, "${store.name} implausibly large (${store.length()}) — ignoring")
                return
            }
            val root = JSONObject(store.readText())
            val files = root.optJSONObject("files") ?: return
            val it = files.keys()
            while (it.hasNext()) {
                val name = it.next()
                val o = files.optJSONObject(name) ?: continue
                val bytes = o.optLong("bytes", -1L)
                val mtime = o.optLong("mtime", -1L)
                val sha = o.optString("sha256", "")
                if (bytes <= 0L || sha.length != 64) continue
                val spot = o.optString("spot", "").takeIf { it.length == 64 }
                recs[name] = Rec(bytes, mtime, sha, o.optString("source", "local"), spot)
            }
        }.onFailure {
            recs.clear()
            Log.w(TAG, "${store.name} unreadable — continuing with no records", it)
        }
    }

    fun get(name: String): Rec? {
        load()
        return recs[name]
    }

    fun all(): Map<String, Rec> {
        load()
        return LinkedHashMap(recs)
    }

    /** @return true if the record still describes the file that is actually on disk. */
    fun matches(file: File): Boolean {
        val r = get(file.name) ?: return false
        return file.length() == r.bytes && file.lastModified() == r.mtime
    }

    fun put(name: String, rec: Rec): Boolean {
        load()
        recs[name] = rec
        return save()
    }

    fun remove(name: String): Boolean {
        load()
        if (recs.remove(name) == null) return true
        return save()
    }

    private fun save(): Boolean = runCatching {
        val files = JSONObject()
        recs.forEach { (name, r) ->
            files.put(name, JSONObject()
                .put("bytes", r.bytes)
                .put("mtime", r.mtime)
                .put("sha256", r.sha256)
                .put("source", r.source)
                .apply { r.spot?.let { put("spot", it) } })
        }
        val text = JSONObject().put("files", files).toString(2)

        store.parentFile?.mkdirs()
        val tmp = File(store.parentFile, store.name + ".tmp")
        tmp.writeText(text)
        if (!tmp.renameTo(store)) {
            // Some FUSE shims refuse rename-over. Fall back to a plain write; the worst case
            // is a records file we cannot read next time, which we already tolerate.
            store.writeText(text)
            tmp.delete()
        }
        true
    }.getOrElse {
        Log.w(TAG, "Could not write ${store.name} — records not persisted", it)
        false
    }

    companion object {
        private const val TAG = "BoothLoop/Records"

        const val INSTALLED = "installed.json"
        const val PENDING = "pending.json"

        fun installed(context: Context) = InstallRecords(File(context.filesDir, INSTALLED))
        fun pending(context: Context) = InstallRecords(File(context.filesDir, PENDING))
    }
}
