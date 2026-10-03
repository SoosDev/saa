# Session 8 — Databases & Caching: build brief

Built as `sessions/08-databases/` on the same engine and design as Sessions 1–7. Follows CONTEXT.md §9. Cluster 8 in §5: choosing the database (RDS vs Aurora vs DynamoDB vs Redshift vs purpose-built: DocumentDB, Neptune, Keyspaces, Timestream, OpenSearch, MemoryDB, Aurora DSQL; QLDB’s shutdown), RDS (engines, storage, RDS Custom, Blue/Green, Optimized Reads/Writes, Extended Support), RDS Proxy, read scaling (read replicas, Aurora Replicas, reader and custom endpoints, caches), Aurora (cluster volume, Serverless v2, I/O-Optimized, Limitless, DSQL, zero-ETL), DynamoDB (keys and hot partitions, RCU/WCU, on-demand vs provisioned, warm throughput, GSI/LSI, DAX, TTL, Streams, transactions, table classes), ElastiCache (Valkey / Redis OSS / Memcached, Serverless, cluster mode, caching strategies, session store), MemoryDB, Redshift (Serverless, RA3, Spectrum, concurrency scaling, data sharing, zero-ETL), and the database security touch points (encryption at creation, IAM DB auth, Secrets Manager). Domains **D1 ● D2 ●● D3 ●●● D4 ●** (mixed).

His record here: baseline **Q15** (Lambda exhausted RDS connections; he raised Lambda concurrency; answer RDS Proxy — tag **A**), **Q57** (“big data + SQL/BI” → EMR + Redshift — tag **K**) and the **prestige-distractor pattern** (CONTEXT §3). Drills **B1** (`src: 'Exam Q15'`), **B2** (`'Exam Q57'`), **B3–B4** (`'Exam pattern'`) and cards **c16, c19, c39** carry `mine: true`. Resilience (Multi-AZ, replicas for DR, Global Database, global tables, PITR, backups) is Session 7 and is linked, not repeated. Kinesis / Glue / Athena / EMR depth → Session 9 (named only as switches). KMS and Secrets Manager depth → Session 5.

## Colour rule

The same service keeps the same colour on every page. **Session 8 adds no hue**: every family is an **ink line** (4 px), told apart by dash and station shape, always labelled. RDS, Aurora and DynamoDB keep the ids, dashes and shapes they have on Session 7’s map. Chart bars stay ink.

| Line (`id`) | Dash | Stations |
|---|---|---|
| RDS · read replicas · Blue/Green (`rds`) | `2 7` (as Session 7) | triangles |
| RDS Proxy (`proxy`) | `6 4` | squares |
| Aurora · Serverless · I/O-Optimized (`aurora`) | `10 6` (as Session 7) | hexagons |
| DynamoDB · DAX (`ddb`) | `1 9` (as Session 7) | diamonds |
| ElastiCache · MemoryDB (`cache`) | solid | circles |
| Redshift · zero-ETL (`redshift`) | `24 8` | pentagons |
| Purpose-built databases (`purpose`) | `12 8` | rings |

Topics (neutral chips): `choose` = Choosing a database; `sec` = Database security.

## Facts verified 2026-10-03 (AWS docs via WebFetch / WebSearch; the AWS MCP server was down this session)

