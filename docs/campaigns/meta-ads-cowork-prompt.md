# Cowork prompt — Meta Ads Manager setup for the recital campaign

Paste everything below the line into Claude cowork (browser session logged into Meta Business
Suite as StreamStage). Written 2026-08-31. Fill the [BUDGET] placeholder before pasting; Daniel
sets it.

---

You are operating Meta Ads Manager in the browser for StreamStage Productions (streamstage.live),
a recital video / livestream / photography company in southwestern Ontario. Work slowly, verify
every screen before acting, and STOP AND ASK before anything that spends money or publishes.

## Phase 0 — verify the account, before anything else

1. Confirm you are in the correct Business Manager and ad account (name should reference
   StreamStage). Report the ad account ID and currency. If there is no ad account, stop and report.
2. Check Events Manager: is there a Meta Pixel installed and receiving events from
   streamstage.live? Report pixel ID and last-received event time. If no pixel exists, create one
   named "StreamStage Pixel", get the ID, and REPORT IT — the website team must install it before
   conversion campaigns can optimize. Do not proceed to conversion objectives without a live pixel;
   use traffic objective instead and say so.
3. Confirm the Facebook Page and Instagram account connected to the ad account. Report both.

## Phase 1 — campaign structure

Create ONE campaign, PAUSED (do not publish live until Daniel confirms):

- Name: `Recital-2026-Push`
- Objective: Traffic (switch to Conversions/Leads later once pixel has data)
- Budget: campaign off, ad set budgets on (ABO for testing)

Ad sets (all paused, [BUDGET]/day each):

1. `AS-GTA-owners` — Location: Toronto +80km (includes Brampton, Mississauga, Hamilton, Ancaster,
   Caledonia). Age 25–60. Detailed targeting, narrow as available: "Dance studio", "Dance teacher",
   "Studio owner", "Dance education", behavior "Small business owners" if offered. Placements:
   Instagram Reels, Instagram Feed, Facebook Reels, Facebook Feed only. No Audience Network.
2. `AS-SWO-owners` — same targeting, Location: London ON +60km, Kitchener-Waterloo +40km,
   Woodstock +40km.
3. `AS-retarget-recitals` — Custom audience: website visitors of streamstage.live/recitals in the
   last 30 days EXCLUDING visitors of /dancerecital (they saw the pitch, never priced it). Only
   create this if the pixel is live; otherwise skip and note it.

## Phase 2 — ads

Copy source: `recital-meta-ads.md` (5 concepts; use Headline A + short primary text for launch).
Creative files (upload from `D:\Shared\StreamStageCampaigns\`):

| Ad | Creative | Copy |
|---|---|---|
| `AD-reframe` | static R1 (or proof-wide-vs-close-9x16.mp4 if statics not ready) | Concept 1 |
| `AD-proof` | recital/cuts/proof-wide-vs-close-9x16.mp4 | Concept 2 |
| `AD-kerry` | recital/cuts/services-kerry-alana-9x16.mp4 | Concept 3 |
| `AD-handled` | static R4 (or services cut, Alana half) | Concept 4 |
| `AD-earlybird` | static R5 | Concept 5 |

Every ad: destination `https://streamstage.live/recitals`, CTA button "Learn More", no advantage+
creative enhancements (turn OFF automatic text/music/enhancement toggles — brand copy is exact),
URL parameters: `utm_source=meta&utm_medium=paid&utm_campaign=recital2026&utm_content={{ad.name}}`.

Put ads 1–5 in `AS-GTA-owners`. Duplicate the two best-fitting (AD-proof, AD-kerry) into
`AS-SWO-owners`. Retarget set gets AD-reframe + AD-earlybird.

## Phase 3 — report before launch

Produce a summary table: campaign / ad sets / audiences / budgets / ads / creative / status
(everything PAUSED). Screenshot the review screen. Daniel flips it live himself.

## Ongoing tweak protocol (when asked to optimize later)

- Kill an ad when: spend > 3× [BUDGET] with zero landing page views, or CTR < 0.5% after 3 days.
- Scale an ad set +20% budget when cost per landing page view trends down 3 consecutive days.
- Never edit a winning ad in place (resets learning); duplicate and change the copy variant.
- Weekly: swap in Headline B/C variants from recital-meta-ads.md when frequency > 2.5.
- Never enable Advantage+ audience expansion or automatic placements without asking.

## Hard rules

- Nothing goes live without Daniel's explicit go.
- No budget edits above [BUDGET]/day per ad set without asking.
- Destination is always streamstage.live/recitals. Never the calculator, never the homepage.
- If any screen asks to accept new terms, add payment methods, or verify the business, STOP and
  report — do not click through agreements.
