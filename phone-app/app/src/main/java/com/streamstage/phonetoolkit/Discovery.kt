package com.streamstage.phonetoolkit

import java.io.ByteArrayOutputStream
import java.net.ConnectException
import java.net.HttpURLConnection
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.NoRouteToHostException
import java.net.SocketTimeoutException
import java.net.URL
import java.net.UnknownHostException
import java.util.concurrent.ExecutorCompletionService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import org.json.JSONObject

/**
 * A server we can actually reach, and WHICH ONE OF THE TWO it is.
 *
 * Ported from ../tablet-app/Discovery.kt's KioskHost, with [mode] added. The mode travels with
 * the host because everything downstream differs by it: the page path, whether there is a
 * telemetry port at all, which origins the WebView may talk to, and which SharedPreferences keys
 * this host is written under.
 *
 * `host` is the address WE connected to, never the `ip` the server reports about itself. They
 * differ whenever the phone reaches the laptop by some other route (an emulator's 10.0.2.2
 * alias, a second NIC, a hotspot NAT). Loading the server's self-reported IP in that situation
 * gives a page that cannot load — so it is kept only as a hint for the operator panel.
 */
data class ServerHost(
    val mode: Mode,
    val host: String,
    val port: Int,
    val reportedIp: String? = null
) {
    val origin: String get() = "http://$host:$port"

    /**
     * serve.py's second listener, one port up: /log and /events live there (serve.py:26).
     * MEANINGLESS IN PRESENTER MODE — presenter-server.py has one listener and no telemetry
     * sink at all, which is why every caller checks [Mode.hasTelemetryPort] first.
     */
    val telemetryPort: Int get() = port + 1

    fun pageUrl(path: String): String = origin + (if (path.startsWith("/")) path else "/$path")

    override fun toString(): String = "$host:$port"
}

/**
 * FIND THE LAPTOP, WHATEVER SUBNET WE WOKE UP ON.
 *
 * Lifted wholesale from ../tablet-app/Discovery.kt — same two-stage sweep, same port walk, same
 * timeouts, same 48 threads. It is field-proven and this file deliberately does not re-invent it.
 * The ONLY change is that every probe now carries a [Mode], so it asks that mode's own probe path
 * ([Mode.probePath]) and accepts the answer only if that mode's own detector recognises it
 * ([Mode.identify]).
 *
 * That last part matters more here than on the tablet: BOTH servers answer GET /state, with
 * completely different bodies, and they are frequently on the same laptop. A sweep that merely
 * looked for "something HTTP on 8080-ish" would connect the deck remote to the booth TV server.
 *
 * ON THE EVENT DAY THE NETWORK IS A PHONE HOTSPOT and every address changes (192.168.43.x is the
 * usual Android hotspot range, but it is not assumed anywhere). Nothing in this file contains a
 * hardcoded target address: the subnet is read off this phone's own interface at run time.
 */
object Discovery {

    /**
     * THE PORT SCHEME, READ OFF THE TWO SERVERS — NOT GUESSED.
     *
     * serve.py:203 `pick_ports(want=8080, tries=20)` takes the first port at or above 8080 where
     * BOTH it and it+1 are free, stepping by two: 8080, 8082 … 8118. presenter-server.py:24
     * defaults to 8090 and walks with its own `pick_port`. An operator can pass --port and land
     * anywhere. So: do not enumerate lucky numbers, walk the whole window.
     *
     * (The tablet's bug worth remembering: its old build probed [8080, 8180, 8090, 8000, 8888]
     * and the kiosk was on 8081. The server answered perfectly and was never asked.)
     */
    private const val BASE_PORT = 8080
    private const val WALK_SPAN = 40                    // 8080..8119

    /** Extra ports documented elsewhere in this project, or cheap habits. 8090 is the deck's. */
    private val EXTRA_PORTS = listOf(8180, 8090, 8000, 8888, 9000, 8008)

    /** Everything worth trying on a host we already believe is alive. Ordered by likelihood. */
    val WALK_PORTS: List<Int> = LinkedHashSet<Int>().apply {
        addAll((0 until WALK_SPAN).map { BASE_PORT + it })
        addAll(EXTRA_PORTS)
    }.toList()

