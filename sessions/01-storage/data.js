/* Session 1 — Storage & Data Movement.
   Pure data. See /README.md for the schema. Facts verified against AWS docs 2026-09-24. */
window.SESSION = {

  meta: {
    id: '01-storage',
    n: 1,
    title: 'Storage & Data Movement',
    brand: 'Storage Transit Map',
    subtitle: 'SAA-C03 · Session 1'
  },

  /* ---------------- transit lines ---------------- */
  lines: [
    {
      id: 'datasync', name: 'DataSync', color: 'ds', pattern: 'solid',
      verb: 'MOVES files over the network, then it’s done.',
      verbShort: 'moves files, then stops',
      builtFor: 'Bulk and scheduled copies of file or object data over a network you already have. Automatic encryption, integrity verification, bandwidth throttling.',
      examSays: ['migrate', 'sync', 'scheduled copy', 'archive to S3', 'within a month', 'verify every file'],
      from: 'NAS / SMB / HDFS / other cloud object storage',
      to: 'S3 (all classes except S3 Express One Zone) · EFS · FSx (Windows, Lustre, ONTAP, OpenZFS)',
      switchWhen: [
        { to: 'gateway', cond: 'on-prem apps must keep using the files afterwards' },
        { to: 'truck', cond: 'the copy would take weeks at current bandwidth and it is one-off' },
        { to: 'dms', cond: 'the source is a database engine, not a file share' },
        { to: 'transfer', cond: 'the other party owns one end and speaks SFTP/FTPS/FTP/AS2' }
      ]
    },
    {
      id: 'gateway', name: 'Storage Gateway', color: 'gw', pattern: 'solid',
      verb: 'BRIDGES — on-prem apps keep working, the cache stays local.',
      verbShort: 'bridges, apps keep working',
      builtFor: 'Hybrid access. Four types: S3 File Gateway (NFS/SMB → S3 objects), Amazon FSx File Gateway (SMB → FSx for Windows), Volume Gateway cached or stored (iSCSI block), Tape Gateway (virtual tape library).',
      examSays: ['keep accessing', 'low latency', 'hybrid', 'existing application', 'local cache', 'virtual tape'],
      from: 'on-prem apps (NFS · SMB · iSCSI · VTL)',
      to: 'S3 · FSx for Windows · EBS snapshots · virtual tapes in Glacier / Deep Archive',
      switchWhen: [
        { to: 'datasync', cond: 'the data is leaving on-prem for good — it is a migration' },
        { to: 'transfer', cond: 'the users are external partners, not your own applications' },
        { to: 'truck', cond: 'the first bulk load alone would take weeks' }
      ]
    },
    {
      id: 'transfer', name: 'Transfer Family', color: 'tf', pattern: 'solid',
      verb: 'OPENS a door for partners who speak SFTP / FTPS / FTP / AS2.',
      verbShort: 'opens a door for partners',
      builtFor: 'A managed endpoint so other organisations can keep their existing file-transfer tooling. Auth against Directory Service, custom identity providers or service-managed users. FTP is VPC-internal only.',
      examSays: ['suppliers', 'partners', 'cannot change their tooling', 'SFTP', 'AS2', 'EDI', 'decommission the FTP server'],
      from: 'external partners and their clients',
      to: 'S3 · EFS',
      switchWhen: [
        { to: 'datasync', cond: 'you own both ends and can run an agent' },
        { to: 'gateway', cond: 'your own on-prem applications need a mounted share' }
      ]
    },
    {
      id: 'truck', name: 'DTT / Snow', color: 'dtt', pattern: 'dashed',
      verb: 'DRIVES data by road when the pipe would take weeks.',
      verbShort: 'drives data by road',
      builtFor: 'One-off physical bulk import. Today: AWS Data Transfer Terminal — you take your own drives to a reservable AWS facility and push up to 100 Gbps into S3, EFS and other endpoints. Snowball Edge is legacy: existing customers only since 7 Nov 2025, support ends 31 Dec 2026.',
      examSays: ['would take weeks / months', 'one-time', 'hundreds of TB', 'limited bandwidth', 'fastest and most cost-effective'],
      from: 'portable drives at your site',
      to: 'S3 (bulk import) · EFS',
      switchWhen: [
        { to: 'datasync', cond: 'the transfer fits the pipe, or the sync is ongoing rather than one-off' },
        { to: 'gateway', cond: 'the requirement is continuing access, not a one-time move' }
      ]
    },
    {
      id: 'dms', name: 'DMS', color: 'dms', pattern: 'solid',
      verb: 'REPLICATES database rows — full load plus ongoing changes (CDC).',
      verbShort: 'replicates database rows',
      builtFor: 'Moving live databases with minimal downtime. Pair with SCT when the engine changes. Targets include RDS, Aurora, Redshift, and S3 as CSV or Parquet.',
      examSays: ['ongoing changes', 'minimal downtime', 'continuous replication', 'CDC', 'Oracle → Aurora PostgreSQL'],
      from: 'a database engine (Oracle, PostgreSQL, MySQL, SQL Server…)',
      to: 'RDS / Aurora · Redshift · S3 as CSV or Parquet',
      switchWhen: [
        { to: 'mgn', cond: 'the whole server has to move, not the rows' },
        { to: 'datasync', cond: 'it is files on a share, not rows in a database' }
      ]
    },
    {
      id: 'mgn', name: 'MGN', color: 'mgn', pattern: 'solid',
      verb: 'REHOSTS whole servers onto EC2.',
      verbShort: 'rehosts whole servers',
      builtFor: 'Lift-and-shift of physical, virtual or other-cloud servers. Block-level replication into a staging area, then cut over to EC2.',
      examSays: ['lift and shift', 'rehost', 'migrate servers as-is', 'no application changes'],
      from: 'physical servers · VMs · other clouds',
      to: 'EC2 instances',
      switchWhen: [
        { to: 'dms', cond: 'only the database has to land in a managed service' }
      ]
    }
  ],

  /* topics that are not transit lines but are used for drill filters and badges */
  topics: {
    backup:  { name: 'Backups & copies' },
    where:   { name: 'Where it lives' },
    classes: { name: 'S3 classes' },
    edge:    { name: 'Upload & download' }
  },

  /* ---------------- map ---------------- */
  map: {
    viewBox: '0 0 1000 744',
    items: [
      { type: 'zone', x: 0, y: 0, w: 300, h: 744, fill: 'zone-onprem' },
      { type: 'zone', x: 700, y: 0, w: 300, h: 744, fill: 'zone-aws' },
      { type: 'text', x: 20,  y: 34, cls: 'mzone', text: 'ON-PREMISES' },
      { type: 'text', x: 500, y: 34, cls: 'mzone', anchor: 'middle', text: 'THE PIPE' },
      { type: 'text', x: 500, y: 52, cls: 'msub', anchor: 'middle', fill: 'ink2', text: 'internet · VPN · Direct Connect' },
      { type: 'text', x: 720, y: 34, cls: 'mzone', text: 'AWS' },
      { type: 'text', x: 500, y: 728, cls: 'mfoot', anchor: 'middle', text: '1 Gbps ≈ 10 TB/day · 100 Mbps ≈ 1 TB/day' },

      /* ---- DataSync ---- */
      { type: 'path', line: 'datasync', d: 'M250 110 H470 L510 150 H742' },
      { type: 'label', line: 'datasync', x: 276, y: 96, text: 'DATASYNC — network mover',
        sub: { x: 530, y: 138, text: '→ S3 (most classes) · EFS · FSx' } },

      /* ---- Storage Gateway ---- */
      { type: 'path', line: 'gateway', d: 'M250 200 H285 L318 236' },
      { type: 'path', line: 'gateway', d: 'M250 290 H285 L318 254' },
      { type: 'box',  line: 'gateway', x: 318, y: 228, w: 60, h: 34, rx: 6, text: 'GW', lines: ['gateway'] },
      { type: 'path', line: 'gateway', d: 'M378 245 H742' },
      { type: 'label', line: 'gateway', x: 420, y: 233, color: 'gw-text', text: 'STORAGE GATEWAY — bridge + cache' },

      /* ---- Transfer Family ---- */
      { type: 'path', line: 'transfer', d: 'M250 380 H560 L640 300 H742' },
      { type: 'path', line: 'transfer', d: 'M560 380 H600 L640 340 H742' },
      { type: 'label', line: 'transfer', x: 300, y: 368, text: 'TRANSFER FAMILY — partner door' },

      /* ---- DMS ---- */
      { type: 'path', line: 'dms', d: 'M250 470 H560 L610 520 H742' },
      { type: 'label', line: 'dms', x: 300, y: 458, text: 'DMS — rows, full load + CDC' },

      /* ---- MGN ---- */
      { type: 'path', line: 'mgn', d: 'M250 560 H560 L610 610 H742' },
      { type: 'label', line: 'mgn', x: 300, y: 548, text: 'MGN — whole servers' },

      /* ---- DTT / Snow ---- */
      { type: 'path', line: 'truck', d: 'M250 650 H440 L480 690 H742', dash: '14 10' },
      { type: 'station', line: 'truck', shape: 'square', x: 580, y: 690, w: 26, h: 26 },
      { type: 'text', x: 580, y: 668, cls: 'msub', anchor: 'middle', fill: 'ink2', text: 'DTT facility / Snow device' },
      { type: 'label', line: 'truck', x: 300, y: 638, text: 'DTT / SNOW — data by road' },

      /* ---- source stations ---- */
      { type: 'station', x: 250, y: 110, tx: 232, anchor: 'end', name: 'NAS', sub: 'NFS / SMB files to move', lines: ['datasync'] },
      { type: 'station', x: 250, y: 200, tx: 232, anchor: 'end', name: 'Apps that keep running', sub: 'NFS / SMB / iSCSI', lines: ['gateway'] },
      { type: 'station', x: 250, y: 290, tx: 232, anchor: 'end', name: 'Tape backup app', sub: 'Veeam, NetBackup…', lines: ['gateway'] },
      { type: 'station', x: 250, y: 380, tx: 232, anchor: 'end', name: 'External partners', sub: 'SFTP / FTPS / FTP / AS2', lines: ['transfer'] },
      { type: 'station', x: 250, y: 470, tx: 232, anchor: 'end', name: 'Database', sub: 'Oracle, PostgreSQL, MySQL', lines: ['dms'] },
      { type: 'station', x: 250, y: 560, tx: 232, anchor: 'end', name: 'Servers / VMs', sub: 'lift-and-shift', lines: ['mgn'] },
      { type: 'station', x: 250, y: 650, tx: 232, anchor: 'end', name: 'Portable drives', sub: '100s of TB, thin pipe', lines: ['truck'] },

      /* ---- AWS side ---- */
      { type: 'pill', x: 742, y: 128, w: 28, h: 184, rx: 14, fill: 'surface' },
      { type: 'path', d: 'M770 150 H830 V240', w: 3, stroke: 'ink' },
      { type: 'station', x: 830, y: 150, r: 6 },
      { type: 'station', x: 830, y: 195, r: 6 },
      { type: 'station', x: 830, y: 240, r: 6 },
      { type: 'text', x: 844, y: 155, cls: 'mstat2', text: 'Standard-IA · 30 d' },
      { type: 'text', x: 844, y: 200, cls: 'mstat2', text: 'Glacier · 90 d' },
      { type: 'text', x: 844, y: 245, cls: 'mstat2', text: 'Deep Archive · 180 d' },
      { type: 'text', x: 784, y: 286, cls: 'mbig', fill: 'ink', text: 'S3' },
      { type: 'text', x: 784, y: 304, cls: 'msub', fill: 'ink2', text: 'lifecycle →' },

      { type: 'station', x: 756, y: 340, lines: ['datasync', 'transfer'] },
      { type: 'text', x: 776, y: 345, cls: 'mstat', text: 'EFS · Linux NFS' },
      { type: 'station', x: 756, y: 520, lines: ['dms'] },
      { type: 'text', x: 776, y: 518, cls: 'mstat', text: 'RDS / Aurora' },
      { type: 'text', x: 776, y: 534, cls: 'mstat2', text: 'or S3 as CSV / Parquet' },
      { type: 'station', x: 756, y: 610, lines: ['mgn'] },
      { type: 'text', x: 776, y: 615, cls: 'mstat', text: 'EC2 · rehosted' },
      { type: 'station', x: 756, y: 690, lines: ['truck'] },
      { type: 'text', x: 776, y: 695, cls: 'mstat', text: 'S3 · bulk import' }
    ]
  },

  /* ---------------- drill stub vocabulary ---------------- */
  stubChoices: {
    size:  ['fits the pipe', 'weeks+ online', 'not about transfer'],
    time:  ['one-off', 'ongoing'],
    proto: ['NFS/SMB', 'iSCSI/block', 'tape', 'SFTP/FTP/AS2', 'database', 'servers', 'objects/HTTP', 'AWS-internal'],
    sup:   ['cheapest', 'least ops', 'fastest', 'most durable/compliant', 'none stated']
  },

  method: [
    'Strip the story. Keep DATA nouns and MOVE / STORE / ACCESS verbs.',
    'Fill the stub: SIZE/NET · TIME · PROTOCOL/APP · SUPERLATIVE.',
    'For EACH option: “what problem was this service BUILT for?” No match → cross out.',
    'Among survivors, the one that satisfies the SUPERLATIVE wins.'
  ],

  /* ---------------- decision stepper ---------------- */
  tree: {
    root: 'q1',
    nodes: {
      q1: {
        q: 'What does the application expect?',
        options: [
          { label: 'A disk — boot volume, database files, "block"', next: 'q_disk' },
          { label: 'A shared folder — mounted by many instances', next: 'q_folder' },
          { label: 'Objects over HTTP — backups, media, data lake, static site', next: 'r_s3' }
        ]
      },
      q_disk: {
        q: 'Must the data survive stop / terminate?',
        options: [
          { label: 'Yes — it is the system of record', next: 'q_disk_what' },
          { label: 'No — temporary scratch, fastest possible, loss is OK', next: 'r_instore' }
        ]
      },
      q_disk_what: {
        q: 'What matters most?',
        options: [
          { label: 'General purpose, cost-effective', next: 'r_gp3' },
          { label: 'Highest IOPS, lowest latency, mission-critical database', next: 'r_io2' },
          { label: 'Big sequential throughput — logs, big data', next: 'r_st1' },
          { label: 'Coldest, cheapest, rarely read', next: 'r_sc1' }
        ]
      },
      q_folder: {
        q: 'Which OS, or which special need?',
        options: [
          { label: 'Linux / NFS / thousands of instances / multi-AZ', next: 'r_efs' },
          { label: 'Windows / SMB / Active Directory / DFS', next: 'r_fsxw' },
          { label: 'HPC / ML — process S3 data at high throughput', next: 'r_lustre' },
          { label: 'NetApp / SnapMirror / NFS + SMB + iSCSI on one file system', next: 'r_ontap' },
          { label: 'ZFS, or the lowest-latency NFS', next: 'r_zfs' }
        ]
      },

      r_gp3: { result: {
        service: 'Amazon EBS gp3',
        why: 'The default block volume: baseline 3,000 IOPS and 125 MiB/s included at every size, scalable to 80,000 IOPS and 2,000 MiB/s, and you set IOPS and throughput independently of capacity.',
        facts: ['ebs'],
        neighbours: [
          { svc: 'gp2', why: 'IOPS are welded to size (3 per GiB) and it costs more for the same performance. gp3 replaces it.' },
          { svc: 'io2 Block Express', why: 'You only pay for it when you genuinely need sustained sub-millisecond latency or more than 80,000 IOPS.' },
          { svc: 'Instance store', why: 'Faster, but the data is gone when the instance stops.' }
        ]
      } },
      r_io2: { result: {
        service: 'Amazon EBS io2 Block Express',
        why: 'Up to 256,000 IOPS and 4,000 MiB/s per volume, 64 TiB, 99.999% durability, average latency under 500 microseconds. This is the mission-critical-database answer.',
        facts: ['ebs'],
        neighbours: [
          { svc: 'gp3', why: 'Tops out at 80,000 IOPS and 2,000 MiB/s and does not promise sustained sub-millisecond latency.' },
          { svc: 'st1', why: 'HDD — built for throughput, only 500 IOPS.' },
          { svc: 'Instance store', why: 'Fast but ephemeral; never the system of record.' }
        ]
      } },
      r_st1: { result: {
        service: 'Amazon EBS st1 (Throughput Optimized HDD)',
        why: 'Cheap HDD tuned for large sequential reads and writes: up to 500 MiB/s, only 500 IOPS. Logs, data warehouses, big-data scans.',
        facts: ['ebs'],
        neighbours: [
          { svc: 'sc1', why: 'Colder and cheaper still, but only 250 MiB/s and 250 IOPS — for data you rarely touch.' },
          { svc: 'gp3', why: 'SSD; you pay for IOPS a sequential workload will not use.' },
          { svc: 'st1 / sc1 as a boot volume', why: 'Not possible — HDD volumes cannot boot an instance.' }
        ]
      } },
      r_sc1: { result: {
        service: 'Amazon EBS sc1 (Cold HDD)',
        why: 'The cheapest EBS volume: up to 250 MiB/s and 250 IOPS. For data that must sit on a disk but is read rarely.',
        facts: ['ebs'],
        neighbours: [
          { svc: 'st1', why: 'Twice the throughput — pick it the moment the workload is actually scanned regularly.' },
          { svc: 'S3 Glacier classes', why: 'Far cheaper for cold data, but it is object storage, not a mounted disk.' }
        ]
      } },
      r_instore: { result: {
        service: 'EC2 instance store',
        why: 'Physically attached NVMe or SSD: the lowest latency available, and the cheapest because it is included in the instance price. Data is lost on stop, hibernate, terminate or host failure.',
        facts: ['instore'],
        neighbours: [
          { svc: 'EBS io2', why: 'Survives stop/terminate — but you are paying for durability a scratch workload throws away.' },
          { svc: 'EFS', why: 'Network file system: more latency, more cost, and scratch data does not need sharing.' }
        ]
      } },
      r_efs: { result: {
        service: 'Amazon EFS',
        why: 'Elastic NFS for Linux: POSIX permissions, thousands of concurrent clients, Regional (multi-AZ) or One Zone, and it grows and shrinks on its own.',
        facts: ['efs'],
        neighbours: [
          { svc: 'FSx for Windows', why: 'That is SMB with AD ACLs. EFS speaks NFS only — "Windows" or "SMB" in the stem rules EFS out.' },
          { svc: 'EBS Multi-Attach', why: 'Same AZ only, io1/io2 only, 16 instances maximum, and it needs a cluster-aware file system. Not general shared storage.' },
          { svc: 'FSx for Lustre', why: 'Better when the requirement is HPC throughput against data in S3.' }
        ]
      } },
      r_fsxw: { result: {
        service: 'Amazon FSx for Windows File Server',
        why: 'Fully managed Windows file shares: SMB, Active Directory integration and NTFS ACLs, DFS namespaces, quotas, shadow copies, optional Multi-AZ.',
        facts: ['fsx'],
        neighbours: [
          { svc: 'EFS', why: 'NFS/Linux — it cannot carry AD ACLs or serve SMB.' },
          { svc: 'FSx for NetApp ONTAP', why: 'Also serves SMB, but you pick it for multi-protocol or SnapMirror, not for plain Windows shares.' },
          { svc: 'S3 File Gateway', why: 'A hybrid bridge for on-prem apps, not a file system for EC2.' }
        ]
      } },
      r_lustre: { result: {
        service: 'Amazon FSx for Lustre',
        why: 'The HPC parallel file system. Link it to an S3 bucket and objects appear as files (lazy-loaded on first read, results written back). Scratch for short jobs, Persistent for durability.',
        facts: ['fsx'],
        neighbours: [
          { svc: 'EFS', why: 'General-purpose NFS; it is not throughput-optimised for HPC and needs a separate copy of the S3 data.' },
          { svc: 'S3 alone', why: 'Fine if the app can use the S3 API — Lustre is the answer when it cannot be rewritten.' },
          { svc: 'FSx for ONTAP', why: 'Enterprise NAS features a compute cluster does not use.' }
        ]
      } },
      r_ontap: { result: {
        service: 'Amazon FSx for NetApp ONTAP',
        why: 'ONTAP as a managed service: NFS, SMB and iSCSI from the same volumes, snapshots, SnapMirror replication from on-prem NetApp, deduplication and compression.',
        facts: ['fsx'],
        neighbours: [
          { svc: 'FSx for Windows', why: 'SMB only, and no SnapMirror.' },
          { svc: 'EFS', why: 'NFS only.' },
          { svc: 'FSx for OpenZFS', why: 'ZFS, not ONTAP — no SnapMirror, no multi-protocol.' }
        ]
      } },
      r_zfs: { result: {
        service: 'Amazon FSx for OpenZFS',
        why: 'The word "ZFS" in a question is the whole signal. Managed OpenZFS with snapshots, clones and very low-latency NFS.',
        facts: ['fsx'],
        neighbours: [
          { svc: 'EFS', why: 'No ZFS semantics — no snapshots, clones or ZFS tooling.' },
          { svc: 'FSx for ONTAP', why: 'Pick ONTAP for SnapMirror or multi-protocol, OpenZFS for ZFS itself.' }
        ]
      } },
      r_s3: { result: {
        service: 'Amazon S3',
        why: 'Objects over HTTP, eleven nines of durability, no capacity to manage. The real question then becomes which class.',
        facts: ['s3'],
        link: { text: 'Pick a class →', tab: 'classes' },
        neighbours: [
          { svc: 'EBS / EFS / FSx', why: 'Needed only when the application demands a block device or a POSIX/SMB mount.' },
          { svc: 'S3 Express One Zone', why: 'One AZ, single-digit-ms latency, highest price per GB — only for very high request rates.' }
        ]
      } }
    }
  },

  /* ---------------- fact cards ---------------- */
  facts: {
    ebs: { title: 'EBS — what the exam tests', bullets: [
      'AZ-scoped: a volume attaches only to instances in its own Availability Zone. To change AZ or Region: snapshot → copy → create a new volume.',
      'One instance at a time, except Multi-Attach on io1/io2: same AZ, Nitro instances, up to 16 of them, needs a cluster-aware file system. Windows supports Multi-Attach on io2 only; Multi-Attach volumes cannot be boot volumes.',
      'Snapshots are incremental and live in S3 storage you cannot see — there is no bucket to replicate with CRR or lock with Object Lock.',
      'You cannot encrypt an existing unencrypted volume in place: snapshot → copy the snapshot with encryption → create a volume → swap it in.',
      'A root volume has DeleteOnTermination true by default.',
      'Fast Snapshot Restore removes first-read latency on volumes created from a snapshot.',
      'Elastic Volumes change size, type, IOPS and throughput live, with no downtime.',
      'Replicated within one AZ only. Durable is not the same as highly available — lose the AZ and you lose access to the volume.',
      'Ceilings: gp3 up to 80,000 IOPS / 2,000 MiB/s, 1 GiB–64 TiB. io2 Block Express up to 256,000 IOPS / 4,000 MiB/s, 4 GiB–64 TiB, 99.999% durability. st1 500 MiB/s / 500 IOPS, sc1 250 MiB/s / 250 IOPS, neither can boot.'
    ] },
    instore: { title: 'Instance store — what the exam tests', bullets: [
      'Physically attached to the host: the lowest latency and highest raw IOPS available to the instance.',
      'Ephemeral. Data is lost on stop, hibernate, terminate, or if the underlying host fails. A reboot keeps it.',
      'No charge beyond the instance itself, and no snapshots — you cannot back it up as a volume.',
      'Correct answer when the stem says temporary, scratch, cache, buffer, or "loss is acceptable".'
    ] },
    efs: { title: 'EFS — what the exam tests', bullets: [
      'NFS v4, Linux, POSIX permissions. There is no SMB and no Windows support.',
      'Regional (multi-AZ) or One Zone. Storage classes Standard, Infrequent Access and Archive, moved by lifecycle policy.',
      'You pay per GB actually stored — there is no size to provision and no volume to grow.',
      'Throughput modes: Elastic (the default and the recommendation), Provisioned, Bursting.',
      'Performance modes: General Purpose (default). Max I/O is a previous-generation mode with higher per-operation latency and is not supported with Elastic throughput — AWS now recommends General Purpose for everything.',
      'Mount targets are ENIs in your subnets: they have security groups, and NFS needs TCP port 2049.'
    ] },
    fsx: { title: 'The four FSx file systems', bullets: [
      'FSx for Windows File Server — SMB, Active Directory, NTFS ACLs, DFS namespaces, user quotas, shadow copies, Single-AZ or Multi-AZ.',
      'FSx for Lustre — HPC and ML. Scratch (no replication, cheapest, for short jobs) or Persistent (replicated, for long-lived). Links to an S3 bucket: objects appear as files, lazy-loaded, results exported back.',
      'FSx for NetApp ONTAP — NFS, SMB and iSCSI from one file system, snapshots, SnapMirror from on-prem NetApp, dedup and compression.',
      'FSx for OpenZFS — the ZFS answer: snapshots, clones, very low-latency NFS.',
      'Amazon FSx File Gateway is the on-prem cache in front of FSx for Windows — it is a Storage Gateway type, not a file system.'
    ] },
    s3: { title: 'S3 — what the exam tests', bullets: [
      'Objects from 0 bytes to 5 TB. Multipart upload is recommended above 100 MB and required above 5 GB.',
      'Strong read-after-write consistency for PUTs and DELETEs, at no cost and with no changes needed.',
      'Versioning, and MFA Delete on top of it. Object Lock gives WORM: governance mode (a privileged user can bypass) or compliance mode (nobody, including the root user, can delete before the retention period ends). Object Lock requires versioning.',
      'Transfer Acceleration routes uploads in over the CloudFront edge network. It accelerates uploads and caches nothing.',
      'Event notifications to SQS, SNS, Lambda or EventBridge. Batch Operations for bulk work across billions of objects. Access Points for per-application policies.',
      'Cross-Region Replication needs versioning on both buckets and replicates only new objects — existing ones need S3 Batch Replication.'
    ] }
  },

  /* ---------------- S3 class picker ----------------
     Verified 2026-09-24 against the AWS "Comparing the Amazon S3 storage classes"
     table and the archive-retrieval-options page. */
  classes: {
    accessOptions: [
      { v: 'frequent',  label: 'frequent' },
      { v: 'unknown',   label: 'unknown / changing' },
      { v: 'monthly',   label: 'monthly-ish' },
      { v: 'quarterly', label: 'quarterly' },
      { v: 'yearly',    label: '1–2× per year' },
      { v: 'audit',     label: 'never unless audit' }
    ],
    retrievalOptions: [
      { v: 'ms',      label: 'milliseconds' },
      { v: 'minutes', label: 'minutes' },
      { v: 'hours',   label: 'hours' },
      { v: 'h12',     label: '≤ 12 h' },
      { v: 'h48',     label: '≤ 48 h' }
    ],
    retentionOptions: [
      { v: 7, label: '7 d' }, { v: 30, label: '30 d' }, { v: 90, label: '90 d' },
      { v: 365, label: '1 y' }, { v: 2555, label: '7 y' }, { v: 3650, label: '10 y' }
    ],
    rows: [
      { id: 'standard', name: 'S3 Standard', azs: '≥3', minDays: 0, retrievalRank: 0,
        retrieval: 'ms', examSays: 'default, frequent',
        cost: 7, accessMin: 0, accessMax: 0,
        winBecause: 'Read this often, retrieval fees and minimum durations cost more than Standard’s higher per-GB price. No minimum duration, no retrieval fee.' },
      { id: 'intelligent', name: 'S3 Intelligent-Tiering', azs: '≥3', minDays: 0, retrievalRank: 0,
        retrieval: 'ms (opt-in archive tiers: minutes–hours)', examSays: 'unknown / changing access, least ops',
        cost: 6, accessMin: 0, accessMax: 5, forUnknown: true, lifecycleTarget: true,
        winBecause: 'The only class that moves objects between tiers for you. No retrieval fees; a small monthly monitoring and automation fee per object (objects under 128 KB are not monitored and stay in the Frequent Access tier).' },
      { id: 'standard-ia', name: 'S3 Standard-IA', azs: '≥3', minDays: 30, retrievalRank: 0,
        retrieval: 'ms, per-GB retrieval fee', examSays: 'infrequent but instant',
        cost: 5, accessMin: 2, accessMax: 2, lifecycleTarget: true,
        winBecause: 'Infrequent access that still has to be instant, on a primary copy you could not re-create. 30-day minimum, 128 KB minimum billable object size.' },
      { id: 'onezone-ia', name: 'S3 One Zone-IA', azs: '1', minDays: 30, retrievalRank: 0, singleAZ: true,
        retrieval: 'ms, per-GB retrieval fee', examSays: 're-creatable / secondary copy, cheapest instant',
        cost: 4, accessMin: 2, accessMax: 3, lifecycleTarget: true,
        winBecause: 'The cheapest millisecond-access class — correct precisely because you said the data can be re-created if the Availability Zone is lost.' },
      { id: 'glacier-ir', name: 'S3 Glacier Instant Retrieval', azs: '≥3', minDays: 90, retrievalRank: 0,
        retrieval: 'ms, per-GB retrieval fee', examSays: '~quarterly access, still needs ms',
        cost: 3, accessMin: 3, accessMax: 4, lifecycleTarget: true,
        winBecause: 'Archive pricing with millisecond reads. The answer whenever a stem pairs "rarely" with "milliseconds". 90-day minimum.' },
      { id: 'glacier-fr', name: 'S3 Glacier Flexible Retrieval', azs: '≥3', minDays: 90, retrievalRank: 1,
        retrieval: 'Expedited 1–5 min · Standard 3–5 h · Bulk 5–12 h (Bulk is free)',
        examSays: 'archive, minutes–hours OK',
        cost: 2, accessMin: 4, accessMax: 5, lifecycleTarget: true,
        winBecause: 'The cheapest class that can still produce an object in minutes — Expedited retrieval, typically 1–5 minutes for objects under 250 MB. 90-day minimum.' },
      { id: 'deep-archive', name: 'S3 Glacier Deep Archive', azs: '≥3', minDays: 180, retrievalRank: 3,
        retrieval: 'Standard within 12 h · Bulk within 48 h', examSays: '7–10 yrs, 1–2×/yr, cheapest',
        cost: 1, accessMin: 4, accessMax: 5, lifecycleTarget: true,
        winBecause: 'The cheapest storage AWS sells. Half a day is fast enough for you, so nothing warmer is worth paying for. 180-day minimum.' },
      { id: 'express-onezone', name: 'S3 Express One Zone', azs: '1', minDays: 0, retrievalRank: 0, singleAZ: true,
        retrieval: 'single-digit ms', examSays: 'ML/analytics, very high request rates',
        cost: 9, accessMin: 0, accessMax: 0,
        nicheOnly: 'it is the highest-priced class per GB and lives in one AZ — you take it for single-digit-ms latency and 50% cheaper requests at very high request rates, not to save storage cost' }
    ],
    rules: [
      '30 / 90 / 180 = Standard-IA / Glacier (Instant and Flexible) / Deep Archive minimum storage durations.',
      'Instant = milliseconds · Flexible = minutes to hours · Deep Archive = half a day. "Minutes" rules out Deep Archive; "milliseconds" rules out Flexible.',
      'Only One Zone-IA and Express One Zone live in a single Availability Zone. Everything else is ≥3 AZs.',
      'Standard, Intelligent-Tiering and Express One Zone have no minimum storage duration. S3 Express One Zone has none either — do not confuse it with the archive classes.',
      'Standard-IA, One Zone-IA and Glacier Instant Retrieval bill a minimum of 128 KB per object.',
      'Lifecycle rules can also expire noncurrent versions and abort incomplete multipart uploads — both are silent cost traps.'
    ]
  },

  /* ---------------- compare pairs ---------------- */
  pairs: [
    {
      id: 'p1', short: 'DataSync vs S3 File Gateway', title: 'DataSync vs S3 File Gateway — mover vs bridge',
      a: { name: 'AWS DataSync', color: 'ds',
        mini: { left: 'On-prem NAS', right: 'S3', dir: 'one', note: 'one way — then the job ends' },
        job: 'Copy the data into AWS once, or on a schedule, and finish.',
        words: 'migrate · archive to · within a month · scheduled copy · retire the NAS',
        lands: 'S3 (all classes except S3 Express One Zone), EFS, any FSx.',
        tempting: 'Storage Gateway — it also gets files to S3, but it is a bridge, not a mover.' },
      b: { name: 'S3 File Gateway', color: 'gw',
        mini: { left: 'On-prem apps', right: 'S3', dir: 'both', cache: true, note: 'apps stay, hot data cached locally' },
        job: 'Let existing on-prem applications keep reading and writing files, with S3 behind them.',
        words: 'keep accessing · low latency · hybrid · existing application · local cache',
        lands: 'S3 objects, presented on-prem as NFS or SMB.',
        tempting: 'DataSync — but once its task finishes nothing on-prem can reach the files as files.' },
      both: 'Yes, and that is a favourite two-answer question: DataSync to migrate the bulk, then S3 File Gateway for the subset that on-prem apps still need.',
      check: {
        q: 'Free up on-prem space; the history is read-only and will never be needed on-prem again.',
        options: [
          { label: 'AWS DataSync', ok: true, why: 'Data leaves for good and nothing on-prem needs it — a mover, not a bridge.' },
          { label: 'S3 File Gateway', ok: false, why: 'You would keep paying for a gateway nobody reads from.' }
        ],
        explain: 'No continuing on-prem access requirement means no bridge. DataSync.'
      }
    },
    {
      id: 'p2', short: 'DataSync vs Transfer Family', title: 'DataSync vs Transfer Family — who owns the other end?',
      a: { name: 'AWS DataSync', color: 'ds',
        mini: { left: 'Your NAS', right: 'S3 / EFS / FSx', dir: 'one', note: 'you run an agent at both ends' },
        job: 'You control both ends, so you can install an agent and schedule a task.',
        words: 'our file server · our NAS · our other cloud bucket · scheduled',
        lands: 'S3, EFS, FSx.',
        tempting: 'Transfer Family — unnecessary when nobody external is involved.' },
      b: { name: 'AWS Transfer Family', color: 'tf',
        mini: { left: 'Partners', right: 'S3 / EFS', dir: 'one', note: 'they keep their own client' },
        job: 'Someone else owns one end and speaks SFTP, FTPS, FTP or AS2. Give them a managed endpoint.',
        words: 'suppliers · partners · cannot change their tooling · SFTP · AS2 · EDI',
        lands: 'S3 or EFS, with auth via Directory Service, a custom IdP or service-managed users.',
        tempting: 'An SFTP server on EC2 in an Auto Scaling group — same function, far more operations.' },
      both: 'Rarely together. The deciding question is simply whether you can put software on the other end.',
      check: {
        q: '300 suppliers upload via FTP and cannot change their tooling.',
        options: [
          { label: 'AWS Transfer Family', ok: true, why: 'A managed protocol endpoint is exactly the product for an external party you cannot change.' },
          { label: 'AWS DataSync', ok: false, why: 'Suppliers will not install and run your agent.' },
          { label: 'FTP on EC2 behind an NLB', ok: false, why: 'It works and it is the wrong answer: you now own patching, scaling and availability.' }
        ],
        explain: '"Cannot change their tooling" plus a named protocol is always Transfer Family.'
      }
    },
    {
      id: 'p3', short: 'Volume Gateway cached vs stored', title: 'Volume Gateway — cached vs stored',
      a: { name: 'Cached volumes', color: 'gw',
        mini: { left: 'On-prem', right: 'S3 (primary)', dir: 'both', cache: true, note: 'cloud is primary, hot subset local' },
        job: 'Primary data lives in AWS; only the recently used blocks stay on-prem.',
        words: 'running out of on-prem storage · SAN is full · primary data in AWS · keep recent blocks fast',
        lands: 'S3, with EBS snapshots you can restore in AWS.',
        tempting: 'Stored volumes — which would not free a single byte on-prem.' },
      b: { name: 'Stored volumes', color: 'gw',
        mini: { left: 'On-prem (primary)', right: 'S3 snapshots', dir: 'one', note: 'full dataset local, async backup up' },
        job: 'Primary data stays on-prem for low latency to everything; point-in-time snapshots go to AWS asynchronously.',
        words: 'entire dataset · low latency to all of it · backup / DR to the cloud',
        lands: 'EBS snapshots in AWS, restorable as EBS volumes.',
        tempting: 'Cached volumes — which only keep a hot subset local, so cold reads go over the network.' },
      both: 'Both are iSCSI block and both produce EBS snapshots you can use in AWS. The question is which copy is authoritative.',
      check: {
        q: 'The SAN is 95% full; keep recently used blocks fast.',
        options: [
          { label: 'Cached volumes', ok: true, why: '"Running out of space" means the primary copy has to move to AWS — only cached does that.' },
          { label: 'Stored volumes', ok: false, why: 'Keeps the full dataset on-prem, so the SAN is still 95% full.' }
        ],
        explain: 'Cached frees capacity. Stored does not.'
      }
    },
    {
      id: 'p4', short: 'Tape Gateway vs S3 + lifecycle', title: 'Tape Gateway vs S3 + lifecycle',
      a: { name: 'Tape Gateway', color: 'gw',
        mini: { left: 'Backup software', right: 'Glacier / Deep Archive', dir: 'one', note: 'presents a virtual tape library' },
        job: 'The backup application can only write to a tape library. Tape Gateway presents a VTL over iSCSI and archives the virtual tapes.',
        words: 'tape · tape library · Veeam / NetBackup · VTL · replace the tape infrastructure',
        lands: 'Virtual tapes in S3, archived to S3 Glacier Flexible Retrieval or S3 Glacier Deep Archive.',
        tempting: 'S3 with a lifecycle rule — but the backup software cannot write to a bucket.' },
      b: { name: 'S3 + lifecycle',
        mini: { left: 'Any S3 client', right: 'S3 → Glacier', dir: 'one', note: 'needs software that speaks S3' },
        job: 'Whatever is writing already speaks the S3 API; lifecycle rules then move objects to colder classes.',
        words: 'objects · our application uploads · data lake · lifecycle',
        lands: 'S3, transitioned by rule.',
        tempting: 'Tape Gateway — pointless overhead when nothing needs a tape interface.' },
      both: 'No. The tape interface is either required or it is not, and the stem always says.',
      check: {
        q: 'Veeam writes to tape today; the company must keep backups for 10 years.',
        options: [
          { label: 'Tape Gateway archiving to S3 Glacier Deep Archive', ok: true, why: 'Keeps the backup software unchanged and lands the tapes in the cheapest archive.' },
          { label: 'S3 with a lifecycle rule to Deep Archive', ok: false, why: 'Veeam is writing tapes, not S3 objects.' }
        ],
        explain: 'Existing backup software plus "tape" is Tape Gateway, every time. Ten years read rarely is Deep Archive.'
      }
    },
    {
      id: 'p5', short: 'DataSync vs DMS', title: 'DataSync vs DMS — files or rows?',
      a: { name: 'AWS DataSync', color: 'ds',
        mini: { left: 'File share', right: 'S3 / EFS / FSx', dir: 'one', note: 'files and objects only' },
        job: 'Move files and objects. It has no idea what a table is.',
        words: 'NFS · SMB · HDFS · bucket · files · folders',
        lands: 'S3, EFS, FSx.',
        tempting: '"DataSync full-load and CDC task" — the right capability bolted onto the wrong service.' },
      b: { name: 'AWS DMS', color: 'dms',
        mini: { left: 'Database engine', right: 'RDS / Aurora / S3', dir: 'one', note: 'full load + ongoing CDC' },
        job: 'Read a database engine and replicate it: a full load, then ongoing changes.',
        words: 'Oracle · PostgreSQL · MySQL · ongoing changes · minimal downtime · CDC',
        lands: 'RDS, Aurora, Redshift, or S3 as CSV or Parquet.',
        tempting: 'DataSync, because the target happens to be S3. The source decides, not the target.' },
      both: 'No. If the source is a database engine it is DMS, even when the target is an S3 bucket full of Parquet.',
      check: {
        q: 'Replicate on-prem MySQL changes continuously to S3 as CSV.',
        options: [
          { label: 'DMS full load + CDC with an S3 target', ok: true, why: 'Only DMS can read the engine and keep streaming changes.' },
          { label: 'DataSync on a schedule', ok: false, why: 'DataSync cannot read a database at all.' }
        ],
        explain: 'Look at the source. A database engine plus "ongoing changes" is DMS full load + CDC.'
      }
    },
    {
      id: 'p6', short: 'Truck vs the pipe', title: 'DTT / Snow vs DataSync vs Direct Connect — the pipe rule',
      a: { name: 'DTT / Snow (by road)', color: 'dtt',
        mini: { left: 'Your drives', right: 'S3', dir: 'one', dashed: true, note: 'weeks online → drive it instead' },
        job: 'A one-off bulk import that the network would take weeks or months to finish.',
        words: 'would take months · hundreds of TB · one-time · limited bandwidth · fastest and most cost-effective',
        lands: 'S3 and other AWS endpoints, at up to 100 Gbps inside the facility.',
        tempting: 'Direct Connect, which takes weeks to provision and then bills monthly forever.' },
      b: { name: 'DataSync over the pipe', color: 'ds',
        mini: { left: 'Your NAS', right: 'S3 / EFS / FSx', dir: 'one', note: 'fits the pipe, or it is ongoing' },
        job: 'The maths fits, or the requirement is a repeating sync. Trucks cannot do ongoing.',
        words: 'existing 1 Gbps / 10 Gbps link · weekly sync · ongoing · throttle in business hours',
        lands: 'S3, EFS, FSx.',
        tempting: 'A truck, because the number of terabytes sounds big. Do the division first.' },
      both: 'Yes: drive the bulk in once, then run DataSync for the delta. But never Direct Connect for a one-off — provisioning alone takes weeks.',
      check: {
        q: '400 TB, 200 Mbps, needed in three weeks.',
        options: [
          { label: 'AWS Data Transfer Terminal', ok: true, why: '200 Mbps ≈ 2 TB/day, so 400 TB is about 200 days. The network cannot do it.' },
          { label: 'DataSync over the existing link', ok: false, why: 'Same arithmetic — DataSync creates no bandwidth.' },
          { label: 'Provision Direct Connect', ok: false, why: 'Weeks to provision, monthly commitment, and still slower than a van for a one-off.' }
        ],
        explain: '100 Mbps ≈ 1 TB/day, 1 Gbps ≈ 10 TB/day. Divide before you choose.'
      }
    },
    {
      id: 'p7', short: 'Upload vs download', title: 'Transfer Acceleration vs CloudFront vs DataSync',
      a: { name: 'S3 Transfer Acceleration',
        mini: { left: 'Clients far away', right: 'One bucket', dir: 'one', note: 'UPLOAD in over the edge' },
        job: 'Many clients far from the Region uploading into one bucket. Traffic enters at an edge location and rides the AWS backbone.',
        words: 'upload · large files · users worldwide · slow from Asia · minimal changes',
        lands: 'The same bucket, through its accelerated endpoint.',
        tempting: 'CloudFront — which is built for the opposite direction.' },
      b: { name: 'Amazon CloudFront',
        mini: { left: 'Origin bucket', right: 'Viewers worldwide', dir: 'one', cache: true, note: 'DOWNLOAD, cached at the edge' },
        job: 'Many clients downloading the same objects. The edge caches them, so the second request never reaches the Region.',
        words: 'download · repeatedly · the same files · cache · signed URLs · worldwide',
        lands: 'Edge caches in front of the S3 origin, locked down with OAC and signed URLs.',
        tempting: 'Transfer Acceleration for downloads — it caches nothing and is not a CDN.' },
      both: 'They are different directions of travel, and DataSync is neither: it is a server-to-storage bulk copy, not a client accelerator.',
      check: {
        q: 'Outposts servers worldwide repeatedly download the same update files from one bucket.',
        options: [
          { label: 'CloudFront with the bucket as origin', ok: true, why: '"Repeatedly download the same files" is a cache-hit story.' },
          { label: 'S3 Transfer Acceleration', ok: false, why: 'Accelerates uploads and caches nothing.' },
          { label: 'DataSync to each site', ok: false, why: 'A bulk copy tool, not a distribution network.' }
        ],
        explain: 'Download plus repeatedly plus worldwide is CloudFront. Upload plus far away is Transfer Acceleration.'
      }
    },
    {
      id: 'p8', short: 'AWS Backup vs DLM', title: 'AWS Backup vs Data Lifecycle Manager vs native backups',
      a: { name: 'Amazon Data Lifecycle Manager', color: 'dtt',
        mini: { left: 'EBS volumes', right: 'Snapshots / AMIs', dir: 'one', note: 'EBS and AMIs only' },
        job: 'Schedule EBS snapshots and AMIs with retention, and optionally copy them cross-Region. Nothing to set up.',
        words: 'EBS volumes · snapshots · as soon as possible · simplest · automate',
        lands: 'EBS snapshots and AMIs, in the same account.',
        tempting: 'AWS Backup — correct but heavier when the scope really is only EBS.' },
      b: { name: 'AWS Backup',
        mini: { left: 'Many services', right: 'Vaults (x-acct, x-Region)', dir: 'one', note: 'one policy, one place' },
        job: 'One policy across EC2/EBS, RDS, Aurora, DynamoDB, EFS, all four FSx, Storage Gateway volumes, S3, DocumentDB, Neptune, Redshift, Timestream, EKS, SAP HANA, CloudFormation and VMware Cloud on AWS. Vault Lock gives WORM; copies go cross-Region and cross-account; Backup Audit Manager reports.',
        words: 'one place · another account · central policy · auditors · cannot be deleted even by admins',
        lands: 'Backup vaults, in any Region and any account in your organisation.',
        tempting: 'DLM, which cannot touch RDS or EFS and cannot copy cross-account.' },
      both: 'Do not run both over the same EBS volumes — you pay twice. Native DynamoDB on-demand backups and PITR, and RDS automated backups, stay in the same account and Region, which is why cross-account questions land on AWS Backup.',
      check: {
        q: 'Copy DynamoDB backups to another account for long-term retention.',
        options: [
          { label: 'AWS Backup with a cross-account copy', ok: true, why: 'The only one of the three that copies backups into another account.' },
          { label: 'DynamoDB on-demand backups / PITR', ok: false, why: 'Native DynamoDB backups are same-account, same-Region.' },
          { label: 'Data Lifecycle Manager', ok: false, why: 'EBS snapshots and AMIs only — it has never seen a DynamoDB table.' }
        ],
        explain: '"Another account" or two or more services in one policy is AWS Backup.'
      }
    }
  ],

  /* ---------------- trigger cards (Leitner) ---------------- */
  cards: [
    { id: 'c01', line: 'datasync', front: 'on-prem NFS / SMB, and the verb is migrate, copy or sync over the network', service: 'AWS DataSync', why: 'A network mover: it copies files or objects and the task ends.', tempting: { answer: 'Storage Gateway', why: 'a bridge for continuing access, not a mover.' } },
    { id: 'c02', line: 'datasync', front: 'another cloud (Azure Blob, Azure Files, Google Cloud Storage) → S3', service: 'AWS DataSync', why: 'It has built-in locations for the other clouds’ object and file services.', tempting: { answer: 'Transfer Family', why: 'Azure is not an SFTP client.' } },
    { id: 'c03', line: 'gateway', front: 'on-prem apps keep using files with low latency, S3 behind them', service: 'S3 File Gateway', why: 'NFS/SMB on-prem, objects in S3, hot data cached locally.', tempting: { answer: 'DataSync', why: 'when its task ends nothing on-prem can reach the files as files.' } },
    { id: 'c04', line: 'gateway', front: 'Windows shares, SMB, Active Directory, on-prem cache of a cloud file system', service: 'Amazon FSx File Gateway', why: 'The SMB cache in front of FSx for Windows File Server.', tempting: { answer: 'S3 File Gateway', why: 'objects in S3 do not carry NTFS/AD ACLs the same way.' } },
    { id: 'c05', line: 'gateway', front: 'iSCSI, the SAN is running out of space, keep hot data local', service: 'Volume Gateway — cached volumes', why: 'Primary copy moves to AWS, only recent blocks stay on-prem, so capacity is actually freed.', tempting: { answer: 'stored volumes', why: 'they keep the whole dataset on-prem.' } },
    { id: 'c06', line: 'gateway', front: 'iSCSI, need the whole dataset local, async backup to AWS', service: 'Volume Gateway — stored volumes', why: 'On-prem stays primary; snapshots go to AWS and restore as EBS volumes.', tempting: { answer: 'cached volumes', why: 'only a hot subset would be local.' } },
    { id: 'c07', line: 'gateway', mine: true, front: 'tape, backup software, virtual tape library', service: 'Tape Gateway → S3 Glacier Deep Archive', why: 'Presents a VTL over iSCSI so the backup software is unchanged, then archives the tapes.', tempting: { answer: 'S3 + lifecycle', why: 'the backup software cannot write to a bucket.' } },
    { id: 'c08', line: 'transfer', front: 'partners upload via SFTP / FTPS / FTP / AS2 and cannot change their tooling', service: 'AWS Transfer Family', why: 'A managed protocol endpoint in front of S3 or EFS.', tempting: { answer: 'SFTP on EC2', why: 'same function, all the operations.' } },
    { id: 'c09', line: 'truck', mine: true, front: 'hundreds of TB, would take weeks at current bandwidth, one-off', service: 'AWS Data Transfer Terminal (older question banks: Snow Family)', why: 'Take your drives to an AWS facility and push them in at up to 100 Gbps.', tempting: { answer: 'Direct Connect', why: 'weeks to provision and a monthly bill, for a single job.' } },
    { id: 'c10', line: 'truck', mine: true, front: 'limited bandwidth but the sync is ONGOING', service: 'DataSync with bandwidth throttling', why: 'Schedule it and cap the throughput during business hours.', tempting: { answer: 'Snow / DTT', why: 'a van cannot do "ongoing".' } },
    { id: 'c11', line: 'dms', mine: true, front: 'a database engine, ongoing replication, change data capture', service: 'AWS DMS — full load + CDC', why: 'Full load first, then stream ongoing changes until cutover.', tempting: { answer: 'DataSync', why: 'it cannot read a database.' } },
    { id: 'c12', line: 'dms', front: 'a different database engine (Oracle → Aurora PostgreSQL)', service: 'SCT for the schema + DMS for the data', why: 'The Schema Conversion Tool converts objects and code; DMS moves the rows.', tempting: { answer: 'DMS alone', why: 'it will not convert an incompatible schema for you.' } },
    { id: 'c13', line: 'mgn', front: 'lift-and-shift servers or VMs onto EC2', service: 'AWS Application Migration Service (MGN)', why: 'Block-level replication of whole servers into a staging area, then cut over.', tempting: { answer: 'DMS', why: 'that moves databases, not servers.' } },
    { id: 'c14', line: 'edge', mine: true, front: 'global users UPLOAD large files to one bucket', service: 'S3 Transfer Acceleration', why: 'Uploads enter at an edge location and travel the AWS backbone.', tempting: { answer: 'CloudFront', why: 'built for downloads and it caches nothing on upload.' } },
    { id: 'c15', line: 'edge', mine: true, front: 'global users DOWNLOAD the same files, cache them, signed URLs', service: 'Amazon CloudFront', why: 'Edge caching plus signed URLs and OAC in front of the bucket.', tempting: { answer: 'Transfer Acceleration', why: 'wrong direction, no cache.' } },
    { id: 'c16', line: 'backup', mine: true, front: 'copy backups to another account or Region, one central policy, several services', service: 'AWS Backup', why: 'Backup plans, vaults, cross-Region and cross-account copies, Backup Audit Manager.', tempting: { answer: 'Data Lifecycle Manager', why: 'EBS and AMIs only, and no cross-account copy.' } },
    { id: 'c17', line: 'backup', front: 'automate EBS snapshots, simplest possible, EBS only', service: 'Amazon Data Lifecycle Manager', why: 'Policy-driven snapshots and AMIs with retention, nothing to deploy.', tempting: { answer: 'AWS Backup (overkill) or a cron job calling the CLI', why: 'one is more than asked for, the other is custom code.' } },
    { id: 'c18', line: 'backup', front: 'backups must be undeletable even by administrators', service: 'AWS Backup Vault Lock in compliance mode', why: 'Once locked, nobody — including the account root and AWS — can shorten retention or delete recovery points.', tempting: { answer: 'an IAM deny policy', why: 'an administrator can edit the policy.' } },
    { id: 'c19', line: 'classes', front: 'objects must be WORM for N years, even root cannot delete them', service: 'S3 Object Lock in compliance mode (versioning enabled)', why: 'Compliance mode cannot be bypassed by anyone for the retention period.', tempting: { answer: 'governance mode', why: 'a user with the bypass permission can delete.' } },
    { id: 'c20', line: 'backup', front: 'replicate new objects to another Region automatically', service: 'S3 Cross-Region Replication', why: 'Needs versioning on both buckets and a replication role.', tempting: { answer: 'DataSync', why: 'it works, but CRR is the purpose-built continuous answer.' } },
    { id: 'c21', line: 'backup', front: 'CRR is enabled but the existing objects never copied', service: 'S3 Batch Replication', why: 'Replication applies to new objects; Batch Replication back-fills what was already there.', tempting: { answer: 'disable and re-enable versioning', why: 'that triggers nothing.' } },
    { id: 'c22', line: 'where', front: 'thousands of Linux instances share files across Availability Zones', service: 'Amazon EFS', why: 'Regional NFS, multi-AZ, thousands of concurrent clients, grows on its own.', tempting: { answer: 'EBS Multi-Attach', why: 'one AZ, io1/io2 only, 16 instances, cluster file system required.' } },
    { id: 'c23', line: 'where', front: 'Windows .NET app, SMB shares, Active Directory ACLs', service: 'Amazon FSx for Windows File Server', why: 'Native SMB with AD integration and NTFS permissions.', tempting: { answer: 'EFS', why: 'NFS and Linux only.' } },
    { id: 'c24', line: 'where', front: 'HPC / ML / genomics — process S3 data at high throughput', service: 'Amazon FSx for Lustre, linked to the bucket', why: 'Objects appear as files, lazy-loaded on first read, results exported back to S3.', tempting: { answer: 'EFS', why: 'not HPC-optimised and it needs a separate copy of the data.' } },
    { id: 'c25', line: 'where', front: 'NetApp, SnapMirror, NFS + SMB + iSCSI on one file system', service: 'Amazon FSx for NetApp ONTAP', why: 'ONTAP as a managed service, multi-protocol, SnapMirror from on-prem.', tempting: { answer: 'FSx for Windows', why: 'SMB only, no SnapMirror.' } },
    { id: 'c26', line: 'where', front: 'the word ZFS', service: 'Amazon FSx for OpenZFS', why: 'The word is the whole signal.', tempting: { answer: 'EFS', why: 'no ZFS snapshots or clones.' } },
    { id: 'c27', line: 'classes', mine: true, front: 'unknown or changing access pattern, no retrieval fees, least ops', service: 'S3 Intelligent-Tiering', why: 'It moves each object between tiers for you and charges no retrieval fee.', tempting: { answer: 'Standard-IA', why: 'retrieval fees, and wrong the moment the data turns hot again.' } },
    { id: 'c28', line: 'classes', front: 're-creatable data, infrequent, must be instant, cheapest', service: 'S3 One Zone-IA', why: 'The cheapest millisecond class — you accepted the single-AZ risk by saying you can re-create it.', tempting: { answer: 'Standard-IA', why: 'paying for three AZs on data you would just regenerate.' } },
    { id: 'c29', line: 'classes', mine: true, front: 'retain 7–10 years, read once or twice a year, up to 12 hours is fine', service: 'S3 Glacier Deep Archive', why: 'Cheapest storage AWS sells; Standard retrieval completes within 12 hours.', tempting: { answer: 'Glacier Flexible Retrieval', why: 'you would pay more for speed the requirement never asked for.' } },
    { id: 'c30', line: 'classes', front: 'archive, but occasionally needed within minutes', service: 'S3 Glacier Flexible Retrieval (Expedited)', why: 'Expedited retrieval is typically 1–5 minutes for objects under 250 MB.', tempting: { answer: 'Deep Archive', why: 'its fastest option is still within 12 hours.' } },
    { id: 'c31', line: 'classes', front: 'archive accessed about quarterly, but it must come back in milliseconds', service: 'S3 Glacier Instant Retrieval', why: 'Archive pricing with millisecond reads. 90-day minimum.', tempting: { answer: 'Standard-IA', why: 'more storage cost than quarterly access justifies.' } },
    { id: 'c32', line: 'classes', front: 'single-digit ms object latency at a very high request rate', service: 'S3 Express One Zone', why: 'Purpose-built for latency-sensitive analytics and ML; requests cost about half of Standard.', tempting: { answer: 'S3 Standard', why: 'higher latency — but note Express is one AZ and the priciest per GB.' } },
    { id: 'c33', line: 'where', front: 'boot volume or general EC2 disk, cost-effective', service: 'EBS gp3', why: 'Baseline 3,000 IOPS and 125 MiB/s at any size; IOPS and throughput priced separately from capacity.', tempting: { answer: 'gp2', why: 'IOPS tied to size and more expensive for the same performance.' } },
    { id: 'c34', line: 'where', front: 'mission-critical DB on EC2, highest IOPS, sub-millisecond latency', service: 'EBS io2 Block Express', why: 'Up to 256,000 IOPS and 4,000 MiB/s, 99.999% durability, average latency under 500 microseconds.', tempting: { answer: 'gp3', why: 'tops out at 80,000 IOPS and makes no sustained sub-ms promise.' } },
    { id: 'c35', line: 'where', front: 'big sequential reads (logs, big data), cheap', service: 'EBS st1', why: 'HDD tuned for throughput: up to 500 MiB/s, only 500 IOPS.', tempting: { answer: 'sc1', why: 'colder and half the throughput — right only if the data is rarely read.' } },
    { id: 'c36', line: 'where', front: 'temporary scratch, fastest disk, loss is acceptable', service: 'EC2 instance store', why: 'Physically attached, lowest latency, included in the instance price.', tempting: { answer: 'EBS', why: 'paying for durability the workload throws away.' } },
    { id: 'c37', line: 'where', front: 'encrypt an existing unencrypted EBS volume', service: 'Snapshot → copy the snapshot with encryption → new volume → swap it in', why: 'Encryption is set at creation; the copy step is where you turn it on.', tempting: { answer: '"enable encryption on the volume"', why: 'not possible in place.' } },
    { id: 'c38', line: 'backup', front: 'share an encrypted snapshot with another account', service: 'Re-encrypt with a customer managed KMS key, then share the key and the snapshot', why: 'The grantee needs access to the key as well as the snapshot.', tempting: { answer: 'the AWS managed key', why: 'its policy cannot be edited, so it can never be shared.' } },
    { id: 'c39', line: 'where', front: 'an EBS volume is needed in another Availability Zone', service: 'Snapshot → create a volume from it in the target AZ', why: 'EBS is AZ-scoped; the snapshot is the only way across.', tempting: { answer: 'detach and attach it directly', why: 'the API will refuse — different AZ.' } },
    { id: 'c40', line: 'backup', front: 'where do EBS snapshots actually live?', service: 'In S3 storage you cannot see — there is no bucket in your account', why: 'So there is nothing to replicate with CRR and nothing to lock with Object Lock.', tempting: { answer: '"the snapshot bucket"', why: 'it does not exist in your account.' } },
    { id: 'c41', line: 'where', front: 'how does an RDS Multi-AZ failover actually happen?', service: 'The DNS CNAME for the endpoint flips to the standby', why: 'Same endpoint name, new address — which is why long DNS caching in a client delays recovery.', tempting: { answer: 'the IP address moves', why: 'it does not; the name is repointed.' } },
    { id: 'c42', line: 'backup', front: '"one place" to manage backups of EC2 + RDS + EFS', service: 'AWS Backup', why: 'One backup plan across services, with vaults, cross-account copies and audit reports.', tempting: { answer: 'Data Lifecycle Manager', why: 'it cannot see RDS or EFS at all.' } },
    { id: 'c43', line: 'classes', front: 'incomplete multipart uploads are silently costing money', service: 'A lifecycle rule with AbortIncompleteMultipartUpload', why: 'Orphaned parts are billed as storage but never appear as objects.', tempting: { answer: 'deleting bucket versions', why: 'parts are not versions.' } },
    { id: 'c44', line: 'classes', mine: true, front: 'lifecycle transition to Standard-IA at day 15', service: 'Invalid — Standard-IA needs at least 30 days in a warmer class first', why: 'The 30-day minimum is a hard lifecycle validation, not just a billing rule.', tempting: { answer: '"valid"', why: '30 / 90 / 180 are the numbers to memorise.' } },
    { id: 'c45', line: 'truck', mine: true, front: 'can a new customer order AWS Snow Family today?', service: 'No. Snowball Edge has been existing-customers-only since 7 November 2025 and support ends 31 December 2026. Offline bulk import is AWS Data Transfer Terminal.', why: 'Old question banks still say Snowball; new ones say Data Transfer Terminal. Same trigger words.', tempting: { answer: 'Snowball Edge', why: 'right trigger, retired product — an answer set will contain one or the other, never both.' } },
    { id: 'c46', line: 'truck', front: 'the pipe rule', service: '100 Mbps ≈ 1 TB/day · 1 Gbps ≈ 10 TB/day', why: 'Divide the terabytes by the daily rate before you pick anything.', tempting: { answer: 'guessing from how big the number sounds', why: '50 TB over 1 Gbps is five days, not a truck job.' } },
    { id: 'c47', line: 'datasync', mine: true, front: 'which S3 storage classes can DataSync write to directly?', service: 'All of them except S3 Express One Zone — including S3 Glacier Flexible Retrieval and S3 Glacier Deep Archive', why: 'So you never need to land in Standard and wait for a lifecycle rule. Objects under 40 KB are placed in S3 Standard when the target is a Glacier archive class.', tempting: { answer: '"Standard only, then lifecycle"', why: 'that pays Standard rates for nothing.' } },
    { id: 'c48', line: 'where', front: 'NFS on Windows?', service: 'No — EFS is Linux/NFS; Windows and SMB mean FSx for Windows File Server', why: 'The word "Windows" or "SMB" eliminates EFS on sight.', tempting: { answer: 'EFS', why: 'it has no SMB endpoint.' } },
    { id: 'c49', line: 'gateway', front: 'how many Storage Gateway types are there, and what are they?', service: 'Four: S3 File Gateway, Amazon FSx File Gateway, Volume Gateway (cached or stored), Tape Gateway', why: 'Every gateway question is really asking which of these four interfaces the on-prem application needs.', tempting: { answer: 'inventing a "database gateway" or an "EBS gateway"', why: 'neither exists.' } }
  ],

  /* ---------------- drill bank (41 scenarios) ---------------- */
  drills: [
    { id: 'D01', ref: 'quiz Q1', line: 'gateway',
      text: 'A company runs a Windows CAD application on-premises. Designers open large files from a local SMB share all day; 40 TB and growing. The company wants the authoritative copy in AWS, LAN-speed access for designers, and existing Active Directory permissions. LEAST operational overhead?',
      options: [
        { id: 'a', label: 'Migrate the share to EFS with DataSync; mount EFS from on-prem over VPN.', ok: false, rk: 'proto', why: 'EFS is NFS/Linux, not SMB/AD; VPN latency kills "LAN speed".' },
        { id: 'b', label: 'Deploy Amazon FSx File Gateway on-premises backed by FSx for Windows File Server.', ok: true, why: 'SMB and AD are preserved, the authoritative copy is in AWS, and the gateway caches hot files locally.' },
        { id: 'c', label: 'Deploy S3 File Gateway; designers access via NFS.', ok: false, rk: 'proto', why: 'Windows/SMB/AD users; NFS and S3 objects do not carry AD ACLs the same way.' },
        { id: 'd', label: 'Transfer Family SFTP for upload/download.', ok: false, rk: 'job', why: 'A partner door, not a mounted share.' }
      ],
      stub: { size: 'any', time: 'ongoing', proto: 'NFS/SMB', sup: 'least ops' },
      deciding: ['Windows', 'SMB', 'Active Directory', 'open large files'],
      explain: 'Ongoing SMB access with AD ACLs and a cloud-authoritative copy is exactly Amazon FSx File Gateway in front of FSx for Windows File Server.' },

    { id: 'D02', ref: 'quiz Q2', mine: true, line: 'truck', tag: 'K',
      text: 'A research lab must upload 600 TB from portable drives at a remote field station with a 50 Mbps satellite link. The data is needed in S3 within three weeks, one time only. Fastest and most cost-effective?',
      options: [
        { id: 'a', label: 'DataSync agent at the station, throttling off.', ok: false, rk: 'size', why: '50 Mbps ≈ 0.5 TB/day → roughly 1,200 days.' },
        { id: 'b', label: 'Provision 1 Gbps Direct Connect to the station.', ok: false, rk: 'time', why: 'Weeks to provision and a monthly cost, for a one-off job.' },
        { id: 'c', label: 'Bring the drives to an AWS Data Transfer Terminal and upload to S3.', ok: true, why: 'A one-off bulk import that the network cannot finish in the window — drive it instead.' },
        { id: 'd', label: 'S3 Transfer Acceleration + multipart.', ok: false, rk: 'size', why: 'Optimises the use of bandwidth; it creates none.' }
      ],
      stub: { size: 'weeks+ online', time: 'one-off', proto: 'any', sup: 'fastest' },
      deciding: ['600 TB', '50 Mbps', 'three weeks', 'one time only'],
      explain: 'Fill the SIZE slot first: 600 TB at 0.5 TB/day is years. Once the pipe is out, a one-off physical import is the only candidate left.' },

    { id: 'D03', ref: 'quiz Q3', mine: true, line: 'dms', multi: true,
      text: 'On-prem PostgreSQL must move to Aurora PostgreSQL with under one hour of downtime. After cutover, nightly Parquet exports of the same data to S3 are required. (Select TWO.)',
      options: [
        { id: 'a', label: 'DataSync full-load and CDC task from PostgreSQL to Aurora.', ok: false, rk: 'job', why: 'DataSync moves files; it cannot read a database. Right capability, wrong service.' },
        { id: 'b', label: 'DMS full-load plus CDC task PostgreSQL → Aurora.', ok: true, why: 'Full load then ongoing changes is what keeps the cutover window under an hour.' },
        { id: 'c', label: 'MGN to replicate the DB server, then cut over.', ok: false, rk: 'job', why: 'Rehosts a server on EC2, not into Aurora.' },
        { id: 'd', label: 'DMS task with S3 target, Parquet output.', ok: true, why: 'DMS writes S3 targets as CSV or Parquet — the nightly export requirement.' },
        { id: 'e', label: 'Global Accelerator in front of Aurora.', ok: false, rk: 'job', why: 'Prestige distractor; nothing to do with replication.' }
      ],
      stub: { size: 'any', time: 'ongoing', proto: 'database', sup: 'none stated' },
      deciding: ['PostgreSQL', 'under one hour of downtime', 'Parquet'],
      explain: 'Two requirements, two DMS tasks. "Under one hour of downtime" forces CDC; "Parquet" is the S3 target.' },

    { id: 'D04', ref: 'quiz Q4', mine: true, line: 'classes',
      text: 'Logs land in S3 at 2 TB/day. They are queried heavily for 7 days, occasionally during the following 60 days, must be retrievable within 12 hours for audits for 5 years, then deleted. Lowest cost?',
      options: [
        { id: 'a', label: 'Standard → Standard-IA day 7 → Deep Archive day 67 → expire 5 y.', ok: false, rk: 'false', why: 'Invalid: Standard-IA needs at least 30 days first.' },
        { id: 'b', label: 'Standard → Standard-IA day 30 → Deep Archive day 90 → expire 5 y.', ok: true, why: 'Respects both minimums, keeps the occasional reads instant, then drops to the cheapest class for the audit tail.' },
        { id: 'c', label: 'Standard → Glacier Flexible day 7 → expire 5 y.', ok: false, rk: 'sup', why: 'The occasional reads until about day 67 would pay retrieval fees and waits; 12 hours fits Deep Archive, which is cheaper than Flexible.' },
        { id: 'd', label: 'Intelligent-Tiering 5 y.', ok: false, rk: 'sup', why: 'A monitoring fee per object for an access pattern that is completely known.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'objects/HTTP', sup: 'cheapest' },
      deciding: ['occasionally during the following 60 days', 'within 12 hours', 'Lowest cost'],
      explain: '30 / 90 / 180 decides this one. Day 7 to IA is simply not a legal transition.' },

    { id: 'D05', ref: 'quiz Q5', mine: true, line: 'backup',
      text: 'A 3 TB EBS volume in us-east-1a holds a licensing database. The regulator requires an encrypted copy of every daily backup in a separate account in a different Region, kept 7 years, impossible to delete early even by administrators.',
      options: [
        { id: 'a', label: 'DLM daily snapshots, share with the other account.', ok: false, rk: 'job', why: 'Sharing is not a locked copy, and DLM has no retention lock.' },
        { id: 'b', label: 'AWS Backup plan copying to a vault in the other account + Region; Backup Vault Lock in compliance mode.', ok: true, why: 'Cross-account plus cross-Region plus WORM retention is the exact set of things only AWS Backup does.' },
        { id: 'c', label: 'EBS Multi-Attach to an instance in the other account via peering.', ok: false, rk: 'false', why: 'Same AZ, same account — and it is not a backup.' },
        { id: 'd', label: 'S3 CRR with Object Lock on the bucket holding the snapshots.', ok: false, rk: 'false', why: 'EBS snapshots are not in a bucket you can see.' }
      ],
      stub: { size: 'any', time: 'ongoing', proto: 'AWS-internal', sup: 'most durable/compliant' },
      deciding: ['separate account', 'different Region', 'impossible to delete early even by administrators'],
      explain: '"Another account" plus "even administrators cannot delete" is AWS Backup with Vault Lock in compliance mode.' },

    { id: 'D06', ref: 'quiz Q6', line: 'where',
      text: '400 render nodes read a 200 TB dataset in S3 and the job is I/O bound. The pipeline is moving to EC2 and needs sub-millisecond file access without rewriting the application to the S3 API.',
      options: [
        { id: 'a', label: 'EFS Max I/O, synced from S3 with DataSync.', ok: false, rk: 'sup', why: 'An extra copy plus a sync job, and it is not the HPC-optimised choice. Max I/O is also a previous-generation performance mode with higher per-operation latency.' },
        { id: 'b', label: 'FSx for Lustre linked to the S3 bucket.', ok: true, why: 'The parallel file system for HPC, and the S3 link means objects appear as files with no rewrite and no separate copy.' },
        { id: 'c', label: 'FSx for Windows + DFS.', ok: false, rk: 'proto', why: 'Linux render nodes; that is an SMB/Windows file system.' },
        { id: 'd', label: 'S3 Express One Zone through Volume Gateway.', ok: false, rk: 'false', why: 'Volume Gateway is on-prem iSCSI — a nonsense combination.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'NFS/SMB', sup: 'fastest' },
      deciding: ['sub-millisecond', 'I/O bound', 'without rewriting'],
      explain: 'High throughput against data that already lives in S3, from Linux, with no rewrite: FSx for Lustre linked to the bucket.' },

    { id: 'D07', ref: 'retest R1', mine: true, line: 'datasync', tag: 'R',
      text: 'A law firm keeps 120 TB of scanned files on an NFS NAS behind a 1 Gbps link that is 70% busy in business hours. Files older than two years are never edited and must be off the NAS within a month; the lawyers’ access to recent files must not change. MOST cost-effective?',
      options: [
        { id: 'a', label: 'DTT reservation, ship the NAS.', ok: false, rk: 'size', why: '120 TB is about 12 days at 1 Gbps — it fits the pipe.' },
        { id: 'b', label: 'DataSync agent; scheduled task filtered to files older than 2 years, straight to Glacier Deep Archive, throttled in business hours.', ok: true, why: 'Fits the window, writes directly to the cheapest class, and bandwidth throttling protects the working day.' },
        { id: 'c', label: 'S3 File Gateway; migrate old files through it; lifecycle to Deep Archive after 180 days.', ok: false, rk: 'job', why: 'A bridge, not a mover — and it parks 120 TB in Standard for 180 days.' },
        { id: 'd', label: 'Direct Connect + DataSync to Standard-IA.', ok: false, rk: 'sup', why: 'Direct Connect for a one-off, and IA is dearer than Deep Archive for data never read.' }
      ],
      stub: { size: 'fits the pipe', time: 'one-off', proto: 'NFS/SMB', sup: 'cheapest' },
      deciding: ['within a month', 'never edited', '1 Gbps'],
      explain: 'Do the division: 120 TB over 1 Gbps is 12 days. The recent files never move, so nothing needs a bridge — only the old ones leave, and they leave straight into Deep Archive.' },

    { id: 'D08', ref: 'retest R2', line: 'transfer',
      text: '300 suppliers deliver daily files to an on-prem FTP server and several cannot change their tooling. Files must land in S3, the server must be decommissioned, and supplier credentials live in an existing Microsoft AD. LEAST ops?',
      options: [
        { id: 'a', label: 'FTP on an EC2 Auto Scaling group writing to S3, Lambda authorizer for AD.', ok: false, rk: 'sup', why: 'Self-managed servers — the opposite of least operational overhead.' },
        { id: 'b', label: 'Transfer Family FTP/FTPS endpoint in the VPC, S3 backend, AWS Directory Service auth.', ok: true, why: 'Managed endpoint, protocol unchanged for suppliers, AD-backed auth, and the old server goes away.' },
        { id: 'c', label: 'DataSync agent on the FTP server, hourly to S3, keep the server.', ok: false, rk: 'job', why: 'Keeps the very server they want decommissioned.' },
        { id: 'd', label: 'S3 File Gateway, suppliers use NFS over client VPN.', ok: false, rk: 'proto', why: 'NFS is not FTP, and the suppliers cannot change tooling.' }
      ],
      stub: { size: 'any', time: 'ongoing', proto: 'SFTP/FTP/AS2', sup: 'least ops' },
      deciding: ['cannot change their tooling', 'FTP', 'decommissioned'],
      explain: 'External party plus a named protocol plus "least ops" is Transfer Family. Plain FTP endpoints are VPC-internal only, which is why the answer says "in the VPC".' },

    { id: 'D09', ref: 'retest R3', line: 'backup',
      text: 'Oracle runs on EC2 with a 2 TB io2 volume in eu-west-1. The company needs a nightly application-consistent backup restorable in eu-central-1 within 4 hours, and retention for this volume, its RDS instances and its EFS file systems managed in one place.',
      options: [
        { id: 'a', label: 'DLM nightly snapshots copied to eu-central-1.', ok: false, rk: 'job', why: 'EBS and AMIs only — it fails "RDS and EFS in one place".' },
        { id: 'b', label: 'AWS Backup plan covering EC2, RDS, EFS with cross-Region copy.', ok: true, why: 'One plan, three services, cross-Region copy — the literal requirement.' },
        { id: 'c', label: 'S3 CRR on the bucket storing the snapshots.', ok: false, rk: 'false', why: 'There is no visible snapshot bucket.' },
        { id: 'd', label: 'DataSync nightly copy of the volume’s files to EFS in eu-central-1.', ok: false, rk: 'job', why: 'Copying live database files is not an application-consistent backup, and it is not "one place".' }
      ],
      stub: { size: 'any', time: 'ongoing', proto: 'AWS-internal', sup: 'none stated' },
      deciding: ['one place', 'RDS', 'EFS'],
      explain: '"One place" plus two or more services is always AWS Backup. DLM only ever sees EBS.' },

    { id: 'D10', ref: 'exam Q8', mine: true, line: 'datasync',
      text: 'On-prem storage holds both historical records and active data; the active data grows fast and capacity is nearly exhausted. The company wants to move the historical records to AWS. Best for cost and operational management?',
      options: [
        { id: 'a', label: 'DataSync → S3 Standard; lifecycle to Deep Archive after 30 days.', ok: false, rk: 'sup', why: 'Pays Standard rates for 30 days for no reason.' },
        { id: 'b', label: 'Storage Gateway → Glacier; lifecycle Standard → Deep Archive after 30 days.', ok: false, rk: 'job', why: 'A bridge, not a mover — and the same needless 30 days in Standard.' },
        { id: 'c', label: 'DataSync → S3 Glacier Deep Archive directly.', ok: true, why: 'DataSync writes directly into the archive classes, so nothing sits in Standard at all.' },
        { id: 'd', label: 'Storage Gateway → Deep Archive.', ok: false, rk: 'job', why: 'A bridge, not a mover.' }
      ],
      stub: { size: 'fits the pipe', time: 'one-off', proto: 'NFS/SMB', sup: 'cheapest' },
      deciding: ['move the historical records', 'capacity is nearly exhausted'],
      explain: 'Two traps in one question: Gateway-for-migration, and the belief that you must land in Standard first. DataSync writes straight to Deep Archive.' },

    { id: 'D11', ref: 'exam Q12', mine: true, line: 'truck',
      text: 'A company must move an 80 TB data warehouse to the cloud. At current bandwidth the transfer would take 2 months. Most cost-effective way to upload it quickly?',
      options: [
        { id: 'a', label: 'AWS Data Transfer Terminal', ok: true, why: 'Two months online for a one-off load is the definition of a physical import.' },
        { id: 'b', label: 'AWS DataSync', ok: false, rk: 'size', why: 'Still limited by the same bandwidth.' },
        { id: 'c', label: 'Volume Gateway', ok: false, rk: 'job', why: 'Hybrid block access, not a bulk move.' },
        { id: 'd', label: 'AWS Direct Connect', ok: false, rk: 'time', why: 'Provisioning time plus ongoing cost, for a single job.' }
      ],
      stub: { size: 'weeks+ online', time: 'one-off', proto: 'any', sup: 'fastest' },
      deciding: ['2 months'],
      explain: 'The stem does the arithmetic for you. "Would take 2 months" plus one-off means road, not wire.' },

    { id: 'D12', ref: 'exam Q29', mine: true, line: 'backup',
      text: 'A company must automate backups of all EBS volumes attached to its EC2 instances as soon as possible, cost-effectively and simply to maintain. Fastest and most cost-effective option?',
      options: [
        { id: 'a', label: 'EBS snapshot retention rule in AWS Backup.', ok: false, rk: 'sup', why: 'It works, but a central multi-service tool is more than this scope needs.' },
        { id: 'b', label: 'Scheduled job calling create-snapshot via the CLI.', ok: false, rk: 'sup', why: 'Custom scripting you then have to own.' },
        { id: 'c', label: 'Amazon Data Lifecycle Manager.', ok: true, why: 'Purpose-built for exactly this: EBS snapshots on a schedule with retention, nothing to deploy.' },
        { id: 'd', label: 'Storage Gateway with EBS as source, backups on-prem.', ok: false, rk: 'false', why: 'Not a thing — Storage Gateway does not back up EBS volumes to on-premises.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'AWS-internal', sup: 'least ops' },
      deciding: ['all EBS volumes', 'as soon as possible', 'simply to maintain'],
      explain: 'EBS only, and nothing else in scope: DLM. The moment a second service appears, it becomes AWS Backup.' },

    { id: 'D13', ref: 'exam Q41', mine: true, line: 'gateway', tag: 'K',
      text: 'A company takes tape backups on-premises and wants to preserve those backups for up to 10 years in the cloud; they are accessed once or twice a year. Most cost-effective?',
      options: [
        { id: 'a', label: 'Storage Gateway, transition to Glacier Deep Archive.', ok: true, why: 'Tape Gateway presents a virtual tape library so the backup software is unchanged, and Deep Archive is the cheapest home for a 10-year tape read twice a year.' },
        { id: 'b', label: 'Storage Gateway directly to Glacier Flexible Retrieval.', ok: false, rk: 'sup', why: 'Works, but dearer than Deep Archive for this access pattern.' },
        { id: 'c', label: 'S3 + lifecycle to Glacier.', ok: false, rk: 'proto', why: 'The backup software cannot write to a bucket, and this is not Deep Archive.' },
        { id: 'd', label: 'Data Transfer Terminal to Glacier Flexible.', ok: false, rk: 'time', why: 'A one-off physical move, not an ongoing tape replacement.' }
      ],
      stub: { size: 'any', time: 'ongoing', proto: 'tape', sup: 'cheapest' },
      deciding: ['tape backups', '10 years', 'once or twice a year'],
      explain: 'Fill the PROTOCOL slot with "tape" and two options die immediately. Then the SUPERLATIVE picks Deep Archive over Flexible.' },

    { id: 'D14', ref: 'exam Q54', mine: true, line: 'truck',
      text: 'A media company has 250 TB of archived media on portable storage and a 100 Mbps line. It must import the data to S3. FASTEST and MOST COST-EFFECTIVE?',
      options: [
        { id: 'a', label: 'AWS Data Transfer Terminal', ok: true, why: '100 Mbps ≈ 1 TB/day, so 250 TB is roughly 250 days online.' },
        { id: 'b', label: 'Upload directly over the internet', ok: false, rk: 'size', why: 'About 250 days.' },
        { id: 'c', label: 'AWS Direct Connect', ok: false, rk: 'time', why: 'A provisioned, monthly-billed link for a one-off import.' },
        { id: 'd', label: 'S3 Transfer Acceleration', ok: false, rk: 'size', why: 'Creates no extra bandwidth.' }
      ],
      stub: { size: 'weeks+ online', time: 'one-off', proto: 'any', sup: 'fastest' },
      deciding: ['250 TB', '100 Mbps'],
      explain: 'The pipe rule, applied directly: 250 TB at 1 TB/day.' },

    { id: 'D15', ref: 'exam Q56', mine: true, line: 'dms',
      text: 'An on-prem MySQL database must be replicated to S3 as CSV. After the full copy, ongoing changes must be streamed continually. The solution needs little management overhead and must be highly secure.',
      options: [
        { id: 'a', label: 'SCT to convert to CSV; MGN for ongoing changes.', ok: false, rk: 'job', why: 'SCT converts schemas, and MGN rehosts servers. Neither streams rows.' },
        { id: 'b', label: 'DataSync to S3 + DTT for ongoing changes, custom KMS key.', ok: false, rk: 'job', why: 'DataSync cannot read a database and a physical terminal cannot do "ongoing".' },
        { id: 'c', label: 'DMS full load + CDC task; CA certificate, DMS endpoint with SSL.', ok: true, why: 'Full load then CDC into an S3 target, with SSL on the endpoint for the security requirement.' },
        { id: 'd', label: 'DMS full-load only; SSL endpoint via Network Firewall.', ok: false, rk: 'false', why: 'No CDC, and Network Firewall does not create database endpoints.' }
      ],
      stub: { size: 'any', time: 'ongoing', proto: 'database', sup: 'least ops' },
      deciding: ['MySQL', 'ongoing changes', 'CSV'],
      explain: 'Source is an engine, so it is DMS. "Ongoing changes" forces CDC. The S3 CSV target is just the DMS target type.' },

    { id: 'D16', ref: 'exam Q11', mine: true, line: 'backup',
      text: 'An EKS application uses DynamoDB with DAX in us-east-1. The company must keep database calls off the public internet and needs automated cross-account backups for long-term retention.',
      options: [
        { id: 'a', label: 'DynamoDB interface endpoint + PITR restorable in another account.', ok: false, rk: 'false', why: 'PITR restores within the same account and Region; the classic private-path answer for DynamoDB is also the gateway endpoint.' },
        { id: 'b', label: 'Gateway endpoint + NACL rule + native on-demand backups cross-account.', ok: false, rk: 'false', why: 'Native on-demand backups cannot be copied cross-account.' },
        { id: 'c', label: 'Interface endpoint + Network Firewall + Timestream PITR.', ok: false, rk: 'false', why: 'A nonsense combination — Timestream is a different service entirely.' },
        { id: 'd', label: 'DynamoDB gateway endpoint on the route table + AWS Backup copying backups to another account.', ok: true, why: 'Gateway endpoint keeps the traffic private; AWS Backup is the only thing here that copies backups into another account.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'AWS-internal', sup: 'most durable/compliant' },
      deciding: ['off the public internet', 'cross-account backups', 'long-term retention'],
      explain: 'Two requirements, two halves of the answer. The cross-account half eliminates every native DynamoDB backup feature.' },

    { id: 'D17', ref: 'exam Q4', mine: true, line: 'edge',
      text: 'Outposts servers worldwide repeatedly download multi-file software updates from an S3 bucket in us-west-2, and distribution is slow. Reduce latency with minimal operational effort.',
      options: [
        { id: 'a', label: 'CloudFront with a secondary origin and CachingDisabled + signed URLs.', ok: false, rk: 'false', why: 'Disabling caching removes the entire benefit of putting CloudFront there.' },
        { id: 'b', label: 'Global Accelerator to edge, then private VIF to S3.', ok: false, rk: 'job', why: 'Prestige distractor; it is not an S3 download cache.' },
        { id: 'c', label: 'CloudFront with the bucket as origin + signed URLs.', ok: true, why: 'Repeated downloads of the same files from everywhere is the textbook edge-cache case.' },
        { id: 'd', label: 'S3 Transfer Acceleration endpoint for downloads.', ok: false, rk: 'job', why: 'Transfer Acceleration is for uploads and caches nothing.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'objects/HTTP', sup: 'least ops' },
      deciding: ['download', 'repeatedly', 'worldwide'],
      explain: 'Direction of travel decides it. Download plus repeatedly equals CloudFront — and never disable the cache in the answer you pick.' },

    { id: 'D18', line: 'gateway',
      text: 'An on-prem iSCSI SAN is 95% full. The company wants primary data in AWS while keeping recently accessed blocks on-premises with low latency. Which solution?',
      options: [
        { id: 'a', label: 'Volume Gateway, cached volumes.', ok: true, why: 'Primary copy in S3, hot blocks cached locally — the only option that frees SAN capacity.' },
        { id: 'b', label: 'Volume Gateway, stored volumes.', ok: false, rk: 'sup', why: 'Keeps the full dataset on-prem, so the SAN is still full.' },
        { id: 'c', label: 'S3 File Gateway.', ok: false, rk: 'proto', why: 'NFS/SMB files, not iSCSI block.' },
        { id: 'd', label: 'DataSync to EBS.', ok: false, rk: 'false', why: 'DataSync does not target EBS, and this is not ongoing block access.' }
      ],
      stub: { size: 'any', time: 'ongoing', proto: 'iSCSI/block', sup: 'none stated' },
      deciding: ['iSCSI', '95% full', 'primary data in AWS'],
      explain: 'iSCSI sets the PROTOCOL slot to block. "95% full" plus "primary data in AWS" then picks cached over stored.' },

    { id: 'D19', line: 'gateway',
      text: 'A trading desk needs low-latency access to its entire 20 TB iSCSI dataset on-premises, plus point-in-time backups in AWS that it could restore as EBS volumes during a disaster.',
      options: [
        { id: 'a', label: 'Volume Gateway stored volumes', ok: true, why: 'The full dataset stays local for latency; asynchronous snapshots land in AWS as EBS snapshots.' },
        { id: 'b', label: 'Volume Gateway cached volumes', ok: false, rk: 'sup', why: 'Only a hot subset would be local, so cold reads cross the network.' },
        { id: 'c', label: 'Tape Gateway', ok: false, rk: 'proto', why: 'A virtual tape library for backup software, not live block access.' },
        { id: 'd', label: 'FSx File Gateway', ok: false, rk: 'proto', why: 'SMB files, not iSCSI block.' }
      ],
      stub: { size: 'any', time: 'ongoing', proto: 'iSCSI/block', sup: 'fastest' },
      deciding: ['entire 20 TB', 'low-latency', 'restore as EBS volumes'],
      explain: 'The word "entire" is the whole question. Cached keeps a subset; stored keeps everything.' },

    { id: 'D20', line: 'datasync',
      text: 'A company must copy 300 TB from Azure Blob Storage to S3 and keep new files synchronised weekly for three months during a migration. LEAST operational overhead?',
      options: [
        { id: 'a', label: 'AWS DataSync with a scheduled task', ok: true, why: 'DataSync has a built-in Azure Blob location and schedules repeat automatically.' },
        { id: 'b', label: 'Transfer Family SFTP', ok: false, rk: 'proto', why: 'A partner door — Azure Blob is not an SFTP client.' },
        { id: 'c', label: 'S3 File Gateway in Azure', ok: false, rk: 'job', why: 'A bridge for on-prem applications, not a cloud-to-cloud copier.' },
        { id: 'd', label: 'Data Transfer Terminal', ok: false, rk: 'time', why: 'Trucks cannot do a weekly sync.' }
      ],
      stub: { size: 'fits the pipe', time: 'ongoing', proto: 'objects/HTTP', sup: 'least ops' },
      deciding: ['Azure Blob Storage', 'synchronised weekly'],
      explain: '"Weekly" sets TIME to ongoing, which kills the truck. Another cloud’s object storage is a first-class DataSync location.' },

    { id: 'D21', line: 'where',
      text: 'A .NET application runs on Windows EC2 instances in two Availability Zones and needs a shared file system with SMB and Active Directory ACLs that survives an AZ failure.',
      options: [
        { id: 'a', label: 'FSx for Windows File Server, Multi-AZ', ok: true, why: 'Native SMB with AD ACLs, and the Multi-AZ deployment survives the loss of an AZ.' },
        { id: 'b', label: 'EFS Regional', ok: false, rk: 'proto', why: 'NFS and Linux — no SMB, no AD ACLs.' },
        { id: 'c', label: 'EBS io2 Multi-Attach', ok: false, rk: 'false', why: 'Single AZ, and it needs a cluster-aware file system; it is not shared Windows storage.' },
        { id: 'd', label: 'S3 File Gateway on EC2', ok: false, rk: 'job', why: 'An on-prem bridge, and a needless hop inside AWS.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'NFS/SMB', sup: 'most durable/compliant' },
      deciding: ['Windows', 'SMB', 'Active Directory', 'two Availability Zones'],
      explain: '"Windows" or "SMB" eliminates EFS on sight. "Survives an AZ failure" then forces the Multi-AZ deployment.' },

    { id: 'D22', line: 'where',
      text: 'Thousands of Linux containers across three Availability Zones need shared POSIX storage and the data size is unpredictable. LEAST operational overhead.',
      options: [
        { id: 'a', label: 'EFS (Regional, Elastic throughput)', ok: true, why: 'Multi-AZ NFS with POSIX semantics that grows and shrinks by itself; Elastic throughput needs no capacity planning.' },
        { id: 'b', label: 'EBS io2 Multi-Attach', ok: false, rk: 'false', why: 'One AZ and at most 16 instances.' },
        { id: 'c', label: 'FSx for Windows', ok: false, rk: 'proto', why: 'SMB — wrong protocol for Linux POSIX.' },
        { id: 'd', label: 'Instance store', ok: false, rk: 'false', why: 'Ephemeral and not shared.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'NFS/SMB', sup: 'least ops' },
      deciding: ['Thousands', 'Linux', 'three Availability Zones', 'unpredictable'],
      explain: 'Scale plus multi-AZ plus unpredictable size plus least ops is EFS, every time.' },

    { id: 'D23', line: 'where',
      text: 'A company runs NetApp ONTAP on-premises, replicates with SnapMirror, and serves NFS and SMB from the same volumes. It wants the same capabilities managed in AWS with minimal changes.',
      options: [
        { id: 'a', label: 'FSx for NetApp ONTAP', ok: true, why: 'The same ONTAP features as a managed service, including SnapMirror and multi-protocol volumes.' },
        { id: 'b', label: 'FSx for Windows', ok: false, rk: 'proto', why: 'SMB only, and no SnapMirror.' },
        { id: 'c', label: 'EFS', ok: false, rk: 'proto', why: 'NFS only.' },
        { id: 'd', label: 'FSx for OpenZFS', ok: false, rk: 'proto', why: 'No SnapMirror and no SMB + iSCSI multi-protocol.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'NFS/SMB', sup: 'least ops' },
      deciding: ['NetApp', 'SnapMirror', 'NFS and SMB'],
      explain: 'Three brand words, one answer. SnapMirror alone is decisive.' },

    { id: 'D24', line: 'where',
      text: 'A genomics pipeline must process 50 TB of input in S3 with massively parallel, high-throughput file access for a 3-day job, then write results back to S3. Lowest cost.',
      options: [
        { id: 'a', label: 'FSx for Lustre scratch file system linked to the bucket', ok: true, why: 'Scratch is the cheapest Lustre deployment and a 3-day job does not need replication.' },
        { id: 'b', label: 'FSx for Lustre persistent', ok: false, rk: 'sup', why: 'Pays for durability a 3-day job throws away.' },
        { id: 'c', label: 'EFS Max I/O', ok: false, rk: 'sup', why: 'Not HPC-optimised, needs a separate copy, and Max I/O is a previous-generation mode.' },
        { id: 'd', label: 'FSx for ONTAP', ok: false, rk: 'sup', why: 'Enterprise NAS features this pipeline never uses.' }
      ],
      stub: { size: 'not about transfer', time: 'one-off', proto: 'NFS/SMB', sup: 'cheapest' },
      deciding: ['high-throughput', '3-day job', 'Lowest cost'],
      explain: 'Lustre is settled by "high-throughput against S3". Then "3-day" plus "lowest cost" picks Scratch over Persistent.' },

    { id: 'D25', line: 'classes',
      text: 'A data lake holds objects whose access patterns are unknown and change over time. The team wants automatic cost savings with no retrieval fees and no lifecycle tuning.',
      options: [
        { id: 'a', label: 'S3 Intelligent-Tiering', ok: true, why: 'The only class that re-tiers each object automatically, and it charges no retrieval fee.' },
        { id: 'b', label: 'Standard-IA', ok: false, rk: 'sup', why: 'Retrieval fees, and wrong the moment the data turns hot.' },
        { id: 'c', label: 'Lifecycle to Glacier Instant after 30 d', ok: false, rk: 'sup', why: 'That is exactly the tuning they said they do not want, and it has retrieval fees.' },
        { id: 'd', label: 'One Zone-IA', ok: false, rk: 'false', why: 'Single AZ plus retrieval fees, on a data lake nobody said was re-creatable.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'objects/HTTP', sup: 'least ops' },
      deciding: ['unknown', 'change over time', 'no retrieval fees'],
      explain: '"Unknown or changing" plus "no retrieval fees" plus "no tuning" is a three-way match on Intelligent-Tiering.' },

    { id: 'D26', line: 'classes',
      text: 'An application stores thumbnails it can regenerate from the originals. The thumbnails are rarely read but must load instantly. Cheapest?',
      options: [
        { id: 'a', label: 'S3 One Zone-IA', ok: true, why: 'The cheapest millisecond class, and "can regenerate" is explicit permission to accept one AZ.' },
        { id: 'b', label: 'Standard-IA', ok: false, rk: 'sup', why: 'Pays for three-AZ resilience on data you would just recreate.' },
        { id: 'c', label: 'Glacier Instant', ok: false, rk: 'sup', why: '90-day minimum and pricier retrieval.' },
        { id: 'd', label: 'Glacier Flexible', ok: false, rk: 'time', why: 'Not instant.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'objects/HTTP', sup: 'cheapest' },
      deciding: ['can regenerate', 'instantly', 'Cheapest'],
      explain: '"Can regenerate" is the examiner handing you One Zone-IA. Without it, the answer would be Standard-IA.' },

    { id: 'D27', line: 'classes',
      text: 'Medical images are kept for 5 years, typically read about once a quarter, and must be viewable in milliseconds when requested. Lowest cost?',
      options: [
        { id: 'a', label: 'Glacier Instant Retrieval', ok: true, why: 'Archive pricing with millisecond reads — built for roughly quarterly access.' },
        { id: 'b', label: 'Glacier Flexible Retrieval', ok: false, rk: 'time', why: 'Minutes to hours; the stem demands milliseconds.' },
        { id: 'c', label: 'Standard-IA', ok: false, rk: 'sup', why: 'Works, but higher storage cost than quarterly access justifies.' },
        { id: 'd', label: 'Deep Archive', ok: false, rk: 'time', why: 'Up to 12 hours.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'objects/HTTP', sup: 'cheapest' },
      deciding: ['once a quarter', 'milliseconds'],
      explain: '"Rarely" plus "milliseconds" is Glacier Instant Retrieval. Any retrieval requirement in milliseconds kills Flexible and Deep.' },

    { id: 'D28', line: 'classes',
      text: 'Legal archives are kept for 10 years and are rarely needed, but when a court request arrives the files must be available within 15 minutes. Lowest cost?',
      options: [
        { id: 'a', label: 'Glacier Flexible Retrieval, expedited retrievals when needed', ok: true, why: 'Expedited retrieval is typically 1–5 minutes — the cheapest class that can meet 15 minutes.' },
        { id: 'b', label: 'Glacier Deep Archive', ok: false, rk: 'time', why: 'Its fastest option is Standard, within 12 hours.' },
        { id: 'c', label: 'Standard-IA', ok: false, rk: 'sup', why: 'Far more storage cost than "rarely needed" justifies.' },
        { id: 'd', label: 'Intelligent-Tiering with the Deep Archive Access tier', ok: false, rk: 'time', why: 'That tier retrieves in hours, not minutes.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'objects/HTTP', sup: 'cheapest' },
      deciding: ['within 15 minutes', '10 years', 'rarely'],
      explain: 'Read the retrieval requirement before the retention. "Minutes" is the single word that rules out Deep Archive.' },

    { id: 'D29', line: 'classes',
      text: 'Audit logs must be retained for 7 years in WORM form; nobody, including the root user, may delete or overwrite them during that period.',
      options: [
        { id: 'a', label: 'S3 Object Lock in compliance mode with a 7-year retention period (versioning enabled)', ok: true, why: 'Compliance mode cannot be bypassed by any principal, including the account root, until retention expires.' },
        { id: 'b', label: 'Object Lock governance mode', ok: false, rk: 'false', why: 'A user with the bypass permission can delete.' },
        { id: 'c', label: 'MFA Delete', ok: false, rk: 'false', why: 'The root user with MFA can still delete.' },
        { id: 'd', label: 'Bucket policy denying DeleteObject', ok: false, rk: 'false', why: 'Root and administrators can change the policy.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'objects/HTTP', sup: 'most durable/compliant' },
      deciding: ['WORM', 'including the root user'],
      explain: '"Including the root user" is the phrase that separates compliance mode from everything else.' },

    { id: 'D30', line: 'edge',
      text: 'Users on five continents upload multi-GB video files to one bucket in us-east-1, and uploads from Asia are slow. Improve upload speed with minimal changes.',
      options: [
        { id: 'a', label: 'Enable S3 Transfer Acceleration and use its endpoint', ok: true, why: 'Uploads enter at a nearby edge location and cross the AWS backbone; it is a bucket setting plus an endpoint change.' },
        { id: 'b', label: 'CloudFront distribution in front of the bucket', ok: false, rk: 'job', why: 'Built for downloads and caching.' },
        { id: 'c', label: 'DataSync agents at users’ sites', ok: false, rk: 'job', why: 'These are end users, not servers you manage.' },
        { id: 'd', label: 'Global Accelerator in front of the bucket', ok: false, rk: 'false', why: 'Prestige distractor; it is not an S3 upload feature.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'objects/HTTP', sup: 'least ops' },
      deciding: ['upload', 'five continents', 'minimal changes'],
      explain: 'Upload plus far from the Region is Transfer Acceleration. Mirror image of the CloudFront question.' },

    { id: 'D31', line: 'backup',
      text: 'A team enabled Cross-Region Replication on a bucket that already held 2 million objects. New objects replicate; the existing ones do not. Replicate the existing objects with the least effort.',
      options: [
        { id: 'a', label: 'S3 Batch Replication', ok: true, why: 'The purpose-built back-fill for objects that predate the replication rule.' },
        { id: 'b', label: 'Disable and re-enable versioning', ok: false, rk: 'false', why: 'That triggers no replication at all.' },
        { id: 'c', label: 'DataSync between the buckets', ok: false, rk: 'sup', why: 'It works, but it is not the purpose-built answer and version and metadata handling differ.' },
        { id: 'd', label: 'Lifecycle rule to copy objects', ok: false, rk: 'false', why: 'Lifecycle transitions and expires; it never copies between buckets.' }
      ],
      stub: { size: 'not about transfer', time: 'one-off', proto: 'objects/HTTP', sup: 'least ops' },
      deciding: ['already held', 'existing ones do not'],
      explain: 'Replication is not retroactive. The word "existing" is the entire question.' },

    { id: 'D32', line: 'where',
      text: 'A database on EC2 needs the highest IOPS and sub-millisecond latency for a mission-critical workload.',
      options: [
        { id: 'a', label: 'EBS io2 Block Express', ok: true, why: 'Up to 256,000 IOPS and 4,000 MiB/s per volume, 99.999% durability, average latency under 500 microseconds.' },
        { id: 'b', label: 'EBS gp3', ok: false, rk: 'sup', why: 'General purpose, and its ceiling is 80,000 IOPS with no sustained sub-millisecond promise.' },
        { id: 'c', label: 'EBS st1', ok: false, rk: 'proto', why: 'HDD — throughput, not IOPS, and only 500 of them.' },
        { id: 'd', label: 'Instance store', ok: false, rk: 'false', why: 'Fast, but data is lost on stop — never for the system of record.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'iSCSI/block', sup: 'fastest' },
      deciding: ['highest IOPS', 'sub-millisecond', 'mission-critical'],
      explain: 'The three superlatives together are the io2 Block Express signature.' },

    { id: 'D33', line: 'where',
      text: 'A nightly batch job needs very fast temporary scratch space; the data is recreated each run and loss is acceptable. Lowest cost for the performance.',
      options: [
        { id: 'a', label: 'EC2 instance store', ok: true, why: 'Physically attached, the fastest disk available, and included in the instance price.' },
        { id: 'b', label: 'EBS io2', ok: false, rk: 'sup', why: 'Paying for durability the job explicitly does not need.' },
        { id: 'c', label: 'EFS', ok: false, rk: 'sup', why: 'A network file system: slower and pricier for scratch.' },
        { id: 'd', label: 'S3 Express One Zone', ok: false, rk: 'proto', why: 'An object API, not a local disk.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'iSCSI/block', sup: 'cheapest' },
      deciding: ['temporary', 'recreated each run', 'loss is acceptable'],
      explain: '"Loss is acceptable" is the examiner removing durability from the requirements. Take the instance store.' },

    { id: 'D34', line: 'where',
      text: 'Security finds an unencrypted EBS volume attached to a production instance. It must be encrypted.',
      options: [
        { id: 'a', label: 'Snapshot → copy the snapshot with encryption enabled → create a volume → swap it in', ok: true, why: 'Encryption is chosen at creation, and the snapshot copy is where you turn it on.' },
        { id: 'b', label: 'Modify the volume and enable encryption', ok: false, rk: 'false', why: 'You cannot encrypt an existing volume in place.' },
        { id: 'c', label: 'Enable EBS encryption by default', ok: false, rk: 'false', why: 'That affects only volumes created afterwards.' },
        { id: 'd', label: 'DataSync to an encrypted volume', ok: false, rk: 'false', why: 'DataSync does not target EBS.' }
      ],
      stub: { size: 'not about transfer', time: 'one-off', proto: 'iSCSI/block', sup: 'none stated' },
      deciding: ['unencrypted EBS volume', 'attached'],
      explain: 'Memorise the four steps. Every in-place encryption option on an EBS question is false.' },

    { id: 'D35', line: 'backup',
      text: 'An encrypted EBS snapshot, encrypted with the AWS managed key aws/ebs, must be shared with a partner account, and the share fails.',
      options: [
        { id: 'a', label: 'Copy the snapshot re-encrypted with a customer managed KMS key; share the key and the snapshot', ok: true, why: 'The partner needs access to the key as well as the snapshot, and only a customer managed key can grant it.' },
        { id: 'b', label: 'Make the snapshot public', ok: false, rk: 'false', why: 'Encrypted snapshots cannot be made public, and it would expose the data.' },
        { id: 'c', label: 'Add the account to the AWS managed key policy', ok: false, rk: 'false', why: 'AWS managed key policies cannot be edited.' },
        { id: 'd', label: 'S3 CRR the snapshot to the partner', ok: false, rk: 'false', why: 'There is no visible snapshot bucket.' }
      ],
      stub: { size: 'not about transfer', time: 'one-off', proto: 'AWS-internal', sup: 'none stated' },
      deciding: ['AWS managed key', 'partner account'],
      explain: 'The phrase "AWS managed key" plus "another account" is always solved by re-encrypting with a customer managed key.' },

    { id: 'D36', line: 'where',
      text: 'An EBS volume in us-east-1a must be used by an instance in us-east-1c.',
      options: [
        { id: 'a', label: 'Snapshot the volume, create a new volume from it in us-east-1c', ok: true, why: 'The snapshot is the only route between Availability Zones.' },
        { id: 'b', label: 'Detach and attach it to the instance in 1c', ok: false, rk: 'false', why: 'EBS is AZ-scoped; the attach will fail.' },
        { id: 'c', label: 'Enable Multi-Attach', ok: false, rk: 'false', why: 'Multi-Attach is same-AZ only.' },
        { id: 'd', label: 'DataSync the volume', ok: false, rk: 'false', why: 'Not an EBS tool.' }
      ],
      stub: { size: 'not about transfer', time: 'one-off', proto: 'iSCSI/block', sup: 'none stated' },
      deciding: ['us-east-1a', 'us-east-1c'],
      explain: 'Two different AZ letters in one stem is the giveaway: snapshot, then create in the target AZ.' },

    { id: 'D37', line: 'transfer',
      text: 'A retailer exchanges EDI purchase orders with trading partners over AS2 and wants the messages stored in S3 without running servers.',
      options: [
        { id: 'a', label: 'Transfer Family with an AS2 server and S3 storage', ok: true, why: 'AS2 is a first-class Transfer Family protocol, fully managed, with S3 as the backend.' },
        { id: 'b', label: 'DataSync', ok: false, rk: 'job', why: 'Partners will not run your agent.' },
        { id: 'c', label: 'API Gateway + Lambda parsing AS2', ok: false, rk: 'sup', why: 'A custom build of something AWS already manages.' },
        { id: 'd', label: 'S3 File Gateway', ok: false, rk: 'job', why: 'An on-prem bridge, not a partner endpoint.' }
      ],
      stub: { size: 'any', time: 'ongoing', proto: 'SFTP/FTP/AS2', sup: 'least ops' },
      deciding: ['AS2', 'trading partners', 'without running servers'],
      explain: 'AS2 appears in exactly one service. The word alone answers the question.' },

    { id: 'D38', line: 'datasync', multi: true,
      text: 'A company will migrate a 50 TB NAS to S3 over its 1 Gbps connection within two weeks, then retire the NAS. Afterwards, on-prem applications must still read a small subset of those files with low latency. (Select TWO.)',
      options: [
        { id: 'a', label: 'DataSync to migrate the data to S3', ok: true, why: 'The bulk move: 50 TB at 1 Gbps is about five days, comfortably inside two weeks.' },
        { id: 'b', label: 'S3 File Gateway for ongoing on-prem access', ok: true, why: 'The bridge for the subset on-prem apps still read, once the NAS is gone.' },
        { id: 'c', label: 'Data Transfer Terminal', ok: false, rk: 'size', why: '50 TB is roughly 5 days at 1 Gbps — it fits the pipe.' },
        { id: 'd', label: 'Transfer Family', ok: false, rk: 'job', why: 'A partner door; no external party here.' },
        { id: 'e', label: 'Volume Gateway stored volumes', ok: false, rk: 'proto', why: 'Block, and it keeps a full local copy — the opposite of retiring the NAS.' }
      ],
      stub: { size: 'fits the pipe', time: 'ongoing', proto: 'NFS/SMB', sup: 'none stated' },
      deciding: ['migrate', 'retire the NAS', 'still read', 'low latency'],
      explain: 'Two verbs, two services: move it with DataSync, then bridge the remainder with S3 File Gateway. This is the canonical both-are-right pair.' },

    { id: 'D39', line: 'backup',
      text: 'A company must back up its VMware Cloud on AWS virtual machines and its Amazon RDS databases under one backup policy, with centralised reporting for auditors.',
      options: [
        { id: 'a', label: 'AWS Backup with backup plans + Backup Audit Manager', ok: true, why: 'Both resource types are supported, one plan covers them, and Backup Audit Manager produces the auditor reports.' },
        { id: 'b', label: 'DLM', ok: false, rk: 'job', why: 'EBS snapshots and AMIs only.' },
        { id: 'c', label: 'RDS automated backups + Storage Gateway', ok: false, rk: 'job', why: 'Two tools, no central policy, and no report.' },
        { id: 'd', label: 'Tape Gateway', ok: false, rk: 'job', why: 'A virtual tape library for backup software.' }
      ],
      stub: { size: 'any', time: 'ongoing', proto: 'AWS-internal', sup: 'most durable/compliant' },
      deciding: ['one backup policy', 'VMware Cloud on AWS', 'auditors'],
      explain: 'Two or more services under one policy plus an audit report is AWS Backup with Backup Audit Manager. Note the scope: AWS Backup covers VMware Cloud on AWS and VMware Cloud on AWS Outposts virtual machines.' },

    { id: 'D40', line: 'classes',
      text: 'The S3 bill keeps growing even though the object count is flat. Investigation shows many failed multipart uploads. Cheapest fix with the least ongoing effort.',
      options: [
        { id: 'a', label: 'Lifecycle rule AbortIncompleteMultipartUpload after N days', ok: true, why: 'One rule, applied forever, and it deletes the orphaned parts you are being billed for.' },
        { id: 'b', label: 'Enable Intelligent-Tiering', ok: false, rk: 'false', why: 'Incomplete parts are not objects, so tiering never touches them.' },
        { id: 'c', label: 'Weekly Lambda listing and aborting uploads', ok: false, rk: 'sup', why: 'Custom code for something lifecycle does natively.' },
        { id: 'd', label: 'Disable versioning', ok: false, rk: 'false', why: 'Unrelated — parts are not versions.' }
      ],
      stub: { size: 'not about transfer', time: 'ongoing', proto: 'objects/HTTP', sup: 'cheapest' },
      deciding: ['object count is flat', 'failed multipart uploads'],
      explain: 'Storage you are billed for that does not show up as objects is almost always incomplete multipart uploads.' },

    { id: 'D41', line: 'datasync',
      text: 'A company has a new 10 Gbps Direct Connect link. It must copy 400 TB of NFS data to S3 within a month and verify that every file arrived intact.',
      options: [
        { id: 'a', label: 'DataSync over the Direct Connect link with data verification', ok: true, why: 'The link already exists, the maths fits easily, and integrity verification is built into DataSync.' },
        { id: 'b', label: 'Data Transfer Terminal', ok: false, rk: 'size', why: '10 Gbps is about 100 TB/day — 400 TB fits with room to spare.' },
        { id: 'c', label: 'S3 File Gateway', ok: false, rk: 'job', why: 'A bridge, not a mover.' },
        { id: 'd', label: 'rsync from an EC2 instance', ok: false, rk: 'sup', why: 'Self-managed, and no built-in verification or reporting.' }
      ],
      stub: { size: 'fits the pipe', time: 'one-off', proto: 'NFS/SMB', sup: 'none stated' },
      deciding: ['10 Gbps Direct Connect', 'within a month', 'verify'],
      explain: 'This is the exception to the truck rule: the fat link is already there, so no physical import is justified. "Verify" is the DataSync feature word.' }
  ],

  /* ---------------- traps ---------------- */
  traps: [
    { title: 'Gateway for migration', text: 'Storage Gateway is a bridge. If the data is leaving on-prem for good, the answer is DataSync.', drills: ['D07', 'D10', 'D41'] },
    { title: 'Direct Connect as a transfer service', text: 'It takes weeks to provision and then bills monthly. It is never the answer to a one-off transfer.', drills: ['D02', 'D11', 'D14'] },
    { title: 'Transfer Acceleration for downloads', text: 'Transfer Acceleration speeds uploads and caches nothing. Downloads go to CloudFront.', drills: ['D17', 'D30'] },
    { title: 'EBS as shared storage', text: 'Multi-Attach is niche: same AZ, io1/io2 only, up to 16 Nitro instances, cluster-aware file system required, and never a boot volume. Shared files mean EFS or FSx.', drills: ['D21', 'D22'] },
    { title: 'EFS for Windows', text: 'EFS is NFS and Linux. The word "Windows" or "SMB" means FSx for Windows File Server.', drills: ['D01', 'D21', 'D22'] },
    { title: 'Glacier without checking retrieval time', text: '"Minutes" rules out Deep Archive. "Milliseconds" rules out Flexible Retrieval. Read the retrieval requirement before the retention.', drills: ['D27', 'D28', 'D04'] },
    { title: 'IA before day 30', text: 'A lifecycle transition to Standard-IA at day 15 is invalid. 30 / 90 / 180 are the minimums for IA / Glacier / Deep Archive.', drills: ['D04'] },
    { title: 'DLM vs AWS Backup', text: 'Cross-account, more than one service, or a compliance report means AWS Backup. EBS only and "as simple as possible" means DLM.', drills: ['D09', 'D12', 'D39'] },
    { title: 'Replication is not retroactive', text: 'CRR needs versioning on both buckets and copies only new objects. Existing objects need S3 Batch Replication.', drills: ['D31'] },
    { title: 'Durable is not highly available', text: 'EBS replicates inside a single Availability Zone. If that AZ is down, the volume is unavailable even though the data is intact.', drills: ['D36', 'D05'] },
    { title: 'Encrypted snapshot sharing', text: 'An AWS managed key cannot be shared across accounts and its policy cannot be edited. Copy the snapshot re-encrypted with a customer managed key.', drills: ['D35'] },
    { title: 'EBS snapshots are not in a bucket you can see', text: 'They live in S3 storage AWS manages. There is no bucket to apply CRR or Object Lock to, so any option that does is false.', drills: ['D05', 'D09', 'D35'] },
    { title: 'Service outside its job', text: 'An option that uses a service for something it was never built for is wrong regardless of how well the rest of the sentence reads — Transfer Family "moving ENIs", Network Firewall "creating endpoints", Global Accelerator for single-Region downloads.', drills: ['D15', 'D17', 'D30'] },
    { title: 'Right capability, wrong service', text: 'Watch for correct verbs attached to the wrong product, such as a "DataSync full-load and CDC task". Check the service, not the verbs.', drills: ['D03', 'D15'] },
    { title: 'Snow in old question banks', text: 'Snowball Edge and AWS Data Transfer Terminal share the same trigger words. Snowball Edge has been existing-customers-only since 7 November 2025 and support ends 31 December 2026, so an answer set will contain one or the other, never both.', drills: ['D02', 'D11', 'D14'] }
  ],

  /* ---------------- cheat sheet ---------------- */
  cheat: [
    'STORAGE = WHERE (A) or HOW (B)?',
    'A WHERE:  disk → EBS (1 AZ, 1 instance, snap→S3)   | tmp → instance store',
    '          folder Linux → EFS (NFS, multi-AZ)         | Windows → FSx Win (SMB/AD)',
    '          HPC → FSx Lustre | NetApp → FSx ONTAP | ZFS → FSx OpenZFS',
    '          objects → S3     30/90/180 = IA/Glacier/Deep ; unknown → Int-Tiering',
    'B HOW:    NET files      → DataSync        (migrate/sync)',
    '          HYBRID keep    → Storage Gateway (File S3/FSx, Volume cached/stored, Tape)',
    '          PARTNERS       → Transfer Family (SFTP/FTPS/FTP/AS2)',
    '          TRUCK          → DTT / Snow      (weeks at current bandwidth)',
    '          DB             → DMS (+SCT)      | SERVERS → MGN',
    '          UPLOAD far     → S3 Transfer Accel | DOWNLOAD cache → CloudFront',
    '          COPY x-acct/x-region, many svcs → AWS Backup | EBS only, fastest → DLM',
    '          S3 → S3 region → CRR (versioning!)',
    'KEY:  Network=DataSync  Bridge=Gateway  Tape=TapeGW→Deep  Truck=DTT/Snow',
    '      DB=DMS  Servers=MGN  Partners=Transfer  X-account=Backup',
    'NEVER: DX for one-off transfer · Gateway for migration · TA for download ·',
    '       EFS for Windows · IA before 30d · Deep Archive when "minutes"',
    'EBS snapshots → S3 you CANNOT see → never CRR / Object Lock / "the bucket"',
    '"one place" + ≥2 services → AWS Backup  (DLM = EBS only)',
    'PIPE: 100 Mbps ≈ 1 TB/day · 1 Gbps ≈ 10 TB/day',
    '',
    'VERIFIED 2026-09: Snowball Edge = existing customers only (7 Nov 2025), EOL',
    '  31 Dec 2026 → offline bulk = Data Transfer Terminal. DataSync writes to every',
    '  S3 class EXCEPT Express One Zone. Express One Zone has NO min duration.',
    '  gp3 ≤ 80k IOPS / 2,000 MiB/s · io2 BX ≤ 256k IOPS / 4,000 MiB/s, both ≤ 64 TiB.',
    '  AWS Backup VMware scope = VMware Cloud on AWS (+ on Outposts).'
  ].join('\n')
};
