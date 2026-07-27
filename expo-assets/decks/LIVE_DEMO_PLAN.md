# Real Combined Live Demo — Build Plan (2026-07-20)

## Goal
One REAL projector page (radial, like `mockups/mock-radial-bubbles.png`) wired to live prod data:
- LEFT/center: email → Knowledge Base fills in (real, `/api/demo/kb`, ★ on new email-sourced entries).
- ORBIT: real parent texts + StudioSage answers (`/api/demo/wall`).
Both halves audience-driven: email→KB via `STUDIOSAGE_DEMO_MODE` (ON, verified) · texts via a new SMS route-all auto-flag.
Deck starts on the LIVE page; offline `kb-demo` is the fallback (auto if live fails).

## Data (verified real, studio_0012)
- `/api/demo/kb?code=LIVE26` → `{count, entries:[{id,title,category,from_email,snippet,created_at}]}` newest-first.
- `/api/demo/wall?code=LIVE26` → `{messages:[{id,direction:'inbound'|'outbound',message,created_at,sender}]}` newest-first.

## Parts
1. **SMS route-all auto-flag** (heartbeat presence):
   - `demo_route_state` singleton table (`active_until timestamptz`).
   - `/api/demo/route-all` POST heartbeat (token/service-gated, CORS `*`): `beat`→active_until=now()+20s, `off`→now(); GET status.
   - `handle-sms`: if `active_until>now()` → answer any inbound from studio_0012 KB, log to studio_0012 conversation_log (no mutation of real parent rows). Deploy-gated.
   - Deck heartbeats `beat` every ~8s while on the live slide; `off` on leave/close.
2. **Combined real radial page** `/demo/live` (port `mockups/radial.html` look → React, poll both APIs, animate fly-ins).
3. **Deck reorder**: live page primary (embedded), `kb-demo` offline fallback (← / auto on load failure).

## Safety
- Route-all ON only during the live slide (tiny window). Real client 7 Attitudes exists (active) — acceptable per owner (2026-07-20).
- `STUDIOSAGE_DEMO_MODE` + route-all both must be OFF after expo.
