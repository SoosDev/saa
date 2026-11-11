/* Session 10 — the lesson. 12 chapters. Facts: docs/session-10-compute.md (verified 2026-11-11 via AWS MCP).
   Lesson checkpoints render in authored order; their correct option is spread first 7 · second 7 · third 7. */
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
      root: { q: 'What kind of work is it?', opts: [
        { label: 'A service that runs all the time', sub: 'web apps, APIs, game servers, workers', next: 'svc' },
        { label: 'Jobs that start and end', sub: 'nightly batches, simulations, renders, transcodes', next: 'job' },
        { label: 'Code that reacts to an event', sub: 'an upload, a message, an API call', next: 'evt' },
        { label: 'An existing web app you want deployed for you', sub: 'upload the code, get the load balancer and scaling', next: 'paas' }] },
      svc: { q: 'What does it need from the platform?', opts: [
        { label: 'The operating system', sub: 'host agents, kernel modules, licences per server', next: 'ec2' },
        { label: 'Containers, with no servers to look after', next: 'fargate' },
        { label: 'Containers with GPUs, privileged mode or host access', next: 'ecsec2' },
        { label: 'Kubernetes: manifests, Helm charts, kubectl', next: 'eks' }] },
      job: { q: 'How long does each run take, and how many are there?', opts: [
        { label: 'Under 15 minutes, one run per event', next: 'lambda' },
        { label: 'Minutes to hours, thousands of them, some depending on others', next: 'batch' }] },
      evt: { q: 'How long does the code run for each event?', opts: [
        { label: 'Under 15 minutes', next: 'lambda' },
        { label: 'Longer than 15 minutes, or it ships as a long-running container', next: 'fgtask' }] }
    },
    results: {
      ec2: { title: 'EC2 in an Auto Scaling group', line: 'asg', text: 'Instances from a launch template whose AMI carries the agent or module; the group keeps the count and replaces failures across AZs.', whyNot: [['Fargate', 'no host access, no privileged containers'], ['Lambda', 'no OS, 15-minute limit']] },
      fargate: { title: 'ECS service on AWS Fargate', line: 'ecs', text: 'A task definition, a service with a desired count, tasks as IP targets behind an ALB, service auto scaling — and no instances.', update: 'App Runner, once the simplest image-to-URL service, takes no new customers from 30 April 2026. AWS points to **ECS Express Mode**, which builds the ECS service, ALB and scaling for you.', whyNot: [['EKS', 'Kubernetes to run when nobody asked for it'], ['EC2 capacity', 'servers to patch again']] },
      ecsec2: { title: 'ECS (or EKS) on EC2 capacity', line: 'ecs', text: 'Keep the orchestrator; run the tasks on an Auto Scaling group capacity provider (or node group) of instances with the GPUs or host access the containers need.', whyNot: [['Fargate', 'no GPUs, no privileged containers']] },
      eks: { title: 'Amazon EKS', line: 'eks', text: 'Managed Kubernetes: manifests, Helm charts and operators unchanged; pods on node groups, EKS Auto Mode or Fargate.', whyNot: [['ECS', 'a rewrite into task definitions']] },
      lambda: { title: 'AWS Lambda', line: 'lambda', text: 'A function per event, up to 15 minutes, nothing to pay while idle. Limits and invocation models: Session 9, chapter 8.', whyNot: [['A Fargate service', 'runs and bills all day for work that takes seconds']] },
      batch: { title: 'AWS Batch', line: 'batch', text: 'Job definitions, job queues with priorities and dependencies, and a compute environment of EC2 On-Demand or Spot, or Fargate, that Batch scales for you.', whyNot: [['Lambda', 'stops at 15 minutes'], ['SQS + your own Auto Scaling group', 'the scheduler is yours to build']] },
      fgtask: { title: 'A Fargate task started by the event', line: 'ecs', text: 'An EventBridge rule (or Step Functions) runs one ECS task on Fargate per event; it runs as long as it needs and then stops.', whyNot: [['Lambda', 'the 15-minute timeout is fixed']] },
      paas: { title: 'AWS Elastic Beanstalk', line: 'paas', text: 'Upload the code; Beanstalk creates the load balancer, Auto Scaling group and instances, and deploys new versions with the policy you choose. No additional charge.', whyNot: [['Building it by hand', 'every resource is yours to wire and update']] }
    }
  };

  const BUY = {
    start: 'root',
    nodes: {
      root: { q: 'Can the work be interrupted and then resumed or retried?', opts: [
        { label: 'Yes — it checkpoints, or a failed piece is simply run again', next: 'spot' },
        { label: 'No — it must keep running once it starts', next: 'run' }] },
      run: { q: 'How will it run over the next one to three years?', opts: [
        { label: 'All the time: a steady baseline', next: 'steady' },
        { label: 'Only for a known event or window', next: 'event' },
        { label: 'Unpredictably, or nobody knows yet', next: 'od' }] },
      steady: { q: 'Will the instance family, Region or compute service change?', opts: [
        { label: 'It may: other families, other Regions, Fargate or Lambda', next: 'csp' },
        { label: 'No: one family in one Region for the whole term', next: 'isp' },
        { label: 'The licence is counted per socket or core on a physical server', next: 'dh' }] },
      event: { q: 'Must the capacity be guaranteed?', opts: [
        { label: 'Yes: these instances in this AZ must start when needed', next: 'odcr' },
        { label: 'Yes: GPU instances for ML training in a future window', next: 'cb' },
        { label: 'No: any capacity that is there will do', next: 'od' }] }
    },
    results: {
      spot: { title: 'Spot Instances', line: 'buy', text: 'Up to 90% off On-Demand. EC2 can reclaim them with a two-minute notice, so spread them over several instance types and AZs and let a group or Batch replace what is lost.', whyNot: [['A Savings Plan', 'a commitment for every hour, even when nothing runs'], ['On-Demand', 'the full price for work that tolerates interruption']] },
      od: { title: 'On-Demand', line: 'buy', text: 'Pay as you go with no commitment — the right answer when usage is unknown or temporary. Commit later, once a steady baseline shows.', whyNot: [['A three-year commitment', 'for usage nobody can predict']] },
      csp: { title: 'Compute Savings Plan', line: 'buy', text: 'Commit to an hourly spend for 1 or 3 years; up to 66% off, for any family, size, Region, OS or tenancy, and for Fargate and Lambda.', whyNot: [['EC2 Instance Savings Plan', 'one family in one Region'], ['Standard RI', 'one configuration, no exchange']] },
      isp: { title: 'EC2 Instance Savings Plan', line: 'buy', text: 'Up to 72% off for one instance family in one Region, any size, OS or tenancy. A Standard RI gives a similar discount for a fixed configuration.', whyNot: [['Compute Savings Plan', 'a smaller discount for flexibility you will not use']] },
      dh: { title: 'Dedicated Host', line: 'ec2', text: 'A physical server with its sockets and cores visible and host affinity, for server-bound licences. Pay On-Demand or with a Dedicated Host Reservation or Savings Plan.', whyNot: [['Dedicated Instances', 'isolated, but no socket or core visibility']] },
      odcr: { title: 'On-Demand Capacity Reservation', line: 'buy', text: 'Capacity held in one AZ for as long as you need it; an immediate-use reservation has no term and can be cancelled at any time. Billed at the On-Demand rate whether used or not — add a Savings Plan or Regional RI for a discount.', update: 'Capacity Reservations can also be **future-dated** now (a commitment duration of at least 14 days for most instance types).', whyNot: [['A Savings Plan or Regional RI', 'a discount, no capacity']] },
      cb: { title: 'Capacity Blocks for ML', line: 'buy', text: 'GPU instances reserved for a defined period that starts on a future date — for training, fine-tuning and short experiments.', update: 'Capacity Blocks are newer than the exam guide; banks answer GPU capacity with an On-Demand Capacity Reservation.', whyNot: [['Spot', 'can be reclaimed mid-training']] }
    }
  };

  const LB = {
    start: 'root',
    nodes: {
      root: { q: 'What does the traffic look like?', opts: [
        { label: 'HTTP or HTTPS requests', sub: 'web apps, APIs, gRPC, WebSockets', next: 'http' },
        { label: 'TCP, UDP or TLS connections', sub: 'games, IoT, financial protocols, allow-listed IPs', next: 'nlb' },
        { label: 'All traffic must pass through third-party appliances', sub: 'firewalls, IDS/IPS from a vendor', next: 'gwlb' }] },
      http: { q: 'What else is required?', opts: [
        { label: 'Routing by path, host or header; Lambda targets; user sign-in', next: 'alb' },
        { label: 'Fixed IP addresses as well as path routing', next: 'nlbalb' }] }
    },
    results: {
      alb: { title: 'Application Load Balancer', line: 'elb', text: 'Layer 7 listener rules by host, path or HTTP header; targets instances, IPs or Lambda; at least two AZs; cross-zone always on.', whyNot: [['NLB', 'layer 4: cannot route by URL path or host name'], ['Route 53', 'DNS sees names, never paths']] },
      nlb: { title: 'Network Load Balancer', line: 'elb', text: 'Layer 4 for TCP, UDP and TLS; the client source IP is kept; one static IP per AZ, with an Elastic IP if you choose. Cross-zone is off by default.', whyNot: [['ALB', 'HTTP only, no static IPs']] },
      gwlb: { title: 'Gateway Load Balancer', line: 'elb', text: 'Sends traffic through a fleet of appliances that speak GENEVE (port 6081), health-checks and scales them; endpoints sit in your route tables (Session 3).', whyNot: [['NLB', 'not a transparent inspection hop'], ['Network Firewall', 'an AWS firewall, not the vendor’s appliance']] },
      nlbalb: { title: 'NLB in front of an ALB', line: 'elb', text: 'The NLB gives one static IP per AZ; its ALB-type target group hands every connection to an ALB that routes by path and host.', whyNot: [['ALB with Elastic IPs', 'an ALB cannot take Elastic IPs']] }
    }
  };

  S.learn = [
    /* ---------------------------------------------------------------- 1 */
    { id: 'ch1', title: 'How to read a compute question', domains: 'D2 D3 D4', blocks: [
      'You run EC2, ALBs and ECS at work, so this session does not teach you how to launch an instance. It is the **comparison layer**: the exam rarely asks how a service works, it asks **which one fits** — EC2 or Fargate, an NLB or an ALB, a Savings Plan or Spot, target tracking or a schedule. Every option is a real design that would run. The wrong ones break one stated detail: the protocol, how long the code runs, whether it may be interrupted, who patches the servers, or the superlative.',
      { h: 'Your record on this cluster' },
      { table: { head: ['Where', 'What happened', 'What it teaches', 'Tag'], rows: [
        ['baseline **Q43**', 'requests had to go to different services by **path** and **host** — you missed the keyword', '“path-based” or “host-based routing” = **ALB** listener rules', '**K** keyword'],
        ['baseline, six times', 'prestige distractors (a service with no role)', 'here: Global Accelerator or a second Region for a scaling problem; Global Accelerator or Transit Gateway for a static-IP problem in one Region', '**C** confused similar']] } },
      { callout: 'Drill **C1** is Q43 rebuilt with new distractors (an NLB with a listener per service, a Classic Load Balancer, Route 53 weighted records); **C2** and **C3** put prestige options next to a scaling problem and a static-IP problem. Three cards carry the same lessons. All are marked as yours.', kind: 'miss', title: 'Your misses' },
      { h: 'Ask first: how does the load behave, and what does the app need?' },
      'Four questions sort the options before you weigh them:',
      { ol: [
        '**What is the pattern?** Steady around the clock, peaks you can predict, spikes you cannot, jobs that start and end, or work that may be interrupted. The pattern picks the purchase option and the scaling policy.',
        '**What is the traffic?** HTTP and HTTPS (layer 7), TCP or UDP (layer 4), or everything through inline appliances. The traffic picks the load balancer.',
        '**What control does the app need?** The OS (agents, kernel modules, licences per server), containers, Kubernetes, or just code. Control picks EC2, ECS, EKS or Lambda — and kills Fargate for GPUs and Lambda for long runs.',
        '**What is optimised?** Least operational overhead favours Fargate, Beanstalk, Batch and target tracking; most cost-effective favours Spot for what may stop and a commitment for what never does.'] },
      { h: 'The stub for this session' },
      'Session 9’s slots (pattern of movement, delivery, latency) do not separate compute options. This session uses four of its own:',
      { table: { head: ['Slot', 'Ask', 'Values', 'What it kills'], rows: [
        ['PATTERN', 'How does the load behave?', '`steady 24/7` · `predictable peaks` · `spiky` · `short jobs` · `interruptible` · `none stated`', 'Spot for a baseline that must not stop; scheduled scaling for spikes nobody predicts'],
        ['TRAFFIC', 'What reaches the front door?', '`HTTP/HTTPS` · `TCP/UDP` · `inline appliances` · `none stated`', 'NLB for path routing; ALB for UDP or static IPs'],
        ['CONTROL', 'What does the app need from the platform?', '`OS access` · `containers` · `Kubernetes` · `code only` · `none stated`', 'Fargate for GPUs or kernel modules; Lambda for 40-minute jobs; EKS with no Kubernetes'],
        ['SUPERLATIVE', 'What is optimised?', '`cheapest` · `least ops` · `fastest` · `most resilient` · `none stated`', 'servers to patch where Fargate fits; commitments for work that runs a few hours']] } },
      { pre: S.method, label: 'The method' },
      { h: 'Built for — one line each' },
      { hooks: [
        ['EC2', '**a server you control** down to the OS, in the shape (family) you need.'],
        ['Auto Scaling group', '**the right number of healthy instances**, following the load.'],
        ['Savings Plans · RIs', '**a discount** for a commitment; not capacity.'],
        ['Spot', '**spare capacity, up to 90% off**, reclaimed with two minutes’ notice.'],
        ['Capacity Reservation', '**capacity held** in one AZ; not a discount.'],
        ['ALB', '**reads the request**: host, path, header.'],
        ['NLB', '**reads the envelope**: TCP/UDP, static IPs, client IP kept.'],
        ['Gateway Load Balancer', '**inline appliances** at scale (GENEVE).'],
        ['ECS · Fargate', '**containers with no servers**, AWS-native.'],
        ['EKS', '**Kubernetes**, managed.'],
        ['Lambda', '**short code per event**, up to 15 minutes.'],
        ['Elastic Beanstalk', '**upload code, get the stack**.'],
        ['AWS Batch', '**queues of jobs** on capacity it scales.']], label: 'Built for' },
      { h: 'What lives in other sessions' },
      { table: { head: ['Topic', 'Where'], rows: [
        ['Multi-AZ design, static stability, EC2 automatic recovery', '[[../07-ha-dr/#learn/ch3|Session 7, chapter 3]]'],
        ['Every Lambda limit, invocation models, concurrency, API Gateway', '[[../09-serverless/#learn/ch8|Session 9, chapter 8]]'],
        ['Inspection designs around the Gateway Load Balancer', '[[../03-networking/#learn/ch11|Session 3, chapter 11]]'],
        ['ALB vs CloudFront behaviours, and Session 4’s own Q43 drill', '[[../04-global/#learn/ch3|Session 4, chapter 3]]'],
        ['Prices, break-even, sharing commitments, the cost picture', 'Session 12 (not built yet)']] } },
      { h: 'Try it on C1' },
      'Your Q43, rebuilt. Fill TRAFFIC first, then read the options for the one detail each breaks.',
      { callout: S.drills.find(d => d.id === 'C1').q + ' [[#drill/C1|Solve it in the drill →]]', kind: 'note', title: 'Exam Q43' },
      { check: { id: 'ch1-prestige', src: 'Exam pattern', q: 'All of a shop’s customers are in one country, and the shop times out for a few minutes during each flash sale while new instances start. An option adds **AWS Global Accelerator** in front of the ALB. Why do you cross it out?', opts: [
        { t: 'It cannot sit in front of an Application Load Balancer, because it accepts only Network Load Balancers as endpoints.', why: 'false — ALBs, NLBs, EC2 instances and Elastic IPs are all endpoints.' },
        { t: 'It works only across two or more AWS Regions, so a shop that runs in one Region cannot use it.', why: 'false — one Region is fine; it simply adds nothing here.' },
        { t: 'It speeds up the network path for distant users; it adds no instances, so the fleet is still too small in a spike.', why: 'built for global network paths, not for capacity.' }], a: 2,
        why: 'Prestige distractors are real services built for another problem. Time-outs while instances boot are a scaling problem: a dynamic policy, scaling ahead, or a warm pool.' } },
      { check: { id: 'ch1-stub', src: 'Exam Q43', q: 'Requests for **/orders** and **/users** on one HTTPS endpoint must reach different services. Which TRAFFIC value goes in the stub, and which load balancer does it point to?', opts: [
        { t: '`TCP/UDP` — an NLB, because one listener per service can forward each port to the right instances.', why: 'the paths are in the HTTP request; an NLB never reads them.' },
        { t: '`HTTP/HTTPS` — an ALB, because its listener rules read the path of each request and pick a target group.', why: 'path and host routing live at layer 7.' },
        { t: '`inline appliances` — a Gateway Load Balancer, because it inspects every request before it reaches a service.', why: 'GWLB sends traffic through appliances; it does not route by path.' }], a: 1,
        why: 'Q43’s keyword was the path. Paths and host names are HTTP: layer 7, the ALB.' } }
    ] },

    /* ---------------------------------------------------------------- 2 */
    { id: 'ch2', title: 'Choosing: EC2, containers, Lambda, Beanstalk or Batch', domains: 'D2 D3 D4', blocks: [
      'Every compute choice trades **control** against **operational overhead**. EC2 gives you the operating system and with it the patching, the AMIs and the scaling. Containers on Fargate keep your application packaging and drop the servers. Lambda drops even the container you keep running, at the price of a 15-minute ceiling. Elastic Beanstalk and AWS Batch sit beside them: Beanstalk builds an EC2 stack for an application you upload, Batch runs queues of jobs on capacity it scales. Name the control the scenario needs, and the superlative picks among what remains.',
      { table: { head: ['Option', 'You manage', 'Built for', 'Breaks on'], key: true, rows: [
        ['**EC2 + Auto Scaling**', 'OS, AMIs, patches, scaling policies', 'OS access, agents, licences per server, any software', '“no servers to manage”'],
        ['**ECS on Fargate**', 'task definitions and services', 'containers with no servers; the least-ops container answer', 'GPUs, privileged containers, DaemonSets'],
        ['**ECS / EKS on EC2 capacity**', 'the container instances too', 'GPU or host-level containers', '“least operational overhead” when Fargate fits'],
        ['**EKS**', 'Kubernetes versions, add-ons, nodes (unless Auto Mode or Fargate)', 'existing Kubernetes manifests, Helm, kubectl', 'no Kubernetes stated and least ops asked'],
        ['**Lambda**', 'the code', 'short code per event, pay per use', 'runs longer than 15 minutes; needs a GPU or the OS'],
        ['**Elastic Beanstalk**', 'the code and a few settings', 'upload a web app or worker, get ALB + ASG + EC2', 'container-level or Kubernetes control'],
        ['**AWS Batch**', 'job definitions and queues', 'thousands of jobs, hours long, dependencies, Spot', 'a long-running service']] } },
      { h: 'Walk the decision tree' },
      'Follow it with a scenario in mind. Each leaf says why the nearest look-alike loses.',
      { widget: 'chooser', args: { title: 'Which compute?', tree: CHOOSE } },
      { widget: 'sorter', args: { title: 'EC2, containers, Lambda or Batch?', lead: 'Twelve requirements, four families. Decide before you check.', buckets: [{ id: 'ec2', short: 'EC2', label: 'EC2 + Auto Scaling' }, { id: 'ctr', short: 'Containers', label: 'ECS · EKS · Fargate' }, { id: 'fn', short: 'Lambda', label: 'AWS Lambda' }, { id: 'job', short: 'Batch', label: 'AWS Batch' }], items: [
        { t: 'A vendor agent must load a kernel module on every server', b: 'ec2', why: 'only EC2 gives you the kernel.' },
        { t: 'A containerised API, and nobody wants to patch hosts', b: 'ctr', why: 'ECS on Fargate.' },
        { t: 'Resize each uploaded image in about two seconds', b: 'fn', why: 'short, per event.' },
        { t: '8,000 simulations a week, two hours each, some waiting for others', b: 'job', why: 'job queues with dependencies.' },
        { t: 'A database licensed per physical socket', b: 'ec2', why: 'Dedicated Host — an EC2 tenancy.' },
        { t: '60 microservices already deployed with Helm charts', b: 'ctr', why: 'EKS.' },
        { t: 'Run a cleanup each time a message arrives, idle most of the day', b: 'fn', why: 'event-driven, pay per use.' },
        { t: 'Nightly genome alignments on Spot, retried if interrupted', b: 'job', why: 'Batch on a Spot compute environment.' },
        { t: 'Windows Server software that needs Remote Desktop and local admin', b: 'ec2', why: 'OS access.' },
        { t: 'Inference containers that each need a GPU, scheduled by ECS', b: 'ctr', why: 'ECS on GPU EC2 capacity.' },
        { t: 'Validate a form post behind an ALB in under a second', b: 'fn', why: 'an ALB can target a Lambda function.' },
        { t: 'Rendering frames in a queue that must finish by morning', b: 'job', why: 'a Batch job queue (on Spot if cheapest).' }] } },
      { callout: '**App Runner** — older material’s simplest way from a container image to a web URL — “will no longer accept new customers starting on April 30, 2026”; existing services keep running. AWS now recommends **Amazon ECS Express Mode** (November 2025): give it an image and it creates an ECS service with an HTTPS endpoint, an ALB (shared by up to 25 Express services) and scaling, at no additional charge, with every resource editable in your account. If a bank still offers App Runner for “least ops for a containerised web app”, recognise it; today the answer is ECS (Express Mode or Fargate).', kind: 'update' },
      { check: { id: 'ch2-fit', q: 'Which requirement **rules out** ECS on Fargate and points to EC2 capacity instead?', opts: [
        { t: 'Each container needs a GPU, or must run privileged to load a module into the host kernel.', why: 'Fargate offers neither GPUs nor privileged containers.' },
        { t: 'The service must scale from 2 to 40 tasks during the day and register its tasks with an ALB.', why: 'service auto scaling and IP targets work on Fargate.' },
        { t: 'The containers must read secrets from AWS Secrets Manager when each task starts.', why: 'the task execution role fetches secrets on Fargate too.' }], a: 0,
        why: 'Fargate hides the host: no GPUs, no privileged mode, no DaemonSets. Those needs are EC2 capacity under the same orchestrator.' } },
      { check: fromDrill('C4') },
      { check: fromDrill('C5') },
      { drills: ['C4', 'C5'] }
    ] },

    /* ---------------------------------------------------------------- 3 */
    { id: 'ch3', title: 'EC2: families, bursting, tenancy', domains: 'D3 D4', blocks: [
      'Instance types come in **families**, and the exam names the workload, not the family. Read the resource the workload is short of — CPU, RAM, local disk, an accelerator — and the family follows.',
      { table: { head: ['Category', 'Built for (AWS’s own examples)', 'Exam words'], key: true, rows: [
        ['**General purpose**', 'web servers, code repositories, small-to-medium databases', 'balanced, typical web tier'],
        ['**Compute optimized**', 'batch processing, media transcoding, dedicated game servers', 'CPU-bound, high-performance processors'],
        ['**Memory optimized**', 'in-memory databases, data analytics, enterprise applications', 'large data sets in memory, RAM per vCPU'],
        ['**Storage optimized**', 'high sequential read and write access to very large data sets on local storage', 'local NVMe, high IOPS, data streaming'],
        ['**Accelerated computing**', 'hardware accelerators: floating point, graphics, pattern matching', 'GPU, ML training and inference'],
        ['**HPC optimized**', 'complex simulations, deep learning at scale', 'HPC workloads at the best price performance']] } },
      'AWS also builds its own Arm processors, **Graviton**, across these families; a question that asks for better price performance on Linux workloads that can run on Arm is pointing at them.',
      { widget: 'sorter', args: { title: 'Which instance family?', lead: 'Eight workloads. Pick the category built for each.', buckets: [{ id: 'gen', short: 'General', label: 'General purpose' }, { id: 'cpu', short: 'Compute', label: 'Compute optimized' }, { id: 'mem', short: 'Memory', label: 'Memory optimized' }, { id: 'sto', short: 'Storage', label: 'Storage optimized' }, { id: 'acc', short: 'GPU', label: 'Accelerated computing' }], items: [
        { t: 'A company website and its small MySQL database', b: 'gen', why: 'balanced.' },
        { t: 'A Git server and a team wiki', b: 'gen', why: 'code repositories, a balanced load.' },
        { t: 'Transcoding thousands of videos to several formats', b: 'cpu', why: 'media transcoding.' },
        { t: 'A 500 GiB in-memory cache for a trading platform', b: 'mem', why: 'data held in RAM.' },
        { t: 'A self-managed database reading terabytes from local NVMe disks', b: 'sto', why: 'heavy I/O on local storage.' },
        { t: 'Training a deep learning model on GPUs', b: 'acc', why: 'accelerators.' },
        { t: 'Dedicated servers for a multiplayer game', b: 'cpu', why: 'AWS lists game servers here.' },
        { t: 'Real-time analytics on a large data set held in memory', b: 'mem', why: 'memory optimized.' }] } },
      { h: 'Burstable instances and CPU credits' },
      'The **T** family runs at a **baseline** CPU level. Below the baseline an instance **earns** CPU credits; above it, it **spends** them. In **standard** mode, when the banked credits are gone the instance comes back down to the baseline and cannot burst until it earns more. In **unlimited** mode it keeps bursting by spending **surplus** credits; if its average CPU over 24 hours is above the baseline, you pay for the surplus at a flat rate per vCPU-hour.',
      { callout: 'Banks teach that a T instance “throttles when it runs out of credits”. Today **T3, T3a, T4g and T8i launch in unlimited mode by default**, so they keep bursting and you are billed for surplus credits instead. A T3 on a Dedicated Host is the exception (standard only), and AWS recommends standard mode for Spot T instances. The exam-day reading stays the same: a T instance pegged at 100% all day is the wrong family.', kind: 'update' },
      { check: { id: 'ch3-burst', q: 'A t3.large has run at 90% CPU around the clock for a week in its **default** credit mode. What happens?', opts: [
        { t: 'It ran out of credits on the first day and has been held at its baseline ever since, so requests queue up.', why: 'that is standard mode; T3 launches unlimited by default.' },
        { t: 'It was stopped by EC2 once its credit balance reached zero, and must be started again by hand.', why: 'EC2 never stops an instance for credits.' },
        { t: 'It keeps bursting on surplus credits, billed because its 24-hour average is above the baseline.', why: 'unlimited mode: performance kept, surplus billed.' }], a: 2,
        why: 'Unlimited is the T3 default. A workload that sits above baseline all day pays surplus charges and belongs on a fixed-performance family.' } },
      { h: 'Stop, terminate or hibernate' },
      '**Hibernation** saves the contents of RAM to the instance’s **EBS root volume** and stops the instance; on start the RAM is reloaded, processes resume and the instance keeps its ID. You pay for the EBS storage, not for instance usage while it is hibernated. It is how an instance with a long warm-up keeps its memory across a stop. The rules that decide questions: it must be **enabled at launch** (not on an existing instance), the root volume must be EBS and **encrypted**, Linux RAM must be **under 150 GiB** (Windows 16 GiB or less), and bare metal instances are not supported.',
      { check: { id: 'ch3-hib', q: 'An analytics server takes 20 minutes to load its caches into RAM after every start. The team stops it every night. Which change keeps the caches across the nightly stop?', opts: [
        { t: 'Turn on hibernation for the running instance now, and choose Hibernate instead of Stop each night.', why: 'hibernation cannot be enabled on an existing instance.' },
        { t: 'Launch a new instance with hibernation and an encrypted EBS root volume, and hibernate it each night.', why: 'enabled at launch, encrypted root: RAM saved and reloaded.' },
        { t: 'Move the caches to the instance store, which keeps its data when the instance is stopped and started.', why: 'instance store data is lost on stop.' }], a: 1,
        why: 'Hibernation keeps RAM on the encrypted EBS root volume — and it is chosen at launch.' } },
      { h: 'Tenancy: shared, Dedicated Instance, Dedicated Host' },
      'By default instances share hardware with other customers’ instances (isolated by the hypervisor). **Dedicated Instances** run on hardware dedicated to your account — physically isolated from other customers — but you cannot see or choose the server. **Dedicated Hosts** give you the **physical server**: you see its **sockets and physical cores**, place instances on it, and with **affinity** an instance comes back to the same host after a stop. That is what **server-bound licences** need (per socket, per core or per VM, such as Windows Server or SQL Server under your own licence). Hosts are billed per host, Dedicated Instances per instance.',
      { pair: 'dhost-dinst' },
      { check: fromDrill('C6') },
      { check: fromDrill('C9') },
      { drills: ['C6', 'C9'] }
    ] },

    /* ---------------------------------------------------------------- 4 */
    { id: 'ch4', title: 'Placement groups', domains: 'D2 D3', blocks: [
      'Without a placement group EC2 decides where your instances land. A placement group states what you want instead: **close together**, **apart**, or **apart in groups**.',
      { table: { head: ['Strategy', 'Where instances go', 'Limits that decide questions', 'Built for'], key: true, rows: [
        ['**Cluster**', 'close together in **one AZ**, on a high-bisection-bandwidth segment', 'cannot span AZs; up to **10 Gbps single-flow** between members (5 Gbps outside a cluster group); T instances not supported', 'tightly coupled HPC, MPI, lowest latency'],
        ['**Partition**', 'groups (partitions) on racks that **share nothing**', 'at most **7 partitions per AZ**; instances limited only by the account; can span AZs', 'large distributed, replicated systems: HDFS, HBase, Cassandra'],
        ['**Spread**', 'each instance on **distinct hardware** (own rack, network, power)', 'at most **7 running instances per AZ** (21 in a three-AZ Region); an eighth does not launch', 'a few critical instances that must not fail together']] } },
      'Three details turn up in questions. A **cluster** group is about performance, never availability: everything sits in one AZ. Launch it in **one request with one instance type** to avoid capacity errors, and if capacity must be guaranteed inside it, use an **On-Demand Capacity Reservation** (zonal Reserved Instances cannot reserve capacity in a placement group). A **partition** group tells the application which partition each instance is in, so a topology-aware database places replicas on different racks. A **spread** group stops at seven running instances per AZ — beyond that, AWS suggests several spread groups.',
      { h: 'Elastic Fabric Adapter' },
      'For MPI jobs the network itself is the bottleneck. An **Elastic Fabric Adapter (EFA)** is a network device with **OS-bypass**: the application talks to the network interface without the operating system on every message, for lower and more consistent latency. AWS recommends running EFA instances in a placement group in one AZ, and EFA does not work across AZs. “Tightly coupled HPC” in a stem = **cluster placement group + EFA**.',
      { pair: 'cluster-spread' },
      { callout: 'Older material lists **three** strategies. EC2 now has a fourth: **precision time** placement groups, which put instances on hardware with direct access to high-precision time sources (the enhanced Amazon Time Sync Service and, on Linux, a PTP hardware clock) for microsecond-accurate clocks, at no additional charge. A cluster group can name one as its parent. Banks will not test it yet.', kind: 'update' },
      { check: { id: 'ch4-spread', q: 'A team wants **twelve** instances in one AZ, each on distinct hardware, in a single spread placement group. What happens?', opts: [
        { t: 'Seven instances launch and the eighth fails, because a spread group allows seven running per AZ.', why: 'the limit is seven per AZ per group.' },
        { t: 'All twelve launch, but EC2 places pairs of them on shared racks once the seventh rack is in use.', why: 'a spread group never shares hardware; it refuses the launch.' },
        { t: 'All twelve launch on distinct racks, because spread groups are limited only by the account’s quotas.', why: 'that is the partition group’s rule, not the spread group’s.' }], a: 0,
        why: 'Seven running instances per AZ per spread group. Use more groups, more AZs, or a partition group for large fleets.' } },
      { check: fromDrill('C7') },
      { check: fromDrill('C8') },
      { drills: ['C7', 'C8'] }
    ] },

    /* ---------------------------------------------------------------- 5 */
    { id: 'ch5', title: 'Purchase options: which one fits this workload', domains: 'D4', blocks: [
      'Purchase questions ask two separate things, and AWS’s own decision guide says they are “often confused but are independent”: **how the bill is calculated** (On-Demand, Savings Plans, Reserved Instances, Spot) and **whether capacity is held for you** (Capacity Reservations). Read which of the two the stem asks for before you read the discounts.',
      { callout: 'Prices, break-even points, sharing commitments across accounts and the whole cost picture belong to Session 12. Here you only match the option to the workload.', kind: 'note', title: 'Scope' },
      { table: { head: ['Option', 'Commitment', 'Discount (up to)', 'Holds capacity', 'Fits'], key: true, rows: [
        ['**On-Demand**', 'none', '—', 'no', 'unknown, temporary or spiky usage'],
        ['**Compute Savings Plan**', '$/hour, 1 or 3 years', '66%', 'no', 'steady spend that may change family, Region, or move to Fargate or Lambda'],
        ['**EC2 Instance Savings Plan**', '$/hour, 1 or 3 years, one family in one Region', '72%', 'no', 'steady usage on one family that will not move'],
        ['**Standard Reserved Instance**', '1 or 3 years, one configuration', '72%', 'zonal RI: yes · Regional RI: no', 'fixed configuration; can be sold in the RI Marketplace'],
        ['**Convertible Reserved Instance**', '1 or 3 years', '66%', 'zonal: yes · Regional: no', 'can be exchanged for another family, OS or tenancy; cannot be sold'],
        ['**Spot**', 'none', '90%', 'no — reclaimed with a two-minute notice', 'interruptible, retried, checkpointed work'],
        ['**On-Demand Capacity Reservation**', 'none for immediate use', 'none by itself', '**yes, in one AZ**', 'capacity that must be there: events, DR, regulatory needs'],
        ['**Dedicated Host**', 'On-Demand or reserved', '—', 'the whole server', 'server-bound licences, compliance']] } },
      'Two rules carry most questions. **A discount is not capacity**: Savings Plans and Regional RIs reserve nothing — AWS says plainly that “Savings Plans doesn’t provide capacity reservations” — so a guarantee needs an **On-Demand Capacity Reservation** (or a zonal RI), and the reservation alone is billed at the On-Demand rate whether you use it or not, until you combine it with a Savings Plan or Regional RI for the discount. And **flexibility costs discount**: the Compute Savings Plan follows the spend everywhere, the EC2 Instance Savings Plan pays more for staying in one family and Region. Savings Plans do not apply to Spot usage.',
      { widget: 'chooser', args: { title: 'Which purchase option?', tree: BUY } },
      { pair: 'sp-ri' },
      { check: { id: 'ch5-capacity', q: 'A company buys a three-year Compute Savings Plan “so that our instances are always available when we scale”. What does the plan guarantee?', opts: [
        { t: 'Capacity for the committed hourly spend in every AZ of the Regions where the company runs instances.', why: 'Savings Plans reserve no capacity anywhere.' },
        { t: 'Capacity in one AZ that the company picks when it buys the plan, like a zonal Reserved Instance.', why: 'that is a zonal RI or a Capacity Reservation.' },
        { t: 'Nothing about capacity: it lowers the price of usage up to the commitment; a reservation holds it.', why: 'a discount, not capacity — pair it with a Capacity Reservation.' }], a: 2,
        why: 'Discount and capacity are separate. On-Demand Capacity Reservation for the guarantee; the Savings Plan then discounts what runs in it.' } },
      { check: { id: 'ch5-ri', q: 'A company may need to change instance family halfway through a three-year term and wants to keep a reserved discount. Which Reserved Instance class allows the change?', opts: [
        { t: 'A Standard RI, which can be exchanged for any other family as long as the new one is of equal value.', why: 'Standard RIs cannot be exchanged; they can be sold.' },
        { t: 'A Convertible RI, which can be exchanged during the term for one with a different instance family.', why: 'exchange is the Convertible RI’s feature.' },
        { t: 'A zonal Standard RI, whose AZ and family can both be changed through the RI Marketplace.', why: 'the Marketplace sells RIs; it does not change their family.' }], a: 1,
        why: 'Standard: sell, no exchange. Convertible: exchange, no sale. A Compute Savings Plan avoids the question entirely.' } },
      { callout: 'Banks know **two** Savings Plans types; AWS lists **four** now: Compute (up to 66%), EC2 Instance (up to 72%), **Database Savings Plans** (up to 35% on Aurora, RDS, DynamoDB, ElastiCache and more — Session 12) and SageMaker AI. AWS’s purchasing guide (updated June 2026) also calls Reserved Instances “an older purchasing option that we generally recommend replacing with Savings Plans”; newer instance families may not have RI pricing. Exam questions still offer RIs, and the Standard-vs-Convertible rules above still decide them.', kind: 'update' },
      { callout: 'Capacity has more shapes than the exam guide shows. **Future-dated Capacity Reservations** start on a date you choose and need a commitment duration (at least 14 days for most instance types). **Capacity Blocks for ML** reserve GPU instances for 1 to 182 days starting on a future date, for training and experiments; they cannot be combined with Savings Plans or RI discounts. Banks answer “guaranteed capacity in one AZ” with an On-Demand Capacity Reservation — still correct.', kind: 'update' },
      { check: fromDrill('C10') },
      { check: fromDrill('C11') },
      { check: fromDrill('C12') },
      { drills: ['C10', 'C11', 'C12'] }
    ] },

    /* ---------------------------------------------------------------- 6 */
    { id: 'ch6', title: 'Spot without getting hurt', domains: 'D4 D2', blocks: [
      '**Spot Instances** are spare EC2 capacity at up to 90% off. EC2 can take them back when it needs the capacity, so the exam asks one question about every Spot design: **what happens when an instance is reclaimed?** If the answer is “a piece of work is retried” or “the group launches another”, Spot fits. If the answer is “the customer’s order is lost”, it does not.',
      { h: 'The signals' },
      { ul: [
        '**Rebalance recommendation** — an early signal that a Spot Instance is at elevated risk of interruption. An Auto Scaling group with **Capacity Rebalancing** turned on launches a replacement before the instance is reclaimed.',
        '**Interruption notice** — **two minutes** before a Spot Instance is interrupted, EC2 sends an EventBridge event and puts an item in the instance metadata. Use the time to save state, drain connections and hand the work back.',
        '**Interruption behaviour** — **terminate** (the default), **stop**, or **hibernate**. A lifecycle hook does not stop an interruption.'] },
      { widget: 'stepper', args: { title: 'A Spot interruption, step by step', line: 'buy', steps: [
        { title: 'Rebalance recommendation', text: 'One Spot Instance in a group of render workers is at elevated risk. EC2 sends a rebalance recommendation before any notice.' },
        { title: 'Capacity Rebalancing', text: 'The Auto Scaling group has Capacity Rebalancing on, so it launches a replacement Spot Instance from another pool — another type or AZ — while the old one still runs.' },
        { title: 'Two-minute notice', text: 'EC2 issues the interruption notice: an EventBridge event and an item in the instance metadata. A script on the instance sees it.' },
        { title: 'Drain and checkpoint', text: 'The instance stops taking new frames, deregisters from the load balancer, writes its progress to S3 and returns its unfinished frame to the queue.', note: 'Short tasks and checkpoints are what make Spot safe. Tasks that finish within two minutes are not affected by the notice at all.', noteTitle: 'Why it works' },
        { title: 'Reclaimed, back at desired', text: 'The instance is reclaimed (terminated, the default). The group is already at its desired capacity with the replacement, which picks up the returned frame.' }] } },
      { check: { id: 'ch6-notice', q: 'How much warning does a Spot Instance get before EC2 interrupts it, and where does the warning appear?', opts: [
        { t: 'Two minutes, as an EventBridge event and an item in the instance metadata.', why: 'the documented interruption notice.' },
        { t: 'Thirty minutes, as an email to the account and a banner in the EC2 console.', why: 'no such lead time or channel.' },
        { t: 'None — the instance stops at once, and only CloudTrail records what happened.', why: 'there is always a two-minute notice.' }], a: 0,
        why: 'Two minutes, EventBridge and metadata. The rebalance recommendation can come earlier.' } },
      { h: 'Mixing On-Demand and Spot in one group' },
      'A **mixed instances policy** lets one Auto Scaling group use several instance types and both purchase options. It fills an **On-Demand base capacity** first, then splits everything above the base by an **On-Demand percentage** (0–100); the rest is Spot. Fractions round up in favour of On-Demand. AWS’s example: a base of 10 with 50% above it gives 15 On-Demand and 5 Spot at a size of 20, and 25 and 15 at 40. AWS also recommends being flexible across at least 10 instance types, so the group has many Spot pools to draw from.',
      { widget: 'mixCalc' },
      { check: { id: 'ch6-mix', q: 'A mixed instances group has an On-Demand base of 0 and **60%** On-Demand above the base. At a desired capacity of **10**, how many instances are Spot?', opts: [
        { t: 'Six, because the percentage sets the Spot share once the base is filled.', why: '60% is the On-Demand share, not the Spot share.' },
        { t: 'None, because Spot is used only after the On-Demand base has been filled.', why: 'the base is 0, so the split starts at once.' },
        { t: 'Four: six On-Demand (60% of 10) and the remaining four on Spot.', why: 'the AWS example: 6 On-Demand, 4 Spot.' }], a: 2,
        why: 'Base first, then the On-Demand percentage of the rest; whatever is left is Spot.' } },
      { h: 'Allocation strategies and fleets' },
      'When a request may use many **Spot capacity pools** (each instance type in each AZ), the **allocation strategy** picks among them. AWS recommends **price-capacity-optimized** in most cases: pools with the lowest chance of interruption first, then the cheapest of those. Lowest price is “not recommended”. For fleets of Spot and On-Demand, the recommended tool is an **Auto Scaling group**; **EC2 Fleet** if you manage the lifecycle yourself.',
      { callout: 'Three things older material teaches are gone. **Bidding**: Spot prices “are set by Amazon EC2 and adjusted gradually based on long-term supply and demand trends”; AWS recommends not setting a maximum price at all (the default maximum is the On-Demand price). **Spot blocks** (Spot for a fixed 1–6 hours): not available to new customers since 1 July 2021, and supported for earlier users only until 31 December 2022. **Spot Fleet**: AWS calls it “a legacy API with no planned investment” and strongly discourages it — use an Auto Scaling group or EC2 Fleet. Banks may still offer “capacity-optimized” or a Spot Fleet; recognise them, and reach for an Auto Scaling group with a mixed instances policy.', kind: 'update' },
      { check: fromDrill('C13') },
      { check: fromDrill('C14') },
      { drills: ['C13', 'C14'] }
    ] },

    /* ---------------------------------------------------------------- 7 */
    { id: 'ch7', title: 'Auto Scaling groups', domains: 'D2 D3 D4', blocks: [
      'An **Auto Scaling group** keeps a number of EC2 instances between a **minimum** and a **maximum**, at a **desired capacity** that its scaling policies move. It does two jobs that the exam keeps apart: it **replaces unhealthy instances**, and it **follows the load**. Spreading the group across AZs for resilience is Session 7’s topic — [[../07-ha-dr/#learn/ch3|Session 7, chapter 3]].',
      { h: 'Launch templates' },
      'The group launches instances from a **launch template**: AMI, instance type, security groups, user data, and versions you can roll forward and back. A mixed instances group starts from a launch template too.',
      { callout: 'Older material still builds groups from **launch configurations**. Since 1 January 2023 they support no new instance types; accounts created on or after 1 June 2023 cannot create them in the console, and accounts created on or after 1 October 2024 cannot create them at all. Launch configurations cannot be modified either. A launch template is the answer under old and new material alike.', kind: 'update' },
      { h: 'Health checks and the grace period' },
      'By default a group judges health by **EC2 status checks** (and scheduled events): an instance that is not `running`, or whose status checks are impaired, is replaced. It does **not** look at the load balancer unless you **turn on Elastic Load Balancing health checks** for the group. Then an instance that runs but fails the load balancer’s checks — a crashed application, a memory leak returning errors — is replaced too. The **health check grace period** keeps a new instance from being judged before it is ready: **300 seconds** by default in the console, **0** from the CLI or an SDK; with a launch lifecycle hook you can set it to 0.',
      { check: { id: 'ch7-health', q: 'A group behind an ALB uses its **default** health checks. An instance keeps running but its application returns errors, and the ALB marks it unhealthy. What does the group do?', opts: [
        { t: 'It replaces the instance after the grace period, because the ALB reports every unhealthy target to the group.', why: 'only if ELB health checks are turned on for the group.' },
        { t: 'Nothing: the instance passes its EC2 status checks, so the group keeps it in service until ELB checks are on.', why: 'default = EC2 status checks only.' },
        { t: 'It reboots the instance, because Auto Scaling repairs unhealthy instances in place before replacing them.', why: 'Auto Scaling replaces; it does not reboot.' }], a: 1,
        why: 'The load balancer stops sending traffic, but the group needs ELB health checks turned on to replace the instance.' } },
      { h: 'The scaling policies' },
      { table: { head: ['Policy', 'How it works', 'Use it when'], key: true, rows: [
        ['**Target tracking**', 'you pick a metric and a target (CPU at 50%, requests per target); Auto Scaling creates and manages the CloudWatch alarms, “similar to how a thermostat maintains a target temperature”', 'keep a metric near a value — the default choice'],
        ['**Step scaling**', 'CloudWatch alarms with bands: bigger breach, bigger step', 'you want explicit control of step sizes'],
        ['**Simple scaling**', 'one alarm, one adjustment, then a **cooldown** (default **300 s**) before the next', 'legacy; AWS recommends target tracking or step instead'],
        ['**Scheduled**', 'set min, max or desired at a time you choose, once or recurring', 'a known time: a contract, an event date, office hours'],
        ['**Predictive**', 'forecasts the next **48 hours**, hourly, from up to **14 days** of history (at least **24 hours** needed), refreshed every 6 hours; starts in forecast-only mode', 'recurring daily or weekly patterns with slow boots']] } },
      'Three details decide questions. The **cooldown** holds only simple scaling policies: target tracking and step scaling can scale out at once, and new instances get a **warmup** period instead, during which they do not count in the group’s metrics. **Predictive scaling never scales in** — pair it with a target tracking or step policy that removes capacity. And several target tracking policies on different metrics can run together: the group scales out if any of them asks, and scales in only when all of them agree.',
      { widget: 'sorter', args: { title: 'Which scaling policy?', lead: 'Eight situations. Pick the policy built for each.', buckets: [{ id: 'tt', short: 'Tracking', label: 'Target tracking' }, { id: 'step', short: 'Step', label: 'Step scaling' }, { id: 'sch', short: 'Scheduled', label: 'Scheduled action' }, { id: 'pred', short: 'Predictive', label: 'Predictive scaling' }], items: [
        { t: 'Keep average CPU near 40% with no alarms to manage', b: 'tt', why: 'a metric and a target.' },
        { t: 'Hold ALB requests per target near 1,000 all day', b: 'tt', why: 'target tracking on a load balancer metric.' },
        { t: 'Add 2 instances at 70% CPU and 6 at 90%, exactly as the runbook says', b: 'step', why: 'explicit step sizes per alarm band.' },
        { t: 'Different adjustments for a mild and a severe queue alarm', b: 'step', why: 'alarm bands.' },
        { t: 'Raise capacity at 07:45 every weekday from tomorrow', b: 'sch', why: 'a known time, no history needed.' },
        { t: 'Scale up for a product launch on 3 March at 10:00', b: 'sch', why: 'a one-time scheduled action.' },
        { t: 'Launch ahead of a morning surge seen in six weeks of history', b: 'pred', why: 'a recurring pattern with history.' },
        { t: 'Slow-booting fleet with the same daily curve every day', b: 'pred', why: 'forecast and launch before the curve.' }] } },
      { pair: 'dynamic-predictive' },
      { check: { id: 'ch7-pred', q: 'A group uses **only** a predictive scaling policy in forecast and scale mode. Every evening the load falls. What happens to the extra instances?', opts: [
        { t: 'They keep running: predictive scaling does not scale in, so a dynamic policy must remove them.', why: 'AWS: it will not scale in.' },
        { t: 'They are removed at the start of the next hour, when the forecast for that hour is lower.', why: 'forecasts only add capacity.' },
        { t: 'They are removed once the default cooldown of 300 seconds has passed after the evening drop.', why: 'cooldowns hold simple policies; they never remove instances.' }], a: 0,
        why: 'Predictive scaling scales out ahead of a pattern and never scales in. Add target tracking for the way down.' } },
      { check: { id: 'ch7-cool', q: 'A group uses a **simple** scaling policy. Each spike adds two instances, but the next alarm seems ignored for several minutes. What is happening?', opts: [
        { t: 'The health check grace period stops the group from launching while new instances are being checked.', why: 'the grace period delays health checks, not scaling.' },
        { t: 'The lifecycle hook on the group holds every new launch for one hour by default before it can scale again.', why: 'there is no hook in this scenario.' },
        { t: 'The default 300-second cooldown: a simple policy waits for it after each activity before scaling again.', why: 'cooldowns apply to simple scaling.' }], a: 2,
        why: 'Simple scaling + cooldown = slow reactions. Target tracking or step scaling is not held by the cooldown.' } },
      { h: 'Scaling on a queue' },
      'For workers behind an **SQS queue**, AWS’s pattern is target tracking on **backlog per instance**: the number of messages available (`ApproximateNumberOfMessages`) divided by the InService instances. The target is the **acceptable backlog per instance**: the latency you can accept divided by the time one message takes. AWS’s example: 1,500 messages, 10 instances, 0.1 s per message and 10 s acceptable → target 100, backlog 150, so the group scales out by five. A target on queue length alone does not account for the number of instances and keeps adding them while the queue drains.',
      { widget: 'backlogCalc' },
      { h: 'Slow boots: warm pools and lifecycle hooks' },
      { ul: [
        '**Warm pools** keep pre-initialised instances beside the group, **Stopped**, **Running** or **Hibernated**. The slow part (installing, loading caches) happens before the spike; scale-out only starts an instance that is already prepared.',
        '**Lifecycle hooks** pause an instance in a wait state on launch or termination (**one hour** by default) so a script can finish — install software before the instance takes traffic, or copy logs off before it is terminated. A hook makes waiting safe; it does not make the boot faster.'] },
      { check: fromDrill('C2', 'Exam pattern') },
      { check: fromDrill('C15') },
      { check: fromDrill('C16') },
      { check: fromDrill('C17') },
      { check: fromDrill('C18') },
      { check: fromDrill('C19') },
      { drills: ['C2', 'C15', 'C16', 'C17', 'C18', 'C19'] }
    ] },

    /* ---------------------------------------------------------------- 8 */
    { id: 'ch8', title: 'Load balancers: ALB, NLB, GWLB', domains: 'D2 D3', blocks: [
      'Your baseline **Q43** lives here. Elastic Load Balancing has three current load balancers, and each reads a different part of the traffic: the **ALB** reads the request, the **NLB** reads the connection, the **Gateway Load Balancer** passes everything through appliances. With ALB, NLB and GWLB, targets register in **target groups**; a Classic Load Balancer registers instances directly.',
      { table: { head: ['', 'Application LB', 'Network LB', 'Gateway LB'], key: true, rows: [
        ['Layer', '7 (HTTP, HTTPS)', '4 (TCP, UDP, TLS)', 'appliances (GENEVE, port 6081)'],
        ['Routes by', 'listener rules: host, path, HTTP header', 'flow hash: one target per TCP connection; not by path or host', '5-tuple flow stickiness to one appliance'],
        ['Targets', 'instances, IPs, **Lambda**', 'instances, IPs, an **ALB**', 'instances, IPs (the appliances)'],
        ['Addresses', 'a DNS name (TTL 60 s); at least **two AZs**', '**one static IP per AZ**, an Elastic IP if you choose', '—'],
        ['Client IP', 'in the `X-Forwarded-For` header', 'kept as the source IP', 'the original packet, encapsulated in GENEVE'],
        ['Cross-zone', 'always on at the load balancer', 'off by default', 'off by default'],
        ['Extras', 'user authentication, redirects, fixed responses, WebSockets, HTTP/2, AWS WAF (Session 5)', 'millions of requests per second, PrivateLink endpoint services (Session 3)', 'third-party firewalls, IDS/IPS (Session 3)']] } },
      { callout: 'Baseline **Q43**: the stem said requests must go to different services by **path** and by **host name** — the keyword for an **ALB** listener rule. Route 53 sees names, never paths; an NLB works on ports and cannot read the URL. Underline “path”, “host”, “header” and “URL” whenever they appear.', kind: 'miss', title: 'Your misses' },
      { widget: 'chooser', args: { title: 'Which load balancer?', tree: LB } },
      { pair: 'alb-nlb' },
      { h: 'TLS: terminate or pass through' },
      'An ALB **HTTPS** listener or an NLB **TLS** listener **terminates** TLS with a certificate on the load balancer, so the targets receive decrypted traffic. When the targets themselves must decrypt — end-to-end encryption to the instance, or a protocol only the application understands — use an NLB **TCP listener on port 443**: it passes the encrypted bytes through untouched.',
      { check: { id: 'ch8-tls', q: 'A regulator requires that TLS is decrypted **only on the EC2 instances**, never on the load balancer. Which listener meets this?', opts: [
        { t: 'An ALB HTTPS listener with the certificate in ACM, re-encrypting traffic to targets over HTTPS.', why: 'the ALB still decrypts the traffic first.' },
        { t: 'An NLB TCP listener on port 443, which passes the encrypted traffic through to the instances.', why: 'TCP pass-through: only the targets decrypt.' },
        { t: 'An NLB TLS listener on port 443 with the certificate deployed on the load balancer itself.', why: 'a TLS listener terminates TLS on the load balancer.' }], a: 1,
        why: 'Termination happens wherever the certificate is. Pass-through = an NLB TCP listener.' } },
      { h: 'Cross-zone load balancing' },
      'Each enabled AZ has a load balancer **node**, and DNS sends clients to the nodes roughly equally. With **cross-zone** load balancing on, every node spreads its share over the targets in **all** zones; with it off, each node uses only its own zone’s targets. AWS’s example: two AZs with 2 and 8 targets. On, each of the 10 targets gets **10%**. Off, each node keeps its 50%: the 2 targets get **25%** each and the 8 get **6.25%** each. On an **ALB** cross-zone is always on at the load balancer; on an **NLB** or **GWLB** it is **off by default** and can be turned on at any time.',
      { widget: 'crossZone' },
      { check: { id: 'ch8-cz', q: 'An NLB has **3** targets in one AZ and **3** in the other, with cross-zone load balancing **off**. What share does each target get?', opts: [
        { t: 'About 16.7% each: every node keeps half of the traffic and splits it over its three targets.', why: 'equal zones: off and on give the same answer.' },
        { t: '50% each for one target per zone and nothing for the rest, because NLBs pick a single target.', why: 'the flow hash spreads connections over all healthy targets.' },
        { t: '25% for the targets in one zone and 8.3% in the other, as in AWS’s uneven example.', why: 'that pattern needs uneven target counts.' }], a: 0,
        why: 'Cross-zone only matters when zones are uneven. With 3 and 3, each target gets a sixth either way.' } },
      { h: 'Target groups in a few lines' },
      { ul: [
        '**Deregistration delay**: a target leaving the group drains for **300 seconds** by default, so in-flight requests finish.',
        '**Routing algorithm** (ALB): round robin by default, or least outstanding requests, or weighted random. An NLB uses a flow hash.',
        '**Stickiness**: ALB target groups use cookies; NLB target groups stick by source IP.',
        '**Static IPs with path routing**: an NLB can forward to an **ALB-type target group** — static IPs in front, ALB rules behind.'] },
      { callout: 'NLBs have changed more than the exam guide shows. They support **security groups** — but only if the NLB is created with them; one created without cannot get them later. Listeners now include **QUIC** and **TCP_QUIC** as well as TCP, TLS, UDP and TCP_UDP, a default action can **weight several target groups**, and dual-stack NLBs have listener rules that route by the **source IP address type** (IPv4 vs IPv6). None of this reads the URL: an NLB still cannot route by path or host name. On the ALB side, cross-zone load balancing can be **turned off per target group**. Banks that say “NLBs have no security groups” were right when they were written.', kind: 'update' },
      { callout: 'The **Classic Load Balancer** is “the previous generation load balancer” and “not recommended for new environments”; AWS documents migrations to ALB (path, host and header conditions, Lambda targets, user authentication) or NLB (one Elastic IP per subnet). An option that builds a new design on a CLB is wrong for that reason alone.', kind: 'update' },
      { check: fromDrill('C1', 'Exam Q43') },
      { check: fromDrill('C3', 'Exam pattern') },
      { check: fromDrill('C20') },
      { check: fromDrill('C21') },
      { check: fromDrill('C22') },
      { check: fromDrill('C23') },
      { drills: ['C1', 'C3', 'C20', 'C21', 'C22', 'C23'] }
    ] },

    /* ---------------------------------------------------------------- 9 */
    { id: 'ch9', title: 'Containers: ECS, EKS, Fargate', domains: 'D2 D3 D4', blocks: [
      'Container questions have two layers, and AWS’s own decision guide draws them the same way: an **orchestrator** that schedules and scales the containers (**ECS** or **EKS**), and the **capacity** they run on (**Fargate**, or **EC2** instances you manage). Pick each layer separately.',
      { h: 'ECS or EKS' },
      '**Amazon ECS** is AWS’s own orchestrator: task definitions, services, capacity providers, deep integration with ALBs, IAM and CloudWatch, and no control plane to upgrade. **Amazon EKS** is managed **Kubernetes**: AWS runs the control plane, and your manifests, Helm charts, `kubectl` and operators work unchanged. The guide puts it in terms of skills: some organisations invest in teams to run Kubernetes and value its portability; they also take on its upgrades. If the stem names Kubernetes, choose EKS; if it asks for the least operational overhead and names nothing, choose ECS.',
      { pair: 'ecs-eks' },
      { h: 'Where the containers run' },
      { ul: [
        '**Fargate** (ECS and EKS): no instances. You choose the task size, AWS runs it. On ECS, tasks go from **0.25 vCPU with 512 MiB** up to **16 vCPU with 120 GB** and now **32 vCPU**; each task gets at least **20 GiB** of ephemeral storage, up to **200 GiB**; persistent shared data goes on EFS.',
        '**Fargate Spot** (ECS): Fargate on spare capacity at a discount, with a **two-minute** warning (an EventBridge task state change and SIGTERM to the task). Fargate does not replace Spot capacity with On-Demand. EKS does not support Fargate Spot.',
        '**EC2 capacity**: an Auto Scaling group capacity provider (ECS) or node groups (EKS) of instances you choose and patch — for **GPUs**, privileged containers, DaemonSets or host access.',
        'A capacity provider strategy cannot mix Fargate and Auto Scaling group providers; a cluster can hold both.'] },
      'Fargate’s limits are the trap list: **no GPUs**, **no privileged containers**, on EKS **no DaemonSets** (run the daemon as a sidecar) and no HostPort or HostNetwork, pods only in **private subnets**, load balancers with **IP targets** only, EFS mounts but **no EBS volumes**, and every pod must match a **Fargate profile**.',
      { check: { id: 'ch9-fargate', q: 'A team moves its EKS workloads to Fargate. One component is a log collector deployed as a **DaemonSet**. What must change?', opts: [
        { t: 'Nothing: Fargate runs one copy of every DaemonSet beside each of the pods automatically.', why: 'DaemonSets are not supported on Fargate.' },
        { t: 'It must run as a sidecar container in each pod, since Fargate does not run DaemonSets.', why: 'AWS’s own advice for daemons on Fargate.' },
        { t: 'The collector must run as a privileged pod in the kube-system namespace on Fargate.', why: 'privileged containers are not supported on Fargate either.' }], a: 1,
        why: 'Fargate pods have no shared node: no DaemonSets, no privileged mode. Daemons become sidecars, or the component stays on EC2 nodes.' } },
      { h: 'Two IAM roles, two jobs' },
      'A task definition names two roles, and questions swap them. The **task execution role** is for the **agent**: pull the image from a private ECR repository, send logs to CloudWatch Logs, fetch the Secrets Manager or Parameter Store values the task definition references. The **task role** is what **your code** in the container uses to call AWS — DynamoDB, S3, SQS. If the image pulls and the logs appear but the code gets AccessDenied, the task role is missing the permission.',
      { check: { id: 'ch9-roles', q: 'A Fargate task fails to start with an error that it **cannot pull its image** from a private ECR repository. Which role needs the permission?', opts: [
        { t: 'The task role, because the container asks ECR for its own image when it starts up.', why: 'the code is not running yet; the agent pulls.' },
        { t: 'The IAM role of the user who registered the task definition with ECS in the console.', why: 'the person who registered it is not involved at run time.' },
        { t: 'The task execution role, which the Fargate agent uses to pull images and send logs.', why: 'image pull = the agent = execution role.' }], a: 2,
        why: 'Execution role: before and around the code (pull, logs, secrets). Task role: what the code calls.' } },
      { widget: 'stepper', args: { title: 'A service on Fargate behind an ALB', line: 'ecs', steps: [
        { title: 'Image in ECR', text: 'The build pushes the API image to a private Amazon ECR repository.' },
        { title: 'Task definition', text: 'CPU and memory for the task, the image, the port, the **task execution role** (pull from ECR, logs, secrets) and the **task role** (the DynamoDB table the API writes).' },
        { title: 'Service in private subnets', text: 'An ECS service on the Fargate capacity provider keeps a desired count of 4 tasks in private subnets of two AZs, replacing any that stop.' },
        { title: 'ALB target group with IP targets', text: 'Each task gets its own network interface and IP; the service registers those IPs in an ALB target group of type `ip`.', note: 'Fargate tasks have no instance to register, so the target type must be IP.', noteTitle: 'Why IP targets' },
        { title: 'Service auto scaling', text: 'A target tracking policy on ALB requests per target scales the number of tasks between 4 and 40. No instances scale, because there are none.' }] } },
      { callout: 'Container compute has grown since the exam guide. **Fargate** tasks reach **32 vCPU with 60, 120 or 244 GiB** (announced 5 June 2026, Linux on x86 and Arm, Fargate and Fargate Spot); older material says 4 vCPU and 30 GB, later 16 vCPU and 120 GB. **Amazon ECS Managed Instances** (30 September 2025) let ECS provision, scale and patch EC2 instances for you — every 14 days — with GPU or other instance types allowed, for a management charge on top of EC2. **EKS Auto Mode** lets AWS manage the EKS data plane — compute autoscaling, load balancing, storage, upgrades — and replaces nodes after at most 21 days. Banks know Fargate, EC2 capacity, node groups and Fargate profiles; those answers still hold.', kind: 'update' },
      { check: fromDrill('C24') },
      { check: fromDrill('C25') },
      { check: fromDrill('C26') },
      { check: fromDrill('C27') },
      { drills: ['C24', 'C25', 'C26', 'C27'] }
    ] },

    /* ---------------------------------------------------------------- 10 */
    { id: 'ch10', title: 'Lambda vs containers vs EC2', domains: 'D3 D4', blocks: [
      'This chapter is only the comparison. Everything about Lambda itself — memory, payloads, concurrency, invocation models, retries — and API Gateway is in [[../09-serverless/#learn/ch8|Session 9, chapter 8]]. Two Lambda numbers decide compute comparisons: a function runs for at most **15 minutes**, and its container image can be up to **10 GB**.',
      { table: { head: ['', 'Lambda', 'Fargate (ECS / EKS)', 'EC2'], key: true, rows: [
        ['How long one run lasts', 'up to **15 minutes**', 'as long as the process runs', 'as long as you like'],
        ['How it starts', 'per event; scales with requests', 'a service keeps tasks running, or an event starts a task', 'an Auto Scaling group keeps instances running'],
        ['Package', 'zip or container image (up to 10 GB)', 'container image', 'AMI + anything'],
        ['Who patches', 'AWS (runtime and OS)', 'AWS (host); you (image)', 'you (OS, AMI)'],
        ['Idle cost', 'none', 'a running service is billed; an ended task is not', 'running instances are billed'],
        ['GPUs, OS access', 'no', 'no', 'yes'],
        ['State', 'nothing kept between invocations', 'within the task’s life; EFS for shared data', 'disks, memory, hibernation']] } },
      'The deciding detail is nearly always **duration** or **control**. A 40-minute job breaks Lambda however much memory it gets. A GPU, a kernel module or Remote Desktop breaks both Lambda and Fargate. Within what survives, the superlative decides: per-event code idle most of the day is cheapest on Lambda; a long-running container with no servers to patch is Fargate.',
      { pair: 'lambda-fargate' },
      { check: { id: 'ch10-long', q: 'A nightly report takes **25 minutes** to build from a container image as **one process that cannot be split or resumed**, and it starts from a schedule. Nobody wants servers. Which option runs it?', opts: [
        { t: 'An ECS task on Fargate started by an EventBridge Scheduler schedule each night.', why: 'no servers, no time limit, nothing running in between.' },
        { t: 'A Lambda function from the same container image with the largest memory setting.', why: 'the 15-minute timeout is fixed, whatever the memory.' },
        { t: 'A Lambda function that calls itself again every 14 minutes until the report is done.', why: 'one process that cannot be resumed cannot be handed on to the next call.' }], a: 0,
        why: 'Over 15 minutes in one process, no servers, started by time or event = a Fargate task (or a Batch job).' } },
      { check: { id: 'ch10-gpu', q: 'An inference service needs a **GPU** and must answer requests all day behind a load balancer. Which compute fits?', opts: [
        { t: 'AWS Lambda behind an ALB, using a container image that bundles the NVIDIA GPU drivers.', why: 'Lambda has no GPUs.' },
        { t: 'ECS on Fargate with the largest task size, with tasks registered as IP targets of an ALB.', why: 'Fargate has no GPUs either.' },
        { t: 'GPU EC2 instances in an Auto Scaling group, or ECS on GPU EC2 capacity, behind an ALB.', why: 'only EC2 offers GPUs here.' }], a: 2,
        why: 'Accelerators come only with EC2 (directly, or under ECS/EKS as EC2 capacity).' } },
      { check: fromDrill('C28') },
      { drills: ['C28'] }
    ] },

    /* ---------------------------------------------------------------- 11 */
    { id: 'ch11', title: 'Elastic Beanstalk and AWS Batch', domains: 'D2 D3 D4', blocks: [
      '**AWS Elastic Beanstalk** builds the stack for you. You upload your code (or a container); Beanstalk creates an **environment** with the load balancer, the Auto Scaling group, the EC2 instances and the monitoring, and deploys each new version. There is **no additional charge** for Beanstalk: you pay for the resources it creates. Choose the load balancer type with care — it cannot be changed after the environment is created.',
      { h: 'Web server tier and worker tier' },
      'A **web server** environment serves HTTP traffic behind its load balancer. A **worker** environment does background work: Beanstalk creates (or uses) an **SQS queue**, and a **daemon** on each instance reads messages from the queue and sends each one to your application for processing. All instances read the same queue. “Long-running background tasks, deployed with Beanstalk” = the worker tier.',
      { check: { id: 'ch11-worker', q: 'A Beanstalk web app must hand slow PDF generation to background workers. What does the **worker tier** give it?', opts: [
        { t: 'A second web server environment that the first one calls over HTTPS through its load balancer.', why: 'workers do not take HTTP traffic from users.' },
        { t: 'An SQS queue, and a daemon on each worker instance that sends each message to the app.', why: 'the documented worker model.' },
        { t: 'A Lambda function per message, created by Beanstalk with the same code as the web environment.', why: 'Beanstalk runs workers on EC2 instances.' }], a: 1,
        why: 'Worker tier = queue + daemon + your code on instances. The web tier sends messages; the workers process them.' } },
      { h: 'Deployment policies' },
      { table: { head: ['Policy', 'What happens', 'Capacity during deployment', 'Rollback'], key: true, rows: [
        ['**All at once**', 'every instance updated at the same time', 'none: brief downtime', 'deploy the old version again'],
        ['**Rolling**', 'batches taken out of service and updated in turn', 'reduced by one batch', 'another rolling deployment'],
        ['**Rolling with additional batch**', 'an extra batch launched first, then rolling', 'full', 'another rolling deployment'],
        ['**Immutable**', 'a full set of new instances in a **separate Auto Scaling group**; moved in once healthy', 'full (and more)', '**quick**: terminate the new instances'],
        ['**Traffic splitting**', 'immutable, with a share of traffic sent to the new version first (canary); needs an ALB', 'full', 'quick'],
        ['**Blue/green**', 'a second environment, then **Swap environment URLs** (a CNAME swap)', 'full', 'swap back; keep the old environment until DNS has expired']] } },
      'Rolling and rolling with additional batch are only for load-balanced environments; immutable and traffic splitting need enhanced health reporting. Blue/green is also how you move to an incompatible platform version, and it needs the database to live outside the environment.',
      { widget: 'sorter', args: { title: 'Which deployment policy?', lead: 'Six requirements. Rolling and rolling with additional batch share one bucket; the requirement says which one.', buckets: [{ id: 'aao', short: 'All at once', label: 'All at once' }, { id: 'roll', short: 'Rolling', label: 'Rolling (or with additional batch)' }, { id: 'imm', short: 'Immutable', label: 'Immutable' }, { id: 'ts', short: 'Canary', label: 'Traffic splitting' }, { id: 'bg', short: 'Blue/green', label: 'Blue/green (swap URLs)' }], items: [
        { t: 'A test environment, fastest deployment, downtime is fine', b: 'aao', why: 'all at once.' },
        { t: 'Update in batches; a small drop in capacity is acceptable', b: 'roll', why: 'rolling.' },
        { t: 'Update in batches, with one extra batch launched first so capacity never drops', b: 'roll', why: 'rolling with additional batch.' },
        { t: 'New instances in a separate group; roll back by terminating them', b: 'imm', why: 'immutable.' },
        { t: 'Send 10% of users to the new version first, then the rest', b: 'ts', why: 'traffic splitting (canary).' },
        { t: 'Move to an incompatible platform version with zero downtime', b: 'bg', why: 'a new environment and a URL swap.' }] } },
      { callout: 'Elastic Beanstalk gained a second mode on 17 September 2026. **Standard Mode** is the existing service — an environment of EC2 instances per application — and it is what the exam describes. **Cluster Mode** runs several applications on shared infrastructure in your account, powered by Amazon EKS with EKS Auto Mode; there is no additional charge for it beyond the EKS resources, and its environments support blue/green with a CNAME swap too. Answer exam questions as Standard Mode.', kind: 'update' },
      { h: 'AWS Batch' },
      '**AWS Batch** runs **jobs** — work that starts, runs to completion and ends. Four nouns carry it: a **job definition** (the container, its vCPU and memory, its IAM role), the **job** you submit, a **job queue** (with a priority, holding jobs until capacity is free and their **dependencies** have finished), and a **compute environment** that Batch provisions and scales: EC2 On-Demand or **Spot**, **Fargate** or Fargate Spot, or an existing EKS cluster. Batch retries jobs, scales the capacity down when the queue is empty, and runs **multi-node parallel** jobs (with EFA) for tightly coupled HPC. There is **no additional charge**: you pay for the capacity.',
      'What Batch is **not**: a long-running service (that is ECS or an Auto Scaling group), or short event code (Lambda). And what it saves you from building: an SQS queue, a fleet of workers, a scheduler, a dependency tracker and a retry loop.',
      { widget: 'stepper', args: { title: 'A nightly job on Spot with AWS Batch', line: 'batch', steps: [
        { title: 'Job definition', text: 'The lab registers its analysis container with 4 vCPU and 16 GiB of memory and an IAM role that reads the input bucket.' },
        { title: 'Compute environment', text: 'A managed compute environment allows Spot Instances across several instance types, with a maximum vCPU count. Batch will choose and launch the instances.' },
        { title: 'Submit to a job queue', text: 'At 20:00 a script submits 2,000 jobs to the nightly queue; the merge job is submitted with a dependency on all of them.' },
        { title: 'Batch scales and runs', text: 'Batch launches Spot capacity for the waiting jobs and runs them; a job on a reclaimed instance is retried on another.', note: 'Interruptions cost time, not data: each job reads its input and writes its own output.', noteTitle: 'Why Spot is safe here' },
        { title: 'Dependencies, then scale to zero', text: 'When the last job finishes, the merge job starts. When the queue is empty, Batch scales the compute environment back down.' }] } },
      { pair: 'batch-lambda' },
      { check: { id: 'ch11-batch', q: 'Which part of AWS Batch decides **which instances** run the jobs and how many?', opts: [
        { t: 'The compute environment, which Batch provisions and scales within the types and limits set.', why: 'capacity lives in the compute environment.' },
        { t: 'The job queue, which launches one EC2 instance for each job waiting in it at a given priority.', why: 'the queue holds and orders jobs; it launches nothing.' },
        { t: 'The job definition, which names the instance type each job runs on when it is submitted.', why: 'it names the container and its vCPU and memory, not instances.' }], a: 0,
        why: 'Definition = what a job is; queue = which jobs wait, in what order; compute environment = where they run.' } },
      { check: fromDrill('C29') },
      { check: fromDrill('C30') },
      { drills: ['C29', 'C30'] }
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
      'C1 is your baseline miss Q43 rebuilt; C2 and C3 carry the prestige pattern (Global Accelerator and a second Region for a scaling problem, Global Accelerator and Transit Gateway for a static-IP problem). Run the 30 scenarios once; your new misses appear in Progress.',
      { link: '#drill', text: 'Go to the drill (30 scenarios)', btn: true }
    ] }
  ];
})();
