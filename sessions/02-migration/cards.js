/* Session 2 trigger cards (Migration & Hybrid). f = what the exam says, b = the answer. line = transit line id or topic. */
(function () {
  'use strict';
  const S = window.SESSION = window.SESSION || {};
  const _c = (id, line, f, b, why, tempt, extra) => Object.assign({ id, line, f, b, why, tempt }, extra || {});
  const DISC = { update: 'Migration Hub and Application Discovery Service are closed to new customers since 7 Nov 2025; AWS Transform now does discovery, planning and tracking. Banks still use the old names.' };
  const RESOLVER = { update: 'Route 53 Resolver is now called Route 53 VPC Resolver.' };
  S.cards = [
    _c('c01', 'discover', 'Discover servers and their utilisation before migrating', 'Application Discovery Service (now AWS Transform)', 'Collects inventory, utilisation and (with agents) dependencies to plan the move.', 'Migration Hub alone — it tracks progress; discovery feeds it.', DISC),
    _c('c02', 'discover', 'Which servers talk to each other / dependency mapping', 'Discovery AGENT on each server', 'The agent records processes and network connections; works on bare metal too.', 'Agentless collector — inventory and utilisation only, no connections.', DISC),
    _c('c03', 'discover', 'VMware only, no agents allowed, need inventory', 'Agentless collector in vCenter', 'Reads VM inventory and utilisation from vCenter; nothing installed on guests.', 'Discovery agent — forbidden here.', DISC),
    _c('c04', 'discover', 'One dashboard to track migration progress across tools', 'Migration Hub (now AWS Transform)', 'Status per application across MGN, DMS and partner tools.', 'CloudWatch — metrics, not migration status.', DISC),
    _c('c05', 'mgn', 'Lift-and-shift servers, minimal changes, quickly', 'AWS Application Migration Service (MGN)', 'Block-level replication to EC2, no app changes.', 'DMS — rows, not servers.', { update: 'The docs now title it “AWS Transform MGN”.' }),
    _c('c06', 'mgn', 'Physical, Hyper-V or other-cloud servers to EC2', 'MGN', 'Any source (physical, VMware, Hyper-V, other clouds); target always EC2.', 'DataSync — moves files, not bootable servers.'),
    _c('c07', 'mgn', 'Test launch before cutover; minutes of downtime', 'MGN', 'Continuous replication to a staging area, test instances, then a cutover of minutes.', 'DRS — same engine, but for DR with failback.'),
    _c('c08', 'mgn', 'Server Migration Service (SMS), CloudEndure Migration', 'Old names for MGN', 'SMS shut down 1 Apr 2023; CloudEndure Migration ended 30 Dec 2022. Both mean MGN now.', 'Separate live services — they are gone.'),
    _c('c09', 'drs', 'DR for on-prem servers in AWS; RPO seconds; fail back after repair', 'AWS Elastic Disaster Recovery (DRS)', 'MGN’s engine, but it never ends: replicate, fail over, fail back.', 'MGN — one-way migration, not ongoing DR.'),
    _c('c10', 'dms', 'Database migration; the source stays online', 'AWS DMS', 'Replication instance or Serverless reads rows while the source keeps running.', 'MGN — copies the whole server as blocks, lands on EC2.'),
    _c('c11', 'dms', 'Ongoing replication / CDC / keep in sync until cutover', 'DMS full load + CDC', 'Changes stream after the full load; downtime is only the final catch-up.', 'Full load only — downtime lasts the whole copy.'),
    _c('c12', 'dms', 'Oracle → Aurora PostgreSQL; convert stored procedures', 'SCT or DMS Schema Conversion + DMS', 'Schema and code by SCT/DMS SC, rows by DMS.', 'DMS alone — it does not convert code.'),
    _c('c13', 'dms', 'Teradata / Netezza → Amazon Redshift', 'AWS SCT (+ data extraction agents)', 'SCT is the tool for data warehouses: converts the schema and extracts the data.', 'DMS alone — no schema conversion, not the warehouse path.'),
    _c('c14', 'dms', 'RDS MySQL → Aurora MySQL; minimal downtime, least effort', 'Aurora read replica of the RDS instance, promote at zero lag', 'Native replication; no extra tooling.', 'DMS — works, but more to manage.'),
    _c('c15', 'dms', 'RDS MySQL → Aurora MySQL; downtime is OK', 'Snapshot, restore as Aurora', 'Simplest path when writes can stop during the restore.', 'MGN — RDS is not a server you can replicate.'),
    _c('c16', 'dms', 'Many-TB database, thin pipe, minimal downtime', 'Truck the initial load, then DMS CDC', 'Bulk goes offline; only the changes cross the pipe.', 'Direct Connect — weeks to provision.'),
    _c('c17', 'dms', 'DMS must survive an AZ failure', 'Multi-AZ replication instance (or DMS Serverless Multi-AZ)', 'A standby in another AZ takes over.', 'A second task — duplicates the writes.'),
    _c('c18', 'dms', 'Replicate an on-prem DB to S3 as Parquet, continuously', 'DMS CDC task with an S3 target (Parquet)', 'S3 is a DMS target; CSV by default, Parquet optional.', 'Glue — catalogues and transforms, no CDC from the source.'),
    _c('c19', 'dms', 'DMS encryption in transit', 'SSL on the endpoints (with a certificate)', 'DMS endpoints support SSL connections to source and target.', 'Network Firewall — filters traffic, does not encrypt it.'),
    _c('c20', 'bytes', 'Migrate within 2 weeks; no Direct Connect yet', 'Site-to-Site VPN (or internet) now', 'DX takes weeks. 1 Gbps ≈ 10 TB/day, 100 Mbps ≈ 1 TB/day.', 'Order DX and wait — misses the deadline.'),
    _c('c21', 'placement', 'Data residency; AWS APIs in our own building', 'AWS Outposts', 'AWS-managed racks in your facility, linked to a parent Region.', 'Local Zones — an AWS site in a city, not your building.', { update: 'Outposts 1U/2U servers are no longer sold to new customers; racks (2nd gen GA 2025) remain.' }),
    _c('c22', 'placement', 'Single-digit ms latency for users in one city', 'AWS Local Zones', 'AWS infrastructure in a metro area close to end users.', 'Outposts — needs your own site and hardware.'),
    _c('c23', 'placement', '5G, mobile edge, AR/VR on phones', 'AWS Wavelength', 'AWS compute and storage inside telco 5G networks.', 'CloudFront — caches content, runs no app servers.'),
    _c('c24', 'placement', 'Containers on our own servers with the ECS control plane', 'Amazon ECS Anywhere', 'Registers your servers as external instances in an ECS cluster.', 'Outposts — that is buying AWS hardware.', { update: 'Supported OS list narrowed in 2026 (AL2023, Ubuntu 20/22/24, RHEL 9); Windows deprecated.' }),
    _c('c25', 'ops', 'Patch / run commands on on-prem and EC2 from one place', 'Systems Manager with hybrid activations', 'On-prem servers register as managed nodes (mi- IDs) alongside EC2.', 'OpsWorks — Chef/Puppet, end of life.'),
    _c('c26', 'identity', 'Console/app sign-in with on-prem AD; store nothing in AWS', 'AD Connector', 'A proxy that forwards auth to on-prem; cheap.', 'Managed Microsoft AD — a whole directory in AWS.'),
    _c('c27', 'identity', 'RDS SQL Server Windows auth / FSx for Windows domain join', 'AWS Managed Microsoft AD', 'A real AD (2 DCs, 2 AZs) that these services can join.', 'AD Connector — not supported by RDS SQL Server or FSx for Windows.'),
    _c('c28', 'identity', 'Trust between AWS and on-prem forests', 'AWS Managed Microsoft AD', 'Supports forest trusts with on-prem AD.', 'Simple AD — no trusts.'),
    _c('c29', 'identity', 'Auth must keep working if the link to on-prem fails', 'Managed Microsoft AD (+ trust)', 'Its domain controllers run in AWS, so auth continues without the link.', 'AD Connector — every request goes over the link.'),
    _c('c30', 'identity', 'Small, cheap, basic domain; no trust', 'Simple AD', 'Samba-based, small, basic AD features.', 'Managed Microsoft AD — more than needed.'),
    _c('c31', 'dns', 'On-prem servers resolve private hosted zone names', 'Route 53 VPC Resolver INBOUND endpoint', 'On-prem DNS conditionally forwards the zone to the endpoint IPs; the query comes into the VPC.', 'Outbound — that is for queries leaving the VPC.', RESOLVER),
    _c('c32', 'dns', 'EC2 resolves corp.internal (an on-prem domain)', 'Route 53 VPC Resolver OUTBOUND endpoint + forwarding rule', 'The query leaves the VPC towards on-prem DNS.', 'Inbound — wrong direction.', RESOLVER),
    _c('c33', 'dns', 'Share DNS forwarding rules with other accounts', 'Resolver rules shared through AWS RAM', 'One set of rules, associated with VPCs in other accounts.', 'Copy the rules into every account — drift and toil.', RESOLVER),
    _c('c34', '7r', 'Retire / Retain / Rehost / Relocate', 'Turn off / stay on-prem / EC2 as-is (MGN) / move the hypervisor', 'The four Rs with the least change.', null),
    _c('c35', '7r', 'Replatform / Repurchase / Refactor', 'Tinker (managed DB) / switch to SaaS / rebuild cloud-native', 'The three Rs with the most change.', null),
    _c('c36', '7r', 'Keep vSphere tools; no VM conversion', 'Relocate (VMware Cloud on AWS in banks)', 'The hypervisor moves; VMs and vCenter stay as they are.', 'MGN — converts every VM to EC2.', { update: 'VMware Cloud on AWS is sold by Broadcom, not AWS, since 30 Apr 2024. AWS’s current answer is Amazon Elastic VMware Service (EVS, GA Aug 2025) with VMware HCX.' }),
    _c('c37', '7r', 'Cloud-native; pay per request; scale independently', 'Refactor', 'Re-architect: Lambda, DynamoDB, microservices.', 'Rehost — same architecture on EC2.'),
    _c('c38', 'dns', 'Route 53 Resolver’s current name', 'Route 53 VPC Resolver', 'Renamed; same inbound/outbound endpoints and rules.', null, RESOLVER),
    _c('c39', 'mgn', 'MGN target', 'Always Amazon EC2', 'MGN launches servers as EC2 instances, never into RDS.', 'RDS — that is DMS’s job.'),
    _c('c40', 'identity', 'FSx for Windows + AD Connector?', 'Not compatible — use Managed Microsoft AD (or self-managed AD)', 'FSx for Windows needs a real domain to join.', '“Works” — the classic trap.')
  ];
})();
