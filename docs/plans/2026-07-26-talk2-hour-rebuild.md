# Talk 2 rebuild — 20 min → 60 min, new spine, transcript woven in (2026-07-26)

Source of truth for this rebuild: Daniel's own run-through transcript,
`StudioSage/scroll-world/.ccbot-uploads/Jul_26_at_2-54_PM.txt` (2026-07-26).
Everything below is either his words from that transcript or a fix to a weakness he flagged in it.

## Files this touches
| File | Role |
|---|---|
| `StreamStage/expo-assets/decks/talk2-ai.html` | the deck (canonical; mirrors to FIRMAMENT as `talk2-deck.html`) |
| `StreamStage/expo-assets/talk2-ai-script.md` | master script |
| `StreamStage/expo-assets/talk2-runofshow.md` | pocket cue card |
| `StreamStage/expo-assets/talk2-ai-slides.md` | slide outline (keep in sync) |
| FIRMAMENT `C:\Users\danie\Desktop\StudioSage-Live-Demo\talk2.html` | notes page (embeds script/run-of-show tabs) |

## Decisions locked
1. **Runtime is ~60 min, not 20.** Every tip gets performed with a live artifact instead of recited.
   Daniel wants MORE content, not less — nothing gets cut for time.
2. **Spine = "I'm going to give you back some of your time."** Stated in the open, paid off in the close,
   priced in the close ($20/mo vs what an hour of your time is worth).
3. **"Do the hard thing once" moves OUT.** It is Talk 1's thesis and Talk 1's closing slide. Talk 2 may
   still say "teach it once" as a *mechanic* inside tips, but the closing slide and the stated thesis
   must change. **This is a cross-talk collision in the current build — Talk 2 slide 18 currently carries
   Talk 1's exact close.**
4. **Price is $20/month, stated flatly.** No "$15–20", no "pending". Matches the shipped Stripe paywall.
5. **Website refresh = a magic trick with a planted open loop**, not an afterthought at minute 18.

---

## Weaknesses being fixed (each traced to the transcript)

| # | Weakness | Fix |
|---|---|---|
| W1 | **Tip 3 "feels hollow"** (his words). He drifts mid-tip into connectors, then trails off on "instead of?" | Rebuild Tip 3 around **connectors** (hook the LLM to your inbox/calendar), with the schedule as the *use case* rather than the tip itself. Connectors also pre-load the agentic segment. |
| W2 | **Tip 5 (handbook) is the load-bearing tip and gets the least energy** — arrives as "And then, yeah, the handbook," yet it is the entire setup for the product. | Give it real owner-side value: it is a **staff tool** (teachers/subs/new hires stop asking YOU) and a **contradiction finder** (your handbook says two different things about refunds). Then turn it: *notice who can't use this — the parents.* That gap IS StudioSage. |
| W3 | **Tips 3/4/5 blur** — the "five moves" structure stops being audible; tip 4 absorbs skills + dark valley. | Hard visual + verbal numbering on every tip slide; move "skills" and "dark valley" into their own beat between the tips and the agentic segment. |
| W4 | **Live demo has no patter** — he drops into logistics on-mic ("I can only test this number") and there is dead air while texts arrive. | Scripted narration for the wait: what it's doing, the onboarding-asks-your-name beat, the "demo dashboard looks different" disclaimer, and a flag-is-a-win line. |
| W5 | **Mechanic never explained** — he says so himself: "I should explain how it works better." | New slide: number + QR → put both on outgoing comms → parents save the number / scan at the studio → instant answer. Concrete, drawn, not argued. |
| W6 | **Website refresh collides with the pitch and the close**; two giveaways in 90 seconds. | Plant at the top (recruit slide), run in background, reveal near the end by tabbing, then ONE offer: first five studios who sign up get the same. |
| W7 | **No persistent call to action.** | New final slide that STAYS UP through Q&A and room-clear: QR, number, studiosage.ai, the first-five offer, where to find him. |
| W8 | **Brand collision** — he says "Studio stage" for StudioSage once; StreamStage and StudioSage are one phoneme apart. | One deliberate separating line early ("StreamStage shoots your recital. StudioSage answers your parents."). |

