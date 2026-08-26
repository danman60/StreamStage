package com.streamstage.boothloop

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedOutputStream
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.text.SimpleDateFormat
import java.util.Collections
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

/**
 * THE BOOTH TABLET TALKS TO THE TV. Nothing else has to be switched on.
 *
 * ## Why this exists
 *
 * Daniel, 2026-08-11, after DART dropped off the network twice during a live show and the booth
 * tablet went dead with it: *"The tablets shouldn't have to connect to dart at all. The booth
 * tablet connects directly to the TV."*
 *
 * He is remembering a real plan. `docs/plans/2026-08-07-tradeshow-toolkit.md:54-56`, Phase 2:
 * *"Tablet picks a film; the stick plays it with audio and that product's QR. Tablet and stick
 * find each other on the LAN with no typed IP addresses."* Its acceptance test #2 has a phone
 * hotspot, a tablet and a stick — and no laptop anywhere. Phase 1 (the stick playing the loop by
 * itself) was built; Phase 2 was built the other way round, with the stick as a CLIENT of the
 * laptop's `serve.py`. This file is Phase 2 as it was specified.
 *
 * ## What it is
 *
 * The half of `expo-assets/kiosk/serve.py` the TABLET needs, running inside the booth app:
 * the tablet page and its assets (bundled — see app/build.gradle.kts `stageTabletSurface`), the
 * `/bus` relay, `/films`, `/state`, `/health`, and the telemetry pair `/log`, `/lead`, `/events`.
 * It does NOT serve films: `tablet.html` has no `<video>` in it, so the 621 MB in `media/` is not
 * on this surface at all. `/tv` is not served either — on this device the TV is this process.
 *
 * ## Ports, and why DART still wins when DART is there
 *
 * Page port **8180**, telemetry **8181** (always page + 1: `kiosk.js:155` computes the telemetry
 * origin as `location.port + 1`, and `tablet-app/MainActivity.allowed()` permits exactly those
 * two ports). That number is not arbitrary — it is the disambiguation, and it needs no change to
 * the tablet app at all:
 *
 *  - `tablet-app/Discovery.kt:73` sweeps every address on **8080 and 8081 only** (stage 1). DART
 *    is there. So when DART is up, the tablet finds DART, stage 2 never runs, and the booth
 *    behaves exactly as it did yesterday.
 *  - Stage 2 — the full 8080-8119 walk plus `EXTRA_PORTS` (`Discovery.kt:60`, and **8180 is the
 *    first of them**) — runs only `if (found == null)`. That is precisely the DART-is-gone case,
 *    and it is where this server is found.
 *  - 8180 is outside `serve.py:pick_ports`' window (8080-8118, stepping by two), so a DART that
 *    fell forward can never land on top of it either.
 *
 * ONE HONEST CAVEAT, because the alternative is overclaiming. `Discovery.locate` seeds stage 1
 * with the tablet's SAVED port as well (`Discovery.kt:366`). So a tablet that has previously
 * connected to a stick, and whose saved ADDRESS has since gone stale (both machines took new
 * DHCP leases overnight), sweeps with seeds `[8180, 8080, 8081]` and takes the first responder —
 * which is genuinely arbitrary between a live DART and this stick. That is not a broken state:
 * both drive the same screen, and because the tablet posts to exactly ONE host, a lead can only
 * ever land in one queue and can never be sent twice. It does mean that at the end of a show you
 * check BOTH queues — DART's `telemetry/leads-*.jsonl` and this stick's `/leads` — which the
 * plan doc spells out. `/health` says `"server":"firestick"` so which one is in play is never
 * something anybody has to infer.
 *
 * ## The bus, when this is the server rather than a client
 *
 * [BoothBus] keeps doing what it does — it subscribes to DART's `/bus` and publishes this
 * screen's state back — and that is untouched. This adds a SECOND, local bus: the tablet POSTs
 * here, this obeys it directly, and this screen's `tv` state is retained here as well, so a
 * tablet that connects gets the correct picture immediately.
 *
 * **The two buses are deliberately not bridged.** Forwarding a command from one to the other
 * would put a relay hop back in the middle of the thing that just failed, and DART already
 * relays this screen's state back to the phone because [BoothBus] publishes it there. A phone on
 * DART and a tablet on this stick both drive the same screen and both see the same state; they
 * simply do not go through each other.
 *
 * ## What must not break
 *
 * Every rule from [BoothBus] applies here word for word. Nothing in this file is on the playback
 * path; every thread is a wrapped daemon at [Thread.MIN_PRIORITY]; a port it cannot bind ends the
 * attempt and the reel never learns about it. With no tablet, no wifi and no network at all, the
 * loop plays exactly as it does with none of this present.
 */
