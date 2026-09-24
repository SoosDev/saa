/* Sessions list + hub content. Adding a session = one entry here + sessions/<id>/.
   totals feed the hub's mastery bars: chapters + drills + cards. */
window.SAA_SESSIONS = [
  { id: '01-storage', n: 1, title: 'Storage & data movement', domains: 'D1 D2 D3 D4', path: 'sessions/01-storage/', totals: { chapters: 12, drills: 42, cards: 52 } },
  { id: '02-migration', n: 2, title: 'Migration & hybrid', domains: 'D1 D2 D3 D4', path: 'sessions/02-migration/', totals: { chapters: 10, drills: 30, cards: 40 } },
  { id: '03-networking', n: 3, title: 'Networking & connectivity', soon: true, start: 'weak' },
  { id: '04-global', n: 4, title: 'Global architecture & edge', soon: true, start: 'weak' },
  { id: '05-security', n: 5, title: 'Security services & identity', soon: true, start: 'mixed' },
  { id: '06-governance', n: 6, title: 'Multi-account & governance', soon: true, start: 'weak' },
  { id: '07-ha-dr', n: 7, title: 'HA & disaster recovery', soon: true, start: 'mixed' },
  { id: '08-databases', n: 8, title: 'Databases & caching', soon: true, start: 'mixed' },
  { id: '09-serverless', n: 9, title: 'Serverless, events, integration & analytics', soon: true, start: 'mixed' },
  { id: '10-compute', n: 10, title: 'Compute & scaling', soon: true, start: 'strong' },
  { id: '11-monitoring', n: 11, title: 'Monitoring & operations', soon: true, start: 'weak' },
  { id: '12-cost', n: 12, title: 'Cost & purchasing', soon: true, start: 'mixed' },
  { id: '13-integration', n: 13, title: 'Integration drill', soon: true, start: '—' }
];

