# Expo Exhibitor App — design

**Written 2026-08-12, the evening Calgary CDTE ended. Status: DESIGN. Nothing built from this yet.**

> This exists so that **"one unified software experience to make sure there's no duplication, create
> extra notes and run a TV off a fire stick via the tablet and the phone and do the decks and
> organize it all into a single campaign per user"** — Daniel, 2026-08-12 17:00 ET.

Check every deliverable against that line, not against this document. Where the two disagree, the
line wins.

This is the **successor to `docs/plans/2026-08-07-tradeshow-toolkit.md`**, which specified the same
product five days earlier from Daniel's own words ("omnipresence", "an easy way to update
semantically via LLM"). That plan is not superseded — its phases, reuse map and constraints are
carried forward here. This document adds what the Calgary show taught: capture, notes, transcripts,
and the handoff to the systems that own follow-up.

---

## 1. What already exists — do not rebuild any of it

| Piece | State | Where |
|---|---|---|
| Stick plays the attract loop with no network at all | **Built**, running as `boothloop 1.5.0` | `kiosk-app/` |
| Stick serves the tablet surface, films, leads, SSE bus | **Built** 2026-08-11, ports 8180/8181 | `BoothServer.kt`, `BoothStore.kt`, `LeadSender.kt` |
| Tablet as WebView shell over that surface | **Built** | `tablet-app/` |
| Phone drives deck **and** booth TV | **Built** | `phone-app/` |
| Decks + presenter | **Built**, hand-authored HTML | `expo-assets/decks/`, `presenter-server.py` |
| Hosted follower — room's phones mirror the deck | **Built + proven live** 2026-08-12 | `public/live.html`, `src/app/api/live/` |
| Lead capture + self-delivering giveaways | **Built** | `src/app/api/expo-leads/` |
| Booth → CRM bridge | **DOES NOT EXIST.** `BOOTH-SYSTEM.md` §6 says so; the PA imported 22 Calgary leads by hand out of notification emails | — |

**Reuse map (verified 2026-08-07, still valid):** `~/projects/TVBOX` has the Fire TV shell, a
companion tablet app and a LAN installer; `~/projects/PhonePresenter` has the WebView shell.
**Do not copy DanTV's remote-control channel** — it drives the TV through Supabase over the
internet, which is exactly what fails at a booth.

### The duplication this app exists to remove — measured 2026-08-12

Six files exist in **both** `phone-app` and `tablet-app`, and every one has drifted:

| file | phone | tablet | lines differing |
|---|---|---|---|
| `Discovery.kt` | 591 | 495 | 360 |
| `SetupOverlay.kt` | 375 | 411 | 218 |
| `RemoteControl.kt` | 201 | 240 | 171 |
| `Diag.kt` | 208 | 203 | 101 |
| `HostStore.kt` | 90 | 63 | 81 |
| `DebugBridge.kt` | 83 | 72 | 53 |

