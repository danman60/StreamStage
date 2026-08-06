# Booth kiosk — Calgary Dance Teacher Expo, Aug 11–12 2026

Two screens, one tap. A studio owner taps a tile on the **tablet**; that film plays on the **TV**.
Nobody has to be told how it works, and nothing can get stuck — every screen returns to its idle
state on its own.

**It works with no internet.** The films are local files, the QR codes are local SVGs, there are no
fonts, scripts or analytics from the network. The only thing that needs a connection is the
attendee's own phone, scanning a QR on their own cell data.

---

## Start it

```bash
python3 ~/projects/StreamStage/expo-assets/kiosk/serve.py
```

That's the whole command. It prints the three addresses you need. Then open:

| Window | Address | Where it goes |
|---|---|---|
| **Tablet** | `http://localhost:8080/tablet` | The booth counter. The only thing anybody touches. |
| **TV** | `http://localhost:8080/tv` | The big screen. Click once, press **F**, walk away. |
| Launcher | `http://localhost:8080/` | Setup notes + the Fire Stick address. Open it once. |

On the TV window: **click anywhere once** (this is what lets it play sound — browsers block audio
until a real click), then press **F** for fullscreen. After that, leave it alone.

### Using a Fire Stick instead of an HDMI cable

The TV does not have to be the laptop. Anything with a browser on the same network works.

1. Get the laptop and the Fire Stick onto the **same network** — a travel router, or the laptop's
   own hotspot. **It does not need internet.** They only need to see each other.
2. On the Fire Stick, open **Silk** and go to the address `serve.py` printed, e.g.
   `http://192.168.0.134:8080/tv` — then **bookmark it**.
3. Point the tablet at the same address ending in `/tablet`.

The tap travels laptop → tablet → TV over a live event stream, so it works across devices. If the
Fire Stick reloads or drops off mid-show it reconnects on its own and is told what the TV should be
doing. The films stream off the laptop at roughly 4 Mbps, which local wifi handles easily.

**Test this at the hotel the night before, not at 8am on the floor.** HDMI is the fallback and it
has no moving parts.

---

## If a film will not play

```bash
~/projects/StreamStage/expo-assets/kiosk/sync-media.sh
```

It re-copies all five films from `/mnt/data/...` and always prefers the newest cut it can find
(`promo-vo.mp4` → `promo.mp4` → the 720p web versions). **When a film is re-rendered — new VO, new
edit — running this script is the entire deploy.** It also cuts a fresh poster frame for each.

A product whose film is missing does **not** black out the TV: it goes straight to that product's
signup QR. The server prints a warning at startup listing anything missing.

Other things worth knowing:

- **A film looks stuck / black.** Press **Esc** on the TV — it abandons and returns to the attract
  loop. Then tap the tile again.
- **No sound.** You never did the one-time click on the TV window. Click it, press **M** if needed.
- **The TV ignores the tablet.** Look at the dot next to "ON THE BIG SCREEN" on the tablet header:
  green means the TV is talking. If it is grey, the TV window is closed or the Fire Stick dropped
  off wifi. Reload the TV.
- **Everything is broken.** Close both windows, `Ctrl-C` the server, start again. Nothing is lost —
  telemetry is written to disk as it happens.

### Keys on the TV

`F` fullscreen · `M` mute · `Esc` stop the film · `←` `→` step the attract loop · `H` show the HUD

---

## What the numbers mean

Open the hidden tally on the tablet: **five taps in the top-left corner** within three seconds, or
`Ctrl+Shift+D` if there's a keyboard. `Esc` closes it.

It shows taps per product, how many films were watched to the end, the most-watched film, how many
attract loops ran, and the tap-to-picture time. **Export at the end of each day** — one button,
gives you a CSV and a JSON.

Events are also written to disk continuously at
`expo-assets/kiosk/telemetry/events-YYYY-MM-DD.jsonl`, flushed on every event, so a crash, a dead
battery or a closed tab loses nothing. Export anyway — it's easier to read.

