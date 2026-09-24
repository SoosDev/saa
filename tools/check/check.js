const { chromium } = require('playwright');
const ROOT = process.env.ROOT || 'http://localhost:8765/';
const SESS = process.argv[2] || '01-storage';
const BASE = ROOT + 'sessions/' + SESS + '/';
const fail = []; const ok = m => console.log('  ✓ ' + m); const bad = m => { console.log('  ✕ ' + m); fail.push(m); };
(async () => {
  const b = await chromium.launch();
  for (const dark of [false, true]) for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const tag = vp.width + (dark ? ' dark' : ' light');
    console.log('== ' + tag);
    const ctx = await b.newContext({ viewport: vp, colorScheme: dark ? 'dark' : 'light' });
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    const noScroll = async where => { const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > vp.width) bad(where + ' horizontal scroll ' + sw); };
    // hub
    await p.goto(ROOT); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    const fonts = await p.evaluate(() => [document.fonts.check('800 20px Overpass'), document.fonts.check('16px "Atkinson Hyperlegible"'), document.fonts.check('14px "Overpass Mono"')]);
    fonts.every(Boolean) ? ok('hub fonts ' + fonts) : bad('hub fonts ' + fonts);
    await noScroll('hub');
    // session tabs
    await p.goto(BASE); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    const f2 = await p.evaluate(() => [document.fonts.check('800 20px Overpass'), document.fonts.check('16px "Atkinson Hyperlegible"'), document.fonts.check('14px "Overpass Mono"')]);
    f2.every(Boolean) ? ok('session fonts') : bad('session fonts ' + f2);
    const tabs = await p.evaluate(() => Array.from(document.querySelectorAll('.tabs-in a')).map(a => a.getAttribute('href').slice(1)));
    for (const t of tabs) {
      await p.goto(BASE + '#' + t); await p.waitForTimeout(250);
      const n = await p.evaluate(() => document.querySelector('main').innerText.length);
      n > 80 ? null : bad('tab ' + t + ' empty'); await noScroll('tab ' + t);
    }
    ok(tabs.length + ' tabs render');
    const chs = await p.evaluate(() => SAA.ctx.S.learn.map(c => c.id));
    for (const c of chs) { await p.goto(BASE + '#learn/' + c); await p.waitForTimeout(200); await noScroll('learn ' + c); }
    ok(chs.length + ' chapters render');
    // drill end to end
    await p.goto(BASE + '#drill'); await p.waitForTimeout(300);
    const stub = await p.evaluate(() => SAA.ctx.S.stub.map(s => s.values[0]));
    const rows = p.locator('.stubrow');
    for (let i = 0; i < stub.length; i++) await rows.nth(i).locator('button.chip').first().click();
    const opts = p.locator('.optlist > div');
    await opts.nth(1).locator('.xbtn').click(); await p.locator('.reasons button').first().click();
    const need = await p.evaluate(() => { const id = document.querySelector('.drillcol .eyebrow').textContent; return 1; });
    const nOpt = await opts.count();
    const btnTxt = async () => (await p.locator('.drillcol button.btn').first().innerText());
    await opts.nth(0).click();
    if ((await btnTxt()).startsWith('Pick')) await opts.nth(2).click();
    await p.locator('.drillcol button.btn', { hasText: /^Check$/ }).click();
    await p.waitForTimeout(200);
    (await p.locator('.vt.y, .vt.n').count()) >= stub.length ? ok('drill submitted, slot verdicts shown') : bad('drill verdicts missing');
    await p.locator('button', { hasText: /Next scenario|Finish set/ }).click(); await p.waitForTimeout(200);
    const saved = await p.evaluate(sid => Object.keys(JSON.parse(localStorage.getItem('saa:' + sid + ':drill') || '{}')).length, SESS);
    saved ? ok('drill result saved') : bad('drill not saved');
    // card rated
    await p.goto(BASE + '#cards'); await p.waitForTimeout(200);
    await p.locator('button', { hasText: 'Show answer' }).click();
    await p.locator('.rate .rknew').click(); await p.waitForTimeout(150);
    const cs = await p.evaluate(sid => Object.values(JSON.parse(localStorage.getItem('saa:' + sid + ':cards') || '{}')), SESS);
    cs.some(c => c.box === 2) ? ok('card rated → box 2') : bad('card not rated');
    // checkpoint + every widget, chapter by chapter
    let ck = 0, wd = 0;
    for (const c of chs) {
      await p.goto(BASE + '#learn/' + c); await p.waitForTimeout(250);
      const n = await p.locator('.ckpt').count();
      for (let i = 0; i < n; i++) {
        const box = p.locator('.ckpt').nth(i);
        const multi = await box.locator('text=/^Pick \\d/').count();
        await box.locator('button.opt').first().click();
        if (multi) { await box.locator('button.opt').nth(1).click(); await box.locator('button.btn', { hasText: 'Check' }).click(); }
        if (await box.locator('button', { hasText: 'Try again' }).count()) ck++;
      }
      wd += await p.evaluate(() => document.querySelectorAll('.widget, .chart, .mapbox, .qcgrid').length);
    }
    ck ? ok(ck + ' checkpoints answered') : bad('no checkpoint answered');
    // widget interactions (session-specific script)
    const W = require('./widgets-' + SESS + '.js');
    for (const [name, fn] of Object.entries(W)) { try { await fn(p, BASE); ok('widget ' + name); } catch (e) { bad('widget ' + name + ': ' + e.message.split('\n')[0]); } }
    // phone: More sheet
    if (vp.width < 500) { await p.goto(BASE + '#learn'); await p.locator('.bbar button').click(); await p.waitForTimeout(150); (await p.locator('.sheet.open').count()) ? ok('More sheet opens') : bad('More sheet'); }
    errs.length ? bad('console errors: ' + errs.join(' | ')) : ok('zero console errors');
    await ctx.close();
  }
  await b.close();
  console.log(fail.length ? '\nFAILED ' + fail.length : '\nALL PASS');
})();
