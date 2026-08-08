# Booth kiosk — Calgary Dance Teacher Expo, Aug 11–12 2026

Two screens, one tap. A studio owner taps a tile on the **tablet** (held **portrait**, six
products, everything on one screen); that film plays on the **TV**.
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
| **Tablet** | `http://localhost:8080/tablet` | The booth counter, **in portrait**. The only thing anybody touches. |
| **TV** | `http://localhost:8080/tv` | The big screen. Click once, press **F**, walk away. |
| Launcher | `http://localhost:8080/` | Setup notes + the Fire Stick address. Open it once. |

**Read the addresses off the window, not off this page.** They are almost always the ones
above, but if something else on the laptop already holds 8080 the kiosk moves itself up and
prints a loud block saying so. The window is always right; a printout can be stale.

### Running the deck presenter at the same time

You can. They no longer fight over a port:

| Server | Ports | Start it with |
|---|---|---|
| **Booth kiosk** (this) | **8080** pages · **8081** telemetry | `python3 expo-assets/kiosk/serve.py` |
| **Deck presenter** (phone remote) | **8090** | `cd expo-assets/decks && python3 presenter-server.py` |

The kiosk needs **two ports next to each other** — the pages fetch telemetry from *page port
+ 1*, deliberately a different origin so telemetry can't be starved by the films (see
"Measured, not assumed"). So 8080 **and** 8081 are the kiosk's; never point anything else at
either. The presenter used to default to 8080 as well, which is why it moved to 8090.

If a port is taken anyway, neither server dies with a stack trace: each says in plain English
what is probably holding the port, moves up to the next free one (the kiosk moves the *pair*,
so telemetry stays page + 1; the presenter refuses to land on 8080 or 8081), and prints the
real addresses. Two things to know when that happens:

- **The addresses on the window are the real ones.** The Fire Stick bookmark and anything
  printed for `:8080` are wrong until you free 8080 and start the kiosk again.
- The usual cause is **a window you left open** — an older kiosk or presenter. Close it,
  restart, and you are back on 8080.

To force a port yourself: `python3 serve.py --port 9000` (telemetry then goes to 9001), or
`PRESENTER_PORT=9100 python3 presenter-server.py` for the deck.

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

It re-copies all six films from `/mnt/data/...` and always prefers the newest cut it can find
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
`expo-assets/kiosk/telemetry/events-YYYY-MM-DD.jsonl`, so a crash, a dead battery or a closed tab
loses nothing. Export anyway — it's easier to read.

### "QR shown" is not "QR scanned"

A scan happens on the attendee's phone. This page cannot see it, so **nothing here is labelled a
scan.** What is counted is a QR *impression* — that a code was on screen, and for how long.

The real scan count exists, on the other side. Every product QR carries
`?src=booth-calgary&p=<product>&s=tv|tablet`, so the destination site can tell you exactly how many
people arrived from the booth, from which film, and from which screen. Check the Vercel analytics
for each product after the show — that is the honest number.

**Two kinds of QR, on purpose.** A **product** QR goes straight to the product — we want a studio
owner *in the app*, not behind a form. A **material** QR (the "all six films" offer, the recital
services card on the TV) goes to the gated landing page `streamstage.live/g`, because nothing we
give away goes out without an email and a studio name against it. Material QRs carry
`?a=<asset>&src=booth_tablet|booth_tv&p=<product>&s=<surface>`.

The Facebook QR is deliberately **not** tagged: you have no way to read a query string off a group
join, so a tag there would only invent a number nobody can verify.

### Watch time is real seconds

`watch mins` is the sum of seconds of picture that actually played — not "started" minus "ended".
A film that stalls, or a tab in the background, does not accrue watch time. Quartile marks are
written at 25/50/75%, so even a view that dies mid-film still contributes what it genuinely got.

---

## The tile icons

Where a product has a real mark, the real mark is used: **StudioSage's robot**, **CompSync's
dancer-S**, and **StudioBeat's layers glyph** — the one its own app sidebar and the film's end card
use. Only **Callboard, CostumeCraft and Reflect** have icons drawn for the kiosk, because those
three have no mark anywhere in their repos.

