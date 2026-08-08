# Current Work - StreamStage

## 2026-08-07 22:00 ET — THE TABLET NOW ACTUALLY DRIVES THE STICK. ROOT CAUSE WAS THE APK.

Commits `e6dfa99` + `378ea3e`, pushed.

### The bug that made the whole app pointless
`kiosk-app`'s `network_security_config.xml` permitted cleartext HTTP **to 127.0.0.1 only**. The
booth kiosk is a laptop on a DHCP LAN address serving plain HTTP, so **every `BoothBus` health
probe was blocked before it left the device**. `health()` wraps the probe in `runCatching`, so a
blocked kiosk and an absent kiosk were indistinguishable: the reel played on and nothing said why.
It passed on the bench because `adb reverse` makes the laptop look like loopback — the one address
the policy allowed. Fixed; the probe now logs its failure reason.

**Do not "harden" that file back to loopback-only. That is the bug.**

### Also fixed
- `pause`/`resume` are now operator-only on BOTH the relay and the stick. A visitor-origin pause
  was accepted 200 and froze the booth TV on one frame with nothing able to release it. `stop`
  stays open — it ends a film rather than freezing one.
- **The invented lead field is gone.** `flush-leads.py` no longer synthesises a person's name from
  the email local part; `/api/expo-leads` now accepts a booth capture (`src` starts with "booth")
  on its email alone. Verified by reading the real email: Studio + Email rows only, no Name row.
- The "jen / Bright Step Dance" emails were NOT booth corruption — they are the previous session's
  test harness posting fabricated leads to the live route. Four of them, 00:39–00:56 on 08-08.

### Proven on real hardware (evidence DM'd)
Fire Stick AFTKRT · Fire tablet KFTRWI · Pixel 9 Pro · current `serve.py` on DART `192.168.0.13:8081`
over real Wi-Fi, no adb scaffold.
1. Tablet tile tap → that film plays on the stick.
2. Phone: operator-only film, pause (frozen 7.73s), resume (11.42→15.43), stop, drag-reorder.
3. Visitor-origin attempts at the operator-only film refused 403, three different shapes.
4. Kiosk killed → reel kept playing, nothing alarming on screen; restarted → stick reconnected unaided.
5. 170 frames off the real stick, 43 with QR + caption together, **0 overlaps**.
6. Real lead email read in the inbox — exactly the studio and email typed.
Lead durability: sent once, re-run sends 0, `forwarded:false` and no-internet both KEEP the queue,
survives a kiosk restart. All to a LOCAL sink; the flushed-marker was cleared afterwards.

### OPEN DEFECT — power-on shows the Amazon home screen
Android 11 refuses `BootReceiver`'s activity start (`isBgStartWhitelisted:false`). On plug-in the
app boots and plays the reel **with sound behind the Amazon launcher** (Netflix/Prime/Luna tiles).
`SYSTEM_ALERT_WINDOW` was granted via appops and re-tested — still refused. Proven to win the
screen back instantly: `adb shell am start -n com.streamstage.boothloop/.BoothLoopActivity`, or
selecting the app once on the remote. **Needs Daniel's call**: home-launcher replacement, a
foreground service that retries, or an operator step in the booth procedure.

### Environment facts worth not re-deriving
- SPYBALLOON's INPUT policy is DROP: devices CANNOT reach a server on this box over the LAN. Serve
  the booth from DART, or use `adb reverse` and know it is a scaffold.
- DART is on Eastern, so its lead files are named `leads-<yesterday>.jsonl` relative to this box's UTC.
- Three stray kiosk servers from earlier sessions were beaconing on the LAN and stealing device
  discovery. All stopped. If devices drift to the wrong kiosk again, look for those first.

## 2026-08-07 21:00 ET — SESSION ENDED BADLY. READ THIS FIRST.

Daniel's verdict on the session: "AWFUL SESSION 0 STARS". He is right about the substance.
Do not repeat these. What went wrong, precisely:

1. **The Fire Stick APK cannot be driven by the tablet — and that was the whole point of it.**
   The app was built as an offline-only reel. Daniel: *"The whole point of doing the app was so
   it could be driven by tablet."* The tablet-driven path that works today is the stick's BROWSER
   (Silk) on the kiosk `/tv` page — not the APK. **The goal now: the APK is controlled by the
   TABLET as customer (gated) and the PHONE as admin (ungated, full verbs).**
2. **Captions are covered by the QR on the real TV.** The captions were placed lower-right after
   measuring the FILM FRAMES ONLY. The films never play bare — `tv.html:126` pins the gated QR at
   `right:6rem; bottom:6rem; width:32rem` during playback. **Validate on a COMPOSITE of the film
   under the live TV page, never on raw frames.**
3. **A gate submission produced an email naming "Jen" and "Brightstar Dance" — not what he typed.**
   DART recorded his real input correctly (`fdd@dhs.com / Xjs`, `cf@sdd.com / Ecr` in
   `telemetry/leads-2026-08-07.jsonl`), so the corruption is DOWNSTREAM of the kiosk. **Unfinished
   — this is the top bug.** Relevant: `flush-leads.py:135` SYNTHESISES a person's name from the
   email's local part because `/api/expo-leads` requires one. Nobody asked for that. Trace the
   actual email that was sent; do not theorise.
