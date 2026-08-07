# TEN AND TEN — StreamStage trade-show system
**Generated 2026-08-07 · Calgary Dance Teacher Expo is Aug 11–12, four days out.**

Every item below cites real code that exists in this repo. Weighted toward the four days before
the show and the two hours of the show itself; items that only pay off later are marked
**post-Calgary**.

Pick by number. Nothing here is built automatically.

---

## KILLER FEATURES

**1 · LAN beacon, so nothing has to be found by sweeping** `[industry-standard]` · `~1hr`
`serve.py:162-174` already knows its own address; `tablet-app/Discovery.kt:307-391` finds it by
probing 254 addresses × 2 ports then walking 46 more, on a weak Fire tablet. On the venue hotspot
every IP changes, and that sweep is the only path to the laptop. A 2-second UDP broadcast makes
discovery instant instead of hopeful.

**2 · Mute / stop / fullscreen / step-card over the bus** `[industry-standard]` · `~1hr`
The bus understands only `play`/`stop`/`ping` (`tv.html:963-976`). Mute, fullscreen, hide and Esc
are keyboard-only (`tv.html:993-1012`) and `README-BOOTH.md:96-107` instructs you to press them —
on a Fire Stick in Silk, which has no keyboard. Every documented recovery action is physically
unreachable mid-show.

**3 · Stop the TV silently dropping `streamstage-services`** `[boring-overlooked]` · `~10min`
`tv.html:966-967` resolves `play` through `productById()` over the six product tiles, so the 92MB
StreamStage recital/livestream film — the one that sells the actual service — is accepted by the
relay with `ok:true` and then discarded with no error anywhere. *(Being fixed right now as part of
the phone operator work.)*

**4 · TV stall watchdog and a real broken-film state** `[boring-overlooked]` · `~1hr`
`tv.html:563,571` writes `data-broken` and nothing reads it; `play()` (`tv.html:775-832`) has no
timeout; `/films` is probed once at load (`tv.html:533-544`) while the tablet re-probes every 30s
(`tablet.html:886`). A stalled film leaves a black screen indefinitely while the tablet keeps
promising "Tap to watch". `kiosk-app/BoothLoopActivity.kt:447-478` already proves the pattern.

**5 · Studio-name recall chips on the gate** `[creative]` · `~1hr`
`tablet.html:908-957`. Several people from one studio pass the booth in a burst and each thumb-types
the same studio name while a queue builds. Five tappable recent-studio chips cut the slowest field
to one tap.

**6 · Deck QRs carry `src=talk1|talk2`** `[creative]` · `~1hr`
`g.html:122` already reads `?a=&src=&p=&s=`; D2 in the checklist (`TRADESHOW-READY-CHECKLIST.md:50`)
is still open. Right now a scan from a conference seat is indistinguishable from a scan at the booth
— this is the one number that tells you whether speaking is worth the slot.

**7 · One booth preflight command** `[industry-standard]` · `~1hr`
Nothing checks `/health`, the 7 expected films (`serve.py:496-509`), Range→206, subscriber count and
a writable `telemetry/` in one shot. `expo-assets/decks/demo-panic.sh` already shows the shape you
actually run under pressure at 8am.

**8 · `/events?since=` so the command channel survives the day** `[boring-overlooked]` · `~1hr`
`RemoteControl.kt:165-203` polls `GET /events` every 8s with a hard 512KB cap (`:220-227`), while
`serve.py:132-159` returns everything ever recorded. Once the day's telemetry passes 512KB the JSON
truncates mid-array, the parse throws, and the only remote-control channel to a tablet you cannot
reach over adb dies silently — at the busiest moment.

**9 · Capture the recital date at the gate** `[creative]` · `~1hr`
The gate collects studio + email only (`tablet.html:939-957`). For a recital-filming business the
bookable fact is *when their recital is*. A six-chip month row costs one tap and the `leads.raw`
jsonb already accepts it with no schema change (`api/expo-leads/route.ts:132`).

**10 · Verify the films that land on the Fire Stick** `[boring-overlooked]` · `~1hr`
`kiosk-app/tools/push-media.sh:56-59` pushes ~350MB with no size or hash check, and
`Playlist.kt:118-124` accepts any file with `length() > 0`. A truncated adb-over-wifi push at the
hotel passes every check the app makes, fails to decode on the floor, and gets blacklisted — on the
device that is supposed to be the thing that cannot fail.

