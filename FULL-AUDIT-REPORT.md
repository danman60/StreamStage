# SEO Audit Report — StreamStage

**URL:** https://stream-stage-kappa.vercel.app/ (canonical: https://streamstage.live)
**Scope:** Single-page full audit
**Date:** 2026-03-09
**Overall Score: 79/100 (Good)**

## Top 3 Issues
1. No Content-Security-Policy (CSP) header — security gap
2. Readability score 38.3 (Very Difficult) — may reduce engagement for casual visitors
3. llms.txt has no outbound links — reduces AI search engine utility

## Top 3 Opportunities
1. Add CSP header for security hardening (+2-3 pts)
2. Add links to llms.txt for better AI search discoverability
3. Add `twitter:site` / `twitter:creator` for social attribution

---

## Findings Table

| # | Area | Finding | Severity | Confidence | Evidence |
|---|------|---------|----------|------------|----------|
| 1 | Technical | Title tag well-optimized (46 chars) | Pass | Confirmed | `StreamStage — Where Dance Meets Technology` |
| 2 | Technical | Meta description excellent (156 chars, keyword-rich) | Pass | Confirmed | Includes target keywords: dance, livestreaming, videography, CompSync, StudioSage, StudioBeat |
| 3 | Technical | Canonical URL set correctly | Pass | Confirmed | `https://streamstage.live` |
| 4 | Technical | robots meta `index, follow` with Googlebot directives | Pass | Confirmed | `max-video-preview:-1, max-image-preview:large, max-snippet:-1` |
| 5 | Technical | robots.txt allows all major crawlers + 11 AI crawlers | Pass | Confirmed | GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot all explicitly allowed |
| 6 | Technical | No redirect chains | Pass | Confirmed | Direct 200 response, 0 hops |
| 7 | Technical | No broken links detected | Pass | Confirmed | 4 links checked, 0 broken |
| 8 | Technical | HTTPS with HSTS preload | Pass | Confirmed | `max-age=63072000; includeSubDomains; preload` |
| 9 | Technical | Missing Content-Security-Policy header | Warning | Confirmed | Only missing security header (5/6 present, score 85/100) |
| 10 | On-Page | Single H1 tag, properly structured | Pass | Confirmed | `Where Dance Meets Technology` |
| 11 | On-Page | Good heading hierarchy (H1 > H2 > H3) | Pass | Confirmed | 1 H1, 9 H2s, 22 H3s — logical nesting |
| 12 | On-Page | Duplicate H3 "Reels & Highlights" | Info | Confirmed | Appears in both Dance Media and Business Video sections |
| 13 | On-Page | Meta keywords present | Pass | Confirmed | 14 relevant keywords targeting dance industry |
| 14 | On-Page | `lang="en-CA"` properly set | Pass | Confirmed | Matches target market (Canada) |
| 15 | Content | Word count: 1,507 | Pass | Confirmed | Adequate for a single-page service site |
| 16 | Content | Readability: Flesch 38.3 (Very Difficult) | Warning | Confirmed | 21.6% complex words, avg sentence length 17.5 |
| 17 | Content | FAQ section with 5 questions | Pass | Confirmed | No FAQPage schema (correctly omitted per Aug 2023 restriction) |
| 18 | Schema | Organization + LocalBusiness schema | Pass | Confirmed | Name, URL, email, logo, foundingDate, areaServed, sameAs |
| 19 | Schema | WebSite schema present | Pass | Confirmed | `@type: WebSite` with name and URL |
| 20 | Schema | WebPage schema with dates | Pass | Confirmed | datePublished: 2024-01-01, dateModified: 2026-03-10 |
| 21 | Schema | BreadcrumbList schema | Pass | Confirmed | Home breadcrumb present |
| 22 | Schema | Service schemas (2) | Pass | Confirmed | Dance & Stage Media + Business Video with sub-services |
| 23 | Schema | SoftwareApplication schemas (3) | Pass | Confirmed | CompSync, StudioSage, StudioBeat — proper category, OS, descriptions |
| 24 | Schema | No deprecated/restricted schema types | Pass | Confirmed | No FAQPage, no HowTo |
| 25 | Images | All images have alt text | Pass | Confirmed | Logo, team headshots, client logos — all labeled |
| 26 | Images | Lazy loading on below-fold images | Pass | Confirmed | Client logos use `loading="lazy"` |
| 27 | Images | Next.js Image optimization | Pass | Confirmed | Using `/_next/image` with width/quality params |
| 28 | Social | Open Graph fully implemented (7/7) | Pass | Confirmed | title, description, image, url, type, site_name, locale |
| 29 | Social | Twitter Card implemented (4/6) | Pass | Confirmed | card, title, description, image present |
| 30 | Social | Missing twitter:site and twitter:creator | Info | Confirmed | Optional fields — no Twitter/X handle specified |
| 31 | GEO | llms.txt present with 6 sections | Pass | Confirmed | Score 70/100 |
| 32 | GEO | llms.txt has no links | Warning | Confirmed | AI search engines can't discover sub-pages |
| 33 | GEO | No llms-full.txt | Info | Confirmed | Extended version not provided |
| 34 | Performance | CWV data unavailable | Hypothesis | N/A | PageSpeed API rate-limited during audit |
| 35 | Technical | Single-page site limits internal linking | Info | Confirmed | Only anchor links (#dance-media, #software, etc.) |

---

## Category Scores

| Category | Weight | Score | Notes |
|----------|--------|-------|-------|
| Technical SEO | 25% | 88/100 | Only missing CSP header; everything else excellent |
| Content Quality | 20% | 70/100 | Good copy but readability is low; FAQ present |
| On-Page SEO | 15% | 90/100 | Strong title, meta, headings, keywords, lang |
| Schema / Structured Data | 15% | 95/100 | Comprehensive — 7 schema types, all valid |
| Performance (CWV) | 10% | N/A | Rate-limited; score confidence: Low |
| Image Optimization | 10% | 90/100 | Alt text, lazy loading, Next.js optimization |
| AI Search Readiness (GEO) | 5% | 75/100 | llms.txt present, all AI crawlers allowed, no links in llms.txt |

**Weighted Score (excluding CWV): 79/100 — Good**

*Score confidence: Medium (CWV data unavailable)*

---

## Detailed Analysis

### Technical SEO (88/100)

Excellent technical fundamentals. HTTPS with HSTS preload, proper robots.txt with explicit AI crawler allowances, clean canonical URL, and strong security headers (5/6). The only gap is the missing Content-Security-Policy header, which doesn't directly impact SEO rankings but is a security best practice that search engines increasingly factor into trust signals.

The sitemap reference in robots.txt points to `https://streamstage.live/sitemap.xml` — ensure this resolves correctly once the domain is pointed to Vercel.

### Content Quality (70/100)

At 1,507 words, the page has adequate content for a single-page service site. The copy effectively communicates StreamStage's value proposition — dance industry focus, proven track record (100+ events, 500+ videos, 50+ studios), and software products.

The Flesch readability score of 38.3 is classified as "Very Difficult" with 21.6% complex words. While this is partly inflated by technical/product terminology (CompSync, StudioSage, livestreaming), simpler sentence structures could improve engagement.

The FAQ section with 5 questions targets common search queries well and correctly avoids FAQPage schema (restricted since Aug 2023).

### On-Page SEO (90/100)

Excellent on-page optimization:
- Title tag (46 chars) includes brand + tagline
- Meta description (156 chars) is keyword-rich and compelling
- Single H1 with clear hierarchy down to H3
- Meta keywords target 14 relevant terms
- `lang="en-CA"` matches Canadian market
- Googlebot directives maximize content previews

### Schema / Structured Data (95/100)

Outstanding structured data implementation with 7 JSON-LD types:
- Organization + LocalBusiness (dual-type)
- WebSite, WebPage with dates
- BreadcrumbList
- 2 Service schemas with sub-services
- 3 SoftwareApplication schemas

All use JSON-LD format, no deprecated types, no placeholders.

### Image Optimization (90/100)

All images have descriptive alt text. Below-fold images use lazy loading. Next.js image optimization handles responsive sizing and quality. Team headshots are well-optimized (70-77KB).

### AI Search Readiness (75/100)

Strong foundation: llms.txt exists with 6 sections, and all 11 AI crawlers are explicitly allowed in robots.txt. The gap is that llms.txt contains no outbound links, limiting AI engines' ability to discover and index specific services/pages.

---

## Environment Limitations

- **Core Web Vitals:** PageSpeed Insights API was rate-limited. CWV metrics (LCP, INP, CLS) could not be measured. Recommend re-running later or using Chrome DevTools Lighthouse.
