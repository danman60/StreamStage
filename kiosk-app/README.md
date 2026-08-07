# StreamStage Booth Loop — Amazon Fire TV Stick attract loop

**Checklist item E1.** A Fire Stick app that plays the booth reel **alone**: no controller, no
laptop, no Wi-Fi, no browser.

**Target device: the Amazon Fire TV Stick** — the HDMI dongle you carry to the booth and plug
into a rented or unknown TV. Not a Fire TV Edition television, not Android TV in general.

> *"I don't trust opening browsers on rented or new TVs."* — Daniel

This is failure-mode insurance. If the laptop dies, the venue Wi-Fi dies, or the whole kiosk
stack dies, you plug this stick into the booth TV and the loop still plays with audio. Everything
else in the trade-show toolkit is an upgrade on top of this floor.

---

## The one guarantee

**The app has no `INTERNET` permission.** Not "doesn't use the network" — *cannot*. The kernel
refuses socket creation for the UID. Verify it yourself on any build:

```bash
$ANDROID_HOME/build-tools/35.0.0/aapt dump permissions app/build/outputs/apk/debug/app-debug.apk
```

```
package: com.streamstage.boothloop
uses-permission: name='android.permission.WAKE_LOCK'
uses-permission: name='android.permission.RECEIVE_BOOT_COMPLETED'
```

That is the whole list. `media3-common` tries to add `ACCESS_NETWORK_STATE` via manifest merge;
it is explicitly stripped with `tools:node="remove"` so the audit stays clean. There is no
Supabase, no OkHttp, no HTTP data source, no analytics in the dependency graph.

**Do not add `INTERNET` to `AndroidManifest.xml`.** It is the single line holding the guarantee up.

---

## Which Fire Stick this assumes

**Daniel has never specified the generation, and this was not verified against hardware.** What
the app assumes, and where a different stick could differ:

| Assumed | Why | If yours differs |
|---|---|---|
| Any Fire Stick, 2nd gen or newer | `minSdk 22` covers Fire OS 5 (Android 5.1) and everything after: Fire OS 6 (API 25), 7 (API 28), 8 (API 30) | A 1st-gen stick (Fire OS 3, API 17) will **refuse to install**. |
| H.264 + AAC video | Exactly what the seven films are (verified 1920×1080 h264 / AAC 48 kHz stereo). Every Fire Stick ever made decodes this in hardware. | Nothing to change — this is the safest possible codec choice. |
| ≥ 400 MB free storage | 5.2 MB app + ~350 MB films | See storage note below. |
| 1080p output | Films are true 1920×1080 | A 4K stick upscales; a 720p stick (2nd gen) downscales. Both fine. |

Nothing in the app uses a modern-only API. The one deprecated call (`SCREEN_BRIGHT_WAKE_LOCK`)
is deliberate — it is what actually holds an old Fire OS awake.

**Storage.** A Fire Stick ships with 8 GB, of which roughly **5 GB is usable** after Fire OS. The
reel needs **~350 MB of films plus a 5.2 MB app ≈ 360 MB**, which fits comfortably. Check before
you push:

```bash
adb shell df -h /data
```

The films are **never bundled inside the APK** — a 350 MB APK would hit install limits and make
every reinstall a five-minute wait. They are pushed separately and discovered at runtime, so
reinstalling the app takes seconds and leaves the films in place.

---

## Build

Toolchain is already installed on SPYBALLOON (Gradle 8.11.1, AGP 8.7.3, Kotlin 2.1.0, JDK 21,
SDK at `~/Android/Sdk`) — the same set TVBOX builds with.

```bash
cd ~/projects/StreamStage/kiosk-app
./gradlew assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk` — **5.2 MB**.

`./gradlew assembleRelease` also builds (`app-release-unsigned.apk`, 4.0 MB) but is unsigned and
untested. **Use the debug APK for Calgary** — a debug APK sideloads onto a Fire Stick perfectly
well, and it is the build that was actually exercised.

---

## Side-load onto the Fire Stick

**All of this is adb over the network.** A Fire Stick's micro-USB/USB-C port is power only —
there is no usable USB data connection. The laptop and the stick must be on the same LAN (a
phone hotspot is fine). *This is the only step that needs a network, and it happens at home
before the show — the app itself never touches one.*

### 1. Put the stick in developer mode

On the Fire TV: **Settings → My Fire TV → Developer Options** → turn on **ADB Debugging** and
**Apps from Unknown Sources**.

On Fire OS 7+ the Developer Options menu is hidden until you reveal it: **Settings → My Fire TV
→ About → Fire TV Stick**, then click it seven times.

### 2. Find the stick's IP

**Settings → My Fire TV → About → Network** — note the IP address.

### 3. Connect

```bash
adb connect 192.168.1.42:5555        # the stick's IP, port 5555
adb devices                          # confirm it shows up
```

The TV shows an "Allow ADB debugging?" prompt the first time — accept it with the remote, and
tick *Always allow* so you are not re-prompted at the booth.

### 4. Install the app

```bash
adb -s 192.168.1.42:5555 install -r app/build/outputs/apk/debug/app-debug.apk
```

### 5. Push the films

