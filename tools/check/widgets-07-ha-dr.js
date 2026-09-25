const go = async (p, url) => { await p.goto(url); await p.waitForTimeout(300); };
const txt = async l => (await l.innerText());
const tipOf = async (p, loc) => { await loc.scrollIntoViewIfNeeded(); await loc.hover(); await p.waitForTimeout(120); return p.locator('.tip').innerText(); };
const qc = async (p, label, want) => { const b = p.locator('.qcbtn', { hasText: label }).first(); await b.scrollIntoViewIfNeeded(); await b.click(); if (!(await p.locator('.qcbtn.' + want).count())) throw new Error('quick check ' + label); };
const sortAll = async (w, n) => { const rows = w.locator('.sortrow'); const k = await rows.count(); if (k !== n) throw new Error('rows ' + k); for (let i = 0; i < k; i++) await rows.nth(i).locator('button.chip').first().click(); await w.locator('button', { hasText: 'Check' }).click(); };
const steps = async (p, B, ch, title, n) => { await go(p, B + '#learn/' + ch); const w = p.locator('.widget', { hasText: title }); for (let i = 0; i < n - 1; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!new RegExp('Step ' + n + ' of ' + n).test(await txt(w))) throw new Error('stepper ' + title); };
const row = (w, label) => w.locator('.stubrow', { hasText: label });
module.exports = {
  stubTrainer: async (p, B) => {
    await go(p, B + '#learn/ch1'); const w = p.locator('.widget', { hasText: 'Stub trainer' }); const rows = w.locator('.stubrow');
    await rows.nth(0).locator('button.chip', { hasText: 'Region' }).click();
    for (let i = 1; i < 4; i++) await rows.nth(i).locator('button.chip').first().click();
    await w.locator('button', { hasText: 'Reveal' }).click();
    if ((await w.locator('.vt.y').count()) < 4) throw new Error('all four slots should be ✓');
  },
  drPicker: async (p, B) => {
    await go(p, B + '#learn/ch2'); const w = p.locator('.widget', { hasText: 'DR strategy picker' });
    if (!/Backup & restore\s*cheapest/.test(await txt(w.locator('.stats')))) throw new Error('default 4h/1h → backup & restore, got ' + (await txt(w.locator('.stats'))));
    await row(w, 'RTO · MAX DOWNTIME').locator('button.chip', { hasText: /^15 min$/ }).click();
    if (!/Pilot light/.test(await txt(w.locator('.stats')))) throw new Error('RTO 15 min → pilot light');
    await row(w, 'RTO · MAX DOWNTIME').locator('button.chip', { hasText: /^5 min$/ }).click();
    if (!/Warm standby/.test(await txt(w.locator('.stats')))) throw new Error('RTO 5 min → warm standby');
    await row(w, 'RTO · MAX DOWNTIME').locator('button.chip', { hasText: /^30 s$/ }).click();
    if (!/Multi-site/.test(await txt(w.locator('.stats')))) throw new Error('RTO 30 s → multi-site');
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/typically/.test(t)) throw new Error('picker tooltip: ' + t);
  },
  tiersPair: async (p, B) => { await go(p, B + '#learn/ch2'); await qc(p, 'Warm standby', 'correct'); },
  tierSorter: async (p, B) => { await go(p, B + '#learn/ch2'); const w = p.locator('.widget', { hasText: 'Which DR strategy?' }); await sortAll(w, 12); if ((await w.locator('.sortrow.correct').count()) !== 3) throw new Error('expected 3 backup & restore right'); },
  azCapacity: async (p, B) => {
    await go(p, B + '#learn/ch3'); const w = p.locator('.widget', { hasText: 'AZ capacity' });
    if (!/100%/.test(await txt(w.locator('.stats')))) throw new Error('static 3 AZs should keep 100%');
    await w.locator('button.chip', { hasText: 'normal load only' }).click();
    if (!/67%/.test(await txt(w.locator('.stats')))) throw new Error('normal sizing should keep 67%');
    await w.locator('button.chip', { hasText: '2 AZs' }).click();
    if (!/50%/.test(await txt(w.locator('.stats')))) throw new Error('2 AZs normal should keep 50%');
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/instances/.test(t)) throw new Error('az tooltip: ' + t);
  },
  haDrPair: async (p, B) => { await go(p, B + '#learn/ch3'); await qc(p, 'High availability (Multi-AZ)', 'correct'); },
  haDrSorter: async (p, B) => { await go(p, B + '#learn/ch3'); const w = p.locator('.widget', { hasText: 'HA or DR?' }); await sortAll(w, 8); if ((await w.locator('.sortrow.correct').count()) !== 4) throw new Error('expected 4 HA right'); },
  rdsStepper: async (p, B) => steps(p, B, 'ch4', 'An RDS Multi-AZ failover', 5),
  mazPair: async (p, B) => { await go(p, B + '#learn/ch4'); await qc(p, 'Multi-AZ + read replica', 'correct'); },
  auroraStepper: async (p, B) => steps(p, B, 'ch5', 'Aurora Global Database failover', 5),
  agdPair: async (p, B) => { await go(p, B + '#learn/ch5'); await qc(p, 'Cross-Region read replica', 'wrong'); },
  gtPair: async (p, B) => { await go(p, B + '#learn/ch6'); await qc(p, 'DynamoDB global tables', 'correct'); },
  dbChooser: async (p, B) => {
    await go(p, B + '#learn/ch6'); const w = p.locator('.widget', { hasText: 'Which database resilience feature' });
    await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click();
    if (!/Multi-AZ DB instance/.test(await txt(w.locator('.result')))) throw new Error('rds az');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').nth(2).click(); await w.locator('.bigopt').nth(2).click();
    if (!/DynamoDB point-in-time recovery/.test(await txt(w.locator('.result')))) throw new Error('ddb pitr');
  },
  threatMatrix: async (p, B) => {
    await go(p, B + '#learn/ch7'); const w = p.locator('.widget', { hasText: 'Protection vs threat' });
    if (!/3 \/ 5/.test(await txt(w.locator('.stats')))) throw new Error('bad data: 3 of 5 help');
    await w.locator('button.chip', { hasText: 'An attacker with admin credentials' }).click();
    if (!/1 \/ 5/.test(await txt(w.locator('.stats')))) throw new Error('ransomware: only the lock helps');
    await w.locator('button.chip', { hasText: 'An AZ fails' }).click();
    if (!/5 \/ 5/.test(await txt(w.locator('.stats')))) throw new Error('AZ: all help');
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/Multi-AZ/.test(t)) throw new Error('matrix tooltip: ' + t);
  },
  repBakPair: async (p, B) => { await go(p, B + '#learn/ch7'); await qc(p, 'Backup', 'correct'); },
  backupStepper: async (p, B) => steps(p, B, 'ch8', 'Backups an attacker cannot destroy', 5),
  drsStepper: async (p, B) => steps(p, B, 'ch9', 'A DR drill with DRS', 5),
  drsPair: async (p, B) => { await go(p, B + '#learn/ch9'); await qc(p, 'Elastic Disaster Recovery', 'correct'); },
  failoverTime: async (p, B) => {
    await go(p, B + '#learn/ch10'); const w = p.locator('.widget', { hasText: 'Failover time' });
    if (!/2\.5 min/.test(await txt(w.locator('.stats')))) throw new Error('default 90 s + 60 s = 2.5 min, got ' + (await txt(w.locator('.stats'))));
    await w.locator('button.chip', { hasText: '3,600 s' }).click();
    if (!/almost irrelevant/.test(await txt(w))) throw new Error('long TTL note');
    await w.locator('button.chip', { hasText: '10 s (fast)' }).click(); await w.locator('button.chip', { hasText: /^1$/ }).click();
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/Detect/.test(t)) throw new Error('failover tooltip: ' + t);
  },
  r53Pair: async (p, B) => { await go(p, B + '#learn/ch10'); await qc(p, 'Global Accelerator', 'correct'); },
  drCost: async (p, B) => {
    await go(p, B + '#learn/ch11'); const w = p.locator('.widget', { hasText: 'DR cost ladder' });
    if (!/Pilot light/.test(await txt(w.locator('.stats')))) throw new Error('rate 100 → pilot light');
    await w.locator('button.chip', { hasText: /^10$/ }).click(); if (!/Backup & restore/.test(await txt(w.locator('.stats')))) throw new Error('rate 10 → backup');
    await w.locator('button.chip', { hasText: /^1000$/ }).click(); if (!/Warm standby/.test(await txt(w.locator('.stats')))) throw new Error('rate 1000 → warm');
    await w.locator('button.chip', { hasText: '50% of prod' }).click();
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/standing cost/.test(t)) throw new Error('cost tooltip: ' + t);
  },
  orgMap: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('.mapbox g.mg text', { hasText: 'GLOBAL TABLES' }).first().click(); await p.waitForTimeout(100); if ((await p.locator('.side h2').first().innerText()) !== 'DynamoDB global tables · PITR') throw new Error('map select'); },
  triggerTable: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('input[type=search]').fill('Aurora'); const n = await p.locator('.widget tbody tr').count(); if (n < 3) throw new Error('rows ' + n); },
  progressCharts: async (p, B) => { await go(p, B + '#progress'); if ((await p.locator('.chart svg').count()) < 4) throw new Error('charts'); }
};
