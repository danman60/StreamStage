# Recital Proposal Page — Complete Spec (scraped from old site)

Source: https://www.streamstage.live/recital-media (Squarespace)

---

## Page Title
"Recital Media Builder — StreamStage.live"

## Header Section
**H1:** Build Your Recital Proposal
**Subtitle:** Select your services, enter your dancer count, and we'll calculate a custom proposal for your recital. Submit below to receive a detailed quote within one business day.

**H2:** Professional Video, Streaming, and Photography
**Subtitle:** Complete media coverage for your dance recital with professional equipment and experienced operators

**Trust badges (inline):**
- Professional operators
- All A/V equipment provided
- Up to 4 hours consultation included
- Client retains all revenue
- 1 week turnaround

---

## Testimonials

### Testimonial 1
> Daniel and StreamStage reinvented the dance competition video model. Multi camera angles, backstage glimpses, tight close ups, and crisp graphics give teachers, dancers, and parents a high quality twist on recital media.

**Kiri Lyn Muir** — Director, Ultimate Dance Connection

### Testimonial 2
> Working with StreamStage was a dream. Dan and Kayla understood the dance world, and the content showcased our brand and studio values beautifully.

**Lainy Zimmer** — Owner, Footprints Dance Centre

---

## Service Details and Examples

### Video
- Multi camera professional recording
- 1 week turnaround time
- On screen titles per routine
- Digital download delivery
- 1 minute social highlight reel included
- **Example:** Highlight Reel (was embedded iframe — broken/blocked)

### Streaming
- Professional live streaming setup
- Viewing page hosted at streamstage.live
- Unlimited viewers worldwide
- Real time broadcast during event
- Recording available afterward
- **Example:** Livestream (was embedded iframe — broken/blocked)

### Photo
- Dedicated professional photographer
- 10 to 15 high quality stills per routine
- Professional editing and colour correction
- Digital download delivery
- High resolution images for printing
- **Example:** Google Drive photo gallery link: https://drive.google.com/drive/folders/1z29h5xcQXbo7-XatenCqtfJdHzmuiI0d?usp=drive_link

---

## Pricing Model

**Rule:** Pricing adjusts automatically by dancer count, higher volumes receive greater discounts.

### Tier 1: Small Recital (0–100 dancers)
| Service | Price |
|---------|-------|
| Video | $25/dancer |
| + Streaming | +$5/dancer |
| + Photo | +$8/dancer |
| **All 3 bundle** | **$35/dancer** |

Note: "Standard pricing"

### Tier 2: Medium Recital (100–150 dancers)
| Service | Price |
|---------|-------|
| Video | $25/dancer |
| + Streaming | +$3/dancer |
| + Photo | +$7/dancer |
| **All 3 bundle** | **$30/dancer** |

Note: "Volume discount applied"

### Tier 3: Large Recital (150+ dancers)
| Service | Price |
|---------|-------|
| Video | $18/dancer |
| + Streaming | +$2/dancer |
| + Photo | +$5/dancer |
| **All 3 bundle** | **$22/dancer** |

Note: "Best value at scale"

---

## Interactive Calculator

### Step 1: Dancer Count
- Input: Number spinner, default 50
- Label: "How many dancers will be performing"
- Helper: "This sets your pricing tier and per dancer rates"

### Step 2: Service Selection
- **Video** (required) — price shown dynamically based on tier
- **Streaming** — add-on price shown dynamically
- **Photo** — add-on price shown dynamically
- **All 3 Package** — bundle price shown dynamically

### Step 3: Available Discounts (stackable, up to 15%)
1. **Early Bird** — "Book before January 1, 2025" — 5% OFF *(NOTE: DATE IS EXPIRED, needs updating)*
2. **Testimonial** — "Share your experience" — 5% OFF
3. **3-Year Loyalty** — "Commit to 3 years with StreamStage" — 5% OFF each year

### Investment Summary (calculated live)
- Number of Dancers: [from input]
- Pricing Tier: [auto from dancer count]
- Selected Services: [from selection]
- Subtotal: [calculated]
- Discounts Applied: [if any checked]
- **Total Investment:** [calculated]
- Fee per Dancer: [total / dancers]
- Suggested Media Fee: [fee per dancer * 1.2, i.e. 20% markup suggestion]
- Your Media Fee: [editable input, defaults to suggested]
- **Profit to Studio:** [(media fee - fee per dancer) * dancers]

### Pricing Calculation Logic
```
// Determine tier
if (dancers <= 100) tier = "small"
else if (dancers <= 150) tier = "medium"
else tier = "large"

// Base prices by tier
const prices = {
  small:  { video: 25, streaming: 5, photo: 8, bundle: 35 },
  medium: { video: 25, streaming: 3, photo: 7, bundle: 30 },
  large:  { video: 18, streaming: 2, photo: 5, bundle: 22 },
}

// If all 3 selected, use bundle price instead of sum
if (allThreeSelected) {
  perDancer = prices[tier].bundle
} else {
  perDancer = sum of selected service prices
}

subtotal = perDancer * dancers

// Discounts (stackable, each 5%)
discountPercent = (earlyBird ? 5 : 0) + (testimonial ? 5 : 0) + (loyalty ? 5 : 0)
total = subtotal * (1 - discountPercent / 100)

feePerDancer = total / dancers
suggestedMediaFee = feePerDancer * 1.2  // 20% markup
profitToStudio = (userMediaFee - feePerDancer) * dancers
```

---

## CTA: Pick Your Date
**Button text:** "Pick Your Date"
**Urgency copy:** "Peak recital season fills quickly. Secure your date before it's gone."

---

## Submission Form

**H3:** Submit Your Proposal

### Form Fields
1. **Studio or Organization Name** — text input
2. **Contact Email** — text/email input
3. **Contact Person** — text input
4. **Phone Number** — text input
5. **Recital Date** — date picker ("Click to select")
6. **Number of Shows** — dropdown: 1 Show, 2 Shows, 3 Shows, 4 Shows
7. **Show Times** — text inputs (one per show, dynamically added based on show count)
   - "Show 1 Time", "Show 2 Time", etc.
8. **Venue or Location** — text input
9. **Additional notes or special requirements** — textarea

**Note below show fields:** "No additional surcharge" (for multiple shows)

**Submit button text:** "Submit Proposal"

### Form Submission
- Currently wired to N8N webhook (no `<form>` tag — JS-based submission)
- **New approach:** Next.js API route → sends formatted HTML email to Gmail (danieljohnabrahamson@gmail.com)
- Email should include: all form fields + the full investment summary (services, dancer count, tier, discounts, total, media fee, profit)

---

## Footer
- **StreamStage** — Canada's premiere video and livestream support team
- Event broadcasts, virtual events, and technical solutions
- daniel@streamstage.live | StreamStage.live
- © Copyright 2026 Stream Stage Productions Inc. All rights reserved.

---

## Assets to Replace
- Embedded video iframes (broken) → use R2-hosted recital videos instead
- Photo gallery link → keep Google Drive link or host samples
- Early bird date → update to current season deadline
- Privacy Policy link → update from Squarespace URL to streamstage.live
