package com.streamstage.boothtablet

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
 * A kiosk server we can actually reach.
 *
 * `host` is the address WE connected to, never the `ip` the server reports about itself.
 * They differ whenever the tablet reaches the laptop by some other route (an emulator's
 * 10.0.2.2 loopback alias, a second NIC, a hotspot NAT). Loading the server's self-reported
 * IP in that situation gives you a page that cannot load — so it is kept only as a hint for
 * the operator panel.
 */
data class KioskHost(val host: String, val port: Int, val reportedIp: String? = null) {
    val origin: String get() = "http://$host:$port"

    /** serve.py's second listener, one port up: /log and /lead live there. See serve.py:477. */
    val telemetryPort: Int get() = port + 1

    fun pageUrl(path: String): String = origin + (if (path.startsWith("/")) path else "/$path")

    override fun toString(): String = "$host:$port"
}

object Discovery {

    /**
     * THE PORT SCHEME, READ OFF serve.py — NOT GUESSED.
     *
     * serve.py:203 `pick_ports(want=8080, tries=20)` takes the first port at or above 8080 where
     * BOTH it and it+1 are free, stepping by two: 8080, 8082, 8084 … 8118. An operator can also
     * pass `--port` and land anywhere. The booth laptop this app is actually aimed at has two
     * stale presenter-server processes holding 8080, and its kiosk is on **8081** (telemetry
     * 8082) — an odd port, which the step-by-two walk cannot produce, so it was started by hand.
     *
     * The previous version of this file probed exactly [8080, 8180, 8090, 8000, 8888]. 8081 is
     * not in that list, which is the entire reason the tablet "cannot connect anywhere": the
     * server was answering perfectly and was never asked.
     *
     * So: do not enumerate lucky numbers. Walk serve.py's whole fallback window.
     */
    private const val BASE_PORT = 8080
    private const val WALK_SPAN = 40                    // 8080..8119, covers pick_ports' 20 x 2

    /** Extra ports that are documented elsewhere in this project or are cheap habits. */
    private val EXTRA_PORTS = listOf(8180, 8090, 8000, 8888, 9000, 8008)

    /** Everything worth trying on a host we already believe is alive. Ordered by likelihood. */
    val WALK_PORTS: List<Int> = LinkedHashSet<Int>().apply {
        addAll((0 until WALK_SPAN).map { BASE_PORT + it })
        addAll(EXTRA_PORTS)
    }.toList()

    /**
     * The two ports every address in the sweep gets, before we decide whether it is alive.
     * 8080 is serve.py's default; 8081 is where it actually is today. Two probes rather than
     * one because a single dropped packet must not write an address off.
     */
    private val SEED_PORTS = listOf(8080, 8081)

    // Direct probe of a host we already believe in: generous, it is one request.
    private const val DIRECT_CONNECT_MS = 1500
    private const val DIRECT_READ_MS = 2500

    // Sweep probe: every millisecond is multiplied by 254.
    private const val SCAN_CONNECT_MS = 500
    private const val SCAN_READ_MS = 800

    /**
     * 48 threads. Fire OS is the target and it is a modest device, but these threads are almost
     * entirely blocked on a socket, not running. This is the same figure the emulator build used
     * and it is deliberately NOT raised: the two-stage sweep below made the sweep cheap by
     * probing fewer things, which is the fix that actually works on weak hardware.
     */
    private const val SCAN_THREADS = 48

