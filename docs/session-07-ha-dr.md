# Session 7 — HA & Disaster Recovery: build brief

Built as `sessions/07-ha-dr/` on the same engine and design as Sessions 1–6. Follows CONTEXT.md §9. Cluster 7 in §5: RTO/RPO, the four DR strategies, high availability inside a Region (Multi-AZ, Auto Scaling, static stability, EC2 automatic recovery), RDS Multi-AZ / Multi-AZ DB cluster / read replicas / backups, Aurora replicas / Global Database / Backtrack / DSQL, DynamoDB global tables (MREC, MRSC) and PITR, ElastiCache Global Datastore, S3 replication (CRR/SRR/RTC/Batch/MRAP), EBS snapshots, DLM, EFS replication, AWS Backup (plans, Vault Lock, air-gapped vault, restore testing), Elastic Disaster Recovery, Route 53 failover, Global Accelerator, Amazon ARC, FIS, Resilience Hub. Domains **D2 ●●● D3 ● D4 ●** (mixed).

His record here: baseline **Q61** (Multi-AZ failover mechanism, tag **F**), **Q29** (DLM vs AWS Backup, tag **C**) and the **prestige-distractor pattern** (CONTEXT §3) with **Global Accelerator** (picked twice). Drills **H1** (`src: 'Exam Q61'`), **H2** (`'Exam Q29'`), **H3–H5** (`'Exam pattern'`) and cards **c01, c08, c12, c30, c40** carry `mine: true`. Session 1 already has DLM vs Backup (D12, c20/c21) and the Multi-AZ CNAME card (c50); Session 7 re-tests them in DR context. Monitoring (CloudWatch, CloudTrail) → Session 11; database performance → Session 8.

## Colour rule

The same service keeps the same colour on every page. **Session 7 adds no hue.** Two lines reuse the hue their service already has: **Global Accelerator** (`ga`, indigo, Session 4) and **Elastic Disaster Recovery** (`drs`, the MGN red, dashed `10 8`, Session 2). Every other family is an **ink line** (4 px), told apart by dash and station shape, always labelled. Chart bars stay ink.

| Line (`id`) | Dash | Stations |
|---|---|---|
| Route 53 failover · ARC (`r53`) | `12 8` (as Session 4) | circles |
| Global Accelerator (`ga`) | hue `--ga` | large circles |
| Multi-AZ compute · ASG · ELB (`asg`) | solid | squares |
| RDS Multi-AZ · read replicas (`rds`) | `2 7` | triangles |
| Aurora replicas · Global Database (`aurora`) | `10 6` | hexagons |
| DynamoDB global tables · PITR (`ddb`) | `1 9` | diamonds |
| S3 replication · MRAP (`s3rep`) | `24 8` | rings |
| AWS Backup · snapshots · DLM (`backup`) | `6 4` | pentagons |
| Elastic Disaster Recovery (`drs`) | hue `--mgn`, `10 8` | circles |

Topics (neutral chips): `tiers` = DR strategies · RTO and RPO; `nbr` = Neighbours: ElastiCache · EFS · CloudFront · FIS.

## Facts verified 2026-09-25 (AWS docs via the AWS MCP server)

**DR concepts**
- RTO/RPO definitions — https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/business-continuity-plan-bcp.html
- Four strategies with numbers (backup & restore RPO hours / RTO ≤ 24 h, PITR can lower RPO to ~5 min; pilot light minutes / tens of minutes; warm standby seconds / minutes; multi-site near zero / potentially zero; “hot standby”) — https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_disaster_recovery.html
- Pilot light “switched off” = not deployed; “pilot light cannot process requests without additional action … warm standby can handle traffic (at reduced capacity levels) immediately”; data plane over control plane; DRS classed as pilot light — https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
- Well-Architected REL11-BP04 (data plane, anti-pattern “dependence on changing DNS records”) and REL11-BP05 (static stability, anti-pattern “dynamically acquire resources during a failure”) — https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_withstand_component_failures_avoid_control_plane.html · https://docs.aws.amazon.com/wellarchitected/2024-06-27/framework/rel_withstand_component_failures_static_stability.html
- Resilience Hub next generation GA May 2026 (modular policies, not closed) — https://aws.amazon.com/about-aws/whats-new/2026/05/aws-announces-next-gen-aws-resilience-hub/ · https://docs.aws.amazon.com/resilience-hub/latest/userguide/next-gen-migrating.html

