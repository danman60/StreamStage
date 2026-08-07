# StreamStage Booth Tablet

The tablet is the only thing a visitor touches at the booth. Today it runs the kiosk page in a
browser at `http://<laptop-ip>:8080/tablet`, and that **works**. This APK is a packaging upgrade
of exactly that, not a rewrite: the same page, the same server, the same lead queue — wrapped so
that

1. **nobody types an IP.** It sweeps its own /24 for a host answering serve.py's `/health` and
   remembers the one that answered, so a re-open is instant.
2. **it survives sleep/wake.** A health watchdog re-probes the laptop, and if the laptop moved
   (new DHCP lease, different port) it finds it again and reloads — instead of showing a
   browser error page to whoever picks the tablet up next.
3. **a curious visitor cannot wander off.** Every navigation *and* every subresource that is not
   the discovered kiosk origin is refused.
4. **it can be diagnosed and driven without touching it.** The target is a Fire tablet with no
   adb, so failures are loud on screen, the log ships to the kiosk server, and commands are
   pulled back from it. See *Operating it blind* below.

**There is no screen pinning.** It was removed on instruction. `startLockTask()` is not called
anywhere, there is no `android:lockTaskMode`, and there is no Unpin control — do not add them
back. Immersive mode plus the origin allowlist are the whole of what keeps a visitor on the page.

It has no UI of its own beyond the "looking for the laptop" screen and an operator panel. Nothing
about the booth's look, copy or behaviour lives here — that is all `expo-assets/kiosk/tablet.html`.

---

## What it talks to

Only the booth laptop, over the LAN:

| what | where |
|---|---|
| the page | `http://<laptop>:<port>/tablet` (serve.py aliases `/tablet` → `tablet.html`) |
| discovery | `GET http://<candidate>:<port>/health` → `{"ok":true,"ip":…,"port":…,"subscribers":…}` |
| live relay | `EventSource http://<laptop>:<port>/bus` (SSE, held open) |
| telemetry + leads | `http://<laptop>:<port+1>/log` and `/lead` — serve.py's second listener |

There is **no internet dependency and no remote call of any kind**: no analytics, no crash
reporter, no Supabase. DanTV's remote channel drives its TV through Supabase over the internet;
the booth has no internet, so the kiosk's own LAN SSE relay is the only channel used here.

## Build

Toolchain is pinned to the same set `../kiosk-app` builds with (Gradle 8.11.1 / AGP 8.7.3 /
Kotlin 2.1.0, JDK 21 launcher, jvmTarget 17).

```bash
cd ~/projects/StreamStage/tablet-app
./gradlew :app:assembleDebug
# -> app/build/outputs/apk/debug/app-debug.apk   (~2.0 MiB)
```

`local.properties` points at `~/Android/Sdk`. A release build is `assembleRelease`, but the debug
APK is the one to take to Calgary unless someone sets up a signing config — it is not minified
either way.

## Install

```bash
adb install -r -t app/build/outputs/apk/debug/app-debug.apk
```

Sideloading from a file manager works too; the tablet needs "install unknown apps" for whatever
app you copy it with.

## First run (pairing)

1. Start the kiosk on the laptop: `cd expo-assets/kiosk && python3 serve.py --port 8180`
   (any port; `--port 8080` is the default. Whatever you pick, `port+1` must also be free —
   that is the telemetry listener.)
2. Put the tablet on the **same Wi-Fi** as the laptop. A phone hotspot is fine; there does not
   need to be internet on it.
3. Open **StreamStage Booth Tablet**. It says "Looking for the booth laptop…" and sweeps in two
   stages (see *The port walk* below). Measured on the real LAN: **222 ms** from launch to
   finding the kiosk. A sweep that finds nothing takes ~9.5 s.

That host is saved. Every later open goes straight to it (measured: 683 ms from launch to the
page on an emulator) and only falls back to a sweep if it stops answering.

