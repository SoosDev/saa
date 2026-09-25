/* Session 7 trigger cards (HA & disaster recovery). f = what the exam says, b = the answer. line = transit line id or topic.
   Cards marked mine come from his baseline misses (Q61, Q29) and his prestige-distractor pattern (src 'Exam pattern'). */
(function () {
  'use strict';
  const S = window.SESSION = window.SESSION || {};
  const _c = (id, line, f, b, why, tempt, extra) => Object.assign({ id, line, f, b, why, tempt }, extra || {});
  const MINE = { mine: true, src: 'Exam pattern' };
  S.cards = [
    /* DR strategies */
    _c('c01', 'tiers', 'RTO and RPO of hours, most cost-effective DR', 'Backup and restore (backups copied to another Region, infrastructure as code)', 'Nothing runs in the DR Region; Well-Architected: RPO hours, RTO 24 h or less.', 'Multi-site with Global Accelerator — the most complete, the most expensive.', MINE),
    _c('c02', 'tiers', 'RPO minutes, RTO tens of minutes, lowest cost', 'Pilot light', 'Data replicated live; compute defined but switched off until a disaster.', 'Warm standby (pays for running compute).'),
    _c('c03', 'tiers', 'DR site must serve some traffic immediately, RTO minutes', 'Warm standby', 'A scaled-down, fully functional copy; scale it up on failover.', 'Pilot light — cannot process requests until compute is started.'),
    _c('c04', 'tiers', 'Near-zero downtime, users served from several Regions', 'Multi-site active/active', 'All Regions serve traffic; recovery = stop routing to the failed one.', 'Warm standby — still a failover step.'),
    _c('c05', 'tiers', 'RTO vs RPO', 'RTO = max downtime (interruption → service restored) · RPO = max data loss (time since the last recovery point)', 'RTO drives how much must already run; RPO drives how data is copied.', 'Swapping the two.'),
    _c('c06', 'tiers', 'How to choose among the four DR strategies', 'The cheapest one that meets BOTH the RTO and the RPO', 'Cost rises: backup & restore < pilot light < warm standby < multi-site.', 'The most resilient one.'),
    _c('c07', 'tiers', 'Failover should not depend on control-plane actions', 'Use data-plane mechanisms: Route 53 health-check failover, ARC routing controls; pre-provision capacity', 'Well-Architected: control planes (scaling, record edits, restores) may be impaired during an event.', 'Editing DNS records or scaling out during the outage.'),
    /* Multi-AZ compute */
    _c('c08', 'asg', 'Application must survive an Availability Zone failure, low cost', 'Auto Scaling group across ≥2 AZs behind a load balancer + Multi-AZ database', 'HA inside one Region; automatic, no second Region.', 'A second Region or Global Accelerator (prestige).', MINE),
    _c('c09', 'asg', 'Full capacity during an AZ loss without launching instances', 'Static stability: pre-provision N/(k−1) per AZ (3 AZs = +50%)', 'Two AZs need +100%; more AZs, less spare.', 'Rely on Auto Scaling to replace capacity during the event.'),
    _c('c10', 'asg', 'ASG keeps healthy-looking instances that fail requests', 'Turn on ELB health checks for the Auto Scaling group', 'By default the group only uses EC2 status checks.', 'Add more instances.'),
    _c('c11', 'asg', 'Single non-clusterable instance must come back with the same ID, IPs and EBS after a host failure', 'EC2 automatic recovery (system status check)', 'Moves it to new hardware; RAM and instance-store data are lost.', 'ASG of 1 — new instance, new ID and IP.', { update: 'Simplified automatic recovery is on by default for supported instance types.' }),
    /* RDS */
    _c('c12', 'rds', 'What happens in an RDS Multi-AZ failover', 'The endpoint’s DNS CNAME flips to the standby, which becomes primary', 'Same endpoint name; typically 60–120 s; the app reconnects.', 'The IP moves, or a read replica is promoted.', { mine: true, src: 'Exam Q61' }),
    _c('c13', 'rds', 'Multi-AZ DB instance standby', 'Synchronous, serves NO reads', 'It exists only for failover.', 'Point reporting at the standby.'),
    _c('c14', 'rds', 'Readable standbys and failover under 35 s on RDS MySQL/PostgreSQL', 'Multi-AZ DB cluster (1 writer + 2 readable standbys in 3 AZs)', 'Semisynchronous replication; reader endpoint.', 'Multi-AZ DB instance.'),
    _c('c15', 'rds', 'Offload reads / reporting from RDS', 'Read replica (asynchronous; up to 15 for MySQL, MariaDB, PostgreSQL)', 'Can be cross-Region; promoted manually.', 'Multi-AZ (the standby serves nothing).', { update: 'Older material: 5 read replicas; now 15 for MySQL, MariaDB and PostgreSQL (Oracle and SQL Server 5).' }),
    _c('c16', 'rds', 'Cheap cross-Region DR for RDS with RPO of minutes, stay on RDS', 'Cross-Region read replica, promote in a disaster', 'A pilot-light database; not for SQL Server.', 'Aurora Global Database (engine change, more cost).'),
    _c('c17', 'rds', 'Restore RDS to 10:42 yesterday', 'Point-in-time restore from automated backups (retention up to 35 days) — to a NEW instance', 'Restorable to within about the last 5 minutes.', 'Promote a read replica (has the bad data too).'),
    /* Aurora */
    _c('c18', 'aurora', 'Relational, cross-Region, RPO ≈ 1 s, RTO ≈ 1 min', 'Aurora Global Database', 'Storage-level replication, lag typically < 1 s; up to 10 secondary Regions.', 'Cross-Region read replica (manual, more lag).', { update: 'Up to 10 secondary Regions since May 2025 (was 5).' }),
    _c('c19', 'aurora', 'Planned Region move on Aurora Global Database, no data loss', 'Switchover (formerly managed planned failover)', 'Needs a healthy primary; keeps the global topology.', 'Failover (unplanned, may lose data) or detach-and-promote.'),
    _c('c20', 'aurora', 'Primary Region of an Aurora Global Database is down', 'Global database failover to a secondary (about a minute)', 'Accept the replication lag as data loss.', 'Switchover — needs a healthy primary.'),
    _c('c21', 'aurora', 'Undo a bad DELETE on Aurora MySQL in minutes, same cluster', 'Backtrack (up to 72 h, enabled at creation or restore)', 'Rewinds in place; not with Global Database.', 'PITR (new cluster, slower) or failing over to a replica.'),
    _c('c22', 'aurora', 'How Aurora survives an AZ loss', '6 copies of the data across 3 AZs; replica promoted by tier 0–15', 'Failover typically < 60 s, often < 30 s.', 'Needs Multi-AZ turned on like RDS.'),
    /* DynamoDB */
    _c('c23', 'ddb', 'Key-value data, writes in every Region, survive a Region', 'DynamoDB global tables', 'Multi-active; replication typically within a second.', 'Aurora Global Database (one writer Region).'),
    _c('c24', 'ddb', 'DynamoDB across Regions with RPO zero', 'Global tables with multi-Region strong consistency (MRSC)', 'Exactly three Regions: 3 replicas, or 2 + a witness.', 'Default (eventually consistent) global tables.', { update: 'MRSC generally available since June 2025.' }),
    _c('c25', 'ddb', 'Bad job overwrote DynamoDB items 2 hours ago', 'Point-in-time recovery to a new table', 'PITR window 1–35 days, per second.', 'Switch to a global-table replica (it has the bad writes).', { update: 'The PITR period is now configurable from 1 to 35 days (Jan 2025).' }),
    _c('c26', 'nbr', 'Redis/Valkey cache readable in another Region, promotable in a disaster', 'ElastiCache Global Datastore', 'Up to two secondary Regions; promote in under a minute.', 'Rebuild the cache from the database.'),
    /* S3 */
    _c('c27', 's3rep', 'Copy new S3 objects to another Region within 15 minutes, with an SLA', 'CRR + Replication Time Control', '99.99% in 15 min by design; SLA 99.9%.', 'Default CRR (no time commitment).', { update: 'The RTC SLA is 99.9% of objects within 15 minutes; 99.99% is the design target.' }),
    _c('c28', 's3rep', 'Replication rule added, old objects did not copy', 'S3 Batch Replication', 'Rules cover new objects only; versioning required on both buckets.', 'Re-upload everything.'),
    _c('c29', 'nbr', 'EFS copy in another Region, RPO of minutes, writable in a disaster', 'EFS replication (then fail over)', 'AWS states RPO 15 minutes for most file systems; failback reverses it.', 'rsync on a schedule.'),
    /* Backup */
    _c('c30', 'backup', 'Backups of EC2, RDS, DynamoDB, EFS in one place, copied to another Region and account', 'AWS Backup plan with copy rules', 'Tag-based selection, many services, cross-Region + cross-account.', 'DLM — EBS snapshots and AMIs only.', { mine: true, src: 'Exam Q29' }),
    _c('c31', 'backup', 'Automate EBS snapshots only, simplest', 'Amazon Data Lifecycle Manager', 'EBS snapshots and EBS-backed AMIs, cross-Region copy in the policy.', 'AWS Backup (fine, but more than needed).'),
    _c('c32', 'backup', 'Backups nobody can delete, not even root', 'AWS Backup Vault Lock, compliance mode', 'Immutable after the grace time (≥ 72 h).', 'Governance mode (privileged users can remove it).'),
    _c('c33', 'backup', 'Backups must survive a compromised production account', 'Copy to a vault in a separate account (or a logically air-gapped vault) + compliance lock', 'Out of reach and immutable.', 'Longer retention in the same account.', { update: 'Logically air-gapped vaults can be the primary backup target since Nov 2025.' }),
    _c('c34', 'backup', 'Prove backups restore, and measure restore time', 'AWS Backup restore testing', 'Scheduled restores with validation; GA Nov 2023.', 'Vault Lock or Config rules.'),
    /* DRS */
    _c('c35', 'drs', 'On-prem servers, DR in AWS, RPO seconds, RTO minutes, cheap until a disaster', 'AWS Elastic Disaster Recovery', 'Block-level replication into a low-cost staging area; RTO typically 5–20 min.', 'MGN (migration) or AWS Backup (hours).'),
    _c('c36', 'drs', 'Data center repaired after a DRS failover', 'DRS failback (reverse replication, then cut back)', 'Keeps changes made while running in AWS.', 'Restore old on-prem backups.'),
    /* Route 53 / ARC */
    _c('c37', 'r53', 'Show a static S3 maintenance page when the site is down', 'Route 53 failover records (primary ALB with evaluate target health, secondary S3 website)', 'Active-passive DNS failover.', 'Custom Lambda editing DNS.'),
    _c('c38', 'r53', 'Health-check a resource that Route 53 checkers cannot reach', 'Route 53 health check based on a CloudWatch alarm', 'Checkers are on the internet; alarm on a metric instead.', 'Endpoint check on a private IP.'),
    _c('c39', 'r53', 'Move a load balancer’s traffic out of one impaired AZ now, back later', 'Amazon ARC zonal shift (or zonal autoshift)', 'Temporary and reversible; pre-scale the other AZs.', 'Fail over the whole Region.', { update: 'ARC readiness checks are closed to new customers; zonal shift, routing controls and Region switch are not.' }),
    /* Global Accelerator */
    _c('c40', 'ga', 'Multi-Region failover with fixed IPs that partners allow-list, no DNS caching', 'AWS Global Accelerator (2 static anycast IPs, endpoint groups per Region)', 'Health checks move traffic at the edge; no TTL.', 'Route 53 failover — the answer’s IPs change.', MINE)
  ];
})();
