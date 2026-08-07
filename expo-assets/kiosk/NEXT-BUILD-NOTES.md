# Kiosk — next build notes

Captured 2026-08-07 07:23 ET from Daniel. **Not built. Nothing here has been started.**

There are two separate deliverables below. They are not the same thing and they solve different
moments at the booth.

---

## 1. A RENDERED kiosk video — for when the laptop is NOT hooked up to the TV

His words: *"a rendered version of the kiosk that has the six software products in video panes that
float around similar to the StreamStage recital kiosk video, with one video playing in the centre at
a time with audio and its QR code. Beautiful and animated."*

**Why it exists, in his words:** *"for when the laptop can't be connected to the kiosk and we don't
want the kiosk to be blank."* That is the whole requirement. It is a **fallback so the TV is never a
black screen** — not a second product, not a nicer version of the live kiosk.

This is a **video file**, not an app. It plays on the TV off a stick or the TV's own USB port with no
laptop, no tablet and no network.

What that purpose implies, and should govern every build decision:
- It has to be **findable and startable by someone who is not Daniel**, under pressure, at a booth,
  with the laptop already failed. A file on a stick that autoplays and loops beats anything clever.
- It must **loop forever** with no end card, no "replay?" prompt and no black frame between cycles.
- It has to read at a glance from across an aisle, because in this scenario nobody is standing there
  to explain it.
- **Quality bar is "better than blank", delivered early** — not "perfect, delivered late." A rough
  loop that exists beats a beautiful one that is still rendering on Aug 10.

Shape:
- Six product panes (StudioSage · CompSync · Callboard · CostumeCraft · Reflect · StudioBeat)
  floating/drifting around the frame.
- **One film in the centre at a time, playing with audio**, alongside **that product's QR code**.
- Cycles through all six. Beautiful and animated — this is a showpiece, not a slideshow.

Reference — the look he is pointing at:
- `C:\Users\danie\Desktop\StudioSage-Live-Demo\kiosk-tv\TV2-streamstage-kiosk.mp4` (290 MB) on
  FIRMAMENT — the StreamStage recital kiosk video.
- `C:\Users\danie\Desktop\StudioSage-Live-Demo\kiosk-tv\TV1-studiosage-kiosk-60s.mp4` (5.6 MB) is
  the smaller sibling.
- Other kiosk renders that may inform the motion: `D:\Shared\REMOTION RENDERS\kiosk\`,
  `/mnt/data/kiosk-zoom/kiosk-testimonial-v3.mp4`.

Source material is ready — all six films are final and carry VO:
`expo-assets/kiosk/media/{studiosage,compsync,callboard,costumecraft,reflect,studiobeat}.mp4`,
posters in `media/posters/`, QR SVGs in `qr/tv/` and `qr/tablet/`.

⚠ One thing to decide before building: at ~60–90 s per film, showing all six in full is 6–9 minutes.
A rendered loop that long is fine unattended but nobody watches it through. Whether this cuts each
film down or plays them whole is Daniel's call, not the builder's.

---

## 2. The LIVE tablet-selection kiosk — a tablet APK, and it must work with no internet

His words: *"the tablet selection mode live version of the kiosk... It'll be computer hooked up to TV,
tablet on the same Wi-Fi network and it needs to work that way. Ideally even without internet. I'm
expecting a tablet APK."*

The topology he wants is what the current kiosk already does: **laptop drives the TV, tablet on the
same Wi-Fi drives the laptop.** What is NEW is the packaging — he expects an **Android APK** on the
tablet rather than a browser pointed at a URL.

### What already works today (do not rebuild — see `README-BOOTH.md`)
- `serve.py` serves everything over the LAN and relays tablet → TV over SSE. No cloud involved.
- All six films, posters, QRs, fonts and CSS are **local files**. Nothing is fetched from a CDN.
- So the running kiosk is **already offline-capable** for its own operation.

### The only genuine internet dependencies
The **QR destinations** — `studiosage.ai`, `compsync.net`, `studiobeat.io`, the three Vercel apps,
and the Facebook group. Those open on a **visitor's phone over their own mobile data**, so they do
not need booth Wi-Fi. Nothing the booth hardware does requires internet.

### What an APK actually has to add
1. Wrap `tablet.html` so it launches like an app — no browser chrome, no address bar, no chance of a
   visitor tabbing out of it.
2. **Find the laptop without typing an IP.** This is the real work. Today someone types
   `http://<laptop-ip>:8080/tablet`. An APK should discover the server on the LAN (mDNS/Bonjour, a
   UDP broadcast from `serve.py`, or a QR the laptop shows once at setup).
3. Survive the tablet sleeping, the Wi-Fi dropping and the laptop restarting — reconnect on its own.
   The SSE relay already retains only `tv` state, so a late rejoin is safe.
4. Kiosk/lock-task mode so the tablet cannot leave the app.

**Decide first:** a WebView wrapper around the existing `tablet.html` keeps one codebase and is a
day of work; a native rewrite is weeks and throws away everything already verified (portrait layout,
zero-scroll at five viewport sizes, ~87–91 ms tap-to-frame, the telemetry). The WebView route is
almost certainly right, but it is his call.

**Ask before building:** which tablet, and what Android version? That decides mDNS behaviour, lock
task mode, and whether `WebView` autoplay-with-audio needs a flag.

---

## Status
Both items are **notes only**, recorded 2026-08-07. Nothing has been started.

One caveat on scheduling, since item 1 is a failure fallback rather than a feature: the current
browser-based kiosk covers Calgary Aug 11–12 **as long as the laptop connects to the TV.** Item 1 is
the insurance against that not happening, 3,000 km from home, with no spare machine. Whether that
insurance is worth buying before Aug 10 is Daniel's call — but it is the one item on this page whose
value is highest precisely when everything else has gone wrong.
