# Getting the presenter stack onto DART

DART is the machine that will actually run the talk. FIRMAMENT stays the dev/rehearsal box.

> **EXECUTED AND VERIFIED ON DART, 2026-08-07 23:5x ET.** DART was offline when this was first
> written; it is online now and everything below has been run against it. What is true right now:
>
> - Both decks are on DART in `C:\Users\User\Desktop\StudioSage-Live-Demo\`, current versions —
>   `talk2-deck.html` **32 slides**, `talk1-deck.html` **27 slides**, both counted on DART itself.
>   (It had been serving a **38-slide** talk 2 — the pre-rebuild deck — since late July.)
> - Talk 1's 35 referenced assets (209 MB of `videos/` + `posters/`) are on DART. All six videos
>   that the deck pulls answered HTTP 206 with range support.
> - `presenter-server.py` is the current copy and serves on **8090**.
> - Both decks were loaded from another machine over the LAN and reported the right slide count
>   with no stale-deck alarm; a phone-shaped `/cmd` `next` advanced the deck and `prev` returned it.
> - A Windows Firewall rule named **"StreamStage Presenter"** now allows inbound TCP 8080/8083/8090
>   to `C:\Python313\python.exe` on all profiles. Before it, the server was listening and every
>   phone request timed out — §3's prompt never appeared because it was started headlessly.
> - Reachable on the LAN (`192.168.0.13:8090`) **and** over Tailscale (`100.90.103.121:8090`).
>
> **Not verified:** the physical Pixel driving it, and the cellular (rather than LAN) path.

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

Pre-made, and **correct as of 2026-08-07**: `QR-remote-100.90.103.121.png` (DART) ·
`QR-remote-100.75.112.14.png` (FIRMAMENT) · `QR-remote-192.168.0.13.png` (DART on this LAN).
All three were decoded after generation and encode `:8090`.

> ### ⚠ THE PRESENTER PORT IS 8090 AND CANNOT BE 8080 — this replaces an instruction that could not work
>
> An earlier version of this file told you to start the server with `PRESENTER_PORT=8080`
> so it would match two QR images made at `:8080`, and the day-of checklist said the banner
> "must say 8080". **That state cannot happen.** `pick_port()` in `presenter-server.py` skips
> 8080 and 8081 *unconditionally* — they belong to the booth kiosk (`expo-assets/kiosk/serve.py`),
> whose address is on the booth sheet and bookmarked on the Fire Stick. Asking for 8080 is
> refused by this file, not by the operating system, so freeing the port changes nothing and
> retrying is wasted time. (The banner used to say "PORT 8080 WAS ALREADY IN USE", which sent a
> reader hunting a process that did not exist; it now says the port is reserved.)
>
> **So: the presenter runs on 8090. Do not set `PRESENTER_PORT` at all.**
>
> The two old PNGs really did encode `http://100.90.103.121:8080/remote` and
> `http://100.75.112.14:8080/remote` (decoded, verified) — dead addresses. They are renamed
> `DEAD-port8080-*.png` in this folder so nobody scans one on stage, and the three replacements
> above are the ones to use. `presenter-server.py` prints "scan `QR-remote-<ip>.png`" next to any
> address it finds a matching file for, so a correctly-named PNG is announced by the server itself.

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
**`rsync` is not on DART** — it is Windows, and `rsync ... dart:` fails with
`'rsync' is not recognized`. Use tar over scp; Windows 10+ ships `tar`:
```bash
cd ~/projects/StreamStage/expo-assets && \
  tar czf /tmp/decks.tgz --exclude=facelift-out --exclude=shots --exclude=_shots -C decks .
scp /tmp/decks.tgz 'dart:C:/Users/User/Desktop/decks.tgz'
ssh dart 'cd C:\Users\User\Desktop\StudioSage-Live-Demo && tar xzf C:\Users\User\Desktop\decks.tgz'
ssh dart 'cd C:\Users\User\Desktop\StudioSage-Live-Demo && copy /Y talk2-ai.html talk2-deck.html'
```
Talk 1's deck and its 209 MB of media come from the StudioSage repo, not this folder — see the
talk-1 section at the bottom.
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
| `QR-remote-100.90.103.121.png` | what the room's presenter scans (`:8090`) |
| `videos/`, `posters/` | **Talk 1 only** — skip if DART is Talk 2 only (that's ~179 MB) |

### 3. Firewall — do this at home, not at the venue
The first run of `python presenter-server.py` pops a Windows Firewall prompt. **Allow it once, on
both Private and Public networks.** Public matters: venue wifi is almost always classified Public, and
if it's unticked the phone silently can't reach the laptop and it looks like Tailscale is broken.

### 4. Smoke test before you leave the house
```
start-presenter.bat        :: double-click it on DART's desktop; leave the window open
:: Or by hand, from the deck folder:  python presenter-server.py
:: Do NOT set PRESENTER_PORT. The default 8090 is the only port this can use.
```
- On DART: `http://localhost:8090/talk2-deck.html` — the deck loads, slide 31 plays video.
- **Open devtools once and confirm ZERO 404s** walking the deck end to end. Verified clean on a cold
  copy of exactly this file list on 2026-07-26 (38 slides, fonts loaded, no failed requests).
- Press **O** on slide 34 and confirm slide 35 (the offline demo) actually renders — that is the
  wifi-failure rescue and it is the file most likely to be missing.
- On the phone: scan `QR-remote-100.90.103.121.png` — beats + Jump + Prev/Next appear.
- Press Next on the phone; the deck advances. **Then turn the phone's wifi OFF** and do it again over
  cellular — that proves the Tailscale path rather than the LAN path, which is the whole point.

### 5. PHONEPRESENTER
The app just posts to whatever host you type in, so point it at `100.90.103.121:8090`. Volume up =
next, down = back. Nothing to rebuild.

---

## Day-of checklist
- [ ] DART awake, plugged in, **sleep disabled** (a sleeping laptop kills the remote mid-talk)
- [ ] `tailscale status` shows DART active
- [ ] Server started (`start-presenter.bat`) — the banner says **8090**. If it says a port is
      RESERVED, that is normal only if you set PRESENTER_PORT yourself; don't.
- [ ] Server window open, deck at `http://localhost:8090/talk2-deck.html`, fullscreen
- [ ] Phone scanned in and advancing slides — tested over **cellular**, not just wifi
- [ ] Deck opened with `?rt=<DEMO_RESET_TOKEN>` or audience texts won't route
- [ ] Printed run-of-show in your pocket

## TALK 1 — now served from the SAME folder on DART as talk 2

> **Changed 2026-08-07.** On DART both talks now live in
> `C:\Users\User\Desktop\StudioSage-Live-Demo\` and **one** presenter server on 8090 serves both:
> `http://localhost:8090/talk1-deck.html` and `.../talk2-deck.html`. There is no second server and
> no second port. Whichever deck page is open is the one that POSTs `/state`, so the phone drives
> that one — the server holds no opinion. Both were verified this way.
>
> To refresh talk 1 on DART after editing it in the StudioSage repo:
> ```bash
> scp ~/projects/StudioSage/live-demo/talk1-deck.html \
>     'dart:C:/Users/User/Desktop/StudioSage-Live-Demo/talk1-deck.html'
> # and its media, if that changed — 35 files, 209 MB:
> cd ~/projects/StudioSage/live-demo && \
>   grep -oE '(src|href|poster)="[^"]*\.(mp4|webm|jpg|png|jpeg)"' talk1-deck.html \
>   | sed 's/.*="//;s/"//' | sort -u > /tmp/t1.txt
> tar czf /tmp/t1.tgz -T /tmp/t1.txt && scp /tmp/t1.tgz 'dart:C:/Users/User/Desktop/t1.tgz'
> ssh dart 'cd C:\Users\User\Desktop\StudioSage-Live-Demo && tar xzf C:\Users\User\Desktop\t1.tgz'
> ```

### On your own laptop (unchanged)
The canonical talk 1 is `~/projects/StudioSage/live-demo/talk1-deck.html` (27 slides). It speaks the
same remote contract as talk 2 (it POSTs `/state` and drains `/cmd`), but it needs
`presenter-server.py` sitting beside it:

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
  `localhost:8090`.
- Closing the server console window stops the remote.
- If the phone shows a red dot, the server is unreachable — check DART hasn't slept, then Tailscale,
  then the firewall's Public profile.
- Tailscale needs internet on both ends to establish a link. Established peers on the same LAN keep
  working, but don't count on a cold start in an internet-free room; that's the hotspot fallback.
