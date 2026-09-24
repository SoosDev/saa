# Session 2 — Migration & Hybrid: build brief

Build this as `sessions/02-migration/` on the same engine and design as Session 1. Follow CONTEXT.md §9.

**Colour rule:** the same service keeps the same colour on every page of the site. MGN is red, DMS is green, DataSync is blue and the truck line is grey dashed, exactly as in Session 1. Two new families appear here and get **no new hues**:

- **Elastic Disaster Recovery (DRS)** uses the MGN red with a **dashed, two-way** line. That shows it is the same engine, but it returns.
- **Discovery/planning and hybrid services** (AWS Transform / Application Discovery Service / Migration Hub, Outposts / Local Zones / Wavelength, Directory Service, Resolver, SSM) are **ink** lines (4 px) with distinct station shapes.

Domains: D1 (hybrid identity, DMS over SSL), D2 (cutover/rollback, DRS vs MGN, DMS Multi-AZ), D3 (minimal-downtime moves), D4 (7 Rs, truck + CDC).

## Facts verified 2026-09-24 (show as "Changed since the exam guide" callouts)

- **AWS Migration Hub** and **AWS Application Discovery Service** stopped accepting new customers on **7 Nov 2025**. AWS recommends **AWS Transform** (launched May 2025), which includes discovery (agent-based and agentless collectors), strategy recommendations, EC2 recommendations, journeys and orchestration. Existing customers continue as before. Question banks still say Migration Hub / ADS: the trigger stays the same.
- **MGN**: the docs now title it "AWS Transform MGN". It does continuous block-level replication of physical, virtual and cloud servers, launches to EC2, and cuts over in minutes. It uses replication, launch and post-launch templates, and waves.
- **DMS**: the source stays operational during migration. It offers full load, CDC, or full load + CDC. Replication instances can be Multi-AZ. DMS Serverless exists (Single-AZ or Multi-AZ). Targets include S3 (CSV default, Parquet), Kinesis, Redshift and DynamoDB. **DMS Schema Conversion** (in console, free) and **AWS SCT** (desktop, recommended for large data warehouses) both exist.
- **Directory Service**:
  - AD Connector is a proxy to on-prem AD. It stores no users and is **not compatible with RDS for SQL Server or FSx for Windows**.
  - AWS Managed Microsoft AD is a real AD with 2 DCs in 2 AZs. It supports trusts and works with RDS SQL Server Windows auth, FSx for Windows and WorkSpaces.
  - Simple AD is Samba-based, small and has no trusts.
  - Self-managed AD on EC2 gives full control and full ops.
- **Route 53 Resolver** is now **Route 53 VPC Resolver**. An inbound endpoint lets on-prem query the VPC; an outbound endpoint plus forwarding rules lets the VPC query on-prem. Rules can be shared across accounts with RAM.
- **Verify before publishing:**
  - VMware Cloud on AWS: its commercial availability changed under Broadcom. Keep it as the exam-bank answer for "Relocate / keep vSphere tools", with a note.
  - Whether Amazon Elastic VMware Service (EVS) is GA and what AWS now recommends for "relocate vSphere".
  - Outposts form factors (racks, 1U/2U servers).
  - Wavelength and Local Zones descriptions.
  - SSM hybrid activations.
  - ECS Anywhere / EKS Anywhere.
  - Whether S3 File Gateway can serve objects in Glacier Instant Retrieval (S7 below avoids depending on it).

## Stub for this session (replaces Session 1's slots)

| Slot | Values |
|---|---|
| WHAT | servers · database · files · inventory/plan · identity · DNS · placement |
| CHANGE | none (rehost) · replatform · refactor/rebuy · n/a |
| DOWNTIME | hours OK · minimal · n/a |
| SUPERLATIVE | cheapest · least ops · fastest · resilient · none stated |

## Learn: 10 chapters (full text; ▶ = interactive)

### Ch 1 · The three questions under every migration
**1. What moves?** Whole servers, databases, files, or nothing yet.
**2. How much change is allowed?** From none to a rewrite.
**3. What must stay running?** The downtime budget, which decides between continuous replication and CDC.

"Hybrid" is the case where nothing moves and both places run. The question then becomes which piece of AWS reaches on-prem.

