# Session 9 — Serverless, Events & Analytics: build brief

Built as `sessions/09-serverless/` on the same engine and design as Sessions 1–8. Follows CONTEXT.md §9. Cluster 9 in §5: choosing the integration service (queue, topic, bus or stream), SQS (standard vs FIFO, visibility timeout, DLQ and redrive, long polling, delay queues, fair queues), SNS fan-out (filter policies, FIFO topics), EventBridge (buses, rules, Pipes, Scheduler, the new Custom Event Bus), Kinesis Data Streams and MSK (shards, ordering, replay, on-demand, enhanced fan-out), Amazon Data Firehose (delivery, buffering, Parquet conversion, Lambda transform), Lambda and API Gateway (limits, invocation models, retries, destinations, concurrency, SnapStart; REST vs HTTP vs WebSocket, throttling, caching), Step Functions (Standard vs Express, service integrations, Distributed Map, SWF today), Glue and EMR (ETL, crawlers, Data Catalog, job bookmarks, deployment options, Spot), Athena, Lake Formation and Quick Sight, plus Amazon MQ and AWS Data Pipeline as named switches. Domains **D1 · D2 ●● D3 ●● D4 ●●** (mixed); manifest `domains: 'D2 D3 D4'`.

His record here: baseline **Q1** (Firehose vs Lambda — tag **C**), **Q40** (SWF — tag **F**), **Q50** (“least ops” → Glue — tag **K**), **Q57** (“big data + SQL/BI” → EMR + Redshift — tag **K**, the EMR half; Session 8 drill B2 keeps the Redshift half) and the **prestige-distractor pattern** (CONTEXT §3). Drills **E1** (`src: 'Exam Q1'`), **E2** (`'Exam Q50'`), **E3** (`'Exam Q57'`), **E4** (`'Exam Q40'`), **E5–E6** (`'Exam pattern'`) and the matching cards carry `mine: true`. The original wording of Q1, Q40, Q50 and Q57 is not in the repo; the drills are reconstructed from the one-line summaries in CONTEXT §3. RDS Proxy for Lambda is Session 8 ch4 (linked, not repeated); Redshift is Session 8 ch10 (named as a station only); KMS depth is Session 5.

## Colour rule

The same service keeps the same colour on every page. **Session 9 adds no hue**: every family is an **ink line** (4 px), told apart by dash and station shape, always labelled. None of these services has a line in Sessions 1–8, so no earlier dash is inherited. Chart bars stay ink.

| Line (`id`) | Dash | Stations |
|---|---|---|
| SQS · DLQ (`sqs`) | solid | circles |
| SNS (`sns`) | `2 7` | triangles |
| EventBridge · Pipes · Scheduler (`eb`) | `10 6` | hexagons |
| Kinesis Data Streams · MSK (`stream`) | `1 9` | diamonds |
| Amazon Data Firehose (`firehose`) | `24 8` | pentagons |
| Step Functions (`sfn`) | `6 4` | squares |
| Lambda · API Gateway (`lambda`) | `12 8` | rings |
| Glue · EMR (`etl`) | `16 5 3 5` | squares with an inner dot |
| Athena · Lake Formation · Quick Sight (`query`) | `18 4` | big circles |

Topic (neutral chip): `choose` = Choosing the integration. Amazon MQ, SWF, MSK Connect and Data Pipeline are named in prose and as switches, with no line.

## Facts verified 2026-11-10 (AWS MCP documentation tools: `search_documentation`, `read_documentation`)

Rows that contradict older course material (marked ⚑) were re-read from the page itself, not from a search snippet. The AWS MCP server answered throughout this run; the WebFetch fallback was not needed.