---

## New 60-minute segment map

| Clock | Segment | Content |
|---|---|---|
| 0:00–0:04 | **Open — the unison story** | "I asked a room of studio owners what one thing they'd never do again. They answered in perfect unison." Show of hands: answered parent texts during recital season? Keep them up if the answer was already in the email you sent. |
| 0:04–0:07 | **Who I am + the promise** | StreamStage vs StudioSage separating line. Technologist first / printer joke. **The spine, stated:** "I'm going to take an hour of your time, and I'm going to give you back a lot more than that." |
| 0:07–0:10 | **★ THE PLANT (magic trick, part 1)** | Recruit slide up: "Whose studio website needs a facelift?" Take one URL live, kick the refresh off from his phone, tell the room "forget about that, we'll come back to it." Second open loop running all hour. |
| 0:10–0:16 | **Tip 1 — Talk, don't type** | Live: talk into it on stage, the Monday-morning brain-dump (costumes, Tuesday ballet not filling, book photography, call StreamStage). Mic button, not voice mode — "I read faster than the robot talks." |
| 0:16–0:24 | **Tip 2 — The newsletter writes itself** | NotebookLM named. Upload every past studio email → build a template in your voice → then just talk the updates in (pajama day Friday, 12-yr-old Acro hair messy bun → high pony). **Time-is-money aside belongs here** (saving time = making money, frees attention for revenue work). |
| 0:24–0:32 | **Tip 3 — Connectors (REBUILT)** | Hook the model to your inbox/calendar. "Go through my teachers' emails and build next week's schedule." Schedule detangling becomes the *demo*, not the tip. Sets up "tools" for the agentic segment. |
| 0:32–0:40 | **Tip 4 — Your actual voice** | 20 minutes pasting old emails: a sensitive one, a fun announcement, a to-the-point one. Result: drafts that don't need de-genericising. |
| 0:40–0:44 | **Skills + the dark valley** (own beat) | If you keep correcting "that's not my voice, say it like this" — make it a one-time repeatable thing. Then the honest part: automating a 10-min task takes 30 min, then 2 min. You go through a dark valley first. That's normal. |
| 0:44–0:52 | **Tip 5 — Ask your own handbook** ★ | Staff tool + contradiction finder (see W2). Slow down. End on the turn: *who can't use this? The parents.* |
| 0:52–1:00 | **Agentic segment** | chatbot → scheduled tasks → agentic. Evolution-of-man, hammer, screwdriver: agency = using tools. Then **routine 436** ("for us it's routine 436 on the Saturday; for that kid it's the most important three minutes of their season — we cannot look away") → the 8-camera email-spider payoff. |
| 1:00–1:06 | **Pull, don't push** | Push it, push it, push it — they never see it. The daughter beat: five years old, unicorn hat, Pink Pony Club, first recital; he works in tech and still couldn't find the email. Pull is when they're ready. |
| 1:06–1:14 | **StudioSage + the mechanic** | Text a number, no app, no login, answers from your stuff, doesn't guess. **New mechanic slide (W5).** Human-in-the-loop = same confidence-and-flag as the spider. |
| 1:14–1:22 | **LIVE demo** | Wall slide with real texts + KB. Scripted patter for the wait (W4). Offline cartoon is manual-only (O / button) — the deck never switches itself. |
| 1:22–1:28 | **★ THE REVEAL (magic trick, part 2)** | Tab to the refreshed site. "You gave me that URL 75 minutes ago and I haven't touched a keyboard since." Skills compound. |
| 1:28–1:32 | **Close + CTA** | Time back, priced: $20/mo vs what an hour of yours is worth ("I hope you're making more than $20 an hour — maybe you're not"). First five studios to sign up get the same website refresh. **Persistent CTA slide stays up.** |

> **Slot is confirmed: Wed Jul 29 2026, 4:10–5:10 PM EDT, Adapt Stage, Business Track.**
> Daniel has run this and says the pacing is fine — his call, and he knows his own delivery speed.
> My earlier "~90 minutes of material" was an estimate off this map, not a measurement. Struck.

---

## Deck changes (`talk2-ai.html`, currently 18 slides)