- Show the new stub.
- Link back to Session 1: files go on the DataSync line.
- ▶ Checkpoint: "A data center lease ends in 3 months; minimal changes" — which slot decides it? (CHANGE = none → rehost.)

### Ch 2 · The 7 Rs
Least to most change:

| R | Meaning | Where it goes |
|---|---|---|
| Retire | turn it off | nothing |
| Retain | stay on-prem for now | hybrid services |
| Rehost | lift-and-shift to EC2 | MGN |
| Relocate | move the hypervisor | VMware Cloud on AWS, flagged |
| Replatform | lift-tinker-shift | DMS → RDS/Aurora, Beanstalk, containers |
| Repurchase | switch to SaaS | — |
| Refactor | re-architect cloud-native | Lambda, DynamoDB, microservices |

- Mnemonic: *Remove, Remain, Recopy, Rehypervisor, Repair, Rebuy, Rebuild.*
- Triggers:
  - "quickly / minimal changes / lease ends" → Rehost
  - "reduce DB admin but keep the app" → Replatform
  - "cloud-native / scale independently / pay per request" → Refactor
  - "keep vSphere tools, no conversion" → Relocate
- ▶ **7R sorter**: 10 scenarios → pick the R. Wrong answers show why.
- ▶ Checkpoint: "Nobody has used the internal wiki for a year" → Retire.

### Ch 3 · Discover and plan
- **Application Discovery Service** has two collectors:
  - Agentless (vCenter): VM inventory and utilisation.
  - Agent: adds processes and network connections, which is what gives **dependency mapping** and migration waves.
- **Migration Hub** is the single place to track progress. Both are now **AWS Transform** (show the callout).
- Triggers:
  - "which servers talk to each other" → agent
  - "no agents allowed, VMware" → agentless
  - "one dashboard for progress" → Migration Hub / Transform
- ▶ **Journey map**: an ink line Discover → Assess/Plan (7 Rs) → Move, which branches into Servers (MGN red), Databases (DMS green), Files (DataSync blue, links to Session 1) and Bulk (truck dashed) → Test → Cutover → Operate/optimise. Tapping a station shows its services, triggers and traps (same side-panel pattern as the Session 1 map).
- ▶ Checkpoint: M2.

### Ch 4 · Moving servers: MGN, and its twin DRS
- ▶ **Step-through diagram** (Next/Back):
  1. Install the replication agent on the source.
  2. Continuous block-level replication to a **staging area subnet** (small EC2 replication servers + cheap EBS).
  3. Launch test instances.
  4. Cutover (minutes of downtime).
  5. Finalise; decommission the source.
- Sources: physical, VMware, Hyper-V, other clouds. **The target is always EC2.**
- Old names in banks: Server Migration Service (SMS) and CloudEndure Migration both mean MGN.
- **DRS** uses the same engine but never ends. You replicate forever, **fail over** to AWS and **fail back**. Seconds of RPO, minutes of RTO.
- ▶ **Pair diagram** MGN vs DRS: a one-way red line vs a dashed two-way red line.
- Traps: "MGN into RDS" (MGN always lands on EC2); using DRS to migrate or MGN for DR.
- ▶ Checkpoints: M1, and "RPO seconds, fail back after repair" → DRS.

### Ch 5 · Moving databases: DMS, SCT, and the Aurora shortcut
- **DMS**: a replication instance or Serverless, source and target endpoints, tasks. The source stays online.
  - Full load: downtime lasts the whole copy.
  - Full load + CDC: minutes of downtime at cutover.
  - Multi-AZ for resilience.
  - Targets include S3 CSV/Parquet.
- **Heterogeneous** moves: SCT or DMS Schema Conversion handles schema, views, stored procedures and code; DMS handles data. DMS does not convert code.
- **Data warehouses** (Teradata, Netezza, Oracle DW → Redshift): SCT, plus its data extraction agents.
- **Huge database + thin pipe**: truck the initial load, then DMS CDC to catch up.
- **RDS MySQL/PostgreSQL → Aurora** (same family):
  - Minimal downtime: create an **Aurora read replica** of the RDS instance, promote it at zero lag. No DMS needed.
  - Downtime OK: snapshot, then restore as Aurora.
