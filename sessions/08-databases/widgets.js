/* Session 8 widgets: connection-storm simulator (Lambda concurrency vs max_connections, with and without RDS Proxy),
   DynamoDB capacity calculator (item size, reads/writes, consistency → RCU/WCU, on-demand vs provisioned cost over
   utilisation with the crossover), cache-pattern simulator (lazy loading vs write-through, with and without TTL: hits,
   stale reads, wasted cache writes, memory held). Choosers, sorters and steppers use the generic engine widgets.
   Prices: us-east-1 list prices, Standard table class (docs/session-08-databases.md). Everything else the user sets. */
(function () {
  'use strict';
  const { h, s, md, clear, eyebrow, mountChart } = SAA;
  const W = SAA.widgets;
  const chip = (label, on, click, cls) => h('button', { class: 'chip' + (cls ? ' ' + cls : ''), type: 'button', 'aria-pressed': String(!!on), text: label, on: { click } });
  const group = (label, kids) => h('div', { class: 'stubrow' }, h('span', { class: 'stublab', text: label }), h('div', { class: 'chiprow' }, kids));
  const verdict = (title, text) => h('div', { class: 'callout' }, eyebrow(title, 'sm'), h('span', null, md(text)));
  const stats = rows => h('div', { class: 'stats' }, rows.map(([a, b, strong]) => h('div', { class: 'stat', style: strong ? { borderColor: 'var(--ink)', borderWidth: '2px', padding: '9px 11px' } : null }, h('b', { text: a }), h('span', { text: b }))));
  const n = v => Math.round(v).toLocaleString('en-US');
  const usd = v => '$' + (v >= 100 ? n(v) : v.toFixed(2));

  /* ================= Connection storm ================= */
  /* max_connections defaults from the RDS quotas page (MySQL): ~60 on db.t3.micro, ~630 on an 8 GiB class such as
     db.m7g.large. Lambda account default: 1,000 concurrent executions per Region. Pool cap and DB time share are
     the learner's assumptions. */
  W.connStorm = function () {
    const st = { conc: 1000, max: 60, share: 0.2, proxy: false };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Connection storm · Lambda vs max_connections'));
      box.appendChild(h('p', { class: 'small muted' }, md('Every Lambda execution environment that opens its own database connection holds it while it lives. Scale the function out and the database runs out of connections long before it runs out of CPU. Set the burst, the instance and whether **RDS Proxy** sits in between.')));
      box.appendChild(group('LAMBDA CONCURRENCY', [50, 200, 1000].map(v => chip(v === 1000 ? '1,000 (account default)' : String(v), st.conc === v, () => { st.conc = v; paint(); }))));
      box.appendChild(group('DB INSTANCE (RDS FOR MYSQL)', [[60, 'db.t3.micro · ~60'], [630, '8 GiB class · ~630']].map(([v, t]) => chip(t, st.max === v, () => { st.max = v; paint(); }, 'b'))));
      box.appendChild(group('SHARE OF EACH INVOCATION SPENT IN A QUERY', [[0.1, '10%'], [0.2, '20%'], [0.5, '50%']].map(([v, t]) => chip(t, st.share === v, () => { st.share = v; paint(); }))));
      box.appendChild(group('BETWEEN LAMBDA AND THE DATABASE', [chip('nothing (direct)', !st.proxy, () => { st.proxy = false; paint(); }, 'b'), chip('RDS Proxy', st.proxy, () => { st.proxy = true; paint(); }, 'b')]));
      const pool = Math.floor(st.max * 0.9);
      const busy = Math.ceil(st.conc * st.share);
      const direct = st.conc, refused = Math.max(0, direct - st.max);
      const viaProxy = Math.min(busy, pool), queued = Math.max(0, busy - pool);
      const rows = [
        { k: 'env', name: 'Lambda environments', v: st.conc, tip: st.conc + ' concurrent invocations, each in its own execution environment' },
        { k: 'dir', name: 'DB connections · direct', v: direct, over: refused, tip: direct + ' connections wanted, one per environment, busy or idle · ' + (refused ? refused + ' refused (“Too many connections”)' : 'all fit') },
        { k: 'px', name: 'DB connections · RDS Proxy', v: viaProxy, over: 0, q: queued, tip: 'Only ~' + busy + ' invocations are inside a query at any moment; the proxy lends them pooled connections (pool cap ' + pool + ')' + (queued ? ' · ' + queued + ' wait in the proxy queue' : '') }
      ];
      const max = Math.max(st.conc, st.max) * 1.08;
      box.appendChild(mountChart(w => {
        const narrow = w < 560, labW = narrow ? 128 : 220, valW = 56, rh = 40, top = 22;
        const plot = w - labW - valW, H = top + rows.length * rh + 24;
        const X = v => labW + (v / max) * plot;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Connections at the database against max_connections' });
        const step = [10, 20, 50, 100, 200, 250, 500].find(x => max / x <= (narrow ? 4 : 6)) || 500;
        const grid = s('g', { class: 'grid' });
        for (let v = 0; v <= max; v += step) { grid.appendChild(s('line', { x1: X(v), x2: X(v), y1: top, y2: top + rows.length * rh })); g.appendChild(s('text', { class: 'axis', x: X(v), y: H - 6, 'text-anchor': 'middle', text: n(v) })); }
        g.appendChild(grid);
        rows.forEach((r, i) => {
          const y = top + i * rh, on = (r.k === 'dir' && !st.proxy) || (r.k === 'px' && st.proxy) || r.k === 'env';
          const gg = s('g', { 'data-tip': r.name + ': ' + r.tip });
          gg.appendChild(s('rect', { x: 0, y, width: w, height: rh, fill: 'transparent' }));
          gg.appendChild(s('text', { class: 'lab', x: 0, y: y + rh / 2 + 4.5, style: (narrow ? 'font-size:12px;' : '') + (on && r.k !== 'env' ? 'font-weight:700' : ''), text: narrow ? r.name.replace('DB connections · ', 'DB · ').replace('Lambda environments', 'Lambda envs') : r.name }));
          const fit = r.v - (r.over || 0);
          gg.appendChild(s('rect', { class: 'barr' + (r.k === 'env' ? ' soft' : ''), x: labW, y: y + 10, width: Math.max(2, X(fit) - labW), height: rh - 20, rx: 2, style: on ? null : 'opacity:.4' }));
          if (r.over) gg.appendChild(s('rect', { x: X(fit), y: y + 10, width: X(r.v) - X(fit), height: rh - 20, rx: 2, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:1.5;stroke-dasharray:4 3' + (on ? '' : ';opacity:.4') }));
          gg.appendChild(s('text', { class: 'val', x: X(r.v) + 6, y: y + rh / 2 + 4, text: n(r.v) }));
          g.appendChild(gg);
        });
        const lx = X(st.max);
        g.appendChild(s('path', { d: `M${lx} ${top - 6} V${top + rows.length * rh}`, style: 'stroke:var(--ink);stroke-width:2;stroke-dasharray:5 3' }));
        const right = lx > w - 150;
        g.appendChild(s('text', { class: 'val', x: lx + (right ? -4 : 4), y: top - 9, 'text-anchor': right ? 'end' : 'start', text: 'max_connections ' + n(st.max) }));
        return g;
      }, 'Dashed line = the instance’s max_connections. Outlined dashed segment = connections the database refuses. The faded bar is the path you did not pick. Hover a row.'));
      box.appendChild(stats(st.proxy
        ? [[String(0), 'connections refused', true], [n(viaProxy), 'database connections in use'], [n(queued), 'invocations waiting in the proxy']]
        : [[n(refused), 'connections refused', true], [n(direct), 'database connections wanted'], [refused ? Math.round((refused / st.conc) * 100) + '%' : '0%', 'of invocations fail to connect']]));
      const notes = [];
      if (!st.proxy && refused) notes.push('Each idle environment still holds a connection, so the database refuses ' + n(refused) + ' of them with “Too many connections”. **Raising Lambda concurrency** — your baseline Q15 pick — only makes this worse; a bigger instance moves the ceiling but every new burst finds it again.');
      if (!st.proxy && !refused) notes.push('Everything fits — at this burst and on this instance. Connections still open and close at Lambda’s pace, which costs the database CPU and memory for every TLS handshake and login.');
      if (st.proxy) notes.push('RDS Proxy keeps a **pool** of connections to the database and lends one to an invocation only while it runs a query. ' + n(st.conc) + ' clients share ' + n(viaProxy) + ' database connections' + (queued ? '; requests beyond the pool **wait** (higher latency) instead of failing' : '') + '. It also keeps client connections open during a failover — AWS says it cuts Aurora and RDS failover times by **up to 66%** — and can require **IAM authentication**, reading the database password from **Secrets Manager**.');
      notes.push('Pool cap here = 90% of max_connections (a setting you choose). Instance numbers are the RDS for MySQL defaults the RDS quotas page gives for those classes.');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };

  /* ================= DynamoDB capacity calculator ================= */
  /* RCU: 1 strongly consistent read/s up to 4 KB; eventual = half; transactional = 2. WCU: 1 write/s up to 1 KB;
     transactional = 2. Prices: us-east-1, Standard class — on-demand $0.125 per million reads, $0.625 per million
     writes; provisioned $0.00013 per RCU-hour, $0.00065 per WCU-hour. Month = 30 days (720 h, 2,592,000 s). */
  const PR = { rru: 0.125e-6, wru: 0.625e-6, rcuH: 0.00013, wcuH: 0.00065 };
  W.ddbCapacity = function () {
    const st = { size: 6, reads: 2000, writes: 500, rc: 'eventual', wc: 'standard', util: 0.25 };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('DynamoDB capacity · RCU / WCU and on-demand vs provisioned'));
      box.appendChild(h('p', { class: 'small muted' }, md('Describe the peak traffic. The calculator does the capacity-unit math the exam asks for, then prices a month both ways: **provisioned** sized for the peak all month, **on-demand** paying per request at your average utilisation.')));
      box.appendChild(group('ITEM SIZE', [1, 3.5, 6, 20].map(v => chip(v + ' KB', st.size === v, () => { st.size = v; paint(); }))));
      box.appendChild(group('READS / S AT PEAK', [500, 2000, 10000].map(v => chip(n(v), st.reads === v, () => { st.reads = v; paint(); }))));
      box.appendChild(group('READ TYPE', [['eventual', 'eventually consistent'], ['strong', 'strongly consistent'], ['tx', 'transactional']].map(([k, t]) => chip(t, st.rc === k, () => { st.rc = k; paint(); }, 'b'))));
      box.appendChild(group('WRITES / S AT PEAK', [50, 500, 2000].map(v => chip(n(v), st.writes === v, () => { st.writes = v; paint(); }))));
      box.appendChild(group('WRITE TYPE', [['standard', 'standard'], ['tx', 'transactional']].map(([k, t]) => chip(t, st.wc === k, () => { st.wc = k; paint(); }, 'b'))));
      box.appendChild(group('AVERAGE TRAFFIC AS A SHARE OF PEAK', [0.1, 0.25, 0.5, 1].map(v => chip(Math.round(v * 100) + '%', st.util === v, () => { st.util = v; paint(); }))));
      const rUnits = Math.ceil(st.size / 4) * ({ eventual: 0.5, strong: 1, tx: 2 })[st.rc];
      const wUnits = Math.ceil(st.size) * (st.wc === 'tx' ? 2 : 1);
      const RCU = Math.ceil(st.reads * rUnits), WCU = Math.ceil(st.writes * wUnits);
      const prov = (RCU * PR.rcuH + WCU * PR.wcuH) * 720;
      const od100 = (st.reads * rUnits * PR.rru + st.writes * wUnits * PR.wru) * 2592000;
      const od = od100 * st.util, cross = prov / od100;
      const parts = Math.max(1, Math.ceil(RCU / 3000), Math.ceil(WCU / 1000));
      const rf = ({ eventual: ' x 0.5', strong: ' x 1', tx: ' x 2' })[st.rc], wf = st.wc === 'tx' ? ' x 2' : ' x 1';
      box.appendChild(h('div', { class: 'pre' }, h('pre', { text:
        'read  ceil(' + st.size + '/4)=' + Math.ceil(st.size / 4) + rf + ' = ' + rUnits + ' RCU\n' +
        '      ' + n(st.reads) + '/s x ' + rUnits + ' = ' + n(RCU) + ' RCU\n' +
        'write ceil(' + st.size + '/1)=' + Math.ceil(st.size) + wf + ' = ' + wUnits + ' WCU\n' +
        '      ' + n(st.writes) + '/s x ' + wUnits + ' = ' + n(WCU) + ' WCU' })));
      box.appendChild(mountChart(w => {
        const narrow = w < 560, left = narrow ? 52 : 70, right = narrow ? 16 : 120, top = 16, ph = narrow ? 170 : 190;
        const H = top + ph + 34, pw = w - left - right;
        const ymax = Math.max(prov, od100) * 1.1;
        const X = u => left + u * pw, Y = v => top + ph - (v / ymax) * ph;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Monthly cost against average utilisation: on-demand rises, provisioned stays flat' });
        const grid = s('g', { class: 'grid' });
        const ystep = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000].find(x => ymax / x <= 5) || 1000000;
        const ys = []; for (let v = 0; v <= ymax; v += ystep) ys.push(v);
        ys.forEach(v => { grid.appendChild(s('line', { x1: left, x2: left + pw, y1: Y(v), y2: Y(v) })); g.appendChild(s('text', { class: 'axis', x: left - 6, y: Y(v) + 4, 'text-anchor': 'end', text: '$' + (v >= 1000 ? (v / 1000) + 'k' : v) })); });
        [0, 0.25, 0.5, 0.75, 1].forEach(u => { grid.appendChild(s('line', { x1: X(u), x2: X(u), y1: top, y2: top + ph })); g.appendChild(s('text', { class: 'axis', x: X(u), y: top + ph + 16, 'text-anchor': 'middle', text: Math.round(u * 100) + '%' })); });
        g.insertBefore(grid, g.firstChild);
        g.appendChild(s('text', { class: 'axis', x: left + pw / 2, y: H - 2, 'text-anchor': 'middle', text: 'average traffic as a share of peak' }));
        g.appendChild(s('path', { d: `M${X(0)} ${Y(prov)} H${X(1)}`, style: 'stroke:var(--ink2);stroke-width:3;stroke-dasharray:8 5;fill:none' }));
        g.appendChild(s('path', { d: `M${X(0)} ${Y(0)} L${X(1)} ${Y(od100)}`, style: 'stroke:var(--ink);stroke-width:3;fill:none' }));
        g.appendChild(s('text', { class: 'lab', x: narrow ? X(0.55) : X(1) + 8, y: Y(prov) + (narrow ? -7 : 4), style: 'font-size:12px', text: 'provisioned' }));
        g.appendChild(s('text', { class: 'lab', x: narrow ? X(0.6) - 4 : X(1) + 8, y: narrow ? Y(od100 * 0.6) - 8 : Y(od100) + 4, 'text-anchor': narrow ? 'end' : 'start', style: 'font-size:12px;font-weight:700', text: 'on-demand' }));
        if (cross <= 1) { g.appendChild(s('circle', { cx: X(cross), cy: Y(prov), r: 5, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:2' })); g.appendChild(s('text', { class: 'val', x: X(cross) + 7, y: Y(prov) + 18, text: 'break-even ' + Math.round(cross * 100) + '%' })); }
        const ux = X(st.util);
        g.appendChild(s('path', { d: `M${ux} ${top} V${top + ph}`, style: 'stroke:var(--ink);stroke-width:1.5;stroke-dasharray:3 3' }));
        g.appendChild(s('circle', { cx: ux, cy: Y(od), r: 5, style: 'fill:var(--ink)' }));
        for (let i = 0; i < 10; i++) {
          const u0 = i / 10, u1 = (i + 1) / 10, um = (u0 + u1) / 2;
          g.appendChild(s('rect', { x: X(u0), y: top, width: X(u1) - X(u0), height: ph, fill: 'transparent', 'data-tip': 'At ' + Math.round(um * 100) + '% of peak on average: on-demand ' + usd(od100 * um) + ' / month · provisioned ' + usd(prov) + ' / month' }));
        }
        return g;
      }, 'Solid = on-demand (pay per request); dashed = provisioned for the peak all month (no auto scaling). The marker is your average; the ring is the break-even. Hover the plot for both prices. us-east-1 list prices, Standard table class, 30-day month.'));
      const cheaper = od <= prov ? 'on-demand' : 'provisioned';
      box.appendChild(stats([[n(RCU) + ' RCU', 'read capacity at peak', true], [n(WCU) + ' WCU', 'write capacity at peak', true], [usd(od) + ' / ' + usd(prov), 'on-demand / provisioned a month'], [cheaper, 'cheaper at ' + Math.round(st.util * 100) + '% average']]));
      const notes = [];
      notes.push('Break-even is about **' + Math.round(cross * 100) + '%**: one provisioned unit-hour costs what about ' + Math.round(cross * 3600) + ' on-demand requests do, out of the 3,600 it could serve. Below it, spiky or idle traffic makes **on-demand** cheaper; steady traffic near the peak makes **provisioned** (with auto scaling, or reserved capacity) cheaper.');
      if (st.rc === 'eventual') notes.push('Eventually consistent reads cost **half** a unit per 4 KB — the cheapest read, and the only kind DAX caches.');
      if (st.rc === 'tx' || st.wc === 'tx') notes.push('Transactions cost **double**: two units per 4 KB read or per 1 KB write.');
      if (st.size === 3.5 || st.size === 20) notes.push('Sizes round **up**: ' + st.size + ' KB reads as ' + Math.ceil(st.size / 4) * 4 + ' KB and writes as ' + Math.ceil(st.size) + ' KB.');
      notes.push('A single partition serves at most 3,000 RCU and 1,000 WCU, so this load needs at least **' + parts + '** partition' + (parts > 1 ? 's' : '') + '’ worth of throughput — and keys spread evenly enough to use them. One hot key cannot.');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };

  /* ================= Cache-pattern simulator ================= */
  /* A deterministic run of 2,000 operations on one cache in front of one database. Reads favour a few popular keys
     (Zipf); writes either hit the same popular keys or mostly keys nobody reads. Lazy loading fills the cache on a
     read miss and never on a write; write-through writes the cache on every write (and fills on a miss, as AWS
     recommends combining both). TTL expires an entry after N operations. */
  const PAT = [
    { k: 'lazy', name: 'Lazy loading', wt: false, ttl: false },
    { k: 'lazyttl', name: 'Lazy loading + TTL', wt: false, ttl: true },
    { k: 'wt', name: 'Write-through', wt: true, ttl: false },
    { k: 'wtttl', name: 'Write-through + TTL', wt: true, ttl: true }
  ];
  const METRIC = [
    { k: 'hit', name: 'hit rate', fmt: v => Math.round(v * 100) + '%', max: () => 1, tip: 'share of reads answered by the cache' },
    { k: 'stale', name: 'stale reads', fmt: v => n(v), tip: 'cache hits that returned an older version than the database holds' },
    { k: 'wasted', name: 'wasted cache writes', fmt: v => n(v), tip: 'cache writes that were overwritten or expired before anyone read them' },
    { k: 'held', name: 'keys held in memory', fmt: v => n(v), tip: 'live (unexpired) entries at the end — what you pay for in cache memory' }
  ];
  const simulate = (p, mix, cold, ttlLen) => {
    let seed = 7;
    const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const K = 100, wts = Array.from({ length: K }, (_, i) => 1 / (i + 1)), tot = wts.reduce((a, b) => a + b, 0);
    const zipf = () => { let r = rnd() * tot; for (let i = 0; i < K; i++) { r -= wts[i]; if (r <= 0) return i; } return K - 1; };
    const db = {}, cache = {}, ttl = p.ttl ? ttlLen : 0;
    let reads = 0, hits = 0, stale = 0, wasted = 0;
    const alive = (e, t) => e && (!ttl || t - e.t < ttl);
    const drop = k => { const e = cache[k]; if (e && e.w && !e.r) wasted++; delete cache[k]; };
    for (let t = 0; t < 2000; t++) {
      if (rnd() < mix) {
        const k = zipf(); reads++;
        const e = cache[k];
        if (alive(e, t)) { hits++; e.r = true; if (e.v < (db[k] || 0)) stale++; }
        else { drop(k); cache[k] = { v: db[k] || 0, t, r: true, w: false }; }
      } else {
        const k = cold && rnd() < 0.7 ? 100 + Math.floor(rnd() * 900) : zipf();
        db[k] = (db[k] || 0) + 1;
        if (p.wt) { drop(k); cache[k] = { v: db[k], t, r: false, w: true }; }
      }
    }
    let held = 0;
    Object.keys(cache).forEach(k => { const e = cache[k]; if (alive(e, 2000)) held++; if (e.w && !e.r) wasted++; });
    return { hit: reads ? hits / reads : 0, stale, wasted, held };
  };
  W.cachePattern = function () {
    const st = { p: 'lazy', mix: 0.8, cold: false, ttl: 100, m: 'stale' };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Cache patterns · lazy loading vs write-through'));
      box.appendChild(h('p', { class: 'small muted' }, md('2,000 operations against one cache in front of one database. Reads favour a few popular keys. Pick a workload and a pattern, then compare all four on one measure.')));
      box.appendChild(group('PATTERN', PAT.map(p => chip(p.name, st.p === p.k, () => { st.p = p.k; paint(); }, 'b'))));
      box.appendChild(group('READS : WRITES', [[0.9, '90 : 10'], [0.8, '80 : 20'], [0.4, '40 : 60']].map(([v, t]) => chip(t, st.mix === v, () => { st.mix = v; paint(); }))));
      box.appendChild(group('WHAT GETS WRITTEN', [chip('the popular keys', !st.cold, () => { st.cold = false; paint(); }, 'b'), chip('mostly keys nobody reads', st.cold, () => { st.cold = true; paint(); }, 'b')]));
      box.appendChild(group('TTL (WHEN USED)', [[30, '30 ops'], [100, '100 ops'], [500, '500 ops']].map(([v, t]) => chip(t, st.ttl === v, () => { st.ttl = v; paint(); }))));
      box.appendChild(group('COMPARE ON', METRIC.map(m => chip(m.name, st.m === m.k, () => { st.m = m.k; paint(); }, 'b'))));
      const R = {}; PAT.forEach(p => { R[p.k] = simulate(p, st.mix, st.cold, st.ttl); });
      const M = METRIC.find(m => m.k === st.m);
      const rows = PAT.map(p => ({ label: (p.k === st.p ? '▸ ' : '') + p.name, value: st.m === 'hit' ? Math.round(R[p.k].hit * 100) : R[p.k][st.m], text: M.fmt(R[p.k][st.m]), soft: p.k !== st.p, tip: p.name + ' · ' + M.name + ': ' + M.fmt(R[p.k][st.m]) + ' — ' + M.tip }));
      box.appendChild(SAA.hbars({ rows, valW: 56, max: st.m === 'hit' ? 100 : undefined, fmt: st.m === 'hit' ? (v => v + '%') : undefined, title: 'Cache patterns compared on ' + M.name, cap: 'Ink bar = the pattern you picked; grey = the others, same workload. Hover a row for the definition.' }));
      const r = R[st.p];
      box.appendChild(stats([[Math.round(r.hit * 100) + '%', 'hit rate', true], [n(r.stale), 'stale reads — old data returned'], [n(r.wasted), 'wasted cache writes — never read'], [n(r.held), 'keys held at the end']]));
      const P = PAT.find(p => p.k === st.p), notes = [];
      if (!P.wt) notes.push('**Lazy loading** caches only what is actually read (small cache, no wasted writes), but a write never touches the cache, so a cached key goes **stale** until it is evicted or expires' + (P.ttl ? ' — the TTL bounds how stale.' : ' — with no TTL, forever.') + ' Every first read is a miss with three trips: cache, database, cache.');
      else notes.push('**Write-through** updates the cache on every write, so cached data is **never stale** — but it writes keys nobody may read (' + n(r.wasted) + ' wasted here)' + (P.ttl ? ', and the TTL lets those unread entries expire to free memory.' : ' and keeps them in memory forever.') + ' Every write pays two writes.');
      if (st.cold && P.wt) notes.push('With writes mostly to keys nobody reads, write-through is paying for churn: this is the case AWS says to fix with a **TTL**.');
      notes.push('AWS’s advice: combine them — write-through for freshness, lazy loading to fill misses, and a TTL on every key (except where write-through must keep it). For DynamoDB, **DAX** does both for you: item cache on reads, write-through on writes.');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };
})();
