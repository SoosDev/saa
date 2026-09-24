/* Session 4 widgets: CloudFront cache simulator (TTL, regional edge caches, invalidation vs versioned
   names, TTL-effect chart), Route 53 routing-policy simulator (world map, health checks), failover race
   (Route 53 DNS failover vs Global Accelerator vs CloudFront origin failover, log-scale chart).
   The "which one answers this?" sorter, the edge-compute chooser and the step-throughs use the
   generic engine widgets (sorter, chooser, stepper). */
(function () {
  'use strict';
  const { h, s, md, clear, eyebrow, mountChart } = SAA;
  const W = SAA.widgets;
  const chip = (label, on, click, cls) => h('button', { class: 'chip' + (cls ? ' ' + cls : ''), type: 'button', 'aria-pressed': String(!!on), text: label, on: { click } });
  const group = (label, kids) => h('div', { class: 'stubrow' }, h('span', { class: 'stublab', text: label }), h('div', { class: 'chiprow' }, kids));
  const verdict = (title, text, cls) => h('div', { class: 'callout' }, eyebrow(title, 'sm'), h('span', { class: cls || null }, md(text)));
  const stats = rows => h('div', { class: 'stats' }, rows.map(([a, b, strong]) => h('div', { class: 'stat', style: strong ? { borderColor: 'var(--ink)', borderWidth: '2px', padding: '9px 11px' } : null }, h('b', { text: a }), h('span', { text: b }))));
  const lineStroke = L => (L ? (L.cls === 'ink' ? 'var(--ink)' : 'var(--' + L.cls + ')') : 'var(--ink)');
  const swatchSvg = (g, L, x, y) => { if (L) g.appendChild(s('line', { x1: x, x2: x + 18, y1: y, y2: y, 'stroke-width': 6, 'stroke-linecap': 'butt', 'stroke-dasharray': L.dash ? '5 3' : null, style: 'stroke:' + lineStroke(L) })); };
  const fmtS = v => (v < 60 ? Math.round(v) + ' s' : v < 3600 ? (Math.round(v / 6) / 10) + ' min' : v < 86400 ? (Math.round(v / 360) / 10) + ' h' : (Math.round(v / 8640) / 10) + ' days');

  /* ================= CloudFront cache simulator ================= */
  const TTLS = [[60, '1 min'], [300, '5 min'], [3600, '1 h'], [86400, '24 h']];
  const DEPLOY = 3600, SPAN = 7200, NREQ = 2400, INVAL_DONE = 60; // invalidation propagation is modelled as 60 s
  function lcg(seed) { let x = seed >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function simulate(o) {
    const rnd = lcg(42);
    const reqs = [];
    for (let i = 0; i < NREQ; i++) reqs.push({ t: rnd() * SPAN, pop: Math.floor(rnd() * o.pops) });
    reqs.sort((a, b) => a.t - b.t);
    const nRec = Math.max(1, Math.round(o.pops / 4));
    const popC = {}, recC = {};
    const r = { pop: 0, rec: 0, origin: 0, stale: 0, buckets: new Array(12).fill(0), inval: o.mode === 'invalidate' ? 1 : 0 };
    let flushed = false;
    for (const q of reqs) {
      if (o.mode === 'invalidate' && !flushed && q.t >= DEPLOY + INVAL_DONE) { for (const k in popC) delete popC[k]; for (const k in recC) delete recC[k]; flushed = true; }
      const cur = q.t >= DEPLOY ? 2 : 1;
      const key = o.mode === 'version' ? 'app.v' + cur + '.js' : 'app.js';
      const pk = q.pop + '|' + key, rk = (q.pop % nRec) + '|' + key;
      let got;
      const e = popC[pk];
      if (e && e.exp > q.t) { r.pop++; got = e.v; }
      else {
        const re = o.rec ? recC[rk] : null;
        if (re && re.exp > q.t) { r.rec++; got = re.v; }
        else { r.origin++; got = cur; r.buckets[Math.floor(q.t / 600)]++; if (o.rec) recC[rk] = { v: got, exp: q.t + o.ttl }; }
        popC[pk] = { v: got, exp: q.t + o.ttl };
      }
      if (got < cur) r.stale++;
    }
    r.hit = (r.pop + r.rec) / NREQ;
    return r;
  }
  W.cacheSim = function (a, ctx) {
    const st = { ttl: 3600, pops: 12, rec: true, mode: 'wait' };
    const box = h('div', { class: 'card widget' });
    const LINES = (ctx && ctx.LINES) || {};
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Cache simulator · CloudFront'));
      box.appendChild(h('p', { class: 'small muted' }, md('2,400 requests for one file over 2 hours, spread over edge locations. At minute 60 you deploy a new version. Watch where each request is answered and how many users still get the **old** file.')));
      box.appendChild(group('TTL', TTLS.map(([v, t]) => chip(t, st.ttl === v, () => { st.ttl = v; paint(); }))));
      box.appendChild(group('EDGE LOCATIONS USED', [3, 12, 40].map(n => chip(String(n), st.pops === n, () => { st.pops = n; paint(); }))));
      box.appendChild(group('REGIONAL EDGE CACHE', [chip('on', st.rec, () => { st.rec = true; paint(); }), chip('off', !st.rec, () => { st.rec = false; paint(); })]));
      box.appendChild(group('AT THE DEPLOY', [['wait', 'just wait for the TTL'], ['invalidate', 'invalidate /app.js'], ['version', 'versioned name app.v2.js']].map(([v, t]) => chip(t, st.mode === v, () => { st.mode = v; paint(); }, 'b'))));
      const r = simulate(st);
      box.appendChild(stats([
        [(Math.floor(r.hit * 1000) / 10) + '%', 'cache hit ratio', true],
        [String(r.pop), 'answered by an edge location'],
        [String(r.rec), 'answered by a regional edge cache'],
        [String(r.origin), 'went to the origin'],
        [String(r.stale), 'got the OLD file after the deploy', true]]));
      let v;
      if (st.mode === 'wait') v = r.stale ? '**' + r.stale + ' users got the old file** after the deploy: every cached copy lives until its TTL runs out (' + TTLS.find(x => x[0] === st.ttl)[1] + '). Long TTLs protect the origin but keep stale copies alive.' : 'The TTL is short enough that no stale copy survived past the next request — at the price of ' + r.origin + ' origin fetches.';
      else if (st.mode === 'invalidate') v = 'The invalidation removes the file from every edge location and regional edge cache (modelled here as done after 60 s; ' + r.stale + ' stale answers before that). Then the next request at each location goes to the origin. **1 path used** — the first 1,000 paths a month are free, a wildcard counts as one. Fine now and then; not 20 times a day.';
      else v = '**No stale answers and nothing to invalidate.** index.html (short TTL) now references app.v2.js, a new cache key that every location fetches once. The old file keeps its long TTL and simply stops being asked for. This is AWS’s advice for frequent changes.';
      box.appendChild(verdict('What happened', v));
      /* chart 1: TTL effect */
      const rows = TTLS.map(([t, lab]) => { const x = simulate(Object.assign({}, st, { ttl: t })); return { t, lab, origin: x.origin, hit: x.hit, stale: x.stale }; });
      box.appendChild(mountChart(w => {
        const narrow = w < 520, rowH = narrow ? 46 : 34, top = 6, labW = narrow ? 0 : 150, R = 118, axisH = 24;
        const plotL = labW + 6, pw = Math.max(60, w - plotL - R);
        const max = Math.max(...rows.map(x => x.origin), 1);
        const H = top + rows.length * rowH + axisH;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Origin fetches for each TTL' });
        const grid = s('g', { class: 'grid' });
        const ticks = SAA.niceTicks(max);
        ticks.forEach(tk => grid.appendChild(s('line', { x1: plotL + (tk / max) * pw, x2: plotL + (tk / max) * pw, y1: top, y2: top + rows.length * rowH })));
        g.appendChild(grid);
        ticks.forEach(tk => { if (tk <= max) g.appendChild(s('text', { class: 'axis', x: plotL + (tk / max) * pw, y: H - 6, 'text-anchor': 'middle', text: String(tk) })); });
        rows.forEach((x, i) => {
          const y0 = top + i * rowH, on = x.t === st.ttl;
          const gg = s('g', { 'data-tip': 'TTL ' + x.lab + ': ' + x.origin + ' origin fetches, ' + Math.round(x.hit * 100) + '% hit ratio, ' + x.stale + ' stale answers if you just wait' });
          gg.appendChild(s('rect', { x: 0, y: y0, width: w, height: rowH, fill: 'transparent' }));
          const lx = narrow ? plotL : 0, ly = narrow ? y0 + 13 : y0 + rowH / 2 + 4.5;
          swatchSvg(gg, LINES.cf, lx + 2, ly - 4.5);
          gg.appendChild(s('text', { class: 'lab', x: lx + 26, y: ly, style: on ? 'font-weight:700' : null, text: 'TTL ' + x.lab + (on ? ' ◂' : '') }));
          const by = narrow ? y0 + 22 : y0 + 9, bh = narrow ? 14 : rowH - 18;
          const bw = Math.max(2, (x.origin / max) * pw);
          gg.appendChild(s('rect', { class: 'barr' + (on ? '' : ' soft'), x: plotL, y: by, width: bw, height: bh, rx: 2 }));
          gg.appendChild(s('text', { class: 'val', x: plotL + bw + 6, y: by + bh / 2 + 4, text: x.origin + ' · ' + (Math.floor(x.hit * 1000) / 10) + '% hit' }));
          g.appendChild(gg);
        });
        return g;
      }, 'Origin fetches in the 2 hours for each TTL, with the other settings as chosen (ink bar = your TTL). Longer TTL → fewer trips to the origin and a higher hit ratio. Hover a row for the stale count if you only wait. Swatch = CloudFront line.'));
      /* chart 2: origin fetches over time */
      box.appendChild(mountChart(w => {
        const H = 120, L = 34, R = 8, top = 10, bot = 26, pw = w - L - R, ph = H - top - bot;
        const max = Math.max(...r.buckets, 1);
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Origin fetches per 10 minutes' });
        const grid = s('g', { class: 'grid' });
        [0, max].forEach(v2 => grid.appendChild(s('line', { x1: L, x2: L + pw, y1: top + ph - (v2 / max) * ph, y2: top + ph - (v2 / max) * ph })));
        g.appendChild(grid);
        g.appendChild(s('text', { class: 'axis', x: L - 6, y: top + 4, 'text-anchor': 'end', text: String(max) }));
        g.appendChild(s('text', { class: 'axis', x: L - 6, y: top + ph + 4, 'text-anchor': 'end', text: '0' }));
        const bw = pw / 12;
        r.buckets.forEach((n, i) => {
          const bh = (n / max) * ph;
          const gg = s('g', { 'data-tip': 'minutes ' + i * 10 + '–' + (i + 1) * 10 + ': ' + n + ' origin fetches' });
          gg.appendChild(s('rect', { x: L + i * bw, y: top, width: bw, height: ph, fill: 'transparent' }));
          gg.appendChild(s('rect', { class: 'barr', x: L + i * bw + 3, y: top + ph - bh, width: Math.max(2, bw - 6), height: Math.max(n ? 2 : 0, bh), rx: 2 }));
          g.appendChild(gg);
        });
        const dx = L + pw / 2;
        g.appendChild(s('line', { x1: dx, x2: dx, y1: top - 4, y2: top + ph, 'stroke-dasharray': '4 3', style: 'stroke:var(--ink);stroke-width:2' }));
        g.appendChild(s('text', { class: 'axis', x: dx - 4, y: top + 8, 'text-anchor': 'end', text: 'deploy' }));
        (w < 480 ? [0, 60, 120] : [0, 30, 60, 90, 120]).forEach(m => g.appendChild(s('text', { class: 'axis', x: L + (m / 120) * pw, y: H - 8, 'text-anchor': m === 0 ? 'start' : m === 120 ? 'end' : 'middle', text: m + ' min' })));
        return g;
      }, 'Origin fetches per 10 minutes. After a deploy, invalidation and versioned names both cause a burst of misses; waiting causes none — and serves the old file instead.'));
    };
    paint();
    return box;
  };

  /* ================= Route 53 routing-policy simulator ================= */
  const REG = { V: { n: 'us-east-1', city: 'N. Virginia', lat: 38.9, lon: -77.4 }, I: { n: 'eu-west-1', city: 'Ireland', lat: 53.3, lon: -6.3 }, S: { n: 'ap-southeast-1', city: 'Singapore', lat: 1.35, lon: 103.8 } };
  const USERS = [
    { id: 'ny', n: 'New York', lat: 40.7, lon: -74.0, cont: 'NA', cc: 'US' },
    { id: 'sp', n: 'São Paulo', lat: -23.5, lon: -46.6, cont: 'SA', cc: 'BR' },
    { id: 'lo', n: 'London', lat: 51.5, lon: -0.1, cont: 'EU', cc: 'GB', ip: '203.0.113.40' },
    { id: 'fr', n: 'Frankfurt', lat: 50.1, lon: 8.7, cont: 'EU', cc: 'DE' },
    { id: 'mu', n: 'Mumbai', lat: 19.1, lon: 72.9, cont: 'AS', cc: 'IN' },
    { id: 'to', n: 'Tokyo', lat: 35.7, lon: 139.7, cont: 'AS', cc: 'JP', ip: '198.51.100.9' },
    { id: 'sy', n: 'Sydney', lat: -33.9, lon: 151.2, cont: 'OC', cc: 'AU' }
  ];
  const POL = [['simple', 'simple'], ['weighted', 'weighted'], ['latency', 'latency'], ['failover', 'failover'], ['geo', 'geolocation'], ['geoprox', 'geoproximity'], ['multi', 'multivalue'], ['ip', 'IP-based']];
  const rad = d => d * Math.PI / 180;
  const dist = (a, b) => { const dl = rad(b.lat - a.lat), dn = rad(b.lon - a.lon); const x = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dn / 2) ** 2; return 6371 * 2 * Math.asin(Math.sqrt(x)); };
  const POLTXT = {
    simple: 'One record holding the three IP addresses. Route 53 returns **all of them** in random order and the client picks one. Simple records have **no health checks**, so a dead Region is still handed out.',
    weighted: 'One record per Region with a weight (0–255). Each answer is chosen in proportion to weight **among healthy records**. Built for canaries and gradual shifts.',
    latency: 'One record per Region. Route 53 answers with the Region that has the **lowest latency** from the user’s network (AWS measures it; here it is modelled by distance). Unhealthy Regions are skipped.',
    failover: '**Primary** us-east-1 with a health check, **secondary** eu-west-1. Everyone gets the primary until its health check fails. Active-passive.',
    geo: 'Records for **Europe** → eu-west-1, **Asia** → ap-southeast-1, **United States** → us-east-1, plus an optional **Default**. The answer depends on where the user **is**, not on speed.',
    geoprox: 'One record per Region located at the Region. Route 53 picks the smallest **biased distance = distance × (1 − bias/100)**. Change eu-west-1’s bias and watch its area grow or shrink.',
    multi: 'One record per Region, each with its own health check. Route 53 returns **up to 8 healthy records** and the client can retry another. Not a load balancer.',
    ip: 'A **CIDR collection**: 203.0.113.0/24 (the London office) → eu-west-1, 198.51.100.0/24 (a Tokyo ISP) → ap-southeast-1, and the default “*” location → us-east-1. Everyone else gets the default. (Health-based fallback for IP-based records is not modelled here.)'
  };
  function answer(st, u) {
    const up = k => st.health[k];
    const healthy = ['V', 'I', 'S'].filter(up);
    const byDist = (ks, bias) => ks.slice().sort((a, b) => dist(u, REG[a]) * (1 - ((bias || {})[a] || 0) / 100) - dist(u, REG[b]) * (1 - ((bias || {})[b] || 0) / 100));
    switch (st.pol) {
      case 'simple': return { to: ['V', 'I', 'S'], share: { V: 1 / 3, I: 1 / 3, S: 1 / 3 }, why: 'all three IPs, random order' + (healthy.length < 3 ? ' — including the unhealthy one' : '') };
      case 'weighted': {
        const ks = healthy.length ? healthy : ['V', 'I', 'S'];
        const tot = ks.reduce((x, k) => x + st.w[k], 0) || 1;
        const share = {}; ks.forEach(k => { share[k] = st.w[k] / tot; });
        return { to: ks.filter(k => share[k] > 0), share, why: ks.filter(k => share[k] > 0).map(k => REG[k].n + ' ' + Math.round(share[k] * 100) + '%').join(' · ') + (healthy.length ? '' : ' (all unhealthy: answers anyway)') };
      }
      case 'latency': {
        const all = byDist(['V', 'I', 'S']);
        const pick = (healthy.length ? byDist(healthy) : all)[0];
        return { to: [pick], why: pick === all[0] ? 'lowest latency' : 'nearest (' + REG[all[0]].n + ') is unhealthy → next lowest' };
      }
      case 'failover':
        if (up('V')) return { to: ['V'], why: 'primary healthy' };
        if (up('I')) return { to: ['I'], why: 'primary unhealthy → secondary' };
        return { to: ['V'], why: 'both unhealthy → Route 53 returns the primary' };
      case 'geo': {
        let rec = u.cc === 'US' ? 'V' : u.cont === 'EU' ? 'I' : u.cont === 'AS' ? 'S' : null;
        const lab = rec === 'V' ? 'United States record' : rec === 'I' ? 'Europe record' : rec === 'S' ? 'Asia record' : null;
        if (rec && up(rec)) return { to: [rec], why: lab };
        if (st.def) return { to: ['V'], why: rec ? lab + ' unhealthy → Default record' : 'no matching record → Default' };
        return { to: [], why: rec ? lab + ' unhealthy, no Default → no answer' : 'no matching record and no Default → no answer' };
      }
      case 'geoprox': {
        const bias = { I: st.bias };
        const all = byDist(['V', 'I', 'S'], bias);
        const pick = (healthy.length ? byDist(healthy, bias) : all)[0];
        return { to: [pick], why: 'smallest biased distance' + (pick !== all[0] ? ' among healthy Regions' : '') + (st.bias ? ' (eu-west-1 bias ' + (st.bias > 0 ? '+' : '') + st.bias + ')' : '') };
      }
      case 'multi': {
        const ks = healthy.length ? healthy : ['V', 'I', 'S'];
        const share = {}; ks.forEach(k => { share[k] = 1 / ks.length; });
        return { to: ks, share, why: ks.length + ' healthy record' + (ks.length > 1 ? 's' : '') + ' returned' + (healthy.length ? '' : ' (all unhealthy: returns them anyway)') };
      }
      case 'ip':
        if (u.ip && u.ip.startsWith('203.0.113.')) return { to: ['I'], why: u.ip + ' matches 203.0.113.0/24' };
        if (u.ip && u.ip.startsWith('198.51.100.')) return { to: ['S'], why: u.ip + ' matches 198.51.100.0/24' };
        return { to: ['V'], why: 'no CIDR match → default “*”' };
    }
    return { to: [], why: '' };
  }
  W.routingSim = function (a, ctx) {
    const st = { pol: 'latency', health: { V: true, I: true, S: true }, w: { V: 70, I: 20, S: 10 }, def: true, bias: 0 };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Routing-policy simulator · Route 53'));
      box.appendChild(group('ROUTING POLICY', POL.map(([k, t]) => chip(t, st.pol === k, () => { st.pol = k; paint(); }))));
      box.appendChild(group('HEALTH CHECKS (tap to fail a Region)', ['V', 'I', 'S'].map(k => chip(REG[k].n + (st.health[k] ? ' ✓' : ' ✕ unhealthy'), !st.health[k], () => { st.health[k] = !st.health[k]; paint(); }, 'b'))));
      if (st.pol === 'weighted') box.appendChild(group('WEIGHTS (V · I · S)', [[70, 20, 10], [90, 10, 0], [34, 33, 33], [0, 0, 255]].map(wv => chip(wv.join(' · '), st.w.V === wv[0] && st.w.I === wv[1] && st.w.S === wv[2], () => { st.w = { V: wv[0], I: wv[1], S: wv[2] }; paint(); }))));
      if (st.pol === 'geo') box.appendChild(group('DEFAULT RECORD', [chip('Default → us-east-1', st.def, () => { st.def = true; paint(); }, 'b'), chip('no Default', !st.def, () => { st.def = false; paint(); }, 'b')]));
      if (st.pol === 'geoprox') box.appendChild(group('BIAS ON eu-west-1', [-50, 0, 25, 50, 80].map(b => chip((b > 0 ? '+' : '') + b, st.bias === b, () => { st.bias = b; paint(); }))));
      box.appendChild(h('p', { class: 'small' }, md(POLTXT[st.pol])));
      const res = USERS.map(u => ({ u, r: answer(st, u) }));
      box.appendChild(mountChart(w => {
        const narrow = w < 560, H = Math.round(w * (narrow ? 0.62 : 0.46));
        const lat0 = 68, lat1 = -46, lon0 = -160, lon1 = 170;
        const px = lon => 12 + ((lon - lon0) / (lon1 - lon0)) * (w - 24);
        const py = lat => 10 + ((lat0 - lat) / (lat0 - lat1)) * (H - 20);
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'World map with the Region each user is sent to' });
        const grid = s('g', { class: 'grid' });
        [-30, 0, 30, 60].forEach(la => grid.appendChild(s('line', { x1: 0, x2: w, y1: py(la), y2: py(la) })));
        [-90, -30, 30, 90, 150].forEach(lo => grid.appendChild(s('line', { x1: px(lo), x2: px(lo), y1: 0, y2: H })));
        g.appendChild(grid);
        g.appendChild(s('text', { class: 'axis', x: 4, y: py(0) - 4, text: 'equator' }));
        res.forEach(({ u, r }) => r.to.forEach(k => {
          const share = r.share ? r.share[k] : 1;
          g.appendChild(s('line', { x1: px(u.lon), y1: py(u.lat), x2: px(REG[k].lon), y2: py(REG[k].lat), 'stroke-dasharray': r.share ? '5 4' : null, style: 'stroke:var(--ink);stroke-width:' + (1 + 2.5 * share) + ';opacity:' + (0.35 + 0.5 * share) }));
        }));
        Object.keys(REG).forEach(k => {
          const R = REG[k], x = px(R.lon), y = py(R.lat), ok = st.health[k];
          const gg = s('g', { 'data-tip': R.n + ' (' + R.city + ')' + (ok ? ' — healthy' : ' — health check failing') });
          gg.appendChild(s('rect', { x: x - 9, y: y - 9, width: 18, height: 18, rx: 2, style: 'fill:' + (ok ? 'var(--ink)' : 'var(--surface)') + ';stroke:var(--ink);stroke-width:2.5' }));
          if (!ok) gg.appendChild(s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800, style: 'fill:var(--ink)', text: '✕' }));
          const off = (narrow ? { V: [-12, 22], I: [-14, -6], S: [-12, 24] } : { V: [-13, 4], I: [-12, -12], S: [-12, 24] })[k];
          gg.appendChild(s('text', { class: 'val', x: x + off[0], y: y + off[1], 'text-anchor': 'end', style: 'font-weight:600', text: R.n }));
          g.appendChild(gg);
        });
        res.forEach(({ u, r }) => {
          const x = px(u.lon), y = py(u.lat);
          const gg = s('g', { 'data-tip': u.n + ' → ' + (r.to.length ? r.to.map(k => REG[k].n).join(', ') : 'no answer') + ' (' + r.why + ')' });
          gg.appendChild(s('circle', { cx: x, cy: y, r: 6, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:2.5' }));
          const o = (narrow ? { ny: [-10, -9, 'end'], sp: [9, 4, 'start'], lo: [4, -12, 'start'], fr: [9, 10, 'start'], mu: [-9, -6, 'end'], to: [-9, 4, 'end'], sy: [-9, 4, 'end'] } : { ny: [8, -8, 'start'], sp: [9, 4, 'start'], lo: [6, -9, 'start'], fr: [9, 14, 'start'], mu: [-9, -6, 'end'], to: [-9, 4, 'end'], sy: [-9, 4, 'end'] })[u.id];
          gg.appendChild(s('text', { class: 'lab', x: x + o[0], y: y + o[1], 'text-anchor': o[2], style: 'font-size:12px', text: u.n }));
          g.appendChild(gg);
        });
        return g;
      }, 'Circles = users, squares = Regions (hollow ✕ = health check failing). Solid line = the one answer; dashed lines = shared answers, thicker = bigger share. Latency is modelled by distance; Route 53 uses measured latency. Hover for the reason.'));
      box.appendChild(h('div', { class: 'tbl' }, h('table', null, h('thead', null, h('tr', null, h('th', { text: 'User' }), h('th', { text: 'Answer' }), h('th', { text: 'Why' }))),
        h('tbody', null, res.map(({ u, r }) => h('tr', null, h('td', { text: u.n + (u.ip ? ' · ' + u.ip : '') }), h('td', { class: 'mono', text: r.to.length ? r.to.map(k => REG[k].n).join(', ') : 'no answer' }), h('td', { text: r.why })))))));
    };
    paint();
    return box;
  };

  /* ================= Failover race ================= */
  W.failoverRace = function (a, ctx) {
    const st = { ttl: 60, interval: 30, thr: 3, clients: 'browser', attempts: 3, timeout: 10 };
    const box = h('div', { class: 'card widget' });
    const LINES = (ctx && ctx.LINES) || {};
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Failover race · Route 53 vs Global Accelerator vs CloudFront'));
      box.appendChild(h('p', { class: 'small muted' }, md('Region A dies at t = 0. How long until users reach Region B? Change the settings; the chart is log scale.')));
      box.appendChild(group('ROUTE 53 RECORD TTL', [[60, '60 s'], [300, '300 s'], [3600, '1 h']].map(([v, t]) => chip(t, st.ttl === v, () => { st.ttl = v; paint(); }))));
      box.appendChild(group('HEALTH CHECK INTERVAL × FAILURE THRESHOLD', [[30, 3, '30 s × 3 (default)'], [10, 3, '10 s × 3 (fast)'], [10, 1, '10 s × 1'], [30, 5, '30 s × 5']].map(([i, t, l]) => chip(l, st.interval === i && st.thr === t, () => { st.interval = i; st.thr = t; paint(); }, 'b'))));
      box.appendChild(group('CLIENTS', [chip('browsers honour TTL', st.clients === 'browser', () => { st.clients = 'browser'; paint(); }, 'b'), chip('devices cache DNS 24 h', st.clients === 'device', () => { st.clients = 'device'; paint(); }, 'b')]));
      box.appendChild(group('CLOUDFRONT ORIGIN: ATTEMPTS × TIMEOUT', [[3, 10, '3 × 10 s (default)'], [1, 5, '1 × 5 s'], [2, 3, '2 × 3 s']].map(([n, t, l]) => chip(l, st.attempts === n && st.timeout === t, () => { st.attempts = n; st.timeout = t; paint(); }, 'b'))));
      const detect = st.interval * st.thr;
      const cache = st.clients === 'device' ? 86400 : st.ttl;
      const r53 = detect + cache;
      const cfw = st.attempts * st.timeout;
      const rows = [
        { line: 'r53', label: 'Route 53 · health check fails', v: detect, tip: 'Detection: ' + st.interval + ' s interval × ' + st.thr + ' failures = ' + detect + ' s. From then on Route 53 answers with the secondary.' },
        { line: 'r53', label: 'Route 53 · clients switch', v: r53, tip: 'Detection ' + detect + ' s + cached answer ' + fmtS(cache) + (st.clients === 'device' ? ' (devices ignore the TTL)' : ' (TTL)') + ' = ' + fmtS(r53) + ' worst case.' },
        { line: 'ga', label: 'Global Accelerator', v: 60, cap: true, tip: 'AWS: an unhealthy endpoint is taken out of service in less than one minute; the IPs never change, so DNS caching does not matter. Bar drawn at the 1-minute upper bound.' },
        { line: 'cf', label: 'CloudFront origin group', v: cfw, tip: 'Per request: CloudFront tries the primary ' + st.attempts + ' × ' + st.timeout + ' s = ' + cfw + ' s, then the secondary. GET/HEAD/OPTIONS only; every new request tries the primary first.' }
      ];
      box.appendChild(mountChart(w => {
        const narrow = w < 560, rowH = narrow ? 48 : 34, top = 6, labW = narrow ? 0 : 230, R = 70, axisH = 24;
        const plotL = labW + 6, pw = Math.max(60, w - plotL - R);
        const lo = Math.log10(3), hi = Math.log10(100000);
        const x = v => plotL + ((Math.log10(Math.max(3, v)) - lo) / (hi - lo)) * pw;
        const H = top + rows.length * rowH + axisH;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Time until users reach the healthy Region, log scale' });
        const grid = s('g', { class: 'grid' });
        const T = [[10, '10 s'], [60, '1 min'], [600, '10 min'], [3600, '1 h'], [86400, '1 day']].filter(t => !narrow || t[0] !== 600);
        T.forEach(([t]) => grid.appendChild(s('line', { x1: x(t), x2: x(t), y1: top, y2: top + rows.length * rowH })));
        g.appendChild(grid);
        T.forEach(([t, l]) => g.appendChild(s('text', { class: 'axis', x: x(t), y: H - 6, 'text-anchor': 'middle', text: l })));
        rows.forEach((b, i) => {
          const y0 = top + i * rowH;
          const gg = s('g', { 'data-tip': b.label + ': ' + b.tip });
          gg.appendChild(s('rect', { x: 0, y: y0, width: w, height: rowH, fill: 'transparent' }));
          const lx = narrow ? plotL : 0, ly = narrow ? y0 + 13 : y0 + rowH / 2 + 4.5;
          swatchSvg(gg, LINES[b.line], lx + 2, ly - 4.5);
          gg.appendChild(s('text', { class: 'lab', x: lx + 26, y: ly, text: b.label }));
          const by = narrow ? y0 + 22 : y0 + 9, bh = narrow ? 14 : rowH - 18;
          gg.appendChild(s('rect', { class: 'barr' + (i === 0 ? ' soft' : ''), x: plotL, y: by, width: Math.max(3, x(b.v) - plotL), height: bh, rx: 2 }));
          gg.appendChild(s('text', { class: 'val', x: x(b.v) + 6, y: by + bh / 2 + 4, text: (b.cap ? '< ' : '') + fmtS(b.v) }));
          g.appendChild(gg);
        });
        return g;
      }, 'Log scale: each gridline is a bigger unit. Swatch + label give identity: dashed ink = Route 53, indigo = Global Accelerator, wine = CloudFront. Route 53 ≈ interval × threshold + TTL (AWS blog); GA “less than one minute” (AWS FAQ); CloudFront origin timeout × attempts. Hover each bar for the arithmetic.'));
      let v;
      if (st.clients === 'device') v = 'Devices that cache DNS for a day keep calling the dead Region: **DNS failover cannot beat their cache**. This is the case for **Global Accelerator** — same IPs, failover behind them.';
      else if (r53 <= 180) v = 'With a ' + st.ttl + ' s TTL and ' + detect + ' s detection, **Route 53 failover** moves browsers in about ' + fmtS(r53) + '. For “minutes are acceptable, cheapest”, that is the answer.';
      else v = 'A ' + fmtS(st.ttl) + ' TTL keeps resolvers on the dead Region long after the health check fails. Lower the TTL (AWS suggests about 60 s for failover records) — or use **Global Accelerator** if the requirement is under a minute.';
      box.appendChild(verdict('Verdict', v + ' **CloudFront origin failover** is per request and only for reads: good for serving a replicated S3 bucket, not for moving a whole application.'));
    };
    paint();
    return box;
  };
})();
