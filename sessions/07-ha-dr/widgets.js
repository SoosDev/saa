/* Session 7 widgets: DR strategy picker (RTO / RPO targets against the four strategies on a log time axis), AZ capacity
   and static stability calculator, DNS failover time (Route 53 health check + TTL vs Global Accelerator), protection vs
   threat matrix (replication, PITR, backups, Vault Lock against AZ loss, Region loss, bad data, ransomware), DR cost
   ladder (illustrative inputs the user sets). Sorters, steppers and choosers use the generic engine widgets.
   Facts: docs/session-07-ha-dr.md. */
(function () {
  'use strict';
  const { h, s, md, clear, eyebrow, mountChart } = SAA;
  const W = SAA.widgets;
  const chip = (label, on, click, cls, dis) => h('button', { class: 'chip' + (cls ? ' ' + cls : ''), type: 'button', 'aria-pressed': String(!!on), disabled: !!dis, text: label, on: { click } });
  const group = (label, kids) => h('div', { class: 'stubrow' }, h('span', { class: 'stublab', text: label }), h('div', { class: 'chiprow' }, kids));
  const verdict = (title, text, cls) => h('div', { class: 'callout' }, eyebrow(title, 'sm'), h('span', { class: cls || null }, md(text)));
  const stats = rows => h('div', { class: 'stats' }, rows.map(([a, b, strong]) => h('div', { class: 'stat', style: strong ? { borderColor: 'var(--ink)', borderWidth: '2px', padding: '9px 11px' } : null }, h('b', { text: a }), h('span', { text: b }))));
  const dur = sec => sec < 60 ? Math.round(sec) + ' s' : sec < 3600 ? (Math.round(sec / 6) / 10).toString().replace(/\.0$/, '') + ' min' : (Math.round(sec / 360) / 10).toString().replace(/\.0$/, '') + ' h';

  /* ================= DR strategy picker ================= */
  /* Bands are rules of thumb around the DR whitepaper's words (hours / tens of minutes / minutes / real time).
     A strategy "can meet" a target when the low end of its band reaches it. Order = cost order. */
  const TIERS = [
    { k: 'br', name: 'Backup & restore', cost: '$', rpo: [3600, 86400], rto: [7200, 86400], how: 'Backups (AWS Backup, snapshots) copied to the DR Region. Nothing runs there; infrastructure is rebuilt from code and data restored after the disaster.' },
    { k: 'pl', name: 'Pilot light', cost: '$$', rpo: [1, 300], rto: [600, 3600], how: 'Data replicated live to the DR Region (database replica, S3 replication). Compute is defined but **switched off** (or zero-size); it must be started and scaled before it can take traffic.' },
    { k: 'ws', name: 'Warm standby', cost: '$$$', rpo: [1, 60], rto: [60, 600], how: 'A **scaled-down but fully working** copy runs in the DR Region and could serve traffic now; recovery = scale it up and shift traffic.' },
    { k: 'ms', name: 'Multi-site active/active', cost: '$$$$', rpo: [1, 5], rto: [1, 60], how: 'Full production in two or more Regions, **all serving traffic**. Recovery = stop sending users to the failed Region.' }
  ];
  const RTO_T = [['24 h', 86400], ['4 h', 14400], ['1 h', 3600], ['15 min', 900], ['5 min', 300], ['30 s', 30]];
  const RPO_T = [['24 h', 86400], ['4 h', 14400], ['1 h', 3600], ['15 min', 900], ['1 min', 60], ['5 s', 5]];
  const meets = (t, rto, rpo) => t.rto[0] <= rto && t.rpo[0] <= rpo;
  W.drPicker = function () {
    const st = { rto: 14400, rpo: 3600 };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('DR strategy picker · RTO and RPO'));
      box.appendChild(h('p', { class: 'small muted' }, md('Set the targets the scenario states. Each bar is what a strategy **typically** reaches (rules of thumb around the whitepaper’s words: hours, tens of minutes, minutes, real time). The cheapest strategy that can reach **both** targets is the exam answer.')));
      box.appendChild(group('RTO · MAX DOWNTIME', RTO_T.map(([t, v]) => chip(t, st.rto === v, () => { st.rto = v; paint(); }))));
      box.appendChild(group('RPO · MAX DATA LOSS', RPO_T.map(([t, v]) => chip(t, st.rpo === v, () => { st.rpo = v; paint(); }))));
      const pick = TIERS.find(t => meets(t, st.rto, st.rpo));
      box.appendChild(mountChart(w => {
        const narrow = w < 560, labW = narrow ? 104 : 190, rh = 26, top = 22, panelGap = 30;
        const plotW = w - labW - 12;
        const lo = Math.log10(1), hi = Math.log10(172800);
        const X = sec => labW + ((Math.log10(Math.max(1, sec)) - lo) / (hi - lo)) * plotW;
        const H = top + 2 * (TIERS.length * rh) + panelGap + 26;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Typical RPO and RTO of the four DR strategies against your targets' });
        const ticks = narrow ? [[1, '1s'], [60, '1m'], [3600, '1h'], [86400, '24h']] : [[1, '1 s'], [60, '1 min'], [600, '10 min'], [3600, '1 h'], [14400, '4 h'], [86400, '24 h']];
        const grid = s('g', { class: 'grid' });
        ticks.forEach(([v]) => grid.appendChild(s('line', { x1: X(v), x2: X(v), y1: top - 4, y2: H - 22 })));
        g.appendChild(grid);
        ticks.forEach(([v, t]) => g.appendChild(s('text', { class: 'axis', x: X(v), y: H - 6, 'text-anchor': 'middle', text: t })));
        [['rpo', 'RPO · data lost', st.rpo], ['rto', 'RTO · downtime', st.rto]].forEach(([key, title, target], pi) => {
          const y0 = top + pi * (TIERS.length * rh + panelGap);
          g.appendChild(s('text', { class: 'axis', x: 0, y: y0 - 8, style: 'font-weight:600', text: title.toUpperCase() }));
          TIERS.forEach((t, i) => {
            const y = y0 + i * rh, ok = t[key][0] <= target;
            const gg = s('g', { 'data-tip': t.name + ' · ' + key.toUpperCase() + ' typically ' + dur(t[key][0]) + ' – ' + dur(t[key][1]) + (ok ? ' → can meet ' : ' → cannot meet ') + dur(target) });
            gg.appendChild(s('rect', { x: 0, y, width: w, height: rh, fill: 'transparent' }));
            gg.appendChild(s('text', { class: 'lab', x: 0, y: y + rh / 2 + 4.5, style: (narrow ? 'font-size:12px;' : '') + (pick && pick.k === t.k ? 'font-weight:700' : ''), text: narrow ? t.name.replace('Multi-site active/active', 'Multi-site').replace('Backup & restore', 'Backup & rest.') : t.name }));
            gg.appendChild(s('rect', { class: 'barr' + (ok ? '' : ' soft'), x: X(t[key][0]), y: y + 7, width: Math.max(6, X(t[key][1]) - X(t[key][0])), height: rh - 14, rx: 2, style: ok ? null : 'opacity:.45' }));
            g.appendChild(gg);
          });
          const tx = X(target);
          g.appendChild(s('path', { d: `M${tx} ${y0 - 2} V${y0 + TIERS.length * rh + 2}`, style: 'stroke:var(--ink);stroke-width:2;stroke-dasharray:4 3' }));
          g.appendChild(s('text', { class: 'val', x: tx + (tx > w - 70 ? -4 : 4), y: y0 - 8, 'text-anchor': tx > w - 70 ? 'end' : 'start', text: 'target ' + dur(target) }));
        });
        return g;
      }, 'Log time axis. Solid bar = the strategy can reach the dashed target; faded = it cannot. Hover a bar for its range.'));
      box.appendChild(h('div', { class: 'tbl' }, h('table', null, h('thead', null, h('tr', null, h('th', { text: 'Strategy' }), h('th', { text: 'Cost' }), h('th', { text: 'Both?' }))),
        h('tbody', null, TIERS.map(t => h('tr', { class: pick && pick.k === t.k ? 'win' : null }, h('td', null, h('div', null, md('**' + t.name + '**')), h('div', { class: 'small' }, md(t.how))), h('td', { class: 'mono', text: t.cost }), h('td', { text: meets(t, st.rto, st.rpo) ? '✓' : '✕' })))))));
      box.appendChild(stats([[pick ? pick.name : '—', 'cheapest strategy that meets both', true], [TIERS.filter(t => meets(t, st.rto, st.rpo)).length + ' / 4', 'strategies that can meet them']]));
      const notes = [];
      if (pick && pick.k === 'br') notes.push('Hours of downtime and data loss are acceptable: nothing needs to run in the DR Region. Anything more is paying for speed nobody asked for — the prestige trap of this session.');
      if (pick && pick.k === 'pl') notes.push('The **RPO** rules out backups (they are hours apart), so data must be replicated continuously; the **RTO** still leaves time to start compute. That is a pilot light.');
      if (pick && pick.k === 'ws') notes.push('Minutes of downtime leave no time to launch and warm up a stack: something must already be running. A scaled-down copy is enough.');
      if (pick && pick.k === 'ms') notes.push('Seconds of downtime means no scaling-up step at all: both Regions already serve users.');
      if (st.rpo <= 5) notes.push('An RPO of seconds needs continuous replication (Aurora Global Database, DynamoDB global tables, DRS). A true RPO of **zero** across Regions needs synchronous or strongly consistent writes — for example DynamoDB multi-Region strong consistency.');
      if (st.rpo >= 3600 && st.rto <= 900) notes.push('Short RTO with a loose RPO is unusual but real: you may lose an hour of data, yet must be back fast — a running standby is still needed.');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };

  /* ================= AZ capacity and static stability ================= */
  W.azCapacity = function (a, ctx) {
    const st = { need: 12, azs: 3, mode: 'static', lost: true };
    const box = h('div', { class: 'card widget' });
    const perAz = (need, k, mode) => Math.ceil(need / (mode === 'static' ? k - 1 : k));
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('AZ capacity · static stability'));
      box.appendChild(h('p', { class: 'small muted' }, md('The application needs a fixed number of instances to serve peak load. Spread them over Availability Zones, then lose one AZ. **Statically stable** = the survivors can carry the load **without launching anything** during the event.')));
      box.appendChild(group('INSTANCES NEEDED AT PEAK', [6, 12, 20].map(v => chip(String(v), st.need === v, () => { st.need = v; paint(); }))));
      box.appendChild(group('AVAILABILITY ZONES', [2, 3, 4].map(v => chip(v + ' AZs', st.azs === v, () => { st.azs = v; paint(); }))));
      box.appendChild(group('SIZED FOR', [['normal', 'normal load only'], ['static', 'losing one AZ']].map(([k, t]) => chip(t, st.mode === k, () => { st.mode = k; paint(); }, 'b'))));
      box.appendChild(group('EVENT', [chip('all AZs healthy', !st.lost, () => { st.lost = false; paint(); }, 'b'), chip('AZ a fails', st.lost, () => { st.lost = true; paint(); }, 'b')]));
      const p = perAz(st.need, st.azs, st.mode), total = p * st.azs, after = p * (st.azs - 1);
      const up = st.lost ? after : total, pct = Math.round((up / st.need) * 100);
      const rows = Array.from({ length: st.azs }, (_, i) => {
        const name = 'AZ ' + 'abcd'[i], down = st.lost && i === 0;
        return { label: name + (down ? ' (down)' : ''), value: down ? 0 : p, text: down ? '0 of ' + p : String(p), soft: down, tip: name + ': ' + p + ' instances' + (down ? ' — lost with the AZ' : '') };
      });
      rows.push({ label: 'Serving now', value: up, text: up + ' / ' + st.need, tip: 'Instances serving: ' + up + ' of the ' + st.need + ' needed (' + pct + '%)' });
      box.appendChild(SAA.hbars({ rows, valW: 64, max: Math.max(st.need, total), title: 'Instances per AZ', cap: 'Ink bars = running instances; the last bar is what serves users right now against the ' + st.need + ' needed. Hover a row.' }));
      box.appendChild(stats([[pct + '%', st.lost ? 'of peak capacity after losing one AZ' : 'of peak capacity', true], [String(total), 'instances you pay for'], ['+' + Math.round((total / st.need - 1) * 100) + '%', 'over the minimum']]));
      const cmp = [2, 3, 4].map(k => { const t = k * perAz(st.need, k, 'static'); return { label: k + ' AZs', value: t, text: String(t), tip: k + ' AZs, sized to survive losing one: ' + perAz(st.need, k, 'static') + ' per AZ = ' + t + ' instances (+' + Math.round((t / st.need - 1) * 100) + '%)' }; });
      box.appendChild(SAA.hbars({ rows: cmp, valW: 40, title: 'Cost of static stability by AZ count', cap: 'Instances needed to survive the loss of one AZ with no scaling, for ' + st.need + ' at peak. More AZs = a smaller share lost = less spare capacity.' }));
      const notes = [];
      if (st.lost && st.mode === 'normal') notes.push('Sized for normal load only, losing an AZ leaves ' + pct + '% of capacity. Auto Scaling will replace the lost instances in the other AZs — **if** it can launch them during the event (capacity, AMI, dependencies). Until then users see errors or slowness.');
      if (st.lost && st.mode === 'static') notes.push('Sized for the loss of one AZ: the survivors already carry the full load. Nothing has to be launched, so the recovery does not depend on the control plane during the event. This is **static stability**.');
      if (st.azs === 2 && st.mode === 'static') notes.push('With two AZs every AZ must hold the whole load: +100%. With three, each holds half: +50%.');
      notes.push('An Auto Scaling group spanning the AZs behind a load balancer is the standard HA pattern; ELB health checks let the group replace instances the load balancer marks unhealthy.');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };

  /* ================= DNS failover time ================= */
  W.failoverTime = function () {
    const st = { interval: 30, threshold: 3, ttl: 60 };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Failover time · Route 53 health check + TTL vs Global Accelerator'));
      box.appendChild(h('p', { class: 'small muted' }, md('How long until users stop reaching the failed Region? DNS failover first has to **detect** the failure (health checks), then wait for resolvers’ cached answers to **expire** (the record’s TTL). Global Accelerator moves traffic at its edge, so there is no DNS cache to wait for.')));
      box.appendChild(group('HEALTH CHECK INTERVAL', [[30, '30 s (standard)'], [10, '10 s (fast)']].map(([v, t]) => chip(t, st.interval === v, () => { st.interval = v; paint(); }, 'b'))));
      box.appendChild(group('FAILURE THRESHOLD', [1, 3, 5].map(v => chip(v + (v === 3 ? ' (default)' : ''), st.threshold === v, () => { st.threshold = v; paint(); }))));
      box.appendChild(group('RECORD TTL', [[60, '60 s'], [300, '300 s'], [3600, '3,600 s']].map(([v, t]) => chip(t, st.ttl === v, () => { st.ttl = v; paint(); }))));
      const detect = st.interval * st.threshold;
      const rows = [
        { k: 'r53', name: 'Route 53 failover record', a: detect, b: st.ttl, tipA: 'Detect: ' + st.threshold + ' failed checks × ' + st.interval + ' s = ' + dur(detect), tipB: 'Resolvers may keep the old answer for up to the TTL: ' + dur(st.ttl) },
        { k: 'ga', name: 'Global Accelerator', a: detect, b: 0, tipA: 'Detect: for ALB and NLB endpoints Global Accelerator reuses the load balancer’s own health checks (same detection time assumed here): ' + dur(detect) + '; then traffic moves at the edge', tipB: '' }
      ];
      const max = Math.max(...rows.map(r => r.a + r.b));
      box.appendChild(mountChart(w => {
        const narrow = w < 560, labW = narrow ? 118 : 210, valW = 64, rh = 40, top = 6;
        const plot = w - labW - valW;
        const H = top + rows.length * rh + 24;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Worst-case time until traffic leaves the failed Region' });
        const step = [30, 60, 120, 300, 600, 900, 1800].find(x => (max / x) * 64 <= plot) || 3600;
        const grid = s('g', { class: 'grid' });
        for (let v = 0; v <= max + 1e-9; v += step) { const x = labW + (v / max) * plot; grid.appendChild(s('line', { x1: x, x2: x, y1: top, y2: top + rows.length * rh })); g.appendChild(s('text', { class: 'axis', x, y: H - 6, 'text-anchor': 'middle', text: dur(v) })); }
        g.insertBefore(grid, g.firstChild);
        rows.forEach((r, i) => {
          const y = top + i * rh;
          const wa = (r.a / max) * plot, wb = (r.b / max) * plot;
          const ga = s('g', { 'data-tip': r.name + ' · ' + r.tipA });
          ga.appendChild(s('rect', { x: 0, y, width: labW + wa, height: rh, fill: 'transparent' }));
          ga.appendChild(s('text', { class: 'lab', x: 0, y: y + rh / 2 + 4.5, style: narrow ? 'font-size:12px' : null, text: narrow ? r.name.replace(' failover record', ' failover') : r.name }));
          ga.appendChild(s('rect', { class: 'barr', x: labW, y: y + 10, width: Math.max(2, wa), height: rh - 20, rx: 2 }));
          g.appendChild(ga);
          if (r.b) {
            const gb = s('g', { 'data-tip': r.name + ' · ' + r.tipB });
            gb.appendChild(s('rect', { class: 'barr soft', x: labW + wa, y: y + 10, width: wb, height: rh - 20, rx: 2, style: 'opacity:.5' }));
            g.appendChild(gb);
          }
          g.appendChild(s('text', { class: 'val', x: labW + wa + wb + 6, y: y + rh / 2 + 4, text: dur(r.a + r.b) }));
        });
        return g;
      }, 'Dark = detecting the failure; light = cached DNS answers still sending users to the failed Region (worst case). Hover a segment.'));
      box.appendChild(stats([[dur(detect + st.ttl), 'worst case with DNS failover', true], [dur(detect), 'detection only'], [Math.round((st.ttl / (detect + st.ttl)) * 100) + '%', 'of the worst case is the TTL']]));
      const notes = [];
      if (st.ttl >= 3600) notes.push('A one-hour TTL makes health checks almost irrelevant: resolvers keep answering with the dead Region for up to an hour. Lower the TTL **before** you need it.');
      if (st.ttl === 60 && st.interval === 10) notes.push('Fast checks and a short TTL: about as good as DNS failover gets. Some clients and resolvers still cache longer than the TTL.');
      notes.push('Alias records to AWS resources (ELB, CloudFront, S3 website) use the target’s TTL; you do not set it. **Evaluate target health** on the alias lets Route 53 use the load balancer’s own health instead of a separate check.');
      notes.push('When clients cannot tolerate DNS caching, or must use **fixed IP addresses**, Global Accelerator is the built-for answer: two static anycast IPs, traffic shifted at the edge.');
      box.appendChild(verdict('Read it', notes.join(' ')));
    };
    paint();
    return box;
  };

  /* ================= Protection vs threat ================= */
  const PROT = [
    { k: 'maz', t: 'Multi-AZ (RDS, EFS, ASG across AZs)' },
    { k: 'xr', t: 'Cross-Region replication (S3 CRR, Aurora Global, global tables)' },
    { k: 'pitr', t: 'Point-in-time recovery (RDS, Aurora, DynamoDB)' },
    { k: 'bak', t: 'AWS Backup, copies to another Region' },
    { k: 'lock', t: 'AWS Backup + Vault Lock (compliance) or an air-gapped vault' }
  ];
  const THREAT = [
    { k: 'az', t: 'An AZ fails', short: 'AZ' },
    { k: 'region', t: 'A whole Region is unavailable', short: 'Region' },
    { k: 'bad', t: 'A bad deploy deletes or corrupts data', short: 'Bad data' },
    { k: 'ransom', t: 'An attacker with admin credentials encrypts data and deletes backups', short: 'Ransomware' }
  ];
  /* y = keeps running / usable quickly · r = recoverable by a restore (downtime, some data loss) · n = lost or corrupted too */
  const CELL = {
    maz: { az: ['y', 'The standby or the other AZs take over automatically.'], region: ['n', 'Every AZ is in the same Region.'], bad: ['n', 'The standby is a synchronous copy: the delete or corruption is on it within milliseconds.'], ransom: ['n', 'Same data, same account, same credentials.'] },
    xr: { az: ['y', 'Also covers an AZ (the Region itself is Multi-AZ).'], region: ['y', 'The copy in the other Region is current to within seconds; promote it or switch traffic.'], bad: ['n', 'Replication copies the bad write too. (S3 CRR does not replicate deletes of versions and, by default, delete markers — but overwritten data is replicated.)'], ransom: ['n', 'An admin who can write the source can usually reach the replica too.'] },
    pitr: { az: ['r', 'You could restore, but Multi-AZ fails over in minutes; a restore creates a new instance.'], region: ['n', 'Automated backups live in the same Region unless you replicate them cross-Region.'], bad: ['r', 'Restore to the second before the bad deploy (within the retention window, up to 35 days).'], ransom: ['n', 'An admin can delete the database and its automated backups.'] },
    bak: { az: ['r', 'Restore in another AZ — hours, not minutes.'], region: ['r', 'The copy in the DR Region survives; restore there (backup & restore strategy).'], bad: ['r', 'Restore the last recovery point before the corruption; data since then is lost.'], ransom: ['n', 'Without a lock, an attacker with enough permissions deletes the recovery points first.'] },
    lock: { az: ['r', 'Restore, as with any backup.'], region: ['r', 'Restore from the copy in another Region or account.'], bad: ['r', 'Restore the last clean recovery point.'], ransom: ['r', 'Compliance-mode Vault Lock: **nobody**, not even the root user or AWS, can delete recovery points before they expire. A logically air-gapped vault is locked and shareable with a recovery account.'] }
  };
  const G = { y: '✓', r: '◐', n: '✕' };
  W.threatMatrix = function () {
    const st = { threat: 'bad' };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Protection vs threat · replication is not a backup'));
      box.appendChild(h('p', { class: 'small muted' }, md('Five protections against four failures. Pick a failure and read its column. ✓ = keeps running or usable at once · ◐ = recoverable by a restore (downtime, some data loss) · ✕ = lost or corrupted too.')));
      box.appendChild(group('WHAT GOES WRONG', THREAT.map(x => chip(x.t, st.threat === x.k, () => { st.threat = x.k; paint(); }, 'b'))));
      box.appendChild(mountChart(w => {
        const narrow = w < 560, labW = narrow ? 128 : 330, top = narrow ? 30 : 26, rh = narrow ? 44 : 34;
        const cw = (w - labW) / THREAT.length;
        const H = top + PROT.length * rh + 4;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Which protection survives which failure' });
        THREAT.forEach((x, j) => {
          const cx = labW + j * cw;
          if (x.k === st.threat) g.appendChild(s('rect', { x: cx + 2, y: 2, width: cw - 4, height: H - 4, rx: 6, style: 'fill:none;stroke:var(--ink);stroke-width:2' }));
          g.appendChild(s('text', { class: 'axis', x: cx + cw / 2, y: top - 10, 'text-anchor': 'middle', style: 'font-weight:600' + (x.k === st.threat ? ';fill:var(--ink)' : ''), text: narrow ? { az: 'AZ', region: 'Region', bad: 'Bad', ransom: 'Ransom' }[x.k] : x.short }));
        });
        PROT.forEach((p, i) => {
          const y = top + i * rh;
          const words = p.t.split(' ');
          const lab = narrow ? { maz: 'Multi-AZ', xr: 'Cross-Region repl.', pitr: 'PITR', bak: 'Backup copies', lock: 'Backup + lock' }[p.k] : p.t;
          if (!narrow && lab.length > 44) {
            const cut = words.slice(0, 3).join(' ');
            g.appendChild(s('text', { class: 'lab', x: 0, y: y + rh / 2 - 2, text: cut }));
            g.appendChild(s('text', { class: 'axis', x: 0, y: y + rh / 2 + 12, text: words.slice(3).join(' ') }));
          } else g.appendChild(s('text', { class: 'lab', x: 0, y: y + rh / 2 + 4.5, style: narrow ? 'font-size:12px' : null, text: lab }));
          THREAT.forEach((x, j) => {
            const [v, why] = CELL[p.k][x.k];
            const cx = labW + j * cw;
            const gg = s('g', { 'data-tip': p.t + ' × ' + x.t + ': ' + ({ y: 'keeps running. ', r: 'recoverable by restore. ', n: 'does not protect. ' })[v] + why.replace(/\*\*/g, '') });
            gg.appendChild(s('rect', { x: cx + 6, y: y + 5, width: cw - 12, height: rh - 10, rx: 6, style: v === 'y' ? 'fill:var(--ink)' : v === 'r' ? 'fill:var(--surface);stroke:var(--ink);stroke-width:1.5' : 'fill:var(--surface);stroke:var(--chip-border);stroke-width:1;stroke-dasharray:4 3' }));
            const mx = cx + cw / 2, my = y + rh / 2;
            if (v === 'r') {
              gg.appendChild(s('circle', { cx: mx, cy: my, r: 7, style: 'fill:none;stroke:var(--ink);stroke-width:1.5' }));
              gg.appendChild(s('path', { d: `M${mx} ${my - 7} A7 7 0 0 0 ${mx} ${my + 7} Z`, style: 'fill:var(--ink)' }));
            } else gg.appendChild(s('text', { class: 'val', x: mx, y: my + 5, 'text-anchor': 'middle', style: 'font-size:15px;' + (v === 'y' ? 'fill:var(--surface)' : 'fill:var(--ink2)'), text: G[v] }));
            g.appendChild(gg);
          });
        });
        return g;
      }, 'Filled = keeps running; outlined = restore; dashed = no protection. The framed column is the failure you picked. Hover a cell for the reason.'));
      const T = THREAT.find(x => x.k === st.threat);
      box.appendChild(h('ul', { class: 'small' }, PROT.map(p => { const [v, why] = CELL[p.k][st.threat]; return h('li', null, h('b', { text: G[v] + ' ' + p.t + ' — ' }), md(why)); })));
      const survivors = PROT.filter(p => CELL[p.k][st.threat][0] !== 'n').length;
      box.appendChild(stats([[survivors + ' / 5', 'protections that help with “' + T.short + '”', true], [String(PROT.filter(p => CELL[p.k][st.threat][0] === 'y').length), 'keep the application running']]));
      const lesson = { az: 'An AZ failure is a **high-availability** problem: Multi-AZ handles it with no restore at all.', region: 'A Region failure is a **disaster recovery** problem: only copies outside the Region help — live replicas for minutes, backups for hours.', bad: 'Bad data is the case replication cannot fix: every replica faithfully copies the mistake. Only a copy from **before** the mistake helps — PITR, versioning, backups.', ransom: 'Against someone holding admin credentials, only copies they **cannot delete** help: Vault Lock in compliance mode, or a logically air-gapped vault (ideally shared to a separate recovery account).' }[st.threat];
      box.appendChild(verdict('The rule', lesson));
    };
    paint();
    return box;
  };

  /* ================= DR cost ladder ================= */
  W.drCost = function () {
    const st = { rate: 100, warm: 0.25 };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('DR cost ladder · standing cost vs downtime cost'));
      box.appendChild(h('p', { class: 'small muted' }, md('Production costs **100 units a month**. Each strategy keeps a share of it running in the DR Region all year; each Region outage costs downtime. **Every number here is an assumption you set** (shares and outage lengths are rough typical values, not AWS prices).')));
      box.appendChild(group('DOWNTIME COSTS (UNITS / HOUR)', [10, 100, 1000].map(v => chip(String(v), st.rate === v, () => { st.rate = v; paint(); }))));
      box.appendChild(group('WARM STANDBY SIZE', [[0.25, '25% of prod'], [0.5, '50% of prod']].map(([v, t]) => chip(t, st.warm === v, () => { st.warm = v; paint(); }, 'b'))));
      const R = [
        { k: 'br', name: 'Backup & restore', share: 0.05, rto: 8, why: 'backup storage and copies only (5%); ~8 h to rebuild and restore' },
        { k: 'pl', name: 'Pilot light', share: 0.15, rto: 0.5, why: 'database replica and replication always on (15%); ~30 min to start and scale compute' },
        { k: 'ws', name: 'Warm standby', share: st.warm, rto: 5 / 60, why: 'a scaled-down working copy (' + Math.round(st.warm * 100) + '%); ~5 min to scale up and shift traffic' },
        { k: 'ms', name: 'Multi-site active/active', share: 1, rto: 0, why: 'a second full production (100%); traffic simply stops going to the failed Region' }
      ].map(r => Object.assign(r, { run: 12 * 100 * r.share, down: st.rate * r.rto }));
      R.forEach(r => { r.total = r.run + r.down; });
      const best = R.reduce((a, b) => (b.total < a.total ? b : a));
      const max = Math.max(...R.map(r => r.total));
      box.appendChild(mountChart(w => {
        const narrow = w < 560, labW = narrow ? 104 : 200, valW = 60, rh = 34, top = 4;
        const plot = w - labW - valW, H = top + R.length * rh + 24;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Yearly DR cost plus one Region outage, by strategy' });
        const step = [100, 200, 500, 1000, 2000, 5000, 10000].find(x => max / x <= 5) || 20000;
        const grid = s('g', { class: 'grid' });
        for (let v = 0; v <= max + 1e-9; v += step) { const x = labW + (v / max) * plot; grid.appendChild(s('line', { x1: x, x2: x, y1: top, y2: top + R.length * rh })); g.appendChild(s('text', { class: 'axis', x, y: H - 6, 'text-anchor': 'middle', text: v >= 1000 ? v / 1000 + 'k' : String(v) })); }
        g.appendChild(grid);
        R.forEach((r, i) => {
          const y = top + i * rh, wa = (r.run / max) * plot, wb = (r.down / max) * plot;
          const ga = s('g', { 'data-tip': r.name + ' · standing cost ' + Math.round(r.run) + ' units a year: ' + r.why });
          ga.appendChild(s('rect', { x: 0, y, width: labW + wa, height: rh, fill: 'transparent' }));
          ga.appendChild(s('text', { class: 'lab', x: 0, y: y + rh / 2 + 4.5, style: (narrow ? 'font-size:12px;' : '') + (r === best ? 'font-weight:700' : ''), text: narrow ? r.name.replace('Multi-site active/active', 'Multi-site').replace('Backup & restore', 'Backup & rest.') : r.name }));
          ga.appendChild(s('rect', { class: 'barr', x: labW, y: y + 8, width: Math.max(2, wa), height: rh - 16, rx: 2 }));
          g.appendChild(ga);
          if (r.down > 0) {
            const gb = s('g', { 'data-tip': r.name + ' · one Region outage: ~' + dur(r.rto * 3600) + ' down × ' + st.rate + ' units/h = ' + Math.round(r.down) + ' units' });
            gb.appendChild(s('rect', { class: 'barr soft', x: labW + wa, y: y + 8, width: Math.max(2, wb), height: rh - 16, rx: 2, style: 'opacity:.5' }));
            g.appendChild(gb);
          }
          g.appendChild(s('text', { class: 'val', x: labW + wa + wb + 6, y: y + rh / 2 + 4, text: String(Math.round(r.total)) }));
        });
        return g;
      }, 'Dark = a year of standing DR cost; light = one Region outage at your downtime cost. Hover a segment for the assumption behind it.'));
      box.appendChild(stats([[best.name, 'lowest total for one outage a year', true], [String(Math.round(best.total)), 'units a year'], [String(Math.round(R[3].total - best.total)), 'units more for multi-site']]));
      const note = st.rate <= 10 ? 'Downtime is cheap: the extra standing cost of every faster strategy is wasted. That is why the exam answer for “RTO of 24 hours, most cost-effective” is backup and restore.' : st.rate >= 1000 ? 'Downtime is expensive: minutes of outage cost more than a year of standby. Faster strategies pay for themselves — the question then says “minimal downtime” or “business-critical”.' : 'In the middle, the cheapest strategy that meets the stated RTO wins — the questions give you the RTO and RPO so you don’t have to price downtime.';
      box.appendChild(verdict('Read it', note + ' The exam never asks you to compute this; it asks for the **cheapest strategy that meets the stated RTO and RPO** — which is the same trade-off, decided for you by the business.'));
    };
    paint();
    return box;
  };
})();
