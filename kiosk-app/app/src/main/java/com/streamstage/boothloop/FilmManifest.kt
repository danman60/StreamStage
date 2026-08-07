package com.streamstage.boothloop

import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * The published film manifest, and the only place it is ever parsed.
 *
 * **Treat every byte of this as hostile.** It arrives over the public internet from an R2
 * bucket. It may be half-written (a publish that died mid-upload), truncated by hotel wifi,
 * empty, HTML (a CDN error page), or someone else's JSON entirely. None of those may crash
 * the booth app or cause it to touch a file it should not.
 *
 * The defences, in order of how badly they would hurt if they were missing:
 *
 *  1. **Filenames are whitelisted, not sanitised.** `file` must match [SAFE_FILE] — no `/`,
 *     no `\`, no `..`, no leading dot, and a known video extension. A manifest naming
 *     `../../../data/data/com.streamstage.boothloop/files/x` is rejected outright rather than
 *     "cleaned up", because cleaning up is where path-traversal bugs live.
 *  2. **sha256 must be 64 lowercase hex.** Anything else and the entry is dropped, so the
 *     verify step downstream can never be handed a hash it will "helpfully" match loosely.
 *  3. **Sizes are bounded.** `bytes` must be positive and under [MAX_BYTES]. A manifest
 *     claiming 900 GB must not get as far as the disk-space check.
 *  4. **Everything is optional-safe.** A missing key, a string where a number belongs, a
 *     films array that is actually an object — all produce `null` from [parse], never a throw.
 *
 * An entry that fails validation is dropped and logged; the rest of the manifest still works.
 * A manifest with no surviving entries is treated as no manifest at all.
 */
data class FilmEntry(
    val id: String,
    val file: String,
    val bytes: Long,
    val sha256: String,
    val updated: String
)

data class FilmManifest(
    val version: Int,
    val updated: String,
    /**
     * Where the films themselves live, published alongside the list so the bucket can move
     * without a new APK on the stick. Null when absent or not a plausible https URL — the
     * caller then falls back to the compiled-in host. It is validated the same way as
     * everything else here: https only, no room for a manifest to point the booth stick at a
     * plaintext server on a trade-show network.
     */
    val base: String?,
    val films: List<FilmEntry>
)

object ManifestParser {

    private const val TAG = "BoothLoop/Manifest"

    /** More films than a booth reel could ever hold. A larger array is a corrupt manifest. */
    const val MAX_FILMS = 64

    /** 4 GB. Bigger than any booth film by two orders of magnitude. */
    const val MAX_BYTES = 4L * 1024L * 1024L * 1024L

    /** No separators, no leading dot, no traversal. Whitelist, not blacklist. */
    private val SAFE_FILE = Regex("^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
    private val SHA256 = Regex("^[0-9a-f]{64}$")
    private val VIDEO_EXT = setOf("mp4", "m4v", "mkv", "webm", "mov", "ts")

    /** @return the parsed manifest, or null if the text is not a manifest we will act on. */
    fun parse(text: String): FilmManifest? {
        return try {
            val root = JSONObject(text)
            val films = root.optJSONArray("films") ?: run {
                Log.w(TAG, "No films array")
                return null
            }
            val entries = readFilms(films)
            if (entries.isEmpty()) {
                Log.w(TAG, "Manifest had no usable film entries")
                return null
            }
            FilmManifest(
                version = root.optInt("version", 0),
                updated = root.optString("updated", ""),
                base = readBase(root.optString("base", "")),
                films = entries
            )
        } catch (t: Throwable) {
            // Includes JSONException for half-written JSON and anything else org.json throws.
            Log.w(TAG, "Manifest unparseable — ignoring it", t)
            null
        }
    }

    /**
     * `https://host/path/` only. Anything else — http, a bare host, a `file:` URL, a query
     * string, something absurdly long — is discarded and the caller keeps its own default.
     * A manifest is allowed to move the bucket; it is not allowed to choose the protocol.
     */
    private fun readBase(raw: String): String? {
        val s = raw.trim()
        if (s.isEmpty() || s.length > 256) return null
        if (!s.startsWith("https://")) {
            Log.w(TAG, "Ignoring manifest base — not https")
            return null
        }
        if (s.contains('?') || s.contains('#') || s.contains("..") || s.contains(' ')) {
            Log.w(TAG, "Ignoring manifest base — suspicious characters")
            return null
        }
        val host = s.removePrefix("https://").substringBefore('/')
        if (host.isEmpty() || !host.matches(Regex("^[A-Za-z0-9._-]+(:[0-9]{1,5})?$"))) {
            Log.w(TAG, "Ignoring manifest base — implausible host")
            return null
        }
        return if (s.endsWith("/")) s else "$s/"
    }

    private fun readFilms(films: JSONArray): List<FilmEntry> {
        val out = mutableListOf<FilmEntry>()
        val seen = mutableSetOf<String>()
        val count = minOf(films.length(), MAX_FILMS)
        for (i in 0 until count) {
            val o = films.optJSONObject(i) ?: continue
            val entry = readFilm(o) ?: continue
            // First entry for a filename wins; a duplicate is a publish bug, not an instruction.
            if (!seen.add(entry.file.lowercase())) {
                Log.w(TAG, "Duplicate entry for ${entry.file} ignored")
                continue
            }
            out += entry
        }
        return out
    }

    private fun readFilm(o: JSONObject): FilmEntry? {
        val file = o.optString("file", "")
        if (!SAFE_FILE.matches(file)) {
            Log.w(TAG, "Rejected filename: ${file.take(80)}")
            return null
        }
        if (file.substringAfterLast('.', "").lowercase() !in VIDEO_EXT) {
            Log.w(TAG, "Rejected non-video filename: $file")
            return null
        }
        val bytes = o.optLong("bytes", -1L)
        if (bytes <= 0L || bytes > MAX_BYTES) {
            Log.w(TAG, "Rejected size for $file: $bytes")
            return null
        }
        val sha = o.optString("sha256", "").lowercase()
        if (!SHA256.matches(sha)) {
            Log.w(TAG, "Rejected sha256 for $file")
            return null
        }
        val id = o.optString("id", file.substringBeforeLast('.')).take(64)
        return FilmEntry(
            id = id,
            file = file,
            bytes = bytes,
            sha256 = sha,
            updated = o.optString("updated", "").take(64)
        )
    }
}
