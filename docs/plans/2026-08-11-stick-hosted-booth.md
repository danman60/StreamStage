# The booth tablet talks to the TV

**Written 2026-08-11.** Built and compiled the same day; **not installed on any device and not
tested on hardware** — the Fire Stick was held by another debugging session. Everything below
marked ⚠ UNVERIFIED has not been run on real hardware.

> This exists so that **"The tablets shouldn't have to connect to dart at all. The booth tablet
> connects directly to the TV."** — Daniel, 2026-08-11, after DART dropped off the network twice
> during a live show and the tablet went dead with it. The TV survived only because the stick
> plays films from its own storage.

---

## PART 1 — What the tablet actually needs from DART, item by item

### The dependency, in one sentence

The Fire tablet has **no booth UI of its own**. `tablet-app/` is a WebView shell
(`tablet-app/.../MainActivity.kt:30-56` says so outright: *"deliberately adds no UI of its own"*),
and every pixel it shows is downloaded from `serve.py` at run time. It finds a server by probing
`/health` (`tablet-app/.../Discovery.kt:190-259`), accepts only an answer with `ok:true` + `ip` +
`port` + (`subscribers` or `telemetryDir`) (`Discovery.kt:230-241`), then loads `/tablet` from it
(`MainActivity.kt:498-514`). It refuses every URL that is not that host on that port or that port
+ 1 (`MainActivity.kt:332-340`). So "DART left" and "the tablet has no interface" are the same
event.

### Every thing the tablet fetches, and whether the stick can serve it