**SQS**
- ⚑ Max message **1 MiB** (was 256 KiB), standard and FIFO; the Lambda SQS event source mapping takes 1 MiB too; posted 4 Aug 2025 — https://aws.amazon.com/about-aws/whats-new/2025/08/amazon-sqs-max-payload-size-1mib/
- Message quotas: size 1 byte–1 MiB; **Extended Client Library** (Java, Python) puts the payload in S3, up to **2 GB**, synchronous clients only; retention default **4 days**, min 60 s, max **14 days**; batch max **10** messages; 10 message attributes; message timer 0–15 min; **visibility timeout default 30 s, min 0, max 12 hours**; standard throughput “very high, nearly unlimited”; FIFO **300 TPS per API action per partition**, **3,000 msg/s with batching** (non-high-throughput); **high-throughput FIFO** up to 70,000 TPS (N. Virginia, Oregon, Ireland), 19,000 (Ohio, Frankfurt), 9,000 (Mumbai, Singapore, Sydney, Tokyo, Spain), 4,500 (London, São Paulo), 2,400 elsewhere, ×10 with batching; `MessageGroupId` in standard queues enables **fair queues** — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html
- Queue quotas: delay queue 0 s default, max **15 minutes**; long polling max **20 s**; backlog unlimited; **~120,000 in-flight** for most standard queues (`OverLimit` on short polling) — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-queues.html
- Visibility timeout behaviour (default 30 s; at-least-once means a message can arrive more than once even inside the timeout; FIFO in-flight “depends on active message groups”) — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- FIFO deduplication: **5-minute** deduplication interval, content-based deduplication hashes the body; `MessageGroupId` = strict order inside a group — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queue-message-identifiers.html
- Redrive policy (`maxReceiveCount`); the DLQ of a FIFO queue must be FIFO, of a standard queue standard — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.CfnQueueProps.html (the CloudFormation `AWS::SQS::Queue` property text as reproduced in the CDK reference; also states the 0–43,200 s visibility range)
- Fair queues (standard queues, `MessageGroupId` = tenant, noisy-neighbour mitigation, no consumer change) — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fair-queues-detailed.html
- FIFO DLQ redrive supported — https://aws.amazon.com/blogs/aws/announcing-throughput-increase-and-dead-letter-queue-redrive-support-for-amazon-sqs-fifo-queues/
- SQS history: first beta late 2004, production launch 2006 (replaces the unverified “oldest AWS service”) — https://aws.amazon.com/blogs/aws/amazon-sqs-15-years-and-still-queueing/

**SNS**
- ⚑ Payload default **256 KiB**; up to **1 MiB** by setting the topic attribute `MaximumMessageSize` (Standard and FIFO topics); above 256 KiB only **SQS, Firehose and Lambda** subscriptions and at most **100** subscriptions per topic; posted 18 Sep 2026 — https://docs.aws.amazon.com/sns/latest/dg/large-message-payloads.html · https://aws.amazon.com/about-aws/whats-new/2026/09/amazon-sns-1mib-support/
- 100,000 standard topics per account; filter policies **200 per topic, 10,000 per account**; filter policy max 5 keys — https://docs.aws.amazon.com/sns/latest/dg/subscription-filter-policy-constraints.html · https://aws.amazon.com/sns/faqs/
- Extended Client Library payloads up to 2 GB — https://docs.aws.amazon.com/general/latest/gr/sns.html
- SNS FIFO delivers to SQS FIFO and SQS standard queues; not to email, SMS, mobile push, HTTP(S); Lambda only through a queue — https://docs.aws.amazon.com/sns/latest/dg/fifo-message-delivery.html
- SNS FIFO message archiving and replay (FIFO topics only): the topic owner enables an archive (`ArchivePolicy`, retention up to **365 days**); a subscriber replays a time window through the subscription’s `ReplayPolicy`. Standard topics keep nothing, so “topics store nothing” is printed only for standard topics — https://docs.aws.amazon.com/sns/latest/dg/fifo-message-archiving-replay.html · https://docs.aws.amazon.com/sns/latest/dg/message-archiving-and-replay-topic-owner.html

**EventBridge**
- ⚑ Event payload **1 MB** (was 256 KB), posted 29 Jan 2026; at that launch not in Asia Pacific (New Zealand, Thailand, Malaysia, Taipei) or Mexico (Central) — https://aws.amazon.com/about-aws/whats-new/2026/01/amazon-eventbridge-increases-event-payload-size-256-kb-1-mb/
- Custom Event Bus - Classic quotas: **300 rules per bus** (100 in af-south-1, eu-south-1), adjustable; **5 targets per rule**, fixed; 100 event buses per account — https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-quota.html
- Scheduled rules (legacy) can be created only on the default event bus (E13’s cron distractor) — https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
- SaaS partner sources include Datadog and Zendesk (named in the `sns-eb` pair) — https://aws.amazon.com/documentation-overview/eventbridge/ · partner event source → Custom Event Bus - Classic — https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-saas.html
- Classic retry policy: by default retries **24 hours / up to 185 attempts**, then drops the event or sends it to a DLQ (an SQS queue); `MaximumEventAgeInSeconds` 60–86,400, `MaximumRetryAttempts` 0–185 — https://aws.amazon.com/blogs/compute/improved-failure-recovery-for-amazon-eventbridge/ · https://repost.aws/knowledge-center/eventbridge-resolve-failedinvocation-errors
- ⚑ The new **Custom Event Bus** (subscribers, one target each; retention 1–365 days; FIFO per event group; replay from a starting position; deduplication; shared through AWS RAM) beside **Custom Event Bus - Classic** (rules, up to 5 targets per rule, archive for replay) — https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-custom-bus-what-is.html
- Pipes: source → optional filter → optional enrichment → one target; sources DynamoDB stream, Kinesis stream, Amazon MQ, MSK, self-managed Kafka, SQS; charged only for events that pass the filter — https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes.html · https://repost.aws/knowledge-center/eventbridge-filter-events-with-pipes
- Scheduler: one-time `at()`, `rate()` and cron schedules, a time zone per schedule, flexible time windows, universal targets — https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html · https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-schedule-flexible-time-windows.html