- ▶ **Cutover timeline widget**. Inputs: DB size (GB–TB), usable bandwidth, change rate. Toggle full load / full load + CDC. It shows a horizontal timeline and a **downtime bar**: with full load only, the whole copy is downtime; with CDC, only the final catch-up window is. Show the numbers.
- ▶ Checkpoints: M3 and M4.

### Ch 6 · Getting the bytes there during a migration
- Recap of Session 1's pipe rule and calculator (link it).
- **VPN now, Direct Connect later.** DX takes weeks to provision, so a 2-week deadline never waits for it.
- Seed offline (DTT), then sync online (DataSync/DMS CDC).
- Encrypt in transit: DMS SSL endpoints, VPN.
- ▶ Checkpoint: the "5 TB in 2 weeks, no DX yet" question (N22).

### Ch 7 · Running in both places: where AWS compute sits
**Whose building is it?**
- **Outposts**: AWS-managed racks or servers in **your** building. For data residency, local processing, and very low latency to on-prem systems. Needs a link to its parent Region.
- **Local Zones**: AWS-run sites in a **metro area**, near users.
- **Wavelength**: AWS inside a **telco 5G** network, for mobile devices.

Also:
- **ECS Anywhere / EKS Anywhere**: your own servers, AWS control plane.
- **SSM hybrid activations**: manage, patch and run commands on on-prem servers.
- Trap: "Local Zones for 'data must stay in our facility'".
- ▶ **Placement chooser** (3 questions → answer card).
- ▶ Checkpoint: factory floor with AWS APIs on-site → Outposts.

### Ch 8 · Hybrid identity
- **AD Connector** is a doorman that forwards every question to on-prem and stores nothing. It is cheap, and it fails if the link is down. **It doesn't work for RDS SQL Server or FSx for Windows.**
- **AWS Managed Microsoft AD** is a real AD in AWS (2 DCs, 2 AZs). It supports trusts to on-prem and RDS/FSx/WorkSpaces, and keeps working if the link drops.
- **Simple AD**: small, basic, no trusts.
- **Self-managed AD on EC2**: full control, full ops.
- (IAM Identity Center + AD goes deep in Session 6.)
- ▶ **AD chooser tree**:
  - Do AWS services need a real domain (RDS SQL Server, FSx Windows)?
  - Must auth survive a link failure?
  - Need a trust?
  - Small and cheap?
- ▶ Checkpoint: M6.

### Ch 9 · Hybrid DNS
**Rule: name the endpoint after the direction the query travels relative to the VPC.**
- On-prem asks about AWS private names → **INBOUND** endpoint. On-prem DNS conditionally forwards the zone to the endpoint IPs.
- The VPC asks about on-prem names → **OUTBOUND** endpoint plus a **forwarding rule** for the domain.
- Both need VPN or DX. Rules can be shared across accounts with RAM.
- ▶ **Direction widget**: pick "who is asking" (on-prem server / EC2) and "whose name" (private hosted zone / corp.internal). An arrow diagram between the on-prem and VPC zones shows the endpoint type, and the rule where needed.
- Trap: flipping the direction. Say out loud who sends the query.
- ▶ Checkpoint: M5.

### Ch 10 · Triggers, traps, cheat block, record
- Searchable trigger table, traps list, cheat block, the session log (empty until the quiz results are recorded; then add them with `mine: true` on missed drills).

## Traps (for the Traps tab)
1. "Migration" makes DMS look tempting everywhere. It's DMS only if the payload is rows.
2. MGN into RDS. MGN always targets EC2.
3. Full load only under a downtime limit. Needs CDC.
4. DMS converting schemas or stored procedures. It doesn't; use SCT or DMS Schema Conversion.
5. DRS used as a migration tool, or MGN as DR.
6. Local Zones for data that must stay in your facility. That's Outposts.
7. AD Connector for RDS SQL Server or FSx for Windows. Needs Managed AD.
8. AD Connector when auth must survive a link outage.
9. Resolver endpoint direction flipped.
10. Direct Connect with a 2-week deadline.
11. Old names as distractors or as answers: SMS / CloudEndure Migration mean MGN; Migration Hub / ADS mean AWS Transform.
12. "Refactor" when the scenario says quickly with minimal changes.
13. Agentless discovery when the question needs dependencies.

