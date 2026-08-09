# The booth system — how the whole thing actually works

**One page. Read this before touching anything at a trade show.**
Last measured 2026-08-09. Every claim here was checked against the running thing,
not against another document.

This is not a repo of its own on purpose: the deck, the kiosk, the films, the lead
route and the website all live in `StreamStage/` (plus `StudioSage/` for talk 1 and
the SMS demo), and splitting them would mean two checkouts that drift. This file is
the map instead. When something here stops being true, fix it here **and** in the
code comment that says the same thing — that pairing is what stopped being true
twice in one day on 2026-08-09.

---

## 1. The five machines, and what each one is for

| Thing | What it is | Where it runs |
|---|---|---|
| **The deck** | Your slides, driven from your phone | `presenter-server.py` on DART, port **8090** |
| **The kiosk** | The booth's brain — serves the TV page, the tablet page, and the message relay between them | `expo-assets/kiosk/serve.py` on DART, port **8081** (telemetry on 8082) |
| **The TV** | What the public sees. Attract loop, films, QR codes | A **Fire TV Stick** app, or the kiosk's `/tv` page in a browser |
| **The tablet** | What a visitor touches to pick a film. Also where the email gate lives | The kiosk's `/tablet` page |
| **Your phone** | Two jobs: driving the deck on stage, and operator control of the booth TV | `phone-app`, talks to both servers |

**The Fire Stick is the booth TV.** It plays the films from its own storage with no
laptop and no internet. The kiosk only tells it what to play. If the kiosk dies, the
reel keeps going — that is the whole point of the app existing.

**Nothing in the critical path needs internet.** The films are local, the relay is
LAN-only, the deck is local. Internet is needed for exactly two things: sending a
captured lead onward, and the facelift build. Both survive being offline and catch
up later.

---

## 2. The addresses, and why you must not type them

DART moved from `192.168.0.13` to `192.168.0.11` on 2026-08-09 — onto the address
the ledger had recorded for the **Fire tablet**. Every doc, QR and command quoting
`.13` became wrong in one DHCP lease.

**So: `tools/booth-lan.sh` is the only thing that answers "what address is it".**
It reads the kiosk's own UDP beacon. `tests/e2e-booth.sh` asks it. Set `BOOTH_HOST`
to override. Do not hardcode an address anywhere, ever again.

Known fixed points: the Fire Stick is `192.168.0.199:5555` on adb; SPYBALLOON's
firewall drops inbound LAN, so **devices cannot reach a server on SPYBALLOON** —
serve the booth from DART.

---

## 3. Two attract loops, and how a visitor picks a film

The TV idles in one of two loops. The operator chooses, from the phone (`attract`
command) or by pressing **A** on the TV itself:

- **The card loop** (default) — six product cards cycling, each with its QR.
- **The menu reel** — `expo-assets/kiosk/menu-loop/`, a 30-second video of all six
  films playing as live thumbnails with the highlight moving through them, captioned
  "tap the tablet to watch the full explainer". Rebuild it with
  `node render-menu-loop.mjs`.