    /** Human summary of the walk, for the on-screen panel. */
    const val PORTS_HUMAN = "8080-8119, 8180, 8090, 8000, 8888, 9000, 8008"

    // Direct probe of a host we already believe in: generous, it is one request.
    private const val DIRECT_CONNECT_MS = 1500
    private const val DIRECT_READ_MS = 2500

    // Sweep probe: every millisecond is multiplied by 254.
    private const val SCAN_CONNECT_MS = 500
    private const val SCAN_READ_MS = 800

    /**
     * 48 threads, unchanged from the tablet. They are almost entirely blocked on a socket rather
     * than running, and the two-stage sweep is what actually made this cheap.
     */
    private const val SCAN_THREADS = 48

    /** What a sweep learned, whether or not it found anything. The panel renders this. */
    data class ScanReport(
        val mode: Mode,
        val base: String,
        val addressesTried: Int,
        val aliveHosts: List<String>,
        val found: ServerHost?
    )

    @Volatile
    var lastReport: ScanReport? = null
        private set

    /** The address range the last sweep covered, for the on-screen panel. */
    @Volatile
    var lastSubnet: String? = null
        private set

    @Volatile
    var lastLocalIp: String? = null
        private set

    @Volatile
    var lastInterface: String? = null
        private set

    // ------------------------------------------------------------------- probe

    /** A probe and its verdict, returned together so a caller never re-reads shared state. */
    data class ProbeResult(val attempt: Diag.Attempt, val server: ServerHost?) {
        /**
         * "Did anything at all answer?" — a refusal proves the HOST is up even though the PORT is
         * shut, and that is the signal the two-stage sweep is built on.
         */
        val provesHostAlive: Boolean
            get() = attempt.outcome == Diag.Outcome.OK ||
                attempt.outcome == Diag.Outcome.REFUSED ||
                attempt.outcome == Diag.Outcome.HTTP ||
                attempt.outcome == Diag.Outcome.WRONG_SERVER
    }

    fun probe(
        mode: Mode,
        host: String,
        port: Int,
        connectMs: Int = DIRECT_CONNECT_MS,
        readMs: Int = DIRECT_READ_MS
    ): ServerHost? = probeDetailed(mode, host, port, connectMs, readMs).server

    // ------------------------------------------------------------- name resolution

    /**
     * NAMES THAT ANDROID CANNOT RESOLVE, ANSWERED ONCE INSTEAD OF FORTY-SEVEN TIMES.
     *
     * HostStore.parse accepts a bare hostname, so an operator can type `DART` — the laptop's
     * Windows name, which is what everyone at the booth calls it. Android has no NetBIOS and no
     * mDNS for that name, so it never resolves. Before this, a saved `DART:8090` cost a DNS
     * lookup per probe: the saved-host probe, then the full port walk, then two probes on every
     * address in the sweep — seconds of overlay at every launch, for a name that could never work.
     *
     * One lookup decides it for the whole locate(), the cache is cleared at the top of every
     * locate() (the network may genuinely have changed), and an IPv4 literal never goes near a
     * resolver at all.
     */
    private val unresolvable = java.util.Collections.synchronizedSet(HashSet<String>())

    fun isIpv4Literal(host: String): Boolean {
        val parts = host.split(".")
        return parts.size == 4 && parts.all { p -> p.isNotEmpty() && p.all { it.isDigit() } && (p.toIntOrNull() ?: 256) <= 255 }
    }

    /** False only when this is a NAME and this network has already failed to resolve it. */
    fun resolves(host: String): Boolean {
        if (isIpv4Literal(host)) return true
        if (unresolvable.contains(host)) return false
        return try {
            java.net.InetAddress.getByName(host)
            true
        } catch (_: UnknownHostException) {
            unresolvable.add(host)
            Diag.e("'$host' is a NAME and this network cannot resolve it. Android has no NetBIOS " +
                "and no mDNS for a Windows machine name — type the laptop's IP address instead " +
                "(e.g. 192.168.0.13:8081).")
            false
        } catch (_: Throwable) {
            true                    // any other failure is the probe's business, not ours
        }
    }

    /** Forget what did not resolve — a new Wi-Fi may well resolve it. */
    fun forgetUnresolvable() = unresolvable.clear()

