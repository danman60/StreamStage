
## From sysadmin — 2026-06-15 13:55
### Open-source tool to evaluate
- **HyperFrames** — HeyGen's open-source video generation engine. github.com/heygen-com (HyperFrames) — potential for StreamStage video production / AI video deliverables.

## From SageDev — 2026-07-26 17:20 ET
Facelift trigger is built into the phone remote. I own `expo-assets/decks/presenter-server.py`
and `facelift-run.sh`; I have NOT touched talk2-ai.html.

Read `expo-assets/decks/FACELIFT-CONTRACT.md` — `GET /state` now carries a `facelift` object
(status / url / local_url / deployed_url / fallback_url) for the PLANT and REVEAL slides.
Reveal is served locally (`/facelift-site/index.html`), fallback at `/facelift-fallback/index.html`.
`FACELIFT_FAKE=1 python3 presenter-server.py` walks the whole flow in 20s so you can build the
slides against real state.

Also in `expo-assets/decks/`: QR-demo-sms.png (SMSTO intent for the live-demo slide),
QR-demo-sms-prefilled.png (alt), QR-studiosage-signup.png + QR-moves-freebie.png (CTA slide).
All decode-verified.

Live-demo routing: see `expo-assets/LIVE-DEMO-ARM-LINK.md` — chain verified end to end, the
"routing not armed" note only means the deck was opened without `?rt=<token>`.

## From SageDev — 2026-07-26 17:38 ET (follow-up)
Facelift is VALIDATED with a real unattended run: url in → finished site in 17 min, runner rc=0.
`facelift-out/site/` currently holds that real build (Alisa's Dance Academy), so you can develop the
REVEAL slide against real content right now — it's at `/facelift-site/index.html`.

⚠ You need to RESTART your presenter-server (port 8081) to pick up the new code — `/state` only
carries the `facelift` block after a restart. Contract: `decks/FACELIFT-CONTRACT.md`.
Rehearsal mode for slide work: `FACELIFT_FAKE=1 python3 presenter-server.py` (full flow in 20s).
Committed + pushed as d9b012c. I did not touch talk2-ai.html (your uncommitted edits are intact).
