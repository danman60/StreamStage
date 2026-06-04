import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1920,height:1080} });
await p.goto('http://127.0.0.1:8777/deck/index.html',{waitUntil:'load'});
await p.waitForTimeout(1200);
let cur=1;
for (const target of [3,7,12,15,18]){
  while(cur<target){ await p.keyboard.press('ArrowRight'); cur++; await p.waitForTimeout(220); }
  await p.waitForTimeout(target===15?3200:1100);
  await p.screenshot({path:'/tmp/deck-'+target+'.png'});
}
await b.close(); console.log('done');
