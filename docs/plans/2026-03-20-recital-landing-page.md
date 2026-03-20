# Recital Landing Page + Cold Outreach Funnel

## Context
- Cold outreach campaign targeting dance studios for May/June 2026 recital season
- Studios are time-pressured — they want to see work, see pricing, and book fast
- Current state: only a proposal builder page exists at `/recital-media` (old Squarespace site)
- New StreamStage site needs a dedicated recital funnel

## Funnel Flow
```
Cold Email -> /recitals (sell page) -> /recitals/proposal (builder) -> Follow-up within 1 biz day
```

**Email links directly to `/recitals`** — NOT the main page. Main page has business video, software, etc. that dilutes the message for a dance studio owner.

## Page 1: `/recitals` — The Sell Page (NEW)

Lean, fast-loading, speaks directly to studio owners. NOT a long-scroll marketing epic — just enough to impress and inform.

### Sections (in order):
1. **Hero** — Full-width autoplay recital highlight clip + headline (e.g., "Your Dancers Deserve Better Than a Tripod in the Back Row" or "Professional Recital Media, Stress-Free")
2. **What You Get** — 3-4 visual bullet points: multi-cam video, livestream for remote family, same-week turnaround, pro photography. Show don't tell — use stills/clips from actual recitals.
3. **"You Keep All The Revenue"** — Big callout. This is the #1 differentiator. Studios charge parents a media fee and keep 100% of it. StreamStage charges per-dancer, studio marks it up. This needs to be unmissable.
4. **Social Proof** — Kiri Lyn Muir (UDC Director) + Lainy Zimmer (Footprints Dance Centre Owner) testimonials. Both are strong — real names, real titles, specific praise.
5. **Transparent Pricing Grid** — Show the 3 tiers (Small/Medium/Large) with per-dancer rates right here. No hiding. Studios in a rush want to see numbers immediately. Include the "All 3 for $X/dancer" bundle deal.
6. **CTA: "Build Your Custom Proposal"** — Links to `/recitals/proposal`. Secondary CTA: "Have questions? Book a 15-min call" (Calendly or similar).

### Design Notes:
- Match the main StreamStage site aesthetic (dark theme, cyan accents)
- Use existing recital videos from DanceMedia carousel as background/hero content
- Mobile-first — studio owners will open the email on their phone

## Page 2: `/recitals/proposal` — The Builder (MIGRATED from old site)

Migrate the existing Squarespace `/recital-media` page into the new Next.js site. Keep the interactive pricing calculator — it's solid.

### Fixes needed:
- [ ] Early bird discount says "before January 1, 2025" — update or remove
- [ ] Embedded video iframes throw security errors — replace with R2-hosted videos
- [ ] Privacy policy link points to Squarespace — update to streamstage.live
- [ ] Style to match new site design system
- [ ] Form submission — wire up to email notification (Supabase edge function or API route)

## Pricing Strategy Decision
**Show pricing on the sell page.** Rationale:
- Time-pressured studios (booking 2 months out) want transparency
- Per-dancer pricing is simple and competitive — no reason to hide it
- Seeing the price after seeing the work = perceived value is high
- The proposal builder is the ACTION step, not the INFORMATION step
- Studios that want to talk first can use the secondary "Book a Call" CTA

## Content Assets Available
- Recital highlight videos: already in R2 (UDC, JJ Dance Arts, Generations, Shuffle, Revolutions, Lindsay, Caledonia)
- Testimonials: Kiri Lyn Muir (UDC), Lainy Zimmer (Footprints)
- Pricing model: per-dancer, 3 tiers, stackable discounts (early bird, testimonial, loyalty)

## Status
- [ ] Plan approved
- [ ] `/recitals` sell page built
- [ ] `/recitals/proposal` builder migrated
- [ ] Cold email template drafted
- [ ] Tested end-to-end on mobile
