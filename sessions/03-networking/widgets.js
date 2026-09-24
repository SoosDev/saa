/* Session 3 widgets: CIDR calculator, peering/TGW route simulator, SG + NACL packet walker,
   hybrid-connectivity chooser with a log-scale bandwidth chart.
   The endpoint chooser, sorters and step-throughs use the generic engine widgets. */
(function () {
  'use strict';
  const { h, s, md, clear, eyebrow, mountChart } = SAA;
  const W = SAA.widgets;
  const chip = (label, on, click, cls) => h('button', { class: 'chip' + (cls ? ' ' + cls : ''), type: 'button', 'aria-pressed': String(!!on), text: label, on: { click } });
  const group = (label, kids) => h('div', { class: 'stubrow' }, h('span', { class: 'stublab', text: label }), h('div', { class: 'chiprow' }, kids));
  const verdict = (title, text) => h('div', { class: 'callout' }, eyebrow(title, 'sm'), h('span', null, md(text)));

  /* ================= IPv4 helpers ================= */
  const ip2n = ip => ip.split('.').reduce((a, o) => a * 256 + (+o), 0);
  const n2ip = n => [24, 16, 8, 0].map(b => Math.floor(n / Math.pow(2, b)) % 256).join('.');
  function parseCidr(str) {
    const m = String(str).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
    if (!m) return null;
    const oct = m.slice(1, 5).map(Number), p = +m[5];
    if (oct.some(o => o > 255) || p > 32) return null;
    const size = Math.pow(2, 32 - p);
    const raw = ip2n(oct.join('.'));
    const base = raw - (raw % size);
    return { p, size, base, end: base + size - 1, text: n2ip(base) + '/' + p, canon: raw !== base };
  }
  const overlaps = (a, b) => a.base <= b.end && b.base <= a.end;

  /* ================= CIDR / subnet calculator ================= */
  const CIDR_PRESETS = [
    { n: 'K1 · 120 addresses', vpc: '10.20.0.0/16', p: 26, need: 120, a: '10.20.0.0/16', b: '10.21.0.0/16' },
    { n: 'Q7 · peer B and C', vpc: '10.1.0.0/16', p: 24, need: 50, a: '10.1.0.0/16', b: '10.2.0.0/16' },
    { n: 'overlapping VPCs', vpc: '10.0.0.0/16', p: 24, need: 200, a: '10.0.0.0/16', b: '10.0.128.0/20' }
  ];
  W.cidrCalc = function () {
    const st = Object.assign({}, CIDR_PRESETS[0]);
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('CIDR calculator · subnets and peering'));
      box.appendChild(h('div', { class: 'chiprow' }, CIDR_PRESETS.map(p => chip(p.n, st.n === p.n, () => { Object.assign(st, p); paint(); }, 'b'))));
      const vpc = parseCidr(st.vpc);
      const txt = (lab, key, w) => h('label', { class: 'field' }, h('span', { text: lab }), h('input', { class: 'inp', type: 'text', value: st[key], spellcheck: 'false', 'aria-label': lab, style: w ? { fontFamily: 'var(--f-mono)' } : { fontFamily: 'var(--f-mono)' }, on: { change: e => { st[key] = e.target.value.trim(); st.n = null; paint(); } } }));
      const pOpts = [];
      for (let p = 16; p <= 28; p++) pOpts.push(p);
      box.appendChild(h('div', { class: 'grid g3', style: { alignItems: 'end' } },
        txt('VPC CIDR', 'vpc'),
        h('label', { class: 'field' }, h('span', { text: 'SUBNET SIZE' }), h('select', { class: 'inp', 'aria-label': 'Subnet prefix', on: { change: e => { st.p = +e.target.value; st.n = null; paint(); } } }, pOpts.map(p => h('option', { value: p, selected: st.p === p }, '/' + p + ' · ' + Math.pow(2, 32 - p) + ' addresses')))),
        h('label', { class: 'field' }, h('span', { text: 'ADDRESSES NEEDED PER SUBNET' }), h('input', { class: 'inp', type: 'number', min: 1, value: st.need, 'aria-label': 'Addresses needed', on: { change: e => { st.need = Math.max(1, +e.target.value || 1); st.n = null; paint(); } } }))));

      if (!vpc) { box.appendChild(verdict('Check the input', 'Write the VPC CIDR as `a.b.c.d/n`, for example `10.0.0.0/16`.')); }
      else {
        const notes = [];
        if (vpc.canon) notes.push('AWS stores this as its canonical form **' + vpc.text + '**.');
        if (vpc.p < 16 || vpc.p > 28) notes.push('A VPC CIDR must be between **/16** and **/28**; /' + vpc.p + ' is not allowed.');
        const p = Math.max(st.p, vpc.p);
        const size = Math.pow(2, 32 - p), usable = size - 5, fit = Math.pow(2, p - vpc.p);
        let best = null;
        for (let q = 28; q >= Math.max(16, vpc.p); q--) if (Math.pow(2, 32 - q) - 5 >= st.need) { best = q; break; }
        box.appendChild(h('div', { class: 'stats' }, [
          ['/' + p, 'subnet prefix' + (st.p < vpc.p ? ' (capped at the VPC size)' : '')],
          [String(size), 'addresses in each subnet'],
          [String(usable), 'usable (5 reserved)'],
          [fit.toLocaleString('en-US'), 'subnets of this size fit in ' + vpc.text]
        ].map(([a, b], i) => h('div', { class: 'stat', style: i === 2 ? { borderColor: 'var(--ink)', borderWidth: '2px', padding: '9px 11px' } : null }, h('b', { text: a }), h('span', { text: b })))));
        const first = vpc.base;
        const res = [[first, 'network address'], [first + 1, 'VPC router'], [first + 2, 'Amazon DNS'], [first + 3, 'reserved for future use'], [first + size - 1, 'broadcast (not supported, reserved)']];
        box.appendChild(mountChart(w => {
          const H = 92, L = 4, R = 4, pw = w - L - R;
          const cell = Math.min(46, pw / 7.5);
          const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Reserved and usable addresses in the first subnet' });
          const usableW = pw - cell * 5 - 8;
          const xs = [L, L + cell, L + cell * 2, L + cell * 3];
          xs.forEach((x, i) => {
            const gg = s('g', { 'data-tip': n2ip(res[i][0]) + ' — ' + res[i][1] });
            gg.appendChild(s('rect', { x: x + 1, y: 20, width: cell - 2, height: 30, rx: 3, style: 'fill:var(--ink)' }));
            gg.appendChild(s('text', { class: 'val', x: x + cell / 2, y: 40, 'text-anchor': 'middle', style: 'fill:var(--surface)', text: '.' + (res[i][0] % 256) }));
            g.appendChild(gg);
          });
          const ux = L + cell * 4 + 4;
          const ug = s('g', { 'data-tip': usable + ' usable addresses: ' + n2ip(first + 4) + ' – ' + n2ip(first + size - 2) });
          ug.appendChild(s('rect', { x: ux, y: 20, width: Math.max(10, usableW), height: 30, rx: 3, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:2' }));
          ug.appendChild(s('text', { class: 'val', x: ux + Math.max(10, usableW) / 2, y: 40, 'text-anchor': 'middle', text: usable + ' usable' }));
          g.appendChild(ug);
          const bx = ux + Math.max(10, usableW) + 4;
          const bg = s('g', { 'data-tip': n2ip(res[4][0]) + ' — ' + res[4][1] });
          bg.appendChild(s('rect', { x: bx, y: 20, width: cell - 2, height: 30, rx: 3, style: 'fill:var(--ink)' }));
          bg.appendChild(s('text', { class: 'val', x: bx + cell / 2 - 1, y: 40, 'text-anchor': 'middle', style: 'fill:var(--surface)', text: '.' + (res[4][0] % 256) }));
          g.appendChild(bg);
          g.appendChild(s('text', { class: 'axis', x: L, y: 12, text: 'first subnet ' + n2ip(first) + '/' + p }));
          g.appendChild(s('text', { class: 'axis', x: L, y: 70, text: 'ink = reserved by AWS (4 at the start, 1 at the end)' }));
          g.appendChild(s('text', { class: 'axis', x: L, y: 86, text: 'hover a block for its role' }));
          return g;
        }));
        box.appendChild(h('div', { class: 'tbl' }, h('table', null, h('thead', null, h('tr', null, h('th', { text: 'Reserved address' }), h('th', { text: 'Role' }))),
          h('tbody', null, res.map(([n, r]) => h('tr', null, h('td', { class: 'mono', text: n2ip(n) }), h('td', { text: r })))))));
        const ok = usable >= st.need;
        notes.push(ok
          ? '**/' + p + ' fits**: ' + usable + ' usable ≥ ' + st.need + ' needed.' + (best && best > p ? ' The smallest size that fits is **/' + best + '** (' + (Math.pow(2, 32 - best) - 5) + ' usable).' : ' It is also the smallest size that fits.')
          : '**/' + p + ' is too small**: ' + usable + ' usable < ' + st.need + ' needed.' + (best ? ' The smallest size that fits is **/' + best + '** (' + (Math.pow(2, 32 - best) - 5) + ' usable).' : ' Nothing down to /16 fits inside this VPC; add a secondary CIDR or a second subnet.'));
        box.appendChild(verdict('Subnet check', notes.join(' ')));
      }

      box.appendChild(h('h3', { style: { fontSize: '17px', marginTop: '4px' }, text: 'Can these two VPCs be peered?' }));
      box.appendChild(h('div', { class: 'grid g2', style: { alignItems: 'end' } }, txt('VPC 1 CIDR', 'a'), txt('VPC 2 CIDR', 'b')));
      const A = parseCidr(st.a), B = parseCidr(st.b);
      if (!A || !B) box.appendChild(verdict('Peering check', 'Write both CIDRs as `a.b.c.d/n`.'));
      else if (overlaps(A, B)) box.appendChild(h('div', { class: 'callout' }, eyebrow('Peering check', 'sm'), h('span', { class: 'bad-t' }, md('**Overlap: peering fails.** ' + A.text + ' (' + n2ip(A.base) + '–' + n2ip(A.end) + ') and ' + B.text + ' (' + n2ip(B.base) + '–' + n2ip(B.end) + ') share addresses. Re-address one VPC, or expose just the service with **PrivateLink**, which does not care about overlap.'))));
      else box.appendChild(h('div', { class: 'callout' }, eyebrow('Peering check', 'sm'), h('span', { class: 'ok-t' }, md('**No overlap: peering is possible.** ' + A.text + ' ends at ' + n2ip(A.end) + '; ' + B.text + ' starts at ' + n2ip(B.base) + '. Remember: it is still one pair only, not transitive.'))));
    };
    paint();
    return box;
  };

  /* ================= Route simulator: peering vs transit gateway ================= */
  const NODES = { A: 'VPC A', B: 'VPC B', C: 'VPC C', onprem: 'on-prem', net: 'internet' };
  function route(st, src, dst) {
    if (src === dst) return { ok: null, hops: [src], why: 'Pick two different ends.' };
    const pair = [src, dst].sort().join('-');
    if (st.mode === 'peer') {
      if (pair === 'A-B' || pair === 'A-C') return { ok: true, hops: [src, dst], why: '**Direct peering connection** between the two VPCs, with routes on both sides.' };
      if (pair === 'B-C') return st.bc
        ? { ok: true, hops: [src, dst], why: '**Direct peering B↔C.** Now it works, because the two VPCs are peered with each other, not through A.' }
        : { ok: false, hops: [src, 'A', dst], bad: 'A', why: '**Blocked: peering is not transitive.** A is peered with B and with C, but A never forwards traffic between its peers. Peer B with C (toggle it), or move to a transit gateway. This is your Q7.' };
      if (pair === 'A-onprem') return { ok: true, hops: [src, dst], why: 'VPC A’s own **Site-to-Site VPN** on its virtual private gateway.' };
      if (pair === 'A-net') return { ok: true, hops: [src, dst], why: src === 'net' ? 'Inbound from the internet reaches **public** resources in A through its internet gateway.' : 'A’s private subnets go out through A’s **NAT gateway** and internet gateway.' };
      const peerV = src === 'onprem' || src === 'net' ? dst : src;
      const edge = pair.includes('onprem') ? 'VPN connection' : 'NAT gateway / internet gateway';
      return { ok: false, hops: [src, 'A', dst], bad: 'A', why: '**Blocked: no edge-to-edge routing.** VPC ' + peerV + ' cannot use VPC A’s ' + edge + ' through the peering connection. Give VPC ' + peerV + ' its own, or put everything on a transit gateway.' };
    }
    // transit gateway
    const vpcs = ['A', 'B', 'C'];
    if (pair === 'B-C' && st.seg) return { ok: false, hops: [src, 'T', dst], bad: 'T', why: '**Blocked by design.** B and C are associated with TGW route tables that hold no route to each other (segmentation). Shared services and on-prem stay reachable.' };
    if (vpcs.includes(src) && vpcs.includes(dst)) return { ok: true, hops: [src, 'T', dst], why: 'Both VPCs are **attached to the transit gateway**; its route table sends the traffic across. Transitive by route table, not by peering.' };
    if (pair.includes('onprem')) { const v = src === 'onprem' ? dst : src; return { ok: true, hops: [src, 'T', dst], why: 'The **VPN attaches to the transit gateway**, so every attached VPC (here ' + v + ') reaches on-prem through one connection.' }; }
    if (pair.includes('net')) {
      const v = src === 'net' ? dst : src;
      if (src === 'net') return v === 'A' ? { ok: true, hops: ['net', 'A'], why: 'Inbound reaches public resources in A through its internet gateway.' } : { ok: false, hops: ['net', 'A', 'T', v], bad: 'A', why: '**Blocked:** a NAT gateway only carries connections started inside. Inbound to ' + v + ' needs its own public entry (IGW + load balancer).' };
      return v === 'A' ? { ok: true, hops: ['A', 'net'], why: 'A goes out through its own NAT gateway.' } : { ok: true, hops: [v, 'T', 'A', 'net'], why: '**Centralised egress:** the TGW route table sends 0.0.0.0/0 to VPC A, whose NAT gateway serves every spoke. Allowed here because the TGW routes it; through peering it would be edge-to-edge.' };
    }
    return { ok: null, hops: [src], why: '' };
  }
  W.routeSim = function () {
    const st = { mode: 'peer', bc: false, seg: false, src: 'B', dst: 'C' };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Route simulator · peering vs transit gateway'));
      box.appendChild(group('WIRING', [chip('VPC peering (A–B, A–C)', st.mode === 'peer', () => { st.mode = 'peer'; paint(); }, 'b'), chip('Transit gateway', st.mode === 'tgw', () => { st.mode = 'tgw'; paint(); }, 'b')]));
      if (st.mode === 'peer') box.appendChild(group('EXTRA', [chip(st.bc ? 'B–C peered' : 'add B–C peering', st.bc, () => { st.bc = !st.bc; paint(); }, 'b')]));
      else box.appendChild(group('TGW ROUTE TABLES', [chip(st.seg ? 'B and C segmented' : 'one shared route table', st.seg, () => { st.seg = !st.seg; paint(); }, 'b')]));
      const ends = Object.keys(NODES);
      box.appendChild(group('FROM', ends.map(k => chip(NODES[k], st.src === k, () => { st.src = k; paint(); }))));
      box.appendChild(group('TO', ends.map(k => chip(NODES[k], st.dst === k, () => { st.dst = k; paint(); }))));
      const r = route(st, st.src, st.dst);
      const L = (SAA.ctx && SAA.ctx.LINES) || {};
      box.appendChild(mountChart(w => {
        const narrow = w < 520, H = narrow ? 300 : 260;
        const P = narrow
          ? { net: [w / 2, 30], onprem: [44, 150], A: [w * 0.42, 150], T: [w * 0.66, 238], B: [w - 44, 80], C: [w - 44, 220] }
          : { net: [w * 0.38, 34], onprem: [70, 140], A: [w * 0.38, 140], T: [w * 0.62, 214], B: [w - 80, 70], C: [w - 80, 210] };
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Network diagram with the selected path' });
        g.appendChild(s('defs', null, s('marker', { id: 'rsarr', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, s('path', { d: 'M0 0 L10 5 L0 10 z', style: 'fill:var(--ink)' }))));
        const link = (a, b, style, dash, width) => g.appendChild(s('line', { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], 'stroke-linecap': 'round', 'stroke-dasharray': dash || null, style: 'stroke:' + style + ';stroke-width:' + (width || 4) + ';opacity:.55' }));
        const TG = L.tgw ? 'var(--tgw)' : 'var(--ink2)';
        if (st.mode === 'peer') {
          link('A', 'B', 'var(--ink)', '1 9'); link('A', 'C', 'var(--ink)', '1 9');
          if (st.bc) link('B', 'C', 'var(--ink)', '1 9');
          link('A', 'onprem', 'var(--ink)', '12 8'); link('A', 'net', 'var(--ink)', '10 6');
        } else {
          ['A', 'B', 'C', 'onprem'].forEach(k => link(k, 'T', TG, null, 6));
          link('A', 'net', 'var(--ink)', '10 6');
        }
        /* the path */
        if (r.hops.length > 1) {
          const pts = r.hops.map(k => P[k]);
          const okPart = r.ok === false ? r.hops.slice(0, r.hops.indexOf(r.bad) + 1).map(k => P[k]) : pts;
          g.appendChild(s('path', { d: 'M' + okPart.map(p => p.join(' ')).join(' L'), fill: 'none', 'marker-end': r.ok ? 'url(#rsarr)' : null, style: 'stroke:var(--ink);stroke-width:3.5;stroke-linejoin:round' }));
          if (r.ok === false) {
            const b = P[r.bad], nxt = P[r.hops[r.hops.indexOf(r.bad) + 1]];
            const mx = (b[0] + nxt[0]) / 2, my = (b[1] + nxt[1]) / 2;
            g.appendChild(s('path', { d: 'M' + b.join(' ') + ' L' + nxt.join(' '), fill: 'none', 'stroke-dasharray': '3 6', style: 'stroke:var(--bad);stroke-width:3' }));
            g.appendChild(s('text', { x: mx, y: my + 7, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 800, style: 'fill:var(--bad)', text: '✕' }));
          }
        }
        const node = (k, label, shape) => {
          const [x, y] = P[k];
          const on = r.hops.includes(k);
          const gg = s('g', { 'data-tip': label, style: 'opacity:' + (on ? 1 : 0.55) });
          if (shape === 'hub') gg.appendChild(s('rect', { x: x - 34, y: y - 13, width: 68, height: 26, rx: 13, style: 'fill:var(--surface);stroke:' + TG + ';stroke-width:3' }));
          else if (shape === 'box') gg.appendChild(s('rect', { x: x - 30, y: y - 16, width: 60, height: 32, rx: 6, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:' + (on ? 3 : 2) }));
          else gg.appendChild(s('circle', { cx: x, cy: y, r: 12, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:' + (on ? 3 : 2) }));
          gg.appendChild(s('text', { x, y: shape === 'hub' ? y + 4 : (shape === 'box' ? y + 5 : y + 30), 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, 'font-family': 'Overpass, sans-serif', style: 'fill:var(--ink)', text: shape === 'hub' ? 'TGW' : (shape === 'box' ? label.replace('VPC ', 'VPC ') : label) }));
          g.appendChild(gg);
        };
        node('A', 'VPC A', 'box'); node('B', 'VPC B', 'box'); node('C', 'VPC C', 'box');
        node('onprem', 'on-prem'); node('net', 'internet');
        if (st.mode === 'tgw') node('T', 'Transit gateway', 'hub');
        return g;
      }, st.mode === 'peer' ? 'Dotted = peering, long dashes = VPN, short dashes = NAT egress. Only A has a VPN and a NAT gateway.' : 'Teal = transit gateway attachments. VPC A doubles as the egress VPC with the NAT gateway. Cost: 4 attachment-hours + per-GB processing.'));
      box.appendChild(h('div', { class: 'callout' }, eyebrow(r.ok === true ? 'Traffic flows' : r.ok === false ? 'Traffic is dropped' : 'Pick a path', 'sm'), h('span', { class: r.ok === true ? 'ok-t' : r.ok === false ? 'bad-t' : null }, md(r.why))));
    };
    paint();
    return box;
  };

  /* ================= SG + NACL packet walker ================= */
  const CLIENT = '203.0.113.25', BAD = '198.51.100.7';
  const inR = (v, r) => v >= r[0] && v <= r[1];
  const cidrHas = (c, ip) => { const x = parseCidr(c); const n = ip2n(ip); return x && n >= x.base && n <= x.end; };
  const R = (n, port, cidr, act) => ({ n, port, cidr, act });
  const STAR = R('*', [0, 65535], '0.0.0.0/0', 'DENY');
  const FLOWS = [
    { id: 'broken', n: 'HTTPS in · NACL missing ephemeral', dir: 'in', src: CLIENT, sport: 49152, dport: 443,
      nin: [R(100, [443, 443], '0.0.0.0/0', 'ALLOW'), STAR], nout: [R(100, [443, 443], '0.0.0.0/0', 'ALLOW'), STAR], sgin: [[443, '0.0.0.0/0']], fix: 'fixed',
      lesson: 'The request got in; the **reply** was dropped. Replies go to the client’s ephemeral port (here 49152), and the stateless NACL only allows 443 outbound. This is drill K5.' },
    { id: 'fixed', n: 'HTTPS in · ephemeral allowed', dir: 'in', src: CLIENT, sport: 49152, dport: 443,
      nin: [R(100, [443, 443], '0.0.0.0/0', 'ALLOW'), STAR], nout: [R(100, [443, 443], '0.0.0.0/0', 'ALLOW'), R(110, [1024, 65535], '0.0.0.0/0', 'ALLOW'), STAR], sgin: [[443, '0.0.0.0/0']],
      lesson: 'Outbound rule 110 opens 1024–65535, so the reply leaves. The security group needed nothing: it is stateful.' },
    { id: 'late', n: 'Block 198.51.100.7 · deny rule 200', dir: 'in', src: BAD, sport: 51000, dport: 443,
      nin: [R(100, [443, 443], '0.0.0.0/0', 'ALLOW'), R(200, [0, 65535], '198.51.100.0/24', 'DENY'), STAR], nout: [R(100, [1024, 65535], '0.0.0.0/0', 'ALLOW'), STAR], sgin: [[443, '0.0.0.0/0']], fix: 'early',
      lesson: 'The deny exists but **rule 100 matches first** and allows the packet. NACLs stop at the lowest matching number. This is drill K6.' },
    { id: 'early', n: 'Block 198.51.100.7 · deny rule 50', dir: 'in', src: BAD, sport: 51000, dport: 443,
      nin: [R(50, [0, 65535], '198.51.100.0/24', 'DENY'), R(100, [443, 443], '0.0.0.0/0', 'ALLOW'), STAR], nout: [R(100, [1024, 65535], '0.0.0.0/0', 'ALLOW'), STAR], sgin: [[443, '0.0.0.0/0']],
      lesson: 'Rule 50 matches before 100: dropped at the subnet edge, for every instance in it. A security group could not do this — it has no deny.' },
    { id: 'patch', n: 'Instance downloads a patch · inbound ephemeral missing', dir: 'out', dst: '198.18.0.10', sport: 33000, dport: 443,
      nin: [R(100, [22, 22], '203.0.113.0/24', 'ALLOW'), STAR], nout: [R(100, [443, 443], '0.0.0.0/0', 'ALLOW'), STAR], sgin: [[22, '203.0.113.0/24']], fix: 'patchfix',
      lesson: 'The instance started the connection, so the **reply comes in** to its ephemeral port (33000). The NACL has no inbound rule for it. The SG lets it in (stateful), but the NACL drops it first.' },
    { id: 'patchfix', n: 'Instance downloads a patch · fixed', dir: 'out', dst: '198.18.0.10', sport: 33000, dport: 443,
      nin: [R(100, [22, 22], '203.0.113.0/24', 'ALLOW'), R(110, [1024, 65535], '0.0.0.0/0', 'ALLOW'), STAR], nout: [R(100, [443, 443], '0.0.0.0/0', 'ALLOW'), STAR], sgin: [[22, '203.0.113.0/24']],
      lesson: 'Inbound rule 110 admits the replies. Security group outbound allows everything by default, and its inbound side tracks the connection, so no SG change.' }
  ];
  function naclEval(rules, port, ip) {
    const sorted = rules.filter(r => r.n !== '*').sort((a, b) => a.n - b.n).concat(rules.filter(r => r.n === '*'));
    for (const r of sorted) if (inR(port, r.port) && cidrHas(r.cidr, ip)) return r;
    return STAR;
  }
  function walk(f) {
    const steps = [];
    const push = (where, ok, rule, text) => steps.push({ where, ok, rule, text });
    if (f.dir === 'in') {
      let r = naclEval(f.nin, f.dport, f.src);
      push('NACL inbound (subnet)', r.act === 'ALLOW', r, 'Request ' + f.src + ':' + f.sport + ' → port ' + f.dport + '. Rules checked lowest number first.');
      if (r.act !== 'ALLOW') return steps;
      const sg = f.sgin.find(([p, c]) => p === f.dport && cidrHas(c, f.src));
      push('Security group inbound (instance)', !!sg, sg ? { n: 'SG', act: 'ALLOW', port: [sg[0], sg[0]], cidr: sg[1] } : null, sg ? 'An allow rule matches.' : 'No allow rule matches: security groups deny by default.');
      if (!sg) return steps;
      push('Security group outbound (reply)', true, { n: 'SG', act: 'ALLOW', port: [f.sport, f.sport], cidr: 'tracked' }, '**Stateful**: the reply to an allowed request leaves automatically. No rule needed.');
      r = naclEval(f.nout, f.sport, f.src);
      push('NACL outbound (reply)', r.act === 'ALLOW', r, 'Reply → ' + f.src + ':' + f.sport + '. **Stateless**: the NACL checks the reply like any new packet.');
    } else {
      push('Security group outbound (instance)', true, { n: 'SG', act: 'ALLOW', port: [0, 65535], cidr: '0.0.0.0/0' }, 'Default outbound rule allows all traffic.');
      let r = naclEval(f.nout, f.dport, f.dst);
      push('NACL outbound (subnet)', r.act === 'ALLOW', r, 'Request → ' + f.dst + ':' + f.dport + '.');
      if (r.act !== 'ALLOW') return steps;
      r = naclEval(f.nin, f.sport, f.dst);
      push('NACL inbound (reply)', r.act === 'ALLOW', r, 'Reply ' + f.dst + ':' + f.dport + ' → port ' + f.sport + ' (the instance’s ephemeral port). **Stateless**: needs its own rule.');
      if (r.act !== 'ALLOW') return steps;
      push('Security group inbound (reply)', true, { n: 'SG', act: 'ALLOW', port: [f.sport, f.sport], cidr: 'tracked' }, '**Stateful**: the reply to a connection the instance started is allowed in automatically.');
    }
    return steps;
  }
  const ruleText = r => r ? (r.n === 'SG' ? 'SG ' + r.act : 'rule ' + r.n + ' ' + r.act) + ' · TCP ' + (r.port[0] === r.port[1] ? r.port[0] : r.port[0] + '–' + r.port[1]) + ' · ' + r.cidr : '—';
  W.packetWalker = function () {
    const st = { f: 'broken', i: 0 };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      const f = FLOWS.find(x => x.id === st.f);
      const steps = walk(f);
      box.appendChild(eyebrow('Packet walker · security group + network ACL'));
      box.appendChild(h('div', { class: 'chiprow' }, FLOWS.map(x => chip(x.n, x.id === st.f, () => { st.f = x.id; st.i = 0; paint(); }, 'b'))));
      const rt = (title, rules, hit) => h('div', { class: 'stack g6' }, eyebrow(title, 'sm'), h('div', { class: 'tbl' }, h('table', null,
        h('thead', null, h('tr', null, ['#', 'Port', 'Source / dest', 'Action'].map(t => h('th', { text: t })))),
        h('tbody', null, rules.map(r => h('tr', { class: hit.includes(r) ? 'win' : null }, h('td', { class: 'mono', text: String(r.n) }), h('td', { class: 'mono', text: r.port[0] === 0 && r.port[1] === 65535 ? 'all' : r.port[0] === r.port[1] ? String(r.port[0]) : r.port[0] + '–' + r.port[1] }), h('td', { class: 'mono', text: r.cidr }), h('td', { text: r.act })))))));
      const shown = steps.slice(0, st.i + 1);
      const hits = shown.map(x => x.rule).filter(Boolean);
      box.appendChild(h('div', { class: 'grid g2' }, rt('NACL inbound', f.nin, hits), rt('NACL outbound', f.nout, hits)));
      box.appendChild(h('p', { class: 'small muted' }, md('Security group inbound: ' + f.sgin.map(([p, c]) => 'allow TCP ' + p + ' from ' + c).join('; ') + ' · outbound: allow all (default). Packet: ' + (f.dir === 'in' ? 'client ' + f.src + ':' + f.sport + ' → server :' + f.dport : 'instance :' + f.sport + ' → ' + f.dst + ':' + f.dport) + '.')));
      const list = h('div', { class: 'optlist' });
      shown.forEach((x, j) => list.appendChild(h('div', { class: 'opt ' + (x.ok ? 'correct' : 'wrong') },
        h('div', { class: 'otop' }, h('b', { class: 'okey', text: String(j + 1) }), h('span', { class: 'otxt' }, h('b', { text: x.where }), ' — ', md(x.text))),
        h('span', { class: 'why' }, (x.ok ? '✓ ' : '✕ dropped · ') + ruleText(x.rule)))));
      box.appendChild(list);
      const done = st.i >= steps.length - 1;
      const dropped = steps.some(x => !x.ok);
      box.appendChild(h('div', { class: 'row' },
        h('button', { class: 'btn ghost sm', type: 'button', disabled: st.i === 0, text: '← Back', on: { click: () => { st.i--; paint(); } } }),
        h('button', { class: 'btn sm', type: 'button', disabled: done, text: 'Next hop →', on: { click: () => { st.i++; paint(); } } }),
        done && f.fix ? h('button', { class: 'btn ghost sm', type: 'button', text: 'Apply the fix', on: { click: () => { st.f = f.fix; st.i = 0; paint(); } } }) : null));
      if (done) box.appendChild(h('div', { class: 'callout' }, eyebrow(dropped ? 'Dropped' : 'Delivered', 'sm'), h('span', null, md(f.lesson))));
    };
    paint();
    return box;
  };

  /* ================= Hybrid connectivity chooser + bandwidth chart ================= */
  const NEEDS = [[0.2, '200 Mbps'], [1, '1 Gbps'], [5, '5 Gbps'], [10, '10 Gbps'], [40, '40 Gbps'], [100, '100 Gbps']];
  const WHEN = [['days', 'in days'], ['weeks', 'in 2–3 weeks'], ['months', 'in 3+ months']];
  const fmtG = g => (g < 1 ? Math.round(g * 1000) + ' Mbps' : g + ' Gbps');
  function advise(st) {
    const out = { lines: [], pick: '' };
    const need = st.need;
    const dedicated = [1, 10, 100, 400].find(p => p >= need) || 400;
    const dxEnc = dedicated >= 10 ? 'enable **MACsec** on the ' + dedicated + ' Gbps dedicated port (at a location that supports it), or run a **VPN over DX**' : 'run a **Site-to-Site VPN over DX** (MACsec is not offered on 1 Gbps or hosted connections)';
    const vpnFits = need <= 1.25;
    if (st.when === 'days') {
      out.pick = 'Site-to-Site VPN now';
      out.lines.push('Dedicated Direct Connect takes **weeks to months**; only a VPN (or an existing partner port) is up in days.');
      if (!vpnFits) out.lines.push(fmtG(need) + ' exceeds one standard tunnel (1.25 Gbps). Terminate on a **transit gateway** and use **ECMP** across tunnels, or Large Bandwidth Tunnels (up to 5 Gbps each, TGW or Cloud WAN only).');
      if (st.consistent) out.lines.push('Consistent latency needs **Direct Connect**: order it now and move over when it is live (“VPN now, DX later”).');
    } else if (st.when === 'weeks') {
      if (!st.consistent && vpnFits) { out.pick = 'Site-to-Site VPN'; out.lines.push('Nothing asks for a private line, and ' + fmtG(need) + ' fits one tunnel. Cheapest and simplest.'); }
      else { out.pick = need <= 25 ? 'Hosted Direct Connect (partner) — VPN until it is live' : 'VPN now, dedicated Direct Connect later'; out.lines.push('A **hosted connection** from a partner that already reaches your site can be ready in days to weeks (50 Mbps – 25 Gbps). A net-new dedicated port usually takes longer.'); if (need > 25) out.lines.push(fmtG(need) + ' is above the largest hosted connection (25 Gbps): that needs dedicated ports, which will not be ready in weeks.'); }
    } else {
      if (!st.consistent && vpnFits && !st.big) { out.pick = 'Site-to-Site VPN (DX optional)'; out.lines.push('No consistency requirement and ' + fmtG(need) + ' fits a tunnel. Direct Connect pays off when volume or consistency demands it.'); }
      else if (need < 1) { out.pick = 'Hosted Direct Connect ' + fmtG([0.05, 0.1, 0.2, 0.3, 0.4, 0.5].find(v => v >= need) || 0.5); out.lines.push('Below 1 Gbps, hosted connections come in 50–500 Mbps steps from partners.'); }
      else { out.pick = 'Dedicated Direct Connect ' + dedicated + ' Gbps' + (need > 400 ? ' (several ports in a LAG)' : ''); out.lines.push('Consistent, private, ' + fmtG(need) + ': a dedicated port. Speeds are 1, 10, 100 and 400 Gbps.'); }
    }
    const usesDX = /Direct Connect/.test(out.pick);
    if (st.encrypt) out.lines.push(usesDX ? 'Encryption: Direct Connect does **not** encrypt by default — ' + dxEnc + '.' : 'Encryption: a VPN is IPsec, so it is already encrypted.');
    if (usesDX) out.lines.push('Resilience: one connection is one point of failure. Add a **VPN backup** (cheap) or a second connection at another location (maximum resiliency).');
    return out;
  }
  const BW = [
    { label: 'VPN · standard tunnel', lo: 0, hi: 1.25, line: 'vpn', tip: 'Up to 1.25 Gbps per tunnel; 2 tunnels per connection' },
    { label: 'VPN · large bandwidth tunnel', lo: 0, hi: 5, line: 'vpn', tip: 'Up to 5 Gbps per tunnel; TGW or Cloud WAN only' },
    { label: 'DX · hosted (partner)', lo: 0.05, hi: 25, line: 'dx', tip: '50 Mbps to 25 Gbps, ordered through a Direct Connect Partner' },
    { label: 'DX · dedicated ports', lo: 1, hi: 400, dots: [1, 10, 100, 400], line: 'dx', tip: 'Dedicated ports: 1, 10, 100, 400 Gbps' }
  ];
  W.hybridCalc = function (a, ctx) {
    const st = { need: 1, when: 'months', encrypt: false, consistent: true, big: false };
    const box = h('div', { class: 'card widget' });
    const LINES = (ctx && ctx.LINES) || {};
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Hybrid link chooser · VPN or Direct Connect'));
      box.appendChild(group('BANDWIDTH NEEDED', NEEDS.map(([v, t]) => chip(t, st.need === v, () => { st.need = v; paint(); }))));
      box.appendChild(group('LINK MUST BE LIVE', WHEN.map(([v, t]) => chip(t, st.when === v, () => { st.when = v; paint(); }))));
      box.appendChild(group('ALSO REQUIRED', [
        chip('consistent latency', st.consistent, () => { st.consistent = !st.consistent; paint(); }),
        chip('encrypted in transit', st.encrypt, () => { st.encrypt = !st.encrypt; paint(); })]));
      const adv = advise(st);
      box.appendChild(h('div', { class: 'callout' }, eyebrow('Recommendation', 'sm'), h('b', { style: { fontFamily: 'var(--f-display)', fontSize: '18px' }, text: adv.pick }), h('ul', { style: { margin: 0, paddingLeft: '20px' } }, adv.lines.map(x => h('li', null, md(x))))));
      box.appendChild(mountChart(w => {
        const narrow = w < 560;
        const rowH = narrow ? 50 : 34, top = 8, labW = narrow ? 0 : 230, R = 16, axisH = 24;
        const plotL = labW + 6, pw = w - plotL - R;
        const lo = Math.log10(0.03), hi = Math.log10(2500);
        const x = v => plotL + ((Math.log10(v) - lo) / (hi - lo)) * pw;
        const H = top + BW.length * rowH + axisH;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Maximum bandwidth of VPN tunnels and Direct Connect, log scale' });
        const grid = s('g', { class: 'grid' });
        [0.1, 1, 10, 100].forEach(t => grid.appendChild(s('line', { x1: x(t), x2: x(t), y1: top, y2: top + BW.length * rowH })));
        g.appendChild(grid);
        [[0.1, '100 Mbps'], [1, '1 Gbps'], [10, '10 Gbps'], [100, '100 Gbps']].forEach(([t, l]) => g.appendChild(s('text', { class: 'axis', x: x(t), y: H - 6, 'text-anchor': 'middle', text: l })));
        BW.forEach((b, i) => {
          const y0 = top + i * rowH;
          const by = narrow ? y0 + 24 : y0 + 9, bh = narrow ? 14 : rowH - 18;
          const meets = b.hi >= st.need;
          const L = LINES[b.line];
          const gg = s('g', { 'data-tip': b.label + ': ' + b.tip + (meets ? '' : ' — below the ' + fmtG(st.need) + ' you need') });
          gg.appendChild(s('rect', { x: 0, y: y0, width: w, height: rowH, fill: 'transparent' }));
          const lx = narrow ? plotL : 0, ly = narrow ? y0 + 14 : y0 + rowH / 2 + 4.5;
          if (L) gg.appendChild(s('line', { x1: lx + 2, x2: lx + 20, y1: ly - 4.5, y2: ly - 4.5, 'stroke-width': 6, 'stroke-linecap': 'butt', 'stroke-dasharray': L.dash ? '5 3' : null, style: 'stroke:' + (L.cls === 'ink' ? 'var(--ink)' : 'var(--' + L.cls + ')') }));
          gg.appendChild(s('text', { class: 'lab', x: lx + 28, y: ly, text: b.label }));
          const x1 = b.lo > 0 ? x(b.lo) : plotL;
          gg.appendChild(s('rect', { class: 'barr' + (meets ? '' : ' soft'), x: x1, y: by, width: Math.max(3, x(b.hi) - x1), height: bh, rx: 2, style: meets ? null : 'opacity:.45' }));
          (b.dots || []).forEach(d => gg.appendChild(s('circle', { cx: x(d), cy: by + bh / 2, r: 5, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:2' })));
          gg.appendChild(s('text', { class: 'val', x: x(b.hi) + 8, y: by + bh / 2 + 4, text: fmtG(b.hi) }));
          g.appendChild(gg);
        });
        const nx = x(st.need);
        g.appendChild(s('line', { x1: nx, x2: nx, y1: top - 4, y2: top + BW.length * rowH, 'stroke-dasharray': '4 3', style: 'stroke:var(--ink);stroke-width:2' }));
        return g;
      }, 'Log scale: each gridline is ten times the last. Bars show the most one link can carry; faded bars are below the dashed line (your need). Swatch + label give identity: dashed ink = VPN, magenta = Direct Connect; hover for the source limit.'));
    };
    paint();
    return box;
  };
})();
