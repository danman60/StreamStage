# Talk 2 — the running order as BUILT

**Tue Aug 11 2026, 09:20–10:20, Adapt Stage, Calgary.** Built 2026-08-07 into
`expo-assets/decks/talk2-ai.html`. 38 slides → **31 in the running order + 1 off-run rescue**.

This implements `TALK2-REORG-PROPOSAL-2026-08-05.md` with the three corrections the build brief
called out. Where this file and the proposal disagree, **this file is what is in the deck.**

---

## 1. The facelift stays — and the proposal's reason for cutting it does not survive contact

The proposal recommended cutting the facelift plant + reveal, partly on the grounds that it is
"a 60–90 min background job started at minute 11". That figure comes from
`decks/FACELIFT-CONTRACT.md:115`. **Both recorded runs contradict it.**

Primary source, `decks/facelift-out/status.json` — the actual Stepping Up run from the stage:

```json
{"url": "https://steppinupdanceco.ca/", "status": "ready", "stage": "done",
 "started_at": 1785356381, "updated_at": 1785357647}
```

| | Epoch | Eastern |
|---|---|---|
| started | 1785356381 | 2026-07-29 **16:19:41** |
| ready · done | 1785357647 | 2026-07-29 **16:40:47** |
| **elapsed** | **1266 s** | **21 minutes** |

The talk began at 16:10. So the rebuilt site was **finished at minute 31 of a 60-minute talk**, and
the reveal was attempted around minute 50 — it had been sitting done for roughly twenty minutes.
The contract's own header records an earlier validated run at **17 minutes**
(`FACELIFT-CONTRACT.md:7-10`). Two runs, 17 and 21 minutes; the 60–90 figure matches neither.

**The build was never late. The reveal was broken.** On mic he ends up showing "your original one
served locally" (`ExpoMic.txt`, reveal block) — a wiring failure, not a duration failure.

So the beat is affordable, and Daniel's call to keep it is well-supported. Planting at **6:30** and
revealing at **54:30** gives **48 minutes of runway against a measured 21-minute job — 2.3×
headroom.**

⚠ **Two things to fix before stage, neither of which is deck work:**
1. `FACELIFT-CONTRACT.md:115` should be corrected to ~21 min, or the next person re-derives the
   wrong conclusion. `facelift-run.sh:97-98` says "~75 minutes" and is wrong the same way.
2. **Rehearse the reveal specifically.** Confirm the chip reads READY *and* that what is behind the
   curtain is the NEW site, not the scrape. Verified working in the harness tonight — the reveal
   loaded `/facelift-site/index.html`, title *"Steppin' Up Dance Co. — Dance For All Ages | Sarnia
   & Petrolia, ON"*, 51 KB of real markup — but that is one machine, once.

## 2. The SMS demo did not move
Old 34 → new 27, same neighbours (after human-in-the-loop, before the close). The room texts it.

## 3. The clock

Two live beats, deliberately **separated by the Q&A block** so a second failure cannot chain onto a
first, and the robust one (forty phones) runs before the fragile one (one external job).

