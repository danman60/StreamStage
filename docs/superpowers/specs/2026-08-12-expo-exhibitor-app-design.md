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
| Gate memory 5 min, and the product QR held for the whole film | **Shipped 2026-08-13** (`f620e68`), verified in a browser against a real bus | `expo-assets/kiosk/kiosk.js`, `tablet.html` |

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

   **The destination already exists — do not build a second one.**
   `CommandCentered/app/src/app/api/webhook/lead-intake/route.ts` is a live ingest endpoint:
   `POST`, authenticated with an `X-Webhook-Secret` header against `LEAD_INTAKE_WEBHOOK_SECRET`,
   and it **already dedupes by `{tenantId, email}`** — an existing lead is updated with a note
   rather than duplicated. That is most of acceptance criteria 3 and 4, already written.

   **Two mismatches that must be settled with CommandCentered before the bridge is built**, and
   neither may be worked around by inventing data (§7 rule: never invent a field):
   - It **requires `organization` AND `contactName`** alongside email. The booth's whole design is
     "one email box" (`BOOTH-SYSTEM.md` §5), so most real booth leads have neither. Sending a
     placeholder would put a fabricated studio name into the CRM. **The endpoint has to accept an
     email-only lead.**
   - It has **nowhere to put** `captured_at`, `consent`, `is_test`, `channel`, `staff_note` or a
     transcript slice. Today they would have to be flattened into `sourceDetails`, which makes them
     unqueryable. **Needs either new columns or a nested payload field.**
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
- **lead** — the PA's contract, inlined verbatim below so it does not live only in a collab message.

```jsonc
{
  "lead_id": "stable, idempotent — same person twice = same id, not two rows",
  "captured_at": "2026-08-11T10:07:00-06:00",   // event-local WITH offset, never bare UTC
  "channel": "booth_tablet | talk_qr | booth_tv | checklist | dnyc | website | game",
  "device_id": "which tablet, for triage",
  "person":  { "name": "", "email": "", "phone": "", "role": "" },
  "org":     { "name": "", "website": "" },
  "asked_for": ["recital video checklist"],
  "product_interest": ["StudioSage", "Reflect"],
  "note_text": "free text the visitor typed",
  "staff_note": { "audio_ref": "...", "transcript": "...", "captured_at": "..." },
  "consent": { "marketing": true, "recording": true },
  "is_test": false
}
```
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

**In:** **show lifecycle (arm → live → close)**, because §10 pattern 2 makes it the primitive the
rest hangs off · shared core module (kill the six duplicated files) · stick as capture buffer ·
validated tablet capture with the capture rules in §4 · phone hold-to-talk memo · booth →
CommandCentered bridge · Rode ingest with sync marker and confidence-marked slices · per-show export
+ decisions digest · **prize draw as a capture channel** · **show-health screen on the phone** ·
**encode manifest with the 1,557 kbps ceiling enforced** (the last three added by the 2026-08-13
pass, §9).

**Out, deliberately:** the follow-up queue, drafting, sending (owned elsewhere) · deck-as-data
(next slice) · the attract game (`docs/expo-app-ideas.md`) · deck on the stick (Aug-7 Phase 4).

**One v1 obligation the game creates**, decided 2026-08-13: the game will be **surface-agnostic**
(TV + phones, the Fire tablet, or a large touch panel later, with no rewrite), and hardware is not
being bought on a guess — it ships on the tablet already carried, and a panel gets rented for one
show only if the game proves it stops traffic. v1 owes it exactly two things, both already in this
spec: `channel` stays open-ended on the lead record (§4), and campaign content may carry arbitrary
config (§4 content). Nothing else in v1 changes.

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
10. **Closing a show produces the export and the digest in one action**, and a show that was never
    closed says so rather than silently exporting nothing.
11. **A prize draw entry is a record**: entrant, timestamp, consent, and a winner chosen in a way
    that can be shown to an organiser afterwards. Calgary had none of this and the winner was owed
    by a hard 4:00 PM deadline.
12. **The film that would freeze the screen cannot be added.** Anything over 1,557 kbps is refused
    at the point it enters the library, not discovered on stage.
