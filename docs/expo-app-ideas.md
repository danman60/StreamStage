# Expo Exhibitor App — parked ideas

Ideas raised while scoping the app. Not scheduled. Each one records why it is interesting and what
would make it real, so nobody has to re-derive the reasoning later.

---

## Scan-to-play: a phone-controlled game on the booth TV
**Raised:** 2026-08-12 (Daniel, during scoping) · **Status:** parked, v2 candidate

**The idea.** A QR on the TV puts a game controller in a visitor's hand. The TV leaves the attract
reel, plays the game, and returns to the reel when the player walks away. Leaderboard on screen all
day as a crowd-stopper.

**Why it earns its place.** It closes a real gap: the Calgary prize draw has **no record anywhere** —
zero of the 41 lead emails mention a prize, draw or winner, and the winner's name was owed to the
organiser by 4:00 PM on the last day. A game that ends in "enter to win" makes the draw a data lane
with a timestamp and a consent tick instead of names in a cup. It also becomes another capture
channel (`channel: "game"`) writing the same lead shape as the tablet.

**What already exists to build on.**
- `BoothServer.kt` on the Fire Stick already serves the tablet page, films and leads over HTTP.
- `BoothLoopActivity` already yields the screen to a film and returns to the attract reel — the
  same interrupt-and-restore the game needs.
- The hosted follower (deck → `/api/live` → R2 → phones) already proves phone-follows-TV over the
  open internet, and did it flawlessly through a live talk on 2026-08-12.

**The two risks that decide the design.**
1. **Client isolation on venue wifi.** Many venue networks block phone→stick traffic outright, and
   Calgary produced a network where the tablet's own 254-address scan got 83 answers and DART was
   not one of them. A local-only game dies at exactly the booth where the network is worst.
   *Outs:* design the game to tolerate ~1s latency so it also runs over the cloud path; and/or use
   **Daniel's phone hotspot**, which `BOOTH-SYSTEM.md` §2 already names as the answer on the floor —
   his own AP, no isolation, and it needs no internet because the booth path is LAN-only by design.
2. **Latency class is a design constraint, not a detail.** Anything needing sub-200ms feedback works
   only on the local path, so it breaks precisely when the network does. **Turn-based survives both
   transports.**

### Who is actually playing — 2026-08-13

Daniel: *"needs to be dancer focused."* With one correction that shapes every format: these are
**Dance Teacher** expos. The people at the booth are studio owners, teachers and competition
directors, not dancers in class — often on their feet since 8am, holding a coffee, in a crowded
aisle. **Dance-native, not physically demanding.** Anything asking them to move their body in
public gets watched, not played.

**Candidate formats** (Daniel 2026-08-13: *"we'll explore later"* — choice deliberately open):
- **Catch the 8** — tap on the beat, scored for rhythm accuracy. The most dance-native option,
  needs no reading, everyone at that show is good at it, and it authors itself (no clip tagging).
- **Which take ships?** — two versions of one performance clip, one carrying a real production
  fault (blown highlight, missed cue, phone-camera audio). The game *is* the pitch. Costs edit time.
- **Name the style** — clips off the existing reel wall, guess the genre. Zero new footage, just
  tagging the 32 films already encoded.
- **Recital season triage** — rapid "would you rather" on costume delays, ticket sales, dress
  rehearsal chaos. No winner, live bars on the TV, and the answers are market research.
- **Choreo memory** — Simon-says with four positions. Scales from phone to wall.
- **Formation puzzle** — drag dancers into a stage formation against the clock. The only one that
  genuinely *needs* a big surface, and therefore the one that commits to hardware up front.

### The giant touch surface — decided 2026-08-13

Daniel asked whether to upgrade to a giant touch surface. **Decision: build surface-agnostic, ship
on the Fire tablet already carried, rent a panel for one show only if the game proves it stops
traffic.** No purchase on a guess.

**The real argument for touch is not spectacle, it is the network.** Every failure that hurt at
Calgary was two devices failing to find each other — the tablet could not see DART, the phone could
not see the kiosk, and venue wifi does client isolation as policy. A touch surface has **no second
device**, so that entire failure class disappears.

**Against:** these shows are flown to. A 43–55" commercial touch panel is 30–50 lb, not carry-on,
and convention-centre drayage runs to hundreds per shipment before the panel is paid for; show-AV
rental is four figures. An IR touch *overlay* is cheap but assumes a TV he owns and controls the
bezel of, not a rented one. And on a 6×6 table booth it does not fit at all — note that
`expo-assets/CALGARY-2026-08-10-LOGISTICS.md:128-130` still records the booth tier as **UNVERIFIED**,
which is a prerequisite for any surface bigger than the tablet.

**So the game must be written with the surface abstracted from the start:** the same game runs on
(a) TV + phones, (b) the Fire tablet, (c) a large panel later, with no rewrite.

**What v1 must do now so this slots in later:** nothing beyond keeping `channel` open-ended on the
lead record and letting campaign content carry arbitrary config. No v1 work required.
