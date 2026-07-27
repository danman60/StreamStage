# Overnight — Facelift live path + Talk 1 (video deck) buildout

**Written 2026-07-26 23:05 EDT by the supervisor session (StudioSage-5). Execute autonomously
until every acceptance check passes. Do not stop to ask questions — take the documented fallback
and keep going. Log every deviation in this file under "Deviation log" at the bottom.**

Talk is **Wed Jul 29 2026, 4:10–5:10 PM EDT**. Two talks are being presented, not one:
- **Talk 2** "The AI Front Desk" — `StreamStage/expo-assets/decks/talk2-ai.html`, 38 slides. Mature.
- **Talk 1** "The Content Day" — `StudioSage/live-demo/talk1-deck.html`, video-focused. Behind.

---

## Ground rules (violating these breaks the show)

1. **NEVER run a browser over the deck without blocking `studiosage.ai`.** The deck now arms live
   SMS routing by itself (built-in token, `talk2-ai.html` ~line 1601). Walking the slides fires a
   real `POST /api/demo/route-all` that pulls every studio's inbound SMS into the demo tenant.
   Use the harness at `scratchpad/audit3.mjs` pattern:
   `await p.route('**://*.studiosage.ai/**', r => r.abort())`. Non-negotiable.
2. **Never mirror a deck to FIRMAMENT that fails the audit.** Audit green first, then `scp`, then
   verify md5 both sides.
3. **No deploys.** No `vercel`, no `DEPLOY_OK=1`. Pushing to `main` on StreamStage/StudioSage is fine.
4. **Do not touch production Supabase data**, the live wall, or `handle-sms`.
5. **Do not drive Daniel's Pixel.** He rehearses on it.
6. **Say "dancer", never "kid".** No Talk 1 material in Talk 2 and vice versa.
7. Audience is **Canadian** — the US A2P/SMS-delivery risk does not apply.
8. **Screenshot every UI iteration and DM it**: `~/tg-dm.sh --file <png> "<context>"`. This is
   mandatory for all deck/UI work, at every stage boundary, not just at the end.
9. `kiosk-build.py` regenerates `kiosk-loop.html` from a template with none of the hand-edits.
   **Never run it.**
10. Derived docs are generated: run `expo-assets/regen-slides.py` after any Talk 2 deck change.
    Never hand-edit `talk2-ai-slides.md`.

---

## OWNERSHIP SPLIT (added 23:10 EDT — read before editing anything)

Two sessions are running in parallel. **File ownership is strict; parallel edits to the same file
will collide.**

| Session | Owns (may write) | Must not write |
|---|---|---|
| `claude:ExpoNight-1` | PHASE 1 (`presenter-server.py`, facelift path) and PHASE 3 (`StudioSage/live-demo/talk1-deck.html`, phone wiring, Talk 1 screenshots) | `talk2-ai.html`, `expo-assets/talk2.html`, `talk2-ai-slides.md` — read-only, for mining patterns |
| `claude:StudioSage-5` (supervisor) | PHASE 2 (all Talk 2 deck note fixes) + independent review/verification of everything ExpoNight-1 ships | `presenter-server.py`, `talk1-deck.html` |

The supervisor re-audits, re-screenshots and md5-verifies ExpoNight-1's output independently rather
than trusting its self-report. Quality bar: nothing is "done" until it has been verified by the
session that did not build it.

## Machine map

| Host | Role | Notes |
|---|---|---|
| SPYBALLOON (`100.122.177.91`, this box) | build host | has bash + Claude CLI + playwright |
| FIRMAMENT (`ssh firmament`, `100.75.112.14`) | presenting laptop | Windows. **No bash on PATH, no WSL.** Git Bash exists at `C:\Program Files\Git\bin\bash.exe`. Has `ssh` + `scp` (OpenSSH). Reverse ssh to SPYBALLOON works passwordless. |
| DART | intended stage machine | **powered off, unverified.** Assume nothing about it. |

Playwright lives at `/home/danman60/projects/BroadcastBuddy/node_modules/playwright`.

---

## PHASE 1 — Finish the facelift live path (highest priority)

