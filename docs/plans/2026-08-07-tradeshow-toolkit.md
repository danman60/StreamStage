# Trade-show toolkit — one app, many screens, no internet

**Status: PLAN ONLY. Nothing built.** Written 2026-08-07 for a fresh session to execute.
Not for Calgary (Aug 11–12) — the current browser kiosk and the current decks cover that show.

---

## What Daniel actually asked for — his words, 2026-08-07 09:08

> "I can plug a Fire Stick into a TV and have pre-rendered kiosk videos as well as our live video
> selector switch which is synced up to a tablet running the same app, as long as they're all on the
> same Wi-Fi — for example even the hotspot of a phone. Then the laptop can also be plugged into an
> HDMI projector and all of our presenter phone slide deck and notes will work as well. Later it
> would be cool if even the Fire Stick could be plugged in and, as long as it has the app installed,
> it can be user-selected as the deck view. So there's an omnipresence to the whole system, and an
> easy way to update semantically via LLM. But for now I just need this all to work with our current
> assets."

Earlier, the requirement that drives the whole thing:

> "I don't trust opening browsers on rented or new TVs."

A rented booth TV is an unknown machine — unknown browser, someone else's logins, update nags, an
unpredictable remote. Bringing your own Fire Stick makes the display a device he controls and has
tested. **This is the reason the project exists. Do not design it away.**

---

## The shape

**ONE app. Installed everywhere. Role chosen at runtime.** Not separate apps per device.

| Device | Role picked on first launch | Shows |
|---|---|---|
| Fire Stick in the booth TV | **BOOTH DISPLAY** | attract loop + whichever film the tablet selects |
| Tablet at the booth | **CONTROLLER** | the six product tiles, tally |
| Phone in his hand on stage | **PRESENTER** | deck beats, jump-to-slide, prev/next |
| Laptop → HDMI projector | (serves; shows the deck) | the slide deck itself |
| *Later:* Fire Stick | **DECK DISPLAY** | the deck, user-selected — the "omnipresence" bit |

**Network: any LAN, including a phone hotspot. No internet, ever, on the critical path.**

---

## Phasing — do these in order

### Phase 1 — the fallback that cannot fail
Fire TV app that plays the pre-rendered loop **by itself, with no controller and no network at all.**
Films side-loaded onto the stick. Autostarts on boot, loops forever, no end card, no black frame.

This is first because it is the failure-mode insurance: laptop dead, no router, nobody available —
the TV still shows something. Everything after this is an upgrade on top of a working floor.

### Phase 2 — the live selector
Same app on the tablet in CONTROLLER role. Tablet picks a film; the stick plays it with audio and
that product's QR. Tablet and stick find each other on the LAN with **no typed IP addresses**.

### Phase 3 — presenter unchanged, then folded in
Laptop keeps serving the deck to the projector over HDMI; the phone keeps driving it. Then merge
the two servers (see the port collision below) so one process serves both surfaces.

### Phase 4 — deck on the Fire Stick
The stick becomes a selectable deck display. This is the "omnipresence" ask and the least urgent.

### Phase 5 — semantic updates via LLM
His words: *"an easy way to update semantically."* Not specified further; **ask him what he means
before designing it.** Do not invent a mechanism. Likely shape: content (tile copy, taglines, which
films, QR targets) lives in one declarative file an LLM can safely rewrite — `kiosk.js`'s `CONFIG`
block is already exactly that, and `README-BOOTH.md` already calls it "the one place you edit."

---

## Reuse map — verified 2026-08-07, do NOT start anything from scratch

### `~/projects/TVBOX` (DanTV) — three of four pieces
- `app/app` — Fire TV app, `com.tvbox.app`, Compose TV UI, LEANBACK_LAUNCHER. **The stick shell.**
- `app/companion` — companion **tablet** app. **The controller shell.**
- `app/installer` — **LAN installer**, the mechanism for pushing builds/media onto a stick.
- Built APKs sit in the repo root (`dantv.apk` 34 MB, `companion.apk` 19 MB) — toolchain works.

⚠ **DO NOT copy DanTV's remote-control channel.** Its companion drives the TV **through Supabase over
the internet** — `app/companion/src/main/java/com/tvbox/companion/data/SupabaseRemoteApi.kt`, OkHttp
to the REST URL, `remote_commands` / `dtv_*` tables. That is exactly what fails at a booth. Use the
kiosk's LAN relay instead.

### `~/projects/PhonePresenter` — the WebView shell
Gradle Android app that already wraps `presenter-server.py`: WebView on `/remote`, host stored in
SharedPreferences behind an `EditText` (`MainActivity.kt:39-50`), volume-button paging via
`onKeyDown` + a MediaSession `VolumeProviderCompat`. Its README says "scaffold only" — **stale**: a
built `PHONEPRESENTER.apk` (3.2 MB, 2026-07-26 16:14) is on the FIRMAMENT desktop.

