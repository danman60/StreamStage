# Recital Campaign: execution playbook

**Product:** we shoot your recital.
**Season:** **May and June** is the primary. **December** winter shows are a secondary catch.
**Live by:** first week of September 2026.
**Landing page:** `streamstage.live/recitals` -> `/dancerecital` calculator.
**Assets:** `D:\Shared\StreamStageCampaigns\recital\`
**Witnesses:** Kerry Moore, Mandy London, Alana Colver, Laura Ramsey, Nicole, Christina Canella.

**Execution is manual.** PA drafts, Daniel edits and sends, Daniel posts. Amplify is retired and is
not an execution surface. Volume is bounded by Daniel's week, so every list here is ranked, never
blasted.

**Rewritten 2026-08-16.** The previous version was built on an October content-day spine and on
"run December first, start spring in January." Both were wrong. October belongs to a Calgary
weekend Daniel works manually and is not part of any campaign in this folder.

---

## The four arms Daniel asked for

| # | Arm | Audience | State |
|---|---|---|---|
| 1 | Email, rebooking | Existing customers | Ready |
| 2 | Email, warm | Leads close to buying | Ready |
| 3 | Email, cold | Never heard of us | **BLOCKED, CASL** |
| 4 | Social, organic | People who have not worked with us | Ready |
| 5 | Paid ads | Same as 4 | **BLOCKED**, no ad account, budget or audiences |

Arms 4 and 5 aim at the same person on purpose. Organic earns the room, paid buys reach into it.

## Two clocks, one campaign, both selling from September

| | December winter show | May / June recital |
|---|---|---|
| Distance from Sept 1 | ~3 months | ~8-9 months |
| Buyer state | deciding now, show is close | planning the season |
| Message | we can still take your December date | lock it before the spring rush |
| Volume | small, a subset of studios run a winter show | the main event |

Both are sold from the same September launch. December is the near-term revenue and the proof that
the campaign works; May and June is where the volume is. Do not sequence them apart, because a
studio deciding on December is the same person deciding on June, and splitting them means mailing
the same owner twice with two different framings.

## The urgency lever

**Early Bird is December 31, 2026** (`StreamStage/src/app/dancerecital/page.tsx:24`, changed
2026-08-16 from an expired April 15 2026). It is 5% off, stacking with the Testimonial and 3-Year
Loyalty discounts to a 15% cap.

This is now the only real deadline in the funnel, and it is a genuinely good one, because it lands
before both seasons: a studio booking a December show and a studio booking a June show both have
to decide before the same date. Every arm can carry it honestly.

## The one thing this campaign has to do

Move the recital video from a cost the studio absorbs to a line it earns on. The calculator already
computes **Suggested Media Fee** and **Profit to Studio** and says "Client retains all revenue."
**You charge the media fee, we bill per dancer, you keep the spread.** Nobody else in the market
states this. Every arm carries it.

**Open, and it gates the revenue copy:** Laura Ramsey's testimonial says the money goes direct to
Daniel and comes off her bill, while the calculator frames the studio as collecting the fee and
keeping the profit. Two different mechanics. Which is current, and is it the same for every studio?

---

## Arm 1: Email, rebooking existing customers

**Audience: 80 clients with an email and at least one event with us.** They have seen the work.
Shortest path to revenue in the whole campaign.

Ranked:

1. **`lifecycle_stage = 'rebooking'`, 7 clients.** Already flagged as due. Start here, same day.
2. **`lifecycle_stage = 'delivered'`, 13 clients.** Job finished, nothing booked since. The natural
   "same again for the spring?" note.
3. **The remaining ~60 with events.** Everyone else who has shot with us.
4. **Recital-adjacent clients who have only bought promo work.** They know the quality, they have
   never bought this product.

**Three touches:**

| # | Angle | Asset |
|---|---|---|
| 1 | Your date, our board. One ask, names the season | link `/recitals` |
| 2 | The revenue reframe in one paragraph | the wide-versus-close pair |
| 3 | Early Bird closes Dec 31, weekends collide | plain text |

Never paste the calculator URL. Link the landing page, which offers the calculator itself.

## Arm 2: Email, warm leads

**Audience: 38 leads.** `engaged` 25, `contacted` 8, `proposal_sent` 5. Conversation already
started, so this is a re-open and not an introduction.

`proposal_sent` (5) goes first: they have seen a number. Those five are the highest-intent contacts
in the entire campaign and should be handled personally, not on a sequence.

**Suppress the 9 leads whose email already matches a client row.** Otherwise they get a cold pitch
for something they have already bought.

## Arm 3: Email, cold, never heard of us, BLOCKED

**Audience on paper: 455 leads with status `new`.**

| Source | Count | Verdict |
|---|---|---|
| `kwc-scrape-2026-03` | 355 | **This is the local list.** Kitchener, Waterloo, Cambridge |
| `amplify_comps` | 100 | **Hold out.** Competition organizers, not studio owners. Wrong audience for a recital offer |

So the real cold recital list is roughly 355, not 523.

**The blocker is hard and it is legal, not technical judgment.** That list carries **1 suppression
record and 0 unsubscribe tokens**. CASL requires a working unsubscribe on every commercial message
to a cold Canadian contact. The tables exist (`commandcentered.email_suppressions`,
`unsubscribe_tokens`) and are empty.

**Unblocking it is build work, not a decision:** generate a token per lead, stand up the unsub
endpoint, put the link in the footer, honour it on send. Roughly 2 hours, and it opens the arm
permanently. Daniel's call whether to spend it.

When it opens: send in tranches of 20 to 40 that Daniel can personally handle. Landing page as the
only link. Frameworks in `marketingskills/skills/cold-email/references/`.

## Arm 4: Social, organic, aimed at people who have not worked with us

This arm is prospecting, not nurture, so **reels carry it**. Reels reach non-followers first,
carousels reach existing followers, stories reach followers only. An audience that has never
worked with us is by definition not following us yet.

| Format | Job here | Use |
|---|---|---|
| Reels | Reach strangers | The wide-versus-close pair, highlights, short cuts |
| Carousels | Convert the ones who followed | The revenue explainer, quote cards |
| Stories | Capture leads from followers | Point at `/recitals`, the checklist handout |

**Four-week rotation, repeatable, no dates in any of it. Every clip verified by frame 2026-08-16,
full detail in `ASSET-MANIFEST.md`:**

| Week | Reel A | Reel B | Carousel | Stories |
|---|---|---|---|---|
| 1 | **`cuts/proof-wide-vs-close-9x16.mp4`** (V, 34s, BUILT) | `reel-lds-showtime` (V, 55s) | The revenue explainer, you keep the spread | gallery + ticketing screenshots |
| 2 | **`cuts/services-kerry-alana-9x16.mp4`** (V, 27s, BUILT 2026-08-17) | `reel9-09-jj` (V, 32s) | Kerry: a dance mom messaged in five minutes | Early Bird, Dec 31 |
| 3 | `cuts/reel-grad-dtl-nodate.mp4` (V, 58s, BUILT) | `cuts/recital-lhl-act1-9x16.mp4` (V, 45s, BUILT) | What families actually receive, a link not a disc | recital checklist handout |
| 4 | `cuts/reel-7att-9x16.mp4` (V, 45s, BUILT) | `gdo-slowmo` (V, 31s) | Mandy: one thing I did not have to think about | poll: who films your recital now |

`V` = already vertical, post as is. `L` = landscape, **needs reframing to 9:16 first.**

**Four constraints this rotation is built around, all verified:**

1. **`kmsd-highlight` is removed from week 1.** It is byte-identical to
   `contentday/video/promo-kmsd-full.mp4`, which content day schedules in its own week 1. Posting
   both would put the same video out twice in one week under two names. It also opens on roughly
   15 seconds of near-black, which is fatal for a reel regardless.
2. **`reel-grad-dtl` opens on a hard-dated title card**, "Dancing Through Life, Sunday June 14
   2026, Wilfrid Laurier University". Trim it off the front or the evergreen rotation announces a
   past date every time it loops.
3. **`gdo-slowmo` is competition footage, not recital.** Backdrop reads Global Dance Canada. It is
   in as motion for a Reel B slot, not as recital proof, and no caption should call it a recital.
   `reel9-08-gdo` is the same footage re-encoded, so never schedule both.
4. **`streamstage-services` is the strongest recital asset available, and the week 2 cut is built.**
   Source: `expo-assets/kiosk/media/publish-set/streamstage-services.mp4`, 1920x1080, 181s. It is a
   booth composite, not a film: a talking-head oval on the left, a rotating content panel on the
   right, a name card and burned-in captions bottom left, and **a booth QR reading "Free Dance Studio
   Video Plan" plus a dated CALGARY DANCE TEACHER EXPO AUGUST 11-12 2026 panel on the right side.**
   A centre crop or a letterboxed 9:16 publishes both of those, so neither is usable.

   **Built 2026-08-17: `cuts/services-kerry-alana-9x16.mp4`**, 1080x1920, 26.9s, cut from source
   64.9s to 91.75s, both cut points landing between speakers. Crop window 506x900 at x=330 y=110 of
   the 1920x1080 source, upscaled to 1080x1920. That window keeps the speaker, the name card and the
   captions, and excludes the QR, the Calgary panel, the top chip row and the lower third, all four
   of which would otherwise be clipped or dated. Content: Kerry Moore, "one of our dance moms,
   probably five minutes later, I'm getting a message from her saying this video is awesome, she saw
   the difference immediately, your footage is just phenomenal, they're going to look back when
   they're 40, 50 years old and go look at me", then Alana Colver, "on the day of our recital Daniel
   showed up, he said hello, I asked him if he had anything he needed from me, and he said nope, and
   just went right to work."

   **The Laura Ramsey passage at source 44s to 64s is deliberately NOT in this cut.** On camera she
   says the portal is branded for her studio and the money goes direct, which is the exact revenue
   mechanic still open below. Nothing carrying that claim ships until it is settled.

   **Path note:** the built cuts live at `StreamStageCampaigns/recital/cuts/`, not
   `recital/video/cuts/`. The table above writes them `cuts/<name>` for that reason.

**Recital only has 5 usable vertical clips** against 7 landscape, so this campaign is reframe-bound
in a way content day is not. Every landscape slot above is a production job before it is a post.

**The single strongest post available:** `recital-wide` and `recital-multicam`, the same 34 seconds
of the same routine, one locked wide from the house and one cutting close, posted together. It
argues the whole case with no copy. Lead week one with it.

**Do not use `angle-room` or `angle-faces` as a pair.** Verified against the frames 2026-08-16:
`angle-room` is a Footprints studio class, `angle-faces` is a mixed recital recap. Different
shoots. `angle-room` belongs to the content day campaign.

Hooks come from `amplify/docs/transcripts/INDEX-iamchrischung.md`. Before writing captions, run the
observable-moments pass: ask for 50 specific, nuanced, observable moments a studio owner
experiences around recital day, ranked common to niche. Never ask for "viral ideas".

## Arm 5: Paid ads, BLOCKED

Daniel wants paid running alongside organic. Creative is ready: the wide-versus-close pair is the
obvious first ad and needs no copy to work. Destination is `/recitals`. Structure per the 5x5
creative matrix in `MARKETING-PLAYBOOK.md`. Retarget `/recitals` visitors who never reached
`/dancerecital`.

**Needs from Daniel before anything starts:** which ad account, whose budget and what monthly
number, and audience definitions. None are confirmed. Nothing on this arm can begin without them.

---

## What will cost the most if ignored

**`/dancerecital` asks for 7 contact fields where `/dancepromo` asks 3.** Measured 25 to 50%
completion penalty at exactly the step where the money is. Every dollar of paid spend driving to
`/recitals` is taxed there, which makes this cheaper to fix than any other work in this file.
Candidates to defer to the reply rather than the form: contact person, phone, show time, venue.
Business logic, so it is Daniel's call.

## Open

- **What counts as local.** Geography is not in the CRM: 3 of 104 clients have a city or province.
  `kwc-scrape` covers the cold list, but the client and warm segments cannot be filtered by region
  until this is answered or backfilled.
- **Landing variant.** `/recitals` measures 172 words per screen, `/recitals-b` measures 33 to 35.
  The measured reference band from Vanta, Framer, Attio and Linear is 64 to 104. Neither variant is
  in it, so this is not an A-or-B choice, it is a third pass.
- Revenue mechanics: Laura's version versus the calculator's.
- Cold email opt-out handling.
- Paid social account, budget, audiences.
- Availability data, if "dates remaining" is ever to be a true number. `events.created_at` is the
  row date, not the show date, so there is currently no honest source for it.
