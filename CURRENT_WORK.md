# Current Work - StreamStage

## 2026-08-10 16:5x ET — THE FACELIFT REVEAL BUG IS FOUND AND FIXED. TALK 1 SLIDE 1 IS BUILT.
**Daniel must RELOAD both deck tabs — the fixes are in the HTML, not the server.**

### Why the reveal opened on a StreamStage site (root cause, measured, not inferred)
`local_url` is the **same string for every run** (`/facelift-site/index.html`). The reveal's own
reload guard — `if(rf.dataset.src!==src)` — therefore fired **once per page load and never
again**, so a deck tab opened while an older build was `ready` kept that build behind the curtain
after a new one replaced the file on disk. The site Daniel saw is now archived on DART as
`facelift-out\site-prev-1786391728` — title *"StreamStage — Where Stage Meets Technology"*,
built 08-09 11:53. Today's run archived it at 15:55:28 and finished Decidedly Jazz at 16:06:47.
**Fix (`4a35a0e`, deployed to DART):** the reveal src carries the run id, so a new run changes the
URL, reloads the iframe and defeats the HTTP cache.
**Proved three ways:** the shipped deck FAILS a same-local_url/new-build harness (stale site stayed);
the fixed deck PASSES it; and the real deck fetched from DART loads
`/facelift-site/index.html?r=facelift-1786391728` → *Decidedly Jazz Danceworks*, chip `READY · BUILT LIVE`.
Note `status.json` on DART still carries `url: streamstageproductions.com` from the headless
session — harmless now, `presenter-run.json` overrides it, but that is why the plant card was wrong.

### Talk 1 slide 1 — the kiosk video wall (StudioSage `7feb653`, deployed to DART)
Bed is now `videos/kiosk-testimonials.mp4` (181s, already on DART since 07-27): the wall of studio
clips drifting past **with real director testimonials in it** — no testimonial was invented. The
film's own burned-in words (caption tag, DIRECTOR TESTIMONIAL lower third, RECITAL FILMS strip,
booth QR) all landed under the title raw, so it is zoomed past the top/bottom strips, softened so
its small type stops reading as text, and scrimmed left + bottom-right. Checked at 12/42/96/150s
of the loop and on DART: 27 slides, playing, 0 page errors, 0 failed requests.

### Not mine this session
The demo knowledge base is being handled by another window. Daniel's standing instruction:
**no seeded data at all** — the KB is seeded live from a volunteer in the audience, so
`{"seeds":true}` (restores 15) is the WRONG reset. `demo-reset` with no body only deletes
*ingested* rows and would leave all 16 in place; emptying the KB needs a delete of
`knowledge_base` where `studio_id = 'studio_0012'`. Preflight's `kb_seeds` check still demands
10+ seeds and will read red against an empty KB.

## 2026-08-10 16:10 ET — SESSION REFRESHED MID-REHEARSAL. Daniel lost practice time. READ THIS.

### THE ONE THING THE NEXT SESSION MUST DO FIRST
**Rebuild the phone APK with a launch-time mode picker.** `StreamStage/phone-app/`,
applicationId `com.streamstage.phonepresenter`, package `com.streamstage.phonetoolkit`.
It currently **restores its last mode on boot** and that mode is KIOSK, so it comes up
sweeping the LAN for a kiosk that is not running, and the deck remote is unreachable behind
that sweep. Daniel, verbatim: *"we need the phone apk updated to pick kiosk or deck"* and
*"FIX THE FUCKING PHONE APK I CANT PRACTICE"*.

What it needs: on launch, **ask** — DECK or KIOSK — plus a manual host field, and never start a
blocking discovery sweep the operator did not ask for. The debug bridge
(`com.streamstage.phonetoolkit.DEBUG`, `setmode` / `sethost`) works on the installed debug build
and is how I drove it, but broadcasts lose the race against the sweep, so this must be fixed in
the app, not from adb.

Two facts that will save time:
- **A stopped app cannot receive broadcasts.** `am force-stop` then `am broadcast` does nothing.
  Launch first, then broadcast (`-f 32` for stopped packages).
- **The phone and DART are on different /24s** on hotel wifi (phone `172.20.1.83`, DART
  `172.20.6.122`), so the app's own-/24 sweep can never find DART even with isolation off.
  The Tailscale address is the only reliable one: **`100.90.103.121:8090`**.