object BoothServer {

    private const val TAG = "BoothLoop/Server"

    /**
     * The page port. Telemetry is ALWAYS this + 1 — that is not a preference, it is what
     * `kiosk.js:155` computes and what the tablet app allows.
     */
    const val DEFAULT_PORT = 8180

    /** How far to walk if 8180/8181 are somehow taken. Steps by two so the pair stays aligned. */
    private const val PORT_TRIES = 10

    private const val SSE_PING_S = 15L

    /** How long `/films` and `/health` may reuse the last film scan. See [filmsOnDisk]. */
    private const val FILMS_TTL_MS = 15_000L

    /** `serve.py:100`. Only STATE is retained. Replaying a command starts an hour-old film. */
    private val subscribers = Collections.synchronizedList(ArrayList<LinkedBlockingQueue<String>>())

    private val main = Handler(Looper.getMainLooper())
    private val pool = Executors.newCachedThreadPool { r ->
        Thread(r, "BoothServerConn").apply { isDaemon = true; priority = Thread.MIN_PRIORITY }
    }

    interface Listener {
        /** Main thread. The same [BoothBus.Command] vocabulary, obeyed the same way. */
        fun onServerCommand(command: BoothBus.Command)
    }

    @Volatile private var listener: Listener? = null
    @Volatile private var appContext: Context? = null
    @Volatile private var running = false
    @Volatile private var retainedTv: JSONObject? = null

    @Volatile var port: Int = -1
        private set
    @Volatile var status: String = "not started"
        private set

    /** Set when the server actually binds, so `/health.uptimeS` is the SERVER's age, not the app's. */
    @Volatile private var startedMs = System.currentTimeMillis()
    @Volatile private var startedAt = ""

    private var pageSocket: ServerSocket? = null
    private var telemetrySocket: ServerSocket? = null

    /** The tablet surface, read out of the APK once and then never off the disk again. */
    private val assetCache = HashMap<String, ByteArray>()

    // ------------------------------------------------------------------ lifecycle

    fun start(context: Context, l: Listener) {
        if (running) return
        appContext = context.applicationContext
        listener = l

        val pair = openPair() ?: run {
            status = "no free port pair from $DEFAULT_PORT — the tablet cannot reach this stick"
            Log.e(TAG, status)
            return
        }
        val (picked, page, telemetry) = pair
        port = picked
        pageSocket = page
        telemetrySocket = telemetry
        startedMs = System.currentTimeMillis()
        startedAt = isoNow()
        running = true
        status = "serving the tablet on :$picked (telemetry :${picked + 1})"
        Log.i(TAG, "==== THE BOOTH TABLET CAN NOW CONNECT TO THIS STICK ====")
        Log.i(TAG, "     http://${lanIp()}:$picked/tablet     (telemetry ${picked + 1})")

        acceptLoop(page, "page")
        acceptLoop(telemetry, "telemetry")
    }

    fun stop() {
        running = false
        listener = null
        status = "stopped"
        runCatching { pageSocket?.close() }
        runCatching { telemetrySocket?.close() }
        pageSocket = null
        telemetrySocket = null
        synchronized(subscribers) { subscribers.clear() }
    }

    /** Main thread. The activity's ticker gives this the same state it gives [BoothBus]. */
    fun setState(s: BoothBus.TvState) {
        retainedTv = BoothBus.tvMessage(s)
    }

    val subscriberCount: Int get() = subscribers.size