### Context
Phone POSTs a URL → `presenter-server.py` ssh-dispatches `facelift-run.sh` into a tmux session on
SPYBALLOON → a poller thread mirrors remote status locally and scp's the built site back → the deck
embeds `/facelift-site/index.html`. Reveal serves off the laptop so the venue network is only needed
during the build. Committed in `a85ad04`.

Already fixed and verified:
- `claude exited rc=127` — `ssh host 'cmd'` is non-interactive, `.bashrc` bails, nvm never loads.
  Runner now launched via `bash -lc` with `FACELIFT_REMOTE_PATH` forced onto PATH.
- ssh does not return after the tmux dispatch even though the build runs. Dispatch timeout is now
  treated as success; the poller decides truth.

### 1.1 — The remaining defect
`_remote_poll()`'s `ssh ... cat status.json` times out (30s) when run from **Windows python**, while
the identical command run manually from FIRMAMENT returns in **0.275s**. Root-cause it properly —
do not guess. Suspects worth testing in order:
- the abandoned dispatch ssh child still holding a console/handle after `TimeoutExpired`
- Windows python `subprocess.run(capture_output=True)` + OpenSSH pipe buffering
- missing `-n` propagation / stdin inheritance in the poll call
- try `subprocess.Popen` with explicit `stdin=DEVNULL` and read with a deadline

**Acceptance:** from FIRMAMENT, POST a URL to `/facelift`; within 90s the local `facelift-out/site/index.html`
exists, `/facelift` reports `status: ready` with a non-empty `local_url`, and the deck's reveal slide
renders the built site rather than `facelift-fallback`.

Test with the stub first: `scratchpad/fltest/stub-runner.sh` pattern (writes status + a fake site in
~4s). Env: `FACELIFT_REMOTE_DIR`, `FACELIFT_REMOTE_RUN`, `PRESENTER_PORT=8099`.
**Start the test server attached to a console** — `Start-Process`/`start /b` on Windows exits
immediately; run it via `ssh firmament "cd /d <dir> && set VAR=..&& python presenter-server.py"`
backgrounded from this side.

### 1.2 — One real end-to-end run
Once the stub path is green, do **one** real run against `https://grandriverdance.com` (the URL
Daniel actually tried). This spends Claude plan usage — budget for exactly one. Verify the reveal
shows Grand River's rebuilt site, screenshot it, DM it.

### 1.3 — Restore state
`facelift-out/site/` currently holds the **Alisa's Dance Academy** rehearsal build. Preserve it
(`site-prev-*`) before any real run so it survives as a backup reveal.

---

## PHASE 2 — Talk 2 remaining note fixes

From Daniel's 2026-07-26 22:25 notes session. Slide numbers are **display position** (what he types
at the podium), NOT the internal `s<N>` class names — those are legacy and do not track position.
Source of truth is DOM order of the 38 `data-title` attributes.

Already done: BAND post → Instagram DM (both piles); arm token baked in; "Who I Am" moved to slide 2.

| # | Slide | Fix |
|---|---|---|
| 1 | 3 · The Front Desk Job | Kill the arrows between role elements; collapse the 5 `data-frag` role reveals into 1–2 clicks. Too many clicks. |
| 2 | 3 · The Front Desk Job | Premise widens: it is not only the front desk now — **marketing and customer support** too. |
| 3 | 6 · The Promise | Cut the `8 CAM` / `multicam` element, bottom right. |
| 4 | 7 · Facelift ask | The URL box exists (`id="fl-url"`, `<input id="planturl">`) but is invisible on stage. Make the entry affordance obvious. |
| 5 | 7 · Facelift ask | On load show their site **full-screen**, not side-by-side. Side-by-side is reserved for the reveal (slide 36). |
| 6 | 9 · 101 What Is This Thing | Give the car-wash joke a **ChatGPT-style chat interface**; separate items 1 and 2 into distinct clicks. |
| 7 | 10 · 101 What Do I Use It For | Use **real product logos** (ChatGPT, Claude, NotebookLM, Gemini, Nano Banana, Perplexity). Scrape/fetch real marks; embed locally, no CDN. |
| 8 | 11 · The Only 7 Words | Each click moves the highlight down one pyramid tier. |
| 9 | 12 · Tip 1 Talk Don't Type | Text clips behind the text bubble — move the bubble straight up. |
| 10 | 29 · Pull, Don't Push | No small version of the family photo. Photo absent at start; **second click** reveals it. Fix the "upcoming" text clipped/hidden under the picture. |
| 11 | 30 · StudioSage | Bigger reveal — bursting transition, more effects. Add the **robot SVG logo** (`StudioSage/scroll-world/assets/robot-logo.svg`). |
| 12 | 31 · Inside the Dashboard | Video has black bars L/R (crop/rescale), speed up the timelapse, **cut the first 6 s of login screen**. Source: `decks/studiosage-dashboard-walkthrough.mp4`. |
| 13 | 34 · Live Demo | QR covers the top-left text and looks ugly — reposition. Remove the "nothing happening" line at the bottom. |
| 14 | 7 + 36 | **Keyboard scroll with checkpoints** on both facelift pages: down/next scrolls the embedded page and back up, with sensible checkpoints, while both versions are up. |