**Kinesis Data Streams · MSK**
- Provisioned shard: write **1 MB/s or 1,000 records/s**; read **2 MB/s** (shared by all `GetRecords` consumers), **5** `GetRecords` calls per second per shard; ⚑ record payload up to **10 MiB** (“intermittent large records 1–10 MiB using burst capacity”); on-demand: new stream **4 MB/s write, 8 MB/s read**, scales to 10 GB/s write in N. Virginia, Oregon, Ireland and 200 MB/s elsewhere; switch modes **twice per 24 h**; retention min **24 h**, max **8,760 h (365 days)**; 20 registered enhanced fan-out consumers per stream (50 with On-demand Advantage) — https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
- Enhanced fan-out: **2 MB/s per shard per consumer**, pushed over HTTP/2, about **70 ms** vs about **200 ms** with one shared consumer — https://docs.aws.amazon.com/streams/latest/dev/enhanced-consumers.html
- MSK Provisioned with Standard and Express brokers (Express: MSK-managed storage, up to 3x throughput per broker, scale up to 20x faster; no in-place conversion) — https://docs.aws.amazon.com/msk/latest/developerguide/broker-instance-types.html · https://aws.amazon.com/msk/features/
- MSK Serverless: no capacity to manage, pay for throughput, IAM access control required; MSK Connect runs Kafka connectors without servers — https://docs.aws.amazon.com/msk/latest/developerguide/serverless.html · https://aws.amazon.com/blogs/database/stream-data-with-amazon-documentdb-amazon-msk-serverless-and-amazon-msk-connect/
- Amazon MQ: managed ActiveMQ and RabbitMQ for moving existing brokers (JMS, standard protocols) with minimal code change; Amazon MQ for ActiveMQ “simplifies the migration of commercial brokers, such as IBM MQ and TIBCO Enterprise Management Service (EMS)” — https://docs.aws.amazon.com/amazon-mq/latest/migration-guide/concept-chapter-about.html

**Amazon Data Firehose**
- Name “Amazon Data Firehose” (banks: Kinesis Data Firehose); destinations S3, Redshift, OpenSearch Service, Snowflake, Apache Iceberg tables, Splunk, Datadog, New Relic, Dynatrace, Sumo Logic, LogicMonitor, MongoDB, HTTP endpoint; S3 buffer **1–128 MB** and interval **0–900 s**, first condition met triggers delivery; with Parquet/ORC conversion or dynamic partitioning the S3 buffer is 64–128 MB — https://aws.amazon.com/firehose/faqs/
- Zero buffering (26 Dec 2023; before that the minimum interval was 60 s); not for dynamic partitioning — https://aws.amazon.com/about-aws/whats-new/2023/12/amazon-kinesis-data-firehose-zero-buffering/ · https://docs.aws.amazon.com/firehose/latest/dev/create-configure-backup.html
- Amazon MSK as a Firehose source — https://docs.aws.amazon.com/help-panel/firehose/latest/console/kdf-delivery-stream-source-msk.html (which destinations an MSK source allows is not printed; see “Not verified”)
- Record format conversion JSON → Parquet/ORC with the schema from the Glue Data Catalog (S3 destination) — https://docs.aws.amazon.com/help-panel/firehose/latest/console/kdf-delivery-stream-record-conversion.html
- Kinesis Data Analytics for SQL: no new applications from 15 Oct 2025, applications deleted from **27 Jan 2026**; use Managed Service for Apache Flink — https://docs.aws.amazon.com/kinesisanalytics/latest/dev/discontinuation.html
- Amazon Kinesis Data Analytics was renamed **Amazon Managed Service for Apache Flink** (“previously known as Amazon Kinesis Data Analytics for Apache Flink”) — the basis of the E19 / ch7 exam-day rule (an option that says only “Kinesis Data Analytics” with no Flink option is the bank’s answer) — https://aws.amazon.com/blogs/aws/announcing-amazon-managed-service-for-apache-flink-renamed-from-amazon-kinesis-data-analytics/ · https://docs.aws.amazon.com/cli/latest/reference/kinesisanalyticsv2/index.html

