package com.streamstage.boothloop

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Best-effort autostart after a power cycle.
 *
 * HONEST LIMITATION — read before relying on this:
 *
 * Android 10 (API 29) and later restrict starting an activity from the background, and a
 * BOOT_COMPLETED receiver is background. Fire OS 8 is Android 11 based, so on a current
 * Fire TV Stick this call is expected to be silently dropped by the framework. Fire OS 7
 * (Android 9) and older are not subject to that restriction and should launch.
 *
 * This has NOT been verified on a Fire Stick — no Fire TV hardware was connected when it
 * was written. Treat unattended auto-resume after a power cut as UNPROVEN, and use one of
 * the reliable options in the README instead (Fire TV "Restart app after reboot" behaviour
 * varies by build; a $5 mains timer plus a manual launch is the dependable version).
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.i("BoothLoop/Boot", "Received $action — attempting launch")

        val launch = Intent(context, BoothLoopActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        runCatching { context.startActivity(launch) }
            .onFailure { Log.w("BoothLoop/Boot", "Background activity start refused", it) }
    }
}
