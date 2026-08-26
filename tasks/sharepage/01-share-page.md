# Task: build the shareable films page

Write exactly ONE file: `/home/danman60/projects/StreamStage/expo-assets/share/index.html`

A single self-contained HTML page listing the six StreamStage product films, so Daniel can send one
link instead of six raw `.mp4` URLs (which unfurl as downloads in texts and email).

## Hard constraints

- **One file. No build step, no framework, no external requests.** All CSS inline in a `<style>`
  block in `<head>`. No CDN links, no Google Fonts, no analytics, no JS libraries.
- Plain `<video>` elements with `preload="none"` and the `poster` attribute omitted — posters are
  not on R2 yet, and a broken poster URL is worse than none.
- Must work opened as a bare `file://` path AND when served over HTTP.

## The six films — use these EXACT ids, titles and URLs

Base URL is `https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev/booth/`

| title (display exactly) | file |
|---|---|
| StudioSage | `studiosage.mp4` |
| CompSync | `compsync.mp4` |
| Callboard | `callboard.mp4` |
| CostumeCraft | `costumecraft.mp4` |
| Reflect | `reflect.mp4` |
| StudioBeat | `studiobeat.mp4` |

Full URL for each = base + file, e.g.
`https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev/booth/studiosage.mp4`

**Do NOT include `streamstage-services.mp4`.** It is in the R2 manifest but it is not one of the six
product films and it is 197 MB.

## Page structure

```html
<header>
  <h1>StreamStage</h1>
  <p class="sub">Product films</p>
</header>
<main>
  <!-- one <section class="film"> per film, in the table order above -->
</main>
<footer>
  <p>streamstage.live</p>
</footer>
```

Each `<section class="film">` contains, in this order:

1. `<h2>` with the film title exactly as written above.
2. `<video class="player" controls preload="none" src="<full url>" playsinline></video>`
3. A `<div class="actions">` holding one button:
   `<button class="copy" data-url="<full url>">Copy link</button>`

## The one piece of JavaScript

An inline `<script>` at the end of `<body>`. On click of any `.copy` button:

- call `navigator.clipboard.writeText(btn.dataset.url)`
- on success set `btn.textContent = "Copied"` and after 1500 ms set it back to `"Copy link"`
- on failure set `btn.textContent = "Copy failed"` and after 1500 ms set it back

Use `document.querySelectorAll('.copy').forEach(...)`. No other JavaScript in the file.

## Styling — literal values, do not invent alternatives

- `body`: `background:#0e0e10; color:#f2f2f2; font-family:system-ui,-apple-system,sans-serif;
  margin:0; padding:2rem 1rem; line-height:1.5;`
- `main`: `max-width:900px; margin:0 auto; display:grid; gap:2.5rem;`
- `header`: `max-width:900px; margin:0 auto 2.5rem; text-align:center;`
- `h1`: `font-size:1.75rem; letter-spacing:0.02em; margin:0 0 0.25rem;`
- `.sub`: `color:#9a9aa2; margin:0; font-size:0.95rem;`
- `h2`: `font-size:1.1rem; margin:0 0 0.6rem; font-weight:600;`
- `.player`: `width:100%; aspect-ratio:16/9; background:#000; border-radius:10px; display:block;`
- `.actions`: `margin-top:0.6rem;`
- `.copy`: `background:#1c1c20; color:#f2f2f2; border:1px solid #34343a; border-radius:6px;
  padding:0.45rem 0.9rem; font-size:0.9rem; cursor:pointer;`
- `.copy:hover`: `background:#26262c;`
- `footer`: `max-width:900px; margin:3rem auto 0; text-align:center; color:#6e6e76;
  font-size:0.85rem;`

`<title>` must be exactly: `StreamStage — Product Films`

## RULES

- Write exactly ONE file: `/home/danman60/projects/StreamStage/expo-assets/share/index.html`
- Do NOT create or modify any other file.
- Acceptance: the file exists, is non-empty, contains all six `.mp4` URLs above, contains exactly
  six `<video` tags, and contains no `http` request to any host other than
  `pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev`.
- DO NOT fix bugs or refactor outside this file. If you find one, note it and leave it.