**Lambda**
- Timeout **900 s**; memory **128–10,240 MB**; `/tmp` 512–10,240 MB; ⚑ payload **6 MB** sync request/response, 200 MB streamed response, **1 MB async** (older material: 256 KB); concurrency **1,000** per Region default (new accounts start lower); scaling **1,000 execution environments every 10 s** per function; packages 50 MB zipped / 250 MB unzipped / container 10 GB; 5 layers; Managed Instances up to **90 min** (5,400 s) for asynchronous invocations and event-source-mapping invocations **except Amazon MQ and Amazon DocumentDB** (synchronous stays 15 min) — https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html · https://aws.amazon.com/blogs/compute/announcing-90-minute-function-timeout-on-aws-lambda-managed-instances/
- Async: retries **twice** on a function error, event kept up to **6 hours**; DLQ = SQS queue or SNS topic — https://docs.aws.amazon.com/help-panel/lambda/latest/console/configuration-async.html · retries configurable **0–2**; destinations carry request and response details including stack traces and are preferred over DLQs — https://aws.amazon.com/blogs/compute/implementing-aws-lambda-error-handling-patterns/ · https://aws.amazon.com/blogs/compute/introducing-aws-lambda-destinations/ · async destination types: standard SQS queue, standard SNS topic, **S3 bucket**, Lambda function, EventBridge bus; **S3 for on-failure only** — https://docs.aws.amazon.com/lambda/latest/api/API_PutFunctionEventInvokeConfig.html
- Event source mappings: batch size SQS default **10**, standard queues up to **10,000**, FIFO up to 10; Kinesis/DynamoDB default 100, max 10,000; batching window **0–300 s** (batch > 10 needs at least 1 s); `ReportBatchItemFailures`; `BisectBatchOnFunctionError`; `ParallelizationFactor` **1–10** (Kinesis, DynamoDB Streams); on-failure destinations SQS, SNS, Kafka topic, S3 — https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html · partial batch responses — https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- Reserved concurrency = maximum and minimum for one function, no charge; provisioned concurrency = pre-initialised environments, charged — https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html · provisioned concurrency keeps functions “ready to respond in double-digit milliseconds” — https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html
- SnapStart: Java 11+, Python 3.12+, .NET 8+; not with provisioned concurrency, EFS, **Amazon S3 Files**, or `/tmp` > 512 MB; published versions only — https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html
- Durable functions (checkpoint, suspend up to one year, no compute charge while waiting) — https://aws.amazon.com/lambda/lambda-durable-functions/ · Managed Instances (EC2 capacity provider; EC2 Savings Plans and RIs apply) — https://docs.aws.amazon.com/lambda/latest/dg/lambda-managed-instances.html · https://repost.aws/knowledge-center/lambda-reduce-costs

**API Gateway**
- Account throttle **10,000 RPS** per Region with a **5,000** burst bucket (2,500 / 1,250 in some newer Regions) — https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html
- ⚑ REST API integration timeout **50 ms–29 s**; can be raised above 29 s for **Regional and private** REST APIs (not edge-optimized), possibly with a lower Region throttle; payload **10 MB**; cache TTL default **300 s**, 0–3,600 s — https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-execution-service-limits-table.html
- HTTP API: max integration timeout **30 s**, payload 10 MB — https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html · REST adds API keys, per-client throttling, request validation, AWS WAF, private endpoints, caching; HTTP API is cheaper with fewer features, has JWT authorizers — https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html