    /**
     * The first pair at or above [DEFAULT_PORT] where BOTH halves actually bind, stepping by two
     * so the page/telemetry pair always stays aligned (`serve.py:pick_ports`).
     *
     * It BINDS rather than probing-then-binding on purpose. A probe with `reuseAddress = false`
     * reads as the careful choice and is wrong here: after this server is stopped and started —
     * which happens on every activity restart — the accepted connections from the previous run
     * sit in TIME_WAIT on the same local port, and an exclusive probe calls that "busy". The
     * server would then walk forward to 8182 for no reason, and the tablet's saved address would
     * be stale. The bind we keep is the bind we tested.
     */
    private fun openPair(): Triple<Int, ServerSocket, ServerSocket>? {
        for (i in 0 until PORT_TRIES) {
            val p = DEFAULT_PORT + i * 2
            val page = bind(p) ?: continue
            val telemetry = bind(p + 1)
            if (telemetry == null) {
                runCatching { page.close() }
                continue
            }
            return Triple(p, page, telemetry)
        }
        return null
    }

    private fun bind(p: Int): ServerSocket? = runCatching {
        ServerSocket().apply {
            reuseAddress = true
            bind(InetSocketAddress("0.0.0.0", p), 32)
        }
    }.onFailure { Log.w(TAG, "could not bind $p: ${it.message}") }.getOrNull()

    private fun acceptLoop(server: ServerSocket, which: String) {
        Thread({
            while (running && !server.isClosed) {
                val sock = runCatching { server.accept() }.getOrNull()
                if (sock == null) {
                    // Normally this is stop() closing the socket, and the loop condition above
                    // ends us on the next pass. A transient accept failure with the socket still
                    // open would otherwise spin this thread hot against the decoder, so pause.
                    if (running && !server.isClosed) runCatching { Thread.sleep(200) }
                    continue
                }
                pool.execute {
                    runCatching { serve(sock) }
                        .onFailure { Log.d(TAG, "connection ended: ${it.javaClass.simpleName}") }
                    runCatching { sock.close() }
                }
            }
        }, "BoothServerAccept-$which").apply {
            isDaemon = true
            priority = Thread.MIN_PRIORITY
            start()
        }
    }

    // ------------------------------------------------------------------ one request

    private fun serve(sock: Socket) {
        sock.soTimeout = 30_000
        sock.tcpNoDelay = true
        val input = sock.getInputStream()
        val out = BufferedOutputStream(sock.getOutputStream(), 16 * 1024)

        val requestLine = readLine(input) ?: return
        val parts = requestLine.split(" ")
        if (parts.size < 2) return
        val method = parts[0].uppercase()
        val target = parts[1]

        var contentLength = 0
        while (true) {
            val h = readLine(input) ?: break
            if (h.isEmpty()) break
            val c = h.indexOf(':')
            if (c > 0 && h.substring(0, c).trim().equals("Content-Length", true)) {
                contentLength = h.substring(c + 1).trim().toIntOrNull() ?: 0
            }
        }

        val q = target.indexOf('?')
        val path = (if (q >= 0) target.substring(0, q) else target).trimEnd('/').ifEmpty { "/" }
        val query = if (q >= 0) parseQuery(target.substring(q + 1)) else emptyMap()

        // A body is capped hard: this is a booth LAN, and a client that claims 40 MB is a bug
        // or a probe, not a lead.
        val body = if (method == "POST" && contentLength in 1..(2 * 1024 * 1024))
            readFully(input, contentLength) else ByteArray(0)

        when {
            method == "OPTIONS" -> preflight(out)
            method == "GET" && path == "/bus" -> return sse(out)
            method == "GET" -> get(path, query, out)
            method == "POST" -> post(path, body, out)
            else -> send(out, 405, "{\"ok\":false}".toByteArray(), "application/json")
        }
        runCatching { out.flush() }
    }

    // ------------------------------------------------------------------ GET

    private fun get(path: String, query: Map<String, String>, out: BufferedOutputStream) {
        when (path) {
            "/health" -> return sendJson(out, health())
            "/films" -> return sendJson(out, filmsJson())
            "/state" -> return sendJson(out, state())
            "/leads" -> return sendJson(out, leadsExport())
            "/events", "/applog" -> return events(path, query, out)
            "/tv", "/tv.html" -> return send(
                out, 404,
                ("This is the TV. It is a Fire Stick running the booth app, and it is already " +
                    "showing the reel — there is no page to open here.\n").toByteArray(),
                "text/plain; charset=utf-8"
            )
        }

        // Everything else is the tablet surface, bundled in the APK.
        val rel = when (path) {
            "/", "/tablet", "/t", "/index.html", "/tablet.html" -> "tablet.html"
            else -> path.trimStart('/')
        }
        if (rel.contains("..")) return send(out, 400, "bad path\n".toByteArray(), "text/plain")
        val bytes = asset(rel)
        if (bytes == null) {
            send(out, 404, "not found: $rel\n".toByteArray(), "text/plain; charset=utf-8")
            return
        }
        send(out, 200, bytes, contentType(rel))
    }

