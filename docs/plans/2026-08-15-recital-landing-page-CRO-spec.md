# Recital Landing Page — CRO and copy spec

Companion to `2026-08-15-recital-landing-page-build.md`. Sourced from the local corpus, not
invented: `marketingskills/skills/page-cro` (SKILL + experiments), `skills/copywriting`
(copy-frameworks), `skills/marketing-psychology`, `amplify/docs/MARKETING-PLAYBOOK.md`,
`foundervision/docs/compsync-sales-playbook.md`, and Daniel's own expo talk.

---

## The seven checks, applied

### 1. Value proposition clarity (highest impact)
Test: can a studio owner understand what this is and why they care in **five seconds**?
Rule: benefit not feature, their language not ours, one thing not everything.

**Our risk:** the natural instinct is to lead with multi-camera, which is a feature. The benefit
in this business is that recital day stops being one more thing to manage, and the media fee
becomes revenue instead of cost. Lead with one of those.

### 2. Headline
Strong patterns: outcome-focused, specific with numbers or timeframes, or proof-led.

Candidates drawn from real language already in the material. None invent a claim:

| Mode | Candidate | Source |
|---|---|---|
| Problem | Your dancers deserve better than a tripod in the back row | Daniel's own March spec |
| Outcome | One recital. A year of content. | `talk1-video-script.md` thesis |
| Differentiation | You charge the media fee. You keep it. | calculator: Profit to Studio |
| Proof | "I've never seen our show look so good" | Kerry Moore, quote bank |
| Outcome | The one thing on recital day you won't have to think about | Mandy London, quote bank |

Recommendation: differentiation headline, problem line as the subhead. The revenue reframe is the
thing no competitor is saying, and per the playbook, differentiation beats description when the
category is understood but the offer is not.

### 3. CTA
Rules: **one** primary action, visible without scrolling, button copy carries value rather than
naming an action. "Submit" and "Learn more" are weak; "See your pricing" or "Build my recital
quote" state what the click yields.

- Primary: through to `/dancerecital`. Repeat at each decision point (after proof, after
  pricing, at close).
- Secondary: book a call. Deliberately quieter, per the skill's hierarchy rule.
- **Decision needed: remove nav?** The landing-page experiment list says single-focus pages
  convert better with navigation removed. `RecitalNav.tsx` exists. Removing it fights the site's
  coherence, keeping it leaks attention. My call would be to keep a minimal logo-only header.

### 4. Visual hierarchy and scannability
Someone scanning only the headings should still get the argument. Prominence follows importance,
generous white space, images that carry the message rather than decorate.

**Our advantage:** the `angle-room` / `angle-faces` pair is an image that *is* the argument. It
earns position 2 because it converts a claim into evidence without a word of copy.

### 5. Trust signals and social proof
Strongest form is specific, attributed, with a photo. Placement rule: **near CTAs and immediately
after benefit claims**, never in one isolated block.

- Attribution is blocked on consent. Until then, quotes run anonymous, which is measurably weaker.
- Available: 6 named owners, the client logo wall (`clients-logos.png`), platform screenshots.
- The Kerry line about a dance mom messaging five minutes after release is the highest-value
  single asset, because the proof comes from the customer's customer.

### 6. Objection handling
Address price and value, "will this work for my situation", implementation difficulty, and
"what if it doesn't work". Handle via FAQ, process transparency, and guarantees.

Real objections already documented in `expo-assets/seminar-qa-appendix.md` and the sales playbook.
The per-dancer model raises a specific one worth pre-empting: small studios pay the highest
per-dancer rate, so a 60-dancer studio needs the maths shown as revenue rather than cost.

### 7. Friction
Fewest fields, obvious next step, mobile-first, fast load.

**Our biggest friction risk is the hero video.** Autoplay hero footage is the single most likely
cause of a slow first paint, and studio owners open these on phones. Poster image, muted,
`playsinline`, lazy the rest.

---

## Section order

Per the copywriting skill's landing page templates, and consistent with the March spec:

1. Hero: footage, headline, one CTA
2. Proof shot: the A/B angle pair
3. Problem, in their words (recital day chaos, the DIY tripod, the year a file corrupted)
4. What you get
5. **The revenue reframe** (blocked on mechanics)
6. Social proof
7. Genuine availability
8. Pricing transparency, tiers named, CTA
9. Objections FAQ
10. Close and repeat CTA

## Urgency and scarcity

The experiment list is explicit that urgency and scarcity get tested **"if genuine."** That is the
whole rule and it is not a stylistic preference. A fabricated countdown is disprovable by one
phone call and it would discredit the testimonials sitting directly above it.

Genuine here: recital dates cluster on a few spring weekends, there are 8 operators, and two
studios wanting the same Saturday cannot both be served. Also genuine, once repaired: the Early
Bird discount, which is a real price difference on a real deadline.

Honest options, strongest first:
1. Real remaining dates per weekend, driven by booking data (source of truth still unidentified).
2. A stated cap: how many recitals can be served in a season, and how many are already taken.
3. A repaired Early Bird deadline with the discount shown as a number.
4. Static: "spring weekends book first, December has more room." Weakest, still true.

**Never:** invented counters, fake "3 spots left", countdowns that reset on reload.

## Message match

The experiment list puts message match first for landing pages: headline should match the ad or
email that delivered the visitor, and the offer must be the one that was promised.

Consequence for this campaign: four channels, two seasons. If the December push and the spring
push carry different urgency, they eventually need **different landing variants**, not one page
doing both jobs. Build one now, split later when traffic justifies it.

## Test list, once live

Hero headline (differentiation vs problem), social proof density and placement, page length
(short versus complete argument), nav removal, CTA copy, and whether the pricing tiers belong on
the page at all or only behind the click.

## Design

Match the existing dark theme with cyan accent. Mobile first. The `hallmark` skill is available
for an anti-AI-slop pass before this is called done, and `ui-ux-pro-max` for the visual system.
Per the global rule: screenshot every iteration and DM it.