The films are **not in this repo and never will be** (~350 MB). They live in
`StreamStage/expo-assets/kiosk/media/`, which is itself gitignored. This repo's `.gitignore`
blocks `*.mp4` and `media/` too.

```bash
./tools/push-media.sh 192.168.1.42:5555
```

That pushes to `/sdcard/Android/data/com.streamstage.boothloop/files/media/` — app-scoped
external storage, which `adb push` can write on every Android version **with no storage
permission and no scoped-storage dance**. That is why this path was chosen over `/sdcard/Movies`.

Manual equivalent:

```bash
DEST=/sdcard/Android/data/com.streamstage.boothloop/files/media
adb shell mkdir -p $DEST
adb push ~/projects/StreamStage/expo-assets/kiosk/media/*.mp4 $DEST/
```

Pushing ~350 MB over Wi-Fi to a stick takes a few minutes. Do it at home, not at the booth.

### 6. Launch

```bash
adb shell monkey -p com.streamstage.boothloop -c android.intent.category.LAUNCHER 1
```

Or just pick **StreamStage Booth** from the Fire TV home row with the remote — it registers as a
`LEANBACK_LAUNCHER` app with a proper TV banner, so it appears in *Your Apps & Channels* rather
than being buried in Settings. (Verified in the built APK: `aapt dump badging` reports
`leanback-launchable-activity`.)

If you forget step 4, the app does not show a black screen — it prints the exact `adb push`
command you need, on the TV, in white monospace on black.

---

## Running order

Default booth order, hard-coded in `Playlist.kt`:

1. `streamstage-services.mp4` (the "who we are" film, 3:01)
2. `studiosage.mp4` · 3. `compsync.mp4` · 4. `callboard.mp4`
5. `costumecraft.mp4` · 6. `reflect.mp4` · 7. `studiobeat.mp4`

Total reel ≈ 12 minutes, then it wraps and plays forever.

To override, drop a `playlist.txt` next to the films — one filename per line, `#` for comments:

```
# Short reel for the Tuesday talk
streamstage-services.mp4
compsync.mp4
```

Any film on disk but missing from `playlist.txt` is appended rather than dropped, so a stale
playlist can never silently hide a film someone just pushed.

---

## Behaviour at the booth

| Concern | What it does |
|---|---|
| Looping | ExoPlayer `REPEAT_MODE_ALL` across the whole playlist. Wraps last → first, forever. |
| Audio | Plays at full volume. Audio focus is **deliberately not honoured** so nothing can duck or pause the VO. |
| Screen sleep | `FLAG_KEEP_SCREEN_ON` **plus** a `SCREEN_BRIGHT_WAKE_LOCK` — Fire OS runs its own sleep timer that ignores the flag alone. (Learned on DanTV: `TVBOX/app/app/.../MainActivity.kt:91`.) |
| Stray remote input | Every key on the Fire TV remote is swallowed — D-pad, Select, Back, play/pause, FF/REW, Menu. **Back and Select on their own do nothing at all.** A passer-by cannot pause, seek, or drop the TV to the launcher. |
| Volume keys | Deliberately **passed through** so staff can set booth level. On most sticks the TV handles these over CEC/IR anyway. |
| Deliberate exit | **DOWN, DOWN, UP, UP, BACK** on the D-pad within 5 seconds. |
| HOME | No app can intercept the HOME key. **Set this app as the stick's launcher** and the point becomes moot: HOME returns here instead of leaving. It registers `category.HOME` (the DanTV shape, which is proven on a real stick), so Fire OS offers it as a home app — choose it and tick Always. If you do not, HOME drops to the Fire OS launcher, which is a menu and *not* a black screen; relaunch from the home row. Reversible in Settings > Applications. |
| Backgrounding | Releases the player on stop, resumes on return — and restores the film and position it was on. |
| A corrupt film | Skipped, blacklisted for the session, show continues. One bad push cannot stall the booth. |
| A stall | A 10-second watchdog nudges, then rebuilds the player if playback stops progressing. |
| Empty media dir | Shows the `adb push` instructions on screen; the watchdog starts playing the moment films appear, with no relaunch. |

---

## What was actually verified

All on an **Android TV emulator** (AOSP TV, 1920×1080, API 34), using the **real seven films**
(md5-checked after push), not stand-ins:

| Check | Result |
|---|---|
| APK builds | `BUILD SUCCESSFUL`, 5.2 MB |
| No network permission | `aapt dump permissions` → only `WAKE_LOCK` + `RECEIVE_BOOT_COMPLETED` |
| **Plays in airplane mode** | Airplane mode on, Wi-Fi disabled → all 7 films play |
| Audio | `AudioTrack state:started`, `USAGE_MEDIA`, 48 kHz stereo, `mutedState:none` |
| Fullscreen, no chrome | Edge-to-edge 1920×1080, no system bars, no controls |
| Correct running order | services → studiosage → compsync → callboard → costumecraft → reflect → studiobeat |
| **Loop wraps** | 3 full cycles observed, last → first |
| **No black frames at transitions** | 118 frames sampled ~212 ms apart across 5 transitions incl. a wrap → **0 black frames** |
| Sustained run | 7 min continuous, 0 watchdog stalls, 0 errors |
| Stray keys | 16 keypresses incl. play/pause, stop, next → loop unbroken |
| Back/Select mashing | BACK ×8 + SELECT ×5 → completely inert |
| Exit code | `DOWN DOWN UP UP BACK` exits; near-miss `DOWN UP DOWN UP BACK` does not |
| Backgrounding | HOME then relaunch → resumes on the same film and position |
| Corrupt film | Garbage `.mp4` skipped, next film played |
| Media pushed while running | Watchdog picked it up in 10 s, no relaunch |
| Leanback launcher | `leanback-launchable-activity` with TV banner present in APK |

