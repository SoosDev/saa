/* Session 1 — Storage & Data Movement: meta, lines, map, stub, method, cheat sheet, tree, compare, traps, log */
window.SESSION = window.SESSION || {};
Object.assign(window.SESSION, {
  meta: { id: '01-storage', n: 1, title: 'Storage & Data Movement', brand: 'Storage Transit Map', home: '../../', updated: '2026-09-24' },

  lines: [
    { id: 'datasync', name: 'DataSync', short: 'DataSync', cls: 'ds', alias: ['DataSync'],
      misses: 'Q8 (picked Gateway), R1 (read one-off as ongoing), Q3 quiz (DataSync “CDC”).', verb: 'moves files over the network', from: 'NAS / other cloud → S3 · EFS · FSx',
      built: 'A **mover**. Copies files and objects over the network, once or on a schedule, verifies every file, then it is done.',
      says: ['migrate files', 'NFS / SMB / HDFS', 'other cloud → S3', 'scheduled sync', 'straight to Deep Archive', 'verify integrity'],
      switch: [{ to: 'gateway', when: 'on-prem apps must keep using the files' }, { to: 'dms', when: 'the source is a database engine' }, { to: 'truck', when: 'weeks at current bandwidth' }] },
    { id: 'gateway', name: 'Storage Gateway', short: 'Gateway', cls: 'gw', textVar: 'gw-text', alias: ['Gateway', 'Cached volumes', 'Stored volumes'],
      misses: 'Q41 (missed the word “tape”).', verb: 'bridges; cache stays local', from: 'on-prem apps ⇄ S3 · FSx · virtual tapes',
      built: 'A **bridge**. On-prem applications keep reading and writing through a local VM/appliance with a cache; the authoritative data lives in AWS.',
      says: ['applications continue to access', 'low-latency local cache', 'hybrid', 'iSCSI', 'tape / VTL', 'running out of on-prem storage'],
      switch: [{ to: 'datasync', when: 'data leaves on-prem for good (migration)' }, { to: 'transfer', when: 'outside partners speak SFTP/FTP/AS2' }],
      update: 'Amazon **FSx File Gateway** is no longer available to new customers; AWS points to FSx for Windows File Server directly. S3 File Gateway, Volume Gateway and Tape Gateway are unaffected. Question banks still use FSx File Gateway as an answer.' },
    { id: 'transfer', name: 'Transfer Family', short: 'Transfer', cls: 'tf', alias: ['Transfer Family'], verb: 'opens a partner door', from: 'SFTP / FTPS / FTP / AS2 → S3 · EFS',
      built: 'A **door** for other parties. Managed SFTP, FTPS, FTP and AS2 endpoints that land files in S3 or EFS; users from Directory Service, an IdP or Lambda.',
      says: ['partners / suppliers / customers upload', 'SFTP', 'FTPS / FTP', 'AS2 / EDI', 'cannot change their tooling', 'decommission the FTP server'],
      switch: [{ to: 'datasync', when: 'you own both ends and just need to copy' }] },
    { id: 'truck', name: 'DTT / Snow', short: 'the truck', cls: 'dtt', textVar: 'dtt-text', alias: ['Data Transfer Terminal', 'DTT', 'Snow'],
      misses: 'Q12 and Q54 (DataSync / Direct Connect for a truck case), Quiz Q2 (skipped the pipe math).', dash: '14 10', width: 6, verb: 'drives it by road', from: 'portable drives → S3',
      built: 'The **truck**. When the pipe would take weeks, the data travels physically: bring devices to an AWS Data Transfer Terminal (current) — or, in older question banks, ship a Snow Family device.',
      says: ['hundreds of TB / PB', 'would take weeks or months', 'limited / no connectivity', 'one-time import'],
      switch: [{ to: 'datasync', when: 'the transfer is ongoing, or the link is fat enough' }],
      update: 'AWS Snow Family devices are **no longer orderable by new customers**. AWS recommends DataSync for online and **Data Transfer Terminal** (or Marketplace partners) for offline transfer, and Outposts for edge compute. Treat Snow and DTT as the same trigger.' },
    { id: 'dms', name: 'DMS', short: 'DMS', cls: 'dms', alias: ['DMS'],
      misses: 'Q56 and Quiz Q3 (DataSync picked for a database).', verb: 'replicates database rows', from: 'DB engine → RDS / Aurora / S3 · full load + CDC',
      built: 'A **row replicator**. Copies database tables — full load, then ongoing changes (CDC) — while the source stays online. Can write to S3 as CSV or Parquet. Session 2 goes deep.',
      says: ['database', 'ongoing changes / CDC', 'minimal downtime', 'heterogeneous engines', 'CSV / Parquet in S3'],
      switch: [{ to: 'datasync', when: 'it is files, not a database' }, { to: 'mgn', when: 'the whole server moves as-is' }] },
    { id: 'mgn', name: 'MGN', short: 'MGN', cls: 'mgn', alias: ['MGN', 'Application Migration Service'], verb: 'rehosts whole servers', from: 'VMs / physical / other cloud → EC2',
      built: 'A **server mover**. Application Migration Service replicates whole disks block-by-block and launches them as EC2 instances (lift-and-shift). Session 2 goes deep.',
      says: ['lift-and-shift', 'rehost', 'minimal changes', 'servers / VMs'],
      switch: [{ to: 'dms', when: 'only the database, into a managed service' }] }
  ],

  map: {
    title: 'How data moves: six lines', lead: 'On-premises on the left, the network in the middle, AWS on the right. Tap a line: the others fade so one route reads at a time.',
    viewBox: '0 0 1000 744', defaultLine: 'datasync',
    caption: 'Pipe rule: 100 Mbps ≈ 1 TB/day · 1 Gbps ≈ 10 TB/day. If the scenario says “weeks”, the truck line wins.',
    items: [
      { el: 'rect', a: { x: 0, y: 0, width: 300, height: 744 }, style: 'fill:var(--zone-onprem)' },
      { el: 'rect', a: { x: 700, y: 0, width: 300, height: 744 }, style: 'fill:var(--zone-aws)' },
      { el: 'text', a: { x: 20, y: 34, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5 }, style: 'fill:var(--ink2)', text: 'ON-PREMISES' },
      { el: 'text', a: { x: 500, y: 34, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5, 'text-anchor': 'middle' }, style: 'fill:var(--ink2)', text: 'THE PIPE' },
      { el: 'text', a: { x: 500, y: 52, 'font-size': 12, 'text-anchor': 'middle' }, style: 'fill:var(--ink2)', text: 'internet · VPN · Direct Connect' },
      { el: 'text', a: { x: 720, y: 34, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5 }, style: 'fill:var(--ink2)', text: 'AWS' },
      { el: 'text', a: { x: 500, y: 728, 'font-size': 12, 'text-anchor': 'middle', 'font-family': 'Overpass Mono, monospace' }, style: 'fill:var(--ink2)', text: '1 Gbps ≈ 10 TB/day · 100 Mbps ≈ 1 TB/day' },
      { el: 'line', line: 'gateway', paths: ['M250 200 H285 L318 236', 'M250 290 H285 L318 254', 'M378 245 H742'], labels: [{ x: 420, y: 233, t: 'STORAGE GATEWAY — bridge + cache' }],
        extra: [{ el: 'rect', a: { x: 318, y: 228, width: 60, height: 34, rx: 6, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:3' } }, { el: 'text', a: { x: 348, y: 250, 'font-size': 13, 'font-weight': 800, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, text: 'GW' }] },
      { el: 'line', line: 'transfer', paths: ['M250 380 H560 L640 300 H742', 'M560 380 H600 L640 340 H742'], labels: [{ x: 300, y: 368, t: 'TRANSFER FAMILY — partner door' }] },
      { el: 'line', line: 'dms', paths: ['M250 470 H560 L610 520 H742'], labels: [{ x: 300, y: 458, t: 'DMS — database rows + CDC' }] },
      { el: 'line', line: 'mgn', paths: ['M250 560 H560 L610 610 H742'], labels: [{ x: 300, y: 548, t: 'MGN — whole servers' }] },
      { el: 'line', line: 'truck', paths: ['M250 650 H440 L480 690 H742'], labels: [{ x: 300, y: 638, t: 'DTT / SNOW — the truck' }, { x: 580, y: 668, t: 'DTT facility / Snow device', anchor: 'middle', ls: 0 }],
        extra: [{ el: 'rect', a: { x: 567, y: 677, width: 26, height: 26, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:3' } }] },
      { el: 'line', line: 'datasync', paths: ['M250 110 H470 L510 150 H742'], labels: [{ x: 276, y: 96, t: 'DATASYNC — network mover', size: 13 }, { x: 530, y: 138, t: '→ S3 (any class) · EFS · FSx', w: 400, ls: 0 }] },
      /* left stations */
      ...[[110, 'NAS', 'NFS / SMB files to move', ['datasync']], [200, 'Apps that keep running', 'NFS / SMB / iSCSI', ['gateway']], [290, 'Tape backup app', 'Veeam, NetBackup…', ['gateway']], [380, 'External partners', 'SFTP / FTPS / FTP / AS2', ['transfer']], [470, 'Database', 'Oracle, PostgreSQL, MySQL', ['dms']], [560, 'Servers / VMs', 'lift-and-shift', ['mgn']], [650, 'Portable drives', '100s of TB, thin pipe', ['truck']]].flatMap(([y, n, sub, ls]) => [
        { el: 'circle', pick: ls, a: { cx: 250, cy: y, r: 9 }, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:3' },
        { el: 'text', pick: ls, a: { x: 232, y: y - 2, 'font-size': 14, 'font-weight': 700, 'text-anchor': 'end', 'font-family': 'Atkinson Hyperlegible, sans-serif' }, style: 'fill:var(--ink)', text: n },
        { el: 'text', pick: ls, a: { x: 232, y: y + 14, 'font-size': 12, 'text-anchor': 'end', 'font-family': 'Atkinson Hyperlegible, sans-serif' }, style: 'fill:var(--ink2)', text: sub }]),
      /* S3 interchange + lifecycle */
      { el: 'rect', lines: ['datasync', 'gateway', 'transfer'], a: { x: 742, y: 128, width: 28, height: 184, rx: 14 }, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:3' },
      { el: 'path', lines: ['datasync', 'gateway', 'transfer'], a: { d: 'M770 150 H830 V240', fill: 'none' }, style: 'stroke:var(--ink);stroke-width:3' },
      ...[[150, 'Standard-IA · 30 d'], [195, 'Glacier · 90 d'], [240, 'Deep Archive · 180 d']].flatMap(([y, t]) => [
        { el: 'circle', lines: ['datasync', 'gateway', 'transfer'], a: { cx: 830, cy: y, r: 6 }, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:3' },
        { el: 'text', lines: ['datasync', 'gateway', 'transfer'], a: { x: 844, y: y + 5, 'font-size': 13, 'font-family': 'Atkinson Hyperlegible, sans-serif' }, style: 'fill:var(--ink)', text: t }]),
      { el: 'text', lines: ['datasync', 'gateway', 'transfer'], a: { x: 784, y: 286, 'font-size': 22, 'font-weight': 700 }, style: 'fill:var(--ink)', text: 'S3' },
      { el: 'text', lines: ['datasync', 'gateway', 'transfer'], a: { x: 784, y: 304, 'font-size': 12, 'font-family': 'Atkinson Hyperlegible, sans-serif' }, style: 'fill:var(--ink2)', text: 'lifecycle →' },
      ...[[340, 'EFS · Linux NFS', null, ['transfer', 'datasync']], [520, 'RDS / Aurora', 'or S3 as CSV / Parquet', ['dms']], [610, 'EC2 · rehosted', null, ['mgn']], [690, 'S3 · bulk import', null, ['truck']]].flatMap(([y, n, sub, ls]) => [
        { el: 'circle', lines: ls, a: { cx: 756, cy: y, r: 9 }, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:3' },
        { el: 'text', lines: ls, a: { x: 776, y: sub ? y - 2 : y + 5, 'font-size': 14, 'font-weight': 700, 'font-family': 'Atkinson Hyperlegible, sans-serif' }, style: 'fill:var(--ink)', text: n },
        sub ? { el: 'text', lines: ls, a: { x: 776, y: y + 14, 'font-size': 12, 'font-family': 'Atkinson Hyperlegible, sans-serif' }, style: 'fill:var(--ink2)', text: sub } : null].filter(Boolean))
    ]
  },

  stub: [
    { id: 'size', label: 'SIZE / NET', short: 'SIZE', values: ['fits the pipe', 'weeks+ online', 'not about transfer'] },
    { id: 'time', label: 'TIME', short: 'TIME', values: ['one-off', 'ongoing'] },
    { id: 'proto', label: 'PROTOCOL / APP', short: 'PROTO', values: ['NFS/SMB', 'iSCSI/block', 'tape', 'SFTP/FTP/AS2', 'database', 'servers', 'objects/HTTP', 'AWS-internal'] },
    { id: 'sup', label: 'SUPERLATIVE', short: 'SUP', values: ['cheapest', 'least ops', 'fastest', 'most durable/compliant', 'none stated'] }
  ],
  topics: { backup: 'Backups & copies', where: 'Where data lives', classes: 'S3 classes', edge: 'Edge & upload' },

  method:
`1. Strip the story. Keep DATA nouns and MOVE / STORE / ACCESS verbs.
2. Fill the stub, always the same 4 slots:
   SIZE/NET ____   TIME (one-off / ongoing) ____
   PROTOCOL/APP (NFS, SMB, iSCSI, tape, SFTP, DB, servers) ____
   SUPERLATIVE (cheapest / least ops / fastest) ____
3. For EACH option ask: "what problem was this service BUILT for?"
   No match with the stub -> cross it out, whatever the rest of the sentence says.
4. Among the survivors, the one that satisfies the SUPERLATIVE wins.`,

  cheat:
`STORAGE = WHERE (A) or HOW (B)?
A WHERE:  disk -> EBS (1 AZ, 1 instance, snap->S3)   | tmp -> instance store
          folder Linux -> EFS (NFS, multi-AZ)         | Windows -> FSx Win (SMB/AD)
          HPC -> FSx Lustre | NetApp -> FSx ONTAP | ZFS -> FSx OpenZFS
          objects -> S3     30/90/180 = IA/Glacier/Deep ; unknown -> Int-Tiering
          EBS: gp3 default (to 80k IOPS) · io2 BE top (256k, Multi-Attach) · st1 throughput · sc1 cold
B HOW:    NET files      -> DataSync        (migrate/sync, any S3 class incl. Deep)
          HYBRID keep    -> Storage Gateway (S3 File, Volume cached/stored, Tape; FSx File = closed to new)
          PARTNERS       -> Transfer Family (SFTP/FTPS/FTP/AS2)
          TRUCK          -> DTT / Snow      (weeks at current bandwidth; Snow closed to new)
          DB             -> DMS (+SCT)      | SERVERS -> MGN
          UPLOAD far     -> S3 Transfer Accel | DOWNLOAD cache -> CloudFront
          COPY x-acct/x-region, many svcs -> AWS Backup | EBS only, fastest -> DLM
          S3 -> S3 region -> CRR (versioning!) · existing objects -> Batch Replication
KEY:  Network=DataSync  Bridge=Gateway  Tape=TapeGW->Deep  Truck=DTT/Snow
      DB=DMS  Servers=MGN  Partners=Transfer  X-account=Backup
NEVER: DX for one-off transfer · Gateway for migration · TA for download ·
       EFS for Windows · IA before 30d · Deep Archive when "minutes"
EBS snapshots -> S3 you CANNOT see -> never CRR / Object Lock / "the bucket"
"one place" + >=2 services -> AWS Backup  (DLM = EBS only)
PIPE: 100 Mbps ~ 1 TB/day · 1 Gbps ~ 10 TB/day`,

  tree: {
    title: 'Where it lives', tab: 'Where it lives', lead: 'One question at a time. Answer what the **application expects**, not what sounds modern.',
    start: 'root',
    nodes: {
      root: { q: 'What does the application expect?', opts: [
        { label: 'A disk', sub: 'boot volume, database files, "block", one server', next: 'disk' },
        { label: 'A shared folder', sub: '"mount", many servers at once', next: 'folder' },
        { label: 'Objects over HTTP', sub: 'backups, media, data lake, static site, logs', next: 's3' }] },
      disk: { q: 'Must the data survive a stop or termination?', opts: [
        { label: 'Yes — it is the system of record', next: 'diskkind' },
        { label: 'No — scratch, cache, buffers; loss is fine', sub: 'fastest possible, lowest cost', next: 'istore' }] },
      diskkind: { q: 'What matters most?', opts: [
        { label: 'General purpose at low cost', sub: 'boot volumes, most apps', next: 'gp3' },
        { label: 'Highest IOPS, sub-ms latency, mission-critical DB', next: 'io2' },
        { label: 'Big sequential throughput, cheap', sub: 'logs, big data, streaming reads', next: 'st1' },
        { label: 'Coldest data, cheapest per GB', sub: 'rarely read', next: 'sc1' }] },
      folder: { q: 'Which OS and which need?', opts: [
        { label: 'Linux, NFS, thousands of clients, multi-AZ', next: 'efs' },
        { label: 'Windows, SMB, Active Directory, DFS', next: 'fsxw' },
        { label: 'HPC / ML: process S3 data at very high throughput', next: 'lustre' },
        { label: 'NetApp, SnapMirror, NFS + SMB + iSCSI on one FS', next: 'ontap' },
        { label: 'ZFS, lowest-latency NFS', next: 'zfs' }] }
    },
    results: {
      istore: { title: 'EC2 instance store', text: 'NVMe disks physically attached to the host. Fastest and included in the instance price — and gone when the instance stops, terminates or the host fails.', facts: ['Use for scratch, caches, buffers, replicated data', 'Not for anything you cannot rebuild'], whyNot: [['EBS', 'you would pay for durability you do not need']] },
      gp3: { title: 'EBS gp3', line: 'ink', text: 'General-purpose SSD. The default for boot volumes and most workloads; IOPS and throughput are set independently of size.', facts: ['Baseline 3,000 IOPS / 125 MiB/s included', 'Up to 80,000 IOPS · 2,000 MiB/s · 64 TiB per volume', 'gp2 is legacy: IOPS tied to size, max 16,000'], update: 'AWS raised gp3 limits to 80,000 IOPS, 2,000 MiB/s and 64 TiB (checked Sept 2026). Older material says 16,000 IOPS / 1,000 MiB/s / 16 TiB.', whyNot: [['io2', 'only when you need its 99.999% durability, 256k IOPS or Multi-Attach'], ['gp2', 'older, costlier per IOPS']] },
      io2: { title: 'EBS io2 Block Express', text: 'Provisioned-IOPS SSD for the most demanding databases: highest IOPS, sub-millisecond latency, 99.999% durability.', facts: ['Up to 256,000 IOPS · 4,000 MiB/s · 64 TiB', 'Supports Multi-Attach (same AZ, up to 16 Nitro instances, needs a cluster-aware file system)', 'io1 is the older generation (64,000 IOPS)'], whyNot: [['gp3', 'good up to 80k IOPS, but lower durability and no Multi-Attach'], ['instance store', 'fast but not durable']] },
      st1: { title: 'EBS st1 (Throughput Optimized HDD)', text: 'Cheap HDD for large sequential reads and writes: log processing, data warehouses, streaming.', facts: ['Up to 500 MiB/s, 500 IOPS', 'Cannot be a boot volume'], whyNot: [['sc1', 'cheaper but slower; for cold data'], ['gp3', 'SSD you do not need for sequential scans']] },
      sc1: { title: 'EBS sc1 (Cold HDD)', text: 'The cheapest EBS per GB, for data you rarely read but want on a block device.', facts: ['Up to 250 MiB/s, 250 IOPS', 'Cannot be a boot volume', 'If it does not need to be a block device, S3 is cheaper still'], whyNot: [['st1', 'faster, a bit dearer'], ['S3 Glacier', 'if no server needs a disk, objects are cheaper']] },
      efs: { title: 'Amazon EFS', text: 'Managed NFS for Linux. Thousands of clients, grows and shrinks automatically, Regional (multi-AZ) by default.', facts: ['Storage classes: Standard · Infrequent Access · Archive, with lifecycle', 'Throughput: Elastic (default), Provisioned, Bursting', 'One Zone file systems are cheaper, single AZ', 'Mount targets are ENIs in each AZ → security groups, NFS port 2049'], whyNot: [['FSx for Windows', 'SMB/Windows, not NFS'], ['EBS Multi-Attach', 'same AZ, ≤16 instances, needs a cluster FS']] },
      fsxw: { title: 'FSx for Windows File Server', text: 'Real Windows file server, managed: SMB, NTFS ACLs, Active Directory, DFS namespaces, shadow copies, quotas. Single-AZ or Multi-AZ.', facts: ['Needs AWS Managed Microsoft AD or your self-managed AD', 'The answer to “Windows”, “SMB”, “.NET”, “SharePoint”, “home directories”'], whyNot: [['EFS', 'NFS/Linux only'], ['S3 File Gateway', 'an on-prem bridge, not a file server in AWS']] },
      lustre: { title: 'FSx for Lustre', text: 'Parallel file system for HPC, ML training, genomics, rendering. Links to an S3 bucket: lazy-loads objects as files and writes results back.', facts: ['Scratch (temporary, cheapest, no replication) vs Persistent (replicated in one AZ)', '“Lustre” = Linux + cluster'], whyNot: [['EFS', 'general-purpose, not built for massively parallel throughput'], ['FSx ONTAP', 'enterprise NAS features you are not using']] },
      ontap: { title: 'FSx for NetApp ONTAP', text: 'Managed NetApp: NFS, SMB and iSCSI from the same file system, snapshots, clones, SnapMirror replication from on-prem NetApp, dedup and compression.', facts: ['Exam trigger: the word NetApp, SnapMirror, or multi-protocol'], whyNot: [['FSx for Windows', 'SMB only, no SnapMirror'], ['EFS', 'NFS only']] },
      zfs: { title: 'FSx for OpenZFS', text: 'Managed ZFS over NFS with very low latency, snapshots and clones. Trigger: the word ZFS, or moving an on-prem ZFS/Linux NAS unchanged.', whyNot: [['EFS', 'no ZFS features']] },
      s3: { title: 'Amazon S3 → pick a class', text: 'Objects over HTTP. Then the real question is the storage class: open the **S3 classes** tab to pick one from access pattern, retrieval time and retention.', facts: ['Objects 0 B – 5 TB; multipart upload recommended over 100 MB, required over 5 GB', 'Strong read-after-write consistency', '[[#classes|Open the class picker →]]'] }
    }
  },

  compare: [
    { id: 'ds-gw', short: 'DataSync · File GW', title: 'DataSync vs S3 File Gateway — mover vs bridge',
      sides: [{ name: 'DataSync', line: 'datasync', fig: { dir: 'one' }, gist: 'One way. The data **leaves**. The job ends.' }, { name: 'S3 File Gateway', line: 'gateway', fig: { dir: 'both', cache: true }, gist: 'Both ways. Apps **stay** and keep reading through a cache.' }],
      rows: [['Deciding words', 'migrate, archive to, within a month, scheduled copy', 'keep accessing, low latency, hybrid'], ['Lands in', 'S3 any class (incl. Deep Archive), EFS, FSx', 'S3 (then lifecycle)'], ['Tempting wrong', 'Gateway, because “on-prem to AWS” sounds hybrid', 'DataSync, because files are moving'], ['Both right?', 'Yes: DataSync to migrate, then File Gateway for ongoing on-prem access.']],
      check: { q: '“Free up on-prem space. The history is read-only and never needed on-prem again.”', opts: ['DataSync', 'S3 File Gateway'], a: 0, why: 'Data leaving for good = mover. Nothing on-prem needs to read it afterwards, so there is nothing to bridge.' } },
    { id: 'ds-tf', short: 'DataSync · Transfer', title: 'DataSync vs Transfer Family — your ends vs their door',
      sides: [{ name: 'DataSync', line: 'datasync', fig: { dir: 'one' }, gist: 'You own **both ends** and install an agent.' }, { name: 'Transfer Family', line: 'transfer', fig: { dir: 'one', left: 'PARTNER' }, gist: 'The **other party** owns one end and speaks SFTP/FTPS/FTP/AS2.' }],
      rows: [['Deciding words', 'migrate, sync, NFS/SMB, other cloud', 'partners, suppliers, customers, cannot change tooling'], ['Tempting wrong', '—', 'an SFTP server on EC2 (more ops)']],
      check: { q: '“300 suppliers upload daily files over FTP and cannot change their tooling.”', opts: ['DataSync', 'Transfer Family'], a: 1, why: 'You cannot install an agent at 300 suppliers. They keep their FTP clients; Transfer Family gives them a managed endpoint.' } },
    { id: 'vg', short: 'Cached · Stored', title: 'Volume Gateway: cached vs stored volumes',
      sides: [{ name: 'Cached volumes', line: 'gateway', fig: { dir: 'both', cache: true, cacheLabel: 'hot' }, gist: 'Cloud is **primary**. Only recently used blocks stay local.' }, { name: 'Stored volumes', line: 'gateway', fig: { dir: 'one', cache: true, cacheLabel: 'ALL' }, gist: 'On-prem is **primary** with the full dataset. Async snapshots to AWS.' }],
      rows: [['Deciding words', 'running out of on-prem storage, primary in AWS', 'low latency to the ENTIRE dataset, backup / DR in AWS'], ['Both give', 'iSCSI block volumes on-prem and EBS snapshots you can restore in AWS.']],
      check: { q: '“The SAN is 95% full. Keep recently used blocks fast on-prem.”', opts: ['Cached volumes', 'Stored volumes'], a: 0, why: 'Stored volumes keep everything on-prem — no space freed. Cached moves the primary copy to AWS.' } },
    { id: 'tape', short: 'Tape GW · S3', title: 'Tape Gateway vs S3 + lifecycle',
      sides: [{ name: 'Tape Gateway', line: 'gateway', fig: { dir: 'one', cache: true, cacheLabel: 'VTL' }, gist: 'Pretends to be a **tape library** for your backup software; archives tapes to Glacier / Deep Archive.' }, { name: 'S3 + lifecycle', fig: { dir: 'one' }, gist: 'Works only if your software can write to **S3**.' }],
      rows: [['Deciding words', 'tape, backup software, VTL, Veeam/NetBackup/Commvault', 'application already writes objects'], ['Tempting wrong', '—', 'picked because “S3 is cheapest” — but the backup app cannot talk to a bucket']],
      check: { q: '“Veeam writes to tape today. Keep backups 10 years, read once a year.”', opts: ['Tape Gateway → Deep Archive', 'S3 bucket with lifecycle to Glacier'], a: 0, why: 'The word tape plus existing backup software = Tape Gateway. Ten years, 1×/yr = Deep Archive.' } },
    { id: 'ds-dms', short: 'DataSync · DMS', title: 'DataSync vs DMS — files vs rows',
      sides: [{ name: 'DataSync', line: 'datasync', fig: { dir: 'one' }, gist: 'Copies **files**. Cannot read a database.' }, { name: 'DMS', line: 'dms', fig: { dir: 'one', keep: true }, gist: 'Copies **rows**: full load, then CDC while the source stays online.' }],
      rows: [['Deciding words', 'NAS, file share, NFS/SMB', 'MySQL, Oracle, PostgreSQL, ongoing changes, CDC'], ['Trap', 'An option can describe DMS’s capability (“full load and CDC”) on DataSync. Check the service, not the verbs.']],
      check: { q: '“Replicate an on-prem MySQL database to S3 as CSV, then stream ongoing changes.”', opts: ['DataSync', 'DMS full load + CDC'], a: 1, why: 'Source is a database engine and changes must keep flowing — DMS, which writes CSV (or Parquet) to S3.' } },
    { id: 'truck', short: 'Truck · Pipe · DX', title: 'DTT / Snow vs DataSync vs Direct Connect — the pipe rule',
      sides: [{ name: 'DTT / Snow', line: 'truck', fig: { dir: 'one', dash: true }, gist: 'One-off, and the pipe would take **weeks**.' }, { name: 'DataSync', line: 'datasync', fig: { dir: 'one' }, gist: 'The pipe **fits**, or the sync is **ongoing**.' }, { name: 'Direct Connect', fig: { dir: 'both' }, gist: 'A permanent private link. Weeks to provision, monthly bill.' }],
      rows: [['Use when', 'TB ÷ (TB/day) > deadline, one-off', 'fits the deadline, or ongoing', 'long-term hybrid traffic — never a one-off move'], ['Tempting wrong', '—', 'picked because it’s “accelerated” — it adds no bandwidth', 'picked because it’s “fast” — it isn’t ready in time']],
      check: { q: '“400 TB, 200 Mbps link, needed in AWS within 3 weeks, one time.”', opts: ['DataSync', 'Data Transfer Terminal', 'Direct Connect'], a: 1, why: '200 Mbps ≈ 2 TB/day → ~200 days. Only the truck makes 3 weeks; DX would not even be provisioned in time.' } },
    { id: 'ta-cf', short: 'TA · CloudFront', title: 'S3 Transfer Acceleration vs CloudFront vs DataSync',
      sides: [{ name: 'Transfer Acceleration', fig: { dir: 'one', left: 'USERS' }, gist: 'Many clients **uploading** to one bucket from far away, via edge locations.' }, { name: 'CloudFront', fig: { dir: 'one', left: 'AWS', right: 'USERS' }, gist: 'Many clients **downloading** the same objects; cached at the edge, signed URLs.' }, { name: 'DataSync', line: 'datasync', fig: { dir: 'one' }, gist: 'Your servers copying bulk data you own.' }],
      rows: [['Deciding words', 'upload, far from the Region, one bucket', 'download, repeatedly, cache, worldwide', 'migrate, sync, NAS'], ['Caches?', 'no', 'yes', 'no']],
      check: { q: '“Outposts servers worldwide repeatedly download the same update files from one bucket.”', opts: ['S3 Transfer Acceleration', 'CloudFront', 'Global Accelerator'], a: 1, why: 'Repeated downloads of the same files = cache at the edge. TA is for uploads; Global Accelerator is not an S3 cache.' } },
    { id: 'backup', short: 'Backup · DLM', title: 'AWS Backup vs Data Lifecycle Manager vs native backups',
      sides: [{ name: 'AWS Backup', fig: { dir: 'one', left: 'MANY', right: 'VAULT' }, gist: 'One place for many services. Plans, vaults, **Vault Lock**, **cross-Region and cross-account** copies, audit reports.' }, { name: 'DLM', fig: { dir: 'one', left: 'EBS', right: 'SNAPS' }, gist: '**EBS snapshots and AMIs only**. Policy-based, no extra cost, simplest.' }, { name: 'Native', fig: { dir: 'none', left: 'DB', right: 'SAME' }, gist: 'RDS automated backups, DynamoDB PITR / on-demand: same account, same Region.' }],
      rows: [['Deciding words', 'one place, many services, another account, compliance, cannot be deleted', 'EBS only, fastest, simplest', 'restore to a point in time, same account'], ['Tempting wrong', '—', 'picked for cross-account / RDS / EFS — it only does EBS', 'PITR or on-demand backups for “another account” — they cannot']],
      check: { q: '“Copy DynamoDB backups to another account for long-term retention.”', opts: ['DynamoDB PITR', 'DynamoDB on-demand backup', 'AWS Backup cross-account copy'], a: 2, why: 'Native DynamoDB backups cannot be copied to another account; AWS Backup can.' } }
  ],

  traps: [
    { title: 'Gateway for migration', x: 'Storage Gateway is a bridge. Data leaving on-prem for good goes by DataSync.', drills: ['D07', 'D10'] },
    { title: 'Direct Connect as a transfer service', x: 'Weeks to provision and a monthly bill. Never the answer to a one-off transfer.', drills: ['D02', 'D11', 'D14'] },
    { title: 'Transfer Acceleration for downloads', x: 'TA speeds uploads and caches nothing. Downloads → CloudFront.', drills: ['D17', 'D30'] },
    { title: 'EBS as shared storage', x: 'Multi-Attach is niche: io1/io2, same AZ, ≤16 Nitro instances, cluster-aware file system. “Many servers share files” → EFS / FSx.', drills: ['D22', 'D21'] },
    { title: 'EFS for Windows', x: 'EFS is NFS for Linux. “Windows” or “SMB” → FSx for Windows File Server.', drills: ['D21', 'D01'] },
    { title: 'Glacier without checking retrieval time', x: '“Minutes” rules out Deep Archive; “milliseconds” rules out Flexible Retrieval.', drills: ['D27', 'D28', 'D04'] },
    { title: 'IA before day 30', x: 'A lifecycle rule moving to Standard-IA at day 15 is invalid. Look for the 30.', drills: ['D04'] },
    { title: 'DLM vs AWS Backup', x: '“Cross-account”, “many services”, “compliance” → AWS Backup. “EBS only, fastest” → DLM.', drills: ['D09', 'D12', 'D05'] },
    { title: 'Replication is not retroactive', x: 'CRR needs versioning on both buckets and copies only new objects, unless you run S3 Batch Replication.', drills: ['D31'] },
    { title: 'Durable ≠ highly available', x: 'EBS is replicated inside one AZ. If the AZ is down, so is the volume.', drills: ['D36'] },
    { title: 'Encrypted snapshot sharing', x: 'Snapshots encrypted with the AWS managed key cannot be shared cross-account. Re-encrypt with a customer managed KMS key and share key + snapshot.', drills: ['D35'] },
    { title: 'EBS snapshots are not in a bucket you can see', x: 'No CRR, no Object Lock on “the snapshot bucket”. Copy snapshots, or use AWS Backup.', drills: ['D05', 'D09'] },
    { title: 'Service outside its job', x: 'An option that uses a service for something it was not built for (Transfer Family “moving ENIs”, Network Firewall “detaching interfaces”, Global Accelerator for single-Region downloads) is wrong whatever the rest says.', drills: ['D17', 'D30', 'D03'] },
    { title: 'Right capability, wrong service', x: '“DataSync full-load and CDC task” describes DMS on the wrong service. Check the service, not the verbs.', drills: ['D03', 'D15'] },
    { title: 'Old names in question banks', x: 'Snow Family and FSx File Gateway still appear as correct answers in practice exams even though new customers cannot get them. Snow = the truck line; FSx File Gateway = SMB cache in front of FSx for Windows.', drills: ['D01', 'D02'] }
  ],

  log: [
    { when: '2026-09-02', what: 'Baseline practice exam (Tutorials Dojo style), 65 Q', result: '29 wrong', lesson: 'Self-tagged 17 as “fact”; re-tagged only ~9 were facts. 6 keyword misses, 6 reasoning, 6 prestige distractors picked.' },
    { when: '2026-09-02', what: 'Session 1 quiz (Q1–Q6)', result: '2 / 6', lesson: 'Q2 and Q3 repeated exam misses (pipe rule, DataSync-vs-DMS) — the **habit** failed, not the knowledge. Fix: write the stub before reading options.' },
    { when: '2026-09-02', what: 'Session 1 retest (R1–R3)', result: '2 / 3', lesson: 'R1: TIME slot read as “ongoing” — “within a month / never edited” = one-off. Cross-outs should name the violated constraint, not “ops”.' }
  ]
});
