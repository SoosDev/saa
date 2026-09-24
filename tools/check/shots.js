const { chromium } = require('playwright');
const OUT = '/home/dima/dev/personal/saa-exam/design/compare/';
const M = 'http://localhost:8765/design/mockups/';
const L = 'http://localhost:8765/sessions/01-storage/';
(async () => {
  const b = await chromium.launch();
  const shot = async (url, vp, file, opts={}) => {
    const ctx = await b.newContext({ viewport: vp, colorScheme: opts.dark ? 'dark' : 'light', deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    if (opts.init) await p.addInitScript(opts.init);
    await p.goto(url); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
    if (opts.act) await opts.act(p);
    await p.screenshot({ path: OUT + file, fullPage: !!opts.full });
    await ctx.close();
  };
  const D = {width:1440,height:900}, P = {width:390,height:844};
  const which = process.argv[2] || 'all';
  if (which==='all'||which==='mock') {
    await shot(M+'00-design-system.html', {width:1280,height:1000}, '00-design-system-mock.png');
    await shot(M+'01-desktop-map.html', D, '01-map-mock.png');
    await shot(M+'02-phone-lines.html', P, '02-lines-mock.png');
    await shot(M+'03-phone-drill.html', {width:390,height:1320}, '03-drill-mock.png');
    await shot(M+'04-phone-compare.html', {width:390,height:900}, '04-compare-mock.png');
    await shot(M+'05-phone-cards.html', P, '05-cards-mock.png');
  }
  if (which==='all'||which==='live') {
    await shot(L+'#map/datasync', D, '01-map-live.png');
    await shot(L+'#map', P, '02-lines-live.png');
    await shot(L+'#drill/D07', {width:390,height:1320}, '03-drill-live.png', { full: true, act: async p => {
      const pick = async (t) => { await p.locator('button.chip', { hasText: new RegExp('^'+t.replace('/','\\/')+'$') }).first().click(); };
      for (const t of ['fits the pipe','ongoing','NFS/SMB','cheapest']) await pick(t);
      const opts = p.locator('.optlist > div');
      await opts.nth(0).locator('.xbtn').click(); await p.locator('.reasons button', {hasText:'violates SIZE'}).click();
      await opts.nth(3).locator('.xbtn').click(); await p.locator('.reasons button', {hasText:'wrong job'}).click();
      await opts.nth(2).click();
      await p.locator('button', {hasText:/^Check$/}).click();
      await p.waitForTimeout(300);
      await p.locator('button.vt', {hasText:'R · misread'}).click();
      await p.evaluate(()=>window.scrollTo(0,0));
    }});
    await shot(L+'#compare/ds-gw', {width:390,height:900}, '04-compare-live.png');
    await shot(L+'#cards', P, '05-cards-live.png', { act: async p => { await p.locator('button', {hasText:'Show answer'}).click(); } });
    await shot(L+'#learn/ch1', D, '10-learn-desk.png', { full: true });
    await shot(L+'#learn/ch6', D, '11-learn6-desk.png', { full: true });
    await shot(L+'#learn/ch7', P, '12-learn7-phone.png', { full: true });
    await shot(L+'#progress', D, '13-progress-desk.png', { full: true });
    await shot('http://localhost:8765/', D, '14-hub-desk.png', { full: true });
    await shot('http://localhost:8765/', P, '15-hub-phone.png', { full: true });
    await shot(L+'#map/datasync', D, '16-map-dark.png', { dark: true });
    await shot(L+'#learn/ch6', P, '17-learn6-phone-dark.png', { dark: true, full: true });
    await shot(L+'#tree', D, '18-tree-desk.png');
    await shot(L+'#traps', D, '19-traps.png', {full:true});
    await shot(L+'#cheat', P, '20-cheat-phone.png', {full:true});
    await shot(L+'#classes', D, '21-classes.png', {full:true});
  }
  await b.close();
})();
