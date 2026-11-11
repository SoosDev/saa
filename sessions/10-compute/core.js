/* Session 10 — Compute & scaling (the comparison layer): meta, lines, the compute map, stub, method, cheat sheet,
   compare, traps, log.
   Colour rule: a service keeps its colour on every page. Session 10 adds no hue: every family is an ink line (4 px)
   told apart by dash pattern and station shape, and every line is labelled. Inherited: `asg` keeps Session 7's solid
   line and squares, `lambda` keeps Session 9's 12 8 dash and rings, `elb` keeps the hexagon of Session 4's `alb` with
   a new dash (that line was ALB listener rules; this one is the whole ELB family).
   Facts: docs/session-10-compute.md, "Facts verified 2026-11-11". */
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
  const ENTRY = ['elb', 'asg', 'ecs', 'eks', 'paas'];

  Object.assign(S, {
    meta: { id: '10-compute', n: 10, title: 'Compute & Scaling', brand: 'Compute Transit Map', home: '../../', updated: '2026-11-11' },

    lines: [
      { id: 'ec2', name: 'EC2 · families · placement', short: 'EC2', cls: 'ink', width: 4, dash: '1 9', alias: ['EC2', 'Amazon EC2', 'instance type', 'instance family', 'general purpose', 'compute optimized', 'memory optimized', 'storage optimized', 'accelerated computing', 'burstable', 'T3', 'CPU credits', 'unlimited mode', 'Graviton', 'hibernate', 'hibernation', 'Dedicated Instance', 'Dedicated Host', 'tenancy', 'placement group', 'cluster placement group', 'spread placement group', 'partition placement group', 'EFA', 'Elastic Fabric Adapter'],
        verb: 'gives you the server, its shape and its place',
        from: 'pick a family (general, compute, memory, storage, accelerated, HPC) and a size → tenancy (shared, Dedicated Instance, Dedicated Host) → placement group (cluster, partition, spread) → launch',
        built: 'A **virtual server you control down to the OS**. The **family** is the shape: general purpose for web servers and small-to-medium databases, **compute optimized** for batch, media transcoding and game servers, **memory optimized** for in-memory databases and analytics, **storage optimized** for heavy sequential I/O on local disks, **accelerated computing** for GPUs and other accelerators. **Burstable (T)** instances earn CPU credits below a baseline and spend them above it. **Hibernation** keeps RAM on an encrypted EBS root volume across a stop. **Placement groups** decide where instances sit: **cluster** (one AZ, lowest latency), **partition** (racks that share nothing, up to 7 partitions per AZ), **spread** (distinct hardware, up to 7 running instances per AZ). **Dedicated Hosts** give you the physical server for per-socket or per-core licences.',
        says: ['in-memory database / large RAM per vCPU', 'tightly coupled HPC, lowest latency between nodes', 'distributed database aware of racks (HDFS, Cassandra)', 'a few critical instances must not share hardware', 'per-socket or per-core licence (BYOL)', 'keep the in-memory state across a stop', 'a small, mostly idle workload with short bursts'],
        switch: [{ to: 'asg', when: 'the number of instances must follow the load or replace failures' }, { to: 'ecs', when: 'the application ships as containers and nobody needs the OS' }, { to: 'buy', when: 'the question is how to pay for the instances, not which instances' }],
        traps: ['A cluster placement group “for availability” (one AZ, one rack segment).', 'A spread placement group for a large cluster (seven running instances per AZ).', 'Dedicated Instances for per-socket licences (no socket or core visibility; Dedicated Host).', 'Compute optimized for a RAM-bound cache (memory optimized).'],
        update: '**T3, T3a, T4g and T8i launch in unlimited mode by default**: they keep bursting past their credits and you pay for surplus credits when the 24-hour average is above the baseline (older material: they throttle). Placement groups now have a fourth strategy, **precision time**, for microsecond-accurate clocks.' },
      { id: 'buy', name: 'Purchase options', short: 'Purchase', cls: 'ink', width: 4, dash: '10 6', alias: ['On-Demand', 'Savings Plans', 'Compute Savings Plan', 'EC2 Instance Savings Plan', 'Reserved Instance', 'RI', 'Standard RI', 'Convertible RI', 'zonal RI', 'Regional RI', 'Spot', 'Spot Instance', 'Capacity Reservation', 'On-Demand Capacity Reservation', 'ODCR', 'Capacity Blocks', 'Dedicated Host'],
        verb: 'decides how you pay and whether capacity is held',
        from: 'workload shape (steady, peaks, interruptible, short) → discount (Savings Plans, RIs, Spot) and, separately, capacity (Capacity Reservations, zonal RIs)',
        built: 'Two independent questions. **How you pay**: On-Demand (no commitment), **Savings Plans** ($/hour for 1 or 3 years: **Compute** up to 66% off and also covering Fargate and Lambda, **EC2 Instance** up to 72% for one family in one Region), **Reserved Instances** (Standard up to 72%, sellable; Convertible up to 66%, exchangeable), **Spot** (up to 90% off, reclaimed with a two-minute notice). **Whether capacity is held**: **On-Demand Capacity Reservations** reserve instances in one AZ with no term (billed whether used or not, no discount by themselves); zonal RIs reserve, Regional RIs and Savings Plans do not.',
        says: ['steady 24/7 for three years', 'the workload will move to Fargate or Lambda', 'guaranteed capacity in one AZ for an event', 'can be interrupted / checkpointed / retried', 'MOST cost-effective for a fault-tolerant batch', 'baseline plus unpredictable spikes'],
        switch: [{ to: 'asg', when: 'the mix of On-Demand and Spot must be managed for a fleet (mixed instances policy)' }, { to: 'ec2', when: 'the licence needs the physical server (Dedicated Host)' }, { to: 'batch', when: 'the Spot work is a queue of jobs to run' }],
        traps: ['A Savings Plan or Regional RI to guarantee capacity (they reserve nothing).', 'An EC2 Instance Savings Plan for a workload moving to Fargate or Lambda (Compute Savings Plan).', 'Spot for work that cannot be interrupted or checkpointed.', 'A Capacity Reservation alone to save money (no discount without a Savings Plan or Regional RI).'],
        update: 'AWS lists **four** Savings Plans types now (Compute, EC2 Instance, **Database**, SageMaker AI) and calls Reserved Instances “an older purchasing option” it recommends replacing with Savings Plans. Spot has **no bidding** (prices move gradually with long-term supply and demand), **Spot blocks** are gone (no new customers since 1 July 2021), and Capacity Reservations can be **future-dated**; **Capacity Blocks for ML** reserve GPUs for a future window.' },
      { id: 'asg', name: 'Auto Scaling groups', short: 'Auto Scaling', cls: 'ink', width: 4, alias: ['Auto Scaling', 'Auto Scaling group', 'ASG', 'EC2 Auto Scaling', 'launch template', 'launch configuration', 'desired capacity', 'target tracking', 'step scaling', 'simple scaling', 'scheduled scaling', 'predictive scaling', 'cooldown', 'warmup', 'health check grace period', 'warm pool', 'lifecycle hook', 'mixed instances policy', 'Capacity Rebalancing'],
        verb: 'keeps the right number of healthy instances',
        from: 'launch template → group (min / desired / max, subnets in several AZs, health checks) → scaling policies (target tracking, step, scheduled, predictive) → instances registered with the load balancer',
        built: 'A group of EC2 instances that **replaces unhealthy ones** and **follows the load** between a minimum and a maximum. It launches from a **launch template** (versions, mixed instance types, Spot). Health comes from **EC2 status checks** by default; **ELB health checks** must be turned on to replace instances that run but fail requests. Policies: **target tracking** (a metric and a target, like a thermostat), **step** (alarm bands), **simple** (one step, then a 300 s cooldown), **scheduled** (a clock), **predictive** (a 48-hour forecast; it never scales in). Slow boots are hidden with **warm pools** and **lifecycle hooks**.',
        says: ['keep average CPU near 50%', 'replace instances that fail health checks', 'a known peak every weekday at 08:00', 'recurring daily pattern, scale ahead of it', 'scale workers on the SQS backlog', 'instances take 8 minutes to bootstrap', 'run a script before an instance is terminated'],
        switch: [{ to: 'elb', when: 'traffic must be spread over the instances (the ASG keeps the count; the load balancer spreads the load)' }, { to: 'buy', when: 'the question is the Spot / On-Demand mix and its price' }, { to: 'ecs', when: 'containers scale as tasks (service auto scaling), not as instances' }],
        traps: ['Expecting the group to replace an instance that only the load balancer sees as unhealthy (turn on ELB health checks).', 'Scheduled scaling for an unpredictable spike, or predictive scaling expected to scale in.', 'Scaling on queue length alone instead of backlog per instance.', 'A launch configuration in a new design (launch templates).'],
        update: '**Launch configurations** get no new instance types since 1 January 2023, and accounts created on or after 1 October 2024 cannot create them at all — the answer is a **launch template**. Banks that still offer a launch configuration expect the same group behaviour; a launch template is right under both.' },
      { id: 'elb', name: 'ELB: ALB · NLB · GWLB', short: 'Load balancers', cls: 'ink', width: 4, dash: '2 7', alias: ['Elastic Load Balancing', 'ELB', 'load balancer', 'Application Load Balancer', 'ALB', 'Network Load Balancer', 'NLB', 'Gateway Load Balancer', 'GWLB', 'Classic Load Balancer', 'CLB', 'listener', 'listener rule', 'target group', 'path-based routing', 'host-based routing', 'cross-zone', 'static IP', 'Elastic IP', 'GENEVE', 'TLS pass-through', 'sticky sessions', 'deregistration delay'],
        verb: 'spreads traffic over healthy targets',
        from: 'client → listener (protocol, port) → rules (ALB: host, path, header) → target group (instances, IPs, Lambda, an ALB) → healthy targets in each enabled AZ',
        built: 'Three load balancers for three jobs. **ALB** works at **layer 7** (HTTP/HTTPS): listener rules route by **host, path and header** to target groups of instances, IPs or **Lambda** functions, and it can authenticate users. **NLB** works at **layer 4** (TCP, UDP, TLS): millions of requests, the **client’s source IP kept**, one **static IP per AZ** (an Elastic IP optional), an ALB as a possible target; it cannot route by URL path or host name. **GWLB** sends all traffic through a fleet of **third-party appliances** (firewalls, IDS/IPS) over **GENEVE** port 6081. **Cross-zone** load balancing: always on at the ALB; off by default for NLB and GWLB.',
        says: ['path-based routing / host-based routing', 'route /api and /images to different services', 'static IP addresses for allow-listing', 'UDP / TCP, millions of requests per second', 'preserve the client IP', 'third-party virtual firewall appliances inline', 'targets must decrypt TLS themselves', 'Lambda function behind a load balancer'],
        switch: [{ to: 'asg', when: 'instances must be added or replaced, not just spread over' }, { to: 'ecs', when: 'the targets are container tasks (IP targets in a target group)' }],
        misses: 'Baseline **Q43** (exam, tag K): requests must go to different services by **path** and **host** — the keyword was “path/host-based routing”, and the answer is an **ALB** with listener rules. Route 53 sees names, not paths; an NLB works on ports and cannot read the URL.',
        traps: ['An NLB for path or host routing (layer 4; ALB).', 'An ALB for static IPs or UDP (NLB).', 'A Classic Load Balancer in a new design (previous generation).', 'Leaving NLB cross-zone off with uneven targets per AZ.'],
        update: 'NLBs have grown: **security groups** (only if the NLB was created with them), **QUIC** and **TCP_QUIC** listeners, weighted target groups in the default action, and listener rules on dual-stack NLBs that route by **source IP address type** — still not by path or host. ALB cross-zone load balancing can now be turned off **per target group**. The **Classic Load Balancer** is the previous generation and not recommended for new environments.' },
      { id: 'ecs', name: 'ECS · Fargate', short: 'ECS · Fargate', cls: 'ink', width: 4, dash: '24 8', alias: ['ECS', 'Amazon ECS', 'Elastic Container Service', 'task definition', 'task', 'service', 'Fargate', 'AWS Fargate', 'Fargate Spot', 'capacity provider', 'task role', 'task execution role', 'ECR', 'Amazon ECR', 'container', 'Docker', 'ECS Managed Instances', 'ECS Express Mode'],
        verb: 'runs containers as tasks and services',
        from: 'image in ECR → task definition (CPU, memory, roles) → service (desired count, subnets) → capacity: Fargate, Fargate Spot, EC2 Auto Scaling group or Managed Instances → ALB target group (IP targets)',
        built: '**AWS’s own container orchestrator.** A **task definition** describes the containers, their CPU and memory and two IAM roles: the **task execution role** (the agent pulls the image from ECR, writes logs, fetches secrets) and the **task role** (what your code may call). A **service** keeps a desired count of tasks running behind a load balancer and scales them. The tasks run on **Fargate** (no servers: you pick the task size, AWS runs it), **Fargate Spot** (interruptible, two-minute warning) or **EC2 instances** you manage in an Auto Scaling group — the choice for **GPUs**, privileged containers or host access.',
        says: ['containerised application with no servers to manage', 'stop patching the container hosts', 'AWS-native container orchestration', 'the container cannot read from DynamoDB / S3', 'the task cannot pull its image', 'GPU containers', 'interruptible container jobs at the lowest price'],
        switch: [{ to: 'eks', when: 'the team already runs Kubernetes manifests, Helm charts or Kubernetes tooling' }, { to: 'lambda', when: 'short event-driven code with no container to keep running' }, { to: 'batch', when: 'a queue of jobs to run to completion, with retries and dependencies' }],
        traps: ['Fargate for GPUs or privileged containers (EC2 capacity).', 'Permissions for the application code put on the task execution role (task role).', 'EC2 capacity “to avoid managing servers” (Fargate).'],
        update: 'Fargate tasks now go up to **32 vCPU** with 60, 120 or 244 GiB (June 2026; older material: 4 vCPU, later 16). **ECS Managed Instances** (Sep 2025) let ECS run and patch EC2 instances for you, and **ECS Express Mode** (Nov 2025) turns an image into an HTTPS service — AWS’s recommendation now that **App Runner** takes no new customers (from 30 April 2026).' },
      { id: 'eks', name: 'EKS', short: 'EKS', cls: 'ink', width: 4, dash: '6 4', alias: ['EKS', 'Amazon EKS', 'Kubernetes', 'pod', 'Helm', 'node group', 'managed node group', 'Karpenter', 'Fargate profile', 'EKS Auto Mode', 'DaemonSet'],
        verb: 'runs Kubernetes with a managed control plane',
        from: 'Kubernetes manifests / Helm charts → EKS control plane (AWS) → pods on node groups, EKS Auto Mode nodes or Fargate (Fargate profile)',
        built: '**Managed Kubernetes.** AWS runs the control plane; your manifests, Helm charts and Kubernetes tools work unchanged. Pods run on EC2 nodes (node groups you choose, or **EKS Auto Mode**, where AWS scales, patches and replaces the nodes) or on **Fargate** through a **Fargate profile** — with Fargate limits: no DaemonSets, no privileged containers, no GPUs, private subnets only, IP targets only, and no Fargate Spot on EKS. Pick EKS when Kubernetes is the interface the team already uses.',
        says: ['existing Kubernetes manifests / Helm charts', 'Kubernetes on AWS with minimal changes', 'portable across clouds and on-premises', 'the team already runs Kubernetes'],
        switch: [{ to: 'ecs', when: 'no Kubernetes requirement and the LEAST operational overhead is asked' }, { to: 'ec2', when: 'nothing is containerised' }],
        traps: ['A DaemonSet or privileged pod on EKS Fargate (not supported).', 'EKS where nothing in the stem mentions Kubernetes and least ops is asked (ECS).'],
        update: '**EKS Auto Mode** now manages the data plane too: compute autoscaling, load balancing, storage and upgrades, with nodes replaced after at most **21 days**. Banks still describe managed node groups and Fargate profiles — both still exist.' },
      { id: 'lambda', name: 'Lambda', short: 'Lambda', cls: 'ink', width: 4, dash: '12 8', alias: ['Lambda', 'AWS Lambda', 'function', 'serverless function'],
        verb: 'runs short code on every event',
        from: 'event (S3, SQS, API Gateway, EventBridge, ALB) → function (up to 15 minutes) → result',
        built: '**Serverless functions** — here only as one of the compute choices. A function runs per event for up to **15 minutes**, from a zip or a container image up to **10 GB**, scales with the requests and costs nothing while idle. Everything else about Lambda (memory, payloads, concurrency, invocation models, API Gateway) is in [[../09-serverless/#learn/ch8|Session 9, chapter 8]].',
        says: ['run code in response to an event', 'runs for less than 15 minutes', 'no servers, pay only while it runs', 'spiky traffic with long idle periods'],
        switch: [{ to: 'ecs', when: 'the job runs longer than 15 minutes or needs a long-running process (a Fargate task)' }, { to: 'batch', when: 'thousands of long jobs with dependencies and retries' }, { to: 'ec2', when: 'the job needs OS access, a GPU or a licensed agent' }],
        traps: ['Lambda for a job longer than 15 minutes.', 'Lambda for a GPU workload or one that needs OS access.'] },
      { id: 'paas', name: 'Elastic Beanstalk', short: 'Beanstalk', cls: 'ink', width: 4, dash: '16 5 3 5', alias: ['Elastic Beanstalk', 'AWS Elastic Beanstalk', 'Beanstalk', 'environment', 'web server tier', 'worker tier', 'all at once', 'rolling', 'rolling with additional batch', 'immutable', 'traffic splitting', 'blue/green', 'swap environment URLs', 'CNAME swap', 'Cluster Mode'],
        verb: 'deploys your code and builds the stack around it',
        from: 'code or container → environment (web server tier: ALB + Auto Scaling group + EC2; worker tier: SQS queue + daemon) → deployment policy → new version',
        built: 'A **platform that builds the stack for you**: upload code, and Elastic Beanstalk creates the load balancer, the Auto Scaling group, the instances and the monitoring, and keeps them updated. There is no additional charge: you pay for the resources. A **web server** environment serves HTTP; a **worker** environment reads an **SQS queue** through a daemon on each instance. Deployment policies decide how a new version lands: **all at once** (fastest, downtime), **rolling** (reduced capacity), **rolling with additional batch** (full capacity), **immutable** (new instances in a separate Auto Scaling group, quick rollback), **traffic splitting** (canary), and **blue/green** by swapping environment URLs.',
        says: ['developers upload code, no infrastructure work', 'deploy a web app with the LEAST operational overhead', 'no downtime and full capacity during deployment', 'roll back quickly if the new version fails', 'background jobs from a queue'],
        switch: [{ to: 'ecs', when: 'the team wants container-level control over tasks and services' }, { to: 'asg', when: 'the team wants to build and own every resource itself' }],
        traps: ['All at once in production (downtime).', 'Rolling when capacity must not drop (rolling with additional batch or immutable).', 'Terminating the blue environment right after the URL swap (wait for DNS to expire).'],
        update: 'Elastic Beanstalk now has two modes (17 September 2026): **Standard Mode**, the EC2 environments the exam knows, and **Cluster Mode**, several applications on a shared Amazon EKS cluster with EKS Auto Mode. Exam questions describe Standard Mode.' },
      { id: 'batch', name: 'AWS Batch', short: 'Batch', cls: 'ink', width: 4, dash: '18 4', alias: ['AWS Batch', 'Batch', 'job', 'job definition', 'job queue', 'compute environment', 'array job', 'multi-node parallel job'],
        verb: 'runs queues of jobs on capacity it scales',
        from: 'job definition (container, vCPU, memory, role) → submit jobs to a job queue (priority, dependencies) → compute environment (EC2 On-Demand or Spot, Fargate, EKS) that Batch scales → results',
        built: '**Managed batch computing.** You submit **jobs** (containers with a vCPU and memory need) to **job queues** with priorities and **dependencies**; Batch provisions and scales the **compute environment** — EC2 On-Demand or **Spot**, Fargate or Fargate Spot, or an existing EKS cluster — runs the jobs, retries them and scales back down. It supports **multi-node parallel** jobs and EFA for tightly coupled HPC. There is no additional charge for Batch itself.',
        says: ['thousands of batch jobs', 'jobs that run for hours', 'job dependencies / job queues with priorities', 'run batch jobs on Spot with the LEAST operational overhead', 'HPC simulations, genomics, rendering'],
        switch: [{ to: 'lambda', when: 'each piece of work finishes within 15 minutes and is triggered by an event' }, { to: 'asg', when: 'the workload is a long-running service, not jobs that end' }],
        traps: ['Building an SQS queue and an Auto Scaling group of workers yourself where Batch already queues, schedules and scales.', 'Lambda for jobs that run for hours.'] }
    ],
    topics: { choose: 'Choosing the compute' },

    map: {
      title: 'The compute map', lead: 'Users at the top; below them the front door (load balancers), then servers and containers side by side, functions and jobs, and the platform that builds a stack for you. Tap a line or a station.',
      viewBox: '0 0 1000 880', defaultLine: 'asg',
      caption: 'Session 10 adds no colour: every family is an ink line told apart by dash and station shape — EC2 dots with circles, purchase options dashes with diamonds, Auto Scaling solid with squares, load balancers short dashes with hexagons, ECS and Fargate long dashes with pentagons, EKS short dashes with triangles, Lambda dashes with rings, Elastic Beanstalk dash-dot with dotted squares, AWS Batch long dashes with big circles. Every line is labelled; colour is never the only cue.',
      items: [
        { el: 'rect', a: { x: 0, y: 0, width: 1000, height: 96 }, style: 'fill:var(--muted-fill)' },
        { el: 'rect', a: { x: 0, y: 104, width: 1000, height: 776 }, style: 'fill:var(--zone-aws)' },
        zoneLabel(18, 22, 'USERS'),
        zoneLabel(18, 124, 'AWS'),
        ...box(20, 140, 950, 150, 'FRONT DOOR', true),
        ...box(20, 310, 480, 320, 'SERVERS', true),
        ...box(510, 310, 460, 320, 'CONTAINERS'),
        ...box(20, 650, 950, 120, 'FUNCTIONS · JOBS', true),
        ...box(20, 790, 950, 80, 'PLATFORM', true),

        /* ---- lines ---- */
        { el: 'line', line: 'paas', paths: ['M480 830 H40 V215 H220'], labels: [{ x: 60, y: 822, t: 'ELASTIC BEANSTALK', size: 10.5 }] },
        { el: 'line', line: 'elb', paths: ['M220 61 V215 H820'], labels: [{ x: 370, y: 207, t: 'LOAD BALANCERS', size: 10.5, anchor: 'middle' }] },
        { el: 'line', line: 'asg', paths: ['M220 215 V450', 'M220 370 H340'], labels: [{ x: 232, y: 300, t: 'AUTO SCALING', size: 10.5 }] },
        { el: 'line', line: 'buy', paths: ['M70 560 H450'], labels: [{ x: 70, y: 543, t: 'PURCHASE OPTIONS', size: 10.5 }] },
        { el: 'line', line: 'ec2', paths: ['M70 450 H420'], labels: [{ x: 70, y: 433, t: 'EC2 · PLACEMENT', size: 10.5 }] },
        { el: 'line', line: 'ecs', paths: ['M600 345 V560', 'M600 480 H840'], labels: [{ x: 612, y: 455, t: 'ECS', size: 10.5 }] },
        { el: 'line', line: 'eks', paths: ['M840 345 V560 H600'], labels: [{ x: 852, y: 540, t: 'EKS', size: 10.5 }] },
        { el: 'line', line: 'lambda', paths: ['M60 700 H260'], labels: [{ x: 150, y: 692, t: 'LAMBDA', size: 10.5 }] },
        { el: 'line', line: 'batch', paths: ['M400 700 H930'], labels: [{ x: 500, y: 692, t: 'AWS BATCH', size: 10.5 }] },

        /* ---- stations ---- */
        { el: 'rect', pick: ENTRY, a: { x: 40, y: 50, width: 958, height: 22, rx: 11 }, style: INK },
        sub(500, 90, 'browsers · mobile apps · partners · devices', ENTRY, 'middle'),
        /* front door */
        hexa(220, 215, ['elb', 'asg', 'paas']), T(204, 241, 'ALB', ['elb'], 'end'), sub(204, 257, 'paths · hosts', ['elb'], 'end'),
        hexa(520, 215, ['elb']), T(520, 245, 'NLB', ['elb'], 'middle'), sub(520, 261, 'layer 4 · static IPs', ['elb'], 'middle'),
        hexa(820, 215, ['elb']), T(820, 245, 'Gateway LB', ['elb'], 'middle'), sub(820, 261, 'GENEVE → appliances', ['elb'], 'middle'),
        /* servers */
        square(220, 370, ['asg', 'paas']), T(204, 374, 'Auto Scaling group', ['asg'], 'end'), sub(204, 390, 'launch template', ['asg'], 'end'),
        square(340, 370, ['asg']), T(356, 374, 'Warm pool', ['asg']), sub(356, 390, 'lifecycle hooks', ['asg']),
        diamond(100, 560, ['buy']), T(100, 586, 'On-Demand', ['buy'], 'middle'), sub(100, 602, 'pay as you go', ['buy'], 'middle'),
        diamond(220, 560, ['buy', 'asg']), T(220, 586, 'Savings Plan · RI', ['buy'], 'middle'), sub(220, 602, '1 or 3 years', ['buy'], 'middle'),
        diamond(330, 560, ['buy']), T(330, 586, 'Spot', ['buy'], 'middle'), sub(330, 602, 'up to 90% off', ['buy'], 'middle'),
        diamond(430, 560, ['buy', 'ec2']), T(430, 586, 'Dedicated Host', ['buy', 'ec2'], 'middle'), sub(430, 602, 'own licences', ['buy', 'ec2'], 'middle'),
        circle(100, 450, ['ec2']), T(100, 476, 'Burstable T', ['ec2'], 'middle'), sub(100, 492, 'CPU credits', ['ec2'], 'middle'),
        circle(220, 450, ['ec2', 'asg', 'paas']), T(220, 476, 'EC2 instance', ['ec2', 'asg'], 'middle'), sub(220, 492, 'six families', ['ec2'], 'middle'),
        circle(370, 450, ['ec2']), T(370, 476, 'Placement group', ['ec2'], 'middle'), sub(370, 492, 'cluster · spread · partition', ['ec2'], 'middle'),
        /* containers */
        penta(600, 380, ['ecs']), T(616, 384, 'ECS service', ['ecs']), sub(616, 400, 'tasks · services', ['ecs']),
        triangle(840, 380, ['eks']), T(856, 384, 'EKS cluster', ['eks']), sub(856, 400, 'Kubernetes', ['eks']), sub(856, 415, 'Auto Mode', ['eks']),
        sub(720, 440, 'images: Amazon ECR', ['ecs', 'eks'], 'middle'),
        square(840, 480, ['ecs', 'eks']), T(856, 484, 'EC2 capacity', ['ecs', 'eks']), sub(856, 500, 'your instances', ['ecs', 'eks']),
        penta(600, 560, ['ecs', 'eks']), T(600, 590, 'AWS Fargate', ['ecs', 'eks'], 'middle'), sub(600, 606, 'serverless tasks · pods', ['ecs', 'eks'], 'middle'),
        /* functions and jobs */
        ...ring(110, 700, ['lambda']), T(110, 730, 'Lambda', ['lambda'], 'middle'), sub(110, 746, 'limits → Session 9', ['lambda'], 'middle'),
        big(440, 700, ['batch']), T(440, 730, 'Job queue', ['batch'], 'middle'), sub(440, 746, 'job definitions', ['batch'], 'middle'),
        big(620, 700, ['batch']), T(620, 730, 'Compute environment', ['batch'], 'middle'), sub(620, 746, 'Batch scales it', ['batch'], 'middle'),
        big(790, 700, ['batch']), T(790, 730, 'EC2 · Spot', ['batch'], 'middle'), sub(790, 746, 'instances', ['batch'], 'middle'),
        big(910, 700, ['batch']), T(910, 730, 'Fargate', ['batch'], 'middle'), sub(910, 746, 'no servers', ['batch'], 'middle'),
        /* platform */
        ...sqdot(480, 830, ['paas']), T(496, 834, 'Elastic Beanstalk', ['paas']), sub(496, 850, 'web or worker tier · deployment policies', ['paas']),
        ...LABELS
      ]
    },

    stub: [
      { id: 'pat', label: 'PATTERN', short: 'PAT', values: ['steady 24/7', 'predictable peaks', 'spiky', 'short jobs', 'interruptible', 'none stated'] },
      { id: 'trf', label: 'TRAFFIC', short: 'TRF', values: ['HTTP/HTTPS', 'TCP/UDP', 'inline appliances', 'none stated'] },
      { id: 'ctl', label: 'CONTROL', short: 'CTL', values: ['OS access', 'containers', 'Kubernetes', 'code only', 'none stated'] },
      { id: 'sup', label: 'SUPERLATIVE', short: 'SUP', values: ['cheapest', 'least ops', 'fastest', 'most resilient', 'none stated'] }
    ],

    method:
`1. Strip the story. Keep HOW THE LOAD BEHAVES (steady, peaks you can
   predict, spikes you cannot, jobs that end, work that may be interrupted)
   and WHAT THE APP NEEDS (OS, containers, Kubernetes, just code; HTTP or TCP).
2. Fill the stub, the same 4 slots for this session:
   PATTERN (steady 24/7 / predictable peaks / spiky / short jobs / interruptible) ____
   TRAFFIC (HTTP/HTTPS / TCP/UDP / inline appliances / none) ____
   CONTROL (OS access / containers / Kubernetes / code only / none) ____
   SUPERLATIVE (cheapest / least ops / fastest / most resilient / none) ____
3. For EACH option ask: "what problem was this service BUILT for?"
   No match with the stub -> cross it out, however impressive it sounds
   (Global Accelerator for a slow scale-out, an NLB for path routing,
   Fargate for a GPU, Lambda for a 40-minute job, a Savings Plan for capacity).
4. Among the survivors, the one that satisfies the SUPERLATIVE wins
   (least ops: Fargate, Beanstalk, Batch, target tracking; cheapest: Spot
   for what may be interrupted, a commitment for what runs all the time).`,

    cheat:
`COMPUTE   = PATTERN + TRAFFIC + CONTROL + SUP
CHOOSE    OS, agents, licences -> EC2 + ASG · containers, no servers -> ECS on Fargate
          Kubernetes already -> EKS · event code <= 15 min -> Lambda (limits: Session 9)
          upload code, stack built for you -> Beanstalk · queues of long jobs -> Batch
EC2       general · compute (batch, transcoding) · memory (in-memory DB) · storage (local I/O)
          accelerated (GPU) · T: credits; T3/T3a/T4g/T8i start unlimited (surplus billed)
          hibernate: enable at launch, RAM < 150 GiB Linux, encrypted EBS root
PLACEMENT cluster = 1 AZ, 10 Gbps single flow, HPC + EFA · partition = racks, 7 per AZ
          spread = distinct hardware, 7 running per AZ · (+ precision time)
TENANCY   Dedicated Host = sockets/cores visible, affinity, BYOL · Dedicated Instance = isolation
BUY       Compute SP up to 66% (any family/Region, Fargate, Lambda) · EC2 Instance SP up to 72%
          Standard RI 72% sell · Convertible RI 66% exchange · Spot up to 90%, 2-min notice
          capacity: ODCR (1 AZ, no term, no discount) · zonal RI · SP and Regional RI = none
ASG       launch template · EC2 checks default, ELB checks opt-in · grace 300 s console / 0 CLI
          target tracking (thermostat) · step · simple + 300 s cooldown · scheduled
          predictive: 24 h data, 48 h forecast, never scales in · SQS: backlog per instance
          slow boot -> warm pool / launch lifecycle hook (1 h default)
MIXED     On-Demand base, then % above base, rest Spot, round up to On-Demand · Capacity Rebalancing
ELB       ALB L7 host/path/header, Lambda targets, 2+ AZs · NLB L4 TCP/UDP/TLS, client IP,
          static IP per AZ, ALB target · GWLB appliances, GENEVE 6081 · CLB = previous gen
          cross-zone: ALB on (off per TG) · NLB/GWLB off · TLS to targets: NLB TCP 443
CONTAINER task execution role = agent (ECR pull, logs, secrets) · task role = your code
          Fargate: no GPU, no privileged, no DaemonSet, IP targets, 20-200 GiB ephemeral
BEANSTALK all at once (downtime) · rolling (less capacity) · + batch (full) · immutable
          (new ASG, quick rollback) · traffic splitting (canary) · blue/green = swap URLs
NEVER: GA for a slow scale-out · NLB for paths · Fargate for GPUs · Lambda > 15 min ·
       Savings Plan for capacity · cluster PG for availability · launch configurations`,

    compare: [
      { id: 'dhost-dinst', short: 'Host · Instance', title: 'Dedicated Host vs Dedicated Instance',
        sides: [{ name: 'Dedicated Host', line: 'ec2', fig: { dir: 'one', left: 'LICENCE', right: 'HOST', keep: true }, gist: 'A **physical server** for your use: you see its **sockets and cores**, place instances on it, and keep them there after a stop (**affinity**). Built for **server-bound licences**.' }, { name: 'Dedicated Instance', line: 'ec2', fig: { dir: 'one', left: 'VM', right: 'HW' }, gist: 'An instance on **hardware dedicated to your account**, isolated from other customers — but no visibility of sockets or cores and no control over which host.' }],
        rows: [['Billing', 'per host', 'per instance'], ['Sockets and cores', 'visible', 'not visible'], ['Placement', 'targeted, with host affinity', 'none — EC2 places it'], ['Shares hardware with', 'nobody', 'possibly your own non-dedicated instances'], ['Deciding words', 'per-socket, per-core or per-VM licence; same host after restart', 'must not share hardware with other customers'], ['Tempting wrong', 'when only isolation is asked', 'for a licence counted by sockets']],
        check: { q: '“A database licence is counted per physical core, and the instance must stay on the same server after a stop.” Which tenancy fits?', opts: ['Dedicated Host', 'Dedicated Instance'], a: 0, why: 'Core visibility and affinity are Dedicated Host features; Dedicated Instances show neither.' } },
      { id: 'cluster-spread', short: 'Cluster · Spread', title: 'Cluster vs spread placement groups (and partition)',
        sides: [{ name: 'Cluster placement group', line: 'ec2', fig: { dir: 'one', left: 'NODES', right: '1 AZ', keep: true }, gist: 'Instances packed close in **one AZ** on a high-bisection-bandwidth segment: up to **10 Gbps single-flow** between them, lowest latency. For **tightly coupled HPC**.' }, { name: 'Spread placement group', line: 'ec2', fig: { dir: 'one', left: 'NODES', right: 'RACKS' }, gist: 'Each instance on **distinct hardware** (own rack, network, power), across AZs if you like — at most **7 running instances per AZ**. For a **few critical** instances.' }],
        rows: [['Goal', 'performance', 'availability of each instance'], ['AZs', 'one only', 'one or several'], ['Size', 'limited by capacity in that AZ', '7 running instances per AZ per group'], ['Partition instead', 'Partition placement group: groups of instances on racks that share nothing, up to 7 partitions per AZ, any number of instances — HDFS, HBase, Cassandra, with the partition visible to the application.'], ['Deciding words', 'tightly coupled, MPI, lowest latency, 10 Gbps, EFA', 'small number of critical instances, must not fail together'], ['Tempting wrong', 'for availability (one AZ, close together)', 'for a 300-node cluster']],
        check: { q: '“Five licence servers must never fail together because of one rack.” Which placement group fits?', opts: ['Cluster placement group', 'Spread placement group'], a: 1, why: 'A few critical instances on distinct hardware = spread. A cluster group packs them together.' } },
      { id: 'sp-ri', short: 'Savings Plan · RI', title: 'Compute Savings Plan vs Standard Reserved Instance',
        sides: [{ name: 'Compute Savings Plan', line: 'buy', fig: { dir: 'one', left: '$/HOUR', right: 'ANY', keep: true }, gist: 'Commit to **$/hour for 1 or 3 years**; up to **66%** off, applied to **any** family, size, Region, OS and tenancy — **and to Fargate and Lambda**.' }, { name: 'Standard Reserved Instance', line: 'buy', fig: { dir: 'one', left: 'TYPE', right: '1 FAMILY' }, gist: 'One instance configuration for 1 or 3 years; up to **72%** off; **can be sold** in the RI Marketplace, **cannot be exchanged**. A **zonal** RI also reserves capacity.' }],
        rows: [['Flexibility', 'family, size, Region, OS, tenancy, compute service', 'some attributes can be modified; no exchange'], ['Discount', 'up to 66%', 'up to 72%'], ['Reserves capacity', 'no', 'zonal RI: yes, in one AZ · Regional RI: no'], ['Same discount, other shape', 'EC2 Instance Savings Plan: up to 72% for one family in one Region, any size, OS, tenancy', 'Convertible RI: up to 66%, can be exchanged, cannot be sold'], ['Deciding words', 'workload will change family, Region or move to Fargate or Lambda', 'fixed instance type for the term, resale wanted'], ['Tempting wrong', 'when the deepest discount for one fixed family is asked', 'for a workload moving to containers']],
        check: { q: '“EC2 workloads will move to ECS on Fargate during the next year, and the company commits for three years.” Which commitment keeps the discount after the move?', opts: ['Compute Savings Plan', 'Standard Reserved Instance'], a: 0, why: 'Compute Savings Plans also apply to Fargate and Lambda; a Standard RI covers only its EC2 instances.' } },
      { id: 'dynamic-predictive', short: 'Tracking · Predictive', title: 'Target tracking vs predictive scaling',
        sides: [{ name: 'Target tracking', line: 'asg', fig: { dir: 'one', left: 'METRIC', right: 'TARGET', keep: true }, gist: 'Pick a **metric and a target** (CPU at 50%, requests per target); Auto Scaling creates the alarms and adds or removes instances to hold it — **like a thermostat**. Reacts to what is happening.' }, { name: 'Predictive scaling', line: 'asg', fig: { dir: 'one', left: '14 DAYS', right: '48 H' }, gist: 'Learns from up to **14 days** of history (at least **24 hours**) and launches capacity **ahead** of a recurring pattern, hour by hour for the next **48 hours**. It **never scales in**.' }],
        rows: [['Acts on', 'the current metric', 'a forecast of the metric'], ['Needs', 'a metric that follows the load', 'at least 24 hours of history; recurring daily or weekly patterns'], ['Scales in', 'yes', 'no — pair it with a dynamic policy'], ['Scheduled instead', 'Scheduled actions: a clock you set (a fixed 08:00 start, a known event date) — no history needed.'], ['Deciding words', 'keep CPU near, maintain, unpredictable load', 'recurring pattern, launch before the morning peak, slow boot'], ['Tempting wrong', 'when instances boot too slowly for a daily surge', 'as the only policy (nothing scales in)']],
        check: { q: '“Traffic doubles every weekday at 09:00 and instances need 10 minutes to boot; the group has six weeks of history.” Which policy launches the capacity ahead of time?', opts: ['Target tracking', 'Predictive scaling'], a: 1, why: 'A recurring pattern with history = predictive scaling, which launches before the surge; keep target tracking beside it to scale in.' } },
      { id: 'alb-nlb', short: 'ALB · NLB', title: 'Application Load Balancer vs Network Load Balancer',
        sides: [{ name: 'Application Load Balancer', line: 'elb', fig: { dir: 'one', left: 'HTTP', right: 'RULES', keep: true }, gist: '**Layer 7**: reads the request and routes by **host, path, header**; HTTPS, HTTP/2, WebSockets; targets instances, IPs and **Lambda**; authenticates users.' }, { name: 'Network Load Balancer', line: 'elb', fig: { dir: 'one', left: 'TCP/UDP', right: 'TARGET' }, gist: '**Layer 4**: TCP, UDP, TLS; keeps the **client IP**; one **static IP per AZ** (Elastic IP optional); targets instances, IPs and an **ALB**.' }],
        rows: [['Routes by', 'host, path, HTTP header', 'protocol and port (flow hash) — not by path or host'], ['Static IP', 'no (DNS name only)', 'one per AZ, Elastic IP optional'], ['Protocols', 'HTTP, HTTPS, gRPC, WebSockets', 'TCP, UDP, TLS, TCP_UDP, QUIC'], ['Cross-zone', 'always on at the load balancer (off per target group possible)', 'off by default'], ['Together', 'NLB with an ALB-type target group = static IPs in front of path routing'], ['Tempting wrong', 'for UDP or allow-listed static IPs', 'for /api and /images to different services (your Q43)']],
        check: { q: '“A multiplayer game uses UDP on port 7777 and the servers must see each player’s IP address.” Which load balancer fits?', opts: ['Application Load Balancer', 'Network Load Balancer'], a: 1, why: 'UDP and client IP preservation are layer 4 NLB features; an ALB speaks HTTP.' } },
      { id: 'ecs-eks', short: 'ECS · EKS', title: 'Amazon ECS vs Amazon EKS',
        sides: [{ name: 'Amazon ECS', line: 'ecs', fig: { dir: 'one', left: 'TASK', right: 'SERVICE', keep: true }, gist: '**AWS’s own orchestrator**: task definitions and services, deep AWS integration, nothing to upgrade in the control plane. The least-ops container answer.' }, { name: 'Amazon EKS', line: 'eks', fig: { dir: 'one', left: 'PODS', right: 'K8S' }, gist: '**Managed Kubernetes**: your manifests, Helm charts and Kubernetes tools unchanged; pods on node groups, EKS Auto Mode or Fargate.' }],
        rows: [['API', 'ECS task definitions, services', 'the Kubernetes API'], ['Runs on', 'Fargate, Fargate Spot, EC2 Auto Scaling groups, Managed Instances', 'node groups, EKS Auto Mode, Fargate (no Fargate Spot)'], ['Upgrades', 'none for the control plane', 'Kubernetes versions to keep up with'], ['Deciding words', 'containers, least operational overhead, AWS-native', 'existing Kubernetes, Helm, portability, Kubernetes skills'], ['Tempting wrong', 'when the stem names Kubernetes manifests', 'when nothing mentions Kubernetes and least ops is asked']],
        check: { q: '“The team has 40 Helm charts from its on-premises Kubernetes cluster and wants to keep them.” Which service fits?', opts: ['Amazon ECS', 'Amazon EKS'], a: 1, why: 'Helm charts and Kubernetes manifests run on EKS unchanged; ECS would need a rewrite to task definitions.' } },
      { id: 'lambda-fargate', short: 'Lambda · Fargate', title: 'Lambda vs a Fargate task',
        sides: [{ name: 'AWS Lambda', line: 'lambda', fig: { dir: 'one', left: 'EVENT', right: '15 MIN' }, gist: 'A function per event, up to **15 minutes**, zip or container image up to **10 GB**; scales with requests, nothing to pay while idle. Limits in Session 9.' }, { name: 'Fargate task', line: 'ecs', fig: { dir: 'one', left: 'IMAGE', right: 'TASK', keep: true }, gist: 'A container that runs **as long as it needs**, sized from 0.25 vCPU up to 32 vCPU; started by a service, a schedule or an event. No servers either.' }],
        rows: [['Runs for', 'up to 15 minutes', 'as long as the process runs'], ['Package', 'zip or container image (up to 10 GB)', 'container image'], ['Idle cost', 'none', 'none for a task that has ended; a service’s tasks run all the time'], ['Deciding words', 'short, per event, spiky, pay per use', 'longer than 15 minutes, long-running process, existing container'], ['Tempting wrong', 'for a 40-minute transform', 'for a 200 ms function called a few times an hour']],
        check: { q: '“Each uploaded video needs a 40-minute transcode, and nobody wants to manage servers.” Which runs it?', opts: ['AWS Lambda', 'Fargate task'], a: 1, why: 'Lambda stops at 15 minutes; a Fargate task runs until the transcode ends, with no servers.' } },
      { id: 'batch-lambda', short: 'Batch · Lambda', title: 'AWS Batch vs Lambda for jobs',
        sides: [{ name: 'AWS Batch', line: 'batch', fig: { dir: 'one', left: 'QUEUE', right: 'JOBS', keep: true }, gist: '**Queues of jobs** with priorities, dependencies and retries; Batch scales EC2, Spot or Fargate capacity for them and back down. Jobs may run for hours.' }, { name: 'AWS Lambda', line: 'lambda', fig: { dir: 'one', left: 'EVENT', right: 'FN' }, gist: '**One function per event**, up to 15 minutes, scaled per request.' }],
        rows: [['Unit of work', 'a job (container) that runs to completion', 'an invocation'], ['Duration', 'minutes to hours', 'up to 15 minutes'], ['Capacity', 'compute environments: EC2 On-Demand or Spot, Fargate, EKS', 'managed by Lambda'], ['Extras', 'job queues, priorities, dependencies, multi-node parallel jobs', 'event sources, destinations'], ['Deciding words', 'batch jobs, hours, thousands, dependencies, HPC, Spot', 'event-driven, short, per request'], ['Tempting wrong', 'for a 2-second image thumbnail on each upload', 'for a 3-hour simulation']],
        check: { q: '“Ten thousand genome-alignment jobs each run for 2 hours, some depend on others, and Spot is allowed.” Which service runs them?', opts: ['AWS Batch', 'AWS Lambda'], a: 0, why: 'Hours-long jobs with dependencies on Spot capacity = Batch; Lambda stops at 15 minutes.' } }
    ],

    traps: [
      { title: 'Global Accelerator or a second Region for a scaling problem', x: 'Prestige distractor, your pattern. Users in one Region who get errors while instances boot have a scaling problem: target tracking, a warm pool, scaling ahead of the peak. A global network path or a second Region adds cost and changes nothing.', drills: ['C2'] },
      { title: 'An NLB for path or host routing', x: 'Your baseline Q43. An NLB works at layer 4 and cannot read the URL. /api to one service and /images to another, or a host name per service, is an ALB listener rule.', drills: ['C1', 'C20'] },
      { title: 'An ALB when static IPs or UDP are required', x: 'An ALB has a DNS name, no static IP, and speaks HTTP. Allow-listed IPs or UDP = NLB (an ALB-type target group behind it keeps path routing).', drills: ['C3', 'C20', 'C21'] },
      { title: 'Expecting the group to replace instances the load balancer marks unhealthy', x: 'An Auto Scaling group uses EC2 status checks by default. An instance that runs but fails requests stays in service until ELB health checks are turned on for the group.', drills: ['C18'] },
      { title: 'Scheduled scaling for a spike nobody can predict', x: 'A schedule is a clock. Unpredictable spikes need a dynamic policy (and a warm pool if boots are slow); predictive scaling needs a recurring pattern and never scales in.', drills: ['C16', 'C19'] },
      { title: 'A Savings Plan taken for a capacity guarantee', x: 'Savings Plans and Regional RIs change the bill, not the capacity. Guaranteed instances in one AZ = an On-Demand Capacity Reservation (combine it with a Savings Plan for the discount).', drills: ['C12'] },
      { title: 'A family-bound commitment for a workload that will change', x: 'EC2 Instance Savings Plans and Standard RIs stay with one family (and Region). A move to another family, to Fargate or to Lambda keeps its discount only with a Compute Savings Plan.', drills: ['C11'] },
      { title: 'Spot for work that cannot be interrupted', x: 'Spot can be reclaimed with two minutes’ notice. Use it for work that can checkpoint, retry or be replaced — and keep the baseline that must not stop On-Demand or committed.', drills: ['C13', 'C14'] },
      { title: 'A spread placement group for a large cluster', x: 'Spread groups hold at most seven running instances per AZ. Hundreds of rack-aware nodes = a partition placement group.', drills: ['C8'] },
      { title: 'A cluster placement group “for availability”', x: 'A cluster group packs instances into one AZ for latency and bandwidth. It is the opposite of spreading risk.', drills: ['C7'] },
      { title: 'Fargate for GPUs, privileged containers or DaemonSets', x: 'Fargate offers none of them. GPU and host-level needs run on EC2 capacity (an Auto Scaling group capacity provider or node group).', drills: ['C5', 'C26'] },
      { title: 'Task execution role vs task role', x: 'The execution role is for the agent: pull the image, write logs, fetch secrets. What your code calls (DynamoDB, S3, SQS) belongs on the task role.', drills: ['C27'] },
      { title: 'Lambda for a job longer than 15 minutes', x: 'The 15-minute timeout is fixed. A long transform is a Fargate task or a Batch job; everything else about Lambda limits is in Session 9.', drills: ['C28', 'C30'] },
      { title: 'All at once or rolling when capacity must not drop', x: 'All at once takes every instance out; rolling takes a batch out. Full capacity: rolling with additional batch, immutable, or blue/green — and immutable or blue/green for the fastest rollback.', drills: ['C29'] },
      { title: 'Building the batch platform yourself', x: 'An SQS queue, a worker Auto Scaling group and a retry script are what AWS Batch already is: job queues, dependencies, retries and a compute environment it scales, Spot included.', drills: ['C30'] },
      { title: 'A launch configuration in a new design', x: 'Launch configurations get no new instance types and new accounts cannot create them. Mixed instance types, Spot and versions need a launch template.', drills: ['C19'] }
    ],

    log: [
      { when: '2 Sept 2026', what: 'Baseline practice exam, compute and load-balancing items', result: 'Q43 path/host-based routing → ALB missed (K); prestige distractors (Global Accelerator twice, Transit Gateway) across the exam', lesson: 'Q43: “path-based” and “host-based routing” are ALB words; an NLB works on ports, Route 53 on names. Prestige: a global or network service is right only when the scenario states its need. Trained in drills C1–C3.' },
      { when: '—', what: 'Session 10 quiz', result: 'not taken yet', lesson: 'Run all 30 scenarios once. Misses are tagged in “Where it broke” and show up in Progress.' }
    ]
  });
})();
