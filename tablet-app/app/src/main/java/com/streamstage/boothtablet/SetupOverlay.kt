package com.streamstage.boothtablet

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.text.InputType
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/**
 * Everything the kiosk page is not — and, when discovery fails, THE ONLY DIAGNOSTIC CHANNEL
 * THAT EXISTS.
 *
 * The booth tablet is a Fire tablet: no adb, no cable, no logcat, no developer options. When it
 * cannot reach a kiosk there is nothing to read a log off. So this panel has to answer, in text
 * big enough to read off glass while standing at a trade show:
 *
 *   - what did it try, verbatim, and what happened to each address
 *   - what is this tablet's OWN address (a subnet mismatch is the single most common cause and
 *     is instantly obvious once both numbers are on screen next to each other)
 *   - how do I type an address in by hand, right here, with no keyboard shortcut and no menu
 *   - how do I retry, and how do I get all of this off the device
 *
 * Built in code on purpose — no appcompat, no layout inflation, no theme to go wrong on an
 * unknown tablet. It sits on top of the WebView and is the ONLY chrome the app owns.
 */
class SetupOverlay(ctx: Context) : FrameLayout(ctx) {

    var onConnect: ((String) -> Unit)? = null
    var onRescan: (() -> Unit)? = null
    var onReload: (() -> Unit)? = null
    var onDismiss: (() -> Unit)? = null

    private val title = TextView(ctx)
    private val headline = TextView(ctx)
    private val status = TextView(ctx)
    private val spinner = ProgressBar(ctx)
    private val facts = TextView(ctx)
    private val hostField = EditText(ctx)
    private val connectBtn = button(ctx, "Connect")
    private val rescanBtn = button(ctx, "Search this Wi-Fi again")
    private val detailBtn = button(ctx, "Show every address it tried")
    private val copyBtn = button(ctx, "Copy diagnostics")
    private val reloadBtn = button(ctx, "Reload kiosk page")
    private val closeBtn = button(ctx, "Back to the kiosk")
    private val detail = TextView(ctx)
    private val foot = TextView(ctx)
    private val fields: LinearLayout

    private var detailShown = false

