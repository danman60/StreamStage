# LIVE DEMO — the link that arms SMS routing  (verified 2026-07-26 ~17:10 ET)

Everything below was verified against production (live DB, live API, deployed edge function),
not against docs. Nothing here is theory.

---

## 1. THE LINK

Open the deck with the `rt` token in the URL. That is the ONLY thing that arms routing.

**On FIRMAMENT (presenter-server running in `expo-assets/decks/`):**

```
http://localhost:8080/talk2-deck.html?rt=a7cb85563ad52b460b26ffe236554b41
```

**If you open the file directly instead (no server):**

```
file:///C:/Users/danie/Desktop/StudioSage-Live-Demo/talk2-deck.html?rt=a7cb85563ad52b460b26ffe236554b41
```

Both work — the deck posts to the absolute `https://www.studiosage.ai/api/demo/route-all`
URL and CORS is wide open on that endpoint, so `file://` is fine.

### Gotchas that will bite you

- **The token lives in `sessionStorage`, which is per-TAB.** Open a new tab / new window
  without `?rt=` and it is unarmed again, even on the same machine. Always paste the full link.
- **Routing only arms while you are ON the mechanic slide or the live wall slide.** Leaving
  that zone disarms within ~20s. That is by design — it means audience texts can't be hijacked
  into the demo tenant during the rest of the talk.
- **`⚠ routing not armed` in the top-right of the wall slide = you opened without `?rt=`.**
  It is a truthful indicator, not a bug. If you see it, close the tab, re-open with the link.
- Closing the deck sends an explicit `off`; the flag also self-expires 20s after the last beat.

---

## 2. WHAT WAS VERIFIED (chain, end to end)

| Link in the chain | State |
|---|---|
| `DEMO_RESET_TOKEN` in Vercel production | present, value above |
| `POST /api/demo/route-all` (`x-demo-token`) | 200, flips flag; unauth = 401 |
| `{"action":"off"}` + auto-expiry | verified, flag reverts |
| `demo_route_state` table in prod | exists, singleton row |
| `handle-sms` deployed (v64) | byte-identical to repo HEAD; contains the route-all override |
| Demo RAG retrieval vs the demo KB | 9/9 known questions hit the right entry (0.50–0.77 similarity) |
| Out-of-domain question | 0 matches → the "I don't have that yet" answer path fires |

**Bug found and fixed during this pass:** the `demo_route_state` table had RLS off while
PostgREST still granted the public anon key write access — anyone holding the anon key (it
ships in the web bundle) could have armed route-all and pulled every studio's inbound SMS into
the demo tenant. RLS is now on, anon/authenticated grants revoked, verified 401 for anon,
verified the service-role path (the deck heartbeat) still works.

---

## 3. THE KB ON THE WALL — what is actually in there

Your note said the wall's knowledge base "looks like other content". It isn't another studio's —
it is 15 hand-seeded entries under the demo tenant (`studio_0012` / share code `LIVE26`), seeded
Jul 7. Nothing leaks in from anywhere else; the wall and KB feeds are hard-scoped to that tenant
in code.

These are the 15 entries. **Pick your 4–5 on-screen "known facts" from this list** so the room
tests things the bot can actually answer:

| Title | Fact worth putting on screen |
|---|---|
| Saturday Rehearsal Time | Saturday rehearsal 9:00–11:30am, doors 8:45 |
| Weekly Class Schedule | Mon–Thu 4:30–8:30pm, Sat 9:00am–1:00pm |
| March Break Closure | Closed Mar 16–20, classes resume Mar 23 |
| Picture Day | Sat Apr 11, full costume, low bun, no jewelry |
| Costume Fees | $85 per routine, due Feb 1 |
| Tuition and Payment | Billed the 1st, 10% sibling discount |
| Trial Classes | One free trial class in any program |
| Age Requirements | Starts at age 3 (Tiny Dancers) |
| Spring Recital | Sat Jun 13, Community Theatre, 1pm + 6pm |
| Dress Code | Ballet: pink tights, black bodysuit, bun |
| Weather Cancellations | Posted to Instagram + email by 2:00pm |
| Absences and Makeup Classes | Text or email, no doctor's note needed |
| Studio Contact and Hours | Front desk Mon–Thu 4:00–8:30pm |
| Summer Camp | Jul 6–10 and Jul 20–24, 9am–3pm, ages 5+ |
| Competition Team | Sept–May, 3 regionals + 1 championship |

Suggested on-screen set: **Saturday rehearsal time · costume fees · picture day · dress code ·
spring recital date.** All five were retrieval-tested and hit their exact entry.

---

## 4. PREFLIGHT (60 seconds, do it before you walk on)

```bash
# 1. is the flag currently off?  (expect active:false)
curl -s https://www.studiosage.ai/api/demo/route-all

# 2. is the demo tenant clean and ready to receive the live email? (expect armed:true, kb_seed:15)
curl -s https://www.studiosage.ai/api/demo/reset

# 3. wipe the live-fill email + re-arm  (run this after every rehearsal)
curl -s -X POST https://www.studiosage.ai/api/demo/reset \
  -H 'content-type: application/json' \
  -H 'x-demo-token: a7cb85563ad52b460b26ffe236554b41' -d '{}'
```

Then open the deck with the link in section 1, walk to the wall slide, and confirm the
`⚠ routing not armed` note is **absent**.
