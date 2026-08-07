# ACTIVE ITEMS — running list

Live working list for the Calgary push. **Updated as things move; newest state always at top.**
Deep detail lives in `docs/plans/2026-08-07-TRADESHOW-READY-CHECKLIST.md`.

Last updated: **2026-08-07 13:50 ET**
Deadline: fly **Mon Aug 10 09:00** · last working day **Sun Aug 9** · Talk 2 Tue 09:20 · Talk 1 Wed 10:50

---

## 🔴 NEEDS DANIEL (blocking or decision-only)

| # | Item | Why it needs you |
|---|---|---|
| 1 | **Extended Fire Stick test** | You said you'd run this. The APK is built and side-load steps are in `kiosk-app/README.md`. The 7-step acceptance test is at the bottom of that file. |
| 2 | **Which Fire Stick generation?** | `minSdk 22` assumes 2nd-gen or newer. A 1st-gen stick will refuse to install. Never specified. |
| 3 | **Delete the test lead row?** | Tagged `TEST — ignore this row` in `leads`. Left in place deliberately; say the word. |
| 4 | **Reflect's tagline** | Still verbatim from its own VO script, never confirmed by you. |
| 5 | **Suite pricing / deal calculator** | Parked by you. No offer will be invented. |
| 6 | **StudioSage merges leads on email** | Two proposals from one studio collapse to one row; earlier notes overwritten. StudioSage-side change if you want one row per proposal. |
| 7 | **Demo reset on production** | `POST /api/demo/reset {"seeds":true}` — jazz-class question still fails without it. Rewrites live demo data, so held. |

## 🟡 IN FLIGHT / NEXT UP

| # | Item | State |
|---|---|---|
| 8 | **Full booth rehearsal** (F1) — laptop + TV + tablet on a phone hotspot, no internet | Not started. **This is the one that actually decides Calgary.** |
| 9 | **Offline drill on real hardware** (F3) | Done in the harness; never on the real kit. |
| 10 | **Tablet controller APK** (E2) | Not started. Tablet runs the browser today, which works. |
| 11 | **Deck QRs → gated capture** (D2) | Deck QRs still point at old targets, not `/g`. |
| 12 | **Videographer-brief handout QR** (D4) | Handout has no QR at all, only printed URL text. |
| 13 | **Port 8080 collision** | `presenter-server.py:18` and `kiosk/serve.py:345` both default to 8080; the booth wants both at once. Never tripped because they've never run together. |

## 🟢 DONE + VERIFIED TODAY (against production, not mocks)

| Item | Commit | Proof |
|---|---|---|
| Gated landing page `/g` + lead retry queue | `03bed96` | `/g` 200 live; every QR target 200; retry proven across offline→online |
| Real attribution + autoresponder | `7dd83f0` | Row in `leads` with `source=booth_tv`, populated `raw` — **first row ever with a real surface** |
| Four money forms reach the database | `b65a4a9` | 177 insertions / 0 deletions; all four still send mail with the forward dead |
| Kiosk film gate (per visitor) + services card + repointed QRs | `7677d29` | Gate → play at t=4.95 → 2nd film no re-gate; 20/20 QRs decoded with zbar |
| Fire Stick app | `a5ff9db` | Plays in airplane mode, no INTERNET permission, zero black frames across loop wrap |
| Fire Stick registers as home app (DanTV shape) | `75f20b4` | HOME+DEFAULT verified in the built APK; closes the HOME-escape and autostart gaps |
| Stale decks self-banner | `84c2e8e` | Both render a DO-NOT-PRESENT overlay at top layer |
| One real end-to-end capture | — | HTTP 200 in 2.0s, SES sent **both** mails (counter 12→14), row landed |

## ⚠️ KNOWN LIMITS — true, stated, not bugs to chase

- **Fire Stick app is emulator-verified only.** No Fire Stick on this machine. The 20-minute Fire
  OS sleep timer has never been outrun — longest run 7 min. That is the #1 thing to test on real
  hardware. (The wake lock is byte-identical to DanTV's, which you say works on a stick.)
- **Browser lead queue drains only when that visitor reopens `/g` or `/checklist`** on their phone.
  Strictly better than before (never), but not a server-side outbox. The kiosk's disk queue has no
  such limit.
- **`checklist.html`'s gate is client-side only** — trivially bypassed by incognito or JS off. Fine
  for a lead magnet; it is not security.
- **`kiosk.js` `Report.load()` has no abort deadline** on `GET /events`, so the operator tally
  freezes while the server is down. Pre-existing, not introduced today.
- **TV1/TV2 QRs are baked into rendered video** and cannot carry attribution without a re-render.
- **`expo-leads.html` CSV export passcode is the literal string `change-me`** in client source.