| # | Slide | In | Len | From |
|---|---|---|---|---|
| **ACT 1 — HOOK** | | **0:00** | **5:30** | |
| 1 | Title / Open | 0:00 | 1:00 | old 1 |
| 2 | ★ Oprah + the Anthropic CEO | 1:00 | 1:30 | **NEW** |
| 3 | The front desk job → you pushed it | 2:30 | 2:00 | old 3+4 |
| 4 | Who I am | 4:30 | 1:00 | old 2 |
| **ACT 2 — PLANT + FIVE MOVES** | | **5:30** | **26:00** | |
| 5 | The promise | 5:30 | 1:00 | old 6 |
| 6 | ★ FACELIFT PLANT — **live beat 1** | 6:30 | 2:30 | old 7 |
| 7 | MOVE 1 — talk, don't type | 9:00 | 3:30 | old 12+8 |
| 8 | MOVE 2 — your studio in two files | 12:30 | 3:00 | old 13 |
| 9 | One folder | 15:30 | 2:00 | old 14+11 |
| 10 | MOVE 3 — make it write the prompt | 17:30 | 2:00 | old 15 |
| 11 | MOVE 4 — make the poster | 19:30 | 3:30 | old 16 |
| 12 | ★ Costume design → no-tariff suppliers | 23:00 | 1:30 | **NEW** |
| 13 | Skills + the dark valley | 24:30 | 2:30 | old 17 |
| 14 | MOVE 5 — ask your own handbook | 27:00 | 2:00 | old 18 |
| 15 | Confidently wrong | 29:00 | 1:30 | old 9 ↓ |
| 16 | Where AI should NOT replace you | 30:30 | 1:00 | old 19 |
| **ACT 3 — THE TURN** | | **31:30** | **4:00** | |
| 17 | The pattern | 31:30 | 1:00 | old 20 |
| 18 | Perfect unison | 32:30 | 1:30 | old 21 |
| 19 | ★ THE TURN | 34:00 | 1:30 | old 22 |
| **ACT 4 — WHILE YOU'RE NOT THERE** | | **35:30** | **5:30** | |
| 20 | The morning briefing | 35:30 | 2:00 | old 24 |
| 21 | Tools are hands | 37:30 | 1:30 | old 25+23 |
| 22 | 900 routines — never touched my keyboard | 39:00 | 2:00 | old 28+27+26 |
| **ACT 5 — THE PRODUCT** | | **41:00** | **10:30** | |
| 23 | Pull, don't push | 41:00 | 1:30 | old 29 |
| 24 | StudioSage + how it actually works | 42:30 | 3:00 | old 30+33 |
| 25 | Inside the dashboard | 45:30 | 1:30 | old 31 |
| 26 | Human in the loop + what it can't do | 47:00 | 1:30 | old 32 + NEW |
| 27 | ★ LIVE DEMO — the room texts it — **live beat 2** | 48:30 | 3:00 | old 34 |
| — | *(Animated fallback — off-run rescue)* | — | — | old 35 |
| **ACT 6 — Q&A, REVEAL, CLOSE** | | **51:30** | **8:30** | |
| 28 | ★ Q&A + "what's working for you?" | 51:30 | 3:00 | **NEW** |
| 29 | ★ THE FACELIFT REVEAL | 54:30 | 2:30 | old 36 |
| 30 | $10,000 an hour | 57:00 | 1:30 | old 37 rewritten |
| 31 | CTA — leave up | 58:30 | 1:30 | old 38 |
| | **END** | **60:00** | | |

**Arithmetic:** 5:30 + 26:00 + 4:00 + 5:30 + 10:30 + 8:30 = **60:00.**

Where the 60 minutes goes: **39:30 teaching** · 2:30 plant · 3:00 SMS demo · 2:30 reveal ·
3:00 Q&A · 3:00 close + CTA · **6:30 of act-boundary slack** absorbed into the per-slide lengths
above (every slide is budgeted at its comfortable length, not its minimum).

**What changed against the proposal's clock.** The proposal ran 0:00–1:00 with no facelift and no
Q&A block. Adding both costs 8:00 (2:30 plant + 2:30 reveal + 3:00 Q&A). That was paid for by
tightening the open (the bio dropped to 60s and moved behind the hook), by the merges in acts 4–5,
and by cutting the 101 act outright rather than distributing all of it. **First free move lands at
9:00 instead of 25:00** — the proposal's central goal — and it survives the facelift being in.

---

## 4. Every ad-lib call I made

Daniel had not adjudicated the 28-item list, so these are my calls, made from the ranked list and
the transcript. Each is one slide or one click to reverse.

### Built in