---

## Known gaps — read this before trusting it on the floor

### Not verified on a Fire Stick

**No Fire TV hardware was connected to this machine, so nothing here is Fire Stick verified.**
Everything above was verified on an **Android TV emulator** (AOSP TV, 1920×1080, API 34). Fire OS is a
fork of Android and is close, but it is not the same — its launcher, sleep timer, HDMI handling
and background-start policy all differ. **Run the acceptance test on the actual stick before
Calgary.**

### Autostart on boot is UNPROVEN

`BootReceiver` listens for `BOOT_COMPLETED` and tries to launch. On **Android 10+ (Fire OS 8)
the framework restricts background activity starts, so this is expected to be silently
dropped.** Fire OS 7 and older should work. This was not tested on either.

Do not rely on unattended auto-resume after a power cut. The dependable version is a human
pressing the remote, or leaving the stick powered continuously.

### HOME cannot be blocked

No ordinary Android app can intercept HOME. Pressing it drops to the Fire TV launcher — which is
at least a recognisable Amazon home screen, not a black screen or a broken-looking booth. Blocking
it needs lock-task mode with device-owner provisioning (a factory-reset-and-provision flow), which
is out of scope here. In practice: keep the remote behind the booth table, and if someone does
press it, the app is one click away on the home row.

### Untested entirely

- **HDMI re-plug.** Cannot be simulated on an emulator. The activity handles the relevant config
  changes itself and restores position on recreate, but this is reasoned, not measured.
- **Real power cycle** on Fire TV hardware.
- **Long-run soak.** Longest continuous verified run is ~7 minutes, not an 8-hour show day. In
  particular the 20-minute Fire OS sleep timer — the thing the wake lock exists to defeat — has
  never actually been outrun. Test 2 in the acceptance list is the one that matters most.
- **Sideloading over adb to a real stick.** The `adb connect` flow above is the documented Fire OS
  procedure, but it was exercised against an emulator, not a stick on a LAN.
- **Release build has never been *run*.** `assembleRelease` compiles and passes `lintVital`
  (`app-release-unsigned.apk`, 4.0 MB), but it is unsigned, uninstalled and untested.
  `isMinifyEnabled` is deliberately `false` in release too, so it should behave identically to
  debug — but "should" is doing the work in that sentence. **Sideload the debug APK for Calgary**;
  it is the one that was actually exercised.
- **Audio through a real TV** over HDMI. Verified only as an `AudioTrack` in the correct state.

---

## Acceptance test to run on the real stick

1. Stick in the TV, **airplane mode on / Wi-Fi forgotten entirely.** Launch from the home row.
   The loop plays with audio within seconds. ← the whole point
2. Leave it 30+ minutes untouched. It must not sleep, screensave, or stall.
3. Mash the remote — every button, especially Back and Select. The loop must not break and must
   not exit.
4. Enter **DOWN DOWN UP UP BACK**. It should exit. Relaunch from the home row.
5. Pull the HDMI cable, wait 10 s, plug it back in. It should come back playing.
6. Pull mains power, restore it. Note whether it self-starts (expected: no on Fire OS 8) and how
   long a manual relaunch takes.
7. Confirm the audio actually reaches the TV speakers over HDMI at a sensible level.

---

## Layout

```
kiosk-app/
├── app/src/main/
│   ├── AndroidManifest.xml          no INTERNET; leanback; boot receiver
│   ├── java/com/streamstage/boothloop/
│   │   ├── BoothLoopActivity.kt     player, wake lock, key swallowing, watchdog
│   │   ├── Playlist.kt              local file discovery + ordering
│   │   └── BootReceiver.kt          best-effort autostart
│   └── res/                         black fullscreen theme, TV banner, icons
├── tools/push-media.sh              side-load the films over adb
└── build.gradle.kts                 media3 only — nothing that can open a socket
```

## What this reused

Toolchain and shell patterns are lifted from **TVBOX / DanTV** (`~/projects/TVBOX/app`), which
already ships working Fire TV APKs: the Gradle plugin versions, the leanback manifest shape, the
Media3 dependency set, and specifically its hard-won Fire TV wake-lock fix.

**DanTV's remote-control channel was deliberately not reused.** It drives the TV through Supabase
over the public internet (`app/companion/.../data/SupabaseRemoteApi.kt`) — precisely the thing
that cannot work at a booth. Item E2 (the tablet controller) should use the kiosk's LAN SSE relay
in `expo-assets/kiosk/serve.py` instead.
