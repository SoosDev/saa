/* Session 8 screenshots → design/compare/s8-*.png (git-ignored). node shots-08.js [filter] */
const { chromium } = require('playwright');
const OUT = '/home/dima/dev/personal/saa-exam/design/compare/';
const L = 'http://localhost:8765/sessions/08-databases/';
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
      const file = OUT + 's8-' + name + (dark ? '-dark' : '') + '.png';
      if (o.sel) { await p.addStyleTag({ content: '.hdr,.bbar,.tabs{position:static !important}' }); await p.locator(o.sel).first().screenshot({ path: file }); }
      else await p.screenshot({ path: file, fullPage: !!o.full });
      await ctx.close();
    }
  };
  const W = t => ({ sel: `.widget:has-text("${t}")` });
  await shot('map-desk', L + '#map/proxy', D);
  await shot('map-ddb-desk', L + '#map/ddb', D, { both: false });
  await shot('lines-phone', L + '#map', P);
  await shot('map-full-phone', L + '#map/full', P, { full: true, both: false });
  await shot('learn4-desk', L + '#learn/ch4', D, { full: true, both: false });
  await shot('learn8-phone', L + '#learn/ch8', P, { full: true, both: false });
  await shot('w-storm-phone', L + '#learn/ch4', P, W('Connection storm'));
  await shot('w-storm-desk', L + '#learn/ch4', D, Object.assign(W('Connection storm'), { both: false }));
  await shot('w-cap-phone', L + '#learn/ch8', P, W('DynamoDB capacity'));
  await shot('w-cap-desk', L + '#learn/ch8', D, Object.assign(W('DynamoDB capacity'), { both: false }));
  await shot('w-cache-phone', L + '#learn/ch9', P, W('Cache patterns'));
  await shot('w-cache-desk', L + '#learn/ch9', D, Object.assign(W('Cache patterns'), { both: false }));
  await shot('w-choose-phone', L + '#learn/ch2', P, Object.assign(W('Which database?'), { act: async p => { const w = p.locator('.widget', { hasText: 'Which database?' }); await w.locator('.bigopt').nth(0).click(); await w.locator('.bigopt').nth(2).click(); } }));
  await shot('w-sorter-phone', L + '#learn/ch5', P, Object.assign(W('How would you scale these reads?'), { both: false }));
  await shot('drill-phone', L + '#drill/B1', P, { full: true, act: async p => {
    const opts = p.locator('.optlist > div');
    await opts.nth(0).locator('.xbtn').click(); await p.locator('.reasons button').last().click();
    await opts.nth(1).click(); await p.locator('button', { hasText: /^Check$/ }).click(); await p.waitForTimeout(300);
    await p.evaluate(() => window.scrollTo(0, 0));
  } });
  for (const id of ['rds-aurora', 'rel-kv', 'proxy-scale', 'gsi-lsi', 'od-prov', 'cache3', 'lazy-wt', 'olap']) await shot('compare-' + id + '-phone', L + '#compare/' + id, P, { full: true, both: id === 'cache3' || id === 'olap' ? undefined : false });
  await shot('cards-phone', L + '#cards', P, { act: async p => { await p.locator('button', { hasText: 'Show answer' }).click(); } });
  await shot('cheat-phone', L + '#cheat', P, { full: true, both: false });
  await shot('traps-desk', L + '#traps', D, { full: true, both: false });
  await shot('hub-desk', 'http://localhost:8765/', D, { full: true, both: false });
  await b.close();
})();