### What is TRUE on DART right now (verified, this session)
- Presenter restarted, PID 10208, answering 200. Serving **talk 2 = 32 slides**, talk 1 = 27.
- **Slide 5's broken window is FIXED and deployed** — the iframe is gone entirely, replaced by a
  state card (WAITING before a url → tick + address after). Verified in the served HTML.
  **Daniel must RELOAD the deck tab to see it.**
- **The facelift for `decidedlyjazz.com` BUILT SUCCESSFULLY** and `/facelift` now reports
  `status: ready, url: https://decidedlyjazz.com, local_url: /facelift-site/index.html`.
- Folder cleaned 52 → 29 files, everything else in `_archive\`. Two launchers:
  `1 - START THE TALKS.bat` (presenter + Chrome tabs, prints its own live IPs) and
  `2 - START THE BOOTH.bat`. Shortcut on the **OneDrive desktop**.

### The facelift URL bug — root-caused and patched, deployed
Daniel typed `decidedlyjazz.com`; the deck showed `streamstageproductions.com`. The runner was
given the RIGHT url (proved from the live process args). `facelift-out/status.json` has **two
writers**, and the headless facelift session's write carries its own `url` and `started_at`,
clobbering the presenter's. The old guard only defended `status`, not `url`.
**Fix (deployed):** `presenter-server.py` now writes `facelift-out/presenter-run.json` at
dispatch — a file the runner never opens — and that record WINS for url/started_at/session.
A `reset` clears both.

### NOT DONE — Daniel asked and it was never built
**Talk 1 slide 1 was never changed to the kiosk multi-panel video.** He asked at 15:33:
*"make the starting slide a version of our kiosk video with all the videos swirling around and
testimonial; ADD the slide title to it"*. I investigated the asset and never came back to it.
The asset exists: `expo-assets/kiosk/menu-loop/menu-loop.mp4` — 6.4 MB, 30s, six product panels
with a highlight cascading between them (frame checked). It is NOT yet in
`StudioSage/live-demo/` or on DART. Talk 1 slide 1 currently uses `videos/promo-kmsd.mp4`.

### Where I misled him, so it does not repeat
- I opened this session repeating **"44 pass / 0 fail"** and **"PREFLIGHT PASSED"** from 08-08/08-09
  as if they were current. They were inherited claims. I never re-ran them.
- I let *"the presenter page answers"* stand in for *"the phone app works"*. They are different
  things. The app was never tested end to end before he picked it up.
- Today's preflight returns `facelift: pass`, which only checks staleness. It has **no check that
  the URL being built is the URL that was typed** — the thing that actually broke.

### Reason for refresh
Daniel called it: context rot, and I burned his rehearsal window on the phone instead of
rebuilding the APK.

---

## 2026-08-10 08:5x ET — TALK 2 FIX LIST FROM DANIEL'S NOTES. Deck is 32 slides, audited, pushed.

All eight items from his notes are done. Audited at 1920x1080: **32 slides, 0 overflow,
0 media problems, 0 failed requests, no deck console errors.** Screenshots DM'd.

### The running order changed at the front
```
1  Title / Open            (robot wall now plays on load)
2  Confidently Wrong       <- was 15. The AI primer.
3  101: What Do I Use It For?   <- RESTORED from cd5496c^ (the 38-slide deck)
4  Where AI Should NOT Replace You  <- was 16
5  The Front Desk Job -> You Pushed It   (was 3; lavender + Roomba clicks)
...
```
**The Oprah / Anthropic cold-open slide was CUT** at his instruction. It was the slide the
deck called "THE REAL COLD OPEN" (what he actually opened with in Toronto), so slide 1's
note and beats were rewritten to stop pointing at it. Markup is intact in git — one word
brings it back.

### Every change
1. **The robot wall never played.** It only existed behind a **G** press: `on()` was called
   from the keydown handler and nowhere else, so opening the deck showed a static title.
   The wall is a real asset — `robot-wall.mp4`, 46s, 1920x1080, three columns of dancing
   robots, committed. It now **arms on load** (muted+loop+playsinline = autoplay allowed) and
   logs a warning if autoplay is ever refused. Every kill path is unchanged: first advance,
   first click, G toggles. It still cannot return on its own mid-talk.
2. **Slide 2 (Oprah) cut**, per above.
3. **Slide 5 roles arc — two new clicks.** Lavender highlight (`--lav`) lands on *Business
   owner* + *Customer support* with a "the ones it can take" tag; then the *Janitor* card
   turns into a rotating **Roomba** (drawn SVG, not a photo) tagged "already handled." The
   beat is the permission slip: that job was automated in their own house and nobody minded.
   Front desk / under-line / push-pull shifted to frags 5/6/7.
4. **Slide 9 (Tip 1) overlap fixed.** The floating `.speech` bubble was pinned at
   `left:-390px; top:-150px` — across the top of the left column, hiding the end of the
   Kleenex line — **and it was a word-for-word duplicate of the phone's first frag.** Deleted.
   Also tightened the two trailing paragraphs, which ran under the MONDAY bar at full clicks.
5. **Matrix restored and refitted.** At today's type scale its last line fell off the bottom
   edge; `.m6` tightened. Tip 1's note no longer calls the matrix a thing that was cut.
6. **Slide 26 red box removed** — "WHAT IT CAN'T DO / not scoped to one dancer". It is now a
   **presenter beat held in reserve**: answer instantly if asked, never volunteer it. On
   screen, in red, it was a warning label two seconds before asking the room to text in.

### Answered: the phone presenter could not see DART at the airport
**Client isolation on the public AP**, not a bug. Public SSIDs segment every client; nothing
in the app can defeat it, and the UDP beacon dies there too. Written up in
`BOOTH-SYSTEM.md` §2 with the fix order: **phone hotspot** (own AP, no isolation, needs no
internet — the right answer at the booth) → Tailscale (works anywhere, needs internet) →
USB tether. Assume every venue/hotel/airport SSID has it on.

### Still open from his notes
- **Roomba art is drawn, not a real Roomba.** Swap is a two-minute change once an image
  exists; generating one on the GPU is ~15-25 min. His call.
- The talk-2 **citation line** (slide 13 claim vs. SMS carrying no citation) is still
  unresolved — untouched by this pass.

---

## 2026-08-10 07:40 ET — SESSION REFRESHED. Everything is deployed, pushed and verified.
**Daniel flies TODAY, Mon Aug 10 09:00. Talk 2 Tue 09:20. Talk 1 Wed 10:50.**
Head commit `4d6fa7d`. Working tree clean apart from `scratchpad/` screenshots.

### Hardware state at refresh
- **Fire Stick: PACKED.** versionCode 3, 8 films on disk (7 current + the old StreamStage cut
  kept as the rollback copy), staging empty, app force-stopped, adb disconnected.
  **Both halves of SYSTEM_ALERT_WINDOW survived** (`granted=true` AND appops `allow`) — that
  pair is what makes the reel own the screen at power-on with nobody touching a remote.
  `install -r` drops both; re-grant if the APK is ever reinstalled.
- **DART: still on, still on this LAN overnight**, at `192.168.0.11`. Kiosk 8081, telemetry
  8082, presenter 8090. Everything from 08-09 is deployed to it and verified ON it.
- Pixel reachable at `100.105.85.103:46613` (Tailscale adb) — Daniel is USING the phone, so
  read-only checks only, never launch an app on it.

### Verified against DART itself (not simulated)
- `tests/e2e-booth.sh` → **44 pass / 0 fail / 2 skip**.
- `BOOTH_HOST=192.168.0.11 tests/preflight.sh` → **PREFLIGHT PASSED**.
- Both decks walked over the LAN: talk2 **32 slides**, talk1 **27**, zero overflow, zero failed
  media, no page errors.
- Menu reel composited with the booth chrome — no collisions. Screenshot DM'd.

### Fixed tonight, after the last entry
1. **The menu reel was 17 SECONDS OF BLACK SCREEN on DART** (worked here, failed there).
   Not the file, not the server — 6.4 MB downloads in 0.88s. It is the browser's ~6 connections
   per host: the TV page holds seven film videos plus an EventSource, so a reel loaded on demand
   queued behind all of them. Same trap that once wrote 15 films' telemetry as 0 events. It now
   **warms in the background** once the films report ready (12s cap so films keep priority).
   Re-measured on DART: **255 ms**. Do not make it lazy again.
2. **`booth-lan.sh` assumed port 8080 when `BOOTH_HOST` was passed by hand.** START-BOOTH.bat
   runs the kiosk on **8081**, so preflight declared a healthy booth DEAD and printed `:8080`
   addresses to open on the tablet. It now probes 8081/8080/8082-8085 via `/health`.
3. **The booth films are NOT a giveaway** (Daniel's correction). Four places promised them —
   worst was the QR burned into the StreamStage film, on screen 3 minutes at a time. All four
   repointed at the recital video checklist: `next.config.ts` 307, the six tablet QRs
   (regenerated AND decoded with OpenCV, independent of the generator), `tablet.html` copy
   ("Filming your recital?"), and `flush-leads.py`. The `sixfilms` asset and the `/films` page
   are deleted.
4. **Lead auto-send is ON at the booth.** Both DART launchers had `--no-flush`, which meant a
   captured lead would sit on disk forever. Removed from START-BOOTH.bat and the Startup-folder
   `booth-kiosk.bat`. `/health` now reports the live endpoint.
5. **DART's own film copy was the old 92.8 MB cut** — the stick had the new one, DART did not,
   so a browser-TV fallback would have played the old film. Copied; both now byte-identical at
   196,922,647.
6. **The beacon is CONFIRMED** — heard from the Pixel (the one device not behind this laptop's
   INPUT DROP): right host, right port 8081, all seven films. That item had been "unconfirmed,
   not proven" for days.

### SECOND lead incident — read this before touching flush settings
Enabling auto-flush made the kiosk immediately send the **2 leads already queued on DART's
disk** from 08-08 bench testing (`ff@ff.com`/"Fff", `ksks@msks.com`/"Kxdk"). They reached
production. Backed up to `scratchpad/deleted-dart-bench-leads-2026-08-09.json`, deleted,
absence confirmed three ways, and no other rows landed in that window. The old lead files are
archived on DART at `kiosk\telemetry\archive-prelaunch\`, queue now genuinely 0.
**The rule this earns: CHECK THE QUEUE BEFORE ENABLING A SENDER.** Three separate times on
08-09 fabricated data reached production, every one of them from acting before checking.

### Durable context now lives in one place
**`expo-assets/BOOTH-SYSTEM.md`** — the five machines, the addresses, both attract loops, every
QR and whether it captures, the lead path end to end, the follow-up cadence, how to test it,
and the six rules the system was built out of. Read that before any trade-show work.
Also `docs/2026-08-09-toronto-followup-email-patterns.md` — what the Toronto follow-ups actually
did, measured from Gmail (cadence +1/+5-7/+8-9, 35% reply rate, what pulled and what did not).

### OPEN — Daniel's calls, nothing blocked on me
1. **Follow-up automation:** should the 2nd and 3rd touches be written automatically, or drafted
   for him to edit and send? Toronto's were all hand-written and the reply data suggests that is
   partly why they worked.
2. **The citation line in talk 2** — slide 13 says "cited, and it doesn't make things up"; the
   SMS demo carries no citation. Rephrase or ship citations. NOT resolved.
3. Travel cost on /videoproduction — **Daniel said he does not need this**. The +10% stands
   alone. Closed.
4. Booth leads still do not reach CommandCentered, which already has the whole campaign engine
   (`Campaign → CampaignStep → CampaignLead → CampaignSendEvent`). That bridge is unbuilt.

### Reason for refresh
Context length after a long deploy-and-verify session. Nothing in flight, nothing broken.

---

## 2026-08-09 19:30 ET — MENU REEL, FOLLOW-ON FILMS, 24-SCENARIO SUITE. Commit `6d8e331`, pushed.

### INCIDENT — three fabricated leads reached production, then were removed
`tests/scenarios.mjs` fills the booth gate with a made-up studio and email. The kiosk it ran
against was started **bare**, and `serve.py` auto-drains its lead queue to
`https://streamstage.live/api/expo-leads` every two minutes unless you pass `--no-flush`. Its
startup banner says exactly that; it was ignored. Three sends (19:47, 19:50, 19:52) merged into
**one** production row (`scenario+booth@example.invalid` / "Scenario Test Studio").
Backed up to `scratchpad/deleted-scenario-lead-2026-08-09.json`, **deleted**, absence confirmed
three ways (email eq, studio ilike, email ilike). Local queue purged 4 rows -> 0
(`scratchpad/leads-2026-08-09-BEFORE-PURGE.jsonl`). The address is a reserved `.invalid` TLD so
no real inbox could receive it.
**Durable fix:** the suite now reads `/health.leadFlush.endpoint` — the SERVER's own reported
destination — and REFUSES to run unless it is loopback or absent. Verified: it refuses.

