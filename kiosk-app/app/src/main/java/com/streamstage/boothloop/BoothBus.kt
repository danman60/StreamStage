package com.streamstage.boothloop

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.HttpURLConnection
import java.net.InetSocketAddress
import java.net.URL
import java.nio.charset.StandardCharsets

/**
 * Lets the booth tablet drive this stick — **without the loop ever depending on it.**
 *
 * ## The thing that must not break
 *
 * This app exists because the booth needs a screen that plays with no laptop, no wifi, no router
 * and nobody standing there. Adding a remote control to it is only acceptable if that sentence
 * stays true, so every line in this file is written to the same rule:
 *
 *  - **Nothing here is on the playback path.** [BoothLoopActivity.startPlayback] reads the local
 *    folder and hands ExoPlayer `file://` URIs, exactly as it did before this file existed.
 *  - **Everything here runs on its own daemon threads**, and every one of them is wrapped. A
 *    throw in discovery, in the stream, or in a publish kills nothing but its own attempt.
 *  - **No kiosk is not an error.** No beacon, no saved address, a laptop that never came up: this
 *    quietly retries in the background forever and the TV shows the reel with nothing on it about
 *    a network. There is no dialog, no toast, no banner, no "disconnected" screen.
 *  - **Losing the kiosk mid-show is a non-event.** The reel is already playing; the stream drops,
 *    this reconnects with a backoff, and the picture never changes.
 *
 * ## What it does when a kiosk IS there
 *
 * `serve.py` is a relay: `GET /bus` is a Server-Sent Events stream, `POST /bus` publishes to it.
 * The stick becomes one more screen on that bus — the same one `tv.html` is on — so the tablet
 * and the phone drive it with the messages they already send. See `phone-app/BUS-CONTRACT.md`;
 * this implements the verbs that mean something on a looping booth screen.
 *
 * It also **publishes its own state back**, in the same retained `tv` shape the browser TV uses,
 * on a 1 s heartbeat. That is what stops the tablet and the phone saying "no screen attached"
 * while the stick is, in fact, the screen.
 *
 * ## Finding the kiosk
 *
 * In order, cheapest first:
 *
 *  1. **The UDP beacon** on port 45454 (`expo-assets/kiosk/BEACON.md`) — the kiosk shouts its
 *     host and port every 2 s. Usually this fires within a couple of seconds of the app starting.
 *  2. **The address that worked last time**, remembered in app-private storage. This is what makes
 *     a stick that boots before the laptop find it anyway, and what covers a router that eats
 *     broadcast.
 *  3. **An address typed on the remote**, from the update panel.
 *
 * Nothing anywhere hardcodes `192.168.0.x`. On the venue's phone hotspot every address changes
 * between one morning and the next, which is exactly why the beacon exists.
 */
object BoothBus {

    private const val TAG = "BoothLoop/Bus"

    /** `expo-assets/kiosk/BEACON.md`: UDP broadcast, port 45454, magic `ss:"kiosk"`. */
    private const val BEACON_PORT = 45454
    private const val BEACON_MAGIC = "kiosk"

    /** Where the last working kiosk address is remembered. */
    private const val SAVED = "kiosk-host.txt"

    private const val CONNECT_TIMEOUT_MS = 4_000
    /** The relay sends `: ping` every 15 s, so silence past this is a dead stream, not a quiet one. */
    private const val STREAM_READ_TIMEOUT_MS = 45_000
    private const val POST_TIMEOUT_MS = 4_000

    private const val HEARTBEAT_MS = 1_000L
    private const val RECONNECT_MIN_MS = 2_000L
    private const val RECONNECT_MAX_MS = 30_000L

    // ------------------------------------------------------------------ types

    /** A command off the bus, already reduced to something a looping booth screen can obey. */
    sealed class Command {
        /** Cut to a film now, by media basename (no `.mp4`). */
        data class Play(val film: String) : Command()
        object Pause : Command()
        object Resume : Command()
        /** Abandon a commanded film and let the loop carry on. */
        object Stop : Command()
        /** Reorder the reel. Basenames; unknown ids ignored; does not start playback. */
        data class Playlist(val order: List<String>) : Command()
        data class Mute(val on: Boolean) : Command()
        /** Toggle the on-screen diagnostic line. */
        object Hud : Command()
    }

