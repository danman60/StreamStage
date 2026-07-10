# Live-Fill Demo — Real Email → KB, On Stage
**Talk 2, the "watch it learn" beat. The REAL product, not the animated mock.**

This is the procedure for filling StudioSage's knowledge base live from a genuinely forwarded studio email — proven end-to-end on 2026-07-08 (forward → parsed → embedded → answerable in ~5–15s).

## The one-line version
Forward a studio email to **demo@ingest.studiosage.ai** from **daniel@streamstageproductions.com** → wait ~10s → text a question only that email answers to **+1 226-796-6037** → the answer lands on the wall.

## Why this works without any toggle
`daniel@streamstageproductions.com` is a registered sender for the demo studio (StudioSage Live Demo / LIVE26 / studio_0012). Any email forwarded from that address routes straight into the demo KB — no "demo mode" flag, no per-email lock. Forward as many as you like; each one appends.
(An unregistered sender would be rejected unless `STUDIOSAGE_DEMO_MODE=true` is set — it is NOT set, by choice. Stick to forwarding from your own address.)

## Design decision baked in (option 1)
The demo studio keeps its **15 hand-seeded facts** so the audience-texting portion always works. The live email should cover a **new topic the seed doesn't** — e.g. "picture day moved to the gym", "guest workshop Saturday", "parking change for recital" — so the forwarded email doesn't contradict a seeded fact. Then text a question ONLY that email can answer. That's the clean "it just learned that, live" moment.

Avoid forwarding an email about a topic already seeded (hours, tuition, costume fees, the recital, dress code, etc.) — you'll get two competing answers on stage.

## Content safety
Forward a **studio newsletter or announcement**, NOT a parent conversation. A forwarded parent thread can drop real names/phone numbers into the KB and onto the projector wall. Newsletters are safe.

## Attachments
Forward emails where the content is in the **body text**. PDF/image attachment extraction is a separate path and is currently unreliable (OCR/vision dependency) — don't rely on a PDF attachment landing on stage. Body text is what was proven.

## Operator console (reset between shows)
**studiosage.ai/demo/operator?token=<OPERATOR_TOKEN>**

- Live status: seed count, ingested count, emails held, wall messages, and an **ARMED** indicator.
- Refreshes every few seconds — you can watch "Ingested" tick up right after you forward.
- **Re-arm** button: deletes the ingested emails + their KB entries, keeps the 15 seeds and the wall. Use before each new run so the fill starts clean.
- **Full reset** button: also clears the wall (the on-screen SMS thread).
- The token is a Vercel env secret (`DEMO_RESET_TOKEN`). Ask Daniel / pull from Vercel; don't print it on any slide.

## On-stage sequence (maps to Talk 2, Slides 14–15)
1. Before the talk: open the operator page, hit **Re-arm** (status shows ARMED, 15 seed / 0 ingested).
2. Slide 14: run the animated mock (`kb-demo/index.html`) as the visual OR go straight to the real forward — your call. The mock is the safe fallback if wifi/email is flaky (see `demo-failure-playbook.md`).
3. For the real fill: forward your chosen studio email from your phone. Narrate while it lands (~10s). Operator page "Ingested" ticks up.
4. Slide 15: switch to the wall (`studiosage.ai/demo/wall?code=LIVE26`). Text the question only that email answers. Answer appears in the studio's voice.
5. Between sessions: **Re-arm** again.

## If it doesn't land in ~20s
Don't wait on stage. Cut to the animated mock (it's local, wifi-independent) and say the line: "trade-show wifi, everyone's favorite sponsor." Debug at the booth — check the operator page later; a forward that arrived late will show up there.