**If discovery cannot find it** (unusual subnet, client isolation on the venue AP) the failure
panel appears with the numbers and a manual field. Type `192.168.0.13:8081` — host alone assumes
8080. It is checked first; if nothing answers, tapping Connect a second time opens it anyway.

## The port walk — read this before changing it

`serve.py:203 pick_ports(want=8080, tries=20)` takes the first port at or above 8080 where BOTH
it and `it+1` are free, stepping by two. An operator can also pass `--port` and land anywhere.
**The booth laptop has two stale presenter-server processes holding 8080, so its kiosk is on
8081** (telemetry 8082) — an odd port the step-by-two walk cannot produce, so it was started by
hand.

The first version of this app probed exactly `[8080, 8180, 8090, 8000, 8888]`. **8081 was not on
that list, and that is the whole reason the tablet "could not connect anywhere"** — the server was
answering perfectly and was never asked. Do not go back to a list of lucky numbers.

The sweep is now two stages, which is what makes a wide port range affordable:

1. every address in the /24 gets `8080` and `8081` only. A dead address costs two connect
   timeouts, not one *per port* — the old shape got quadratically slower with every port added,
   which is exactly why the list stayed too short to contain the right answer.
2. only addresses that **proved they are alive** (a TCP *refusal* is proof: the host answered, it
   just had nothing on that port) get the full walk of `8080-8119` plus `8180, 8090, 8000, 8888,
   9000, 8008`. A refusal returns in microseconds, so walking 46 ports on the three or four real
   hosts is free.

Measured on the real booth LAN: full 254-address stage 1 = **9.1 s**; stage 2 over 4 live hosts =
**0.34 s**.

## Operating it

- **Operator panel**: tap the **top-left corner of the screen 7 times within 6 seconds**. Shows
  the connected origin, this tablet's own IPs, every address the last sweep tried and what
  happened to each; lets you retype the host, re-sweep, reload, copy the diagnostics, or go back
  to the kiosk. The taps pass through to the page, so no part of the kiosk UI is dead under that
  corner.
- **Back** never exits: inside the kiosk it walks the page's own history, at the root it does
  nothing.
- **Rotation**: portrait and landscape both, and rotating does not reload the page or drop the
  SSE connection.

## Operating it blind — no adb, no cable

The booth tablet is a Fire tablet and **cannot do adb**. Everything below works with nothing but
the screen, or nothing but `curl` against the kiosk.

**1. The screen.** When it cannot connect it does not sit blank. It shows, in large type: this
tablet's own IPs, the subnet and ports it searched, how many addresses answered and what each one
said, a manual host field, *Search again*, *Show every address it tried*, and *Copy diagnostics*
(the whole report onto the clipboard, to paste into any messaging app). A subnet mismatch is
obvious because the tablet's address and the laptop's sit one above the other.

**2. Read its log from anywhere.** The app ships its log to the kiosk's telemetry listener as
ordinary telemetry (`POST /log`, which serve.py already accepts as arbitrary JSON):

```bash
curl -s http://192.168.0.13:8081/events | grep -o '"type": "tablet_[a-z]*"[^}]*'
```

Look for `tablet_log` (every line), `tablet_status` (host, state, last error, every ~30 s) and
`tablet_diag` (a full report, on demand).

**3. Drive it from a laptop.** A command is just an event somebody POSTed. The app polls
`GET /events` every 8 s and runs any `tablet_cmd` id it has not seen:

```bash
curl -X POST http://192.168.0.13:8082/log \
  -d '{"type":"tablet_cmd","id":"c1","cmd":"sethost","arg":"192.168.0.13:8081"}'
```

Verbs: `status`, `sethost <host:port>`, `rediscover`, `reload`, `clearhost`, `diag`. Add
`"target":"<device id>"` to address one tablet; the default is every tablet. A restart does **not**
replay commands from earlier in the day — the first poll marks what is already there as seen.

**Nothing in serve.py was changed to make any of this work.** `/log` and `/events` already existed
and already did what was needed.

Every request the app makes goes to the **telemetry port** (page port + 1), never the page port,
so the WebView's ~6-connections-per-host budget on the page port stays entirely with the SSE
stream and the films.

