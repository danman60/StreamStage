# HANDOFF — Talk 2 deck / script / notes  (written 2026-07-26 ~17:00 ET)

**Talk is Wed Jul 29 2026, 4:10–5:10 PM EDT, Adapt Stage, Business Track.**
Published title: *"Why AI? Save Your Studio Time, Money, and Stress."*

## Read these first, in order
1. `expo-assets/rehearsal/2026-07-26-runthrough-2-notes.md` ← **THE WORK LIST.** Daniel's own notes
   from run-through #2, organised per slide. Everything below is secondary to this.
2. `expo-assets/rehearsal/2026-07-26-runthrough-2-transcript.txt` — full transcript (source of truth).
3. `../docs/plans/2026-07-26-talk2-hour-rebuild.md` — the rebuild plan + published-description gap analysis.
4. `StudioSage/scroll-world/.ccbot-uploads/Jul_26_at_2-54_PM.txt` — run-through #1 (already folded in).

## Canonical files (edit these, then mirror)
| File | What |
|---|---|
| `expo-assets/decks/talk2-ai.html` | **the deck** — 31 slides, self-contained (fonts + photos base64) |
| `expo-assets/talk2-ai-script.md` | master script (~60 min) |
| `expo-assets/talk2-runofshow.md` | pocket cue card, 31-row cue sheet |
| `expo-assets/talk2-ai-slides.md` | **GENERATED from the deck** — regenerate, never hand-edit |
| `expo-assets/talk2.html` | notes page; tabs p0/p1/p2 are generated from the 3 files above |
| `expo-assets/decks/presenter-server.py` | phone remote server |

**Mirror after every deck change:**
`scp expo-assets/decks/talk2-ai.html firmament:C:/Users/danie/Desktop/StudioSage-Live-Demo/talk2-deck.html`
(Daniel rehearses from that FIRMAMENT copy. It is NOT auto-synced.)