**RDS**
- Engines Db2, MariaDB, MySQL, PostgreSQL, Oracle, SQL Server; storage **64 TiB** (Db2/MariaDB/MySQL/PostgreSQL), **256 TiB** for Oracle and SQL Server with up to three additional storage volumes; magnetic deprecated (no restore to magnetic from 1 Jul 2026); gp3 baseline 3,000 IOPS; io2 Block Express up to 256,000 IOPS — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- `max_connections` defaults (MySQL `{DBInstanceClassMemory/12582880}`, ~630 on an 8 GiB class such as db.m7g.large, ~60 on db.t3.micro; PostgreSQL `LEAST(…/9531392, 5000)`); read replicas per primary quota 15; custom endpoints per Aurora cluster 5 (quota); RDS Proxy recommended for frequent open/close — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- RDS Proxy: pooling, queueing, IAM auth for clients, Secrets Manager or IAM to the DB, proxy in the DB’s VPC (extra endpoints can be cross-VPC, same Region — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-endpoints.html), never public, writer only for an RDS instance (read-only endpoints for Aurora and Multi-AZ DB clusters), 16 KB statement pins — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html · not available for RDS for Db2 or Oracle — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.RDSProxy.html · “reduces failover times for Aurora and RDS databases by up to 66%”, engines Aurora MySQL/PostgreSQL, RDS for MySQL/PostgreSQL/MariaDB/SQL Server — https://aws.amazon.com/rds/proxy/faqs/
- Blue/Green Deployments: RDS for MariaDB, MySQL, PostgreSQL; switchover typically under a minute, no data loss, no app change; green read-only by default — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-overview.html
- RDS Custom: Oracle and SQL Server only — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-custom.html · **RDS Custom for Oracle sunset**: announced 31 Mar 2026, end of support 31 Mar 2027, migrate to Oracle on EC2 — https://docs.aws.amazon.com/general/latest/gr/sunset_services.html · https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/RDS-Custom-for-Oracle-end-of-support.html
- Extended Support: paid, automatic enrolment, up to 3 years past end of standard support — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/extended-support.html
- Optimized Reads (RDS for MySQL, instance store, up to 2x faster queries) — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-optimized-reads.html · Optimized Writes (RDS for MySQL, up to 2x write throughput) — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-optimized-writes.html
- Encryption only at creation; snapshot → encrypted copy → restore; no encrypted replica of an unencrypted instance — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- IAM database authentication: RDS for MariaDB, MySQL, PostgreSQL; 15-minute tokens; SSL/TLS — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html · Aurora MySQL and PostgreSQL — https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.IAMDBAuth.html
- Lambda default account concurrency 1,000 per Region — https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html

**Aurora**
- Cluster volume up to **256 TiB** on specific engine versions; I/O-Optimized best when I/O ≥ 25% of spend; switch to it once every 30 days, back any time — https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html · 256 TiB (was 128) Jul 2025 — https://aws.amazon.com/about-aws/whats-new/2025/07/amazon-aurora-postgresql-database-clusters-256-tib-storage-volume/ · https://aws.amazon.com/about-aws/whats-new/2025/07/amazon-aurora-mysql-database-clusters-256-tib-storage/
- I/O-Optimized GA 11 May 2023, up to 40% savings — https://aws.amazon.com/about-aws/whats-new/2023/05/amazon-aurora-i-o-optimized/
- Serverless v2: ACU ≈ 2 GiB, 0–256 ACU, 0.5-ACU increments, auto-pause at 0, promotion tiers 0–1 follow the writer, v1 deprecated — https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html · scaling to 0 (Nov 2024) — https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-aurora-serverless-v2-scaling-zero-capacity/
- Endpoints (cluster, reader with connection balancing, custom, instance, global writer) — https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.Endpoints.html
- Limitless Database (routers + shards, millions of write TPS) — https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless.html · GA 31 Oct 2024 — https://aws.amazon.com/blogs/aws/amazon-aurora-postgresql-limitless-database-is-now-generally-available/
- DSQL GA 27 May 2025, active-active, PostgreSQL 16-compatible, 99.999% multi-Region — https://aws.amazon.com/blogs/aws/amazon-aurora-dsql-is-now-generally-available/ · https://docs.aws.amazon.com/aurora-dsql/latest/userguide/what-is-aurora-dsql.html