**4. If it does have adb** (bench, Pixel, emulator) there is a debug-only broadcast bridge with
the same verbs, and one grep-able log tag:

```bash
adb shell am broadcast -a com.streamstage.boothtablet.DEBUG --es cmd status
adb shell am broadcast -a com.streamstage.boothtablet.DEBUG --es cmd sethost --es arg 192.168.0.13:8081
adb logcat -d -s SSBOOTH
```

It is registered at run time only when `BuildConfig.DEBUG`, so a release APK has no exported
receiver.

## Design notes worth knowing before you edit it

- **The probed address wins over the reported one.** `/health` reports the laptop's own LAN IP,
  which is not always the address the tablet reached it on. The app keeps the address that
  worked and shows the reported one only as a hint. Loading the reported IP would break every
  NAT'd route (it is exactly what an emulator does: reachable on `10.0.2.2`, reports
  `192.168.0.134`).
- **Both ports are allowed, nothing else is.** `MainActivity.allowed()` permits the kiosk port
  and `port+1`. That is not cosmetic: the lead POST goes to `port+1`, and a lead that cannot
  POST is a lead sitting in localStorage.
- **`domStorageEnabled` and `mediaPlaybackRequiresUserGesture=false` are load-bearing.** The page
  queues leads and telemetry in localStorage before it touches the network, and the films play
  without anyone tapping play.
- **`configChanges` covers orientation on purpose.** An Activity recreate tears down the WebView,
  which kills the EventSource and any in-flight lead POST.
- **`KioskWebView` blocks the full-screen keyboard.** In landscape, Android's IME otherwise goes
  into extract mode and replaces the whole page with a white editor — observed on the film gate's
  *Studio name* field, i.e. on the one surface that captures a lead.
- **No `category.HOME`.** The Fire Stick app takes over HOME because it is a dedicated appliance;
  a tablet that hijacks HOME is a tablet nobody can reset on the floor.
- **A failed page still fires `onPageFinished`.** WebView calls it for a main-frame URL *after*
  `onReceivedError` has already failed it. Without `failedUrl` guarding it, the app marks a
  `ERR_CONNECTION_REFUSED` error page as "loaded", stops watchdogging it and can hide the overlay
  over a dead page. Observed live on a hand-typed host.
- **The failure panel must not use a fixed-width column.** It used `dp(560)`, which is wider than
  a narrow tablet in portrait, and because the ScrollView only scrolls vertically the diagnostics
  were silently clipped off *both* edges. The one screen that has to be readable when nothing
  else works cannot be the one that overflows.

## Reused, not invented

- `~/projects/PhonePresenter` — the WebView-shell-with-host-in-SharedPreferences shape.
- `../kiosk-app` — gradle files, wrapper, pinned plugin versions, launcher icons, theme, the
  "platform theme only, no appcompat" choice.
- `expo-assets/kiosk/serve.py` — `/health`, `/tablet`, `/bus`, `/log`, `/lead` and the `port+1`
  split are all read from that file, not guessed.

---

## Verified — and on what

Everything below was run against the **real, live** booth kiosk (`expo-assets/kiosk/serve.py`) at
**http://192.168.0.13:8081** (telemetry 8082) on the **real LAN**, from a **Pixel 9 Pro**
(Android 17) at 192.168.0.192 — a genuine Wi-Fi peer, not a loopback alias.

