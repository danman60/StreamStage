package com.streamstage.phonetoolkit

import android.app.Activity
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.Toast
import java.io.ByteArrayInputStream
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * STREAMSTAGE PHONE — one app, two roles, switched in Daniel's hand.
 *
 * *"phone app needs to be able to switch between PRESENTER MODE for controlling deck and KIOSK
 * MODE for controlling tv"* — and, refined the same day: *"Phone needs to have total management
 * control set the playlist drag and drop play pause stop It is a operator control that can then
 * switch to the presenter mode to affect the decks... the tablet mode is for people walking by so
 * should have the gate on it the phone shouldn't have any gate."*
 *
 * WHAT IS REUSED, so this is not a rewrite of anything that already works:
 *   - the WebView shell + host-in-SharedPreferences shape ....... ~/projects/PhonePresenter
 *   - the deck command sender, verbatim in behaviour ............. PhonePresenter/Remote.kt -> Remote.kt
 *   - discovery, the two-stage sweep, Diag, SetupOverlay,
 *     RemoteControl, the origin allowlist, the watchdog ......... ../tablet-app
 *   - gradle/toolchain/manifest shape ........................... ../kiosk-app and ../tablet-app
 *
 * WHAT IS NEW, because nothing existing did it:
 *   - [Mode] and everything keyed off it, including per-mode saved hosts ([HostStore])
 *   - [ModeBar]/[ModeSwitcher] — the switch itself
 *   - [KioskBus]/[FilmPanel]/[Playlist] — the native OPERATOR CONSOLE
 *
 * ONE SURFACE PER MODE. Which one is showing is the whole layout logic here:
 *
 *   PRESENTER -> the WebView on presenter-server.py's /remote. The deck remote page is the UI, so
 *                beats and the jump list have exactly one implementation, and the volume rocker is
 *                the thing the app adds that a web page cannot do.
 *
 *   KIOSK     -> [FilmPanel], a NATIVE operator console. It is deliberately NOT a WebView of
 *                /tablet: that page is the VISITOR surface, it carries the email gate, and it
 *                belongs on the Fire tablet for people walking past the booth. Daniel is the
 *                operator, not a lead — **there is no gate anywhere in this app**, and it no
 *                longer offers to open the visitor page at all.
 *
 * The console drives the TV over the kiosk server's existing LAN bus (`POST /bus`), not a new
 * protocol. The exact message shapes are the contract in phone-app/BUS-CONTRACT.md, which the TV
 * side is implemented against.
 *
 * NO SCREEN PINNING, by instruction — no lockTaskMode in the manifest, no startLockTask() in this
 * source, no toggle anywhere. This is Daniel's own phone; there is nothing to pin it against.
 */
class MainActivity : Activity() {

    private lateinit var root: FrameLayout
    private lateinit var column: LinearLayout
    private lateinit var bar: ModeBar
    private lateinit var content: FrameLayout
    private lateinit var web: WebView
    private lateinit var films: FilmPanel
    private lateinit var overlay: SetupOverlay
    private lateinit var switcher: ModeSwitcher
    private lateinit var picker: LaunchPicker
    private lateinit var store: HostStore
    private lateinit var playlist: Playlist
    private lateinit var remote: RemoteControl

    private val ui = Handler(Looper.getMainLooper())
    private val io = Executors.newCachedThreadPool()
    private val cancelScan = AtomicBoolean(false)

    /** The current role. Restored from the last session; changed only by [switchTo]. */
    private var mode: Mode = Mode.PRESENTER

    /** The server the current mode is on. Null until something answered its probe. */
    @Volatile private var current: ServerHost? = null
    @Volatile private var connecting = false

    private var pageLoaded = false

    /**
     * Consecutive failed health probes, SHARED by the watchdog and onResume. One miss on a venue
     * hotspot is noise; two consecutive misses is a laptop that has actually gone. onResume used
     * to act on ONE, which meant every screen-off/screen-on reloaded the deck remote mid-talk.
     */
    private var healthMisses = 0

    /**
     * The last play/playfilm this app sent, and whether one is still in flight.
     *
     * `pause` and `resume` are idempotent on the TV side; `play` is NOT — tv.html sets
     * currentTime = 0 on every play it receives, including a repeat of the film already running.
     * So a double-tap in front of a prospect restarts the film. This gate is on the CLICK path,
     * which is where the double-tap happens; FilmPanel.setSending is the second half (the control
     * is visibly dead while the request is out).
     */
    private var lastPlayAt = 0L
    private var playInFlight = false

    // ------------------------------------------------------------------ lifecycle

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = HostStore(this)
        playlist = Playlist(this)
        // The last mode is a HIGHLIGHT ON THE PICKER, NOT A DECISION. Restoring it and acting on it
        // is the bug this build exists to remove: it came up in KIOSK, swept a /24 for a laptop
        // that was switched off, and the deck remote was unreachable behind that sweep.
        mode = store.mode
        Diag.mode = mode
        Diag.init(this)
        Diag.i("launched. Last mode was ${mode.label} — showing the picker, connecting to NOTHING " +
            "until a mode is chosen.")