    /**
     * GET this mode's probe path and let [Mode.identify] decide whether the answer really is this
     * mode's server. Every call — including the failures, and WHY they failed — lands in Diag.
     * That record is the only thing standing between Daniel and a blank screen on a stage.
     */
    fun probeDetailed(
        mode: Mode,
        host: String,
        port: Int,
        connectMs: Int = DIRECT_CONNECT_MS,
        readMs: Int = DIRECT_READ_MS
    ): ProbeResult {
        val started = System.currentTimeMillis()
        val path = mode.probePath
        // A name this network cannot resolve is decided once, not once per port. See [resolves].
        if (!resolves(host)) {
            val a = Diag.Attempt(mode, host, port, path, Diag.Outcome.UNREACHABLE,
                "hostname does not resolve on this network", System.currentTimeMillis() - started)
            Diag.attempt(a)
            return ProbeResult(a, null)
        }
        var conn: HttpURLConnection? = null
        var outcome = Diag.Outcome.ERROR
        var detail = ""
        var result: ServerHost? = null
        try {
            conn = (URL("http://$host:$port$path").openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = connectMs
                readTimeout = readMs
                useCaches = false
                instanceFollowRedirects = false
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Connection", "close")
            }
            val code = conn.responseCode
            if (code != 200) {
                outcome = Diag.Outcome.HTTP
                detail = "HTTP $code"
            } else {
                val body = conn.inputStream.use { readCapped(it, 16 * 1024) }
                val json = try { JSONObject(body) } catch (_: Throwable) { null }
                if (json == null) {
                    outcome = Diag.Outcome.WRONG_SERVER
                    detail = "not JSON"
                } else {
                    val who = mode.identify(json)
                    if (who == null) {
                        outcome = Diag.Outcome.WRONG_SERVER
                        // Naming the OTHER server when it is the other server saves a lot of
                        // standing-at-a-booth confusion: they run on adjacent ports.
                        detail = mode.other.identify(json)
                            ?.let { "this is the ${mode.other.label} server (${mode.other.serverName})" }
                            ?: "not ${mode.serverName}"
                    } else {
                        outcome = Diag.Outcome.OK
                        detail = who
                        result = ServerHost(mode, host, port, mode.reportedIp(json))
                    }
                }
            }
        } catch (t: Throwable) {
            outcome = classify(t)
            detail = t.javaClass.simpleName + (t.message?.let { ": $it" } ?: "")
        } finally {
            try { conn?.disconnect() } catch (_: Throwable) {}
        }
        val attempt = Diag.Attempt(
            mode, host, port, path, outcome, detail, System.currentTimeMillis() - started
        )
        Diag.attempt(attempt)
        return ProbeResult(attempt, result)
    }

    private fun classify(t: Throwable): Diag.Outcome = when {
        t is SocketTimeoutException -> Diag.Outcome.TIMEOUT
        t is NoRouteToHostException -> Diag.Outcome.UNREACHABLE
        t is UnknownHostException -> Diag.Outcome.UNREACHABLE
        t is ConnectException && (t.message ?: "").contains("refused", true) -> Diag.Outcome.REFUSED
        t is ConnectException && (t.message ?: "").contains("unreachable", true) -> Diag.Outcome.UNREACHABLE
        t is ConnectException && (t.message ?: "").contains("timeout", true) -> Diag.Outcome.TIMEOUT
        t is ConnectException -> Diag.Outcome.REFUSED
        else -> Diag.Outcome.ERROR
    }

    private fun readCapped(input: java.io.InputStream, cap: Int): String {
        val out = ByteArrayOutputStream()
        val buf = ByteArray(2048)
        while (out.size() < cap) {
            val n = input.read(buf)
            if (n <= 0) break
            out.write(buf, 0, n)
        }
        return out.toString("UTF-8")
    }

    // --------------------------------------------------------------- interfaces