| What | Where the tablet asks | Port | Can the stick serve it? | What it took |
|---|---|---|---|---|
| **`/health`** | `Discovery.kt:209` (discovery, and a watchdog every 15 s at `MainActivity.kt:533-557`) | page | **Yes** | Answer the same JSON. Must carry `ok`/`ip`/`port`/`subscribers`, or `Discovery` rejects it as NOT_KIOSK. |
| **`/tablet` → `tablet.html`** (69 KB) | `MainActivity.kt:506`, path from `HostStore.DEFAULT_PATH` | page | **Yes** | Bundle it in the APK. |
| **`kiosk.js`** (45 KB), **`brand.css`** (11 KB) | `tablet.html:11,619` | page | **Yes** | Bundled. |
| **Brand marks** — `brand/logo-white.png`, `logo-icon-white.png`, `brand/icons/{studiosage,compsync,studiobeat}.png` | `tablet.html:10,422,456,507,822-826` | page | **Yes** | Bundled (5 files). |
| **QR SVGs** — `qr/facebook.svg`, `qr/tablet/<id>.svg`, `qr/tablet/leads-<id>.svg` | `tablet.html:441,1078` | page | **Yes** | Bundled (13 files). |
| **`/films`** | `tablet.html:924` — decides which tiles are real | page | **Yes, and better** | The stick answers from `Playlist.resolve` — the screen that will actually open the file, reporting on the file it will actually open. |
| **`/bus` GET (SSE) + POST** | `kiosk.js:259-296` — the whole tap→TV path | page | **Yes** | An SSE relay in the app; see Part 2. |
| **`/state`** | read by the phone console, and by anything drawing a TV badge | page | **Yes** | Served from the same retained `tv` object. |
| **`/log` POST** | `kiosk.js:384` (browser telemetry) **and** `tablet-app/RemoteControl.kt:125,143` (the app's own diagnostics) | **page + 1** | **Yes** | Same jsonl discipline; log lines split off from events. |
| **`/lead` POST** | `tablet.html:655,678` | **page + 1** | **Yes** — this is the hard one | See Part 3. |
| **`/events` GET** | `kiosk.js:934` (the operator tally) **and** `RemoteControl.kt:174` (the emergency `sethost`/`rediscover`/`reload` command channel) | **page + 1** | **Yes** | Needs `?since=`, `?day=`, `?cap=off` and the 320 KB ceiling, or the command channel dies exactly as it did on 2026-08-08. |
| **`/applog` GET** | Daniel, by hand | page + 1 | **Yes** | Same shape. |
| **The films (`media/*.mp4`, 621 MB)** | — | — | **Not needed at all** | **Measured, not assumed:** `tablet.html` contains **zero** `<video>` elements and **zero** `media/` references. Verified by extracting `tablet.html` back out of the built APK and grepping it (see "Verification" below). `altMedia()` (`kiosk.js:177`) is used only by `tv.html:722,827,869,890`. The tablet surface has never needed a frame of film. |
| **`/tv` → `tv.html`** | — | — | **Deliberately not served** | On this device the TV *is* this process. `GET /tv` answers 404 with a sentence saying so. |
| **`/expo-leads.html?staff=1`** (`kiosk.js:134`, opened at `tablet.html:1453`) | page | **Pre-existing 404 on DART too** | The file is at `public/expo-leads.html`, not in `expo-assets/kiosk/`. `serve.py` cannot serve it either. Not a regression, but it is broken today and worth knowing. |

**Two ports, not one, and it is not a preference.** `kiosk.js:152-164` computes the telemetry
origin as `location.port + 1` with no way to override it, and `MainActivity.allowed()` permits
exactly `h.port` and `h.port + 1`. Any server the tablet talks to must own an adjacent pair.

---

## PART 1b — Was a stick-hosted tablet surface ever planned? **Yes. Daniel is remembering a real plan.**

`docs/plans/2026-08-07-tradeshow-toolkit.md`, **Phase 2**, lines 54-56, verbatim:

> ### Phase 2 — the live selector
> Same app on the tablet in CONTROLLER role. **Tablet picks a film; the stick plays it** with audio
> and that product's QR. **Tablet and stick find each other on the LAN** with **no typed IP
> addresses**.

Its acceptance test #2 (line 149) is a phone hotspot, a tablet and a stick — **and no laptop
anywhere in it**. Line 148 of `expo-assets/kiosk/NEXT-BUILD-NOTES.md` states the principle:
*"make the Fire TV app able to run the loop by itself with no controller at all. Then the fallback
needs no network whatsoever, and **the tablet becomes an upgrade rather than a dependency**."*

**What actually got built** was Phase 1 (`kiosk-app/`, the stick plays the loop alone) and then
Phase 2 **inverted**: `e6dfa99 fix(kiosk-app): the stick could never reach a booth kiosk, so the
tablet could never drive it` made the stick a **client** of DART's relay (`BoothBus.kt`), rather
than the tablet a client of the stick. That inversion is the entire cause of today's failure: it
put the laptop back on the critical path that the plan had explicitly removed.

So: the plan is real, it was never marked done, and nothing was ever started on the
stick-as-server side — an exhaustive grep for `ServerSocket|NanoHTTPD|HttpServer|createServer|bind(`
across `kiosk-app/` returns exactly one hit, `BoothBus.kt:264`, and that is a UDP socket for
*receiving* the beacon. Both plan documents are labelled "PLAN ONLY. Nothing built." and
"Not for Calgary."

---

## PART 2 — The design

### New files in `kiosk-app/`

| File | What it is |
|---|---|
| `BoothServer.kt` | The HTTP server. Page port + telemetry port, the tablet surface out of the APK, `/bus` SSE relay, `/health`, `/films`, `/state`, `/events`, `/applog`, `/leads`. |
| `BoothStore.kt` | The booth's record on the stick: `events-`, `applog-`, `leads-` jsonl, flushed and `fsync`'d on arrival. |
| `LeadSender.kt` | The stick sends its own leads to the live route. A port of `flush-leads.py`. |

Changed: `BoothBus.kt` (three functions made public so the two relays cannot diverge),
`BoothLoopActivity.kt` (start/stop, one state snapshot to both relays, commands into the same
`obey()`), `app/build.gradle.kts` (versionCode 5, the asset-staging task).

### Port: **8180 page, 8181 telemetry** — and this is the DART-compatibility mechanism

`Discovery.scan` is two-stage (`Discovery.kt:358-442`):

* **Stage 1** probes every address on `SEED_PORTS = [8080, 8081]` only (`Discovery.kt:73`). DART
  is there. **When DART is up, stage 1 finds DART and stage 2 never runs.** Today's booth behaves
  exactly as it did yesterday — no tablet-app change, no new preference logic, nothing to get
  wrong.
* **Stage 2** runs only `if (found == null)` and walks 8080-8119 plus `EXTRA_PORTS`
  (`Discovery.kt:60`) — **`8180` is the first of them.** That is the DART-is-gone case, and it is
  where the stick is found.
* 8180 is **outside** `serve.py:pick_ports`' window (8080-8118, stepping by two), so a DART that
  fell forward to a higher port can never land on top of the stick either.

**The honest caveat, not glossed:** `locate()` seeds stage 1 with the tablet's *saved* port too
(`Discovery.kt:366`). A tablet that previously used the stick, whose saved address has since gone
stale, sweeps with seeds `[8180, 8080, 8081]` and takes the first responder — arbitrary between a
live DART and the stick. **That is not a broken state.** Both drive the same screen, and the
tablet posts to exactly one host, so a lead can only land in one queue. The operational
consequence is one line in the runbook: at end of show, check both queues.

### The bus, with the stick as server

`BoothBus` is unchanged in behaviour: it still finds DART, subscribes to `GET /bus`, and publishes
this screen's state back on a 1 s heartbeat. `BoothServer` adds a **second, local** relay.

* `POST /bus` → refusal check → fan out to local SSE subscribers → convert to a
  `BoothBus.Command` → `main.post { obey(it) }`. **The same `obey()` the DART path uses**, so a
  command cannot mean two different things depending on which server the tablet found.
* `GET /bus` → SSE. On connect it replays the retained `tv` object, then `: connected`, then a
  `: ping` comment every 15 s. **Only state is retained, never a command** — replaying a `play`
  makes a screen that joins an hour late start an hour-old film (`serve.py:96-100`, measured).
* The retained `tv` object is built by `BoothBus.tvMessage(state)` and the activity's one-second
  ticker hands **one snapshot to both relays**. Two constructions would be two answers to "what is
  on the booth TV".

**The two buses are deliberately not bridged.** Forwarding commands between them would put a relay
hop back in the middle of the thing that just failed, and it is not needed: the phone on DART
still sees this screen's state because `BoothBus` publishes it there, and this screen obeys both.
They drive the same TV without going through each other.

**Refusals moved with the relay.** When the tablet talks to the stick there is no `serve.py` in
front of the bus, so `BoothBus.relayRefusal()` is `serve.py:refuse_reason` ported exactly:
`streamstage-services` is operator-only, `playlist`/`mute`/`fullscreen`/`hud`/`pause`/`resume`/
`attract` are operator controls, `stop` stays open (a visitor ending their own film). A refusal is
403, is never published, and is written to the day's record as `cmd_refused`. The screen-level
check (`BoothBus.screenCommand` → `allowed()`) is still the second layer, exactly as today.

### The tablet surface, bundled

A Gradle `Copy` task (`stageTabletSurface`) copies **an explicit file list** — not a directory —
from `expo-assets/kiosk/` into `assets/tablet/` at build time. 21 files, ~230 KB. The explicit
list is the guarantee that the 621 MB of films never wanders into the APK. Sourced from the repo
rather than duplicated into `app/src/main/assets`, for the same reason `stageMenuLoop` is:
`expo-assets/kiosk/` stays the one place these files are edited. A missing file is a loud Gradle
warning and a fact on `/health.tabletSurface`, never a blank tile discovered at the booth.

### No beacon from the stick, on purpose

1. `tablet-app/Discovery.kt` has **no UDP listener at all** — it finds servers by probing. A
   beacon nobody listens for is dead machinery.
2. `BoothBus.listenForBeacon` binds UDP 45454 on **this** device with `reuseAddress`, so a beacon
   sent from here would be heard by here and the stick would try to subscribe to its own bus.

If the tablet app ever grows a listener, `BEACON.md` is the contract and `BoothServer` is where the
sender goes — with a field saying it is the stick, so a client can prefer DART when both shout.

---

## PART 3 — Lead capture, which must never lose one

### Today
tablet → `POST /lead` on DART → `serve.py:record_lead` fsyncs to `telemetry/leads-*.jsonl` → a
flush thread retries every 120 s and POSTs to `https://streamstage.live/api/expo-leads`. **DART
gone = no capture at all**, because the page itself is gone.

### Now, on the stick — no relay hop
Daniel's own correction on this exact shape: *"why does dart need to — why can't it just store it
in the apk on the tv and upload when it has internet. you are overengineering."*

1. tablet → `POST /lead` on **8181** → `BoothStore.recordLead` appends one line to
   `filesDir/booth/leads-YYYY-MM-DD.jsonl`, `flush()` + `FileDescriptor.sync()`, **then** 200.
2. A **best-effort mirror** goes to `/sdcard/Movies/StreamStageBooth/record/` so the day can be
   `adb pull`ed without `run-as` and survives an uninstall. A mirror failure is logged and
   ignored — it must never turn a lead that IS on disk into an error the tablet re-queues. It is a
   *subdirectory*, so `Playlist.videosIn`'s `f.isFile` filter can never mistake it for an eighth
   film.
3. **A failed write answers 507, not 200** (`serve.py:1268-1272`). `tablet.html:686` only clears
   its localStorage queue on `r.ok`, so a 507 keeps the lead queued in the browser. A 200 over a
   failed write puts the lead in neither place — that inversion has already cost this project a
   day of telemetry.
4. `LeadSender` retries every 120 s (first pass at +20 s): read queue → read marker → one TCP
   connect to `streamstage.live:443` to see if there is internet → POST each unsent lead.

### Not sending twice — the four rules, all ported from `flush-leads.py`
* **The id is the tablet's own `lid`**, and when absent, `email|ts` — byte-identical to
  `flush-leads.py:69`. DART and the stick therefore agree on what "the same lead" is.
* **`leads-flushed.json` is re-read immediately before every single send**, so a manual
  `flush-leads.py` run and this thread cannot both mail the same studio.
* **The marker is written after each success.** A crash mid-drain costs a rewrite, never a
  duplicate.
* **A 200 is not enough.** The route answers 200 when *either* the Supabase forward *or* the
  notification email succeeded, and the forward has a hard 4 s timeout. The body decides:
  `forwarded:true` → done; `forwarded:false` → keep and retry; **absent → treated as sent and said
  so on the log line**, because the alternative re-POSTs every lead for ever against a route that
  may never grow the field.

### Getting the stick's leads into DART's records, without any chance of a double send

    curl http://<stick>:8181/leads

Returns `{count, unsent, endpoint, leads:[…], flushed:{lid:iso}}`. **Merge `flushed` into
`telemetry/leads-flushed.json` on DART before running `flush-leads.py` there** and a lead this
stick already sent can never go again. Nothing pushes — a pull cannot double-send.

### Where it posts, announced rather than discovered
`LIVE_ENDPOINT` is the default, because the requirement is that a captured lead is never lost and
an APK has no command line. So it is **announced loudly in logcat at every launch** and reported
at `/health.leadFlush.endpoint` — the destination is never something you have to read the source
to find out. (2026-08-07: a harness left on a production default put two fabricated leads in
Daniel's live inbox.) To point a bench stick elsewhere, one line into `.lead-endpoint` next to the
films — same pattern as `.kiosk-host`; the literal word `off` disables sending and the leads stay
on disk and exportable.

---

## PART 4 — Backwards compatibility

| Concern | Answer |
|---|---|
| DART present — does anything change? | **No.** `Discovery` stage 1 probes 8080/8081 only and finds DART; stage 2 never runs. `BoothBus` still subscribes to DART and still heartbeats to it. |
| Two servers answering `/health` | They are in different discovery stages, so the normal case is deterministic. The stale-saved-port case is arbitrary but not broken — see the caveat in Part 2. `/health` carries `"server":"firestick"` so nobody has to infer. |
| Leads sent twice | Impossible by construction: the tablet posts to **one** host, so a lead exists in one queue. Cross-device safety is the shared `lid` + the exportable marker. |
| Two `tv` heartbeats confusing the phone | No — there is one screen and one `tvMessage()`. The stick publishes the same object to DART (as before) and retains it locally. |
| Commands looping between relays | The buses are not bridged, and `handle()`/`screenCommand()` already ignore `type == "tv"`, so a screen never acts on its own echo. |
| Playback | Untouched. Nothing in the new code is on the playback path; every thread is a wrapped daemon at `MIN_PRIORITY`; a port that will not bind ends the attempt and logs it. With no tablet and no network the reel plays exactly as before. |
| Permissions | **None added.** `INTERNET`, `ACCESS_WIFI_STATE` etc. were already in the manifest; a `ServerSocket` needs nothing extra. |
| `/health` cost | `Playlist.resolve` spot-hashes films it installed from a manifest — megabytes of flash reads. `/health` is polled every 15 s, so the film scan is cached for 15 s. Answering from a few seconds ago is honest; competing with the decoder for flash is not. |

---

## PART 5 — Build

    cd kiosk-app && ./gradlew assembleDebug

**BUILD SUCCESSFUL.** Read off the artefact, not inferred:

* `app/build/outputs/apk/debug/app-debug.apk`, 12,247,563 bytes
* `aapt2 dump badging` → `versionCode='5' versionName='1.3.0'` (was 4 / 1.2.0)
* 21 files under `assets/tablet/` in the APK
* `BoothServer`, `LeadSender`, `BoothStore`, `relayRefusal`, `tvMessage` all present in
  `classes3.dex`

### Verification actually performed
* Every static asset reference in the **bundled** `tablet.html` / `kiosk.js` / `brand.css` was
  extracted back out of the built APK and checked against the bundled file list: all present. The
  only two "misses" are the runtime concatenation prefixes `qr/tablet/` and `qr/tablet/leads-`,
  and all 12 files both can produce are bundled.
* `<video>` count in the bundled `tablet.html`: **0**. `media/` references: **0**. This is what
  makes "the stick does not have to serve films to the tablet" a measurement rather than a hope.

### ⚠ NOT verified — needs the Fire Stick
Nothing has been installed or run. Unverified: that the WebView loads the page off the stick; that
the SSE stream stays up under Fire OS's doze behaviour; that a tap on the tablet cuts the film;
that `POST /lead` round-trips; that `LeadSender` reaches the live route from the stick's network;
that `Discovery` finds 8180 in stage 2 on a real LAN; and that binding a `ServerSocket` on Fire OS
8 is not restricted in some way this build has not met.

**First hardware test, in order** (and do #4 before any real visitor types anything):
1. Stick on wifi, DART **off**. `curl http://<stick>:8180/health` → `ok:true, server:firestick`.
2. Tablet app, `clearhost` → it should find `<stick>:8180` in sweep stage 2 and load the tiles.
3. Tap a tile → the film cuts on the TV. Tap "back to all six" → the reel resumes.
4. Type a **bench** email with `.lead-endpoint` pointed at a sink. Confirm `/leads` shows it and
   the marker records the send. Only then remove the override.
5. Bring DART up, restart the tablet app after `clearhost` → it should find DART on 8080/8081 and
   behave exactly as it did before this change.