| # | Ad-lib | Where it landed | Why |
|---|---|---|---|
| 15 | Oprah + the Anthropic CEO | **New slide 2** — the cold open | What he actually opened with. Retires the Sheridan / "you will not see me dance" bit, which has **zero hits** in the transcript |
| 16 | "$10,000 an hour → talk to your dance families" | **New slide 30**, the close | Answers the question the old close only asked. ⚠ Deliberately **removed** from the dark-valley slide where he originally said it — saying it twice spends it |
| 17 | Costume design → image → Canadian no-tariff suppliers | **New slide 12**, its own slide | Most studio-specific use case in the hour, and it came free from the floor |
| 18 | "Strict adherence — you may not change the picture" | **New slide 11 (MOVE 4)**, click 4 | ⚠ **Moved off Move 3.** The proposal put it on Move 3; the transcript puts it squarely in the poster block, right after "drop your real photos in", because it is a statement about an *image*. Built where it was said |
| 19 | "Drafting it six times? Pick up the phone" | **New slide 16**, final click | Said twice, unprompted. The most credible line in the hour |
| 20 | "AI is like Kleenex" | **New slide 7 (MOVE 1)**, first click | Sole survivor of the cut history slide. Lets him say "you are not behind" before asking anyone to do anything |
| 21 | Wife-app bit → dark valley | **New slide 13**, first click | His own improvised setup. Makes him the guy who over-automates rather than the guy selling automation |
| 22 | Escalation + weekly digest | **New slide 26** | *Not named in the proposal — my call.* His live wording beat the slide's, and it is already-built functionality |
| 26 | Per-student scoping / Jackrabbit sync | **New slide 26**, honest-limits block | Asked by two different people mid-demo with no slide behind it; "does that make sense?" ×4 in that stretch |

### Presenter-note only, never on screen

| # | Ad-lib | Call |
|---|---|---|
| 23 | Ontario one-party consent on recordings | Note on Move 1. A two-second reassurance if asked, not a legal segment |
| 24 | Robot camera / "big round of applause for Andrew" | Note only. Room-specific to Toronto; Calgary has a different crew |

### Deliberately not in the deck

| # | Ad-lib | Call |
|---|---|---|
| 25 | Post-talk product discovery (sibling scheduling, fuzzy matching) | Roadmap, not deck |
| 27 | "Support group for dance teachers and technologists?" | Not a slide — but it is now a **presenter note on the Q&A slide** so that if it comes up again it gets a real answer. Last time it got "that's a great idea" and nothing else, and it was the only unanswered ask of the hour |
| 28 | Book-shredding / trucker-protest tangents | Cut. Never on stage |
| 1–14 | All talk-1 ad-libs | Out of scope for this deck |

### Extra calls from the transcript, not on the 28-item list

- **"I never asked AI to paint pictures and write songs while I do laundry"** → beat on new slide 3.
  It is the thesis of the hour in one line and it was not written down anywhere.
- **"Or are they asking for instructions on how to make a smoothie?"** → kept on new 22. It is the
  laugh in the confidence-rating explanation.
- **"My face is a QR code"** → note on Move 3.
- **"Take your time! Just take your time."** → note on Confidently Wrong.
- **"Ten minutes to set up"** → new 24. He said ten on stage; the old deck said five and he
  contradicted it live.
- **The four-part "per my email" hands-up** → promoted to a scripted beat on new 3. It was the
  biggest participation moment in the room and it was improvised.

---

## 5. What got cut, and why

| Cut | Was | Why |
|---|---|---|
| Sheridan / "you will not see me dance" open | old 1 beats | Zero hits in the transcript. Oprah replaced it |
| Who's already using it | old 5 | The hands-up survives on new 3; it does not need a slide |
| A Very Short History | old 8 | Best line ("Kleenex") survives as a click on Move 1 |
| 101: What do I use it for (the tool matrix) | old 10 | **He said "this isn't framed properly" out loud, on stage.** Cut, not fixed — it was three minutes of theory before anyone had done anything |
| 101: The only 7 words | old 11 | Distributed. Project / thread / prompt now land on new 9, where they are being used |
| The agentic ladder | old 23 | **He called it "actually a stale slide" on mic.** Duplicated the history slide; its one good line (talking → hammer → tools) folded into new 21 |
| Be with people, not interfaces | old 26 | Folded into the landing of new 22, where it has a job |
| Routine 436 as its own slide | old 27 | **Never delivered at all** — zero hits. Now inside the loop payoff, where it is the reason the automation exists |
| Animated fallback | old 35 | Still in the file, still the demo's rescue, out of the running order |

---

## 6. Invariants preserved (verified, not assumed)

