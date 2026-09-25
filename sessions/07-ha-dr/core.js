/* Session 7 — HA & disaster recovery: meta, lines, two-Region map, stub, method, cheat sheet, compare, traps, log.
   Colour rule: a service keeps its colour on every page. Global Accelerator keeps its indigo (Session 4) and Elastic
   Disaster Recovery keeps the MGN red, dashed (Session 2); no new hue is added (docs/session-07-ha-dr.md, "Colour rule").
   Every other Session 7 family is an ink line (4 px) with its own dash pattern and station shape, and every line is
   labelled. Facts: docs/session-07-ha-dr.md, "Facts verified". */
(function () {
  'use strict';
  const S = (window.SESSION = window.SESSION || {});
  const INK = 'fill:var(--surface);stroke:var(--ink);stroke-width:3';
  const FONT = 'Atkinson Hyperlegible, sans-serif';
  const HALO = ';paint-order:stroke;stroke:var(--surface);stroke-width:5px;stroke-linejoin:round';
  const sub = (x, y, text, lines, anchor, halo) => ({ el: 'text', lines, a: { x, y, 'font-size': 11.5, 'font-family': FONT, 'text-anchor': anchor || null }, style: 'fill:var(--ink2)' + (halo == null ? HALO : halo), text });
  const T = (x, y, text, lines, anchor) => ({ el: 'text', pick: lines, a: { x, y, 'font-size': 13, 'font-weight': 700, 'font-family': FONT, 'text-anchor': anchor || null }, style: 'fill:var(--ink)' + HALO, text });
  const shape = (d, lines, pick) => Object.assign({ lines: pick ? undefined : lines, pick: pick ? lines : undefined, style: INK }, d);
  const circle = (cx, cy, lines, pick) => shape({ el: 'circle', a: { cx, cy, r: 8 } }, lines, pick);
  const big = (cx, cy, lines, pick) => shape({ el: 'circle', a: { cx, cy, r: 11 } }, lines, pick);
  const ring = (cx, cy, lines) => [shape({ el: 'circle', a: { cx, cy, r: 10 } }, lines, true), { el: 'circle', pick: lines, a: { cx, cy, r: 3.5 }, style: 'fill:var(--ink)' }];
  const square = (cx, cy, lines, pick) => shape({ el: 'rect', a: { x: cx - 8, y: cy - 8, width: 16, height: 16 } }, lines, pick);
  const diamond = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx} ${cy - 10} L${cx + 10} ${cy} L${cx} ${cy + 10} L${cx - 10} ${cy} Z` } }, lines, pick);
  const triangle = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx} ${cy - 10} L${cx + 10} ${cy + 7} L${cx - 10} ${cy + 7} Z` } }, lines, pick);
  const hexa = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx - 5} ${cy - 9} H${cx + 5} L${cx + 10} ${cy} L${cx + 5} ${cy + 9} H${cx - 5} L${cx - 10} ${cy} Z` } }, lines, pick);
  const penta = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx} ${cy - 10} L${cx + 10} ${cy - 2} L${cx + 6} ${cy + 9} L${cx - 6} ${cy + 9} L${cx - 10} ${cy - 2} Z` } }, lines, pick);
  const LABELS = [];
  const box = (x, y, w, hgt, label, right) => {
    LABELS.push({ el: 'text', a: { x: right ? x + w - 10 : x + 10, y: y + 18, 'font-size': 11, 'font-weight': 800, 'letter-spacing': 1, 'text-anchor': right ? 'end' : null }, style: 'fill:var(--ink2)' + HALO, text: label });
    return [{ el: 'rect', a: { x, y, width: w, height: hgt, rx: 8 }, style: 'fill:var(--surface);stroke:var(--chip-border);stroke-width:1.5' }];
  };
  const zoneLabel = (x, y, t, anchor) => ({ el: 'text', a: { x, y, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5, 'text-anchor': anchor || null }, style: 'fill:var(--ink2)', text: t });

  Object.assign(S, {
    meta: { id: '07-ha-dr', n: 7, title: 'HA & Disaster Recovery', brand: 'HA & DR Transit Map', home: '../../', updated: '2026-09-25' },

    lines: [
      { id: 'r53', name: 'Route 53 failover · ARC', short: 'Route 53', cls: 'ink', width: 4, dash: '12 8', alias: ['Route 53', 'DNS failover', 'failover routing', 'health check', 'evaluate target health', 'Application Recovery Controller', 'ARC', 'routing control', 'zonal shift', 'zonal autoshift', 'Region switch'],
        verb: 'sends users to the healthy Region', from: 'users → Route 53 (failover / latency / weighted record + health check) → primary or DR endpoint · ARC routing controls, zonal shift, Region switch',
        built: 'The **DNS switch** for failover between Regions (or endpoints). A **failover record** pair answers with the primary while its **health check** passes and with the secondary when it fails; **latency** or **weighted** records spread active/active traffic. Health checks: **endpoint** (HTTP/HTTPS/TCP from checkers on the internet; every 30 s or 10 s, 3 failures by default), **calculated** (combines others) and **CloudWatch alarm** (for private resources). **Amazon ARC** adds **routing controls** (on/off switches you flip through a data-plane API), **zonal shift** (move a load balancer’s traffic out of one AZ) and **Region switch** (orchestrated multi-Region recovery plans). Failover time = detection + the record’s **TTL** that resolvers cache.',
        says: ['active-passive failover', 'fail over to a secondary Region', 'health check', 'route traffic to a static maintenance page', 'shift traffic away from an impaired Availability Zone', 'orchestrate a Region failover', 'latency-based routing to two Regions'],
        switch: [{ to: 'ga', when: 'clients cache DNS or need fixed IP addresses, or failover must not wait for a TTL' }, { to: 'asg', when: 'the failure is one AZ inside a Region and a load balancer already spans the AZs' }],
        traps: ['Expecting DNS failover faster than health-check detection plus the TTL.', 'A public endpoint health check against a private IP: use a CloudWatch-alarm health check.', 'Changing record weights by hand during an outage (a control-plane action) instead of health-check failover or ARC routing controls (data plane).', 'ARC readiness checks as a new design: closed to new customers.'],
        update: 'Route 53 ARC is now **Amazon Application Recovery Controller (ARC)**. **Readiness checks** are no longer open to new customers (maintenance from 30 Apr 2026); routing controls, zonal shift, zonal autoshift and **Region switch** (Aug 2025) are unaffected. **Accelerated recovery** (Nov 2025) keeps **DNS changes** for public hosted zones possible within about 60 minutes if us-east-1 is impaired — answering queries was never affected.' },
      { id: 'ga', name: 'Global Accelerator', short: 'GA', cls: 'ga', textVar: 'ga-text', alias: ['Global Accelerator', 'anycast', 'static IP', 'endpoint group', 'traffic dial'],
        verb: 'moves traffic behind two static IPs', from: 'users → 2 static anycast IPs → nearest AWS edge → AWS network → healthiest endpoint group (Region)',
        built: 'Two **static anycast IP addresses** in front of ALBs, NLBs, EC2 instances or Elastic IPs in one or more Regions. Traffic enters AWS at the nearest edge location and travels the AWS network. When an endpoint group’s health checks fail, traffic moves to the next group **at the edge** — no DNS answer to expire. For ALB and NLB endpoints it reuses the load balancer’s own health checks. **Traffic dials** set the share per Region. It does **not** cache content.',
        says: ['static IP addresses', 'clients cannot use DNS', 'allow-list IP addresses in the customer firewall', 'failover without waiting for DNS caching', 'UDP', 'multi-Region with fixed entry points'],
        switch: [{ to: 'r53', when: 'plain DNS failover is enough and there is no IP or TTL constraint (cheaper)' }, { to: 'asg', when: 'the requirement is only to survive an AZ failure in one Region' }],
        misses: 'Your prestige distractor from the baseline, picked **twice** where it had no role. In this session it is **right** only when the scenario says **static IPs** or **no DNS caching / near-instant Region failover**. For an AZ failure or a cost-driven DR question it is decoration.',
        traps: ['Global Accelerator to survive an AZ failure (the ALB and Auto Scaling group already span AZs).', 'Global Accelerator as a cache (that is CloudFront).', 'Adding Global Accelerator to a backup-and-restore design with a 24-hour RTO.'],
        update: 'Dual-stack accelerators get **4** static IPs (2 IPv4 + 2 IPv6) — Session 4. Changing a traffic dial is a control-plane action; health-check failover is not.' },
      { id: 'asg', name: 'Multi-AZ compute · ASG · ELB', short: 'Multi-AZ', cls: 'ink', width: 4, alias: ['Auto Scaling', 'Auto Scaling group', 'ASG', 'load balancer', 'ELB health check', 'cross-zone', 'static stability', 'automatic recovery', 'spread placement group', 'Multi-AZ'],
        verb: 'keeps running when an AZ fails', from: 'ALB / NLB across AZs → Auto Scaling group in every AZ → ELB health checks replace bad instances · EC2 automatic recovery for single instances',
        built: '**High availability inside a Region.** An **Auto Scaling group** spread over several **Availability Zones** behind a **load balancer** survives an instance or an AZ: the load balancer stops sending to unhealthy targets, and with **ELB health checks** turned on the group replaces instances the load balancer marks unhealthy. **Static stability**: provision enough in the surviving AZs **before** the failure so nothing must launch during it. A single instance that cannot be clustered gets **EC2 automatic recovery** (same instance ID, IPs and EBS volumes on new hardware after a system status check fails).',
        says: ['survive the failure of an Availability Zone', 'highly available', 'stateless web tier', 'without manual intervention', 'no capacity loss if an AZ fails', 'instance must keep its IP address', 'underlying hardware failure'],
        switch: [{ to: 'r53', when: 'a whole Region must be survived (DR, not HA)' }, { to: 'rds', when: 'the stateful part — the database — must survive the AZ' }],
        misses: 'The HA/DR split is the first cut: **AZ failure → Multi-AZ in one Region**, cheap and automatic. **Region failure → a DR strategy**. Answers that bring a second Region, Global Accelerator or Aurora Global Database to an AZ problem are prestige picks.',
        traps: ['Auto Scaling group in one AZ “for HA”.', 'Relying on scaling out during an AZ failure instead of pre-provisioned (statically stable) capacity.', 'ASG with EC2 health checks only: an instance that is running but failing requests is never replaced.', 'EC2 automatic recovery for instance-store data (it is lost).'],
        update: '**Simplified automatic recovery** is on by default for supported instance types (not for instances with instance store). CloudWatch-alarm recovery now also works for some instance-store types, but instance-store data is lost. **Zonal autoshift** (Amazon ARC) can move load-balancer traffic out of an impaired AZ automatically — AWS says to pre-scale rather than rely on Auto Scaling.' },
      { id: 'rds', name: 'RDS Multi-AZ · read replicas', short: 'RDS', cls: 'ink', width: 4, dash: '2 7', alias: ['RDS', 'Multi-AZ', 'Multi-AZ DB instance', 'Multi-AZ DB cluster', 'read replica', 'standby', 'automated backups', 'point-in-time recovery', 'snapshot'],
        verb: 'keeps a standby and copies for reading',
        from: 'primary ⇒ synchronous standby in another AZ (Multi-AZ) · primary → asynchronous read replicas (same or other Region) · automated backups + PITR',
        built: 'Three different copies. A **Multi-AZ DB instance** keeps a **synchronous standby** in another AZ that **serves no reads**; on failure RDS flips the endpoint’s **DNS CNAME** to it (typically **60–120 s**) — same endpoint name, no application change. A **Multi-AZ DB cluster** (MySQL, PostgreSQL) has one writer and **two readable standbys** in three AZs and fails over typically in **under 35 s**. **Read replicas** are **asynchronous**, readable, possibly **cross-Region**, and are **promoted manually** — a scaling tool that doubles as DR. **Automated backups** (retention 0–35 days) give **point-in-time recovery** to within about the last 5 minutes.',
        says: ['synchronous standby', 'automatic failover', 'Multi-AZ', 'offload read traffic', 'reporting queries slow down the primary', 'promote the replica', 'restore to a point in time', 'cross-Region read replica'],
        switch: [{ to: 'aurora', when: 'the engine can be Aurora and cross-Region RPO must be about a second' }, { to: 'backup', when: 'backups of several services must be managed, copied and locked in one place' }],
        misses: 'Baseline **Q61** (exam, 2 Sept, tag F): the Multi-AZ failover mechanism. The endpoint name stays; RDS updates its **DNS CNAME** to point at the standby, which becomes the primary. Nothing moves an IP address, and the standby is not a read replica.',
        traps: ['Reading from a Multi-AZ (instance) standby: it serves no traffic.', 'Read replicas for automatic failover: they are promoted manually (and asynchronous).', 'Expecting the IP address to move during Multi-AZ failover: the CNAME changes.', 'Replicas to protect against a bad UPDATE: they copy it — restore to a point in time.'],
        update: 'Read replicas per source: **15** for MySQL, MariaDB and PostgreSQL (older material: 5); Oracle and SQL Server 5, Db2 3. **Multi-AZ DB clusters** (two readable standbys, failover typically under 35 s) are newer than most banks. **Cross-Region automated backup replication** keeps PITR in a second Region.' },
      { id: 'aurora', name: 'Aurora replicas · Global Database', short: 'Aurora', cls: 'ink', width: 4, dash: '10 6', alias: ['Aurora', 'Aurora Replica', 'Aurora Global Database', 'global database', 'switchover', 'failover tier', 'Backtrack', 'Aurora DSQL', 'write forwarding'],
        verb: 'replicates storage within and across Regions',
        from: 'cluster volume (6 copies, 3 AZs) → up to 15 Aurora Replicas · Global Database: primary Region → up to 10 secondary Regions (storage-level, typically < 1 s)',
        built: 'Aurora’s storage keeps **six copies across three AZs** and survives losing two copies for writes and three for reads. Up to **15 Aurora Replicas** share that volume; failover promotes one (priority **tiers 0–15**) and service is typically back in **under 60 s, often under 30 s**. **Aurora Global Database** replicates at the storage layer to up to **10 secondary Regions**, typically with **under a second** of lag; a secondary is promoted in about a minute. **Switchover** = planned, no data loss; **failover** = unplanned, loses what had not yet replicated. **Backtrack** (Aurora MySQL) rewinds the same cluster in place.',
        says: ['RPO of 1 second', 'RTO of 1 minute', 'cross-Region disaster recovery for a relational database', 'low-latency global reads', 'up to 15 read replicas', 'rewind the database', 'planned Region rotation'],
        switch: [{ to: 'rds', when: 'the engine must stay RDS (Oracle, SQL Server …) or seconds of RPO are not needed' }, { to: 'ddb', when: 'the data is key-value and every Region must accept writes' }],
        misses: 'The relational half of the prestige-right pattern: **Aurora Global Database is the answer** when a relational database needs **cross-Region** RPO of about a second and RTO of about a minute. For an AZ failure a regular Aurora Replica is enough; for a 24-hour RTO it is overkill.',
        traps: ['Global Database to survive an AZ failure (an Aurora Replica in another AZ does it).', 'Switchover during a Region outage: it needs a healthy primary — use failover.', 'Backtrack with Global Database or on Aurora PostgreSQL (not supported).', 'Expecting Global Database secondaries to accept writes directly (they are read-only; write forwarding sends writes to the primary).'],
        update: 'Global Database now supports up to **10 secondary Regions** (May 2025; older material and the DR whitepaper say 5). “Managed planned failover” is now called **switchover**; the managed unplanned **failover** (Aug 2023) replaced manual detach-and-promote. **Aurora DSQL** (GA May 2025) is a serverless, PostgreSQL-compatible database with active-active multi-Region strong consistency.' },
      { id: 'ddb', name: 'DynamoDB global tables · PITR', short: 'DynamoDB', cls: 'ink', width: 4, dash: '1 9', alias: ['DynamoDB', 'global tables', 'multi-active', 'MREC', 'MRSC', 'multi-Region strong consistency', 'point-in-time recovery', 'on-demand backup'],
        verb: 'writes in every Region',
        from: 'table in Region A ⇄ replica tables in Regions B, C (every replica accepts writes) · PITR per second, 1–35 days',
        built: '**Global tables** make a DynamoDB table **multi-active**: every replica accepts reads and writes. Default mode (**MREC**) replicates asynchronously, **typically within a second**, last writer wins. **Multi-Region strong consistency (MRSC)** gives **RPO zero** in exactly three Regions (three replicas, or two plus a witness). **Point-in-time recovery** restores a table to any second of a 1–35-day window, into a **new table**. On-demand backups keep full copies until deleted.',
        says: ['active-active across Regions', 'users write in the nearest Region', 'multi-Region key-value', 'serverless', 'RPO of zero', 'restore the table to the state before the bad job'],
        switch: [{ to: 'aurora', when: 'the data is relational (joins, SQL) — Aurora Global Database or DSQL' }, { to: 'backup', when: 'backups must be copied to another account or locked' }],
        misses: 'The key-value half of the prestige-right pattern: global tables are **right** for multi-Region **active/active writes**. They do **not** protect against a bad write — every replica applies it within a second; **PITR** does.',
        traps: ['Global tables to recover from a bad batch job (the bad writes replicate).', 'Expecting PITR to restore into the same table (it creates a new one).', 'Aurora Global Database for a multi-Region key-value workload that needs writes everywhere.'],
        update: '**MRSC** (GA June 2025): strong consistency and **RPO zero** across exactly three Regions (or two + a witness). PITR recovery period is now **configurable from 1 to 35 days** (Jan 2025; older material: always 35).' },
      { id: 's3rep', name: 'S3 replication · Multi-Region Access Points', short: 'S3 repl.', cls: 'ink', width: 4, dash: '24 8', alias: ['CRR', 'SRR', 'Cross-Region Replication', 'Same-Region Replication', 'Replication Time Control', 'RTC', 'Batch Replication', 'Multi-Region Access Point', 'versioning'],
        verb: 'copies objects to another bucket',
        from: 'source bucket (versioning on) → replication rule → destination bucket in another Region (CRR) or the same Region (SRR) · RTC · Batch Replication for existing objects',
        built: 'Asynchronous copies of **new objects** to another bucket — **Cross-Region Replication (CRR)** for DR, latency or compliance, **Same-Region Replication (SRR)** for log aggregation or a copy in another account. **Versioning** is required on both buckets. **Existing** objects need **S3 Batch Replication**. **Replication Time Control (RTC)** replicates 99.99% of objects within 15 minutes, backed by an SLA of 99.9%. Delete markers are not replicated by default and deleting a specific version is never replicated. **Multi-Region Access Points** give one endpoint over buckets in several Regions, with **failover controls** for active-passive routing.',
        says: ['copy objects to another Region', 'replicate within 15 minutes', 'compliance requires a copy in a second Region', 'existing objects must also be replicated', 'single global endpoint for buckets in several Regions', 'replicate to another account'],
        switch: [{ to: 'backup', when: 'the need is point-in-time copies that a bad write or deletion cannot reach' }],
        traps: ['CRR without versioning (not possible).', 'Expecting existing objects to replicate when the rule is created (Batch Replication).', 'CRR as a backup against overwrites: the new version replicates too — keep versions, or use AWS Backup / Object Lock.', 'CRR for EBS snapshots (copy the snapshot, or use DLM / AWS Backup).'],
        update: 'The RTC **SLA is 99.9%** of objects within 15 minutes per billing month; 99.99% is the design target (banks often quote 99.99% as the SLA).' },
      { id: 'backup', name: 'AWS Backup · snapshots · DLM', short: 'Backup', cls: 'ink', width: 4, dash: '6 4', alias: ['AWS Backup', 'backup plan', 'backup vault', 'Vault Lock', 'logically air-gapped vault', 'restore testing', 'DLM', 'Data Lifecycle Manager', 'EBS snapshot', 'Recycle Bin', 'EFS replication'],
        verb: 'keeps copies you can go back to',
        from: 'resources (by tag) → backup plan (schedule, retention, lifecycle) → vault (Vault Lock) → copy to another Region / account · restore testing',
        built: 'The **central backup service** for EC2/EBS, RDS and Aurora, DynamoDB, EFS, FSx, S3, DocumentDB, Neptune, Redshift, EKS, VMware, Storage Gateway and more. **Backup plans** select resources by tag, set schedule and retention, and **copy to another Region or account**. **Vault Lock** in **compliance mode** makes recovery points undeletable by anyone once its grace time (at least 72 h) ends; a **logically air-gapped vault** is locked by default and shareable to a recovery account. **Restore testing** restores on a schedule to prove backups work. **Continuous backup** (S3, RDS, Aurora) gives point-in-time restore for up to 35 days. For EBS alone, **Data Lifecycle Manager** automates snapshots and AMIs.',
        says: ['centrally manage backups across services', 'copy backups to another Region and account', 'immutable backups', 'even the root user cannot delete', 'ransomware', 'prove backups can be restored', 'RTO of 24 hours', 'most cost-effective DR'],
        switch: [{ to: 'drs', when: 'whole servers need an RPO of seconds and an RTO of minutes' }, { to: 's3rep', when: 'objects must be copied continuously, within minutes, for live use in another Region' }],
        misses: 'Baseline **Q29** (exam, tag C): **DLM vs AWS Backup**. DLM = EBS snapshots and AMIs only, the simplest tool for that. The moment the question says **several services, another account, compliance or one place**, it is AWS Backup.',
        traps: ['DLM for RDS or DynamoDB backups (EBS only).', 'Vault Lock governance mode against a rogue admin (privileged users can still remove it; compliance mode cannot be removed after the grace time).', 'Backups in the same Region and account as the only DR copy.', 'Replication instead of backups against corruption or ransomware.'],
        update: 'A **logically air-gapped vault** can now be the primary backup target (Nov 2025; before, it held copies only). **Restore testing** GA Nov 2023. **Recycle Bin** now also protects deleted **EBS volumes** (besides snapshots and AMIs). Don’t confuse **Backup Audit Manager** (a feature of AWS Backup) with **AWS Audit Manager** (closed to new customers).' },
      { id: 'drs', name: 'Elastic Disaster Recovery', short: 'DRS', cls: 'mgn', dash: '10 8', alias: ['DRS', 'Elastic Disaster Recovery', 'AWS Elastic Disaster Recovery', 'CloudEndure Disaster Recovery', 'staging area', 'recovery instance', 'failback'],
        verb: 'replicates servers, fails over and back',
        from: 'on-prem, other-cloud or AWS servers ⇄ continuous block-level replication → staging area (low-cost) → recovery instances on failover → failback',
        built: '**Pilot light for whole servers.** An agent replicates every disk **continuously at block level** into a low-cost **staging area** in the recovery Region; nothing full-size runs until you **launch recovery instances** (drills or a real disaster). **RPO of seconds**, **RTO typically 5–20 minutes**; point-in-time snapshots let you recover to before ransomware struck; **failback** returns to the source after repair. Source can be physical, virtual or cloud servers, or EC2 in another Region. Priced per replicating source server per hour.',
        says: ['disaster recovery for on-premises servers', 'RPO of seconds', 'RTO of minutes', 'fail back to the data center', 'block-level replication', 'minimal compute cost until a disaster', 'recover EC2 instances into another Region'],
        switch: [{ to: 'backup', when: 'hours of RPO and RTO are acceptable (cheaper)' }],
        traps: ['MGN for DR, or DRS for a one-time migration.', 'DRS when a 24-hour RTO allows backup and restore.', 'Running full-size standby EC2 instances all the time for a pilot-light server DR (the staging area is the cheap part).'],
        update: 'DRS is the next generation of **CloudEndure Disaster Recovery** (older questions may still say CloudEndure). Docs now state RTO as **typically 5–20 minutes** and RPO as seconds (typically sub-second).' }
    ],
    topics: { tiers: 'DR strategies · RTO and RPO', nbr: 'Neighbours: ElastiCache · EFS · CloudFront · FIS' },
    map: {
      title: 'The two-Region map', lead: 'Outside AWS at the top, the global front doors below it, then the primary Region with two Availability Zones and the DR Region. Tap a line or a station.',
      viewBox: '0 0 1000 900', defaultLine: 'r53',
      caption: 'Two lines keep the hues they already have on other pages: Global Accelerator (indigo) and Elastic Disaster Recovery (the MGN red, dashed). Every other family is an ink line told apart by dash and station shape — Route 53 long dashes with circles, Multi-AZ compute solid with squares, RDS short dashes with triangles, Aurora dashes with hexagons, DynamoDB dots with diamonds, S3 replication long dashes with rings, AWS Backup tight dashes with pentagons. Every line is labelled; colour is never the only cue.',
      items: [
        { el: 'rect', a: { x: 0, y: 0, width: 1000, height: 96 }, style: 'fill:var(--muted-fill)' },
        { el: 'rect', a: { x: 0, y: 104, width: 1000, height: 796 }, style: 'fill:var(--zone-aws)' },
        zoneLabel(18, 22, 'OUTSIDE AWS'),
        zoneLabel(18, 124, 'AWS · GLOBAL FRONT DOORS'),
        ...box(20, 224, 470, 660, 'PRIMARY REGION'),
        ...box(510, 224, 470, 660, 'DR REGION', true),
        ...box(36, 256, 206, 360, 'AZ a'),
        ...box(270, 256, 206, 360, 'AZ b', true),

        /* ---- lines ---- */
        { el: 'line', line: 'backup', paths: ['M380 790 V750 H880 V790'], labels: [{ x: 540, y: 742, t: 'AWS BACKUP · COPY', size: 10.5 }] },
        { el: 'line', line: 's3rep', paths: ['M130 790 V850 H660 V790'], labels: [{ x: 300, y: 842, t: 'S3 REPLICATION (CRR)', size: 10.5 }] },
        { el: 'line', line: 'ddb', paths: ['M256 680 H760'], labels: [{ x: 520, y: 672, t: 'GLOBAL TABLES', size: 10.5 }] },
        { el: 'line', line: 'aurora', paths: ['M130 560 H380', 'M380 560 H660'], labels: [{ x: 500, y: 552, t: 'GLOBAL DATABASE', size: 10.5 }] },
        { el: 'line', line: 'rds', paths: ['M130 460 H380', 'M380 470 V500 H660 V460'], labels: [{ x: 160, y: 452, t: 'MULTI-AZ (SYNC)', size: 10.5 }, { x: 500, y: 492, t: 'READ REPLICA', size: 10.5 }] },
        { el: 'line', line: 'asg', paths: ['M256 300 V360', 'M130 360 H380', 'M760 300 V360'], labels: [{ x: 150, y: 352, t: 'ASG ACROSS AZs', size: 10.5 }] },
        { el: 'line', line: 'drs', paths: ['M880 50 V560'], labels: [{ x: 892, y: 120, t: 'DRS', size: 10.5 }] },
        { el: 'line', line: 'ga', paths: ['M400 50 V100 H570 V236 H270 V290', 'M570 236 H775 V290'], labels: [{ x: 582, y: 218, t: 'GLOBAL ACCELERATOR', size: 10.5 }] },
        { el: 'line', line: 'r53', paths: ['M400 50 V100 H242 V290', 'M242 206 H745 V290'], labels: [{ x: 254, y: 198, t: 'ROUTE 53 FAILOVER', size: 10.5 }] },

        /* ---- stations ---- */
        /* outside */
        big(400, 50, ['r53', 'ga'], true), T(416, 54, 'Users', ['r53', 'ga']), sub(416, 70, 'resolve the name, then connect', ['r53', 'ga']),
        big(880, 50, ['drs'], true), T(864, 54, 'On-prem servers', ['drs'], 'end'), sub(864, 70, 'DRS agent · block-level replication', ['drs'], 'end'),
        /* global */
        circle(242, 150, ['r53'], true), T(226, 146, 'Route 53', ['r53'], 'end'), sub(226, 162, 'failover record', ['r53'], 'end'), sub(226, 177, 'health checks · ARC', ['r53'], 'end'),
        big(570, 150, ['ga'], true), T(588, 146, 'Global Accelerator', ['ga']), sub(588, 162, '2 static anycast IPs · traffic dials', ['ga']),
        /* primary */
        { el: 'rect', lines: ['r53', 'ga', 'asg'], a: { x: 228, y: 280, width: 56, height: 22, rx: 11 }, style: INK }, sub(256, 322, 'ALB', ['r53', 'ga', 'asg'], 'middle'),
        square(130, 360, ['asg'], true), square(380, 360, ['asg'], true), sub(130, 386, 'instances', ['asg'], 'middle'), sub(380, 386, 'instances', ['asg'], 'middle'),
        triangle(130, 460, ['rds'], true), sub(130, 485, 'RDS primary', ['rds'], 'middle'),
        triangle(380, 460, ['rds'], true), sub(392, 445, 'standby', ['rds']),
        hexa(130, 560, ['aurora'], true), sub(130, 584, 'Aurora writer', ['aurora'], 'middle'),
        hexa(380, 560, ['aurora'], true), sub(380, 584, 'Aurora Replica', ['aurora'], 'middle'),
        diamond(256, 680, ['ddb'], true), sub(256, 704, 'DynamoDB table · PITR', ['ddb'], 'middle'),
        ...ring(130, 790, ['s3rep']), sub(130, 814, 'S3 · versioning', ['s3rep'], 'middle'),
        penta(380, 790, ['backup'], true), sub(380, 814, 'backup vault', ['backup'], 'middle'), sub(380, 829, 'Vault Lock', ['backup'], 'middle'),
        /* DR */
        { el: 'rect', lines: ['r53', 'ga', 'asg'], a: { x: 732, y: 280, width: 56, height: 22, rx: 11 }, style: INK }, sub(760, 322, 'ALB (DR)', ['r53', 'ga', 'asg'], 'middle'),
        square(760, 360, ['asg'], true), sub(760, 386, 'ASG, scaled down or off', ['asg'], 'middle'),
        triangle(660, 460, ['rds'], true), sub(660, 440, 'cross-Region replica', ['rds'], 'middle'),
        hexa(660, 560, ['aurora'], true), sub(660, 584, 'secondary cluster', ['aurora'], 'middle'),
        diamond(760, 680, ['ddb'], true), sub(760, 704, 'replica table', ['ddb'], 'middle'),
        ...ring(660, 790, ['s3rep']), sub(660, 814, 'replica bucket', ['s3rep'], 'middle'),
        penta(880, 790, ['backup'], true), sub(880, 814, 'vault copy', ['backup'], 'middle'), sub(880, 829, 'other Region / account', ['backup'], 'middle'),
        circle(880, 460, ['drs'], true), sub(866, 464, 'staging area', ['drs'], 'end'),
        big(880, 560, ['drs'], true), sub(866, 564, 'recovery instances', ['drs'], 'end'), sub(866, 579, 'launched on failover', ['drs'], 'end'),
        ...LABELS
      ]
    },

    stub: [
      { id: 'fail', label: 'FAILURE', short: 'FAIL', values: ['instance', 'AZ', 'Region', 'bad data', 'on-prem site'] },
      { id: 'rto', label: 'RTO', short: 'RTO', values: ['hours', 'tens of min', 'minutes', 'near zero'] },
      { id: 'rpo', label: 'RPO', short: 'RPO', values: ['hours', 'minutes', 'seconds', 'zero'] },
      { id: 'sup', label: 'SUPERLATIVE', short: 'SUP', values: ['cheapest', 'least ops', 'fastest', 'none stated'] }
    ],

    method:
`1. Strip the story. Keep WHAT can fail (one instance, an AZ, a Region, the data
   itself, the data center) and HOW MUCH loss is allowed (downtime, data).
2. Fill the stub, the same 4 slots for this session:
   FAILURE (instance / AZ / Region / bad data / on-prem site) ____
   RTO (hours / tens of min / minutes / near zero) ____
   RPO (hours / minutes / seconds / zero) ____
   SUPERLATIVE (cheapest / least ops / fastest / none) ____
3. For EACH option ask: "what problem was this service BUILT for?"
   No match with the stub -> cross it out, however resilient it sounds
   (a second Region for an AZ failure, Global Accelerator without static IPs or
   DNS limits, multi-site for a 24-hour RTO, replication against bad data).
4. Among the survivors, the one that satisfies the SUPERLATIVE wins
   (usually: the CHEAPEST strategy that still meets RTO and RPO).`,

    cheat:
`RESILIENCE = FAILURE + RTO (max downtime) + RPO (max data lost) + SUP
HA vs DR    AZ fails -> Multi-AZ in one Region (automatic, cheap)
            Region fails -> DR strategy in a 2nd Region · bad data -> backup / PITR
TIERS       backup & restore  RPO hours     RTO <= 24 h      $     nothing runs in DR
            pilot light       RPO minutes   RTO tens of min  $$    data live, compute OFF
            warm standby      RPO seconds   RTO minutes      $$$   small copy SERVES now
            multi-site        RPO ~0        RTO ~0           $$$$  all Regions serve
            -> pick the CHEAPEST tier that meets BOTH targets
COMPUTE     ASG across AZs + ELB health checks · static stability = pre-provision
            3 AZs: +50% spare survives 1 AZ (2 AZs: +100%) · EC2 auto recovery keeps ID/IP/EBS
RDS         Multi-AZ instance: SYNC standby, no reads, CNAME flips, 60-120 s
            Multi-AZ cluster: 1 writer + 2 READABLE standbys, < 35 s (MySQL, PostgreSQL)
            read replica: ASYNC, readable, cross-Region, promote MANUALLY · 15 (MySQL/MariaDB/PG)
            backups 0-35 d, PITR ~last 5 min · snapshot copy x-Region/x-account
AURORA      6 copies / 3 AZs · 15 replicas, tiers 0-15, failover < 60 s (often < 30)
            Global Database: <= 10 secondary Regions, lag < 1 s, promote ~1 min
            switchover = planned, no loss · failover = unplanned · Backtrack = MySQL rewind
DYNAMODB    global tables = multi-active, ~1 s (MREC) · MRSC = RPO 0, exactly 3 Regions
            PITR 1-35 days -> NEW table · replicas copy bad writes
S3          CRR/SRR need versioning · new objects only (Batch Replication for existing)
            RTC 15 min (SLA 99.9%) · MRAP failover controls · EFS replication RPO 15 min
BACKUP      AWS Backup = many services, plans by tag, x-Region + x-account copies
            Vault Lock COMPLIANCE = nobody deletes · air-gapped vault · restore testing
            DLM = EBS snapshots/AMIs only
DRS         servers, block-level, RPO seconds, RTO 5-20 min, staging area, failback
FAILOVER    Route 53 failover record + health check (30 s / 10 s x 3) + TTL
            private target -> CloudWatch-alarm health check · alias: evaluate target health
            static IPs / no DNS cache -> Global Accelerator · ARC routing control / zonal shift
NEVER: 2nd Region for an AZ failure · GA without static IP / DNS need · multi-site for
       24 h RTO · replicas against bad data · read replica for auto failover · DLM for RDS`,

    compare: [
      { id: 'ha-dr', short: 'HA · DR', title: 'High availability vs disaster recovery — AZ or Region?',
        sides: [{ name: 'High availability (Multi-AZ)', line: 'asg', fig: { dir: 'both', left: 'AZ a', right: 'AZ b' }, gist: 'Survive an **instance or an AZ** inside one Region, **automatically**, with no data loss: load balancer + Auto Scaling across AZs, Multi-AZ databases.' }, { name: 'Disaster recovery (multi-Region)', line: 'r53', fig: { dir: 'one', left: 'REGION 1', right: 'REGION 2', keep: true }, gist: 'Survive losing a **whole Region** (or the data itself): a copy elsewhere and a way to switch to it, sized by **RTO and RPO**.' }],
        rows: [['Failure covered', 'instance, AZ', 'Region, and (with backups) bad data'], ['Typical tools', 'ALB/NLB, Auto Scaling group, RDS Multi-AZ, Aurora Replicas, EFS Regional', 'backups copied cross-Region, replicas, Aurora Global Database, global tables, DRS, Route 53 failover'], ['Recovery', 'automatic, seconds to 2 minutes', 'minutes to hours depending on the strategy'], ['Cost', 'modest (spare capacity in the other AZs)', 'from a little (backups) to double (multi-site)'], ['Deciding words', 'highly available, survive an AZ failure, no single point of failure', 'disaster, Region outage, RTO, RPO, secondary Region'], ['Tempting wrong', 'for a Region outage', 'for an AZ failure (your prestige pick)']],
        check: { q: '“The web application must keep running if one Availability Zone fails. Cost must stay low.”', opts: ['High availability (Multi-AZ)', 'Disaster recovery (multi-Region)'], a: 0, why: 'An AZ failure is survived inside the Region: ALB + Auto Scaling group across AZs and a Multi-AZ database. A second Region answers a different failure and costs more.' } },
      { id: 'tiers', short: 'Pilot light · Warm · Multi-site', title: 'Pilot light vs warm standby vs multi-site active/active',
        sides: [{ name: 'Pilot light', line: null, fig: { dir: 'one', left: 'PROD', right: 'DATA', keep: true }, gist: 'Data replicated live; compute **defined but off**. It cannot serve a request until you start and scale it.' }, { name: 'Warm standby', line: null, fig: { dir: 'one', left: 'PROD', right: 'SMALL', keep: true }, gist: 'A **scaled-down, fully working** copy that **can take traffic now** at reduced capacity; scale up to recover.' }, { name: 'Multi-site active/active', line: null, fig: { dir: 'both', left: 'PROD', right: 'PROD' }, gist: 'Full production in two or more Regions, **all serving users**. Recovery = stop routing to the failed one.' }],
        rows: [['RPO (Well-Architected)', 'minutes', 'seconds', 'near zero'], ['RTO (Well-Architected)', 'tens of minutes', 'minutes', 'potentially zero'], ['Running in DR', 'databases / replication only', 'every tier, small', 'every tier, full'], ['Recovery action', 'deploy or start compute, scale, switch traffic', 'scale up, switch traffic', 'none or remove the Region'], ['Deciding words', 'core systems always on, tens of minutes, lower cost', 'minutes, must handle some traffic immediately', 'zero downtime, users in several Regions'], ['Tempting wrong', 'when minutes of RTO are required', 'when tens of minutes are fine (more than needed)', 'for any DR question (the most expensive)']],
        check: { q: '“The DR site must be able to handle requests immediately at reduced capacity while the primary Region recovers; an RTO of a few minutes is required.”', opts: ['Pilot light', 'Warm standby', 'Multi-site active/active'], a: 1, why: 'Serving immediately at reduced capacity is the definition of warm standby. Pilot light cannot process requests without starting compute first; multi-site runs full capacity everywhere.' } },
      { id: 'maz-rr', short: 'Multi-AZ · cluster · replica', title: 'RDS Multi-AZ DB instance vs Multi-AZ DB cluster vs read replica',
        sides: [{ name: 'Multi-AZ DB instance', line: 'rds', fig: { dir: 'one', left: 'PRIMARY', right: 'STANDBY', keep: true }, gist: '**Synchronous** standby in another AZ that serves **no reads**. Automatic failover by **DNS CNAME** flip, typically 60–120 s.' }, { name: 'Multi-AZ DB cluster', line: 'rds', fig: { dir: 'one', left: 'WRITER', right: '2 READERS', keep: true }, gist: 'One writer, **two readable standbys** in three AZs. Failover typically **under 35 s**. MySQL and PostgreSQL.' }, { name: 'Read replica', line: 'rds', fig: { dir: 'one', left: 'PRIMARY', right: 'REPLICA' }, gist: '**Asynchronous**, readable copy, same or **another Region**. For read scaling; **promoted manually** for DR.' }],
        rows: [['Replication', 'synchronous', 'semisynchronous', 'asynchronous'], ['Serves reads', 'no', 'yes', 'yes'], ['Failover', 'automatic, 60–120 s', 'automatic, typically < 35 s', 'manual promotion'], ['Cross-Region', 'no', 'no', 'yes (not SQL Server)'], ['Deciding words', 'high availability, automatic failover, no app change', 'faster failover and read capacity', 'offload reads, reporting, cross-Region DR copy'], ['Tempting wrong', 'to scale reads', '—', 'for automatic HA failover']],
        check: { q: '“Reporting queries slow down the production MySQL database. The database must also fail over automatically if its AZ fails.” (two features)', opts: ['Multi-AZ + read replica', 'Two read replicas', 'Multi-AZ only'], a: 0, why: 'Two needs, two features: a read replica takes the reporting load; Multi-AZ gives automatic failover. (A Multi-AZ DB cluster would give both in one, with readable standbys.)' } },
      { id: 'agd-rr', short: 'Aurora Global · x-Region replica', title: 'Aurora Global Database vs RDS cross-Region read replica',
        sides: [{ name: 'Aurora Global Database', line: 'aurora', fig: { dir: 'one', left: 'PRIMARY', right: '≤10 RGNS', keep: true }, gist: '**Storage-level** replication to up to 10 secondary Regions, typically **under a second** of lag; managed **switchover** and **failover**.' }, { name: 'Cross-Region read replica', line: 'rds', fig: { dir: 'one', left: 'PRIMARY', right: 'REPLICA' }, gist: 'Engine-level asynchronous replica of an RDS database in another Region; **promote it manually** into a standalone database.' }],
        rows: [['Engines', 'Aurora MySQL, Aurora PostgreSQL', 'RDS MySQL, MariaDB, PostgreSQL, Oracle (not SQL Server)'], ['Lag / RPO', 'typically < 1 s', 'seconds to minutes, depends on load'], ['Recovery', 'managed failover (about a minute) or planned switchover', 'promote, then repoint the app'], ['Cost', 'Aurora pricing in every Region', 'one extra instance'], ['Deciding words', 'RPO of about 1 second, RTO of about 1 minute, global reads', 'stay on RDS, cheaper, minutes are fine'], ['Tempting wrong', 'when the engine is Oracle or the budget is small', 'when RPO must be about a second']],
        check: { q: '“A relational database needs a cross-Region DR copy with an RPO of about 1 second and an RTO of about 1 minute; low-latency reads in the second Region are a bonus.”', opts: ['Aurora Global Database', 'Cross-Region read replica'], a: 0, why: 'Second-level RPO and managed one-minute failover across Regions is Aurora Global Database’s built-for job.' } },
      { id: 'gt-agd', short: 'Global tables · Aurora Global', title: 'DynamoDB global tables vs Aurora Global Database',
        sides: [{ name: 'DynamoDB global tables', line: 'ddb', fig: { dir: 'both', left: 'REGION A', right: 'REGION B' }, gist: '**Multi-active**: every Region reads and writes. Key-value, serverless. Last writer wins (MREC) or strong consistency (MRSC).' }, { name: 'Aurora Global Database', line: 'aurora', fig: { dir: 'one', left: 'WRITER', right: 'READERS', keep: true }, gist: '**One writer Region**, read-only secondaries (write forwarding sends writes to the primary). Relational, SQL.' }],
        rows: [['Writes', 'in every Region', 'in the primary Region only'], ['Data model', 'key-value / document', 'relational (MySQL, PostgreSQL)'], ['Replication', 'typically < 1 s (MREC); RPO 0 with MRSC', 'typically < 1 s'], ['Recovery', 'none needed: send users to another Region', 'fail over the global cluster (about a minute)'], ['Deciding words', 'active-active, write locally, serverless, millions of users', 'relational, joins, SQL, single writer'], ['Tempting wrong', 'for a relational schema', 'for writes in every Region']],
        check: { q: '“A gaming leaderboard (key-value) must accept writes from players in three Regions with single-digit-millisecond latency and survive a Region outage with no failover step.”', opts: ['DynamoDB global tables', 'Aurora Global Database'], a: 0, why: 'Writes everywhere, key-value, no failover action: global tables. Aurora Global has one writer Region.' } },
      { id: 'rep-bak', short: 'Replication · Backup', title: 'Replication vs backup — the corruption rule',
        sides: [{ name: 'Replication', line: 's3rep', fig: { dir: 'one', left: 'SOURCE', right: 'REPLICA' }, gist: 'A **live copy** kept current within seconds or minutes (CRR, read replicas, global tables, Global Database). Great for a lost Region; it **copies mistakes too**.' }, { name: 'Backup', line: 'backup', fig: { dir: 'one', left: 'SOURCE', right: 'VAULT', keep: true }, gist: '**Point-in-time copies** you go back to (snapshots, PITR, AWS Backup). Slower to restore; the only answer to **bad data** and ransomware.' }],
        rows: [['Protects against', 'AZ or Region loss', 'deletion, corruption, ransomware, and (if copied away) Region loss'], ['RPO', 'seconds to minutes', 'time since the last recovery point (PITR: ~5 min)'], ['RTO', 'minutes (promote / switch)', 'hours (restore)'], ['A bad write', 'is replicated', 'stays out of older recovery points'], ['Deciding words', 'Region outage, low RPO, live copy', 'accidental deletion, corruption, ransomware, retention, compliance'], ['Tempting wrong', 'for “restore the data as it was yesterday”', 'for an RPO of seconds']],
        check: { q: '“A faulty release overwrote customer records in an S3 bucket and a DynamoDB table 2 hours ago. Both are replicated to another Region.” What recovers the data?', opts: ['Replication', 'Backup'], a: 1, why: 'The replicas received the overwrites within seconds. Only a copy from before — S3 object versions, DynamoDB PITR, AWS Backup recovery points — has the old data.' } },
      { id: 'drs-bak-mgn', short: 'DRS · Backup · MGN', title: 'Elastic Disaster Recovery vs AWS Backup vs Application Migration Service',
        sides: [{ name: 'Elastic Disaster Recovery', line: 'drs', fig: { dir: 'both', left: 'SOURCE', right: 'AWS' }, gist: 'Continuous block-level replication of **servers**; launch recovery instances in minutes; **fail back**.' }, { name: 'AWS Backup', line: 'backup', fig: { dir: 'one', left: 'RES', right: 'VAULT', keep: true }, gist: 'Scheduled **recovery points** of AWS resources (and VMware, Storage Gateway); restore in hours.' }, { name: 'MGN', line: null, fig: { dir: 'one', left: 'ON-PREM', right: 'EC2' }, gist: 'The same replication engine, **one way**, ending in a **cutover**: migration (Session 2).' }],
        rows: [['Purpose', 'DR for servers', 'backup and retention for AWS resources', 'rehost migration'], ['RPO / RTO', 'seconds / typically 5–20 min', 'hours / hours', '—'], ['Ends', 'never (fails over and back)', 'never (keeps recovery points)', 'at cutover'], ['Deciding words', 'on-prem DR, RPO seconds, RTO minutes, failback', 'central backup, retention, immutable, cross-account copies', 'migrate, lift and shift, cutover'], ['Tempting wrong', 'for a one-time move', 'for an RTO of minutes', 'for DR']],
        check: { q: '“300 on-premises VMware servers need DR in AWS with an RPO of seconds and an RTO under 30 minutes, paying little until a disaster, and must return to the data center afterwards.”', opts: ['Elastic Disaster Recovery', 'AWS Backup', 'MGN'], a: 0, why: 'Seconds of RPO, minutes of RTO, cheap staging, failback: DRS. Backups restore in hours; MGN is one-way migration.' } },
      { id: 'r53-ga-arc', short: 'Route 53 · GA · ARC', title: 'Route 53 failover vs Global Accelerator vs Amazon ARC',
        sides: [{ name: 'Route 53 failover record', line: 'r53', fig: { dir: 'one', left: 'DNS', right: 'HEALTHY' }, gist: 'Health checks decide which **DNS answer** users get. Cheap and simple; clients keep old answers until the **TTL** expires.' }, { name: 'Global Accelerator', line: 'ga', fig: { dir: 'one', left: '2 IPs', right: 'REGION', keep: true }, gist: '**Static anycast IPs**; health checks move traffic **at the edge**, no DNS cache involved. Paid per accelerator-hour and traffic.' }, { name: 'Amazon ARC', line: 'r53', fig: { dir: 'one', left: 'SWITCH', right: 'TRAFFIC' }, gist: '**Routing controls** (manual on/off switches through a data-plane API), **zonal shift / autoshift**, **Region switch** plans.' }],
        rows: [['Decides by', 'health checks (or a CloudWatch alarm)', 'health checks, traffic dials', 'an operator, AWS telemetry (autoshift) or a plan'], ['Wait after the decision', 'TTL of cached answers', 'none', 'TTL (routing controls work through Route 53 health checks)'], ['Fixed IPs', 'no', '**yes**', 'no'], ['Deciding words', 'active-passive DNS failover, maintenance page, cheapest', 'static IPs, IP allow lists, no DNS caching, UDP', 'controlled manual failover, shift away from an AZ, orchestrate a Region switch'], ['Tempting wrong', 'when clients need fixed IPs', 'for an AZ failure or plain DNS failover (prestige)', 'for automatic failover of one record']],
        check: { q: '“Customers allow-list the application’s IP addresses in their firewalls. The application runs in two Regions and must fail over between them without waiting for DNS changes.”', opts: ['Route 53 failover record', 'Global Accelerator', 'Amazon ARC'], a: 1, why: 'Fixed IPs + no DNS wait: Global Accelerator’s two static anycast IPs and edge failover. Route 53 answers change the IP clients reach.' } }
    ],

    traps: [
      { title: 'A second Region for an AZ failure', x: 'Prestige distractor. An AZ failure is survived inside the Region: load balancer + Auto Scaling across AZs, Multi-AZ database. Global Database, Global Accelerator or a DR Region answer a bigger failure at a higher cost.', drills: ['H5', 'H9'] },
      { title: 'Global Accelerator without a static-IP or DNS reason', x: 'Your baseline prestige pick. Keep it only when the scenario says fixed IP addresses, IP allow lists, UDP, or failover that must not wait for DNS caching.', drills: ['H4', 'H5', 'H28'] },
      { title: 'Multi-site for a relaxed RTO', x: 'When the RTO is hours and the question asks for cost-effective, backup and restore wins. Pay for speed only when the RTO demands it.', drills: ['H3', 'H6'] },
      { title: 'Pilot light vs warm standby', x: 'Pilot light cannot process requests until compute is started; warm standby can serve immediately at reduced capacity. “Handle traffic immediately” = warm standby.', drills: ['H6', 'H7'] },
      { title: 'Replication against bad data', x: 'Every replica copies the delete or corruption within seconds. Recover from a point in time: PITR, S3 versions, AWS Backup.', drills: ['H18', 'H16'] },
      { title: 'Read replica for automatic failover', x: 'Read replicas are asynchronous and promoted manually. Automatic failover within a Region = Multi-AZ.', drills: ['H11', 'H1'] },
      { title: 'Reading from a Multi-AZ standby', x: 'A Multi-AZ DB instance’s standby serves no traffic. For readable standbys use a Multi-AZ DB cluster; for read scaling, read replicas.', drills: ['H12', 'H11'] },
      { title: 'The IP moves in a Multi-AZ failover', x: 'RDS flips the endpoint’s DNS CNAME to the standby. The application keeps the same endpoint name and reconnects.', drills: ['H1'] },
      { title: 'Switchover during an outage', x: 'Aurora Global Database switchover needs a healthy primary and loses no data — for planned moves. In a Region outage use failover (and accept the replication lag as data loss).', drills: ['H15'] },
      { title: 'DLM for anything but EBS', x: 'Data Lifecycle Manager automates EBS snapshots and EBS-backed AMIs. Several services, other accounts, locks, one place → AWS Backup.', drills: ['H2'] },
      { title: 'Governance mode against a rogue admin', x: 'Vault Lock governance mode can be removed by users with permission. Compliance mode cannot be removed by anyone after the grace time (at least 72 h).', drills: ['H23', 'H24'] },
      { title: 'Scaling out during the failure', x: 'Auto Scaling and restores are control-plane actions that may be slow or impaired during a large event. Statically stable designs pre-provision what they need in the surviving AZs or Region.', drills: ['H9'] },
      { title: 'DNS failover faster than the TTL', x: 'Detection (interval × threshold) plus the TTL that resolvers cache. For instant, IP-level failover use Global Accelerator.', drills: ['H4', 'H28'] },
      { title: 'Public health check on a private resource', x: 'Route 53 health checkers are on the internet. For a private endpoint, alarm on a CloudWatch metric and use a CloudWatch-alarm health check.', drills: ['H29'] },
      { title: 'MGN for DR, DRS for migration', x: 'Same engine, different jobs: MGN moves servers once and cuts over; DRS keeps replicating, fails over and fails back.', drills: ['H26', 'H27'] },
      { title: 'CRR expected to copy existing objects', x: 'A replication rule only covers new objects. Existing ones (and failed ones) need S3 Batch Replication. Versioning must be on in both buckets.', drills: ['H21', 'H20'] }
    ],

    log: [
      { when: '2 Sept 2026', what: 'Baseline practice exam, resilience items', result: 'Q61 Multi-AZ failover mechanism missed (F); Q29 DLM vs AWS Backup confused (C); Global Accelerator picked twice where it had no role', lesson: 'Q61: the endpoint’s DNS CNAME moves to the standby. Q29: DLM = EBS only; several services or accounts = AWS Backup. Global Accelerator: keep it only for static IPs or no-DNS failover. The pattern is trained in drills H1–H5.' },
      { when: '—', what: 'Session 7 quiz', result: 'not taken yet', lesson: 'Run all 30 scenarios once. Misses are tagged in “Where it broke” and show up in Progress.' }
    ]
  });
})();