### Shipped
- **The menu reel** (`expo-assets/kiosk/menu-loop/`) — 30s, six live film thumbnails, highlight
  cascading 5s each, "tap the tablet to watch the full explainer". Rendered by walking
  `window.setT(ms)` so frames cannot drop. Lives OUTSIDE `media/` on purpose: `publish-films.sh`
  ships all of `media/` to R2 and onto the stick's reel, and an attract reel filed as a film would
  play as an eighth film. **First render came out at 25 fps** — lavfi's colour source defaults to
  25 and the whole overlay chain inherited it; fixed with `r=`, re-rendered, verified 30/1.
- **`attract` operator verb** (and `A` on the TV) switches card loop <-> menu reel. `/state`
  reports the mode and whether the reel exists.
- **Films follow on**: when a chosen film ends the end card still shows (it carries the QR) and
  then the NEXT film plays. The Fire Stick already did this — its reel is one ExoPlayer playlist
  on `REPEAT_MODE_ALL` — so this makes the browser TV agree.
- **The re-rendered StreamStage film is LIVE on the stick.** Published to R2 (manifest v3,
  sha256 + bytes matched), then driven through the stick's own update panel over adb: it read
  `NEW VERSION · 187.8 MB`, downloaded, verified and reported `updated · plays from the next time
  round`. Stick is `192.168.0.199`, AFTKRT, versionCode 3. Old cut kept at
  `scratchpad/streamstage-services-PREV-92MB.mp4`.
