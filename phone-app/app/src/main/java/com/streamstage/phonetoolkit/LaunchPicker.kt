package com.streamstage.phonetoolkit

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
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
import android.widget.ScrollView
import android.widget.TextView

/**
 * THE FIRST THING ON SCREEN. NOTHING HAPPENS UNTIL IT IS ANSWERED.
 *
 * Daniel, verbatim: *"we need the phone apk updated to pick kiosk or deck"*, *"they shouldn't be
 * depending on eachother"*.
 *
 * WHAT THIS REPLACES, and why it cost him a rehearsal window:
 * the app used to restore its LAST mode from SharedPreferences on launch and immediately call
 * `startConnect()`. That mode was KIOSK, the kiosk was not running, and `Discovery.locate()` then
 * spent a saved-host probe + a 46-port walk + a 254-address two-stage sweep of every interface
 * looking for a laptop that was switched off. The deck remote sat behind all of it. On hotel wifi
 * the sweep could not have succeeded anyway — the phone was 172.20.1.83/20 and DART was
 * 172.20.6.122, outside the /24 that Discovery covers.
 *
 * So the rules this screen enforces:
 *
 *   1. **ASK FIRST.** No connection, no probe, no sweep, no page load happens before a tap. The
 *      last-used mode is only a highlight on a card — it never acts.
 *   2. **THE ADDRESS IS ON SCREEN, TYPEABLE, NEXT TO THE BUTTON THAT USES IT.** Manual host entry
 *      is the primary path here, not the fallback it is in [SetupOverlay].
 *   3. **THE TWO MODES ARE INDEPENDENT.** Starting DECK never touches the kiosk, never probes it,
 *      never needs it to exist. Same the other way round.
 *   4. **A SWEEP ONLY EVER HAPPENS ON THE "Search this network" BUTTON.** It is a separate,
 *      smaller, clearly-labelled control that says how long it takes before you press it.
 */
class LaunchPicker(ctx: Context) : FrameLayout(ctx) {

    /** START tapped on a card: this mode, with whatever is in that card's address box. */
    var onStart: ((Mode, String) -> Unit)? = null

    /** "Search this network" tapped on a card. The ONLY route to a LAN sweep in this app. */
    var onSearch: ((Mode) -> Unit)? = null

    /** "Open it anyway" after a probe failed — same meaning as SetupOverlay.onForce. */
    var onForce: ((Mode, String) -> Unit)? = null

    private val col = LinearLayout(ctx)
    private val status = TextView(ctx)
    private val force = Button(ctx)
    private val hostFields = LinkedHashMap<Mode, EditText>()
    private val startButtons = LinkedHashMap<Mode, Button>()

    private var forceTarget: Pair<Mode, String>? = null

