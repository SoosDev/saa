const go = async (p, url) => { await p.goto(url); await p.waitForTimeout(300); };
const txt = async l => (await l.innerText());
module.exports = {
  stubTrainer: async (p, B) => { await go(p, B + '#learn/ch1'); const w = p.locator('.widget', { hasText: 'Stub trainer' }); const rows = w.locator('.stubrow'); for (let i = 0; i < 4; i++) await rows.nth(i).locator('button.chip').first().click(); await w.locator('button', { hasText: 'Reveal' }).click(); if (!(await w.locator('.vt').count())) throw new Error('no reveal'); },
  cidrCalc: async (p, B) => {
    await go(p, B + '#learn/ch2'); const w = p.locator('.widget', { hasText: 'CIDR calculator' });
    if (!/too small/.test(await txt(w))) throw new Error('K1 preset /26 should be too small');
    if (!/smallest size that fits is \/25/.test(await txt(w))) throw new Error('should suggest /25');
    await w.locator('select').selectOption('25'); if (!/\/25 fits/.test(await txt(w))) throw new Error('/25 should fit');
    if (!/123/.test(await txt(w))) throw new Error('123 usable');
    await w.locator('button.chip', { hasText: 'overlapping' }).click(); if (!/Overlap: peering fails/.test(await txt(w))) throw new Error('overlap');
    await w.locator('button.chip', { hasText: 'Q7' }).click(); if (!/peering is possible/.test(await txt(w))) throw new Error('no overlap');
    const inp = w.locator('input[type=text]').first(); await inp.fill('10.0.0.18/28'); await inp.press('Enter'); await p.waitForTimeout(100);
    if (!/canonical form/.test(await txt(p.locator('.widget', { hasText: 'CIDR calculator' })))) throw new Error('canonical');
    const blk = p.locator('.widget', { hasText: 'CIDR calculator' }).locator('.chart [data-tip]').first(); await blk.scrollIntoViewIfNeeded(); await blk.hover(); await p.waitForTimeout(100);
    if (!/network address/.test(await p.locator('.tip').innerText())) throw new Error('reserved tooltip');
  },
  packetWalker: async (p, B) => {
    await go(p, B + '#learn/ch4'); const w = p.locator('.widget', { hasText: 'Packet walker' });
    for (let i = 0; i < 4; i++) { const n = w.locator('button', { hasText: 'Next hop' }); if (await n.isDisabled()) break; await n.click(); }
    if (!/Dropped/i.test(await txt(w))) throw new Error('broken flow should drop');
    await w.locator('button', { hasText: 'Apply the fix' }).click();
    for (let i = 0; i < 4; i++) { const n = w.locator('button', { hasText: 'Next hop' }); if (await n.isDisabled()) break; await n.click(); }
    if (!/Delivered/i.test(await txt(w))) throw new Error('fixed flow should deliver');
    await w.locator('button.chip', { hasText: 'deny rule 200' }).click();
    for (let i = 0; i < 4; i++) { const n = w.locator('button', { hasText: 'Next hop' }); if (await n.isDisabled()) break; await n.click(); }
    if (!/matches first/.test(await txt(w))) throw new Error('rule order lesson');
  },
  bastionStepper: async (p, B) => { await go(p, B + '#learn/ch5'); const w = p.locator('.widget', { hasText: 'Build a bastion' }); for (let i = 0; i < 3; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!/Step 4 of 4/.test(await txt(w))) throw new Error('stepper'); },
  accessPair: async (p, B) => { await go(p, B + '#learn/ch5'); await p.locator('.qcbtn', { hasText: 'Session Manager' }).first().click(); if (!(await p.locator('.qcbtn.correct').count())) throw new Error('qc'); },
  routeSim: async (p, B) => {
    await go(p, B + '#learn/ch6'); const w = p.locator('.widget', { hasText: 'Route simulator' });
    if (!/not transitive/.test(await txt(w))) throw new Error('B→C should be blocked');
    await w.locator('button.chip', { hasText: 'add B–C peering' }).click(); if (!/Traffic flows/i.test(await txt(w))) throw new Error('B–C peered should flow');
    await w.locator('.stubrow', { hasText: 'TO' }).locator('button.chip', { hasText: 'internet' }).click(); if (!/edge-to-edge/.test(await txt(w))) throw new Error('edge-to-edge');
    await w.locator('button.chip', { hasText: 'Transit gateway' }).click(); if (!/Centralised egress/.test(await txt(w))) throw new Error('tgw egress');
    await w.locator('.stubrow', { hasText: 'TO' }).locator('button.chip', { hasText: 'VPC C' }).click();
    await w.locator('button.chip', { hasText: 'one shared route table' }).click(); if (!/segmentation/.test(await txt(w))) throw new Error('segmentation');
  },
  peerTgwPair: async (p, B) => { await go(p, B + '#learn/ch7'); await p.locator('.qcbtn', { hasText: 'VPC peering' }).first().click(); if (!(await p.locator('.qcbtn.correct').count())) throw new Error('qc'); },
  endpointChooser: async (p, B) => {
    await go(p, B + '#learn/ch8'); const w = p.locator('.widget', { hasText: 'Endpoint chooser' });
    await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click(); await w.locator('.bigopt').nth(1).click();
    if (!/Interface VPC endpoint for S3/.test(await txt(w.locator('.result')))) throw new Error('on-prem S3');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click();
    if (!/Gateway VPC endpoint/.test(await txt(w.locator('.result')))) throw new Error('gateway');
  },
  vpnStepper: async (p, B) => { await go(p, B + '#learn/ch9'); const w = p.locator('.widget', { hasText: 'Site-to-Site VPN, step by step' }); for (let i = 0; i < 4; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!/Step 5 of 5/.test(await txt(w))) throw new Error('stepper'); },
  hybridCalc: async (p, B) => {
    await go(p, B + '#learn/ch10'); const w = p.locator('.widget', { hasText: 'Hybrid link chooser' });
    if (!/Dedicated Direct Connect 1 Gbps/.test(await txt(w))) throw new Error('default DX 1G');
    await w.locator('button.chip', { hasText: 'in days' }).click(); if (!/Site-to-Site VPN now/.test(await txt(w))) throw new Error('days → VPN');
    await w.locator('button.chip', { hasText: 'in 3+ months' }).click(); await w.locator('button.chip', { hasText: /^10 Gbps$/ }).click(); await w.locator('button.chip', { hasText: 'encrypted in transit' }).click();
    if (!/MACsec/.test(await txt(w))) throw new Error('10G encrypted → MACsec');
    const bar = w.locator('.chart [data-tip]').nth(3); await bar.scrollIntoViewIfNeeded(); await bar.hover(); await p.waitForTimeout(100);
    if (!/400/.test(await p.locator('.tip').innerText())) throw new Error('chart tooltip');
  },
  vpnDxPair: async (p, B) => { await go(p, B + '#learn/ch10'); await p.locator('.qcbtn', { hasText: 'Direct Connect' }).first().click(); if (!(await p.locator('.qcbtn.wrong').count())) throw new Error('qc wrong'); },
  prestigeSorter: async (p, B) => { await go(p, B + '#learn/ch11'); const w = p.locator('.widget', { hasText: 'Needed or prestige' }); const rows = w.locator('.sortrow'); const n = await rows.count(); for (let i = 0; i < n; i++) await rows.nth(i).locator('button.chip').nth(1).click(); await w.locator('button', { hasText: 'Check' }).click(); if ((await w.locator('.sortrow.correct').count()) !== 4) throw new Error('expected 4 prestige right'); },
  networkMap: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('.mapbox g.mg text', { hasText: 'DIRECT CONNECT' }).first().click(); await p.waitForTimeout(100); if ((await p.locator('.side h2').first().innerText()) !== 'Direct Connect') throw new Error('map select'); },
  triggerTable: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('input[type=search]').fill('bastion'); const n = await p.locator('.widget tbody tr').count(); if (n < 1) throw new Error('rows ' + n); },
  progressCharts: async (p, B) => { await go(p, B + '#progress'); if ((await p.locator('.chart svg').count()) < 4) throw new Error('charts'); }
};
