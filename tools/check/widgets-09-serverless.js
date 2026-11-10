const go = async (p, url) => { await p.goto(url); await p.waitForTimeout(300); };
const txt = async l => (await l.innerText());
const tipOf = async (p, loc) => { await loc.scrollIntoViewIfNeeded(); await loc.hover(); await p.waitForTimeout(120); return p.locator('.tip').innerText(); };
const qc = async (p, label, want) => { const b = p.locator('.qcbtn', { hasText: label }).first(); await b.scrollIntoViewIfNeeded(); await b.click(); if (!(await p.locator('.qcbtn.' + want).count())) throw new Error('quick check ' + label); };
const sortAll = async (w, n) => { const rows = w.locator('.sortrow'); const k = await rows.count(); if (k !== n) throw new Error('rows ' + k); for (let i = 0; i < k; i++) await rows.nth(i).locator('button.chip').first().click(); await w.locator('button', { hasText: 'Check' }).click(); };
const steps = async (p, B, ch, title, n) => { await go(p, B + '#learn/' + ch); const w = p.locator('.widget', { hasText: title }); for (let i = 0; i < n - 1; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!new RegExp('Step ' + n + ' of ' + n).test(await txt(w))) throw new Error('stepper ' + title); };
module.exports = {
  integrationChooser: async (p, B) => {
    await go(p, B + '#learn/ch2'); const w = p.locator('.widget', { hasText: 'Which integration service?' });
    await w.locator('.bigopt').first().click(); await w.locator('.bigopt').first().click();
    if (!/SQS standard queue/.test(await txt(w.locator('.result')))) throw new Error('task → standard queue');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').nth(3).click(); await w.locator('.bigopt').nth(1).click();
    if (!/Amazon Data Firehose/.test(await txt(w.locator('.result')))) throw new Error('stream, nobody reads → Firehose');
  },
  familySorter: async (p, B) => { await go(p, B + '#learn/ch2'); const w = p.locator('.widget', { hasText: 'Queue, topic, bus or stream?' }); await sortAll(w, 12); if ((await w.locator('.sortrow.correct').count()) !== 3) throw new Error('expected 3 SQS right'); },
  sqsSnsPair: async (p, B) => { await go(p, B + '#learn/ch2'); await qc(p, 'Amazon SNS', 'correct'); },
  stdFifoPair: async (p, B) => { await go(p, B + '#learn/ch3'); await qc(p, 'FIFO queue', 'correct'); },
  visTimeout: async (p, B) => {
    await go(p, B + '#learn/ch3'); const w = p.locator('.widget', { hasText: 'Visibility timeout · duplicates' });
    const st = await txt(w.locator('.stats'));
    if (!/3\s*receives/.test(st) || !/2\s*duplicate/.test(st) || !/never\s*moved to the DLQ/.test(st)) throw new Error('default 90 s vs 30 s: ' + st);
    await w.locator('button.chip', { hasText: 'always fails (poison)' }).click();
    if (!/1\.5 min\s*moved to the DLQ/.test(await txt(w.locator('.stats')))) throw new Error('poison, 3 receives → DLQ at 90 s');
    await w.locator('button.chip', { hasText: /^10 min$/ }).click(); await w.locator('button.chip', { hasText: 'processes fine' }).click();
    if (!/1\s*receives/.test(await txt(w.locator('.stats')))) throw new Error('10 min timeout → 1 receive');
    await w.locator('button.chip', { hasText: /^1$/ }).click(); await w.locator('button.chip', { hasText: /^5 min$/ }).click(); await w.locator('button.chip', { hasText: /^30 s/ }).click();
    if (!/30 s\s*moved to the DLQ/.test(await txt(w.locator('.stats')))) throw new Error('maxReceiveCount 1, 5 min work, 30 s timeout → healthy message in DLQ at 30 s');
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/Receive 1/.test(t)) throw new Error('visibility tooltip: ' + t);
    if (/deletes the message/.test(t) || !/DLQ/.test(t)) throw new Error('healthy message in the DLQ: tooltip still says it is deleted: ' + t);
  },
  fanoutStepper: async (p, B) => steps(p, B, 'ch4', 'Fan-out with per-subscriber queues', 5),
  snsEbPair: async (p, B) => { await go(p, B + '#learn/ch5'); await qc(p, 'Amazon EventBridge', 'correct'); },
  ebSorter: async (p, B) => { await go(p, B + '#learn/ch5'); const w = p.locator('.widget', { hasText: 'Rule, pipe or schedule?' }); await sortAll(w, 8); if ((await w.locator('.sortrow.correct').count()) !== 3) throw new Error('expected 3 rules right'); },
  shardCalc: async (p, B) => {
    await go(p, B + '#learn/ch6'); const w = p.locator('.widget', { hasText: 'Shard calculator' });
    const st = await txt(w.locator('.stats'));
    if (!/^10\s*shards needed for writes/.test(st) || !/15\s*shards needed with these readers/.test(st)) throw new Error('default 5,000 × 2 KB, 3 shared → 10 / 15: ' + st);
    await w.locator('button.chip', { hasText: /^5$/ }).click();
    const st5 = await txt(w.locator('.stats'));
    if (!/25\s*shards needed with these readers/.test(st5) || !/0\.4 MB\/s\s*read per consumer per shard/.test(st5)) throw new Error('5 shared consumers × 10 MB/s → 25 shards, 0.4 MB/s each: ' + st5);
    await w.locator('button.chip', { hasText: 'enhanced fan-out' }).click();
    if (!/10\s*shards needed with these readers/.test(await txt(w.locator('.stats')))) throw new Error('EFO → readers need no extra shards');
    await w.locator('button.chip', { hasText: /^50 KB$/ }).click();
    if (!/^250\s*shards needed for writes/.test(await txt(w.locator('.stats')))) throw new Error('5,000 × 50 KB → 250 shards');
    await w.locator('button.chip', { hasText: /^0\.5 KB$/ }).click(); await w.locator('button.chip', { hasText: /^20,000$/ }).click();
    if (!/^20\s*shards needed for writes/.test(await txt(w.locator('.stats')))) throw new Error('20,000 × 0.5 KB → 20 shards by record count');
    if (!/the record count \(20,000\/s\) decides/.test(await txt(w.locator('.callout')))) throw new Error('20,000 × 0.5 KB: the record count decides');
    await w.locator('button.chip', { hasText: /^500$/ }).click();
    const tie = await txt(w.locator('.callout'));
    if (!/^1\s*shards? needed for writes/.test(await txt(w.locator('.stats'))) || !/one shard covers both limits/.test(tie) || /the data rate .* decides/.test(tie)) throw new Error('500 × 0.5 KB fits one shard on both limits: ' + tie);
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/write data per shard/.test(t)) throw new Error('shard tooltip: ' + t);
  },
  kdsSqsPair: async (p, B) => { await go(p, B + '#learn/ch6'); await qc(p, 'Kinesis Data Streams', 'correct'); },
  firehoseStepper: async (p, B) => steps(p, B, 'ch7', 'Clickstream to S3 with Firehose', 5),
  kdsFirehosePair: async (p, B) => { await go(p, B + '#learn/ch7'); await qc(p, 'Amazon Data Firehose', 'correct'); },
  sfnTypesPair: async (p, B) => { await go(p, B + '#learn/ch9'); await qc(p, 'Standard workflow', 'correct'); },
  approvalStepper: async (p, B) => steps(p, B, 'ch9', 'Order workflow with a human approval', 5),
  glueEmrPair: async (p, B) => { await go(p, B + '#learn/ch10'); await qc(p, 'AWS Glue', 'correct'); },
  scanCost: async (p, B) => {
    await go(p, B + '#learn/ch11'); const w = p.locator('.widget', { hasText: 'Athena scan cost' });
    const st = await txt(w.locator('.stats'));
    if (!/10 TB\s*scanned per query/.test(st) || !/\$50\.00\s*per query/.test(st)) throw new Error('default 10 TB CSV → $50.00: ' + st);
    await w.locator('button.chip', { hasText: 'Parquet, 3:1' }).click();
    if (!/\$4\.17\s*per query/.test(await txt(w.locator('.stats')))) throw new Error('Parquet, 1 of 4 columns → $4.17');
    await w.locator('button.chip', { hasText: 'one day of 365' }).click();
    if (!/2\.3 GB\s*scanned per query/.test(await txt(w.locator('.stats')))) throw new Error('one day of 365 → 2.3 GB');
    await w.locator('button.chip', { hasText: /^all$/ }).click();
    if (!/9\.1 GB\s*scanned per query/.test(await txt(w.locator('.stats')))) throw new Error('Parquet, all columns, one day of 10 TB → 9.1 GB');
    await w.locator('button.chip', { hasText: /^50 TB$/ }).click();
    const st50 = await txt(w.locator('.stats'));
    if (!/45\.7 GB\s*scanned per query/.test(st50) || !/\$0\.2283\s*per query/.test(st50)) throw new Error('50 TB, Parquet, all columns, one day → 45.7 GB, $0.2283: ' + st50);
    await w.locator('button.chip', { hasText: /^3 of 40$/ }).click();
    if (!/3\.4 GB\s*scanned per query/.test(await txt(w.locator('.stats')))) throw new Error('50 TB, Parquet, 3 of 40 columns, one day → 3.4 GB');
    await p.waitForTimeout(150);
    const widths = await w.locator('.chart rect.barr').evaluateAll(rs => rs.map(r => +r.getAttribute('width')));
    if (widths.length !== 3 || widths.some(x => !(x >= 2))) throw new Error('every non-zero scan draws a visible bar: ' + widths.join(', '));
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/CSV, uncompressed/.test(t)) throw new Error('scan tooltip: ' + t);
  },
  athenaRedshiftPair: async (p, B) => { await go(p, B + '#learn/ch11'); await qc(p, 'Amazon Athena', 'correct'); },
  integrationMap: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('.mapbox g.mg text', { hasText: 'EVENTBRIDGE' }).first().click(); await p.waitForTimeout(100); if ((await p.locator('.side h2').first().innerText()) !== 'EventBridge · Pipes · Scheduler') throw new Error('map select'); },
  triggerTable: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('input[type=search]').fill('SQS'); const n = await p.locator('.widget tbody tr').count(); if (n < 3) throw new Error('rows ' + n); },
  progressCharts: async (p, B) => { await go(p, B + '#progress'); if ((await p.locator('.chart svg').count()) < 3) throw new Error('charts'); }
};