13. The phone's show-health screen answers, without walking to the booth: which host is answering,
    how many leads are queued, and when the last flush succeeded.

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

1. ~~**Which tablet, which Android version?**~~ **CLOSED 2026-08-13** — it was already recorded and
   nobody looked: `docs/BOOTH-TESTED-FLOW-2026-08-07.md:5-9` names the Fire tablet **KFTRWI** as the
   customer surface and the **Pixel 9 Pro** as the operator surface.
2. ~~**Which Fire Stick generation?**~~ **CLOSED 2026-08-13, same source** — **AFTKRT, Fire OS on
   Android 11 (SDK 30)**. Both of these sat open for six days as "ask Daniel" while the answer was
   in the repo.
3. ~~**WebView wrapper vs native for the controller?**~~ **DECIDED 2026-08-13: the WebView wrapper.**
   It keeps one codebase, and it preserves what is already measured rather than re-earning it —
   portrait-first at 1024×768 and 820×1180 off a single `vmin` type scale, no scroll, 87–91 ms
   tap-to-frame, and the operator refusals enforced in both the page and the server. Native is weeks
   of work that throws all of that away. **Daniel may veto**; nothing else in the spec changes if he
   does, because §12 describes the surface, not its toolkit.
4. **Retention for lapel audio and slices.** **Assumed until Daniel says otherwise**, so the build is
   not blocked: raw recordings live on SPYBALLOON under the Class B root, never published and never
   in a client build step; **slices are kept with the lead** because they are the note, and a lead
   deleted takes its slices with it; nothing is uploaded to R2 or any CDN. **What needs his answer
   is the number** — how long raw recordings are kept before deletion. Everything else above is a
   storage-layer rule the code can enforce today.
5. **Does the DNYC exhibitor-platform lane import automatically, or stay a paste?** It is a channel
   the booth never touches, and today only the PA sees it.

---

## 9. The twenty, integrated

From `docs/five-and-five-2026-08-13.md`, 2026-08-13. Every item is placed; nothing is left floating.

### Absorbed into v1 (they ARE v1, not additions to it)

| # | Item | Where it lands in this spec |
|---|---|---|
| 1 | Idempotent upsert + `is_test` | §4 lead model + acceptance 3, 4 |
| 2 | Validation + confirm at capture | §4 capture rules + acceptance 5 |
| 3 | Lapel audio sliced onto leads | §3 part 4 + acceptance 7 |
| 4 | Booth → CommandCentered bridge | §3 part 3 + §2 boundary 3 |
| 5 | Hold-to-talk memo | §3 part 1 + acceptance 6 |
| 11 | Shared core module | §3 "one codebase, three roles" |
| 15 | Invert the flush default | §7 constraint 6 + acceptance 9 |
| 17 | No production default in the lead route | acceptance 9 (same rule, second site) |

### Added to v1 by this pass — small, and they close real holes

| # | Item | Why it earns a place now |
|---|---|---|
| 6 | Prize draw as a capture channel | The one Calgary failure with an external deadline attached, and it needs the show-close hook v1 already builds |
| 10 | Show-health screen on the phone | Every incident this week was found by walking to the booth; the data already exists in `Diag.kt` |
| 8 | Encode manifest with enforced ceiling | §4 content model already declares encodes — enforcing the 1,557 kbps ceiling is one validation, not a feature |

### Next slice, after v1

| # | Item |
|---|---|
| 9 | Deck as data + phone-driven LLM edits — already §6 of this spec |
| 7 | Capture from the follower page |
| 12 | One film library with a manifest |
| 19 | Unify `Playlist.kt` (folds into 11 and 12) |

### Housekeeping — do any time, no design dependency

