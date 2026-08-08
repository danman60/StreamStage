# Open items — StreamStage booth, as of 2026-08-07 23:00 ET

Everything still outstanding. Ordered by what can hurt at the Calgary booth (Aug 11–12).
Anything marked **DANIEL** is a decision, not a task.

---

## BLOCKING — nothing here is blocking any more

1. ~~**The lead-route fix is committed but NOT DEPLOYED.**~~ **DONE — it was already live when
   this was written.** Pushing `2b1378f` auto-deployed it: production deployment
   `dpl_882L2meKxDqrMNgqQeXvBPdJLQ4y`, commit `2b1378f`, aliased to `streamstage.live`, READY.
   Checked at the Vercel API, not inferred. Nothing needed doing.

2. ~~**Six leads are sitting unflushed on DART.**~~ **DONE, and only ONE of them was real.**
   Read before sending, the queue was bench data: `fdd@dhs.com`/"Xjs", `cf@sdd.com`/"Ecr",
   `vvvv@fgg.com`, and two `@example-studio.test` synthetics that can never receive mail.
   Flushing all six would have created six studios in the live database that never existed —
   item 12 again. Daniel's call: send his own capture, retire the rest.
   - **Sent:** `daniel+booth0808@streamstage.live` / "Northgate Dance Academy", through the LIVE
     route. Verified at BOTH ends: the email in the inbox (Studio + Email rows, **no Name row**)
     and the `leads` row — `2026-08-08T03:18:51 | booth_tablet | name=None`.
   - **Retired, never to be sent:** the other five, marked `RETIRED-NOT-SENT` in
     `leads-flushed.json` so a flush at the booth cannot fire them.
   - `flush-leads.py` gained `--only` / `--retire` and now prints its destination before posting.
     Commit `431742a`.

3. **The route answered 200 without saying whether the row landed.** `/api/expo-leads` computed
   `forwarded` and threw it away, so `flush-leads.py` could only treat a 200 as storage — the
   exact silent loss its `send()` was written to prevent (the Supabase forward has a 4 s timeout a
   cold start loses). It now returns `forwarded` and `notified`; the queue becomes strict with no
   change on the booth side. Typecheck + build pass. Commit `431742a`.

---

## Booth hardware / the stick

3. ~~**Zero-touch power-on.**~~ **SOLVED 2026-08-07 23:22, proven on the stick.** It needs TWO
   adb commands, once per stick, and running only the second is why it looked impossible:

   ```
   adb shell pm grant com.streamstage.boothloop android.permission.SYSTEM_ALERT_WINDOW
   adb shell appops set com.streamstage.boothloop SYSTEM_ALERT_WINDOW allow
   ```

   They satisfy different branches of the background-activity-start check — `pm grant` flips
   `granted=true` (the permission carries a `development` protection flag, which is what makes it
   adb-grantable); `appops set` only sets MODE_ALLOWED. With appops alone the boot start was still
   refused. With both, logcat reads *"Background activity start for com.streamstage.boothloop
   allowed because SYSTEM_ALERT_WINDOW permission is granted"* and after a cold power cycle the
   reel owned the screen with nobody touching anything.
   Re-run both after a factory reset. Fire OS 7 (API 28) predates the restriction, which is why
   this only ever broke on Fire OS 8.

4. ~~**The 20-minute Fire OS sleep timer was not re-verified.**~~ **DONE — it does not sleep.**
   A passive read-only monitor sampled the stick every 60 s for **3 h 21 m** (200 samples,
   23:11 → 02:32). Result: **199/200 Awake, screen ON, `BoothLoopActivity` focused, and the kiosk
   received a state report 200/200.** ZERO sleep events. The single non-Awake sample is an adb
   transport hiccup at 23:21, not a sleep — the kiosk recorded `studiosage pos=14.702` at that
   same instant, so playback never stopped. Still playing at 07:54 the next morning: **8 h 43 m
   continuous.**

