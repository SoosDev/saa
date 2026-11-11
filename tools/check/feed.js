/* The feed at the site root: bites (a plain-language read, then 3-5 questions answered in place).
   node feed.js   (ROOT=... for another server). 1440x900 and 390x844, light and dark; then once: v1 state
   migration and the day rolling over. Prints ALL PASS or FAILED n on the last line; sets no exit code. */
const { chromium } = require('playwright');
const ROOT = process.env.ROOT || 'http://localhost:8765/';
const fail = []; const ok = m => console.log('  ✓ ' + m); const bad = m => { console.log('  ✕ ' + m); fail.push(m); };
const check = (cond, m) => (cond ? ok(m) : bad(m));
const BITE = '.flist > .fitem[data-key]';
(async () => {
  const b = await chromium.launch();
  /* page helpers shared by every context */
  const kit = p => {
    const items = () => p.evaluate(sel => Array.from(document.querySelectorAll(sel)).map(e => ({ key: e.dataset.key, sid: e.dataset.sid })), BITE);
    const toBottom = async () => { await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(350); };
    const chip = async v => { await p.locator('.feed button[data-domain="' + v + '"]').click(); await p.waitForTimeout(200); };
    const counter = () => p.locator('.fcount').innerText();
    const bite = key => p.locator(BITE + '[data-key="' + key + '"]').first();
    const qcard = (key, qid) => bite(key).locator('.card[data-q="' + qid + '"]');
    /* the right option texts of one question, read from SAA_BITES and rendered the way the feed renders them */
    const rightTexts = (key, qid) => p.evaluate(([key, qid]) => {
      const txt = t => { const e = document.createElement('span'); SAA.md(t).forEach(n => e.append(n)); return e.textContent; };
      return SAA_BITES.find(x => x.id === key).qs.find(x => x.id === qid).opts.filter(o => o.ok).map(o => txt(o.t));
    }, [key, qid]);
    const answer = async (key, qid, right) => {
      const want = await rightTexts(key, qid);
      const opts = qcard(key, qid).locator('button.opt'), n = await opts.count();
      let picked = 0;
      for (let i = 0; i < n; i++) {
        const t = await opts.nth(i).locator('.otxt').textContent();
        if (right ? want.includes(t) : !want.includes(t) && !picked) { await opts.nth(i).click(); picked++; if (!right) break; }
      }
      if (!right) for (let i = 1; i < want.length; i++) { /* multiple response: fill the remaining picks with right ones */
        for (let j = 0; j < n; j++) { const o = opts.nth(j); if ((await o.getAttribute('aria-pressed')) !== 'true' && want.includes(await o.locator('.otxt').textContent())) { await o.click(); break; } }
      }
      await qcard(key, qid).locator('button.btn', { hasText: /^Check$/ }).click(); await p.waitForTimeout(120);
    };
    return { items, toBottom, chip, counter, bite, qcard, answer };
  };
  const listen = p => { const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); return errs; };

  for (const dark of [false, true]) for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const tag = vp.width + (dark ? ' dark' : ' light');
    console.log('== ' + tag);
    const ctx = await b.newContext({ viewport: vp, colorScheme: dark ? 'dark' : 'light' });
    const p = await ctx.newPage();
    const errs = listen(p);
    const { items, toBottom, chip, counter, bite, qcard, answer } = kit(p);
    const noScroll = async where => { const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > vp.width) bad(where + ' horizontal scroll ' + sw); };

    // 1. fonts
    await p.goto(ROOT); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    const fonts = await p.evaluate(() => [document.fonts.check('800 20px Overpass'), document.fonts.check('16px "Atkinson Hyperlegible"'), document.fonts.check('14px "Overpass Mono"')]);
    check(fonts.every(Boolean), 'feed fonts ' + fonts);
    // 2. first batch: bites with a title, a read and 3-5 questions
    await p.waitForFunction(() => document.documentElement.dataset.feedDone === '1', null, { timeout: 15000 });
    const shape = await p.evaluate(sel => Array.from(document.querySelectorAll(sel)).map(e => ({
      title: !!(e.querySelector(':scope > .card h2.step') || {}).textContent, read: !!(e.querySelector(':scope > .card p.scen') || {}).textContent, qs: e.querySelectorAll(':scope > .card[data-q]').length })), BITE);
    check(shape.length >= 3 && shape.every(x => x.title && x.read && x.qs >= 3 && x.qs <= 5), 'first batch: ' + shape.length + ' bites, each a title, a read and 3-5 questions (' + shape.map(x => x.qs).join(',') + ')');
    await noScroll('feed first paint');
    // 3. every bite is on the page; every written session has its minimum
    const cov = await p.evaluate(() => {
      const live = (window.SAA_SESSIONS || []).filter(sx => sx.path && !sx.soon);
      return { attr: document.documentElement.dataset.feedBites, n: (window.SAA_BITES || []).length, thin: live.filter(sx => window.SAA_BITES.filter(x => x.sid === sx.id).length < 4).map(sx => sx.id) };
    });
    check(cov.attr === String(cov.n) && cov.n > 0, 'data-feed-bites = SAA_BITES.length (' + cov.attr + ' / ' + cov.n + ')');
    check(cov.thin.length === 0, 'every written session has at least 4 bites' + (cov.thin.length ? ': short ' + cov.thin.join(', ') : ''));
    // 4. infinite scroll
    let prev = (await items()).length, grew = 0;
    for (let i = 0; i < 3; i++) { await toBottom(); const n = (await items()).length; if (n > prev) grew++; prev = n; await noScroll('after scroll ' + (i + 1)); }
    check(grew === 3, 'scrolling to the bottom adds bites 3 times (' + prev + ' bites)');
    // 5. nothing revealed before Check; Check needs a pick
    await p.evaluate(() => window.scrollTo(0, 0));
    const pre = await p.evaluate(() => ({ why: document.querySelectorAll('.flist .why').length, mark: document.querySelectorAll('.flist mark').length }));
    check(pre.why === 0 && pre.mark === 0, 'no why and no highlight anywhere before Check (' + pre.why + ' / ' + pre.mark + ')');
    const k0 = (await items())[0].key;
    const qids = await p.evaluate(k => SAA_BITES.find(x => x.id === k).qs.map(q => q.id), k0);
    const btn0 = qcard(k0, qids[0]).locator('button.btn').first();
    const before = { dis: await btn0.isDisabled(), t: await btn0.innerText() };
    const multi = await p.evaluate(([k, q]) => SAA_BITES.find(x => x.id === k).qs.find(x => x.id === q).opts.filter(o => o.ok).length > 1, [k0, qids[0]]);
    await qcard(k0, qids[0]).locator('button.opt').first().click();
    const after = { dis: await btn0.isDisabled(), t: await btn0.innerText(), why: await qcard(k0, qids[0]).locator('.why').count() };
    check(before.dis && /^Pick/.test(before.t) && (multi ? after.dis : !after.dis && after.t === 'Check') && after.why === 0, 'Check is disabled until a pick: "' + before.t + '" → "' + after.t + '", still no why');
    await qcard(k0, qids[0]).locator('button.opt[aria-pressed="true"]').first().click(); // un-pick; answer() makes the picks
    // 6. answered wrong
    const q0 = qcard(k0, qids[0]);
    await answer(k0, qids[0], false);
    const nOpt = await q0.locator('.opt').count(), nWhy = await q0.locator('.opt .why').count();
    check((await q0.locator('.opt.correct').count()) >= 1 && (await q0.locator('.opt.wrong').count()) === 1 && (await q0.locator('h3.step').innerText()) === 'Where it broke', 'answered wrong: the answer and the wrong pick are marked (' + k0 + ':' + qids[0] + ')');
    check(nOpt >= 4 && nWhy === nOpt, 'every option shows its why (' + nWhy + '/' + nOpt + ')');
    check((await q0.locator('mark').count()) > 0, 'deciding words marked after Check');
    check((await counter()) === 'today 1 · 0 right', 'header counter: ' + (await counter()));
    // 7. the feed's own record, and no session key
    const rec = await p.evaluate(([k, q]) => { const r = JSON.parse(localStorage.getItem('saa:feed:bites') || '{}'); return r[k] && r[k].q && r[k].q[q]; }, [k0, qids[0]]);
    check(rec && rec.ok === false && rec.n === 1 && typeof rec.at === 'number', 'saa:feed:bites[' + k0 + '].q[' + qids[0] + '] = ' + JSON.stringify(rec));
    const keys = await p.evaluate(() => Object.keys(localStorage));
    check(keys.every(k => ['saa:feed:state', 'saa:feed:bites', 'saa:theme'].includes(k)), 'localStorage holds only feed keys: ' + keys.join(', '));
    // 8. answered right; the whole bite answered → its score
    await answer(k0, qids[1], true);
    check((await counter()) === 'today 2 · 1 right', 'answered right: ' + (await counter()));
    for (const q of qids.slice(2)) await answer(k0, q, true);
    const score = await bite(k0).locator('.ffoot .fscore').innerText();
    check(score === (qids.length - 1) + ' of ' + qids.length + ' right', 'every question answered → footer: ' + score);
    // 9. fresh browsers: interleaved, random, rounds without repeats
    const fresh = [];
    for (let i = 0; i < 2; i++) {
      const c2 = await b.newContext({ viewport: vp, colorScheme: dark ? 'dark' : 'light' });
      const p2 = await c2.newPage();
      await p2.goto(ROOT); await p2.waitForFunction(() => document.documentElement.dataset.feedDone === '1');
      if (!i) {
        await p2.evaluate(() => { const more = Array.from(document.querySelectorAll('.feed button')).find(x => x.textContent === 'More'); for (let j = 0; j < 40 && document.querySelectorAll('.flist > .fitem[data-key]').length <= SAA_BITES.length; j++) more.click(); });
      } else await p2.evaluate(() => { const more = Array.from(document.querySelectorAll('.feed button')).find(x => x.textContent === 'More'); more.click(); more.click(); });
      fresh.push(await p2.evaluate(() => {
        const seq = Array.from(document.querySelectorAll('.flist > .fitem')).map(e => e.dataset.kind === 'round' ? '|' : e.dataset.key ? e.dataset.key + ' ' + e.dataset.sid : null).filter(Boolean);
        return { seq, n: SAA_BITES.length, sessions: new Set(SAA_BITES.map(x => x.sid)).size };
      }));
      await c2.close();
    }
    const f0 = fresh[0], bites0 = f0.seq.filter(x => x !== '|');
    const nine = Math.min(9, f0.sessions);
    check(new Set(bites0.slice(0, nine).map(x => x.split(' ')[1])).size === nine, 'fresh browser: the first ' + nine + ' bites come from ' + nine + ' different sessions');
    check(bites0.slice(0, 6).join() !== fresh[1].seq.filter(x => x !== '|').slice(0, 6).join(), 'two fresh browsers give a different first-six order');
    const rounds = f0.seq.join('\n').split('|').map(r => r.split('\n').filter(Boolean).map(x => x.split(' ')[0]));
    check(rounds.length >= 2 && rounds[0].length === f0.n && rounds.every(r => new Set(r).size === r.length), 'More past ' + f0.n + ' bites: a round marker after all ' + rounds[0].length + ', no bite twice inside a round');
    // 10. each domain chip
    await p.evaluate(() => window.scrollTo(0, 0));
    for (const D of ['D1', 'D2', 'D3', 'D4']) {
      await chip(D);
      const doms = await p.evaluate(sel => Array.from(document.querySelectorAll(sel + ' > .fhead .mono')).map(e => e.textContent), BITE);
      check(doms.length > 0 && doms.every(t => t.split(' ').includes(D)), D + ': ' + doms.length + ' bites, all tagged ' + D);
    }
    // 11. reload: counter and domain chip survive; then every never-seen bite comes before every seen one
    const D0 = await p.evaluate(k => SAA_BITES.find(x => x.id === k).domains[0], k0);
    await chip(D0);
    const c0 = await counter();
    await p.reload(); await p.waitForFunction(() => document.documentElement.dataset.feedDone === '1');
    check((await counter()) === c0, 'counter survives reload: ' + (await counter()));
    const pressed = await p.evaluate(() => Array.from(document.querySelectorAll('.feed button[aria-pressed="true"]')).map(x => x.dataset.domain));
    check(pressed.length === 1 && pressed[0] === D0, 'domain chip restored: ' + pressed.join(','));
    /* a second bite seen through the feed's own path (an answer), besides k0 and whatever scrolled past in 4 */
    await p.evaluate(() => window.scrollTo(0, 0));
    const k2 = ((await items()).find(x => x.key !== k0) || {}).key;
    if (k2) await answer(k2, await p.evaluate(k => SAA_BITES.find(x => x.id === k).qs[0].id, k2), true);
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
    const seenIds = await p.evaluate(() => { const r = JSON.parse(localStorage.getItem('saa:feed:bites') || '{}'); return SAA_BITES.filter(x => r[x.id] && r[x.id].seen).map(x => x.id); });
    await chip('all'); /* rebuilds the queue from the records just read */
    await p.evaluate(() => { const more = Array.from(document.querySelectorAll('.feed button')).find(x => x.textContent === 'More'); for (let j = 0; j < 40 && !document.querySelector('.flist > .fitem[data-kind="round"]'); j++) more.click(); });
    const order = await p.evaluate(() => { const out = []; for (const e of document.querySelectorAll('.flist > .fitem')) { if (e.dataset.kind === 'round') break; if (e.dataset.key) out.push(e.dataset.key); } return out; });
    const nAll = await p.evaluate(() => SAA_BITES.length);
    const isSeen = k => seenIds.includes(k);
    const lastUnseen = Math.max(...order.map((k, i) => (isSeen(k) ? -1 : i))), firstSeen = order.findIndex(isSeen);
    check(k2 && seenIds.includes(k0) && seenIds.includes(k2) && seenIds.length < nAll && order.length === nAll && firstSeen > lastUnseen,
      'after reload all ' + (nAll - seenIds.length) + ' never-seen bites come before all ' + seenIds.length + ' seen ones (' + k0 + ', ' + k2 + ' among them; last unseen at ' + lastUnseen + ', first seen at ' + firstSeen + ' of ' + order.length + ')');
    // 12. theme
    const bg0 = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const th0 = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await p.locator('.hdr .tbtn').click(); await p.waitForTimeout(100);
    const bg1 = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const th1 = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
    check(th1 && th1 !== th0 && bg1 !== bg0, 'theme button: ' + th0 + ' → ' + th1 + ', background changes');
    await p.locator('.hdr .tbtn').click(); await p.waitForTimeout(100);
    // 13. tap targets on the phone, with a question answered wrong (Try again visible)
    if (vp.width < 500) {
      await p.evaluate(() => window.scrollTo(0, 0));
      const k1 = (await items())[0].key;
      const q1 = await p.evaluate(k => SAA_BITES.find(x => x.id === k).qs[0].id, k1);
      await answer(k1, q1, false);
      const tt = await p.evaluate(() => {
        const els = Array.from(document.querySelectorAll('.feed button, .feed a.btn, .feed .chip, .feed .ffoot a, .hdr button, .hdr a')).filter(e => e.offsetParent !== null);
        return { again: els.filter(e => e.textContent === 'Try again').length, small: els.map(e => [e.textContent.trim().slice(0, 30), Math.round(e.getBoundingClientRect().height)]).filter(([, hh]) => hh < 44) };
      });
      check(tt.again >= 1, 'measured with ' + tt.again + ' Try again visible');
      check(tt.small.length === 0, 'tap targets ≥ 44px' + (tt.small.length ? ': ' + JSON.stringify(tt.small.slice(0, 6)) : ''));
      const hh = await p.evaluate(() => document.querySelector('.hdr').getBoundingClientRect().height);
      check(hh === 56, 'phone header 56px (' + hh + ')');
    }
    // 14. links: into the lesson, every footer target answers 200, the hub and back
    await p.evaluate(() => window.scrollTo(0, 0));
    const hrefs = await p.evaluate(() => Array.from(document.querySelectorAll('.flist .ffoot a')).map(a => ({ raw: a.getAttribute('href'), abs: a.href })));
    const pages = Array.from(new Set(hrefs.map(l => { const u = new URL(l.abs); return u.origin + u.pathname; })));
    const st = [];
    for (const u of pages) st.push([u, (await p.request.get(u)).status()]);
    check(hrefs.length > 0 && hrefs.every(l => !l.raw.startsWith('/') && /^sessions\/\d\d-[\w-]+\/#(learn\/ch\d+|drill)$/.test(l.raw)) && st.every(([, s]) => s === 200),
      hrefs.length + ' footer links, relative, ' + pages.length + ' pages answer 200' + (st.some(([, s]) => s !== 200) ? ': ' + JSON.stringify(st.filter(([, s]) => s !== 200)) : ''));
    const first = p.locator(BITE).first();
    const lesson = first.locator('.ffoot a', { hasText: /^Full lesson/ }).first();
    const lh = await lesson.getAttribute('href');
    check(/^sessions\/\d\d-[\w-]+\/#learn\/ch\d+$/.test(lh || ''), 'Full lesson link: ' + lh);
    await lesson.click();
    await p.waitForSelector('.chapter > h1'); await p.waitForTimeout(150);
    const chk = await p.evaluate(() => { const id = location.hash.split('/')[1]; const ch = (window.SESSION.learn || []).find(c => c.id === id); return { want: ch && ch.title.replace(/\*\*|`/g, ''), got: document.querySelector('.chapter > h1').textContent }; });
    check(chk.want && chk.got === chk.want, 'it opens that chapter: ' + chk.got);
    await p.goBack(); await p.waitForSelector(BITE);
    await p.locator('.hdr a.hlink', { hasText: 'Sessions' }).click();
    await p.waitForSelector('a.scard');
    const nCards = await p.locator('a.scard').count();
    check(p.url().endsWith('hub.html') && nCards >= 8, 'Sessions → hub.html with ' + nCards + ' session cards');
    await p.locator('.hdr a.hlink', { hasText: 'Feed' }).click(); await p.waitForSelector(BITE);
    check(/\/$/.test(p.url()), 'hub → Feed lands on the root');
    // 15. the old feed is gone
    const old = await p.evaluate(() => document.querySelectorAll('.fitem[data-kind="card"], .fitem[data-kind="pair"], .fitem[data-kind="read"], .fitem[data-kind="quiz"], [data-mode]').length);
    check(old === 0, 'no card, pair, read or quiz items and no mode chips (' + old + ')');
    // 16. console
    errs.length ? bad('console errors: ' + errs.join(' | ')) : ok('zero console errors');
    await ctx.close();
  }
  {
    // 17. once: v1 state migrates; the day rolls over on load and while open
    console.log('== migration, new day (1440 light)');
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => {
      const RD = Date; window.__dOff = 0;
      window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + window.__dOff); } static now() { return RD.now() + window.__dOff; } };
    });
    const p = await ctx.newPage();
    const errs = listen(p);
    const { chip, counter, answer } = kit(p);
    const DRILL = JSON.stringify({ B1: { ok: false, n: 2, ever: true, tag: 'C', at: 1760000000000 } });
    /* seeded from the hub: the feed saves its state on pagehide */
    const seed = async (day, extra) => {
      await p.goto(ROOT + 'hub.html');
      await p.evaluate(([day, extra, drill]) => {
        localStorage.clear();
        const d = new Date(), t = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        localStorage.setItem('saa:feed:state', JSON.stringify(Object.assign({ v: 1, day: day || t, today: { answered: 5, right: 3 }, streak: { n: 4, last: day || t }, mode: 'mix', domain: 'all' }, extra)));
        localStorage.setItem('saa:08-databases:drill', drill);
      }, [day, extra || {}, DRILL]);
      await p.goto(ROOT); await p.waitForFunction(() => document.documentElement.dataset.feedDone === '1');
    };
    await seed(null, { seen: { '08-databases|drill|B1': 1760000000000, '01-storage|line|datasync': 1760000000000 }, last: { '08-databases': 1760000000000 }, mode: 'cards', domain: 'D2' });
    const c0 = await counter();
    const pressed = await p.evaluate(() => Array.from(document.querySelectorAll('.feed button[aria-pressed="true"]')).map(x => x.dataset.domain));
    const streak = await p.evaluate(() => document.querySelectorAll('.feed .stats .stat b')[2].textContent);
    await p.goto(ROOT + 'hub.html');
    const saved = await p.evaluate(() => ({ st: JSON.parse(localStorage.getItem('saa:feed:state')), drill: localStorage.getItem('saa:08-databases:drill') }));
    check(c0 === 'today 5 · 3 right' && pressed.join() === 'D2' && streak === '4', 'v1 state: counter ' + c0 + ', chip ' + pressed.join(',') + ', streak ' + streak);
    check(saved.st && saved.st.v === 2 && !('seen' in saved.st) && !('last' in saved.st) && !('mode' in saved.st) && saved.st.today.answered === 5 && saved.st.domain === 'D2', 'saved as v2 without seen, last or mode: ' + JSON.stringify(saved.st));
    check(saved.drill === DRILL, 'saa:08-databases:drill is byte-identical');
    await seed('2000-01-01');
    check((await counter()) === 'today 0 · 0 right', 'saved yesterday → counter resets on load: ' + (await counter()));
    await seed(null);
    const d0 = await counter();
    const tile = () => p.evaluate(() => document.querySelector('.feed .stats .stat b').textContent);
    await p.evaluate(() => { window.__dOff = 86400000; document.dispatchEvent(new Event('visibilitychange')); });
    const d1 = await counter(), t1 = await tile();
    await chip('all');
    const k = await p.evaluate(() => document.querySelector('.flist > .fitem[data-key]').dataset.key);
    const q = await p.evaluate(k => SAA_BITES.find(x => x.id === k).qs[0].id, k);
    await answer(k, q, true);
    const d2 = await counter();
    await p.evaluate(() => { window.__dOff = 2 * 86400000; window.dispatchEvent(new Event('pageshow')); });
    const d3 = await counter();
    check(d0 === 'today 5 · 3 right' && d1 === 'today 0 · 0 right' && t1 === '0' && d2 === 'today 1 · 1 right' && d3 === 'today 0 · 0 right', 'open across midnight: ' + d0 + ' → visible again: ' + d1 + ' (tile ' + t1 + '); ' + d2 + ' → pageshow next day: ' + d3);
    errs.length ? bad('console errors: ' + errs.join(' | ')) : ok('zero console errors');
    await ctx.close();
  }
  await b.close();
  console.log(fail.length ? '\nFAILED ' + fail.length : '\nALL PASS');
})();
