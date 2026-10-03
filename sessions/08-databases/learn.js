/* Session 8 — the lesson. 12 chapters. Facts: docs/session-08-databases.md (verified 2026-10-03). */
(function () {
  'use strict';
  const S = window.SESSION;
  const fromDrill = (id, src) => {
    const d = S.drills.find(x => x.id === id);
    return { id: 'ck-' + id, src: src || d.src, q: d.q, opts: d.opts.map(o => ({ t: o.t, why: o.why })), a: d.opts.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0), why: d.expl };
  };

  const CHOOSE = {
    start: 'root',
    nodes: {
      root: { q: 'What does the data look like, and how is it used?', opts: [
        { label: 'Rows in tables: joins, SQL, transactions', sub: 'an application database (OLTP)', next: 'rel' },
        { label: 'Items fetched by a key, at any scale', sub: 'sessions, carts, profiles, game state', next: 'kv' },
        { label: 'Analytics: BI dashboards, SQL over terabytes', sub: 'a warehouse (OLAP)', next: 'olap' },
        { label: 'Something specific', sub: 'documents, graphs, Cassandra, time series, search, ledger', next: 'special' },
        { label: 'Keep hot data in memory', sub: 'a cache, or an in-memory database', next: 'mem' }] },
      rel: { q: 'Which constraint decides it?', opts: [
        { label: 'The engine is Oracle, SQL Server or Db2 (or must stay exactly as it is)', next: 'rds' },
        { label: 'Same, and the vendor needs access to the operating system', next: 'custom' },
        { label: 'MySQL or PostgreSQL with high throughput, 15 low-lag replicas, storage that grows by itself', next: 'aurora' },
        { label: 'Intermittent or unpredictable load; pay nothing while idle', next: 'sv2' },
        { label: 'PostgreSQL writes beyond one writer instance', next: 'limitless' },
        { label: 'Active-active writes in several Regions, serverless SQL', next: 'dsql' }] },
      kv: { q: 'How fast must reads be?', opts: [
        { label: 'Single-digit milliseconds is fine', next: 'ddb' },
        { label: 'Microseconds, and the data already lives in DynamoDB', next: 'dax' }] },
      special: { q: 'Which data model?', opts: [
        { label: 'JSON documents, MongoDB drivers', next: 'docdb' },
        { label: 'Relationships and multi-hop traversals', next: 'neptune' },
        { label: 'Apache Cassandra, CQL', next: 'keyspaces' },
        { label: 'Measurements over time (IoT, metrics)', next: 'ts' },
        { label: 'Full-text search, log analytics, vectors', next: 'os' },
        { label: 'An immutable ledger', next: 'ledger' }] },
      mem: { q: 'Is it a cache, or the only copy of the data?', opts: [
        { label: 'A cache in front of a database or an API', next: 'ec' },
        { label: 'The only copy: must survive node and AZ loss', next: 'mdb' }] }
    },
    results: {
      rds: { title: 'Amazon RDS', line: 'rds', text: 'The managed version of your engine: **MySQL, MariaDB, PostgreSQL, Oracle, SQL Server or Db2**. Multi-AZ for HA, read replicas for reads, Blue/Green for upgrades.', whyNot: [['Aurora', 'MySQL / PostgreSQL only']] },
      custom: { title: 'Amazon RDS Custom', line: 'rds', text: 'RDS automation **plus** privileged access to the database host (SQL Server; Oracle until its end of support on 31 Mar 2027).', whyNot: [['RDS', 'no OS access'], ['EC2', 'all administration is yours']] },
      aurora: { title: 'Amazon Aurora', line: 'aurora', text: 'MySQL- or PostgreSQL-compatible, shared cluster volume (up to 256 TiB), up to 15 Aurora Replicas behind a reader endpoint, fast failover.', whyNot: [['RDS for MySQL/PostgreSQL', 'fine and cheaper when none of that is needed']] },
      sv2: { title: 'Aurora Serverless v2', line: 'aurora', text: 'Capacity in ACUs (about 2 GiB of memory each), scaling in 0.5-ACU steps between your minimum and maximum (0–256). A minimum of **0** pauses the database when idle.', facts: ['Auto-pause since Nov 2024'], whyNot: [['Provisioned instances', 'pay for peak size all day']] },
      limitless: { title: 'Aurora PostgreSQL Limitless Database', line: 'aurora', text: 'Horizontal write scaling: routers and shards in a DB shard group, one PostgreSQL database to the application.', whyNot: [['Aurora Replicas', 'read-only']] },
      dsql: { title: 'Aurora DSQL', line: 'aurora', text: 'Serverless, PostgreSQL-compatible, distributed SQL; multi-Region clusters are active-active with a witness Region.', facts: ['GA May 2025'], whyNot: [['Aurora Global Database', 'one writer Region']] },
      ddb: { title: 'Amazon DynamoDB', line: 'ddb', text: 'Serverless key-value / document store; single-digit-ms at any scale. On-demand for spiky or unknown traffic, provisioned for steady traffic.', whyNot: [['Relational', 'one writer, joins you do not need']] },
      dax: { title: 'DynamoDB + DAX', line: 'ddb', text: 'An API-compatible in-memory cache for DynamoDB: microsecond, eventually consistent reads with minimal code change.', whyNot: [['ElastiCache', 'works, but you write the caching code']] },
      docdb: { title: 'Amazon DocumentDB', line: 'purpose', text: 'MongoDB-compatible document database: instance-based or elastic clusters, Serverless option.', whyNot: [['DynamoDB', 'a rewrite off the MongoDB API']] },
      neptune: { title: 'Amazon Neptune', line: 'purpose', text: 'Graph database: Gremlin, openCypher, SPARQL; Neptune Analytics for graph analytics.', whyNot: [['Relational', 'recursive joins slow down with every hop']] },
      keyspaces: { title: 'Amazon Keyspaces', line: 'purpose', text: 'Serverless, Apache Cassandra-compatible; keep CQL and the Cassandra drivers.', whyNot: [['DynamoDB', 'a rewrite off CQL']] },
      ts: { title: 'Amazon Timestream for InfluxDB', line: 'purpose', text: 'Managed InfluxDB for time series with millisecond queries.', update: 'Timestream for LiveAnalytics has been closed to new customers since 20 Jun 2025.', whyNot: [['RDS', 'you partition and scale it yourself']] },
      os: { title: 'Amazon OpenSearch Service', line: 'purpose', text: 'Search and log analytics; OpenSearch Serverless collections for search, time series and vector search. DynamoDB can feed it through zero-ETL.', whyNot: [['RDS LIKE queries', 'no relevance ranking, slow']] },
      ledger: { title: 'Not QLDB any more', line: 'purpose', text: 'Amazon QLDB reached **full shutdown on 31 Jul 2025**. Design the history yourself, for example Aurora PostgreSQL with append-only audit tables.', whyNot: [['Amazon QLDB', 'no longer exists']] },
      ec: { title: 'Amazon ElastiCache', line: 'cache', text: '**Valkey** or **Redis OSS** (replication, failover, data structures) or **Memcached** (simple, multithreaded). Node-based or Serverless. You choose lazy loading, write-through and TTLs.', whyNot: [['DAX', 'DynamoDB only']] },
      mdb: { title: 'Amazon MemoryDB', line: 'cache', text: 'Durable in-memory database: every write goes to a Multi-AZ transaction log before it is acknowledged. Microsecond reads, single-digit-ms writes.', whyNot: [['ElastiCache', 'a cache, unless its newer durability option is enabled']] },
      olap: { title: 'Amazon Redshift', line: 'redshift', text: 'The warehouse: Serverless or RA3, Spectrum for data in S3, zero-ETL from Aurora, RDS and DynamoDB. Big data processing first? EMR or Glue, then Redshift.', whyNot: [['RDS / Aurora', 'OLTP engines'], ['Athena', 'ad hoc SQL on S3, not a warehouse']] }
    }
  };

  S.learn = [
    /* ---------------------------------------------------------------- 1 */
    { id: 'ch1', title: 'How to read a database question', domains: 'D3 D2 D1 D4', blocks: [
      'This cluster is mostly **D3 (High-performing, 24%)** with slices of D2, D1 and D4. Almost every question has the same shape: a workload with a data model and an access pattern, a performance or cost problem, and four options that are all real AWS databases or features. The wrong options are rarely nonsense — they are good services built for a **different data model, a different scale or a different problem**.',
      { h: 'Your record on this cluster' },
      { table: { head: ['Where', 'What happened', 'What it teaches', 'Tag'], rows: [
        ['baseline **Q15**', 'Lambda exhausted RDS connections; you **raised Lambda concurrency**', 'too many connections → **RDS Proxy**; more concurrency makes it worse', '**A** reasoning'],
        ['baseline **Q57**', '“big data” + “SQL / BI” — missed the keywords', 'process with **EMR**, query with **Redshift**', '**K** keyword'],
        ['baseline, six times', 'prestige distractors (a service with no role)', 'here: Global Database, Global Accelerator, DAX in the wrong place', '**C** confused similar']] } },
      { callout: 'Drills **B1–B4** and four cards come from these misses and are marked as yours. B1 is Q15 rebuilt; B2 is Q57; B3 offers Aurora Global Database for a one-Region read problem; B4 offers Global Accelerator, DAX and Global Database for a caching problem.', kind: 'miss', title: 'Your misses' },
      { h: 'Ask first: what is the data, and how is it used?' },
      'Four questions sort the options before you read them properly:',
      { ol: [
        '**What is the data model?** Rows with joins (relational), items fetched by a key (key-value), JSON documents, relationships (graph), measurements over time (time series), or facts to analyse (a warehouse). The model alone rules out half of the options.',
        '**What is the load?** Read-heavy, write-heavy, spiky and unpredictable, steady — or simply **too many connections**, which is a different problem from too much work.',
        '**How fast?** Microseconds means memory (a cache, DAX, MemoryDB). Milliseconds is any operational database. Seconds is fine for analytics.',
        '**What is optimised?** Least operational overhead favours serverless, managed and zero-ETL answers; most cost-effective favours the smallest change that works.'] },
      { h: 'The stub for this session' },
      'Session 7’s slots (failure, RTO, RPO) do not separate databases. This session uses four new ones:',
      { table: { head: ['Slot', 'Ask', 'Values', 'What it kills'], rows: [
        ['DATA MODEL', 'What shape is the data?', '`relational` · `key-value` · `document` · `graph` · `time series` · `analytics`', 'DynamoDB for joins; RDS for a warehouse; DocumentDB for a graph'],
        ['LOAD', 'What is the pressure?', '`read-heavy` · `write-heavy` · `spiky` · `steady` · `many connections`', 'replicas for writes; provisioned for spikes; bigger instances for connections'],
        ['LATENCY', 'How fast?', '`microseconds` · `milliseconds` · `seconds`', 'databases for µs; caches for analytics'],
        ['SUPERLATIVE', 'What is optimised?', '`cheapest` · `least ops` · `fastest` · `none stated`', 'pipelines where zero-ETL exists; a second Region for one-Region reads']] } },
      { pre: S.method, label: 'The method' },
      { h: 'Built for — one line each' },
      { hooks: [
        ['RDS', 'your relational **engine**, managed (six engines).'],
        ['RDS Proxy', '**pools connections** for Lambda and bursty apps.'],
        ['Aurora', 'cloud **MySQL/PostgreSQL**: 15 replicas, self-growing storage, Serverless v2.'],
        ['DynamoDB', '**key-value at any scale**, serverless.'],
        ['DAX', '**microsecond** cache for DynamoDB only.'],
        ['ElastiCache', '**cache** in front of anything (Valkey, Redis OSS, Memcached).'],
        ['MemoryDB', '**durable** in-memory primary database.'],
        ['Redshift', '**warehouse**: SQL and BI over terabytes.'],
        ['DocumentDB', '**MongoDB**-compatible documents.'],
        ['Neptune', '**graph**: relationships and hops.'],
        ['Keyspaces', '**Cassandra**-compatible, CQL.'],
        ['Timestream for InfluxDB', '**time series**.'],
        ['OpenSearch', '**search** and log analytics.']], label: 'Built for' },
      { h: 'Try it on B1' },
      'Your Q15, rebuilt. Fill the stub first: the model is relational, and the load is not “read-heavy” or “write-heavy” — the stem says the CPU is idle. What is running out?',
      { callout: S.drills.find(d => d.id === 'B1').q + ' [[#drill/B1|Solve it in the drill →]]', kind: 'note', title: 'Exam Q15' },
      { check: { id: 'ch1-load', src: 'Exam Q15', q: 'A database refuses new connections while its **CPU is at 30%**. Which LOAD value goes in the stub?', opts: [
        { t: '`many connections` — the limit is the number of sessions, not the work done.', why: 'the idle CPU says the work fits; the sessions do not.' },
        { t: '`write-heavy` — the refused sessions must be failing in the middle of writes.', why: 'nothing in the stem says the writes are the problem.' },
        { t: '`spiky` — anything that fails at peak is a capacity-planning question.', why: 'spikes cause it, but the resource that runs out is connections.' }], a: 0,
        why: 'Name the resource that runs out. Connections → pool them (RDS Proxy). Work → scale or cache.' } },
      { check: { id: 'ch1-prestige', src: 'Exam pattern', q: 'All users are in one Region and the database needs more read capacity. An option adds **Aurora Global Database**. Why cross it out?', opts: [
        { t: 'It answers a cross-Region need the scenario never states; in-Region replicas do the job.', why: 'built for Region loss and global reads.' },
        { t: 'It cannot serve reads at all, because its secondary clusters exist only for failover.', why: 'false — secondaries serve local reads.' },
        { t: 'It runs only on Aurora PostgreSQL, so a cluster on Aurora MySQL cannot use it.', why: 'false — MySQL and PostgreSQL both support it.' }], a: 0,
        why: 'Prestige distractors are real, working features built for a bigger problem. Keep an option only when the scenario states its built-for reason.' } }
    ] },

    /* ---------------------------------------------------------------- 2 */
    { id: 'ch2', title: 'Choosing the database', domains: 'D3 D4', blocks: [
      'AWS’s advice is to choose a **purpose-built** database for each workload rather than force everything into one engine. For the exam that turns into one habit: **name the data model first**, then pick the service built for it, then check the scale and the superlative.',
      { table: { head: ['Data model', 'Typical words', 'Service', 'Not this'], key: true, rows: [
        ['**Relational (OLTP)**', 'joins, transactions, SQL, existing Oracle / SQL Server / MySQL app', 'RDS · Aurora', 'DynamoDB (no joins), Redshift (not OLTP)'],
        ['**Key-value / document at scale**', 'by user ID, sessions, carts, leaderboards, millions of requests per second, serverless', 'DynamoDB (+ DAX)', 'Aurora (one writer)'],
        ['**Warehouse (OLAP)**', 'BI, dashboards, complex SQL over TB–PB, historical analysis', 'Redshift', 'RDS read replicas'],
        ['**Documents, MongoDB API**', 'MongoDB-compatible, JSON, keep the drivers', 'DocumentDB', 'DynamoDB (rewrite)'],
        ['**Graph**', 'relationships, friends of friends, fraud rings, recommendations', 'Neptune', 'recursive SQL joins'],
        ['**Wide-column, Cassandra API**', 'Cassandra, CQL', 'Keyspaces', 'DynamoDB (rewrite)'],
        ['**Time series**', 'IoT sensors, metrics over time, time windows', 'Timestream for InfluxDB', 'RDS tables you partition'],
        ['**Search**', 'full-text search, log analytics, relevance', 'OpenSearch', 'LIKE on RDS'],
        ['**In memory**', 'microseconds, cache, session store', 'ElastiCache · DAX · MemoryDB', 'a database alone']] } },
      { callout: 'Two services have left the board. **Amazon QLDB** (ledger) reached **full shutdown on 31 July 2025**. **Timestream for LiveAnalytics** has been **closed to new customers since 20 June 2025**; AWS points new customers to **Timestream for InfluxDB**. Practice banks may still use both as answers — recognise them, but know today’s answer.', kind: 'update' },
      { h: 'Walk the decision tree' },
      'Follow it with a scenario in mind. Every leaf tells you why the nearest look-alike loses.',
      { widget: 'chooser', args: { title: 'Which database?', tree: CHOOSE } },
      { widget: 'sorter', args: { title: 'Which database family?', lead: 'Twelve requirements, four families. Decide before you check.', buckets: [{ id: 'rel', short: 'RDS/Aurora', label: 'Relational: RDS or Aurora' }, { id: 'ddb', short: 'DynamoDB', label: 'DynamoDB' }, { id: 'rs', short: 'Redshift', label: 'Redshift' }, { id: 'pb', short: 'Purpose-built', label: 'Purpose-built engine' }], items: [
        { t: 'Order system with joins across customers, orders and invoices', b: 'rel', why: 'relational OLTP.' },
        { t: 'Shopping carts by session ID, millions of users, serverless', b: 'ddb', why: 'key-value at scale.' },
        { t: 'Quarterly BI dashboards over 5 years of sales', b: 'rs', why: 'warehouse.' },
        { t: 'Recommendations from “customers who bought this also bought”', b: 'pb', why: 'graph — Neptune.' },
        { t: 'Existing Oracle ERP, lift to a managed service', b: 'rel', why: 'RDS for Oracle.' },
        { t: 'Game leaderboard writes at a million requests per second', b: 'ddb', why: 'key-value, any scale.' },
        { t: 'MongoDB app, keep the drivers', b: 'pb', why: 'DocumentDB.' },
        { t: 'Analysts join clickstream with sales in SQL, petabytes', b: 'rs', why: 'warehouse.' },
        { t: 'Full-text product search with relevance ranking', b: 'pb', why: 'OpenSearch.' },
        { t: 'PostgreSQL app with unpredictable load that should pause when idle', b: 'rel', why: 'Aurora Serverless v2.' },
        { t: 'IoT sensor readings queried by time window', b: 'pb', why: 'Timestream for InfluxDB.' },
        { t: 'User profiles by user ID with single-digit-ms latency', b: 'ddb', why: 'key-value.' }] } },
      { pair: 'rel-kv' },
      { check: fromDrill('B29') },
      { drills: ['B14', 'B28', 'B29', 'B30'] }
    ] },

    /* ---------------------------------------------------------------- 3 */
    { id: 'ch3', title: 'RDS: engines, storage and safe changes', domains: 'D3 D2 D1', blocks: [
      '**Amazon RDS** runs a relational engine for you: AWS provisions the instance, patches the engine and the OS, takes backups and fails over. You choose the **engine**, the **instance class** and the **storage**. The resilience features — Multi-AZ instances and clusters, backups, point-in-time recovery, cross-Region replicas — are in [[../07-ha-dr/#learn/ch4|Session 7, chapter 4]]; this chapter is about choosing and running it.',
      { h: 'Engines and storage' },
      { ul: [
        'Six engines: **MySQL, MariaDB, PostgreSQL, Oracle, Microsoft SQL Server and Db2**. Aurora is a separate engine family (next chapters).',
        'Storage is EBS: **gp3** (recommended general purpose; baseline 3,000 IOPS, more provisioned on larger volumes) or **io2 Block Express** (up to 256,000 IOPS, sub-millisecond latency). gp2 and io1 are previous generation; **magnetic storage is gone**.',
        'Maximum size **64 TiB** for Db2, MariaDB, MySQL and PostgreSQL. **Oracle and SQL Server** reach **256 TiB** by attaching up to three **additional storage volumes**.',
        '**Storage autoscaling** grows the volume when free space runs low, up to a maximum you set.'] },
      { callout: 'Older material: 16 TiB maximum, magnetic storage as a cheap option, no Db2. Today: **64 TiB** (256 TiB for Oracle and SQL Server with additional volumes), magnetic deprecated (no restores to magnetic after 1 July 2026), **RDS for Db2** available.', kind: 'update' },
      { h: 'Performance features worth knowing' },
      { ul: [
        '**Read replicas** — asynchronous, readable copies (chapter 5).',
        '**RDS Optimized Reads** (RDS for MySQL on classes with local NVMe storage such as db.m6gd): temporary tables and sorts go to the instance store — up to **2x faster** queries that use them.',
        '**RDS Optimized Writes** (RDS for MySQL on Nitro classes): writes pages once without the doublewrite buffer — up to **2x** write throughput.',
        '**Provisioned IOPS** (io2) when latency must be consistently low.'] },
      { h: 'RDS Custom: when you need the operating system' },
      'RDS hides the host. Some packaged applications need an agent, a driver or a patch installed **on the database server**. **RDS Custom** gives you privileged OS and database access while RDS keeps automating backups, monitoring and recovery — a shared responsibility model between RDS and EC2. It supports **SQL Server** and **Oracle**.',
      { callout: '**RDS Custom for Oracle** is in **sunset**: announced 31 March 2026, end of support **31 March 2027**; AWS recommends self-managed Oracle on EC2. RDS Custom for SQL Server is unaffected.', kind: 'update' },
      { check: fromDrill('B6') },
      { h: 'Blue/Green Deployments: change with a safety net' },
      'Major version upgrades, parameter changes and schema changes are risky on a production database. A **Blue/Green Deployment** copies the production (blue) environment into a staging (green) environment that **stays in sync** through replication. You change and test green; then you **switch over**: RDS stops writes, lets green catch up, and gives green the **names and endpoints** of blue. AWS says switchover typically takes **under a minute** with **no data loss** and **no application change**. Supported for **RDS for MySQL, MariaDB and PostgreSQL** (Aurora has its own).',
      { widget: 'stepper', args: { title: 'A major version upgrade with Blue/Green', line: 'rds', steps: [
        { title: 'Create the deployment', text: 'RDS copies the production topology — Multi-AZ instance, read replicas, parameter groups — into a green environment and starts replicating blue → green.' },
        { title: 'Upgrade green', text: 'Upgrade green to the new major version (or change its instance class, parameters or storage). Blue keeps serving production untouched.' },
        { title: 'Test with real data', text: 'Point test traffic at green’s own endpoints. It is read-only by default so it cannot drift from blue.' },
        { title: 'Switch over', text: 'Built-in guardrails check replication; writes stop briefly, green catches up and takes over blue’s names and endpoints. Typically under a minute.', note: 'Applications reconnect to the same endpoint. RDS Proxy and the AWS drivers shorten the reconnect further.' },
        { title: 'Keep the old blue', text: 'Blue is renamed with an -old suffix and kept for comparison until you delete the deployment.' }] } },
      { check: fromDrill('B7') },
      { h: 'Extended Support: old versions cost money' },
      'Every major engine version has an RDS end-of-standard-support date. If you have not upgraded by then, RDS **automatically enrols** the database in **RDS Extended Support**, a **paid** offering that keeps critical security fixes coming for **up to three years**; after that RDS upgrades it for you. For the exam: “run an old version past its end of support” = Extended Support, and it is not free.',
      { check: fromDrill('B5') },
      { drills: ['B5', 'B6', 'B7'] }
    ] },

    /* ---------------------------------------------------------------- 4 */
    { id: 'ch4', title: 'RDS Proxy and the connection storm', domains: 'D3 D2 D1', blocks: [
      'Your baseline **Q15** lives here. A relational database has a hard ceiling on **simultaneous connections**, set by `max_connections` and derived from the instance’s memory: RDS for MySQL defaults to about the memory in MB divided by 12 — roughly **60** on a db.t3.micro and roughly **630** on an 8 GiB class. Each connection costs the database memory and a TLS handshake and login to open.',
      'A traditional server holds a small pool of connections and reuses them. **AWS Lambda** does not: each concurrent invocation runs in its own execution environment, and if the code opens a connection, every environment holds one. Your account can run **1,000** concurrent executions per Region by default. A sale or a burst of events scales the function out, and the database starts refusing connections while its CPU is nearly idle.',
      { widget: 'connStorm' },
      { h: 'What RDS Proxy does' },
      '**RDS Proxy** is a fully managed, highly available proxy that sits in your VPC between the application and the database. It keeps a **pool** of database connections and **multiplexes** client sessions onto them: a connection is lent to a client only while it runs a statement. Requests beyond the pool **queue** (latency rises a little) instead of failing.',
      { ul: [
        '**Engines**: Aurora MySQL and PostgreSQL; RDS for MySQL, PostgreSQL, MariaDB and SQL Server. **Not** Oracle or Db2.',
        '**Failover**: the proxy keeps client connections open and routes to the new writer; AWS says it cuts Aurora and RDS failover times by **up to 66%**.',
        '**Security**: you can **require IAM authentication** from clients; the proxy connects to the database with credentials it reads from **Secrets Manager** (or with IAM database authentication). Nothing secret lives in the function.',
        '**Placement**: the proxy lives in the database’s VPC and is never publicly accessible; extra proxy endpoints can sit in other VPCs of the same Region. For an RDS instance it targets the writer (not a read replica); read-only proxy endpoints exist for Aurora clusters and Multi-AZ DB clusters.',
        '**Pinning**: some session state (for example a statement over 16 KB) pins a client to one database connection, which reduces sharing.'] },
      { widget: 'stepper', args: { title: 'A Lambda burst through RDS Proxy', line: 'proxy', steps: [
        { title: 'Burst', text: 'A flash sale scales the order function from 50 to 1,000 concurrent invocations in seconds.' },
        { title: 'Clients connect to the proxy', text: 'Each environment opens a connection to the **proxy endpoint**, authenticated with an IAM token. The proxy accepts them all.' },
        { title: 'Pooled connections to the database', text: 'Only the invocations that are running a query at this moment borrow one of the proxy’s pooled connections. The database sees a few hundred steady connections instead of 1,000 new ones.' },
        { title: 'Queue, not refuse', text: 'If every pooled connection is busy, the next query waits briefly in the proxy. Latency rises a little; nothing fails.', note: 'Your Q15 pick — raising Lambda concurrency — adds clients. With a proxy that only lengthens the queue; without one it multiplies the refused connections.', noteTitle: 'Your miss' },
        { title: 'Failover', text: 'If the writer fails, clients stay connected to the proxy while it switches to the new writer — no stale DNS in the functions.' }] } },
      { pair: 'proxy-scale' },
      { check: fromDrill('B1', 'Exam Q15') },
      { check: fromDrill('B8') },
      { check: fromDrill('B9') },
      { drills: ['B1', 'B8', 'B9'] }
    ] },

    /* ---------------------------------------------------------------- 5 */
    { id: 'ch5', title: 'Scaling reads', domains: 'D3 D4', blocks: [
      'Read problems come in two kinds, and they have different answers. **Broad** read load — reports, searches, many different queries — needs more database capacity: **replicas**. **Repeated** reads of the same data need memory: a **cache**. Neither helps writes.',
      { h: 'RDS read replicas' },
      'An RDS read replica is an **asynchronous** copy with its own instance and its own storage, in the same AZ, another AZ or another Region. The application sends read-only queries to the **replica’s endpoint**; writes still go to the primary. Up to **15** per source for MySQL, MariaDB and PostgreSQL. Replication lag can grow under heavy writes, so read-after-write paths should stay on the primary. Replicas are also a DR tool ([[../07-ha-dr/#learn/ch4|Session 7]]) — but for HA the standby (Multi-AZ) serves **no** reads.',
      { h: 'Aurora Replicas and endpoints' },
      'Aurora Replicas read the **same cluster volume** as the writer, so there is no copy of the data to keep in step and lag is usually milliseconds. Up to **15** per cluster. Aurora gives you endpoints so the application does not hard-code instances:',
      { table: { head: ['Endpoint', 'Points at', 'Use for'], key: true, rows: [
        ['**Cluster (writer) endpoint**', 'the current writer; follows failover', 'writes and read-after-write'],
        ['**Reader endpoint**', 'all Aurora Replicas, connection-balanced', 'general read traffic'],
        ['**Custom endpoint**', 'a subset of instances you choose', 'separate workloads, e.g. big replicas for analytics'],
        ['**Instance endpoint**', 'one instance', 'diagnosis and tuning, not routing']] } },
      { check: fromDrill('B12') },
      { h: 'Your prestige pattern, read-scaling edition' },
      { callout: 'When users and reads are all in **one Region**, the answer is in the Region: Aurora Replicas, RDS read replicas, or a cache. **Aurora Global Database** and **DynamoDB global tables** are built for cross-Region reads and Region loss; picking them here is the prestige pattern from your baseline.', kind: 'miss', title: 'Your misses' },
      { check: fromDrill('B3', 'Exam pattern') },
      { h: 'Caches for repeated reads' },
      'When the **same** results are read over and over (a product catalog, a configuration, a leaderboard), a replica still does the full query work every time. A cache — **ElastiCache** in front of RDS or Aurora, **DAX** in front of DynamoDB — answers from memory in microseconds and takes the load off entirely. Chapter 9 covers how.',
      { widget: 'sorter', args: { title: 'How would you scale these reads?', lead: 'Eight read problems. Pick the built-for tool.', buckets: [{ id: 'rr', short: 'Read replica', label: 'RDS read replica' }, { id: 'ar', short: 'Aurora reader', label: 'Aurora Replicas + reader endpoint' }, { id: 'ce', short: 'Custom endpoint', label: 'Aurora custom endpoint' }, { id: 'cache', short: 'Cache', label: 'Cache (ElastiCache / DAX)' }], items: [
        { t: 'Nightly reports slow down an RDS for Oracle primary', b: 'rr', why: 'Oracle stays on RDS; a replica takes the reports.' },
        { t: 'Aurora MySQL writer at 90% CPU from many varied reads', b: 'ar', why: 'add replicas, use the reader endpoint.' },
        { t: 'Two large Aurora replicas reserved for analysts', b: 'ce', why: 'a named subset.' },
        { t: 'The same 500 product queries repeat thousands of times a second', b: 'cache', why: 'repeated results.' },
        { t: 'Microsecond reads of hot DynamoDB items', b: 'cache', why: 'DAX.' },
        { t: 'RDS for PostgreSQL search page, many different queries', b: 'rr', why: 'broad read load.' },
        { t: 'Keep web reads off the replicas used for batch exports', b: 'ce', why: 'separate subsets.' },
        { t: 'Aurora PostgreSQL read traffic doubles; one Region', b: 'ar', why: 'more replicas behind the reader endpoint.' }] } },
      { check: fromDrill('B24') },
      { drills: ['B3', 'B12', 'B24'] }
    ] },

    /* ---------------------------------------------------------------- 6 */
    { id: 'ch6', title: 'Aurora: storage, Serverless v2, I/O-Optimized, Limitless', domains: 'D3 D4 D2', blocks: [
      '**Amazon Aurora** is AWS’s own MySQL- and PostgreSQL-compatible engine. The big design difference from RDS is the **cluster volume**: one distributed storage layer with six copies across three AZs, shared by the writer and every replica. Compute and storage scale separately.',
      { ul: [
        'The volume **grows automatically** up to **256 TiB** on current engine versions (raised from 128 TiB in July 2025) and shrinks when you drop data. You pay for what you use.',
        'Up to **15 Aurora Replicas** with millisecond lag; failover promotes one, typically in under a minute ([[../07-ha-dr/#learn/ch5|Session 7]] covers failover, Global Database and Backtrack).',
        '**Aurora vs RDS**: Aurora when the engine is MySQL or PostgreSQL and you need its throughput, replicas, fast failover, serverless capacity or self-growing storage. RDS when the engine is something else, or the simplest and cheapest managed instance is enough.'] },
      { pair: 'rds-aurora' },
      { h: 'Aurora Serverless v2' },
      'Instead of an instance class, each writer or reader gets a **capacity range** in **Aurora capacity units (ACUs)** — about **2 GiB of memory** each, with matching CPU and networking. Aurora scales every instance continuously in steps as small as **0.5 ACU**, between your minimum and maximum, without dropping connections. The range is **0 to 256 ACUs** on current versions. With a minimum of **0**, an idle instance **pauses** (no compute charge) and resumes on the next connection.',
      { callout: 'Scaling to **0 ACUs** (automatic pause and resume) arrived in **November 2024** for Aurora PostgreSQL 13.15+/14.12+/15.7+/16.3+ and Aurora MySQL 3.08+. Older material says Serverless v2 cannot go below 0.5 ACU and that only **Serverless v1** could pause — v1 is now deprecated.', kind: 'update' },
      'Serverless v2 instances mix freely with provisioned ones in the same cluster: a large provisioned writer with serverless readers, or the reverse. Readers in promotion tiers 0–1 scale with the writer so they can take over; tiers 2–15 scale on their own load.',
      { check: fromDrill('B10') },
      { h: 'Aurora I/O-Optimized' },
      'Aurora Standard charges for instances, storage **and every million I/O requests**. **Aurora I/O-Optimized** (May 2023) charges no I/O at all, in exchange for higher instance and storage prices. AWS’s rule of thumb: I/O-Optimized is the better choice when **I/O is 25% or more** of your Aurora spend (up to 40% savings for I/O-heavy clusters). You can switch to it **once every 30 days** and back to Standard at any time.',
      { check: fromDrill('B11') },
      { h: 'When one writer is not enough' },
      { ul: [
        '**Aurora PostgreSQL Limitless Database** (GA **October 2024**): horizontal scaling of **writes**. A DB shard group has **routers** (accept connections, plan queries) and **shards** (hold slices of sharded tables, or full copies of reference tables). The application still sees **one PostgreSQL database**.',
        '**Aurora DSQL** (GA May 2025): a serverless, distributed, PostgreSQL-compatible database; multi-Region clusters are **active-active** in two Regions with a witness Region. Built for 99.999% multi-Region availability.',
        '**Aurora Global Database** (Session 7): one writer Region, read-only secondaries — it scales reads across Regions, not writes.'] },
      { check: fromDrill('B13') },
      { h: 'Aurora to the warehouse' },
      'An **Aurora zero-ETL integration with Amazon Redshift** replicates data into Redshift in near real time with no pipeline to build (Aurora MySQL since November 2023, Aurora PostgreSQL since October 2024). Analytics move off the production cluster without a Glue job or DMS task. Chapter 10 picks it up.',
      { drills: ['B10', 'B11', 'B13'] }
    ] },

    /* ---------------------------------------------------------------- 7 */
    { id: 'ch7', title: 'DynamoDB: keys, partitions and indexes', domains: 'D3 D2', blocks: [
      '**DynamoDB** stores **items** (up to **400 KB** each) in **tables**. Every item has a **primary key**: a **partition key** alone, or a partition key plus a **sort key**. There are no joins and no fixed schema beyond the key. In return you get single-digit-millisecond reads and writes at any scale, with nothing to patch, and replication across AZs built in.',
      { h: 'Partitions decide performance' },
      'DynamoDB hashes the partition key to place each item on a **partition**, and adds partitions as the table grows. Each partition can serve at most **3,000 read units and 1,000 write units per second**. A table can have far more capacity than that in total — but only if traffic is **spread across many partition key values**.',
      { ul: [
        '**Good keys** have high cardinality and even access: user ID, device ID, order ID.',
        '**Bad keys** funnel traffic: a status flag, today’s date, one big tenant. Every write for that value hits one partition and **throttles** while the rest of the table idles — a **hot partition**.',
        '**Write sharding**: when one logical key is genuinely hot, append a suffix (random or calculated, 1–N) so writes spread over N partition key values; reads gather from all N.',
        '**Adaptive capacity** (on-demand and provisioned) shifts capacity towards busy partitions, but it cannot lift one partition above its limit. **DAX** helps hot **reads**, not writes.'] },
      { check: fromDrill('B17') },
      { h: 'Secondary indexes' },
      'To query by an attribute other than the primary key, add an index. DynamoDB maintains it from the table’s writes (and charges write units for it).',
      { pair: 'gsi-lsi' },
      { widget: 'sorter', args: { title: 'GSI or LSI?', lead: 'Eight index requirements. Which kind of index fits?', buckets: [{ id: 'gsi', short: 'GSI', label: 'Global secondary index' }, { id: 'lsi', short: 'LSI', label: 'Local secondary index' }], items: [
        { t: 'Add a query by email to a table that has been live for a year', b: 'gsi', why: 'LSIs exist only from creation.' },
        { t: 'Same customer partition, but sort orders by total instead of date', b: 'lsi', why: 'same partition key, other sort key.' },
        { t: 'Strongly consistent reads on the alternative sort order', b: 'lsi', why: 'GSIs are eventually consistent only.' },
        { t: 'Query all orders by product ID across every customer', b: 'gsi', why: 'a different partition key.' },
        { t: 'The index needs its own read and write capacity', b: 'gsi', why: 'GSIs have their own throughput.' },
        { t: 'Defined in the CreateTable call, alternate sort on the same key', b: 'lsi', why: 'the LSI pattern.' },
        { t: 'Index items may exceed 10 GB per partition key value', b: 'gsi', why: 'LSI item collections are capped at 10 GB.' },
        { t: 'Sparse index of only the items flagged “open”', b: 'gsi', why: 'a GSI keyed on the flag attribute.' }] } },
      { check: fromDrill('B18') },
      { h: 'Transactions, Streams and TTL' },
      { ul: [
        '**Transactions** (`TransactWriteItems`, `TransactGetItems`): all-or-nothing across up to **100** items and **4 MB**, in one account and Region. Each transactional read or write costs **double** the capacity.',
        '**DynamoDB Streams**: an ordered log of item changes (keys only, new image, old image, or both), kept **24 hours**, each record exactly once and in order per item. The usual consumer is a **Lambda trigger** (event-driven processing, aggregates, notifications). **Kinesis Data Streams for DynamoDB** is the alternative when you need longer retention or more consumers (Session 9).',
        '**Time to Live (TTL)**: put an expiry time (epoch seconds) in an attribute; DynamoDB deletes expired items **without consuming write capacity**, typically **within a few days** of expiry. Filter expired items out of reads if they must disappear exactly on time. TTL deletes appear in Streams as service deletions.'] },
      { check: fromDrill('B15') },
      { callout: 'Also on the DynamoDB side of Session 7: **global tables** (MREC and MRSC) and **PITR 1–35 days**. And in chapter 10: **zero-ETL** from DynamoDB into Redshift (October 2024) and OpenSearch (November 2023), plus **export to S3** for analytics without touching table capacity.', kind: 'note', title: 'Elsewhere' },
      { drills: ['B15', 'B17', 'B18'] }
    ] },

    /* ---------------------------------------------------------------- 8 */
    { id: 'ch8', title: 'DynamoDB capacity: RCU, WCU and the two modes', domains: 'D3 D4', blocks: [
      'Every DynamoDB request is measured in **capacity units** — whether you pre-buy them (provisioned) or pay for them as you go (on-demand, “request units”). The exam asks you to do this math, and the rules are short:',
      { table: { head: ['Request', 'Unit covers', 'Cost per item'], key: true, rows: [
        ['Strongly consistent read', 'up to **4 KB**', '1 RCU per 4 KB (round the size **up**)'],
        ['Eventually consistent read (the default)', 'up to 4 KB', '½ RCU per 4 KB'],
        ['Transactional read', 'up to 4 KB', '2 RCU per 4 KB'],
        ['Standard write', 'up to **1 KB**', '1 WCU per 1 KB (round **up**)'],
        ['Transactional write', 'up to 1 KB', '2 WCU per 1 KB']] } },
      'Example: 4.5 KB items. A strongly consistent read rounds to 8 KB = **2 RCU**; eventually consistent = 1 RCU; a write rounds to 5 KB = **5 WCU**. Multiply by the requests per second. Remember that one partition stops at 3,000 RCU and 1,000 WCU, so a big number also tells you how many partitions’ worth of keys you need.',
      { widget: 'ddbCapacity' },
      { check: fromDrill('B16') },
      { h: 'On-demand or provisioned?' },
      { ul: [
        '**On-demand**: pay **per request**; no capacity planning; instantly serves up to **double the previous peak** (a new table starts at 4,000 writes and 12,000 reads per second); growth beyond double within 30 minutes can throttle until it scales, and the default table quota is 40,000 read and 40,000 write request units per second (raisable). AWS now calls it the **default and recommended** mode for most workloads.',
        '**Provisioned**: you set RCU and WCU per second and pay per hour whether you use them or not. **Auto scaling** adjusts them to a target utilisation, but it reacts over minutes — sudden spikes throttle. **Reserved capacity** discounts a committed base. Switch to on-demand up to **four times per 24 hours**; back to provisioned any time.',
        'At us-east-1 list prices, a provisioned unit-hour costs what about 29% of its 3,600 possible on-demand requests cost. So **steady traffic near the provisioned peak** → provisioned is cheaper; **spiky, idle or unknown** traffic → on-demand.'] },
      { callout: 'DynamoDB cut **on-demand prices by 50%** (effective 1 November 2024) and global-table replicated writes by up to 67%. Older material — written when on-demand cost several times more — treats provisioned as the default cost answer. Today AWS recommends on-demand by default; provisioned wins only for steady, predictable load.', kind: 'update' },
      { pair: 'od-prov' },
      { check: fromDrill('B19') },
      { h: 'Warm throughput and table classes' },
      { ul: [
        '**Warm throughput** shows how many reads and writes a table or index can serve **instantly**, based on how far it has scaled before. Before a launch you can **pre-warm** it (a charged, one-way increase) so a 10x or 100x spike is not throttled — in either capacity mode.',
        '**Table classes**: **Standard** (default) and **Standard-Infrequent Access**, which has cheaper storage and dearer requests. AWS says Standard-IA pays off when storage is more than about half of the throughput cost — logs, old orders, past game data. You can change the class twice in a 30-day period.'] },
      { check: fromDrill('B14') },
      { check: { id: 'ch8-ia', q: 'A 40 TB DynamoDB table of five-year-old order history is read a few times a day. Storage is most of its bill. What lowers the cost with no code change?', opts: [
        { t: 'Switch the table to the Standard-IA table class, which lowers the price of storage.', why: 'built for storage-dominated tables; same API.' },
        { t: 'Switch the table to on-demand mode, which charges only for the requests made.', why: 'it changes how throughput is billed; storage dominates.' },
        { t: 'Enable TTL on the table, so that old order items stop counting as stored data.', why: 'TTL deletes items — the history would be gone.' }], a: 0,
        why: 'Storage-heavy, rarely read → Standard-IA. Capacity mode is about requests; TTL is about deleting.' } },
      { drills: ['B14', 'B16', 'B19'] }
    ] },

    /* ---------------------------------------------------------------- 9 */
    { id: 'ch9', title: 'Caching: ElastiCache, DAX and MemoryDB', domains: 'D3 D4 D2', blocks: [
      'A cache keeps the answers to frequent reads **in memory**, so they return in microseconds and never reach the database. It fits when the **same data is read far more often than it changes** and a slightly old answer is acceptable (or can be kept fresh). It does not fit write-heavy data or data whose only copy must survive.',
      { h: 'Amazon ElastiCache' },
      { table: { head: ['Engine', 'What you get', 'Choose it when'], key: true, rows: [
        ['**Valkey**', 'Redis OSS-compatible open-source engine: data structures, replication, Multi-AZ failover, backups, cluster mode, pub/sub', 'the default today — the cheapest ElastiCache engine'],
        ['**Redis OSS**', 'the same feature set', 'an existing Redis OSS deployment'],
        ['**Memcached**', 'simple key-value, **multithreaded**, no replication, no persistence', 'a plain cache that scales out and may lose data']] } },
      { ul: [
        '**Cluster mode disabled**: one shard, one primary and up to 5 replicas. **Cluster mode enabled**: data split across shards — up to 500 nodes per cluster — for more memory and write capacity; Multi-AZ failover is required.',
        '**ElastiCache Serverless** (GA November 2023): no nodes to size; it scales memory, compute and network on its own, billed per GB-hour stored and per ECPU.',
        '**Global Datastore**: replicate a Valkey or Redis OSS cluster to up to two other Regions (node-based only).',
        '**Data tiering** (r6gd nodes): keep the hot part in memory and the rest on local SSD — for large datasets where only a fraction is hot.'] },
      { callout: '**Valkey** support (October 2024): node-based ElastiCache for Valkey is priced **20% lower** than the other engines; **ElastiCache Serverless for Valkey** is **33% lower** than Serverless for Redis OSS with a **100 MB** minimum (Redis OSS: 1 GB). Redis OSS versions 4 and 5 left standard support on 31 January 2026 and now run in paid Extended Support. In **June 2026** ElastiCache for Valkey 9.0 gained an optional **durability** setting (Multi-AZ transaction log) — newer than any bank.', kind: 'update' },
      { h: 'Caching strategies' },
      'ElastiCache does not decide what is in the cache — your code does. AWS describes two strategies and one safety valve:',
      { ul: [
        '**Lazy loading** (cache-aside): read the cache; on a **miss**, read the database and **write the result into the cache**. Only requested data is cached, and a failed node simply refills. But a write to the database never touches the cache, so the cached copy can be **stale**, and every miss costs three trips.',
        '**Write-through**: every database **write** also writes the cache. Cached data is **never stale**, but you cache data nobody may read, every write costs two writes, and a new or replaced node has missing data until it is written again.',
        '**TTL**: give every key an expiry. It bounds staleness for lazy loading and frees memory held by unread write-through entries. AWS recommends combining all three.'] },
      { widget: 'cachePattern' },
      { pair: 'lazy-wt' },
      { check: fromDrill('B22') },
      { h: 'Session stores' },
      'Keeping sessions on the web server ties users to one instance (sticky sessions) and logs them out when it is replaced. Put sessions in a **shared store**: **ElastiCache** (Valkey or Redis OSS with a replica) for sub-millisecond access, or **DynamoDB** with TTL when single-digit milliseconds is fine. Then any instance can serve any user, and Auto Scaling can remove instances freely.',
      { check: fromDrill('B21') },
      { h: 'DAX: the cache built into DynamoDB' },
      '**DynamoDB Accelerator (DAX)** is a managed cluster in your VPC that speaks the **DynamoDB API**. Swap the client and reads of cached items return in **microseconds**; writes go **through** DAX to the table. It caches **eventually consistent** reads — strongly consistent reads pass straight through to DynamoDB — and it is wasted on write-heavy tables or data that is rarely re-read. It works with DynamoDB only.',
      { check: fromDrill('B20') },
      { h: 'MemoryDB: when memory is the database' },
      '**Amazon MemoryDB** is a **durable**, Valkey- and Redis OSS-compatible **database**: every write is stored in a **Multi-AZ transaction log** before it is acknowledged, so you can run without any database behind it. Microsecond reads, single-digit-millisecond writes. **MemoryDB Multi-Region** (December 2024) adds active-active replication across Regions. MemoryDB for Valkey is 30% cheaper than on Redis OSS.',
      { pair: 'cache3' },
      { check: fromDrill('B23') },
      { check: fromDrill('B4', 'Exam pattern') },
      { drills: ['B4', 'B20', 'B21', 'B22', 'B23'] }
    ] },

    /* ---------------------------------------------------------------- 10 */
    { id: 'ch10', title: 'Redshift: when analytics need a warehouse', domains: 'D3 D4', blocks: [
      'Your baseline **Q57** missed the keywords: **big data** and **SQL / BI**. Operational databases (RDS, Aurora, DynamoDB) are built for **OLTP** — many small reads and writes of individual rows or items. **Analytics (OLAP)** — scanning and aggregating billions of rows for dashboards — needs a different engine. On AWS that is **Amazon Redshift**: a **columnar**, **massively parallel** SQL data warehouse.',
      { callout: 'Q57 in one line: process the big data with **EMR** (Spark, Hadoop) or Glue, then load the results into **Redshift** for SQL and BI dashboards. An answer that puts petabyte BI on RDS or Aurora, or on DynamoDB, is the wrong engine for the job.', kind: 'miss', title: 'Your miss' },
      { check: fromDrill('B2', 'Exam Q57') },
      { h: 'How you run it' },
      { ul: [
        '**Redshift Serverless** (GA July 2022): no clusters. Capacity is measured in **Redshift Processing Units (RPUs)**, 16 GB of memory each; you set a **base capacity** (default 128 RPU, adjustable from **4 to 512**, or up to **1,024** in five large Regions) and pay for compute only while queries run. AI-driven scaling can tune it against a price-performance target.',
        '**Provisioned clusters on RA3** nodes with **Redshift managed storage**: compute and storage scale and are billed separately; hot data is cached locally, the rest lives in S3. **Multi-AZ** deployments exist for RA3 (GA November 2023).',
        '**Concurrency scaling** adds transient capacity when many users query at once; each cluster earns up to one hour of free credits per day.',
        '**Data sharing** gives other Redshift warehouses live, read-only access to the same data without copying it.'] },
      { callout: 'Node types have moved: **DS2** is no longer available and **DC2** was deprecated in April 2025 — migrate to **RA3**, to the new Graviton-based **RG** nodes, or to Serverless. Serverless base capacity now starts at **4 RPU** (it used to start at 8 or 32). There is no current AWS documentation for **AQUA**; do not count on it as a feature.', kind: 'update' },
      { h: 'Data that stays in S3' },
      '**Redshift Spectrum** queries files in Amazon S3 (Parquet, ORC, CSV …) through **external tables**, without loading them, and joins them with tables in Redshift in one query. It is the warehouse answer for occasionally used history. **Athena** (Session 9) is the answer when there is no warehouse at all: serverless SQL on S3, pay per query.',
      { check: fromDrill('B25') },
      { h: 'Zero-ETL: no pipeline' },
      'A **zero-ETL integration** replicates an operational database into Redshift continuously, typically within seconds, with no Glue job, DMS task or code to run. Sources include **Aurora MySQL** (Nov 2023), **Aurora PostgreSQL** and **DynamoDB** (Oct 2024), **RDS for MySQL** (Sep 2024), **RDS for PostgreSQL** and **RDS for Oracle** (Jul 2025), plus applications such as Salesforce and SAP. When a question asks for near-real-time analytics on operational data with the least operational overhead, this is the built-for answer.',
      { check: fromDrill('B26') },
      { pair: 'olap' },
      { drills: ['B2', 'B25', 'B26'] }
    ] },

    /* ---------------------------------------------------------------- 11 */
    { id: 'ch11', title: 'Purpose-built engines and database security', domains: 'D3 D1', blocks: [
      'The purpose-built engines are tested mostly as **keyword matches**: name the data model, pick the engine, and reject the general-purpose database that would need a rewrite.',
      { table: { head: ['Engine', 'Data model / API', 'Deciding words', 'Notes'], key: true, rows: [
        ['**DocumentDB**', 'JSON documents, **MongoDB-compatible**', 'MongoDB, keep the drivers, JSON', 'instance-based or **elastic clusters** (millions of writes per second); **Serverless** since July 2025; global clusters'],
        ['**Neptune**', '**graph** (Gremlin, openCypher, SPARQL)', 'relationships, hops, fraud rings, recommendations, knowledge graph', '**Neptune Analytics** (Nov 2023) for graph analytics and vector search; Neptune Serverless'],
        ['**Keyspaces**', 'wide-column, **Apache Cassandra-compatible** (CQL)', 'Cassandra, CQL', 'serverless; multi-Region replication active-active'],
        ['**Timestream for InfluxDB**', '**time series** (managed InfluxDB)', 'IoT, metrics, time windows', 'GA March 2024; the original Timestream (LiveAnalytics) is closed to new customers'],
        ['**OpenSearch Service**', '**search** and log analytics', 'full-text search, relevance, log analytics, vector search', 'Serverless collections: search, time series, vector search; zero-ETL from DynamoDB'],
        ['**QLDB**', 'ledger', 'immutable, cryptographically verifiable', '**shut down 31 July 2025**']] } },
      { check: fromDrill('B28') },
      { check: fromDrill('B30') },
      { h: 'Database security touch points' },
      'Session 5 owns KMS and Secrets Manager. Three database-specific rules come up again and again:',
      { ul: [
        '**Encryption at rest is a creation-time choice** for RDS and Aurora (AES-256 with a KMS key; it covers storage, logs, backups, snapshots and replicas). You cannot switch it on later, switch it off, or create an encrypted replica of an unencrypted instance. To encrypt an existing database: **snapshot → copy the snapshot with encryption → restore → switch the application**. DynamoDB, by contrast, is always encrypted.',
        '**IAM database authentication** (RDS for MariaDB, MySQL and PostgreSQL, and Aurora): connect with a **15-minute token** generated from IAM credentials instead of a password; traffic must use TLS.',
        '**Secrets Manager** stores database credentials and **rotates** them automatically (managed rotation for RDS, Aurora, Redshift and DocumentDB). RDS Proxy can read them, so applications never see the password.'] },
      { widget: 'stepper', args: { title: 'Encrypting an unencrypted RDS database', line: 'rds', steps: [
        { title: 'Snapshot', text: 'Take a manual snapshot of the unencrypted DB instance (it is unencrypted too).' },
        { title: 'Copy with encryption', text: 'Copy the snapshot and choose **Enable encryption** with your customer managed KMS key. This is the only place encryption can be added.' },
        { title: 'Restore', text: 'Restore a new DB instance from the encrypted copy. Everything it writes — storage, logs, backups, replicas — is encrypted.' },
        { title: 'Switch', text: 'In a maintenance window, stop writes, repoint the application (or rename the instances so the endpoint name moves), then retire the old instance. Writes made after the snapshot must be caught up — for a short window DMS can replicate them.' }] } },
      { check: fromDrill('B27') },
      { drills: ['B27', 'B28', 'B29', 'B30'] }
    ] },

    /* ---------------------------------------------------------------- 12 */
    { id: 'ch12', title: 'Triggers, traps, cheat block and record', blocks: [
      'The whole session on one map: tap a line to see what it was built for, its triggers, its traps and your misses on it.',
      { map: true },
      { widget: 'triggerTable' },
      { link: '#traps', text: 'All 16 traps, each linked to the drills that test it →' },
      { pre: S.cheat, label: 'Cheat block · copy it by hand' },
      { h: 'Your record' },
      { log: true },
      'B1 and B2 are your baseline misses Q15 and Q57; B3 and B4 carry the prestige pattern (Aurora Global Database, Global Accelerator and DAX offered where they have no role). B9 and B13 put a cross-Region option among the answers again. Run the 30 scenarios once; your new misses appear in Progress.',
      { link: '#drill', text: 'Go to the drill (30 scenarios)', btn: true }
    ] }
  ];
})();