- **/videoproduction +10%** (in commit `6d8e331`, whose message does not mention it): day rates
  1250/750/499 -> 1375/825/549, drone 250 -> 275, deliverables 249 -> 274, 150 -> 165 x2,
  500 -> 550 x2.

### Defect found by the suite and fixed
`attract` was operator-only but was NOT in `COMMANDS`. `command_of()` returns None for an unknown
type, and a message that is not a command is never operator-checked — so a **visitor surface could
change the attract loop and get a 200 back**. Now in both sets.

### Open — Daniel's numbers, not mine
1. **Out-of-town travel on /videoproduction.** Needs: the amount (flat / per-km / per-day), what
   counts as out of town, and what the waiver is when two local studios combine. Not invented.
2. **The lead capture campaign.** Measured today: booth leads reach StudioSage's `leads` table
   ONLY. **Nothing reaches CommandCentered**, which already has the whole engine —
   `Campaign -> CampaignStep -> CampaignLead -> CampaignSendEvent`, plus `Lead.nextFollowUpAt`,
   `autoDraftEnabled`, `recitalDates` and `CommunicationTouchpoint`. The work is the bridge plus
   the step copy, not a new system. Design not started pending his shape.
3. Also note: CommandCentered's own prod was 404 from ~14:31 ET today (commit `a04e586`, the
   `app/app` trap). The booth lead path is UNAFFECTED — `/g` 200, the `expo-leads.html` 307 and
   StudioSage `/api/leads` all verified live.


