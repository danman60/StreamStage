import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1920,height:1080} });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8777/index.html',{waitUntil:'load'});
await p.waitForTimeout(1600); await p.screenshot({path:'/tmp/sage-intro.png'});
await p.waitForTimeout(5400); await p.screenshot({path:'/tmp/sage-build.png'});
await p.waitForTimeout(11000); await p.screenshot({path:'/tmp/sage-ask.png'});
await b.close(); console.log('errs:',errs.slice(0,4).join(' | ')||'none');
