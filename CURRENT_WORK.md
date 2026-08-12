# Current Work - StreamStage

## 2026-08-12 01:00 ET — TALK 1 FIX LIST APPLIED AND ON DART. Talk is 10:50 MDT today.

Daniel's 13 notes for the video talk are in the deck. Plan + acceptance checks:
`docs/plans/2026-08-12-talk1-fix-list.md`. **Deck is live on DART**, 337,585 B, md5
`d42b2285`, byte-verified after copy. Rollback: `_rollback\talk1-deck-2026-08-12-pre-fixlist.html`.

### Done, verified
- **Order is now 3, 5, 6, 4, 7** (his explicit list) and **slide 17 moved to sit right after
  Stations**. Deck is 29 slides: 27 + the explainer + the Calgary offer.
- **Slide 23 runs on `videos-lo/`** — 16 tiles re-encoded on DART to 640x360 / ~390 kbps / 30 fps.
  The worst section went **7,806 -> 2,304 kbps**, and the two 120 fps files are now 30. Originals
  in `videos\` untouched; reverting is a path swap.
- **The demo slide (now 10)**: Tiffany's button removed, a **Next** control added (also the `.`
  key), and the giant black box killed — `.s10 .third` overrode position but not `background`, so
  it still inherited the full-width 94% scrim from the shared rule.
- **Audio on arrival**: the first click or keypress of the talk arms the page, after which any
  clip marked `data-autoaud="1"` comes up unmuted. Only the demo player and the explainer are
  marked. Browsers will not autoplay sound without that gesture — there is no way around it.
- **Slide 21 (media fee)** rewritten to his three bullets — we charge you per dancer / you charge
  families per dancer / you make the margin — with the StreamStage logo on the slide.
- **Camera Settings cards** end in line-art glyphs instead of dead space.
- **New: StudioSage Explainer** (the kiosk film, re-encoded 1280x720 / 1,334 kbps — the kiosk
  original is 1080p at 2,746 kbps, well over the 1,557 kbps DART ceiling) and **New: Calgary
  Offer** (four studios, Oct 2-5, travel included).
- **Close** reads "Local team shoots, we deliver." in both places.
- **`/dancepromo` +15%**: 750->865, 150->175, 175->200, 350->405, 100->115, 250->290; volume
  tiers 1250/1750/2250 -> 1450/2000/2600. The deliverable prices and tier thresholds were each
  hardcoded a SECOND time in the maths and the copy, so a rate change could have updated the
  constants and never reached the quote — both now read the constants. `tsc --noEmit` clean.

### Tests run
Playwright against the real deck: Next steps CSOD -> KMSD -> WSDY -> kiosk -> wraps; `.` key
advances; no Tiffany button; audio armed after a gesture and `mainplayer.muted=false`; explainer
`muted:false`; all 16 slide-23 tiles on `videos-lo/`. All 29 slides render; the one inline script
passes `node --check`. **Found and fixed in testing:** both new handlers keyed off the `cur`
cursor instead of `.slide.active`, so anything moving the deck outside `show()` killed them.

### Playback fixes (second pass) — deck redeployed, 337,834 B, md5 `8d7c8493`
- **Slide 15's nine-reel fan is now three rows of three** (frags 2, 3, 4) instead of one fragment
  that started ten players at once. Contained to that slide: `.fan9` became a flex column of
  `.r9row` grids, so the 3x3 layout is pixel-identical. **Deliberately did NOT change the global
  fragment logic** to group-reveal by index — slides 18, 22, 28 and 29 already carry duplicate
  `data-frag` values, and altering their click counts hours before the talk is not worth it.
- **The cold-open preload burst is gone.** 36 videos dropped from `preload="auto"` to
  `preload="none"`; slide 1 keeps its one. Measured before/after in a real browser:
  **mp4 requests in the first 3 seconds went from the whole document to 2**, and after load only
  **1 of 49** video elements still holds a src. The engine already sets `preload='auto'` and
  restores src as slides come into range, so nothing is lost.

**CORRECTION to the earlier entry:** slide 1 was NOT prefetching slide 3. The halo is
`Math.abs(j-cur)<=1`, so at `cur=0` it covers slides 1 and 2 — and slide 2 has no videos at all.
The real cost was that `show(0)` runs at the very END of the script (`:2342`), long after the
browser has begun fetching every `preload="auto"` video in the document. That is what competed
with slide 1's 181 s / 22.6 MB film, and that is what is fixed.


### Third pass — 2026-08-12 01:25 ET. Deck md5 `01a64f22` on DART, site pushed (`eb10623`).
- **Slide 10 runs the promos back to back.** The player no longer loops, so `ended` fires and the
  next film starts with its tab lit. Stops on the last one rather than wrapping. **EDP (Elite
  Dance Project, Guelph) added** as a fourth promo — it was already on DART as a wall tile.
- **Slide 27 plays once and holds an end card** — wordmark, the StudioSage QR, studiosage.ai.
  The mark is cloned at runtime off the media-fee slide so the logo is not embedded twice.
- **Reel wall no longer letterboxes.** Each tile carries its own aspect ratio (7 portrait tiles
  identified from the encoded files), rows are centred flex strips at 210 / 170 / 200 px, and
  portrait tiles get smaller labels — "Highlight" was rendering as "hlight".
- **The checklist page offers the deck as a PDF** once the email gate is passed:
  `public/streamstage-video-talk-deck.pdf`, 29 pages, 2.4 MB, live and verified at
  `streamstage.live/streamstage-video-talk-deck.pdf` (2,405,338 B). Built by rendering every
  slide with a poster frame pulled off DART, so the film slides show real footage instead of
  black. `/dancepromo` +15% is also live (`1st camera: $865`).


### Public follower — 2026-08-12 10:55 ET. LIVE at streamstage.live/live
Deck on DART: md5 `943ebb5d`. **The deck tab must be reloaded to start reporting.**

- **Fragment-level sync.** The deck posts slide + fragment LEVEL + the demo slide's current film
  to `live-receive.py` here (Tailscale `100.122.177.91:8793`), which mirrors it to R2. 116
  rendered states, one per click, and the phone preloads the next one so it lands instantly.
- **Nothing on DART changed except the deck file.** No presenter edit, no presenter restart. The
  push is `mode:'no-cors'` with a text/plain body — a "simple request", so no preflight and the
  receiver needs no CORS config. Fire-and-forget: if this machine is asleep the deck's catch
  swallows it and the talk is unaffected.
- **Films follow.** Whichever promo the room is watching is the one the phone plays, muted.
- **QR targets are tappable links** on slides 22, 25, 28, 29.
- Verified end to end: clicking the real deck emits one post per click with correct frag counts
  and no page errors; the live page rendered `slide-05-f0..f3.jpg` in order and switched from
  `promo-edp.mp4` to `dis-1shot-vertical.mp4` with `muted:true`; zero failed requests.

**Operational, and this is the fragile part:**
- `live-receive.py` runs HERE, not on DART. If this machine sleeps or the session ends, the
  phones freeze on the last state. The talk itself is completely unaffected.
- Two earlier `live-relay.py` pollers survived a `kill` of their bash wrappers and kept
  overwriting state.json — the pids to kill are the python ones, not the shell's. Both are dead;
  the receiver is now the only writer.
- Port 8791 was already taken by another python process (left alone); the receiver is on 8793.

### Still open
- **The 60-second DIS vertical is not found.** Looked in DART `videos\` (32 files),
  DART `videos-heavy-2026-08-11\` (40), FIRMAMENT `D:\` by name, and Google Drive by name.
  The only 60 s DIS asset anywhere is `promo-dis-full` and it is 1280x720 landscape; the DIS
  verticals on hand are 4-7 s. Daniel says it exists — needs a path from him.
- Talk 1 has still never been walked end to end on DART.
- **A browser tab opened before a deploy keeps serving the old deck.** Hard-reload after each push.

### NOT done / open
- **`/dancepromo` is not deployed** — the change is local only, deploys are hook-gated.
- Talk 1 has never been walked end to end on DART with these changes.
- Slide 8's one `preload="metadata"` film still gets a header fetch on open. Harmless, left alone.

## 2026-08-11 19:45 ET — CALGARY DAY 2. Booth hardware fixed live. Talk 1 is 10:50 MDT tomorrow.

**Reason for refresh:** long live-support session (booth firefighting + post-expo analysis).

### Everything shipped today, all VERIFIED on real hardware, NONE of it committed
The whole working tree is uncommitted. First job for anyone picking this up is to commit it.

1. **Six-up reel now works** — `boothloop 1.5.0` (versionCode 8) installed on the Fire Stick.
   The bug was a deadlock, not decoders: `enterMenuLoop()` started the reel playing into a
   `GONE` PlayerView, and a GONE view has no surface, so no frame renders, so
   `onRenderedFirstFrame` — the ONLY thing that made the view visible — could never fire. The
   TV froze on the parked film's last frame every time. Fix: show the view BEFORE playing.
   Proof: `Six-up reel is on screen` in logcat (never appeared before) + two TV screencaps
   7s apart with different md5s.
2. **Phone film list now works** — `phonepresenter 2.3.0` (versionCode 8) on the Pixel.
   `FilmPanel.kt` added the list with `height 0, weight 1`. Weight absorbs the LEFTOVER space,
   and today's tablet section made it negative, so the list ate the whole deficit at 0px.
   A first fix that kept the weight did NOT work. Fixed height, no weight.
3. **Loop toggle + hold-the-selection** — new `loop` verb on the stick, `loopOne` in the tv
   state, `↻ Loop film` button on the phone. A film you pick now REPEATS until something else
   plays (`holdSelection`, default true); the uncommanded attract reel still advances.
4. **Six-up reel re-designed** — StreamStage.live logo reveal + "Videography · Live streaming /
   The latest studio software" in the top-right blank. Wipe-in, hairline rule, staggered lines,
   fades out over the last 700ms so the 30s loop seam is invisible. The rule/second line take
   the lit product's accent colour. Shipped as `.menu-loop.mp4` on the stick (override path,
   no APK rebuild). Live and confirmed on the booth TV.
5. **Talk 1 films re-encoded** — all 32, 208.4 MB -> 150.6 MB, peak bitrate 2843 -> 1557 kbps.
   Swapped in on DART; old films kept at `videos-heavy-2026-08-11\`. Committed as `3d3d398`.
6. **`talk1-deck.html` committed** (`3d3d398`) — the 27-slide deck existed ONLY on DART.
   NOTE: the repo's `talk1-video.html` is a DIFFERENT 13-slide Aug-7 file. Do not confuse them.

### Open, and NOT started
- **Commit + push the uncommitted tree** (phone-app, kiosk-app, menu-loop, tablet-app).
- **PA items never written** — 10 real contacts + the booth prize draw, whose winner must reach
  the organiser BEFORE 4:00 PM Wed Aug 12. Nothing is in `~/projects/assistant/INBOX.md` yet.
- **360 Dance Project site never delivered.** Promised free from the stage this morning
  ("It's yours. Free. We'll host it for a year — after that, twenty dollars a YEAR").
  Build sits at `expo-assets/decks/facelift-out/site/`, never deployed. Lead: `360danceproject@gmail.com`.
- **Talk 1, Wed 10:50 MDT**: slide 12 "The Cliffhanger" points at "my next session" — backwards
  now the Calgary running order is reversed.
- Two logos on the six-up frame now (big top-right + old small bottom-right watermark). Daniel's call.
- Six-up subheading wording assumed "and" where Daniel typed "at" — unconfirmed.

### Booth state as of 19:45 ET
Stick `boothloop 1.5.0` at 172.20.154.213:8180 serves EVERYTHING (tablet page, films, leads).
**DART's kiosk is NOT reachable on the venue wifi** — the tablet's own 254-address scan got 83
answers and DART (172.20.154.36) was not one, though it is on the LAN and answers over Tailscale.
Point the phone/tablet at the STICK, not DART. DART's presenter (8090) is DOWN; it needs starting
before talk 1. Leads: 10 on the stick (all flushed), 4 on DART (all flushed).

## 2026-08-11 16:0x ET — TALK 2 IS DELIVERED. The live facelift worked on stage.

### Last session summary
Rehearsal-day session that ran straight through Talk 2. The facelift reveal was rebuilt end to
end (screenshot of their real site on the plant slide, self-scrolling reveal, a reset that
actually forgets a run), and the morning's real find was that **every facelift build had been
spending API credits instead of Daniel's plan** — on a key that had run dry. Fixed before he
went on. **Talk 2 = 32 slides, delivered. Talk 1 is Wed 10:50.**

### THE PROOF THAT MATTERS — a volunteer's site, live, on stage
`https://360danceproject.com/` — dispatched **11:27:00 ET**, `ready` at **11:47:53 ET**
(**21 minutes**), `claude exited rc=0`, and **zero** credit-balance errors in `claude.log`.
That is the runner fix verified in production, not in a harness.