After every batch: run the audit (blocked), regen `talk2-ai-slides.md`, update `expo-assets/talk2.html`
(it hand-codes slide numbers — keep it in lockstep), mirror to FIRMAMENT, verify md5, commit, push,
screenshot + DM.

**Do NOT** do these two without Daniel — they rewrite spoken material:
- folding push/pull into the Front Desk slide (its beats say "hold that word, it comes back at the end")
- cutting either hand-raise (slide 1's 9pm-text vs slide 5's AI calibration)

---

## PHASE 3 — Talk 1 (the video deck)

Target: `StudioSage/live-demo/talk1-deck.html` (153 KB, beauty-pass build, md5 `069ee0a0`, mirrored to
FIRMAMENT). Backup exists: `talk1-deck.html.bak-prebeauty`. **Untracked in git — commit it first so
there is a safety net before editing.**

Assets: `videos/` (10 MP4s, 187 MB) and `posters/` (10 JPGs) on the FIRMAMENT desktop folder; referenced
only by this deck.

### 3.1 — Mine the Talk 2 development history and preempt the notes
Read, in this order:
- `StreamStage/expo-assets/rehearsal/` — both run-through transcripts, Daniel's notes, `COVERAGE.md`
- `StreamStage/expo-assets/HANDOFF-DECK.md` → "TODO — carried forward"
- `StudioSage/docs/plans/2026-07-26-expo-dev-blockers.md` → "TODO — carried forward"
- `StudioSage/docs/plans/2026-07-26-beauty-pass-kiosk-deck.md`
- `git log -p` on `talk2-ai.html` — every fix applied there is a candidate for Talk 1

Build a written list of **every Talk 2 defect class** and check Talk 1 for the same thing before he
has to find it. Known recurring classes, all real, all found the hard way:
- **`src:local()` fonts fail silently** and fall back to DejaVu. Embed woff2 as base64. Verify with
  `document.fonts` status — this shipped a 60 s MP4 in the wrong typeface once.
- Overflow past 1920×1080 at any fragment state.
- Text clipping behind overlays/bubbles/pictures.
- Too many clicks per slide — fragments that should be grouped.
- Effects that animate `filter: blur()` or run `infinite` — they re-rasterise every frame.
- Orphaned words on title slides from `max-width` regressions.
- Elements that only look right at one reveal state.

### 3.2 — Port from Talk 2
Transitions/animation vocabulary (`t-fade`, `t-swipe`, `t-push`, `t-rise`, `frag`/`f-up`/`f-fade`),
the presenter integration, the beats format (`data-title` + `data-beats` with `!!`/`>>`/`..` markers),
and the keyboard model (digits+Enter to jump, `Home` to slide 1). Talk 1 is the **video** talk, so it
should lean much harder on the `videos/` examples than Talk 2 does — inline playback per slide, with
the poster as the paused state.

### 3.3 — Wire Talk 1 into the phone/presenter environment
`presenter-server.py:413` already discovers any `*deck*.html` in its folder. Make Talk 1 a first-class
citizen: it must POST `/state` with `idx/total/title/beats/titles` exactly like Talk 2 so the phone
remote shows its beats and Prev/Next works, and it must be able to **trigger a facelift** the same way
(the same `/facelift` endpoint, same reveal embed). Verify the phone actually advances Talk 1 slides.

