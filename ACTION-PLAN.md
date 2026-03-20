# SEO Action Plan — StreamStage

**Date:** 2026-03-20
**Current Score: 62/100**
**Target Score: 85+/100**

---

## Critical — Fix Before Cutover

### 1. Add metadata to `/dancerecital` and `/dancepromo`
**Impact:** High | **Effort:** Low (15 min)
Create `layout.tsx` files with metadata exports in each directory.

### 2. Add schema markup to `/dance`, `/dancerecital`, `/dancepromo`
**Impact:** High | **Effort:** Medium (30 min)
Service + AggregateOffer + Review JSON-LD on each page.

### 3. Update `llms.txt` with new pages
**Impact:** Medium | **Effort:** Low (5 min)
Add /dance, /dancerecital, /dancepromo, /blog links.

### 4. Create `/privacy-policy` page
**Impact:** Medium | **Effort:** Low (15 min)
Basic privacy policy. Link from footer.

### 5. Create custom 404 page
**Impact:** Medium | **Effort:** Low (10 min)
Branded not-found.tsx with links to homepage, /dance, /blog.

---

## High — Fix Within First Week

### 6. Add GA4 tracking
**Impact:** High | **Effort:** Low (10 min)
Awaiting measurement ID. Add to layout.tsx with conversion events for proposal submissions.

### 7. Fix internal linking: blog → conversion pages
**Impact:** High | **Effort:** Medium (30 min)
Add contextual links from relevant blog posts to /dance, /dancerecital, /dancepromo.

### 8. Update footer for sub-page navigation
**Impact:** Medium | **Effort:** Low (15 min)
Add /dance and /blog as proper links. Fix hash links to use `/#section` format.

### 9. Investigate Vercel security headers
**Impact:** Low | **Effort:** Medium (20 min)
Verify CSP, Referrer-Policy, Permissions-Policy, X-Content-Type-Options are being served. May need vercel.json.

---

## Medium — Within First Month

### 10. Write targeted blog posts
**Impact:** High | **Effort:** High (2-3 hours per post)
Topics: "How to Choose a Recital Videographer", "Why Livestream Your Recital", "Dance Studio Promo Video Guide"
Internal links to /dancerecital and /dancepromo.

### 11. Core Web Vitals audit (post-cutover)
**Impact:** Medium | **Effort:** Low (15 min)
Run PageSpeed Insights on all pages after DNS cutover. Fix any issues.

### 12. Add breadcrumbs to sub-pages
**Impact:** Low | **Effort:** Low (15 min)
Breadcrumb schema + visual breadcrumbs on /dance, /dancerecital, /dancepromo.

---

## Estimated Score Impact

| Fix | Score Gain |
|-----|-----------|
| #1 Metadata on proposal pages | +8 |
| #2 Schema markup on new pages | +10 |
| #3 Update llms.txt | +2 |
| #4 Privacy policy | +2 |
| #5 Custom 404 | +1 |
| #6 GA4 tracking | +0 (not scored, but essential) |
| #7 Internal linking | +5 |
| #8 Footer nav | +2 |
| **Total potential** | **~92/100** |
