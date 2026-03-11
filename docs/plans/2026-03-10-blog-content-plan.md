# Blog Content Plan — StreamStage

## Infrastructure (DONE)
- [x] MDX blog system: `content/blog/*.mdx` → parsed with gray-matter + reading-time
- [x] Blog listing page: `/blog`
- [x] Blog post page: `/blog/[slug]` with full SEO metadata + OG tags
- [x] Tailwind Typography plugin for prose styling
- [x] Sitemap auto-includes blog posts
- [x] Template at `content/blog/_template.mdx`

## 6 Topics × 3 Posts Each = 18 Posts

### Topic 1: Livestreaming Dance Events

1. **`how-to-livestream-dance-recital.mdx`**
   - "How to Livestream a Dance Recital: The Complete Guide"
   - Keywords: livestream dance recital, how to stream dance show
   - Angle: helpful overview of what's involved — multi-cam, audio, bandwidth, platform choices. Emphasize how many things can go wrong without experience.

2. **`multi-camera-livestream-setup-dance.mdx`**
   - "Multi-Camera Livestreaming for Dance: Why One Camera Isn't Enough"
   - Keywords: multi camera livestream dance, dance event live production
   - Angle: explain switching, angles, close-ups vs wide shots. Show the complexity of doing it right.

3. **`livestream-mistakes-dance-events.mdx`**
   - "7 Livestreaming Mistakes That Ruin Dance Events (And How to Avoid Them)"
   - Keywords: livestream problems, dance event streaming issues
   - Angle: real problems (bad audio, dropped frames, no backup, wrong angles). Position professional help as the solution.

### Topic 2: Studio Promo Videos

4. **`dance-studio-promo-video-guide.mdx`**
   - "How to Create a Promo Video That Actually Gets Students in the Door"
   - Keywords: dance studio promo video, promotional video dance school
   - Angle: what makes a good promo vs a forgettable one. Planning, shot lists, music licensing, editing.

5. **`dance-studio-video-types.mdx`**
   - "5 Types of Videos Every Dance Studio Should Have"
   - Keywords: dance studio video content, video marketing dance studio
   - Angle: promo reel, class preview, student spotlight, recital highlight, testimonial. Explain what goes into each.

6. **`diy-vs-professional-dance-video.mdx`**
   - "DIY vs. Professional Video Production for Dance Studios: When to Invest"
   - Keywords: professional dance video production, hire videographer dance studio
   - Angle: be honest about what you can DIY and where professional quality matters. The gap is bigger than people think.

### Topic 3: Social Media Video Campaigns

7. **`social-media-strategy-dance-studios.mdx`**
   - "A Social Media Video Strategy That Actually Works for Dance Studios"
   - Keywords: dance studio social media, social media marketing dance school
   - Angle: content calendar, what to post when, enrollment-driving content vs engagement content.

8. **`tiktok-reels-dance-studio.mdx`**
   - "TikTok and Reels for Dance Studios: What's Actually Worth Your Time"
   - Keywords: tiktok dance studio, instagram reels dance school
   - Angle: what performs well, how to batch content, repurposing recital/competition footage. Complexity of staying consistent.

9. **`video-campaigns-enrollment-season.mdx`**
   - "How to Run a Video Campaign for Dance Studio Enrollment Season"
   - Keywords: dance studio enrollment marketing, dance studio registration campaign
   - Angle: timeline, ad formats, targeting, creative that converts. Show how much planning is actually required.

### Topic 4: Communicating with Dance Families

10. **`dance-studio-parent-communication.mdx`**
    - "The Parent Communication Problem Every Dance Studio Owner Knows"
    - Keywords: dance studio parent communication, dance school family engagement
    - Angle: the volume of questions, the repetition, the urgency. Empathize, then introduce how AI/automation helps.

11. **`automate-dance-studio-communication.mdx`**
    - "How to Automate Dance Studio Communication Without Losing the Personal Touch"
    - Keywords: automate dance studio, dance studio communication tools
    - Angle: what can be automated (schedule Q&A, policy lookups, reminders) vs what shouldn't (sensitive topics, personal feedback). StudioSage as a solution.

12. **`dance-studio-communication-mistakes.mdx`**
    - "5 Communication Mistakes That Cost Dance Studios Families"
    - Keywords: dance studio communication mistakes, keep dance families engaged
    - Angle: slow responses, inconsistent info, info buried in email threads, no central source of truth. Each mistake → how to fix it.

### Topic 5: Running a Studio Through Effective Software

13. **`dance-studio-management-software-guide.mdx`**
    - "The Complete Guide to Dance Studio Management Software"
    - Keywords: dance studio management software, dance studio scheduling software
    - Angle: what to look for, feature checklist, common pain points with generic tools. StudioBeat positioning.

14. **`spreadsheet-to-software-dance-studio.mdx`**
    - "From Spreadsheets to Software: When Your Dance Studio Has Outgrown Manual Systems"
    - Keywords: dance studio software, dance studio billing software
    - Angle: signs you've outgrown spreadsheets, the hidden cost of manual processes, what migration looks like.

15. **`dance-studio-software-features.mdx`**
    - "The 10 Features Your Dance Studio Software Must Have in 2026"
    - Keywords: best dance studio software, dance studio app features
    - Angle: attendance, billing, parent portal, scheduling, communication, reporting, etc. Show how few tools cover all of them.

### Topic 6: Managing Dance Competitions

16. **`how-to-run-dance-competition.mdx`**
    - "How to Run a Dance Competition: The Behind-the-Scenes Complexity Nobody Talks About"
    - Keywords: how to run dance competition, dance competition management
    - Angle: scheduling 500+ routines, tabulation, staging, backstage flow, parent management. Show how insanely complex it is.

17. **`dance-competition-scoring-software.mdx`**
    - "Why Spreadsheet Scoring Is Killing Your Dance Competition"
    - Keywords: dance competition scoring software, dance competition tabulation
    - Angle: error rates, speed, real-time results expectations, judge management. CompSync as the solution.

18. **`dance-competition-livestream-results.mdx`**
    - "Livestreaming + Real-Time Results: The New Standard for Dance Competitions"
    - Keywords: dance competition livestream, live results dance competition
    - Angle: parent expectations in 2026, how livestream + software integrate, the competitive advantage for organizers. StreamStage + CompSync together.

## Writing Guidelines
- 1000-1500 words per post
- Publish with real current dates (never backdate)
- Helpful and genuinely useful — but always show the complexity to drive professional services/software inquiries
- End each post with a soft CTA linking to StreamStage contact or relevant product
- Include internal links to other blog posts and StreamStage sections
- Tone: knowledgeable, empathetic to studio owners/organizers, not salesy

## Publishing Cadence
- 2-3 posts per week until all 18 are published
- Batch 1 first (livestreaming + competition posts — highest commercial intent)

## Technical Notes
- Drop `.mdx` files into `content/blog/` with frontmatter matching `_template.mdx`
- Auto-builds on deploy — no extra steps
- Images in `public/blog/` if needed
- Sitemap updates automatically
