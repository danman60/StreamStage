package com.streamstage.boothloop

import android.content.Context
import android.os.Environment
import android.util.Log
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * THE BOOTH'S RECORD, WRITTEN ON THE STICK.
 *
 * This is `serve.py`'s telemetry directory, moved onto the device that is physically at the
 * booth all day. It exists because the tablet's `/log` and `/lead` used to land on DART, and
 * twice on 2026-08-11 DART left the network mid-show and the tablet went dead with it.
 *
 * The rules are lifted from `expo-assets/kiosk/serve.py` deliberately and to the letter, because
 * every one of them was paid for:
 *
 *  - **A log line is not a telemetry event.** `serve.py:275` — the two Android clients read
 *    `/events` behind a hard 512 KB buffer, and the day the apps started shipping their whole
 *    diagnostic log into that stream the reply hit 14,018,754 bytes and the emergency command
 *    channel died mid-show. App diagnostics go to `applog-*.jsonl` and are NEVER in `/events`.
 *  - **Flushed and fsync'd on arrival** (`serve.py:479`). A yanked power cable must not eat the
 *    day, and on a Fire Stick the power cable is a USB lead somebody can catch with a foot.
 *  - **A failed write answers 507, never 200** (`serve.py:1258`). Both clients mark a batch as
 *    safely stored on `r.ok`; a 200 over a failed write puts the events in neither place.
 *  - **Leads live in their OWN file.** [LeadSender] reads `leads-*.jsonl` and nothing else, so
 *    it can never mail a tap event to the lead route.
 *
 * ## Where it is written, and why there are two copies
 *
 * PRIMARY is `filesDir/booth/` — app-private internal storage. It needs no permission, it cannot
 * fail because `MANAGE_EXTERNAL_STORAGE` was not granted, and `adb install -r` (the only way this
 * app is ever updated — see app/build.gradle.kts on the debug signing) preserves it.
 *
 * MIRROR is `/sdcard/Movies/StreamStageBooth/record/`, written best-effort and never on the
 * request's critical path. It buys two things: Daniel can `adb pull` the day without `run-as`,
 * and a lead survives the app being uninstalled. A mirror that fails is logged and ignored —
 * it must never turn a lead that IS on disk into an error the tablet re-queues.
 *
 * It is a SUBDIRECTORY of the films folder on purpose: `Playlist.videosIn` filters on
 * `f.isFile`, so a directory in there can never be mistaken for an eighth film.
 */
object BoothStore {

    private const val TAG = "BoothLoop/Store"

    /** `serve.py:275`. Anything bigger than this is a log line wearing an event's clothes. */
    const val EVENT_MAX_BYTES = 2048

    /** `serve.py:287`. Comfortably under the clients' 512 KB read. */
    const val MAX_EVENTS_BYTES = 320 * 1024

    /** `serve.py:280`, mirrored exactly. The size rule above is the real defence. */
    private val APP_LOG_TYPES = setOf(
        "tablet_log", "tablet_status", "phone_log", "phone_status",
        "app_log", "app_status", "diag"
    )

    private val lock = Any()

    @Volatile private var root: File? = null
    @Volatile private var mirror: File? = null

    val counts = HashMap<String, Int>().apply {
        put("events", 0); put("applog", 0); put("leads", 0); put("refused", 0)
    }

