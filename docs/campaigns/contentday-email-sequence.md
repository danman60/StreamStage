# Content day campaign, email sequence

Drafted 2026-08-17. Three touches, one warm audience plus the shared cold list.
**Daniel sends every one of these himself.**

Voice per `assistant/VOICE-PROFILE.md`. Contractions by default, warm, one ask, offer-shaped close.
No em dashes or en dashes.

**Rules baked into these drafts:**

- **Evergreen. No dates, no seasons, no deadlines, no countdowns.** These have to read the same in
  January and in August. There is no Early Bird here and nothing should imply one.
- The link is always `streamstage.live/contentday`. Never the `/dancepromo` URL.
- No recital material: no media fee, no per dancer pricing, no recital day quotes. Different offer.
- Never reference the five `example-*.mp4` clips as our work. They are other accounts' posts.

Merge fields: `{{first}}`, `{{studio}}`, `{{unsubscribe_url}}`.

---

# Channel 1: warm email

**Order:** studios who have already done a content day first (Tiffany, Footprints, KMSD, CSOD, DIS,
WSDY), then everyone who has shot a recital with us but never a content day, then inbound and
referral as they arrive. Suppress the 9 leads whose email matches a client row.

## Touch 1: what it actually is

**Subject options**
1. One morning, a year of content
2. The content day
3. Something worth stealing an hour for

```
Hi {{first}},

Quick idea for {{studio}}.

Most studios make content the exhausting way. Shoot something, edit it, post it, then do it all
again tomorrow. It eats the whole season and because it's piecemeal it ends up looking piecemeal.

A content day is the other way round. We come in for a morning, shoot the room properly, and you
walk away with a library you pull from all year. One clip can become nine posts.

It's all laid out here, including what it costs:
streamstage.live/contentday

Happy to talk through what your year would look like if that's useful.

Looking forward to it,
```

## Touch 2: the nine posts idea, about 8 days later if quiet

**Subject options**
1. One clip, nine posts
2. The math on a content day
3. Worth two minutes

```
Hi {{first}},

The bit that convinces most people isn't the shoot, it's what happens after.

One good clip from a content day gets cut into a reel, a carousel, a story set, a class promo, a
teacher spotlight and a few filler posts. Same morning of footage, months of material. Tiffany
Adoranti at Caledonia School of Dance said she looks at her raw footage about once a week just to
ask what she can pull out and post today.

Pro footage doesn't replace what your teachers and dancers film on their phones either. It's the
well you draw from when nobody has time to shoot anything.

streamstage.live/contentday

No pitch attached to this one, just thought you'd find it useful.

Talk soon,
```

## Touch 3: the walkthrough offer, about 2 weeks later

**Subject options**
1. Want me to map your year?
2. Happy to sketch this out for you
3. Last one from me

```
Hi {{first}},

Last one from me on this.

If you want, send me what you're posting now and roughly what you wish you were posting, and I'll
sketch out what a single content day would give {{studio}} across a year. Costs you nothing and
you can throw it in the bin if it's not useful.

That's yours to keep either way, no strings and nothing owed.

streamstage.live/contentday

All the best,
```

---

# Channel 3: cold

Shares the recital cold list and the same CASL blocker. Same rule: **no send until an unsubscribe
link has been clicked and verified in production.** `amplify_comps` stays held out, wrong audience.

**Which campaign gets a cold contact?** One offer per person. A studio that runs recitals gets the
recital sequence, because that is the bigger and more time bound purchase. Content day cold sends
go only to studios that were already touched by the recital sequence and did not bite, and never
inside the same month.

## Touch 1: the introduction

**Subject options**
1. Video for {{studio}}
2. A year of content from one morning
3. A question about your studio's video

```
Hey there,

I'm Daniel, I run StreamStage out of Ontario. We shoot dance studios, and the thing most owners
tell me is that content is the job that never ends. Shoot it, edit it, post it, repeat, until
February when everyone quietly stops.

We do it as one morning instead. We come to your studio, shoot classes, teachers, the space and
whatever else you want on camera, and you get a library to post from for the rest of the year.

Everything's published here, pricing included:
streamstage.live/contentday

If it's not for you, no hard feelings at all.

All the best,
Daniel

You're getting this because {{studio}} is a dance studio in Ontario. One click and I'll never write
again: {{unsubscribe_url}}
```

## Touch 2: the proof, about 8 days later, only if touch 1 got no reply

**Subject options**
1. What a content day actually produces
2. Have a look at this
3. 60 seconds, then I'll leave it

```
Hey there,

Following up once, then I'll leave it alone.

Easiest way to explain a content day is to watch what comes out of one. There's a finished studio
promo on the page, shot in a morning, and it's the sort of thing you'd normally only get for a
launch or a rebrand.

streamstage.live/contentday

Tiffany Adoranti at Caledonia said the promo captured everything, and that it elevated their brand.
That's the whole idea: do the hard thing once and let it pay you back all year.

All the best,
Daniel

Not interested? {{unsubscribe_url}}
```

## Touch 3: the close, about 2 weeks later

**Subject options**
1. Your studio, one morning
2. Last note from me
3. Happy to sketch it out

```
Hey there,

Last note from me, promise.

If you tell me roughly how many classes you run and what you wish you were posting, I'll come back
with what one content day would give {{studio}} over a year. No obligation and nothing owed.

streamstage.live/contentday

Thanks for reading either way!

All the best,
Daniel

Done hearing from me? {{unsubscribe_url}}
```

---

## Notes for whoever sends these

- Nothing in this file mentions a month, a season or a deadline. That is deliberate and it is the
  one rule that makes the sequence reusable forever. If a date creeps in, the campaign stops being
  evergreen and starts needing maintenance.
- Touch 3 is where the old version said "dates filling, last call". It closes on a conversation
  instead, because there is no honest deadline on this offer.
- Every quote used is in `contentday/quotes/quote-sheet.md`. Consent is handled.
- Do not paste the builder URL. The landing page offers it one click deeper, chosen by someone who
  already believes.
