/* Session 11 — the lesson. 12 chapters. Facts: docs/session-11-monitoring.md (verified 2026-11-11 via AWS MCP).
   Lesson checkpoints render in authored order; their correct option is spread first 7 · second 7 · third 7. */
(function () {
  'use strict';
  const S = window.SESSION;
  const fromDrill = (id, src) => {
    const d = S.drills.find(x => x.id === id);
    return { id: 'ck-' + id, src: src || d.src, q: d.q, opts: d.opts.map(o => ({ t: o.t, why: o.why })), a: d.opts.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0), why: d.expl };
  };

  const WHICH = {
    start: 'root',
    nodes: {
      root: { q: 'What must you know?', opts: [
        { label: 'A number: how much, how fast, how full', sub: 'utilization, latency, errors per minute, orders', next: 'num' },
        { label: 'What a system wrote', sub: 'an error message, a request line, a stack trace', next: 'logs' },
        { label: 'Where one request spent its time', sub: 'across several services', next: 'xray' },
        { label: 'Who called an API, and when', sub: 'deleted, terminated, changed, signed in', next: 'trail' },
        { label: 'What a resource looked like, or whether it complies', sub: 'configuration history, rules', next: 'config' },
        { label: 'What AWS recommends for the account', sub: 'best practices, limits, AWS events', next: 'ta' }] },
      num: { q: 'Where does the number come from?', opts: [
        { label: 'An AWS service already publishes it', sub: 'CPU, network, request count, queue depth', next: 'cwm' },
        { label: 'Inside the operating system', sub: 'memory, swap, disk space, processes', next: 'agent' },
        { label: 'Your application code', sub: 'orders, sign-ups, business events', next: 'custom' }] }
    },
    results: {
      cwm: { title: 'CloudWatch metrics and an alarm', line: 'cw', text: 'Read the metric in its namespace, graph it on a dashboard and alarm on it. For EC2, detailed monitoring makes it arrive every minute instead of every 5 minutes.', whyNot: [['CloudTrail', 'records calls, not numbers'], ['X-Ray', 'traces requests, not host metrics']] },
      agent: { title: 'The CloudWatch agent', line: 'logs', text: 'Installed in the OS (EC2 or on-premises), it publishes memory, swap, disk space and process metrics to the CWAgent namespace — and ships log files too.', whyNot: [['Detailed monitoring', 'the same hypervisor metrics, more often'], ['Systems Manager Inventory', 'software metadata, not utilization']] },
      custom: { title: 'A custom metric', line: 'cw', text: 'The application calls PutMetricData (standard 1-minute or high-resolution 1-second) or writes metrics into its logs, and an alarm watches them.', whyNot: [['A proxy metric such as NetworkIn', 'moves for reasons other than your number']] },
      logs: { title: 'CloudWatch Logs', line: 'logs', text: 'The events land in a log group: search them with Logs Insights, count them with a metric filter, stream them with a subscription filter.', whyNot: [['CloudTrail', 'API calls, not your application’s lines']] },
      xray: { title: 'AWS X-Ray', line: 'apm', text: 'Traces follow each request through every service; the trace map shows where the time and the errors are.', whyNot: [['Logs Insights', 'one component at a time'], ['CloudWatch metrics', 'averages per service, not one request']] },
      trail: { title: 'AWS CloudTrail', line: 'trail', text: 'Event history for the last 90 days of management events; a trail for longer, for every Region and for data events.', whyNot: [['GuardDuty', 'detects threats; not the record'], ['Config', 'shows state, not the caller']] },
      config: { title: 'AWS Config', line: 'config', text: 'The configuration timeline of each resource and rules that judge it (Session 6, chapter 10).', whyNot: [['CloudTrail', 'the call, not the resulting state'], ['Trusted Advisor', 'fixed checks, no history']] },
      ta: { title: 'Trusted Advisor, AWS Health, Service Quotas', line: 'advise', text: 'AWS’s best-practice checks and service limits, AWS’s events about your resources, and each quota with its usage.', whyNot: [['Config rules', 'your rules, not AWS’s advice']] }
    }
  };

  const LOGTREE = {
    start: 'root',
    nodes: {
      root: { q: 'What must happen with the log events?', opts: [
        { label: 'Count matching lines and page someone', next: 'mf' },
        { label: 'Reach another service or account within minutes', sub: 'OpenSearch, S3 through Firehose, a central account', next: 'sub' },
        { label: 'Answer a question about logs already stored', next: 'ins' },
        { label: 'Watch new events arrive during a deployment', next: 'tail' },
        { label: 'Be kept for a set time, then deleted', next: 'ret' },
        { label: 'Be copied once to S3 for an archive or an audit', next: 'exp' }] }
    },
    results: {
      mf: { title: 'Metric filter → alarm → SNS', line: 'logs', text: 'The filter turns matching events into a CloudWatch metric; an alarm on it notifies through SNS. It counts only events written after it exists.', whyNot: [['Logs Insights on a schedule', 'code to run for a built-in feature']] },
      sub: { title: 'Subscription filter', line: 'logs', text: 'A real-time feed of matching events to Lambda, Kinesis Data Streams or Amazon Data Firehose (and on to OpenSearch or S3), usually under three minutes after ingestion. Up to five per log group; cross-account through a destination.', whyNot: [['Export to S3', 'a batch job: up to 12 hours before data is available']] },
      ins: { title: 'CloudWatch Logs Insights', line: 'logs', text: 'Interactive queries over stored log data, with no infrastructure; you pay for the data each query scans.', whyNot: [['A new metric filter', 'not retroactive']] },
      tail: { title: 'Live Tail', line: 'logs', text: 'Watch new log events as they are ingested, filtered by pattern, from one or more log groups.', whyNot: [['Logs Insights', 'queries what is stored; Live Tail follows what arrives']] },
      ret: { title: 'A retention setting on the log group', line: 'logs', text: 'Log groups never expire by default; set a retention between one day and 10 years and CloudWatch Logs deletes older events.', whyNot: [['A Lambda that deletes streams', 'code for a setting']] },
      exp: { title: 'Export task to S3', line: 'logs', text: 'A one-off batch export (CreateExportTask) to a bucket in this or another account; data can take up to 12 hours to become available. For continuous archiving AWS recommends subscriptions.', whyNot: [['Daily exports as a pipeline', 'subscriptions are built for continuous delivery']] }
    }
  };

  const SSMTREE = {
    start: 'root',
    nodes: {
      root: { q: 'What is the job on the fleet?', opts: [
        { label: 'Run a command or script once, on many nodes, now', next: 'rc' },
        { label: 'Keep a configuration true from now on, new nodes included', next: 'sm' },
        { label: 'Install operating system patches with a compliance report', next: 'pm' },
        { label: 'A multi-step fix across AWS resources, also as remediation', next: 'au' },
        { label: 'One person needs a shell on one instance', next: 'ss' },
        { label: 'Know which software and versions each node runs', next: 'inv' }] }
    },
    results: {
      rc: { title: 'Run Command', line: 'ssm', text: 'Targets managed nodes by ID or tag, runs a document (a shell or PowerShell script), no SSH and no inbound port; no additional cost on EC2.', whyNot: [['Session Manager', 'one interactive shell at a time'], ['State Manager', 'keeps applying on a schedule']] },
      sm: { title: 'State Manager association', line: 'ssm', text: 'Defines the state to keep (software installed and running, ports closed), reapplies it on a schedule and applies it to new nodes in the target.', whyNot: [['Run Command', 'runs once; new instances miss it']] },
      pm: { title: 'Patch Manager', line: 'ssm', text: 'Patch baselines approve patches; Scan reports what is missing, Scan and install fixes it; a maintenance window or a Quick Setup patch policy sets the schedule.', whyNot: [['Amazon Inspector', 'finds vulnerabilities, installs nothing']] },
      au: { title: 'Automation runbook', line: 'ssm', text: 'AWS-maintained or custom runbooks for maintenance, deployment and remediation across EC2, RDS, S3 and more; also the remediation engine behind Config rules.', whyNot: [['A script per incident', 'nothing reusable, nothing audited']] },
      ss: { title: 'Session Manager', line: 'ssm', text: 'A browser or CLI shell to a managed node, logged, with no bastion and no inbound SSH (Session 3, chapter 5).', whyNot: [['Run Command', 'built for many nodes, not an interactive shell']] },
      inv: { title: 'Inventory', line: 'ssm', text: 'Collects metadata only: applications and versions, files, network configuration, Windows updates, services.', whyNot: [['AWS Config', 'resource configuration, not the software inside the OS']] }
    }
  };

  S.learn = [
    /* ---------------------------------------------------------------- 1 */
    { id: 'ch1', title: 'How to read a monitoring question', domains: 'D1 D2 D3 D4', blocks: [
      'Monitoring questions look alike because every option is a real AWS service that “watches” something. What separates them is **which signal** each one is built to hold. Six questions, six tools:',
      { table: { head: ['The question behind the stem', 'The tool', 'The signal it holds'], key: true, rows: [
        ['How is it performing?', '{cw|CloudWatch metrics} and alarms', 'numbers over time'],
        ['What did it write?', '{logs|CloudWatch Logs} (and the agent)', 'lines of text'],
        ['Where is one request slow?', '{apm|AWS X-Ray}', 'the path of a request'],
        ['Who called which API, and when?', '{trail|AWS CloudTrail}', 'API call events'],
        ['What did it look like, and does it comply?', '{config|AWS Config}', 'configuration over time'],
        ['What does AWS recommend?', '{advise|Trusted Advisor}, AWS Health, Service Quotas', 'AWS’s checks and events']] } },
      'Name the signal first and two or three options fall away before you read their details. Then ask where the signal comes from (an AWS service, inside the OS, your code, many accounts) and what must happen next (look at it, alert, fix it automatically, keep it for an audit).',
      { h: 'Your record on this cluster' },
      { table: { head: ['Where', 'What happened', 'What it teaches', 'Tag'], rows: [
        ['baseline **Q44**', 'memory and swap of EC2 instances were needed in CloudWatch — a fact gap', 'EC2 does not publish memory, swap or disk space: the **CloudWatch agent** does', '**F** fact'],
        ['baseline **Q49**', '“configuration changes” in the stem — you missed the keyword', '“configuration changes” = **AWS Config**', '**K** keyword'],
        ['baseline, six times', 'prestige distractors (a service with no role)', 'here: GuardDuty, Security Hub or Detective offered for a plain “who did it” question', '**C** confused similar']] } },
      { callout: 'Drill **W1** is Q44 rebuilt (detailed monitoring, a cron script and Systems Manager Inventory as distractors); **W2** is Q49 with a new scenario (S3 bucket settings over two years); **W3** puts GuardDuty, Security Hub and Detective next to a deleted table. Three cards carry the same lessons. All are marked as yours.', kind: 'miss', title: 'Your misses' },
      { h: 'The stub for this session' },
      'Session 10’s slots (load pattern, traffic, control) do not separate monitoring tools. This session uses four of its own:',
      { table: { head: ['Slot', 'Ask', 'Values', 'What it kills'], rows: [
        ['SIGNAL', 'What must be known?', '`metric` · `log` · `trace` · `API call` · `configuration` · `advice` · `none stated`', 'CloudTrail for CPU; CloudWatch for “who”; Trusted Advisor for your own rules'],
        ['SOURCE', 'Where does it come from?', '`AWS service` · `inside the OS` · `application code` · `on-premises` · `many accounts` · `none stated`', 'detailed monitoring for memory; a per-account setup where an organization one exists'],
        ['RESPONSE', 'What happens next?', '`see it` · `alert` · `act automatically` · `keep for audit` · `none stated`', 'a dashboard where an alarm is needed; an alarm where an event rule is'],
        ['SUPERLATIVE', 'What is optimised?', '`cheapest` · `least ops` · `fastest` · `most secure` · `none stated`', 'a scheduled Lambda where a built-in setting exists']] } },
      { pre: S.method, label: 'The method' },
      { h: 'Built for — one line each' },
      { hooks: [
        ['CloudWatch metrics', '**numbers** from AWS services, the agent and your code.'],
        ['CloudWatch alarm', '**a number crossed a line** for M of N periods → act.'],
        ['CloudWatch agent', '**inside the OS**: memory, swap, disk space, log files.'],
        ['CloudWatch Logs', '**text** kept, searched, counted, streamed.'],
        ['X-Ray', '**one request’s path** across services.'],
        ['Synthetics canary', '**a fake customer** on a schedule.'],
        ['CloudTrail', '**who called which API**, when, from where.'],
        ['AWS Config', '**what it looked like** and whether it complies.'],
        ['Systems Manager', '**hands on the fleet** without SSH.'],
        ['Trusted Advisor', '**AWS’s checks** on your account.'],
        ['AWS Health', '**AWS’s events** that affect your resources.']], label: 'Built for' },
      { h: 'What lives in other sessions' },
      { table: { head: ['Topic', 'Where'], rows: [
        ['AWS Config recorder, rules, conformance packs, aggregator, remediation', '[[../06-governance/#learn/ch10|Session 6, chapter 10]]'],
        ['Session Manager vs bastion vs EC2 Instance Connect Endpoint', '[[../03-networking/#learn/ch5|Session 3, chapter 5]]'],
        ['On-premises servers as managed nodes (hybrid activations)', '[[../02-migration/#learn/ch7|Session 2, chapter 7]]'],
        ['Parameter Store vs Secrets Manager', '[[../05-security/#learn/ch6|Session 5, chapter 6]]'],
        ['VPC Flow Logs, Reachability Analyzer', '[[../03-networking/#learn/ch11|Session 3, chapter 11]]'],
        ['EC2 automatic recovery and the recover action', '[[../07-ha-dr/#learn/ch3|Session 7, chapter 3]]'],
        ['Route 53 health checks on a CloudWatch alarm', '[[../04-global/#learn/ch9|Session 4, chapter 9]]'],
        ['Target tracking and the alarms it manages', '[[../10-compute/#learn/ch7|Session 10, chapter 7]]'],
        ['EventBridge rules, buses, AWS Health events', '[[../09-serverless/#learn/ch5|Session 9, chapter 5]]'],
        ['GuardDuty, Inspector, Macie · Security Hub, Detective', '[[../05-security/#learn/ch9|Session 5, chapter 9]] · [[../05-security/#learn/ch10|chapter 10]]'],
        ['Compute Optimizer, rightsizing, the cost of monitoring', 'Session 12 (not built yet)']] } },
      { h: 'Try it on W1' },
      'Your Q44, rebuilt. Fill SOURCE first, then read the options for the one detail each breaks.',
      { callout: S.drills.find(d => d.id === 'W1').q + ' [[#drill/W1|Solve it in the drill →]]', kind: 'note', title: 'Exam Q44' },
      { check: { id: 'ch1-prestige', src: 'Exam pattern', q: 'A table was deleted yesterday and the stem asks **who** deleted it. One option enables **Amazon GuardDuty** to find out. Why do you cross it out?', opts: [
        { t: 'GuardDuty works only in accounts that belong to an organization, and this account may stand on its own.', why: 'false — GuardDuty runs in standalone accounts too.' },
        { t: 'GuardDuty can only analyse VPC Flow Logs, and a DynamoDB deletion never appears in network traffic.', why: 'false — it reads several sources, CloudTrail events among them.' },
        { t: 'GuardDuty is built to detect threats as they occur; the record of who called DeleteTable is CloudTrail’s.', why: 'built for threat detection, not as the audit record.' }], a: 2,
        why: 'Prestige distractors are real services built for another problem. “Who called the API” is CloudTrail — the event history already holds yesterday’s call.' } },
      { check: { id: 'ch1-stub', src: 'Exam Q44', q: 'The stem asks for **memory and swap** of EC2 instances in CloudWatch. Which SOURCE value goes in the stub, and where does it point?', opts: [
        { t: '`AWS service` — EC2 publishes memory and swap itself; detailed monitoring makes them arrive every minute.', why: 'EC2 publishes no memory or swap metric at all.' },
        { t: '`inside the OS` — the hypervisor cannot see them, so an agent in the OS has to publish them.', why: 'memory and swap live in the guest: the CloudWatch agent.' },
        { t: '`application code` — the application must call PutMetricData with its own memory figures.', why: 'works in theory, but the OS figures are what the agent is built to collect.' }], a: 1,
        why: 'Q44’s fact: what lives inside the OS needs the CloudWatch agent.' } }
    ] },

    /* ---------------------------------------------------------------- 2 */
    { id: 'ch2', title: 'The monitoring map: which tool answers which question', domains: 'D1 D2 D3 D4', blocks: [
      'Each family collects one signal, gives you a way to understand it, and a way to act on it. The map in chapter 12 draws exactly this; the table is the same thing in words.',
      { table: { head: ['Family', 'Signal', 'Comes from', 'See it', 'Act on it'], key: true, rows: [
        ['**CloudWatch metrics**', 'numbers over time', 'AWS services, the agent, your code', 'dashboards, metric math', 'alarms → SNS, Lambda, Auto Scaling, EC2 actions'],
        ['**CloudWatch Logs**', 'lines of text', 'Lambda, ECS, Flow Logs, CloudTrail, the agent', 'Logs Insights, Live Tail', 'metric filter → alarm; subscription filter → a stream'],
        ['**X-Ray** and friends', 'request paths', 'instrumented code, Lambda, API Gateway', 'trace map, traces', 'alarms on the metrics they produce'],
        ['**CloudTrail**', 'API call events', 'every call to an AWS API', 'event history, Athena on the trail', 'EventBridge rules, metric filters'],
        ['**AWS Config**', 'configuration items', 'recorded resources', 'timeline, compliance', 'rules, notifications, Automation'],
        ['**Systems Manager**', '— (it acts)', 'managed nodes', 'Inventory, compliance', 'Run Command, Patch Manager, Automation'],
        ['**Trusted Advisor · Health · quotas**', 'AWS’s advice and events', 'AWS', 'console, organizational views', 'EventBridge, alarms on quotas']] } },
      { h: 'Walk the decision tree' },
      'Follow it with a scenario in mind. Each leaf says why the nearest look-alike loses.',
      { widget: 'chooser', args: { title: 'Which tool answers this?', tree: WHICH } },
      { widget: 'sorter', args: { title: 'Metric, log, trace, API call, configuration or advice?', lead: 'Twelve requirements, six signals. Decide before you check.', buckets: [{ id: 'm', short: 'Metric', label: 'CloudWatch metric' }, { id: 'l', short: 'Log', label: 'CloudWatch Logs' }, { id: 't', short: 'Trace', label: 'X-Ray trace' }, { id: 'a', short: 'API call', label: 'CloudTrail event' }, { id: 'c', short: 'Config', label: 'AWS Config' }, { id: 'v', short: 'Advice', label: 'Trusted Advisor' }], items: [
        { t: 'Average CPU of an Auto Scaling group over the last hour', b: 'm', why: 'a number from an AWS service.' },
        { t: 'Free memory on 40 Linux instances', b: 'm', why: 'a metric — published by the agent.' },
        { t: 'The stack trace an application printed at 02:14', b: 'l', why: 'text the application wrote.' },
        { t: 'Every 404 line a web server wrote today', b: 'l', why: 'log lines.' },
        { t: 'Which of five services adds 3 seconds to checkout', b: 't', why: 'one request’s path.' },
        { t: 'The time a request spent waiting for DynamoDB', b: 't', why: 'a subsegment of the trace.' },
        { t: 'Who stopped the production database on Friday', b: 'a', why: 'an API call and its caller.' },
        { t: 'Which role created an IAM user last week', b: 'a', why: 'CloudTrail management event.' },
        { t: 'The inbound rules a security group had last month', b: 'c', why: 'configuration history.' },
        { t: 'Whether every EBS volume is encrypted, continuously', b: 'c', why: 'a Config rule.' },
        { t: 'Which service limits the account is close to', b: 'v', why: 'Trusted Advisor Service Limits checks.' },
        { t: 'AWS’s checks for idle load balancers and low-use instances', b: 'v', why: 'cost optimization checks.' }] } },
      { check: { id: 'ch2-signal', q: 'A stem says “**the team must know which IAM role changed the bucket policy, and what the policy looked like before**”. Which signals does it name?', opts: [
        { t: 'An API call (who changed it) and a configuration (what it looked like): CloudTrail and AWS Config.', why: 'two signals, two tools.' },
        { t: 'A metric (how often the policy changes) and a log line (the policy text): CloudWatch alone.', why: 'no number and no application log is asked for.' },
        { t: 'Advice (is the policy safe) and a trace (how the change travelled): Trusted Advisor and X-Ray.', why: 'neither records changes to a policy.' }], a: 0,
        why: 'Read the signals literally. “Which role changed” = API call; “what it looked like before” = configuration.' } },
      { check: fromDrill('W3', 'Exam pattern') },
      { check: fromDrill('W4') },
      { drills: ['W3', 'W4'] }
    ] },

    /* ---------------------------------------------------------------- 3 */
    { id: 'ch3', title: 'CloudWatch metrics: what arrives by itself', domains: 'D2 D3', blocks: [
      'A **metric** is a series of numbers over time. AWS services publish theirs into a **namespace** — `AWS/EC2`, `AWS/RDS`, `AWS/ApplicationELB` — and each series is identified by its **dimensions** (an `InstanceId`, a load balancer name). You read a metric through a **statistic** (Average, Sum, Maximum, a percentile) over a **period** (one minute, five minutes, an hour). Alarms and dashboards are both built on that: a statistic of a metric per period.',
      { h: 'What EC2 sends by itself' },
      'Without installing anything, every instance publishes `CPUUtilization`, network in and out, disk reads and writes **for instance store volumes only**, CPU credit metrics for burstable types, and **status check** metrics. Two settings decide how often:',
      { table: { head: ['', 'Basic monitoring', 'Detailed monitoring'], key: true, rows: [
        ['Period', 'status checks every minute, everything else every **5 minutes**', 'every **minute**'],
        ['Charge', 'none', 'per metric EC2 sends'],
        ['Turn on', 'default', 'at launch, or later on a running or stopped instance'],
        ['Use it when', 'trends, dashboards', 'alarms or scaling that must react within a minute']] } },
      { h: 'What the hypervisor cannot see' },
      'EC2 measures from **outside** the guest. CPU and network pass through the hypervisor; **memory use, swap, free disk space** and individual **processes** do not. EC2 publishes none of them. That is the next chapter: the CloudWatch agent, inside the OS.',
      { callout: 'Baseline **Q44**: the stem needed **memory and swap** for EC2 instances. Detailed monitoring is the tempting wrong answer — it only sends the same CPU and network metrics every minute. Memory and swap need the **CloudWatch agent**.', kind: 'miss', title: 'Your Q44' },
      { check: { id: 'ch3-hyper', q: 'Which metric can you alarm on for an EC2 instance **without** installing anything on it?', opts: [
        { t: 'CPUUtilization, which EC2 sends every 5 minutes by default and every minute with detailed monitoring.', why: 'a hypervisor metric in AWS/EC2.' },
        { t: 'Memory utilization, which EC2 sends every minute once detailed monitoring is turned on for it.', why: 'EC2 never publishes memory.' },
        { t: 'Disk space used on the root EBS volume, which EC2 sends in the AWS/EC2 namespace by default.', why: 'disk space is inside the file system; EC2’s disk metrics count instance store I/O.' }], a: 0,
        why: 'Outside the guest: CPU, network, instance-store I/O, status checks. Inside the guest: the agent.' } },
      { h: 'Your own numbers: custom metrics' },
      'Business numbers — orders per minute, sign-ups, items in an in-app queue — exist only in your code. Publish them as **custom metrics** with `PutMetricData` (every call is charged), or write them inside structured log events with the embedded metric format. A custom metric is **standard resolution** (one-minute granularity) or **high resolution** (one-second granularity, readable at 1, 5, 10 or 30 seconds); alarms on high-resolution metrics can use periods as short as 10 seconds, at a higher charge. For a near-real-time copy of metrics outside CloudWatch, **metric streams** send them continuously through Amazon Data Firehose.',
      { h: 'How long CloudWatch keeps them' },
      'Metrics are not kept forever, and not at full resolution. Data published with a short period is **aggregated** into coarser points as it ages:',
      { table: { head: ['Period of the data points', 'Kept for'], key: true, rows: [
        ['under 60 seconds (high-resolution custom metrics)', '**3 hours**'],
        ['60 seconds (1 minute)', '**15 days**'],
        ['300 seconds (5 minutes)', '**63 days**'],
        ['3600 seconds (1 hour)', '**455 days (15 months)**']] } },
      'So 1-minute data stays at 1-minute resolution for 15 days, is then retrievable only as 5-minute points, and after 63 days only as 1-hour points; after 15 months it is gone. A question that needs CPU history “for two years” needs the data copied somewhere else.',
      { widget: 'retention' },
      { check: { id: 'ch3-retention', q: 'An instance has detailed monitoring. An engineer looks at its `CPUUtilization` from **40 days ago**. What resolution is still available?', opts: [
        { t: '1-minute points, because detailed monitoring keeps its data at full resolution for 63 days.', why: 'full 1-minute resolution lasts 15 days.' },
        { t: '5-minute points, because 1-minute data is rolled up after 15 days and kept as 5-minute data to 63 days.', why: 'the retention ladder.' },
        { t: 'Nothing, because CloudWatch keeps EC2 metrics for 15 days and then deletes them completely.', why: 'aggregates remain for up to 455 days.' }], a: 1,
        why: '15 days at 1 minute, 63 days at 5 minutes, 455 days at 1 hour.' } },
      { check: fromDrill('W5') },
      { check: fromDrill('W6') },
      { drills: ['W5', 'W6'] }
    ] },

    /* ---------------------------------------------------------------- 4 */
    { id: 'ch4', title: 'The CloudWatch agent: metrics and logs from inside the OS', domains: 'D2 D3', blocks: [
      'The **CloudWatch agent** (also called the unified agent) is software you install in the operating system. From inside, it sees what the hypervisor cannot. It collects:',
      { ul: [
        '**System-level metrics** from inside the guest: memory used (`mem_used_percent`), swap used (`swap_used_percent`), disk space used (`disk_used_percent`), and per-process figures with `procstat`.',
        '**Custom metrics** from your applications over **StatsD** (Linux and Windows) and **collectd** (Linux).',
        '**Log files** from Linux and Windows Server, into CloudWatch Logs.',
        '**Traces** from OpenTelemetry or X-Ray clients, forwarded to X-Ray without a separate daemon.'] },
      'It runs on **EC2 instances and on-premises servers** (and in containers). Its metrics land in the **`CWAgent`** namespace by default and are billed as custom metrics. Compute Optimizer reads memory from that namespace too when it judges instance sizes (Session 12).',
      { h: 'What it needs' },
      { ol: [
        '**Permission to publish**: on EC2 an instance profile role with **`CloudWatchAgentServerPolicy`** (plus **`AmazonSSMManagedInstanceCore`** if Systems Manager installs it); on-premises, IAM credentials.',
        '**A configuration file**: which metrics, how often, which log files to which log groups. Store it once in **Parameter Store** and every server fetches the same one.',
        '**Installation**: by hand, or across the fleet with **Systems Manager** (Run Command or State Manager, the package from Distributor).'] },
      { widget: 'stepper', args: { title: 'Memory and swap for a fleet, step by step', line: 'logs', steps: [
        { title: 'The role', text: 'Attach an instance profile with CloudWatchAgentServerPolicy and AmazonSSMManagedInstanceCore to the 120 instances (or to their launch template).' },
        { title: 'The configuration', text: 'Write one agent configuration with mem_used_percent and swap_used_percent, the InstanceId dimension and the log files to ship. Save it in Parameter Store.' },
        { title: 'The rollout', text: 'A State Manager association installs the agent package and loads the stored configuration on every instance with the tag — and on every instance launched later.' },
        { title: 'The metrics', text: 'The CWAgent namespace fills with memory and swap per instance; the log files appear in their log groups.', note: 'If an alarm on these metrics sits in INSUFFICIENT_DATA, the agent is usually missing, stopped, or publishing with different dimensions than the alarm expects.', noteTitle: 'When the alarm stays grey' },
        { title: 'The alarms', text: 'One alarm per instance on mem_used_percent and swap_used_percent, notifying an SNS topic.' }] } },
      { widget: 'sorter', args: { title: 'Agent or no agent?', lead: 'Ten signals. Which ones need the CloudWatch agent?', buckets: [{ id: 'no', short: 'No agent', label: 'Published without an agent' }, { id: 'ag', short: 'Agent', label: 'Needs the CloudWatch agent' }], items: [
        { t: 'CPUUtilization of an EC2 instance', b: 'no', why: 'AWS/EC2.' },
        { t: 'NetworkIn of an EC2 instance', b: 'no', why: 'AWS/EC2.' },
        { t: 'CPU credit balance of a t3 instance', b: 'no', why: 'CPU credit metrics in AWS/EC2.' },
        { t: 'A failed system status check', b: 'no', why: 'status check metrics, every minute.' },
        { t: 'Request count of an Application Load Balancer', b: 'no', why: 'the load balancer publishes it.' },
        { t: 'Memory used on a Linux instance', b: 'ag', why: 'inside the OS.' },
        { t: 'Swap used on a Linux instance', b: 'ag', why: 'inside the OS.' },
        { t: 'Free space on the root file system', b: 'ag', why: 'disk space, not disk I/O.' },
        { t: 'Memory of servers in your own data center', b: 'ag', why: 'the agent runs on-premises too.' },
        { t: 'An application log file on an EC2 instance', b: 'ag', why: 'the agent ships log files.' }] } },
      { pair: 'basic-agent' },
      { callout: 'Older material installs the **CloudWatch Logs agent** (`awslogs`) for log files and separate monitoring scripts for memory. The Logs agent is **deprecated**: AWS strongly recommends the unified CloudWatch agent, which is required on instances that use IMDSv2. The exam answer “install the CloudWatch agent” is right under both.', kind: 'update' },
      { check: { id: 'ch4-role', q: 'The agent is installed on an instance, but no `CWAgent` metrics ever appear and its log shows access denied errors. What is missing?', opts: [
        { t: 'Detailed monitoring on the instance, which the agent needs before CloudWatch accepts its metrics.', why: 'unrelated: detailed monitoring changes EC2’s own metrics.' },
        { t: 'An SNS topic for the namespace, because custom metrics are delivered to CloudWatch through SNS.', why: 'metrics go straight to CloudWatch.' },
        { t: 'Permission to publish: an instance profile role with CloudWatchAgentServerPolicy attached.', why: 'the agent needs IAM permissions to put metrics and logs.' }], a: 2,
        why: 'Role, configuration, installation — in that order. Access denied = the role.' } },
      { check: fromDrill('W1', 'Exam Q44') },
      { check: fromDrill('W7') },
      { drills: ['W1', 'W7'] }
    ] },

    /* ---------------------------------------------------------------- 5 */
    { id: 'ch5', title: 'Alarms: from a number to an action', domains: 'D2 D3 D4', blocks: [
      'An **alarm** watches one metric (or a metric math expression) and is always in one of three states: `OK` (within the threshold), `ALARM` (outside it), `INSUFFICIENT_DATA` (just created, the metric is not available, or there is not enough data).',
      { h: 'Period, evaluation periods, datapoints to alarm' },
      'Three settings decide when the state changes:',
      { ul: [
        '**Period** — the length of time that makes one datapoint (60 seconds, 300 seconds …).',
        '**Evaluation periods (N)** — how many of the most recent datapoints are looked at.',
        '**Datapoints to alarm (M)** — how many of those N must breach for `ALARM`. They need not be consecutive. Different M and N make an “**M out of N**” alarm.'] },
      'With a 1-minute period, 4 out of 5 looks at the last 5 minutes; 3 out of 3 with a 10-minute period looks at 30 minutes. Alarms with periods of a minute or more are evaluated every minute. M out of N is how an alarm ignores a single spike and still catches a real problem.',
      { h: 'Missing data' },
      'Sometimes datapoints do not arrive — a server is down, or the metric reports only when something happens. Each alarm says how to treat them: `missing` (the default: if everything in the range is missing, `INSUFFICIENT_DATA`), `notBreaching` (good), `breaching` (bad) or `ignore` (keep the current state). Use `notBreaching` for a metric that only reports errors; AWS recommends `missing` for alarms that stop, terminate, reboot or recover EC2 instances. The widget reproduces AWS’s own worked tables row by row.',
      { widget: 'alarmSim' },
      { check: { id: 'ch5-mofn', q: 'An alarm uses a 1-minute period, **2 datapoints to alarm** and **3 evaluation periods**. The last three minutes were breaching, fine, breaching. What is its state?', opts: [
        { t: '`ALARM`, because two of the last three datapoints breach and they do not need to be consecutive.', why: 'M out of N: 2 of 3.' },
        { t: '`OK`, because the fine minute in the middle resets the count of breaching datapoints to zero.', why: 'nothing resets; any 2 of the last 3.' },
        { t: '`INSUFFICIENT_DATA`, because the three datapoints disagree with each other about the threshold.', why: 'that state means data is missing, not mixed.' }], a: 0,
        why: 'Datapoints to alarm need not be consecutive, only within the last N.' } },
      { check: { id: 'ch5-missing', q: 'An alarm on a metric that is published **only when an error happens** keeps going to `INSUFFICIENT_DATA` on quiet nights. Which treatment of missing data fits?', opts: [
        { t: '`breaching`, so that a quiet night with no error datapoints is treated as an error state.', why: 'quiet would page everyone.' },
        { t: '`missing`, so that the alarm keeps showing that the metric did not report during the night.', why: 'that is the default causing the grey state.' },
        { t: '`notBreaching`, because no datapoint simply means no error, so the alarm should stay OK.', why: 'AWS’s own example for metrics that report only on errors.' }], a: 2,
        why: 'Match the treatment to what silence means. For error-only metrics silence is good.' } },
      { h: 'What an alarm can do' },
      { table: { head: ['Action', 'What happens', 'Typical use'], key: true, rows: [
        ['**SNS topic**', 'notify people (email, SMS) or applications', 'page the on-call team'],
        ['**Lambda function**', 'invoke a function directly', 'a custom fix'],
        ['**EC2 action**', '**stop, terminate, reboot or recover** the instance (alarms on EC2 metrics)', 'stop idle instances; recover on a failed system status check ([[../07-ha-dr/#learn/ch3|Session 7, chapter 3]])'],
        ['**Auto Scaling**', 'run a simple or step scaling policy (target tracking manages its own alarms — [[../10-compute/#learn/ch7|Session 10, chapter 7]])', 'add capacity'],
        ['**Systems Manager OpsItem**', 'open a work item in OpsCenter (on ALARM only)', 'track the incident']] } },
      'Actions run when the state **changes**, not again while it stays (Auto Scaling actions are the exception). Every state change is also an EventBridge event. Route 53 can use an alarm as the health check of a private resource ([[../04-global/#learn/ch9|Session 4, chapter 9]]).',
      { callout: 'Older material wires alarm → SNS → Lambda. An alarm can now **invoke a Lambda function directly**, which AWS calls the easiest way to automate custom actions. Both designs work; a bank that offers the SNS route is not wrong.', kind: 'update' },
      { h: 'Composite alarms, anomaly detection, billing alarms' },
      { ul: [
        '**Composite alarm** — an alarm whose state is a rule over other alarms (“CPU alarm AND error alarm”). Notify from the composite only and the noise drops. Composite alarms cannot run Auto Scaling actions.',
        '**Anomaly detection** — CloudWatch learns the metric’s normal band (hourly, daily, weekly patterns and trends) and alarms when the value leaves the band above, below or both. No static threshold to guess.',
        '**Billing alarm** — on the estimated charges metric, which is stored in **US East (N. Virginia)** for the whole account; billing alerts must be enabled first.'] },
      { h: 'Alarm or EventBridge rule?' },
      'The deciding question: is it a **number over time**, or a **thing that happened**? “CPU above 80% for 10 minutes” is an alarm. “When an instance is terminated”, “when someone calls `DeleteBucket`”, “when AWS Health announces maintenance” are events: an **EventBridge rule** with a target (Session 9, chapter 5).',
      { pair: 'alarm-eb' },
      { check: fromDrill('W8') },
      { check: fromDrill('W9') },
      { check: fromDrill('W10') },
      { check: fromDrill('W11') },
      { drills: ['W8', 'W9', 'W10', 'W11'] }
    ] },

    /* ---------------------------------------------------------------- 6 */
    { id: 'ch6', title: 'CloudWatch Logs: keep, search, react, ship', domains: 'D1 D3 D4', blocks: [
      'Log events arrive in **log streams** (one per source: an instance, a Lambda execution environment, a container) inside **log groups** (one per application or component). Many services write here directly: Lambda functions, ECS tasks through their execution role ([[../10-compute/#learn/ch9|Session 10, chapter 9]]), VPC Flow Logs ([[../03-networking/#learn/ch11|Session 3, chapter 11]]), a CloudTrail trail, RDS Enhanced Monitoring, and the agent on your servers.',
      { h: 'Keep: retention' },
      'A log group keeps its events **forever by default**. Set a **retention** between **one day and 10 years** and CloudWatch Logs deletes older events itself; expired data cannot be recovered. Log groups can be encrypted with a KMS key, and data protection can mask sensitive values.',
      { h: 'React: metric filters' },
      'A **metric filter** defines a pattern (the word `ERROR`, a status code, a JSON field) and turns every matching event into a value of a CloudWatch metric. Then you alarm on that metric like any other. Filters **do not work backwards**: they count only events written after they were created.',
      { check: { id: 'ch6-retro', q: 'A metric filter for `ERROR` is created at 10:00. The log group has thousands of ERROR lines from the night before. What does the new metric show for the night?', opts: [
        { t: 'The full count for the night, because CloudWatch Logs rescans the group when a filter is created.', why: 'there is no rescan.' },
        { t: 'Nothing: metric filters count only events that arrive after they exist, so use Logs Insights for the night.', why: 'not retroactive.' },
        { t: 'The count for the last 24 hours, because metric filters look back one day when they are created.', why: 'no look-back window at all.' }], a: 1,
        why: 'Metric filters are forward-only. The past is a Logs Insights query.' } },
      { h: 'Ship: subscription filters and export' },
      'A **subscription filter** is a real-time feed: matching events go to **Lambda**, **Kinesis Data Streams** or **Amazon Data Firehose** (and from there to OpenSearch, S3 or a partner), usually less than three minutes after they arrive. Through a **CloudWatch Logs destination** that wraps a Kinesis stream, other accounts can subscribe their log groups to one central account. **Export to S3** is something else: a batch task over a time range; data can take up to **12 hours** to become available for export, and AWS recommends subscriptions, not regular exports, for continuous archiving.',
      { check: { id: 'ch6-export', q: 'Why is a daily **export task** the wrong answer for “logs must reach the SIEM within minutes”?', opts: [
        { t: 'Exports are batch jobs: log data can take up to 12 hours to become available for export at all.', why: 'not real time by design.' },
        { t: 'Exports can only write to S3 buckets in the same account as the log group, never to another one.', why: 'false — another account is allowed.' },
        { t: 'Exports are possible only for log groups in the Infrequent Access class, which a SIEM cannot read.', why: 'false — both classes can export.' }], a: 0,
        why: 'Within minutes = subscription filter. Export = a one-off batch.' } },
      { h: 'Search: Logs Insights and Live Tail' },
      '**Logs Insights** runs queries over stored log data — filter, parse, count by hour — with nothing to deploy; you pay for the data each query scans. **Live Tail** shows new events as they arrive, filtered by a pattern, for one or more log groups: the view during a deployment.',
      { widget: 'chooser', args: { title: 'Where should these logs go?', tree: LOGTREE } },
      { widget: 'stepper', args: { title: 'From a log line to a page', line: 'logs', steps: [
        { title: 'The line', text: 'The payment service writes “ERROR card declined by processor” to its log group, dozens of times a minute when the processor fails.' },
        { title: 'The metric filter', text: 'A metric filter on the log group matches ERROR and adds 1 to the metric PaymentErrors for every matching event.' },
        { title: 'The alarm', text: 'An alarm on PaymentErrors: Sum over 5 minutes above 10, 1 out of 1 evaluation periods, missing data as notBreaching (no errors, no datapoints).' },
        { title: 'The page', text: 'The alarm goes to ALARM and notifies an SNS topic; the on-call engineer gets an email and a text.', note: 'The same filter counts nothing from before it was created; last night is a Logs Insights query.', noteTitle: 'Forward only' },
        { title: 'The search', text: 'The engineer runs a Logs Insights query over the last hour to see which merchants are affected.' }] } },
      { pair: 'mfilter-sub' },
      { callout: 'Three things older material does not show. The **Infrequent Access** log class is now called **Essentials**: cheaper ingestion, but no metric filters, no subscription filters, no Live Tail, no embedded metric format (and a log group’s class cannot be changed after creation). A log group can have **up to five** subscription filters, and an account can add **one account-level** subscription filter per Region. **Log centralization** rules copy log groups from chosen accounts or the whole organization into a central account and Region. Banks answer “central logging” with subscription filters and a destination — still correct.', kind: 'update' },
      { check: fromDrill('W12') },
      { check: fromDrill('W13') },
      { check: fromDrill('W14') },
      { check: fromDrill('W15') },
      { check: fromDrill('W16') },
      { drills: ['W12', 'W13', 'W14', 'W15', 'W16'] }
    ] },

    /* ---------------------------------------------------------------- 7 */
    { id: 'ch7', title: 'Seeing the application: dashboards, Insights, X-Ray, canaries', domains: 'D2 D3', blocks: [
      '**Dashboards** put metrics, alarms and log queries on one page. For many accounts, **CloudWatch cross-account observability** links **source accounts** to a **monitoring account** within a Region (through AWS Organizations or Observability Access Manager): the monitoring account sees and alarms on their metrics, logs and traces without copying them.',
      { h: 'Ready-made views' },
      { ul: [
        '**Container Insights** — metrics, logs and traces for ECS and EKS clusters, services and tasks in one view.',
        '**Lambda Insights** — the same for Lambda functions.',
        '**Contributor Insights** — rules over log data that rank the **top-N contributors** in real time: the busiest client IPs, the URLs with the most errors, the heaviest users.'] },
      { h: 'From outside: canaries and real users' },
      'A **CloudWatch Synthetics canary** is a script on a schedule that follows the routes a customer would — load a page, sign in, check out — against your endpoints and APIs, even when no customer is online. It runs as a Lambda function in your account, and its failures can alarm: you find the problem before customers report it. **CloudWatch RUM** is the opposite: it collects data from **real user sessions** in web and mobile apps (load times, errors, devices) and keeps it 30 days. Canary = synthetic, always on; RUM = real, only when users are there.',
      { check: { id: 'ch7-canary', q: 'A team wants to know about a broken login page **at 04:00**, when nobody uses the site. Which feature fits, and why?', opts: [
        { t: 'CloudWatch RUM, because it records every session of the users who try to log in during the night.', why: 'with no users there are no sessions.' },
        { t: 'Contributor Insights, because it ranks the login requests that fail most often during the night.', why: 'no requests, nothing to rank.' },
        { t: 'A Synthetics canary, because it runs the login flow on a schedule even when no customer is online.', why: 'synthetic traffic, always there.' }], a: 2,
        why: 'No traffic to measure = make your own: a canary.' } },
      { widget: 'sorter', args: { title: 'Which CloudWatch feature?', lead: 'Eight needs, four features. Decide before you check.', buckets: [{ id: 'syn', short: 'Canary', label: 'Synthetics canary' }, { id: 'rum', short: 'RUM', label: 'CloudWatch RUM' }, { id: 'ci', short: 'Contributor', label: 'Contributor Insights' }, { id: 'cont', short: 'Container', label: 'Container Insights' }], items: [
        { t: 'Check every few minutes that the checkout API answers', b: 'syn', why: 'scripted, scheduled.' },
        { t: 'Screenshots of the home page when a check fails', b: 'syn', why: 'canaries can store screenshots.' },
        { t: 'Page load times in real customers’ browsers', b: 'rum', why: 'real user sessions.' },
        { t: 'JavaScript errors by browser and device', b: 'rum', why: 'client-side data from users.' },
        { t: 'The 10 IP addresses sending the most requests', b: 'ci', why: 'top-N contributors.' },
        { t: 'The URLs that cause the most 500 errors', b: 'ci', why: 'top-N in log data.' },
        { t: 'CPU and memory per ECS task and service', b: 'cont', why: 'container metrics.' },
        { t: 'Memory and CPU per EKS pod and node', b: 'cont', why: 'container metrics.' }] } },
      { h: 'Inside: X-Ray' },
      'When one request crosses several services, logs and metrics show each service alone. **AWS X-Ray** follows the request:',
      { ul: [
        'Each service that handles it sends a **segment** (host, request, response, timing, errors).',
        'A segment breaks into **subsegments** for its calls downstream — DynamoDB, an HTTP API, a SQL database. Services that send no segments of their own appear as inferred nodes.',
        'All segments of one request share a **trace ID**: that is the **trace**. X-Ray draws every trace into a **trace map** (service map) of nodes and edges with their latency and errors — the place to see the slow hop.',
        '**Sampling** keeps it affordable: by default the first request each second and 5% of the rest. **Annotations** are indexed key-value pairs you can filter traces by; **metadata** is stored but not indexed.'] },
      'Turn it on with **active tracing** on a Lambda function, on an **API Gateway REST API stage** (X-Ray traces REST APIs), or by instrumenting the application code.',
      { check: { id: 'ch7-sampling', q: 'With the **default** sampling rule, which requests does X-Ray record?', opts: [
        { t: 'Every request, because sampling is off until you create a rule of your own in the X-Ray console.', why: 'a default rule exists.' },
        { t: 'The first request each second, plus five percent of the additional requests in that second.', why: 'the documented default.' },
        { t: 'One request per minute per service, so that the trace map shows each service at least once.', why: 'no such rule.' }], a: 1,
        why: 'Conservative by default to limit cost; change the reservoir and rate with sampling rules.' } },
      { pair: 'logs-xray' },
      { callout: 'Three changes. The **X-Ray SDKs and the X-Ray daemon** have been in **maintenance mode since 25 February 2026** (security fixes only); AWS recommends **OpenTelemetry** to instrument code and send traces to X-Ray, and the CloudWatch agent can receive them without a separate daemon. **Application Signals** adds automatic instrumentation, service dashboards and **SLOs**. **CloudWatch Evidently** (feature flags, A/B tests) was discontinued in October 2025; AWS points to **AWS AppConfig**. Practice exams still say “install the X-Ray daemon” — the answer “X-Ray for traces” is unchanged.', kind: 'update' },
      { check: fromDrill('W17') },
      { check: fromDrill('W18') },
      { check: fromDrill('W19') },
      { drills: ['W17', 'W18', 'W19'] }
    ] },

    /* ---------------------------------------------------------------- 8 */
    { id: 'ch8', title: 'CloudTrail: who called which API', domains: 'D1', blocks: [
      'Every action on AWS is an API call — from the console, the CLI, an SDK, or one AWS service on your behalf. **CloudTrail** records them: who (the user identity), what (the event name), when, from where (the source IP), and with which parameters and result. Sessions 5 and 6 left it for this chapter.',
      { h: 'Event history: on by default' },
      'CloudTrail is **enabled by default**. The **event history** gives you a viewable, searchable, downloadable, immutable record of the **past 90 days** of **management events** in **each Region**, at no CloudTrail charge. Its limits decide many questions: management events only (no data events, no Insights events), one account and one Region at a time, one attribute filter, and **90 days**.',
      { check: { id: 'ch8-history', q: 'Which question can CloudTrail **event history** answer with nothing set up?', opts: [
        { t: 'Who modified a security group in this Region three weeks ago, and from which IP address.', why: 'management event, inside 90 days.' },
        { t: 'Who downloaded a particular object from an S3 bucket in this Region three weeks ago.', why: 'object reads are data events; never in event history.' },
        { t: 'Who terminated an instance in this Region four months ago, and with which role.', why: 'older than 90 days.' }], a: 0,
        why: 'Event history = management events, 90 days, per Region.' } },
      { h: 'Why you still create a trail' },
      'A **trail** delivers events as log files to an **S3 bucket** you choose — about every 5 minutes — and optionally to **CloudWatch Logs** and **EventBridge**. You keep the files as long as you want (S3 lifecycle rules archive or delete them). One copy of your ongoing management events is delivered at no CloudTrail charge; you pay for S3. Trails created in the console are **multi-Region**: every enabled Region into one bucket. A trail records only from the moment it exists — it cannot fill in the past.',
      { h: 'Three kinds of events' },
      { table: { head: ['Event type', 'What it is', 'Default', 'Examples'], key: true, rows: [
        ['**Management events**', 'control-plane operations on resources', 'logged (event history, and trails)', 'CreateUser, RunInstances, DeleteTable, PutBucketPolicy, ConsoleLogin'],
        ['**Data events**', 'operations on or in a resource; high volume; extra charge', '**not logged** — turn on per trail', 'S3 GetObject and PutObject, Lambda Invoke, DynamoDB item reads and writes'],
        ['**Insights events**', 'unusual API call rate or error rate compared with the account’s baseline', 'not logged — turn on per trail; extra charge', 'a burst of TerminateInstances, a spike of AccessDenied errors']] } },
      { widget: 'sorter', args: { title: 'Management, data or Insights event?', lead: 'Nine activities. Which kind of CloudTrail event records each?', buckets: [{ id: 'mg', short: 'Management', label: 'Management event' }, { id: 'dt', short: 'Data', label: 'Data event' }, { id: 'in', short: 'Insights', label: 'Insights event' }], items: [
        { t: 'An administrator deletes an IAM role', b: 'mg', why: 'control plane.' },
        { t: 'Someone changes a bucket policy', b: 'mg', why: 'PutBucketPolicy is management.' },
        { t: 'A user signs in to the console', b: 'mg', why: 'ConsoleLogin.' },
        { t: 'An application reads an object from S3', b: 'dt', why: 'GetObject is a data event.' },
        { t: 'A function is invoked 5,000 times an hour', b: 'dt', why: 'Lambda Invoke is a data event.' },
        { t: 'A partner uploads files to a bucket', b: 'dt', why: 'PutObject.' },
        { t: 'Calls to TerminateInstances jump far above normal', b: 'in', why: 'unusual call rate.' },
        { t: 'AccessDenied errors suddenly spike on one API', b: 'in', why: 'unusual error rate.' },
        { t: 'A sudden burst of CreateUser calls at night', b: 'in', why: 'unusual write activity.' }] } },
      { widget: 'trailWindow' },
      { pair: 'history-trail' },
      { h: 'One trail for the whole organization' },
      'An **organization trail** is created in the **management account** or a **delegated administrator** account and applies to every account in the organization, in all Regions or one. **Member accounts can see it but cannot modify or delete it**, and by default they cannot read its log files. Put the bucket in a separate logging account (Control Tower’s Log Archive does exactly this — Session 6).',
      { widget: 'stepper', args: { title: 'An organization trail nobody can switch off', line: 'trail', steps: [
        { title: 'The bucket', text: 'In a logging account, create an S3 bucket whose policy lets CloudTrail write for the organization, with versioning and lifecycle rules to archive older files.' },
        { title: 'The trail', text: 'In the management account (or the delegated administrator), create an organization trail for all Regions that delivers to that bucket.' },
        { title: 'Integrity and encryption', text: 'Turn on log file integrity validation and SSE-KMS encryption with a key the logging account controls.' },
        { title: 'Member accounts', text: 'Every member account — new ones included — logs to the trail. Their administrators can see the trail but cannot stop, change or delete it.', note: 'An SCP that denies cloudtrail:StopLogging protects trails inside member accounts; an organization trail does not need it.', noteTitle: 'Why no SCP is needed for it' },
        { title: 'Queries and alerts', text: 'Athena queries the bucket; the trail also delivers to a CloudWatch Logs log group where metric filters raise alarms.' }] } },
      { check: { id: 'ch8-org', q: 'Who can **delete** an organization trail?', opts: [
        { t: 'The administrator of any member account, from the CloudTrail console of that member account.', why: 'members can see it, not change it.' },
        { t: 'Nobody: once an organization trail is created it can never be deleted, even by its creator.', why: 'false — the owner can manage it.' },
        { t: 'The management account (or the delegated administrator) that created and manages it.', why: 'created and managed there.' }], a: 2,
        why: 'Organization trails live in the management or delegated administrator account; members see them but cannot modify or delete them.' } },
      { h: 'Proving and protecting the files' },
      '**Log file integrity validation** makes CloudTrail hash every log file (SHA-256) and deliver, **every hour**, a **digest file** that lists the hashes of the last hour’s files and is signed (SHA-256 with RSA). With the AWS CLI you can prove that a file was not modified or deleted after delivery. For encryption, trails created in the console encrypt log and digest files with a KMS key by default; without SSE-KMS the files use S3 server-side encryption.',
      { h: 'Reacting and querying' },
      'React in near real time: a trail that delivers to **CloudWatch Logs** lets a **metric filter** count events (root sign-ins, failed console logins, security group changes) and an **alarm** page someone; **EventBridge** receives API calls recorded by CloudTrail and can route them to Lambda, SNS or Automation. Query the history with **Athena** over the bucket, or with **Logs Insights** over the log group.',
      { check: { id: 'ch8-insights', q: 'A team wants to be told when the **rate of write management API calls** suddenly becomes unusual for the account. Which CloudTrail feature is built for that?', opts: [
        { t: 'Log file integrity validation, which flags hours whose digest files contain more events than usual.', why: 'it proves files are unchanged; it does not judge rates.' },
        { t: 'CloudTrail Insights events, which compare API call and error rates with the account’s baseline.', why: 'built for unusual activity.' },
        { t: 'Data events, which record each write call with a counter of how many came before it.', why: 'data events record object-level calls, not rates.' }], a: 1,
        why: 'Unusual rate of calls or errors = Insights events (turned on per trail, extra charge).' } },
      'CloudTrail is the record; **GuardDuty** reads its own copy of these events (with VPC Flow Logs and DNS logs) to **detect threats** ([[../05-security/#learn/ch9|Session 5, chapter 9]]). “Who did it” is CloudTrail; “is someone attacking us” is GuardDuty.',
      { callout: '**CloudTrail Lake** — SQL over event data stores — is **no longer open to new customers from 31 May 2026**; existing customers continue, and AWS points to CloudWatch for similar capabilities. Practice exams may still answer “query CloudTrail events” with Lake; in a new design use Athena over the trail’s S3 logs or Logs Insights. Trails also gained **network activity events** (API calls made through your VPC endpoints) and **aggregated events** (data events summarised over five-minute windows).', kind: 'update' },
      { check: fromDrill('W20') },
      { check: fromDrill('W21') },
      { check: fromDrill('W22') },
      { check: fromDrill('W23') },
      { check: fromDrill('W24') },
      { drills: ['W20', 'W21', 'W22', 'W23', 'W24'] }
    ] },

    /* ---------------------------------------------------------------- 9 */
    { id: 'ch9', title: 'AWS Config, in one page', domains: 'D1', blocks: [
      'AWS Config was taught in full in Session 6: the configuration recorder, configuration items, rules (managed and custom), conformance packs, the aggregator, remediation with Systems Manager Automation, and the newer daily recording and proactive mode. This chapter only places it next to CloudWatch and CloudTrail, because the exam puts the three side by side.',
      { callout: 'Baseline **Q49**: the stem said “**configuration changes**” and you missed the keyword. That phrase is AWS Config’s signal: the **configuration timeline** of each resource, with **notifications** (Config sends configuration-item changes and compliance changes to an SNS topic). CloudTrail tells you who made the change; Config tells you what the resource looked like before and after.', kind: 'miss', title: 'Your Q49' },
      { table: { head: ['', 'CloudWatch', 'CloudTrail', 'AWS Config'], key: true, rows: [
        ['Answers', 'how is it performing?', 'who did what, when?', 'what did it look like, is it allowed?'],
        ['Records', 'metrics and log events', 'API calls', 'configuration items'],
        ['Reacts with', 'alarms', 'EventBridge rules, metric filters', 'rules, notifications, remediation'],
        ['Signal words', 'utilization, latency, errors per minute', 'who, which user, API activity, audit', 'configuration changes, compliant, history of a resource']] } },
      { pair: 'cw-trail-config' },
      { widget: 'sorter', args: { title: 'CloudWatch, CloudTrail or Config?', lead: 'Nine requirements, three services. Decide before you check.', buckets: [{ id: 'cw', short: 'CloudWatch', label: 'Amazon CloudWatch' }, { id: 'ct', short: 'CloudTrail', label: 'AWS CloudTrail' }, { id: 'cf', short: 'Config', label: 'AWS Config' }], items: [
        { t: 'Alert when read latency of a database rises above 20 ms', b: 'cw', why: 'a metric over time.' },
        { t: 'A dashboard of request counts per load balancer', b: 'cw', why: 'metrics.' },
        { t: 'Count failed logins in an application log', b: 'cw', why: 'CloudWatch Logs metric filter.' },
        { t: 'Find out who launched an instance type nobody approved', b: 'ct', why: 'the RunInstances call and its caller.' },
        { t: 'Keep a record of all API activity for an auditor', b: 'ct', why: 'a trail.' },
        { t: 'Which access key was used to delete a snapshot', b: 'ct', why: 'the user identity of the call.' },
        { t: 'Show how a VPC’s route tables looked two months ago', b: 'cf', why: 'configuration history.' },
        { t: 'Flag every security group that allows SSH from anywhere', b: 'cf', why: 'a Config rule.' },
        { t: 'Be notified whenever a bucket’s configuration changes', b: 'cf', why: 'configuration change notifications.' }] } },
      { callout: 'Config **detects**; it never blocks an API call (that is an SCP or IAM). Rules, conformance packs, the aggregator for all accounts, and automatic remediation: [[../06-governance/#learn/ch10|Session 6, chapter 10]].', kind: 'note', title: 'The rest of Config' },
      { link: '../06-governance/#learn/ch10', text: 'AWS Config in full — Session 6, chapter 10 →' },
      { check: { id: 'ch9-trio', q: 'An auditor asks for **the encryption setting of every RDS instance on 1 March** and **who changed any of them since**. Which pair answers it?', opts: [
        { t: 'CloudWatch for the settings on 1 March and CloudTrail for the changes, because both keep months of data.', why: 'CloudWatch holds metrics, not settings.' },
        { t: 'AWS Config for the settings on that date and CloudTrail for who made each change since then.', why: 'state from Config, callers from CloudTrail.' },
        { t: 'CloudTrail for the settings on 1 March and AWS Config for the callers, because Config records users.', why: 'swapped: Config records state, CloudTrail records callers.' }], a: 1,
        why: 'What it looked like = Config. Who changed it = CloudTrail.' } },
      { check: fromDrill('W2', 'Exam Q49') },
      { check: fromDrill('W25') },
      { drills: ['W2', 'W25'] }
    ] },

    /* ---------------------------------------------------------------- 10 */
    { id: 'ch10', title: 'Systems Manager: operating the fleet', domains: 'D1 D2', blocks: [
      'The monitoring tools tell you what is wrong; **AWS Systems Manager** is how you act on hundreds of servers without logging in to each. It works on **managed nodes**: EC2 instances, on-premises servers and other clouds’ machines that run the **SSM Agent** and can reach the Systems Manager service. On EC2 that takes an instance profile with **`AmazonSSMManagedInstanceCore`** (and, in private subnets with no internet path, the `ssm`, `ssmmessages` and `ec2messages` interface endpoints — Session 3). On-premises servers join through hybrid activations ([[../02-migration/#learn/ch7|Session 2, chapter 7]]).',
      { h: 'The tools, one job each' },
      { table: { head: ['Tool', 'Built for', 'Deciding words'], key: true, rows: [
        ['**Run Command**', 'run a command or script on many managed nodes now, by ID or tag, no SSH; no additional cost on EC2', 'run once, on all instances tagged …, right now'],
        ['**State Manager**', 'an **association** keeps a configuration true: reapplied on a schedule, applied to new nodes in the target', 'always, keep, enforce, including new instances'],
        ['**Patch Manager**', 'patch baselines, Scan or Scan and install, patch compliance', 'patch, security updates, compliance report'],
        ['**Maintenance Windows**', 'a schedule for disruptive tasks (patching, updates)', 'every second Sunday 02:00–04:00'],
        ['**Automation**', 'runbooks for maintenance, deployment and remediation across AWS resources', 'runbook, multi-step, remediate, Config remediation'],
        ['**Inventory**', 'metadata of each node: applications, versions, files, network settings', 'which instances run version …'],
        ['**OpsCenter**', 'OpsItems from alarms and events, resolved with runbooks', 'operational work items'],
        ['**Distributor**', 'package and publish software (the CloudWatch agent, third-party agents)', 'deploy an agent package'],
        ['**Session Manager**', 'an interactive shell, logged, no bastion ([[../03-networking/#learn/ch5|Session 3, chapter 5]])', 'one admin, one instance, no inbound port'],
        ['**Parameter Store**', 'configuration values and secrets ([[../05-security/#learn/ch6|Session 5, chapter 6]])', 'store the agent configuration']] } },
      { widget: 'chooser', args: { title: 'Which Systems Manager tool?', tree: SSMTREE } },
      { check: { id: 'ch10-tool', q: 'A setting must stay true on every instance **from now on**, including instances Auto Scaling launches next month. Which tool keeps it?', opts: [
        { t: 'State Manager, because an association reapplies the configuration and covers new nodes in its target.', why: 'built to keep a state.' },
        { t: 'Run Command, because one run on all current instances sets the configuration for good on them.', why: 'one run misses future instances and later drift.' },
        { t: 'Session Manager, because an administrator can set it on each instance as soon as it launches.', why: 'manual, one instance at a time.' }], a: 0,
        why: 'Now = Run Command. Always = State Manager.' } },
      { h: 'Patch Manager in more depth' },
      'A **patch baseline** says which patches are approved: rules that auto-approve patches some days after release, plus lists of approved and rejected patches. A patching run either **scans** (reports what is missing against the baseline) or **scans and installs**. You run it from a **patch policy** in Quick Setup (AWS’s recommended way; one policy can cover an organization’s accounts and Regions), from a **maintenance window** task, or on demand. Every scan feeds **patch compliance**: which nodes are compliant, which miss what. Patch Manager **fixes**; Amazon Inspector **finds** vulnerabilities and installs nothing.',
      { widget: 'stepper', args: { title: 'Patch 400 instances without SSH', line: 'ssm', steps: [
        { title: 'Managed nodes', text: 'All 400 instances run the SSM Agent with permission to reach Systems Manager; no SSH port is open.' },
        { title: 'Baselines', text: 'One patch baseline for Amazon Linux and one for Windows Server approve security patches seven days after release.' },
        { title: 'The schedule', text: 'A maintenance window every second Saturday 01:00–05:00 runs Scan and install on the instances tagged Patch=Group-A, then Group-B the next night.' },
        { title: 'The run', text: 'Patch Manager installs the approved patches, reboots where needed, and records the result per instance.', note: 'Two groups on two nights: the service never has all of its instances rebooting at once.', noteTitle: 'Keep the service up' },
        { title: 'The report', text: 'Patch compliance shows which instances are compliant and which still miss a patch; the team follows up on the rest.' }] } },
      { widget: 'sorter', args: { title: 'Run Command, Patch Manager, State Manager, Automation or Session Manager?', lead: 'Ten jobs, five tools. Decide before you check.', buckets: [{ id: 'rc', short: 'Run Cmd', label: 'Run Command' }, { id: 'pm', short: 'Patch', label: 'Patch Manager' }, { id: 'sm', short: 'State', label: 'State Manager' }, { id: 'au', short: 'Automation', label: 'Automation' }, { id: 'ss', short: 'Session', label: 'Session Manager' }], items: [
        { t: 'Restart a web service on 200 tagged instances now', b: 'rc', why: 'once, many nodes.' },
        { t: 'Collect one log file from every instance today', b: 'rc', why: 'a one-off command.' },
        { t: 'Install monthly OS security updates with a compliance report', b: 'pm', why: 'baselines and compliance.' },
        { t: 'Report which nodes miss a critical patch, without installing', b: 'pm', why: 'a Scan operation.' },
        { t: 'Keep an antivirus agent installed and running on every node', b: 'sm', why: 'an association keeps it true.' },
        { t: 'Make sure a port stays closed on all new instances', b: 'sm', why: 'state to keep.' },
        { t: 'Remediate a noncompliant Config rule with a runbook', b: 'au', why: 'Automation is Config’s remediation engine.' },
        { t: 'Create a new AMI with the latest patches, step by step', b: 'au', why: 'a multi-step runbook.' },
        { t: 'An engineer needs a shell on one instance for 10 minutes', b: 'ss', why: 'interactive.' },
        { t: 'Debug one container host interactively with no bastion', b: 'ss', why: 'one shell, logged.' }] } },
      { pair: 'patch-inspector' },
      { callout: 'Two Systems Manager tools are closing: **Incident Manager** (incidents, escalation, response plans) and **Change Manager** (change requests and approvals) are **closed to new customers from 7 November 2025**; existing customers continue. On the other side, **Default Host Management Configuration** makes every EC2 instance in an account and Region a managed node **without an instance profile** (Systems Manager applies a default role), and **patch policies** in Quick Setup patch a whole organization. Banks may offer Incident Manager for incident response — recognise it.', kind: 'update' },
      { check: { id: 'ch10-dhmc', q: 'An account has hundreds of EC2 instances with no instance profile, and the team wants them all to become managed nodes **without** attaching a role to each. What does that?', opts: [
        { t: 'Systems Manager Inventory, which discovers every instance in the account and registers it as a node.', why: 'Inventory collects metadata from nodes that are already managed.' },
        { t: 'A hybrid activation, which turns any EC2 instance into a managed node with an mi- identifier.', why: 'built for on-premises and other clouds.' },
        { t: 'Default Host Management Configuration, which gives Systems Manager a default role for all instances.', why: 'account- and Region-wide, no instance profile needed.' }], a: 2,
        why: 'Instance profile per instance, or Default Host Management Configuration for the whole account and Region.' } },
      { check: fromDrill('W26') },
      { check: fromDrill('W27') },
      { check: fromDrill('W28') },
      { drills: ['W26', 'W27', 'W28'] }
    ] },

    /* ---------------------------------------------------------------- 11 */
    { id: 'ch11', title: 'Advice, health and service-specific monitoring', domains: 'D1 D2 D4', blocks: [
      'The last family is AWS talking to you about your account.',
      { h: 'Trusted Advisor' },
      '**AWS Trusted Advisor** inspects the account against AWS’s best practices and recommends changes in **six categories**: **cost optimization** (idle and underused resources), **performance**, **security**, **fault tolerance** (redundancy gaps), **service limits** (usage close to a quota) and **operational excellence**. The checks are AWS’s own — you cannot write one. Results can go to EventBridge, and an organizational view covers many accounts.',
      { table: { head: ['Support plan', 'Trusted Advisor checks'], key: true, rows: [
        ['**Basic Support**', 'all **Service Limits** checks and selected **Security** and **Fault tolerance** checks (Security checks refreshed by hand)'],
        ['**Business Support+**, **Enterprise Support**, **Unified Operations**', 'all checks, the Trusted Advisor API and automatic refreshes']] } },
      { callout: 'Older material says “Business or Enterprise Support unlocks all Trusted Advisor checks”. AWS’s guide now names **Business Support+, Enterprise Support or Unified Operations**, and **Developer Support, Business Support and Enterprise On-Ramp are discontinued on 1 January 2027** (Enterprise On-Ramp customers are being moved to Enterprise Support during 2026). In a bank question, “the higher Support plans” is the idea; the plan names are changing.', kind: 'update' },
      { check: { id: 'ch11-plan', q: 'An account on **Basic Support** opens Trusted Advisor. Which checks can it use?', opts: [
        { t: 'Every check in every category, because Trusted Advisor is included in all plans at no charge.', why: 'the full set needs a higher plan.' },
        { t: 'Only the cost optimization checks, because Basic accounts are meant to start by saving money.', why: 'cost checks are not in the Basic set.' },
        { t: 'All Service Limits checks plus selected Security and Fault tolerance checks, refreshed by hand.', why: 'the Basic set as AWS documents it.' }], a: 2,
        why: 'Basic: service limits and a few security and fault-tolerance checks. Everything else: a higher plan.' } },
      { h: 'AWS Health and Service Quotas' },
      'The **AWS Health Dashboard** shows two things: **public events** about AWS services (the service health page, no sign-in needed) and **your account’s events** — issues and **scheduled changes** (maintenance, required actions) that affect your resources. Health events also reach EventBridge ([[../09-serverless/#learn/ch5|Session 9, chapter 5]]). **Service Quotas** lists each quota with its usage, takes increase requests, and can create a CloudWatch alarm when usage gets close. **Compute Optimizer**, which recommends instance sizes from CloudWatch metrics (including the agent’s memory), belongs to cost: Session 12.',
      { widget: 'sorter', args: { title: 'Trusted Advisor, Health, Service Quotas or Compute Optimizer?', lead: 'Eight questions, four services. Decide before you check.', buckets: [{ id: 'ta', short: 'Advisor', label: 'Trusted Advisor' }, { id: 'he', short: 'Health', label: 'AWS Health Dashboard' }, { id: 'sq', short: 'Quotas', label: 'Service Quotas' }, { id: 'co', short: 'Optimizer', label: 'Compute Optimizer' }], items: [
        { t: 'Are any of our S3 buckets open to the world?', b: 'ta', why: 'a security check.' },
        { t: 'Which load balancers have no traffic?', b: 'ta', why: 'a cost optimization check.' },
        { t: 'Will AWS retire the hardware under one of our instances?', b: 'he', why: 'a scheduled change for your account.' },
        { t: 'Is the S3 service having trouble in this Region right now?', b: 'he', why: 'a public service event.' },
        { t: 'Raise the limit on Elastic IP addresses before a launch', b: 'sq', why: 'request a quota increase.' },
        { t: 'Alarm when vCPU usage reaches 80% of the On-Demand quota', b: 'sq', why: 'quota usage alarm.' },
        { t: 'Which instance size fits this workload’s CPU and memory use?', b: 'co', why: 'rightsizing recommendations (Session 12).' },
        { t: 'Which instances are larger than their memory use needs?', b: 'co', why: 'rightsizing from CloudWatch metrics, the agent’s memory included.' }] } },
      { pair: 'ta-config' },
      { h: 'EC2 status checks' },
      'Every minute EC2 runs status checks on every instance and publishes them as metrics; one failure makes the instance **impaired**.',
      { table: { head: ['Check', 'Watches', 'Who fixes it'], key: true, rows: [
        ['**System status check**', 'the AWS systems under the instance: power, network, the physical host', 'AWS — or you, by stopping and starting (the instance moves to new hardware) or by the **recover** alarm action ([[../07-ha-dr/#learn/ch3|Session 7, chapter 3]])'],
        ['**Instance status check**', 'your instance’s software and network configuration: exhausted memory, a corrupted file system, a bad kernel', 'you — reboot or fix the configuration'],
        ['**Attached EBS status check**', 'whether the attached EBS volumes are reachable and complete I/O', 'depends on the cause']] } },
      { callout: 'Banks know two status checks. EC2 now lists **five types**: system, instance and **attached EBS** (managed by EC2, on every instance), opt-in **application status checks** (HTTP or HTTPS responses of your application) and **performance status checks** on supported accelerated instances.', kind: 'update' },
      { check: { id: 'ch11-status', q: 'An instance fails its **system** status check. What does that point to, and what is your own fix?', opts: [
        { t: 'A problem in the instance’s OS, such as a full disk; reboot the instance and clean up the disk.', why: 'that is the instance status check.' },
        { t: 'A problem with the AWS host under it; stop and start the instance to move it to new hardware.', why: 'or use the recover action.' },
        { t: 'A problem with its security group; open the health check port to the EC2 status service.', why: 'status checks do not depend on your security group.' }], a: 1,
        why: 'System = AWS’s side (host, power, network). Instance = your side (OS, configuration).' } },
      { h: 'RDS: three depths of monitoring' },
      { table: { head: ['Feature', 'Where the data comes from', 'Shows', 'Use it when'], key: true, rows: [
        ['**CloudWatch metrics**', 'the **hypervisor**', 'CPU, connections, storage, I/O, latency per instance', 'dashboards and alarms'],
        ['**Enhanced Monitoring**', 'an **agent on the DB instance**, into CloudWatch Logs (`RDSOSMetrics`, kept 30 days by default)', 'OS metrics and the **process list**, as often as every second', 'which process uses the CPU or memory'],
        ['**CloudWatch Database Insights** (formerly Performance Insights)', 'the database engine', '**database load** by SQL statement, wait event, host and user', 'which query slows the database']] } },
      { callout: '**Performance Insights** reached its end of life on **31 July 2026**, and AWS has moved its users to **CloudWatch Database Insights**: **Standard** mode (the default, with longer retention at Performance Insights’ price) and **Advanced** mode, which adds fleet-wide views, SQL lock analysis and execution plans. Banks say “Performance Insights” for the database-load answer; the idea is unchanged.', kind: 'update' },
      { check: { id: 'ch11-rds', q: 'A DBA must find **which SQL statement** causes most of an RDS database’s load. Which feature answers that?', opts: [
        { t: 'CloudWatch Database Insights (formerly Performance Insights), which breaks load down by SQL and waits.', why: 'database load by SQL statement.' },
        { t: 'Enhanced Monitoring, which lists the operating system processes and their CPU on the DB instance.', why: 'OS processes, not SQL statements.' },
        { t: 'The DB instance’s standard CloudWatch metrics, such as CPUUtilization over one-minute periods.', why: 'shows that the load is high, not which query.' }], a: 0,
        why: 'Hypervisor → CloudWatch; OS → Enhanced Monitoring; SQL → Database Insights.' } },
      { h: 'Access logs, as pointers' },
      'Two more logs answer “which requests hit it”: **Elastic Load Balancing access logs** (optional, off by default, written to an S3 bucket) and **VPC Flow Logs** for IP traffic ([[../03-networking/#learn/ch11|Session 3, chapter 11]]). Neither says who called an AWS API — that stays CloudTrail.',
      { check: fromDrill('W29') },
      { check: fromDrill('W30') },
      { drills: ['W29', 'W30'] }
    ] },

    /* ---------------------------------------------------------------- 12 */
    { id: 'ch12', title: 'Triggers, traps, cheat block and record', blocks: [
      'The whole session on one map: tap a line to see what it was built for, its triggers, its traps and your misses on it.',
      { map: true },
      { widget: 'triggerTable' },
      { link: '#traps', text: 'All 16 traps, with the drills that test them →' },
      { pre: S.cheat, label: 'Cheat block · copy it by hand' },
      { h: 'Your record' },
      { log: true },
      'W1 is your baseline miss Q44 rebuilt, W2 is Q49 in a new scenario, and W3 carries the prestige pattern (GuardDuty, Security Hub and Detective for a plain audit question). Run the 30 scenarios once; your new misses appear in Progress.',
      { link: '#drill', text: 'Go to the drill (30 scenarios)', btn: true }
    ] }
  ];
})();
