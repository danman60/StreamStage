package com.streamstage.phonetoolkit

import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * The whole HTTP client. Thirty lines of java.net, deliberately.
 *
 * No OkHttp, no Retrofit — same call as ../tablet-app and ../kiosk-app. Everything this app talks
 * to is a Python stdlib HTTP server on the LAN, and a dependency that could phone home has no
 * business in an app that goes to a trade show on somebody else's Wi-Fi.
 *
 * `Connection: close` on every request, on purpose: both servers are threaded stdlib servers and
 * the browser-side connection budget on the kiosk's page port is a measured, hard-won constraint
 * on this project. Nothing here ever holds a socket open.
 */
object Net {

    /** GET, capped, returns null on any failure (the caller decides whether that is news). */
    fun get(url: String, connectMs: Int = 2500, readMs: Int = 4000, cap: Int = 512 * 1024): String? {
        var conn: HttpURLConnection? = null
        return try {
            conn = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = connectMs
                readTimeout = readMs
                useCaches = false
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Cache-Control", "no-store")
                setRequestProperty("Connection", "close")
            }
            if (conn.responseCode != 200) return null
            conn.inputStream.use { input ->
                val out = ByteArrayOutputStream()
                val buf = ByteArray(8192)
                while (out.size() < cap) {
                    val n = input.read(buf)
                    if (n <= 0) break
                    out.write(buf, 0, n)
                }
                out.toString("UTF-8")
            }
        } catch (_: Throwable) {
            null
        } finally {
            try { conn?.disconnect() } catch (_: Throwable) {}
        }
    }

    /** POST JSON. Returns the response body on 2xx, or null. Throws nothing. */
    fun postJson(url: String, body: String, connectMs: Int = 2000, readMs: Int = 3000): String? {
        var conn: HttpURLConnection? = null
        return try {
            conn = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = connectMs
                readTimeout = readMs
                doOutput = true
                useCaches = false
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Connection", "close")
            }
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val text = try {
                (if (code in 200..299) conn.inputStream else conn.errorStream)
                    ?.use { String(it.readBytes(), Charsets.UTF_8) }
            } catch (_: Throwable) { null }
            if (code in 200..299) (text ?: "") else null
        } catch (_: Throwable) {
            null
        } finally {
            try { conn?.disconnect() } catch (_: Throwable) {}
        }
    }
}
