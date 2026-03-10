# StreamStage SEO Action Plan
**Generated:** 2026-03-09 | **Overall Score:** 72/100

---

## Priority 1 — Critical (Do Now)

### 1. Remove FAQPage schema markup
- **File**: `src/app/page.tsx` lines 89-133
- **Action**: Delete the entire `FAQPage` object from the JSON-LD `@graph` array
- **Why**: FAQPage rich results restricted to gov/healthcare since Aug 2023. Keep FAQ HTML section, just remove schema.
- **Effort**: 5 min

### 2. Create `/llms.txt` for AI search engines
- **File**: Create `public/llms.txt`
- **Action**: Add structured text with site name, description, services, products, contact
- **Why**: Perplexity, ChatGPT Search, Claude use this to understand your site
- **Effort**: 10 min

### 3. Fix StudioSync → StudioBeat in FAQ schema answer
- **File**: `src/app/page.tsx` — FAQ Q5 answer
- **Action**: Replace "StudioSync" with "StudioBeat" in the last FAQ answer text
- **Why**: Inconsistent product naming confuses search engines
- **Effort**: 2 min

---

## Priority 2 — High Impact (This Week)

### 4. Add security headers
- **File**: Create/update `vercel.json` or `next.config.ts`
- **Headers to add**:
  ```
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  ```
- **Why**: Security score 45/100 → should be 90+
- **Effort**: 15 min

### 5. Add width/height to client logo `<img>` tags
- **File**: `src/components/Clients.tsx`
- **Action**: Add `width={130} height={48}` to each `<img>`
- **Why**: Prevents CLS (Cumulative Layout Shift) — Core Web Vitals metric
- **Effort**: 2 min

### 6. Change `lang="en"` to `lang="en-CA"`
- **File**: `src/app/layout.tsx` line 90
- **Action**: `<html lang="en-CA">`
- **Why**: Geographic signal for Canadian-targeted content
- **Effort**: 1 min

### 7. Optimize background video loading
- **File**: `src/app/layout.tsx` line 95-103
- **Action**: Add `preload="metadata"` to the background video (already has `poster`)
- **Why**: Reduces initial page load bandwidth, improves LCP on mobile
- **Effort**: 1 min

---

## Priority 3 — Medium Impact (This Month)

### 8. Simplify content readability
- **Current**: Flesch Reading Ease 36.3 (college level)
- **Target**: 50+ (high school level)
- **Action**: Shorten sentences in service descriptions, reduce jargon
- **Files**: `DanceMedia.tsx`, `BusinessVideo.tsx`, `Software.tsx`, `About.tsx`
- **Effort**: 30 min

### 9. Add noindex for staging domain
- **File**: `vercel.json` or middleware
- **Action**: Add `X-Robots-Tag: noindex` header when domain is not `streamstage.live`
- **Why**: Prevents duplicate content indexing from staging
- **Effort**: 15 min

### 10. Reduce marquee repeat count
- **File**: `src/components/Clients.tsx` or `marquee.tsx`
- **Action**: Change `repeat` from 4 to 2 — still creates infinite scroll but halves image requests
- **Why**: ~188 → ~94 image requests per page load
- **Effort**: 2 min

---

## Priority 4 — Low Impact / Nice-to-Have

### 11. Explicitly manage remaining AI crawlers in robots.txt
- **Add rules for**: Applebot-Extended, Bytespider, CCBot, FacebookBot, Amazonbot
- **Effort**: 5 min

### 12. Pre-optimize team headshot source images
- **Action**: Run through sharp to reduce `team-daniel.jpg` (1.1MB) and `team-kayla.jpg` (588KB)
- **Effort**: 5 min

---

## Already Implemented ✅
- [x] Single H1 per page
- [x] Proper heading hierarchy (H1 → H2 → H3)
- [x] All images have alt text
- [x] Open Graph tags complete (7/7)
- [x] Twitter Card tags present (4/4 required)
- [x] Canonical URL set correctly
- [x] XML sitemap exists
- [x] Robots.txt with AI crawler management
- [x] JSON-LD Organization, WebSite, Service, SoftwareApplication schemas
- [x] Meta description with numbers and keywords
- [x] HTTPS with HSTS preload
- [x] No broken links
- [x] Lazy loading on client logos
