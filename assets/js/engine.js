/* SAA Transit Maps — generic engine.
   One file renders every session from its data (window.SESSION) and the hub from
   sessions/manifest.js. No framework, no build step. DOM is built with
   createElement/textContent only; lesson text uses the tiny inline markup in md().
   localStorage keys: saa:<sessionId>:{learn,check,drill,cards,ui} and saa:theme. */
(function () {
  'use strict';
  const SAA = (window.SAA = window.SAA || {});
  const NS = 'http://www.w3.org/2000/svg';

  /* ================= storage (every access guarded) ================= */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode, quota */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  /* ================= DOM helpers ================= */
  function props(el, p, isSvg) {
    if (!p) return;
    for (const k of Object.keys(p)) {
      const v = p[k];
      if (v == null || v === false) continue;
      if (k === 'cls') { isSvg ? el.setAttribute('class', v) : (el.className = v); continue; }
      if (k === 'text') { el.textContent = v; continue; }
      if (k === 'on') { for (const ev of Object.keys(v)) el.addEventListener(ev, v[ev]); continue; }
      if (k === 'style') {
        if (typeof v === 'string') el.setAttribute('style', v);
        else for (const s of Object.keys(v)) { if (v[s] != null) s.startsWith('--') ? el.style.setProperty(s, v[s]) : (el.style[s] = v[s]); }
        continue;
      }
      if (k === 'data') { for (const d of Object.keys(v)) el.dataset[d] = v[d]; continue; }
      el.setAttribute(k, v === true ? '' : v);
    }
  }
  function add(el, kids) {
    for (const k of [].concat(kids).flat(Infinity)) {
      if (k == null || k === false) continue;
      el.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
    }
    return el;
  }
  function h(tag, p, ...kids) { const el = document.createElement(tag); props(el, p, false); return add(el, kids); }
  function s(tag, p, ...kids) { const el = document.createElementNS(NS, tag); props(el, p, true); return add(el, kids); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function eyebrow(t, cls) { return h('div', { cls: 'eyebrow' + (cls ? ' ' + cls : ''), text: t }); }
  function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  const LET = 'ABCDEFGH';
  const phone = () => window.matchMedia('(max-width:760px)').matches;

  /* ================= inline markup =================
     **bold**  `code`  {lineId|Service}  [[#tab|link]]  ==highlight==            */
  let LINES = {}; // id -> line, filled on mount
  const MD = /\*\*(.+?)\*\*|`([^`]+)`|\{([\w-]+)\|([^}]+)\}|\[\[([^|\]]+)\|([^\]]+)\]\]|==(.+?)==/g;
  function md(text) {
    const out = [];
    if (text == null) return out;
    const str = String(text);
    let last = 0, m;
    MD.lastIndex = 0;
    const re = new RegExp(MD.source, 'g');
    while ((m = re.exec(str))) {
      if (m.index > last) out.push(str.slice(last, m.index));
      if (m[1] != null) out.push(h('b', null, md(m[1])));
      else if (m[2] != null) out.push(h('code', { text: m[2] }));
      else if (m[3] != null) {
        const L = LINES[m[3]];
        out.push(L ? h('b', { style: { color: tcolor(L) } }, m[4]) : h('b', { text: m[4] }));
      } else if (m[5] != null) {
        const href = m[5], ext = /^https?:/.test(href);
        out.push(h('a', { href, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null }, md(m[6])));
      } else if (m[7] != null) out.push(h('mark', null, md(m[7])));
      last = re.lastIndex;
    }
    if (last < str.length) out.push(str.slice(last));
    return out;
  }
  function P(text, cls) { return h('p', { cls }, md(text)); }

  /* ================= line colours ================= */
  function color(L) { return L ? (L.cls === 'ink' ? 'var(--ink)' : 'var(--' + L.cls + ')') : null; }
  function tcolor(L) { return L ? (L.cls === 'ink' ? 'var(--ink)' : 'var(--' + (L.textVar || L.cls) + ')') : 'var(--ink)'; }
  function lineVars(L) { return L ? { '--c': color(L), '--ct': tcolor(L) } : {}; }
  function swatch(L) {
    if (!L) return null;
    return h('i', { cls: 'sw' + (L.dash ? ' dash' : ''), style: { background: color(L), '--c': color(L) }, 'aria-hidden': 'true' });
  }

  /* ================= theme (3-state) ================= */
  function themeGet() { return store.get('saa:theme', null); }
  function themeApply(t) { if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }
  function isDark() { const t = themeGet(); return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; }
  const themeListeners = [];
  function themeButton(cls) {
    const b = h('button', { cls: cls || 'tbtn', type: 'button' });
    const paint = () => { b.textContent = isDark() ? 'Light' : 'Dark'; b.setAttribute('aria-label', 'Switch to ' + (isDark() ? 'light' : 'dark') + ' theme'); };
    b.addEventListener('click', () => { const t = isDark() ? 'light' : 'dark'; store.set('saa:theme', t); themeApply(t); themeListeners.forEach(f => f()); });
    themeListeners.push(paint); paint();
    return b;
  }
  themeApply(themeGet());

  /* ================= tooltip (one per page) ================= */
  let tipEl = null;
  function tipInit() {
    if (tipEl) return;
    tipEl = h('div', { cls: 'tip', role: 'tooltip', hidden: true });
    document.body.appendChild(tipEl);
    const place = e => {
      const pad = 12, w = tipEl.offsetWidth, hh = tipEl.offsetHeight;
      let x = e.clientX + pad, y = e.clientY - hh - pad;
      if (x + w > window.innerWidth - 8) x = e.clientX - w - pad;
      if (x < 8) x = 8;
      if (y < 8) y = e.clientY + pad;
      tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
    };
    document.addEventListener('pointerover', e => {
      const t = e.target.closest && e.target.closest('[data-tip]');
      if (!t) return;
      tipEl.textContent = t.getAttribute('data-tip'); tipEl.hidden = false; place(e);
    });
    document.addEventListener('pointermove', e => { if (!tipEl.hidden) place(e); });
    document.addEventListener('pointerout', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) tipEl.hidden = true; });
    document.addEventListener('scroll', () => { tipEl.hidden = true; }, true);
  }

  /* ================= charts (hand-built SVG, ink marks, recessive grid) ================= */
  function mountChart(draw, cap) {
    tipInit();
    const box = h('div', { cls: 'chart' });
    let lastW = 0;
    const paint = () => {
      const w = Math.round(box.clientWidth || 600);
      if (w === lastW || w < 10) return;
      lastW = w; clear(box); box.appendChild(draw(w));
    };
    if ('ResizeObserver' in window) new ResizeObserver(paint).observe(box);
    requestAnimationFrame(paint);
    box._redraw = () => { lastW = 0; paint(); };
    return cap ? h('div', { cls: 'stack g8' }, box, h('p', { cls: 'chcap' }, md(cap))) : box;
  }
  function textW(t, px) { return String(t).length * px * 0.56; }
  /* horizontal bar chart. rows: {label, line?, value, text?, tip}. One value axis. */
  function hbars(o) {
    return mountChart(W => {
      const rows = o.rows, rowH = o.rowH || 30, top = 4, axisH = 22;
      const maxLab = Math.max(...rows.map(r => textW(r.label, 13) + (r.line ? 28 : 0)));
      const labW = Math.min(Math.max(90, maxLab + 12), Math.round(W * 0.42));
      const valW = o.valW || 58;
      const plot = Math.max(40, W - labW - valW);
      const max = o.max || Math.max(1, ...rows.map(r => r.value));
      const H = top + rows.length * rowH + axisH;
      const svgEl = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': o.title || 'Bar chart' });
      const ticks = o.ticks || niceTicks(max);
      const g = s('g', { cls: 'grid' });
      ticks.forEach(t => { const x = labW + (t / max) * plot; g.appendChild(s('line', { x1: x, x2: x, y1: top, y2: top + rows.length * rowH })); });
      svgEl.appendChild(g);
      ticks.forEach(t => svgEl.appendChild(s('text', { cls: 'axis', x: labW + (t / max) * plot, y: H - 6, 'text-anchor': 'middle', text: (o.fmt || String)(t) })));
      rows.forEach((r, i) => {
        const y = top + i * rowH;
        const grp = s('g', { 'data-tip': r.tip || (r.label + ': ' + (r.text != null ? r.text : r.value)) });
        grp.appendChild(s('rect', { x: 0, y, width: W, height: rowH, fill: 'transparent' }));
        let lx = 0;
        if (r.line) {
          const c = color(r.line);
          grp.appendChild(s('line', { x1: 2, x2: 20, y1: y + rowH / 2, y2: y + rowH / 2, stroke: c, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-dasharray': r.line.dash ? '5 4' : null }));
          lx = 28;
        }
        grp.appendChild(s('text', { cls: 'lab', x: lx, y: y + rowH / 2 + 4.5, text: r.label }));
        const bw = Math.max(r.value > 0 ? 2 : 0, (r.value / max) * plot);
        grp.appendChild(s('rect', { cls: 'barr' + (r.soft ? ' soft' : ''), x: labW, y: y + 8, width: bw, height: rowH - 16, rx: 2 }));
        grp.appendChild(s('text', { cls: 'val', x: labW + bw + 6, y: y + rowH / 2 + 4, text: r.text != null ? r.text : String(r.value) }));
        svgEl.appendChild(grp);
      });
      return svgEl;
    }, o.cap);
  }
  function niceTicks(max) {
    const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
    const step = steps.find(st => max / st <= 5) || Math.ceil(max / 5);
    const t = []; for (let v = 0; v <= max + 1e-9; v += step) t.push(v);
    return t;
  }

  /* ================= progress (shared with hub) ================= */
  function readProgress(id, totals) {
    const learn = store.get('saa:' + id + ':learn', {}), drill = store.get('saa:' + id + ':drill', {}), cards = store.get('saa:' + id + ':cards', {});
    const chapters = Object.keys(learn).filter(k => learn[k]).length;
    const drills = Object.keys(drill).filter(k => drill[k] && drill[k].ok).length;
    const cards3 = Object.keys(cards).filter(k => cards[k] && cards[k].box >= 3).length;
    const total = (totals.chapters || 0) + (totals.drills || 0) + (totals.cards || 0);
    const done = chapters + drills + cards3;
    return { chapters, drills, cards3, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  SAA.readProgress = readProgress;

  /* ================= Leitner ================= */
  const DAY = 86400000;
  const INTERVAL = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 }; // days until due again, by box
  function endOfToday() { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); }

  /* ================= icons (24px stroke, from the mockups) ================= */
  const ICON = {
    learn: [['path', { d: 'M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z' }], ['path', { d: 'M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z' }]],
    map: [['circle', { cx: 5, cy: 6, r: 2 }], ['circle', { cx: 19, cy: 18, r: 2 }], ['path', { d: 'M7 6h5l4 4v6' }]],
    cards: [['rect', { x: 4, y: 7, width: 14, height: 13, rx: 2 }], ['path', { d: 'M8 4h11a1 1 0 0 1 1 1v11' }]],
    drill: [['circle', { cx: 12, cy: 12, r: 8 }], ['circle', { cx: 12, cy: 12, r: 3 }]],
    more: [['circle', { cx: 5, cy: 12, r: 1.5 }], ['circle', { cx: 12, cy: 12, r: 1.5 }], ['circle', { cx: 19, cy: 12, r: 1.5 }]]
  };
  function icon(k) {
    return s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
      ICON[k].map(([t, a]) => s(t, a)));
  }

  /* ================= widgets registry =================
     SAA.widgets[name] = (args, ctx) => Node. Generic ones live here; session files add theirs. */
  const widgets = (SAA.widgets = SAA.widgets || {});

  /* ================= generic components ================= */

  /* Checkpoint: option rows of the drill, one question, instant why, "Try again". */
  function checkpoint(cp, key, ctx) {
    const answers = Array.isArray(cp.a) ? cp.a : [cp.a];
    const multi = answers.length > 1;
    const opts = cp.opts.map(o => (typeof o === 'string' ? { t: o } : o));
    const box = h('div', { cls: 'card ckpt' });
    let picks = new Set(), done = false;
    const paint = () => {
      clear(box);
      box.appendChild(h('div', { cls: 'row between base' }, eyebrow('Checkpoint' + (cp.src ? ' · ' + cp.src : '')), done ? h('span', { cls: 'small ' + (isOk() ? 'ok-t' : 'bad-t'), text: isOk() ? 'right' : 'not yet' }) : null));
      box.appendChild(P(cp.q, 'q'));
      if (multi && !done) box.appendChild(h('p', { cls: 'small muted', text: 'Pick ' + answers.length + '.' }));
      const list = h('div', { cls: 'optlist' });
      opts.forEach((o, i) => {
        const isAns = answers.includes(i), picked = picks.has(i);
        let cls = 'opt', note = null;
        if (done) {
          if (isAns) { cls += ' correct'; note = (picked ? '✓ correct' : '✓ the answer') + (o.why ? ' — ' + o.why : ''); }
          else if (picked) { cls += ' wrong'; note = '✕ your pick' + (o.why ? ' — ' + o.why : ''); }
          else { cls += ' rest'; note = o.why ? '· ' + o.why : null; }
        } else if (picked) cls += ' picked';
        const row = h(done ? 'div' : 'button', { cls, type: done ? null : 'button', 'aria-pressed': done ? null : String(picked) },
          h('div', { cls: 'otop' }, h('b', { cls: 'okey', text: LET[i] }), h('span', { cls: 'otxt' }, md(o.t))),
          note ? h('span', { cls: 'why' }, md(note)) : null);
        if (!done) row.addEventListener('click', () => {
          if (multi) { picks.has(i) ? picks.delete(i) : picks.add(i); paint(); }
          else { picks = new Set([i]); submit(); }
        });
        list.appendChild(row);
      });
      box.appendChild(list);
      if (multi && !done) box.appendChild(h('button', { cls: 'btn', type: 'button', disabled: picks.size !== answers.length, text: 'Check', on: { click: submit } }));
      if (done) {
        if (cp.why) box.appendChild(h('div', { cls: 'callout' }, h('span', null, md(cp.why))));
        box.appendChild(h('div', null, h('button', { cls: 'btn ghost sm', type: 'button', text: 'Try again', on: { click: () => { picks = new Set(); done = false; paint(); } } })));
      }
    };
    const isOk = () => picks.size === answers.length && answers.every(a => picks.has(a));
    function submit() {
      done = true;
      if (ctx && key) { const all = store.get(ctx.k('check'), {}); const prev = all[key] || {}; all[key] = { ok: isOk(), n: (prev.n || 0) + 1, ever: prev.ever || isOk() }; store.set(ctx.k('check'), all); }
      paint();
    }
    paint();
    return box;
  }
  SAA.checkpoint = checkpoint;

  function callout(text, kind, title) {
    const lead = title || (kind === 'update' ? 'Changed since the exam guide' : kind === 'miss' ? 'Your misses' : null);
    if (kind === 'miss') return h('div', { cls: 'callout miss' }, h('span', null, lead ? h('b', { cls: 'lead', text: lead + ': ' }) : null, md(text)));
    return h('div', { cls: 'callout' + (kind === 'small' ? ' small' : '') }, lead ? eyebrow(lead, 'sm') : null, h('span', null, md(text)));
  }
  SAA.callout = callout;

  function table(t) {
    const head = t.head ? h('thead', null, h('tr', null, t.head.map(x => h('th', { text: x })))) : null;
    const body = h('tbody', null, t.rows.map((r, i) => h('tr', { cls: t.win === i ? 'win' : null }, r.map((c, j) => h('td', { cls: j === 0 && t.key ? 'k' : null }, md(c))))));
    return h('div', { cls: 'tbl' }, h('table', null, head, body));
  }
  SAA.table = table;

  function pre(text, label) {
    return h('div', { cls: 'stack g8' }, label ? eyebrow(label) : null, h('div', { cls: 'pre' }, h('pre', { text })));
  }

  /* Sorter: each item to a bucket, check, wrong ones show why. */
  widgets.sorter = function (a) {
    const box = h('div', { cls: 'card widget' });
    let pick = {}, checked = false;
    const paint = () => {
      clear(box);
      box.appendChild(h('div', { cls: 'row between base' }, eyebrow(a.title || 'Sorter'), checked ? h('span', { cls: 'mono small', text: score() + ' / ' + a.items.length }) : null));
      if (a.lead) box.appendChild(P(a.lead, 'small muted'));
      a.items.forEach((it, i) => {
        const ok = pick[i] === it.b;
        const row = h('div', { cls: 'sortrow' + (checked ? (ok ? ' correct' : ' wrong') : '') },
          h('span', null, md('“' + it.t + '”')),
          h('div', { cls: 'chiprow' }, a.buckets.map(b => h('button', {
            cls: 'chip b', type: 'button', 'aria-pressed': String(pick[i] === b.id), disabled: checked,
            text: b.short || b.label, title: b.label, on: { click: () => { pick[i] = b.id; paint(); } }
          }))),
          checked ? h('span', { cls: 'why' }, md((ok ? '✓ ' : '✕ ' + (a.buckets.find(b => b.id === it.b) || {}).label + ' — ') + (it.why || ''))) : null);
        box.appendChild(row);
      });
      const n = Object.keys(pick).length;
      box.appendChild(h('div', { cls: 'row' },
        checked ? h('button', { cls: 'btn ghost sm', type: 'button', text: 'Try again', on: { click: () => { pick = {}; checked = false; paint(); } } })
          : h('button', { cls: 'btn sm', type: 'button', disabled: n < a.items.length, text: n < a.items.length ? 'Sort all ' + a.items.length + ' to check (' + n + ')' : 'Check', on: { click: () => { checked = true; paint(); } } })));
      if (a.buckets.some(b => b.short)) box.appendChild(h('p', { cls: 'small muted' }, a.buckets.map(b => b.short + ' = ' + b.label).join(' · ')));
    };
    const score = () => a.items.filter((it, i) => pick[i] === it.b).length;
    paint();
    return box;
  };

  /* Stub trainer: fill the slots for a drill scenario, then reveal the truth per slot. */
  widgets.stubTrainer = function (a, ctx) {
    const d = ctx.S.drills.find(x => x.id === a.drill);
    const box = h('div', { cls: 'card widget' });
    let v = {}, shown = false;
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow(a.title || 'Stub trainer · ' + d.src));
      box.appendChild(P(d.q, 'scen'));
      ctx.S.stub.forEach(sl => {
        const truth = d.stub[sl.id];
        const ok = truth === 'any' || v[sl.id] === truth;
        box.appendChild(h('div', { cls: 'stubrow' },
          h('span', { cls: 'stublab', text: sl.label }),
          h('div', { cls: 'chiprow' }, sl.values.map(val => h('button', { cls: 'chip', type: 'button', 'aria-pressed': String(v[sl.id] === val), disabled: shown, text: val, on: { click: () => { v[sl.id] = val; paint(); } } }))),
          shown ? h('div', { cls: 'row', style: { gap: '8px', alignItems: 'baseline', flexWrap: 'nowrap' } },
            h('span', { cls: 'vt ' + (ok ? 'y' : 'n'), text: sl.short + (ok ? ' ✓' : ' ✕') }),
            h('span', { cls: 'small' }, md('**' + truth + '** — ' + ((a.why || {})[sl.id] || ''))))
            : null));
      });
      const n = Object.keys(v).length;
      box.appendChild(h('div', null, shown
        ? h('button', { cls: 'btn ghost sm', type: 'button', text: 'Try again', on: { click: () => { v = {}; shown = false; paint(); } } })
        : h('button', { cls: 'btn sm', type: 'button', disabled: n < ctx.S.stub.length, text: 'Reveal the stub', on: { click: () => { shown = true; paint(); } } })));
    };
    paint();
    return box;
  };

  /* Searchable trigger table generated from the cards. */
  widgets.triggerTable = function (a, ctx) {
    const inp = h('input', { cls: 'inp', type: 'search', placeholder: 'Search a phrase or a service…', 'aria-label': 'Search triggers' });
    const body = h('tbody');
    const count = h('span', { cls: 'mono small muted' });
    const paint = () => {
      const q = inp.value.trim().toLowerCase();
      clear(body);
      const rows = ctx.S.cards.filter(c => !q || (c.f + ' ' + c.b + ' ' + ctx.groupName(c.line)).toLowerCase().includes(q));
      count.textContent = rows.length + ' / ' + ctx.S.cards.length;
      rows.forEach(c => {
        const L = LINES[c.line];
        body.appendChild(h('tr', null,
          h('td', null, md(c.f)),
          h('td', null, h('b', { style: { color: tcolor(L) } }, c.b), c.update ? h('span', { cls: 'small muted' }, ' · changed') : null),
          h('td', { style: { whiteSpace: 'nowrap' } }, h('span', { cls: 'row', style: { gap: '6px', flexWrap: 'nowrap' } }, swatch(L), h('span', { cls: 'small', text: ctx.groupName(c.line) })))));
      });
    };
    inp.addEventListener('input', paint);
    paint();
    return h('div', { cls: 'widget' },
      h('div', { cls: 'row between base' }, eyebrow('Trigger table'), count), inp,
      h('div', { cls: 'tbl' }, h('table', null, h('thead', null, h('tr', null, h('th', { text: 'The exam says' }), h('th', { text: 'Think' }), h('th', { text: 'Line' }))), body)));
  };

  /* Stepper: a station line of numbered steps with Next/Back. */
  widgets.stepper = function (a) {
    const L = a.line ? LINES[a.line] : null;
    let i = 0;
    const box = h('div', { cls: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow(a.title || 'Step through'));
      const st = h('div', { cls: 'steps', role: 'tablist', style: lineVars(L) });
      a.steps.forEach((x, j) => {
        if (j) st.appendChild(h('i', { cls: L && L.dash ? 'dash' : null }));
        st.appendChild(h('button', { type: 'button', 'aria-current': String(j === i), 'aria-label': 'Step ' + (j + 1) + ': ' + x.title, text: String(j + 1), on: { click: () => { i = j; paint(); } } }));
      });
      box.appendChild(st);
      const x = a.steps[i];
      box.appendChild(h('div', { cls: 'stack g6' }, h('div', { cls: 'mono small muted', text: 'Step ' + (i + 1) + ' of ' + a.steps.length }), h('h3', { style: { fontSize: '20px' }, text: x.title }), P(x.text)));
      if (x.fig && widgets[x.fig.w]) box.appendChild(widgets[x.fig.w](x.fig, null));
      if (x.note) box.appendChild(callout(x.note, 'small', x.noteTitle || null));
      box.appendChild(h('div', { cls: 'row' },
        h('button', { cls: 'btn ghost sm', type: 'button', disabled: i === 0, text: '← Back', on: { click: () => { i--; paint(); } } }),
        h('button', { cls: 'btn sm', type: 'button', disabled: i === a.steps.length - 1, text: 'Next →', on: { click: () => { i++; paint(); } } })));
    };
    paint();
    return box;
  };

  /* Chooser: a small decision tree that ends on an answer card (same look as the Tree tab). */
  widgets.chooser = function (a, ctx) {
    const box = h('div', { cls: 'widget' });
    box.appendChild(eyebrow(a.title || 'Chooser'));
    box.appendChild(treeWidget(a.tree, ctx, { embedded: true }));
    return box;
  };

  /* ================= tree (Where it lives, choosers) ================= */
  function treeWidget(T, ctx, opt) {
    const box = h('div', { cls: 'stack g16' });
    let path = [];
    const paint = () => {
      clear(box);
      const crumbs = h('div', { cls: 'crumbs' }, h('button', { type: 'button', text: 'Start over', on: { click: () => { path = []; paint(); } } }));
      path.forEach((p, i) => { crumbs.appendChild(h('span', { text: '›' })); crumbs.appendChild(h('button', { type: 'button', text: p.label, on: { click: () => { path = path.slice(0, i); paint(); } } })); });
      if (path.length) box.appendChild(crumbs);
      const cur = path.length ? path[path.length - 1].next : T.start;
      if (T.nodes[cur]) {
        const n = T.nodes[cur];
        box.appendChild(h('h2', { style: { fontSize: opt && opt.embedded ? '20px' : '24px' } }, md(n.q)));
        if (n.hint) box.appendChild(P(n.hint, 'muted'));
        box.appendChild(h('div', { cls: 'stack g8' }, n.opts.map(o => h('button', { cls: 'bigopt', type: 'button', on: { click: () => { path = path.concat([o]); paint(); } } },
          h('b', null, md(o.label)), o.sub ? h('span', null, md(o.sub)) : null))));
      } else {
        const r = T.results[cur];
        const L = r.line && LINES[r.line];
        const card = h('div', { cls: 'card p20 stack g12 result', style: L ? { borderTop: '6px solid ' + color(L) } : null },
          eyebrow('Answer'), h('h2', { style: { color: L ? tcolor(L) : null } }, md(r.title)), P(r.text));
        if (r.facts) card.appendChild(h('ul', null, r.facts.map(f => h('li', null, md(f)))));
        if (r.update) card.appendChild(callout(r.update, 'update'));
        if (r.whyNot) card.appendChild(h('div', { cls: 'stack g6' }, eyebrow('Why not', 'sm'), h('ul', null, r.whyNot.map(w => h('li', null, h('b', null, md(w[0])), ' — ', md(w[1]))))));
        box.appendChild(card);
      }
    };
    paint();
    return box;
  }

  /* ================= compare figure (mockup 04) ================= */
  function pairFig(fig, L) {
    const c = L ? color(L) : 'var(--ink2)';
    const f = fig || {};
    const svgEl = s('svg', { viewBox: '0 0 150 74', width: '100%', height: 74, 'aria-hidden': 'true' });
    svgEl.appendChild(s('rect', { x: 0, y: 12, width: 40, height: 50, rx: 4, style: 'fill:var(--zone-onprem)' }));
    svgEl.appendChild(s('rect', { x: 110, y: 12, width: 40, height: 50, rx: 4, style: 'fill:var(--zone-aws)' }));
    svgEl.appendChild(s('text', { x: 20, y: 8, 'font-size': 9, 'text-anchor': 'middle', 'font-family': 'Overpass, sans-serif', style: 'fill:var(--ink2)', text: f.left || 'ON-PREM' }));
    svgEl.appendChild(s('text', { x: 130, y: 8, 'font-size': 9, 'text-anchor': 'middle', 'font-family': 'Overpass, sans-serif', style: 'fill:var(--ink2)', text: f.right || 'AWS' }));
    const dash = f.dash || (L && L.dash) ? '6 5' : null;
    const hasBox = f.cache;
    if (f.dir !== 'none') {
      const x1 = f.dir === 'both' || hasBox ? 46 : 40;
      svgEl.appendChild(s('line', { x1, y1: 37, x2: 104, y2: 37, stroke: c, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-dasharray': dash }));
      svgEl.appendChild(s('path', { d: 'M98 30 L108 37 L98 44', fill: 'none', stroke: c, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      if (f.dir === 'both') svgEl.appendChild(s('path', { d: 'M52 30 L42 37 L52 44', fill: 'none', stroke: c, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    } else {
      svgEl.appendChild(s('path', { d: 'M20 50 C20 66 130 66 130 50', fill: 'none', stroke: c, 'stroke-width': 3, 'stroke-dasharray': '3 4' }));
    }
    if (hasBox) {
      svgEl.appendChild(s('rect', { x: 8, y: 26, width: 24, height: 22, rx: 3, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:2' }));
      svgEl.appendChild(s('text', { x: 20, y: 41, 'font-size': 8, 'text-anchor': 'middle', 'font-family': 'Overpass, sans-serif', 'font-weight': 800, style: 'fill:var(--ink)', text: f.cacheLabel || 'cache' }));
    } else if (f.keep || f.dir === 'both' || f.dir === 'none') {
      svgEl.appendChild(s('rect', { x: 12, y: 28, width: 16, height: 18, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:2' }));
    } else {
      svgEl.appendChild(s('rect', { x: 12, y: 28, width: 16, height: 18, fill: 'none', 'stroke-dasharray': '3 3', style: 'stroke:var(--ink2);stroke-width:2' }));
    }
    svgEl.appendChild(s('rect', { x: 122, y: 28, width: 16, height: 18, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:2' }));
    return svgEl;
  }
  SAA.pairFig = pairFig;

  /* ================= session mount ================= */
  SAA.mount = function (S) {
    const SID = S.meta.id;
    LINES = {};
    (S.lines || []).forEach(l => { LINES[l.id] = l; });
    tipInit();
    const k = name => 'saa:' + SID + ':' + name;
    const mem = {}; // in-memory view state across tab switches
    const ui = store.get(k('ui'), {});
    const saveUi = () => store.set(k('ui'), ui);

    const groupName = id => (LINES[id] ? LINES[id].name : (S.topics && S.topics[id]) || id);
    const lineAlias = text => {
      const t = String(text).toLowerCase();
      for (const L of S.lines || []) for (const a of [L.name].concat(L.alias || [])) if (t.includes(a.toLowerCase())) return L;
      return null;
    };
    const totals = { chapters: (S.learn || []).length, drills: (S.drills || []).length, cards: (S.cards || []).length };

    /* ---- tabs ---- */
    const TABS = [];
    if (S.learn) TABS.push({ key: 'learn', label: 'Learn', icon: 'learn', title: 'Learn' });
    if (S.map) TABS.push({ key: 'map', label: 'Map', phone: 'Lines', icon: 'map', title: S.meta.brand });
    if (S.tree) TABS.push({ key: 'tree', label: S.tree.tab || S.tree.title, title: S.tree.title });
    (S.pages || []).forEach(p => TABS.push({ key: p.key, label: p.label, title: p.title || p.label, page: p }));
    if (S.compare) TABS.push({ key: 'compare', label: 'Compare', title: 'Compare' });
    if (S.cards) TABS.push({ key: 'cards', label: 'Trigger cards', phone: 'Cards', icon: 'cards', title: 'Trigger cards' });
    if (S.drills) TABS.push({ key: 'drill', label: 'Drill', icon: 'drill', title: 'Drill' });
    if (S.traps) TABS.push({ key: 'traps', label: 'Traps', title: 'Traps' });
    if (S.cheat) TABS.push({ key: 'cheat', label: 'Cheat sheet', title: 'Cheat sheet' });
    TABS.push({ key: 'progress', label: 'Progress', title: 'Progress' });
    const PRIMARY = ['learn', 'map', 'cards', 'drill'];

    /* ---- chrome ---- */
    const app = document.getElementById('app');
    clear(app);
    const home = S.meta.home || '../../';
    const mbar = h('i', { style: { width: '0%' } });
    const mnum = h('span', { cls: 'mnum' });
    const phTitle = h('div', { cls: 'ttl' });
    const phBar = h('div', { cls: 'bar thin', hidden: true }, h('i'));
    const phMeta = h('span', { cls: 'meta' });
    const hdr = h('header', { cls: 'hdr' },
      h('div', { cls: 'hdr-in hdr-desk' },
        h('a', { cls: 'brand', href: '#learn', text: S.meta.brand }),
        h('a', { cls: 'eyebrow', href: home, title: 'All sessions', text: 'SAA-C03 · Session ' + S.meta.n }),
        h('div', { cls: 'mastery', title: 'Mastery = chapters done + drills solved on the last try + cards in box 3 or higher' }, h('span', { text: 'Mastery' }), h('div', { cls: 'bar' }, mbar), mnum),
        themeButton()),
      h('div', { cls: 'hdr-in hdr-phone' }, phTitle, phBar, phMeta));
    const tabsIn = h('div', { cls: 'tabs-in', role: 'navigation', 'aria-label': 'Sections' });
    const tabLinks = {};
    TABS.forEach(t => { tabLinks[t.key] = h('a', { cls: 'tab', href: '#' + t.key, text: t.label }); tabsIn.appendChild(tabLinks[t.key]); });
    const main = h('main', { id: 'main' });
    const panel = h('div', { cls: 'panel' });
    main.appendChild(panel);

    /* phone bottom bar + More sheet */
    const bbar = h('nav', { cls: 'bbar', 'aria-label': 'Sections' });
    const bLinks = {};
    PRIMARY.forEach(key => {
      const t = TABS.find(x => x.key === key);
      if (!t) return;
      bLinks[key] = h('a', { href: '#' + key }, icon(t.icon), t.phone || t.label);
      bbar.appendChild(bLinks[key]);
    });
    const sheet = h('div', { cls: 'sheet', role: 'dialog', 'aria-label': 'More sections' });
    const sheetBd = h('div', { cls: 'sheet-bd' });
    const closeSheet = () => { sheet.classList.remove('open'); sheetBd.classList.remove('open'); };
    const moreBtn = h('button', { type: 'button', 'aria-haspopup': 'dialog', on: { click: () => { sheet.classList.add('open'); sheetBd.classList.add('open'); } } }, icon('more'), 'More');
    bbar.appendChild(moreBtn);
    sheetBd.addEventListener('click', closeSheet);
    sheet.appendChild(h('div', { cls: 'row between' }, h('b', { cls: 'step', text: 'More' }), h('button', { cls: 'tbtn', type: 'button', text: 'Close', on: { click: closeSheet } })));
    TABS.filter(t => !PRIMARY.includes(t.key)).forEach(t => sheet.appendChild(h('a', { cls: 'bigopt', href: '#' + t.key, on: { click: closeSheet } }, h('b', { text: t.label }))));
    sheet.appendChild(h('a', { cls: 'bigopt', href: home }, h('b', { text: 'All sessions' }), h('span', { text: 'the hub: diagnosis, knowledge map, every session' })));
    sheet.appendChild(h('div', { cls: 'row between', style: { minHeight: '48px' } }, h('span', { text: 'Theme' }), themeButton()));

    add(app, [hdr, h('nav', { cls: 'tabs', 'aria-label': 'Sections' }, tabsIn), main, bbar, sheetBd, sheet]);

    function paintMastery() {
      const p = readProgress(SID, totals);
      mbar.style.width = p.pct + '%';
      mnum.textContent = p.done + ' / ' + p.total;
      return p;
    }
    let headFromView = false;
    function head(o) {
      headFromView = !!o;
      const p = paintMastery();
      phTitle.textContent = (o && o.title) || S.meta.brand;
      phMeta.textContent = (o && o.meta != null) ? o.meta : p.done + '/' + p.total;
      if (o && o.bar != null) { phBar.hidden = false; phBar.firstChild.style.width = Math.round(o.bar * 100) + '%'; } else phBar.hidden = true;
    }

    /* ---- ctx passed to views and widgets ---- */
    const ctx = { S, k, store, mem, ui, saveUi, md, h, s, go, groupName, lineAlias, LINES, head, paintMastery, color, tcolor, lineVars, swatch, checkpoint, callout, table, hbars, mountChart, eyebrow };
    SAA.ctx = ctx;

    /* ---- router: #tab/arg ---- */
    function parse() {
      const raw = decodeURIComponent((location.hash || '').replace(/^#/, ''));
      const [key, ...rest] = raw.split('/');
      const t = TABS.find(x => x.key === key);
      return { key: t ? t.key : TABS[0].key, arg: rest.join('/') || null };
    }
    function go(key, arg) { const h2 = '#' + key + (arg ? '/' + arg : ''); if (location.hash === h2) render(); else location.hash = h2; }
    let lastKey = null;
    function render() {
      const { key, arg } = parse();
      Object.keys(tabLinks).forEach(x => tabLinks[x].setAttribute('aria-current', x === key ? 'page' : 'false'));
      Object.keys(bLinks).forEach(x => bLinks[x].setAttribute('aria-current', x === key ? 'page' : 'false'));
      moreBtn.setAttribute('aria-current', PRIMARY.includes(key) ? 'false' : 'page');
      clear(panel);
      const t = TABS.find(x => x.key === key);
      head({ title: t.title });
      const v = VIEWS[t.page ? 'page' : key];
      v(panel, arg, t);
      document.title = t.label + ' — ' + S.meta.brand + ' · SAA-C03 Session ' + S.meta.n;
      if (lastKey !== key || key === 'learn') window.scrollTo(0, 0);
      lastKey = key;
    }
    window.addEventListener('hashchange', render);

    /* ---- block renderer (Learn chapters and pages) ---- */
    function blocks(list, keyBase) {
      const out = [];
      (list || []).forEach((b, i) => {
        const key = keyBase + '.' + i;
        if (typeof b === 'string') { out.push(P(b)); return; }
        if (b.h) out.push(h('h2', null, md(b.h)));
        else if (b.h3) out.push(h('h3', null, md(b.h3)));
        else if (b.p) out.push(P(b.p, b.muted ? 'muted' : null));
        else if (b.ul) out.push(h('ul', null, b.ul.map(x => h('li', null, md(x)))));
        else if (b.ol) out.push(h('ol', null, b.ol.map(x => h('li', null, md(x)))));
        else if (b.table) out.push(h('div', { cls: 'stack g8' }, b.table.label ? eyebrow(b.table.label) : null, table(b.table)));
        else if (b.callout) out.push(callout(b.callout, b.kind, b.title));
        else if (b.pre) out.push(pre(b.pre, b.label));
        else if (b.hooks) out.push(h('div', { cls: 'stack g8' }, eyebrow(b.label || 'Memory hooks'), h('div', { cls: 'hooks' }, b.hooks.map(([x, y]) => h('div', null, h('b', null, md(x)), h('span', null, md(y)))))));
        else if (b.check) out.push(checkpoint(b.check, b.check.id || key, ctx));
        else if (b.widget) {
          const w = widgets[b.widget];
          out.push(w ? w(b.args || {}, ctx) : callout('Widget “' + b.widget + '” is missing.', 'small'));
        } else if (b.pair) out.push(h('div', { cls: 'stack g12' }, eyebrow('Compare · ' + (S.compare.find(x => x.id === b.pair) || {}).short), pairBlock(S.compare.find(x => x.id === b.pair), true)));
        else if (b.map) out.push(mapBlock());
        else if (b.lines) out.push(h('div', { cls: 'grid g2' }, (S.lines || []).filter(L => !b.only || b.only.includes(L.id)).map(lineCard)));
        else if (b.link) out.push(h('div', null, h('a', { cls: b.btn ? 'btn' : null, href: b.link }, md(b.text))));
        else if (b.log) out.push(logTable());
        else if (b.mechanics) out.push(h('div', { cls: 'grid g2' }, b.mechanics.map(([x, y]) => h('div', { cls: 'mech' }, h('b', { text: x }), h('span', { text: y })))));
        else if (b.drills) out.push(h('div', { cls: 'row', style: { gap: '6px' } }, h('span', { cls: 'small muted', text: b.label || 'Drill it:' }), b.drills.map(id => h('a', { cls: 'vt', href: '#drill/' + id, text: id }))));
      });
      return out;
    }
    ctx.blocks = blocks;

    function lineCard(L) {
      return h('div', { cls: 'lcard' },
        s('svg', { width: '100%', height: 18, viewBox: '0 0 300 18', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
          s('line', { x1: 8, y1: 9, x2: 292, y2: 9, stroke: color(L), 'stroke-width': L.dash ? 6 : 8, 'stroke-dasharray': L.dash || null, 'stroke-linecap': 'round' }),
          s('circle', { cx: 9, cy: 9, r: 6, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:3' })),
        h('b', { style: { color: tcolor(L) }, text: L.name }),
        h('span', null, h('b', { style: { fontFamily: 'var(--f-body)', fontSize: '15px' }, text: L.verb.split(' ')[0].toUpperCase() + ' ' }), L.verb.split(' ').slice(1).join(' ')),
        L.built ? P(L.built, 'small muted') : null);
    }

    function logTable() {
      return table({ head: ['When', 'What', 'Result', 'Lesson'], rows: (S.log || []).map(l => [l.when, l.what, '**' + l.result + '**', l.lesson]) });
    }

    const VIEWS = {};

    /* ================= LEARN ================= */
    VIEWS.learn = function (el, arg) {
      const chs = S.learn;
      const done = store.get(k('learn'), {});
      let idx = Math.max(0, chs.findIndex(c => c.id === arg));
      if (!arg && ui.lastCh) idx = Math.max(0, chs.findIndex(c => c.id === ui.lastCh));
      const ch = chs[idx];
      ui.lastCh = ch.id; saveUi();
      const nDone = chs.filter(c => done[c.id]).length;
      head({ title: 'Learn', meta: nDone + ' / ' + chs.length + ' done' });

      const list = h('nav', { cls: 'chlist', 'aria-label': 'Chapters' },
        h('div', { cls: 'hd' }, eyebrow('Chapters'), h('span', { cls: 'mono small muted', text: nDone + ' / ' + chs.length })),
        chs.map((c, i) => h('a', { cls: 'chlink', href: '#learn/' + c.id, 'aria-current': String(i === idx) },
          h('span', { cls: 'n', text: String(i + 1).padStart(2, '0') }), h('span', { text: c.title }), h('span', { cls: 'ck', text: done[c.id] ? '✓' : '' }))));
      const sel = h('select', { cls: 'inp', 'aria-label': 'Chapter', on: { change: e => go('learn', e.target.value) } },
        chs.map((c, i) => h('option', { value: c.id, selected: i === idx }, (i + 1) + ' · ' + c.title + (done[c.id] ? '  ✓' : ''))));

      const art = h('article', { cls: 'chapter' },
        eyebrow('Chapter ' + (idx + 1) + ' of ' + chs.length + (ch.domains ? ' · ' + ch.domains : '')),
        h('h1', null, md(ch.title)),
        ch.lead ? P(ch.lead, 'muted') : null,
        blocks(ch.blocks, ch.id));

      const doneBtn = h('button', { cls: done[ch.id] ? 'btn ghost' : 'btn', type: 'button', text: done[ch.id] ? '✓ Done — mark as not done' : 'Mark chapter done' });
      doneBtn.addEventListener('click', () => {
        const d = store.get(k('learn'), {});
        d[ch.id] = !d[ch.id]; if (!d[ch.id]) delete d[ch.id];
        store.set(k('learn'), d);
        if (d[ch.id] && chs[idx + 1]) go('learn', chs[idx + 1].id); else render();
      });
      const prev = chs[idx - 1], next = chs[idx + 1];
      art.appendChild(h('div', { cls: 'chfoot' },
        doneBtn,
        h('div', { cls: 'prevnext' },
          prev ? h('a', { href: '#learn/' + prev.id }, h('span', { cls: 'small muted', text: '← Previous' }), h('b', { text: prev.title })) : h('span'),
          next ? h('a', { cls: 'next', href: '#learn/' + next.id }, h('span', { cls: 'small muted', text: 'Next →' }), h('b', { text: next.title })) : h('a', { cls: 'next', href: '#drill' }, h('span', { cls: 'small muted', text: 'Then →' }), h('b', { text: 'The drill' })))));

      add(el, h('div', { cls: 'learn' }, list, h('div', null, h('div', { cls: 'chsel' }, sel), art)));
    };

    /* ================= MAP ================= */
    function mapSvg(sel, onPick) {
      const m = S.map;
      const root = s('svg', { viewBox: m.viewBox, 'font-family': 'Overpass, sans-serif', role: 'group', 'aria-label': m.title });
      const groups = {}, faders = [], strokes = [];
      m.items.forEach(it => {
        if (it.el === 'line') {
          const L = LINES[it.line];
          const g = s('g', { cls: 'mg', tabindex: 0, role: 'button', 'aria-label': L.name + ' line', data: { line: L.id } });
          const w = L.width || 8;
          it.paths.forEach(d => { const p = s('path', { d, fill: 'none', stroke: color(L), 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': L.dash || null }); strokes.push({ p, id: L.id, w }); g.appendChild(p); });
          (it.extra || []).forEach(e => g.appendChild(s(e.el, e.a, e.text || null)));
          (it.labels || []).forEach(lb => g.appendChild(s('text', { x: lb.x, y: lb.y, 'font-size': lb.size || 12, 'font-weight': 800, 'letter-spacing': lb.ls != null ? lb.ls : 1, 'text-anchor': lb.anchor || null, style: 'fill:' + tcolor(L), text: lb.t })));
          it.paths.forEach(d => g.appendChild(s('path', { cls: 'mhit', d })));
          g.addEventListener('click', () => onPick(L.id));
          g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(L.id); } });
          groups[L.id] = g;
          root.appendChild(g);
        } else {
          const a = Object.assign({}, it.a);
          const el = s(it.el, a, it.text || null);
          if (it.style) el.setAttribute('style', it.style);
          if (it.lines) faders.push({ el, lines: it.lines });
          const pk = it.pick || it.lines;
          if (pk) { el.classList.add('mclick'); el.addEventListener('click', () => onPick(pk[0])); }
          root.appendChild(el);
        }
      });
      const paint = id => {
        const gs = Object.values(groups);
        Object.keys(groups).forEach(x => { groups[x].style.opacity = !id || x === id ? '1' : '0.22'; groups[x].classList.add('mg'); });
        strokes.forEach(o => o.p.setAttribute('stroke-width', o.w + (o.id === id ? 2 : 0)));
        faders.forEach(o => { o.el.style.opacity = !id || o.lines.includes(id) ? '1' : '0.4'; });
        if (id && groups[id]) { const last = gs.reduce((a, g) => (a.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING ? g : a), gs[0]); if (last !== groups[id]) last.after(groups[id]); }
      };
      paint(sel);
      root._paint = paint;
      return root;
    }

    function sidePanel(id, opt) {
      const L = LINES[id];
      const box = h('div', { cls: 'side', style: lineVars(L) });
      box.appendChild(h('div', { cls: 'sidesel' }, h('i', { style: { background: L.dash ? 'repeating-linear-gradient(90deg,' + color(L) + ' 0 10px,transparent 10px 16px)' : color(L) } }), eyebrow('Line selected')));
      box.appendChild(h('h2', { style: { color: tcolor(L) }, text: L.name }));
      box.appendChild(P(L.built));
      if (L.says) box.appendChild(h('div', { cls: 'stack g8' }, eyebrow('Exam says'), h('div', { cls: 'row', style: { gap: '6px' } }, L.says.map(x => h('span', { cls: 'pill line', style: lineVars(L), text: x })))));
      if (L.switch) box.appendChild(h('div', { cls: 'stack g8' }, eyebrow('Switch lines when'),
        L.switch.map(sw => { const T = LINES[sw.to]; return h('button', { cls: 'swrow', type: 'button', on: { click: () => opt.onPick(sw.to) } }, h('span', { cls: 'dot', style: { background: color(T) } }), h('span', null, sw.when + ' → ', h('b', { text: T.short || T.name }))); })));
      const siteMiss = S.drills.filter(d => d.line === id && (store.get(k('drill'), {})[d.id] || {}).ok === false).map(d => d.id);
      if (L.misses || siteMiss.length) box.appendChild(callout((L.misses || '') + (siteMiss.length ? (L.misses ? ' ' : '') + 'In the drill: ' + siteMiss.join(', ') + '.' : ''), 'miss', 'Your misses on this line'));
      if (L.traps && L.traps.length) box.appendChild(h('div', { cls: 'stack g6' }, eyebrow('Traps on this line'), L.traps.map(x => h('p', { cls: 'small' }, '✗ ', md(x)))));
      if (L.update) box.appendChild(callout(L.update, 'update'));
      const n = S.drills.filter(d => d.line === id).length;
      if (n) box.appendChild(h('a', { cls: 'btn line', href: '#drill/line:' + id, style: lineVars(L), text: 'Drill ' + (L.short || L.name) + ' · ' + n + ' scenario' + (n > 1 ? 's' : '') }));
      return box;
    }

    function mapBlock() {
      let sel = mem.mapSel || S.map.defaultLine;
      const wrap = h('div', { cls: 'stack g12' });
      const sideBox = h('div');
      const pick = id => { sel = id; mem.mapSel = id; svgEl._paint(id); clear(sideBox).appendChild(sidePanel(id, { onPick: pick })); };
      const svgEl = mapSvg(sel, pick);
      sideBox.appendChild(sidePanel(sel, { onPick: pick }));
      add(wrap, [h('div', { cls: 'mapbox' }, svgEl), S.map.caption ? P(S.map.caption, 'chcap') : null, sideBox]);
      return wrap;
    }

    VIEWS.map = function (el, arg) {
      const lineArg = arg && LINES[arg] ? arg : null;
      if (phone()) {
        if (arg === 'full') {
          head({ title: S.map.title || 'Map' });
          el.appendChild(h('div', { cls: 'stack g12' }, h('div', { cls: 'row between base' }, h('h1', { cls: 'step', style: { fontSize: '24px' }, text: 'Full map' }), h('a', { href: '#map', style: { fontSize: '14px' }, text: 'Lines' })), P(S.map.lead, 'small muted'), mapBlock()));
          return;
        }
        head({});
        const top = h('div', { cls: 'stack g10' }, h('div', { cls: 'row between base' }, h('h1', { style: { fontSize: '24px' }, text: 'Pick a line' }), h('a', { href: '#map/full', style: { fontSize: '14px' }, text: 'Full map' })));
        if (lineArg) {
          top.appendChild(sidePanel(lineArg, { onPick: id => go('map', id) }));
        }
        (S.lines || []).forEach(L => {
          top.appendChild(h('a', { cls: 'linecard', href: '#map/' + L.id, 'aria-current': String(L.id === lineArg) },
            s('svg', { width: '100%', height: 12, viewBox: '0 0 330 12', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
              s('line', { x1: 6, y1: 6, x2: 324, y2: 6, stroke: color(L), 'stroke-width': L.dash ? 5 : 6, 'stroke-dasharray': L.dash ? '12 8' : null, 'stroke-linecap': 'round' })),
            h('div', { cls: 'lcname' }, h('b', { style: { color: tcolor(L) }, text: L.name }), h('span', { style: { fontSize: '14px', color: 'var(--ink2)' }, text: L.verb })),
            h('span', { style: { fontSize: '13px', color: 'var(--ink2)' }, text: L.from })));
        });
        el.appendChild(top);
        return;
      }
      let sel = lineArg || mem.mapSel || S.map.defaultLine;
      const aside = h('aside', { cls: 'stack g16' });
      const pick = id => { sel = id; mem.mapSel = id; svgEl._paint(id); paintSide(); history.replaceState(null, '', '#map/' + id); };
      const paintSide = () => { clear(aside); aside.appendChild(sidePanel(sel, { onPick: pick })); aside.appendChild(h('div', { cls: 'sidenote', text: 'Tap any line or station. Other lines fade so one route reads at a time.' })); };
      const svgEl = mapSvg(sel, pick);
      paintSide();
      el.appendChild(h('div', { cls: 'maplay' }, h('div', { cls: 'stack g8' }, h('div', { cls: 'mapbox' }, svgEl), S.map.caption ? P(S.map.caption, 'chcap') : null), aside));
    };

    /* ================= TREE ================= */
    VIEWS.tree = function (el) {
      head({ title: S.tree.title });
      el.appendChild(h('div', { cls: 'reading stack g16' },
        h('div', { cls: 'pagehd' }, h('h1', null, md(S.tree.title)), S.tree.lead ? P(S.tree.lead) : null),
        treeWidget(S.tree, ctx)));
    };

    /* ================= PAGES (built from blocks) ================= */
    VIEWS.page = function (el, arg, t) {
      const p = t.page;
      head({ title: p.title || p.label });
      el.appendChild(h('div', { cls: 'stack g16', style: { maxWidth: p.wide ? '1100px' : '880px' } },
        h('div', { cls: 'pagehd' }, h('h1', null, md(p.title || p.label)), p.lead ? P(p.lead) : null),
        blocks(p.blocks, 'page.' + p.key)));
    };

    /* ================= COMPARE ================= */
    function pairBlock(pr, embedded) {
      const n = pr.sides.length;
      const box = h('div', { cls: 'stack g16' });
      if (!embedded) box.appendChild(h('h2', { cls: 'hide-phone', style: { fontSize: '22px' } }, md(pr.title)));
      const cols = n === 2 ? 'repeat(2,minmax(0,1fr))' : (phone() ? '1fr' : 'repeat(' + n + ',minmax(0,1fr))');
      box.appendChild(h('div', { cls: 'pair', style: { gridTemplateColumns: cols } }, pr.sides.map(sd => {
        const L = sd.line ? LINES[sd.line] : null;
        return h('div', { cls: 'pcard', style: lineVars(L) }, h('b', { cls: 'pname', text: sd.name }), pairFig(sd.fig, L), h('span', { cls: 'gist' }, md(sd.gist)));
      })));
      const lab = phone() ? '84px' : '130px';
      box.appendChild(h('div', { cls: 'spec' }, pr.rows.map(r => {
        const vals = r.slice(1);
        const row = h('div', { cls: 'specrow', style: { gridTemplateColumns: lab + ' repeat(' + n + ',minmax(0,1fr))' } }, h('span', { text: r[0] }));
        vals.forEach((v, i) => row.appendChild(h('span', { style: i === vals.length - 1 && vals.length < n ? { gridColumn: 'span ' + (n - i) } : null }, md(v))));
        return row;
      })));
      if (pr.check) box.appendChild(quickCheck(pr));
      return box;
    }
    function quickCheck(pr) {
      const c = pr.check;
      const box = h('div', { cls: 'card stack g10', style: { padding: '14px' } });
      let chosen = null;
      const paint = () => {
        clear(box);
        box.appendChild(eyebrow('Quick check', 'sm'));
        box.appendChild(P(c.q, null));
        const grid = h('div', { cls: 'qcgrid', style: { gridTemplateColumns: 'repeat(' + Math.min(c.opts.length, phone() && c.opts.length > 2 ? 1 : c.opts.length) + ',minmax(0,1fr))' } });
        c.opts.forEach((o, i) => {
          const L = lineAlias(o);
          let cls = 'qcbtn';
          if (chosen != null) { if (i === c.a) cls += ' correct'; else if (i === chosen) cls += ' wrong'; }
          grid.appendChild(h('button', { cls, type: 'button', style: lineVars(L), disabled: chosen != null && i !== c.a && i !== chosen, text: o, on: { click: () => { if (chosen == null) { chosen = i; paint(); } } } }));
        });
        box.appendChild(grid);
        if (chosen != null) {
          box.appendChild(h('p', { cls: 'small ' + (chosen === c.a ? 'ok-t' : 'bad-t') }, chosen === c.a ? '✓ ' : '✕ ', md(c.why)));
          box.appendChild(h('div', null, h('button', { cls: 'linkbtn', type: 'button', text: 'Try again', on: { click: () => { chosen = null; paint(); } } })));
        }
      };
      paint();
      return box;
    }
    VIEWS.compare = function (el, arg) {
      const list = S.compare;
      const id = (arg && list.find(p => p.id === arg) && arg) || mem.pair || list[0].id;
      mem.pair = id;
      const i = list.findIndex(p => p.id === id);
      head({ title: 'Compare', meta: (i + 1) + ' of ' + list.length + ' pairs' });
      const chips = h('div', { cls: 'chiprow scroll' }, list.map(p => h('a', { cls: 'chip b', href: '#compare/' + p.id, 'aria-pressed': String(p.id === id), style: { textDecoration: 'none' }, text: p.short })));
      const wrap = h('div', { cls: 'stack g16', style: { maxWidth: '980px' } }, chips, pairBlock(list[i]));
      el.appendChild(wrap);
      const on = chips.querySelector('[aria-pressed="true"]');
      if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    };

    /* ================= CARDS (Leitner) ================= */
    VIEWS.cards = function (el) {
      const all = S.cards;
      const st = () => store.get(k('cards'), {});
      const boxOf = (c, m) => ((m || st())[c.id] || {}).box || 1;
      const dueNow = (c, m) => { const e = (m || st())[c.id]; return !e || !e.due || e.due <= Date.now(); };
      const dueToday = m => all.filter(c => { const e = m[c.id]; return !e || !e.due || e.due <= endOfToday(); }).length;
      const f = mem.cardFilter || 'due';
      const build = () => {
        const m = st();
        let q = all.filter(c => f === 'all' || (f === 'due' && dueNow(c, m)) || (f === 'mine' && c.mine) || f === c.line);
        q = shuffle(q).sort((a, b) => boxOf(a, m) - boxOf(b, m));
        return q.map(c => c.id);
      };
      if (!mem.cardQ || mem.cardQf !== f) { mem.cardQ = build(); mem.cardQf = f; mem.cardI = 0; mem.cardShown = false; }
      const m = st();
      head({ title: 'Trigger cards', meta: dueToday(m) + ' due today' });

      const counts = [1, 2, 3, 4, 5].map(b => all.filter(c => boxOf(c, m) === b).length);
      const curId = mem.cardQ[mem.cardI];
      const cur = all.find(c => c.id === curId);
      const curBox = cur ? boxOf(cur, m) : 0;
      const boxes = h('div', { cls: 'boxes', 'aria-label': 'Leitner boxes' }, counts.map((n, i) => h('div', { cls: 'boxn' + (curBox === i + 1 ? ' on' : '') }, h('b', { text: String(n) }), h('span', { text: i === 4 ? 'known' : 'box ' + (i + 1) }))));

      const groups = Array.from(new Set(all.map(c => c.line)));
      const setF = v => { mem.cardFilter = v; mem.cardQ = null; render(); };
      const fchips = h('div', { cls: 'chiprow scroll' },
        [['due', 'Due now'], ['all', 'All ' + all.length], ['mine', 'From my misses']].map(([v, t]) => h('button', { cls: 'chip b', type: 'button', 'aria-pressed': String(f === v), text: t, on: { click: () => setF(v) } })),
        groups.map(g => h('button', { cls: 'chip b', type: 'button', 'aria-pressed': String(f === g), on: { click: () => setF(g) } }, LINES[g] ? h('span', { cls: 'dot', style: { background: color(LINES[g]) } }) : null, groupName(g))));

      const col = h('div', { cls: 'cardcol' }, boxes);
      if (!cur) {
        const next = all.map(c => (m[c.id] || {}).due).filter(Boolean).sort()[0];
        col.appendChild(h('div', { cls: 'card stack g10' }, h('h2', { cls: 'step', text: f === 'due' ? 'Nothing due right now.' : 'Set finished.' }),
          P(next && f === 'due' ? 'Next card is due ' + new Date(next).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) + '. You can still run every card.' : 'Pick another set, or run all of them again.', 'muted'),
          h('div', null, h('button', { cls: 'btn', type: 'button', text: 'Run all ' + all.length + ' cards', on: { click: () => setF('all') } }))));
      } else {
        const L = LINES[cur.line];
        const fc = h('div', { cls: 'fc', style: lineVars(L) },
          h('div', { cls: 'front' }, eyebrow('The exam says', 'sm'), h('p', null, '“', md(cur.f), '”')));
        if (mem.cardShown) {
          fc.appendChild(h('div', { cls: 'fcbar' + (L && L.dash ? ' dash' : ''), style: L ? null : { background: 'var(--ink)' } }));
          fc.appendChild(h('div', { cls: 'back' + (L ? '' : ' neutral') },
            h('span', { cls: 'eyebrow sm', style: { color: tcolor(L) }, text: L ? (L.short || L.name) + ' line' : groupName(cur.line) }),
            h('div', { cls: 'svc' }, md(cur.b)),
            cur.why ? P(cur.why) : null,
            cur.tempt ? h('p', { cls: 'temp' }, h('b', { text: 'Tempting: ' }), md(cur.tempt)) : null,
            cur.update ? callout(cur.update, 'small', 'Changed since the exam guide') : null,
            cur.mine ? h('span', { cls: 'ref', text: 'from your exam · ' + cur.src }) : cur.src ? h('span', { cls: 'ref', text: 'from ' + cur.src }) : null));
        }
        col.appendChild(fc);
        if (!mem.cardShown) {
          col.appendChild(h('button', { cls: 'btn wide', type: 'button', text: 'Show answer', on: { click: () => { mem.cardShown = true; render(); } } }));
          col.appendChild(h('p', { cls: 'small muted', text: 'Say the service out loud first. Recall before reveal.' }));
        } else {
          const b = curBox;
          const rate = kind => {
            const mm = st();
            const e = mm[cur.id] || { box: 1 };
            let nb = e.box || 1;
            if (kind === 'miss') nb = 1; else if (kind === 'knew') nb = Math.min(5, nb + 1);
            mm[cur.id] = { box: nb, due: kind === 'miss' ? Date.now() : Date.now() + INTERVAL[nb] * DAY, n: (e.n || 0) + 1, last: kind };
            store.set(k('cards'), mm);
            if (kind === 'miss') mem.cardQ.push(cur.id); // comes back this sitting
            mem.cardI++; mem.cardShown = false; render();
          };
          col.appendChild(h('div', { cls: 'rate' },
            h('button', { cls: 'rmiss', type: 'button', on: { click: () => rate('miss') } }, 'Missed', h('span', { text: '→ box 1' })),
            h('button', { type: 'button', on: { click: () => rate('hes') } }, 'Hesitated', h('span', { text: 'stay' })),
            h('button', { cls: 'rknew', type: 'button', on: { click: () => rate('knew') } }, 'Knew it', h('span', { text: b >= 5 ? 'stays known' : '→ box ' + (b + 1) }))));
        }
        col.appendChild(h('p', { cls: 'mono small muted', text: (mem.cardI + 1) + ' / ' + mem.cardQ.length + ' in this set · boxes return after 1 / 2 / 4 / 8 days, known after 16' }));
      }
      el.appendChild(h('div', { cls: 'stack g16' }, fchips, col));
    };

    /* ================= DRILL ================= */
    const TAGS = [['F', 'fact'], ['C', 'confused'], ['K', 'keyword'], ['R', 'misread'], ['A', 'reasoning'], ['L', 'limit']];
    VIEWS.drill = function (el, arg) {
      const D = S.drills;
      const res = store.get(k('drill'), {});
      if (arg && arg.startsWith('line:')) { ui.drillF = { mode: 'line', line: arg.slice(5) }; saveUi(); mem.drillSet = null; history.replaceState(null, '', '#drill'); }
      const f = ui.drillF || { mode: 'all' };
      const fkey = JSON.stringify(f);
      const inF = d => f.mode === 'all' || (f.mode === 'line' && d.line === f.line) ||
        (f.mode === 'mine' && (d.mine || (res[d.id] && res[d.id].ok === false))) || (f.mode === 'unsolved' && !(res[d.id] && res[d.id].ok));
      if (!mem.drillSet || mem.drillF !== fkey) { mem.drillSet = shuffle(D.filter(inF).map(d => d.id)); mem.drillF = fkey; mem.drillI = 0; mem.work = null; }
      if (arg && /^[A-Z]\d+$/.test(arg) && D.find(d => d.id === arg)) {
        if (mem.drillSet[mem.drillI] !== arg) { mem.drillSet = [arg].concat(mem.drillSet.filter(x => x !== arg)); mem.drillI = 0; mem.work = null; }
        history.replaceState(null, '', '#drill');
      }
      const set = mem.drillSet;
      const setF = nf => { ui.drillF = nf; saveUi(); mem.drillSet = null; render(); };

      const groups = Array.from(new Set(D.map(d => d.line)));
      const nMine = D.filter(d => d.mine || (res[d.id] && res[d.id].ok === false)).length;
      const nUns = D.filter(d => !(res[d.id] && res[d.id].ok)).length;
      const fchips = h('div', { cls: 'chiprow scroll', 'aria-label': 'Drill set' },
        h('button', { cls: 'chip b', type: 'button', 'aria-pressed': String(f.mode === 'all'), text: 'All ' + D.length, on: { click: () => setF({ mode: 'all' }) } }),
        h('button', { cls: 'chip b', type: 'button', 'aria-pressed': String(f.mode === 'mine'), text: 'My misses ' + nMine, on: { click: () => setF({ mode: 'mine' }) } }),
        h('button', { cls: 'chip b', type: 'button', 'aria-pressed': String(f.mode === 'unsolved'), text: 'Not yet solved ' + nUns, on: { click: () => setF({ mode: 'unsolved' }) } }),
        groups.map(g => h('button', { cls: 'chip b', type: 'button', 'aria-pressed': String(f.mode === 'line' && f.line === g), on: { click: () => setF({ mode: 'line', line: g }) } },
          LINES[g] ? h('span', { cls: 'dot', style: { background: color(LINES[g]) } }) : null, groupName(g) + ' ' + D.filter(d => d.line === g).length)));

      const col = h('div', { cls: 'drillcol' }, fchips);
      el.appendChild(col);

      if (mem.drillI >= set.length) {
        head({ title: 'Drill', meta: set.length + ' / ' + set.length, bar: 1 });
        const ok = set.filter(id => res[id] && res[id].ok).length;
        col.appendChild(h('div', { cls: 'card stack g10' }, h('h2', { cls: 'step', text: set.length ? 'Set done: ' + ok + ' / ' + set.length + ' right on the last try.' : 'No scenarios in this set.' }),
          P('A new shuffle mixes the lines again, so you choose instead of recognising.', 'muted'),
          h('div', { cls: 'row' }, h('button', { cls: 'btn', type: 'button', text: 'New shuffled set', on: { click: () => { mem.drillSet = null; render(); } } }),
            h('a', { cls: 'btn ghost', href: '#progress', text: 'See progress' }))));
        return;
      }
      const d = D.find(x => x.id === set[mem.drillI]);
      if (!mem.work || mem.work.id !== d.id) mem.work = { id: d.id, stub: {}, picks: new Set(), crossed: {}, openX: null, done: false };
      const w = mem.work;
      head({ title: 'Drill', meta: (mem.drillI + 1) + ' / ' + set.length, bar: (mem.drillI + 1) / set.length });
      const correct = d.opts.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0);
      const need = correct.length;
      const prev = res[d.id];

      /* scenario */
      const qNode = h('p', { cls: 'scen' });
      const paintQ = () => {
        clear(qNode);
        if (!w.done || !d.words || !d.words.length) { add(qNode, md(d.q)); return; }
        const esc = d.words.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length);
        const re = new RegExp('(' + esc.join('|') + ')', 'gi');
        d.q.split(re).forEach((part, i) => qNode.appendChild(i % 2 ? h('mark', { text: part }) : document.createTextNode(part)));
      };
      paintQ();
      const eb = [d.src || d.id];
      if (d.mine) eb.push('you missed this');
      else if (prev && prev.ok === false) eb.push('missed last time');
      if (need > 1) eb.push('pick ' + need);
      col.appendChild(h('div', { cls: 'card stack g8' }, h('div', { cls: 'row', style: { gap: '6px' } }, h('span', { cls: 'eyebrow sm', text: eb.join(' · ') })), qNode));

      /* step 1: stub */
      const stubFilled = () => S.stub.every(sl => w.stub[sl.id]);
      const stubBox = h('div', { cls: 'stack g12' });
      const paintStub = () => {
        clear(stubBox);
        stubBox.appendChild(h('div', { cls: 'row between base' }, h('h2', { cls: 'step', text: '1 · Fill the stub' }), stubFilled() ? h('span', { cls: 'small ok-t', text: 'done' }) : h('span', { cls: 'small muted', text: 'options unlock when all ' + S.stub.length + ' are set' })));
        S.stub.forEach(sl => stubBox.appendChild(h('div', { cls: 'stubrow' }, h('span', { cls: 'stublab', text: sl.label }),
          h('div', { cls: 'chiprow' }, sl.values.map(v => h('button', { cls: 'chip', type: 'button', disabled: w.done, 'aria-pressed': String(w.stub[sl.id] === v), text: v, on: { click: () => { w.stub[sl.id] = v; paintStub(); paintOpts(); } } }))))));
      };
      col.appendChild(stubBox);

      /* step 2: options */
      const optBox = h('div', { cls: 'stack g10' });
      const REASONS = S.stub.map(sl => 'violates ' + sl.short).concat(['wrong job for the service', 'false / impossible']);
      const paintOpts = () => {
        clear(optBox);
        optBox.appendChild(h('h2', { cls: 'step', text: '2 · Cross out, then pick' + (need > 1 ? ' ' + need : '') }));
        if (!w.done) optBox.appendChild(h('p', { cls: 'small muted', text: 'For each option ask what the service was built for. ✗ crosses it out with the constraint it breaks.' }));
        const list = h('div', { cls: 'optlist' + (!stubFilled() && !w.done ? ' locked' : ''), 'aria-disabled': String(!stubFilled() && !w.done) });
        d.opts.forEach((o, i) => {
          const picked = w.picks.has(i), crossed = w.crossed[i];
          let cls = 'opt', note = null;
          if (w.done) {
            if (o.ok) { cls += ' correct'; note = (picked ? '✓ correct' : crossed ? '✓ the answer — you crossed it out (' + crossed + ')' : '✓ the answer') + ' · ' + o.why; }
            else if (picked) { cls += ' wrong'; note = '✕ your pick · ' + o.why; }
            else if (crossed) { cls += ' crossed'; note = '✗ ' + o.why + ' (you: ' + crossed + ')'; }
            else { cls += ' rest'; note = '· ' + o.why; }
          } else if (crossed) { cls += ' crossed'; note = '✗ ' + crossed; }
          else if (picked) cls += ' picked';
          const txt = h('span', { cls: 'otxt' }, md(o.t));
          const top = h('div', { cls: 'otop' }, h('b', { cls: 'okey', text: LET[i] }), txt);
          const row = h('div', { cls, role: w.done ? null : 'button', tabindex: w.done ? null : 0, 'aria-pressed': w.done ? null : String(picked), style: w.done ? null : { cursor: 'pointer' } }, top);
          if (!w.done) {
            const x = h('button', { cls: 'xbtn', type: 'button', 'aria-label': crossed ? 'Restore option ' + LET[i] : 'Cross out option ' + LET[i], text: crossed ? '↺' : '✗' });
            x.addEventListener('click', e => { e.stopPropagation(); if (crossed) { delete w.crossed[i]; w.openX = null; } else w.openX = w.openX === i ? null : i; paintOpts(); });
            top.appendChild(x);
            const onPick = () => {
              if (crossed) { delete w.crossed[i]; }
              else if (need > 1) { picked ? w.picks.delete(i) : w.picks.add(i); }
              else { w.picks = picked ? new Set() : new Set([i]); }
              w.openX = null; paintOpts();
            };
            row.addEventListener('click', onPick);
            row.addEventListener('keydown', e => { if (e.target === row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPick(); } });
          }
          if (note) row.appendChild(h('span', { cls: 'why' }, md(note)));
          if (!w.done && w.openX === i) row.appendChild(h('div', { cls: 'reasons' }, REASONS.map(r => h('button', { cls: 'chip b', type: 'button', text: r, on: { click: e => { e.stopPropagation(); w.crossed[i] = r; w.picks.delete(i); w.openX = null; paintOpts(); } } }))));
          list.appendChild(row);
        });
        optBox.appendChild(list);
        if (!w.done) optBox.appendChild(h('button', { cls: 'btn', type: 'button', disabled: !stubFilled() || w.picks.size !== need, text: w.picks.size === need ? 'Check' : need > 1 ? 'Pick ' + need : 'Pick one', on: { click: submit } }));
      };
      col.appendChild(optBox);

      /* step 3: where it broke */
      const brokeBox = h('div');
      col.appendChild(brokeBox);
      function submit() {
        w.done = true;
        const ok = w.picks.size === need && correct.every(i => w.picks.has(i));
        const stubOk = {};
        S.stub.forEach(sl => { const t = d.stub[sl.id]; stubOk[sl.id] = t === 'any' || t === w.stub[sl.id]; });
        const r = store.get(k('drill'), {});
        const p = r[d.id] || {};
        r[d.id] = { ok, n: (p.n || 0) + 1, ever: p.ever || ok, stub: stubOk, tag: ok ? p.tag || null : p.tag || null, at: Date.now() };
        store.set(k('drill'), r);
        w.result = r[d.id];
        paintQ(); paintStub(); paintOpts(); paintBroke();
        head({ title: 'Drill', meta: (mem.drillI + 1) + ' / ' + set.length, bar: (mem.drillI + 1) / set.length });
        brokeBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      function paintBroke() {
        clear(brokeBox);
        if (!w.done) return;
        const r = w.result;
        const allStub = Object.values(r.stub).every(Boolean);
        const card = h('div', { cls: 'card stack g10' },
          h('div', { cls: 'row between base' }, h('h2', { cls: 'step', text: '3 · ' + (r.ok && allStub ? 'Clean run' : 'Where it broke') }), h('span', { cls: 'small ' + (r.ok ? 'ok-t' : 'bad-t'), text: r.ok ? 'right answer' : 'wrong answer' })),
          h('div', { cls: 'row', style: { gap: '10px' } }, S.stub.map(sl => h('span', { cls: 'vt ' + (r.stub[sl.id] ? 'y' : 'n'), text: sl.short + (r.stub[sl.id] ? ' ✓' : ' ✕') }))));
        S.stub.filter(sl => !r.stub[sl.id]).forEach(sl => card.appendChild(h('p', { cls: 'small' }, md('**' + sl.short + '** was **' + d.stub[sl.id] + '** — you set ' + w.stub[sl.id] + '.'))));
        card.appendChild(P(d.expl, 'scen'));
        if (d.update) card.appendChild(callout(d.update, 'update'));
        if (!r.ok || !allStub) {
          const tagRow = h('div', { cls: 'row', style: { gap: '8px' } }, h('span', { cls: 'small muted', text: 'Tag the miss' }));
          const paintTags = () => {
            while (tagRow.children.length > 1) tagRow.removeChild(tagRow.lastChild);
            const cur = (store.get(k('drill'), {})[d.id] || {}).tag;
            TAGS.forEach(([t, n]) => tagRow.appendChild(h('button', { cls: 'vt', type: 'button', 'aria-pressed': String(cur === t), text: t + ' · ' + n, on: { click: () => { const rr = store.get(k('drill'), {}); rr[d.id].tag = rr[d.id].tag === t ? null : t; store.set(k('drill'), rr); paintTags(); } } })));
          };
          paintTags();
          card.appendChild(tagRow);
        }
        card.appendChild(h('button', { cls: 'btn', type: 'button', text: mem.drillI + 1 < set.length ? 'Next scenario' : 'Finish set', on: { click: () => { mem.drillI++; mem.work = null; render(); } } }));
        brokeBox.appendChild(card);
      }
      paintStub(); paintOpts(); paintBroke();
      if (S.method) col.appendChild(h('details', { cls: 'method' }, h('summary', { text: 'The reduction method' }), h('pre', { cls: 'pre', style: { border: 0, padding: 0 }, text: S.method })));
    };

    /* ================= TRAPS ================= */
    VIEWS.traps = function (el) {
      head({ title: 'Traps', meta: S.traps.length + ' traps' });
      el.appendChild(h('div', { cls: 'stack g16', style: { maxWidth: '1100px' } },
        h('div', { cls: 'pagehd' }, h('h1', { text: 'Traps' }), P('Each one is a tempting wrong answer that has cost points before. The chips open the drills that test it.')),
        h('div', { cls: 'grid g2' }, S.traps.map((t, i) => h('div', { cls: 'card trap' },
          h('div', { cls: 'row base', style: { gap: '8px', flexWrap: 'nowrap' } }, h('span', { cls: 'mono small muted', text: String(i + 1).padStart(2, '0') }), h('h3', null, md(t.title))),
          P(t.x),
          t.drills && t.drills.length ? h('div', { cls: 'row', style: { gap: '6px' } }, h('span', { cls: 'small muted', text: 'Drill it:' }), t.drills.map(id => h('a', { cls: 'vt', href: '#drill/' + id, text: id }))) : null)))));
    };

    /* ================= CHEAT ================= */
    VIEWS.cheat = function (el) {
      head({ title: 'Cheat sheet' });
      el.appendChild(h('div', { cls: 'stack g16', style: { maxWidth: '980px' } },
        h('div', { cls: 'pagehd noprint' }, h('h1', { text: 'Cheat sheet' }), P('Copy it by hand once; the copying is the point. It prints on one A5 page.')),
        h('div', { cls: 'noprint' }, h('button', { cls: 'btn ghost sm', type: 'button', text: 'Print', on: { click: () => window.print() } })),
        S.method ? pre(S.method, 'The method') : null,
        pre(S.cheat, S.meta.title)));
    };

    /* ================= PROGRESS ================= */
    VIEWS.progress = function (el) {
      const p = paintMastery();
      head({ title: 'Progress', meta: p.pct + '%' });
      const res = store.get(k('drill'), {}), cst = store.get(k('cards'), {}), learnD = store.get(k('learn'), {}), chk = store.get(k('check'), {});
      const tried = Object.keys(res).filter(id => S.drills.some(d => d.id === id));
      const stats = h('div', { cls: 'stats' },
        [[p.pct + '%', 'mastery'], [p.chapters + ' / ' + totals.chapters, 'chapters done'], [p.drills + ' / ' + totals.drills, 'drills solved on the last try'],
          [p.cards3 + ' / ' + totals.cards, 'cards in box 3+'], [Object.values(chk).filter(x => x.ok).length + ' / ' + Object.keys(chk).length, 'checkpoints right (last try)']]
          .map(([a, b]) => h('div', { cls: 'stat' }, h('b', { text: a }), h('span', { text: b }))));

      const groups = Array.from(new Set(S.drills.map(d => d.line)));
      const acc = groups.map(g => {
        const ds = S.drills.filter(d => d.line === g), t = ds.filter(d => res[d.id]), okN = t.filter(d => res[d.id].ok).length;
        return { label: groupName(g), line: LINES[g] || null, value: t.length ? Math.round((okN / t.length) * 100) : 0, text: t.length ? okN + '/' + t.length : '—', tip: groupName(g) + ': ' + okN + ' of ' + t.length + ' tried solved on the last try (' + ds.length + ' in the bank)', soft: !t.length };
      });
      const slotMiss = S.stub.map(sl => { const n = tried.filter(id => res[id].stub && res[id].stub[sl.id] === false).length; return { label: sl.label, value: n, tip: sl.label + ': wrong on ' + n + ' of ' + tried.length + ' drills (last try)' }; });
      const boxN = [1, 2, 3, 4, 5].map(b => { const n = S.cards.filter(c => ((cst[c.id] || {}).box || 1) === b).length; return { label: b === 5 ? 'box 5 · known' : 'box ' + b, value: n, tip: (b === 1 ? 'Box 1 includes cards you have not seen yet. ' : '') + n + ' cards' }; });
      const tagN = TAGS.map(([t, n]) => { const c = tried.filter(id => res[id].tag === t).length; return { label: t + ' · ' + n, value: c, tip: c + ' drill misses tagged ' + t + ' (' + n + ')' }; });

      const chart = (title, node, cap) => h('div', { cls: 'card stack g10' }, h('h2', { cls: 'step', text: title }), node, cap ? P(cap, 'chcap') : null);
      el.appendChild(h('div', { cls: 'stack g16', style: { maxWidth: '1100px' } },
        h('div', { cls: 'pagehd' }, h('h1', { text: 'Progress' }), P('Mastery counts chapters done, drills solved on the last try, and cards in box 3 or higher. Stored in this browser only.')),
        stats,
        h('div', { cls: 'grid g2' },
          chart('Drill accuracy by line', hbars({ rows: acc, max: 100, ticks: [0, 25, 50, 75, 100], fmt: v => v + '%', title: 'Drill accuracy by line' }), 'Last try per scenario. A dash means nothing tried on that line yet.'),
          chart('Stub slots missed', hbars({ rows: slotMiss, title: 'Stub slots missed' }), 'The slot you misread most is the habit to fix first.'),
          chart('Leitner boxes', hbars({ rows: boxN, title: 'Leitner box distribution' }), 'Missed → box 1. Knew it → one box up.'),
          chart('Miss tags', hbars({ rows: tagN, title: 'Miss tag counts' }), 'Tags you set in the drill’s “Where it broke” step.')),
        h('div', { cls: 'card stack g10' }, h('h2', { cls: 'step', text: 'Chapters' }),
          h('div', { cls: 'grid g2', style: { gap: '4px 16px' } }, S.learn.map((c, i) => h('a', { href: '#learn/' + c.id, cls: 'row', style: { gap: '8px', flexWrap: 'nowrap', textDecoration: 'none', color: 'var(--ink)', minHeight: '36px' } },
            h('span', { cls: 'mono small ' + (learnD[c.id] ? 'ok-t' : 'muted'), text: learnD[c.id] ? '✓' : String(i + 1).padStart(2, '0') }), h('span', { text: c.title }))))),
        h('div', { cls: 'stack g10' }, h('h2', { cls: 'step', text: 'Session log' }), logTable()),
        h('div', { cls: 'row' }, h('button', { cls: 'btn ghost sm', type: 'button', text: 'Reset this session’s progress', on: { click: () => {
          if (!window.confirm('Erase chapters, checkpoints, drill results and card boxes for this session on this device?')) return;
          ['learn', 'check', 'drill', 'cards', 'ui'].forEach(x => store.del(k(x)));
          Object.keys(mem).forEach(x => delete mem[x]); render();
        } } }))));
    };

    render();
    return ctx;
  };

  /* ================= HUB ================= */
  SAA.hub = function () {
    tipInit();
    const H = window.SAA_HUB || {}, SS = window.SAA_SESSIONS || [];
    const app = document.getElementById('app');
    clear(app);
    const hdr = h('header', { cls: 'hdr' }, h('div', { cls: 'hdr-in' },
      h('a', { cls: 'brand', href: './', text: 'SAA Transit Maps' }),
      h('span', { cls: 'eyebrow hide-phone', text: 'SAA-C03 · 13 sessions' }),
      h('div', { style: { marginLeft: 'auto' } }, themeButton())));
    const wrap = h('div', { cls: 'panel' });
    add(app, [hdr, h('main', null, wrap)]);

    wrap.appendChild(h('div', { cls: 'hero' }, eyebrow(H.eyebrow || 'SAA-C03'), h('h1', { text: H.title || 'SAA Transit Maps' }), P(H.lead)));

    /* sessions */
    const list = h('div', { cls: 'slist' });
    SS.forEach(sx => {
      const lab = eyebrow('Session ' + sx.n + (sx.domains ? ' · ' + sx.domains : ''), 'sm');
      if (sx.soon || !sx.path) { list.appendChild(h('div', { cls: 'scard soon' }, lab, h('h3', { text: sx.title }), h('span', { cls: 'small muted', text: 'Coming · starts ' + (sx.start || '') }))); return; }
      const p = readProgress(sx.id, sx.totals || {});
      list.appendChild(h('a', { cls: 'scard', href: sx.path }, lab, h('h3', { text: sx.title }),
        h('div', { cls: 'row', style: { gap: '10px', flexWrap: 'nowrap' } }, h('div', { cls: 'bar', style: { width: 'auto', flex: '1 1 auto' } }, h('i', { style: { width: p.pct + '%' } })), h('span', { cls: 'mono small', text: p.pct + '%' })),
        h('span', { cls: 'small muted mono', text: p.chapters + '/' + (sx.totals || {}).chapters + ' chapters · ' + p.drills + '/' + (sx.totals || {}).drills + ' drills · ' + p.cards3 + '/' + (sx.totals || {}).cards + ' cards' }),
        h('span', { cls: 'small', style: { color: 'var(--link)' }, text: 'Open →' })));
    });
    wrap.appendChild(h('section', { cls: 'hubsec' }, h('h2', { text: 'Sessions' }), list, P('Progress is stored in this browser only. Nothing is sent anywhere.', 'small muted')));

    /* diagnosis */
    if (H.diagnosis) {
      const dg = H.diagnosis;
      wrap.appendChild(h('section', { cls: 'hubsec' }, h('h2', { text: dg.title }), P(dg.lead, 'muted'),
        h('div', { cls: 'hub2' },
          h('div', { cls: 'card stack g10' }, h('h3', { cls: 'step', text: dg.chartTitle }), hbars({ rows: dg.rows.map(r => ({ label: r.tag + ' · ' + r.name, value: r.n, tip: r.name + ': ' + r.n + ' — ' + r.qs })), title: dg.chartTitle, ticks: [0, 2, 4, 6, 8, 10] }), P(dg.chartCap, 'chcap')),
          table({ head: ['Tag', 'Count', 'Questions'], rows: dg.rows.map(r => ['**' + r.tag + '** ' + r.name, String(r.n), r.qs]) })),
        (dg.callouts || []).map(c => callout(c.text, c.kind, c.title)),
        dg.log ? table({ head: ['When', 'What', 'Result', 'Lesson'], rows: dg.log.map(l => [l.when, l.what, '**' + l.result + '**', l.lesson]) }) : null));
    }

    /* exam + domain chart */
    if (H.exam) {
      const ex = H.exam;
      wrap.appendChild(h('section', { cls: 'hubsec' }, h('h2', { text: ex.title }),
        h('div', { cls: 'hub2' },
          h('div', { cls: 'card stack g10' }, h('h3', { cls: 'step', text: 'Domain weights' }), hbars({ rows: ex.domains.map(d => ({ label: d.id + ' ' + d.name, value: d.w, text: d.w + '%', tip: d.id + ' ' + d.name + ': ' + d.w + '% of scored questions' })), max: 30, ticks: [0, 10, 20, 30], fmt: v => v + '%', title: 'Domain weights' }), P(ex.chartCap, 'chcap')),
          h('div', { cls: 'card stack g8' }, h('ul', { style: { margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' } }, ex.facts.map(f => h('li', null, md(f)))))),
        ex.note ? callout(ex.note, null, 'Note') : null));
    }

    /* knowledge map matrix */
    if (H.map) {
      const dots = v => v || '·';
      wrap.appendChild(h('section', { cls: 'hubsec' }, h('h2', { text: H.map.title }), P(H.map.lead, 'muted'),
        h('div', { cls: 'tbl matrix' }, h('table', null,
          h('thead', null, h('tr', null, ['#', 'Cluster', 'D1', 'D2', 'D3', 'D4', 'Start'].map(t => h('th', { text: t })))),
          h('tbody', null, H.map.rows.map(r => {
            const sx = SS.find(x => x.n === r.n);
            return h('tr', null, h('td', { cls: 'mono', text: String(r.n) }),
              h('td', null, sx && sx.path && !sx.soon ? h('a', { href: sx.path, text: r.name }) : r.name, r.detail ? h('span', { cls: 'small muted', text: ' (' + r.detail + ')' }) : null),
              r.d.map(v => h('td', { cls: 'd', text: dots(v) })), h('td', { text: r.start || '' }));
          })))), P(H.map.cap, 'chcap')));
    }

    /* method */
    if (H.method) {
      wrap.appendChild(h('section', { cls: 'hubsec' }, h('h2', { text: 'The method every drill trains' }),
        h('div', { cls: 'pre' }, h('pre', { text: H.method })),
        H.principles ? h('div', { cls: 'grid g3', style: { gap: '20px' } }, H.principles.map(([a, b]) => h('div', { cls: 'mech' }, h('b', { text: a }), h('span', { text: b })))) : null));
    }
    wrap.appendChild(h('div', { style: { height: '48px' } }));
  };

  /* exports for session widget files */
  Object.assign(SAA, { h, s, md, P, clear, store, eyebrow, color, tcolor, lineVars, swatch, hbars, mountChart, niceTicks, callout, table, treeWidget, shuffle, themeButton });
})();
