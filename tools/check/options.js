/* Option-balance audit: flags questions where the answer can be spotted by length alone.
   node options.js [01-storage …]   (no args = every session)
   A question is flagged when the correct option is the longest by a clear margin, or a
   distractor is a stub (much shorter than the rest). Exit code 1 if anything is flagged. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', 'sessions');
const only = process.argv.slice(2);
const dirs = fs.readdirSync(ROOT).filter(d => /^\d\d-/.test(d) && (!only.length || only.includes(d)));

const load = dir => {
  const win = { SESSION: {} };
  const SAA = new Proxy({ widgets: {} }, { get: (t, k) => (k in t ? t[k] : () => ({})) });
  const ctx = vm.createContext({ window: win, SAA, document: {}, console });
  for (const f of ['core.js', 'drills.js', 'cards.js', 'learn.js']) {
    const p = path.join(ROOT, dir, f);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
  }
  return win.SESSION;
};

const plain = t => String(t).replace(/\*\*|`|==/g, '').replace(/\{[\w-]+\|([^}]+)\}/g, '$1');
/* returns a list of problems for one question; opts = [{t, ok}] */
const judge = opts => {
  const L = opts.map(o => plain(o.t).length);
  const ok = opts.map(o => !!o.ok);
  const okL = L.filter((_, i) => ok[i]), badL = L.filter((_, i) => !ok[i]);
  if (!okL.length || !badL.length) return [];
  const out = [];
  const maxBad = Math.max(...badL), minAll = Math.min(...L), maxAll = Math.max(...L);
  const avgBad = badL.reduce((a, b) => a + b, 0) / badL.length;
  const minOk = Math.min(...okL);
  if (minOk > maxBad * 1.15 && minOk - maxBad > 12) out.push('answer longest (' + minOk + ' vs ≤' + maxBad + ')');
  else if (Math.max(...okL) > avgBad * 1.4 && Math.max(...okL) - avgBad > 20) out.push('answer ' + Math.round(Math.max(...okL) / avgBad * 100) + '% of avg distractor');
  if (maxAll > 30 && minAll < maxAll * 0.5) out.push('stub option (' + minAll + ' vs ' + maxAll + ' chars)');
  return out;
};

let flagged = 0, total = 0, longest = 0;
for (const dir of dirs) {
  const S = load(dir);
  const qs = [];
  (S.drills || []).forEach(d => qs.push({ id: d.id, opts: d.opts }));
  (S.learn || []).forEach(ch => (ch.blocks || []).forEach(b => {
    const c = b && b.check;
    if (!c || !Array.isArray(c.opts) || c.opts.length < 3 || typeof c.opts[0] !== 'object') return;
    const a = [].concat(c.a);
    qs.push({ id: ch.id + ':' + (c.id || 'check'), opts: c.opts.map((o, i) => ({ t: o.t, ok: a.includes(i) })) });
  }));
  const bad = [];
  let single = 0, lng = 0;
  qs.forEach(q => {
    total++;
    const L = q.opts.map(o => plain(o.t).length);
    const iMax = L.indexOf(Math.max(...L));
    if (q.opts.filter(o => o.ok).length === 1) { single++; if (q.opts[iMax].ok) { lng++; longest++; } }
    const p = judge(q.opts);
    if (p.length) { flagged++; bad.push('  ' + q.id.padEnd(16) + p.join(' · ')); }
  });
  /* a balanced bank has the answer as the longest option about 1 time in 4 */
  const share = single ? lng / single : 0;
  const shareBad = single >= 8 && share > 0.35;
  if (shareBad) flagged++;
  console.log(dir + ': ' + bad.length + ' / ' + qs.length + ' flagged · answer is the longest option in ' + lng + ' / ' + single + ' single-answer questions' + (shareBad ? ' (too many, aim ≤ 35%)' : ''));
  bad.forEach(l => console.log(l));
}
console.log('\n' + flagged + ' flagged of ' + total + ' · single-answer questions where the answer is the longest option: ' + longest);
process.exit(flagged ? 1 : 0);
