# Expo session handoff — restored after the 2026-08-11 tmux crash

**Written 2026-08-11 ~01:15 EDT** by the sysadmin session, while Daniel slept in Calgary.
**Context:** the SPYBALLOON tmux server segfaulted at 04:27:20 UTC (00:27 EDT) and killed all 14
working windows. The machine was then rebooted deliberately. These five sessions were resumed from
their own transcripts by `~/expo-session-restore.sh` so the morning starts loaded, not cold.

**Calgary Dance Teacher Expo runs Mon Aug 10 – Thu Aug 13 2026.** This is live event work, not
background dev. Flight home is WS636, Thu Aug 13, YYC 11:15 → YYZ 17:10.

> Each session was resumed **from summary**, not full transcript (Daniel's choice — the three
> StreamStage threads are 460k–1.5M tokens and a full resume would eat a large share of usage).
> The compacted summary carries the working context; the verbatim early detail is in the
> transcripts if a session needs to go digging.

---

## The three StreamStage windows

All three live in `~/projects/StreamStage` on branch `main`, and all three have **uncommitted work
in the tree** — see "Uncommitted at crash" at the bottom. Nothing was lost; a reboot does not touch
the working tree.

### `StreamStage-7` — booth kiosk / DART Fire TV stick
Session `42778d90-74d1-484b-814c-f9ede7f51038`

Working surface, by how often it was touched:
- `expo-assets/kiosk/tv.html` — the main kiosk page
- `expo-assets/kiosk/menu-loop/menu-loop.html` + `render-menu-loop.mjs`
- `expo-assets/kiosk/tests/scenarios.mjs` — run against `http://127.0.0.1:8210`
- `expo-assets/kiosk/serve.py`, `menu-loop/autoplay-check.mjs`
- `src/app/api/expo-leads/route.ts` — booth lead capture

Where it left off: the DART stick was being packed up ("we can stop the app on stick now"), then
Daniel noted DART would stay **on and plugged in all night on the network** before the flight, and
asked for extra end-to-end verification while it was still reachable. The thread then ran the
`/fresh` skill and handed its kiosk work to a `StreamStage-8` window (session
`4eb98f77-…`, ended 00:18 UTC — **already finished, deliberately not restored**). That successor
closed out the tablet menu behaviour. If kiosk history seems to stop mid-thought, the tail of it is
in `4eb98f77-b375-4397-9249-f2ee2e14d614.jsonl`.

### `StreamStage-9` — StudioSage live-demo beat + knowledge base
Session `1e032ac2-568e-4778-ba25-63f1f822223a`

- `expo-assets/decks/presenter-server.py` (heaviest), `expo-assets/decks/talk2-ai.html`

The live goal it was driving at, from its own Stop hook:
> "the StudioSage live-demo beat is cold, correct and self-clearing. Reset demo wipes KB + wall and
> the slide empties itself with no reload; one forwarded email becomes multiple facts."

Daniel scoped it to **demo tenant only** and told it to focus on the **knowledge base issue**. Open
question he raised near the end: the **facelift reveal upgrade should scroll like the original site
page** — he asked whether he liked that, which was never settled. Also touched the `connect-9-pro`
skill (Pixel 9 Pro wireless ADB).

### `StreamStage-10` — talk2 deck slide 5 + deck sound  ⚠️ NEEDS YOU
Session `cfb56afa-3039-4b7f-87d9-6b19979048b3`

- `expo-assets/decks/talk2-ai.html` (heaviest), `presenter-server.py`, `facelift-before.cjs`

The live goal, from its Stop hook:
> "on talk2 slide 5 (★ Website Facelift — the ask), the moment Daniel types a studio URL and hits
> GO, the slide must show that studio's CURRENT live site in a container big enough to see."

Second hook: **"facelift reset tested E2E including the new scroll effect."**

**This window will come back sitting on a pending tool-permission prompt**, because it was killed
mid tool-call. The call it wants to run is a read of `addMsg` in `talk2-ai.html` — it was in the
middle of **wiring the text sound** — and the prompt showed a "Parse error" on the command. The
restore script deliberately does **not** answer it; approving a tool call is yours. Answer it (or
Esc and re-ask) and it picks straight up.

Unresolved from this thread: the **tablet could not see the kiosk** even though the tablet had
internet and the kiosk was up on the Firestick, and Daniel asked whether the laptop needs to be
involved at all — he was worried it can't run the kiosk when he steps away from the booth.

---

## The two support windows

### `sysadmin-4` — session `94515798-ef2d-4482-b6f8-fd478e260bfd`
Carries the FIRMAMENT hardware-fault thread (`CURRENT_WORK.md`): five power events on Aug 7, two
disproved theories, and the untested best-fit hypothesis — a **loose mains connection**, with the
12VHPWR connector inspection still never done. That check needs hands on the machine in Toronto, so
it cannot progress from Calgary.

### `assistant-2` — session `e8897dc6-d1d6-4e00-99e0-6c4940ec5a69`
General assistant thread. Note from its own last turn: that window held **the live adb connection to
the Pixel and the SSH path to DART**. Both connections died with the reboot and will need
re-establishing (`connect-9-pro` skill for the Pixel).

The boot helper also creates its own fresh `SYSADMIN` and `ASSISTANT` windows. Those are cold and
separate — the restored ones are the lowercase `sysadmin-4` / `assistant-2` windows.

### Not restored (recoverable any time)
`StudioSage-3`, `CompPortal`, `CompPortal-6`, `TVBOX-2`, `projects-4`, `projects-5`,
`CommandCentered-3`, `CD-SAVE-SYNC`, `assistant-3` — all still resumable via
`claude -r <id>`; IDs are in `~/.ccbot/session_map.json`.

---

## Uncommitted at crash (survived the reboot, still in the tree)

```
 M INBOX.md
 M expo-assets/CALGARY-2026-08-10-LOGISTICS.md
 M expo-assets/decks/1 - START THE TALKS.bat
 M expo-assets/decks/presenter-server.py
 M expo-assets/decks/robot-wall.mp4
 M expo-assets/decks/talk2-ai.html
?? expo-assets/calgary-2026-08-10/2026-CDTE-Vendor-Packet-V3.pdf
?? scratchpad/dart-*.png, phone-*.png, deleted-dart-bench-leads-2026-08-09.json
```

Last expo commits, for trajectory:
```
f7c3980 fix(tablet): Back returns to the six tiles without touching the film
3ecabd8 feat(talk2): slide 5 is designed before the url, not a placeholder
6542cc8 fix(facelift): CLEAR FACELIFT forgets the run, and the reveal scrolls itself
f3ef61c fix(booth): the launchers stopped the kiosk sending leads again
```

## Still open from the logistics doc
**The WestJet fare brand is still unverified** — it decides whether the return ticket allows a full
carry-on or a personal item only, and the e-ticket says `Luggage: Not included` on both legs. Booth
prize, exhibitor packet, shirt and demo hardware all have to fly home in cabin allowance. Resolve via
WestJet Manage Trips (`LYEXNF` + surname) or BudgetAir (`BCA-20856065`). Adding a bag in advance
beats adding one at the gate.
