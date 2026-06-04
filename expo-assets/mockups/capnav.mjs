import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1920,height:1080} });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8777/deck/index.html',{waitUntil:'load'});
await p.waitForTimeout(1200);
await p.screenshot({path:'/tmp/nav-s1.png'});               // nav buttons visible
await p.click('#nv-next'); await p.waitForTimeout(900);
await p.click('#nv-next'); await p.waitForTimeout(900);
await p.screenshot({path:'/tmp/nav-s3.png'});               // advanced via button
// go to slide 15
let cur=3; while(cur<15){ await p.keyboard.press('ArrowRight'); cur++; await p.waitForTimeout(160); }
await p.waitForTimeout(1600);                               // just landed — sim should be near empty
await p.screenshot({path:'/tmp/nav-s15-fresh.png'});
const frame = p.frames().find(f=>f.url().includes('index.html') && f.url()!==p.url());
console.log('live frame:', frame? 'embedded ok':'MISSING', '| errs:', errs.slice(0,4).join(' | ')||'none');
await b.close();
