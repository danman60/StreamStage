# Task: PrizeDraw

Write ONE Kotlin file that turns prize draw entries into a winner an organiser can be shown.

## The file

`kiosk-app/app/src/main/java/com/streamstage/boothloop/show/PrizeDraw.kt`

```kotlin
package com.streamstage.boothloop.show

import kotlin.random.Random

data class DrawEntry(val email: String, val capturedAtIso: String, val consent: Boolean)

data class DrawResult(val winner: DrawEntry?, val auditLine: String, val eligibleCount: Int)

object PrizeDraw {
    fun pick(entries: List<DrawEntry>, seed: Long): DrawResult {
        // ... the behaviour below
    }
}
```

Declare all three in this one file.

## Why this exists

The Calgary prize draw has no record anywhere. Zero of 41 lead emails mention a prize, a draw or a
winner, and the winner's name was owed to the show organiser by a hard 4:00 PM deadline. Nobody can
say how entries were collected or who won.

The pick is **seeded** so the same entries plus the same seed always produce the same winner. That
is the whole point: a draw that can be re-run in front of an organiser is defensible, and one that
cannot be is just a name somebody said.

## Behaviour of `pick`

1. Keep only entries where `consent` is true. No consent, no entry.
2. Deduplicate by lowercased email, keeping the entry with the earliest `capturedAtIso`.
   The same person entering twice is one entry, not two chances.
3. Sort the survivors by email, so the result does not depend on the order they were captured in.
4. `eligibleCount` is the size of the list after steps 1 to 3.
5. Empty list: return `DrawResult(null, auditLine, 0)` where the audit line states 0 eligible
   entries and names the seed. A draw with no entries says so.
6. Otherwise pick one using `Random(seed)` over the sorted list.
7. `auditLine` is ONE line containing the seed, the eligible count, and the winner's email.

Example audit line: `"draw seed=42 eligible=3 winner=a@gmail.com"`

Use `kotlin.random.Random(seed)`. **Never** `Math.random()`, `java.util.Random()` without a seed,
or `List.random()` without a seeded generator. A draw nobody can reproduce is the exact failure
this task exists to fix.

## Acceptance

The test file already exists at
`kiosk-app/app/src/test/java/com/streamstage/boothloop/show/PrizeDrawTest.kt`.
Do not modify it. Run:

```
cd /home/danman60/projects/StreamStage/kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*PrizeDrawTest*"
```

All 6 tests must pass.

## RULES

- Write exactly ONE file: `/home/danman60/projects/StreamStage/kiosk-app/app/src/main/java/com/streamstage/boothloop/show/PrizeDraw.kt`
- Do NOT create or modify any other file. The test file already exists.
- Acceptance: the gradle command above passes, and the file declares `object PrizeDraw` with
  `fun pick(`.
- Do NOT write `TODO`, `Not implemented`, `NotImplementedError` or any stub.
- Do NOT add dependencies, and do NOT edit any `.gradle.kts` file.
- No em dashes or en dashes anywhere, including comments.
- DO NOT fix bugs or refactor outside this file. If you find one, note it and leave it.