**Step Functions · SWF**
- Standard: up to **1 year**, exactly-once, **25,000** history events per execution, history kept **90 days**, priced per state transition; Express: up to **5 minutes**, async at-least-once / sync at-most-once, priced by executions, duration and memory, no `.sync` or `.waitForTaskToken`, no Distributed Map, no activities — https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html · https://docs.aws.amazon.com/step-functions/latest/dg/service-quotas.html
- Payload **256 KiB** per task, state or execution; Distributed Map up to **10,000** parallel child executions; redrive within 14 days (Standard); `StartExecution` for **Express** defaults to a bucket of 6,000 and a refill of **6,000 per second** in every Region, a soft quota that can be raised (E25’s 20,000 events/s needs a raise) — https://docs.aws.amazon.com/step-functions/latest/dg/service-quotas.html
- SWF still available; AWS recommends Step Functions for new applications; SWF when external signals must intervene or child processes return results to a parent — https://docs.aws.amazon.com/amazonswf/latest/developerguide/welcome.html · https://aws.amazon.com/step-functions/faqs/

**Glue · EMR · Data Pipeline**
- Glue Data Catalog = shared, Hive-metastore-compatible catalog for Athena, EMR, Redshift Spectrum; crawlers infer schemas from S3 — https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-hive-metastore-glue.html · https://aws.amazon.com/glue/faqs/
- Job bookmarks (process only new data since the last run; disabled by default) — https://docs.aws.amazon.com/glue/latest/dg/monitor-continuations.html · serverless ETL, Flex execution class for time-insensitive jobs — https://aws.amazon.com/blogs/big-data/process-data-with-varying-data-ingestion-frequencies-using-aws-glue-job-bookmarks/
- Glue DataBrew: visual, no-code data preparation, 250+ transformations, serverless — https://docs.aws.amazon.com/databrew/latest/dg/what-is.html
- EMR on EC2, on EKS, on Outposts, EMR Serverless — https://docs.aws.amazon.com/whitepapers/latest/cost-modeling-data-lakes/cost-optimization-in-analytics-services.html · core nodes On-Demand to avoid HDFS data loss, task nodes on Spot — https://docs.aws.amazon.com/emr/latest/ManagementGuide/managed-scaling-allocation-strategy.html · https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-plan-instances-guidelines.html
- AWS Data Pipeline closed to new customers since 25 Jul 2024; migrate to Glue, Step Functions or MWAA — https://aws.amazon.com/blogs/big-data/migrate-workloads-from-aws-data-pipeline/

**Athena · Lake Formation · Quick Sight**
- Athena pricing: per query on data scanned, **$5 per TB** (the pricing page’s worked example: 3 TB of uncompressed text → $15; gzip 3:1 → 1 TB → $5; Parquet 3:1 reading one of four columns → 0.25 TB → $1.25); or Capacity Reservations per DPU-hour; results and data billed at S3 rates; federated queries invoke Lambda in your account — https://aws.amazon.com/athena/pricing/ · rounded up to the nearest MB, **10 MB minimum** per query, DDL and failed queries free, compress + partition + columnar saves **30–90%** — https://docs.aws.amazon.com/whitepapers/latest/big-data-analytics-options/amazon-athena.html
- Lake Formation: column-, row- and cell-level security through data filters — https://docs.aws.amazon.com/lake-formation/latest/dg/data-filtering.html · LF-tags (tag-based access control) and cross-account grants — https://docs.aws.amazon.com/lake-formation/latest/dg/cross-account-TBAC.html
- ⚑ **AWS Quick Sight**: “Amazon Quick is now AWS Quick … Amazon Quick Sight, the business intelligence capability in Quick, is now AWS Quick Sight” (posted 9 Nov 2026); SPICE in-memory engine; monthly per-user pricing; row-level security — https://aws.amazon.com/about-aws/whats-new/2026/11/amazon-quick-aws-quick/ · https://aws.amazon.com/quick/quicksight/faqs/

### Changed since the exam guide (shown as callouts)

