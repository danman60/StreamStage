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
| DART | `100.90.103.121` | `http://100.90.103.121:8080/remote` |
| FIRMAMENT | `100.75.112.14` | `http://100.75.112.14:8080/remote` |

Those never change when you switch between hotspot, venue wifi, or a hotel. **So the QR is generated
once and stays valid forever** — no regenerating anything before you go on.

Pre-made and ready: `QR-remote-DART-tailscale.png` · `QR-remote-FIRMAMENT-tailscale.png`.

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
python presenter-server.py                      :: leave the window open
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
- [ ] Server window open, deck at `http://localhost:8080/talk2-deck.html`, fullscreen
- [ ] Phone scanned in and advancing slides — tested over **cellular**, not just wifi
- [ ] Deck opened with `?rt=<DEMO_RESET_TOKEN>` or audience texts won't route
- [ ] Printed run-of-show in your pocket

## Gotchas
- **Don't open the deck by double-clicking the html.** The remote only talks to the served copy at
  `localhost:8080`.
- Closing the server console window stops the remote.
- If the phone shows a red dot, the server is unreachable — check DART hasn't slept, then Tailscale,
  then the firewall's Public profile.
- Tailscale needs internet on both ends to establish a link. Established peers on the same LAN keep
  working, but don't count on a cold start in an internet-free room; that's the hotspot fallback.
