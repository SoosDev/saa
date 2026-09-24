const { chromium } = require('playwright');
(async () => {
  const [url, sel, out, w, dark] = process.argv.slice(2);
  const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:+w||1440,height:900}, colorScheme: dark?'dark':'light'}); const p = await ctx.newPage();
  await p.goto(url); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(600);
  await p.locator(sel).first().screenshot({path: out}); await b.close();
})();