    /** The `tv` message, built on the main thread and sent from the bus thread. */
    data class TvState(
        val state: String,
        val product: String?,
        val pos: Double,
        val dur: Double,
        val muted: Boolean,
        val paused: Boolean,
        val order: List<String>,
        val warm: Int
    )

    interface Listener {
        /** Main thread. */
        fun onBusCommand(command: Command)
        /** Main thread. Purely so the panel can show it; nothing on the TV changes. */
        fun onBusStatus(connected: Boolean, host: String?)
    }

    // ------------------------------------------------------------------ state

    private val main = Handler(Looper.getMainLooper())

    @Volatile private var listener: Listener? = null
    @Volatile private var appContext: Context? = null
    @Volatile private var running = false

    /** `http://host:port` of the kiosk we are talking to, or null. */
    @Volatile private var base: String? = null
    @Volatile var connected: Boolean = false
        private set

    /** Set by the panel when Daniel types an address; tried ahead of everything else. */
    @Volatile private var manual: String? = null

    /** Latest state to publish. Written on the main thread, read by the heartbeat thread. */
    @Volatile private var tv: TvState? = null

    /** Cosmetic, for the panel: what discovery is currently doing. */
    @Volatile var status: String = "not started"
        private set

    private var streamThread: Thread? = null
    private var beatThread: Thread? = null

    // ------------------------------------------------------------------ lifecycle

    /**
     * Start looking for a kiosk and keep looking forever. Safe to call more than once.
     *
     * Returns immediately. Nothing about the reel waits for any of this.
     */
    fun start(context: Context, l: Listener) {
        appContext = context.applicationContext
        listener = l
        if (running) return
        running = true
        status = "looking for the booth kiosk"

        streamThread = thread("BoothBusStream") { streamLoop() }
        beatThread = thread("BoothBusBeat") { beatLoop() }
        Log.i(TAG, "Bus client started")
    }

    fun stop() {
        running = false
        connected = false
        base = null
        listener = null
        status = "stopped"
        // The threads are daemons blocked on a socket read; they notice `running` on the next
        // loop and end. Nothing waits for them, and nothing they could still do matters.
    }

    private fun thread(name: String, body: () -> Unit): Thread =
        Thread({ runCatching(body).onFailure { Log.w(TAG, "$name died", it) } }, name).apply {
            isDaemon = true
            priority = Thread.MIN_PRIORITY   // never competes with the decoder
            start()
        }

    /** Main thread. The activity's own ticker calls this; the heartbeat sends whatever is latest. */
    fun setState(s: TvState) {
        tv = s
    }

    /** Panel: try this address first, and remember it. */
    fun useHost(host: String, port: Int) {
        manual = "http://$host:$port"
        base = null
        connected = false
        status = "trying $host:$port"
        Log.i(TAG, "Manual kiosk address: $manual")
    }

    /** Panel: forget the saved address and go back to listening for a beacon. */
    fun forgetHost() {
        manual = null
        base = null
        connected = false
        runCatching { savedFile()?.delete() }
        status = "looking for the booth kiosk"
    }

    fun currentHost(): String? = base ?: manual

    // ------------------------------------------------------------------ discovery

    private fun savedFile(): File? = appContext?.let { File(it.filesDir, SAVED) }

    private fun loadSaved(): String? = runCatching {
        savedFile()?.takeIf { it.isFile && it.length() < 256 }?.readText()?.trim()?.ifEmpty { null }
    }.getOrNull()

    private fun remember(url: String) {
        runCatching { savedFile()?.writeText(url) }
            .onFailure { Log.w(TAG, "Could not remember the kiosk address", it) }
    }

