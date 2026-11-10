/* Session 9 widgets: visibility-timeout simulator (processing time × visibility timeout × maxReceiveCount × outcome
   → receives, duplicates, when the message reaches the DLQ), Kinesis shard calculator (records/s × record size →
   shards for writes; consumers shared vs enhanced fan-out → read headroom), Athena scan-cost calculator (table size ×
   format × columns read × partition filter → TB scanned → cost). Choosers, sorters and steppers use the generic
   engine widgets.
   Verified inputs (docs/session-09-serverless.md): SQS visibility 30 s default (0 s – 12 h), retention 4 days default;
   Kinesis shard 1 MB/s or 1,000 records/s in, 2 MB/s out shared, enhanced fan-out 2 MB/s per consumer per shard,
   on-demand starts at 4 MB/s write; Athena $5 per TB scanned (pricing-page example), 10 MB minimum per query,
   3:1 compression and 1-of-4-columns as in the pricing page example. Everything else is the learner's setting, and
   every result is derived from these inputs. */
(function () {
  'use strict';
  const { h, s, md, clear, eyebrow, mountChart } = SAA;
  const W = SAA.widgets;
  const chip = (label, on, click, cls) => h('button', { class: 'chip' + (cls ? ' ' + cls : ''), type: 'button', 'aria-pressed': String(!!on), text: label, on: { click } });
  const group = (label, kids) => h('div', { class: 'stubrow' }, h('span', { class: 'stublab', text: label }), h('div', { class: 'chiprow' }, kids));
  const verdict = (title, text) => h('div', { class: 'callout' }, eyebrow(title, 'sm'), h('span', null, md(text)));
  const stats = rows => h('div', { class: 'stats' }, rows.map(([a, b, strong]) => h('div', { class: 'stat', style: strong ? { borderColor: 'var(--ink)', borderWidth: '2px', padding: '9px 11px' } : null }, h('b', { text: a }), h('span', { text: b }))));
  const n = v => Math.round(v).toLocaleString('en-US');
  const dur = t => (t >= 3600 ? +(t / 3600).toFixed(1) + ' h' : t >= 60 ? +(t / 60).toFixed(1) + ' min' : t + ' s');

  /* ================= Visibility timeout ================= */
  /* One message, idle workers that poll at once. A receive hides the message for the visibility timeout; if it is not
     deleted by then, the next worker receives it. Success = the first worker deletes it when its processing ends.
     Poison = no worker ever deletes it. A receive beyond maxReceiveCount moves the message to the DLQ instead. */
  W.visTimeout = function () {
    const st = { proc: 90, vis: 30, max: 3, poison: false };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Visibility timeout · duplicates and the dead-letter queue'));
      box.appendChild(h('p', { class: 'small muted' }, md('Follow **one message** through a standard queue with idle workers waiting. Set how long processing takes, the queue’s **visibility timeout** (default **30 s**, up to **12 hours**), the redrive policy’s **maxReceiveCount**, and whether the message can be processed at all.')));
      box.appendChild(group('PROCESSING TIME', [20, 90, 300].map(v => chip(dur(v), st.proc === v, () => { st.proc = v; paint(); }))));
      box.appendChild(group('VISIBILITY TIMEOUT', [[30, '30 s (default)'], [120, '2 min'], [600, '10 min']].map(([v, t]) => chip(t, st.vis === v, () => { st.vis = v; paint(); }, 'b'))));
      box.appendChild(group('MAXRECEIVECOUNT', [1, 3, 5].map(v => chip(String(v), st.max === v, () => { st.max = v; paint(); }))));
      box.appendChild(group('THE MESSAGE', [chip('processes fine', !st.poison, () => { st.poison = false; paint(); }, 'b'), chip('always fails (poison)', st.poison, () => { st.poison = true; paint(); }, 'b')]));
      const recv = [];
      let dlqAt = null, doneAt = null;
      for (let k = 0; ; k++) {
        const t = k * st.vis;
        if (!st.poison && t >= st.proc) { doneAt = st.proc; break; }
        if (k >= st.max) { dlqAt = t; break; }
        recv.push(t);
      }
      if (!st.poison && doneAt === null) doneAt = st.proc;
      const dup = st.poison ? 0 : recv.length - 1;
      const end = Math.max(st.proc, dlqAt || 0, recv[recv.length - 1] + Math.min(st.proc, st.vis), recv[recv.length - 1] + (st.poison ? 0 : st.proc)) * 1.08;
      box.appendChild(mountChart(w => {
        const narrow = w < 560, labW = narrow ? 84 : 120, right = 16, rh = 34, top = 24;
        const plot = w - labW - right, H = top + recv.length * rh + 30;
        const X = t => labW + (t / end) * plot;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Timeline of receives of one SQS message' });
        const grid = s('g', { class: 'grid' });
        const step = [10, 30, 60, 120, 300, 600, 1200, 1800, 3600].find(x => end / x <= (narrow ? 4 : 7)) || 3600;
        for (let t = 0; t <= end; t += step) { grid.appendChild(s('line', { x1: X(t), x2: X(t), y1: top, y2: top + recv.length * rh })); g.appendChild(s('text', { class: 'axis', x: X(t), y: H - 8, 'text-anchor': 'middle', text: dur(t) })); }
        g.appendChild(grid);
        recv.forEach((t, i) => {
          const y = top + i * rh;
          const fails = st.poison;
          const stop = fails ? t + Math.min(st.proc, st.vis) : t + st.proc;
          const tip = 'Receive ' + (i + 1) + ' at ' + dur(t) + ': hidden until ' + dur(t + st.vis) + (fails ? ' · processing fails, nobody deletes it' : i === 0 ? (dlqAt !== null ? ' · processing would end at ' + dur(t + st.proc) + ', but the message moves to the DLQ at ' + dur(dlqAt) + ' while this worker is still busy' : ' · processing ends at ' + dur(t + st.proc) + ' and deletes the message') : ' · a duplicate: another worker is still processing it');
          const gg = s('g', { 'data-tip': tip });
          gg.appendChild(s('rect', { x: 0, y, width: w, height: rh, fill: 'transparent' }));
          gg.appendChild(s('text', { class: 'lab', x: 0, y: y + rh / 2 + 4.5, style: narrow ? 'font-size:12px' : null, text: 'receive ' + (i + 1) + (i && !fails ? ' · dup' : '') }));
          gg.appendChild(s('rect', { x: X(t), y: y + 7, width: Math.max(2, X(t + st.vis) - X(t)), height: rh - 14, rx: 2, style: 'fill:none;stroke:var(--ink2);stroke-width:1.5;stroke-dasharray:4 3' }));
          gg.appendChild(s('rect', { class: 'barr' + (i && !fails ? ' soft' : ''), x: X(t), y: y + 11, width: Math.max(2, X(stop) - X(t)), height: rh - 22, rx: 2 }));
          g.appendChild(gg);
        });
        const mark = (t, label) => {
          const x = X(t), rightSide = x > w - 150;
          g.appendChild(s('path', { d: `M${x} ${top - 8} V${top + recv.length * rh}`, style: 'stroke:var(--ink);stroke-width:2;stroke-dasharray:5 3' }));
          g.appendChild(s('text', { class: 'val', x: x + (rightSide ? -4 : 4), y: top - 11, 'text-anchor': rightSide ? 'end' : 'start', text: label }));
        };
        if (dlqAt !== null) mark(dlqAt, 'moved to DLQ at ' + dur(dlqAt));
        else if (doneAt !== null) mark(doneAt, 'deleted at ' + dur(doneAt));
        return g;
      }, 'Ink bar = a worker processing; dashed outline = the visibility timeout of that receive. Grey bars are duplicates. The dashed line is when the message leaves the queue. Hover a row.'));
      box.appendChild(stats([[String(recv.length), 'receives', true], [String(dup), 'duplicate processing runs'], [dlqAt !== null ? dur(dlqAt) : 'never', 'moved to the DLQ']]));
      const notes = [];
      if (st.poison) notes.push('The message fails on every receive and reappears each time its visibility timeout ends. After **' + st.max + '** receive' + (st.max > 1 ? 's' : '') + ' the next attempt moves it to the **dead-letter queue** at ' + dur(dlqAt) + ' — instead of cycling until the retention period (default **4 days**) deletes it. Inspect it there, fix the bug, then **redrive** it.');
      else if (st.vis > st.proc) notes.push('The timeout (' + dur(st.vis) + ') is longer than the processing (' + dur(st.proc) + '): one receive, no duplicates, deleted at ' + dur(st.proc) + '.');
      else notes.push('The timeout (' + dur(st.vis) + ') ends before processing (' + dur(st.proc) + ') does, so the message becomes visible again while the first worker is still busy' + (dup ? ' — **' + dup + ' duplicate' + (dup === 1 ? '' : 's') + '** although nothing failed.' : '.') + (dlqAt !== null ? ' Worse: the next receive passes maxReceiveCount and a **healthy** message lands in the DLQ at ' + dur(dlqAt) + ', while a worker is still processing it.' : '') + ' Set the visibility timeout above the processing time, or extend it with `ChangeMessageVisibility` while working.');
      notes.push('Settings are yours to try; the timeline is derived from them. Standard queues deliver at least once, so consumers should tolerate a duplicate anyway.');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };

  /* ================= Kinesis shard calculator ================= */
  /* Provisioned shard: writes up to 1 MB/s or 1,000 records/s; reads 2 MB/s shared by standard consumers, or 2 MB/s
     per enhanced fan-out consumer. 1 MB is taken as 1,000 KB for the arithmetic. */
  W.shardCalc = function () {
    const st = { rps: 5000, kb: 2, cons: 3, efo: false };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Shard calculator · Kinesis Data Streams'));
      box.appendChild(h('p', { class: 'small muted' }, md('Describe the producers and the consumers. In **provisioned** mode a shard takes **1 MB/s or 1,000 records/s** of writes and serves **2 MB/s** of reads, shared by standard consumers — or **2 MB/s per consumer** with **enhanced fan-out**.')));
      box.appendChild(group('RECORDS / S', [500, 2000, 5000, 20000].map(v => chip(n(v), st.rps === v, () => { st.rps = v; paint(); }))));
      box.appendChild(group('AVERAGE RECORD SIZE', [0.5, 2, 10, 50].map(v => chip(v + ' KB', st.kb === v, () => { st.kb = v; paint(); }))));
      box.appendChild(group('CONSUMER APPLICATIONS', [1, 3, 5].map(v => chip(String(v), st.cons === v, () => { st.cons = v; paint(); }))));
      box.appendChild(group('CONSUMERS READ', [chip('shared (GetRecords)', !st.efo, () => { st.efo = false; paint(); }, 'b'), chip('enhanced fan-out', st.efo, () => { st.efo = true; paint(); }, 'b')]));
      const mbps = (st.rps * st.kb) / 1000;
      const byData = Math.ceil(mbps / 1), byRec = Math.ceil(st.rps / 1000);
      const wShards = Math.max(1, byData, byRec);
      const readNeed = st.efo ? mbps / wShards : (mbps * st.cons) / wShards;
      const readCap = 2;
      const rShards = st.efo ? wShards : Math.max(wShards, Math.ceil((mbps * st.cons) / 2));
      box.appendChild(h('div', { class: 'pre' }, h('pre', { text:
        'data   ' + n(st.rps) + '/s x ' + st.kb + ' KB = ' + (+mbps.toFixed(2)) + ' MB/s\n' +
        '       / 1 MB/s per shard -> ' + byData + '\n' +
        'count  ' + n(st.rps) + '/s / 1,000 -> ' + byRec + '\n' +
        'reads  ' + (st.efo ? st.cons + ' x own 2 MB/s per shard' : st.cons + ' x ' + (+mbps.toFixed(2)) + ' = ' + (+(mbps * st.cons).toFixed(2)) + ' MB/s\n       / 2 MB/s shared per shard') })));
      const rows = [
        { k: 'wd', name: 'write data per shard', v: (mbps / wShards) / 1, tip: (+(mbps / wShards).toFixed(2)) + ' MB/s per shard of the 1 MB/s limit' },
        { k: 'wr', name: 'write records per shard', v: st.rps / wShards / 1000, tip: n(st.rps / wShards) + ' records/s per shard of the 1,000 limit' },
        { k: 'rd', name: st.efo ? 'reads per consumer per shard' : 'shared reads per shard', v: readNeed / readCap, tip: st.efo ? (+readNeed.toFixed(2)) + ' MB/s each consumer needs per shard, of its own 2 MB/s' : (+readNeed.toFixed(2)) + ' MB/s all ' + st.cons + ' consumers need per shard, of the shared 2 MB/s' }
      ];
      const vmax = Math.max(1.2, ...rows.map(r => r.v)) * 1.08;
      box.appendChild(mountChart(w => {
        const narrow = w < 560, labW = narrow ? 132 : 210, valW = 52, rh = 40, top = 22;
        const plot = w - labW - valW, H = top + rows.length * rh + 24;
        const X = v => labW + (v / vmax) * plot;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Share of each shard limit used' });
        const grid = s('g', { class: 'grid' });
        const step = vmax > 6 ? 2 : vmax > 3 ? 1 : 0.5;
        for (let v = 0; v <= vmax; v += step) { grid.appendChild(s('line', { x1: X(v), x2: X(v), y1: top, y2: top + rows.length * rh })); g.appendChild(s('text', { class: 'axis', x: X(v), y: H - 6, 'text-anchor': 'middle', text: Math.round(v * 100) + '%' })); }
        g.appendChild(grid);
        rows.forEach((r, i) => {
          const y = top + i * rh;
          const gg = s('g', { 'data-tip': r.name + ': ' + r.tip });
          gg.appendChild(s('rect', { x: 0, y, width: w, height: rh, fill: 'transparent' }));
          gg.appendChild(s('text', { class: 'lab', x: 0, y: y + rh / 2 + 4.5, style: narrow ? 'font-size:12px' : null, text: narrow ? r.name.replace(' per consumer', '').replace(' per shard', '') : r.name }));
          const fit = Math.min(r.v, 1);
          gg.appendChild(s('rect', { class: 'barr', x: labW, y: y + 10, width: Math.max(2, X(fit) - labW), height: rh - 20, rx: 2 }));
          if (r.v > 1) gg.appendChild(s('rect', { x: X(1), y: y + 10, width: X(r.v) - X(1), height: rh - 20, rx: 2, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:1.5;stroke-dasharray:4 3' }));
          gg.appendChild(s('text', { class: 'val', x: X(r.v) + 6, y: y + rh / 2 + 4, text: Math.round(r.v * 100) + '%' }));
          g.appendChild(gg);
        });
        const lx = X(1);
        g.appendChild(s('path', { d: `M${lx} ${top - 6} V${top + rows.length * rh}`, style: 'stroke:var(--ink);stroke-width:2;stroke-dasharray:5 3' }));
        g.appendChild(s('text', { class: 'val', x: lx + 4, y: top - 9, text: 'shard limit' }));
        return g;
      }, 'With the shards needed for writes. Dashed line = the shard limit; an outlined dashed segment is demand above it (throttling). Hover a row.'));
      box.appendChild(stats([[String(wShards), (wShards === 1 ? 'shard' : 'shards') + ' needed for writes', true], [String(rShards), (rShards === 1 ? 'shard' : 'shards') + ' needed with these readers'], [st.efo ? '2 MB/s' : (+(2 / st.cons).toFixed(2)) + ' MB/s', 'read per consumer per shard']]));
      const notes = [];
      notes.push('Writes need **' + wShards + '** shard' + (wShards === 1 ? '' : 's') + ': ' + (wShards === 1 ? 'one shard covers both limits (' + (+mbps.toFixed(2)) + ' MB/s and ' + n(st.rps) + ' records/s).' : mbps / 1 >= st.rps / 1000 ? 'the data rate (' + (+mbps.toFixed(2)) + ' MB/s) decides, not the record count.' : 'the record count (' + n(st.rps) + '/s) decides, not the data rate.') + ' Throttling on writes is fixed with shards or on-demand mode — and a partition key that spreads, because one hot key lands on one shard.');
      if (!st.efo && rShards > wShards) notes.push('With ' + st.cons + ' shared consumers each shard must serve ' + (+((mbps * st.cons) / wShards).toFixed(2)) + ' MB/s of reads — more than its 2 MB/s. Either buy **' + rShards + '** shards just for reading, or give each consumer **enhanced fan-out** (its own 2 MB/s per shard, pushed, about 70 ms).');
      else if (!st.efo) notes.push('Shared reads fit: ' + st.cons + ' consumer' + (st.cons > 1 ? 's' : '') + ' split each shard’s 2 MB/s (and its 5 GetRecords calls per second).');
      else notes.push('Enhanced fan-out gives each of the ' + st.cons + ' consumers its own 2 MB/s per shard, so readers no longer compete; write capacity is unchanged.');
      notes.push('**On-demand** mode skips this arithmetic: a new stream starts at 4 MB/s of writes and scales by itself. Shard counts here are derived from your settings; 1 MB is taken as 1,000 KB.');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };

  /* ================= Athena scan cost ================= */
  /* Bytes scanned = table size × format factor × columns read × partitions read. CSV uncompressed: whole rows; gzip:
     3:1 but still whole rows; Parquet: 3:1 and only the columns a query needs (the pricing page's example).
     Cost = scanned TB × $5, with a 10 MB minimum per query. */
  const PRICE = 5, MIN_TB = 10 / 1e6;
  const FMT = [
    { k: 'csv', name: 'CSV, uncompressed', comp: 1, col: false },
    { k: 'gz', name: 'CSV, gzip 3:1', comp: 1 / 3, col: false },
    { k: 'pq', name: 'Parquet, 3:1', comp: 1 / 3, col: true }
  ];
  W.scanCost = function () {
    const st = { tb: 10, fmt: 'csv', cols: 0.25, part: 1 };
    const box = h('div', { class: 'card widget' });
    const usd = v => '$' + (v >= 100 ? n(v) : v >= 1 ? v.toFixed(2) : v.toFixed(4));
    const tbTxt = v => (v >= 1 ? (+v.toFixed(2)) + ' TB' : v >= 0.001 ? (+(v * 1000).toFixed(1)) + ' GB' : (+(v * 1e6).toFixed(0)) + ' MB');
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Athena scan cost · format, columns, partitions'));
      box.appendChild(h('p', { class: 'small muted' }, md('Athena bills the **bytes it scans**: **$5 per TB** in the pricing page’s examples, at least **10 MB** per query. Pick a table and a query; compare the three file formats.')));
      box.appendChild(group('TABLE SIZE (AS RAW CSV)', [1, 10, 50].map(v => chip(v + ' TB', st.tb === v, () => { st.tb = v; paint(); }))));
      box.appendChild(group('FILE FORMAT', FMT.map(f => chip(f.name, st.fmt === f.k, () => { st.fmt = f.k; paint(); }, 'b'))));
      box.appendChild(group('COLUMNS THE QUERY READS', [[1, 'all'], [0.25, '1 of 4'], [0.075, '3 of 40']].map(([v, t]) => chip(t, st.cols === v, () => { st.cols = v; paint(); }))));
      box.appendChild(group('PARTITION FILTER', [[1, 'none (date not partitioned)'], [1 / 12, 'one month of 12'], [1 / 365, 'one day of 365']].map(([v, t]) => chip(t, st.part === v, () => { st.part = v; paint(); }, 'b'))));
      const scan = f => Math.max(MIN_TB, st.tb * f.comp * (f.col ? st.cols : 1) * st.part);
      const F = FMT.find(f => f.k === st.fmt), mine = scan(F), base = st.tb;
      box.appendChild(SAA.hbars({
        rows: FMT.map(f => ({ label: (f.k === st.fmt ? '▸ ' : '') + f.name, value: (scan(f) / base) * 100, text: tbTxt(scan(f)), soft: f.k !== st.fmt, tip: f.name + ': scans ' + tbTxt(scan(f)) + ' = ' + usd(scan(f) * PRICE) + ' per query (' + (+((scan(f) / base) * 100).toFixed(2)) + '% of the raw CSV)' })),
        valW: 70, max: 100, ticks: [0, 50, 100], fmt: v => v + '%', title: 'Data scanned per query as a share of the raw CSV',
        cap: 'Bar = share of the raw CSV the query scans; label = data scanned. Ink = your format; grey = the others, same query. Hover a row for the price.'
      }));
      box.appendChild(stats([[tbTxt(mine), 'scanned per query', true], [usd(mine * PRICE), 'per query'], [usd(mine * PRICE * 1000), 'for 1,000 such queries']]));
      const notes = [];
      if (!F.col && st.cols < 1) notes.push('CSV cannot be split by column: the query reads **whole rows** even though it needs ' + (st.cols === 0.25 ? '1 of 4' : '3 of 40') + ' columns.');
      if (F.k === 'gz') notes.push('Compression cuts the bytes by 3 but still reads every column.');
      if (F.col) notes.push('Parquet is **columnar** and compressed: the query reads only its columns from smaller files — the pricing page’s example is 3 TB of CSV → 0.25 TB scanned.');
      notes.push(st.part < 1 ? 'The **partition filter** skips every other prefix, so only ' + (st.part === 1 / 12 ? 'one twelfth' : 'one 365th') + ' of the table is touched.' : 'Without partitions every query scans the whole table, whatever its WHERE clause on the date.');
      if (mine === MIN_TB) notes.push('This query hits the **10 MB minimum** — it cannot cost less.');
      notes.push('Sizes are your settings and every figure is derived from them; 3:1 is the pricing page’s example ratio, real data varies. AWS quotes **30–90%** savings from compression, partitioning and columnar formats.');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };
})();
