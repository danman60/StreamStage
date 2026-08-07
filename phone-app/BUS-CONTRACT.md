# BUS CONTRACT — phone operator console ⇄ booth TV

**Owner of this file:** the phone app (`phone-app/`).
**Audience:** whoever is adding pause / stop / playlist-order handling to `expo-assets/kiosk/tv.html`
(and, if it turns out to be needed, `expo-assets/kiosk/serve.py`).

This is a **contract, not a patch**. The phone builds against exactly what is written here and does
not touch `expo-assets/`. If a shape below is wrong for the TV side, change it *here first* and tell
the phone agent — do not silently accept a different field name on the TV, because the phone will
keep sending this one.

---

## 0. The transport, which already exists and does not change

`serve.py` is a relay. `POST /bus` publishes a JSON object; every screen holding the `GET /bus` SSE
stream receives it (`serve.py:80` `publish()`, `serve.py:407`). The phone is simply another
publisher on that bus. **No new endpoint, no new port, no new protocol.**

| what | where |
|---|---|
| publish a message | `POST http://<host>:<pagePort>/bus` · `Content-Type: application/json` |
| read retained state | `GET http://<host>:<pagePort>/state` → `{"tv": {...}}` |
| enumerate films on disk | `GET http://<host>:<pagePort>/films` → `{"<basename>": <bytes>}` |
| health / discovery probe | `GET http://<host>:<pagePort>/health` |
| telemetry + command pull | `<pagePort>+1` — a **different** listener. Never mixed with the above. |

### RETENTION — do not change this

`serve.py:72` is `RETAINABLE = {"tv"}`. **Only `tv` messages are retained and replayed to a
late-joining screen.** A previous session proved that retaining a `play` makes a screen that joins
an hour later restart an hour-old film.

**None of the new message types below may ever be added to `RETAINABLE`.** They are commands. If the
TV needs a late-joiner to know that it is paused, that fact belongs in the `tv` **state** message
(see §3), not in a retained `pause` command.

### Connection budget — why the phone polls instead of streaming

A browser allows ~6 connections per host, and on the kiosk page port that budget is spent by the
TV's `EventSource` plus one live connection per film layer (`serve.py:553-558` — measured: 15 films
played, 0 telemetry events on disk, because the POSTs queued behind the videos).

So the phone **does not open an SSE stream**. It polls `GET /state` at 2 s, single-flight, with
`Connection: close`, and only while the console is actually on screen. Anything added to the TV side
should assume the phone is a light, intermittent client — never a subscriber.

---

## 1. Messages that ALREADY WORK (implemented in `tv.html:963-977`) — unchanged

The phone sends these today and they must keep working exactly as they do now.

```jsonc
// Play a product film. tv.html resolves `product` through productById() (kiosk.js CONFIG.products).
{ "type": "play", "product": "studiosage", "dir": "r" }

// Abandon whatever is playing, return to the attract loop.
{ "type": "stop" }

// Ask the TV to re-announce its state immediately (it also heartbeats every 1 s).
{ "type": "ping" }
```

`dir` is `"l"` or `"r"` and only picks which way the attract art slides out. It has no effect on
which film plays. The phone always sends `"r"`.

---

## 2. NEW messages — phone → TV. **These are what the TV side needs to implement.**

Every one of these is a **command**: not retained, safe to drop, idempotent where it can be. The
phone treats a `200` from `POST /bus` as "the relay accepted it", never as "the TV did it" — the
only proof the TV acted is the next `tv` state message.

