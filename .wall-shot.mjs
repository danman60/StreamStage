import { chromium } from 'playwright';
const OUT='/tmp/claude-1000/-home-danman60-projects-StreamStage/70b79e52-861b-4715-a181-1a2344eae235/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1920,height:1080}});
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,160));});
await p.goto(process.argv[2],{waitUntil:'load'}); await p.waitForTimeout(6000);
const txt=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,600);
await p.screenshot({path:`${OUT}/${process.argv[3]}.png`});
console.log(JSON.stringify({url:process.argv[2],bodyText:txt,consoleErrors:errs},null,2));
await b.close();
