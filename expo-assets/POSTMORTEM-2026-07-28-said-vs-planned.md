# Expo Postmortem — said vs planned

Primary source: `/mnt/firmament/ExpoMic.txt` (lapel mic, 3,696 lines / 56,075 words, captured 2026-07-30).
Everything below cites that file by line number. Where the transcript does not support a claim, it says so.
Read-out only — no rewrite decisions made here.

## 1. Where the talks are in the file

| Segment | Lines | Words | Notes |
|---|---|---|---|
| **Talk 1 — video / content day** | `1–415` | 8,630 | File **starts mid-sentence** (`ExpoMic.txt:1` = "where you can make a TV ad") — the open was not captured. Ends on `(Audience Applauding)` `:415`. |
| Booth + hallway + vox-pop interviews | `419–2559` | 30,071 | Not a talk. Includes promo-video interviews he shot: John Barella `:2307`, Brian Foley `:2345`, Marissa Castaldo / Skye Paul `:2527`. |
| **Talk 2 — AI** | `2565–3087` | 8,225 | Room fill + robot-camera banter from `:2565`; content starts `:2597`; ends `(Audience Applauds)` `:3087`. |
| Post-talk Q&A at the booth | `3091–3363` | — | Sibling/solo scheduling, fuzzy matching, costume workflows. |
| Expo closing + door prizes (not his) | `3371–3697` | 1,309 | Host's "by the numbers": 601 guests, 63 exhibitors, 33 speakers `:3387–3395`. |

Boundary answer: **talk 1 = 1–415, talk 2 = 2565–3087.** Everything between is booth work.

## 2. Said vs planned

### Talk 1 (planned: `talk1-video-slides.md` 13 slides / `talk1-runofshow.md` ~20 min + Q&A)

Deck actually deployed was **14 slides** (`~/expo-backup/TRADESHOW-2026-07-29/talks/talk1-deck.html`,
extra slide "Examples / Our Work"), and its md5 matches **neither** `expo-assets/decks/talk1-video.html`
**nor** `StudioSage/live-demo/talk1-deck.html`. The markdown outline is stale relative to what was on screen.

**Planned, never said** (0 hits in `1–415`):
- "Three studios. Three people. Never met." — `talk1-video-slides.md:56`
- "One clip, nine posts" / phone hold-up beat — `talk1-video-slides.md:82`, `talk1-runofshow.md:21`
- "One morning in. Twelve months out." — `talk1-video-slides.md:105`. He said "a year's worth of content for one day" `:13` and "there's your 12 months" `:173`.
- Hazer / smoke-alarm aside — `talk1-video-slides.md:66`
- Mortgage joke — `talk1-video-slides.md:95`
- "Who answers the 40 parents who reply?" cliffhanger — `talk1-video-slides.md:120`
- Booking QR `streamstage.live/book` — `talk1-video-slides.md:130`. Zero utterances of the URL. The QR he put up was "a free video and recital checklist" `:327`, then a second "send me an email" one `:343`.

**Said at length, on no slide:**
- **Recital media economics** — DVDs → digital link → **media fee**, ~1,225 words, `:241–291`, closing on "pay for the media, not the medium" `:355`. Nothing in the 13/14-slide outline covers this. Biggest gap in the deck.
- **CIA interview-provoke technique** + "all the good stuff's in the middle" (urine-sample analogy) `:13`, repeated `:41–45`. Slides only say "Interview / story — the heart" (`talk1-video-slides.md:72`).
- **DaVinci Resolve AI transcription → ChatGPT → cut-by-text workflow** `:13`, `:33`. This is AI content inside talk 1, which `talk1-runofshow.md:30` explicitly forbade.
- **Full StudioSage teaser, ~867 words** `:299–327`, including the price ("only $20" `:323`), the chatbot mechanic, dashboard, snark slider, and "I'm gonna do a live demo on the stage tomorrow" `:311`. Direct violation of `talk1-runofshow.md:30` ("NO StudioSage content — all Talk 2's").
- **Alex Hormozi time-value bit** `:201`, `:319` — the run-of-show budgeted that spine to talk 2 (`HANDOFF-DECK.md:28`), he used it in both.
- Open-gate / aspect-ratio / codec / frame-rate answers `:213–217`, `:371–387`.
- Movie-theatre recital screening idea `:259`; graduating-dancer testimonial idea `:391`.

