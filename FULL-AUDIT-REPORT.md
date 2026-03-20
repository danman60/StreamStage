# StreamStage SEO Audit Report

**Scope:** Full-site audit (new Next.js site on Vercel, pre-DNS cutover)
**Date:** 2026-03-20
**Pages audited:** Homepage, /dance, /dancerecital, /dancepromo, /blog, sitemap.xml, robots.txt, llms.txt
**Overall Score: 62/100**

---

## Category Scores

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Technical SEO | 25% | 72/100 | 18.0 |
| Content Quality | 20% | 65/100 | 13.0 |
| On-Page SEO | 15% | 45/100 | 6.8 |
| Schema / Structured Data | 15% | 40/100 | 6.0 |
| Performance (CWV) | 10% | 70/100 | 7.0 |
| Images | 10% | 75/100 | 7.5 |
| AI Search Readiness | 5% | 70/100 | 3.5 |
| **Total** | **100%** | | **61.8 → 62** |

---

## Critical Findings

### 1. `/dancerecital` and `/dancepromo` have NO metadata [Critical]
**Confidence:** Confirmed
**Evidence:** Both pages are `"use client"` components with no exported `metadata` object. No `<title>`, `<meta description>`, canonical URL, or Open Graph tags.
**Impact:** Google auto-generates titles from content (unpredictable). No description in SERPs. No social preview. Zero SEO for conversion-critical pages.
**Fix:** Create a `layout.tsx` in each directory with metadata export (client components can't export metadata directly).

### 2. `/dance`, `/dancerecital`, `/dancepromo` have no schema markup [Critical]
**Confidence:** Confirmed
**Evidence:** No `<script type="application/ld+json">` on any of the new pages. Homepage has extensive schema but the cold outreach funnel pages have none.
**Impact:** No rich results for dance media services. Missed Service + Offer + Review schema opportunities.
**Fix:** Add JSON-LD with Service, AggregateOffer (recital pricing tiers), Offer (promo pricing), Review (testimonials).

### 3. `llms.txt` outdated — missing new pages [Warning]
**Confidence:** Confirmed
**Evidence:** Links only to homepage sections. Doesn't mention `/dance`, `/dancerecital`, `/dancepromo`, or `/blog`.
**Impact:** AI search engines won't discover or cite the new conversion pages.
**Fix:** Update with all new page links.

### 4. No analytics tracking [Warning]
**Confidence:** Confirmed
**Evidence:** No GA4 or any analytics in `layout.tsx`.
**Impact:** Cannot measure cold outreach funnel conversions.
**Fix:** Add GA4 (awaiting measurement ID from client).

---

## Warning Findings

### 5. No `/privacy-policy` page [Warning]
**Confidence:** Confirmed
**Evidence:** No route exists. Old site had one. Current redirect sends to `/`.
**Impact:** Required for ads, analytics compliance, trust.
**Fix:** Create basic privacy policy page.

### 6. No custom 404 page [Warning]
**Confidence:** Likely
**Evidence:** No `not-found.tsx` in app directory.
**Impact:** Users hitting dead old-site links see generic Next.js error.
**Fix:** Create branded 404 with navigation to key pages.

### 7. Internal linking gaps [Warning]
**Confidence:** Confirmed
**Evidence:** Blog posts don't link to `/dance` or proposal builders. Footer hash links don't work from sub-pages. No breadcrumbs.
**Impact:** Lost link equity to conversion pages.
**Fix:** Add contextual links in blog posts. Update footer.

### 8. Security headers partially missing [Warning]
**Confidence:** Confirmed (Vercel deployment)
**Evidence:** CSP, Referrer-Policy, Permissions-Policy, X-Content-Type-Options configured in next.config.ts but not appearing in Vercel response headers. Only HSTS + X-Frame-Options present.
**Impact:** Lower security posture. Not a direct ranking factor but affects trust.
**Fix:** Investigate Vercel header application. May need `vercel.json`.

---

## Pass Findings

| Check | Status |
|-------|--------|
| robots.txt | Pass — all crawlers + AI bots explicitly allowed |
| Homepage metadata | Pass — title, description, OG, Twitter, canonical |
| Homepage schema | Pass — Organization, Service, Software, BreadcrumbList |
| `/dance` metadata | Pass — title, description, canonical, OG |
| Blog metadata | Pass — index + individual posts |
| Image optimization | Pass — headshots 70-77KB, video posters auto-generated |
| Hero video | Pass — 7.7MB H.264, preload=metadata, poster set |
| Sitemap | Pass — all pages included with proper priorities |
| Redirects | Pass — 35+ old URLs redirected for DNS cutover |
| SSL | Pass — Vercel auto-provisions |
| Mobile rendering | Pass — responsive Tailwind, mobile-first approach |

---

## Performance (CWV) — Deferred

PageSpeed API rate limited. Vercel preview behind SSO. Full CWV measurement after DNS cutover.

**Code analysis estimate:**
- **LCP:** Likely good. Static pages, optimized video (preload=metadata), no render-blocking resources.
- **CLS:** Likely good. Fixed dimensions on images/video, no layout shifts from async content.
- **INP:** Possible concern on `/dancerecital` and `/dancepromo` — interactive state updates on every click/input. Should be fine with React 19's automatic batching.
