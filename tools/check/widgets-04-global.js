const go = async (p, url) => { await p.goto(url); await p.waitForTimeout(300); };
const txt = async l => (await l.innerText());
const tipOf = async (p, loc) => { await loc.scrollIntoViewIfNeeded(); await loc.hover(); await p.waitForTimeout(120); return p.locator('.tip').innerText(); };
const qc = async (p, label, want) => { const b = p.locator('.qcbtn', { hasText: label }).first(); await b.scrollIntoViewIfNeeded(); await b.click(); if (!(await p.locator('.qcbtn.' + want).count())) throw new Error('quick check ' + label); };
module.exports = {
  stubTrainer: async (p, B) => { await go(p, B + '#learn/ch1'); const w = p.locator('.widget', { hasText: 'Stub trainer' }); const rows = w.locator('.stubrow'); for (let i = 0; i < 4; i++) await rows.nth(i).locator('button.chip').first().click(); await w.locator('button', { hasText: 'Reveal' }).click(); if (!(await w.locator('.vt.y').count())) throw new Error('WHAT static content should be ✓'); },
  whichOneSorter: async (p, B) => { await go(p, B + '#learn/ch2'); const w = p.locator('.widget', { hasText: 'Which one answers this' }); const rows = w.locator('.sortrow'); const n = await rows.count(); for (let i = 0; i < n; i++) await rows.nth(i).locator('button.chip').first().click(); await w.locator('button', { hasText: 'Check' }).click(); if ((await w.locator('.sortrow.correct').count()) !== 3) throw new Error('expected 3 CloudFront right'); },
  albCfPair: async (p, B) => { await go(p, B + '#learn/ch3'); await qc(p, 'ALB listener rules', 'correct'); },
  cacheSim: async (p, B) => {
    await go(p, B + '#learn/ch4'); const w = p.locator('.widget', { hasText: 'Cache simulator' });
    if (!/users got the old file/.test(await txt(w))) throw new Error('wait mode should serve stale');
    await w.locator('button.chip', { hasText: 'versioned name' }).click(); if (!/No stale answers/.test(await txt(w))) throw new Error('versioned');
    await w.locator('button.chip', { hasText: 'invalidate' }).click(); if (!/1 path used/.test(await txt(w))) throw new Error('invalidate');
    await w.locator('.stubrow', { hasText: 'REGIONAL EDGE CACHE' }).locator('button.chip', { hasText: 'off' }).click();
    await w.locator('button.chip', { hasText: /^24 h$/ }).click();
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/origin fetches/.test(t)) throw new Error('ttl chart tooltip');
  },
  accessPair: async (p, B) => { await go(p, B + '#learn/ch5'); await qc(p, 'Signed cookie', 'correct'); },
  edgeChooser: async (p, B) => {
    await go(p, B + '#learn/ch6'); const w = p.locator('.widget', { hasText: 'Edge-compute chooser' });
    await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click();
    if (!/CloudFront Functions/.test(await txt(w.locator('.result')))) throw new Error('cff');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').nth(1).click();
    if (!/Lambda@Edge/.test(await txt(w.locator('.result')))) throw new Error('le');
  },
  edgePair: async (p, B) => { await go(p, B + '#learn/ch6'); await qc(p, 'Lambda@Edge', 'wrong'); },
  s3Stepper: async (p, B) => { await go(p, B + '#learn/ch7'); const w = p.locator('.widget', { hasText: 'Host example.com on S3' }); for (let i = 0; i < 4; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!/Step 5 of 5/.test(await txt(w))) throw new Error('stepper'); },
  cfTaPair: async (p, B) => { await go(p, B + '#learn/ch7'); await qc(p, 'S3 Transfer Acceleration', 'wrong'); },
  cfGaPair: async (p, B) => { await go(p, B + '#learn/ch8'); await qc(p, 'Global Accelerator', 'correct'); },
  aliasPair: async (p, B) => { await go(p, B + '#learn/ch9'); await qc(p, 'Alias record', 'correct'); },
  routingSim: async (p, B) => {
    await go(p, B + '#learn/ch10'); const w = p.locator('.widget', { hasText: 'Routing-policy simulator' });
    await w.locator('button.chip', { hasText: 'ap-southeast-1 ✓' }).click();
    if (!/next lowest/.test(await txt(w))) throw new Error('latency should skip unhealthy Singapore');
    await w.locator('button.chip', { hasText: /^geolocation$/ }).click(); await w.locator('button.chip', { hasText: 'no Default' }).click();
    if (!/no answer/.test(await txt(w))) throw new Error('geolocation without default → no answer');
    await w.locator('button.chip', { hasText: /^geoproximity$/ }).click(); await w.locator('button.chip', { hasText: '+80' }).click();
    if (!/bias \+80/.test(await txt(w))) throw new Error('bias');
    await w.locator('button.chip', { hasText: /^simple$/ }).click(); if (!/including the unhealthy one/.test(await txt(w))) throw new Error('simple returns unhealthy');
    const t = await tipOf(p, w.locator('.chart [data-tip]').last()); if (!/→/.test(t)) throw new Error('map tooltip');
  },
  geoPair: async (p, B) => { await go(p, B + '#learn/ch10'); await qc(p, 'Geolocation', 'correct'); },
  failoverRace: async (p, B) => {
    await go(p, B + '#learn/ch11'); const w = p.locator('.widget', { hasText: 'Failover race' });
    if (!/Route 53 failover/.test(await txt(w))) throw new Error('default verdict');
    await w.locator('button.chip', { hasText: 'devices cache DNS 24 h' }).click(); if (!/cannot beat their cache/.test(await txt(w))) throw new Error('device verdict');
    await w.locator('button.chip', { hasText: 'browsers honour TTL' }).click(); await w.locator('button.chip', { hasText: /^1 h$/ }).click(); if (!/Lower the TTL/.test(await txt(w))) throw new Error('long TTL verdict');
    const t = await tipOf(p, w.locator('.chart [data-tip]').nth(2)); if (!/less than one minute/.test(t)) throw new Error('GA tooltip');
  },
  failoverPair: async (p, B) => { await go(p, B + '#learn/ch11'); await qc(p, 'Route 53 failover', 'wrong'); },
  activePassiveStepper: async (p, B) => { await go(p, B + '#learn/ch11'); const w = p.locator('.widget', { hasText: 'Active-passive with Route 53' }); for (let i = 0; i < 4; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!/Step 5 of 5/.test(await txt(w))) throw new Error('stepper'); },
  edgeMap: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('.mapbox g.mg text', { hasText: 'GLOBAL ACCELERATOR' }).first().click(); await p.waitForTimeout(100); if ((await p.locator('.side h2').first().innerText()) !== 'Global Accelerator') throw new Error('map select'); },
  triggerTable: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('input[type=search]').fill('apex'); const n = await p.locator('.widget tbody tr').count(); if (n < 1) throw new Error('rows ' + n); },
  progressCharts: async (p, B) => { await go(p, B + '#progress'); if ((await p.locator('.chart svg').count()) < 4) throw new Error('charts'); }
};
