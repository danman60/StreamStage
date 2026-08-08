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

**Playback never touches the network.** Plug the stick into a rented TV with no wifi, no router
and no laptop, and the reel plays exactly as it does at home — no error, no spinner, no mention
of a network anywhere on screen. Verified in airplane mode with the wifi radio off, on the real
booth stick.

Until 2026-08-07 that was enforced by having **no `INTERNET` permission at all**, which is the
strongest possible version of the claim: the kernel refuses socket creation for the UID. The
permission now exists, for one feature — the **"Update films" panel**, which Daniel opens from
the remote when he wants new films. So the guarantee is now enforced by design rather than by
the OS, and it is worth being able to check it:

```bash
$ANDROID_HOME/build-tools/35.0.0/aapt dump permissions app/build/outputs/apk/debug/app-debug.apk
```

```
package: com.streamstage.boothloop
uses-permission: name='android.permission.INTERNET'
uses-permission: name='android.permission.ACCESS_NETWORK_STATE'
uses-permission: name='android.permission.WAKE_LOCK'
uses-permission: name='android.permission.RECEIVE_BOOT_COMPLETED'
uses-permission: name='android.permission.READ_EXTERNAL_STORAGE' maxSdkVersion='32'
uses-permission: name='android.permission.READ_MEDIA_VIDEO'
uses-permission: name='android.permission.MANAGE_EXTERNAL_STORAGE'
uses-permission: name='android.permission.WRITE_EXTERNAL_STORAGE' maxSdkVersion='29'
```

What still holds, and how to check each claim yourself:

- **The app never reaches out on its own.** No boot check, no background poll, no
  `WorkManager`, no `AlarmManager`, no timer. Every call into `UpdateManager` is reachable only
  from a key press in `BoothLoopActivity.dispatchKeyEvent`. `grep -rn "UpdateManager\." app/src`
  is a short list.
- **The player is never given a URL.** `Playlist` returns `java.io.File`s and
  `startPlayback` hands ExoPlayer `file://` URIs. There is no HTTP data source in the
  dependency graph — no `media3-datasource-okhttp`, no HLS, no DASH, no OkHttp, no Supabase, no
  analytics (`app/build.gradle.kts`).
- **Cleartext is refused everywhere except loopback** (`res/xml/network_security_config.xml`).
- **A failed update changes nothing.** A film only replaces another after a complete download
  whose byte count *and* sha256 match the manifest, and the swap is one atomic `rename()`.

If you want the old absolute guarantee back for a particular show, delete the `INTERNET` and
`ACCESS_NETWORK_STATE` lines from `AndroidManifest.xml` and rebuild: the update panel then fails
closed with *"no network — the loop is unaffected"* and nothing else changes.

---

## The booth device

Everything below was run on **the actual booth stick**, not a guess:

| | |
|---|---|
| Device | **Fire TV Stick 4K Max, 2nd gen** (`ro.product.model=AFTKRT`) |
| OS | Fire OS 8 / Android 11, **API 30** |
| adb | `192.168.0.199:5555` |
| Free space | 11 GB (needs ~360 MB) |

`minSdk 22` covers Fire OS 5 (Android 5.1) upward, so this APK also installs on older sticks —
but only the 4K Max 2nd gen has been tested. A 1st-gen stick (Fire OS 3, API 17) will refuse to
install.

The films are 1920×1080 H.264 + AAC 48 kHz stereo — hardware-decoded by every Fire Stick ever
made, and the safest possible codec choice.

**Storage.** The app is 5.2 MB and the films ~350 MB. Check headroom before pushing:

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

> **Fire OS 8 does NOT allow adb to write app-private external storage.** An earlier version of
> this project pushed the films to
> `/sdcard/Android/data/com.streamstage.boothloop/files/media` on the assumption that adb can
> always write there. **That assumption was wrong**, and it was caught only on real hardware:
>
> ```
> $ adb shell ls /sdcard/Android/data/
> ls: /sdcard/Android/data/: Permission denied
> ```
>
> Amazon locks that tree down harder than stock Android 11. `/sdcard/Movies/` and
> `/sdcard/Download/` are freely adb-writable on the same device, so **the films live in
> `/sdcard/Movies/StreamStageBooth/`** and the app reads them with `READ_EXTERNAL_STORAGE`.

The films are **not in this repo and never will be** (~350 MB). They live in
`StreamStage/expo-assets/kiosk/media/`, which is itself gitignored. This repo's `.gitignore`
blocks `*.mp4` and `media/` too.

```bash
./tools/push-media.sh 192.168.0.199:5555
```