A visitor taps a tile on the tablet → the film plays on the TV. **When that film
ends, the end card shows (it carries the product's QR) and then the next film plays
on its own** — the Fire Stick always did this, and the browser TV now matches.

Visitors cannot: pause, mute, go fullscreen, change the attract loop, or start the
StreamStage services film. Those are operator-only and are refused **twice** — on
the wire by `serve.py`, and again in the page, because when the tablet and TV are
two windows on one laptop they talk over BroadcastChannel and never touch the server.

---

## 4. Every QR, and what it does

**Twelve capture nothing.** The six product codes on the TV and the six on the
tablet open that product's website with a tracking tag. Plus the Facebook group
code. Interest, not leads.

**Seven require an email.** The six codes on the tablet shown after a film ends, and
the recital-services code on the TV. They land on `streamstage.live/g`, which asks
for details before delivering.

**We never send the booth films.** They are what plays on the screen — not a
giveaway. Those six tablet codes used to promise "all six films" and now offer the
recital video checklist, which is the right thing to hand somebody who just watched
a film about recital video. The film's own baked-in QR points there too.

**Away from the booth:** the four printed handout codes, and talk 1's slide codes,
all point at the same gated page. The QR burned into the StreamStage film points at
the old form URL, which now **307-redirects** to the gated page — that is how it was
fixed without re-rendering a 3-minute film.

**Decode a QR before you trust its caption.** Every one of these has been decoded
with a tool independent of whatever generated it. Twice, a printed code pointed at a
port nothing could bind, or at the production phone number instead of the demo one.

---

## 5. The lead path, end to end

1. Someone types their email — on the tablet gate, on `/g` after a scan, or on the
   website form at the bottom of `/videoproduction`.
2. It goes to `POST /api/expo-leads` on streamstage.live.
3. That route does three things: writes the lead onward to the StudioSage `leads`
   table, emails **you** a notification, and emails **them** what they asked for.
4. If the venue wifi is down, the lead sits on the kiosk's disk and the kiosk retries
   every two minutes until it lands. It also survives a browser reload on the tablet.

**The giveaways are written material, and every one delivers itself:** the recital
video checklist, the interview questions, the videographer brief, the content day
planner (Part one and a half of the checklist), the 5 AI moves, and the recital
service page. **No request creates a job for you.** Until 2026-08-09 two of them did,
silently.

### The trap that has now bitten twice

`serve.py` **auto-sends the disk queue to the LIVE route** every two minutes unless
you start it with `--no-flush`. Its startup banner says so. Testing a kiosk without
that flag puts fabricated leads into the production database and through SES. This
has happened twice. `tests/scenarios.mjs` now reads the server's own reported flush
destination and refuses to run unless it is loopback or off.

---

## 6. What the follow-up looks like after the show

Measured from the Toronto sent mail — full analysis in
`docs/2026-08-09-toronto-followup-email-patterns.md`:

- **+1 day**: one personal email per studio. Subject names their problem or the
  thing they took. Body: where you met → their own words back → the value sentence
  → something free already built → one booking link.
- **+5 to +7 days**: a reply *on the same thread*, "Quick idea for you on ___".
- **+8 to +9 days**: only where there is a real new reason.
- 35% replied. A concrete date beat an open invitation every time; the freebie
  email replied best; the free website rebuild pulled nothing as a subject line.

The follow-ups were all hand-written. The only automatic email is the delivery in
step 3 above. CommandCentered already has the machinery to automate the rest
(`Campaign → CampaignStep → CampaignLead → CampaignSendEvent`) but **booth leads do
not reach CommandCentered today** — that bridge is unbuilt.

---

## 7. How to check it is all working

```bash
tests/preflight.sh                    # one command, 11 colour-coded rows
tests/e2e-booth.sh                    # full booth suite (finds DART itself now)
expo-assets/kiosk/tests/scenarios.mjs --base http://127.0.0.1:PORT   # 24 booth scenarios
```

Start a kiosk for testing with **`--no-flush`**. Always.

The phone can run the preflight and reset the demo data with two buttons; the token
lives in `demo-token.txt` beside `presenter-server.py` on DART and is gitignored.

---

## 8. The rules this system was built out of

These are not style preferences. Each one is a thing that went wrong.

1. **Believe the artefact, not the description.** The output file's size and time,
   the device's versionCode, the row in the table, the URL that returns 206 — over
   any process check, any comment, any memory. A comment saying the films were not
   published survived weeks while the Fire Stick was streaming them.
2. **Never point a test at production.** Explicit endpoint, no usable default, and
   print the destination at startup.
3. **Never invent a data field.** If a route wants a name nobody asked for, stop.
   An invented name arrives looking like something the visitor typed.
4. **Verify at the surface the customer sees, composited.** Captions were once
   placed by measuring raw film frames; on the real TV the QR sat on top of them.
5. **Decode the QR, do not read its caption.**
6. **Prefer removing machinery to adding it.** The stick holds its own films and
   uploads its own leads; DART is not in that path.