5. ~~**The R2 film-update path — the DEVICE half.**~~ **DONE 2026-08-08 13:00, on the real
   stick, production bucket never touched.** Local manifest v3 served over `adb reverse` to
   `http://127.0.0.1:8500/` via a `.update-base` loopback override, publishing a film byte-identical
   to the live `studiosage.mp4` under a new name — so the booth's content could not change.
   Chain proven: `Manifest v3, 7 film(s)` → panel showed `studiosage-v3.mp4 — not on this stick ·
   15.8 MB to fetch` → `verified and staged` (hash gate) → deferred install *"swaps in when it next
   comes around"* → renamed to its final versioned path, staging empty → `installed.json` records
   `source=manifest` → it PLAYED (`pos 41.55 → 46.55`) → reel stayed **7 films, no duplicate**
   (`FilmVersions` collapsed them). Cleaned up after; `SYSTEM_ALERT_WINDOW granted=true` re-checked
   so zero-touch boot is intact.

   **NEW, non-fatal defect found doing it:** a `play` landing right after a version swap throws
   `IllegalStateException: Handler … on a dead thread` from `ExoPlayerImpl.prepare` at
   `BoothLoopActivity.kt:281` — a released player still being prepared. Playback recovered and the
   film ran to the end, but it is on the booth's only playback path. NOT fixed.

   **Superseded detail (the bucket half, already verified):** Tested, read-only, nothing on the stick touched:
   - `manifest.json` is live and well-formed — version 2, 7 films, each with bytes + sha256.
   - All 7 films answer **200**, every `Content-Length` matches its manifest entry, and every one
     advertises `Accept-Ranges: bytes` — which is what the resume-a-`.part` logic depends on.
   - `studiosage.mp4` pulled in full: 16,611,612 B and sha256 `555656fd…0daa`, matching the
     manifest **and** the repo copy exactly. A staged `.part` from this bucket would pass
     `applyStaged`'s hash gate rather than fail it.
   **Still untested: the on-device half** — stage, verify, rename into a never-used versioned path,
   and play. That means writing a new film version to the show stick, so it is not something to do
   unasked. **DANIEL: say the word and I'll run it against a LOCAL manifest via `localOverride`,
   so the test never mutates the production bucket.**

6. ~~**Hours-long unattended running is untested.**~~ **DONE by the same run** — 3 h 21 m
   instrumented and 8 h 43 m elapsed, unattended, no human touch, reel advancing through all
   seven films the whole time. Not yet a full two-day show, but no longer "untested".

---

## Content on screen

7. ~~**The StreamStage film's baked-in QR points at `expo-leads.html`.**~~ **FIXED IN PRODUCTION,
   with no re-render.** `/expo-leads.html` now 307s to
   `/g?a=sixfilms&src=booth_tv&p=streamstage&s=tv`; `?staff=1` still serves the real form with its
   passcode export, because the kiosk opens it for the operator (`kiosk.js:123`). Verified against
   the live site after deploy, not just locally. Commit `9f83ebb`. The detail below is kept
   because it is why the fix exists.

   **The original finding.**
   **RE-VERIFIED 2026-08-07, and it is worse than "wrong page".** 60 frames sampled across the
   film (1 per 3 s, the local file byte-identical to the one on the stick, 92,837,907 B): the QR
   decodes to `https://streamstage.live/expo-leads.html` in **all 60** — it is on screen for the
   whole 177 s. Both destinations are live (200), but:
   - `/g` carries `a=sixfilms`, which is what the route's autoresponder reads to actually SEND the
     six films. `expo-leads.html` carries nothing, so **a visitor who scans the TV never receives
     the films they were promised.**
   - `expo-leads.html` also marks **name as required** — the very field the booth deliberately
     stopped demanding.
   - Every one of the 20 *generated* booth QRs is correct (decoded: all go to `/g` with the right
     `a=`/`src=`/`p=`/`s=`). Only the baked-in one is wrong.
   **DANIEL'S CALL, three options:** (a) re-render the film with the right QR — accurate, hours of
   render, and a chunked render is already occupying the box; (b) redirect `/expo-leads.html` →
   `/g?a=sixfilms&src=booth_tv&p=streamstage&s=tv` — one line, fixes every baked and printed
   artefact at once, but changes that page for its other users (it is the fuller form, with the
   passcode field); (c) leave it and accept that TV scans get the long form and no films.