**Route 53 · ARC · Global Accelerator · CloudFront**
- Health check types (endpoint, calculated, CloudWatch alarm) — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-types.html · interval 30 s / 10 s, threshold 1–10 default 3 — https://aws.amazon.com/route53/faqs/
- Checkers outside the VPC → CloudWatch alarm check — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-private-hosted-zones.html · Evaluate target health — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html
- ARC readiness checks closed to new customers (maintenance from 30 Apr 2026) — https://docs.aws.amazon.com/r53recovery/latest/dg/arc-readiness-availability-change.html · zonal autoshift — https://docs.aws.amazon.com/r53recovery/latest/dg/arc-zonal-autoshift.how-it-works.about.html · Region switch (Aug 2025) — https://docs.aws.amazon.com/r53recovery/latest/dg/region-switch.html · https://aws.amazon.com/about-aws/whats-new/2025/08/amazon-application-recovery/
- Route 53 accelerated recovery (Nov 2025, public zones, ~60-minute RTO for DNS changes) — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/accelerated-recovery.html
- Global Accelerator health checks (reuses ALB/NLB health checks; failover between endpoint groups) — https://repost.aws/knowledge-center/global-accelerator-unhealthy-endpoints (read myself) · https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoints-endpoint-weights.unhealthy-endpoints.html
- CloudFront origin failover (codes incl. 429; GET/HEAD/OPTIONS) — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/high_availability_origin_failover.html

**Compute**
- ASG ELB health checks off by default — https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-checks-overview.html · cross-zone (ALB on, NLB off) — https://repost.aws/knowledge-center/elb-dns-cross-zone-balance-configuration
- EC2 automatic recovery (keeps ID, IPs, EBS; simplified recovery default; instance-store nuance) — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-recover.html
- FIS name and scenarios — https://aws.amazon.com/blogs/aws/use-aws-fault-injection-service-to-demonstrate-multi-region-and-multi-az-application-resilience/

**Databases**
- RDS Multi-AZ DB instance (sync, no reads, 60–120 s, CNAME) — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html · Multi-AZ DB cluster (< 35 s, MySQL/PostgreSQL) — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts-failover.html
- **Read replicas 15 (MySQL/MariaDB/PostgreSQL), 5 (Oracle, SQL Server), 3 (Db2)** — https://aws.amazon.com/rds/faqs/ (spot-checked) · https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance-read-replica.html
- Backups 0–35 d, PITR ~last 5 min, cross-Region automated backups, snapshot copy — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/AutomatedBackups.Replicating.Enable.html · https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html
- Aurora storage and failover (< 60 s, often < 30 s; tiers 0–15; ~10 min without a replica) — https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html
- **Aurora Global Database up to 10 secondary Regions (May 2025)**, lag < 1 s, switchover/failover — https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html · https://aws.amazon.com/about-aws/whats-new/2025/05/amazon-aurora-global-database-support-10-secondary-region-clusters/ · https://aws.amazon.com/about-aws/whats-new/2023/08/amazon-aurora-global-database-failover/
- Backtrack (Aurora MySQL, 72 h, not with Global Database) — https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Managing.Backtrack.html
- Aurora DSQL GA May 2025 — https://aws.amazon.com/about-aws/whats-new/2025/05/amazon-aurora-dsql-generally-available/
- DynamoDB global tables (2019.11.21, MREC ~1 s) — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html · MRSC GA June 2025, exactly 3 Regions / witness — https://aws.amazon.com/about-aws/whats-new/2025/06/amazon-dynamo-db-global-tables-multi-region-strong-consistency-generally-available/ · PITR 1–35 days (Jan 2025) — https://aws.amazon.com/about-aws/whats-new/2025/01/amazon-dynamodb-configurable-point-in-time-recovery-periods/
- ElastiCache Global Datastore (2 secondary Regions, promote < 1 min) — https://aws.amazon.com/elasticache/faqs/ · Multi-AZ failover — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/AutoFailover.html