~1,500 lines in each app doing the same six jobs differently. That is why "the phone can't find
DART" and "the tablet can't find DART" were two separate bugs in one week. Films are duplicated the
same way: DART holds `videos\` (34), `videos-lo\` (16) and `videos-heavy-2026-08-11\` (40); the
stick holds its own set; R2 holds a third under `live/talk1/vid/`. Three libraries, no manifest.

---

## 2. Boundaries — agreed with ASSISTANT (PA) and CommandCentered, 2026-08-12

These were negotiated over the collab relay and both sessions agree. They are constraints, not
preferences.

1. **`commandcentered.leads` is the one durable record of a person.** The Fire Stick is an
   **event-time capture buffer that hands off** — never a second lead database. Two stores means
   two truths and a reconciliation job nobody writes.
2. **The lead row + its note + its transcript slice is the artifact. Any digest is a view over it.**
3. **The booth → CommandCentered bridge is this app's to build.** CommandCentered has dropped it
   from their queue. Three lanes in — booth tablet, talk QR, DNYC exhibitor platform — one
   destination.
4. **Class B separation is enforced at the storage layer**, not by convention: lapel audio and
   client-facing output never share a directory, a build step, or a publish target.
5. **Every automatic lead↔audio join carries a confidence marker** and its basis. Five stretches of
   the 22 Calgary recordings are other presenters' sessions; an unmarked join would staple a
   stranger's talk onto someone's record.
6. **Owned elsewhere, must not be duplicated here:** the lead record · the follow-up queue (owners,
   blockers, tiers) · email drafting and every send decision · the Gmail drafts folder as the record
   of who was contacted · contact and consent state. **The booth app sends no client email** beyond
   the asset-at-capture delivery that already exists.

### Naming collision — resolved

CommandCentered's `Campaign` is an **email drip sequence** (`CampaignStep` with subject, body
template, delay days, sent/opened/replied counters). Its `Event` is a **production job** with a
client and load-in/load-out times. Neither is an expo season.

So: Daniel's word **"campaign" stays in the UI**, and the stored object is namespaced
**`booth_campaign`** with **`show`** as the per-event run inside it. A booth campaign's leads flow
into `commandcentered.leads`; enrolling those leads into a CommandCentered `Campaign` afterwards is
a separate, deliberate act owned by the PA.

---

## 3. Architecture

**One codebase, three roles** (the Aug-7 plan's shape, now with the duplication named): TV,
CONTROLLER, PRESENTER, chosen at runtime. Discovery, pairing, transport, playlist and diagnostics
are written **once** in a shared core module and consumed by all roles.

Five parts:

1. **Capture surfaces** — tablet form, phone hold-to-talk memo, talk QR, booth TV QR, DNYC lane.
   All five emit one lead shape.
2. **The buffer** — `BoothStore` on the stick, extended from leads to leads + memos + show clock.
   Survives dead venue wifi, which is what it already does.
3. **The bridge** — at end of show (or whenever internet appears) the stick emits one JSON per lead
   and upserts into `commandcentered.leads` by idempotent `lead_id`.
4. **The audio join** — off-box on SPYBALLOON's GPU. Rode file + memos → Whisper → per-lead slices
   at **±90 s**, offset-corrected from the show's sync marker, each with `match_confidence`.
5. **Class B separation** at the write path.

**Network:** any LAN including Daniel's phone hotspot. Venue and hotel SSIDs use client isolation
and nothing in software defeats it (`BOOTH-SYSTEM.md` §2) — the hotspot is the answer on the floor,
and the booth path needs no internet by design.

---

## 4. Data model

- **booth_campaign** — name, date range, offers, content library. Spans events.
- **show** — a run inside a campaign: venue, **local timezone offset**, start/end, and the day's
  **sync marker**. Devices, captures and exports scope here.
- **device** — role (tv / controller / presenter), paired to a show.
- **content** — film with *multiple declared encodes* (path, resolution, bitrate, target), deck as
  structured slides, QR targets. One manifest, so "which encode plays where" stops being folklore
  and the **1,557 kbps DART ceiling** becomes a validated field rather than a remembered number.
- **lead** — the PA's contract verbatim: idempotent `lead_id` · `captured_at` **event-local with
  offset, never bare UTC** · channel · device_id · person and org as **separate identity fields** ·
  asked_for · product_interest · note_text · consent · **`is_test` as a first-class flag**.
- **staff_note** — lead, audio ref, transcript, captured_at, and whether it came from a memo or a
  lapel slice.
- **recording** — a Rode file: start time, offset correction, Class B at the storage layer.
- **slice** — recording + lead + window + transcript + `match_confidence` + basis. **A slice is a
  candidate until confirmed** and never renders as fact on a record.
- **export** — per show: upsert to `commandcentered.leads`, plus an aggregated **decisions** digest
  to `~/projects/assistant/INBOX.md`. Not one item per lead — 22 items is noise.

### Why each capture rule exists (all from Calgary cleanup cost)

| Rule | What it cost when absent |
|---|---|
| Identity fields separate from free text | The hottest lead's email landed in the *studio name* field; she was invisible until reconstructed by hand |
| Format validation + confirm step | Ten tablet rows are keyboard mash (`dd@hjj.com`) |
| `is_test` as a real flag | Test rows are excluded today by pattern-matching, which is a guess |
| Idempotent `lead_id` | Four people captured twice across channels — that is the *warmest* tier, but only if it reads as one person |
| Event-local timestamps with offset | A bare-UTC value rendered six hours wrong in a build today |
| Sync marker mandatory | A wrong slice attributed to a named person is worse than no slice |
| Slice ±90 s, edges labelled | The Saskatoon content-day ask opened a full minute before anything logged |

---

## 5. v1 scope

**In:** shared core module (kill the six duplicated files) · stick as capture buffer · validated
tablet capture with the seven rules above · phone hold-to-talk memo · booth → CommandCentered
bridge · Rode ingest with sync marker and confidence-marked slices · per-show export + decisions
digest.

**Out, deliberately:** the follow-up queue, drafting, sending (owned elsewhere) · deck-as-data
(next slice) · scan-to-play game (`docs/expo-app-ideas.md`) · deck on the stick (Aug-7 Phase 4).

**Consent model, decided by Daniel 2026-08-12:** **his lapel only.** No booth mic. Recording is his
own voice plus deliberate hold-to-talk memos; visitors are captured only as incidentally as they
already are. Revisit before any ambient capture ships.

### Acceptance criteria

1. Stick with no network at all: TV shows the loop within seconds of power, audio present, no black
   frames.
2. Phone hotspot + tablet: tablet finds the stick **with no typed IP**; tap a tile → that film plays
   with the right QR.
3. A lead captured with the venue wifi **off** reaches `commandcentered.leads` after the network
   returns, exactly once, with no duplicate row on a retry.
4. The same person captured on tablet **and** at a talk produces **one** lead with two touches.
5. Ten keyboard-mash entries are impossible to submit.
6. A hold-to-talk memo attaches to the intended lead and survives an app kill.
7. A Rode file plus a sync marker produces slices whose text matches what was said at that lead's
   capture minute, each stamped with confidence and basis.
8. End of show: one digest of **decisions** in the PA inbox, and no client email sent by the app.
9. A test run cannot write to production — explicit endpoint, no usable default, destination printed
   at startup (`--no-flush` discipline; this has fired twice).

---

## 6. Deck as data — the next slice, scoped now because v1 must not block it

Daniel's Aug-7 words were *"an easy way to update semantically via LLM."* Decided 2026-08-12:
**all three, in this order.**

1. **One declarative content file.** Tile copy, taglines, film choices, QR targets, slide text.
   `kiosk.js`'s `CONFIG` block already works this way and `README-BOOTH.md` calls it "the one place
   you edit." Foundation for the other two.
2. **Phone-driven instructions.** "Move the Calgary offer after the recital block." An LLM rewrites
   the content, the renderer re-renders. This is what the 13-item fix list was, by hand, until 1am.
3. **Generation from source material** — slides from a transcript or a lead's notes, in the deck's
   own style.

---

## 7. Inherited constraints — every one was found by something breaking

1. **Telemetry needs its own port** (page + 1). Measured: 15 films played, 15 events in
   localStorage, **0 on disk** — the POSTs queued behind the videos.
2. **HTTP 206 or nothing.** Without Range, seek clamps to 0 and Safari-class clients refuse `<video>`.
3. **The SSE relay retains only `tv` state.** Retaining a `play` restarted a stale film on a
   late-joining screen.
4. **QR impressions are not scans.** Keep them separate; it is an honesty property.
5. **No email gate on the kiosk.** A gate reads as a paywall and poisons tap numbers. Capture happens
   after a film ends.
6. **`--no-flush` on every test kiosk.** Without it the disk queue auto-sends to the live route every
   two minutes. Fabricated leads have reached production twice.
7. **Warm the attract reel in the background.** Loaded on demand it measured **17 seconds of black
   screen**; warmed, the switch is **255 ms**.
8. **1,557 kbps is DART's playback ceiling** — 2.6 Mbps froze it, 1.2 Mbps played.
9. **Never hardcode an address.** DART moved `.13 → .11` in one DHCP lease and invalidated every doc,
   QR and command quoting it. `tools/booth-lan.sh` answers "what address is it".
10. **Decode a QR before trusting its caption.** Twice a printed code pointed somewhere wrong.

---

## 8. Open questions — do not guess these

1. **Which tablet, which Android version?** Decides NSD behaviour, lock-task mode, and whether the
   WebView needs a flag for autoplay-with-audio. *(Unanswered since 2026-08-07.)*
2. **Which Fire Stick generation?** Decides storage headroom and the sideload path.
3. **WebView wrapper vs native for the controller?** The wrapper keeps one codebase and preserves
   what is already verified — portrait-first, zero scroll at five viewports, 87–91 ms tap-to-frame.
   Almost certainly right; still his call.
4. **Retention for lapel audio and slices** — how long kept, who can reach them, what is deleted
   after a show. Cheaper to answer before the first recording exists.
5. **Does the DNYC exhibitor-platform lane import automatically, or stay a paste?** It is a channel
   the booth never touches, and today only the PA sees it.