## 2026-08-09 15:20 ET — SESSION REFRESHED (context length). Nothing broken, nothing in flight.

Four commits pushed today: `35d4a47`, `7170a64`, `0dd6c63`, `46da328`.

### Active task at refresh
Nothing running. All work below is finished, verified and pushed. Daniel flies **Mon Aug 10
09:00**; talk 2 Tue 09:20, talk 1 Wed 10:50.

### Shipped since the last entry
- **Preflight + demo reset are buttons on the phone remote** (`46da328`). `GET /preflight` on the
  presenter returns 11 colour-coded rows (deck identity + stale-deck alarm, booth kiosk, facelift
  freshness, the 8 live-demo checks). `POST /demo-reset` restores the demo tenant's seeds. The
  token lives in `demo-token.txt` beside the script on DART — **gitignored, never committed**.
- **One-command show preflight** (`0dd6c63`): `tests/preflight.sh` (`--reset-demo` to also reset).
- **Address discovery**: `tools/booth-lan.sh` — `$BOOTH_HOST` override, else the kiosk's UDP
  beacon. Nothing needs to hardcode an IP again.
- **START-BOOTH.bat** (easy manual start, idempotent) and **REVIEW-DECKS.bat** (offline deck
  review on the plane), both deployed to DART.

### THE THING TO REMEMBER
**DART's LAN address is now `192.168.0.11`, not `.13`** — and `.11` is what the ledger recorded
for the FIRE TABLET. Anything quoting `.13` is stale, including `DART=192.168.0.13
./tests/e2e-booth.sh`.

