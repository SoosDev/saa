# Session 1 — Storage & Data Movement: rebuild brief

**Goal:** the complete Session 1 lesson lives in the site. It is interactive, verified, and matches `design/`.

**Content sources**, all written and fact-checked 2026-09-24. Adapt them to your engine's schema, but keep the wording and answers.
- `session-01-content/core.js` has lines, map geometry, stub, method, cheat sheet, tree (with results), 8 compare pairs with quick checks, 15 traps, and the session log.
- `session-01-content/drills.js` has **42 drills**. D42 is new and current-state. D01 carries an update note about FSx File Gateway.
- `session-01-content/cards.js` has **52 trigger cards** with `mine`/`src`/`update` fields.
- The **Learn chapters** are below. They were missing entirely from the first build.

Domains: D1 (encryption and access, deep in Session 5), D2 (replication and backups), D3 (EBS/EFS/FSx/S3 selection), D4 (classes, lifecycle, transfer choice).

---

## Learn: 12 chapters (full text; `▶` marks an interactive element)

### Ch 1 · Start here: how to read a storage question
- Why ~50% happens to people with his background. Core-service questions (~35–40%) mostly go right. "Which specialised service" questions (~30–35%) are a coin flip. Multi-constraint questions (~25–30%) are lost on one missed keyword.
- Two mechanisms produce ~50%. First, recall by familiarity instead of by problem, which leads to the tempting distractor. Second, not turning the scenario into a constraint list, which lets "cheapest" or "least ops" get ignored.
- Show his baseline diagnosis for this cluster: Q8, Q12, Q29, Q41, Q54, Q56, Q4, Q11, Q33 (short table: question · what he picked · real cause).
- The reduction method (4 steps) and the 4-slot stub. The "prestige distractor" rule: for each option ask "what was this service built for?" If Global Accelerator was built for "TCP/UDP apps, static IPs, multi-Region" and the stub says "single Region, download files", it is out before you weigh anything else.
- ▶ **Stub trainer**: show R1's scenario, let him fill the 4 slots, and reveal the truth per slot with the reason ("within a month" + "never edited" = one-off).
- ▶ Checkpoint: "Which slot did R1 hinge on?" → TIME.

### Ch 2 · Two questions hide under "storage"
- A. **WHERE does data live** in AWS? Block / file / object → EBS, EFS, FSx, S3.
- B. **HOW does it get there or stay in sync?** DataSync, Storage Gateway, Transfer Family, DTT/Snow, DMS, replication, backup.
- Most of his misses (Q8, Q12, Q41, Q54, Q56) were B-questions answered with an A-service or with the wrong B-service. Decide A-or-B before reading the options.
- ▶ **Sorter** (10 items → bucket A or B, check, wrong ones show why):
  - "40 Linux servers need a shared folder" → A
  - "Copy 120 TB NAS to S3 this month" → B
  - "Database needs 60k IOPS" → A
  - "Suppliers send files via SFTP" → B
  - "Keep logs 7 years cheaply" → A
  - "Tape backups to the cloud" → B
  - "On-prem app keeps reading files, cache locally" → B
  - "Windows file shares with AD for EC2" → A
  - "Replicate objects to another Region" → B
  - "Temporary scratch disk" → A

### Ch 3 · Block, file, object (ELI5 without losing exam logic)
- Block = a raw disk one computer plugs into and formats. File = a shared network folder many computers mount. Object = a giant key→blob store over HTTP: no mounting, no partial edits.
- ASCII decision map (the "What does the APPLICATION expect?" tree, as in `tree` in core.js) plus ▶ link to the Tree tab.
- Memory hooks box:
  - EBS = "External, Bound to one AZ"
  - EFS = "Everyone's Folder (Linux)"
  - FSx = File System eXotic: **W**indows, **L**ustre (Linux cluster), **O**NTAP (NetApp), **Z**FS
  - S3 = "Stuff over HTTP"
  - Instance store = "dies with the box"
- ▶ Checkpoint (his exam Q33): "Which is true of EBS?" Options: replicated to another Region / attachable in any AZ / persists independently of the instance / snapshots stored in RDS. Answer: persists independently. Why: AZ-scoped; snapshots go to S3.

