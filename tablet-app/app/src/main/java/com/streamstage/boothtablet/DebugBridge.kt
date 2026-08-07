package com.streamstage.boothtablet

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build

/**
 * The adb control surface — a BONUS, not the plan.
 *
 * The device this app is actually for is a Fire tablet that cannot do adb at all, so the real
 * control plane is [RemoteControl] (pull commands off the kiosk server) and the real diagnostic
 * is [SetupOverlay]'s on-screen panel. This class exists because it costs about thirty lines and
 * makes the Pixel/emulator loop fast:
 *
 *     adb shell am broadcast -a com.streamstage.boothtablet.DEBUG --es cmd status
 *     adb shell am broadcast -a com.streamstage.boothtablet.DEBUG --es cmd sethost --es arg 192.168.0.13:8081
 *     adb shell am broadcast -a com.streamstage.boothtablet.DEBUG --es cmd rediscover
 *     adb shell am broadcast -a com.streamstage.boothtablet.DEBUG --es cmd reload
 *     adb shell am broadcast -a com.streamstage.boothtablet.DEBUG --es cmd clearhost
 *     adb shell am broadcast -a com.streamstage.boothtablet.DEBUG --es cmd diag
 *
 * Read the answer back with `adb logcat -d -s SSBOOTH`.
 *
 * DEBUG BUILDS ONLY. [register] is a no-op unless BuildConfig.DEBUG, so a release APK has no
 * exported receiver and nothing on a show floor can broadcast at it. It is registered at run
 * time rather than in the manifest for exactly that reason — a manifest receiver would ship in
 * every build regardless.
 */
object DebugBridge {

    const val ACTION = "com.streamstage.boothtablet.DEBUG"

    /** The same verb list [RemoteControl] accepts, so there is one command vocabulary, not two. */
    const val COMMANDS = "status | sethost <host:port> | rediscover | reload | clearhost | diag"

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
        Diag.i("debug broadcast bridge registered: adb shell am broadcast -a $ACTION --es cmd status")
        Diag.i("debug commands: $COMMANDS")
    }

    fun unregister(ctx: Context) {
        receiver?.let { try { ctx.unregisterReceiver(it) } catch (_: Throwable) {} }
        receiver = null
    }
}
