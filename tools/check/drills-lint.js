/* Drill data lint: syntax, words in q, stub values, correct counts, no letter references.
   Then the feed's bites (bites/NN-name.js) through bites.js: structure, sources, numbers, watchlist, wiring, coverage.
   node drills-lint.js [01-storage …]   (no args = every session and every pack, coverage on). Exit 1 on any error. */
const fs = require('fs'), path = require('path');
const bites = require('./bites');
const ROOT = path.join(__dirname, '..', '..', 'sessions');
const only = process.argv.slice(2);
const dirs = fs.readdirSync(ROOT).filter(d => /^\d\d-/.test(d) && (!only.length || only.includes(d)));
let errs = 0;
const err = (dir, id, m) => { errs++; console.log('  ✕ ' + dir + ' ' + id + ': ' + m); };
for (const dir of dirs) {
  let S;
  try { S = bites.loadSession(dir); } catch (e) { err(dir, 'load', e.message); continue; }
  const ids = new Set();
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
const B = bites.lint(only);
B.packs.forEach(p => console.log('bites/' + p.pack + ': ' + p.n + ' bites, ' + p.q + ' questions checked'));
B.errs.forEach(e => err('bites/' + e.pack, e.id, e.rule + ' · ' + e.msg));
console.log(errs ? errs + ' error(s)' : 'ok');
process.exit(errs ? 1 : 0);
