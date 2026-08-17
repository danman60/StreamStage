# Recital campaign, email sequence

Drafted 2026-08-17. Three touches, three audiences. **Daniel sends every one of these himself.**

Voice per `assistant/VOICE-PROFILE.md`: contractions by default, warm, one ask, offer-shaped close.
`do not`, `it is` and `you are` never appear. No em dashes or en dashes anywhere.

**Rules baked into these drafts:**

- The link is always `streamstage.live/recitals`. Never the calculator URL.
- The revenue line stays a reframe, never an explanation of how the money moves. You charge the
  media fee, we bill per dancer, the difference is yours. Nothing about who collects from families
  or how it settles.
- Early Bird is December 31 2026 and it is real, 5 percent, stacking with the testimonial and
  3 year loyalty discounts to a 15 percent cap.
- May and June is the main season. December winter shows are the near term catch. Both are sold now.
- Cold sends carry the unsubscribe line. Warm and client sends do not need it.

Merge fields: `{{first}}`, `{{studio}}`, `{{unsubscribe_url}}`.

---

# Arm 1: rebooking existing clients

**Order:** `lifecycle_stage = rebooking` (7) same day, then `delivered` (13), then everyone else
with an event on record (26 clients have one), then recital adjacent clients who have only bought
promo work.

## Touch 1: your date, our board

**Subject options**
1. Your spring date
2. Booking the spring board now
3. Are you doing a spring recital this year?

```
Hi {{first}},

We're putting the spring board together and I wanted to check in with you before it fills up.

If you're running a recital in May or June, send me the date and roughly how many dancers you
expect and I'll come back with what it'd look like. If you've got a December show instead, we can
still take those.

Everything's published here, pricing included, so you can look at it without talking to anyone:
streamstage.live/recitals

Happy to hold a date while you think about it, no rush.

Looking forward to it,
```

## Touch 2: the reframe, about 6 days later if quiet

**Subject options**
1. The part most studios miss
2. Your media fee
3. One thing worth knowing before you decide

```
Hi {{first}},

Quick thought, and then I'll leave you alone about it.

Most studios treat the recital video as a cost. It doesn't have to be. You set the media fee your
families pay, we bill you per dancer, and the difference is yours. For a lot of the studios we
work with it's the one line on recital day that comes back positive.

There's a calculator on the page that'll show you your own numbers in about a minute. Nothing to
book, no account, nobody calls you.

streamstage.live/recitals

Have a look and tell me what's wrong with it!

Talk soon,
```

## Touch 3: Early Bird, about 2 weeks later

**Subject options**
1. Early Bird closes December 31
2. Before the spring rush
3. Two things worth knowing

```
Hi {{first}},

Two quick things.

EARLY BIRD
It's 5 percent off and it closes December 31. It stacks with the testimonial and loyalty discounts
if those apply to you.

WEEKENDS
Spring recitals all land on the same handful of Saturdays, and we've got a finite number of crews.
Two studios wanting the same date is the one problem I can't solve, so earlier is genuinely better.

If you send me your date I'll tell you straight away whether we can cover it.

streamstage.live/recitals

All the best,
```

---

# Arm 2: warm leads

40 leads: engaged 27, contacted 8, proposal sent 5. **The 5 with a proposal already sent get a
personal note from Daniel, not this sequence.** Suppress the 9 whose email matches a client row.

## Touch 1: picking the thread back up

**Subject options**
1. Picking this back up
2. Your recital, when you're ready
3. Still happy to help with the recital

```
Hi {{first}},

We talked a while back about filming your recital and I never want to be the guy who chases, so
this is the last time I'll bring it up unprompted.

We're booking spring dates now, and December if you run a winter show. If you want to see what it
would cost for {{studio}}, it's all published here with a calculator that does it with your own
numbers:

streamstage.live/recitals

If the timing's wrong that's completely fine, just say and I'll get out of your inbox. :)

Talk soon,
```

## Touch 2: the proof, about 8 days later

**Subject options**
1. Same routine, two cameras
2. What the difference actually looks like
3. Worth 30 seconds of your time