### Talk 2 (planned: 38 slides, `talk2-runofshow.md`, 60-min slot at 16:10)

The run-of-show warned it carried ~93 min into 60 (`talk2-runofshow.md:8`). Delivered ≈8,225 words.
What he actually dropped:

**Planned, never said** (0 hits in `2565–3087`):
- **Routine 436** — the emotional peak, `talk2-runofshow.md:59`. Never mentioned. He said "we shoot 900 routines in a weekend" `:2893` instead.
- **MOVE 4 poster beat** — "Rhythm & Bloom, a studio that doesn't exist" `talk2-runofshow.md:48`. Zero hits. Posters were covered verbally only `:2805–2817`.
- Nano Banana `talk2-runofshow.md:42` — zero hits.
- **Dashboard walkthrough video** (86-sec, slide 31) — no evidence it played; the dashboard is described in speech only `:2907`.
- "You will **not** see me dance" / Sheridan open `talk2-runofshow.md:33` — zero hits.
- "Big love" close `talk2-runofshow.md:70` — zero hits.
- "5 minutes to set up" + the 80–90% stat `talk2-runofshow.md:65` — he said "**takes 10 minutes** to set up" `:3007`. The 80% he did say `:2845` is about repetitive work, not deflection.
- Unicorn hat `talk2-runofshow.md:61` — zero hits (Pink Pony Club did land `:2903`).
- LIVE26 rehearsal keyword — zero hits.
- Agentic **ladder** as three named rungs `talk2-runofshow.md:55–57` — the chatbot→agentic shift is stated `:2861`, the rungs are not narrated as rungs.

**Said at length, on no slide:**
- **Oprah / Anthropic CEO / Claude-wrote-the-question anecdote** `:2601–2605` — the actual cold open.
- Robot-camera bit + "big round of applause for Andrew, we're making a promo video for the Expo" `:2585–2625`.
- Audience-supplied tips that became content: prompt-ordering / "strict adherence, you may not change the picture" `:2817`; **costume design → image → search Canadian no-tariff suppliers** `:2963`.
- Extended unscripted Q&A on **per-student scoping** and Jackrabbit/Studio Pro sync `:2907–2915`, `:3079`.

**Both live beats failed on stage.** Live SMS demo: `:2939–2955` ("I don't know if that worked", "I gotta reset the demo environment"), retried `:2975`, fell back to the animated version `:2983`. Facelift reveal: `:3011–3043` — "those are the two live parts of my demo that crashed and burned." Confirmed after `:3367` ("Why did it all break on the stage?") and `:3439–3443` ("API is overloaded, can't respond").

## 3. What landed

ASR tagged only four audience markers in talk 1 and four in talk 2 — treat absence of a marker as no data, not as a flat moment.

**Talk 1**
- `:315` `(Audience Laughing)` — the StudioSage snark-slider line ("change the personality settings to match your snark"). The only tagged laugh in the talk.
- `:415` `(Audience Applauding)` — close.
- Named participation: Laney answers the opening hands-up `:1`; a second owner volunteers "I have videographers" `:1`; a "local guy / Dancebug" exchange `:1`. Editor hands-up (iMovie / Final Cut / DaVinci) `:33`.
- Real questions, unprompted: one-minute hero video `:201` (longest answer he gave), UGC vs pro `:205`, cross-platform distribution `:213`, "**what was the fourth station?**" `:225` — he'd lost his own list and the room supplied it, vertical-vs-landscape `:371`, frame rate `:375`.
- "Awesome. The world is healing." after the DVD hands-up `:245` — his line, no marker.

**Talk 2**
- `:2673` `(Laugh)` — after the paying-for-ChatGPT hands ladder ($20 / $50 / $100).
- `:2951` `(Audience Chattering)` — during the live email forward, i.e. the room was leaning in at the moment the demo broke.
- `:3067`, `:3071` `(Audience Member Speaking Off Mic)` — questions came *after* the CTA; he'd said "it's not over, go" `:3067`.
- `:3087` `(Audience Applauds)` — close.
- Strongest participation: the four-part push/pull hands sequence `:2645–2653` ("how many said *per my email*"), the tragic-website volunteer who gave up their live URL — **Stepping Up Dance Company, Sarnia** `:2677–2693`, and the two audience-supplied AI tips `:2817`, `:2963`.
- Unanswered ask: "**do you have a support group for dance teachers and technologists?**" `:2967` — he said "that's a great idea" and moved on.