    /** What a sweep learned, whether or not it found anything. The panel renders this. */
    data class ScanReport(
        val base: String,
        val addressesTried: Int,
        val aliveHosts: List<String>,
        val found: KioskHost?
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

    /**
     * GET /health and decide whether the answer really is a booth kiosk.
     *
     * serve.py:348 answers {"ok":true,"ip":..,"port":..,"subscribers":..,"events":..,
     * "leads":..,"telemetryDir":..}. `subscribers`/`telemetryDir` are what separate it from
     * the many other things on a trade-show network that serve a bland /health.
     *
     * Every call records an Attempt in Diag — including the failures, and WHY they failed.
     * That record is the only thing standing between Daniel and a blank screen.
     */
    /** A probe and its verdict, returned together so a caller never has to re-read shared state. */
    data class ProbeResult(val attempt: Diag.Attempt, val kiosk: KioskHost?) {
        /**
         * "Did anything at all answer?" — a refusal proves the HOST is up even though the PORT is
         * shut, and that is the signal the two-stage sweep is built on.
         */
        val provesHostAlive: Boolean
            get() = attempt.outcome == Diag.Outcome.OK || attempt.outcome == Diag.Outcome.REFUSED ||
                attempt.outcome == Diag.Outcome.HTTP || attempt.outcome == Diag.Outcome.NOT_KIOSK
    }

    fun probe(
        host: String,
        port: Int,
        connectMs: Int = DIRECT_CONNECT_MS,
        readMs: Int = DIRECT_READ_MS
    ): KioskHost? = probeDetailed(host, port, connectMs, readMs).kiosk

    fun probeDetailed(
        host: String,
        port: Int,
        connectMs: Int = DIRECT_CONNECT_MS,
        readMs: Int = DIRECT_READ_MS
    ): ProbeResult {
        val started = System.currentTimeMillis()
        var conn: HttpURLConnection? = null
        var outcome = Diag.Outcome.ERROR
        var detail = ""
        var result: KioskHost? = null
        try {
            conn = (URL("http://$host:$port/health").openConnection() as HttpURLConnection).apply {
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
                val body = conn.inputStream.use { readCapped(it, 8 * 1024) }
                val json = try { JSONObject(body) } catch (_: Throwable) { null }
                when {
                    json == null -> {
                        outcome = Diag.Outcome.NOT_KIOSK
                        detail = "not JSON"
                    }
                    !json.optBoolean("ok", false) -> {
                        outcome = Diag.Outcome.NOT_KIOSK
                        detail = "no ok:true"
                    }
                    !json.has("ip") || !json.has("port") -> {
                        outcome = Diag.Outcome.NOT_KIOSK
                        detail = "missing ip/port"
                    }
                    !json.has("subscribers") && !json.has("telemetryDir") -> {
                        outcome = Diag.Outcome.NOT_KIOSK
                        detail = "not serve.py's /health"
                    }
                    else -> {
                        outcome = Diag.Outcome.OK
                        detail = "reports ${json.optString("ip")}:${json.optInt("port")}, " +
                            "${json.optInt("subscribers")} subscriber(s)"
                        result = KioskHost(host, port, json.optString("ip").takeIf { it.isNotBlank() })
                    }
                }
            }
        } catch (t: Throwable) {
            outcome = classify(t)
            detail = t.javaClass.simpleName + (t.message?.let { ": $it" } ?: "")
        } finally {
            try { conn?.disconnect() } catch (_: Throwable) {}
        }
        val attempt = Diag.Attempt(host, port, outcome, detail, System.currentTimeMillis() - started)
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
     * This device's own IPv4. Wi-Fi first, because that is what a booth tablet is on and a
     * tablet with USB tethering or a second interface must not be scanned down the wrong wire.
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
        val pick = addrs.firstOrNull { it.first.startsWith("wlan") }
            ?: addrs.firstOrNull { it.first.startsWith("ap") }
            ?: addrs.first()
        lastInterface = pick.first
        lastLocalIp = pick.second
        if (addrs.size > 1) {
            Diag.i("interfaces: " + addrs.joinToString(", ") { "${it.first}=${it.second}" } +
                " -> using ${pick.first}")
        }
        return pick.second
    }

    /** Every non-loopback IPv4 this device has, for the panel. A subnet mismatch must be obvious. */
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

    /** "10.0.2.16" -> "10.0.2." — we always sweep the /24 around ourselves, whatever the real mask is. */
    fun subnetBase(ip: String): String? {
        val parts = ip.split(".")
        if (parts.size != 4) return null
        return "${parts[0]}.${parts[1]}.${parts[2]}."
    }

    // ------------------------------------------------------------------- sweep

    /**
     * Sweep the local /24 for a kiosk server, in two stages.
     *
     * STAGE 1 asks every address for [SEED_PORTS] only. A dead address costs two connect
     * timeouts and nothing more — which is the fix for the old version, where a dead address
     * cost one timeout PER PORT and adding ports to the list made the sweep quadratically
     * slower. That is why the old list stayed short, and why 8081 never got on it.
     *
     * STAGE 2 takes only the addresses that PROVED THEY ARE ALIVE in stage 1 — a refusal is
     * proof; the host answered, it just had nothing on that port — and walks the full
     * [WALK_PORTS] range on them. A refusal comes back in microseconds, so walking 46 ports on
     * three live hosts is free, and the kiosk is found wherever serve.py fell forward to.
     */
    fun scan(
        base: String,
        preferPorts: List<Int> = emptyList(),
        cancelled: AtomicBoolean = AtomicBoolean(false),
        onProgress: ((String) -> Unit)? = null
    ): KioskHost? {
        lastSubnet = "${base}1-254"
        val seeds = LinkedHashSet<Int>().apply {
            addAll(preferPorts)
            addAll(SEED_PORTS)
        }.toList()

        Diag.i("sweep stage 1: ${base}1-254 on ports ${seeds.joinToString(",")}")
        onProgress?.invoke("Searching ${base}1-254 …")

        val pool = Executors.newFixedThreadPool(SCAN_THREADS)
        val alive = java.util.Collections.synchronizedList(ArrayList<String>())
        var found: KioskHost? = null
        val done = AtomicInteger(0)

        try {
            val ecs = ExecutorCompletionService<KioskHost?>(pool)
            val hosts = (1..254).map { base + it }
            for (h in hosts) {
                ecs.submit(java.util.concurrent.Callable<KioskHost?> {
                    try {
                        var hit: KioskHost? = null
                        for (p in seeds) {
                            if (cancelled.get() || Thread.currentThread().isInterrupted) break
                            val r = probeDetailed(h, p, SCAN_CONNECT_MS, SCAN_READ_MS)
                            if (r.kiosk != null) { hit = r.kiosk; break }
                            // A refusal proves the host exists even though it is not the kiosk.
                            // Stage 2 will walk every kiosk port on it.
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
            Diag.i("sweep stage 2: full port walk ${WALK_PORTS.first()}-${BASE_PORT + WALK_SPAN - 1} " +
                "(+${EXTRA_PORTS.joinToString(",")}) on ${aliveSnapshot.size} live host(s)")
            onProgress?.invoke("Found ${aliveSnapshot.size} device(s). Checking every kiosk port…")
            outer@ for (h in aliveSnapshot) {
                for (p in WALK_PORTS) {
                    if (cancelled.get()) break@outer
                    if (p in seeds) continue           // already done in stage 1
                    val hit = probe(h, p, SCAN_CONNECT_MS, SCAN_READ_MS)
                    if (hit != null) { found = hit; break@outer }
                }
            }
        }

        lastReport = ScanReport(base, done.get(), aliveSnapshot, found)
        if (found != null) {
            Diag.i("DISCOVERY FOUND $found (it reports its own IP as ${found.reportedIp})")
        } else {
            Diag.e("discovery found no kiosk on ${base}1-254")
        }
        return found
    }

    /**
     * The whole find-the-laptop sequence, cheapest step first:
     *   1. the exact host:port that worked last time (instant on a re-open),
     *   2. that same host across the FULL port walk (the operator moved the port, or serve.py
     *      fell forward because something else grabbed 8080 — which is exactly what happened),
     *   3. a two-stage sweep of our own /24 (the laptop got a new DHCP lease).
     */
    fun locate(
        saved: KioskHost?,
        cancelled: AtomicBoolean = AtomicBoolean(false),
        status: ((String) -> Unit)? = null
    ): KioskHost? {
        Diag.clearAttempts()
        Diag.i("locate: saved=${saved ?: "none"}")

        if (saved != null) {
            status?.invoke("Checking $saved…")
            probe(saved.host, saved.port)?.let {
                Diag.i("saved host still good: $it")
                return it
            }
            status?.invoke("$saved did not answer. Checking its other ports…")
            Diag.i("saved host ${saved} did not answer; walking ${WALK_PORTS.size} ports on it")
            for (p in WALK_PORTS) {
                if (cancelled.get()) return null
                if (p == saved.port) continue
                probe(saved.host, p, SCAN_CONNECT_MS, SCAN_READ_MS)?.let {
                    Diag.i("saved host moved port: $it")
                    return it
                }
            }
        }

        val ip = localIPv4() ?: run {
            Diag.e("this tablet has no Wi-Fi address — it is not on a network at all")
            status?.invoke("This tablet has no Wi-Fi address.")
            return null
        }
        val base = subnetBase(ip) ?: run {
            Diag.e("could not work out a subnet from local address $ip")
            return null
        }
        Diag.i("this tablet is $ip on ${lastInterface}; sweeping ${base}1-254")
        return scan(base, listOfNotNull(saved?.port), cancelled, status)
    }
}