        // A phone that dims mid-talk is a phone that has stopped being a remote.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        root = FrameLayout(this).apply { setBackgroundColor(BG) }
        column = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }

        bar = ModeBar(this).apply {
            // One tap on the mode he is NOT in. The segmented control names both modes on screen
            // at all times — the previous single chip + long-press was undiscoverable and he
            // reported it as "currently no way to switch from kiosk to presenter".
            onPickMode = { picked -> switchTo(picked) }
            onRequestSwitch = { showSwitcher() }
            onRequestPanel = { openPanel() }
        }
        content = FrameLayout(this)
        web = buildWebView()
        films = buildFilmPanel()

        content.addView(web, matchParent())
        content.addView(films, matchParent())

        column.addView(bar, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        column.addView(content, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))

        overlay = SetupOverlay(this).apply {
            onConnect = { text -> connectManually(text) }
            onForce = { text -> forceHost(text) }
            onRescan = { startConnect(force = true) }
            onReload = { reloadCurrentSurface() }
            onSwitchMode = { hide(); showSwitcher() }
            onDismiss = { if (canDismissPanel()) hide() }
        }
        switcher = ModeSwitcher(this).apply {
            onPick = { picked -> switcher.hide(); switchTo(picked) }
            onCancel = { switcher.hide() }
        }
        picker = LaunchPicker(this).apply {
            onStart = { m, text -> startFromPicker(m, text) }
            onSearch = { m -> sweepFor(m) }
            onForce = { m, addr -> forceFromPicker(m, addr) }
        }

        root.addView(column, matchParent())
        root.addView(overlay, matchParent())
        root.addView(switcher, matchParent())
        // Topmost: until a mode is picked, nothing underneath it is live.
        root.addView(picker, matchParent())
        setContentView(root)

        // The pull-from-the-kiosk control plane. Started only in KIOSK mode — see RemoteControl.
        remote = RemoteControl(hostProvider = { current }, onCommand = { c, a -> ui.post { command(c, a) } })

        // The adb control plane. Debug builds only; a no-op in release.
        DebugBridge.register(this) { c, a -> ui.post { command(c, a) } }

        applyMode(initial = true)
        showPicker()
    }

    // ------------------------------------------------------------------ the launch picker

    /**
     * ASK. Do nothing else.
     *
     * No probe, no page load, no sweep, no timer. The only thing that happens between here and a
     * tap is the watchdog ticking over and finding `current == null`, which is now a no-op.
     */
    private fun showPicker() {
        cancelScan.set(true)
        connecting = false
        picker.show(
            lastMode = mode,
            saved = mapOf(
                Mode.PRESENTER to store.saved(Mode.PRESENTER),
                Mode.KIOSK to store.saved(Mode.KIOSK)
            ),
            fallback = mapOf(
                Mode.PRESENTER to Mode.PRESENTER.fallbackHost,
                Mode.KIOSK to Mode.KIOSK.fallbackHost
            )
        )
    }

    /**
     * START pressed on a card. ONE address, ONE probe, no sweep, and the other mode is not touched.
     *
     * The probe exists so a wrong address is caught in about a second and said in words, not so the
     * app can second-guess the operator — if it fails, "Open it anyway" is right there and does
     * exactly that.
     */
    private fun startFromPicker(target: Mode, text: String) {
        val typed = text.trim()
        if (typed.isEmpty()) {
            picker.setStatus("Type the ${target.pickLabel.lowercase()} laptop's address first, " +
                "e.g. 192.168.0.13:${target.seedPorts.first()} — or use Search this network.")
            return
        }
        val parsed = HostStore.parse(target, typed)
        if (parsed == null) {
            picker.setStatus("'$typed' is not an address. Try 192.168.0.13:${target.seedPorts.first()}.")
            return
        }

        enterMode(target)
        picker.setBusy(true)
        picker.setStatus("Checking $parsed …")
        Diag.i("PICKER: ${target.pickLabel} -> $parsed (single probe, no sweep)")

        io.execute {
            val hit = Discovery.probe(target, parsed.host, parsed.port)
            ui.post {
                picker.setBusy(false)
                if (target != mode) return@post          // he changed his mind mid-probe
                if (hit != null) {
                    store.save(hit)
                    picker.hide()
                    connectTo(hit)
                } else {
                    val why = Diag.attempts().lastOrNull()?.let { "${it.outcome}: ${it.detail}" }
                        ?: "no answer"
                    picker.setFailure(target, parsed.toString(),
                        "$parsed did not answer as ${target.serverName} ($why).\n" +
                            "Check it is running, fix the address, or open it anyway.")
                    Diag.e("PICKER: $parsed did not answer for ${target.label} — $why")
                }
            }
        }
    }

    /** "Open it anyway" on the picker. Same contract as [forceHost]: used, never remembered. */
    private fun forceFromPicker(target: Mode, addr: String) {
        enterMode(target)
        picker.hide()
        forceHost(addr)
    }

    /**
     * THE ONLY ROUTE TO A LAN SWEEP THAT STARTS AT LAUNCH. The operator pressed a button labelled
     * "Search this network", so a sweep is what they asked for.
     */
    private fun sweepFor(target: Mode) {
        enterMode(target)
        picker.hide()
        Diag.i("PICKER: operator asked for a network search in ${target.label} mode")
        startConnect(force = true)
    }

    /**
     * Move the app into a mode WITHOUT connecting anything — the picker's half of [switchTo].
     * Everything belonging to the old mode is torn down for the same reasons stated there.
     */
    private fun enterMode(target: Mode) {
        if (target != mode) {
            Diag.i("=== PICKED ${target.label} (was ${mode.label}) ===")
            cancelScan.set(true)
            connecting = false
            remote.stop()
            films.stopPolling()
            Remote.arm(null)
            web.loadUrl("about:blank")
            pageLoaded = false
            healthMisses = 0
            playInFlight = false
            current = null
            mode = target
            Diag.mode = target
            store.mode = target
            applyMode(initial = false)
        }
    }

    // ------------------------------------------------------------------ the mode switch

    private fun showSwitcher() {
        Diag.i("mode switcher opened (currently ${mode.label})")
        // Show the LIVE host for whichever mode we are in, and the SAVED host for the other one —
        // so both cards say where a switch would actually land before he commits to it.
        fun shownHost(m: Mode): ServerHost? =
            (if (mode == m) current else null) ?: store.saved(m)
        switcher.show(mode, mapOf(
            Mode.PRESENTER to shownHost(Mode.PRESENTER),
            Mode.KIOSK to shownHost(Mode.KIOSK)
        ))
    }

    /**
     * SWITCH ROLE. Everything that belongs to the old mode is torn down first, because leaving any
     * of it running is how a phone in KIOSK mode ends up paging the deck:
     *
     *   - the volume rocker is disarmed ([Remote.arm] with a non-presenter host clears it)
     *   - the film list stops polling the kiosk
     *   - the WebView is parked on about:blank, so no page from the old server keeps a socket,
     *     an EventSource or a poll loop alive against a server this mode is not on
     *   - RemoteControl stops (it only has a sink in KIOSK mode anyway)
     *
     * Then the NEW mode's own saved host is loaded — not the one on screen a moment ago. That is
     * the whole reason HostStore namespaces its keys.
     */
    private fun switchTo(target: Mode) {
        if (target == mode) { Diag.i("already in ${mode.label}"); return }
        Diag.i("=== MODE SWITCH ${mode.label} -> ${target.label} ===")

        cancelScan.set(true)
        connecting = false
        remote.stop()
        films.stopPolling()
        Remote.arm(null)
        web.loadUrl("about:blank")
        pageLoaded = false
        healthMisses = 0
        playInFlight = false
        current = null

        mode = target
        Diag.mode = target
        store.mode = target
        applyMode(initial = false)

        /*
         * NO SWEEP ON A MODE SWITCH EITHER.
         *
         * This used to call startConnect(), which falls through to a 254-address sweep whenever the
         * saved host does not answer — so tapping KIOSK at a booth with the kiosk laptop shut made
         * the phone unusable for the next minute, in both modes. Now: the saved address is tried
         * ONCE, and if it is not there the picker comes back with the address on screen, ready to
         * be corrected or searched for deliberately.
         */
        val saved = store.saved(target)
        Diag.i("${target.label} mode: saved host is ${saved ?: "none yet"}")
        if (saved == null) { showPicker(); return }
        picker.hide()
        renderBar("checking $saved…")
        io.execute {
            val hit = Discovery.probe(target, saved.host, saved.port)
            ui.post {
                if (target != mode) return@post
                if (hit != null) connectTo(hit) else {
                    Diag.w("${target.label}: saved host $saved did not answer — asking, not sweeping")
                    showPicker()
                    picker.setFailure(target, saved.toString(),
                        "$saved did not answer as ${target.serverName}. Nothing was searched for — " +
                            "fix the address, open it anyway, or ask for a network search.")
                }
            }
        }
    }

    /** Paint everything that depends on which mode we are in. */
    private fun applyMode(initial: Boolean) {
        overlay.setMode(mode)
        showKioskFilmList(mode == Mode.KIOSK)
        armVolumeService(mode == Mode.PRESENTER)
        renderBar(if (initial) "starting…" else "switched to ${mode.label}")
    }

    /**
     * The screen-off half of the volume rocker, carried over from PhonePresenter's
     * VolumeRemoteService. PRESENTER MODE ONLY — stopped the instant the app switches to KIOSK, so
     * at the booth the volume buttons are volume buttons again. [Remote.isArmed] is the second,
     * independent guard on the same thing: the service's provider calls [Remote.send], which
     * refuses when there is no deck server armed.
     *
     * The in-activity path ([onKeyDown]) is the one that is known to work and covers the stage case
     * (phone in hand, screen on). This is the pocket case, and PhonePresenter's own note that it is
     * unverified on device still stands — it is wired because it is that app's shipped code, and it
     * cannot misfire in KIOSK mode.
     */
    private fun armVolumeService(on: Boolean) {
        if (on) VolumeRemoteService.arm(this) else VolumeRemoteService.disarm(this)
    }

    /** Film list visible, or WebView visible. Exactly one of the two, always. */
    private fun showKioskFilmList(showList: Boolean) {
        films.visibility = if (showList) View.VISIBLE else View.GONE
        web.visibility = if (showList) View.GONE else View.VISIBLE
        if (showList) {
            current?.let { films.startPolling(io, { current }) }
        } else {
            films.stopPolling()
        }
    }

    private fun renderBar(detail: String) {
        bar.render(mode, current, pageLoadedOrListReady(), detail)
    }

    private fun pageLoadedOrListReady(): Boolean =
        if (mode == Mode.KIOSK) current != null else pageLoaded

    // ------------------------------------------------------------------ commands

    /**
     * ONE command vocabulary, three ways in: an adb broadcast (the phone has adb, so this is the
     * fast one), the kiosk server's pull channel (KIOSK mode only), and the panel's buttons.
     */
    private fun command(cmd: String, arg: String?) {
        Diag.i("EXEC command '$cmd' arg=${arg ?: "-"}")
        when (cmd.lowercase()) {
            "status" -> {
                val s = statusText()
                Diag.i("STATUS\n$s")
                io.execute { remote.shipReport("STATUS requested\n$s") }
            }
            "setmode" -> {
                val m = Mode.byName(arg)
                if (m == null) Diag.e("setmode: '$arg' is not a mode. Use presenter or kiosk.")
                else switchTo(m)
            }
            "sethost" -> {
                // Applies to the CURRENT mode only. The two saved hosts are separate on purpose.
                val parsed = arg?.let { HostStore.parse(mode, it) }
                if (parsed == null) Diag.e("sethost: '$arg' is not an address")
                else {
                    Diag.i("sethost (${mode.label}) -> $parsed")
                    store.save(parsed)
                    connectTo(parsed)
                }
            }
            // The picker, from adb — so the launch screen can be driven and read back without a
            // thumb on the glass. `rediscover` is still the only command that sweeps.
            "pick" -> showPicker()
            "rediscover" -> startConnect(force = true)
            "reload" -> reloadCurrentSurface()
            "clearhost" -> {
                store.clear(mode)
                current = null
                Diag.i("clearhost: ${mode.label}'s saved address forgotten")
                startConnect(force = true)
            }
            "films" -> refreshFilms()
            "play" -> {
                val h = current
                val id = arg
                when {
                    mode != Mode.KIOSK -> Diag.e("play only works in KIOSK mode (currently ${mode.label})")
                    h == null -> Diag.e("play: not connected to a kiosk")
                    id.isNullOrBlank() -> Diag.e("play: needs --es arg <filmId>")
                    else -> io.execute { KioskBus.play(h, id) }
                }
            }
            "stop" -> withKiosk("stop") { io.execute { KioskBus.stop(it) } }
            "pause" -> withKiosk("pause") { io.execute { KioskBus.pause(it) } }
            "resume" -> withKiosk("resume") { io.execute { KioskBus.resume(it) } }
            "playlist" -> {
                // --es arg "studiosage,compsync,reflect"
                val ids = arg?.split(',')?.map { it.trim() }?.filter { it.isNotEmpty() }.orEmpty()
                if (ids.isEmpty()) Diag.e("playlist: needs --es arg \"id,id,id\"")
                else withKiosk("playlist") {
                    playlist.save(ids)
                    io.execute { KioskBus.playlist(it, ids) }
                    refreshFilms()
                }
            }
            "diag" -> io.execute { remote.shipReport("DIAG requested\n${statusText()}") }
            else -> Diag.w("unknown command '$cmd'. Known: ${DebugBridge.COMMANDS}")
        }
    }

    /** Every TV verb needs the same two guards; one place to state them, one place to be wrong. */
    private inline fun withKiosk(verb: String, block: (ServerHost) -> Unit) {
        val h = current
        when {
            mode != Mode.KIOSK -> Diag.e("$verb only works in KIOSK mode (currently ${mode.label})")
            h == null -> Diag.e("$verb: not connected to a kiosk")
            else -> block(h)
        }
    }

    private fun statusText(): String = buildString {
        appendLine("mode        : ${mode.label} (${mode.serverName})")
        appendLine("host        : ${current ?: "none"}")
        appendLine("surface     : " + when {
            mode == Mode.KIOSK -> "native film list (ungated)"
            else -> "webview ${store.path(mode)}"
        })
        appendLine("pageLoaded  : $pageLoaded")
        appendLine("connecting  : $connecting")
        appendLine("savedHosts  : presenter=${store.saved(Mode.PRESENTER) ?: "none"}  " +
            "kiosk=${store.saved(Mode.KIOSK) ?: "none"}")
        appendLine("volumeKeys  : ${if (Remote.isArmed) "armed against ${Remote.base}" else "disarmed"}")
        appendLine("remoteCtl   : ${if (remote.isRunning) "running" else "stopped"}")
        appendLine("localIp     : ${Discovery.allLocalIPv4().joinToString(", ").ifBlank { "NONE" }}")
        appendLine("lastSubnet  : ${Discovery.lastSubnet ?: "none"}")
        appendLine("lastError   : ${Diag.lastError}")
        val r = Discovery.lastReport
        if (r != null) {
            appendLine("lastSweep   : ${r.addressesTried} addresses, alive=${r.aliveHosts.joinToString(",")}, found=${r.found ?: "none"}")
        }
        append("overlay     : ${if (overlay.isShowing) "showing" else "hidden"}")
    }

    // ------------------------------------------------------------------ kiosk surface

    private fun buildFilmPanel(): FilmPanel = FilmPanel(this).apply {
        onPlay = { f ->
            val h = current
            when {
                h == null -> {
                    Diag.e("tapped ${f.id} with no kiosk connected")
                    showSendFailed(f.display)
                }
                // THE DOUBLE-TAP GUARD. tv.html seeks to 0 on every play it receives, so a second
                // tap inside the gate would restart the film in front of whoever is watching it.
                !playGateOpen(f.id) -> Unit
                else -> {
                    // Straight to the relay. No gate, no confirmation — see KioskBus.
                    Diag.i("TAP play ${f.id} -> ${h.origin}/bus")
                    showRequested(f)
                    setSending(true)
                    io.execute {
                        val ok = KioskBus.play(h, f.id)
                        ui.post {
                            playInFlight = false
                            setSending(false)
                            if (!ok) showSendFailed(f.display)
                        }
                    }
                }
            }
        }
        onPause = {
            val h = current
            if (h != null) { showSent("pause"); io.execute { KioskBus.pause(h) } }
        }
        onResume = {
            val h = current
            if (h != null) { showSent("resume"); io.execute { KioskBus.resume(h) } }
        }
        onStop = {
            val h = current
            if (h != null) { showSent("stop"); io.execute { KioskBus.stop(h) } }
        }
        onRefresh = { refreshFilms() }

        /**
         * WHICH ATTRACT LOOP RUNS BETWEEN FILMS. No gate on the click path: `attract` carries an
         * explicit mode and both screens no-op when it already matches, so it is idempotent and a
         * double tap cannot invert it — unlike `play`, which restarts the film.
         */
        onAttract = { m ->
            val h = current
            val what = if (m == KioskBus.ATTRACT_MENU) "the six-up reel" else "the film cards"
            if (h == null) {
                Diag.e("attract $m with no kiosk connected")
                films.showSendFailed("attract -> $what")
            } else {
                Diag.i("TAP attract $m -> ${h.origin}/bus")
                films.showSent(what)
                io.execute {
                    val ok = KioskBus.attract(h, m)
                    if (!ok) ui.post { films.showSendFailed("attract -> $what") }
                }
            }
        }

        /**
         * REPEAT-ONE. Same shape as attract above, and idempotent for the same reason: an
         * explicit value, so a double tap against a 2-second-stale view cannot invert it.
         */
        onLoop = { on ->
            val h = current
            val what = if (on) "loop this film" else "stop looping"
            if (h == null) {
                Diag.e("loop $on with no kiosk connected")
                films.showSendFailed(what)
            } else {
                Diag.i("TAP loop $on -> ${h.origin}/bus")
                films.showSent(what)
                io.execute {
                    val ok = KioskBus.loop(h, on)
                    if (!ok) ui.post { films.showSendFailed(what) }
                }
            }
        }

        /**
         * THE TABLET RESCUE BUTTONS. Nothing here reaches the tablet — the command is left on the
         * kiosk and the tablet picks it up on its own poll (see [TabletLink]). So the honest
         * confirmation is "it is on the server", never "the tablet did it", and the ~8s wait is
         * said on screen rather than discovered by pressing the button again.
         */
        onTabletCmd = { cmd ->
            val h = current
            val what = TabletLink.label(cmd, h)
            when {
                h == null -> films.showTabletMsg(
                    "Not connected to a kiosk — the tablet is only reachable through one.", warn = true)
                !h.mode.hasTelemetryPort -> films.showTabletMsg(
                    "${h.mode.label} has no telemetry port — the tablet channel is kiosk-only.",
                    warn = true)
                else -> {
                    Diag.i("TAP tablet '$cmd' -> ${h.host}:${h.telemetryPort}/log")
                    films.showTabletMsg("sending: $what …")
                    io.execute {
                        val ok = when (cmd) {
                            TabletLink.CMD_SETHOST -> TabletLink.setHost(h)
                            TabletLink.CMD_RELOAD -> TabletLink.reload(h)
                            TabletLink.CMD_REDISCOVER -> TabletLink.rediscover(h)
                            else -> TabletLink.send(h, cmd, null)
                        }
                        ui.post {
                            if (ok) films.showTabletMsg(
                                "Left on the kiosk: $what. The tablet polls every ~8s — " +
                                    "give it that long before pressing again.")
                            else films.showTabletMsg(
                                "COULD NOT SEND: $what — ${h.host}:${h.telemetryPort} did not accept it.",
                                warn = true)
                        }
                    }
                }
            }
        }

        /**
         * DROPPED ON THE TV. Fired once per drag gesture, on release — see FilmPanel.DragCallback
         * .clearView. The order is saved locally first so it survives a restart even if the laptop
         * is not reachable at that moment, then published as a `playlist` message
         * (BUS-CONTRACT.md §2.4). It does NOT start playback.
         */
        onReorder = { ordered ->
            val ids = ordered.map { it.id }
            playlist.save(ids)
            val h = current
            if (h == null) {
                Diag.w("reordered with no kiosk connected — saved on the phone only")
                showSendFailed("the new order (not connected)")
            } else {
                showSent("new playlist order")
                io.execute {
                    val ok = KioskBus.playlist(h, ids)
                    if (!ok) ui.post { showSendFailed("the new order") }
                }
            }
        }
    }

    /**
     * ONE play per [PLAY_GATE_MS], and never two at once.
     *
     * Two independent conditions, because they fail differently: `playInFlight` covers a slow
     * relay (the request is out, the button is dead, a second tap must not queue behind it), and
     * the elapsed-time gate covers the fast case (the request came back in 40ms and a thumb
     * bouncing on a booth floor sends the second tap anyway). Both are refused silently apart from
     * a log line — an error toast for "you tapped twice" would be worse than the double tap.
     */
    private fun playGateOpen(what: String): Boolean {
        val now = SystemClock.elapsedRealtime()
        if (playInFlight) {
            Diag.w("ignoring play $what — a play is still in flight")
            return false
        }
        if (now - lastPlayAt < PLAY_GATE_MS) {
            Diag.w("ignoring play $what — ${now - lastPlayAt}ms after the last one " +
                "(gate is ${PLAY_GATE_MS}ms; the TV restarts a film on every play it receives)")
            return false
        }
        lastPlayAt = now
        playInFlight = true
        return true
    }

    private fun refreshFilms() {
        val h = current
        if (mode != Mode.KIOSK || h == null) {
            Diag.w("refreshFilms with no kiosk connected")
            return
        }
        io.execute {
            val list = KioskBus.films(h)
            ui.post {
                if (list == null) {
                    films.setFilmsError(
                        "Could not read the film list from ${h.origin}/films.\n\n" +
                            "The kiosk answered its health check, so the laptop is there — this is " +
                            "the film list specifically. Tap Refresh, or hold ⚙ and check the address."
                    )
                } else {
                    // The server says WHAT exists; the operator's saved drag order says in what
                    // order. A film rendered onto the laptop since the last drag still shows up —
                    // it lands after the ordered ones rather than vanishing. See Playlist.apply.
                    val ordered = playlist.apply(list)
                    films.setFilms(ordered)
                    Diag.i("film list: ${ordered.size} film(s) [${ordered.joinToString(", ") { it.id }}], " +
                        "${ordered.count { !it.isProductTile }} needing the playfilm verb")
                }
                renderBar(barDetail())
            }
        }
        // Nudge the TV to re-announce itself so the strip is right immediately.
        io.execute { KioskBus.ping(h) }
    }


    // ------------------------------------------------------------------ WebView

    private fun buildWebView(): WebView {
        val w = ToolkitWebView(this)
        w.setBackgroundColor(BG)

        w.settings.apply {
            javaScriptEnabled = true

            // BOTH server pages need this. The kiosk page queues leads and telemetry in
            // localStorage before it touches the network; the deck remote keeps its own state
            // there too. Load-bearing, not a nicety.
            domStorageEnabled = true

            // The attract videos and the takeover must play without anyone tapping play.
            mediaPlaybackRequiresUserGesture = false

            /*
             * VIEWPORT — the WebView half of "the presenter screen doesn't fit on one page it
             * seems to be scoped to tablet". Stated exactly, because the page half is being fixed
             * in parallel and the two must not fight:
             *
             *   useWideViewPort = true
             *       HONOUR the page's own <meta name="viewport">. presenter-server.py's
             *       REMOTE_PAGE (line 388) declares
             *           width=device-width,initial-scale=1,viewport-fit=cover
             *       which is correct, so with this true the layout width IS the phone's real
             *       width in CSS px and nothing here narrows or widens it.
             *
             *       The failure mode this setting HAS is worth naming: with `true` and NO meta
             *       tag, WebView falls back to a 980px layout viewport and the page renders as if
             *       on a tablet, shrunk. That is precisely the reported symptom — so if the fix
             *       on the page side ever removes or edits that meta line, this is where it will
             *       show up. It is not the current cause: the tag is there and is right.
             *
             *   loadWithOverviewMode = true
             *       Zoom out to fit the layout width. With width=device-width the layout width
             *       already equals the viewport, so the computed initial scale is 1.0 and this is
             *       a no-op. It is kept only as the safety net for a page whose content overflows:
             *       a slightly zoomed-out page is readable, a horizontally-scrolling stage remote
             *       is not.
             *
             *   setInitialScale — NEVER CALLED, deliberately. It would override the page's own
             *       initial-scale=1 and is the classic way to make a correct page look wrong.
             *
             * The other half of "fit on one page" is HEIGHT, and this app owns that: the /remote
             * page measures itself and shrinks its type until the beats fit. See ModeBar.render —
             * the status row is hidden in PRESENTER mode to give those pixels back.
             *
             * The real numbers the page actually sees are logged after every load — see
             * [measureViewport]. Guessing about this was not acceptable twice.
             */
            useWideViewPort = true
            loadWithOverviewMode = true

            // A phone with the system font cranked up must not reflow a signed-off layout.
            // NOTE: this is 100 = "ignore the system font scale". Daniel's Pixel runs a density
            // override (~384dp wide), which this does NOT override and must not — density is the
            // device's real width and the page is entitled to it.
            textZoom = 100

            builtInZoomControls = false
            displayZoomControls = false
            setSupportZoom(false)

            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(false)

            allowFileAccess = false
            allowContentAccess = false
            setGeolocationEnabled(false)
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }

        // USB-only, and this device HAS adb — turns "the phone is being weird" into a
        // chrome://inspect session instead of a guess.
        WebView.setWebContentsDebuggingEnabled(true)

        w.isVerticalScrollBarEnabled = false
        w.overScrollMode = View.OVER_SCROLL_NEVER
        w.isLongClickable = false
        w.setOnLongClickListener { true }

        w.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: android.webkit.PermissionRequest?) {
                request?.deny()      // neither page needs camera or mic
            }
        }

        w.webViewClient = object : WebViewClient() {

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                if (allowed(url)) return false
                Diag.w("BLOCKED navigation: $url")
                ui.post { Toast.makeText(this@MainActivity, "Blocked — this app stays on the booth laptop", Toast.LENGTH_SHORT).show() }
                return true
            }

            @Suppress("OverridingDeprecatedMember", "DEPRECATION")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                if (allowed(url)) return false
                Diag.w("BLOCKED navigation (legacy): $url")
                return true
            }

            /**
             * Navigation is not the only way off. An <img>, a script, an XHR or an <iframe> aimed
             * anywhere else is refused here too, so this app never opens a socket to anything but
             * the laptop it is connected to.
             */
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val url = request.url.toString()
                if (allowed(url)) return null
                Diag.w("BLOCKED subresource: $url")
                return WebResourceResponse("text/plain", "utf-8", ByteArrayInputStream(ByteArray(0)))
            }

            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                Diag.i("page load START $url")
            }

            override fun onPageFinished(view: WebView, url: String) {
                if (allowed(url) && url != "about:blank") {
                    pageLoaded = true
                    healthMisses = 0
                    Diag.i("page load FINISHED $url")
                    remote.stateLine = "on $url"
                    if (overlay.isShowing && !connecting) overlay.hide()
                    renderBar(barDetail())
                    measureViewport(view)
                }
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (!request.isForMainFrame) return
                pageLoaded = false
                Diag.e("page load FAILED code=${error.errorCode} (${error.description}) url=${request.url}")
                // Never leave Daniel looking at a WebView error page mid-talk.
                view.loadUrl("about:blank")
                // NO SWEEP. A page that failed is a page to retry or an address to fix, and both
                // are one tap away on the panel this puts up.
                pageFailed("${request.url} failed to load (${error.description}).")
            }

            @Suppress("OverridingDeprecatedMember", "DEPRECATION")
            override fun onReceivedError(view: WebView, errorCode: Int, description: String?, failingUrl: String?) {
                pageLoaded = false
                Diag.e("page load FAILED (legacy) code=$errorCode ($description) url=$failingUrl")
                view.loadUrl("about:blank")
                pageFailed("$failingUrl failed to load ($description).")
            }
        }
        return w
    }

    /**
     * WHAT THE PAGE ACTUALLY GOT — measured, not assumed.
     *
     * "The presenter screen doesn't fit on one page it seems to be scoped to tablet" is a claim
     * about numbers, and there was no way to see those numbers from the app. Now there is. After
     * every load this asks the page itself and writes one line into [Diag], so it lands in
     * `adb logcat -s SSPHONE`, in the on-screen panel, and in "Copy diagnostics":
     *
     *   viewport: css=384x744 layout=384 scale=1 dpr=2.75 body=384x1180 webview=1056x2046px meta="…"
     *
     * How to read it, which is the whole reason it prints all of them:
     *   css      window.innerWidth/Height — the CSS pixels the page is laying out into. **If this
     *            says ~980 the page did NOT get a usable viewport meta** and WebView fell back to
     *            its tablet-width default. That is the "scoped to tablet" signature exactly.
     *   layout   documentElement.clientWidth. Should equal the css width.
     *   scale    the zoom WebView settled on. 1 is right; well under 1 means it shrank a wide
     *            layout to fit, which is what "scoped to tablet" looks like to a human.
     *   dpr      devicePixelRatio — his density override, as a number.
     *   body     scrollWidth/scrollHeight. scrollHeight >> css height means the page is TALLER
     *            than the screen: a HEIGHT problem, not a width one, and a different fix.
     *   webview  this View's own size in device px, so page-side and app-side can be compared
     *            without either agent guessing which half is wrong.
     *   meta     the page's viewport tag, verbatim.
     */
    private fun measureViewport(view: WebView) {
        val js = """(function(){
            var m=document.querySelector('meta[name=viewport]');
            var b=document.body||document.documentElement;
            return [window.innerWidth,window.innerHeight,
                    document.documentElement.clientWidth,
                    (window.visualViewport?window.visualViewport.scale:1),
                    window.devicePixelRatio,
                    b.scrollWidth,b.scrollHeight,
                    (m?m.getAttribute('content'):'NO META VIEWPORT TAG')].join('|');
        })();"""
        try {
            view.evaluateJavascript(js) { raw ->
                val parts = raw.trim().trim('"').replace("\\\"", "\"").split("|")
                if (parts.size < 8) {
                    Diag.w("viewport probe returned something unexpected: $raw")
                    return@evaluateJavascript
                }
                Diag.i(
                    "viewport: css=${parts[0]}x${parts[1]} layout=${parts[2]} scale=${parts[3]} " +
                        "dpr=${parts[4]} body=${parts[5]}x${parts[6]} " +
                        "webview=${view.width}x${view.height}px meta=\"${parts[7]}\""
                )
                val cssW = parts[0].toIntOrNull() ?: 0
                val cssH = parts[1].toIntOrNull() ?: 0
                val bodyH = parts[6].toIntOrNull() ?: 0
                if (cssW >= 900) {
                    Diag.e(
                        "VIEWPORT IS TABLET-WIDE ($cssW css px). The page did not supply a usable " +
                            "<meta name=viewport>, so WebView used its ~980px default and shrank " +
                            "everything to fit. PAGE-side fix. meta was: \"${parts[7]}\""
                    )
                } else if (cssH > 0 && bodyH > cssH + 24) {
                    Diag.w(
                        "page is TALLER than the window ($bodyH > $cssH css px) — it will scroll. " +
                            "Width is fine at $cssW px, so this is a height/layout matter, not a " +
                            "viewport one."
                    )
                }
            }
        } catch (t: Throwable) {
            Diag.w("viewport probe failed: ${t.javaClass.simpleName}: ${t.message}")
        }
    }

    /**
     * The only origins that exist for this app: the connected server's port, plus — IN KIOSK MODE
     * ONLY — the telemetry port one above it (serve.py:477, where /log and /lead live so they can
     * never queue behind the films). presenter-server.py has one listener, so in PRESENTER mode
     * that second origin is not opened up at all.
     */
    private fun allowed(url: String): Boolean {
        if (url == "about:blank") return true
        val h = current ?: return false
        val u = try { Uri.parse(url) } catch (_: Throwable) { return false }
        if (!"http".equals(u.scheme, ignoreCase = true)) return false
        if (!h.host.equals(u.host, ignoreCase = true)) return false
        val port = if (u.port == -1) 80 else u.port
        return port == h.port || (h.mode.hasTelemetryPort && port == h.telemetryPort)
    }

    // ------------------------------------------------------------------ connecting

    /** Find this mode's server (saved host first, then a sweep) and open its surface. */
    private fun startConnect(force: Boolean) {
        if (connecting) return
        connecting = true
        cancelScan.set(false)
        remote.stateLine = "searching"
        overlay.setMode(mode)
        // DO NOT BLANK A WORKING SURFACE TO ANNOUNCE A RE-CHECK. If the search fails,
        // showFailurePanel puts the overlay up with everything on it; if it succeeds on the same
        // host, nothing on screen ever moved — which matters most when the deck remote is in his
        // hand mid-talk. The status row in the bar still says "searching…".
        val surfaceIsUp = if (mode == Mode.KIOSK) current != null else pageLoaded
        if (surfaceIsUp && !overlay.isShowing) {
            Diag.i("re-checking in the background — the ${mode.label} surface is up, so it stays on screen")
        } else {
            overlay.showBusy(
                (if (force) "Reconnecting to " else "Looking for ") +
                    "${mode.serverName} for ${mode.label} mode…"
            )
        }
        renderBar("searching…")

        val saved = store.saved(mode)
        val forMode = mode
        io.execute {
            val found = Discovery.locate(forMode, saved, cancelScan) { msg -> ui.post { overlay.setStatus(msg) } }
            ui.post {
                // A mode switch may have happened while the sweep ran; that result is stale.
                if (forMode != mode) {
                    Diag.i("discarding ${forMode.label} discovery result — mode is now ${mode.label}")
                    return@post
                }
                connecting = false
                if (found != null) {
                    store.save(found)
                    if (sameEndpoint(found, current) && pageLoaded && web.visibility == View.VISIBLE) {
                        // Re-discovery landed on the very server the deck remote is already open
                        // on. Reloading it here would be a visible stumble mid-talk for no gain —
                        // a reload is justified only when the host changed or the page is dead.
                        Diag.i("discovery returned the same host $found and the page is already " +
                            "loaded — leaving it alone (no reload)")
                        remote.stateLine = "on page (unchanged after re-check)"
                        overlay.hide()
                        renderBar(barDetail())
                    } else {
                        connectTo(found)
                    }
                } else {
                    remote.stateLine = "nothing found"
                    showFailurePanel(saved)
                    renderBar("not found")
                }
            }
        }
    }

    /** We have a server. Wire up whatever this mode needs and show its surface. */
    private fun connectTo(host: ServerHost) {
        current = host
        healthMisses = 0

        // The volume rocker pages the deck — and ONLY in presenter mode. Remote.arm() clears
        // itself for anything else, so a volume press at the booth cannot advance a slide.
        Remote.arm(if (mode == Mode.PRESENTER) host else null)

        // The log-shipping / command-pull channel exists only where there is a sink for it.
        if (mode.hasTelemetryPort) remote.start() else {
            remote.stop()
            Diag.i("${mode.label} mode: ${mode.serverName} has no /log or /events, so nothing is " +
                "shipped. Use: adb logcat -s ${Diag.TAG}")
        }

        if (mode == Mode.KIOSK) {
            // The ungated operator surface. No page load at all — this is native.
            Diag.i("connected to kiosk $host — showing the ungated film list")
            overlay.hide()
            showKioskFilmList(true)
            refreshFilms()
            renderBar(barDetail())
        } else {
            loadPage(host)
        }
    }

    private fun loadPage(host: ServerHost) {
        val url = host.pageUrl(store.path(mode))
        pageLoaded = false
        remote.stateLine = "loading $url"
        Diag.i("loading $url" + if (host.mode.hasTelemetryPort) " (telemetry on ${host.telemetryPort})" else "")
        overlay.showBusy("Opening $url")
        showKioskFilmList(false)
        web.loadUrl(url)
        renderBar("opening…")
        // Do not hang on a page that connected but never finished. Say so; do not go hunting.
        ui.postDelayed({
            if (!pageLoaded && !connecting && current == host && web.visibility == View.VISIBLE) {
                Diag.e("$url did not finish loading within 20s")
                pageFailed("$url answered but did not finish loading within 20 seconds.")
            }
        }, 20_000)
    }

    /**
     * A PAGE FAILED, AND THAT IS NOT A REASON TO SEARCH THE NETWORK.
     *
     * Every one of these paths used to call startConnect(force = true), which walks 46 ports on the
     * saved host and then sweeps 254 addresses on every interface. On a stage that is the phone
     * going away for a minute at the exact moment the deck stopped answering. Now it puts up the
     * panel that already carries the address, a Connect button, a Reload button and — separately
     * and deliberately — Search this network again.
     */
    private fun pageFailed(what: String) {
        val h = current
        pageLoaded = false
        overlay.setMode(mode)
        overlay.showFailure(
            "The ${mode.label} page did not load",
            what + "\n\nNothing has been searched for. Tap Connect to try " +
                (h?.toString() ?: "the address") + " again, or Search this network if the laptop " +
                "has moved.",
            h?.toString()
        )
        renderBar("page did not load")
    }

    private fun reloadCurrentSurface() {
        val h = current
        if (h == null) { startConnect(force = true); return }
        if (mode == Mode.KIOSK) refreshFilms() else loadPage(h)
    }

    private fun barDetail(): String = when {
        mode == Mode.KIOSK -> "operator console · no gate"
        Remote.isArmed -> "deck remote · volume keys page"
        else -> store.path(mode)
    }

    /**
     * NOTHING ANSWERED. Say so loudly, with the numbers, and put the manual field on screen.
     * The tablet failed on real hardware precisely because there was no fast way past a broken
     * discovery — so this panel always ends in a place where typing an address works.
     */
    private fun showFailurePanel(saved: ServerHost?) {
        val r = Discovery.lastReport
        val msg = when {
            Discovery.allLocalIPv4().isEmpty() ->
                "This phone has no network address at all. Join the Wi-Fi, or turn the hotspot on, " +
                    "then tap Search again."
            r != null && r.aliveHosts.isEmpty() ->
                "Nothing on this network answered — not even a refusal. Either the phone and the " +
                    "laptop are on different networks, or the access point stops devices seeing " +
                    "each other. Compare the addresses below, then type the laptop's in by hand."
            else ->
                "Devices answered, but none of them is running ${mode.serverName}. Check it is " +
                    "started on the laptop, then type its address below."
        }
        overlay.setMode(mode)
        overlay.showFailure("Cannot find the ${mode.label} server", msg, saved?.toString())
    }

    /**
     * Operator typed an address. It is PROBED, and it is remembered ONLY if it answered.
     *
     * Tapping Connect a second time on the same string used to `store.save(parsed)` with nothing
     * but the operator's insistence behind it — the only place in this app that ever wrote an
     * unverified host. Because HostStore.parse also accepts a bare hostname, typing a machine name
     * and tapping twice saved a name Android cannot resolve, re-probed and port-walked at every
     * launch of that mode. Forcing is still one tap away: the separate, labelled "Open it anyway"
     * button, which does not write to the store.
     */
    private fun connectManually(text: String) {
        val parsed = HostStore.parse(mode, text)
        if (parsed == null) {
            Diag.w("manual entry '$text' is not an address")
            overlay.setStatus("That is not an address. Try 192.168.0.13:${mode.seedPorts.first()}")
            return
        }
        cancelScan.set(true)
        Diag.i("manual entry (${mode.label}): trying $parsed")
        overlay.showBusy("Checking $parsed…")
        val forMode = mode
        io.execute {
            // Say the unresolvable-name case FAST and in plain words, rather than making the
            // operator watch a probe time out on a name that can never work.
            if (!Discovery.resolves(parsed.host)) {
                ui.post {
                    if (forMode != mode) return@post
                    overlay.showFailure(
                        "'${parsed.host}' is a name, not an address",
                        "This phone cannot look up computer names on this network — Android has " +
                            "no NetBIOS and no mDNS for a Windows machine name. Type the laptop's " +
                            "IP address instead, e.g. 192.168.0.13:${mode.seedPorts.first()}.",
                        parsed.toString()
                    )
                }
                return@execute
            }
            val hit = Discovery.probe(forMode, parsed.host, parsed.port)
            ui.post {
                if (forMode != mode) return@post
                if (hit != null) {
                    store.save(hit)                  // verified, so it is worth remembering
                    connectTo(hit)
                } else {
                    overlay.showFailure(
                        "Nothing answered at $parsed",
                        "Check the address, or open it anyway with the button below. An address " +
                            "that has not answered is never remembered — it is used for this " +
                            "session only.",
                        parsed.toString()
                    )
                    overlay.offerForce(parsed.toString())
                }
            }
        }
    }

    /**
     * FORCE. The operator insists on an address the probe could not verify.
     *
     * Deliberate, separately labelled, and DELIBERATELY NOT SAVED — if it turns out to work, the
     * watchdog's next successful probe remembers it (see [rememberIfVerified]); if it does not,
     * nothing is left behind to slow down the next launch of this mode.
     */
    private fun forceHost(text: String) {
        val parsed = HostStore.parse(mode, text)
        if (parsed == null) {
            overlay.setStatus("That is not an address. Try 192.168.0.13:${mode.seedPorts.first()}")
            return
        }
        cancelScan.set(true)
        Diag.w("FORCED (${mode.label}): opening $parsed although nothing answered it. Not saved — " +
            "it will be remembered only if it starts answering.")
        connectTo(parsed)
    }

    /** Same mode, same machine, same port. `ServerHost` also carries reportedIp, which must not count. */
    private fun sameEndpoint(a: ServerHost?, b: ServerHost?): Boolean =
        a != null && b != null && a.mode == b.mode &&
            a.host.equals(b.host, ignoreCase = true) && a.port == b.port

    /**
     * A host that has just answered its mode's probe is verified by definition, so if it is not
     * the saved one, save it now. This is what turns a successful FORCE into a remembered address
     * without ever writing an unverified one.
     */
    private fun rememberIfVerified(h: ServerHost) {
        if (sameEndpoint(store.saved(h.mode), h)) return
        store.save(h)
        Diag.i("remembering $h for ${h.mode.label} mode — it answered a probe")
    }

    private fun openPanel() {
        overlay.setMode(mode)
        overlay.showOperator(operatorStatus(), current?.toString())
    }

    private fun canDismissPanel(): Boolean =
        pageLoaded || (mode == Mode.KIOSK && current != null)

    private fun operatorStatus(): String {
        val h = current ?: return "Not connected to ${mode.serverName}."
        return "Connected to ${h.origin}" +
            (if (mode == Mode.KIOSK) " — driving the TV directly" else store.path(mode)) +
            (h.reportedIp?.let { if (it != h.host) "\nLaptop reports its own IP as $it" else "" } ?: "")
    }

    // ------------------------------------------------------------ volume keys

    /**
     * Volume rocker pages the deck. Carried over from PhonePresenter (MainActivity.kt:65-80) — it
     * is the one thing the app can do that the web page cannot.
     *
     * [Remote.isArmed] is false in KIOSK mode, so at the booth the rocker is a volume rocker
     * again. That guard is the reason this is safe to leave switched on.
     *
     * NOT CARRIED OVER: PhonePresenter's VolumeRemoteService, which kept the rocker working with
     * the screen off via a MediaSession. Its own source says "NOT YET TESTED ON DEVICE", it needs
     * a foreground-service notification and the androidx.media dependency, and the stage case is
     * phone-in-hand-screen-on, which this covers. Listed as a gap rather than shipped untested.
     */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (Remote.isArmed) {
            when (keyCode) {
                KeyEvent.KEYCODE_VOLUME_UP -> { Remote.send("next"); return true }
                KeyEvent.KEYCODE_VOLUME_DOWN -> { Remote.send("prev"); return true }
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    /** Swallow the key-up too, or the system beeps and shows the volume panel. */
    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        if (Remote.isArmed &&
            (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN)) return true
        return super.onKeyUp(keyCode, event)
    }

    // ------------------------------------------------------ wake / watchdog

    /**
     * A phone sleeps constantly. It must come back to a working surface, not an error. The
     * current surface is left alone while the server still answers; when it stops answering twice
     * running we re-probe and, if the laptop moved, sweep again.
     */
    /**
     * ONE health check, used by the watchdog AND by onResume, so the two cannot drift apart.
     *
     *   - answered, surface fine       -> DO NOTHING AT ALL. In PRESENTER mode that is a deck
     *                                     remote mid-talk; reloading it is a visible stumble.
     *   - answered, page dead          -> reload it; that is a genuinely dead page.
     *   - no answer, first miss        -> say so and wait. One dropped packet on a venue hotspot
     *                                     is not a reason to blank the screen.
     *   - no answer, second in a row   -> the server really has gone; re-discover.
     */
    private fun healthCheck(reason: String) {
        val h = current ?: return
        if (connecting) return
        val forMode = mode
        io.execute {
            val ok = Discovery.probe(forMode, h.host, h.port, 1200, 1800) != null
            ui.post {
                if (forMode != mode || !sameEndpoint(h, current)) return@post
                if (ok) {
                    healthMisses = 0
                    rememberIfVerified(h)
                    if (web.visibility == View.VISIBLE && !pageLoaded && !connecting) {
                        Diag.i("$reason: $h is answering but the page is not loaded — loading it")
                        loadPage(h)
                    }
                } else if (++healthMisses >= 2) {
                    /*
                     * THE SERVER STOPPED ANSWERING. SAY SO; DO NOT GO LOOKING.
                     *
                     * This used to re-discover, i.e. sweep. The watchdog re-probes THIS SAME
                     * ADDRESS every 15 seconds anyway, so a laptop that comes back — a Wi-Fi blip,
                     * a presenter restarted between talks — reconnects on its own with no sweep and
                     * no tap. A laptop that has genuinely MOVED needs a human to say where to, and
                     * ⚙ is where they say it.
                     */
                    Diag.w("$reason: $h has missed $healthMisses health checks. Still watching THIS " +
                        "address every ${WATCHDOG_MS / 1000}s — no sweep. Use ⚙ if the laptop moved.")
                    renderBar("${h.origin} not answering — ⚙ to fix")
                    return@post
                } else {
                    Diag.w("$reason: $h missed a health check ($healthMisses/2) — leaving the " +
                        "surface alone until it misses again")
                }
                renderBar(barDetail())
            }
        }
    }

    private val watchdog = object : Runnable {
        override fun run() {
            val h = current
            if (h != null && !connecting) {
                healthCheck("WATCHDOG")
            }
            /*
             * THE LOOP THAT COST HIM THE REHEARSAL WINDOW IS GONE.
             *
             * There used to be an `else if (h == null && !connecting && !overlay.isShowing)
             * startConnect(force = true)` here: with nothing connected, the app started a fresh
             * 254-address sweep every 15 seconds, for as long as it was open, on a network where
             * the laptop was not even in the swept /24. Not connected is now simply not connected —
             * the picker or the ⚙ panel is on screen saying so, and it waits for a person.
             */
            ui.postDelayed(this, WATCHDOG_MS)
        }
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        web.resumeTimers()
        if (mode == Mode.KIOSK && current != null) {
            films.startPolling(io) { current }
            refreshFilms()
        }

        // Straight after a wake, do not wait a whole watchdog cycle — but run the SAME check the
        // watchdog runs. This used to be its own one-miss-and-reconnect rule, so every screen-off
        // and every app switch could reload the surface out from under whatever was on it.
        healthCheck("WAKE")
        ui.removeCallbacks(watchdog)
        ui.postDelayed(watchdog, WATCHDOG_MS)
    }

    override fun onPause() {
        super.onPause()
        ui.removeCallbacks(watchdog)
        films.stopPolling()
        // Timers keep running: the page's own SSE reconnect is worth more than the battery here.
        web.onPause()
    }

    override fun onDestroy() {
        ui.removeCallbacksAndMessages(null)
        cancelScan.set(true)
        films.stopPolling()
        remote.stop()
        Remote.arm(null)
        DebugBridge.unregister(this)
        io.shutdownNow()
        web.destroy()
        super.onDestroy()
    }

    /**
     * Back never exits the app by accident mid-talk. It closes whatever is on top, then walks the
     * deck remote's own history. At the root it does nothing.
     */
    @Suppress("OverridingDeprecatedMember", "DEPRECATION")
    override fun onBackPressed() {
        when {
            // The picker is a question, not a page. Back does not dismiss it — a mode has to be
            // chosen, or the app has nothing to be.
            picker.isShowing -> { /* swallowed on purpose */ }
            switcher.isShowing -> switcher.hide()
            overlay.isShowing && canDismissPanel() -> overlay.hide()
            web.visibility == View.VISIBLE && web.canGoBack() -> web.goBack()
            else -> { /* swallowed on purpose */ }
        }
    }

    private fun matchParent() = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
    )

    companion object {
        private const val WATCHDOG_MS = 15_000L

        /**
         * How long the play/playfilm click path stays shut after a play. Long enough to swallow a
         * double-tap and a bounced thumb, short enough that cutting deliberately from one film to
         * the next in a live demo never feels blocked.
         */
        private const val PLAY_GATE_MS = 1_200L

        private val BG = Color.parseColor("#0B0B0F")
    }
}