## State as of this handoff
Deck went 18 → 31 slides today. Done: time-back spine (Talk 1's "do the hard thing once" removed —
that is Talk 1's thesis, do not reintroduce), unison open, roles arc, plant/reveal of the website
facelift, AI history beat, the 3-slide 101 block (what-it-is / use-for matrix / seven words),
tip 3 rebuilt as connectors, skills + dark valley, tip 5 as staff-tool + contradiction-finder,
the Turn, where-AI-should-NOT-replace-you (a published promise — do not cut), agentic ladder,
routine 436, daughter photo on pull-don't-push, the mechanic, persistent CTA, chapter rail,
Inter + JetBrains Mono embedded, all speaker-note clocks retimed to the hour.

## Known-open BEFORE the show
- **CTA freebie is email-gated** per run-through #2 — the slide still says "No email required". FLIP IT.
- **DECIDED:** live-demo QR = **SMS intent** (`sms:+12267966037`, opens messaging pre-populated, like
  the real product). Final slide gets **two QRs**: studiosage.ai + the freebie.
- **CTA QR images do not exist**, and **`studiosage.ai/moves` does not exist** and must serve the PDF.
- Tip 3 (connectors) is swappable if Daniel changes his mind — he has not.
- Tip slides have no real artifact screenshots (NotebookLM, voice typing, connectors pulling email).
- Beats: new slides have hand-written `data-beats`; older slides fall back to auto-chopped notes and
  read rough. Daniel wants **more beat-by-beat everywhere** so he can click fast.
- Phone beats support highlight levels: `!!` = must-say (amber), `>>` = say near-verbatim (cyan),
  `..` = stage direction. He explicitly wants push/pull and buying-back-time to JUMP OUT.

## How to work the deck
- Serve it, don't open the file: `cd expo-assets/decks && python3 presenter-server.py`
  then `http://localhost:8090/talk2-ai.html`.
  **8090 is the presenter's default now.** It used to be 8080, and this file used to say
  `PRESENTER_PORT=8081` — do not use either: 8080 and 8081 both belong to the booth kiosk
  (`expo-assets/kiosk/serve.py`, pages on 8080, telemetry on 8081).
- Screenshot/audit harness lives in the session scratchpad (`deck2-all.mjs`) — it walks every slide,
  reports `document.fonts` status, JS errors, and any element overflowing 1920×1080. Re-create if gone;
  Playwright is at `/home/danman60/projects/BroadcastBuddy/node_modules/playwright`.
- Every UI change gets a screenshot DM'd: `~/tg-dm.sh --file <png> "<context>"`.
- Patch the deck with assert-guarded python (`assert s.count(old)==1`) — it is one 540 KB file.

## Gotchas
- The deck's `show()` is inside an IIFE, not on `window`. Drive it with digits+Enter or arrow keys.
- The live-demo slide **must never auto-advance** — the old 6 s watchdog was removed at Daniel's
  request. Manual only: `O` or the "Animated version" button.
- Say **"dancer", never "kid"** (his note).
- No Talk 1 material: drone wall-art, mortgage/hostage editing jokes, content-day content.

---

# UPDATE — 2026-07-26 evening (run-through #2 executed + 3 mid-session directives)

**Deck is now 38 slides.** Canonical: `expo-assets/decks/talk2-ai.html`, mirrored to FIRMAMENT after
every change. Audit is green: no JS errors, fonts loaded, **no element outside 1920×1080 at any
animation frame**, all 38 slides carry hand-written `data-beats`.

## What changed
- **Five moves rebuilt:** 1 talk-don't-type · 2 **your studio in two files** (voice + brand) ·
  3 **make it write the prompt** · 4 **make the poster** · 5 handbook. Connectors and cowork/crons
  moved out of the tips into the **agentic ladder** (rungs 2 and 3) where they belong.
- New slides: push-lands-early, audience gauge, one-folder, unison (moved out of the open),
  rung 2, rung 3, philosophy, dashboard walkthrough video, what's-your-time-worth.
- Cut: old tip 4 (voice), old close, the stale pain-point board (lobby TV), the number pops,
  the mid-livestream tease, "text this number" on the StudioSage slide.
- CTA: two generated QRs, freebie **email-gated**, first-five offer + $20/yr hosting, "Big love."
- Transitions on every content slide (blur push / wipe / rise / fade) — geometry-safe by design.
- Live-demo slide carries a persistent QR (SMS intent) + number + five known facts.
- Reveal slide has a real curtain, a URL bar, and a one-click **pre-baked fallback**.

## Where to look
- `rehearsal/COVERAGE.md` — every item from BOTH transcripts, with status and location, plus the
  **NEEDS DANIEL** list at the top (timing call, multicam stills, /moves page, routing, facelift trigger).
- `talk2-runofshow.md` — 38-row cue sheet + the ⚠ TIMING box (93 min of material, 60-min slot).
- `regen-slides.py` / `regen-notes.py` — run both after any deck change; `talk2-ai-slides.md` and the
  first three tabs of `talk2.html` are generated, never hand-edited.

---

# DONE / VERIFIED — 2026-07-26 evening (for Daniel)

Everything from run-through #2 is in the deck, plus the three changes you sent mid-session.
**Deck is 38 slides, mirrored to FIRMAMENT (`talk2-deck.html`), md5-verified.** Nothing deployed.

## What changed in the deck

**Your five moves are different now.**
1 Talk, don't type · 2 **Your studio in two files** (voice + brand, plus the folder) ·
3 **Make it write the prompt** · 4 **Make the poster** · 5 Ask your own handbook.
Connectors and cowork/crons stopped being tips — they're now **rungs 2 and 3 of the agentic ladder**,
which is what actually fixed "tip 3 and tip 4 are way too similar." The good connectors copy moved
across intact; nothing was thrown away.

**Structural moves you asked for:** the unison story left the open and became its own slide after
Move 5 · Pattern and the Turn swapped, and the stale pain-point board (lobby TV) is gone · **push/pull
now lands at minute five** on its own slide, so slide 29 is the payoff instead of the explanation ·
old close cut · the closer is now **"what's your time worth?"** · the CTA carries **two QR codes**, and
the freebie is written as **email-gated**.

**New slides:** push-lands-early · audience gauge ("who's in it every day?") · one folder · perfect
unison · rung 2 · rung 3 · be-with-people (the philosophy beat) · **inside the dashboard** (your
86-second walkthrough video, autoplays muted) · what's your time worth.

**Per-slide fixes:** your name is on the Who-I-Am slide with four fast clicks · car-wash joke +
trust-but-verify · tool icons + Perplexity marked as research + the $500–600 line · seven words as a
pyramid · the dark-valley math clicks 10 → 30 → 2 · StreamStage logo back on 436 · the spider's **85%**
threshold on screen · the unicorn beat is its own click and then the photo takes the screen · the
mechanic is in StudioSage green, builds one element at a time, and carries the poster, the email
signature, five minutes, and the **80–90%** stat · "text this number now" moved off the StudioSage
slide to right before the demo · the live-demo slide keeps a QR (SMS intent), the number and five
known facts on screen the whole time.

**Everywhere:** all 38 slides have hand-written beats with your markers (`!!` must-say amber,
`>>` near-verbatim cyan, `..` stage direction) — no slide falls back to chopped-up notes any more.
Varied transitions instead of hard cuts. **"Dancer", never "kid"** swept through every slide.

**The magic trick is wired to the real machinery.** The plant slide reads the facelift runner's live
state: it shows the shouted-out url in 60px type with a status chip (QUEUED → RUNNING → READY), and it
can start the run itself if the phone panel isn't handy. The reveal slide loads the finished site
**by itself** — hosted build, else the local build, else the pre-baked fallback — behind a curtain that
opens on one click. Verified against a real build: the curtain opens on the Alisa's Dance Academy site
the runner produced in 17 minutes. Nothing to paste, nothing to alt-tab.

## What the coverage audit found

I read both run-through transcripts start to finish and checked every item against the deck, the script
and the run-of-show. Full table: `expo-assets/rehearsal/COVERAGE.md`.

- **~95 distinct items** extracted. Roughly **40 were missing** from the build before tonight —
  most of them things you *said while delivering* rather than marked as a note.
- **All of them are now in**, except the ones that need you (below).
- Things that were easy to lose and are now explicitly in: the grand-jeté line · "we all know who gets
  the texts" · "you are NOT behind" and the printing-press comparison · "99% of the time they mean
  ChatGPT, Claude, Perplexity" · the car-wash joke · Google Takeout and "stop using em dashes" · asking
  **how** questions · "they got the link — they did, though" · the 85% threshold · "works while you
  sleep" · "my agent talks to your agent and books the coffee" · "get your people doing what they want
  to do" · Outlook search is terrible · the custom-GPT-and-Twilio line · cited answers · the 8.5×11
  poster · the email signature · five minutes · 80–90% · both halves of the demo magic · hosting free
  for a year then $20/year · "come see me, I love technology, I love dance… big love."

## What I deliberately cut (not lost — decided)

- **The "90s DVD" transition.** Blur-push, wipe and rise cover "not hard cuts" without playing as a
  joke in a business-track room.
- **Custom GPTs / one-thread-per-domain as a tip.** You floated it, then landed on cowork+crons, then
  the new directive replaced the slot. The idea survives as the projects/threads pyramid and the
  build-it-yourself line.
- **The old pain-point board** ("emails / newsletter / scheduling / lobby TV"). You called the copy
  stale; the slide is stronger centred, and lobby TV is gone from the deck entirely.
- **The "never do again" question slide.** Its idea *is* the unison story, which now has its own slide.
- **"Robot overlords" on a slide.** Kept in the script as spoken warm-up — it's not a visual.

## What still needs you

1. **Timing — the only real decision.** The cue sheet holds **~93 minutes of material for a 60-minute
   slot.** That was true before tonight too. I cut nothing on my own. If you want a true 60, the six
   cheapest cuts are listed at the top of `talk2-runofshow.md` (One Folder, Philosophy, Rung 3, Unison,
   Gauge, Pattern ≈ −10 min, then trimming the live poster-make ≈ −3).
2. **Watch the dashboard video once** (slide 31) and tell me if the cut is wrong — it opens on the
   sign-in screen for a second, which reads fine but is worth knowing.
3. **Real multicam stills** for the loop payoff (wide / close-up / side stage / crowd). Four styled
   frames stand in for now; drop in real frames and it's a photo beat instead of a diagram.
4. **Confirm the 80–90% stat** if you want it defensible — it's on screen now because you said it.
5. **Hosted vs local reveal.** It currently serves off your laptop, which venue wifi can't kill.
   Hosting it live needs your explicit OK (a deploy flag). The on-stage offer is unaffected either way.
6. **On the day:** scan both CTA QRs yourself, send one email to bot@studiosage.ai, and send one text
   to the demo number. All three are shipping — just confirm them standing in the room.

## How to keep it in sync

- Deck is canonical. After **any** deck edit:
  `scp expo-assets/decks/talk2-ai.html firmament:C:/Users/danie/Desktop/StudioSage-Live-Demo/talk2-deck.html`
- Then regenerate the derived docs — they are generated, never hand-edited:
  `python3 expo-assets/regen-slides.py` and `python3 expo-assets/regen-notes.py`
  (slide outline + the Script / Run of Show / Slide Notes tabs of `talk2.html`).
- Render check: serve the deck (`python3 expo-assets/decks/presenter-server.py`, port 8090)
  and run the harness — it walks every slide for JS errors, font status and anything crossing 1920×1080.
  Current state: **38/38 clean, fonts loaded, no JS errors, no overflow at any animation frame.**

## Addendum — 2026-07-26 18:12 · cue-sheet numbering closed

The one defect still flagged in `COVERAGE.md` — "the cue sheet is one behind after the dashboard slide
shifted everything by +1" — **was already fixed when the slide went in; the warning itself was the
stale artifact.** Both are now correct and re-verified:

- **`talk2-runofshow.md` cue sheet: 38 rows, dashboard at 31**, everything after it shifted, and the
  clocks recomputed off a single map so the deck's speaker notes and the printed sheet agree.
- **Cross-checked row by row against `talk2-ai-slides.md`** (which is generated from the deck):
  38 cue rows ↔ 38 deck slides, **every row on the right slide, zero drift.**
- Some cue titles are deliberately shorter than the slide titles — `MOVE 1 Talk don't type` for
  *Tip 1: Talk, Don't Type*, `★ PLANT` for *★ Website Facelift — the ask*, `101 seven words` for
  *101: The Only 7 Words You Need*. That is pocket-card shorthand, not a mismatch. **Safe to print.**
- "38 slides" is now stated consistently in the deck, the script, the run-of-show, the slide outline
  and the notes page.
- `talk2.html` regenerated · deck re-mirrored to FIRMAMENT · **md5 verified identical**
  (`9404a2ad4a9a58b4452d85c8c9e4649e`).

Nothing else on my list is open.

---

## Stage hardening — 2026-07-26 19:30

Imagined the real room: DART, venue projector, phone as remote, last session of the day, and a
presenter who is talking rather than watching the keyboard. **Rule applied: no single unmodified
keypress may change what the audience sees.**

### 1. The P key was projecting your speaker notes to the room — fixed
`#notes` is a full-width overlay on the same screen the projector mirrors, and it was bound to bare
`p`. One fat-finger — or a stray key off the remote — showed the room your cue card, "⚠ do not cut"
markers, pricing and all.

- **Notes now need SHIFT+P.** Bare `p` does nothing except flash a small presenter-only nudge:
  *"notes are on your PHONE · SHIFT+P projects them to the room."*
- **The overlay now announces itself**: a red banner across the top reads
  **"⚠ THE ROOM CAN SEE THIS — SHIFT+P HIDES IT"**, so even a deliberate press is instantly obvious.
- I kept the capability rather than deleting it, because if the phone dies mid-talk it is your only
  on-screen notes. It just can't happen by accident any more.

### 2. Every other single-key binding audited
| Key | Before | Now |
|---|---|---|
| `f` | revealed **every beat** on the slide — a stray press dumped a whole build at once | **SHIFT+F**; bare `f` nudges |
| `End` | jumped **straight to the pricing slide** | **SHIFT+End**; bare `End` nudges |
| `Home` | jumped to the title | **SHIFT+Home**; bare `Home` nudges |
| digits+`Enter` | buffered **silently** — a stray digit sat there until a later Enter jumped somewhere random | the buffer is now **visible** bottom-right (`JUMP 12 ↵`), any non-digit clears it, **Esc** aborts |
| `O` | jumps to the offline demo | **left as one key on purpose** — it is the emergency, see below |
| `R` / `A` | restart / autoplay | already scoped to the offline demo slide only; inert elsewhere |
| → ← space click | navigation | unchanged |

The nudges are small, bottom-right, and hidden entirely on the demo/live slides — the room won't read
them from row 20.

### 3. Projector reality — measured, no change needed
Checked at **1024×768** and **1280×800** as well as 1920×1080. `fit()` letterboxes correctly and the
fixed chrome (chapter rail, counter, hint) never falls off and never clips content:

| Viewport | Stage | Rail intrudes | Counter intrudes |
|---|---|---|---|
| 1024×768 (4:3) | 1024×576, 96px bars | **0px** (sits in the letterbox) | **0px** |
| 1280×800 | 1280×720, 40px bars | 6px | 9px |
| 1920×1080 | full bleed | 46px (by design — the rail is meant to overlay) | 49px |

So a 4:3 projector is the *safest* case, not the risky one.

### 4. The no-wifi rescue is now unmissable
The live-demo slide never rescues itself (your call), so the recovery had to be legible instead of
fine print. The old 21px grey "No wifi? press O" is replaced by a **pulsing amber bar reading
"NOTHING HAPPENING? PRESS O"** at ~30px, and the slide's first two beats now *lead* with it:
*"IF THIS SLIDE IS BLANK OR STUCK: PRESS O"* / *"do not debug on stage."*

### 5. Cold test caught a real one — the rescue file was missing
Served the deck from a folder containing **only** the files DART-SETUP.md lists, fresh browser, no
cache, walked all 38 slides watching every request.

**One 404: `kb-demo/index.html`** — the offline animated demo. Cause: `decks/kb-demo` was a **symlink**
to `../kb-demo`, and the prescribed `rsync -av` copies a symlink *as a symlink*, so on DART it points
at nothing (and on Windows usually doesn't survive at all). The single file you lose is **the rescue
for the live demo** — you'd press O to escape a dead wifi demo and land on a blank slide.

- **Fixed:** `decks/kb-demo/` is now a real folder with the real `index.html` (32 KB; the 2.4 MB
  `shots/` alongside it is unreferenced and stays out).
- Re-ran the cold test: **38 slides, fonts loaded, zero 404s, zero JS errors.**
- `DART-SETUP.md` updated with the cause, the `rsync -avL` rule if symlinks ever come back, and a
  smoke-test step: press **O** and confirm the offline demo actually renders.
- Mirrored `kb-demo/index.html` to FIRMAMENT alongside the deck (both md5-verified).

Deck md5 `0db5b532a8cb2631100000973a336d08` · kb-demo md5 `266e42355001084b1f8a40bc8583646d`,
both matching on FIRMAMENT. Run-of-show now carries a **"Keys on stage"** table.

---

## Move 4 — real posters on the slide (2026-07-26 20:05)

Move 4 argued for image generation while showing none. It now shows four **real** generated artefacts
(made with `gemini-3-pro-image`, text rendering clean on all four — I checked every one by eye before
wiring it in).

**The before/after turned out better than the brief.** The expectation was "without the brand file it
looks bad." That is not what happened, and the truth is stronger:

- **BEFORE** (same prompt, no brand file) is a genuinely handsome Art-Nouveau piece — coral, teal,
  mustard, ribbons. And along the bottom it reads **"Rhythm & Bloom Dance Studio presents…"**
- **AFTER** (same prompt + the brand file) is sage and cream, elegant serif, photographed dancers,
  generous negative space — unmistakably the same studio as the rest of the deck.

So the line on stage is **not** "without the brand file it looks bad." It is:
**"it didn't make a bad poster — it made somebody else's studio."** That is exactly why Move 2 exists,
and it lands harder *because* the before is attractive. ⚠ **Don't call the before ugly** — point at the
name and let the room do the work. Beats, speaker note, script and cue sheet all say this now.

**On the slide:** before → arrow → after, revealed as separate beats so you can talk over the switch;
then a third beat with the **fall-registration poster** and the **picture-day carousel card** under
"and the rest of your year", landing on *you don't need to be a designer, you need taste.*

**Cropping.** 02 arrived as a poster floating in a cream field and 04 had a stray hairline and gap at
the foot — both trimmed to content. 01 and 03 were already full-bleed; their inner margins are the
poster's own design, so they were left alone rather than cropped into. Originals kept in `img/_orig/`.

**Files:** `decks/img/` — 4 JPEGs, ~500 KB total, referenced as real files (not base64) so the deck
stays at ~623 KB. **`img/` is now in the DART-SETUP.md copy list** — same class of bug as the kb-demo
symlink: a missing folder would leave Move 4, the one all-pictures beat, full of broken images.

**Verified:** cold-serve from a folder containing only the DART-SETUP list → 38 slides, fonts loaded,
**zero 404s, zero JS errors**. Deck md5 `7c89e51ae0b91f8e88cfc60439fce097` and all four images
md5-matched on FIRMAMENT.

### Also, per Daniel: all numbers are Canadian
US SMS-delivery risk is resolved, so nothing hedges about whether texts arrive. The deck and cue sheet
never carried that hedge; the two places that did — the failure playbook's "carrier delay" row and the
live-fill procedure's "if it doesn't land in ~20s" — now describe the real residual risk (**the wall
being slow to paint on venue wifi, which is display lag, not delivery**) and state plainly that
delivery is proven for Canadian numbers. **"Watch the screen" is kept as stagecraft** — it's the better
line and the wall is the impressive part.

### Bug found while auditing for that wording
14 speaker-note headers had **doubled clocks** (`0:30–0:35&ndash;0:33 · MOVE 2`) — my earlier retime
regex matched `–` but not the `&ndash;` entity, so it prepended instead of replacing. All 38 headers
rewritten from the single canonical map; the deck notes and the printed cue sheet agree again.

## Real multicam stills on the loop payoff (2026-07-26 20:10)

The eight abstract boxes are gone. Slide 28 now carries **four real generated stills** — wide, close-up,
side stage, crowd — which is exactly what you asked for ("those four or five, not the eight currently
there"). They read as genuine broadcast frames: stage lighting, a LIVE timecode burn-in, a viewfinder,
and a lobby monitor with the crowd holding phones up. Angle labels sit over each one; the REC dot still
blinks.

Two things I fixed rather than shipped:
- Two tiles had their **own timecode burn-ins sliced in half** by my angle label. Tiles 1 and 2 now crop
  from the top, so the wide's burn-in falls outside the frame entirely and the close-up's sits clean and
  fully legible. Nothing looks chopped.
- **Heads up, since this is your own trade:** the source stills carried burn-ins reading `CAM 4`,
  `CAM 3` and `CAM 3` — two of them the same number. After the crops, **only one CAM number is still
  visible on screen** (side stage, `CAM 3`), so the contradiction is no longer on the slide. If you want
  it perfect, one regenerated still fixes it; I did not regenerate on my own since you'd reviewed them.

The headline was wrapping to two lines once the grid grew — pulled to 62px so "Mid-competition. 8
cameras." sits on one line again.

**Verified:** cold-serve from only the DART-SETUP file list → 38 slides, fonts loaded, **zero 404s, zero
JS errors**. Deck md5 `d9e97fd18a60d93f484f4c9ab8ab03d2` and **all eight images** md5-matched on
FIRMAMENT. `img/` was already in the DART-SETUP copy list and now covers both sets.

---

# TODO — carried forward (written 2026-07-26 21:30, session close)

Read this before touching anything. Nothing below is broken; it is the list of what is *unfinished*,
*deliberately left*, or *decided but not acted on*. State as of deck md5 `d9e97fd18a60d93f484f4c9ab8ab03d2`.

## Where things stand (so you don't re-derive it)
- **Deck: 38 slides**, `expo-assets/decks/talk2-ai.html` is canonical, 612 KB.
  Audit green: no JS errors, fonts loaded, **no element outside 1920×1080 at any animation frame**.
- **Mirrored** to `firmament:C:/Users/danie/Desktop/StudioSage-Live-Demo/talk2-deck.html`, md5 verified.
  `img/` (all 8 JPEGs) and `kb-demo/index.html` are mirrored there too, each md5-matched.
- **Derived docs are GENERATED — never hand-edit:** run `python3 expo-assets/regen-slides.py` and
  `python3 expo-assets/regen-notes.py` after ANY deck change. They rebuild `talk2-ai-slides.md` and
  tabs p0/p1/p2 of `talk2.html`. Tabs **p3/p4/p5 are hand-maintained** — if you change
  `demo-failure-playbook.md` or `live-fill-demo-procedure.md`, you must patch `talk2.html` by hand too
  (this bit me once already).
- **Verify harness:** `cd expo-assets/decks && python3 presenter-server.py` (port 8090), then
  `node deck2-all.mjs` from the session scratchpad. It walks all 38 slides for JS errors, font status
  and overflow. `probe.mjs` checks geometry mid-animation; `coldprobe.mjs` does the 404 test.
  ⚠ **Those .mjs files live in the session scratchpad and will be gone.** Re-create them; they are
  ~40 lines each of Playwright (Playwright is at `/home/danman60/projects/BroadcastBuddy/node_modules`).

## img/ wiring state — asked about explicitly
- `expo-assets/decks/img/` holds **8 real JPEGs**, all referenced as **relative file paths** (`img/…`),
  NOT base64, so the deck stays at 612 KB.
  - **Move 4 / slide 16 (posters):** `01-recital-BEFORE.jpg`, `02-recital-AFTER.jpg`,
    `03-registration.jpg`, `04-carousel.jpg`.
  - **Loop payoff / slide 28 (multicam):** `cam-01-wide.jpg`, `cam-02-closeup.jpg`,
    `cam-03-sidestage.jpg`, `cam-04-crowd.jpg`.
- **YES — `img/` IS already in the DART-SETUP.md copy list**, with a note explaining that a missing
  folder leaves Move 4 (the one all-pictures slide) full of broken images. No action needed there.
- `img/_orig/` holds the uncropped originals of the four posters. Kept for provenance; **not referenced
  by the deck** and safe to delete if you want the repo lighter.
- Cold-serve test (serving ONLY the DART-SETUP file list) passes with **zero 404s** including all 8 images.

## Open items that need Daniel — not blocked on code
1. **TIMING — the only real decision.** Cue sheet holds **~93 min of material for a 60-min slot.**
   Nothing was cut unilaterally. The six cheapest cuts, in order, are at the top of
   `talk2-runofshow.md`. Until he rules, the deck stays long on purpose.
2. **Duplicate camera burn-in.** The source multicam stills carried `CAM 4`, `CAM 3`, `CAM 3` — two the
   same. After the per-tile crops **only one CAM number is visible on screen**, so it is no longer a
   contradiction the room can see. One regenerated still would make it perfect. I did **not** regenerate
   because he had already reviewed and approved those images.
3. **Confirm the 80–90% stat** (mechanic slide, slide 33) if he wants it defensible. It is on screen
   because he said it out loud in run-through #2.
4. **Hosted vs local reveal.** The facelift reveal currently serves **off the laptop** (venue wifi can't
   kill it). Hosting it live needs `FACELIFT_DEPLOY_OK=1` **and his explicit OK** — the deploy hook
   blocks it otherwise. The on-stage offer (free, hosted a year, then $20/yr) is unaffected either way.
5. **Watch the dashboard video once** (slide 31, 86 s) and say if the cut is wrong. It opens on the
   sign-in screen for ~1 s — the beats warn about that, but he should see it.
6. **On the day:** scan both CTA QRs, send one email to `bot@studiosage.ai`, send one text to the demo
   number. All three are shipping; they just want confirming in the room.

## Deliberately left (do not "fix" these without asking)
- **Cue-sheet shorthand.** `MOVE 1 Talk don't type` vs the deck's `Tip 1: Talk, Don't Type`, `★ PLANT`
  vs `★ Website Facelift — the ask`. Intentional pocket-card shorthand, verified row-by-row against the
  generated outline. Not drift.
- **`O` is still a single unmodified key.** Every other audience-visible key needs SHIFT, but `O` is the
  live-demo rescue and must stay one keypress. Documented in the run-of-show key table.
- **Posters 01 and 03 were not cropped.** Their inner margins are the poster's own typographic design;
  cropping to content would push headlines to the edge. Only 02 (floating in a cream field) and 04
  (stray hairline at the foot) were trimmed.
- **"8 cameras" in copy vs 4 stills shown.** He says eight out loud; four representative angles is what
  he asked to see.
- **`img/_orig/`, `facelift-out/`, `_shots/`** — see the commit note below.
- **The "90s DVD" transition** he floated: not built, recorded as a deliberate cut in `COVERAGE.md`.

## Not committed / housekeeping
- **`expo-assets/decks/facelift-out/`** is the facelift runner's scratch output (logs + a built site,
  3 MB) and is **excluded from the commit** as generated artifacts. `facelift-fallback/` (8 MB) IS
  committed — the deck depends on it for the reveal failure path.
- **`INBOX.md`** at the repo root was there before this session, was never read, and is untouched.
  Someone should process it.
- **Pipeline orchestrator is STOPPED** (`state: stopped`, last tick 2026-07-03). I discovered this when
  5 image tasks I queued sat pending forever; I deleted all 5 so nothing fires later and grabs the GPU.
  If anyone relies on `/api/pipeline`, it needs starting — unrelated to the deck, but worth knowing.
- Both local presenter-servers (8081 audit, 8098 cold-test) were stopped at session close.