**Storage and backup**
- S3 replication (versioning, new objects only, Batch Replication, delete markers, version deletes) — https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-what-is-isnot-replicated.html · **RTC design 99.99%, SLA 99.9% in 15 min** — https://aws.amazon.com/s3/faqs/ (spot-checked) · MRAP failover — https://docs.aws.amazon.com/AmazonS3/latest/userguide/MrapFailover.html
- Recycle Bin (EBS volumes, snapshots, AMIs) — https://docs.aws.amazon.com/ebs/latest/userguide/recycle-bin-concepts.html · DLM — https://docs.aws.amazon.com/ebs/latest/userguide/event-policy.html
- EFS replication RPO 15 min for most file systems — https://docs.aws.amazon.com/efs/latest/ug/efs-replication.html
- AWS Backup services — https://docs.aws.amazon.com/aws-backup/latest/devguide/backup-feature-availability.html · Vault Lock compliance grace ≥ 72 h — https://docs.aws.amazon.com/help-panel/aws-backup/latest/helppanel/vaultlock-grace-time.html · air-gapped vault (primary target Nov 2025) — https://docs.aws.amazon.com/aws-backup/latest/devguide/logicallyairgappedvault.html · https://aws.amazon.com/about-aws/whats-new/2025/11/aws-backup-direct-to-logically-air-gapped-vault/ · restore testing (Nov 2023) — https://aws.amazon.com/about-aws/whats-new/2023/11/aws-backup-restore-testing/ · continuous backup 35 d — https://docs.aws.amazon.com/aws-backup/latest/devguide/point-in-time-recovery.html
- DRS (RPO seconds / sub-second, RTO 5–20 min, staging area, failback, CloudEndure DR successor) — https://docs.aws.amazon.com/drs/latest/userguide/CloudEndure-Concepts.html · https://docs.aws.amazon.com/drs/latest/userguide/FAQ.html

### Changed since the exam guide (shown as callouts)

| Old (banks / older courses) | Now | Source |
|---|---|---|
| Aurora Global Database: up to 5 secondary Regions | **up to 10** (May 2025; the DR whitepaper still says 5) | whats-new 2025/05 |
| RDS read replicas: 5 per source | **15** for MySQL, MariaDB, PostgreSQL (Oracle, SQL Server 5; Db2 3) | RDS FAQ |
| “Managed planned failover”, detach and promote | **Switchover** (planned) / managed **failover** (Aug 2023) | aurora-global-database.html |
| Multi-AZ = one idle standby | + **Multi-AZ DB cluster** (2 readable standbys, < 35 s) | multi-az-db-clusters |
| DynamoDB global tables are eventually consistent; PITR 35 days | + **MRSC** (June 2025, RPO 0); PITR **1–35 days** configurable | whats-new 2025/06, 2025/01 |
| S3 RTC “SLA 99.99%” | design 99.99%, **SLA 99.9%** | S3 FAQ |
| Route 53 ARC readiness checks | **Amazon ARC**; readiness checks **closed to new customers**; **Region switch** (Aug 2025) | arc-readiness-availability-change |
| — | **Route 53 accelerated recovery** (Nov 2025) | accelerated-recovery.html |
| Fault Injection Simulator | **Fault Injection Service** | FIS blog |
| Resilience Hub: one RTO/RPO policy | **Next gen** (May 2026): modular policies | whats-new 2026/05 |
| DRS RTO “minutes” | **typically 5–20 minutes** | DRS concepts |
| Backup vault copies only in air-gapped vault | air-gapped vault as **primary target** (Nov 2025); Recycle Bin covers **EBS volumes** | logicallyairgappedvault.html |

### Not verified → not printed
Figure-6 labels of the DR whitepaper (image; Well-Architected text used instead); air-gapped vault GA date; CloudEndure DR end-of-life date; exact Region switch GA day (printed as Aug 2025); a formal Aurora Global Database RPO/RTO SLA (printed as “typically < 1 s” and “about a minute”); Global Accelerator failover duration (not printed). The DR widgets’ time bands, cost shares and outage lengths are labelled as rules of thumb / user inputs, not AWS numbers.

## Stub for this session (replaces Session 6’s slots)

| Slot | Values | Why this slot |
|---|---|---|
| FAILURE | instance · AZ · Region · bad data · on-prem site | The HA/DR split (a second Region for an AZ is the prestige trap), and the corruption rule (replication never fixes bad data). |
| RTO | hours · tens of min · minutes · near zero | Picks how much must already run → the DR tier. |
| RPO | hours · minutes · seconds · zero | Picks how data is copied: backups, async replication, sync / MRSC. |
| SUPERLATIVE | cheapest · least ops · fastest · none stated | “Most cost-effective” = the lowest tier that meets both targets. |