## Cheat block
```
MIGRATION = WHAT moves? + HOW MUCH change? + WHAT stays up?
7R: Retire Retain Rehost Relocate Replatform Repurchase Refactor (less -> more change)
    quick/minimal change = REHOST   managed DB, same app = REPLATFORM
DISCOVER  -> App Discovery (agentless = VM inventory, AGENT = dependencies)
TRACK     -> Migration Hub   (both now AWS Transform; closed to new since 7 Nov 2025)
SERVERS   -> MGN   blocks -> staging -> test -> cutover · target ALWAYS EC2
DR (stay) -> DRS   same engine, fail over + fail BACK
DB        -> DMS   rows · source stays online · full load + CDC = minimal downtime
   diff engine -> SCT / DMS Schema Conversion (schema+code) + DMS (data)
   DW -> Redshift -> SCT (+ extraction agents)
   RDS MySQL/PG -> Aurora -> Aurora READ REPLICA -> promote
   huge + thin pipe -> truck initial load + DMS CDC
BYTES     VPN now, DX later (weeks) · seed offline + sync online
HYBRID    your building -> Outposts · city -> Local Zones · 5G -> Wavelength
   own servers + AWS control -> ECS/EKS Anywhere · patch on-prem -> SSM hybrid
   AD: proxy only -> AD Connector (no RDS SQL/FSx, dies with link) · real AD -> Managed AD · tiny -> Simple AD
   DNS: on-prem asks AWS -> INBOUND · AWS asks on-prem -> OUTBOUND + rule
NEVER: MGN->RDS · DMS converts schema · full-load-only for "minimal downtime" ·
       Local Zone for "in our facility" · DX with a 2-week deadline
```

## Compare pairs (8)
1. **MGN vs DMS**: blocks vs rows. "DB server as-is to EC2" → MGN; "into RDS/Aurora" → DMS. Check: "Move the Oracle data into Amazon RDS" → DMS.
2. **MGN vs DRS**: one way vs round trip. Check: "Replicate on-prem servers continuously so we can recover in AWS and fail back" → DRS.
3. **SCT/DMS SC vs DMS**: structure vs data. Check: "Convert PL/SQL procedures" → SCT/DMS SC.
4. **Full load vs full load + CDC**: downtime = the copy vs downtime = minutes. Check: "under 30 minutes of downtime" → + CDC.
5. **Aurora read replica vs DMS** (RDS → Aurora): native, least effort vs flexible/cross-engine. Check: "RDS MySQL → Aurora MySQL, least effort, minimal downtime" → read replica.
6. **Outposts vs Local Zones vs Wavelength**: your building / a city / a 5G network. Check: "data must never leave our plant" → Outposts.
7. **AD Connector vs Managed AD vs Simple AD**: proxy / real AD / tiny. Check: "FSx for Windows must join the domain" → Managed AD (or self-managed).
8. **Resolver inbound vs outbound**: query into the VPC vs out of it. Check: "EC2 resolves corp.internal" → outbound + rule.

## Trigger cards (40)
Format: phrase → answer · tempting wrong answer.

