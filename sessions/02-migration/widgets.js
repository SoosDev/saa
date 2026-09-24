/* Session 2 widgets: DMS cutover timeline, Resolver direction diagram.
   The 7R sorter, MGN step-through and the placement / AD choosers use the generic
   engine widgets (sorter, stepper, chooser); the pipe calculator is Session 1's. */
(function () {
  'use strict';
  const { h, s, md, clear, eyebrow, mountChart } = SAA;
  const W = SAA.widgets;
  const fmtH = hrs => (hrs === Infinity ? 'never' : hrs < 1 ? Math.round(hrs * 60) + ' min' : hrs < 48 ? hrs.toFixed(1) + ' h' : (hrs / 24).toFixed(1) + ' days');

  /* ---------- DMS cutover timeline ---------- */
  const LINKS = [[50, '50 Mbps'], [100, '100 Mbps'], [200, '200 Mbps'], [500, '500 Mbps'], [1000, '1 Gbps'], [10000, '10 Gbps']];
  const PRESETS = [
    { n: 'M3 · 4 TB Oracle', gb: 4000, mbps: 1000, use: 60, rate: 20, cdc: true },
    { n: 'N5 · 10 TB over 50 Mbps', gb: 10000, mbps: 50, use: 100, rate: 3, cdc: true },
    { n: '200 GB, weekend window', gb: 200, mbps: 500, use: 80, rate: 5, cdc: false }
  ];
  const SWITCH = 0.25; // assumed switch-over: stop writes, apply the last changes, repoint the app (15 min)
  W.cutoverTimeline = function () {
    const st = Object.assign({}, PRESETS[0]);
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Cutover timeline · DMS'));
      box.appendChild(h('div', { class: 'chiprow' }, PRESETS.map(p => h('button', { class: 'chip b', type: 'button', 'aria-pressed': String(st.n === p.n), text: p.n, on: { click: () => { Object.assign(st, p); paint(); } } }))));
      const num = (lab, key, attrs) => h('label', { class: 'field' }, h('span', { text: lab }), h('input', Object.assign({ class: 'inp', type: 'number', value: st[key], on: { change: e => { st[key] = Math.max(0, +e.target.value || 0); st.n = null; paint(); } } }, attrs)));
      box.appendChild(h('div', { class: 'grid g4', style: { alignItems: 'end' } },
        num('DATABASE (GB)', 'gb', { min: 1 }),
        h('label', { class: 'field' }, h('span', { text: 'LINK' }), h('select', { class: 'inp', on: { change: e => { st.mbps = +e.target.value; st.n = null; paint(); } } }, LINKS.map(([v, t]) => h('option', { value: v, selected: st.mbps === v }, t)))),
        h('label', { class: 'field' }, h('span', { text: 'USABLE ' + st.use + '%' }), h('input', { type: 'range', min: 10, max: 100, step: 5, value: st.use, 'aria-label': 'Usable share of the link', on: { input: e => { st.use = +e.target.value; st.n = null; paint(); } } })),
        num('CHANGES (GB / HOUR)', 'rate', { min: 0, step: 'any' })));
      box.appendChild(h('div', { class: 'chiprow' },
        h('button', { class: 'chip', type: 'button', 'aria-pressed': String(!st.cdc), text: 'full load', on: { click: () => { st.cdc = false; st.n = null; paint(); } } }),
        h('button', { class: 'chip', type: 'button', 'aria-pressed': String(st.cdc), text: 'full load + CDC', on: { click: () => { st.cdc = true; st.n = null; paint(); } } })));

      const thr = st.mbps * (st.use / 100) * 0.45; // GB per hour: Mbps × 3600 / 8 / 1000
      const full = st.gb / thr;
      const backlog = st.rate * full;
      const catchup = st.rate >= thr ? Infinity : backlog / (thr - st.rate);
      const down = st.cdc ? SWITCH : full + SWITCH;
      const stats = [[fmtH(full), 'full load over the link'], [st.cdc ? Math.round(backlog) + ' GB' : '—', 'changes piled up meanwhile'], [st.cdc ? fmtH(catchup) : '—', 'CDC catch-up'], [st.cdc && catchup === Infinity ? 'never ends' : fmtH(down), 'DOWNTIME']];
      box.appendChild(h('div', { class: 'stats' }, stats.map(([a, b], i) => h('div', { class: 'stat', style: i === 3 ? { borderColor: 'var(--ink)', borderWidth: '2px', padding: '9px 11px' } : null }, h('b', { text: a }), h('span', { text: b })))));

      let verdict;
      if (!st.cdc) verdict = 'Full load only: writes stop for the **whole copy**, so downtime is ' + fmtH(down) + '. Fine for a window that long; wrong for “minimal downtime”.';
      else if (catchup === Infinity) verdict = 'Changes arrive faster than the link carries them, so CDC **never catches up**. Get a bigger pipe or cut the change rate; for the initial load, **seed offline** ({truck|the truck}).';
      else verdict = 'With CDC the source stays online through the ' + fmtH(full) + ' copy and the ' + fmtH(catchup) + ' catch-up. Downtime is only the switch-over (assumed 15 min): stop writes, apply the last changes, repoint the app.' + (full > 24 * 14 ? ' The initial load alone takes ' + fmtH(full) + ': **seed it offline** ({truck|the truck}), then let CDC catch up.' : '');
      box.appendChild(h('div', { class: 'callout' }, eyebrow('Verdict', 'sm'), h('span', null, md(verdict))));

      box.appendChild(mountChart(w => {
        const H = 118, L = 90, R = 12, pw = w - L - R;
        const segs = st.cdc
          ? [['full load', full, 1], ['catch-up', catchup === Infinity ? full * 0.6 : catchup, 0.55], ['switch', SWITCH, 1]]
          : [['full load', full, 1], ['switch', SWITCH, 1]];
        const total = segs.reduce((a, x) => a + x[1], 0);
        const x = v => L + (v / total) * pw;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Migration timeline and downtime' });
        g.appendChild(s('text', { class: 'lab', x: 0, y: 34, text: 'source online' }));
        g.appendChild(s('text', { class: 'lab', x: 0, y: 74, style: 'font-weight:700', text: 'DOWNTIME' }));
        let t = 0;
        segs.forEach(([name, d, op]) => {
          const x1 = x(t), x2 = x(t + d);
          const gg = s('g', { 'data-tip': name + ': ' + (name === 'catch-up' && catchup === Infinity ? 'never finishes' : fmtH(d)) });
          gg.appendChild(s('rect', { class: 'barr', x: x1, y: 20, width: Math.max(3, x2 - x1 - 2), height: 20, rx: 2, style: 'opacity:' + op }));
          if (x2 - x1 > 70) gg.appendChild(s('text', { class: 'val', x: x1 + 6, y: 34, style: 'fill:var(--surface)', text: name }));
          g.appendChild(gg);
          t += d;
        });
        const d0 = st.cdc ? total - SWITCH : 0;
        const dg = s('g', { 'data-tip': 'Downtime: ' + fmtH(down) });
        dg.appendChild(s('rect', { x: x(d0), y: 62, width: Math.max(4, x(total) - x(d0)), height: 18, rx: 2, style: 'fill:var(--ink)' }));
        dg.appendChild(s('text', { class: 'val', x: Math.min(x(d0), w - 110) - 6, y: 76, 'text-anchor': 'end', text: fmtH(down) }));
        g.appendChild(dg);
        g.appendChild(s('line', { x1: L, x2: L + pw, y1: 96, y2: 96, style: 'stroke:var(--track)' }));
        g.appendChild(s('text', { class: 'axis', x: L, y: 112, text: '0' }));
        g.appendChild(s('text', { class: 'axis', x: L + pw, y: 112, 'text-anchor': 'end', text: fmtH(total) }));
        return g;
      }, 'Throughput = link × usable share (1 Gbps ≈ 450 GB/h). The switch-over window is an assumption (15 min); everything else is arithmetic on your inputs.'));
    };
    paint();
    return box;
  };

  /* ---------- Resolver direction ---------- */
  const CASES = {
    'onprem|phz': { ep: 'INBOUND', path: ['srv', 'odns', 'ep', 'vr', 'zone'], text: '**Inbound endpoint.** The query travels **into** the VPC. On-prem DNS gets a conditional forwarder for the zone pointing at the endpoint’s IP addresses.' },
    'ec2|corp': { ep: 'OUTBOUND', path: ['ec2', 'vr', 'ep', 'odns'], text: '**Outbound endpoint + a forwarding rule** for `corp.internal`. The query travels **out of** the VPC to the on-prem DNS servers. The rule can be shared with other accounts through RAM.' },
    'ec2|phz': { ep: null, path: ['ec2', 'vr', 'zone'], text: '**No endpoint.** The VPC Resolver answers from the private hosted zone associated with the VPC.' },
    'onprem|corp': { ep: null, path: ['srv', 'odns'], text: '**No AWS involved.** On-prem DNS answers its own zone.' }
  };
  W.dnsDirection = function () {
    const st = { who: 'onprem', name: 'phz' };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Which endpoint? · Route 53 VPC Resolver'));
      const grp = (label, key, opts) => h('div', { class: 'stubrow' }, h('span', { class: 'stublab', text: label }), h('div', { class: 'chiprow' }, opts.map(([v, t]) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(st[key] === v), text: t, on: { click: () => { st[key] = v; paint(); } } }))));
      box.appendChild(grp('WHO IS ASKING', 'who', [['onprem', 'on-prem server'], ['ec2', 'EC2 instance']]));
      box.appendChild(grp('WHOSE NAME', 'name', [['phz', 'app.aws.internal (private hosted zone)'], ['corp', 'corp.internal (on-prem)']]));
      const c = CASES[st.who + '|' + st.name];
      box.appendChild(mountChart(w => {
        const H = 200, mid = w / 2;
        const P = { srv: [70, 62], odns: [70, 150], ep: [mid + 36, 104], vr: [w - 150, 150], zone: [w - 70, 62], ec2: [w - 150, 62] };
        const narrow = w < 480;
        if (narrow) { P.srv = [48, 62]; P.odns = [48, 150]; P.ep = [mid, 104]; P.ec2 = [w - 120, 62]; P.zone = [w - 44, 62]; P.vr = [w - 44, 150]; }
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'DNS query path' });
        g.appendChild(s('defs', null, s('marker', { id: 'arr', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, s('path', { d: 'M0 0 L10 5 L0 10 z', style: 'fill:var(--ink)' }))));
        g.appendChild(s('rect', { x: 0, y: 0, width: mid - 10, height: H, rx: 6, style: 'fill:var(--zone-onprem)' }));
        g.appendChild(s('rect', { x: mid + 10, y: 0, width: mid - 10, height: H, rx: 6, style: 'fill:var(--zone-aws)' }));
        g.appendChild(s('text', { x: 12, y: 20, 'font-size': 11, 'font-weight': 800, 'letter-spacing': 1.2, 'font-family': 'Overpass, sans-serif', style: 'fill:var(--ink2)', text: 'ON-PREMISES' }));
        g.appendChild(s('text', { x: w - 12, y: 20, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 800, 'letter-spacing': 1.2, 'font-family': 'Overpass, sans-serif', style: 'fill:var(--ink2)', text: 'VPC' }));
        g.appendChild(s('text', { x: mid, y: H - 8, 'text-anchor': 'middle', class: 'axis', text: 'VPN / DX' }));
        if (c.path.length > 1) {
          const pts = c.path.map(k => P[k]);
          g.appendChild(s('path', { d: 'M' + pts.map(p => p.join(' ')).join(' L'), fill: 'none', 'marker-end': 'url(#arr)', style: 'stroke:var(--ink);stroke-width:3;stroke-linejoin:round' }));
        }
        const node = (k, label, shape) => {
          const [x, y] = P[k];
          const on = c.path.includes(k);
          const el = shape === 'tri' ? s('path', { d: `M${x} ${y - 11} L${x + 11} ${y + 8} L${x - 11} ${y + 8} Z`, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:3' }) : s('circle', { cx: x, cy: y, r: 9, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:3' });
          const gg = s('g', { style: 'opacity:' + (on ? 1 : 0.4) }, el, s('text', { class: 'lab', x, y: y < 100 ? y - 16 : y + 28, 'text-anchor': 'middle', style: 'font-weight:700', text: label }));
          g.appendChild(gg);
        };
        if (narrow) { node('srv', 'server'); node('odns', 'DNS', 'tri'); node('ec2', 'EC2'); node('vr', 'Resolver', 'tri'); node('zone', 'zone'); }
        else { node('srv', 'on-prem server'); node('odns', 'on-prem DNS', 'tri'); node('ec2', 'EC2'); node('vr', 'VPC Resolver', 'tri'); node('zone', 'private zone'); }
        const [ex, ey] = P.ep;
        const used = !!c.ep;
        const bw = narrow ? 76 : 88;
        g.appendChild(s('rect', { x: ex - bw / 2, y: ey - 15, width: bw, height: 30, rx: 6, style: used ? 'fill:var(--sel-ink)' : 'fill:var(--surface);stroke:var(--chip-border);stroke-width:1.5;opacity:.6' }));
        g.appendChild(s('text', { x: ex, y: ey + 5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, 'font-family': 'Overpass, sans-serif', style: used ? 'fill:var(--sel-on)' : 'fill:var(--ink2)', text: c.ep || 'endpoint' }));
        return g;
      }));
      box.appendChild(h('div', { class: 'callout' }, eyebrow('Answer', 'sm'), h('span', null, md(c.text))));
    };
    paint();
    return box;
  };
})();