    private fun events(path: String, query: Map<String, String>, out: BufferedOutputStream) {
        val day = query["day"]
        val since = query["since"]?.toLongOrNull() ?: 0L
        val rows = if (path == "/applog") {
            // Both places log lines can be: the new applog file, and anything already mixed
            // into events- from before the split. `serve.py:1094`.
            val a = BoothStore.readEvents(day, since, "applog", keepLogs = true)
            val b = BoothStore.readEvents(day, since, "events", keepLogs = true, onlyLogs = true)
            (a + b).sortedBy { it.optLong("ms", 0L) }
        } else {
            BoothStore.readEvents(day, since, "events")
        }
        val (bytes, kept, dropped) =
            if (query["cap"] == "off") {
                val whole = JSONArray().also { arr -> rows.forEach { arr.put(it) } }
                    .toString().toByteArray(Charsets.UTF_8)
                Triple(whole, rows.size, 0)
            } else {
                BoothStore.cappedJson(rows, BoothStore.MAX_EVENTS_BYTES)
            }
        send(
            out, 200, bytes, "application/json",
            extra = listOf("X-Events-Returned: $kept", "X-Events-Dropped: $dropped")
        )
    }

    // ------------------------------------------------------------------ POST

    private fun post(path: String, body: ByteArray, out: BufferedOutputStream) {
        val text = String(body, Charsets.UTF_8).trim().ifEmpty { "{}" }
        when (path) {
            "/bus" -> {
                val o = runCatching { JSONObject(text) }.getOrNull()
                    ?: return send(out, 400, "{\"ok\":false,\"error\":\"bad json\"}".toByteArray(), "application/json")
                val why = BoothBus.relayRefusal(o)
                if (why != null) {
                    // Refused BEFORE the relay, so no screen ever sees it — and written to the
                    // day's record, so a visitor surface trying it is readable rather than a
                    // claim. `serve.py:1216`.
                    BoothStore.countRefused()
                    runCatching {
                        BoothStore.record(
                            JSONObject()
                                .put("t", isoNow()).put("ms", System.currentTimeMillis())
                                .put("surface", "stick").put("type", "cmd_refused")
                                .put("cmd", o.optString("type"))
                                .put("film", o.optString("film", o.optString("product", "")))
                                .put("src", o.optString("src", o.optString("origin", "visitor")))
                                .put("reason", why)
                        )
                    }
                    Log.w(TAG, "refused a bus message: $why")
                    return sendJson(
                        out,
                        JSONObject().put("ok", false).put("error", "refused").put("reason", why),
                        403
                    )
                }
                publish(o)
                // "Say what you are doing, now" — the phone and the tablet both use it.
                if (o.optString("type") == "ping") retainedTv?.let { publish(it) }
                BoothBus.screenCommand(o)?.let { cmd ->
                    Log.i(TAG, "tablet -> ${o.optString("type")}")
                    main.post { runCatching { listener?.onServerCommand(cmd) } }
                }
                return sendJson(out, JSONObject().put("ok", true))
            }

            "/log" -> {
                // One event or a batch. A FAILED WRITE ANSWERS 507, NOT 200 (`serve.py:1258`):
                // both clients mark a batch as safely stored on `r.ok`, so a 200 over a failed
                // write puts the day's record in neither place.
                return try {
                    forEachItem(text) { BoothStore.record(it) }
                    sendJson(out, JSONObject().put("ok", true))
                } catch (t: Throwable) {
                    Log.e(TAG, "telemetry write failed", t)
                    sendJson(out, JSONObject().put("ok", false).put("stored", "browser-only"), 507)
                }
            }

            "/lead" -> {
                return try {
                    forEachItem(text) { if (it.optString("email").isNotEmpty()) BoothStore.recordLead(it) }
                    sendJson(out, JSONObject().put("ok", true))
                } catch (t: Throwable) {
                    // NOT ok: the tablet must keep the lead queued in localStorage rather than
                    // treat a browser-only copy as safely on disk.
                    Log.e(TAG, "LEAD WRITE FAILED — telling the tablet to keep it queued", t)
                    sendJson(out, JSONObject().put("ok", false).put("stored", "browser-only"), 507)
                }
            }
        }
        send(out, 404, "{\"ok\":false}".toByteArray(), "application/json")
    }