## Learn: 12 chapters (full text in `learn.js`; ▶ = interactive)

1. **How to read a resilience question** — record table (Q61, Q29, GA), stub, built-for hooks. ▶ stub trainer on H3 · ▶ 2 checkpoints.
2. **RTO, RPO and the four DR strategies** — definitions, Well-Architected table. ▶ **DR strategy picker** (RTO/RPO targets, log-axis bands, cheapest tier) · ▶ pair tiers · ▶ tier sorter (12) · ▶ H6–H8.
3. **High availability inside a Region** — pattern, static stability, automatic recovery. ▶ pair HA · DR · ▶ **AZ capacity calculator** · ▶ HA-or-DR sorter · ▶ H5, H9, H10.
4. **RDS** — Multi-AZ instance, cluster, read replicas (15), backups. ▶ stepper “RDS Multi-AZ failover” (Q61 note) · ▶ pair · ▶ H1, H11–H13 + bad-UPDATE checkpoint.
5. **Aurora** — storage, replicas, Global Database, switchover vs failover, Backtrack, DSQL. ▶ stepper “Global Database failover” · ▶ pair · ▶ H14–H16.
6. **DynamoDB and caches** — MREC vs MRSC, PITR, ElastiCache. ▶ pair · ▶ **database resilience chooser** · ▶ H17–H19.
7. **Replication is not a backup** — S3 CRR/RTC/Batch/MRAP, EBS, DLM, Recycle Bin, EFS. ▶ **protection vs threat matrix** · ▶ pair · ▶ H20–H22.
8. **AWS Backup** — parts table, DLM (Q29 miss), ransomware. ▶ stepper “Backups an attacker cannot destroy” · ▶ H2, H23–H25.
9. **Elastic Disaster Recovery** — how it works. ▶ stepper “drill, failover, failback” · ▶ pair DRS · Backup · MGN · ▶ H26, H27.
10. **Failing over** — Route 53 health checks, TTL, Global Accelerator, ARC, data plane, CloudFront. ▶ **failover time chart** · ▶ pair · ▶ H28–H30, H4.
11. **Cost of resilience and testing** — ▶ **DR cost ladder** (user inputs) · FIS, Resilience Hub · 2 checkpoints.
12. **Triggers, traps, cheat, record** — ▶ two-Region map, trigger table, cheat block, log.

## Map
`core.js` `map.items`, viewBox 1000×900: OUTSIDE AWS band (Users, on-prem servers); a global front-door band (Route 53, Global Accelerator); PRIMARY REGION with AZ a and AZ b (ALB, ASG, RDS primary + standby, Aurora writer + replica, DynamoDB, S3, backup vault) and DR REGION (ALB, scaled-down ASG, cross-Region replica, Aurora secondary, replica table, replica bucket, vault copy, DRS staging area and recovery instances). After the first screenshot: zone label moved left (it covered the DRS line) and the GA line label moved off its station’s subtitle.

## Traps (16), compare pairs (8), cards (40), drills (30)
Pairs: HA · DR · pilot light · warm standby · multi-site · Multi-AZ instance · cluster · read replica · Aurora Global · cross-Region replica · global tables · Aurora Global · replication · backup · DRS · Backup · MGN · Route 53 · GA · ARC.
Drills: two select-TWO (H11, H24); correct letters **A 7 · B 7 · C 7 · D 7 · BD 1 · AC 1**; `words` verbatim in `q` (script-checked). Prestige option wrong in H3, H5, H6, H9, H10, H13, H22, H26, H28, H30; right in H4 (GA), H8 (multi-site), H14 (Aurora Global).

## Checks
`tools/check/widgets-07-ha-dr.js` interacts with every widget (stub trainer, DR picker incl. four target changes and a tooltip, three sorters, four steppers, database chooser, AZ calculator, threat matrix incl. three threats and a tooltip, failover chart, cost ladder incl. three rates, eight pair quick checks, map, trigger table, progress). Screenshots: `node shots-07.js` → `design/compare/s7-*.png`. Engine/CSS: **no change**.
