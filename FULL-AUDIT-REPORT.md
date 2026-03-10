# StreamStage SEO Audit Report
**URL:** https://stream-stage-kappa.vercel.app (production: streamstage.live)
**Date:** 2026-03-09
**Overall Score: 72/100 (Good)**

---

## Score Breakdown

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Technical SEO | 75/100 | 25% | 18.8 |
| Content Quality | 70/100 | 20% | 14.0 |
| On-Page SEO | 82/100 | 15% | 12.3 |
| Schema / Structured Data | 85/100 | 15% | 12.8 |
| Performance (CWV) | 55/100 | 10% | 5.5 |
| Image Optimization | 60/100 | 10% | 6.0 |
| AI Search Readiness (GEO) | 50/100 | 5% | 2.5 |
| **Total** | | | **71.9** |

---

## Technical SEO (75/100)

### ✅ Pass
- **HTTPS**: Active with HSTS preload (`max-age=63072000; includeSubDomains; preload`)
- **Robots.txt**: Present, allows all crawlers, sitemap referenced
- **Sitemap**: XML sitemap at `/sitemap.xml` (references streamstage.live)
- **Canonical URL**: Set to `https://streamstage.live`
- **Meta robots**: `index, follow` — correct
- **Mobile viewport**: Present via Next.js defaults
- **No broken links**: 0 broken out of 4 external links checked
- **AI crawlers**: GPTBot, ClaudeBot, PerplexityBot, ChatGPT-User, Google-Extended all explicitly allowed

### ⚠️ Warnings
- **Security headers missing (5)**: No CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. Score: 45/100.
  - **Evidence**: Only HSTS present from security_headers.py scan
  - **Impact**: Marginal SEO impact but affects trust signals and Chrome security audits
  - **Fix**: Add headers in `next.config.ts` or `vercel.json`

- **Staging domain canonical mismatch**: Site served from `stream-stage-kappa.vercel.app` but canonical points to `streamstage.live`. This is correct for production but the staging domain should have `noindex`.
  - **Evidence**: `<link rel="canonical" href="https://streamstage.live">`
  - **Impact**: Could cause duplicate content if staging gets indexed
  - **Fix**: Add `X-Robots-Tag: noindex` header for non-production domains in Vercel config

- **5 AI crawlers not explicitly managed**: Applebot-Extended, Bytespider, CCBot, FacebookBot, Amazonbot
  - **Impact**: Low — these inherit `*` allow rules
  - **Fix**: Add explicit rules in robots.txt for completeness

---

## Content Quality (70/100)

### ✅ Pass
- **Word count**: 1,550 words — adequate for a service landing page
- **Unique H1**: Single `<h1>` — "Where Dance Meets Technology"
- **H2 structure**: 9 section headings, logical hierarchy
- **H3 sub-sections**: 23 sub-headings for services, products, FAQ, team
- **FAQ content**: 5 detailed Q&A pairs with rich answers

### ⚠️ Warnings
- **Readability score low**: Flesch Reading Ease 36.3 (Very Difficult / College level)
  - **Evidence**: 22% complex words, 12.8 grade level, avg sentence 18.7 words
  - **Impact**: May reduce engagement; Google favors accessible content
  - **Fix**: Simplify service descriptions, break long sentences. Target Flesch 50+.

- **H1 missing space**: Renders as "Where Dance MeetsTechnology" (missing space before "Technology")
  - **Evidence**: parse_html.py output: `"Where Dance MeetsTechnology"`
  - **Impact**: Affects heading readability for crawlers
  - **Fix**: Check JSX for missing whitespace in Hero.tsx `<span>` join

---

## On-Page SEO (82/100)

### ✅ Pass
- **Title tag**: "StreamStage — Where Dance Meets Technology" (44 chars) — good length, keyword-rich
- **Meta description**: "Canada's dance industry partner — 100+ events streamed, 500+ videos produced for 50+ studios..." (156 chars) — includes numbers, services, product names
- **Keywords in meta**: 13 relevant keywords including geographic (Canada, Ontario)
- **Internal anchor links**: All nav items smooth-scroll to sections
- **CTA prominent**: "Start Your Project" in nav, "View Portfolio" + "Explore Tools" in hero