window.SAA_HUB = {
  eyebrow: 'SAA-C03 · 13 sessions',
  title: 'SAA Transit Maps',
  lead: 'Every family of look-alike services is a coloured transit line with one verb. Each session is the full lesson, then drills that make you write the constraint stub before the options unlock, and trigger cards on spaced repetition. The goal is a stable 80%+.',

  diagnosis: {
    title: 'Your diagnosis',
    lead: 'Baseline practice exam, 2 Sept 2026: 29 wrong. Your own tags said F=17, C=11, R=1. After re-reading every question, the real split is below.',
    chartTitle: 'Why the 29 misses happened',
    chartCap: 'Ink bars; hover for the questions. Fact gaps are only a third of the problem.',
    rows: [
      { tag: 'F/L', name: 'fact or limit gap', n: 9, qs: 'Q7 (peering not transitive), Q11, Q33 (EBS AZ scope), Q40 (SWF), Q44 (CW agent for swap), Q53 (S3 website + R53), Q61 (Multi-AZ CNAME), +Q22, Q47' },
      { tag: 'C', name: 'confused similar', n: 9, qs: 'Q1 (Firehose vs Lambda), Q4 (CloudFront vs S3 TA), Q8 (DataSync vs Gateway), Q12, Q54 (truck), Q29 (DLM vs Backup), Q56 (DataSync vs DMS), +Q22, Q47, Q58' },
      { tag: 'K', name: 'missed keyword', n: 6, qs: 'Q41 “tape”, Q43 “path/host-based routing” → ALB, Q49 “config changes” → Config, Q50 “least ops” → Glue, Q57 “big data + SQL/BI” → EMR + Redshift, Q18' },
      { tag: 'A/R', name: 'reasoning / misread', n: 6, qs: 'Q15 (raised Lambda concurrency; needed RDS Proxy), Q16, Q35, Q46 (bastion in a private subnet), Q55 (EBS answer to an S3 question), Q59' }
    ],
    callouts: [
      { kind: 'miss', title: 'The biggest single pattern', text: '**Prestige distractors.** In 6 misses you chose an option containing a service with no role in the scenario: Global Accelerator twice, Transit Gateway, Transfer Family, Network Firewall, ACM. Fixing that habit and keyword reading alone takes the score from about 55% to about 72%.' },
      { kind: 'note', title: 'The habit, not the knowledge', text: 'Session 1 quiz: **2/6**. Q2 and Q3 repeated exam misses you had just been taught (pipe math skipped; “DataSync full load + CDC” picked). Retest: **2/3**. R1 read “within a month / never edited” as ongoing, and the cross-outs said “ops overhead” instead of naming the violated constraint. The stub fixes exactly this.' }
    ]
  },

  exam: {
    title: 'The exam',
    facts: [
      '**65 questions**: 50 scored + 15 unscored (you can’t tell which).',
      'Pass mark **720 / 1000**. Scoring is compensatory: no per-domain minimum.',
      'Multiple choice and multiple response. **No penalty for guessing**: answer everything.',
      'Source: the official AWS SAA-C03 exam guide.'
    ],
    domains: [
      { id: 'D1', name: 'Secure', w: 30 }, { id: 'D2', name: 'Resilient', w: 26 },
      { id: 'D3', name: 'High-performing', w: 24 }, { id: 'D4', name: 'Cost-optimized', w: 20 }
    ],
    chartCap: 'Share of scored content by domain.',
    note: 'Some third-party blogs claim an “SAA-C04” exists. AWS’s own documentation still lists SAA-C03, and there is no official AWS announcement of a C04.'
  },

  map: {
    title: 'Knowledge map and study order',
    lead: 'Thirteen clusters in the order you study them. Dots show how much each cluster weighs in each domain.',
    cap: '● light · ●● medium · ●●● heavy · “Start” is where you began (weak / mixed / strong).',
    rows: [
      { n: 1, name: 'Storage & data movement', d: ['●', '●●', '●●', '●●'], start: 'weak' },
      { n: 2, name: 'Migration & hybrid', d: ['●', '●', '●', '●●'], start: 'weak' },
      { n: 3, name: 'Networking & connectivity', detail: 'DX / VPN / TGW / peering / PrivateLink / endpoints / NAT', d: ['●●', '●●', '●●', '●'], start: 'weak' },
      { n: 4, name: 'Global architecture & edge', detail: 'CloudFront / GA / Route 53', d: ['●', '●●', '●●', '●'], start: 'weak' },
      { n: 5, name: 'Security services & identity', detail: 'KMS / Secrets / ACM / WAF / Shield / GuardDuty / Inspector / Macie / Security Hub', d: ['●●●', '·', '·', '·'], start: 'mixed' },
      { n: 6, name: 'Multi-account & governance', detail: 'Orgs / SCP / Identity Center / Control Tower / RAM / Config', d: ['●●', '·', '·', '●'], start: 'weak' },
      { n: 7, name: 'HA & disaster recovery', detail: 'RTO/RPO, 4 DR tiers, failover', d: ['·', '●●●', '●', '●'], start: 'mixed' },
      { n: 8, name: 'Databases & caching', detail: 'RDS / Aurora / DynamoDB / ElastiCache / Redshift', d: ['●', '●●', '●●●', '●'], start: 'mixed' },
      { n: 9, name: 'Serverless, events, integration & analytics', detail: 'SQS / SNS / EventBridge / Kinesis / Step Functions / Glue / Athena / EMR', d: ['·', '●●', '●●', '●●'], start: 'mixed' },
      { n: 10, name: 'Compute & scaling', detail: 'comparison layer only', d: ['·', '●●', '●●', '●●'], start: 'strong' },
      { n: 11, name: 'Monitoring & operations', detail: 'CloudWatch / CloudTrail / Config / SSM / X-Ray / Trusted Advisor', d: ['●', '●', '●', '●'], start: 'weak' },
      { n: 12, name: 'Cost & purchasing', detail: 'cost is a constraint in every session', d: ['·', '·', '·', '●●●'], start: 'mixed' },
      { n: 13, name: 'Integration drill', detail: 'long mixed scenarios, re-diagnosis', d: ['all', '', '', ''], start: '' }
    ]
  },

  method:
`1. Strip the story. Keep DATA nouns and MOVE / STORE / ACCESS verbs.
2. Fill the stub, always the same 4 slots:
   SIZE/NET · TIME (one-off / ongoing) · PROTOCOL/APP · SUPERLATIVE (cheapest / least ops / fastest …)
3. For EACH option: "what problem was this service BUILT for?" No match -> cross it out, whatever the rest says.
4. Among survivors, the one that satisfies the SUPERLATIVE wins.
(Sessions may redefine the stub slots; the mechanics stay the same.)`,
  principles: [
    ['Recall before reveal', 'Every card and question hides the answer until you commit.'],
    ['Stub before options', 'Options stay locked until the four slots are filled.'],
    ['Spaced boxes 1 → 5', 'Missed cards go back to box 1; known ones come back after 1, 2, 4, 8 days.'],
    ['Interleaved drills', 'Scenarios shuffle lines, so you choose instead of recognising.'],
    ['One line, one colour, one verb', 'Every service family is a transit line. Colour always means the same service.'],
    ['Checkpoints inside the lesson', 'After each idea, not only at the end.']
  ]
};
