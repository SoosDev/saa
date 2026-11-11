# Feed bites: the ledger

Every bite in `bites/NN-name.js` restates text that is already verified in its session: the chapters in
its `src` (in `sessions/<sid>/learn.js`), the session's `docs/session-NN-*.md`, or a row of CONTEXT §6. This
file lists, per bite, where its claims come from. A bite that needs a fact no session prints must first
verify it against current AWS documentation, add it to CONTEXT §6 and the session's doc, and add a row to
**New facts** below with the URL; `tools/check/bites.js` accepts a digit in a bite only from those sources.

Written 2026-11-11 (version 1: 36 bites, 132 questions, sessions 1 to 9). A few `why` texts restate the same
session's verified text outside its chapters: its drills (05 `GenerateDataKeyWithoutPlaintext`, 07 Vault Lock),
its cards (03: no security group on a NAT gateway), its compare pairs (06, 09) or its S3 class table (01: S3
Standard spans several AZs). Every bite was re-read against its source chapters before it was accepted.

Revised 2026-11-11 after review: three facts the bites needed were verified against current AWS documentation
(AWS MCP) and recorded below, in CONTEXT §6 and in the session docs. One of them corrected Session 1 itself: S3
objects now go up to 50 TB, not the 5 TB its chapter 6 printed. Another corrected Session 4: viewer response functions are
not invoked when the origin returns 400 or higher, where its chapter 6 table printed "every response". Every other claim still restates its session.

## Bites