**DynamoDB**
- RCU/WCU, request units, transactional = 2, switch to on-demand 4× per 24 h, item 400 KB, transactions 100 items / 4 MB, LSI 10 GB item collections — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html · https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
- Quotas: 40,000 RRU/WRU per table (on-demand and provisioned default), 80,000 per account (provisioned), 20 GSIs (default), 5 LSIs — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
- Partition max 3,000 RCU / 1,000 WCU; adaptive capacity; write sharding — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
- LSI created with the table, same partition key, strong reads possible — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html
- **On-demand is the default and recommended mode** — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html · **on-demand −50%, global tables replicated writes up to −67%** (effective 1 Nov 2024) — https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-dynamo-db-reduces-prices-on-demand-throughput-global-tables/
- Prices used by the calculator (us-east-1, Standard): on-demand $0.125 per million reads, $0.625 per million writes — https://aws.amazon.com/dynamodb/pricing/on-demand/ · provisioned $0.00013 per RCU-hour, $0.00065 per WCU-hour — https://aws.amazon.com/dynamodb/pricing/provisioned/ (→ break-even ≈ 28.9% average utilisation of the provisioned peak, derived)
- Warm throughput and pre-warming (charged, one-way) — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/warm-throughput.html
- Standard-IA (storage > ~50% of throughput cost; two class changes per 30 days) — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.tableclasses.html
- DAX (microseconds, eventually consistent, not for strong reads or write-heavy; 1 primary + up to 10 replicas) — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html
- Streams 24 h, exactly once, ordered per item — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html · TTL within a few days, no WCU — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html

**ElastiCache · MemoryDB** (subagent report, spot-checked by me where marked ✓)
- Engines Valkey, Memcached, Redis OSS; Serverless scales memory/compute/network — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html · Serverless GA 27 Nov 2023 — https://aws.amazon.com/blogs/aws/amazon-elasticache-serverless-for-redis-and-memcached-now-generally-available/
- ✓ Valkey (8 Oct 2024): node-based 20% lower, Serverless 33% lower, 100 MB minimum (Redis OSS 1 GB), MemoryDB for Valkey 30% lower — https://aws.amazon.com/blogs/database/amazon-elasticache-and-amazon-memorydb-announce-support-for-valkey/
- Cluster mode (one shard + 5 replicas when disabled; up to 500 nodes when enabled) — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheNodes.NodeGroups.html · engine comparison (Memcached multithreaded, no replication) — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/SelectEngine.html
- Global Datastore up to 2 other Regions, node-based only — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Redis-Global-Datastore.html · data tiering r6gd — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/data-tiering.html
- Caching strategies (lazy loading, write-through, TTL) — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html
- ✓ **ElastiCache durability** for Valkey 9.0 (2 Jun 2026; synchronous or asynchronous Multi-AZ transaction log) — https://aws.amazon.com/about-aws/whats-new/2026/06/durability-amazon-elasticache/
- Redis OSS v4/v5 out of standard support 31 Jan 2026 (Extended Support) — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/engine-versions.html
- MemoryDB (durable, Multi-AZ transaction log, µs reads, ms writes) — https://docs.aws.amazon.com/memorydb/latest/devguide/what-is-memorydb.html · Multi-Region GA Dec 2024 — https://aws.amazon.com/about-aws/whats-new/2024/12/general-availability-amazon-memory-db-multi-region/

**Redshift**
- ✓ Serverless RPU = 16 GB, base default 128, adjustable 4–512, 1,024 in five Regions — https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-capacity.html · GA Jul 2022 — https://aws.amazon.com/about-aws/whats-new/2022/07/amazon-redshift-serverless-generally-available/
- RA3 / RG managed storage, DS2 no longer available — https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-clusters.html · DC2 deprecation announced Apr 2025 — https://aws.amazon.com/blogs/big-data/amazon-redshift-dc2-migration-approach-with-a-customer-case-study
- Spectrum — https://docs.aws.amazon.com/redshift/latest/dg/c-using-spectrum.html · concurrency scaling, up to 1 h free credits a day — https://aws.amazon.com/redshift/features/concurrency-scaling/ · Multi-AZ RA3 GA Nov 2023 — https://aws.amazon.com/about-aws/whats-new/2023/11/amazon-redshift-multi-az-ra3-clusters/
- Zero-ETL sources — https://docs.aws.amazon.com/redshift/latest/mgmt/zero-etl-using.html · Aurora MySQL (Nov 2023) — https://aws.amazon.com/blogs/aws/amazon-aurora-mysql-zero-etl-integration-with-amazon-redshift-is-now-generally-available/ · Aurora PostgreSQL and DynamoDB (15 Oct 2024) — https://aws.amazon.com/blogs/aws/amazon-aurora-postgresql-and-amazon-dynamodb-zero-etl-integrations-with-amazon-redshift-now-generally-available/ · RDS for MySQL (Sep 2024) — https://aws.amazon.com/about-aws/whats-new/2024/09/amazon-rds-mysql-zero-etl-integration-redshift-generally-available/ · RDS for PostgreSQL (Jul 2025) — https://aws.amazon.com/about-aws/whats-new/2025/07/amazon-rds-zero-etl-redshift-generally-available/ · RDS for Oracle (Jul 2025) — https://aws.amazon.com/about-aws/whats-new/2025/07/amazon-rds-oracle-zero-etl-integration-redshift/

