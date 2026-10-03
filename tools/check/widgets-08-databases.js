const go = async (p, url) => { await p.goto(url); await p.waitForTimeout(300); };
const txt = async l => (await l.innerText());
const tipOf = async (p, loc) => { await loc.scrollIntoViewIfNeeded(); await loc.hover(); await p.waitForTimeout(120); return p.locator('.tip').innerText(); };
const qc = async (p, label, want) => { const b = p.locator('.qcbtn', { hasText: label }).first(); await b.scrollIntoViewIfNeeded(); await b.click(); if (!(await p.locator('.qcbtn.' + want).count())) throw new Error('quick check ' + label); };
const sortAll = async (w, n) => { const rows = w.locator('.sortrow'); const k = await rows.count(); if (k !== n) throw new Error('rows ' + k); for (let i = 0; i < k; i++) await rows.nth(i).locator('button.chip').first().click(); await w.locator('button', { hasText: 'Check' }).click(); };
const steps = async (p, B, ch, title, n) => { await go(p, B + '#learn/' + ch); const w = p.locator('.widget', { hasText: title }); for (let i = 0; i < n - 1; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!new RegExp('Step ' + n + ' of ' + n).test(await txt(w))) throw new Error('stepper ' + title); };
module.exports = {
  dbChooser: async (p, B) => {
    await go(p, B + '#learn/ch2'); const w = p.locator('.widget', { hasText: 'Which database?' });
    await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click();
    if (!/Amazon RDS/.test(await txt(w.locator('.result')))) throw new Error('relational → RDS');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').nth(1).click(); await w.locator('.bigopt').nth(1).click();
    if (!/DynamoDB \+ DAX/.test(await txt(w.locator('.result')))) throw new Error('kv µs → DAX');
  },
  familySorter: async (p, B) => { await go(p, B + '#learn/ch2'); const w = p.locator('.widget', { hasText: 'Which database family?' }); await sortAll(w, 12); if ((await w.locator('.sortrow.correct').count()) !== 3) throw new Error('expected 3 relational right'); },
  relKvPair: async (p, B) => { await go(p, B + '#learn/ch2'); await qc(p, 'DynamoDB', 'correct'); },
  blueGreenStepper: async (p, B) => steps(p, B, 'ch3', 'A major version upgrade with Blue/Green', 5),
  connStorm: async (p, B) => {
    await go(p, B + '#learn/ch4'); const w = p.locator('.widget', { hasText: 'Connection storm' });
    if (!/940\s*connections refused/.test(await txt(w.locator('.stats')))) throw new Error('default 1,000 vs 60 → 940 refused, got ' + (await txt(w.locator('.stats'))));
    await w.locator('button.chip', { hasText: /^RDS Proxy$/ }).click();
    if (!/^0\s*connections refused/.test(await txt(w.locator('.stats')))) throw new Error('proxy → 0 refused');
    await w.locator('button.chip', { hasText: '8 GiB class' }).click(); await w.locator('button.chip', { hasText: 'nothing (direct)' }).click();
    if (!/370\s*connections refused/.test(await txt(w.locator('.stats')))) throw new Error('1,000 vs 630 → 370 refused');
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/Lambda environments/.test(t)) throw new Error('storm tooltip: ' + t);
  },
  proxyStepper: async (p, B) => steps(p, B, 'ch4', 'A Lambda burst through RDS Proxy', 5),
  proxyPair: async (p, B) => { await go(p, B + '#learn/ch4'); await qc(p, 'RDS Proxy', 'correct'); },
  readSorter: async (p, B) => { await go(p, B + '#learn/ch5'); const w = p.locator('.widget', { hasText: 'How would you scale these reads?' }); await sortAll(w, 8); if ((await w.locator('.sortrow.correct').count()) !== 2) throw new Error('expected 2 read replica right'); },
  rdsAuroraPair: async (p, B) => { await go(p, B + '#learn/ch6'); await qc(p, 'Amazon RDS', 'correct'); },
  gsiLsiPair: async (p, B) => { await go(p, B + '#learn/ch7'); await qc(p, 'Global secondary index (GSI)', 'correct'); },
  gsiLsiSorter: async (p, B) => { await go(p, B + '#learn/ch7'); const w = p.locator('.widget', { hasText: 'GSI or LSI?' }); await sortAll(w, 8); if ((await w.locator('.sortrow.correct').count()) !== 5) throw new Error('expected 5 GSI right'); },
  ddbCapacity: async (p, B) => {
    await go(p, B + '#learn/ch8'); const w = p.locator('.widget', { hasText: 'DynamoDB capacity' });
    const st = await txt(w.locator('.stats'));
    if (!/2,000 RCU/.test(st) || !/3,000 WCU/.test(st) || !/on-demand\s*cheaper/.test(st)) throw new Error('default: ' + st);
    await w.locator('button.chip', { hasText: /^50%$/ }).click();
    if (!/provisioned\s*cheaper/.test(await txt(w.locator('.stats')))) throw new Error('50% → provisioned');
    await w.locator('button.chip', { hasText: 'transactional' }).first().click();
    if (!/8,000 RCU/.test(await txt(w.locator('.stats')))) throw new Error('transactional 6 KB reads → 8,000 RCU');
    const t = await tipOf(p, w.locator('.chart [data-tip]').nth(4)); if (!/on-demand/.test(t)) throw new Error('capacity tooltip: ' + t);
  },
  odProvPair: async (p, B) => { await go(p, B + '#learn/ch8'); await qc(p, 'On-demand', 'correct'); },
  cachePattern: async (p, B) => {
    await go(p, B + '#learn/ch9'); const w = p.locator('.widget', { hasText: 'Cache patterns' });
    const m = (await txt(w.locator('.stats'))).match(/([\d,]+)\s*stale reads/); if (!m || +m[1].replace(/,/g, '') === 0) throw new Error('lazy loading should show stale reads');
    await w.locator('button.chip', { hasText: /^Write-through$/ }).click();
    if (!/\b0\s*stale reads/.test(await txt(w.locator('.stats')))) throw new Error('write-through: 0 stale');
    await w.locator('button.chip', { hasText: 'mostly keys nobody reads' }).click(); await w.locator('button.chip', { hasText: 'wasted cache writes' }).click();
    const x = (await txt(w.locator('.stats'))).match(/([\d,]+)\s*wasted cache writes/); if (!x || +x[1].replace(/,/g, '') === 0) throw new Error('write-through cold writes: wasted > 0');
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/Lazy loading/.test(t)) throw new Error('cache tooltip: ' + t);
  },
  lazyWtPair: async (p, B) => { await go(p, B + '#learn/ch9'); await qc(p, 'Write-through', 'correct'); },
  cache3Pair: async (p, B) => { await go(p, B + '#learn/ch9'); await qc(p, 'DAX', 'correct'); },
  olapPair: async (p, B) => { await go(p, B + '#learn/ch10'); await qc(p, 'Redshift', 'correct'); },
  encryptStepper: async (p, B) => steps(p, B, 'ch11', 'Encrypting an unencrypted RDS database', 4),
  dbMap: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('.mapbox g.mg text', { hasText: 'ELASTICACHE' }).first().click(); await p.waitForTimeout(100); if ((await p.locator('.side h2').first().innerText()) !== 'ElastiCache · MemoryDB') throw new Error('map select'); },
  triggerTable: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('input[type=search]').fill('DynamoDB'); const n = await p.locator('.widget tbody tr').count(); if (n < 3) throw new Error('rows ' + n); },
  progressCharts: async (p, B) => { await go(p, B + '#progress'); if ((await p.locator('.chart svg').count()) < 3) throw new Error('charts'); }
};
