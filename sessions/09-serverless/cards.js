/* Session 9 trigger cards (serverless, events, integration & analytics). f = what the exam says, b = the answer.
   line = transit line id or topic. Cards marked mine come from his baseline misses (Q1, Q40, Q50, Q57) and his
   prestige-distractor pattern (src 'Exam pattern'). Numbers: docs/session-09-serverless.md. */
(function () {
  'use strict';
  const S = window.SESSION = window.SESSION || {};
  const _c = (id, line, f, b, why, tempt, extra) => Object.assign({ id, line, f, b, why, tempt }, extra || {});
  S.cards = [
    /* choosing */
    _c('c01', 'choose', 'Decouple tiers, absorb spikes, workers at their own pace', 'Amazon SQS (scale workers on queue depth)', 'Messages wait up to 14 days until one consumer takes each.', 'SNS (a standard topic stores nothing).'),
    _c('c02', 'choose', 'One event must reach several independent services, each at its own pace', 'SNS topic → one SQS queue per service (fan-out)', 'The topic copies; each queue buffers its own copy.', 'One shared SQS queue (consumers split the messages).'),
    _c('c03', 'choose', 'Several apps read every record, in order per key, and replay', 'Kinesis Data Streams', 'Retention 24 h – 365 days; each consumer keeps its own position.', 'SQS (a message goes to one consumer and is deleted).'),
    _c('c04', 'choose', 'Existing JMS / ActiveMQ / RabbitMQ app, managed broker, minimal code change', 'Amazon MQ', 'Same protocols; only the endpoint changes.', 'SQS or MSK (a rewrite).'),
    _c('c05', 'choose', 'Decoupling problem, and an option adds Global Accelerator or Transit Gateway', 'Cross it out — prestige distractor; the answer is a buffer (SQS)', 'Network services move packets; they hold no work.', 'Picking the most impressive service.', { mine: true, src: 'Exam pattern' }),
    /* SQS */
    _c('c06', 'sqs', 'Messages processed twice; processing takes longer than 30 s; nothing crashes', 'Raise the visibility timeout above the processing time', 'Default 30 s, up to 12 hours; or extend it from the worker.', 'FIFO with deduplication.'),
    _c('c07', 'sqs', 'In order per customer/account, no duplicates, parallel across customers', 'SQS FIFO queue, message group ID = customer ID', 'Order per group; deduplication within 5 minutes.', 'One message group for everything (no parallelism).'),
    _c('c08', 'sqs', 'A poison message keeps failing and blocks the workers', 'Dead-letter queue via a redrive policy (maxReceiveCount), then redrive', 'FIFO queues need a FIFO DLQ.', 'Raising the visibility timeout.'),
    _c('c09', 'sqs', 'Many empty ReceiveMessage responses, rising SQS cost', 'Long polling (receive wait time up to 20 s)', 'Fewer, fuller responses.', 'A delay queue.'),
    _c('c10', 'sqs', 'Postpone processing of new messages by a few minutes', 'Delay queue (or a message timer), up to 15 minutes', 'Hidden on arrival, not after a receive.', 'Visibility timeout.'),
    _c('c11', 'sqs', 'Message payload larger than 1 MiB', 'SQS Extended Client Library (payload in S3, up to 2 GB)', 'SQS itself now takes up to 1 MiB.', 'Splitting the message by hand.', { update: 'SQS messages up to 1 MiB since Aug 2025 (was 256 KiB).' }),
    /* SNS */
    _c('c12', 'sns', 'Each subscriber should receive only some of the messages', 'SNS subscription filter policies', 'Up to 200 filter policies per topic.', 'A separate topic per message type.'),
    _c('c13', 'sns', 'Email, SMS or mobile push alert to people', 'Amazon SNS', 'Push to people; EventBridge would route to SNS anyway.', 'SQS (people do not poll queues).'),
    _c('c14', 'sns', 'Ordered fan-out to several ordered consumers', 'SNS FIFO topic → SQS FIFO queues', 'FIFO topics deliver only to SQS queues.', 'SNS FIFO straight to Lambda or email.'),
    /* EventBridge */
    _c('c15', 'eb', 'React when an AWS service changes state (EC2 stopped, GuardDuty finding)', 'EventBridge rule on the default event bus', 'AWS service events arrive there by themselves.', 'Polling with Lambda, or a CloudWatch alarm.'),
    _c('c16', 'eb', 'Events from a SaaS application, no webhook to host', 'EventBridge partner event source → partner event bus', 'Rules then route by content.', 'API Gateway + Lambda webhook.'),
    _c('c17', 'eb', 'Millions of one-time schedules, each in the user’s time zone', 'EventBridge Scheduler (at() schedules)', 'Universal targets, flexible windows.', 'A rule per schedule (300 rules per bus by default).'),
    _c('c18', 'eb', 'Stream or queue → filter → enrich → one target, no code', 'EventBridge Pipes', 'Sources: SQS, Kinesis, DynamoDB Streams, MSK, Amazon MQ.', 'A Lambda poller.'),
    _c('c19', 'eb', 'One rule must reach more than 5 targets', 'More rules, or one SNS target that fans out', 'Targets per rule: 5, fixed.', 'A quota increase (not adjustable).', { update: 'Events up to 1 MB since Jan 2026; the new Custom Event Bus routes to subscribers with retention and replay.' }),
    /* streams */
    _c('c20', 'stream', 'Write throttling on a provisioned Kinesis stream', 'More shards (1 MB/s or 1,000 records/s each), or on-demand mode — and a key that spreads', 'Check the data rate and the record rate.', 'Enhanced fan-out (a read feature).'),
    _c('c21', 'stream', 'Several Kinesis consumers need dedicated read throughput, low latency', 'Enhanced fan-out (2 MB/s per shard per consumer, ~70 ms)', 'Shared consumers split 2 MB/s per shard.', 'Random partition keys.'),
    _c('c22', 'stream', 'Existing Apache Kafka producers and consumers, managed service', 'Amazon MSK — MSK Provisioned (Standard or Express brokers) or MSK Serverless', 'Keep the Kafka APIs; MSK Connect for connectors.', 'Kinesis (rewrite).'),
    _c('c23', 'stream', 'Real-time SQL / windowed anomaly detection on a stream (new design)', 'Amazon Managed Service for Apache Flink', 'Kinesis Data Analytics for SQL applications were deleted from 27 Jan 2026.', 'Kinesis Data Analytics for SQL.', { update: 'KDA for SQL: no new apps from 15 Oct 2025; deleted from 27 Jan 2026.' }),
    /* Firehose */
    _c('c24', 'firehose', 'Store streaming data in S3 / Redshift / OpenSearch, near real time, least ops', 'Amazon Data Firehose', 'Buffers and delivers with no code; no shards, no consumers.', 'A Lambda or EC2 consumer (your Q1 pick).', { mine: true, src: 'Exam Q1' }),
    _c('c25', 'firehose', 'Convert streaming JSON to Parquet before it lands in S3', 'Firehose record format conversion (Glue Data Catalog schema)', 'Columnar files for cheaper Athena queries.', 'A Lambda transform that writes Parquet.'),
    _c('c26', 'firehose', 'Consumers must replay last week’s records', 'Not Firehose — Kinesis Data Streams (retention)', 'Firehose delivers and forgets.', 'Re-reading the Firehose stream.'),
    /* Lambda / API Gateway */
    _c('c27', 'lambda', 'Keep failed async invocations with the error and stack trace', 'Lambda on-failure destination (SQS, SNS, S3, Lambda, EventBridge)', 'Async: 2 retries, up to 6 h, then discarded.', 'A DLQ (original event only).'),
    _c('c28', 'lambda', 'One failed SQS message makes the whole batch reprocess', 'ReportBatchItemFailures (partial batch response)', 'Only failed message IDs return to the queue.', 'Batch size 1.'),
    _c('c29', 'lambda', 'Cold starts on a latency-sensitive, predictable workload', 'Provisioned concurrency (or SnapStart — never both)', 'Pre-initialised environments; charged.', 'Reserved concurrency (a cap, not warm-up).'),
    _c('c30', 'lambda', 'Job runs longer than 15 minutes', 'Not one Lambda invocation — Step Functions, ECS/Fargate or Glue', 'Lambda timeout: 900 s.', 'Raising the timeout past 15 minutes.'),
    _c('c31', 'lambda', 'API keys per client, usage quotas, caching, AWS WAF', 'API Gateway REST API', 'HTTP APIs are cheaper but lack these.', 'HTTP API.', { update: 'The REST integration timeout can now be raised above 29 s for Regional and private APIs.' }),
    /* Step Functions */
    _c('c32', 'sfn', 'Workflow with a manual approval that can take days', 'Step Functions Standard + .waitForTaskToken', 'Standard runs up to 1 year; Express stops at 5 minutes.', 'Express workflow.'),
    _c('c33', 'sfn', 'Amazon SWF in the options for a new workflow', 'Step Functions — AWS recommends it for new applications', 'SWF still exists for external signals and parent/child processes.', 'SWF (your Q40).', { mine: true, src: 'Exam Q40' }),
    _c('c34', 'sfn', 'Thousands of short, idempotent workflows per second, cheapest', 'Step Functions Express', 'Priced by executions and duration.', 'Standard (priced per state transition).'),
    _c('c35', 'sfn', 'Process millions of S3 objects in parallel, serverless', 'Step Functions Distributed Map (Standard)', 'Up to 10,000 parallel child executions.', 'Inline Map (one execution’s history).'),
    /* Glue / EMR */
    _c('c36', 'etl', 'ETL with the LEAST operational overhead', 'AWS Glue (crawler, Data Catalog, serverless job)', 'Nothing to size or patch; bookmarks for new data only.', 'Amazon EMR (your Q50 detour).', { mine: true, src: 'Exam Q50' }),
    _c('c37', 'etl', 'Big data processing with existing Spark / Hadoop / Hive jobs', 'Amazon EMR (Spot task nodes, On-Demand core)', 'Then Redshift for SQL/BI (Session 8).', 'Glue rewrite or Lambda.', { mine: true, src: 'Exam Q57' }),
    _c('c38', 'etl', 'Scheduled data movement in a new design (bank says Data Pipeline)', 'Glue job/workflow or Step Functions (or MWAA)', 'Data Pipeline closed to new customers since 25 Jul 2024.', 'AWS Data Pipeline.', { update: 'AWS Data Pipeline closed to new customers (Jul 2024).' }),
    /* Athena / Lake Formation / Quick Sight */
    _c('c39', 'query', 'Ad hoc SQL on data in S3, pay per query, no loading', 'Amazon Athena (Parquet + partitions to scan less)', '$5 per TB scanned in the pricing example; 10 MB minimum.', 'A Redshift cluster for occasional queries.'),
    _c('c40', 'query', 'Analysts must not see some columns or other regions’ rows in the data lake', 'AWS Lake Formation (column grants, data filters, LF-tags)', 'Enforced for Athena, EMR, Glue, Redshift Spectrum.', 'S3 bucket policies or IAM.')
  ];
})();
