/* Session 5 widgets: envelope-encryption walk-through (KMS 4 KB limit, data keys), KMS key-type simulator,
   WAF web ACL simulator (priority order, rate-based rule over an evaluation window, actions; hbars chart +
   per-minute chart), security finding router with the detect-vs-protect matrix, Cognito user pool vs identity
   pool flow. The "which service answers this?" sorter, the secrets/S3-encryption choosers and the step-throughs
   use the generic engine widgets (sorter, chooser, stepper). Facts: docs/session-05-security.md. */
(function () {
  'use strict';
  const { h, s, md, clear, eyebrow, mountChart } = SAA;
  const W = SAA.widgets;
  const chip = (label, on, click, cls) => h('button', { class: 'chip' + (cls ? ' ' + cls : ''), type: 'button', 'aria-pressed': String(!!on), text: label, on: { click } });
  const group = (label, kids) => h('div', { class: 'stubrow' }, h('span', { class: 'stublab', text: label }), h('div', { class: 'chiprow' }, kids));
  const verdict = (title, text, cls) => h('div', { class: 'callout' }, eyebrow(title, 'sm'), h('span', { class: cls || null }, md(text)));
  const stats = rows => h('div', { class: 'stats' }, rows.map(([a, b, strong]) => h('div', { class: 'stat', style: strong ? { borderColor: 'var(--ink)', borderWidth: '2px', padding: '9px 11px' } : null }, h('b', { text: a }), h('span', { text: b }))));
  const navBtns = (i, n, set) => h('div', { class: 'row' },
    h('button', { class: 'btn ghost sm', type: 'button', disabled: i === 0, text: '← Back', on: { click: () => set(i - 1) } }),
    h('button', { class: 'btn sm', type: 'button', disabled: i >= n - 1, text: 'Next →', on: { click: () => set(i + 1) } }));
  const fmt = n => n.toLocaleString('en-US');

  /* ================= Envelope encryption ================= */
  const SIZES = [[1024, '1 KB'], [4096, '4 KB'], [65536, '64 KB'], [5 * 1024 ** 3, '5 GB']];
  const LIMIT = 4096;
  const ENV_STEPS = [
    { t: 'Ask KMS for a data key', x: 'The app calls **GenerateDataKey** with the KMS key ID. The key policy is checked and CloudTrail records the call. KMS returns **two copies of a fresh 256-bit data key**: one in plaintext, one encrypted under the KMS key.', arrow: 'a2k', show: ['dk', 'edk'] },
    { t: 'Encrypt the data locally', x: 'The app (or S3, EBS, RDS on your behalf) encrypts the data with the **plaintext data key** (AES-GCM). The data itself never goes to KMS, so its size does not matter.', arrow: 'none', show: ['dk', 'edk', 'ct'] },
    { t: 'Throw the plaintext data key away', x: 'Erase the plaintext data key from memory. What is left: **ciphertext** and the **encrypted data key**, neither of which is useful without KMS.', arrow: 'none', show: ['edk', 'ct'] },
    { t: 'Store them together', x: 'Store the encrypted data key **next to the ciphertext** — in the object’s metadata, the file header or the volume. This is the “envelope”: the data is wrapped by the data key, the data key by the KMS key.', arrow: 'a2s', show: ['edk', 'ct'] },
    { t: 'Read it back: decrypt the data key', x: 'To read, send only the **encrypted data key** to KMS **Decrypt**. Key policy checked again, CloudTrail entry again. KMS returns the plaintext data key. No permission on the KMS key = no data, wherever the ciphertext was copied.', arrow: 'k2a', show: ['edk', 'dk', 'ct'] },
    { t: 'Decrypt locally, erase the key', x: 'Decrypt the data in the app with the data key, then erase the key. The **KMS key never left KMS** in any step.', arrow: 'none', show: ['pt'] }
  ];
  const DIRECT_STEPS = [
    { t: 'Send the plaintext to KMS Encrypt', x: 'The app sends the data itself to **Encrypt**. KMS encrypts it under the KMS key and returns the ciphertext.', arrow: 'a2k', show: ['ct'] },
    { t: 'Store the ciphertext', x: 'Store the returned ciphertext. It already records which KMS key encrypted it.', arrow: 'a2s', show: ['ct'] },
    { t: 'Read it back', x: 'Send the ciphertext to **Decrypt**; the plaintext comes back over the network. Fine for small secrets — this is how Parameter Store standard SecureStrings work.', arrow: 'k2a', show: ['pt'] }
  ];
  W.envelope = function () {
    const st = { size: 5 * 1024 ** 3, mode: 'env', i: 0 };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Envelope encryption · KMS data keys'));
      box.appendChild(group('DATA SIZE', SIZES.map(([v, t]) => chip(t, st.size === v, () => { st.size = v; st.i = 0; paint(); }))));
      box.appendChild(group('HOW', [chip('call Encrypt directly', st.mode === 'direct', () => { st.mode = 'direct'; st.i = 0; paint(); }, 'b'), chip('envelope: GenerateDataKey', st.mode === 'env', () => { st.mode = 'env'; st.i = 0; paint(); }, 'b')]));
      const tooBig = st.mode === 'direct' && st.size > LIMIT;
      const steps = st.mode === 'env' ? ENV_STEPS : DIRECT_STEPS;
      const cur = tooBig ? { t: 'KMS rejects the request', x: 'Encrypt accepts at most **4,096 bytes** of plaintext. A ' + SIZES.find(z => z[0] === st.size)[1] + ' payload is refused before anything is encrypted. Switch to **envelope encryption**.', arrow: 'a2k', show: [], err: true } : steps[st.i];
      /* diagram */
      box.appendChild(mountChart(w => {
        const narrow = w < 520;
        const bw = narrow ? w - 8 : 180, bh = narrow ? 52 : 70;
        let A, K, St, H;
        if (narrow) { K = { x: 4, y: 4 }; A = { x: 4, y: 4 + bh + 64 }; St = { x: 4, y: A.y + bh + 64 }; H = St.y + bh + 44; }
        else { H = 210; A = { x: 4, y: 70 }; K = { x: w - bw - 4, y: 4 }; St = { x: w - bw - 4, y: H - bh - 4 }; }
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Application, KMS and storage with the current step' });
        const node = (p, title, subl, tip) => {
          const gg = s('g', { 'data-tip': tip });
          gg.appendChild(s('rect', { x: p.x, y: p.y, width: bw, height: bh, rx: 8, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:2' }));
          gg.appendChild(s('text', { class: 'lab', x: p.x + 10, y: p.y + (narrow ? 20 : 22), style: 'font-weight:700', text: title }));
          gg.appendChild(s('text', { class: 'axis', x: p.x + 10, y: p.y + (narrow ? 38 : 40), text: subl }));
          g.appendChild(gg);
        };
        const on = cur.arrow;
        const arrow = (id, x1, y1, x2, y2, label, lx, ly, anchor) => {
          const act = on === id;
          g.appendChild(s('line', { x1, y1, x2, y2, 'stroke-dasharray': act ? null : '4 4', style: 'stroke:' + (act ? 'var(--ink)' : 'var(--chip-border)') + ';stroke-width:' + (act ? 3.5 : 1.5) }));
          const ang = Math.atan2(y2 - y1, x2 - x1), hx = x2 - 10 * Math.cos(ang), hy = y2 - 10 * Math.sin(ang);
          g.appendChild(s('path', { d: `M${hx + 6 * Math.sin(ang)} ${hy - 6 * Math.cos(ang)} L${x2} ${y2} L${hx - 6 * Math.sin(ang)} ${hy + 6 * Math.cos(ang)} Z`, style: 'fill:' + (act ? 'var(--ink)' : 'var(--chip-border)') }));
          g.appendChild(s('text', { class: 'axis', x: lx, y: ly, 'text-anchor': anchor || 'middle', style: act ? 'fill:var(--ink);font-weight:600' : null, text: label }));
        };
        const L1 = st.mode === 'env' ? 'GenerateDataKey' : 'Encrypt(plaintext)', L2 = st.mode === 'env' ? 'Decrypt(encrypted key)' : 'Decrypt(ciphertext)';
        if (narrow) {
          const kb = K.y + bh, at = A.y;
          arrow('a2k', 30, at - 3, 30, kb + 3, L1, 40, kb + 24, 'start');
          arrow('k2a', w - 40, kb + 3, w - 40, at - 3, L2, w - 50, kb + 46, 'end');
          arrow('a2s', w / 2, A.y + bh + 3, w / 2, St.y - 3, st.mode === 'env' ? 'store both' : 'store', w / 2 + 8, A.y + bh + 36, 'start');
        } else {
          const ax = A.x + bw, amy = A.y + bh / 2;
          arrow('a2k', ax + 4, amy - 12, K.x - 4, K.y + bh / 2 + 4, L1, (ax + K.x) / 2, (amy + K.y + bh / 2) / 2 - 20);
          arrow('k2a', K.x - 4, K.y + bh / 2 + 18, ax + 4, amy + 2, L2, (ax + K.x) / 2 + 10, (amy + K.y + bh / 2) / 2 + 26);
          arrow('a2s', ax + 4, amy + 16, St.x - 4, St.y + bh / 2, 'store', (ax + St.x) / 2, (amy + St.y + bh / 2) / 2 + 22);
        }
        node(A, 'Your app / service', 'plaintext data', 'The application or the AWS service (S3, EBS, RDS) that holds the data.');
        node(K, 'AWS KMS', 'KMS key never leaves', 'The KMS key stays inside KMS HSMs. Every call is authorised by the key policy and logged in CloudTrail.');
        node(St, 'Storage', 'S3 · EBS · file', 'Where the ciphertext is kept — with the encrypted data key beside it in the envelope case.');
        /* tokens in the app box */
        const tokens = [['pt', 'data'], ['dk', 'key'], ['edk', 'enc key'], ['ct', 'cipher']];
        let tx = narrow ? St.x + 8 : A.x + 8;
        const ty = narrow ? St.y + bh + 12 : A.y + bh + 12;
        if (narrow && cur.show.length) { g.appendChild(s('text', { class: 'axis', x: tx, y: ty + 15, text: 'app holds:' })); tx += 76; }
        tokens.forEach(([k, lab]) => {
          if (!cur.show.includes(k)) return;
          const tw = lab.length * 7 + 14;
          const gg = s('g', { 'data-tip': { pt: 'Plaintext data, back in the app.', dk: 'Plaintext data key — only in memory, erased after use.', edk: 'Encrypted data key — safe to store; only KMS can decrypt it.', ct: 'Ciphertext of your data.' }[k] });
          gg.appendChild(s('rect', { x: tx, y: ty, width: tw, height: 22, rx: 4, style: k === 'dk' ? 'fill:var(--ink)' : 'fill:var(--surface);stroke:var(--ink);stroke-width:1.5' + (k === 'edk' ? ';stroke-dasharray:3 2' : '') }));
          gg.appendChild(s('text', { class: 'val', x: tx + 7, y: ty + 15, style: k === 'dk' ? 'fill:var(--surface)' : null, text: lab }));
          g.appendChild(gg);
          tx += tw + 6;
        });
        if (cur.err) g.appendChild(s('text', { class: 'lab', x: A.x + 8, y: ty + 16, style: 'font-weight:700', text: '✕ over 4,096 bytes' }));
        return g;
      }, 'Solid ink arrow = the call in this step; the small boxes are what the app holds right now (filled = plaintext data key, dashed = encrypted data key). Hover for details.'));
      box.appendChild(h('div', { class: 'stack g6' }, h('div', { class: 'mono small muted', text: tooBig ? 'Direct Encrypt · refused' : 'Step ' + (st.i + 1) + ' of ' + steps.length }), h('h3', { style: { fontSize: '19px' }, text: cur.t }), h('p', null, md(cur.x))));
      if (!tooBig) box.appendChild(navBtns(st.i, steps.length, v => { st.i = v; paint(); }));
      const bytes = st.mode === 'direct' ? (tooBig ? 0 : st.size) : 0;
      box.appendChild(stats([
        [st.mode === 'env' ? '2' : tooBig ? '1 ✕' : '2', 'KMS calls to write and read once'],
        [bytes ? SIZES.find(z => z[0] === st.size)[1] : '0 bytes', 'of your data sent to KMS', true],
        ['4,096 B', 'Encrypt plaintext limit']]));
      box.appendChild(verdict('Why it matters', st.mode === 'env'
        ? 'Envelope encryption is what S3 (SSE-KMS), EBS, RDS and the Encryption SDK do for you. KMS only ever sees small data keys, so **any size** works and the bulk crypto runs locally and fast. Exam trigger: “encrypt large files with KMS” → **GenerateDataKey**.'
        : tooBig ? 'This is the exam trap: **KMS Encrypt is for small payloads (≤ 4 KB)** such as a password or a data key. Anything bigger needs a data key.' : 'Direct Encrypt works for **small secrets up to 4 KB**, but every read and write sends the value over the network to KMS.'));
    };
    paint();
    return box;
  };

  /* ================= KMS key-type simulator ================= */
  const KT = [
    ['owned', 'AWS owned'], ['managed', 'AWS managed (aws/ebs)'], ['cmk', 'Customer managed'], ['imported', 'Customer managed · imported material'], ['mrk', 'Multi-Region key'], ['hsm', 'CloudHSM key store']
  ];
  const ACT = [['see', 'Visible in your account, use logged in CloudTrail'], ['policy', 'You edit the key policy'], ['auto', 'Automatic rotation'], ['ondemand', 'On-demand rotation'], ['share', 'Another account can use it (share an encrypted snapshot)'], ['del', 'You can schedule deletion'], ['region', 'Usable in another Region'], ['cost', 'Monthly key fee']];
  const Y = 'yes', N = 'no';
  const KV = {
    owned: { see: [N, 'lives in an AWS account, not yours; no CloudTrail entries for you'], policy: [N, 'AWS controls it'], auto: ['AWS', 'the owning service decides'], ondemand: [N, ''], share: [N, ''], del: [N, ''], region: [N, 'AWS-internal'], cost: ['free', 'no fee, no request charge'] },
    managed: { see: [Y, 'you can view the key and read its policy; CloudTrail logs use'], policy: [N, 'fixed by the service'], auto: [Y, '**every year**, cannot be changed'], ondemand: [N, ''], share: [N, 'only principals in the same account — snapshots encrypted with it cannot be shared'], del: [N, ''], region: [N, 'regional, like every KMS key'], cost: ['none', 'per-request charges only · a legacy type, no longer created for new services'] },
    cmk: { see: [Y, ''], policy: [Y, 'you own the policy; grants for temporary access'], auto: [Y, 'optional, **every 90–2,560 days** (default 365)'], ondemand: [Y, 'rotate now, whenever needed'], share: [Y, 'allow the other account in the key policy'], del: [Y, 'waiting period **7–30 days** (default 30), cancellable'], region: [N, 'regional — use a multi-Region key'], cost: ['$1/month', 'plus requests; the first two rotations add $1/month each'] },
    imported: { see: [Y, ''], policy: [Y, ''], auto: [N, 'imported key material cannot rotate automatically'], ondemand: [Y, 'since June 2025, with new imported material'], share: [Y, 'via the key policy'], del: [Y, 'and you can set the material to expire or delete it immediately'], region: [N, 'regional'], cost: ['$1/month', 'you also run the key-generation process'] },
    mrk: { see: [Y, ''], policy: [Y, 'each replica has its own policy'], auto: [Y, 'set on the primary; KMS copies the rotation status to the replicas'], ondemand: [Y, ''], share: [Y, 'via the key policy'], del: [Y, 'per key, 7–30 days'], region: [Y, '**same key ID and key material** in each Region; each replica is an independent regional key'], cost: ['$1/month', 'per key, replicas included'] },
    hsm: { see: [Y, ''], policy: [Y, 'it is still a KMS key with a key policy'], auto: [N, 'custom key store keys do not rotate automatically'], ondemand: [N, 'rotate manually'], share: [Y, 'via the key policy, like any customer managed key'], del: [Y, ''], region: [N, 'multi-Region keys are not allowed in custom key stores'], cost: ['$1/month', '+ the CloudHSM cluster you run (2+ HSMs)'] }
  };
  const KQ = [
    { q: 'Share an encrypted EBS snapshot with a partner account', ok: ['cmk', 'imported', 'mrk', 'hsm'], why: 'Any customer managed key can be shared through its key policy; **AWS managed keys cannot**.' },
    { q: 'Rotate automatically every 90 days, no code', ok: ['cmk', 'mrk'], why: 'Automatic rotation needs KMS-generated symmetric key material; the period is 90–2,560 days. Imported material and custom key stores do not rotate automatically.' },
    { q: 'Decrypt in eu-west-1 what was encrypted in us-east-1, with no cross-Region call', ok: ['mrk'], why: 'Only multi-Region keys share key material across Regions.' },
    { q: 'Key material must stay in HSMs only our team administers, but S3 and EBS still integrate', ok: ['hsm'], why: 'A KMS **custom key store backed by CloudHSM**: services call KMS, the material lives in your cluster.' },
    { q: 'Nothing to manage, no cost, no audit requirement', ok: ['owned'], why: 'AWS owned keys: invisible, free — and the default for many services.' }
  ];
  W.keySim = function () {
    const st = { t: 'cmk', q: null, pick: null };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('KMS key types · who can rotate, share, delete'));
      box.appendChild(group('KEY TYPE', KT.map(([k, t]) => chip(t, st.t === k, () => { st.t = k; if (st.q != null) st.pick = k; paint(); }, 'b'))));
      const v = KV[st.t];
      box.appendChild(h('div', { class: 'tbl' }, h('table', null,
        h('thead', null, h('tr', null, h('th', { text: 'Can you …' }), h('th', { text: KT.find(x => x[0] === st.t)[1] }))),
        h('tbody', null, ACT.map(([k, lab]) => h('tr', null, h('td', { text: lab }), h('td', null, h('b', { class: 'mono', text: v[k][0] + ' ' }), v[k][1] ? md('— ' + v[k][1]) : null)))))));
      box.appendChild(h('p', { class: 'small muted', text: 'Try a requirement: pick one, then pick the key type that makes it possible.' }));
      box.appendChild(h('div', { class: 'stack g8' }, KQ.map((x, i) => chip(x.q, st.q === i, () => { st.q = i; st.pick = null; paint(); }, 'b'))));
      if (st.q != null) {
        const x = KQ[st.q];
        if (st.pick == null) box.appendChild(verdict('Requirement', '“' + x.q + '” — now tap the key type above that does it.'));
        else {
          const ok = x.ok.includes(st.pick);
          box.appendChild(verdict(ok ? 'Yes' : 'Not this one', (ok ? '✓ ' : '✕ ') + x.why + (ok ? '' : ' Works with: ' + x.ok.map(k => KT.find(y => y[0] === k)[1]).join(', ') + '.'), ok ? 'ok-t' : 'bad-t'));
        }
      }
    };
    paint();
    return box;
  };

  /* ================= WAF web ACL simulator ================= */
  function lcg(seed) { let x = seed >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const SPAN = 600;
  function traffic() {
    const r = lcg(7), q = [];
    for (let i = 0; i < 60; i++) q.push({ t: r() * SPAN, ip: '203.0.113.10', src: 'office', path: '/', sqli: i === 30, geo: false });
    for (let u = 0; u < 20; u++) for (let i = 0; i < 15; i++) q.push({ t: r() * SPAN, ip: '198.51.100.' + (10 + u), src: 'users', path: r() < 0.12 ? '/login' : '/', sqli: false, geo: false });
    for (let i = 0; i < 1200; i++) q.push({ t: i * 0.5 + 0.25, ip: '192.0.2.66', src: 'bot', path: '/login', sqli: false, geo: false });
    for (let i = 0; i < 40; i++) q.push({ t: r() * SPAN, ip: '192.0.2.99', src: 'sqli', path: '/search', sqli: true, geo: false });
    for (let i = 0; i < 30; i++) q.push({ t: r() * SPAN, ip: '203.0.113.200', src: 'geo', path: '/', sqli: false, geo: true });
    return q.sort((a, b) => a.t - b.t);
  }
  const TRAFFIC = traffic();
  const SRC = { office: 'Office (allow-listed IP)', users: 'Customers (20 IPs)', bot: 'Credential-stuffing bot (1 IP)', sqli: 'SQL injection scanner', geo: 'Blocked-country visitor' };
  const RULES = { allow: 'Allow office IP set', geo: 'Geo block', sqli: 'SQLi managed rules', rate: 'Rate limit /login' };
  function wafRun(o) {
    const order = o.allowFirst ? ['allow', 'geo', 'sqli', 'rate'] : ['geo', 'sqli', 'rate', 'allow'];
    const hits = { allow: 0, geo: 0, sqli: 0, rate: 0, def: 0 }, per = {}, botMin = new Array(10).fill(0), botMinTot = new Array(10).fill(0);
    let counted = 0, captcha = 0;
    const seen = {}, flagged = {};
    let nextCheck = 10;
    const check = t => { for (const ip in seen) { const arr = seen[ip]; while (arr.length && arr[0] <= t - o.win) arr.shift(); flagged[ip] = arr.length > o.limit; } };
    for (const q of TRAFFIC) {
      while (nextCheck <= q.t) { check(nextCheck); nextCheck += 10; }
      let fate = null, by = 'def';
      for (const rule of order) {
        if (rule === 'allow' && q.ip === '203.0.113.10') { fate = 'allow'; by = 'allow'; break; }
        if (rule === 'geo' && q.geo) { fate = 'block'; by = 'geo'; break; }
        if (rule === 'sqli' && q.sqli) { fate = 'block'; by = 'sqli'; break; }
        if (rule === 'rate' && q.path === '/login') {
          (seen[q.ip] = seen[q.ip] || []).push(q.t);
          if (flagged[q.ip]) {
            if (o.act === 'count') { counted++; continue; }
            if (o.act === 'captcha') { captcha++; fate = q.src === 'bot' ? 'block' : 'allow'; by = 'rate'; break; }
            fate = 'block'; by = 'rate'; break;
          }
        }
      }
      if (!fate) { fate = o.def; by = 'def'; }
      hits[by]++;
      const p = per[q.src] = per[q.src] || { allow: 0, block: 0 };
      p[fate]++;
      if (q.src === 'bot') { const m = Math.min(9, Math.floor(q.t / 60)); botMinTot[m]++; if (fate === 'allow') botMin[m]++; }
    }
    return { hits, per, counted, captcha, botMin, botMinTot, order, officeSqli: TRAFFIC.find(x => x.src === 'office' && x.sqli) };
  }
  W.wafSim = function (a, ctx) {
    const st = { limit: 100, win: 300, act: 'block', allowFirst: true, def: 'allow' };
    const LINES = (ctx && ctx.LINES) || {};
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('WAF web ACL simulator'));
      box.appendChild(h('p', { class: 'small muted' }, md('Ten minutes of traffic to one ALB: ' + fmt(TRAFFIC.length) + ' requests. A bot tries 2 passwords a second on `/login`; a scanner sends SQL injection; the office runs a pentest with one SQLi request. Rules run **in priority order** and the first **terminating** match (Allow, Block, CAPTCHA) decides; **Count** only records and moves on.')));
      box.appendChild(group('RATE LIMIT PER IP (/login)', [10, 100, 500, 2000].map(v => chip(String(v), st.limit === v, () => { st.limit = v; paint(); }))));
      box.appendChild(group('EVALUATION WINDOW', [[60, '1 min'], [120, '2 min'], [300, '5 min'], [600, '10 min']].map(([v, t]) => chip(t, st.win === v, () => { st.win = v; paint(); }))));
      box.appendChild(group('RATE RULE ACTION', [['block', 'Block'], ['captcha', 'CAPTCHA'], ['count', 'Count']].map(([v, t]) => chip(t, st.act === v, () => { st.act = v; paint(); }))));
      box.appendChild(group('PRIORITY OF THE OFFICE ALLOW RULE', [chip('first (priority 0)', st.allowFirst, () => { st.allowFirst = true; paint(); }, 'b'), chip('last (after SQLi and rate)', !st.allowFirst, () => { st.allowFirst = false; paint(); }, 'b')]));
      box.appendChild(group('DEFAULT ACTION', [chip('Allow', st.def === 'allow', () => { st.def = 'allow'; paint(); }), chip('Block', st.def === 'block', () => { st.def = 'block'; paint(); })]));
      const r = wafRun(st);
      box.appendChild(h('div', { class: 'tbl' }, h('table', null, h('thead', null, h('tr', null, h('th', { text: 'Priority' }), h('th', { text: 'Rule' }), h('th', { text: 'Action' }))),
        h('tbody', null, r.order.map((k, i) => h('tr', null, h('td', { class: 'mono', text: String(i) }), h('td', { text: RULES[k] + (k === 'rate' ? ' · > ' + st.limit + ' / ' + st.win / 60 + ' min' : '') }), h('td', { class: 'mono', text: k === 'allow' ? 'Allow' : k === 'rate' ? { block: 'Block', captcha: 'CAPTCHA', count: 'Count' }[st.act] : 'Block' }))),
          h('tr', null, h('td', { class: 'mono', text: '—' }), h('td', { text: 'Default action' }), h('td', { class: 'mono', text: st.def === 'allow' ? 'Allow' : 'Block' }))))));
      const bot = r.per.bot || { allow: 0, block: 0 };
      const users = r.per.users || { allow: 0, block: 0 };
      box.appendChild(stats([
        [fmt(bot.allow), 'bot password guesses that reached the app', true],
        [fmt(users.allow) + ' / 300', 'customer requests allowed', true],
        [fmt(r.hits.rate), 'stopped by the rate rule' + (st.act === 'captcha' ? ' (CAPTCHA)' : '')],
        [fmt(r.counted), 'counted only (Count action)']]));
      const SHORT = { allow: 'Allow office', geo: 'Geo block', sqli: 'SQLi rules', rate: 'Rate limit', def: 'Default' };
      const lab = k => k === 'def' ? 'Default action' : RULES[k];
      const rows = r.order.concat(['def']).map(k => ({ label: SHORT[k], line: LINES.edge, value: r.hits[k], text: fmt(r.hits[k]), soft: k === 'def', tip: lab(k) + ': ' + fmt(r.hits[k]) + ' requests ended here' + (k === 'def' ? ' (' + st.def + ')' : k === 'allow' ? ' (allowed)' : k === 'rate' ? ' (' + st.act + ')' : ' (blocked)') }));
      box.appendChild(SAA.hbars({ rows, valW: 64, title: 'Requests by the rule that decided them', cap: 'Which rule terminated each request (ink bars; the grey bar is the default action). Swatch = WAF/Shield line. Hover a row for the action.' }));
      box.appendChild(mountChart(w => {
        const H = 128, L = 40, R = 8, top = 10, bot2 = 26, pw = w - L - R, ph = H - top - bot2;
        const max = 120;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Bot requests reaching the app per minute' });
        const grid = s('g', { class: 'grid' });
        [0, 60, 120].forEach(v => grid.appendChild(s('line', { x1: L, x2: L + pw, y1: top + ph - (v / max) * ph, y2: top + ph - (v / max) * ph })));
        g.appendChild(grid);
        [0, 60, 120].forEach(v => g.appendChild(s('text', { class: 'axis', x: L - 6, y: top + ph - (v / max) * ph + 4, 'text-anchor': 'end', text: String(v) })));
        const bw = pw / 10;
        r.botMin.forEach((n, i) => {
          const bh = (n / max) * ph;
          const gg = s('g', { 'data-tip': 'minute ' + i + '–' + (i + 1) + ': ' + n + ' of ' + r.botMinTot[i] + ' bot requests reached the app' });
          gg.appendChild(s('rect', { x: L + i * bw, y: top, width: bw, height: ph, fill: 'transparent' }));
          gg.appendChild(s('rect', { class: 'barr', x: L + i * bw + 3, y: top + ph - bh, width: Math.max(2, bw - 6), height: Math.max(n ? 2 : 0, bh), rx: 2 }));
          g.appendChild(gg);
        });
        (w < 480 ? [0, 5, 10] : [0, 2, 4, 6, 8, 10]).forEach(m => g.appendChild(s('text', { class: 'axis', x: L + (m / 10) * pw, y: H - 8, 'text-anchor': m === 0 ? 'start' : m === 10 ? 'end' : 'middle', text: m + ' min' })));
        return g;
      }, 'Bot requests that reached the app per minute (it sends 120). WAF checks the rate about every 10 seconds, so a few requests slip through after the limit is crossed — modelled here.'));
      const notes = [];
      if (st.act === 'count') notes.push('**Count** only labels and counts matches: all ' + fmt(bot.allow) + ' bot requests went through. Use Count to test a rule in production before switching it to Block.');
      else notes.push('The bot got **' + fmt(bot.allow) + '** guesses through: the limit (' + st.limit + ' per ' + st.win / 60 + ' min) plus about 10 s of detection. A lower limit or a shorter window stops it sooner' + (st.act === 'captcha' ? '; with **CAPTCHA** a human who trips the limit can still solve the puzzle and continue.' : '.'));
      if (users.allow < 300 && st.def === 'allow') notes.push('Watch out: ' + (300 - users.allow) + ' customer logins were caught — the limit is too tight for real users.');
      const off = r.per.office || { allow: 0, block: 0 };
      notes.push(st.allowFirst ? 'The office pentest request with SQL injection was **allowed**: Allow is terminating, so rules after it never saw it (' + off.allow + '/60 office requests allowed).' : 'Now the office’s SQL injection request was **blocked** by the SQLi rule, because it runs before the Allow rule: **priority order decides**.');
      if (st.def === 'block') notes.push('Default **Block**: every request no rule allowed is refused — ' + fmt(300 - users.allow) + ' customer requests blocked. An allow-list model needs Allow rules for real users.');
      box.appendChild(verdict('What happened', notes.join(' ')));
    };
    paint();
    return box;
  };

  /* ================= Security finding router + detect-vs-protect matrix ================= */
  const TOOLS = [['gd', 'GuardDuty'], ['insp', 'Inspector'], ['macie', 'Macie'], ['config', 'Config'], ['hub', 'Security Hub'], ['det', 'Detective']];
  const SIGNALS = [
    { t: 'An EC2 instance keeps resolving a domain used by a crypto-mining pool', a: 'gd', why: 'Threat from DNS and network activity — a GuardDuty finding.' },
    { t: 'A container image in ECR ships an OpenSSL version with a critical CVE', a: 'insp', why: 'Software vulnerability in an image — Inspector.' },
    { t: 'CSV exports with customers’ passport numbers sit in a bucket', a: 'macie', why: 'Sensitive data inside S3 objects — Macie.' },
    { t: 'What did this security group look like last Tuesday, and what changed since?', a: 'config', why: 'Configuration history and change timeline — AWS Config (Session 11).' },
    { t: 'One prioritised list of findings from 30 accounts, scored against CIS', a: 'hub', why: 'Aggregation and standards checks — Security Hub (CSPM).' },
    { t: 'Trace everything a leaked access key did over the last three weeks', a: 'det', why: 'Root cause and scope of an incident — Detective.' },
    { t: 'The root user signed in from a country the company never operates in', a: 'gd', why: 'Anomalous account activity from CloudTrail — GuardDuty.' },
    { t: 'An instance is reachable from the internet on port 22 and runs a vulnerable package', a: 'insp', why: 'Network reachability plus a CVE — Inspector.' }
  ];
  const MATRIX = [
    ['WAF', 'blocks', 'HTTP requests at CloudFront, ALB, API GW …', 'edge'], ['Shield', 'absorbs', 'DDoS on edge and EIPs', 'edge'], ['Network Firewall', 'blocks + alerts', 'traffic crossing VPC boundaries', 'nfw'], ['KMS', 'prevents reading', 'data at rest (encryption)', 'kms'],
    ['GuardDuty', 'detects', 'threats in CloudTrail, flow logs, DNS', 'gd'], ['Inspector', 'detects', 'CVEs and exposure in EC2, ECR, Lambda', 'insp'], ['Macie', 'detects', 'sensitive data in S3', 'macie'],
    ['Config', 'records + evaluates', 'resource configuration over time', 'config'], ['Security Hub', 'aggregates + scores', 'findings and standards across accounts', 'hub'], ['Detective', 'investigates', 'root cause, behaviour graph', 'det']
  ];
  W.findingRouter = function () {
    let pick = {}, focus = null;
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      const n = Object.keys(pick).length, right = SIGNALS.filter((x, i) => pick[i] === x.a).length;
      box.appendChild(h('div', { class: 'row between base' }, eyebrow('Security finding router'), n ? h('span', { class: 'mono small', text: right + ' / ' + n + ' routed right' }) : null));
      box.appendChild(h('p', { class: 'small muted', text: 'Each signal has one tool built to produce or handle it. Route it; the matrix below highlights what that tool does.' }));
      SIGNALS.forEach((x, i) => {
        const done = pick[i] != null, ok = pick[i] === x.a;
        box.appendChild(h('div', { class: 'sortrow' + (done ? (ok ? ' correct' : ' wrong') : '') },
          h('span', null, md('“' + x.t + '”')),
          h('div', { class: 'chiprow' }, TOOLS.map(([k, t]) => h('button', { class: 'chip b', type: 'button', 'aria-pressed': String(pick[i] === k), disabled: done, text: t, on: { click: () => { pick[i] = k; focus = k; paint(); } } }))),
          done ? h('span', { class: 'why' }, md((ok ? '✓ ' : '✕ ' + TOOLS.find(t => t[0] === x.a)[1] + ' — ') + x.why)) : null));
      });
      box.appendChild(h('div', null, h('button', { class: 'btn ghost sm', type: 'button', disabled: !n, text: 'Start over', on: { click: () => { pick = {}; focus = null; paint(); } } })));
      box.appendChild(eyebrow('Detect vs protect', 'sm'));
      box.appendChild(h('div', { class: 'tbl' }, h('table', null, h('thead', null, h('tr', null, h('th', { text: 'Service' }), h('th', { text: 'Verb' }), h('th', { text: 'Works on' }))),
        h('tbody', null, MATRIX.map(([name, verb, on, k]) => h('tr', { class: null, style: focus === k ? { outline: '2px solid var(--ink)', outlineOffset: '-2px' } : null },
          h('td', { class: 'k', text: name }), h('td', null, h('b', { class: 'mono', text: verb })), h('td', { text: on })))))));
      box.appendChild(h('p', { class: 'small muted' }, md('Only the top four **stop** anything. The detectors raise findings; turning a finding into a block is your EventBridge rule, Lambda function or Systems Manager runbook.')));
    };
    paint();
    return box;
  };

  /* ================= Cognito flow ================= */
  const ACTORS = [['app', 'App'], ['up', 'User pool'], ['ip', 'Identity pool'], ['sts', 'STS'], ['front', 'API GW / ALB'], ['aws', 'S3 · backend']];
  const FLOWS = {
    api: { t: 'Sign in, call your API', uses: ['app', 'up', 'front', 'aws'], steps: [
      ['app', 'up', 'Sign in', 'The user signs in on the **managed login** page (or your own UI) with email and password, a passkey, or Google/Apple/SAML. MFA if enabled.'],
      ['up', 'app', 'Tokens', 'The user pool returns an **ID token** and an **access token** (JWTs) and a refresh token.'],
      ['app', 'front', 'Call with JWT', 'The app calls API Gateway with the token in the Authorization header.'],
      ['front', 'aws', 'Validated', 'A **Cognito user pool authorizer** (REST API) or **JWT authorizer** (HTTP API) validates the token; the backend runs. No AWS credentials were ever issued to the app.']] },
    s3: { t: 'Upload straight to S3', uses: ['app', 'up', 'ip', 'sts', 'aws'], steps: [
      ['app', 'up', 'Sign in', 'The user signs in to the **user pool** (email or Google federation).'],
      ['up', 'app', 'Tokens', 'The app receives the user pool’s JWTs.'],
      ['app', 'ip', 'Token → identity pool', 'The app hands the ID token to the **identity pool**, which maps it to the **authenticated IAM role**.'],
      ['ip', 'sts', 'AssumeRoleWithWebIdentity', 'The identity pool gets **temporary credentials** for that role from STS.'],
      ['sts', 'app', 'Temporary credentials', 'The app now holds short-lived AWS credentials — no IAM user, no stored keys.'],
      ['app', 'aws', 'PutObject', 'The app uploads to S3 directly. The role’s policy can use the identity ID to allow only the user’s own prefix.']] },
    guest: { t: 'Guests browse, no account', uses: ['app', 'ip', 'sts', 'aws'], steps: [
      ['app', 'ip', 'Ask as guest', 'The app asks the **identity pool** for credentials without any login.'],
      ['ip', 'sts', 'Unauthenticated role', 'Guest access uses the **unauthenticated (guest) role** — keep it read-only and narrow.'],
      ['sts', 'app', 'Temporary credentials', 'Short-lived credentials for the guest role.'],
      ['app', 'aws', 'Read catalogue', 'The app reads, for example, a public product catalogue from DynamoDB or S3. No user pool involved at all.']] },
    alb: { t: 'Protect a web app on an ALB', uses: ['app', 'front', 'up', 'aws'], steps: [
      ['app', 'front', 'Request', 'A browser requests the app on the ALB’s **HTTPS listener** (authentication actions need HTTPS).'],
      ['front', 'up', 'authenticate-cognito', 'A listener rule with the **authenticate-cognito** action redirects an unauthenticated user to the user pool’s login page.'],
      ['up', 'front', 'Tokens to the ALB', 'After sign-in the ALB receives the tokens and sets a session cookie (7 days by default).'],
      ['front', 'aws', 'Forward with claims', 'The ALB forwards the request to the targets with the user’s claims in headers. The app itself needs no login code.']] }
  };
  W.cognitoFlow = function () {
    const st = { f: 's3', i: 0 };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Cognito · user pool vs identity pool'));
      box.appendChild(group('GOAL', Object.keys(FLOWS).map(k => chip(FLOWS[k].t, st.f === k, () => { st.f = k; st.i = 0; paint(); }, 'b'))));
      const F = FLOWS[st.f], step = F.steps[st.i];
      box.appendChild(mountChart(w => {
        const narrow = w < 560, n = ACTORS.length;
        const cols = narrow ? 3 : 6, rowsN = Math.ceil(n / cols), cw = (w - 8) / cols, bh = 46, gapY = narrow ? 50 : 0;
        const H = rowsN * bh + (rowsN - 1) * gapY + 40;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Actors in this Cognito flow' });
        const pos = {};
        ACTORS.forEach(([k], j) => { const c = j % cols, r = Math.floor(j / cols); pos[k] = { x: 4 + c * cw + 4, y: 4 + r * (bh + gapY), w: cw - 8 }; });
        /* arrow for the current step */
        const A = pos[step[0]], B = pos[step[1]];
        const ax = A.x + A.w / 2, ay = A.y + bh / 2, bx = B.x + B.w / 2, by = B.y + bh / 2;
        ACTORS.forEach(([k, lab]) => {
          const p = pos[k], used = F.uses.includes(k), act = k === step[0] || k === step[1];
          const gg = s('g', { 'data-tip': lab + (used ? ' — part of this flow' : ' — not used in this flow') });
          gg.appendChild(s('rect', { x: p.x, y: p.y, width: p.w, height: bh, rx: 8, style: 'fill:' + (act ? 'var(--ink)' : 'var(--surface)') + ';stroke:' + (used ? 'var(--ink)' : 'var(--chip-border)') + ';stroke-width:' + (used ? 2 : 1) + (used ? '' : ';stroke-dasharray:4 3') }));
          gg.appendChild(s('text', { class: 'lab', x: p.x + p.w / 2, y: p.y + bh / 2 + 4.5, 'text-anchor': 'middle', style: 'font-weight:700;fill:' + (act ? 'var(--surface)' : used ? 'var(--ink)' : 'var(--ink2)') + (narrow ? ';font-size:12px' : ''), text: lab }));
          g.appendChild(gg);
        });
        const sameRow = Math.abs(ay - by) < 1;
        const y1 = sameRow ? ay + bh / 2 + 2 : ay + (by > ay ? bh / 2 : -bh / 2), y2 = sameRow ? by + bh / 2 + 2 : by + (by > ay ? -bh / 2 : bh / 2);
        const head = (x, y, ang) => g.appendChild(s('path', { d: `M${x - 9 * Math.cos(ang) + 5 * Math.sin(ang)} ${y - 9 * Math.sin(ang) - 5 * Math.cos(ang)} L${x} ${y} L${x - 9 * Math.cos(ang) - 5 * Math.sin(ang)} ${y - 9 * Math.sin(ang) + 5 * Math.cos(ang)} Z`, style: 'fill:var(--ink)' }));
        if (sameRow) {
          g.appendChild(s('path', { d: `M${ax} ${y1} C${ax} ${y1 + 28} ${bx} ${y1 + 28} ${bx} ${y2 + 1}`, fill: 'none', style: 'stroke:var(--ink);stroke-width:3' }));
          head(bx, y2, -Math.PI / 2);
        } else {
          g.appendChild(s('line', { x1: ax, y1, x2: bx, y2, style: 'stroke:var(--ink);stroke-width:3' }));
          head(bx, y2, Math.atan2(y2 - y1, bx - ax));
        }
        return g;
      }, 'Filled = the two parties in this step; solid border = part of this flow; dashed = not involved. Hover for details.'));
      box.appendChild(h('div', { class: 'stack g6' }, h('div', { class: 'mono small muted', text: 'Step ' + (st.i + 1) + ' of ' + F.steps.length + ' · ' + ACTORS.find(x => x[0] === step[0])[1] + ' → ' + ACTORS.find(x => x[0] === step[1])[1] }), h('h3', { style: { fontSize: '19px' }, text: step[2] }), h('p', null, md(step[3]))));
      box.appendChild(navBtns(st.i, F.steps.length, v => { st.i = v; paint(); }));
      const usesUp = F.uses.includes('up'), usesIp = F.uses.includes('ip');
      box.appendChild(verdict('Which pool?', usesUp && usesIp ? '**Both**: the user pool answers “who is this user?”, the identity pool turns that into “AWS credentials”.' : usesUp ? '**User pool only**: tokens (JWT) are enough because an AWS front door (API Gateway or ALB) checks them. No AWS credentials reach the app.' : '**Identity pool only**: no sign-in, just temporary credentials for the guest role.'));
    };
    paint();
    return box;
  };
})();
