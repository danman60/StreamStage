# Campaign open items, 2026-08-17 execution plan

**This exists so that** the recital campaign can go live the first week of September with the four
buildable blockers cleared and the one business-logic blocker answered.

Daniel picked "all of these" on 2026-08-17 from the six carried open items, and chose
`StreamStage/docs/campaigns` as the home for the playbooks.

---

## Item 0: playbooks migrated. DONE.

`recital-campaign-PLAYBOOK.md`, `contentday-campaign-PLAYBOOK.md` and
`2026-Q-recital-campaign-CONTEXT.md` now live in `docs/campaigns/`. The amplify copies carry a dead
banner pointing here. `2026-08-15-recital-landing-page-build.md` had its context reference updated.
`ASSET-MANIFEST.md` stays at `/mnt/firmament/StreamStageCampaigns/` beside the assets it describes,
byte identical to the amplify copy (md5 `a42d6a24`).

## Item 1: landing page third pass

**Problem:** `/recitals` runs 172 words per screen, `/recitals-b` runs 33 to 35, and the measured
reference band from Vanta, Framer, Attio and Linear is 64 to 104. Neither is in the band, so this is
a third pass rather than an A or B pick.

**Step 1, re-measure before touching anything.** The 172 and 33 figures are inherited from a prior
session. Render both routes in a real browser at a phone viewport and at desktop, count words per
viewport height, and record the numbers. If the inherited numbers are wrong, the target changes.

**Step 2, build the third pass on the `/recitals` route.** Keep the arguments of the long variant,
cut to the density of the short one. Nothing new invented: every claim already exists in the current
page, the calculator, or the quote bank.

**Acceptance:**
1. Measured 64 to 104 words per screen, reported as a number per screen, not an average that hides a
   dense hero.
2. Primary CTA still reaches `/dancerecital` and the calculator still works.
3. Real browser screenshot read before it is called done, mobile viewport first, DM'd.
4. Zero em or en dashes. Zero invented statistics, prices or availability numbers.
5. No revenue-mechanics claim until item 4 is answered. Copy is written so that section can drop in
   without a rewrite around it.

## Item 4: revenue mechanics. BLOCKED ON DANIEL, asked 2026-08-17.

Verified at the primary source, both claims are live in the material:

- `/mnt/firmament/StreamStageCampaigns/recital/quotes/quote-sheet.md:19`, Laura Ramsey: "The portal
  is branded for my studio, the money goes direct, it comes off my bill."
- `src/app/dancerecital/page.tsx:277` "Client retains all revenue", with `:600` "Profit to Studio"
  and `:579` "Suggested Media Fee".

**Correction to the inherited claim:** this contradiction is NOT currently on the live `/recitals`
page. That page names Laura only in a studio list at `:238-241` with no revenue claim attached. So
it gates playbook copy, email copy and the landing page's revenue section, not a live page defect.

Cannot be resolved by reading code. It is how the money actually moves, which is Daniel's to state.

## Item 5: cold email unblock

Opens arm 3 permanently: 355 `kwc-scrape-2026-03` leads, Kitchener, Waterloo, Cambridge. The 100
`amplify_comps` leads stay held out, wrong audience.

CASL requires a working unsubscribe on every commercial message to a cold Canadian contact. Per the
playbook, `commandcentered.email_suppressions` and `unsubscribe_tokens` exist and are empty.

**Verify first, then build.** The table state is an inherited claim; query it. The endpoint belongs
in CommandCentered, which owns the CRM and every send decision, so this is cross-repo work and does
not get deployed from here.

Steps: confirm the tables and their columns against the live database, generate one token per lead,
stand up the unsubscribe endpoint, wire the footer link, honour suppression on send.

**Acceptance:** a real token resolves at the real endpoint, the row lands in `email_suppressions`,
and a send path check confirms a suppressed address is skipped. Read the last hop, not the row that
precedes it.

## Item 6: week 2 Reel A cut

Source verified present: `expo-assets/kiosk/media/publish-set/streamstage-services.mp4`, 197 MB,
1920x1080, 181s. Named director testimonials from Laura Ramsey and Alana Colver captioned on screen,
over lower thirds reading RECITAL FILMS, 10-day turnaround, Multi-camera capture.

Needs a reel-length cut, reframed to 9:16. Landscape to vertical is production work, not a crop
decision to guess at: the captions and lower thirds are placed for a 16:9 frame and will be cut off
by a naive centre crop.

**Acceptance:** frames extracted and looked at before any segment is chosen, no on-screen text
clipped in the 9:16 output, output lands in `/mnt/firmament/StreamStageCampaigns/recital/video/cuts/`
alongside the four already built there, and the playbook week 2 row is updated to name the built file
the way weeks 1, 3 and 4 already do.

## Item 2 and item 3, unchanged and not in this plan

Item 2, what counts as local: 3 of 104 clients carry a city. Needs either an answer or a backfill.
Item 3, paid ads: needs an ad account, a budget number and audience definitions from Daniel. Nothing
on that arm can start without them.

## Rules carried into every step

No em dashes or en dashes anywhere, including this file. Never paste calculator URLs into
client-facing copy, link the landing pages. Recital and content day stay separate campaigns with
separate proof. Never post the five `example-*.mp4` clips. Deploys are gated on Daniel's explicit go.
