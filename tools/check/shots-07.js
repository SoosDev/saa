/* Session 7 screenshots → design/compare/s7-*.png (git-ignored). node shots-07.js [filter] */
const { chromium } = require('playwright');
const OUT = '/home/dima/dev/personal/saa-exam/design/compare/';
const L = 'http://localhost:8765/sessions/07-ha-dr/';
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
      const file = OUT + 's7-' + name + (dark ? '-dark' : '') + '.png';
      if (o.sel) { await p.addStyleTag({ content: '.hdr,.bbar,.tabs{position:static !important}' }); await p.locator(o.sel).first().screenshot({ path: file }); }
      else await p.screenshot({ path: file, fullPage: !!o.full });
      await ctx.close();
    }
  };
  const W = t => ({ sel: `.widget:has-text("${t}")` });
  await shot('map-desk', L + '#map/r53', D);
  await shot('map-ddb-desk', L + '#map/ddb', D, { both: false });
  await shot('lines-phone', L + '#map', P);
  await shot('map-full-phone', L + '#map/full', P, { full: true, both: false });
  await shot('learn2-desk', L + '#learn/ch2', D, { full: true, both: false });
  await shot('learn4-phone', L + '#learn/ch4', P, { full: true, both: false });
  await shot('w-stub-phone', L + '#learn/ch1', P, W('Stub trainer'));
  await shot('w-picker-phone', L + '#learn/ch2', P, W('DR strategy picker'));
  await shot('w-picker-desk', L + '#learn/ch2', D, Object.assign(W('DR strategy picker'), { both: false }));
  await shot('w-az-phone', L + '#learn/ch3', P, W('AZ capacity'));
  await shot('w-az-desk', L + '#learn/ch3', D, Object.assign(W('AZ capacity'), { both: false }));
  await shot('w-threat-phone', L + '#learn/ch7', P, W('Protection vs threat'));
  await shot('w-threat-desk', L + '#learn/ch7', D, Object.assign(W('Protection vs threat'), { both: false }));
  await shot('w-failover-phone', L + '#learn/ch10', P, W('Failover time'));
  await shot('w-failover-desk', L + '#learn/ch10', D, Object.assign(W('Failover time'), { both: false }));
  await shot('w-cost-phone', L + '#learn/ch11', P, W('DR cost ladder'));
  await shot('w-cost-desk', L + '#learn/ch11', D, Object.assign(W('DR cost ladder'), { both: false }));
  await shot('w-db-phone', L + '#learn/ch6', P, Object.assign(W('Which database resilience'), { both: false, act: async p => { const w = p.locator('.widget', { hasText: 'Which database resilience' }); await w.locator('.bigopt').nth(1).click(); await w.locator('.bigopt').nth(1).click(); } }));
  await shot('drill-phone', L + '#drill/H3', P, { full: true, act: async p => {
    for (const t of ['Region', 'hours', 'hours', 'cheapest']) { const rows = p.locator('.stubrow'); }
    const rows = p.locator('.stubrow');
    await rows.nth(0).locator('button.chip', { hasText: /^Region$/ }).click(); await rows.nth(1).locator('button.chip', { hasText: /^hours$/ }).click();
    await rows.nth(2).locator('button.chip', { hasText: /^hours$/ }).click(); await rows.nth(3).locator('button.chip', { hasText: /^cheapest$/ }).click();
    const opts = p.locator('.optlist > div');
    await opts.nth(0).locator('.xbtn').click(); await p.locator('.reasons button').last().click();
    await opts.nth(3).click(); await p.locator('button', { hasText: /^Check$/ }).click(); await p.waitForTimeout(300);
    await p.evaluate(() => window.scrollTo(0, 0));
  } });
  for (const id of ['ha-dr', 'tiers', 'maz-rr', 'agd-rr', 'gt-agd', 'rep-bak', 'drs-bak-mgn', 'r53-ga-arc']) await shot('compare-' + id + '-phone', L + '#compare/' + id, P, { full: true, both: id === 'tiers' || id === 'r53-ga-arc' ? undefined : false });
  await shot('cards-phone', L + '#cards', P, { act: async p => { await p.locator('button', { hasText: 'Show answer' }).click(); } });
  await shot('cheat-phone', L + '#cheat', P, { full: true, both: false });
  await shot('traps-desk', L + '#traps', D, { full: true, both: false });
  await shot('hub-desk', 'http://localhost:8765/', D, { full: true, both: false });
  await b.close();
})();
