package com.streamstage.phonetoolkit

import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import org.json.JSONArray
import org.json.JSONObject

/**
 * SHIP THE LOG OFF THE PHONE, AND TAKE COMMANDS BACK — over the kiosk server, with no server
 * change. Ported from ../tablet-app/RemoteControl.kt.
 *
 *   SHIPPING  POST /log   serve.py:411 accepts one JSON object or an array and appends each to
 *                         telemetry/events-YYYY-MM-DD.jsonl. It validates no shape, so the app's
 *                         own log lines go in as ordinary events. Read them back with:
 *                             curl http://<laptop>:<page>/events
 *
 *   COMMANDS  GET /events serve.py:332 returns every event recorded. A command is therefore just
 *                         an event somebody POSTed:
 *                             curl -X POST http://<laptop>:<telemetry>/log \
 *                               -d '{"type":"phone_cmd","id":"c1","cmd":"setmode","arg":"kiosk"}'
 *                         The phone polls, sees a `phone_cmd` id it has not run, runs it.
 *
 * PULL, NOT PUSH: the phone sits behind whatever the venue AP does to client traffic and can
 * never be dialled into. It always opens the connection.
 *
 * TWO THINGS DIFFER FROM THE TABLET, both because of the two modes:
 *
 *  1. **KIOSK MODE ONLY.** presenter-server.py has no /log and no /events — it is not a telemetry
 *     sink and this app will not invent one. In PRESENTER mode this class stays stopped and says
 *     so once, rather than quietly failing every ten seconds. adb (DebugBridge) and the on-screen
 *     panel are the diagnostics on the deck side, and the phone has adb, so that is enough.
 *
 *  2. It listens for `phone_cmd`, not `tablet_cmd`, so a command aimed at the booth tablet does
 *     not also fire on the phone standing next to it. `target` still works the same way.
 *
 * CONNECTION BUDGET: every request here goes to the TELEMETRY port (page port + 1), never the page
 * port. The page port's ~6-connection budget belongs to the TV's SSE stream and its films, and
 * starving it is a measured failure on this project. One request in flight, `Connection: close`.
 */
class RemoteControl(
    private val hostProvider: () -> ServerHost?,
    private val onCommand: (String, String?) -> Unit
) {

    private val pollMs = 8_000L
    private val shipMs = 10_000L
    private val statusEveryNShips = 3

    private var pool: ScheduledExecutorService? = null
    private val busy = AtomicBoolean(false)
    private val seen = HashSet<String>()

    /**
     * A restart must not replay a command from earlier in the day. The first successful poll marks
     * everything already on the server as seen WITHOUT running it, and says so.
     */
    private var primed = false
    private var shipCount = 0

    /** What the app tells the server about itself. Set by MainActivity. */
    @Volatile var stateLine: String = "starting"

    fun start() {
        if (pool != null) return
        val p = Executors.newSingleThreadScheduledExecutor { r ->
            Thread(r, "ss-phone-remote").apply { isDaemon = true }
        }
        pool = p
        p.scheduleWithFixedDelay({ safely { ship() } }, 3_000, shipMs, TimeUnit.MILLISECONDS)
        p.scheduleWithFixedDelay({ safely { poll() } }, 5_000, pollMs, TimeUnit.MILLISECONDS)
        Diag.i("remote control started (ship ${shipMs}ms, poll ${pollMs}ms, telemetry port only)")
    }

    fun stop() {
        if (pool != null) Diag.i("remote control stopped")
        pool?.shutdownNow()
        pool = null
        primed = false
        seen.clear()
    }

    val isRunning: Boolean get() = pool != null

    private inline fun safely(block: () -> Unit) {
        try { block() } catch (t: Throwable) {
            Diag.w("remote control: ${t.javaClass.simpleName}: ${t.message}")
        }
    }

    /** Only the kiosk has somewhere to send this. Never call with a PRESENTER host. */
    private fun sink(): ServerHost? = hostProvider()?.takeIf { it.mode.hasTelemetryPort }

    // ------------------------------------------------------------------ shipping

    /**
     * THE ENVELOPE EVERY EVENT THIS APP SHIPS CARRIES — and the reason `ms` is in it.
     *
     * serve.py's read_events() sorts the day with `key=lambda e: e.get("ms", 0)` and its
     * `?since=<ms>` filter keeps only events whose `ms` is greater than the cursor. serve.py's
     * record() does NOT stamp anything on arrival, so an event that ships only an ISO string
     * sorts to position zero of the whole day and is invisible to every since-poll. The phone's
     * log lines were doing exactly that.
     *
     * `ms` and `t` are formatted from the SAME instant, so the sortable field and the readable
     * field can never disagree, and `t` is now genuinely UTC (see Diag.iso).
     */
    private fun event(type: String): JSONObject {
        val now = System.currentTimeMillis()
        return JSONObject()
            .put("type", type)
            .put("surface", "phoneapp")
            .put("device", Diag.deviceId)
            .put("app", Diag.appVersion)
            .put("ms", now)
            .put("t", Diag.iso(now))
    }

    private fun ship() {
        val h = sink() ?: return
        if (!busy.compareAndSet(false, true)) return
        try {
            val lines = Diag.drainForShipping(40)
            val batch = JSONArray()
            for (l in lines) {
                batch.put(event("phone_log").put("msg", l))
            }
            if (shipCount++ % statusEveryNShips == 0) batch.put(statusEvent(h))
            if (batch.length() == 0) return
            Net.postJson("http://${h.host}:${h.telemetryPort}/log", batch.toString())
        } finally {
            busy.set(false)
        }
    }

    private fun statusEvent(h: ServerHost?): JSONObject = event("phone_status")
        .put("mode", Diag.mode.label)
        .put("host", h?.toString() ?: "none")
        .put("state", stateLine)
        .put("lastError", Diag.lastError)
        .put("localIp", Discovery.lastLocalIp ?: "none")

    /** Send the whole diagnostic report up, on demand. */
    fun shipReport(header: String) {
        val h = sink() ?: run {
            Diag.i("no telemetry sink in ${Diag.mode.label} mode — report stayed on the phone " +
                "(read it with: adb logcat -d -s ${Diag.TAG}, or Copy diagnostics on screen)")
            return
        }
        safely {
            val body = event("phone_diag")
                .put("mode", Diag.mode.label)
                .put("report", Diag.fullReport(header))
            Net.postJson("http://${h.host}:${h.telemetryPort}/log", body.toString())
            Diag.i("shipped full diagnostic report to ${h.host}:${h.telemetryPort}/log")
        }
    }

    // ------------------------------------------------------------------ commands

    private fun poll() {
        val h = sink() ?: return
        if (!busy.compareAndSet(false, true)) return
        try {
            val raw = Net.get("http://${h.host}:${h.telemetryPort}/events") ?: return
            val arr = JSONArray(raw)
            val pending = ArrayList<Pair<String, JSONObject>>()
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                if (o.optString("type") != "phone_cmd") continue
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
}