| Old (banks / older courses) | Now | Source |
|---|---|---|
| SQS message 256 KB | **1 MiB**, standard and FIFO (Aug 2025); Extended Client Library above that (up to 2 GB via S3) | whats-new 2025/08, quotas-messages |
| SNS topics store nothing | still true for **standard** topics; **FIFO** topics have an opt-in archive (up to 365 days) and replay per subscription | fifo-message-archiving-replay |
| SNS message 256 KB | default still **256 KiB**; **1 MiB opt-in** with `MaximumMessageSize` (Sep 2026) — then only SQS, Firehose, Lambda subscribers, ≤ 100 subscriptions | large-message-payloads, whats-new 2026/09 |
| EventBridge event 256 KB | **1 MB** (Jan 2026; at launch a few Regions were excluded) | whats-new 2026/01 |
| EventBridge = buses + rules (5 targets) | + the new **Custom Event Bus** (subscribers, built-in retention, FIFO per group, replay, dedup, RAM sharing); rules buses are now “Custom Event Bus - Classic” | eb-custom-bus-what-is |
| Kinesis record 1 MB | **10 MiB** records (burst capacity) | service-sizes-and-limits |
| Kinesis = shards you provision | + **on-demand** mode (new streams 4 MB/s write, scaling to 10 GB/s in three Regions); retention up to **365 days** | service-sizes-and-limits |
| Kinesis Data Firehose, 60 s minimum buffer | **Amazon Data Firehose**; **zero buffering** (Dec 2023) | Firehose FAQ, whats-new 2023/12 |
| Kinesis Data Analytics for SQL | **no new apps from 15 Oct 2025, deleted from 27 Jan 2026** → Managed Service for Apache Flink (the renamed Flink flavour; a bare “Kinesis Data Analytics” option with no Flink option is still the bank’s answer) | discontinuation, Flink rename blog |
| Lambda async payload 256 KB | **1 MB** | gettingstarted-limits |
| Lambda = stateless, ≤ 15 min | + **durable functions** (suspend up to a year) and **Managed Instances** (EC2 capacity, up to 90 min for async and for ESMs other than Amazon MQ and DocumentDB) | durable functions page, lambda-managed-instances |
| API Gateway 29 s hard limit | **raisable above 29 s** for Regional and private REST APIs | execution-service-limits-table |
| Amazon QuickSight | **AWS Quick Sight**, the BI capability of **AWS Quick** (Nov 2026) | whats-new 2026/11 |
| MSK = brokers you size | + **Express brokers** and **MSK Serverless** | broker-instance-types, serverless |
| AWS Data Pipeline | **closed to new customers** (Jul 2024) → Glue, Step Functions, MWAA | Data Pipeline migration blog |

### Not verified → not printed
- SNS subscriptions per topic: the SNS FAQ says 10 million, the endpoints-and-quotas row read during planning said 12,500,000 — the pages disagree, so no number is printed.
- SNS FIFO throughput; SNS FIFO topic and subscription counts (not needed).
- Which destinations a Firehose stream with an **MSK source** may use: the console help panel says S3 only, while an AWS Big Data Blog post shows MSK → Apache Iceberg tables. The sources conflict, so the lesson, CONTEXT and this brief print only “an MSK topic” as a source, with no destination restriction.
- Quick Sight user counts: the AWS overview whitepaper says it scales to “tens of thousands of users”, the Quick Sight product page says embedded analytics scale to “100s of 1000s of users”. The draft’s “hundreds of thousands of users” was neutralised to “many users”.
- EventBridge 1 MB Regions today: no current page lists exclusions, so the lesson says only which Regions were excluded at the January 2026 launch (“a few newer Regions”).
- SQS FIFO in-flight limit (API reference 120,000; visibility-timeout page “depends on active message groups”).
- SQS fair queues launch date; Kinesis 10 MiB launch date; Custom Event Bus launch date; durable functions and Managed Instances launch dates; Firehose rename date; the date of the first QuickSight → Quick Sight rename (the 9 Nov 2026 page only names “Amazon Quick Sight → AWS Quick Sight”; the plan’s “Quick Suite” step is not on the page and is not printed).
- Kinesis “On-demand Advantage” mode beyond its name and the 50-consumer quota; streaming tables / S3 delivery.
- Lambda “MicroVMs” and “Web Functions” (sections on the quota page; not named in the lesson).
- API Gateway WebSocket quotas, usage-plan details beyond “REST has them, HTTP does not”.
- Glue streaming ETL, current Glue version, Glue prices, DPU figures; Lake Formation blueprints status; MSK Kafka message-size defaults; AppFlow, AppSync, MWAA details, Glue zero-ETL, S3 Tables, Managed Service for Apache Flink details beyond its name.
- Athena price outside the pricing page’s worked example (no Region-specific price table could be read); Athena query result reuse.
- The page itself is inconsistent on Kinesis write limits: the quota table says 1 MB/s per shard and the `PutRecords` row says 1 MB/s, but the `PutRecord` row says “10MiB per second”. The lesson and `shardCalc` use **1 MB/s or 1,000 records/s** and mention burst capacity for occasional large records.
- Cut from the draft because no page was read for them: Express workflow history in CloudWatch Logs; Standard workflows starting Express children; Glue Python shell jobs; Amazon MQ’s protocol list beyond “JMS and standard protocols”; WebSocket API endpoint types; scheduled scaling of provisioned concurrency; Step Functions “200+ service integrations”; Lambda per-millisecond billing.
- Derived numbers in the widgets (shard counts, scan sizes, scan costs, DLQ timing) are computed from the verified inputs above and labelled derived; every scenario value is labelled the learner’s setting.

