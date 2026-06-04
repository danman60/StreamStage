import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1920,height:1080} });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const base='http://127.0.0.1:8777/deck/index.html';
for (const s of [1,3,7,12,15,18]){
  await p.goto(base+'#s'+s,{waitUntil:'load'});
  await p.waitForTimeout(s===15?3500:1400);
  await p.screenshot({path:'/tmp/deck-'+s+'.png'});
}
await p.goto('http://127.0.0.1:8777/deck/review.html',{waitUntil:'load'});
await p.waitForTimeout(1500); await p.screenshot({path:'/tmp/deck-review.png',fullPage:false});
await b.close(); console.log('errs:',errs.slice(0,5).join(' | ')||'none');
