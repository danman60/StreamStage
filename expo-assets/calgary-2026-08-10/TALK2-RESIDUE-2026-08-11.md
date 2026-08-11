# Talk 2 residue — Calgary CDTE, Tue 2026-08-11, 09:20 MDT "Why AI?"

Pulled 2026-08-11 15:xx ET from live systems **before the demo tenant is reset for talk 1**.
Every row below is copied from the database, not from a note.

Timestamps: DB is UTC. Calgary is MDT (UTC-6). ET is UTC-4.

---

## 1. Everyone who texted the live demo line (+1 587-317-0721)

`parents` / `conversation_log`, studio_id `studio_0012`. **These are wiped by "Reset demo".**
5 real numbers, 09:53–09:57 MDT, 20 messages (10 in / 10 out).

| Phone | First message | Local time (MDT) |
|---|---|---|
| +1 403-829-4365 | "Hi! What can you tell me about Jackrabbit Dance?" | 09:53 |
| +1 403-512-2654 | "When is the summer camp?" | 09:54 |
| +1 250-589-4816 | "When is the summer beach party" | 09:54 |
| +1 250-812-7630 | "How much is the summer party?" | 09:54 |
| +1 403-560-9877 | "When is summer camp" | 09:55 |

Also present but NOT from this talk: +1 289-627-1897 (created 2026-08-09, Ontario), and
+1 500-555-0006 (the seeded "Demo Parent").

One answer was a deliberate flag-to-front-desk ("I don't have specific tuition rates ... this one
should go to the front desk") — the beat that slide 27 says to call a win.

**No consent to market to these numbers was collected.** They texted a demo line during a talk.
Treat as anecdote/proof, not as an outbound list.

## 2. The email somebody forwarded on stage

`original_emails` — exactly ONE, 09:53:38 MDT.

- **Sender: `director@studiosouthdancecompany.com`** — Studio South Dance Company
  (studiosouthdancecompany.com). The email body addresses the director as "Krystal".
- Subject: `Fwd: Summer Camps and Session information. Early bird info and sibling discount below *READ`
- Original thread: Sameera <sameeraleekha@gmail.com> → Director, Feb 2025, about Novice Intensive.
- It produced **11 knowledge_base rows** (1 body + 10 atomic facts): Beach Party 3-5 $180,
  Beach Party 6-8 $270, Novice Intensive $425, Competitive Intensive $275, sibling BOGO,
  15% early bird, summer session dates, Tuesday class times, assessments, level cards.
- Those facts then answered the room's live texts. That is the whole demo, and it worked.

**Krystal signed up for StudioSage 11 minutes later** (see §3).

## 3. StudioSage accounts created during/after the talk

`studios`, 4 new, 10:03–10:07 MDT.

| Studio | Director email | Website |
|---|---|---|
| Brenda's School of Baton & Dance | bsobad@sasktel.net | bsobad.com |
| The SPACE Sunrise Performing Arts Centre of Excellence Inc | spaceex.director@gmail.com | thespacestudio.ca |
| Studio South Dance Company | director@studiosouthdancecompany.com | studiosouthdancecompany.com |
| Dexterity Dance Studio | dexdancestudio@gmail.com | dexteritydancestudio.ca |

## 4. Lead rows (StudioSage `leads`)

| Local (MDT) | Email | Studio | source |
|---|---|---|---|
| 10:02:53 | info@danceunlimited.ca | Dance Unlimited | talk2 |
| 10:02:56 | info@rdancecollective.com | Revolution dance collective | talk2 |
| 10:03:05 | director@studiosouthdancecompany.com | — | moves |
| 10:03:07 | spaceex.director@gmail.com | The SPACE Inc | talk2 |
| 10:03:16 | 360danceproject@gmail.com | 360 dance project | talk2 |
| 10:03:37 | jleblanc1079@outlook.com | — | moves |
| 10:05:39 | dexdancestudio@gmail.com | — | moves |
| 10:48 (booth) | thrivedancestudio@gmail.com | Thrive Dance Studio | booth_tablet |

Junk/test rows in the same table, from gate testing: `gj@g.com`, `dfg@gh.com`, `ghh@fff.com`.

## 5. The facelift

`facelift-out/status.json`: url `https://360danceproject.com/`, started 09:27 MDT, **ready 09:48 MDT**
(21 min). One run today — so exactly one studio was promised a site from the stage:
**360 Dance Project, Diamond Valley AB** (`360danceproject@gmail.com`, who also took the talk2 code).

The build is on SpyBalloon at `expo-assets/decks/facelift-out/site/` (index.html + assets, 3.0 MB,
self-contained, no CDN). **It was deliberately NOT deployed** — the run prompt said do not deploy.
So the promise "it's yours, free, hosted for a year, then $20/YEAR" is **outstanding**.