**New slides**
- **S-plant** (after "Promise"): "Whose website needs a facelift?" — big, one line, space to write a URL. Live-loop marker.
- **S-skills / S-darkvalley**: the 30-min-now / 2-min-forever curve. Simple chart, no clip art.
- **S-agentic**: three-step ladder — chatbot → scheduled → agentic(tools). Hammer/screwdriver visual.
- **S-436**: the routine-436 line, full-bleed type. This is the emotional peak; give it its own slide.
- **S-mechanic**: number + QR → outgoing comms → save/scan → instant answer. Four-step diagram.
- **S-reveal**: holder slide for the tab-away.
- **S-CTA (persistent)**: QR + number + studiosage.ai + first-five offer + booth location.

**Changed slides**
- **S1 / open**: unison story replaces the plain show-of-hands.
- **S3 "Who I Am"**: photo already wired in; add the StreamStage-vs-StudioSage separating line.
- **S4 "The Promise"**: restate as time-back, not do-it-once.
- **Tip 3 slide**: retitled + rewritten to connectors.
- **Tip 5 slide**: staff-tool + contradiction-finder framing; ends on the parents-can't-use-this turn.
- **S13 StudioSage reveal**: price $20 stated.
- **S18 close**: **must stop using Talk 1's "do the hard thing once / pay you back all year."** Replace with the time-back close.

**Already done this session (2026-07-26)**
- Live-demo slide fixed (was auto-bouncing to the offline cartoon every time — 6s watchdog misfire).
- Auto-fallback **removed entirely** at Daniel's request: the deck never shifts itself on a wifi drop; O / "Animated version" only.
- Daniel's photo embedded on slide 3 (replaces the `[PHOTO: …]` placeholder + fake mock-screen rects).
- Inter + JetBrains Mono embedded (was a bare system stack = different typeface per presenting machine).

## Script changes (`talk2-ai-script.md`)
- Replace the stated thesis line with the time-back spine; demote "teach it once" to a mechanic.
- Rewrite OPEN (unison story), TIP 3 (connectors), TIP 5 (staff/contradictions + the turn).
- New sections: the plant, skills + dark valley, agentic ladder, routine 436, the mechanic, the reveal, the CTA.
- Delete the `[confirm price]` hedge → $20/month.
- Keep the guardrails: no Talk 1 material, no beta-client names without permission, lobby TV stays "where this goes."

## Run-of-show (`talk2-runofshow.md`)
Full rebuild for the new clock. Must add: the plant's URL hand-off, the phone-side refresh trigger,
the tab-away choreography for the reveal, and the demo patter cues.

---

## AI history beat — APPROVED, sits immediately before Tip 1 (~90 sec)

Three beats, then the pivot into "talk, don't type":
1. **For fifty years computers made you learn THEIR language.** Commands, exact filenames, Excel
   formulas, the right button in the right menu. One character wrong and it just says no. Everyone in
   this room has felt stupid in front of a computer and it was never their fault.
2. **Then they learned ours, one sense at a time.** Spellcheck, autocorrect, your phone finding your
   daughter's face in 4,000 photos, GPS understanding "take me home." Nobody called it AI — it just
   stopped making you do the work.
3. **Now they've learned the whole thing: plain English.** The breakthrough is the INTERFACE, not
   robots. Most powerful software ever built, ships with a text box and no manual.

Pivot: *"which means the fastest way to use it isn't typing carefully — it's talking."*

**Pays off twice:** the agentic segment later extends the SAME timeline by one step — "then it learned
to use tools" — so chatbot → scheduled → agentic lands as the next line of a story they already heard
rather than as jargon. The history slide becomes the spine of every technical explanation in the talk.

## Additional deck improvements (2026-07-26 review)

