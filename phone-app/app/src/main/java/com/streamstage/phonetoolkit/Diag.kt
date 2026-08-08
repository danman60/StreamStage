package com.streamstage.phonetoolkit

import android.content.Context
import android.os.Build
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * THE DIAGNOSTIC SPINE. Lifted from ../tablet-app/Diag.kt and given a mode column.
 *
 * Unlike the Fire tablet, this phone CAN do adb — so logcat is a first-class channel here, not a
 * fallback. Every fact the app learns lands in all of:
 *
 *   1. logcat, one grep-able tag       — `adb logcat -s SSPHONE`
 *   2. the SCREEN                      — SetupOverlay renders the probes and the log when it
 *                                        cannot connect. Daniel is on a stage; a blank page with
 *                                        no explanation is the failure mode this prevents.
 *   3. the KIOSK SERVER (KIOSK mode)   — RemoteControl ships lines to POST /log on the telemetry
 *                                        port. presenter-server.py has no such sink, so in
 *                                        PRESENTER mode channels 1 and 2 are all there is, and
 *                                        the app says so rather than pretending.
 *
 * Nothing here is debug-only. A diagnostic compiled out of the build Daniel is holding on a stage
 * is a diagnostic that does not exist.
 */
object Diag {

    /** One tag for everything: `adb logcat -s SSPHONE`. */
    const val TAG = "SSPHONE"

    /** Which mode the app is in. Stamped on every line, because the two modes fail differently. */
    @Volatile
    var mode: Mode = Mode.PRESENTER

    /** How a probe ended. The distinctions are the whole point of the on-screen panel. */
    enum class Outcome {
        /** Answered, and the body really is this mode's server. */
        OK,
        /** Nothing came back before the timeout — address dead, or a firewall dropping. */
        TIMEOUT,
        /** Actively refused: THE HOST IS ALIVE, nothing is listening on that port. */
        REFUSED,
        /** No route to that address at all. */
        UNREACHABLE,
        /** Something answered HTTP, but not 200. */
        HTTP,
        /** 200, but not this mode's server — including the OTHER mode's server. */
        WRONG_SERVER,
        /** Anything else (SSL, malformed URL, socket error). */
        ERROR;

        val human: String
            get() = when (this) {
                OK -> "found"
                TIMEOUT -> "no answer (timed out)"
                REFUSED -> "refused — host is up, nothing on that port"
                UNREACHABLE -> "no route to that address"
                HTTP -> "answered, but not 200"
                WRONG_SERVER -> "answered, but it is not this server"
                ERROR -> "error"
            }
    }

    /** One probe of one address:port in one mode, and what came back. */
    data class Attempt(
        val mode: Mode,
        val host: String,
        val port: Int,
        val path: String,
        val outcome: Outcome,
        val detail: String,
        val ms: Long
    ) {
        val url: String get() = "http://$host:$port$path"

        /** Verbatim, one line, readable off glass. */
        override fun toString(): String =
            "[${mode.letter}] $url  ->  ${outcome.human}" +
                (if (detail.isBlank()) "" else " ($detail)") + "  [${ms}ms]"
    }

    private const val LINE_CAP = 600
    private const val ATTEMPT_CAP = 1200

    private val lines = ArrayDeque<String>()
    private val attempts = ArrayDeque<Attempt>()
    private val lock = Any()

    private val stamp = SimpleDateFormat("HH:mm:ss.SSS", Locale.US)

    /**
     * REAL UTC, not device-local time wearing a Z.
     *
     * The `'Z'` in the pattern is a QUOTED LITERAL — it does not mean "UTC", it means "print the
     * letter Z". Without the setTimeZone below this printed the phone's own wall clock and then
     * claimed it was UTC. Daniel works in Eastern, the venue is Mountain and the machine reading
     * these logs back runs UTC, so every shipped event was mislabelled by hours and lined up with
     * nothing. Now the string is genuinely UTC, and [iso] is the only place that formats it.
     */
    private val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = java.util.TimeZone.getTimeZone("UTC")
    }

    /** Stable per-install id, so logs from the phone and the tablet never get confused. */
    @Volatile
    var deviceId: String = "unknown"
        private set

    @Volatile
    var appVersion: String = "?"
        private set

    /** The last thing that went wrong, in one string, for the panel and the clipboard. */
    @Volatile
    var lastError: String = "none"

    fun init(ctx: Context) {
        val prefs = ctx.getSharedPreferences(HostStore.PREFS, Context.MODE_PRIVATE)
        var id = prefs.getString("device_id", null)
        if (id.isNullOrBlank()) {
            id = UUID.randomUUID().toString().take(8)
            prefs.edit().putString("device_id", id).apply()
        }
        deviceId = id
        appVersion = "${BuildConfig.VERSION_NAME}(${BuildConfig.VERSION_CODE})" +
            if (BuildConfig.DEBUG) "-debug" else ""
        i("=== StreamStage Phone $appVersion  device=$deviceId ===")
        i("device: ${Build.MANUFACTURER} ${Build.MODEL}  Android ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT})")
    }

    fun i(msg: String) = add("I", msg) { Log.i(TAG, "[${mode.letter}] $msg") }
    fun w(msg: String) = add("W", msg) { Log.w(TAG, "[${mode.letter}] $msg") }
    fun e(msg: String) {
        lastError = msg
        add("E", msg) { Log.e(TAG, "[${mode.letter}] $msg") }
    }

    private inline fun add(level: String, msg: String, emit: () -> Unit) {
        emit()
        val line = "${stamp.format(Date())} $level [${mode.letter}] $msg"
        synchronized(lock) {
            lines.addLast(line)
            while (lines.size > LINE_CAP) lines.removeFirst()
        }
    }

    /** Record a probe. Every one, including the boring timeouts — the panel filters, not this. */
    fun attempt(a: Attempt) {
        // Only the interesting ones go to logcat at info level; a 254-address sweep would
        // otherwise push everything else out of the ring buffer.
        if (a.outcome == Outcome.OK || a.outcome == Outcome.WRONG_SERVER || a.outcome == Outcome.HTTP) {
            i("probe $a")
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

    fun nowIso(): String = iso(System.currentTimeMillis())

    /**
     * One epoch-millisecond value, rendered as UTC ISO-8601.
     *
     * Callers that ship an event stamp `ms` and `t` from the SAME number, so the sortable field
     * and the readable field can never disagree. SimpleDateFormat is not thread-safe and this is
     * called from the shipping thread and the UI thread, hence the lock.
     */
    fun iso(ms: Long): String = synchronized(lock) { iso.format(Date(ms)) }

    /** The whole picture as text — the "Copy diagnostics" button and the `diag` command. */
    fun fullReport(header: String): String = buildString {
        appendLine("StreamStage Phone diagnostics")
        appendLine("app        : $appVersion")
        appendLine("mode       : ${mode.label} (${mode.serverName})")
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