8. **Deck QRs (D2) — DONE. The D4 handout — still yours.**
   All five of talk 1's QRs were decoded, regenerated and decoded back:
   - `qr-checklist.svg` → `/g?a=checklist&src=talk1&p=slide21` (was ungated `/checklist`)
   - `qr-videographer.svg` → `/g?a=videographer&src=talk1&p=slide25` (was an ungated `#anchor`)
   - `qr-book.svg`, `qr-studiosage.svg` → destinations unchanged, now carry `src=talk1&p=slide21`
   - `qr-checklist-FALLBACK.svg` → still ungated **on purpose**; it is the rescue when `/g` cannot
     be reached in the room. Tagged only.
   `a=checklist` and `a=videographer` are real keys in `lead-assets.ts`; rendered in a browser they
   display "Recital video checklist" and "Videographer brief". Four of the five carried no
   attribution at all, so a scan from the room was uncountable. StudioSage commit `e3272e0`.
   **D4 handout QRs: VERIFIED CORRECT 2026-08-08** — decoded straight from the inline SVG path
   data (no renderer, so what was read is what prints): the videographer brief carries
   `/g?a=videographer&src=handout&p=print` and the interview sheet `/g?a=interviews&src=handout&p=print`.
   Both 200; both `a=` keys real in `lead-assets.ts`. Decoder kept at `/tmp/booth-shots/decode_inline_qr.py`.
   **Left alone:** the handout artefact's own wording, and one mismatch worth knowing —
   slide 21 still prints `streamstage.live/checklist` as readable text 6 times and
   `streamstage.live/book` 4 times. Those remain ungated, so a reader who types the URL bypasses
   the gate the QR now enforces. Changing slide copy is a content decision, not mine.

9. **The operator-only film still leads the visitor-facing attract reel.** `Playlist.kt` puts
   `streamstage-services.mp4` first as the "who we are" film, so it plays to visitors on the loop
   even though only the phone may *cut* to it. That reads as deliberate — **DANIEL to confirm it
   is what he wants.**

---

## Lead plumbing, non-blocking

10. ~~**The tablet browser's own offline lead queue has never been drained.**~~ **TESTED — and the
    claim was wrong.** It does NOT need the visitor to reopen the page: `LeadQueue` runs
    `setInterval(flush, 5000)`. Driven through the real gate on an isolated local kiosk (never
    DART): with the server refusing connections the lead sat in `localStorage` (queue=1, nothing
    on disk); with the server restored and **the page never reloaded and never touched again**,
    the queue drained to 0 and the lead reached disk verbatim within 15 s.

11. ~~**Booth leads are mislabelled in attribution.**~~ **STALE — the premise is false.**
    `booth_tablet` IS in `VALID_SOURCES` on both sides: `expo-leads/route.ts:18` and StudioSage's
    `api/leads/route.ts:29`. Confirmed at the destination, not by reading code alone — the row
    written tonight reads `source = booth_tablet`, not `expo_form`.

12. ~~**Four fabricated leads reached the live inbox and possibly the database.**~~ **DONE.**
    There was **one** row, not four — the four emails collapsed to a single row, which is item 13's
    merge-on-email behaviour observed rather than argued. Backed up to
    `scratchpad/deleted-fabricated-leads.json`, then deleted; absence confirmed two ways
    (`email=eq.…` and `studio=ilike.*Bright*`, both empty).
    ~~**Still in the DB and NOT removed**~~ **BOTH DELETED 2026-08-08** by StreamStage-4:
    `a@b.ca` / "Test Studio" and the self-labelled `TEST — pre-Calgary verification` row. Backed up
    to `scratchpad/deleted-test-leads-2026-08-08.json` first; a re-query for `a@b.ca` / `%TEST%` /
    `%Bright%` now returns **0**. The emails already in
    the inbox are untouched — deleting mail is yours to do.

