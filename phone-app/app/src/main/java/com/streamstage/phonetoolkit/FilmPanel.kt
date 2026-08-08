package com.streamstage.phonetoolkit

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import java.util.concurrent.ExecutorService
import java.util.concurrent.atomic.AtomicBoolean

/**
 * THE OPERATOR CONSOLE — the phone's KIOSK mode. Native, not a web page.
 *
 * Daniel's requirement, verbatim: *"Phone needs to have total management control set the playlist
 * drag and drop play pause stop It is a operator control... the tablet mode is for people walking by
 * so should have the gate on it the phone shouldn't have any gate."*
 *
 * SO: **THERE IS NO GATE ANYWHERE IN THIS FILE.** No email box, no studio-name field, no
 * tile-then-form dance, nothing between Daniel's thumb and the TV. tablet.html gates because a
 * visitor is a lead worth capturing; Daniel is not a lead, and making him type his own email to
 * demo his own product in front of a prospect is the failure this replaces. The visitor page is a
 * different device with a different job, and this app no longer offers to open it.
 *
 * WHAT IS ON SCREEN, top to bottom:
 *
 *   1. THE TV STRIP — what is playing, how far in, how long is left, and a position bar. Readable
 *      at arm's length, because that is the distance he is standing at. It also says out loud when
 *      the relay is up but NO SCREEN IS ATTACHED, which is a completely different problem from
 *      "the laptop is down" and is the one that actually happens at a booth (TV asleep, stick
 *      unplugged, tab closed).
 *   2. TRANSPORT — Play/Resume · Pause · Stop, sized for a thumb, live over whatever is on the TV.
 *   3. THE STREAMSTAGE FILM — its own button, above the list. It is the film he sells with, it is
 *      NOT one of the six product tiles, and per instruction the phone is the only surface that
 *      can start it.
 *   4. THE PLAYLIST — DRAG TO REORDER. A RecyclerView with [ItemTouchHelper], which is the
 *      standard Android answer to drag-and-drop; no gesture system was invented here. Grab the ⠿
 *      handle to drag, tap the row to cut to that film immediately.
 *
 * Every id comes from `GET /films` — nothing here hardcodes a film list, so a film rendered onto
 * the laptop tomorrow appears on the next refresh with no code change. Order is remembered by
 * [Playlist] and published to the TV as a `playlist` message (BUS-CONTRACT.md §2.4).
 *
 * POLLING, not streaming: see the connection-budget note in [KioskBus]. This panel polls
 * `GET /state` at [KioskBus.STATE_POLL_MS], single-flight, and only while it is on screen.
 */
class FilmPanel(ctx: Context) : LinearLayout(ctx) {

    /** Tap a row — cut to that film now. */
    var onPlay: ((KioskBus.Film) -> Unit)? = null
    var onPause: (() -> Unit)? = null
    var onResume: (() -> Unit)? = null
    var onStop: (() -> Unit)? = null
    var onRefresh: (() -> Unit)? = null

    /** Dropped after a drag — the new order, already saved locally, ready to publish. */
    var onReorder: ((List<KioskBus.Film>) -> Unit)? = null

    private val tvLine = TextView(ctx)
    private val posBar = View(ctx)
    private val posWrap = LinearLayout(ctx)
    private val playBtn = transport(ctx, "▶  Play")
    private val pauseBtn = transport(ctx, "❚❚  Pause")
    private val stopBtn = transport(ctx, "■  Stop")
    private val featureBtn = Button(ctx)
    private val hint = TextView(ctx)
    private val note = TextView(ctx)
    private val list = RecyclerView(ctx)
    private val empty = TextView(ctx)
    private val adapter = FilmAdapter()

    private val ui = Handler(Looper.getMainLooper())
    private val polling = AtomicBoolean(false)
    private var io: ExecutorService? = null
    private var hostProvider: (() -> ServerHost?)? = null

    /** The last film tapped, so the transport's Play button has something to re-cut to. */
    private var lastPlayed: KioskBus.Film? = null
    private var tv: KioskBus.TvState? = null

    /**
     * A play is out on the wire. Every control that can start a film is dead while it is true, so
     * the second half of a double-tap has nothing to hit — the first half is the ~1.2s gate in
     * MainActivity.playGateOpen. Two halves because they fail differently: the gate catches a fast
     * thumb on a fast relay, this catches a slow relay where the button would otherwise sit live
     * and inviting for a second or two.
     */
    private var sending = false

