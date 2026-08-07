package com.streamstage.boothloop

import android.content.Context
import android.graphics.Color
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

/**
 * The booth attract loop. One activity, one player, no UI.
 *
 * Design rule for every line in this file: **it has to work when everything else is dead.**
 * No laptop, no Wi-Fi, no router, no phone, nobody at the booth. Plug the stick into a rented
 * TV, and the loop plays. Anything that could stop that is either removed or defended against.
 *
 * Consequences of that rule, all deliberate:
 *  - No INTERNET permission (see AndroidManifest). Runs identically in airplane mode.
 *  - Audio focus is NOT honoured. A notification chime must not duck or pause the booth reel.
 *  - A file that fails to decode is skipped, not fatal.
 *  - A watchdog restarts playback if it ever stalls with nobody around to notice.
 *  - Remote keys are swallowed so a passer-by cannot pause, seek or exit by accident.
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

        const val STATE_ITEM_INDEX = "item_index"
        const val STATE_POSITION_MS = "position_ms"
    }

    private var player: ExoPlayer? = null
    private var playerView: PlayerView? = null
    private var root: FrameLayout? = null
    private var messageView: TextView? = null

    @Suppress("DEPRECATION")
    private var wakeLock: PowerManager.WakeLock? = null

    private val handler = Handler(Looper.getMainLooper())

    private var startIndex = 0
    private var startPositionMs = 0L

    /** How much of EXIT_CODE has been matched so far, and when the run started. */
    private var exitCodeProgress = 0
    private var exitCodeStartedAt = 0L

    /** Files whose decode failed this run. Skipped so one bad push cannot stall the booth. */
    private val failedFiles = mutableSetOf<String>()

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
        startPlayback()
        handler.postDelayed(watchdog, WATCHDOG_INTERVAL_MS)
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
        handler.removeCallbacks(watchdog)
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

    private fun showNoMediaMessage() {
        val dirs = Playlist.candidateDirs(this)
        val target = dirs.firstOrNull()?.absolutePath ?: "(external storage unavailable)"
        messageView?.text = buildString {
            appendLine("STREAMSTAGE BOOTH LOOP")
            appendLine()
            appendLine("No video files found.")
            appendLine()
            appendLine("Push the films to this device, then relaunch:")
            appendLine()
            appendLine("  adb shell mkdir -p $target")
            appendLine("  adb push *.mp4 $target/")
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
        var files = onDisk.filterNot { it.absolutePath in failedFiles }

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

        val index = startIndex.coerceIn(0, files.lastIndex)
        exo.seekTo(index, startPositionMs.coerceAtLeast(0L))
        exo.prepare()

        playerView?.player = exo
        player = exo
        Log.i(TAG, "Playing ${files.size} file(s), starting at index $index")
    }

    private fun releasePlayer() {
        playerView?.player = null
        player?.removeListener(playerListener)
        player?.release()
        player = null
    }

    private val playerListener = object : Player.Listener {

        override fun onPlayerError(error: PlaybackException) {
            val p = player ?: return
            val bad = p.currentMediaItem?.localConfiguration?.uri?.path
            Log.e(TAG, "Playback error on $bad (${error.errorCodeName})", error)

            // Never let one broken file end the show. Try the next item; if there is only
            // one item, re-prepare it from the top.
            if (p.mediaItemCount > 1) {
                bad?.let { failedFiles += it }
                p.seekToNextMediaItem()
                p.prepare()
                p.playWhenReady = true
            } else {
                p.seekTo(0, 0L)
                p.prepare()
                p.playWhenReady = true
            }
        }

        override fun onPlaybackStateChanged(state: Int) {
            if (state == Player.STATE_ENDED) {
                // Should be unreachable with REPEAT_MODE_ALL, but if the platform ever
                // reports ENDED anyway, restart the reel rather than sit on a black frame.
                Log.w(TAG, "STATE_ENDED reached with REPEAT_MODE_ALL — restarting reel")
                player?.seekTo(0, 0L)
                player?.prepare()
                player?.playWhenReady = true
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
            val p = player
            if (p == null) {
                // No player at all (e.g. media was pushed after launch) — try again.
                startPlayback()
            } else {
                val pos = p.currentPosition
                val progressing = p.isPlaying && pos != lastPosition
                if (progressing) {
                    stalledTicks = 0
                } else if (p.playbackState != Player.STATE_BUFFERING) {
                    stalledTicks++
                    Log.w(TAG, "Stalled tick $stalledTicks (state=${p.playbackState}, pos=$pos)")
                    // Two consecutive stalled ticks (~20 s) with no buffering excuse:
                    // nudge it, then rebuild.
                    if (stalledTicks == 2) {
                        p.prepare()
                        p.playWhenReady = true
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
        if (event.action == KeyEvent.ACTION_UP) trackExitCode(event.keyCode)
        // Everything else — D-pad, Select, play/pause, FF/REW, MENU, numbers — dies here.
        return true
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
