# Current Work - StreamStage

## ⏰ DEADLINE — Calgary Dance Teacher Expo, Mon Aug 10 2026
Flights WS633 out Aug 10 09:00 YYZ->YYC, WS636 home Aug 13. Hotel Clique Calgary Airport
(conf 220855). Venue Westin Calgary Airport. Full detail:
`expo-assets/CALGARY-2026-08-10-LOGISTICS.md`.
**Last useful working day for deck changes is Sun Aug 9.**
BOTH talks confirmed on the event agenda, Adapt Stage / Business Track, 1 hour each:
- **Tue Aug 11, 09:20 AM** - "Why AI? Save Your Studio Time, Money, and Stress" (talk 2)
- **Wed Aug 12, 10:50 AM** - "One Year of Video Content in One Day" (talk 1)
Order is REVERSED vs Toronto - AI goes first. The Toronto cliffhanger points the wrong way.
Talk 1 has NEW published copy in Calgary: content-day only, no recital-media/media-fee framing.

## Active Task
**Post-expo: improve the talks + decks from the real lapel-mic transcript.**
Primary source `/mnt/firmament/ExpoMic.txt`. Grounded read-out delivered
2026-08-05: `expo-assets/POSTMORTEM-2026-07-28-said-vs-planned.md`.
Boundaries: talk 1 = lines 1-415 (starts mid-sentence, open not captured),
booth/hallway/vox-pop = 419-2559, talk 2 = 2565-3087, expo closing = 3371+.
Direction chosen 2026-08-05: (1) freebies first, (2) rebuild T1 around the delivered talk,
(3) re-shape T2 from the delivered version. Ad-libs decided beat by beat.

### DONE this session
- `expo-assets/POSTMORTEM-2026-07-28-said-vs-planned.md` - grounded read-out (boundaries,
  said-vs-planned diff, audience markers, timing arithmetic, promise audit).
- **Freebie 1 (the one promised on stage and never built) - SHIPPED `44a70be`:**
  Daniel chose option A - fold into the EXISTING live link, no new URL. The questions now
  live as **"Part two - the interview questions"** in `public/checklist.html`
  (livestream renumbered to Part three, lede updated, stub Interviews section links to
  `#interviews`, "kid" -> "dancer"). Standalone `public/interview-questions.html` was built
  then DELETED - one surface only. Print handout
  `expo-assets/handout-interview-questions.html` QR repointed to
  `streamstage.live/checklist.html#interviews`.
  Verified: email gate still engages for new visitors, 0 JS errors, 4 parts in order.
- **Freebie 2:** `expo-assets/handout-videographer-brief.html` (print, 1-page PDF verified) -
  the `:347` Calgary sheet. No exact prices (talk-1 guardrail); money box is structural.
- `expo-assets/ADLIB-DECISIONS-2026-08-05.md` - 28 ad-libs ranked + items 29-31 (live-demo
  policy, T1 real slot length, which T1 deck is canonical). **Awaiting his picks.**