### Noticed for Session 8 (not changed here)
Session 8’s `olap` pair and ch10 call Athena “Session 9” — now true. Session 8 ch7 mentions “Kinesis Data Streams for DynamoDB … (Session 9)”; this session does not cover that integration in depth.

## Stub for this session (replaces Session 8’s slots)

| Slot | Values | Why this slot |
|---|---|---|
| PATTERN | queue · fan-out · event routing · stream · workflow · ETL · ad hoc query | The integration shape picks the family before any service name: one consumer per message (queue), copies to many (fan-out), rules on events (routing), ordered replayable records (stream), steps with state (workflow), transform (ETL), SQL on files (query). |
| DELIVERY | ordered · exactly once · replay · at least once · none stated | Kills standard SQS for ordering, Firehose and SQS for replay, Express workflows for exactly-once. |
| LATENCY | real time · near real time · batch | Real time = streams and push; near real time = Firehose buffering; batch = Glue, EMR, Athena. |
| SUPERLATIVE | cheapest · least ops · fastest · none stated | Least ops picks the managed, serverless or no-code feature (Firehose conversion, Glue, Pipes, Scheduler); cheapest picks pay-per-use and fewer bytes scanned. |

Each drill’s `stub` records what the stem literally states (`any` / `none stated` otherwise). The stub is optional and unscored.

## Learn: 12 chapters (full text in `learn.js`; ▶ = interactive)

1. **How to read an integration question** — record table (Q1, Q40, Q50, Q57, prestige), stub, method, built-for hooks. ▶ 2 checkpoints.
2. **Choosing: queue, topic, bus or stream** — family table. ▶ **integration chooser** · ▶ family sorter (12) · ▶ pair sqs-sns · ▶ E5.
3. **SQS** — standard vs FIFO, visibility timeout, DLQ and redrive, long polling, delay, 1 MiB update, fair queues. ▶ **visibility-timeout simulator** · ▶ pair std-fifo · ▶ E7, E8, E10.
4. **SNS and fan-out** — fan-out, filter policies, FIFO topics, 1 MiB opt-in update. ▶ stepper “fan-out with per-subscriber queues” · ▶ E9.
5. **EventBridge** — default / custom / partner buses, rules, Classic vs new Custom Event Bus (update), Pipes, Scheduler, 1 MB update. ▶ pair sns-eb · ▶ sorter (rule, pipe or schedule) · ▶ E11–E14.
6. **Streams: Kinesis Data Streams and MSK** — shards, ordering, retention and replay, on-demand, enhanced fan-out, 10 MiB update, MSK and Amazon MQ. ▶ **shard calculator** · ▶ pair kds-sqs · ▶ E15–E17, E20.
7. **Firehose** (Q1) — delivery not processing, destinations, buffering, Parquet/ORC, Lambda transform, no replay; KDA-for-SQL removal. ▶ pair kds-firehose · ▶ stepper “clickstream to S3 with Firehose” · ▶ E1, E18, E19.
8. **Lambda and API Gateway** — limits table, invocation models, retries, DLQ vs destinations, concurrency, SnapStart; durable functions and Managed Instances update; REST vs HTTP vs WebSocket, throttling, caching, 29 s update. ▶ E21–E24.
9. **Step Functions** (Q40) — Standard vs Express, service integrations, callbacks, Distributed Map, SWF today. ▶ pair sfn-types · ▶ stepper “order workflow with a human approval” · ▶ E4, E25, E26.
10. **Glue and EMR** (Q50, Q57) — Glue ETL, crawlers, Data Catalog, bookmarks, DataBrew; EMR deployment options and Spot; Data Pipeline closed. ▶ pair glue-emr · ▶ E2, E3, E27, E30.
11. **Athena, Lake Formation, Quick Sight** — pay per scan, partitions + columnar, federated; Lake Formation fine-grained access; Quick Sight naming update. ▶ **Athena scan-cost calculator** · ▶ pair athena-redshift · ▶ E6, E28, E29.
12. **Triggers, traps, cheat, record** — map, trigger table, cheat block, log.