- `#stage` keeps `overflow:hidden`; transitions remain `t-fade / t-push / t-swipe / t-rise` —
  blur, scale-from-.965 and clip-path wipes. **Zero translate-based transitions**, so a render
  audit measuring mid-animation cannot report false overflow.
- Slide 1 keeps `t-fade` (the robot wall paints through
  `body.gathering .slide.t-fade.active .gather`).
- **The wall slide is immediately followed by the animated fallback** — `fallbackIndex()` scans for
  exactly that adjacency, and `O` / the rescue button / the phone depend on it.
- `route-arm` **moved to new 26** so the SMS arm zone is contiguous with the wall instead of
  arming, disarming and re-arming across three slides.
- Rail `segOf()` regexes rebuilt for the new titles.
- Demo wiring untouched: `calgary@ingest.studiosage.ai`, +1 587-317-0721, no `?rt=` step,
  8-check pre-flight at `studiosage.ai/demo/operator`.
- The 2026-08-06 gather-loop fix (`on(force)` ignoring the `used` latch, `onSlideOne()` gating by
  slide index) is **preserved and re-verified** — G on / G off / G on again all work.

## 7. Slide 1, as requested 2026-08-06 23:29

- **11:04 PM moved onto the handset** as a real status bar — signal bars, wifi, battery, no emoji.
  Bubbles dropped 36px to clear it. The floating `.clock11` element and its CSS are deleted.
- **The title cycles only while the wall is up.** 18-second loop: types on ~5s, holds ~6.8s,
  clears, ~4.7s of wall alone, repeats. Implemented as a `steps()` `clip-path` wipe rather than
  JS per-character, which keeps the cyan/amber `<span>`s intact, costs nothing to run for twenty
  minutes, and — because clip-path and opacity never affect layout — produces **zero layout shift**.
- **Every cycling rule is scoped to `body.gathering`.** Verified headlessly: before G, after G-off,
  and after advance all read `opacity 1`, `animationName: eUp`, `clip-path: none`. Nothing can
  blink at 09:20.
- `prefers-reduced-motion` kills the cycle outright and leaves the title visible.
- **Robot wall brightness** (Daniel could not read it as video on FIRMAMENT): `brightness(.62)` →
  `.95`, vignette `.86` → `.52` at 82%. The title is protected by its own bottom scrim, not by the
  vignette, so the video could come up a long way before the headline was at risk — verified in
  the screenshot.

## 8. Verification

Playwright at 1920×1080 against `presenter-server.py` (`FACELIFT_FAKE=1`), all 32 sections, every
fragment force-revealed:

- **0** elements outside 1920×1080 · **0** broken images · **0** console errors
- Clock reads continuously **0:00 → 60:00**, no gaps or overlaps
- Dashboard video plays (**40.4 s** — see below) · robot wall plays and dies on advance
- Facelift plant shows the url + live status chip; **reveal opens on the rebuilt site**
- Wall: `O` → animated fallback; `→` → skips the cartoon to Q&A

### Two corrections to figures in the brief

- **The dashboard walkthrough is 40 seconds, not 86.** Measured: `40.43 s`. The login screen is
  trimmed and the timelapse is sped 1.6×. It fits the 1:30 budget twice over — which is part of why
  I kept it rather than cutting it.
- **The facelift job is ~21 minutes, not 60–90.** See §1.

### One pre-existing defect found, deliberately not fixed

`POST https://www.studiosage.ai/api/demo/route-all` returns **410 Gone** — verified with curl. The
deck still fires it as an 8-second heartbeat while on the arm slides (new 26 and 27), so it logs a
console error every 8 seconds across the two most important slides in the talk. It is harmless —
the call is caught and the demo now routes purely by the receiving number, so the endpoint is
vestigial — but the brief said not to touch the demo wiring, so **it is reported, not changed.**
Deleting the heartbeat is a three-line change if you want it gone before Tuesday.

## 9. Still open

1. **The 86-second dashboard walkthrough** — DM'd. Built in as new 25; cutting it is one deletion.
2. Nothing in the transcript contradicted the pricing, no-per-dancer-scoping, or demo-wiring
   decisions. The only tension found was the **facelift runtime**, resolved in §1 in favour of
   keeping the beat.