    /**
     * This phone's own IPv4. Wi-Fi first. On the event day the laptop is on a phone hotspot, so
     * the address here is whatever DHCP handed out that morning and the /24 around it is the
     * only honest place to look. Nothing is assumed about the number.
     */
    fun localIPv4(): String? {
        val addrs = ArrayList<Pair<String, String>>()   // interface name -> address
        try {
            for (nif in NetworkInterface.getNetworkInterfaces()) {
                if (!nif.isUp || nif.isLoopback) continue
                for (addr in nif.inetAddresses) {
                    if (addr is Inet4Address && !addr.isLoopbackAddress && !addr.isLinkLocalAddress) {
                        addrs.add(nif.name to addr.hostAddress.orEmpty())
                    }
                }
            }
        } catch (t: Throwable) {
            Diag.w("interface enumeration failed: ${t.message}")
        }
        if (addrs.isEmpty()) {
            lastLocalIp = null
            lastInterface = null
            return null
        }
        val pick = rank(addrs).first()
        lastInterface = pick.first
        lastLocalIp = pick.second
        if (addrs.size > 1) {
            Diag.i("interfaces: " + addrs.joinToString(", ") { "${it.first}=${it.second}" } +
                " -> using ${pick.first}")
        }
        return pick.second
    }

    /**
     * WHICH WIRE TO SWEEP FIRST — and this order is the hotspot decision, not a style choice.
     *
     * **The show network is expected to be a hotspot run from this very phone, with DART joining
     * as a client.** When the phone is the access point, the booth laptop is NOT on `wlan0` — it
     * is on the AP interface (`ap0` / `swlan0` / `softap0`, address usually 192.168.43.1 for us,
     * though nothing here assumes that number). A phone can easily have both up at once: hotspot
     * serving the booth AND station Wi-Fi or mobile data. Sweeping `wlan0` first in that state
     * searches the wrong network and finds nothing, which is precisely the "discovery broke and
     * there was no way past it" failure this app is built to not repeat.
     *
     * So: AP interfaces first, station Wi-Fi second, USB tether third, wired fourth, mobile data
     * (rmnet*) last — and [locate] sweeps ALL of them rather than betting on one.
     */
    fun rank(addrs: List<Pair<String, String>>): List<Pair<String, String>> {
        fun score(name: String): Int = when {
            name.startsWith("ap") || name.startsWith("swlan") || name.startsWith("softap") -> 0
            name.startsWith("wlan") -> 1
            name.startsWith("rndis") || name.startsWith("usb") -> 2
            name.startsWith("eth") || name.startsWith("enp") -> 3
            name.startsWith("rmnet") || name.startsWith("ccmni") -> 5   // cellular: never useful
            else -> 4
        }
        return addrs.sortedBy { score(it.first) }
    }

    /** Every interface this phone has, best candidate first. Used by [locate]. */
    fun preferredOrder(): List<Pair<String, String>> {
        val addrs = ArrayList<Pair<String, String>>()
        try {
            for (nif in NetworkInterface.getNetworkInterfaces()) {
                if (!nif.isUp || nif.isLoopback) continue
                for (addr in nif.inetAddresses) {
                    if (addr is Inet4Address && !addr.isLoopbackAddress && !addr.isLinkLocalAddress) {
                        addrs.add(nif.name to addr.hostAddress.orEmpty())
                    }
                }
            }
        } catch (t: Throwable) {
            Diag.w("interface enumeration failed: ${t.message}")
        }
        val sorted = rank(addrs)
        sorted.firstOrNull()?.let { lastInterface = it.first; lastLocalIp = it.second }
        return sorted
    }

    /** Every non-loopback IPv4 this phone has, for the panel. A subnet mismatch must be obvious. */
    fun allLocalIPv4(): List<String> {
        val out = ArrayList<String>()
        try {
            for (nif in NetworkInterface.getNetworkInterfaces()) {
                if (!nif.isUp || nif.isLoopback) continue
                for (addr in nif.inetAddresses) {
                    if (addr is Inet4Address && !addr.isLoopbackAddress && !addr.isLinkLocalAddress) {
                        out.add("${nif.name} ${addr.hostAddress}")
                    }
                }
            }
        } catch (_: Throwable) {}
        return out
    }

    /** "192.168.43.16" -> "192.168.43." — we sweep the /24 around ourselves, whatever the mask. */
    fun subnetBase(ip: String): String? {
        val parts = ip.split(".")
        if (parts.size != 4) return null
        return "${parts[0]}.${parts[1]}.${parts[2]}."
    }

