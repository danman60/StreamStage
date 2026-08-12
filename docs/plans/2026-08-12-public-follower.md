# Public follower — the room's phones mirror the deck

**This exists so that "a q that viewers of the talk can scan and then they will have the deck live
on their phone in a browser and it will automatically change as I click through like mirroring my
pace" — with the videos playing, no audio, over "regular public internet".**

## Shape

Nothing on the presentation laptop changes. The deck already POSTs its position to the presenter
server on every slide change (`talk1-deck.html:2029` → `__report` → `POST /state`), and
`presenter-server.py` already answers `GET /state` with the current index. So:

```
deck (DART, unchanged) --POST /state--> presenter-server.py (unchanged)
                                              |
                          live-relay.py  --GET /state (poll)
                                              |
                                       PUT state.json --> Cloudflare R2 (public CDN)
                                                                  |
                    phones  <--- GET state.json + slide jpg + mp4 ---
                                       (streamstage.live/live)
```

- **Nothing new runs inside the presenter.** The relay is a separate process reading a read-only
  endpoint. If it dies mid-talk the deck does not notice.
- **R2 is the fan-out**, not a server of ours. A public bucket on Cloudflare's CDN handles a room
  of phones without us running anything; `streamstage.live` only serves one static page.
- **Public internet, not the venue LAN.** This is the whole point: the tablet could not even find
  DART on the venue wifi yesterday. Phones on cellular work fine here.

## Files

| File | Role |
|---|---|
| `expo-assets/decks/live-relay.py` | new · polls `127.0.0.1:8090/state`, PUTs `state.json` to R2 on change |
| `public/live.html` | new · the follower page; polls `state.json`, shows the slide, plays mapped films muted |
| `next.config.ts` | rewrite `/live` → `/live.html` (same trick `/checklist` already uses) |
| R2 `live/talk1/` | 29 slide jpgs, the phone films, `state.json` |

## Acceptance

1. `GET <r2>/live/talk1/state.json` returns the deck's real index and changes when the deck moves.
2. `streamstage.live/live` on a phone shows the current slide and follows within ~2 s of a click.
3. Films on the mapped slides play **muted**, loop, and never request audio.
4. The relay never writes to the presenter — read-only, `GET /state` only.
5. Killing the relay leaves the deck and the talk completely unaffected.

## Deliberately out of scope for v1

- Fragment-level sync (the deck reports slide index, not which fragment is revealed).
- Which film is playing on slide 10 — `/state` does not carry the current source, so the phone
  shows that slide's first film. Adding it would mean changing the deck, which is not worth it
  on talk day.
