/* Session 9 — Serverless, events, integration & analytics: meta, lines, the integration map, stub, method, cheat
   sheet, compare, traps, log.
   Colour rule: a service keeps its colour on every page. Session 9 adds no hue: every family is an ink line (4 px)
   told apart by dash pattern and station shape, and every line is labelled. None of these services has a line in
   Sessions 1–8, so no earlier dash is inherited.
   Facts: docs/session-09-serverless.md, "Facts verified 2026-11-10". */
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
  const big = (cx, cy, lines) => shape({ el: 'circle', a: { cx, cy, r: 12 } }, lines);
  const ring = (cx, cy, lines) => [shape({ el: 'circle', a: { cx, cy, r: 10 } }, lines), { el: 'circle', pick: lines, a: { cx, cy, r: 3.5 }, style: 'fill:var(--ink)' }];
  const square = (cx, cy, lines) => shape({ el: 'rect', a: { x: cx - 9, y: cy - 9, width: 18, height: 18 } }, lines);
  const sqdot = (cx, cy, lines) => [shape({ el: 'rect', a: { x: cx - 10, y: cy - 10, width: 20, height: 20 } }, lines), { el: 'circle', pick: lines, a: { cx, cy, r: 3.5 }, style: 'fill:var(--ink)' }];
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
  const ENTRY = ['sqs', 'sns', 'eb', 'stream', 'firehose', 'lambda'];

  Object.assign(S, {
    meta: { id: '09-serverless', n: 9, title: 'Serverless, Events & Analytics', brand: 'Serverless Transit Map', home: '../../', updated: '2026-11-10' },

    lines: [
      { id: 'sqs', name: 'SQS · DLQ', short: 'SQS', cls: 'ink', width: 4, alias: ['SQS', 'Amazon SQS', 'queue', 'standard queue', 'FIFO queue', 'visibility timeout', 'dead-letter queue', 'DLQ', 'redrive', 'maxReceiveCount', 'long polling', 'delay queue', 'message group ID', 'fair queues', 'Extended Client Library'],
        verb: 'buffers work for one consumer at a time',
        from: 'producer → queue (standard or FIFO) → consumers poll, process, delete · failed receives → dead-letter queue → redrive',
        built: 'A **fully managed message queue** that decouples a producer from the workers behind it. Messages wait (default **4 days**, up to **14 days**) until a consumer **polls**, processes and **deletes** them; while one consumer holds a message it is hidden for the **visibility timeout** (default **30 s**, up to **12 hours**). **Standard** queues give nearly unlimited throughput with at-least-once delivery and best-effort order. **FIFO** queues keep strict order per **message group** and deduplicate within **5 minutes**. After `maxReceiveCount` failed receives a message moves to a **dead-letter queue**. Messages up to **1 MiB**.',
        says: ['decouple the web tier from the processing tier', 'absorb traffic spikes without losing orders', 'workers process messages at their own pace', 'messages must be processed in order', 'exactly-once processing', 'poison message keeps failing', 'reduce empty receives / polling cost', 'scale workers on queue depth'],
        switch: [{ to: 'sns', when: 'every message must reach several independent subscribers (fan-out)' }, { to: 'stream', when: 'several consumers must read the same records, in order, and replay them later' }, { to: 'eb', when: 'events must be routed to different targets by their content' }],
        traps: ['A visibility timeout shorter than the processing time (duplicates).', 'Standard queues when order matters (FIFO with a message group ID).', 'One queue with several consumer types expecting each to get every message (SNS fan-out).', 'Short polling with many idle consumers (long polling, up to 20 s).'],
        update: 'Maximum message size is now **1 MiB** (Aug 2025, was 256 KiB), for standard and FIFO queues, and the Lambda SQS event source mapping accepts it too. Larger payloads still go through S3 with the **Extended Client Library** (up to 2 GB). **Fair queues**: a `MessageGroupId` on a standard queue now limits noisy-neighbour tenants with no consumer change.' },
      { id: 'sns', name: 'SNS', short: 'SNS', cls: 'ink', width: 4, dash: '2 7', alias: ['SNS', 'Amazon SNS', 'topic', 'subscription', 'fan-out', 'filter policy', 'SNS FIFO', 'push notification', 'email notification', 'SMS'],
        verb: 'pushes one message to every subscriber',
        from: 'publisher → topic → subscriptions (SQS, Lambda, Firehose, HTTP(S), email, SMS, mobile push), each with an optional filter policy',
        built: '**Pub/sub**: a publisher sends one message to a **topic** and SNS **pushes** a copy to every **subscription** — SQS queues, Lambda functions, Firehose streams, HTTP(S) endpoints, email, SMS and mobile push. A standard topic stores nothing for later: subscribers must be there. A **filter policy** on a subscription delivers only the messages it wants (up to 200 policies per topic). **SNS FIFO** topics keep order, deliver only to SQS queues and can keep an opt-in **archive** (up to 365 days) that subscriptions replay from. The classic pattern is **fan-out**: SNS → one SQS queue per consumer, so each consumer gets its own buffered copy.',
        says: ['notify several systems when an order is placed', 'fan out', 'send an email or SMS alert', 'push notifications to mobile devices', 'each subscriber receives only the messages it needs', 'decouple one producer from many consumers'],
        switch: [{ to: 'sqs', when: 'one worker pool must take each message once, at its own pace' }, { to: 'eb', when: 'routing is by event content across many targets, SaaS sources or AWS service events' }, { to: 'stream', when: 'consumers must replay the same records later' }],
        traps: ['SNS alone when a subscriber may be offline for hours (give it an SQS queue).', 'SNS FIFO to a Lambda function or an email address directly (queues only).', 'Expecting a standard SNS topic to keep messages for a consumer that subscribes later (only FIFO topics have an opt-in archive).'],
        update: 'Topics accept up to **1 MiB** when you set `MaximumMessageSize` (Sep 2026; default still 256 KiB). Above 256 KiB a topic may only have **SQS, Firehose and Lambda** subscriptions, and at most **100** of them.' },
      { id: 'eb', name: 'EventBridge · Pipes · Scheduler', short: 'EventBridge', cls: 'ink', width: 4, dash: '10 6', alias: ['EventBridge', 'Amazon EventBridge', 'CloudWatch Events', 'event bus', 'default event bus', 'custom event bus', 'partner event source', 'rule', 'event pattern', 'archive', 'replay', 'EventBridge Pipes', 'EventBridge Scheduler', 'schema registry', 'API destination'],
        verb: 'routes events by their content',
        from: 'AWS services / your apps / SaaS partners → event bus → rules (event pattern) → up to 5 targets each · Pipes: one source → filter → enrich → one target · Scheduler: time → any target',
        built: 'A **serverless event router**. Events land on a **bus**: the **default** bus receives AWS service events (an EC2 state change, an S3 object, a CodePipeline failure), **custom** buses take your own, **partner** buses take SaaS events. A **rule** matches events by **content** (an event pattern) and sends them to up to **5 targets**, retrying for up to 24 hours before a DLQ. **Pipes** connect one source (SQS, Kinesis, DynamoDB Streams, MSK, Amazon MQ) through an optional filter and enrichment to one target, with no code. **Scheduler** runs one-time or recurring schedules, each in its own time zone, against almost any AWS API.',
        says: ['react when an AWS service changes state', 'route events to different targets based on their content', 'integrate events from a SaaS application', 'run a task on a schedule (cron)', 'millions of one-time schedules in local time zones', 'connect a stream to a target with filtering and enrichment, no code', 'replay past events'],
        switch: [{ to: 'sns', when: 'simple fan-out to email, SMS, mobile push or many subscribers' }, { to: 'sqs', when: 'workers need a buffer to pull from at their own pace' }, { to: 'stream', when: 'high-volume ordered records with replay by many consumers' }],
        traps: ['More than 5 targets on one rule (fixed limit — add rules, or fan out through SNS).', 'A rule per customer schedule (300 rules per bus by default; use Scheduler).', 'A Lambda poller where Pipes connects source, filter and target with no code.', 'Polling CloudTrail for state changes the default bus already receives.'],
        update: 'Events up to **1 MB** (Jan 2026, was 256 KB; at launch a few Regions were excluded). A new **Custom Event Bus** routes to **subscribers** (one target each) with built-in retention (1–365 days), FIFO per event group, replay from a starting position, deduplication and AWS RAM sharing. Buses with rules are now labelled **Custom Event Bus - Classic** — the model the exam tests.' },
      { id: 'stream', name: 'Kinesis Data Streams · MSK', short: 'Streams', cls: 'ink', width: 4, dash: '1 9', alias: ['Kinesis', 'Kinesis Data Streams', 'KDS', 'shard', 'partition key', 'sequence number', 'enhanced fan-out', 'on-demand mode', 'provisioned mode', 'MSK', 'Amazon MSK', 'Apache Kafka', 'Kafka', 'MSK Serverless', 'MSK Connect', 'Amazon MQ', 'ActiveMQ', 'RabbitMQ'],
        verb: 'keeps an ordered, replayable record stream',
        from: 'producers (partition key) → shards (ordered, retained 24 h – 365 days) → many consumers (shared 2 MB/s per shard or enhanced fan-out 2 MB/s each) · MSK = managed Apache Kafka',
        built: 'A **data stream** of records kept for a **retention period** (24 hours up to **365 days**) so that **many consumers** can read the same records, **in order per partition key**, and **replay** them. Capacity comes in **shards**: each takes **1 MB/s or 1,000 records/s** of writes and serves **2 MB/s** of reads shared by its consumers — or **2 MB/s per consumer** with **enhanced fan-out**. **On-demand** mode scales shards for you; **provisioned** mode is shards you set. Records up to **10 MiB**. **Amazon MSK** is managed **Apache Kafka** — MSK Provisioned (Standard or Express brokers) or MSK Serverless — when the producers and consumers already speak Kafka.',
        says: ['real-time data streaming', 'clickstream / IoT telemetry at high volume', 'multiple applications consume the same data', 'replay the data', 'ordered per device / per key', 'sub-second processing', 'existing Apache Kafka applications'],
        switch: [{ to: 'firehose', when: 'the goal is only to land the stream in S3, Redshift or OpenSearch with no consumer code' }, { to: 'sqs', when: 'each message is a task for one worker and needs no replay' }, { to: 'lambda', when: 'a function should process each batch (Lambda event source mapping on the stream)' }],
        traps: ['Firehose when consumers must replay or read in real time (no storage, no consumers).', 'A hot partition key (one shard takes all the writes).', 'Enhanced fan-out to fix write throttling (it is a read feature; add shards).', 'Kinesis for a Kafka application that should keep its clients (MSK).'],
        update: 'Records can be up to **10 MiB** (older material: 1 MB). **On-demand** streams start at 4 MB/s write and scale to 10 GB/s in the largest Regions. Retention reaches **365 days**. MSK adds **Express brokers** (up to 3x throughput per broker) and **MSK Serverless**.' },
      { id: 'firehose', name: 'Amazon Data Firehose', short: 'Firehose', cls: 'ink', width: 4, dash: '24 8', alias: ['Firehose', 'Amazon Data Firehose', 'Kinesis Data Firehose', 'Kinesis Firehose', 'delivery stream', 'Firehose stream', 'buffer', 'record format conversion', 'dynamic partitioning'],
        verb: 'delivers a stream to storage, no code',
        from: 'producers / Kinesis Data Streams / MSK → Firehose (buffer, optional Lambda transform, Parquet/ORC conversion, dynamic partitioning) → S3 · Redshift · OpenSearch · Snowflake · Iceberg · Splunk · HTTP',
        built: 'The **fully managed delivery** service: it takes streaming records and **loads** them into a destination — **S3**, **Redshift**, **OpenSearch**, Snowflake, Apache Iceberg tables, Splunk and other partners, or any HTTP endpoint. It **buffers** by size (1–128 MB for S3) or time (0–900 s, zero buffering possible), can **transform** records with a Lambda function, **convert JSON to Parquet or ORC** with a Glue Data Catalog schema, **partition** by content, and compress. It scales by itself; there are no shards and no consumers. It is **delivery, not processing**: no replay, no multiple readers.',
        says: ['load streaming data into Amazon S3 / Redshift / OpenSearch', 'near real time', 'with the LEAST operational overhead', 'convert to Apache Parquet before storing', 'no code to manage', 'deliver logs to Splunk'],
        switch: [{ to: 'stream', when: 'custom consumers must read the records in real time or replay them' }, { to: 'lambda', when: 'every record needs custom processing with side effects (not just a transform before delivery)' }, { to: 'etl', when: 'the data is already at rest and needs batch transformation' }],
        misses: 'Baseline **Q1** (exam, tag C): clickstream into S3 for analysis — you picked a **Lambda** pipeline (code to write, scale and retry). The built-for answer is **Firehose**: it was made to buffer and deliver streaming data to S3 with no code.',
        traps: ['Lambda or EC2 consumers written to copy a stream into S3 (Firehose does it with no code).', 'Firehose where consumers must replay data (no retention).', 'Expecting sub-second delivery with large buffers (buffer size/interval decide latency).', 'Kinesis Data Analytics for SQL in a new design (deleted from 27 Jan 2026).'],
        update: 'Renamed **Amazon Data Firehose** (banks: Kinesis Data Firehose). **Zero buffering** since Dec 2023 (before: 60 s minimum). **Kinesis Data Analytics for SQL** took no new applications from 15 Oct 2025 and its applications were deleted from 27 Jan 2026 — real-time SQL/stream processing is now **Managed Service for Apache Flink**.' },
      { id: 'sfn', name: 'Step Functions', short: 'Step Functions', cls: 'ink', width: 4, dash: '6 4', alias: ['Step Functions', 'AWS Step Functions', 'state machine', 'workflow', 'Standard workflow', 'Express workflow', 'Map state', 'Distributed Map', 'Parallel state', 'Wait state', 'task token', 'waitForTaskToken', 'SWF', 'Simple Workflow Service'],
        verb: 'orchestrates steps with state and retries',
        from: 'trigger (API, EventBridge, SDK) → state machine: tasks (Lambda, AWS service integrations), Choice, Parallel, Map, Wait, callback tasks → result',
        built: '**Serverless workflow orchestration**. You draw a **state machine**: tasks that call Lambda or AWS services directly, choices, parallel branches, maps over items, waits, and **retries and catches** on every step. **Standard** workflows run up to **1 year**, exactly once, with a full history — priced per state transition. **Express** workflows run up to **5 minutes** at high volume, at-least-once (async) — priced by executions and duration. A **callback task** (`.waitForTaskToken`, Standard only) pauses until a human or an external system answers. **Distributed Map** runs up to 10,000 child workflows in parallel over S3 data.',
        says: ['coordinate multiple Lambda functions', 'a workflow with retries and error handling', 'a manual approval step', 'long-running process that can take days', 'visual workflow', 'process millions of S3 objects in parallel', 'high-volume, short-lived event processing'],
        switch: [{ to: 'sqs', when: 'one step hands work to the next with no orchestration or state (a queue between services)' }, { to: 'eb', when: 'services only react to each other’s events with no central flow' }, { to: 'lambda', when: 'the whole job is one short function' }],
        misses: 'Baseline **Q40** (exam, tag F): a coordinated workflow question with **Amazon SWF** in the options — a fact gap about what SWF is for. Today AWS recommends **Step Functions** for new applications; SWF remains for workflows that need external signals or parent/child processes and for existing deciders.',
        traps: ['Express workflows for a process that waits for a human (5-minute limit, no task token).', 'Standard workflows for 100,000 short events per second (priced per transition; Express).', 'Chaining Lambda functions by calling each other (no retries, no state, pays for waiting).', 'SWF for a new application with no SWF-specific need.'],
        update: '**Lambda durable functions** now offer a code-first alternative (checkpoint and suspend for up to a year, no compute charge while waiting). Step Functions stays the exam answer for visual, multi-service orchestration.' },
      { id: 'lambda', name: 'Lambda · API Gateway', short: 'Lambda', cls: 'ink', width: 4, dash: '12 8', alias: ['Lambda', 'AWS Lambda', 'function', 'event source mapping', 'destination', 'reserved concurrency', 'provisioned concurrency', 'SnapStart', 'cold start', 'API Gateway', 'REST API', 'HTTP API', 'WebSocket API', 'usage plan', 'API key', 'throttling', 'Lambda authorizer'],
        verb: 'runs code on every event',
        from: 'API Gateway (REST / HTTP / WebSocket) · S3, SNS, EventBridge (push, async) · SQS, Kinesis, DynamoDB Streams (event source mapping, polling) → function → destinations',
        built: '**Serverless compute**: code runs per event, scales with the requests, and you pay only while it runs. Limits that decide questions: **15 minutes**, **10,240 MB** memory, payload **6 MB** synchronous and **1 MB** asynchronous, **1,000** concurrent executions per Region by default. Three ways in: **synchronous** (API Gateway), **asynchronous** (S3, SNS, EventBridge — two retries, then a DLQ or an **on-failure destination**), and **event source mappings** that poll SQS, Kinesis or DynamoDB Streams. **API Gateway** puts HTTPS in front: **REST APIs** (API keys, usage plans, caching, WAF, private endpoints), cheaper **HTTP APIs**, and **WebSocket APIs**.',
        says: ['serverless', 'run code in response to an event', 'pay only when it runs', 'runs for less than 15 minutes', 'RESTful API with authentication and throttling', 'per-client API keys and usage limits', 'cold-start latency'],
        switch: [{ to: 'sfn', when: 'several steps, waits, retries or longer than 15 minutes' }, { to: 'firehose', when: 'the function would only copy a stream into storage' }, { to: 'etl', when: 'large batch transformation of data at rest (Glue)' }],
        traps: ['Lambda for a job that runs longer than 15 minutes.', 'SnapStart together with provisioned concurrency (not supported).', 'Raising Lambda concurrency to fix a database connection storm (RDS Proxy, Session 8).', 'HTTP API when API keys, usage plans, caching or AWS WAF are required (REST API).'],
        update: 'Async payloads are now **1 MB** (older material: 256 KB). **Durable functions** checkpoint and suspend for up to a year; **Managed Instances** run functions on EC2 capacity (Savings Plans apply; up to 90 minutes for async invocations and event source mappings other than Amazon MQ and DocumentDB). The REST API **29-second** integration timeout can now be **raised** for Regional and private APIs.' },
      { id: 'etl', name: 'Glue · EMR', short: 'Glue · EMR', cls: 'ink', width: 4, dash: '16 5 3 5', alias: ['Glue', 'AWS Glue', 'Glue ETL', 'Glue crawler', 'Data Catalog', 'Glue Data Catalog', 'job bookmark', 'DataBrew', 'EMR', 'Amazon EMR', 'Spark', 'Apache Spark', 'Hadoop', 'Hive', 'Presto', 'EMR Serverless', 'EMR on EKS', 'Data Pipeline', 'ETL'],
        verb: 'transforms data at rest',
        from: 'S3 / JDBC sources → Glue crawler (schema → Data Catalog) → Glue ETL job (serverless Spark, bookmarks) or EMR (Spark, Hadoop, Hive on clusters) → S3 / Redshift',
        built: '**Glue** is **serverless ETL**: crawlers infer schemas and fill the **Data Catalog** (the shared metastore Athena, EMR and Redshift Spectrum read), ETL jobs run Spark with nothing to provision, **job bookmarks** process only new data, **DataBrew** cleans data visually with no code. **EMR** runs the open-source big-data frameworks — **Spark, Hadoop, Hive, HBase, Presto** — on clusters you configure (EMR on EC2, on EKS, on Outposts) or on **EMR Serverless**. Glue for least operational overhead; EMR for full control, existing Hadoop/Spark code and the lowest cost at scale (Spot task nodes).',
        says: ['ETL with the LEAST operational overhead', 'serverless ETL', 'discover the schema / build a data catalog', 'process only new files since the last run', 'big data processing with Apache Spark or Hadoop', 'migrate an on-premises Hadoop cluster', 'full control over the cluster'],
        switch: [{ to: 'query', when: 'the need is SQL on the data where it is, not transformation' }, { to: 'firehose', when: 'the transformation is a format conversion while streaming data lands in S3' }, { to: 'lambda', when: 'small, event-driven transformations of single files' }],
        misses: 'Baseline **Q50** (exam, tag K): “ETL … **least operational overhead**” → **Glue** (serverless). Baseline **Q57** (exam, tag K): “**big data** processing + **SQL / BI**” → **EMR** to process, Redshift to query (Session 8 drill B2 trains the Redshift half).',
        traps: ['EMR when the stem says least operational overhead and nothing needs Hadoop (Glue).', 'Glue when the job needs HBase, custom cluster tuning or the existing Hadoop code unchanged (EMR).', 'Core nodes on Spot when jobs write HDFS (task nodes on Spot).', 'AWS Data Pipeline in a new design (closed to new customers).'],
        update: '**AWS Data Pipeline** has been closed to new customers since 25 Jul 2024 — AWS points to Glue, Step Functions or Amazon MWAA. EMR now also runs on EKS and as **EMR Serverless**.' },
      { id: 'query', name: 'Athena · Lake Formation · Quick Sight', short: 'Athena', cls: 'ink', width: 4, dash: '18 4', alias: ['Athena', 'Amazon Athena', 'federated query', 'workgroup', 'partition', 'Parquet', 'ORC', 'columnar', 'Lake Formation', 'AWS Lake Formation', 'LF-tags', 'data filter', 'column-level security', 'QuickSight', 'Quick Sight', 'AWS Quick', 'SPICE', 'dashboard'],
        verb: 'queries and governs the data lake',
        from: 'S3 data lake + Glue Data Catalog → Lake Formation permissions (database, table, column, row, cell) → Athena SQL (pay per TB scanned) → Quick Sight dashboards',
        built: '**Athena** is **serverless SQL on files in S3**: define tables in the Data Catalog and query; you pay **per TB scanned** ($5 in the pricing page’s example), so **partitions**, **columnar formats** (Parquet, ORC) and compression cut the bill. **Federated queries** reach other sources through Lambda connectors. **Lake Formation** governs the data lake: grants on databases, tables and **columns**, **row- and cell-level** data filters, **LF-tags**, cross-account sharing — enforced for Athena, EMR, Glue and Redshift Spectrum. **Quick Sight** (banks: Amazon QuickSight) is the BI layer: dashboards for many users, the **SPICE** in-memory engine, per-user pricing.',
        says: ['ad hoc SQL queries on data in Amazon S3', 'serverless, pay per query', 'without loading the data', 'reduce the cost of queries', 'restrict analysts to certain columns / rows', 'central governance of the data lake', 'interactive BI dashboards'],
        switch: [{ to: 'etl', when: 'the data must be transformed or catalogued first' }, { to: 'firehose', when: 'streaming data must land in S3 as Parquet first' }],
        traps: ['Redshift (a loaded warehouse) for occasional ad hoc queries on S3 (Athena).', 'Athena over raw CSV with no partitions (scans everything).', 'S3 bucket policies or IAM to hide columns (Lake Formation column permissions).', 'Lake Formation offered where nothing needs governance (prestige option).'],
        update: 'The BI service is now **AWS Quick Sight**, the business intelligence capability of **AWS Quick** (9 Nov 2026). Practice banks say “Amazon QuickSight” — same service, same answers.' }
    ],
    topics: { choose: 'Choosing the integration' },

    map: {
      title: 'The integration map', lead: 'Producers at the top; below them the four zones: decouple (queues, topics, buses), stream, compute and orchestrate, and the data lake with its analytics. Tap a line or a station.',
      viewBox: '0 0 1000 880', defaultLine: 'firehose',
      caption: 'Session 9 adds no colour: every family is an ink line told apart by dash and station shape — SQS solid with circles, SNS short dashes with triangles, EventBridge dashes with hexagons, Kinesis and MSK dots with diamonds, Firehose long dashes with pentagons, Step Functions short dashes with squares, Lambda and API Gateway dashes with rings, Glue and EMR dash-dot with dotted squares, Athena, Lake Formation and Quick Sight long dashes with big circles. Every line is labelled; colour is never the only cue.',
      items: [
        { el: 'rect', a: { x: 0, y: 0, width: 1000, height: 96 }, style: 'fill:var(--muted-fill)' },
        { el: 'rect', a: { x: 0, y: 104, width: 1000, height: 776 }, style: 'fill:var(--zone-aws)' },
        zoneLabel(18, 22, 'PRODUCERS'),
        zoneLabel(18, 124, 'AWS'),
        ...box(20, 140, 470, 190, 'DECOUPLE'),
        ...box(510, 140, 460, 190, 'STREAM', true),
        ...box(20, 350, 950, 210, 'COMPUTE · ORCHESTRATE'),
        ...box(20, 580, 950, 286, 'DATA LAKE · ANALYTICS'),

        /* ---- lines ---- */
        { el: 'line', line: 'lambda', paths: ['M990 61 V420 H200'], labels: [{ x: 700, y: 412, t: 'LAMBDA · API GATEWAY', size: 10.5, anchor: 'middle' }] },
        { el: 'line', line: 'sfn', paths: ['M200 510 H700', 'M620 420 V510'], labels: [{ x: 520, y: 502, t: 'STEP FUNCTIONS', size: 10.5, anchor: 'middle' }] },
        { el: 'line', line: 'firehose', paths: ['M860 61 V700', 'M560 250 H860'], labels: [{ x: 872, y: 214, t: 'FIREHOSE', size: 10.5 }] },
        { el: 'line', line: 'stream', paths: ['M560 61 V290'], labels: [{ x: 572, y: 168, t: 'KINESIS · MSK', size: 10.5 }] },
        { el: 'line', line: 'sqs', paths: ['M80 61 V290'], labels: [{ x: 92, y: 252, t: 'SQS', size: 10.5 }] },
        { el: 'line', line: 'sns', paths: ['M230 61 V290'], labels: [{ x: 242, y: 252, t: 'SNS', size: 10.5 }] },
        { el: 'line', line: 'eb', paths: ['M380 61 V290'], labels: [{ x: 392, y: 252, t: 'EVENTBRIDGE', size: 10.5 }] },
        { el: 'line', line: 'etl', paths: ['M860 700 H360 V800'], labels: [{ x: 770, y: 692, t: 'GLUE · EMR', size: 10.5, anchor: 'middle' }] },
        { el: 'line', line: 'query', paths: ['M680 700 V800 H160'], labels: [{ x: 450, y: 792, t: 'ATHENA · QUICK SIGHT', size: 10.5, anchor: 'middle' }] },

        /* ---- stations ---- */
        { el: 'rect', pick: ENTRY, a: { x: 40, y: 50, width: 958, height: 22, rx: 11 }, style: INK },
        sub(500, 90, 'apps · devices · SaaS partners · AWS services', ENTRY, 'middle'),
        /* decouple */
        circle(80, 200, ['sqs']), T(96, 204, 'SQS queue', ['sqs']), sub(96, 220, 'standard · FIFO', ['sqs']),
        circle(80, 290, ['sqs']), sub(96, 294, 'dead-letter queue', ['sqs']), sub(96, 309, 'redrive', ['sqs']),
        triangle(230, 200, ['sns']), T(246, 204, 'SNS topic', ['sns']), sub(246, 220, 'filter policies', ['sns']),
        triangle(230, 290, ['sns']), sub(246, 294, 'fan-out to', ['sns']), sub(246, 309, 'SQS queues', ['sns']),
        hexa(380, 200, ['eb']), T(396, 204, 'EventBridge', ['eb']), sub(396, 220, 'buses · rules', ['eb']),
        hexa(380, 290, ['eb']), sub(396, 294, 'Pipes', ['eb']), sub(396, 309, 'Scheduler', ['eb']),
        /* stream */
        diamond(560, 200, ['stream']), T(576, 204, 'Kinesis Data Streams', ['stream']), sub(576, 220, 'shards · replay', ['stream']),
        diamond(560, 290, ['stream']), sub(576, 294, 'MSK · Apache Kafka', ['stream']),
        penta(860, 250, ['firehose', 'stream']), T(844, 282, 'Firehose', ['firehose'], 'end'), sub(844, 298, 'buffer · deliver', ['firehose'], 'end'),
        /* compute and orchestrate */
        ...ring(920, 420, ['lambda']), T(920, 448, 'API Gateway', ['lambda'], 'middle'), sub(920, 464, 'REST · HTTP', ['lambda'], 'middle'), sub(920, 479, 'WebSocket', ['lambda'], 'middle'),
        ...ring(620, 420, ['lambda', 'sfn']), T(636, 448, 'Lambda', ['lambda']), sub(636, 464, 'sync · async', ['lambda']),
        ...ring(200, 420, ['lambda']), sub(200, 446, 'event source mappings', ['lambda'], 'middle'), sub(200, 461, 'poll SQS · Kinesis · DynamoDB', ['lambda'], 'middle'),
        square(200, 510, ['sfn']), T(184, 515, 'Step Functions', ['sfn'], 'end'), sub(200, 536, 'Standard · 1 year', ['sfn'], 'middle'),
        square(420, 510, ['sfn']), sub(420, 536, 'Express · 5 min', ['sfn'], 'middle'),
        square(700, 510, ['sfn']), sub(700, 536, 'Distributed Map', ['sfn'], 'middle'),
        /* data lake and analytics */
        penta(860, 700, ['firehose', 'etl']), T(876, 704, 'Amazon S3', ['firehose', 'etl']), sub(876, 720, 'data lake', ['firehose', 'etl']),
        ...sqdot(680, 700, ['etl', 'query']), T(680, 676, 'Glue', ['etl'], 'middle'), sub(692, 726, 'crawlers · Data Catalog', ['etl']),
        ...sqdot(480, 700, ['etl']), T(480, 676, 'EMR', ['etl'], 'middle'), sub(480, 726, 'Spark · Hadoop', ['etl'], 'middle'),
        big(680, 800, ['query']), sub(680, 828, 'Lake Formation', ['query'], 'middle'), sub(680, 843, 'column · row · cell', ['query'], 'middle'),
        big(540, 800, ['query']), T(540, 780, 'Athena', ['query'], 'middle'), sub(540, 828, 'SQL on S3', ['query'], 'middle'), sub(540, 843, 'pay per TB scanned', ['query'], 'middle'),
        big(360, 800, ['query', 'etl']), T(360, 780, 'Redshift', ['query', 'etl'], 'middle'), sub(360, 828, 'warehouse', ['query', 'etl'], 'middle'), sub(360, 843, '(Session 8)', ['query', 'etl'], 'middle'),
        big(160, 800, ['query']), T(160, 780, 'Quick Sight', ['query'], 'middle'), sub(160, 828, 'dashboards · SPICE', ['query'], 'middle'),
        ...LABELS
      ]
    },

    stub: [
      { id: 'pat', label: 'PATTERN', short: 'PAT', values: ['queue', 'fan-out', 'event routing', 'stream', 'workflow', 'ETL', 'ad hoc query'] },
      { id: 'del', label: 'DELIVERY', short: 'DEL', values: ['ordered', 'exactly once', 'replay', 'at least once', 'none stated'] },
      { id: 'lat', label: 'LATENCY', short: 'LAT', values: ['real time', 'near real time', 'batch'] },
      { id: 'sup', label: 'SUPERLATIVE', short: 'SUP', values: ['cheapest', 'least ops', 'fastest', 'none stated'] }
    ],

    method:
`1. Strip the story. Keep WHAT moves (messages, events, records, files)
   and HOW it moves (one consumer or many, in order or not, now or in batch,
   kept for replay or gone once read).
2. Fill the stub, the same 4 slots for this session:
   PATTERN (queue / fan-out / event routing / stream / workflow / ETL / query) ____
   DELIVERY (ordered / exactly once / replay / at least once / none) ____
   LATENCY (real time / near real time / batch) ____
   SUPERLATIVE (cheapest / least ops / fastest / none) ____
3. For EACH option ask: "what problem was this service BUILT for?"
   No match with the stub -> cross it out, however modern it sounds
   (Lambda to copy a stream into S3, Firehose for replay, SNS as a buffer,
   EMR for least ops, Express for a human step, Lake Formation for no reason).
4. Among the survivors, the one that satisfies the SUPERLATIVE wins
   (least ops: the managed or no-code feature; cheapest: pay per use, fewer bytes).`,

    cheat:
`INTEGRATION = PATTERN + DELIVERY + LATENCY + SUP
CHOOSE      one worker per task -> SQS · copies to many -> SNS (+ SQS per subscriber)
            route by content, AWS/SaaS events -> EventBridge · ordered + replay + many readers -> Kinesis
            land a stream in S3/Redshift/OpenSearch, no code -> Firehose · Kafka clients -> MSK
            JMS / ActiveMQ / RabbitMQ app -> Amazon MQ · steps + state + waits -> Step Functions
SQS         standard: ~unlimited, at least once, best-effort order · FIFO: order per group, dedup 5 min
            FIFO 300 TPS per action per partition (3,000 msg/s batched) · high-throughput far more
            visibility 30 s default (0 s - 12 h) > processing time · retention 4 d (60 s - 14 d)
            long polling up to 20 s · delay up to 15 min · DLQ after maxReceiveCount · 1 MiB
SNS         push · standard topic stores nothing · filter policies · 256 KiB (1 MiB opt-in)
            FIFO topic -> SQS only, opt-in archive (up to 365 d) + replay
EVENTBRIDGE default bus = AWS events · rule = pattern -> 5 targets · retry 24 h / 185 · 1 MB
            Pipes: source -> filter -> enrich -> target · Scheduler: at() / rate / cron, time zones
KINESIS     shard: 1 MB/s or 1,000 rec/s in, 2 MB/s out shared · enhanced fan-out 2 MB/s each
            order per partition key · retention 24 h - 365 d · on-demand or provisioned · 10 MiB
FIREHOSE    delivery, not processing · buffer 1-128 MB / 0-900 s · Lambda transform
            JSON -> Parquet/ORC (Glue schema) · no replay, no consumers · KDA SQL gone -> Flink
LAMBDA      15 min · 10,240 MB · 6 MB sync / 1 MB async · 1,000 concurrency default
            async: 2 retries, 6 h, DLQ or on-failure destination · SQS batch: ReportBatchItemFailures
            reserved = cap + guarantee (free) · provisioned = warm (paid) · SnapStart not with PC
API GW      REST: keys, usage plans, cache, WAF, private · HTTP: cheaper, JWT · 10,000 RPS account
STEP FN     Standard 1 year, exactly once, per transition · Express 5 min, per execution
            callback .waitForTaskToken = Standard · Distributed Map 10,000 parallel · SWF = legacy
GLUE / EMR  least ops ETL -> Glue (crawler, Data Catalog, bookmarks) · Hadoop/Spark control -> EMR
            EMR Spot = task nodes; core On-Demand (HDFS) · Data Pipeline closed to new customers
ATHENA      SQL on S3, $5/TB scanned, 10 MB min · Parquet + partitions + compression = less scanned
            Lake Formation = column/row/cell grants, LF-tags · Quick Sight = BI dashboards, SPICE
NEVER: Lambda to copy a stream to S3 · Firehose for replay · SNS as a buffer · one queue for
       many consumer types · Express for a human step · EMR for least ops · bucket policy for columns`,

    compare: [
      { id: 'sqs-sns', short: 'SQS · SNS', title: 'SQS vs SNS — queue or topic?',
        sides: [{ name: 'Amazon SQS', line: 'sqs', fig: { dir: 'one', left: 'APP', right: 'WORKER', keep: true }, gist: 'A **queue**: messages wait until **one** consumer polls, processes and deletes them. Buffers spikes; workers set the pace.' }, { name: 'Amazon SNS', line: 'sns', fig: { dir: 'one', left: 'PUB', right: 'SUBS' }, gist: 'A **topic**: each message is **pushed** at once to **every** subscriber. A standard topic keeps nothing for a subscriber that is not there.' }],
        rows: [['Model', 'pull: consumers poll', 'push: SNS delivers'], ['Who gets a message', 'one consumer (competing workers)', 'every subscription (filter policies narrow it)'], ['Storage', 'up to 14 days', 'standard topic: none — delivered or retried, then dropped or sent to a DLQ; FIFO topic: opt-in archive for replay'], ['Deciding words', 'decouple, buffer, absorb spikes, workers at their own pace', 'notify, fan out, email/SMS/push, many systems react'], ['Together', 'SNS → one SQS queue per consumer = fan-out with buffering', ''], ['Tempting wrong', 'when three services must each receive every order', 'when a worker may be offline for hours']],
        check: { q: '“Three independent services must each receive every new order, and each must be able to fall behind for hours without losing any.”', opts: ['Amazon SQS', 'Amazon SNS'], a: 1, why: 'Every service gets every message = SNS fan-out; give each service its own SQS queue so it can fall behind safely.' } },
      { id: 'std-fifo', short: 'Standard · FIFO', title: 'SQS standard vs FIFO queues',
        sides: [{ name: 'Standard queue', line: 'sqs', fig: { dir: 'one', left: 'IN', right: 'ANY' }, gist: '**Nearly unlimited** throughput; **at-least-once** delivery; best-effort ordering. Consumers must tolerate duplicates.' }, { name: 'FIFO queue', line: 'sqs', fig: { dir: 'one', left: 'IN', right: 'ORDERED', keep: true }, gist: '**Strict order per message group**, **exactly-once processing** (deduplication within 5 minutes). Throughput per API action is limited.' }],
        rows: [['Order', 'best effort', 'strict, per MessageGroupId'], ['Duplicates', 'possible', 'removed within the 5-minute deduplication interval'], ['Throughput', 'nearly unlimited', '300 TPS per action per partition (3,000 msg/s batched); high-throughput mode up to 70,000 TPS in the largest Regions'], ['Name', 'any', 'ends in .fifo'], ['Deciding words', 'high volume, order does not matter, idempotent workers', 'in order, exactly once, no duplicates, per customer / per account'], ['Tempting wrong', 'when payments must apply in order', 'for an unordered 100,000-message-per-second flood of tasks']],
        check: { q: '“Account balance updates must be applied in the order they were sent for each account, with no duplicates.”', opts: ['Standard queue', 'FIFO queue'], a: 1, why: 'Order per account + no duplicates = FIFO with MessageGroupId = account ID.' } },
      { id: 'sns-eb', short: 'SNS · EventBridge', title: 'SNS vs EventBridge — fan-out or routing?',
        sides: [{ name: 'Amazon SNS', line: 'sns', fig: { dir: 'one', left: 'TOPIC', right: 'SUBS' }, gist: '**Fan-out** at high throughput to queues, functions, HTTP, **email, SMS, mobile push**. Filter policies on message attributes or body.' }, { name: 'Amazon EventBridge', line: 'eb', fig: { dir: 'one', left: 'BUS', right: 'RULES', keep: true }, gist: '**Event routing** by content from **AWS services**, your apps and **SaaS partners**; rules with up to 5 targets; archive and replay; Pipes and Scheduler.' }],
        rows: [['Sources', 'your publishers', 'AWS service events (default bus), custom apps, SaaS partners'], ['Routing', 'filter policy per subscription', 'event pattern per rule, up to 5 targets per rule'], ['People endpoints', 'email, SMS, mobile push', 'none directly (route to SNS)'], ['Extras', 'FIFO topics, with an opt-in archive and replay', 'archive and replay, schema registry, Pipes, Scheduler, API destinations'], ['Deciding words', 'notify, fan out, SMS/email/push', 'react to an AWS service event, SaaS events, route by content, schedule'], ['Tempting wrong', 'for Zendesk or Datadog events', 'for SMS alerts to 10,000 phones']],
        check: { q: '“Run a cleanup function whenever any EC2 instance in the account changes to the stopped state.”', opts: ['Amazon SNS', 'Amazon EventBridge'], a: 1, why: 'AWS service state changes arrive on the EventBridge default bus; a rule matches them and invokes the function.' } },
      { id: 'kds-firehose', short: 'Kinesis · Firehose', title: 'Kinesis Data Streams vs Amazon Data Firehose',
        sides: [{ name: 'Kinesis Data Streams', line: 'stream', fig: { dir: 'one', left: 'APPS', right: 'READERS' }, gist: 'A **stream you consume**: shards, records kept 24 h–365 days, **many consumers**, **replay**, real time. You write the consumers.' }, { name: 'Amazon Data Firehose', line: 'firehose', fig: { dir: 'one', left: 'STREAM', right: 'S3', keep: true }, gist: '**Delivery with no code**: buffers, optionally transforms or converts to Parquet, and loads into S3, Redshift, OpenSearch, Splunk, HTTP.' }],
        rows: [['Capacity', 'shards (provisioned) or on-demand', 'scales by itself'], ['Consumers', 'your apps, Lambda, Flink, Firehose', 'none — it is the consumer'], ['Replay', 'yes, within retention', 'no'], ['Latency', 'real time (enhanced fan-out about 70 ms)', 'near real time: buffer 0–900 s'], ['Deciding words', 'real time, multiple consumers, replay, custom processing', 'load into S3, Redshift or OpenSearch, least operational overhead, convert to Parquet'], ['Tempting wrong', 'when the only goal is to land the data in S3', 'when consumers must re-read last week’s records']],
        check: { q: '“Clickstream records must land in Amazon S3 within a few minutes with the LEAST operational overhead; nobody reads them in real time.”', opts: ['Kinesis Data Streams', 'Amazon Data Firehose'], a: 1, why: 'Deliver to S3, near real time, no code: Firehose. Your Q1.' } },
      { id: 'kds-sqs', short: 'Kinesis · SQS', title: 'Kinesis Data Streams vs SQS — stream or queue?',
        sides: [{ name: 'Kinesis Data Streams', line: 'stream', fig: { dir: 'one', left: 'RECORDS', right: 'READERS', keep: true }, gist: 'Records stay for the **retention period**; **every** consumer reads all of them, in order per partition key, and can **replay**.' }, { name: 'Amazon SQS', line: 'sqs', fig: { dir: 'one', left: 'TASKS', right: 'WORKER' }, gist: 'Each message is a **task** for one worker; **deleted** once processed. Scales workers on queue depth.' }],
        rows: [['After reading', 'record stays until retention ends', 'message deleted by the consumer'], ['Readers', 'many applications, each sees every record', 'competing workers, each message to one'], ['Order', 'per shard (partition key)', 'FIFO queues only (per message group)'], ['Scaling unit', 'shards (or on-demand)', 'none — scale the workers'], ['Deciding words', 'real-time analytics, multiple consumers, replay, ordered per device', 'decouple, background jobs, buffer, each task once'], ['Tempting wrong', 'for independent background jobs', 'when two applications both need every event and a replay']],
        check: { q: '“A fraud model and a dashboard must both read every card transaction in order per card, and the model must be able to re-read the last 3 days.”', opts: ['Kinesis Data Streams', 'Amazon SQS'], a: 0, why: 'Two readers of every record + order per key + replay = a stream with retention.' } },
      { id: 'sfn-types', short: 'Standard · Express', title: 'Step Functions Standard vs Express workflows',
        sides: [{ name: 'Standard workflow', line: 'sfn', fig: { dir: 'one', left: 'START', right: '1 YEAR', keep: true }, gist: 'Up to **1 year**, **exactly-once**, full execution history; callbacks (`.waitForTaskToken`), `.sync` jobs, Distributed Map. Priced **per state transition**.' }, { name: 'Express workflow', line: 'sfn', fig: { dir: 'one', left: 'START', right: '5 MIN' }, gist: 'Up to **5 minutes**, built for **high-volume** event processing; at-least-once (async) or at-most-once (sync). Priced by **executions, duration and memory**.' }],
        rows: [['Duration', 'up to 1 year', 'up to 5 minutes'], ['Semantics', 'exactly once', 'async at least once · sync at most once'], ['Waits for people', 'yes (task token)', 'no'], ['Distributed Map', 'yes', 'no'], ['Deciding words', 'long-running, human approval, auditable, non-idempotent steps', 'IoT / streaming events, thousands per second, short, idempotent'], ['Tempting wrong', 'for 50,000 short events per second', 'for an order that waits days for approval']],
        check: { q: '“An expense workflow waits up to 10 days for a manager’s approval before paying.”', opts: ['Standard workflow', 'Express workflow'], a: 0, why: 'Days of waiting and a human callback: Standard. Express stops at 5 minutes and has no task token.' } },
      { id: 'glue-emr', short: 'Glue · EMR', title: 'AWS Glue vs Amazon EMR',
        sides: [{ name: 'AWS Glue', line: 'etl', fig: { dir: 'one', left: 'S3', right: 'ETL', keep: true }, gist: '**Serverless ETL**: crawlers, Data Catalog, Spark jobs with nothing to provision, job bookmarks, DataBrew. Least operational overhead.' }, { name: 'Amazon EMR', line: 'etl', fig: { dir: 'one', left: 'CLUSTER', right: 'SPARK' }, gist: '**Big data frameworks** — Spark, Hadoop, Hive, HBase, Presto — on clusters you configure (EC2, EKS, Outposts) or EMR Serverless.' }],
        rows: [['You manage', 'the job', 'the cluster (instance types, nodes, configuration), unless EMR Serverless'], ['Frameworks', 'Spark jobs', 'the Hadoop ecosystem: Spark, Hive, HBase, Presto …'], ['Cost levers', 'pay per job run; Flex for jobs that can wait', 'Spot task nodes, right-sized clusters, terminate when done'], ['Deciding words', 'least operational overhead, serverless ETL, catalog, only new data', 'existing Hadoop/Spark jobs, full control, big data processing, custom frameworks'], ['Tempting wrong', 'when HBase or tuned cluster settings are required', 'when the stem says least ops and nothing needs a cluster (your Q50)']],
        check: { q: '“Convert daily CSV drops in S3 to Parquet and register them for Athena, with the LEAST operational overhead.”', opts: ['AWS Glue', 'Amazon EMR'], a: 0, why: 'Serverless ETL + catalog + least ops = Glue. Your Q50.' } },
      { id: 'athena-redshift', short: 'Athena · Redshift', title: 'Athena vs Redshift — query in place or load a warehouse?',
        sides: [{ name: 'Amazon Athena', line: 'query', fig: { dir: 'one', left: 'SQL', right: 'S3', keep: true }, gist: '**Serverless SQL on S3**, nothing loaded, pay per TB scanned. Ad hoc and occasional queries.' }, { name: 'Amazon Redshift', line: null, fig: { dir: 'one', left: 'LOAD', right: 'DW' }, gist: 'A **warehouse**: loaded, columnar, MPP; fast repeated BI over TB–PB (Session 8). Spectrum also reads S3.' }],
        rows: [['Data lives', 'S3 (Data Catalog tables)', 'Redshift managed storage (+ Spectrum on S3)'], ['Pay for', 'data scanned per query ($5 per TB in the pricing example)', 'Serverless RPU time or provisioned nodes'], ['Best for', 'ad hoc, occasional, exploratory queries; logs', 'heavy, concurrent dashboards; complex joins at scale'], ['Deciding words', 'query S3 directly, serverless, pay per query, no loading', 'data warehouse, BI dashboards, consistently fast, many analysts'], ['Tempting wrong', 'for 300 analysts on dashboards all day', 'for a few queries a month on S3 logs']],
        check: { q: '“Security engineers query a year of CloudTrail logs in S3 a few times a month and want to pay nothing in between.”', opts: ['Amazon Athena', 'Amazon Redshift'], a: 0, why: 'Occasional SQL on S3 with no idle cost = Athena.' } }
    ],

    traps: [
      { title: 'Lambda to copy a stream into S3', x: 'Your baseline Q1. Code to write, scale and retry for a job Firehose does with no code: buffer, convert, deliver to S3.', drills: ['E1', 'E18'] },
      { title: 'Firehose when consumers must replay', x: 'Firehose stores nothing for readers and has no consumers. Replay and many readers = Kinesis Data Streams (or MSK).', drills: ['E15'] },
      { title: 'Visibility timeout shorter than the processing time', x: 'The message reappears while the first worker is still busy: duplicates, then a trip to the DLQ. Set it above the processing time, or extend it from the worker.', drills: ['E7'] },
      { title: 'One queue for several kinds of consumer', x: 'Competing consumers split the messages; nobody sees all of them. Every consumer needs every message = SNS (or EventBridge) → one queue each.', drills: ['E9'] },
      { title: 'Standard queue when order matters', x: 'Standard queues are best-effort ordered and at least once. Order per key + no duplicates = FIFO with MessageGroupId.', drills: ['E8'] },
      { title: 'SNS as a buffer', x: 'A standard SNS topic pushes and retries but stores nothing for a subscriber that falls behind for hours. Put an SQS queue behind the topic.', drills: ['E5', 'E9'] },
      { title: 'A rule per schedule', x: 'Classic buses allow 300 rules per bus by default (adjustable). Thousands of one-time or per-tenant schedules in local time zones = EventBridge Scheduler.', drills: ['E13'] },
      { title: 'More than 5 targets on one rule', x: 'Targets per rule are fixed at 5. Add rules, or send the rule to an SNS topic that fans out.', drills: ['E11'] },
      { title: 'Enhanced fan-out for write throttling', x: 'Enhanced fan-out gives each consumer its own 2 MB/s per shard of reads. Write throttling needs more shards (1 MB/s or 1,000 records/s each) or on-demand mode — and a key that spreads.', drills: ['E16', 'E17'] },
      { title: 'Express workflows for a human step', x: 'Express stops at 5 minutes and has no task token. Waiting for people or for days = Standard with .waitForTaskToken.', drills: ['E4', 'E13'] },
      { title: 'SWF or Data Pipeline in a new design', x: 'Your baseline Q40. SWF still exists, but AWS recommends Step Functions for new applications. Data Pipeline is closed to new customers (Glue, Step Functions, MWAA).', drills: ['E4', 'E2'] },
      { title: 'EMR when the stem says least operational overhead', x: 'Your baseline Q50. Clusters are yours to size and patch. Serverless ETL with a catalog = Glue; EMR when Hadoop frameworks or full control are stated.', drills: ['E2', 'E30'] },
      { title: 'Spot core nodes with HDFS', x: 'A Spot interruption on a core node can lose HDFS data. Core and primary On-Demand; task nodes on Spot.', drills: ['E3'] },
      { title: 'Athena over raw CSV', x: 'Athena bills every byte it scans. Parquet or ORC + partitions + compression scan a fraction (30–90% savings).', drills: ['E28'] },
      { title: 'Bucket policies to hide columns', x: 'S3 and IAM see objects, not columns. Column-, row- and cell-level access for Athena and EMR = Lake Formation.', drills: ['E29'] },
      { title: 'Lake Formation or Global Accelerator with no role', x: 'Prestige distractor. A governance or network service in an option is only right when the scenario states the need it was built for.', drills: ['E5', 'E6'] }
    ],

    log: [
      { when: '2 Sept 2026', what: 'Baseline practice exam, integration and analytics items', result: 'Q1 Firehose vs Lambda missed (C); Q40 SWF missed (F); Q50 “least ops” → Glue missed (K); Q57 big data + SQL/BI missed (K: EMR + Redshift)', lesson: 'Q1: stream into S3 with no code = Firehose. Q40: workflows = Step Functions today; know what SWF is for. Q50: least ops ETL = Glue. Q57: big data = EMR, SQL/BI = Redshift. Trained in drills E1–E4.' },
      { when: '—', what: 'Session 9 quiz', result: 'not taken yet', lesson: 'Run all 30 scenarios once. Misses are tagged in “Where it broke” and show up in Progress.' }
    ]
  });
})();
