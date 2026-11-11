const go = async (p, url) => { await p.goto(url); await p.waitForTimeout(300); };
const txt = async l => (await l.innerText());
const tipOf = async (p, loc) => { await loc.scrollIntoViewIfNeeded(); await loc.hover(); await p.waitForTimeout(120); return p.locator('.tip').innerText(); };
const qc = async (p, label, want) => { const b = p.locator('.qcbtn', { hasText: label }).first(); await b.scrollIntoViewIfNeeded(); await b.click(); if (!(await p.locator('.qcbtn.' + want).count())) throw new Error('quick check ' + label); };
const sortAll = async (w, n) => { const rows = w.locator('.sortrow'); const k = await rows.count(); if (k !== n) throw new Error('rows ' + k); for (let i = 0; i < k; i++) await rows.nth(i).locator('button.chip').first().click(); await w.locator('button', { hasText: 'Check' }).click(); };
const steps = async (p, B, ch, title, n) => { await go(p, B + '#learn/' + ch); const w = p.locator('.widget', { hasText: title }); for (let i = 0; i < n - 1; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!new RegExp('Step ' + n + ' of ' + n).test(await txt(w))) throw new Error('stepper ' + title); };
const pick = (w, group, label) => w.locator('.stubrow', { hasText: group }).locator('button.chip', { hasText: label }).first().click();
module.exports = {
  computeChooser: async (p, B) => {
    await go(p, B + '#learn/ch2'); const w = p.locator('.widget', { hasText: 'Which compute?' });
    await w.locator('.bigopt').first().click(); await w.locator('.bigopt').nth(1).click();
    if (!/ECS service on AWS Fargate/.test(await txt(w.locator('.result')))) throw new Error('service, containers, no servers → ECS on Fargate');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').nth(2).click(); await w.locator('.bigopt').nth(1).click();
    if (!/A Fargate task started by the event/.test(await txt(w.locator('.result')))) throw new Error('event, longer than 15 minutes → Fargate task');
  },
  familySorter: async (p, B) => { await go(p, B + '#learn/ch2'); const w = p.locator('.widget', { hasText: 'EC2, containers, Lambda or Batch?' }); await sortAll(w, 12); if ((await w.locator('.sortrow.correct').count()) !== 3) throw new Error('expected 3 EC2 right'); },
  instanceSorter: async (p, B) => { await go(p, B + '#learn/ch3'); const w = p.locator('.widget', { hasText: 'Which instance family?' }); await sortAll(w, 8); if ((await w.locator('.sortrow.correct').count()) !== 2) throw new Error('expected 2 general purpose right'); },
  dhostPair: async (p, B) => { await go(p, B + '#learn/ch3'); await qc(p, 'Dedicated Host', 'correct'); },
  placementPair: async (p, B) => { await go(p, B + '#learn/ch4'); await qc(p, 'Spread placement group', 'correct'); },
  optionChooser: async (p, B) => {
    await go(p, B + '#learn/ch5'); const w = p.locator('.widget', { hasText: 'Which purchase option?' });
    await w.locator('.bigopt').first().click();
    if (!/Spot Instances/.test(await txt(w.locator('.result')))) throw new Error('interruptible → Spot');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').nth(1).click(); await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click();
    if (!/Compute Savings Plan/.test(await txt(w.locator('.result')))) throw new Error('steady, may change → Compute Savings Plan');
  },
  spRiPair: async (p, B) => { await go(p, B + '#learn/ch5'); await qc(p, 'Compute Savings Plan', 'correct'); },
  mixCalc: async (p, B) => {
    await go(p, B + '#learn/ch6'); const w = p.locator('.widget', { hasText: 'Mixed instances · On-Demand base' });
    const st = await txt(w.locator('.stats'));
    if (!/^15\s*On-Demand/.test(st) || !/(^|\n)5\s*Spot/.test(st)) throw new Error('default size 20, base 10, 50% → 15 On-Demand, 5 Spot: ' + st);
    await pick(w, 'ON-DEMAND BASE', /^0$/); await pick(w, 'ON-DEMAND % ABOVE BASE', /^60%$/); await pick(w, 'GROUP SIZE', /^10$/);
    const st2 = await txt(w.locator('.stats'));
    if (!/^6\s*On-Demand/.test(st2) || !/(^|\n)4\s*Spot/.test(st2)) throw new Error('base 0, 60% at size 10 → 6 and 4: ' + st2);
    await pick(w, 'ON-DEMAND % ABOVE BASE', /^100%$/);
    if (!/(^|\n)0\s*Spot/.test(await txt(w.locator('.stats')))) throw new Error('100% On-Demand → no Spot');
    await pick(w, 'ON-DEMAND % ABOVE BASE', /^50%$/); await pick(w, 'GROUP SIZE', /^15$/);
    const st3 = await txt(w.locator('.stats'));
    if (!/^8\s*On-Demand/.test(st3) || !/(^|\n)7\s*Spot/.test(st3) || !/rounds up/.test(await txt(w.locator('.callout')))) throw new Error('base 0, 50% at size 15 → 8 and 7, rounded up: ' + st3);
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/Group size 10/.test(t)) throw new Error('mix tooltip: ' + t);
  },
  spotStepper: async (p, B) => steps(p, B, 'ch6', 'A Spot interruption, step by step', 5),
  policySorter: async (p, B) => { await go(p, B + '#learn/ch7'); const w = p.locator('.widget', { hasText: 'Which scaling policy?' }); await sortAll(w, 8); if ((await w.locator('.sortrow.correct').count()) !== 2) throw new Error('expected 2 target tracking right'); },
  backlogCalc: async (p, B) => {
    await go(p, B + '#learn/ch7'); const w = p.locator('.widget', { hasText: 'Backlog per instance · scaling workers' });
    const st = await txt(w.locator('.stats'));
    if (!/100\s*target per instance/.test(st) || !/150\s*backlog per instance now/.test(st) || !/15 \(\+5\)\s*instances needed/.test(st)) throw new Error('default 1,500 / 10 / 0.1 s / 10 s → 100, 150, +5: ' + st);
    await pick(w, 'MESSAGES VISIBLE', /^6,000$/); await pick(w, 'ACCEPTABLE LATENCY', /^60 s$/);
    if (!/10 \(±0\)\s*instances needed/.test(await txt(w.locator('.stats'))) || !/holds/.test(await txt(w.locator('.callout')))) throw new Error('6,000 messages, 60 s → target 600, hold at 10');
    await pick(w, 'MESSAGES VISIBLE', /^300$/); await pick(w, 'ACCEPTABLE LATENCY', /^10 s$/);
    if (!/3 \(-7\)\s*instances needed/.test(await txt(w.locator('.stats'))) || !/scale in by 7/.test(await txt(w.locator('.callout')))) throw new Error('300 messages, target 100 → 3 instances, scale in by 7');
    await pick(w, 'SECONDS PER MESSAGE', /^0\.5 s$/); await pick(w, 'INSERVICE INSTANCES', /^5$/);
    if (!/20\s*target per instance/.test(await txt(w.locator('.stats')))) throw new Error('10 s / 0.5 s → target 20');
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/Backlog per instance/.test(t)) throw new Error('backlog tooltip: ' + t);
  },
  scalingPair: async (p, B) => { await go(p, B + '#learn/ch7'); await qc(p, 'Predictive scaling', 'correct'); },
  lbChooser: async (p, B) => {
    await go(p, B + '#learn/ch8'); const w = p.locator('.widget', { hasText: 'Which load balancer?' });
    await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click();
    if (!/Application Load Balancer/.test(await txt(w.locator('.result')))) throw new Error('HTTP + path → ALB');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').nth(1).click();
    if (!/Network Load Balancer/.test(await txt(w.locator('.result')))) throw new Error('TCP/UDP → NLB');
  },
  crossZone: async (p, B) => {
    await go(p, B + '#learn/ch8'); const w = p.locator('.widget', { hasText: 'Cross-zone load balancing · share' });
    const st = await txt(w.locator('.stats'));
    if (!/25%\s*per target in AZ a/.test(st) || !/6\.25%\s*per target in AZ b/.test(st)) throw new Error('default NLB off, 2 and 8 → 25% and 6.25%: ' + st);
    await p.waitForTimeout(150);
    const hs = await w.locator('.chart rect.barr').evaluateAll(rs => rs.map(r => +r.getAttribute('height')));
    if (hs.length !== 10 || hs.some(x => !(x >= 2))) throw new Error('one visible bar per target: ' + hs.join(', '));
    await pick(w, 'CROSS-ZONE', /^on$/);
    if (!/10%\s*per target in AZ a/.test(await txt(w.locator('.stats')))) throw new Error('cross-zone on → 10% each');
    await pick(w, 'LOAD BALANCER', 'Network Load Balancer');
    if (!/25%\s*per target in AZ a/.test(await txt(w.locator('.stats')))) throw new Error('choosing NLB resets cross-zone to its default (off)');
    await pick(w, 'LOAD BALANCER', 'Application Load Balancer');
    if (!/10%\s*per target in AZ a/.test(await txt(w.locator('.stats'))) || !/always on/.test(await txt(w.locator('.callout')))) throw new Error('choosing ALB sets cross-zone on');
    await pick(w, 'TARGETS IN AZ A', /^5$/); await pick(w, 'TARGETS IN AZ B', /^5$/); await pick(w, 'CROSS-ZONE', /^off$/);
    if (!/10%\s*per target in AZ a/.test(await txt(w.locator('.stats')))) throw new Error('5 and 5, off → 10% each');
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/Target 1 in AZ a/.test(t)) throw new Error('cross-zone tooltip: ' + t);
  },
  albNlbPair: async (p, B) => { await go(p, B + '#learn/ch8'); await qc(p, 'Network Load Balancer', 'correct'); },
  ecsEksPair: async (p, B) => { await go(p, B + '#learn/ch9'); await qc(p, 'Amazon EKS', 'correct'); },
  fargateStepper: async (p, B) => steps(p, B, 'ch9', 'A service on Fargate behind an ALB', 5),
  lambdaFargatePair: async (p, B) => { await go(p, B + '#learn/ch10'); await qc(p, 'Fargate task', 'correct'); },
  deploySorter: async (p, B) => { await go(p, B + '#learn/ch11'); const w = p.locator('.widget', { hasText: 'Which deployment policy?' }); await sortAll(w, 6); if ((await w.locator('.sortrow.correct').count()) !== 1) throw new Error('expected 1 all at once right'); },
  batchStepper: async (p, B) => steps(p, B, 'ch11', 'A nightly job on Spot with AWS Batch', 5),
  batchLambdaPair: async (p, B) => { await go(p, B + '#learn/ch11'); await qc(p, 'AWS Batch', 'correct'); },
  computeMap: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('.mapbox g.mg text', { hasText: 'LOAD BALANCERS' }).first().click(); await p.waitForTimeout(100); if ((await p.locator('.side h2').first().innerText()) !== 'ELB: ALB · NLB · GWLB') throw new Error('map select'); },
  triggerTable: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('input[type=search]').fill('Spot'); const n = await p.locator('.widget tbody tr').count(); if (n < 3) throw new Error('rows ' + n); },
  progressCharts: async (p, B) => { await go(p, B + '#progress'); if ((await p.locator('.chart svg').count()) < 3) throw new Error('charts'); }
};