13. **StudioSage merges leads on email** — two proposals from one studio collapse to one row and
    the earlier notes are overwritten. Flagged in StudioSage's INBOX. **DANIEL's call.**

---

## Presenter / decks (Daniel's own machines)

14. ~~**DART's presenter server is serving a STALE deck.**~~ **DONE — both decks are current on
    DART and drivable by phone.** `talk2-deck.html` **32** slides, `talk1-deck.html` **27**,
    counted on DART. Talk 1's 35 referenced assets (209 MB) shipped too; all six of its videos
    answer 206 with range support. Both decks were loaded over the LAN and reported the right
    count with no stale alarm; a phone-shaped `/cmd` `next` advanced the deck and `prev` returned
    it. Reachable on the LAN **and** over Tailscale. `.12` is FIRMAMENT, not a second DART.

15. ~~**The presenter-notes fit fix is in the repo but DART runs the old process.**~~ **DONE** —
    DART now runs the current `presenter-server.py`, restarted.

    **Two real defects found while doing it:**
    - **`PRESENTER_PORT=8080` can never work.** `pick_port()` skips 8080/8081 unconditionally, so
      the request is refused by our own file, not by the OS — and the banner said "PORT 8080 WAS
      ALREADY IN USE", which sends a reader hunting a process that does not exist. The banner now
      says RESERVED, and `DART-SETUP.md`'s day-of checklist no longer instructs a state that
      cannot happen. **The presenter runs on 8090.**
    - **Both pre-made presenter QRs were dead.** Decoded: `:8080/remote` — a port nothing can
      bind. Renamed `DEAD-port8080-*`; replaced with decode-verified `:8090` PNGs, named so the
      server prints "scan this" next to the matching address.
    - A Windows Firewall rule ("StreamStage Presenter", python.exe, TCP 8080/8083/8090, all
      profiles) was added — without it the server listened and every phone request timed out,
      because a headless start never shows §3's prompt.
    **Not verified:** the physical Pixel driving it, and the cellular path rather than the LAN.

---

## Awaiting Daniel — content decisions

16. **Ten-and-ten picks.** `docs/five-and-five-2026-08-07.md` was delivered and DM'd; no numbers
    chosen.
17. **Reflect's tagline** is beat 16 of its own VO script verbatim, never confirmed.
18. **The CompSync signup URL is still an assumption** (`compsync.net`), flagged in the operator
    sheet and README, never confirmed.

---

## Environment facts that keep biting — not items, just don't re-derive them

- **SPYBALLOON's INPUT policy is DROP.** Devices cannot reach a server on that box over the LAN.
  Serve the booth from DART, or use `adb reverse` and know it is a scaffold.
- **DART runs on Eastern**, so its lead files are named `leads-<yesterday>.jsonl` relative to
  SPYBALLOON's UTC clock.
- Three stray kiosk servers from earlier sessions were beaconing on the LAN and stealing device
  discovery. All stopped. If devices drift to the wrong kiosk again, look for those first.
- This bench stick has **no remote paired**, so Fire OS throws a "We cannot detect your remote"
  dialog after every boot. Not an app bug.
- **Do not harden `kiosk-app`'s `network_security_config.xml` back to loopback-only.** That was
  the bug that stopped the tablet driving the stick at all.

---

# COORDINATED STATE — 2026-08-08, three windows, one ledger

Daniel asked the StreamStage windows to agree a lead and drive this to zero. **StreamStage-5 leads**
(agreed by StreamStage-3 and StreamStage-4); this file is the single source of truth. Standing rule
while three sessions share one repo three days out: **nobody touches the Fire Stick, the Fire
tablet, DART, R2 or the decks without saying so on the collab channel first.**

## Closed since the list above was written

