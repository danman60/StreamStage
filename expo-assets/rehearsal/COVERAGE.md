# COVERAGE — both run-through transcripts vs. the current build
Audited 2026-07-26 (evening) against **talk2-ai.html @ 38 slides**, `talk2-runofshow.md`, `talk2-ai-script.md`.
Sources: **T1** = `StudioSage/scroll-world/.ccbot-uploads/Jul_26_at_2-54_PM.txt` (run-through #1) ·
**T2** = `2026-07-26-runthrough-2-transcript.txt` (run-through #2). Both read start to finish.

Slide numbers below are the **new 38-slide** order (`talk2-ai-slides.md` is regenerated from the deck).

---

## ⚠ NEEDS DANIEL (blocked on him — not on me)

| # | What | Why it's blocked |
|---|---|---|
| 1 | **Timing call.** The cue sheet holds **~91 min of material for a 60-min slot.** | Only he can decide what goes. Six cheapest cuts are listed at the top of `talk2-runofshow.md`. Nothing was cut unilaterally. |
| 2 | ~~Recorded dashboard walkthrough~~ | **CLOSED 2026-07-26 21:26** — another session produced `decks/studiosage-dashboard-walkthrough.mp4` (86s, 1600×900). It is now **slide 31, "Inside the Dashboard"**, autoplaying muted on arrival. Watch it once before the show and tell me if the cut is wrong. |
| 3 | ~~Real multicam stills~~ | **CLOSED 2026-07-26 20:00** — four real generated stills (`img/cam-01-wide` · `cam-02-closeup` · `cam-03-sidestage` · `cam-04-crowd`) are now the loop-payoff grid, replacing the eight abstract boxes exactly as asked. Reviewed by eye; they read as genuine broadcast frames, burn-ins and all. |
| 4 | ~~`studiosage.ai/moves`~~ | **APPROVED + SHIPPING** (2026-07-26 17:53). Slide copy no longer hedges it. The PDF source is `expo-assets/handout-5-free-ai-moves.html`, **rebuilt tonight to the new five moves** — it still had the old moves AND Talk 1's banned thesis. Scan the QR yourself on the day. |
| 5 | **Live-demo routing** (`?rt=<token>`) + tenancy check | Dev session owns it; **bot@studiosage.ai is live and reaches the pipeline**. Still test one text and one forwarded email from your own phone on the day. |
| 6 | ~~Facelift trigger~~ | **BUILT AND TESTED** — a real run produced a finished site in 17 min. Runs from the phone's ★ panel; the deck reads `/facelift` and loads deployed → local → fallback behind the curtain by itself. Only open question: whether you want it **hosted** live (needs `FACELIFT_DEPLOY_OK=1` + your explicit OK) or served off the laptop (current, wifi-proof). |
| 7 | **80–90% stat** is now on screen (mechanic slide). | He said the number out loud; if it's a marketing claim he wants defended, he should confirm the source. |

---

## Open / persona

| Item | Source | Status | Where |
|---|---|---|---|
| "Robot overlords are coming, but first we get smoother logistics" | T1 open, T2 open | **IN SCRIPT ONLY** | Script OPEN. Deliberately not on a slide — it's a spoken warm-up, not a visual. |
| "You will not see me dance — Sheridan grad, 3 yrs jazz/ballet/tap, if you're nice, the grand jeté" | T2 | **IN DECK** | Slide 1 beats |
| Roles arc: teacher → owner → marketer → support → janitor → bookkeeper → front desk | T1, T2 | **IN DECK** | Slide 2 |
| "Even if you're not sitting at that front desk, we all know who's getting those texts" | T2 | **IN DECK** | Slide 2, click 9 |
| Hands up: 11pm Sunday before recital, "how do we do the hair for this number?" — keep them up if it was in the email | T2 | **IN DECK** | Slide 1 beats |
| "You're getting paid for one of those jobs" | T2 | **IN DECK** | Slide 2 |
| **Unison story** ("they answered in perfect unison: answering a million texts and emails") | T1 open | **IN DECK — MOVED** | Slide 21, its own slide, per T2's first note |
| "We push and push and they just don't see it" | T1 | **IN DECK** | Slide 3 (new push slide, first five minutes) |
| Name on the Who-I-Am slide; beat-by-beat name → StreamStage → what it does → technologist → printer → StudioSage + letter joke | T2 | **IN DECK** | Slide 4, 4 clicks |
| StreamStage = recital + competition video, multicam, live stream, photography, instant digital delivery | T1, T2 | **IN DECK** | Slide 4, click 1 |
| Printer joke (USB A to USB B, get it on the wifi) | T1, T2 | **IN DECK** | Slide 4, click 3 + beats |
| StreamStage / StudioSage "one letter apart" | prior build | **IN DECK** | Slide 4, click 4 |
| "Who's using AI right now / who's in ChatGPT every day" — wants MORE audience questions here | T2 | **IN DECK** | Slide 5 (new gauge slide, 4 hands-up questions) |
| Five free moves + the one I productized | T1, T2 | **IN DECK** | Slide 6 |
| **Kill** the mid-livestream-email tease on the promise | T2 | **DONE (removed)** | Slide 6 — the beat now lands with the email spider (slide 28) |
| **Kill** the 1–6 numbers popping on each click | T2 | **DONE (removed)** | Slide 6 — chips are static |
| Plant: "whose website needs a facelift", take one URL, come back at the end | T1, T2 | **IN DECK** | Slide 7 |
| Type the shouted URL into a box on the slide; show their existing site in a scrollable element | T2 | **IN DECK** | Slide 7 — input + embedded preview panel. ⚠ many sites block embedding; beats say so and give the fallback |

## History / 101

| Item | Source | Status | Where |
|---|---|---|---|
| 50 years of learning THEIR language → they learned ours (spellcheck, autocorrect, face-finding, "take me home") → plain English | T1, T2 | **IN DECK** | Slide 8 |
| "The breakthrough isn't the intelligence, it's the interface" | T2 | **IN DECK** | Slide 8 |
| "You feel behind — you are NOT behind" | T2 | **IN DECK** | Slide 8, click 1 |
| "Biggest shift since the internet / the printing press / social media" | T2 | **IN DECK** | Slide 8, click 1 |
| "99% of the time people say AI they mean ChatGPT, Claude, Perplexity" | T2 | **IN DECK** | Slide 8, click 2 |
| It predicts what comes next; then it learned to search the web; confidently wrong | T2 | **IN DECK** | Slide 9 |
| **Car wash joke** (walk or drive, "just walk, it's so close") | T2 — his pick | **IN DECK** | Slide 9, click 1 (two-panel you/it exchange) |
| Strawberry-three-Rs as the backup joke | T2 | **IN DECK (beats only)** | Slide 9 beats — flagged as the fallback if the room is flat |
| **Trust but verify — check before you hit send** | T2 | **IN DECK** | Slide 9, click 2 |
| Icons for ChatGPT / Claude / NotebookLM / Gemini / Nano Banana | T2 | **IN DECK** | Slide 10 — inline SVG marks, no external assets |
| Perplexity added, marked as research | T2 | **IN DECK** | Slide 10, sixth row + ★ RESEARCH pill |
| Pro tip: free account on all of them, cycle through | T2 | **IN DECK** | Slide 10 |
| Keep all your documents centralised in one place (his own early workflow) | T2 | **IN DECK** | Slide 10 + slide 14 (the folder slide owns it properly) |
| "I pay $500–600/month; everything in this talk is free tier" | T2 | **IN DECK** | Slide 10 |
| Seven words as a **pyramid**: memory → projects → threads → prompts, then connector / skill / agent | T2 | **IN DECK** | Slide 11 |
| Agent = **works while you sleep**; "you love waking up and something changed" | T2 | **IN DECK** | Slide 11 beats + slide 24 |

## The five moves (restructured 2026-07-26 per the moves + brand-kit directives)

| Item | Source | Status | Where |
|---|---|---|---|
| Move 1 talk-don't-type; "the second you type it's homework"; think differently when you talk | T1, T2 | **IN DECK** | Slide 12 |
| Mic button, **not voice mode** — "I read faster than the robot talks" | T1 | **IN DECK** | Slide 12 |
| The Monday brain-dump written onto the screen as he clicks ("ramble ramble ramble") | T2 | **IN DECK** | Slide 12, 4 clicks onto the phone |
| Zoom transcripts (zoom.us) · hit record on teacher meetings · AI note pins vs. just your phone | T2 | **IN DECK** | Slide 12 |
| Move 2 = **voice file + brand file** they own | directive 17:07 | **IN DECK** | Slide 13 |
| Google Takeout to export Gmail and feed the voice | T2 | **IN DECK** | Slide 13 |
| "Tell it to stop using em dashes" | T2 | **IN DECK** | Slide 13 (in the voice-file card and the beats) |
| "Dancers, never kids" as a voice rule | T2 | **IN DECK** | Slide 13 voice card |
| NotebookLM: upload 50 old newsletters, build the template in your voice | T1 | **IN DECK** | Slide 13 |
| One centralised folder: copy-paste → drag → connect | directive 17:09 | **IN DECK** | Slide 14 (new) |
| Move 3 = **make it write the prompt**; "especially for image generation" | directive 17:05 | **IN DECK** | Slide 15 |
| Ask **HOW** questions ("how would I go about doing this") rather than "do this" | T2 | **IN DECK** | Slide 15 beats |
| Move 3 also writes the brand + voice files ("read my website and my last ten newsletters") | directive 17:07 | **IN DECK** | Slide 15, click 4 |
| Move 4 = **image generation / make the poster**; text rendered inside the image | directive 17:05 | **IN DECK** | Slide 16 |
| Same prompt **without → with** the brand file (the anti-generic argument) | directive 17:07 | **IN DECK** | Slide 16, 3-panel contrast |
| Dark valley as clickable fourth-grade math: 10 min → 30 min → 2 min forever | T1, T2 | **IN DECK** | Slide 17, one click per number |
| "Saving time is as good as making money" | T1 | **IN DECK** | Slide 17, final click |
| Skills = stop correcting the same thing, make it a one-time repeatable thing | T1 | **IN DECK** | Slide 17 notes/beats |
| Move 5 handbook — upload rules, hours, dress code, key dates | T1, T2 | **IN DECK** | Slide 18 |
| Staff examples: "hair for senior jazz Thursday", "costume for musical theatre senior Saturday" | T2 | **IN DECK** | Slide 18 chat mock |
| Contradiction finder ("does this contradict itself about refunds?") | prior build | **IN DECK** | Slide 18 |
| Tease: "wouldn't it be cool if that handbook and all your latest info were somewhere public?" | T2 | **IN DECK** | Slide 18, final click |
| **Connectors** — hook up email/calendar, "go through my teachers' emails" | T1, T2 | **IN DECK — RELOCATED** | Slide 25 (rung 3), per the 17:05 directive |
| **Cowork / crons** — daily briefing, summarise email, calendar, other studios, marketing checklist | T2 | **IN DECK — RELOCATED** | Slide 24 (rung 2), same directive |
| "You still have to start it" — the named limitation | T2 | **IN DECK** | Slide 24 |

## How it works / the turn

| Item | Source | Status | Where |
|---|---|---|---|
| Human in the loop: robots take the menial repeats = **80% of conversations** | T2 | **IN DECK** | Slide 19, 80% panel |
| On repeats, **accuracy and speed matter more than tact** | T2 | **IN DECK** | Slide 19 |
| Never: upset parent, injury, casting, placement | T1, T2 | **IN DECK** | Slide 19 (published promise — do not cut) |
| Use it to review your drafts | T2 | **IN DECK** | Slide 19 |
| **Role-play a difficult conversation in a thread first** | T2 | **IN DECK** | Slide 19 |
| "None of that made AI smarter in general — you taught it about you" | T1, T2 | **IN DECK** | Slide 20 |
| Pain-point board copy is **stale** (emails / newsletter / scheduling / **lobby TV**) | T2 | **DELETED** | Slide 20 re-centred, board removed entirely |
| 17/18 transition confusing — swap them | T2 | **DONE** | Pattern (20) now precedes Unison (21) and the Turn (22) |
| "You can ask your handbook. Your staff can. Your parents can't." | T1, T2 | **IN DECK** | Slide 22 |
| Ladder: chatbot → scheduled → agentic; rungs **vertical, a pyramid** | T2 | **IN DECK** | Slide 23 |
| "First we talked, then somebody made a hammer, then a screwdriver" — tools = agency | T1, T2 | **IN DECK** | Slide 23 |
| Philosophy: things happening while we're not doing them · leverage your **taste** · people are expensive and need training · **get your people doing what they want to do** · be with **people**, not data/interfaces/buttons/sliders | T2 | **IN DECK** | Slide 26 (new) |
| "My agent will talk to your agent and book the coffee" | T2 | **IN DECK** | Slide 26 |
| Routine 436 — "for that **dancer** it's the most important 3 minutes of their season" | T1, T2 | **IN DECK** | Slide 27 |
| **Say "dancer", never "kid"** | T2 | **DONE — swept** | Every occurrence in the deck changed; the only surviving "kids" is the voice-file rule that teaches it. Also a guardrail line in the run-of-show |
| StreamStage logo back on the 436 slide | T2 | **IN DECK** | Slide 27, top-left |
| Multicam: 4–5 angles (wide / close-up / side stage / crowd) instead of the 8 boxes | T2 | **IN DECK** | Slide 28 — four **real** stills, angle-labelled |
| Email spider: catches → checks calendar for the event → drafts → scores confidence → **≥85% fires** → notifies him | T1, T2 | **IN DECK** | Slide 28, incl. the ≥85 threshold on the card |
| "They got the link. They did, though." | T1, T2 | **IN DECK** | Slide 28 beats |
| "I never touched my keyboard" / "that's agentic — it's taking action, using tools" | T1, T2 | **IN DECK** | Slide 28 |
| Push/pull must land **earlier**, not only at slide 22 | T2 | **DONE** | Slide 3, ~five minutes in; slide 29 is now the payoff, not the explanation |
| Unicorn hat / Pink Pony Club as **its own clickable beat** | T2 | **IN DECK** | Slide 29, click 4 |
| Daughter photo **spins up to near full screen** as its own beat | T2 | **IN DECK** | Slide 29 — photo grows to centre, rest of the slide dims |
| "I work in tech and I still couldn't find the email" | T1, T2 | **IN DECK** | Slide 29 |
| **Outlook search is terrible** — that's why they pull | T2 | **IN DECK** | Slide 29, final line |

## Product / demo / close

| Item | Source | Status | Where |
|---|---|---|---|
| Parents text a number, no app, no login, answers from your stuff, doesn't guess | T1, T2 | **IN DECK** | Slide 30 |
| Only **cited** answers, from the emails you're already sending | T2 | **IN DECK** | Slide 30 |
| "You could build this yourself — custom GPT + a Twilio number, on an SMS event check your email database, keep it in sync — **I built it for you**" | T2 | **IN DECK** | Slide 30, click 2 |
| $20/month | T1, T2 | **IN DECK** | Slides 30, 32 (framing), 37 |
| ⚠ **Don't say "text this number right now"** on the StudioSage slide | T2 | **DONE** | Block removed; it now lives on slide 32, immediately before the live demo |
| Mechanic in **StudioSage branding**, built **one element at a time** | T2 | **DONE** | Slide 32 is a sage slide, four clicks + stat + CTA click |
| **8.5×11 poster** for the studio | T2 | **IN DECK** | Slide 32, step 1 |
| Put the number **in your email signature** | T2 | **IN DECK** | Slide 32, step 2 |
| **~5 minutes** to set up (was "ten minutes") | T2 | **CORRECTED** | Slide 32 headline |
| Front desk is trained; you still want a human being lovely with families | T2 | **IN DECK** | Slide 32 |
| **80–90% of repeated questions** — a stat ON SCREEN | T2 | **IN DECK** | Slide 32, large panel |
| Live demo: ask the room for a real studio email, walk to them, **forward to bot@studiosage.ai** | T2 | **IN DECK (beats)** | Slide 33 beats + run-of-show patter |
| Beautiful email-arriving animation, then parsed into the knowledge base | T2 | **PARTIAL** | That animation belongs to the embedded demo app (StudioSage repo, other session). Deck beats cue it |
| **Phone number + QR on screen the whole time**, QR = **SMS intent** | T2 (DECIDED) | **IN DECK** | Slide 33 — persistent panel, QR encodes `sms:+12267966037` |
| **4–5 known facts on screen** so people can test it | T2 | **IN DECK** | Slide 33 panel, five facts |
| THE MAGIC: it answers what it knows **and** says "I don't have that information yet, please contact your studio director" | T2 | **IN DECK** | Slide 33 beats (both halves marked must-say) |
| Reveal: curtain-open click-to-reveal | T2 | **IN DECK** | Slide 35 — real curtains, one click |
| "Site unseen, I haven't touched my keyboard, there's no web developer hiding backstage" | T2 | **IN DECK** | Slide 35 |
| Offer: yours free, **hosted one year, then $20/year** | T2 | **IN DECK** | Slides 35 and 37 |
| Closer 29 → **"what's your time worth?"** (less stressed? more of what you love? AI does more of what we want, robots take what we don't) | T2 | **DONE** | Slide 36 |
| **Cut slide 30** (old "One Pain, One Step" close) | T2 | **DELETED** | — |
| Final slide = **two QR codes** (freebie + studiosage.ai) | T2 | **IN DECK** | Slide 37, both generated |
| Freebie **IS email-gated** (was "no email required") | T2 | **FIXED** | Slide 37 copy + notes + run-of-show guardrail |
| $20 framed as "how much time does that buy back" | T2 | **IN DECK** | Slide 37 |
| First five signups: facelift free + 1 yr hosting, then $20/yr | T2 | **IN DECK** | Slide 37 |
| "Come see me, I love technology, I love dance, worst case I fix your printer. **Big love.**" | T2 | **IN DECK** | Slide 37 |

## Cross-cutting

| Item | Source | Status | Where |
|---|---|---|---|
| More beat-by-beat everywhere, click fast | T2 | **DONE** | **All 37 slides carry hand-written `data-beats`** — no slide falls back to auto-chopped notes |
| Highlight markers: `!!` must-say (amber), `>>` near-verbatim (cyan), `..` stage direction | T2 | **DONE** | Used throughout; push/pull and buying-back-time are `!!` everywhere they appear |
| Jump button to move between slides, volume-up fires the next beat | T2 | **ALREADY BUILT** | `presenter-server.py` — Jump list + Prev/Next |
| **Varied transitions** (blur push / swipe / not hard cuts) | T2 | **DONE** | `t-push` blur, `t-swipe` wipe, `t-rise`, `t-fade` — assigned across all 35 content slides (the two iframe demo slides stay cut, deliberately) |
| "90s DVD" transition | T2 (as an example) | **DELIBERATELY CUT** | Would read as a joke in a business-track talk; the other three cover the ask |

## Deliberately cut (recorded, not silently dropped)

| Item | Why |
|---|---|
| "90s DVD" slide transition | Tonally wrong for this room; blur-push / swipe / rise deliver the "not hard cuts" ask. |
| Custom GPTs and "one thread per domain" as a *tip* | T2 floated them, then landed on cowork/crons, and the 17:05 directive replaced the slot entirely. The idea survives as the **projects/threads pyramid** on slide 11 and the build-it-yourself line on slide 30. |
| The old pain-point board ("emails / newsletter / scheduling / lobby TV") | He called the copy stale, especially lobby TV. Removed rather than rewritten — the slide is stronger centred. |
| Lobby TV as a callback anywhere | Same reason; and it was never a shipped feature. |
| The old "Never do again" question slide | Replaced by "What's your time worth" per T2. The never-do-again idea survives as the **unison story** (slide 21), which is where it came from. |
| The old close ("One Pain, One Step") | He said cut slide 30 entirely. |
| Mid-livestream-email tease on the promise slide | He said kill it; the payoff still lands at slide 28. |
| "Robot overlords" line on a slide | Kept as spoken material in the script only — it's a warm-up, not a visual. |

---

## Late additions (assets that landed mid-session, 2026-07-26 ~21:30)

| Asset | Where it is wired |
|---|---|
| `decks/studiosage-dashboard-walkthrough.mp4` (86s) | **New slide 31 — "Inside the Dashboard."** Autoplays muted on arrival, pauses when you leave. Beats say what to point at (knowledge base / personality / threads) and warn that it opens on the sign-in screen. Closes NEEDS DANIEL #2. |
| `decks/facelift-fallback/` (pre-baked refreshed site) | **Reveal slide (36)** — a **"Use pre-baked fallback"** button in the bottom bar loads it *behind* the curtain, so the failure path is one click and never leaves the deck. |

✅ **CLOSED 2026-07-26 18:12.** Slide numbers shifted by +1 from slide 31 onward when the dashboard
slide was added. The cue sheet in `talk2-runofshow.md` was renumbered at the time (38 rows, dashboard
inserted at 31, clocks recomputed off one map so the deck notes and the cue sheet agree), and
`talk2-ai-slides.md` + `talk2.html` are regenerated from the deck. **Re-verified row by row against the
generated outline: 38 cue rows ↔ 38 deck slides, every row on the right slide.** The cue sheet uses
deliberate pocket-card shorthand for some titles (`MOVE 1 Talk don't type` for `Tip 1: Talk, Don't
Type`, `★ PLANT` for `★ Website Facelift — the ask`) — that is intentional, not drift. Safe to print.
