package com.streamstage.phonetoolkit

import android.content.Context

/**
 * WHAT THE PHONE REMEMBERS — and the reason this is not ../tablet-app's HostStore verbatim.
 *
 * **Each mode remembers its OWN host.** The deck server and the kiosk server are two different
 * processes; even on one laptop they are on different ports, and at a real show they may well be
 * on two different machines. A single shared "last host" would mean every mode switch pointed the
 * phone at the wrong server and forced a rescan — which is exactly the delay Daniel cannot afford
 * on a stage. So every key here is namespaced by [Mode.prefsPrefix]:
 *
 *      presenter_host / presenter_port / presenter_path
 *      kiosk_host     / kiosk_port     / kiosk_path
 *
 * Plus one shared key, `mode`, so relaunching comes back in whichever role he was last in.
 *
 * A host is written ONLY after that mode's own detector actually recognised the server (see
 * Mode.identify), or when the operator insists by typing it twice. Never from a guess.
 */
class HostStore(ctx: Context) {

    private val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    // ------------------------------------------------------------------ mode

    /** The role the app was last in. Restored on launch so a relaunch mid-show is instant. */
    var mode: Mode
        get() = Mode.byName(prefs.getString(KEY_MODE, null)) ?: Mode.PRESENTER
        set(v) = prefs.edit().putString(KEY_MODE, v.name.lowercase()).apply()

    // ------------------------------------------------------------- per-mode

    fun saved(mode: Mode): ServerHost? {
        val h = prefs.getString(key(mode, "host"), null) ?: return null
        val p = prefs.getInt(key(mode, "port"), 0)
        if (h.isBlank() || p <= 0) return null
        return ServerHost(mode, h, p)
    }

    fun save(host: ServerHost) {
        prefs.edit()
            .putString(key(host.mode, "host"), host.host)
            .putInt(key(host.mode, "port"), host.port)
            .apply()
    }

    fun clear(mode: Mode) = prefs.edit()
        .remove(key(mode, "host"))
        .remove(key(mode, "port"))
        .apply()

    fun path(mode: Mode): String =
        prefs.getString(key(mode, "path"), mode.defaultPath) ?: mode.defaultPath

    fun setPath(mode: Mode, path: String) =
        prefs.edit().putString(key(mode, "path"), path).apply()

    private fun key(mode: Mode, suffix: String) = "${mode.prefsPrefix}_$suffix"

    companion object {
        const val PREFS = "streamstage_phone"
        private const val KEY_MODE = "mode"

        /**
         * Accepts "192.168.0.13", "192.168.0.13:8081", "http://192.168.0.13:8081", and the same
         * with a trailing path or slash. When no port is typed, that MODE's first seed port is
         * used — 8090 for the deck, 8081 for the kiosk — because those are the numbers that are
         * true in the field, not a shared 8080 guess.
         */
        fun parse(mode: Mode, input: String): ServerHost? {
            var s = input.trim()
            if (s.isEmpty()) return null
            s = s.removePrefix("http://").removePrefix("https://")
            s = s.substringBefore('/')
            if (s.isEmpty()) return null
            val host: String
            var port = mode.seedPorts.first()
            if (s.contains(':')) {
                host = s.substringBefore(':')
                port = s.substringAfter(':').toIntOrNull() ?: return null
            } else {
                host = s
            }
            if (host.isBlank() || port !in 1..65535) return null
            return ServerHost(mode, host, port)
        }
    }
}
