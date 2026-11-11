/* Bite lint: the feed's own content (bites/NN-name.js -> window.SAA_BITES).
   Used by drills-lint.js (lint) and options.js (questions, balance); no browser.
   node bites.js --selftest   proves every rule fires on a deliberately broken bite. Exit 1 on failure. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const REPO = path.join(__dirname, '..', '..');
const SESS = path.join(REPO, 'sessions'), BITES = path.join(REPO, 'bites'), DOCS = path.join(REPO, 'docs');

/* one session's data files in a vm, as the session lints load them */
function loadSession(dir) {
  const win = { SESSION: {} };
  const SAA = new Proxy({ widgets: {} }, { get: (t, k) => (k in t ? t[k] : () => ({})) });
  const ctx = vm.createContext({ window: win, SAA, document: {}, console });
  for (const f of ['core.js', 'drills.js', 'cards.js', 'learn.js']) {
    const p = path.join(SESS, dir, f);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
  }
  return win.SESSION;
}
function loadManifest() {
  const win = {};
  vm.runInContext(fs.readFileSync(path.join(SESS, 'manifest.js'), 'utf8'), vm.createContext({ window: win }), { filename: 'manifest.js' });
  return win.SAA_SESSIONS || [];
}
const read = p => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
const packFiles = () => (fs.existsSync(BITES) ? fs.readdirSync(BITES).filter(f => /^\d\d-[\w-]+\.js$/.test(f)).sort() : []);
function loadPacks(only) {
  return packFiles().filter(f => !only || !only.length || only.includes(f.slice(0, -3))).map(f => {
    const win = {};
    let bites = [], error = null;
    try { vm.runInContext(fs.readFileSync(path.join(BITES, f), 'utf8'), vm.createContext({ window: win }), { filename: f }); bites = win.SAA_BITES || []; }
    catch (e) { error = e.message; }
    return { pack: f.slice(0, -3), bites, error };
  });
}