    private inline fun forEachItem(text: String, each: (JSONObject) -> Unit) {
        if (text.startsWith("[")) {
            val arr = JSONArray(text)
            for (i in 0 until arr.length()) arr.optJSONObject(i)?.let(each)
        } else {
            each(JSONObject(text))
        }
    }

    // ------------------------------------------------------------------ the relay

    private fun publish(msg: JSONObject) {
        val payload = "data: $msg\n\n"
        synchronized(subscribers) {
            val dead = ArrayList<LinkedBlockingQueue<String>>()
            for (q in subscribers) if (!q.offer(payload)) dead.add(q)  // a wedged client must not block the booth
            subscribers.removeAll(dead.toSet())
        }
    }

    /** One long-lived Server-Sent Events connection per screen. `serve.py:_sse`. */
    private fun sse(out: BufferedOutputStream) {
        val q = LinkedBlockingQueue<String>(200)
        synchronized(subscribers) { subscribers.add(q) }
        try {
            out.write(
                ("HTTP/1.1 200 OK\r\n" +
                    "Content-Type: text/event-stream\r\n" +
                    "Cache-Control: no-cache, no-store\r\n" +
                    "Connection: keep-alive\r\n" +
                    "X-Accel-Buffering: no\r\n" +
                    "Access-Control-Allow-Origin: *\r\n\r\n").toByteArray()
            )
            // Replay the retained state, so a tablet that just connected is correct immediately
            // rather than after the next tap.
            retainedTv?.let { out.write("data: $it\n\n".toByteArray()) }
            out.write(": connected\n\n".toByteArray())
            out.flush()
            while (running) {
                val payload = q.poll(SSE_PING_S, TimeUnit.SECONDS) ?: ": ping\n\n"
                out.write(payload.toByteArray())
                out.flush()
            }
        } catch (_: Throwable) {
            // The tablet closed it, or the wifi went. Normal, not an error.
        } finally {
            synchronized(subscribers) { subscribers.remove(q) }
        }
    }

    // ------------------------------------------------------------------ the JSON surfaces

    /**
     * `serve.py:/health`, and it must satisfy `tablet-app/Discovery.probeDetailed`: HTTP 200,
     * `ok:true`, an `ip`, a `port`, and `subscribers` or `telemetryDir` — those last two are
     * what separate a kiosk from the many other things on a trade-show LAN serving a bland
     * `/health`.
     */
    private fun health(): JSONObject {
        val have = filmsOnDisk()
        return JSONObject()
            .put("ok", true)
            .put("ip", lanIp())
            .put("port", port)
            .put("subscribers", subscribers.size)
            // Which instance is this? On one LAN there may be a DART as well.
            .put("server", "firestick")
            .put("app", "com.streamstage.boothloop")
            .put("startedAt", startedAt)
            .put("uptimeS", (System.currentTimeMillis() - startedMs) / 1000.0)
            // Always true, and honestly so: on this device the TV IS this process.
            .put("hasTv", true)
            .put("tvLastSeenMs", retainedTv?.optLong("at") ?: JSONObject.NULL)
            .put("events", BoothStore.counts["events"] ?: 0)
            .put("leads", BoothStore.counts["leads"] ?: 0)
            .put("refused", BoothStore.counts["refused"] ?: 0)
            .put("telemetryDir", BoothStore.dir()?.absolutePath ?: "")
            .put("telemetryWritable", BoothStore.writable())
            .put("eventsFileBytes", BoothStore.fileBytes("events"))
            .put("applogFileBytes", BoothStore.fileBytes("applog"))
            .put("eventsCapBytes", BoothStore.MAX_EVENTS_BYTES)
            .put("expectedFilms", JSONArray(expectedFilms()))
            .put("missingFilms", JSONArray(expectedFilms().filter { !have.has(it) }))
            .put("filmsSource", filmsSource)
            .put("tabletSurface", JSONArray(surfaceReport()))
            // No beacon. See [beaconDeliberatelyAbsent].
            .put("beaconPort", JSONObject.NULL)
            .put("leadFlush", LeadSender.healthJson())
    }

