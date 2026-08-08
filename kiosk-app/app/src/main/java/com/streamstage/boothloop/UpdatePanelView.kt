package com.streamstage.boothloop

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.TypedValue
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
 *
 * ## Three things it can do that it could not before
 *
 *  - **Every film row is actionable.** SELECT on a film opens a menu for just that film: update
 *    it, roll it back, or check it. "Update all" is still there and still one press, but it is no
 *    longer the only thing the list is for.
 *  - **Roll back.** The most likely bad outcome at a booth is not a network failure, it is a
 *    render Daniel looks at on the TV and does not like. The previous version is still on the
 *    stick, so putting it back is a pointer flip: seconds, no network, no download.
 *  - **Check my stick.** Re-hashes every film against the published list and says, in English,
 *    whether this stick is right. It is the 8am question, answered without moving 350 MB.
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
         * A verified film is staged. Start applying whatever is safe to apply right now.
         *
         * Deliberately returns nothing: going live now means renaming the film into place *and
         * reading it back to prove it arrived*, which happens off the main thread. The outcome
         * comes back through [onFilmsApplied], per film, success or failure.
         */
        fun onStagedFilmReady(name: String)

        /**
         * Which version of a film is current has changed without any download — a rollback. The
         * files are all already on the stick and already verified; the reel just needs to be
         * rebuilt around the new choice, at whatever moment costs least.
         */
        fun onVersionsChanged()

        /** BACK was pressed. */
        fun onPanelClosed()
    }

    private enum class Status {
        CHECKING, UP_TO_DATE, NEW_VERSION, NOT_ON_STICK, UNKNOWN, LOCAL_ONLY,
        DOWNLOADING, STAGED, APPLIED, FAILED, ROLLED_BACK
    }

    /**
     * One logical film. [file] is whichever *version* of it is current on this stick — the name
     * on screen is always the logical one, because "costumecraft__03fcba88a2a4.mp4" is not what
     * anybody standing at a booth calls that film.
     */
    private class Row(
        val name: String,
        var localBytes: Long,
        var file: File? = null,
        var previous: String? = null,
        var entry: FilmEntry? = null,
        var status: Status = Status.UNKNOWN,
        var detail: String = "",
        var progress: Int = -1
    )

    /** Which screen the panel is showing. One remote, so one thing at a time. */
    private sealed class Mode {
        object Films : Mode()
        class Film(val row: Row) : Mode()
        class Report(val lines: List<UpdateManager.CheckLine>, val summary: String) : Mode()
        object Kiosk : Mode()
        object Address : Mode()
    }

    // ------------------------------------------------------------------ the booth kiosk

    private var busConnected = false
    private var busHost: String? = null

    /**
     * The address being typed, as four octets and a port.
     *
     * A D-pad is a terrible keyboard, so this is not a text field: UP/DOWN change the number under
     * the cursor and LEFT/RIGHT move between them. It exists for the case where the kiosk's beacon
     * cannot reach the stick — a venue router that drops broadcast — and somebody has to say where
     * the laptop is. It is the last resort behind the beacon and the remembered address, not the
     * normal path.
     */
    private val octets = intArrayOf(192, 168, 0, 1)
    private var addrPort = 8080
    private var addrField = 0

    /** Called by the activity whenever the bus connects or drops. Main thread. */
    fun onBusStatus(connected: Boolean, host: String?) {
        busConnected = connected
        busHost = host
        // Only repaint if the panel is actually showing something that mentions it.
        if (mode is Mode.Films || mode is Mode.Kiosk) render()
    }

    private fun kioskLine(): String = when {
        busConnected -> "BOOTH KIOSK   connected to ${busHost ?: "?"}"
        else -> "BOOTH KIOSK   not connected — the loop is unaffected"
    }

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
    private var mode: Mode = Mode.Films

    /** Index into the rendered item list for whichever mode is showing. */
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
        mode = Mode.Films
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

    /**
     * One row per *film*, not per file. A stick that has taken an update holds two versions of
     * that film and this list must not read as though there are two films.
     */
    private fun loadLocalRows() {
        rows.clear()
        val pointers = FilmVersions.pointers(context)
        val present = runCatching {
            mediaDir.listFiles()
                ?.filter { it.isFile && !it.name.startsWith(".") && it.extension.lowercase() in VIDEO_EXT }
                .orEmpty()
        }.getOrElse { emptyList() }

        FilmVersions.currentFiles(pointers, present)
            .sortedBy { FilmVersions.logicalName(it.name).lowercase() }
            .forEach { f ->
                val logical = FilmVersions.logicalName(f.name)
                val prev = pointers.get(logical)?.previous?.takeIf { File(mediaDir, it).isFile }
                rows += Row(logical, f.length(), file = f, previous = prev)
            }
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
            val live = row.file
            val wanted = FilmVersions.versionedName(entry.file, entry.sha256)

            row.status = when {
                wanted in staged -> Status.STAGED
                live == null || !live.isFile || live.length() == 0L -> Status.NOT_ON_STICK
                // The filename carries the sha256 of the version it holds, so for anything this
                // app installed the answer is in the name — no hashing, no records lookup.
                live.name == wanted -> Status.UP_TO_DATE
                live.length() != entry.bytes -> Status.NEW_VERSION
                installed.matches(live) && installed.get(live.name)?.sha256 == entry.sha256 ->
                    Status.UP_TO_DATE
                else -> {
                    // Right size, but nothing on this stick vouches for the contents — most
                    // likely a film pushed over adb before this feature existed. Hash it in
                    // the background rather than guess; "up to date" has to be earned.
                    toHash += row
                    Status.CHECKING
                }
            }
            row.localBytes = live?.takeIf { it.isFile }?.length() ?: 0L
        }

        // Anything on disk that the manifest says nothing about is left strictly alone.
        rows.filter { it.entry == null }.forEach { it.status = Status.LOCAL_ONLY }

        rows.sortWith(compareBy({ it.entry == null }, { it.name.lowercase() }))
        statusLine = buildString {
            append("film list v${m.version}")
            if (m.updated.isNotEmpty()) append("   published ${m.updated.take(19).replace('T', ' ')}")
            append("   ${UpdateManager.freeSpaceText(mediaDir)} free")
            if (!writable) append("\n$READ_ONLY_NOTE")
        }
        render()
        toHash.forEach { queueHash(it) }
    }

    private fun queueHash(row: Row) {
        val file = row.file ?: return
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
        object CheckStick : Item()
        class Film(val row: Row) : Item()
        object RollbackAll : Item()
        object Recheck : Item()
        object Close : Item()
        object Kiosk : Item()

        // Booth-kiosk menu
        object KioskSearch : Item()
        object KioskType : Item()
        object KioskForget : Item()

        // Per-film menu
        class UpdateOne(val row: Row) : Item()
        class RollbackOne(val row: Row) : Item()
        class CheckOne(val row: Row) : Item()
        object BackToList : Item()

        object Dismiss : Item()
    }

    private fun items(): List<Item> = when (val m = mode) {
        is Mode.Films -> buildList {
            add(Item.UpdateAll)
            add(Item.CheckStick)
            add(Item.Kiosk)
            rows.forEach { add(Item.Film(it)) }
            if (rows.any { it.previous != null }) add(Item.RollbackAll)
            add(Item.Recheck)
            add(Item.Close)
        }
        is Mode.Film -> buildList {
            add(Item.UpdateOne(m.row))
            if (m.row.previous != null) add(Item.RollbackOne(m.row))
            add(Item.CheckOne(m.row))
            add(Item.BackToList)
        }
        is Mode.Report -> listOf(Item.Dismiss)
        is Mode.Kiosk -> listOf(Item.KioskSearch, Item.KioskType, Item.KioskForget, Item.BackToList)
        is Mode.Address -> listOf(Item.BackToList)
    }

    /**
     * Films a press of "update" should act on.
     *
     * [Status.FAILED] is in this list deliberately. A download that stopped short leaves a `.part`
     * on the stick and tells the screen "press update again to resume" — and if a failed row could
     * not be pressed again, that sentence would be a lie and the resume would be unreachable
     * without closing and reopening the panel. A failure here is a *retry point*, not a dead end.
     */
    private fun changed(): List<Row> = rows.filter {
        it.status == Status.NEW_VERSION ||
            it.status == Status.NOT_ON_STICK ||
            it.status == Status.FAILED
    }

    /** Can a press of update do anything for this film right now? */
    private fun canUpdate(row: Row): Boolean = row.entry != null && row in changed()

    private fun render() {
        when (val m = mode) {
            is Mode.Films -> {
                titleView.text = "UPDATE FILMS"
                footerView.text = "UP / DOWN to move   SELECT to choose   BACK to close" +
                    "\nThe booth loop keeps playing behind this panel."
            }
            is Mode.Film -> {
                titleView.text = m.row.name.uppercase()
                footerView.text = "SELECT to choose   BACK to go back to the list" +
                    "\nThe booth loop keeps playing behind this panel."
            }
            is Mode.Report -> {
                titleView.text = "CHECK MY STICK"
                footerView.text = "SELECT or BACK to go back to the list"
            }
            is Mode.Kiosk -> {
                titleView.text = "BOOTH KIOSK"
                footerView.text = "SELECT to choose   BACK to go back to the list" +
                    "\nThe loop plays with or without a kiosk. This only adds the tablet."
            }
            is Mode.Address -> {
                titleView.text = "BOOTH KIOSK ADDRESS"
                footerView.text = "LEFT / RIGHT to move   UP / DOWN to change   " +
                    "SELECT to use it   BACK to cancel"
            }
        }

        val list = items()
        if (cursor !in list.indices) cursor = 0
        statusView.text = if (busy) "$statusLine\n$busyLabel" else statusLine
        listView.removeAllViews()

        if (mode is Mode.Address) {
            listView.addView(plainRow("", COL_DIM))
            listView.addView(plainRow("    " + addressText(), COL_NEW))
            listView.addView(plainRow("    " + addressCaret(), COL_TEXT))
            listView.addView(plainRow("", COL_DIM))
        }

        (mode as? Mode.Report)?.let { r ->
            r.lines.forEach { line ->
                listView.addView(plainRow(
                    String.format("  %-26s %s", trim(line.name, 26), line.text),
                    if (line.ok) COL_DIM else COL_BAD
                ))
            }
            listView.addView(plainRow("", COL_DIM))
        }

        var selectedView: View? = null
        list.forEachIndexed { i, item ->
            val (text, colour) = label(item)
            val tv = plainRow("  $text", colour)
            if (i == cursor) {
                tv.setBackgroundColor(COL_SELECT)
                tv.text = "▶ " + text
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

    private fun plainRow(text: String, colour: Int) = TextView(context).apply {
        typeface = Typeface.MONOSPACE
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
        setPadding(pad(12), pad(7), pad(12), pad(7))
        // One row, one line, always. A wrapped row on a TV reads as two films and pushes the
        // actions off the bottom of the screen.
        maxLines = 1
        ellipsize = android.text.TextUtils.TruncateAt.END
        setTextColor(colour)
        this.text = text
        layoutParams = LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
    }

    private fun label(item: Item): Pair<String, Int> = when (item) {
        is Item.UpdateAll -> {
            val n = changed().size
            if (n == 0) "UPDATE ALL CHANGED FILMS   (nothing to update)" to COL_DIM
            else "UPDATE ALL CHANGED FILMS   ($n)" to COL_NEW
        }
        is Item.CheckStick -> "CHECK MY STICK   (re-reads every film, no download)" to COL_TEXT
        is Item.Film -> line(item.row) to colorFor(item.row.status)
        is Item.RollbackAll -> {
            val n = rows.count { it.previous != null }
            "PUT EVERY FILM BACK TO ITS PREVIOUS VERSION   ($n)" to COL_TEXT
        }
        is Item.Recheck -> "CHECK AGAIN" to COL_TEXT
        is Item.Close -> "CLOSE" to COL_TEXT
        is Item.Kiosk -> kioskLine() to (if (busConnected) COL_OK else COL_DIM)

        is Item.KioskSearch -> "LOOK FOR IT AGAIN" to COL_TEXT
        is Item.KioskType -> "TYPE THE ADDRESS" to COL_TEXT
        is Item.KioskForget -> "FORGET THE SAVED ADDRESS" to COL_TEXT

        is Item.UpdateOne -> when (item.row.status) {
            Status.NEW_VERSION -> "UPDATE THIS FILM   (${mb(item.row.entry?.bytes ?: 0L)} to fetch)" to COL_NEW
            Status.NOT_ON_STICK -> "FETCH THIS FILM   (${mb(item.row.entry?.bytes ?: 0L)})" to COL_NEW
            // Whatever arrived before is still on the stick, so this carries on from there.
            Status.FAILED -> "TRY THIS FILM AGAIN   (carries on from where it stopped)" to COL_NEW
            Status.UP_TO_DATE -> "UPDATE THIS FILM   (already up to date)" to COL_DIM
            else -> "UPDATE THIS FILM   (nothing newer known)" to COL_DIM
        }
        is Item.RollbackOne -> "PUT THE PREVIOUS VERSION BACK" to COL_TEXT
        is Item.CheckOne -> "CHECK THIS FILM" to COL_TEXT
        is Item.BackToList -> "BACK TO THE LIST" to COL_TEXT
        is Item.Dismiss -> "BACK TO THE LIST" to COL_TEXT
    }

    private fun colorFor(s: Status) = when (s) {
        Status.UP_TO_DATE -> COL_DIM
        Status.NEW_VERSION, Status.NOT_ON_STICK -> COL_NEW
        Status.STAGED, Status.APPLIED, Status.ROLLED_BACK -> COL_OK
        Status.FAILED -> COL_BAD
        else -> COL_TEXT
    }

    private fun line(row: Row): String {
        val size = if (row.localBytes > 0) mb(row.localBytes) else "—"
        return String.format("%-24s %9s  %s", trim(row.name, 24), size, statusText(row))
    }

    private fun trim(s: String, n: Int) = if (s.length > n) s.take(n - 1) + "…" else s

    private fun addressText(): String =
        String.format("%3d . %3d . %3d . %3d   :  %5d", octets[0], octets[1], octets[2], octets[3], addrPort)

    /** A caret under the field the D-pad is currently changing. */
    private fun addressCaret(): String {
        val cols = intArrayOf(0, 6, 12, 18, 27)
        val sb = StringBuilder()
        val at = cols[addrField.coerceIn(0, 4)]
        repeat(at) { sb.append(' ') }
        sb.append(if (addrField == 4) "^^^^^" else "^^^")
        return sb.toString()
    }

    /** UP/DOWN on the octet under the caret. Ports step by 1, octets by 1, both wrap. */
    private fun bumpAddress(delta: Int) {
        if (addrField == 4) {
            addrPort = ((addrPort - 1 + delta + 65535) % 65535) + 1
        } else {
            octets[addrField] = ((octets[addrField] + delta) + 256) % 256
        }
        render()
    }

    private fun statusText(row: Row): String = when (row.status) {
        Status.CHECKING -> "checking…"
        Status.UP_TO_DATE -> if (row.previous != null) "up to date · can roll back" else "up to date"
        Status.NEW_VERSION -> "NEW VERSION · ${mb(row.entry?.bytes ?: 0L)} to fetch"
        Status.NOT_ON_STICK -> "not on this stick · ${mb(row.entry?.bytes ?: 0L)} to fetch"
        Status.UNKNOWN -> "unknown (no network)"
        Status.LOCAL_ONLY -> "on this stick only"
        Status.DOWNLOADING -> "downloading ${row.progress}%  ${bar(row.progress)}"
        Status.STAGED -> "ready · swaps in when it next comes round"
        Status.APPLIED -> "updated · plays from the next time round"
        Status.ROLLED_BACK -> "put back · plays from the next time round"
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
        // The address editor is the one screen where the D-pad means something else entirely.
        if (mode is Mode.Address) {
            when (event.keyCode) {
                KeyEvent.KEYCODE_DPAD_UP -> bumpAddress(1)
                KeyEvent.KEYCODE_DPAD_DOWN -> bumpAddress(-1)
                KeyEvent.KEYCODE_DPAD_LEFT -> { addrField = (addrField + 4) % 5; render() }
                KeyEvent.KEYCODE_DPAD_RIGHT -> { addrField = (addrField + 1) % 5; render() }
                KeyEvent.KEYCODE_DPAD_CENTER,
                KeyEvent.KEYCODE_ENTER,
                KeyEvent.KEYCODE_NUMPAD_ENTER,
                KeyEvent.KEYCODE_BUTTON_A -> {
                    val host = octets.joinToString(".")
                    BoothBus.useHost(host, addrPort)
                    statusLine = "trying $host:$addrPort — the loop is unaffected either way"
                    toList()
                }
                KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_ESCAPE -> toList()
            }
            return true
        }
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
            return
        }
        // Inside a per-film menu or a report, BACK is "up one level", not "close the panel".
        if (mode !is Mode.Films) {
            toList()
            return
        }
        host.onPanelClosed()
    }

    private fun toList() {
        mode = Mode.Films
        cursor = 0
        render()
    }

    private fun select() {
        if (busy) return
        when (val item = items()[cursor]) {
            is Item.Close -> host.onPanelClosed()
            is Item.Recheck -> open()
            is Item.UpdateAll -> startDownloads(changed())
            is Item.CheckStick -> startStickCheck(null)
            is Item.Kiosk -> { mode = Mode.Kiosk; cursor = 0; render() }
            is Item.KioskSearch -> {
                BoothBus.forgetHost()
                statusLine = "looking for the booth kiosk…"
                toList()
            }
            is Item.KioskType -> { addrField = 0; mode = Mode.Address; cursor = 0; render() }
            is Item.KioskForget -> {
                BoothBus.forgetHost()
                statusLine = "forgotten — listening for the booth kiosk again"
                toList()
            }
            is Item.RollbackAll -> rollback(rows.filter { it.previous != null })
            is Item.Film -> {
                mode = Mode.Film(item.row)
                cursor = 0
                render()
            }
            is Item.UpdateOne -> {
                val row = item.row
                if (canUpdate(row)) {
                    toList()
                    startDownloads(listOf(row))
                }
            }
            is Item.RollbackOne -> rollback(listOf(item.row))
            is Item.CheckOne -> startStickCheck(item.row)
            is Item.BackToList, is Item.Dismiss -> toList()
        }
    }

    // ------------------------------------------------------------------ rollback

    /**
     * Put films back to the version before them.
     *
     * There is nothing to download, nothing to hash and nothing to move: both versions are on the
     * stick and both were verified when they were installed. This flips a name in `films.json`,
     * which is why it is instant and why it works with the wifi off — the two properties that
     * matter when the thing being recovered from is a render Daniel does not want on the booth TV
     * in front of him.
     */
    private fun rollback(targets: List<Row>) {
        if (targets.isEmpty()) return
        var n = 0
        for (row in targets) {
            val now = UpdateManager.rollback(context, row.name) ?: continue
            n++
            row.status = Status.ROLLED_BACK
            row.file = File(mediaDir, now)
            row.localBytes = row.file?.takeIf { it.isFile }?.length() ?: 0L
            row.previous = FilmVersions.pointers(context).get(row.name)?.previous
                ?.takeIf { File(mediaDir, it).isFile }
        }
        statusLine = when (n) {
            0 -> "nothing to put back — this stick only has one version of those films"
            1 -> "${targets.first().name} put back — it plays from the next time round"
            else -> "$n films put back — they play from the next time round"
        }
        if (n > 0) host.onVersionsChanged()
        Log.i(TAG, "Rolled back $n film(s)")
        toList()
    }

    // ------------------------------------------------------------------ check my stick

    /**
     * Re-read every film off the flash and say whether it is what it should be.
     *
     * Explicitly not a network operation beyond the manifest that was already fetched when the
     * panel opened. The whole value of it is that on a show morning, on a venue's wifi or none at
     * all, the question "is this stick right?" gets a real answer in under a minute instead of a
     * 350 MB re-download nobody has the bandwidth for.
     */
    private fun startStickCheck(only: Row?) {
        busy = true
        backArmed = false
        cancelRequested = false
        busyLabel = "reading every film off the stick — this takes a moment"
        render()

        val m = manifest?.let { man ->
            if (only == null) man
            else FilmManifest(
                man.version, man.updated, man.base,
                man.films.filter { it.file.equals(only.name, ignoreCase = true) }
            )
        }
        val single = only?.name

        UpdateManager.run {
            val lines = runCatching {
                UpdateManager.checkStick(
                    context, mediaDir, m,
                    onProgress = { done, total, name ->
                        ui.post {
                            busyLabel = if (name.isEmpty()) "finishing…"
                            else "checking $name   ($done of $total)"
                            render()
                        }
                    },
                    isCancelled = { cancelRequested }
                )
            }.getOrElse {
                Log.w(TAG, "Stick check failed", it)
                emptyList()
            }
            val filtered = if (single == null) lines
            else lines.filter { it.name.equals(single, ignoreCase = true) }

            ui.post {
                busy = false
                busyLabel = ""
                val bad = filtered.count { !it.ok }
                val summary = when {
                    cancelRequested -> "stopped — nothing was changed"
                    filtered.isEmpty() -> "nothing to check"
                    bad == 0 && manifest != null ->
                        "all ${filtered.size} film(s) are correct and match the published list"
                    bad == 0 ->
                        "all ${filtered.size} film(s) match what this stick installed (no network to compare against)"
                    else -> "$bad of ${filtered.size} film(s) need attention — see below"
                }
                statusLine = summary
                mode = Mode.Report(filtered, summary)
                cursor = 0
                render()
                Log.i(TAG, "Stick check: $summary")
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

        // Snapshot: the row objects are only touched on the main thread from here on.
        val work = targets.mapNotNull { row -> row.entry?.let { row to it } }
        if (work.isEmpty()) return

        busy = true
        backArmed = false
        cancelRequested = false
        busyLabel = "checking there is room…"
        render()

        val filmBase = UpdateManager.filmBase(mediaDir, manifest)

        UpdateManager.run {
            // Refuse before the first byte, not at 80%. Space and power are both knowable now,
            // and asking costs a write probe and a StatFs — cheap, but it is still filesystem
            // work on a FUSE mount, so it happens here and not on the thread drawing the reel.
            UpdateManager.preflight(context, mediaDir, work.map { it.second })?.let { why ->
                ui.post {
                    busy = false
                    busyLabel = ""
                    statusLine = "not starting — $why"
                    render()
                }
                Log.w(TAG, "Preflight refused the update: $why")
                return@run
            }
            ui.post { busyLabel = "starting…"; render() }

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
                            // Verified and safely in staging. Each film goes in on its own, as it
                            // lands — nothing waits for the rest of the batch, because a new
                            // version has its own filename and cannot collide with anything.
                            row.status = Status.STAGED
                            host.onStagedFilmReady(row.name)
                            render()
                        }
                    }
                    is UpdateManager.DownloadResult.Cancelled -> {
                        ui.post {
                            row.status = Status.NEW_VERSION
                            row.detail = ""
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
                    cancelRequested ->
                        "stopped — nothing on this stick was changed, and what arrived is kept " +
                            "so update can pick up where it left off"
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

    /**
     * A swap pass finished. [applied] went live and were read back correct at their final path.
     * [failed] got there and did not verify, so nothing about the booth changed.
     *
     * A film only ever reads "updated" on this screen once its bytes have been confirmed where
     * they now live. Main thread.
     */
    fun onFilmsApplied(applied: List<String>, failed: List<String>) {
        if (applied.isEmpty() && failed.isEmpty()) return
        val pointers = FilmVersions.pointers(context)
        applied.forEach { name ->
            rows.firstOrNull { it.name.equals(name, ignoreCase = true) }?.let { row ->
                row.status = Status.APPLIED
                pointers.get(row.name)?.let { p ->
                    row.file = File(mediaDir, p.current)
                    row.localBytes = row.file?.takeIf { it.isFile }?.length() ?: row.localBytes
                    row.previous = p.previous?.takeIf { File(mediaDir, it).isFile }
                }
            }
        }
        failed.forEach { name ->
            rows.firstOrNull { it.name.equals(name, ignoreCase = true) }?.let {
                it.status = Status.FAILED
                it.detail = "did not verify on the stick · old film kept"
            }
        }
        if (failed.isNotEmpty() && !busy) {
            statusLine = "${failed.size} film(s) could not be replaced — the loop is unaffected"
        }
        render()
    }

    /** Called by the activity when the panel is being torn down. */
    fun onClosing() {
        cancelRequested = true
    }
}
