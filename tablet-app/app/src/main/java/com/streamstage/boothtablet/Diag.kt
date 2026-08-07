package com.streamstage.boothtablet

import android.content.Context
import android.os.Build
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * THE DIAGNOSTIC SPINE.
 *
 * The booth tablet is a Fire tablet. It has no adb, no cable, no developer options anyone is
 * going to enable on a trade-show floor. So every fact this app learns has to end up in one of
 * exactly three places, and this object is the source for all three:
 *
 *   1. the SCREEN            — SetupOverlay renders `attempts` and `lines` when it cannot connect.
 *                              This is the only channel that works when nothing else does, which
 *                              is precisely the situation it exists for.
 *   2. the KIOSK SERVER      — RemoteControl ships `lines` to POST /log on the telemetry port, so
 *                              anyone with curl can read them back off GET /events.
 *   3. logcat                — one grep-able tag, `SSBOOTH`, for when a device DOES have adb.
 *
 * Nothing here is debug-only. A diagnostic that is compiled out of the build Daniel is holding is
 * a diagnostic that does not exist.
 */
object Diag {

    /** One tag for everything: `adb logcat -s SSBOOTH`. */
    const val TAG = "SSBOOTH"

    /** How this outcome is classified. The distinctions are the whole point of the panel. */
    enum class Outcome {
        /** Answered /health in serve.py's shape. */
        OK,
        /** Nothing came back before the timeout — address is dead, or a firewall is dropping. */
        TIMEOUT,
        /** Actively refused: the HOST IS ALIVE, nothing is listening on that port. */
        REFUSED,
        /** No route to the address at all. */
        UNREACHABLE,
        /** Something answered HTTP, but not 200. */
        HTTP,
        /** 200, but the body was not serve.py's /health. Some other web thing on the network. */
        NOT_KIOSK,
        /** Anything else (SSL, malformed URL, socket error). */
        ERROR;

        /** Plain English for a person standing at a booth, not a stack trace. */
        val human: String
            get() = when (this) {
                OK -> "kiosk found"
                TIMEOUT -> "no answer (timed out)"
                REFUSED -> "refused — host is up, nothing on that port"
                UNREACHABLE -> "no route to that address"
                HTTP -> "answered, but not 200"
                NOT_KIOSK -> "answered, but it is not the kiosk"
                ERROR -> "error"
            }
    }

    /** One probe of one address:port, and what came back. */
    data class Attempt(
        val host: String,
        val port: Int,
        val outcome: Outcome,
        val detail: String,
        val ms: Long
    ) {
        val url: String get() = "http://$host:$port/health"

        /** Verbatim, one line, readable off glass. */
        override fun toString(): String =
            "$url  ->  ${outcome.human}${if (detail.isBlank()) "" else " ($detail)"}  [${ms}ms]"
    }

    private const val LINE_CAP = 600
    private const val ATTEMPT_CAP = 1200

    private val lines = ArrayDeque<String>()
    private val attempts = ArrayDeque<Attempt>()
    private val lock = Any()

    private val stamp = SimpleDateFormat("HH:mm:ss.SSS", Locale.US)
    private val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)

    /** Stable per-install id, so shipped logs from two tablets never get confused. */
    @Volatile
    var deviceId: String = "unknown"
        private set

    @Volatile
    var appVersion: String = "?"
        private set

    /** Everything the app is currently doing wrong, in one string, for the panel and the clipboard. */
    @Volatile
    var lastError: String = "none"

    fun init(ctx: Context) {
        val prefs = ctx.getSharedPreferences("boothtablet", Context.MODE_PRIVATE)
        var id = prefs.getString("device_id", null)
        if (id.isNullOrBlank()) {
            id = UUID.randomUUID().toString().take(8)
            prefs.edit().putString("device_id", id).apply()
        }
        deviceId = id
        appVersion = "${BuildConfig.VERSION_NAME}(${BuildConfig.VERSION_CODE})" +
            if (BuildConfig.DEBUG) "-debug" else ""
        i("=== StreamStage Booth Tablet $appVersion  device=$deviceId ===")
        i("device: ${Build.MANUFACTURER} ${Build.MODEL}  Android ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT})")
    }

    fun i(msg: String) = add("I", msg) { Log.i(TAG, msg) }
    fun w(msg: String) = add("W", msg) { Log.w(TAG, msg) }
    fun e(msg: String) {
        lastError = msg
        add("E", msg) { Log.e(TAG, msg) }
    }

    private inline fun add(level: String, msg: String, emit: () -> Unit) {
        emit()
        val line = "${stamp.format(Date())} $level $msg"
        synchronized(lock) {
            lines.addLast(line)
            while (lines.size > LINE_CAP) lines.removeFirst()
        }
    }

    /** Record a probe. Every single one, including the boring timeouts — the panel filters, not this. */
    fun attempt(a: Attempt) {
        // Only the interesting ones go to logcat at info level; a 254-address sweep would
        // otherwise push everything else out of the ring buffer.
        if (a.outcome == Outcome.OK || a.outcome == Outcome.NOT_KIOSK || a.outcome == Outcome.HTTP) {
            i("probe ${a}")
        } else {
            Log.d(TAG, "probe $a")
        }
        synchronized(lock) {
            attempts.addLast(a)
            while (attempts.size > ATTEMPT_CAP) attempts.removeFirst()
        }
    }

    fun clearAttempts() = synchronized(lock) { attempts.clear() }

    fun attempts(): List<Attempt> = synchronized(lock) { attempts.toList() }

    fun lines(): List<String> = synchronized(lock) { lines.toList() }

    /** Drain up to `max` log lines for shipping to the kiosk server. */
    private var shipped = 0
    fun drainForShipping(max: Int): List<String> = synchronized(lock) {
        val all = lines.toList()
        if (shipped > all.size) shipped = 0          // buffer wrapped
        val out = all.drop(shipped).take(max)
        shipped += out.size
        out
    }

    fun nowIso(): String = iso.format(Date())

    /**
     * The whole picture as text — what the "Copy diagnostics" button puts on the clipboard and
     * what the `diag` command ships to the server.
     */
    fun fullReport(header: String): String = buildString {
        appendLine("StreamStage Booth Tablet diagnostics")
        appendLine("app        : $appVersion")
        appendLine("device id  : $deviceId")
        appendLine("hardware   : ${Build.MANUFACTURER} ${Build.MODEL} / Android ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT})")
        appendLine("time       : ${nowIso()}")
        appendLine(header)
        appendLine()
        appendLine("--- probes (${attempts().size}) ---")
        attempts().forEach { appendLine(it.toString()) }
        appendLine()
        appendLine("--- log (${lines().size}) ---")
        lines().forEach { appendLine(it) }
    }
}