    private fun state(): JSONObject {
        val out = JSONObject()
        out.put("tv", retainedTv ?: JSONObject().put("type", "tv").put("_stale", true))
        val have = filmsOnDisk()
        out.put(
            "_server", JSONObject()
                .put("films", have)
                .put("operatorOnlyFilms", JSONArray(listOf("streamstage-services")))
                .put("expectedFilms", JSONArray(expectedFilms()))
                .put("missingFilms", JSONArray(expectedFilms().filter { !have.has(it) }))
                .put("refused", BoothStore.counts["refused"] ?: 0)
                .put("subscribers", subscribers.size)
                .put("server", "firestick")
        )
        return out
    }

    /**
     * `serve.py:/films` — id -> bytes, for what is on disk RIGHT NOW.
     *
     * On this device that answer is better than DART's: it is the screen that will actually
     * play the film reporting on the file it will actually open. `tablet.html:924` uses it to
     * decide which tiles are real, so a tile can no longer promise a film DART has and this
     * stick does not.
     */
    @Volatile private var filmsCache: JSONObject? = null
    @Volatile private var filmsCachedAt = 0L

    private fun filmsOnDisk(): JSONObject {
        // CACHED FOR [FILMS_TTL_MS], and that is not a micro-optimisation.
        // `Playlist.resolve` reads the films folder, consults films.json AND — for any film this
        // stick installed from a manifest — spot-hashes three 256 KB samples of it to prove it is
        // not damaged. That is up to several MB of flash reads. `/health` is polled by the
        // tablet's watchdog every 15 s and again by every discovery probe, and this app's one
        // job is to keep a decoder fed off that same flash. Answering from a few seconds ago is
        // honest (a film does not appear mid-show) and cheap.
        val now = System.currentTimeMillis()
        filmsCache?.let { if (now - filmsCachedAt < FILMS_TTL_MS) return it }
        val out = JSONObject()
        runCatching {
            val ctx = appContext ?: return@runCatching
            for (f in Playlist.resolve(ctx)) {
                out.put(FilmVersions.logicalName(f.name).substringBeforeLast('.'), f.length())
            }
        }
        filmsCache = out
        filmsCachedAt = now
        return out
    }

    private fun filmsJson(): JSONObject = filmsOnDisk()

    /**
     * The export that lets a lead captured here reach DART's records WITHOUT any chance of it
     * being mailed twice.
     *
     *     curl http://<stick>:8181/leads
     *
     * `flushed` is this stick's marker, keyed by the same `lid` the tablet stamped and the same
     * key `flush-leads.py:69` computes. Merge it into `telemetry/leads-flushed.json` before
     * running `flush-leads.py` on DART and a lead this stick has already sent can never go
     * again. Nothing here PUSHES to DART — a pull cannot double-send.
     */
    private fun leadsExport(): JSONObject {
        val all = BoothStore.leads()
        val marker = LeadSender.loadMarker()
        val arr = JSONArray()
        all.forEach { arr.put(it) }
        return JSONObject()
            .put("ok", true)
            .put("count", all.size)
            .put("unsent", all.count { !marker.has(it.optString("_lid")) })
            .put("endpoint", LeadSender.endpoint)
            .put("leads", arr)
            .put("flushed", marker)
    }

    // ------------------------------------------------------------------ films the booth expects

    /**
     * `serve.py:product_ids_from_kiosk_js`, ported, and reading the SAME file.
     *
     * The film list used to be written out five times across this repo and that duplication is
     * what let one copy know about a film another did not. `kiosk.js` is already "the one place
     * you edit", it is bundled into this APK as part of the tablet surface, so this parses it
     * rather than re-typing the list. A parse that half-succeeds is treated as a failure and the
     * built-in list is used exactly as before; `/health.filmsSource` says which is in force.
     */
    private val fallbackProducts =
        listOf("studiosage", "compsync", "callboard", "costumecraft", "studiobeat", "reflect")