### Next steps — ONLY these
1. **Re-run `tests/e2e-booth.sh` with `DART=192.168.0.11`.** It has NOT been run today; its last
   green (44 pass / 0 fail / 2 skip) was 08-08 against the old IP, so it is an inherited claim.
2. **Confirm the kiosk beacon from the tablet or phone.** This box cannot hear it — SPYBALLOON's
   INPUT policy is DROP — so that check is unconfirmed, not proven.
3. **Reset the facelift run before going on stage** (a test build stays armed and preflight will
   keep flagging it), or just let preflight tell him.
4. **DANIEL: the citation promise.** SMS replies carry NO citation, so the stage line "it never
   hallucinates, only answers and cites from the email" is not true as written. Rephrase or ship
   citations.
5. **DANIEL:** ship-or-leave the re-rendered film · ten-and-ten picks · Reflect's tagline · the
   talk-2 SMS QR prefill · the talk-1 videographer QR living only inside the `M` act.

### Reason for refresh
Context length. Every goal from this session met and verified.

---

## 2026-08-09 — FACELIFT REVEAL FIXED, STUDIOSAGE DEMO PROVEN E2E, DECKS AUDITED

Commit `35d4a47`, pushed. Everything below was measured on real surfaces, not inferred.

### THE BOOTH FACT THAT CHANGED — DART's LAN IP MOVED
**DART is now `192.168.0.11`, not `192.168.0.13`.** Confirmed by `ipconfig` on DART after its
reboot. `.11` is the address the ledger recorded for the FIRE TABLET, so DHCP has reshuffled.
Everything that hardcodes `.13` is now wrong: the e2e invocation (`DART=192.168.0.13
./tests/e2e-booth.sh`), the phone's saved presenter host, and any doc line quoting the kiosk at
`192.168.0.13:8081`. **Fix before Calgary: a DHCP reservation, or trust the LAN beacon and stop
typing IPs.** Also: after the reboot NEITHER `booth-kiosk.bat` nor `booth-presenter.bat` had
started — the Startup folder only fires at interactive logon.

### The facelift reveal would have shown another studio's website
With a 260h-old build still on disk the server correctly said `stale`, but `local_url` stayed
populated and the deck used it: the curtain opened **full screen on Steppin' Up (Sarnia)** under
the caption *"built live on this laptop"*. Screenshot DM'd. Fixed in `talk2-ai.html` — only
`status === 'ready'` is revealable; stale/failed/idle/queued/running all fall through to the
pre-baked Ancaster fallback with a red chip. Verified in all three states on this box AND on DART.

### The status file lies, so the server no longer trusts it
Mid-run the headless Claude session rewrote `facelift-out/status.json` as
`{updated_at,url,session,started_at}` — **no `status` key** — and the server fell back to IDLE
while a build was genuinely running. `presenter-server.py` now infers `running` from a recent
`started_at`. Caught during a real run, fixed, and re-verified against a second real run.

### `FACELIFT-CONTRACT.md` had two wrong instructions, both corrected
`FACELIFT_FAKE=1 python3 presenter-server.py` cannot work — the server dispatches over ssh to
SPYBALLOON and the env never crosses the hop. The working form is
`FACELIFT_FAKE=1 ./facelift-run.sh <url> "$PWD/facelift-out"`. And "ready OR any non-empty
local_url" is the line that produced the bug above.

