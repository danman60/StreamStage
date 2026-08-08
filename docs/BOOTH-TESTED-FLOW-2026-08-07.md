# The booth, function by function — what was tested, on what, and what was not

Verified 2026-08-07 on real hardware. Nothing in this file is a plan or a hope; every ✅ was
executed on the devices named below and the output was read.

**Hardware**
- Fire Stick **AFTKRT**, Fire OS on Android 11 (SDK 30), `192.168.0.199` — the booth TV
- Fire tablet **KFTRWI**, `192.168.0.11` — the customer surface
- **Pixel 9 Pro** — the operator surface
- Kiosk server: current `serve.py` on **DART `192.168.0.13:8081`**, over the real Wi-Fi.
  No `adb reverse`, no loopback scaffold.

---

## 1. Set-up at the venue

| Step | State |
|---|---|
| Laptop runs `python3 serve.py --port 8081`; it beacons on UDP 45454 | ✅ |
| Plug in the stick — **the reel comes up on its own, zero touch** (after the one-time `pm grant` + `appops set` below) | ✅ cold power cycle, nobody touched anything |
| Stick finds the kiosk over Wi-Fi and subscribes **1.3 s** after launch. Nobody types an IP | ✅ |
| Tablet discovers the kiosk itself; if it drifts, 7 taps top-left → type host → Connect | ✅ both paths |
| Phone: KIOSK tab, same discovery | ✅ |

## 2. Idle / attract

| Step | State |
|---|---|
| Stick loops all 7 films from `/sdcard/Movies/StreamStageBooth`, sound on | ✅ |
| Runs with no laptop, no kiosk and no network at all | ✅ |
| Publishes its own state every second, so the tablet and phone show a live TV rather than "no screen" | ✅ |

## 3. A visitor — the tablet

| Step | State |
|---|---|
| Tap a tile → gate: **Studio + Email, two boxes** | ✅ |
| Submit → that film plays on the stick in ~5 s | ✅ |
| Same visitor's later taps do **not** re-gate; a page reload is the next visitor | ✅ |
| Lead written to the kiosk's disk, fsync'd on arrival, exactly as typed | ✅ |
| Visitor cannot start the operator-only StreamStage film — **403**, three request shapes | ✅ |
| Visitor cannot pause / resume / mute the TV — **403**. `stop` stays allowed | ✅ fixed this session |

## 4. The operator — the phone

| Step | State |
|---|---|
| Play any film, including the operator-only StreamStage film | ✅ |
| Pause holds the frame (`pos` frozen at 7.73 across 3 s) | ✅ |
| Resume advances it (11.42 → 15.43) | ✅ |
| Stop returns to attract | ✅ |
| Drag to reorder the attract loop, and the stick applies it | ✅ |

## 5. Things going wrong

| Step | State |
|---|---|
| Laptop dies mid-show → reel keeps playing, **nothing alarming on screen** | ✅ |
| Laptop returns → stick reconnects on its own, no human action | ✅ |
| Stick unplugged and replugged → reel returns by itself, zero touch | ✅ |

## 6. Leads, after the show

Run `python flush-leads.py --endpoint <live route>` on the kiosk machine.

| Step | State |
|---|---|
| Sends each lead once; a second run sends zero | ✅ |
| Route answers 200 but `forwarded:false` → **keeps them queued** | ✅ |
| No internet at all → **keeps them queued** | ✅ |
| Survives a kiosk restart | ✅ |
| Email contains Studio + Email only, **no invented name** | ✅ read in the real inbox |

## 7. On the TV itself

| Step | State |
|---|---|
| 170 frames off the real stick; 43 had a QR and a caption together; **0 overlapped** | ✅ |

---

## NOT tested — do not claim these

- **The 20-minute Fire OS sleep timer.** Proven for 27 minutes in an earlier session; not re-run
  on 08-07. Longest continuous run this session was minutes, not hours.
- **The baked-in QR target.** An earlier session found the StreamStage film's QR points at
  `expo-leads.html`, not the gated `/g`. Not verified and not fixed here.
- **The tablet browser's own offline lead queue** (localStorage retry). Only the kiosk's disk
  queue was exercised.
- **A real flush to the production route over the internet.** One lead did reach Daniel's inbox,
  but through a locally-run copy of the route; every queue test used a LOCAL sink.
- **The R2 film-update path** (`UpdateManager.kt`).

## Power-on is ZERO TOUCH — one-time bench step per stick

Run BOTH, once, per stick:

```
adb shell pm grant com.streamstage.boothloop android.permission.SYSTEM_ALERT_WINDOW
adb shell appops set com.streamstage.boothloop SYSTEM_ALERT_WINDOW allow
```

They satisfy different branches of Android 11's background-activity-start check. `pm grant` flips
`granted=true` — the permission's protection level carries a `development` flag, which is what
makes it adb-grantable. `appops set` only sets MODE_ALLOWED. **With appops alone the boot start is
still refused**, which is what made this look impossible for an evening.

Verified 2026-08-07 23:22 on AFTKRT: logcat read *"Background activity start for
com.streamstage.boothloop allowed because SYSTEM_ALERT_WINDOW permission is granted"*, and after a
cold power cycle the reel owned the screen with no human action and no remote.

Nothing in the app draws an overlay. Re-run both after a factory reset. Fire OS 7 (API 28)
predates the restriction, so this only ever broke on Fire OS 8.

## The root cause fixed this session — do not undo it

`kiosk-app`'s `network_security_config.xml` permitted cleartext HTTP **to 127.0.0.1 only**. The
booth kiosk is a laptop on a DHCP LAN address serving plain HTTP, so every `BoothBus` health probe
was blocked before it left the device, and `health()` swallowed the reason — a blocked kiosk and
an absent kiosk were indistinguishable. It passed on the bench because `adb reverse` makes the
laptop look like loopback, the one address that policy allowed.

**The tablet could never have driven the stick on a show floor.** Fixed; the probe now logs why it
fails. Do not "harden" that file back to loopback-only — that is the bug.

## Environment facts worth not re-deriving

- **SPYBALLOON's INPUT policy is DROP.** Devices cannot reach a server on that box over the LAN.
  Serve the booth from DART, or use `adb reverse` and know it is a scaffold.
- **DART runs on Eastern**, so its lead files are named `leads-<yesterday>.jsonl` relative to
  SPYBALLOON's UTC clock.
- Three stray kiosk servers from earlier sessions were beaconing on the LAN and stealing device
  discovery. All stopped. If devices drift to the wrong kiosk again, look for those first.
