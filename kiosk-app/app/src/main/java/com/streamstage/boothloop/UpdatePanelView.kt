package com.streamstage.boothloop

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.io.File

/**
 * The "Update films" panel: the only user interface this app has.
 *
 * It is a TV screen driven by a five-button remote, read from three metres away, by someone
 * standing at a trade-show booth with a visitor waiting. That drives every decision here:
 *
 *  - **The truth first, actions second.** Opening the panel checks and reports. It downloads
 *    nothing. Every film shows its local size and one of `up to date` / `NEW VERSION` /
 *    `not on this stick` / `unknown (no network)` before anything can be pressed.
 *  - **Monospace, big, aligned.** Three columns that line up beat a pretty layout you have to
 *    walk towards to read.
 *  - **The loop keeps playing behind it.** The panel is an overlay; the reel and its audio
 *    carry on. Closing the panel leaves playback exactly where it was, because it was never
 *    interrupted.
 *  - **Plain English, always.** "no network — the loop is unaffected". Never an exception
 *    name, never a URL, never a stack trace. If a visitor reads this screen over Daniel's
 *    shoulder it should sound like the app is fine, because it is.
 */
@SuppressLint("ViewConstructor")
class UpdatePanelView(
    context: Context,
    private val mediaDir: File,
    private val host: Host
) : FrameLayout(context) {

    /** What the panel needs from the activity — and nothing more. */
    interface Host {
        /** File name of the film on screen right now, so it is never swapped underneath. */
        fun currentlyPlayingName(): String?

        /**
         * A verified film is staged. Apply whatever is safe to apply right now.
         * @return true if this film went live immediately (it was not the one on screen).
         */
        fun onStagedFilmReady(name: String): Boolean

        /** BACK was pressed. */
        fun onPanelClosed()
    }

    private enum class Status {
        CHECKING, UP_TO_DATE, NEW_VERSION, NOT_ON_STICK, UNKNOWN, LOCAL_ONLY,
        DOWNLOADING, STAGED, APPLIED, FAILED
    }

    private class Row(
        val name: String,
        var localBytes: Long,
        var entry: FilmEntry? = null,
        var status: Status = Status.UNKNOWN,
        var detail: String = "",
        var progress: Int = -1
    )

    private companion object {
        const val TAG = "BoothLoop/Panel"

        /**
         * Shown when the stick has not been given permission to replace films. It names the
         * one command that fixes it, because whoever is reading this is standing at a booth
         * and does not have the README to hand — the same reasoning as the no-media screen.
         */
        const val READ_ONLY_NOTE =
            "this stick cannot replace films — playback is unaffected\n" +
                "  fix from the laptop, once:  adb shell appops set --uid\n" +
                "  com.streamstage.boothloop MANAGE_EXTERNAL_STORAGE allow"

        val COL_TEXT = Color.WHITE
        val COL_DIM = Color.parseColor("#9AA0A6")
        val COL_NEW = Color.parseColor("#FFC24B")
        val COL_OK = Color.parseColor("#6BE07A")
        val COL_BAD = Color.parseColor("#FF8A80")
        val COL_SELECT = Color.parseColor("#1F5FA8")
    }

    private val ui = Handler(Looper.getMainLooper())

    private val titleView = TextView(context)
    private val statusView = TextView(context)
    private val listView = LinearLayout(context)
    private val scroll = ScrollView(context)
    private val footerView = TextView(context)

    private val rows = mutableListOf<Row>()
    private var manifest: FilmManifest? = null

    /** Index into the rendered item list: 0 = "update all", then rows, then recheck, close. */
    private var cursor = 0

    private var busy = false
    private var busyLabel = ""
    @Volatile private var cancelRequested = false
    private var backArmed = false
    private var statusLine = "checking…"
    private var writable = true

    init {
        setBackgroundColor(Color.parseColor("#F2000000"))
        isClickable = true
        layoutParams = LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )

        val column = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad(48), pad(36), pad(48), pad(28))
            layoutParams = LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        titleView.apply {
            text = "UPDATE FILMS"
            setTextColor(COL_TEXT)
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 30f)
        }
        statusView.apply {
            setTextColor(COL_DIM)
            typeface = Typeface.MONOSPACE
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
            setPadding(0, pad(8), 0, pad(16))
        }
        listView.orientation = LinearLayout.VERTICAL
        scroll.apply {
            isVerticalScrollBarEnabled = false
            addView(
                listView,
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
            )
        }
        footerView.apply {
            setTextColor(COL_DIM)
            typeface = Typeface.MONOSPACE
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            setPadding(0, pad(16), 0, 0)
            text = "UP / DOWN to move   SELECT to choose   BACK to close" +
                "\nThe booth loop keeps playing behind this panel."
        }

        column.addView(titleView)
        column.addView(statusView)
        column.addView(
            scroll,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
            )
        )
        column.addView(footerView)
        addView(column)
    }

    private fun pad(dp: Int): Int =
        (dp * resources.displayMetrics.density / 2f).toInt().coerceAtLeast(1)

    // ------------------------------------------------------------------ opening

    /**
     * Reads the folder, paints what is there, and *then* asks the network. Order matters: the
     * panel is useful and honest even if the check never comes back.
     */
    fun open() {
        cancelRequested = false
        backArmed = false
        busy = false
        cursor = 0
        loadLocalRows()
        statusLine = "checking for new films…"
        render()

        UpdateManager.run {
            UpdateManager.sweepPartials(mediaDir)
            val writableNow = UpdateManager.canWriteMedia(mediaDir)
            val result = UpdateManager.fetchManifest(mediaDir)
            ui.post {
                writable = writableNow
                when (result) {
                    is UpdateManager.CheckResult.Ok -> applyManifest(result.manifest)
                    is UpdateManager.CheckResult.Failed -> {
                        manifest = null
                        rows.forEach {
                            if (it.status != Status.STAGED) it.status = Status.UNKNOWN
                        }
                        statusLine = result.message
                        render()
                    }
                }
            }
        }
    }

    private fun loadLocalRows() {
        rows.clear()
        val local = runCatching {
            mediaDir.listFiles()
                ?.filter { it.isFile && !it.name.startsWith(".") && it.extension.lowercase() in VIDEO_EXT }
                ?.sortedBy { it.name.lowercase() }
                .orEmpty()
        }.getOrElse { emptyList() }
        local.forEach { rows += Row(it.name, it.length()) }
    }

    private val VIDEO_EXT = setOf("mp4", "m4v", "mkv", "webm", "mov", "ts")

    /** Works out, without downloading a byte, what each film's situation actually is. */
    private fun applyManifest(m: FilmManifest) {
        manifest = m
        val staged = runCatching {
            UpdateManager.stagingDir(mediaDir).listFiles()
                ?.filter { it.isFile && !it.name.endsWith(".part") }
                ?.map { it.name }?.toSet().orEmpty()
        }.getOrElse { emptySet() }

        val installed = InstallRecords.installed(context)
        val toHash = mutableListOf<Row>()

        for (entry in m.films) {
            val row = rows.firstOrNull { it.name.equals(entry.file, ignoreCase = true) }
                ?: Row(entry.file, 0L).also { rows += it }
            row.entry = entry
            val live = File(mediaDir, row.name)

            row.status = when {
                row.name in staged -> Status.STAGED
                !live.isFile || live.length() == 0L -> Status.NOT_ON_STICK
                live.length() != entry.bytes -> Status.NEW_VERSION
                installed.matches(live) && installed.get(row.name)?.sha256 == entry.sha256 ->
                    Status.UP_TO_DATE
                else -> {
                    // Right size, but nothing on this stick vouches for the contents — most
                    // likely a film pushed over adb before this feature existed. Hash it in
                    // the background rather than guess; "up to date" has to be earned.
                    toHash += row
                    Status.CHECKING
                }
            }
            row.localBytes = if (live.isFile) live.length() else 0L
        }

        // Anything on disk that the manifest says nothing about is left strictly alone.
        rows.filter { it.entry == null }.forEach { it.status = Status.LOCAL_ONLY }

        rows.sortWith(compareBy({ it.entry == null }, { it.name.lowercase() }))
        statusLine = buildString {
            append("film list v${m.version}")
            if (m.updated.isNotEmpty()) append("   published ${m.updated.take(19).replace('T', ' ')}")
            if (!writable) append("\n$READ_ONLY_NOTE")
        }
        render()
        toHash.forEach { queueHash(it) }
    }

    private fun queueHash(row: Row) {
        val file = File(mediaDir, row.name)
        UpdateManager.run {
            val sha = UpdateManager.localSha256(context, file) { cancelRequested }
            ui.post {
                if (row.status != Status.CHECKING) return@post
                val want = row.entry?.sha256
                row.status = when {
                    sha == null -> Status.UNKNOWN
                    sha == want -> Status.UP_TO_DATE
                    else -> Status.NEW_VERSION
                }
                render()
            }
        }
    }

    // ------------------------------------------------------------------ rendering

    private sealed class Item {
        object UpdateAll : Item()
        class Film(val row: Row) : Item()
        object Recheck : Item()
        object Close : Item()
    }

    private fun items(): List<Item> =
        listOf(Item.UpdateAll) + rows.map { Item.Film(it) } + listOf(Item.Recheck, Item.Close)

    private fun changed(): List<Row> =
        rows.filter { it.status == Status.NEW_VERSION || it.status == Status.NOT_ON_STICK }

    private fun render() {
        val list = items()
        if (cursor !in list.indices) cursor = 0
        statusView.text = if (busy) "$statusLine\n$busyLabel" else statusLine
        listView.removeAllViews()

        var selectedView: View? = null
        list.forEachIndexed { i, item ->
            val tv = TextView(context).apply {
                typeface = Typeface.MONOSPACE
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
                setPadding(pad(12), pad(7), pad(12), pad(7))
                // One row, one line, always. A wrapped row on a TV reads as two films and
                // pushes the actions off the bottom of the screen.
                maxLines = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
            }
            when (item) {
                is Item.UpdateAll -> {
                    val n = changed().size
                    tv.text = if (n == 0) "  UPDATE ALL CHANGED FILMS   (nothing to update)"
                    else "  UPDATE ALL CHANGED FILMS   ($n)"
                    tv.setTextColor(if (n == 0) COL_DIM else COL_NEW)
                }
                is Item.Film -> {
                    tv.text = "  " + line(item.row)
                    tv.setTextColor(colorFor(item.row.status))
                }
                is Item.Recheck -> {
                    tv.text = "  CHECK AGAIN"
                    tv.setTextColor(COL_TEXT)
                }
                is Item.Close -> {
                    tv.text = "  CLOSE"
                    tv.setTextColor(COL_TEXT)
                }
            }
            if (i == cursor) {
                tv.setBackgroundColor(COL_SELECT)
                tv.text = "▶ " + tv.text.toString().trimStart()
                selectedView = tv
            }
            listView.addView(tv)
        }
        selectedView?.let { v ->
            scroll.post {
                val target = v.top - scroll.height / 2 + v.height / 2
                scroll.smoothScrollTo(0, target.coerceAtLeast(0))
            }
        }
    }

    private fun colorFor(s: Status) = when (s) {
        Status.UP_TO_DATE -> COL_DIM
        Status.NEW_VERSION, Status.NOT_ON_STICK -> COL_NEW
        Status.STAGED, Status.APPLIED -> COL_OK
        Status.FAILED -> COL_BAD
        else -> COL_TEXT
    }

    private fun line(row: Row): String {
        val name = row.name.let { if (it.length > 24) it.take(23) + "…" else it }
        val size = if (row.localBytes > 0) mb(row.localBytes) else "—"
        return String.format("%-24s %9s  %s", name, size, statusText(row))
    }

    private fun statusText(row: Row): String = when (row.status) {
        Status.CHECKING -> "checking…"
        Status.UP_TO_DATE -> "up to date"
        Status.NEW_VERSION -> "NEW VERSION \u00b7 ${mb(row.entry?.bytes ?: 0L)} to fetch"
        Status.NOT_ON_STICK -> "not on this stick \u00b7 ${mb(row.entry?.bytes ?: 0L)} to fetch"
        Status.UNKNOWN -> "unknown (no network)"
        Status.LOCAL_ONLY -> "on this stick only"
        Status.DOWNLOADING -> "downloading ${row.progress}%  ${bar(row.progress)}"
        Status.STAGED -> "ready \u00b7 swaps in when it next comes round"
        Status.APPLIED -> "updated"
        Status.FAILED -> row.detail
    }

    private fun bar(pct: Int): String {
        val filled = (pct.coerceIn(0, 100) / 10)
        return "[" + "█".repeat(filled) + "░".repeat(10 - filled) + "]"
    }

    private fun mb(bytes: Long): String =
        if (bytes <= 0) "—" else String.format("%.1f MB", bytes / 1024.0 / 1024.0)

    // ------------------------------------------------------------------ input

    /** Every key while the panel is open is ours. Returns true always: nothing leaks through. */
    fun handleKey(event: KeyEvent): Boolean {
        if (event.action != KeyEvent.ACTION_DOWN) return true
        when (event.keyCode) {
            KeyEvent.KEYCODE_DPAD_UP -> move(-1)
            KeyEvent.KEYCODE_DPAD_DOWN -> move(1)
            KeyEvent.KEYCODE_DPAD_CENTER,
            KeyEvent.KEYCODE_ENTER,
            KeyEvent.KEYCODE_NUMPAD_ENTER,
            KeyEvent.KEYCODE_BUTTON_A -> select()
            KeyEvent.KEYCODE_BACK,
            KeyEvent.KEYCODE_ESCAPE,
            KeyEvent.KEYCODE_MENU -> back()
        }
        return true
    }

    private fun move(delta: Int) {
        val n = items().size
        if (n == 0) return
        cursor = ((cursor + delta) % n + n) % n
        backArmed = false
        render()
    }

    private fun back() {
        if (busy) {
            // One accidental BACK must not abandon a download half way. Two, deliberately, does.
            if (!backArmed) {
                backArmed = true
                busyLabel = "$busyLabel   — press BACK again to stop"
                render()
                return
            }
            cancelRequested = true
        }
        host.onPanelClosed()
    }

    private fun select() {
        if (busy) return
        when (val item = items()[cursor]) {
            is Item.Close -> host.onPanelClosed()
            is Item.Recheck -> open()
            is Item.UpdateAll -> startDownloads(changed())
            is Item.Film -> {
                val row = item.row
                if (row.status == Status.NEW_VERSION || row.status == Status.NOT_ON_STICK) {
                    startDownloads(listOf(row))
                }
            }
        }
    }

    // ------------------------------------------------------------------ downloading

    private fun startDownloads(targets: List<Row>) {
        if (targets.isEmpty()) return
        if (!writable) {
            statusLine = READ_ONLY_NOTE
            render()
            return
        }
        busy = true
        backArmed = false
        cancelRequested = false
        busyLabel = "starting…"
        render()

        // Snapshot: the row objects are only touched on the main thread from here on.
        val work = targets.mapNotNull { row -> row.entry?.let { row to it } }
        val filmBase = UpdateManager.filmBase(mediaDir, manifest)

        UpdateManager.run {
            var okCount = 0
            var failCount = 0
            for ((row, entry) in work) {
                if (cancelRequested) break
                ui.post {
                    row.status = Status.DOWNLOADING
                    row.progress = 0
                    busyLabel = "downloading ${entry.file}"
                    render()
                }
                val result = UpdateManager.download(
                    context, mediaDir, filmBase, entry,
                    onProgress = { got, total ->
                        val pct = if (total > 0) ((got * 100) / total).toInt() else 0
                        ui.post {
                            if (row.progress != pct) {
                                row.progress = pct
                                render()
                            }
                        }
                    },
                    isCancelled = { cancelRequested }
                )
                when (result) {
                    is UpdateManager.DownloadResult.Staged -> {
                        okCount++
                        ui.post {
                            row.detail = ""
                            // Swap in anything that is not on screen right now; a film that is
                            // on screen stays staged and says so.
                            val live = host.onStagedFilmReady(row.name)
                            row.status = if (live) Status.APPLIED else Status.STAGED
                            render()
                        }
                    }
                    is UpdateManager.DownloadResult.Cancelled -> {
                        ui.post {
                            row.status = Status.NEW_VERSION
                            render()
                        }
                    }
                    is UpdateManager.DownloadResult.Failed -> {
                        failCount++
                        ui.post {
                            row.status = Status.FAILED
                            row.detail = result.message
                            render()
                        }
                    }
                }
            }
            ui.post {
                busy = false
                busyLabel = ""
                statusLine = when {
                    cancelRequested -> "stopped — nothing on this stick was changed"
                    failCount > 0 && okCount == 0 -> "nothing was updated — the loop is unaffected"
                    failCount > 0 -> "$okCount updated, $failCount could not be — the loop is unaffected"
                    okCount > 0 -> "$okCount film(s) ready — each swaps in when it next comes around"
                    else -> statusLine
                }
                render()
                Log.i(TAG, "Update run finished: ok=$okCount fail=$failCount cancelled=$cancelRequested")
            }
        }
    }

    /** Called by the activity when the panel is being torn down. */
    fun onClosing() {
        cancelRequested = true
    }
}
