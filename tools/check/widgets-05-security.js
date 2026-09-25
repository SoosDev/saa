const go = async (p, url) => { await p.goto(url); await p.waitForTimeout(300); };
const txt = async l => (await l.innerText());
const tipOf = async (p, loc) => { await loc.scrollIntoViewIfNeeded(); await loc.hover(); await p.waitForTimeout(120); return p.locator('.tip').innerText(); };
const qc = async (p, label, want) => { const b = p.locator('.qcbtn', { hasText: label }).first(); await b.scrollIntoViewIfNeeded(); await b.click(); if (!(await p.locator('.qcbtn.' + want).count())) throw new Error('quick check ' + label); };
module.exports = {
  stubTrainer: async (p, B) => {
    await go(p, B + '#learn/ch1'); const w = p.locator('.widget', { hasText: 'Stub trainer' }); const rows = w.locator('.stubrow');
    for (let i = 0; i < 4; i++) await rows.nth(i).locator('button.chip').first().click();
    await w.locator('button', { hasText: 'Reveal' }).click();
    if (!(await w.locator('.vt.y').count())) throw new Error('ASSET data at rest should be ✓');
  },
  whichServiceSorter: async (p, B) => {
    await go(p, B + '#learn/ch2'); const w = p.locator('.widget', { hasText: 'Which service answers this' }); const rows = w.locator('.sortrow'); const n = await rows.count();
    for (let i = 0; i < n; i++) await rows.nth(i).locator('button.chip').first().click();
    await w.locator('button', { hasText: 'Check' }).click();
    if ((await w.locator('.sortrow.correct').count()) !== 2) throw new Error('expected 2 KMS right');
  },
  envelope: async (p, B) => {
    await go(p, B + '#learn/ch3'); const w = p.locator('.widget', { hasText: 'Envelope encryption' });
    for (let i = 0; i < 5; i++) await w.locator('button', { hasText: 'Next' }).click();
    if (!/Step 6 of 6/.test(await txt(w))) throw new Error('envelope steps');
    await w.locator('button.chip', { hasText: 'call Encrypt directly' }).click();
    if (!/KMS rejects the request/.test(await txt(w))) throw new Error('5 GB direct should be refused');
    await w.locator('button.chip', { hasText: /^1 KB$/ }).click();
    if (!/Step 1 of 3/.test(await txt(w))) throw new Error('1 KB direct should work');
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!t.length) throw new Error('diagram tooltip');
  },
  keySim: async (p, B) => {
    await go(p, B + '#learn/ch4'); const w = p.locator('.widget', { hasText: 'KMS key types' });
    await w.locator('button.chip', { hasText: 'AWS managed (aws/ebs)' }).click();
    if (!/every year/.test(await txt(w))) throw new Error('aws managed rotation');
    await w.locator('button.chip', { hasText: 'Decrypt in eu-west-1' }).click();
    await w.locator('button.chip', { hasText: 'Multi-Region key' }).click();
    if (!(await w.locator('.ok-t').count())) throw new Error('multi-Region should be right');
    await w.locator('button.chip', { hasText: 'Share an encrypted EBS snapshot' }).click();
    await w.locator('button.chip', { hasText: 'AWS managed (aws/ebs)' }).click();
    if (!(await w.locator('.bad-t').count())) throw new Error('aws managed cannot share');
  },
  kmsHsmPair: async (p, B) => { await go(p, B + '#learn/ch4'); await qc(p, 'AWS CloudHSM', 'correct'); },
  s3Chooser: async (p, B) => {
    await go(p, B + '#learn/ch5'); const w = p.locator('.widget', { hasText: 'S3 encryption chooser' });
    await w.locator('.bigopt').nth(2).click(); await w.locator('.bigopt').first().click();
    if (!/SSE-C/.test(await txt(w.locator('.result')))) throw new Error('sse-c');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').nth(1).click(); await w.locator('.bigopt').first().click();
    if (!/SSE-KMS/.test(await txt(w.locator('.result')))) throw new Error('sse-kms');
  },
  ssePair: async (p, B) => { await go(p, B + '#learn/ch5'); await qc(p, 'SSE-KMS', 'correct'); },
  rdsStepper: async (p, B) => { await go(p, B + '#learn/ch5'); const w = p.locator('.widget', { hasText: 'Encrypt an existing RDS' }); for (let i = 0; i < 4; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!/Step 5 of 5/.test(await txt(w))) throw new Error('stepper'); },
  snapshotStepper: async (p, B) => { await go(p, B + '#learn/ch5'); const w = p.locator('.widget', { hasText: 'Share an encrypted snapshot' }); for (let i = 0; i < 4; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!/Step 5 of 5/.test(await txt(w))) throw new Error('stepper'); },
  smPsPair: async (p, B) => { await go(p, B + '#learn/ch6'); await qc(p, 'Parameter Store', 'wrong'); },
  storeChooser: async (p, B) => {
    await go(p, B + '#learn/ch6'); const w = p.locator('.widget', { hasText: 'Secrets Manager, Parameter Store, KMS or ACM' });
    await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click();
    if (!/Secrets Manager/.test(await txt(w.locator('.result')))) throw new Error('sm');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').nth(3).click(); await w.locator('.bigopt').nth(1).click();
    if (!/Private CA/.test(await txt(w.locator('.result')))) throw new Error('pca');
  },
  wafSim: async (p, B) => {
    await go(p, B + '#learn/ch7'); const w = p.locator('.widget', { hasText: 'WAF web ACL simulator' });
    if (!/guesses through/.test(await txt(w))) throw new Error('default verdict');
    await w.locator('button.chip', { hasText: /^Count$/ }).click(); if (!/Count\*?\*? only labels|only labels and counts/.test(await txt(w))) throw new Error('count verdict');
    await w.locator('button.chip', { hasText: /^Block$/ }).first().click();
    await w.locator('button.chip', { hasText: 'last (after SQLi and rate)' }).click(); if (!/priority order decides/.test(await txt(w))) throw new Error('priority verdict');
    await w.locator('button.chip', { hasText: /^10$/ }).click(); await w.locator('button.chip', { hasText: /^1 min$/ }).click();
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/requests ended here/.test(t)) throw new Error('hbars tooltip: ' + t);
    const t2 = await tipOf(p, w.locator('.chart').nth(1).locator('[data-tip]').first()); if (!/bot requests reached/.test(t2)) throw new Error('minute tooltip: ' + t2);
  },
  wafShieldPair: async (p, B) => { await go(p, B + '#learn/ch8'); await qc(p, 'AWS WAF', 'correct'); },
  wafNfwPair: async (p, B) => { await go(p, B + '#learn/ch8'); await qc(p, 'Network Firewall', 'correct'); },
  findingRouter: async (p, B) => {
    await go(p, B + '#learn/ch9'); const w = p.locator('.widget', { hasText: 'Security finding router' }); const rows = w.locator('.sortrow');
    await rows.nth(0).locator('button.chip', { hasText: 'GuardDuty' }).click();
    await rows.nth(1).locator('button.chip', { hasText: 'Macie' }).click();
    if ((await w.locator('.sortrow.correct').count()) !== 1 || (await w.locator('.sortrow.wrong').count()) !== 1) throw new Error('router verdicts');
    if (!/1 \/ 2 routed right/.test(await txt(w))) throw new Error('router score');
  },
  detectPair: async (p, B) => { await go(p, B + '#learn/ch9'); await qc(p, 'Macie', 'correct'); },
  hubDetPair: async (p, B) => { await go(p, B + '#learn/ch10'); await qc(p, 'Security Hub', 'wrong'); },
  cognitoFlow: async (p, B) => {
    await go(p, B + '#learn/ch11'); const w = p.locator('.widget', { hasText: 'Cognito · user pool vs identity pool' });
    if (!/Both/.test(await txt(w))) throw new Error('s3 flow uses both');
    for (let i = 0; i < 5; i++) await w.locator('button', { hasText: 'Next' }).click();
    if (!/Step 6 of 6/.test(await txt(w))) throw new Error('s3 steps');
    await w.locator('button.chip', { hasText: 'Protect a web app on an ALB' }).click(); if (!/User pool only/.test(await txt(w))) throw new Error('alb flow');
    await w.locator('button.chip', { hasText: 'Guests browse' }).click(); if (!/Identity pool only/.test(await txt(w))) throw new Error('guest flow');
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/flow/.test(t)) throw new Error('flow tooltip');
  },
  cognitoPair: async (p, B) => { await go(p, B + '#learn/ch11'); await qc(p, 'Identity pool', 'correct'); },
  securityMap: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('.mapbox g.mg text', { hasText: 'NETWORK FIREWALL' }).first().click(); await p.waitForTimeout(100); if ((await p.locator('.side h2').first().innerText()) !== 'Network Firewall') throw new Error('map select'); },
  triggerTable: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('input[type=search]').fill('snapshot'); const n = await p.locator('.widget tbody tr').count(); if (n < 1) throw new Error('rows ' + n); },
  progressCharts: async (p, B) => { await go(p, B + '#progress'); if ((await p.locator('.chart svg').count()) < 4) throw new Error('charts'); }
};