- **Item 5, ON-DEVICE half — DONE (StreamStage-4).** Ran the whole chain on the real stick against a
  LOCAL manifest v3 over `adb reverse` (the loopback branch `localOverride` allows), with a film
  byte-identical to the live one so booth content could not change. Hash gate passed, deferred
  install swapped it in, `installed.json` recorded it as manifest-sourced, it PLAYED, and the reel
  stayed 7 films with no duplicate. Cleaned up after; zero-touch boot re-confirmed intact.
  **The production bucket was never touched.**
- **Item G — DONE (StreamStage-4), verified by StreamStage-5.** `a@b.ca` / "Test Studio" and the
  `TEST — ignore this row` row backed up then deleted. Re-checked four ways from this window
  (`a@b.ca`, `studio ilike TEST`, `studio ilike Bright`, `name ilike TEST`) — **0 rows each.**
- **Item E — effectively closed.** The D4 handout QRs were already correct; decoded from the inline
  SVG path data (what prints, not what a renderer guesses):
  `handout-videographer-brief.html` → `/g?a=videographer&src=handout&p=print`, and
  `handout-interview-questions.html` → `/g?a=interviews&src=handout&p=print`. Both 200, both `a=`
  keys real.
- **The `/events` emergency channel — NOT outstanding.** StreamStage-3 flagged a 14 MB `/events`
  killing `sethost`/`rediscover`/`reload`/`diag` at the venue. Measured on DART: **8,652 bytes, 46
  entries, valid JSON, 18 ms**, and the running `serve.py` already has `MAX_EVENTS_BYTES = 320*1024`,
  the `/applog` split and `?since=`. The fix landed and is deployed.
- **`flush-leads.py` strictness — closed.** Production is at `2a4e497`, which contains `431742a`, so
  the route returns `forwarded` and the flusher's strict branch is the one that runs.
- **Full booth suite — 44 passed, 0 failed, 2 skipped** (`DART=192.168.0.13 ./tests/e2e-booth.sh`).
  All 7 R2 films serve; repo == publish-set for all 7; all 7 decode; the stick has 7 films matching
  the published set with a clean staging dir; presenter reports a shipping deck count, so the
  stale-deck alarm is silent. The 2 skips are the tablet and phone not being on adb.

## STILL OPEN — and every one of these is now a decision or a blocked-on-hardware, not unknown work

**DANIEL'S CALL:**
1. **The 21 uncommitted files.** Ownership settled: `tablet-app/` (5) and `phone-app/` (7) are
   StreamStage-3's, hardware-verified, and it is committing them now. **`kiosk-app/` (6 + new
   `FilmVersions.kt` + `docs/`) is 1,602 insertions of a STOPPED agent's partial work, written
   BEFORE `e6dfa99`/`378ea3e`/`5193cc0` landed** — committing it as-is risks clobbering the fixes
   that made the stick work. StreamStage-3 recommends discarding and redoing versioned filenames
   deliberately after the show. **Held in place, untouched, pending your answer.**
2. **The re-rendered StreamStage film** (StreamStage-3, 8 chunks done, audio mux finishing). It
   carries two things you asked for by name — the defocused tile wall and the gold oval speaker
   portrait — plus a QR repoint that your production 307 has since made redundant. Caveat measured
   during the render: the longer gated URL **costs QR defocus margin** (fails at Gaussian σ=1.8
   where the old one read). Ship it to the stick, or leave the current film?
3. **Slide 21 still PRINTS `streamstage.live/checklist` (6×) and `/book` (4×)** as readable text,
   bypassing the gate its QR now enforces.
4. **Items 13, 16, 17, 18** — StudioSage merge-on-email, ten-and-ten picks, Reflect's tagline, the
   CompSync signup URL.

**BLOCKED ON HARDWARE:**
5. **The Pixel is PIN-locked** and `wm dismiss-keyguard` will not open it, so the phone console and
   the **cellular** presenter path stay unverified. Needs you to unlock it once.