1. discover servers, utilisation before migrating → Application Discovery Service / AWS Transform · Migration Hub alone
2. which servers talk to each other / dependency mapping → Discovery **agent** · agentless collector
3. VMware only, no agents allowed, inventory → agentless collector · agent
4. one dashboard to track migration progress → Migration Hub (AWS Transform) · CloudWatch
5. lift-and-shift, minimal changes, quickly → MGN · DMS
6. physical / Hyper-V / other-cloud servers to EC2 → MGN · DataSync
7. test launch before cutover, minutes of downtime → MGN · DRS
8. SMS, CloudEndure Migration → old names for MGN · separate services
9. DR for on-prem servers in AWS, RPO seconds, fail back → Elastic Disaster Recovery · MGN
10. database migration, source stays online → DMS · MGN
11. ongoing replication / CDC / keep in sync until cutover → DMS full load + CDC · full load only
12. Oracle → Aurora PostgreSQL, convert stored procedures → SCT / DMS Schema Conversion + DMS · DMS alone
13. Teradata / Netezza → Redshift → SCT (+ data extraction agents) · DMS alone
14. RDS MySQL → Aurora MySQL, minimal downtime, least effort → Aurora read replica, promote · DMS
15. RDS MySQL → Aurora MySQL, downtime OK → snapshot, restore as Aurora · MGN
16. many-TB DB, thin pipe, minimal downtime → truck the initial load + DMS CDC · DX
17. DMS must survive AZ failure → Multi-AZ replication instance (or Serverless Multi-AZ) · a second task
18. replicate an on-prem DB to S3 as Parquet continuously → DMS CDC to S3 · Glue
19. DMS encryption in transit → SSL endpoints (certificate) · Network Firewall
20. migrate within 2 weeks, no DX yet → Site-to-Site VPN / internet now · order DX
21. data residency, AWS APIs in our own building → Outposts · Local Zones
22. single-digit ms for users in one city → Local Zones · Outposts
23. 5G, mobile edge, AR/VR on phones → Wavelength · CloudFront
24. containers on our own servers, ECS control plane → ECS Anywhere · Outposts
25. patch / run commands on on-prem and EC2 from one place → Systems Manager (hybrid activation) · OpsWorks
26. console/app sign-in with on-prem AD, store nothing in AWS → AD Connector · Managed AD
27. RDS SQL Server Windows auth / FSx for Windows domain → AWS Managed Microsoft AD · AD Connector
28. trust between AWS and on-prem forests → Managed Microsoft AD · Simple AD
29. auth must keep working if the link to on-prem fails → Managed AD (+ trust) · AD Connector
30. small, cheap, basic domain, no trust → Simple AD · Managed AD
31. on-prem servers resolve private hosted zone names → Resolver INBOUND endpoint · outbound
32. EC2 resolves corp.internal → Resolver OUTBOUND endpoint + forwarding rule · inbound
33. share DNS forwarding rules with other accounts → Resolver rules via RAM · copy per account
34. retire / retain / rehost / relocate → turn off / stay / EC2 as-is / hypervisor move · —
35. replatform / repurchase / refactor → tinker (managed DB) / SaaS / rebuild · —
36. keep vSphere tools, no VM conversion → Relocate (VMware Cloud on AWS; check availability) · MGN
37. cloud-native, pay per request, scale independently → Refactor · Rehost
38. Route 53 Resolver's current name → Route 53 VPC Resolver · —
39. MGN target → always EC2 · RDS
40. FSx for Windows + AD Connector? → not compatible; use Managed AD · works

## Drills (30). The quiz questions M1–M6 and S7 are included; answers are not yet recorded as his

Use the Session 2 stub slots. The Session 1 drill format applies (why for every option, deciding words present verbatim in the scenario, `src`, `line`). He has not answered M1–S7 yet. When he reports answers, set `mine: true` on the misses and add a session-log entry.

- **M1** (line mgn) — Data-center lease ends in 10 weeks; 180 VMware VMs + 20 physical Linux servers, undocumented apps; everything in AWS before the lease ends with the fewest changes.
  - A. Refactor to ECS + DMS ✗ too much change, too slow
  - **B. MGN: replicate all to EC2, test-launch, cut over in waves ✓**
  - C. DataSync file systems to EFS + rebuild from AMIs ✗ files ≠ servers
  - D. DRS and fail over permanently ✗ DR tool, not migration
  - Stub: servers · none (rehost) · minimal · fastest.
  - Words: "fewest changes", "10 weeks", "physical".
- **M2** (line discover) — Must find which of 400 servers (VMware and bare metal) communicate, to plan waves.
  - A. Agentless collector utilisation data ✗ no network connections; misses bare metal
  - **B. Discovery agent on each server, view network connections ✓**
  - C. VPC Flow Logs ✗ servers aren't in a VPC yet
  - D. AWS Config ✗ records AWS resources
  - Stub: inventory/plan · n/a · n/a · none stated.
  - Words: "communicate with each other", "bare metal".
- **M3** (line dms, select two) — Oracle 19c 4 TB with PL/SQL → Aurora PostgreSQL, ≤30 min downtime.
  - **A. SCT / DMS Schema Conversion for schema + procedures ✓**
  - B. DMS converts procedures during full load ✗ DMS doesn't convert code
  - **C. DMS full load + CDC, cut over at near-zero lag ✓**
  - D. MGN then "switch the engine" ✗ MGN lands on EC2, same engine
  - E. RMAN backup → restore into Aurora PG ✗ RMAN is Oracle-only; engines differ
  - Stub: database · replatform · minimal · none stated.
  - Words: "PL/SQL stored procedures", "Aurora PostgreSQL", "30 minutes".
