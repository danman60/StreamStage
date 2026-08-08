package com.streamstage.boothloop

import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.graphics.Typeface
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import androidx.annotation.OptIn
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import android.app.Activity
import java.io.File

/**
 * The booth attract loop. One activity, one player, no UI.
 *
 * Design rule for every line in this file: **it has to work when everything else is dead.**
 * No laptop, no Wi-Fi, no router, no phone, nobody at the booth. Plug the stick into a rented
 * TV, and the loop plays. Anything that could stop that is either removed or defended against.
 *
 * Consequences of that rule, all deliberate:
 *  - Audio focus is NOT honoured. A notification chime must not duck or pause the booth reel.
 *  - A file that fails to decode is skipped, not fatal.
 *  - A watchdog restarts playback if it ever stalls with nobody around to notice.
 *  - Remote keys are swallowed so a passer-by cannot pause, seek or exit by accident.
 *
 * ## The updater, and why it does not weaken any of that
 *
 * The app can now fetch new films over the internet, and the INTERNET permission exists for
 * that. It is worth being precise about what did and did not change:
 *
 *  - **It only ever runs when Daniel presses a button on the remote.** MENU, or a long press
 *    of SELECT, opens the update panel. There is no boot check, no poll, no scheduled job and
 *    no timer anywhere in this app. Playback does not consult the network at any point.
 *  - **Playback never depends on it.** [startPlayback] reads the local folder, exactly as
 *    before. Pull the aerial out, fly the stick to Calgary in a bag, plug it into a rented TV
 *    with no wifi: the reel plays and nothing on screen mentions a network.
 *  - **A failed update is a no-op, not a degraded booth.** See [UpdateManager] — a film only
 *    goes live after a full download whose byte count *and* sha256 match the manifest, and
 *    going live is one atomic rename into a filename that has never existed on this device.
 *  - **A film on screen is never swapped underneath a visitor.** Verified downloads wait in
 *    `.staging` until [applyStagedFilms] catches a loop boundary for them.
 *  - **A film Daniel does not like can be put back in seconds, with no network.** See
 *    [UpdateManager.rollback]; the previous version is still on the stick.
 */
@OptIn(UnstableApi::class)
class BoothLoopActivity : Activity() {

    private companion object {
        const val TAG = "BoothLoop"

        // Deliberate exit code: DOWN DOWN UP UP BACK on the Fire TV remote, inside this window.
        //
        // An earlier version used "BACK five times fast". That was wrong for a Fire Stick:
        // BACK is the key a confused visitor mashes hardest, and five presses in three seconds
        // is easy to hit by accident — which would drop the booth TV to the Fire OS launcher
        // mid-show. Now a lone BACK does nothing at all, and leaving requires a D-pad sequence
        // nobody produces by fidgeting.
        val EXIT_CODE = intArrayOf(
            KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_BACK
        )
        const val EXIT_WINDOW_MS = 5_000L

        // Watchdog cadence. Cheap enough to run forever, fast enough that a stall is
        // measured in seconds of black screen rather than minutes.
        const val WATCHDOG_INTERVAL_MS = 10_000L

        // How long a film stays out of the reel after it failed to play. Long enough that a
        // genuinely broken film is not retried every loop; short enough that a transient failure
        // does not cost the whole show. The booth runs for eight hours — "until reboot" is not an
        // acceptable duration for a decision made from one bad read.
        const val BLACKLIST_TTL_MS = 20 * 60 * 1000L

        const val STATE_ITEM_INDEX = "item_index"
        const val STATE_POSITION_MS = "position_ms"

        const val REQ_STORAGE = 1001

        // How long SELECT has to be held to mean "open the update panel". Long enough that a
        // visitor prodding the button never gets there, short enough to be discoverable.
        // SELECT still does nothing at all on a normal press.
        const val LONG_PRESS_MS = 800L
    }

    private var player: ExoPlayer? = null
    // True between release() and the next build. See livePlayer().
    private var playerReleased = false
    private var playerView: PlayerView? = null
    private var root: FrameLayout? = null
    private var messageView: TextView? = null

    /** The update panel, or null when the booth is doing its job and nobody is fiddling. */
    private var panel: UpdatePanelView? = null

    /**
     * Cheap guard so the transition callback does not stat the sdcard on every film change.
     * Set true at startup (a previous run may have left something staged) and whenever a
     * download stages a film; cleared once staging is confirmed empty.
     */
    private var mayHaveStaged = true

    /**
     * When a rebuild has to keep playing a specific film rather than a specific index. Matched by
     * *logical* name, so it still finds the film after a version change renamed the file.
     */
    private var resumeFileName: String? = null

    /**
     * A film's current version changed (an update landed, or Daniel rolled one back), so the
     * player's item list — which is a list of concrete file paths — is out of date.
     *
     * Deliberately not acted on immediately. The pointer flip is already safe and already
     * complete; rebuilding the player is the only part anybody can *see*, so it waits for a film
     * boundary, where a rebuild costs a frame nobody was watching for. The one exception is when
     * there is no player at all, which is not an interruption of anything.
     */
    private var reelDirty = false

    /** True once the current SELECT press has been held long enough to count as a long press. */
    private var selectHeldLong = false

    @Suppress("DEPRECATION")
    private var wakeLock: PowerManager.WakeLock? = null

    private val handler = Handler(Looper.getMainLooper())

    private var startIndex = 0
    private var startPositionMs = 0L

    /** How much of EXIT_CODE has been matched so far, and when the run started. */
    private var exitCodeProgress = 0
    private var exitCodeStartedAt = 0L