The script pushes all seven films **and grants the storage read permission** for you.

Manual equivalent:

```bash
DEST=/sdcard/Movies/StreamStageBooth
adb shell mkdir -p $DEST
adb push ~/projects/StreamStage/expo-assets/kiosk/media/*.mp4 $DEST/

# Shared storage needs a read permission. This is a booth device we own, so grant it
# non-interactively rather than accepting a dialog with the remote:
adb shell pm grant com.streamstage.boothloop android.permission.READ_EXTERNAL_STORAGE

# Only needed if you want the "Update films" panel to be able to REPLACE films over the
# internet (see below). Without it the app is read-only and the loop behaves identically.
adb shell appops set --uid com.streamstage.boothloop MANAGE_EXTERNAL_STORAGE allow
```

**If you forget the read grant**, the app does not show a black screen — it says
*"Storage permission not granted"* on the TV and prints the exact `pm grant` command.

**If you forget the appops grant**, nothing breaks either: the update panel opens, checks and
reports honestly, and says *"this stick cannot replace films — playback is unaffected"* with
that command on screen. It is needed because `/sdcard/Movies` is a scoped media collection on
Android 11: the platform refuses non-media writes there (a `.part` file gets `EPERM`) and
refuses to let this app replace a file that `adb push` created under a different uid. Measured
on the booth stick, not assumed.

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

## Updating the films over the internet, from the remote

Added 2026-08-07. **Manual only, and the loop never depends on it.**

**How to open it:** press **MENU** on the Fire TV remote (the hamburger/options key), *or*
**hold SELECT for about a second**. Both open the same panel. A normal tap of SELECT still does
nothing at all — that is what keeps a curious visitor out. **BACK** closes it.

**What it does, in order:**

1. Opening the panel checks. It downloads nothing. Each film shows its size on this stick and
   one of `up to date` / `NEW VERSION` / `not on this stick` / `unknown (no network)`.
   The first check on a stick whose films arrived by `adb push` hashes them once (~90 s for the
   whole reel, throttled so it cannot make the video stutter) and caches the answer, so every
   later check is instant.
2. Nothing downloads until you choose **UPDATE ALL CHANGED FILMS**, or a single film from its
   own row.
3. Before the first byte: free space and power are checked. Not enough room and it refuses
   *now*, on screen, with the numbers — not at 80% of a 90 MB download.
4. A download goes to `Movies/StreamStageBooth/.staging/<file>__<hash>.mp4.part`. The live film
   is never opened for writing. A dropped connection **keeps** the `.part`; pressing update
   again resumes from where it stopped with a `Range` request rather than starting over.
5. It goes live only after **both** the byte count and the sha256 match the published manifest —
   and then by a single atomic `rename()` into **its own new filename** (see below). The
   destination is then read back and hashed before any success is recorded.
6. **A film that is on screen is never swapped.** It waits in `.staging` and goes live at the
   next loop boundary for that film.
7. Any failure leaves the booth byte-for-byte as it was, and says so in plain English
   ("no network — the loop is unaffected"). Never a stack trace.

### Films are versioned, and that is what makes this safe

Every downloaded version lands at its own filename, derived from the sha256 the manifest already
publishes:

    costumecraft.mp4   ->   costumecraft__03fcba88a2a4.mp4

A local pointer file, `films.json` in app-private storage, records which version is current for
each film and which one was current before it. The name on the server never changes, so nothing
about publishing changed.

This exists because of the corruption fixed in `a1e9ace`. `/sdcard` on a Fire Stick is a FUSE
mount served by MediaProvider. Renaming a new film **over a live path that ExoPlayer still has
open** — and it always has the next film in the reel open, because it pre-buffers it — succeeds on
the ext4 underneath while every reader on the device carries on seeing the old file's cached size,
mtime and a page-granular *mixture* of the two films (measured 83.8% new / 16.2% old). `a1e9ace`
made that detectable by reading the destination back and hashing it. Versioned filenames make it
**unreachable**: the destination of a swap is a path that has never existed on the device, so
nothing can have it open and there is no stale cache entry for it. The read-back check is still
there, as belt and braces.

Two things follow from it that matter at a booth:

- **Each film goes live as it lands.** Nothing waits for the rest of the batch.
- **The previous version stays on the stick**, which is what makes rollback instant.

Superseded versions are deleted only 30 s after a later reel rebuild, never while they could be
open, and the immediately previous version is never deleted at all.

### Roll back

