/* Session 9 screenshots → design/compare/s9-*.png (git-ignored). node shots-09.js [filter] */
const { chromium } = require('playwright');
const OUT = '/home/dima/dev/personal/saa-exam/design/compare/';
const L = 'http://localhost:8765/sessions/09-serverless/';
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
      const file = OUT + 's9-' + name + (dark ? '-dark' : '') + '.png';
      if (o.sel) { await p.addStyleTag({ content: '.hdr,.bbar,.tabs{position:static !important}' }); await p.locator(o.sel).first().screenshot({ path: file }); }
      else await p.screenshot({ path: file, fullPage: !!o.full });
      await ctx.close();
    }
  };
  const W = t => ({ sel: `.widget:has-text("${t}")` });
  await shot('map-desk', L + '#map/firehose', D);
  await shot('map-eb-desk', L + '#map/eb', D, { both: false });
  await shot('map-query-desk', L + '#map/query', D, { both: false });
  await shot('lines-phone', L + '#map', P);
  await shot('map-full-phone', L + '#map/full', P, { full: true, both: false });
  await shot('learn3-desk', L + '#learn/ch3', D, { full: true, both: false });
  await shot('learn8-phone', L + '#learn/ch8', P, { full: true, both: false });
  await shot('learn11-phone', L + '#learn/ch11', P, { full: true, both: false });
  await shot('w-vis-phone', L + '#learn/ch3', P, W('Visibility timeout · duplicates'));
  await shot('w-vis-desk', L + '#learn/ch3', D, Object.assign(W('Visibility timeout · duplicates'), { both: false }));
  await shot('w-vis-poison-phone', L + '#learn/ch3', P, Object.assign(W('Visibility timeout · duplicates'), { both: false, act: async p => { const w = p.locator('.widget', { hasText: 'Visibility timeout · duplicates' }); await w.locator('button.chip', { hasText: /^10 min$/ }).click(); await w.locator('button.chip', { hasText: /^20 s$/ }).click(); await w.locator('button.chip', { hasText: 'always fails' }).click(); } }));
  await shot('w-shard-phone', L + '#learn/ch6', P, W('Shard calculator'));
  await shot('w-shard-desk', L + '#learn/ch6', D, Object.assign(W('Shard calculator'), { both: false }));
  await shot('w-scan-phone', L + '#learn/ch11', P, W('Athena scan cost'));
  await shot('w-scan-desk', L + '#learn/ch11', D, Object.assign(W('Athena scan cost'), { both: false }));
  await shot('w-choose-phone', L + '#learn/ch2', P, Object.assign(W('Which integration service?'), { act: async p => { const w = p.locator('.widget', { hasText: 'Which integration service?' }); await w.locator('.bigopt').nth(3).click(); await w.locator('.bigopt').nth(1).click(); } }));
  await shot('w-sorter-phone', L + '#learn/ch5', P, Object.assign(W('Rule, pipe or schedule?'), { both: false }));
  await shot('drill-phone', L + '#drill/E1', P, { full: true, act: async p => {
    const opts = p.locator('.optlist > div');
    await opts.nth(0).locator('.xbtn').click(); await p.locator('.reasons button').last().click();
    await opts.nth(1).click(); await p.locator('button', { hasText: /^Check$/ }).click(); await p.waitForTimeout(300);
    await p.evaluate(() => window.scrollTo(0, 0));
  } });
  for (const id of ['sqs-sns', 'std-fifo', 'sns-eb', 'kds-firehose', 'kds-sqs', 'sfn-types', 'glue-emr', 'athena-redshift']) await shot('compare-' + id + '-phone', L + '#compare/' + id, P, { full: true, both: id === 'kds-firehose' || id === 'sfn-types' ? undefined : false });
  await shot('cards-phone', L + '#cards', P, { act: async p => { await p.locator('button', { hasText: 'Show answer' }).click(); } });
  await shot('cheat-phone', L + '#cheat', P, { full: true, both: false });
  await shot('traps-desk', L + '#traps', D, { full: true, both: false });
  await shot('hub-desk', 'http://localhost:8765/hub.html', D, { full: true, both: false });
  await b.close();
})();