- **M4** (line dms) — RDS for MySQL → Aurora MySQL, least downtime and least effort.
  - **A. Aurora read replica of the RDS instance, promote at zero lag ✓**
  - B. Snapshot → restore ✗ downtime for the whole restore plus writes lost after the snapshot
  - C. DMS full load + CDC ✗ works, but more to manage
  - D. mysqldump ✗ long downtime
  - Stub: database · replatform · minimal · least ops.
  - Words: "RDS for MySQL", "least downtime and least operational effort".
- **M5** (line dns, select two) — EC2 must resolve corp.internal; on-prem must resolve a private hosted zone; DX exists.
  - **A. Outbound endpoint + forwarding rule for corp.internal ✓**
  - **B. Inbound endpoint; on-prem DNS conditionally forwards the zone to its IPs ✓**
  - C. Inbound endpoint with a forwarding rule for corp.internal ✗ wrong direction
  - D. Make the zone public ✗ exposes internal names
  - E. Global Accelerator ✗ prestige distractor
  - Stub: DNS · n/a · n/a · none stated.
  - Words: "resolve hostnames in the company's on-premises domain", "private hosted zone".
- **M6** (line identity) — RDS SQL Server Windows auth + FSx for Windows domain-joined; keep on-prem credentials; auth must keep working if the link drops.
  - A. AD Connector ✗ incompatible with RDS SQL Server / FSx; dies with the link
  - B. Simple AD + recreate users ✗ no trust, users duplicated
  - **C. Managed Microsoft AD + trust to on-prem AD ✓**
  - D. Cognito federated with AD ✗ for app end-users, not Windows auth
  - Stub: identity · n/a · n/a · resilient.
  - Words: "Windows authentication", "domain-joined", "link goes down".
- **S7** (line gateway, Session 1 carry-over) — Editing workstations save to SMB; stop buying on-prem storage, keep recent projects at LAN speed, store everything in S3, and move older files to cheaper storage after 90 days.
  - A. DataSync nightly + lifecycle to Glacier Flexible ✗ copies; no live share; Flexible isn't instantly readable
  - **B. S3 File Gateway SMB share + lifecycle to S3 Standard-IA after 90 days ✓**
  - C. FSx for Windows over VPN ✗ no local cache → not LAN speed
  - D. Volume Gateway stored volumes over iSCSI ✗ block, full local copy (keeps buying storage)
  - Stub: files · none · n/a · cheapest.
  - Words: "SMB share", "LAN speed", "after 90 days".
  - Note: the chat version said Glacier Instant Retrieval for B. Verify File Gateway support before using it; Standard-IA is the safe answer.