`PUT EVERY FILM BACK TO ITS PREVIOUS VERSION`, or the same from any film's own row. It flips a
name in `films.json` — **no network, no download, no hashing, nothing copied**, because both
versions are already on the stick. Seconds, with a remote, on a venue with no wifi. This is the
recovery path for the likeliest bad outcome at a booth: not a dropped connection, but a render
that looks wrong on the TV.

### Check my stick

`CHECK MY STICK` re-reads every film off the flash, hashes it, and reports in English whether it
matches the published list — or, with no network, what this stick recorded installing. ~100 s for
the whole 350 MB reel, and **it transfers nothing**. This is the 8am "is this thing right?"
question, answered without a re-download.

### Per-film actions

SELECT on any film row opens a menu for just that film: update it, roll it back, check it. A row
that failed to download says **TRY THIS FILM AGAIN** and carries on from where it stopped.

**Manifest:** `https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev/booth/manifest.json`,
published by `tools/publish-films.sh`. The films are fetched from the manifest's own `base`
field, so the bucket can move without a new APK. The manifest is treated as hostile input:
filenames are whitelisted (no separators, no `..`, video extensions only), hashes must be 64
hex, sizes are bounded, and anything malformed is ignored rather than acted on.

**There is no boot check, no background poll, no scheduled job and no timer.** Grep the source;
the only calls into `UpdateManager` come from a key press. Playback itself never touches the
network — `Playlist` reads the local folder and ExoPlayer is handed `file://` URIs, with no
HTTP data source anywhere in the dependency graph.

For bench testing against a laptop rather than R2: `adb reverse tcp:8000 tcp:8000`, serve a
`booth/` directory locally, and drop a `.update-base` file containing
`http://127.0.0.1:8000/booth/` next to the films. Only `https://` and loopback are accepted.

---

## Behaviour at the booth

| Concern | What it does |
|---|---|
| Looping | ExoPlayer `REPEAT_MODE_ALL` across the whole playlist. Wraps last → first, forever. |
| Audio | Plays at full volume. Audio focus is **deliberately not honoured** so nothing can duck or pause the VO. |
| Screen sleep | `FLAG_KEEP_SCREEN_ON` **plus** a `SCREEN_BRIGHT_WAKE_LOCK` — Fire OS runs its own sleep timer that ignores the flag alone. (Learned on DanTV: `TVBOX/app/app/.../MainActivity.kt:91`.) |
| Stray remote input | Every key on the Fire TV remote is swallowed — D-pad, Select, Back, play/pause, FF/REW. **Back and a normal press of Select do nothing at all.** A passer-by cannot pause, seek, or drop the TV to the launcher. |
| Update panel | The two exceptions to the above: **MENU**, and **holding SELECT for ~1 s**, open the "Update films" panel. BACK closes it and the loop never stops playing behind it. See the section above. |
| Volume keys | Deliberately **passed through** so staff can set booth level. On most sticks the TV handles these over CEC/IR anyway. |
| Deliberate exit | **DOWN, DOWN, UP, UP, BACK** on the D-pad within 5 seconds. |
| HOME | No app can intercept the HOME key. **Set this app as the stick's launcher** and the point becomes moot: HOME returns here instead of leaving. It registers `category.HOME` (the DanTV shape, which is proven on a real stick), so Fire OS offers it as a home app — choose it and tick Always. If you do not, HOME drops to the Fire OS launcher, which is a menu and *not* a black screen; relaunch from the home row. Reversible in Settings > Applications. |
| Fire OS system keys | A few keys are handled by Fire OS **above** every app and cannot be swallowed, exactly like HOME. Verified on the stick: `KEYCODE_INFO` raises Amazon's `com.amazon.tv.keypolicymanager/.irfallback.IRFallbackDialog` over the loop. INFO is **not a button on the Fire TV remote** — it only reaches the stick via synthetic injection or an unmapped universal/IR remote. Verified that the app returns to the foreground and resumes playing on its own afterwards. |
| Backgrounding | Releases the player on stop, resumes on return — and restores the film and position it was on. |
| Missing storage permission | Says *"Storage permission not granted"* on the TV with the exact `pm grant` command — never a black screen. |
| No network | Only ever noticed if you open the update panel, which then says *"no network — the loop is unaffected"*. Cold-starting in airplane mode plays the reel with nothing on screen about it. |
| A truncated film | A film this app installed is checked (length vs. what was verified at install) on every launch and left out of the reel if it no longer matches, instead of becoming a decoder error and a blacklist entry. Films pushed by adb are untouched by this check. |
| A corrupt film | Skipped, taken out of the reel, show continues. One bad push cannot stall the booth. **The exclusion expires after 20 minutes** and the film is tried again — a single bad read no longer costs the film for the whole day, and there is no need to power-cycle to get it back. |
| A stall | A 10-second watchdog nudges at ~20 s, **skips the offending film at ~30 s**, and rebuilds the player at ~40 s. A frozen player reports no error, so nothing else would ever take that film out of rotation — this is what stops a booth TV sitting on one frame. |
| A film that will not play after an update | Confirmed, not assumed. 12 s after any update or rollback rebuild, the app checks that the position actually moved; if it did not, that film is dropped and the reel carries on. Verified bytes are not the same claim as a decoder accepting them. |
| Empty media dir | Shows the `adb push` instructions on screen; the watchdog starts playing the moment films appear, with no relaunch. |

