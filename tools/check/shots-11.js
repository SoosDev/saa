/* Session 11 screenshots → design/compare/s11-*.png (git-ignored). node shots-11.js [filter] */
const { chromium } = require('playwright');
const OUT = '/home/dima/dev/personal/saa-exam/design/compare/';
const L = 'http://localhost:8765/sessions/11-monitoring/';
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
      const file = OUT + 's11-' + name + (dark ? '-dark' : '') + '.png';
      if (o.sel) { await p.addStyleTag({ content: '.hdr,.bbar,.tabs{position:static !important}' }); await p.locator(o.sel).first().screenshot({ path: file }); }
      else await p.screenshot({ path: file, fullPage: !!o.full });
      await ctx.close();
    }
  };
  const W = t => ({ sel: `.widget:has-text("${t}")` });
  await shot('map-desk', L + '#map/cw', D);
  await shot('map-logs-desk', L + '#map/logs', D, { both: false });
  await shot('map-trail-desk', L + '#map/trail', D, { both: false });
  await shot('map-ssm-desk', L + '#map/ssm', D, { both: false });
  await shot('lines-phone', L + '#map', P);
  await shot('map-full-phone', L + '#map/full', P, { full: true, both: false });
  await shot('learn1-desk', L + '#learn/ch1', D, { full: true, both: false });
  await shot('learn5-desk', L + '#learn/ch5', D, { full: true, both: false });
  await shot('learn6-phone', L + '#learn/ch6', P, { full: true, both: false });
  await shot('learn8-phone', L + '#learn/ch8', P, { full: true, both: false });
  await shot('learn10-phone', L + '#learn/ch10', P, { full: true, both: false });
  await shot('learn11-phone', L + '#learn/ch11', P, { full: true, both: false });
  await shot('w-retention-phone', L + '#learn/ch3', P, W('Metric retention · what is left'));
  await shot('w-retention-desk', L + '#learn/ch3', D, Object.assign(W('Metric retention · what is left'), { both: false }));
  await shot('w-alarm-phone', L + '#learn/ch5', P, W('Alarm evaluation · M out of N'));
  await shot('w-alarm-desk', L + '#learn/ch5', D, Object.assign(W('Alarm evaluation · M out of N'), { both: false }));
  await shot('w-trail-phone', L + '#learn/ch8', P, W('Can you still answer it?'));
  await shot('w-trail-s3-phone', L + '#learn/ch8', P, Object.assign(W('Can you still answer it?'), { both: false, act: async p => { const w = p.locator('.widget', { hasText: 'Can you still answer it?' }); await w.locator('.stubrow', { hasText: 'KIND OF EVENT' }).locator('button.chip', { hasText: 'S3 object' }).click(); await w.locator('.stubrow', { hasText: 'SET UP BEFOREHAND' }).locator('button.chip', { hasText: 'data events' }).click(); } }));
  await shot('w-trail-desk', L + '#learn/ch8', D, Object.assign(W('Can you still answer it?'), { both: false }));
  await shot('w-choose-phone', L + '#learn/ch2', P, Object.assign(W('Which tool answers this?'), { act: async p => { const w = p.locator('.widget', { hasText: 'Which tool answers this?' }); await w.locator('.bigopt').first().click(); await w.locator('.bigopt').nth(1).click(); } }));
  await shot('w-sorter6-phone', L + '#learn/ch2', P, Object.assign(W('Metric, log, trace, API call'), { both: false }));
  await shot('w-sorter-ssm-phone', L + '#learn/ch10', P, Object.assign(W('Run Command, Patch Manager, State Manager'), { both: false }));
  await shot('drill-phone', L + '#drill/W1', P, { full: true, act: async p => {
    const opts = p.locator('.optlist > div');
    await opts.nth(0).locator('.xbtn').click(); await p.locator('.reasons button').last().click();
    await opts.nth(1).click(); await p.locator('button', { hasText: /^Check$/ }).click(); await p.waitForTimeout(300);
    await p.evaluate(() => window.scrollTo(0, 0));
  } });
  for (const id of ['cw-trail-config', 'basic-agent', 'alarm-eb', 'mfilter-sub', 'logs-xray', 'history-trail', 'patch-inspector', 'ta-config']) await shot('compare-' + id + '-phone', L + '#compare/' + id, P, { full: true, both: id === 'cw-trail-config' || id === 'history-trail' ? undefined : false });
  await shot('compare-cw-trail-config-desk', L + '#compare/cw-trail-config', D, { both: false });
  await shot('cards-phone', L + '#cards', P, { act: async p => { await p.locator('button', { hasText: 'Show answer' }).click(); } });
  await shot('cheat-phone', L + '#cheat', P, { full: true, both: false });
  await shot('traps-desk', L + '#traps', D, { full: true, both: false });
  await shot('hub-desk', 'http://localhost:8765/hub.html', D, { full: true, both: false });
  await shot('feed-phone', 'http://localhost:8765/', P, { both: false });
  await b.close();
})();