### "QR shown" is not "QR scanned"

A scan happens on the attendee's phone. This page cannot see it, so **nothing here is labelled a
scan.** What is counted is a QR *impression* — that a code was on screen, and for how long.

The real scan count exists, on the other side. Every product QR carries
`?src=booth-calgary&p=<product>&s=tv|tablet`, so the destination site can tell you exactly how many
people arrived from the booth, from which film, and from which screen. Check the Vercel analytics
for each product after the show — that is the honest number.

The Facebook QR is deliberately **not** tagged: you have no way to read a query string off a group
join, so a tag there would only invent a number nobody can verify.

### Watch time is real seconds

`watch mins` is the sum of seconds of picture that actually played — not "started" minus "ended".
A film that stalls, or a tab in the background, does not accrue watch time. Quartile marks are
written at 25/50/75%, so even a view that dies mid-film still contributes what it genuinely got.

---

## Two things that are assumptions, not facts

1. **The CompSync signup URL was never given.** Its QR currently points at **`compsync.net`** so it
   is not a dead code on the floor. If that is wrong, edit `PRODUCTS` in `make-qr.py` and `CONFIG`
   in `kiosk.js`, re-run `python3 make-qr.py`, and reload. Flagged in the operator sheet too.

2. **Reflect's line was never confirmed by you.** The tile, the attract card and the end card all
   read *"The system that runs your studio's day — and remembers it."* That is taken **verbatim
   from beat 16 of its own VO script** (`/mnt/data/reflect-video/out/VO-SCRIPT.md`) — it is the
   film's own closing line, not a claim written at the booth. Change `tagline` in `kiosk.js` if you
   want different words.

---

## Email capture

There is **no email gate.** Switching films is free — a gate at a trade show reads as a paywall and
the person walks, and it would poison the tap numbers besides.

Instead, once a film **finishes**, the tablet adds a *"Want all five?"* card with a QR pointing at
your existing form at `streamstage.live/expo-leads.html`, tagged with the product they just watched.
It opens on **their** phone on **their** data, which is why it still works when the venue wifi is
dead — a form hosted on the booth laptop would not. The TV's end card points at it in words.

Nothing new was built for this: it is the same `/api/expo-leads` route as before. If you take a lead
in conversation, log it with **+1 lead captured** in the operator sheet so the day's numbers match.

---

## Files

| File | What it is |
|---|---|
| `kiosk.js` | **The one place you edit.** Products, film paths, URLs, copy, timings. Also the bus and the telemetry. |
| `tablet.html` | The controller. Tiles, now-playing takeover, hidden operator sheet. |
| `tv.html` | The big screen. Attract loop, warm film layers, end card. |
| `brand.css` | Shared design system — colours, the wordmark lockup, motion. |
| `serve.py` | Static files + the cross-device relay + telemetry to disk. Standard library only. |
| `make-qr.py` | Regenerates every QR. Run after changing any URL. |
| `sync-media.sh` | Pulls the newest cut of each film. Run after any re-render. |
| `index.html` | The launcher you open once at setup. |
| `qr/`, `brand/` | Committed. `media/`, `telemetry/` are generated and git-ignored. |

The old single-screen baked loop that used to be `index.html` is not gone — its cards, dwell timing
and progress bar are now the **attract state** of `tv.html`, which is where they belong. The loop
concept was replaced; the design was kept.

---

## Measured, not assumed

On a 1920×1080 TV and a 1024×768 tablet, driven over the relay as two separate devices:

- **Tap → first painted frame of the film: median 110 ms, worst 131 ms.** All five films are held
  open as live `<video>` elements, decoded on frame 0, from page load — a tap slides an already-warm
  layer in and calls `play()`. Nothing is created, fetched or seeked at tap time.
- Each film layer carries **its own** signup QR, so the QR cannot lag the picture: it arrives with
  the film rather than being swapped into place after it.
- No horizontal or vertical overflow at 1920×1080, 1024×768 or 820×1180.
- No console errors on any screen.
