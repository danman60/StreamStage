# TRADE SHOW READY — master checklist

Calgary Dance Teacher Expo. Talk 2 Tue Aug 11 09:20 · Talk 1 Wed Aug 12 10:50.
Fly Mon Aug 10 09:00. **Last working day Sun Aug 9.** Written Fri Aug 7 12:35 ET.

Daniel: *"EVERYTHING; THIS NEEDS TO BE COMPLETELY READY AND TESTED"*

Status key: ☐ not started · ◐ in progress · ☑ done+verified · ⚠ blocked/needs Daniel

---

## A. ALREADY VERIFIED READY (re-checked Aug 7, not taken on trust)

- ☑ **Talk 1** — 27 slides. Canonical file is `StudioSage/live-demo/talk1-deck.html`,
  md5 `ee95a6bd`, identical on FIRMAMENT. ⚠ `StreamStage/expo-assets/decks/talk1-video.html`
  is a STALE 13-slide Jul-20 copy — do not present it. See D1.
- ☑ **Talk 2** — 32 slides, md5 `9769113f`, identical in repo and on FIRMAMENT
  (named `talk2-deck.html` there).
- ☑ **Kiosk booth** — all endpoints 200, six films present, Range→206, six tablet tiles,
  tablet tap drove the TV to playback at 3.96s, zero console errors (smoke test Aug 7 12:32).
- ☑ **Lead API attribution + autoresponder** (`7dd83f0`) — source taxonomy, `raw` blob,
  visitor gets the asset, replyTo safe, best-effort isolation.
- ☑ **SES can email strangers** — production access, 50k/day, `streamstage.live` verified.

## B. THE GATE — capture everything (Daniel's core ask, NOT live yet)

- ☐ **B1** `public/g.html` — one gated landing page every material QR points at.
  Reads `?a=&src=&p=&s=`, takes name+studio+email, posts with attribution, confirms.
  Retries a failed post on next load (today's `ss_checklist_pending` is written and NEVER retried).
- ☐ **B2** `public/checklist.html` — send `asset:"checklist"` so the visitor actually gets an
  email, carry attribution, and retry the pending stash.
- ☐ **B3** Kiosk film gate — **per visitor, not per film**. First tap asks email+studio, then all
  six unlock until the tablet resets. Offline-first; queues to disk over LAN.
- ☐ **B4** Repoint QRs (`make-qr.py`, deck + handout QRs) at `/g?a=…` with attribution.

## C. VIDEO BUSINESS IN THE INTEGRATION (Daniel Aug 7)

- ☐ **C1** `recital` asset in `src/lib/lead-assets.ts` (recital filming + livestream).
- ☐ **C2** Wire `/api/recital-proposal`, `/api/dance-promo-proposal`,
  `/api/video-production-proposal` into the leads table. Today all three email Daniel and reach
  **no database at all** — every one is an unlogged lead.
- ☐ **C3** TV2 booth video. `TV2-streamstage-kiosk.mp4` (1920×1080, 3:01, WITH AUDIO, 304MB)
  transcoded to `media/streamstage-services.mp4`. Plays as a StreamStage services card on the TV
  attract loop with its own gated QR. **NOT a seventh product tile** — the tablet stays six.

## D. DECKS

- ☐ **D1** Kill the stale-talk1 trap: delete or clearly mark `expo-assets/decks/talk1-video.html`
  so the wrong deck cannot be opened on stage.
- ☐ **D2** Deck QRs → gated capture with `src=talk1|talk2`.
- ☐ **D3** `expo-assets/decks/seminar-unified.html` has a **decorative fake QR** (three finder
  squares, no data modules — physically unscannable) captioned `streamstage.live/book`.
  Fix or confirm the deck is retired.
- ☐ **D4** `handout-videographer-brief.html` has **no QR at all**, only printed URL text.

## E. THE KIOSK APP (Android) — nothing exists today

- ☐ **E1** Fire TV app that plays the pre-rendered loop **alone, no controller, no network**.
  This is the failure-mode insurance and it ships first.
- ☐ **E2** Tablet controller APK (WebView over the kiosk, LAN discovery, reconnect-on-wake).
- Reuse, do NOT start a new project: `~/projects/TVBOX` (`app/app` Fire TV shell,
  `app/companion` tablet, `app/installer`) and `~/projects/PhonePresenter` (WebView shell).
  ⚠ Do NOT reuse DanTV's remote channel — it drives the TV through Supabase over the INTERNET.
- ⚠ `presenter-server.py:18` and `kiosk/serve.py:345` BOTH default to port 8080 and the booth
  wants both at once.

## F. TEST + REHEARSE (the part that actually decides Calgary)

- ☐ **F1** Full booth rehearsal: laptop + TV + tablet on a phone hotspot, no internet.
- ☐ **F2** One REAL end-to-end capture: scan → gate → SES delivers → row lands in `leads`
  with correct source. ⚠ Needs Daniel's OK — it sends real mail.
- ☐ **F3** Offline drill: pull the network mid-show, confirm nothing is lost and it all flushes.
- ☐ **F4** Re-verify both decks after any change; re-sync to FIRMAMENT and md5 both sides.

## Order
B and C first (Daniel's core ask, and the booth already works without them).
E next (biggest unknown, and the booth survives without it — HDMI is the fallback).
F is non-negotiable: **a gate that fails on the floor costs more than no gate at all.**