/* the text sources a bite's numbers may come from */
const NUM = /(?<![\w.])\d+(?:[.,]\d+)*/g;
const nums = t => String(t || '').match(NUM) || [];
function context6(text) {
  const m = text.split(/^## /m).find(s => /^6\./.test(s));
  return m || '';
}
/* "New facts" table of docs/feed-bites.md: rows | biteId | fact | url | */
function newFacts(text) {
  const out = {};
  const sec = text.split(/^## /m).find(s => /^New facts/i.test(s)) || '';
  sec.split('\n').forEach(l => {
    const c = l.split('|').map(x => x.trim());
    if (c.length >= 4 && /^[a-z0-9-]+$/.test(c[1]) && /^https:\/\//.test(c[3] || '')) (out[c[1]] = out[c[1]] || []).push(c[2]);
  });
  return out;
}
function realEnv() {
  const manifest = loadManifest();
  const learn = {}, docs = {};
  manifest.filter(sx => !sx.soon).forEach(sx => {
    try { learn[sx.id] = loadSession(sx.id).learn || []; } catch (e) { learn[sx.id] = []; }
    docs[sx.id] = fs.readdirSync(DOCS).filter(f => f.startsWith('session-' + sx.id.slice(0, 2) + '-') && f.endsWith('.md')).map(f => read(path.join(DOCS, f))).join('\n');
  });
  const tags = Array.from(read(path.join(REPO, 'index.html')).matchAll(/<script\s+src="bites\/([^"]+)\.js"/g)).map(m => m[1]);
  return { manifest, learn, docs, ctx6: context6(read(path.join(DOCS, 'CONTEXT.md'))), facts: newFacts(read(path.join(DOCS, 'feed-bites.md'))), files: packFiles().map(f => f.slice(0, -3)), tags };
}

/* ================= rules ================= */
const DOMS = ['D1', 'D2', 'D3', 'D4'];
const letterRef = /\b(option|options|answer)\s+[A-E]\b|(^|[\s(“"])[A-E] (keeps|breaks|is|fails|loses|violates|misses|needs|adds|uses|would)\b|\b[A-E] and [A-E]\b/;
const BADMARK = [[/\{[\w-]+\|[^}]*\}/, '{line|Service}'], [/\[\[/, '[[link]]'], [/==/, '==highlight==']];
const WATCH = [/\bSnow(?:ball|mobile| Family)?\b/, /FSx File Gateway/, /Migration Hub/, /Application Discovery Service/, /\bQLDB\b/, /Timestream for LiveAnalytics/,
  /\bOAI\b|origin access identity/i, /Kinesis Data Firehose/, /Kinesis Data Analytics/, /Inspector Classic/, /Simple AD/, /Data Pipeline/, /\bAWS SSO\b/, /Audit Manager/, /\bDC2\b/,
  /App Runner/, /launch configuration/i, /Classic Load Balancer/, /Spot Fleet/, /Spot block/i,
  /CloudTrail Lake/, /Performance Insights/, /Incident Manager/, /Change Manager/, /Evidently/, /X-Ray (SDK|daemon)/i];
const plain = t => String(t).replace(/\*\*|`|==/g, '').replace(/\{[\w-]+\|([^}]+)\}/g, '$1');
const words = t => plain(t).split(/\s+/).filter(Boolean).length;
const strings = b => {
  const out = [];
  const walk = (v, k) => { if (typeof v === 'string') out.push([k, v]); else if (Array.isArray(v)) v.forEach(x => walk(x, k)); else if (v && typeof v === 'object') Object.keys(v).forEach(kk => walk(v[kk], kk)); };
  walk(b, '');
  return out;
};
const MIN_PER_SESSION = 4, MIN_PER_DOMAIN = 6;

/* option balance for bites: every option within 20% of the mean (8 characters of slack for short options) */
function balance(opts) {
  const L = opts.map(o => plain(o.t).length);
  const mean = L.reduce((a, b) => a + b, 0) / L.length;
  const lim = Math.max(mean * 0.2, 8);
  const off = L.filter(x => Math.abs(x - mean) > lim);
  return off.length ? ['option length outside 20% of the mean ' + Math.round(mean) + ' (' + L.join(', ') + ')'] : [];
}

/* packs: [{pack, bites, error}]; env as realEnv(); coverage: apply the minimums */
function lintPacks(packs, env, coverage) {
  const errs = [];
  const E = (pack, id, rule, msg) => errs.push({ pack, id, rule, msg });
  const live = new Set(env.manifest.filter(sx => !sx.soon).map(sx => sx.id));
  const seen = new Set();
  packs.forEach(({ pack, bites, error }) => {
    if (error) return E(pack, 'load', 'structure', error);
    if (!Array.isArray(bites)) return E(pack, 'load', 'structure', 'window.SAA_BITES is not an array');
    bites.forEach((b, bi) => {
      const id = b && typeof b.id === 'string' ? b.id : '#' + bi;
      const S = (rule, msg) => E(pack, id, rule, msg);
      if (!b || typeof b !== 'object') return S('structure', 'not an object');
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.id || '')) S('structure', 'id must be kebab-case');
      if (seen.has(b.id)) S('structure', 'duplicate bite id across packs'); seen.add(b.id);
      if (b.sid !== pack) S('structure', 'sid ' + b.sid + ' is not the file name ' + pack);
      if (!live.has(b.sid)) S('structure', 'sid ' + b.sid + ' is not a written manifest session');
      ['title', 'text'].forEach(k => { if (typeof b[k] !== 'string' || !b[k].trim()) S('structure', k + ' missing'); });
      if (b.update != null && (typeof b.update !== 'string' || !b.update.trim())) S('structure', 'update must be a non-empty string');
      if (!Array.isArray(b.domains) || b.domains.length < 1 || b.domains.length > 2 || b.domains.some(d => !DOMS.includes(d)) || new Set(b.domains).size !== b.domains.length) S('structure', 'domains must be 1-2 of D1..D4');
      if (!Array.isArray(b.src) || !b.src.length) S('structure', 'src missing');
      if (!Array.isArray(b.qs) || b.qs.length < 3 || b.qs.length > 5) S('structure', 'needs 3 to 5 questions');
      const qs = Array.isArray(b.qs) ? b.qs : [];
      const qids = new Set();
      let multi = 0;
      qs.forEach((q, qi) => {
        const qid = q && q.id ? q.id : '#' + qi, Q = (rule, msg) => S(rule, qid + ': ' + msg);
        if (!q || typeof q !== 'object') return Q('structure', 'not an object');
        if (!/^q\d+$/.test(q.id || '')) Q('structure', 'question id must be q<n>');
        if (qids.has(q.id)) Q('structure', 'duplicate question id'); qids.add(q.id);
        if (typeof q.q !== 'string' || !q.q.trim()) Q('structure', 'stem missing');
        else if (/\*\*|`/.test(q.q)) Q('markup', 'stem markup (** or `), which SAA.markWords prints as plain text after Check');
        if (typeof q.expl !== 'string' || !q.expl.trim()) Q('structure', 'expl missing');
        if (!Array.isArray(q.words) || q.words.length < 1 || q.words.length > 4) Q('structure', 'needs 1 to 4 words');
        else q.words.forEach(w => { if (typeof w !== 'string' || !String(q.q || '').toLowerCase().includes(w.toLowerCase())) Q('words', 'word not in stem: ' + w); });
        const opts = Array.isArray(q.opts) ? q.opts : [];
        const nOk = opts.filter(o => o && o.ok === true).length;
        if (!((opts.length === 4 && nOk === 1) || (opts.length === 5 && nOk === 2))) Q('structure', 'options must be 4 with one ok or 5 with two ok (' + opts.length + '/' + nOk + ')');
        if (opts.length === 5) multi++;
        opts.forEach((o, oi) => {
          if (!o || typeof o.t !== 'string' || !o.t.trim()) Q('structure', 'option ' + (oi + 1) + ' has no text');
          if (!o || typeof o.why !== 'string' || !o.why.trim()) Q('why', 'option without why: ' + String((o && o.t) || '').slice(0, 40));
        });
        [q.expl].concat(opts.map(o => o && o.why)).forEach(t => { if (t && letterRef.test(t)) Q('letter', 'letter reference: ' + t.match(letterRef)[0].trim()); });
      });
      if (multi > 1) S('structure', 'more than one multiple-response question');
      strings(b).forEach(([k, t]) => BADMARK.forEach(([re, n]) => { if (re.test(t)) S('markup', n + ' markup in ' + (k || 'text') + ': ' + t.slice(0, 40)); }));
      if (typeof b.text === 'string') {
        const n = words(b.text);
        if (n < 30 || n > 110) S('length', 'text is ' + n + ' words (aim 40-90, limits 30-110)');
      }
      /* sources and the numbers they allow */
      let corpus = (env.ctx6 || '') + '\n' + (env.facts[b.id] || []).join('\n');
      const sids = new Set([b.sid]);
      (Array.isArray(b.src) ? b.src : []).forEach(s => {
        const m = /^(?:(\d\d-[\w-]+)\/)?(ch\d+)$/.exec(String(s));
        if (!m) return S('source', 'src ' + s + ' is not chN or NN-name/chN');
        const sid = m[1] || b.sid, ch = (env.learn[sid] || []).find(c => c.id === m[2]);
        if (!ch) return S('source', 'no chapter ' + s + ' in sessions/' + sid + '/learn.js');
        sids.add(sid);
        corpus += '\n' + JSON.stringify(ch);
      });
      sids.forEach(sid => { corpus += '\n' + (env.docs[sid] || ''); });
      const allowed = new Set(nums(corpus));
      const checked = [['text', b.text], ['update', b.update]].concat(...qs.map(q => [[q.id + '.expl', q && q.expl]].concat((q && Array.isArray(q.opts) ? q.opts : []).map((o, oi) => [q.id + '.why' + (oi + 1), o && o.why]))));
      checked.forEach(([k, t]) => nums(t).forEach(x => { if (!allowed.has(x)) S('number', 'number ' + x + ' in ' + k + ' is in no source chapter, session doc, CONTEXT §6 or New facts row'); }));
      if (!b.update) {
        const hit = strings(b).map(([, t]) => t).join('\n');
        WATCH.forEach(re => { const m = hit.match(re); if (m) S('watch', 'names ' + m[0] + ' (CONTEXT §6 marks it changed) without an update note'); });
      }
    });
  });
  /* wiring: files on disk = script tags in index.html (only the named packs when some are named) */
  const files = new Set(env.files), tags = new Set(env.tags), mine = n => !env.only || !env.only.length || env.only.includes(n);
  env.files.filter(mine).forEach(f => { if (!tags.has(f)) E(f, 'wiring', 'wiring', 'bites/' + f + '.js has no <script> tag in index.html'); });
  env.tags.filter(mine).forEach(t => { if (!files.has(t)) E(t, 'wiring', 'wiring', 'index.html loads bites/' + t + '.js, which does not exist'); });
  if (coverage) {
    const all = [].concat(...packs.map(p => (Array.isArray(p.bites) ? p.bites : []))).filter(b => b && typeof b === 'object');
    env.manifest.filter(sx => !sx.soon).forEach(sx => {
      const n = all.filter(b => b.sid === sx.id).length;
      if (n < MIN_PER_SESSION) E(sx.id, 'coverage', 'coverage', n + ' bites, needs at least ' + MIN_PER_SESSION);
    });
    DOMS.forEach(D => {
      const n = all.filter(b => Array.isArray(b.domains) && b.domains.includes(D)).length;
      if (n < MIN_PER_DOMAIN) E('all', 'coverage', 'coverage', D + ' is carried by ' + n + ' bites, needs at least ' + MIN_PER_DOMAIN);
    });
  }
  return errs;
}

