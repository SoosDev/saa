/* Session 6 screenshots → design/compare/s6-*.png (git-ignored). node shots-06.js [filter] */
const { chromium } = require('playwright');
const OUT = '/home/dima/dev/personal/saa-exam/design/compare/';
const L = 'http://localhost:8765/sessions/06-governance/';
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
      const file = OUT + 's6-' + name + (dark ? '-dark' : '') + '.png';
      if (o.sel) { await p.addStyleTag({ content: '.hdr,.bbar,.tabs{position:static !important}' }); await p.locator(o.sel).first().screenshot({ path: file }); }
      else await p.screenshot({ path: file, fullPage: !!o.full });
      await ctx.close();
    }
  };
  const W = t => ({ sel: `.widget:has-text("${t}")` });
  await shot('map-desk', L + '#map/org', D);
  await shot('map-ram-desk', L + '#map/ram', D, { both: false });
  await shot('lines-phone', L + '#map', P);
  await shot('map-full-phone', L + '#map/full', P, { full: true, both: false });
  await shot('learn1-desk', L + '#learn/ch1', D, { full: true, both: false });
  await shot('learn4-desk', L + '#learn/ch4', D, { full: true, both: false });
  await shot('learn5-phone', L + '#learn/ch5', P, { full: true, both: false });
  await shot('w-stub-phone', L + '#learn/ch1', P, W('Stub trainer'));
  await shot('w-sorter-phone', L + '#learn/ch2', P, Object.assign(W('Which service answers this'), { both: false }));
  await shot('w-scptree-phone', L + '#learn/ch4', P, W('SCP inheritance tree'));
  await shot('w-scptree-desk', L + '#learn/ch4', D, Object.assign(W('SCP inheritance tree'), { both: false }));
  await shot('w-policy-phone', L + '#learn/ch5', P, Object.assign(W('Policy evaluation simulator'), { act: async p => { await p.locator('.widget', { hasText: 'Policy evaluation simulator' }).locator('button.chip', { hasText: /^leaves it out$/ }).first().click(); } }));
  await shot('w-policy-desk', L + '#learn/ch5', D, Object.assign(W('Policy evaluation simulator'), { both: false, act: async p => { await p.locator('.widget', { hasText: 'Policy evaluation simulator' }).locator('button.chip', { hasText: 'another account in the org' }).click(); } }));
  await shot('w-condsorter-phone', L + '#learn/ch6', P, Object.assign(W('Which condition key'), { both: false }));
  await shot('w-who-phone', L + '#learn/ch7', P, Object.assign(W('Which identity service'), { both: false }));
  await shot('w-timeline-phone', L + '#learn/ch8', P, W('Control timeline'));
  await shot('w-timeline-desk', L + '#learn/ch8', D, Object.assign(W('Control timeline'), { both: false, act: async p => { await p.locator('.widget', { hasText: 'Control timeline' }).locator('button.chip', { hasText: 'Detective + auto' }).click(); } }));
  await shot('w-ctlsorter-phone', L + '#learn/ch8', P, Object.assign(W('Preventive, detective or proactive'), { both: false }));
  await shot('w-share-phone', L + '#learn/ch9', P, Object.assign(W('Share it with RAM'), { both: false, act: async p => { const w = p.locator('.widget', { hasText: 'Share it with RAM' }); await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click(); } }));
  await shot('w-billing-phone', L + '#learn/ch11', P, W('Consolidated billing · RI and Savings'));
  await shot('w-billing-desk', L + '#learn/ch11', D, Object.assign(W('Consolidated billing · RI and Savings'), { both: false }));
  await shot('drill-phone', L + '#drill/G1', P, { full: true, act: async p => {
    for (const t of ['whole org', 'prevent', 'workforce human', 'least ops']) await p.locator('.stubrow').locator('button.chip', { hasText: new RegExp('^' + t + '$') }).first().click();
    const opts = p.locator('.optlist > div');
    await opts.nth(0).locator('.xbtn').click(); await p.locator('.reasons button').last().click();
    await opts.nth(2).click(); await p.locator('button', { hasText: /^Check$/ }).click(); await p.waitForTimeout(300);
    await p.evaluate(() => window.scrollTo(0, 0));
  } });
  for (const id of ['scp-pb', 'scp-rcp', 'idc-iam-cog', 'ct-orgs', 'ram-peer-tgw', 'role-rbp', 'cfg-trail-scp', 'tag-scp']) await shot('compare-' + id + '-phone', L + '#compare/' + id, P, { full: true, both: id === 'scp-pb' || id === 'ram-peer-tgw' ? undefined : false });
  await shot('cards-phone', L + '#cards', P, { act: async p => { await p.locator('button', { hasText: 'Show answer' }).click(); } });
  await shot('cheat-phone', L + '#cheat', P, { full: true, both: false });
  await shot('traps-desk', L + '#traps', D, { full: true, both: false });
  await shot('hub-desk', 'http://localhost:8765/', D, { full: true, both: false });
  await shot('hub-phone', 'http://localhost:8765/', P, { full: true, both: false });
  await b.close();
})();
