/* Session 10 trigger cards (compute & scaling). f = what the exam says, b = the answer. line = transit line id or
   topic. Cards marked mine come from his baseline miss Q43 and his prestige-distractor pattern (src 'Exam pattern').
   Numbers: docs/session-10-compute.md. */
(function () {
  'use strict';
  const S = window.SESSION = window.SESSION || {};
  const _c = (id, line, f, b, why, tempt, extra) => Object.assign({ id, line, f, b, why, tempt }, extra || {});
  S.cards = [
    /* choosing */
    _c('c01', 'choose', 'Users in one Region get errors while new instances boot; an option adds Global Accelerator or a second Region', 'Cross it out — a scaling problem: target tracking, scaling ahead, a warm pool', 'A faster network path or another Region adds no instance where the load is.', 'Picking the most impressive service.', { mine: true, src: 'Exam pattern' }),
    _c('c02', 'choose', 'Container image, no servers to patch or scale, behind an ALB', 'Amazon ECS service on AWS Fargate', 'Tasks register as IP targets; AWS runs the capacity.', 'EC2 with Docker in user data (servers again).', { update: 'App Runner takes no new customers from 30 Apr 2026; AWS points to ECS Express Mode for image-to-HTTPS-service deployments.' }),
    _c('c03', 'choose', 'Needs OS access: a kernel module, a host agent, a licensed driver', 'Amazon EC2 in an Auto Scaling group', 'Only EC2 gives you the OS; the group replaces failures.', 'Fargate (no privileged containers, no host access).'),
    _c('c04', 'choose', 'Developers upload code and want the load balancer, scaling and monitoring built for them', 'AWS Elastic Beanstalk', 'It creates the ALB, Auto Scaling group and instances; no extra charge.', 'Building the stack by hand with CloudFormation.'),
    _c('c05', 'choose', 'A TCP service in one Region needs fixed IPs for a partner; options add Global Accelerator or Transit Gateway', 'Network Load Balancer with an Elastic IP per AZ', 'Static IPs in one Region are an NLB feature; Transit Gateway has none to give.', 'Global Accelerator (built for global users; extra cost).', { mine: true, src: 'Exam pattern' }),
    /* EC2 */
    _c('c06', 'ec2', 'In-memory database / cache, lots of RAM, little CPU', 'Memory optimized instances', 'The most RAM per vCPU.', 'Compute optimized (idle vCPUs).'),
    _c('c07', 'ec2', 'Tightly coupled HPC with MPI, lowest node-to-node latency', 'Cluster placement group in one AZ + Elastic Fabric Adapter', 'Up to 10 Gbps single-flow inside the group; OS-bypass networking.', 'Spread placement group (built for separation).'),
    _c('c08', 'ec2', 'Hundreds of rack-aware nodes (Cassandra, HDFS, HBase)', 'Partition placement group', 'Partitions share no racks; up to 7 per AZ; the partition is visible to the app.', 'Spread placement group (7 running instances per AZ).'),
    _c('c09', 'ec2', 'A few critical instances must never fail together', 'Spread placement group', 'Each instance on distinct hardware; at most 7 running per AZ.', 'Cluster placement group (packs them together).'),
    _c('c10', 'ec2', 'Licence counted per socket or core; same server after a stop', 'Dedicated Host (with host affinity)', 'Sockets and cores visible; affinity keeps the instance on its host.', 'Dedicated Instances (isolation only).'),
    /* purchase options */
    _c('c11', 'buy', 'Steady 24/7 on one family in one Region for 3 years, deepest discount', 'EC2 Instance Savings Plan (up to 72%)', 'Any size, OS or tenancy within the family and Region.', 'Compute Savings Plan (flexibility you will not use).'),
    _c('c12', 'buy', 'Workload will change family or Region, or move to Fargate or Lambda', 'Compute Savings Plan (up to 66%)', 'Follows the spend across families, Regions, Fargate and Lambda.', 'EC2 Instance Savings Plan or Standard RI (one family).'),
    _c('c13', 'buy', 'Guaranteed capacity in one AZ for a two-week event, no commitment', 'On-Demand Capacity Reservation', 'Any duration, no term for immediate use; combine with a Savings Plan for a discount.', 'A Savings Plan or Regional RI (no capacity).'),
    _c('c14', 'buy', 'Interruptible, checkpointed, retried work; cheapest', 'Spot Instances across several types and AZs', 'Up to 90% off; two-minute notice when reclaimed.', 'On-Demand (full price for work that can stop).'),
    _c('c15', 'buy', 'Commitment that can be sold later / exchanged later', 'Standard RI = sell in the RI Marketplace · Convertible RI = exchange', 'Standard cannot be exchanged; Convertible cannot be sold.', 'Swapping the two.'),
    _c('c16', 'buy', 'Spot that runs for a fixed 1–6 hours without interruption', 'Not available: Spot blocks are gone — use On-Demand for the duration, or plain Spot if it can be interrupted', 'No new customers since 1 July 2021; support ended 31 December 2022.', 'Spot blocks (older material).', { update: 'Spot blocks (1–6 hours) take no new customers since 1 July 2021. Spot prices are set by EC2 and move gradually; there is no bidding.' }),
    /* Auto Scaling */
    _c('c17', 'asg', 'Keep average CPU near 50% with the least work', 'Target tracking scaling policy', 'Auto Scaling creates and manages the alarms, like a thermostat.', 'Step scaling with alarms you tune.'),
    _c('c18', 'asg', 'Known peak at a fixed time (contract, event date), no history needed', 'Scheduled action', 'A clock you set; launches before the peak.', 'Predictive scaling (needs at least 24 h of data).'),
    _c('c19', 'asg', 'Recurring daily pattern with slow boots; capacity before the surge', 'Predictive scaling + a dynamic policy beside it', 'Forecasts 48 h from up to 14 days of history; never scales in.', 'Predictive scaling alone (nothing scales in).'),
    _c('c20', 'asg', 'Instances run but fail requests; the group does not replace them', 'Turn on ELB health checks for the Auto Scaling group', 'Default is EC2 status checks only.', 'A longer health check grace period.'),
    _c('c21', 'asg', 'Long bootstrap; unpredictable spikes must be served fast', 'Warm pool of pre-initialised instances', 'Stopped, running or hibernated, ready before the spike.', 'Predictive scaling (no pattern to learn).'),
    _c('c22', 'asg', 'New design asks for a launch configuration', 'Launch template', 'No new instance types since 1 Jan 2023; accounts created since 1 Oct 2024 cannot create launch configurations.', 'Launch configuration (older material).', { update: 'Launch configurations: no new instance types since 1 Jan 2023, none for accounts created since 1 Oct 2024.' }),
    /* load balancers */
    _c('c23', 'elb', 'Route /orders and /users (or one host name per service) to different services', 'Application Load Balancer listener rules', 'Path and host conditions are layer 7 ALB features.', 'NLB or Route 53 (ports, names — never paths).', { mine: true, src: 'Exam Q43' }),
    _c('c24', 'elb', 'UDP at very high volume, keep the client IP', 'Network Load Balancer', 'Layer 4, client source IP retained.', 'Application Load Balancer (HTTP only).'),
    _c('c25', 'elb', 'Static IPs for allow-listing AND path-based routing', 'NLB with Elastic IPs → ALB-type target group → ALB rules', 'The NLB gives the IPs; the ALB reads the paths.', 'An ALB with Elastic IPs (not possible).'),
    _c('c26', 'elb', 'Third-party virtual firewalls inline for all traffic', 'Gateway Load Balancer (GENEVE, port 6081)', 'Scales and health-checks the appliance fleet (designs: Session 3).', 'An NLB in front of the appliances.'),
    _c('c27', 'elb', 'Uneven targets per AZ on an NLB; some targets overloaded', 'Turn on cross-zone load balancing', 'Off by default on NLB and GWLB; always on at the ALB.', 'Changing the routing algorithm (ALB setting).'),
    _c('c28', 'elb', 'Restrict who can reach an NLB with a security group', 'Create the NLB with a security group', 'Supported now, but an NLB created without one cannot get one later.', '“NLBs have no security groups” (older material).', { update: 'NLBs support security groups now, set when the NLB is created; they also gained QUIC listeners.' }),
    /* ECS · Fargate */
    _c('c29', 'ecs', 'The container’s code gets AccessDenied on DynamoDB; image pull and logs work', 'Add the permission to the task role', 'The task execution role is for the agent: pull, logs, secrets.', 'The task execution role.'),
    _c('c30', 'ecs', 'GPU containers, but keep ECS', 'ECS on an Auto Scaling group capacity provider of GPU instances', 'Fargate has no GPUs.', 'Fargate with a larger task size.'),
    _c('c31', 'ecs', 'Largest Fargate task for a memory-heavy container', 'Up to 32 vCPU with 60, 120 or 244 GiB (since June 2026)', 'Older material: 4 vCPU / 30 GB, later 16 vCPU / 120 GB.', 'Moving to EC2 only for size.', { update: '32 vCPU Fargate tasks announced 5 Jun 2026, on Fargate and Fargate Spot, Linux x86 and Arm.' }),
    /* EKS */
    _c('c32', 'eks', 'Existing Kubernetes manifests, Helm charts, kubectl', 'Amazon EKS', 'Kubernetes API unchanged; AWS runs the control plane.', 'ECS (a rewrite to task definitions).'),
    _c('c33', 'eks', 'DaemonSet, privileged pod or GPU on EKS', 'EC2 nodes (node group or Auto Mode), not Fargate', 'Fargate pods: no DaemonSets, no privileged containers, no GPUs.', 'A Fargate profile.'),
    /* Lambda */
    _c('c34', 'lambda', 'Event-driven code that finishes in seconds, idle most of the day', 'AWS Lambda', 'Pay per use; limits in Session 9 chapter 8.', 'A Fargate service running all day.'),
    _c('c35', 'lambda', 'A job of 40 minutes started by an event, no servers', 'A Fargate task (or an AWS Batch job)', 'Lambda stops at 15 minutes.', 'Lambda with more memory.'),
    /* Elastic Beanstalk */
    _c('c36', 'paas', 'Beanstalk deployment: full capacity and the fastest rollback', 'Immutable deployment (or blue/green with a URL swap)', 'New instances in a separate Auto Scaling group; terminate them to roll back.', 'Rolling (capacity drops).'),
    _c('c37', 'paas', 'Beanstalk: zero downtime with a second environment', 'Blue/green: clone, deploy, Swap environment URLs', 'Keep the old environment until DNS has expired.', 'All at once (downtime).'),
    _c('c38', 'paas', 'Background jobs from a queue, deployed with Beanstalk', 'Worker environment tier', 'A daemon on each instance reads the SQS queue and posts to the app.', 'A web server environment polling SQS in code.'),
    /* AWS Batch */
    _c('c39', 'batch', 'Thousands of jobs of hours each, with dependencies, on Spot, least ops', 'AWS Batch (job queues + managed compute environment)', 'Batch queues, retries and scales the capacity; no extra charge.', 'SQS + an Auto Scaling group you build.'),
    _c('c40', 'batch', 'Tightly coupled HPC job across several instances, scheduled for you', 'AWS Batch multi-node parallel job (with EFA)', 'One job spans many instances; Batch schedules it.', 'Lambda (15 minutes, no MPI).')
  ];
})();
