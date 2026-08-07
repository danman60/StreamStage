package com.streamstage.phonetoolkit

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

/**
 * THE MODE SWITCH — a two-up segmented control, and it is the second design of this bar.
 *
 * Daniel's words: *"phone app needs to be able to switch between PRESENTER MODE for controlling
 * deck and KIOSK MODE for controlling tv"*.
 *
 * WHAT THE FIRST VERSION GOT WRONG, in his words after using it on the Pixel:
 * **"currently no way to switch from kiosk to presenter"**.
 *
 * It showed ONE chip naming the mode he was already in, and switching was a LONG PRESS on it. Both
 * halves of that were wrong, and they were wrong in a way that reasoning about the layout could not
 * catch — only looking at the screen could:
 *
 *   1. A control that names the state you are ALREADY IN gives you nothing to aim at. There was no
 *      word "PRESENTER" anywhere on screen in kiosk mode, so there was nothing that looked like a
 *      way to get there. A switch has to name the DESTINATION.
 *   2. A long-press is invisible. Nothing on a screen indicates that an element wants to be held,
 *      so a hidden gesture is indistinguishable from a missing feature — which is exactly how he
 *      read it.
 *
 * So: **both modes are named on screen, all the time, side by side, and one tap on the other one
 * switches.** That is the standard segmented control, and it is the answer here for the same reason
 * it is the answer everywhere — the affordance and the state are the same pixels.
 *
 * ACCIDENT-PROOFING, which is what the long-press was buying and is not simply thrown away:
 * tapping the segment he is ALREADY IN does nothing at all (no toast, no flicker, no re-connect).
 * Only the other mode's name is live. So a stray brush across the top of the screen mid-talk either
 * lands on the inert half or misses the bar entirely — and the live half is a specific word he has
 * to hit, not a whole strip.
 *
 * The bar is two rows and ~72dp: the segments, then a status line that says which server this mode
 * is on and whether it is answering. On a 384dp-wide phone (his Pixel, at its density override)
 * that leaves each segment ~150dp — wide enough that both words render in full, which is the whole
 * point and was verified against a 384dp render rather than assumed.
 */
class ModeBar(ctx: Context) : LinearLayout(ctx) {

    /** Tapped the mode he is NOT in. Fires with that mode. */
    var onPickMode: ((Mode) -> Unit)? = null

    /** Tapped the gear — open the operator/diagnostics panel. A plain tap: see note above. */
    var onRequestPanel: (() -> Unit)? = null

    /** Kept so the panel's own "Switch mode" button still has something to open. */
    var onRequestSwitch: (() -> Unit)? = null

    private val segments = LinkedHashMap<Mode, TextView>()
    private val state = TextView(ctx)
    private val gear = TextView(ctx)
    private var currentMode: Mode = Mode.PRESENTER

    init {
        orientation = VERTICAL
        setBackgroundColor(Color.parseColor("#12151C"))
        setPadding(dp(8), dp(6), dp(8), dp(6))

        // ---- row 1: [ PRESENTER | KIOSK ]  ⚙ ----
        val row = LinearLayout(ctx).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val group = LinearLayout(ctx).apply {
            orientation = HORIZONTAL
            // One rounded well behind both segments, so they read as ONE control with two
            // positions rather than two unrelated buttons.
            background = GradientDrawable().apply {
                cornerRadius = dp(10).toFloat()
                setColor(Color.parseColor("#0B0B0F"))
                setStroke(dp(1), Color.parseColor("#2A3140"))
            }
            setPadding(dp(3), dp(3), dp(3), dp(3))
        }

        for (m in Mode.values()) {
            val seg = TextView(ctx).apply {
                text = m.label
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                setTypeface(Typeface.DEFAULT_BOLD)
                gravity = Gravity.CENTER
                // 44dp minimum: a stage thumb, not a mouse.
                minHeight = dp(44)
                setPadding(dp(6), dp(10), dp(6), dp(10))
                setOnClickListener {
                    // The segment he is already in is INERT. Nothing happens, on purpose.
                    if (m != currentMode) {
                        performHapticFeedback(android.view.HapticFeedbackConstants.VIRTUAL_KEY)
                        onPickMode?.invoke(m)
                    }
                }
            }
            segments[m] = seg
            group.addView(seg, LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        }
        row.addView(group, LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))

        gear.apply {
            text = "⚙"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            setTextColor(Color.parseColor("#C7CEDB"))
            gravity = Gravity.CENTER
            minWidth = dp(52)
            minHeight = dp(44)
            setPadding(dp(10), dp(6), dp(6), dp(6))
            // A PLAIN TAP now. It used to need a long press, for the same mistaken reason the
            // switch did, and manual host entry is the one control that must never be hard to
            // reach — it is the guaranteed fallback when discovery fails.
            setOnClickListener { onRequestPanel?.invoke() }
            setOnLongClickListener { onRequestPanel?.invoke(); true }
        }
        row.addView(gear, LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        addView(row, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))

        // ---- row 2: which server, and is it answering ----
        state.apply {
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setTextColor(Color.parseColor("#9BA3B4"))
            setPadding(dp(4), dp(5), dp(4), dp(1))
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
            // Tapping the status line opens setup too — it is the thing you are looking at when
            // the address is wrong, so it may as well be the thing you can press.
            setOnClickListener { onRequestPanel?.invoke() }
        }
        addView(state, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
    }

    /** Repaint for the current mode, host and connection state. Called on every change. */
    fun render(mode: Mode, host: ServerHost?, connected: Boolean, detail: String) {
        currentMode = mode
        for ((m, seg) in segments) {
            val on = m == mode
            seg.background = GradientDrawable().apply {
                cornerRadius = dp(8).toFloat()
                setColor(if (on) m.accentDim else Color.TRANSPARENT)
                setStroke(dp(if (on) 2 else 1), if (on) m.accent else Color.parseColor("#2A3140"))
            }
            // The INACTIVE mode is still fully legible and still carries its own colour — it is
            // the thing he is supposed to aim at, so it must not look disabled.
            seg.setTextColor(if (on) Color.WHITE else m.accent)
            seg.alpha = if (on) 1f else 0.82f
        }
        val dot = if (connected) "●" else "○"
        state.text = "$dot ${host?.toString() ?: "not connected"} · $detail"
        state.setTextColor(if (connected) Color.parseColor("#9BA3B4") else Color.parseColor("#F0A73B"))

        /*
         * GIVE THE DECK REMOTE ITS PIXELS BACK.
         *
         * presenter-server.py's /remote page is explicitly built to fit ONE phone screen with no
         * scrolling — its own comment: "No scrolling on stage: a beat you have to swipe to is a
         * beat you will not read." It measures itself and shrinks its type (fitNotes()) until the
         * slide's beats fit the height it is given. So every row of chrome this app keeps on
         * screen in PRESENTER mode literally makes his stage notes smaller.
         *
         * The status line is therefore hidden in PRESENTER mode: that page already shows its own
         * connection dot and slide position in its header, so the line is redundant there, and
         * hiding it returns ~24dp to the notes. It stays in KIOSK mode, where the native console
         * has no other place to say which laptop it is on.
         *
         * The segmented control never hides. Losing the switch again is not a trade worth 44dp.
         */
        state.visibility = if (mode == Mode.PRESENTER) View.GONE else View.VISIBLE
    }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()
}

/**
 * The chooser that a long-press opens: two big cards, each naming what that mode DRIVES rather
 * than what it is called, plus the host it will go back to.
 *
 * "PRESENTER — the slide deck on the projector" is unmistakable from arm's length in a dark room;
 * two words that both start with a hard consonant are not. Each card also shows that mode's own
 * remembered server, which is the visible proof that the two hosts are kept apart (HostStore) —
 * so a switch is instant and he can see, before he commits, exactly where it is about to go.
 */
class ModeSwitcher(ctx: Context) : FrameLayout(ctx) {