4. **"Tested end to end" was claimed without opening the resulting email.** A row landing on DART
   is not the lead path working.

**Daniel's design correction, verbatim — the architecture to build toward:**
> *"why does dart need to — why can't it just store it in the apk on the tv and upload when it
> has internet. you are overengineering."*

So: the STICK APK holds the lead itself and uploads when internet returns. DART is not required
in the lead path. Simplify toward that instead of adding more relay machinery.

**Also: subagents burned ~42 minutes of wall time and a lot of tokens.** Scale the approach down.

### Agents that were mid-flight when this session ended — results will NOT carry over
- kiosk server/pages hardening (`expo-assets/kiosk/`) — gate conversion rollup, lead-queue drain,
  stall watchdog, LAN beacon, preflight script, mute/stop/fullscreen bus verbs, `/events` fix
- Fire Stick app (`kiosk-app/`) — versioned filenames, rollback, per-film update, release build +
  soak, and the NEW tablet/phone control requirement
- caption QR-collision fix (`RemotionVideo/` + `media/captioned/`)
- the 181s `Kiosk-EditorialCinema` re-render (QR repointed to the gated `/g`, plus the blurred
  tile wall and gold oval speaker) — chunked render, was still running
Check the working tree and re-verify anything before trusting it.

## 2026-08-07 17:10 ET — THE FULL DEVICE MATRIX IS PROVEN ON REAL HARDWARE

Commits: `f8e921b` (tablet app) · `d71961b` (phone app, kiosk operator commands, presenter fix,
kiosk-app, the ten-and-ten). Both pushed.

### Proven on the actual devices, not emulators — every claim below has a DM'd screenshot
- **Fire Stick: the 20-minute Fire OS sleep timer is BEATEN.** 27 consecutive minute samples, 27/27
  `mWakefulness=Awake`, `BoothLoopActivity` in focus throughout, zero dropouts, still playing.
  Previous record was 7 minutes and the crash notes called this the most important untested thing.
- **Tablet: the discovery bug is fixed.** APK v1.1.0 installed, device state WIPED (`pm clear`), and
  it found DART on its own inside 25s. Evidence is the socket table, not a page: 3 ESTABLISHED to
  `:8081` plus one to `:8082` (log shipping). The gate still engages on the glass.
- **Phone: operator console + presenter, one app, one icon.** v2.0.1, applicationId
  `com.streamstage.phonepresenter`, so it upgrades PhonePresenter in place. Signing key confirmed
  identical (`a7c65c8c…`) before install.
- **END TO END — the phone drove a live TV**: `playfilm streamstage-services` played (that film was
  previously accepted with ok:true and silently discarded), `pause` held with **0.00s drift over
  5s**, `stop` returned to attract, a visitor-origin attempt at that film was **refused 403 by the
  server**. TV page: zero console errors.

### Open — do not assume done
1. ~~Drag-to-reorder does not take effect on the TV.~~ **FIXED, `55b3156`.** The order was parked
   until the next attract-card boundary, and the card on screen was the **181-second** StreamStage
   film, so the boundary was up to three minutes away. It now applies on arrival. Verified from the
   real Pixel: dragging CompSync above StudioSage changed `.tv.order` within seconds.
2. **DART's presenter server is serving a STALE deck** — `192.168.0.13:8080/state` says 38 slides;
   the repo's talk2 is 32. Same for `192.168.0.12:8080`, which is the phone's saved presenter host.
   Those are Daniel's processes; they need restarting on the current deck. NOT done, his call.
3. **The main StreamStage film's baked-in QR points at `expo-leads.html`**, not the gated `/g` page.
   Decoded independently off the Fire Stick screen. Fixing it means re-rendering the film.
4. The presenter-notes fit fix is in the repo but **DART is still running the old process**, so the
   phone sees the old clipped page until that server restarts.
5. **Ten-and-ten delivered and DM'd**: `docs/five-and-five-2026-08-07.md`. Awaiting Daniel's picks.
6. SPYBALLOON's firewall blocks inbound LAN, so on-device tests against this box need
   `adb reverse`. DART is reachable normally.

## 2026-08-07 13:10 ET — TRADE SHOW CAPTURE SYSTEM BUILT AND SHIPPED

**Master status: `docs/plans/2026-08-07-TRADESHOW-READY-CHECKLIST.md`** — read that first, it has
the per-item state and, more importantly, the list of what is still NOT done.

Daniel's ask: *"we should never give anything away for free without capturing an email… we can't be
losing leads… track where they scan, what path they came in through, video vs software."*
His decisions: gate EVERYTHING including the booth films · Calgary-ready (live Aug 11-12) ·
scan → landing page → email + studio → we send it · **SES only** (not Resend).

