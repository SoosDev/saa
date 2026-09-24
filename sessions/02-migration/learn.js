/* Session 2 — the lesson. 10 chapters. Facts: docs/CONTEXT.md §6 (verified 2026-09-24). */
(function () {
  'use strict';
  const S = window.SESSION;
  const fromDrill = (id, src) => {
    const d = S.drills.find(x => x.id === id);
    return { id: 'ck-' + id, src: src || d.src, q: d.q, opts: d.opts.map(o => ({ t: o.t, why: o.why })), a: d.opts.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0), why: d.expl };
  };
  const R = [
    { id: 'retire', short: 'Retire', label: 'Retire — turn it off' },
    { id: 'retain', short: 'Retain', label: 'Retain — stay on-prem for now' },
    { id: 'rehost', short: 'Rehost', label: 'Rehost — lift-and-shift to EC2' },
    { id: 'relocate', short: 'Relocate', label: 'Relocate — move the hypervisor' },
    { id: 'replatform', short: 'Replatform', label: 'Replatform — lift, tinker, shift' },
    { id: 'repurchase', short: 'Repurchase', label: 'Repurchase — switch to SaaS' },
    { id: 'refactor', short: 'Refactor', label: 'Refactor — re-architect cloud-native' }
  ];

  const PLACEMENT = {
    start: 'root',
    nodes: {
      root: { q: 'Where must the compute physically run?', opts: [
        { label: 'In our own building', sub: 'data center, factory, hospital, store', next: 'own' },
        { label: 'Close to users in one metro area', sub: 'no hardware of our own', next: 'lz' },
        { label: 'Next to mobile devices on a 5G network', next: 'wl' },
        { label: 'On servers we already have; we just need AWS to run or manage them', next: 'existing' }] },
      own: { q: 'Do you need AWS services and APIs on-site (EC2, EBS, local RDS, ECS)?', opts: [
        { label: 'Yes: AWS infrastructure in our facility', next: 'outposts' },
        { label: 'No: run containers on the servers we already own', next: 'anywhere' }] },
      existing: { q: 'Run containers under the AWS control plane, or patch and run commands?', opts: [
        { label: 'Run containers (ECS or EKS)', next: 'anywhere' },
        { label: 'Patch, run commands, inventory', next: 'ssm' }] }
    },
    results: {
      outposts: { title: 'AWS Outposts', line: 'placement', text: 'AWS-managed racks installed in your building, running AWS services with the same APIs, linked to a parent Region.', facts: ['Triggers: data residency, local processing, very low latency to on-prem systems', 'Needs a link back to its parent Region'], update: 'The 1U and 2U Outposts servers are no longer sold to new customers; racks remain (second generation since 2025).', whyNot: [['Local Zones', 'an AWS site in a city, not your building'], ['Wavelength', 'inside a telco 5G network']] },
      lz: { title: 'AWS Local Zones', line: 'placement', text: 'AWS infrastructure placed in a metro area, close to end users, run by AWS. Single-digit-millisecond latency for users in that city.', whyNot: [['Outposts', 'you would buy and house hardware'], ['CloudFront', 'caches content; it runs no application servers']] },
      wl: { title: 'AWS Wavelength', line: 'placement', text: 'AWS compute and storage inside telecom providers’ 5G networks, so traffic from phones never leaves the carrier network.', whyNot: [['Local Zones', 'near a city, but outside the carrier network']] },
      anywhere: { title: 'ECS Anywhere / EKS Anywhere', line: 'placement', text: 'Your own servers run the containers; AWS runs the control plane. No new hardware.', update: 'ECS Anywhere narrowed its supported operating systems in 2026 (Amazon Linux 2023, Ubuntu 20/22/24, RHEL 9; Windows deprecated).', whyNot: [['Outposts', 'that is buying AWS hardware']] },
      ssm: { title: 'Systems Manager with hybrid activations', line: 'ops', text: 'Register on-prem and other-cloud servers as managed nodes (`mi-` IDs). Patch Manager, Run Command, Inventory and Session Manager then work on them alongside EC2.', whyNot: [['OpsWorks', 'Chef/Puppet service, end of life'], ['AWS Config', 'records state; does not patch']] }
    }
  };

  const AD = {
    start: 'root',
    nodes: {
      root: { q: 'Is there an on-premises Active Directory you must keep using?', opts: [{ label: 'Yes', next: 'has' }, { label: 'No', next: 'none' }] },
      has: { q: 'Do AWS services need a real domain to join: RDS for SQL Server with Windows authentication, or FSx for Windows File Server?', opts: [{ label: 'Yes', next: 'mad' }, { label: 'No: people only sign in (console, apps)', next: 'link' }] },
      link: { q: 'Must sign-in keep working if the link to on-prem goes down?', opts: [{ label: 'Yes', next: 'mad' }, { label: 'No: cheapest, store nothing in AWS', next: 'conn' }] },
      none: { q: 'What do you need?', opts: [{ label: 'A small, basic domain; no trusts', sub: 'a few dozen instances', next: 'simple' }, { label: 'RDS for SQL Server, FSx for Windows, or trusts later', next: 'madnew' }, { label: 'Full control of the domain controllers', next: 'self' }] }
    },
    results: {
      conn: { title: 'AD Connector', line: 'identity', text: 'A proxy: every authentication request goes to your on-prem domain controllers. Nothing is stored in AWS, and it is the cheapest option.', facts: ['Fails when the link to on-prem is down', '**Not compatible with RDS for SQL Server or FSx for Windows**'], whyNot: [['Managed Microsoft AD', 'a whole directory you do not need']] },
      mad: { title: 'AWS Managed Microsoft AD + trust', line: 'identity', text: 'A real AD in AWS (two domain controllers in two AZs). A trust with the on-prem forest keeps existing credentials; RDS for SQL Server and FSx for Windows join it; sign-in keeps working if the link drops.', whyNot: [['AD Connector', 'not supported by RDS SQL Server / FSx; dies with the link'], ['Simple AD', 'no trusts']] },
      madnew: { title: 'AWS Managed Microsoft AD', line: 'identity', text: 'A real, managed AD: the services that need a Windows domain can join it, and you can add trusts later.', whyNot: [['Simple AD', 'no trusts, not for RDS SQL Server or FSx for Windows']] },
      simple: { title: 'Simple AD', line: 'identity', text: 'Samba-based, small and cheap: basic domain features, no trusts.', whyNot: [['Managed Microsoft AD', 'more than a small basic domain needs']] },
      self: { title: 'Self-managed AD on EC2', line: 'identity', text: 'Full control of the domain controllers, and all of the operations: patching, backups, replication, scaling.', whyNot: [['Managed Microsoft AD', 'unless you truly need control of the DCs, managed is less work']] }
    }
  };

  S.learn = [
    /* 1 */
    { id: 'ch1', title: 'The three questions under every migration', blocks: [
      'Every migration question hides the same three questions. Answer them before you look at a single option, and most distractors cross themselves out.',
      { ol: [
        '**What moves?** Whole servers, databases, files, or nothing yet (you are still discovering).',
        '**How much change is allowed?** From none (lift-and-shift) to a rewrite.',
        '**What must stay running?** The downtime budget. It decides between a one-shot copy and continuous replication or CDC.'] },
      '**Hybrid** is the case where nothing moves and both places keep running. The question then becomes: which piece of AWS reaches on-premises? A placement service, identity, DNS, or management.',
      { h: 'The stub for this session' },
      'Session 1’s slots (SIZE, TIME, PROTOCOL, SUPERLATIVE) don’t fit here, so this session uses four new ones. The mechanics are the same: fill them before the options unlock, cross out every option that breaks one, and let the superlative decide among survivors.',
      { table: { head: ['Slot', 'Ask', 'Values'], rows: [
        ['WHAT', 'What moves, or what runs in both places?', '`servers` · `database` · `files` · `inventory/plan` · `identity` · `DNS` · `placement`'],
        ['CHANGE', 'How much may the application change?', '`none (rehost)` · `replatform` · `refactor/rebuy` · `n/a`'],
        ['DOWNTIME', 'How long may it be down at cutover?', '`hours OK` · `minimal` · `n/a`'],
        ['SUPERLATIVE', 'What is being optimised?', '`cheapest` · `least ops` · `fastest` · `resilient` · `none stated`']] } },
      { pre: S.method, label: 'The method' },
      'Files are still the {datasync|DataSync} line from Session 1: a NAS moving to S3, EFS or FSx is the same mover whether the word “migration” appears or not. [[../01-storage/#learn/ch8|Session 1, chapter 8 →]]',
      { check: { id: 'ch1-slot', q: '“A data-center lease ends in 3 months. The company wants to move its applications with minimal changes.” Which slot decides the approach?', opts: [
        { t: 'WHAT', why: 'servers, but that alone allows rehost or refactor.' }, { t: 'CHANGE', why: 'minimal changes = none → rehost.' }, { t: 'DOWNTIME', why: 'not stated.' }, { t: 'SUPERLATIVE', why: 'the deadline hints at speed, but the change limit decides.' }], a: 1,
        why: '“Minimal changes” sets CHANGE = none, which means **Rehost**, and for servers that is {mgn|MGN}.' } }
    ] },

    /* 2 */
    { id: 'ch2', title: 'The 7 Rs', blocks: [
      'AWS names seven migration strategies. Ordered from least to most change:',
      { table: { head: ['R', 'Meaning', 'Where it goes'], key: true, rows: [
        ['Retire', 'turn it off', 'nothing'],
        ['Retain', 'stay on-prem for now', 'hybrid services (chapters 7–9)'],
        ['Rehost', 'lift-and-shift to EC2', '{mgn|MGN}'],
        ['Relocate', 'move the hypervisor, not the VMs', 'VMware Cloud on AWS in banks; Amazon EVS today'],
        ['Replatform', 'lift, tinker, shift', '{dms|DMS} → RDS / Aurora, Elastic Beanstalk, containers'],
        ['Repurchase', 'switch to a SaaS product', '—'],
        ['Refactor', 're-architect cloud-native', 'Lambda, DynamoDB, microservices']] } },
      { hooks: [['Mnemonic', '**Re**move · **Re**main · **Re**copy · **Re**-hypervisor · **Re**pair · **Re**buy · **Re**build']], label: 'Memory hook' },
      { h: 'Triggers' },
      { ul: [
        '“quickly”, “minimal changes”, “the lease ends” → **Rehost**',
        '“reduce database administration but keep the app” → **Replatform**',
        '“cloud-native”, “scale independently”, “pay per request” → **Refactor**',
        '“keep the vSphere tools”, “no conversion” → **Relocate**',
        '“nobody uses it” → **Retire** · “must stay on-prem until …” → **Retain** · “replace with Salesforce / Microsoft 365” → **Repurchase**'] },
      { callout: '**VMware Cloud on AWS** has been sold by Broadcom (and its resellers), not by AWS, since 30 Apr 2024. AWS’s current answer for Relocate is **Amazon Elastic VMware Service (EVS)**, generally available since Aug 2025: VMware Cloud Foundation inside your own VPC, VMs moved with VMware HCX, no conversion, vCenter kept. Question banks still expect VMware Cloud on AWS.', kind: 'update' },
      { widget: 'sorter', args: { title: '7R sorter', lead: 'Pick the R for each scenario, then check.', buckets: R, items: [
        { t: 'Nobody has used the internal wiki for a year', b: 'retire', why: 'no users: switch it off.' },
        { t: 'A billing system must stay on-prem until 2028 for regulatory reasons', b: 'retain', why: 'it stays for now.' },
        { t: 'The lease ends in 3 months; move 200 VMs with minimal changes', b: 'rehost', why: 'quick + no change = lift-and-shift with MGN.' },
        { t: 'Move 300 vSphere VMs without converting them; keep vCenter', b: 'relocate', why: 'the hypervisor moves, the VMs stay VMs.' },
        { t: 'Keep the app code; move its self-managed MySQL to RDS', b: 'replatform', why: 'same app, managed database.' },
        { t: 'Replace the self-hosted CRM with Salesforce', b: 'repurchase', why: 'switch to a SaaS product.' },
        { t: 'Rebuild the monolith as Lambda + DynamoDB so each part scales on its own', b: 'refactor', why: 're-architected cloud-native.' },
        { t: 'Move a Java app from Tomcat VMs to Elastic Beanstalk, no code changes', b: 'replatform', why: 'a managed platform, same code.' },
        { t: 'Switch the on-prem mail server to Microsoft 365', b: 'repurchase', why: 'buy the service instead of running it.' },
        { t: 'Lift the web tier to EC2 as-is with MGN', b: 'rehost', why: 'same servers, now on EC2.' }] } },
      { check: fromDrill('N18', 'The unused wiki') },
      { drills: ['N18', 'N19', 'N20', 'N3'] }
    ] },

    /* 3 */
    { id: 'ch3', title: 'Discover and plan', blocks: [
      'You can’t move what you haven’t found. Discovery collects what runs where, how busy it is, and which servers talk to each other. That last part is what turns a server list into **migration waves**: servers that depend on each other move together.',
      { h: 'Two collectors' },
      { table: { head: ['Collector', 'Sees', 'Use when'], key: true, rows: [
        ['Agentless (vCenter)', 'VM inventory, CPU / memory / disk utilisation', 'VMware only, no agents allowed, right-sizing'],
        ['Agent (on each server)', 'all of that **plus processes and network connections**', 'dependency mapping, waves, bare-metal or physical servers']] } },
      { ul: [
        '“which servers talk to each other” / “dependencies” → the **agent**',
        '“no agents allowed”, “VMware” → **agentless**',
        '“one dashboard for migration progress across tools” → **Migration Hub** (today AWS Transform)'] },
      { callout: '**Migration Hub** and **Application Discovery Service** closed to new customers on **7 Nov 2025**; existing customers continue. The replacement is **AWS Transform** (launched May 2025): agent-based and agentless discovery (a discovery-tool OVA for vCenter and Hyper-V, CSV import), dependency mapping, wave planning, strategy and EC2 recommendations. MGN’s docs now say “AWS Transform MGN”. Banks keep the old names; answer the trigger.', kind: 'update' },
      { h: 'The journey map' },
      'The whole session on one map. The ink trunk is the journey (discover → plan → move → test → cut over). Four coloured lines carry the payload, in Session 1’s colours. Below the dashed line: what runs in both places. Tap a line or station to see its services, triggers and traps.',
      { map: true },
      { check: fromDrill('M2') },
      { drills: ['M2', 'N1', 'N2'] }
    ] },

    /* 4 */
    { id: 'ch4', title: 'Moving servers: MGN, and its twin DRS', blocks: [
      '{mgn|MGN} (AWS Application Migration Service, now titled “AWS Transform MGN” in the docs) moves whole servers: OS, applications and data, block by block. Sources are physical servers, VMware, Hyper-V and other clouds. **The target is always EC2.**',
      { widget: 'stepper', args: { title: 'MGN step by step', line: 'mgn', steps: [
        { title: 'Install the replication agent', text: 'Install the AWS Replication Agent on each source server (physical, VMware, Hyper-V or another cloud). It reads the disks at block level.' },
        { title: 'Continuous replication to a staging area', text: 'Blocks stream continuously to a **staging area subnet** in your AWS account: small EC2 replication servers writing to low-cost EBS volumes. The source keeps running.', note: 'Replication and launch settings come from templates: a replication template, launch templates and post-launch actions. Servers are grouped into waves.' },
        { title: 'Launch test instances', text: 'Launch test EC2 instances from the replicated data, check the application, then mark the servers ready for cutover. Replication keeps running.' },
        { title: 'Cutover', text: 'Stop the source application, let the final blocks replicate, launch the cutover instances and repoint DNS. Downtime is **minutes**.' },
        { title: 'Finalise and decommission', text: 'Finalise the cutover: MGN stops replicating and cleans up the staging resources. Decommission the source servers.' }] } },
      { callout: 'Old names in question banks: **AWS Server Migration Service (SMS)** (shut down 1 Apr 2023) and **CloudEndure Migration** (discontinued 30 Dec 2022) both mean MGN today. **VM Import/Export** still exists, but it imports an offline image, so downtime is longer and there is no continuous replication.', kind: 'note', title: 'Old names' },
      { h: '{drs|Elastic Disaster Recovery}: same engine, never ends' },
      'DRS uses the same continuous block-level replication, but the job never finishes. Servers keep replicating to AWS; in a disaster you **fail over** to recovery instances in AWS, and after repair you **fail back**. RPO is seconds and RTO is minutes. Nothing is migrating.',
      { pair: 'mgn-drs' },
      { h: 'Traps' },
      { ul: ['**MGN into RDS.** MGN always lands on EC2. A managed database target is DMS.', '**DRS used to migrate, or MGN used for DR.** Look for the ending: decommission the source → MGN; fail back → DRS.'] },
      { check: fromDrill('M1') },
      { check: { id: 'ch4-drs', q: '“Servers stay on-prem. We need RPO in seconds and must fail back after repair.” Which service?', opts: [{ t: 'AWS Application Migration Service', why: 'one-way; ends at cutover.' }, { t: 'AWS Elastic Disaster Recovery', why: 'continuous, fail over and fail back.' }, { t: 'AWS Backup', why: 'scheduled backups: RPO of hours.' }, { t: 'VM Import/Export', why: 'offline images, no replication.' }], a: 1, why: 'Round trip + seconds of RPO = DRS.' } },
      { drills: ['M1', 'N7', 'N8'] }
    ] },

    /* 5 */
    { id: 'ch5', title: 'Moving databases: DMS, SCT and the Aurora shortcut', blocks: [
      { h: '{dms|DMS}' },
      { ul: [
        'A **replication instance** (or **DMS Serverless**), a **source endpoint**, a **target endpoint** and a **task**. The source stays online the whole time.',
        '**Full load**: copies the tables. If writes must stop for a consistent copy, downtime lasts the whole copy.',
        '**Full load + CDC**: copies, then streams every change until you cut over. Downtime is the final catch-up: minutes.',
        '**CDC only**: stream changes onto a copy that is already there (for example after an offline seed).',
        '**Multi-AZ** replication instance (or Serverless Multi-AZ) keeps a long CDC phase alive through an AZ failure.',
        'Targets include RDS, Aurora, Redshift, DynamoDB, Kinesis and **S3** (CSV by default, **Parquet** optional). Encrypt in transit with **SSL endpoints**.'] },
      { h: 'Different engines: convert first' },
      'DMS moves **data**. It does not convert schemas, views, stored procedures or functions. For heterogeneous moves (Oracle → Aurora PostgreSQL, SQL Server → Aurora MySQL), convert the structure and code first with **DMS Schema Conversion** (in the console, free) or the **AWS Schema Conversion Tool (SCT)** (desktop), then move the rows with DMS.',
      { ul: [
        '**Data warehouses** (Teradata, Netezza, Oracle DW, Greenplum, Vertica … → Redshift): **SCT** with its **data extraction agents**.',
        '**Huge database, thin pipe**: seed the initial load offline ({truck|the truck}), then DMS CDC catches up.'] },
      { pair: 'sct-dms' },
      { h: 'RDS → Aurora: the shortcut' },
      { ul: [
        '**RDS for MySQL / PostgreSQL → Aurora (same family), minimal downtime**: create an **Aurora read replica** of the RDS instance and **promote** it when replica lag is zero. No DMS needed.',
        '**Downtime is OK**: take a snapshot and restore it as an Aurora cluster.'] },
      { pair: 'replica' },
      { h: 'Cutover timeline' },
      'Full load alone makes the whole copy downtime; with CDC only the switch-over counts. Try the presets, then change the change rate until CDC can’t keep up.',
      { widget: 'cutoverTimeline' },
      { check: fromDrill('M3') },
      { check: fromDrill('M4') },
      { drills: ['M3', 'M4', 'N4', 'N5', 'N6', 'N21', 'N23'] }
    ] },

    /* 6 */
    { id: 'ch6', title: 'Getting the bytes there during a migration', blocks: [
      'Session 1’s pipe rule still decides everything: **100 Mbps ≈ 1 TB a day, 1 Gbps ≈ 10 TB a day.** Do the division before reading the options.',
      { widget: 'pipeCalc' },
      { h: 'VPN now, Direct Connect later' },
      'Direct Connect takes **weeks** to provision. A migration with a 2-week deadline never waits for it: start over a **Site-to-Site VPN** (or the internet with TLS) now, and move to DX when it arrives for the long-term hybrid traffic.',
      { h: 'Seed offline, sync online' },
      'When the initial copy is too big for the pipe, carry it by {truck|the truck} (Data Transfer Terminal today, Snow in banks), then let {dms|DMS} CDC or {datasync|DataSync} catch up over the network. The truck handles the bulk; the network handles the changes.',
      { h: 'Encrypt in transit' },
      { ul: ['DMS: **SSL endpoints** with a certificate.', 'Server and file replication: over the VPN, or TLS (MGN and DataSync encrypt in transit).'] },
      { check: fromDrill('N22') },
      { drills: ['N22', 'N5'] }
    ] },

    /* 7 */
    { id: 'ch7', title: 'Running in both places: where AWS compute sits', blocks: [
      'The question behind every placement answer: **whose building is it?**',
      { table: { head: ['Service', 'Where it runs', 'Use when'], key: true, rows: [
        ['Outposts', '**your** building: AWS-managed racks, linked to a parent Region', 'data residency, local processing, very low latency to on-prem systems'],
        ['Local Zones', 'an AWS site in a **metro area**', 'single-digit ms for users in that city, no hardware of yours'],
        ['Wavelength', 'inside a telco **5G** network', 'mobile devices, AR/VR, connected vehicles'],
        ['ECS / EKS Anywhere', 'your **existing** servers', 'containers under the AWS control plane, no new hardware'],
        ['SSM hybrid activations', 'your existing servers', 'patch, run commands, inventory next to EC2']] } },
      { callout: 'The 1U and 2U **Outposts servers** are no longer sold to new customers; **Outposts racks** remain (second generation since 2025, a single-rack option since Sept 2026). Older material describes “racks or servers”.', kind: 'update' },
      { callout: 'Systems Manager removed its advanced-instances tier on 30 Jun 2026. ECS Anywhere narrowed its supported operating systems in 2026 (Amazon Linux 2023, Ubuntu 20/22/24, RHEL 9). Neither changes the exam trigger.', kind: 'update', title: 'Smaller changes' },
      { pair: 'place' },
      { callout: '**Local Zones for “data must stay in our facility”.** A Local Zone is an AWS building. Your own facility means Outposts.', kind: 'note', title: 'Trap' },
      { widget: 'chooser', args: { title: 'Placement chooser', tree: PLACEMENT } },
      { check: fromDrill('N9', 'Factory floor') },
      { drills: ['N9', 'N10', 'N11', 'N16', 'N17'] }
    ] },

    /* 8 */
    { id: 'ch8', title: 'Hybrid identity', blocks: [
      { table: { head: ['Option', 'What it is', 'Good for', 'Cannot'], key: true, rows: [
        ['AD Connector', 'a **doorman**: forwards every request to on-prem AD, stores nothing', 'console and app sign-in with AD credentials; cheapest', '**RDS for SQL Server, FSx for Windows**; survive a link outage'],
        ['AWS Managed Microsoft AD', 'a **real AD** in AWS: two DCs in two AZs', 'trusts with on-prem, RDS SQL Server Windows auth, FSx for Windows, WorkSpaces; keeps working without the link', '— (costs more)'],
        ['Simple AD', 'small, Samba-based', 'a basic domain for a few instances', 'trusts; RDS SQL Server / FSx for Windows'],
        ['Self-managed AD on EC2', 'your own DCs', 'full control', 'save you any operations']] } },
      'Two facts decide most identity questions: AD Connector is **not compatible with RDS for SQL Server or FSx for Windows**, and it **fails when the link to on-prem fails**. (IAM Identity Center with AD goes deep in Session 6.)',
      { pair: 'ad' },
      { widget: 'chooser', args: { title: 'AD chooser', tree: AD } },
      { check: fromDrill('M6') },
      { drills: ['M6', 'N12', 'N13'] }
    ] },

    /* 9 */
    { id: 'ch9', title: 'Hybrid DNS', blocks: [
      '**Rule: name the endpoint after the direction the query travels relative to the VPC.**',
      { ul: [
        'On-prem asks about AWS private names → the query comes **in** → **inbound endpoint**. On-prem DNS conditionally forwards the zone to the endpoint’s IP addresses.',
        'The VPC asks about on-prem names → the query goes **out** → **outbound endpoint** plus a **forwarding rule** for the domain (for example `corp.internal`).',
        'Both need connectivity (VPN or Direct Connect). Forwarding rules can be shared with other accounts through **AWS RAM**.'] },
      { callout: 'Route 53 Resolver is now **Route 53 VPC Resolver** (renamed when Route 53 Global Resolver was introduced). Inbound and outbound endpoints work as before; banks use the old name.', kind: 'update' },
      { widget: 'dnsDirection' },
      { pair: 'resolver' },
      { callout: '**Flipping the direction.** Say out loud who sends the query. “EC2 resolves corp.internal” sends it out: outbound.', kind: 'note', title: 'Trap' },
      { check: fromDrill('M5') },
      { drills: ['M5', 'N14', 'N15'] }
    ] },

    /* 10 */
    { id: 'ch10', title: 'Triggers, traps, cheat block and record', blocks: [
      { widget: 'triggerTable' },
      { link: '#traps', text: 'All 13 traps, each linked to the drills that test it →' },
      { pre: S.cheat, label: 'Cheat block · copy it by hand' },
      { h: 'Your record' },
      { log: true },
      'M1–M6 and S7 are the quiz. Answer them in the drill first; when the results are in, the misses get marked as yours and a line appears here.',
      { link: '#drill', text: 'Go to the drill (30 scenarios)', btn: true }
    ] }
  ];
})();
