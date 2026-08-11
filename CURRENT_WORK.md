# Current Work - StreamStage

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
