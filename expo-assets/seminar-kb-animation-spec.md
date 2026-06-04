# Live Animated Demo — Build Spec + Beat Sheet
**[LIVE ANIMATED DEMO] — StudioSage knowledge base populating live on screen**
For Slide 17 of the seminar. **This is a flag-for-Daniel build task — this doc is the SPEC, not the asset.**

---

## What this is
The marquee on-screen moment of the AI half: an EMPTY StudioSage knowledge base fills up in real time in front of the room, then a parent text gets an instant, in-voice answer. It visually proves the script's core claim — *"It didn't get smart in general. It got smart about YOUR studio."* — and pays off the human-in-the-loop / confidence-flag mechanic from the livestream story.

**Honesty constraint:** This is a faithful animated MOCK, NOT the pre-beta real UI. It must look like StudioSage's product direction (brand, layout, voice) without being screen-recorded beta software that might break, lag, or expose half-built features on a big stage. No invented stats, no real beta-client names on screen.

---

## Recommended implementation

### PRIMARY — lightweight HTML/CSS/JS web mock, run live in a browser tab
- A single self-contained `index.html` (inline CSS + vanilla JS, no build step, no server, no network calls) opened full-screen in a browser tab on the presenter laptop.
- **Why primary:**
  - **Zero render** — edit and reload instantly, no export pipeline.
  - **Re-runnable** — one keypress restarts the whole sequence; Daniel can run it twice if the room reacts.
  - **Wifi-independent** — everything is local; a dead trade-show network can't kill the demo.
  - **Pacing control** — advance beat-by-beat on spacebar/click (manual) OR auto-play on a timer. Manual is safer for a live talk so Daniel narrates each beat.
- **Tech:** plain HTML/CSS/JS. CSS transitions/`@keyframes` for fly-in + counter. No framework needed; a tiny bit of JS to sequence beats and bind the advance key. Big type, high contrast, brand colors. Designed for 1920×1080 projector, readable from the back row.
- **Controls:** `Space` / `→` = next beat; `R` = restart; optional `A` = auto-play. Build a "presenter safe mode" where nothing depends on timing being perfect.

### ALT — Remotion-rendered MP4
- Same beat sheet, rendered to a clean 1080p (or 4K) MP4 as a fallback if a video file is preferred (e.g., AV booth wants a file, or laptop browser is locked down).
- Trade-off: not re-runnable beat-by-beat, no live pacing, must re-render on any change. Keep as backup, not primary.

### Either way
Faithful mock only. Match StudioSage brand and the SMS/KB layout direction. Do not screen-record real beta UI for the stage.

---

## Beat sheet
Each beat = one spacebar advance (primary) or one timed segment (alt MP4). Narration cues mirror the script.

**BEAT 0 — Empty KB (cold open)**
- Screen: StudioSage KB dashboard, **empty**. A "Knowledge: 0 sources" counter. Faint empty-state text: *"This studio's brain is blank."*
- Narration: *"Right now this studio's knowledge base is empty. It knows nothing."*

**BEAT 1 — Forwarded emails fly in as cards**
- Screen: A batch of real-looking parent emails animate in from the edge and snap into place as KB cards:
  - "Saturday rehearsal — 9am"
  - "March break — closed"
  - "Picture day — dress code"
  - (2–3 more for density)
- Counter ticks up as each lands (0 → 3 → 6…). Subtle whoosh/settle motion.
- Narration: *"I forward in a batch of real parent emails…"*

**BEAT 2 — Click-connect the website**
- Screen: A "Connect website" button gets clicked (cursor animates), a URL field fills (studio's site), a brief "scanning…" shimmer, then a "Website connected" chip appears. Counter jumps.
- Narration: *"…connect the website…"*

**BEAT 3 — Drop the handbook PDF**
- Screen: A handbook PDF icon drags into a drop zone, "Processing handbook…" progress, then "Handbook added — 28 pages" chip. Counter ticks up again.
- Narration: *"…drop in the handbook PDF."* (counter visibly climbing)

**BEAT 4 — Parent text arrives**
- Screen: View shifts to a phone/SMS pane on the side (or splits). An incoming gray bubble: **"What time is Saturday rehearsal?"**
- Narration: *"Thirty seconds ago it knew nothing. Now a parent texts…"*

**BEAT 5 — Instant in-voice answer + confidence indicator**
- Screen: A typing indicator (brief), then the studio-side reply bubble appears **in the studio's voice**:
  *"Saturday rehearsal is at 9:00am — doors open 8:45. See you there! 💜"*
- A **confidence indicator** shows next to it: a green "High confidence" pill / 95% meter — the human-in-the-loop nod.
- Narration: *"…and there it is, in the studio's own words. It didn't get smart in general — it got smart about YOUR studio."*

**BEAT 6 (optional) — The flag/human-in-the-loop beat**
- Screen: A second incoming text it's NOT sure about (e.g., "Can my daughter switch to the Tuesday class?"). The reply does NOT send — instead a **"Flagged for your morning digest"** card appears with a one-tap "Answer" affordance.
- Narration: *"And when it's not confident? It doesn't guess. It flags it for your morning digest — you one-tap, and it learns it forever."*
- Purpose: visually closes the same confidence-and-flag mechanic from the livestream email-bot story. Keep this beat if time allows; it's the trust beat.

**BEAT 7 — Rest state / restart**
- Screen: Settle on the populated KB + the answered thread, "Setup: ~10 minutes" caption.
- Narration: *"Setup is about ten minutes. One class period, and you've trained your front desk."*
- `R` restarts to BEAT 0.

---

## Visual / brand notes
- Layout: KB dashboard (left/main) + SMS thread (right/inset), or sequential full-screen panes — whichever reads cleaner from the back row.
- Type: big, high-contrast, projector-safe. Counter must be legible at distance.
- Motion: fast and confident (200–400ms transitions). No slow fades — energy matches the talk.
- Confidence indicator is a REQUIRED element (green pill / percentage) — it's the human-in-the-loop proof, not decoration.
- Copy on screen: generic studio voice. **No real beta-client names. No invented saved-hours stat or client counts.** "~10 minutes" setup is the only quantified claim (matches grounding).

## Deliverable for the builder
1. `index.html` (self-contained, inline CSS/JS, no network) — PRIMARY.
2. Spacebar/arrow beat advance + `R` restart + optional auto-play.
3. Optional Remotion MP4 export of the same beats — ALT/backup.
4. Test full-screen at 1920×1080 on the presenter laptop, offline (airplane mode), and confirm restart works mid-talk.