| # | Claim | Evidence |
|---|---|---|
| 1 | APK builds | `BUILD SUCCESSFUL`, `app-debug.apk`, 2,189,276 bytes, md5 `f2fdc004dd10155fc6c39604e6bb3261` |
| 2 | **Discovery finds the kiosk on 8081 with nothing typed** | wiped install: `probe http://192.168.0.13:8080/health -> answered, but not 200 (HTTP 404)` then `probe http://192.168.0.13:8081/health -> kiosk found`, `DISCOVERY FOUND 192.168.0.13:8081`. **222 ms** launch→found |
| 3 | The 404 on 8080 is the stale presenter server | it is in the log verbatim, and it is exactly what the old port list tripped over |
| 4 | The page loads and its SSE connects | `page load FINISHED http://192.168.0.13:8081/tablet`; `/health` `subscribers` > 0 while open |
| 5 | A tile tap reaches the server | tapped CompSync → `/health` `events` 127 → 128, and `/events` gained `{"surface":"tablet","type":"gate_shown","product":"compsync"}` |
| 6 | Saved host is reused on relaunch | relaunch reused `192.168.0.13:8081` with no sweep |
| 7 | **Log ships to the kiosk** | `curl http://192.168.0.13:8081/events` returned this device's `tablet_log` and `tablet_status` events — the app's log read back with no device access at all |
| 8 | **Commands pull from the kiosk** | `status`, `reload`, `rediscover` POSTed with curl, each picked up within 8 s: `COMMAND received id=c-reload cmd=reload` → `page load FINISHED` |
| 9 | A full report can be fetched remotely | `status` shipped a `tablet_diag` event containing host, saved host, local IPs, last error and all 59 probes |
| 10 | adb broadcast bridge (debug only) | all six verbs exercised; `clearhost` wiped the saved host and rediscovery found the kiosk again in 74 ms; an unknown verb logged the valid list |
| 11 | Manual entry works | typed `10.0.2.2:9999`, first Connect → "Nothing answered", second → `opening it anyway on operator's insistence`, then `ERR_CONNECTION_REFUSED` reported and rediscovery started |
| 12 | The failure panel is readable and complete | forced a genuine failure (no kiosk on the emulator's /24): headline, own IPs, subnet, port range, 254 addresses tried, per-host summary of what answered, manual field, Search again, Show every address, Copy diagnostics — all on one screen without scrolling |
| 13 | Sweep duration on real hardware | stage 1, 254 addresses = **9.1 s**; stage 2 full port walk over 4 live hosts = **0.34 s** |
| 14 | No screen pinning anywhere | `grep -rn "LockTask\\|lockTask\\|[Uu]npin" app/src/` returns only comments saying it is gone |

## NOT verified — read this before Calgary

- **FIRE OS IS UNVERIFIED.** The Fire tablet is not on adb, so nothing here has run on the actual
  booth device. Everything above is a Pixel 9 Pro on Android 17 plus an emulator. Fire OS is a
  fork: its WebView is a different build, and its behaviour under a 254-address sweep with 48
  threads, its clipboard, and its handling of the IME flags are all untested here. The on-screen
  panel exists precisely because that is the channel that still works if this list is wrong.
- **The two-stage sweep assumes a refusal means "host alive".** A venue AP with client isolation,
  or a host behind a DROP-everything firewall, gives timeouts instead and the host is skipped in
  stage 2. That is the documented failure mode and it is what the manual field is for.
- **Client isolation still defeats discovery entirely**, as before. Type the address.
- **A lead has not been typed through this app end to end.** The gate opened and logged
  `gate_shown`; nothing was submitted, so `/lead` → `leads-YYYY-MM-DD.jsonl` was not exercised
  from inside the APK.
- **Media autoplay was not proven with a film** in this app.
- **The landscape IME fix was not re-exercised this session.** `KioskWebView` and the overlay's
  own `IME_FLAG_NO_EXTRACT_UI | IME_FLAG_NO_FULLSCREEN` are untouched and still present, but the
  full-screen-keyboard case was not re-tested on real hardware.
- **`/events` grows all day and the command poll re-downloads it** every 8 s (capped at 512 KB).
  Fine for a booth day; it is not a design for a permanent installation.
- **The `port+1` assumption is serve.py's, and it is not checked.** If telemetry's neighbour port
  is taken, leads and the log shipping go nowhere and this app will not notice.
- **Release build / signing is not set up.** Debug APK only — which is also what carries the debug
  broadcast bridge.
- **No boot receiver, no autostart.** Someone taps the icon.