6. **The Fire tablet is off the network** (`192.168.0.11` — no route to host). The tablet
   double-flash fix is deployed to DART but needs a page reload and a real thumb on "back". Also
   worth checking: a synthetic click on `#back` was intercepted by the card body at 1200×1900, so
   the hit target may be a near miss.

**NEW, FOUND WHILE COORDINATING:**
7. **A stale ExoPlayer is prepared when a `play` lands right after a version swap.**
   `IllegalStateException: sending message to a Handler on a dead thread` at
   `ExoPlayerImpl.prepare` ← `BoothLoopActivity.obey()` (`p.prepare()`, BoothLoopActivity.kt:281).
   Playback recovered, so it is a warning today — but it is on the booth's only playback path.
   NOT fixed: it is kiosk-app code, entangled with item 1 above.
8. **A dead TV keeps serving its last state for ~84 s.** `/state` on DART went on returning the old
   `tv` object — including a film list that no longer existed — while `/health` already read
   `hasTv:false`. Anything trusting `/state` alone (phone console, tablet badge) will show a
   confident, wrong picture of a screen that is gone. `health.hasTv` and `tvLastSeenMs` are the
   honest signals.
9. **The presenter on DART is not persistent.** It survives only while a session holds it; Task
   Scheduler would not run it cleanly, so the documented procedure is to double-click
   `start-presenter.bat` on DART and leave the window open.

## Content items — CHECKED 2026-08-08, three of the four dissolved

Daniel's instruction was to check these rather than ask cold. Results:

- **Slide 21's printed URLs — FALSE ALARM, nothing to fix.** I assumed `streamstage.live/checklist`
  printed as readable text bypassed the gate its QR now enforces. It does not: rendered live,
  `/checklist` shows the email gate (`#gemail`/`#gstudio`) with only "Open the checklist" behind it.
  `/book` has no gate, but it is a booking page, not a giveaway. **Struck.**
- **Item 18, the CompSync signup URL — ALREADY CLOSED, the ledger was stale.**
  `README-BOOTH.md:199` records "CompSync's signup URL **`compsync.net`** was confirmed by Daniel
  2026-08-07 — no longer an assumption", echoed in `tablet.html` and `index.html`. It resolves:
  `compsync.net` → 307 → `www.compsync.net` → 200. **Struck.**
- **Item 17, Reflect's tagline — VERIFIED as sourced, not invented.**
  `/mnt/data/reflect-video/out/VO-SCRIPT.md` beat 16 reads
  *"Reflect. The system that runs your studio's day — and remembers it."* The tile's tagline is that
  line verbatim. Nothing to check further; it needs only Daniel's yes/no on using it.
- **Item 13, StudioSage merge-on-email — REAL, and worse than recorded. Two distinct losses:**
  1. `notes: row.notes || existing.notes` — a second submission's notes **replace** the first. At
     the booth, notes carry "Film on screen: X", so a studio who comes back for a second film loses
     the first film's context.
  2. `.update({ ...row })` spreads every field, so a repeat capture with an **empty studio writes
     `studio: null`** — erasing a studio name already on the row. The operator's email-only capture
     has no studio, so flushing one after a gated capture wipes the studio the visitor typed.
  Interests are safely unioned; these two are not. Fix is ready and small (keep existing values when
  the incoming ones are empty; append notes with a separator instead of replacing). **Not applied —
  it is another project's live lead route and Daniel flagged it as his call.**


## Stick ground truth, re-measured by StreamStage-5 after all device work (2026-08-08 13:37 ET)

Not inherited — read off the device and the kiosk just now, per rule 9:
```
versionCode=3  versionName=1.1.1        app foreground: BoothLoopActivity
SYSTEM_ALERT_WINDOW: granted=true  AND  appops: allow   (both halves — install -r drops these)
7 films on disk, no versioned leftovers, no .update-base, .staging empty (0)
kiosk /state: streamstage-services playing, order=7 films, _stale=false
kiosk /health: hasTv=true
```
