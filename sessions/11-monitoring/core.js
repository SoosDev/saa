/* Session 11 — Monitoring & operations: meta, lines, the monitoring map, stub, method, cheat sheet, compare, traps, log.
   Colour rule: a service keeps its colour on every page. Session 11 adds no hue: every family is an ink line (4 px)
   told apart by dash pattern and station shape, and every line is labelled. Inherited: `config` keeps Session 6's
   24 8 dash and rings. `ssm` is a new id (Session 2's `ops` is solid and means hybrid activations only; the solid
   line here is CloudWatch).
   Facts: docs/session-11-monitoring.md, "Facts verified 2026-11-11". */
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
  const ring = (cx, cy, lines) => [shape({ el: 'circle', a: { cx, cy, r: 10 } }, lines), { el: 'circle', pick: lines, a: { cx, cy, r: 3.5 }, style: 'fill:var(--ink)' }];
  const square = (cx, cy, lines) => shape({ el: 'rect', a: { x: cx - 9, y: cy - 9, width: 18, height: 18 } }, lines);
  const diamond = (cx, cy, lines) => shape({ el: 'path', a: { d: `M${cx} ${cy - 11} L${cx + 11} ${cy} L${cx} ${cy + 11} L${cx - 11} ${cy} Z` } }, lines);
  const triangle = (cx, cy, lines) => shape({ el: 'path', a: { d: `M${cx} ${cy - 11} L${cx + 11} ${cy + 8} L${cx - 11} ${cy + 8} Z` } }, lines);
  const hexa = (cx, cy, lines) => shape({ el: 'path', a: { d: `M${cx - 5} ${cy - 10} H${cx + 5} L${cx + 11} ${cy} L${cx + 5} ${cy + 10} H${cx - 5} L${cx - 11} ${cy} Z` } }, lines);
  const penta = (cx, cy, lines) => shape({ el: 'path', a: { d: `M${cx} ${cy - 11} L${cx + 11} ${cy - 2} L${cx + 7} ${cy + 10} L${cx - 7} ${cy + 10} L${cx - 11} ${cy - 2} Z` } }, lines);
  const pill = (x, w, text, lines) => [{ el: 'rect', pick: lines, a: { x, y: 50, width: w, height: 22, rx: 11 }, style: INK }, sub(x + w / 2, 65.5, text, lines, 'middle')];
  const LABELS = [];
  const box = (x, y, w, hgt, label) => {
    LABELS.push({ el: 'text', a: { x: x + w - 10, y: y + 18, 'font-size': 11, 'font-weight': 800, 'letter-spacing': 1, 'text-anchor': 'end' }, style: 'fill:var(--ink2)' + HALO, text: label });
    return [{ el: 'rect', a: { x, y, width: w, height: hgt, rx: 8 }, style: 'fill:var(--surface);stroke:var(--chip-border);stroke-width:1.5' }];
  };
  const zoneLabel = (x, y, t) => ({ el: 'text', a: { x, y, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5 }, style: 'fill:var(--ink2)', text: t });

  Object.assign(S, {
    meta: { id: '11-monitoring', n: 11, title: 'Monitoring & Operations', brand: 'Monitoring Transit Map', home: '../../', updated: '2026-11-11' },

    lines: [
      { id: 'cw', name: 'CloudWatch metrics · alarms', short: 'Metrics · alarms', cls: 'ink', width: 4, alias: ['CloudWatch', 'Amazon CloudWatch', 'CloudWatch metric', 'metric', 'namespace', 'dimension', 'detailed monitoring', 'basic monitoring', 'custom metric', 'high-resolution metric', 'PutMetricData', 'CloudWatch alarm', 'alarm', 'composite alarm', 'anomaly detection', 'datapoints to alarm', 'evaluation periods', 'billing alarm', 'metric streams', 'dashboard'],
        verb: 'counts how it performs and alarms on the numbers',
        from: 'AWS services and the agent publish metrics (namespace, dimensions, period) → statistics on a dashboard → alarm (period × N evaluation periods, M datapoints to alarm) → SNS, Lambda, Auto Scaling, EC2 action, OpsItem',
        built: 'The **numbers**. AWS services publish **metrics** into **namespaces** (`AWS/EC2`, `AWS/RDS` …), identified by **dimensions** (an instance ID) and summarised by a **statistic** over a **period**. EC2 sends them every **5 minutes** for free (**basic monitoring**) or every **minute** for a charge (**detailed monitoring**). Your own numbers are **custom metrics** (`PutMetricData`), down to **1 second** if high resolution. CloudWatch keeps 1-minute data for 15 days, 5-minute for 63 days, 1-hour for 455 days. An **alarm** watches one metric (or a math expression) and changes state — `OK`, `ALARM`, `INSUFFICIENT_DATA` — when **M of the last N** datapoints breach, then acts: an SNS topic, a Lambda function, an Auto Scaling policy, an EC2 stop, terminate, reboot or recover.',
        says: ['how is it performing', 'CPU above 80% for 10 minutes', 'react within one minute', 'orders per minute from the application', 'notify the team when the threshold is crossed', 'stop the instance automatically when idle', 'alert only when several conditions are true', 'unusual compared with the usual pattern', 'estimated charges exceed a budget'],
        switch: [{ to: 'logs', when: 'the number lives only inside a log line, or memory and disk inside the OS (the agent)' }, { to: 'trail', when: 'the question is who called an API, not how much or how fast' }, { to: 'apm', when: 'one request is slow across several services and you need the slow hop' }],
        traps: ['Detailed monitoring “to see memory” (it only makes the same hypervisor metrics arrive every minute).', 'An alarm to react to an event such as “an instance changed state” (an EventBridge rule).', 'Raising thresholds or buying a bigger instance to stop a flapping alarm (M out of N, a longer period).', 'A Lambda function on a schedule to stop idle instances (an alarm with an EC2 stop action).'],
        update: 'An alarm can now **invoke a Lambda function directly** — older material routes alarm → SNS → Lambda, which still works. Alarms can also create Systems Manager OpsItems and start investigations.' },
      { id: 'logs', name: 'CloudWatch Logs · agent', short: 'Logs · agent', cls: 'ink', width: 4, dash: '2 7', alias: ['CloudWatch Logs', 'log group', 'log stream', 'retention', 'metric filter', 'subscription filter', 'Logs Insights', 'CloudWatch Logs Insights', 'Live Tail', 'export to S3', 'CreateExportTask', 'CloudWatch agent', 'unified CloudWatch agent', 'CWAgent', 'CloudWatch Logs agent', 'awslogs', 'StatsD', 'collectd', 'log centralization'],
        verb: 'keeps what systems write, and reads inside the OS',
        from: 'agent on EC2 or on-premises · Lambda · ECS · Flow Logs · CloudTrail → log group (retention) → metric filter → alarm · subscription filter → Lambda / Kinesis / Firehose · Logs Insights queries · export to S3',
        built: 'The **text**, and the **agent** that reads inside a server. Log events land in **log streams** inside **log groups**; each group keeps them **forever by default** or for a retention you set (1 day to 10 years). A **metric filter** counts matching lines into a metric you can alarm on (from now on, never backwards). A **subscription filter** streams matching events in near real time to **Lambda**, **Kinesis Data Streams** or **Amazon Data Firehose** (and on to OpenSearch or S3). **Logs Insights** queries the logs with no infrastructure; **Live Tail** watches them arrive. Export to S3 is a batch job, not a stream. The **unified CloudWatch agent** runs on EC2 and on-premises servers and sends **memory, swap, disk space and processes** as metrics (namespace `CWAgent`) and **log files** as logs.',
        says: ['memory utilisation / swap / disk space used', 'on-premises servers in the same dashboards', 'count ERROR lines and alert', 'stream logs in near real time to OpenSearch', 'keep logs for one year, then delete', 'search last week’s logs without servers', 'central logging account for all accounts'],
        switch: [{ to: 'cw', when: 'the number is already an AWS metric (CPU, network, request count)' }, { to: 'apm', when: 'the question is where a request spent its time across services' }, { to: 'ssm', when: 'the agent must be installed and configured on hundreds of servers' }],
        misses: 'Baseline **Q44** (exam, tag F): memory and swap of EC2 instances were needed in CloudWatch. EC2 does not publish **memory, swap or disk space** — the hypervisor cannot see inside the OS. The answer is the **CloudWatch agent**; detailed monitoring only sends the same metrics more often.',
        traps: ['Export to S3 for real-time shipping (up to 12 hours; a subscription filter).', 'A metric filter expected to count lines written before it existed.', 'A Lambda function that deletes old log streams (a retention setting).', 'Metric or subscription filters on an Essentials (Infrequent Access) log group.'],
        update: 'The old **CloudWatch Logs agent** (`awslogs`) is **deprecated**: AWS strongly recommends the **unified CloudWatch agent**. The **Infrequent Access** log class is now called **Essentials** (cheaper ingestion, no metric or subscription filters). A log group can have **up to five** subscription filters, an account one account-level filter per Region, and **log centralization** copies log groups across accounts and Regions.' },
      { id: 'apm', name: 'X-Ray · app monitoring', short: 'X-Ray · apps', cls: 'ink', width: 4, dash: '1 9', alias: ['X-Ray', 'AWS X-Ray', 'trace', 'segment', 'subsegment', 'trace map', 'service map', 'sampling', 'annotation', 'Synthetics', 'canary', 'CloudWatch Synthetics', 'RUM', 'real user monitoring', 'Container Insights', 'Lambda Insights', 'Contributor Insights', 'Application Signals', 'OpenTelemetry', 'ADOT', 'Evidently'],
        verb: 'follows a request through the application',
        from: 'instrumented code (OpenTelemetry or the X-Ray SDK), Lambda active tracing, API Gateway stage → segments and subsegments → trace → trace map · canaries probe from outside · RUM measures real browsers',
        built: 'The **path of a request**. **X-Ray** collects **segments** (one per service that handled the request) and **subsegments** (its calls downstream: DynamoDB, an HTTP API, SQL) under one **trace ID**, and draws a **trace map** of services with their latency and errors — the way to find the **slow hop** across microservices. By default it **samples** the first request each second and 5% of the rest. Turn it on with **Lambda active tracing**, on an **API Gateway REST stage**, or by instrumenting the code. Around it: **Synthetics canaries** (scripts on a schedule that act like a customer — problems found before users report them), **RUM** (real user sessions in browsers and apps), **Container Insights** and **Lambda Insights** (ready-made views), **Contributor Insights** (the top-N talkers in log data).',
        says: ['find which microservice adds the latency', 'trace requests end to end', 'know the site is down before customers report it', 'page load times from real users', 'top IP addresses calling the API', 'performance of ECS tasks or Lambda functions'],
        switch: [{ to: 'cw', when: 'the question is one service’s CPU or request count, not a request’s path' }, { to: 'logs', when: 'the evidence is text the application writes (errors, stack traces)' }],
        traps: ['X-Ray for infrastructure metrics such as CPU or disk (CloudWatch).', 'RUM to detect an outage at 3 a.m. with no users online (a canary).', 'Logs Insights to find the slow service in a chain (no request path; X-Ray).'],
        update: 'The **X-Ray SDKs and daemon** have been in **maintenance mode since 25 February 2026**: AWS recommends **OpenTelemetry** to send traces to X-Ray (the CloudWatch agent can receive them, no separate daemon). **Application Signals** adds service dashboards and SLOs. **CloudWatch Evidently** was discontinued in October 2025 (feature flags → AWS AppConfig). Banks still say “X-Ray SDK + daemon”; X-Ray itself is still the answer for traces.' },
      { id: 'trail', name: 'CloudTrail', short: 'CloudTrail', cls: 'ink', width: 4, dash: '10 6', alias: ['CloudTrail', 'AWS CloudTrail', 'event history', 'trail', 'organization trail', 'multi-Region trail', 'management events', 'data events', 'Insights events', 'log file integrity validation', 'log file validation', 'digest file', 'CloudTrail Lake', 'network activity events'],
        verb: 'records who called which API, when and from where',
        from: 'every API call (console, CLI, SDK, services) → event history (90 days, management events, per Region, free) · trail → S3 (and CloudWatch Logs, EventBridge) → Athena · Logs Insights · integrity validation',
        built: 'The **audit record**. CloudTrail is **on by default**: the **event history** shows the **last 90 days** of **management events** (create, modify, delete) in each Region, at no charge, and nothing else. For anything longer, for every Region in one place, for **data events** (S3 object reads and writes, Lambda invokes — off by default, charged) or for **Insights events** (unusual call or error rates), you create a **trail**: it delivers log files to an **S3 bucket** (about every 5 minutes), optionally to **CloudWatch Logs** and **EventBridge**. An **organization trail** from the management account (or a delegated administrator) covers every account; members see it but cannot change or delete it. **Log file integrity validation** adds hourly signed digest files that prove nothing was altered.',
        says: ['who deleted / terminated / changed', 'which IAM user made the API call', 'audit all API activity for seven years', 'who read this S3 object', 'logs nobody in a member account can disable', 'prove the logs were not modified', 'alert when the root user signs in', 'unusual spike in API calls'],
        switch: [{ to: 'config', when: 'the question is what the resource looked like, or whether it complies' }, { to: 'cw', when: 'the question is performance, not who did what' }],
        traps: ['Event history for something older than 90 days or for S3 object reads.', 'Expecting S3 data events in a default trail (turn them on).', 'GuardDuty, Security Hub or Detective for a plain “who did it” question.', 'CloudTrail Lake in a new design (closed to new customers).'],
        update: '**CloudTrail Lake** is no longer open to new customers from **31 May 2026**; AWS points to CloudWatch for similar capabilities. Query a trail with **Athena** over its S3 logs or with **Logs Insights** on its log group. Trails also log **network activity events** (calls through your VPC endpoints) and can **aggregate** data events now.' },
      { id: 'config', name: 'AWS Config', short: 'Config', cls: 'ink', width: 4, dash: '24 8', alias: ['Config', 'AWS Config', 'Config rule', 'configuration item', 'configuration history', 'configuration timeline', 'conformance pack'],
        verb: 'records what each resource looked like and whether it complies',
        from: 'resources → configuration recorder (configuration items over time) → rules → compliant / noncompliant → SNS, EventBridge, SSM Automation remediation (Session 6, chapter 10)',
        built: 'The **state over time**. Config records a **configuration item** each time a resource changes and keeps a **timeline**: what a security group, a bucket policy or an instance type looked like on any day, and what changed. **Rules** check that state for **compliance**. Config **detects**; it does not prevent and it does not measure performance. Recorder, rules, conformance packs, aggregator and remediation are taught in [[../06-governance/#learn/ch10|Session 6, chapter 10]].',
        says: ['configuration changes', 'what did the resource look like last month', 'track changes to resource configurations and be notified', 'is it compliant', 'configuration history for an audit'],
        switch: [{ to: 'trail', when: 'the question is who made the change (the API call)' }, { to: 'cw', when: 'the question is how the resource performs' }, { to: 'advise', when: 'AWS’s own best-practice checks are enough, not your rules' }],
        misses: 'Baseline **Q49** (exam, tag K): the keyword was “**configuration changes**”. That is AWS Config: the configuration timeline of each resource, with notifications. CloudTrail answers who called the API; CloudWatch answers how it performs.',
        traps: ['CloudTrail event history for a resource’s configuration over months (Config).', 'Config to block a change (an SCP or IAM; Config detects).', 'Trusted Advisor for your own compliance rules (Config rules).'] },
      { id: 'ssm', name: 'Systems Manager', short: 'Systems Manager', cls: 'ink', width: 4, dash: '12 8', alias: ['Systems Manager', 'AWS Systems Manager', 'SSM', 'SSM Agent', 'managed node', 'Run Command', 'Patch Manager', 'patch baseline', 'patch policy', 'State Manager', 'association', 'Automation', 'runbook', 'Maintenance Windows', 'maintenance window', 'Inventory', 'OpsCenter', 'OpsItem', 'Fleet Manager', 'Distributor', 'Session Manager', 'Parameter Store', 'Quick Setup', 'Incident Manager', 'Change Manager', 'Default Host Management Configuration'],
        verb: 'operates the fleet without logging in',
        from: 'SSM Agent + permissions (instance profile or Default Host Management Configuration) → managed node → Run Command · Patch Manager · State Manager · Automation · Inventory · Session Manager · Parameter Store',
        built: 'The **hands**. Every EC2 instance or on-premises server with the **SSM Agent** and permission to reach the service becomes a **managed node** — no SSH, no bastion, no open inbound port. Then: **Run Command** runs a script on many nodes now; **Patch Manager** scans or installs patches against a **patch baseline**, on a schedule (a **maintenance window** or a **patch policy**) with a compliance report; **State Manager** keeps a configuration true over time (an **association**); **Automation** runs **runbooks** across AWS resources (also Config remediation); **Inventory** lists the software on each node; **OpsCenter** collects **OpsItems** from alarms and events; **Session Manager** opens a shell; **Parameter Store** holds configuration.',
        says: ['patch 400 instances on a schedule with a compliance report', 'run a script on every instance with tag X, no SSH', 'keep the agent installed and configured on every server', 'restart a service across the fleet', 'which instances have this software version', 'remediate automatically with a runbook'],
        switch: [{ to: 'logs', when: 'the job is collecting memory metrics or log files (the agent; Systems Manager only installs it)' }, { to: 'config', when: 'the job is recording and judging configuration, not changing it' }],
        traps: ['Session Manager to run a script on 400 nodes (one interactive session at a time; Run Command).', 'Inspector to patch, or Patch Manager to find CVEs in container images.', 'Run Command for a setting that must stay enforced (State Manager).', 'A cron job on each instance where a maintenance window fits.'],
        update: '**Incident Manager** and **Change Manager** are closed to new customers from **7 November 2025**. **Default Host Management Configuration** makes every EC2 instance in an account and Region a managed node without an instance profile. **Patch policies** in Quick Setup patch a whole organization from one configuration.' },
      { id: 'advise', name: 'Trusted Advisor · Health · quotas', short: 'Advice · health', cls: 'ink', width: 4, dash: '16 5 3 5', alias: ['Trusted Advisor', 'AWS Trusted Advisor', 'AWS Health', 'AWS Health Dashboard', 'Personal Health Dashboard', 'Service Health Dashboard', 'Service Quotas', 'service limits', 'quota increase', 'Compute Optimizer'],
        verb: 'tells you what AWS thinks of your account',
        from: 'Trusted Advisor checks (cost, performance, security, fault tolerance, service limits, operational excellence) · AWS Health events (public and your account, scheduled changes) · Service Quotas (usage, increases, alarms)',
        built: 'The **advice**. **Trusted Advisor** runs AWS’s best-practice checks in six categories — cost optimization, performance, security, fault tolerance, **service limits**, operational excellence — and flags what to fix. Every account sees the service-limit checks and a few security and fault-tolerance checks; the full set comes with the higher Support plans. The **AWS Health Dashboard** shows AWS’s events: public service issues, and the events that affect **your** resources, including **scheduled changes** such as maintenance. **Service Quotas** shows each quota, requests increases, and can alarm in CloudWatch when usage gets close.',
        says: ['AWS best-practice recommendations', 'which service limits are close to being reached', 'idle or underused resources to save money', 'be told about scheduled maintenance on our instances', 'is the AWS service having an issue in this Region', 'request a quota increase'],
        switch: [{ to: 'config', when: 'the checks are the company’s own rules' }, { to: 'cw', when: 'a threshold on a metric must page someone' }],
        traps: ['Trusted Advisor for custom compliance rules (Config).', 'Trusted Advisor to record configuration history (Config).', 'The public service health page for events about your own instances (your account’s Health Dashboard).'],
        update: 'Trusted Advisor’s full checks now come with **Business Support+, Enterprise Support or Unified Operations**; **Developer, Business and Enterprise On-Ramp Support are discontinued on 1 January 2027**. Basic Support keeps all Service Limits checks and selected Security and Fault tolerance checks. Banks say “Business or Enterprise Support for all checks”.' }
    ],
    topics: { choose: 'Which tool answers this', svc: 'Service-specific monitoring' },

    map: {
      title: 'The monitoring map', lead: 'Four sources at the top. Below them each family collects its signal, helps you understand it, and acts on it; the advice line runs along the bottom. Tap a line or a station.',
      viewBox: '0 0 1000 880', defaultLine: 'cw',
      caption: 'Session 11 adds no colour: every family is an ink line told apart by dash and station shape — CloudWatch metrics and alarms solid with circles, Logs and the agent short dashes with squares, X-Ray dots with triangles, CloudTrail dashes with diamonds, Config long dashes with rings (as in Session 6), Systems Manager dashes with hexagons, Trusted Advisor, Health and quotas dash-dot with pentagons. Every line is labelled; colour is never the only cue.',
      items: [
        { el: 'rect', a: { x: 0, y: 0, width: 1000, height: 96 }, style: 'fill:var(--muted-fill)' },
        { el: 'rect', a: { x: 0, y: 104, width: 1000, height: 776 }, style: 'fill:var(--zone-aws)' },
        zoneLabel(18, 26, 'SOURCES'),
        zoneLabel(18, 124, 'AWS'),
        ...box(20, 140, 950, 165, 'COLLECT'),
        ...box(20, 320, 950, 150, 'UNDERSTAND'),
        ...box(20, 485, 950, 205, 'ACT'),
        ...box(20, 705, 950, 160, 'ADVISE'),

        /* ---- lines ---- */
        { el: 'line', line: 'ssm', paths: ['M66 72 V640 H520'], labels: [{ x: 78, y: 612, t: 'SYSTEMS MANAGER', size: 10.5 }] },
        { el: 'line', line: 'logs', paths: ['M140 72 V520 H395', 'M140 150 H395'], labels: [{ x: 152, y: 132, t: 'LOGS · AGENT', size: 10.5 }] },
        { el: 'line', line: 'cw', paths: ['M395 72 V575'], labels: [{ x: 407, y: 132, t: 'METRICS · ALARMS', size: 10.5 }] },
        { el: 'line', line: 'apm', paths: ['M625 72 V430'], labels: [{ x: 637, y: 132, t: 'X-RAY', size: 10.5 }] },
        { el: 'line', line: 'config', paths: ['M745 72 V395'], labels: [{ x: 757, y: 132, t: 'CONFIG', size: 10.5 }] },
        { el: 'line', line: 'trail', paths: ['M900 72 V600'], labels: [{ x: 912, y: 132, t: 'CLOUDTRAIL', size: 10.5 }] },
        { el: 'line', line: 'advise', paths: ['M80 785 H920'], labels: [{ x: 92, y: 770, t: 'ADVICE · HEALTH · QUOTAS', size: 10.5 }] },

        /* ---- sources ---- */
        ...pill(20, 240, 'EC2 · on-premises servers', ['logs', 'ssm']),
        ...pill(270, 250, 'AWS services', ['cw']),
        ...pill(530, 190, 'your application code', ['apm']),
        ...pill(730, 250, 'people and roles calling APIs', ['trail', 'config']),

        /* ---- collect ---- */
        square(140, 185, ['logs']), T(156, 189, 'CloudWatch agent', ['logs']), sub(156, 205, 'inside the OS · CWAgent', ['logs']),
        square(140, 258, ['logs']), T(156, 262, 'Log groups', ['logs']), sub(156, 278, 'retention · subscriptions', ['logs']),
        circle(395, 205, ['cw', 'logs']), T(411, 209, 'Metrics', ['cw']), sub(411, 225, 'namespace · period · statistic', ['cw']),
        triangle(625, 250, ['apm']), T(609, 254, 'X-Ray traces', ['apm'], 'end'), sub(609, 270, 'segments · sampling', ['apm'], 'end'),
        ...ring(745, 255, ['config']), T(761, 259, 'Config items', ['config']), sub(761, 275, 'what it looked like', ['config']),
        diamond(900, 190, ['trail']), T(884, 194, 'API events', ['trail'], 'end'), sub(884, 210, 'who · what · when', ['trail'], 'end'),
        /* ---- understand ---- */
        circle(395, 370, ['cw']), T(411, 374, 'Dashboard', ['cw']), sub(411, 390, 'graphs · cross-account', ['cw']),
        square(140, 420, ['logs']), T(156, 424, 'Logs Insights', ['logs']), sub(156, 440, 'queries · Live Tail', ['logs']),
        triangle(625, 430, ['apm']), T(609, 434, 'Trace map', ['apm'], 'end'), sub(609, 450, 'the slow hop', ['apm'], 'end'),
        ...ring(745, 395, ['config']), T(761, 399, 'Timeline · rules', ['config']), sub(761, 415, '→ Session 6', ['config']),
        diamond(900, 350, ['trail']), T(884, 354, 'Event history', ['trail'], 'end'), sub(884, 370, '90 days · management', ['trail'], 'end'),
        diamond(900, 440, ['trail']), T(884, 444, 'Trail → S3', ['trail'], 'end'), sub(884, 460, 'Athena · Logs Insights', ['trail'], 'end'),
        /* ---- act ---- */
        square(140, 520, ['logs', 'cw']), T(140, 548, 'Metric filter', ['logs'], 'middle'), sub(140, 564, 'log lines → metric', ['logs'], 'middle'),
        circle(395, 575, ['cw', 'logs']), T(411, 579, 'Alarm', ['cw']), sub(411, 595, '→ SNS · Lambda · Auto Scaling', ['cw']), sub(411, 611, '→ EC2 stop · reboot · recover', ['cw']),
        diamond(900, 600, ['trail', 'config']), T(884, 604, 'EventBridge rule', ['trail'], 'end'), sub(884, 620, '→ SNS · Lambda · Automation', ['trail'], 'end'),
        hexa(150, 640, ['ssm']), T(150, 668, 'Run Command', ['ssm'], 'middle'), sub(150, 684, 'a script, now', ['ssm'], 'middle'),
        hexa(265, 640, ['ssm']), T(265, 668, 'State Manager', ['ssm'], 'middle'), sub(265, 684, 'keep it true', ['ssm'], 'middle'),
        hexa(380, 640, ['ssm']), T(380, 668, 'Patch Manager', ['ssm'], 'middle'), sub(380, 684, 'baseline · window', ['ssm'], 'middle'),
        hexa(495, 640, ['ssm']), T(495, 668, 'Automation', ['ssm'], 'middle'), sub(495, 684, 'runbooks', ['ssm'], 'middle'),
        /* ---- advise ---- */
        penta(220, 785, ['advise']), T(220, 815, 'Trusted Advisor', ['advise'], 'middle'), sub(220, 831, 'six check categories', ['advise'], 'middle'),
        penta(500, 785, ['advise']), T(500, 815, 'Health Dashboard', ['advise'], 'middle'), sub(500, 831, 'events · scheduled changes', ['advise'], 'middle'),
        penta(780, 785, ['advise']), T(780, 815, 'Service Quotas', ['advise'], 'middle'), sub(780, 831, 'usage · increases · alarms', ['advise'], 'middle'),
        ...LABELS
      ]
    },

    stub: [
      { id: 'sig', label: 'SIGNAL', short: 'SIG', values: ['metric', 'log', 'trace', 'API call', 'configuration', 'advice', 'none stated'] },
      { id: 'src', label: 'SOURCE', short: 'SRC', values: ['AWS service', 'inside the OS', 'application code', 'on-premises', 'many accounts', 'none stated'] },
      { id: 'act', label: 'RESPONSE', short: 'ACT', values: ['see it', 'alert', 'act automatically', 'keep for audit', 'none stated'] },
      { id: 'sup', label: 'SUPERLATIVE', short: 'SUP', values: ['cheapest', 'least ops', 'fastest', 'most secure', 'none stated'] }
    ],

    method:
`1. Strip the story. Keep WHAT MUST BE KNOWN (a number, a line of text,
   a request's path, an API call, a resource's past state, AWS's advice)
   and WHAT HAPPENS NEXT (look at it, page someone, fix it, keep it).
2. Fill the stub, the same 4 slots for this session:
   SIGNAL (metric / log / trace / API call / configuration / advice) ____
   SOURCE (AWS service / inside the OS / app code / on-premises / many accounts) ____
   RESPONSE (see it / alert / act automatically / keep for audit) ____
   SUPERLATIVE (cheapest / least ops / fastest / most secure / none) ____
3. For EACH option ask: "what problem was this service BUILT for?"
   No match with the stub -> cross it out, however impressive it sounds
   (GuardDuty for "who deleted it", detailed monitoring for memory,
   CloudTrail for CPU, Trusted Advisor for your own rules).
4. Among the survivors, the one that satisfies the SUPERLATIVE wins
   (least ops: a built-in setting or managed feature over a Lambda you
   write; most secure: an organization trail with integrity validation).`,

    cheat:
`MONITOR   = SIGNAL + SOURCE + RESPONSE + SUP
SIX TOOLS how it performs -> CloudWatch metrics · what it wrote -> Logs
          where a request is slow -> X-Ray · who called the API -> CloudTrail
          what it looked like / complies -> Config · AWS's advice -> Trusted Advisor
METRICS   EC2 basic 5 min (free) · detailed 1 min (charged) · custom: PutMetricData,
          high resolution 1 s · kept: < 60 s 3 h · 1 min 15 d · 5 min 63 d · 1 h 455 d
AGENT     memory, swap, disk space, processes = INSIDE the OS -> CloudWatch agent
          (namespace CWAgent, role CloudWatchAgentServerPolicy, config in Parameter Store)
ALARM     OK / ALARM / INSUFFICIENT_DATA · M of N datapoints · missing = default
          -> SNS · Lambda · Auto Scaling · EC2 stop/terminate/reboot/recover · OpsItem
          composite = alarm of alarms · anomaly detection = band · billing = us-east-1
EVENT     "when X happens" -> EventBridge rule, not an alarm
LOGS      retention 1 day - 10 years (default never) · metric filter -> alarm (not retro)
          subscription -> Lambda / Kinesis / Firehose (near real time) · export to S3: batch
          Logs Insights = query · Live Tail = watch · Essentials class: no filters
X-RAY     trace -> segments -> subsegments -> trace map · sampling 1/s + 5%
          canary = synthetic, before users · RUM = real users · Contributor = top-N
TRAIL     event history: 90 days, management, per Region, free · trail -> S3 (+ CW Logs,
          EventBridge) · data events off by default · organization trail · digest hourly
CONFIG    configuration timeline + compliance (Session 6 ch10) · detects, never blocks
SSM       Run Command (now) · State Manager (keep true) · Patch Manager (baseline,
          maintenance window) · Automation (runbooks) · Inventory · Session Manager (shell)
ADVICE    Trusted Advisor 6 categories · Health = AWS events on your resources
          Service Quotas = limits, increases, alarms · Compute Optimizer -> Session 12
RDS       CloudWatch (hypervisor) · Enhanced Monitoring (OS, processes) · Database
          Insights (load by SQL and waits; was Performance Insights)
NEVER: detailed monitoring for memory · event history > 90 days · export for real time ·
       GuardDuty for "who did it" · Session Manager for 400 nodes · CloudTrail Lake (new)`,

    compare: [
      { id: 'cw-trail-config', short: 'CW · Trail · Config', title: 'CloudWatch vs CloudTrail vs AWS Config',
        sides: [{ name: 'CloudWatch', line: 'cw', fig: { dir: 'one', left: 'METRIC', right: 'ALARM', keep: true }, gist: '**How is it performing?** Metrics, logs, alarms, dashboards.' }, { name: 'CloudTrail', line: 'trail', fig: { dir: 'one', left: 'API', right: 'S3' }, gist: '**Who did what, when?** Every API call, with the caller and the time.' }, { name: 'AWS Config', line: 'config', fig: { dir: 'one', left: 'RES', right: 'HISTORY' }, gist: '**What did it look like, and is it allowed?** Configuration timeline and rules.' }],
        rows: [['Unit', 'a datapoint or log event', 'an API call event', 'a configuration item'], ['Answers', 'speed, health, errors', 'who, what, when, from where', 'state before and after, compliance'], ['Reacts with', 'alarms (SNS, Lambda, Auto Scaling, EC2 actions)', 'EventBridge rules on API calls', 'rules, SNS notifications, Automation remediation'], ['Deciding words', 'utilisation, latency, threshold', 'who, which user, API call, audit', 'configuration changes, compliant'], ['Tempting wrong', 'for “who changed it”', 'for CPU or memory', 'for performance or for blocking a change']],
        check: { q: '“The security team must know which IAM user turned off Block Public Access on a bucket yesterday.” Which service answers it?', opts: ['CloudWatch', 'CloudTrail', 'AWS Config'], a: 1, why: 'Who made the API call is CloudTrail. Config would show the setting changed; CloudWatch shows neither.' } },
      { id: 'basic-agent', short: 'Default · agent', title: 'Default EC2 metrics vs the CloudWatch agent',
        sides: [{ name: 'Default EC2 metrics', line: 'cw', fig: { dir: 'one', left: 'HYPERV', right: 'AWS/EC2', keep: true }, gist: 'What the **hypervisor** sees: CPU, network, instance-store disk I/O, status checks, CPU credits. Every **5 minutes** free, every **minute** with detailed monitoring.' }, { name: 'CloudWatch agent', line: 'logs', fig: { dir: 'one', left: 'OS', right: 'CWAgent' }, gist: 'Software **inside the OS**: memory, swap, disk space, processes, plus log files. EC2 and on-premises servers.' }],
        rows: [['Where it measures', 'outside the guest, from the host', 'inside the guest OS'], ['Memory, swap, disk space', 'no', 'yes'], ['Log files', 'no', 'yes (to CloudWatch Logs)'], ['Setup', 'none (detailed monitoring: one setting)', 'install, IAM role, configuration (Systems Manager helps)'], ['Deciding words', 'CPU, network, 1-minute metrics', 'memory, swap, disk space used, on-premises'], ['Tempting wrong', 'detailed monitoring “for memory”', 'for CPU that EC2 already sends']],
        check: { q: '“Alarm when free disk space on the root volume of 60 Linux instances falls below 10%.” Which source provides the metric?', opts: ['Detailed monitoring', 'CloudWatch agent'], a: 1, why: 'Disk space used is inside the file system; only the agent reports it. Detailed monitoring sends hypervisor metrics more often.' } },
      { id: 'alarm-eb', short: 'Alarm · rule', title: 'CloudWatch alarm vs EventBridge rule',
        sides: [{ name: 'CloudWatch alarm', line: 'cw', fig: { dir: 'one', left: 'NUMBER', right: 'ACTION', keep: true }, gist: 'A **number crosses a threshold** for M of N periods. States OK, ALARM, INSUFFICIENT_DATA; acts on a state change.' }, { name: 'EventBridge rule', fig: { dir: 'one', left: 'EVENT', right: 'TARGET' }, gist: 'An **event matches a pattern**: an instance changed state, an API call happened, a Health event arrived. Sends it to targets (Session 9).' }],
        rows: [['Input', 'a metric or metric math expression over time', 'one event at a time'], ['Fires when', 'M of the last N datapoints breach', 'the event pattern matches'], ['Typical targets', 'SNS, Lambda, Auto Scaling, EC2 actions, OpsItem', 'Lambda, SNS, SQS, Step Functions, Automation'], ['Deciding words', 'above 80% for 10 minutes, threshold, utilisation', 'when an instance is terminated, when someone calls, when it changes'], ['Tempting wrong', 'for “when someone calls DeleteBucket”', 'for “CPU above 80%”']],
        check: { q: '“Notify the team whenever any EC2 instance enters the stopped state.” What fires the notification?', opts: ['CloudWatch alarm', 'EventBridge rule'], a: 1, why: 'A state change is an event, not a number over time: an EventBridge rule with an SNS target.' } },
      { id: 'mfilter-sub', short: 'Filter · subscription', title: 'Metric filter vs subscription filter (and export to S3)',
        sides: [{ name: 'Metric filter', line: 'logs', fig: { dir: 'one', left: 'LINES', right: 'METRIC', keep: true }, gist: 'Counts or extracts values from matching log events into a **CloudWatch metric** — then alarm on it. Only events after it was created.' }, { name: 'Subscription filter', line: 'logs', fig: { dir: 'one', left: 'LINES', right: 'STREAM' }, gist: 'Sends matching events in **near real time** to **Lambda, Kinesis Data Streams or Firehose** (and on to OpenSearch or S3). Up to five per log group.' }],
        rows: [['Output', 'a number', 'the log events themselves'], ['Speed', 'as events arrive', 'usually under three minutes'], ['Export to S3 instead', 'A batch export task: data can take up to 12 hours to become available; AWS recommends subscriptions for continuous archiving.'], ['Log class', 'Standard only', 'Standard only'], ['Deciding words', 'count errors, alarm on a pattern', 'stream, near real time, another service, central account'], ['Tempting wrong', 'to ship logs elsewhere', 'to page someone on a count']],
        check: { q: '“Every log event must reach an OpenSearch cluster within minutes for search.” Which do you configure?', opts: ['Metric filter', 'Subscription filter'], a: 1, why: 'A subscription filter streams the events (through Firehose or Lambda); a metric filter only produces a number.' } },
      { id: 'logs-xray', short: 'Logs · X-Ray', title: 'CloudWatch Logs vs X-Ray',
        sides: [{ name: 'CloudWatch Logs', line: 'logs', fig: { dir: 'one', left: 'TEXT', right: 'GROUP', keep: true }, gist: 'What each component **wrote**: errors, stack traces, request lines. Search with Logs Insights, count with metric filters.' }, { name: 'AWS X-Ray', line: 'apm', fig: { dir: 'one', left: 'REQ', right: 'MAP' }, gist: 'The **path of one request** through every service, with the time spent in each hop, on a trace map.' }],
        rows: [['Unit', 'a log event', 'a trace of segments and subsegments'], ['Shows', 'what happened inside one component', 'where the time went across components'], ['Turned on by', 'the service, the agent or your code writing logs', 'Lambda active tracing, an API Gateway stage, instrumented code'], ['Deciding words', 'error message, search the logs, retention', 'latency across microservices, bottleneck, trace map'], ['Tempting wrong', 'to find the slow service in a chain', 'to keep logs for an audit']],
        check: { q: '“A checkout call passes through five microservices and sometimes takes 4 seconds; nobody knows which hop is slow.” Which service shows it?', opts: ['CloudWatch Logs', 'AWS X-Ray'], a: 1, why: 'Time per hop across services is a trace. Logs show each component in isolation.' } },
      { id: 'history-trail', short: 'History · trail', title: 'CloudTrail event history vs a trail',
        sides: [{ name: 'Event history', line: 'trail', fig: { dir: 'one', left: 'API', right: '90 DAYS', keep: true }, gist: 'On by default, free: the **last 90 days** of **management events** in **one Region**, searchable by one attribute.' }, { name: 'A trail', line: 'trail', fig: { dir: 'one', left: 'API', right: 'S3' }, gist: 'Log files in **your S3 bucket** for as long as you keep them; all Regions; optional **data events**, **Insights events**, CloudWatch Logs, EventBridge, integrity validation.' }],
        rows: [['Retention', '90 days', 'as long as the bucket keeps the files'], ['Events', 'management only', 'management, data, Insights, network activity'], ['Scope', 'one account, one Region', 'all Regions; an organization trail covers all accounts'], ['Cost', 'no CloudTrail charge', 'first copy of management events free; S3, data and Insights events charged'], ['Deciding words', 'recently, last week, who deleted', 'retain for years, all accounts, object-level, tamper-proof'], ['Tempting wrong', 'for an event 6 months ago', 'when nothing was set up beforehand']],
        check: { q: '“An auditor asks who changed a security group 30 days ago; no trail was ever created.” Where is the answer?', opts: ['Event history', 'A trail'], a: 0, why: 'Management events of the last 90 days are in event history even with no trail. A trail records only from the moment it exists.' } },
      { id: 'patch-inspector', short: 'Patch · Inspector', title: 'Patch Manager vs Amazon Inspector',
        sides: [{ name: 'Patch Manager', line: 'ssm', fig: { dir: 'one', left: 'BASE', right: 'FLEET', keep: true }, gist: '**Fixes**: scans managed nodes against a patch baseline and **installs** what is missing, on a schedule, with a compliance report.' }, { name: 'Amazon Inspector', fig: { dir: 'one', left: 'SCAN', right: 'CVE' }, gist: '**Finds**: scans EC2, container images and Lambda for known vulnerabilities and network exposure, and scores them (Session 5).' }],
        rows: [['Job', 'apply OS patches', 'report vulnerabilities'], ['Acts on', 'managed nodes (EC2, on-premises)', 'EC2, ECR images, Lambda functions'], ['Output', 'patched nodes and patch compliance', 'findings with severity'], ['Deciding words', 'patch, install updates, maintenance window, baseline', 'CVE, vulnerability, exposure, assess'], ['Tempting wrong', 'to find vulnerabilities in container images', 'to install the patches']],
        check: { q: '“Install approved security updates on 300 Windows servers every second Sunday and report compliance.” Which service does it?', opts: ['Patch Manager', 'Amazon Inspector'], a: 0, why: 'Installing patches on a schedule with compliance is Patch Manager; Inspector finds vulnerabilities but installs nothing.' } },
      { id: 'ta-config', short: 'Advisor · Config', title: 'Trusted Advisor vs AWS Config rules',
        sides: [{ name: 'Trusted Advisor', line: 'advise', fig: { dir: 'one', left: 'AWS', right: 'CHECKS', keep: true }, gist: '**AWS’s own best-practice checks**: cost, performance, security, fault tolerance, service limits, operational excellence. Nothing to write.' }, { name: 'AWS Config rules', line: 'config', fig: { dir: 'one', left: 'YOURS', right: 'RULES' }, gist: '**Your rules** (managed or custom) evaluated against every recorded resource, with history and remediation.' }],
        rows: [['Whose rules', 'AWS’s, fixed', 'yours: managed rules, custom rules, conformance packs'], ['History', 'current results', 'configuration timeline and compliance over time'], ['Plan needed', 'full checks: Business Support+, Enterprise or Unified Operations', 'none (Config is charged per item and evaluation)'], ['Deciding words', 'best practices, service limits, idle resources', 'company policy, must be tagged, compliant over time'], ['Tempting wrong', 'for “every bucket must carry a cost-centre tag”', 'for “which quotas are close to the limit”']],
        check: { q: '“Every EBS volume must be encrypted and every bucket must carry a cost-centre tag; report violations continuously.” Which fits?', opts: ['Trusted Advisor', 'AWS Config rules'], a: 1, why: 'Company rules evaluated continuously are Config rules. Trusted Advisor runs AWS’s fixed checks.' } }
    ],

    traps: [
      { title: 'Detailed monitoring “to see memory”', x: 'Your baseline Q44. Detailed monitoring makes the same hypervisor metrics arrive every minute instead of every five. Memory, swap and disk space live inside the OS: only the CloudWatch agent reports them.', drills: ['W1', 'W7'] },
      { title: 'A metric the hypervisor cannot see, expected without the agent', x: 'An alarm on memory or disk space that sits in INSUFFICIENT_DATA usually means no agent is publishing the metric. Install the agent (Systems Manager can do it fleet-wide).', drills: ['W1', 'W7'] },
      { title: 'CloudTrail for performance, CloudWatch for “who”', x: 'CloudTrail records API calls, not CPU. CloudWatch measures, it does not name the caller. Read the signal first.', drills: ['W19', 'W25'] },
      { title: 'Config to prevent a change', x: 'Config records and judges configuration; it does not block an API call. Prevention is an SCP or IAM ([[../06-governance/#learn/ch10|Session 6, chapter 10]]).', drills: [] },
      { title: 'Event history for something older than 90 days, or for object reads', x: 'Event history keeps 90 days of management events per Region. Older events, S3 object reads and other data events exist only in a trail that was set up before they happened.', drills: ['W20', 'W21'] },
      { title: 'Expecting S3 data events in a default trail', x: 'Data events are off by default and charged. A trail records object-level reads and writes only when they are turned on for the bucket.', drills: ['W21'] },
      { title: 'Export to S3 for real-time shipping', x: 'An export task is a batch job: data can take up to 12 hours to become available. Near real time is a subscription filter (to Firehose, Kinesis or Lambda).', drills: ['W13'] },
      { title: 'A metric filter expected to count old log lines', x: 'Metric filters do not filter retroactively: they count events written after they exist. Use Logs Insights for the past.', drills: ['W15'] },
      { title: 'An alarm for an event', x: 'Alarms watch numbers over time. “When an instance is terminated”, “when someone calls DeleteBucket”, “when a Health event arrives” are events: EventBridge rules.', drills: ['W11'] },
      { title: 'Session Manager to run a script on 400 nodes', x: 'Session Manager opens one interactive shell. The same command on a tagged fleet is Run Command; a state kept true over time is State Manager.', drills: ['W26', 'W27'] },
      { title: 'Inspector to patch, Patch Manager to find CVEs', x: 'Inspector finds vulnerabilities and installs nothing. Patch Manager installs patches against a baseline and reports compliance.', drills: ['W26'] },
      { title: 'Trusted Advisor for your own compliance rules', x: 'Trusted Advisor runs AWS’s fixed checks. “Every bucket must be tagged”, “every volume encrypted” are your rules: AWS Config.', drills: ['W2', 'W29'] },
      { title: 'X-Ray where a metric is needed', x: 'X-Ray traces a sample of requests through code; it is not a counter. CPU, disk and network of the hosts, and counts such as orders per minute, are CloudWatch metrics.', drills: ['W6'] },
      { title: 'GuardDuty or Security Hub for a plain audit question', x: 'Your prestige pattern. “Who deleted the table” needs CloudTrail. GuardDuty detects threats, Security Hub aggregates findings, Detective investigates them — none is the record of who called an API.', drills: ['W3'] },
      { title: 'Enhanced Monitoring and Database Insights swapped', x: 'Enhanced Monitoring = the OS of the DB instance (processes, memory, from an agent). Database Insights (formerly Performance Insights) = database load by SQL, waits, hosts and users.', drills: ['W30'] },
      { title: 'CloudTrail Lake in a new design', x: 'CloudTrail Lake takes no new customers from 31 May 2026. Query a trail with Athena over its S3 logs or with Logs Insights on its log group.', drills: [] }
    ],

    log: [
      { when: '2 Sept 2026', what: 'Baseline practice exam, monitoring items', result: 'Q44 CloudWatch agent for swap/memory missed (F); Q49 “config changes” → Config missed (K); prestige distractors across the exam', lesson: 'Q44: memory, swap and disk space are inside the OS — the CloudWatch agent. Q49: “configuration changes” is AWS Config’s signal word. Prestige: GuardDuty, Security Hub and Detective are not the audit record. Trained in drills W1–W3.' },
      { when: '—', what: 'Session 11 quiz', result: 'not taken yet', lesson: 'Run all 30 scenarios once. Misses are tagged in “Where it broke” and show up in Progress.' }
    ]
  });
})();