### The billing bug — read this before touching facelift again
`~/.bashrc` sources `~/.env.keys`, which exports `ANTHROPIC_API_KEY`. The runner launches Claude
inside `bash -lc`, and **the CLI prefers that key over the claude.ai login**, so every build was
on pay-as-you-go credits. On 2026-08-11 that key answered `Credit balance is too low` and a build
died in two seconds — on stage that reads as "no build produced".
**Fix (`3062d88`, live on SPYBALLOON):** `facelift-run.sh` runs
`env -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN claude …`. Builds run on the subscription.
**Do not "tidy" that env -u away.**

### What changed (all pushed)
- `3062d88` the subscription fix above · the poll now FORCES the dispatched url into `/facelift`
  (the headless session writes `streamstageproductions.com` into status.json and
  presenter-run.json was the only thing correcting it) · CLEAR FACELIFT kills the builder's tmux
  session so a cleared run stops writing state · dispatch deletes the builder's `before.png` and
  the pull refuses any shot older than the run.
- `6542cc8` CLEAR FACELIFT forgets the whole run (it only deleted two status files, so the last
  studio's screenshot survived a reload) · the reveal scrolls itself once the curtain opens.
- `3ecabd8` slide 5 is designed before a url exists: the browser frame is up from arrival, empty,
  cursor blinking, "Shout out your studio's website." over a shimmering skeleton; the type-here
  bar floats over the frame (it used to be hidden behind it, so the laptop could not start a run).
- `4016d00` an early pull is a snapshot — keep pulling until the run is done (DART was left
  serving an older index.html than the finished build: 78,317 B vs 78,591 B).
- `f7d5b05` the before shot arrives whole (atomic rename), never eats a click, and the capture
  clears cookie/newsletter curtains before shooting.
- **UNCOMMITTED AT WRAP-UP → now committed:** demo-wall sound effects in `talk2-ai.html`
  (see Incomplete Work).

### Build status
No compile step for the deck. **All four deck scripts parse** (`node --check` on every inline
`<script>`). Presenter `presenter-server.py` passes `ast.parse`; `facelift-run.sh` passes `bash -n`.

### Tests
**Facelift full cycle: 18/18 PASSED**, 2026-08-11 14:02 UTC, log
`scratchpad/e2e-final2.log` (scratchpad is volatile — the script is the artifact).
Ran against a LOCAL presenter running byte-identical deployed code (server md5 `eb410251`,
deck md5 `4ef9a915`) because DART was serving the live talk and the test ends in a reset.
Covered: reset via the real CLEAR FACELIFT button → idle, both artifacts 404 → slide 5 waiting
frame → url typed into slide 5, server received exactly it → their site on screen in **6s** →
build → curtain holds THIS run's build (`?r=<runid>`) → **the reveal scrolled itself 237→695 of
9298px in 24s** → ArrowDown froze it at 1424px → second reset forgets everything.
**Untested:** the demo-wall sound effects (never played through a real demo), and the whole cycle
against DART itself in one unbroken run.

### Incomplete work
- **Demo-wall sound effects — BUILT, PARSING, NOT DEPLOYED, NEVER HEARD.**
  `talk2-ai.html`: `sfxFan()` fires in `addFact()` (a filtered-noise whoosh as each knowledge-base
  fact lands) and `sfxText(out)` fires in `addMsg()` (a two-note tone per text, flatter for the
  parent, brighter for StudioSage). WebAudio, no files to ship. Guards: nothing plays for the
  first 2.2s (the first paint replays history), no two sounds inside 110ms, **S toggles**.
  **DART is still on the committed deck without them.** Deploy = scp `talk2-ai.html` to
  `talk2-ai.html` AND `talk2-deck.html`, then reload the tab. Listen before the talk.
- **Talk 1 slide 1** is done and deployed (kiosk video wall + director testimonial). Talk 1 has
  had far less attention than Talk 2 this session.

### Known issues
- **The recovery heuristic can publish someone else's build.** `facelift-run.sh` falls back to
  `find ~/projects -name index.html -newermt <start>` if the session never copied one. Measured:
  a run reused an existing Arthur Murray build in 2 minutes. Fine when it is the same URL, wrong
  if it ever grabs an unrelated project.
- **A mistyped url still starts a real run** (`arthurmurraycalary.ca` — no such domain). The
  before-shot is the safety net: no picture appears, so the room never sees a wrong studio.
- **Talk-2 citation line** (slide 13 claims cited answers; the SMS carries none) — still open,
  Daniel's call.

### Next steps (priority order)
1. **Talk 1 is Wed 10:50** — walk it once on DART the way Talk 2 was walked. It is the deck with
   the least verification this week.
2. **Decide on the sound effects**: deploy and listen, or leave them out of Wednesday. They are
   built and safe but have never made a noise in front of anyone.
3. **Run the facelift E2E against DART itself** once the machine is free — everything is proven
   on identical code locally, but never in one unbroken run on the real laptop.
4. The Android trees (`kiosk-app/`, `phone-app/`, `tablet-app/`) have large uncommitted changes
   belonging to **another session** — left untouched deliberately. Their owner should commit them.

### Gotchas for next session
- **DART sleeps only if the lid closes or wifi drops** — power settings are never-sleep on AC and
  battery. It vanished for 2h last night mid-test; Tailscale said `offline`, and nothing could be
  done until it came back.
- **The presenter is shared.** Post to `INBOX.md` before restarting it, and kill the listener by
  the pid off the socket table — a remembered pid was stale once and the "restart" silently
  did nothing while an old process kept serving.
- **Never run the facelift E2E while Daniel is presenting.** It ends in CLEAR FACELIFT and it
  wiped a live run this session.
- **The phone/tablet cannot find DART by discovery on hotel wifi** — different /24s. Tailscale
  `100.90.103.121:8090` is the only reliable address; the phone remote works in Chrome at
  `http://100.90.103.121:8090/remote`.
- Booth kiosk on DART `:8081` is up but `hasTv:false` — the Fire Stick plays its own offline reel
  and does not need the laptop; the tablet does.

### Files touched this session
`expo-assets/decks/talk2-ai.html` · `expo-assets/decks/presenter-server.py` ·
`expo-assets/decks/facelift-run.sh` · `expo-assets/decks/facelift-before.cjs` (new) ·
`StudioSage/live-demo/talk1-deck.html` · `INBOX.md` · `CURRENT_WORK.md`