### 3.4 — Screenshot, verify, iterate in stages
Every slide, every fragment state, at 1920×1080. Use the `deck-shoot.mjs` approach (all slides, every
fragment revealed via digits+Enter). Review each batch against the defect classes in 3.1, fix, re-shoot,
repeat **until clean**. DM the contact sheets as you go — do not save them all for the end.

---

## Acceptance checks (all must pass before declaring done)

- [x] Facelift: POST a URL from FIRMAMENT -> reveal renders the rebuilt site locally, `status: ready`,
      non-empty `local_url`. **Stub-verified** (~5s, 2026-07-27 03:14) **AND one real run verified**
      (grandriverdance.com, dispatched 03:16, ready 03:40, site served off the laptop). Supervisor
      independently signed Phase 1 off against `a27b29f`.
- [~] Talk 2 deck: OUT OF SCOPE this session (Daniel executed Phase 2 in a parallel session).
- [~] Talk 2 Phase 2 rows: OUT OF SCOPE. Supervisor reports 12/12 done in `talk2-ai.html`.
- [~] `talk2.html` / `talk2-ai-slides.md`: OUT OF SCOPE (same owner).
- [x] Talk 1 deck: audits clean at 1920x1080 - 14 slides, **0 layout findings, 0 JS errors**, both
      fonts `loaded` (already base64 woff2, zero `src:local` - that class was closed before tonight).
- [x] Talk 1: phone remote advances slides and shows beats. Verified twice against a running
      presenter-server: locally on 8097, and **on FIRMAMENT itself in the real stage folder** (8096).
      Phone Next advances, `goto:10` lands on slide 11 with its beats, 14 titles reported.
- [x] Talk 1: can trigger a facelift. `L` (or phone `action:facelift`) opens an overlay that reads
      `GET /facelift` and POSTs a url to the same endpoint talk2 uses; reveal embeds the same
      local build. Verified on FIRMAMENT - fell back to the pre-baked fallback with no run active.
- [x] FIRMAMENT mirror md5-matches for every changed file: `talk1-deck.html`, all 10 posters,
      `presenter-server.py` - 12/12 hashes identical both sides.
- [x] Screenshots DM'd at every stage boundary (7 DMs: stub reveal, reel wall + orphan, facelift
      overlay, bookend slides, real grandriverdance reveal, final contact sheet).
- [x] All work committed and pushed. `CURRENT_WORK.md` updated.

## Known-and-left (do not "fix" without reading why)

- No profanity/moderation filter — the kill switch covers it; touching the shared SMS handler two days
  out was judged the bigger risk.
- Wall `STUDIO_LABEL` hardcoded `'Dans Dancers'` (`StudioSage/src/app/demo/live/page.tsx:23`).
- Two leftover Jul 17 wall messages visible when the slide opens.
- `TWILIO_VALIDATE_SIGNATURE` shipped but dormant.
- **Duplicate camera burn-in**: `cam-01-wide.jpg` reads "CAM 4", `cam-02-closeup.jpg` has no number,
  `cam-03-sidestage.jpg` and `cam-04-crowd.jpg` BOTH read "CAM 3". No CAM 1, no CAM 2. Regenerate with
  `gemini-3-pro-image` via `GEMINI_API_KEY` in `~/.env.keys` (SD3.5 mangles text).
- The deck now carries the production `DEMO_RESET_TOKEN` in a tracked file. Rotate it after the talk.

## Open decisions that belong to Daniel — do NOT decide these

- Which machine actually presents (FIRMAMENT vs DART). DART is offline and unverified.
- DeepSeek 402: unsetting `DEEPSEEK_API_KEY` restarts the shared edge function.
- The 80–90% stat on the mechanic slide.
- Hosted vs local facelift reveal.
- Caledonia password handover.
- Live-demo QR variant (plain SMS intent vs pre-typed question).

## Deviation log

(append here as you go — what changed from this plan and why)

