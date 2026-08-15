# Conversion research findings — landing pages + closing flow

Research pass 2026-08-15 against the local corpus: `marketingskills/skills/page-cro` (SKILL +
experiments), `skills/copywriting` (SKILL + copy-frameworks), `skills/marketing-psychology`,
`skills/form-cro`, and `amplify/docs/MARKETING-PLAYBOOK.md`.

---

## 1. THE BIGGEST FINDING: the recital form is the bottleneck, not the page

`form-cro` gives a measured cost curve for form length:

| Fields | Effect on completion |
|---|---|
| 3 | baseline |
| 4 to 6 | 10 to 25% reduction |
| **7+** | **25 to 50%+ reduction** |

**`/dancerecital` asks for 7 contact fields:** studio or organization name, contact email, contact
person, phone number, recital date, show time, venue or location. Ten `required` markers in total.

**`/dancepromo` asks for 3:** email, studio name, preferred shoot date.

So the promo funnel closes on a baseline form and the recital funnel closes on one carrying a
25 to 50% penalty. Every improvement to the recital landing page is being taxed at the last step,
and the two funnels are not comparable until this is levelled.

**This is Daniel's call, not a change to make unilaterally**, because which fields he needs in
order to quote and follow up is business logic. The question to answer per field: is this needed
*before we can help them*, or can it be asked in the reply?

Likely candidates to defer to the follow-up conversation: contact person (the email already
identifies them), phone number, show time, and venue. That would take it from 7 to 3 and put the
recital funnel on par with promo.

## 2. Page length: fixed

Both pages were long-scroll (6,415px and 5,732px). Rebuilt on the **compact landing page**
template from `copy-frameworks.md`: hero, social proof bar, three key benefits, testimonial, how
it works, final CTA. Now 2,662px and 2,588px, about 57% shorter, with value prop, CTA, mechanism
and social proof all above the first scroll.

## 3. Applied from psychology

- **Paradox of choice.** Three tiers, not seven. Already correct; do not add options.
- **Authority bias.** Client logo bar added to both pages from the 48 logos in `/public/logos-white`.
  Dance studios lead, broadcasters follow, which covers both relevance and authority.
- **Commitment and consistency / foot-in-the-door.** The calculator is the small first commitment.
  Correct structure: the page asks for a click, not a decision.
- **Regret aversion.** Close carries "nothing to book, no account, nobody calls you."
- **Scarcity.** Used only where genuine (spring weekends collide, finite crews). The corpus is
  explicit that this is tested "if genuine" only.

## 4. Not applied, and why

- **Guarantee.** The compact template ends on "final CTA with guarantee." There is no guarantee to
  state, and inventing one is not an option. **Open question for Daniel: is there one?** Even a
  soft one ("if the footage isn't usable you don't pay") would measurably help here.
- **Customer count.** "48 studios and broadcasters" would be strong social proof, but 48 is a count
  of logo files, not a verified client count. Needs confirming before it goes on a page.
- **Pratfall effect.** Admitting a small weakness raises trust, and Daniel already does this well
  from stage ("full disclosure, I'm a video vendor"). Worth adding in his voice, but it is a tone
  decision he should make rather than one to slip in.
- **Mental accounting.** Reframing per-dancer cost against the media fee charged to families is
  powerful, but any worked example means inventing a studio scenario. The calculator does this
  honestly with the studio's own numbers, which is better.

## 5. Test list once traffic exists

From `page-cro/references/experiments.md`, landing page section: message match against the source
ad or email, navigation removal, CTA repetition, page length short versus complete argument, and
social proof density and placement. Message match matters most here because four channels feed
these pages and December versus spring carry different urgency, which eventually justifies
separate variants.