    /**
     * Listen for one beacon datagram.
     *
     * A `MulticastLock` is held around it: on a lot of Android wifi stacks, broadcast frames are
     * filtered out in the driver to save power unless something asks for them, and a Fire Stick
     * sitting idle showing a reel is exactly the state that filtering is designed for. Without
     * the lock this works on some devices and silently never fires on others.
     *
     * @return `http://host:port`, or null if nothing said anything in [timeoutMs].
     */
    private fun listenForBeacon(timeoutMs: Int): String? {
        val ctx = appContext ?: return null
        var lock: WifiManager.MulticastLock? = null
        return try {
            lock = runCatching {
                val wm = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
                wm.createMulticastLock("BoothLoopBeacon").apply {
                    setReferenceCounted(false)
                    acquire()
                }
            }.getOrNull()

            DatagramSocket(null).apply {
                reuseAddress = true
                broadcast = true
                soTimeout = timeoutMs
                bind(InetSocketAddress(BEACON_PORT))
            }.use { sock ->
                val buf = ByteArray(4096)
                val deadline = System.currentTimeMillis() + timeoutMs
                while (running && System.currentTimeMillis() < deadline) {
                    val p = DatagramPacket(buf, buf.size)
                    sock.receive(p)                       // SocketTimeoutException ends this
                    val text = String(p.data, 0, p.length, StandardCharsets.UTF_8)
                    val o = runCatching { JSONObject(text) }.getOrNull() ?: continue
                    // Rule 1 of BEACON.md: match on `ss` before parsing anything else.
                    if (o.optString("ss") != BEACON_MAGIC) continue
                    if (o.optInt("v", 0) != 1) continue   // rule 2: ignore a version we do not know
                    // Rule 3: `host` is authoritative, not the datagram's source address.
                    val host = o.optString("host", "")
                    val port = o.optInt("port", 0)
                    if (host.isEmpty() || port <= 0) continue
                    Log.i(TAG, "Beacon from $host:$port")
                    return "http://$host:$port"
                }
                null
            }
        } catch (t: Throwable) {
            // A timeout is the normal outcome, not a problem. Anything else is also not a problem:
            // the saved address is tried next and the reel never noticed any of this.
            null
        } finally {
            runCatching { lock?.release() }
        }
    }

    /**
     * A kiosk address written next to the films, as `host:port` or a full `http://host:port`.
     *
     * The same shape as `.update-base`: a dotfile in the media folder, so it is invisible to
     * `Playlist` and to anybody looking at the films. It exists because the two ways of telling a
     * stick where the kiosk is are otherwise a beacon (which a venue router can drop) and typing
     * an address on a D-pad (which is slow and easy to get wrong with a visitor waiting). This is
     * the third: one `adb push` while the stick is on the bench, and it is set for the show.
     *
     * It is only ever consulted *after* the beacon, so on a normal morning the beacon still wins
     * and a stale file cannot pin the stick to yesterday's laptop.
     */
    private fun fileHost(): String? = runCatching {
        val dir = mediaDirFor() ?: return null
        val f = File(dir, ".kiosk-host")
        if (!f.isFile || !f.canRead() || f.length() > 128) return null
        val raw = f.readText().trim()
        if (raw.isEmpty()) return null
        val url = if (raw.startsWith("http://") || raw.startsWith("https://")) raw else "http://$raw"
        url.trimEnd('/')
    }.getOrNull()

    /** Set by the activity so the bus can find the same folder the films are in. */
    @Volatile private var mediaDir: File? = null

    private fun mediaDirFor(): File? = mediaDir

    fun setMediaDir(dir: File) {
        mediaDir = dir
    }

    /** @return a base URL that answered `/health`, or null. */
    private fun findKiosk(): String? {
        manual?.let { if (health(it)) return it }
        listenForBeacon(3_000)?.let { if (health(it)) return it }
        fileHost()?.let { if (health(it)) return it }
        loadSaved()?.let { if (health(it)) return it }
        return null
    }

    private fun health(base: String): Boolean = runCatching {
        val conn = (URL("$base/health").openConnection() as HttpURLConnection).apply {
            connectTimeout = CONNECT_TIMEOUT_MS
            readTimeout = CONNECT_TIMEOUT_MS
            requestMethod = "GET"
            useCaches = false
            setRequestProperty("Connection", "close")
        }
        try {
            conn.responseCode == 200
        } finally {
            runCatching { conn.disconnect() }
        }
    }.onFailure {
        // Nothing goes on the screen — a missing kiosk is not an error to a visitor. But it
        // must not be invisible to US: this probe swallowing its reason is how a cleartext
        // policy that blocked every LAN address looked exactly like "no laptop today", and
        // the tablet-driven path stayed broken without a single line saying so.
        Log.w(TAG, "Kiosk probe failed for $base: ${it.javaClass.simpleName}: ${it.message}")
    }.getOrDefault(false)

    // ------------------------------------------------------------------ the stream