> ### ⚠ `src` IS NOW LOAD-BEARING — changed by the kiosk side, 2026-08-07
>
> `"src":"phone"` was decorative in the first version of this file. It is now the field the server
> reads to decide whether a command came from the **operator** or from a **visitor surface**, and
> `POST /bus` can now answer **`403`** instead of `200`.
>
> - **`"src":"phone"` = operator.** (`"origin":"operator"` is accepted as an equivalent spelling.)
> - **Anything else, including a missing `src`, = visitor.** The visitor tablet stamps
>   `"src":"tablet"` on everything it sends.
> - Refused commands are **never relayed** — no screen sees them — and are written to the day's
>   telemetry as `cmd_refused`.
>
> **What this means for the phone: keep sending `"src":"phone"` on every command, and send it on
> `play`/`stop`/`ping` too.** Without it, `playfilm streamstage-services` and `playlist` are
> refused. A `403` body is `{"ok":false,"error":"refused","reason":"<plain english>"}` and is worth
> surfacing on screen, because it means the phone forgot to identify itself.
>
> Why: Daniel's requirement is that only the phone can put StreamStage's own sales film on the big
> screen. Hiding a tile is not enforcement, so the refusal is on the wire. This is a booth behind
> its own travel router, not an auth boundary — the point is that the visitor tablet **cannot** do
> it, not that the field is unforgeable.

### 2.1 `pause`

```jsonc
{ "type": "pause", "src": "phone", "_from": "phone-<deviceId>" }
```

Pause the currently playing film **in place**, holding the frame. Do not return to attract, do not
reset position. If nothing is playing, ignore it silently.

Expected TV behaviour: `video.pause()`, keep the layer visible, keep `current` set, and push a `tv`
state with `state:"playing"` and `paused:true` (see §3).

### 2.2 `resume`

```jsonc
{ "type": "resume", "src": "phone", "_from": "phone-<deviceId>" }
```

Resume from exactly where `pause` left it. If nothing is paused, ignore it silently.

> **Why `pause`/`resume` and not one `playpause` toggle:** the phone shows the TV's state on a
> 2-second poll, so a toggle races — two taps 300 ms apart against a stale view can land as
> pause-then-pause. Explicit verbs are idempotent and cannot invert the state by accident.

### 2.3 `playfilm` — play ANY film on disk, including the StreamStage film

```jsonc
{ "type": "playfilm", "film": "streamstage-services", "dir": "r",
  "src": "phone", "_from": "phone-<deviceId>" }
```

`film` is a **media basename without `.mp4`** — exactly a key from `GET /films`.

This exists because `play` resolved through `productById()`, which only searches
`CONFIG.products` (the six product tiles). **`streamstage-services` is not a product tile** — it is
StreamStage's own recital-filming / livestream film, an attract card on the TV.

**The diagnosis was correct and is now fixed** (kiosk side, 2026-08-07): `tv.html` resolves a play
against `PLAYABLE` — the six products *plus* the StreamStage film — so `playfilm` works, and
`{"type":"play","product":"streamstage-services"}` is no longer silently dropped either. `playfilm`
remains the documented path and the one the phone should use; `play` with that id resolves to the
same place and is subject to the same `src` check.

TV behaviour as built:

- Full-screen film layer like any other, with the same progress bar, quartile telemetry and end
  card. Its end card is the StreamStage card (name, tagline, `streamstage.live`, the **recital** QR
  — there is no `qr/tv/streamstage-services.svg` and it borrows `qr/tv/recital.svg`, same
  destination).
- Its layer is **cold**: `preload="none"`, fetched from the `pagePort+1` origin. A seventh *warm*
  video on the page origin is the measured nine-seconds-of-black failure that aborted all six
  product film loads. So this film takes a beat to start — it is not one of the warm layers, and it
  cannot be, for that reason.
- While it plays, the booth's own wordmark and community-QR card come **off** the screen. The film
  is a finished branded piece carrying both marks itself; the booth's copies landed directly on top
  of them. The gated recital QR stays, bottom-right. The attract card has always done this.

**PHONE-ONLY, ENFORCED.** Not by convention any more: the server refuses this film from any
non-`src:"phone"` command (403, never relayed), and `tv.html` refuses it again on the local
BroadcastChannel/localStorage transports, which never reach the server at all. There is still no
visitor tile and there must never be one.

### 2.4 `playlist` — set the attract-loop order

