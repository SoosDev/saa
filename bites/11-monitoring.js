/* Feed bites — Session 11, monitoring & operations. Facts: sessions/11-monitoring/learn.js chapters in src,
   docs/session-11-monitoring.md (verified 2026-11-11). Ledger: docs/feed-bites.md. */
window.SAA_BITES = (window.SAA_BITES || []).concat([
  {
    id: 'mon-agent-metrics', sid: '11-monitoring', title: 'What EC2 reports by itself, and what needs the agent', domains: ['D3'], src: ['ch3', 'ch4'],
    text: 'Picture a doctor who can only stand outside the room. She sees **how hard the patient breathes** and **who comes and goes**, but not what is in his pockets. EC2’s own metrics are that view from the hypervisor: **CPU, network, instance-store disk I/O, status checks**. **Memory, swap and free disk space** are inside the operating system, so only the **CloudWatch agent**, installed in the OS, can report them. Detailed monitoring changes how often, never what.',
    qs: [
      { id: 'q1', q: 'A Java application on 30 EC2 instances crashes when its heap fills the RAM. The team wants an alarm before memory runs out. Which data source must the alarm use?', words: ['before memory runs out'],
        expl: 'Memory use lives inside the guest OS, where the hypervisor cannot look. The CloudWatch agent publishes it to the CWAgent namespace; an alarm can then watch it.',
        opts: [
          { t: 'A memory metric that the CloudWatch agent publishes from inside each instance', ok: true, why: 'The agent reads memory from inside the OS and sends it to CloudWatch.' },
          { t: 'The CPUUtilization metric that EC2 sends, which rises as the heap fills up', why: 'CPU can stay low while memory fills; it is the wrong signal.' },
          { t: 'A memory metric that EC2 sends once detailed monitoring is turned on', why: 'Detailed monitoring sends the same EC2 metrics more often; none is memory.' },
          { t: 'The status check metric, which fails as soon as the instance runs low on RAM', why: 'Status checks report impaired instances, not how full the memory is.' }] },
      { id: 'q2', q: 'An auto scaling policy must react to a CPU surge within about a minute, but the EC2 metric it watches only gets a new value every few minutes. What should change?', words: ['within about a minute', 'every few minutes'],
        expl: 'Basic monitoring sends EC2 metrics every 5 minutes; detailed monitoring sends them every minute. CPU is already a hypervisor metric, so no agent is needed.',
        opts: [
          { t: 'Turn on detailed monitoring so that EC2 sends its metrics every minute', ok: true, why: 'One-minute EC2 metrics let the policy react within a minute.' },
          { t: 'Install the CloudWatch agent so that it publishes CPU from inside the OS', why: 'CPU is already published by EC2; the issue is how often, not who.' },
          { t: 'Lower the alarm threshold so that the policy starts at a smaller surge', why: 'A new value still arrives only every 5 minutes, whatever the threshold.' },
          { t: 'Switch the alarm to treat missing data points as breaching all the time', why: 'Missing-data treatment does not make datapoints arrive more often.' }] },
      { id: 'q3', q: 'Servers in a company’s own data center must appear beside its EC2 instances on CloudWatch dashboards, showing how full each volume is. What has to run on those servers?', words: ['own data center', 'how full each volume is'],
        expl: 'The CloudWatch agent runs on on-premises servers as well as on EC2, with IAM credentials, and reports disk space from inside the OS.',
        opts: [
          { t: 'The CloudWatch agent, with IAM credentials to publish to CloudWatch', ok: true, why: 'The same agent works on-premises and reports disk space from inside the OS.' },
          { t: 'Nothing, because CloudWatch reads volume usage from any server it reaches', why: 'CloudWatch pulls nothing; something on the server must publish.' },
          { t: 'Detailed monitoring, turned on for each server in the EC2 console', why: 'Detailed monitoring is an EC2 setting and never reports disk space.' },
          { t: 'Systems Manager Inventory, which reports how full each volume is', why: 'Inventory collects software and configuration metadata, not utilization.' }] },
      { id: 'q4', q: 'A dashboard needs CPU history of an instance from 40 days ago at the finest detail CloudWatch still has. What will it get?', words: ['40 days ago', 'finest detail'],
        expl: 'One-minute data is kept for 15 days, then only as 5-minute points until 63 days, then as 1-hour points until 455 days.',
        opts: [
          { t: 'Five-minute points, because finer data was rolled up after 15 days', ok: true, why: 'Between 15 and 63 days only the 5-minute aggregates remain.' },
          { t: 'One-minute points, because detailed monitoring keeps them for 63 days', why: 'One-minute resolution lasts 15 days, whatever the monitoring setting.' },
          { t: 'One-second points, because CloudWatch stores every metric at 1 second', why: 'Only high-resolution custom metrics have 1-second data, kept 3 hours.' },
          { t: 'Nothing at all, because CloudWatch deletes EC2 metrics after 15 days', why: 'Aggregated data stays retrievable for up to 455 days.' }] }
    ]
  },
  {
    id: 'mon-alarm-or-event', sid: '11-monitoring', title: 'Alarm or EventBridge rule', domains: ['D2'], src: ['ch5', 'ch11'],
    text: 'A **CloudWatch alarm** is a smoke detector: it watches a **number over time** and goes off when it stays past a line, for example when **M of the last N** readings breach. An **EventBridge rule** is a doorbell: it reacts to **one thing that happened**, such as an instance changing state or an API call. Alarms act on a state change (SNS, Lambda, Auto Scaling, an EC2 stop or recover); rules send the event to a target.',
    qs: [
      { id: 'q1', q: 'A team wants a message every time an Auto Scaling group launches or terminates an instance, as it happens. What should fire the message?', words: ['every time', 'as it happens'],
        expl: 'A launch or a termination is an event, not a number crossing a line over time. An EventBridge rule matches it and sends it to an SNS topic.',
        opts: [
          { t: 'An EventBridge rule matching the launch and terminate events, to SNS', ok: true, why: 'Each event matches the rule as it happens and reaches the target.' },
          { t: 'A CloudWatch alarm on the group’s instance count metric, to SNS', why: 'The alarm fires on a threshold, not on each launch or termination.' },
          { t: 'A CloudWatch alarm on CPUUtilization of the group, set to 1 of 1', why: 'CPU says nothing about launches; it is the wrong signal.' },
          { t: 'A Trusted Advisor check that reports each instance the group launches', why: 'Trusted Advisor runs AWS’s best-practice checks, not a feed of launches.' }] },
      { id: 'q2', q: 'An alarm on an SQS queue’s backlog uses 3 out of 3 one-minute datapoints. In long surges the backlog dips below the line for one minute, the alarm returns to OK, and it pages again soon after. Which change stops the repeat pages without paging for smaller, normal backlogs?', words: ['dips below the line for one minute', 'pages again', 'without paging for smaller, normal backlogs'],
        expl: 'M out of N: with 3 of 5 the alarm stays in ALARM while three of the last five minutes breach, so one clear minute in a surge changes nothing. Actions run when the state changes, so fewer flips mean fewer pages.',
        opts: [
          { t: 'Use 3 out of 5 datapoints, so one clear minute no longer ends the ALARM', ok: true, why: 'The breaching points need not be consecutive; one dip leaves enough of them.' },
          { t: 'Use 1 out of 1 datapoints, so that every breaching minute fires the alarm', why: 'One clear minute still ends the ALARM, and each new breach pages again.' },
          { t: 'Treat missing data as breaching, so that the clear minute counts as a breach', why: 'The clear minute is a real datapoint below the line; nothing is missing to fill in.' },
          { t: 'Lower the threshold until the clear minute of a surge counts as breaching', why: 'A lower line also pages for smaller, normal backlogs.' }] },
      { id: 'q3', q: 'When the AWS host under an EC2 instance fails, the instance should come back on healthy hardware by itself, with no code for the team to run. What does that?', words: ['AWS host under an EC2 instance fails', 'no code for the team to run'],
        expl: 'A failed system status check means a problem with the AWS host under the instance. An alarm on that check with the EC2 recover action brings the instance back with no code; the instance status check watches your own OS.',
        opts: [
          { t: 'A CloudWatch alarm on the system status check with the EC2 recover action', ok: true, why: 'The system check watches the AWS host; the alarm’s recover action fixes it.' },
          { t: 'A CloudWatch alarm on the instance status check with the EC2 recover action', why: 'The instance check watches your own OS and configuration; a failed host shows in the system check.' },
          { t: 'A scheduled Lambda function that reads the status and restarts the instance', why: 'It can work, but it is code to write and run, which the stem rules out.' },
          { t: 'A Trusted Advisor fault tolerance check that flags the impaired instance', why: 'Trusted Advisor flags what to fix for a person; it acts on nothing.' }] }
    ]
  },
  {
    id: 'mon-logs-routing', sid: '11-monitoring', title: 'Logs: count them, stream them or archive them', domains: ['D4', 'D3'], src: ['ch6'],
    text: 'Think of a post room. A **metric filter** is a clerk who only **counts** letters of one kind, from today on, so an alarm can react. A **subscription filter** is a courier who **forwards** matching letters within minutes to Lambda, Kinesis or Firehose. An **export to S3** is a box shipped later, a batch job that can take hours. **Retention** decides when letters are shredded: never, unless you set it.',
    qs: [
      { id: 'q1', q: 'Security’s search cluster must receive each failed login line from an application’s CloudWatch log group almost as soon as it is written. Which feature delivers the lines?', words: ['almost as soon as it is written'],
        expl: 'Delivering the log events themselves in near real time is a subscription filter, through Firehose or Lambda to the cluster.',
        opts: [
          { t: 'A subscription filter that streams the matching lines on to the cluster', ok: true, why: 'It delivers matching events in near real time to another service.' },
          { t: 'A metric filter that sends each failed login line on to the search cluster', why: 'A metric filter produces a count, never the lines themselves.' },
          { t: 'A daily export task that copies the log group into an S3 bucket for search', why: 'Exports are batch jobs and can take up to 12 hours.' },
          { t: 'A longer retention setting so that the lines stay available for searching', why: 'Retention keeps lines in place; it moves nothing anywhere.' }] },
      { id: 'q2', q: 'A team creates a metric filter for TIMEOUT this morning and wonders why its new metric shows nothing for last night’s outage. What explains it?', words: ['this morning', 'last night’s outage'],
        expl: 'Metric filters are forward-only: they count events written after they exist. Last night is a Logs Insights query.',
        opts: [
          { t: 'Metric filters count only new events; use Logs Insights for the night', ok: true, why: 'Filters never look backwards; Insights queries stored logs.' },
          { t: 'The filter needs a subscription filter beside it before it starts', why: 'Metric filters work alone; nothing else is required.' },
          { t: 'The log group must first be exported to S3 for the filter to read it', why: 'Filters read events as they arrive, not exports.' },
          { t: 'Metric filters update only once a day, so the night will show tomorrow', why: 'There is no daily cycle; the past is simply never counted.' }] },
      { id: 'q3', q: 'A log group for a payment service was created a year ago, and nobody has changed its settings since. When will CloudWatch Logs delete its oldest events?', words: ['nobody has changed its settings', 'oldest events'],
        expl: 'Log groups never expire by default. Only a retention setting (from 1 day to 10 years) makes CloudWatch Logs delete older events itself.',
        opts: [
          { t: 'They stay indefinitely; only a retention setting would remove them', ok: true, why: 'With no retention set, a log group keeps its events forever.' },
          { t: 'After 30 days, the retention that every new log group starts with', why: 'There is no default period; a new log group never expires its events.' },
          { t: 'After 15 months, the same as the service’s own CloudWatch metrics', why: '455 days is how long 1-hour metric data is kept, not log events.' },
          { t: 'After 90 days, the same as API calls in CloudTrail event history', why: 'Ninety days is CloudTrail event history; log groups have no default expiry.' }] }
    ]
  },
  {
    id: 'mon-trail-history', sid: '11-monitoring', title: 'CloudTrail: the 90-day history and the trail', domains: ['D1'], src: ['ch8'],
    text: 'CloudTrail is a building’s visitor log. The **event history** is the front-desk book: always there, free, **90 days** of **management** actions per Region, then the pages are gone. A **trail** is the archive you set up: copies in **your S3 bucket** for as long as you keep them, every Region, and optionally **data events** such as who opened which S3 object, which the front desk never writes down.',
    update: 'Practice exams sometimes answer “query CloudTrail events” with CloudTrail Lake. CloudTrail Lake takes no new customers from 31 May 2026; query a trail with Athena over its S3 logs instead.',
    qs: [
      { id: 'q1', q: 'A manager asks who changed a production security group two weeks ago. The account never created a trail. Where is the answer?', words: ['two weeks ago', 'never created a trail'],
        expl: 'Changing a security group is a management event, and event history keeps 90 days of them in each Region with no setup.',
        opts: [
          { t: 'In CloudTrail event history, which keeps 90 days of management events', ok: true, why: 'On by default; two weeks is well inside the window.' },
          { t: 'Nowhere, because CloudTrail records nothing until a trail is created', why: 'Event history exists in every account without a trail.' },
          { t: 'In a new trail created today, which fills in the last 90 days at once', why: 'A trail records only from the moment it exists.' },
          { t: 'In AWS Config, which names the user behind each configuration change', why: 'Config records the state; the caller is in CloudTrail.' }] },
      { id: 'q2', q: 'Two years from now, auditors will ask who read files in a bucket of contracts. What must be in place today?', words: ['Two years from now', 'who read files'],
        expl: 'Object reads are data events: off by default and never in event history. Only a trail with data events turned on, keeping its files, can answer later.',
        opts: [
          { t: 'A trail with S3 data events on for the bucket, keeping its files in S3', ok: true, why: 'Data events record object reads; the trail keeps them for years.' },
          { t: 'Nothing extra, because event history keeps object reads for two years', why: 'Event history keeps 90 days and never shows data events.' },
          { t: 'A trail with default settings, which logs object reads for all buckets', why: 'Data events are off by default and must be turned on.' },
          { t: 'AWS Config recording for the bucket, which lists who read each object', why: 'Config tracks the bucket’s settings, not who reads its objects.' }] },
      { id: 'q3', q: 'A company with many accounts wants one record of API activity that no member account administrator can switch off. What should it create?', words: ['no member account administrator can switch off'],
        expl: 'An organization trail is created in the management account or a delegated administrator and applies to every account; members can see it but not change or delete it.',
        opts: [
          { t: 'An organization trail from the management account to a central bucket', ok: true, why: 'Members see it but cannot modify or delete it.' },
          { t: 'A separate trail in every account, each managed by its own administrator', why: 'Each administrator could stop the trail in their own account.' },
          { t: 'Event history in every account, exported by each team once a month', why: 'Event history keeps 90 days and relies on every team doing the work.' },
          { t: 'An AWS Config aggregator in a central account for all the member accounts', why: 'Config collects configuration, not the record of API calls.' }] }
    ]
  },
  {
    id: 'mon-ssm-fleet', sid: '11-monitoring', title: 'Systems Manager: shell, script, patch, state', domains: ['D1', 'D2'], src: ['ch10'],
    text: 'Systems Manager is a remote control for every **managed node**: no SSH, no open inbound port. **Session Manager** is talking to one person: a shell on one instance. **Run Command** is a loudspeaker: one command to many nodes, now. **Patch Manager** is the health check-up: patches against a baseline, on a schedule, with a compliance report. **State Manager** is a house rule that keeps being enforced, also for newcomers.',
    qs: [
      { id: 'q1', q: 'After a vulnerability report, every Linux instance tagged web must restart its web server process tonight, once. SSH is blocked. Which tool fits?', words: ['tonight, once', 'SSH is blocked'],
        expl: 'A single command to many managed nodes, targeted by tag, is Run Command; no inbound port is needed.',
        opts: [
          { t: 'Run Command, sending one restart command to the instances by their tag', ok: true, why: 'Many nodes, one command, now, with no SSH.' },
          { t: 'Session Manager, opening a shell to each instance to restart it by hand', why: 'One interactive session per instance, done by a person.' },
          { t: 'State Manager, with an association that restarts the process every night', why: 'An association keeps reapplying; the job is one restart.' },
          { t: 'Patch Manager, with a baseline that includes a restart of the process', why: 'Patch Manager installs patches; it does not run ad-hoc restarts.' }] },
      { id: 'q2', q: 'Every new instance must get a security agent installed and kept running, including ones Auto Scaling launches next month. Which tool keeps that true?', words: ['kept running', 'next month'],
        expl: 'A State Manager association defines the state to keep and applies it to new nodes as they join the target, then keeps reapplying it.',
        opts: [
          { t: 'A State Manager association that targets the fleet and keeps the agent', ok: true, why: 'It applies to new nodes and reapplies on a schedule.' },
          { t: 'Run Command, executed once today on every instance that exists now', why: 'Instances launched next month never get it.' },
          { t: 'Session Manager, used by an engineer on each instance after it launches', why: 'Manual, one instance at a time.' },
          { t: 'Inventory, which installs any agent that it finds missing on a node', why: 'Inventory only collects metadata; it installs nothing.' }] },
      { id: 'q3', q: 'Auditors want proof each month that all 300 servers have the approved operating system updates. Which tool installs them and produces that proof?', words: ['proof each month', 'approved operating system updates'],
        expl: 'Patch Manager compares nodes with a patch baseline, installs what is missing on a schedule and reports patch compliance. Inspector finds vulnerabilities but installs nothing.',
        opts: [
          { t: 'Patch Manager, with a baseline and a monthly maintenance window', ok: true, why: 'It installs approved patches and reports compliance per node.' },
          { t: 'Amazon Inspector, which installs the patches for what it detects', why: 'Inspector finds vulnerabilities; it never installs patches.' },
          { t: 'Run Command, sending the update command to all servers once', why: 'No approval baseline and no compliance report.' },
          { t: 'AWS Config, with a rule that marks unpatched servers as noncompliant', why: 'Config judges resource configuration and installs nothing.' }] }
    ]
  }
]);