### ⚠️ Warnings
- **No `<main>` landmark wrapping content**: Accessibility/SEO best practice
  - **Evidence**: Content is in `<main>` tag (confirmed in page.tsx) — ✅ actually present

- **Missing `lang` attribute specificity**: `lang="en"` but site targets Canada
  - **Fix**: Change to `lang="en-CA"` in layout.tsx for geo-relevance

---

## Schema / Structured Data (85/100)

### ✅ Pass
- **Organization + LocalBusiness**: Name, URL, email, logo, founding date, area served, social profiles
- **WebSite**: With publisher reference
- **WebPage**: With speakable specification
- **BreadcrumbList**: Home breadcrumb
- **Service schemas (2)**: Dance & Stage Media, Business Video — with offer catalogs
- **SoftwareApplication (3)**: CompSync (with free price), StudioSage, StudioBeat
- **FAQPage**: 5 questions with detailed answers

### 🔴 Critical
- **FAQPage schema should be removed**: As of August 2023, FAQPage rich results are restricted to government and healthcare authority sites only. Commercial sites no longer get FAQ rich results and Google may see this as trying to game structured data.
  - **Evidence**: FAQPage schema present in page.tsx JSON-LD `@graph`
  - **Impact**: No benefit, potential negative signal
  - **Fix**: Remove FAQPage from JSON-LD. Keep the FAQ section in HTML — it's still good for content/UX, just remove the schema markup.

### ⚠️ Warnings
- **StudioBeat description still references "StudioSync"** in one FAQ answer
  - **Evidence**: FAQ Q5 answer mentions "StudioSync" — `"CompSync for competition management... StudioSync for studio management"`
  - **Fix**: Update FAQ answer in page.tsx JSON-LD

---

## Performance (55/100)

### ⚠️ Warnings (estimated — PageSpeed API rate-limited)
- **Background video auto-play**: `hero-bg.mp4` loads on every page view. No `preload="none"` attribute.
  - **Impact**: Significant LCP and bandwidth impact on mobile
  - **Fix**: Add `preload="none"` or `preload="metadata"` to background video

- **47 client logo images**: All loaded in marquee, many duplicated 4x by marquee repeat
  - **Impact**: ~188 image requests on page load (47 × 4 repeats)
  - **Fix**: Add `loading="lazy"` (already present) but consider reducing marquee `repeat` from 4 to 2

- **No explicit width/height on logo `<img>` tags**: Causes CLS (Cumulative Layout Shift)
  - **Evidence**: parse_html.py shows `width: null, height: null` for all logo images
  - **Fix**: Add `width` and `height` attributes to prevent layout shift

---

## Image Optimization (60/100)

### ✅ Pass
- **Logo images have alt text**: All 47+ client logos have descriptive `alt` attributes
- **Navbar/Footer logos have alt**: "StreamStage.live"
- **Lazy loading**: Client logos use `loading="lazy"`

### ⚠️ Warnings
- **Team headshots served unoptimized**: `team-daniel.jpg` (1.1MB) and `team-kayla.jpg` (588KB) served via Next.js Image but original files are large
  - **Fix**: Pre-optimize source images or ensure Next.js Image is compressing adequately

- **No explicit dimensions on marquee logos**: Missing `width`/`height` attributes
  - **Impact**: CLS on load
  - **Fix**: Add `width={130} height={48}` to logo `<img>` tags

---

## AI Search Readiness / GEO (50/100)

### 🔴 Critical
- **No llms.txt file**: AI search engines (Perplexity, ChatGPT search, Claude) cannot easily parse site structure
  - **Evidence**: 404 on `/llms.txt`
  - **Fix**: Create `public/llms.txt` with site description, key services, product info, and contact

### ✅ Pass
- **AI crawlers allowed**: GPTBot, ClaudeBot, PerplexityBot all explicitly allowed in robots.txt
- **Rich structured data**: Extensive JSON-LD helps AI engines understand offerings
- **Clear content hierarchy**: H1 → H2 → H3 structure aids extraction

---

## Environment Limitations
- **PageSpeed Insights**: Rate-limited during audit. CWV scores are estimated based on page composition analysis rather than measured.
- **Playwright visual analysis**: Not run in this pass.
