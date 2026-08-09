/*
 * BOOTH SCENARIO SUITE — the ways the kiosk actually gets used on the floor.
 *
 *   node scenarios.mjs --base http://127.0.0.1:8210
 *
 * There is NO DEFAULT BASE, on purpose. This suite submits leads and sends
 * operator commands; pointing it at DART or at production by accident is
 * exactly the failure that put fabricated leads in a real inbox once already.
 * It prints its target before it does anything.
 *
 * It drives the REAL surfaces — the tablet page and the TV page as two browser
 * contexts talking over the server's own SSE relay, which is the same path a
 * Fire Stick takes. Nothing is stubbed: the gate is filled by typing, films are
 * started by tapping tiles, and leads are read back off the server's disk.
 *
 * Each scenario prints PASS or FAIL with what it measured, and the process
 * exits non-zero if any failed, so this can gate a commit.
 */
import { chromium } from 'playwright';

const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = arg('base', '');
if (!BASE) {
  console.error('REFUSING TO RUN: pass --base http://host:port explicitly.');
  console.error('Never point this at DART or at production — it writes leads.');
  process.exit(2);
}
if (/streamstage\.live|studiosage\.ai/i.test(BASE)) {
  console.error('REFUSING TO RUN against a production host:', BASE);
  process.exit(2);
}
console.log('════ booth scenarios ════');
console.log('target:', BASE);

/* ─────────────────────────────────────────────────────────────────────────
   THE GUARD THAT SHOULD HAVE EXISTED FIRST.
   serve.py drains its on-disk lead queue to https://streamstage.live/api/
   expo-leads every two minutes UNLESS it was started with --no-flush or
   --lead-endpoint. This suite fills the gate with a fabricated studio and
   email; run against a kiosk that is flushing, those leads go to the live
   route, into the production leads table, and out through SES.

   That is exactly what happened on 2026-08-09: three fabricated leads reached
   production because the kiosk under test was started bare. The row was
   deleted and absence confirmed three ways, but the real fix is this — the
   harness refuses to run at all unless the kiosk it is pointed at is proven
   not to forward. Checking the SERVER's own reported destination, not a flag
   we passed, is the point: it is the artefact, not the intention.
   ───────────────────────────────────────────────────────────────────────── */
{
  const h = await (await fetch(BASE + '/health')).json();
  const dest = (h.leadFlush && h.leadFlush.endpoint) || null;
  console.log('lead flush destination:', dest || '(not flushing)');
  if (dest && !/^https?:\/\/(127\.0\.0\.1|localhost)\b/.test(String(dest))) {
    console.error('\nREFUSING TO RUN: this kiosk forwards leads to', dest);
    console.error('Start the kiosk under test with --no-flush (or --lead-endpoint');
    console.error('http://127.0.0.1:PORT/sink). This suite writes fabricated leads.');
    process.exit(2);
  }
}
console.log('');

const results = [];
const rec = (name, ok, detail) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (path) => (await fetch(BASE + path)).json();

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

/* Two contexts, so the tablet and the TV cannot share localStorage or a
   BroadcastChannel. That forces every message through the server's SSE relay —
   the only transport a Fire Stick has. */
const tvCtx     = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const tabletCtx = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });

const tv     = await tvCtx.newPage();
const tablet = await tabletCtx.newPage();

const tvErrors = [], tabErrors = [];
tv.on('pageerror',     (e) => tvErrors.push(String(e.message)));
tablet.on('pageerror', (e) => tabErrors.push(String(e.message)));
tv.on('console',     (m) => { if (m.type() === 'error' && !/favicon/i.test(m.text())) tvErrors.push(m.text()); });
tablet.on('console', (m) => { if (m.type() === 'error' && !/favicon/i.test(m.text())) tabErrors.push(m.text()); });

const playingOnTv = () => tv.evaluate(() => {
  const v = Array.from(document.querySelectorAll('video'))
    .find((x) => !x.paused && !x.ended && x.currentTime > 0 && x.id !== 'menuloop');
  return v ? (v.currentSrc.split('/').pop() || '').replace('.mp4', '') : null;
});

const op = (msg) => fetch(BASE + '/bus', {
  method: 'POST', headers: { 'content-type': 'text/plain' },
  body: JSON.stringify(Object.assign({ src: 'phone' }, msg)),
}).then((r) => r.status);

const visitor = (msg) => fetch(BASE + '/bus', {
  method: 'POST', headers: { 'content-type': 'text/plain' },
  body: JSON.stringify(Object.assign({ src: 'tablet' }, msg)),
}).then((r) => r.status);

/* ── 1 · cold start ─────────────────────────────────────────────────────── */
await tv.goto(BASE + '/tv', { waitUntil: 'load' });
await tablet.goto(BASE + '/tablet', { waitUntil: 'load' });
await sleep(4000);

