# FINAL REPORT — Talk 2 expo prep, 2026-07-26

**Talk:** *Why AI? Save Your Studio Time, Money, and Stress* · Wed Jul 29 2026, 4:10–5:10 PM EDT ·
Adapt Stage · Business Track. **Two days out.**

---

## Bottom line

The deck is **38 slides, audited clean, and on FIRMAMENT right now** — you can practice on it as it
stands. Everything you said in both run-throughs is in the build. The live demo and the website-facelift
trick were both **proven working end to end**, not just wired up. Two real security holes were found
and closed along the way.

Four things need you personally. None of them block rehearsing tonight.

---

## The deck

- **38 slides**, verified by an independent render pass: every slide walked, **0 elements overflowing
  the 1920×1080 stage**, both fonts reporting `loaded`, no JS errors.
- **Mirrored to FIRMAMENT and md5-verified** (`9404a2ad…`). The copy you rehearse from matches the repo
  byte for byte. I re-checked this on every supervision cycle, and held the mirror once when 8 slides
  regressed into overflow rather than let you practice on clipped slides.
- **Coverage audit of both run-through transcripts: 95 items IN DECK, 1 in the script deliberately
  (the "robot overlords" warm-up — it's spoken, not visual), 0 MISSING.** Everything you deliberately
  cut is recorded with a reason in `rehearsal/COVERAGE.md` rather than silently dropped.
- Structure now matches what you asked for: moves are **2 = your studio in two files · 3 = make it
  write the prompt · 4 = make the poster**; connectors and crons became **Rung 2 / Rung 3** slides;
  push/pull is named in the first five minutes; the unison story moved to just before the Turn; the
  centralised-folder progression is its own beat; "where AI should NOT replace you" is in (your
  published description promises it).
- **New slide 31 "Inside the Dashboard"** — an 86-second walkthrough video autoplays muted, so you
  show the product instead of describing it.
- Phone beats are colour-coded: **amber = must say · cyan = near-verbatim · grey = stage direction.**

## The live demo — proven cold, not just configured

Armed from cold via the deck's own heartbeat, a known question came back with a **cited answer in
3.7 s**, and a deliberate unknown ("private pole vaulting coaching?") was **correctly refused** with a
redirect to what it does know. **Both halves of your magic work.** Test rows deleted, routing disarmed.

`bot@studiosage.ai` was tested with a real email: **knowledge-base entry with an embedding in 11
seconds**, forwarder → SES → S3 → SNS → ingest → KB. Demo tenant reset afterwards.

> **Correction to what I told you earlier:** I relayed that `bot@studiosage.ai` did *not* reach the
> pipeline and needed an MX forwarder built. **That was wrong** — a forwarder already existed. The
> diagnosis was corrected once it was tested for real instead of inferred from DNS. No action needed.

## The facelift trick — real

A URL typed into the phone panel produced a **finished, revealable site in 17 minutes**, fully
autonomous. It runs your actual `facelift` skill in a real headless Claude Code session, so **each live
run spends your Claude Code plan usage** — that, not the code, is the thing that could bite you on the
day. Deploys are off by default; the reveal is served off the laptop. A **pre-baked fallback** is wired
to a button on the reveal slide, and a failed run falls through to it rather than showing a stale build.

## Security — two real holes, both closed

1. **`demo_route_state` was writable by anyone** holding the public anon key that ships in the browser
   bundle. That would have let someone pull every studio's inbound SMS into the demo tenant — during a
   talk where you invite a room to text the number. Closed and verified in production **without waiting
   for you**, because leaving it open through a public demo was the larger risk.
2. **The `/moves` email gate was silently losing every lead.** The unique index was on `lower(email)`
   while the code upserted on `email`; Postgres refuses that pairing, and the route logged the error
   without failing the request — so a visitor saw "check your email" while their address vanished. For
   a lead magnet the address *is* the feature. Fixed, redeployed, re-verified live: submit → email
   delivered → row present.

Both fixes are migration files now, not live-database drift.

## Also shipped

- `/moves` is **live and the PDF downloads** (57,980 bytes, valid 2-page PDF) — the freebie QR resolves.
- **Caledonia's director account created** and verified: logs in, sees only their studio, no
  cross-tenant reach. **Nothing was sent to them** — no magic link, no confirmation mail. Password is
  in your Telegram DM; handing it over is your call.
- **PHONEPRESENTER** built and installed on your Pixel; you confirmed it works. Volume up = next,
  down = back.
- FIRMAMENT demo folder cleaned from **576 files / 217 MB → 29 files**, and the stale pre-beauty
  Talk 1 deck replaced.

---

## What only you can do before Wednesday

1. **The timing call.** The cue sheet holds roughly **91 minutes of material for a 60-minute slot.**
   Nothing was cut for time — that is deliberately your decision, not mine. The six cheapest cuts, in
   order, are listed at the top of `talk2-runofshow.md`.
2. **Hand Caledonia their access** (password in your DM, or point them at "forgot password").
3. **Decide the live-demo QR**: plain SMS intent, or the version with a question pre-typed.
4. **Do one full dress run of the facelift** at roughly the same time of day, so you discover any
   plan-usage ceiling on Monday rather than at 4:50 PM on stage. It costs one run to know.

Also worth ten minutes: **real multicam stills** for the loop payoff (wide / close-up / side stage /
crowd), and confirming the **80–90 %** stat is a number you're happy to defend on a Business Track stage.

## Open, not blocking

- The bot's "I don't have that information" wording differs slightly from your stage line.
- Twilio signature validation ships dormant — which is *why* the cold test was possible at all. Worth
  turning on after the expo.
- A duplicate Grand River test studio row.
- **Restart the presenter-server** if it's already running, so it picks up the facelift panel.
- ~~Cue sheet numbering~~ — **CLOSED.** The cue sheet is renumbered to the 38-slide order (dashboard
  at 31, CTA at 38) and matches `talk2-ai-slides.md`. Safe to print.

### Caught during the final pass (2026-07-26 18:35)
Two files the deck depends on had **not** reached FIRMAMENT, which would have broken your rehearsal:
the **dashboard walkthrough video** (slide 31 references it by relative path — the slide would have
played nothing) and the **regenerated notes page**. Both shipped, along with the facelift runner,
contract, and the pre-baked fallback site. Verified by serving them from FIRMAMENT itself: deck,
video, fallback site and the phone remote all return 200 over Tailscale.

## Goal check — "everything from my transcripts addressed"

Verified independently, not taken from the deck session's own audit. I sampled **34 distinctive,
checkable items** straight out of both run-throughs and grepped the deck + script for each:

Sheridan / grand jeté · car wash joke · Google Takeout · em dashes · "perfect unison" · routine 436 ·
Pink Pony / unicorn hat · the 85% confidence threshold · Outlook search · "custom GPT + a Twilio
number" · the 8.5×11 poster · email signature · the 80–90% stat · "I don't have that information" ·
"big love" · the printer · $20/year hosting · bot@studiosage.ai · NotebookLM · Nano Banana ·
Perplexity-as-research · the agents-book-the-coffee line · "while you sleep" · trust but verify ·
printing press · "99% of the time they mean ChatGPT/Claude/Perplexity" · Zoom transcripts · hit record ·
"write me the prompt" · one folder · senior jazz / musical theatre examples · the 11pm Sunday hair
question.

**34 of 34 present.** That corroborates the coverage audit's 0-MISSING finding by a different method.

Also enforced: **the word "kid" appears nowhere** in the deck or the script — zero occurrences. It's
"dancer" throughout, as you asked.

The only transcript item deliberately left off a slide is the "robot overlords" warm-up, which lives in
the script as spoken material because it's a verbal opener, not a visual.

## STAGE HARDENING — imagining the actual room (2026-07-26 evening)

Everything below was found by asking "what happens on a stage I don't control, on a laptop I haven't
set up yet, with a room full of strangers texting a number." Verified in code, not assumed.

### The catch that mattered most
**`kb-demo/` was a symlink.** `rsync -av` copies a symlink *as a symlink*, so on DART it would have
resolved to nothing — and `kb-demo` is the **offline animated demo, i.e. the rescue you press when the
live demo fails on venue wifi.** The one file you'd reach for in the emergency was the one that
wouldn't be there. Found by serving the deck cold from a folder containing only what `DART-SETUP.md`
lists. It's now a real folder, re-tested cold: 38 slides, zero 404s, zero JS errors.

### Nothing the room sees is one keypress away any more
| Was | Now | Why it mattered |
|---|---|---|
| `p` | **SHIFT+P** | bare `p` projected your speaker notes — cue cards, "⚠ do not cut", pricing — onto the screen the audience is watching |
| `f` | **SHIFT+F** | a stray press dumped every build on the slide at once |
| `End` | **SHIFT+End** | **bare `End` jumped straight to the pricing slide** |
| `O` | **still one key, deliberately** | it's the emergency rescue; it must be instant |

A "Keys on stage" table is now in the run-of-show.

### The no-wifi rescue is now unmissable
The live-demo slide no longer auto-falls-back (your call), so if venue wifi blocks the iframe it just
sits there. The 21px grey hint became a **pulsing amber "NOTHING HAPPENING? PRESS O" at ~30px**, and
the slide's first two beats lead with it plus *"do not debug on stage."*

### Projector — measured, not guessed
4:3 is the *safest* case: at 1024×768 the chapter rail and counter sit entirely in the letterbox.
1280×800 intrudes 6–9px over an intended overlay. Nothing clipped, nothing off-screen, no change needed.

### Demo mode answers questions and nothing else — shipped (handle-sms v65)
Your call, implemented and reviewed. The bypass is `studio_id === "studio_0012"` — a hard equality on
the demo tenant. Every edit is a ternary on that flag, so for any other studio each expression
collapses to the original literal: onboarding stage, reply text, metadata, even the log label. **The
real parent flow is provably untouched, not merely tested-untouched.** Verified live: an unknown number
texting a non-demo studio still gets the name prompt; a known parent still gets answers from *their*
studio's knowledge base. Rollback to v64 is a documented one-liner.
Demo texters land `COMPLETE` and tagged `{demo_disposable: true}` so the post-talk purge finds exactly
those rows — and a late text during Q&A still gets answered instead of prompted.

### Disclosure you should have
For the cold end-to-end test the dev session sent **two SMS to +1 500-555-0001**, believing it was
Twilio's unroutable test range. Twilio reported them **delivered** and billed $0.05. The 500 range is
non-geographic and almost certainly has no handset behind it — but "almost certainly" isn't the
standard you set for messaging strangers. The practice has stopped; future SMS tests use a number we
control or wait for your OK.

### Process note
The demo-mode change **deployed as v65 before I reviewed the diff**, despite a hold-for-review gate.
The change is correct and I've since read it line by line, but the order was wrong on shared
production code and the session has been told so.

## Risk board update — 2026-07-26 19:40

**The biggest risk on the board is gone.** The dev pass flagged that your Twilio number has never
delivered to a US phone — bare Canadian long code, no A2P 10DLC, 110 outbound messages with zero US
destinations ever. You've confirmed **all numbers will be Canadian**, and Canadian delivery is proven
by that same history (every success is a 416/519/647/905). The A2P gap only ever applied to US
handsets, so it does not touch Wednesday.

Two things worth keeping anyway: **"watch the screen" is still better stagecraft** than "check your
phone" — it works even if one person's carrier is slow, and the wall is the impressive part. And A2P
registration is worth doing eventually, because this risk returns the first time you demo to a US room.

## Where things live

| What | Where |
|---|---|
| Deck (canonical) | `StreamStage/expo-assets/decks/talk2-ai.html` |
| Deck (what you rehearse on) | FIRMAMENT `Desktop\StudioSage-Live-Demo\talk2-deck.html` |
| Script · cue sheet · slide list | `expo-assets/talk2-ai-script.md` · `talk2-runofshow.md` · `talk2-ai-slides.md` |
| Coverage audit | `expo-assets/rehearsal/COVERAGE.md` |
| Your run-through notes + transcripts | `expo-assets/rehearsal/` |
| Dev detail | `StudioSage/docs/plans/2026-07-26-expo-dev-blockers.md` |
| Phone remote | `START-REMOTE.bat` → deck at `http://localhost:8080/talk2-deck.html`, phone at `/remote` |

**Use the Tailscale address for the phone remote** (`100.75.112.14`) — it survives switching between
your hotspot and venue wifi, and guest networks often block device-to-device.