    init {
        setBackgroundColor(Color.parseColor("#0B0B0F"))
        isClickable = true      // swallow taps so nothing reaches the WebView underneath

        val scroll = ScrollView(ctx)
        val col = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(28), dp(24), dp(48))
        }

        title.apply {
            text = "StreamStage Booth Tablet"
            setTextColor(Color.parseColor("#9BA3B4"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            gravity = Gravity.CENTER
        }
        headline.apply {
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 26f)
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, dp(10), 0, dp(6))
            visibility = View.GONE
        }
        status.apply {
            setTextColor(Color.parseColor("#C7CEDB"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
            gravity = Gravity.CENTER
            setPadding(0, dp(10), 0, dp(10))
        }
        spinner.isIndeterminate = true

        // The facts block. Deliberately monospace and left-aligned: these are numbers a person
        // reads out loud down a phone line, and columns that line up are read correctly.
        facts.apply {
            setTextColor(Color.parseColor("#E6EAF2"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            typeface = Typeface.MONOSPACE
            setBackgroundColor(Color.parseColor("#12151C"))
            setPadding(dp(14), dp(14), dp(14), dp(14))
            visibility = View.GONE
        }

        detail.apply {
            setTextColor(Color.parseColor("#9BA3B4"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            typeface = Typeface.MONOSPACE
            setBackgroundColor(Color.parseColor("#12151C"))
            setPadding(dp(12), dp(12), dp(12), dp(12))
            visibility = View.GONE
        }

        hostField.apply {
            hint = "type the laptop address, e.g. 192.168.0.13:8081"
            setHintTextColor(Color.parseColor("#5A6272"))
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 19f)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setSingleLine(true)
            // Same reason as KioskWebView: no full-screen keyboard swallowing this panel
            // when the tablet is on its side.
            imeOptions = android.view.inputmethod.EditorInfo.IME_FLAG_NO_EXTRACT_UI or
                android.view.inputmethod.EditorInfo.IME_FLAG_NO_FULLSCREEN or
                android.view.inputmethod.EditorInfo.IME_ACTION_GO
            setBackgroundColor(Color.parseColor("#171A22"))
            setPadding(dp(14), dp(16), dp(14), dp(16))
        }

        foot.apply {
            setTextColor(Color.parseColor("#5A6272"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            gravity = Gravity.CENTER
            setPadding(0, dp(20), 0, 0)
            text = "Operator: tap the top-left corner of the kiosk page 7 times to get back here."
        }

        // MATCH_PARENT, not a fixed width. A fixed dp(560) column is wider than a narrow tablet
        // in portrait, and because the ScrollView only scrolls vertically the diagnostics were
        // silently CLIPPED off both edges — observed on a 411dp-wide screen, where the address
        // column and the "what answered" lines lost their first characters. The one screen that
        // has to be readable when nothing else works cannot be the one that overflows.
        fields = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        fields.addView(facts, lp(dp(4)))
        fields.addView(hostField, lp(dp(14)))
        fields.addView(connectBtn, lp(dp(10)))
        fields.addView(rescanBtn, lp(dp(8)))
        fields.addView(detailBtn, lp(dp(8)))
        fields.addView(copyBtn, lp(dp(8)))
        fields.addView(reloadBtn, lp(dp(8)))
        fields.addView(closeBtn, lp(dp(8)))
        fields.addView(detail, lp(dp(12)))

        col.addView(title)
        col.addView(headline)
        col.addView(status)
        col.addView(spinner, LinearLayout.LayoutParams(dp(48), dp(48)))
        col.addView(fields)
        col.addView(foot)
        scroll.addView(col)
        addView(scroll, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

        connectBtn.setOnClickListener { onConnect?.invoke(hostField.text.toString()) }
        hostField.setOnEditorActionListener { _, _, _ ->
            onConnect?.invoke(hostField.text.toString()); true
        }
        rescanBtn.setOnClickListener { onRescan?.invoke() }
        reloadBtn.setOnClickListener { onReload?.invoke() }
        closeBtn.setOnClickListener { onDismiss?.invoke() }
        detailBtn.setOnClickListener { toggleDetail() }
        copyBtn.setOnClickListener { copyDiagnostics() }
    }

    // ------------------------------------------------------------------ modes

    /** Working on it — no controls, just a spinner and a line of truth. */
    fun showBusy(message: String) {
        visibility = View.VISIBLE
        spinner.visibility = View.VISIBLE
        fields.visibility = View.GONE
        foot.visibility = View.GONE
        headline.visibility = View.GONE
        status.text = message
    }

    /**
     * IT COULD NOT CONNECT. This is the screen Daniel is standing in front of, so it says
     * everything, in this order: what went wrong, the numbers, the way to fix it by hand.
     */
    fun showFailure(headlineText: String, message: String, prefill: String?) {
        visibility = View.VISIBLE
        spinner.visibility = View.GONE
        fields.visibility = View.VISIBLE
        foot.visibility = View.VISIBLE
        headline.visibility = View.VISIBLE
        headline.text = headlineText
        headline.setTextColor(Color.parseColor("#FF6B6B"))
        status.text = message
        facts.visibility = View.VISIBLE
        facts.text = factsBlock()
        detailBtn.visibility = View.VISIBLE
        copyBtn.visibility = View.VISIBLE
        rescanBtn.visibility = View.VISIBLE
        reloadBtn.visibility = View.GONE
        closeBtn.visibility = View.GONE
        if (!prefill.isNullOrBlank() && hostField.text.isNullOrEmpty()) hostField.setText(prefill)
        if (detailShown) detail.text = detailBlock()
    }

    /** Discovery came up empty in a way that is not worth a red headline (or the operator asked). */
    fun showManual(message: String, prefill: String? = null) {
        showFailure("Cannot reach the booth kiosk", message, prefill)
    }

    /** The corner-tap panel, with the page already loaded behind it. */
    fun showOperator(message: String, prefill: String?) {
        visibility = View.VISIBLE
        spinner.visibility = View.GONE
        fields.visibility = View.VISIBLE
        foot.visibility = View.VISIBLE
        headline.visibility = View.VISIBLE
        headline.text = "Operator panel"
        headline.setTextColor(Color.WHITE)
        status.text = message
        facts.visibility = View.VISIBLE
        facts.text = factsBlock()
        detailBtn.visibility = View.VISIBLE
        copyBtn.visibility = View.VISIBLE
        rescanBtn.visibility = View.VISIBLE
        reloadBtn.visibility = View.VISIBLE
        closeBtn.visibility = View.VISIBLE
        if (!prefill.isNullOrBlank() && hostField.text.isNullOrEmpty()) hostField.setText(prefill)
        if (detailShown) detail.text = detailBlock()
    }

    fun setStatus(message: String) {
        status.text = message
    }

    fun hide() {
        visibility = View.GONE
    }

    val isShowing: Boolean get() = visibility == View.VISIBLE

    // ------------------------------------------------------------- diagnostics

    /**
     * The numbers, aligned. If the tablet says 192.168.43.x and the laptop is 192.168.0.13, the
     * two lines sit one above the other and the problem answers itself.
     */
    private fun factsBlock(): String = buildString {
        val ips = Discovery.allLocalIPv4()
        if (ips.isEmpty()) {
            appendLine("THIS TABLET  : NO NETWORK ADDRESS AT ALL")
            appendLine("               It is not on Wi-Fi. Connect it first.")
        } else {
            appendLine("THIS TABLET  : ${ips.joinToString("  |  ")}")
        }
        val r = Discovery.lastReport
        appendLine("SEARCHED     : ${Discovery.lastSubnet ?: "(no sweep yet)"}")
        appendLine("PORTS        : 8080-8119, 8180, 8090, 8000, 8888, 9000, 8008")
        if (r != null) {
            appendLine("ADDRESSES    : ${r.addressesTried} tried")
            appendLine("ANSWERED     : ${r.aliveHosts.size} device(s)" +
                if (r.aliveHosts.isEmpty()) "  <- nothing on this Wi-Fi replied at all"
                else "  ${r.aliveHosts.joinToString(", ")}")
        }
        val answered = answeredSummary()
        if (answered.isNotEmpty()) {
            appendLine()
            appendLine("WHAT ANSWERED (none of it is the kiosk):")
            answered.take(8).forEach { appendLine("  $it") }
            appendLine()
            appendLine("Tap 'Show every address it tried' for the full list.")
        }
        appendLine()
        append("APP ${Diag.appVersion}  DEVICE ${Diag.deviceId}")
    }

    /**
     * One line per host that answered, not one per port.
     *
     * A host with nothing listening refuses on all 46 ports, and printing 46 near-identical
     * lines pushes the manual-entry field off the bottom of the screen — which is precisely the
     * control someone standing at the booth needs first. So refusals are counted, and only the
     * genuinely informative outcomes (something IS serving HTTP there, it just is not the kiosk)
     * are printed verbatim. On the real booth LAN that surfaces the line that matters:
     *   192.168.0.13 -> HTTP 404 on 8080  (the stale presenter server holding the default port)
     * The verbatim per-port list is still one tap away, and all of it is in "Copy diagnostics".
     */
    private fun answeredSummary(): List<String> {
        // A successful probe is EXCLUDED: this section is headed "none of it is the kiosk", and
        // listing the kiosk here as "answered but said nothing useful" is simply a lie on the
        // operator panel, where the app is connected and the saved-host probe succeeded.
        val byHost = Diag.attempts()
            .filter {
                it.outcome != Diag.Outcome.TIMEOUT &&
                    it.outcome != Diag.Outcome.UNREACHABLE &&
                    it.outcome != Diag.Outcome.OK
            }
            .groupBy { it.host }
        return byHost.mapNotNull { (host, list) ->
            val talking = list.filter {
                it.outcome == Diag.Outcome.HTTP || it.outcome == Diag.Outcome.NOT_KIOSK
            }
            val refused = list.count { it.outcome == Diag.Outcome.REFUSED }
            val parts = ArrayList<String>()
            talking.take(3).forEach { parts.add("${it.detail} on ${it.port}") }
            if (talking.size > 3) parts.add("+${talking.size - 3} more serving HTTP")
            if (refused > 0) parts.add("$refused port(s) refused — nothing listening")
            if (parts.isEmpty()) null else "$host  ->  " + parts.joinToString("; ")
        }.sortedByDescending { it.contains("HTTP") }
    }

    /** Literally every address it tried, verbatim, in order. */
    private fun detailBlock(): String {
        val all = Diag.attempts()
        if (all.isEmpty()) return "(nothing probed yet)"
        val timeouts = all.count {
            it.outcome == Diag.Outcome.TIMEOUT || it.outcome == Diag.Outcome.UNREACHABLE
        }
        return buildString {
            appendLine("${all.size} probes, $timeouts of them no-answer.")
            appendLine()
            all.forEach { appendLine(it.toString()) }
        }
    }

    private fun toggleDetail() {
        detailShown = !detailShown
        if (detailShown) {
            detail.text = detailBlock()
            detail.visibility = View.VISIBLE
            detailBtn.text = "Hide the address list"
        } else {
            detail.visibility = View.GONE
            detailBtn.text = "Show every address it tried"
        }
    }

    /**
     * Get it off the device. On a Fire tablet with no cable this is how the text reaches a
     * person — paste it into any messaging app that happens to be installed.
     */
    private fun copyDiagnostics() {
        val report = Diag.fullReport(factsBlock())
        try {
            val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("StreamStage booth tablet diagnostics", report))
            Toast.makeText(context, "Diagnostics copied — paste them anywhere", Toast.LENGTH_LONG).show()
        } catch (t: Throwable) {
            Toast.makeText(context, "Could not copy: ${t.message}", Toast.LENGTH_LONG).show()
        }
        Diag.i("--- diagnostics dumped to clipboard ---\n$report")
    }

    // ------------------------------------------------------------------ chrome

    private fun lp(topMargin: Int) = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
    ).apply { setMargins(0, topMargin, 0, 0) }

    private fun dp(v: Int): Int =
        (v * resources.displayMetrics.density).toInt()

    private fun button(ctx: Context, label: String) = Button(ctx).apply {
        text = label
        isAllCaps = false
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
        setTextColor(Color.WHITE)
        setBackgroundColor(Color.parseColor("#1F2430"))
        minimumHeight = (56 * ctx.resources.displayMetrics.density).toInt()
    }
}