| # | Finding | Action |
|---|---|---|
| D1 | **Tip 5 is the ONLY tip with no MONDAY box** (verified in markup — tips 1–4 all have one). The load-bearing tip ends with no takeaway. Script has the move ("upload the handbook, ask it the three questions parents ask most"); it never reached the slide. | Add it. |
| D2 | `#counter` (15/18) is presenter UI, not audience UI. An hour-long deck gives the room no sense of place. | Thin chapter rail: OPEN · 5 MOVES · HOW IT WORKS · THE PRODUCT · CLOSE, current segment lit. |
| D3 | No map of the talk. | Map slide after the promise: five moves, then the one I built. |
| D4 | Near-every slide is type on near-black — fine at 20 min, flattens at 60. | Three full-bleed image beats: routine 436, the daughter, the website reveal. |
| D5 | Three accents running at once (cyan, amber, sage). Sage is StudioSage's brand. | Hold sage until the product act so its arrival IS the turn. Audit earlier slides for sage leakage. |
| D6 | Tip slides assert without evidence; an hour of that invites doubt. | Real artifacts: actual NotebookLM upload, actual voice-typing, actual connector pulling teacher emails. |
| D7 | He takes shout-outs and promises callbacks (lobby TV) with nowhere to hold them. | Parked-questions slide. |
| D8 | Number + QR only on the final CTA slide; people photograph the screen at unpredictable moments. | Persistent footer with number + QR on the last three slides. |

## Presenter remote / phone notes — feasibility (asked 2026-07-26)

**Volume-button advance from a phone web page is NOT buildable.** Neither iOS nor Android exposes
volume keys to a web page — the browser never receives the event. Native app only. Options:

- **A — Hardware BT presenter remote (~$20).** Pairs to the laptop as a keyboard, sends arrow keys.
  The deck already navigates on arrows → **works today, zero code.** No notes screen.
- **B — Phone as notes + tap-advance.** Serve the deck from a tiny local server; phone joins the
  laptop hotspot, opens `/remote`: current slide's notes + big Prev/Next tap zones, live-synced.
  ~half a day + rehearsal. Tap zones beat volume buttons anyway (no accidental volume changes).
- **C — Both (RECOMMENDED).** Clicker advances, phone shows synced notes read-only.

Any phone↔laptop link depends on the hotspot surviving a hall full of radios → the printed
run-of-show stays in his pocket regardless.

## Published session description (the promise the room bought)

**"Why AI? Save Your Studio Time, Money, and Stress"** — Business Track, Adapt Stage,
Wed Jul 29 2026 4:10–5:10 PM EDT.

The published copy validates the spine: the session is SOLD as saving time. It also names specific
content — parent-email FAQ bots, AI-assisted newsletters, automated follow-up workflows,
human-in-the-loop, keeping the studio's personal voice, scheduling questions, staff time — all of
which now have beats.

**Gap found and closed:** the copy explicitly promises *"where AI can help, where it should not
replace a human."* There was no beat for it. Added "Where AI Should NOT Replace You" (hand over the
repeats / never hand over the conversations; if it changes how a family feels about their kid, that's
you). ⚠ Do not cut that slide — it is a published promise.

**Still under-served vs the copy:** "money" and "stress" are in the TITLE but the deck leans almost
entirely on "time". "Reminders" and "automated follow-up workflows" are named in the copy but only
appear inside the email-watcher story rather than as their own beat.

## Open items — need Daniel
1. **Daughter photo** — beat is APPROVED (2026-07-26, "me the dance parent and my daughter is a good
   beat"). Still need the actual image file.
2. **Competition livestream photo** for the routine-436 slide — does one exist to use?
3. **Refresh trigger mechanics**: he says he can run it from his phone. Needs a rehearsed path (DM the
   URL → session runs the facelift skill → deploys → he opens it in a pre-warmed tab) and a
   **fallback if it fails live** — a pre-baked refresh of a known site.
4. Whether the free-refresh offer for the first five signups is a **standing commitment** (real work per studio).
5. Presenter-remote path: A, B, or C.

*(Resolved: "watch out for those crocodiles" was dictation garbage — ignore. Asset alignment across
deck/script/slides/run-of-show is already an acceptance criterion below.)*

## Acceptance
- Deck runs 1 → last slide with no JS errors, no overflow on any slide, fonts loaded (`document.fonts` all `loaded`).
- Live slide holds indefinitely; O and the button still shift manually.
- No Talk 1 signature material anywhere in Talk 2.
- Script, slides outline, run-of-show and deck all state the same spine, the same tip 3, and the same price.
