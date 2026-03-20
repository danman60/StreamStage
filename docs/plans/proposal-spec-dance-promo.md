# Dance Promo Proposal Builder — Complete Spec

Source: https://www.streamstage.live/proposal-builder-dance
Page Title: "Dance Promo Proposal Builder — StreamStage.live"

---

## Header
**H1:** Build Your Perfect Video Package
**Subtitle:** Select production elements and deliverables. Dynamic pricing with automatic discounts.

**Trust badges (inline):**
- One revision per deliverable
- 6-8 week delivery
- 3-hour consultation included

## Testimonial
> "Working with the team at Stream Stage has been a dream! Both Dan and Kayla are knowledgeable about the dance world and were easy to work with when creating our vision. The content created showcased our brand and studio values incredibly well. I would highly recommend."

**Lainy Zimmer** — Owner of Footprints Dance Centre

---

## Shoot Length
**Label:** Base: 3hrs, +10%/hr

| Option | Modifier |
|--------|----------|
| 3hrs | (Base) |
| 4hrs | (+10%) |
| 5hrs | (+20%) |

**Logic:** The shoot length modifier applies to the total (production elements + deliverables). 3hrs=1.0x, 4hrs=1.10x, 5hrs=1.20x.

---

## Production Elements

**Pricing:** 1st camera: $750, each additional: +$150. All cameras capture full shoot length.

### Camera Options (toggleable, multi-select):
1. **Gimbal-Operated Movement Camera** — Roaming movement for dynamic b-roll footage. Captures full shoot length.
2. **Interview Camera** — Lighting and audio for testimonials and interviews. Captures full shoot length.
3. **Selfie Studio** — Unmanned station for self-recorded content. Captures full shoot length.

**Pricing Logic:**
- 0 cameras: $0
- 1 camera: $750
- 2 cameras: $900 ($750 + $150)
- 3 cameras: $1,050 ($750 + $150 + $150)

---

## Video Deliverables

### 1. 30-Second Vertical Video
- Portrait format, social-ready content
- **$175 each**
- Quantity selector (- / + buttons)
- Example: "Hype Danz Social"

### 2. 1-Minute Brand Story
- Uses all footage to create a captivating brand story video
- **$350 each**
- Quantity selector (- / + buttons)
- Examples: "Dance In Style", "Elite Dance", "Impact Dance" (tabbed examples)

### 3. 10-Second Vertical Video
- Micro clip for hooks and teasers
- **$100 each**
- Quantity selector (- / + buttons)
- Example: "DISReel2"

### 4. Raw Footage Package (toggle, not quantity)
- All raw video captured for client remix and use
- **$250** (flat)

---

## Volume Discounts
Automatic, based on subtotal:
- $0–$1,249: No discount
- $1,250–$1,749: 10% discount
- $1,750–$2,249: 15% discount
- $2,250+: 20% discount

**Progress indicator:** "Add $X more to unlock Y% savings"

---

## Pricing Calculation Logic

```
// Production Elements
if (cameras === 0) elementsCost = 0
else elementsCost = 750 + (cameras - 1) * 150

// Video Deliverables
deliverablesCost = (qty30s * 175) + (qty1min * 350) + (qty10s * 100) + (rawFootage ? 250 : 0)

// Subtotal before shoot length modifier
subtotal = elementsCost + deliverablesCost

// Apply shoot length modifier
if (shootLength === 4) subtotal *= 1.10
if (shootLength === 5) subtotal *= 1.20

// Volume discount
if (subtotal >= 2250) discount = 0.20
else if (subtotal >= 1750) discount = 0.15
else if (subtotal >= 1250) discount = 0.10
else discount = 0

total = subtotal * (1 - discount)
// +HST (13%) shown but not calculated into total
```

---

## Investment Summary (live calculated)
- Shoot Length: X hours
- Production Elements (N cameras): $X
- Video Deliverables: $X
- Subtotal: $X
- [Discount line if applicable]
- **Total Investment: $X +HST**
- Volume discount progress bar

---

## Submission Form
**H2:** Submit Your Proposal

### Form Fields:
1. **Email address** — text/email input
2. **Studio name** — text input
3. **Preferred shoot date** — date picker (optional)
4. **Start time** — dropdown with 30-min increments: 8:00 AM through 6:00 PM
5. Label: "Optional: Preferred shoot date and start time"

**Submit button:** "Submit Proposal"

---

## Terms & Conditions
- Standard delivery timeline: 6-8 weeks
- All prices in CAD + HST
- 50% deposit required to commence
- Final payment due upon delivery
- Social media optimization included
- Professional color grading and audio mixing

---

## Key Differences from Recital Proposal
- No per-dancer pricing — this is project-based
- Production elements (cameras) + deliverables model
- Shoot length modifier (hourly surcharge)
- Volume discounts instead of stackable percentage discounts
- Simpler form (no venue, no show count, no media fee concept)
- +HST shown (recital page doesn't mention tax)
