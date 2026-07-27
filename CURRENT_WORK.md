# Current Work - StreamStage

## Active Task
**Talk 2 expo deck (Dance Teacher Expo, Wed Jul 29 2026, 4:10–5:10 PM EDT, Adapt Stage).**
Run-through #2 notes executed end to end, plus three mid-session directives from Daniel.
Deck is **38 slides**, audit-green, mirrored to FIRMAMENT. Nothing deployed.

## Recent Changes (Session 2026-07-26 evening)
- **Five moves rebuilt:** 1 talk-don't-type · 2 studio-in-two-files (voice + brand + the folder) ·
  3 make-it-write-the-prompt · 4 make-the-poster · 5 handbook. Connectors and cowork/crons moved out
  of the tips and into the agentic ladder as rungs 2 and 3.
- New slides: push-lands-early, audience gauge, one-folder, perfect-unison (moved out of the open),
  rung 2, rung 3, philosophy, dashboard walkthrough video, what's-your-time-worth.
- Cut: old tip 4, old close slide, stale pain-point board (lobby TV), number pops, mid-livestream
  tease, "text this number" on the StudioSage slide.
- CTA rebuilt: two generated QRs, freebie **email-gated**, first-five + $20/yr hosting, "Big love."
- All 38 slides carry hand-written `data-beats` with `!!`/`>>`/`..` markers; varied transitions on
  every content slide; "dancer" never "kid" swept through.
- Live-demo slide: persistent SMS-intent QR + number + 5 known facts. Reveal slide: real curtain,
  URL bar, one-click pre-baked fallback. Dashboard video autoplays on its slide.
- `rehearsal/COVERAGE.md` written — every item from BOTH transcripts, status + location + a
  NEEDS DANIEL list at the top.
- Docs regenerated: `talk2-ai-script.md`, `talk2-runofshow.md` (38-row cue sheet),
  `talk2-ai-slides.md` + `talk2.html` tabs (now via `regen-slides.py` / `regen-notes.py`).
- `handout-5-free-ai-moves.html` (the freebie PDF source) rebuilt — it still had the old moves and
  Talk 1's banned thesis.

## Blockers / NEEDS DANIEL
1. **Timing:** cue sheet holds ~93 min of material for a 60-min slot. Cut list is at the top of
   `talk2-runofshow.md`. His call — nothing cut unilaterally.
2. `studiosage.ai/moves` must exist, be email-gated, and serve the PDF (CTA QR points at it).
3. Live-demo routing `?rt=<token>` + tenancy check (StudioSage repo — other session owns it).
4. Real multicam stills for the loop-payoff slide (four styled frames stand in).

## Next Steps
- Daniel rehearses from the FIRMAMENT copy (`talk2-deck.html`) and rules on timing.
- After ANY deck change: `scp` to FIRMAMENT, then run `regen-slides.py` and `regen-notes.py`.
- Verify harness: `PRESENTER_PORT=8081 python3 expo-assets/decks/presenter-server.py` +
  `deck2-all.mjs` (session scratchpad) — checks JS errors, fonts, overflow at 1920×1080.
- Nothing committed this session; deck work is uncommitted in `expo-assets/`.

---

# Previous work (2026-03-10/11) — video production proposal builder

## Recent Changes (Session 2026-03-10/11)
- Video production proposal builder added at `/videoproduction`
- Legacy `/proposal-builder-videoproduction` now redirects to `/videoproduction`
- New submission endpoint added at `/api/video-production-proposal`
- Local verification: production build passed, `/videoproduction` returned 200, redirect returned 308
- Video production pricing updated to custom days, second-operator days, and deliverables instead of marketing support
- Submit proposal section widened to a full-width band below the calculator
- Video production email route now mirrors recital-builder validation and send flow more closely
- `7fa6ae2` fix: landscape carousel spacing + mute on fullscreen exit
- `076c125` Revert full-width single carousel (BS-style)
- `d4abe28` feat: auto-rotating 3D carousel like Bending Spoons
- `92a4dc9` feat: update hero background video
- Interactive Software cards — desktop hover (demo panel slides from behind at z-0, scale 0.9→1) + mobile tap-to-expand
- Hero text animations — TextAnimate blurInUp + fadeIn (gradient-safe motion.span for "Technology")
- Section header animations — About, DanceMedia, BusinessVideo all use TextAnimate
- Client logos — removed opacity dimming, now bright white
- Video carousel optimization — IntersectionObserver lazy-loading, dist<=1 play radius, preload strategy
- R2 video compression — 694.8 MB → 276.0 MB (ffmpeg CRF 28-30, max 720w/1280w)
- Blog infrastructure — MDX system (`src/lib/blog.ts`, `src/app/blog/`, `content/blog/`), sitemap integration
- 18-post content plan + ChatGPT agent prompt saved to `docs/plans/`
- Carousel sizing fix — minimum effective item count (10 vertical, 8 horizontal) for consistent radius

## Blockers / Open Questions
- **Carousel panel sizes**: User noted Business Video carousels are noticeably smaller than Dance Media. Min effective item count fix helped radius but user clarified "the panels themselves" — may need further width/aspect-ratio tuning
- **Blog posts**: Content plan ready, delegated to ChatGPT agent. Posts not yet written.
- **StudioBeat demo link**: `demoHref` prop exists but user will wire up later
- Production email/webhook delivery still depends on deployed env vars (`SMTP_USER`, `SMTP_PASS`, optional `CC_WEBHOOK_URL`, `CC_WEBHOOK_SECRET`)

## Next Steps
1. Push/deploy updated video production pricing model and verify live route
2. Submit a live test proposal after deploy to verify email + CRM bridge
3. Investigate carousel panel size mismatch (the container/card dimensions, not radius)
4. Blog posts — user writing via ChatGPT, drop MDX files into `content/blog/`
5. Wire up StudioBeat demo click-through when ready
6. Consider adding demo videos for CompSync and StudioSage

## Context for Next Session
- New files: `src/app/videoproduction/page.tsx`, `src/app/videoproduction/layout.tsx`, `src/app/api/video-production-proposal/route.ts`
- Video production pricing now uses $750 per primary shoot day, optional second-operator days, and deliverable toggles calibrated to legacy Bronze/Silver/Gold totals
- Software.tsx: DesktopProducts uses CSS grid + absolute overlay panel (z-0 behind cards, z-10 cards). MobileProducts uses tap-to-expand with AnimatePresence
- VideoCarousel.tsx: 3D cylinder carousel, auto-rotating at 6°/s, IntersectionObserver controls loading
- TextAnimate component at `src/components/magicui/text-animate.tsx` — don't use on gradient text (breaks background-clip), use motion.span instead
- Blog system: `src/lib/blog.ts` parses `content/blog/*.mdx`, pages at `/blog` and `/blog/[slug]`
- Plans saved in `docs/plans/`: blog content plan, chatgpt prompt, software card animation plan
- R2 bucket: `pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev` — all videos compressed