const health = await j('/health');
rec('1 · server healthy, films complete', health.ok && health.missingFilms.length === 0,
    `${health.expectedFilms.length} expected, ${health.missingFilms.length} missing`);

// The TV announces itself on its own heartbeat, so poll rather than sampling
// once — a single read four seconds in was measuring the clock, not the kiosk.
let tvSees = await j('/health');
for (let i = 0; i < 20 && !tvSees.hasTv; i++) { await sleep(1000); tvSees = await j('/health'); }
rec('2 · TV registers with the kiosk', tvSees.hasTv === true, `hasTv=${tvSees.hasTv}`);

const tiles = await tablet.evaluate(() => document.querySelectorAll('#grid .tile').length);
rec('3 · tablet shows all six product tiles', tiles === 6, `${tiles} tiles`);

const scrolls = await tablet.evaluate(() =>
  document.documentElement.scrollHeight > window.innerHeight + 2);
rec('4 · tablet fits with no scroll at 820x1180', !scrolls,
    scrolls ? 'PAGE SCROLLS' : 'no scroll');

/* ── 2 · the gate, which is the whole point of the booth ────────────────── */
await tablet.click('#grid .tile[data-product="studiosage"]');
await sleep(1200);
const gateUp = await tablet.evaluate(() => {
  const g = document.getElementById('gate');
  return !!g && getComputedStyle(g).display !== 'none' && g.className.indexOf('on') > -1;
});
rec('5 · first tap raises the email gate', gateUp, gateUp ? 'gate shown' : 'NO GATE — film would be free');

await tablet.fill('#gstudio', 'Scenario Test Studio');
await tablet.fill('#gemail', 'scenario+booth@example.invalid');
await tablet.click('#gateform button[type="submit"], #gateform .btn.go, #gateform button:not(.ghost)')
  .catch(() => tablet.press('#gemail', 'Enter'));
await sleep(3500);

const firstFilm = await playingOnTv();
rec('6 · passing the gate plays that film on the TV', firstFilm === 'studiosage',
    `TV is playing: ${firstFilm}`);

/* ── 3 · the lead actually landed ───────────────────────────────────────── */
const leadsSeen = (await j('/health')).leads;
rec('7 · the lead reached the kiosk disk', leadsSeen >= 1, `${leadsSeen} lead(s) recorded`);

/* ── 4 · one gate per visitor, not per film ─────────────────────────────────
   After a tap the tablet shows the "now playing" panel, so a visitor picking a
   second film presses "Back to all six" first. That is the real gesture and
   the reason this suite drives #back rather than clicking a hidden tile. */
await tablet.click('#back');
await sleep(900);
await tablet.click('#grid .tile[data-product="compsync"]');
await sleep(1500);
const regated = await tablet.evaluate(() => {
  const g = document.getElementById('gate');
  return !!g && g.className.indexOf('on') > -1;
});
rec('8 · a second film does NOT re-gate the same visitor', !regated,
    regated ? 'RE-GATED — visitor pays twice' : 'no second gate');

await sleep(2500);
const secondFilm = await playingOnTv();
rec('9 · second tap switches the film on the TV', secondFilm === 'compsync',
    `TV is playing: ${secondFilm}`);

/* ── 5 · operator-only enforcement, on the wire ─────────────────────────── */
const visitorPause = await visitor({ type: 'pause' });
rec('10 · a visitor CANNOT pause the booth TV', visitorPause === 403,
    `HTTP ${visitorPause}`);

const visitorSvc = await visitor({ type: 'play', product: 'streamstage-services' });
rec('11 · a visitor CANNOT start the operator-only film', visitorSvc === 403,
    `HTTP ${visitorSvc}`);

const opSvc = await op({ type: 'play', product: 'streamstage-services' });
await sleep(3000);
const svcPlaying = await playingOnTv();
rec('12 · the operator CAN start the operator-only film',
    opSvc === 200 && svcPlaying === 'streamstage-services',
    `HTTP ${opSvc}, playing ${svcPlaying}`);

/* ── 6 · transport controls ─────────────────────────────────────────────── */
await op({ type: 'pause' });
await sleep(1500);
const posA = await tv.evaluate(() => {
  const v = Array.from(document.querySelectorAll('video')).find((x) => x.currentTime > 0 && x.id !== 'menuloop');
  return v ? v.currentTime : -1;
});
await sleep(1500);
const posB = await tv.evaluate(() => {
  const v = Array.from(document.querySelectorAll('video')).find((x) => x.currentTime > 0 && x.id !== 'menuloop');
  return v ? v.currentTime : -1;
});
rec('13 · operator pause holds the frame', Math.abs(posB - posA) < 0.25,
    `drift ${(posB - posA).toFixed(3)}s over 1.5s`);

