# FACELIFT CONTRACT — presenter-server ⇄ deck

Written by the **SageDev** session, which owns `presenter-server.py` and `facelift-run.sh`.
The **ExpoDeck** session owns `talk2-ai.html` and renders the plant/reveal slides from this.
SageDev has not touched, and will not touch, the deck html.

Status: **built and validated end to end** on 2026-07-26 — both in rehearsal mode and with a **real
unattended run**: a url typed into the phone panel produced a finished, revealable site in
**17 minutes** (`alisasdanceacademy.com`; the runner exited `rc=0` at ~19 min). That build is what
`/facelift-site/index.html` currently serves, so the deck can be developed against real content.

---

## What the presenter can now do from the phone

`/remote` has a **★** button in the bottom nav. It opens a Facelift panel: a url field, a
**GO — start the rebuild** button, and a live status block (status · their url · reveal url),
plus Close / Reset run. Daniel types the url the room shouts out, hits GO, and keeps talking.
No app switching, no Telegram.

---

## The state the deck can read

`GET /state` (the deck already polls this) now carries a `facelift` object. `GET /facelift`
returns the same object on its own.

```json
{
  "status":       "idle | queued | running | ready | failed",
  "url":          "https://theirstudio.com",   // normalised; "" when idle
  "stage":        "scrape | brand | build | qa | deploy | …",  // free text, safe to display
  "local_url":    "/facelift-site/index.html", // set once a revealable build exists
  "deployed_url": "",                          // set only if a hosted deploy was approved+ran
  "fallback_url": "/facelift-fallback/index.html",  // the pre-baked site, always present
  "error":        "",
  "started_at":   1785100563,                  // unix seconds
  "updated_at":   1785100564
}
```

### What the deck should render

- **PLANT slide** — when `facelift.url` is non-empty, show it big ("we're rebuilding
  **theirstudio.com**"). For the live scrollable view of their CURRENT site, iframe
  `facelift.url` directly. ⚠ Many studio sites send `X-Frame-Options`/CSP that block framing —
  budget for that: fall back to the url as type + a screenshot, or just the url. Don't let a
  blocked iframe blank the slide.
- **REVEAL slide** — iframe `facelift.deployed_url || facelift.local_url || facelift.fallback_url`,
  in that order, behind your curtain. All three are same-origin or plain http, so they frame fine.
- **Reveal readiness** — `status === "ready"` (or any non-empty `local_url`) means the curtain
  can open. `status === "failed"` means open the curtain on `fallback_url` and say so honestly.

Poll is already 400ms via `/state`; nothing new to wire up.

---

## Endpoints (server side, all on the presenter port, default 8090)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/facelift` | the JSON object above |
| `POST` | `/facelift` `{"action":"start","url":"…"}` | validate + launch. 409 if a run is live (add `"force":true` to override) |
| `POST` | `/facelift` `{"action":"reset"}` | clear status back to idle |
| `GET` | `/facelift-site/…` | the freshly built site (stable alias for `facelift-out/site/`) |
| `GET` | `/facelift-fallback/…` | the pre-baked fallback site |

Bare domains are accepted and normalised (`foo.com` → `https://foo.com`).

---

## Where the reveal is served FROM (and why)

**Locally, off the laptop, by default.** Two reasons:

1. Vercel deploys are gated by the `block-deploy` hook and **nobody has approved an unattended
   push**, so the runner is wired to build-and-serve, not publish. Flip it by setting
   `FACELIFT_DEPLOY_OK=1` in the server's environment — but that needs Daniel's explicit OK first.
2. Venue wifi. A reveal served from `localhost` cannot be killed by the room's network. Hosted is
   the nice-to-have; local is the one that survives.

The offer promised on stage (free, hosted one year, then $20/year) is unaffected — hosting happens
after the show, not during it.

---

## The pre-baked fallback — it exists and it is fully offline

`decks/facelift-fallback/` is a real, already-shipped facelift of **Ancaster Dance Arts** (a real
Ontario studio, and a live StudioSage client). Tailwind and all 14 Google font files were
downloaded into `assets/vendor/` and the html rewritten to use them, so it renders with **zero
internet** — verified by screenshot. Its only remaining external reference is the `w3.org` SVG
namespace, which is not a fetch.

If the live run fails, the reveal still lands: open the curtain on `fallback_url`, and say plainly
that this one was built earlier.

---

## Rehearsal mode (test the whole path in 20 seconds)

Start the server with `FACELIFT_FAKE=1` and the runner walks scrape → build → qa in 15s and then
serves the pre-baked site as if it had just built it. Everything downstream — status, the phone
panel, `/facelift-site/`, the deck's reveal — behaves exactly as in a real run.

```bash
cd expo-assets/decks
FACELIFT_FAKE=1 python3 presenter-server.py
```

---

## Known limits (say them out loud rather than discover them on stage)

- A real run takes **about 20 minutes**, not 60–90. ⚠ This line used to say 60–90 and that was
  wrong; the reorg proposal then used the wrong number as a reason to cut the reveal. Both
  recorded runs disagree with it:
  - `alisasdanceacademy.com` — **17 min** to a revealable site (runner exited rc=0 at ~19).
  - `steppinupdanceco.ca`, the real on-stage run — **21 min**. `facelift-out/status.json`:
    `started_at` 1785356381 = 2026-07-29 16:19:41 ET, `updated_at` 1785357647 = 16:40:47,
    `status: ready`, `stage: done`.

  That second run started ~10 minutes into the Toronto talk and was **finished at minute 31**;
  the reveal was attempted around minute 50 and still failed, so **the failure was in the reveal
  path, not the build** (he ended up showing their original site served locally). Budget ~20 min,
  verify the reveal separately, and still start it at the PLANT slide — early costs nothing.
- One run at a time. A second GO returns 409 until you hit Reset run.
- The runner writes `facelift-out/claude.log` and `facelift-out/runner.log` — that is where to
  look if status sticks on `running`.
- If the headless session dies without copying its build, the runner sweeps for one — first
  `client-demos/clients/`, then `~/projects/<Client>/mock` and friends (verified against the real
  run's artifacts). A build that exists on disk is never lost to a copy step.
- **`status` can read `ready` slightly before the Claude process exits** — the session marks itself
  done while it finishes writing its own notes. That's harmless: the server reports `ready` off the
  presence of `site/index.html`, so the reveal is safe the moment the file lands, and the runner
  writes a final `ready · done` when the process actually exits.
- Starting a new run moves the previous build aside, so a stale site can never be revealed as if it
  were the fresh one. If a run fails, `local_url` is empty and the deck should fall through to
  `fallback_url`.