    /**
     * Files whose decode failed, and when. Skipped so one bad push cannot stall the booth.
     *
     * **An entry expires.** It used to be a permanent set, and permanent meant "until somebody
     * power-cycles the stick" — so a film that failed once at 9am was out of the reel for the
     * whole show, even if what made it fail was a moment of contention rather than the film. That
     * is a lot of consequence for one bad read. Now an entry is forgiven after
     * [BLACKLIST_TTL_MS] and the film is tried again; if it is genuinely broken it fails once more
     * and goes back on the list, which costs one skipped slot every twenty minutes and nothing
     * else. `Playlist.verified()` is still what stops a film that is provably damaged from being
     * retried at all.
     */
    private val failedFiles = mutableMapOf<String, Long>()

    // ---------------------------------------------------------------- the bus

    /**
     * True while a film is held by a `pause` off the bus, as opposed to stalled.
     *
     * The stall watchdog exists to rescue a frozen booth TV, and a deliberate pause looks exactly
     * like a freeze from the outside: `isPlaying` false, position not moving. Without this the
     * watchdog would "rescue" the operator's pause within twenty seconds — skip the film and carry
     * on — which is the opposite of what he asked for.
     */
    private var pausedByOperator = false

    /**
     * When the operator's pause is abandoned, in `SystemClock.uptimeMillis`.
     *
     * A dead-man switch, matching the one `serve.py` runs for the browser TV. A booth screen frozen
     * on one frame because Daniel got pulled into a conversation is worse than losing his place, so
     * after five minutes the reel takes itself back. The loop is the one thing on that screen that
     * has to survive everything, including its own operator.
     */
    private var pauseExpiresAt = 0L

    /** Set by a `play`/`playfilm` off the bus; cleared by `stop` or when that film ends. */
    private var commandedFilm: String? = null

    /** The kiosk address, purely so the panel can show it. Never on the booth screen. */
    private var busHost: String? = null

    /** Media basename — `studiosage` — which is what every id on the bus is. */
    private fun basename(file: String): String =
        FilmVersions.logicalName(file).substringBeforeLast('.')

    /** The reel, as media basenames, in the order it will play. */
    private fun reelBasenames(): List<String> {
        val p = player ?: return emptyList()
        return (0 until p.mediaItemCount).mapNotNull {
            p.getMediaItemAt(it).localConfiguration?.uri?.lastPathSegment?.let(::basename)
        }
    }

    /**
     * Tell the bus what this screen is doing, in the retained `tv` shape the browser TV publishes.
     *
     * `state` is `"playing"` only while a film the operator explicitly asked for is on screen.
     * The rest of the time the reel *is* the attract loop, so it says `"attract"` — but it still
     * reports `product`, `pos` and `dur`, because "what is on the booth TV right now" is a useful
     * answer whether or not anybody commanded it.
     */
    private val busTicker = object : Runnable {
        override fun run() {
            val p = player
            if (p != null) {
                val now = currentlyPlayingName()?.let(::basename)
                BoothBus.setState(
                    BoothBus.TvState(
                        state = if (commandedFilm != null && commandedFilm == now) "playing" else "attract",
                        product = now,
                        pos = p.currentPosition.coerceAtLeast(0L) / 1000.0,
                        dur = p.duration.takeIf { it > 0 }?.div(1000.0) ?: 0.0,
                        muted = p.volume <= 0.01f,
                        paused = pausedByOperator,
                        order = reelBasenames(),
                        warm = p.mediaItemCount
                    )
                )
            }
            // The dead-man on a pause nobody came back to.
            if (pausedByOperator && android.os.SystemClock.uptimeMillis() > pauseExpiresAt) {
                Log.w(TAG, "Operator pause expired after ${PAUSE_DEADMAN_MS / 60000} min — " +
                        "the booth takes the reel back")
                resumeFromOperatorPause()
            }
            handler.postDelayed(this, 1_000L)
        }
    }

    private val busListener = object : BoothBus.Listener {
        override fun onBusStatus(connected: Boolean, host: String?) {
            busHost = host
            panel?.onBusStatus(connected, host)
            // Deliberately nothing on the TV. A booth screen must never show a network state.
        }

        override fun onBusCommand(command: BoothBus.Command) {
            // Every branch below is written so that the worst case is "the reel keeps playing".
            runCatching { obey(command) }
                .onFailure { Log.w(TAG, "Bus command failed — the reel is unaffected", it) }
        }
    }

    /** Main thread. */
    private fun obey(command: BoothBus.Command) {
        val p = player
        when (command) {
            is BoothBus.Command.Play -> {
                val idx = indexOfBasename(command.film)
                if (p == null || idx < 0) {
                    // A film the tablet knows about and this stick does not. Ignore it: the reel
                    // carries on, which is a far better booth outcome than a black screen.
                    Log.w(TAG, "Bus asked for '${command.film}' which is not in this reel — ignored")
                    return
                }
                clearOperatorPause()
                commandedFilm = command.film
                Log.i(TAG, "Bus: cutting to ${command.film}")
                p.seekTo(idx, 0L)
                p.playWhenReady = true
                p.prepare()
                lastPosition = -1L
                stalledTicks = 0
            }
            is BoothBus.Command.Pause -> {
                if (p == null || !p.isPlaying) return
                pausedByOperator = true
                pauseExpiresAt = android.os.SystemClock.uptimeMillis() + PAUSE_DEADMAN_MS
                p.playWhenReady = false
                Log.i(TAG, "Bus: paused (holding the frame, ${PAUSE_DEADMAN_MS / 60000} min dead-man)")
            }
            is BoothBus.Command.Resume -> resumeFromOperatorPause()
            is BoothBus.Command.Stop -> {
                // "Abandon what is playing and go back to the attract loop." Here the loop IS the
                // attract, so the honest equivalent is: stop treating this as a commanded film and
                // move on to the next one.
                clearOperatorPause()
                commandedFilm = null
                if (p != null && p.mediaItemCount > 1) {
                    p.seekToNextMediaItem()
                    p.playWhenReady = true
                }
                Log.i(TAG, "Bus: stop — back to the loop")
            }
            is BoothBus.Command.Playlist -> applyBusOrder(command.order)
            is BoothBus.Command.Mute -> {
                p?.volume = if (command.on) 0f else 1f
                Log.i(TAG, "Bus: ${if (command.on) "muted" else "unmuted"}")
            }
            is BoothBus.Command.Hud -> toggleHud()
        }
    }

