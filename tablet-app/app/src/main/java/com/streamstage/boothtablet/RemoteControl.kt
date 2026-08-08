package com.streamstage.boothtablet

import java.io.BufferedInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import org.json.JSONArray
import org.json.JSONObject

/**
 * THE REMOTE CONTROL PLANE — and it needs no new server code.
 *
 * The booth tablet is a Fire tablet with no adb. The only thing that both the tablet and a person
 * with a laptop can reach is THE KIOSK SERVER, so that is where the control plane goes.
 *
 * Both halves ride endpoints serve.py already has, so nothing in serve.py changed:
 *
 *   SHIPPING  POST /log  — serve.py:411 accepts one JSON object or an array of them and appends
 *                          each to telemetry/events-YYYY-MM-DD.jsonl. It never validates a shape,
 *                          so the app's own log lines go in as ordinary telemetry events. Read
 *                          them back from anywhere with:
 *                              curl http://<laptop>:<page>/events
 *
 *   COMMANDS  GET /events — serve.py:332 returns every event ever recorded, as a JSON array. A
 *                          command is therefore just an event somebody POSTed:
 *                              curl -X POST http://<laptop>:<telemetry>/log \
 *                                -d '{"type":"tablet_cmd","id":"c1","cmd":"sethost","arg":"192.168.0.13:8081"}'
 *                          The tablet polls, sees a `tablet_cmd` id it has not run, and runs it.
 *
 * PULL, NOT PUSH, on purpose: the tablet sits behind whatever the venue AP does to client
 * traffic and can never be dialled into. It always opens the connection.
 *
 * CONNECTION BUDGET: every request this class makes goes to the TELEMETRY port (page port + 1),
 * never the page port. The WebView's ~6-connections-per-host budget on the page port is spent on
 * the SSE stream and the films, and starving it is a known, measured failure on this project.
 * This class is on the other listener entirely, sends `Connection: close`, and never has more
 * than one request in flight.
 */