---

## What was actually verified

### On the real Fire TV Stick 4K Max (AFTKRT, Fire OS 8 / API 30, `192.168.0.199:5555`)

| Check | Result |
|---|---|
| Installs | `adb install -r` → `Success` |
| **Plays the films** | All 7 found in `/sdcard/Movies/StreamStageBooth`, playing full-screen on the TV |
| Storage fallthrough | Log shows app-private dirs empty (blocked), then `Using 7 file(s) from /storage/emulated/0/Movies/StreamStageBooth` |
| `pm grant` works | `READ_EXTERNAL_STORAGE granted=true` non-interactively |
| Audio | `usage=USAGE_MEDIA`, `state:started` |
| **Fire OS sleep timer DEFEATED** | **23 min 17 s** of continuously-held wake lock (`ACQ 20:27:06.477` → `REL 20:50:23.044`, from `dumpsys power`), display `state=ON` and picture changing throughout. The stick's own timers are `screen_off_timeout=5 min` and `secure sleep_timeout=20 min` — **both outrun.** |
| Wake lock is real | `SCREEN_BRIGHT_WAKE_LOCK 'StreamStageBoothLoop::KeepAwake' ACQUIRE_CAUSES_WAKEUP (uid=10248)` present in `dumpsys power` for the whole run |
| Remote key immunity | D-pad, Select, Back, all media keys, Menu → app kept focus every time |
| Missing-permission screen | Revoked the permission on the stick → TV showed the "Storage permission not granted" screen with the exact `pm grant` command. **Not a black screen.** |
| Fire OS system key | `KEYCODE_INFO` raises Amazon's `IRFallbackDialog` above the app (uninterceptable, like HOME). App returned to foreground and resumed playing by itself. |
| No INTERNET | *Was* true up to 2026-08-07; see "The one guarantee" for what replaced it |

### Update panel, on the same stick, 2026-08-07

Baseline `sha256` of all seven films was recorded before any of this and compared afterwards:
**all seven byte-identical**, nothing damaged.

| Check | Result |
|---|---|
| **MENU opens the panel** | Opens over the loop; the reel and its audio keep playing behind it |
| **Long press of SELECT opens it** | Same panel (`input keyevent --longpress KEYCODE_DPAD_CENTER`). A normal tap still does nothing. |
| BACK closes it | Returns to the loop mid-film — playback was never interrupted |
| Live manifest check | `film list v1`, all 7 films correctly reported **`up to date`**, `UPDATE ALL CHANGED FILMS (nothing to update)`. Nothing downloaded. |
| First-run hashing | Films that arrived by `adb push` are hashed once (throttled), result cached in app-private `installed.json`; second open is instant |
| **New film downloads and goes live** | Served a manifest with an extra film over `adb reverse` → downloaded, verified, applied, `Using 8 file(s)`, reel rebuilt and resumed on the same film it was playing |
| **A film that fails sha256 is refused** | Same run, second film published with a deliberately wrong hash → `sha256 … != 0000…`, `.part` deleted, panel said **"did not verify — nothing changed"**, nothing written to the media folder |
| `.staging` left clean | Empty after both the success and the failure |
| Live films untouched | The 7 real films kept their original mtimes and sha256 throughout |
| **Cold start in airplane mode** | Airplane mode on + `svc wifi disable` + `am force-stop` → app restarted and played the reel with **nothing on screen about a network** |
| **Panel with no network** | Every film `unknown (no network)`, header `no network — the loop is unaffected`, no Update offered |
| Scoped storage | Without `MANAGE_EXTERNAL_STORAGE` the panel says the stick cannot replace films and prints the `appops` command; with it, downloads and swaps work |

### Versioned films, rollback and check-my-stick — RELEASE build, same stick, 2026-08-08

Everything below was done on `192.168.0.199:5555` against a **release** APK (v1.1.0, `versionCode`
2), installed with `adb install -r` over the debug build that was on it. `sha256` of all seven
films was recorded before and after: **byte-identical**, and the stick was left in exactly the
state it started in — seven plain-named films, `.staging` empty, reel playing.

