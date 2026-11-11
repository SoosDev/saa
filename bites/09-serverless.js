/* Feed bites — Session 9, serverless, events, integration & analytics. Facts: sessions/09-serverless/learn.js chapters in src,
   docs/session-09-serverless.md (verified 2026-11-10). Ledger: docs/feed-bites.md. */
window.SAA_BITES = (window.SAA_BITES || []).concat([
  {
    id: 'sl-queue-topic-bus-stream', sid: '09-serverless', title: 'Queue, topic, bus or stream', domains: ['D2', 'D3'], src: ['ch2', 'ch4', 'ch5'],
    text: 'Messaging works like a mailroom: **SQS** is the in-tray, where each letter goes to one clerk and is then thrown away; **SNS** is the photocopier, pushing a copy to every subscriber at once, and a standard topic keeps none; **EventBridge** is the sorting desk that routes each envelope by its content, mail from AWS services and SaaS partners included; **Kinesis Data Streams** is the logbook every reader reads in order per key and can leaf back through to replay. Two questions decide: who receives it, and is it kept?',
    qs: [
      { id: 'q1', q: 'A tax-filing website accepts PDF uploads in large bursts before the deadline. A fleet of Amazon EC2 workers extracts the data from each PDF; each file must be handled by only one worker, and the backlog may take hours to clear. Which service belongs between the website and the workers?', words: ['only one worker', 'backlog may take hours'],
        expl: 'One consumer per message, and a backlog that waits for the workers: a queue. A topic and a stream give every reader every message, and a bus is built for routing events by content.',
        opts: [
          { t: 'An Amazon SQS queue that the workers poll, each worker taking the next file', ok: true, why: 'Each message goes to one consumer and waits in the queue until a worker takes it.' },
          { t: 'An Amazon SNS standard topic with every worker subscribed over an HTTPS endpoint', why: 'A topic pushes every file to every subscriber, and a standard topic keeps nothing for later.' },
          { t: 'An Amazon EventBridge rule on a custom bus with each of the workers as a target', why: 'Built for routing events by content, and a rule holds up to 5 targets, not a growing fleet.' },
          { t: 'A Kinesis data stream that every worker reads as its own consumer application', why: 'Every consumer of a stream reads every record, so each file would go to every worker.' }] },
      { id: 'q2', q: 'A warehouse system publishes a “parcel shipped” event. A billing AWS Lambda function, a partner’s HTTPS webhook and the customer’s email address must each receive every event as soon as it happens. Which solution meets these requirements with the LEAST operational overhead?', words: ['each receive every event', 'email address', 'LEAST operational overhead'],
        expl: 'Every subscriber gets every message, pushed, people included: fan-out, which is SNS. A queue splits the work, a stream is read by applications, and email is not an EventBridge target.',
        opts: [
          { t: 'An Amazon SNS topic with a Lambda, an HTTPS and an email subscription on it', ok: true, why: 'SNS pushes a copy of each message to every subscription, and HTTPS and email are subscription types.' },
          { t: 'An Amazon SQS queue that the function, the webhook and a mail service all poll', why: 'Each message goes to one consumer only, so each receiver would see just part of the events.' },
          { t: 'An Amazon EventBridge rule with the function, an API destination and an email', why: 'Email is not among a rule’s targets; EventBridge would have to route to SNS for it.' },
          { t: 'A Kinesis data stream with the function, the webhook and the email as consumers', why: 'Stream consumers are applications that read records; a webhook or an inbox cannot.' }] },
      { id: 'q3', q: 'Whenever a stage of an AWS CodePipeline pipeline fails, an AWS Lambda function must open a ticket within seconds. Today a script on an Amazon EC2 instance polls AWS CloudTrail every 10 minutes for failures. Which design has the LEAST operational overhead?', words: ['stage of an AWS CodePipeline pipeline fails', 'within seconds', 'LEAST operational overhead'],
        expl: 'A change in an AWS service is an event on the EventBridge default bus; a rule matches it and invokes the function. Every other design still polls, on a schedule or from the script.',
        opts: [
          { t: 'An EventBridge rule on the default bus that matches the failure and invokes the function', ok: true, why: 'AWS service events, a failed CodePipeline stage among them, land on the default bus for rules to match.' },
          { t: 'An EventBridge Scheduler schedule that runs the function every minute to check the pipeline', why: 'Time becomes the event instead of the failure: still polling, up to a minute late, with code to write.' },
          { t: 'The EC2 script kept, but it sends each failure it finds to an SQS queue the function reads', why: 'The CloudTrail polling and its 10-minute delay stay; only the hand-off to the function changes.' },
          { t: 'A Kinesis data stream that the EC2 script fills with failures, read by the function', why: 'Still the 10-minute CloudTrail poll, now with a stream added that nothing here needs.' }] },
      { id: 'q4', q: 'Sensor readings from a factory feed two applications: a live dashboard and a quality-scoring service. A bug made the scoring service write wrong scores for the last 6 hours. After the fix, it must re-read those 6 hours of readings while the dashboard runs untouched. Which design makes this possible?', words: ['re-read those 6 hours', 'runs untouched'],
        expl: 'Reading again what was already read is replay, the stream’s built-for property. A queue deletes a message once it is processed, and a standard topic keeps nothing.',
        opts: [
          { t: 'A Kinesis data stream with both apps as consumers; scoring replays the 6 hours', ok: true, why: 'Records stay for the retention period, and each consumer can go back and replay on its own.' },
          { t: 'One SQS standard queue with 14-day retention that both applications poll for readings', why: 'Even with 14 days of retention, each message goes to one consumer and is deleted once processed.' },
          { t: 'An SNS standard topic that pushes every reading to both applications’ HTTPS endpoints', why: 'A standard topic stores nothing, so the readings it already delivered cannot be sent again.' },
          { t: 'An SNS topic that fans out to one SQS queue per application, with a dead-letter queue', why: 'Each queue deletes a reading once the scoring service processes it, wrong score or not.' }] }
    ]
  },
  {
    id: 'sl-kds-firehose', sid: '09-serverless', title: 'Kinesis Data Streams vs Firehose', domains: ['D3', 'D4'], src: ['ch6', 'ch7'],
    text: '**Kinesis Data Streams** is a reservoir: records stay in it for the retention period, and any number of your own consumers draw from it in real time, in order per key, and can go back to replay. **Amazon Data Firehose** is a pipe into a tank: it buffers records and pours them into S3, Redshift or OpenSearch with no code, near real time, keeping nothing to reread. Several readers or replay call for the stream; just landing the data calls for Firehose.',
    update: 'Practice exams call it **Kinesis Data Firehose**; today it is **Amazon Data Firehose**. Its old 60-second minimum buffer interval is gone too: zero buffering arrived in December 2023.',
    qs: [
      { id: 'q1', q: 'A fleet of web servers produces application logs that must be loaded into Amazon OpenSearch Service for searching within a few minutes. No application reads the logs in real time. Which solution has the LEAST operational overhead?', words: ['within a few minutes', 'No application reads', 'LEAST operational overhead'],
        expl: 'Land the data in a destination, near real time, with no reader: delivery, which Firehose does with no code and nothing to scale. Every other design has you write and run the consumer.',
        opts: [
          { t: 'Send the logs to an Amazon Data Firehose stream with an OpenSearch destination', ok: true, why: 'Firehose buffers the records and loads them into OpenSearch Service with no code.' },
          { t: 'Send the logs to a Kinesis data stream and index them with a Lambda function consumer', why: 'It works, but the function is code to write, size and retry for a job Firehose does as configuration.' },
          { t: 'Send the logs to a Kinesis data stream read by an enhanced fan-out consumer on EC2', why: 'Dedicated real-time reads that nobody needs, plus instances and consumer code to run.' },
          { t: 'Send the logs to an Amazon SQS queue polled by EC2 workers that index them in batches', why: 'Workers to run and scale, where Firehose loads OpenSearch Service with no code at all.' }] },
      { id: 'q2', q: 'A company already delivers IoT readings to Amazon S3 through an Amazon Data Firehose stream. A new alerting application must now read every reading within a second, while delivery to S3 continues. Which change meets the requirement?', words: ['within a second', 'delivery to S3 continues'],
        expl: 'Several readers in real time is the stream’s job. Firehose has no consumers and buffers before it delivers, so the stream goes in front and Firehose becomes one of its readers.',
        opts: [
          { t: 'Put a Kinesis data stream first, with Firehose and the alerting app as its consumers', ok: true, why: 'A stream serves several readers in real time, and Firehose can be one of its consumers.' },
          { t: 'Register the alerting app as a second consumer that reads from the Firehose stream', why: 'Firehose has no consumers: it is itself the consumer, and it only delivers.' },
          { t: 'Add a Lambda transformation to the Firehose stream that forwards each record to the app', why: 'Firehose invokes the transform on each buffered batch before delivery, so the app waits on the buffer.' },
          { t: 'Set the Firehose buffer interval to zero and have the app read the new objects in S3', why: 'Zero buffering delivers most records within seconds, and the app would be polling S3 for files.' }] },
      { id: 'q3', q: 'A Firehose stream delivers order events to Amazon S3 with a buffer size of 128 MB and a buffer interval of 900 seconds. Only a few megabytes arrive each hour, and analysts see the data about 15 minutes late. They need it within about a minute. Which change meets this need with the LEAST change to the design?', words: ['buffer interval of 900 seconds', 'few megabytes arrive each hour', 'LEAST change'],
        expl: 'Firehose delivers when the buffer size or the buffer interval is reached, whichever comes first. With this little data the size is never reached, so only a shorter interval brings the files sooner.',
        opts: [
          { t: 'Lower the buffer interval to 60 seconds and keep the buffer size at 128 MB', ok: true, why: 'The 128 MB size is never reached, so the interval decides; 60 seconds is inside its 0–900 range.' },
          { t: 'Lower the buffer size to 64 MB and keep the buffer interval at 900 seconds', why: 'A few megabytes an hour never fill 64 MB either, so the 900-second interval still sets delivery.' },
          { t: 'Turn on record format conversion to Parquet so that each file is smaller', why: 'Conversion changes the file format, not when the buffer is flushed to S3.' },
          { t: 'Put a Kinesis data stream in front of Firehose so records arrive in real time', why: 'Records already reach Firehose at once; its buffer still holds them before delivery.' }] }
    ]
  },
  {
    id: 'sl-step-functions', sid: '09-serverless', title: 'Step Functions: Standard vs Express', domains: ['D4', 'D2'], src: ['ch9'],
    text: 'A **Step Functions** workflow remembers where each run stands. **Standard** is the case file on a desk: a run can last up to a year, does each step exactly once, can pause for a person’s reply and keeps a full history, priced per state transition. **Express** is the ticket punch for thousands of short events a second: each run ends within minutes, an asynchronous run is at least once rather than exactly once, and you pay by executions, duration and memory.',
    qs: [
      { id: 'q1', q: 'When a customer closes an account, a workflow must wait 30 days, then delete the customer’s data and send a confirmation. Each closure needs an auditable record of every step. Which design fits?', words: ['wait 30 days', 'auditable record of every step'],
        expl: 'A month-long wait with an audit trail is Standard, which runs for up to a year and records every step in its execution history. An Express run, a function and an SQS delay all stop within minutes.',
        opts: [
          { t: 'A Step Functions Standard workflow with a Wait state of 30 days before the delete task', ok: true, why: 'A Standard run can last up to a year and keeps the execution history of every step.' },
          { t: 'A Step Functions Express workflow with a Wait state of 30 days before the delete task', why: 'An Express run stops at 5 minutes, long before the wait is over.' },
          { t: 'An AWS Lambda function that sleeps for 30 days and then deletes the customer’s data', why: 'A function times out after 900 seconds, and it keeps no history of the steps.' },
          { t: 'An Amazon SQS delay queue that holds each closure for 30 days before a delete worker', why: 'A delay queue holds a message for at most 15 minutes.' }] },
      { id: 'q2', q: 'An API behind Amazon API Gateway runs three short validation steps for each request and must return the result to the caller in the same response. Traffic is thousands of requests per second, the steps are idempotent, and each step needs automatic retries. Which orchestration is MOST cost-effective?', words: ['return the result to the caller', 'thousands of requests per second', 'MOST cost-effective'],
        expl: 'Thousands of short, idempotent runs a second is Express, priced by executions and duration. The caller waits for the answer, so the workflow is started synchronously.',
        opts: [
          { t: 'A synchronous Express workflow that API Gateway starts and waits on for the result', ok: true, why: 'Short, high-volume and idempotent is Express, and a synchronous start hands the result back.' },
          { t: 'An asynchronous Express workflow that API Gateway starts for each incoming request', why: 'An asynchronous start returns before the workflow ends, so the caller gets no result.' },
          { t: 'A Standard workflow that API Gateway starts for each request, priced per transition', why: 'At thousands of runs a second, paying per state transition loses on cost.' },
          { t: 'Three Lambda functions that call one another, the last one returning the result', why: 'No state machine holds the request, so there are no built-in retries between the steps.' }] },
      { id: 'q3', q: 'A billing workflow of four steps finishes in under a minute, for about 200 invoices an hour. One step charges a card, is not idempotent and must run exactly once per invoice, with no custom deduplication code. Which workflow type fits?', words: ['exactly once per invoice', 'no custom deduplication code'],
        expl: 'Exactly once is Standard’s model. Express is at least once when started asynchronously and at most once when started synchronously; neither promises exactly once.',
        opts: [
          { t: 'A Standard workflow, because it runs each step of an execution exactly once', ok: true, why: 'Exactly-once execution is the Standard model, so the charge neither repeats nor goes missing.' },
          { t: 'An asynchronous Express workflow, because every run finishes within 5 minutes', why: 'Short enough for its 5 minutes, but asynchronous Express is at least once: a second charge can happen.' },
          { t: 'A synchronous Express workflow, because at-most-once means no second charge', why: 'At most once also allows no charge at all; only Standard promises exactly once.' },
          { t: 'An Express workflow that records each charge in DynamoDB and skips repeats', why: 'It can work, but it is the custom deduplication code the team rules out.' }] },
      { id: 'q4', q: 'A team builds an Express workflow that starts an AWS Glue job with the .sync integration pattern, so that the next step runs after the job finishes. The job usually takes 40 minutes. Why does this design fail?', words: ['Express workflow', '.sync', '40 minutes'],
        expl: 'Express runs end at 5 minutes and cannot use `.sync` or task tokens. A 40-minute job needs a Standard workflow, which starts the job, waits for it and moves on.',
        opts: [
          { t: 'Express supports neither `.sync` nor runs past 5 minutes; a Standard workflow does', ok: true, why: 'Express has no `.sync` and stops at 5 minutes; a Standard run can wait for the job.' },
          { t: 'Step Functions cannot start a Glue job directly; a Lambda function has to start it', why: 'A Task state starts a Glue job through a service integration, with no Lambda in between.' },
          { t: 'The `.sync` pattern can wait no longer than 15 minutes, the Lambda timeout', why: 'The Lambda limit of 15 minutes does not apply: the workflow calls Glue directly.' },
          { t: 'Express workflows must use a Distributed Map state to start a Glue job', why: 'Express has no Distributed Map at all, and a plain Task state starts the job.' }] }
    ]
  },
  {
    id: 'sl-glue-emr-athena', sid: '09-serverless', title: 'Glue vs EMR vs Athena', domains: ['D4', 'D3'], src: ['ch10', 'ch11'],
    text: 'The data lake in S3 is a pantry: **Glue** is the prep service whose serverless Spark jobs clean and convert the data and whose crawlers label every shelf in the Data Catalog, with nothing for you to run. **EMR** is a kitchen you rent, with the full Hadoop and Spark toolset, for existing big-data jobs and frameworks you configure. **Athena** tastes in place: SQL straight on the files, nothing loaded, paid by the data scanned.',
    qs: [
      { id: 'q1', q: 'A product manager wants a one-off answer, the number of mobile orders last quarter, from order files already in Amazon S3 and catalogued in AWS Glue. The answer is needed today. Which approach gives it with no infrastructure to set up and nothing to load?', words: ['one-off answer', 'no infrastructure', 'nothing to load'],
        expl: 'One question over files that already have catalog tables: Athena, SQL in place with nothing loaded and no cluster. EMR and Glue launch or build something, and Redshift loads first.',
        opts: [
          { t: 'Run a SQL query with Amazon Athena on the catalogued tables, where the files are', ok: true, why: 'SQL straight on the files in S3 through the Data Catalog, with no cluster and nothing loaded.' },
          { t: 'Launch an Amazon EMR cluster, run a Hive query on the files, then terminate it', why: 'It answers the question, but a cluster is infrastructure to launch and configure.' },
          { t: 'Write an AWS Glue ETL job that counts the mobile orders and writes the result to S3', why: 'Glue jobs are built to transform data; a job to write is more than one query.' },
          { t: 'Load the order files into Amazon Redshift Serverless and query the loaded table', why: 'It works, but loading the data is the step the manager wants to avoid.' }] },
      { id: 'q2', q: 'A research team needs Apache HBase for random reads over a large dataset, plus Spark jobs with tuned cluster settings. AWS should handle provisioning and configuration of the frameworks. Which service fits?', words: ['Apache HBase', 'tuned cluster settings'],
        expl: 'A specific framework (HBase) and cluster settings to tune: EMR. Glue runs serverless Spark jobs with no cluster to configure, which is its strength and here its limit.',
        opts: [
          { t: 'Amazon EMR on EC2, running HBase and Spark on a cluster that the team configures', ok: true, why: 'EMR runs the open-source frameworks, HBase included, with AWS handling provisioning.' },
          { t: 'AWS Glue ETL jobs, running the Spark work serverless with the workers they pick', why: 'Glue runs serverless Spark jobs: no HBase and no cluster settings to tune.' },
          { t: 'Amazon Athena, querying the dataset in S3 with SQL through the Data Catalog', why: 'Athena runs SQL queries on files; it does not run HBase or Spark jobs.' },
          { t: 'AWS Glue DataBrew, preparing the dataset with ready-made visual transformations', why: 'DataBrew is visual, no-code data preparation for analysts, not a big-data framework.' }] },
      { id: 'q3', q: 'Data engineers run Spark on Amazon EMR, and analysts query the same S3 data with Amazon Athena. Each team defines its own copy of every table, and the definitions drift apart. Which fix has the LEAST operational overhead?', words: ['defines its own copy of every table', 'LEAST operational overhead'],
        expl: 'The Glue Data Catalog is shared by Athena, EMR and Redshift Spectrum, so a table defined once is the same table everywhere. The other fixes keep two definitions or add a server.',
        opts: [
          { t: 'Use the AWS Glue Data Catalog as the EMR metastore and for the Athena tables', ok: true, why: 'One Hive-metastore-compatible catalog shared by Athena and EMR: define each table once.' },
          { t: 'Run a Hive metastore on an Amazon EC2 instance and point both of the teams at it', why: 'A shared metastore, but on a server that the team has to run and patch.' },
          { t: 'Tag the tables with Lake Formation LF-tags so that both teams see one schema', why: 'LF-tags grant access by classification; they do not merge two table definitions.' },
          { t: 'Run a Glue crawler nightly and copy its schemas into the EMR cluster’s metastore', why: 'Two catalogs remain, kept in step by a nightly copy that is yours to run.' }] },
      { id: 'q4', q: 'Analysts use Amazon Athena on order history in S3 and must join it, in one SQL query, with a customer table in Amazon DynamoDB. The DynamoDB table must not be copied anywhere. Which design meets the requirement?', words: ['in one SQL query', 'must not be copied'],
        expl: 'Athena federated queries run Lambda connectors in your account to read sources outside S3, such as DynamoDB, where they are. Every other design moves the table first.',
        opts: [
          { t: 'An Athena federated query that reads DynamoDB through a Lambda connector', ok: true, why: 'Federated queries reach DynamoDB, RDS and on-premises data through Lambda connectors.' },
          { t: 'A nightly Glue ETL job that exports the DynamoDB table to S3 for Athena to join', why: 'It makes the join possible, but it copies the table, which the stem rules out.' },
          { t: 'An Amazon EMR cluster whose Spark job copies DynamoDB into HDFS before each join', why: 'A cluster to run, and the customer table is copied into HDFS anyway.' },
          { t: 'Load both the orders and the customers into Amazon Redshift and join them there', why: 'Loading the customer table into a warehouse is the copy that the stem forbids.' }] }
    ]
  }
]);