They still read as one set because the *treatment* is shared, not because the assets are: every
mark is reduced to a single ink colour on an identical rounded square in the product's accent
gradient. The originals could not be dropped in as they ship — CompSync's sits on a black plate,
StudioBeat's on a copper one, StudioSage's is the full lockup with the wordmark on cream — so
`brand/icons/` holds silhouettes cut from those originals. Re-cut them if a logo changes.

## The sixth product, and films that are not cut yet

**StudioBeat** is the sixth tile. Its film was still being cut when this was built, and the kiosk
handles that on its own — it does not need you to do anything:

- The tablet asks the server which films exist and shows **TAP TO SCAN** on any product whose film
  is missing, instead of promising a film that will not play. Its QR works normally.
- The TV never points a video at a missing file, so there is no broken layer and no black screen.
- `sync-media.sh` looks for StudioBeat's render in both `out/` and `promo/out/`. **When it lands,
  run the script — the tile becomes a normal "tap to watch" tile within 30 seconds. No code change,
  no restart, no reload.**

The product is called **StudioBeat** everywhere. The repo is named StudioSync; that is the old name
and it must never appear on a booth screen.

## The StreamStage services card (TV only)

The TV attract loop carries one card that is **not a product**: StreamStage's own recital filming and
livestream film, `media/streamstage-services.mp4` (1920×1080, 3:01, with audio). It sits between
Reflect and the closing card, plays right through, and carries its own gated QR
(`qr/tv/recital.svg` → `/g?a=recital`). The loop moves on when the film ends.

**The tablet stays at six tiles.** This is not a seventh product and there is nothing to tap for it.

If `media/streamstage-services.mp4` is missing, the card degrades the same way a product with no
film does: it becomes an ordinary text attract card with the same QR, on the normal 12-second hold.
Nothing to configure — the card asks the server which films exist, exactly like the film layers do.

It is served from the **telemetry port** (`8081`, one above the page), not the page port. That is not
a detail you can change casually: on the page port it was a seventh video competing for the browser's
~6 connections, and it sat unloaded for nine seconds while Chrome **aborted all six warm product
films** to make room for it. Measured. Off the page origin, neither happens.

## One thing that is an assumption, not a fact

(CompSync's signup URL **`compsync.net`** was confirmed by Daniel 2026-08-07 — no longer an
assumption.)

1. **Reflect's line was never confirmed by you.** The tile, the attract card and the end card all
   read *"The system that runs your studio's day — and remembers it."* That is taken **verbatim
   from beat 16 of its own VO script** (`/mnt/data/reflect-video/out/VO-SCRIPT.md`) — it is the
   film's own closing line, not a claim written at the booth. Change `tagline` in `kiosk.js` if you
   want different words.

---

## Email capture — the film gate

**The films are gated, once per visitor.** The first tile somebody taps raises a card asking for a
**studio name and an email**; on submit that film starts and **all six unlock** for that person.
Every tap after that goes straight to the film — nobody types an email twice.

The gate re-arms for the next person when the tablet resets, which is **90 seconds with nobody
touching it and no film on the TV** (`CONFIG.idle.tabletResetMs`). A film playing on the big screen
counts as "they're still here", so a session never expires out from under someone mid-film. A gate
nobody finishes clears itself after 45 seconds (`CONFIG.idle.gateAbandonMs`), so the next visitor
walks up to six tiles and not a stranger's half-filled form.

**It works with no internet and no laptop.** The capture is written to the tablet's own localStorage
the instant Submit is pressed — the films unlock off that write, not off any server answering. The
lead then flushes over the booth's LAN to `telemetry/leads-YYYY-MM-DD.jsonl`, and `flush-leads.py`
sends it upstream later, when there is internet.

**If the gate is ever in the way** — someone genuinely will not type an email, the keyboard is stuck,
there's a queue building — open the operator sheet (five taps top-left) and press **"Unlock films —
skip the gate"**. That unlocks the six films for the person standing there and nobody else; the next
visitor is gated normally. It is deliberately five taps deep: a visible "skip" button would be the
whole gate, gone.

The operator sheet's **Gate** line tells you which state you are in: `armed`, or `unlocked — <email>`.

### After a film finishes

Once a film **finishes**, the tablet still shows the *"Want all six?"* card. If the visitor came
through the gate it is already answered in their name — they are not asked twice. Otherwise it
offers **two ways in, same offer**:

1. **The QR** — points at the gated landing page `streamstage.live/g?a=sixfilms`, tagged with the
   product they just watched and the screen they scanned from. It opens on **their** phone on
   **their** data, which is why it still works when the venue wifi is dead. The TV's end card points
   at it in words.
