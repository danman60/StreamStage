package com.streamstage.phonetoolkit

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
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/**
 * WHAT HAPPENED, AND HOW TO GET PAST IT BY HAND.
 *
 * Ported from ../tablet-app/SetupOverlay.kt and given a mode. Its reason for existing is a thing
 * that already went wrong on real hardware: **the booth tablet's discovery broke on show day and
 * there was no quick way past it.** So the rule this panel enforces is the non-negotiable one:
 *
 *   MANUAL HOST ENTRY IS ALWAYS AVAILABLE, IN BOTH MODES, AND IT ALWAYS WINS.
 *
 * The field is on screen whenever the panel is — on failure, and on demand from the ⚙ button —
 * never buried behind "advanced". Discovery is a convenience that saves typing; it is never the
 * only way in. Type an address, tap Connect, and if the probe disagrees, tap Connect again and it
 * opens it anyway. The human at the booth beats the probe, every time.
 *
 * It also has to answer, in text readable off glass while standing at a show:
 *   - what did it try, verbatim, and what happened to each address
 *   - what is this phone's OWN address (a subnet mismatch is the most common cause and becomes
 *     obvious the moment both numbers sit one above the other — doubly so on hotspot day)
 *   - which mode it was searching in, because the two look for different servers
 *
 * Built in code — no appcompat, no layout inflation, nothing to go wrong on an unknown device.
 */
class SetupOverlay(ctx: Context) : FrameLayout(ctx) {

    var onConnect: ((String) -> Unit)? = null

    /**
     * "Open this address anyway, even though nothing answered it." A SEPARATE, DELIBERATE BUTTON.
     *
     * It used to be the second tap on Connect — same button, same gesture, silently different
     * meaning, and it also wrote the unverified address into SharedPreferences forever. Typing a
     * machine name like `DART` and tapping Connect twice was enough to saddle this mode with a
     * name Android cannot resolve, at every launch. Forcing is a real thing an operator sometimes
     * needs, so it is still here — as its own labelled button, and it never saves anything.
     */
    var onForce: ((String) -> Unit)? = null
    var onRescan: (() -> Unit)? = null
    var onReload: (() -> Unit)? = null
    var onSwitchMode: (() -> Unit)? = null
    var onDismiss: (() -> Unit)? = null

    private val title = TextView(ctx)
    private val headline = TextView(ctx)
    private val status = TextView(ctx)
    private val spinner = ProgressBar(ctx)
    private val facts = TextView(ctx)
    private val hostField = EditText(ctx)
    private val connectBtn = button(ctx, "Connect")
    private val forceBtn = button(ctx, "Open it anyway")
    private val rescanBtn = button(ctx, "Search this network again")
    private val switchBtn = button(ctx, "Switch mode")
    private val detailBtn = button(ctx, "Show every address it tried")
    private val copyBtn = button(ctx, "Copy diagnostics")
    private val reloadBtn = button(ctx, "Reload")
    private val closeBtn = button(ctx, "Back")
    private val detail = TextView(ctx)
    private val foot = TextView(ctx)
    private val fields: LinearLayout

    private var detailShown = false
    private var mode: Mode = Mode.PRESENTER

