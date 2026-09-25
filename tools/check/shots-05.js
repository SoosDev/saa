/* Session 5 screenshots → design/compare/s5-*.png (git-ignored). node shots-05.js [filter] */
const { chromium } = require('playwright');
const OUT = '/home/dima/dev/personal/saa-exam/design/compare/';
const L = 'http://localhost:8765/sessions/05-security/';
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
      const file = OUT + 's5-' + name + (dark ? '-dark' : '') + '.png';
      if (o.sel) { await p.addStyleTag({ content: '.hdr,.bbar,.tabs{position:static !important}' }); await p.locator(o.sel).first().screenshot({ path: file }); }
      else await p.screenshot({ path: file, fullPage: !!o.full });
      await ctx.close();
    }
  };
  const W = t => ({ sel: `.widget:has-text("${t}")` });
  await shot('map-desk', L + '#map/kms', D);
  await shot('map-nfw-desk', L + '#map/nfw', D, { both: false });
  await shot('lines-phone', L + '#map', P);
  await shot('map-full-phone', L + '#map/full', P, { full: true, both: false });
  await shot('learn1-desk', L + '#learn/ch1', D, { full: true, both: false });
  await shot('learn7-desk', L + '#learn/ch7', D, { full: true });
  await shot('learn5-phone', L + '#learn/ch5', P, { full: true, both: false });
  await shot('w-stub-phone', L + '#learn/ch1', P, W('Stub trainer'));
  await shot('w-sorter-phone', L + '#learn/ch2', P, W('Which service answers this'));
  await shot('w-envelope-phone', L + '#learn/ch3', P, W('Envelope encryption'));
  await shot('w-envelope-desk', L + '#learn/ch3', D, Object.assign(W('Envelope encryption'), { both: false }));
  await shot('w-keysim-phone', L + '#learn/ch4', P, W('KMS key types'));
  await shot('w-s3chooser-phone', L + '#learn/ch5', P, W('S3 encryption chooser'));
  await shot('w-rds-phone', L + '#learn/ch5', P, Object.assign(W('Encrypt an existing RDS'), { both: false }));
  await shot('w-store-phone', L + '#learn/ch6', P, W('Secrets Manager, Parameter Store, KMS or ACM'));
  await shot('w-waf-phone', L + '#learn/ch7', P, W('WAF web ACL simulator'));
  await shot('w-waf-desk', L + '#learn/ch7', D, Object.assign(W('WAF web ACL simulator'), { both: false }));
  await shot('w-router-phone', L + '#learn/ch9', P, Object.assign(W('Security finding router'), { act: async p => { const r = p.locator('.widget', { hasText: 'Security finding router' }).locator('.sortrow'); await r.nth(0).locator('button.chip', { hasText: 'GuardDuty' }).click(); await r.nth(2).locator('button.chip', { hasText: 'Inspector' }).click(); } }));
  await shot('w-cognito-phone', L + '#learn/ch11', P, W('Cognito · user pool vs identity pool'));
  await shot('w-cognito-desk', L + '#learn/ch11', D, Object.assign(W('Cognito · user pool vs identity pool'), { both: false, act: async p => { const w = p.locator('.widget', { hasText: 'Cognito · user pool' }); await w.locator('button', { hasText: 'Next' }).click(); await w.locator('button', { hasText: 'Next' }).click(); } }));
  await shot('drill-phone', L + '#drill/S1', P, { full: true, act: async p => {
    for (const t of ['data at rest', 'data store', 'prevent', 'least ops']) await p.locator('.stubrow').locator('button.chip', { hasText: new RegExp('^' + t + '$') }).first().click();
    const opts = p.locator('.optlist > div');
    await opts.nth(0).locator('.xbtn').click(); await p.locator('.reasons button', { hasText: 'violates ASSET' }).click();
    await opts.nth(2).click(); await p.locator('button', { hasText: /^Check$/ }).click(); await p.waitForTimeout(300);
    await p.evaluate(() => window.scrollTo(0, 0));
  } });
  for (const id of ['kms-hsm', 'sm-ps', 'sse', 'waf-shield', 'waf-nfw', 'detect3', 'hub-det', 'cognito']) await shot('compare-' + id + '-phone', L + '#compare/' + id, P, { full: true, both: id === 'waf-nfw' || id === 'sse' ? undefined : false });
  await shot('cards-phone', L + '#cards', P, { act: async p => { await p.locator('button', { hasText: 'Show answer' }).click(); } });
  await shot('cheat-phone', L + '#cheat', P, { full: true, both: false });
  await shot('cheat-desk', L + '#cheat', D, { both: false });
  await shot('traps-desk', L + '#traps', D, { full: true, both: false });
  await b.close();
})();
