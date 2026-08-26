package com.streamstage.boothloop

import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.InetSocketAddress
import java.net.Socket
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * THE STICK SENDS ITS OWN LEADS. There is no relay hop.
 *
 * Daniel, verbatim, on the shape this replaces: *"why does dart need to — why can't it just
 * store it in the apk on the tv and upload when it has internet. you are overengineering."*
 * So: a lead typed on the tablet lands on the stick's own disk (see [BoothStore.recordLead]),
 * and this thread carries it to the live route the moment there is internet. DART is not on the
 * path at any point, and a DART that never comes back cannot cost a single lead.
 *
 * This is a straight port of `expo-assets/kiosk/flush-leads.py`, and every rule in that file is
 * here for the reason that file gives:
 *
 *  - **The payload shape is `payload_for`, field for field.** Nothing is invented. The lead's
 *    address travels in `email` and `notes` ONLY — the SES SMTP account REJECTS an unverified
 *    `replyTo` and bounces the whole delivery, so this must never grow a replyTo-shaped field.
 *  - **A 200 IS NOT ENOUGH.** The route answers 200 when EITHER the Supabase forward OR the
 *    notification email succeeded, and the forward has a hard 4-second timeout. The BODY decides:
 *    `forwarded:true` -> landed; `forwarded:false` -> keep it queued; absent -> treated as sent
 *    (the older route), and SAID SO on the line it logs, every time.
 *  - **[MARKER] is re-read immediately before every single send**, so a `flush-leads.py` run on
 *    DART against an exported copy of this queue and this thread cannot both mail the same
 *    studio. The id is `lid` — the one the tablet stamped — so both sides agree on identity.
 *  - **The marker is written after EACH success.** A crash mid-drain costs a rewrite, never a
 *    duplicate.
 *  - **A failure ends the pass.** It almost always means the connection went again; the queue is
 *    still on disk and the next pass carries it.
 *
 * ## Where this posts, and how to point it somewhere else
 *
 * [LIVE_ENDPOINT] is the default because the requirement is that a captured lead is never lost,
 * and a booth app has no command line to pass an endpoint on. It is therefore ANNOUNCED, loudly,
 * in logcat at startup and reported on `/health` — the destination is never something you have
 * to go and read the source to discover. (2026-08-07: a test harness left on a production
 * default put two fabricated leads in Daniel's live inbox.)
 *
 * To point a bench stick somewhere else, write one line into `.lead-endpoint` next to the films:
 *
 *     adb push endpoint.txt /sdcard/Movies/StreamStageBooth/.lead-endpoint
 *
 * A file containing `off` disables sending entirely — the leads stay on disk and `/leads` can
 * still export them.
 */
object LeadSender {

    private const val TAG = "BoothLoop/Leads"

    /** `flush-leads.py:38`. The live route. Real email, real database row. */
    const val LIVE_ENDPOINT = "https://streamstage.live/api/expo-leads"

    /** A dotfile next to the films, exactly like `.kiosk-host` (BoothBus.fileHost). */
    private const val ENDPOINT_FILE = ".lead-endpoint"

    private const val MARKER = "leads-flushed.json"

    private const val FIRST_DELAY_MS = 20_000L      // serve.py:83 — a restart with a backlog
    private const val INTERVAL_MS = 120_000L        // serve.py:82

    /** `flush-leads.py:42`. Product ids as the kiosk logs them -> the names Daniel reads. */
    private val PRODUCT_NAMES = mapOf(
        "studiosage" to "StudioSage",
        "compsync" to "CompSync",
        "callboard" to "Callboard",
        "costumecraft" to "CostumeCraft",
        "studiobeat" to "StudioBeat",
        "reflect" to "Reflect"
    )

    @Volatile private var running = false
    @Volatile private var mediaDir: File? = null

    /** Read once at start and never guessed. Reported on /health so it is never a mystery. */
    @Volatile var endpoint: String = LIVE_ENDPOINT
        private set

    @Volatile var enabled: Boolean = false
        private set

    // What the last pass managed. Read by /health; written only by this thread.
    @Volatile var queued: Int = -1              // -1 = not looked yet
        private set
    @Volatile var sent: Int = 0
        private set
    @Volatile var failed: Int = 0
        private set
    @Volatile var lastTry: String? = null
        private set
    @Volatile var lastOk: String? = null
        private set
    @Volatile var note: String = "not started"
        private set

    fun start(mediaDirectory: File?) {
        if (running) return
        mediaDir = mediaDirectory
        endpoint = resolveEndpoint()
        if (endpoint.equals("off", ignoreCase = true)) {
            enabled = false
            note = "auto-send is OFF (.lead-endpoint says off) — leads stay on disk"
            Log.w(TAG, "==== LEAD AUTO-SEND IS OFF. Leads are kept on disk and exported at /leads. ====")
            return
        }
        running = true
        enabled = true
        note = "waiting for the first pass"
        // Above the fold, every launch. This is the one thread in this app that reaches off the
        // booth, and what it sends cannot be recalled.
        Log.w(TAG, "==== ANY QUEUED LEAD ON THIS STICK IS SENT TO: $endpoint ====")
        if (endpoint == LIVE_ENDPOINT) {
            Log.w(TAG, "     THAT IS THE LIVE ROUTE. Real email, real database row.")
            Log.w(TAG, "     Bench testing? push a line into $ENDPOINT_FILE next to the films.")
        }
        Thread({
            runCatching { loop() }.onFailure { Log.w(TAG, "lead sender died", it) }
        }, "BoothLeadSender").apply {
            isDaemon = true
            priority = Thread.MIN_PRIORITY          // never competes with the decoder
            start()
        }
    }

    fun stop() {
        running = false
    }

    private fun resolveEndpoint(): String {
        val dir = mediaDir ?: return LIVE_ENDPOINT
        return runCatching {
            val f = File(dir, ENDPOINT_FILE)
            if (!f.isFile || !f.canRead() || f.length() > 256) return@runCatching LIVE_ENDPOINT
            f.readText().trim().ifEmpty { LIVE_ENDPOINT }
        }.getOrDefault(LIVE_ENDPOINT)
    }

    private fun loop() {
        Thread.sleep(FIRST_DELAY_MS)
        while (running) {
            runCatching { onePass() }
                .onFailure { note = "pass failed: ${it.message}" }   // a booth never dies of bookkeeping
            Thread.sleep(INTERVAL_MS)
        }
    }

    /** One drain pass. Never throws past its caller; records what happened. */
    private fun onePass() {
        val all = BoothStore.leads()
        val marker = loadMarker()
        val todo = all.filter { !marker.has(it.optString("_lid")) }
        queued = todo.size
        if (todo.isEmpty()) {
            note = "nothing queued"
            return
        }

        lastTry = nowIso()
        val host = runCatching { URL(endpoint).host }.getOrNull()
        if (!internetUp(host)) {
            note = "${todo.size} queued, no internet yet — will retry"
            return
        }

        var justSent = 0
        for (lead in todo) {
            if (!running) return
            val lid = lead.optString("_lid")
            // Re-read immediately before sending: a flush-leads.py run on DART, against an
            // export of this queue, may have confirmed this one since the list above was built.
            if (loadMarker().has(lid)) continue
            val (ok, detail) = send(payloadFor(lead))
            if (!ok) {
                failed++
                note = "sent $justSent, then failed on ${lead.optString("email", "?")}: $detail — kept, will retry"
                queued = todo.size - justSent
                Log.w(TAG, note)
                return
            }
            val recorded = runCatching {
                val m = loadMarker()
                m.put(lid, nowIso())
                saveMarker(m)
            }.isSuccess
            if (!recorded) {
                // Sent but not recorded. Stop dead: carrying on risks re-sending this same lead.
                note = "sent ${lead.optString("email", "?")} but could not record it — " +
                    "stopping to avoid a double send"
                Log.e(TAG, note)
                return
            }
            justSent++
            sent++
            lastOk = nowIso()
            Log.i(TAG, "sent ${lead.optString("email")} ($detail)")
            Thread.sleep(500)                       // be gentle with the live route
        }
        queued = 0
        note = "sent $justSent — queue empty"
    }

    // ------------------------------------------------------------------ the wire

    /** `serve.py:internet_up`. One TCP connect, no request. */
    private fun internetUp(host: String?, timeoutMs: Int = 4000): Boolean {
        if (host.isNullOrEmpty()) return false
        return runCatching {
            Socket().use { s ->
                s.connect(InetSocketAddress(host, 443), timeoutMs)
                true
            }
        }.getOrDefault(false)
    }

    /**
     * `flush-leads.py:payload_for`, field for field.
     *
     * NOTHING IN HERE IS INVENTED. Every value is either something the visitor typed, something
     * the booth knows for a fact (which film was on screen), or a constant describing this
     * surface. There is deliberately NO NAME field: the gate asks for a studio and an email, and
     * never asks who is typing.
     */
    fun payloadFor(lead: JSONObject): JSONObject {
        val email = lead.optString("email").trim()
        val product = lead.optString("product").trim().takeIf { it.isNotEmpty() && it != "null" } ?: ""
        val via = lead.optString("via").trim().ifEmpty { "tablet" }
        val ts = lead.optString("ts").ifEmpty { "unknown time" }
        val studio = lead.optString("studio").trim().let { if (it == "null") "" else it }
        val productName = PRODUCT_NAMES[product] ?: product.ifEmpty { "none on screen" }

        val interests = JSONArray().put("software")
        PRODUCT_NAMES[product]?.let { interests.put(it) }

        return JSONObject()
            .put("studio", studio)
            .put("email", email)
            .put("phone", "")
            .put("interests", interests)
            .put("source", "booth_tablet")
            // Not the films: the booth offers the recital video checklist, and this is what the
            // live route's autoresponder reads to decide what to send.
            .put("asset", "checklist")
            .put("src", "booth_tablet")
            .put("p", if (product.isEmpty()) JSONObject.NULL else product)
            .put("s", "tablet")
            .put(
                "notes",
                "Typed on the booth tablet ($via) at $ts. " +
                    "Film on screen: $productName. " +
                    "Studio: ${studio.ifEmpty { "not given (email-only capture)" }}. " +
                    "Captured and sent by the booth Fire Stick."
            )
    }

    /**
     * POST one lead. True ONLY when the row is known to have landed — see the class comment on
     * why a 200 is not enough and why an absent `forwarded` is nevertheless treated as sent.
     */
    fun send(payload: JSONObject, timeoutMs: Int = 20_000): Pair<Boolean, String> {
        var conn: HttpURLConnection? = null
        return try {
            conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = timeoutMs
                readTimeout = timeoutMs
                doOutput = true
                useCaches = false
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Connection", "close")
            }
            conn.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val body = runCatching {
                (if (code in 200..299) conn.inputStream else conn.errorStream)
                    ?.bufferedReader()?.use { it.readText() }.orEmpty()
            }.getOrDefault("")
            if (code != 200) return false to "HTTP $code: ${body.trim()}"
            val parsed = runCatching { JSONObject(body) }.getOrNull()
            when {
                parsed == null || !parsed.has("forwarded") ->
                    true to "${body.trim()}  [no `forwarded` field — storage NOT confirmed]"
                parsed.optBoolean("forwarded") -> true to body.trim()
                else -> false to "the route answered 200 but did NOT store the lead " +
                    "(forwarded:false) — kept: ${body.trim()}"
            }
        } catch (t: Throwable) {
            false to (t.javaClass.simpleName + (t.message?.let { ": $it" } ?: ""))
        } finally {
            runCatching { conn?.disconnect() }
        }
    }

    // ------------------------------------------------------------------ the marker

    private fun markerFile(): File? = BoothStore.dir()?.let { File(it, MARKER) }

    /** The record of what has been CONFIRMED sent. `{lid: iso8601}`. */
    fun loadMarker(): JSONObject = runCatching {
        val f = markerFile() ?: return@runCatching JSONObject()
        if (!f.isFile) return@runCatching JSONObject()
        JSONObject(f.readText())
    }.getOrDefault(JSONObject())

    private fun saveMarker(marker: JSONObject) {
        val f = markerFile() ?: throw java.io.IOException("no record directory")
        val tmp = File(f.parentFile, "$MARKER.tmp")
        FileOutputStream(tmp).use { fos ->
            fos.write(marker.toString(1).toByteArray(Charsets.UTF_8))
            fos.flush()
            fos.fd.sync()
        }
        if (!tmp.renameTo(f)) {
            // renameTo can fail across some Fire OS filesystems; a direct rewrite is still
            // better than losing the record of what has already been mailed.
            FileOutputStream(f).use { fos ->
                fos.write(marker.toString(1).toByteArray(Charsets.UTF_8))
                fos.flush()
                fos.fd.sync()
            }
            tmp.delete()
        }
    }

    private fun nowIso(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssZ", Locale.US).format(Date())

    /** What `/health` reports. Never a guess — every field is measured. */
    fun healthJson(): JSONObject = JSONObject()
        .put("enabled", enabled)
        .put("endpoint", endpoint)
        .put("queued", if (queued < 0) JSONObject.NULL else queued)
        .put("sent", sent)
        .put("failed", failed)
        .put("lastTry", lastTry ?: JSONObject.NULL)
        .put("lastOk", lastOk ?: JSONObject.NULL)
        .put("note", note)
}
