# The kiosk LAN beacon

**Owner of this file:** `expo-assets/kiosk/serve.py`.
**Audience:** whoever is adding fast discovery to `tablet-app/` or `phone-app/`.

This is a **contract**. If a field below is wrong for a client, change it *here first* and say so —
the server keeps sending exactly what is written here.

---

## Why it exists

On the venue's phone hotspot every address changes between one morning and the next. Today the
tablet and the phone find the laptop by probing 254 addresses on several ports each
(`tablet-app/Discovery.kt`), on a weak Fire tablet, over a congested trade-show 2.4GHz band, while
the same band is carrying the films. It works. It is slow, and it is hopeful.

So the server shouts instead. One small UDP datagram, every two seconds, saying where it is.

## What it does NOT do

**It does not replace the sweep, and no client should make it a dependency.** The sweep is still
the only thing that works when a router blocks broadcast, and it is untouched. Treat the beacon as
a shortcut that usually fires first:

> Listen for a beacon for ~3 seconds. Got one? Use it, and skip the sweep. Nothing? Sweep exactly
> as you do today.

A beacon that never starts, or a network that eats every datagram, must be indistinguishable from
the system as it was before this existed. On the server side that is already true: the beacon runs
on its own daemon thread, every send is wrapped, and a socket it cannot create ends the thread
without the HTTP servers ever learning about it.

---

## The packet

| | |
|---|---|
| transport | UDP, **broadcast** |
| port | **45454** (override: `serve.py --beacon-port N`) |
| sent to | `255.255.255.255` **and** the /24 directed address (`192.168.0.255`) — both, every time |
| cadence | every **2 s** |
| body | one JSON object, UTF-8, no framing, no newline, ~300 bytes |

```jsonc
{ "ss": "kiosk",                 // magic. Ignore any datagram where this is not exactly "kiosk".
  "v": 1,                        // packet version. Ignore anything you do not understand.
  "host": "192.168.0.13",        // the address to talk to
  "port": 8080,                  // PAGE port: /tv, /tablet, /bus, /state, /films, /health
  "telemetryPort": 8081,         // ALWAYS port+1: /log, /lead, /events. A different origin.
  "tv":     "http://192.168.0.13:8080/tv",
  "tablet": "http://192.168.0.13:8080/tablet",
  "films": ["callboard","compsync","costumecraft","reflect",
            "streamstage-services","studiobeat","studiosage"],   // basenames, no .mp4
  "subscribers": 1,              // screens on the SSE stream right now
  "t": 1786148619902 }           // Date.now() on the laptop, ms
```

### Rules for a client

1. **Match on `ss` first.** Anything else on 45454 is not us. Never parse before that check.
2. **Ignore an unknown `v`.** A future packet may add fields; it will not remove these, and `v`
   goes up if it ever does.
3. **`host` is authoritative, not the datagram's source address.** They are the same today. If a
   router ever rewrites the source, `host` is what the server believes about itself.
4. **Telemetry is `port + 1`, always.** Do not sweep for it, do not assume 8081 — take it from
   `telemetryPort`. `serve.py` steps its port search by two precisely so the pair stays aligned,
   and a kiosk that fell forward to 8082 has telemetry on 8083.
5. **A beacon is not proof the booth is the one you want.** If two servers are running you will
   hear two beacons. `GET /health` on each and use `hasTv` to tell the live booth from a copy
   somebody left open — see below.
6. **Do not reply to it.** There is no handshake and no discovery request. The server talks; it
   does not listen on this port.

### Minimal listener

```kotlin
DatagramSocket(null).apply { reuseAddress = true; bind(InetSocketAddress(45454)) }.use { s ->
    s.soTimeout = 3000                       // then fall back to the sweep, unchanged
    val buf = ByteArray(2048)
    val p = DatagramPacket(buf, buf.size)
    s.receive(p)                             // throws SocketTimeoutException -> sweep
    val o = JSONObject(String(p.data, 0, p.length, Charsets.UTF_8))
    if (o.optString("ss") != "kiosk") return@use
    val base = "http://${o.getString("host")}:${o.getInt("port")}"
}
```

`reuseAddress` matters: the tablet and the phone may both be listening on one device during
testing, and without it the second bind fails.

---

## Telling two servers apart

A second copy of `serve.py` — one left open from yesterday, one started twice at 8am — takes the
next free port pair and serves happily. Both beacon, and both answer `/health` with `ok:true`.
A `play` posted to the wrong one reaches nothing, and the SSE stream on the dead one looks
identical to a working booth.

`GET /health` identifies the instance:

```jsonc
{ "ok": true, "ip": "192.168.0.13", "port": 8080,
  "pid": 48231,                       // this process
  "startedAt": "2026-08-11T07:52:10", // when it started
  "uptimeS": 4210.6,
  "hasTv": true,                      // a TV has heartbeated at THIS instance in the last 5s
  "tvLastSeenMs": 1786148619902,
  "subscribers": 2,
  "expectedFilms": ["studiosage", "...", "streamstage-services"],
  "missingFilms": [],
  "filmsSource": "kiosk.js",          // or "built-in fallback"
  "telemetryWritable": true,
  "beaconPort": 45454,
  "leadFlush": { "queued": 0, "sent": 3, "note": "sent 3 — queue empty" } }
```

**`hasTv` is the tiebreaker.** The live booth is the one a TV is talking to. Prefer a beacon whose
`/health` reports `hasTv: true`; if none does, prefer the one with the longest `uptimeS` and say on
screen that more than one was found, because that is a thing Daniel needs to know rather than a
thing to guess about quietly.

`preflight.sh` makes the same check and refuses to pass when two are listening.

---

## Change log

| date | change |
|---|---|
| 2026-08-08 | First version. UDP 45454, `v:1`, purely additive alongside the existing address sweep. |