**Purpose-built**
- DocumentDB (MongoDB-compatible, instance-based + elastic clusters) — https://docs.aws.amazon.com/documentdb/latest/developerguide/what-is.html · elastic clusters Nov 2022 — https://aws.amazon.com/about-aws/whats-new/2022/11/amazon-documentdb-mongodb-elastic-clusters-available/ · Serverless Jul 2025 — https://aws.amazon.com/about-aws/whats-new/2025/07/amazon-documentdb-serverless/
- Neptune (Gremlin, openCypher, SPARQL) — https://docs.aws.amazon.com/neptune/latest/userguide/intro.html · Neptune Analytics Nov 2023 — https://aws.amazon.com/about-aws/whats-new/2023/11/amazon-neptune-analytics/
- Keyspaces (Cassandra-compatible, serverless, CQL; active-active multi-Region) — https://docs.aws.amazon.com/keyspaces/latest/devguide/what-is-keyspaces.html · https://docs.aws.amazon.com/keyspaces/latest/devguide/multiRegion-replication.html
- ✓ **Timestream for LiveAnalytics closed to new customers 20 Jun 2025**; use Timestream for InfluxDB — https://docs.aws.amazon.com/timestream/latest/developerguide/AmazonTimestreamForLiveAnalytics-availability-change.html · InfluxDB GA Mar 2024 — https://aws.amazon.com/about-aws/whats-new/2024/03/amazon-timestream-influxdb-available/
- OpenSearch Serverless collections (search, time series, vector) — https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-overview.html · DynamoDB → OpenSearch zero-ETL GA Nov 2023 — https://aws.amazon.com/blogs/aws/amazon-dynamodb-zero-etl-integration-with-amazon-opensearch-service-is-now-generally-available/
- ✓ **QLDB full shutdown 31 Jul 2025** — https://docs.aws.amazon.com/general/latest/gr/full_shutdown_services.html

### Changed since the exam guide (shown as callouts)

| Old (banks / older courses) | Now | Source |
|---|---|---|
| RDS storage 16 TiB; magnetic as a cheap option | **64 TiB** (Oracle/SQL Server **256 TiB** with additional volumes); magnetic deprecated | CHAP_Storage |
| Five RDS engines | **+ RDS for Db2** | CHAP_Storage |
| RDS Proxy: MySQL/PostgreSQL | + **MariaDB, SQL Server** (not Oracle, Db2) | RDS Proxy FAQ |
| Aurora storage 128 TiB (64 TiB in older courses) | **256 TiB** (Jul 2025) | whats-new 2025/07 |
| Serverless v2 min 0.5 ACU, max 128; only v1 pauses | **0–256 ACU**, **auto-pause at 0** (Nov 2024); v1 deprecated | serverless-v2 how-it-works |
| Aurora charges every I/O | + **I/O-Optimized** (May 2023) | whats-new 2023/05 |
| Aurora writes = one writer | + **Limitless Database** (Oct 2024), **DSQL** (May 2025) | limitless, DSQL GA |
| DynamoDB provisioned = default; on-demand expensive | **On-demand default and recommended**, price **−50%** (Nov 2024) | capacity-mode, whats-new 2024/11 |
| — | **Warm throughput / pre-warming** | warm-throughput |
| ElastiCache: Redis or Memcached | **Valkey** (Oct 2024, cheaper), **Serverless** (Nov 2023), **durability** for Valkey 9.0 (Jun 2026); Redis OSS v4/v5 in paid Extended Support | Valkey blog, whats-new 2026/06 |
| MemoryDB single-Region | **Multi-Region** (Dec 2024) | whats-new 2024/12 |
| Redshift DC2 for small warehouses; Serverless min 32 RPU | **DC2 deprecated** (Apr 2025), DS2 gone, **RG** nodes; Serverless from **4 RPU** | Redshift docs, DC2 blog |
| ETL from Aurora to Redshift | **Zero-ETL** from Aurora, RDS (MySQL, PostgreSQL, Oracle), DynamoDB | zero-etl-using |
| QLDB for ledgers | **Full shutdown 31 Jul 2025** | full_shutdown_services |
| Timestream (one product) | **LiveAnalytics closed to new customers** (Jun 2025) → **Timestream for InfluxDB** | availability-change |
| RDS Custom for Oracle | **Sunset**, end of support 31 Mar 2027 | sunset_services |

