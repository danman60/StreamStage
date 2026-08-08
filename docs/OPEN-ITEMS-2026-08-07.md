# Open items — StreamStage booth, as of 2026-08-07 23:00 ET

Everything still outstanding. Ordered by what can hurt at the Calgary booth (Aug 11–12).
Anything marked **DANIEL** is a decision, not a task.

---

## BLOCKING — a real booth lead would fail today

1. **The lead-route fix is committed but NOT DEPLOYED.**
   `/api/expo-leads` was changed so a booth capture (`src` starts with `booth`) no longer needs a
   person's name, and `flush-leads.py` no longer invents one. The real email was verified against
   a **locally-run copy** of the route. **Production still runs the old code, which requires a
   name — so a real booth flush today would 400 every lead.** Needs a deploy before the show.
   Files: `src/app/api/expo-leads/route.ts`, `expo-assets/kiosk/flush-leads.py`. Commit `e6dfa99`.

2. **Six leads are sitting unflushed on DART** (`telemetry/leads-2026-08-07.jsonl`), including
   Daniel's own booth tests. The flushed-marker was deliberately cleared, so nothing is recorded
   as sent. They go nowhere until item 1 is deployed and a flush is run against the live route.

---

## Booth hardware / the stick

3. ~~**Zero-touch power-on.**~~ **SOLVED 2026-08-07 23:22, proven on the stick.** It needs TWO
   adb commands, once per stick, and running only the second is why it looked impossible:

   ```
   adb shell pm grant com.streamstage.boothloop android.permission.SYSTEM_ALERT_WINDOW
   adb shell appops set com.streamstage.boothloop SYSTEM_ALERT_WINDOW allow
   ```

   They satisfy different branches of the background-activity-start check — `pm grant` flips
   `granted=true` (the permission carries a `development` protection flag, which is what makes it
   adb-grantable); `appops set` only sets MODE_ALLOWED. With appops alone the boot start was still
   refused. With both, logcat reads *"Background activity start for com.streamstage.boothloop
   allowed because SYSTEM_ALERT_WINDOW permission is granted"* and after a cold power cycle the
   reel owned the screen with nobody touching anything.
   Re-run both after a factory reset. Fire OS 7 (API 28) predates the restriction, which is why
   this only ever broke on Fire OS 8.

4. **The 20-minute Fire OS sleep timer was not re-verified.** 27 minutes was proven in an earlier
   session; the longest continuous run on 08-07 was minutes. Worth one unattended hour before the
   floor.

5. **The R2 film-update path (`UpdateManager.kt`) is untested.** Versioned filenames, rollback and
   per-film update all shipped without a real pull being exercised.

6. **Hours-long unattended running is untested.** Nothing has run the reel for a full show day.

---

## Content on screen

7. **The StreamStage film's baked-in QR points at `expo-leads.html`, not the gated `/g` page.**
   Decoded independently off the stick in an earlier session. Fixing it means re-rendering the
   film. Not verified or fixed on 08-07.

8. **Deck QRs (D2) and the videographer-brief handout QR (D4)** — not repointed / still absent.

9. **The operator-only film still leads the visitor-facing attract reel.** `Playlist.kt` puts
   `streamstage-services.mp4` first as the "who we are" film, so it plays to visitors on the loop
   even though only the phone may *cut* to it. That reads as deliberate — **DANIEL to confirm it
   is what he wants.**

---

## Lead plumbing, non-blocking

10. **The tablet browser's own offline lead queue (localStorage) has never been drained.** It only
    retries if the visitor reopens the page. Only the kiosk's disk queue was tested.

11. **Booth leads are mislabelled in attribution.** `source`/`src` are sent as `booth_tablet`,
    which is not in the route's `VALID_SOURCES`, so `taxonomySource` falls through to
    `expo_form`. The email says "Came in from booth_tablet" in the body but the taxonomy value is
    wrong. Cosmetic until someone reports on it.

12. **Four fabricated leads reached the live inbox and possibly the database** — `jen@brightstepdance.ca`
    / "Bright Step Dance", 00:39–00:56 on 08-08 UTC, from the previous session's test harness.
    **DANIEL may want those rows removed** so they never look like real studios.

13. **StudioSage merges leads on email** — two proposals from one studio collapse to one row and
    the earlier notes are overwritten. Flagged in StudioSage's INBOX. **DANIEL's call.**

---

## Presenter / decks (Daniel's own machines)

14. **DART's presenter server is serving a STALE deck** — `192.168.0.13:8080/state` reports 38
    slides; the repo's talk 2 is 32. Same for `192.168.0.12:8080`, which is the phone's saved
    presenter host. Those are Daniel's processes and **they need restarting on the current deck.**

15. **The presenter-notes fit fix is in the repo but DART is still running the old process**, so
    the phone sees the old clipped page until that server restarts.

---

## Awaiting Daniel — content decisions

16. **Ten-and-ten picks.** `docs/five-and-five-2026-08-07.md` was delivered and DM'd; no numbers
    chosen.
17. **Reflect's tagline** is beat 16 of its own VO script verbatim, never confirmed.
18. **The CompSync signup URL is still an assumption** (`compsync.net`), flagged in the operator
    sheet and README, never confirmed.

---

## Environment facts that keep biting — not items, just don't re-derive them

- **SPYBALLOON's INPUT policy is DROP.** Devices cannot reach a server on that box over the LAN.
  Serve the booth from DART, or use `adb reverse` and know it is a scaffold.
- **DART runs on Eastern**, so its lead files are named `leads-<yesterday>.jsonl` relative to
  SPYBALLOON's UTC clock.
- Three stray kiosk servers from earlier sessions were beaconing on the LAN and stealing device
  discovery. All stopped. If devices drift to the wrong kiosk again, look for those first.
- This bench stick has **no remote paired**, so Fire OS throws a "We cannot detect your remote"
  dialog after every boot. Not an app bug.
- **Do not harden `kiosk-app`'s `network_security_config.xml` back to loopback-only.** That was
  the bug that stopped the tablet driving the stick at all.
