package com.streamstage.boothtablet

import android.app.Activity
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.MotionEvent
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
import android.widget.Toast
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import java.io.ByteArrayInputStream
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * STREAMSTAGE BOOTH TABLET — the frame around the kiosk page.
 *
 * The booth already works: laptop runs expo-assets/kiosk/serve.py, the tablet opens
 * http://<laptop-ip>:<port>/tablet in a browser. This app is a PACKAGING upgrade of exactly
 * that, and deliberately adds no UI of its own. What it buys over the browser:
 *
 *   1. nobody types an IP        -> Discovery sweeps our own /24 for a host answering /health
 *   2. it survives sleep/wake    -> a health watchdog re-probes and re-finds, then reloads
 *   3. a visitor cannot wander   -> off-origin navigation AND off-origin subresources are refused
 *   4. IT CAN BE DIAGNOSED AND DRIVEN WITHOUT TOUCHING IT — the target is a Fire tablet with no
 *      adb, so failures are LOUD ON SCREEN (SetupOverlay), the log SHIPS TO THE KIOSK SERVER and
 *      commands are PULLED BACK FROM IT (RemoteControl). See those two files.
 *
 * NO SCREEN PINNING. It was removed on Daniel's instruction ("i dont want screen pinned on
 * tablet"). There is deliberately no lock-task code, no toggle and no Unpin button anywhere in
 * this app — startLockTask() is never called from launch, retry, watchdog or reconnect, and
 * there is nothing left for a future edit to switch back on. Immersive mode plus the origin
 * allowlist are what keep a visitor on the kiosk page now.
 *
 * Shell shape (WebView + host in SharedPreferences) is lifted from ~/projects/PhonePresenter;
 * the gradle/toolchain/manifest shape is lifted from ../kiosk-app.
 *
 * It talks to ONE laptop over the LAN and to nothing else. No analytics, no crash reporter,
 * no remote config, no Supabase — DanTV's remote channel goes over the internet and the booth
 * has none.
 */
class MainActivity : Activity() {

    private lateinit var root: FrameLayout
    private lateinit var web: WebView
    private lateinit var overlay: SetupOverlay
    private lateinit var store: HostStore
    private lateinit var remote: RemoteControl

    private val ui = Handler(Looper.getMainLooper())
    private val io = Executors.newCachedThreadPool()
    private val cancelScan = AtomicBoolean(false)

    /** The server the WebView is currently pointed at. Null until something answers /health. */
    @Volatile private var current: KioskHost? = null
    @Volatile private var connecting = false

    private var pageLoaded = false

    /**
     * Consecutive failed health probes, SHARED by the watchdog and onResume.
     *
     * It has to be shared, and it has to be two. A single missed probe on a venue hotspot used to
     * be enough — at onResume only — to force a full reconnect, which means a full-screen
     * "Reconnecting…" overlay and a web.loadUrl() over whatever a visitor was in the middle of
     * typing. Every power-button press and every app switch went through that path. One miss is
     * noise; two consecutive misses is a laptop that has actually gone.
     */
    private var healthMisses = 0

    /** Held for the life of the activity so sleep cannot park the wifi chip. See onCreate. */
    private var wifiLock: android.net.wifi.WifiManager.WifiLock? = null

    /**
     * When the screen last came back on. Measured at the booth 2026-08-11: the tablet was
     * abandoning a perfectly good kiosk every time it slept.
     *
     * The old sequence: onResume probes IMMEDIATELY, wifi has not reassociated yet, so that is
     * miss 1; the watchdog fires 15s later into the same dead radio, that is miss 2, and two
     * misses means "the laptop has gone" -> startConnect(force=true) -> the whole 46-port walk
     * and a 254-address sweep behind a full-screen overlay. The server never moved. The tablet
     * simply asked during the seconds when it had no network.
     *
     * So: a failed probe only counts as a miss when this tablet actually HAS a network and is
     * past the wake grace window. No network is not evidence about the laptop.
     */
    private var resumedAt = 0L