### Not verified → not printed
Redshift DC2 end-of-life date (April 2026 from secondary sources only); AQUA status (no current AWS doc — the lesson says not to count on it); Redshift Serverless “per RPU-hour” wording; Keyspaces multi-Region GA date; the AWS-recommended QLDB migration target (lesson says “for example Aurora PostgreSQL with audit tables” as a design, not an AWS recommendation); RDS Proxy default pool percentage (the widget’s 90% pool cap is labelled the learner’s setting); exact Aurora I/O-Optimized price premiums (only the 25% rule and “up to 40%” are printed); DAX latency figure beyond “microseconds”. The cache simulator, the share of time in a query and the cost chart’s month are labelled assumptions.

### Noticed for Session 7 (not changed here)
Session 7 corrected 2026-10-03: RDS for Oracle and SQL Server now allow **15 read replicas per source** (AWS recommends ≤ 5 to limit lag).

## Stub for this session (replaces Session 7’s slots)

| Slot | Values | Why this slot |
|---|---|---|
| DATA MODEL | relational · key-value · document · graph · time series · analytics | The family is decided by the data’s shape; it kills DynamoDB for joins, RDS for warehouses, and every purpose-built engine outside its model. |
| LOAD | read-heavy · write-heavy · spiky · steady · many connections | Separates replicas (reads) from sharding/keys (writes), on-demand (spiky) from provisioned (steady), and **connections** (Q15) from work. |
| LATENCY | microseconds · milliseconds · seconds | Microseconds = memory (ElastiCache, DAX, MemoryDB); seconds = analytics is fine. |
| SUPERLATIVE | cheapest · least ops · fastest · none stated | Least ops picks managed / serverless / zero-ETL; cheapest picks the smallest change that works. |

Each drill’s `stub` records what the stem literally states (`any` / `none stated` otherwise). The stub is optional and unscored.

## Learn: 12 chapters (full text in `learn.js`; ▶ = interactive)

