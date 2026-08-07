package com.streamstage.phonetoolkit

import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * DECK COMMANDS — ABSORBED FROM ~/projects/PhonePresenter/app/src/main/java/com/streamstage/
 * phonepresenter/Remote.kt. This is that file, not a re-implementation.
 *
 * Kept exactly as it shipped, because it is proven against the real server:
 *
 *   - the payload shape           {"action":"next"} / {"action":"prev"} / {"action":"goto","i":N}
 *                                 (Remote.kt:18). Verified again today against
 *                                 expo-assets/decks/presenter-server.py:778-800, whose do_POST
 *                                 for /cmd accepts exactly next | prev | goto+i | animdemo |
 *                                 facelift and appends them to PENDING for the deck to drain.
 *   - fire-and-forget on a daemon thread (Remote.kt:19) — a stage press must never block the UI
 *   - 1500ms connect and read timeouts (Remote.kt:24-25)
 *   - content-type: application/json (Remote.kt:26)
 *   - touching `responseCode` to force the exchange (Remote.kt:28) — without it the request may
 *     never leave the phone
 *   - no retry framework: "If a press is lost, the presenter presses again" (Remote.kt:10)
 *
 * WHAT CHANGED, and only this:
 *   - [base] is now set from the discovered [ServerHost] rather than a hand-typed EditText, and
 *     is CLEARED whenever the app leaves PRESENTER mode, so a volume press in KIOSK mode cannot
 *     page the deck by accident.
 *   - every send is logged through [Diag] so a lost press is visible in the on-screen panel and
 *     in `adb logcat -s SSPHONE`.
 *
 * PhonePresenter's Remote.normalise() is deliberately NOT carried over: [HostStore.parse] does
 * the same job for both modes and defaults the port per mode instead of always 8080.
 */
object Remote {

    /** e.g. "http://192.168.43.7:8090". Empty means "not in PRESENTER mode / not connected". */
    @Volatile
    var base: String = ""

    /** Point the rocker at a discovered deck server. Anything but PRESENTER disarms it. */
    fun arm(host: ServerHost?) {
        base = if (host != null && host.mode == Mode.PRESENTER) host.origin else ""
        if (base.isEmpty()) Diag.i("volume rocker DISARMED (no deck server)")
        else Diag.i("volume rocker ARMED against $base/cmd  (up = next, down = prev)")
    }

    val isArmed: Boolean get() = base.isNotEmpty()

    /** PhonePresenter Remote.kt:15-35, verbatim in behaviour. */
    fun send(action: String, index: Int = -1) {
        val b = base
        if (b.isEmpty()) {
            Diag.w("deck command '$action' ignored — no deck server connected")
            return
        }
        val body = if (action == "goto") """{"action":"goto","i":$index}""" else """{"action":"$action"}"""
        thread(isDaemon = true) {
            try {
                (URL("$b/cmd").openConnection() as HttpURLConnection).run {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 1500
                    readTimeout = 1500
                    setRequestProperty("content-type", "application/json")
                    outputStream.use { it.write(body.toByteArray()) }
                    val code = responseCode          // force the exchange
                    disconnect()
                    Diag.i("deck <- $body  ($b/cmd -> HTTP $code)")
                }
            } catch (e: Exception) {
                Diag.e("deck command '$action' FAILED: ${e.javaClass.simpleName}: ${e.message}")
            }
        }
    }
}
