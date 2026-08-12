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

**Candidate formats** (undecided — Daniel parked the choice):
- Dance-studio trivia, 5 questions, score + leaderboard, ends in a prize entry. Questions are
  campaign data, and each one can carry a selling point.
- Guess the studio from a reel clip — the attract loop and the pitch become the same thing.
- Prediction / vote wall ("what's the hardest part of recital season?") — no scoring, live bars
  building on the TV, and the results are market research you keep.
- Head-to-head reaction race — best spectacle, but needs the low-latency local path.

**What v1 must do now so this slots in later:** nothing beyond keeping `channel` open-ended on the
lead record and letting campaign content carry arbitrary config. No v1 work required.