    @Volatile private var filmsSource: String = "built-in fallback"

    private var expectedCache: List<String>? = null

    private fun expectedFilms(): List<String> {
        expectedCache?.let { return it }
        val src = asset("kiosk.js")?.toString(Charsets.UTF_8)
        val parsed = if (src == null) emptyList() else runCatching {
            val start = src.indexOf("products: [")
            if (start < 0) return@runCatching emptyList<String>()
            val end = src.indexOf("\n  ],", start)
            if (end < 0) return@runCatching emptyList<String>()
            Regex("""^\s*id:\s*'([A-Za-z0-9_-]+)'""", RegexOption.MULTILINE)
                .findAll(src.substring(start, end)).map { it.groupValues[1] }.toList()
        }.getOrDefault(emptyList())
        // Two entries means the shape moved under us: a failed parse, not a shorter booth.
        val products = if (parsed.size >= 3) {
            filmsSource = "kiosk.js"; parsed
        } else {
            filmsSource = "built-in fallback"; fallbackProducts
        }
        val out = products + listOf("streamstage-services")
        expectedCache = out
        return out
    }

    // ------------------------------------------------------------------ the bundled surface

    /**
     * One file of the tablet surface, out of the APK, cached in memory after the first read.
     *
     * The whole surface is about 400 KB (tablet.html 69 KB, kiosk.js 45 KB, brand.css 11 KB and
     * the QR/brand images), so it is held whole rather than re-opened per request: a booth
     * tablet reloading mid-show must not wait on flash.
     */
    private fun asset(rel: String): ByteArray? {
        synchronized(assetCache) { assetCache[rel]?.let { return it } }
        val ctx = appContext ?: return null
        val bytes = runCatching {
            ctx.assets.open("tablet/$rel").use { readAll(it) }
        }.getOrNull() ?: return null
        synchronized(assetCache) { assetCache[rel] = bytes }
        return bytes
    }

    /**
     * What actually made it into this build, so a missing file is a fact on `/health` rather
     * than a blank tile somebody notices at the booth.
     */
    @Volatile private var surfaceCache: List<String>? = null

    private fun surfaceReport(): List<String> {
        // Computed once: the contents of an APK do not change while it is running.
        surfaceCache?.let { return it }
        val ctx = appContext ?: return listOf("no context")
        val required = listOf("tablet.html", "kiosk.js", "brand.css")
        val missing = required.filter { asset(it) == null }
        val out = if (missing.isNotEmpty()) {
            missing.map { "MISSING $it" }
        } else {
            val counted = runCatching {
                (ctx.assets.list("tablet/qr/tablet")?.size ?: 0) +
                    (ctx.assets.list("tablet/brand")?.size ?: 0)
            }.getOrDefault(0)
            listOf("ok", "$counted image(s)")
        }
        surfaceCache = out
        return out
    }

    // ------------------------------------------------------------------ no beacon, on purpose

    /**
     * THIS SERVER DOES NOT BROADCAST A BEACON, and that is a decision, not an omission.
     *
     *  1. `tablet-app/Discovery.kt` has no UDP listener at all — it finds a server by probing.
     *     A beacon nobody listens for is dead machinery.
     *  2. [BoothBus.listenForBeacon] binds UDP 45454 on THIS device with `reuseAddress`, so a
     *     beacon sent from here would be heard by here, and the stick would spend its discovery
     *     budget trying to subscribe to its own bus.
     *
     * If the tablet app ever grows a beacon listener, `BEACON.md` is the contract to build
     * against and this is where the sender goes — with a field that says it is the stick, so a
     * client can prefer DART when both are shouting.
     */
    private const val beaconDeliberatelyAbsent = true

    // ------------------------------------------------------------------ plumbing

    private fun preflight(out: BufferedOutputStream) {
        out.write(
            ("HTTP/1.1 204 No Content\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                "Access-Control-Allow-Headers: Content-Type\r\n" +
                "Access-Control-Max-Age: 86400\r\n" +
                "Content-Length: 0\r\n" +
                "Connection: close\r\n\r\n").toByteArray()
        )
    }

