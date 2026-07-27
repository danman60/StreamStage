# Run-through #2 execution plan (2026-07-26, autonomous session)

Source list: `expo-assets/rehearsal/2026-07-26-runthrough-2-notes.md`.
Canonical deck: `expo-assets/decks/talk2-ai.html` (31 slides at start). Mirror to FIRMAMENT after every batch.

## Decisions taken (autonomous, judgement calls flagged ⚑)

| # | Note | Decision |
|---|---|---|
| S1 | Move unison story out of the open | ⚑ New slide **"Perfect Unison"** inserted after "Where AI Should NOT Replace You", before the Pattern/Turn block. Open keeps hands-up + "you will not see me dance". |
| S2 | Replace tip 4 | Tip 4 becomes **"Put it on a schedule" (cowork + crons)**: daily briefing, summarise email, calendar, scan other studios, marketing checklist + the named limitation ("you still have to start it"). The old tip-4 voice material moves into **Move 2** (Google Takeout + em-dash beat) per his own note. |
| S3 | 17/18 confusing, Pattern stale | **Swap** — Pattern moves BEFORE the Turn, is re-centred, stale pain-board (lobby TV) **deleted**. |
| S4 | Push/pull earlier | New compact slide **"You pushed it. They didn't see it."** right after the roles arc (slide 3 position). Slide 22 stays the full beat + daughter. |
| S5 | Cut slide 30 | "Close: One Pain, One Step" deleted. |
| S6 | Slide 29 rewrite | Becomes **"What's your time worth?"** — 4 clickable beats ending on *AI lets us do more of what we want and hands the robots what we don't.* |
| S7 | Slide 31 | Two QRs (studiosage.ai + freebie), freebie **email-gated**, $20/mo = "how much time does that buy back", first-five = facelift + 1 yr hosting free then $20/yr, close lines + "Big love." |
| Q | QR images missing | Generated locally with `qrcode` as **inline SVG** (no PNG bloat): `studiosage.ai`, `studiosage.ai/moves`, `sms:+12267966037`. |

## Batches
1. **Structural** (S1–S7 above) + QR generation.
2. **Per-slide notes** — every bullet in the notes' per-slide section.
3. **Beats** — hand-written `data-beats` on all slides, `!!`/`>>`/`..` markers; push/pull + buying-back-time are `!!`.
4. **Transitions** — `t-push` (blur push) / `t-swipe` / `t-rise` / `t-fade` per slide; none on the iframe demo slides.
5. **Sync** — script, run-of-show, generated slides outline, notes page.

## Verification per batch
`PRESENTER_PORT=8081 python3 expo-assets/decks/presenter-server.py` + Playwright harness
(`scratchpad/deck2-all.mjs`): every slide, JS errors, overflow past 1920×1080, `document.fonts` loaded.
Screenshot every visual change → `~/tg-dm.sh --file <png>`.
Mirror: `scp expo-assets/decks/talk2-ai.html firmament:C:/Users/danie/Desktop/StudioSage-Live-Demo/talk2-deck.html`.

## Not in scope
StudioSage app repo (separate session owns it), deploys, the recorded product walkthrough video,
routing/tenancy verification (dev tasks, listed at the end of the notes).