### `StreamStage/expo-assets/kiosk` — the content and the correct control channel
`serve.py` — static + **LAN-only SSE relay**, no cloud. `tablet.html`, `tv.html`, `kiosk.js`
(`CONFIG` is the single edit point), `make-qr.py`, `sync-media.sh`, `README-BOOTH.md`.

### Toolchain — already installed on SPYBALLOON
`gradle` at `/usr/local/bin/gradle`; SDK at `~/Android/Sdk`; `PhonePresenter/local.properties`
already points at it. Nothing to install.

---

## Current assets — he said "make it work with our current assets"

Six final films, **255 MB total**, all carrying VO, in `expo-assets/kiosk/media/`:

| product | file | size |
|---|---|---|
| StudioSage | studiosage.mp4 | 19.1 MB |
| CompSync | compsync.mp4 | 53.9 MB |
| Callboard | callboard.mp4 | 36.9 MB |
| CostumeCraft | costumecraft.mp4 | 52.8 MB |
| Reflect | reflect.mp4 | 57.9 MB |
| StudioBeat | studiobeat.mp4 | 33.6 MB |

Posters in `media/posters/`, QR SVGs in `qr/tv/` + `qr/tablet/`, brand marks in `brand/`.
255 MB is nothing against a Fire Stick's 8 GB, but it does **not** belong inside the APK — ship a
small app, side-load the media (that is what `app/installer` is for).

Look reference for the rendered loop: `kiosk-tv/TV2-streamstage-kiosk.mp4` (290 MB) on FIRMAMENT,
with `TV1-studiosage-kiosk-60s.mp4` (5.6 MB) as the smaller sibling.

---

## Hard-won constraints — every one of these was found by something breaking. Do not regress them.

1. **Port 8080 collision.** `presenter-server.py:18` (`PRESENTER_PORT` or 8080) and
   `kiosk/serve.py:345` (`--port` default 8080) both default to 8080. The booth wants deck and kiosk
   on the same laptop simultaneously; today the second to bind fails. Never tripped only because
   they have never been run together. Merging the servers is probably right — both are stdlib-only
   HTTP + SSE relay + JSON state, so they largely overlap.
2. **HTTP Range is mandatory.** Without `206`, video seek clamps to 0 and Safari-class clients refuse
   `<video>` outright. `serve.py` always had it; `presenter-server.py` got it in `29838b1`.
3. **Telemetry needs its own port** (page port + 1). A browser allows ~6 connections per host; the TV
   holds an EventSource plus one live connection per film — the entire budget — so per-event POSTs
   queued behind the videos and never sent. Measured: 15 films played, 15 events in localStorage,
   **0 on disk**.
4. **The SSE relay retains only `tv` state messages.** Retaining a `play` command made a
   late-joining screen restart a stale film.
5. **QR impressions are not scans.** The telemetry deliberately separates them. Keep that honesty.
6. **No email gate on the kiosk.** A gate at a trade show reads as a paywall and poisons the tap
   numbers. Capture happens *after* a film finishes.

---

## Acceptance criteria — test these, in this order

1. Fire Stick, no network at all, no tablet, no laptop: plug in, TV shows the loop within seconds of
   power, loops forever, audio present, no black frames, no end card.
2. Add a phone hotspot and the tablet: tablet finds the stick **without anyone typing an IP**; tap a
   tile → that film plays on the TV with audio and the right QR.
3. Kill the hotspot mid-film: the stick keeps playing and falls back to the loop; the tablet
   reconnects on its own when the network returns.
4. Laptop → HDMI projector, phone on the deck: beats, jump-to-slide, prev/next, `L` facelift, `G`
   robot wall, `M` media-fee act all still work — **at the same time as the booth kiosk is running**
   (this is the port-collision test).
5. Tablet sleeps and wakes: reconnects without a relaunch.
6. A visitor cannot leave the app on the tablet (lock task mode).

---

## Ask before building — do not guess these

1. **Which tablet, and which Android version?** Decides mDNS/NSD behaviour, lock-task mode, and
   whether the WebView needs a flag for autoplay-with-audio.
2. **Which Fire Stick generation?** Decides storage headroom and whether sideloading needs adb over
   the LAN or the installer app.
3. **What does "update semantically via LLM" mean to him?** Phase 5. Do not invent it.
4. **WebView wrapper vs native Compose for the controller?** A wrapper around the existing
   `tablet.html` keeps one codebase and preserves everything already verified — portrait-first, zero
   scroll at five viewport sizes, ~87–91 ms tap-to-frame, the telemetry. Native is weeks and throws
   that away. The wrapper is almost certainly right, but it is his call.