```jsonc
{ "type": "playlist",
  "order": ["studiosage", "compsync", "streamstage-services", "callboard"],
  "src": "phone", "_from": "phone-<deviceId>" }
```

`order` is an array of media basenames (same namespace as `/films` and `playfilm`), in the order the
operator dragged them into. Rules:

- **Complete or partial is both legal.** Ids present in `order` come first, in that order; anything
  the TV has that is not named keeps its existing relative order after them.
- **Unknown ids are ignored**, not an error — the phone may know about a film the TV has not
  rendered yet.
- **It does not start playback.** It only changes what the attract loop will show next. A cut to a
  film is always an explicit `play` / `playfilm`.
- Sent **on drop**, once per reorder gesture — not per pixel of drag.

Expected TV behaviour: reorder the attract card sequence. Applying it at the next card boundary
rather than yanking the current card is preferred; the phone does not depend on which.

**As built, all four rules hold.** Named cards move to the front in the order given; every other
card — including the two that are not films (the "tap the tablet" invite and the closing card) —
keeps its existing relative order behind them. Unknown ids are ignored. Playback is never started.

**Applied immediately on arrival, not at the next card boundary** — corrected 2026-08-07 after
end-to-end testing found a drag doing nothing for 30+ seconds. Deferring to the boundary was wrong
twice: re-ordering the deck never disturbs the card on screen anyway (the current card keeps its
place and its timer), and "the next boundary" is **not** ~11 s when the services card is up — that
card *is* a 181 s film, so the boundary can be three minutes away. `.tv.order` now reflects a drag
within one heartbeat (~1 s), which is what the phone should show him.

The loop carries on from whatever card is already on screen, so the cards you then see are a
**rotation** of `order`, not a replay from its first element.

**`playlist` is operator-only.** A `playlist` without `src:"phone"` is refused 403, not merely
sanitised — nothing on a visitor surface has any business setting the TV's order, and naming
`streamstage-services` in an order is the one way a visitor surface could get that film on screen
without ever sending a play.

---

## 3. The `tv` state message — TV → everyone. One new field requested.

This is the existing retained message (`tv.html:950-960`). The phone parses it out of
`GET /state` → `.tv`.

```jsonc
{ "type": "tv",
  "state":   "attract" | "playing" | "end",
  "product": "studiosage" | null,
  "pos":     12.4,          // seconds
  "dur":     47.0,          // seconds
  "muted":   true,
  "warm":    3,
  "at":      1765432100000, // Date.now(), the phone uses this to detect a dead screen

  // ---- NEW, shipped 2026-08-07 ----
  "paused":  false,         // true only while a film is held by §2.1.
  "order":   ["studiosage", "compsync", "..."]   // the attract order actually running
}
```

**`paused` shipped exactly as requested.** The phone treats a missing `paused` as `false`, so
nothing breaks in either direction. While a film is held, `state` stays `"playing"` and `pos` stops
moving — that pair is the held state.

**`order` shipped too** — §3 called it optional and welcome, and it costs nothing to send. It is the
film ids in the order the attract loop is currently running, non-film cards omitted. Use it to show
drift instead of trusting the phone's own list. It reflects a `playlist` only once the parked order
has been applied at the next card boundary, which is the honest thing to show.

Nothing else about `tv` changed. `state`, `product`, `pos`, `dur`, `muted`, `warm` and `at` are
byte-for-byte what they were, and `push()` still runs on the same 1 s interval — the heartbeat was
not made lazy.

**One thing worth knowing about `/state` freshness.** Measured on a fresh TV load: for roughly the
first 10–15 s, while the six warm film layers are pulling their files, the TV's own state POSTs
share the page origin's ~6-connection budget with them and `/state` can lag several seconds behind
what the screen is really doing. It self-heals the moment the films are warm, and it is
pre-existing — not introduced by any of this. **The `at` field is exactly the right way to detect
it, which the phone already does.** A command sent into that window still *arrives* (the SSE stream
is up within ~0.3 s); it is only the state echo that lags.

