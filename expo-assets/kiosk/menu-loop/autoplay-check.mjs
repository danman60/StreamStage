/*
 * Proves the change in tv.html: when a film a visitor picked ends, the end card
 * shows (it carries the QR) and then the NEXT film in running order plays,
 * instead of dropping back to the attract loop.
 *
 * Drives the REAL bus endpoint the tablet uses, against a throwaway kiosk on a
 * port of your choosing. It never touches DART or production — pass --base.
 *
 *   node autoplay-check.mjs --base http://127.0.0.1:8210
 *
 * The film is seeked to just before its end rather than watched, so the check
 * takes seconds instead of two minutes. Everything after that — 'ended', the
 * end card, the dwell, the hand-off — is the real code path.
 */
import { chromium } from 'playwright';

const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = arg('base', '');
if (!BASE) { console.error('refusing to run without an explicit --base'); process.exit(2); }
console.log('target:', BASE);

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message)));

await page.goto(BASE + '/tv', { waitUntil: 'load' });
await page.waitForTimeout(3000);

const playing = async () => page.evaluate(() => {
  const v = Array.from(document.querySelectorAll('video'))
    .find((x) => !x.paused && !x.ended && x.currentTime > 0);
  return v ? (v.currentSrc.split('/').pop() || '').replace('.mp4', '') : null;
});

// 1. the tablet picks a film
await page.evaluate((base) => fetch(base + '/bus', {
  method: 'POST',
  headers: { 'content-type': 'text/plain' },
  body: JSON.stringify({ type: 'play', product: 'studiosage', dir: 1, src: 'tablet' }),
}), BASE);

await page.waitForFunction(() => document.body.classList.contains('playing'), null, { timeout: 15000 });
await page.waitForTimeout(1500);
const first = await playing();
console.log('picked film playing:', first);

// 2. jump it to just before the end so 'ended' fires for real
await page.evaluate(() => {
  const v = Array.from(document.querySelectorAll('video')).find((x) => !x.paused && !x.ended);
  if (v && isFinite(v.duration)) v.currentTime = Math.max(0, v.duration - 1.2);
});

// 3. the end card must appear — it is the QR moment and must not be skipped
await page.waitForFunction(
  () => document.getElementById('end')?.classList.contains('on'),
  null, { timeout: 20000 }
).then(() => console.log('end card shown: yes'))
 .catch(() => console.log('end card shown: NO'));

// 4. after the dwell, the next film in order must start on its own
let next = null;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(500);
  const now = await playing();
  if (now && now !== first) { next = now; break; }
}

console.log('next film autoplayed:', next || 'NONE — fell back to attract');
console.log('page errors:', errors.length ? JSON.stringify(errors.slice(0, 3)) : 'none');
await browser.close();
process.exit(next ? 0 : 1);
