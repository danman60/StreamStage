# Current Work - StreamStage

## 2026-08-26 11:24 ET, session wrap-up

### Last session summary
Campaign copy and assets finished on 2026-08-17 and shipped. Since then this window did video
delivery for StudioSage on 2026-08-24, and received one mis-routed broker message on 2026-08-24
night that was addressed to the sysadmin session and needed no action here.

### What changed
- `be091b1` `3cf3a5e` campaign copy: both email sequences, both caption banks, eight carousel decks,
 two print ready handouts, `/contentday` density pass, recital form cut from 7 fields to 3.
- `e0d4723` **wip, not this session's work.** Booth show build leftovers from the 2026-08-20 session
 that owned commits `c84e4d4` through `ea8b956`. Committed so nothing was lost. Includes
 `kiosk-app/.../show/LeadValidator.kt` and its test (task 07 ran to done, 88 turns, 0 errors, never
 committed), kiosk/phone/tablet app edits, expo asset updates, and the consumed queue task files.
- Not in git, delivered to the campaign folder on FIRMAMENT: `recital/cuts/services-kerry-alana-9x16.mp4`,
 five `contentday/cuts/*-9x16.mp4`, both handout PDFs and PNGs, `cold-tranche-01.csv`.
- `~/projects/sage-film/kiosk/studiosage-explainer-narrated-nocaptions.mp4`, built 2026-08-24, the
 Aug 18 clean plate muxed with the original narration, stream copied.

### Build status
Typecheck passing as of 2026-08-17 (`npx tsc --noEmit`, exit 0). **Not re-run since.** The wip
commit above contains Kotlin from another session that was never compiled here.

### Known bugs and issues
- A stray file literally named `ShowHealth.kt\n` (embedded newline) sits untracked in
 `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/`. It is the 08:22 runner artifact,
 1817 bytes, superseded by the real `ShowHealth.kt` at 08:28, 2096 bytes. Left in place on purpose.
 Whoever owns that build should delete it.
- `scratchpad/` is not gitignored and holds 40+ session screenshots and probe scripts. Left
 uncommitted.
- `NEXT_PUBLIC_APP_URL` on CommandCentered production is `https://commandcentered.vercel.app`, not
 `meet.streamstage.live`. Both resolve, so unsubscribe links work either way, but the links in
 automated marketing email carry the vercel.app host.

### Incomplete work
- Carousel decks are specified slide by slide in `docs/campaigns/carousel-decks.md`. They are not
 designed as images.
- No honest source for "dates remaining" on the recital page. `events.created_at` is the row date,
 not the show date.
- Client and warm segments cannot be filtered by region: 3 of 105 clients carry a non-blank city.
 The cold list can be, 351 of 355.

### Tests
- Last verification 2026-08-17: browser density measurements on `/recitals` and `/contentday` at
 390x844 and 1440x900, screenshots read, `npx tsc --noEmit` clean.
- Unsubscribe path proven end to end against production: token minted, link opened, page confirmed,
 suppression row written, token consumed. Re-checked 2026-08-26, `/u/<token>` still returns 200.
- Untested since: everything in the `e0d4723` wip commit.

### Next steps, priority order
1. **Daniel reads and edits the six email drafts, then sends the first cold tranche.** Copy is in
  `docs/campaigns/recital-email-sequence.md` and `contentday-email-sequence.md`. Tranche 01 is
  minted at `/mnt/firmament/StreamStageCampaigns/cold-tranche-01.csv`.
2. Queue rotation week 1 on the social accounts. Both rotations are 8 of 8 slots with files.
3. Decide what "local" means, or backfill client cities so the client and warm segments can be
  filtered.
4. Whoever owns the booth show build: compile and test what landed in `e0d4723`, and clear the
  stray newline file.

### Gotchas for next session
- **Never open an unsubscribe URL from a tranche CSV to test it. Opening it IS the unsubscribe.**
 That happened on 2026-08-17 and suppressed `info@danceshala.com`, a real lead. The row was deleted
 and a fresh token minted. The warning is in the script header.
- Never post the five `example-*.mp4` clips. They are other accounts' posts.
- `promo-kmsd-full` opens on a countdown and a title card reading June 6th 2026. The cut in
 `contentday/cuts/` starts at 11.5s for that reason.
- The StudioSage explainer has exactly one narrated master, md5 `b711a683`, from 2026-08-07. The
 Aug 18 re-renders are silent. If a newer narrated master exists it is on FIRMAMENT, not here.
- Broker queue rows in this repo's window are not this session's. Verified 2026-08-24: zero rows
 carry a StreamStage `origin_session`. A message about pinned uvalux GPUs was addressed to sysadmin
 and landed here.
- Deploys are gated. Pushing `main` deploys, and that has been used deliberately.

### Files touched this session
`CURRENT_WORK.md`, plus the 39 files in `e0d4723` which came from the 2026-08-20 booth session, not
from here. Campaign files from 2026-08-17 are already committed in `3cf3a5e` and `be091b1`.

---

## 2026-08-17 18:20 ET — campaign is sendable. Copy written, both rotations complete, all deployed.