### Shipped and pushed today
- `03bed96` **`public/g.html`** — the one gated landing page every material QR lands on, plus a
  lead retry queue on both it and checklist.html.
- `b65a4a9` **the four money forms reach the database.** recital / promo / video-production /
  contact emailed Daniel and reached NO database at all. 177 insertions, 0 deletions.
- `7677d29` **kiosk film gate** (per visitor, not per film), StreamStage services card on the TV,
  material QRs repointed at the gate.
- `a5ff9db` **`kiosk-app/`** — Fire Stick app, plays the loop with no laptop and no network.
- `84c2e8e` both stale decks now cover themselves with a DO-NOT-PRESENT banner.
- `7dd83f0` lead route carries real attribution + emails the visitor the asset.

### Verified against production, not mocks
- One real capture: HTTP 200 in 2.0s, SES sent BOTH mails (counter 12→14), row landed in `leads`
  with `source=booth_tv`, `interests=[video, recital filming]`, populated `raw`. **First row in
  that table's history with a real surface** — it only ever held `expo_form` and `moves` before.
  Row is tagged `TEST — ignore this row`.
- Booth flow, tablet and TV in separate browser contexts (only the LAN SSE relay links them, which
  is the Fire Stick path): first tap gates → studio+email → TV plays at t=4.95 → second film does
  NOT re-gate → lead on disk with via/studio/product. Zero console errors.
- `/g` live: 200, and every QR target URL 200. All 20 QRs decoded with zbar (independent of the
  generator) — do not trust a QR's caption, decode it.

### FACTS worth not re-deriving
- **SES has production access** (50k/day, streamstage.live verified) so it CAN email strangers.
  The old "rejects unverified replyTo" note is NOT a sandbox limit. Resend has only compsync.net.
- **Booth TV target is a Fire TV STICK** (dongle), not a Fire TV set. adb-over-network sideload,
  ~5GB usable, D-pad remote, needs LEANBACK_LAUNCHER.
- **Canonical talk 1 = `StudioSage/live-demo/talk1-deck.html`** (27 slides, md5 ee95a6bd).
  `StreamStage/expo-assets/decks/talk1-video.html` is a STALE 13-slide copy.
- Talk 2 = `expo-assets/decks/talk2-ai.html`, 32 slides, md5 9769113f. Both match FIRMAMENT.
- TV2 StreamStage film: `/mnt/firmament/TRADESHOW-2026-07-29/kiosk-tv/TV2-streamstage-kiosk.mp4`
  → transcoded to `expo-assets/kiosk/media/streamstage-services.mp4` (92.8MB, 181s, audio).

### STILL OPEN — do not assume ready
1. **Fire Stick app is EMULATOR-ONLY.** No Fire Stick on this machine. The 20-min Fire OS sleep
   timer has never been outrun (7 min max). Run `kiosk-app/README.md`'s 7-step test on the real
   stick AT THE HOTEL, not on the floor.
2. Tablet controller APK (E2) — not started; the tablet runs the browser today.
3. Full booth rehearsal on a phone hotspot with no internet (F1) — not done.
4. Deck QRs (D2) and the videographer-brief handout QR (D4) — not repointed / still absent.
5. Browser lead queue only drains if the visitor reopens the page. Kiosk disk queue does not.
6. StudioSage merges leads on email — two proposals from one studio collapse to one row and the
   earlier notes are overwritten. Flagged in StudioSage INBOX. Daniel's call.
7. Reflect's tagline still unconfirmed by Daniel.

---

## SESSION REFRESHED 2026-08-07 09:40 ET (/fresh — long expo session: decks, films, kiosk, toolkit plan)

### NEXT SESSION: the trade-show toolkit is the live thread
**Read `docs/plans/2026-08-07-tradeshow-toolkit.md` FIRST.** It is the executable plan and it holds
the topology, the reuse map, the six hard-won constraints and the acceptance tests. Daniel said
verbatim: *"You're going to be given a fresh session to continue this build so make sure you're
storing all this."* NOTHING of it is built yet. Do not start it without reading that file, and do
not start a new Android project — three shells already exist and are catalogued in the plan.

### What landed 2026-08-06 → 08-07 (all committed and pushed)
- **Talk 2 rebuilt** to the approved running order — 32 sections, clock closes 0:00→60:00
  (`cd5496c`). Slide 1: 11:04 PM is now a real status bar ON the phone, and the title types on /
  holds / clears to show the robot wall, looping only while `body.gathering` (`6ae5e6c`).
- **Robot wall fixed twice** — `.ph.bleed` was painting over it (`78f7547`), and the wall was
  one-shot per page load where ANY click killed it permanently and every later G press returned
  silently. Both reproduced, fixed, re-verified.
- **Dead `route-all` heartbeat deleted** (`1f47918`) — it was throwing a console error every 8s on
  the two live-demo slides.
- **Talk 1 rebuilt** — 27 slides, punch-list items 21–27, media-fee act moved off the main line
  behind the `M` key, `V` audio preflight, re-timed clock (`551c59d`, `86b02cc`).
