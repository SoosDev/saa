/* Session 11 trigger cards (monitoring & operations). f = what the exam says, b = the answer. line = transit line id or
   topic. Cards marked mine come from his baseline misses Q44 and Q49 and his prestige-distractor pattern
   (src 'Exam pattern'). Numbers: docs/session-11-monitoring.md. */
(function () {
  'use strict';
  const S = window.SESSION = window.SESSION || {};
  const _c = (id, line, f, b, why, tempt, extra) => Object.assign({ id, line, f, b, why, tempt }, extra || {});
  S.cards = [
    /* his record */
    _c('c01', 'logs', 'Memory utilization and swap of EC2 instances in CloudWatch', 'CloudWatch agent (namespace CWAgent)', 'EC2 publishes no memory, swap or disk-space metric; the hypervisor cannot see inside the OS.', 'Detailed monitoring (same metrics, more often).', { mine: true, src: 'Exam Q44' }),
    _c('c02', 'config', 'Track configuration changes to resources and be notified', 'AWS Config (configuration timeline + SNS notifications)', 'Config records what each resource looked like after every change.', 'CloudTrail (who called the API, 90 days in event history).', { mine: true, src: 'Exam Q49' }),
    _c('c03', 'choose', '“Who deleted it?” and the options offer GuardDuty, Security Hub or Detective', 'Cross them out — CloudTrail event history (or the trail)', 'The audit record of API calls is CloudTrail; the others detect, aggregate or investigate findings.', 'Picking the most impressive security service.', { mine: true, src: 'Exam pattern' }),
    /* choosing */
    _c('c04', 'choose', 'How is it performing? / utilization / latency', 'CloudWatch metrics (and alarms)', 'Numbers over time from AWS services, the agent or your code.', 'CloudTrail (records calls, not performance).'),
    _c('c05', 'choose', 'Which microservice makes the request slow?', 'AWS X-Ray traces and the trace map', 'One trace follows the request through every hop.', 'Logs Insights over each service’s logs.'),
    _c('c06', 'choose', 'CPU spiked after a change: what changed, and who changed it?', 'AWS Config timeline + CloudTrail event', 'Config shows before and after; CloudTrail names the caller.', 'CloudWatch alone (only the spike).'),
    /* CloudWatch metrics and alarms */
    _c('c07', 'cw', 'EC2 alarm must react within one minute', 'Detailed monitoring (1-minute EC2 metrics)', 'Basic monitoring sends EC2 metrics every 5 minutes; status checks every minute.', 'A high-resolution alarm on a 5-minute metric.'),
    _c('c08', 'cw', 'Publish an application number (orders per minute, queue depth in the app)', 'Custom metric with PutMetricData', 'Standard resolution 1 minute, high resolution down to 1 second.', 'A proxy metric such as NetworkIn.'),
    _c('c09', 'cw', 'How long does CloudWatch keep 1-minute data?', '15 days at 1 minute, then 5-minute until 63 days, then 1-hour until 455 days', 'Under 60 seconds: 3 hours. Data is aggregated as it ages.', '“Metrics are kept forever at full resolution.”'),
    _c('c10', 'cw', 'Single-minute spikes page the on-call engineer; real incidents last minutes', 'M out of N datapoints to alarm (e.g. 3 of 5)', 'Breaching points need not be consecutive, only within the last N.', 'A higher threshold or a bigger instance.'),
    _c('c11', 'cw', 'Page only when several alarms are in ALARM together', 'Composite alarm', 'A rule over other alarms’ states; notify from the composite only.', 'One metric math alarm on a sum.'),
    _c('c12', 'cw', 'Stop, reboot or recover an instance automatically on a metric', 'CloudWatch alarm with an EC2 action', 'Alarms on EC2 metrics can stop, terminate, reboot or recover.', 'A scheduled Lambda function.'),
    _c('c13', 'cw', '“When an instance is terminated / when someone calls an API”', 'EventBridge rule (with an SNS or Lambda target)', 'An event matches a pattern; alarms are for numbers over time.', 'A CloudWatch alarm.'),
    _c('c14', 'cw', 'Alert when estimated charges exceed an amount', 'Billing alarm on the estimated charges metric in us-east-1', 'Billing metric data lives in US East (N. Virginia); enable billing alerts first.', 'An alarm in the Region where the resources run.'),
    /* CloudWatch Logs and the agent */
    _c('c15', 'logs', 'Count ERROR lines and alert', 'Metric filter → alarm → SNS', 'The filter turns matching lines into a metric (from now on, not backwards).', 'A Lambda function counting lines.'),
    _c('c16', 'logs', 'Stream logs in near real time to OpenSearch, S3 or another account', 'Subscription filter (Firehose, Kinesis Data Streams, Lambda)', 'Usually under three minutes after ingestion; up to five filters per log group.', 'Export to S3 (batch, up to 12 hours).', { update: 'Log groups can have up to five subscription filters; an account can add one account-level filter per Region, and log centralization copies log groups across accounts and Regions.' }),
    _c('c17', 'logs', 'Keep logs one year, then delete them, cheapest', 'Set the log group’s retention', 'Retention from 1 day to 10 years; default never expires.', 'A Lambda function that deletes streams.'),
    _c('c18', 'logs', 'Search last week’s logs ad hoc, no servers', 'CloudWatch Logs Insights', 'Query language over existing logs, paid per data scanned.', 'A new metric filter (not retroactive).'),
    _c('c19', 'logs', 'On-premises servers’ memory and logs in CloudWatch', 'CloudWatch agent on the servers (IAM credentials)', 'The unified agent runs on EC2 and on-premises, metrics and logs.', 'The old CloudWatch Logs agent.', { update: 'The CloudWatch Logs agent (awslogs) is deprecated; AWS strongly recommends the unified CloudWatch agent.' }),
    _c('c20', 'logs', 'Install and configure the agent on hundreds of instances', 'Systems Manager (Run Command or State Manager) + configuration in Parameter Store', 'One stored configuration, rolled out to the fleet; IAM role CloudWatchAgentServerPolicy.', 'Logging in to each server.'),
    /* X-Ray and application monitoring */
    _c('c21', 'apm', 'Know the site is down before customers report it, even with no traffic', 'CloudWatch Synthetics canary', 'Scripts on a schedule that act like a customer.', 'RUM (needs real users).'),
    _c('c22', 'apm', 'Page load times and errors from real users’ browsers', 'CloudWatch RUM', 'Client-side data from actual user sessions.', 'A canary (synthetic, not real users).'),
    _c('c23', 'apm', 'Top 10 IP addresses / URLs / callers in the logs', 'CloudWatch Contributor Insights', 'Top-N contributors in log data, in real time.', 'One metric filter per value.'),
    _c('c24', 'apm', 'Instrument the code to send traces to X-Ray', 'OpenTelemetry (AWS Distro for OpenTelemetry) or the CloudWatch agent', 'X-Ray SDKs and daemon are in maintenance mode since 25 February 2026.', 'A new X-Ray daemon deployment (older material).', { update: 'X-Ray SDKs and daemon: maintenance mode since 25 Feb 2026 (security fixes only); OpenTelemetry is AWS’s recommendation. X-Ray itself stays.' }),
    /* CloudTrail */
    _c('c25', 'trail', 'Who did it, last week, nothing set up', 'CloudTrail event history', '90 days of management events per Region, on by default, free.', 'Creating a trail now (records from now on).'),
    _c('c26', 'trail', 'Keep API activity for years, all Regions', 'A multi-Region trail to S3 (lifecycle rules for archiving)', 'Log files in your bucket as long as you keep them; first copy of management events free.', 'Event history (90 days).'),
    _c('c27', 'trail', 'Who read this S3 object?', 'Trail with S3 data events turned on', 'Data events are off by default and charged; never in event history.', 'Management events (GetObject is not one).'),
    _c('c28', 'trail', 'All accounts logged; member accounts cannot disable it', 'Organization trail from the management account (or delegated administrator)', 'Members see it but cannot modify or delete it.', 'A trail per account.'),
    _c('c29', 'trail', 'Prove the log files were not changed', 'Log file integrity validation', 'Hourly digest files with SHA-256 hashes, signed; validate with the AWS CLI.', 'Encrypting the files with KMS.'),
    _c('c30', 'trail', 'Run SQL over CloudTrail events in a new design', 'Athena over the trail’s S3 logs (or Logs Insights on its log group)', 'CloudTrail Lake takes no new customers from 31 May 2026.', 'CloudTrail Lake (older material).', { update: 'CloudTrail Lake is no longer open to new customers from 31 May 2026; AWS points to CloudWatch for similar capabilities.' }),
    /* Config */
    _c('c31', 'config', 'What did this security group look like last month?', 'AWS Config configuration timeline', 'A configuration item per change, kept as history.', 'CloudTrail event history.'),
    _c('c32', 'config', 'Report every unencrypted volume and untagged bucket continuously', 'AWS Config rules (Session 6, chapter 10)', 'Your rules, evaluated on change or periodically, with remediation.', 'Trusted Advisor (AWS’s fixed checks).'),
    /* Systems Manager */
    _c('c33', 'ssm', 'Patch a fleet on a schedule and report compliance', 'Patch Manager + patch baseline + maintenance window (or a Quick Setup patch policy)', 'Scan or Scan and install, with patch compliance.', 'Amazon Inspector (finds, never installs).'),
    _c('c34', 'ssm', 'Run one script now on 150 tagged instances, no SSH', 'Systems Manager Run Command', 'Targets managed nodes by tag; no inbound port.', 'Session Manager (one shell at a time).'),
    _c('c35', 'ssm', 'Keep software installed and a setting enforced, new instances included', 'State Manager association', 'Defines the state to keep; reapplies on a schedule and on new nodes.', 'Run Command once.'),
    _c('c36', 'ssm', 'Fix a recurring problem with a multi-step runbook, also from a Config rule', 'Systems Manager Automation', 'AWS-maintained or custom runbooks for maintenance and remediation.', 'A hand-written script per incident.'),
    _c('c37', 'ssm', 'Make EC2 instances managed nodes without attaching an instance profile', 'Default Host Management Configuration', 'Systems Manager applies a default role to every instance in the account and Region.', 'An instance profile on each instance (older material).', { update: 'Incident Manager and Change Manager are closed to new customers from 7 Nov 2025; Default Host Management Configuration is the newer way to manage every instance.' }),
    /* advice and service-specific */
    _c('c38', 'advise', 'Which service limits are close? AWS best-practice checks', 'AWS Trusted Advisor', 'Six categories; every account gets the Service Limits checks.', 'AWS Config rules (your own rules).', { update: 'Full checks: Business Support+, Enterprise or Unified Operations. Developer, Business and Enterprise On-Ramp Support end on 1 Jan 2027.' }),
    _c('c39', 'advise', 'Be told about scheduled maintenance that affects our instances', 'AWS Health Dashboard (your account’s events, scheduled changes)', 'Public service health plus events about your own resources.', 'Trusted Advisor.'),
    _c('c40', 'svc', 'OS processes and memory of an RDS DB instance, every few seconds', 'RDS Enhanced Monitoring', 'An agent on the DB instance; CloudWatch metrics come from the hypervisor.', 'Database Insights (database load by SQL and waits).', { update: 'Performance Insights reached its end of life on 31 Jul 2026; AWS moved its users to CloudWatch Database Insights (Standard and Advanced).' })
  ];
})();
