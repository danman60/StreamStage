# Kiosk: tablet email capture (option 2) + TV attract full-width

2026-08-07. Daniel's calls: CompSync URL confirmed (done, `5f1e51e`); build email capture
option 2; fix TV attract cards using only the left half of 1920×1080. Promo re-uploads dropped.

## Constraints (non-negotiable, from README-BOOTH.md + vault)
- serve.py keeps HTTP Range/206. SSE relay retains ONLY `tv` state messages. Telemetry stays on
  its own port (page port + 1) — page-port connection budget is spent on EventSource + video.
- No internet on the critical path. Venue wifi may be dead.
- "StudioSync" never renders on a booth screen.
- No email gate on films — capture is optional, post-film, never blocking.

## Item 2 — tablet-side email capture with offline queue

Today: after a film finishes, tablet shows a "Want all six?" card with a QR to
`streamstage.live/expo-leads.html` (opens on the visitor's phone, their data). Keep that.
Add: an email input on the same card so a visitor (or Daniel mid-conversation) can type an
email directly on the tablet.

Design — lead path mirrors the proven telemetry path:
1. `tablet.html`: email input + product tag + submit on the post-film card AND an operator
   "type a lead" affordance in the operator sheet. Validate shape client-side. On submit:
   queue in localStorage (`ssKiosk.v1.leadQueue`), then attempt flush.
2. Flush: POST to the TELEMETRY port (port+1, same CORS/text-plain pattern as telemetry
   batches, 6s abort deadline) → new serve.py endpoint `/lead` on the telemetry listener →
   append to `telemetry/leads-YYYY-MM-DD.jsonl` on disk. On success, remove from queue.
   Retry on interval + on next submit. Queue survives reload (localStorage).
3. `serve.py`: accept POST /lead on telemetry port; record `{email, product, ts, via}`.
   Also count leads in `/events` summary so the operator tally (`h-lead`) includes typed leads.
4. New `flush-leads.py` (stdlib only): run WITH internet after the day — reads
   `telemetry/leads-*.jsonl`, POSTs each to `https://streamstage.live/api/expo-leads`
   (existing route, existing field names — read `src/app/api/expo-leads/route.ts` for the
   contract), marks flushed in a sidecar file so re-runs don't double-send. SES replyTo
   gotcha: lead email goes in body fields only, never replyTo.

Acceptance:
- Type email on tablet with server up → line lands in `telemetry/leads-*.jsonl` within 7s.
- Kill telemetry port, type 2 emails → both persist in localStorage; restart server → both
  flush without duplicates.
- Film switching never blocks on the capture UI; card still shows the QR path unchanged.
- `flush-leads.py --dry-run` prints what it would send; real run posts to the live route.

## Item 3 — TV attract cards use the full 1920×1080

Today: copy column max-width 98rem sits left; right side has only a ghost wordmark
(opacity .028) and a 30rem QR bottom-right. Reads as half a screen.

Design (visual coherence gate applies — match existing tokens in tv.html/brand.css, no new
fonts/colors): keep the left copy column as the anchor; build a real right column —
product icon (brand/icons silhouettes exist for all six), bigger QR plate moved into the
column, accent-tinted panel or beams consistent with the end card's radial-gradient
language. Ghost wordmark can stay behind. `.sub`/`.rows` may widen modestly. The invite
("go tap it") card and end card only get touched if they share the same imbalance.

Acceptance:
- Screenshot each attract card at 1920×1080 headless (Playwright CLI, saved as PNG files —
  they auto-DM to Telegram). No overflow, no clipped text, right half visibly used.
- Also verify at 1280×720 (unknown venue TV) — rem scaling should handle it; confirm.
- No change to film layers, SSE handling, or timing config.

## Files
- Item 2: `expo-assets/kiosk/tablet.html`, `expo-assets/kiosk/serve.py`,
  `expo-assets/kiosk/flush-leads.py` (new), `expo-assets/kiosk/README-BOOTH.md`
- Item 3: `expo-assets/kiosk/tv.html` only
- Disjoint file sets → two parallel subagents; README updated by item-2 agent only.

## Test ports
Item 2 agent: `serve.py --port 8090` (telemetry 8091). Item 3 agent: `serve.py --port 8094`.
Never 8080 (presenter-server collision) and never each other's.