    /**
     * WebView fires onPageFinished for a main-frame URL even after onReceivedError has already
     * failed it, so without this the app marks a connection-refused error page as "loaded",
     * stops watchdogging it, and can hide the overlay over a dead page. Observed live:
     * ERR_CONNECTION_REFUSED on a hand-typed host was immediately followed by page load FINISHED
     * for the same URL.
     */
    @Volatile private var failedUrl: String? = null

    // corner-tap escape hatch
    private var cornerTaps = 0
    private var cornerFirstTapAt = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = HostStore(this)
        Diag.init(this)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // HOLD THE RADIO UP. FLAG_KEEP_SCREEN_ON only covers the foreground; the moment the
        // tablet is slept by the power button, Fire OS parks the wifi chip and the association
        // is gone. Waking then costs several seconds of no network — during which the health
        // checks below used to conclude the laptop had vanished. A full high-perf wifi lock
        // keeps the association through sleep, so most wakes have a live network immediately.
        // The tablet is on a charger at the booth; battery is not the constraint.
        try {
            val wm = applicationContext.getSystemService(WIFI_SERVICE) as? android.net.wifi.WifiManager
            wifiLock = wm?.createWifiLock(android.net.wifi.WifiManager.WIFI_MODE_FULL_HIGH_PERF,
                                          "boothtablet:wifi")?.apply {
                setReferenceCounted(false)
                acquire()
            }
        } catch (e: Exception) {
            Diag.w("could not hold a wifi lock: ${e.javaClass.simpleName}")
        }

        root = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#0B0B0F")) }
        web = buildWebView()
        overlay = SetupOverlay(this).apply {
            onConnect = { text -> connectManually(text) }
            onForce = { text -> forceHost(text) }
            onRescan = { startConnect(force = true) }
            onReload = { current?.let { loadKiosk(it) } }
            onDismiss = { if (pageLoaded) hide() }
        }

