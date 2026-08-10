# Deck assets produced by the SageDev session

Everything here lives in `expo-assets/decks/`. The deck session owns `talk2-ai.html`; SageDev has
not touched it.

## Video

| File | Duration | Size | Notes |
|---|---|---|---|
| `studiosage-dashboard-walkthrough.mp4` | **70s** | 1920×1080, 3.0 MB, silent, H.264 | For the StudioSage product slides — show it instead of describing the product. |

**What's on screen, in order** (so you can time your narration):

| Time | Beat |
|---|---|
| 0:00–0:06 | sign-in, landing on the real dashboard |
| 0:06–0:22 | **Bot Personality** — formality and warmth sliders being dragged, the "Bubbly" preset, the robot reacting |
| 0:22–0:34 | **Test chat** — "When is the spring recital?" typed and answered live, cited from the studio's own knowledge |
| 0:34–0:48 | **Knowledge base** — 47 entries, then filtered to **source = Email** (3 of 47) and one opened to show the parsed content. This is the "where did this come from" beat. |
| 0:48–0:58 | **Open Questions** — what it could NOT answer confidently, plus Knowledge Gaps ("how do I make a pizza dough" — a real logged miss) |
| 0:58–1:10 | **The poster** — the QR + share code + phone number a director actually hands to parents |

Recorded against **Dans Dancers (`studio_0011`)**, the test/demo studio — no real client's data and
no real family is identifiable anywhere in the frame. The Parents tab and Settings tab were
deliberately skipped (they carry a director phone number and digest email).

Silent by design — Daniel narrates live. It is a scripted Playwright recording
(`walk3.mjs` + `poster.mjs` in the session scratchpad), so it can be re-shot identically if the UI
changes before Wednesday.

## QR codes (all decode-verified)

| File | Encodes | Use |
|---|---|---|
| `QR-demo-sms.png` | `SMSTO:+12267966037:` | **Live-demo slide.** SMS intent — opens the messaging app with the number filled in, exactly like the real product's QR. |
| `QR-demo-sms-prefilled.png` | `SMSTO:+12267966037:What time is Saturday rehearsal?` | Alt for the same slide, question pre-typed. Pick one. |
| `QR-studiosage-signup.png` | `https://www.studiosage.ai` | CTA slide, 1 of 2. |
| `QR-moves-freebie.png` | `https://www.studiosage.ai/moves` | CTA slide, 2 of 2. ⚠ The page is built but **not deployed yet** — this 404s until Daniel approves the push. |

## Facelift reveal

See `FACELIFT-CONTRACT.md`. `facelift-out/site/` currently holds a real completed run
(Alisa's Dance Academy) so the reveal slide can be built against real content today.
`facelift-fallback/` is the pre-baked offline fallback.

## Third-party images embedded in talk 2

| Image | Where | Source & licence |
|---|---|---|
| First-generation iRobot Roomba, top view | Slide 5, the janitor card, click 4 | **"Roomba original.jpg"** by Wikipedia user **Nv8200pa**, via Wikimedia Commons, **CC BY 4.0**. Background floodfilled out, resized to 300px, embedded as a base64 data URI so the deck needs no network. |

**CC BY 4.0 requires attribution.** Recorded here and in a comment beside the image in
`talk2-ai.html`. That is the normal, accepted practice for a slide used in a talk; if a
visible on-screen credit is ever wanted, a small dim line under the card is the place for it.
There is no share-alike clause on this one — that is why it was chosen over the several
CC BY-SA Roomba photos on Commons, since cutting the background out makes an adaptation.
