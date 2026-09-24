/* Session 4 screenshots → design/compare/s4-*.png (git-ignored). node shots-04.js [filter] */
const { chromium } = require('playwright');
const OUT = '/home/dima/dev/personal/saa-exam/design/compare/';
const L = 'http://localhost:8765/sessions/04-global/';
const D = { width: 1440, height: 900 }, P = { width: 390, height: 844 };
const only = process.argv[2] || '';
(async () => {
  const b = await chromium.launch();
  const shot = async (name, url, vp, o = {}) => {
    if (only && !name.includes(only)) return;
    for (const dark of o.both === false ? [false] : [false, true]) {
      const ctx = await b.newContext({ viewport: vp, colorScheme: dark ? 'dark' : 'light', deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      await p.goto(url); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
      if (o.act) await o.act(p);
      await p.waitForTimeout(250);
      const file = OUT + 's4-' + name + (dark ? '-dark' : '') + '.png';
      if (o.sel) { await p.addStyleTag({ content: '.hdr,.bbar,.tabs{position:static !important}' }); await p.locator(o.sel).first().screenshot({ path: file }); }
      else await p.screenshot({ path: file, fullPage: !!o.full });
      await ctx.close();
    }
  };
  const W = t => ({ sel: `.widget:has-text("${t}")` });
  await shot('map-desk', L + '#map/cf', D);
  await shot('map-ga-desk', L + '#map/ga', D, { both: false });
  await shot('lines-phone', L + '#map', P);
  await shot('map-full-phone', L + '#map/full', P, { full: true, both: false });
  await shot('learn4-desk', L + '#learn/ch4', D, { full: true });
  await shot('learn10-desk', L + '#learn/ch10', D, { full: true, both: false });
  await shot('w-cache-phone', L + '#learn/ch4', P, W('Cache simulator'));
  await shot('w-routing-phone', L + '#learn/ch10', P, W('Routing-policy simulator'));
  await shot('w-failover-phone', L + '#learn/ch11', P, W('Failover race'));
  await shot('w-sorter-phone', L + '#learn/ch2', P, W('Which one answers this'));
  await shot('w-chooser-phone', L + '#learn/ch6', P, W('Edge-compute chooser'));
  await shot('w-stepper-phone', L + '#learn/ch7', P, W('Host example.com on S3'));
  await shot('w-stub-phone', L + '#learn/ch1', P, W('Stub trainer'));
  await shot('drill-phone', L + '#drill/Q4', P, { full: true, act: async p => {
    for (const t of ['static content', 'global users', 'cache', 'cheapest']) await p.locator('.stubrow', { hasText: '' }).locator('button.chip', { hasText: new RegExp('^' + t + '$') }).first().click();
    const opts = p.locator('.optlist > div');
    await opts.nth(2).locator('.xbtn').click(); await p.locator('.reasons button', { hasText: 'wrong job' }).click();
    await opts.nth(0).click(); await p.locator('button', { hasText: /^Check$/ }).click(); await p.waitForTimeout(300);
    await p.evaluate(() => window.scrollTo(0, 0));
  } });
  for (const id of ['cf-ga', 'cf-ta', 'access', 'edgefn', 'r53-geo', 'alias', 'failover', 'alb-cf']) await shot('compare-' + id + '-phone', L + '#compare/' + id, P, { full: true, both: id === 'cf-ga' || id === 'failover' ? undefined : false });
  await shot('cards-phone', L + '#cards', P, { act: async p => { await p.locator('button', { hasText: 'Show answer' }).click(); } });
  await b.close();
})();
