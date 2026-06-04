# Graph Report - StreamStage  (2026-06-04)

## Corpus Check
- 110 files · ~411,509 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 775 nodes · 806 edges · 83 communities (62 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a72a3e87`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]

## God Nodes (most connected - your core abstractions)
1. `Seminar Slides — From Content Day to AI Assistant` - 20 edges
2. `cn()` - 17 edges
3. `compilerOptions` - 16 edges
4. `StreamStage Marketing & SEO Pass — Full Checklist` - 12 edges
5. `Dance Promo Proposal Builder — Complete Spec` - 12 edges
6. `Recital Proposal Page — Complete Spec (scraped from old site)` - 11 edges
7. `Recital Landing Page + Cold Outreach Funnel` - 8 edges
8. `StreamStage Testimonials Archive` - 8 edges
9. `StreamStage.live — Old Site Content (Archived)` - 8 edges
10. `migrateVideo()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `cn()` --calls--> `clsx`  [INFERRED]
  src/lib/utils.ts → package.json
- `sitemap()` --calls--> `getAllPosts()`  [EXTRACTED]
  src/app/sitemap.ts → src/lib/blog.ts
- `BlogPost()` --calls--> `NotFound()`  [INFERRED]
  src/app/blog/[slug]/page.tsx → src/app/not-found.tsx
- `BlogIndex()` --calls--> `getAllPosts()`  [EXTRACTED]
  src/app/blog/page.tsx → src/lib/blog.ts
- `BorderBeam()` --calls--> `cn()`  [EXTRACTED]
  src/components/magicui/border-beam.tsx → src/lib/utils.ts

## Communities (83 total, 21 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (27): footerNav, socialLinks, RecitalNavProps, jsonLd, metadata, promoServices, recitalServices, testimonials (+19 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (34): dependencies, cloudinary, framer-motion, gray-matter, lucide-react, @mdx-js/loader, @mdx-js/react, next (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (27): Assets to Replace, code:block1 (// Determine tier), CTA: Pick Your Date, Footer, Form Fields, Form Submission, Header Section, Interactive Calculator (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (14): portfolioHorizontal, portfolioVertical, services, portfolioHorizontal, portfolioVertical, services, CarouselItem, CylinderCard() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): Bundle pricing (all three services), Common pricing models for recital videography, Early bird discount, Example 1: Video only, 100 dancers, Example 2: Full bundle, 150 dancers, Flat rate, How per-dancer pricing compares to flat rate, Individual service pricing (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (16): NotFound(), sitemap(), BlogIndex(), metadata, components, MDXContent(), BLOG_DIR, BlogPost (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (20): Seminar Slides — From Content Day to AI Assistant, SLIDE 10 — PRO FEEDS UGC, SLIDE 11 — WHAT YOU WALK OUT WITH / DEMO, SLIDE 12 — THE SEAM, SLIDE 13 — THE PAIN-POINT ROUND, SLIDE 14 — PAY OFF THE LOOP, SLIDE 15 — PULL, DON'T PUSH, SLIDE 16 — STUDIOSAGE (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (19): 1. 30-Second Vertical Video, 2. 1-Minute Brand Story, 3. 10-Second Vertical Video, 4. Raw Footage Package (toggle, not quantity), Camera Options (toggleable, multi-select):, code:block1 (// Production Elements), Dance Promo Proposal Builder — Complete Spec, Form Fields: (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (17): 10. Write targeted blog posts, 11. Core Web Vitals audit (post-cutover), 12. Add breadcrumbs to sub-pages, 1. Add metadata to `/dancerecital` and `/dancepromo`, 2. Add schema markup to `/dance`, `/dancerecital`, `/dancepromo`, 3. Update `llms.txt` with new pages, 4. Create `/privacy-policy` page, 5. Create custom 404 page (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (16): Audio handling, Dance and stage experience, Finding a team that specializes in dance media, Key criteria to evaluate, Making your decision, Multi-camera capability, Next steps, Photography as an add-on (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (14): Clients, CONSULTATION & EXECUTION, Footer, Header, LIVE BROADCASTING, LIVE VIDEO, Navigation, PLANNING (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (6): jsonLd, faqs, navLinks, directionOffset, ScrollRevealProps, team

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (14): 1. `/dancerecital` and `/dancepromo` have NO metadata [Critical], 2. `/dance`, `/dancerecital`, `/dancepromo` have no schema markup [Critical], 3. `llms.txt` outdated — missing new pages [Warning], 4. No analytics tracking [Warning], 5. No `/privacy-policy` page [Warning], 6. No custom 404 page [Warning], 7. Internal linking gaps [Warning], 8. Security headers partially missing [Warning] (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (14): ChatGPT Agent Prompt — StreamStage Blog Writer, code:mdx (---), Communicating with Dance Families (3 posts), Identity, Livestreaming Dance Events (3 posts), Managing Dance Competitions (3 posts), Output Format, Running a Studio Through Effective Software (3 posts) (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.20
Nodes (9): projectTypes, cn(), MagicCard(), MagicCardProps, NeonColorsProps, NeonGradientCard(), NeonGradientCardProps, TextAnimateBase() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (10): ShimmerButton, ShimmerButtonProps, AnimationType, AnimationVariant, animationVariants, defaultContainerVariants, motionElements, MotionElementType (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (12): Audio: the deal‑breaker, Cameras and capture, Choosing a streaming platform, Computer and software, Final thoughts, Gather the right equipment, Lights and power, Mastering multi‑camera magic (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (12): 10. Open integrations and customization, 1. Seamless online registration, 2. Flexible billing and payment plans, 3. Attendance and progress tracking, 4. Integrated communication tools, 5. Parent and student portals, 6. Instructor management and payroll, 7. Reporting and analytics dashboards (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (12): BACK, Book a content day, Contact, Free tip — do it Monday, no vendor required, FRONT, Headline, Seminar Leave-Behind — One-Pager, The AI angle — StudioSage (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (12): 6 Topics × 3 Posts Each = 18 Posts, Blog Content Plan — StreamStage, Infrastructure (DONE), Publishing Cadence, Technical Notes, Topic 1: Livestreaming Dance Events, Topic 2: Studio Promo Videos, Topic 3: Social Media Video Campaigns (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (12): Analytics & Tracking, Cold Outreach Prep, Content Strategy, Conversion Rate Optimization (CRO), Copywriting, Priority Order, Schema Markup (detailed), SEO Content & Keywords (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.15
Nodes (12): code:block1 (Cold Email -> /recitals (sell page) -> /recitals/proposal (b), Content Assets Available, Context, Design Notes:, Fixes needed:, Funnel Flow, Page 1: `/recitals` — The Sell Page (NEW), Page 2: `/recitals/proposal` — The Builder (MIGRATED from old site) (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.23
Nodes (12): args, downloadFromCloudinary(), DRY_RUN, encodeVideo(), existsInR2(), generatePoster(), main(), migrateVideo() (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (6): clients, row1, row2, testimonials, Marquee(), MarqueeProps

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (8): CarouselItem, CylinderCard(), CylinderCardProps, optimizeSrc(), posterFromVideo(), SPRING, themeColors, VideoCarouselProps

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (9): A better experience for judges, Embracing digital scoring: next steps, Real‑time results and transparency build trust, Streamlined operations and cost savings, The complexity angle: implementation is a project, The complexity of modern competitions, The hidden costs of clinging to spreadsheets, What to look for in dance competition scoring software (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (9): 1. Trusting unreliable internet, 2. Neglecting audio, 3. Forgetting to plan the show, 4. Skipping the rehearsal and gear check, 5. Using the wrong camera angles, 6. Failing to engage or promote your stream, 7. Overlooking licensing and legalities, Bringing it all together (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): Dealing with the logistics, Designing your camera layout, Final notes, Matching and syncing your cameras, One camera tells only part of the story, Switching and directing the show, The limitations of a single camera, When to invest in professional help (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.20
Nodes (9): ALT — Remotion-rendered MP4, Beat sheet, Deliverable for the builder, Either way, Live Animated Demo — Build Spec + Beat Sheet, PRIMARY — lightweight HTML/CSS/JS web mock, run live in a browser tab, Recommended implementation, Visual / brand notes (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.27
Nodes (9): COMP_DIR, downloadFromR2(), DRY_RUN, fmtMB(), ORIG_DIR, run(), s3, uploadToR2() (+1 more)

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (8): Capture high‑quality footage, Clarify your story and audience, DIY or hire a professional?, Edit with pacing and purpose, Respect music and licensing, Share strategically, Show, don’t tell, Why video matters for enrollment

### Community 32 - "Community 32"
Cohesion: 0.22
Nodes (8): Audience expectations in 2026, Backstage chaos, More than trophies and sequins, Music and licensing, Scoring and judging, The complexity is real, but tools exist, The scheduling puzzle, Volunteers, vendors and vendors

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (8): Balance enrollment and engagement, Build a content calendar, Optimize for each platform, Plan live streams strategically, Social media isn’t just for fun anymore, Start small, iterate often, The complexity of doing it right, Understand the platforms and trends

### Community 34 - "Community 34"
Cohesion: 0.36
Nodes (8): buildHtml(), CAMERA_LABELS, esc(), money(), POST(), PromoData, row(), transporter

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (8): Business / Events, Currently on New Site, Dance, Music, Not Yet on New Site (available for future use), StreamStage Testimonials Archive, Theatre / Shows, Weddings

### Community 36 - "Community 36"
Cohesion: 0.36
Nodes (7): buildHtml(), esc(), money(), POST(), ProposalData, row(), transporter

### Community 37 - "Community 37"
Cohesion: 0.36
Nodes (8): buildHtml(), DeliverableLineItem, esc(), money(), POST(), ProposalData, row(), transporter

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (7): Planning a successful livestream + results rollout, Ready to embrace the new standard?, Technical considerations and challenges, The complexity angle: it’s harder than it looks, The power of real‑time results, Why combining livestreaming and real‑time results is the new standard, Why livestreaming matters

### Community 39 - "Community 39"
Cohesion: 0.25
Nodes (7): 1. Slow responses and unanswered messages, 2. Inconsistent information across channels, 3. Burying key details in long paragraphs, 4. Overusing one channel, 5. Ignoring feedback and questions, Communication is retention, The complexity behind the scenes

### Community 40 - "Community 40"
Cohesion: 0.25
Nodes (7): 1. The brand or promo reel, 2. Class preview videos, 3. Student spotlights, 4. Recital and competition highlights, 5. Parent or student testimonials, Building your library over time, Different videos serve different goals

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (7): Avoid common pitfalls, Complexity and when to seek help, Content that performs, Hook, then deliver, Know your audience and platform, Repurpose existing footage, The allure of short‑form platforms

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (6): Channels matter more than you think, Consistency builds trust, The complexity of scaling communication, The never‑ending inbox, Tone and empathy matter, Volume and repetition are the real culprits

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (3): Product, products, spring

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (6): Complexity and pitfalls, Getting started, Identify what to automate, Keep the human touch where it matters, Tools and workflows, Why automate?

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (6): Enter StudioBeat, Essential features, Evaluating vendors, Pain points with generic tools, The complexity of migration, Why studios need management software

### Community 46 - "Community 46"
Cohesion: 0.29
Nodes (6): Hybrid approaches, The case for DIY, The hidden costs of DIY, The professional advantage, When to DIY and when to hire, Why this debate matters

### Community 47 - "Community 47"
Cohesion: 0.29
Nodes (6): Choose the right ad formats, Create compelling creatives, Map out your timeline, Measure and adjust, Target strategically, Why enrollment season needs video

### Community 48 - "Community 48"
Cohesion: 0.29
Nodes (6): Active Task, Blockers / Open Questions, Context for Next Session, Current Work - StreamStage, Next Steps, Recent Changes (Session 2026-03-10/11)

### Community 49 - "Community 49"
Cohesion: 0.29
Nodes (6): CLOSE (2–3 min) + OPEN FLOOR, OPEN (2–3 min), SEGMENT 1 — THE CONTENT DAY (~8 min), SEGMENT 2 — AI / AUTOMATION (~8 min), Seminar Master Script, TRANSITION (the seam)

### Community 50 - "Community 50"
Cohesion: 0.29
Nodes (5): btn, h1, imgs, root, vars

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (3): TextReveal(), TextRevealProps, WordProps

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (3): stats, NumberTicker(), NumberTickerProps

### Community 53 - "Community 53"
Cohesion: 0.33
Nodes (5): Hidden costs of sticking with manual systems, Planning your migration, Signs you’ve outgrown spreadsheets, The complexity is real, but so are the rewards, Why spreadsheets feel comfortable—until they don’t

### Community 54 - "Community 54"
Cohesion: 0.40
Nodes (4): EXCLUDED FOLDERS/PATTERNS, KEPT, SEARCH STATE, Video Hunt Tracker

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (4): localPath, results, videos, wslTempWin

### Community 56 - "Community 56"
Cohesion: 0.60
Nodes (4): buildHtml(), escapeHtml(), POST(), transporter

### Community 57 - "Community 57"
Cohesion: 0.40
Nodes (3): dmSans, metadata, outfit

### Community 58 - "Community 58"
Cohesion: 0.50
Nodes (3): image: "/blog/post-slug.jpg"  # optional OG image, Lists, links, code — all standard Markdown., Subheading

## Knowledge Gaps
- **507 isolated node(s):** `target`, `lib`, `allowJs`, `skipLibCheck`, `strict` (+502 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 15` to `Community 3`, `Community 16`, `Community 51`, `Community 52`, `Community 24`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 1` to `Community 15`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `clsx` connect `Community 15` to `Community 1`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `target`, `lib`, `allowJs` to the rest of the system?**
  _507 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.052854122621564484 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._