        root.addView(web, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        root.addView(overlay, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(root)

        // The control plane. Both halves ride serve.py's existing /log and /events on the
        // TELEMETRY port, so nothing in serve.py changed and the page port's connection budget
        // is left entirely to the WebView.
        remote = RemoteControl(hostProvider = { current }, onCommand = { c, a -> ui.post { command(c, a) } })
        remote.start()

        // Free bonus for the Pixel/emulator loop. No-op in a release build.
        DebugBridge.register(this) { c, a -> ui.post { command(c, a) } }

        startConnect(force = false)
    }

    // ------------------------------------------------------------- commands

    /**
     * ONE command vocabulary, three ways in: the kiosk server's pull channel (the only one that
     * works on the Fire tablet), an adb broadcast (debug builds, for the bench), and the
     * operator panel's buttons.
     */
    private fun command(cmd: String, arg: String?) {
        Diag.i("EXEC command '$cmd' arg=${arg ?: "-"}")
        when (cmd.lowercase()) {
            "status" -> {
                val s = statusText()
                Diag.i("STATUS\n$s")
                io.execute { remote.shipReport("STATUS requested\n$s") }
            }
            "sethost" -> {
                val parsed = arg?.let { HostStore.parse(it) }
                if (parsed == null) {
                    Diag.e("sethost: '$arg' is not an address")
                } else {
                    Diag.i("sethost -> $parsed")
                    store.save(parsed)
                    loadKiosk(parsed)
                }
            }
            "rediscover" -> startConnect(force = true)
            "reload" -> current?.let { loadKiosk(it) } ?: startConnect(force = true)
            "clearhost" -> {
                store.clear()
                current = null
                Diag.i("clearhost: saved host forgotten")
                startConnect(force = true)
            }
            "diag" -> io.execute { remote.shipReport("DIAG requested\n${statusText()}") }
            else -> Diag.w("unknown command '$cmd'. Known: ${DebugBridge.COMMANDS}")
        }
    }

    private fun statusText(): String = buildString {
        appendLine("host        : ${current ?: "none"}")
        appendLine("pageLoaded  : $pageLoaded")
        appendLine("connecting  : $connecting")
        appendLine("savedHost   : ${store.saved() ?: "none"}")
        appendLine("path        : ${store.path}")
        appendLine("localIp     : ${Discovery.allLocalIPv4().joinToString(", ").ifBlank { "NONE" }}")
        appendLine("lastSubnet  : ${Discovery.lastSubnet ?: "none"}")
        appendLine("lastError   : ${Diag.lastError}")
        val r = Discovery.lastReport
        if (r != null) {
            appendLine("lastSweep   : ${r.addressesTried} addresses, alive=${r.aliveHosts.joinToString(",")}, found=${r.found ?: "none"}")
        }
        append("overlay     : ${if (overlay.isShowing) "showing" else "hidden"}")
    }

    // --------------------------------------------------------------- WebView

    private fun buildWebView(): WebView {
        val w = KioskWebView(this)
        w.setBackgroundColor(Color.parseColor("#0B0B0F"))

        w.settings.apply {
            javaScriptEnabled = true

            // The kiosk page queues leads and telemetry in localStorage BEFORE it tries the
            // network (tablet.html:615) — without DOM storage a lead typed on the floor is
            // simply lost. Load-bearing.
            domStorageEnabled = true

            // The attract videos and the takeover play without anyone tapping play.
            mediaPlaybackRequiresUserGesture = false

            // Honour the page's own <meta name="viewport" content="width=device-width…">
            // (tablet.html:5) so the layout is identical to the browser it was verified in,
            // in BOTH orientations.
            useWideViewPort = true
            loadWithOverviewMode = true

            // A tablet with the system font cranked up must not reflow a layout that was
            // signed off at 820x1180. The page is the design; leave it at 100%.
            textZoom = 100

            builtInZoomControls = false
            displayZoomControls = false
            setSupportZoom(false)

            // window.open('tv.html') and the staff lead form (tablet.html:1268/1271) are both
            // same-origin, and every off-origin URL is refused below, so this is safe.
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(false)

            // Nothing on the kiosk page reads the filesystem or a content provider.
            allowFileAccess = false
            allowContentAccess = false
            setGeolocationEnabled(false)
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }

        // USB-only. Costs nothing on the floor and turns "the tablet is being weird" into a
        // chrome://inspect session instead of a guess — on a device that HAS adb.
        WebView.setWebContentsDebuggingEnabled(true)

        w.isVerticalScrollBarEnabled = false
        w.isHorizontalScrollBarEnabled = false
        w.overScrollMode = View.OVER_SCROLL_NEVER

        // No text-selection handles, no "copy/paste/web search" bar in front of a visitor.
        w.isLongClickable = false
        w.setOnLongClickListener { true }

        // The operator's way back in. Returns false, so the page still receives the taps and
        // no part of the kiosk UI is dead under this corner.
        w.setOnTouchListener { _, ev ->
            if (ev.actionMasked == MotionEvent.ACTION_DOWN) {
                val edge = 96 * resources.displayMetrics.density
                if (ev.x < edge && ev.y < edge) cornerTap()
            }
            false
        }

        w.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: android.webkit.PermissionRequest?) {
                request?.deny()      // camera/mic are not part of this page
            }
        }

        w.webViewClient = object : WebViewClient() {

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                if (allowed(url)) return false
                Diag.w("BLOCKED navigation: $url")
                ui.post { Toast.makeText(this@MainActivity, "Blocked — this tablet stays on the booth kiosk", Toast.LENGTH_SHORT).show() }
                return true
            }

