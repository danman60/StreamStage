# Task: ShowHealth

Write ONE Kotlin file: the view model behind the phone's show-health screen.

## The file

`kiosk-app/app/src/main/java/com/streamstage/boothloop/show/ShowHealth.kt`

```kotlin
package com.streamstage.boothloop.show

data class HealthInput(
    val host: String?,
    val queued: Int,
    val lastFlushEpochMs: Long?,
    val state: ShowState,
)

data class HealthLine(val label: String, val value: String, val alarming: Boolean)

object ShowHealth {
    fun lines(input: HealthInput, nowEpochMs: Long): List<HealthLine> {
        // ... the behaviour below
    }
}
```

Declare all three in this one file. `ShowState` is already in `ShowContract.kt`, same package, and
its values are `ARMED`, `LIVE`, `CLOSED`.

## Why this exists

Every incident at the Calgary show was discovered by physically walking to the booth. The data
already exists in the app; nothing renders it as an answer. This screen answers three questions
without leaving the stage: which host is answering, how many leads are queued, and when the last
flush succeeded.

This file is the pure view model only. It takes `nowEpochMs` as a parameter instead of reading the
clock, because a view model that reads the clock cannot be tested.

## Behaviour of `lines`

Return **exactly four** `HealthLine`s, always all four, always in this order:

1. `label = "Show"` — value is the state name (`ARMED`, `LIVE` or `CLOSED`).
   Alarming when the state is `CLOSED` while `queued` is greater than 0: a closed show still
   holding leads has not exported.
2. `label = "Host"` — value is the host string, or `"none"` when it is null.
   Alarming when the host is null.
3. `label = "Queued"` — value is the queue depth as a string.
   Alarming when greater than 25.
4. `label = "Last flush"` — a human relative age, or `"never"` when `lastFlushEpochMs` is null.
   Alarming when `queued` is greater than 0 AND the age is over 15 minutes, or when the value is
   null AND `queued` is greater than 0.

Relative age format: under a minute `"just now"`; under an hour `"2m ago"`; an hour or more
`"1h 4m ago"`.

**Never render a null timestamp as an epoch number or a 1970 date.** `"never"` is the honest answer
and it is what the operator needs to see.

## Acceptance

The test file already exists at
`kiosk-app/app/src/test/java/com/streamstage/boothloop/show/ShowHealthTest.kt`.
Do not modify it. Run:

```
cd /home/danman60/projects/StreamStage/kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*ShowHealthTest*"
```

All 9 tests must pass.

## RULES

- Write exactly ONE file: `/home/danman60/projects/StreamStage/kiosk-app/app/src/main/java/com/streamstage/boothloop/show/ShowHealth.kt`
- Do NOT create or modify any other file. The test file already exists.
- Acceptance: the gradle command above passes, and the file declares `object ShowHealth` with
  `fun lines(`.
- Do NOT write `TODO`, `Not implemented`, `NotImplementedError` or any stub.
- Do NOT add dependencies, and do NOT edit any `.gradle.kts` file.
- No em dashes or en dashes anywhere, including comments.
- DO NOT fix bugs or refactor outside this file. If you find one, note it and leave it.