    private fun sendJson(out: BufferedOutputStream, o: JSONObject, code: Int = 200) =
        send(out, code, o.toString().toByteArray(Charsets.UTF_8), "application/json")

    private fun send(
        out: BufferedOutputStream,
        code: Int,
        body: ByteArray,
        ctype: String,
        extra: List<String> = emptyList()
    ) {
        val sb = StringBuilder()
        sb.append("HTTP/1.1 ").append(code).append(' ').append(reason(code)).append("\r\n")
        sb.append("Content-Type: ").append(ctype).append("\r\n")
        sb.append("Content-Length: ").append(body.size).append("\r\n")
        // The page is on the page port and telemetry is one above it, which makes them different
        // ORIGINS to the WebView. Same device, no internet involved. `serve.py:926`.
        sb.append("Access-Control-Allow-Origin: *\r\n")
        sb.append("Cache-Control: no-store\r\n")
        for (h in extra) sb.append(h).append("\r\n")
        sb.append("Connection: close\r\n\r\n")
        out.write(sb.toString().toByteArray())
        out.write(body)
    }

    private fun reason(code: Int) = when (code) {
        200 -> "OK"; 204 -> "No Content"; 400 -> "Bad Request"; 403 -> "Forbidden"
        404 -> "Not Found"; 405 -> "Method Not Allowed"; 507 -> "Insufficient Storage"
        else -> "OK"
    }

    private fun contentType(rel: String): String = when {
        rel.endsWith(".html") -> "text/html; charset=utf-8"
        rel.endsWith(".js") -> "text/javascript; charset=utf-8"
        rel.endsWith(".css") -> "text/css; charset=utf-8"
        rel.endsWith(".json") -> "application/json"
        rel.endsWith(".svg") -> "image/svg+xml"
        rel.endsWith(".png") -> "image/png"
        rel.endsWith(".jpg") || rel.endsWith(".jpeg") -> "image/jpeg"
        rel.endsWith(".ico") -> "image/x-icon"
        else -> "application/octet-stream"
    }

    private fun readLine(input: InputStream): String? {
        val sb = StringBuilder(128)
        while (true) {
            val c = input.read()
            if (c < 0) return if (sb.isEmpty()) null else sb.toString()
            if (c == '\n'.code) return sb.toString().trimEnd('\r')
            if (sb.length < 8192) sb.append(c.toChar())
        }
    }

    private fun readFully(input: InputStream, n: Int): ByteArray {
        val buf = ByteArray(n)
        var read = 0
        while (read < n) {
            val r = input.read(buf, read, n - read)
            if (r <= 0) break
            read += r
        }
        return if (read == n) buf else buf.copyOf(read)
    }

    private fun readAll(input: InputStream): ByteArray {
        val out = ByteArrayOutputStream(64 * 1024)
        val buf = ByteArray(16 * 1024)
        while (true) {
            val n = input.read(buf)
            if (n <= 0) break
            out.write(buf, 0, n)
        }
        return out.toByteArray()
    }

    private fun parseQuery(raw: String): Map<String, String> {
        val out = HashMap<String, String>()
        for (part in raw.split('&')) {
            if (part.isEmpty()) continue
            val i = part.indexOf('=')
            val k = if (i < 0) part else part.substring(0, i)
            val v = if (i < 0) "" else part.substring(i + 1)
            runCatching { out[URLDecoder.decode(k, "UTF-8")] = URLDecoder.decode(v, "UTF-8") }
        }
        return out
    }

    /** The address the tablet will actually reach this on. Wi-Fi first. */
    fun lanIp(): String = runCatching {
        val addrs = ArrayList<Pair<String, String>>()
        for (nif in NetworkInterface.getNetworkInterfaces()) {
            if (!nif.isUp || nif.isLoopback) continue
            for (a in nif.inetAddresses) {
                if (a is Inet4Address && !a.isLoopbackAddress && !a.isLinkLocalAddress) {
                    addrs.add(nif.name to (a.hostAddress ?: ""))
                }
            }
        }
        (addrs.firstOrNull { it.first.startsWith("wlan") } ?: addrs.firstOrNull())?.second ?: "0.0.0.0"
    }.getOrDefault("0.0.0.0")

    private fun isoNow(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).format(Date())
}