2. **A typed email** — an input on the same card, for the visitor who won't scan (or for you,
   mid-conversation). It needs **no internet at all**: the email is queued in the tablet's
   localStorage the instant it's typed, then flushed to the laptop over the booth's own network —
   `serve.py` appends it to `telemetry/leads-YYYY-MM-DD.jsonl`, fsync'd, same as telemetry. If the
   server is down the queue just waits (it survives reloads) and drains when it's back. The
   operator sheet shows **Lead queue** — that number should be 0 whenever the relay is online.

The operator sheet also has its own **type a lead's email** input (same queue), next to the old
**+1 lead captured** button for leads you took on paper. Typed leads count in the **Leads** tally
automatically.

**At the end of each day, once you're somewhere with internet:**

```bash
python3 ~/projects/StreamStage/expo-assets/kiosk/flush-leads.py --dry-run   # look first
python3 ~/projects/StreamStage/expo-assets/kiosk/flush-leads.py             # then send
```

That POSTs each typed lead to the same `/api/expo-leads` route the form uses, so each arrives as a
normal lead email. It marks every confirmed send in `telemetry/leads-flushed.json` — **re-running
it never double-sends**, so run it as often as you like until it reports 0 to send.

---

## Files

| File | What it is |
|---|---|
| `kiosk.js` | **The one place you edit.** Products, film paths, URLs, copy, timings. Also the bus and the telemetry. |
| `tablet.html` | The controller, portrait-first. Six tiles with drawn app icons, now-playing takeover, hidden operator sheet. |
| `tv.html` | The big screen. Attract loop, warm film layers, end card. |
| `brand.css` | Shared design system — colours, the wordmark lockup, motion. |
| `serve.py` | Static files + the cross-device relay + telemetry and typed leads to disk (on their own port). Standard library only. |
| `flush-leads.py` | Sends the typed leads to the live `/api/expo-leads` route. Run after each day, with internet. Never double-sends. |
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

- **Tap → first painted frame: median 87 ms, p90 99 ms, worst 121 ms**, measured over 15 plays with
  all six layers warm. Faster than the five-product build, because telemetry no longer competes with
  the films for connections (see below).
- **Portrait fits with zero scroll at 820x1180, 810x1080, 800x1280 and 768x1024** — six tiles plus
  the community QR fully on screen at every one, verified by measuring each tile's box against the
  viewport rather than by eye. Landscape 1024x768 also fits, as a clean 3x2.
- **Telemetry no longer starves.** A browser allows ~6 connections per host; the TV holds an event
  stream plus a live connection per film, which is the whole budget, so telemetry POSTs sat unsent
  behind the videos — 15 films played, 15 events in the page, **0 on disk**. Telemetry now has its
  own port (one above the page's), which is its own connection pool: **15/15 on disk**.
- Each film layer carries **its own** signup QR, so the QR cannot lag the picture: it arrives with
  the film rather than being swapped into place after it.
- No horizontal or vertical overflow at 1920×1080, 1024×768 or 820×1180.
- No console errors on any screen.

## The StreamStage film's QR sits bottom-right — check it composited if you ever play it in a browser

The re-rendered StreamStage film carries its own QR baked into the picture, **bottom-right**, and it
decodes to the gated `https://streamstage.live/g?a=recital&src=booth_tv&p=recital&s=tv`
(verified with zbar on 8 frames sampled across the finished file, 2026-08-08).

On the **Fire Stick app** that is fine: `BoothLoopActivity` plays fullscreen video with nothing
composited over it, so the baked QR is the only thing in that corner.

**Through `tv.html` in a browser it is not.** That page pins its own gated QR in the same corner —
`tv.html:126`, `.filmqr{position:absolute;right:6rem;bottom:6rem;width:32rem}`. Two QR codes in one
corner is unreadable, and worse, a phone may lock onto whichever it finds first, which is not
necessarily the one the film is talking about.

So: **if this film is ever shown through the browser page rather than the stick app, look at the
real screen before believing it is fine.** This is the exact mistake that cost an earlier session —
captions were positioned by measuring raw film frames, while the film always played *under* the
kiosk page that pins something in that corner. Component-level checks do not catch it. A screenshot
of the composited screen does.