    /**
     * Starts a drag when the ⠿ handle is touched. Declared HERE, above `init`, because the
     * ItemTouchHelper that fills it in is created inside `init` and Kotlin initialises properties
     * in declaration order — a property declared below `init` cannot be assigned from it.
     */
    private var dragStarter: ((RecyclerView.ViewHolder) -> Unit)? = null

    init {
        orientation = VERTICAL
        setBackgroundColor(BG)

        // ---------------------------------------------------------- 1. the strip
        tvLine.apply {
            setTextColor(FG)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            typeface = Typeface.MONOSPACE
            setBackgroundColor(PANEL)
            setPadding(dp(16), dp(12), dp(16), dp(12))
            text = "TV: no answer yet"
        }
        addView(tvLine, wide())

        // A two-view progress bar rather than ProgressBar: no theme to go wrong, and the width is
        // set directly so it cannot animate out of step with a 2-second poll.
        posBar.setBackgroundColor(ACCENT)
        posWrap.apply {
            orientation = HORIZONTAL
            setBackgroundColor(Color.parseColor("#1A1E27"))
            addView(posBar, LayoutParams(0, dp(4)))
        }
        addView(posWrap, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(4)))

        // ------------------------------------------------------- 2. the transport
        val transport = LinearLayout(ctx).apply {
            orientation = HORIZONTAL
            setPadding(dp(10), dp(10), dp(10), dp(4))
        }
        playBtn.setOnClickListener {
            // One button, two meanings, decided by what the TV last said: held on a frame ->
            // resume it; anything else -> re-cut the last film he chose. Resume is idempotent on
            // the TV; a re-cut is NOT, so it goes through the same guard as every other play.
            val s = tv
            if (s != null && s.isPaused) onResume?.invoke()
            else if (!sending) lastPlayed?.let { onPlay?.invoke(it) } ?: onResume?.invoke()
        }
        pauseBtn.setOnClickListener { onPause?.invoke() }
        stopBtn.setOnClickListener { onStop?.invoke() }
        transport.addView(playBtn, weighted())
        transport.addView(pauseBtn, weighted())
        transport.addView(stopBtn, weighted())
        addView(transport, wide())

