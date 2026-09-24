/* Session 1 — the lesson. 12 chapters (Learn tab) + the S3 classes page.
   Block types are rendered by engine.js (blocks()). Inline markup: **bold** `code`
   {lineId|Service} [[#tab|link]] ==highlight==. Facts: docs/CONTEXT.md §6. */
(function () {
  'use strict';
  const S = window.SESSION;
  /* a checkpoint built from a drill keeps the drill's wording and answers */
  const fromDrill = (id, src) => {
    const d = S.drills.find(x => x.id === id);
    return { id: 'ck-' + id, src: src || d.src, q: d.q, opts: d.opts.map(o => ({ t: o.t, why: o.why })), a: d.opts.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0), why: d.expl };
  };

  S.learn = [
    /* ---------------------------------------------------------------- 1 */
    { id: 'ch1', title: 'Start here: how to read a storage question', blocks: [
      'You don’t miss storage questions because you haven’t seen the services. You miss them because two look-alikes both sound right, and nothing in your process forces you to separate them. This chapter is that process.',
      { h: 'Why about 50% happens with your background' },
      'You run EC2, S3, ALB, ECS, IAM and VPC at work, and you finished a full SAA course. Exposure is not the gap. Practice-exam questions fall into three kinds, and you score very differently on each:',
      { table: { head: ['Kind of question', 'Share', 'How it goes', 'Why'], rows: [
        ['Core service: which EC2 option, which S3 feature', '~35–40%', 'mostly right', 'you use these every week'],
        ['Which **specialised** service: DataSync or Storage Gateway, Backup or DLM', '~30–35%', 'a coin flip', 'look-alikes, recalled by familiarity'],
        ['**Multi-constraint**: three or four requirements plus “cheapest” or “least ops”', '~25–30%', 'lost on one missed keyword', 'the constraint list never gets written down']] } },
      'Two mechanisms produce the ~50%:',
      { ol: [
        '**Recall by familiarity instead of by problem.** You read “on-premises files → AWS” and the first service that feels familiar wins. Distractors are written to feel familiar, so this reliably picks the tempting wrong answer.',
        '**No constraint list.** If the scenario is never turned into slots, “cheapest”, “least operational overhead” or “within a month” slides past. You pick an answer that works, but not the one that was asked for.'] },
      { h: 'Your record on this cluster' },
      'From the baseline practice exam on 2 Sept 2026. “Real cause” is the re-tag after re-reading each question, not the first self-tag (you tagged 17 of 29 as “fact”; about 9 were).',
      { table: { head: ['Question', 'Scenario in one line', 'What pulled you', 'Real cause'], rows: [
        ['Q8', 'historical records leave a nearly full on-prem system', 'Storage Gateway', '**C** mover vs bridge'],
        ['Q12', '80 TB, two months over the current link', 'a network option', '**C** skipped the pipe rule'],
        ['Q54', '250 TB on portable drives, 100 Mbps line', 'DataSync / Direct Connect', '**C** skipped the pipe rule'],
        ['Q41', 'tape backups kept for 10 years', 'an answer without Tape Gateway', '**K** missed the word “tape”'],
        ['Q56', 'MySQL → S3 as CSV, then ongoing changes', 'DataSync', '**C** files vs database rows'],
        ['Q29', 'automated EBS snapshots, simplest', 'not DLM', '**C** DLM vs AWS Backup'],
        ['Q4', 'servers worldwide download the same files', 'Transfer Acceleration', '**C** uploads vs downloads'],
        ['Q11', 'cross-account DynamoDB backup', 'not AWS Backup', '**F** native backups stop at the account'],
        ['Q33', 'which statement about EBS is true', 'a wrong EBS scope', '**F** EBS is AZ-scoped']] } },
      { h: 'The reduction method' },
      'Every drill in this site runs the same four steps. The stub (step 2) is the habit your retest proved works: when you wrote it, you got the question right.',
      { pre: S.method, label: 'The method' },
      'For this session the stub is always the same four slots:',
      { table: { head: ['Slot', 'Ask', 'Values'], rows: [
        ['SIZE / NET', 'Does it fit the pipe before the deadline?', '`fits the pipe` · `weeks+ online` · `not about transfer`'],
        ['TIME', 'Does it happen once, or keep happening?', '`one-off` · `ongoing`'],
        ['PROTOCOL / APP', 'What does the source speak, or what is it?', '`NFS/SMB` · `iSCSI/block` · `tape` · `SFTP/FTP/AS2` · `database` · `servers` · `objects/HTTP` · `AWS-internal`'],
        ['SUPERLATIVE', 'What is being optimised?', '`cheapest` · `least ops` · `fastest` · `most durable/compliant` · `none stated`']] } },
      { h: 'The prestige-distractor rule' },
      'In six of your baseline misses you chose an option that contained a service with no role in the scenario: Global Accelerator twice, Transit Gateway, Transfer Family, Network Firewall and ACM. Those options are written to sound senior.',
      'The rule: for **each** option ask “what problem was this service **built** for?” If the answer doesn’t match the stub, the option is out, before you weigh anything else it says.',
      'Example. Global Accelerator was built for TCP/UDP applications that need static anycast IPs and fast failover across Regions. If the stub says “single Region, download files”, any option containing Global Accelerator is crossed out on sight, however sensible the rest of the sentence reads.',
      { callout: 'Fixing only this habit and keyword reading would move the baseline from about 55% to about 72%. That is the single biggest lever you have.', kind: 'note', title: 'Why it matters' },
      { h: 'Try it on R1' },
      'The retest question you missed. Fill the four slots before looking at any option. The drill makes you do the same.',
      { widget: 'stubTrainer', args: { drill: 'D07', title: 'Stub trainer · Retest R1', why: {
        size: '120 TB at 1 Gbps is about 11 days on a free link; about 22 days at the ~50% left over in business hours. Inside a month.',
        time: '“within a month” + “never edited” = a fixed set that leaves once. Not a sync.',
        proto: 'an on-premises NAS exported over NFS.',
        sup: '“MOST cost-effective”.' } } },
      { check: { id: 'ch1-r1', src: 'Retest R1', q: 'Which slot did R1 hinge on?', opts: [{ t: 'SIZE / NET' }, { t: 'TIME' }, { t: 'PROTOCOL / APP' }, { t: 'SUPERLATIVE' }], a: 1,
        why: '“Within a month” + “never edited” = a fixed set leaving once: TIME is **one-off**. Reading it as ongoing pulled you toward the bridge (S3 File Gateway) instead of the mover.' } }
    ] },

    /* ---------------------------------------------------------------- 2 */
    { id: 'ch2', title: 'Two questions hide under “storage”', blocks: [
      'The word “storage” in a question hides one of two different questions. Decide which one before reading the options, because the two answer sets barely overlap.',
      { table: { head: ['', 'The question', 'The answers'], key: true, rows: [
        ['A', '**WHERE** does the data live in AWS?', 'block, file or object → EBS, EFS, FSx, S3 (and which S3 class)'],
        ['B', '**HOW** does it get there, or stay in sync?', '{datasync|DataSync}, {gateway|Storage Gateway}, {transfer|Transfer Family}, {truck|DTT / Snow}, {dms|DMS}, replication, backup']] } },
      'A-questions describe what an application needs: IOPS, a shared folder, a retention period, a retrieval time. B-questions describe motion or a boundary: migrate, copy, sync, upload, partners, or on-premises applications that must keep running. The verbs give it away.',
      'Most of your misses in this cluster were B-questions answered with an A-service, or with the wrong B-service:',
      { ul: [
        '**Q8**: a mover question answered with a bridge.',
        '**Q12, Q54**: a truck question answered with the network.',
        '**Q41**: a tape question answered without Tape Gateway.',
        '**Q56**: a database question answered with a file mover.'] },
      { callout: 'Decide A or B first. Then only half the services are candidates, and the distractors from the other half cross themselves out.', kind: 'note', title: 'Rule' },
      { widget: 'sorter', args: { title: 'Sorter · A or B?', lead: 'Sort all ten, then check. Wrong ones show why.',
        buckets: [{ id: 'A', short: 'A · where', label: 'WHERE it lives' }, { id: 'B', short: 'B · how', label: 'HOW it moves or syncs' }],
        items: [
          { t: '40 Linux servers need a shared folder', b: 'A', why: 'a place for shared files: EFS.' },
          { t: 'Copy a 120 TB NAS to S3 this month', b: 'B', why: 'motion, once: DataSync.' },
          { t: 'Database needs 60k IOPS', b: 'A', why: 'a disk with a performance need: EBS (gp3 now reaches 80k; io2 Block Express for the highest).' },
          { t: 'Suppliers send files via SFTP', b: 'B', why: 'a door for other parties: Transfer Family.' },
          { t: 'Keep logs 7 years cheaply', b: 'A', why: 'where, and how cheaply: an S3 class and a lifecycle rule.' },
          { t: 'Tape backups to the cloud', b: 'B', why: 'backup software keeps writing tapes: Tape Gateway.' },
          { t: 'On-prem app keeps reading files, cache locally', b: 'B', why: 'a bridge: S3 File Gateway.' },
          { t: 'Windows file shares with AD for EC2', b: 'A', why: 'a place: FSx for Windows File Server.' },
          { t: 'Replicate objects to another Region', b: 'B', why: 'keeping a copy in sync: S3 Cross-Region Replication.' },
          { t: 'Temporary scratch disk', b: 'A', why: 'a place: EC2 instance store.' }] } },
      { check: { id: 'ch2-ab', q: 'On-premises applications must keep reading a file share while the data itself is stored in Amazon S3. A or B?', opts: [{ t: 'A · where it lives', why: 'S3 alone is a place; it gives on-prem apps no share to read.' }, { t: 'B · how it moves or syncs', why: 'a bridge between on-prem apps and S3: Storage Gateway.' }], a: 1,
        why: 'The on-premises requirement makes it a bridge question. A WHERE service by itself (S3, EFS) misses “applications keep reading on-premises”.' } }
    ] },

    /* ---------------------------------------------------------------- 3 */
    { id: 'ch3', title: 'Block, file, object', blocks: [
      'There are three shapes of storage, and the application decides which one it needs.',
      { table: { head: ['Shape', 'Plain version', 'Exam logic', 'AWS'], key: true, rows: [
        ['Block', 'a raw disk that one computer plugs in and formats', 'one server, low latency, a file system on top, small in-place writes', 'EBS, instance store'],
        ['File', 'a shared network folder that many computers mount', 'many servers at once, NFS or SMB, folders, permissions, locks', 'EFS, FSx'],
        ['Object', 'a giant key → blob store over HTTP', 'no mounting, no partial edits: you PUT and GET whole objects', 'S3']] } },
      'The test is what the application **expects**, not what sounds modern. A database wants a disk. A fleet of web servers sharing uploads wants a folder. Backups, media, logs and a data lake want objects.',
      { pre:
`WHAT DOES THE APPLICATION EXPECT?
├─ a DISK (boot, database files, one server)
│   ├─ survive stop/terminate? no ─────────> instance store (scratch, fastest)
│   └─ yes ─┬─ general purpose, low cost ───> EBS gp3
│           ├─ highest IOPS, mission-critical > EBS io2 Block Express
│           ├─ big sequential reads, cheap ──> EBS st1
│           └─ coldest, cheapest per GB ─────> EBS sc1
├─ a SHARED FOLDER (mount, many servers)
│   ├─ Linux, NFS, multi-AZ ────────────────> EFS
│   ├─ Windows, SMB, AD, DFS ───────────────> FSx for Windows File Server
│   ├─ HPC / ML on S3 data ─────────────────> FSx for Lustre
│   ├─ NetApp, SnapMirror, multi-protocol ──> FSx for NetApp ONTAP
│   └─ ZFS, lowest-latency NFS ─────────────> FSx for OpenZFS
└─ OBJECTS over HTTP (backups, media, lake) > S3, then pick a class`, label: 'Decision map' },
      { link: '#tree', text: 'Walk it one question at a time in **Where it lives** →' },
      { hooks: [
        ['EBS', '“**E**xternal, **B**ound to one AZ”'],
        ['EFS', '“**E**veryone’s **F**older” (Linux)'],
        ['FSx', 'File System e**X**otic: **W**indows · **L**ustre (Linux cluster) · **O**NTAP (NetApp) · **Z**FS'],
        ['S3', '“**S**tuff over HTTP”'],
        ['Instance store', '“dies with the box”']] },
      { check: { id: 'ch3-q33', src: 'Exam Q33', q: 'Which statement about Amazon EBS is true?', opts: [
        { t: 'Volumes are automatically replicated to another Region.', why: 'EBS replicates inside one AZ only.' },
        { t: 'A volume can be attached to an instance in any AZ of the Region.', why: 'only in its own AZ.' },
        { t: 'A volume persists independently of the life of the instance it is attached to.', why: 'unless DeleteOnTermination removes it (the default for root volumes).' },
        { t: 'Snapshots are stored in Amazon RDS.', why: 'in S3 storage you cannot see.' }], a: 2,
        why: 'EBS is AZ-scoped: replicated and attachable only inside its AZ. Snapshots go to S3 storage you cannot see. What EBS does promise is that the volume outlives the instance.' } }
    ] },

    /* ---------------------------------------------------------------- 4 */
    { id: 'ch4', title: 'EBS in depth', domains: 'D3 · D4', blocks: [
      'EBS is a network-attached block volume that lives in **one Availability Zone** and attaches to **one instance at a time**. Most EBS questions follow from those two facts plus the volume-type table.',
      { table: { label: 'Volume types (AWS docs, checked 24 Sept 2026)', head: ['Type', 'Kind', 'Max IOPS', 'Max MiB/s', 'Size', 'Use for'], key: true, rows: [
        ['gp3', 'SSD', '80,000', '2,000', '1 GiB–64 TiB', 'the default: boot volumes, most workloads; 3,000 IOPS / 125 MiB/s baseline included'],
        ['gp2', 'SSD, legacy', '16,000', '250', '1 GiB–16 TiB', 'older; IOPS tied to size'],
        ['io2 Block Express', 'provisioned-IOPS SSD', '256,000', '4,000', '4 GiB–64 TiB', 'highest IOPS, sub-ms latency, **99.999%** durability, Multi-Attach'],
        ['io1', 'provisioned-IOPS SSD, older', '64,000', '1,000', '4 GiB–16 TiB', 'older generation; Multi-Attach'],
        ['st1', 'throughput HDD', '500', '500', '125 GiB–16 TiB', 'big sequential reads: logs, big data, warehouses; cannot boot'],
        ['sc1', 'cold HDD', '250', '250', '125 GiB–16 TiB', 'coldest, cheapest per GB; cannot boot']] } },
      { callout: 'AWS raised gp3 to **80,000 IOPS, 2,000 MiB/s and 64 TiB**. Older courses and many question banks still say 16,000 IOPS / 1,000 MiB/s / 16 TiB. If an answer depends on the old ceiling, go by the trigger: “highest IOPS”, “99.999%” or “Multi-Attach” still means io2 Block Express.', kind: 'update' },
      { widget: 'ebsChart' },
      { h: 'The facts the exam leans on' },
      { ul: [
        '**AZ-scoped.** A volume lives in one AZ and attaches only to instances there. To use it in another AZ: snapshot, then create a new volume from the snapshot in the target AZ. Snapshots are Regional, so they can seed any AZ.',
        '**One instance at a time**, except with **Multi-Attach**: io1 and io2 only, same AZ, up to 16 Nitro instances, and the application needs a cluster-aware file system. (Windows instances support it on io2 only; io1 Multi-Attach is limited to a few Regions.)',
        '**Snapshots are incremental** and are stored in S3 storage you **cannot see**. There is no Cross-Region Replication and no Object Lock on “the snapshot bucket”, because there is no bucket you own. For a copy elsewhere, **copy the snapshot** cross-Region, share it cross-account, or let AWS Backup do it.',
        '**Encrypting an existing volume**: snapshot, copy the snapshot with encryption on, create a volume from the copy, swap it in. Encryption is fixed at creation. “Encryption by default” affects only volumes created after you turn it on.',
        '**Sharing an encrypted snapshot** with another account needs a **customer managed KMS key**: share the key and the snapshot. The AWS managed key `aws/ebs` cannot be shared, and its policy cannot be edited.',
        '**DeleteOnTermination** defaults to true for the root volume. If a question says the data vanished with the instance, look there.',
        '**Fast Snapshot Restore** removes the first-read latency of a volume created from a snapshot. **Elastic Volumes** change size, type and IOPS while the volume stays in use.',
        '**Durable is not highly available.** EBS replicates inside its AZ. If the AZ is down, so is the volume.'] },
      { h: 'Instance store' },
      'NVMe disks physically attached to the host. They are the fastest option and are included in the instance price. They are also gone when the instance stops, terminates or the host fails. Use them for scratch space, caches, buffers and data that is replicated elsewhere, never for a system of record.',
      { check: fromDrill('D36', 'Move a volume') },
      { check: fromDrill('D35', 'Share a snapshot') },
      { drills: ['D32', 'D33', 'D34', 'D35', 'D36'] }
    ] },

    /* ---------------------------------------------------------------- 5 */
    { id: 'ch5', title: 'Shared file systems: EFS and the four FSx', domains: 'D2 · D3', blocks: [
      'When many servers need the same files at once, the answer is a file system. The operating system and one or two words in the question pick which one.',
      { h: 'Amazon EFS' },
      { ul: [
        'Managed **NFS for Linux**, POSIX permissions, thousands of clients at once.',
        '**Regional** (stored across several AZs, the default) or **One Zone** (cheaper, one AZ).',
        'Storage classes **Standard · Infrequent Access · Archive**, with lifecycle management moving files between them.',
        'Throughput modes: **Elastic** (the default and recommended one: scales with the workload), **Provisioned**, **Bursting**.',
        '**Mount targets are ENIs** in each AZ’s subnet, so security groups apply. NFS uses **port 2049**.',
        'Grows and shrinks automatically. No capacity planning, which is why it wins “unpredictable size” questions.'] },
      { h: 'FSx for Windows File Server' },
      { ul: [
        'A real Windows file server, managed: **SMB**, NTFS ACLs, shadow copies, quotas.',
        'Joins **Active Directory**: AWS Managed Microsoft AD or your self-managed AD. (Not AD Connector; Session 2 explains why.)',
        '**DFS namespaces** group shares under one path. **Single-AZ or Multi-AZ** (a standby file server in a second AZ).',
        'Triggers: Windows, SMB, .NET, SharePoint, home directories.'] },
      { h: 'FSx for Lustre' },
      { ul: [
        'Parallel file system for HPC, ML training, genomics, rendering and financial modelling.',
        '**Links to an S3 bucket**: lazy-loads objects as files on first access and can write results back.',
        '**Scratch** (temporary, cheapest, no replication) vs **Persistent** (replicated within one AZ, for longer-running work).',
        'Hook: Lustre = **L**inux + cl**uster**.'] },
      { h: 'FSx for NetApp ONTAP' },
      { ul: [
        'Managed NetApp ONTAP: **NFS, SMB and iSCSI** from the same file system.',
        'Snapshots, clones, **SnapMirror** replication from an on-prem NetApp, deduplication and compression.',
        'Trigger: the word NetApp, SnapMirror, or “multi-protocol”.'] },
      { h: 'FSx for OpenZFS' },
      { ul: [
        'Managed **ZFS over NFS** with very low latency, snapshots and clones.',
        'Trigger: the word ZFS, or moving an on-prem ZFS or Linux NAS unchanged.'] },
      { table: { label: 'Side by side', head: ['Service', 'Protocol', 'OS', 'Trigger words', 'Tempting wrong answer'], key: true, rows: [
        ['EFS', 'NFS', 'Linux', 'Linux, thousands of instances, shared, unpredictable size', 'EBS Multi-Attach'],
        ['FSx for Windows', 'SMB', 'Windows', 'Windows, SMB, AD, DFS, .NET', 'EFS'],
        ['FSx for Lustre', 'Lustre (POSIX)', 'Linux', 'HPC, ML, genomics, data already in S3, high throughput', 'EFS'],
        ['FSx for ONTAP', 'NFS + SMB + iSCSI', 'both', 'NetApp, SnapMirror, multi-protocol', 'FSx for Windows'],
        ['FSx for OpenZFS', 'NFS', 'Linux', 'ZFS', 'EFS']] } },
      { callout: 'EBS Multi-Attach is not a shared file system for normal applications: io1/io2 only, one AZ, 16 instances at most, and it needs a cluster-aware file system. “Many servers share files” means EFS or FSx.', kind: 'note', title: 'Trap' },
      { check: fromDrill('D21', 'Windows across two AZs') },
      { drills: ['D06', 'D21', 'D22', 'D23', 'D24'] }
    ] },

    /* ---------------------------------------------------------------- 6 */
    { id: 'ch6', title: 'S3 and its storage classes', domains: 'D2 · D4', blocks: [
      { h: 'S3 basics' },
      { ul: [
        'Objects from **0 B to 5 TB**. Multipart upload is recommended over **100 MB** and required over **5 GB**.',
        '**Strong read-after-write consistency**: a read after a successful write returns the new data.',
        '**Versioning** keeps every version of an object. **MFA Delete** requires MFA to delete a version or change the versioning state.',
        '**Object Lock** (WORM, needs versioning): **governance** mode lets users with special permission bypass it; **compliance** mode lets nobody shorten or remove retention, not even root. Legal holds have no end date.',
        '**Event notifications** to SNS, SQS, Lambda or EventBridge. **Batch Operations** run one job over millions of objects (copy, tag, restore, invoke Lambda).',
        '**Access Points**: named endpoints with their own policy, one per application or team. **Requester Pays**: the requester pays for requests and transfer.'] },
      { h: 'The classes' },
      { widget: 'classTable' },
      { callout: 'An earlier version of these notes gave S3 Express One Zone a 1-hour minimum storage duration. AWS’s current class comparison lists **no minimum** for it (checked 24 Sept 2026).', kind: 'update' },
      { widget: 'retrievalChart' },
      { widget: 'minDurationChart' },
      { hooks: [
        ['30 / 90 / 180', 'minimum days: **IA / Glacier / Deep**'],
        ['Speed', '**Instant** = ms · **Flexible** = minutes to hours · **Deep** = half a day'],
        ['“re-creatable”', 'unlocks **One Zone-IA**'],
        ['“unknown pattern”', '**Intelligent-Tiering**']] },
      { h: 'Pick a class' },
      'Set the four inputs a question gives you. The picker applies the rules in the order you should: the access pattern first, then retrieval time, then whether one AZ is acceptable, then the minimum duration against retention. Every other class gets a one-line reason it loses.',
      { widget: 'classPicker' },
      { h: 'Lifecycle rules' },
      'A lifecycle rule moves objects **down** the waterfall and can expire them: Standard → Standard-IA → Intelligent-Tiering → One Zone-IA → Glacier Instant → Glacier Flexible → Deep Archive. Three rules catch most exam answers:',
      { ol: [
        'Objects must sit in Standard at least **30 days** before a transition to Standard-IA or One Zone-IA.',
        'Leaving a class before its **minimum duration** still charges the rest of the minimum.',
        'Nothing moves back up, and not every downward step exists. One Zone-IA can go only to Glacier Flexible or Deep Archive.'] },
      'Lifecycle can also **abort incomplete multipart uploads**. That is the fix when the bill grows but the object count doesn’t.',
      { widget: 'lifecycleBuilder' },
      { check: fromDrill('D04', 'Quiz Q4') },
      { check: fromDrill('D26', 'Re-creatable thumbnails') },
      { drills: ['D25', 'D26', 'D27', 'D28', 'D29', 'D40'] }
    ] },

    /* ---------------------------------------------------------------- 7 */
    { id: 'ch7', title: 'How data moves: the six lines', domains: 'D3 · D4', blocks: [
      'The second question under “storage”, **how** data gets there, has six answers. Each is a transit line with one colour and one verb. Learn the verb and the line picks itself.',
      { lines: true },
      { h: 'The map' },
      'On-premises on the left, the network in the middle, AWS on the right. Tap a line and the others fade.',
      { map: true },
      { pre:
`NEED TO MOVE / SYNC / EXPOSE DATA?
├─ files over the network, once or scheduled ───> DataSync          MOVES
├─ on-prem apps keep using it; cache stays local > Storage Gateway   BRIDGES
│     files -> S3 File GW · blocks -> Volume GW (cached | stored) · tapes -> Tape GW
├─ other parties push/pull SFTP/FTPS/FTP/AS2 ───> Transfer Family   OPENS a door
├─ pipe would take weeks, one-off ──────────────> DTT / Snow        DRIVES by road
├─ database rows, full load + ongoing changes ──> DMS               REPLICATES
└─ whole servers, lift-and-shift ───────────────> MGN               REHOSTS`, label: 'Decision map B' },
      { h: 'The pipe rule' },
      'Do the math before reading the options on any transfer question. **100 Mbps moves about 1 TB a day; 1 Gbps about 10 TB a day** (1.08 and 10.8 at full speed; less when the link is shared). Divide terabytes by TB per day and compare the result with the deadline.',
      { ul: [
        'Fits the deadline → {datasync|DataSync} over the existing link.',
        'Would take weeks, and it’s **one-off** → {truck|the truck}.',
        'It’s **ongoing** → {datasync|DataSync}, even on a thin link. Trucks don’t do ongoing. If the first copy is huge, seed it offline, then sync.',
        '**Direct Connect is never provisioned for a one-off transfer.** It takes weeks to set up and bills monthly.'] },
      { widget: 'pipeCalc' },
      { check: fromDrill('D02', 'Quiz Q2') },
      { drills: ['D02', 'D11', 'D14', 'D20', 'D41'] }
    ] },

    /* ---------------------------------------------------------------- 8 */
    { id: 'ch8', title: 'DataSync vs Storage Gateway: mover vs bridge', domains: 'D3 · D4', blocks: [
      'This is the most expensive confusion in the cluster. Both touch on-premises files and S3. One **moves** data and is done; the other **bridges** so applications keep working.',
      { h: '{datasync|DataSync}: the mover' },
      { ul: [
        'An **agent** (a VM) on-premises reads NFS, SMB, HDFS or self-managed object storage. No agent is needed between AWS services.',
        'Also reads **other clouds**: Azure Blob and Files, Google Cloud Storage and others.',
        'One-off or **scheduled** tasks, incremental after the first run, **filters** (for example “only files older than two years”), **bandwidth throttling**.',
        '**Verifies** data integrity. One task can saturate a **10 Gbps** link.',
        'Writes to **S3 in any class, including Deep Archive** (no stop in Standard), to EFS and to FSx.',
        'Triggers: migrate, copy, sync, free up on-prem storage, within a month.'] },
      { h: '{gateway|Storage Gateway}: the bridge' },
      'A VM or hardware appliance on-premises. On-prem applications talk to it over a protocol they already use, a local cache keeps recent data fast, and the authoritative data lives in AWS.',
      { table: { head: ['Gateway', 'Speaks', 'Data lives in', 'Use when'], key: true, rows: [
        ['S3 File Gateway', 'NFS or SMB', 'S3 objects (then lifecycle)', 'apps keep a file share; SMB shares can join AD'],
        ['FSx File Gateway', 'SMB', 'FSx for Windows', '**closed to new customers**; banks still use it'],
        ['Volume Gateway, cached', 'iSCSI', 'S3 is primary; EBS snapshots', 'running out of on-prem storage; keep hot blocks local'],
        ['Volume Gateway, stored', 'iSCSI', 'full copy on-prem; async EBS snapshots in AWS', 'low latency to the whole dataset; backup and DR in AWS'],
        ['Tape Gateway', 'iSCSI virtual tape library', 'virtual tapes in S3, archived to Glacier Flexible or Deep Archive', 'existing backup software writes to tape']] } },
      { callout: 'Amazon **FSx File Gateway** is no longer available to new customers (since 28 Oct 2024). AWS points to FSx for Windows File Server directly. S3 File Gateway, Volume Gateway and Tape Gateway are unaffected.', kind: 'update' },
      { pair: 'ds-gw' }, { pair: 'vg' }, { pair: 'tape' }, { pair: 'ds-dms' },
      { callout: '**Exam Q8** (Gateway picked for records leaving on-prem for good), **Exam Q41** (missed the word “tape”), **Retest R1** (read “within a month / never edited” as ongoing), **Quiz Q3** (an option gave DataSync a “full load and CDC” task: right capability, wrong service).', kind: 'miss' },
      { check: fromDrill('D10', 'Exam Q8') },
      { check: fromDrill('D18', 'SAN 95% full') },
      'Both at once is a real pattern: DataSync to migrate, then S3 File Gateway for the subset that on-prem applications still read (D38).',
      { drills: ['D01', 'D07', 'D10', 'D13', 'D18', 'D19', 'D38', 'D42'] }
    ] },

    /* ---------------------------------------------------------------- 9 */
    { id: 'ch9', title: 'Partners, trucks and the edge', domains: 'D1 · D3', blocks: [
      { h: '{transfer|Transfer Family}: the partner door' },
      'Managed **SFTP, FTPS, FTP and AS2** endpoints that store files in S3 or EFS. The other party keeps its client and protocol, and you run no servers. Users can come from AWS Directory Service (including Microsoft AD), from a custom identity provider through Lambda, or be managed by the service.',
      { ul: [
        'Triggers: partners, suppliers or customers upload; “cannot change their tooling”; EDI over AS2; decommission the FTP server.',
        'Tempting wrong: an SFTP server on EC2 (more ops), or DataSync (you can’t put an agent at 300 suppliers).'] },
      { pair: 'ds-tf' },
      { h: '{truck|DTT / Snow}: the truck' },
      'When the pipe would take weeks, the data travels physically.',
      { callout: 'Since **7 Nov 2025** AWS no longer offers Snow Family devices to new customers (existing customers are unaffected). For offline transfer AWS now points to **AWS Data Transfer Terminal**: reserve a slot at an AWS facility, bring your own storage devices and upload over a high-bandwidth connection. Marketplace partners are the other option, and Outposts covers edge compute. Question banks still say Snowball.', kind: 'update' },
      'The trigger is the same whatever the option calls it: hundreds of TB or PB, a thin link or none, a one-time import, “would take weeks or months”.',
      { pair: 'truck' },
      { h: 'Upload vs download at the edge' },
      { ul: [
        '**S3 Transfer Acceleration**: many clients far from the Region **upload** into one bucket. Traffic enters AWS at the nearest edge location and rides the AWS backbone. It caches nothing.',
        '**CloudFront**: many clients **download** the same objects again and again. They are cached at the edge; use signed URLs or cookies for private content.',
        '**Global Accelerator** is neither. It gives TCP/UDP applications static anycast IPs. It is not an S3 cache, and in S3 questions it is a prestige distractor.'] },
      { pair: 'ta-cf' },
      { callout: '**Exam Q4** (Transfer Acceleration for downloads), **Exam Q12 and Q54** (DataSync or Direct Connect for a truck case).', kind: 'miss' },
      { check: fromDrill('D17', 'Outposts downloads') },
      { drills: ['D08', 'D37', 'D11', 'D14', 'D17', 'D30'] }
    ] },

    /* ---------------------------------------------------------------- 10 */
    { id: 'ch10', title: 'Backups and copies', domains: 'D1 · D2', blocks: [
      { h: 'AWS Backup' },
      { ul: [
        '**One place for many services**: EC2 and EBS, RDS and Aurora, DynamoDB, EFS, FSx, S3, Storage Gateway volumes and more.',
        '**Backup plans** (schedule, retention, move to cold storage) and **backup vaults**.',
        '**Vault Lock**, governance or compliance mode. Once a compliance-mode lock is set, nobody can delete recovery points early or shorten retention, not even root.',
        '**Cross-Region and cross-account copies** (with AWS Organizations).',
        '**Backup Audit Manager** produces reports for auditors.',
        'Also covers **on-premises VMware** VMs.'] },
      { h: 'Amazon Data Lifecycle Manager (DLM)' },
      '**EBS snapshots and EBS-backed AMIs only.** Policy-based schedules and retention, and it can copy snapshots to another Region. There is no extra cost. It is the fastest, simplest answer when the question is about EBS and nothing else.',
      { h: 'Native backups' },
      'RDS automated backups (point-in-time restore within the retention window) and DynamoDB point-in-time recovery or on-demand backups stay in the **same account and Region**. “Another account” is where native backups stop and AWS Backup starts.',
      { h: 'S3 replication and Object Lock' },
      { ul: [
        '**CRR** (another Region) and **SRR** (same Region) need **versioning on both buckets**.',
        'Replication is **not retroactive**. Existing objects need **S3 Batch Replication**.',
        '**Object Lock** needs versioning. Compliance mode: nobody can delete before the date, including root. Governance mode: privileged users can bypass it.',
        'None of this applies to EBS snapshots. You never see them as objects in a bucket.'] },
      { pair: 'backup' },
      { callout: '**Exam Q29** (DLM was the answer: EBS only, simplest), **Exam Q11** (cross-account = AWS Backup), **Quiz Q5** (Vault Lock; snapshots are not in a visible bucket), **Retest R3** (“one place” for EC2 + RDS + EFS → AWS Backup).', kind: 'miss' },
      { check: fromDrill('D05', 'Quiz Q5') },
      { check: fromDrill('D31', 'Existing objects') },
      { pre: 'EBS snapshots -> S3 you CANNOT see -> never CRR / Object Lock / "the bucket"\n"one place" + >=2 services -> AWS Backup   (DLM = EBS only)', label: 'Carry-forward rules' },
      { drills: ['D05', 'D09', 'D12', 'D16', 'D29', 'D31', 'D39'] }
    ] },

    /* ---------------------------------------------------------------- 11 */
    { id: 'ch11', title: 'What changed since the exam guide', blocks: [
      'The SAA-C03 guide and most question banks were written before these changes. You will meet both the old answer and the new one, so know both.',
      { callout: 'Snow devices are no longer orderable by new customers (since 7 Nov 2025). Offline transfer today = **AWS Data Transfer Terminal** (reserve a slot, bring your own devices) or Marketplace partners; online = DataSync; edge compute = Outposts. Tutorials Dojo banks already use DTT as the answer.', kind: 'update', title: 'Snow Family → Data Transfer Terminal' },
      { callout: 'Not available to new customers since 28 Oct 2024. AWS suggests FSx for Windows File Server directly. S3 File Gateway, Volume Gateway and Tape Gateway are unaffected.', kind: 'update', title: 'FSx File Gateway closed' },
      { callout: 'gp3: **80,000 IOPS · 2,000 MiB/s · 64 TiB** (was 16,000 / 1,000 / 16 TiB). gp2 unchanged at 16,000 / 250 MiB/s / 16 TiB. io2 Block Express: 256,000 IOPS · 4,000 MiB/s · 64 TiB · 99.999%.', kind: 'update', title: 'EBS gp3 limits raised' },
      { callout: 'Both closed to new customers since **7 Nov 2025**; the replacement is **AWS Transform**. MGN’s docs now call it “AWS Transform MGN”. Session 2 covers this in depth.', kind: 'update', title: 'Migration Hub & Application Discovery Service → AWS Transform' },
      { callout: 'Now called **Route 53 VPC Resolver** (renamed when Route 53 Global Resolver was introduced). Inbound and outbound endpoints work as before.', kind: 'update', title: 'Route 53 Resolver renamed' },
      { callout: 'AWS’s class comparison lists **no minimum storage duration** for S3 Express One Zone.', kind: 'update', title: 'Express One Zone minimum' },
      { h: 'Answering with old names' },
      'Answer the **trigger**, not the product name. “Petabytes, a poor network, one time” is the truck line whether the option says Snowball Edge or Data Transfer Terminal. An answer set will usually contain one of them, rarely both.',
      '“Windows users on SMB with a local cache in front of FSx for Windows” is FSx File Gateway in a question bank. In a current design it is S3 File Gateway with an SMB share (if S3 is the target) or FSx for Windows directly.',
      { check: { id: 'ch11-old', q: 'An older bank asks: 500 TB, a 100 Mbps link, one-time import into S3, fastest. Options: A) AWS DataSync, B) AWS Snowball Edge Storage Optimized, C) AWS Direct Connect, D) S3 Transfer Acceleration. Which do you pick?', opts: [{ t: 'A · DataSync', why: 'about 500 days at 1 TB/day.' }, { t: 'B · Snowball Edge', why: 'the bank’s truck.' }, { t: 'C · Direct Connect', why: 'never for a one-off; weeks to provision.' }, { t: 'D · Transfer Acceleration', why: 'adds no bandwidth.' }], a: 1,
        why: 'The trigger is the truck line. In this bank the truck is Snowball, so pick it. Today you would book a Data Transfer Terminal.' } }
    ] },

    /* ---------------------------------------------------------------- 12 */
    { id: 'ch12', title: 'Triggers, traps and your record', blocks: [
      'Every trigger card as one searchable table. Type a phrase you half-remember from a question.',
      { widget: 'triggerTable' },
      { link: '#traps', text: 'All 15 traps, each linked to the drills that test it →' },
      { h: 'Your record' },
      { log: true },
      'The two rules the quiz and retest cost you. Say them out loud before the drill:',
      { pre: 'EBS snapshots -> S3 you CANNOT see -> never CRR / Object Lock / "the bucket"\n"one place" + >=2 services -> AWS Backup   (DLM = EBS only)', label: 'Carry-forward rules' },
      { link: '#drill', text: 'Go to the drill (42 scenarios)', btn: true }
    ] }
  ];

  /* S3 classes tab: the class tools on one page */
  S.pages = [
    { key: 'classes', label: 'S3 classes', title: 'S3 storage classes', lead: 'Pick a class from access pattern, retrieval time and retention; then check the lifecycle rule that gets objects there.', blocks: [
      { widget: 'classPicker' },
      { widget: 'retrievalChart' },
      { widget: 'minDurationChart' },
      { widget: 'lifecycleBuilder' },
      { widget: 'classTable' },
      { hooks: [
        ['30 / 90 / 180', 'minimum days: **IA / Glacier / Deep**'],
        ['Speed', '**Instant** = ms · **Flexible** = minutes to hours · **Deep** = half a day'],
        ['“re-creatable”', 'unlocks **One Zone-IA**'],
        ['“unknown pattern”', '**Intelligent-Tiering**']] },
      { drills: ['D04', 'D25', 'D26', 'D27', 'D28', 'D29', 'D40'] }
    ] }
  ];
})();
