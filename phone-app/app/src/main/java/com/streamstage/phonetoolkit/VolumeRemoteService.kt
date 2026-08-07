package com.streamstage.phonetoolkit

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.VolumeProviderCompat

/**
 * SCREEN-OFF / LOCKED VOLUME-KEY CAPTURE — ABSORBED FROM
 * ~/projects/PhonePresenter/app/src/main/java/com/streamstage/phonepresenter/VolumeRemoteService.kt.
 * This is that file, not a re-implementation of it.
 *
 * Its reasoning, carried over because it IS the class:
 *
 *   Activity.onKeyDown only fires while the activity is in front with the screen on. The way to
 *   keep receiving the volume rocker with the screen off is to hold an ACTIVE MediaSession whose
 *   playback is routed to a REMOTE VolumeProvider — the system then hands volume adjustments to
 *   that provider instead of changing stream volume, and it keeps doing so while locked.
 *
 *   Requirements for it to actually fire (all handled here, all from the original):
 *     - the session is active AND has a playback state of PLAYING, or the session goes stale
 *     - the service is a foreground service of type mediaPlayback (see AndroidManifest)
 *     - the VolumeProvider is VOLUME_CONTROL_ABSOLUTE with room to move in both directions, hence
 *       currentVolume parked in the middle and reset after every press
 *
 * ⚠ PhonePresenter's own note is still true and is not being glossed over: **not yet verified on
 * device.** OEMs differ here. The path that is known to work is the in-activity one in
 * [MainActivity.onKeyDown] — also lifted from that app (MainActivity.kt:65-80) — and it covers the
 * stage case, which is phone-in-hand with the screen on. This covers the pocket case.
 *
 * WHAT CHANGED FROM THE ORIGINAL, and only this:
 *   - it is started ONLY in PRESENTER mode and stopped the instant the app switches to KIOSK
 *     ([MainActivity.armVolumeService]), so the rocker cannot page the deck while Daniel is
 *     driving the booth TV. [Remote.base] being empty is a second, independent guard.
 *   - [arm] swallows a background-start refusal instead of crashing: a foreground-service
 *     restriction must never take down the app Daniel is holding on a stage, and the in-activity
 *     key path still works without this service.
 */
class VolumeRemoteService : Service() {

    private var session: MediaSessionCompat? = null

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTE_ID, buildNotification())

        session = MediaSessionCompat(this, "StreamStageToolkit").apply {
            setPlaybackState(
                PlaybackStateCompat.Builder()
                    .setState(PlaybackStateCompat.STATE_PLAYING, 0, 1f)
                    .setActions(PlaybackStateCompat.ACTION_PLAY_PAUSE)
                    .build()
            )
            setPlaybackToRemote(volumeProvider())
            isActive = true
        }
        Diag.i("volume remote service started — rocker pages the deck with the screen off")
    }

    private fun volumeProvider() = object : VolumeProviderCompat(
        VOLUME_CONTROL_ABSOLUTE, MAX_VOL, MID_VOL
    ) {
        override fun onAdjustVolume(direction: Int) {
            when {
                direction > 0 -> Remote.send("next")
                direction < 0 -> Remote.send("prev")
            }
            currentVolume = MID_VOL          // re-centre so both directions stay available
        }

        override fun onSetVolumeTo(volume: Int) {
            when {
                volume > MID_VOL -> Remote.send("next")
                volume < MID_VOL -> Remote.send("prev")
            }
            currentVolume = MID_VOL
        }
    }

    private fun buildNotification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL, "Presenter remote", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
        }
        return NotificationCompat.Builder(this, CHANNEL)
            .setContentTitle("PRESENTER MODE armed")
            .setContentText("Volume up = next slide · Volume down = back")
            .setSmallIcon(android.R.drawable.ic_menu_slideshow)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int) = START_STICKY
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        session?.let { it.isActive = false; it.release() }
        session = null
        Diag.i("volume remote service stopped")
        super.onDestroy()
    }

    companion object {
        private const val CHANNEL = "presenter"
        private const val NOTE_ID = 42
        private const val MAX_VOL = 20
        private const val MID_VOL = 10

        /** PhonePresenter MainActivity.kt:59-62, lifted. */
        fun arm(ctx: Context) {
            val i = Intent(ctx, VolumeRemoteService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i)
                else ctx.startService(i)
            } catch (t: Throwable) {
                Diag.w("could not start the volume remote service (the in-activity rocker still " +
                    "works): ${t.javaClass.simpleName}: ${t.message}")
            }
        }

        fun disarm(ctx: Context) {
            try { ctx.stopService(Intent(ctx, VolumeRemoteService::class.java)) } catch (_: Throwable) {}
        }
    }
}
