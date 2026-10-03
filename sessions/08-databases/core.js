/* Session 8 — Databases & caching: meta, lines, the database map, stub, method, cheat sheet, compare, traps, log.
   Colour rule: a service keeps its colour on every page. Session 8 adds no hue: every family is an ink line (4 px)
   told apart by dash pattern and station shape, and every line is labelled. RDS, Aurora and DynamoDB keep the ids,
   dashes and station shapes they have on Session 7's map (rds 2 7 triangles · aurora 10 6 hexagons · ddb 1 9 diamonds).
   Facts: docs/session-08-databases.md, "Facts verified". */
(function () {
  'use strict';
  const S = (window.SESSION = window.SESSION || {});
  const INK = 'fill:var(--surface);stroke:var(--ink);stroke-width:3';
  const FONT = 'Atkinson Hyperlegible, sans-serif';
  const HALO = ';paint-order:stroke;stroke:var(--surface);stroke-width:5px;stroke-linejoin:round';
  const sub = (x, y, text, lines, anchor) => ({ el: 'text', lines, a: { x, y, 'font-size': 11.5, 'font-family': FONT, 'text-anchor': anchor || null }, style: 'fill:var(--ink2)' + HALO, text });
  const T = (x, y, text, lines, anchor) => ({ el: 'text', pick: lines, a: { x, y, 'font-size': 13, 'font-weight': 700, 'font-family': FONT, 'text-anchor': anchor || null }, style: 'fill:var(--ink)' + HALO, text });
  const shape = (d, lines) => Object.assign({ pick: lines, style: INK }, d);
  const circle = (cx, cy, lines) => shape({ el: 'circle', a: { cx, cy, r: 9 } }, lines);
  const big = (cx, cy, lines) => shape({ el: 'circle', a: { cx, cy, r: 11 } }, lines);
  const ring = (cx, cy, lines) => [shape({ el: 'circle', a: { cx, cy, r: 10 } }, lines), { el: 'circle', pick: lines, a: { cx, cy, r: 3.5 }, style: 'fill:var(--ink)' }];
  const square = (cx, cy, lines) => shape({ el: 'rect', a: { x: cx - 9, y: cy - 9, width: 18, height: 18 } }, lines);
  const diamond = (cx, cy, lines) => shape({ el: 'path', a: { d: `M${cx} ${cy - 11} L${cx + 11} ${cy} L${cx} ${cy + 11} L${cx - 11} ${cy} Z` } }, lines);
  const triangle = (cx, cy, lines) => shape({ el: 'path', a: { d: `M${cx} ${cy - 11} L${cx + 11} ${cy + 8} L${cx - 11} ${cy + 8} Z` } }, lines);
  const hexa = (cx, cy, lines) => shape({ el: 'path', a: { d: `M${cx - 5} ${cy - 10} H${cx + 5} L${cx + 11} ${cy} L${cx + 5} ${cy + 10} H${cx - 5} L${cx - 11} ${cy} Z` } }, lines);
  const penta = (cx, cy, lines) => shape({ el: 'path', a: { d: `M${cx} ${cy - 11} L${cx + 11} ${cy - 2} L${cx + 7} ${cy + 10} L${cx - 7} ${cy + 10} L${cx - 11} ${cy - 2} Z` } }, lines);
  const LABELS = [];
  const box = (x, y, w, hgt, label, right) => {
    LABELS.push({ el: 'text', a: { x: right ? x + w - 10 : x + 10, y: y + 18, 'font-size': 11, 'font-weight': 800, 'letter-spacing': 1, 'text-anchor': right ? 'end' : null }, style: 'fill:var(--ink2)' + HALO, text: label });
    return [{ el: 'rect', a: { x, y, width: w, height: hgt, rx: 8 }, style: 'fill:var(--surface);stroke:var(--chip-border);stroke-width:1.5' }];
  };
  const zoneLabel = (x, y, t) => ({ el: 'text', a: { x, y, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5 }, style: 'fill:var(--ink2)', text: t });

  Object.assign(S, {
    meta: { id: '08-databases', n: 8, title: 'Databases & Caching', brand: 'Databases Transit Map', home: '../../', updated: '2026-10-03' },

    lines: [
      { id: 'rds', name: 'RDS · read replicas · Blue/Green', short: 'RDS', cls: 'ink', width: 4, dash: '2 7', alias: ['RDS', 'Amazon RDS', 'RDS for MySQL', 'RDS for PostgreSQL', 'MariaDB', 'Oracle', 'SQL Server', 'Db2', 'read replica', 'RDS Custom', 'Blue/Green Deployments', 'Optimized Reads', 'Optimized Writes', 'Extended Support', 'IAM database authentication'],
        verb: 'runs a managed relational engine',
        from: 'application → DB instance endpoint (Single-AZ, Multi-AZ instance or Multi-AZ cluster) → read replicas for reads · Blue/Green staging copy for changes',
        built: 'A **managed relational database** on the engine you already use: **MySQL, MariaDB, PostgreSQL, Oracle, SQL Server or Db2**. AWS patches, backs up and fails over; you pick the instance class and storage (gp3 or io2 Block Express, up to **64 TiB**; Oracle and SQL Server up to **256 TiB** with additional storage volumes). **Read replicas** (asynchronous) scale reads. **Blue/Green Deployments** (MySQL, MariaDB, PostgreSQL) stage an upgrade on a synchronised copy and switch over, typically in under a minute. **RDS Custom** (Oracle, SQL Server) gives OS and database access. Multi-AZ and backups are Session 7.',
        says: ['commercial engine (Oracle, SQL Server, Db2)', 'lift and shift the existing MySQL database', 'managed relational database', 'offload read-heavy reporting', 'upgrade the major version with minimal downtime', 'needs access to the operating system', 'joins and transactions'],
        switch: [{ to: 'aurora', when: 'MySQL or PostgreSQL that needs more throughput, faster failover, up to 15 low-lag replicas, serverless capacity or storage that grows by itself' }, { to: 'proxy', when: 'many short-lived connections (Lambda) exhaust max_connections' }, { to: 'ddb', when: 'the access pattern is key-value at any scale with no joins' }],
        traps: ['Read replicas to make writes faster (they only take reads).', 'Changing an unencrypted instance to encrypted in place (snapshot → encrypted copy → restore).', 'Blue/Green Deployments for Oracle or SQL Server (MySQL, MariaDB, PostgreSQL only).', 'RDS for an analytics warehouse over terabytes (Redshift).'],
        update: 'Storage up to **64 TiB** (Db2, MariaDB, MySQL, PostgreSQL) and **256 TiB** for Oracle and SQL Server with up to three **additional storage volumes**; magnetic storage is gone. **RDS for Db2** is an engine now. **Extended Support** keeps an old major version running for up to 3 years past standard support — **paid** and automatic. **RDS Custom for Oracle** is in sunset (end of support 31 Mar 2027; AWS points to Oracle on EC2).' },
      { id: 'proxy', name: 'RDS Proxy', short: 'Proxy', cls: 'ink', width: 4, dash: '6 4', alias: ['RDS Proxy', 'connection pooling', 'connection pool', 'too many connections', 'pinning', 'max_connections'],
        verb: 'pools and shares connections',
        from: 'Lambda / app (thousands of short connections) → RDS Proxy (pool, IAM auth, Secrets Manager) → a few long-lived connections to RDS or Aurora',
        built: 'A **fully managed, highly available database proxy** in your VPC. It keeps a **pool** of connections to the database and lends them to clients only while they run a query, so thousands of Lambda invocations share a few hundred connections; extra requests **queue** instead of failing. On failover it keeps client connections open and routes to the new writer — AWS says failover is **up to 66% faster**. Clients can be forced to use **IAM authentication**; the proxy reads database credentials from **Secrets Manager**. Engines: Aurora MySQL/PostgreSQL, RDS for MySQL, PostgreSQL, MariaDB, SQL Server (not Oracle, not Db2).',
        says: ['Lambda functions', 'too many connections', 'connection errors during traffic spikes', 'frequently open and close connections', 'serverless application connects to a relational database', 'reduce failover time', 'enforce IAM authentication to the database'],
        switch: [{ to: 'rds', when: 'the problem is read load, not connections (add read replicas)' }, { to: 'cache', when: 'the same queries repeat and need sub-millisecond answers' }],
        misses: 'Baseline **Q15** (exam, tag A): Lambda overloaded an RDS database with connections; you **raised Lambda concurrency**, which opens even more connections. The built-for answer is **RDS Proxy**: pool and share connections between invocations.',
        traps: ['Raising Lambda concurrency when the database runs out of connections.', 'A bigger DB instance as the fix for connection storms (moves the ceiling, keeps the churn).', 'Attaching the proxy to a read replica (for an RDS instance it targets the writer; Aurora and Multi-AZ DB clusters get read-only proxy endpoints).', 'RDS Proxy for Oracle or Db2 (not supported).'],
        update: 'Engines now include **RDS for SQL Server** and **MariaDB**. The proxy lives in the database’s VPC and is never publicly accessible; extra proxy endpoints can reach it from other VPCs in the same Region.' },
      { id: 'aurora', name: 'Aurora · Serverless · I/O-Optimized', short: 'Aurora', cls: 'ink', width: 4, dash: '10 6', alias: ['Aurora', 'Aurora MySQL', 'Aurora PostgreSQL', 'Aurora Replica', 'reader endpoint', 'custom endpoint', 'Aurora Serverless v2', 'ACU', 'I/O-Optimized', 'Limitless Database', 'Aurora DSQL', 'zero-ETL'],
        verb: 'scales MySQL and PostgreSQL in the cloud',
        from: 'writer + up to 15 Aurora Replicas on one cluster volume (6 copies, 3 AZs) → cluster / reader / custom endpoints · Serverless v2 capacity · zero-ETL to Redshift',
        built: 'AWS’s cloud-built **MySQL- and PostgreSQL-compatible** engine. Compute is separate from a shared **cluster volume** that grows automatically (up to **256 TiB** on current versions). Up to **15 Aurora Replicas** read the same volume with millisecond lag; the **reader endpoint** balances connections across them and **custom endpoints** group a subset. **Aurora Serverless v2** scales each instance in 0.5-ACU steps between your minimum and maximum (0–256 ACU; **0 = auto-pause**). **I/O-Optimized** removes per-I/O charges when I/O is 25% or more of the bill. **Limitless Database** (PostgreSQL) shards writes; **Aurora DSQL** is serverless, distributed and active-active across Regions.',
        says: ['MySQL- or PostgreSQL-compatible', 'up to 15 read replicas with minimal lag', 'unpredictable, intermittent workload', 'scale to zero when idle', 'I/O costs are a large share of the bill', 'route reporting queries to specific replicas', 'storage grows automatically'],
        switch: [{ to: 'rds', when: 'the engine must be Oracle, SQL Server or Db2, or the simplest, cheapest managed MySQL is enough' }, { to: 'redshift', when: 'the queries are analytics over terabytes (zero-ETL from Aurora)' }, { to: 'ddb', when: 'key-value access at any scale with single-digit-ms latency and no SQL' }],
        traps: ['Aurora for an Oracle or SQL Server workload that cannot change engine.', 'Aurora Global Database to scale reads inside one Region (Aurora Replicas do that).', 'I/O-Optimized for a cluster whose I/O is a small share of the cost.', 'Pointing reporting at the cluster (writer) endpoint instead of the reader or a custom endpoint.'],
        update: 'Serverless v2 now scales **to 0 ACUs** with auto-pause (Nov 2024) and up to **256 ACUs**; Serverless v1 is deprecated. Cluster volume **256 TiB** (Jul 2025, was 128). **I/O-Optimized** (May 2023). **Limitless Database** GA Oct 2024. **DSQL** GA May 2025. **Zero-ETL to Redshift** from Aurora MySQL and PostgreSQL.' },
      { id: 'ddb', name: 'DynamoDB · DAX', short: 'DynamoDB', cls: 'ink', width: 4, dash: '1 9', alias: ['DynamoDB', 'partition key', 'sort key', 'GSI', 'LSI', 'global secondary index', 'local secondary index', 'RCU', 'WCU', 'on-demand', 'provisioned', 'DAX', 'DynamoDB Accelerator', 'TTL', 'DynamoDB Streams', 'Standard-IA', 'transactions', 'warm throughput'],
        verb: 'serves key-value at any scale',
        from: 'app → (DAX, microseconds) → table (partition key [+ sort key]) → GSIs / LSIs · Streams → Lambda · TTL · export / zero-ETL',
        built: '**Serverless key-value and document** database with single-digit-millisecond latency at any scale. Items (up to **400 KB**) are spread over partitions by the **partition key**; each partition serves at most **3,000 RCU and 1,000 WCU**, so a key design that spreads load is the main performance lever. **On-demand** (the default, pay per request) or **provisioned** (+ auto scaling, reserved capacity). **GSI** = any keys, added any time, eventually consistent; **LSI** = same partition key, other sort key, created **with the table**. **DAX** caches it in microseconds. **Streams** keep 24 h of changes; **TTL** deletes expired items free; **transactions** are all-or-nothing.',
        says: ['key-value', 'single-digit millisecond latency at any scale', 'serverless', 'millions of requests per second', 'session data / shopping cart / leaderboard', 'unpredictable traffic, pay per request', 'microsecond read latency', 'expire items automatically'],
        switch: [{ to: 'aurora', when: 'the data is relational: joins, ad hoc SQL, complex transactions across tables' }, { to: 'cache', when: 'a cache in front of something other than DynamoDB, or Valkey/Redis data structures' }, { to: 'redshift', when: 'the questions are analytics over the whole table (zero-ETL to Redshift)' }],
        traps: ['A low-cardinality partition key (status, date) creating a hot partition.', 'Adding an LSI to an existing table (only at creation; use a GSI).', 'Strongly consistent reads from a GSI or through DAX (not supported / passed through).', 'DAX for a write-heavy workload or for strongly consistent reads.', 'Provisioned capacity for spiky, unpredictable traffic “to save money”.'],
        update: '**On-demand is now the default and recommended mode**; its price fell **50%** (Nov 2024) and global-table replicated writes up to 67%. **Warm throughput** shows and pre-warms what a table can take instantly. **Standard-IA** table class for storage-heavy tables. **Zero-ETL** to Redshift (Oct 2024) and OpenSearch (Nov 2023). PITR 1–35 days (Session 7).' },
      { id: 'cache', name: 'ElastiCache · MemoryDB', short: 'Cache', cls: 'ink', width: 4, alias: ['ElastiCache', 'Valkey', 'Redis OSS', 'Redis', 'Memcached', 'ElastiCache Serverless', 'cluster mode', 'lazy loading', 'write-through', 'TTL', 'session store', 'MemoryDB', 'Global Datastore', 'data tiering'],
        verb: 'answers from memory in microseconds',
        from: 'app → ElastiCache (Valkey / Redis OSS / Memcached; lazy loading or write-through + TTL) → database · MemoryDB = durable in-memory primary database',
        built: 'Managed **in-memory caches**. **Valkey** and **Redis OSS**: data structures, replication, Multi-AZ failover, backups, **cluster mode** (shards, up to 500 nodes), Global Datastore (2 secondary Regions), pub/sub, sorted sets for leaderboards. **Memcached**: simple, multithreaded, no replication or persistence. **ElastiCache Serverless** scales on its own. You choose the **caching strategy**: lazy loading (fill on miss), write-through (write on update), plus a **TTL**. **MemoryDB** is a **durable** in-memory **database** (Multi-AZ transaction log) — the data can live only there.',
        says: ['sub-millisecond latency for repeated queries', 'reduce load on the database', 'store user session state', 'real-time leaderboard', 'cache the results of expensive queries', 'durable in-memory database', 'Redis-compatible'],
        switch: [{ to: 'ddb', when: 'the cache sits in front of DynamoDB and the app should not change much (DAX)' }, { to: 'rds', when: 'the read load is broad, not repeated — add read replicas' }],
        traps: ['ElastiCache as the only copy of data that must survive (MemoryDB, or a database).', 'Memcached when replication, failover or persistence is required.', 'Lazy loading without a TTL: stale data forever.', 'DAX in front of RDS or Aurora (DynamoDB only).'],
        update: '**Valkey** (Oct 2024): node-based 20% cheaper than other engines, Serverless 33% cheaper than Redis OSS with a **100 MB** minimum; MemoryDB for Valkey 30% cheaper. **ElastiCache Serverless** GA Nov 2023. **Durability** option for ElastiCache for Valkey 9.0 (Jun 2026). Redis OSS v4/v5 left standard support 31 Jan 2026 (paid Extended Support). **MemoryDB Multi-Region** (Dec 2024).' },
      { id: 'redshift', name: 'Redshift · zero-ETL', short: 'Redshift', cls: 'ink', width: 4, dash: '24 8', alias: ['Redshift', 'Redshift Serverless', 'RA3', 'RPU', 'Redshift Spectrum', 'concurrency scaling', 'data sharing', 'zero-ETL', 'data warehouse', 'OLAP', 'BI'],
        verb: 'answers SQL analytics over terabytes',
        from: 'Aurora / RDS / DynamoDB → zero-ETL → Redshift (columnar, MPP) ← EMR / Glue loads · Spectrum reads S3 in place → BI tools',
        built: 'The **data warehouse**: columnar, massively parallel SQL for **analytics (OLAP)** over terabytes to petabytes, behind BI dashboards. **Redshift Serverless** (no clusters; capacity in RPUs, base 4–512, up to 1,024 in some Regions) or provisioned **RA3** nodes with **managed storage** (compute and storage scale apart). **Spectrum** queries data in S3 without loading it. **Concurrency scaling** adds capacity for bursts of queries. **Data sharing** gives other warehouses live read access. **Zero-ETL integrations** replicate Aurora, RDS and DynamoDB data into Redshift with no pipeline.',
        says: ['data warehouse', 'business intelligence (BI) dashboards', 'complex SQL queries on petabytes', 'historical analysis', 'columnar storage', 'big data + SQL', 'analytics without impacting the production database'],
        switch: [{ to: 'aurora', when: 'the workload is transactions (OLTP): many small reads and writes' }, { to: 'purpose', when: 'the need is full-text search or log analytics (OpenSearch)' }],
        misses: 'Baseline **Q57** (exam, tag K): “**big data** processing + **SQL / BI** queries” → **EMR** (process) + **Redshift** (warehouse for SQL and BI). You missed the keyword. Big data + BI = warehouse, not RDS.',
        traps: ['RDS or Aurora as the warehouse for petabyte BI queries.', 'Loading S3 data into Redshift just to query it occasionally (Spectrum, or Athena).', 'Building an ETL pipeline from Aurora to Redshift when zero-ETL exists (least operational overhead).', 'DC2 nodes for a new warehouse (deprecated; RA3 / RG / Serverless).'],
        update: '**Serverless** (Jul 2022) base capacity now starts at **4 RPU**. **DS2** is gone and **DC2** is deprecated (Apr 2025) — RA3, the new Graviton **RG** nodes or Serverless. **Zero-ETL** sources: Aurora MySQL (Nov 2023), Aurora PostgreSQL and DynamoDB (Oct 2024), RDS for MySQL (Sep 2024), RDS for PostgreSQL and Oracle (Jul 2025). **Multi-AZ** for RA3 (Nov 2023).' },
      { id: 'purpose', name: 'Purpose-built databases', short: 'Purpose-built', cls: 'ink', width: 4, dash: '12 8', alias: ['DocumentDB', 'MongoDB', 'Neptune', 'graph', 'Gremlin', 'openCypher', 'SPARQL', 'Keyspaces', 'Cassandra', 'CQL', 'Timestream', 'InfluxDB', 'time series', 'OpenSearch', 'full-text search', 'QLDB', 'ledger'],
        verb: 'fits one data model exactly',
        from: 'document → DocumentDB · graph → Neptune · wide-column (Cassandra) → Keyspaces · time series → Timestream for InfluxDB · search / logs → OpenSearch · ledger → QLDB (shut down)',
        built: 'One engine per **data model**, each managed and scalable. **DocumentDB**: JSON documents, **MongoDB-compatible** (instance-based or elastic clusters; Serverless). **Neptune**: **graph** — relationships, fraud rings, recommendations, knowledge graphs (Gremlin, openCypher, SPARQL); Neptune Analytics for graph analytics. **Keyspaces**: **Apache Cassandra-compatible**, serverless, CQL. **Timestream**: **time series** (now Timestream for InfluxDB). **OpenSearch**: **full-text search** and log analytics (Serverless collections: search, time series, vector). **QLDB** (ledger) is shut down.',
        says: ['MongoDB-compatible', 'JSON documents', 'social network / friends of friends', 'fraud detection through relationships', 'Apache Cassandra workloads', 'CQL', 'IoT sensor readings over time', 'full-text search', 'search and analyse logs'],
        switch: [{ to: 'ddb', when: 'simple key-value or document access at any scale and no MongoDB API is required' }, { to: 'aurora', when: 'an immutable history is needed now that QLDB is gone (Aurora PostgreSQL with audit tables)' }],
        traps: ['DynamoDB for a MongoDB application that must keep its drivers (DocumentDB).', 'A relational database with recursive joins for a graph (Neptune).', 'QLDB as a new design (fully shut down 31 Jul 2025).', 'Timestream for LiveAnalytics for a new customer (closed; Timestream for InfluxDB).'],
        update: '**QLDB**: full shutdown 31 Jul 2025. **Timestream for LiveAnalytics** closed to new customers (20 Jun 2025) → **Timestream for InfluxDB** (GA Mar 2024). **DocumentDB Serverless** (Jul 2025), elastic clusters (Nov 2022). **Neptune Analytics** (Nov 2023). DynamoDB → OpenSearch **zero-ETL** (Nov 2023).' }
    ],
    topics: { choose: 'Choosing a database', sec: 'Database security' },

    map: {
      title: 'The database map', lead: 'Users and the app tier at the top; below them the four families: relational (OLTP), key-value and in-memory, analytics, and the purpose-built engines. Tap a line or a station.',
      viewBox: '0 0 1000 880', defaultLine: 'proxy',
      caption: 'Session 8 adds no colour: every family is an ink line told apart by dash and station shape — RDS Proxy dashes with squares, RDS short dashes with triangles, Aurora dashes with hexagons, DynamoDB dots with diamonds, ElastiCache solid with circles, Redshift long dashes with pentagons, purpose-built engines long dashes with rings. RDS, Aurora and DynamoDB keep their Session 7 dashes and shapes. Every line is labelled; colour is never the only cue.',
      items: [
        { el: 'rect', a: { x: 0, y: 0, width: 1000, height: 96 }, style: 'fill:var(--muted-fill)' },
        { el: 'rect', a: { x: 0, y: 104, width: 1000, height: 776 }, style: 'fill:var(--zone-aws)' },
        zoneLabel(18, 22, 'OUTSIDE AWS'),
        zoneLabel(18, 124, 'AWS · APP TIER'),
        ...box(20, 226, 470, 330, 'RELATIONAL · OLTP'),
        ...box(510, 226, 470, 330, 'KEY-VALUE · IN-MEMORY', true),
        ...box(20, 574, 470, 290, 'ANALYTICS'),
        ...box(510, 574, 470, 290, 'PURPOSE-BUILT', true),
        { el: 'path', a: { d: 'M130 62 V148' }, style: 'stroke:var(--ink2);stroke-width:2;fill:none' },

        /* ---- lines ---- */
        { el: 'line', line: 'purpose', paths: ['M990 172 V660 H600 V790 H900'], labels: [{ x: 680, y: 650, t: 'PURPOSE-BUILT', size: 10.5, anchor: 'middle' }] },
        { el: 'line', line: 'redshift', paths: ['M420 330 H470 V690 H100', 'M250 690 V790 H400'], labels: [{ x: 300, y: 682, t: 'ZERO-ETL · WAREHOUSE', size: 10.5 }] },
        { el: 'line', line: 'cache', paths: ['M830 172 V480'], labels: [{ x: 842, y: 214, t: 'ELASTICACHE', size: 10.5 }] },
        { el: 'line', line: 'ddb', paths: ['M610 172 V430 H760'], labels: [{ x: 622, y: 214, t: 'DYNAMODB', size: 10.5 }] },
        { el: 'line', line: 'aurora', paths: ['M420 172 V500'], labels: [{ x: 432, y: 214, t: 'AURORA', size: 10.5 }] },
        { el: 'line', line: 'rds', paths: ['M190 410 H310', 'M190 410 V500'], labels: [{ x: 208, y: 402, t: 'READ REPLICA', size: 10.5 }] },
        { el: 'line', line: 'proxy', paths: ['M190 172 V410'], labels: [{ x: 202, y: 214, t: 'RDS PROXY', size: 10.5 }] },

        /* ---- stations ---- */
        big(130, 50, ['proxy', 'aurora', 'ddb', 'cache']), T(150, 54, 'Users', ['proxy', 'aurora', 'ddb', 'cache']), sub(150, 70, 'web, mobile, APIs', ['proxy', 'aurora', 'ddb', 'cache']),
        { el: 'rect', pick: ['proxy', 'aurora', 'ddb', 'cache', 'purpose'], a: { x: 100, y: 150, width: 890, height: 22, rx: 11 }, style: INK },
        T(300, 145, 'App tier', ['proxy', 'aurora', 'ddb', 'cache', 'purpose']), sub(368, 145, 'Lambda · EC2 · containers', ['proxy', 'aurora', 'ddb', 'cache', 'purpose']),
        /* relational */
        square(190, 290, ['proxy']), T(206, 287, 'RDS Proxy', ['proxy']), sub(206, 303, 'pool · IAM auth · Secrets Manager', ['proxy']),
        triangle(190, 410, ['rds', 'proxy']), sub(178, 436, 'RDS primary', ['rds', 'proxy'], 'middle'),
        triangle(310, 410, ['rds']), sub(310, 436, 'read replicas', ['rds'], 'middle'),
        triangle(190, 500, ['rds']), sub(206, 504, 'Blue/Green: green copy', ['rds']),
        hexa(420, 290, ['aurora']), sub(408, 278, 'writer', ['aurora'], 'end'),
        hexa(420, 330, ['aurora', 'redshift']), sub(408, 334, 'cluster volume', ['aurora'], 'end'),
        hexa(420, 410, ['aurora']), sub(408, 400, 'replicas ·', ['aurora'], 'end'), sub(408, 415, 'reader endpoint', ['aurora'], 'end'),
        hexa(420, 500, ['aurora']), sub(408, 504, 'Serverless v2', ['aurora'], 'end'),
        /* key-value / in-memory */
        diamond(610, 290, ['ddb']), sub(626, 287, 'DAX', ['ddb']), sub(626, 302, 'µs, eventually consistent', ['ddb']),
        diamond(610, 430, ['ddb']), sub(600, 456, 'table · partitions', ['ddb'], 'middle'),
        diamond(760, 430, ['ddb']), sub(760, 456, 'Streams · GSI', ['ddb'], 'middle'),
        circle(830, 300, ['cache']), sub(818, 330, 'ElastiCache', ['cache'], 'end'), sub(818, 345, 'Valkey · Redis OSS', ['cache'], 'end'), sub(818, 360, 'Memcached', ['cache'], 'end'),
        circle(830, 480, ['cache']), sub(846, 484, 'MemoryDB', ['cache']), sub(846, 499, 'durable', ['cache']),
        /* analytics */
        penta(100, 690, ['redshift']), sub(100, 716, 'EMR · Glue', ['redshift'], 'middle'), sub(100, 731, 'process big data', ['redshift'], 'middle'),
        penta(250, 690, ['redshift']), T(262, 722, 'Redshift', ['redshift']), sub(262, 738, 'Serverless · RA3', ['redshift']),
        penta(250, 790, ['redshift']), sub(250, 816, 'Spectrum → S3', ['redshift'], 'middle'),
        penta(400, 790, ['redshift']), sub(400, 816, 'BI tools', ['redshift'], 'middle'),
        /* purpose-built */
        ...ring(900, 660, ['purpose']), sub(900, 686, 'DocumentDB', ['purpose'], 'middle'),
        ...ring(760, 660, ['purpose']), sub(760, 686, 'Neptune', ['purpose'], 'middle'),
        ...ring(600, 660, ['purpose']), sub(600, 686, 'Keyspaces', ['purpose'], 'middle'),
        ...ring(600, 790, ['purpose']), sub(600, 816, 'Timestream', ['purpose'], 'middle'), sub(600, 831, 'for InfluxDB', ['purpose'], 'middle'),
        ...ring(750, 790, ['purpose']), sub(750, 816, 'OpenSearch', ['purpose'], 'middle'),
        ...ring(900, 790, ['purpose']), sub(900, 816, 'QLDB', ['purpose'], 'middle'), sub(900, 831, 'shut down', ['purpose'], 'middle'),
        ...LABELS
      ]
    },

    stub: [
      { id: 'model', label: 'DATA MODEL', short: 'MODEL', values: ['relational', 'key-value', 'document', 'graph', 'time series', 'analytics'] },
      { id: 'load', label: 'LOAD', short: 'LOAD', values: ['read-heavy', 'write-heavy', 'spiky', 'steady', 'many connections'] },
      { id: 'lat', label: 'LATENCY', short: 'LAT', values: ['microseconds', 'milliseconds', 'seconds'] },
      { id: 'sup', label: 'SUPERLATIVE', short: 'SUP', values: ['cheapest', 'least ops', 'fastest', 'none stated'] }
    ],

    method:
`1. Strip the story. Keep the DATA (rows with joins? items by key? documents,
   relationships, measurements over time, warehouse facts?) and HOW it is used
   (who reads, who writes, how often, how fast, how many connections).
2. Fill the stub, the same 4 slots for this session:
   DATA MODEL (relational / key-value / document / graph / time series / analytics) ____
   LOAD (read-heavy / write-heavy / spiky / steady / many connections) ____
   LATENCY (microseconds / milliseconds / seconds) ____
   SUPERLATIVE (cheapest / least ops / fastest / none) ____
3. For EACH option ask: "what problem was this service BUILT for?"
   No match with the stub -> cross it out, however powerful it sounds
   (Global Database for one-Region reads, Redshift for transactions, DAX for RDS,
   more Lambda concurrency for a connection storm, a cache as the only copy).
4. Among the survivors, the one that satisfies the SUPERLATIVE wins
   (least ops: managed / serverless / zero-ETL; cheapest: the smallest change that works).`,

    cheat:
`DATABASE = DATA MODEL + LOAD + LATENCY + SUP
CHOOSE      relational -> RDS (any engine) / Aurora (MySQL, PG) · key-value -> DynamoDB
            document -> DocumentDB · graph -> Neptune · Cassandra -> Keyspaces
            time series -> Timestream for InfluxDB · search/logs -> OpenSearch
            warehouse / BI -> Redshift · cache -> ElastiCache / DAX · durable in-memory -> MemoryDB
RDS         MySQL MariaDB PG Oracle SQLServer Db2 · 64 TiB (Oracle/SQL 256 with extra volumes)
            read replicas = reads only, async · Blue/Green (MySQL MariaDB PG) switch < 1 min
            encrypt only at creation -> snapshot, encrypted copy, restore · IAM auth: MySQL MariaDB PG
            Custom = OS access (Oracle, SQL Server) · Extended Support = paid, old major versions
PROXY       Lambda + too many connections -> RDS Proxy (pool, queue, IAM auth, Secrets Manager)
            failover up to 66% faster · NOT: more Lambda concurrency, bigger instance
AURORA      15 replicas · reader endpoint balances · custom endpoint = subset · 256 TiB
            Serverless v2 0-256 ACU (0 = pause) · I/O-Optimized when I/O >= 25% of spend
            Limitless = sharded PG writes · DSQL = active-active multi-Region · zero-ETL -> Redshift
DYNAMODB    item 400 KB · RCU = 4 KB strong (eventual 1/2, txn x2) · WCU = 1 KB (txn x2)
            partition max 3,000 RCU / 1,000 WCU -> high-cardinality key, write sharding
            on-demand = default, spiky · provisioned + auto scaling = steady (break-even ~29%)
            GSI any keys, any time, eventual · LSI same PK, at creation, strong ok, 10 GB/PK
            DAX us, eventual reads, DynamoDB only · Streams 24 h · TTL free, within days · Std-IA
CACHE       lazy loading = fill on miss, stale until TTL · write-through = fresh, wasted writes
            Valkey/Redis OSS: replication, failover, cluster mode, sorted sets · Memcached: simple, MT
            sessions -> ElastiCache or DynamoDB · durable -> MemoryDB (or ElastiCache durability)
REDSHIFT    OLAP, columnar · Serverless (RPU) / RA3 · Spectrum = query S3 · concurrency scaling
            big data + SQL/BI -> EMR + Redshift · zero-ETL from Aurora, RDS, DynamoDB
GONE        QLDB shut down 31 Jul 2025 · Timestream LiveAnalytics closed to new customers
NEVER: Redshift for OLTP · RDS for petabyte BI · DAX for RDS · LSI after creation ·
       Global Database for one-Region reads · cache as only copy · more Lambda for connections`,

    compare: [
      { id: 'rds-aurora', short: 'RDS · Aurora', title: 'RDS vs Aurora — which relational engine?',
        sides: [{ name: 'Amazon RDS', line: 'rds', fig: { dir: 'one', left: 'APP', right: 'DB' }, gist: 'Your engine as is — **MySQL, MariaDB, PostgreSQL, Oracle, SQL Server, Db2** — on an instance with EBS storage you size.' }, { name: 'Amazon Aurora', line: 'aurora', fig: { dir: 'one', left: 'APP', right: 'CLUSTER', keep: true }, gist: '**MySQL- or PostgreSQL-compatible**, compute over a shared, self-growing cluster volume; 15 low-lag replicas; Serverless v2.' }],
        rows: [['Engines', 'six, including commercial', 'MySQL, PostgreSQL only'], ['Storage', 'EBS you provision, up to 64 TiB (256 TiB Oracle/SQL Server)', 'cluster volume grows by itself, up to 256 TiB'], ['Read scaling', 'read replicas (async, own storage)', 'up to 15 Aurora Replicas on the same volume, reader endpoint'], ['Capacity', 'instance classes', 'instances or Serverless v2 (0–256 ACU)'], ['Deciding words', 'Oracle, SQL Server, Db2, keep the engine, lowest cost', 'MySQL/PostgreSQL at high throughput, unpredictable load, 15 replicas, fast failover'], ['Tempting wrong', 'when the load is spiky and serverless is asked for', 'when the engine is Oracle or SQL Server']],
        check: { q: '“A SQL Server application must move to a managed database with as few changes as possible.”', opts: ['Amazon RDS', 'Amazon Aurora'], a: 0, why: 'Aurora is MySQL or PostgreSQL only. RDS for SQL Server keeps the engine.' } },
      { id: 'rel-kv', short: 'Relational · DynamoDB', title: 'Relational (RDS / Aurora) vs DynamoDB — SQL or keys?',
        sides: [{ name: 'Relational (RDS / Aurora)', line: 'aurora', fig: { dir: 'one', left: 'APP', right: 'SQL', keep: true }, gist: 'Tables with **joins**, ad hoc **SQL**, multi-table transactions. Scales up, and out for reads.' }, { name: 'DynamoDB', line: 'ddb', fig: { dir: 'one', left: 'APP', right: 'KEYS' }, gist: '**Key-value / document** access by known keys, single-digit ms **at any scale**, serverless, pay per request.' }],
        rows: [['Query by', 'any SQL, joins, aggregates', 'partition key (+ sort key), indexes'], ['Scale', 'one writer (Limitless shards PG)', 'virtually unlimited, partitions add automatically'], ['Operations', 'instances, versions, maintenance windows', 'none: serverless'], ['Deciding words', 'relational, joins, complex queries, existing SQL app', 'key-value, millions of requests per second, serverless, session data'], ['Tempting wrong', 'for a simple key lookup at huge scale', 'for reporting with joins and ad hoc queries']],
        check: { q: '“A gaming backend stores player profiles looked up by player ID, with millions of requests per second at peak and no servers to manage.”', opts: ['Relational (RDS / Aurora)', 'DynamoDB'], a: 1, why: 'Lookup by key at any scale with no servers: DynamoDB’s built-for job.' } },
      { id: 'proxy-scale', short: 'Proxy · replica · bigger', title: 'Connection storm: RDS Proxy vs read replica vs a bigger instance',
        sides: [{ name: 'RDS Proxy', line: 'proxy', fig: { dir: 'one', left: 'LAMBDA', right: 'POOL', keep: true }, gist: '**Pools** connections; thousands of clients share a few hundred; the rest **queue**.' }, { name: 'Read replica', line: 'rds', fig: { dir: 'one', left: 'PRIMARY', right: 'REPLICA' }, gist: 'Takes **read queries** off the primary. Its own connection limit; writes still go to the primary.' }, { name: 'Bigger instance', line: null, fig: { dir: 'one', left: 'SMALL', right: 'LARGE' }, gist: 'More memory = higher max_connections. Moves the ceiling, keeps the churn, costs more.' }],
        rows: [['Fixes', 'connection limits, connection churn, slow failover', 'read CPU load', 'CPU / memory headroom'], ['Lambda burst of 1,000', 'shares a pool', 'each replica can be exhausted too', 'refuses past the new limit'], ['Deciding words', 'Lambda, connection errors, open and close often', 'read-heavy, reporting, offload reads', 'CPU at 100% on a steady load'], ['Tempting wrong', '—', 'for connection errors', 'for a serverless connection storm (your Q15 detour)']],
        check: { q: '“Lambda functions that write orders to RDS for MySQL fail with ‘too many connections’ during sales; CPU stays at 30%.”', opts: ['RDS Proxy', 'Read replica', 'Bigger instance'], a: 0, why: 'Connections, not CPU or reads, are the bottleneck — and the functions write. Pool them with RDS Proxy.' } },
      { id: 'gsi-lsi', short: 'GSI · LSI', title: 'DynamoDB global secondary index vs local secondary index',
        sides: [{ name: 'Global secondary index (GSI)', line: 'ddb', fig: { dir: 'one', left: 'TABLE', right: 'GSI' }, gist: '**Different partition and sort key**, own throughput, add **any time**. Reads are eventually consistent.' }, { name: 'Local secondary index (LSI)', line: 'ddb', fig: { dir: 'one', left: 'TABLE', right: 'LSI', keep: true }, gist: '**Same partition key, different sort key**. Created **with the table**; strongly consistent reads possible; 10 GB per partition key.' }],
        rows: [['Keys', 'any partition key + optional sort key', 'table’s partition key + another sort key'], ['When created', 'any time', 'only at table creation'], ['Consistency', 'eventual only', 'eventual or strong'], ['Limits', '20 per table (default)', '5 per table, 10 GB per partition key value'], ['Deciding words', 'query by another attribute, add an index later', 'same partition, sort differently, strongly consistent'], ['Tempting wrong', 'when strong consistency on the index is required', 'for an existing table']],
        check: { q: '“An existing Orders table (partition key OrderId) must now be queried by CustomerId.”', opts: ['Global secondary index (GSI)', 'Local secondary index (LSI)'], a: 0, why: 'New partition key and an existing table: only a GSI can do both.' } },
      { id: 'od-prov', short: 'On-demand · Provisioned', title: 'DynamoDB on-demand vs provisioned capacity',
        sides: [{ name: 'On-demand', line: 'ddb', fig: { dir: 'one', left: 'TRAFFIC', right: 'BILL' }, gist: 'Pay **per request**; no capacity planning; absorbs spikes. **Default and recommended** for most workloads.' }, { name: 'Provisioned (+ auto scaling)', line: 'ddb', fig: { dir: 'one', left: 'RCU/WCU', right: 'BILL', keep: true }, gist: 'Pay per **RCU/WCU-hour** you provision; auto scaling follows traffic; reserved capacity discounts.' }],
        rows: [['Best for', 'unknown, spiky or idle traffic; new tables', 'steady, predictable traffic'], ['Cost at high, steady utilisation', 'higher', 'lower (break-even near 29% of peak)'], ['Throttling risk', 'low (up to the table quota)', 'when traffic outruns auto scaling'], ['Switching', 'to provisioned any time', 'to on-demand up to 4 times per 24 h'], ['Deciding words', 'unpredictable, spiky, new application, pay per use', 'predictable, steady, cost-optimised at scale, reserved capacity'], ['Tempting wrong', 'for a flat 24/7 load at scale', 'for traffic that jumps 10x without warning']],
        check: { q: '“A new app’s traffic is unknown and spiky; the team wants no capacity planning.”', opts: ['On-demand', 'Provisioned (+ auto scaling)'], a: 0, why: 'Unknown + spiky + no planning = on-demand, now also the default.' } },
      { id: 'cache3', short: 'DAX · ElastiCache · MemoryDB', title: 'DAX vs ElastiCache vs MemoryDB',
        sides: [{ name: 'DAX', line: 'ddb', fig: { dir: 'one', left: 'APP', right: 'TABLE', cache: true, cacheLabel: 'DAX' }, gist: '**DynamoDB-only**, API-compatible cache: microsecond eventually consistent reads, write-through. Minimal code change.' }, { name: 'ElastiCache', line: 'cache', fig: { dir: 'one', left: 'APP', right: 'ANY DB', cache: true, cacheLabel: 'EC' }, gist: 'A cache for **any** data source; **you** code the strategy (lazy loading, write-through, TTL). Valkey / Redis OSS / Memcached.' }, { name: 'MemoryDB', line: 'cache', fig: { dir: 'one', left: 'APP', right: 'DB', keep: true }, gist: 'A **durable primary database** in memory: Multi-AZ transaction log, microsecond reads, ms writes.' }],
        rows: [['In front of', 'DynamoDB only', 'RDS, Aurora, APIs, anything', 'nothing — it is the database'], ['Code change', 'swap the client', 'cache logic in the app', 'a Valkey/Redis client'], ['Data survives node loss', 'it is a cache', 'it is a cache (durability option on Valkey 9.0+)', 'yes, by design'], ['Deciding words', 'µs reads, DynamoDB, minimal changes', 'cache RDS query results, sessions, rankings', 'durable, Redis-compatible primary store'], ['Tempting wrong', 'in front of RDS', 'as the only copy of data', 'as a throwaway cache (pays for durability)']],
        check: { q: '“Read-heavy DynamoDB tables need microsecond reads without rewriting the data-access code.”', opts: ['DAX', 'ElastiCache', 'MemoryDB'], a: 0, why: 'DynamoDB + microseconds + minimal code change: DAX is API-compatible.' } },
      { id: 'lazy-wt', short: 'Lazy · Write-through', title: 'Lazy loading vs write-through caching',
        sides: [{ name: 'Lazy loading (cache-aside)', line: 'cache', fig: { dir: 'one', left: 'MISS', right: 'FILL' }, gist: 'Read the cache; on a **miss** read the database and fill the cache. Only requested data is cached.' }, { name: 'Write-through', line: 'cache', fig: { dir: 'one', left: 'WRITE', right: 'BOTH', keep: true }, gist: 'Every **write** goes to the database **and** the cache. Cached data is never stale.' }],
        rows: [['Stale data', 'yes, until TTL or eviction', 'no'], ['Wasted cache space', 'little', 'data written but never read'], ['Penalty', 'miss = 3 trips (cache, DB, cache)', 'every write = 2 writes'], ['Node failure', 'refills itself on misses', 'missing data until written again'], ['Fix', 'add a TTL', 'add a TTL; combine with lazy loading'], ['Deciding words', 'read-heavy, tolerate slightly stale, cache only what is used', 'data must always be current in the cache']],
        check: { q: '“Product prices shown from the cache must never be older than the database, and price updates are rare.”', opts: ['Lazy loading (cache-aside)', 'Write-through'], a: 1, why: 'Never stale = write-through; rare updates keep the write penalty small.' } },
      { id: 'olap', short: 'Redshift · Athena · Aurora', title: 'Redshift vs Athena vs Aurora — where do the analytics run?',
        sides: [{ name: 'Redshift', line: 'redshift', fig: { dir: 'one', left: 'SOURCES', right: 'DW', keep: true }, gist: 'A **warehouse**: loaded, columnar, MPP; fast repeated BI queries over TB–PB; Serverless or RA3.' }, { name: 'Athena', line: null, fig: { dir: 'one', left: 'SQL', right: 'S3' }, gist: '**Serverless SQL on S3** in place, pay per query (data scanned). Ad hoc, no loading (Session 9).' }, { name: 'Aurora / RDS', line: 'aurora', fig: { dir: 'one', left: 'APP', right: 'OLTP' }, gist: '**Transactions** (OLTP): many small reads and writes. Analytics here slows production.' }],
        rows: [['Workload', 'OLAP: BI, joins over billions of rows', 'ad hoc queries on files in S3', 'OLTP: orders, users, carts'], ['Data lives', 'Redshift managed storage (+ Spectrum on S3)', 'S3', 'the database'], ['Deciding words', 'data warehouse, BI, complex SQL on petabytes, big data + SQL', 'query S3 directly, ad hoc, serverless, pay per query', 'transactions, application database'], ['Tempting wrong', 'for an occasional query on S3 logs', 'for heavy concurrent BI dashboards', 'for petabyte analytics (your Q57)']],
        check: { q: '“Process 2 PB of clickstream data with Spark, then give 300 analysts fast SQL dashboards on the results.”', opts: ['Redshift', 'Athena', 'Aurora / RDS'], a: 0, why: 'Big data + SQL/BI at scale: EMR to process, Redshift to serve the dashboards — your baseline Q57.' } }
    ],

    traps: [
      { title: 'More Lambda concurrency for a connection storm', x: 'Your baseline Q15. Every new execution environment opens another connection. Pool them with RDS Proxy; raising concurrency makes “too many connections” worse.', drills: ['B1', 'B9'] },
      { title: 'RDS or Aurora as the data warehouse', x: 'Your baseline Q57. Big data + SQL/BI dashboards over terabytes = Redshift (with EMR or Glue to process). OLTP engines slow down and cost more for scans.', drills: ['B2', 'B25'] },
      { title: 'Global Database or global tables for one-Region read scaling', x: 'Prestige distractor. Reads inside one Region scale with Aurora Replicas, read replicas or a cache. Cross-Region services answer a cross-Region requirement.', drills: ['B3', 'B13'] },
      { title: 'Read replicas for write throughput', x: 'Replicas take reads only. Write scaling = bigger instance, Aurora Limitless, or DynamoDB with a good partition key.', drills: ['B12', 'B14'] },
      { title: 'Low-cardinality partition key', x: 'status, date or a single tenant ID funnels traffic to one partition (3,000 RCU / 1,000 WCU max). Use a high-cardinality key or write sharding (key + random suffix).', drills: ['B17'] },
      { title: 'LSI on an existing table', x: 'LSIs exist only from table creation and share the partition key. A new access pattern on an existing table = GSI.', drills: ['B18'] },
      { title: 'Strong consistency through DAX or on a GSI', x: 'DAX caches eventually consistent reads (strong reads pass through to DynamoDB). GSIs are eventually consistent only; an LSI or the base table can read strongly.', drills: ['B18', 'B20'] },
      { title: 'DAX in front of RDS', x: 'DAX speaks the DynamoDB API only. A cache for RDS, Aurora or an API is ElastiCache.', drills: ['B20', 'B21'] },
      { title: 'Provisioned to save money on spiky traffic', x: 'Provisioned wins only for steady traffic near its peak (break-even ~29% average utilisation at list prices). Spiky, unknown or idle → on-demand (the default).', drills: ['B19'] },
      { title: 'Rounding item sizes down', x: 'Reads round up to 4 KB, writes to 1 KB per item. A 4.5 KB item costs 2 RCU strongly consistent and 5 WCU per write.', drills: ['B16'] },
      { title: 'Lazy loading without a TTL', x: 'A write never touches the cache, so the old value is served until eviction. Add a TTL — or write-through for data that must be current.', drills: ['B22'] },
      { title: 'A cache as the only copy', x: 'ElastiCache is a cache: node loss can lose data unless durability is enabled. For a durable in-memory primary database, MemoryDB.', drills: ['B23'] },
      { title: 'Encrypting an existing RDS instance in place', x: 'Encryption at rest is chosen at creation. Snapshot → copy the snapshot with encryption → restore → switch the app.', drills: ['B27'] },
      { title: 'Aurora for Oracle or SQL Server', x: 'Aurora is MySQL- or PostgreSQL-compatible only. Keep the engine on RDS (or RDS Custom for OS access).', drills: ['B5', 'B6'] },
      { title: 'QLDB or Timestream LiveAnalytics in a new design', x: 'QLDB is shut down (31 Jul 2025); Timestream for LiveAnalytics is closed to new customers. Banks may still show them — today: Aurora PostgreSQL with audit, Timestream for InfluxDB.', drills: ['B29', 'B30'] },
      { title: 'Building a pipeline when zero-ETL exists', x: 'Aurora, RDS (MySQL, PostgreSQL, Oracle) and DynamoDB replicate into Redshift with zero-ETL integrations: least operational overhead.', drills: ['B26'] }
    ],

    log: [
      { when: '2 Sept 2026', what: 'Baseline practice exam, database items', result: 'Q15 RDS Proxy missed (A: raised Lambda concurrency); Q57 big data + SQL/BI missed (K: EMR + Redshift)', lesson: 'Q15: Lambda + too many connections = RDS Proxy, never more concurrency. Q57: “big data” + “SQL / BI” = EMR to process, Redshift to query. Trained in drills B1, B2, B9, B25.' },
      { when: '—', what: 'Session 8 quiz', result: 'not taken yet', lesson: 'Run all 30 scenarios once. Misses are tagged in “Where it broke” and show up in Progress.' }
    ]
  });
})();
