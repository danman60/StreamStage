package com.streamstage.phonetoolkit

import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicLong

/**
 * REACHING THE BOOTH TABLET FROM THE PHONE — with no new server code and no new hop.
 *
 * The booth tablet is a Fire tablet with **no adb**. Its only control plane is the one documented
 * at the top of ../../../../../../../tablet-app/.../RemoteControl.kt: it polls the KIOSK SERVER'S
 * TELEMETRY PORT (page port + 1) for `tablet_cmd` events and runs the ones it has not seen. So the
 * phone does not talk to the tablet at all — it drops a command on the kiosk, exactly as a laptop
 * with curl would, and the tablet picks it up on its next poll.
 *
 *   COMMAND   POST http://<kiosk>:<telemetry>/log
 *             {"type":"tablet_cmd","id":"<unique>","cmd":"sethost","arg":"<host>:<page>"}
 *             serve.py:1242 records it into events-YYYY-MM-DD.jsonl; the tablet reads it back
 *             from GET /events (RemoteControl.poll) and runs it.
 *
 *   STATUS    GET  http://<kiosk>:<telemetry>/applog?since=<ms>
 *             serve.py:1075. The tablet ships its own log here every 10s
 *             (tablet RemoteControl.ship), stamped `"surface":"tabletapp"`.
 *
 * THREE THINGS THAT ARE LOAD-BEARING AND EASY TO GET WRONG
 * --------------------------------------------------------
 *  1. **THE ID MUST BE NEW ON EVERY PRESS.** The tablet keeps a `seen` set of ids and silently
 *     skips a repeat (RemoteControl.poll). A fixed id means the first press works and every press
 *     after it does nothing at all — which reads as a broken button. [nextId] mints one per call
 *     from the clock AND a counter, because two presses can land in the same millisecond.
 *
 *  2. **`ms` MUST BE STAMPED.** serve.py's read_events() sorts the day by `e.get("ms", 0)`, and
 *     capped_json() keeps the NEWEST events when the reply is over its 320KB ceiling. An event
 *     with no `ms` sorts to position zero of the whole day and is therefore the FIRST thing the
 *     cap throws away — on a busy booth the command would simply never be in the reply the tablet
 *     reads. Same reason the tablet's and the phone's own log envelopes carry it.
 *
 *  3. **A `tabletapp` LINE IS NOT A `phoneapp` LINE.** This phone ships its own log to the very
 *     same endpoint (RemoteControl.event stamps `"surface":"phoneapp"`), so anything counting
 *     rows, or reading `subscribers`, will happily report the phone back to itself as "the tablet
 *     is connected". [lastSeen] filters on the surface field and nothing else.
 *
 * CONNECTION BUDGET: every request here is on the TELEMETRY port, never the page port — same rule
 * as [RemoteControl]. `Connection: close`, one request at a time, via [Net].
 */
object TabletLink {

    /**
     * How far back [lastSeen] looks. `?since=` is what keeps the reply small — without it the
     * server answers with as much of the day as fits in 320KB, every poll, on booth air.
     *
     * The window is generous on purpose. `ms` is stamped by the TABLET'S clock, not the server's,
     * so a Fire tablet whose clock has drifted would fall outside a tight window and be reported
     * as missing when it is fine. Twenty minutes absorbs any plausible drift; anything past it is
     * reported as "no report", never as "the tablet is gone".
     */
    const val WINDOW_MS = 20 * 60 * 1000L

    /** Ids are minted per press; two presses inside one millisecond must not collide. */
    private val seq = AtomicLong(0)

    /** The commands the tablet actually implements — tablet MainActivity.command(). */
    const val CMD_SETHOST = "sethost"
    const val CMD_RELOAD = "reload"
    const val CMD_REDISCOVER = "rediscover"

    /** Roughly how long a command sits on the server before the tablet notices (its poll cycle). */
    const val TABLET_POLL_MS = 8_000L

    /**
     * Point the tablet at THIS kiosk — the one the phone is connected to right now.
     *
     * The arg is `host:pagePort`, matching the tablet's own HostStore.parse: it derives its
     * telemetry port from that, exactly as this app does.
     */
    fun setHost(h: ServerHost): Boolean = send(h, CMD_SETHOST, "${h.host}:${h.port}")

    /** Reload the kiosk page the tablet is already showing. */
    fun reload(h: ServerHost): Boolean = send(h, CMD_RELOAD, null)

    /** Make the tablet sweep for the kiosk again. Its scan, not the phone's — nothing here scans. */
    fun rediscover(h: ServerHost): Boolean = send(h, CMD_REDISCOVER, null)