| Bite | Session | Source chapters | New facts |
|---|---|---|---|
| st-block-file-object | 01-storage | ch3 Block, file, object · ch5 Shared file systems: EFS and the four FSx · ch6 S3 and its storage classes | S3 objects up to 50 TB (New facts) |
| st-s3-classes | 01-storage | ch6 S3 and its storage classes | none |
| st-efs-fsx | 01-storage | ch5 Shared file systems: EFS and the four FSx | none |
| st-moving-data | 01-storage | ch7 How data moves: the six lines · ch8 DataSync vs Storage Gateway: mover vs bridge · ch9 Partners, trucks and the edge | none |
| mig-7rs | 02-migration | ch2 The 7 Rs | none |
| mig-mgn-dms | 02-migration | ch4 Moving servers: MGN, and its twin DRS · ch5 Moving databases: DMS, SCT and the Aurora shortcut | none |
| mig-dms-sct | 02-migration | ch5 Moving databases: DMS, SCT and the Aurora shortcut | none |
| mig-edge-compute | 02-migration | ch7 Running in both places: where AWS compute sits | none |
| net-subnets-nat | 03-networking | ch2 The VPC: addresses, subnets, route tables, the front door · ch3 Getting out without letting anyone in: NAT · ch4 Filtering: security groups and network ACLs | none |
| net-sg-nacl | 03-networking | ch4 Filtering: security groups and network ACLs | none |
| net-peering-tgw-privatelink | 03-networking | ch6 VPC to VPC, one pair at a time: peering · ch7 Many networks: Transit Gateway · ch8 Reaching AWS services privately: endpoints and PrivateLink | none |
| net-vpn-dx | 03-networking | ch9 On-premises over the internet: Site-to-Site VPN and Client VPN · ch10 On-premises over a private line: Direct Connect | none |
| edge-cf-vs-ga | 04-global | ch2 The AWS edge: who sits in the path? · ch3 CloudFront: distributions, origins and behaviours · ch8 Global Accelerator: static IPs and a fast lane, no cache | none |
| edge-r53-routing | 04-global | ch10 Route 53 routing policies | none |
| edge-private-content | 04-global | ch5 Securing CloudFront: OAC, signed URLs and cookies, HTTPS, WAF | none |
| edge-functions | 04-global | ch6 Code at the edge: CloudFront Functions vs Lambda@Edge | Lambda@Edge origin-response body; viewer response not invoked on 400 or higher (New facts) |
| sec-kms-envelope | 05-security | ch3 KMS: keys, key policies and envelope encryption · ch4 Operating keys: rotation, deletion, multi-Region, CloudHSM | none |
| sec-secrets-params | 05-security | ch6 Secrets, parameters and certificates | none |
| sec-waf-shield-nfw | 05-security | ch7 AWS WAF: rules, priorities and rate limits · ch8 Shield, Firewall Manager and Network Firewall | none |
| sec-detect | 05-security | ch9 Detection: GuardDuty, Inspector, Macie | none |
| gov-scp-fence | 06-governance | ch3 AWS Organizations: accounts, OUs and the management account · ch4 SCPs, RCPs and declarative policies | none |
| gov-roles-cross-account | 06-governance | ch6 Roles, STS and cross-account access | none |
| gov-ct-orgs-ic | 06-governance | ch7 IAM Identity Center and ABAC · ch8 Control Tower: landing zones and controls | none |
| gov-config-cloudtrail | 06-governance | ch10 AWS Config: record, evaluate, remediate · ch2 The governance map: structure, guardrails, identity, sharing, records | none |
| dr-rto-rpo | 07-ha-dr | ch2 RTO, RPO and the four DR strategies | none |
| dr-four-strategies | 07-ha-dr | ch2 RTO, RPO and the four DR strategies · ch4 RDS: Multi-AZ, read replicas and backups | none |
| dr-multiaz-replica | 07-ha-dr | ch4 RDS: Multi-AZ, read replicas and backups | none |
| dr-replication-backup | 07-ha-dr | ch7 Replication is not a backup · ch8 AWS Backup: plans, vaults, locks and restore tests | none |
| db-which-one | 08-databases | ch2 Choosing the database | none |
| db-proxy-storm | 08-databases | ch4 RDS Proxy and the connection storm | none |
| db-ddb-modes | 08-databases | ch8 DynamoDB capacity: RCU, WCU and the two modes | none |
| db-cache-or-replica | 08-databases | ch5 Scaling reads · ch9 Caching: ElastiCache, DAX and MemoryDB | none |
| sl-queue-topic-bus-stream | 09-serverless | ch2 Choosing: queue, topic, bus or stream · ch4 SNS and fan-out · ch5 EventBridge: buses, rules, Pipes and Scheduler | none |
| sl-kds-firehose | 09-serverless | ch6 Streams: Kinesis Data Streams and MSK · ch7 Firehose: delivery, not processing | none |
| sl-step-functions | 09-serverless | ch9 Step Functions: orchestrating the steps | none |
| sl-glue-emr-athena | 09-serverless | ch10 Glue and EMR: transforming data at rest · ch11 Athena, Lake Formation and Quick Sight | none |

## New facts

| Bite | Fact | Source URL |
|---|---|---|
| st-block-file-object | S3's maximum object size is 50 TB since December 2025 (was 5 TB); one PUT still takes at most 5 GB, multipart is required over 5 GB. Verified 2026-11-11; Session 1 (ch6, its S3 card, ch11, docs/session-01-storage.md) and CONTEXT §6 corrected to match. Announcement: https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-s3-maximum-object-size-50-tb/ | https://docs.aws.amazon.com/AmazonS3/latest/userguide/upload-objects.html |
| edge-functions | Lambda@Edge exposes the request body (Include Body, viewer or origin request); an origin-response function is not shown the body the origin returned, but can replace it with a generated body (for example a 200 page instead of a 5xx) or remove it. Verified 2026-11-11; added to CONTEXT §6 and docs/session-04-global.md. | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-generating-http-responses.html |
| edge-functions | CloudFront does not invoke edge functions for viewer response events when the origin returns HTTP status 400 or higher; Lambda@Edge origin response functions are invoked for all origin responses. Verified 2026-11-11; Session 4 (ch6 events table, docs/session-04-global.md) and CONTEXT §6 corrected to match. | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-function-restrictions-all.html |
