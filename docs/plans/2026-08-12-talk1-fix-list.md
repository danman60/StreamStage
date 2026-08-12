# Talk 1 fix list — 2026-08-12

**This exists so that Daniel's notes for the video talk (talk 1, 10:50 MDT Wed Aug 12) are in the
deck he actually presents.** Source: his 13-item list, plus his answers on slide order
(`3, 5, 6, 4, 7`), "everybody in the pool" = slide 8, the explainer = the kiosk film, and the
calculator = `streamstage.live/dancepromo`.

Deck: `expo-assets/decks/talk1-deck.html` (27 slides). Calculator: `src/app/dancepromo/page.tsx`.
Films live only on DART at `C:\Users\User\Desktop\StudioSage-Live-Demo\videos\`.

## Items

| # | Change | Target | Accept when |
|---|---|---|---|
| 1 | Reorder to `3, 5, 6, 4, 7` — slide 4 moves after Camera Settings | `talk1-deck.html` | Deck walks 3 → 5 → 6 → 4 → 7 → 8; counter reads 27 |
| 2 | Chain reads: 4 (How are you making video now) → 7 (Shoot. Edit. Post. Repeat.) → 8 (Content Day = "everybody in the pool") | same | Falls out of #1 |
| 3 | Camera Settings cards: fill the dead bottom half with graphics | slide 6 | No full-height card ends in blank space |
| 4 | Move slide 17 (Walk Out With / Demo) to directly after slide 9 (Four stations) | slide 17 | Hero examples play straight after the stations |
| 5 | Remove the giant black shading box on 17 | `.s10 .third` inherits the `:244` full-width 94% scrim | Bottom of 17 is clear |
| 6 | Arm audio on the title slide so later videos start with sound | slide 1 + player JS | One click at the open; 17 and the explainer come up loud |
| 7 | One control steps to the next promo along the top of 17 | `.s10 .srcs` | Advances through the source buttons without aiming |
| 8 | Remove the Tiffany Adoranti button; keep the kiosk reel | `talk1-deck.html:1242` | Four sources, not five |
| 9 | Slide 21 media fee: StreamStage logo + three bullets — we charge you a media fee per dancer / you charge families per dancer / you make the margin | slide 21 | Three bullets in that order, logo on slide |
| 10 | Slide 23 tiles → `videos-lo/` | slide 23 + DART encode | Section 2 drops from 7,806 kbps to ~2,400; wall does not lock |
| 11 | New slide: StudioSage explainer, after 26 | kiosk film, re-encoded 720p ≤1500 kbps | Plays without stutter on DART |
| 12 | New slide: Calgary offer — 4 studios book a content day Oct 2–5, travel included free | after the explainer, before the close | On screen, before CTA |
| 13 | Close: "Bigger show? I travel." → "Local team shoots we deliver" | `:1600`, `:1621` | Both instances changed |
| 14 | Calculator +15% across the board, rounded to $5, volume tiers raised to match | `src/app/dancepromo/page.tsx` | Same job lands in the same discount band |

## Measured facts this plan depends on

- Slide 23 section 2 = 6 x 720p = **7,806 kbps**; section 1 = 5 tiles = 6,276 kbps.
- Slide 14's nine-reel fan is ONE fragment → 10 simultaneous players, over the ~8 the deck's own
  comment (`:1760`) says the browser allows. **Not in Daniel's list — flagged, not changed.**
- Kiosk explainer `expo-assets/kiosk/media/studiosage.mp4` = 1920x1080, 48.4 s, **2,746 kbps** —
  1.8x the 1557 kbps ceiling that froze DART on slide 1. Must be re-encoded before it goes in.
- Slide 1's `kiosk-testimonials.mp4` is 1000 kbps but **181 s / 22.6 MB**, and the two-slide halo
  (`:1817`) prefetches slide 3's four 720p promos (5,668 kbps) while it plays.

## Deviations

Logged here as they happen, not absorbed silently.

- Daniel first said "swap six and five", then gave the explicit order `3, 5, 6, 4, 7`, which keeps
  5 before 6. Executed the explicit list; flagged to him.
- "After the well" read as "after the wall" — Calgary offer placed after the explainer and before
  the close, since an offer belongs immediately before the CTA. Flagged.