## Map
`core.js` `map.items`, viewBox 1000×880: PRODUCERS band (a pill all entry lines drop from), then four boxes — DECOUPLE (SQS queue → DLQ; SNS topic → fan-out; EventBridge bus → Pipes/Scheduler), STREAM (Kinesis Data Streams, MSK; Firehose fed from the stream and from producers), COMPUTE · ORCHESTRATE (API Gateway → Lambda → event source mappings; Step Functions Standard, Express, Distributed Map), DATA LAKE · ANALYTICS (S3 ← Firehose; Glue → EMR → Redshift; Lake Formation → Athena → Redshift → Quick Sight).

## Widgets
`widgets.js`: `visTimeout` (processing time × visibility timeout × `maxReceiveCount` × consumer failure → receives, duplicates, when the message lands in the DLQ, against the 4-day default retention), `shardCalc` (records/s × record size → write shards from 1 MB/s or 1,000 records/s, consumers shared vs enhanced fan-out → read per consumer; on-demand note), `scanCost` (table size × format × columns read × partition pruning → TB scanned → cost at $5 per TB with the 10 MB minimum). Generic: one `chooser`, two `sorter`s, three `stepper`s. No chart uses a hue.

## Traps (16), compare pairs (8), cards (40), drills (30), checkpoints (49)
Pairs: `sqs-sns`, `std-fifo`, `sns-eb`, `kds-firehose`, `kds-sqs`, `sfn-types`, `glue-emr`, `athena-redshift`.
Checkpoints: 19 lesson-only checkpoints (`chN-…`, one after each idea) plus 30 drill copies (`ck-E…`, skipped by the feed) — more than Session 8’s 33 because every chapter got its own concept checks. Lesson checkpoints render in authored order, so their correct option is spread across positions: first **6**, second **7**, third **6**.
Drills: two select-TWO (E28 = B + D, E30 = A + C). Correct letters as authored for the 28 single-answer drills: **A 8 · B 7 · C 7 · D 6** (options are shuffled anyway). Every option within ±20% of the others in its drill; the answer is the longest option in 2 of 28 single-answer drills (6 of 75 single-answer questions including checkpoints). Prestige option wrong in E5 (Global Accelerator, Transit Gateway) and E6 (Lake Formation). Mine: E1–E6; cards c05, c24, c33, c36, c37. The trap “More than 5 targets on one rule” links E11, whose stem names eight engineers and whose distractor puts nine targets on one rule.
Lint output at the end of the build: `node options.js 09-serverless` → `09-serverless: 0 / 79 flagged · answer is the longest option in 6 / 75 single-answer questions`; `node drills-lint.js 09-serverless` → `09-serverless: 30 drills checked` / `ok`.

## Checks
`tools/check/widgets-09-serverless.js` interacts with every widget and every control group of the three custom widgets (chooser ×2 paths, two sorters, three steppers; visibility-timeout simulator: processing time, timeout, maxReceiveCount, poison, a healthy message sent to the DLQ, and its first-row tooltip, which must name the DLQ and not a delete; shard calculator: consumer applications (5 shared → 25 shards, 0.4 MB/s each), enhanced fan-out, record sizes, records per second, the record-count note, the one-shard tie note (500 × 0.5 KB) and a tooltip; scan-cost calculator: table size (50 TB → 45.7 GB, $0.2283), format, columns read (all → 9.1 GB; 3 of 40 → 3.4 GB), a one-day partition, a visible bar for every non-zero scan, and a tooltip; eight pair quick checks, map, trigger table, progress charts). Fix round 1 regressions, each seen failing on the unfixed widget first: the DLQ tooltip, the one-shard tie note, the zero-width Parquet bar. Screenshots: `node shots-09.js` → `design/compare/s9-*.png`; after the first look the Firehose and API Gateway map labels moved off the box edges, the shard calculator’s math block was shortened for 390 px, the scan-cost axis got three ticks, and the compare figures got labels of 7 characters or fewer. Engine/CSS: **no change**.

The step-by-step build ran the lints after every stage; `check.js 09-serverless` cannot pass before drills and cards exist (it drives the drill and card tabs), so stages 4–9 used an interim Playwright check (tabs, chapters, checkpoints, horizontal scroll, console errors at the four viewport/theme combinations) and the full `check.js` from stage 10 on.