    init {
        setBackgroundColor(Color.parseColor("#0B0B0F"))
        isClickable = true      // swallow taps so nothing reaches the content underneath

        val scroll = ScrollView(ctx)
        val col = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(18), dp(20), dp(18), dp(44))
        }

        title.apply {
            setTextColor(Color.parseColor("#9BA3B4"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            gravity = Gravity.CENTER
        }
        headline.apply {
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 23f)
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, dp(10), 0, dp(6))
            visibility = View.GONE
        }
        status.apply {
            setTextColor(Color.parseColor("#C7CEDB"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            gravity = Gravity.CENTER
            setPadding(0, dp(10), 0, dp(10))
        }
        spinner.isIndeterminate = true

        // Monospace and left aligned: these are numbers a person reads out loud down a phone
        // line, and columns that line up get read correctly.
        facts.apply {
            setTextColor(Color.parseColor("#E6EAF2"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            typeface = Typeface.MONOSPACE
            setBackgroundColor(Color.parseColor("#12151C"))
            setPadding(dp(12), dp(12), dp(12), dp(12))
            visibility = View.GONE
        }

        detail.apply {
            setTextColor(Color.parseColor("#9BA3B4"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            typeface = Typeface.MONOSPACE
            setBackgroundColor(Color.parseColor("#12151C"))
            setPadding(dp(10), dp(10), dp(10), dp(10))
            visibility = View.GONE
        }

        hostField.apply {
            setHintTextColor(Color.parseColor("#5A6272"))
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setSingleLine(true)
            imeOptions = EditorInfo.IME_FLAG_NO_EXTRACT_UI or
                EditorInfo.IME_FLAG_NO_FULLSCREEN or EditorInfo.IME_ACTION_GO
            setBackgroundColor(Color.parseColor("#171A22"))
            setPadding(dp(14), dp(15), dp(14), dp(15))
        }

        foot.apply {
            setTextColor(Color.parseColor("#5A6272"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            gravity = Gravity.CENTER
            setPadding(0, dp(18), 0, 0)
            text = "Hold the mode chip at the top to switch modes · hold ⚙ to get back here."
        }

        fields = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        fields.addView(facts, lp(dp(4)))
        fields.addView(hostField, lp(dp(14)))
        fields.addView(connectBtn, lp(dp(10)))
        fields.addView(forceBtn, lp(dp(8)))
        fields.addView(rescanBtn, lp(dp(8)))
        fields.addView(switchBtn, lp(dp(8)))
        fields.addView(reloadBtn, lp(dp(8)))
        fields.addView(detailBtn, lp(dp(8)))
        fields.addView(copyBtn, lp(dp(8)))
        fields.addView(closeBtn, lp(dp(8)))
        fields.addView(detail, lp(dp(12)))

        col.addView(title)
        col.addView(headline)
        col.addView(status)
        col.addView(spinner, LinearLayout.LayoutParams(dp(44), dp(44)))
        col.addView(fields)
        col.addView(foot)
        scroll.addView(col)
        addView(scroll, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

        connectBtn.setOnClickListener { onConnect?.invoke(hostField.text.toString()) }
        hostField.setOnEditorActionListener { _, _, _ ->
            onConnect?.invoke(hostField.text.toString()); true
        }
        forceBtn.setOnClickListener { onForce?.invoke(hostField.text.toString()) }
        rescanBtn.setOnClickListener { onRescan?.invoke() }
        switchBtn.setOnClickListener { onSwitchMode?.invoke() }
        reloadBtn.setOnClickListener { onReload?.invoke() }
        closeBtn.setOnClickListener { onDismiss?.invoke() }
        detailBtn.setOnClickListener { toggleDetail() }
        copyBtn.setOnClickListener { copyDiagnostics() }
    }

    /** Retarget the panel at a mode. Changes the example address and the hint, nothing else. */
    fun setMode(m: Mode) {
        mode = m
        title.text = "StreamStage Phone · ${m.label} · ${m.serverName}"
        hostField.hint = "type the laptop address, e.g. 192.168.0.13:${m.seedPorts.first()}"
    }

    // ------------------------------------------------------------------ modes

    /** Working on it — no controls, just a spinner and a line of truth. */
    fun showBusy(message: String) {
        visibility = View.VISIBLE
        spinner.visibility = View.VISIBLE
        fields.visibility = View.GONE
        foot.visibility = View.GONE
        headline.visibility = View.GONE
        forceBtn.visibility = View.GONE
        status.text = message
    }

    /**
     * Offer the force. Shown ONLY after an address the operator typed has actually been probed and
     * failed, and hidden again by every other screen — so it can never be tapped by accident and
     * never appears before there is something concrete to force.
     */
    fun offerForce(addr: String) {
        forceBtn.text = "Open $addr anyway (not verified, not remembered)"
        forceBtn.visibility = View.VISIBLE
    }

    /**
     * IT COULD NOT CONNECT. This is the screen Daniel is standing in front of, so it says
     * everything, in this order: what went wrong, the numbers, then the way to fix it by hand.
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
        rescanBtn.visibility = View.VISIBLE
        switchBtn.visibility = View.VISIBLE
        forceBtn.visibility = View.GONE     // only offerForce() ever shows it
        reloadBtn.visibility = View.GONE
        closeBtn.visibility = View.GONE
        if (!prefill.isNullOrBlank() && hostField.text.isNullOrEmpty()) hostField.setText(prefill)
        if (detailShown) detail.text = detailBlock()
    }

    /** The ⚙ panel, with a working page already behind it. */
    fun showOperator(message: String, prefill: String?) {
        visibility = View.VISIBLE
        spinner.visibility = View.GONE
        fields.visibility = View.VISIBLE
        foot.visibility = View.VISIBLE
        headline.visibility = View.VISIBLE
        headline.text = "Setup · ${mode.label}"
        headline.setTextColor(Color.WHITE)
        status.text = message
        facts.visibility = View.VISIBLE
        facts.text = factsBlock()
        rescanBtn.visibility = View.VISIBLE
        switchBtn.visibility = View.VISIBLE
        forceBtn.visibility = View.GONE     // only offerForce() ever shows it
        reloadBtn.visibility = View.VISIBLE
        closeBtn.visibility = View.VISIBLE
        if (!prefill.isNullOrBlank() && hostField.text.isNullOrEmpty()) hostField.setText(prefill)
        if (detailShown) detail.text = detailBlock()
    }

    fun setStatus(message: String) { status.text = message }

    fun hide() { visibility = View.GONE }

    val isShowing: Boolean get() = visibility == View.VISIBLE

    // ------------------------------------------------------------- diagnostics

    /**
     * The numbers, aligned. If the phone says 192.168.43.1 and the laptop was last seen on
     * 192.168.0.13, the two lines sit one above the other and the problem answers itself — which
     * is exactly the hotspot-day failure this is aimed at.
     */
    private fun factsBlock(): String = buildString {
        appendLine("MODE         : ${mode.label} — looking for ${mode.serverName}")
        appendLine("PROBING      : ${mode.probePath} on each address")
        val ips = Discovery.allLocalIPv4()
        if (ips.isEmpty()) {
            appendLine("THIS PHONE   : NO NETWORK ADDRESS AT ALL")
            appendLine("               Not on Wi-Fi and not hosting a hotspot. Fix that first.")
        } else {
            appendLine("THIS PHONE   : ${ips.joinToString("  |  ")}")
        }
        appendLine("SEARCHED     : ${Discovery.lastSubnet ?: "(no sweep yet)"}")
        appendLine("PORTS        : ${Discovery.PORTS_HUMAN}")
        val r = Discovery.lastReport
        if (r != null) {
            appendLine("ADDRESSES    : ${r.addressesTried} tried")
            appendLine("ANSWERED     : ${r.aliveHosts.size} device(s)" +
                if (r.aliveHosts.isEmpty()) "  <- nothing on this network replied at all"
                else "  ${r.aliveHosts.joinToString(", ")}")
        }
        val notable = notableAttempts()
        if (notable.isNotEmpty()) {
            appendLine()
            appendLine("WHAT ANSWERED (but was not it):")
            notable.take(12).forEach { appendLine("  $it") }
        }
        appendLine()
        append("APP ${Diag.appVersion}  DEVICE ${Diag.deviceId}")
    }

    /** Every probe that was not a plain timeout — i.e. everything that told us something. */
    private fun notableAttempts(): List<String> =
        Diag.attempts()
            .filter { it.outcome != Diag.Outcome.TIMEOUT && it.outcome != Diag.Outcome.UNREACHABLE }
            .map { it.toString() }

    /** Literally every address it tried, verbatim, in order. */
    private fun detailBlock(): String {
        val all = Diag.attempts()
        if (all.isEmpty()) return "(nothing probed yet)"
        val quiet = all.count {
            it.outcome == Diag.Outcome.TIMEOUT || it.outcome == Diag.Outcome.UNREACHABLE
        }
        return buildString {
            appendLine("${all.size} probes, $quiet of them no-answer.")
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

    /** Get it off the device — paste into any messaging app. Works when the network does not. */
    private fun copyDiagnostics() {
        val report = Diag.fullReport(factsBlock())
        try {
            val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("StreamStage phone diagnostics", report))
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

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    private fun button(ctx: Context, label: String) = Button(ctx).apply {
        text = label
        isAllCaps = false
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
        setTextColor(Color.WHITE)
        setBackgroundColor(Color.parseColor("#1F2430"))
        minimumHeight = (54 * ctx.resources.displayMetrics.density).toInt()
    }
}
