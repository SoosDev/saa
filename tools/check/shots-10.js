/* Session 10 screenshots → design/compare/s10-*.png (git-ignored). node shots-10.js [filter] */
const { chromium } = require('playwright');
const OUT = '/home/dima/dev/personal/saa-exam/design/compare/';
const L = 'http://localhost:8765/sessions/10-compute/';
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
      const file = OUT + 's10-' + name + (dark ? '-dark' : '') + '.png';
      if (o.sel) { await p.addStyleTag({ content: '.hdr,.bbar,.tabs{position:static !important}' }); await p.locator(o.sel).first().screenshot({ path: file }); }
      else await p.screenshot({ path: file, fullPage: !!o.full });
      await ctx.close();
    }
  };
  const W = t => ({ sel: `.widget:has-text("${t}")` });
  await shot('map-desk', L + '#map/asg', D);
  await shot('map-elb-desk', L + '#map/elb', D, { both: false });
  await shot('map-paas-desk', L + '#map/paas', D, { both: false });
  await shot('map-batch-desk', L + '#map/batch', D, { both: false });
  await shot('lines-phone', L + '#map', P);
  await shot('map-full-phone', L + '#map/full', P, { full: true, both: false });
  await shot('learn5-desk', L + '#learn/ch5', D, { full: true, both: false });
  await shot('learn7-phone', L + '#learn/ch7', P, { full: true, both: false });
  await shot('learn8-phone', L + '#learn/ch8', P, { full: true, both: false });
  await shot('learn11-phone', L + '#learn/ch11', P, { full: true, both: false });
  await shot('w-mix-phone', L + '#learn/ch6', P, W('Mixed instances · On-Demand base'));
  await shot('w-mix-desk', L + '#learn/ch6', D, Object.assign(W('Mixed instances · On-Demand base'), { both: false }));
  await shot('w-backlog-phone', L + '#learn/ch7', P, W('Backlog per instance · scaling workers'));
  await shot('w-backlog-desk', L + '#learn/ch7', D, Object.assign(W('Backlog per instance · scaling workers'), { both: false }));
  await shot('w-cz-phone', L + '#learn/ch8', P, W('Cross-zone load balancing · share'));
  await shot('w-cz-big-phone', L + '#learn/ch8', P, Object.assign(W('Cross-zone load balancing · share'), { both: false, act: async p => { const w = p.locator('.widget', { hasText: 'Cross-zone load balancing · share' }); await w.locator('.stubrow', { hasText: 'TARGETS IN AZ A' }).locator('button.chip', { hasText: /^5$/ }).click(); } }));
  await shot('w-cz-desk', L + '#learn/ch8', D, Object.assign(W('Cross-zone load balancing · share'), { both: false }));
  await shot('w-choose-phone', L + '#learn/ch2', P, Object.assign(W('Which compute?'), { act: async p => { const w = p.locator('.widget', { hasText: 'Which compute?' }); await w.locator('.bigopt').first().click(); await w.locator('.bigopt').nth(1).click(); } }));
  await shot('w-sorter-phone', L + '#learn/ch11', P, Object.assign(W('Which deployment policy?'), { both: false }));
  await shot('w-family-phone', L + '#learn/ch3', P, Object.assign(W('Which instance family?'), { both: false }));
  await shot('drill-phone', L + '#drill/C1', P, { full: true, act: async p => {
    const opts = p.locator('.optlist > div');
    await opts.nth(0).locator('.xbtn').click(); await p.locator('.reasons button').last().click();
    await opts.nth(1).click(); await p.locator('button', { hasText: /^Check$/ }).click(); await p.waitForTimeout(300);
    await p.evaluate(() => window.scrollTo(0, 0));
  } });
  for (const id of ['dhost-dinst', 'cluster-spread', 'sp-ri', 'dynamic-predictive', 'alb-nlb', 'ecs-eks', 'lambda-fargate', 'batch-lambda']) await shot('compare-' + id + '-phone', L + '#compare/' + id, P, { full: true, both: id === 'alb-nlb' || id === 'cluster-spread' ? undefined : false });
  await shot('cards-phone', L + '#cards', P, { act: async p => { await p.locator('button', { hasText: 'Show answer' }).click(); } });
  await shot('cheat-phone', L + '#cheat', P, { full: true, both: false });
  await shot('traps-desk', L + '#traps', D, { full: true, both: false });
  await shot('hub-desk', 'http://localhost:8765/hub.html', D, { full: true, both: false });
  await shot('feed-phone', 'http://localhost:8765/', P, { both: false });
  await b.close();
})();