```
Hi {{first}},

Rather than tell you the difference, easier to show you.

Same routine, same night, same stage. One camera locked off at the back of the house, the other
cutting in close. That gap is the whole reason families buy the video, and it's on the page:

streamstage.live/recitals

Kerry Moore put it better than I can. One of her dance moms messaged her about five minutes after
the video went out to say it was awesome. She saw the difference immediately.

Happy to walk through any of it with you.

Looking forward to it,
```

## Touch 3: the offer close, about 2 weeks later

**Subject options**
1. Your date, then I'll stop
2. Want me to check your date?
3. Last one from me

```
Hi {{first}},

Last one from me on this.

If you send me your recital date and a rough dancer count, I'll come back with exactly what it
would look like for {{studio}}, no obligation attached to it. If we can't cover the date I'll tell
you that too.

Early Bird is 5 percent and closes December 31, so there's a real reason not to sit on it.

Either way, thanks for the time.

All the best,
```

---

# Arm 3: cold, 349 leads, status new

**Blocked until the unsubscribe link resolves in production.** Verify one real token end to end
before the first tranche goes out.

**Tranches of 20 to 40 that Daniel can personally handle.** Generate the merge CSV with
`CommandCentered/app/scripts/mint-unsubscribe-tranche.ts`.

Geography note: this list is southern Ontario, not the Waterloo region. Hamilton 48, London 45,
Toronto 41, Kitchener 32, Waterloo 14, Cambridge 7. If a tranche is meant to be local, filter it
with `--cities`.

## Touch 1: the introduction

**Subject options**
1. Filming your recital
2. Recital video for {{studio}}
3. A question about your spring recital

```
Hey there,

I'm Daniel, I run StreamStage out of Ontario and we film dance recitals. Multi camera, livestream
for the family who can't be in the room, photography the same night, and our own crew and gear so
your day gets easier rather than busier.

Two reasons I'm writing to you specifically. We're booking spring dates now, and everything we do
is published with pricing on one page, so you can decide whether it's interesting without talking
to a salesperson:

streamstage.live/recitals

If it's not for you, no hard feelings at all.

All the best,
Daniel

You're getting this because {{studio}} runs dance recitals in Ontario. If you'd rather not hear
from me again: {{unsubscribe_url}}
```

## Touch 2: proof, about 8 days later, only if touch 1 got no reply

**Subject options**
1. Same routine, two cameras
2. What a proper recital film looks like
3. 30 seconds, then I'll leave it

```
Hey there,

Following on from last week, and then I'll leave it.

The clearest way to explain what we do is a clip on our page: the same routine, same night, one
camera locked off at the back of the house and one cutting in close. No copy on it, it just shows
the difference.

streamstage.live/recitals

The studios we work with tend to say the same thing afterwards, which is that recital day was one
less thing to manage. Mandy London put it as "there's so much going on on recital day, and that
was one thing I didn't even have to think about."

All the best,
Daniel

Not interested? One click and I'm gone: {{unsubscribe_url}}
```

## Touch 3: the close, about 2 weeks later

**Subject options**
1. Your date, and then I'm done
2. Last note from me
3. Spring weekends

```
Hey there,

Last note from me, promise.

If you're running a recital in May or June, send me the date and a rough dancer count and I'll come
back with what it would look like for {{studio}}. If we can't cover the date I'll say so.

Spring recitals cluster on a handful of Saturdays and we have a finite number of crews, so the
earlier the better. Early Bird is 5 percent and closes December 31.

streamstage.live/recitals

Thanks for reading either way!

All the best,
Daniel

Done hearing from me? {{unsubscribe_url}}
```

---

## Notes for whoever sends these

- Subject lines are options, not a test matrix. Pick one per send, keep it consistent inside a
  tranche so the reply rate means something.
- Touch 2 for clients and warm leads carries the revenue reframe. That reframe is the one thing no
  competitor is saying, so it does not get buried in touch 3.
- Nothing in here states a customer count, a success rate, a price other than the published tiers,
  or a discount that is not real.
- Every quote used is in `recital/quotes/quote-sheet.md` and consent is handled.
- Laura Ramsey's line about the money going direct and coming off her bill is **not used anywhere**
  and should not be. That is the plumbing, and the plumbing stays out of the copy.
