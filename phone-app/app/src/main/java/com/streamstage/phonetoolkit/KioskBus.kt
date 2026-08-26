package com.streamstage.phonetoolkit

import org.json.JSONObject

/**
 * DRIVING THE BOOTH TV DIRECTLY — no gate, no attract loop, no tile-then-form dance.
 *
 * Daniel's requirement, verbatim: *"phone app should be able to play any video instantly
 * including the stream stage video and no gate"*.
 *
 * WHY THIS IS NOT THE /tablet PAGE
 * --------------------------------
 * tablet.html is the VISITOR surface. It gates: a visitor types a studio name and an email before
 * a film plays, because a visitor is a lead worth capturing. **Daniel is not a lead.** Gating the
 * operator would mean typing his own email to demo his own product, in front of the person he is
 * demoing to. So the phone's default kiosk surface is this class plus [FilmPanel]: a flat list,
 * one tap, the film is on the TV. The /tablet page is still reachable from the operator panel for
 * the times he wants the visitor-facing view — it is a second surface, not the main one.
 *
 * THE WIRE PROTOCOL — read off serve.py and tv.html, not invented
 * --------------------------------------------------------------
 *  POST /bus  {"type":"play","product":"<id>","dir":"r"}   tv.html:965 -> productById + play()
 *  POST /bus  {"type":"stop"}                              tv.html:970 -> abandon() + toAttract()
 *  POST /bus  {"type":"ping"}                              tv.html:972 -> TV re-announces its state
 *  GET  /state                                             serve.py:329, the retained "tv" message
 *  GET  /films                                             serve.py:335, {"<id>": <bytes>} of what
 *                                                          is ACTUALLY on the laptop's disk
 *
 * serve.py:381 relays a POST /bus to every connected screen over SSE. The phone is just another
 * publisher on that bus — no server change was needed and none was made.
 *
 * TWO HARD-WON CONSTRAINTS THIS CLASS RESPECTS
 * --------------------------------------------
 *  1. **Only `tv` messages are retained** (serve.py:75 RETAINABLE). Retaining a `play` made a
 *     screen that joined late restart an hour-old film. This class therefore never expects its
 *     `play` to be replayed, and never publishes a `tv` message of its own — the phone is not a
 *     screen and must not overwrite the TV's retained state.
 *  2. **The kiosk page port has a measured ~6-connections-per-host budget**, spent by the TV's
 *     EventSource and its film layers. So this class does NOT open an SSE stream and does NOT
 *     poll hard: it polls GET /state at [STATE_POLL_MS], single-flight, `Connection: close`, and
 *     only while the film list is actually on screen (see FilmPanel.start/stop). That is well
 *     under one request a second from a device that is not the TV, against a threaded server.
 *
 * Every film id comes from GET /films. NOTHING here hardcodes a film list — which is how
 * `streamstage-services` (StreamStage's own recital/livestream film, an attract card on the TV and
 * deliberately not a seventh visitor tile) shows up in Daniel's hand as a seventh row.
 */
object KioskBus {

    /** How often the film list refreshes what the TV is doing. See the connection-budget note. */
    const val STATE_POLL_MS = 2000L

    /** One film the laptop actually has on disk. */
    data class Film(
        val id: String,
        val bytes: Long,
        /** True when tv.html's CONFIG.products contains this id, i.e. `play` will be actioned. */
        val isProductTile: Boolean
    ) {
        /** "streamstage-services" -> "Streamstage Services". A fallback only; see [display]. */
        private val titleCased: String
            get() = id.split('-', '_').joinToString(" ") { w ->
                w.replaceFirstChar { it.uppercase() }
            }

        val display: String get() = PRETTY[id] ?: titleCased

        val sizeMb: String get() = String.format("%.0f MB", bytes / 1_048_576.0)
    }

    /**
     * Display names, matched to kiosk.js's CONFIG.products `name` fields so the phone calls each
     * film what the TV and the tablet call it. Anything not listed falls back to title case, so a
     * film added to the laptop tomorrow still appears with a sane label and no code change.
     */
    private val PRETTY = mapOf(
        "studiosage" to "StudioSage",
        "compsync" to "CompSync",
        "callboard" to "Callboard",
        "costumecraft" to "CostumeCraft",
        "studiobeat" to "StudioBeat",
        "reflect" to "Reflect",
        "streamstage-services" to "StreamStage — recital filming & livestream"
    )

