/* Session 9 — the lesson. 12 chapters. Facts: docs/session-09-serverless.md (verified 2026-11-10 via AWS MCP). */
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
      root: { q: 'What has to happen to the data?', opts: [
        { label: 'A task must be done once, by one worker', sub: 'orders to process, images to resize, jobs to run', next: 'q' },
        { label: 'Many receivers must each get a copy', sub: 'notify several systems, people or devices', next: 'fan' },
        { label: 'React to events, routed by their content', sub: 'AWS service events, SaaS events, your own events, schedules', next: 'route' },
        { label: 'A continuous stream of records', sub: 'clickstream, telemetry, logs, transactions', next: 'strm' },
        { label: 'Several steps with state, retries or waits', sub: 'an order process, an approval, a pipeline of functions', next: 'wf' }] },
      q: { q: 'Which constraint decides it?', opts: [
        { label: 'Highest throughput; order does not matter; workers tolerate a duplicate', next: 'std' },
        { label: 'Strict order per customer or account, no duplicates', next: 'fifo' },
        { label: 'The application already speaks JMS, ActiveMQ or RabbitMQ', next: 'mq' }] },
      fan: { q: 'Can every subscriber keep up all the time?', opts: [
        { label: 'Yes — or the subscribers are people (email, SMS, push)', next: 'sns' },
        { label: 'No — a subscriber may fall behind or be offline for hours', next: 'snssqs' }] },
      route: { q: 'What triggers the work?', opts: [
        { label: 'An event that matches a pattern', sub: 'an EC2 state change, a SaaS ticket, an order event', next: 'eb' },
        { label: 'Records from one source to one target, filtered and enriched', sub: 'SQS, Kinesis, DynamoDB Streams, MSK, Amazon MQ', next: 'pipes' },
        { label: 'A time: once, or on a schedule', next: 'sched' }] },
      strm: { q: 'Who reads the stream?', opts: [
        { label: 'Several applications, in real time, with replay', next: 'kds' },
        { label: 'Nobody — it only has to land in S3, Redshift or OpenSearch', next: 'fh' },
        { label: 'Existing Apache Kafka producers and consumers', next: 'msk' }] },
      wf: { q: 'How long and how many?', opts: [
        { label: 'Minutes to months; a person or an external system answers; every step exactly once', next: 'sfnstd' },
        { label: 'Thousands of short runs per second, each under 5 minutes', next: 'sfnexp' }] }
    },
    results: {
      std: { title: 'SQS standard queue', line: 'sqs', text: 'Nearly unlimited throughput, at-least-once delivery, best-effort order. Workers poll, process and delete; scale them on queue depth.', whyNot: [['SNS', 'pushes; a standard topic stores nothing'], ['Kinesis', 'shards and replay you do not need']] },
      fifo: { title: 'SQS FIFO queue', line: 'sqs', text: 'Strict order per **message group** (customer ID, account ID) and deduplication within 5 minutes. 300 TPS per API action per partition, 3,000 messages per second with batching; high-throughput mode for more.', whyNot: [['Standard queue', 'best-effort order, duplicates possible']] },
      mq: { title: 'Amazon MQ', line: 'stream', text: 'Managed **ActiveMQ** or **RabbitMQ**: move an existing broker and keep JMS and the standard protocols, with minimal code change.', whyNot: [['SQS', 'a rewrite to the SQS API']] },
      sns: { title: 'Amazon SNS', line: 'sns', text: 'One publish, a push to every subscription: queues, functions, Firehose, HTTP(S), email, SMS, mobile push. Filter policies narrow what each one receives.', whyNot: [['SQS', 'one consumer per message']] },
      snssqs: { title: 'SNS fan-out to SQS queues', line: 'sns', text: 'Subscribe one **SQS queue per consumer** to the topic. Each consumer gets its own buffered copy and works at its own pace; a slow one never blocks the others.', whyNot: [['One shared queue', 'consumers would split the messages']] },
      eb: { title: 'EventBridge rule', line: 'eb', text: 'Default bus for AWS service events, custom buses for yours, partner buses for SaaS. A rule matches by content and sends to up to 5 targets, retrying for up to 24 hours.', whyNot: [['SNS', 'no AWS service or SaaS event sources, filters per subscription only']] },
      pipes: { title: 'EventBridge Pipes', line: 'eb', text: 'Source → optional filter → optional enrichment (Lambda, Step Functions, API Gateway, API destination) → one target. No polling code; you pay only for events that pass the filter.', whyNot: [['A Lambda poller', 'code to write and run']] },
      sched: { title: 'EventBridge Scheduler', line: 'eb', text: 'One-time `at()` schedules and recurring `rate()` / cron schedules, each with its own time zone and an optional flexible window, invoking almost any AWS API.', whyNot: [['A rule per schedule', '300 rules per bus by default']] },
      kds: { title: 'Kinesis Data Streams', line: 'stream', text: 'Shards keep records for 24 hours up to 365 days; every consumer reads them in order per partition key and can replay. Enhanced fan-out gives each consumer its own 2 MB/s per shard.', whyNot: [['Firehose', 'no consumers, no replay'], ['SQS', 'a message goes to one worker and is deleted']] },
      fh: { title: 'Amazon Data Firehose', line: 'firehose', text: 'Buffers, optionally transforms or converts to Parquet/ORC, and delivers to S3, Redshift, OpenSearch, Splunk, Snowflake or HTTP — no code, no shards.', whyNot: [['Lambda or EC2 consumers', 'code you write and run (your Q1)']] },
      msk: { title: 'Amazon MSK', line: 'stream', text: 'Managed Apache Kafka: MSK Provisioned (Standard or Express brokers) or MSK Serverless. Clients keep the Kafka APIs; MSK Connect runs connectors.', whyNot: [['Kinesis', 'a rewrite off the Kafka APIs']] },
      sfnstd: { title: 'Step Functions Standard workflow', line: 'sfn', text: 'Up to 1 year, exactly once, full history. A **callback task** waits for a person or a system with a task token.', whyNot: [['Express', '5 minutes, no task token'], ['SWF', 'still available, but AWS recommends Step Functions for new applications']] },
      sfnexp: { title: 'Step Functions Express workflow', line: 'sfn', text: 'Up to 5 minutes, built for high-volume event processing, priced by executions, duration and memory.', whyNot: [['Standard', 'priced per state transition — expensive at this volume']] }
    }
  };

  S.learn = [
    /* ---------------------------------------------------------------- 1 */
    { id: 'ch1', title: 'How to read an integration question', domains: 'D2 D3 D4', blocks: [
      'This cluster spreads over **D2 (Resilient)**, **D3 (High-performing)** and **D4 (Cost-optimized)**. The questions look alike: something produces messages, events, records or files; something else must receive, process, store or query them; and four options name real AWS services that all move data. The wrong options are good services built for a **different shape of movement** — one consumer instead of many, no replay instead of replay, code instead of no code.',
      { h: 'Your record on this cluster' },
      { table: { head: ['Where', 'What happened', 'What it teaches', 'Tag'], rows: [
        ['baseline **Q1**', 'clickstream into S3 — you built it with **Lambda**', 'stream → storage with no code = **Firehose**', '**C** confused similar'],
        ['baseline **Q40**', '**SWF** in the options — you did not know what it is for', 'workflows = **Step Functions** today; SWF is the legacy service', '**F** fact'],
        ['baseline **Q50**', '“**least operational overhead**” ETL — missed the keyword', 'serverless ETL = **Glue**', '**K** keyword'],
        ['baseline **Q57**', '“**big data**” + “**SQL / BI**” — missed the keywords', 'process with **EMR**, query with Redshift (Session 8)', '**K** keyword'],
        ['baseline, six times', 'prestige distractors (a service with no role)', 'here: Global Accelerator, Transit Gateway, Lake Formation where nothing is governed', '**C** confused similar']] } },
      { callout: 'Drills **E1–E6** and five cards come from these misses and are marked as yours. E1 is Q1 rebuilt; E2 is Q50; E3 is the EMR half of Q57; E4 is the Q40 workflow; E5 and E6 put prestige options next to a queue and a query problem.', kind: 'miss', title: 'Your misses' },
      { h: 'Ask first: what moves, and how?' },
      'Four questions sort the options before you read them properly:',
      { ol: [
        '**What is the pattern?** A task for one worker (queue), one message for many receivers (fan-out), events routed by content (event routing), an ordered record stream read by several consumers (stream), several steps with state (workflow), transformation of data at rest (ETL), or SQL over files (query).',
        '**What does delivery need?** Strict **order**, **exactly once**, **replay** of past data — or just at least once. Each of these rules out a family.',
        '**How fast?** Real time (milliseconds to a second), near real time (seconds to minutes of buffering), or batch (hourly, nightly).',
        '**What is optimised?** Least operational overhead favours the managed, serverless or no-code feature; most cost-effective favours paying per use and touching fewer bytes.'] },
      { h: 'The stub for this session' },
      'Session 8’s slots (data model, load, latency) do not separate integration services. This session uses four new ones:',
      { table: { head: ['Slot', 'Ask', 'Values', 'What it kills'], rows: [
        ['PATTERN', 'What shape is the movement?', '`queue` · `fan-out` · `event routing` · `stream` · `workflow` · `ETL` · `ad hoc query`', 'SQS for fan-out; SNS as a buffer; Lambda chains as workflows'],
        ['DELIVERY', 'What must delivery guarantee?', '`ordered` · `exactly once` · `replay` · `at least once` · `none stated`', 'standard SQS for order; Firehose and SQS for replay; Express for exactly once'],
        ['LATENCY', 'How fast must it arrive?', '`real time` · `near real time` · `batch`', 'Glue for sub-second; Kinesis consumers for a nightly job'],
        ['SUPERLATIVE', 'What is optimised?', '`cheapest` · `least ops` · `fastest` · `none stated`', 'custom code where a managed feature exists; scans of raw CSV']] } },
      { pre: S.method, label: 'The method' },
      { h: 'Built for — one line each' },
      { hooks: [
        ['SQS', '**queue**: one consumer per message, at its own pace.'],
        ['SNS', '**push** one message to every subscriber.'],
        ['EventBridge', '**route events** by content; Pipes and Scheduler.'],
        ['Kinesis Data Streams', '**ordered, replayable** stream for many consumers.'],
        ['MSK', 'managed **Apache Kafka**.'],
        ['Amazon MQ', 'managed **ActiveMQ / RabbitMQ** for existing brokers.'],
        ['Firehose', '**deliver** a stream to S3, Redshift, OpenSearch — no code.'],
        ['Lambda', '**run code** per event, up to 15 minutes.'],
        ['API Gateway', '**HTTPS front door**: REST, HTTP, WebSocket.'],
        ['Step Functions', '**orchestrate** steps with state, retries and waits.'],
        ['Glue', '**serverless ETL** and the Data Catalog.'],
        ['EMR', '**big data frameworks** (Spark, Hadoop) on clusters.'],
        ['Athena', '**SQL on S3**, pay per TB scanned.'],
        ['Lake Formation', '**govern** the data lake down to column and row.'],
        ['Quick Sight', '**BI dashboards** (banks: QuickSight).']], label: 'Built for' },
      { h: 'Try it on E1' },
      'Your Q1, rebuilt. Fill the stub first: what moves, who reads it, and how soon must it land?',
      { callout: S.drills.find(d => d.id === 'E1').q + ' [[#drill/E1|Solve it in the drill →]]', kind: 'note', title: 'Exam Q1' },
      { check: { id: 'ch1-pattern', src: 'Exam Q1', q: 'Clickstream events must be **stored in Amazon S3 within a few minutes** for later analysis. Nobody reads them in real time. Which PATTERN and LATENCY go in the stub?', opts: [
        { t: '`queue` with `real time` — each click is a task that one worker must handle right away.', why: 'no worker handles a click; the data only has to land in storage.' },
        { t: '`stream` with `near real time` — records arrive continuously and may wait minutes.', why: 'continuous records, and minutes of delay are allowed: delivery, not processing.' },
        { t: '`ETL` with `batch` — the data is transformed once a night after it has landed.', why: 'nothing in the stem asks for a nightly transformation.' }], a: 1,
        why: 'Stream + near real time + “store in S3” is the shape Firehose was built for. Your Q1 pick wrote that delivery in Lambda.' } },
      { check: { id: 'ch1-prestige', src: 'Exam pattern', q: 'A web tier and a worker tier in **one VPC** must be decoupled so orders survive traffic spikes. An option adds **AWS Global Accelerator** in front of the workers. Why cross it out?', opts: [
        { t: 'It cannot route traffic inside one VPC, because it accepts only public Elastic IP addresses as endpoints.', why: 'false — it also takes load balancers and instances as endpoints.' },
        { t: 'It works only with Network Load Balancers, so it needs a second load balancer in front of the workers.', why: 'false — ALBs, NLBs, EC2 instances and Elastic IPs are all endpoints.' },
        { t: 'It speeds up network paths for global users; it holds no messages, so spikes still overload the workers.', why: 'built for global traffic to endpoints, not for buffering work.' }], a: 2,
        why: 'Prestige distractors are real services built for another problem. Decoupling needs a buffer (SQS); keep an option only when the scenario states its built-for reason.' } }
    ] },

    /* ---------------------------------------------------------------- 2 */
    { id: 'ch2', title: 'Choosing: queue, topic, bus or stream', domains: 'D2 D3', blocks: [
      'Four services carry most integration questions, and they differ in two ways: **who receives** a message (one consumer, or every subscriber) and **whether it is kept** after it is read (gone, or retained for replay). Name the pattern first and three of the four options fall away.',
      { table: { head: ['Pattern', 'Typical words', 'Service', 'Not this'], key: true, rows: [
        ['**Queue**', 'decouple, buffer spikes, background jobs, workers at their own pace', 'SQS (FIFO for order)', 'SNS (a standard topic stores nothing)'],
        ['**Fan-out**', 'notify several systems, email/SMS/push, every subscriber gets it', 'SNS (+ an SQS queue per subscriber)', 'one shared SQS queue'],
        ['**Event routing**', 'AWS service events, SaaS events, route by content, schedules', 'EventBridge (rules, Pipes, Scheduler)', 'polling CloudTrail or APIs'],
        ['**Stream**', 'real time, ordered per key, many consumers, replay', 'Kinesis Data Streams · MSK', 'SQS (deleted once read)'],
        ['**Delivery to storage**', 'land the stream in S3, Redshift or OpenSearch, no code', 'Amazon Data Firehose', 'Lambda or EC2 consumers'],
        ['**Existing broker**', 'JMS, ActiveMQ, RabbitMQ, minimal code change', 'Amazon MQ', 'SQS (rewrite)'],
        ['**Workflow**', 'steps, retries, waits, human approval', 'Step Functions', 'Lambda calling Lambda']] } },
      { h: 'Walk the decision tree' },
      'Follow it with a scenario in mind. Every leaf tells you why the nearest look-alike loses.',
      { widget: 'chooser', args: { title: 'Which integration service?', tree: CHOOSE } },
      { widget: 'sorter', args: { title: 'Queue, topic, bus or stream?', lead: 'Twelve requirements, four services. Decide before you check.', buckets: [{ id: 'sqs', short: 'SQS', label: 'Amazon SQS' }, { id: 'sns', short: 'SNS', label: 'Amazon SNS' }, { id: 'eb', short: 'EventBridge', label: 'Amazon EventBridge' }, { id: 'kds', short: 'Kinesis', label: 'Kinesis Data Streams' }], items: [
        { t: 'Buffer image-resize jobs so the worker fleet can scale on backlog', b: 'sqs', why: 'tasks for one worker each.' },
        { t: 'Text an on-call engineer and email the team when an alarm fires', b: 'sns', why: 'push to people.' },
        { t: 'Run a function whenever an EC2 instance is terminated', b: 'eb', why: 'AWS service events land on the default bus.' },
        { t: 'Two apps read every click in order per session and replay yesterday', b: 'kds', why: 'many readers + order + replay.' },
        { t: 'Process payments in order per account with no duplicates', b: 'sqs', why: 'FIFO queue, message group per account.' },
        { t: 'Push a sale alert to millions of mobile devices', b: 'sns', why: 'mobile push.' },
        { t: 'Receive ticket events from a SaaS help-desk partner', b: 'eb', why: 'partner event source.' },
        { t: 'Telemetry from 50,000 devices analysed within a second', b: 'kds', why: 'real-time stream.' },
        { t: 'Let a slow reporting service catch up hours after a burst', b: 'sqs', why: 'messages wait up to 14 days.' },
        { t: 'Send each new order to inventory, billing and shipping at once', b: 'sns', why: 'fan-out (each with its own queue).' },
        { t: 'Start a nightly export at 02:00 in each customer’s time zone', b: 'eb', why: 'EventBridge Scheduler.' },
        { t: 'Keep 7 days of trades so a new model can be back-tested on them', b: 'kds', why: 'retention and replay.' }] } },
      { pair: 'sqs-sns' },
      { check: { id: 'ch2-keep', q: 'Which pair of services **keeps a message after it has been read**, so that a second application can read the same data later?', opts: [
        { t: 'Kinesis Data Streams and MSK — records stay for the retention period whoever reads them.', why: 'streams retain records; consumers track their own position.' },
        { t: 'SQS and SNS — both store each message until every interested consumer has seen it.', why: 'SQS deletes a message once processed; a standard SNS topic stores nothing.' },
        { t: 'Firehose and SQS — both hold records in a buffer that other readers can poll again later.', why: 'Firehose buffers only to deliver; SQS deletes on processing.' }], a: 0,
        why: 'Replay is the stream’s built-for property. Queues and standard topics hand a message on and forget it; an SNS FIFO topic replays only from an opt-in archive.' } },
      { check: fromDrill('E5', 'Exam pattern') },
      { drills: ['E5'] }
    ] },

    /* ---------------------------------------------------------------- 3 */
    { id: 'ch3', title: 'SQS: standard, FIFO, visibility and dead letters', domains: 'D2 D3 D4', blocks: [
      '**Amazon SQS** has been in production since 2006 (its first beta was in late 2004) and is the default answer to “**decouple**”. A producer sends a message; it waits in the queue until a consumer **polls** (`ReceiveMessage`), processes it and **deletes** it (`DeleteMessage`). If the producer is fast and the consumers slow, the queue absorbs the difference — nothing is lost and nobody waits.',
      { h: 'The numbers that decide questions' },
      { table: { head: ['Setting', 'Default', 'Range'], key: true, rows: [
        ['**Message size**', '—', '1 byte to **1 MiB**; larger through S3 with the Extended Client Library (up to 2 GB)'],
        ['**Retention**', '**4 days**', '60 s to **14 days**'],
        ['**Visibility timeout**', '**30 s**', '0 s to **12 hours**'],
        ['**Delay** (queue or message timer)', '0 s', 'up to **15 minutes**'],
        ['**Long polling** wait', '0 s (short polling)', 'up to **20 s**'],
        ['**Batch**', '—', 'up to **10** messages per send, receive or delete'],
        ['**In flight** (received, not deleted)', '—', 'about **120,000** for most standard queues']] } },
      { callout: 'The maximum message size rose from **256 KiB to 1 MiB** in August 2025 for standard and FIFO queues, and the Lambda SQS event source mapping accepts 1 MiB too. Practice banks written earlier say 256 KB and send anything larger through S3 — still a valid pattern above 1 MiB.', kind: 'update' },
      { h: 'Standard or FIFO' },
      'A **standard** queue gives “very high, nearly unlimited” throughput. In exchange, delivery is **at least once** (a message can arrive twice) and order is **best effort**. A **FIFO** queue (its name ends in `.fifo`) keeps **strict order within a message group** and removes duplicates sent within a **5-minute deduplication interval** — by a deduplication ID you send, or a hash of the body with content-based deduplication. Throughput is the price: **300 transactions per second per API action** per partition, or **3,000 messages per second** with batches of 10; **high-throughput mode** raises that to as much as 70,000 transactions per second in the largest Regions.',
      'The **message group ID** is the trick. Messages with the same group ID (one customer, one account, one device) are delivered one after another; different groups are processed in parallel. One group for everything means one message at a time for the whole queue.',
      { pair: 'std-fifo' },
      { check: fromDrill('E8') },
      { callout: '**Fair queues**: on a **standard** queue you can now set a `MessageGroupId` per tenant. SQS then keeps one noisy tenant from delaying everyone else, with no change to the consumers. It is not ordering — that is still FIFO’s job.', kind: 'update' },
      { h: 'Visibility timeout' },
      'When a consumer receives a message, SQS does not remove it; it **hides** it for the **visibility timeout**. If the consumer deletes it in time, it is gone. If not — the code crashed, or simply took longer than the timeout — the message **becomes visible again** and another consumer receives it. A timeout shorter than the processing time therefore produces **duplicates** even when nothing fails. Set it above the longest processing time, or have the worker extend it with `ChangeMessageVisibility` while it works.',
      { widget: 'visTimeout' },
      { check: { id: 'ch3-vis', q: 'Workers take about **90 seconds** per message. The queue keeps its **default** visibility timeout. Nothing crashes. What happens?', opts: [
        { t: 'Each message is deleted after 30 seconds unless the worker renews it, so most of the finished work is lost.', why: 'the timeout hides a message; it never deletes it.' },
        { t: 'Nothing changes, because SQS extends the visibility timeout on its own while a worker holds a message.', why: 'only the worker can extend it, with ChangeMessageVisibility.' },
        { t: 'Each message reappears after 30 seconds and a second worker picks it up while the first is still busy.', why: 'default 30 s < 90 s processing: duplicates with no failure at all.' }], a: 2,
        why: 'Visibility timeout must exceed processing time. Too short = duplicates; deletion is always the consumer’s job.' } },
      { check: fromDrill('E7') },
      { h: 'Dead-letter queues and redrive' },
      'Every receive increments a message’s receive count. A **redrive policy** names a **dead-letter queue** and a `maxReceiveCount`: once a message has been received more times than that without being deleted, SQS moves it to the DLQ. A **poison message** (one that always fails) then stops blocking the workers, and you can inspect it, fix the bug and **redrive** it back to the source queue — for standard and FIFO queues. The DLQ must be the same type as its source: a FIFO queue needs a FIFO DLQ.',
      { h: 'Polling and delays' },
      { ul: [
        '**Short polling** (the default) answers at once, often empty. **Long polling** waits up to **20 seconds** for a message to arrive: fewer empty responses, fewer API calls, lower cost. Set `ReceiveMessageWaitTimeSeconds` on the queue or `WaitTimeSeconds` per call.',
        '**Delay queues** hide every new message for up to 15 minutes; a **message timer** does it for one message. Use them to postpone processing, not to fix duplicates.',
        '**Scaling**: point an Auto Scaling policy at the queue’s backlog (messages visible per instance) — the classic “scale workers on queue depth” answer.'] },
      { check: { id: 'ch3-poll', q: 'Thousands of `ReceiveMessage` calls a minute return **empty** responses from a quiet queue, and the SQS bill is rising. What is the built-for fix?', opts: [
        { t: 'Add a delay of 15 minutes to the queue so that messages are collected into larger groups.', why: 'a delay postpones every message; the empty calls continue.' },
        { t: 'Enable long polling with a 20-second wait so that each call waits for messages to arrive.', why: 'fewer, fuller responses: the documented fix for empty receives.' },
        { t: 'Raise the visibility timeout to 12 hours so that consumers stop receiving the same message again.', why: 'visibility is about duplicates, not about empty receives.' }], a: 1,
        why: 'Empty receives = short polling. Long polling waits up to 20 seconds per call.' } },
      { check: fromDrill('E10') },
      { drills: ['E7', 'E8', 'E10'] }
    ] },

    /* ---------------------------------------------------------------- 4 */
    { id: 'ch4', title: 'SNS and fan-out', domains: 'D2 D3', blocks: [
      '**Amazon SNS** is publish/subscribe. A publisher sends one message to a **topic**; SNS **pushes** a copy to every **subscription**: SQS queues, Lambda functions, Firehose streams, HTTP(S) endpoints, email, SMS and mobile push. There is no polling, and a standard topic keeps nothing for latecomers — a subscriber that is unreachable gets retries, then the message is dropped or sent to the subscription’s dead-letter queue.',
      { h: 'Fan-out: SNS plus a queue per subscriber' },
      'When several systems must each process every event at their own pace, subscribe **one SQS queue per system** to the topic. The topic copies; the queues buffer. Inventory can be down for an hour and catch up later; billing is never slowed by shipping. This **fan-out** pattern is one of the most tested designs in the cluster — and the reason “one queue shared by three services” is always wrong.',
      { widget: 'stepper', args: { title: 'Fan-out with per-subscriber queues', line: 'sns', steps: [
        { title: 'Publish once', text: 'The order service publishes one `OrderPlaced` message to the **orders** topic. It knows nothing about who listens.' },
        { title: 'SNS copies', text: 'SNS pushes a copy to each subscription: the inventory queue, the billing queue, the shipping queue and an analytics Firehose stream.' },
        { title: 'Filter policies', text: 'The shipping queue’s **filter policy** accepts only orders with `type = physical`; digital orders never reach it. Each subscription can have its own (up to 200 filter policies per topic).' },
        { title: 'Each queue buffers', text: 'Inventory is being deployed and stops reading for 40 minutes. Its messages wait in its own queue (up to 14 days); billing and shipping carry on.', note: 'With one shared queue, the three services would compete for the same messages and each would see only some of them.', noteTitle: 'Why not one queue' },
        { title: 'Failures stay local', text: 'A poison message in the billing queue moves to billing’s dead-letter queue after its `maxReceiveCount`. Nobody else notices.' }] } },
      { check: { id: 'ch4-share', q: 'Three services read from **one** SQS queue that receives every new order. What does each service see?', opts: [
        { t: 'Only part of the orders — each message goes to whichever consumer receives it first.', why: 'competing consumers: a message is processed and deleted once.' },
        { t: 'Every order — SQS keeps a separate cursor for each service, as a Kinesis stream does.', why: 'that is Kinesis; SQS has no per-consumer cursor.' },
        { t: 'Every order — but only after all three services have deleted the message.', why: 'one delete removes it for everyone.' }], a: 0,
        why: 'A queue splits work; it does not copy it. Every service needs every message = SNS → one queue each.' } },
      { check: fromDrill('E9') },
      { h: 'FIFO topics' },
      '**SNS FIFO** topics keep order and deduplicate, like FIFO queues, and deliver **only to SQS queues** (FIFO or standard). Email, SMS, mobile push and HTTP(S) cannot subscribe, and a Lambda function reads through a queue. Use them to fan out an ordered stream — price updates, ledger events — to several ordered queues. FIFO topics are also the only topics that can keep messages: the topic owner can turn on an **archive** (`ArchivePolicy`, up to 365 days), and a subscription replays a chosen time window from it with a `ReplayPolicy`.',
      { callout: 'SNS now accepts messages up to **1 MiB**, but only when you set the topic attribute `MaximumMessageSize` (September 2026). The default is still **256 KiB**. Above 256 KiB the topic may have only **SQS, Firehose and Lambda** subscriptions, and at most **100** of them. Banks say 256 KB — for most topics that is still true.', kind: 'update' },
      { check: { id: 'ch4-fifo', q: 'An SNS FIFO topic must fan out ordered price updates. Which subscriber **cannot** be attached to it directly?', opts: [
        { t: 'An SQS FIFO queue that feeds the trading service in the same AWS Region.', why: 'FIFO queues are the main FIFO-topic subscriber.' },
        { t: 'An SQS standard queue that feeds a reporting service that tolerates reordering.', why: 'standard queues can subscribe too.' },
        { t: 'An AWS Lambda function that writes each price update into a DynamoDB table.', why: 'FIFO topics deliver to SQS only; put a queue in front of the function.' }], a: 2,
        why: 'SNS FIFO → SQS queues only. Lambda, email, SMS, push and HTTP(S) need a standard topic or a queue in between.' } },
      { drills: ['E9'] }
    ] },

    /* ---------------------------------------------------------------- 5 */
    { id: 'ch5', title: 'EventBridge: buses, rules, Pipes and Scheduler', domains: 'D2 D3', blocks: [
      '**Amazon EventBridge** (the successor of CloudWatch Events) is a serverless **event router**. An event is a JSON document that says something happened. Events land on an **event bus**, and **rules** decide where each one goes by looking at its **content**.',
      { h: 'Buses and rules' },
      { ul: [
        'The **default bus** in every account receives events from **AWS services**: an EC2 instance changed state, an object was created in S3 (when enabled), a CodePipeline stage failed, a Health event was raised. Reacting to AWS service changes is EventBridge’s first built-for job.',
        '**Custom buses** take your applications’ events (`PutEvents`). **Partner buses** receive events from **SaaS partners** through a partner event source — no webhook to host.',
        'A **rule** holds an **event pattern** (match `source`, `detail-type`, any field in `detail`, prefixes, numeric ranges) and up to **5 targets**: Lambda, SQS, SNS, Step Functions, Kinesis, API Gateway, an API destination (any HTTPS endpoint), another bus. **300 rules per bus** by default (100 in two Regions), adjustable; **5 targets per rule** is fixed.',
        'Delivery: EventBridge retries a failing target for up to **24 hours and 185 attempts** by default, then drops the event or sends it to a **DLQ** (an SQS queue). **Archives** keep events so you can **replay** them later.'] },
      { pair: 'sns-eb' },
      { check: fromDrill('E11') },
      { callout: 'Events can now be up to **1 MB** (January 2026; was 256 KB); at launch a few newer Regions were excluded. And EventBridge has a second kind of bus: the new **Custom Event Bus** routes to **subscribers** (one target each) instead of rules, keeps every event for 1–365 days, delivers FIFO per event group, lets a subscriber start from a past position (replay), deduplicates at publish time and is shared with other accounts through AWS RAM. The console now calls the rule-based bus **Custom Event Bus - Classic**. Exam questions use the Classic model: buses, rules, 5 targets, archive and replay.', kind: 'update' },
      { check: { id: 'ch5-targets', q: 'One rule must send matching events to **eight** different targets. What do you do?', opts: [
        { t: 'Request a Service Quotas increase so that this one rule can hold all eight targets.', why: 'targets per rule is not adjustable.' },
        { t: 'Split them over two rules with the same pattern, or send one target to an SNS topic.', why: '5 targets per rule is fixed; more rules or a fan-out target solve it.' },
        { t: 'Move the rule to a partner event bus, which allows more targets for each of its rules.', why: 'partner buses have the same rule model and limit.' }], a: 1,
        why: 'Targets per rule: 5, fixed. Rules per bus: 300 by default, adjustable.' } },
      { check: fromDrill('E12') },
      { h: 'Pipes: point to point, no code' },
      '**EventBridge Pipes** connect **one source** to **one target** with an optional **filter** and an optional **enrichment** step in between. Sources are the poll-based ones: **SQS, Kinesis Data Streams, DynamoDB Streams, Amazon MQ, MSK** and self-managed Kafka. Enrichment calls Lambda, Step Functions, API Gateway or an API destination to add data. Pipes replace the small Lambda function you would otherwise write to poll, filter and forward — and you pay only for the events that pass the filter.',
      { h: 'Scheduler: time as the event' },
      '**EventBridge Scheduler** runs **one-time** schedules (`at()`), **rate-based** and **cron** schedules, each with **its own time zone** and an optional **flexible time window** to spread the load. A schedule can call almost any AWS API directly (universal targets). It replaces a rule-per-schedule design that would hit the default 300 rules per bus, and the cron job on an EC2 instance.',
      { widget: 'sorter', args: { title: 'Rule, pipe or schedule?', lead: 'Eight requirements. Which EventBridge feature was built for each?', buckets: [{ id: 'rule', short: 'Rule', label: 'Event bus + rule' }, { id: 'pipe', short: 'Pipe', label: 'EventBridge Pipes' }, { id: 'sched', short: 'Scheduler', label: 'EventBridge Scheduler' }], items: [
        { t: 'Invoke a function when an S3 bucket policy is changed in CloudTrail', b: 'rule', why: 'an AWS event matched by a pattern.' },
        { t: 'Send new DynamoDB stream records for paid orders to Step Functions', b: 'pipe', why: 'one source, a filter, one target.' },
        { t: 'Remind each trial user 14 days after sign-up, in their own time zone', b: 'sched', why: 'one-time schedules with time zones.' },
        { t: 'Route SaaS ticket events to three different queues by priority', b: 'rule', why: 'content-based routing from a partner bus.' },
        { t: 'Add customer details from an API to SQS messages before a workflow', b: 'pipe', why: 'enrichment step.' },
        { t: 'Stop development instances at 19:00 every weekday', b: 'sched', why: 'a recurring cron schedule.' },
        { t: 'Notify the security team whenever GuardDuty raises a finding', b: 'rule', why: 'AWS service events on the default bus.' },
        { t: 'Forward Kinesis records to an API destination without a Lambda poller', b: 'pipe', why: 'stream source to a target, no code.' }] } },
      { check: fromDrill('E14') },
      { check: fromDrill('E13') },
      { drills: ['E11', 'E12', 'E13', 'E14'] }
    ] },

    /* ---------------------------------------------------------------- 6 */
    { id: 'ch6', title: 'Streams: Kinesis Data Streams and MSK', domains: 'D3 D2 D4', blocks: [
      'A **stream** is not a queue. Records are written once and **kept** for a retention period; any number of consumers read them independently, each at its own position, **in order per partition key**, and can go back and **replay**. That makes streams the answer to real-time analytics with several consumers — and the wrong answer to “run each job once”.',
      { h: 'Shards: the unit of capacity' },
      'A Kinesis data stream is made of **shards**. A producer writes a record with a **partition key**; the key’s hash picks the shard, and order is kept **within a shard**. In **provisioned** mode each shard takes **1 MB/s or 1,000 records/s** of writes and serves **2 MB/s** of reads, shared by all standard consumers (5 `GetRecords` calls per second per shard). Too few shards — or one hot partition key — and producers get `ProvisionedThroughputExceededException`.',
      { table: { head: ['', 'Provisioned mode', 'On-demand mode'], key: true, rows: [
        ['Capacity', 'shards you set (split and merge to scale)', 'scales by itself'],
        ['Starting point', 'what you provision', '4 MB/s write, 8 MB/s read for a new stream'],
        ['Ceiling', 'shards × 1 MB/s', 'up to 10 GB/s write in N. Virginia, Oregon, Ireland; 200 MB/s elsewhere'],
        ['Best for', 'steady, predictable traffic', 'unknown or spiky traffic'],
        ['Switching', 'twice per 24 hours per stream', '']] } },
      { widget: 'shardCalc' },
      { check: fromDrill('E16') },
      { h: 'Retention, replay and record size' },
      'Records are kept from **24 hours** (the minimum) up to **8,760 hours — 365 days**. A consumer that crashed, a new model that needs history, a bug fix that requires reprocessing: they all reread from a sequence number or a timestamp.',
      { callout: 'Records can now be up to **10 MiB** (Kinesis handles occasional large records with burst capacity; older material says **1 MB**), and retention reaches **365 days**. Write throughput per shard is still quoted as 1 MB/s.', kind: 'update' },
      { h: 'Consumers: shared or enhanced fan-out' },
      'Standard consumers **share** each shard’s 2 MB/s and poll it; with a single consumer records arrive in about 200 ms, and every consumer you add gets a smaller slice. **Enhanced fan-out** registers a consumer that gets its **own 2 MB/s per shard**, **pushed** over HTTP/2 with about **70 ms** latency; up to 20 such consumers per stream (50 in On-demand Advantage mode). Lambda can read either way through an **event source mapping**, one batch per shard at a time — or up to 10 in parallel with a parallelization factor.',
      { pair: 'kds-sqs' },
      { check: fromDrill('E15') },
      { check: { id: 'ch6-efo', q: 'Four applications read the same provisioned stream with `GetRecords`. They fall behind and get read throttling, while producers write without errors. What fits best?', opts: [
        { t: 'Register the four applications as enhanced fan-out consumers so that each gets its own read throughput.', why: 'reads are shared 2 MB/s per shard; enhanced fan-out gives 2 MB/s each.' },
        { t: 'Change the partition key to a random value, so that writes spread more evenly over all of the shards.', why: 'writes are not the problem here.' },
        { t: 'Raise the retention period to 7 days so that slow consumers no longer lose records they skipped.', why: 'retention does not add read throughput.' }], a: 0,
        why: 'Read contention between consumers = enhanced fan-out (or more shards). Write throttling = more shards or a better key.' } },
      { check: fromDrill('E17') },
      { h: 'MSK and Amazon MQ: when the protocol is already chosen' },
      { ul: [
        '**Amazon MSK** is managed **Apache Kafka**. Choose it when producers and consumers already use Kafka APIs, connectors or tools. **MSK Provisioned** runs Standard brokers or **Express** brokers (MSK-managed storage, up to 3x throughput per broker, scaling up to 20x faster); **MSK Serverless** sizes itself and requires IAM access control; **MSK Connect** runs Kafka Connect connectors without servers.',
        '**Amazon MQ** is managed **ActiveMQ** and **RabbitMQ** — the answer for moving an existing message broker with minimal code change: JMS and the standard messaging protocols, and Amazon MQ for ActiveMQ for commercial brokers such as IBM MQ or TIBCO EMS. New cloud-native designs use SQS and SNS instead.'] },
      { check: { id: 'ch6-mq', q: 'An on-premises Java application uses **JMS** with an ActiveMQ broker. The team wants a managed broker and **minimal code changes**. Which service?', opts: [
        { t: 'Amazon SQS with the JMS-compatible queue API, after rewriting the producers to use SQS.', why: 'a rewrite is not minimal code change.' },
        { t: 'Amazon MQ for ActiveMQ, keeping the JMS client code and changing only the broker endpoint.', why: 'built for moving existing brokers on standard protocols.' },
        { t: 'Amazon MSK Serverless, after moving every producer and consumer from JMS over to the Kafka API.', why: 'Kafka is a different protocol; again a rewrite.' }], a: 1,
        why: 'Existing broker + standard protocol + minimal change = Amazon MQ.' } },
      { check: fromDrill('E20') },
      { drills: ['E15', 'E16', 'E17', 'E20'] }
    ] },

    /* ---------------------------------------------------------------- 7 */
    { id: 'ch7', title: 'Firehose: delivery, not processing', domains: 'D3 D4 D2', blocks: [
      'Your baseline **Q1** lives here. **Amazon Data Firehose** (banks: **Kinesis Data Firehose**) exists for one job: take streaming records and **load** them into a destination, with **no code** and nothing to scale. Producers — your applications through the API, a Kinesis data stream, or an MSK topic — send records; Firehose buffers them and writes files or batches into **S3, Redshift, OpenSearch Service, Snowflake, Apache Iceberg tables, Splunk**, observability partners or any HTTP endpoint.',
      { callout: 'Q1 in one line: when the stem says “store the stream in S3 (or Redshift, OpenSearch) … near real time … least operational overhead”, the answer is **Firehose**. A Lambda function that reads the stream and writes objects works too — but you write it, size its batches, handle its retries and pay for its runs. That was your pick.', kind: 'miss', title: 'Your miss' },
      { h: 'Buffering decides latency' },
      'Firehose collects records until a **buffer size** or a **buffer interval** is reached, whichever comes first, then delivers. For S3 the size is **1–128 MB** and the interval **0–900 seconds**. Bigger buffers mean fewer, larger files (cheaper queries later) and more delay; small ones deliver faster. That is why Firehose is called **near real time**.',
      { callout: '**Zero buffering** arrived on 26 December 2023: set the interval to 0 and most records are delivered within seconds (dynamic partitioning excepted). Before that the minimum interval was **60 seconds**, which is what older material teaches.', kind: 'update' },
      { h: 'Transform on the way' },
      { ul: [
        '**Lambda transformation**: Firehose invokes your function on each buffered batch to clean, enrich or filter records before delivery.',
        '**Record format conversion**: JSON in, **Apache Parquet or ORC** out, using a table schema from the **Glue Data Catalog** — columnar files that Athena scans far more cheaply (chapter 11). For S3, with conversion or dynamic partitioning the buffer size is 64–128 MB.',
        '**Dynamic partitioning**: write records into S3 prefixes by a key inside them (customer, date), ready for partition pruning.',
        'Compression and encryption on delivery; failed records go to an S3 backup location.'] },
      { check: fromDrill('E18') },
      { widget: 'stepper', args: { title: 'Clickstream to S3 with Firehose', line: 'firehose', steps: [
        { title: 'Producers write', text: 'Web servers send click events (JSON) to a Firehose stream with `PutRecordBatch`. No shards to size.' },
        { title: 'Buffer', text: 'Firehose collects records until 128 MB or 300 seconds — whichever comes first.' },
        { title: 'Transform', text: 'A Lambda transform drops bot traffic and adds a country code to each record.' },
        { title: 'Convert and partition', text: 'Record format conversion writes **Parquet** using the Glue Data Catalog schema; dynamic partitioning writes to `s3://clicks/date=…/`.' },
        { title: 'Deliver and query', text: 'Parquet files land in S3; Athena queries them by date with partition pruning.', note: 'Your Q1 pick put a Lambda function where steps 1–4 are. It works, but it is code to write, scale and retry — and Firehose does it as configuration.', noteTitle: 'Your miss' }] } },
      { h: 'What Firehose is not' },
      'Firehose has **no consumers** and **no replay**: once delivered, the records live only in the destination. If several applications must read the stream in real time, or reread it, put **Kinesis Data Streams** first — Firehose can be one of its consumers.',
      { pair: 'kds-firehose' },
      { check: fromDrill('E1', 'Exam Q1') },
      { callout: '**Kinesis Data Analytics for SQL** is gone: no new applications from 15 October 2025, existing applications deleted from **27 January 2026**. Real-time SQL or stream processing is now **Amazon Managed Service for Apache Flink**. Banks still offer “Kinesis Data Analytics” for anomaly detection on a stream; recognise it, answer Flink today. Exam-day rule: if an option says only “Kinesis Data Analytics” and no Flink option is offered, it is the bank’s answer — the Flink flavour of that service was renamed **Managed Service for Apache Flink**.', kind: 'update' },
      { check: fromDrill('E19') },
      { check: { id: 'ch7-replay', q: 'Records delivered by Firehose to S3 last week must be **reprocessed** by a new consumer. Where does that consumer read them from?', opts: [
        { t: 'From the Firehose stream itself, by starting the new consumer at last week’s timestamp.', why: 'Firehose has no consumers and no retention.' },
        { t: 'From the Firehose backup buffer, which keeps every record for 7 days by default.', why: 'there is no such buffer; only failed records go to an S3 backup.' },
        { t: 'From the objects in S3 — Firehose keeps no copy that a consumer can rewind.', why: 'delivery only; the destination holds the data.' }], a: 2,
        why: 'Replay is a stream property (Kinesis Data Streams). Firehose delivers and forgets.' } },
      { drills: ['E1', 'E18', 'E19'] }
    ] },

    /* ---------------------------------------------------------------- 8 */
    { id: 'ch8', title: 'Lambda and API Gateway', domains: 'D3 D2 D4', blocks: [
      '**AWS Lambda** runs your code when an event arrives and scales by running more copies. The exam tests its **limits** and its **invocation models** more than its code.',
      { table: { head: ['Limit', 'Value'], key: true, rows: [
        ['**Timeout**', '900 s (**15 minutes**)'],
        ['**Memory**', '128 MB to **10,240 MB** (CPU scales with it)'],
        ['**Payload**', '**6 MB** request and response (synchronous) · **1 MB** asynchronous · 200 MB streamed response'],
        ['**`/tmp`**', '512 MB to 10,240 MB'],
        ['**Package**', '50 MB zipped / 250 MB unzipped, 5 layers · container image up to 10 GB'],
        ['**Concurrency**', '**1,000** per Region by default (raisable; new accounts start lower) · each function scales by up to 1,000 execution environments every 10 s']] } },
      { callout: 'The asynchronous payload limit is now **1 MB**; older material says **256 KB**. Synchronous stays at 6 MB.', kind: 'update' },
      { h: 'Three ways to invoke' },
      { ul: [
        '**Synchronous**: the caller waits for the result — API Gateway, an ALB, the SDK. Errors go back to the caller, who retries or not.',
        '**Asynchronous**: S3, SNS, EventBridge hand the event to Lambda’s internal queue and move on. On a function error Lambda **retries twice** (configurable 0–2) and keeps the event for up to **6 hours**; after that it is discarded unless you configure a **dead-letter queue** (SQS or SNS) or, better, an **on-failure destination** (an SQS queue, SNS topic, S3 bucket, Lambda function or EventBridge bus). On-success destinations take the same types except S3. Destinations also carry the error details and stack trace; a DLQ holds only the original event.',
        '**Event source mapping**: Lambda **polls** SQS, Kinesis, DynamoDB Streams, MSK, Amazon MQ or DocumentDB and invokes the function with **batches**. SQS: batch size 10 by default, up to 10,000 for standard queues with a batching window (up to 300 s). Turn on **`ReportBatchItemFailures`** so that one bad message does not send the whole batch back to the queue. Streams: **bisect** a failing batch, set a parallelization factor of 1–10 per shard, and send discarded records to an on-failure destination.'] },
      { check: { id: 'ch8-async', q: 'An S3 upload invokes a function **asynchronously**. The function fails on a corrupt file. What happens by default?', opts: [
        { t: 'Lambda retries twice, then discards the event unless a DLQ or on-failure destination is set.', why: 'two retries, up to 6 hours in the async queue, then gone.' },
        { t: 'S3 keeps sending the event every minute until the function succeeds or the object is deleted.', why: 'S3 hands over once; Lambda’s async queue retries.' },
        { t: 'Lambda moves the event to an SQS dead-letter queue that it creates with every function.', why: 'no DLQ exists until you configure one.' }], a: 0,
        why: 'Async = 2 retries, 6 hours, then a DLQ or (preferred) an on-failure destination — or nothing.' } },
      { check: fromDrill('E21') },
      { check: fromDrill('E23') },
      { h: 'Concurrency and cold starts' },
      { ul: [
        '**Reserved concurrency** sets both a maximum and a guaranteed minimum for one function — for example, cap it so it cannot exhaust a downstream database. It costs nothing.',
        '**Provisioned concurrency** keeps a number of execution environments **initialised** so that requests skip the cold start (double-digit-millisecond response). It is charged.',
        '**SnapStart** snapshots an initialised environment and resumes from it: Java 11+, Python 3.12+, .NET 8+, published versions only. It **cannot** be combined with provisioned concurrency, EFS, Amazon S3 Files or `/tmp` larger than 512 MB.',
        'Database connection storms from Lambda are fixed with **RDS Proxy**, not more concurrency — [[../08-databases/#learn/ch4|Session 8, chapter 4]].'] },
      { check: fromDrill('E24') },
      { callout: 'Lambda has grown two new shapes since the exam guide. **Durable functions** checkpoint their progress and can suspend for up to a year, with no compute charge while waiting — a code-first alternative to some Step Functions workflows. **Lambda Managed Instances** run functions on EC2 capacity through a capacity provider (EC2 Savings Plans and Reserved Instances apply; up to 90 minutes for asynchronous invocations and for event source mappings other than Amazon MQ and DocumentDB). Neither is an exam answer yet; the 15-minute limit still decides bank questions.', kind: 'update' },
      { h: 'API Gateway' },
      { table: { head: ['', 'REST API', 'HTTP API', 'WebSocket API'], key: true, rows: [
        ['Built for', 'full-featured APIs', 'cheap, simple proxies to Lambda or HTTP', 'two-way persistent connections (chat, live updates)'],
        ['Endpoints', 'edge-optimized, Regional, **private**', 'Regional', '—'],
        ['Extras', '**API keys, usage plans, per-client throttling, caching, request validation, AWS WAF**, X-Ray', 'JWT authorizers, automatic deployments, private integrations with Cloud Map', 'routes on message content'],
        ['Integration timeout', '50 ms–**29 s**, raisable for Regional and private APIs', 'up to **30 s**', '—']] } },
      { ul: [
        '**Throttling**: 10,000 requests per second per account per Region with a 5,000-request burst bucket (lower in some newer Regions), shared by all APIs; usage plans set per-client limits on REST APIs.',
        '**Caching** (REST): responses cached per stage, TTL 300 s by default, 0–3,600 s.',
        '**Payload**: 10 MB for REST and HTTP APIs.',
        '**Authorizers**: IAM, Cognito user pools, Lambda authorizers; HTTP APIs add native JWT authorizers.'] },
      { callout: 'The REST integration timeout used to be a hard **29 seconds**. AWS now lets you raise it for **Regional and private** REST APIs (not edge-optimized), possibly in exchange for a lower Region throttle quota. Banks still treat 29 s as a wall — for a long job the built-for answer is still asynchronous: return at once and hand the work to SQS or Step Functions.', kind: 'update' },
      { check: { id: 'ch8-apikeys', q: 'Partners must call an API with **their own API keys**, each with a monthly request quota, and responses should be **cached**. Which API type?', opts: [
        { t: 'An API Gateway HTTP API with usage plans, API keys and a JWT authorizer for each partner.', why: 'HTTP APIs have no API keys, usage plans or caching.' },
        { t: 'An API Gateway REST API with usage plans, API keys and stage caching turned on.', why: 'API keys, usage plans and caching are REST API features.' },
        { t: 'An API Gateway WebSocket API with a usage plan for each partner connection and route.', why: 'WebSocket is for persistent two-way connections, not quotas and caching.' }], a: 1,
        why: 'Keys, quotas, per-client throttling, caching, WAF, private endpoints → REST. Cheapest simple proxy → HTTP.' } },
      { check: fromDrill('E22') },
      { drills: ['E21', 'E22', 'E23', 'E24'] }
    ] },

    /* ---------------------------------------------------------------- 9 */
    { id: 'ch9', title: 'Step Functions: orchestrating the steps', domains: 'D2 D3 D4', blocks: [
      'Your baseline **Q40** lives here. When a process has several steps — validate, charge, reserve stock, wait for approval, ship — something must remember where each order is, retry what failed and undo what must be undone. Writing that into Lambda functions that call each other is fragile: nobody holds the state, a timeout loses the order, and a function that waits pays for waiting. **AWS Step Functions** holds it for you in a **state machine**.',
      { h: 'States' },
      { ul: [
        '**Task** — do work: invoke Lambda, or call an AWS service directly through a service integration (put an item in DynamoDB, send to SQS, start a Glue job or an ECS task) with no Lambda in between.',
        '**Choice**, **Parallel**, **Map** (one branch per item), **Wait** (a time or a timestamp), **Pass**, **Succeed**, **Fail**.',
        '**Retry** and **Catch** on any state: back off and retry a throttled call, route a failure to a compensation step.',
        'Integration patterns: request-response (call and move on), **`.sync`** (start a job and wait for it to finish), **`.waitForTaskToken`** (pause until someone calls back with the token — a person approving, an external system replying).'] },
      { h: 'Standard or Express' },
      { pair: 'sfn-types' },
      { check: fromDrill('E25') },
      'Both types take payloads of up to **256 KiB** per task, state or execution. A Standard execution keeps up to **25,000** history events, and its history is kept for 90 days — the audit trail of every order.',
      { widget: 'stepper', args: { title: 'Order workflow with a human approval', line: 'sfn', steps: [
        { title: 'Start', text: 'API Gateway starts a **Standard** execution with the order as input. Step Functions now owns the order’s state.' },
        { title: 'Validate and charge', text: 'A Lambda task validates the order; a service integration charges the card. Each has a **Retry** with backoff for throttling and a **Catch** that routes failures to a refund step.' },
        { title: 'Wait for a person', text: 'Orders over 10,000 need a manager. A `.waitForTaskToken` task sends the token to an approval queue and the execution **pauses** — for minutes or days — paying nothing for the wait.', note: 'Express workflows cannot do this: they stop at 5 minutes and have no task token.' },
        { title: 'Resume', text: 'The approval app calls `SendTaskSuccess` with the token. The execution continues where it stopped.' },
        { title: 'Fan out and finish', text: 'A Map state reserves stock in parallel for every line item; then the order is marked shipped. The execution history shows every step for audit.', note: 'Older banks answer a “manual step” workflow with Amazon SWF. SWF still exists, but AWS recommends Step Functions for new applications.', noteTitle: 'Your Q40' }] } },
      { check: { id: 'ch9-chain', q: 'Five Lambda functions call each other in a chain. When the third one times out, orders are lost and nobody knows where they stopped. What is the built-for fix?', opts: [
        { t: 'Raise every function’s timeout to 15 minutes and its reserved concurrency so that none of them time out.', why: 'still no state, retries or record of where an order stopped.' },
        { t: 'An SQS queue between each pair of functions, with a dead-letter queue on each to keep failed orders.', why: 'works, but it is five queues of plumbing and still no view of an order’s progress.' },
        { t: 'A Step Functions Standard workflow that calls the five functions as tasks with Retry and Catch.', why: 'state, retries and a history per order.' }], a: 2,
        why: 'Several steps + retries + “where is this order?” = orchestration: Step Functions.' } },
      { h: 'Distributed Map: large-scale parallel work' },
      'An inline **Map** runs its iterations inside one execution, so everything counts against that execution’s 25,000-event history. **Distributed Map** (Standard workflows only) reads items from **S3** — a list of objects, a CSV or JSON file, an inventory — and runs each batch as a **child workflow**, up to **10,000 in parallel**. It is the answer for “process millions of S3 objects in parallel with no servers”. A failed Map Run can be redriven within 14 days.',
      { check: fromDrill('E26') },
      { h: 'SWF and durable functions' },
      { ul: [
        '**Amazon SWF** (Simple Workflow Service) is the older workflow service: you write deciders and workers that poll it. It is still available. AWS recommends **Step Functions for new applications**, and SWF where external signals must intervene in a running process or child processes must return results to a parent.',
        '**Lambda durable functions** are a newer, code-first way to write a long-running process inside a function that checkpoints and suspends (see chapter 8). For the exam, multi-service orchestration with a visual workflow is Step Functions.'] },
      { check: { id: 'ch9-swf', src: 'Exam Q40', q: 'A practice question offers **Amazon SWF** and **Step Functions** for a new order workflow with a manual approval step. Which statement matches current AWS guidance?', opts: [
        { t: 'Step Functions, because AWS recommends it for new applications and its callback tasks handle manual steps.', why: 'the current recommendation, and task tokens cover the human step.' },
        { t: 'Amazon SWF, because it is the only AWS workflow service that can pause an execution for a human decision.', why: 'Step Functions callback tasks do exactly that.' },
        { t: 'Amazon SWF, because AWS has retired Step Functions Standard workflows in favour of its decider model.', why: 'false — Standard workflows are current; SWF is the older service.' }], a: 0,
        why: 'Your Q40 fact: SWF exists, but new workflows — manual steps included — are Step Functions.' } },
      { check: fromDrill('E4', 'Exam Q40') },
      { drills: ['E4', 'E25', 'E26'] }
    ] },

    /* ---------------------------------------------------------------- 10 */
    { id: 'ch10', title: 'Glue and EMR: transforming data at rest', domains: 'D3 D4', blocks: [
      'Two baseline misses live here. **Q50** asked for ETL with the **least operational overhead** — the keyword that means **AWS Glue**. **Q57** asked for **big data** processing plus SQL/BI — the processing half is **Amazon EMR**, the query half Redshift ([[../08-databases/#learn/ch10|Session 8, chapter 10]]).',
      { callout: 'Q50: “least operational overhead” + ETL → **Glue** (serverless; nothing to size or patch). Q57: “big data” + Spark/Hadoop → **EMR**, then a warehouse for SQL and BI. Keywords decide both; the services themselves you knew.', kind: 'miss', title: 'Your misses' },
      { h: 'AWS Glue' },
      { ul: [
        '**Crawlers** read data in S3 (and JDBC sources), infer the schema and partitions, and write **tables** into the **Glue Data Catalog**.',
        'The **Data Catalog** is a Hive-metastore-compatible catalog shared by **Athena, EMR and Redshift Spectrum** — define a table once, query it from all three.',
        '**ETL jobs** run Apache Spark **serverless**: you pick the worker size and count, Glue provides and removes the capacity. The **Flex** execution class runs time-insensitive jobs on spare capacity for less.',
        '**Job bookmarks** remember what a job has already processed, so the next run reads **only new data** (off by default).',
        '**Glue DataBrew** prepares data visually — over 250 ready-made transformations, no code — for analysts rather than engineers.'] },
      { check: { id: 'ch10-bookmark', q: 'A nightly Glue job reprocesses **every** file in its S3 prefix, although only a few hundred new files arrive each day. What changes that with no new code?', opts: [
        { t: 'Run a crawler before each job run so that the Data Catalog lists only the files that arrived today.', why: 'crawlers catalog everything they find; they do not track what a job processed.' },
        { t: 'Switch the job to the Flex execution class so that it runs on spare capacity and skips the old files.', why: 'Flex changes the price and start time, not which files are read.' },
        { t: 'Enable job bookmarks so that each run reads only the data added since the last successful run.', why: 'built for incremental processing; off by default.' }], a: 2,
        why: 'Only new data = job bookmarks. Crawlers describe data; Flex schedules capacity.' } },
      { check: fromDrill('E2', 'Exam Q50') },
      { check: fromDrill('E27') },
      { check: fromDrill('E30') },
      { h: 'Amazon EMR' },
      '**EMR** runs the open-source big-data frameworks — **Apache Spark, Hadoop, Hive, HBase, Presto** and more — with AWS handling provisioning and configuration. You choose how it runs: **EMR on EC2** (clusters you size), **EMR on EKS**, **EMR on Outposts**, or **EMR Serverless** (no clusters to manage). It reads and writes S3 directly, and can use the Glue Data Catalog as its metastore.',
      { ul: [
        'Cluster roles: the **primary** node coordinates; **core** nodes run tasks and store HDFS data; **task** nodes only compute.',
        '**Spot**: put **task** nodes on Spot to cut cost; keep the primary and core nodes **On-Demand**, because a Spot interruption on a core node can lose HDFS data. Managed scaling adds and removes nodes with the load.',
        'Transient clusters: start a cluster for the nightly job, keep the data in S3, terminate when done — you pay only while it runs.'] },
      { pair: 'glue-emr' },
      { check: { id: 'ch10-spot', q: 'An EMR cluster runs nightly Spark jobs that write intermediate data to **HDFS**. The team wants to use Spot Instances safely. Where do they go?', opts: [
        { t: 'On the core nodes, keeping the primary node On-Demand because the core nodes can be replaced without any loss.', why: 'core nodes store HDFS — a reclaimed one can lose data.' },
        { t: 'On the task nodes, keeping the primary and core nodes On-Demand because the core nodes hold the HDFS data.', why: 'AWS’s guidance: core On-Demand to avoid HDFS loss, task nodes on Spot.' },
        { t: 'On the primary node, keeping core and task nodes On-Demand because the primary does no data processing.', why: 'losing the primary terminates the whole cluster.' }], a: 1,
        why: 'Spot where an interruption only costs time: task nodes.' } },
      { check: fromDrill('E3', 'Exam Q57') },
      { callout: '**AWS Data Pipeline** has been **closed to new customers since 25 July 2024**; AWS points to Glue, Step Functions or Amazon MWAA (managed Apache Airflow). Older banks use Data Pipeline for scheduled data movement — today that is a Glue job or workflow, or Step Functions.', kind: 'update' },
      { drills: ['E2', 'E3', 'E27', 'E30'] }
    ] },

    /* ---------------------------------------------------------------- 11 */
    { id: 'ch11', title: 'Athena, Lake Formation and Quick Sight', domains: 'D3 D4 D1', blocks: [
      'A **data lake** keeps raw and processed data as files in **S3**, described by the **Glue Data Catalog**. Three services sit on top of it: **Athena** to query, **Lake Formation** to govern, **Quick Sight** to show.',
      { h: 'Athena: SQL where the data is' },
      '**Amazon Athena** runs SQL directly on files in S3 — CSV, JSON, Parquet, ORC, Avro — using tables from the Data Catalog. There is nothing to load and no cluster. You pay **per query, by the data scanned**: the Athena pricing page works its examples at **$5 per TB**, and AWS quotes billing rounded up to the nearest megabyte with a **10 MB minimum** per query, with DDL statements and failed queries free. Capacity Reservations (billed per DPU-hour) are the alternative for steady, heavy use.',
      'Because the bill is bytes scanned, three habits cut it, by 30–90% in AWS’s guidance:',
      { ol: [
        '**Columnar formats** (Parquet, ORC): a query that needs 2 of 20 columns reads roughly those 2 columns, not whole rows.',
        '**Partitioning** (for example `year=/month=/day=` prefixes): a `WHERE` on the partition key skips every other partition.',
        '**Compression**: fewer bytes for the same rows.'] },
      { widget: 'scanCost' },
      { check: fromDrill('E28') },
      { ul: [
        '**Federated queries** reach data outside S3 (DynamoDB, RDS, on-premises databases) through **Lambda connectors** that run in your account.',
        '**Workgroups** separate teams and can cap how much data a query or the workgroup may scan.'] },
      { pair: 'athena-redshift' },
      { check: fromDrill('E6', 'Exam pattern') },
      { check: { id: 'ch11-parquet', q: 'A 3 TB table of uncompressed CSV has 4 equal columns. A query reads one column. After the data is converted to Parquet with 3:1 compression, roughly how much does the same query scan?', opts: [
        { t: 'About 0.25 TB — a third of the size from compression, and only one of four columns read.', why: 'the pricing page’s own example: 1 TB compressed, ¼ of it read = 0.25 TB ($1.25 at $5/TB).' },
        { t: 'About 1 TB — compression shrinks the files, but Athena still has to read every column of them.', why: 'Parquet is columnar; Athena reads only the needed column.' },
        { t: 'About 3 TB — Athena decompresses the files first and bills for the uncompressed size it reads.', why: 'billing is on bytes scanned in S3, after compression.' }], a: 0,
        why: 'Compression and columnar reads multiply: 3 TB → 1 TB → 0.25 TB.' } },
      { h: 'Lake Formation: who may see which rows and columns' },
      'S3 bucket policies and IAM see **objects**; they cannot hide a column inside a Parquet file. **AWS Lake Formation** adds permissions on the catalog: grants on databases, tables and **columns**, and **data filters** for **row- and cell-level** security. **LF-tags** let you grant by classification (`pii = no`) instead of table by table, and share across accounts. Athena, EMR, Glue and Redshift Spectrum enforce the grants. It is the built-for answer to “analysts may query the table but must not see the salary column”.',
      { check: { id: 'ch11-lf', q: 'Analysts query a customer table with Athena. They must **not see** the `email` and `phone` columns; the data team must see everything. What is the built-for control?', opts: [
        { t: 'An S3 bucket policy that denies the analysts’ role access to the email and phone columns of the objects.', why: 'S3 policies act on objects and prefixes, not on columns inside files.' },
        { t: 'Lake Formation column permissions on the table, granting analysts every column except email and phone.', why: 'column-level grants on the catalog, enforced by Athena.' },
        { t: 'An IAM policy on the analysts’ role that denies athena:GetQueryResults for queries that name those columns.', why: 'IAM cannot inspect the columns a query selects.' }], a: 1,
        why: 'Columns, rows and cells = Lake Formation. S3 and IAM stop at the object.' } },
      { check: fromDrill('E29') },
      { h: 'Quick Sight: dashboards' },
      '**Quick Sight** is AWS’s business-intelligence service: interactive dashboards and analyses over Athena, Redshift, RDS, S3 and many other sources, for many users, with the **SPICE** in-memory engine for fast interactive queries and **per-user** monthly pricing. Row-level security limits each reader to their own data.',
      { callout: 'Names changed: the BI service banks call **Amazon QuickSight** is now **AWS Quick Sight**, the business-intelligence capability inside **AWS Quick** (announced 9 November 2026; it was “Amazon Quick Sight” before that). Dashboards, SPICE and pricing are unchanged — answer it exactly as the banks expect.', kind: 'update' },
      { drills: ['E6', 'E28', 'E29'] }
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
      'E1–E4 are your baseline misses Q1, Q50, Q57 (the EMR half) and Q40; E5 and E6 carry the prestige pattern (Global Accelerator, Transit Gateway and Lake Formation offered where they have no role). Run the 30 scenarios once; your new misses appear in Progress.',
      { link: '#drill', text: 'Go to the drill (30 scenarios)', btn: true }
    ] }
  ];
})();