    var onPick: ((Mode) -> Unit)? = null
    var onCancel: (() -> Unit)? = null

    private val col = LinearLayout(ctx)

    init {
        setBackgroundColor(Color.parseColor("#E60B0B0F"))
        isClickable = true                  // swallow taps so nothing reaches the page underneath
        visibility = View.GONE

        col.orientation = LinearLayout.VERTICAL
        col.gravity = Gravity.CENTER
        col.setPadding(dp(22), dp(28), dp(22), dp(28))
        addView(col, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }

    fun show(current: Mode, hosts: Map<Mode, ServerHost?>) {
        col.removeAllViews()

        col.addView(TextView(context).apply {
            text = "Switch mode"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 24f)
            setTypeface(Typeface.DEFAULT_BOLD)
            gravity = Gravity.CENTER
        }, lp(0))

        col.addView(TextView(context).apply {
            text = "Each mode keeps its own laptop address."
            setTextColor(Color.parseColor("#9BA3B4"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            gravity = Gravity.CENTER
        }, lp(dp(6)))

        for (m in Mode.values()) col.addView(card(m, m == current, hosts[m]), lp(dp(18)))

        col.addView(Button(context).apply {
            text = "Cancel — stay in ${current.label}"
            isAllCaps = false
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            setTextColor(Color.parseColor("#C7CEDB"))
            setBackgroundColor(Color.parseColor("#1A1E27"))
            minimumHeight = dp(54)
            setOnClickListener { onCancel?.invoke() }
        }, lp(dp(26)))

        visibility = View.VISIBLE
    }

    fun hide() { visibility = View.GONE }

    val isShowing: Boolean get() = visibility == View.VISIBLE

    private fun card(mode: Mode, current: Boolean, host: ServerHost?): View {
        val v = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(18), dp(18), dp(18))
            background = GradientDrawable().apply {
                cornerRadius = dp(12).toFloat()
                setColor(if (current) mode.accentDim else Color.parseColor("#171B24"))
                setStroke(dp(if (current) 3 else 1), mode.accent)
            }
            isClickable = true
            setOnClickListener { onPick?.invoke(mode) }
        }
        v.addView(TextView(context).apply {
            text = mode.label + if (current) "   (current)" else ""
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 21f)
            setTypeface(Typeface.DEFAULT_BOLD)
        })
        v.addView(TextView(context).apply {
            text = "drives ${mode.drives}"
            setTextColor(Color.parseColor("#C7CEDB"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            setPadding(0, dp(4), 0, 0)
        })
        v.addView(TextView(context).apply {
            text = host?.let { "last used: $it" } ?: "no saved address yet — it will search, or you can type one"
            setTextColor(Color.parseColor("#7C859A"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            typeface = Typeface.MONOSPACE
            setPadding(0, dp(8), 0, 0)
        })
        return v
    }

    private fun lp(top: Int) = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
    ).apply { setMargins(0, top, 0, 0) }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()
}
