/* Session 6 widgets: IAM policy evaluation simulator (explicit deny, SCP, RCP, identity / resource policy, permission
   boundary, session policy; same account vs cross-account; exempt principals), SCP inheritance tree (attach policies
   to root / OUs / accounts, pick an action, read the effective result per account), control timeline (preventive SCP vs
   proactive hook vs detective Config rule vs Config + SSM Automation remediation), consolidated-billing RI / Savings
   Plans sharing calculator (illustrative inputs the user sets). The "which service answers this?" sorter, the control
   and condition-key sorters, the identity / sharing choosers and the step-throughs use the generic engine widgets.
   Facts: docs/session-06-governance.md. */
(function () {
  'use strict';
  const { h, s, md, clear, eyebrow, mountChart } = SAA;
  const W = SAA.widgets;
  const chip = (label, on, click, cls, dis) => h('button', { class: 'chip' + (cls ? ' ' + cls : ''), type: 'button', 'aria-pressed': String(!!on), disabled: !!dis, text: label, on: { click } });
  const group = (label, kids) => h('div', { class: 'stubrow' }, h('span', { class: 'stublab', text: label }), h('div', { class: 'chiprow' }, kids));
  const verdict = (title, text, cls) => h('div', { class: 'callout' }, eyebrow(title, 'sm'), h('span', { class: cls || null }, md(text)));
  const stats = rows => h('div', { class: 'stats' }, rows.map(([a, b, strong]) => h('div', { class: 'stat', style: strong ? { borderColor: 'var(--ink)', borderWidth: '2px', padding: '9px 11px' } : null }, h('b', { text: a }), h('span', { text: b }))));
  const fmt2 = n => (Math.round(n * 100) / 100).toFixed(2);

  /* ================= Policy evaluation simulator ================= */
  const WHO = [['role', 'IAM role · member account'], ['root', 'root user · member account'], ['mgmt', 'IAM role · management account'], ['slr', 'service-linked role']];
  const OPTS = {
    scp: [['allow', 'allows it'], ['noallow', 'no Allow for it'], ['deny', 'Deny']],
    rcp: [['full', 'RCPFullAWSAccess only'], ['deny', 'Deny']],
    id: [['allow', 'Allow'], ['none', 'silent'], ['deny', 'Deny']],
    res: [['allow', 'Allow this principal'], ['none', 'none / silent'], ['deny', 'Deny']],
    pb: [['none', 'none set'], ['allow', 'includes it'], ['noallow', 'leaves it out']],
    sess: [['none', 'none passed'], ['allow', 'includes it'], ['noallow', 'leaves it out']]
  };
  const PRESETS = [
    { t: 'Admin in a member account, an SCP denies the action', st: { who: 'role', where: 'same', scp: 'deny', rcp: 'full', id: 'allow', res: 'none', pb: 'none', sess: 'none' } },
    { t: 'The root user of that member account tries it', st: { who: 'root', where: 'same', scp: 'deny', rcp: 'full', id: 'none', res: 'none', pb: 'none', sess: 'none' } },
    { t: 'Same SCP, but the role is in the management account', st: { who: 'mgmt', where: 'same', scp: 'deny', rcp: 'full', id: 'allow', res: 'none', pb: 'none', sess: 'none' } },
    { t: 'Identity policy allows, the permission boundary leaves it out', st: { who: 'role', where: 'same', scp: 'allow', rcp: 'full', id: 'allow', res: 'none', pb: 'noallow', sess: 'none' } },
    { t: 'Cross-account: the bucket policy allows, the role’s own policy is silent', st: { who: 'role', where: 'cross', scp: 'allow', rcp: 'full', id: 'none', res: 'allow', pb: 'none', sess: 'none' } },
    { t: 'Same account: the bucket policy names the role, the role’s policy is silent', st: { who: 'role', where: 'same', scp: 'allow', rcp: 'full', id: 'none', res: 'allow', pb: 'none', sess: 'none' } },
    { t: 'Both sides allow, but an RCP on the bucket’s account denies outsiders', st: { who: 'role', where: 'cross', scp: 'allow', rcp: 'deny', id: 'allow', res: 'allow', pb: 'none', sess: 'none' } }
  ];
  function evalPolicy(st) {
    const P = st.who, cross = st.where === 'cross';
    const scpOn = P === 'role' || P === 'root';
    const rcpOn = !(P === 'slr') && (cross || P !== 'mgmt');
    const idOn = P !== 'root';
    const pbOn = P === 'role' || P === 'mgmt';
    const G = [];
    const add = (k, label, state, why) => G.push({ k, label, state, why });
    const denies = [scpOn && st.scp === 'deny' && 'an SCP', rcpOn && st.rcp === 'deny' && 'an RCP', idOn && st.id === 'deny' && 'the identity policy', st.res === 'deny' && 'the resource policy'].filter(Boolean);
    let stopped = false;
    const step = (k, label, fn) => { if (stopped) { add(k, label, 'unreached', 'Not evaluated: the request already stopped earlier.'); return; } const r = fn(); add(k, label, r[0], r[1]); if (r[0] === 'fail') stopped = true; };
    step('deny', 'Explicit Deny?', () => denies.length ? ['fail', 'An explicit **Deny** in ' + denies.join(' and ') + '. A Deny anywhere ends evaluation; no Allow anywhere can override it.'] : ['pass', 'No Deny statement matches the request.']);
    step('scp', 'SCPs', () => !scpOn ? ['skip', P === 'mgmt' ? 'SCPs **never apply to the management account**, whatever is attached above it.' : 'SCPs **do not restrict service-linked roles**.'] : st.scp === 'noallow' ? ['fail', 'Implicit deny: no SCP on the path root → OU → account **allows** the action. SCPs set the ceiling for everyone in the account — the root user and admins included.'] : ['pass', 'An Allow for the action exists at every level (FullAWSAccess by default). This grants nothing by itself; it only leaves room.']);
    step('rcp', 'RCPs', () => !rcpOn ? ['skip', P === 'slr' ? 'RCPs do not restrict service-linked roles.' : 'The resource sits in the management account: RCPs do not apply there.'] : ['pass', 'RCPFullAWSAccess is attached and no RCP denies it. RCPs, like SCPs, can only restrict.']);
    step('allow', cross ? 'Identity AND resource Allow' : 'Identity OR resource Allow', () => {
      if (P === 'root') return ['pass', 'The root user needs no identity policy: it can do everything in its own account unless an SCP or a resource policy denies it.'];
      if (P === 'slr') return st.id === 'allow' || st.res === 'allow' ? ['pass', 'The service-linked role’s permissions policy (defined by the service) allows it.'] : ['fail', 'Nothing allows it: the default is an **implicit deny**.'];
      if (cross) {
        if (st.id === 'allow' && st.res === 'allow') return ['pass', 'Cross-account needs **both** sides: the role’s identity policy in its account and the resource policy in the resource’s account.'];
        return ['fail', 'Cross-account needs **both** an identity-policy Allow (trusting side) **and** a resource-policy Allow (owning side). Missing: ' + [st.id !== 'allow' && 'identity policy', st.res !== 'allow' && 'resource policy'].filter(Boolean).join(' and ') + '.'];
      }
      if (st.id === 'allow' && st.res === 'allow') return ['pass', 'Both the identity and the resource policy allow it (one would be enough in the same account).'];
      if (st.id === 'allow') return ['pass', 'The identity policy allows it; in the same account that is enough.'];
      if (st.res === 'allow') return ['pass', 'In the **same account**, a resource policy that names the principal is enough on its own: the union of identity and resource policies counts.'];
      return ['fail', 'No identity or resource policy allows it: **implicit deny** (the default for every request).'];
    });
    step('pb', 'Permission boundary', () => !pbOn ? ['skip', P === 'root' ? 'A permission boundary can only be set on IAM users and roles, not on the root user.' : 'Not used with service-linked roles.'] : st.pb === 'none' ? ['skip', 'No boundary set on this role.'] : st.pb === 'allow' ? ['pass', 'The boundary includes the action. It still grants nothing; it is a ceiling.'] : ['fail', 'The boundary is a **maximum**: the identity policy allows it, but the boundary leaves it out, so the effective permission is the intersection — nothing.']);
    step('sess', 'Session policy', () => !pbOn ? ['skip', 'Only for role sessions created with a session policy.'] : st.sess === 'none' ? ['skip', 'No session policy was passed with AssumeRole.'] : st.sess === 'allow' ? ['pass', 'The session policy includes the action.'] : ['fail', 'A session policy passed with AssumeRole can only **narrow** the role’s permissions; it leaves this action out.']);
    return { gates: G, ok: !stopped };
  }
  W.policyEval = function () {
    const st = Object.assign({}, PRESETS[0].st);
    let preset = null, guess = null;
    const box = h('div', { class: 'card widget' });
    const set = (k, v) => { st[k] = v; if (k === 'who' && v === 'root') st.where = 'same'; preset = null; guess = null; paint(); };
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Policy evaluation simulator'));
      box.appendChild(h('p', { class: 'small muted' }, md('One request, for example `s3:GetObject` on a bucket. Set every policy that touches it, or load a classic trap and **predict the result first**.')));
      box.appendChild(h('div', { class: 'stack g8' }, PRESETS.map((p, i) => chip(p.t, preset === i, () => { Object.assign(st, p.st); preset = i; guess = null; paint(); }, 'b'))));
      box.appendChild(group('WHO ASKS', WHO.map(([k, t]) => chip(t, st.who === k, () => set('who', k), 'b'))));
      box.appendChild(group('RESOURCE IN', [chip('the same account', st.where === 'same', () => set('where', 'same'), 'b'), chip('another account in the org', st.where === 'cross', () => set('where', 'cross'), 'b', st.who === 'root')]));
      box.appendChild(group('SCP ON THE PATH', OPTS.scp.map(([k, t]) => chip(t, st.scp === k, () => set('scp', k)))));
      box.appendChild(group('RCP', OPTS.rcp.map(([k, t]) => chip(t, st.rcp === k, () => set('rcp', k)))));
      box.appendChild(group('IDENTITY POLICY', OPTS.id.map(([k, t]) => chip(t, st.id === k, () => set('id', k), null, st.who === 'root'))));
      box.appendChild(group('RESOURCE POLICY', OPTS.res.map(([k, t]) => chip(t, st.res === k, () => set('res', k)))));
      box.appendChild(group('PERMISSION BOUNDARY', OPTS.pb.map(([k, t]) => chip(t, st.pb === k, () => set('pb', k), null, st.who === 'root' || st.who === 'slr'))));
      box.appendChild(group('SESSION POLICY', OPTS.sess.map(([k, t]) => chip(t, st.sess === k, () => set('sess', k), null, st.who === 'root' || st.who === 'slr'))));
      const r = evalPolicy(st);
      const hide = preset != null && guess == null;
      if (hide) {
        box.appendChild(verdict('Predict first', 'Allowed or denied? Decide, then tap.'));
        box.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn sm', type: 'button', text: 'Allowed', on: { click: () => { guess = true; paint(); } } }), h('button', { class: 'btn sm', type: 'button', text: 'Denied', on: { click: () => { guess = false; paint(); } } })));
        return;
      }
      box.appendChild(mountChart(w => {
        const narrow = w < 900, G = r.gates, n = G.length + 1;
        const glyph = { pass: '✓', fail: '✕', skip: 'n/a', unreached: '·' };
        let H, pos;
        if (narrow) { const bh = 38, gap = 14; H = n * bh + (n - 1) * gap + 8; pos = i => ({ x: 4, y: 4 + i * (bh + gap), w: w - 8, h: bh }); }
        else { const gap = 14, bw = (w - 8 - gap * (n - 1)) / n; H = 78; pos = i => ({ x: 4 + i * (bw + gap), y: 10, w: bw, h: 58 }); }
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Evaluation steps and the result' });
        const cells = G.concat([{ k: 'end', label: r.ok ? 'ALLOWED' : 'DENIED', state: 'end', why: r.ok ? 'Every gate passed: the request is allowed.' : 'The request is denied at the gate marked ✕.' }]);
        cells.forEach((c, i) => {
          const p = pos(i);
          if (i) {
            const q = pos(i - 1);
            if (narrow) g.appendChild(s('path', { d: `M${w / 2} ${q.y + q.h + 2} V${p.y - 2}`, style: 'stroke:var(--chip-border);stroke-width:2' }));
            else g.appendChild(s('path', { d: `M${q.x + q.w + 2} ${p.y + p.h / 2} H${p.x - 2}`, style: 'stroke:var(--chip-border);stroke-width:2' }));
          }
          const fill = c.state === 'fail' || c.state === 'end' ? 'var(--ink)' : 'var(--surface)';
          const txt = c.state === 'fail' || c.state === 'end' ? 'var(--surface)' : c.state === 'pass' ? 'var(--ink)' : 'var(--ink2)';
          const dashed = c.state === 'skip' || c.state === 'unreached';
          const gg = s('g', { 'data-tip': c.label + ': ' + c.why.replace(/\*\*/g, '') });
          gg.appendChild(s('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: 6, style: `fill:${fill};stroke:${dashed ? 'var(--chip-border)' : 'var(--ink)'};stroke-width:${dashed ? 1.5 : 2}` + (dashed ? ';stroke-dasharray:4 3' : '') }));
          if (narrow) {
            gg.appendChild(s('text', { class: 'lab', x: p.x + 12, y: p.y + p.h / 2 + 5, style: `font-weight:700;fill:${txt}`, text: c.label }));
            gg.appendChild(s('text', { class: 'val', x: p.x + p.w - 12, y: p.y + p.h / 2 + 5, 'text-anchor': 'end', style: `fill:${txt}`, text: c.state === 'end' ? (r.ok ? '✓' : '✕') : glyph[c.state] }));
          } else {
            const words = c.label.split(' ');
            const l1 = words.length > 2 ? words.slice(0, 2).join(' ') : c.label, l2 = words.length > 2 ? words.slice(2).join(' ') : '';
            gg.appendChild(s('text', { class: 'axis', x: p.x + p.w / 2, y: p.y + 20, 'text-anchor': 'middle', style: `fill:${txt};font-weight:600`, text: l1 }));
            if (l2) gg.appendChild(s('text', { class: 'axis', x: p.x + p.w / 2, y: p.y + 33, 'text-anchor': 'middle', style: `fill:${txt};font-weight:600`, text: l2 }));
            gg.appendChild(s('text', { class: 'lab', x: p.x + p.w / 2, y: p.y + 50, 'text-anchor': 'middle', style: `fill:${txt};font-weight:700`, text: c.state === 'end' ? (r.ok ? '✓' : '✕') : glyph[c.state] }));
          }
          g.appendChild(gg);
        });
        return g;
      }, 'Evaluated top to bottom. Solid = passes, filled = stops the request, dashed = does not apply or never reached. Hover a box for the reason.'));
      const stop = r.gates.find(x => x.state === 'fail');
      const SHORT = { deny: 'Deny', scp: 'SCP', rcp: 'RCP', allow: 'no Allow', pb: 'Boundary', sess: 'Session' };
      box.appendChild(stats([[r.ok ? 'ALLOWED' : 'DENIED', 'result', true], [stop ? SHORT[stop.k] : '—', 'where it stopped'], [st.where === 'cross' ? 'both' : 'either', 'identity / resource policy must allow']]));
      const head = preset != null ? (guess === r.ok ? '✓ Right. ' : '✕ Not quite. ') : '';
      box.appendChild(verdict(r.ok ? 'Allowed' : 'Denied', head + (stop ? stop.why : 'No Deny, every ceiling (SCP, RCP, boundary, session policy) leaves room, and a policy **grants** it.') + (st.who === 'root' && st.scp === 'deny' ? ' The root user of a **member** account is restricted by SCPs like everyone else there.' : ''), preset != null ? (guess === r.ok ? 'ok-t' : 'bad-t') : null));
    };
    paint();
    return box;
  };

  /* ================= SCP inheritance tree ================= */
  const NODES = [
    { id: 'root', name: 'Root', d: 0, kind: 'root' },
    { id: 'mgmt', name: 'Management account', d: 1, kind: 'acct', p: 'root' },
    { id: 'sec', name: 'Security OU', d: 1, kind: 'ou', p: 'root' },
    { id: 'log', name: 'Log Archive', d: 2, kind: 'acct', p: 'sec' },
    { id: 'audit', name: 'Audit', d: 2, kind: 'acct', p: 'sec' },
    { id: 'work', name: 'Workloads OU', d: 1, kind: 'ou', p: 'root' },
    { id: 'prod', name: 'Prod', d: 2, kind: 'acct', p: 'work' },
    { id: 'dev', name: 'Dev', d: 2, kind: 'acct', p: 'work' },
    { id: 'sand', name: 'Sandbox OU', d: 1, kind: 'ou', p: 'root' },
    { id: 'sbx', name: 'Sandbox', d: 2, kind: 'acct', p: 'sand' }
  ];
  const NODE = Object.fromEntries(NODES.map(n => [n.id, n]));
  const POL = {
    full: { t: 'FullAWSAccess', short: 'Full', allow: () => true },
    list: { t: 'Allow only EC2 + S3', short: 'EC2+S3', allow: a => a.svc === 'ec2' || a.svc === 's3' },
    region: { t: 'Deny outside eu-west-1', short: '¬Region', deny: a => a.region && a.region !== 'eu-west-1' },
    leave: { t: 'Deny LeaveOrganization', short: '¬Leave', deny: a => a.svc === 'organizations' }
  };
  const ACTIONS = [
    { id: 'ec2eu', t: 'Launch EC2 in eu-west-1', svc: 'ec2', region: 'eu-west-1' },
    { id: 'ec2us', t: 'Launch EC2 in us-east-1', svc: 'ec2', region: 'us-east-1' },
    { id: 'ddb', t: 'Create a DynamoDB table in eu-west-1', svc: 'dynamodb', region: 'eu-west-1' },
    { id: 'leave', t: 'Leave the organization', svc: 'organizations', region: null }
  ];
  const ATTACHABLE = ['root', 'sec', 'work', 'sand', 'prod', 'mgmt'];
  const DEFAULT_ATT = () => ({ root: ['full', 'leave'], mgmt: ['full'], sec: ['full'], log: ['full'], audit: ['full'], work: ['full', 'region'], prod: ['full'], dev: ['full'], sand: ['full'], sbx: ['full'] });
  function pathOf(id) { const p = []; let n = NODE[id]; while (n) { p.unshift(n.id); n = n.p ? NODE[n.p] : null; } return p; }
  function effective(att, acct, a) {
    if (acct === 'mgmt') return { ok: true, why: 'Management account: SCPs never restrict it, whatever is attached.' };
    for (const nid of pathOf(acct)) {
      const pols = att[nid] || [];
      const den = pols.find(k => POL[k].deny && POL[k].deny(a));
      if (den) return { ok: false, why: 'Denied by “' + POL[den].t + '” at ' + NODE[nid].name + '.' };
      if (!pols.some(k => POL[k].allow && POL[k].allow(a))) return { ok: false, why: 'Nothing attached at ' + NODE[nid].name + ' allows it — an Allow must exist at every level.' };
    }
    return { ok: true, why: 'Allowed at every level from Root down, and no Deny matches. (IAM must still grant it inside the account.)' };
  }
  W.scpTree = function () {
    let att = DEFAULT_ATT(), node = 'work', act = 'ec2us';
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('SCP inheritance tree'));
      box.appendChild(h('p', { class: 'small muted' }, md('Pick a node, attach or detach policies on it, then pick an action. Each account shows the **effective** result: an Allow is needed at **every** level from Root down, and one Deny anywhere on the path wins.')));
      box.appendChild(group('ACTION', ACTIONS.map(x => chip(x.t, act === x.id, () => { act = x.id; paint(); }, 'b'))));
      box.appendChild(group('ATTACH AT', ATTACHABLE.map(id => chip(NODE[id].name, node === id, () => { node = id; paint(); }, 'b'))));
      box.appendChild(group('POLICIES ON ' + NODE[node].name.toUpperCase(), Object.keys(POL).map(k => chip(POL[k].t, (att[node] || []).includes(k), () => {
        const cur = att[node] || [];
        att[node] = cur.includes(k) ? cur.filter(x => x !== k) : cur.concat([k]);
        paint();
      }, 'b'))));
      const A = ACTIONS.find(x => x.id === act);
      const res = {};
      NODES.filter(n => n.kind === 'acct').forEach(n => { res[n.id] = effective(att, n.id, A); });
      box.appendChild(mountChart(w => {
        const narrow = w < 560, rh = narrow ? 50 : 38, top = 6, ind = narrow ? 18 : 30;
        const H = top + NODES.length * rh + 4;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Organization tree with attached SCPs and effective results' });
        const Y = {}; NODES.forEach((n, i) => { Y[n.id] = top + i * rh; });
        NODES.forEach(n => {
          if (!n.p) return;
          const px = 10 + NODE[n.p].d * ind + 6, y = Y[n.id] + 14, py = Y[n.p] + 24;
          g.appendChild(s('path', { d: `M${px} ${py} V${y} H${10 + n.d * ind}`, fill: 'none', style: 'stroke:var(--chip-border);stroke-width:1.5' }));
        });
        NODES.forEach(n => {
          const x = 10 + n.d * ind, y = Y[n.id];
          const sel = n.id === node, isAcct = n.kind === 'acct';
          const r = res[n.id];
          const pols = att[n.id] || [];
          const tip = n.name + (pols.length ? ' · attached: ' + pols.map(k => POL[k].t).join(', ') : ' · nothing attached') + (isAcct ? ' → ' + (r.ok ? 'ALLOWED. ' : 'DENIED. ') + r.why : '');
          const gg = s('g', { 'data-tip': tip });
          gg.appendChild(s('rect', { x: 0, y, width: w, height: rh - 4, fill: 'transparent' }));
          if (isAcct) gg.appendChild(s('rect', { x, y: y + 6, width: 13, height: 13, rx: 2, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:2' }));
          else gg.appendChild(s('circle', { cx: x + 6.5, cy: y + 12.5, r: 7, style: 'fill:' + (n.kind === 'root' ? 'var(--ink)' : 'var(--surface)') + ';stroke:var(--ink);stroke-width:2' }));
          gg.appendChild(s('text', { class: 'lab', x: x + 20, y: y + 17, style: 'font-weight:' + (sel ? 800 : 600) + (sel ? ';text-decoration:underline' : ''), text: n.name }));
          const tags = pols.map(k => POL[k].short).join(' · ') || '— none —';
          const tx = narrow ? x + 20 : Math.min(w * 0.46, 260);
          gg.appendChild(s('text', { class: 'axis', x: tx, y: narrow ? y + 34 : y + 17, text: n.id === 'mgmt' ? tags + '  (ignored)' : tags }));
          if (isAcct) {
            gg.appendChild(s('rect', { x: w - (narrow ? 84 : 104), y: y + 3, width: narrow ? 80 : 100, height: 20, rx: 4, style: r.ok ? 'fill:var(--surface);stroke:var(--ink);stroke-width:1.5' : 'fill:var(--ink)' }));
            gg.appendChild(s('text', { class: 'val', x: w - (narrow ? 44 : 54), y: y + 17, 'text-anchor': 'middle', style: r.ok ? 'fill:var(--ink)' : 'fill:var(--surface)', text: r.ok ? '✓ allowed' : '✕ denied' }));
          }
          g.appendChild(gg);
        });
        return g;
      }, 'Circles = root and OUs, squares = accounts; the underlined node is the one you are editing. Filled result = denied. Hover a row for the reason.'));
      const acc = NODES.filter(n => n.kind === 'acct');
      box.appendChild(stats([[acc.filter(n => res[n.id].ok).length + ' / ' + acc.length, 'accounts where “' + A.t + '” is possible', true], [String(Object.values(att).reduce((a, b) => a + b.length, 0)), 'policy attachments']]));
      const notes = [];
      const noFull = ATTACHABLE.filter(id => id !== 'mgmt' && !(att[id] || []).length);
      if (noFull.length) notes.push('Nothing attached at **' + noFull.map(id => NODE[id].name).join(', ') + '**: every account below it can do **nothing** — not even an administrator. (AWS won’t let you detach the last SCP from a node; the tree lets you, to show why.)');
      if ((att.work || []).includes('list') && !(att.work || []).includes('full')) notes.push('**Allow-list strategy** on Workloads: FullAWSAccess replaced by an Allow for EC2 and S3 only, so DynamoDB is impossible there even though every IAM policy allows it.');
      if (act === 'leave') notes.push('“Deny LeaveOrganization” at the Root protects every member account at once. The management account is the organization; SCPs never apply to it.');
      if (act === 'ec2us' && (att.work || []).includes('region')) notes.push('The Region deny on Workloads stops Prod and Dev; Security and Sandbox accounts are not below it.');
      notes.push('The management account row always says allowed: SCPs **never** restrict the management account. Keep workloads out of it.');
      box.appendChild(verdict('Read it', notes.join(' ')));
      box.appendChild(h('div', null, h('button', { class: 'btn ghost sm', type: 'button', text: 'Reset attachments', on: { click: () => { att = DEFAULT_ATT(); node = 'work'; paint(); } } })));
    };
    paint();
    return box;
  };

  /* ================= Control timeline ================= */
  const CTRL = [
    ['none', 'No control'],
    ['scp', 'Preventive · SCP'],
    ['hook', 'Proactive · CloudFormation Hook'],
    ['config', 'Detective · Config rule'],
    ['auto', 'Detective + auto-remediation']
  ];
  const HOW = [['console', 'Console / CLI / API'], ['cfn', 'CloudFormation stack']];
  function timeline(c, how) {
    const R = [];
    const row = (t, exposed, text, mark) => R.push({ t, exposed, text, mark });
    const blockedScp = c === 'scp';
    const blockedHook = c === 'hook' && how === 'cfn';
    row('Request', false, how === 'cfn' ? 'A stack update sets Block Public Access **off** on a bucket.' : 'A developer turns Block Public Access **off** on a bucket (`PutPublicAccessBlock`).', 'CloudTrail');
    if (blockedScp) { row('Evaluated by IAM', false, '**AccessDenied**: an SCP denies `s3:PutPublicAccessBlock` for everyone except a break-glass role. The change never happens — whether it came from the console or from CloudFormation, which calls the same API with the same credentials.', 'blocked'); row('Afterwards', false, 'Nothing to fix. CloudTrail still records the denied call and who tried it.', ''); return { rows: R, exposed: false, outcome: 'prevented' }; }
    if (blockedHook) { row('Hook evaluates the template', false, 'The **proactive** control (a CloudFormation Hook) inspects the resource before provisioning and **fails the stack operation**. The bucket is never changed.', 'blocked'); row('Afterwards', false, 'Nothing to fix. Proactive controls only see changes made **through CloudFormation**.', ''); return { rows: R, exposed: false, outcome: 'prevented (CloudFormation only)' }; }
    row('Change applied', true, c === 'hook' ? 'The Hook never sees it: this change did not go through CloudFormation. The bucket can now be made public.' : 'The bucket can now be made public.', '');
    if (c === 'none' || c === 'hook') { row('Later', true, 'Nobody is told. CloudTrail has the API call (who, when, from where) — but only if someone looks. The exposure lasts **until someone notices**.', 'open'); return { rows: R, exposed: true, outcome: 'not caught' }; }
    row('Config records it', true, 'The configuration recorder writes a new **configuration item** for the bucket (continuous recording).', 'Config');
    row('Rule evaluates', true, 'The change-triggered managed rule flags the bucket **NONCOMPLIANT**; an EventBridge rule can notify the team.', 'finding');
    if (c === 'config') { row('Later', true, 'Config **detects and reports**; it does not undo the change. The bucket stays open until someone acts.', 'open'); return { rows: R, exposed: true, outcome: 'detected, not fixed' }; }
    row('Remediation', false, 'Automatic remediation runs an **SSM Automation** runbook that turns Block Public Access back on. Exposure lasted from the change until the runbook finished.', 'fixed');
    row('Re-evaluated', false, 'The rule evaluates again: **COMPLIANT**.', '');
    return { rows: R, exposed: 'window', outcome: 'detected and fixed' };
  }
  W.controlTimeline = function () {
    const st = { c: 'config', how: 'console' };
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Control timeline · prevent, check at deploy, detect, fix'));
      box.appendChild(h('p', { class: 'small muted' }, md('The same bad change — Block Public Access switched off on an S3 bucket — against each kind of control.')));
      box.appendChild(group('CONTROL', CTRL.map(([k, t]) => chip(t, st.c === k, () => { st.c = k; paint(); }, 'b'))));
      box.appendChild(group('CHANGE MADE WITH', HOW.map(([k, t]) => chip(t, st.how === k, () => { st.how = k; paint(); }, 'b'))));
      const T = timeline(st.c, st.how);
      box.appendChild(mountChart(w => {
        const narrow = w < 560, lw = narrow ? 104 : 190, rh = 30, top = 18;
        const H = top + T.rows.length * rh + 8;
        const g = s('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'img', 'aria-label': 'Timeline of the change and the control' });
        g.appendChild(s('text', { class: 'axis', x: lw, y: 11, text: 'bucket can be made public' }));
        g.appendChild(s('path', { d: `M${lw - 10} ${top} V${H - 6}`, style: 'stroke:var(--chip-border);stroke-width:1.5' }));
        T.rows.forEach((r, i) => {
          const y = top + i * rh;
          const gg = s('g', { 'data-tip': r.t + ': ' + r.text.replace(/\*\*|`/g, '') });
          gg.appendChild(s('rect', { x: 0, y, width: w, height: rh, fill: 'transparent' }));
          gg.appendChild(s('circle', { cx: lw - 10, cy: y + rh / 2, r: 5, style: 'fill:' + (r.mark === 'blocked' || r.mark === 'fixed' ? 'var(--ink)' : 'var(--surface)') + ';stroke:var(--ink);stroke-width:2' }));
          gg.appendChild(s('text', { class: 'lab', x: lw - 22, y: y + rh / 2 + 4.5, 'text-anchor': 'end', style: 'font-weight:700' + (narrow ? ';font-size:12px' : ''), text: narrow && r.t.length > 13 ? r.t.split(' ').slice(0, 2).join(' ') : r.t }));
          if (r.exposed) gg.appendChild(s('rect', { class: 'barr', x: lw + 2, y: y + 7, width: Math.max(10, (w - lw - 8) * (r.mark === 'open' ? 1 : 0.9)), height: rh - 14, rx: 2 }));
          else gg.appendChild(s('text', { class: 'axis', x: lw + 4, y: y + rh / 2 + 4, text: r.mark === 'blocked' ? '✕ blocked — never exposed' : r.mark === 'fixed' ? '✓ fixed' : i === 0 ? 'request sent' : '—' }));
          if (r.exposed && r.mark) gg.appendChild(s('text', { class: 'val', x: lw + 10, y: y + rh / 2 + 4, style: 'fill:var(--surface)', text: r.mark === 'open' ? 'still exposed →' : r.mark }));
          g.appendChild(gg);
        });
        return g;
      }, 'Ink bar = the bucket can be made public. Filled dot = the control acted. Hover a step for detail.'));
      const rows = T.rows;
      box.appendChild(h('ol', { class: 'small' }, rows.map(r => h('li', null, h('b', { text: r.t + ' — ' }), md(r.text)))));
      box.appendChild(stats([[T.outcome, 'outcome', true], [T.exposed === true ? 'until noticed' : T.exposed ? 'a short window' : 'never', 'bucket exposed'], ['always', 'CloudTrail records who called the API']]));
      const kind = { none: 'No guardrail: only the audit trail.', scp: '**Preventive** controls (SCPs, RCPs, declarative policies) stop the action for every path — console, CLI, SDK, CloudFormation.', hook: '**Proactive** controls check resources **before** CloudFormation provisions them. Changes made outside CloudFormation pass straight by.', config: '**Detective** controls (AWS Config rules) find non-compliant resources after the fact. They never block.', auto: '**Detective + remediation**: Config finds it, an SSM Automation runbook fixes it. Still a window of exposure — the exam answer when the question says “automatically remediate”.' }[st.c];
      box.appendChild(verdict('Which kind of control is this?', kind));
    };
    paint();
    return box;
  };

  /* ================= Consolidated billing: RI / Savings Plans sharing ================= */
  const ACCTS = [['A', 'A (buyer)', 4], ['B', 'B', 6], ['C', 'C', 2]];
  function billRun(commit, disc, mode) {
    const shareA = mode !== 'offA', shareOf = k => mode === 'on' || (mode === 'offB' ? k !== 'B' : mode === 'offA' ? k !== 'A' : true);
    let left = commit; const cov = {}, od = {};
    ACCTS.forEach(([k, , run]) => { cov[k] = 0; od[k] = run; });
    cov.A = Math.min(4, left); left -= cov.A; od.A = 4 - cov.A;
    ['B', 'C'].forEach(k => { if (shareA && shareOf(k) && left > 0) { const c = Math.min(od[k], left); cov[k] = c; od[k] -= c; left -= c; } });
    const fee = commit * (1 - disc), odCost = Object.values(od).reduce((a, b) => a + b, 0);
    return { cov, od, unused: left, fee, odCost, total: fee + odCost };
  }
  W.billingSim = function (a, ctx) {
    const st = { commit: 8, disc: 0.4, mode: 'on' };
    const LINES = (ctx && ctx.LINES) || {};
    const box = h('div', { class: 'card widget' });
    const paint = () => {
      clear(box);
      box.appendChild(eyebrow('Consolidated billing · RI and Savings Plans sharing'));
      box.appendChild(h('p', { class: 'small muted' }, md('Three accounts in one organization run 12 identical instances every hour: A runs 4, B runs 6, C runs 2. Account A bought a commitment (Reserved Instances or a Savings Plan). **All prices here are inputs you choose, in units where one on-demand instance-hour = 1.00** — not AWS prices.')));
      box.appendChild(group('COMMITMENT BOUGHT BY A', [4, 8, 12].map(v => chip(v + ' instances', st.commit === v, () => { st.commit = v; paint(); }))));
      box.appendChild(group('DISCOUNT VS ON-DEMAND (YOUR INPUT)', [0.3, 0.4, 0.6].map(v => chip(Math.round(v * 100) + '%', st.disc === v, () => { st.disc = v; paint(); }))));
      box.appendChild(group('DISCOUNT SHARING', [['on', 'on for all (default)'], ['offB', 'off for account B'], ['offA', 'off for account A']].map(([k, t]) => chip(t, st.mode === k, () => { st.mode = k; paint(); }, 'b'))));
      const r = billRun(st.commit, st.disc, st.mode);
      const none = 12;
      const modes = [['none', 'No commitment', none], ['on', 'Sharing on', billRun(st.commit, st.disc, 'on').total], ['offB', 'Off for B', billRun(st.commit, st.disc, 'offB').total], ['offA', 'Off for A', billRun(st.commit, st.disc, 'offA').total]];
      box.appendChild(SAA.hbars({ rows: modes.map(([k, lab, v]) => ({ label: lab + (k === st.mode ? ' ◂' : ''), line: LINES.billing, value: v, text: fmt2(v), soft: k === 'none', tip: lab + ': ' + fmt2(v) + ' per hour for the whole organization' + (k === 'none' ? ' (all 12 instances on demand)' : '') })), valW: 52, max: Math.max(12, ...modes.map(m => m[2])), title: 'Organization bill per hour by sharing setting', cap: 'The whole organization’s cost per hour (ink bars; grey = no commitment at all). ◂ = your current setting. Hover a row for detail.' }));
      box.appendChild(h('div', { class: 'tbl' }, h('table', null, h('thead', null, h('tr', null, h('th', { text: 'Account' }), h('th', { text: 'Runs' }), h('th', { text: 'Covered' }), h('th', { text: 'On demand' }))),
        h('tbody', null, ACCTS.map(([k, name, run]) => h('tr', null, h('td', { text: name }), h('td', { class: 'mono', text: String(run) }), h('td', { class: 'mono', text: String(r.cov[k]) }), h('td', { class: 'mono', text: String(r.od[k]) })))))));
      box.appendChild(stats([[fmt2(r.total), 'organization cost per hour', true], [String(r.unused), 'committed instances unused (paid anyway)'], [fmt2(none - r.total), 'saved vs all on demand']]));
      const notes = [];
      if (st.mode === 'on') notes.push(r.unused ? 'Even with sharing on, ' + r.unused + ' committed instance(s) find no usage anywhere: the commitment is bigger than the whole organization needs.' : 'Sharing on: A’s unused commitment flows to B and C automatically. This is the default in an organization and the reason consolidated billing saves money without any change to the accounts.');
      if (st.mode === 'offB') notes.push('Sharing off for B: B stops **receiving** discounts from other accounts, so its instances run on demand while A’s commitment may go unused.');
      if (st.mode === 'offA') notes.push('Sharing off for A, the buyer: its commitment only covers its own 4 instances; the rest is wasted.');
      if (st.commit === 4) notes.push('A commitment of 4 covers only A’s own usage, so sharing changes nothing here.');
      notes.push('Volume pricing works the same way: usage from all accounts is **added up** before price tiers apply.');
      box.appendChild(verdict('What happened', notes.join(' ')));
    };
    paint();
    return box;
  };
})();