        // --------------------------------------------- 3. the StreamStage film
        featureBtn.apply {
            isAllCaps = false
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.WHITE)
            setBackgroundColor(FEATURE)
            minimumHeight = dp(64)
            text = "▶  StreamStage film — recital filming & livestream"
            visibility = View.GONE
            setOnClickListener { if (!sending) featureFilm?.let { onPlay?.invoke(it) } }
        }
        addView(featureBtn, wide(dp(10), dp(12)))

        hint.apply {
            setTextColor(DIM)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setPadding(dp(16), dp(8), dp(16), dp(6))
            text = "Tap a film to cut to it now · drag ⠿ to reorder the attract loop"
        }
        addView(hint, wide())

        // ------------------------------------------------------- 4. the playlist
        empty.apply {
            setTextColor(DIM)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            gravity = Gravity.CENTER
            setPadding(dp(20), dp(40), dp(20), dp(40))
            text = "Asking the laptop what films it has…"
        }
        addView(empty, wide())

        list.layoutManager = LinearLayoutManager(ctx)
        list.adapter = adapter
        list.setPadding(dp(10), 0, dp(10), dp(10))
        list.clipToPadding = false
        addView(list, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))

        // THE STANDARD ANSWER, not an invented gesture system. The helper is kept so the ⠿ handle
        // can start a drag on touch-down — see FilmVH.
        val helper = ItemTouchHelper(DragCallback())
        helper.attachToRecyclerView(list)
        dragStarter = { vh -> helper.startDrag(vh) }

        note.apply {
            setTextColor(Color.parseColor("#6C7488"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            setPadding(dp(16), dp(4), dp(16), dp(10))
            text = KioskBus.MUTE_NOTE
        }
        addView(note, wide())

        addView(secondary("Refresh the film list") { onRefresh?.invoke() }, wide(dp(4), dp(16)))

        renderTransport()
    }

    // ------------------------------------------------------------------- data

    private var featureFilm: KioskBus.Film? = null

    /**
     * The films the laptop has, in the operator's saved order. The StreamStage film is lifted out
     * of the list into its own button — it is not a product tile and it is the one he reaches for.
     */
    fun setFilms(list: List<KioskBus.Film>) {
        empty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
        if (list.isEmpty()) {
            empty.text = "The laptop reported no films at all.\n" +
                "Check the kiosk's media folder, then tap Refresh."
            adapter.submit(emptyList())
            featureBtn.visibility = View.GONE
            featureFilm = null
            return
        }
        featureFilm = list.firstOrNull { it.id == FEATURE_ID }
        featureBtn.visibility = if (featureFilm != null) View.VISIBLE else View.GONE
        adapter.submit(list.filter { it.id != FEATURE_ID })
    }

    /** No films fetched (or the fetch failed) — say which, do not sit blank. */
    fun setFilmsError(message: String) {
        adapter.submit(emptyList())
        featureBtn.visibility = View.GONE
        featureFilm = null
        empty.visibility = View.VISIBLE
        empty.text = message
    }

    /** The order currently on screen, feature film included at its saved position (first). */
    /**
     * The order he actually dragged — the draggable list only.
     *
     * The StreamStage film is deliberately NOT in it. That film lives in its own button above the
     * list, so it is not draggable, so this app has no idea where he would want it in the attract
     * loop — and inventing a position for it is exactly the kind of guess that produces a booth TV
     * doing something nobody asked for. BUS-CONTRACT.md §2.4 makes leaving it out well-defined:
     * ids that are not named keep their existing relative order on the TV. Silence means
     * "don't move it", which is the honest thing to say about a film he never touched.
     */
    fun currentOrder(): List<KioskBus.Film> = adapter.items.toList()

    // ------------------------------------------------------------- state poll

    fun startPolling(io: ExecutorService, hostProvider: () -> ServerHost?) {
        this.io = io
        this.hostProvider = hostProvider
        if (polling.compareAndSet(false, true)) ui.post(poller)
    }

    fun stopPolling() {
        polling.set(false)
        ui.removeCallbacks(poller)
    }

    private val poller = object : Runnable {
        override fun run() {
            if (!polling.get()) return
            val h = hostProvider?.invoke()
            val pool = io
            if (h != null && pool != null && !pool.isShutdown) {
                try {
                    pool.execute {
                        val s = KioskBus.tvState(h)
                        ui.post { if (polling.get()) render(s) }
                    }
                } catch (_: Throwable) { /* pool shutting down */ }
            }
            ui.postDelayed(this, KioskBus.STATE_POLL_MS)
        }
    }

    private var lastSeenAt = 0L
    private var staleTicks = 0

    private fun render(s: KioskBus.TvState?) {
        tv = s
        if (s == null) {
            tvLine.text = "TV: the kiosk did not answer /state"
            tvLine.setTextColor(WARN)
            adapter.markPlaying(null)
            setProgress(0f)
            renderTransport()
            return
        }
        // The TV heartbeats once a second (tv.html:981). A retained state whose timestamp stops
        // moving means NO SCREEN IS ATTACHED — the relay is fine, there is nothing on the other
        // end. Different problem, different fix, so it gets said out loud.
        if (s.atMs == lastSeenAt) staleTicks++ else { staleTicks = 0; lastSeenAt = s.atMs }
        val stale = staleTicks >= 3

        tvLine.text = if (stale) {
            "TV: no screen attached — relay is up, nothing is listening.\n" +
                "last heard: " + s.line(adapter.items)
        } else s.line(adapter.items) + (if (s.muted) "  · muted" else "  · sound on")
        tvLine.setTextColor(if (stale) WARN else FG)
        adapter.markPlaying(if (!stale && s.isPlaying) s.product else null)
        setProgress(if (stale) 0f else s.progress)
        renderTransport()
    }

    private fun setProgress(fraction: Float) {
        val w = posWrap.width
        val lp = posBar.layoutParams as LayoutParams
        lp.width = if (w > 0) (w * fraction).toInt() else 0
        posBar.layoutParams = lp
        posBar.setBackgroundColor(if (tv?.isPaused == true) WARN else ACCENT)
    }

    /**
     * A play/playfilm is on the wire, or it has come back.
     *
     * Everything that can START a film goes visibly dead in between, which is the honest thing to
     * show and the thing that stops the second tap. Pause/Stop stay live — they are idempotent on
     * the TV side and are exactly what someone reaches for when a play is taking too long. The
     * [releaseSend] safety net exists because a control that gets stuck disabled at a booth is
     * worse than the bug it was guarding against.
     */
    fun setSending(on: Boolean) {
        sending = on
        ui.removeCallbacks(releaseSend)
        if (on) ui.postDelayed(releaseSend, SEND_RELEASE_MS)
        featureBtn.alpha = if (on || featureFilm == null) 0.4f else 1f
        renderTransport()
    }

    private val releaseSend = Runnable {
        if (sending) {
            sending = false
            featureBtn.alpha = if (featureFilm == null) 0.4f else 1f
            renderTransport()
        }
    }

    /** Buttons reflect what the TV can actually do right now, so a dead tap is impossible. */
    private fun renderTransport() {
        val s = tv
        val playing = s?.isPlaying == true
        val paused = s?.isPaused == true
        playBtn.text = if (paused) "▶  Resume" else "▶  Play"
        // Resume is idempotent, so it stays available even mid-send; a re-cut does not.
        enable(playBtn, paused || (!sending && lastPlayed != null))
        enable(pauseBtn, playing && !paused)
        enable(stopBtn, playing || s?.state == "end")
    }

    private fun enable(b: Button, on: Boolean) {
        b.isEnabled = on
        b.alpha = if (on) 1f else 0.4f
    }

    /** Optimistic paint the instant a row is tapped, so a tap always feels like it landed. */
    fun showRequested(f: KioskBus.Film) {
        lastPlayed = f
        tvLine.text = "sent: play ${f.display} …"
        tvLine.setTextColor(FG)
        adapter.markPlaying(f.id)
        staleTicks = 0
        renderTransport()
    }

    fun showSendFailed(what: String) {
        tvLine.text = "COULD NOT SEND: $what — the kiosk relay did not accept it"
        tvLine.setTextColor(WARN)
    }

    fun showSent(what: String) {
        tvLine.text = "sent: $what …"
        tvLine.setTextColor(FG)
    }

    // ------------------------------------------------------------ the list

    private inner class FilmAdapter : RecyclerView.Adapter<FilmVH>() {

        val items = ArrayList<KioskBus.Film>()
        private var playingId: String? = null

        fun submit(list: List<KioskBus.Film>) {
            items.clear()
            items.addAll(list)
            notifyDataSetChanged()
        }

        fun markPlaying(id: String?) {
            if (playingId == id) return
            playingId = id
            notifyDataSetChanged()
        }

        /** Called continuously while a row is dragged. Local only — nothing is published here. */
        fun move(from: Int, to: Int) {
            if (from !in items.indices || to !in items.indices) return
            items.add(to, items.removeAt(from))
            notifyItemMoved(from, to)
        }

        override fun getItemCount() = items.size

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = FilmVH(context)

        override fun onBindViewHolder(holder: FilmVH, position: Int) {
            val f = items[position]
            holder.bind(f, f.id == playingId)
            // Dead while a play is in flight — see [sending].
            holder.itemView.setOnClickListener { if (!sending) onPlay?.invoke(f) }
        }
    }

    /**
     * One row, built in code: a drag handle, the film, its size. No layout XML, no view binding,
     * nothing to inflate wrong on an unknown device — the same call as the rest of this app.
     */
    private inner class FilmVH(ctx: Context) : RecyclerView.ViewHolder(LinearLayout(ctx)) {

        private val row = itemView as LinearLayout
        private val handle = TextView(ctx)
        private val label = TextView(ctx)

        init {
            row.orientation = HORIZONTAL
            row.gravity = Gravity.CENTER_VERTICAL
            row.minimumHeight = dp(72)
            row.layoutParams = RecyclerView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, dp(8), 0, 0) }

            handle.apply {
                text = "⠿"
                setTextColor(Color.parseColor("#6C7488"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 24f)
                gravity = Gravity.CENTER
                minWidth = dp(52)
                setPadding(dp(6), dp(18), dp(6), dp(18))
            }
            label.apply {
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
                setPadding(dp(2), dp(14), dp(14), dp(14))
            }
            row.addView(handle)
            row.addView(label, LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))

            // Touching the handle starts the drag immediately. The rest of the row stays a plain
            // tap target, so "cut to this film" never needs a long-press on a show floor.
            handle.setOnTouchListener { _, ev ->
                if (ev.actionMasked == MotionEvent.ACTION_DOWN) dragStarter?.invoke(this)
                false
            }
        }

        fun bind(f: KioskBus.Film, playing: Boolean) {
            val sb = StringBuilder()
            sb.append(if (playing) "▶  " else "")
            sb.append(f.display)
            sb.append("\n").append(f.id).append(" · ").append(f.sizeMb)
            label.text = sb
            label.setTypeface(label.typeface, if (playing) Typeface.BOLD else Typeface.NORMAL)
            row.setBackgroundColor(if (playing) ROW_ON else ROW)
        }
    }


    /**
     * Drag to reorder, vertical only, no swipe. `isLongPressDragEnabled` is OFF: the handle starts
     * the drag, so a plain tap can stay "play this now" — on a booth floor a long-press before
     * anything happens is a demo that stalls.
     */
    private inner class DragCallback : ItemTouchHelper.Callback() {

        /**
         * The order as it was when this drag STARTED, or null when no drag is under way.
         *
         * clearView() fires on every release, including a grab that moved nothing and a drag that
         * wandered down and came back to the same slot. Publishing those sent a `playlist` message
         * to the TV that said exactly what it already knew — a POST on the kiosk's connection
         * budget, and a log line that looks like the operator changed something when he did not.
         */
        private var orderAtGrab: List<String>? = null

        override fun isLongPressDragEnabled() = false
        override fun isItemViewSwipeEnabled() = false

        override fun getMovementFlags(rv: RecyclerView, vh: RecyclerView.ViewHolder) =
            makeMovementFlags(ItemTouchHelper.UP or ItemTouchHelper.DOWN, 0)

        override fun onMove(
            rv: RecyclerView,
            vh: RecyclerView.ViewHolder,
            target: RecyclerView.ViewHolder
        ): Boolean {
            adapter.move(vh.bindingAdapterPosition, target.bindingAdapterPosition)
            return true
        }

        override fun onSwiped(vh: RecyclerView.ViewHolder, direction: Int) = Unit

        override fun onSelectedChanged(vh: RecyclerView.ViewHolder?, actionState: Int) {
            super.onSelectedChanged(vh, actionState)
            if (actionState == ItemTouchHelper.ACTION_STATE_DRAG) {
                vh?.itemView?.alpha = 0.7f
                orderAtGrab = adapter.items.map { it.id }
            }
        }

        /**
         * ONE publish per gesture, on drop — not per pixel of drag. Publishing continuously would
         * put a POST on the kiosk's page port for every frame of a drag, against the one
         * connection budget this project has already been burned by.
         */
        override fun clearView(rv: RecyclerView, vh: RecyclerView.ViewHolder) {
            super.clearView(rv, vh)
            vh.itemView.alpha = 1f
            val before = orderAtGrab
            orderAtGrab = null
            val after = adapter.items.map { it.id }
            if (before == null || before == after) return    // nothing actually moved
            onReorder?.invoke(currentOrder())
        }
    }

    // ----------------------------------------------------------------- chrome

    private fun transport(ctx: Context, label: String) = Button(ctx).apply {
        text = label
        isAllCaps = false
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
        setTextColor(Color.WHITE)
        setBackgroundColor(Color.parseColor("#1F2430"))
        minimumHeight = dp(60)
    }

    private fun secondary(label: String, onClick: () -> Unit) = Button(context).apply {
        text = label
        isAllCaps = false
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
        setTextColor(Color.parseColor("#C7CEDB"))
        setBackgroundColor(Color.parseColor("#1A1E27"))
        minimumHeight = dp(48)
        setOnClickListener { onClick() }
    }

    private fun weighted() = LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        .apply { setMargins(dp(3), 0, dp(3), 0) }

    private fun wide(top: Int = 0, side: Int = 0) = LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
    ).apply { setMargins(side, top, side, 0) }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    companion object {
        /**
         * StreamStage's own recital-filming / livestream film. NOT one of the six product tiles —
         * it is an attract card on the TV — and per instruction the phone is the only surface that
         * may start it. It gets its own button above the list for that reason.
         */
        const val FEATURE_ID = "streamstage-services"

        private val BG = Color.parseColor("#0B0B0F")
        private val PANEL = Color.parseColor("#12151C")
        private val ROW = Color.parseColor("#171B24")
        private val ROW_ON = Color.parseColor("#2A2011")
        private val FEATURE = Color.parseColor("#243447")
        private val FG = Color.parseColor("#E6EAF2")
        private val DIM = Color.parseColor("#9BA3B4")
        private val WARN = Color.parseColor("#F0A73B")
        private val ACCENT = Color.parseColor("#4F8DF7")

        /**
         * Longest the play controls may stay disabled waiting for a relay that never answers.
         * KioskBus's own timeouts are shorter than this, so in practice the reply re-enables them
         * first; this only exists so a lost callback can never leave a booth control dead.
         */
        private const val SEND_RELEASE_MS = 4_000L
    }
}