Two things the phone already relies on and that must not change:

- **`at` moves every second.** `tv.html:981` heartbeats `push()` on a 1 s interval. The phone
  detects "relay is up but no screen is attached" by `at` failing to move for 3 polls, and says so
  on screen. If the heartbeat is ever made lazy, that diagnostic silently inverts.
- **`product` is a film id**, matching `/films` keys, or `null`.

Optional and welcome, not depended on: `"order": [...]` echoing the attract order the TV is actually
using, so the console can show drift instead of assuming its own list is live.

---

## 4. What the phone will NOT send

- **No `mute`.** `tv.html` has mute as a local `M` keypress only. A button that lights up and does
  nothing is worse than no button on a show floor. If a `{"type":"mute","on":bool}` is ever added on
  the TV side, tell the phone agent and it becomes a two-line change here.
- **No `tv` message, ever.** The phone is not a screen. Publishing a `tv` type would overwrite the
  retained state that real screens depend on.
- **No lead, no gate traffic, nothing to `/lead`.** The phone is the operator. There is no email
  capture anywhere in the phone app and there must never be one.

---

---

## 5. What the kiosk side added that the phone did not ask for

Small, and none of it changes a field name the phone sends.

### 5.1 A pause dead-man switch

A film left **paused for 5 minutes** is abandoned and the TV returns to the attract loop
(`film_pause_expired` in telemetry). A booth TV frozen on one frame because Daniel got pulled into a
conversation is worse than losing his place, and the attract loop is the one thing on that screen
that has to survive everything. The phone will see `state` go `playing`→`attract` on its own; that
is the only case where it does so without a `stop`.

### 5.2 `dir` accepts `"l"` / `"r"` properly

`tv.html` compared `dir === -1`, so the phone's `"l"` fell through to "slide in from the right" —
`"r"` happened to be right by accident and `"l"` never worked. It now normalises `-1`, `"-1"`,
`"l"` and `"left"` to left, everything else to right. No change needed on the phone; `"l"` simply
does what it says now.

### 5.3 `GET /state` gained a `_server` sibling key

`.tv` is untouched. Alongside it:

```jsonc
{ "tv": { ... },
  "_server": {
    "films":             { "compsync": 56566776, "...": 0 },   // same as GET /films
    "operatorOnlyFilms": ["streamstage-services"],             // what §2's src check protects
    "refused":           0,                                    // commands refused since start
    "subscribers":       1                                     // screens on the SSE stream
  } }
```

Underscored so it can never collide with a retained message type. It saves the console a second
request when it draws the film list, and `operatorOnlyFilms` lets the phone label that row instead
of hardcoding the id. `refused` is a useful thing to show if a command mysteriously does nothing:
if it is climbing, something is publishing without `src:"phone"`.

### 5.4 An accepted alias, which the phone should ignore

`{"type":"cmd","cmd":"pause",...}` is accepted as an equivalent envelope for every command. The
phone does not send it, nothing depends on it, and the flat `{"type":"pause"}` form in §2 is the
contract.

---

## 6. Change log

| date | change | by |
|---|---|---|
| 2026-08-07 | First version. `pause`, `resume`, `playfilm`, `playlist` defined; `paused` requested on `tv`. | phone-app agent |
| 2026-08-07 | Implemented on `tv.html` + `serve.py`. **`src` is now load-bearing and `POST /bus` can return 403** (§2). `playfilm` shipped and the `play`-is-dropped bug fixed (§2.3). `playlist` shipped operator-only (§2.4). `paused` **and** `order` shipped on `tv` (§3). Added: 5-minute pause dead-man, `dir:"l"` fixed, `/state._server` (§5). | kiosk agent |
| 2026-08-07 | **Fix:** `playlist` was accepted but its order was parked until the next card boundary, which is up to 181 s away while the services card plays — on the floor that read as a dead control. Now applied on arrival; `.tv.order` moves within one heartbeat. §2.4 corrected. | kiosk agent |
