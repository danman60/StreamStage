package com.streamstage.phonetoolkit

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build

/**
 * THE ADB CONTROL SURFACE — and unlike ../tablet-app, here it is a FIRST-CLASS channel.
 *
 * The booth tablet is a Fire tablet that cannot do adb at all, so on that device this was a bench
 * convenience and the real control plane was the pull-from-the-server one. **This phone can do
 * adb**, so this is the primary way to drive and interrogate the app without touching it:
 *
 *     A=com.streamstage.phonetoolkit.DEBUG
 *     adb shell am broadcast -a $A --es cmd status
 *     adb shell am broadcast -a $A --es cmd setmode --es arg kiosk
 *     adb shell am broadcast -a $A --es cmd setmode --es arg presenter
 *     adb shell am broadcast -a $A --es cmd sethost --es arg 192.168.0.13:8081
 *     adb shell am broadcast -a $A --es cmd rediscover
 *     adb shell am broadcast -a $A --es cmd reload
 *     adb shell am broadcast -a $A --es cmd clearhost
 *     adb shell am broadcast -a $A --es cmd films
 *     adb shell am broadcast -a $A --es cmd play --es arg studiosage
 *     adb shell am broadcast -a $A --es cmd stop
 *     adb shell am broadcast -a $A --es cmd diag
 *
 * Read the answer back with `adb logcat -d -s SSPHONE`. Every command logs what it did.
 *
 * `sethost` applies to the CURRENT mode — the two modes' saved hosts are separate (HostStore) and
 * a debug command must not quietly write one into the other's slot.
 *
 * DEBUG BUILDS ONLY. [register] is a no-op unless BuildConfig.DEBUG, so a release APK carries no
 * exported receiver and nothing on a show floor can broadcast at it. It is registered at run time
 * rather than in the manifest for exactly that reason — a manifest receiver would ship in every
 * build regardless of type.
 */
object DebugBridge {

    const val ACTION = "com.streamstage.phonetoolkit.DEBUG"

    /** One command vocabulary shared with [RemoteControl] and the operator panel. */
    const val COMMANDS =
        "status | pick | setmode <presenter|kiosk> | sethost <host:port> | rediscover | reload | " +
            "clearhost | films | play <filmId> | pause | resume | stop | " +
            "playlist <id,id,id> | diag"

    private var receiver: BroadcastReceiver? = null

    fun register(ctx: Context, onCommand: (String, String?) -> Unit) {
        if (!BuildConfig.DEBUG) return
        if (receiver != null) return
        val r = object : BroadcastReceiver() {
            override fun onReceive(c: Context?, intent: Intent?) {
                val cmd = intent?.getStringExtra("cmd")?.trim().orEmpty()
                val arg = intent?.getStringExtra("arg")?.trim()?.takeIf { it.isNotEmpty() }
                if (cmd.isEmpty()) {
                    Diag.i("DEBUG broadcast with no --es cmd. Commands: $COMMANDS")
                    return
                }
                Diag.i("DEBUG broadcast: cmd=$cmd arg=${arg ?: "-"}")
                onCommand(cmd, arg)
            }
        }
        val filter = IntentFilter(ACTION)
        if (Build.VERSION.SDK_INT >= 33) {
            // Must be exported for `adb shell am broadcast` to reach it.
            ctx.registerReceiver(r, filter, Context.RECEIVER_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            ctx.registerReceiver(r, filter)
        }
        receiver = r
        Diag.i("debug bridge registered: adb shell am broadcast -a $ACTION --es cmd status")
        Diag.i("debug commands: $COMMANDS")
    }

    fun unregister(ctx: Context) {
        receiver?.let { try { ctx.unregisterReceiver(it) } catch (_: Throwable) {} }
        receiver = null
    }
}
