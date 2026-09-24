# SAA Transit Maps — build brief (Session 1: Storage & Data Movement)

This file is the complete spec. Everything you need is here; there is no other context.
Owner: Mitja. Studying for AWS Certified Solutions Architect – Associate (SAA-C03), ~50% on practice exams, target 80%+.
Repo: https://github.com/SoosDev/saa (empty). Publish with GitHub Pages → https://soosdev.github.io/saa/

---

## 1. What to build

A static, zero-build study site (plain HTML + CSS + vanilla JS, no framework, no bundler, no npm) that works offline-ish, on phone (390 px) and desktop (1440 px). Session 1 now; Sessions 2–13 get added later **as data files only**, so the engine must be generic.

Learning principles the UI must enforce (not optional decoration):
1. **Recall before reveal** — every card and drill hides the answer until the user commits.
2. **Stub before options** — in drills, answer options are locked until the 4-slot stub is filled.
3. **Cross-out with a reason** — user eliminates options before picking; feedback shows which stub slot or which elimination was wrong.
4. **Spaced repetition** — Leitner boxes 1→5 for trigger cards (box 1 daily, 2 every 2 days, 3 every 4, 4 every 8, 5 = known). Missed → box 1. Hesitated → stays. Knew it → +1.
5. **Interleaving** — drill order shuffled across lines by default; filters available.
6. **Dual coding** — every data-movement service is a coloured "transit line" with one verb.

## 2. Repo layout

```
/index.html                     hub: list of sessions, per-session progress read from localStorage
/.nojekyll
/README.md                      short: what this is, how to add a session
/assets/css/transit.css         all styles, tokens, both themes
/assets/js/engine.js            generic renderer: tabs, map, tree, classes, compare, cards, drill, traps, cheat
/sessions/manifest.js           window.SAA_SESSIONS = [{id:"01-storage", n:1, title:"Storage & Data Movement", domains:["D1","D2","D3","D4"], path:"sessions/01-storage/"} , …]
/sessions/01-storage/index.html thin shell: loads ../../assets/css, ../../assets/js/engine.js, ./data.js, calls SAA.mount(window.SESSION)
/sessions/01-storage/data.js    window.SESSION = { … all content below … }
```

Adding a future session must be: copy the shell `index.html`, write `data.js` against the same schema, add one entry to `manifest.js`. Sections a session doesn't have (e.g. no S3-class picker) are simply omitted from its data and the tab disappears. Document the schema in README.md.

## 3. Design system (approved by the owner — follow exactly)

**Concept: data movement as a transit map.** On-premises on the left, "the pipe" (internet · VPN · Direct Connect) in the middle, AWS on the right. Each way data moves is a line with a colour, a verb and a pattern.

Fonts (Google Fonts, one `<link>`): `Overpass` 400/600/800 (display, UI, signage), `Atkinson Hyperlegible` 400/700 (body/reading), `Overpass Mono` 400/600 (stubs, chips, cheat sheet). Fallbacks: system-ui / ui-monospace.

Tokens (light; define all in bare `:root`):
```
--ground #F2F4F6  --surface #FFFFFF  --ink #15202B  --ink2 #56626E  --rule #D5DBE1  --chip-border #B9C2CB
--zone-onprem #E9EDF1  --zone-aws #E4ECF6  --muted-fill #EEF1F4  --hl #FFF3DC
--ok #13744A  --ok-bg #E2F2E9  --bad #B3261E  --bad-bg #FBE6E4
Lines:  --ds #1D5FD1 (DataSync)  --gw #D98200 / text #A35F00 (Storage Gateway)  --tf #7A3FC4 (Transfer Family)
        --dtt #66707B dashed (DTT/Snow)  --dms #0E8466 (DMS)  --mgn #C4302A (MGN)
```
Dark theme: ground #10161C, surface #182029, ink #E6EAEE, ink2 #9AA8B4, rule #2A3540, zones #1A232C / #16243A; lighten line colours ~15% for contrast on dark (check 4.5:1 for text, 3:1 for strokes). Theme rules: bare `:root` = light; `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…} }`; `:root[data-theme="dark"] {…}`; a header toggle cycles system → light → dark and stores choice in localStorage (try/catch). `body` sets `background: var(--ground)`.

Line table (verb is the memory hook):
| id | name | colour | pattern | verb | from → to |
|---|---|---|---|---|---|
| datasync | DataSync | --ds | solid 8px | MOVES files over the network, then it's done | NAS / other cloud → S3 (any class) · EFS · FSx |
| gateway | Storage Gateway | --gw | solid 8px, station = rounded rect "GW" | BRIDGES — on-prem apps keep working, cache stays local | on-prem apps ⇄ S3 · FSx · virtual tapes |
| transfer | Transfer Family | --tf | solid | OPENS a door for partners who speak SFTP/FTPS/FTP/AS2 | partners → S3 · EFS |
| truck | DTT / Snow | --dtt | dashed 14/10, station = square | DRIVES data by road when the pipe would take weeks | portable drives → S3 |
| dms | DMS | --dms | solid | REPLICATES database rows, full load + ongoing changes (CDC) | DB engine → RDS/Aurora/S3 (CSV/Parquet) |
| mgn | MGN | --mgn | solid | REHOSTS whole servers onto EC2 | VMs/physical → EC2 |

Components: stub chips are pills ≥44 px tall, Overpass Mono 14 px, selected = ink fill + white text. Option rows: neutral (surface + rule border), crossed-out (muted fill, dashed border, line-through, reason in small text), correct (ok-bg, 2px ok border, ✓), wrong pick (bad-bg, 2px bad border, ✕). Cards radius 6–10 px, 1px rule border, no shadows. Section labels: Overpass 600, 11–12 px, uppercase, letter-spacing .1em, ink2. No emoji, no gradients, no left-accent-bar cards (except the compare card top border in line colour). Touch targets ≥44 px. Visible focus rings. `prefers-reduced-motion` respected.

Layout: desktop = header (brand "Storage Transit Map", "SAA-C03 · Session 1", mastery bar "x / N cards known", theme toggle) + top tab row (Map · Where it lives · S3 classes · Compare · Trigger cards · Drill · Traps · Cheat sheet). Phone (<760 px) = compact header + bottom tab bar with 5 items (Lines · Tree · Compare · Cards · Drill) and a "More" sheet for Classes/Traps/Cheat. Tab state in URL hash (`#drill`) so links deep-link and back button works.

## 4. Tabs — behaviour spec

### 4.1 Map
Inline SVG, viewBox `0 0 1000 744`, scales to width. Geometry (use this, it was designed and approved):
- Zones: on-prem rect x0–300 (--zone-onprem), AWS rect x700–1000 (--zone-aws). Labels "ON-PREMISES" (20,34), "THE PIPE" (500,34) + "internet · VPN · Direct Connect" (500,52), "AWS" (720,34). Footer (500,728) mono: "1 Gbps ≈ 10 TB/day · 100 Mbps ≈ 1 TB/day".
- Source stations (circle r9, white fill, ink stroke 3) at x=250, labels text-anchor end at x=232 (bold name + ink2 sub-line 16px below):
  y110 NAS / "NFS / SMB files to move"; y200 "Apps that keep running" / "NFS / SMB / iSCSI"; y290 "Tape backup app" / "Veeam, NetBackup…"; y380 "External partners" / "SFTP / FTPS / FTP / AS2"; y470 "Database" / "Oracle, PostgreSQL, MySQL"; y560 "Servers / VMs" / "lift-and-shift"; y650 "Portable drives" / "100s of TB, thin pipe".
