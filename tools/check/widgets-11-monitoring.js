const go = async (p, url) => { await p.goto(url); await p.waitForTimeout(300); };
const txt = async l => (await l.innerText());
const tipOf = async (p, loc) => { await loc.scrollIntoViewIfNeeded(); await loc.hover(); await p.waitForTimeout(120); return p.locator('.tip').innerText(); };
const qc = async (p, label, want) => { const b = p.locator('.qcbtn', { hasText: label }).first(); await b.scrollIntoViewIfNeeded(); await b.click(); if (!(await p.locator('.qcbtn.' + want).count())) throw new Error('quick check ' + label); };
const sortAll = async (w, n) => { const rows = w.locator('.sortrow'); const k = await rows.count(); if (k !== n) throw new Error('rows ' + k); for (let i = 0; i < k; i++) await rows.nth(i).locator('button.chip').first().click(); await w.locator('button', { hasText: 'Check' }).click(); };
const steps = async (p, B, ch, title, n) => { await go(p, B + '#learn/' + ch); const w = p.locator('.widget', { hasText: title }); for (let i = 0; i < n - 1; i++) await w.locator('button', { hasText: 'Next' }).click(); if (!new RegExp('Step ' + n + ' of ' + n).test(await txt(w))) throw new Error('stepper ' + title); };
const pick = (w, group, label) => w.locator('.stubrow', { hasText: group }).locator('button.chip', { hasText: label }).first().click();
const sorter = (ch, title, n, right, what) => async (p, B) => { await go(p, B + '#learn/' + ch); const w = p.locator('.widget', { hasText: title }); await sortAll(w, n); const k = await w.locator('.sortrow.correct').count(); if (k !== right) throw new Error('expected ' + right + ' ' + what + ' right, got ' + k); };
const stat = async w => txt(w.locator('.stats').first());
module.exports = {
  whichChooser: async (p, B) => {
    await go(p, B + '#learn/ch2'); const w = p.locator('.widget', { hasText: 'Which tool answers this?' });
    await w.locator('.bigopt').first().click(); await w.locator('.bigopt').nth(1).click();
    if (!/The CloudWatch agent/.test(await txt(w.locator('.result')))) throw new Error('a number from inside the OS → the agent');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').nth(3).click();
    if (!/AWS CloudTrail/.test(await txt(w.locator('.result')))) throw new Error('who called an API → CloudTrail');
  },
  signalSorter: sorter('ch2', 'Metric, log, trace, API call, configuration or advice?', 12, 2, 'metric'),
  retention: async (p, B) => {
    await go(p, B + '#learn/ch3'); const w = p.locator('.widget', { hasText: 'Metric retention · what is left' });
    if (!/^5-minute\s*finest resolution/.test(await stat(w))) throw new Error('default 1 min / 40 days → 5-minute: ' + await stat(w));
    await pick(w, 'AGE OF THE DATA', /^10 days$/);
    if (!/^1-minute\s*finest/.test(await stat(w))) throw new Error('1 min / 10 days → 1-minute');
    await pick(w, 'AGE OF THE DATA', /^300 days$/);
    if (!/^1-hour\s*finest/.test(await stat(w))) throw new Error('1 min / 300 days → 1-hour');
    await pick(w, 'AGE OF THE DATA', /^500 days$/);
    if (!/^gone\s*finest/.test(await stat(w)) || !/455 days/.test(await txt(w.locator('.callout')))) throw new Error('500 days → gone');
    await pick(w, 'PUBLISHED', /^1 s$/); await pick(w, 'AGE OF THE DATA', /^2 hours$/);
    if (!/^1-second\s*finest/.test(await stat(w))) throw new Error('1 s / 2 hours → 1-second');
    await pick(w, 'PUBLISHED', /^5 min$/);
    if (!/^5-minute\s*finest/.test(await stat(w))) throw new Error('5 min / 2 hours → 5-minute');
    await p.waitForTimeout(150);
    const t = await tipOf(p, w.locator('.chart [data-tip]').nth(1)); if (!/1-minute data is kept for 15 days/.test(t)) throw new Error('retention tooltip: ' + t);
  },
  agentStepper: async (p, B) => steps(p, B, 'ch4', 'Memory and swap for a fleet, step by step', 5),
  agentSorter: sorter('ch4', 'Agent or no agent?', 10, 5, 'no-agent'),
  basicAgentPair: async (p, B) => { await go(p, B + '#learn/ch4'); await qc(p, 'CloudWatch agent', 'correct'); },
  alarmSim: async (p, B) => {
    await go(p, B + '#learn/ch5'); const w = p.locator('.widget', { hasText: 'Alarm evaluation · M out of N' });
    const s1 = () => txt(w.locator('.stats').nth(0)), s2 = () => txt(w.locator('.stats').nth(1));
    if (!/^OK\s*state at minute 8/.test(await s1()) || !/never\s*first ALARM/.test(await s1())) throw new Error('default 3 of 3 → OK, never: ' + await s1());
    await pick(w, 'DATAPOINTS TO ALARM', 'M = 2');
    if (!/^ALARM\s*state at minute 8/.test(await s1()) || !/minute 3\s*first ALARM/.test(await s1())) throw new Error('2 of 3 → ALARM, first at minute 3: ' + await s1());
    await pick(w, 'DATAPOINTS TO ALARM', 'M = 3'); await pick(w, 'EVALUATION PERIODS', 'N = 5');
    if (!/^ALARM\s*state at minute 8/.test(await s1()) || !/minute 5\s*first ALARM/.test(await s1())) throw new Error('3 of 5 → ALARM, first at minute 5: ' + await s1());
    await pick(w, 'DATAPOINTS TO ALARM', 'M = 1');
    if (!/minute 2\s*first ALARM/.test(await s1())) throw new Error('1 of 5 → first ALARM at minute 2 (M breaching points are enough before N exist): ' + await s1());
    if (!/^no data\s*alarm state: INSUFFICIENT_DATA/.test(await s2())) throw new Error('default AWS row 3 of 3, - - - - -, missing → INSUFFICIENT_DATA: ' + await s2());
    await pick(w, 'TREAT MISSING AS', /^breaching$/);
    if (!/^ALARM\s*alarm state/.test(await s2())) throw new Error('- - - - - breaching → ALARM');
    await pick(w, 'TREAT MISSING AS', /^ignore$/);
    if (!/^retain\s*alarm state/.test(await s2())) throw new Error('- - - - - ignore → retain current state');
    await pick(w, 'TABLE', '2 of 3'); await pick(w, 'DATA POINTS', '- - - - 0'); await pick(w, 'TREAT MISSING AS', /^missing$/);
    if (!/^OK\s*alarm state/.test(await s2())) throw new Error('2 of 3, - - - - 0, missing → OK');
    await pick(w, 'TREAT MISSING AS', /^breaching$/);
    if (!/^ALARM\s*alarm state/.test(await s2())) throw new Error('2 of 3, - - - - 0, breaching → ALARM');
    await pick(w, 'TABLE', '3 of 3'); await pick(w, 'DATA POINTS', '- - X - -'); await pick(w, 'TREAT MISSING AS', /^missing$/);
    if (!/^ALARM\s*alarm state/.test(await s2()) || !/premature/.test(await txt(w.locator('.callout').nth(1)))) throw new Error('3 of 3, - - X - -, missing → ALARM (premature rule)');
    if ((await w.locator('.stubrow', { hasText: 'DATA POINTS' }).locator('button.chip').count()) !== 5) throw new Error('only AWS’s five documented rows per table');
    await p.waitForTimeout(150);
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/Minute 1: 62/.test(t)) throw new Error('alarm tooltip: ' + t);
  },
  alarmEbPair: async (p, B) => { await go(p, B + '#learn/ch5'); await qc(p, 'EventBridge rule', 'correct'); },
  logsChooser: async (p, B) => {
    await go(p, B + '#learn/ch6'); const w = p.locator('.widget', { hasText: 'Where should these logs go?' });
    await w.locator('.bigopt').nth(1).click();
    if (!/Subscription filter/.test(await txt(w.locator('.result')))) throw new Error('within minutes → subscription filter');
    await w.locator('.crumbs button', { hasText: 'Start over' }).click(); await w.locator('.bigopt').nth(5).click();
    if (!/Export task to S3/.test(await txt(w.locator('.result')))) throw new Error('one-off archive → export task');
  },
  logStepper: async (p, B) => steps(p, B, 'ch6', 'From a log line to a page', 5),
  filterPair: async (p, B) => { await go(p, B + '#learn/ch6'); await qc(p, 'Subscription filter', 'correct'); },
  featureSorter: sorter('ch7', 'Which CloudWatch feature?', 8, 2, 'canary'),
  logsXrayPair: async (p, B) => { await go(p, B + '#learn/ch7'); await qc(p, 'AWS X-Ray', 'correct'); },
  eventSorter: sorter('ch8', 'Management, data or Insights event?', 9, 3, 'management'),
  trailWindow: async (p, B) => {
    await go(p, B + '#learn/ch8'); const w = p.locator('.widget', { hasText: 'Can you still answer it?' });
    if (!/^gone\s*Gone: event history keeps 90 days/.test(await stat(w))) throw new Error('default 91 days / management / nothing → gone: ' + await stat(w));
    await pick(w, 'AGE OF THE EVENT', /^60 days$/);
    if (!/^history\s*Event history/.test(await stat(w))) throw new Error('60 days, management, nothing → event history');
    await pick(w, 'AGE OF THE EVENT', /^400 days$/); await pick(w, 'SET UP BEFOREHAND', 'A trail to S3');
    if (!/^trail only\s*Only in the trail’s S3 logs/.test(await stat(w))) throw new Error('400 days with a trail → only in the trail');
    await pick(w, 'KIND OF EVENT', 'S3 object read or write'); await pick(w, 'AGE OF THE EVENT', /^10 days$/);
    if (!/^never\s*Never recorded/.test(await stat(w)) || !/data events/.test(await txt(w.locator('.callout')))) throw new Error('S3 object, trail without data events → never recorded');
    await pick(w, 'SET UP BEFOREHAND', 'A trail with data events');
    if (!/^trail only\s*Only in the trail’s S3 logs/.test(await stat(w))) throw new Error('S3 object with data events → only in the trail');
    await p.waitForTimeout(150);
    const t = await tipOf(p, w.locator('.chart [data-tip]').first()); if (!/90 days of management events/.test(t)) throw new Error('trail tooltip: ' + t);
  },
  historyPair: async (p, B) => { await go(p, B + '#learn/ch8'); await qc(p, 'Event history', 'correct'); },
  orgTrailStepper: async (p, B) => steps(p, B, 'ch8', 'An organization trail nobody can switch off', 5),
  trioPair: async (p, B) => { await go(p, B + '#learn/ch9'); await qc(p, 'CloudTrail', 'correct'); },
  trioSorter: sorter('ch9', 'CloudWatch, CloudTrail or Config?', 9, 3, 'CloudWatch'),
  ssmChooser: async (p, B) => {
    await go(p, B + '#learn/ch10'); const w = p.locator('.widget', { hasText: 'Which Systems Manager tool?' });
    await w.locator('.bigopt').nth(1).click();
    if (!/State Manager association/.test(await txt(w.locator('.result')))) throw new Error('keep it true → State Manager');
  },
  patchStepper: async (p, B) => steps(p, B, 'ch10', 'Patch 400 instances without SSH', 5),
  ssmSorter: sorter('ch10', 'Run Command, Patch Manager, State Manager, Automation or Session Manager?', 10, 2, 'Run Command'),
  patchPair: async (p, B) => { await go(p, B + '#learn/ch10'); await qc(p, 'Patch Manager', 'correct'); },
  adviceSorter: sorter('ch11', 'Trusted Advisor, Health, Service Quotas or Compute Optimizer?', 8, 2, 'Trusted Advisor'),
  taConfigPair: async (p, B) => { await go(p, B + '#learn/ch11'); await qc(p, 'AWS Config rules', 'correct'); },
  monitoringMap: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('.mapbox g.mg text', { hasText: 'CLOUDTRAIL' }).first().click(); await p.waitForTimeout(100); if ((await p.locator('.side h2').first().innerText()) !== 'CloudTrail') throw new Error('map select'); },
  triggerTable: async (p, B) => { await go(p, B + '#learn/ch12'); await p.locator('input[type=search]').fill('agent'); const n = await p.locator('.widget tbody tr').count(); if (n < 3) throw new Error('rows ' + n); },
  progressCharts: async (p, B) => { await go(p, B + '#progress'); if ((await p.locator('.chart svg').count()) < 3) throw new Error('charts'); }
};