    private fun indexOfBasename(name: String): Int {
        val p = player ?: return -1
        return (0 until p.mediaItemCount).firstOrNull {
            p.getMediaItemAt(it).localConfiguration?.uri?.lastPathSegment
                ?.let(::basename).equals(name, ignoreCase = true)
        } ?: -1
    }

    private fun clearOperatorPause() {
        pausedByOperator = false
        pauseExpiresAt = 0L
    }

    private fun resumeFromOperatorPause() {
        clearOperatorPause()
        player?.let {
            it.playWhenReady = true
            lastPosition = -1L
            stalledTicks = 0
        }
        Log.i(TAG, "Bus: resumed")
    }

    /**
     * Reorder the reel from a `playlist` message.
     *
     * `BUS-CONTRACT.md` §2.4: named ids first in the order given, everything else keeps its
     * relative order behind them, unknown ids ignored, **and it never starts playback**. That last
     * rule is why this rebuilds around whatever is on screen and keeps its position — a drag on
     * the tablet must not restart the film somebody is watching.
     */
    private fun applyBusOrder(order: List<String>) {
        if (order.isEmpty()) return
        val p = player ?: return
        val wanted = order.map { it.lowercase() }
        busOrder = wanted
        Log.i(TAG, "Bus: order ${wanted.joinToString()}")
        resumeFileName = currentlyPlayingName()
        startPositionMs = p.currentPosition.coerceAtLeast(0L)
        startIndex = p.currentMediaItemIndex
        startPlayback()
    }

    /**
     * An order handed down by the tablet, or null for the app's own running order.
     *
     * Kept in memory only. A power cut at the booth should bring back the reel Daniel shipped, not
     * whatever a visitor's last drag left behind.
     */
    private var busOrder: List<String>? = null

    private fun toggleHud() {
        val frame = root ?: return
        hudView?.let {
            frame.removeView(it)
            hudView = null
            return
        }
        val tv = TextView(this).apply {
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#B0000000"))
            typeface = Typeface.MONOSPACE
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setPadding(24, 12, 24, 12)
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { gravity = Gravity.BOTTOM or Gravity.START }
        }
        frame.addView(tv)
        hudView = tv
        hudTick.run()
    }

    private val hudTick = object : Runnable {
        override fun run() {
            val tv = hudView ?: return
            val p = player
            tv.text = "kiosk ${if (BoothBus.connected) busHost ?: "?" else "—"}   " +
                "film ${currentlyPlayingName() ?: "—"}   " +
                "pos ${(p?.currentPosition ?: 0L) / 1000}s   " +
                "${if (pausedByOperator) "PAUSED" else "playing"}"
            handler.postDelayed(this, 1_000L)
        }
    }

    /** The on-screen diagnostic line, toggled by the bus `hud` verb. Off by default. */
    private var hudView: TextView? = null

    /** How long a bus `pause` is honoured before the reel takes itself back. */
    private val PAUSE_DEADMAN_MS = 5 * 60 * 1000L

    // ---------------------------------------------------------------- lifecycle

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        savedInstanceState?.let {
            startIndex = it.getInt(STATE_ITEM_INDEX, 0)
            startPositionMs = it.getLong(STATE_POSITION_MS, 0L)
        }

        // Full bleed. A rented TV with overscan is still better served by an edge-to-edge
        // 16:9 frame than by a letterboxed one inside a system-bar inset.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        hideSystemBars()