class RemoteControl(
    private val hostProvider: () -> KioskHost?,
    private val onCommand: (String, String?) -> Unit
) {

    /** Poll interval. Modest on purpose — see the connection-budget note above. */
    private val pollMs = 8_000L
    private val shipMs = 10_000L
    private val statusEveryNShips = 3

    private var pool: ScheduledExecutorService? = null
    private val busy = AtomicBoolean(false)
    private val seen = HashSet<String>()

    /**
     * A restart must not replay a command from earlier in the day. The first successful poll
     * marks everything already on the server as seen WITHOUT running it, and says so.
     */
    private var primed = false
    private var shipCount = 0

    /** What the app tells the server about itself. Set by MainActivity. */
    @Volatile var stateLine: String = "starting"

    fun start() {
        if (pool != null) return
        val p = Executors.newSingleThreadScheduledExecutor { r ->
            Thread(r, "ss-remote").apply { isDaemon = true }
        }
        pool = p
        p.scheduleWithFixedDelay({ safely { ship() } }, 3_000, shipMs, TimeUnit.MILLISECONDS)
        p.scheduleWithFixedDelay({ safely { poll() } }, 5_000, pollMs, TimeUnit.MILLISECONDS)
        Diag.i("remote control started (ship every ${shipMs}ms, poll every ${pollMs}ms, telemetry port only)")
    }

    fun stop() {
        pool?.shutdownNow()
        pool = null
    }

    private inline fun safely(block: () -> Unit) {
        try { block() } catch (t: Throwable) { Diag.w("remote control: ${t.javaClass.simpleName}: ${t.message}") }
    }

    // ------------------------------------------------------------------ shipping

    /**
     * THE ENVELOPE EVERY EVENT THIS APP SHIPS CARRIES — and the reason `ms` is in it.
     *
     * serve.py's read_events() sorts the day with `key=lambda e: e.get("ms", 0)` and its
     * `?since=<ms>` filter keeps only events whose `ms` is greater than the cursor. serve.py's
     * record() does NOT stamp anything on arrival, so an event that ships only an ISO string
     * sorts to position zero of the whole day and is invisible to every since-poll. The tablet's
     * log lines were doing exactly that.
     *
     * `ms` and `t` are formatted from the SAME instant, so the sortable field and the readable
     * field can never disagree, and `t` is now genuinely UTC (see Diag.iso).
     */
    private fun event(type: String): JSONObject {
        val now = System.currentTimeMillis()
        return JSONObject()
            .put("type", type)
            .put("surface", "tabletapp")
            .put("device", Diag.deviceId)
            .put("app", Diag.appVersion)
            .put("ms", now)
            .put("t", Diag.iso(now))
    }

    /** Push new log lines up to the kiosk as telemetry events. */
    private fun ship() {
        val h = hostProvider() ?: return
        if (!busy.compareAndSet(false, true)) return
        try {
            val lines = Diag.drainForShipping(40)
            val batch = JSONArray()
            for (l in lines) {
                batch.put(event("tablet_log").put("msg", l))
            }
            if (shipCount++ % statusEveryNShips == 0) {
                batch.put(statusEvent(h))
            }
            if (batch.length() == 0) return
            post(h, "/log", batch.toString())
        } finally {
            busy.set(false)
        }
    }

    private fun statusEvent(h: KioskHost?): JSONObject = event("tablet_status")
        .put("host", h?.toString() ?: "none")
        .put("state", stateLine)
        .put("lastError", Diag.lastError)
        .put("localIp", Discovery.lastLocalIp ?: "none")

    /** Send the whole diagnostic report up, on demand (the `diag` command, or a failed connect). */
    fun shipReport(header: String) {
        val h = hostProvider() ?: return
        safely {
            val body = event("tablet_diag")
                .put("report", Diag.fullReport(header))
            post(h, "/log", body.toString())
            Diag.i("shipped full diagnostic report to ${h.host}:${h.telemetryPort}/log")
        }
    }

    private fun post(h: KioskHost, path: String, body: String) {
        val url = URL("http://${h.host}:${h.telemetryPort}$path")
        var conn: HttpURLConnection? = null
        try {
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 2500
                readTimeout = 3500
                doOutput = true
                useCaches = false
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Connection", "close")
            }
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            conn.responseCode
        } finally {
            try { conn?.disconnect() } catch (_: Throwable) {}
        }
    }

    // ------------------------------------------------------------------ commands

    private fun poll() {
        val h = hostProvider() ?: return
        if (!busy.compareAndSet(false, true)) return
        try {
            val raw = get(h, "/events") ?: return
            val arr = JSONArray(raw)
            val pending = ArrayList<Pair<String, JSONObject>>()
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                if (o.optString("type") != "tablet_cmd") continue
                val id = o.optString("id").ifBlank { "idx$i" }
                if (seen.contains(id)) continue
                pending.add(id to o)
            }
            if (!primed) {
                primed = true
                pending.forEach { seen.add(it.first) }
                if (pending.isNotEmpty()) {
                    Diag.i("command channel primed: ignoring ${pending.size} command(s) already on " +
                        "the server from before this app started (they are not replayed)")
                }
                return
            }
            for ((id, o) in pending) {
                seen.add(id)
                val target = o.optString("target").ifBlank { "all" }
                if (target != "all" && target != Diag.deviceId) {
                    Diag.i("command $id ignored (addressed to '$target', this device is ${Diag.deviceId})")
                    continue
                }
                val cmd = o.optString("cmd").trim()
                val arg = o.optString("arg").takeIf { it.isNotBlank() }
                Diag.i("COMMAND received id=$id cmd=$cmd arg=${arg ?: "-"}")
                onCommand(cmd, arg)
            }
        } finally {
            busy.set(false)
        }
    }

    private fun get(h: KioskHost, path: String): String? {
        val url = URL("http://${h.host}:${h.telemetryPort}$path")
        var conn: HttpURLConnection? = null
        return try {
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 2500
                readTimeout = 4000
                useCaches = false
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Connection", "close")
            }
            if (conn.responseCode != 200) return null
            BufferedInputStream(conn.inputStream).use { input ->
                val out = java.io.ByteArrayOutputStream()
                val buf = ByteArray(8192)
                // Capped: /events grows all day and this runs every 8s.
                while (out.size() < 512 * 1024) {
                    val n = input.read(buf)
                    if (n <= 0) break
                    out.write(buf, 0, n)
                }
                out.toString("UTF-8")
            }
        } catch (_: Throwable) {
            null
        } finally {
            try { conn?.disconnect() } catch (_: Throwable) {}
        }
    }
}