    /**
     * The six ids in kiosk.js CONFIG.products (verified by reading kiosk.js:27-86).
     *
     * This list is NOT used to build the menu — the menu is whatever GET /films returns. It is
     * used for ONE thing: choosing the verb. tv.html resolves a `play` through `productById()`
     * (tv.html:966, kiosk.js:169), which only searches CONFIG.products, so a film on disk that is
     * not in that list — `streamstage-services` is exactly that case — would be published to the
     * bus successfully and then DROPPED by the TV.
     *
     * So those go as `playfilm` instead (BUS-CONTRACT.md §2.3), the by-basename verb the TV agent
     * is implementing. If a film id is later added to CONFIG.products, adding it here switches it
     * back to the `play` verb and nothing else in this app changes.
     */
    private val TV_PRODUCT_IDS = setOf(
        "studiosage", "compsync", "callboard", "costumecraft", "studiobeat", "reflect"
    )

    /** What the TV last said it was doing. Parsed from the retained `tv` message. */
    data class TvState(
        val state: String,          // attract | playing | end
        val product: String?,
        val pos: Double,
        val dur: Double,
        val muted: Boolean,
        val warm: Int,
        val atMs: Long,
        /**
         * BUS-CONTRACT.md §3 — requested addition to the `tv` message, held by [pause].
         * OPTIONAL: a TV that has not shipped it yet simply reports false, and the console
         * degrades to exactly today's behaviour rather than showing a wrong state.
         */
        val paused: Boolean = false,
        /**
         * WHICH ATTRACT LOOP IS RUNNING — "cards" or "menu" — and whether the menu reel exists on
         * that screen at all. Published by tv.html:1805 and by the stick (BoothBus.tvMessage).
         *
         * **BOTH ARE NULLABLE AND THAT IS THE POINT.** serve.py strips the live fields off the
         * retained `tv` object once it is 5 s stale (serve.py:1030), and an older screen never
         * sent them. Null therefore means "this screen has not said", which is a different thing
         * from "cards" and from "no reel", and the console draws it as its own third state rather
         * than guessing a default and lighting up the wrong button.
         */
        val attract: String? = null,
        val menuLoop: Boolean? = null,
        /**
         * Is the film on screen repeating instead of handing over to the next one?
         *
         * Nullable for the same reason as [attract]: a screen that has not shipped the verb never
         * says, and "has not said" must not be drawn as "off" — that would light the button as if
         * pressing it would do something.
         */
        val loopOne: Boolean? = null
    ) {
        val isPlaying: Boolean get() = state == "playing"

        /** Playing, but held on a frame. */
        val isPaused: Boolean get() = isPlaying && paused

        /** 0..1, for the position bar. 0 when the TV has not reported a duration. */
        val progress: Float
            get() = if (dur > 0) (pos / dur).coerceIn(0.0, 1.0).toFloat() else 0f

        /** Human line for the strip above the console. */
        fun line(films: List<Film>): String {
            val name = product?.let { p -> films.firstOrNull { it.id == p }?.display ?: p }
            return when {
                state == "playing" && name != null -> {
                    val left = (dur - pos).coerceAtLeast(0.0)
                    (if (paused) "TV: PAUSED on $name" else "TV: playing $name") +
                        if (dur > 0) " · ${fmt(pos)} / ${fmt(dur)} (${fmt(left)} left)" else ""
                }
                state == "end" -> "TV: end card"
                else -> "TV: attract loop" + if (warm > 0) " · $warm films warm" else ""
            }
        }

        private fun fmt(s: Double): String {
            val t = s.toInt().coerceAtLeast(0)
            return "%d:%02d".format(t / 60, t % 60)
        }
    }

    // ------------------------------------------------------------------ reads