1. **How to read a database question** — record table (Q15, Q57, prestige), stub, method, built-for hooks, B1 callout. ▶ 2 checkpoints.
2. **Choosing the database** — family table, QLDB/Timestream callout. ▶ **database chooser** (decision tree) · ▶ family sorter (12) · ▶ pair rel-kv · ▶ B14, B29.
3. **RDS: engines, storage and safe changes** — engines, storage (update), Optimized Reads/Writes, RDS Custom (sunset callout), Blue/Green, Extended Support. ▶ stepper “major version upgrade with Blue/Green” · ▶ B5–B7.
4. **RDS Proxy and the connection storm** — max_connections, Lambda 1,000. ▶ **connection-storm simulator** · ▶ stepper “Lambda burst through RDS Proxy” (Q15 note) · ▶ pair proxy-scale · ▶ B1, B8, B9.
5. **Scaling reads** — replicas, Aurora endpoints table, prestige callout, caches. ▶ **read-scaling sorter** (8) · ▶ B12, B3, B24.
6. **Aurora** — cluster volume, Serverless v2 (update), I/O-Optimized, Limitless, DSQL, zero-ETL. ▶ pair rds-aurora · ▶ B10, B11, B13.
7. **DynamoDB: keys, partitions and indexes** — partitions, hot keys, write sharding, GSI/LSI, transactions, Streams, TTL. ▶ pair gsi-lsi · ▶ GSI-or-LSI sorter (8) · ▶ B17, B18, B15.
8. **DynamoDB capacity** — RCU/WCU table. ▶ **capacity calculator** (RCU/WCU math + on-demand vs provisioned cost over utilisation with the break-even) · ▶ pair od-prov · ▶ B16, B19 · warm throughput, table classes + checkpoint.
9. **Caching** — ElastiCache engines table, Valkey update, strategies. ▶ **cache-pattern simulator** · ▶ pairs lazy-wt, cache3 · ▶ B22, B21, B20, B23, B4.
10. **Redshift** — Q57 callout, Serverless, RA3, Multi-AZ, concurrency scaling, data sharing, node-type update, Spectrum, zero-ETL. ▶ pair olap · ▶ B2, B25, B26.
11. **Purpose-built engines and database security** — engine table, encryption, IAM DB auth, Secrets Manager. ▶ stepper “encrypting an unencrypted RDS database” · ▶ B28, B30, B27.
12. **Triggers, traps, cheat, record** — map, trigger table, cheat block, log.

## Map
`core.js` `map.items`, viewBox 1000×880: OUTSIDE AWS band (Users), APP TIER band (one pill the lines drop from), and four boxes — RELATIONAL · OLTP (RDS Proxy → RDS primary → read replicas / Blue-Green green copy; Aurora writer, cluster volume, replicas + reader endpoint, Serverless v2), KEY-VALUE · IN-MEMORY (DAX → table → Streams/GSI; ElastiCache, MemoryDB), ANALYTICS (EMR/Glue → Redshift → Spectrum/S3, BI tools; zero-ETL from Aurora), PURPOSE-BUILT (Keyspaces, Neptune, DocumentDB, Timestream for InfluxDB, OpenSearch, QLDB shut down). After the first screenshot: the RDS Proxy/RDS stations moved right off the box label, and the purpose-built line moved to the outer margin (it crossed the KEY-VALUE label).

## Widgets
`widgets.js`: `connStorm` (Lambda concurrency 50/200/1,000 × max_connections ~60/~630 × query share × direct/RDS Proxy; bar chart with the max_connections line), `ddbCapacity` (item size, reads/writes, consistency → RCU/WCU with the math shown; monthly on-demand vs provisioned over average utilisation with break-even ring; partitions needed), `cachePattern` (deterministic 2,000-operation simulation; lazy loading / write-through ± TTL; hit rate, stale reads, wasted cache writes, keys held). Generic: two choosers are not needed — one `chooser` (database decision tree), three `sorter`s, three `stepper`s. No chart uses a hue.

## Traps (16), compare pairs (8), cards (40), drills (30)
Pairs: RDS · Aurora · relational · DynamoDB · RDS Proxy · read replica · bigger instance · GSI · LSI · on-demand · provisioned · DAX · ElastiCache · MemoryDB · lazy loading · write-through · Redshift · Athena · Aurora.
Drills: two select-TWO (B24, B28); correct letters as authored **A 7 · B 7 · C 7 · D 7 · AD 1 · AC 1** (options are shuffled anyway); every option within ±20% of the others in its drill; answer is the longest option in 8 of 28 single-answer drills. `node tools/check/options.js 08-databases` → 0 flagged (63 questions incl. checkpoints); `node tools/check/drills-lint.js 08-databases` → ok. Prestige option wrong in B3, B4, B9, B13.

## Checks
`tools/check/widgets-08-databases.js` interacts with every widget (chooser ×2 paths, three sorters, three steppers, connection storm incl. proxy and instance changes and a tooltip, capacity calculator incl. utilisation, transactional reads and a tooltip, cache simulator incl. pattern, workload and metric changes and a tooltip, eight pair quick checks, map, trigger table, progress charts). Screenshots: `node shots-08.js` → `design/compare/s8-*.png`. Engine/CSS: **no change**.