Films were served from a laptop over `adb reverse` + a `.update-base` loopback override. **Nothing
was published to R2.**

| Check | Result |
|---|---|
| **Migration — legacy films untouched** | Release APK installed over the debug build, app relaunched: `Using 7 file(s) … streamstage-services.mp4, studiosage.mp4, …` — the seven plain-named adb-pushed films, correct running order, no pointer file, nothing rewritten |
| Upgrade keeps app data | Release signed with the debug key so `adb install -r` upgrades in place; `films.json` / `installed.json` survive. An unsigned release APK cannot be installed at all. |
| `appops` grant survives the upgrade | `MANAGE_EXTERNAL_STORAGE: allow` still set after `install -r` |
| **A new version lands at its own filename** | `studiosage__3993a572732a.mp4` written alongside the original; `Applied studiosage.mp4 as studiosage__3993a572732a.mp4 — confirmed at its final path`. The original `studiosage.mp4` **kept**, untouched, as the rollback. |
| Nothing else touched | The other six films kept their original mtimes and sizes through every test |
| **Reel rebuilds at a film boundary** | `Rebuilding reel for a version change` → `Using 7 file(s) … studiosage__3993a572732a.mp4 …` in the correct running-order slot (ordering is by *logical* name, so the version tag is invisible to `playlist.txt` and the preferred order) |
| **Playback confirmed after the update** | `Playback confirmed after the rebuild (pos=11607)` — the post-update probe proving the picture actually moved, not just that the bytes verified |
| **Rollback** | Per-film rollback from the film's own row: `Rolled studiosage.mp4 back to studiosage.mp4`, panel said *"put back · plays from the next time round"*, reel rebuilt to the original film. **No network involved, no bytes moved, instant.** |
| **Check my stick** | `all 7 film(s) are correct and match the published list` — full sha256 of 350 MB in ~100 s, **zero bytes transferred** |
| **Resumable download** | 92 MB film, connection dropped at 8 MB by the test server → `.part` **kept** at 8,000,000 bytes and survived an app reinstall. Pressing update again: `Resuming reflect__220793e2100f.mp4 at 8000000 of 92837907`, server logged `RANGE REQUEST bytes=8000000- -> 206`, and the completed file passed the full sha256 gate — which is what proves the resumed bytes were joined correctly. |
| **Preflight refuses before downloading** | Manifest claiming 11,185 MB against 10,721 MB free → *"not starting — not enough room — 11185 MB to fetch, 10721 MB free / roll a film back, or free space, then try again"*, `.staging` empty, **nothing downloaded** |
| Per-film menu | SELECT on any row opens update / roll back / check for that film alone |
| A failed row can be retried | A download that stopped short shows **TRY THIS FILM AGAIN** and resumes. (Found and fixed during this session: a `FAILED` row used to disable its own update action, which made the "press update again to resume" message impossible to act on.) |
| **Release-build soak** | See the soak table below |

### On an Android TV emulator (AOSP TV, 1920×1080, API 34)

Using the **real seven films** (md5-checked after push), not stand-ins. These are the checks that
are impractical to run on the stick (airplane mode, frame-accurate transition sampling, corrupt
media injection):

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

### The emulator lied about storage, and it will lie about other things

Build, install, launch, playback and remote handling are now **proven on the real stick**. But the
single worst bug in this project — the films being pushed to a directory Fire OS forbids — was
invisible on the emulator and showed up in the first ten seconds on hardware.

Treat every remaining emulator-only row above as provisional. Where Fire OS and stock Android
differ (storage policy, key handling, the launcher, power management), **the emulator is not
evidence.**

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

- **HDMI re-plug.** Still unmeasured — needs someone physically at the TV. The activity handles
  the relevant config changes itself and restores position on recreate, but this is reasoned, not
  measured.
- **Real power cycle** on the stick (mains pulled and restored).
- **A full show day.** The proven continuous run is 23 min 17 s, not 8 hours. It clears the
  stick's 20-minute sleep timer, which was the specific unknown, but a Calgary booth day is
  ~20× longer.

### The soak was fought for, and the stick is shared

Two earlier soak attempts were destroyed by **someone else using the same stick concurrently** —
Amazon Silk (`com.amazon.cloud9`) was launched over adb from `uid 2000` pointed at
`http://192.168.0.13:8081`, which killed this app and held the foreground for 15 minutes. If you
re-run the soak, confirm nothing else is driving `192.168.0.199` or you will measure the browser.
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