    init {
        setBackgroundColor(Color.parseColor("#0B0B0F"))
        isClickable = true                      // swallow taps: nothing behind this is live yet
        visibility = View.GONE

        val scroll = ScrollView(ctx)
        col.orientation = LinearLayout.VERTICAL
        col.setPadding(dp(18), dp(22), dp(18), dp(40))
        scroll.addView(col)
        addView(scroll, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }

    /**
     * Paint the picker. [saved] is each mode's remembered address; [fallback] is what to prefill
     * when a mode has nothing remembered yet.
     */
    fun show(lastMode: Mode, saved: Map<Mode, ServerHost?>, fallback: Map<Mode, String>) {
        col.removeAllViews()
        hostFields.clear()
        startButtons.clear()
        forceTarget = null

        col.addView(TextView(context).apply {
            text = "What is this phone driving?"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 26f)
            setTypeface(Typeface.DEFAULT_BOLD)
        }, lp(0))

        col.addView(TextView(context).apply {
            text = "Pick one. Nothing connects and nothing searches the network until you do — " +
                "and the two modes never need each other."
            setTextColor(Color.parseColor("#9BA3B4"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        }, lp(dp(8)))

        status.apply {
            setTextColor(Color.parseColor("#C7CEDB"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            setBackgroundColor(Color.parseColor("#12151C"))
            setPadding(dp(12), dp(10), dp(12), dp(10))
            visibility = View.GONE
        }
        col.addView(status, lp(dp(14)))

        force.apply {
            isAllCaps = false
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#3A2A16"))
            minimumHeight = dp(52)
            visibility = View.GONE
            setOnClickListener { forceTarget?.let { (m, addr) -> onForce?.invoke(m, addr) } }
        }
        col.addView(force, lp(dp(8)))

        // DECK first, always — it is the stage, and the stage has a clock.
        for (m in listOf(Mode.PRESENTER, Mode.KIOSK)) {
            col.addView(card(m, m == lastMode, saved[m], fallback[m].orEmpty()), lp(dp(16)))
        }

        col.addView(TextView(context).apply {
            text = "APP ${Diag.appVersion}"
            setTextColor(Color.parseColor("#5A6272"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            gravity = Gravity.CENTER
        }, lp(dp(22)))

        visibility = View.VISIBLE
    }

    /** One card: what it drives, the address it will use, and the button that uses it. */
    private fun card(mode: Mode, last: Boolean, saved: ServerHost?, fallback: String): View {
        val v = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(16), dp(16), dp(16))
            background = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat()
                setColor(Color.parseColor("#141821"))
                setStroke(dp(if (last) 3 else 1), mode.accent)
            }
        }

        v.addView(TextView(context).apply {
            text = mode.pickLabel
            setTextColor(mode.accent)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 28f)
            setTypeface(Typeface.DEFAULT_BOLD)
        })

        v.addView(TextView(context).apply {
            text = "drives ${mode.drives}" + if (last) "   ·   last used" else ""
            setTextColor(Color.parseColor("#C7CEDB"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            setPadding(0, dp(4), 0, 0)
        })

        v.addView(TextView(context).apply {
            text = "address of ${mode.serverName}"
            setTextColor(Color.parseColor("#7C859A"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setPadding(0, dp(14), 0, dp(4))
        })

        val field = EditText(context).apply {
            setText(saved?.toString() ?: fallback)
            hint = "192.168.0.13:${mode.seedPorts.first()}"
            setHintTextColor(Color.parseColor("#5A6272"))
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            typeface = Typeface.MONOSPACE
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setSingleLine(true)
            imeOptions = EditorInfo.IME_FLAG_NO_EXTRACT_UI or
                EditorInfo.IME_FLAG_NO_FULLSCREEN or EditorInfo.IME_ACTION_GO
            setBackgroundColor(Color.parseColor("#0B0B0F"))
            setPadding(dp(14), dp(14), dp(14), dp(14))
            setOnEditorActionListener { _, _, _ -> onStart?.invoke(mode, text.toString()); true }
        }
        hostFields[mode] = field
        v.addView(field, row(dp(2)))

        val go = Button(context).apply {
            text = "START ${mode.pickLabel}"
            isAllCaps = false
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 19f)
            setTypeface(Typeface.DEFAULT_BOLD)
            setTextColor(Color.WHITE)
            setBackgroundColor(mode.accent)
            minimumHeight = dp(62)
            setOnClickListener { onStart?.invoke(mode, field.text.toString()) }
        }
        startButtons[mode] = go
        v.addView(go, row(dp(12)))

        v.addView(Button(context).apply {
            text = "Search this network for it (slow — up to a minute)"
            isAllCaps = false
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setTextColor(Color.parseColor("#9BA3B4"))
            setBackgroundColor(Color.parseColor("#1A1E27"))
            minimumHeight = dp(46)
            setOnClickListener { onSearch?.invoke(mode) }
        }, row(dp(8)))

        return v
    }

    /** A line of truth above the cards. Neutral colour. */
    fun setStatus(text: String) {
        status.text = text
        status.setTextColor(Color.parseColor("#C7CEDB"))
        status.visibility = View.VISIBLE
        force.visibility = View.GONE
    }

    /** The probe failed. Say so in red, and offer to open it anyway. */
    fun setFailure(mode: Mode, addr: String, text: String) {
        status.text = text
        status.setTextColor(Color.parseColor("#FF8A8A"))
        status.visibility = View.VISIBLE
        forceTarget = mode to addr
        force.text = "Open $addr anyway"
        force.visibility = View.VISIBLE
    }

    /** Both START buttons dead while a probe is out, so a second tap cannot queue behind it. */
    fun setBusy(busy: Boolean) {
        for ((_, b) in startButtons) {
            b.isEnabled = !busy
            b.alpha = if (busy) 0.5f else 1f
        }
    }

    /** What is typed in a mode's box right now — used when a sweep needs a starting point. */
    fun hostText(mode: Mode): String = hostFields[mode]?.text?.toString().orEmpty()

    fun hide() {
        visibility = View.GONE
        setBusy(false)
    }

    val isShowing: Boolean get() = visibility == View.VISIBLE

    private fun lp(top: Int) = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
    ).apply { setMargins(0, top, 0, 0) }

    private fun row(top: Int) = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
    ).apply { setMargins(0, top, 0, 0) }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()
}
