# Ten and Ten — Expo Exhibitor App (2026-08-13)

Grounded in the real tree, the 2026-08-12 spec, and what Calgary CDTE actually cost.
Pick numbers. Nothing here is started.

## KILLER FEATURES

1. **[boring-overlooked] Idempotent lead upsert + a real `is_test` flag** — `src/app/api/expo-leads/route.ts`
   has no dedupe, no upsert, no test flag anywhere in it; four Calgary people were captured twice and
   15 of 41 lead emails are tablet tests the PA excludes by guessing at patterns. (~half-day)
2. **[industry-standard] Validation + confirm step at the point of capture** — the tablet gate
   (`expo-assets/kiosk/tablet.html:655,678`) accepts anything, which is why `dd@hjj.com`, `ghh@fff.com`
   and eight more are in the record, and why one real studio's email landed in the *studio name* field. (~1hr)
3. **[creative] Lapel audio sliced onto leads by timestamp** — 22 transcripts exist keyed `REC00349 @ 13:20`
   with **no link to a person**; four of Calgary's most valuable contacts (ADAPT seminar booking,
   Saskatoon content day, the association admin, the nine-event owner) are unreachable for want of a
   name. ±90s window, sync marker, confidence marker. (multi-session)
4. **[industry-standard] The booth → CommandCentered bridge** — `BOOTH-SYSTEM.md` §6 says it is unbuilt;
   `kiosk-app/.../LeadSender.kt` already flushes to the web route, so this is one more destination, not
   a new pipeline. The PA hand-imported 22 leads this week because it does not exist. (~half-day)
5. **[creative] Hold-to-talk memo on the phone** — `phone-app/.../ModeBar.kt` + `MainActivity.kt` already
   own an operator surface; add a button that records 15s, attaches to the most recent lead, transcribes
   later. The thing you would actually use while someone walks away. (~half-day)
6. **[boring-overlooked] Prize draw as a first-class capture channel** — zero of 41 lead emails mention a
   prize, draw or winner, and the winner was owed to the organiser by 4:00 PM Wed. Entry, timestamp,
   consent, and a winner picker with an audit line. (~1hr)
7. **[creative] Make the follower page capture** — `public/live.html:100-107` already maps QR targets per
   slide (`LINKS`); an "email me this" button on the phone in the room converts an attendee without them
   scanning anything. Talk 1 produced 14 leads via QR; this catches the ones who did not get their phone
   up in time. (~half-day)
8. **[industry-standard] Encode manifest with an enforced ceiling** — `kiosk-app/.../FilmVersions.kt` and
   `FilmManifest.kt` know about versions but nothing validates bitrate; 2.6 Mbps froze DART on stage and
   1,557 kbps is the measured ceiling. Make it a field the build refuses to exceed. (~half-day)
9. **[creative] Deck as data + phone-driven LLM edits** — `talk1-deck.html` is 337 KB of hand-authored HTML
   with one inline script; the 13-item fix list meant editing it by hand until 1am. Declarative content
   file first, then "move the Calgary offer after the recital block" from the phone. (multi-session)
10. **[boring-overlooked] One show-health screen on the phone** — `Diag.kt` (208 L) and `Discovery.kt` (591 L)
    already collect everything: which host is answering, queue depth, leads pending flush, last successful
    send. Today you find out the booth is broken by looking at the booth. (~1hr)

## STREAMLINES

11. **Shared core module for the three apps** — `Discovery.kt` (591 vs 495 L, 360 lines apart),
    `SetupOverlay.kt`, `RemoteControl.kt`, `Diag.kt`, `HostStore.kt`, `DebugBridge.kt` all exist twice and
    have all drifted. Two "cannot find the host" bugs this week were the same bug. (multi-session)
12. **One film library with a manifest** — DART holds `videos\` (34), `videos-lo\` (16),
    `videos-heavy-2026-08-11\` (40); the stick holds its own; R2 holds `live/talk1/vid/`. Nothing declares
    which encode belongs where. (~half-day)
13. **Delete the retired relay pair** — `expo-assets/decks/live-relay.py` and `live-receive.py` are the
    superseded interim path and would fight the hosted one if anyone restarted them. Two pollers already
    survived a `kill` once. (~10min)
14. **Resolve the two talk-1 decks** — `expo-assets/decks/talk1-deck.html` (29 slides, the one presented)
    vs the repo's older 13-slide `talk1-video.html`. One of them is a trap for the next session. (~10min)
15. **Invert the flush default** — `serve.py` auto-sends its disk queue to the LIVE route unless started
    with `--no-flush` (`BOOTH-SYSTEM.md` §5). Fabricated leads have reached production **twice**. Make
    production an explicit opt-in. (~1hr)
16. **Archive `videos-heavy-2026-08-11\` off DART** — 40 files, none referenced by the deck, and they are
    exactly the encodes that froze playback on stage. (~10min)
17. **No production default in the lead route** — `src/app/api/expo-leads/route.ts:10-11` falls back to
    `daniel@streamstageproductions.com` and the live sender when env is unset, so a misconfigured test
    still mails a real inbox. (~10min)
18. **Fix or delete the staff leads page** — `public/expo-leads.html` is opened from `kiosk.js:134` but
    lives outside the kiosk root, so it 404s on DART *and* on the stick. Broken today, silently. (~10min)
19. **Unify `Playlist.kt`** — phone has 67 lines, kiosk has 270, same name, same job, different answers
    about what is playable. (~1hr)
20. **Clean the scratchpad out of the repo** — 20+ PNGs and `deleted-dart-bench-leads-2026-08-09.json`
    are untracked in `scratchpad/`, including deleted lead data. Gitignore it and move the lead file
    somewhere deliberate. (~10min)