- **N1** (discover) — VMware-only estate; security forbids installing agents; need utilisation data for right-sizing → **agentless collector ✓**. Distractors: agent (forbidden); CloudWatch agent (needs install, AWS-side); Trusted Advisor (AWS resources only).
- **N2** (discover) — Multiple migration tools; leadership wants one place to see progress per application → **Migration Hub / AWS Transform ✓**. Distractors: CloudWatch dashboard (no migration status); Config; Service Catalog.
- **N3** (placement) — Exit a data center quickly; 300 vSphere VMs; the ops team must keep vCenter tooling; no VM conversion → **VMware Cloud on AWS (Relocate) ✓**, flagged "verify availability". Distractors: MGN (converts to EC2); refactor to containers; DRS.
- **N4** (dms) — On-prem SQL Server → Aurora MySQL, including T-SQL code → **SCT or DMS Schema Conversion for code + DMS for data ✓**. Distractors: DMS only; MGN; native backup/restore.
- **N5** (dms) — 10 TB on-prem Oracle → RDS for Oracle over 50 Mbps with minimal downtime → **DTT for the initial load, then DMS CDC to catch up ✓**. Distractors: DMS full load over 50 Mbps (~20 days, changes pile up); order DX; MGN.
- **N6** (dms) — The DMS replication must survive an AZ failure during a month-long CDC → **Multi-AZ replication instance ✓**. Distractors: two tasks in two AZs (duplicates); snapshot the instance; larger instance.
- **N7** (mgn/DRS) — On-prem servers need DR in AWS with an RPO of seconds and failback after repair; they are not migrating → **Elastic Disaster Recovery ✓**. Distractors: MGN; AWS Backup (RPO hours); pilot light built by hand.
- **N8** (mgn) — Migrate 50 servers with test launches first and cutover windows of minutes, then decommission on-prem → **MGN ✓**. Distractors: DRS; DataSync; VM Import/Export (offline image, longer downtime).
- **N9** (placement) — A factory must run AWS APIs on-site with single-digit-ms latency to machines; data must stay in the plant → **Outposts ✓**. Distractors: Local Zones; Wavelength; Snowball Edge (closed to new customers).
- **N10** (placement) — Game servers need single-digit-ms latency for players in Los Angeles; no on-site hardware → **Local Zones ✓**. Distractors: Outposts; CloudFront (static/edge caching, not game servers); Global Accelerator (routing, not compute near users).
- **N11** (placement) — AR app on 5G phones needs ultra-low latency compute → **Wavelength ✓**. Distractors: Local Zones; CloudFront; Outposts.
- **N12** (identity) — Staff should sign in to the AWS console with existing AD credentials; no directory data in AWS; lowest cost → **AD Connector ✓**. Distractors: Managed AD; Simple AD (separate users); IAM users.
- **N13** (identity) — Small startup needs a basic domain for 40 Linux and Windows EC2 instances; no on-prem AD; lowest cost → **Simple AD ✓**. Distractors: Managed AD Enterprise; AD Connector (nothing to connect to); self-managed AD on EC2.
- **N14** (dns) — Only EC2 must resolve on-prem names → **outbound endpoint + forwarding rule ✓**. Distractors: inbound endpoint; private hosted zone copy of on-prem records (manual drift); Route 53 public zone.
- **N15** (dns) — Only on-prem servers must resolve records in a private hosted zone → **inbound endpoint + conditional forwarder on-prem ✓**. Distractors: outbound; make it public; edit hosts files.
- **N16** (ops) — Patch and run commands on 300 on-prem servers and 200 EC2 instances from one place → **Systems Manager with hybrid activations ✓**. Distractors: OpsWorks; Config; a cron job per server.
- **N17** (placement) — Run containers on existing on-prem servers managed by the same ECS control plane as the cloud → **ECS Anywhere ✓**. Distractors: Outposts (buy AWS hardware); EKS on EC2; Fargate.
- **N18** (7R) — An internal app nobody has used for a year → **Retire ✓**. Distractors: Retain; Rehost; Repurchase.
- **N19** (7R) — Replace a self-hosted CRM with Salesforce → **Repurchase ✓**. Distractors: Replatform; Refactor; Rehost.
- **N20** (7R) — Keep the app code, move its self-managed MySQL to Amazon RDS to cut DBA work → **Replatform (DMS → RDS) ✓**. Distractors: Rehost; Refactor; Retain.
- **N21** (dms) — Stream ongoing changes from on-prem Oracle into an S3 data lake as Parquet → **DMS CDC task with an S3 target in Parquet format ✓**. Distractors: DataSync; Glue crawler on Oracle (no CDC); Kinesis Firehose alone.
- **N22** (bytes) — 5 TB and 40 servers must move within 2 weeks; no Direct Connect yet; 1 Gbps internet → **Site-to-Site VPN over the internet with MGN/DataSync now ✓**. Distractors: order DX first (weeks); DTT (5 TB fits the pipe); Transfer Acceleration.
- **N23** (dms) — Migrate a Teradata data warehouse to Amazon Redshift → **SCT (schema + data extraction agents) ✓**. Distractors: DMS alone; MGN; DataSync.

(For every drill: write full 4-option text in exam style from these specs, a why for each option, and set the stub truth. Deciding words must appear verbatim in the scenario.)

## Done when
- 10 chapters with all ▶ elements work.
- The journey map, the 7R sorter, the MGN step-through, the cutover timeline, the placement and AD choosers, and the DNS direction widget work on phone and desktop in both themes.
- 8 pairs, 40 cards, 30 drills, 13 traps, cheat sheet and progress.
- It is added to the hub and manifest, CONTEXT §6 is updated, and CONTEXT §9 passes.
