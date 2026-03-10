# SEO Action Plan — StreamStage

**Date:** 2026-03-09
**Current Score: 79/100 (Good)**
**Target Score: 85+/100**

---

## Quick Wins (High Impact, Low Effort)

### 1. Add links to llms.txt
**Impact:** AI search discoverability | **Effort:** 5 min | **Priority:** P1

Add key page/section links to `public/llms.txt`:
```
## Links
- [Dance & Stage Media](https://streamstage.live/#dance-media): Multi-camera livestreaming, videography, and promotional content for dance events
- [Dance Software](https://streamstage.live/#software): CompSync, StudioSage, and StudioBeat
- [CompSync](https://compsync.net): Free dance competition management software
- [Business Video](https://streamstage.live/#business-video): Professional video production for businesses
- [Contact](https://streamstage.live/#contact): Get in touch with StreamStage
```

### 2. Add twitter:site meta tag
**Impact:** Social attribution | **Effort:** 2 min | **Priority:** P3

If StreamStage has an X/Twitter handle, add to the metadata in `layout.tsx`:
```tsx
twitter: {
  site: '@streamstage',
  creator: '@streamstage',
}
```

---

## Strategic (High Impact, Higher Effort)

### 3. Add Content-Security-Policy header
**Impact:** Security trust signal | **Effort:** 30 min | **Priority:** P2

Add CSP to `next.config.ts` security headers. Start with report-only mode:
```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:;
```

Note: CSP can break functionality if too restrictive. Test thoroughly before enforcing.

### 4. Improve content readability
**Impact:** User engagement, dwell time | **Effort:** 1-2 hours | **Priority:** P3

Current Flesch score: 38.3 (Very Difficult). Target: 50+ (Fairly Difficult).
- Shorten sentences over 20 words
- Replace multi-syllable words where simpler alternatives exist
- Break up long descriptive paragraphs
- Low priority — service sites naturally have technical vocabulary

### 5. Run Core Web Vitals audit
**Impact:** Performance ranking signal | **Effort:** 15 min | **Priority:** P2

PageSpeed API was rate-limited. Re-run later:
```bash
python3 ~/.claude/skills/seo/scripts/pagespeed.py https://stream-stage-kappa.vercel.app/ --strategy mobile
```
Or use Chrome DevTools > Lighthouse > Performance.

### 6. Create llms-full.txt
**Impact:** Extended AI search optimization | **Effort:** 20 min | **Priority:** P3

Create `public/llms-full.txt` with comprehensive service descriptions, pricing info, and detailed FAQ answers for AI engines.

---

## Maintenance (Lower Priority)

### 7. Verify sitemap after domain migration
**Effort:** 5 min | **Priority:** When domain is pointed to Vercel

robots.txt references `https://streamstage.live/sitemap.xml`. Ensure this resolves after DNS migration.

### 8. Add PriceSpecification to software schemas
**Effort:** 10 min | **Priority:** P4

StudioSage and StudioBeat SoftwareApplication schemas lack pricing info. Add `offers` with pricing when pricing is finalized.

---

## Completed (No Action Needed)

- [x] Title tag optimized (46 chars)
- [x] Meta description optimized (156 chars)
- [x] Canonical URL set
- [x] robots.txt with AI crawler management (11 bots)
- [x] JSON-LD structured data (7 types)
- [x] Open Graph tags (7/7)
- [x] Twitter Card tags (4/6)
- [x] Image alt text on all images
- [x] Lazy loading on below-fold images
- [x] HSTS with preload
- [x] Security headers (5/6)
- [x] llms.txt present
- [x] FAQ section (no restricted FAQPage schema)
- [x] Proper heading hierarchy
- [x] lang="en-CA" set
- [x] Googlebot max preview directives
