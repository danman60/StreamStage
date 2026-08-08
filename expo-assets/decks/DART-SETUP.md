# Getting the presenter stack onto DART

DART is the machine that will actually run the talk. FIRMAMENT stays the dev/rehearsal box.
**DART was offline (last seen ~10 days ago) when this was written**, so none of this could be done
remotely — it's written so it can be executed in one pass the moment DART is powered on and online.

---

## The networking answer (read this once, then stop worrying about it)

**They do not need to be on the same network.** Tailscale is not a same-LAN trick — it builds its own
encrypted network across whatever internet each device has. DART on venue wifi and the phone on
cellular still reach each other.

**A Tailscale address belongs to the machine, not the network:**

| Machine | Tailscale address | Phone URL |
|---|---|---|
| DART | `100.90.103.121` | `http://100.90.103.121:8090/remote` |
| FIRMAMENT | `100.75.112.14` | `http://100.75.112.14:8090/remote` |

Those never change when you switch between hotspot, venue wifi, or a hotel. **So the QR is generated
once and stays valid forever** — no regenerating anything before you go on.

Pre-made: `QR-remote-DART-tailscale.png` · `QR-remote-FIRMAMENT-tailscale.png`.

> ### ⚠ Those two QR images still say `:8080` — read this before the talk
>
> **The presenter now defaults to port 8090, not 8080.** 8080 and 8081 belong to the booth
> kiosk (`expo-assets/kiosk/serve.py`), which prints its address on the booth sheet and has it
> bookmarked on the Fire Stick, so the presenter is the one that moved. The two pre-made PNGs
> were generated before that and still encode
> `http://100.90.103.121:8080/remote` / `http://100.75.112.14:8080/remote` (decoded, verified).
>
> **The rest of this document therefore starts the server with an explicit
> `PRESENTER_PORT=8080`**, which is what the QR expects and is safe on stage, because the booth
> kiosk is not running during a talk. Every `:8080` address below is correct *for that command*.
>
> The alternative, if you'd rather have one presenter port everywhere: regenerate the two PNGs
> at `:8090`, then drop `PRESENTER_PORT` and read `8090` for `8080` throughout this file.
>
> **At the booth, never `PRESENTER_PORT=8080`** — the kiosk owns it. If you do it by mistake
> the presenter will not die: it skips 8080 and 8081, moves to the next free port, and prints
> a block telling you so. Read the window.