- `expo-assets/CRITIQUE-AND-PUNCHLIST-2026-08-05.md` - subjective critique of both talks
  (delivery metrics, what's wrong, what to protect), his own on-mic flags, and the master
  42-item punch list: 8 done / 34 open across promises, decisions, T1 deck, T2 deck, housekeeping.

### Deployed
`44a70be` pushed to main 2026-08-05. Vercel serves `streamstage.live/checklist.html`.

### Decisions taken 2026-08-05 (Daniel)
- **Facelift: KEEP** both plant and reveal. Needs a proper rehearsal, not a cut.
- **SMS demo: stays where it is** (slide 34). Wiring corrected, see below.
- **Pricing: free until Jan 1 2027 for anyone signing up now; $20/month for new
  signups from Sept 1.** Facelift hosting after year one is a separate $20/YEAR.
- **No per-dancer scoping slide.** Say parents can ask about classes. Item dropped.

### Demo wiring corrected — `5a14462`
The Toronto demo did NOT fail on stage. `pesupport@namecheap.com` hit the any-sender
ingest path at 15:27 on 2026-07-29 and consumed the one-email lock; the volunteer's
forward 403'd 38 min later. Root cause + fix: `~/projects/StudioSage/docs/plans/2026-08-03-demo-mode-v2.md`.
Fixed in the product 2026-08-03; the DECK was still pointing at the old rig. Now:
- ingest address `bot@studiosage.ai` -> **`calgary@ingest.studiosage.ai`** (any sender resolves)
- demo SMS **`+1 587-317-0721`** (Calgary 587); routing is by receiving number
- the `?rt=TOKEN` arming step is GONE (demo_route_state retired, route-all 410)
- pre-flight = 8 checks at `studiosage.ai/demo/operator`; seed restore =
  `POST /api/demo/reset {"seeds":true}` -> 15 entries

### STILL UNVERIFIED for Calgary (from the StudioSage plan's own open list)
1. **No real handset has ever texted `+1 587-317-0721`** — webhook tests only.
2. SES->S3->SNS latency unmeasured; needs one real email to calgary@ingest.studiosage.ai.
3. Number not prewarmed — a cold long code taking a 40-phone burst can trip Canadian
   carrier filtering.
4. `sms:` QR prefill untested on real iPhone AND Android.
5. Facelift end-to-end has not been rehearsed since Daniel decided to keep it.

Open items surfaced by the read-out:
- The interview-questions QR freebie promised on stage twice (`:13`, `:201`) DOES NOT EXIST
  (verified two ways). `public/checklist.html` lists 1 of the 5 prompts, no provoke technique.
- Stepping Up Dance Company (Sarnia) is still owed the rebuilt website (`:3043`, `:3443`).
- Both talk-2 live beats failed on stage (SMS demo `:2939-2983`, facelift reveal `:3011-3043`).
- Talk 1 ran ~58-66 min (est. from 8,630 words) against a ~20-min run-of-show.
- Three different talk1 decks exist with three different md5s; the one that shipped
  (`~/expo-backup/TRADESHOW-2026-07-29/talks/talk1-deck.html`, 14 slides) matches neither repo copy.

### Prior task (shipped)
**Expo decks (Dance Teacher Expo, Wed Jul 29 2026, 4:10-5:10 PM EDT).** Two talks:
Talk 2 "The AI Front Desk" (38 slides, owned by Daniel's session) and Talk 1 "The Content Day"
(14 slides, `StudioSage/live-demo/talk1-deck.html`).

## Overnight session 2026-07-26/27 - facelift live path + Talk 1
Plan + full deviation log: `docs/plans/2026-07-26-overnight-talk1-and-facelift.md`.
Phase 2 (Talk 2 note fixes) was pulled from this session's scope mid-run - Daniel executed it
in a parallel session. This session did NOT write to talk2-ai.html / talk2.html / talk2-ai-slides.md.

### Facelift live path - DONE, signed off
- **Root cause of the poll hang was Windows OpenSSH + python pipes**, not stdin/`-n`/the abandoned
  dispatch child. `ssh.exe` never closes the pipe write end, so CPython's Windows reader thread
  blocks forever. Measured, table in the plan file. Fix: `run_capture()` uses real temp file
  handles (0.08s vs 30s timeout) for dispatch, poll and scp. `a27b29f`
- **Second defect, hit for real:** the poller only started inside `start_facelift()`, so a server
  restart orphaned an in-flight build. `resume_facelift_poll()` re-attaches at boot. `d0a7bf6`
- Verified end to end from FIRMAMENT: stub in ~5s, and one real `grandriverdance.com` run
  (03:16 -> 03:40, 24 min) pulled back and served at `/facelift-site/index.html`.

### Talk 1 - DONE
Lives in the StudioSage repo; see `StudioSage/CURRENT_WORK.md` for detail. Summary: committed as a
safety net first, then wired to the phone remote (`/state` + `/cmd`, beats on all 14 slides), given
a facelift overlay on `L`, reel wall de-scrubbered and cut from 7 clicks to 2, four `[PHOTO: ...]`
placeholder plates replaced with real footage, five unusable posters regenerated.
Audit: 14 slides, 0 layout findings, 0 JS errors, both fonts loaded. Mirrored to FIRMAMENT, 12/12
md5 match.

## Blockers / NEEDS DANIEL
1. Talk 1 slide 13 carries `[confirm slot/time]` for the Talk 2 tease - his to fill.
2. Which machine presents (FIRMAMENT vs DART). DART still offline and unverified.
3. Talk 2 timing (~93 min of material in a 60 min slot) - his call, cut list in `talk2-runofshow.md`.
4. Rotate `DEMO_RESET_TOKEN` after the talk - it ships in a tracked file.

## Next Steps
- Daniel rehearses Talk 1 from the FIRMAMENT copy: `cd Desktop\StudioSage-Live-Demo`, run
  `presenter-server.py`, open `talk1-deck.html`, phone at `http://<laptop-ip>:8080/remote`.
- Keys: arrows/space nav, digits+Enter jump, `P` notes, `F` reveal all, **`L` facelift overlay**, Esc closes it.
- After ANY Talk 1 deck change: re-run the audit harness, then scp to FIRMAMENT and md5 both sides.

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