### Verified end to end on the real paths
- **Facelift, venue path:** phone (AVD) → DART `:8090` ★ panel → GO → ssh dispatch → tmux
  `facelift-1786297075` on SPYBALLOON. DART→SPYBALLOON ssh works (returns `pyalloon`).
- **Facelift build:** a real run produced `site/index.html` in **9 minutes** (budget is 21).
- **StudioSage SMS demo:** real inbound to `+1 587-317-0721` from a spare Twilio number (never a
  customer) → answered in **6 seconds**, correctly said what it did NOT know, and landed on the
  projector wall (`/demo/wall?code=live26` — the code is `live26`).
- **StudioSage email ingest:** a real email to `calgary@ingest.studiosage.ai` → demo tenant KB
  went **15 → 16 in 20 seconds**, and a follow-up text answered from it with every detail right.
- **Decks:** talk 2 = 32 slides, talk 1 = 27. Zero overflow on talk 2; talk 1's only overflow is
  the three ambient `.beam` elements (by design). **All 35 talk-1 media files serve 200 + 206
  Range** — the Toronto dead-air failure mode is not present. 23/23 punch-list deck items verified.

### Open, and they are Daniel's calls
1. **The citation promise is not kept in SMS.** On stage: *"it never hallucinates, only answers
   and cites from the email."* The measured replies are accurate but carry **no citation**.
   Either rephrase the line or ship citations — do not say it as written.
2. The demo tenant now holds **16** KB entries (my test email). Reset seeds before the talk.
3. DART's presenter is running detached via WMI because a plain ssh start dies with the session.

## 2026-08-08 14:16 ET — THREE WINDOWS COORDINATED; OPEN ITEMS DRIVEN TO ZERO

Session refreshed for context length. **Nothing is broken. Nothing is in flight.**

### Ledger
`docs/OPEN-ITEMS-2026-08-07.md` is the SINGLE SOURCE OF TRUTH and is current as of `a5d4b5a`.
Three sessions worked this repo (StreamStage-3, -4, -5); StreamStage-5 led by agreement and holds
the ledger. Both other windows closed out with nothing outstanding.

### The rule this session produced — rule 9, now in ~/projects/CLAUDE.md and ~/.claude/CLAUDE.md
**Believe the artefact, not the predicate.** Trust the output file's mtime/size, the device's
`versionCode`, the row in the table — over any process check or inference. Tonight's instances:
a `pgrep -f "kiosk-render-chunked"` matched its OWN command line and reported a nine-hour-dead
render as running; two `pkill -f` calls matched the invoking shell and killed it mid-turn; a tree
dismissed as "unverified" was exactly what the device was running; and three inherited "open items"
dissolved on first measurement. Corollary: a process-matching pattern must not be able to match the
command containing it (`pgrep -f "[k]iosk-render"`).

### Shipped this session (all pushed)
- `431742a` /api/expo-leads returns `forwarded`/`notified` (it computed them and threw them away).
- `9f83ebb` **The film's baked QR is fixed in production without a re-render** — /expo-leads.html
  307s to `/g?a=sixfilms&src=booth_tv&p=streamstage&s=tv`; `missing: staff` keeps the operator form.
- `b246119` Both decks current on DART on 8090 (talk2=32, talk1=27) + 209MB talk-1 media.
  `PRESENTER_PORT=8080` is IMPOSSIBLE (pick_port skips it); both pre-made QRs were dead at :8080.
- `2a4e497` Tablet "back" double-flash root-caused and fixed.
- `e8b6801` /state stops describing a dead TV (~84s of a confident wrong picture); released-
  ExoPlayer guard so a `play` right after a version swap cannot prepare a dead player.
