# Recital Campaign: Context Inventory

**Status: GATHERING. Nothing here is a plan yet.**
Started 2026-08-15 from the PA session. This file is the running record of what exists, so the
campaign build does not re-derive it. Update in place.

**Scope (as stated by Daniel):** a business-quarter campaign covering **cold email, warm email,
organic social, and paid social**, including all asset generation.
Products: StreamStage recital livestreaming and promo video, StudioSage, CompSync tutorial
education and adoption.

**Scope change on record:** the first framing was organic and email, explicitly not paid ads.
Paid social was added 2026-08-15. Tracked as in scope.

**Audience split, unconfirmed:** StreamStage recital, promo video and StudioSage sell to studio
owners. CompSync sells to competition organizers. If that holds, this is one campaign against two
audiences and the two cannot share reach content. Needs Daniel's confirmation.

---

## 0a. TWO CAMPAIGNS, NOT ONE (Daniel, 2026-08-15)

**Recital video and promo video are separate campaigns.** Separate offers, separate builders,
separate buying moments, separate proof. They share a corpus and a voice, and nothing else.

| | **Recital campaign** | **Promo / content day campaign** |
|---|---|---|
| Offer | We shoot your recital: spring, or December | Content day: a year of video in one morning |
| Builder | `/dancerecital` | `/dancepromo` |
| Pricing | Per dancer, tiered, media fee resold to parents | Not yet gathered |
| Clock | **May/June is primary, December is a secondary catch. Both sold from a September launch** | **EVERGREEN. No season, no deadline, no dates in any asset** |
| Buyer moment | Planning the season's big show | Refreshing the studio's marketing |
| Lead witness | Kerry Moore, Mandy London, Alana Colver, Laura Ramsey, Nicole | **Tiffany Adoranti** |
| Spine document | this file | `StreamStage/expo-assets/talk1-video-script.md` |

**Why this split is not optional:** on 2026-08-14 four drafts asked studios for a recital date
while linking the promo builder. The draft lint now warns on that exact mismatch. Merging the two
campaigns reproduces the same error at scale.

### Corrections this forces on earlier work in this file

1. **`talk1-video-script.md` belongs to the PROMO campaign, not recital.** Its title is "The
   Content Day: A Year of Video in One Morning" and its thesis (do the hard thing once, let it pay
   back all year; nine posts from one clip; pro feeds UGC) is the content-day argument. It was
   wrongly cited as a recital headline source in the CRO spec. The recital page should not lead
   with it.
2. **Quote bank theme 7 is promo, not recital.** Tiffany's material about the one-minute promo,
   parent testimony in the background, elevated brand, and mining raw footage weekly is the promo
   campaign's strongest evidence and does not belong on the recital page.
3. **Sequencing: CORRECTED 2026-08-16, this was wrong.** There is no October deadline in either
   campaign. **The October 2-5 weekend is Calgary clients and Daniel works it manually** off his
   own Expo follow-up (Stephanie, Makenna, Taisiia are his conversations, not campaign contacts).
   Studio promo is **evergreen**. Recital is **May/June primary, December secondary**. Both
   campaigns go live the **first week of September 2026**, together, neither leading.

### Still to gather for the promo campaign