    /**
     * What films the laptop actually has. The server is asked rather than the app assuming, so a
     * film that has not been rendered yet costs one honest answer instead of a dead row.
     */
    fun films(h: ServerHost): List<Film>? {
        val raw = Net.get("${h.origin}/films") ?: run {
            Diag.w("GET ${h.origin}/films returned nothing")
            return null
        }
        return try {
            val o = JSONObject(raw)
            val out = ArrayList<Film>()
            for (k in o.keys()) out.add(Film(k, o.optLong(k, 0), TV_PRODUCT_IDS.contains(k)))
            // Product tiles first in CONFIG order, then anything else (streamstage-services and
            // any future film) at the bottom — so the six he demos most are where his thumb is.
            val order = listOf("studiosage", "compsync", "callboard", "costumecraft", "studiobeat", "reflect")
            val sorted = out.sortedWith(compareBy({ order.indexOf(it.id).let { i -> if (i < 0) 99 else i } }, { it.id }))
            Diag.i("films on ${h.host}: ${sorted.joinToString(", ") { it.id + "(" + it.sizeMb + ")" }}")
            sorted
        } catch (t: Throwable) {
            Diag.e("GET /films gave something that is not JSON: ${t.message}")
            null
        }
    }

    /** What the TV is doing right now, from the relay's retained `tv` message. */
    fun tvState(h: ServerHost): TvState? {
        val raw = Net.get("${h.origin}/state", connectMs = 1500, readMs = 2500) ?: return null
        return try {
            val tv = JSONObject(raw).optJSONObject("tv") ?: return null
            TvState(
                state = tv.optString("state", "attract"),
                product = tv.optString("product").takeIf { it.isNotBlank() && it != "null" },
                pos = tv.optDouble("pos", 0.0),
                dur = tv.optDouble("dur", 0.0),
                muted = tv.optBoolean("muted", true),
                warm = tv.optInt("warm", 0),
                atMs = tv.optLong("at", 0),
                paused = tv.optBoolean("paused", false),
                // has() rather than opt-with-a-default: a missing field must stay null. See the
                // note on TvState.attract for why a default here would draw a wrong button.
                attract = tv.optString("attract").takeIf { tv.has("attract") && it.isNotBlank() },
                loopOne = if (tv.has("loopOne")) tv.optBoolean("loopOne") else null,
                menuLoop = if (tv.has("menuLoop")) tv.optBoolean("menuLoop", false) else null
            )
        } catch (_: Throwable) {
            null
        }
    }

    // ----------------------------------------------------------------- writes

    /**
     * ONE publisher for every command, so the two things that must be on EVERY message cannot be
     * forgotten on a new verb:
     *
     *   `_from`  a screen must never handle its own echo (kiosk.js Bus.deliver checks this)
     *   `src`    "phone" — so telemetry, and anyone reading the bus, can tell an operator action
     *            from a visitor tap on the tablet. They are different events on a show floor.
     *
     * A `200` here means THE RELAY ACCEPTED IT. It is never proof that a screen acted — the only
     * proof of that is the next `tv` state message. The console is written accordingly.
     */
    private fun send(h: ServerHost, type: String, build: (JSONObject) -> Unit = {}): Boolean {
        val o = JSONObject()
            .put("type", type)
            .put("src", "phone")
            .put("_from", "phone-${Diag.deviceId}")
        build(o)
        val ok = Net.postJson("${h.origin}/bus", o.toString()) != null
        if (ok) Diag.i("BUS -> ${h.origin}/bus  $o")
        else Diag.e("BUS -> ${h.origin}/bus FAILED (relay did not answer 200): $o")
        return ok
    }

    /**
     * Play a film on the TV, now. No gate, no confirmation, no lead form.
     *
     * TWO VERBS, ONE BUTTON — and the choice is not cosmetic. tv.html resolves a `play` through
     * `productById()` (tv.html:966), which only searches kiosk.js CONFIG.products. A film on disk
     * that is not one of the six product tiles — `streamstage-services` is exactly that — is
     * accepted by the relay and then silently DROPPED by the TV. So anything outside
     * [TV_PRODUCT_IDS] goes as `playfilm`, the by-basename verb defined in BUS-CONTRACT.md §2.3.
     *
     * `dir` only picks which way the attract art slides out (tv.html CSS dir-l / dir-r); it has no
     * effect on which film plays.
     */
    fun play(h: ServerHost, filmId: String, dir: String = "r"): Boolean =
        if (TV_PRODUCT_IDS.contains(filmId)) {
            send(h, "play") { it.put("product", filmId).put("dir", dir) }
        } else {
            send(h, "playfilm") { it.put("film", filmId).put("dir", dir) }
        }