            @Suppress("OverridingDeprecatedMember", "DEPRECATION")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                if (allowed(url)) return false
                Diag.w("BLOCKED navigation (legacy): $url")
                return true
            }

            /**
             * Navigation is not the only way off the booth. An <img>, a script, an XHR or an
             * <iframe> pointed anywhere else is refused here too, so nothing on this tablet
             * ever opens a socket to something that is not the booth laptop.
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
                if (url == failedUrl) {
                    Diag.w("ignoring page load FINISHED for $url — it already failed")
                    return
                }
                if (allowed(url) && url != "about:blank") {
                    pageLoaded = true
                    healthMisses = 0
                    Diag.i("page load FINISHED $url")
                    remote.stateLine = "on kiosk page $url"
                    if (overlay.isShowing && !connecting) overlay.hide()
                }
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (!request.isForMainFrame) return
                pageLoaded = false
                failedUrl = request.url.toString()
                Diag.e("page load FAILED code=${error.errorCode} (${error.description}) url=${request.url}")
                // Never leave a visitor looking at a WebView error page.
                view.loadUrl("about:blank")
                startConnect(force = true)
            }

            @Suppress("OverridingDeprecatedMember", "DEPRECATION")
            override fun onReceivedError(view: WebView, errorCode: Int, description: String?, failingUrl: String?) {
                pageLoaded = false
                failedUrl = failingUrl
                Diag.e("page load FAILED (legacy) code=$errorCode ($description) url=$failingUrl")
                view.loadUrl("about:blank")
                startConnect(force = true)
            }
        }
        return w
    }

    /**
     * The only two origins that exist for this app: the kiosk port and the telemetry port one
     * above it (serve.py:477 — /log and /lead live there so they can never queue behind the
     * films). Everything else, including https and every other host on the venue Wi-Fi, is off.
     */
    private fun allowed(url: String): Boolean {
        if (url == "about:blank") return true
        val h = current ?: return false
        val u = try { Uri.parse(url) } catch (_: Throwable) { return false }
        if (!"http".equals(u.scheme, ignoreCase = true)) return false
        if (!h.host.equals(u.host, ignoreCase = true)) return false
        val port = if (u.port == -1) 80 else u.port
        return port == h.port || port == h.telemetryPort
    }

    // ------------------------------------------------------------ connecting

    /** Find a server (saved host first, then a sweep) and load the kiosk page on it. */
    private fun startConnect(force: Boolean) {
        if (connecting) return
        connecting = true
        cancelScan.set(false)
        remote.stateLine = "searching"
        // DO NOT BLANK A WORKING PAGE TO ANNOUNCE A RE-CHECK. If the search fails,
        // showFailurePanel puts the overlay up with everything on it; if it succeeds on the same
        // host, the visitor half-way through the lead form never knew anything happened. The
        // overlay is for when there is nothing else to look at, not for covering a live form.
        if (pageLoaded && failedUrl == null && !overlay.isShowing) {
            Diag.i("re-checking in the background — the kiosk page is up, so it stays on screen")
        } else {
            overlay.showBusy(if (force) "Reconnecting to the booth laptop…" else "Looking for the booth laptop…")
        }

        val saved = store.saved()
        io.execute {
            val found = Discovery.locate(saved, cancelScan) { msg -> ui.post { overlay.setStatus(msg) } }
            ui.post {
                connecting = false
                if (found != null) {
                    store.save(found)
                    if (sameEndpoint(found, current) && pageLoaded && failedUrl == null) {
                        // THE PAGE IS FINE. Re-discovery landed on the very host it was already
                        // on, and that page is loaded — a visitor may be half-way through the
                        // gate with their studio name and email typed in. Reloading here would
                        // throw that away and show them a system overlay, and reloading is what
                        // this app used to do. A reload is justified only when the host actually
                        // changed or the page is genuinely dead.
                        Diag.i("discovery returned the same host $found and the page is already " +
                            "loaded — leaving it alone (no reload)")
                        remote.stateLine = "on kiosk page (unchanged after re-check)"
                        overlay.hide()
                    } else {
                        loadKiosk(found)
                    }
                } else {
                    remote.stateLine = "no kiosk found"
                    showFailurePanel(saved)
                }
            }
        }
    }

    /**
     * NOTHING ANSWERED. Say so loudly, with the numbers, and put the manual field on screen.
     * A booth tablet that sits blank is a booth tablet nobody can fix.
     */
    private fun showFailurePanel(saved: KioskHost?) {
        val r = Discovery.lastReport
        val msg = when {
            Discovery.allLocalIPv4().isEmpty() ->
                "This tablet is not on a network at all. Connect it to the booth Wi-Fi first."
            r != null && r.aliveHosts.isEmpty() ->
                "Nothing on this Wi-Fi answered — not even a refusal. Either the tablet is on a " +
                    "different network from the laptop, or the access point blocks devices from " +
                    "seeing each other (client isolation). Compare the two addresses below."
            else ->
                "Devices answered, but none of them is running the kiosk. Check serve.py is " +
                    "running on the laptop, then type its address below."
        }
        overlay.showFailure("Cannot find the booth kiosk", msg, saved?.toString())
    }

    /**
     * Operator typed an address. It is PROBED, and it is remembered ONLY if it answered.
     *
     * Tapping Connect a second time on the same string used to `store.save(parsed)` with no
     * successful /health behind it — the only place in this app that ever wrote an unverified
     * host. Because HostStore.parse also accepts a bare hostname, typing `DART` and tapping twice
     * saved `DART:8080` permanently: a name Android cannot resolve, re-probed and port-walked at
     * every single launch. Forcing an address is still possible and is still one tap away — it is
     * the separate, labelled "Open it anyway" button, and it does not write to the store.
     */
    private fun connectManually(text: String) {
        val parsed = HostStore.parse(text)
        if (parsed == null) {
            Diag.w("manual entry '$text' is not an address")
            overlay.setStatus("That is not an address. Try 192.168.0.13:8081")
            return
        }
        cancelScan.set(true)
        Diag.i("manual entry: trying $parsed")
        overlay.showBusy("Checking $parsed…")
        io.execute {
            // Say the unresolvable-name case FAST and in plain words, rather than making the
            // operator watch a probe time out on a name that can never work.
            if (!Discovery.resolves(parsed.host)) {
                ui.post {
                    overlay.showFailure(
                        "'${parsed.host}' is a name, not an address",
                        "This tablet cannot look up computer names on this Wi-Fi — Android has no " +
                            "NetBIOS and no mDNS for a Windows machine name. Type the laptop's IP " +
                            "address instead, e.g. 192.168.0.13:8081. Its own screen shows it in " +
                            "the kiosk window title.",
                        parsed.toString()
                    )
                }
                return@execute
            }
            val hit = Discovery.probe(parsed.host, parsed.port)
            ui.post {
                if (hit != null) {
                    store.save(hit)                  // verified, so it is worth remembering
                    loadKiosk(hit)
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
     * nothing is left behind to slow down the next launch.
     */
    private fun forceHost(text: String) {
        val parsed = HostStore.parse(text)
        if (parsed == null) {
            overlay.setStatus("That is not an address. Try 192.168.0.13:8081")
            return
        }
        cancelScan.set(true)
        Diag.w("FORCED: opening $parsed although nothing answered it. Not saved — it will be " +
            "remembered only if it starts answering.")
        loadKiosk(parsed)
    }

    /** Same machine and same port. `KioskHost` also carries reportedIp, which must not count. */
    private fun sameEndpoint(a: KioskHost?, b: KioskHost?): Boolean =
        a != null && b != null && a.host.equals(b.host, ignoreCase = true) && a.port == b.port

    /**
     * A host that has just answered /health is verified by definition, so if it is not the saved
     * one, save it now. This is what turns a successful FORCE into a remembered address without
     * ever writing an unverified one.
     */
    private fun rememberIfVerified(h: KioskHost) {
        if (sameEndpoint(store.saved(), h)) return
        store.save(h)
        Diag.i("remembering $h — it answered a health check")
    }

    private fun loadKiosk(host: KioskHost) {
        current = host
        pageLoaded = false
        healthMisses = 0
        failedUrl = null
        remote.stateLine = "loading ${host.pageUrl(store.path)}"
        Diag.i("loading kiosk page ${host.pageUrl(store.path)} (telemetry on ${host.telemetryPort})")
        overlay.showBusy("Opening ${host.pageUrl(store.path)}")
        web.loadUrl(host.pageUrl(store.path))
        // Do not hang on a page that connected but never finished.
        ui.postDelayed({
            if (!pageLoaded && !connecting) {
                Diag.e("page ${host.pageUrl(store.path)} did not finish loading within 20s")
                startConnect(force = true)
            }
        }, 20_000)
    }

    // ------------------------------------------------------ wake / watchdog

    /**
     * A tablet that sleeps and wakes must come back to a working page, not an error. The page
     * is left alone while the server still answers; when it stops answering twice in a row we
     * re-probe and, if the laptop moved, sweep for it again.
     */
    /**
     * ONE health check, used by the watchdog AND by onResume, so the two cannot drift apart.
     *
     * The rules, in the order they matter:
     *   - answered, page loaded          -> DO NOTHING AT ALL. The visitor keeps their typing.
     *   - answered, page dead            -> reload it; that is a genuinely dead page.
     *   - no answer, first miss          -> say so and wait. One dropped packet on a venue
     *                                       hotspot is not a reason to blank the screen.
     *   - no answer, second miss running -> the laptop really has gone; re-discover.
     */
    private fun healthCheck(reason: String) {
        val h = current ?: return
        if (connecting) return
        io.execute {
            val ok = Discovery.probe(h.host, h.port, 1200, 1800) != null
            ui.post {
                if (!sameEndpoint(h, current)) return@post      // host changed under us
                if (ok) {
                    healthMisses = 0
                    rememberIfVerified(h)
                    if (!pageLoaded && !connecting) {
                        Diag.i("$reason: $h is answering but the page is not loaded — loading it")
                        loadKiosk(h)
                    }
                } else if (!networkUp()) {
                    // THIS TABLET has no network. That says nothing about the laptop, so it is
                    // not a miss — counting it is what used to trigger a pointless full sweep
                    // after every sleep. Keep the page and wait for the radio.
                    Diag.w("$reason: no network on this tablet yet — not counting it against $h")
                } else if (SystemClock.elapsedRealtime() - resumedAt < WAKE_GRACE_MS) {
                    // Just woke. Wifi can report connected a beat before it can actually carry
                    // traffic, so give it the grace window before believing a failure.
                    Diag.w("$reason: within ${WAKE_GRACE_MS / 1000}s of waking — not counting it against $h")
                } else if (++healthMisses >= 2) {
                    healthMisses = 0
                    Diag.w("$reason: $h missed 2 health checks, re-discovering")
                    startConnect(force = true)
                } else {
                    Diag.w("$reason: $h missed a health check ($healthMisses/2) — leaving the " +
                        "page alone until it misses again")
                }
            }
        }
    }

    private val watchdog = object : Runnable {
        override fun run() {
            val h = current
            if (h != null && !connecting) {
                healthCheck("WATCHDOG")
            } else if (h == null && !connecting && !overlay.isShowing) {
                startConnect(force = true)
            }
            ui.postDelayed(this, WATCHDOG_MS)
        }
    }

    override fun onResume() {
        super.onResume()
        goImmersive()
        web.onResume()
        web.resumeTimers()

        // Straight after a wake, do not wait a whole watchdog cycle — but run the SAME check the
        // watchdog runs. This used to be its own one-miss-and-reload rule, which is why a power
        // button press over a half-typed lead form cost the lead.
        resumedAt = SystemClock.elapsedRealtime()
        // Was an immediate probe. On a tablet that has just woken that lands before the radio
        // is back and the answer is meaningless, so wait a beat first — and the grace window
        // above means even this one cannot condemn the laptop on its own.
        ui.postDelayed({ healthCheck("WAKE") }, WAKE_PROBE_DELAY_MS)
        ui.removeCallbacks(watchdog)
        ui.postDelayed(watchdog, WATCHDOG_MS)
    }

    override fun onPause() {
        super.onPause()
        ui.removeCallbacks(watchdog)
        // Timers keep running: the page's own SSE reconnect and lead flusher are worth more
        // than the battery, and the tablet is on a charger at the booth.
        web.onPause()
    }

    override fun onDestroy() {
        ui.removeCallbacksAndMessages(null)
        cancelScan.set(true)
        remote.stop()
        DebugBridge.unregister(this)
        io.shutdownNow()
        try {
            wifiLock?.let { if (it.isHeld) it.release() }
        } catch (e: Exception) {
            Diag.w("releasing the wifi lock failed: ${e.javaClass.simpleName}")
        }
        web.destroy()
        super.onDestroy()
    }

    /**
     * Does THIS TABLET have a usable network right now?
     *
     * Used to decide whether a failed probe is evidence about the laptop or evidence about the
     * tablet's own radio. Deliberately conservative: anything it cannot determine counts as
     * "up", so an unknown state falls back to the old behaviour rather than wedging the app in
     * a state where it never re-discovers a laptop that really did move.
     */
    private fun networkUp(): Boolean {
        return try {
            val cm = getSystemService(CONNECTIVITY_SERVICE) as? android.net.ConnectivityManager
                ?: return true
            if (android.os.Build.VERSION.SDK_INT >= 23) {
                val n = cm.activeNetwork ?: return false
                val caps = cm.getNetworkCapabilities(n) ?: return false
                caps.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET) ||
                    caps.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI)
            } else {
                @Suppress("DEPRECATION")
                cm.activeNetworkInfo?.isConnected == true
            }
        } catch (e: Exception) {
            true
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) goImmersive()
    }

    // --------------------------------------------------------------- chrome

    /**
     * Immersive mode. This — plus the origin allowlist — is the WHOLE of what keeps a visitor
     * on the kiosk page. There is no screen pinning any more, by instruction.
     */
    private fun goImmersive() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    private fun cornerTap() {
        val now = SystemClock.elapsedRealtime()
        if (now - cornerFirstTapAt > CORNER_WINDOW_MS) {
            cornerFirstTapAt = now
            cornerTaps = 0
        }
        if (++cornerTaps >= CORNER_TAPS) {
            cornerTaps = 0
            Diag.i("operator panel opened by corner tap")
            ui.post { overlay.showOperator(operatorStatus(), current?.toString()) }
        }
    }

    private fun operatorStatus(): String {
        val h = current
        return if (h == null) "Not connected."
        else "Connected to ${h.origin}${store.path}" +
            (h.reportedIp?.let { if (it != h.host) "\nLaptop reports its own IP as $it" else "" } ?: "")
    }

    /**
     * Back never exits. Inside the kiosk it walks back through the page's own history
     * (the staff form and the TV preview are same-origin navigations); at the root it does
     * nothing at all.
     */
    @Suppress("OverridingDeprecatedMember", "DEPRECATION")
    override fun onBackPressed() {
        if (overlay.isShowing && pageLoaded) { overlay.hide(); return }
        if (web.canGoBack()) web.goBack()
        // else: swallowed on purpose.
    }

    companion object {
        private const val WATCHDOG_MS = 15_000L

        /** Let the radio come back before the first post-wake probe means anything. */
        private const val WAKE_PROBE_DELAY_MS = 4_000L

        /**
         * How long after a wake a failed probe is treated as "this tablet is not ready" rather
         * than "the laptop is gone". Fire tablets have been measured taking well over ten
         * seconds to carry traffic again; two watchdog cycles is the safe side of that, and the
         * cost of waiting is only that a genuinely-moved laptop is re-found a few seconds later.
         */
        private const val WAKE_GRACE_MS = 30_000L
        private const val CORNER_TAPS = 7
        private const val CORNER_WINDOW_MS = 6_000L
    }
}
