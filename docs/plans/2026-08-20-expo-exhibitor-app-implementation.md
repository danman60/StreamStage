# Expo Exhibitor App v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` or
> `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`)
> syntax for tracking. Tasks marked **LANE: local** are dispatched to a local model by
> `tasks/expo/driver.sh`; tasks marked **LANE: supervisor** are Claude's by rule and must never be
> queued.

> This exists so that **"one unified software experience to make sure there's no duplication, create
> extra notes and run a TV off a fire stick via the tablet and the phone and do the decks and
> organize it all into a single campaign per user"** — Daniel, 2026-08-12 17:00 ET.

Check every deliverable against that line, not against this plan. Where the two disagree, the line
wins.

**Source spec:** `docs/superpowers/specs/2026-08-12-expo-exhibitor-app-design.md` (488 lines, 13
acceptance criteria). **Predecessor:** `docs/plans/2026-08-07-tradeshow-toolkit.md`.
**Corrected phase 2:** `docs/plans/2026-08-11-stick-hosted-booth.md`.

**Goal:** Give the booth a show lifecycle and one validated lead contract, so a capture at the booth
becomes exactly one durable record with its note attached, and closing a show produces the export in
one action.

**Architecture:** A new `show` package in `kiosk-app` holds the lifecycle primitive and the lead
contract as pure Kotlin objects with no Android dependencies, so they compile and test fast and can
be consumed by `BoothServer`, `BoothStore` and `LeadSender` without any of them importing each
other. Everything the visitor or operator sees is wired by the supervisor; the pure rule objects are
transcription work and are dispatched to a local model.

**Tech Stack:** Kotlin (JVM target 17, Android SDK 30 minimum — Fire OS on AFTKRT), Gradle 8.11.1,
`org.json` (already the repo's JSON library — no Gson, no kotlinx.serialization), JUnit 4 for the
pure-logic tests.

---

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec
and from measurements in the repo.

- **Never invent a data field.** If a destination demands a field nobody asked for, stop and ask.
  A synthesised studio name arrives in the CRM looking exactly like something the visitor typed.
- **No em dashes or en dashes** anywhere, including code comments and internal docs.
- **Timestamps are event-local WITH offset**, never bare UTC. A bare-UTC value rendered six hours
  wrong in a build on 2026-08-12.
- **1,557 kbps is DART's measured playback ceiling.** 2.6 Mbps froze it mid-talk; 1.2 Mbps played.
- **`--no-flush` discipline:** production is an explicit opt-in, never a default. Fabricated leads
  have reached the live inbox twice.
- **The booth app sends no client email** beyond the asset-at-capture delivery that already exists
  in `src/app/api/expo-leads/route.ts`.
- **JSON library is `org.json`** (`JSONObject`, `JSONArray`), already used throughout `kiosk-app`.
- **Package for all new kiosk-app files:** `com.streamstage.boothloop.show`.
- **No new Gradle dependencies.** Every task compiles against what `kiosk-app/app/build.gradle.kts`
  already declares.
- **Pure objects take no `android.content.Context`** and import nothing from `android.*`. This is
  what makes them fast to gate and possible for a local model to write.

---

## Lane assignment — read before dispatching anything

The local-parallel-build skill's measured boundary: local models do **transcription** (a single
file whose literal shape is dictated in the task), not **synthesis** (anything needing a helper
shared across exports, or cross-file consistency). Assignments follow that boundary, not file count.

| # | Task | Lane | Why |
|---|---|---|---|
| 0 | `ShowContract.kt` — shared shapes and constants | **supervisor** | Skill §8: the contract is task zero and is never dispatched |
| 1 | `LeadValidator.kt` | local | Pure function, rules dictated literally |
| 2 | `TypoDomains.kt` | local | Pure lookup table plus one function |
| 3 | `EncodeCeiling.kt` | local | Pure function, one measured constant |
| 4 | `PrizeDraw.kt` | local | Pure logic with a dictated audit line |
| 5 | `DigestRenderer.kt` | local | Pure string building from a dictated shape |
| 6 | `ShowHealth.kt` | local | Pure view-model, the proven presentational shape |
| 7 | Show lifecycle wiring into `BoothServer`/`BoothStore` | **supervisor** | Cross-file, mutates two 800-line files |
| 8 | Shared core module (the six duplicated files) | **supervisor** | Cross-file refactor across two apps, 1,500 lines each |
| 9 | Tablet capture validation in `tablet.html` | **supervisor** | Edit inside an existing 1,485-line file, not a leaf |
| 10 | Booth to CommandCentered bridge | **BLOCKED** | See "Blocked work" below. Do not start |
| 11 | Rode ingest, Whisper slices, confidence marking | **supervisor** | Multi-system Python pipeline off-box |
| 12 | Phone hold-to-talk memo | **supervisor** | Audio capture plus lifecycle, needs `MainActivity` wiring |

**Tasks 1 to 6 are the local queue.** Each is a leaf: it imports the contract and pre-existing code
only, never another task's output, so it can compile the moment it is written and the order it lands
in does not matter.

---

## Blocked work — do not design around it, do not invent fields

**Task 10, the bridge, cannot be built.** `CommandCentered/app/src/app/api/webhook/lead-intake/route.ts:26`
hard-rejects any payload missing `organization` AND `contactName`. The booth is deliberately one
email box, so most real booth leads have neither. The endpoint also has nowhere to put `captured_at`,
`channel`, `consent`, `is_test` or `staff_note`.

Verified 2026-08-14 by artefact, not by log: the route has exactly one commit (`77675f9`), an mtime
of 2026-03-25, and the request in `CommandCentered/INBOX.md` (posted 2026-08-13 12:54) is still the
last `## From` entry with no reply. **Re-verify both before starting task 10.**