### Ch 4 · EBS in depth
- Volume table using the verified numbers from CONTEXT §6.
- ▶ **Chart**: IOPS (log scale) vs max throughput (MiB/s) scatter for gp2, gp3, io1, io2 BE, st1, sc1, each point direct-labelled. Caption: "gp3 now reaches 80k IOPS; io2 BE is still the 'highest' answer and the only one with 99.999% durability and Multi-Attach."
- Facts:
  - AZ-scoped. Crossing AZs = snapshot → new volume.
  - One instance at a time except Multi-Attach (limits in §6).
  - Snapshots are incremental and live in S3 storage you cannot see, so there is no CRR and no Object Lock on "the snapshot bucket". Copy snapshots cross-Region or cross-account.
  - Encrypt an existing volume = snapshot → copy with encryption → new volume. Encryption by default affects only new volumes.
  - Share encrypted snapshots cross-account only with a customer managed KMS key.
  - Root volume DeleteOnTermination defaults to true.
  - Fast Snapshot Restore removes first-read latency. Elastic Volumes change size, type and IOPS live.
  - Durable ≠ multi-AZ.
- Instance store: fastest, ephemeral.
- ▶ Checkpoints: (a) move a volume from 1a to 1c; (b) share a snapshot encrypted with aws/ebs.

### Ch 5 · Shared file systems: EFS and the four FSx
- EFS:
  - NFS for Linux, POSIX
  - Regional or One Zone
  - Standard / IA / Archive classes with lifecycle
  - Elastic (default) / Provisioned / Bursting throughput
  - mount targets are ENIs, NFS port 2049
- FSx for Windows: SMB, NTFS ACLs, AD (Managed AD or self-managed), DFS, Multi-AZ.
- FSx for Lustre: Scratch vs Persistent, S3-linked (lazy load, write back).
- FSx for ONTAP: NFS + SMB + iSCSI, SnapMirror, dedup.
- FSx for OpenZFS: ZFS, very low-latency NFS.
- Comparison table: protocol · OS · multi-AZ · trigger words · tempting wrong answer.
- ▶ Checkpoint: Windows .NET app across 2 AZs with SMB and AD → FSx for Windows Multi-AZ (EFS is the trap).

### Ch 6 · S3 and its storage classes
- S3 basics:
  - objects 0 B–5 TB; multipart recommended over 100 MB, required over 5 GB
  - strong read-after-write consistency
  - versioning + MFA Delete
  - Object Lock: governance vs compliance
  - event notifications, Batch Operations, Access Points, Requester Pays
- Class table from §6.
- ▶ **Retrieval-time chart**: horizontal log-time axis, 1 ms → 48 h, one row per class. Flexible shows its three tiers as segments. Deep Archive shows ≤12 h and ≤48 h markers. Hover shows the exact published range.
- ▶ **Minimum-duration chart**: bars for 0 / 0 / 30 / 30 / 90 / 90 / 180 days, with Express at 1 h.
- Hook: **"30 / 90 / 180 = IA / Glacier / Deep"** and **"Instant = ms · Flexible = minutes-to-hours · Deep = half a day"**.
- ▶ **Class picker**. Inputs: access (frequent / unknown-changing / ~monthly / ~quarterly / 1–2×/yr / audit only), retrieval needed (single-digit ms / ms / minutes / ≤12 h / ≤48 h), re-creatable (yes/no), retention (7 d / 30 d / 90 d / 1 y / 7 y / 10 y). Output: the winning class plus a "loses because…" line for every other class.
  - frequent → Standard
  - unknown → Intelligent-Tiering
  - single-digit ms → Express One Zone
  - exclude classes whose minimum duration exceeds retention
  - exclude One Zone unless re-creatable
  - monthly → no Glacier
  - quarterly → Glacier IR allowed, not Flexible/Deep
  - apply the retrieval-time limits
  - pick the cheapest survivor in the order Deep < Flexible < Glacier IR < One Zone-IA < Standard-IA < Standard
- ▶ **Lifecycle builder**: timeline 0 → retention. Add transitions (class + day) and an expiration. The validator flags:
  - IA before day 30
  - leaving a class before its minimum duration (early-deletion charge)
  - transitions that go "up" the waterfall
  - Deep Archive when retrieval must be minutes
  - Presets: "Quiz Q4 option B (valid)" and "Quiz Q4 option A (invalid: IA at day 7)".
- ▶ Checkpoints: Quiz Q4 (lifecycle) and "re-creatable thumbnails, instant, cheapest" → One Zone-IA.