    fun init(context: Context, mediaDir: File?) {
        val dir = File(context.filesDir, "booth")
        runCatching { dir.mkdirs() }
        root = dir
        // Next to the films, but in its own folder so Playlist can never see it as media.
        val m = mediaDir ?: runCatching {
            @Suppress("DEPRECATION")
            File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES),
                Playlist.SHARED_SUBDIR
            )
        }.getOrNull()
        mirror = m?.let { File(it, "record") }
        runCatching { mirror?.mkdirs() }
        Log.i(TAG, "record -> ${dir.absolutePath}   mirror -> ${mirror?.absolutePath ?: "none"}")
    }

    fun dir(): File? = root

    fun writable(): Boolean = root?.let { it.isDirectory && it.canWrite() } == true

    private fun today(): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    // ------------------------------------------------------------------ classification

    /** `serve.py:is_app_log`. A diagnostic line, or an event? */
    fun isAppLog(event: JSONObject?, rawLen: Int = 0): Boolean {
        if (event != null && event.optString("type") in APP_LOG_TYPES) return true
        if (rawLen > EVENT_MAX_BYTES) return true
        if (event != null && event.toString().length > EVENT_MAX_BYTES) return true
        return false
    }

    // ------------------------------------------------------------------ writing

    /**
     * Append one line to `<prefix>-<today>.jsonl`, durably.
     *
     * @throws java.io.IOException when the PRIMARY copy could not be written. The caller must
     *   turn that into a 507 so the client keeps the item queued in its own storage.
     */
    private fun append(prefix: String, line: String) {
        val dir = root ?: throw java.io.IOException("record directory not initialised")
        val name = "$prefix-${today()}.jsonl"
        val bytes = (line + "\n").toByteArray(Charsets.UTF_8)
        synchronized(lock) {
            if (!dir.isDirectory) dir.mkdirs()
            FileOutputStream(File(dir, name), true).use { fos ->
                fos.write(bytes)
                fos.flush()
                fos.fd.sync()               // a yanked power cable must not eat the day
            }
            // Best-effort second copy. NEVER allowed to fail the write above.
            runCatching {
                val md = mirror ?: return@runCatching
                if (!md.isDirectory) md.mkdirs()
                FileOutputStream(File(md, name), true).use { fos ->
                    fos.write(bytes)
                    fos.flush()
                    fos.fd.sync()
                }
            }.onFailure { Log.w(TAG, "mirror write failed for $name (the primary copy is safe): ${it.message}") }
        }
    }

    /** One telemetry event, or one app diagnostic line — routed by [isAppLog]. */
    fun record(event: JSONObject) {
        val line = event.toString()
        val kind = if (isAppLog(event, line.length)) "applog" else "events"
        append(kind, line)
        synchronized(counts) { counts[kind] = (counts[kind] ?: 0) + 1 }
    }

    /** One typed lead. Its own file, so [LeadSender] can never pick up a tap event. */
    fun recordLead(lead: JSONObject) {
        append("leads", lead.toString())
        synchronized(counts) { counts["leads"] = (counts["leads"] ?: 0) + 1 }
    }

    fun countRefused() {
        synchronized(counts) { counts["refused"] = (counts["refused"] ?: 0) + 1 }
    }

    fun fileBytes(prefix: String): Long =
        root?.let { runCatching { File(it, "$prefix-${today()}.jsonl").length() }.getOrDefault(0L) } ?: 0L

    // ------------------------------------------------------------------ reading

    /**
     * `serve.py:read_events`. Today's rows by default, oldest first.
     *
     * @param day  `null` = today, `"all"` = every file, otherwise `yyyy-MM-dd`.
     * @param since only rows whose `ms` is greater than this. What stops a poller
     *   re-downloading the whole day every eight seconds over the booth's own wifi.
     */
    fun readEvents(
        day: String?,
        since: Long,
        prefix: String,
        keepLogs: Boolean = false,
        onlyLogs: Boolean = false
    ): List<JSONObject> {
        val dir = root ?: return emptyList()
        val names: List<String> = when (day) {
            "all" -> (dir.list() ?: emptyArray())
                .filter { it.startsWith("$prefix-") && it.endsWith(".jsonl") }.sorted()
            null -> listOf("$prefix-${today()}.jsonl")
            else -> listOf("$prefix-$day.jsonl")
        }
        val out = ArrayList<JSONObject>()
        for (name in names) {
            val f = File(dir, name)
            if (!f.isFile) continue
            runCatching {
                f.forEachLine { raw ->
                    val line = raw.trim()
                    if (line.isEmpty()) return@forEachLine
                    // Cheapest defence first, done BEFORE parsing: a line this long is a
                    // diagnostic, and skipping on length costs no JSON parse at all.
                    val longLine = line.length > EVENT_MAX_BYTES
                    if (!keepLogs && longLine) return@forEachLine
                    val o = runCatching { JSONObject(line) }.getOrNull() ?: return@forEachLine
                    if (onlyLogs && !isAppLog(o, line.length)) return@forEachLine
                    if (!keepLogs && isAppLog(o, line.length)) return@forEachLine
                    if (since > 0 && o.optLong("ms", 0L) <= since) return@forEachLine
                    out.add(o)
                }
            }.onFailure { Log.w(TAG, "could not read $name: ${it.message}") }
        }
        out.sortBy { it.optLong("ms", 0L) }
        return out
    }

    /**
     * `serve.py:capped_json`. Serialise, dropping the OLDEST until it fits. Always valid JSON.
     *
     * The ceiling is the point. A reply that overruns a client's read buffer is not "a big
     * reply" — it is a truncated array that looks like data and then throws, and the client
     * cannot tell that from a server being down.
     */
    fun cappedJson(rows: List<JSONObject>, limitBytes: Int): Triple<ByteArray, Int, Int> {
        val whole = serialise(rows)
        if (whole.size <= limitBytes) return Triple(whole, rows.size, 0)
        var lo = 0
        var hi = rows.size
        var best: List<JSONObject> = emptyList()
        while (lo <= hi) {
            val mid = (lo + hi) / 2                      // how many of the NEWEST fit
            val trial = if (mid == 0) emptyList() else rows.subList(rows.size - mid, rows.size)
            if (serialise(trial).size <= limitBytes) { best = trial; lo = mid + 1 } else hi = mid - 1
        }
        return Triple(serialise(best), best.size, rows.size - best.size)
    }

    private fun serialise(rows: List<JSONObject>): ByteArray {
        val sb = StringBuilder(rows.size * 220 + 2)
        sb.append('[')
        for ((i, o) in rows.withIndex()) {
            if (i > 0) sb.append(',')
            sb.append(o.toString())
        }
        sb.append(']')
        return sb.toString().toByteArray(Charsets.UTF_8)
    }

    /** Every typed lead on disk, de-duplicated by lead id. `flush-leads.py:load_leads`. */
    fun leads(): List<JSONObject> {
        val dir = root ?: return emptyList()
        val seen = HashSet<String>()
        val out = ArrayList<JSONObject>()
        val names = (dir.list() ?: emptyArray())
            .filter { it.startsWith("leads-") && it.endsWith(".jsonl") }.sorted()
        for (name in names) {
            runCatching {
                File(dir, name).forEachLine { raw ->
                    val line = raw.trim()
                    if (line.isEmpty()) return@forEachLine
                    val o = runCatching { JSONObject(line) }.getOrNull() ?: return@forEachLine
                    val email = o.optString("email", "")
                    if (email.isEmpty()) return@forEachLine
                    // Same key flush-leads.py:69 uses, so a lead exported off this stick and a
                    // lead flushed on DART are the SAME id and can never be sent twice.
                    val lid = o.optString("lid", "").ifEmpty { "$email|${o.optString("ts", "")}" }
                    if (!seen.add(lid)) return@forEachLine
                    o.put("_lid", lid)
                    o.put("_file", name)
                    out.add(o)
                }
            }.onFailure { Log.w(TAG, "could not read $name: ${it.message}") }
        }
        return out
    }
}
