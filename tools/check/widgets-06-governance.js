const go = async (p, url) => { await p.goto(url); await p.waitForTimeout(300); };
const txt = async l => (await l.innerText());
const tipOf = async (p, loc) => { await loc.scrollIntoViewIfNeeded(); await loc.hover(); await p.waitForTimeout(120); return p.locator('.tip').innerText(); };
const qc = async (p, label, want) => { const b = p.locator('.qcbtn', { hasText: label }).first(); await b.scrollIntoViewIfNeeded(); await b.click(); if (!(await p.locator('.qcbtn.' + want).count())) throw new Error('quick check ' + label); };
const sortAll = async (w, n) => { const rows = w.locator('.sortrow'); const k = await rows.count(); if (k !== n) throw new Error('rows ' + k); for (let i = 0; i < k; i++) await rows.nth(i).locator('button.chip').first().click(); await w.locator('button', { hasText: 'Check' }).click(); };
module.exports = {
  stubTrainer: async (p, B) => {
    await go(p, B + '#learn/ch1'); const w = p.locator('.widget', { hasText: 'Stub trainer' }); const rows = w.locator('.stubrow');
    await rows.nth(0).locator('button.chip', { hasText: 'whole org' }).click();
    for (let i = 1; i < 4; i++) await rows.nth(i).locator('button.chip').first().click();
    await w.locator('button', { hasText: 'Reveal' }).click();
    if ((await w.locator('.vt.y').count()) < 3) throw new Error('SCOPE, CONTROL, WHO should be ✓');
  },
  whichServiceSorter: async (p, B) => {
    await go(p, B + '#learn/ch2'); const w = p.locator('.widget', { hasText: 'Which service answers this' });
    await sortAll(w, 12); if ((await w.locator('.sortrow.correct').count()) !== 2) throw new Error('expected 2 SCP right');
  },
  moveStepper: async (p, B) => { await go(p, B + '#learn/ch3'); const w = p.locator('.widget', { hasText: 'Move an account to another organization' }); for (let i = 0; i < 4; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!/Step 5 of 5/.test(await txt(w))) throw new Error('stepper'); },
  scpTree: async (p, B) => {
    await go(p, B + '#learn/ch4'); const w = p.locator('.widget', { hasText: 'SCP inheritance tree' });
    if (!/4 \/ 6/.test(await txt(w))) throw new Error('default ec2 us-east-1: expect 4 of 6 allowed, got ' + (await txt(w.locator('.stats'))));
    await w.locator('button.chip', { hasText: 'Launch EC2 in eu-west-1' }).click();
    if (!/6 \/ 6/.test(await txt(w))) throw new Error('eu-west-1 should be allowed everywhere');
    await w.locator('button.chip', { hasText: /^FullAWSAccess$/ }).click();
    if (!/4 \/ 6/.test(await txt(w))) throw new Error('removing Full on Workloads should deny Prod and Dev');
    await w.locator('button.chip', { hasText: 'Allow only EC2 + S3' }).click();
    if (!/6 \/ 6/.test(await txt(w))) throw new Error('allow list covers EC2');
    await w.locator('button.chip', { hasText: 'Create a DynamoDB table' }).click();
    if (!/4 \/ 6/.test(await txt(w)) || !/Allow-list strategy/.test(await txt(w))) throw new Error('allow list blocks DynamoDB');
    await w.locator('button.chip', { hasText: 'Management account' }).first().click();
    await w.locator('button.chip', { hasText: 'Leave the organization' }).click();
    const t = await tipOf(p, w.locator('.chart [data-tip]').nth(1)); if (!/SCPs never restrict/.test(t)) throw new Error('mgmt tooltip: ' + t);
    await w.locator('button', { hasText: 'Reset attachments' }).click();
  },
  scpRcpPair: async (p, B) => { await go(p, B + '#learn/ch4'); await qc(p, 'RCP', 'correct'); },
  policyEval: async (p, B) => {
    await go(p, B + '#learn/ch5'); const w = p.locator('.widget', { hasText: 'Policy evaluation simulator' });
    await w.locator('button.chip', { hasText: 'Same SCP, but the role is in the management account' }).click();
    if (!/Predict first/i.test(await txt(w))) throw new Error('predict step');
    await w.locator('button', { hasText: /^Allowed$/ }).click();
    if (!(await w.locator('.ok-t').count())) throw new Error('mgmt should be allowed');
    await w.locator('button.chip', { hasText: 'Cross-account: the bucket policy allows' }).click();
    await w.locator('button', { hasText: /^Allowed$/ }).click();
    if (!(await w.locator('.bad-t').count())) throw new Error('cross-account without identity policy should be denied');
    await w.locator('button.chip', { hasText: /^Allow$/ }).first().click();
    if (!/ALLOWED/.test(await txt(w.locator('.stats')))) throw new Error('both sides allow → allowed');
    await w.locator('button.chip', { hasText: /^leaves it out$/ }).first().click();
    if (!/Boundary/.test(await txt(w.locator('.stats')))) throw new Error('boundary should stop it');
    await w.locator('button.chip', { hasText: 'root user · member account' }).click();
    const t = await tipOf(p, w.locator('.chart [data-tip]').nth(1)); if (!/SCPs/.test(t)) throw new Error('gate tooltip: ' + t);
  },
  scpPbPair: async (p, B) => { await go(p, B + '#learn/ch5'); await qc(p, 'Permission boundary', 'correct'); },
  vendorStepper: async (p, B) => { await go(p, B + '#learn/ch6'); const w = p.locator('.widget', { hasText: 'Give a third-party vendor access' }); for (let i = 0; i < 4; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!/Step 5 of 5/.test(await txt(w))) throw new Error('stepper'); },
  roleRbpPair: async (p, B) => { await go(p, B + '#learn/ch6'); await qc(p, 'Resource-based policy', 'correct'); },
  conditionSorter: async (p, B) => { await go(p, B + '#learn/ch6'); const w = p.locator('.widget', { hasText: 'Which condition key' }); await sortAll(w, 8); if ((await w.locator('.sortrow.correct').count()) !== 2) throw new Error('expected 2 PrincipalOrgID right'); },
  whoChooser: async (p, B) => {
    await go(p, B + '#learn/ch7'); const w = p.locator('.widget', { hasText: 'Which identity service' });
    await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click();
    if (!/external IdP/.test(await txt(w.locator('.result')))) throw new Error('idc ext');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').nth(3).click();
    if (!/Roles Anywhere/.test(await txt(w.locator('.result')))) throw new Error('roles anywhere');
  },
  idcPair: async (p, B) => { await go(p, B + '#learn/ch7'); await qc(p, 'Cognito', 'wrong'); },
  controlTimeline: async (p, B) => {
    await go(p, B + '#learn/ch8'); const w = p.locator('.widget', { hasText: 'Control timeline' });
    if (!/detected, not fixed/.test(await txt(w))) throw new Error('default config');
    await w.locator('button.chip', { hasText: 'Proactive' }).click(); if (!/not caught/.test(await txt(w))) throw new Error('hook + console');
    await w.locator('button.chip', { hasText: 'CloudFormation stack' }).click(); if (!/prevented \(CloudFormation only\)/.test(await txt(w))) throw new Error('hook + cfn');
    await w.locator('button.chip', { hasText: 'Detective + auto-remediation' }).click(); if (!/detected and fixed/.test(await txt(w))) throw new Error('auto');
    await w.locator('button.chip', { hasText: 'Preventive · SCP' }).click(); if (!/prevented/.test(await txt(w))) throw new Error('scp');
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/Request/.test(t)) throw new Error('timeline tooltip: ' + t);
  },
  controlSorter: async (p, B) => { await go(p, B + '#learn/ch8'); const w = p.locator('.widget', { hasText: 'Preventive, detective or proactive' }); await sortAll(w, 10); if ((await w.locator('.sortrow.correct').count()) !== 4) throw new Error('expected 4 preventive right'); },
  ctPair: async (p, B) => { await go(p, B + '#learn/ch8'); await qc(p, 'Control Tower', 'correct'); },
  vpcShareStepper: async (p, B) => { await go(p, B + '#learn/ch9'); const w = p.locator('.widget', { hasText: 'Set up VPC sharing' }); for (let i = 0; i < 4; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!/Step 5 of 5/.test(await txt(w))) throw new Error('stepper'); },
  shareChooser: async (p, B) => {
    await go(p, B + '#learn/ch9'); const w = p.locator('.widget', { hasText: 'Share it with RAM' });
    await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click();
    if (!/VPC sharing/.test(await txt(w.locator('.result')))) throw new Error('vpc sharing');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').nth(1).click();
    if (!/Resource-based policy/.test(await txt(w.locator('.result')))) throw new Error('resource policy');
  },
  ramPair: async (p, B) => { await go(p, B + '#learn/ch9'); await qc(p, 'Transit Gateway', 'wrong'); },
  configStepper: async (p, B) => { await go(p, B + '#learn/ch10'); const w = p.locator('.widget', { hasText: 'Detect and fix public buckets' }); for (let i = 0; i < 4; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!/Step 5 of 5/.test(await txt(w))) throw new Error('stepper'); },
  cfgPair: async (p, B) => { await go(p, B + '#learn/ch10'); await qc(p, 'CloudTrail', 'correct'); },
  billingSim: async (p, B) => {
    await go(p, B + '#learn/ch11'); const w = p.locator('.widget', { hasText: 'Consolidated billing · RI and Savings Plans' });
    if (!/flows to B and C/.test(await txt(w))) throw new Error('default sharing');
    await w.locator('button.chip', { hasText: 'off for account A' }).click(); if (!/wasted/.test(await txt(w))) throw new Error('off for A');
    await w.locator('button.chip', { hasText: '12 instances' }).click(); await w.locator('button.chip', { hasText: '60%' }).click();
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/per hour/.test(t)) throw new Error('bill tooltip: ' + t);
  },
  tagPair: async (p, B) => { await go(p, B + '#learn/ch11'); await qc(p, 'SCP with tag condition', 'correct'); },
  orgMap: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('.mapbox g.mg text', { hasText: 'RAM · SHARING' }).first().click(); await p.waitForTimeout(100); if ((await p.locator('.side h2').first().innerText()) !== 'RAM · resource sharing') throw new Error('map select'); },
  triggerTable: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('input[type=search]').fill('SCP'); const n = await p.locator('.widget tbody tr').count(); if (n < 3) throw new Error('rows ' + n); },
  progressCharts: async (p, B) => { await go(p, B + '#progress'); if ((await p.locator('.chart svg').count()) < 4) throw new Error('charts'); }
};
