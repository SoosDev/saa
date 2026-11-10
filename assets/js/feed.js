/* SAA Transit Maps — the feed (site root).
   One interleaved stream over the sessions' own data: exam-style questions answered in place,
   trigger cards on their Leitner schedule, and short reads (lines, traps, "changed since the
   exam guide" callouts, memory hooks). The feed has no content of its own: every item is derived
   at runtime from sessions/NN-name/{core,drills,cards,learn}.js, loaded one session at a time.
   Answers write the session's own records through SAA.rec (saa:<sid>:drill / :check / :cards);
   the feed's own state is the one key saa:feed:state. */
(function () {
  'use strict';
  const SAA = window.SAA;
  const { h, md, P, clear, store, eyebrow, color, lineVars, callout, shuffle } = SAA;
  const KEY = 'saa:feed:state';
  const FILES = ['core.js', 'drills.js', 'cards.js', 'learn.js']; // widgets.js is never loaded: the feed renders no widgets
  const BATCH = 6, MARK_EVERY = 10, RECENT = 10 * 60000;
  const DOMS = ['D1', 'D2', 'D3', 'D4'];
  const MODES = [['mix', 'Mix'], ['questions', 'Questions'], ['cards', 'Cards'], ['reading', 'Reading']];
  /* four of every six Mix slots need a commit before anything is revealed */
  const RHYTHM = { mix: ['read', 'quiz', 'card', 'quiz', 'read', 'pair'], questions: ['quiz', 'quiz', 'pair', 'quiz', 'quiz', 'pair'], cards: ['card'], reading: ['read'] };
  const FALLBACK = {
    mix: { read: ['quiz', 'pair', 'card'], quiz: ['pair', 'card', 'read'], card: ['quiz', 'pair', 'read'], pair: ['quiz', 'card', 'read'] },
    questions: { quiz: ['pair'], pair: ['quiz'] }, cards: { card: [] }, reading: { read: [] }
  };
  const phone = () => window.matchMedia('(max-width:760px)').matches;

  /* ================= state: saa:feed:state ================= */
  const dayStr = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = () => dayStr(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); };
  function loadState() {
    const raw = store.get(KEY, null);
    const st = raw && typeof raw === 'object' && raw.v === 1 ? raw : { v: 1 };
    if (!st.today || typeof st.today !== 'object') st.today = { answered: 0, right: 0 };
    if (!st.streak || typeof st.streak !== 'object') st.streak = { n: 0, last: null };
    if (!st.seen || typeof st.seen !== 'object') st.seen = {};
    if (!st.last || typeof st.last !== 'object') st.last = {};
    if (!MODES.some(m => m[0] === st.mode)) st.mode = 'mix';
    if (st.domain !== 'all' && !DOMS.includes(st.domain)) st.domain = 'all';
    rollDay(st);
    return st;
  }
  function rollDay(st) { const t = today(); if (st.day !== t) { st.day = t; st.today = { answered: 0, right: 0 }; } }
  let st = null;
  const save = () => store.set(KEY, st);
  const streakNow = () => (st.streak.last === today() || st.streak.last === yesterday() ? st.streak.n : 0);

  /* ================= session loader (strictly sequential: every file writes window.SESSION) ================= */
  const DATA = (SAA.feedData = {});
  function loadScript(src) {
    return new Promise((res, rej) => {
      const el = document.createElement('script');
      el.src = src;
      el.onload = () => res();
      el.onerror = () => rej(new Error('failed to load ' + src));
      document.head.appendChild(el);
    });
  }
  async function loadSession(sx) {
    window.SESSION = {};
    try {
      for (const f of FILES) await loadScript(sx.path + f);
      DATA[sx.id] = window.SESSION;
      return window.SESSION;
    } finally { delete window.SESSION; }
  }
  const idle = fn => ('requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 400 }) : setTimeout(fn, 60));

  /* ================= items: derived from session data, nothing written back ================= */
  const ITEMS = {}; // sid -> { quiz:[], pair:[], card:[], read:[] }
  const parseD = t => Array.from(new Set(String(t || '').match(/D[1-4]/g) || [])).sort();
  const union = sets => Array.from(new Set([].concat(...sets))).sort();
  function derive(sx, S) {
    const sid = sx.id;
    const sessD = parseD(sx.domains).length ? parseD(sx.domains) : DOMS.slice();
    const or = d => (d.length ? d : sessD);
    const chapters = S.learn || [], drills = S.drills || [];
    const drillD = {}, drillCh = {}, pairCh = {};
    chapters.forEach(ch => {
      const cd = parseD(ch.domains);
      const tie = id => { drillD[id] = union([drillD[id] || [], cd]); if (!drillCh[id]) drillCh[id] = ch; };
      (ch.blocks || []).forEach(b => {
        if (!b || typeof b !== 'object') return;
        if (b.drills) b.drills.forEach(tie);
        if (b.check && /^ck-/.test(b.check.id || '')) tie(b.check.id.slice(3));
        if (b.pair && !pairCh[b.pair]) pairCh[b.pair] = ch;
      });
    });
    const lineD = {};
    drills.forEach(d => { lineD[d.line] = union([lineD[d.line] || [], drillD[d.id] || []]); });
    const out = { quiz: [], pair: [], card: [], read: [] };
    const base = (kind, sub, local, dom, extra) => Object.assign({ key: sid + '|' + sub + '|' + local, kind, sub, sid, sx, S, dom }, extra);

    drills.forEach(d => out.quiz.push(base('quiz', 'drill', d.id, or(drillD[d.id] || []), {
      id: d.id, rkey: d.id, q: d.q, opts: d.opts.map(o => ({ t: o.t, ok: !!o.ok, why: o.why })), expl: d.expl, words: d.words,
      src: d.src, mine: !!d.mine, update: d.update, line: d.line, ch: drillCh[d.id] || null
    })));
    chapters.forEach(ch => (ch.blocks || []).forEach((b, i) => {
      if (!b || typeof b !== 'object') return;
      const cd = or(parseD(ch.domains));
      const local = ch.id + '.' + i;
      if (b.check && !/^ck-/.test(b.check.id || '')) {
        const cp = b.check, ans = Array.isArray(cp.a) ? cp.a : [cp.a];
        out.quiz.push(base('quiz', 'check', cp.id || local, cd, {
          id: cp.id || local, rkey: cp.id || local, q: cp.q, expl: cp.why, words: null, src: cp.src, mine: false, ch,
          opts: cp.opts.map((o, j) => (typeof o === 'string' ? { t: o, ok: ans.includes(j) } : { t: o.t, ok: ans.includes(j), why: o.why }))
        }));
      } else if (b.callout && b.kind === 'update') out.read.push(base('read', 'update', local, cd, { text: b.callout, title: b.title, ch }));
      else if (b.hooks) out.read.push(base('read', 'hooks', local, cd, { hooks: b.hooks, label: b.label, ch }));
    }));
    (S.compare || []).filter(pr => pr.check).forEach(pr => {
      const ch = pairCh[pr.id] || null;
      out.pair.push(base('pair', 'pair', pr.id, or(ch ? parseD(ch.domains) : []), { pr, ch }));
    });
    (S.cards || []).forEach(c => out.card.push(base('card', 'card', c.id, or(lineD[c.line] || []), { c })));
    (S.lines || []).forEach(L => out.read.push(base('read', 'line', L.id, or(lineD[L.id] || []), {
      L, ties: drills.filter(d => d.line === L.id).map(d => d.id)
    })));
    (S.traps || []).forEach((t, i) => out.read.push(base('read', 'trap', 't' + i, or(union((t.drills || []).map(id => drillD[id] || []))), {
      t, ties: (t.drills || []).filter(id => drills.some(d => d.id === id))
    })));
    return out;
  }

  /* ================= records (the session's own keys) ================= */
  const rk = (sid, name) => 'saa:' + sid + ':' + name;
  const recOf = it => (store.get(rk(it.sid, it.sub === 'drill' ? 'drill' : 'check'), {}) || {})[it.rkey];
  const cardRec = it => (store.get(rk(it.sid, 'cards'), {}) || {})[it.c.id];
  const isDue = (e, now) => !e || !e.due || e.due <= now;

  /* ================= feed ================= */
  SAA.feed = function () {
    st = loadState();
    const SS = (window.SAA_SESSIONS || []).filter(sx => sx.path && !sx.soon);
    const SOON = (window.SAA_SESSIONS || []).filter(sx => sx.soon);
    const H = window.SAA_HUB || {};
    const DNAME = {};
    ((H.exam && H.exam.domains) || []).forEach(d => { DNAME[d.id] = d.name; });
    const app = document.getElementById('app');
    clear(app);

    /* ---- chrome: hub-style header, no bottom bar (one view) ---- */
    const counter = h('span', { cls: 'fcount', 'aria-live': 'polite' });
    const hdr = h('header', { cls: 'hdr' }, h('div', { cls: 'hdr-in' },
      h('a', { cls: 'brand hide-phone', href: './', text: 'SAA Transit Maps' }),
      h('span', { cls: 'eyebrow hide-phone', text: 'SAA-C03 · Feed' }),
      h('span', { cls: 'fttl', text: 'Feed' }),
      h('div', { cls: 'hdr-r' }, counter, h('a', { cls: 'hlink', href: 'hub.html', text: 'Sessions' }), SAA.themeButton())));
    const feed = h('div', { cls: 'feed' });
    add(app, [hdr, h('main', null, h('div', { cls: 'panel' }, feed))]);
    function add(el, kids) { kids.forEach(k => el.appendChild(k)); }
    const paintCounter = () => { counter.textContent = 'today ' + st.today.answered + ' · ' + st.today.right + ' right'; };
    /* a page left open across midnight starts the new day when it is shown again */
    const wake = () => { const d = st.day; rollDay(st); if (st.day !== d) { save(); paintCounter(); paintToday(); } };
    paintCounter();

    /* ---- today block ---- */
    const todayBox = h('section', { cls: 'stack g12', 'aria-label': 'Today' });
    function paintToday() {
      clear(todayBox);
      let solved = 0, total = 0;
      SS.forEach(sx => { solved += SAA.readProgress(sx.id, { drills: (sx.totals || {}).drills }).drills; total += (sx.totals || {}).drills || 0; });
      todayBox.appendChild(h('h2', { cls: 'step', text: 'Today' }));
      todayBox.appendChild(h('div', { cls: 'stats' },
        [[st.today.answered, 'answered today'], [st.today.right, 'right today'], [streakNow(), streakNow() === 1 ? 'day in a row' : 'days in a row'], [solved + ' / ' + total, 'drills solved on the last try']]
          .map(([a, b]) => h('div', { cls: 'stat' }, h('b', { text: String(a) }), h('span', { text: b })))));
      const grid = h('div', { cls: 'dombar' });
      DOMS.forEach(D => {
        let n = 0, ok = 0;
        Object.keys(ITEMS).forEach(sid => {
          const res = store.get(rk(sid, 'drill'), {}) || {};
          ITEMS[sid].quiz.forEach(it => { if (it.sub === 'drill' && it.dom.includes(D)) { n++; if (res[it.id] && res[it.id].ok) ok++; } });
        });
        grid.appendChild(h('span', { text: D + ' ' + (DNAME[D] || '') }));
        grid.appendChild(h('div', { cls: 'bar', role: 'img', 'aria-label': D + ': ' + ok + ' of ' + n + ' drills solved' }, h('i', { style: { width: (n ? Math.round((ok / n) * 100) : 0) + '%' } })));
        grid.appendChild(h('span', { cls: 'mono', text: ok + ' / ' + n }));
      });
      todayBox.appendChild(h('div', { cls: 'card stack g8' }, h('span', { cls: 'eyebrow sm', text: 'Drills solved by exam domain' }), grid));
    }

    /* ---- filters ---- */
    const modeRow = h('div', { cls: 'chiprow scroll', role: 'group', 'aria-label': 'What to show' });
    const domRow = h('div', { cls: 'chiprow scroll', role: 'group', 'aria-label': 'Exam domain' });
    function paintChips() {
      clear(modeRow); clear(domRow);
      MODES.forEach(([v, t]) => modeRow.appendChild(h('button', { cls: 'chip b', type: 'button', 'aria-pressed': String(st.mode === v), data: { mode: v }, text: t, on: { click: () => { st.mode = v; save(); paintChips(); restart(); } } })));
      [['all', 'All domains']].concat(DOMS.map(D => [D, D + ' ' + (DNAME[D] || '')])).forEach(([v, t]) =>
        domRow.appendChild(h('button', { cls: 'chip b', type: 'button', 'aria-pressed': String(st.domain === v), data: { domain: v }, text: t.trim(), on: { click: () => { st.domain = v; save(); paintChips(); restart(); } } })));
    }
    const ns = SS.map(sx => sx.n);
    const cover = h('p', { cls: 'small muted' }, (ns.length ? 'Sessions ' + Math.min(...ns) + ' to ' + Math.max(...ns) + '. ' : '') +
      (SOON.length ? 'Not written yet: ' + SOON.map(sx => sx.title).join(' · ') + '.' : ''));

    const list = h('div', { cls: 'flist' });
    const sentinel = h('div', { 'aria-hidden': 'true' });
    const moreBtn = h('button', { cls: 'btn ghost', type: 'button', text: 'More', on: { click: () => appendBatch(true) } });
    const failBox = h('div', { cls: 'stack g6' });
    add(feed, [todayBox, h('div', { cls: 'stack g8' }, modeRow, domRow, cover), list, sentinel, h('div', null, moreBtn), failBox]);
    paintToday(); paintChips();

    /* ---- per-load selection state ---- */
    const served = new Set();   // no item twice in one page load (except "Try again"); a filter change returns the untouched ones
    const t0 = Date.now();
    const rot = [];             // session rotation, per-load shuffled
    let ptr = 0, slot = 0, count = 0, ended = false, batches = 0, tie = null, loadingDone = false;
    const sitting = { answered: 0, right: 0 }, markBase = { answered: 0, right: 0 };
    const inDomain = it => st.domain === 'all' || it.dom.includes(st.domain);
    const inS = (it, fn, el) => function () { SAA.useLines(it.S.lines); const r = fn.apply(this, arguments); if (el) rebase(el, it.sx); return r; };
    /* links in session markup are relative to the session page; the feed sits at the site root */
    const rootUrl = new URL('./', location.href).href;
    const rebased = new WeakSet();
    function rebase(el, sx) {
      el.querySelectorAll('a[href]').forEach(a => {
        if (rebased.has(a)) return;
        rebased.add(a);
        const raw = a.getAttribute('href');
        if (/^([a-z][\w+.-]*:|\/)/i.test(raw)) return;
        const u = new URL(raw, new URL(sx.path, rootUrl)).href;
        if (u.startsWith(rootUrl)) a.setAttribute('href', u.slice(rootUrl.length) || './');
      });
    }

    function rankQuiz(cands, now) {
      const tier = it => {
        const r = recOf(it), at = Math.max((r && r.at) || 0, st.seen[it.key] || 0);
        if (at && now - at < RECENT) return [4, at];
        if (r && r.ok === false) return [0, 0];
        if (it.mine && !(r && r.ok)) return [1, 0];
        if (!r) return [2, 0];
        return [3, at];
      };
      return shuffle(cands).map(it => ({ it, t: tier(it) })).sort((a, b) => a.t[0] - b.t[0] || a.t[1] - b.t[1]).map(x => x.it);
    }
    function candidates(sid, kind, now) {
      const pool = ITEMS[sid] ? ITEMS[sid][kind] : [];
      let c = pool.filter(it => !served.has(it.key) && inDomain(it));
      if (kind === 'quiz') return rankQuiz(c, now);
      if (kind === 'card') {
        const m = store.get(rk(sid, 'cards'), {}) || {};
        c = c.filter(it => isDue(m[it.c.id], now));
        return shuffle(c).sort((a, b) => ((m[a.c.id] || {}).box || 1) - ((m[b.c.id] || {}).box || 1));
      }
      return shuffle(c).sort((a, b) => (st.seen[a.key] || 0) - (st.seen[b.key] || 0));
    }
    function pickKind(kind) {
      const now = Date.now();
      if (kind === 'quiz' && tie) {
        const t = tie; tie = null;
        const pool = (ITEMS[t.sid] || { quiz: [] }).quiz.filter(it => it.sub === 'drill' && t.ids.includes(it.id) && !served.has(it.key) && inDomain(it));
        const open = rankQuiz(pool, now).filter(it => { const r = recOf(it); return !(r && r.ok) && !(st.seen[it.key] && now - st.seen[it.key] < RECENT); });
        if (open.length) return open[0];
      }
      for (let j = 0; j < rot.length; j++) {
        const sid = rot[(ptr + j) % rot.length];
        const c = candidates(sid, kind, now);
        if (c.length) { ptr = (ptr + j + 1) % rot.length; return c[0]; }
      }
      return null;
    }
    function pick(kind) {
      for (const k of [kind].concat((FALLBACK[st.mode] || {})[kind] || [])) { const it = pickKind(k); if (it) return it; }
      return null;
    }

    function appendBatch(force) {
      if (ended || !rot.length) return;
      if (!force && !loadingDone && batches >= rot.length) return; // while sessions arrive, one batch per loaded session keeps the mix interleaved
      const rh = RHYTHM[st.mode];
      for (let i = 0; i < BATCH; i++) {
        const it = pick(rh[slot++ % rh.length]);
        if (!it) { ended = true; list.appendChild(endItem()); break; }
        served.add(it.key);
        if (it.ties && it.ties.length) tie = { sid: it.sid, ids: it.ties };
        list.appendChild(render(it));
        if (++count % MARK_EVERY === 0) list.appendChild(marker());
      }
      batches++;
      moreBtn.hidden = ended;
      recheck();
    }
    function unEnd() {
      if (!ended) return;
      ended = false; moreBtn.hidden = false;
      const last = list.lastChild;
      if (last && last.dataset.kind === 'end') list.removeChild(last);
    }
    function restart() {
      clear(list);
      served.forEach(k => { if (!((st.seen[k] || 0) >= t0)) served.delete(k); });
      ended = false; moreBtn.hidden = false;
      ptr = 0; slot = 0; count = 0; batches = 0; tie = null;
      appendBatch(true);
    }

    /* infinite scroll: the sentinel within 600px of the viewport adds a batch; "More" is the keyboard path */
    let io = null;
    const recheck = () => { if (io) { io.unobserve(sentinel); io.observe(sentinel); } };
    if ('IntersectionObserver' in window) io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) appendBatch(false); }, { rootMargin: '0px 0px 600px 0px' });
    /* read items count as seen once they have scrolled above the viewport */
    const seenIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting && e.boundingClientRect.bottom < 0) {
        const k = e.target.dataset.key; st.seen[k] = Date.now(); st.last[e.target.dataset.sid] = Date.now(); save(); seenIO.unobserve(e.target);
      }
    })) : null;
    const markIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && e.target._paint) { e.target._paint(true); markIO.unobserve(e.target); }
    })) : null;

    /* an answer: counters, streak, seen; the session record is written by the item itself */
    function answered(it, ok) {
      rollDay(st);
      st.today.answered++; if (ok) st.today.right++;
      sitting.answered++; if (ok) sitting.right++;
      const t = today();
      if (st.streak.last !== t) { st.streak.n = st.streak.last === yesterday() ? (st.streak.n || 0) + 1 : 1; st.streak.last = t; }
      st.seen[it.key] = Date.now(); st.last[it.sid] = Date.now();
      save(); paintCounter(); paintToday();
    }

    /* ================= item components (existing components only) ================= */
    const sessLabel = it => 'Session ' + it.sx.n;
    const chLabel = ch => ch ? ch.title : null;
    function shell(it, label, body, links) {
      rebase(body, it.sx);
      const el = h('article', { cls: 'fitem', data: { key: it.key, kind: it.kind, sub: it.sub, sid: it.sid } },
        h('div', { cls: 'fhead' }, eyebrow(label, 'sm'), h('span', { cls: 'mono', text: it.dom.join(' ') })),
        body,
        links && links.length ? h('div', { cls: 'ffoot' }, links.map(([t, href]) => h('a', { href, text: t }))) : null);
      if (it.kind === 'read' && seenIO) seenIO.observe(el);
      return el;
    }
    function render(it) {
      SAA.useLines(it.S.lines);
      return ({ drill: quizItem, check: quizItem, pair: pairItem, card: cardItem, line: lineItem, trap: trapItem, update: updateItem, hooks: hooksItem })[it.sub](it);
    }
    const chLink = it => (it.ch ? [['Chapter: ' + chLabel(it.ch), it.sx.path + '#learn/' + it.ch.id]] : []);

    /* question: pick, then Check (two taps on purpose: a scrolling thumb must not commit an answer) */
    function quizItem(it) {
      const opts = it.opts, need = opts.filter(o => o.ok).length;
      const prev = recOf(it);
      let order = shuffle(opts.map((o, i) => i)), picks = new Set(), done = false, ok = false;
      const box = h('div', { cls: 'card stack g10' });
      const submit = inS(it, () => {
        ok = picks.size === need && opts.every((o, i) => !o.ok || picks.has(i));
        const k = rk(it.sid, it.sub === 'drill' ? 'drill' : 'check');
        const all = store.get(k, {}) || {};
        all[it.rkey] = it.sub === 'drill' ? SAA.rec.drill(all[it.rkey], ok) : SAA.rec.check(all[it.rkey], ok);
        store.set(k, all);
        done = true;
        answered(it, ok);
        paint();
      });
      const paint = inS(it, () => {
        clear(box);
        box.appendChild(h('p', { cls: 'scen' }, done ? SAA.markWords(it.q, it.words) : md(it.q)));
        if (need > 1 && !done) box.appendChild(h('p', { cls: 'small muted', text: 'Pick ' + need + '.' }));
        const optList = h('div', { cls: 'optlist' });
        order.forEach((i, pos) => {
          const o = opts[i], picked = picks.has(i);
          let cls = 'opt', note = null;
          if (done) {
            if (o.ok) { cls += ' correct'; note = (picked ? '✓ correct' : '✓ the answer') + (o.why ? ' · ' + o.why : ''); }
            else if (picked) { cls += ' wrong'; note = '✕ your pick' + (o.why ? ' · ' + o.why : ''); }
            else { cls += ' rest'; note = o.why ? '· ' + o.why : null; }
          } else if (picked) cls += ' picked';
          const row = h(done ? 'div' : 'button', { cls, type: done ? null : 'button', 'aria-pressed': done ? null : String(picked) },
            h('div', { cls: 'otop' }, h('b', { cls: 'okey', text: SAA.LET[pos] }), h('span', { cls: 'otxt' }, md(o.t))),
            note ? h('span', { cls: 'why' }, md(note)) : null);
          if (!done) row.addEventListener('click', () => {
            if (need > 1) { if (picked) picks.delete(i); else picks.add(i); } else picks = picked ? new Set() : new Set([i]);
            paint();
          });
          optList.appendChild(row);
        });
        box.appendChild(optList);
        if (!done) {
          box.appendChild(h('button', { cls: 'btn', type: 'button', disabled: picks.size !== need, text: picks.size === need ? 'Check' : need > 1 ? 'Pick ' + need : 'Pick one', on: { click: submit } }));
          return;
        }
        box.appendChild(h('div', { cls: 'row between base' }, h('h2', { cls: 'step', text: ok ? 'Right' : 'Where it broke' }), h('span', { cls: 'small ' + (ok ? 'ok-t' : 'bad-t'), text: ok ? 'right answer' : 'wrong answer' })));
        if (it.expl) box.appendChild(P(it.expl, 'scen'));
        if (it.update) box.appendChild(callout(it.update, 'update'));
        if (!ok && it.sub === 'drill') {
          const k = rk(it.sid, 'drill');
          const tagRow = h('div', { cls: 'row', style: { gap: '8px' } }, h('span', { cls: 'small muted', text: 'Tag the miss' }));
          const paintTags = () => {
            while (tagRow.children.length > 1) tagRow.removeChild(tagRow.lastChild);
            const cur = ((store.get(k, {}) || {})[it.id] || {}).tag;
            SAA.TAGS.forEach(([t, n]) => tagRow.appendChild(h('button', { cls: 'vt', type: 'button', 'aria-pressed': String(cur === t), text: t + ' · ' + n, on: { click: () => {
              const rr = store.get(k, {}) || {};
              if (rr[it.id]) { rr[it.id].tag = rr[it.id].tag === t ? null : t; store.set(k, rr); }
              paintTags();
            } } })));
          };
          paintTags();
          box.appendChild(tagRow);
        }
        box.appendChild(h('div', null, h('button', { cls: 'btn ghost sm', type: 'button', text: 'Try again', on: { click: () => { picks = new Set(); done = false; order = shuffle(order); paint(); } } })));
      }, box);
      paint();
      const eb = [sessLabel(it), it.src || it.id];
      if (it.mine) eb.push('you missed this');
      else if (prev && prev.ok === false) eb.push('missed last time');
      const links = it.sub === 'drill' ? [['Full drill with cross-outs and the stub', it.sx.path + '#drill/' + it.id]].concat(chLink(it)) : chLink(it);
      return shell(it, eb.join(' · '), box, links);
    }

    /* compare quick check: question first, the two sides only after the answer */
    function pairItem(it) {
      const pr = it.pr, c = pr.check;
      let order = shuffle(c.opts.map((o, i) => i)), pickI = null, chosen = null;
      const box = h('div', { cls: 'card stack g10' });
      const paint = inS(it, () => {
        clear(box);
        box.appendChild(P(c.q));
        const n = c.opts.length;
        const grid = h('div', { cls: 'qcgrid', style: { gridTemplateColumns: 'repeat(' + (phone() && n > 2 ? 1 : n) + ',minmax(0,1fr))' } });
        order.forEach(i => {
          const o = c.opts[i];
          let cls = 'qcbtn';
          if (chosen != null) { if (i === c.a) cls += ' correct'; else if (i === chosen) cls += ' wrong'; }
          grid.appendChild(h('button', { cls, type: 'button', style: lineVars(SAA.lineAlias(it.S.lines, o)), 'aria-pressed': chosen == null ? String(pickI === i) : null,
            disabled: chosen != null && i !== c.a && i !== chosen, text: o, on: { click: () => { if (chosen == null) { pickI = pickI === i ? null : i; paint(); } } } }));
        });
        box.appendChild(grid);
        if (chosen == null) {
          box.appendChild(h('button', { cls: 'btn', type: 'button', disabled: pickI == null, text: pickI == null ? 'Pick one' : 'Check', on: { click: inS(it, () => { chosen = pickI; answered(it, chosen === c.a); paint(); }) } }));
          return;
        }
        box.appendChild(h('p', { cls: 'small ' + (chosen === c.a ? 'ok-t' : 'bad-t') }, chosen === c.a ? '✓ ' : '✕ ', md(c.why)));
        box.appendChild(SAA.pairSides(pr));
        box.appendChild(h('div', null, h('button', { cls: 'btn ghost sm', type: 'button', text: 'Try again', on: { click: () => { chosen = null; pickI = null; order = shuffle(order); paint(); } } })));
      }, box);
      paint();
      return shell(it, sessLabel(it) + ' · Quick check · ' + pr.short, box, [['Full comparison', it.sx.path + '#compare/' + pr.id]].concat(chLink(it)));
    }

    /* trigger card: recall, reveal, rate (same Leitner record as the session's Cards tab) */
    function cardItem(it) {
      const c = it.c, S = it.S;
      const L = (S.lines || []).find(x => x.id === c.line) || null;
      const label = L ? L.name : (S.topics && S.topics[c.line]) || c.line;
      let shown = false, rated = null;
      const box = h('div', { cls: 'stack g10' });
      const paint = inS(it, () => {
        clear(box);
        box.appendChild(SAA.trigCard(c, L, label, shown));
        if (!shown) { box.appendChild(h('button', { cls: 'btn wide', type: 'button', text: 'Show answer', on: { click: () => { shown = true; paint(); } } })); return; }
        if (rated) { box.appendChild(h('p', { cls: 'mono small muted', text: rated })); return; }
        const b = (cardRec(it) || {}).box || 1;
        box.appendChild(SAA.rateRow(b, kind => {
          const k = rk(it.sid, 'cards');
          const m = store.get(k, {}) || {};
          m[c.id] = SAA.rec.card(m[c.id], kind);
          store.set(k, m);
          rated = ({ miss: 'Missed', hes: 'Hesitated', knew: 'Knew it' })[kind] + ' → box ' + m[c.id].box;
          answered(it, kind === 'knew');
          paint();
        }));
      }, box);
      paint();
      return shell(it, sessLabel(it) + ' · Trigger card', box, [['All cards in Session ' + it.sx.n, it.sx.path + '#cards']]);
    }

    /* knowledge summary: one line, one verb, what it was built for */
    function lineItem(it) {
      const L = it.L, S = it.S;
      const lc = SAA.lineCard(L);
      if (L.says && L.says.length) lc.appendChild(h('div', { cls: 'stack g6' }, eyebrow('Exam says', 'sm'), h('div', { cls: 'row' }, L.says.map(x => h('span', { cls: 'pill line', style: lineVars(L), text: x })))));
      const sw = (L.switch || []).map(x => ({ x, T: (S.lines || []).find(y => y.id === x.to) })).filter(o => o.T);
      if (sw.length) lc.appendChild(h('div', { cls: 'stack g6' }, eyebrow('Switch lines when', 'sm'),
        sw.map(({ x, T }) => h('div', { cls: 'swrow' }, h('span', { cls: 'dot', style: { background: color(T) } }), h('span', null, x.when + ' → ', h('b', { text: T.short || T.name }))))));
      return shell(it, sessLabel(it) + ' · Line', lc, [['On the map', it.sx.path + '#map/' + L.id]]);
    }
    function trapItem(it) {
      return shell(it, sessLabel(it) + ' · Trap', h('div', { cls: 'card trap' }, h('h3', null, md(it.t.title)), P(it.t.x)), [['All traps in Session ' + it.sx.n, it.sx.path + '#traps']]);
    }
    function updateItem(it) {
      return shell(it, sessLabel(it) + ' · ' + chLabel(it.ch), h('div', { cls: 'card stack g10' }, callout(it.text, 'update', it.title)), chLink(it));
    }
    function hooksItem(it) {
      return shell(it, sessLabel(it) + ' · ' + (it.label || 'Memory hooks'),
        h('div', { cls: 'hooks' }, it.hooks.map(([x, y]) => h('div', null, h('b', null, md(x)), h('span', null, md(y))))), chLink(it));
    }

    function dueCards(now) {
      let n = 0;
      Object.keys(ITEMS).forEach(sid => { const m = store.get(rk(sid, 'cards'), {}) || {}; ITEMS[sid].card.forEach(it => { if (isDue(m[it.c.id], now) && inDomain(it)) n++; }); });
      return n;
    }
    /* every 10 items: what this stretch was, then a suggestion; nothing blocks */
    function marker() {
      const el = h('div', { cls: 'fitem', data: { kind: 'marker' } });
      el._paint = live => {
        const a = sitting.answered - markBase.answered, r = sitting.right - markBase.right;
        if (live) { markBase.answered = sitting.answered; markBase.right = sitting.right; }
        clear(el);
        el.appendChild(h('div', { cls: 'stats' },
          [[a, 'answered since the last stop'], [r, 'right'], [st.today.answered + ' · ' + st.today.right, 'today: answered · right'], [dueCards(Date.now()), 'cards due']]
            .map(([x, y]) => h('div', { cls: 'stat' }, h('b', { text: String(x) }), h('span', { text: y })))));
        el.appendChild(h('p', { cls: 'muted', text: 'That is ' + MARK_EVERY + '. A good place to stop, or keep going.' }));
      };
      el._paint(false);
      if (markIO) markIO.observe(el);
      return el;
    }
    function endItem() {
      const now = Date.now();
      let next = null;
      Object.keys(ITEMS).forEach(sid => { const m = store.get(rk(sid, 'cards'), {}) || {}; ITEMS[sid].card.forEach(it => { const e = m[it.c.id]; if (e && e.due > now && inDomain(it) && (!next || e.due < next)) next = e.due; }); });
      const box = h('div', { cls: 'card stack g10', data: { kind: 'end' } }, h('h2', { cls: 'step', text: 'Nothing left in this filter.' }));
      if (next) box.appendChild(P('Next card is due ' + new Date(next).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) + '.', 'muted'));
      box.appendChild(P(loadingDone ? 'Another mode or domain has more.' : 'More sessions are still loading.', 'muted'));
      return box;
    }

    /* ---- load: the session least recently used first, the rest in the background ---- */
    const order = shuffle(SS).sort((a, b) => (st.last[a.id] || 0) - (st.last[b.id] || 0));
    const root = document.documentElement;
    root.dataset.feedSessions = '0';
    function arrive(sx, S) {
      ITEMS[sx.id] = derive(sx, S);
      rot.splice(Math.floor(Math.random() * (rot.length + 1)), 0, sx.id);
      root.dataset.feedSessions = String(Object.keys(DATA).length);
      paintToday();
      unEnd();
      if (!list.children.length) appendBatch(true); else recheck();
      if (!io && batches < rot.length) appendBatch(true);
    }
    (async () => {
      for (let i = 0; i < order.length; i++) {
        const sx = order[i];
        if (i) await new Promise(res => idle(res));
        try { arrive(sx, await loadSession(sx)); } catch (e) {
          failBox.appendChild(h('p', { cls: 'small muted', text: 'Session ' + sx.n + ' did not load.' }));
        }
      }
      loadingDone = true;
      root.dataset.feedDone = '1';
      unEnd();
      recheck();
      if (!rot.length) list.appendChild(h('p', { cls: 'muted', text: 'No session loaded.' }));
    })();

    const flush = () => save();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else wake(); });
    window.addEventListener('pageshow', wake);
  };
})();
