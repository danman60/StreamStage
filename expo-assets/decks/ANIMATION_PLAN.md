# Deck Animation Upgrade — StudioSage/StreamStage Expo Talks

**Date:** 2026-07-20
**Goal:** Turn the two static expo decks (`talk1-video.html`, `talk2-ai.html`) into an "ultra high-end animated presentation" — mid-slide reveal-on-click (fragments), entrance animation on slide-enter, and ambient life on decorative elements. Plus wire the already-built offline animated live-demo fallback (`kb-demo/index.html`) as an explicit no-wifi cue.

**Constraint:** stays 100% self-contained / offline / dependency-free (matches AV notes). No libraries. Presenter-safe: fragments reversible, `F` reveals all, number-jump lands fully-revealed.

## Current state (verified)
- Both decks: fixed 1920×1080 `#stage` scaled-to-fit, `.slide.active` swaps via display none/block. **No `@keyframes`, no transitions, no fragments.** Nav: `←/→/space`, number+Enter jump, `P` notes.
- `kb-demo/index.html`: already a high-end offline 8-beat animated demo, **zero network calls**. This IS the no-wifi fallback. Slide 14 (talk2) already points to it.

## Engine (shared, injected into both decks)
### Fragments (`data-frag`)
- Elements tagged `.frag` (+ optional `.f-up/.f-fly/.f-fade/.f-ring` variant, `data-frag=<order>`). Hidden until revealed.
- `→`/space/click → reveal next unrevealed frag; when none remain → next slide.
- `←` → hide last-revealed frag; when none → previous slide (lands fully-revealed).
- `F` → reveal all frags on current slide (safety). Number+Enter jump / `End` → land fully-revealed.
- On slide enter (forward) frags reset hidden; entrance anims play.

### Entrance (`.e-up/.e-fade/.e-scale/.e-left/.e-right`, `--d` delay)
- Play when ancestor `.slide.active`. Staggered via `--d`.

### Ambient (existing selectors, always-on; only active slide paints)
- `.ripple/.ripple.r2` expand+fade loop · `.cam .rec` blink · `.cam .glow`/glows breathe · `.micwrap` pulse · `.grain` drift.

## Money slides
- **talk2:** S2 job-lasso ring · S4 chips 1→5 then +6 · S9 handbook Q→A · S10 pain-board fills live · S11 loop-chain + reply fly-in + conf · S15 digest one-tap.
- **talk1:** tag equivalent build beats after engine port.

## Fallback
- S14: add explicit "NO WIFI? → run kb-demo/index.html" backup cue.
- kb-demo polish pass (optional).

## Rollout
Build talk2 → screenshot checkpoint (DM) → port to talk1 → fallback wiring → mirror all to FIRMAMENT `C:\Users\danie\Desktop\StudioSage-Live-Demo\decks\` (talk1-deck.html / talk2-deck.html).
