import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:412,height:915}});
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200));});
p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message.slice(0,200)));
await p.goto(process.argv[2],{waitUntil:'load'}); await p.waitForTimeout(2500);
const info=await p.evaluate(()=>({
  bodyLen:(document.body.innerText||'').trim().length,
  hasPf:!!document.getElementById('pf'), hasRun:!!document.getElementById('pfrun'),
  navBtns:Array.from(document.querySelectorAll('nav button')).map(b=>b.id||b.textContent.trim()),
  firstText:(document.body.innerText||'').trim().slice(0,120)
}));
console.log(JSON.stringify({info,errs},null,2)); await b.close();
