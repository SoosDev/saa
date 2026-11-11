/* Session 10 widgets: mixed instances split (group size × On-Demand base × On-Demand % above base → On-Demand and Spot
   counts, rounding up in favour of On-Demand), SQS backlog per instance (messages × InService instances × seconds per
   message × acceptable latency → target, backlog, instances needed), cross-zone load balancing (ALB or NLB × cross-zone ×
   targets per AZ → share of traffic per target). Choosers, sorters and steppers use the generic engine widgets.
   Verified inputs (docs/session-10-compute.md): the mixed instances rule and its examples (base 10, 50/50 → 15 + 5 at
   size 20; base 0, 60/40 → 6 + 4 at size 10; 100/0 → no Spot); backlog per instance = ApproximateNumberOfMessages ÷
   InService instances, target = acceptable latency ÷ processing time (1,500 / 10 / 0.1 s / 10 s → target 100, backlog
   150, +5); cross-zone: each load balancer node gets 50% of the clients in the two-AZ example, on → 10% per target, off
   → 25% and 6.25%; ALB cross-zone always on at the load balancer (off per target group possible), NLB off by default.
   Everything else is the learner's setting, and every result is derived from these inputs. */
(function () {
  'use strict';
  const { h, s, md, clear, eyebrow, mountChart } = SAA;
  const W = SAA.widgets;
  const chip = (label, on, click, cls) => h('button', { class: 'chip' + (cls ? ' ' + cls : ''), type: 'button', 'aria-pressed': String(!!on), text: label, on: { click } });
  const group = (label, kids) => h('div', { class: 'stubrow' }, h('span', { class: 'stublab', text: label }), h('div', { class: 'chiprow' }, kids));
  const verdict = (title, text) => h('div', { class: 'callout' }, eyebrow(title, 'sm'), h('span', null, md(text)));
  const stats = rows => h('div', { class: 'stats' }, rows.map(([a, b, strong]) => h('div', { class: 'stat', style: strong ? { borderColor: 'var(--ink)', borderWidth: '2px', padding: '9px 11px' } : null }, h('b', { text: a }), h('span', { text: b }))));
  const n = v => Math.round(v).toLocaleString('en-US');
  const pct = v => (+(v * 100).toFixed(2)) + '%';
  const OUTLINE = 'fill:var(--surface);stroke:var(--ink);stroke-width:1.5;stroke-dasharray:4 3';

  /* ================= Mixed instances split ================= */
  /* On-Demand base first (up to the group size), then the On-Demand percentage of what is above the base, rounded up
     to a whole instance in favour of On-Demand; the rest is Spot. */
  const split = (size, base, p) => {
    const b = Math.min(base, size), rest = size - b;
    const odUp = Math.ceil((rest * p) / 100 - 1e-9);
    return { base: b, odUp, od: b + odUp, spot: rest - odUp, frac: (rest * p) % 100 !== 0 };
  };
  W.mixCalc = function () {
    const st = { size: 20, base: 10, p: 50 };
    const SIZES = [10, 15, 20, 30, 40];
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Mixed instances · On-Demand base, percentage, Spot'));
      box.appendChild(h('p', { class: 'small muted' }, md('An Auto Scaling group with a **mixed instances policy** fills its **On-Demand base** first, then splits everything above the base by the **On-Demand percentage**; the rest is **Spot**. Fractions round up in favour of On-Demand.')));
      box.appendChild(group('GROUP SIZE', SIZES.map(v => chip(String(v), st.size === v, () => { st.size = v; paint(); }))));
      box.appendChild(group('ON-DEMAND BASE', [0, 10].map(v => chip(String(v), st.base === v, () => { st.base = v; paint(); }))));
      box.appendChild(group('ON-DEMAND % ABOVE BASE', [0, 50, 60, 100].map(v => chip(v + '%', st.p === v, () => { st.p = v; paint(); }, 'b'))));
      const r = split(st.size, st.base, st.p);
      box.appendChild(mountChart(w => {
        const narrow = w < 560, labW = narrow ? 64 : 96, valW = narrow ? 64 : 150, rh = 34, top = 6;
        const plot = w - labW - valW, H = top + SIZES.length * rh + 24;
        const X = v => labW + (v / 40) * plot;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'On-Demand and Spot instances at each group size' });
        const grid = s('g', { class: 'grid' });
        [0, 10, 20, 30, 40].forEach(v => { grid.appendChild(s('line', { x1: X(v), x2: X(v), y1: top, y2: top + SIZES.length * rh })); g.appendChild(s('text', { class: 'axis', x: X(v), y: H - 6, 'text-anchor': 'middle', text: String(v) })); });
        g.appendChild(grid);
        SIZES.forEach((sz, i) => {
          const q = split(sz, st.base, st.p), y = top + i * rh, mine = sz === st.size;
          const gg = s('g', { 'data-tip': 'Group size ' + sz + ': ' + q.od + ' On-Demand (' + q.base + ' base + ' + q.odUp + ' above it) and ' + q.spot + ' Spot' });
          gg.appendChild(s('rect', { x: 0, y, width: w, height: rh, fill: 'transparent' }));
          gg.appendChild(s('text', { class: 'lab', x: 0, y: y + rh / 2 + 4.5, style: narrow ? 'font-size:12px' : null, text: (mine ? '▸ ' : '') + 'size ' + sz }));
          if (q.od) gg.appendChild(s('rect', { class: 'barr' + (mine ? '' : ' soft'), x: X(0), y: y + 9, width: Math.max(2, X(q.od) - X(0)), height: rh - 18, rx: 2 }));
          if (q.spot) gg.appendChild(s('rect', { x: X(q.od), y: y + 9, width: Math.max(2, X(q.od + q.spot) - X(q.od)), height: rh - 18, rx: 2, style: OUTLINE + (mine ? '' : ';opacity:.55') }));
          gg.appendChild(s('text', { class: 'val', x: X(sz) + 6, y: y + rh / 2 + 4, text: narrow ? q.od + ' + ' + q.spot : q.od + ' OD · ' + q.spot + ' Spot' }));
          g.appendChild(gg);
        });
        return g;
      }, 'Solid ink = On-Demand; dashed outline = Spot; the label is On-Demand + Spot. ▸ marks your group size; the other rows show the same policy at other sizes. Hover a row.'));
      box.appendChild(stats([[String(r.od), 'On-Demand', true], [String(r.spot), 'Spot'], [String(r.od), 'still running if every Spot Instance is interrupted']]));
      const notes = [];
      notes.push('At size **' + st.size + '** the base takes **' + r.base + '** On-Demand instance' + (r.base === 1 ? '' : 's') + '; the ' + (st.size - r.base) + ' above it split ' + st.p + '% On-Demand → **' + r.odUp + '** On-Demand and **' + r.spot + '** Spot.');
      if (r.frac) notes.push(st.p + '% of ' + (st.size - r.base) + ' is not a whole number, so it rounds **up** to ' + r.odUp + ' On-Demand.');
      if (st.p === 100) notes.push('100% On-Demand above the base means no Spot at all — the group behaves like an ordinary On-Demand group.');
      if (st.p === 0 && st.base === 0) notes.push('Everything is Spot: one large interruption could take the whole group. Keep a base for capacity that must not stop.');
      notes.push('Spread Spot over several instance types and turn on **Capacity Rebalancing** so at-risk Spot Instances are replaced early. Counts are derived from your settings with the rule above.');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };

  /* ================= Backlog per instance ================= */
  /* target (acceptable backlog per instance) = acceptable latency ÷ seconds per message; backlog per instance = messages
     ÷ InService instances; instances needed = messages ÷ target, rounded up. */
  W.backlogCalc = function () {
    const st = { msgs: 1500, inst: 10, sec: 0.1, lat: 10 };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Backlog per instance · scaling workers on SQS'));
      box.appendChild(h('p', { class: 'small muted' }, md('Target tracking on a queue uses **backlog per instance** (`ApproximateNumberOfMessages` ÷ InService instances) against a target of **acceptable latency ÷ time per message**. Set the queue and the workers.')));
      box.appendChild(group('MESSAGES VISIBLE', [300, 1500, 6000].map(v => chip(n(v), st.msgs === v, () => { st.msgs = v; paint(); }))));
      box.appendChild(group('INSERVICE INSTANCES', [5, 10, 20].map(v => chip(String(v), st.inst === v, () => { st.inst = v; paint(); }))));
      box.appendChild(group('SECONDS PER MESSAGE', [0.1, 0.5].map(v => chip(v + ' s', st.sec === v, () => { st.sec = v; paint(); }))));
      box.appendChild(group('ACCEPTABLE LATENCY', [10, 60].map(v => chip(v + ' s', st.lat === v, () => { st.lat = v; paint(); }))));
      const target = Math.round(st.lat / st.sec), backlog = st.msgs / st.inst, need = Math.max(1, Math.ceil(st.msgs / target - 1e-9)), diff = need - st.inst;
      box.appendChild(h('div', { class: 'pre' }, h('pre', { text:
        'target   ' + st.lat + ' s / ' + st.sec + ' s = ' + n(target) + ' per instance\n' +
        'backlog  ' + n(st.msgs) + ' / ' + st.inst + ' = ' + (+backlog.toFixed(1)) + ' per instance\n' +
        'needed   ' + n(st.msgs) + ' / ' + n(target) + ' -> ' + need + ' instances' })));
      const rows = [
        { name: 'backlog per instance', v: backlog, outline: false, tip: 'Backlog per instance: ' + n(st.msgs) + ' messages ÷ ' + st.inst + ' instances = ' + (+backlog.toFixed(1)) },
        { name: 'target (acceptable)', v: target, outline: true, tip: 'Target: ' + st.lat + ' s acceptable latency ÷ ' + st.sec + ' s per message = ' + n(target) + ' messages per instance' }
      ];
      const vmax = Math.max(...rows.map(r => r.v)) * 1.12;
      box.appendChild(mountChart(w => {
        const narrow = w < 560, labW = narrow ? 128 : 170, valW = 56, rh = 40, top = 6;
        const plot = w - labW - valW, H = top + rows.length * rh + 24;
        const X = v => labW + (v / vmax) * plot;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Backlog per instance against the target' });
        const grid = s('g', { class: 'grid' });
        const step = [10, 20, 50, 100, 200, 500, 1000].find(x => vmax / x <= (narrow ? 4 : 6)) || 1000;
        for (let v = 0; v <= vmax; v += step) { grid.appendChild(s('line', { x1: X(v), x2: X(v), y1: top, y2: top + rows.length * rh })); g.appendChild(s('text', { class: 'axis', x: X(v), y: H - 6, 'text-anchor': 'middle', text: n(v) })); }
        g.appendChild(grid);
        rows.forEach((r, i) => {
          const y = top + i * rh;
          const gg = s('g', { 'data-tip': r.tip });
          gg.appendChild(s('rect', { x: 0, y, width: w, height: rh, fill: 'transparent' }));
          gg.appendChild(s('text', { class: 'lab', x: 0, y: y + rh / 2 + 4.5, style: narrow ? 'font-size:12px' : null, text: r.name }));
          gg.appendChild(r.outline ? s('rect', { x: labW, y: y + 10, width: Math.max(2, X(r.v) - labW), height: rh - 20, rx: 2, style: OUTLINE }) : s('rect', { class: 'barr', x: labW, y: y + 10, width: Math.max(2, X(r.v) - labW), height: rh - 20, rx: 2 }));
          gg.appendChild(s('text', { class: 'val', x: X(r.v) + 6, y: y + rh / 2 + 4, text: n(r.v) }));
          g.appendChild(gg);
        });
        return g;
      }, 'Ink bar = backlog per instance now; dashed outline = the target the policy holds. Hover a row.'));
      box.appendChild(stats([[n(target), 'target per instance'], [String(+backlog.toFixed(1)), 'backlog per instance now'], [need + ' (' + (diff > 0 ? '+' + diff : diff < 0 ? String(diff) : '±0') + ')', 'instances needed', true]]));
      const notes = [];
      if (diff > 0) notes.push('Backlog (' + (+backlog.toFixed(1)) + ') is above the target (' + n(target) + '): the policy **scales out by ' + diff + '** to ' + need + ' instances, in proportion to the queue.');
      else if (diff < 0) notes.push('Backlog (' + (+backlog.toFixed(1)) + ') is below the target (' + n(target) + '): the policy can **scale in by ' + (-diff) + '** to ' + need + ' instance' + (need === 1 ? '' : 's') + ' (never below the group’s minimum).');
      else notes.push('Backlog equals the target: the policy **holds** at ' + st.inst + ' instances.');
      notes.push('A target on queue length alone (' + n(st.msgs) + ') would ignore how many instances share it and keep adding instances while the queue drains. The figures are derived from your settings; the AWS example is 1,500 messages, 10 instances, 0.1 s and 10 s.');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };

  /* ================= Cross-zone load balancing ================= */
  /* Two enabled AZs; clients reach each load balancer node equally (50% each). Cross-zone on: every node spreads over all
     targets → 1 / total each. Off: each node only over its own AZ's targets → 50% / targets in that AZ. */
  W.crossZone = function () {
    const st = { lb: 'nlb', on: false, a: 2, b: 8 };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Cross-zone load balancing · share per target'));
      box.appendChild(h('p', { class: 'small muted' }, md('Two Availability Zones, each with a load balancer node that receives **half** of the clients. With **cross-zone** on, every node spreads over all targets; with it off, each node uses only the targets in its own zone.')));
      box.appendChild(group('LOAD BALANCER', [chip('Application Load Balancer', st.lb === 'alb', () => { st.lb = 'alb'; st.on = true; paint(); }, 'b'), chip('Network Load Balancer', st.lb === 'nlb', () => { st.lb = 'nlb'; st.on = false; paint(); }, 'b')]));
      box.appendChild(group('CROSS-ZONE', [chip('on', st.on, () => { st.on = true; paint(); }), chip('off', !st.on, () => { st.on = false; paint(); })]));
      box.appendChild(group('TARGETS IN AZ A', [2, 5].map(v => chip(String(v), st.a === v, () => { st.a = v; paint(); }))));
      box.appendChild(group('TARGETS IN AZ B', [8, 5].map(v => chip(String(v), st.b === v, () => { st.b = v; paint(); }))));
      const tot = st.a + st.b;
      const shA = st.on ? 1 / tot : 0.5 / st.a, shB = st.on ? 1 / tot : 0.5 / st.b;
      const cols = [];
      for (let i = 0; i < st.a; i++) cols.push({ az: 'a', k: i + 1, v: shA });
      for (let i = 0; i < st.b; i++) cols.push({ az: 'b', k: i + 1, v: shB });
      const vmax = Math.max(shA, shB) * 1.18;
      box.appendChild(mountChart(w => {
        const narrow = w < 560, left = 40, top = 22, ph = narrow ? 150 : 180, H = top + ph + 46;
        const gap = 10, plotW = w - left - 8 - gap, cw = plotW / cols.length;
        const Y = v => top + ph - (v / vmax) * ph;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Share of traffic for each target, grouped by Availability Zone' });
        const grid = s('g', { class: 'grid' });
        const step = [0.02, 0.05, 0.1, 0.2].find(x => vmax / x <= 5) || 0.2;
        for (let v = 0; v <= vmax; v += step) { grid.appendChild(s('line', { x1: left, x2: w - 8, y1: Y(v), y2: Y(v) })); g.appendChild(s('text', { class: 'axis', x: left - 6, y: Y(v) + 4, 'text-anchor': 'end', text: Math.round(v * 100) + '%' })); }
        g.appendChild(grid);
        cols.forEach((c, i) => {
          const x = left + i * cw + (c.az === 'b' ? gap : 0), bw = Math.max(4, cw - (narrow ? 5 : 8));
          const gg = s('g', { 'data-tip': 'Target ' + c.k + ' in AZ ' + c.az + ': ' + pct(c.v) + ' of all traffic' });
          gg.appendChild(s('rect', { x, y: top, width: cw, height: ph, fill: 'transparent' }));
          gg.appendChild(s('rect', { class: 'barr', x: x + (cw - bw) / 2, y: Y(c.v), width: bw, height: Math.max(2, top + ph - Y(c.v)), rx: 2 }));
          if (c.k === 1) gg.appendChild(s('text', { class: 'val', x: x + 2, y: Y(c.v) - 6, text: pct(c.v) }));
          g.appendChild(gg);
        });
        const mid = (az, n0, n1) => left + ((n0 + n1) / 2) * cw + (az === 'b' ? gap : 0);
        g.appendChild(s('text', { class: 'lab', x: mid('a', 0, st.a), y: top + ph + 20, 'text-anchor': 'middle', text: 'AZ a · ' + st.a }));
        g.appendChild(s('text', { class: 'lab', x: mid('b', st.a, tot), y: top + ph + 20, 'text-anchor': 'middle', text: 'AZ b · ' + st.b }));
        g.appendChild(s('path', { d: `M${left + st.a * cw + gap / 2} ${top} V${top + ph + 6}`, style: 'stroke:var(--ink2);stroke-width:1;stroke-dasharray:3 3' }));
        return g;
      }, 'One ink bar per target, grouped by Availability Zone; the label on the first bar of each zone is its share. Hover a bar.'));
      box.appendChild(stats([[pct(shA), 'per target in AZ a', true], [pct(shB), 'per target in AZ b'], [(+(Math.max(shA, shB) / Math.min(shA, shB)).toFixed(2)) + '×', 'busiest ÷ quietest target']]));
      const notes = [];
      if (st.on) notes.push('Cross-zone **on**: each node spreads its half over all ' + tot + ' targets, so every target gets ' + pct(1 / tot) + '.');
      else notes.push('Cross-zone **off**: each node keeps its 50% inside its zone — ' + st.a + ' target' + (st.a === 1 ? '' : 's') + ' in AZ a share half the traffic (' + pct(shA) + ' each), ' + st.b + ' in AZ b share the other half (' + pct(shB) + ' each).' + (st.a !== st.b ? ' Uneven zones mean uneven targets.' : ' With equal zones it makes no difference.'));
      notes.push(st.lb === 'alb' ? 'An **ALB** has cross-zone load balancing always on at the load balancer; you can turn it off for a target group.' : 'An **NLB** (like a GWLB) has cross-zone load balancing **off by default**; you can turn it on at any time.');
      notes.push('Shares are derived from your settings with the AWS example’s 50/50 split between the two nodes (2 and 8 targets → 25% and 6.25% off, 10% on).');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };
})();