Daniel's five decisions, applied everywhere: keep the revenue reframe and never explain the
plumbing (Laura Ramsey's direct billing line retired from campaign use) · deploy yes · paid parked
until copy and assets are done · no guarantee · recital form cut from 7 fields to 3.

**Pushed and live:** StreamStage `3cf3a5e`, CommandCentered `aa7ae74`.

Written this session, all in `docs/campaigns/`: `recital-email-sequence.md` (3 touches by 3 arms),
`contentday-email-sequence.md`, `recital-captions.md` and `contentday-captions.md` (16 slots each),
`carousel-decks.md` (8 decks, slide by slide), and two print ready handouts that the week 3 story
slots referenced and that did not exist.

**Both rotations are now 8 of 8 reel slots.** Five content day cuts built into
`contentday/cuts/`. The kmsd cut starts at 11.5s because the original opens on a countdown and a
title card reading June 6th 2026.

**Cold email is unblocked and verified.** The endpoint was never missing, it 404'd because
CommandCentered's ticket URL rewrite swallowed `/u/<token>`. Fixed, deployed, and proven end to end
against production. Tranche 01 (30 leads) is minted at
`/mnt/firmament/StreamStageCampaigns/cold-tranche-01.csv`.

**Mistake worth remembering:** spot checking a minted link with curl suppressed a real lead,
`info@danceshala.com`, because opening the link IS the unsubscribe. Row deleted, fresh token minted,
CSV updated, warning added to the script header.

**Review page:** `C:\Users\danie\Desktop\CAMPAIGN-REVIEW.html` on FIRMAMENT, current as of this
session.

**Left for Daniel:** read and edit the six emails, queue rotation week 1, decide what local means
(cold list is filterable, clients are not, 3 of 105 carry a city), unpark paid when he wants it.

## 2026-08-17 15:45 ET — campaign open items. Four worked, one blocked on Daniel.

Plan: `docs/plans/2026-08-17-campaign-open-items.md`. Commit `11ac98b` here, `ffa48e7` in
CommandCentered. **Neither is pushed. Deploys are gated on Daniel.**

- **Playbooks moved** out of the deprecated amplify repo into `docs/campaigns/`. Amplify copies
  carry a dead banner. `ASSET-MANIFEST.md` stays at `/mnt/firmament/StreamStageCampaigns/`.
- **Landing density.** Re-measured rather than inherited: `/recitals` was 165 words per screen on
  desktop and 85 on mobile, not the 172 flat figure that was carried in. Now 97 desktop, 70 mobile
  against the 64 to 104 band. `/recitals-b` untouched at 34 and 28.
- **Week 2 Reel A built**: `recital/cuts/services-kerry-alana-9x16.mp4`, 27s, Kerry Moore then
  Alana Colver. Crop window documented in the manifest. The Laura Ramsey passage is deliberately
  excluded because it states the contested revenue mechanic on camera.
- **The same booth composite was live on `/recitals`** carrying a booth QR and a dated CALGARY
  DANCE TEACHER EXPO AUGUST 11-12 2026 panel. Recut to a clean 4:5 window and the copy under it
  now names only the two directors who actually appear.
- **Cold email arm: found the real blocker.** The unsubscribe endpoint, token model, suppression
  checks and footer injection all already existed. What is broken is that `/u/<token>` 404s in
  production, because the clean ticket URL rewrite in CommandCentered's `next.config.ts` sends it
  to `/tickets/u/<token>`. Patched, not yet verified, because verifying needs a deploy.
  `app/scripts/mint-unsubscribe-tranche.ts` mints tokens per tranche for the hand-sent arm.
  Live DB state at the time of writing: 0 tokens, 1 suppression, 349 `new` leads on the cold list.
- **Waiting on Daniel:** revenue mechanics (Laura's "money goes direct, comes off my bill" versus
  the calculator's "client retains all revenue"), the deploy go for both repos, and the paid ads
  account, budget and audiences.
- **Item 2, what counts as local:** clients cannot be filtered, 3 of 105 have a non-blank city.
  The cold list can: 351 of 355 carry a city, all Ontario, and the top cities are Hamilton 48,
  London 45, Toronto 41, Kitchener 32. It is a southern Ontario list, not a KWC list.

## 2026-08-13 14:25 ET — /fresh. Expo Exhibitor App spec is DONE and ready for Fable to plan.

**Reason for refresh:** long session — Calgary day 3 (landscape follower fix, gate/QR fix on the
booth tablet), then the whole Expo Exhibitor App scoping and spec write. Context is heavy.

### Active task at refresh
Nothing in flight. The spec is finished, committed and pushed. **Fable is going to turn it into an
implementation plan and design the UX.** Do not start building — that is Fable's job.

### The deliverable
`docs/superpowers/specs/2026-08-12-expo-exhibitor-app-design.md` — 488 lines, 12 sections.
It is the successor to `docs/plans/2026-08-07-tradeshow-toolkit.md`, which specified the SAME
product five days earlier from Daniel's own words ("omnipresence", "an easy way to update
semantically via LLM"). That plan's phases, reuse map and constraints are carried forward.

Contents: what already exists (do not rebuild) · boundaries agreed with ASSISTANT + CommandCentered ·
architecture · data model with the lead contract inlined · v1 scope + **13 acceptance criteria** ·
deck-as-data · 10 inherited constraints · open questions · the 20 five-and-five items placed ·
5 patterns the exercise surfaced · the Electron control centre · **§12 the six surfaces, written
for whoever designs the UX**.

### Shipped this session (all verified, all pushed)
- `bc52da5` **live follower fills the phone in landscape** — the status bar was stacked above the
  stage, stealing 46px of height which costs 82px of width on a 16/9 box. Now floats over the slide:
  612x344 -> 693x390 on an 844x390 phone, edge to edge at 667x375. Measured in a real browser.
- `f620e68` **booth tablet: the product QR stays up for the whole film, and the gate remembers a
  person for 5 minutes.** The 30s ceiling predated the card having a QR on it; `visitorMemoryMs`
  (300000) is now its own number, separate from the tablet still going home at 90s. Verified against
  a real `serve.py` bus with `--no-flush` (confirmed `leadFlush.enabled:false` from /health).
  **NOTE: the Fire Stick needs an APK rebuild + reinstall to get this** — `stageTabletSurface` copies
  `expo-assets/kiosk/tablet.html` into the APK at build time. DART only needs a reload.
- `b4b2693` `711285d` `30186bf` `aee17a6` `e350848` — the spec, in five passes.
- `docs/five-and-five-2026-08-13.md` — 10 killer features + 10 streamlines, all placed in the spec.
- `docs/expo-app-ideas.md` — the parked attract-game idea, now with the dancer-focus correction and
  the touch-surface decision.

### Decisions locked with Daniel (do not re-litigate)
- Internal tool now, product-shaped boundaries for later.
- v1 = spine + leads-with-notes. `commandcentered.leads` is the ONE record of a person; the Fire
  Stick is an event-time **capture buffer that hands off**, never a second lead database.
- Note capture = hold-to-talk voice memo on the phone. Separate-recorder (Rode) ingest is in scope.
- **Consent: his lapel only. No booth mic.**
- Campaign spans events; a **show** is the run inside it. Stored as `booth_campaign` because
  CommandCentered's `Campaign` is an email drip sequence and its `Event` is a production job.
- LLM deck editing: declarative content file -> phone-driven instructions -> generation, in that order.
- Controller stays a **WebView wrapper** (preserves 87-91ms tap-to-frame, portrait-first layout).
- Electron control centre: **fresh app**, not built on CompSyncElectronApp. Authoritative for
  anything staged and pushed; NEVER for anything captured in the moment.
- Attract game: surface-agnostic, ships on the tablet already carried; rent a panel for one show
  only if it proves it stops traffic. Format deliberately undecided.

### Blocked on someone else
- **CommandCentered** — `app/src/app/api/webhook/lead-intake/route.ts` is the bridge destination and
  already dedupes by `{tenantId, email}`, but it (a) REQUIRES `organization` + `contactName`, which
  booth leads do not have (one email box), and (b) has nowhere to put `captured_at`, `channel`,
  `consent`, `is_test`, `staff_note`. Asked in `CommandCentered/INBOX.md`, `Status: OPEN`.
  The relay had auto-cleaned that session after ~20h idle, so the collab message did NOT deliver —
  the INBOX.md post is the live request.
- **Daniel** — the audio retention PERIOD (everything else about retention is assumed and written).

### Next steps
1. Fable turns the spec into an implementation plan. Nothing gets built before that.
2. Fire Stick APK rebuild + reinstall so the booth gets the gate/QR fix.
3. Still open from Calgary, both with people waiting: **how the prize draw entries were collected**
   (zero of 41 lead emails mention a prize/draw/winner, and the winner was owed to the organiser by
   4:00 PM Wed), and the PA's **five magic-link resends** (Brenda's, The SPACE Sunrise, Studio South,
   Dexterity, Ignite) plus the **Runway meeting Friday 10:00** with the exclusivity call behind it.

---

## 2026-08-12 11:10 ET — /fresh. TALK 1 IS AT 10:50 MDT (12:50 ET).

Talk 1 was delivered. The public follower at `streamstage.live/live` ran the whole talk over
`deck -> /api/live -> R2 -> phones` with zero failures. 41 expo lead emails since Aug 9 (26 real,
15 tablet tests) are in `daniel@streamstageproductions.com`; the 22 real CRM leads reached the PA
as a raw dump and are live in CommandCentered's Calgary debrief build
(Actions 28 / People 41 / Brief / Transcripts 22).

### Still true from that session
- On "go": read `https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev/live/talk1/state.json?t=<epoch>`
  and report slide / fragment / film / write age.
- `live-relay.py` and `live-receive.py` are RETIRED and stopped. Do not restart them.
- The deck must be SERVED, not opened from `file://` — `fetch('live-token.txt')` fails there.
- Calgary expo transcription belongs to window `CommandCentered`, not here.
