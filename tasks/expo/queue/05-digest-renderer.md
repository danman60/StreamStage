# Task: DigestRenderer

Write ONE Kotlin file that renders the end-of-show digest.

## The file

`kiosk-app/app/src/main/java/com/streamstage/boothloop/show/DigestRenderer.kt`

```kotlin
package com.streamstage.boothloop.show

object DigestRenderer {
    fun render(showName: String, leads: List<RawLead>, drawAudit: String?): String {
        // ... the behaviour below
    }
}
```

`RawLead` is already defined in `ShowContract.kt`, same package, no import needed. Its fields are
`email`, `studio`, `name`, `phone`, `channel`, `deviceId`, `capturedAtIso`, `noteText`, `isTest`.

## Why this exists

At the end of a show the assistant gets ONE digest of what happened. Not one item per lead: 22
items is noise nobody reads. The assistant owns the follow-up queue and every send decision, so
this file reports what was captured and nothing else. It proposes no follow-up and it drafts no
email.

## Behaviour of `render`

Return markdown containing, in this order:

1. A heading line naming the show, for example `## Calgary CDTE day 2`.
2. A total count of leads where `isTest` is false. **Test rows are excluded from every count and
   are never listed anywhere in the output.** Fifteen of Calgary's 41 captures were tablet tests.
3. A per-channel breakdown: one line per channel that appears among the non-test leads, naming the
   channel string and its count, for example `- booth_tablet: 1`.
4. A notes section listing every non-blank `noteText` from a non-test lead, each with its email,
   for example `- b@gmail.com: wants a content day`. Omit the section when there are no notes.
5. The `drawAudit` string verbatim on its own line when it is not null. Omit it entirely when null.

When `leads` is empty, still render the heading and a zero count. A show that captured nothing says
so rather than returning an empty string.

**Never write a salutation, a subject line, or any text addressed to a lead.** This is a note to the
assistant about what happened, not a message to a client. The booth app sends no client email.

## Acceptance

The test file already exists at
`kiosk-app/app/src/test/java/com/streamstage/boothloop/show/DigestRendererTest.kt`.
Do not modify it. Run:

```
cd /home/danman60/projects/StreamStage/kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*DigestRendererTest*"
```

All 7 tests must pass.

## RULES

- Write exactly ONE file: `/home/danman60/projects/StreamStage/kiosk-app/app/src/main/java/com/streamstage/boothloop/show/DigestRenderer.kt`
- Do NOT create or modify any other file. The test file already exists.
- Acceptance: the gradle command above passes, and the file declares `object DigestRenderer` with
  `fun render(`.
- Do NOT write `TODO`, `Not implemented`, `NotImplementedError` or any stub.
- Do NOT add dependencies, and do NOT edit any `.gradle.kts` file.
- No em dashes or en dashes anywhere, including comments.
- DO NOT fix bugs or refactor outside this file. If you find one, note it and leave it.
