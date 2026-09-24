/* Session 1 widgets: EBS chart, S3 retrieval / minimum-duration charts, class picker,
   lifecycle builder, pipe calculator. Numbers verified against AWS docs 2026-09-24
   (docs/CONTEXT.md §6). Registered on SAA.widgets; used by learn.js and the S3 classes page. */
(function () {
  'use strict';
  const { h, s, md, P, clear, eyebrow, mountChart, callout, table } = SAA;
  const W = SAA.widgets;
  const lg = Math.log10;
  const fmt = n => n.toLocaleString('en-US');

  /* ---------- S3 classes (verified) ---------- */
  const CLS = [
    { id: 'std', name: 'S3 Standard', azs: '≥3 AZs', min: 0, ret: 'milliseconds', says: 'frequent access, default' },
    { id: 'it', name: 'S3 Intelligent-Tiering', azs: '≥3 AZs', min: 0, ret: 'milliseconds (automatic tiers); opt-in archive tiers take hours', says: 'unknown or changing access, no retrieval fees' },
    { id: 'ez', name: 'S3 Express One Zone', azs: '1 AZ', min: 0, ret: 'single-digit milliseconds', says: 'single-digit ms, very high request rates' },
    { id: 'sia', name: 'S3 Standard-IA', azs: '≥3 AZs', min: 30, ret: 'milliseconds', says: 'infrequent (~monthly), must be instant' },
    { id: 'oz', name: 'S3 One Zone-IA', azs: '1 AZ', min: 30, ret: 'milliseconds', says: 're-creatable, infrequent, instant' },
    { id: 'gir', name: 'S3 Glacier Instant Retrieval', azs: '≥3 AZs', min: 90, ret: 'milliseconds', says: '~quarterly access, milliseconds' },
    { id: 'gfr', name: 'S3 Glacier Flexible Retrieval', azs: '≥3 AZs', min: 90, ret: 'Expedited 1–5 min · Standard 3–5 h · Bulk 5–12 h', says: 'archive, sometimes needed in minutes' },
    { id: 'gda', name: 'S3 Glacier Deep Archive', azs: '≥3 AZs', min: 180, ret: 'Standard within 12 h · Bulk within 48 h', says: 'keep for years, read 1–2×/yr, ≤12 h OK' }
  ];
  const byId = id => CLS.find(c => c.id === id);
  const short = id => byId(id).name.replace('S3 ', '').replace('Glacier ', 'Glacier ');

  /* ---------- table of classes ---------- */
  W.classTable = function () {
    return h('div', { class: 'stack g8' }, eyebrow('The classes'), table({
      head: ['Class', 'AZs', 'Min duration', 'First byte', 'Exam says'], key: true,
      rows: CLS.map(c => [c.name.replace('S3 ', ''), c.azs, c.min ? c.min + ' days' : 'none', c.ret, c.says])
    }));
  };

  /* ---------- EBS: IOPS vs throughput, log–log, direct labels ---------- */
  const EBS = [
    { n: 'gp2', iops: 16000, mib: 250, tip: 'gp2 (legacy SSD): up to 16,000 IOPS · 250 MiB/s · 16 TiB; IOPS tied to size' },
    { n: 'gp3', iops: 80000, mib: 2000, tip: 'gp3 (default SSD): up to 80,000 IOPS · 2,000 MiB/s · 64 TiB; baseline 3,000 IOPS / 125 MiB/s' },
    { n: 'io1', iops: 64000, mib: 1000, tip: 'io1 (older provisioned IOPS): up to 64,000 IOPS · 1,000 MiB/s · 16 TiB; Multi-Attach' },
    { n: 'io2 BE', iops: 256000, mib: 4000, tip: 'io2 Block Express: up to 256,000 IOPS · 4,000 MiB/s · 64 TiB · 99.999% durability; Multi-Attach' },
    { n: 'st1', iops: 500, mib: 500, tip: 'st1 (throughput HDD): up to 500 MiB/s, 500 IOPS; cannot boot' },
    { n: 'sc1', iops: 250, mib: 250, tip: 'sc1 (cold HDD): up to 250 MiB/s, 250 IOPS; cannot boot; cheapest EBS per GB' }
  ];
  const framed = (title, node) => h('div', { class: 'card stack g10' }, eyebrow(title), node);
  W.ebsChart = function () {
    return framed('Chart · EBS volume types', mountChart(w => {
      const H = 300, L = 56, R = 16, T = 12, B = 34;
      const pw = w - L - R, ph = H - T - B;
      const x = v => L + ((lg(v) - 2) / (lg(400000) - 2)) * pw;
      const y = v => T + ph - ((lg(v) - 2) / (lg(6000) - 2)) * ph;
      const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'EBS volume types: maximum IOPS against maximum throughput' });
      const grid = s('g', { class: 'grid' });
      [100, 1000, 10000, 100000].forEach(v => { grid.appendChild(s('line', { x1: x(v), x2: x(v), y1: T, y2: T + ph })); g.appendChild(s('text', { class: 'axis', x: x(v), y: H - 16, 'text-anchor': 'middle', text: v >= 1000 ? v / 1000 + 'k' : String(v) })); });
      [100, 1000].forEach(v => { grid.appendChild(s('line', { x1: L, x2: L + pw, y1: y(v), y2: y(v) })); g.appendChild(s('text', { class: 'axis', x: L - 6, y: y(v) + 4, 'text-anchor': 'end', text: fmt(v) })); });
      g.insertBefore(grid, g.firstChild);
      g.appendChild(s('text', { class: 'axis', x: L + pw / 2, y: H - 2, 'text-anchor': 'middle', text: 'max IOPS per volume (log)' }));
      g.appendChild(s('text', { class: 'axis', x: 12, y: T + ph / 2, transform: `rotate(-90 12 ${T + ph / 2})`, 'text-anchor': 'middle', text: 'MiB/s (log)' }));
      EBS.forEach(p => {
        const cx = x(p.iops), cy = y(p.mib), left = cx > L + pw - 70;
        const gg = s('g', { 'data-tip': p.tip });
        gg.appendChild(s('circle', { cx, cy, r: 12, fill: 'transparent' }));
        gg.appendChild(s('circle', { cx, cy, r: 5, style: 'fill:var(--ink)' }));
        gg.appendChild(s('text', { class: 'lab', x: left ? cx - 9 : cx + 9, y: cy + 4, 'text-anchor': left ? 'end' : 'start', style: 'font-weight:700', text: p.n }));
        g.appendChild(gg);
      });
      return g;
    }, 'gp3 now reaches 80k IOPS; io2 Block Express is still the “highest” answer and the only one with 99.999% durability. Multi-Attach: io1 and io2 only. Hover a point for the numbers.'));
  };

  /* ---------- retrieval time: horizontal log-time axis, 1 ms → 48 h ---------- */
  const SEC = { ms: 0.001, s: 1, min: 60, h: 3600 };
  const RET = [
    { n: 'Standard', pts: [[0.004, 'ms']], tip: 'S3 Standard: milliseconds' },
    { n: 'Intelligent-Tiering', pts: [[0.004, 'ms']], tip: 'Intelligent-Tiering: milliseconds in the automatic tiers (opt-in archive tiers take hours)' },
    { n: 'Express One Zone', pts: [[0.002, 'single-digit ms']], tip: 'Express One Zone: single-digit milliseconds' },
    { n: 'Standard-IA', pts: [[0.004, 'ms']], tip: 'Standard-IA: milliseconds' },
    { n: 'One Zone-IA', pts: [[0.004, 'ms']], tip: 'One Zone-IA: milliseconds' },
    { n: 'Glacier Instant', pts: [[0.004, 'ms']], tip: 'Glacier Instant Retrieval: milliseconds' },
    { n: 'Glacier Flexible', segs: [[60, 300, 'Expedited 1–5 min'], [3 * 3600, 5 * 3600, 'Standard 3–5 h'], [5 * 3600, 12 * 3600, 'Bulk 5–12 h']], tip: 'Glacier Flexible Retrieval: Expedited 1–5 min · Standard 3–5 h · Bulk 5–12 h' },
    { n: 'Deep Archive', marks: [[12 * 3600, '≤12 h Standard'], [48 * 3600, '≤48 h Bulk']], tip: 'Glacier Deep Archive: Standard within 12 h · Bulk within 48 h' }
  ];
  W.retrievalChart = function () {
    return framed('Chart · time to first byte', mountChart(w => {
      const rowH = 36, labW = w < 480 ? 122 : 150, R = 18, T = 8;
      const H = T + RET.length * rowH + 30;
      const lo = lg(0.001), hi = lg(48 * 3600 * 1.15);
      const x = v => labW + ((lg(v) - lo) / (hi - lo)) * (w - labW - R);
      const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Time to first byte by S3 storage class, log scale' });
      const grid = s('g', { class: 'grid' });
      [[0.001, '1 ms'], [1, '1 s'], [60, '1 min'], [3600, '1 h'], [12 * 3600, '12 h'], [48 * 3600, '48 h']].forEach(([v, t]) => {
        grid.appendChild(s('line', { x1: x(v), x2: x(v), y1: T, y2: T + RET.length * rowH }));
        if (!(w < 480 && t === '12 h')) g.appendChild(s('text', { class: 'axis', x: x(v), y: H - 8, 'text-anchor': 'middle', text: t }));
      });
      g.appendChild(grid);
      RET.forEach((r, i) => {
        const cy = T + i * rowH + rowH / 2;
        const gg = s('g', { 'data-tip': r.tip });
        gg.appendChild(s('rect', { x: 0, y: cy - rowH / 2, width: w, height: rowH, fill: 'transparent' }));
        gg.appendChild(s('text', { class: 'lab', x: 0, y: cy + 4, text: r.n }));
        (r.pts || []).forEach(([v, t]) => { gg.appendChild(s('circle', { cx: x(v), cy, r: 5, style: 'fill:var(--ink)' })); gg.appendChild(s('text', { class: 'val', x: x(v) + 9, y: cy + 4, text: t })); });
        const narrow = w < 480;
        (r.segs || []).forEach(([a, b], j) => {
          gg.appendChild(s('rect', { class: 'barr', x: x(a), y: cy - 6, width: Math.max(4, x(b) - x(a)), height: 12, rx: 2, style: j === 1 ? 'opacity:.7' : j === 2 ? 'opacity:.45' : '' }));
        });
        if (r.segs) {
          gg.appendChild(s('text', { class: 'val', x: x(60), y: cy + 20, text: narrow ? 'Exp 1–5 min' : 'Expedited 1–5 min' }));
          gg.appendChild(s('text', { class: 'val', x: x(12 * 3600), y: cy - 10, 'text-anchor': 'end', text: narrow ? 'Std 3–5 h · Bulk 5–12 h' : 'Standard 3–5 h · Bulk 5–12 h' }));
        }
        (r.marks || []).forEach(([v]) => gg.appendChild(s('line', { x1: x(v), x2: x(v), y1: cy - 8, y2: cy + 8, style: 'stroke:var(--ink);stroke-width:3' })));
        if (r.marks) gg.appendChild(s('text', { class: 'val', x: x(12 * 3600) - 8, y: cy + 4, 'text-anchor': 'end', text: narrow ? 'Std ≤12 h · Bulk ≤48 h' : 'Standard ≤12 h · Bulk ≤48 h' }));
        g.appendChild(gg);
      });
      return g;
    }, '**Instant = ms · Flexible = minutes-to-hours · Deep = half a day.** Millisecond classes sit at the left edge: AWS publishes them as “milliseconds”, not an exact figure. Hover a row for the published range.'));
  };

  /* ---------- minimum storage duration bars ---------- */
  W.minDurationChart = function () {
    const rows = [['Standard', 0], ['Intelligent-Tiering', 0], ['Express One Zone', 0], ['Standard-IA', 30], ['One Zone-IA', 30], ['Glacier Instant', 90], ['Glacier Flexible', 90], ['Deep Archive', 180]]
      .map(([n, d]) => ({ label: n, value: d, text: d ? d + ' d' : 'none', tip: n + ': ' + (d ? 'billed for at least ' + d + ' days' : 'no minimum storage duration') }));
    return framed('Chart · minimum storage duration', SAA.hbars({ rows, max: 180, ticks: [0, 30, 90, 180], fmt: v => v + ' d', title: 'Minimum storage duration by class',
      cap: 'Hook: **30 / 90 / 180 = IA / Glacier / Deep.** Delete or move an object earlier and you still pay for the rest of the minimum. Express One Zone has no minimum (AWS class table, checked Sept 2026).' }));
  };

  /* ---------- class picker ---------- */
  const ACCESS = [['freq', 'frequent'], ['unknown', 'unknown / changing'], ['month', '~monthly'], ['quarter', '~quarterly'], ['year', '1–2× a year'], ['audit', 'audit only']];
  const RETR = [['sdms', 'single-digit ms'], ['ms', 'ms'], ['min', 'minutes'], ['12h', '≤12 h'], ['48h', '≤48 h']];
  const KEEP = [[7, '7 d'], [30, '30 d'], [90, '90 d'], [365, '1 y'], [2555, '7 y'], [3650, '10 y']];
  const RANK = ['gda', 'gfr', 'gir', 'oz', 'sia', 'std']; // cheapest first
  function pickClass(q) {
    const why = {};
    const lose = (id, r) => { if (!why[id]) why[id] = r; };
    let win = null;
    if (q.ret === 'sdms') { win = 'ez'; CLS.forEach(c => c.id !== 'ez' && lose(c.id, 'only Express One Zone gives single-digit milliseconds')); }
    else if (q.acc === 'freq') { win = 'std'; lose('ez', 'you did not ask for single-digit ms; 1 AZ'); lose('it', 'the pattern is known — frequent — so no monitoring fee'); ['sia', 'oz', 'gir'].forEach(id => lose(id, 'retrieval fees on every frequent read')); ['gfr', 'gda'].forEach(id => lose(id, 'archive: not for frequent reads')); }
    else if (q.acc === 'unknown') { win = 'it'; lose('ez', 'you did not ask for single-digit ms; 1 AZ'); lose('std', 'pays full price for objects that go cold'); ['sia', 'oz', 'gir', 'gfr', 'gda'].forEach(id => lose(id, 'a fixed class guesses the pattern; retrieval fees if it turns hot')); }
    else {
      lose('ez', 'you did not ask for single-digit ms; 1 AZ');
      lose('it', 'the pattern is known, so a fixed class is cheaper than the monitoring fee');
      RANK.forEach(id => {
        const c = byId(id);
        if (c.min > q.keep) lose(id, 'minimum ' + c.min + ' d is longer than the ' + q.keep + ' d you keep it');
        if (id === 'oz' && !q.recreate) lose(id, 'one AZ: only for data you can re-create');
        if (q.acc === 'month' && ['gir', 'gfr', 'gda'].includes(id)) lose(id, 'Glacier classes are built for quarterly or rarer reads');
        if (q.acc === 'quarter' && ['gfr', 'gda'].includes(id)) lose(id, 'quarterly reads → Glacier Instant, not an archive restore');
        if (q.ret === 'ms' && ['gfr', 'gda'].includes(id)) lose(id, 'needs a restore: minutes to hours');
        if (q.ret === 'min' && id === 'gda') lose(id, 'Standard retrieval takes up to 12 h — not minutes');
      });
      win = RANK.find(id => !why[id]);
      RANK.forEach(id => { if (id !== win && !why[id]) lose(id, 'survives, but ' + short(win) + ' is cheaper'); });
    }
    return { win, why };
  }
  W.classPicker = function () {
    const q = { acc: 'year', ret: '12h', recreate: false, keep: 2555 };
    const box = h('div', { class: 'card widget' });
    const group = (label, opts, key) => h('div', { class: 'stubrow' }, h('span', { class: 'stublab', text: label }),
      h('div', { class: 'chiprow' }, opts.map(([v, t]) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(q[key] === v), text: t, on: { click: () => { q[key] = v; paint(); } } }))));
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Class picker'));
      box.appendChild(group('ACCESS', ACCESS, 'acc'));
      box.appendChild(group('RETRIEVAL NEEDED', RETR, 'ret'));
      box.appendChild(group('RE-CREATABLE', [[true, 'yes'], [false, 'no']], 'recreate'));
      box.appendChild(group('RETENTION', KEEP, 'keep'));
      const r = pickClass(q);
      const c = byId(r.win);
      box.appendChild(h('div', { class: 'callout', style: { background: 'var(--ok-bg)' } }, eyebrow('Cheapest class that fits', 'sm'),
        h('b', { style: { fontFamily: 'var(--f-display)', fontSize: '24px', lineHeight: '1.15', color: 'var(--ok)' }, text: c.name }),
        h('span', { class: 'small', text: c.says + ' · first byte: ' + c.ret + ' · minimum: ' + (c.min ? c.min + ' d' : 'none') })));
      box.appendChild(h('div', { class: 'tbl' }, h('table', null, h('thead', null, h('tr', null, h('th', { text: 'Class' }), h('th', { text: 'Loses because…' }))),
        h('tbody', null, CLS.filter(x => x.id !== r.win).map(x => h('tr', null, h('td', { class: 'k', text: x.name.replace('S3 ', '') }), h('td', { class: 'lose', text: r.why[x.id] })))))));
    };
    paint();
    return box;
  };

  /* ---------- lifecycle builder ---------- */
  /* supported lifecycle transitions (AWS "Supported lifecycle transitions", checked 2026-09-24) */
  const NEXT = { std: ['sia', 'it', 'oz', 'gir', 'gfr', 'gda'], sia: ['it', 'oz', 'gir', 'gfr', 'gda'], it: ['oz', 'gir', 'gfr', 'gda'], oz: ['gfr', 'gda'], gir: ['gfr', 'gda'], gfr: ['gda'], gda: [] };
  const TARGETS = ['sia', 'it', 'oz', 'gir', 'gfr', 'gda'];
  const PRESETS = {
    b: { name: 'Quiz Q4 option B (valid)', t: [['sia', 30], ['gda', 90]], exp: 1825, minutes: false },
    a: { name: 'Quiz Q4 option A (invalid: IA at day 7)', t: [['sia', 7], ['gda', 67]], exp: 1825, minutes: false }
  };
  function validate(st) {
    const out = [];
    const tr = st.t;
    for (let i = 1; i < tr.length; i++) if (tr[i][1] <= tr[i - 1][1]) out.push([false, 'Transitions must be in day order (row ' + (i + 1) + ' is not after row ' + i + ').']);
    tr.forEach(([c, d], i) => {
      const prev = i ? tr[i - 1][0] : 'std', pd = i ? tr[i - 1][1] : 0;
      if ((c === 'sia' || c === 'oz') && d < 30) out.push([false, short(c) + ' at day ' + d + ': objects must stay in Standard at least 30 days before an IA transition.']);
      if (!NEXT[prev].includes(c)) out.push([false, short(prev) + ' → ' + short(c) + ' is not a supported transition. Lifecycle only moves down the waterfall' + (prev === 'oz' ? ', and One Zone-IA can go only to Glacier Flexible or Deep Archive.' : '.')]);
      const m = byId(prev).min;
      if (d - pd < m && d > pd) out.push([false, 'Leaves ' + short(prev) + ' after ' + (d - pd) + ' d; its minimum is ' + m + ' d → early-deletion charge.']);
      if (c === 'gda' && st.minutes) out.push([false, 'Deep Archive cannot return data in minutes (Standard retrieval: within 12 h).']);
    });
    if (st.exp) {
      const last = tr.length ? tr[tr.length - 1] : ['std', 0];
      if (st.exp <= last[1]) out.push([false, 'Expiration at day ' + st.exp + ' comes before the last transition.']);
      else if (st.exp - last[1] < byId(last[0]).min) out.push([false, 'Expires ' + (st.exp - last[1]) + ' d after entering ' + short(last[0]) + '; its minimum is ' + byId(last[0]).min + ' d → early-deletion charge.']);
    }
    if (!out.length) out.push([true, 'Valid. Every transition goes down the waterfall and respects each class’s minimum.']);
    return out;
  }
  W.lifecycleBuilder = function () {
    let st = { t: PRESETS.b.t.map(x => x.slice()), exp: PRESETS.b.exp, minutes: false };
    const box = h('div', { class: 'card widget' });
    const tl = h('div');
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Lifecycle builder'));
      box.appendChild(h('div', { class: 'chiprow' }, Object.keys(PRESETS).map(k => h('button', { class: 'chip b', type: 'button', text: PRESETS[k].name, on: { click: () => { const p = PRESETS[k]; st = { t: p.t.map(x => x.slice()), exp: p.exp, minutes: p.minutes }; paint(); } } }))));
      box.appendChild(h('p', { class: 'small muted', text: 'Day 0: objects land in S3 Standard.' }));
      st.t.forEach((row, i) => {
        const sel = h('select', { class: 'inp', 'aria-label': 'Transition ' + (i + 1) + ' class', on: { change: e => { row[0] = e.target.value; paint(); } } }, TARGETS.map(id => h('option', { value: id, selected: row[0] === id }, short(id))));
        const day = h('input', { class: 'inp', type: 'number', min: 0, max: 36500, value: row[1], 'aria-label': 'Transition ' + (i + 1) + ' day', on: { change: e => { row[1] = Math.max(0, parseInt(e.target.value, 10) || 0); paint(); } } });
        box.appendChild(h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 96px 44px', gap: '8px', alignItems: 'end' } },
          h('label', { class: 'field' }, h('span', { text: 'TRANSITION ' + (i + 1) }), sel), h('label', { class: 'field' }, h('span', { text: 'DAY' }), day),
          h('button', { class: 'tbtn', type: 'button', style: { height: '44px', padding: 0 }, 'aria-label': 'Remove transition ' + (i + 1), text: '✕', on: { click: () => { st.t.splice(i, 1); paint(); } } })));
      });
      box.appendChild(h('div', { class: 'row' },
        h('button', { class: 'btn ghost sm', type: 'button', text: '+ Add transition', on: { click: () => { const last = st.t[st.t.length - 1]; st.t.push([last ? TARGETS[Math.min(TARGETS.length - 1, TARGETS.indexOf(last[0]) + 1)] : 'sia', last ? last[1] + 90 : 30]); paint(); } } }),
        h('label', { class: 'field', style: { width: '140px' } }, h('span', { text: 'EXPIRE AT DAY' }), h('input', { class: 'inp', type: 'number', min: 0, value: st.exp || '', placeholder: 'never', on: { change: e => { st.exp = parseInt(e.target.value, 10) || 0; paint(); } } })),
        h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked: st.minutes, on: { change: e => { st.minutes = e.target.checked; paint(); } } }), 'retrieval must be minutes')));
      box.appendChild(tl);
      drawTimeline();
      const v = validate(st);
      box.appendChild(h('div', { class: 'stack g6' }, v.map(([ok, t]) => h('p', { class: 'small ' + (ok ? 'ok-t' : 'bad-t') }, (ok ? '✓ ' : '✕ ') + t))));
    };
    const drawTimeline = () => {
      clear(tl);
      const segs = [['std', 0]].concat(st.t);
      const end = Math.max(st.exp || 0, (segs[segs.length - 1][1] || 0) + 180, 365);
      tl.appendChild(mountChart(w => {
        const H = 74, L = 4, R = 8, pw = w - L - R;
        const x = d => L + Math.sqrt(Math.max(0, d) / end) * pw; // sqrt scale: early days stay readable
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Lifecycle timeline' });
        segs.forEach(([c, d], i) => {
          const nd = i + 1 < segs.length ? segs[i + 1][1] : (st.exp || end);
          const x1 = x(d), x2 = x(Math.max(d, nd));
          const gg = s('g', { 'data-tip': short(c) + ': day ' + d + ' → ' + (i + 1 < segs.length ? 'day ' + nd : st.exp ? 'expires day ' + st.exp : 'kept') });
          gg.appendChild(s('rect', { x: x1, y: 14, width: Math.max(2, x2 - x1), height: 26, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:1.5' }));
          if (x2 - x1 > 34) gg.appendChild(s('text', { class: 'val', x: x1 + 5, y: 31, text: short(c).replace('Glacier ', 'G.').replace('Intelligent-Tiering', 'Int-T').replace('Standard-IA', 'S-IA').replace('One Zone-IA', 'OZ-IA') }));
          g.appendChild(gg);
          g.appendChild(s('text', { class: 'axis', x: x1, y: 56, 'text-anchor': i ? 'middle' : 'start', text: 'd' + d }));
        });
        if (st.exp) { g.appendChild(s('line', { x1: x(st.exp), x2: x(st.exp), y1: 8, y2: 46, style: 'stroke:var(--ink);stroke-width:3' })); g.appendChild(s('text', { class: 'axis', x: x(st.exp), y: 70, 'text-anchor': 'end', text: 'expire d' + st.exp })); }
        return g;
      }));
    };
    paint();
    return box;
  };

  /* ---------- pipe calculator ---------- */
  const SPEEDS = [[1e7, '10 Mbps'], [2e7, '20 Mbps'], [5e7, '50 Mbps'], [1e8, '100 Mbps'], [2e8, '200 Mbps'], [5e8, '500 Mbps'], [1e9, '1 Gbps'], [2e9, '2 Gbps'], [5e9, '5 Gbps'], [1e10, '10 Gbps']];
  const PIPE_PRESETS = [
    { n: 'Quiz Q2', tb: 600, bps: 5e7, use: 100, dl: 21, on: false },
    { n: 'Exam Q54', tb: 250, bps: 1e8, use: 100, dl: '', on: false },
    { n: 'R1', tb: 120, bps: 1e9, use: 50, dl: 30, on: false },
    { n: 'D41', tb: 400, bps: 1e10, use: 100, dl: 30, on: false }
  ];
  const tbPerDay = (bps, use) => (bps * (use / 100) * 86400) / 8 / 1e12;
  const days = (tb, bps, use) => tb / tbPerDay(bps, use);
  const nice = d => (d < 1 ? (d * 24).toFixed(1) + ' h' : d < 10 ? d.toFixed(1) + ' d' : fmt(Math.round(d)) + ' d');
  W.pipeCalc = function () {
    const st = Object.assign({}, PIPE_PRESETS[0]);
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Pipe calculator'));
      box.appendChild(h('div', { class: 'chiprow' }, PIPE_PRESETS.map(p => h('button', { class: 'chip b', type: 'button', 'aria-pressed': String(st.n === p.n), text: p.n + ' · ' + p.tb + ' TB', on: { click: () => { Object.assign(st, p); paint(); } } }))));
      const num = (lab, key, attrs) => h('label', { class: 'field' }, h('span', { text: lab }), h('input', Object.assign({ class: 'inp', type: 'number', value: st[key], on: { change: e => { st[key] = e.target.value === '' ? '' : +e.target.value; st.n = null; paint(); } } }, attrs)));
      box.appendChild(h('div', { class: 'grid g4', style: { alignItems: 'end' } },
        num('DATA (TB)', 'tb', { min: 0.1, step: 'any' }),
        h('label', { class: 'field' }, h('span', { text: 'LINK' }), h('select', { class: 'inp', on: { change: e => { st.bps = +e.target.value; st.n = null; paint(); } } }, SPEEDS.map(([v, t]) => h('option', { value: v, selected: st.bps === v }, t)))),
        h('label', { class: 'field' }, h('span', { text: 'USABLE ' + st.use + '%' }), h('input', { type: 'range', min: 10, max: 100, step: 5, value: st.use, 'aria-label': 'Usable share of the link', on: { input: e => { st.use = +e.target.value; st.n = null; paint(); } } })),
        num('DEADLINE (DAYS)', 'dl', { min: 1, placeholder: 'none' })));
      box.appendChild(h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked: st.on, on: { change: e => { st.on = e.target.checked; st.n = null; paint(); } } }), 'ongoing (sync keeps running after the first copy)'));
      const dd = days(st.tb || 0, st.bps, st.use), per = tbPerDay(st.bps, st.use);
      const dl = st.dl === '' ? null : +st.dl;
      let verdict, lineId;
      if (st.on) {
        if (dl && dd > dl) { verdict = 'Ongoing, and the first copy misses the deadline → **seed offline + DataSync**: take the initial ' + st.tb + ' TB to a {truck|Data Transfer Terminal}, then {datasync|DataSync} (throttled) keeps it in sync.'; lineId = 'truck'; }
        else { verdict = 'Ongoing → **{datasync|DataSync}** with bandwidth throttling. Trucks don’t do ongoing.'; lineId = 'datasync'; }
      } else if (dl) {
        verdict = dd <= dl ? 'Fits the pipe → **{datasync|DataSync}**. ' + nice(dd) + ' against a ' + dl + '-day deadline.' : 'Weeks+ online → **{truck|the truck}**: a Data Transfer Terminal (Snow in older banks). ' + nice(dd) + ' against a ' + dl + '-day deadline. Direct Connect is never provisioned for a one-off.';
        lineId = dd <= dl ? 'datasync' : 'truck';
      } else {
        verdict = dd > 14 ? 'No deadline stated, and ' + nice(dd) + ' is weeks or more → **{truck|the truck}**.' : 'No deadline stated; ' + nice(dd) + ' fits the pipe → **{datasync|DataSync}**.';
        lineId = dd > 14 ? 'truck' : 'datasync';
      }
      box.appendChild(h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', { text: nice(dd) }), h('span', { text: 'transfer time' })),
        h('div', { class: 'stat' }, h('b', { text: per >= 10 ? per.toFixed(0) : per.toFixed(2) }), h('span', { text: 'TB per day' })),
        h('div', { class: 'stat' }, h('b', { text: dl ? dl + ' d' : '—' }), h('span', { text: 'deadline' }))));
      box.appendChild(h('div', { class: 'callout' }, h('div', { class: 'row', style: { gap: '8px' } }, SAA.swatch(SAA.ctx.LINES[lineId]), eyebrow('Verdict', 'sm')), h('span', null, md(verdict))));
      box.appendChild(mountChart(w => {
        const H = 230, L = 52, R = 14, T = 10, B = 34, pw = w - L - R, ph = H - T - B;
        const x = v => L + ((lg(v) - 7) / 3) * pw;
        const y = v => T + ph - ((lg(Math.min(Math.max(v, 0.1), 1e4)) + 1) / 5) * ph;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Days to transfer against link speed' });
        const grid = s('g', { class: 'grid' });
        [[1e7, '10M'], [1e8, '100M'], [1e9, '1G'], [1e10, '10G']].forEach(([v, t]) => { grid.appendChild(s('line', { x1: x(v), x2: x(v), y1: T, y2: T + ph })); g.appendChild(s('text', { class: 'axis', x: x(v), y: H - 16, 'text-anchor': 'middle', text: t + 'bps' })); });
        [0.1, 1, 10, 100, 1000, 10000].forEach(v => { grid.appendChild(s('line', { x1: L, x2: L + pw, y1: y(v), y2: y(v) })); g.appendChild(s('text', { class: 'axis', x: L - 6, y: y(v) + 4, 'text-anchor': 'end', text: v >= 1000 ? v / 1000 + 'k d' : v + ' d' })); });
        g.appendChild(grid);
        g.appendChild(s('text', { class: 'axis', x: L + pw / 2, y: H - 2, 'text-anchor': 'middle', text: 'link speed (log) · days to copy ' + st.tb + ' TB at ' + st.use + '% (log)' }));
        let d = '';
        for (let i = 0; i <= 60; i++) { const v = Math.pow(10, 7 + (3 * i) / 60); d += (i ? 'L' : 'M') + x(v).toFixed(1) + ' ' + y(days(st.tb || 0.1, v, st.use)).toFixed(1); }
        g.appendChild(s('path', { d, fill: 'none', style: 'stroke:var(--ink);stroke-width:2.5' }));
        if (dl) {
          g.appendChild(s('line', { x1: L, x2: L + pw, y1: y(dl), y2: y(dl), 'stroke-dasharray': '6 4', style: 'stroke:var(--bad);stroke-width:2' }));
          g.appendChild(s('text', { class: 'val', x: L + pw - 4, y: y(dl) - 6, 'text-anchor': 'end', style: 'fill:var(--bad)', text: 'deadline ' + dl + ' d' }));
        }
        const cx = x(st.bps), cy = y(dd);
        const pt = s('g', { 'data-tip': SPEEDS.find(v => v[0] === st.bps)[1] + ' at ' + st.use + '% usable: ' + nice(dd) + ' for ' + st.tb + ' TB' });
        pt.appendChild(s('circle', { cx, cy, r: 12, fill: 'transparent' }));
        pt.appendChild(s('circle', { cx, cy, r: 6, style: 'fill:var(--ink);stroke:var(--surface);stroke-width:2' }));
        const left = cx > L + pw * 0.6;
        pt.appendChild(s('text', { class: 'lab', x: left ? cx - 10 : cx + 10, y: cy - 8, 'text-anchor': left ? 'end' : 'start', style: 'font-weight:700', text: nice(dd) }));
        g.appendChild(pt);
        return g;
      }, 'Rule: **100 Mbps ≈ 1 TB/day · 1 Gbps ≈ 10 TB/day** (exactly 1.08 and 10.8 at 100%). Divide TB by TB/day before you read the options.'));
    };
    paint();
    return box;
  };
})();