- `/dancepromo` pricing model, the equivalent of the recital calculator constants.
- Which of the 41 videos are promo proof rather than recital proof. The 11 finished promos and the
  five format demos (day in life, interview, mic'd up, POV, correction) are promo assets.
- Whether the content-day offer has a landing page, or needs the same treatment as recital.
- `handout-content-day-planner.html` and `handout-interview-questions.html` are promo-campaign
  lead magnets. `dance-recital-livestream-checklist.pdf` is recital's.

---

## 0. THE RECITAL OFFER (stated by Daniel 2026-08-15)

**StreamStage does your dance recital: spring, or a winter recital in December.**
Pricing is the recital calculator, `StreamStage/src/app/dancerecital/page.tsx`, served at
`/dancerecital`.

Priced **per dancer**, tiered by dancer count, three services that bundle:

| Tier | Video | +Streaming | +Photo | All three |
|---|---|---|---|---|
| Small, 1-100 dancers | $25 | $5 | $8 | **$35/dancer** |
| Medium, 101-150 | $25 | $3 | $7 | **$30/dancer** |
| Large, 151+ | $18 | $2 | $5 | **$22/dancer** |

Three stackable discounts, up to 15% total: **Early Bird**, **Testimonial** (share your
experience), **3-Year Loyalty**.

### What the offer structure means for the campaign

1. **The testimonial discount is already a campaign mechanism.** Daniel prices a discount for
   sharing an experience, which makes testimonials a priced exchange rather than a favour asked
   after the fact. It is also the clean answer to the consent problem going forward: future
   testimonials arrive with permission attached because permission is what was bought.
2. **Per-dancer pricing inverts the usual objection.** Larger recitals cost less per dancer, so
   size is a reason to buy rather than a reason to hesitate. The message writes itself for large
   studios and needs care for small ones, where the per-dancer number is highest.
3. **Two seasons, two clocks.** A December winter recital is roughly four months out and is an
   urgency play. Spring is eight or nine months out and is a planning play. These are different
   messages and probably different lists, since studios running a winter show are a subset.
4. **RESOLVED 2026-08-16: Early Bird is now December 31, 2026.** It read April 15 2026 and had
   expired, leaving the calculator with no working urgency lever. Daniel set the new date and it is
   changed at `StreamStage/src/app/dancerecital/page.tsx:24`. Not yet deployed. The date is a good
   fit for both seasons, since a studio booking December and a studio booking June both have to
   decide before it.

### The differentiator, already built into the calculator

The calculator does not just price the job. It computes **Suggested Media Fee** and **Profit to
Studio**, carries a media fee override, and states **"Client retains all revenue"**. So the
commercial model is: the studio charges parents a media fee, StreamStage bills per dancer, and the
studio keeps the spread. The March 2026 plan called this the number one differentiator and said it
needed to be unmissable.

That reframes the entire campaign. Price stops being a cost the studio absorbs and becomes a
revenue line it earns. Every channel should carry it.

**Needs Daniel's clarification before any copy is written:** Laura Ramsey's testimonial says the
money goes direct to Daniel and comes off her bill, while the calculator frames the studio as
collecting a media fee and keeping the profit. Those are two different mechanics. Which one is
current, and is it the same for every studio?

### Funnel (SPECIFIED IN MARCH, PARTIALLY SHIPPED)

`StreamStage/docs/plans/2026-03-20-recital-landing-page.md` already designed this, targeting the
May/June 2026 recital season:

`Cold email -> /recitals sell page -> /recitals/proposal builder -> follow up within 1 business day`

Its specified section order for the sell page: hero with autoplay recital clip, what you get,
the keep-all-the-revenue callout, social proof, transparent pricing grid, then a primary CTA to
build a proposal with a secondary CTA to book a 15 minute call.

**What actually shipped is `/dancerecital`, a calculator-first page** with inline value bullets
(professional operators, all A/V provided, up to 4 hours consultation, client retains all
revenue). The separate sell page does not appear to exist. Routes present: `/dance`,
`/dancerecital`, `/dancepromo`, `/videoproduction`, `/blog`.

### Organic already seeded

Three SEO posts are written and live in `StreamStage/content/blog/`, aimed squarely at this buyer:
how to choose a recital videographer (2,000 words), how to livestream a dance recital (1,674), and
how much recital videography costs (1,871). The cost post already argues transparent per-dancer
pricing, which is the same spine as the offer.

### Hard constraint on every channel

**The calculator link is never sent in an email.** Standing rule, memory
`never-send-calculator-link`: name that a calculator exists, get them on a call, never paste the
URL. All 25 offending drafts were stripped for this on 2026-08-14, and the draft lint now fails
any draft containing it. So the campaign may say pricing is transparent and per-dancer, and must
drive to a conversation rather than to the page.

---

## 1. Proof and testimonial (GATHERED)

| Asset | Where | State |
|---|---|---|
| Quote bank, 33 traced quotes, 9 themes | `assistant/docs/streamstage-recital-quote-bank.md` | Built |
| Kiosk cut transcript (Daniel's own selections) | `assistant/docs/kiosk-testimonials-transcript.md` | Built |
| Raw interviews, 6 owners, 21,487 words | `StreamSTageTestimonials.txt` (FIRMAMENT desktop) | Copied local |
| 3 written testimonials, attributed | `amplify/docs/context/StreamStage_Testimonials.md` | Existing |

Owners: Nicole (Stagecoach), Mandy London (ADA), Laura Ramsey (Grand River), Alana Colver (LDS),
Kerry Moore (KMSD), Tiffany Adoranti (Caledonia).

**Blocker: consent is unconfirmed for all six.**

## 2. Video and image assets (GATHERED)

- 41 cut videos in `StudioSage/live-demo/videos/` plus compressed `videos-lite/` copies and 11
  poster JPGs. Includes 11 finished promos (37-66s), a 60s highlight, 3 recital captures, ~14
  short reel cuts, the `recital-wide` / `recital-multicam` matched pair (34s each, same routine,
  wide versus close), 5 format demos, and 2 testimonial videos.

  **Corrected 2026-08-16:** this line previously called `angle-faces` / `angle-room` an "A/B pair".
  Verified false against the frames. `angle-room` is a Footprints studio class, `angle-faces` is a
  mixed recital recap. Not a pair, and `angle-room` is a content day asset.
- Brand: logo colour and white, Daniel headshot, booth poster, client logo wall
  (`StreamStage/clients-logos.png`, `clients-section.png`).
- Platform screenshots: `tsa-live-recital`, `tsa-recital-final`, `kmsd-highlight`,
  `wws-mobile-highlight-reels-3x3`.
- `studiosage-dashboard-walkthrough.mp4`, `robot-wall.mp4` in `StreamStage/expo-assets/decks/`.

**Gap:** no asset registry. `commandcentered.creative_assets` has 0 rows, so none of this is
queryable. Nicole and Mandy have 9 kiosk picks between them and no located footage.

## 3. Messaging and positioning (GATHERED)

| Source | What it gives |
|---|---|
| `StreamStage/expo-assets/talk1-video-script.md` | The content-day thesis: do the hard thing once, it pays back all year. Nine posts from one recital clip. Pro feeds UGC. Stage-tested |
| `/mnt/firmament/ExpoMic.txt` lines 1-415 | Talk 1 as actually delivered, 8,630 words. DVD-to-digital-link reframe, gallery expectation, story of progress |
| `ExpoMic.txt` lines 2565-3087 | Talk 2, AI / StudioSage, 8,225 words |
| `StreamStage/expo-assets/POSTMORTEM-2026-07-28-said-vs-planned.md` | Line-indexed map of the whole mic file, said versus scripted |
| `StudioSage/docs/2026-07-30-expo-mic-insights.md`, `2026-08-11-calgary-expo-mic-insights.md`, `2026-08-calgary-expo-debrief.md` | Distilled insights from both expos |
| `foundervision/docs/compsync-sales-playbook.md` | CLOSER spine, objection handling |
| `foundervision/docs/sales-call-framework.md` | TRIANGLE, BOW, SIZZLE, CHECK |
| `amplify/docs/MARKETING-PLAYBOOK.md` | Distribution rules, posting cadence, observable-moments hook prompt |
| `amplify/docs/transcripts/INDEX-iamchrischung.md` | 25 viral reel breakdowns, hook devices |
| `assistant/VOICE-PROFILE.md` | Daniel's measured email voice |

**Gap:** raw mic capture for the Calgary expo (Aug 10-11) not located. `ExpoMic.txt` is
2026-07-30 only. Two distilled docs exist for Calgary, raw does not.

## 4. Lead magnets (GATHERED, unused)

Four built as HTML with screenshots, in `StreamStage/expo-assets/`: 5 free AI moves, content day
planner, interview questions, videographer brief. Plus
`StudioSage/live-demo/research/dance-recital-livestream-checklist.pdf`.
QR codes exist for StudioSage signup and the freebie.

**Gap:** no landing pages or capture flow identified for any of them.

## 5. Audiences (PARTIAL)

Measured in `commandcentered` on 2026-08-15:

| Segment | Count |
|---|---|
| Leads, all with an email | 523 |
| Clients | 104 (100 with email) |
| Campaigns already in the table | 17 |
| campaign_leads | 8 |
| Email suppressions | 1 |
| Unsubscribe tokens | 0 |

**Gap, and it needs answering before any cold send:** 523 cold contacts against 1 suppression and
0 unsubscribe tokens. Canadian anti-spam rules govern this list and the plumbing to honour an
opt-out does not appear to exist yet. This is a compliance question for Daniel, not something to
design around.

**Not yet segmented:** which of the 523 are studio owners versus competition organizers, which are
in recital season, which have already been contacted.

## 6. Channel readiness

**EXECUTION IS MANUAL.** Confirmed by Daniel 2026-08-15: the amplify app is retired. It is not an
execution surface and its `/campaigns`, `/social` and `/api/outreach` routes are not part of this
plan. The repos are being used as **knowledge sources only**. Outreach is done by hand: PA drafts
in Gmail, Daniel edits and presses send, posts go up manually.

| Channel | Ready | Missing |
|---|---|---|
| Organic social | Assets, hooks, quotes, distribution rules | Calendar, brand template, who posts and when |
| Warm email | 100 client emails, voice profile, CRM history | Segmentation, sequence, offer per segment |
| Cold email | 523 leads, cold-email references, campaign precedent (`compsync-cold-email-canadian-comps.md`) | Suppression and unsubscribe handling, segmentation, deliverability check |
| Paid social | Creative inventory, 5x5 matrix in the playbook | Ad account access, budget, audience definitions, tracking. None confirmed |

**What manual execution changes about the design.** Send volume is bounded by Daniel's time and by
Gmail, not by a sequencing tool, so the plan has to rank a small high-value list ahead of the full
523 rather than treat the list as a blast target. Sequences become a small number of touches he can
actually sustain. Cadence has to survive weeks when he is shooting. Every automation instinct from
the playbooks needs translating into something a person does on a Tuesday.

---

## Parallel tracks

| # | Track | State | Blocked on |
|---|---|---|---|
| 1 | **Landing pages** (two sell pages in front of the two existing calculators) | **BUILT + DEPLOYED 2026-08-15.** `streamstage.live/recitals` and `streamstage.live/contentday`. Plan + CRO spec in `StreamStage/docs/plans/2026-08-15-*` | Revenue wording, consent for named quotes, availability data, Early Bird date |
| 1b | **FIRMAMENT posting folder** | **DONE.** `/mnt/firmament/StreamStageCampaigns/` (`D:\Shared\StreamStageCampaigns`), 34 clips, 22 posters, brand set, quote sheets, image prompts | Nothing |
| 2 | **Asset production** | Source folder built, quote sheets + image prompts done. Cutting individual posts not started | Nothing. Consent is handled |
| 3 | **Best-practice extraction** | **DONE.** CRO spec + conversion research findings in `StreamStage/docs/plans/2026-08-15-*` | Nothing |
| 4 | **Channel playbooks, both campaigns** | **REWRITTEN 2026-08-16** off the October spine. `contentday-campaign-PLAYBOOK.md` is now evergreen with no dates anywhere; `recital-campaign-PLAYBOOK.md` is May/June primary + December secondary, with Daniel's five arms (rebooking / warm / cold / organic social / paid). Ranked lists, 3-touch sequences, 4-week rotations, all date-free | Nothing |
| 5 | **Cold email** (523 leads) | Blocked | Opt-out handling |
| 6 | **Warm email** (100 client emails) | Ready to draft | Nothing |
| 7 | **Paid social** | Blocked | Ad account, budget, audiences |

Consent for named testimonials: **handled** (Daniel, 2026-08-15). Named quotes are live on both
landing pages.

## Open questions for Daniel

1. **Consent** for each of the six owners, by name.
2. **Quarter dates**, and whether one product leads or all three carry equal weight.
3. **Recital booking cycle**: when studios actually commit. Campaign timing depends on it.
4. **Audience split** confirmation: studio owners versus competition organizers.
5. **Paid social**: which accounts, whose budget, what monthly number.
6. **Cold email compliance**: how opt-outs are currently handled for the 523.

## Still to gather

- Calgary raw mic capture, if it exists.
- Whether raw interview footage survives for all six owners, or only the kiosk cut and Tiffany.
- What the 17 existing campaign rows contain, as history rather than tooling.
- Whether the four lead magnets have any landing page or capture flow, or need one built.
- Best-practice extraction from the two knowledge repos, scoped to these four channels:
  `foundervision` (sales structure, objections, CLOSER) and `amplify`
  (`MARKETING-PLAYBOOK.md`, the 25 reel breakdowns, cold email references).
