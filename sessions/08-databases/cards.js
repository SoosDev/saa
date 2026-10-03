/* Session 8 trigger cards (databases & caching). f = what the exam says, b = the answer. line = transit line id or topic.
   Cards marked mine come from his baseline misses (Q15, Q57) and his prestige-distractor pattern (src 'Exam pattern'). */
(function () {
  'use strict';
  const S = window.SESSION = window.SESSION || {};
  const _c = (id, line, f, b, why, tempt, extra) => Object.assign({ id, line, f, b, why, tempt }, extra || {});
  const MINE = { mine: true, src: 'Exam pattern' };
  S.cards = [
    /* choosing */
    _c('c01', 'choose', 'Relational data, joins, transactions, existing SQL app', 'RDS (any of six engines) or Aurora (MySQL / PostgreSQL)', 'Pick by engine first: Oracle, SQL Server, Db2 → RDS.', 'DynamoDB because it “scales better”.'),
    _c('c02', 'choose', 'Key-value lookups, single-digit ms at any scale, serverless', 'DynamoDB', 'Partition key spreads the load; on-demand absorbs spikes.', 'Aurora Serverless v2 (still one writer).'),
    _c('c03', 'choose', 'Data warehouse, BI dashboards, complex SQL over TB–PB', 'Amazon Redshift', 'Columnar, massively parallel OLAP.', 'RDS or Aurora read replicas.'),
    _c('c04', 'choose', 'MongoDB-compatible, JSON documents, keep the drivers', 'Amazon DocumentDB', 'Instance-based or elastic clusters; Serverless since Jul 2025.', 'DynamoDB (needs a rewrite).'),
    _c('c05', 'choose', 'Relationships, friends of friends, fraud rings, knowledge graph', 'Amazon Neptune', 'Gremlin, openCypher, SPARQL; Neptune Analytics for graph analytics.', 'Relational database with recursive joins.'),
    _c('c06', 'choose', 'Apache Cassandra workload, CQL, serverless', 'Amazon Keyspaces', 'Cassandra-compatible; multi-Region replication active-active.', 'DynamoDB (rewrite off CQL).'),
    _c('c07', 'choose', 'Time-series measurements (IoT, metrics), new customer', 'Amazon Timestream for InfluxDB', 'Managed InfluxDB; time-window queries in ms.', 'Timestream for LiveAnalytics — closed to new customers.', { update: 'Timestream for LiveAnalytics closed to new customers on 20 Jun 2025.' }),
    _c('c08', 'choose', 'Full-text search, log analytics, vector search', 'Amazon OpenSearch Service (or OpenSearch Serverless)', 'Serverless collections: search, time series, vector search.', 'A LIKE query on RDS.'),
    _c('c09', 'choose', 'Immutable, verifiable history (ledger) in a new design', 'Not QLDB — shut down 31 Jul 2025; e.g. Aurora PostgreSQL with audit tables', 'Banks may still answer QLDB; it no longer exists.', 'Amazon QLDB.', { update: 'QLDB reached full shutdown on 31 Jul 2025.' }),
    /* RDS */
    _c('c10', 'rds', 'RDS engines', 'MySQL, MariaDB, PostgreSQL, Oracle, SQL Server, Db2', 'Aurora is a separate, MySQL/PostgreSQL-compatible engine.', 'Assuming Aurora runs Oracle.'),
    _c('c11', 'rds', 'RDS needs OS access for a vendor agent (SQL Server)', 'RDS Custom for SQL Server', 'Privileged host access with RDS automation.', 'Plain RDS (no OS access).', { update: 'RDS Custom for Oracle is in sunset — end of support 31 Mar 2027.' }),
    _c('c12', 'rds', 'Major version upgrade, test on prod data, ~1 min cutover, same endpoint', 'RDS Blue/Green Deployments (MySQL, MariaDB, PostgreSQL)', 'Green stays in sync; switchover typically under a minute.', 'Promote an upgraded read replica (new endpoint).'),
    _c('c13', 'rds', 'Keep running an old major version past end of standard support', 'RDS Extended Support (paid, up to 3 years)', 'Automatic enrolment; then an automatic upgrade.', 'Assuming old versions run free forever.'),
    _c('c14', 'rds', 'Offload read-heavy reporting from RDS', 'Read replica (asynchronous) — point reports at its endpoint', 'Up to 15 for MySQL, MariaDB, PostgreSQL.', 'Multi-AZ standby (serves no reads).'),
    _c('c15', 'rds', 'RDS for MySQL queries with big sorts and temp tables, up to 2x faster', 'RDS Optimized Reads (instance classes with local NVMe, e.g. db.m6gd)', 'Temporary objects go to the instance store.', 'Provisioned IOPS alone.'),
    /* Proxy */
    _c('c16', 'proxy', 'Lambda → RDS fails with “too many connections”', 'RDS Proxy (connection pooling)', 'Invocations share pooled connections; excess requests queue.', 'Raise Lambda concurrency (your Q15 pick).', { mine: true, src: 'Exam Q15' }),
    _c('c17', 'proxy', 'Cut application disruption during Aurora/RDS failover', 'RDS Proxy (failover up to 66% faster)', 'Clients stay connected to the proxy; no stale DNS.', 'Aurora Global Database.'),
    _c('c18', 'proxy', 'No DB password in Lambda code, rotating credentials, IAM auth', 'RDS Proxy + Secrets Manager + IAM authentication to the proxy', 'The proxy holds the secret; clients present IAM tokens.', 'Password in an encrypted environment variable.'),
    /* Aurora */
    _c('c19', 'aurora', 'Scale reads in the same Region on Aurora', 'Aurora Replicas (up to 15) + reader endpoint', 'Same cluster volume, ms lag, connection balancing.', 'Aurora Global Database (cross-Region).', MINE),
    _c('c20', 'aurora', 'Route analytics to two big replicas only', 'Aurora custom endpoint', 'A load-balanced endpoint over a chosen subset.', 'Failover priority tiers.'),
    _c('c21', 'aurora', 'Intermittent / unpredictable database load, pay nothing while idle', 'Aurora Serverless v2 with minimum 0 ACU (auto-pause)', '0–256 ACU; ~2 GiB of memory per ACU.', 'Serverless v2 at 0.5 ACU minimum (still billing).', { update: 'Scaling to 0 ACU since Nov 2024; Serverless v1 is deprecated.' }),
    _c('c22', 'aurora', 'I/O is 25% or more of the Aurora bill', 'Aurora I/O-Optimized', 'No per-I/O charges; switch to it once every 30 days.', 'Reserved Instances (do not cover I/O).'),
    _c('c23', 'aurora', 'Scale PostgreSQL writes beyond one writer, one database', 'Aurora PostgreSQL Limitless Database', 'Routers + shards in a DB shard group (GA Oct 2024).', 'More Aurora Replicas (read-only).'),
    _c('c24', 'aurora', 'Maximum Aurora cluster volume', '256 TiB on current engine versions', 'Grows automatically; you pay for what you use.', '64 TiB (that is RDS) or the old 128 TiB.', { update: 'Raised from 128 TiB to 256 TiB in Jul 2025.' }),
    /* DynamoDB */
    _c('c25', 'ddb', 'RCU and WCU definitions', 'RCU = 1 strongly consistent read/s up to 4 KB (eventual = ½, transactional = 2) · WCU = 1 write/s up to 1 KB (transactional = 2)', 'Round item size UP to 4 KB (reads) or 1 KB (writes).', 'Rounding down or halving strong reads.'),
    _c('c26', 'ddb', 'Throttling although table capacity is far above traffic', 'Hot partition → high-cardinality partition key or write sharding', 'One partition: max 3,000 RCU / 1,000 WCU.', 'Add more provisioned capacity.'),
    _c('c27', 'ddb', 'Query an existing table by a new attribute', 'Global secondary index (GSI)', 'Any keys, added any time, eventually consistent.', 'LSI (only at creation, same partition key).'),
    _c('c28', 'ddb', 'Another sort order on the same partition key, strongly consistent', 'Local secondary index (LSI), defined at table creation', 'Up to 5; 10 GB per partition key value.', 'GSI (eventually consistent only).'),
    _c('c29', 'ddb', 'Unpredictable, spiky or new workload — which capacity mode?', 'On-demand (the default and recommended mode)', 'Pay per request; price halved Nov 2024.', 'Provisioned for the average.', { update: 'On-demand price cut 50% on 1 Nov 2024 and is now the default mode.' }),
    _c('c30', 'ddb', 'Steady, predictable DynamoDB traffic, cheapest', 'Provisioned + auto scaling (+ reserved capacity)', 'Break-even near 29% average utilisation at list prices.', 'Stay on on-demand by habit.'),
    _c('c31', 'ddb', 'Microsecond reads on DynamoDB, minimal code change', 'DynamoDB Accelerator (DAX)', 'API-compatible; eventually consistent reads; write-through.', 'ElastiCache (needs cache code).'),
    _c('c32', 'ddb', 'Delete expired items automatically at no write cost', 'DynamoDB TTL (epoch-seconds attribute)', 'Deleted typically within a few days of expiry.', 'Scheduled scan-and-delete Lambda.'),
    _c('c33', 'ddb', 'React to every item change with Lambda', 'DynamoDB Streams (24 h retention) + Lambda trigger', 'Exactly once, in order per item.', 'Poll the table with scans.'),
    _c('c34', 'ddb', 'Storage-heavy, rarely read table, cut cost', 'DynamoDB Standard-IA table class', 'Cheaper storage, dearer requests; switch twice per 30 days.', 'On-demand mode (a throughput setting).'),
    /* caching */
    _c('c35', 'cache', 'Cache stale after updates (lazy loading)', 'Add a TTL (or write-through for must-be-current data)', 'Lazy loading never touches the cache on writes.', 'More cache nodes.'),
    _c('c36', 'cache', 'Sessions must survive instance loss, sub-ms, shared', 'ElastiCache (Valkey / Redis OSS) session store', 'DynamoDB if single-digit ms is enough.', 'Sticky sessions.'),
    _c('c37', 'cache', 'Durable, Redis-compatible in-memory primary database', 'Amazon MemoryDB', 'Multi-AZ transaction log; µs reads, ms writes.', 'ElastiCache as the only copy.', { update: 'ElastiCache for Valkey 9.0+ also offers an optional durability setting (Jun 2026).' }),
    _c('c38', 'cache', 'Cheapest ElastiCache engine today', 'Valkey (node-based 20% lower; Serverless 33% lower, 100 MB minimum)', 'Redis OSS-compatible; MemoryDB for Valkey 30% lower.', 'Redis OSS by habit.', { update: 'Valkey support since Oct 2024; Redis OSS v4/v5 now in paid Extended Support.' }),
    /* Redshift */
    _c('c39', 'redshift', 'Big data processing + SQL / BI queries', 'EMR (process) + Redshift (warehouse)', 'Keyword question: big data → EMR; SQL + BI → Redshift.', 'RDS or Aurora for BI.', { mine: true, src: 'Exam Q57' }),
    _c('c40', 'redshift', 'Near-real-time analytics on Aurora/RDS/DynamoDB data, least ops', 'Zero-ETL integration into Redshift', 'No pipeline; Spectrum for data that stays in S3.', 'A Glue job on a schedule.')
  ];
})();