**The one case Tailscale can't cover:** a room with *no internet at all*. Then put the phone on DART's
hotspot (or DART on the phone's) and type the LAN address the server prints — it always prints every
address it's reachable on. Keep the printed run-of-show as the final fallback.

---

## Setup, in order

### 1. Prerequisites on DART
```
python --version          :: 3.8+ is fine. If missing, install it — the server is stdlib only.
tailscale status          :: must show DART as active and logged into the same tailnet
```

### 2. Copy the folder
From FIRMAMENT (both online), or from this repo:
```
rsync -av ~/projects/StreamStage/expo-assets/decks/ dart:'C:/Users/<user>/Desktop/StudioSage-Live-Demo/'
```
Everything the deck needs at runtime, and why:

| Item | Why it must be there |
|---|---|
| `talk2-ai.html` → rename `talk2-deck.html` | the deck |
| `presenter-server.py` | serves the deck + the phone remote + the facelift panel |
| `studiosage-dashboard-walkthrough.mp4` | **slide 31 loads this by relative path — a missing file means a slide that plays nothing** |
| `kb-demo/` | the offline fallback demo (slide 35). **Was a symlink until 2026-07-26** — it is now a real
folder, because `rsync -av` copies a symlink *as a symlink* and the target does not exist on DART.
A cold-serve test caught it 404ing: the one file you lose is the rescue for the live demo. If you ever
re-add symlinks here, copy with `rsync -avL`. |
| `img/` | **the four real poster artefacts on Move 4 (slide 16)** — a missing folder means a slide of broken
images, and Move 4 is the one beat that is nothing but pictures. Same class of bug as the kb-demo symlink. |
| `facelift-fallback/` | the pre-baked reveal if the live facelift fails |
| `facelift-run.sh`, `FACELIFT-CONTRACT.md` | the facelift trigger + its contract |
| `QR-remote-DART-tailscale.png` | what the room's presenter scans |
| `videos/`, `posters/` | **Talk 1 only** — skip if DART is Talk 2 only (that's ~179 MB) |

### 3. Firewall — do this at home, not at the venue
The first run of `python presenter-server.py` pops a Windows Firewall prompt. **Allow it once, on
both Private and Public networks.** Public matters: venue wifi is almost always classified Public, and
if it's unticked the phone silently can't reach the laptop and it looks like Tailscale is broken.

### 4. Smoke test before you leave the house
```
set PRESENTER_PORT=8080 && python presenter-server.py    :: leave the window open
:: 8080 because that is the port the pre-made QRs name (see the warning above).
:: Without it the presenter comes up on 8090 and the QRs scan to a dead address.
```
- On DART: `http://localhost:8080/talk2-deck.html` — the deck loads, slide 31 plays video.
- **Open devtools once and confirm ZERO 404s** walking the deck end to end. Verified clean on a cold
  copy of exactly this file list on 2026-07-26 (38 slides, fonts loaded, no failed requests).
- Press **O** on slide 34 and confirm slide 35 (the offline demo) actually renders — that is the
  wifi-failure rescue and it is the file most likely to be missing.
- On the phone: scan `QR-remote-DART-tailscale.png` — beats + Jump + Prev/Next appear.
- Press Next on the phone; the deck advances. **Then turn the phone's wifi OFF** and do it again over
  cellular — that proves the Tailscale path rather than the LAN path, which is the whole point.

### 5. PHONEPRESENTER
The app just posts to whatever host you type in, so point it at `100.90.103.121:8080`. Volume up =
next, down = back. Nothing to rebuild.

---

## Day-of checklist
- [ ] DART awake, plugged in, **sleep disabled** (a sleeping laptop kills the remote mid-talk)
- [ ] `tailscale status` shows DART active
- [ ] Server started with **`PRESENTER_PORT=8080`** — the window's banner must say 8080, not 8090
      (if it says it "moved to" anything, read that block: something else has the port)
- [ ] Server window open, deck at `http://localhost:8080/talk2-deck.html`, fullscreen
- [ ] Phone scanned in and advancing slides — tested over **cellular**, not just wifi
- [ ] Deck opened with `?rt=<DEMO_RESET_TOKEN>` or audience texts won't route
- [ ] Printed run-of-show in your pocket

## TALK 1 IS SERVED FROM A DIFFERENT FOLDER — read this before Wednesday
The canonical talk 1 is `~/projects/StudioSage/live-demo/talk1-deck.html` (27 slides), **not**
anything in this folder. It speaks the same remote contract as talk 2 (it POSTs `/state` and drains
`/cmd`), but it needs `presenter-server.py` sitting beside it:

```bash
cp ~/projects/StreamStage/expo-assets/decks/presenter-server.py ~/projects/StudioSage/live-demo/
cd ~/projects/StudioSage/live-demo && python3 presenter-server.py
```

That copy is gitignored on the StudioSage side (deliberately — one canonical server, no drift), so a
fresh clone will not have it and the step above is not optional. Discovered 2026-08-07: the
processes serving talk 1 were plain `python3 -m http.server`, which 404s `/state` and `/cmd`, so the
phone had **nothing to drive** for the Wednesday 10:50 talk and nothing said so.

⚠ A presenter server with no deck attached still shows the phone a green dot, a slide number and a
title. Green does not mean the deck is connected — check the slide count is 27 (talk 1) or 32
(talk 2). A wrong count now raises a red banner on the phone.

## Gotchas
- **Don't open the deck by double-clicking the html.** The remote only talks to the served copy at
  `localhost:8080`.
- Closing the server console window stops the remote.
- If the phone shows a red dot, the server is unreachable — check DART hasn't slept, then Tailscale,
  then the firewall's Public profile.
- Tailscale needs internet on both ends to establish a link. Established peers on the same LAN keep
  working, but don't count on a cold start in an internet-free room; that's the hotspot fallback.
