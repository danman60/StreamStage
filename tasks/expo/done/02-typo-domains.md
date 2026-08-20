# Task: TypoDomains

Write ONE Kotlin file that suggests a correction for a known-typo email domain.

## The file

`kiosk-app/app/src/main/java/com/streamstage/boothloop/show/TypoDomains.kt`

```kotlin
package com.streamstage.boothloop.show

object TypoDomains {
    private val CORRECTIONS: Map<String, String> = mapOf(
        // ... every pair from the table below
    )

    fun suggestFor(email: String?): String? {
        // ... the behaviour below
    }
}
```

## Why this exists

A studio's address was captured as `steppinupdanceco@outlook.co`, missing the `m` on
`outlook.com`. Nobody noticed for days and an apology had to be sent.

An MX lookup does NOT catch this. `dig MX outlook.co` answers
`nam.olc.protection.outlook.com`, because Microsoft owns the typo domain: it has valid MX,
accepts the mail and hard bounces it. A lookup table catches it, and it works with no internet,
which is the network the booth is designed for.

## The correction table

Use exactly these pairs, all real observed typos:

| typo domain | correction |
|---|---|
| outlook.co | outlook.com |
| outlook.cm | outlook.com |
| gmial.com | gmail.com |
| gmai.com | gmail.com |
| gmail.co | gmail.com |
| gmail.cm | gmail.com |
| gmail.con | gmail.com |
| gnail.com | gmail.com |
| hotmai.com | hotmail.com |
| hotmial.com | hotmail.com |
| hotmail.co | hotmail.com |
| yaho.com | yahoo.com |
| yahooo.com | yahoo.com |
| yahoo.co | yahoo.com |
| icloud.co | icloud.com |

**Never add a domain that is genuinely valid.** `shaw.ca`, `sympatico.ca`, `telus.net`,
`muskokadance.ca` and every other real domain must NOT appear as a key. Suggesting a "correction"
for a real address is worse than staying quiet.

## Behaviour of `suggestFor`

1. Return `null` when `email` is `null`, blank, or contains no `@`.
2. Lowercase and trim the input.
3. Take the domain as the substring after the LAST `@`, and the local part as everything before it.
4. Look the domain up in `CORRECTIONS`. Not found, return `null`.
5. Found, return the local part, then `@`, then the corrected domain.

Case insensitive: `A@GMIAL.COM` returns `a@gmail.com`.

## Acceptance

The test file already exists at
`kiosk-app/app/src/test/java/com/streamstage/boothloop/show/TypoDomainsTest.kt`.
Do not modify it. Run:

```
cd /home/danman60/projects/StreamStage/kiosk-app && ./gradlew :app:testDebugUnitTest --tests "*TypoDomainsTest*"
```

All 6 tests must pass.

## RULES

- Write exactly ONE file: `/home/danman60/projects/StreamStage/kiosk-app/app/src/main/java/com/streamstage/boothloop/show/TypoDomains.kt`
- Do NOT create or modify any other file. The test file already exists.
- Acceptance: the gradle command above passes, and the file declares `object TypoDomains` with
  `fun suggestFor(`.
- Do NOT write `TODO`, `Not implemented`, `NotImplementedError` or any stub. A file that compiles
  but does nothing is a failure.
- Do NOT add dependencies, and do NOT edit any `.gradle.kts` file.
- No em dashes or en dashes anywhere, including comments.
- DO NOT fix bugs or refactor outside this file. If you find one, note it and leave it.
