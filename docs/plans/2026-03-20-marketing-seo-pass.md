# StreamStage Marketing & SEO Pass — Full Checklist

Created: 2026-03-20
Status: Planning

---

## Technical SEO

- [ ] Add GA4 tracking (need measurement ID from Daniel)
- [ ] Create `/privacy-policy` page (required for Google compliance + footer link)
- [ ] Add structured data / schema markup to `/dance`, `/dancerecital`, `/dancepromo` (Service, Offer, LocalBusiness schemas)
- [ ] Audit all page metadata (title, description, OG image) — especially new pages
- [ ] Core Web Vitals check (LCP, CLS, INP) on all pages
- [ ] Verify robots.txt allows all AI crawlers (already done per memory)
- [ ] Verify `/llms.txt` is up to date with new pages
- [ ] Submit updated sitemap to Google Search Console after DNS cutover
- [ ] Check `hreflang` setup (en-CA set, consider en-US if targeting American studios)
- [ ] Verify canonical URLs on all pages
- [ ] Check mobile rendering on all new pages

## SEO Content & Keywords

- [ ] Keyword gap analysis: blog posts vs landing page target keywords
- [ ] Target keywords for `/dance`: "dance media services", "dance studio video production", "dance videography Ontario"
- [ ] Target keywords for `/dancerecital`: "dance recital video", "recital livestream", "recital media services", "recital videography pricing"
- [ ] Target keywords for `/dancepromo`: "dance studio promo video", "dance studio social media content", "studio promotional video"
- [ ] Write 2-3 blog posts targeting recital/promo long-tail keywords (internal linking to landing pages)
- [ ] Add internal links from existing blog posts to `/dance`, `/dancerecital`, `/dancepromo`
- [ ] AI SEO / AEO optimization — ensure content is structured for AI search engines (Perplexity, ChatGPT, etc.)

## Schema Markup (detailed)

- [ ] `/dance` — Service schema (Dance Media Services) with hasOfferCatalog
- [ ] `/dancerecital` — Service + Offer schema with per-dancer pricing, AggregateOffer
- [ ] `/dancepromo` — Service + Offer schema with production pricing
- [ ] Add Review schema using Kiri and Lainy testimonials
- [ ] Verify existing homepage schema is still accurate

## Conversion Rate Optimization (CRO)

- [ ] `/dance` — CRO pass: above-the-fold hierarchy, CTA placement, mobile scroll depth
- [ ] `/dancerecital` — CRO pass: form friction, trust signals, urgency elements
- [ ] `/dancepromo` — CRO pass: pricing clarity, volume discount visibility, form simplicity
- [ ] Homepage — verify dance section CTA ("Explore Our Dance Services") is prominent enough
- [ ] Add social proof to `/dancepromo` (only has 1 testimonial, no stats)
- [ ] Consider exit-intent or scroll-triggered CTA on landing pages
- [ ] Mobile-specific CRO (tap targets, thumb zones, sticky CTA)

## Copywriting

- [ ] Review all page copy for persuasiveness, clarity, and keyword integration
- [ ] `/dance` hero — test headline variants
- [ ] `/dancerecital` — review trust badges and urgency copy
- [ ] `/dancepromo` — review deliverable descriptions for clarity
- [ ] CTA button text optimization across all pages

## Content Strategy

- [ ] Blog content calendar targeting dance studio owners
- [ ] Topics: "How to choose a recital videographer", "Why livestream your recital", "Dance studio social media strategy", "Recital media fee pricing guide"
- [ ] Repurpose blog content for social media (Instagram, Facebook)
- [ ] Consider lead magnet: "Recital Media Planning Checklist" or "Studio Promo Video Guide"

## Analytics & Tracking

- [ ] GA4 setup with conversion events (proposal submissions)
- [ ] Track CTA clicks on `/dance` page (which path: recital vs promo)
- [ ] UTM parameter strategy for cold email campaigns
- [ ] Set up goal funnels: `/dance` → `/dancerecital` or `/dancepromo` → submission

## Cold Outreach Prep

- [ ] Finalize email template with `/dance` link
- [ ] UTM-tagged URLs for email campaigns
- [ ] Landing page A/B test plan (headline, CTA, pricing visibility)
- [ ] Follow-up sequence after proposal submission

## Site Architecture

- [ ] Verify all internal linking is tight (homepage → /dance → builders)
- [ ] Breadcrumbs on sub-pages (for SEO and navigation)
- [ ] Footer nav update — add /dance and builder links?
- [ ] 404 page — create a custom one with navigation back to key pages

---

## Skills to Use

These Claude Code marketing skills should be applied during execution:

1. **`/seo-audit`** or **`/seo`** — Full technical SEO audit on the deployed site
2. **`/page-cro`** — Conversion optimization on `/dance`, `/dancerecital`, `/dancepromo`
3. **`/copywriting`** — Review and sharpen all page copy
4. **`/content-strategy`** — Blog content calendar for dance studio audience
5. **`/schema-markup`** — Implement structured data on all pages
6. **`/analytics-tracking`** — GA4 setup and conversion tracking
7. **`/cold-email`** — Cold email templates for recital outreach
8. **`/lead-magnets`** — Evaluate lead magnet opportunities
9. **`/signup-flow-cro`** — Optimize the proposal submission flow
10. **`/ai-seo`** — Optimize for AI search engines (AEO/GEO)
11. **`/site-architecture`** — Verify page hierarchy and internal linking
12. **`/marketing-ideas`** — Brainstorm additional growth channels
13. **`/social-content`** — Social media content strategy for the outreach campaign
14. **`/ab-test-setup`** — Plan A/B tests for landing page optimization
15. **`/copy-editing`** — Polish all existing copy
16. **`/form-cro`** — Optimize proposal builder forms for completion rate
17. **`/marketing-psychology`** — Apply behavioral principles to pricing display and CTAs
18. **`/pricing-strategy`** — Validate per-dancer pricing model and promo package pricing

## Priority Order

1. GA4 + privacy policy (blockers for cutover)
2. Schema markup (quick SEO win)
3. `/seo` full audit on deployed site
4. `/page-cro` on `/dance` (cold outreach landing page)
5. `/cold-email` templates
6. Blog keyword gap + internal linking
7. Everything else