- `c3fa74e` **kiosk-app versioned-filename work KEPT** — the stick was already running it
  (versionCode 2 vs HEAD's 1). Merged, bumped to 3, installed, verified.
- `eeadbfd` Booth note: the film's QR and tv.html both own the bottom-right corner.
- `a5d4b5a` Struck a retracted proof in both places it was recorded.
- StudioSage `6e8f962` the leads merge only ever ADDS now — notes accumulate, and name/studio/
  email/phone keep their existing value against a blank incoming one.

### Booth state, measured 2026-08-08 13:37 ET
```
stick     versionCode 3/1.1.1, BoothLoopActivity foreground, 7 films, .staging empty
          SYSTEM_ALERT_WINDOW granted=true AND appops allow  <- install -r DROPS these, re-run both
kiosk     DART 192.168.0.13:8081, new serve.py, /health hasTv=true
presenter DART 8090, both decks; start-presenter.bat, NEVER PRESENTER_PORT=8080
autostart kiosk + presenter both launch from DART's Startup folder now
e2e       DART=192.168.0.13 ./tests/e2e-booth.sh -> 44 pass / 0 fail / 2 skip
```

### Next steps — ONLY these. Do not invent work.
1. **DANIEL: ship-or-leave the re-rendered film.** `/tmp/kiosk-chunks/kiosk-final-002023.mp4`,
   181.07s, audio real, clean decode, QR decodes gated on 8/8 sampled frames. Carries the
   defocused tile wall + gold oval he asked for. Stills DM'd. **NOT published anywhere.**
   If yes: `kiosk-app/tools/publish-films.sh --media ../expo-assets/kiosk/media/publish-set`,
   then R2, then the stick — and re-assert BOTH permission halves after any reinstall.
2. **BLOCKED ON HARDWARE:** the Fire tablet is off the network (no route to 192.168.0.11) and the
   Pixel is PIN-locked. That leaves the tablet double-flash fix (needs a page reload + a real
   thumb on "back"), the phone console, and the CELLULAR presenter path unverified.
3. **DANIEL: ten-and-ten picks** (`docs/five-and-five-2026-08-07.md`) — never chosen.
4. **DANIEL: Reflect's tagline** — verified verbatim from VO-SCRIPT.md beat 16, needs only a yes/no.

### Reason for refresh
Context length. The session met its goal; every open item is either closed, a Daniel decision, or
blocked on hardware.

---

## Earlier entries

## 2026-08-07 22:00 ET — THE TABLET NOW ACTUALLY DRIVES THE STICK. ROOT CAUSE WAS THE APK.

Commits `e6dfa99` + `378ea3e`, pushed.

**OPEN ITEMS: `docs/OPEN-ITEMS-2026-08-07.md`** — everything still outstanding, ordered by what
can hurt at the booth. Two are BLOCKING: the lead-route fix is committed but **NOT DEPLOYED**, so
a real booth flush would 400 today; and six unflushed leads sit on DART waiting on that deploy.

**THE TESTED FLOW, FUNCTION BY FUNCTION: `docs/BOOTH-TESTED-FLOW-2026-08-07.md`.**
Read that before touching the booth. It marks every step tested / not tested, and it lists what
must NOT be claimed.

**Zero-touch power-on: a research subagent was mid-flight when this session was refreshed and its
result did NOT carry over.** The question it was answering: how to make the app own the screen at
power-on with no human touch on a Fire Stick (AFTKRT, Android 11) — device-owner provisioning via
`dpm set-device-owner` + LockTask, `cmd package set-home-activity` argument syntax, real
`canDrawOverlays` vs the appop, a foreground service from BOOT_COMPLETED, Amazon's own signage
programmes, and disabling `com.amazon.tv.launcher`. Re-run that research; do not assume an answer.
Daniel has already said pressing the app once is acceptable, so this is an improvement, not a
blocker.

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

### Cold-boot procedure — TESTED, and it is one step
Power-cycled the stick and ran the whole chain from cold: launch the app once (Fire TV home-row
tile, or `am start -n com.streamstage.boothloop/.BoothLoopActivity`) -> the reel owns the TV ->
tablet tap played CostumeCraft on it -> the lead landed on DART's disk verbatim. Daniel's call:
launching it by hand is fine, so the launcher is NOT being replaced.

**Correction to the note below:** this bench stick has NO REMOTE PAIRED, so Fire OS shows a
"We cannot detect your remote" dialog over everything after every boot. That dialog is in the
first post-reboot screenshot and it is a property of this stick, not of the app. With a paired
remote at the booth it should not appear. What survives that correction is the logcat, twice:
the boot-time activity start really is refused.

### OPEN DEFECT — power-on does not put the reel on screen by itself
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
