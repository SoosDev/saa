/* SAA Transit Maps — the feed (site root).
   Short plain-language reads ("bites", bites/NN-name.js -> window.SAA_BITES), each followed by 3-5
   exam-style questions answered in place. Random order, one session after another, unseen first.
   The feed has its own content and its own records: saa:feed:state (day, counters, streak, domain chip)
   and saa:feed:bites (per bite: seen, and per question the SAA.rec.drill record). It reads and writes
   no session key (saa:<sessionId>:*). */
(function () {
  'use strict';
  const SAA = window.SAA;
  const { h, md, P, clear, store, eyebrow, callout, shuffle } = SAA;
  const KEY = 'saa:feed:state', BKEY = 'saa:feed:bites';
  const BATCH = 3, MARK_EVERY = 5;
  const DOMS = ['D1', 'D2', 'D3', 'D4'];

  /* ================= state: saa:feed:state (v2) ================= */
  const dayStr = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = () => dayStr(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); };
  /* v1 (the old feed) keeps day, today, streak and domain; its seen, last and mode indexed items that no longer exist */
  function loadState() {
    const raw = store.get(KEY, null);
    const src = raw && typeof raw === 'object' && (raw.v === 2 || raw.v === 1) ? raw : {};
    const st = { v: 2, day: src.day, today: src.today, streak: src.streak, domain: src.domain };
    if (!st.today || typeof st.today !== 'object') st.today = { answered: 0, right: 0 };
    if (!st.streak || typeof st.streak !== 'object') st.streak = { n: 0, last: null };
    if (st.domain !== 'all' && !DOMS.includes(st.domain)) st.domain = 'all';
    rollDay(st);
    return st;
  }
  function rollDay(st) { const t = today(); if (st.day !== t) { st.day = t; st.today = { answered: 0, right: 0 }; } }
  let st = null;
  const save = () => store.set(KEY, st);
  const streakNow = () => (st.streak.last === today() || st.streak.last === yesterday() ? st.streak.n : 0);

  /* ================= records: saa:feed:bites ================= */
  const recs = () => { const r = store.get(BKEY, {}); return r && typeof r === 'object' && !Array.isArray(r) ? r : {}; };
  const entry = (r, id) => (r[id] && typeof r[id] === 'object' ? r[id] : (r[id] = {}));
  function markSeen(id) { const r = recs(); entry(r, id).seen = Date.now(); store.set(BKEY, r); }
  function record(id, qid, ok) {
    const r = recs(), e = entry(r, id);
    if (!e.q || typeof e.q !== 'object') e.q = {};
    e.q[qid] = SAA.rec.drill(e.q[qid], ok);
    e.seen = Date.now();
    store.set(BKEY, r);
  }

  /* ================= feed ================= */
  SAA.feed = function () {
    st = loadState();
    const SESS = {};
    (window.SAA_SESSIONS || []).filter(sx => sx.path && !sx.soon).forEach(sx => { SESS[sx.id] = sx; });
    const SOON = (window.SAA_SESSIONS || []).filter(sx => sx.soon);
    const BITES = (window.SAA_BITES || []).filter(b => b && SESS[b.sid] && Array.isArray(b.qs));
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
      const r = recs();
      const seenN = BITES.filter(b => r[b.id] && r[b.id].seen).length;
      todayBox.appendChild(h('h2', { cls: 'step', text: 'Today' }));
      todayBox.appendChild(h('div', { cls: 'stats' },
        [[st.today.answered, 'answered today'], [st.today.right, 'right today'], [streakNow(), streakNow() === 1 ? 'day in a row' : 'days in a row'], [seenN + ' / ' + BITES.length, 'reads seen']]
          .map(([a, b]) => h('div', { cls: 'stat' }, h('b', { text: String(a) }), h('span', { text: b })))));
      const grid = h('div', { cls: 'dombar' });
      DOMS.forEach(D => {
        let n = 0, ok = 0;
        BITES.forEach(b => {
          if (!b.domains.includes(D)) return;
          const q = (r[b.id] && r[b.id].q) || {};
          b.qs.forEach(x => { n++; if (q[x.id] && q[x.id].ok) ok++; });
        });
        grid.appendChild(h('span', { text: D + ' ' + (DNAME[D] || '') }));
        grid.appendChild(h('div', { cls: 'bar', role: 'img', 'aria-label': D + ': ' + ok + ' of ' + n + ' feed questions right' }, h('i', { style: { width: (n ? Math.round((ok / n) * 100) : 0) + '%' } })));
        grid.appendChild(h('span', { cls: 'mono', text: ok + ' / ' + n }));
      });
      todayBox.appendChild(h('div', { cls: 'card stack g8' }, h('span', { cls: 'eyebrow sm', text: 'Feed questions right by exam domain' }), grid));
    }

    /* ---- domain filter ---- */
    const domRow = h('div', { cls: 'chiprow scroll', role: 'group', 'aria-label': 'Exam domain' });
    function paintChips() {
      clear(domRow);
      [['all', 'All domains']].concat(DOMS.map(D => [D, D + ' ' + (DNAME[D] || '')])).forEach(([v, t]) =>
        domRow.appendChild(h('button', { cls: 'chip b', type: 'button', 'aria-pressed': String(st.domain === v), data: { domain: v }, text: t.trim(), on: { click: () => { st.domain = v; save(); paintChips(); restart(); } } })));
    }
    const ns = Array.from(new Set(BITES.map(b => SESS[b.sid].n)));
    const cover = h('p', { cls: 'small muted' }, BITES.length + ' reads' + (ns.length ? ' over sessions ' + Math.min(...ns) + ' to ' + Math.max(...ns) : '') + '. ' +
      (SOON.length ? 'Not written yet: ' + SOON.map(sx => sx.title).join(' · ') + '.' : ''));

    const list = h('div', { cls: 'flist' });
    const sentinel = h('div', { 'aria-hidden': 'true' });
    const moreBtn = h('button', { cls: 'btn ghost', type: 'button', text: 'More', on: { click: () => appendBatch() } });
    add(feed, [todayBox, h('div', { cls: 'stack g8' }, domRow, cover), list, sentinel, h('div', null, moreBtn)]);
    paintToday(); paintChips();

    /* ---- ordering: per session least recently seen first; sessions shuffled, one bite each in turn; unseen first ---- */
    const inDomain = b => st.domain === 'all' || b.domains.includes(st.domain);
    function round() {
      const r = recs(), at = b => (r[b.id] && r[b.id].seen) || 0;
      const by = {};
      BITES.filter(inDomain).forEach(b => { (by[b.sid] = by[b.sid] || []).push(b); });
      const lanes = shuffle(Object.keys(by)).map(sid => shuffle(by[sid]).sort((a, b) => at(a) - at(b)));
      const out = [];
      for (let i = 0; lanes.some(l => i < l.length); i++) lanes.forEach(l => { if (i < l.length) out.push(l[i]); });
      return out.sort((a, b) => (at(a) ? 1 : 0) - (at(b) ? 1 : 0));
    }
    let queue = [], qi = 0, rounds = 0, count = 0, ended = false;
    const sitting = { answered: 0, right: 0 }, markBase = { answered: 0, right: 0 };
    function appendBatch() {
      if (ended) return;
      for (let i = 0; i < BATCH; i++) {
        if (qi >= queue.length) {
          if (rounds) list.appendChild(roundItem(queue.length));
          queue = round(); qi = 0; rounds++;
          if (!queue.length) { ended = true; list.appendChild(h('div', { cls: 'card stack g10', data: { kind: 'end' } }, h('h2', { cls: 'step', text: 'Nothing in this filter.' }), P('Another domain has more.', 'muted'))); break; }
        }
        list.appendChild(biteItem(queue[qi++]));
        if (++count % MARK_EVERY === 0) list.appendChild(marker());
      }
      moreBtn.hidden = ended;
      recheck();
    }
    function restart() {
      if (seenIO) seenIO.disconnect();
      if (markIO) markIO.disconnect();
      clear(list);
      queue = []; qi = 0; rounds = 0; count = 0; ended = false;
      appendBatch();
    }

    /* infinite scroll: the sentinel within 600px of the viewport adds a batch; "More" is the keyboard path */
    let io = null;
    const recheck = () => { if (io) { io.unobserve(sentinel); io.observe(sentinel); } };
    if ('IntersectionObserver' in window) io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) appendBatch(); }, { rootMargin: '0px 0px 600px 0px' });
    /* a bite counts as seen once it has scrolled above the viewport */
    const seenIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting && e.boundingClientRect.bottom < 0) { markSeen(e.target.dataset.key); seenIO.unobserve(e.target); paintToday(); }
    })) : null;
    const markIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && e.target._paint) { e.target._paint(true); markIO.unobserve(e.target); }
    })) : null;

    /* an answer: counters and streak */
    function answered(ok) {
      rollDay(st);
      st.today.answered++; if (ok) st.today.right++;
      sitting.answered++; if (ok) sitting.right++;
      const t = today();
      if (st.streak.last !== t) { st.streak.n = st.streak.last === yesterday() ? (st.streak.n || 0) + 1 : 1; st.streak.last = t; }
      save(); paintCounter(); paintToday();
    }

    /* ================= a bite: the read, then its questions (existing components only) ================= */
    function biteItem(b) {
      const sx = SESS[b.sid];
      const res = {};
      const score = h('span', { cls: 'fscore mono small', hidden: true });
      const paintScore = () => {
        const done = b.qs.filter(q => q.id in res);
        score.hidden = done.length !== b.qs.length;
        score.textContent = done.filter(q => res[q.id]).length + ' of ' + b.qs.length + ' right';
      };
      const links = b.src.map(s => {
        const m = /^(?:(\d\d-[\w-]+)\/)?ch(\d+)$/.exec(s) || [];
        const tx = SESS[m[1] || b.sid] || sx;
        return h('a', { href: tx.path + '#learn/ch' + m[2], text: 'Full lesson: Session ' + tx.n + ', chapter ' + m[2] });
      }).concat(h('a', { href: sx.path + '#drill', text: 'Drills in Session ' + sx.n }));
      const el = h('article', { cls: 'fitem', data: { key: b.id, sid: b.sid } },
        h('div', { cls: 'fhead' }, eyebrow('Session ' + sx.n + ' · ' + sx.title, 'sm'), h('span', { cls: 'mono', text: b.domains.join(' ') })),
        h('div', { cls: 'card stack' }, h('h2', { cls: 'step', text: b.title }), P(b.text, 'scen'), b.update ? callout(b.update, 'update') : null),
        b.qs.map((q, i) => question(b, q, i, ok => { res[q.id] = ok; paintScore(); })),
        h('div', { cls: 'ffoot' }, score, links));
      if (seenIO) seenIO.observe(el);
      return el;
    }

    /* question: pick, then Check (two taps on purpose: a scrolling thumb must not commit an answer) */
    function question(b, q, qi, done1) {
      const opts = q.opts, need = opts.filter(o => o.ok).length;
      let order = shuffle(opts.map((o, i) => i)), picks = new Set(), done = false, ok = false;
      const box = h('div', { cls: 'card stack g10', data: { q: q.id } });
      const submit = () => {
        ok = picks.size === need && opts.every((o, i) => !o.ok || picks.has(i));
        record(b.id, q.id, ok);
        done = true;
        answered(ok);
        done1(ok);
        paint();
      };
      const paint = () => {
        clear(box);
        box.appendChild(eyebrow('Question ' + (qi + 1) + ' of ' + b.qs.length, 'sm'));
        box.appendChild(h('p', { cls: 'scen' }, done ? SAA.markWords(q.q, q.words) : md(q.q)));
        if (need > 1 && !done) box.appendChild(h('p', { cls: 'small muted', text: 'Pick ' + need + '.' }));
        const optList = h('div', { cls: 'optlist' });
        order.forEach((i, pos) => {
          const o = opts[i], picked = picks.has(i);
          let cls = 'opt', note = null;
          if (done) {
            if (o.ok) { cls += ' correct'; note = (picked ? '✓ correct' : '✓ the answer') + ' · ' + o.why; }
            else if (picked) { cls += ' wrong'; note = '✕ your pick · ' + o.why; }
            else { cls += ' rest'; note = '· ' + o.why; }
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
        box.appendChild(h('div', { cls: 'row between base' }, h('h3', { cls: 'step', text: ok ? 'Right' : 'Where it broke' }), h('span', { cls: 'small ' + (ok ? 'ok-t' : 'bad-t'), text: ok ? 'right answer' : 'wrong answer' })));
        box.appendChild(P(q.expl, 'scen'));
        box.appendChild(h('div', null, h('button', { cls: 'btn ghost sm', type: 'button', text: 'Try again', on: { click: () => { picks = new Set(); done = false; order = shuffle(order); paint(); } } })));
      };
      paint();
      return box;
    }

    /* every 5 bites: what this stretch was, then a suggestion; nothing blocks */
    function marker() {
      const el = h('div', { cls: 'fitem', data: { kind: 'marker' } });
      el._paint = live => {
        const a = sitting.answered - markBase.answered, r = sitting.right - markBase.right;
        if (live) { markBase.answered = sitting.answered; markBase.right = sitting.right; }
        clear(el);
        el.appendChild(h('div', { cls: 'stats' },
          [[a, 'answered since the last stop'], [r, 'right'], [st.today.answered + ' · ' + st.today.right, 'today: answered · right']]
            .map(([x, y]) => h('div', { cls: 'stat' }, h('b', { text: String(x) }), h('span', { text: y })))));
        el.appendChild(h('p', { cls: 'muted', text: 'That is ' + MARK_EVERY + '. A good place to stop, or keep going.' }));
      };
      el._paint(false);
      if (markIO) markIO.observe(el);
      return el;
    }
    const roundItem = n => h('div', { cls: 'fitem', data: { kind: 'round' } }, h('p', { cls: 'muted', text: 'That was all ' + n + '. Reshuffled; these you have seen.' }));

    const root = document.documentElement;
    root.dataset.feedBites = String(BITES.length);
    if (!BITES.length) list.appendChild(h('p', { cls: 'muted', text: 'No reads loaded.' }));
    else appendBatch();
    root.dataset.feedDone = '1';

    const flush = () => save();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else wake(); });
    window.addEventListener('pageshow', wake);
  };
})();