    /** Human name for a command, for the confirmation line. */
    fun label(cmd: String, h: ServerHost?): String = when (cmd) {
        CMD_SETHOST -> "point the tablet at ${h?.let { "${it.host}:${it.port}" } ?: "this kiosk"}"
        CMD_RELOAD -> "reload the tablet"
        CMD_REDISCOVER -> "make the tablet re-discover"
        else -> cmd
    }

    fun send(h: ServerHost, cmd: String, arg: String?): Boolean {
        if (!h.mode.hasTelemetryPort) {
            Diag.w("tablet command '$cmd' not sent — ${h.mode.label} has no telemetry sink")
            return false
        }
        val now = System.currentTimeMillis()
        val o = JSONObject()
            .put("type", "tablet_cmd")
            .put("id", nextId(now))
            .put("cmd", cmd)
            .put("ms", now)                  // see note 2 in the class doc — not decoration
            .put("t", Diag.iso(now))
            // Not read by the tablet (it checks `target`, which defaults to "all"). It is here so
            // the applog says WHO pressed the button when Daniel reads it back at 8am.
            .put("src", "phone")
            .put("from", Diag.deviceId)
        if (arg != null) o.put("arg", arg)

        val url = "http://${h.host}:${h.telemetryPort}/log"
        val ok = Net.postJson(url, o.toString()) != null
        if (ok) Diag.i("TABLET CMD -> $url  $o")
        else Diag.e("TABLET CMD -> $url FAILED (kiosk did not accept it): $o")
        return ok
    }

    private fun nextId(now: Long): String = "phone-${Diag.deviceId}-$now-${seq.incrementAndGet()}"

    // --------------------------------------------------------------------- status

    /**
     * What the kiosk has heard from the tablet lately.
     *
     * [seen] false means the question was ASKED and answered with nothing — not that the read
     * failed. A failed read returns null from [lastSeen], because "I could not check" and "the
     * tablet has gone quiet" are different problems with different fixes and must never be drawn
     * as the same line.
     */
    data class Report(
        val seen: Boolean,
        /** Age of the newest tablet line, by the phone's clock. Clamped at 0. */
        val ageMs: Long = 0,
        /** The tablet's own `state` line from its last `tablet_status`, if it sent one. */
        val state: String? = null,
        /** Which kiosk the tablet says it is pointing at. The whole point of the rescue buttons. */
        val host: String? = null,
        /** How many tablet lines were in the window — a quiet tablet vs a chatty one. */
        val lines: Int = 0
    )

    /** Log types the TABLET ships. `tablet_cmd` is deliberately absent — that is the phone's own. */
    private val TABLET_LOG_TYPES = setOf("tablet_log", "tablet_status", "tablet_diag")

    fun lastSeen(h: ServerHost): Report? {
        if (!h.mode.hasTelemetryPort) return null
        val since = (System.currentTimeMillis() - WINDOW_MS).coerceAtLeast(0)
        val raw = Net.get("http://${h.host}:${h.telemetryPort}/applog?since=$since") ?: return null
        return try {
            val arr = JSONArray(raw)
            var newest = 0L
            var count = 0
            var state: String? = null
            var host: String? = null
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                val type = o.optString("type")
                // THE FILTER THAT MATTERS. This phone's own lines are in the same file, stamped
                // "phoneapp" — counting them is how a phone reports itself as the tablet.
                val isTablet = o.optString("surface") == "tabletapp" || TABLET_LOG_TYPES.contains(type)
                if (!isTablet) continue
                if (type == "tablet_cmd") continue
                count++
                val ms = o.optLong("ms", 0)
                if (ms > newest) {
                    newest = ms
                    // Only a status line carries these; a plain log line leaves them as they were.
                    if (type == "tablet_status") {
                        state = o.optString("state").takeIf { it.isNotBlank() }
                        host = o.optString("host").takeIf { it.isNotBlank() && it != "none" }
                    }
                }
            }
            if (count == 0 || newest == 0L) Report(seen = false)
            else Report(
                seen = true,
                // The tablet stamped `ms` off its own clock; a clock a little ahead of the
                // phone's must read "just now", never as a negative age.
                ageMs = (System.currentTimeMillis() - newest).coerceAtLeast(0),
                state = state,
                host = host,
                lines = count
            )
        } catch (t: Throwable) {
            Diag.w("GET /applog gave something that is not JSON: ${t.message}")
            null
        }
    }
}
