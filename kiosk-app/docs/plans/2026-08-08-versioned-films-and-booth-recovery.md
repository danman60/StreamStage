# Versioned film files, booth rollback, and "check my stick"

Written 2026-08-08, for the Calgary show that opens Tuesday 11 Aug.

## The problem this is the structural fix for

Commit `a1e9ace` fixed a real corruption by *detecting* it. `/sdcard` on the Fire Stick is FUSE
served by MediaProvider; renaming a staged film over a path ExoPlayer still had open (it
pre-buffers the next item in the reel) left every reader on the device seeing a page-granular
mixture of the old and new film — measured 83.8% new / 16.2% old — while the ext4 underneath was
correct. `a1e9ace` added read-back-and-hash at the destination plus rollback, which turns the
corruption into a refusal.

A refusal at the booth is still a film that did not update. **The fix here is to stop creating the
hazard**: never write over a path a player can be holding open.

## 1. Versioned filenames

Each downloaded version lands at its own filename, derived from the manifest's own sha256:

    costumecraft.mp4  ->  costumecraft__03fcba88a2a4.mp4

`__` + the first 12 hex of the sha256. The remote name is unchanged (`costumecraft.mp4` on R2), so
the publish side and the manifest need no change at all.

The app resolves which file is current from a local pointer store, `films.json`, in app-private
storage next to `installed.json`:

    "costumecraft.mp4": { current: "costumecraft__03fcba88a2a4.mp4",
                          previous: "costumecraft.mp4", ... }

Consequences, all deliberate:

- A swap is now a rename into a path **that has never existed**, so there is no stale FUSE cache
  entry for it to be confused with. The bug class is gone rather than caught.
- Read-back-and-hash from `a1e9ace` is **kept**, unchanged, as belt and braces.
- Each film goes live the moment it lands. Nothing waits for the rest of the batch, and nothing
  waits for a loop boundary to be *safe* — only to be *unobtrusive*.
- **Migration:** the seven films on the stick today have plain names and no pointer. A logical film
  with no pointer plays whatever single file is there. An app update alone changes nothing.
- Superseded versions are deleted only after a later reel rebuild, when nothing can hold them, and
  the immediately previous version is never deleted — it is the rollback.

## 2. Rollback at the booth

The likeliest bad outcome is a render Daniel dislikes, not a network failure. `films.json` keeps the
previous version's filename, and the previous file stays on disk. Rollback is a pointer flip:
instant, no network, no hashing, no download. Per film and for everything at once.

## 3. "Check my stick"

A panel action that re-hashes every local film and compares it against the manifest (or, with no
network, against what this stick recorded installing). Plain English per film. Answers the 8am
question without moving 350 MB.

## 4. Per-film actions

SELECT on a film row opens a small per-film menu: update this film / roll back / check this film.

## 5. Preflight

Free space (counting that old and new now coexist) and battery-or-mains state, checked before the
first byte. Refuse up front with a reason rather than fail at 80%.

## 6. Resumable downloads

R2 serves `Range` (verified: `206 Partial Content`, `Accept-Ranges: bytes`). A `.part` is resumed
from its current length with the digest seeded from the bytes already on disk. Because the `.part`
is named for the version's hash, a resumed part can only ever belong to the version being fetched.

## 7. Playback watchdog

The existing stall watchdog rebuilds the player. It gains: skip the offending item rather than only
rebuilding, and a one-shot probe after any update-driven rebuild that confirms the position actually
moved — if the newly current film will not decode, it is blacklisted and the reel carries on.

## 8. Release APK + soak

What is on the stick is a debug build and the 27-minute wakefulness run was on an older build. Build
release, install, run >= 25 minutes sampling wakefulness and window focus every minute.

## Acceptance, on the real stick

- Baseline sha256 of all 7 films recorded before, identical after.
- Legacy plain-named films keep playing with the new APK and no update run.
- A versioned film installs, is confirmed at its final path, and goes live without touching any
  other file.
- Rollback restores the previous film with no network.
- Check-my-stick reports 7 correct.
- Release build, >= 25 min soak, awake and focused throughout.
