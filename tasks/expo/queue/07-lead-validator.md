# Task: LeadValidator

Write ONE Kotlin file that validates a captured lead before it is written anywhere.

## The file

`kiosk-app/app/src/main/java/com/streamstage/boothloop/show/LeadValidator.kt`

```kotlin
package com.streamstage.boothloop.show

object LeadValidator {
    fun validate(lead: RawLead): LeadVerdict {
        // ... the behaviour below
    }
}
```

Everything you need is already in the same package and needs no import:
- `RawLead` with fields `email`, `studio`, `name`, `phone`, `channel`, `deviceId`,
  `capturedAtIso`, `noteText`, `isTest`
- `LeadVerdict(ok: Boolean, rejects: List<LeadReject>, normalisedEmail: String?, suggestion: String?)`
- `LeadReject` with values `EMAIL_MISSING`, `EMAIL_MALFORMED`, `EMAIL_LOCAL_TOO_SHORT`,
  `EMAIL_REPEATED_CHARACTER_RUN`, `EMAIL_NO_VOWEL_IN_LOCAL`, `CHANNEL_UNKNOWN`,
  `CAPTURED_AT_MISSING_OFFSET`
- `Channel.ALL`, the set of valid channel strings
- `TypoDomains.suggestFor(email: String?): String?`, already written and committed

## Why this exists

Ten rows in the Calgary record are keyboard mash: `dd@hjj.com`, `ghh@fff.com` and eight more. One
real studio's email landed in the studio-name field, which made the most valuable lead of the show
invisible until somebody reconstructed it by hand. There was no schema at the edge, so every
capture surface accepted whatever it was handed.

## Behaviour of `validate`

Apply every rule and **accumulate all rejects**. Do not return early on the first failure: the
tablet shows the visitor which box is wrong, and it can only do that if it gets the whole list.

1. `EMAIL_MISSING` when `email` is null or blank after trimming.
2. Normalise: trim, then lowercase. This value is returned as `normalisedEmail`.
3. `EMAIL_MALFORMED` unless the normalised value matches `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`.
4. `EMAIL_LOCAL_TOO_SHORT` when the part before `@` is shorter than 3 characters.
5. `EMAIL_NO_VOWEL_IN_LOCAL` when the part before `@` contains none of `a e i o u y` and no digit.
6. `EMAIL_REPEATED_CHARACTER_RUN` when the part before `@` has the same character 3 or more times
   in a row.
7. `CHANNEL_UNKNOWN` when `lead.channel` is not in `Channel.ALL`.
8. `CAPTURED_AT_MISSING_OFFSET` when `capturedAtIso` is not null and does not end with a numeric
   offset of the form `+HH:MM` or `-HH:MM`. A trailing `Z` is a bare UTC value and **is refused**:
   a bare UTC value rendered six hours wrong in a real build, and the event's local offset is what
   makes a capture minute mean anything.
9. `suggestion` is whatever `TypoDomains.suggestFor(normalisedEmail)` returns. It is a
   "did you mean", and it is **never applied automatically** - `normalisedEmail` keeps what the
   visitor typed. The visitor is standing right there and can confirm it themselves.
10. `ok` is true only when `rejects` is empty. `ok` must never be true while `rejects` is non-empty.

When the email is missing entirely, `normalisedEmail` is null and no other email rule runs.

## Acceptance

The test file already exists at
`kiosk-app/app/src/test/java/com/streamstage/boothloop/show/LeadValidatorTest.kt`.
Do not modify it. Run:

```
cd /home/danman60/projects/StreamStage/kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*LeadValidatorTest*"
```

All 8 tests must pass.

## RULES

- Write exactly ONE file: `/home/danman60/projects/StreamStage/kiosk-app/app/src/main/java/com/streamstage/boothloop/show/LeadValidator.kt`
- Do NOT create or modify any other file. The test file already exists.
- Acceptance: the gradle command above passes, and the file declares `object LeadValidator` with
  `fun validate(`.
- Do NOT write `TODO`, `Not implemented`, `NotImplementedError` or any stub.
- Do NOT add dependencies, and do NOT edit any `.gradle.kts` file.
- No em dashes or en dashes anywhere, including comments.
- DO NOT fix bugs or refactor outside this file. If you find one, note it and leave it.