### Ch 7 · How data moves: the six lines
- The transit map (from core.js, interactive, embedded), then the six lines with verb and "built for".
- ASCII map B ("Need to move / sync / expose data?" tree).
- ▶ **Pipe calculator**. Inputs: TB, link speed (10 Mbps–10 Gbps), usable share %, deadline days, and an "ongoing" toggle. Output: transfer time, TB/day, and a verdict (DataSync / truck / "seed offline + DataSync" when ongoing). Chart: days vs link speed (log-log) with a red deadline line and the current point. Presets: Quiz Q2 (600 TB / 50 Mbps / 21 d), Exam Q54 (250 TB / 100 Mbps), R1 (120 TB / 1 Gbps / ~50% usable, 30 d), D41 (400 TB / 10 Gbps).
- Rule: 100 Mbps ≈ 1 TB/day, 1 Gbps ≈ 10 TB/day. "Limited bandwidth but ongoing" is still DataSync (trucks don't do ongoing). Direct Connect is never provisioned for a one-off.
- ▶ Checkpoint: Quiz Q2.

### Ch 8 · DataSync vs Storage Gateway (mover vs bridge)
- DataSync: agent on-prem (none needed AWS↔AWS), scheduled/incremental, verification, a 10 Gbps link per task, any S3 class.
- Storage Gateway family:
  - S3 File Gateway (NFS/SMB → S3, local cache, can join AD for SMB)
  - FSx File Gateway (**closed to new customers**)
  - Volume Gateway cached vs stored (iSCSI; EBS snapshots)
  - Tape Gateway (VTL → Glacier/Deep Archive)
- Embedded pairs: ds-gw, vg, tape, ds-dms (from core.js `compare`).
- His misses here: Exam Q8 (picked Gateway), Exam Q41 (missed "tape"), R1, Quiz Q3 (DataSync "CDC").
- ▶ Checkpoints: Exam Q8 and the SAN-95%-full question.

### Ch 9 · Partners, trucks and the edge
- Transfer Family (SFTP/FTPS/FTP/AS2 → S3/EFS; identities from Directory Service / IdP / Lambda).
- DTT/Snow (Snow closed to new customers; DTT = reserve, bring devices, high-bandwidth upload).
- S3 Transfer Acceleration (uploads) vs CloudFront (downloads and cache).
- Embedded pairs: ds-tf, truck, ta-cf.
- His misses: Exam Q4 (TA for downloads), Exam Q12/Q54 (DataSync/DX for a truck case).
- ▶ Checkpoint: the Outposts download question.

### Ch 10 · Backups and copies
- AWS Backup:
  - many services
  - plans, vaults
  - Vault Lock (governance/compliance)
  - cross-Region and cross-account copies
  - Audit Manager
  - on-prem VMware
- DLM: EBS snapshots/AMIs only; can copy cross-Region; fastest and simplest.
- Native backups: RDS automated backups and DynamoDB PITR/on-demand are same account, same Region.
- S3: CRR/SRR (versioning required, not retroactive → Batch Replication) and Object Lock.
- Embedded pair: backup.
- His misses: Exam Q29 (DLM), Exam Q11 (AWS Backup cross-account), Quiz Q5 (Vault Lock; snapshots not in a visible bucket), R3 (one place → Backup).
- ▶ Checkpoints: Quiz Q5 and "existing objects didn't replicate".

### Ch 11 · What changed since the exam guide
- The §6 table as cards: Snow → DTT, FSx File Gateway closed, gp3 limits, Migration Hub/ADS → AWS Transform (preview of Session 2), Resolver rename.
- How to answer when a practice bank uses the old name: answer the **trigger**. "Petabytes + poor network" is the truck line whether the option says Snowball or Data Transfer Terminal. An answer set will contain one or the other.

### Ch 12 · Triggers, traps, and your record
- ▶ **Searchable trigger table** generated from the cards (phrase → service, coloured by line).
- Link to Traps.
- The session log (baseline, quiz 2/6, retest 2/3, with the lessons) and the two carry-forward rules written as he should recall them:
  - `EBS snapshots → S3 you CANNOT see → never CRR / Object Lock / "the bucket"`
  - `"one place" + ≥2 services → AWS Backup (DLM = EBS only)`
- Button: "Go to the drill (42 scenarios)".

---

## Tabs (all must exist and work)

Learn · Map · Where it lives · S3 classes (picker, both charts, lifecycle builder, table) · Compare (8 pairs) · Trigger cards (52, Leitner) · Drill (42) · Traps (15) · Cheat sheet (printable, from core.js) · Progress (charts + log).

## Done when

- All 12 chapters are present with every ▶ element working, and chapter completion is tracked.
- Everything in CONTEXT §9 step 4 passes.
- The live site matches the mockups.