- **Three studio films at full length** behind one player on slide 15 — CSOD 63.9s, KMSD 60.3s,
  WSDY 65.6s (`d48455b`). WSDY was a 12-second SILENT teaser; the real 4K master was pulled off
  FIRMAMENT and transcoded to 1080p.
- **Calgary reframe** — every video pitch and the booking CTA rebuilt for a room he cannot serve
  from Ontario. The videographer brief now has a live home as Part four of `checklist.html`
  (`2347164`, `2b7880c`).
- **`presenter-server.py` now serves HTTP Range** (`29838b1`) — it was answering 200 with the whole
  37.8 MB file, so video could not seek and Safari-class clients refuse `<video>` without 206.
- **StudioBeat film delivered** with Daniel's VO + bed, all 8 beats inside their windows, placement
  sample-accurate to 1.68 frames. Six films now exist.
- **Kiosk was holding the SILENT StudioBeat cut** (synced 01:34, an hour before the VO landed).
  Re-synced; `media/studiobeat.mp4` now matches the master byte-for-byte with audio present.
- **`/t/` click-to-text fixed** in StudioSage (`713ab90`) — it returned 200 and handed out the
  PRODUCTION number to demo-tenant visitors.
- Both decks synced to FIRMAMENT, md5 matched both sides, presenter server running detached.

### Verified independently (my own headless walk, not the builders' self-reports)
- Talk 2: 32 slides, zero overflow, zero page scroll, no media errors.
- Talk 1: 27 slides, zero page scroll, no media errors, only two ambient beams that overflow by
  design. All three film sources load with real durations.

### STILL OPEN — Daniel's calls, deliberately not taken
1. **The production demo reset.** `POST /api/demo/reset {"seeds":true}`. The Class Schedule seed is
   DEPLOYED but the live demo tenant still has **15** knowledge-base entries and no class schedule —
   so the jazz-class question that failed the live-fire test still fails. Held because it rewrites
   demo data on production.
2. **The deal calculator** for an out-of-area room. `/dancerecital` and `/videoproduction` both
   price Ontario services. He said "I'm still not sure how to handle this" — parked.
3. **Suite pricing.** He floated $5–50/mo for the whole suite; his own 2026-08-03 GTM doc says
   modules $20–40 and suite $100–150, and he said $20/mo for StudioSage alone on a stage in
   Toronto. He called it a discussion point — do NOT invent an offer.
4. **First five signups** — Kerry Moore signed up the day BEFORE the talk, so version A (Kerry in,
   Just4Kicks out) vs version B (Kerry out, Just4Kicks in). StudioSage-2 is holding on his answer.
5. **Reflect's tagline** — verbatim from beat 16 of its own VO script, never confirmed by him.


## SESSION REFRESHED 2026-08-06 21:56 ET (/fresh — long kiosk build session, context rot)

### What this window (StreamStage-1) finished before the refresh
**The booth kiosk is BUILT, TESTED, COMMITTED and PUSHED.** `expo-assets/kiosk/`.
Three commits: `d4b3750` (first build), `af6bbbd` (vertical/six-product rework),
`29081f6` (real product logos + Callboard reframed to recital orders).

Start it with one command: `python3 ~/projects/StreamStage/expo-assets/kiosk/serve.py`
→ tablet `localhost:8080/tablet`, TV `localhost:8080/tv`. Full operator doc:
`expo-assets/kiosk/README-BOOTH.md`.

