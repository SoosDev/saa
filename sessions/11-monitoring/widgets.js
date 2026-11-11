/* Session 11 widgets: metric retention (published period × age of the data → finest resolution still retrievable),
   alarm evaluation (M out of N on a fixed series without gaps, then AWS's two missing-data tables looked up row by row),
   CloudTrail window (age of an event × kind of event × what was set up → where the answer still is). Choosers, sorters
   and steppers use the generic engine widgets.
   Verified inputs (docs/session-11-monitoring.md): retention — under 60 s kept 3 hours, 60 s kept 15 days, 300 s kept
   63 days, 3600 s kept 455 days, shorter periods aggregated as data ages; alarms — Datapoints to Alarm (M) within the
   last Evaluation Periods (N), not necessarily consecutive; the missing-data rows are AWS's own tables (3 of 3 and
   2 of 3, evaluation range 5) and nothing else; CloudTrail — event history keeps 90 days of management events, shows no
   data events; data events are off by default; a trail keeps its log files in S3 as long as the bucket keeps them.
   The alarm series and the M-of-N results without gaps are derived from the rule above and labelled as such. */
(function () {
  'use strict';
  const { h, s, md, clear, eyebrow, mountChart } = SAA;
  const W = SAA.widgets;
  const chip = (label, on, click, cls) => h('button', { class: 'chip' + (cls ? ' ' + cls : ''), type: 'button', 'aria-pressed': String(!!on), text: label, on: { click } });
  const group = (label, kids) => h('div', { class: 'stubrow' }, h('span', { class: 'stublab', text: label }), h('div', { class: 'chiprow' }, kids));
  const verdict = (title, text) => h('div', { class: 'callout' }, eyebrow(title, 'sm'), h('span', null, md(text)));
  const stats = rows => h('div', { class: 'stats' }, rows.map(([a, b, strong]) => h('div', { class: 'stat', style: strong ? { borderColor: 'var(--ink)', borderWidth: '2px', padding: '9px 11px' } : null }, h('b', { text: a }), h('span', { text: b }))));
  const OUTLINE = 'fill:var(--surface);stroke:var(--ink);stroke-width:1.5';
  const DASHED = OUTLINE + ';stroke-dasharray:4 3';

  /* ================= Metric retention ================= */
  const LADDER = [
    { res: '1-second', short: '1 s', sec: 1, keep: 3 / 24, keepLabel: '3 hours' },
    { res: '1-minute', short: '1 min', sec: 60, keep: 15, keepLabel: '15 days' },
    { res: '5-minute', short: '5 min', sec: 300, keep: 63, keepLabel: '63 days' },
    { res: '1-hour', short: '1 h', sec: 3600, keep: 455, keepLabel: '455 days (15 months)' }
  ];
  const PUB = [{ k: '1 s', sec: 1, label: 'every second (high resolution)' }, { k: '1 min', sec: 60, label: 'every minute' }, { k: '5 min', sec: 300, label: 'every 5 minutes' }];
  const AGES = [{ k: '2 hours', d: 2 / 24 }, { k: '10 days', d: 10 }, { k: '40 days', d: 40 }, { k: '300 days', d: 300 }, { k: '500 days', d: 500 }];
  const finest = (pubSec, age) => LADDER.find(r => r.sec >= pubSec && age <= r.keep) || null;
  W.retention = function () {
    const st = { pub: 60, age: 40 };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Metric retention · what is left as data ages'));
      box.appendChild(h('p', { class: 'small muted' }, md('CloudWatch keeps each resolution for a fixed time and **aggregates** older data into the next coarser one. Pick how often the metric is published and how old the data is.')));
      box.appendChild(group('PUBLISHED', PUB.map(p => chip(p.k, st.pub === p.sec, () => { st.pub = p.sec; paint(); }))));
      box.appendChild(group('AGE OF THE DATA', AGES.map(a => chip(a.k, st.age === a.d, () => { st.age = a.d; paint(); }))));
      const r = finest(st.pub, st.age), ageK = AGES.find(a => a.d === st.age).k, pub = PUB.find(p => p.sec === st.pub);
      box.appendChild(mountChart(w => {
        const narrow = w < 560, labW = narrow ? 56 : 120, valW = narrow ? 8 : 16, rh = 34, top = 18;
        const plot = w - labW - valW, H = top + LADDER.length * rh + 26;
        const lo = Math.log10(1 / 24), hi = Math.log10(600);
        const X = d => labW + ((Math.log10(Math.max(d, 1 / 24)) - lo) / (hi - lo)) * plot;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'How long each metric resolution is kept, on a logarithmic scale of days' });
        const grid = s('g', { class: 'grid' });
        const ticks = narrow ? [[3 / 24, '3 h'], [15, '15 d'], [63, '63 d'], [455, '455 d']] : [[3 / 24, '3 h'], [1, '1 d'], [15, '15 d'], [63, '63 d'], [455, '455 d']];
        ticks.forEach(([d, t]) => { grid.appendChild(s('line', { x1: X(d), x2: X(d), y1: top, y2: top + LADDER.length * rh })); g.appendChild(s('text', { class: 'axis', x: X(d), y: H - 6, 'text-anchor': 'middle', text: t })); });
        g.appendChild(grid);
        LADDER.forEach((L, i) => {
          const y = top + i * rh, finer = L.sec < st.pub, mine = r && r.sec === L.sec;
          const gg = s('g', { 'data-tip': L.res + ' data is kept for ' + L.keepLabel + (finer ? ' — not available here: the metric is published less often than that' : '') });
          gg.appendChild(s('rect', { x: 0, y, width: w, height: rh, fill: 'transparent' }));
          gg.appendChild(s('text', { class: 'lab', x: 0, y: y + rh / 2 + 4.5, style: narrow ? 'font-size:12px' : null, text: (mine ? '▸ ' : '') + (narrow ? L.short : L.res + ' data') }));
          const bw = Math.max(2, X(L.keep) - labW);
          gg.appendChild(finer ? s('rect', { x: labW, y: y + 9, width: bw, height: rh - 18, rx: 2, style: DASHED + ';opacity:.6' }) : s('rect', { class: 'barr' + (mine ? '' : ' soft'), x: labW, y: y + 9, width: bw, height: rh - 18, rx: 2 }));
          g.appendChild(gg);
        });
        const ax = X(st.age);
        g.appendChild(s('path', { d: `M${ax} ${top - 6} V${top + LADDER.length * rh}`, style: 'stroke:var(--ink);stroke-width:2;stroke-dasharray:3 3' }));
        g.appendChild(s('text', { class: 'val', x: Math.min(ax, w - 4), y: top - 8, 'text-anchor': ax > w - 70 ? 'end' : 'middle', text: ageK }));
        return g;
      }, 'One ink bar per resolution, ending where CloudWatch stops keeping it (log scale). Dashed outline = finer than you publish; the dashed line is the age you picked. Hover a row.'));
      box.appendChild(stats([[r ? r.res : 'gone', 'finest resolution still retrievable', true], [ageK, 'age of the data'], [pub.k, 'published']]));
      const notes = [];
      if (!r) notes.push('After **455 days** even the 1-hour aggregates are gone: CloudWatch keeps no metric data longer than 15 months. Keep what you need elsewhere (a metric stream to S3 through Firehose, for example).');
      else if (r.sec === st.pub) notes.push('At **' + ageK + '** the data is still at its published resolution: ' + r.res + ' data is kept for ' + r.keepLabel + '.');
      else notes.push('Published ' + pub.label + ', but at **' + ageK + '** only **' + r.res + '** aggregates remain: finer data was kept for ' + LADDER.find(L => L.sec >= st.pub).keepLabel + ', then rolled up.');
      notes.push('The ladder is AWS’s: under 60 s → 3 hours, 1 minute → 15 days, 5 minutes → 63 days, 1 hour → 455 days. The answer is derived from it for your two settings.');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };

  /* ================= Alarm evaluation ================= */
  /* Part 1, no gaps (derived): a fixed series of one-minute datapoints against a threshold of 80; the alarm is in ALARM
     when at least M of the last N datapoints breach (at the start, M breaching points among the first ones are enough). Part 2: AWS's two worked tables for missing data, looked up. */
  const SERIES = [62, 85, 91, 70, 88, 76, 93, 84], THR = 80;
  const evalAt = (t, M, N) => SERIES.slice(Math.max(0, t - N + 1), t + 1).filter(v => v > THR).length >= M;
  const COLS = ['missing', 'ignore', 'breaching', 'notBreaching'];
  const RETAIN = 'Retain current state';
  const TABLES = {
    '3 of 3': [
      { d: '0 - X - X', fill: 0, st: ['OK', 'OK', 'OK', 'OK'] },
      { d: '0 - - - -', fill: 2, st: ['OK', 'OK', 'OK', 'OK'], note: 'The one real point is not breaching. If the data stays missing, it leaves the range at the next evaluation and a breaching treatment then goes to ALARM.' },
      { d: '- - - - -', fill: 3, st: ['INSUFFICIENT_DATA', RETAIN, 'ALARM', 'OK'], note: 'Nothing real in the range: each treatment decides on its own.' },
      { d: '0 X X - X', fill: 0, st: ['ALARM', 'ALARM', 'ALARM', 'ALARM'], note: 'Three real breaching points are enough; the missing one is not needed.' },
      { d: '- - X - -', fill: 2, st: ['ALARM', RETAIN, 'ALARM', 'OK'], note: 'AWS’s “premature alarm state” rule: the oldest breaching point is as old as Datapoints to Alarm and everything after it is missing, so even missing goes to ALARM.' }
    ],
    '2 of 3': [
      { d: '0 - X - X', fill: 0, st: ['ALARM', 'ALARM', 'ALARM', 'ALARM'] },
      { d: '0 0 X 0 X', fill: 0, st: ['ALARM', 'ALARM', 'ALARM', 'ALARM'], note: 'Two of the three most recent points breach; the two older points are not needed.' },
      { d: '0 - X - -', fill: 1, st: ['OK', 'OK', 'ALARM', 'OK'], note: 'Only a breaching treatment adds the second breaching point.' },
      { d: '- - - - 0', fill: 2, st: ['OK', 'OK', 'ALARM', 'OK'], note: 'Treated as breaching, the two missing points are the two breaches M needs.' },
      { d: '- - - X -', fill: 2, st: ['ALARM', RETAIN, 'ALARM', 'OK'], note: 'The premature-alarm rule again, for an M of N alarm.' }
    ]
  };
  const markStyle = state => (state === 'ALARM' ? 'fill:var(--ink)' : state === 'OK' ? OUTLINE : DASHED);
  W.alarmSim = function () {
    const st = { M: 3, N: 3, tab: '3 of 3', row: 2, col: 'missing' };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Alarm evaluation · M out of N, then missing data'));
      box.appendChild(h('p', { class: 'small muted' }, md('**1. No gaps.** Eight one-minute datapoints against a threshold of 80. The alarm goes to `ALARM` when **M** (datapoints to alarm) of the last **N** (evaluation periods) breach — not necessarily in a row.')));
      box.appendChild(group('DATAPOINTS TO ALARM', [1, 2, 3].map(v => chip('M = ' + v, st.M === v, () => { st.M = v; paint(); }))));
      box.appendChild(group('EVALUATION PERIODS', [3, 5].map(v => chip('N = ' + v, st.N === v, () => { st.N = v; paint(); }))));
      const last = SERIES.length - 1, now = evalAt(last, st.M, st.N);
      const first = SERIES.findIndex((_, t) => evalAt(t, st.M, st.N) === true);
      box.appendChild(mountChart(w => {
        const narrow = w < 560, left = 34, top = 16, ph = narrow ? 120 : 140, H = top + ph + 30;
        const cw = (w - left - 8) / SERIES.length;
        const Y = v => top + ph - ((v - 50) / 50) * ph;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Eight datapoints against the threshold, with the evaluation window' });
        const grid = s('g', { class: 'grid' });
        [50, 60, 70, 80, 90, 100].forEach(v => { grid.appendChild(s('line', { x1: left, x2: w - 8, y1: Y(v), y2: Y(v) })); g.appendChild(s('text', { class: 'axis', x: left - 6, y: Y(v) + 4, 'text-anchor': 'end', text: String(v) })); });
        g.appendChild(grid);
        g.appendChild(s('rect', { x: left + (SERIES.length - st.N) * cw, y: top, width: st.N * cw, height: ph, rx: 4, style: 'fill:var(--muted-fill)' }));
        g.appendChild(s('path', { d: `M${left} ${Y(THR)} H${w - 8}`, style: 'stroke:var(--ink);stroke-width:1.5;stroke-dasharray:6 4' }));
        SERIES.forEach((v, i) => {
          const x = left + i * cw + cw / 2, br = v > THR, ev = evalAt(i, st.M, st.N);
          const gg = s('g', { 'data-tip': 'Minute ' + (i + 1) + ': ' + v + (br ? ' — breaching' : ' — not breaching') + '; alarm would be ' + (ev ? 'ALARM' : 'OK') + ' here' });
          gg.appendChild(s('rect', { x: x - cw / 2, y: top, width: cw, height: ph, fill: 'transparent' }));
          gg.appendChild(s('circle', { cx: x, cy: Y(v), r: 6, style: br ? 'fill:var(--ink)' : OUTLINE }));
          gg.appendChild(s('text', { class: 'axis', x, y: H - 6, 'text-anchor': 'middle', text: (narrow ? '' : 'm') + (i + 1) }));
          g.appendChild(gg);
        });
        return g;
      }, 'Solid dot = breaching (above 80), outlined = not breaching; the shaded band is the last N minutes, the dashed line the threshold. Hover a point.'));
      box.appendChild(stats([[now ? 'ALARM' : 'OK', 'state at minute 8', true], [first < 0 ? 'never' : 'minute ' + (first + 1), 'first ALARM in this series'], [st.M + ' min', 'fastest possible after a lasting breach (M × period)']]));
      box.appendChild(verdict('Read it', (st.M === st.N ? '**' + st.M + ' of ' + st.N + '**: every point in the window must breach — the strictest setting, the slowest to fire. ' : '**' + st.M + ' of ' + st.N + '**: ' + st.M + ' breaching point' + (st.M === 1 ? '' : 's') + ' anywhere in the last ' + st.N + ' minutes is enough, so a single good minute does not reset it. ') + 'In minutes ' + (SERIES.length - st.N + 1) + '–' + SERIES.length + ' the series breaches ' + SERIES.slice(-st.N).filter(v => v > THR).length + ' of ' + st.N + ' times. These states are derived from the M-of-N rule for a series with no gaps.'));

      box.appendChild(h('p', { class: 'small muted', style: { marginTop: '8px' } }, md('**2. Missing data — AWS’s worked tables.** Evaluation periods 3, evaluation range 5, newest point on the right: `X` breaching, `0` not breaching, `-` missing. Pick a documented row and a treatment.')));
      box.appendChild(group('TABLE', Object.keys(TABLES).map(k => chip(k, st.tab === k, () => { st.tab = k; paint(); }))));
      box.appendChild(group('DATA POINTS', TABLES[st.tab].map((r, i) => chip(r.d, st.row === i, () => { st.row = i; paint(); }, 'b'))));
      box.appendChild(group('TREAT MISSING AS', COLS.map(c => chip(c, st.col === c, () => { st.col = c; paint(); }))));
      const R = TABLES[st.tab][st.row], state = R.st[COLS.indexOf(st.col)];
      box.appendChild(mountChart(w => {
        const narrow = w < 560, H = 74, size = 24, gap = narrow ? 14 : 22, x0 = 8;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'The five data points of the chosen row and the resulting alarm state' });
        R.d.split(' ').forEach((c, i) => {
          const x = x0 + i * (size + gap);
          const gg = s('g', { 'data-tip': 'Point ' + (i + 1) + ' of 5 (' + (i === 4 ? 'newest' : i === 0 ? 'oldest' : 'older') + '): ' + (c === 'X' ? 'breaching' : c === '0' ? 'not breaching' : 'missing') });
          gg.appendChild(s('rect', { x, y: 12, width: size, height: size, rx: 3, style: c === 'X' ? 'fill:var(--ink)' : c === '0' ? OUTLINE : DASHED }));
          gg.appendChild(s('text', { class: 'axis', x: x + size / 2, y: 58, 'text-anchor': 'middle', text: c === '-' ? 'miss' : c }));
          g.appendChild(gg);
        });
        const sx = x0 + 5 * (size + gap) + (narrow ? 6 : 16);
        const sg = s('g', { 'data-tip': 'State with “' + st.col + '”: ' + state + ' (AWS’s table)' });
        sg.appendChild(s('path', { d: `M${sx - 12} 24 H${sx - 4}`, style: 'stroke:var(--ink2);stroke-width:1.5' }));
        sg.appendChild(s('rect', { x: sx, y: 10, width: 28, height: 28, rx: 4, style: state === RETAIN ? DASHED + ';opacity:.5' : markStyle(state) }));
        sg.appendChild(s('text', { class: 'val', x: sx + 36, y: 29, text: narrow && state === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT' : state === RETAIN ? (narrow ? 'retain' : 'retain current state') : state }));
        g.appendChild(sg);
        return g;
      }, 'Solid = breaching / ALARM, outlined = not breaching / OK, dashed outline = missing / INSUFFICIENT_DATA. Hover a mark.'));
      box.appendChild(stats([[state === RETAIN ? 'retain' : state === 'INSUFFICIENT_DATA' ? 'no data' : state, state === 'INSUFFICIENT_DATA' ? 'alarm state: INSUFFICIENT_DATA (AWS’s table)' : 'alarm state (AWS’s table)', true], [String(R.fill), 'of the 3 needed points filled in'], [st.tab, 'datapoints to alarm of evaluation periods']]));
      const n2 = ['AWS’s ' + st.tab + ' table, row **' + R.d + '**, treated as **' + st.col + '** → **' + (state === RETAIN ? 'the alarm keeps its current state' : state) + '**.'];
      if (R.note) n2.push(R.note);
      n2.push('`missing` is the default; for alarms that stop, terminate, reboot or recover EC2 instances AWS recommends `missing`, and `AWS/DynamoDB` alarms default to `ignore`. Only AWS’s documented rows are offered here.');
      box.appendChild(verdict('Read it', n2.join(' ')));
    };
    paint();
    return box;
  };

  /* ================= CloudTrail window ================= */
  const TAGES = [10, 60, 91, 400];
  const KINDS = [{ k: 'mgmt', label: 'Management API call' }, { k: 's3', label: 'S3 object read or write' }];
  const SETUPS = [{ k: 'none', label: 'Nothing' }, { k: 'trail', label: 'A trail to S3' }, { k: 'data', label: 'A trail with data events' }];
  const whereIs = (age, kind, setup) => {
    if (kind === 's3') return setup === 'data' ? { k: 'trail', s: 'trail only', t: 'Only in the trail’s S3 logs' } : { k: 'never', s: 'never', t: 'Never recorded' };
    const hist = age <= 90, tr = setup !== 'none';
    if (hist && tr) return { k: 'both', s: 'both', t: 'Event history and the trail' };
    if (hist) return { k: 'hist', s: 'history', t: 'Event history' };
    if (tr) return { k: 'trail', s: 'trail only', t: 'Only in the trail’s S3 logs' };
    return { k: 'gone', s: 'gone', t: 'Gone: event history keeps 90 days' };
  };
  W.trailWindow = function () {
    const st = { age: 91, kind: 'mgmt', setup: 'none' };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Can you still answer it? · CloudTrail'));
      box.appendChild(h('p', { class: 'small muted' }, md('Someone asks who did something. Pick how old the event is, what kind of call it was, and what was set up **before** it happened (a trail keeps its files in S3 as long as you keep them).')));
      box.appendChild(group('AGE OF THE EVENT', TAGES.map(v => chip(v + ' days', st.age === v, () => { st.age = v; paint(); }))));
      box.appendChild(group('KIND OF EVENT', KINDS.map(x => chip(x.label, st.kind === x.k, () => { st.kind = x.k; paint(); }, 'b'))));
      box.appendChild(group('SET UP BEFOREHAND', SETUPS.map(x => chip(x.label, st.setup === x.k, () => { st.setup = x.k; paint(); }, 'b'))));
      const r = whereIs(st.age, st.kind, st.setup);
      box.appendChild(mountChart(w => {
        const narrow = w < 560, labW = narrow ? 92 : 150, rh = 34, top = 18, rows = 2;
        const plot = w - labW - 12, H = top + rows * rh + 26;
        const X = d => labW + (d / 420) * plot;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'The 90-day event history window and the trail, with the age of the event' });
        const grid = s('g', { class: 'grid' });
        (narrow ? [0, 90, 400] : [0, 90, 200, 300, 400]).forEach(d => { grid.appendChild(s('line', { x1: X(d), x2: X(d), y1: top, y2: top + rows * rh })); g.appendChild(s('text', { class: 'axis', x: X(d), y: H - 6, 'text-anchor': 'middle', text: d + ' d' })); });
        g.appendChild(grid);
        const histOk = st.kind === 'mgmt';
        const g1 = s('g', { 'data-tip': 'Event history: the last 90 days of management events in one Region, on by default' + (histOk ? '' : ' — it never shows data events such as S3 object reads') });
        g1.appendChild(s('rect', { x: 0, y: top, width: w, height: rh, fill: 'transparent' }));
        g1.appendChild(s('text', { class: 'lab', x: 0, y: top + rh / 2 + 4.5, style: narrow ? 'font-size:12px' : null, text: narrow ? 'history' : 'event history' }));
        g1.appendChild(histOk ? s('rect', { class: 'barr', x: X(0), y: top + 9, width: X(90) - X(0), height: rh - 18, rx: 2 }) : s('rect', { x: X(0), y: top + 9, width: X(90) - X(0), height: rh - 18, rx: 2, style: DASHED + ';opacity:.6' }));
        g.appendChild(g1);
        const trOk = st.setup === 'data' || (st.setup === 'trail' && st.kind === 'mgmt');
        const g2 = s('g', { 'data-tip': st.setup === 'none' ? 'No trail was set up, so nothing is kept beyond event history' : (trOk ? 'The trail’s log files in S3, kept as long as the bucket keeps them' : 'The trail logs management events only; S3 object reads need data events turned on') });
        g2.appendChild(s('rect', { x: 0, y: top + rh, width: w, height: rh, fill: 'transparent' }));
        g2.appendChild(s('text', { class: 'lab', x: 0, y: top + rh * 1.5 + 4.5, style: narrow ? 'font-size:12px' : null, text: narrow ? 'trail' : 'trail in S3' }));
        if (st.setup !== 'none') g2.appendChild(trOk ? s('rect', { class: 'barr soft', x: X(0), y: top + rh + 9, width: X(420) - X(0), height: rh - 18, rx: 2 }) : s('rect', { x: X(0), y: top + rh + 9, width: X(420) - X(0), height: rh - 18, rx: 2, style: DASHED + ';opacity:.6' }));
        g.appendChild(g2);
        const ax = X(st.age);
        g.appendChild(s('path', { d: `M${ax} ${top - 6} V${top + rows * rh}`, style: 'stroke:var(--ink);stroke-width:2;stroke-dasharray:3 3' }));
        g.appendChild(s('text', { class: 'val', x: ax, y: top - 8, 'text-anchor': ax > w - 50 ? 'end' : 'middle', text: st.age + ' d' }));
        return g;
      }, 'Ink bar = where this event is kept; dashed outline = that store exists but never holds this kind of event; the dashed line is the event’s age. Hover a row.'));
      box.appendChild(stats([[r.s, r.t, true], [st.age + ' days', 'age of the event'], [st.kind === 'mgmt' ? 'management' : 'data', st.kind === 'mgmt' ? 'event: a management API call' : 'event: an S3 object read or write']]));
      const notes = [];
      if (r.k === 'gone') notes.push('Event history keeps **90 days** of management events. With nothing set up, a call from ' + st.age + ' days ago is no longer anywhere. A trail created today records only from today.');
      else if (r.k === 'never') notes.push('S3 object reads and writes are **data events**: off by default, never shown in event history. Only a trail with data events turned on for the bucket, **before** the access, would have recorded it.');
      else if (r.k === 'hist') notes.push('Within 90 days a management event is in **event history**, free and on by default, even with no trail.');
      else if (r.k === 'both') notes.push('Within 90 days it is in event history **and** in the trail’s log files; the trail keeps it after the 90 days too.');
      else notes.push('Only the **trail’s log files** in S3 still have it: query them with Athena, or with Logs Insights if the trail also delivers to CloudWatch Logs.');
      notes.push('The trail is assumed to have existed before the event. Practice exams sometimes offer CloudTrail Lake here; it takes no new customers from 31 May 2026.');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };
})();
