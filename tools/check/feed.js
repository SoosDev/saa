const { chromium } = require('playwright');
const ROOT = process.env.ROOT || 'http://localhost:8765/';
const fail = []; const ok = m => console.log('  ✓ ' + m); const bad = m => { console.log('  ✕ ' + m); fail.push(m); };
const check = (cond, m) => (cond ? ok(m) : bad(m));
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
    const items = () => p.evaluate(() => Array.from(document.querySelectorAll('.flist > .fitem[data-key]')).map(e => ({ key: e.dataset.key, kind: e.dataset.kind, sub: e.dataset.sub, sid: e.dataset.sid })));
    const toBottom = async () => { await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(350); };
    const atLeast = async n => { for (let i = 0; i < 12 && (await items()).length < n; i++) await toBottom(); return items(); };
    const chip = async (attr, v) => { await p.locator('.feed button[data-' + attr + '="' + v + '"]').click(); await p.waitForTimeout(200); };
    const first = () => p.locator('.flist > .fitem[data-key]').first();
    const counter = () => p.locator('.fcount').innerText();
    const item = key => p.locator('.flist > .fitem[data-key="' + key + '"]');
    const firstKey = (sel, btn) => p.locator('.flist > .fitem' + sel).filter({ has: p.locator('button', { hasText: btn }) }).first().getAttribute('data-key');
    /* a single-answer drill answered wrong on purpose: the right texts come from the session data, rendered the way the feed renders them */
    const answerWrong = async key => {
      const [sid, , id] = key.split('|');
      const right = await p.evaluate(([sid, id]) => {
        const txt = t => { const e = document.createElement('span'); SAA.md(t).forEach(n => e.append(n)); return e.textContent; };
        return SAA.feedData[sid].drills.find(x => x.id === id).opts.filter(o => o.ok).map(o => txt(o.t));
      }, [sid, id]);
      const opts = item(key).locator('button.opt'), n = await opts.count();
      for (let i = 0; i < n; i++) if (!right.includes(await opts.nth(i).locator('.otxt').textContent())) { await opts.nth(i).click(); break; }
      await item(key).locator('button.btn', { hasText: /^Check$/ }).click(); await p.waitForTimeout(150);
    };

    // 1. fonts
    await p.goto(ROOT); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    const fonts = await p.evaluate(() => [document.fonts.check('800 20px Overpass'), document.fonts.check('16px "Atkinson Hyperlegible"'), document.fonts.check('14px "Overpass Mono"')]);
    check(fonts.every(Boolean), 'feed fonts ' + fonts);
    // 2. first batch
    await p.waitForSelector('.flist > .fitem[data-key]');
    const n0 = (await items()).length;
    check(n0 >= 6, 'first batch renders (' + n0 + ' items)');
    await noScroll('feed first paint');
    // 3. every session loads through the one global
    const want = await p.evaluate(() => (window.SAA_SESSIONS || []).filter(sx => sx.path && !sx.soon).length);
    try { await p.waitForFunction(w => document.documentElement.dataset.feedSessions === String(w), want, { timeout: 30000 }); ok(want + ' sessions loaded'); }
    catch (e) { bad('sessions loaded: ' + (await p.evaluate(() => document.documentElement.dataset.feedSessions)) + ' of ' + want); }
    // 4. infinite scroll
    let prev = (await items()).length, grew = 0;
    for (let i = 0; i < 3; i++) { await toBottom(); const n = (await items()).length; if (n > prev) grew++; prev = n; await noScroll('after scroll ' + (i + 1)); }
    check(grew === 3, 'scrolling to the bottom adds items 3 times (' + prev + ' items)');
    // 5. a question answered in place: nothing revealed before Check
    await p.evaluate(() => window.scrollTo(0, 0));
    await chip('mode', 'questions');
    check((await first().getAttribute('data-kind')) === 'quiz', 'Questions: first item is a question (' + (await first().getAttribute('data-key')) + ')');
    const qMeta = { key: await firstKey('[data-sub="drill"]', /^Pick one$/), sub: 'drill' };
    const q = item(qMeta.key);
    check((await q.locator('.why').count()) === 0 && (await q.locator('mark').count()) === 0, 'no why and no highlight before Check');
    await answerWrong(qMeta.key);
    const nOpt = await q.locator('.opt').count(), nWhy = await q.locator('.opt .why').count();
    check((await q.locator('.opt.correct').count()) > 0 && (await q.locator('.opt.wrong').count()) === 1 && (await q.locator('h2.step').innerText()) === 'Where it broke', 'answered wrong: the answer and the wrong pick are marked (' + qMeta.key + ')');
    check(nOpt > 0 && nWhy === nOpt, 'every option shows its why (' + nWhy + '/' + nOpt + ')');
    check((await counter()) === 'today 1 · 0 right', 'header counter: ' + (await counter()));
    // 6. the session's own record
    const [qsid, qsub, qid] = qMeta.key.split('|');
    const qrec = await p.evaluate(([sid, sub, id]) => (JSON.parse(localStorage.getItem('saa:' + sid + ':' + sub) || '{}'))[id], [qsid, qsub, qid]);
    check(qrec && qrec.ok === false && qrec.n === 1 && typeof qrec.at === 'number', 'saa:' + qsid + ':' + qsub + '[' + qid + '] = ' + JSON.stringify(qrec));
    // 7. a trigger card rated
    await chip('mode', 'cards');
    const c = first();
    const ckey = await c.getAttribute('data-key');
    check((await c.getAttribute('data-kind')) === 'card' && (await c.locator('.fc .back').count()) === 0, 'Cards: back hidden until Show answer');
    await c.locator('button', { hasText: 'Show answer' }).click();
    await c.locator('.rate .rknew').click(); await p.waitForTimeout(150);
    const [csid, , cid] = ckey.split('|');
    const crec = await p.evaluate(([sid, id]) => (JSON.parse(localStorage.getItem('saa:' + sid + ':cards') || '{}'))[id], [csid, cid]);
    check(crec && crec.box === 2, 'card rated → box 2 in saa:' + csid + ':cards');
    // 8. Mix interleaves sessions and kinds
    await chip('mode', 'mix');
    const mix = (await atLeast(24)).slice(0, 24);
    const sids = new Set(mix.map(x => x.sid)), kinds = new Set(mix.map(x => x.kind));
    check(mix.length === 24 && sids.size >= 4 && kinds.size >= 3, 'Mix, first 24: ' + sids.size + ' sessions, ' + kinds.size + ' kinds');
    const bigBold = await p.evaluate(() => Array.from(document.querySelectorAll('.feed .lcard p b')).filter(b => getComputedStyle(b).fontSize !== getComputedStyle(b.closest('p')).fontSize).map(b => b.textContent));
    check(bigBold.length === 0, 'line card text keeps its size' + (bigBold.length ? ': ' + bigBold.slice(0, 3).join(', ') : ''));
    await noScroll('mix');
    // 9. every domain chip yields questions; Questions mode yields only questions
    await p.evaluate(() => window.scrollTo(0, 0));
    await chip('mode', 'questions');
    for (const D of ['D1', 'D2', 'D3', 'D4']) {
      await chip('domain', D);
      const its = await items();
      const doms = await p.evaluate(() => Array.from(document.querySelectorAll('.flist > .fitem[data-key] .fhead .mono')).map(e => e.textContent));
      check(its.length > 0 && its.every(x => x.kind === 'quiz' || x.kind === 'pair') && its.some(x => x.kind === 'quiz') && doms.every(t => t.split(' ').includes(D)), D + ': ' + its.length + ' items, all questions, all tagged ' + D);
    }
    await chip('domain', 'all');
    // 10. resume after reload
    await p.reload(); await p.waitForSelector('.flist > .fitem[data-key]');
    try { await p.waitForFunction(w => document.documentElement.dataset.feedSessions === String(w), want, { timeout: 30000 }); } catch (e) { /* reported above */ }
    check((await counter()) === 'today 2 · 1 right', 'counter survives reload: ' + (await counter()));
    const pressed = await p.evaluate(() => Array.from(document.querySelectorAll('.feed button[aria-pressed="true"]')).map(x => x.dataset.mode || x.dataset.domain));
    check(pressed.includes('questions') && pressed.includes('all'), 'chips restored: ' + pressed.join(','));
    const first12 = (await atLeast(12)).slice(0, 12).map(x => x.key);
    check(first12.length === 12 && !first12.includes(qMeta.key), 'the drill answered wrong (' + qMeta.key + ') is not among the first 12 items');
    // 11. theme
    const bg0 = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const th0 = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await p.locator('.hdr .tbtn').click(); await p.waitForTimeout(100);
    const bg1 = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const th1 = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
    check(th1 && th1 !== th0 && bg1 !== bg0, 'theme button: ' + th0 + ' → ' + th1 + ', background changes');
    await p.locator('.hdr .tbtn').click(); await p.waitForTimeout(100);
    // 12. tap targets on the phone
    if (vp.width < 500) {
      /* every control state: a drill answered wrong (miss tags, Try again), a card shown (rate row), a pair answered */
      await p.evaluate(() => window.scrollTo(0, 0));
      await chip('mode', 'mix'); await atLeast(24);
      const wk = await firstKey('[data-sub="drill"]', /^Pick one$/);
      await answerWrong(wk);
      const ck = await firstKey('[data-kind="card"]', 'Show answer');
      await item(ck).locator('button', { hasText: 'Show answer' }).click(); await p.waitForTimeout(100);
      const pk = await firstKey('[data-kind="pair"]', /^Pick one$/);
      await item(pk).locator('button.qcbtn').first().click();
      await item(pk).locator('button.btn', { hasText: /^Check$/ }).click(); await p.waitForTimeout(100);
      const tt = await p.evaluate(() => {
        const els = Array.from(document.querySelectorAll('.feed button, .feed a.btn, .feed .chip, .feed .ffoot a, .hdr button, .hdr a')).filter(e => e.offsetParent !== null);
        return { vt: els.filter(e => e.matches('button.vt')).length, rate: els.filter(e => e.matches('.rate button')).length, again: els.filter(e => e.textContent === 'Try again').length,
          small: els.map(e => [e.textContent.trim().slice(0, 30), Math.round(e.getBoundingClientRect().height)]).filter(([, hh]) => hh < 44) };
      });
      check(tt.vt >= 6 && tt.rate >= 3 && tt.again >= 2, 'measured: ' + tt.vt + ' miss tags, ' + tt.rate + ' rate buttons, ' + tt.again + ' Try again');
      check(tt.small.length === 0, 'tap targets ≥ 44px' + (tt.small.length ? ': ' + JSON.stringify(tt.small.slice(0, 6)) : ''));
      const hh = await p.evaluate(() => document.querySelector('.hdr').getBoundingClientRect().height);
      check(hh === 56, 'phone header 56px (' + hh + ')');
    }
    // 13. links into the sessions and to the hub
    await p.evaluate(() => window.scrollTo(0, 0));
    const d = p.locator('.flist > .fitem[data-sub="drill"]').first();
    const dScen = (await d.locator('.scen').first().innerText()).trim();
    const href = await d.locator('.ffoot a').first().getAttribute('href');
    check(href && !href.startsWith('/') && /^sessions\/[\w-]+\/#drill\/[A-Z]\d+$/.test(href), 'Full drill link is relative: ' + href);
    await d.locator('.ffoot a').first().click();
    await p.waitForSelector('.drillcol .scen'); await p.waitForTimeout(200);
    const onPage = (await p.locator('.drillcol .scen').first().innerText()).trim();
    check(onPage === dScen, 'Full drill opens the same scenario in its session');
    await p.goBack(); await p.waitForSelector('.flist > .fitem[data-key]');
    await p.locator('.hdr a.hlink', { hasText: 'Sessions' }).click();
    await p.waitForSelector('a.scard');
    const nCards = await p.locator('a.scard').count();
    check(p.url().endsWith('hub.html') && nCards >= 8, 'Sessions → hub.html with ' + nCards + ' session cards');
    await p.locator('.hdr a.hlink', { hasText: 'Feed' }).click(); await p.waitForSelector('.flist > .fitem[data-key]');
    check(/\/$/.test(p.url()), 'hub → Feed lands on the root');
    // 14. console
    errs.length ? bad('console errors: ' + errs.join(' | ')) : ok('zero console errors');
    await ctx.close();
  }
  {
    // 15. once: links from session markup, filter churn, the end state, the day rolling over while open
    console.log('== links, filters, end state, new day (1440 light)');
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => {
      const RD = Date; window.__dOff = 0;
      window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + window.__dOff); } static now() { return RD.now() + window.__dOff; } };
    });
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    const chip = async (attr, v) => { await p.locator('.feed button[data-' + attr + '="' + v + '"]').click(); await p.waitForTimeout(150); };
    const counter = () => p.locator('.fcount').innerText();
    await p.goto(ROOT); await p.waitForSelector('.flist > .fitem[data-key]');
    await p.waitForFunction(() => document.documentElement.dataset.feedDone === '1', null, { timeout: 30000 });
    // links: every Reading item (the DataSync line of Session 2 links to Session 1, chapter 8)
    await chip('mode', 'reading');
    const DS = '02-migration|line|datasync';
    await p.evaluate(() => {
      const more = Array.from(document.querySelectorAll('.feed button')).find(x => x.textContent === 'More');
      for (let i = 0; i < 200 && !document.querySelector('.flist [data-kind="end"]'); i++) more.click();
    });
    const dsHref = await p.evaluate(ds => { const e = document.querySelector('.fitem[data-key="' + ds + '"] .lcard a[href]'); return e && e.getAttribute('href'); }, DS);
    check(dsHref === 'sessions/01-storage/#learn/ch8', 'DataSync line links to Session 1, chapter 8: ' + dsHref);
    const links = await p.evaluate(() => Array.from(document.querySelectorAll('.flist .fitem a[href]')).map(a => ({ raw: a.getAttribute('href'), abs: a.href, body: !a.closest('.ffoot') })));
    const base = new URL('./', ROOT), origin = base.origin;
    const badLinks = links.filter(l => {
      if (new URL(l.abs).origin !== origin) return false;
      const rest = new URL(l.abs).pathname.slice(base.pathname.length);
      return l.raw.startsWith('/') || l.raw.startsWith('../') || !new URL(l.abs).pathname.startsWith(base.pathname) || !(rest === '' || rest === 'hub.html' || /^sessions\/\d\d-[\w-]+\/$/.test(rest));
    });
    check(links.length > 100 && links.some(l => l.body) && badLinks.length === 0, links.length + ' item links (' + links.filter(l => l.body).length + ' from session text) resolve to the root, the hub or a session' + (badLinks.length ? ': ' + badLinks.slice(0, 4).map(l => l.raw).join(', ') : ''));
    const pages = Array.from(new Set(links.map(l => new URL(l.abs)).filter(u => u.origin === origin).map(u => u.origin + u.pathname)));
    const st200 = [];
    for (const u of pages) st200.push([u, (await p.request.get(u)).status()]);
    check(pages.length > 0 && st200.every(([, s]) => s === 200), pages.length + ' linked pages answer 200' + (st200.some(([, s]) => s !== 200) ? ': ' + JSON.stringify(st200.filter(([, s]) => s !== 200)) : ''));
    // filter churn: items shown but never answered come back after a chip change
    await chip('mode', 'cards');
    const nCards = await p.evaluate(() => Object.values(SAA.feedData).reduce((n, S) => n + (S.cards || []).length, 0));
    const turns = Math.ceil(nCards / 6) + 4; // each change serves at least one batch of 6, so without the fix every card is used up by then
    for (let i = 0; i < turns; i++) await chip('domain', i % 2 ? 'D1' : 'D4');
    const churn = await p.evaluate(() => ({ cards: document.querySelectorAll('.flist > .fitem[data-kind="card"]').length, end: document.querySelectorAll('.flist [data-kind="end"]').length }));
    check(churn.cards > 0 && churn.end === 0, turns + ' domain chip changes over ' + nCards + ' cards, nothing rated: ' + churn.cards + ' cards still served');
    await chip('domain', 'all');
    // end state: no card due anywhere → Cards mode ends and More is gone; Mix brings it back
    await p.evaluate(() => {
      const far = Date.now() + 30 * 86400000;
      Object.entries(SAA.feedData).forEach(([sid, S]) => { const m = {}; (S.cards || []).forEach(c => { m[c.id] = { box: 5, due: far, n: 1, last: 'knew' }; }); localStorage.setItem('saa:' + sid + ':cards', JSON.stringify(m)); });
    });
    const moreShown = () => p.evaluate(() => { const m = Array.from(document.querySelectorAll('.feed button')).find(x => x.textContent === 'More'); return getComputedStyle(m).display !== 'none'; });
    await chip('mode', 'reading'); await chip('mode', 'cards');
    const endN = await p.evaluate(() => document.querySelectorAll('.flist [data-kind="end"]').length);
    check(endN === 1 && !(await moreShown()), 'no card due: "Nothing left" shown and More hidden');
    await chip('mode', 'mix');
    check((await p.locator('.flist > .fitem[data-key]').count()) > 0 && (await moreShown()), 'Mix again: items and More visible');
    // a new day: a stale saved day resets on load, and a page left open resets when shown again (seeded from the hub: the feed saves its state on pagehide)
    const seed = async day => {
      await p.goto(ROOT + 'hub.html');
      await p.evaluate(day => {
        const d = new Date(), t = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        localStorage.setItem('saa:feed:state', JSON.stringify({ v: 1, day: day || t, today: { answered: 5, right: 3 }, mode: 'mix', domain: 'all' }));
      }, day);
      await p.goto(ROOT); await p.waitForSelector('.flist > .fitem[data-key]');
    };
    await seed('2000-01-01');
    check((await counter()) === 'today 0 · 0 right', 'saved yesterday → counter resets on load: ' + (await counter()));
    await seed(null);
    const c0 = await counter();
    const tile = () => p.evaluate(() => document.querySelector('.feed .stats .stat b').textContent);
    await p.evaluate(() => { window.__dOff = 86400000; document.dispatchEvent(new Event('visibilitychange')); });
    const c1 = await counter(), t1 = await tile();
    const pq = p.locator('.flist > .fitem[data-key="' + (await p.locator('.flist > .fitem[data-kind="pair"]').filter({ has: p.locator('button', { hasText: /^Pick one$/ }) }).first().getAttribute('data-key')) + '"]');
    await pq.locator('button.qcbtn').first().click(); await pq.locator('button.btn', { hasText: /^Check$/ }).click(); await p.waitForTimeout(100);
    const c2 = await counter();
    await p.evaluate(() => { window.__dOff = 2 * 86400000; window.dispatchEvent(new Event('pageshow')); });
    const c3 = await counter();
    check(c0 === 'today 5 · 3 right' && c1 === 'today 0 · 0 right' && t1 === '0' && /^today 1 · /.test(c2) && c3 === 'today 0 · 0 right', 'open across midnight: ' + c0 + ' → visible again: ' + c1 + ' (tile ' + t1 + '); ' + c2 + ' → pageshow next day: ' + c3);
    errs.length ? bad('console errors: ' + errs.join(' | ')) : ok('zero console errors');
    await ctx.close();
  }
  await b.close();
  console.log(fail.length ? '\nFAILED ' + fail.length : '\nALL PASS');
})();