/* for drills-lint.js: only = pack names from argv (empty = all, coverage on) */
function lint(only) {
  const packs = loadPacks(only);
  const errs = lintPacks(packs, Object.assign(realEnv(), { only }), !(only && only.length));
  return { packs: packs.map(p => ({ pack: p.pack, n: (p.bites || []).length, q: (p.bites || []).reduce((a, b) => a + ((b && b.qs) || []).length, 0) })), errs };
}
/* for options.js: [{ pack, qs:[{ id, opts:[{t, ok}] }] }] */
function questions(only) {
  return loadPacks(only).map(p => ({ pack: p.pack, qs: [].concat(...(p.bites || []).map(b => ((b && b.qs) || []).map(q => ({ id: b.id + ':' + q.id, opts: (q.opts || []).map(o => ({ t: o.t, ok: !!o.ok })) })))) }));
}

module.exports = { lint, questions, balance, loadSession, lintPacks, plain };

/* ================= selftest: one broken bite per rule ================= */
if (require.main === module && process.argv.includes('--selftest')) {
  const env = {
    manifest: [{ id: '08-databases' }, { id: '09-serverless' }, { id: '12-cost', soon: true }],
    learn: { '08-databases': [{ id: 'ch2', blocks: ['Pick the engine for the access pattern; DynamoDB items are up to 400 KB.'] }], '09-serverless': [{ id: 'ch2', blocks: ['Queues and topics.'] }] },
    docs: { '08-databases': 'Verified: 64 TiB.', '09-serverless': '' },
    ctx6: '| SQS | 14 d |', facts: { 'db-ok': [] }, files: ['08-databases'], tags: ['08-databases']
  };
  const opt = (t, ok) => ({ t, ok: !!ok, why: 'Because of the one detail named in the stem here.' });
  const q = id => ({ id, q: 'A shop needs single-digit millisecond reads at any scale with the LEAST operational overhead. What fits?', words: ['LEAST operational overhead'], expl: 'The access pattern decides; 400 KB items fit.',
    opts: [opt('DynamoDB on-demand with a simple key on order id', 1), opt('RDS for MySQL with one large instance and replicas'), opt('Aurora Serverless v2 behind an RDS Proxy endpoint'), opt('Redshift Serverless with a sort key on order id')] });
  const text = 'A database is a shelf built for one way of reaching in. A relational shelf joins rows across tables; a key-value shelf hands back one item by its key in the same time at any size. Choose by how the app asks, not by habit, and the rest follows from that one choice every time.';
  const good = () => ({ id: 'db-ok', sid: '08-databases', title: 'Which database', domains: ['D3'], src: ['ch2'], text, qs: [q('q1'), q('q2'), q('q3')] });
  const P = (b, pack) => [{ pack: pack || '08-databases', bites: [b] }];
  const cases = [
    ['structure', 'missing title', () => { const b = good(); delete b.title; return P(b); }],
    ['structure', 'two questions', () => { const b = good(); b.qs.pop(); return P(b); }],
    ['structure', 'sid not the file name', () => P(Object.assign(good(), { sid: '09-serverless' }))],
    ['structure', 'sid of a soon session', () => P(Object.assign(good(), { sid: '12-cost' }), '12-cost')],
    ['structure', 'bad domain', () => P(Object.assign(good(), { domains: ['D5'] }))],
    ['structure', 'duplicate bite id', () => [{ pack: '08-databases', bites: [good(), good()] }]],
    ['structure', 'duplicate question id', () => { const b = good(); b.qs[1].id = 'q1'; return P(b); }],
    ['structure', 'two answers in four options', () => { const b = good(); b.qs[0].opts[1].ok = true; return P(b); }],
    ['structure', 'three domains', () => P(Object.assign(good(), { domains: ['D1', 'D2', 'D3'] }))],
    ['structure', 'two multiple-response questions', () => { const b = good(); [0, 1].forEach(i => b.qs[i].opts.push(opt('A fifth design with a second right part', 1))); return P(b); }],
    ['structure', 'expl missing', () => { const b = good(); delete b.qs[0].expl; return P(b); }],
    ['why', 'option without why', () => { const b = good(); delete b.qs[0].opts[2].why; return P(b); }],
    ['words', 'word not in stem', () => { const b = good(); b.qs[0].words = ['MOST cost-effective']; return P(b); }],
    ['letter', 'letter reference', () => { const b = good(); b.qs[0].opts[1].why = 'Option B keeps the shelf.'; return P(b); }],
    ['markup', 'line markup', () => P(Object.assign(good(), { text: text.replace('shelf', '{ddb|shelf}') }))],
    ['markup', 'link markup', () => { const b = good(); b.qs[0].expl = 'See [[#learn/ch2|chapter 2]].'; return P(b); }],
    ['markup', 'highlight markup', () => { const b = good(); b.qs[0].q += ' ==fast=='; return P(b); }],
    ['markup', 'bold in a stem', () => { const b = good(); b.qs[0].q = b.qs[0].q.replace('any scale', '**any scale**'); return P(b); }],
    ['markup', 'code in a stem', () => { const b = good(); b.qs[1].q = b.qs[1].q.replace('What fits?', 'Does `.sync` fit?'); return P(b); }],
    ['length', 'text too long', () => P(Object.assign(good(), { text: [text, text, text].join(' ') }))],
    ['length', 'text too short', () => P(Object.assign(good(), { text: 'A shelf for each way of reaching in.' }))],
    ['source', 'unknown chapter', () => P(Object.assign(good(), { src: ['ch99'] }))],
    ['source', 'unknown chapter of another session', () => P(Object.assign(good(), { src: ['ch2', '09-serverless/ch7'] }))],
    ['number', 'number in no source', () => P(Object.assign(good(), { text: text + ' It holds 65 tables.' }))],
    ['number', 'number in a why', () => { const b = good(); b.qs[1].opts[0].why = 'It serves 3,000 reads per partition.'; return P(b); }],
    ['watch', 'retired service without update', () => P(Object.assign(good(), { text: text.replace('by habit', 'by habit or by QLDB') }))],
    ['wiring', 'pack without a script tag', () => { env.tags = []; return P(good()); }, () => { env.tags = ['08-databases']; }],
    ['wiring', 'script tag without a pack', () => { env.tags = ['08-databases', '07-ha-dr']; return P(good()); }, () => { env.tags = ['08-databases']; }],
    ['coverage', 'session below the minimum', () => P(good()), null, true]
  ];
  let failed = 0;
  const base = lintPacks(P(good()), env, false);
  if (base.length) { failed++; console.log('  ✕ the valid bite reports: ' + base.map(e => e.rule + ' ' + e.msg).join(' | ')); } else console.log('  ✓ a valid bite reports nothing');
  const allowedOk = lintPacks(P(Object.assign(good(), { text: text + ' Items stay under 400 KB, tables to 64 TiB.' })), env, false);
  if (allowedOk.length) { failed++; console.log('  ✕ numbers from the chapter and the session doc were rejected: ' + allowedOk.map(e => e.msg).join(' | ')); } else console.log('  ✓ numbers from the chapter and the session doc pass');
  const noted = lintPacks(P(Object.assign(good(), { text: text.replace('by habit', 'by habit or by QLDB'), update: 'QLDB has shut down; practice exams still name it.' })), env, false);
  if (noted.length) { failed++; console.log('  ✕ a retired service with an update note still reports'); } else console.log('  ✓ a retired service with an update note passes');
  cases.forEach(([rule, name, make, after, cov]) => {
    const r = lintPacks(make(), env, !!cov);
    if (after) after();
    const hit = r.some(e => e.rule === rule);
    if (!hit) failed++;
    console.log((hit ? '  ✓ ' : '  ✕ ') + rule + ': ' + name + (hit ? '' : ' did not report' + (r.length ? ' (got ' + r.map(e => e.rule).join(',') + ')' : '')));
  });
  const bal = [
    ['balance', 'one option far longer', balance([{ t: 'a'.repeat(60) }, { t: 'b'.repeat(60) }, { t: 'c'.repeat(60) }, { t: 'd'.repeat(95) }]).length > 0],
    ['balance', 'one option far shorter', balance([{ t: 'a'.repeat(60) }, { t: 'b'.repeat(60) }, { t: 'c'.repeat(60) }, { t: 'd'.repeat(30) }]).length > 0],
    ['balance', 'balanced options pass', balance([{ t: 'a'.repeat(60) }, { t: 'b'.repeat(66) }, { t: 'c'.repeat(55) }, { t: 'd'.repeat(62) }]).length === 0],
    ['balance', 'short options get 8 characters of slack', balance([{ t: 'a'.repeat(20) }, { t: 'b'.repeat(26) }, { t: 'c'.repeat(16) }, { t: 'd'.repeat(22) }]).length === 0]
  ];
  bal.forEach(([rule, name, pass]) => { if (!pass) failed++; console.log((pass ? '  ✓ ' : '  ✕ ') + rule + ': ' + name); });
  /* per-domain coverage on its own: every session has its 4 bites, so only the domain minimum can fire */
  const fill = (sid, n, doms) => ({ pack: sid, bites: Array.from({ length: n }, (_, i) => Object.assign(good(), { id: sid.slice(3) + '-' + i, sid, domains: doms(i) })) });
  const cov = packs => lintPacks(packs, env, true).filter(e => e.rule === 'coverage');
  const domLow = cov([fill('08-databases', 4, () => ['D3']), fill('09-serverless', 4, () => ['D3', 'D4'])]);
  const domHit = domLow.length > 0 && domLow.every(e => /^D[1-4] is carried by/.test(e.msg));
  if (!domHit) failed++;
  console.log((domHit ? '  ✓ ' : '  ✕ ') + 'coverage: domain below the minimum' + (domHit ? '' : ' did not report on its own (got ' + domLow.map(e => e.msg).join(' | ') + ')'));
  const domOk = cov([fill('08-databases', 6, () => ['D1', 'D2']), fill('09-serverless', 6, () => ['D3', 'D4'])]);
  if (domOk.length) failed++;
  console.log((domOk.length ? '  ✕ ' : '  ✓ ') + 'coverage: 6 bites in every domain pass' + (domOk.length ? ' (got ' + domOk.map(e => e.msg).join(' | ') + ')' : ''));
  console.log(failed ? 'selftest FAILED ' + failed : 'selftest ok');
  process.exit(failed ? 1 : 0);
}