    // ------------------------------------------------------------------- sweep

    /**
     * Sweep the local /24 for THIS MODE's server, in two stages.
     *
     * STAGE 1 asks every address for this mode's seed ports only ([Mode.seedPorts]). A dead
     * address costs two connect timeouts and nothing more — which is the fix for the old tablet
     * build, where a dead address cost one timeout PER PORT, so adding ports made the sweep
     * quadratically slower, so the port list stayed short, so the real port was never asked.
     *
     * STAGE 2 takes only the addresses that PROVED THEY ARE ALIVE in stage 1 — a refusal is
     * proof: the host answered, it just had nothing on that port — and walks the full
     * [WALK_PORTS] range on them. A refusal returns in microseconds, so walking 46 ports on
     * three live hosts is free, and the server is found wherever it fell forward to.
     */
    fun scan(
        mode: Mode,
        base: String,
        preferPorts: List<Int> = emptyList(),
        cancelled: AtomicBoolean = AtomicBoolean(false),
        onProgress: ((String) -> Unit)? = null
    ): ServerHost? {
        lastSubnet = "${base}1-254"
        val seeds = LinkedHashSet<Int>().apply {
            addAll(preferPorts)
            addAll(mode.seedPorts)
        }.toList()

        Diag.i("sweep stage 1 (${mode.label}): ${base}1-254 on ports ${seeds.joinToString(",")} " +
            "asking ${mode.probePath}")
        onProgress?.invoke("Searching ${base}1-254 for ${mode.serverName} …")

        val pool = Executors.newFixedThreadPool(SCAN_THREADS)
        val alive = java.util.Collections.synchronizedList(ArrayList<String>())
        var found: ServerHost? = null
        val done = AtomicInteger(0)

        try {
            val ecs = ExecutorCompletionService<ServerHost?>(pool)
            val hosts = (1..254).map { base + it }
            for (h in hosts) {
                ecs.submit(java.util.concurrent.Callable<ServerHost?> {
                    try {
                        var hit: ServerHost? = null
                        for (p in seeds) {
                            if (cancelled.get() || Thread.currentThread().isInterrupted) break
                            val r = probeDetailed(mode, h, p, SCAN_CONNECT_MS, SCAN_READ_MS)
                            if (r.server != null) { hit = r.server; break }
                            if (r.provesHostAlive) {
                                synchronized(alive) { if (!alive.contains(h)) alive.add(h) }
                            }
                        }
                        hit
                    } finally {
                        val d = done.incrementAndGet()
                        if (d % 16 == 0) onProgress?.invoke("Searching ${base}1-254 …  $d/254")
                    }
                })
            }

            var seen = 0
            while (seen < hosts.size) {
                if (cancelled.get()) break
                val f = ecs.poll(1, TimeUnit.SECONDS) ?: continue
                seen++
                val r = try { f.get() } catch (_: Throwable) { null }
                if (r != null) { found = r; break }
            }
        } catch (_: InterruptedException) {
        } finally {
            pool.shutdownNow()
        }

        val aliveSnapshot = alive.toList().sorted()
        Diag.i("sweep stage 1 done: ${done.get()} addresses probed, ${aliveSnapshot.size} host(s) alive" +
            if (aliveSnapshot.isEmpty()) "" else " (${aliveSnapshot.joinToString(", ")})")

        // ---- stage 2: walk the whole port range on the handful of hosts that are really there
        if (found == null && !cancelled.get() && aliveSnapshot.isNotEmpty()) {
            Diag.i("sweep stage 2: full port walk on ${aliveSnapshot.size} live host(s)")
            onProgress?.invoke("Found ${aliveSnapshot.size} device(s). Checking every port…")
            outer@ for (h in aliveSnapshot) {
                for (p in WALK_PORTS) {
                    if (cancelled.get()) break@outer
                    if (p in seeds) continue           // already done in stage 1
                    val hit = probe(mode, h, p, SCAN_CONNECT_MS, SCAN_READ_MS)
                    if (hit != null) { found = hit; break@outer }
                }
            }
        }

        lastReport = ScanReport(mode, base, done.get(), aliveSnapshot, found)
        if (found != null) {
            Diag.i("DISCOVERY FOUND ${mode.label} at $found (it reports its own IP as ${found.reportedIp})")
        } else {
            Diag.e("discovery found no ${mode.serverName} on ${base}1-254")
        }
        return found
    }