        // Keeps the panel lit while the activity is visible.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Fire OS runs its own device sleep timer that ignores FLAG_KEEP_SCREEN_ON — the stick
        // will drop to its screensaver / sleep after ~20 min of "no input" even with the flag
        // set. A SCREEN_BRIGHT wake lock is what actually holds it. This was learned the hard
        // way on DanTV (TVBOX app/app/src/main/java/com/tvbox/app/MainActivity.kt:91).
        @Suppress("DEPRECATION")
        wakeLock = (getSystemService(Context.POWER_SERVICE) as PowerManager).newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "StreamStageBoothLoop::KeepAwake"
        )

        buildUi()
    }

    override fun onStart() {
        super.onStart()
        @Suppress("DEPRECATION")
        wakeLock?.takeIf { !it.isHeld }?.acquire()

        // The films live in shared storage on Fire OS 8, so reading them needs a permission.
        // Ask only if we actually need it — if app-private storage already has the films
        // (any device that is not a locked-down Fire Stick) we never prompt at all.
        if (!hasStoragePermission() && !Playlist.anyMediaVisible(this)) {
            requestStoragePermission()
        }

        // A previous run may have verified a film and been killed before a loop boundary came
        // round. Take it now, before the reel is built, so it is in this run's playlist.
        mayHaveStaged = true
        applyStagedFilms()

        startPlayback()
        handler.postDelayed(watchdog, WATCHDOG_INTERVAL_MS)

        // Start looking for the booth kiosk. This returns immediately, runs on its own daemon
        // threads, and nothing above waits for it or changes if it never finds anything.
        BoothBus.setMediaDir(mediaDir())
        BoothBus.start(this, busListener)
        handler.removeCallbacks(busTicker)
        handler.post(busTicker)
    }

    // ---------------------------------------------------------------- permission

    /** The right storage-read permission for this API level. */
    private fun storagePermission(): String =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
            android.Manifest.permission.READ_MEDIA_VIDEO
        else
            @Suppress("DEPRECATION") android.Manifest.permission.READ_EXTERNAL_STORAGE

    private fun hasStoragePermission(): Boolean {
        // Below API 23 permissions are granted at install time.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
        return checkSelfPermission(storagePermission()) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestStoragePermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
        Log.i(TAG, "Requesting ${storagePermission()}")
        runCatching { requestPermissions(arrayOf(storagePermission()), REQ_STORAGE) }
            .onFailure { Log.w(TAG, "Permission request failed", it) }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_STORAGE) {
            val granted = grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED
            Log.i(TAG, "Storage permission granted=$granted")
            // Either way, re-evaluate: granted means the films just became visible.
            startPlayback()
        }
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        // Backgrounded, or the TV was switched to another input and back: just play again.
        player?.playWhenReady = true
    }

    override fun onPause() {
        super.onPause()
        // Remember where we were so an HDMI re-plug that recreates the activity resumes
        // mid-film instead of snapping back to the top of the reel.
        player?.let {
            startIndex = it.currentMediaItemIndex
            startPositionMs = it.currentPosition.coerceAtLeast(0L)
        }
    }

    override fun onStop() {
        super.onStop()
        // Nobody is looking at the panel if the activity is not on screen, and it must never
        // be the thing that is showing when the booth TV comes back.
        if (panel != null) closeUpdatePanel()
        handler.removeCallbacks(watchdog)
        handler.removeCallbacks(busTicker)
        // Stop publishing the moment this stops being the screen, so the tablet's "is a screen
        // attached" check tells the truth rather than showing a heartbeat from a dead activity.
        BoothBus.stop()
        releasePlayer()
        @Suppress("DEPRECATION")
        wakeLock?.takeIf { it.isHeld }?.release()
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacksAndMessages(null)
        releasePlayer()
        @Suppress("DEPRECATION")
        wakeLock?.takeIf { it.isHeld }?.release()
        wakeLock = null
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putInt(STATE_ITEM_INDEX, startIndex)
        outState.putLong(STATE_POSITION_MS, startPositionMs)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    // ---------------------------------------------------------------- ui

    private fun buildUi() {
        val frame = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        val pv = PlayerView(this).apply {
            useController = false                       // no chrome, ever
            controllerAutoShow = false
            setShowBuffering(PlayerView.SHOW_BUFFERING_NEVER)
            // FIT letterboxes rather than crops. Every film is a true 1920x1080, so on a
            // 16:9 panel this is pixel-exact; on an odd panel it protects the framing
            // instead of cutting the lower-third titles off.
            resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
            setShutterBackgroundColor(Color.BLACK)
            // Hold the last rendered frame across item transitions and re-prepares so the
            // loop never flashes black between films.
            setKeepContentOnPlayerReset(true)
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        frame.addView(pv)

        // Only ever visible when there is no media to play. It tells whoever is standing at
        // the booth exactly which adb command fixes it, because at that moment they will not
        // have this README to hand.
        val msg = TextView(this).apply {
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.BLACK)
            gravity = Gravity.CENTER
            typeface = Typeface.MONOSPACE
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            setPadding(80, 80, 80, 80)
            visibility = View.GONE
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        frame.addView(msg)

        setContentView(frame)
        root = frame
        playerView = pv
        messageView = msg
    }

    private fun hideSystemBars() {
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    /**
     * Shown instead of a black screen when there is nothing to play. A black booth TV is the
     * exact failure this app exists to prevent, so this always says something legible and
     * actionable — and distinguishes "you forgot the permission" from "you forgot the films",
     * because those have completely different fixes.
     */
    private fun showNoMediaMessage() {
        val dirs = Playlist.candidateDirs(this)
        val missingPermission = !hasStoragePermission()

        messageView?.text = buildString {
            appendLine("STREAMSTAGE BOOTH LOOP")
            appendLine()
            if (missingPermission) {
                appendLine("Storage permission not granted.")
                appendLine("The films are on the device but cannot be read.")
                appendLine()
                appendLine("Grant it from the laptop, then relaunch:")
                appendLine()
                appendLine("  adb shell pm grant $packageName \\")
                appendLine("      android.permission.${storagePermission().substringAfterLast('.')}")
            } else {
                appendLine("No video files found.")
                appendLine()
                appendLine("Push the films to this device, then relaunch:")
                appendLine()
                appendLine("  adb shell mkdir -p /sdcard/Movies/${Playlist.SHARED_SUBDIR}")
                appendLine("  adb push *.mp4 /sdcard/Movies/${Playlist.SHARED_SUBDIR}/")
            }
            appendLine()
            appendLine("Looked in:")
            dirs.forEach { appendLine("  ${it.absolutePath}") }
        }
        messageView?.visibility = View.VISIBLE
        playerView?.visibility = View.GONE
    }

    private fun hideNoMediaMessage() {
        messageView?.visibility = View.GONE
        playerView?.visibility = View.VISIBLE
    }

    // ---------------------------------------------------------------- playback

    private fun startPlayback() {
        releasePlayer()

        val onDisk = Playlist.resolve(this)

        // Forgive anything that has served its time. A film is out of the reel for twenty
        // minutes, not for the rest of the show.
        val now = System.currentTimeMillis()
        failedFiles.entries.removeAll { (path, at) ->
            (now - at > BLACKLIST_TTL_MS).also {
                if (it) Log.i(TAG, "Giving $path another chance")
            }
        }
        var files = onDisk.filterNot { it.absolutePath in failedFiles.keys }

        // If the blacklist has eaten the entire reel, the blacklist is the problem, not the
        // films — a transient decoder failure must not permanently black out the booth.
        // Forgive everything and try again from scratch.
        if (files.isEmpty() && onDisk.isNotEmpty()) {
            Log.w(TAG, "All ${onDisk.size} file(s) blacklisted — clearing and retrying")
            failedFiles.clear()
            files = onDisk
        }

        if (files.isEmpty()) {
            Log.w(TAG, "Nothing to play")
            showNoMediaMessage()
            return
        }
        hideNoMediaMessage()

        // An order dragged on the operator's phone, if there is one. Named films first in the
        // order given; everything else keeps its relative order behind them; unknown ids ignored
        // (BUS-CONTRACT §2.4). It is applied here rather than mutating the player so that one
        // code path builds the reel, whatever the reason for building it.
        busOrder?.let { wanted ->
            val named = wanted.mapNotNull { id ->
                files.firstOrNull { basename(it.name).equals(id, ignoreCase = true) }
            }
            if (named.isNotEmpty()) files = named + files.filterNot { it in named }
        }

        // Fresh player, fresh stall accounting.
        lastPosition = -1L
        stalledTicks = 0

        // Decoder fallback: if a stick's preferred hardware decoder refuses a stream,
        // fall through to the next one (software) instead of throwing. Rented-TV insurance
        // for an unknown Fire OS build.
        val renderers = DefaultRenderersFactory(this)
            .setEnableDecoderFallback(true)
            .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_OFF)

        val exo = ExoPlayer.Builder(this, renderers).build().apply {
            // handleAudioFocus = false, deliberately. The booth reel has VO; it must not be
            // ducked or paused because Fire OS decided something else wanted the audio.
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                    .build(),
                /* handleAudioFocus = */ false
            )
            volume = 1f
            repeatMode = Player.REPEAT_MODE_ALL   // playlist loops forever
            playWhenReady = true
            addListener(playerListener)
        }

        exo.setMediaItems(files.map { MediaItem.fromUri(it.toURI().toString()) })

        // Normally we resume by index. After an update the list may have grown — or a film's
        // filename may have changed, because a new version is a new file — so an index is
        // meaningless and we resume by *logical* film name instead. The film that was on screen
        // stays on screen, whichever version of it is now current.
        val index = resumeFileName
            ?.let { name ->
                val want = FilmVersions.logicalName(name)
                files.indexOfFirst { FilmVersions.logicalName(it.name) == want }
                    .takeIf { i -> i >= 0 }
            }
            ?: startIndex.coerceIn(0, files.lastIndex)
        resumeFileName = null
        exo.seekTo(index.coerceIn(0, files.lastIndex), startPositionMs.coerceAtLeast(0L))
        exo.prepare()

        playerView?.player = exo
        player = exo
        playerReleased = false
        rememberNowPlaying()
        Log.i(TAG, "Playing ${files.size} file(s), starting at index $index")
    }

    /**
     * The player, but only while it is still usable.
     *
     * A film swap happens at a media-item boundary ([onMediaItemTransition] calls
     * [applyStagedFilms]), which is the one moment the reel tears down and rebuilds. A
     * `play` arriving inside that window reached a RELEASED ExoPlayer and threw:
     *
     *     IllegalStateException: sending message to a Handler on a dead thread
     *         at androidx.media3.exoplayer.ExoPlayerImpl.prepare
     *
     * Playback recovered, so it was a warning rather than a black screen — but it is the
     * booth's only playback path, and "usually recovers" is not a property worth shipping
     * to a trade show. ExoPlayer exposes no isReleased, so the flag is ours: set on
     * release, cleared on build, and every command path asks for the player through here
     * instead of touching the field.
     */
    private fun livePlayer(): ExoPlayer? = player?.takeIf { !playerReleased }

    private fun releasePlayer() {
        playerView?.player = null
        player?.removeListener(playerListener)
        // Marked BEFORE release(), so anything that runs while the instance is being torn
        // down already sees it as unusable rather than racing the field assignment.
        playerReleased = true
        player?.release()
        player = null
    }

    private val playerListener = object : Player.Listener {

        override fun onPlayerError(error: PlaybackException) {
            val p = livePlayer() ?: return
            val bad = p.currentMediaItem?.localConfiguration?.uri?.path
            Log.e(TAG, "Playback error on $bad (${error.errorCodeName})", error)

            // Never let one broken file end the show. Try the next item; if there is only
            // one item, re-prepare it from the top.
            if (p.mediaItemCount > 1) {
                bad?.let { failedFiles[it] = System.currentTimeMillis() }
                p.seekToNextMediaItem()
                p.prepare()
                p.playWhenReady = true
            } else {
                p.seekTo(0, 0L)
                p.prepare()
                p.playWhenReady = true
            }
        }

        /**
         * A film just ended and the next one started. This is the only moment at which a
         * downloaded film is allowed to replace a live one — nothing that is on screen is
         * ever swapped, so the swap has to happen at a boundary or not at all.
         */
        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            rememberNowPlaying()
            // A film's current version changed while the reel was running. Now — between films,
            // where it costs nothing visible — is when the player is rebuilt to see it.
            if (reelDirty) {
                rebuildReelForVersionChange()
                return
            }
            applyStagedFilms()
        }

        override fun onPlaybackStateChanged(state: Int) {
            if (state == Player.STATE_ENDED) {
                // Should be unreachable with REPEAT_MODE_ALL, but if the platform ever
                // reports ENDED anyway, restart the reel rather than sit on a black frame.
                Log.w(TAG, "STATE_ENDED reached with REPEAT_MODE_ALL — restarting reel")
                livePlayer()?.let { lp ->
                    lp.seekTo(0, 0L)
                    lp.prepare()
                    lp.playWhenReady = true
                }
            }
        }
    }

    // ---------------------------------------------------------------- watchdog

    /**
     * The booth runs unattended for eight hours. Nobody is watching the TV to notice that
     * it froze. This checks every 10 s that we are actually making progress, and rebuilds
     * the player if we are not.
     */
    private var lastPosition = -1L
    private var stalledTicks = 0

    private val watchdog = object : Runnable {
        override fun run() {
            val p = livePlayer()
            // A film the operator deliberately held is not a stall, and rescuing it would be the
            // opposite of what he asked for. The dead-man in [busTicker] is what stops a pause
            // becoming a frozen booth TV; this just keeps the watchdog out of the way until then.
            if (pausedByOperator) {
                handler.postDelayed(this, WATCHDOG_INTERVAL_MS)
                return
            }
            if (p == null) {
                // No player at all (e.g. media was pushed after launch, or the very first
                // films were just downloaded onto an empty stick) — take anything staged and
                // try again.
                applyStagedFilms()
                startPlayback()
            } else {
                val pos = p.currentPosition
                val progressing = p.isPlaying && pos != lastPosition
                if (progressing) {
                    stalledTicks = 0
                } else if (p.playbackState != Player.STATE_BUFFERING) {
                    stalledTicks++
                    Log.w(TAG, "Stalled tick $stalledTicks (state=${p.playbackState}, pos=$pos)")
                    // Two consecutive stalled ticks (~20 s) with no buffering excuse: nudge it.
                    if (stalledTicks == 2) {
                        p.prepare()
                        p.playWhenReady = true
                    } else if (stalledTicks == 3) {
                        // Still stuck. A nudge did not help, so the most likely explanation is
                        // this particular film — a decoder that will not accept it, or bytes that
                        // are not what they should be. Leave it behind and keep the reel moving;
                        // a booth TV must never sit on a frozen frame while somebody works out
                        // why. A frozen player reports no error, so onPlayerError never fires and
                        // nothing else would ever take this film out of rotation.
                        skipCurrentItem(p, "stalled")
                    } else if (stalledTicks >= 4) {
                        Log.e(TAG, "Watchdog rebuilding player")
                        stalledTicks = 0
                        startIndex = p.currentMediaItemIndex
                        startPositionMs = pos.coerceAtLeast(0L)
                        startPlayback()
                    }
                }
                lastPosition = pos
            }
            handler.postDelayed(this, WATCHDOG_INTERVAL_MS)
        }
    }

    /**
     * Take the current film out of the reel and move to the next one.
     *
     * Blacklisting is per-run and [startPlayback] forgives the whole list if it ever empties, so
     * the worst this can do is shorten the reel until the app restarts — which is the correct
     * trade against a booth TV showing one frozen frame for eight hours.
     */
    private fun skipCurrentItem(p: ExoPlayer, why: String) {
        val bad = p.currentMediaItem?.localConfiguration?.uri?.path
        if (p.mediaItemCount <= 1) {
            Log.e(TAG, "Only one film and it is $why — re-preparing it")
            p.seekTo(0, 0L)
            p.prepare()
            p.playWhenReady = true
            return
        }
        Log.e(TAG, "Dropping $bad from the reel ($why) and moving on")
        bad?.let { failedFiles[it] = System.currentTimeMillis() }
        stalledTicks = 0
        lastPosition = -1L
        p.seekToNextMediaItem()
        p.prepare()
        p.playWhenReady = true
    }

    /**
     * How long a freshly rebuilt reel gets to prove it is actually playing before the newly
     * current film is treated as the problem. Generous: a Fire Stick opening a 90 MB file off
     * its own flash is not instant.
     */
    private val PLAYBACK_PROBE_MS = 12_000L

    private var playbackProbe: Runnable? = null

    /**
     * After an update or a rollback, *confirm the picture actually moved.*
     *
     * The whole point of a booth reel is that nobody is watching it, so "the update succeeded and
     * the stick has been showing a still frame ever since" is a failure that could go unnoticed
     * all morning. The bytes were verified twice before this point, but bytes verifying is not the
     * same claim as a decoder accepting them on this particular hardware.
     *
     * If the position has not moved by [PLAYBACK_PROBE_MS], the film that just went live is
     * dropped from the reel and the loop carries on with the rest. That is deliberately the same
     * outcome as a decode error — the booth keeps playing, and the log says which film to look at.
     */
    private fun armPlaybackProbe() {
        playbackProbe?.let { handler.removeCallbacks(it) }
        val startedWith = player?.currentPosition ?: 0L
        val probe = Runnable {
            val p = player ?: return@Runnable
            val moved = p.currentPosition > startedWith + 500L
            if (moved && p.isPlaying) {
                Log.i(TAG, "Playback confirmed after the rebuild (pos=${p.currentPosition})")
                return@Runnable
            }
            Log.e(TAG, "Nothing played in the ${PLAYBACK_PROBE_MS}ms after the rebuild " +
                    "(pos=${p.currentPosition}, state=${p.playbackState}) — skipping that film")
            skipCurrentItem(p, "did not start after an update")
        }
        playbackProbe = probe
        handler.postDelayed(probe, PLAYBACK_PROBE_MS)
    }

    /**
     * Delete versions that are neither current nor the rollback.
     *
     * Timed, not immediate, and that is the entire safety argument. A superseded file may have
     * been open in the player that was just released — ExoPlayer pre-buffers the next item — so
     * this waits for the new player to settle first. It also never touches the immediately
     * previous version, which is the rollback, so in practice the first update to a film deletes
     * nothing at all and only a second one frees anything.
     */
    private fun scheduleSupersededSweep() {
        handler.postDelayed({
            val dir = mediaDir()
            val protectedNames = (player?.let { p ->
                (0 until p.mediaItemCount).mapNotNull {
                    p.getMediaItemAt(it).localConfiguration?.uri?.lastPathSegment
                }
            } ?: emptyList()).toSet()
            UpdateManager.run {
                val n = runCatching {
                    UpdateManager.sweepSuperseded(this@BoothLoopActivity, dir, protectedNames)
                }.getOrDefault(0)
                if (n > 0) Log.i(TAG, "Removed $n superseded film file(s)")
            }
        }, 30_000L)
    }

    // ---------------------------------------------------------------- updates

    /** The folder the films are actually being played from — and updated in. */
    private fun mediaDir() = Playlist.activeDir(this)

    private fun currentlyPlayingName(): String? =
        player?.currentMediaItem?.localConfiguration?.uri?.lastPathSegment

    /**
     * The film on screen, mirrored where a background thread can read it. ExoPlayer is confined
     * to the main thread, so the update worker — which is where the swap now happens — cannot
     * ask the player directly. Written on the main thread, read from the worker.
     */
    @Volatile private var nowPlaying: String? = null

    /** True while a swap is in flight, so overlapping triggers do not stack up. */
    @Volatile private var applyInFlight = false

    /** Main thread only. */
    private fun rememberNowPlaying() {
        nowPlaying = currentlyPlayingName()
    }

    /**
     * Move verified downloads from `.staging` into the live folder.
     *
     * Called at a media-item transition, when a download finishes, when the panel closes, and
     * from the watchdog when there is no player at all. It never touches the film that is on
     * screen — that one waits for its own boundary.
     *
     * **This used to run on the main thread**, on the grounds that a rename plus a small JSON
     * write is sub-millisecond. It is not what the swap does any more: it reads the destination
     * back and hashes it, because a rename reporting success turned out not to mean the film
     * arrived (see [UpdateManager.PREV_SUFFIX]). That is seconds of work per film, so it goes
     * to the update worker and the answer comes back to the main thread. The booth's decoder
     * never waits for it.
     *
     * Films are compared by *logical* name here. A staged file is `costumecraft__<hash>.mp4` and
     * the film on screen is whatever version of `costumecraft.mp4` is current, so a literal name
     * comparison would never match and the rule "never swap what a visitor is watching" would
     * quietly stop being enforced. Nothing on disk would be at risk — the new version has its own
     * filename — but the reel would rebuild mid-film and the picture would jump.
     *
     * ## [isOnScreen] is no longer load-bearing for correctness, and that is the point
     *
     * It used to be the only thing standing between an update and a corrupted film, and it was
     * not sufficient: it names exactly one film, while ExoPlayer holds the *next* item in the reel
     * open too (it pre-buffers it), and this very method is called from `onMediaItemTransition` —
     * the moment the player starts opening the one after that. Item N+1 was never protected. On
     * the first pass of the day it is worse still: `onStart` calls this before there is a player
     * at all, so `nowPlaying` is null and nothing was protected.
     *
     * **Versioned filenames remove the exposure rather than widening the guard.** A swap writes to
     * `costumecraft__<hash>.mp4`, a path that has never existed on this device, and it unlinks
     * nothing: the file the player has open — whichever item it is, N, N+1 or N+2 — is not the
     * destination of anything and is not deleted. Superseded versions are removed much later, by
     * [scheduleSupersededSweep], which runs 30 s after a rebuild, skips anything in the player's
     * item list, and never touches a version that is current or is somebody's rollback.
     *
     * So this check now buys exactly one thing: the picture does not jump. If it were removed
     * entirely nothing would corrupt — a visitor would just see a film restart.
     */
    private fun applyStagedFilms() {
        if (!mayHaveStaged || applyInFlight) return
        val dir = mediaDir()
        if (!UpdateManager.hasStaged(dir)) {
            mayHaveStaged = false
            return
        }
        rememberNowPlaying()
        applyInFlight = true
        UpdateManager.run {
            val applied = runCatching {
                UpdateManager.applyStaged(this@BoothLoopActivity, dir) { staged ->
                    val playing = nowPlaying ?: return@applyStaged false
                    FilmVersions.logicalName(staged) == FilmVersions.logicalName(playing)
                }
            }.getOrElse {
                Log.w(TAG, "Applying staged films failed — booth unchanged", it)
                UpdateManager.Applied(emptyList(), emptyList())
            }
            handler.post {
                applyInFlight = false
                mayHaveStaged = UpdateManager.hasStaged(dir)
                if (applied.failed.isNotEmpty()) {
                    Log.e(TAG, "Did not verify at their final path, nothing changed: " +
                            applied.failed.joinToString())
                }
                panel?.onFilmsApplied(applied.names, applied.failed)
                if (applied.names.isEmpty()) return@post
                Log.i(TAG, "Applied ${applied.names.joinToString()}")
                // Every applied film is a new *file*, so the player's list of paths is stale.
                onCurrentVersionsChanged()
            }
        }
    }

    /**
     * Something changed which version of a film is current — an update landed, or Daniel rolled
     * one back. Main thread.
     *
     * Nothing about this is urgent: the pointer is already written and already correct, and the
     * film that is on screen is playing from a file that was not touched. All that is left is for
     * the player to be handed the new list of paths, and the cheapest moment for that is the next
     * film boundary. With no player at all there is nothing to interrupt, so it happens now.
     */
    private fun onCurrentVersionsChanged() {
        reelDirty = true
        if (player == null) rebuildReelForVersionChange()
    }

    /**
     * Rebuild the reel around the versions that are current now, keeping the same film on screen.
     *
     * Called at a media-item transition, so "the same film" means the one that just started and
     * the position is a fraction of a second in. `setKeepContentOnPlayerReset(true)` holds the
     * last frame across the rebuild, so what this costs visually is a beat, not a black flash.
     */
    private fun rebuildReelForVersionChange() {
        reelDirty = false
        player?.let { p ->
            resumeFileName = currentlyPlayingName()
            startIndex = p.currentMediaItemIndex
            startPositionMs = p.currentPosition.coerceAtLeast(0L)
        }
        Log.i(TAG, "Rebuilding reel for a version change")
        startPlayback()
        armPlaybackProbe()
        scheduleSupersededSweep()
    }

    private val panelHost = object : UpdatePanelView.Host {
        override fun currentlyPlayingName(): String? = this@BoothLoopActivity.currentlyPlayingName()

        override fun onStagedFilmReady(name: String) {
            mayHaveStaged = true
            // Starts the swap; it finishes on the worker and reports back through
            // onFilmsApplied. There is no honest synchronous answer to "is it live yet"
            // any more, because going live now includes reading the film back and hashing it.
            applyStagedFilms()
        }

        override fun onVersionsChanged() = onCurrentVersionsChanged()

        override fun onPanelClosed() = closeUpdatePanel()
    }

    private fun openUpdatePanel() {
        if (panel != null) return
        val frame = root ?: return
        Log.i(TAG, "Opening update panel")
        val p = UpdatePanelView(this, mediaDir(), panelHost)
        frame.addView(p)
        panel = p
        p.open()
    }

    private fun closeUpdatePanel() {
        panel?.let {
            it.onClosing()
            root?.removeView(it)
        }
        panel = null
        hideSystemBars()
        // Anything that finished while the panel was open and is not on screen goes live now.
        applyStagedFilms()
        Log.i(TAG, "Update panel closed")
    }

    // ---------------------------------------------------------------- input

    /**
     * Swallow the Fire TV remote.
     *
     * The Fire Stick remote is D-pad, Select, Back, Home (plus voice). A visitor must not be
     * able to pause, seek, open a menu, or drop the TV to the Fire OS launcher. Every key is
     * consumed here except:
     *
     *  - volume / mute, passed through so booth staff can set the level (on most sticks the TV
     *    handles these over CEC/IR and they never reach this app anyway);
     *  - the EXIT_CODE sequence, which is matched key by key.
     *
     * Notably BACK and SELECT on their own do nothing whatsoever — the two keys a confused
     * visitor is most likely to press.
     *
     * HOME cannot be intercepted by a normal app on any Android build. On a Fire Stick it drops
     * to the Fire OS launcher (not a black screen); relaunch from the home row. See README.
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        when (event.keyCode) {
            KeyEvent.KEYCODE_VOLUME_UP,
            KeyEvent.KEYCODE_VOLUME_DOWN,
            KeyEvent.KEYCODE_VOLUME_MUTE -> return super.dispatchKeyEvent(event)
        }

        // While the update panel is up it owns the remote entirely, including BACK (which
        // closes it). Nothing leaks past it to the exit code or to the player.
        panel?.let { return it.handleKey(event) }

        // Long-press bookkeeping for SELECT. The panel opens on the key *release*, never on a
        // repeat, so that the press which opens it cannot also fall through and press whatever
        // the panel put under the cursor.
        if (isSelectKey(event.keyCode)) {
            if (event.action == KeyEvent.ACTION_DOWN) {
                if (event.repeatCount == 0) selectHeldLong = false
                if (event.repeatCount >= 1 ||
                    (event.flags and KeyEvent.FLAG_LONG_PRESS) != 0
                ) selectHeldLong = true
            }
        }

        if (event.action == KeyEvent.ACTION_UP) {
            when (event.keyCode) {
                // The labelled way in. On a Fire TV remote this is the hamburger / "options"
                // key. Nothing else in this app responds to MENU, so it cannot be pressed by
                // accident into anything worse than a panel that shows a list and closes again.
                KeyEvent.KEYCODE_MENU -> {
                    openUpdatePanel()
                    return true
                }
                // The findable way in. Fire TV remotes are not all the same shape and the menu
                // key is not always obvious (or present), so holding SELECT for
                // [LONG_PRESS_MS] opens the same panel. A normal press of SELECT still does
                // absolutely nothing, which is what protects the booth from a curious visitor.
                KeyEvent.KEYCODE_DPAD_CENTER,
                KeyEvent.KEYCODE_ENTER,
                KeyEvent.KEYCODE_NUMPAD_ENTER,
                KeyEvent.KEYCODE_BUTTON_A -> {
                    val held = event.eventTime - event.downTime
                    if (selectHeldLong || held >= LONG_PRESS_MS) {
                        selectHeldLong = false
                        openUpdatePanel()
                        return true
                    }
                }
            }
            trackExitCode(event.keyCode)
        }
        // Everything else — D-pad, Select, play/pause, FF/REW, numbers — dies here.
        return true
    }

    private fun isSelectKey(keyCode: Int) = when (keyCode) {
        KeyEvent.KEYCODE_DPAD_CENTER,
        KeyEvent.KEYCODE_ENTER,
        KeyEvent.KEYCODE_NUMPAD_ENTER,
        KeyEvent.KEYCODE_BUTTON_A -> true
        else -> false
    }

    private fun trackExitCode(keyCode: Int) {
        val now = System.currentTimeMillis()
        if (exitCodeProgress > 0 && now - exitCodeStartedAt > EXIT_WINDOW_MS) {
            exitCodeProgress = 0   // took too long, start over
        }

        if (keyCode == EXIT_CODE[exitCodeProgress]) {
            if (exitCodeProgress == 0) exitCodeStartedAt = now
            exitCodeProgress++
            Log.i(TAG, "Exit code $exitCodeProgress/${EXIT_CODE.size}")
            if (exitCodeProgress == EXIT_CODE.size) {
                Log.i(TAG, "Deliberate exit code entered — finishing")
                finish()
            }
        } else {
            // A wrong key resets — but if it is itself a valid opening key, count it as the
            // start of a fresh attempt rather than forcing an extra press.
            exitCodeProgress = if (keyCode == EXIT_CODE[0]) {
                exitCodeStartedAt = now
                1
            } else 0
        }
    }

    /** Nothing dismisses the loop by accident, including the framework's own back handling. */
    @Deprecated("Handled via dispatchKeyEvent", ReplaceWith(""))
    override fun onBackPressed() {
        // no-op
    }
}