- Paths: DataSync `M250 110 H470 L510 150 H742` label (276,96) "DATASYNC — network mover", sub (530,138) "→ S3 (any class) · EFS · FSx". Gateway: `M250 200 H285 L318 236`, `M250 290 H285 L318 254`, GW rect x318 y228 w60 h34, `M378 245 H742`, label (420,233). Transfer: `M250 380 H560 L640 300 H742` and branch `M560 380 H600 L640 340 H742`, label (300,368). DMS `M250 470 H560 L610 520 H742` label (300,458). MGN `M250 560 H560 L610 610 H742` label (300,548). Truck dashed `M250 650 H440 L480 690 H742`, DTT square at (567,677) 26×26, label above "DTT facility / Snow device", line label (300,638).
- AWS side: S3 interchange pill rect x742 y128 w28 h184 rx14; lifecycle branch `M770 150 H830 V240` with stops at y150 "Standard-IA · 30 d", y195 "Glacier · 90 d", y240 "Deep Archive · 180 d" (labels x844); "S3" (784,286) 22px bold + "lifecycle →" (784,304). Stations: EFS (756,340) "EFS · Linux NFS"; RDS/Aurora (756,520) + "or S3 as CSV / Parquet"; EC2 (756,610) "EC2 · rehosted"; S3 bulk import (756,690).
- Interaction: click/tap a line or its label (large invisible hit-stroke 24px) → that line full opacity, others 0.22, stations not on it 0.4. Side panel (desktop right 352px; phone bottom sheet) shows: name in line colour, verb, "Built for", "Exam says" chips, "Switch lines when" rows (dot in the other line's colour + condition → line name, clickable to switch), "Your misses on this line" (from drills tagged with that line and `mine:true`), button "Drill <line> · n scenarios" → Drill tab filtered to that line. Keyboard: lines are focusable (tabindex 0, Enter selects). Phone Lines tab shows the 6 line cards (mini line stroke + name + verb + from→to) with "Full map" link.

### 4.2 Where it lives (decision stepper)
One question at a time, answers as big buttons, breadcrumb of chosen answers, result card with service + key facts + "why not the neighbours". Tree:
```
What does the application expect?
├ A disk (boot volume, DB files, "block") → Must survive stop/terminate?
│   ├ yes → What matters most?
│   │    ├ general purpose, cost → EBS gp3
│   │    ├ highest IOPS, lowest latency, mission-critical DB → EBS io2 Block Express
│   │    ├ big sequential throughput (logs, big data) → EBS st1
│   │    └ coldest, cheapest, rarely read → EBS sc1
│   └ no, temp scratch, fastest, loss OK → Instance store
├ A shared folder (mount, many instances) → Which OS / need?
│   ├ Linux / NFS / thousands of instances / multi-AZ → EFS
│   ├ Windows / SMB / Active Directory / DFS → FSx for Windows File Server
│   ├ HPC / ML / "process S3 data at high throughput" → FSx for Lustre
│   ├ NetApp / SnapMirror / NFS+SMB+iSCSI on one FS → FSx for NetApp ONTAP
│   └ ZFS / lowest-latency NFS → FSx for OpenZFS
└ Objects over HTTP (backups, media, data lake, static site) → S3 → "pick a class" (link to 4.3)
```
Fact cards (show on result):
- EBS: AZ-scoped; attach only in same AZ; move AZ/Region = snapshot → copy → new volume; one instance at a time except io1/io2 Multi-Attach (same AZ, Nitro, up to 16, needs cluster-aware FS); snapshots incremental, stored in S3 you cannot see (so never S3 CRR / Object Lock "the snapshot bucket"); encrypt an unencrypted volume = snapshot → copy with encryption → new volume; root volume DeleteOnTermination true by default; Fast Snapshot Restore removes first-read latency; Elastic Volumes change size/type/IOPS live; replicated within one AZ only — durable ≠ multi-AZ.
- EFS: NFS, Linux, POSIX; Regional (multi-AZ) or One Zone; Standard / IA / Archive classes + lifecycle; pay per GB used; throughput modes Elastic (default) / Provisioned / Bursting; mount targets are ENIs → SGs, port 2049.
- FSx Windows: SMB, AD, Multi-AZ option, DFS namespaces, quotas, shadow copies. Lustre: Scratch vs Persistent, links to an S3 bucket (lazy-load, write back). ONTAP: NFS+SMB+iSCSI, snapshots, SnapMirror from on-prem NetApp, dedup/compression. OpenZFS: the word ZFS.
- S3: objects 0 B–5 TB; multipart recommended >100 MB, required >5 GB; strong read-after-write consistency; versioning + MFA Delete; Object Lock WORM (governance vs compliance); Transfer Acceleration = uploads via edge; event notifications → SQS/SNS/Lambda/EventBridge; Batch Operations; Access Points.

### 4.3 S3 classes (interactive picker)
Controls: access frequency (frequent / unknown-changing / monthly-ish / quarterly / 1–2× per year / never unless audit), retrieval time needed (ms / minutes / hours / ≤12 h / ≤48 h), data re-creatable? (yes/no), retention (days slider or presets 7 d / 30 d / 90 d / 1 y / 7 y / 10 y). Output: winning class highlighted in the table below + one sentence why + for each other class one line "loses because …" (min-duration violated, retrieval too slow, single AZ for non-recreatable, paying for ms you don't need, monitoring fee for a known pattern…). Plus a lifecycle builder: drag/tap to add transitions; validator flags "IA before day 30", "Glacier min 90 d", "Deep min 180 d".
Table (verified against AWS storage-classes page):
| Class | AZs | Min duration | Retrieval | Exam says |
|---|---|---|---|---|
| Standard | ≥3 | — | ms | default, frequent |
| Intelligent-Tiering | ≥3 | — | ms (opt-in archive tiers: min–hrs); no retrieval fee; small monitoring fee per object ≥128 KB | unknown / changing access, least ops |
| Standard-IA | ≥3 | 30 d | ms, per-GB fee | infrequent but instant |
| One Zone-IA | 1 | 30 d | ms, per-GB fee | re-creatable / secondary copy, cheapest instant |
| Glacier Instant Retrieval | ≥3 | 90 d | ms, per-GB fee | ~quarterly access, still needs ms |
| Glacier Flexible Retrieval | ≥3 | 90 d | Expedited 1–5 min · Standard 3–5 h · Bulk 5–12 h | archive, minutes–hours OK |
| Glacier Deep Archive | ≥3 | 180 d | Standard ≤12 h · Bulk ≤48 h | 7–10 yrs, 1–2×/yr, cheapest |
| Express One Zone | 1 | 1 h | single-digit ms | ML/analytics, very high request rates |
Rules card: "30 / 90 / 180 = IA / Glacier / Deep"; "Instant = ms · Flexible = min–hrs · Deep = half a day"; lifecycle can also expire noncurrent versions and abort incomplete multipart uploads (cost trap).

### 4.4 Compare (8 pairs)
Pill picker of pairs; each pair = side-by-side cards (top border in line colour) with a mini SVG (on-prem box ↔ AWS box, arrow direction, cache box where relevant), then rows: Job · Deciding words · Lands in · Tempting wrong answer · Can both be right?; then a one-question quick check with 2–3 buttons and instant feedback.
1. **DataSync vs S3 File Gateway** — mover vs bridge. DataSync: one way, data leaves, job ends; words: migrate, archive to, within a month, scheduled copy. Gateway: both ways, apps stay, local cache; words: keep accessing, low latency, hybrid. Both: DataSync to migrate, then File Gateway for ongoing access. Check: "Free up on-prem space; history is read-only, never needed on-prem again." → DataSync.
2. **DataSync vs Transfer Family** — you own both ends vs the other party owns one end and speaks SFTP/FTPS/FTP/AS2. Wrong answer: SFTP server on EC2 (more ops). Check: "300 suppliers upload via FTP and can't change tooling." → Transfer Family.
3. **Volume Gateway cached vs stored** — cached: cloud primary, hot subset local ("running out of on-prem storage"); stored: on-prem primary, async snapshots to S3 ("low latency to the entire dataset + cloud backup/DR"). Both give EBS snapshots usable in AWS. Check: "SAN is 95% full; keep recently used blocks fast." → cached.
4. **Tape Gateway vs S3 + lifecycle** — backup software can only write to a tape library; Tape Gateway presents a VTL and archives to Glacier/Deep Archive. Check: "Veeam writes to tape today; keep 10 years." → Tape Gateway.
5. **DataSync vs DMS** — files vs database rows. Source is a DB engine + "ongoing changes" → DMS full load + CDC, even if target is S3 CSV/Parquet. DataSync can't read a database. Check: "Replicate on-prem MySQL changes continuously to S3 as CSV." → DMS.
6. **DTT/Snow vs DataSync vs Direct Connect** — pipe rule. Weeks at current bandwidth + one-off → truck. DX takes weeks to provision, bills monthly: never for a one-off. DataSync creates no bandwidth. If a fat link already exists, DataSync. Check: "400 TB, 200 Mbps, needed in 3 weeks." → DTT.
7. **S3 Transfer Acceleration vs CloudFront vs DataSync** — TA = many clients UPLOADING to one bucket from far away; CloudFront = many clients DOWNLOADING, cached, signed URLs; DataSync = server-to-storage bulk copy. Check: "Outposts servers worldwide repeatedly download the same update files." → CloudFront.
8. **AWS Backup vs DLM vs native backups** — DLM: EBS snapshots/AMIs only, zero setup, can copy cross-region; AWS Backup: one place for EBS/EC2/RDS/Aurora/DynamoDB/EFS/FSx/S3/Storage Gateway/VMware, backup plans, vaults, Vault Lock (WORM), cross-region AND cross-account copies, Backup Audit Manager; native DynamoDB on-demand/PITR and RDS automated backups are same account, same Region. Check: "Copy DynamoDB backups to another account for long-term retention." → AWS Backup.

### 4.5 Trigger cards (Leitner, localStorage key `saa:<sessionId>:cards`)
Front = exam phrase. Tap to reveal back = service (in its line colour, line name as eyebrow), 1–2 sentence why, "Tempting:" wrong answer + why (red), source tag if from the owner's misses. Buttons: Missed (→ box 1) / Hesitated (stay) / Knew it (→ next box). Header: "n due today", box counts 1–5. Modes: Due (default), All shuffled, Only my misses. Reset button (confirm inline, not `confirm()`).
Cards (front → back · tempting):
- on-prem NFS/SMB, migrate/copy/sync over the network → DataSync · Storage Gateway (bridge, not mover)
- other cloud (Azure Blob, Google Cloud Storage) → S3 → DataSync · Transfer Family
- on-prem apps keep using files with low latency, S3 behind → S3 File Gateway · DataSync
- Windows shares, SMB, AD, on-prem cache of cloud file system → FSx File Gateway · S3 File Gateway
- iSCSI, SAN running out of space, keep hot data local → Volume Gateway (cached) · stored
- iSCSI, need whole dataset local, async backup to AWS → Volume Gateway (stored) · cached
- tape, backup software, VTL → Tape Gateway → Glacier Deep Archive · S3 + lifecycle
- partners upload via SFTP/FTPS/FTP/AS2, can't change tooling → Transfer Family · SFTP on EC2
- hundreds of TB, would take weeks at current bandwidth, one-off → Data Transfer Terminal (older banks: Snow Family) · Direct Connect
- limited bandwidth but ONGOING sync → DataSync with bandwidth throttling · Snow (trucks don't do ongoing)
- database engine, ongoing replication, CDC → DMS full load + CDC · DataSync
- different database engine (Oracle → Aurora PostgreSQL) → SCT for schema + DMS for data · DMS alone
- lift-and-shift servers/VMs → MGN (Application Migration Service) · DMS
- global users upload large files to one bucket → S3 Transfer Acceleration · CloudFront
- global users download the same files, cache, signed URLs → CloudFront · Transfer Acceleration
- copy backups to another account/Region, central policy, many services → AWS Backup · DLM
- automate EBS snapshots, simplest, EBS only → Data Lifecycle Manager · AWS Backup (overkill) / cron + CLI
- backups must be undeletable even by admins → AWS Backup Vault Lock (compliance mode) · IAM deny policy
- objects must be WORM for N years, even root can't delete → S3 Object Lock compliance mode (+ versioning) · governance mode
- replicate new objects to another Region automatically → S3 CRR (versioning on both buckets) · DataSync
- CRR enabled but existing objects didn't copy → S3 Batch Replication · re-enable versioning
- thousands of Linux instances share files across AZs → EFS · EBS Multi-Attach
- Windows .NET app, SMB shares, AD ACLs → FSx for Windows File Server · EFS
- HPC / ML / genomics, process S3 data at high throughput → FSx for Lustre (linked to S3) · EFS
- NetApp, SnapMirror, NFS+SMB+iSCSI on one file system → FSx for NetApp ONTAP · FSx for Windows
- the word ZFS → FSx for OpenZFS · EFS
- unknown / changing access pattern, no retrieval fees, least ops → S3 Intelligent-Tiering · Standard-IA
- re-creatable data, infrequent, instant, cheapest → S3 One Zone-IA · Standard-IA
- retain 7–10 years, read 1–2× per year, retrieval ≤12 h OK → Glacier Deep Archive · Glacier Flexible
- archive, but occasionally needed within minutes → Glacier Flexible Retrieval (Expedited) · Deep Archive
- archive accessed ~quarterly, needs milliseconds → Glacier Instant Retrieval · Standard-IA
- single-digit ms object latency, very high request rate → S3 Express One Zone · S3 Standard
- boot volume / general EC2 disk, cost-effective → EBS gp3 · gp2
- mission-critical DB on EC2, highest IOPS, sub-ms latency → EBS io2 Block Express · gp3
- big sequential reads (logs, big data), cheap → EBS st1 · sc1
- temporary scratch, fastest disk, loss OK → Instance store · EBS
- encrypt an existing unencrypted EBS volume → snapshot → copy with encryption → new volume · "enable encryption on the volume" (impossible in place)
- share an encrypted snapshot with another account → re-encrypt with a customer managed KMS key, share key + snapshot · AWS managed key (can't be shared)
- EBS volume in another AZ → snapshot → create volume in target AZ · attach directly (EBS is AZ-scoped)
- where do EBS snapshots live? → in S3 storage you cannot see (no bucket to replicate or lock) · "the snapshot bucket"
- RDS Multi-AZ failover mechanism → DNS CNAME flips to the standby · IP address moves
- "one place" to manage backups of EC2 + RDS + EFS → AWS Backup · DLM
- incomplete multipart uploads silently cost money → lifecycle rule AbortIncompleteMultipartUpload · delete bucket versions
- lifecycle transition to Standard-IA at day 15 → invalid, IA needs ≥30 days in Standard · valid
- AWS Snow Family for new customers today → no longer orderable by new customers; offline bulk = Data Transfer Terminal · Snowball Edge
- pipe rule → 100 Mbps ≈ 1 TB/day · 1 Gbps ≈ 10 TB/day
- DataSync can write straight to which S3 classes? → any, including Glacier Deep Archive · "Standard only, then lifecycle"
- NFS on Windows? → no: EFS is Linux/NFS; Windows/SMB = FSx for Windows · EFS

### 4.6 Drill (localStorage key `saa:<sessionId>:drill`)
Flow per scenario (one screen):
1. Scenario text with key phrases highlighted **only after submission** (before: plain text, so the user must find them).
2. **Stub**: 4 slots, chip choices; options locked until all 4 set.
   - SIZE/NET: `fits the pipe` · `weeks+ online` · `not about transfer`
   - TIME: `one-off` · `ongoing`
   - PROTOCOL/APP: `NFS/SMB` · `iSCSI/block` · `tape` · `SFTP/FTP/AS2` · `database` · `servers` · `objects/HTTP` · `AWS-internal`
   - SUPERLATIVE: `cheapest` · `least ops` · `fastest` · `most durable/compliant` · `none stated`
3. **Options**: each row has "Cross out" (then pick a reason chip from 4–5 generic reasons: violates SIZE/TIME/PROTOCOL/SUPERLATIVE, wrong service for the job, not possible/false fact) and "Choose". Multi-select scenarios say "Select TWO".
4. **Submit** → option states (correct/wrong pick/crossed), stub check per slot (✓/✕ vs the truth; a slot marked `any` accepts anything), highlighted deciding words, explanation, per-option "why wrong", error tag suggestion (F fact · C confused · K keyword · R misread · A reasoning · L limit) the user can confirm.
5. Stats: accuracy overall and per line, last 20 results, "weakest stub slot" (most ✕).
Filters: All (shuffled) · By line · Only my misses (`mine:true`) · Not yet correct. Keyboard: 1–4 choose, X cross out, Enter submit.

### 4.7 Traps
List of trap cards (red eyebrow "TRAP", title, one-line explanation, link to the drill(s) that test it).
- Gateway for migration — Storage Gateway is a bridge; data leaving on-prem for good → DataSync.
- Direct Connect as a transfer service — weeks to provision, monthly bill; never a one-off transfer.
- Transfer Acceleration for downloads — TA speeds uploads and caches nothing; downloads → CloudFront.
- EBS as shared storage — Multi-Attach is niche (same AZ, io1/io2, cluster FS); shared files → EFS/FSx.
- EFS for Windows — EFS is NFS/Linux; "Windows" or "SMB" → FSx for Windows.
- Glacier without checking retrieval time — "minutes" rules out Deep Archive; "milliseconds" rules out Flexible.
- IA before day 30 — lifecycle to IA at day 15 is invalid.
- DLM vs AWS Backup — cross-account / many services / compliance → AWS Backup; EBS only, fastest → DLM.
- Replication isn't retroactive — CRR needs versioning and copies only new objects unless Batch Replication.
- Durable ≠ highly available — EBS replicates inside one AZ; AZ down = volume unavailable.
- Encrypted snapshot sharing — AWS managed key can't be shared cross-account; use a customer managed key.
- EBS snapshots aren't in a bucket you can see — no CRR, no Object Lock on "the snapshot bucket".
- Service outside its job — an option that uses a service for something it wasn't built for (Transfer Family "moving ENIs", Network Firewall "detaching interfaces", Global Accelerator for single-Region downloads) is wrong regardless of the rest of the sentence.
- Option describes the right capability on the wrong service — e.g. "DataSync full-load and CDC task". Check the service, not the verbs.
- Snow in old question banks — same trigger as Data Transfer Terminal; an answer set will contain one or the other.

### 4.8 Cheat sheet
Monospace block, print stylesheet (`@media print`: hide nav, black on white, fits one A5/half-letter). Content exactly:
```
STORAGE = WHERE (A) or HOW (B)?
A WHERE:  disk → EBS (1 AZ, 1 instance, snap→S3)   | tmp → instance store
          folder Linux → EFS (NFS, multi-AZ)         | Windows → FSx Win (SMB/AD)
          HPC → FSx Lustre | NetApp → FSx ONTAP | ZFS → FSx OpenZFS
          objects → S3     30/90/180 = IA/Glacier/Deep ; unknown → Int-Tiering
B HOW:    NET files      → DataSync        (migrate/sync)
          HYBRID keep    → Storage Gateway (File S3/FSx, Volume cached/stored, Tape)
          PARTNERS       → Transfer Family (SFTP/FTPS/FTP/AS2)
          TRUCK          → DTT / Snow      (weeks at current bandwidth)
          DB             → DMS (+SCT)      | SERVERS → MGN
          UPLOAD far     → S3 Transfer Accel | DOWNLOAD cache → CloudFront
          COPY x-acct/x-region, many svcs → AWS Backup | EBS only, fastest → DLM
          S3 → S3 region → CRR (versioning!)
KEY:  Network=DataSync  Bridge=Gateway  Tape=TapeGW→Deep  Truck=DTT/Snow
      DB=DMS  Servers=MGN  Partners=Transfer  X-account=Backup
NEVER: DX for one-off transfer · Gateway for migration · TA for download ·
       EFS for Windows · IA before 30d · Deep Archive when "minutes"
EBS snapshots → S3 you CANNOT see → never CRR / Object Lock / "the bucket"
"one place" + ≥2 services → AWS Backup  (DLM = EBS only)
PIPE: 100 Mbps ≈ 1 TB/day · 1 Gbps ≈ 10 TB/day
```
Also show the **reduction method** at the top of the Drill tab (collapsible):
```
1. Strip the story. Keep DATA nouns and MOVE / STORE / ACCESS verbs.
2. Fill the stub: SIZE/NET · TIME · PROTOCOL/APP · SUPERLATIVE.
3. For EACH option: "what problem was this service BUILT for?" No match → cross out.
4. Among survivors, the one that satisfies the SUPERLATIVE wins.
```

## 5. Drill bank (41 scenarios)

Stub truth uses the chip values above; `any` = accept any value. `mine` = the owner got it wrong before (show "you missed this" eyebrow). `line` = primary line for filtering (datasync, gateway, transfer, truck, dms, mgn, backup, where, classes, edge). Keep option text verbatim; you may tighten scenario wording but not change facts.

**D01 · quiz Q1 · line: gateway**
A company runs a Windows CAD application on-premises. Designers open large files from a local SMB share all day; 40 TB and growing. The company wants the authoritative copy in AWS, LAN-speed access for designers, and existing Active Directory permissions. LEAST operational overhead?
A. Migrate the share to EFS with DataSync; mount EFS from on-prem over VPN. — ✗ EFS is NFS/Linux, not SMB/AD; VPN latency kills "LAN speed".
B. Deploy Amazon FSx File Gateway on-premises backed by FSx for Windows File Server. ✓
C. Deploy S3 File Gateway; designers access via NFS. — ✗ Windows/SMB/AD users; NFS and S3 objects don't carry AD ACLs the same way.
D. Transfer Family SFTP for upload/download. — ✗ Partner door, not a mounted share.
Stub: SIZE any · TIME ongoing · PROTO NFS/SMB · SUP least ops. Deciding: "Windows", "SMB", "Active Directory", "keep opening". Answer B.

**D02 · quiz Q2 · mine · line: truck**
A research lab must upload 600 TB from portable drives at a remote field station with a 50 Mbps satellite link. Needed in S3 within three weeks, one-time. Fastest and most cost-effective?
A. DataSync agent at the station, throttling off. — ✗ 50 Mbps ≈ 0.5 TB/day → ~1,200 days.
B. Provision 1 Gbps Direct Connect to the station. — ✗ Weeks to provision, monthly cost, one-off job.
C. Bring the drives to an AWS Data Transfer Terminal and upload to S3. ✓
D. S3 Transfer Acceleration + multipart. — ✗ Optimises use of bandwidth, creates none.
Stub: SIZE weeks+ · TIME one-off · PROTO any · SUP fastest. Deciding: "600 TB", "50 Mbps", "three weeks". Answer C. Tag K (didn't fill SIZE slot).

**D03 · quiz Q3 · mine · line: dms · Select TWO**
On-prem PostgreSQL must move to Aurora PostgreSQL with <1 hour downtime. After cutover, nightly Parquet exports of the same data to S3 are required.
A. DataSync full-load and CDC task from PostgreSQL to Aurora. — ✗ DataSync moves files; it cannot read a database. Right capability, wrong service.
B. DMS full-load plus CDC task PostgreSQL → Aurora. ✓
C. MGN to replicate the DB server, then cut over. — ✗ Rehosts a server on EC2, not into Aurora.
D. DMS task with S3 target, Parquet output. ✓
E. Global Accelerator in front of Aurora. — ✗ Prestige distractor; nothing to do with replication.
Stub: SIZE any · TIME ongoing · PROTO database · SUP none stated. Deciding: "PostgreSQL database", "under one hour of downtime" (forces CDC), "Parquet". Answer B, D.

**D04 · quiz Q4 · mine · line: classes**
Logs land in S3 at 2 TB/day: heavy queries for 7 days, occasional for the next 60 days, retrievable within 12 hours for audits for 5 years, then deleted. Lowest cost?
A. Standard → Standard-IA day 7 → Deep Archive day 67 → expire 5 y. — ✗ IA needs ≥30 days first.
B. Standard → Standard-IA day 30 → Deep Archive day 90 → expire 5 y. ✓
C. Standard → Glacier Flexible day 7 → expire 5 y. — ✗ Occasional reads until ~day 67 pay retrieval fees/waits; 12 h fits Deep Archive, cheaper than Flexible.
D. Intelligent-Tiering 5 y. — ✗ Monitoring fee for a fully known pattern.
Stub: SIZE not about transfer · TIME ongoing · PROTO objects/HTTP · SUP cheapest. Deciding: "occasionally during the following 60 days", "within 12 hours", "lowest cost". Answer B.

**D05 · quiz Q5 · mine · line: backup**
A 3 TB EBS volume in us-east-1a holds a licensing DB. Regulator: an encrypted copy of every daily backup in a separate account in a different Region, 7 years, impossible to delete early even by admins.
A. DLM daily snapshots, share with the other account. — ✗ Share is not a locked copy; no retention lock.
B. AWS Backup plan copying to a vault in the other account + Region; Backup Vault Lock in compliance mode. ✓
C. EBS Multi-Attach to an instance in the other account via peering. — ✗ Same AZ, same account; not a backup.
D. S3 CRR with Object Lock on the bucket holding the snapshots. — ✗ EBS snapshots aren't in a bucket you can see.
Stub: SIZE any · TIME ongoing · PROTO AWS-internal · SUP most durable/compliant. Deciding: "separate account", "different Region", "impossible to delete even by admins". Answer B.

**D06 · quiz Q6 · line: where**
400 render nodes read a 200 TB dataset in S3; I/O bound. Moving the pipeline to EC2; needs sub-millisecond file access without rewriting to the S3 API.
A. EFS Max I/O, synced from S3 with DataSync. — ✗ Extra copy + sync job; not the HPC-optimised choice.
B. FSx for Lustre linked to the S3 bucket. ✓
C. FSx for Windows + DFS. — ✗ Linux render nodes, SMB/Windows FS.
D. S3 Express One Zone through Volume Gateway. — ✗ Volume Gateway is on-prem iSCSI; nonsense combo.
Stub: SIZE not about transfer · TIME ongoing · PROTO NFS/SMB (file) · SUP fastest. Deciding: "sub-millisecond", "I/O bound", "S3", "without rewriting". Answer B.

**D07 · retest R1 · mine · line: datasync**
A law firm keeps 120 TB of scanned files on an NFS NAS. 1 Gbps, 70% busy in business hours. Files older than two years are never edited and must be out of the NAS within a month; lawyers' access to recent files must not change. MOST cost-effective?
A. DTT reservation, ship the NAS. — ✗ 120 TB ≈ 12 days at 1 Gbps; fits the pipe.
B. DataSync agent; scheduled task filtered to files >2 y, straight to Glacier Deep Archive, throttled in business hours. ✓
C. S3 File Gateway; migrate old files through it; lifecycle to Deep Archive after 180 days. — ✗ Bridge not mover; parks 120 TB in Standard for 180 days.
D. Direct Connect + DataSync to Standard-IA. — ✗ DX for a one-off; IA dearer than Deep Archive.
Stub: SIZE fits the pipe · TIME one-off · PROTO NFS/SMB · SUP cheapest. Deciding: "within a month", "never edited". Answer B. Tag R.

**D08 · retest R2 · line: transfer**
300 suppliers deliver daily files to an on-prem FTP server; several can't change tooling. Files must land in S3, the server must be decommissioned, supplier credentials in existing Microsoft AD. LEAST ops?
A. FTP on an EC2 Auto Scaling group writing to S3, Lambda authorizer for AD. — ✗ Self-managed servers.
B. Transfer Family FTP/FTPS endpoint in the VPC, S3 backend, AWS Directory Service auth. ✓
C. DataSync agent on the FTP server, hourly to S3, keep the server. — ✗ Keeps the server they want gone.
D. S3 File Gateway, suppliers use NFS over client VPN. — ✗ NFS ≠ FTP; suppliers can't change tooling.
Stub: SIZE any · TIME ongoing · PROTO SFTP/FTP/AS2 · SUP least ops. Deciding: "cannot change their tooling", "FTP", "decommission". Answer B.

**D09 · retest R3 · line: backup**
Oracle on EC2 with a 2 TB io2 volume in eu-west-1. Nightly application-consistent backup restorable in eu-central-1 within 4 h; retention for this volume, its RDS instances and EFS file systems managed in one place.
A. DLM nightly snapshots copied to eu-central-1. — ✗ EBS/AMI only; fails "RDS and EFS in one place".
B. AWS Backup plan covering EC2, RDS, EFS with cross-Region copy. ✓
C. S3 CRR on the bucket storing the snapshots. — ✗ No visible snapshot bucket.
D. DataSync nightly copy of the volume's files to EFS in eu-central-1. — ✗ Not a backup of a DB volume; not "one place".
Stub: SIZE any · TIME ongoing · PROTO AWS-internal · SUP none stated. Deciding: "managed in one place", "RDS", "EFS". Answer B.

**D10 · exam Q8 · mine · line: datasync**
On-prem storage holds historical records and active data; active data grows fast and capacity is nearly exhausted. Move the historical records to AWS. Best for cost and operational management?
A. DataSync → S3 Standard; lifecycle to Deep Archive after 30 days. — ✗ Pays Standard for 30 days needlessly.
B. Storage Gateway → Glacier; lifecycle Standard → Deep Archive after 30 days. — ✗ Bridge, not mover.
C. DataSync → S3 Glacier Deep Archive directly. ✓
D. Storage Gateway → Deep Archive. — ✗ Bridge, not mover.
Stub: SIZE fits the pipe · TIME one-off · PROTO NFS/SMB · SUP cheapest. Deciding: "move the historical records", "free up space". Answer C.

**D11 · exam Q12 · mine · line: truck**
Move an 80 TB data warehouse to the cloud; current bandwidth would take 2 months. Most cost-effective quick upload?
A. Data Transfer Terminal ✓  B. DataSync — ✗ still limited by bandwidth  C. Volume Gateway — ✗ hybrid block access, not bulk move  D. Direct Connect — ✗ provisioning time + ongoing cost for a one-off
Stub: SIZE weeks+ · TIME one-off · PROTO any · SUP fastest. Deciding: "would take 2 months". Answer A.

**D12 · exam Q29 · mine · line: backup**
Automate backups of all EBS volumes on EC2 ASAP; cost-effective and simple to maintain. Fastest and most cost-effective?
A. EBS snapshot retention rule in AWS Backup. — ✗ Works, but central multi-service tool is more than needed here (per source provider).
B. Scheduled job calling create-snapshot via CLI. — ✗ Custom scripting.
C. Amazon Data Lifecycle Manager. ✓
D. Storage Gateway with EBS as source, backups on-prem. — ✗ Nonsense.
Stub: SIZE not about transfer · TIME ongoing · PROTO AWS-internal · SUP least ops. Deciding: "EBS volumes" only, "as soon as possible", "simple". Answer C.

**D13 · exam Q41 · mine · line: gateway**
On-prem tape backups; preserve backups for up to 10 years in the cloud, accessed once or twice a year. Most cost-effective?
A. Storage Gateway, transition to Glacier Deep Archive. ✓ (Tape Gateway)
B. Storage Gateway directly to Glacier Flexible Retrieval. — ✗ Works but dearer than Deep Archive.
C. S3 + lifecycle to Glacier. — ✗ Backup software can't write to a bucket; not Deep Archive.
D. Data Transfer Terminal to Glacier Flexible. — ✗ One-off physical move, not an ongoing tape replacement.
Stub: SIZE any · TIME ongoing · PROTO tape · SUP cheapest. Deciding: "tape backup", "10 years", "once or twice a year". Answer A. Tag K.

**D14 · exam Q54 · mine · line: truck**
250 TB of archived media on portable storage; 100 Mbps line. Import to S3. FASTEST and MOST COST-EFFECTIVE?
A. Data Transfer Terminal ✓  B. Upload directly — ✗ ~250 days  C. Direct Connect — ✗ one-off  D. Transfer Acceleration — ✗ no extra bandwidth
Stub: SIZE weeks+ · TIME one-off · PROTO any · SUP fastest. Deciding: "250 TB", "100 Mbps". Answer A.

**D15 · exam Q56 · mine · line: dms**
On-prem MySQL must be replicated to S3 as CSV; after the full copy, ongoing changes streamed continually. Little management overhead, highly secure.
A. SCT to convert to CSV; MGN for ongoing changes. — ✗ SCT converts schemas; MGN rehosts servers.
B. DataSync to S3 + DTT for ongoing changes, custom KMS key. — ✗ DataSync can't read a DB; DTT is physical.
C. DMS full load + CDC task; CA certificate, DMS endpoint with SSL. ✓
D. DMS full-load only; SSL endpoint via Network Firewall. — ✗ No CDC; Network Firewall doesn't create endpoints.
Stub: SIZE any · TIME ongoing · PROTO database · SUP least ops. Deciding: "MySQL", "ongoing changes", "CSV". Answer C.

**D16 · exam Q11 · mine · line: backup**
EKS app uses DynamoDB (+DAX) in us-east-1. Keep DB calls off the public internet; automated cross-account backup for long-term retention.
A. DynamoDB interface endpoint + PITR restorable in another account. — ✗ PITR is same account/Region; (also: the classic answer is the gateway endpoint).
B. Gateway endpoint + NACL rule + native on-demand backups cross-account. — ✗ On-demand backups can't be copied cross-account natively.
C. Interface endpoint + Network Firewall + Timestream PITR. — ✗ Nonsense combo.
D. DynamoDB gateway endpoint on the route table + AWS Backup copying backups to another account. ✓
Stub: SIZE not about transfer · TIME ongoing · PROTO AWS-internal · SUP most durable/compliant. Deciding: "cross-account backup", "long-term retention". Answer D.

**D17 · exam Q4 · mine · line: edge**
Outposts servers worldwide repeatedly download multi-file software updates from an S3 bucket in us-west-2; distribution is slow. Reduce latency with minimal ops.
A. CloudFront with a secondary origin and CachingDisabled + signed URLs. — ✗ Disabling caching removes the benefit.
B. Global Accelerator to edge, then private VIF to S3. — ✗ Prestige distractor; not an S3 download cache.
C. CloudFront with the bucket as origin + signed URLs. ✓
D. S3 Transfer Acceleration endpoint for downloads. — ✗ TA is for uploads; no caching.
Stub: SIZE not about transfer · TIME ongoing · PROTO objects/HTTP · SUP least ops. Deciding: "download", "frequently", "worldwide". Answer C.

**D18 · line: gateway**
An on-prem iSCSI SAN is 95% full. The company wants primary data in AWS while keeping recently accessed blocks on-prem with low latency. Which solution?
A. Volume Gateway, cached volumes. ✓  B. Volume Gateway, stored volumes — ✗ keeps the full dataset on-prem (doesn't free space)  C. S3 File Gateway — ✗ NFS/SMB, not iSCSI block  D. DataSync to EBS — ✗ DataSync doesn't target EBS; not ongoing block access
Stub: SIZE any · TIME ongoing · PROTO iSCSI/block · SUP none stated. Deciding: "iSCSI", "95% full", "primary data in AWS". Answer A.

**D19 · line: gateway**
A trading desk needs low-latency access to its entire 20 TB iSCSI dataset on-prem, with point-in-time backups to AWS it could restore as EBS volumes during a disaster.
A. Volume Gateway stored volumes ✓  B. Volume Gateway cached volumes — ✗ only a hot subset local  C. Tape Gateway — ✗ backup app/VTL, not live block access  D. FSx File Gateway — ✗ SMB file, not iSCSI block
Stub: SIZE any · TIME ongoing · PROTO iSCSI/block · SUP fastest. Deciding: "entire dataset", "low latency", "restore as EBS". Answer A.

**D20 · line: datasync**
A company must copy 300 TB from Azure Blob Storage to S3 and keep new files synchronised weekly for three months during a migration. LEAST operational overhead?
A. AWS DataSync with a scheduled task ✓  B. Transfer Family SFTP — ✗ partner door, Azure isn't an SFTP client  C. S3 File Gateway in Azure — ✗ bridge for on-prem apps  D. Data Transfer Terminal — ✗ trucks don't do weekly sync
Stub: SIZE fits the pipe · TIME ongoing · PROTO objects/HTTP · SUP least ops. Deciding: "Azure Blob", "synchronised weekly". Answer A.

**D21 · line: where**
A .NET application runs on Windows EC2 instances in two AZs and needs a shared file system with SMB and Active Directory ACLs that survives an AZ failure.
A. FSx for Windows File Server, Multi-AZ ✓  B. EFS Regional — ✗ NFS/Linux  C. EBS io2 Multi-Attach — ✗ single AZ, cluster FS required  D. S3 File Gateway on EC2 — ✗ on-prem bridge, needless hop
Stub: SIZE not about transfer · TIME ongoing · PROTO NFS/SMB · SUP most durable/compliant. Deciding: "Windows", "SMB", "Active Directory", "two AZs". Answer A.

**D22 · line: where**
Thousands of Linux containers across three AZs need shared POSIX storage; data size is unpredictable; LEAST operational overhead.
A. EFS (Regional, Elastic throughput) ✓  B. EBS io2 Multi-Attach — ✗ one AZ, max 16 instances  C. FSx for Windows — ✗ SMB  D. Instance store — ✗ ephemeral, not shared
Stub: SIZE not about transfer · TIME ongoing · PROTO NFS/SMB · SUP least ops. Deciding: "thousands", "Linux", "three AZs", "unpredictable size". Answer A.

**D23 · line: where**
A company runs NetApp ONTAP on-prem, replicates with SnapMirror, and serves NFS and SMB from the same volumes. It wants the same capabilities managed in AWS with minimal changes.
A. FSx for NetApp ONTAP ✓  B. FSx for Windows — ✗ SMB only, no SnapMirror  C. EFS — ✗ NFS only  D. FSx for OpenZFS — ✗ no SnapMirror/SMB+iSCSI multi-protocol
Stub: SIZE not about transfer · TIME ongoing · PROTO NFS/SMB · SUP least ops. Deciding: "NetApp", "SnapMirror", "NFS and SMB". Answer A.

**D24 · line: where**
A genomics pipeline must process 50 TB of input in S3 with massively parallel, high-throughput file access for a 3-day job, then write results back to S3. Lowest cost.
A. FSx for Lustre scratch file system linked to the bucket ✓  B. FSx for Lustre persistent — ✗ pays for durability a 3-day job doesn't need  C. EFS Max I/O — ✗ not HPC-optimised, needs a copy  D. FSx for ONTAP — ✗ enterprise NAS features unused
Stub: SIZE not about transfer · TIME one-off · PROTO NFS/SMB · SUP cheapest. Deciding: "high-throughput", "S3", "3-day job", "lowest cost". Answer A.

**D25 · line: classes**
A data lake has objects whose access patterns are unknown and change over time. The team wants automatic cost savings with no retrieval fees and no lifecycle tuning.
A. S3 Intelligent-Tiering ✓  B. Standard-IA — ✗ retrieval fees; wrong if data turns hot  C. Lifecycle to Glacier Instant after 30 d — ✗ needs tuning; retrieval fees  D. One Zone-IA — ✗ single AZ, retrieval fees
Stub: SIZE not about transfer · TIME ongoing · PROTO objects/HTTP · SUP least ops. Deciding: "unknown", "change over time", "no retrieval fees". Answer A.

**D26 · line: classes**
An app stores thumbnails it can regenerate from originals. Thumbnails are rarely read but must load instantly. Cheapest?
A. S3 One Zone-IA ✓  B. Standard-IA — ✗ pays for 3-AZ resilience on re-creatable data  C. Glacier Instant — ✗ 90-day minimum, pricier retrieval  D. Glacier Flexible — ✗ not instant
Stub: SIZE not about transfer · TIME ongoing · PROTO objects/HTTP · SUP cheapest. Deciding: "can regenerate", "instantly", "cheapest". Answer A.

**D27 · line: classes**
Medical images are kept 5 years, typically read about once a quarter, and must be viewable in milliseconds when requested. Lowest cost?
A. Glacier Instant Retrieval ✓  B. Glacier Flexible Retrieval — ✗ minutes–hours  C. Standard-IA — ✗ works, but higher storage cost for quarterly access  D. Deep Archive — ✗ up to 12 h
Stub: SIZE not about transfer · TIME ongoing · PROTO objects/HTTP · SUP cheapest. Deciding: "once a quarter", "milliseconds". Answer A.

**D28 · line: classes**
Legal archives are kept 10 years and rarely needed, but when a court request arrives the files must be available within 15 minutes. Lowest cost?
A. Glacier Flexible Retrieval, expedited retrievals when needed ✓  B. Glacier Deep Archive — ✗ standard retrieval up to 12 h  C. Standard-IA — ✗ far more storage cost than needed  D. Intelligent-Tiering with Deep Archive Access tier — ✗ that tier takes hours
Stub: SIZE not about transfer · TIME ongoing · PROTO objects/HTTP · SUP cheapest. Deciding: "within 15 minutes", "10 years", "rarely". Answer A.

**D29 · line: classes**
Audit logs must be retained 7 years in WORM form; nobody, including the root user, may delete or overwrite them during that period.
A. S3 Object Lock in compliance mode with a 7-year retention period (versioning enabled) ✓  B. Object Lock governance mode — ✗ users with bypass permission can delete  C. MFA Delete — ✗ root with MFA can still delete  D. Bucket policy denying DeleteObject — ✗ root/admins can change the policy
Stub: SIZE not about transfer · TIME ongoing · PROTO objects/HTTP · SUP most durable/compliant. Deciding: "WORM", "including the root user". Answer A.

**D30 · line: edge**
Users on five continents upload multi-GB video files to one bucket in us-east-1; uploads from Asia are slow. Improve upload speed with minimal changes.
A. Enable S3 Transfer Acceleration and use its endpoint ✓  B. CloudFront distribution in front of the bucket — ✗ built for downloads/caching  C. DataSync agents at users' sites — ✗ users aren't servers you manage  D. Global Accelerator in front of the bucket — ✗ prestige distractor; not an S3 upload feature
Stub: SIZE not about transfer · TIME ongoing · PROTO objects/HTTP · SUP least ops. Deciding: "upload", "far from the Region". Answer A.

**D31 · line: backup**
A team enabled Cross-Region Replication on a bucket with 2 million existing objects. New objects replicate, existing ones don't. Replicate the existing objects with the least effort.
A. S3 Batch Replication ✓  B. Disable and re-enable versioning — ✗ doesn't trigger replication  C. DataSync between the buckets — ✗ works, but not the purpose-built answer; metadata/versions differ  D. Lifecycle rule to copy objects — ✗ lifecycle transitions/expires, doesn't replicate
Stub: SIZE not about transfer · TIME one-off · PROTO objects/HTTP · SUP least ops. Deciding: "existing objects". Answer A.

**D32 · line: where**
A database on EC2 needs the highest IOPS and sub-millisecond latency for a mission-critical workload.
A. EBS io2 Block Express ✓  B. EBS gp3 — ✗ general purpose, lower ceiling  C. EBS st1 — ✗ HDD, throughput not IOPS  D. Instance store — ✗ fast but data lost on stop; not for the system of record
Stub: SIZE not about transfer · TIME ongoing · PROTO iSCSI/block · SUP fastest. Deciding: "highest IOPS", "mission-critical". Answer A.

**D33 · line: where**
A nightly batch job needs very fast temporary scratch space; data is recreated each run and loss is acceptable. Lowest cost for the performance.
A. EC2 instance store ✓  B. EBS io2 — ✗ paying for durability you don't need  C. EFS — ✗ network FS, slower and pricier for scratch  D. S3 Express One Zone — ✗ object API, not a local disk
Stub: SIZE not about transfer · TIME ongoing · PROTO iSCSI/block · SUP cheapest. Deciding: "temporary", "loss is acceptable". Answer A.

**D34 · line: where**
Security finds an unencrypted EBS volume attached to a production instance. It must be encrypted.
A. Snapshot → copy the snapshot with encryption enabled → create a volume → swap it in ✓  B. Modify the volume and enable encryption — ✗ can't encrypt an existing volume in place  C. Enable EBS encryption by default — ✗ affects only new volumes  D. DataSync to an encrypted volume — ✗ DataSync doesn't target EBS
Stub: SIZE not about transfer · TIME one-off · PROTO iSCSI/block · SUP none stated. Deciding: "existing unencrypted". Answer A.

**D35 · line: backup**
An encrypted EBS snapshot (AWS managed key `aws/ebs`) must be shared with a partner account, which fails.
A. Copy the snapshot re-encrypted with a customer managed KMS key; share the key and the snapshot ✓  B. Make the snapshot public — ✗ encrypted snapshots can't be public; data exposure  C. Add the account to the AWS managed key policy — ✗ AWS managed key policies can't be edited  D. S3 CRR the snapshot to the partner — ✗ no visible snapshot bucket
Stub: SIZE not about transfer · TIME one-off · PROTO AWS-internal · SUP none stated. Deciding: "AWS managed key", "another account". Answer A.

**D36 · line: where**
An EBS volume in us-east-1a must be used by an instance in us-east-1c.
A. Snapshot the volume, create a new volume from it in us-east-1c ✓  B. Detach and attach to the instance in 1c — ✗ EBS is AZ-scoped  C. Enable Multi-Attach — ✗ same AZ only  D. DataSync the volume — ✗ not an EBS tool
Stub: SIZE not about transfer · TIME one-off · PROTO iSCSI/block · SUP none stated. Deciding: "different AZ". Answer A.

**D37 · line: transfer**
A retailer exchanges EDI purchase orders with trading partners over AS2 and wants messages stored in S3 without running servers.
A. Transfer Family with an AS2 server and S3 storage ✓  B. DataSync — ✗ partners don't run your agent  C. API Gateway + Lambda parsing AS2 — ✗ custom build  D. S3 File Gateway — ✗ on-prem bridge
Stub: SIZE any · TIME ongoing · PROTO SFTP/FTP/AS2 · SUP least ops. Deciding: "AS2", "trading partners". Answer A.

**D38 · line: datasync · Select TWO**
A company will migrate a 50 TB NAS to S3 over its 1 Gbps connection within two weeks, then retire the NAS. Afterwards, on-prem applications must still read a small subset of those files with low latency. (Select TWO.)
A. DataSync to migrate the data to S3 ✓  B. S3 File Gateway for ongoing on-prem access ✓  C. Data Transfer Terminal — ✗ 50 TB ≈ 5 days at 1 Gbps; fits the pipe  D. Transfer Family — ✗ partner door  E. Volume Gateway stored volumes — ✗ block, full local copy
Stub: SIZE fits the pipe · TIME ongoing · PROTO NFS/SMB · SUP none stated. Deciding: "migrate … then retire", "still read … low latency". Answer A, B.

**D39 · line: backup**
A company must back up on-premises VMware VMs and its AWS RDS databases under one backup policy with centralised reporting for auditors.
A. AWS Backup with backup plans + Backup Audit Manager ✓  B. DLM — ✗ EBS/AMI only  C. RDS automated backups + Storage Gateway — ✗ two tools, no central policy  D. Tape Gateway — ✗ VTL for backup software
Stub: SIZE any · TIME ongoing · PROTO AWS-internal · SUP most durable/compliant. Deciding: "one backup policy", "VMware and RDS", "auditors". Answer A.

**D40 · line: classes**
The S3 bill keeps growing even though object count is flat. Investigation shows many failed multipart uploads. Cheapest fix with least ongoing effort.
A. Lifecycle rule AbortIncompleteMultipartUpload after N days ✓  B. Enable Intelligent-Tiering — ✗ parts aren't objects  C. Weekly Lambda listing and aborting uploads — ✗ custom ops  D. Disable versioning — ✗ unrelated
Stub: SIZE not about transfer · TIME ongoing · PROTO objects/HTTP · SUP cheapest. Deciding: "failed multipart uploads". Answer A.

**D41 · line: datasync**
A company has a new 10 Gbps Direct Connect link. It must copy 400 TB of NFS data to S3 within a month and verify every file arrived intact.
A. DataSync over the Direct Connect link with data verification ✓  B. Data Transfer Terminal — ✗ 10 Gbps ≈ 100 TB/day; fits easily  C. S3 File Gateway — ✗ bridge, not mover  D. rsync from an EC2 instance — ✗ self-managed, no built-in verification
Stub: SIZE fits the pipe · TIME one-off · PROTO NFS/SMB · SUP none stated. Deciding: "10 Gbps Direct Connect" (the exception to the truck rule), "verify". Answer A.

## 6. Build steps

1. Clone the repo. Create the layout from §2. Put all Session 1 content in `sessions/01-storage/data.js` against a schema you define and document in README.md (keys: `meta`, `lines`, `map`, `tree`, `facts`, `classes`, `pairs`, `cards`, `drills`, `traps`, `cheat`, `method`).
2. Write `engine.js` generically. No `innerHTML` with unescaped data strings — build DOM with createElement/textContent or a tiny `h()` helper (content is ours, but keep the habit). All localStorage access in try/catch; the page must work if storage is unavailable.
3. Hub `index.html`: title "SAA Transit Maps", list sessions from manifest with progress (cards known / drills correct, read from localStorage), links. Sessions 2–13 appear as "coming" entries: Migration & hybrid · Networking & connectivity · Global architecture & edge · Security services & identity · Multi-account & governance · HA & disaster recovery · Databases & caching · Serverless, events & analytics · Compute & scaling · Monitoring & operations · Cost & purchasing · Integration drill.
4. **Fact check before publishing.** Verify against current AWS docs and correct the brief's wording if anything changed: EBS gp3 and io2 Block Express IOPS/throughput ceilings (don't print exact numbers in drills unless verified); EBS Multi-Attach limits; S3 class minimums/retrieval times; Snow Family availability to new customers and AWS Data Transfer Terminal; DataSync supported sources/destinations and direct-to-Deep-Archive; Storage Gateway types (S3 File, FSx File, Volume cached/stored, Tape). Note any change in the commit message.
5. Test with Playwright (Chromium is preinstalled if you're in a container; otherwise use what's available): load hub and session at 390×844 and 1440×900, both themes; zero console errors; every tab renders; a drill can be completed end-to-end (stub → cross out → choose → submit → feedback); a card can be rated and the box count changes; hash navigation works; no horizontal page scroll at 390 px. Screenshot each tab once at both sizes and look at them.
6. Commit to `main` with a clear message, push.
7. Enable GitHub Pages from `main` / root: `gh api -X POST repos/SoosDev/saa/pages -f "source[branch]=main" -f "source[path]=/"` (if it already exists, `PUT` the same). If `gh` isn't authenticated, tell the owner to do Settings → Pages → Deploy from a branch → main / (root). Report the URL https://soosdev.github.io/saa/ and confirm it serves (Pages can take a minute or two).

## 7. Done when

- https://soosdev.github.io/saa/ loads the hub; Session 1 opens with all 8 tabs working on phone and desktop, both themes.
- 41 drills, ~50 cards, 8 pairs, 15 traps, tree, class picker, map with selectable lines, printable cheat sheet.
- README explains how to add Session 2 by writing only `sessions/02-…/data.js` + a manifest entry.
