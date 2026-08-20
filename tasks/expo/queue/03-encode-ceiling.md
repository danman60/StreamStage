# Task: EncodeCeiling

Write ONE Kotlin file that refuses a film whose bitrate would freeze the booth TV.

## The file

`kiosk-app/app/src/main/java/com/streamstage/boothloop/show/EncodeCeiling.kt`

```kotlin
package com.streamstage.boothloop.show

data class CeilingVerdict(val accepted: Boolean, val reason: String?)

object EncodeCeiling {
    fun check(kbps: Int, name: String): CeilingVerdict {
        // ... the behaviour below
    }
}
```

Declare BOTH the data class and the object in this one file.

## Why this exists

On 2026-08-11 a 2.6 Mbps encode froze the booth TV in the middle of a live talk. A 1.2 Mbps encode
of the same film played fine. The measured ceiling is 1,557 kbps. The film that would freeze the
screen has to be refused when it enters the library, not discovered in front of a room.

## Behaviour of `check`

`BITRATE_CEILING_KBPS` is already defined in `ShowContract.kt` as `1557`. Import nothing: it is in
the same package. Use that constant, never a literal 1557.

1. `kbps` greater than 0 and less than or equal to `BITRATE_CEILING_KBPS`:
   return `CeilingVerdict(true, null)`. An accepted verdict carries no reason.
2. `kbps` of 0 or less: the bitrate could not be read. Return `CeilingVerdict(false, reason)` where
   the reason names the file and says the bitrate could not be read. **Unknown is not permission.**
3. `kbps` above the ceiling: return `CeilingVerdict(false, reason)` where the reason contains, in
   this order, the file name, the measured value, and the ceiling value.

Example refusal reason for `check(2600, "robot-wall.mp4")`:
`"robot-wall.mp4 is 2600 kbps, over the 1557 kbps ceiling that plays on the booth TV"`

## Acceptance

The test file already exists at
`kiosk-app/app/src/test/java/com/streamstage/boothloop/show/EncodeCeilingTest.kt`.
Do not modify it. Run:

```
cd /home/danman60/projects/StreamStage/kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*EncodeCeilingTest*"
```

All 6 tests must pass.

## RULES

- Write exactly ONE file: `/home/danman60/projects/StreamStage/kiosk-app/app/src/main/java/com/streamstage/boothloop/show/EncodeCeiling.kt`
- Do NOT create or modify any other file. The test file already exists.
- Acceptance: the gradle command above passes, and the file declares `object EncodeCeiling` with
  `fun check(`.
- Do NOT write `TODO`, `Not implemented`, `NotImplementedError` or any stub.
- Do NOT add dependencies, and do NOT edit any `.gradle.kts` file.
- No em dashes or en dashes anywhere, including comments.
- DO NOT fix bugs or refactor outside this file. If you find one, note it and leave it.
