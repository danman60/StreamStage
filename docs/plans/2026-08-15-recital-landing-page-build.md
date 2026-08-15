# Recital Landing Page — build plan

**This exists so that** Daniel has *"a HIGH CONVERTING landing page that clicks THROUGH to the
calculator to book."*

Check every deliverable against that line, not against this plan. If they disagree, the line wins.

**Track 1 of the recital campaign.** Context: `amplify/docs/campaigns/2026-Q-recital-campaign-CONTEXT.md`

---

## Anti-duplication: what already exists

- `docs/plans/2026-03-20-recital-landing-page.md` — this page was **already specified in March
  2026**, including funnel and section order. This plan extends it rather than replacing it.
  The March spec used `/recitals`; what shipped was `/dancerecital`.
- `src/app/dancerecital/page.tsx` (847 lines) — **the calculator, and it stays.** It already
  computes Suggested Media Fee, Profit to Studio, a media fee override, and states "Client retains
  all revenue". Do not rebuild any of it. The landing page ends by sending people here.
- `src/app/dance/`, `dancepromo/`, `videoproduction/`, `blog/` — existing routes, leave alone.
- `content/blog/` — three recital SEO posts already live. The landing page should link them as
  depth, not restate them.
- `src/components/RecitalNav.tsx` — existing nav, reuse.

**Net new: one sell page in front of the existing calculator.** Nothing else.

## The funnel

```
organic post / cold email / warm email / paid social
        -> LANDING PAGE (new: believe it)
        -> /dancerecital calculator (existing: price it, book it)
        -> follow up within 1 business day
```

This resolves the standing rule that the calculator link never appears in an email. Campaign
traffic goes to the landing page. The calculator is one deliberate click deeper, chosen by a
visitor who already believes.

## Page structure

Order matters: proof before price. A cold studio owner shown a pricing grid too early reads it as
expensive, because nothing has yet established what they are buying.

| # | Section | Content | Source asset |
|---|---|---|---|
| 1 | Hero | Autoplay muted recital footage, one headline, one CTA | `recital-multicam.mp4`, `recital-wide.mp4` |
| 2 | The proof shot | Side-by-side of what the audience sees vs what gets captured | `angle-room.mp4` / `angle-faces.mp4`, 26s each |
| 3 | What you get | Multi-camera, livestream for distant family, photography, fast turnaround, all A/V, professional operators | calculator's own bullets |
| 4 | **You keep the revenue** | The differentiator. Studio charges the media fee, keeps the spread | **BLOCKED, see below** |
| 5 | Social proof | Theme 1 (one less thing on recital day) and theme 5 (parent messaged in five minutes) | quote bank |
| 6 | Availability | Real remaining capacity for December and spring | **BLOCKED, see below** |
| 7 | Pricing transparency | Three tiers named, per-dancer framing, no full grid | calculator constants |
| 8 | Objections | Short FAQ answering the real ones | `expo-assets/seminar-qa-appendix.md`, `foundervision/docs/compsync-sales-playbook.md` |
| 9 | Close | Repeat CTA, plus book-a-call fallback | |

## Copy principles applied

- **One audience, one promise, one primary action.** The March spec had two co-equal CTAs; make
  the calculator dominant and book-a-call the quiet secondary, or they split attention.
- **Show, don't claim.** The hero is footage, not an adjective. The A/B pair argues the quality
  case in 26 seconds with no copy at all, which is why it sits at position 2.
- **Specific beats superlative.** "A dance mom messaged five minutes after it went out" outperforms
  "parents love it", and it is a real quote rather than a claim we make about ourselves.
- **Name what you are not doing.** Daniel's measured voice does this and it builds trust.
- **Voice:** warm, contraction-heavy, low pressure. See `assistant/VOICE-PROFILE.md`.
  No em dashes or en dashes anywhere.

## Scarcity: real only

Daniel asked about a shrinking availability calendar. It is a strong device and it is only usable
if it is **true**. A counter that invents numbers is a lie that a studio owner can catch by asking
one question, and it would undo the trust the testimonials just built.

Genuine scarcity exists here: recital dates cluster on a small number of spring weekends, there
are **8 operators**, and two studios wanting the same Saturday cannot both be served. That is
worth stating plainly.

**Blocker:** `commandcentered.events` has no event-date column (`created_at` is row creation, not
show date). 52 bookings and 28 shifts exist and may carry real dates. Before this section is
built, decide the source of truth for "dates remaining", or replace the counter with an honest
static line about weekend capacity.

## Blocked until Daniel answers

1. **Revenue mechanics.** Laura's testimonial says money goes direct to Daniel and comes off her
   bill; the calculator says the client retains all revenue and shows profit to studio. Section 4
   is the page's central claim and cannot be written until this is settled.
2. **Testimonial consent**, per owner, by name. Section 5 runs anonymous and weaker without it.
3. **Availability data source** for section 6.
4. **Early Bird deadline is April 15, 2026 and has passed** (`page.tsx:24`). The calculator's only
   urgency lever is expired. Needs a new date for the December and spring pushes.

## Files

- NEW: `src/app/recitals/page.tsx` (or agreed route)
- NEW: section components if the page warrants splitting
- EDIT: `src/app/sitemap.ts`, nav entry
- UNTOUCHED: `src/app/dancerecital/*`

## Acceptance criteria

1. Renders at the chosen route, and a real browser screenshot is read before it is called done.
2. Primary CTA reaches `/dancerecital` and the calculator still works end to end.
3. Mobile first. Studio owners open these on a phone.
4. Hero video autoplays muted, does not block paint, and has a poster fallback.
5. Visually coherent with the existing site (dark theme, cyan accent).
6. Zero em or en dashes. Zero invented statistics, prices, or availability numbers.
7. No testimonial appears with a name until consent is confirmed.
8. Lighthouse performance checked; the hero video is the obvious risk.

## Out of scope

Rebuilding the calculator. Touching `/dance`, `/dancepromo`, `/videoproduction`. Email sequences,
social calendar, paid creative: those are separate tracks.