## 4. Timing reality

The transcript has **no timestamps** — durations below are arithmetic from word counts at 130–150 wpm, not measured.

| | Words | Estimate | Plan |
|---|---|---|---|
| Talk 1 | 8,630 | ~58–66 min | `talk1-runofshow.md:2` says **~20 min + Q&A** |
| Talk 2 | 8,225 | ~55–63 min | 60-min slot, cue sheet carried ~93 min |

- Adapt Stage sessions are **1 hour each** (`tdte-2026-adapt-stage-schedule.md`). Talk 2 is on the grid at **16:10 Wed Jul 29**. **Talk 1's slot is not in the captured grid** — that file is flagged incomplete.
- So talk 1's plan was under-written by roughly 3× and he filled ~40 extra minutes live. The fill was the media-fee block (~8–9 min, `:241–291`), the StudioSage teaser (~6–7 min, `:299–327`) and Q&A. Tell against him: "I'm kind of rambling a lot here" `:359`.
- Where talk 1 rushed: the four stations. Station 4 was skipped entirely until the audience asked `:225`, and his own answer starts "Extra. Yeah, extra. Thank you. I was like, I don't know" `:229`.
- Where talk 1 dragged: three consecutive failed media playback attempts `:133–153` ("hold on, I have another thing running", "Is there a bit audio on this one?", "No, okay, thanks for playing").
- Talk 2 pacing: opening block ran ~11–12 min `:2565–2673` before the first free move. The five moves got ~17–19 min total; the product + broken demos got ~11–13 min `:2903–3047`. He landed the CTA and kept going, which is why the Q&A sits after `:3067`.

## 5. Promises made on stage → follow-up

1. **Interview questions as a free QR download** — promised `:13` ("I'm gonna give you those questions in a free QR download at the end") and again `:201` ("And I'll give you some of those questions"). **This asset does not exist.** Verified two ways: (a) content grep for the question text he actually spoke ("what do you love about", "why did you choose", "tell me about the culture", "provoke") across `expo-assets/`, `~/expo-backup/TRADESHOW-2026-07-29/`, `src/` → 0 hits; (b) filename search for `*interview*` / `*question*` across both trees → 0 files. The closest thing is `public/checklist.html`, which says "Interviews — five prompts, asked of everyone" but lists **one** prompt ("If you're thinking about signing your kid up…") and contains none of the provoke technique. `handout-content-day-planner.html` has no questions at all. **The thing the room was told to scan for was never built.**
2. **Stepping Up Dance Company (Sarnia)** — their rebuilt website. He said "it made it for you… I'm gonna give it to you" `:3043`, `:3107–3111`, and at `:3443` still hadn't: "did you end up showing the lady her website? Not yet, I gotta find her." Owed.
3. **First five StudioSage signups get a free website refresh + $20/yr hosting** `:3083`. Needs a list of who the first five actually are.
4. **StudioSage free until 2027**, $20/mo pay gate in September, "we're gonna pay for everybody's text messages" `:2907`, `:3059–3067`, `:3079`. Pricing said on stage; make sure the product matches.
5. **Support group for dance teachers + technologists** `:2967` — soft yes given, nothing exists.
6. **Sheet for local videographers in Calgary** `:347` ("I'm going to Calgary next week… I'm gonna give them a sheet to give to local videographers"). No such asset in `expo-assets/` or the show kit — 0 hits.
7. **Feature commitments made in the room:** per-student scoping / sync with studio-management software `:2907–2915`; escalation digest `:3075` (this one he described as already built).
8. Named booth follow-ups on mic: Stephanie (studio near Bolton) `:431`, Nicole / Run the Flex — offered a website refresh + $20/yr hosting inside a content day `:717–749`, a Saskatchewan studio `:757`, Kayla + Sydney of a Toronto competition `:1577–1603`, DRT ticketing (2,500 studios) white-label idea `:2141–2153`.

## Workspace note

StudioSage appears here in **two unrelated roles**: (a) talk content — it is the product demoed in talk 2 and teased in talk 1; (b) a separate repo, `~/projects/StudioSage/`, which also holds a `live-demo/talk1-deck.html`. The deck that shipped to the show kit matches neither repo copy (md5s differ three ways). Product work in the StudioSage repo is **not** expo material.