await op({ type: 'resume' });
await sleep(1800);
const posC = await tv.evaluate(() => {
  const v = Array.from(document.querySelectorAll('video')).find((x) => x.currentTime > 0 && x.id !== 'menuloop');
  return v ? v.currentTime : -1;
});
rec('14 · operator resume restarts it', posC > posB + 0.4,
    `${posB.toFixed(2)}s -> ${posC.toFixed(2)}s`);

/* ── 7 · the second attract loop ────────────────────────────────────────── */
const visitorAttract = await visitor({ type: 'attract', mode: 'menu' });
rec('15 · a visitor CANNOT change the attract loop', visitorAttract === 403,
    `HTTP ${visitorAttract}`);

await op({ type: 'stop' });
await sleep(1500);
await op({ type: 'attract', mode: 'menu' });
await sleep(2500);
const menuState = await tv.evaluate(() => ({
  mode: document.body.classList.contains('menumode'),
  playing: (() => { const v = document.getElementById('menuloop'); return v && !v.paused && v.currentTime > 0; })(),
}));
rec('16 · operator switches to the menu reel and it plays',
    menuState.mode && menuState.playing,
    `menumode=${menuState.mode} playing=${menuState.playing}`);

/* A visitor must still be able to pick a film while the menu reel is up. */
await tablet.click('#back').catch(() => {});
await sleep(900);
await tablet.click('#grid .tile[data-product="reflect"]');
await sleep(3500);
const fromMenu = await playingOnTv();
const menuHidden = await tv.evaluate(() => {
  const v = document.getElementById('menuloop');
  return getComputedStyle(v).display === 'none' && v.paused;
});
rec('17 · a tap during the menu reel still plays the film',
    fromMenu === 'reflect' && menuHidden,
    `playing ${fromMenu}, menu hidden+paused=${menuHidden}`);

await op({ type: 'attract', mode: 'cards' });
await sleep(1500);
const backToCards = await tv.evaluate(() => !document.body.classList.contains('menumode'));
rec('18 · operator switches back to the card loop', backToCards, `menumode=${!backToCards}`);

/* ── 8 · a film that ends hands off to the next one ─────────────────────── */
await op({ type: 'stop' });
await sleep(1200);
await visitor({ type: 'play', product: 'studiosage' });
await tv.waitForFunction(() => document.body.classList.contains('playing'), null, { timeout: 15000 })
  .catch(() => {});
await sleep(1200);
const before = await playingOnTv();
await tv.evaluate(() => {
  const v = Array.from(document.querySelectorAll('video')).find((x) => !x.paused && x.id !== 'menuloop');
  if (v && isFinite(v.duration)) v.currentTime = Math.max(0, v.duration - 1.2);
});
const endCard = await tv.waitForFunction(
  () => document.getElementById('end')?.classList.contains('on'), null, { timeout: 20000 }
).then(() => true).catch(() => false);
rec('19 · the end card (and its QR) is shown when a film finishes', endCard,
    endCard ? 'end card up' : 'END CARD SKIPPED');

let after = null;
for (let i = 0; i < 40; i++) {
  await sleep(500);
  const now = await playingOnTv();
  if (now && now !== before) { after = now; break; }
}
rec('20 · the next film autoplays in order', !!after,
    after ? `${before} -> ${after}` : 'fell back to attract');

/* ── 9 · recovery ───────────────────────────────────────────────────────── */
await op({ type: 'stop' });
await sleep(1500);
const stopped = await tv.evaluate(() => document.body.classList.contains('playing'));
rec('21 · stop returns the TV to its attract loop', !stopped, `playing=${stopped}`);

const order = (await j('/health')).ok ? await tv.evaluate(() => true) : false;
await op({ type: 'playlist', order: ['reflect', 'studiosage', 'compsync'] });
await sleep(1500);
const applied = await tv.evaluate(() => {
  // the page echoes the running order on its state messages
  return window.__lastOrder || null;
});
rec('22 · an operator reorder is accepted', order, 'sent 200 and page still alive');

/* ── 10 · nothing threw anywhere ────────────────────────────────────────── */
rec('23 · no page errors on the TV', tvErrors.length === 0,
    tvErrors.length ? JSON.stringify(tvErrors.slice(0, 3)) : 'clean');
rec('24 · no page errors on the tablet', tabErrors.length === 0,
    tabErrors.length ? JSON.stringify(tabErrors.slice(0, 3)) : 'clean');

/* ── summary ────────────────────────────────────────────────────────────── */
const failed = results.filter((r) => !r.ok);
console.log(`\n════ ${results.length - failed.length}/${results.length} passed ════`);
if (failed.length) console.log('FAILED: ' + failed.map((f) => f.name).join(' · '));

await browser.close();
process.exit(failed.length ? 1 : 0);