State as of the refresh:
- **Six products**, tablet is **portrait-first**, all six tiles + the Facebook QR fit with
  **zero scroll** at 820x1180, 810x1080, 800x1280, 768x1024 and landscape 1024x768 (verified
  by measuring each tile's box against the viewport, not by eye).
- **All six films present** including StudioBeat (its film landed mid-session and the tile lit
  up on its own via the runtime film probe — the degradation path is proven both directions).
- Tile icons: **real marks** for StudioSage / CompSync / StudioBeat, **drawn** marks only for
  Callboard / CostumeCraft / Reflect, which have no logo in any repo. Silhouettes live in
  `expo-assets/kiosk/brand/icons/`.
- Tap → first painted frame: **median ~87-91ms**, p90 99ms, with six warm video layers.
- Cross-device relay works (a Fire Stick can be the TV); telemetry runs on its **own port**
  (page port + 1) — see the gotcha below.

### Bugs found and fixed in that session (do not regress these)
1. **serve.py must keep HTTP Range support.** Without 206 responses a video seek silently
   clamps to 0 and Safari-based clients refuse `<video>` outright.
2. **The SSE relay retains ONLY `tv` state messages** (`RETAINABLE`). Retaining a `play`
   command made a late-joining screen restart a stale film.
3. **Telemetry gets its own port.** A browser allows ~6 connections per host; the TV holds an
   EventSource plus one live connection per film — the whole budget — so per-event POSTs queued
   behind the videos and NEVER sent (measured: 15 films played, 15 events in localStorage,
   **0 on disk**). Fixed by batching with a 6s abort deadline AND moving telemetry to
   port+1 with CORS + `text/plain`. Do not move it back onto the page's port.

### Still open / unresolved
- **CompSync signup URL is still an assumption** (`compsync.net`). Flagged in the operator
  sheet and README. Daniel has never confirmed it.
- **Reflect's tagline** is beat 16 of its own VO script verbatim, not confirmed by Daniel.
- TV attract cards use only the left half of a 1920x1080 screen — Daniel flagged it as "worth
  your judgement, not required"; deliberately NOT changed, to avoid churning a verified screen.
- Daniel's Q5 (email capture) was answered by building **option 1 only**: a "Want all six?" QR
  on the tablet after a film completes, pointing at the existing expo-leads form. He never
  replied, so option 2 (tablet-side capture with offline queue) was NOT built.

### Other deliveries from this window (not kiosk)
- Hi-res promo links uploaded to R2 and DM'd: CSOD (4K), Footprints Bigs/Littles/Studio Tour
  (4K), and 11 DIS vertical reels. Masters live at `/mnt/firmament/streamstage/promo-source/`.
  CSOD has two unused drafts there, and WSDY (30s + a no-VO cut) was never uploaded.
- Dance promo proposal builder link confirmed: `https://streamstage.live/dancepromo`.

## SESSION REFRESHED 2026-08-06 10:15 ET (context rot — long expo session)

## ⏰ DEADLINE — Calgary Dance Teacher Expo
Fly **Mon Aug 10 09:00** (WS633 YYZ->YYC). Last useful working day **Sun Aug 9**.
**BOTH talks confirmed**, Adapt Stage / Business Track, 1 hour each:
- **Tue Aug 11, 09:20 AM** — "Why AI? Save Your Studio Time, Money, and Stress" (talk 2)
- **Wed Aug 12, 10:50 AM** — "One Year of Video Content in One Day" (talk 1)
Order REVERSED vs Toronto — AI goes first. Hotel: **The Westin Calgary Airport** (conf 232588,
the venue itself); Hotel Clique cancelled 2026-08-05, written cancellation NOT yet received.
Full detail: `expo-assets/CALGARY-2026-08-10-LOGISTICS.md`.

## THE BIG ONE STILL NOT STARTED
**Talk 2 reorg — 38 slides -> 28, proposal written and approved in principle but NOT BUILT.**
`expo-assets/TALK2-REORG-PROPOSAL-2026-08-05.md`. It goes on stage FIRST, 09:20 Tuesday.
Daniel's decisions: **keep the facelift** (rehearse it properly), **keep the SMS demo where it
is**, pricing = **free until Jan 1 2027 if you sign up now, $20/month for new signups from
Sept 1**, and **no per-dancer scoping slide** — just say parents can ask about classes.

## Four background sessions running (spawned 2026-08-05 evening)
| tmux window | job | state at refresh |
|---|---|---|
| `StreamStage-1` | booth kiosk (tablet controller + TV, 5 products, telemetry) | building; launcher/tablet/tv/serve.py exist |
| `recital-scheduler-2` | Callboard explainer film | rendered; wiring VO+BG |
| `costume-craft-2` | CostumeCraft explainer film | rendered; wiring VO+BG |
| `reflect-2` | Reflect explainer film | rendered; VO is 15.7s LONGER than film — asked to report before re-cutting |

VO + BG audio pulled from FIRMAMENT Downloads to `/mnt/data/vo-drop/`.
Each session told to SPLIT the VO at beat boundaries and place per timecode — the ElevenLabs
renders are continuous spoken-beats only, so they are shorter than the films by design.

## TRADE-SHOW TOOLKIT — FULL PLAN WRITTEN 2026-08-07, NOT BUILT
**`docs/plans/2026-08-07-tradeshow-toolkit.md` is the executable plan. A fresh session should read
that FIRST — it has the topology, the reuse map, the verified constraints and the acceptance tests.**

ONE app, installed everywhere, role chosen at runtime: Fire Stick = booth display, tablet =
controller, phone = presenter, and later the Fire Stick can be user-selected as the DECK display
("omnipresence"). Any LAN including a phone hotspot; **no internet on the critical path, ever.**
Driving requirement, his words: *"I don't trust opening browsers on rented or new TVs."*

Phase 1 is the fallback that cannot fail — Fire TV app plays the pre-rendered loop by itself with no
controller and no network. Everything else builds on that floor.

Reuse (verified): `~/projects/TVBOX` gives the Fire TV shell, the companion tablet app and the LAN
installer; `~/projects/PhonePresenter` gives the WebView shell; the kiosk gives the content and the
LAN-only SSE relay. ⚠ Do NOT reuse DanTV's remote channel — it goes through Supabase over the
INTERNET (`SupabaseRemoteApi.kt`). gradle + Android SDK already installed here.

## KIOSK — TWO THINGS NOTED 2026-08-07, NOT BUILT
Full detail: `expo-assets/kiosk/NEXT-BUILD-NOTES.md`.
1. **Rendered kiosk video** — six software products in floating panes, one film centre-screen at a
   time with audio + its QR, looping. Purpose in his words: *"for when the laptop can't be connected
   to the kiosk and we don't want the kiosk to be blank."* It is a FALLBACK against a black TV, not a
   second product. Look reference: `kiosk-tv/TV2-streamstage-kiosk.mp4` on FIRMAMENT.
2. **Tablet APK** for the existing live kiosk. Topology stays laptop→TV, tablet on the same Wi-Fi.
   Must work with no internet — it already does; every asset is local and the only online things are
   the QR destinations, which open on visitors' own phones. The new work is packaging: a WebView
   wrapper, LAN discovery so nobody types an IP, reconnect-on-wake, and lock-task mode.
   Open questions: which tablet, which Android version, WebView wrapper vs native rewrite.
   **ANTI-DUP:** do NOT start a new Android project. `~/projects/PhonePresenter` already wraps
   `presenter-server.py` in a WebView with host-in-SharedPreferences, and a built
   `PHONEPRESENTER.apk` (3.2 MB, 2026-07-26) is on the FIRMAMENT desktop. gradle + Android SDK
   are already installed on SPYBALLOON. Copy that project, point the WebView at /tablet.
3. **DIRECTION — unified trade-show toolkit.** CORRECTED 2026-08-07: it is TWO devices with TWO
   views at once, not one app in two modes — his PHONE drives the deck from the stage, a TABLET
   drives the TV at the booth. The TV has no internet.
   **Fire Stick answer: yes, an app on a stick runs the kiosk TV offline.** HDMI stays (the stick
   uses the TV port); the LAPTOP leaves the TV path. All six films are 255 MB total, so they
   side-load onto a stick easily. Reuse `~/projects/TVBOX` (DanTV): `app/app` Fire TV shell,
   `app/companion` tablet app, `app/installer` LAN installer — all shipping today.
   ⚠ Do NOT copy DanTV's remote channel: it goes through Supabase over the INTERNET
   (`SupabaseRemoteApi.kt`). Use the kiosk's LAN-only SSE relay instead. Best shape: let the Fire
   TV app run the loop unattended so the fallback needs no network at all.
   He does not trust opening browsers on rented/new TVs — that is the requirement driving this. Build items 1-2 so they fold into it.
   **Concrete blocker found 2026-08-07: presenter-server.py and kiosk/serve.py BOTH default to port
   8080** (`presenter-server.py:18`, `serve.py:345`). At the booth both are wanted on the same
   laptop at the same time, so the second to start fails to bind. Never tripped because they have
   never been run together. Merging the two servers is probably right — both are stdlib-only HTTP +
   SSE relay + JSON state, so they mostly overlap.

## Active Task
**Post-expo: improve the talks + decks from the real lapel-mic transcript.**
Primary source `/mnt/firmament/ExpoMic.txt`. Grounded read-out delivered
2026-08-05: `expo-assets/POSTMORTEM-2026-07-28-said-vs-planned.md`.
Boundaries: talk 1 = lines 1-415 (starts mid-sentence, open not captured),
booth/hallway/vox-pop = 419-2559, talk 2 = 2565-3087, expo closing = 3371+.
Direction chosen 2026-08-05: (1) freebies first, (2) rebuild T1 around the delivered talk,
(3) re-shape T2 from the delivered version. Ad-libs decided beat by beat.

### DONE this session
- `expo-assets/POSTMORTEM-2026-07-28-said-vs-planned.md` - grounded read-out (boundaries,
  said-vs-planned diff, audience markers, timing arithmetic, promise audit).
- **Freebie 1 (the one promised on stage and never built) - SHIPPED `44a70be`:**
  Daniel chose option A - fold into the EXISTING live link, no new URL. The questions now
  live as **"Part two - the interview questions"** in `public/checklist.html`
  (livestream renumbered to Part three, lede updated, stub Interviews section links to
  `#interviews`, "kid" -> "dancer"). Standalone `public/interview-questions.html` was built
  then DELETED - one surface only. Print handout
  `expo-assets/handout-interview-questions.html` QR repointed to
  `streamstage.live/checklist.html#interviews`.
  Verified: email gate still engages for new visitors, 0 JS errors, 4 parts in order.
- **Freebie 2:** `expo-assets/handout-videographer-brief.html` (print, 1-page PDF verified) -
  the `:347` Calgary sheet. No exact prices (talk-1 guardrail); money box is structural.
- `expo-assets/ADLIB-DECISIONS-2026-08-05.md` - 28 ad-libs ranked + items 29-31 (live-demo
  policy, T1 real slot length, which T1 deck is canonical). **Awaiting his picks.**
- `expo-assets/CRITIQUE-AND-PUNCHLIST-2026-08-05.md` - subjective critique of both talks
  (delivery metrics, what's wrong, what to protect), his own on-mic flags, and the master
  42-item punch list: 8 done / 34 open across promises, decisions, T1 deck, T2 deck, housekeeping.

### Deployed
`44a70be` pushed to main 2026-08-05. Vercel serves `streamstage.live/checklist.html`.

### Decisions taken 2026-08-05 (Daniel)
- **Facelift: KEEP** both plant and reveal. Needs a proper rehearsal, not a cut.
- **SMS demo: stays where it is** (slide 34). Wiring corrected, see below.
- **Pricing: free until Jan 1 2027 for anyone signing up now; $20/month for new
  signups from Sept 1.** Facelift hosting after year one is a separate $20/YEAR.
- **No per-dancer scoping slide.** Say parents can ask about classes. Item dropped.

### Demo wiring corrected — `5a14462`
The Toronto demo did NOT fail on stage. `pesupport@namecheap.com` hit the any-sender
ingest path at 15:27 on 2026-07-29 and consumed the one-email lock; the volunteer's
forward 403'd 38 min later. Root cause + fix: `~/projects/StudioSage/docs/plans/2026-08-03-demo-mode-v2.md`.
Fixed in the product 2026-08-03; the DECK was still pointing at the old rig. Now:
- ingest address `bot@studiosage.ai` -> **`calgary@ingest.studiosage.ai`** (any sender resolves)
- demo SMS **`+1 587-317-0721`** (Calgary 587); routing is by receiving number
- the `?rt=TOKEN` arming step is GONE (demo_route_state retired, route-all 410)
- pre-flight = 8 checks at `studiosage.ai/demo/operator`; seed restore =
  `POST /api/demo/reset {"seeds":true}` -> 15 entries

### STILL UNVERIFIED for Calgary (from the StudioSage plan's own open list)
1. ~~No real handset has ever texted `+1 587-317-0721`~~ **VERIFIED Aug 5 15:31–15:37 ET** (Twilio log): +1 647-883-3307 sent 4 texts, 4 replies delivered. Jazz-class question still answers "no class schedule" — blocked on the demo reset (open item 1).
2. SES->S3->SNS latency unmeasured; needs one real email to calgary@ingest.studiosage.ai.
3. Number not prewarmed — a cold long code taking a 40-phone burst can trip Canadian
   carrier filtering.
4. `sms:` QR prefill untested on real iPhone AND Android.
5. Facelift end-to-end has not been rehearsed since Daniel decided to keep it.

Open items surfaced by the read-out:
- The interview-questions QR freebie promised on stage twice (`:13`, `:201`) DOES NOT EXIST
  (verified two ways). `public/checklist.html` lists 1 of the 5 prompts, no provoke technique.
- Stepping Up Dance Company (Sarnia) is still owed the rebuilt website (`:3043`, `:3443`).
- Both talk-2 live beats failed on stage (SMS demo `:2939-2983`, facelift reveal `:3011-3043`).
- Talk 1 ran ~58-66 min (est. from 8,630 words) against a ~20-min run-of-show.
- Three different talk1 decks exist with three different md5s; the one that shipped
  (`~/expo-backup/TRADESHOW-2026-07-29/talks/talk1-deck.html`, 14 slides) matches neither repo copy.

### Prior task (shipped)
**Expo decks (Dance Teacher Expo, Wed Jul 29 2026, 4:10-5:10 PM EDT).** Two talks:
Talk 2 "The AI Front Desk" (38 slides, owned by Daniel's session) and Talk 1 "The Content Day"
(14 slides, `StudioSage/live-demo/talk1-deck.html`).

## Overnight session 2026-07-26/27 - facelift live path + Talk 1
Plan + full deviation log: `docs/plans/2026-07-26-overnight-talk1-and-facelift.md`.
Phase 2 (Talk 2 note fixes) was pulled from this session's scope mid-run - Daniel executed it
in a parallel session. This session did NOT write to talk2-ai.html / talk2.html / talk2-ai-slides.md.

### Facelift live path - DONE, signed off
- **Root cause of the poll hang was Windows OpenSSH + python pipes**, not stdin/`-n`/the abandoned
  dispatch child. `ssh.exe` never closes the pipe write end, so CPython's Windows reader thread
  blocks forever. Measured, table in the plan file. Fix: `run_capture()` uses real temp file
  handles (0.08s vs 30s timeout) for dispatch, poll and scp. `a27b29f`
- **Second defect, hit for real:** the poller only started inside `start_facelift()`, so a server
  restart orphaned an in-flight build. `resume_facelift_poll()` re-attaches at boot. `d0a7bf6`
- Verified end to end from FIRMAMENT: stub in ~5s, and one real `grandriverdance.com` run
  (03:16 -> 03:40, 24 min) pulled back and served at `/facelift-site/index.html`.

### Talk 1 - DONE
Lives in the StudioSage repo; see `StudioSage/CURRENT_WORK.md` for detail. Summary: committed as a
safety net first, then wired to the phone remote (`/state` + `/cmd`, beats on all 14 slides), given
a facelift overlay on `L`, reel wall de-scrubbered and cut from 7 clicks to 2, four `[PHOTO: ...]`
placeholder plates replaced with real footage, five unusable posters regenerated.
Audit: 14 slides, 0 layout findings, 0 JS errors, both fonts loaded. Mirrored to FIRMAMENT, 12/12
md5 match.

## Blockers / NEEDS DANIEL
1. Talk 1 slide 13 carries `[confirm slot/time]` for the Talk 2 tease - his to fill.
2. Which machine presents (FIRMAMENT vs DART). DART still offline and unverified.
3. Talk 2 timing (~93 min of material in a 60 min slot) - his call, cut list in `talk2-runofshow.md`.
4. Rotate `DEMO_RESET_TOKEN` after the talk - it ships in a tracked file.

## Next Steps
- Daniel rehearses Talk 1 from the FIRMAMENT copy: `cd Desktop\StudioSage-Live-Demo`, run
  `presenter-server.py`, open `talk1-deck.html`, phone at `http://<laptop-ip>:8080/remote`.
- Keys: arrows/space nav, digits+Enter jump, `P` notes, `F` reveal all, **`L` facelift overlay**, Esc closes it.
- After ANY Talk 1 deck change: re-run the audit harness, then scp to FIRMAMENT and md5 both sides.

---

# Previous work (2026-03-10/11) — video production proposal builder

## Recent Changes (Session 2026-03-10/11)
- Video production proposal builder added at `/videoproduction`
- Legacy `/proposal-builder-videoproduction` now redirects to `/videoproduction`
- New submission endpoint added at `/api/video-production-proposal`
- Local verification: production build passed, `/videoproduction` returned 200, redirect returned 308
- Video production pricing updated to custom days, second-operator days, and deliverables instead of marketing support
- Submit proposal section widened to a full-width band below the calculator
- Video production email route now mirrors recital-builder validation and send flow more closely
- `7fa6ae2` fix: landscape carousel spacing + mute on fullscreen exit
- `076c125` Revert full-width single carousel (BS-style)
- `d4abe28` feat: auto-rotating 3D carousel like Bending Spoons
- `92a4dc9` feat: update hero background video
- Interactive Software cards — desktop hover (demo panel slides from behind at z-0, scale 0.9→1) + mobile tap-to-expand
- Hero text animations — TextAnimate blurInUp + fadeIn (gradient-safe motion.span for "Technology")
- Section header animations — About, DanceMedia, BusinessVideo all use TextAnimate
- Client logos — removed opacity dimming, now bright white
- Video carousel optimization — IntersectionObserver lazy-loading, dist<=1 play radius, preload strategy
- R2 video compression — 694.8 MB → 276.0 MB (ffmpeg CRF 28-30, max 720w/1280w)
- Blog infrastructure — MDX system (`src/lib/blog.ts`, `src/app/blog/`, `content/blog/`), sitemap integration
- 18-post content plan + ChatGPT agent prompt saved to `docs/plans/`
- Carousel sizing fix — minimum effective item count (10 vertical, 8 horizontal) for consistent radius

## Blockers / Open Questions
- **Carousel panel sizes**: User noted Business Video carousels are noticeably smaller than Dance Media. Min effective item count fix helped radius but user clarified "the panels themselves" — may need further width/aspect-ratio tuning
- **Blog posts**: Content plan ready, delegated to ChatGPT agent. Posts not yet written.
- **StudioBeat demo link**: `demoHref` prop exists but user will wire up later
- Production email/webhook delivery still depends on deployed env vars (`SMTP_USER`, `SMTP_PASS`, optional `CC_WEBHOOK_URL`, `CC_WEBHOOK_SECRET`)

## Next Steps
1. Push/deploy updated video production pricing model and verify live route
2. Submit a live test proposal after deploy to verify email + CRM bridge
3. Investigate carousel panel size mismatch (the container/card dimensions, not radius)
4. Blog posts — user writing via ChatGPT, drop MDX files into `content/blog/`
5. Wire up StudioBeat demo click-through when ready
6. Consider adding demo videos for CompSync and StudioSage

## Context for Next Session
- New files: `src/app/videoproduction/page.tsx`, `src/app/videoproduction/layout.tsx`, `src/app/api/video-production-proposal/route.ts`
- Video production pricing now uses $750 per primary shoot day, optional second-operator days, and deliverable toggles calibrated to legacy Bronze/Silver/Gold totals
- Software.tsx: DesktopProducts uses CSS grid + absolute overlay panel (z-0 behind cards, z-10 cards). MobileProducts uses tap-to-expand with AnimatePresence
- VideoCarousel.tsx: 3D cylinder carousel, auto-rotating at 6°/s, IntersectionObserver controls loading
- TextAnimate component at `src/components/magicui/text-animate.tsx` — don't use on gradient text (breaks background-clip), use motion.span instead
- Blog system: `src/lib/blog.ts` parses `content/blog/*.mdx`, pages at `/blog` and `/blog/[slug]`
- Plans saved in `docs/plans/`: blog content plan, chatgpt prompt, software card animation plan
- R2 bucket: `pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev` — all videos compressed
