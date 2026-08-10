#!/usr/bin/env node
/* facelift-before.cjs <url> <out.png>
 *
 * Full-page screenshot of the studio's CURRENT site, taken on the builder box in the
 * first seconds of a run, so slide 5 can show the room what the site looks like today.
 *
 * Why a screenshot and not an iframe: most studio sites refuse to be embedded
 * (X-Frame-Options / CSP frame-ancestors), and several frame-bust in JavaScript —
 * measured 2026-08-10, pickleballstalbert.ca replaces itself with a white page reading
 * "Wrong document context!". A picture cannot be refused and cannot go white.
 *
 * CommonJS on purpose: it is run with NODE_PATH pointing at a checkout that has
 * playwright installed, and NODE_PATH only applies to require(), not to ESM import.
 */
const fs = require('fs');
const path = require('path');

const [, , URL_ARG, OUT] = process.argv;
if (!URL_ARG || !OUT) {
  console.error('usage: facelift-before.cjs <url> <out.png>');
  process.exit(2);
}

// Nothing in this repo carries node_modules, so borrow playwright from whichever
// checkout has it. Ordered by how unlikely each is to be deleted mid-tour.
const MODULE_DIRS = [
  '/home/danman60/projects/amplify/node_modules',
  '/home/danman60/projects/BroadcastBuddy/node_modules',
  '/home/danman60/projects/carly-hair-co/node_modules',
];
let chromium = null;
for (const d of MODULE_DIRS) {
  try {
    chromium = require(path.join(d, 'playwright')).chromium;
    break;
  } catch (e) { /* try the next checkout */ }
}
if (!chromium) {
  console.error('no playwright available in any known checkout');
  process.exit(3);
}

// Pin the browser by globbing the cache: playwright's own default points at the
// revision IT was built against, which is often not the one installed here.
function findShell() {
  const root = '/home/danman60/.cache/ms-playwright';
  let best = null;
  for (const d of fs.readdirSync(root)) {
    if (!d.startsWith('chromium_headless_shell-') && !d.startsWith('chromium-')) continue;
    for (const exe of ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/chrome']) {
      const p = path.join(root, d, exe);
      if (fs.existsSync(p)) {
        const n = parseInt(d.split('-').pop(), 10) || 0;
        if (!best || n > best.n) best = { n, p };
      }
    }
  }
  return best && best.p;
}

const url = /^https?:\/\//i.test(URL_ARG) ? URL_ARG : 'https://' + URL_ARG;

(async () => {
  const exe = findShell();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1200 },
      deviceScaleFactor: 1,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
                 'Chrome/131.0.0.0 Safari/537.36',
    });
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });

    /* Get the newsletter / cookie curtain out of the picture. Measured 2026-08-10:
     * decidedlyjazz.com opens a "Be the first to hear about upcoming performances" modal that
     * sat across the hero on the projector. Escape first, then the obvious close controls,
     * then hide anything still pinned over a quarter of the screen. This only ever touches
     * the screenshot — the real site is untouched. */
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const CLOSE = /^(×|✕|✖|x|close|no thanks|no, thanks|dismiss|accept|accept all|got it|ok|okay|continue)$/i;
      document.querySelectorAll('button,a,[role="button"],span[class*="close"],div[class*="close"]')
        .forEach(el => {
          const label = (el.getAttribute('aria-label') || el.textContent || '').trim();
          if (CLOSE.test(label) || /close|dismiss/i.test(el.getAttribute('aria-label') || '')) {
            try { el.click(); } catch (e) { /* not clickable, fine */ }
          }
        });
    });
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const vw = innerWidth, vh = innerHeight;
      document.querySelectorAll('body *').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
        const r = el.getBoundingClientRect();
        const covers = (r.width * r.height) > (vw * vh * 0.25);
        // SIZE, not z-index. Measured 2026-08-10: decidedlyjazz.com's newsletter curtain is
        // `div.b-toast.show`, position fixed, full viewport — and z-index THREE. A z>=100 rule
        // sailed straight past it. A pinned layer covering a quarter of the screen is a
        // curtain; a pinned header is pinned too but nowhere near that tall.
        if (covers) el.style.setProperty('display', 'none', 'important');
      });
      document.documentElement.style.overflow = 'auto';   // modals often lock scrolling
      document.body.style.overflow = 'auto';
    });
    // Let lazy images and web fonts settle, then walk the page so anything that only
    // loads on scroll is actually in the picture, and come back to the top.
    await page.waitForTimeout(2500);
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < Math.min(document.body.scrollHeight, 12000); y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 220));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
    const tmp = OUT + '.tmp.png';
    await page.screenshot({ path: tmp, fullPage: true });
    fs.renameSync(tmp, OUT);                 // atomic: the server never sees half a file
    const { width, height } = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
    console.log(`before.png written: ${OUT} (page ${width}x${height}, ${fs.statSync(OUT).size} bytes)`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('before shot failed:', e && e.message); process.exit(1); });
