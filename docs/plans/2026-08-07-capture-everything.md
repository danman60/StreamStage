# Capture everything — gated entry + real attribution, Calgary-ready

2026-08-07. Daniel: *"we should never give anything away for free without capturing an email…
we can't be losing leads… email and studio name… and then we need to track where they scan,
what path they came in through, whether that was interested in video, interest in software."*

Decisions taken by Daniel 2026-08-07:
- **Gate everything, including the booth films.**
- **Calgary-ready** — live Aug 11–12. Last useful working day **Sun Aug 9**.
- **Scan → landing page → email + studio → we send it.** No click-through to content.
- **SES only.** Not Resend.

## Verified facts this plan rests on (checked, not assumed)

- SES has **production access**: `ProductionAccessEnabled=true`, 50k/day, 14/s, HEALTHY.
  `streamstage.live` is a verified identity. Emailing an arbitrary visitor works today through
  `src/lib/mailer.ts`. (The old "SES rejects unverified replyTo" note is NOT a sandbox limit.)
- Resend has only `compsync.net` verified — `streamstage.live` is not there. SES it is.
- `LEADS_INGEST_TOKEN` is set in Production on **both** projects, so the StreamStage→StudioSage
  forward is live and `/api/leads` is not publicly writable.
- **Nothing anywhere reads `?src=&p=&s=`.** Those params exist only as strings inside QR images.
  Zero rows in any table record them. `lead_scans` was built for exactly this and has **0 rows
  and zero writers**.
- `leads` already has `interests text[]` and `raw jsonb`. `VALID_SOURCES` in
  StudioSage `api/leads/route.ts:25-28` already declares `booth, signup, tv1, tv2, talk1, talk2,
  facelift` — **declared but never written**. Only `expo_form` and `moves` are ever written.
- `/api/expo-leads` hardcodes the forwarded `source` to `'expo_form'`, discarding which surface
  the lead came from (`route.ts:114`).
- `public/checklist.html` already has the exact gate pattern to reuse (name+studio+email, blur,
  localStorage unlock, POST, deep-link hash restore). Its own comment records why it exists:
  *"The checklist used to be ungated: a room full of QR scans produced zero leads."*

**No schema migration.** `source` + `interests[]` + `raw jsonb` + `lead_scans` cover everything
asked for. Do not add columns to a live table three days before a trade show.

## The taxonomy (use these exact strings — they are already declared)

`source` — where they entered: `booth_tablet`, `booth_tv`, `talk1`, `talk2`, `checklist`,
`handout`, `expo_form`, `moves`, `facelift`. Extend `VALID_SOURCES` for the new ones.

`interests[]` — what they want, at least one of: `video` (recital filming, promo, livestream),
`software`, plus the specific product name when known (`StudioSage`, `CompSync`, `Callboard`,
`CostumeCraft`, `StudioBeat`, `Reflect`), plus the asset requested (`recital video checklist`).

`raw` — the full attribution blob verbatim: `{src, p, s, a, utm_*, path, referrer, ts}`.

## Phase 1 — the API carries attribution and answers the visitor (do first, everything depends on it)

`src/app/api/expo-leads/route.ts`:
1. Accept new optional body fields `src`, `p`, `s`, `asset`, `path`, `referrer`, and a real
   `source`. Keep every existing field working — four live forms and the checklist post to this
   route today and must not break.
2. Stop hardcoding the forwarded `source`. Forward the real one, validated against the taxonomy,
   falling back to `expo_form`. Put the whole attribution blob in `raw`.
3. **Autoresponder.** Send the requested asset to the visitor from `LEAD_FROM_EMAIL` via the
   existing `sesTransport`. `replyTo` stays `LEAD_FROM` — the lead's address goes in body fields
   only, never replyTo (SES bounces unverified replyTo). Include an unsubscribe link
   (CASL: the gate copy already promises "Unsubscribe any time" — it must be true).
4. The lead notification to Daniel must state the source and interests plainly.
5. Failure isolation: the autoresponder failing must never fail the capture. Daniel's copy and
   the DB write are what matter.

Acceptance: post with attribution → row in `leads` with the right `source`, `interests`, and a
populated `raw`; visitor receives the asset; Daniel receives the notification; an SES outage
still returns 200 and still records the lead.

## Phase 2 — one gated landing page every material QR points at

New `public/g.html` (static, matches `checklist.html`'s gate markup and voice — do NOT invent a
second design language). Reads `?a=<asset>&src=&p=&s=` from the URL, shows what they're about to
get, takes name + studio + email, posts to `/api/expo-leads` with the attribution, then shows a
"check your inbox" state.

Assets it can deliver (`a=`): `checklist`, `interviews`, `videographer`, `planner`, `sixfilms`,
`moves`.

Must-haves: works on a phone on cell data; never traps someone behind a failed POST — if the
send fails it still confirms AND queues the lead in localStorage with a **retry on next load**
(the existing `ss_checklist_pending` stash is written and never retried — that is a lost lead
and it is the thing Daniel just said we cannot do).

## Phase 3 — kiosk gates the films

`expo-assets/kiosk/tablet.html`. Gate **per visitor, not per film**: first tap raises the gate
(email + studio), then all six unlock until the tablet resets to attract for the next person.
Per-film gating would mean typing an email four times and the booth would grind.

- Reuses the `/lead` + offline-queue path already built (`f74c3e3`). Now carries `studio` too.
- Must work with **no internet**: capture to disk over LAN, `flush-leads.py` sends later.
- Because studio name is now captured, `flush-leads.py` stops synthesising
  `studio="(email-only booth capture)"` — the placeholder problem disappears rather than being
  argued about.
- The TV must keep running its attract loop with no tablet and no network. Do not put the gate
  anywhere on the TV's critical path.

## Phase 4 — repoint the QRs

`expo-assets/kiosk/make-qr.py` and the deck/handout QRs. Material QRs → `/g?a=…&src=…&p=…&s=…`.
Product signup QRs keep going straight to the product (we want them in the app) but keep their
`?src&p&s` tags.

Defects found in the sweep, to fix or flag while here:
- `expo-assets/decks/seminar-unified.html` has a **decorative fake QR** — three finder squares,
  no data modules. It cannot be scanned. Caption claims `streamstage.live/book`.
- `handout-videographer-brief.html` has **no QR at all**, only printed URL text.
- `decks/QR-demo-sms.png` encodes the **wrong number** (226-796-6037). Already flagged
  do-not-print in talk 2; make sure nothing references it.
- TV1/TV2 QRs are **baked into rendered video** and cannot carry attribution without a re-render.
  Out of scope for Calgary; note it.

## Phase 5 — close the unmirrored funnel (only if Phases 1–4 are done and rehearsed)

`contact`, `dancepromo`, `recital-proposal`, `video-production-proposal` all email Daniel and
**never reach the leads table**. That is a parallel funnel losing every lead to an inbox. Mirror
them to `/api/expo-leads`'s forward with `interests:['video']`. Deliberately last: it touches
live money-making forms and must not be rushed against a flight.

## Not in scope, reported instead
- `expo-leads.html`'s CSV export passcode is the literal string `change-me` in client source.
- `checklist.html`'s gate is client-side only and trivially bypassable (incognito, JS off, View
  Source). Fine for a lead magnet; just don't call it security.
- `kiosk.js` `Report.load()` has no abort deadline on `GET /events`, so the operator tally
  freezes while the server is down.

## Order and gate
Phase 1 → 2 → 3 → 4, each verified before the next. Phase 5 only if time remains after a full
booth rehearsal. **Rehearsal beats features**: a gate that fails on the floor costs more than no
gate at all.