    /**
     * The whole find-the-server sequence for ONE mode, cheapest step first:
     *   1. the exact host:port that worked last time IN THIS MODE (instant on a re-open, and
     *      instant on a mode switch — that is the whole point of the per-mode saved host),
     *   2. that same host across the FULL port walk (the operator moved the port, or the server
     *      fell forward because something else grabbed its default),
     *   3. a two-stage sweep of our own /24 (new hotspot, new DHCP lease, new everything).
     */
    fun locate(
        mode: Mode,
        saved: ServerHost?,
        cancelled: AtomicBoolean = AtomicBoolean(false),
        status: ((String) -> Unit)? = null
    ): ServerHost? {
        Diag.clearAttempts()
        forgetUnresolvable()            // a new network may resolve what the last one could not
        Diag.i("locate (${mode.label}): saved=${saved ?: "none"}")

        if (saved != null && saved.mode == mode && !resolves(saved.host)) {
            // The saved host is a name that goes nowhere. Do NOT spend the full port walk on it —
            // that walk is the ~25 seconds of overlay this app used to pay at every launch.
            status?.invoke("Saved address '${saved.host}' is a name this network cannot resolve. Searching…")
            Diag.w("skipping the saved host entirely: '${saved.host}' does not resolve")
        } else if (saved != null && saved.mode == mode) {
            status?.invoke("Checking $saved…")
            probe(mode, saved.host, saved.port)?.let {
                Diag.i("saved host still good: $it")
                return it
            }
            if (cancelled.get()) return null
            status?.invoke("$saved did not answer. Checking its other ports…")
            Diag.i("saved host $saved did not answer; walking ${WALK_PORTS.size} ports on it")
            for (p in WALK_PORTS) {
                if (cancelled.get()) return null
                if (p == saved.port) continue
                probe(mode, saved.host, p, SCAN_CONNECT_MS, SCAN_READ_MS)?.let {
                    Diag.i("saved host moved port: $it")
                    return it
                }
            }
        }

        if (cancelled.get()) return null

        // EVERY subnet this phone is on, AP interface first — see [rank]. On the event day this
        // phone is the hotspot and the booth laptop is a client on the AP interface, while wlan0
        // or mobile data may well be up at the same time pointing somewhere useless. Betting on
        // one interface is how you sweep the wrong wire; so sweep them all, best first, and stop
        // at the first hit.
        val ifaces = preferredOrder()
        if (ifaces.isEmpty()) {
            Diag.e("this phone has no LAN address — it is not on a network at all")
            status?.invoke("This phone has no network address at all.")
            lastSubnet = null
            lastReport = ScanReport(mode, "(no network)", 0, emptyList(), null)
            return null
        }

        val bases = LinkedHashSet<String>()
        for ((name, ip) in ifaces) {
            val b = subnetBase(ip) ?: continue
            if (bases.add(b)) Diag.i("will sweep ${b}1-254 (from $name = $ip)")
        }
        if (bases.isEmpty()) {
            Diag.e("could not work out a subnet from any of: ${ifaces.joinToString(", ") { it.second }}")
            return null
        }

        val allBases = bases.joinToString(", ") { "${it}1-254" }
        Diag.i("this phone is ${lastLocalIp} on ${lastInterface}; sweeping $allBases")

        var found: ServerHost? = null
        val aliveAll = LinkedHashSet<String>()
        var triedAll = 0
        for (b in bases) {
            if (cancelled.get()) break
            found = scan(mode, b, listOfNotNull(saved?.port), cancelled, status)
            lastReport?.let { triedAll += it.addressesTried; aliveAll.addAll(it.aliveHosts) }
            if (found != null) break
        }

        // One combined report, so the on-screen panel shows what was really covered rather than
        // just the last subnet tried.
        lastSubnet = allBases
        lastReport = ScanReport(mode, allBases, triedAll, aliveAll.toList().sorted(), found)
        return found
    }
}
