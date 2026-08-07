# Fire Stick film updates over the internet — plan

**Decided by Daniel 2026-08-07:**
- **Manual only.** The stick never reaches out on its own. He triggers a check from the remote.
- **One publish command on SPYBALLOON.**

**The invariant this must not break:** the Fire Stick app is the failure-mode insurance — it plays the
booth loop with no laptop and no network. Adding an update path must not make it *depend* on a
network. No network, no manifest, a failed download: it keeps playing exactly what is on disk.

---

## Publish side — `kiosk-app/tools/publish-films.sh`

Source of truth is `expo-assets/kiosk/media/*.mp4` (the same files the kiosk serves — one media set,
not a second copy that can drift).

1. For each film: compute `sha256` and byte size.
2. `rclone copy` to `r2:streamstagesite/booth/` (the `r2:` remote is already configured on this box;
   credentials also in `~/.env.keys`).
3. Write `booth/manifest.json`:
   ```json
   { "version": 3,
     "updated": "2026-08-07T21:40:00Z",
     "films": [ { "id": "studiosage", "file": "studiosage.mp4",
                  "bytes": 20070800, "sha256": "…", "updated": "…" } ] }
   ```
4. **Verify after upload, do not assume:** re-fetch the manifest and one Range request per film over
   the PUBLIC url and confirm bytes match. Print a per-film OK/FAIL table.
5. Idempotent: a film whose sha256 already matches the manifest is skipped, so a re-run after one
   edit uploads one file, not 350MB.

Public base: `https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev/booth/`

## Stick side — `kiosk-app`

**New:** `android.permission.INTERNET` + `ACCESS_NETWORK_STATE`. Nothing else changes about how the
loop runs.

1. **Trigger: the remote, never a timer.** MENU opens an "Update films" panel; it is also reachable
   by a long-press of Select so it is findable without a labelled Menu key. No boot check, no
   background poll, no scheduled job.
2. **Panel shows the truth before doing anything:** each film, its local size, and one of
   `up to date` / `NEW VERSION` / `not on this stick` / `unknown (no network)`. Nothing downloads
   until he presses Update.
3. **Download is safe by construction:**
   - to `…/StreamStageBooth/.staging/<file>.part`, never over the live file;
   - verify **sha256 AND bytes** against the manifest — a truncated hotel-wifi download must fail
     here, which is exactly the failure `push-media.sh` cannot currently catch;
   - only then atomically `rename()` into place;
   - the old file is replaced, never deleted first. A failure leaves the booth exactly as it was.
4. **Never swap a film that is on screen.** If the updated film is currently playing, stage it and
   apply at the next loop boundary for that film.
5. **Progress on a TV, driven by a D-pad**: per-film progress and a plain-English result line. Errors
   say what to do ("no network — the loop is unaffected"), not a stack trace.
6. **Playlist gains a hash check** for files that came from a manifest, closing the
   "truncated push passes every check" gap (item 10 of the ten-and-ten).

## Acceptance — proven on the real stick, not an emulator
- Publish an edited film, press Update on the remote, that film changes on the stick; every other
  file untouched (sha256 compared before/after).
- Pull the network mid-download → old film still plays, panel says so, nothing corrupt on disk.
- Corrupt the staged file deliberately → verification refuses it and the live file survives.
- Airplane-mode boot → loop plays as today, with no error on screen.
- After all of it, the 20-minute sleep behaviour is unchanged.
