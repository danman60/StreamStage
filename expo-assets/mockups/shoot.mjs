import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.join(dir, 'graph.html');

const browser = await chromium.launch({
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
         '--ignore-gpu-blocklist','--enable-webgl']
});
const page = await browser.newPage({ viewport:{ width:1920, height:1080 }, deviceScaleFactor:1 });
page.on('console', m => { if(m.type()==='error') console.log('PAGE ERR:', m.text()); });

for (const style of ['constellation','pipeline','radial']) {
  await page.goto(`${file}?style=${style}`, { waitUntil:'load' });
  // wait for engine settle flag or timeout, then let particles run
  await page.waitForFunction(() => window.__settled === true, { timeout: 12000 }).catch(()=>{});
  await page.waitForTimeout(2500);
  const out = path.join(dir, `mock-${style}.png`);
  await page.screenshot({ path: out });
  console.log('shot', out);
}
await browser.close();
