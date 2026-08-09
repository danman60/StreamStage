// Facelift reveal harness — drives the REAL deck against the REAL presenter server.
// Navigates the way Daniel does (digits + Enter), then opens the curtain with one press.
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const OUT = '/tmp/claude-1000/-home-danman60-projects-StreamStage/70b79e52-861b-4715-a181-1a2344eae235/scratchpad';
const label = process.argv[2] || 'state';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

await page.goto(`${BASE}/talk2-ai.html`, { waitUntil: 'load' });
await page.waitForTimeout(2500);

const server = await (await fetch(`${BASE}/facelift`)).json();

const revealNum = await page.evaluate(() => {
  const rf = document.getElementById('revealframe');
  const all = Array.from(document.querySelectorAll('section.slide'));
  return rf ? all.indexOf(rf.closest('section.slide')) + 1 : -1;
});

// navigate the documented way: type the slide number, press Enter
for (const ch of String(revealNum)) await page.keyboard.press(ch);
await page.keyboard.press('Enter');
await page.waitForTimeout(900);

const counterBefore = await page.locator('#counter, .counter').first().textContent().catch(() => null);
const onReveal = await page.evaluate(() =>
  !!document.querySelector('section.slide.active .revealstage'));

await page.screenshot({ path: `${OUT}/facelift-${label}-curtain-closed.png` });

// one press opens the curtain (the .opencue fragment)
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/facelift-${label}-curtain-open.png` });

const info = await page.evaluate(() => {
  const rf = document.getElementById('revealframe');
  const curtainL = document.querySelector('.reveal-slide .curtain.l');
  const cs = curtainL ? getComputedStyle(curtainL) : null;
  let framedTitle = '', framedH1 = '';
  try {
    const d = rf.contentDocument;
    framedTitle = d ? (d.title || '') : '(cross-origin)';
    framedH1 = d ? ((d.body.innerText || '').trim().slice(0, 160).replace(/\s+/g, ' ')) : '';
  } catch (e) { framedTitle = '(blocked: ' + e.message + ')'; }
  return {
    revealSrc: rf.getAttribute('src') || '',
    srcLabel: (document.getElementById('fl-src') || {}).textContent || '',
    status2: (document.getElementById('fl-status2') || {}).textContent || '',
    status2class: (document.getElementById('fl-status2') || {}).className || '',
    curtainTransform: cs ? cs.transform : '(none)',
    framedTitle, framedBodyStart: framedH1,
  };
});

console.log(JSON.stringify({
  label, revealSlideNumber: revealNum, counterAfterJump: counterBefore, landedOnRevealSlide: onReveal,
  server: { status: server.status, local_url: server.local_url, deployed_url: server.deployed_url,
            fallback_url: server.fallback_url, url: server.url, error: server.error || '' },
  deck: info, consoleErrors: errors,
}, null, 2));

await browser.close();