---

## STREAMLINES

**11 · "The one place you edit" is not true for the TV** · `~half-day`
`kiosk.js:5-7` claims it; the attract cards are hand-written at `tv.html:252-390`. Already drifted:
`kiosk.js:77` says `studiobeat.io/`, `tv.html:366` prints `studiobeat.io`; Reflect's unconfirmed
tagline is byte-duplicated at `kiosk.js:86` and `tv.html:377`.

**12 · The film list is declared five times** · `~half-day`
`kiosk.js:25-91`, `serve.py:496-509`, `kiosk-app/Playlist.kt:53-61`, `phone-app/KioskBus.kt:76-84`
and `:99-101`. `serve.py:334-347` already enumerates the directory. This duplication is the root
cause of item 3.

**13 · `tablet-app` and `phone-app` are a copy-fork** · `~10min` to commit / **post-Calgary** to converge
Six files forked with diverging line counts (`Discovery.kt` 438→535, `SetupOverlay.kt` 383→348,
`RemoteControl.kt` 235→196, …). A discovery bug now has to be fixed twice.
*(tablet-app is now committed as `f8e921b`; phone-app is still untracked.)*

**14 · `presenter-server.py` re-implements `serve.py`'s port machinery** · `~half-day` · **post-Calgary**
`port_free` `:29` vs `serve.py:177`; `pick_port` `:55` vs `:203`; `local_ips` `:368` vs `:162`. Worse,
both serve `/state` with unrelated shapes — the sole reason `phone-app/Mode.kt:124-143` needs a
four-key disambiguator to tell the two servers apart.

**15 · Two batched flushers, ~30 lines each** · `~half-day`
`kiosk.js:341-377` and `tablet.html:637-663`: same in-flight guard, same AbortController, same 6s
bail. Already diverged where it matters — one halves its buffer on quota exhaustion
(`kiosk.js:311-318`), the other swallows it and **drops leads silently** (`tablet.html:633-635`).

**16 · Dead code describing behaviour the system no longer has** · `~1hr`
`qrUrl()` (`kiosk.js:160-167`) is never called because QRs are pre-baked SVGs, which makes
`CONFIG.attribution` and the header comment dead documentation; `accent:` is never read and four of
six values contradict `brand.css:66-97`; `data-broken` written never read; `cs.urlUnconfirmed`
(`tablet.html:1276`) keeps `#w-compsync` permanently hidden.

**17 · `Report.load()` is on the wrong port and cannot time out** · `~10min`
`kiosk.js:637` fetches a **relative** `/events`, hitting the page port with no AbortController —
directly contradicting `serve.py:549-561`, where telemetry was moved to page+1 precisely so it could
not be starved by the films (measured: 15 films played, 0 events on disk). Already on
`ACTIVE-ITEMS.md:57-58`.

**18 · Ten event types are recorded and never rolled up** · `~1hr`
`Report.rollup` (`kiosk.js:512-559`) handles ten types and ignores `gate_shown` (`tablet.html:914`),
`gate_closed`, `visitor_start`, `visitor_end`, `gate_override`, `services_start` (`tv.html:664`) and
more. **Gate conversion — how many people who saw the form finished it — is written to disk all day
and never computed.** That is the number that says whether the gate was worth adding.

**19 · Two of the three day-of documents point at the stale Talk 1 deck** · `~10min`
`av-preflight-checklist.md:6` and `START-HERE.md:26` both name `decks/talk1-video.html`, while
`talk1-runofshow.md:10-11` correctly names the canonical `StudioSage/live-demo/talk1-deck.html`. The
self-banner catches it only after the wrong file is open in front of the room.

**20 · `push-media.sh` re-pushes ~350MB every run with no verify** · `~10min`
`push-media.sh:56-59` pushes unconditionally and `:78-82` grants a permission it never confirms. A
size compare turns the hotel-room top-up into seconds instead of a full re-transfer over hotel wifi.

---

## Corrections to earlier assumptions, found while generating this
- There is **no `/api/lead` route**. It is `/api/expo-leads` (`src/app/api/expo-leads/route.ts`),
  and it does not write Supabase directly — it forwards to `https://www.studiosage.ai/api/leads`
  (`route.ts:175-180`). That forward is where the email-merge overwrite lives.