13 delete the retired relay pair · 14 resolve the two talk-1 decks · 16 archive `videos-heavy-2026-08-11\`
· 18 fix or delete `public/expo-leads.html` · 20 clean `scratchpad/` out of the repo.

---

## 10. What the exercise surfaced — patterns, not items

Writing twenty grounded items exposed five things that no single item fixes. These are higher
leverage than anything in §9 and should shape the build order.

1. **Every capture defect is one defect: there is no schema at the edge.** The tablet, the web route
   and the stick each accept whatever they are handed. Items 1, 2, 6 and 17 are four faces of it.
   The fix is one shared lead contract, validated at every entry point, rather than four patches.
2. **A show is not a thing the software knows about.** There is no start, no end, no close. That is
   why the prize draw has no record, why "end of show export" has nowhere to hang, and why leads
   were flushed at unrelated moments. **Show lifecycle (arm → live → close) is the missing primitive
   most of v1 hangs off**, and it is cheap.
3. **Safety defaults are inverted in at least three places** — flush-to-production by default, a
   production email fallback when env is unset, and no test flag. One "posture" the app knows
   (rehearsal vs live show) would derive all three, instead of three flags nobody remembers.
4. **Nothing keeps a ledger of a show.** Events, leads, app logs, films played and QR impressions
   land in different jsonl files on different machines. One append-only **show journal**, with
   everything else derived from it, would have answered "who won the prize", "what played when" and
   "when did the tablet actually die" without anyone reconstructing it afterwards.
5. **The booth insists on LAN-only, but the hosted path proved itself on stage.** The follower ran
   the whole talk over `deck → /api/live → R2 → phones` with zero failures, while the LAN path lost
   the tablet to client isolation. **One transport abstraction — same message bus, LAN or hosted,
   chosen at runtime — would delete the entire class of "the phone cannot find the host" bugs**,
   which is the single most expensive recurring failure in this system's history.

A sixth, stated plainly because it is the reason the app is being built at all: **content and code
are fused.** Tile copy, QR targets, slide text and film choices live inside HTML and Kotlin, which
is why a wording change needs a developer at 1am. §6 is the cure; item 12's manifest is the same
cure applied to films.

---

## 11. The desktop control centre (Electron)

**Decided 2026-08-13: a fresh Electron app**, not built on `CompSyncElectronApp`.

> Daniel's constraint, verbatim: *"the laptop has to disappear from the booth to run the decks for
> talks and we need the tv to still be operated by tablet, otherwise the laptop can be the overall
> brain, but lead capture and tab operability can disappear when laptop is away."*

### Authority is split by domain, not by device

A device that walks away cannot hold anything the booth needs. That is not a preference — it is the
lesson of `e6dfa99`, which made the stick a client of DART's relay and put the laptop back on the
critical path; the tablet then died at Calgary the moment DART left for the stage.

| Domain | Owner | Why |
|---|---|---|
| What is playing, attract loop, tablet surface, the gate, leads captured at the booth | **The stick, permanently** | It is the only device that never leaves, and it already serves all of this since 2026-08-11 |
| Decks, playlists, tile copy, QR targets, campaign setup, film library + encodes | **The laptop** | All of it is *staged before* a show and pushed; none of it is captured in the moment |
| The aggregate view — every lead from every lane, transcripts, slices, exports | **The laptop, as consumer** | It merges and renders; `commandcentered.leads` is still the record (§2) |

**Push flows one way, state flows the other.** A stick that cannot see the laptop is a fully working
booth running the last content it was given. A laptop that cannot see the stick is a content editor
with a stale mirror, and says so.

**The rule in one line:** the control centre may be authoritative for anything that can be *staged
and pushed*; never for anything *captured in the moment*.

### What it does

1. **Owns the launchers.** `1 - START THE TALKS.bat` and `2 - START THE BOOTH.bat` become buttons
   with the thing those scripts never had: whether the presenter is actually up, which port it took,
   and whether the deck tab is serving the file you think it is. (Three separate Calgary incidents:
   a stale pid that made a "restart" silently do nothing, a browser tab serving a pre-deploy deck,
   and a preflight that declared a healthy booth dead because it assumed a port.)
2. **Slide editing** — the §6 declarative content file, edited here and pushed. Stage 2's
   phone-driven LLM instructions write to the same file.
3. **Video playlist + encode manifest** — item 12, with the 1,557 kbps ceiling enforced at the point
   of adding a film rather than discovered on stage.
4. **Every lead visible** — booth tablet, talk QR, booth TV, checklist and DNYC in one list, with
   notes and transcript slices attached, and the show export from §3.
5. **Show lifecycle** (§10 pattern 2) — arm, live, close. The close is what triggers the export, the
   digest and the prize draw, and it is the primitive none of this has today.

### What it must never do

Hold the only copy of a lead · be required for the tablet to drive the TV · be required for the gate
to work · send a client email (§2 boundary 6).

---

## 12. The surfaces — context for UX design

Six surfaces, six different humans, six sets of physics. Everything here is measured or quoted from
the running code, not assumed.

### A. The booth TV — Fire Stick AFTKRT, Fire OS / Android 11 (SDK 30)

Watched from **8–15 feet**, in a bright hall, by people walking past. No touch. No mouse. The remote
exists but a visitor must never need it. **Nothing on this screen is a control** — it is a poster
that moves. Two attract loops (six product cards with QRs; a 30-second six-up reel), and films that
follow on from one another with an end card carrying that product's QR.

Constraints that bite: the reel **must stay warmed in the background** — loaded on demand it
measured **17 seconds of black screen**, warmed it switches in **255 ms** · a `GONE` PlayerView has
no surface, so `onRenderedFirstFrame` never fires and the screen freezes on the last frame — show
the view *before* playing · **1,557 kbps is the playback ceiling** proven on DART, and 2.6 Mbps
froze it mid-talk.

### B. The booth tablet — Fire KFTRWI, the visitor's surface

**Portrait is the real booth orientation**; landscape must not break. Type scales off the **short**
edge (`html{font-size:clamp(11px, 1.62vmin, 19px)}`) so one layout serves **1024×768 landscape and
820×1180 portrait** with no per-device overrides. `user-scalable=no`, body pinned, no scroll, no
tap highlight.

The design rule, quoted from the file: *"One tap on a tile = that film starts on the TV. There is no
second step, no menu, no back button you need to find, and nothing that can be got stuck in."*
Measured **87–91 ms tap-to-frame**. In portrait the on-screen keyboard eats the bottom half of the
screen, so the gate pins to the **top**. A visitor cannot pause, mute, go fullscreen, change the
attract loop, or start the operator-only film — refused twice, on the wire and in the page.

**As of 2026-08-13** (`f620e68`) the now-playing card holds the product QR for as long as the film
plays, and the gate remembers a person for **5 minutes** while the tablet still goes home to the six
tiles after 90 seconds.

### C. The operator phone — Pixel 9 Pro

One hand, often mid-conversation, sometimes on a stage. Two roles chosen at launch (DECK or KIOSK),
which exists because a phone that sweeps the LAN uninvited caused its own problems. This is where
recovery lives: preflight, demo reset, six-up vs films, tablet rescue. **Everything here is one
thumb-reach and must survive being wrong** — it is used when something is already broken.

### D. The audience's own phones — `streamstage.live/live`

Not our hardware, not our network, not our attention. Arrives by QR mid-talk, one-handed, in a dark
room, on whatever they own. Portrait fills the width (**390×219 slide on a 390-wide phone**);
landscape gives the slide the **whole window** (693×390 on an 844×390 phone, edge-to-edge at
667×375) with the status bar floating over it. Films play **muted, on purpose**, so nobody's phone
interrupts the room. It polls every 900 ms and pre-decodes the next click-state.

### E. The deck — laptop to projector

16:9, a dark room, read from the back row. Driven from the phone or the keyboard. The audience is
looking at the **screen**, not at a UI, so any control surface is for Daniel alone.

### F. The desktop control centre — Electron, new build (§11)

The only surface with a keyboard, a mouse and time to think. This is where density is allowed: lead
tables, transcripts, playlists, slide editing, show state. Everywhere else optimises for one glance
and one tap; here it optimises for **review**.

### The through-line for whoever designs this

Three audiences, and they must not be designed alike:

| | Visitor (TV, tablet) | Operator (phone, desktop) | Audience (their phones) |
|---|---|---|---|
| Attention | Seconds, in an aisle | Split, mid-conversation | Passive, following a talk |
| Failure cost | Walks away, no lead | The booth stays broken | Loses the room's thread |
| Design rule | One tap, no dead ends, nothing to get stuck in | Fast, recoverable, honest about state | Zero interaction, never interrupts |
