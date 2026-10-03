/* Drill data lint: syntax, words in q, stub values, correct counts, no letter references.
   node drills-lint.js [01-storage …]   (no args = every session). Exit 1 on any error. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', 'sessions');
const only = process.argv.slice(2);
const dirs = fs.readdirSync(ROOT).filter(d => /^\d\d-/.test(d) && (!only.length || only.includes(d)));
let errs = 0;
const err = (dir, id, m) => { errs++; console.log('  ✕ ' + dir + ' ' + id + ': ' + m); };
for (const dir of dirs) {
  const win = { SESSION: {} };
  const SAA = new Proxy({ widgets: {} }, { get: (t, k) => (k in t ? t[k] : () => ({})) });
  const ctx = vm.createContext({ window: win, SAA, document: {}, console });
  try {
    for (const f of ['core.js', 'drills.js', 'cards.js', 'learn.js']) {
      const p = path.join(ROOT, dir, f);
      if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
    }
  } catch (e) { err(dir, 'load', e.message); continue; }
  const S = win.SESSION, ids = new Set();
  const letterRef = /\b(option|options|answer)\s+[A-E]\b|(^|[\s(“"])[A-E] (keeps|breaks|is|fails|loses|violates|misses|needs|adds|uses|would)\b|\b[A-E] and [A-E]\b/;
  (S.drills || []).forEach(d => {
    if (ids.has(d.id)) err(dir, d.id, 'duplicate id'); ids.add(d.id);
    const q = d.q.toLowerCase();
    (d.words || []).forEach(w => { if (!q.includes(w.toLowerCase())) err(dir, d.id, 'word not in q: ' + w); });
    if (!d.opts.some(o => o.ok)) err(dir, d.id, 'no correct option');
    if (d.opts.some(o => !o.why)) err(dir, d.id, 'option without why');
    (S.stub || []).forEach(sl => {
      const v = (d.stub || {})[sl.id];
      if (v === undefined) err(dir, d.id, 'stub missing ' + sl.id);
      else if (v !== 'any' && !sl.values.includes(v)) err(dir, d.id, 'stub ' + sl.id + ' value not a chip: ' + v);
    });
    [d.expl].concat(d.opts.map(o => o.why)).forEach(t => { if (t && letterRef.test(t)) err(dir, d.id, 'letter reference: ' + t.match(letterRef)[0].trim()); });
  });
  console.log(dir + ': ' + (S.drills || []).length + ' drills checked');
}
console.log(errs ? errs + ' error(s)' : 'ok');
process.exit(errs ? 1 : 0);
