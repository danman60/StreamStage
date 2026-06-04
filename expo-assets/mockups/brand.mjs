import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('https://studiosage.ai', {waitUntil:'networkidle', timeout:45000}).catch(e=>console.log('nav:',e.message));
const data = await p.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  const vars = {};
  for (const s of document.styleSheets){ try{ for(const r of s.cssRules){ if(r.selectorText===':root'&&r.style){ for(const n of r.style){ if(n.startsWith('--')) vars[n]=r.style.getPropertyValue(n).trim(); } } } }catch(e){} }
  const pick = el => el? {bg:getComputedStyle(el).backgroundColor, color:getComputedStyle(el).color}:null;
  const btn = document.querySelector('button, .btn, a[class*=button], [class*=cta]');
  const h1 = document.querySelector('h1');
  const imgs = [...document.querySelectorAll('img')].map(i=>i.src).filter(s=>/logo|sage|brand/i.test(s)).slice(0,5);
  const bodybg = getComputedStyle(document.body).backgroundColor;
  const font = getComputedStyle(document.body).fontFamily;
  return {vars, btn:pick(btn), h1:pick(h1), bodybg, font, imgs, title:document.title};
});
console.log(JSON.stringify(data,null,2));
await b.close();