Acceptance criteria 3 and 4 depend on this task and stay unmet until it is answered. The rest of
v1 does not depend on it, which is why it is last.

**Also unanswered:** the audio retention PERIOD (spec §8 item 4). Everything else about retention is
written as a storage-layer rule the code enforces today.

---

## Acceptance criteria coverage

Spec §5's thirteen criteria, mapped to the tasks that satisfy them. Any criterion with no task is a
plan defect.

| AC | Criterion, short form | Task(s) |
|---|---|---|
| 1 | Stick with no network shows the loop | already shipped (`boothloop 1.5.0`) |
| 2 | Tablet finds stick with no typed IP | already shipped (2026-08-11 stick-hosted rebuild) |
| 3 | Lead captured offline reaches CRM exactly once | 1, 7, **10 (blocked)** |
| 4 | Same person on two channels is one lead | 1, **10 (blocked)** |
| 5 | Keyboard mash impossible to submit | 1, 2, 9 |
| 6 | Memo attaches to intended lead, survives app kill | 12 |
| 7 | Rode slices match, stamped with confidence | 11 |
| 8 | One decisions digest to PA, no client email | 5, 7 |
| 9 | Test run cannot write to production | 0, 7 |
| 10 | Closing a show produces export and digest in one action | 5, 7 |
| 11 | Prize draw entry is a record with a defensible winner | 4, 7 |
| 12 | Film over the ceiling cannot be added | 3 |
| 13 | Phone show-health answers host, queue depth, last flush | 6 |

---

## File structure

```
kiosk-app/app/src/main/java/com/streamstage/boothloop/show/
  ShowContract.kt      task 0  supervisor  shapes, constants, enums every other file imports
  LeadValidator.kt     task 1  local       validate + normalise one captured lead
  TypoDomains.kt       task 2  local       known-typo domain suggestions
  EncodeCeiling.kt     task 3  local       refuse a film over 1,557 kbps
  PrizeDraw.kt         task 4  local       entries, winner pick, audit line
  DigestRenderer.kt    task 5  local       the end-of-show decisions digest
  ShowHealth.kt        task 6  local       the phone's show-health view model
  ShowLifecycle.kt     task 7  supervisor  arm / live / close, owns the journal
kiosk-app/app/src/test/java/com/streamstage/boothloop/show/
  <one test file per task above, written by the task itself>
```

Every file in `show/` is pure Kotlin with no `android.*` import, which is what makes the gate fast
and the local lane possible.

---

## The gate

Measured on this machine, 2026-08-20. `./gradlew :app:compileDebugKotlin` is **whole-module**, so
per skill defect #6 the driver must **attribute**: fail a task only when the compiler errors name
that task's own target file, and log anything else as "not this task's fault" so an innocent task is
never parked for someone else's breakage.

Per-task gate, all four required:

1. Target file exists and is non-empty.
2. `./gradlew :app:compileDebugKotlin` reports no error naming the target file.
3. **Shape assertion** (skill defect #11 — compiling is not doing): the file declares the exact
   symbol the task names, checked by grep.
4. **Stub-marker grep**: the file contains no `TODO`, `Not implemented`, `NotImplementedError` or
   `stub`. One reference-run model wrote `error = 'Not implemented'` deliberately so the typecheck
   would pass, then reported three functional actions.

---

## Task 0: The shared contract (supervisor, never dispatched)

**Files:**
- Create: `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/ShowContract.kt`

**Interfaces:**
- Consumes: nothing. This is the root.
- Produces: every symbol tasks 1 to 6 import. No task file may redefine any of these.

- [ ] **Step 1: Write the contract**

```kotlin
package com.streamstage.boothloop.show

import org.json.JSONObject

/**
 * The one place the booth's shared shapes live. Every file in this package imports from here and
 * none of them redefine any of it. A per-file builder cannot see its peers, so this file is the
 * only way they can agree.
 *
 * Nothing here touches android.* on purpose: it keeps the compile gate fast and the logic testable
 * on the JVM.
 */

/** Where a person entered from. Open-ended by design so the attract game can add a lane later. */
object Channel {
    const val BOOTH_TABLET = "booth_tablet"
    const val TALK_QR = "talk_qr"
    const val BOOTH_TV = "booth_tv"
    const val CHECKLIST = "checklist"
    const val DNYC = "dnyc"
    const val WEBSITE = "website"
    const val GAME = "game"

    val ALL = setOf(BOOTH_TABLET, TALK_QR, BOOTH_TV, CHECKLIST, DNYC, WEBSITE, GAME)
}

/** What posture the app is in. Spec §10 pattern 3: one posture derives every safety default. */
enum class Posture {
    REHEARSAL,
    LIVE;

    /** Production writes are an explicit opt-in. Fabricated leads reached the live inbox twice. */
    val mayWriteProduction: Boolean get() = this == LIVE
}

/** A show is a run inside a booth campaign. Arm, live, close: the primitive v1 hangs off. */
enum class ShowState { ARMED, LIVE, CLOSED }

/**
 * One captured person, before validation. Free text as typed, nothing normalised, nothing invented.
 * Absent is null. Absent is never a placeholder.
 */
data class RawLead(
    val email: String?,
    val studio: String?,
    val name: String?,
    val phone: String?,
    val channel: String,
    val deviceId: String?,
    val capturedAtIso: String?,
    val noteText: String?,
    val isTest: Boolean = false,
)

/** The reason a lead was refused. One per rule, so the tablet can say which box is wrong. */
enum class LeadReject {
    EMAIL_MISSING,
    EMAIL_MALFORMED,
    EMAIL_LOCAL_TOO_SHORT,
    EMAIL_REPEATED_CHARACTER_RUN,
    EMAIL_NO_VOWEL_IN_LOCAL,
    CHANNEL_UNKNOWN,
    CAPTURED_AT_MISSING_OFFSET,
}

/**
 * The result of validating one RawLead. `suggestion` is a "did you mean" for a known typo domain
 * and is NEVER applied automatically: the visitor is standing there and can confirm it themselves.
 */
data class LeadVerdict(
    val ok: Boolean,
    val rejects: List<LeadReject>,
    val normalisedEmail: String?,
    val suggestion: String?,
)

/** Timestamps are event-local WITH offset, never bare UTC. */
const val ISO_OFFSET_PATTERN = "yyyy-MM-dd'T'HH:mm:ssXXX"

/** DART's measured playback ceiling. 2.6 Mbps froze it mid-talk; 1.2 Mbps played. */
const val BITRATE_CEILING_KBPS = 1557

/** Every automatic lead-to-audio join carries one of these plus its basis. */
enum class MatchConfidence { CONFIRMED, PROBABLE, CANDIDATE }

/** Convenience for the pure files: build a JSONObject without importing android.* anywhere. */
fun jsonOf(vararg pairs: Pair<String, Any?>): JSONObject {
    val o = JSONObject()
    for ((k, v) in pairs) o.put(k, v ?: JSONObject.NULL)
    return o
}
```

- [ ] **Step 2: Gate it**

Run: `cd kiosk-app && ./gradlew :app:compileDebugKotlin`
Expected: no error naming `ShowContract.kt`.

- [ ] **Step 3: Commit**

```bash
git add kiosk-app/app/src/main/java/com/streamstage/boothloop/show/ShowContract.kt
git commit -m "feat(show): the shared contract every booth rule imports"
```

---

## Task 1: LeadValidator (LANE: local)

**Files:**
- Create: `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/LeadValidator.kt`

**Interfaces:**
- Consumes: `RawLead`, `LeadVerdict`, `LeadReject`, `Channel`, `ISO_OFFSET_PATTERN` from
  `ShowContract.kt`; `suggestFor` from `TypoDomains.kt` (task 2).
- Produces: `object LeadValidator { fun validate(lead: RawLead): LeadVerdict }`

**Why these rules exist:** ten Calgary tablet rows are keyboard mash (`dd@hjj.com`, `ghh@fff.com`),
and one real studio's email landed in the studio-name field, making the hottest lead of the show
invisible until it was reconstructed by hand.

- [ ] **Step 1: Write the failing test**

Create `kiosk-app/app/src/test/java/com/streamstage/boothloop/show/LeadValidatorTest.kt`:

```kotlin
package com.streamstage.boothloop.show

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LeadValidatorTest {
    private fun raw(email: String?, channel: String = Channel.BOOTH_TABLET) = RawLead(
        email = email,
        studio = null,
        name = null,
        phone = null,
        channel = channel,
        deviceId = "tablet-1",
        capturedAtIso = "2026-08-11T10:07:00-06:00",
        noteText = null,
    )

    @Test fun acceptsAPlainRealAddress() {
        val v = LeadValidator.validate(raw("rosiepunzo@gmail.com"))
        assertTrue(v.ok)
        assertTrue(v.rejects.isEmpty())
        assertEquals("rosiepunzo@gmail.com", v.normalisedEmail)
    }

    @Test fun lowercasesAndTrims() {
        val v = LeadValidator.validate(raw("  Rosie.Punzo@GMAIL.com "))
        assertEquals("rosie.punzo@gmail.com", v.normalisedEmail)
    }

    @Test fun refusesMissingEmail() {
        val v = LeadValidator.validate(raw(null))
        assertFalse(v.ok)
        assertTrue(v.rejects.contains(LeadReject.EMAIL_MISSING))
    }

    @Test fun refusesKeyboardMash() {
        // Both are real rows from the Calgary record.
        assertFalse(LeadValidator.validate(raw("dd@hjj.com")).ok)
        assertFalse(LeadValidator.validate(raw("ghh@fff.com")).ok)
    }

    @Test fun refusesRepeatedCharacterRun() {
        val v = LeadValidator.validate(raw("aaaa@gmail.com"))
        assertFalse(v.ok)
        assertTrue(v.rejects.contains(LeadReject.EMAIL_REPEATED_CHARACTER_RUN))
    }

    @Test fun refusesAnUnknownChannel() {
        val v = LeadValidator.validate(raw("rosiepunzo@gmail.com", channel = "carrier_pigeon"))
        assertFalse(v.ok)
        assertTrue(v.rejects.contains(LeadReject.CHANNEL_UNKNOWN))
    }

    @Test fun refusesABareUtcTimestamp() {
        val lead = raw("rosiepunzo@gmail.com").copy(capturedAtIso = "2026-08-11T16:07:00Z")
        val v = LeadValidator.validate(lead)
        assertFalse(v.ok)
        assertTrue(v.rejects.contains(LeadReject.CAPTURED_AT_MISSING_OFFSET))
    }

    @Test fun suggestsWithoutApplying() {
        // The Steppin' Up failure: a real domain typo that has valid MX and still hard bounces.
        val v = LeadValidator.validate(raw("steppinupdanceco@outlook.co"))
        assertEquals("steppinupdanceco@outlook.com", v.suggestion)
        assertEquals("steppinupdanceco@outlook.co", v.normalisedEmail)
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*LeadValidatorTest*"`
Expected: FAIL, "Unresolved reference: LeadValidator".

- [ ] **Step 3: Write the implementation**

Exactly one file, `LeadValidator.kt`, containing `object LeadValidator` with a single public
`fun validate(lead: RawLead): LeadVerdict` that applies these rules in order and accumulates every
reject rather than returning on the first:

1. `EMAIL_MISSING` when email is null or blank after trimming.
2. Normalise: trim, lowercase. This is the value returned as `normalisedEmail`.
3. `EMAIL_MALFORMED` unless the normalised value matches `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`.
4. `EMAIL_LOCAL_TOO_SHORT` when the part before `@` is shorter than 3 characters.
5. `EMAIL_NO_VOWEL_IN_LOCAL` when the part before `@` contains none of `aeiouy` and no digit.
6. `EMAIL_REPEATED_CHARACTER_RUN` when the part before `@` contains the same character 3 or more
   times consecutively.
7. `CHANNEL_UNKNOWN` when `lead.channel` is not in `Channel.ALL`.
8. `CAPTURED_AT_MISSING_OFFSET` when `capturedAtIso` is non-null and does not end with `+HH:MM`,
   `-HH:MM`. A trailing `Z` is a bare-UTC value and is refused: the event's local offset is what
   makes a capture minute mean anything.
9. `suggestion` comes from `TypoDomains.suggestFor(normalisedEmail)` and is never applied.
10. `ok` is true only when `rejects` is empty.

`ok` must never be true while `rejects` is non-empty.

- [ ] **Step 4: Run the test and watch it pass**

Run: `cd kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*LeadValidatorTest*"`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add kiosk-app/app/src/main/java/com/streamstage/boothloop/show/LeadValidator.kt \
        kiosk-app/app/src/test/java/com/streamstage/boothloop/show/LeadValidatorTest.kt
git commit -m "feat(show): one lead contract, validated at the edge"
```

**RULES for the dispatched builder:**
- Write exactly ONE file: `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/LeadValidator.kt`
- Do NOT create or modify any other file. The test file above already exists.
- Acceptance: `./gradlew :app:compileDebugKotlin` reports no error naming `LeadValidator.kt`, and
  the file declares `object LeadValidator` with `fun validate(`.
- Do NOT write `TODO`, `Not implemented` or any stub. A file that compiles but does nothing fails.
- DO NOT fix bugs or refactor outside this file. If you find one, note it and leave it.

---

## Task 2: TypoDomains (LANE: local)

**Files:**
- Create: `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/TypoDomains.kt`

**Interfaces:**
- Consumes: nothing but the Kotlin standard library.
- Produces: `object TypoDomains { fun suggestFor(email: String?): String? }`

**Why this exists and why it is not an MX lookup:** `dig MX outlook.co` returns
`nam.olc.protection.outlook.com`. Microsoft owns the typo domain, so it has valid MX, accepts mail
and hard-bounces it. A live MX check would NOT have caught the Steppin' Up failure. A known-typo
table does, and it works on the booth's LAN with no internet, which is the network the booth is
designed for.

- [ ] **Step 1: Write the failing test**

Create `kiosk-app/app/src/test/java/com/streamstage/boothloop/show/TypoDomainsTest.kt`:

```kotlin
package com.streamstage.boothloop.show

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TypoDomainsTest {
    @Test fun catchesTheSteppinUpFailure() {
        assertEquals(
            "steppinupdanceco@outlook.com",
            TypoDomains.suggestFor("steppinupdanceco@outlook.co"),
        )
    }

    @Test fun catchesCommonGmailTypos() {
        assertEquals("a@gmail.com", TypoDomains.suggestFor("a@gmial.com"))
        assertEquals("a@gmail.com", TypoDomains.suggestFor("a@gmai.com"))
        assertEquals("a@gmail.com", TypoDomains.suggestFor("a@gmail.co"))
    }

    @Test fun catchesHotmailAndYahooTypos() {
        assertEquals("a@hotmail.com", TypoDomains.suggestFor("a@hotmai.com"))
        assertEquals("a@yahoo.com", TypoDomains.suggestFor("a@yaho.com"))
    }

    @Test fun leavesAGoodAddressAlone() {
        assertNull(TypoDomains.suggestFor("rosiepunzo@gmail.com"))
        assertNull(TypoDomains.suggestFor("info@muskokadance.ca"))
    }

    @Test fun toleratesRubbishInput() {
        assertNull(TypoDomains.suggestFor(null))
        assertNull(TypoDomains.suggestFor(""))
        assertNull(TypoDomains.suggestFor("no-at-sign"))
    }

    @Test fun isCaseInsensitive() {
        assertEquals("a@gmail.com", TypoDomains.suggestFor("A@GMIAL.COM"))
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*TypoDomainsTest*"`
Expected: FAIL, "Unresolved reference: TypoDomains".

- [ ] **Step 3: Write the implementation**

Exactly one file containing `object TypoDomains` with a private `val CORRECTIONS: Map<String, String>`
mapping each typo domain to its correction, and one public
`fun suggestFor(email: String?): String?` that lowercases and trims the input, returns null when the
input is null, blank or has no `@`, takes the substring after the last `@`, looks it up, and returns
the local part joined to the corrected domain with `@`. Returns null when the domain is not in the
map.

The map must contain at least these pairs, all of which are real observed typos:

```
outlook.co -> outlook.com          hotmai.com -> hotmail.com
gmial.com -> gmail.com             hotmial.com -> hotmail.com
gmai.com -> gmail.com              hotmail.co -> hotmail.com
gmail.co -> gmail.com              yaho.com -> yahoo.com
gmail.cm -> gmail.com              yahooo.com -> yahoo.com
gnail.com -> gmail.com             yahoo.co -> yahoo.com
gmail.con -> gmail.com             icloud.co -> icloud.com
outlook.cm -> outlook.com          shaw.ca -> shaw.ca is NOT a typo, do not include it
```

Do not include any domain that is genuinely valid. `shaw.ca`, `sympatico.ca`, `telus.net` and
`muskokadance.ca` are real Canadian domains and must never appear as keys.

- [ ] **Step 4: Run the test and watch it pass**

Run: `cd kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*TypoDomainsTest*"`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add kiosk-app/app/src/main/java/com/streamstage/boothloop/show/TypoDomains.kt \
        kiosk-app/app/src/test/java/com/streamstage/boothloop/show/TypoDomainsTest.kt
git commit -m "feat(show): catch the typo domains that pass an MX check and still bounce"
```

**RULES for the dispatched builder:**
- Write exactly ONE file: `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/TypoDomains.kt`
- Do NOT create or modify any other file. The test file above already exists.
- Acceptance: `./gradlew :app:compileDebugKotlin` reports no error naming `TypoDomains.kt`, and the
  file declares `object TypoDomains` with `fun suggestFor(`.
- Do NOT write `TODO`, `Not implemented` or any stub.
- DO NOT fix bugs or refactor outside this file. If you find one, note it and leave it.

---

## Task 3: EncodeCeiling (LANE: local)

**Files:**
- Create: `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/EncodeCeiling.kt`

**Interfaces:**
- Consumes: `BITRATE_CEILING_KBPS` from `ShowContract.kt`.
- Produces: `object EncodeCeiling { fun check(kbps: Int, name: String): CeilingVerdict }` and
  `data class CeilingVerdict(val accepted: Boolean, val reason: String?)`, both declared in this file.

**Why:** a 2.6 Mbps encode froze DART on stage mid-talk. The film that would freeze the screen must
be refused at the point it enters the library, not discovered in front of a room. AC 12.

- [ ] **Step 1: Write the failing test**

Create `kiosk-app/app/src/test/java/com/streamstage/boothloop/show/EncodeCeilingTest.kt`:

```kotlin
package com.streamstage.boothloop.show

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class EncodeCeilingTest {
    @Test fun acceptsTheEncodeThatPlayed() {
        // 1.2 Mbps played on DART.
        assertTrue(EncodeCeiling.check(1200, "robot-wall.mp4").accepted)
    }

    @Test fun acceptsExactlyTheCeiling() {
        assertTrue(EncodeCeiling.check(BITRATE_CEILING_KBPS, "edge.mp4").accepted)
    }

    @Test fun refusesTheEncodeThatFroze() {
        // 2.6 Mbps froze DART mid-talk on 2026-08-11.
        val v = EncodeCeiling.check(2600, "robot-wall.mp4")
        assertFalse(v.accepted)
        assertTrue(v.reason!!.contains("robot-wall.mp4"))
        assertTrue(v.reason!!.contains("2600"))
        assertTrue(v.reason!!.contains("1557"))
    }

    @Test fun refusesOneKbpsOver() {
        assertFalse(EncodeCeiling.check(BITRATE_CEILING_KBPS + 1, "edge.mp4").accepted)
    }

    @Test fun refusesAnUnknownBitrate() {
        // ffprobe could not read it. Unknown is not permission.
        val v = EncodeCeiling.check(0, "mystery.mp4")
        assertFalse(v.accepted)
        assertTrue(v.reason!!.contains("mystery.mp4"))
    }

    @Test fun acceptedVerdictCarriesNoReason() {
        assertEquals(null, EncodeCeiling.check(900, "fine.mp4").reason)
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*EncodeCeilingTest*"`
Expected: FAIL, "Unresolved reference: EncodeCeiling".

- [ ] **Step 3: Write the implementation**

Exactly one file declaring `data class CeilingVerdict(val accepted: Boolean, val reason: String?)`
and `object EncodeCeiling` with one public `fun check(kbps: Int, name: String): CeilingVerdict`:

- `kbps` at or below `BITRATE_CEILING_KBPS` and greater than 0 returns
  `CeilingVerdict(true, null)`.
- `kbps` of 0 or less returns `CeilingVerdict(false, ...)` with a reason naming the file and saying
  the bitrate could not be read. Unknown is not permission.
- Anything above the ceiling returns `CeilingVerdict(false, ...)` with a reason containing the file
  name, the measured value, and the ceiling value, in that order.

- [ ] **Step 4: Run the test and watch it pass**

Run: `cd kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*EncodeCeilingTest*"`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add kiosk-app/app/src/main/java/com/streamstage/boothloop/show/EncodeCeiling.kt \
        kiosk-app/app/src/test/java/com/streamstage/boothloop/show/EncodeCeilingTest.kt
git commit -m "feat(show): the film that would freeze the screen cannot be added"
```

**RULES for the dispatched builder:**
- Write exactly ONE file: `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/EncodeCeiling.kt`
- Do NOT create or modify any other file. The test file above already exists.
- Acceptance: `./gradlew :app:compileDebugKotlin` reports no error naming `EncodeCeiling.kt`, and
  the file declares `object EncodeCeiling` with `fun check(`.
- Do NOT write `TODO`, `Not implemented` or any stub.
- DO NOT fix bugs or refactor outside this file. If you find one, note it and leave it.

---

## Task 4: PrizeDraw (LANE: local)

**Files:**
- Create: `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/PrizeDraw.kt`

**Interfaces:**
- Consumes: nothing but the Kotlin standard library.
- Produces: `data class DrawEntry(val email: String, val capturedAtIso: String, val consent: Boolean)`,
  `data class DrawResult(val winner: DrawEntry?, val auditLine: String, val eligibleCount: Int)`,
  and `object PrizeDraw { fun pick(entries: List<DrawEntry>, seed: Long): DrawResult }`, all in
  this file.

**Why:** Calgary's prize draw has no record anywhere. Zero of 41 lead emails mention a prize, draw
or winner, and the winner's name was owed to the organiser by a hard 4:00 PM deadline. AC 11 says
an entry is a record and the winner must be defensible to an organiser afterwards, which is why the
pick is seeded and the seed is in the audit line: the same seed and the same entries always produce
the same winner, so the draw can be re-run in front of someone.

- [ ] **Step 1: Write the failing test**

Create `kiosk-app/app/src/test/java/com/streamstage/boothloop/show/PrizeDrawTest.kt`:

```kotlin
package com.streamstage.boothloop.show

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PrizeDrawTest {
    private fun entry(email: String, consent: Boolean = true) =
        DrawEntry(email, "2026-08-11T10:07:00-06:00", consent)

    private val three = listOf(entry("a@gmail.com"), entry("b@gmail.com"), entry("c@gmail.com"))

    @Test fun picksAWinnerFromTheEligible() {
        val r = PrizeDraw.pick(three, seed = 42L)
        assertNotNull(r.winner)
        assertTrue(three.contains(r.winner))
        assertEquals(3, r.eligibleCount)
    }

    @Test fun isReproducibleForTheOrganiser() {
        assertEquals(
            PrizeDraw.pick(three, seed = 42L).winner,
            PrizeDraw.pick(three, seed = 42L).winner,
        )
    }

    @Test fun excludesEntriesWithoutConsent() {
        val mixed = listOf(entry("yes@gmail.com"), entry("no@gmail.com", consent = false))
        val r = PrizeDraw.pick(mixed, seed = 1L)
        assertEquals(1, r.eligibleCount)
        assertEquals("yes@gmail.com", r.winner!!.email)
    }

    @Test fun deduplicatesTheSamePersonEnteringTwice() {
        val dupes = listOf(entry("a@gmail.com"), entry("a@gmail.com"), entry("b@gmail.com"))
        assertEquals(2, PrizeDraw.pick(dupes, seed = 1L).eligibleCount)
    }

    @Test fun anEmptyDrawHasNoWinnerAndSaysSo() {
        val r = PrizeDraw.pick(emptyList(), seed = 1L)
        assertNull(r.winner)
        assertEquals(0, r.eligibleCount)
        assertTrue(r.auditLine.contains("0"))
    }

    @Test fun theAuditLineCarriesSeedCountAndWinner() {
        val r = PrizeDraw.pick(three, seed = 42L)
        assertTrue(r.auditLine.contains("42"))
        assertTrue(r.auditLine.contains("3"))
        assertTrue(r.auditLine.contains(r.winner!!.email))
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*PrizeDrawTest*"`
Expected: FAIL, "Unresolved reference: PrizeDraw".

- [ ] **Step 3: Write the implementation**

Exactly one file declaring both data classes above and `object PrizeDraw` with one public
`fun pick(entries: List<DrawEntry>, seed: Long): DrawResult`:

1. Keep only entries where `consent` is true.
2. Deduplicate by lowercased email, keeping the earliest `capturedAtIso`.
3. Sort the survivors by email so the order does not depend on capture order.
4. `eligibleCount` is the size after steps 1 to 3.
5. When the list is empty, return `DrawResult(null, auditLine, 0)` where the audit line states
   0 eligible entries and names the seed.
6. Otherwise pick with `kotlin.random.Random(seed)` over the sorted list.
7. `auditLine` is one line containing the seed, the eligible count, and the winner's email, so it
   can be shown to an organiser and re-run.

Use `kotlin.random.Random(seed)`, never `Math.random()` or an unseeded `Random()`. A draw nobody can
reproduce is the failure this task exists to fix.

- [ ] **Step 4: Run the test and watch it pass**

Run: `cd kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*PrizeDrawTest*"`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add kiosk-app/app/src/main/java/com/streamstage/boothloop/show/PrizeDraw.kt \
        kiosk-app/app/src/test/java/com/streamstage/boothloop/show/PrizeDrawTest.kt
git commit -m "feat(show): a prize draw the organiser can be shown afterwards"
```

**RULES for the dispatched builder:**
- Write exactly ONE file: `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/PrizeDraw.kt`
- Do NOT create or modify any other file. The test file above already exists.
- Acceptance: `./gradlew :app:compileDebugKotlin` reports no error naming `PrizeDraw.kt`, and the
  file declares `object PrizeDraw` with `fun pick(`.
- Do NOT write `TODO`, `Not implemented` or any stub.
- DO NOT fix bugs or refactor outside this file. If you find one, note it and leave it.

---

## Task 5: DigestRenderer (LANE: local)

**Files:**
- Create: `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/DigestRenderer.kt`

**Interfaces:**
- Consumes: `RawLead` from `ShowContract.kt`.
- Produces: `object DigestRenderer { fun render(showName: String, leads: List<RawLead>, drawAudit: String?): String }`

**Why:** AC 8 wants ONE digest of decisions in the PA inbox at end of show, not one item per lead.
Twenty two items is noise. The PA owns the follow-up queue and every send decision, so this renders
what was captured and nothing else: it proposes no follow-up and drafts no email.

- [ ] **Step 1: Write the failing test**

Create `kiosk-app/app/src/test/java/com/streamstage/boothloop/show/DigestRendererTest.kt`:

```kotlin
package com.streamstage.boothloop.show

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DigestRendererTest {
    private fun lead(email: String, channel: String, test: Boolean = false, note: String? = null) =
        RawLead(
            email = email, studio = null, name = null, phone = null,
            channel = channel, deviceId = "tablet-1",
            capturedAtIso = "2026-08-11T10:07:00-06:00", noteText = note, isTest = test,
        )

    private val leads = listOf(
        lead("a@gmail.com", Channel.BOOTH_TABLET),
        lead("b@gmail.com", Channel.TALK_QR, note = "wants a content day"),
        lead("t@test.com", Channel.BOOTH_TABLET, test = true),
    )

    @Test fun countsRealLeadsAndExcludesTests() {
        val out = DigestRenderer.render("Calgary CDTE day 2", leads, null)
        assertTrue(out.contains("2"))
        assertFalse(out.contains("t@test.com"))
    }

    @Test fun namesTheShow() {
        assertTrue(DigestRenderer.render("Calgary CDTE day 2", leads, null).contains("Calgary CDTE day 2"))
    }

    @Test fun breaksDownByChannel() {
        val out = DigestRenderer.render("s", leads, null)
        assertTrue(out.contains(Channel.BOOTH_TABLET))
        assertTrue(out.contains(Channel.TALK_QR))
    }

    @Test fun surfacesNotes() {
        assertTrue(DigestRenderer.render("s", leads, null).contains("wants a content day"))
    }

    @Test fun includesTheDrawAuditWhenThereIsOne() {
        val out = DigestRenderer.render("s", leads, "seed=42 eligible=3 winner=a@gmail.com")
        assertTrue(out.contains("seed=42"))
    }

    @Test fun aShowWithNoLeadsSaysSoRatherThanRenderingNothing() {
        val out = DigestRenderer.render("Empty show", emptyList(), null)
        assertTrue(out.contains("Empty show"))
        assertTrue(out.contains("0"))
    }

    @Test fun neverDraftsClientEmail() {
        // The booth app sends no client email. The digest must not read as one.
        val out = DigestRenderer.render("s", leads, null).lowercase()
        assertFalse(out.contains("dear "))
        assertFalse(out.contains("subject:"))
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*DigestRendererTest*"`
Expected: FAIL, "Unresolved reference: DigestRenderer".

- [ ] **Step 3: Write the implementation**

Exactly one file containing `object DigestRenderer` with one public
`fun render(showName: String, leads: List<RawLead>, drawAudit: String?): String` producing markdown:

- A heading line naming the show.
- A total count of leads where `isTest` is false. Test rows are excluded from every count and never
  listed.
- A per-channel breakdown, one line per channel present, each naming the channel constant and its
  count.
- A notes section listing every non-blank `noteText` from a non-test lead, with its email.
- The draw audit line verbatim when `drawAudit` is non-null, omitted entirely when it is null.
- When there are no leads, still render the heading and a zero count. A show that captured nothing
  says so rather than rendering an empty string.

Never write a salutation, a subject line, or any text addressed to a lead. This is a note to the PA
about what happened, not a message to a client.

- [ ] **Step 4: Run the test and watch it pass**

Run: `cd kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*DigestRendererTest*"`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add kiosk-app/app/src/main/java/com/streamstage/boothloop/show/DigestRenderer.kt \
        kiosk-app/app/src/test/java/com/streamstage/boothloop/show/DigestRendererTest.kt
git commit -m "feat(show): one digest of decisions, not one item per lead"
```

**RULES for the dispatched builder:**
- Write exactly ONE file: `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/DigestRenderer.kt`
- Do NOT create or modify any other file. The test file above already exists.
- Acceptance: `./gradlew :app:compileDebugKotlin` reports no error naming `DigestRenderer.kt`, and
  the file declares `object DigestRenderer` with `fun render(`.
- Do NOT write `TODO`, `Not implemented` or any stub.
- DO NOT fix bugs or refactor outside this file. If you find one, note it and leave it.

---

## Task 6: ShowHealth (LANE: local)

**Files:**
- Create: `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/ShowHealth.kt`

**Interfaces:**
- Consumes: `ShowState` from `ShowContract.kt`.
- Produces: `data class HealthInput(...)`, `data class HealthLine(val label: String, val value: String, val alarming: Boolean)`,
  and `object ShowHealth { fun lines(input: HealthInput, nowEpochMs: Long): List<HealthLine> }`, all
  in this file.

**Why:** AC 13. Every incident during Calgary was found by walking to the booth. The data already
exists in `Diag.kt` and `Discovery.kt`; nothing renders it as an answer. This is the pure view model
only. The supervisor wires it into the phone's UI in task 7, which is why it takes `nowEpochMs` as a
parameter rather than reading the clock: a view model that reads the clock cannot be tested.

- [ ] **Step 1: Write the failing test**

Create `kiosk-app/app/src/test/java/com/streamstage/boothloop/show/ShowHealthTest.kt`:

```kotlin
package com.streamstage.boothloop.show

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ShowHealthTest {
    private val now = 1_754_920_000_000L

    private fun input(
        host: String? = "192.168.1.11:8180",
        queued: Int = 0,
        lastFlushEpochMs: Long? = now - 60_000L,
        state: ShowState = ShowState.LIVE,
    ) = HealthInput(host, queued, lastFlushEpochMs, state)

    private fun valueOf(lines: List<HealthLine>, label: String) =
        lines.first { it.label == label }.value

    @Test fun namesTheHostThatIsAnswering() {
        assertEquals("192.168.1.11:8180", valueOf(ShowHealth.lines(input(), now), "Host"))
    }

    @Test fun aMissingHostIsAlarming() {
        val line = ShowHealth.lines(input(host = null), now).first { it.label == "Host" }
        assertTrue(line.alarming)
    }

    @Test fun reportsQueueDepth() {
        assertEquals("0", valueOf(ShowHealth.lines(input(), now), "Queued"))
        assertEquals("7", valueOf(ShowHealth.lines(input(queued = 7), now), "Queued"))
    }

    @Test fun anEmptyQueueIsNotAlarming() {
        assertFalse(ShowHealth.lines(input(queued = 0), now).first { it.label == "Queued" }.alarming)
    }

    @Test fun aRecentFlushIsNotAlarming() {
        val l = ShowHealth.lines(input(lastFlushEpochMs = now - 60_000L), now)
        assertFalse(l.first { it.label == "Last flush" }.alarming)
    }

    @Test fun aStaleFlushIsAlarming() {
        // Over 15 minutes with leads queued means the bridge is not moving.
        val l = ShowHealth.lines(input(queued = 3, lastFlushEpochMs = now - 16 * 60_000L), now)
        assertTrue(l.first { it.label == "Last flush" }.alarming)
    }

    @Test fun neverFlushedSaysSoRatherThanShowingAnEpoch() {
        val v = valueOf(ShowHealth.lines(input(lastFlushEpochMs = null), now), "Last flush")
        assertTrue(v.lowercase().contains("never"))
        assertFalse(v.contains("1970"))
    }

    @Test fun reportsShowState() {
        assertEquals("LIVE", valueOf(ShowHealth.lines(input(), now), "Show"))
    }

    @Test fun alwaysReturnsAllFourLinesInOrder() {
        val labels = ShowHealth.lines(input(), now).map { it.label }
        assertEquals(listOf("Show", "Host", "Queued", "Last flush"), labels)
    }
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*ShowHealthTest*"`
Expected: FAIL, "Unresolved reference: ShowHealth".

- [ ] **Step 3: Write the implementation**

Exactly one file declaring:

```kotlin
data class HealthInput(
    val host: String?,
    val queued: Int,
    val lastFlushEpochMs: Long?,
    val state: ShowState,
)

data class HealthLine(val label: String, val value: String, val alarming: Boolean)
```

and `object ShowHealth` with one public
`fun lines(input: HealthInput, nowEpochMs: Long): List<HealthLine>` returning exactly four lines,
always in this order, always all four present:

1. `"Show"` — the state name (`ARMED`, `LIVE`, `CLOSED`). Alarming when the state is `CLOSED` while
   `queued` is greater than 0, because a closed show still holding leads has not exported.
2. `"Host"` — the host string, or `"none"` when null. Alarming when null.
3. `"Queued"` — the queue depth as a string. Alarming when greater than 25.
4. `"Last flush"` — a human relative age such as `"2m ago"` or `"1h 4m ago"`, or `"never"` when
   `lastFlushEpochMs` is null. Alarming when `queued` is greater than 0 AND the age exceeds 15
   minutes, or when it is null AND `queued` is greater than 0.

Never render a null timestamp as an epoch or a 1970 date. "never" is the honest answer.

- [ ] **Step 4: Run the test and watch it pass**

Run: `cd kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*ShowHealthTest*"`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add kiosk-app/app/src/main/java/com/streamstage/boothloop/show/ShowHealth.kt \
        kiosk-app/app/src/test/java/com/streamstage/boothloop/show/ShowHealthTest.kt
git commit -m "feat(show): answer the booth's state without walking to the booth"
```

**RULES for the dispatched builder:**
- Write exactly ONE file: `kiosk-app/app/src/main/java/com/streamstage/boothloop/show/ShowHealth.kt`
- Do NOT create or modify any other file. The test file above already exists.
- Acceptance: `./gradlew :app:compileDebugKotlin` reports no error naming `ShowHealth.kt`, and the
  file declares `object ShowHealth` with `fun lines(`.
- Do NOT write `TODO`, `Not implemented` or any stub.
- DO NOT fix bugs or refactor outside this file. If you find one, note it and leave it.

---

## Task 7: Show lifecycle and wiring (LANE: supervisor)

Arm, live, close, and the append-only show journal, wired into `BoothServer` and `BoothStore` so
closing a show produces the export, the digest and the draw in one action, and a show that was never
closed says so rather than silently exporting nothing (AC 10).

This is cross-file by nature: it mutates `BoothServer.kt` (803 lines) and `BoothStore.kt` (266
lines), and it is the primitive tasks 4, 5 and 6 hang off. Skill §8 assigns it to the supervisor.
It is planned in detail after tasks 1 to 6 land, because their final signatures are its inputs.

---

## Tasks 8 to 12 (LANE: supervisor)

Planned after the local queue drains. Named here so they do not vanish:

- **8** Shared core module: `Discovery.kt`, `SetupOverlay.kt`, `RemoteControl.kt`, `Diag.kt`,
  `HostStore.kt`, `DebugBridge.kt` exist in both `phone-app` and `tablet-app` and all six have
  drifted, roughly 1,500 lines each doing the same six jobs differently.
- **9** Tablet capture validation: wire `LeadValidator` and `TypoDomains` into `tablet.html`'s gate
  at the top of the screen, where the on-screen keyboard does not cover it in portrait.
- **10** The bridge. **Blocked.** See above.
- **11** Rode ingest, Whisper slices at plus or minus 90 seconds, offset-corrected from the show's
  sync marker, every join carrying `MatchConfidence` and its basis.
- **12** Phone hold-to-talk memo, attaching to the most recent lead and surviving an app kill.

---

## Verification, at the surface, composited

A drained queue is not a working feature, and a passing gate is not a working booth.

- [ ] **Unit truth:** `cd kiosk-app && ./gradlew :app:testDebugUnitTest` — every test from tasks 1
      to 6 green.
- [ ] **Build truth:** `cd kiosk-app && ./gradlew :app:assembleDebug` produces an APK whose mtime is
      newer than the last source edit. Believe the artefact, not the build log.
- [ ] **Device truth:** install on the Fire Stick (AFTKRT), confirm `versionCode` on the device
      matches the tree that was built. This is also how the pending `f620e68` gate and QR fix
      finally reaches the booth, since `stageTabletSurface` copies `expo-assets/kiosk/tablet.html`
      into the APK at build time.
- [ ] **Composited truth:** photograph or screenshot the real booth tablet showing a refused
      keyboard-mash entry and the "did you mean" suggestion, in its real context on the real screen.
      Component checks do not count.
- [ ] **Interactive truth:** prove it is not just present. Type `dd@hjj.com`, see it refused. Type
      `steppinupdanceco@outlook.co`, see the suggestion. Accept it, see the address change. That is
      the difference between a validator and a decoration.
- [ ] **Never point a test at production:** any harness takes an explicit endpoint argument with no
      usable default and prints its destination at startup.
