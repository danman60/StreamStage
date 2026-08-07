package com.streamstage.boothtablet

import android.content.Context

/**
 * The last kiosk server that actually answered, so re-opening the app is instant and nobody
 * types an IP twice. Written only after a successful /health, never from a guess.
 */
class HostStore(ctx: Context) {

    private val prefs = ctx.getSharedPreferences("boothtablet", Context.MODE_PRIVATE)

    var path: String
        get() = prefs.getString(KEY_PATH, DEFAULT_PATH) ?: DEFAULT_PATH
        set(v) = prefs.edit().putString(KEY_PATH, v).apply()

    fun saved(): KioskHost? {
        val h = prefs.getString(KEY_HOST, null) ?: return null
        val p = prefs.getInt(KEY_PORT, 0)
        if (h.isBlank() || p <= 0) return null
        return KioskHost(h, p)
    }

    fun save(host: KioskHost) {
        prefs.edit()
            .putString(KEY_HOST, host.host)
            .putInt(KEY_PORT, host.port)
            .apply()
    }

    fun clear() = prefs.edit().remove(KEY_HOST).remove(KEY_PORT).apply()

    companion object {
        private const val KEY_HOST = "host"
        private const val KEY_PORT = "port"
        private const val KEY_PATH = "path"

        /** serve.py:261 aliases /tablet -> tablet.html. */
        const val DEFAULT_PATH = "/tablet"

        /**
         * Accepts "192.168.0.134", "192.168.0.134:8180", "http://192.168.0.134:8180",
         * and the same with a trailing path or slash. Returns null when there is no host.
         */
        fun parse(input: String, fallbackPort: Int = 8080): KioskHost? {
            var s = input.trim()
            if (s.isEmpty()) return null
            s = s.removePrefix("http://").removePrefix("https://")
            s = s.substringBefore('/')
            if (s.isEmpty()) return null
            val host: String
            var port = fallbackPort
            if (s.contains(':')) {
                host = s.substringBefore(':')
                port = s.substringAfter(':').toIntOrNull() ?: return null
            } else {
                host = s
            }
            if (host.isBlank() || port !in 1..65535) return null
            return KioskHost(host, port)
        }
    }
}