### 2026-07-26 23:10 — SCOPE CHANGE (from Daniel, mid-run)
PHASE 2 is **removed from this session's scope**. Daniel is executing the Talk 2 note fixes himself
in a parallel session. This session must NOT write to `expo-assets/decks/talk2-ai.html`,
`expo-assets/talk2.html`, or `expo-assets/talk2-ai-slides.md` — read-only, for mining patterns to
port into Talk 1. Scope is PHASE 1 (facelift live path / `presenter-server.py`) + PHASE 3 (Talk 1
video deck, phone wiring, staged screenshot review).

### 2026-07-27 03:14 - PHASE 1 root cause (measured, not guessed)
`_remote_poll()`'s ssh timing out from Windows python was **not** any of the four suspects listed
in 1.1. Measured on FIRMAMENT (python 3.10.11), same host, same command, 30s budget:

| variant | result |
|---|---|
| `run(capture_output=True)` | TIMEOUT 30.02s |
| `run(+stdin=DEVNULL)` | TIMEOUT 30.01s |
| `run(no -n)` | TIMEOUT 30.01s |
| `run(inside a daemon thread)` | TIMEOUT 30.02s |
| after an abandoned dispatch ssh | TIMEOUT 30.00s (same as baseline - not the cause) |
| **`Popen(stdout=real file handle)`** | **0.08s rc=0, 218 bytes** |

`ssh.exe` hands the pipe write end to its posix-emulation layer and never closes it, so CPython's
Windows reader thread blocks on `read()` and `communicate()` can never return. Fix: `run_capture()`
over real temp file handles for the dispatch ssh, the poll ssh and the site scp (`a27b29f`).

### 2026-07-27 03:35 - PHASE 1 second defect, found by accident, fixed
The FIRMAMENT ssh session dropped ~15 min into the real grandriverdance.com run. The build kept
going in tmux (as designed) but the **poller only ever started inside `start_facelift()`** - so a
server restart, or losing the console it was launched from, orphaned the build: it would finish on
the build host and the laptop would never collect it. This contradicted the file-based-status
comment already in the file. Added `resume_facelift_poll()` at startup (`d0a7bf6`), and verified it
against that same in-flight run: after the restart, `status.json` mtime advanced every 5s and the
finished site was pulled down and served. Also: the startup banner now prints every deck in the
folder rather than `decks[0]`, since talk1 and talk2 both live there.

### 2026-07-27 - PHASE 3 notes
- Talk 1 was committed untracked-first as a safety net (`b0cbb7d`) before any edit. `videos/` (179MB)
  is gitignored; posters are tracked.
- Defect classes from 3.1 checked against Talk 1: fonts CLOSED (embedded woff2, no `src:local`);
  overflow 0; clipping 0; orphans - one found and fixed on the close slide; over-clicking - one
  found and fixed (reel wall 7 steps -> 2); `#stage` was `overflow:visible` so the ambient beams
  painted ~270px past the frame, now `hidden` to match talk2.
- The audit harness needed two corrections of its own before it was trustworthy: it counted glyph
  line-box overflow on `overflow:visible` headings as clipping (51 false positives), and it walked
  by fragment *element* count rather than distinct click steps, which over-advanced the deck and
  shot the wrong slides. Both fixed; `.beam` bleed is excluded, per the supervisor's note.
- Four full-bleed plates were projecting their own `[PHOTO: ...]` placeholder captions. All four now
  carry real clips from `videos/`. Five posters were unusable frame-0 grabs (a white logo card, a
  fade-from-black); regenerated from the most legible frame, and the demo-slide poster was then
  re-picked by eye because the automatic pass chose an aerial of the building's parking lot.

### Left for Daniel (not decided here)
- Talk 1 slide 13 still carries `[confirm slot/time]` for the Talk 2 tease - that is his to fill.
- Which machine presents (FIRMAMENT vs DART) - untouched, DART still offline.
- `decks/facelift-out/` on SPYBALLOON still holds the Alisa rehearsal build plus a `failed` status
  from a 02:56 run that predates this session (`claude rc=127`). Left exactly as found; the real
  run tonight was deliberately routed to an isolated dir so nothing on the stage path moved.
