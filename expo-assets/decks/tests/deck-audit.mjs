// Deck audit — renders each slide at 1920x1080 and measures it.
// Catches the two classes of defect Daniel hit live in Toronto:
// "this isn't framed properly" (overflow) and dead media.
import { chromium } from 'playwright';

const URL = process.argv[2];
const NAME = process.argv[3] || 'deck';
const OUT = '/tmp/claude-1000/-home-danman60-projects-StreamStage/70b79e52-861b-4715-a181-1a2344eae235/scratchpad';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const consoleErrors = [], failedRequests = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message.slice(0, 200)));
page.on('requestfailed', r => failedRequests.push(`${r.failure()?.errorText} ${r.url().slice(0, 120)}`));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1500);

const total = await page.locator('section.slide').count();
const overflow = [], mediaProblems = [];

for (let i = 1; i <= total; i++) {
  for (const ch of String(i)) await page.keyboard.press(ch);
  await page.keyboard.press('Enter');           // jump reveals all fragments
  await page.waitForTimeout(260);

  const r = await page.evaluate(() => {
    const s = document.querySelector('section.slide.active');
    if (!s) return null;
    const title = s.getAttribute('data-title') || '';
    const vw = 1920, vh = 1080;
    let worstW = 0, worstH = 0, culprit = '';
    s.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return;
      if (cs.position === 'fixed') return;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return;
      const ovW = Math.max(0, Math.round(b.right - vw), Math.round(-b.left));
      const ovH = Math.max(0, Math.round(b.bottom - vh), Math.round(-b.top));
      if (ovW > worstW || ovH > worstH) {
        if (ovW > worstW) worstW = ovW;
        if (ovH > worstH) worstH = ovH;
        culprit = (el.tagName + '.' + (el.className || '').toString().split(' ')[0]).slice(0, 60);
      }
    });
    const media = [];
    s.querySelectorAll('video,img').forEach(m => {
      const src = m.currentSrc || m.getAttribute('src') || '';
      if (!src) return;
      if (m.tagName === 'VIDEO') { if (m.readyState === 0 || m.error) media.push('video dead: ' + src.split('/').pop()); }
      else if (m.complete && m.naturalWidth === 0) media.push('img broken: ' + src.split('/').pop());
    });
    return { title, worstW, worstH, culprit, media, pageScroll: document.documentElement.scrollWidth > vw };
  });

  if (!r) continue;
  if (r.worstW > 24 || r.worstH > 24) overflow.push({ slide: i, title: r.title, overflowX: r.worstW, overflowY: r.worstH, el: r.culprit });
  if (r.media.length) mediaProblems.push({ slide: i, title: r.title, media: r.media });
}

await page.screenshot({ path: `${OUT}/${NAME}-last.png` });
console.log(JSON.stringify({ deck: NAME, url: URL, totalSlides: total, overflow, mediaProblems, consoleErrors,
  failedRequests: failedRequests.slice(0, 10) }, null, 2));
await browser.close();
