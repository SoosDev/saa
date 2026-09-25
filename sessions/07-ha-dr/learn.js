/* Session 7 — the lesson. 12 chapters. Facts: docs/session-07-ha-dr.md (verified 2026-09-25). */
(function () {
  'use strict';
  const S = window.SESSION;
  const fromDrill = (id, src) => {
    const d = S.drills.find(x => x.id === id);
    return { id: 'ck-' + id, src: src || d.src, q: d.q, opts: d.opts.map(o => ({ t: o.t, why: o.why })), a: d.opts.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0), why: d.expl };
  };

  const DB = {
    start: 'root',
    nodes: {
      root: { q: 'What must the database survive?', opts: [
        { label: 'The failure of one Availability Zone', next: 'az' },
        { label: 'The loss of a whole Region', next: 'region' },
        { label: 'A bad write, a delete or a corruption', sub: 'the data itself is wrong', next: 'bad' }] },
      az: { q: 'Which database?', opts: [
        { label: 'RDS (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, Db2)', next: 'rdsAz' },
        { label: 'Aurora', next: 'auroraAz' },
        { label: 'DynamoDB', next: 'ddbAz' }] },
      rdsAz: { q: 'Should the standby also serve reads and fail over faster?', opts: [
        { label: 'No — plain automatic failover is enough', next: 'mazi' },
        { label: 'Yes, and the engine is MySQL or PostgreSQL', next: 'mazc' }] },
      region: { q: 'Which database, and what RPO?', opts: [
        { label: 'RDS, RPO of minutes, keep it cheap', next: 'xrr' },
        { label: 'Aurora (or can move to it), RPO about a second, RTO about a minute', next: 'agd' },
        { label: 'DynamoDB, writes in every Region', next: 'gt' },
        { label: 'DynamoDB, RPO must be zero', next: 'mrsc' },
        { label: 'Any, RPO and RTO of hours, cheapest', next: 'bak' }] },
      bad: { q: 'Which database?', opts: [
        { label: 'RDS or Aurora PostgreSQL', next: 'pitr' },
        { label: 'Aurora MySQL with Backtrack enabled, fastest in place', next: 'bt' },
        { label: 'DynamoDB', next: 'ddbPitr' }] }
    },
    results: {
      mazi: { title: 'RDS Multi-AZ DB instance', line: 'rds', text: 'A **synchronous** standby in another AZ; automatic failover by **DNS CNAME** flip, typically 60–120 s. The standby serves no reads.', whyNot: [['Read replica', 'asynchronous, manual promotion']] },
      mazc: { title: 'RDS Multi-AZ DB cluster', line: 'rds', text: 'One writer and **two readable standbys** in three AZs; failover typically **under 35 s**; reader endpoint for reads.', whyNot: [['Multi-AZ DB instance', 'slower failover, idle standby']] },
      auroraAz: { title: 'An Aurora Replica in another AZ', line: 'aurora', text: 'Aurora storage already keeps six copies in three AZs. Add at least one **Aurora Replica** in another AZ so failover promotes it (typically under 60 s, often under 30 s) instead of recreating the writer (up to about 10 minutes).', whyNot: [['Aurora Global Database', 'answers a Region loss, not an AZ']] },
      ddbAz: { title: 'Nothing to add', line: 'ddb', text: 'DynamoDB replicates every table across multiple AZs in the Region automatically.', whyNot: [['Global tables', 'for Region loss or multi-Region writes']] },
      xrr: { title: 'Cross-Region read replica', line: 'rds', text: 'Asynchronous replica in the DR Region; **promote it manually** during a disaster. (Or replicate automated backups cross-Region for PITR there — RPO minutes, RTO hours.)', facts: ['Not for RDS for SQL Server'], whyNot: [['Aurora Global Database', 'needs Aurora and costs more']] },
      agd: { title: 'Aurora Global Database', line: 'aurora', text: 'Storage-level replication to up to 10 secondary Regions, lag typically under a second; **failover** for outages, **switchover** for planned moves.', whyNot: [['Cross-Region read replica', 'more lag, manual promotion']] },
      gt: { title: 'DynamoDB global tables (MREC)', line: 'ddb', text: 'Every replica accepts writes; replication typically within a second; last writer wins.', whyNot: [['Aurora Global Database', 'one writer Region']] },
      mrsc: { title: 'Global tables with multi-Region strong consistency', line: 'ddb', text: 'Strongly consistent reads in every Region and **RPO zero**; exactly three Regions (three replicas, or two plus a witness).', facts: ['GA June 2025', 'No transaction APIs'], whyNot: [['Default global tables', 'asynchronous: recent writes can be lost']] },
      bak: { title: 'Backups copied to the DR Region', line: 'backup', text: 'AWS Backup (or snapshot copies) to the DR Region; restore there after a disaster. The backup-and-restore strategy.', whyNot: [['Replicas', 'pay for running capacity nobody needs']] },
      pitr: { title: 'Point-in-time restore', line: 'rds', text: 'Restore from automated backups to the second before the mistake, into a **new** instance or cluster; then repoint the application or copy the data back.', whyNot: [['Replicas / standby', 'they applied the mistake too']] },
      bt: { title: 'Aurora Backtrack', line: 'aurora', text: 'Rewind the **same** cluster in place to a time before the mistake (window up to 72 h). Aurora MySQL only; not with Global Database.', whyNot: [['PITR', 'works, but creates a new cluster and takes longer']] },
      ddbPitr: { title: 'DynamoDB point-in-time recovery', line: 'ddb', text: 'Restore the table to any second of the PITR window (1–35 days) into a **new table**.', whyNot: [['Global tables replica', 'already has the bad writes']] }
    }
  };

  S.learn = [
    /* ---------------------------------------------------------------- 1 */
    { id: 'ch1', title: 'How to read a resilience question', domains: 'D2 D3 D4', blocks: [
      'This cluster is the heart of **D2 (Resilient, 26%)**, with slices of D3 and D4. Every question in it has the same skeleton: something can fail, the business can tolerate a certain amount of downtime and data loss, and the options range from a cheap backup to a second copy of everything running in another Region. Most wrong options are **real, resilient designs** — they are just built for a different failure or cost more than the tolerance requires.',
      { h: 'Your record on this cluster' },
      { table: { head: ['Where', 'What happened', 'What it teaches', 'Tag'], rows: [
        ['baseline **Q61**', 'the RDS **Multi-AZ failover mechanism**', 'the endpoint’s DNS CNAME moves; nothing else changes', '**F** fact gap'],
        ['baseline **Q29**', '**DLM vs AWS Backup**', 'DLM = EBS only; several services or accounts = AWS Backup', '**C** confused similar'],
        ['baseline, twice', '**Global Accelerator** picked where it had no role', 'keep GA only for static IPs or no-DNS failover', '**C** prestige distractor']] } },
      { callout: 'Drills **H1–H5** and five cards come from these misses and are marked as yours. In H3 the multi-site option with Global Accelerator is tempting and wrong; in H4 Global Accelerator is genuinely right; in H5 a second Region is offered for an AZ failure. The skill is the same as in Session 6: name what each option is built for before you keep it.', kind: 'miss', title: 'Your misses' },
      { h: 'Ask first: what fails, and how much loss is allowed?' },
      'Three questions sort almost every option before you read it properly:',
      { ol: [
        '**What fails?** One instance, one Availability Zone, a whole Region, the **data itself** (a bad deploy, a delete, ransomware), or an on-premises site. An AZ is a high-availability problem; a Region is a disaster-recovery problem; bad data is a backup problem.',
        '**How long may it be down?** That is the **RTO** (recovery time objective).',
        '**How much data may be lost?** That is the **RPO** (recovery point objective).'] },
      'Then the superlative picks among the survivors — and in this cluster it is almost always **cost**: the cheapest design that still meets the RTO and RPO.',
      { h: 'The stub for this session' },
      'Session 6’s slots (scope, control, who) do not separate these services. This session uses four new slots:',
      { table: { head: ['Slot', 'Ask', 'Values', 'What it kills'], rows: [
        ['FAILURE', 'What must be survived?', '`instance` · `AZ` · `Region` · `bad data` · `on-prem site`', 'a second Region for an AZ; replication for bad data; Multi-AZ for a Region'],
        ['RTO', 'Max downtime?', '`hours` · `tens of min` · `minutes` · `near zero`', 'restores for minutes; multi-site for hours'],
        ['RPO', 'Max data loss?', '`hours` · `minutes` · `seconds` · `zero`', 'nightly backups for seconds; synchronous designs for hours'],
        ['SUPERLATIVE', 'What is optimised?', '`cheapest` · `least ops` · `fastest` · `none stated`', 'every tier above the one the targets require']] } },
      { pre: S.method, label: 'The method' },
      { h: 'Built for — one line each' },
      { hooks: [
        ['Multi-AZ (ASG + ELB)', 'keeps an application **running through an AZ failure**, automatically.'],
        ['RDS Multi-AZ', 'a **synchronous standby** that takes over by DNS; no reads.'],
        ['RDS read replica', '**asynchronous readable copy**, maybe in another Region; promoted by hand.'],
        ['Aurora Global Database', 'relational copy in other Regions, **~1 s lag**, failover in ~1 min.'],
        ['DynamoDB global tables', '**writes in every Region**.'],
        ['S3 replication', 'copies **new objects** to another bucket (RTC: within 15 min).'],
        ['AWS Backup', '**point-in-time copies** of many services, copied and locked.'],
        ['DLM', 'automates **EBS snapshots and AMIs** only.'],
        ['Elastic Disaster Recovery', 'replicates **servers**; recover in minutes, fail back.'],
        ['Route 53 failover', 'answers with the **healthy endpoint**; TTL applies.'],
        ['Global Accelerator', '**static IPs**; fails over at the edge with no DNS wait.'],
        ['Amazon ARC', '**switches**: routing controls, zonal shift, Region switch plans.']], label: 'Built for' },
      { h: 'Try it on H3' },
      'One of your pattern drills. Fill the four slots before you look at the options. Then ask of the option with Global Accelerator in it: which slot does it fail?',
      { widget: 'stubTrainer', args: { drill: 'H3', title: 'Stub trainer · H3 (exam pattern)', why: {
        fail: '“a Regional disaster”.',
        rto: '“RTO of 24 hours” — hours.',
        rpo: '“RPO of 24 hours” — hours.',
        sup: '“most cost-effective”.' } } },
      { check: { id: 'ch1-ga', src: 'Exam pattern', q: 'An option adds **AWS Global Accelerator** to a DR design whose RTO is 24 hours and whose clients use DNS normally. Why cross it out?', opts: [
        { t: 'Global Accelerator cannot fail over between Regions.', why: 'it can; that is one of its jobs.' },
        { t: 'It fails the SUPERLATIVE: it pays for instant, IP-level failover that a 24-hour RTO does not need.', why: 'its built-for reasons — static IPs, no DNS caching — are absent.' },
        { t: 'It fails FAILURE: Global Accelerator only works inside one AZ.', why: 'false; it fronts endpoints in several Regions.' }], a: 1,
        why: 'Keep Global Accelerator only when the scenario gives its built-for reason: fixed IP addresses, IP allow lists, UDP, or failover that must not wait for DNS.' } },
      { check: { id: 'ch1-az', src: 'Exam pattern', q: 'A question asks to survive **the failure of one Availability Zone**. Which kind of answer should you expect?', opts: [
        { t: 'A second Region with a DR strategy.', why: 'that answers a Region failure, at a higher cost.' },
        { t: 'Resources spread across AZs in the same Region (Auto Scaling group behind a load balancer, Multi-AZ database).', why: 'high availability inside the Region — automatic and cheap.' },
        { t: 'Backups copied to another Region.', why: 'a restore takes hours; the application stops meanwhile.' }], a: 1,
        why: 'FAILURE = AZ → Multi-AZ. Save the second Region for FAILURE = Region.' } }
    ] },

    /* ---------------------------------------------------------------- 2 */
    { id: 'ch2', title: 'RTO, RPO and the four DR strategies', domains: 'D2 D4', blocks: [
      'Two numbers describe every recovery requirement. AWS defines them like this:',
      { ul: [
        '**RTO — recovery time objective**: the maximum acceptable delay between the interruption of service and its restoration. It is about **downtime**, and it decides **how much must already be running** in the recovery site.',
        '**RPO — recovery point objective**: the maximum acceptable amount of time since the last data recovery point. It is about **data loss**, and it decides **how data is copied**: nightly backups give an RPO of up to a day; continuous replication gives seconds; synchronous writes give zero.'] },
      'Both are **business** decisions, written into the question. Your job is not to choose them; it is to pick the cheapest design that meets them.',
      { h: 'The four strategies' },
      'AWS describes four disaster-recovery strategies, in increasing cost and decreasing RTO and RPO. The numbers below are Well-Architected’s own words:',
      { table: { head: ['Strategy', 'RPO', 'RTO', 'What runs in the DR Region', 'Recovery action'], key: true, rows: [
        ['**Backup and restore**', 'hours', '24 hours or less', 'nothing — backups are copied there', 'deploy infrastructure from code, restore data, switch traffic'],
        ['**Pilot light**', 'minutes', 'tens of minutes', 'data stores, replicating live; compute **switched off** (not deployed, or scaled to zero)', 'deploy or start compute, scale it, switch traffic'],
        ['**Warm standby**', 'seconds', 'minutes', 'a **scaled-down but fully functional** copy that can take traffic now', 'scale up, switch traffic'],
        ['**Multi-site active/active**', 'near zero', 'potentially zero', 'full production, **serving users**', 'stop sending users to the failed Region']] } },
      'The line between pilot light and warm standby is tested often, and AWS draws it in one sentence: a **pilot light cannot process requests** without additional action first, whereas a **warm standby can handle traffic** at reduced capacity **immediately**. (A warm standby scaled to full size is sometimes called **hot standby**.)',
      { callout: 'Backup and restore can reach a lower RPO than “hours” when the backups are continuous: point-in-time recovery lets RDS, Aurora, DynamoDB and S3 restore to within minutes. The strategy stays backup and restore because nothing runs in the DR Region and the RTO is still the time to rebuild.', kind: 'note', title: 'Fine print' },
      { h: 'Pick one' },
      'Set the targets from a scenario and read which strategy is the cheapest that meets both. Try RTO 4 h / RPO 1 h, then RTO 1 h / RPO 15 min, then RTO 5 min / RPO 1 min, then RTO 30 s.',
      { widget: 'drPicker' },
      { pair: 'tiers' },
      { widget: 'sorter', args: { title: 'Which DR strategy?', lead: 'Twelve requirements, four strategies. Decide before you check.', buckets: [{ id: 'br', short: 'Backup & restore', label: 'Backup and restore' }, { id: 'pl', short: 'Pilot light', label: 'Pilot light' }, { id: 'ws', short: 'Warm standby', label: 'Warm standby' }, { id: 'ms', short: 'Multi-site', label: 'Multi-site active/active' }], items: [
        { t: 'RTO 24 hours, RPO 12 hours, lowest cost', b: 'br', why: 'hours and hours.' },
        { t: 'Database replicated live, app servers off until needed', b: 'pl', why: 'the definition.' },
        { t: 'A small copy of every tier already serves a trickle of traffic', b: 'ws', why: 'scaled down, fully functional.' },
        { t: 'Users in two Regions, zero downtime if either fails', b: 'ms', why: 'both serve.' },
        { t: 'RPO minutes, RTO about 30 minutes, cheapest', b: 'pl', why: 'data live, compute starts on failover.' },
        { t: 'Nightly AWS Backup copies to another Region, stack rebuilt with CloudFormation', b: 'br', why: 'nothing runs in DR.' },
        { t: 'RTO of a few minutes, must take traffic before scaling up', b: 'ws', why: 'serves immediately at reduced capacity.' },
        { t: 'DynamoDB global tables + Route 53 latency records to two full stacks', b: 'ms', why: 'active/active.' },
        { t: 'On-prem servers replicated by DRS to a staging area, launched on failover', b: 'pl', why: 'DRS is a pilot light for servers (the whitepaper classes it so).' },
        { t: 'Archive of monthly snapshots, recovery within a day is fine', b: 'br', why: 'hours.' },
        { t: 'Auto Scaling group in the DR Region at minimum 2 instances behind a live ALB', b: 'ws', why: 'running and able to serve.' },
        { t: 'Cost is secondary; any Region failure must be invisible to users', b: 'ms', why: 'near-zero RTO.' }] } },
      { check: fromDrill('H6') },
      { check: fromDrill('H7') },
      { check: fromDrill('H8') },
      { drills: ['H3', 'H6', 'H7', 'H8'] }
    ] },

    /* ---------------------------------------------------------------- 3 */
    { id: 'ch3', title: 'High availability inside a Region', domains: 'D2 D3 D4', blocks: [
      'A Region is made of several **Availability Zones** — separate data centres with independent power, cooling and networking, connected by low-latency links. They fail independently. **High availability** means that losing an instance or a whole AZ does not stop the application, **automatically** and with **no data loss**. It costs far less than a second Region, and it answers most “survive a failure” questions.',
      { pair: 'ha-dr' },
      { h: 'The standard pattern' },
      { ul: [
        'A **load balancer** (ALB or NLB) with subnets in at least two AZs. It sends traffic only to healthy targets. ALB cross-zone load balancing is always on; for NLB it is off by default.',
        'An **Auto Scaling group** spanning the same AZs. It rebalances instances across AZs and replaces failed ones. By default it only looks at EC2 status checks; turn on **ELB health checks** so it also replaces instances that are running but failing requests.',
        'A **Multi-AZ database** (RDS Multi-AZ, Aurora with a replica in another AZ; DynamoDB is Multi-AZ already) and **Regional** storage (S3, EFS Regional). EBS volumes live in one AZ — that is why stateful data belongs in a Multi-AZ service, not on an instance’s disk.'] },
      { h: 'Static stability' },
      'When an AZ fails, the naive plan is “Auto Scaling will launch replacements”. That depends on launching during the event — the **control plane** of EC2 and Auto Scaling, capacity in the other AZs, the AMI and every dependency. Well-Architected calls the alternative **static stability**: the workload operates in one normal mode and does not need to change anything during a failure. For an AZ failure that means **pre-provisioning** enough capacity in the other AZs **before** it happens. It lists “trying to dynamically acquire resources during a failure” as an anti-pattern.',
      'The cost of static stability falls as you add AZs, because each AZ is a smaller share of the whole. For N instances at peak over k AZs you need N/(k−1) in each:',
      { widget: 'azCapacity' },
      { check: fromDrill('H9') },
      { h: 'One instance that cannot be clustered' },
      'Some workloads are a single instance: a licence tied to an IP address, a legacy app that cannot run twice. **EC2 automatic recovery** covers the host failing under it: when the **system status check** fails, the instance is moved to new hardware and keeps its **instance ID, private and Elastic IP addresses, metadata, placement group and EBS volumes**; memory contents are lost. **Simplified automatic recovery** is on by default for supported instance types; you can also set a CloudWatch alarm with the **recover** action. An Auto Scaling group with a size of 1 is different — it launches a **new** instance with a new ID and IP.',
      { callout: 'Simplified automatic recovery does not support instances with **instance store** volumes. CloudWatch-alarm recovery now works for some instance-store types, but the instance-store data is lost either way.', kind: 'update' },
      { check: fromDrill('H10') },
      { h: 'Your prestige pattern, HA edition' },
      { callout: 'In the baseline you picked Global Accelerator twice where it had no role. Its most common disguise in this cluster is an **AZ** question: “put Global Accelerator in front” or “add a second Region”. When FAILURE = AZ, the load balancer and the Auto Scaling group already span AZs — nothing global adds anything but cost.', kind: 'miss', title: 'Your misses' },
      { check: fromDrill('H5', 'Exam pattern') },
      { widget: 'sorter', args: { title: 'HA or DR?', lead: 'Eight requirements. Is each a high-availability problem (inside a Region) or a disaster-recovery problem (another Region or a backup)?', buckets: [{ id: 'ha', short: 'HA', label: 'High availability (Multi-AZ)' }, { id: 'dr', short: 'DR', label: 'Disaster recovery (Region / backup)' }], items: [
        { t: 'Keep serving if one data centre in the Region loses power', b: 'ha', why: 'an AZ.' },
        { t: 'Recover if the whole Region is unavailable', b: 'dr', why: 'a Region.' },
        { t: 'Database fails over automatically if its AZ fails', b: 'ha', why: 'Multi-AZ.' },
        { t: 'Restore yesterday’s data after a faulty release', b: 'dr', why: 'backup / PITR.' },
        { t: 'No single point of failure in the web tier', b: 'ha', why: 'ASG across AZs.' },
        { t: 'Regulator requires a copy of data 500 km away', b: 'dr', why: 'another Region.' },
        { t: 'Replace instances that fail load balancer health checks', b: 'ha', why: 'ELB health checks on the ASG.' },
        { t: 'Recover from ransomware that encrypted production', b: 'dr', why: 'locked backups.' }] } },
      { drills: ['H5', 'H9', 'H10'] }
    ] },

    /* ---------------------------------------------------------------- 4 */
    { id: 'ch4', title: 'RDS: Multi-AZ, read replicas and backups', domains: 'D2 D3', blocks: [
      'RDS offers three different kinds of copy, and the exam tests whether you know which one does what. They are often combined.',
      { h: 'Multi-AZ DB instance: a standby for failover' },
      'RDS keeps a **synchronous** standby in another AZ. Every write is committed on both, so failover loses nothing (RPO zero). The standby **serves no reads** — it exists only to take over. When the primary’s AZ, instance or storage fails (or during some maintenance), RDS promotes the standby and **updates the DNS CNAME** of the DB endpoint to point at it. Failover typically takes **60–120 seconds**. The application keeps the **same endpoint name**; it only has to reconnect (and should not cache DNS for long).',
      { widget: 'stepper', args: { title: 'An RDS Multi-AZ failover', line: 'rds', steps: [
        { title: 'Normal operation', text: 'The app connects to `mydb.xxxx.eu-west-1.rds.amazonaws.com`, a CNAME that points at the primary in AZ a. Every write is also committed synchronously on the standby in AZ b.' },
        { title: 'AZ a fails', text: 'The primary stops answering. Connections break; the application starts retrying.' },
        { title: 'RDS promotes the standby', text: 'RDS detects the failure and promotes the standby in AZ b to primary. It already has every committed write.' },
        { title: 'The CNAME is updated', text: 'RDS points the **same endpoint name** at the new primary. Nothing in the application configuration changes; no IP address is moved.', note: 'This is your baseline Q61. The answer is “the CNAME flips to the standby”, not “the IP moves” and not “promote a read replica”.', noteTitle: 'Your miss' },
        { title: 'Back to Multi-AZ', text: 'RDS creates a new standby in another AZ, so the database is protected again. Typically 60–120 seconds of disruption in total.' }] } },
      { check: fromDrill('H1') },
      { h: 'Multi-AZ DB cluster: readable standbys, faster failover' },
      'For **RDS for MySQL and PostgreSQL** there is a second deployment type: a **Multi-AZ DB cluster** with one **writer** and **two readable standbys** in three AZs, kept in sync semisynchronously. Failover is typically **under 35 seconds**, and the standbys serve reads through a reader endpoint. Many banks predate it; when a question wants faster failover **and** readable standbys on RDS, it is the answer.',
      { h: 'Read replicas: copies for reading' },
      'A **read replica** is an **asynchronous**, readable copy, in the same AZ, another AZ or **another Region**. Its job is **read scaling**: point reporting and read-heavy traffic at it. It is also a cheap cross-Region DR copy, but it is **promoted manually** — it never takes over on its own. Limits: **15** read replicas per source for MySQL, MariaDB and PostgreSQL, **5** for Oracle and SQL Server, **3** for Db2. The source must have automated backups enabled. SQL Server does not support cross-Region replicas.',
      { callout: 'Older material says 5 read replicas per RDS database. For MySQL, MariaDB and PostgreSQL the limit is now **15** (Oracle and SQL Server stay at 5).', kind: 'update' },
      { pair: 'maz-rr' },
      { check: fromDrill('H11') },
      { check: fromDrill('H12') },
      { h: 'Backups and point-in-time recovery' },
      { ul: [
        '**Automated backups**: a daily snapshot plus transaction logs, kept **0–35 days** (0 turns them off and deletes existing automated backups). They allow **point-in-time restore** to any second up to about the **last 5 minutes** — always into a **new** DB instance.',
        '**Manual snapshots** are kept until you delete them, and can be **copied to another Region or shared with another account**.',
        '**Cross-Region automated backup replication** copies snapshots and logs to a second Region so you can do point-in-time restore there — a backup-and-restore DR design for RDS.'] },
      { check: fromDrill('H13') },
      { check: { id: 'ch4-replica-bad', q: 'A developer ran `UPDATE orders SET status = \'cancelled\'` without a WHERE clause on an RDS for MySQL Multi-AZ database with two read replicas, ten minutes ago. Which copy still has the right data?', opts: [
        { t: 'The Multi-AZ standby.', why: 'synchronous — it applied the update at the same moment.' },
        { t: 'The read replicas.', why: 'asynchronous, but lag is seconds; they applied it long ago.' },
        { t: 'A point-in-time restore to a moment before the update.', why: 'automated backups plus logs let you go back to the second before.' }], a: 2,
        why: 'Standbys and replicas protect against losing infrastructure, not against bad writes. Bad data needs a copy from before the mistake.' } },
      { drills: ['H1', 'H11', 'H12', 'H13'] }
    ] },

    /* ---------------------------------------------------------------- 5 */
    { id: 'ch5', title: 'Aurora: replicas, Global Database, Backtrack', domains: 'D2 D3', blocks: [
      'Aurora separates compute from a shared **cluster volume**. That changes how it survives failures.',
      { h: 'Inside a Region' },
      { ul: [
        'The volume stores data in 10 GiB segments, each with **six copies across three AZs**. It keeps accepting writes after losing two copies and reads after losing three, and repairs itself.',
        'Up to **15 Aurora Replicas** read the same volume (so replica lag is usually milliseconds). Each has a **failover priority tier** from 0 (highest) to 15.',
        'If the writer fails, Aurora promotes the replica with the best tier (ties: the largest). Service is typically restored in **under 60 seconds, often under 30**. With **no** replica, Aurora recreates the writer — typically under 10 minutes. So “Aurora HA” = at least one replica in another AZ.'] },
      { h: 'Aurora Global Database: across Regions' },
      'A global database has one **primary** cluster (reads and writes) and up to **10 secondary** Regions (read-only), replicated **at the storage layer** with lag typically **under a second**. Secondaries serve **low-latency local reads**; **write forwarding** can send writes from a secondary to the primary. In a disaster a secondary is promoted in about a minute. This is the relational answer to “cross-Region, RPO of about a second, RTO of about a minute”.',
      { callout: 'Global Database supports up to **10 secondary Regions** since May 2025 (banks and even the AWS DR whitepaper still say 5). “Managed planned failover” is now called **switchover**, and the managed unplanned **failover** (August 2023) replaced the old manual “detach and promote”. A **global writer endpoint** follows the primary.', kind: 'update' },
      { h: 'Switchover or failover?' },
      { table: { head: ['', 'Switchover', 'Failover'], key: true, rows: [
        ['When', 'planned: Region rotation, DR test, compliance exercise', 'unplanned: the primary Region is impaired'],
        ['Needs a healthy primary', 'yes', 'no'],
        ['Data loss', 'none — it waits for the secondary to catch up', 'whatever had not yet replicated (the lag = the RPO)'],
        ['Topology afterwards', 'kept; the old primary becomes a secondary', 'the old primary rejoins as a secondary when it recovers']] } },
      { widget: 'stepper', args: { title: 'Aurora Global Database failover', line: 'aurora', steps: [
        { title: 'Normal operation', text: 'Primary cluster in us-east-1 takes writes; the secondary in eu-west-1 receives storage-level replication, typically under a second behind, and serves local reads.' },
        { title: 'us-east-1 is impaired', text: 'Writes fail. The operator (or a runbook, or an ARC Region switch plan) decides to fail over.' },
        { title: 'Fail over to eu-west-1', text: 'Choose **failover** (not switchover — there is no healthy primary). The secondary becomes the writer, typically within about a minute. Writes that had not replicated are the data loss.' },
        { title: 'Redirect the application', text: 'Use the global writer endpoint, or switch traffic (Route 53, ARC) to the application stack in eu-west-1.' },
        { title: 'Recover the old Region', text: 'When us-east-1 is back, its cluster rejoins as a secondary. Later, a planned **switchover** can move the primary back with no data loss.' }] } },
      { pair: 'agd-rr' },
      { check: fromDrill('H14') },
      { check: fromDrill('H15') },
      { h: 'Backtrack' },
      'Aurora MySQL can **backtrack**: rewind the **same** cluster to an earlier time, in place, within a window of up to **72 hours**. It must be enabled when the cluster is created or restored, and it does not work with Global Database or binlog replication. It is the fastest undo for a bad statement; the general alternative is point-in-time restore, which creates a **new** cluster.',
      { check: fromDrill('H16') },
      { h: 'Aurora DSQL' },
      '**Aurora DSQL** (GA May 2025) is a serverless, PostgreSQL-compatible database that is **active-active across Regions** with strong consistency: two peered Regions accept reads and writes, and a third **witness** Region (which holds no full copy) breaks ties. Designed for 99.999% multi-Region availability. Too new for most banks; when a question wants relational, serverless, writes in two Regions and no failover step, it is the fit.',
      { drills: ['H14', 'H15', 'H16'] }
    ] },

    /* ---------------------------------------------------------------- 6 */
    { id: 'ch6', title: 'DynamoDB and caches across Regions', domains: 'D2 D3', blocks: [
      'DynamoDB already replicates every table across several AZs in its Region; there is nothing to switch on for an AZ failure. For Regions and for bad data it has three tools.',
      { h: 'Global tables' },
      'A **global table** is a set of replica tables in several Regions that **all accept reads and writes**. It is multi-active: there is no primary and no failover step — if a Region fails, send users to another. The current version is **2019.11.21**; older banks may mention the 2017 version.',
      { table: { head: ['Mode', 'Replication', 'Conflicts', 'RPO', 'Deciding words'], key: true, rows: [
        ['**MREC** (multi-Region eventual consistency, default)', 'asynchronous, typically within a second', 'last writer wins', 'about a second', 'active-active, write locally, low latency everywhere'],
        ['**MRSC** (multi-Region strong consistency)', 'synchronous agreement', 'none — strongly consistent reads everywhere', '**zero**', 'RPO zero, always read the latest write in any Region']] } },
      { callout: '**MRSC** became generally available in **June 2025**. It must be deployed in **exactly three Regions** — three replicas, or two replicas plus a **witness** (which cannot be read or written and costs nothing for storage or writes). No transaction APIs. The mode is chosen at creation and cannot be changed.', kind: 'update' },
      { pair: 'gt-agd' },
      { check: fromDrill('H17') },
      { check: fromDrill('H19') },
      { h: 'Point-in-time recovery and backups' },
      'Global tables copy **every** write, including the wrong ones. Against bad data, DynamoDB has **point-in-time recovery**: continuous backups with per-second granularity, restored into a **new table**. **On-demand backups** keep full copies until deleted (and AWS Backup can manage, copy and lock them). **Export to S3** (full or incremental) needs PITR enabled.',
      { callout: 'The PITR recovery period is now **configurable from 1 to 35 days** (January 2025); older material says it is always 35 days.', kind: 'update' },
      { check: fromDrill('H18') },
      { h: 'Caches' },
      'An **ElastiCache** (Redis OSS or Valkey) replication group with **Multi-AZ** fails over automatically to a replica in another AZ; the primary endpoint’s DNS follows. For another Region, a **Global Datastore** keeps up to **two secondary Regions** with replication lag typically under a second; a secondary can be promoted in under a minute.',
      { h: 'Which database feature?' },
      { widget: 'chooser', args: { title: 'Which database resilience feature?', tree: DB } },
      { drills: ['H17', 'H18', 'H19'] }
    ] },

    /* ---------------------------------------------------------------- 7 */
    { id: 'ch7', title: 'Replication is not a backup', domains: 'D2 D1', blocks: [
      'Every replica in this session — Multi-AZ standbys, read replicas, Aurora Replicas, Global Database, global tables, S3 replication, EFS replication — shares one property: it copies **whatever** is written, within milliseconds to minutes. That is exactly what you want when an AZ or a Region disappears, and exactly what you do not want when the data itself goes wrong. A bad deploy, an accidental `DELETE`, an attacker encrypting files: the replicas receive it too.',
      '**Backups** are different: point-in-time copies you can go back to. The rule for every question: **FAILURE = bad data → a copy from before the mistake** (PITR, versions, snapshots, AWS Backup). And against someone who holds admin credentials, only copies they **cannot delete** help.',
      { widget: 'threatMatrix' },
      { pair: 'rep-bak' },
      { h: 'S3 replication' },
      { ul: [
        '**Cross-Region Replication (CRR)** and **Same-Region Replication (SRR)** copy **new** objects asynchronously to a destination bucket, in the same or another account. **Versioning is required** on both buckets.',
        '**Existing** objects (and objects that failed to replicate) are not copied by a new rule; run **S3 Batch Replication**.',
        'Delete markers are not replicated by default, and deleting a specific object version is **never** replicated — a small protection against malicious deletes. An **overwrite** creates a new version, which is replicated.',
        '**Replication Time Control (RTC)** replicates most objects in seconds and 99.99% within 15 minutes, with replication metrics and events.',
        '**Multi-Region Access Points** give one global endpoint over buckets in several Regions; **failover controls** make it active-passive, with two-way replication keeping the buckets in sync.'] },
      { callout: 'Practice banks often say RTC has “an SLA of 99.99% within 15 minutes”. AWS: RTC is **designed** to replicate 99.99% of objects within 15 minutes; the **SLA** commits to **99.9%** per billing month.', kind: 'update' },
      { check: fromDrill('H20') },
      { check: fromDrill('H21') },
      { h: 'Block and file storage' },
      { ul: [
        '**EBS snapshots** are incremental, stored regionally (across AZs), and can be **copied to another Region** or shared with another account. **Fast Snapshot Restore** gives volumes full performance immediately. **Recycle Bin** keeps deleted snapshots and EBS-backed AMIs (1–365 days) and now also deleted **EBS volumes** (1–7 days).',
        '**Amazon Data Lifecycle Manager (DLM)** automates EBS snapshot and AMI creation, retention and cross-Region copy — **EBS only**.',
        '**EFS replication** keeps a read-only copy in another Region (or the same); AWS states an **RPO of 15 minutes** for most file systems. **Failover** makes the destination writable; **failback** reverses the replication.',
        '**FSx** backups copy across Regions and accounts through AWS Backup.'] },
      { check: fromDrill('H22') },
      { drills: ['H20', 'H21', 'H22', 'H18'] }
    ] },

    /* ---------------------------------------------------------------- 8 */
    { id: 'ch8', title: 'AWS Backup: plans, vaults, locks and restore tests', domains: 'D2 D1', blocks: [
      'AWS Backup is the **central** backup service. Instead of a script per service, you write one **backup plan** and let it select resources — usually by **tag** — across EC2 and EBS, RDS and Aurora, DynamoDB, EFS, FSx, S3, DocumentDB, Neptune, Redshift, EKS, Storage Gateway, VMware, SAP HANA on EC2 and more.',
      { h: 'The parts' },
      { table: { head: ['Part', 'What it does'], key: true, rows: [
        ['**Backup plan**', 'schedule (snapshots as often as hourly), retention (up to 100 years), lifecycle to cold storage, **copy rules**'],
        ['**Continuous backup**', 'point-in-time restore for **S3, RDS, Aurora** (and SAP HANA on EC2), 1-second precision, up to **35 days**'],
        ['**Backup vault**', 'where recovery points live, encrypted with a KMS key, with an access policy'],
        ['**Copy rules**', 'copies to a vault in **another Region** and/or **another account** (the classic DR copy)'],
        ['**Vault Lock**', 'WORM: **governance mode** (users with permission can remove it) or **compliance mode** (after a grace time of at least **72 hours**, nobody can delete recovery points early or change the lock — not the root user, not AWS)'],
        ['**Logically air-gapped vault**', 'locked by default, keys owned by AWS or you, shareable through **AWS RAM** with a recovery account'],
        ['**Restore testing**', 'restores recovery points on a schedule, validates them and records restore time'],
        ['**Backup Audit Manager**', 'reports whether backups comply with controls you define (uses AWS Config)'],
        ['**Backup policies** (Organizations)', 'push backup plans to every account (Session 6)']] } },
      { callout: 'Newer than most banks: **logically air-gapped vaults** can now be the **primary** backup target (November 2025; before, they only held copies), **restore testing** went GA in November 2023, and the list of supported services keeps growing (EKS, Aurora DSQL …). Do not confuse **Backup Audit Manager** (part of AWS Backup) with **AWS Audit Manager** (a separate service, closed to new customers).', kind: 'update' },
      { h: 'AWS Backup or DLM?' },
      { callout: 'Your baseline **Q29**. **DLM** is the simplest tool when the question names **only EBS** (snapshots or AMIs). The moment it names **another service**, **another account**, **compliance**, **immutability** or **one place**, it is **AWS Backup**.', kind: 'miss', title: 'Your miss' },
      { check: fromDrill('H2', 'Exam Q29') },
      { h: 'Ransomware-resilient backups' },
      { widget: 'stepper', args: { title: 'Backups an attacker cannot destroy', line: 'backup', steps: [
        { title: 'Back up by tag', text: 'A backup plan selects every resource tagged `backup=daily` in the production account: EBS, RDS, DynamoDB, EFS, S3.' },
        { title: 'Copy out of the account', text: 'A copy rule sends each recovery point to a vault in a **separate backup account** (or into a **logically air-gapped vault**). Production administrators have no access there.' },
        { title: 'Lock the copies', text: 'Vault Lock in **compliance mode** on the destination vault. After the grace time (at least 72 h) nobody can delete recovery points before their retention ends — even with root credentials.', note: 'Governance mode would let a privileged user remove the lock. Use it to test settings; switch to compliance mode for protection.' },
        { title: 'Prove it works', text: 'A **restore testing** plan restores samples on a schedule and records how long each takes — evidence for auditors, and your real RTO.' },
        { title: 'Recover', text: 'After an incident, restore from the locked copies into a clean account or Region. Replication would have copied the encrypted data; these copies predate it.' }] } },
      { check: fromDrill('H23') },
      { check: fromDrill('H24') },
      { check: fromDrill('H25') },
      { drills: ['H2', 'H23', 'H24', 'H25'] }
    ] },

    /* ---------------------------------------------------------------- 9 */
    { id: 'ch9', title: 'Elastic Disaster Recovery: DR for whole servers', domains: 'D2', blocks: [
      'Backups restore data; databases replicate themselves. What about **servers** — hundreds of on-premises VMs and physical machines, or EC2 instances that must recover in another Region? That is **AWS Elastic Disaster Recovery (DRS)**. You met it in Session 2 as MGN’s twin; here it is a DR strategy.',
      { h: 'How it works' },
      { ol: [
        'An **agent** on each source server (physical, virtual, other cloud, or EC2 in another Region) replicates every disk **continuously at block level**.',
        'The data lands in a **staging area** subnet in the recovery Region: small replication servers and cheap EBS volumes. No full-size servers run.',
        'DRS keeps **point-in-time** recovery snapshots (crash-consistent EBS snapshots), so you can recover to a moment **before** ransomware or corruption.',
        'For a **drill** or a real **failover** you **launch recovery instances**: full-size EC2 instances built from the replicated data, typically within minutes.',
        'After the source site is repaired, **failback** replicates the recovery instances back and cuts over again.'] },
      'AWS states an **RPO of seconds** (typically sub-second) and an **RTO typically between 5 and 20 minutes**. It is priced per replicating source server per hour, plus the staging resources — much cheaper than running a standby of every server. The DR whitepaper classes it as a **pilot light** implementation for servers.',
      { callout: 'DRS is the next generation of **CloudEndure Disaster Recovery** — older questions may say CloudEndure. Its docs now give the RTO as **typically 5–20 minutes** rather than just “minutes”.', kind: 'update' },
      { widget: 'stepper', args: { title: 'A DR drill with DRS, then a real failover and failback', line: 'drs', steps: [
        { title: 'Install and replicate', text: 'Install the agent on the 200 source servers. Initial sync copies every disk; after that only changed blocks flow, continuously.' },
        { title: 'Drill', text: 'Launch **drill** instances from the latest point in time into an isolated subnet. Test the applications; terminate them. Replication never stops.' },
        { title: 'Disaster', text: 'The data centre fails. Launch **recovery** instances from the latest (or a chosen earlier) point in time; switch DNS or network routes to them. Minutes, not hours.' },
        { title: 'Run in AWS', text: 'The applications run on EC2. Changes are written in AWS now; the old site is down.' },
        { title: 'Fail back', text: 'When the site is repaired, install the failback client on the source machines, replicate the recovery instances back, and cut over. Nothing written in AWS is lost.' }] } },
      { pair: 'drs-bak-mgn' },
      { check: fromDrill('H26') },
      { check: fromDrill('H27') },
      { drills: ['H26', 'H27'] }
    ] },

    /* ---------------------------------------------------------------- 10 */
    { id: 'ch10', title: 'Failing over: Route 53, Global Accelerator, ARC', domains: 'D2 D3', blocks: [
      'A DR copy is useless until traffic reaches it. Three services move users from a failed endpoint to a healthy one, and they differ in how and how fast.',
      { h: 'Route 53 failover routing' },
      'A **failover** record pair has a primary and a secondary. Route 53 answers with the primary while its **health check** passes, and with the secondary when it fails. **Latency** or **weighted** records with health checks do the same for active/active designs.',
      { table: { head: ['Health check type', 'Checks', 'Use for'], key: true, rows: [
        ['**Endpoint**', 'HTTP, HTTPS or TCP from health checkers **on the internet**, every **30 s** (standard) or **10 s** (fast); unhealthy after **3** consecutive failures by default (1–10)', 'public endpoints'],
        ['**Calculated**', 'combines other health checks (e.g. healthy if 2 of 3 are)', 'a whole stack’s health'],
        ['**CloudWatch alarm**', 'the state of an alarm on a metric', '**private** resources the checkers cannot reach']] } },
      'For **alias** records to AWS resources (ELB, CloudFront, S3 website) set **Evaluate target health** instead of a separate check: Route 53 uses the load balancer’s own health.',
      { h: 'How long does a DNS failover take?' },
      'Detection (interval × threshold) plus the **TTL** — resolvers and clients keep using the old answer until it expires. Try the settings:',
      { widget: 'failoverTime' },
      { check: fromDrill('H28') },
      { check: fromDrill('H29') },
      { h: 'Global Accelerator' },
      'Global Accelerator gives the application two **static anycast IP addresses**. Users reach the nearest AWS edge; the accelerator forwards over the AWS network to an **endpoint group** in a Region. When health checks fail, traffic goes to the next endpoint group — no DNS answer changes, so there is no TTL to wait for. It is the answer when the scenario says **fixed IPs**, **IP allow lists**, **UDP**, or failover that **must not depend on DNS caching**.',
      { callout: 'Your baseline prestige pick. Global Accelerator is **right** in H4 (static IPs that partners allow-list, UDP, no DNS dependence) and wrong in H3, H5 and H28, where DNS failover or plain Multi-AZ does the job.', kind: 'miss', title: 'Your misses' },
      { check: fromDrill('H4', 'Exam pattern') },
      { h: 'Amazon Application Recovery Controller (ARC)' },
      { ul: [
        '**Routing controls**: on/off switches, exposed through a highly available **data-plane** API and tied to Route 53 health checks. An operator flips “us-east-1 off” and DNS fails over — a controlled, manual failover that does not depend on editing records.',
        '**Zonal shift**: move a load balancer’s (or Auto Scaling group’s) traffic **out of one AZ** for a set time, and back. **Zonal autoshift** lets AWS do it automatically when its telemetry sees an AZ impairment; weekly practice runs are required, and AWS says to pre-scale rather than rely on Auto Scaling.',
        '**Region switch** (August 2025): **plans** that orchestrate a multi-Region recovery — scale the DR Auto Scaling groups, fail over Aurora Global Database, flip routing controls — as ordered steps, run from the Region being activated, with the measured recovery time reported.'] },
      { callout: 'Route 53 ARC is now **Amazon Application Recovery Controller**. **Readiness checks** are closed to new customers (maintenance from 30 April 2026); everything else is unaffected. Also new: **Route 53 accelerated recovery** (November 2025) keeps **changes** to public DNS records possible within about 60 minutes if us-east-1 is impaired — answering DNS queries never depended on us-east-1.', kind: 'update' },
      { check: fromDrill('H30') },
      { h: 'Data plane over control plane' },
      'Well-Architected’s rule for failover: use **data-plane** operations, which are built for very high availability, and avoid **control-plane** operations (creating, editing, scaling) during a recovery. Route 53 health-check failover and ARC routing controls are data plane; editing DNS weights, changing Global Accelerator traffic dials, scaling out and restoring backups are control plane. It is also why static stability pre-provisions capacity.',
      { h: 'CloudFront origin failover' },
      'For content served through CloudFront, an **origin group** sends a request to a secondary origin when the primary returns chosen status codes (for example 500, 502, 503, 504, 429) or times out. It works per request and only for GET, HEAD and OPTIONS — a read-path failover (Session 4).',
      { pair: 'r53-ga-arc' },
      { drills: ['H28', 'H29', 'H30', 'H4'] }
    ] },

    /* ---------------------------------------------------------------- 11 */
    { id: 'ch11', title: 'The cost of resilience, and proving it works', domains: 'D4 D2', blocks: [
      'Every step up the DR ladder buys a lower RTO and RPO with standing cost: backup storage, then live replicas, then a small running stack, then a second full production. The right design is the one whose standing cost is justified by what downtime costs the business. Exam questions state that trade-off for you as an RTO, an RPO and a superlative — but it helps to see why “most cost-effective” so often means the lowest tier that still meets the targets.',
      { widget: 'drCost' },
      { h: 'Cost levers inside each strategy' },
      { ul: [
        '**Backup and restore**: lifecycle old recovery points to cold storage; keep only the copies the RPO needs; infrastructure as code so the rebuild is fast without anything running.',
        '**Pilot light**: replicate only the data; keep compute **not deployed** (or at zero) and AMIs current. DRS’s staging area is the server version of this.',
        '**Warm standby**: run the minimum that can serve; rely on scaling at failover (and accept the control-plane dependency — or pre-scale for a lower RTO).',
        '**Multi-site**: both Regions serve users, so the “standby” capacity is doing useful work.',
        '**Inside a Region**: three AZs need less spare capacity than two for the same static stability (Chapter 3).'] },
      { check: { id: 'ch11-cost', q: 'Two designs meet a stated RTO of 4 hours and an RPO of 1 hour: hourly AWS Backup copies to another Region, or a warm standby. The question asks for the **most cost-effective** solution. Which?', opts: [
        { t: 'Warm standby — faster is always safer.', why: 'it meets the targets, but pays all year for minutes of RTO nobody asked for.' },
        { t: 'Backup and restore with hourly copies — nothing runs in the DR Region.', why: 'the cheapest design that meets both targets.' }], a: 1,
        why: 'Cheapest design that meets both targets. Anything faster is over-engineering for this question.' } },
      { h: 'Test it' },
      { ul: [
        '**AWS Fault Injection Service (FIS)** — formerly Fault Injection Simulator — runs controlled experiments: stop instances, throttle APIs, inject latency, and scenario-library events such as **AZ Availability: Power Interruption** and **Cross-Region: Connectivity**. It proves that the Multi-AZ design really survives an AZ.',
        '**DR drills**: DRS drill instances, Aurora Global Database switchovers, ARC practice runs and Region switch plan evaluations measure your real RTO.',
        '**AWS Backup restore testing** proves that backups restore and how long it takes (Chapter 8).',
        '**AWS Resilience Hub** assesses an application against resilience policies (RTO/RPO targets) and recommends improvements.'] },
      { callout: 'The **next generation of AWS Resilience Hub** (GA May 2026) replaces the single RTO/RPO policy per application with **modular policies** (disaster recovery, availability, data recovery), models applications as systems and user journeys, discovers dependencies, and integrates with AWS Organizations. The first version stays available. **Fault Injection Simulator** was renamed **Fault Injection Service**.', kind: 'update' },
      { check: { id: 'ch11-fis', q: 'A company claims its web tier survives an AZ failure. The CTO wants proof in a controlled experiment before the next audit. What should the architect use?', opts: [
        { t: 'AWS Resilience Hub only.', why: 'it assesses and recommends; it does not disrupt anything to prove behaviour.' },
        { t: 'AWS Fault Injection Service with an AZ power-interruption scenario.', why: 'it injects the failure and lets you watch the application survive it.' },
        { t: 'Amazon ARC readiness checks.', why: 'closed to new customers, and they check configuration, not behaviour.' }], a: 1,
        why: 'Proof by experiment = FIS. Resilience Hub assesses; restore testing proves backups.' } },
      { drills: ['H3', 'H6', 'H9'] }
    ] },

    /* ---------------------------------------------------------------- 12 */
    { id: 'ch12', title: 'Triggers, traps, cheat block and record', blocks: [
      'The whole session on one map: tap a line to see what it was built for, its triggers, its traps and your misses on it.',
      { map: true },
      { widget: 'triggerTable' },
      { link: '#traps', text: 'All 16 traps, each linked to the drills that test it →' },
      { pre: S.cheat, label: 'Cheat block · copy it by hand' },
      { h: 'Your record' },
      { log: true },
      'H1 and H2 are your baseline misses Q61 and Q29; H3–H5 carry the Global Accelerator / second-Region prestige pattern (wrong in H3 and H5, right in H4). Eight more drills put a prestige option among the answers. Run the 30 scenarios once; your new misses appear in Progress.',
      { link: '#drill', text: 'Go to the drill (30 scenarios)', btn: true }
    ] }
  ];
})();
