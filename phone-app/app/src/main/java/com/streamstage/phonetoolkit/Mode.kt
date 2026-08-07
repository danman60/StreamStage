package com.streamstage.phonetoolkit

import android.graphics.Color

/**
 * THE TWO ROLES THIS PHONE PLAYS.
 *
 * Daniel's requirement, verbatim: *"phone app needs to be able to switch between PRESENTER MODE
 * for controlling deck and KIOSK MODE for controlling tv"*.
 *
 * They are two DIFFERENT SERVERS. Not two pages on one server, not two tabs — two separate
 * Python processes that may be on two different laptops, and are on two different ports even when
 * they are on the same one. Everything that differs between them is in this file and nowhere else,
 * so adding a third role later is one more enum constant rather than a hunt through the codebase.
 *
 * What differs, and why:
 *
 *  PRESENTER -> expo-assets/decks/presenter-server.py
 *      page          /remote  (presenter-server.py:717, served from the REMOTE_PAGE constant)
 *      port          8090 by default since today. It was 8080 until the kiosk claimed 8080/8081
 *                    (presenter-server.py:24 DEFAULT_PORT, :9-13 the docstring explaining the
 *                    move). PRESENTER_PORT overrides it to anything. TWO STALE INSTANCES ARE
 *                    STILL LISTENING ON 8080 ON DART, so both numbers are live in the field and
 *                    both get probed.
 *      detection     GET /state.  ** presenter-server.py HAS NO /health — I checked. **  See
 *                    [detect] below for what is used instead and why it cannot false-positive.
 *      telemetry     NONE. This server has no /log and no /events sink, so the log-shipping and
 *                    command-pull channel is off in this mode (RemoteControl is not started).
 *                    adb and the on-screen panel are the diagnostics here.
 *      extras        volume rocker pages the deck (POST /cmd) — carried over from PhonePresenter.
 *
 *  KIOSK -> expo-assets/kiosk/serve.py
 *      page          /tablet  (serve.py:318 aliases /tablet -> tablet.html)
 *      port          8081 on DART right now; serve.py's pick_ports() walks 8080,8082,8084… so it
 *                    can be almost anywhere in that window.
 *      detection     GET /health, which serve.py:348 answers with
 *                    {"ok":true,"ip":..,"port":..,"subscribers":..,"events":..,"leads":..,
 *                     "telemetryDir":..}.
 *      telemetry     page port + 1 (serve.py:26). /log and /events live there and that is what
 *                    RemoteControl rides. NEVER the page port — the WebView's ~6 connections on
 *                    the page port belong to the SSE stream and the films, and starving it is a
 *                    measured failure on this project.
 */
enum class Mode(
    /** What Daniel calls it. Shown on the mode chip and in the switcher. */
    val label: String,
    /** One letter for the chip when there is no room for the word. */
    val letter: String,
    /** What this mode drives, in his words. Shown in the switcher so a wrong tap is obvious. */
    val drives: String,
    /** Which server this is, for failure text that names the actual process. */
    val serverName: String,
    /** Default page path on that server. Overridable per mode in [HostStore]. */
    val defaultPath: String,
    /**
     * The ports probed FIRST, in this order, on every address in a sweep. Everything else is a
     * fallback walk. These are the numbers that are actually true in the field today.
     */
    val seedPorts: List<Int>,
    /** Does this server have a second listener one port up? Only the kiosk does. */
    val hasTelemetryPort: Boolean,
    /** Chip colour. The two modes must never be confused at a glance from arm's length. */
    val accent: Int,
    /** Prefix for this mode's own saved-host keys, so the two hosts never overwrite each other. */
    val prefsPrefix: String
) {

    PRESENTER(
        label = "PRESENTER",
        letter = "P",
        drives = "the slide deck on the projector",
        serverName = "presenter-server.py",
        defaultPath = "/remote",
        // 8090 is today's default; 8080 is where the two stale instances still are.
        seedPorts = listOf(8090, 8080),
        hasTelemetryPort = false,
        accent = 0xFF4F8DF7.toInt(),          // blue = stage
        prefsPrefix = "presenter"
    ),

    KIOSK(
        label = "KIOSK",
        letter = "K",
        drives = "the booth TV",
        serverName = "kiosk serve.py",
        defaultPath = "/tablet",
        // 8081 is where DART's kiosk is right now; 8080 is serve.py's own default.
        seedPorts = listOf(8081, 8080),
        hasTelemetryPort = true,
        accent = 0xFFF0A73B.toInt(),          // amber = booth
        prefsPrefix = "kiosk"
    );

    val other: Mode get() = if (this == PRESENTER) KIOSK else PRESENTER

    /** Dimmed accent, for the chip background. */
    val accentDim: Int
        get() = Color.argb(56, Color.red(accent), Color.green(accent), Color.blue(accent))

    /** The detection endpoint for this mode. */
    val probePath: String
        get() = if (this == KIOSK) "/health" else "/state"

    /**
     * Is this JSON body really this mode's server?
     *
     * KIOSK — serve.py:348's /health. `subscribers`/`telemetryDir` are what separate it from the
     * many bland /health endpoints on a trade-show network.
     *
     * PRESENTER — **presenter-server.py does not implement /health.** Verified by reading its
     * do_GET (presenter-server.py:707-739): the routes are /facelift, /remote, /demo-kb,
     * /demo-wall, /state, /cmd, then static. So the honest detector is GET /state
     * (presenter-server.py:729), which returns `dict(STATE)` — declared at line 70 as
     * `{"idx":0,"total":0,"title":"","beats":[],"titles":[],"seq":0}` — plus a `facelift` key
     * glued on at line 732.
     *
     * That combination cannot be confused with the kiosk, and this matters because
     * **serve.py ALSO answers GET /state** (serve.py:329) — it returns the retained SSE message,
     * a completely different shape. Requiring `seq` AND `beats` AND `titles` AND `facelift`
     * together rules the kiosk out, and rules out any other JSON /state on the venue Wi-Fi.
     *
     * Returns a human description on success, or null if this is not our server.
     */
    fun identify(json: org.json.JSONObject): String? = when (this) {
        KIOSK -> {
            if (!json.optBoolean("ok", false)) null
            else if (!json.has("ip") || !json.has("port")) null
            else if (!json.has("subscribers") && !json.has("telemetryDir")) null
            else "kiosk at ${json.optString("ip")}:${json.optInt("port")}, " +
                "${json.optInt("subscribers")} subscriber(s), ${json.optInt("events")} event(s)"
        }
        PRESENTER -> {
            if (!json.has("seq") || !json.has("beats") || !json.has("titles")) null
            else if (!json.has("facelift")) null
            else {
                val total = json.optInt("total", 0)
                val idx = json.optInt("idx", 0)
                val title = json.optString("title").takeIf { it.isNotBlank() }
                "deck server, slide ${idx + 1}/$total" + (title?.let { " (\"$it\")" } ?: "") +
                    ", seq ${json.optInt("seq")}"
            }
        }
    }

    /** The self-reported LAN address, when the server volunteers one. Only the kiosk does. */
    fun reportedIp(json: org.json.JSONObject): String? =
        if (this == KIOSK) json.optString("ip").takeIf { it.isNotBlank() } else null

    companion object {
        fun byName(raw: String?): Mode? = when (raw?.trim()?.lowercase()) {
            "presenter", "p", "deck", "slides" -> PRESENTER
            "kiosk", "k", "tv", "booth" -> KIOSK
            else -> null
        }
    }
}