    /** Abandon whatever is playing and return the TV to the attract loop. */
    fun stop(h: ServerHost): Boolean = send(h, "stop")

    /**
     * Hold the current film on its frame. BUS-CONTRACT.md §2.1.
     *
     * Explicit verbs rather than one toggle, on purpose: the console sees the TV on a 2-second
     * poll, so a toggle races — two taps 300ms apart against a stale view land as pause-then-pause
     * and invert the state. `pause` and `resume` are idempotent and cannot.
     */
    fun pause(h: ServerHost): Boolean = send(h, "pause")

    /** Resume from exactly where [pause] left it. BUS-CONTRACT.md §2.2. */
    fun resume(h: ServerHost): Boolean = send(h, "resume")

    /**
     * Set the attract-loop order. BUS-CONTRACT.md §2.4.
     *
     * Sent ONCE per reorder gesture — on drop, not per pixel of drag. It does not start playback:
     * a cut to a film is always an explicit [play].
     */
    fun playlist(h: ServerHost, order: List<String>): Boolean =
        send(h, "playlist") { it.put("order", org.json.JSONArray(order)) }

    /** Ask the TV to re-announce itself, so the strip is right immediately after a reconnect. */
    fun ping(h: ServerHost): Boolean = send(h, "ping")

    /** The six-up reel of live film thumbnails. Only exists where menu-loop.mp4 does. */
    const val ATTRACT_MENU = "menu"

    /** The film cards — the loop the booth has always run between films. */
    const val ATTRACT_CARDS = "cards"

    /**
     * Choose WHICH attract loop runs between films: the six-up reel, or the film cards.
     *
     * OPERATOR-GATED, IN TWO PLACES, AND [send] IS WHAT GETS PAST BOTH. `attract` is in serve.py's
     * OPERATOR_ONLY_CMDS (serve.py:189) and in the stick's own copy of that set
     * (BoothBus:496): a message without `src:"phone"` is refused 403 by the relay and never
     * published, so a visitor on the booth tablet cannot change what the big screen shows between
     * films. Every message this object sends carries that stamp — which is precisely why the
     * stamp lives in [send] and not at each call site.
     *
     * `mode` is ALWAYS sent explicitly. Both screens treat an absent mode as a toggle (tv.html
     * setAttractMode, BoothLoopActivity.setAttractMode), and a toggle races a console that sees
     * the TV on a 2-second poll — two presses against a stale view invert it. Same reasoning as
     * pause/resume being separate verbs rather than one toggle.
     *
     * A `200` means the RELAY took it. If the screen has no six-up reel it refuses `menu` on its
     * own side and logs why — so the console disables that button up front rather than letting
     * him press a control that is accepted and then quietly dropped. See [TvState.menuLoop].
     */
    fun attract(h: ServerHost, mode: String): Boolean =
        send(h, "attract") { it.put("mode", mode) }

    /**
     * Repeat the film on screen instead of advancing to the next one.
     *
     * `on` is ALWAYS sent explicitly, for the reason spelled out on [attract]: the screen accepts
     * a bare toggle, but a toggle raced against a 2-second poll inverts on a double press. The
     * console knows what it wants, so it says it.
     *
     * Operator-gated like attract, so it goes out through [send] with the `phone` stamp.
     */
    fun loop(h: ServerHost, on: Boolean): Boolean =
        send(h, "loop") { it.put("on", on) }

    /**
     * MUTE IS NOT AVAILABLE OVER THE BUS, and this app will not pretend otherwise.
     *
     * Mute exists on the TV only as the local keyboard shortcut `M` (tv.html:989). Publishing
     * `{"type":"mute"}` would be accepted by serve.py's relay with a cheerful `{"ok":true}` and
     * then ignored by every screen — a button that lights up and does nothing is worse than no
     * button at all on a show floor. BUS-CONTRACT.md §4 says so to the TV side; the moment a mute
     * branch lands there this becomes a two-line change.
     */
    const val MUTE_NOTE = "Mute is on the TV itself (press M there) — the relay has no mute verb yet."

    /**
     * What the phone believes the TV can and cannot resolve, for honest on-screen labelling.
     * Not a gate: [play] sends everything, it just picks the right verb.
     */
    fun needsPlayfilmVerb(filmId: String): Boolean = !TV_PRODUCT_IDS.contains(filmId)
}
