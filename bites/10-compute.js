/* Feed bites — Session 10, compute & scaling. Facts: sessions/10-compute/learn.js chapters in src,
   docs/session-10-compute.md (verified 2026-11-11). Ledger: docs/feed-bites.md. */
window.SAA_BITES = (window.SAA_BITES || []).concat([
  {
    id: 'cmp-ec2-containers-lambda', sid: '10-compute', title: 'EC2, containers or Lambda', domains: ['D3', 'D4'], src: ['ch2', 'ch10'],
    text: 'Think of moving goods. **EC2** is owning a van: you drive, fuel and service it, and it goes anywhere for as long as you like. **Containers on Fargate** are a seat on a managed truck: you bring the packed box, AWS drives and maintains. **Lambda** is calling a courier: nothing to own and you pay per delivery, but no trip lasts longer than **15 minutes**. Ask who must control the vehicle, and how long the trip is.',
    qs: [
      { id: 'q1', q: 'A clinic sends an appointment reminder each time a booking is made. Each reminder takes about 3 seconds of code, and the system is idle most nights. Which compute option is the MOST cost-effective?', words: ['about 3 seconds', 'idle most nights', 'MOST cost-effective'],
        expl: 'Short code per event with long idle gaps is what Lambda was built for: it runs per event and costs nothing while idle. Every other option keeps something running all night.',
        opts: [
          { t: 'An AWS Lambda function invoked once for every new booking event', ok: true, why: 'It runs only when a booking arrives and bills nothing while the system is idle.' },
          { t: 'An Amazon ECS service on AWS Fargate that keeps two tasks running', why: 'No servers, but the two tasks run and bill all night with nothing to do.' },
          { t: 'A small Amazon EC2 instance in an Auto Scaling group with a minimum of one', why: 'An instance to run and patch, billed every hour for seconds of work.' },
          { t: 'An Amazon ECS service on EC2 capacity that keeps one task per instance', why: 'Both the instances and the tasks stay up through the idle nights.' }] },
      { id: 'q2', q: 'A media company converts each uploaded film into several formats, and one conversion takes about 50 minutes in its existing container image. Nobody on the team wants to patch servers. Which compute option fits?', words: ['about 50 minutes', 'existing container image', 'patch servers'],
        expl: 'Longer than 15 minutes rules out Lambda whatever its memory. A container started per upload on Fargate runs to the end with no servers to patch.',
        opts: [
          { t: 'An Amazon ECS task on AWS Fargate started for each uploaded film', ok: true, why: 'A Fargate task runs as long as the conversion needs, with no servers to patch.' },
          { t: 'An AWS Lambda function built from the same image, run per upload', why: 'Lambda stops at 15 minutes, so a 50-minute conversion never finishes.' },
          { t: 'An AWS Lambda function with its memory raised to the largest size', why: 'More memory adds CPU, but the 15-minute timeout does not move.' },
          { t: 'An Amazon EC2 instance that runs the image and polls for new films', why: 'It works, but it is a server to patch and it sits idle between uploads.' }] },
      { id: 'q3', q: 'A legacy Windows application needs Remote Desktop access for its administrators and a licensed device driver installed on the host. Which compute option meets these needs?', words: ['Remote Desktop', 'installed on the host'],
        expl: 'Host access and a driver mean the operating system itself, which only EC2 gives you. Fargate and Lambda hide the host by design.',
        opts: [
          { t: 'Amazon EC2 instances running Windows Server in an Auto Scaling group', ok: true, why: 'Full control of the OS: Remote Desktop and the driver on the host.' },
          { t: 'Amazon ECS on AWS Fargate running the application as a Windows container', why: 'Fargate gives no host to log in to or to install a driver on.' },
          { t: 'An AWS Lambda function packaged as a container image with the driver', why: 'Lambda has no host access, no Remote Desktop, and a 15-minute limit.' },
          { t: 'Amazon EKS with a Fargate profile that runs the app as a privileged pod', why: 'Fargate does not run privileged pods or give access to the host.' }] },
      { id: 'q4', q: 'A startup has packaged its web API as a container image. It wants the API behind a load balancer with no servers to patch or scale, and with the LEAST operational overhead. Which option fits?', words: ['container image', 'no servers to patch or scale', 'LEAST operational overhead'],
        expl: 'Containers with no servers and the least to run is ECS on Fargate. EKS adds Kubernetes nobody asked for, and EC2 capacity brings the servers back.',
        opts: [
          { t: 'An Amazon ECS service on AWS Fargate behind an Application Load Balancer', ok: true, why: 'ECS keeps the tasks running and Fargate runs them; there are no servers.' },
          { t: 'Amazon EC2 instances in an Auto Scaling group that start the image at boot', why: 'The instances, their images and their patches stay with the startup.' },
          { t: 'An Amazon EKS cluster on managed node groups behind a load balancer', why: 'Nodes to patch and a Kubernetes version to keep up, with no need for it.' },
          { t: 'An Amazon ECS service on an Auto Scaling group of EC2 container hosts', why: 'ECS runs the tasks, but the container hosts are still servers to patch.' }] }
    ]
  },
  {
    id: 'cmp-purchase-options', sid: '10-compute', title: 'On-Demand, Savings Plans, Reserved, Spot', domains: ['D4'], src: ['ch5', 'ch6'],
    text: 'Buying compute is like buying train travel. **On-Demand** is paying at the door: no commitment, full price. A **Savings Plan** is a season ticket: commit to a spend per hour for one or three years and save. A **Reserved Instance** is the older season ticket, tied to one configuration. **Spot** is a standby ticket: up to 90% off, but you can be bumped with two minutes’ notice. A discount never guarantees a seat; a **Capacity Reservation** does.',
    update: 'Practice exams describe Spot bidding and Spot blocks. Today Spot prices are set by EC2 and move gradually, with no bidding, and Spot blocks have taken no new customers since 1 July 2021.',
    qs: [
      { id: 'q1', q: 'A video service runs 12 transcoding servers for a live channel around the clock, and they must not be interrupted. The service will keep the same instance family in one Region for three years. Which option gives the deepest discount?', words: ['must not be interrupted', 'same instance family in one Region', 'deepest discount'],
        expl: 'Spot is ruled out by the servers that must not be interrupted. Steady use of one family in one Region is what the EC2 Instance Savings Plan rewards with its larger discount; flexibility that will not be used only lowers it.',
        opts: [
          { t: 'A three-year EC2 Instance Savings Plan for that family in that Region', ok: true, why: 'Up to 72% off for one family in one Region, any size, OS or tenancy.' },
          { t: 'A three-year Compute Savings Plan covering the same hourly spend', why: 'Up to 66%: it pays for flexibility across families the service will not use.' },
          { t: 'Spot Instances across several types, relaunched whenever reclaimed', why: 'Deeper still, but a reclaim interrupts servers that must keep running.' },
          { t: 'An On-Demand Capacity Reservation held for the whole three years', why: 'It guarantees capacity but gives no discount by itself.' }] },
      { id: 'q2', q: 'A retailer must be sure that 30 instances of one type can start in one Availability Zone during a three-day sale, and it wants no commitment beyond the sale. Which option meets this?', words: ['must be sure', 'no commitment beyond the sale'],
        expl: 'Only a reservation holds capacity. An immediate On-Demand Capacity Reservation has no term and can be cancelled when the sale ends; plans and Regional RIs change the price, not the capacity.',
        opts: [
          { t: 'An On-Demand Capacity Reservation in that zone, cancelled after the sale', ok: true, why: 'Capacity held in one AZ, with no term for an immediate-use reservation.' },
          { t: 'A one-year Compute Savings Plan sized for the cost of the 30 instances', why: 'A discount with no capacity behind it, and a year of commitment.' },
          { t: 'Regional Reserved Instances for the 30 instances for a one-year term', why: 'Regional RIs reserve no capacity, and the term is a year.' },
          { t: 'Spot Instances requested across the zone for the three days of the sale', why: 'Spot capacity can be reclaimed at any time; nothing is guaranteed.' }] },
      { id: 'q3', q: 'A laboratory runs overnight simulations that save a checkpoint every few minutes and can resume on any other instance. Which purchase option is the MOST cost-effective?', words: ['save a checkpoint every few minutes', 'MOST cost-effective'],
        expl: 'Work that checkpoints and resumes loses only minutes when an instance is reclaimed, so the standby ticket wins: Spot, spread across several types and zones.',
        opts: [
          { t: 'Spot Instances across several instance types and Availability Zones', ok: true, why: 'Up to 90% off; a reclaimed instance costs only the minutes since the checkpoint.' },
          { t: 'On-Demand Instances started each evening and terminated each morning', why: 'It works, at the full price, for work that would tolerate interruption.' },
          { t: 'A three-year EC2 Instance Savings Plan for the overnight fleet', why: 'A commitment billed every hour of the day for a fleet that runs at night.' },
          { t: 'Dedicated Hosts reserved for the simulation fleet every night', why: 'Dedicated hardware solves licensing or compliance, not the price.' }] },
      { id: 'q4', q: 'A company will move its EC2 workloads to AWS Lambda and to Amazon ECS on AWS Fargate over the next two years, and wants one commitment that keeps saving through the move. Which commitment fits?', words: ['AWS Lambda and to Amazon ECS on AWS Fargate', 'keeps saving through the move'],
        expl: 'Only the Compute Savings Plan applies to Fargate and Lambda as well as EC2. Every other commitment stays with EC2 instances.',
        opts: [
          { t: 'A Compute Savings Plan for the hourly spend, applied as the mix changes', ok: true, why: 'It covers EC2, Fargate and Lambda, any family and any Region.' },
          { t: 'An EC2 Instance Savings Plan for the family the company uses the most', why: 'One EC2 family in one Region: Lambda and Fargate are not covered.' },
          { t: 'Standard Reserved Instances for today’s instances, sold after the move', why: 'They cover EC2 only, and a resale is not a discount on Lambda.' },
          { t: 'Convertible Reserved Instances, exchanged for new families as it moves', why: 'Exchanges stay inside EC2; a Convertible RI never covers Fargate.' }] }
    ]
  },
  {
    id: 'cmp-asg-scaling', sid: '10-compute', title: 'Auto Scaling: which policy', domains: ['D2', 'D3'], src: ['ch7'],
    text: 'Auto Scaling policies are four ways to heat a house. **Target tracking** is a thermostat: set CPU at 50% and the group adds or removes instances to hold it. **Step scaling** is a staircase of alarms: a bigger breach, a bigger step. **Scheduled** scaling is a timetable for a time you already know. **Predictive** scaling is a weather forecast: it learns daily patterns and heats ahead of the cold, but it never turns the heating down.',
    qs: [
      { id: 'q1', q: 'An exam-booking site opens registrations at 09:00 on a date published months in advance. The Auto Scaling group must have extra instances running before 09:00 on that day. Which policy fits?', words: ['date published months in advance', 'before 09:00'],
        expl: 'The time is known ahead, so a scheduled action is built for it. Predictive scaling learns recurring daily patterns from history; a one-off date is not one.',
        opts: [
          { t: 'A scheduled action that raises the desired capacity shortly before 09:00', ok: true, why: 'A clock you set for a known time; no history or alarm is needed.' },
          { t: 'A predictive scaling policy that forecasts the morning of registration day', why: 'It learns recurring patterns; a single published date is not in its history.' },
          { t: 'A target tracking policy that holds average CPU near 50 percent', why: 'It reacts after the load arrives, so the first users meet a small fleet.' },
          { t: 'A step scaling policy with alarm bands on the number of requests', why: 'Also a reaction to load that has already arrived, not a launch ahead of it.' }] },
      { id: 'q2', q: 'A team wants its Auto Scaling group to hold ALB requests per target near a chosen value, without creating or tuning any CloudWatch alarms. Which policy fits?', words: ['hold ALB requests per target near', 'without creating or tuning any CloudWatch alarms'],
        expl: 'Holding a metric near a value is the thermostat: target tracking, which creates and manages its own alarms.',
        opts: [
          { t: 'A target tracking policy on the ALB request count per target', ok: true, why: 'You set the metric and the target; Auto Scaling manages the alarms.' },
          { t: 'A step scaling policy with alarm bands on the request count', why: 'It can hold the value, but the alarms and steps are the team’s to tune.' },
          { t: 'A simple scaling policy on a request alarm, with a long cooldown', why: 'One alarm to manage, and the cooldown delays each further step.' },
          { t: 'A scheduled action that sets capacity from last week’s request graph', why: 'A guess from the past, and the schedule is the team’s to maintain.' }] },
      { id: 'q3', q: 'A group uses a predictive scaling policy as its only policy, and its load falls sharply every evening. What happens to the extra instances in the evening?', words: ['its only policy', 'falls sharply every evening'],
        expl: 'Predictive scaling launches capacity ahead of a forecast but never scales in. A target tracking or step policy beside it removes what is no longer needed.',
        opts: [
          { t: 'They keep running, because predictive scaling never removes capacity', ok: true, why: 'It scales out ahead of a pattern only; scaling in needs a dynamic policy.' },
          { t: 'They are removed at the next hour, when the forecast for it is lower', why: 'A lower forecast does not make predictive scaling remove instances.' },
          { t: 'They are removed after the default cooldown that follows the drop', why: 'Cooldowns hold simple scaling policies; they remove nothing on their own.' },
          { t: 'They are stopped and moved into a warm pool until the next morning', why: 'A warm pool must be configured; predictive scaling does not create one.' }] },
      { id: 'q4', q: 'Worker instances process messages from an Amazon SQS queue. Which metric should a target tracking policy use so that scaling follows both the queue and the size of the fleet?', words: ['both the queue and the size of the fleet'],
        expl: 'Backlog per instance divides the messages waiting by the InService instances, so it moves with both. Queue length alone ignores how many workers share it.',
        opts: [
          { t: 'Backlog per instance: messages waiting divided by InService instances', ok: true, why: 'It follows the queue and the fleet, as AWS’s queue scaling pattern does.' },
          { t: 'The ApproximateNumberOfMessages metric of the queue on its own', why: 'It ignores the fleet size, so the group keeps adding while the queue drains.' },
          { t: 'The average CPU utilisation of the worker instances in the group', why: 'CPU can stay low while a queue of light messages keeps growing.' },
          { t: 'The average number of bytes received by the worker instances', why: 'Network traffic says nothing about how many messages are still waiting.' }] }
    ]
  },
  {
    id: 'cmp-alb-nlb-gwlb', sid: '10-compute', title: 'ALB, NLB or Gateway Load Balancer', domains: ['D3', 'D2'], src: ['ch8'],
    text: 'Three load balancers read three different things. The **ALB** is a receptionist who opens each letter: it reads the host name, the path and the headers, and sends each request to the right team. The **NLB** is a switchboard that reads only the envelope — TCP or UDP, port, sender — fast, with a static IP per Availability Zone and the client’s own IP kept. The **Gateway Load Balancer** is a security gate every packet passes through, run by third-party appliances.',
    update: 'Practice exams say NLBs have no security groups. Today an NLB can use them if it is created with them, and it has QUIC listeners; it still cannot route by URL path or host name. The Classic Load Balancer is the previous generation.',
    qs: [
      { id: 'q1', q: 'A SaaS company serves each customer on its own subdomain, such as acme.example.com, and each subdomain must reach a different target group behind one HTTPS endpoint. Which load balancer fits?', words: ['its own subdomain', 'different target group'],
        expl: 'Routing by host name means reading the request, which is the ALB’s job. An NLB sees ports and addresses, a Gateway Load Balancer passes traffic through appliances, and a Classic Load Balancer has no rules.',
        opts: [
          { t: 'An Application Load Balancer with a host-based listener rule per subdomain', ok: true, why: 'Host conditions are layer 7 rules, each forwarding to its own target group.' },
          { t: 'A Network Load Balancer with a TLS listener on a separate port per customer', why: 'It reads ports, not host names, so customers would need their own ports.' },
          { t: 'A Gateway Load Balancer with one target group of appliances per customer', why: 'Built to pass traffic through appliances, not to route by host name.' },
          { t: 'A Classic Load Balancer with one HTTPS listener and every target behind it', why: 'No host rules, and the previous generation of load balancer.' }] },
      { id: 'q2', q: 'An IoT platform receives UDP telemetry from millions of devices, and its servers must log the source IP address of each device. Which load balancer fits?', words: ['UDP telemetry', 'source IP address of each device'],
        expl: 'UDP and the client’s own source IP are layer 4: the Network Load Balancer. An ALB handles HTTP and HTTPS only.',
        opts: [
          { t: 'A Network Load Balancer with a UDP listener and instance targets', ok: true, why: 'Layer 4, UDP, and the client source IP is kept for the servers.' },
          { t: 'An Application Load Balancer that adds the X-Forwarded-For header', why: 'An ALB handles HTTP and HTTPS; UDP telemetry never reaches it.' },
          { t: 'A Gateway Load Balancer in front of the servers as GENEVE targets', why: 'Built for inspection appliances, not as the front door of a service.' },
          { t: 'A Classic Load Balancer with a TCP listener and proxy protocol', why: 'No UDP listener, and the previous generation of load balancer.' }] },
      { id: 'q3', q: 'A security team must send all traffic entering a VPC through a vendor’s firewall appliances, which support the GENEVE protocol, and the fleet must scale. Which load balancer fits?', words: ['vendor’s firewall appliances', 'GENEVE protocol'],
        expl: 'Third-party appliances in the path of all traffic, speaking GENEVE, are what the Gateway Load Balancer was built for. The designs around it are in Session 3.',
        opts: [
          { t: 'A Gateway Load Balancer in front of the vendor’s appliance fleet', ok: true, why: 'It sends traffic through the appliances over GENEVE and scales them.' },
          { t: 'A Network Load Balancer in front of the appliances on a TCP listener', why: 'Not a transparent hop for all traffic; GENEVE fleets sit behind a GWLB.' },
          { t: 'An Application Load Balancer that forwards every request to them', why: 'It terminates HTTP; it cannot pass all traffic through appliances.' },
          { t: 'A Classic Load Balancer with the appliances registered directly', why: 'Previous generation, and not built for inline inspection at all.' }] },
      { id: 'q4', q: 'A Network Load Balancer spans two Availability Zones, with 1 target in one zone and 4 in the other. Clients reach both zones equally, and the lone target is overloaded. Which change spreads the load evenly?', words: ['1 target in one zone and 4 in the other', 'spreads the load evenly'],
        expl: 'With cross-zone load balancing off, each node keeps its share inside its own zone, so the lone target takes half of all traffic. Turned on, every node spreads over all five targets.',
        opts: [
          { t: 'Turn on cross-zone load balancing for the Network Load Balancer', ok: true, why: 'Each node then spreads its share over the targets in both zones.' },
          { t: 'Switch the target group to the least outstanding requests algorithm', why: 'An ALB target group setting; an NLB picks targets by a flow hash.' },
          { t: 'Turn on target group stickiness by source IP for all the clients', why: 'Stickiness pins clients to targets; the lone target keeps its share.' },
          { t: 'Give each zone’s load balancer node its own Elastic IP address', why: 'Static addresses do not change where each node sends its traffic.' }] }
    ]
  },
  {
    id: 'cmp-ecs-eks-fargate', sid: '10-compute', title: 'ECS, EKS and Fargate', domains: ['D2', 'D4'], src: ['ch9'],
    text: 'Containers need two things: a conductor and a stage. **ECS** and **EKS** are the conductors: ECS is AWS’s own, with the least to run; EKS is Kubernetes, for teams whose manifests and Helm charts already speak it. **Fargate** and **EC2** are the stages: on Fargate AWS runs the servers and you only size the task; on EC2 you choose and patch the instances, which is what GPUs and privileged containers need.',
    update: 'App Runner, which practice exams offer as the simplest container service, takes no new customers from 30 April 2026; AWS recommends Amazon ECS Express Mode instead.',
    qs: [
      { id: 'q1', q: 'A team with no Kubernetes experience wants to run a dozen containerised services with no servers and the LEAST operational overhead. Which combination fits?', words: ['no Kubernetes experience', 'LEAST operational overhead'],
        expl: 'No Kubernetes need and least ops point to ECS; no servers points to Fargate. Each other pair adds Kubernetes, servers, or both.',
        opts: [
          { t: 'Amazon ECS as the orchestrator, with the tasks running on AWS Fargate', ok: true, why: 'AWS’s own orchestrator and no servers: the least to run.' },
          { t: 'Amazon EKS as the orchestrator, with the pods running on AWS Fargate', why: 'No servers, but Kubernetes to learn and upgrade with no need for it.' },
          { t: 'Amazon ECS as the orchestrator, with tasks on EC2 instances the team manages', why: 'The EC2 container hosts are servers for the team to patch.' },
          { t: 'Amazon EKS as the orchestrator, with pods on managed node groups', why: 'Both Kubernetes and nodes to look after.' }] },
      { id: 'q2', q: 'A company already runs Amazon EKS, and its new video-analysis containers each need a GPU. Where should these pods run?', words: ['already runs Amazon EKS', 'each need a GPU'],
        expl: 'Fargate offers no GPUs, so GPU pods run on EC2 nodes with GPUs under the same EKS cluster. EKS does not support Fargate Spot either.',
        opts: [
          { t: 'On EKS nodes that are GPU EC2 instances in the existing cluster', ok: true, why: 'GPUs come only with EC2 capacity; EKS keeps scheduling the pods.' },
          { t: 'On AWS Fargate through a Fargate profile that requests a GPU', why: 'Fargate has no GPUs, whatever the profile asks for.' },
          { t: 'On Fargate Spot capacity added to the cluster to keep costs down', why: 'EKS does not support Fargate Spot, and Fargate has no GPUs.' },
          { t: 'In AWS Lambda functions called by the cluster for each video file', why: 'Lambda has no GPUs either, and it leaves EKS for this work.' }] },
      { id: 'q3', q: 'A new Amazon ECS task on AWS Fargate fails to start because it cannot read a database password that its task definition references in AWS Secrets Manager. Which role needs the permission?', words: ['fails to start', 'references in AWS Secrets Manager'],
        expl: 'Fetching secrets named in the task definition is the agent’s job, before the code runs: the task execution role. The task role is for calls the code itself makes.',
        opts: [
          { t: 'The task execution role, which the agent uses to fetch the secret', ok: true, why: 'Pulls, logs and secrets in the task definition belong to the agent.' },
          { t: 'The task role, which the code in the container uses for AWS calls', why: 'The code has not started yet; the agent fetches the secret.' },
          { t: 'An EC2 instance profile attached to the cluster’s container hosts', why: 'A Fargate task has no EC2 instance profile to use.' },
          { t: 'The IAM role of the person who registered the task definition', why: 'The person who registered it plays no part when the task starts.' }] }
    ]
  }
]);