    private fun streamLoop() {
        var backoff = RECONNECT_MIN_MS
        while (running) {
            val found = findKiosk()
            if (found == null) {
                status = "no booth kiosk found — the loop is unaffected"
                announce(false, null)
                sleep(backoff)
                backoff = (backoff * 2).coerceAtMost(RECONNECT_MAX_MS)
                continue
            }
            base = found
            remember(found)
            backoff = RECONNECT_MIN_MS
            status = "connected to ${found.removePrefix("http://")}"
            connected = true
            announce(true, found.removePrefix("http://"))
            Log.i(TAG, "Subscribed to $found/bus")

            runCatching { readStream("$found/bus") }
                .onFailure { Log.i(TAG, "Bus stream ended: ${it.javaClass.simpleName}") }

            connected = false
            status = "lost the booth kiosk — reconnecting quietly"
            announce(false, null)
            Log.i(TAG, "Bus disconnected — the reel is unaffected")
            sleep(RECONNECT_MIN_MS)
        }
    }

    /** Blocks until the stream dies. Bus thread only. */
    private fun readStream(url: String) {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = CONNECT_TIMEOUT_MS
            readTimeout = STREAM_READ_TIMEOUT_MS
            requestMethod = "GET"
            useCaches = false
            setRequestProperty("Accept", "text/event-stream")
            setRequestProperty("Accept-Encoding", "identity")
            setRequestProperty("User-Agent", "StreamStageBoothLoop")
        }
        try {
            if (conn.responseCode != 200) throw IllegalStateException("bus said ${conn.responseCode}")
            BufferedReader(InputStreamReader(conn.inputStream, StandardCharsets.UTF_8)).use { r ->
                while (running) {
                    val line = r.readLine() ?: break
                    // The relay writes `data: {...}\n\n`, plus `: ping` and `: connected` comments.
                    if (!line.startsWith("data:")) continue
                    val body = line.substring(5).trim()
                    if (body.isEmpty()) continue
                    val o = runCatching { JSONObject(body) }.getOrNull() ?: continue
                    handle(o)
                }
            }
        } finally {
            runCatching { conn.disconnect() }
        }
    }

    /**
     * Turn one bus message into something the booth screen can do.
     *
     * Anything unrecognised is dropped in silence. A relay carrying a verb this build has never
     * heard of — the kiosk side adds them while shows are running — must be a no-op here, not a
     * crash and not a guess.
     */
    private fun handle(o: JSONObject) {
        // `{"type":"cmd","cmd":"pause"}` is an accepted alias for every command (BUS-CONTRACT §5.4).
        val type = when (val t = o.optString("type", "")) {
            "cmd" -> o.optString("cmd", "")
            else -> t
        }

        // ---- the two roles, enforced here as well as at the relay ----
        if (type !in setOf("tv", "ping", "") && !allowed(type, o)) {
            Log.w(TAG, "Refusing '$type' — it did not come from the operator")
            return
        }

        val cmd: Command? = when (type) {
            // A `tv` message is another screen describing itself. We are a screen; we do not
            // act on it, and we must never echo it.
            "tv", "ping", "" -> null

            "play" -> o.optString("product", "").takeIf { it.isNotEmpty() }?.let { Command.Play(it) }
            "playfilm" -> o.optString("film", "").takeIf { it.isNotEmpty() }?.let { Command.Play(it) }
            "pause" -> Command.Pause
            "resume" -> Command.Resume
            "stop" -> Command.Stop
            "playlist" -> Command.Playlist(strings(o.optJSONArray("order")))
            "mute" -> Command.Mute(o.optBoolean("on", true))
            "hud" -> Command.Hud
            // `fullscreen` is meaningless here — this app has no window chrome and no browser to
            // be outside of. Accepted and ignored on purpose, so the phone's button is not a
            // dead end that looks like a fault.
            "fullscreen" -> null
            else -> null
        }
        if (type == "ping") publishNow()          // "say what you are doing, now"
        if (cmd == null) return
        Log.i(TAG, "Bus command: $type")
        main.post { runCatching { listener?.onBusCommand(cmd) } }
    }

    /**
     * The two roles on this bus, and what each is allowed to do.
     *
     * **The tablet is the customer.** A visitor taps a tile, the tablet gates them and sends a
     * play, and this screen plays it. That is the whole of what a visitor surface may do.
     *
     * **The phone is the operator.** It stamps `"src":"phone"` (or `"origin":"operator"`) on
     * everything it sends and may do the lot: the operator-only film, the loop order, mute.
     *
     * This mirrors `serve.py` — `is_operator`, `OPERATOR_ONLY_FILMS`, `OPERATOR_ONLY_CMDS` — on
     * purpose and to the letter. The relay already refuses these with a `403` and never publishes
     * them, so in normal operation nothing forbidden ever reaches this method. It is enforced here
     * anyway because **a screen must not be more permissive than the relay in front of it**: the
     * day somebody points this stick at a relay running an older `serve.py`, or adds a second
     * transport, the booth TV's own answer should not suddenly be yes.
     *
     * Absence of `src` is a visitor, always. The tablet has never sent the field and must never
     * gain the operator-only film by omitting it.
     */
    private fun allowed(type: String, o: JSONObject): Boolean {
        if (isOperator(o)) return true
        // Visitor-reachable verbs. `stop` is deliberately here: the tablet's own "back to all six"
        // button has always sent it, and that is a visitor ending their own film.
        return when (type) {
            "play", "playfilm" -> film(o)?.lowercase() !in OPERATOR_ONLY_FILMS
            // `stop` ENDS a film and hands the screen back to the attract loop, which is a
            // visitor finishing with the booth. It stays open.
            "stop" -> true
            // Ordering the booth's loop, muting or un-fullscreening the screen in front of a
            // studio owner, and FREEZING it on one frame, are not things a visitor surface has
            // any business doing. `pause`/`resume` moved here 2026-08-07: a visitor-origin pause
            // was accepted and held the booth TV on a single frame with nothing on any visitor
            // surface able to release it.
            "playlist", "mute", "fullscreen", "hud", "pause", "resume" -> false
            else -> false
        }
    }

    /** `serve.py:OPERATOR_SRC`. */
    private val OPERATOR_SRC = setOf("phone", "operator")

    /** `serve.py:OPERATOR_ONLY_FILMS`. StreamStage's own sales film — the phone starts it or nobody. */
    private val OPERATOR_ONLY_FILMS = setOf("streamstage-services")

    private fun isOperator(o: JSONObject): Boolean =
        listOf("src", "origin").any { o.optString(it, "").trim().lowercase() in OPERATOR_SRC }

    /** `serve.py:film_of` — `product` is the older name for the same thing. */
    private fun film(o: JSONObject): String? =
        listOf("film", "product").firstNotNullOfOrNull { o.optString(it, "").ifEmpty { null } }

    private fun strings(a: JSONArray?): List<String> {
        if (a == null) return emptyList()
        val out = ArrayList<String>(a.length())
        for (i in 0 until a.length()) a.optString(i, "").takeIf { it.isNotEmpty() }?.let { out += it }
        return out
    }

    private fun announce(up: Boolean, host: String?) {
        main.post { runCatching { listener?.onBusStatus(up, host) } }
    }

    // ------------------------------------------------------------------ publishing

    /**
     * The 1 s heartbeat.
     *
     * `at` moving every second is what the phone uses to tell "the relay is up but no screen is
     * attached" from "the screen is alive" (BUS-CONTRACT §3). Making this lazy would silently
     * invert that diagnostic, which is the whole reason the tablet has been saying there is no
     * screen while a stick sat there playing.
     */
    private fun beatLoop() {
        while (running) {
            if (connected) runCatching { publishNow() }
            sleep(HEARTBEAT_MS)
        }
    }

    private fun publishNow() {
        val b = base ?: return
        val s = tv ?: return
        val body = JSONObject()
            .put("type", "tv")
            .put("state", s.state)
            .put("product", s.product ?: JSONObject.NULL)
            .put("pos", s.pos)
            .put("dur", s.dur)
            .put("muted", s.muted)
            .put("paused", s.paused)
            .put("warm", s.warm)
            .put("order", JSONArray(s.order))
            .put("at", System.currentTimeMillis())
            // Not part of the contract, and harmless to a parser that ignores unknown keys. It is
            // here so that when Daniel is looking at /state at 8am he can see *which* screen is
            // publishing, rather than assuming it is the browser TV.
            .put("_screen", "firestick")
        post("$b/bus", body)
    }

    private fun post(url: String, body: JSONObject): Boolean = runCatching {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = POST_TIMEOUT_MS
            readTimeout = POST_TIMEOUT_MS
            requestMethod = "POST"
            doOutput = true
            useCaches = false
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Connection", "close")
        }
        try {
            conn.outputStream.use { it.write(body.toString().toByteArray(StandardCharsets.UTF_8)) }
            conn.responseCode in 200..299
        } finally {
            runCatching { conn.disconnect() }
        }
    }.getOrDefault(false)

    private fun sleep(ms: Long) {
        runCatching { Thread.sleep(ms) }
    }
}
