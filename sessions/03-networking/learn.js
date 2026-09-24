/* Session 3 — the lesson. 12 chapters. Facts: docs/session-03-networking.md (verified 2026-09-24). */
(function () {
  'use strict';
  const S = window.SESSION;
  const fromDrill = (id, src) => {
    const d = S.drills.find(x => x.id === id);
    return { id: 'ck-' + id, src: src || d.src, q: d.q, opts: d.opts.map(o => ({ t: o.t, why: o.why })), a: d.opts.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0), why: d.expl };
  };

  const ENDPOINT = {
    start: 'root',
    nodes: {
      root: { q: 'What is at the other end of the traffic?', opts: [
        { label: 'An AWS service', sub: 'S3, DynamoDB, SQS, KMS, Secrets Manager, SSM, ECR …', next: 'svc' },
        { label: 'The public internet', sub: 'patch repositories, public APIs', next: 'net' },
        { label: 'One service that another VPC or account publishes', sub: 'a SaaS API, a shared internal service', next: 'saas' },
        { label: 'A whole other VPC, both directions', next: 'vpc' }] },
      svc: { q: 'Which service?', opts: [
        { label: 'Amazon S3 or DynamoDB', next: 'where' },
        { label: 'Any other AWS service', next: 'iface' }] },
      where: { q: 'Where does the traffic start?', opts: [
        { label: 'Inside this VPC', sub: 'EC2, Lambda, containers in its subnets', next: 'gw' },
        { label: 'On-premises (over DX or VPN), a VPC in another Region, or through a transit gateway', next: 'ifaceS3' }] },
      net: { q: 'IPv4 or IPv6?', opts: [
        { label: 'IPv4', next: 'nat' },
        { label: 'IPv6', next: 'eigw' }] },
      vpc: { q: 'How many VPCs, and do their CIDRs overlap?', opts: [
        { label: 'Two or three, no overlap, cost matters', next: 'peer' },
        { label: 'Many VPCs, maybe on-prem too', next: 'tgw' },
        { label: 'The CIDRs overlap', next: 'saas' }] }
    },
    results: {
      gw: { title: 'Gateway VPC endpoint', line: 'pl', text: 'A route-table target (a prefix list) for S3 or DynamoDB. Traffic stays on the AWS network; no NAT gateway, no internet gateway.', facts: ['**No charge**', 'Only from inside this VPC: not from on-prem, not from a peered VPC in another Region, not through a transit gateway', 'Control access with an endpoint policy and bucket policies (`aws:SourceVpce`)'], whyNot: [['Interface endpoint', 'works too, but is billed per hour per AZ and per GB'], ['NAT gateway', 'goes to the public endpoint and charges per GB processed']] },
      ifaceS3: { title: 'Interface VPC endpoint for S3 (or DynamoDB)', line: 'pl', text: 'An ENI with a private IP in your subnet. On-prem traffic over DX or VPN, and traffic from peered or TGW-connected VPCs, can reach that IP. Use the endpoint-specific DNS names.', facts: ['Billed per hour per AZ + per GB', 'Can sit next to a gateway endpoint in the same VPC'], whyNot: [['Gateway endpoint', 'not reachable from on-premises, other Regions or through a TGW']] },
      iface: { title: 'Interface VPC endpoint (PrivateLink)', line: 'pl', text: 'An ENI with a private IP in each subnet you choose. With private DNS enabled, the service’s default name resolves to it, so code does not change.', facts: ['Most AWS services support it', 'Billed per hour per AZ + per GB processed'], update: 'Interface endpoints can now reach select AWS services and endpoint services in **other Regions** (PrivateLink cross-Region connectivity).', whyNot: [['Gateway endpoint', 'exists only for S3 and DynamoDB'], ['NAT gateway', 'works only if the policy allows internet egress']] },
      nat: { title: 'NAT gateway', line: 'nat', text: 'Outbound IPv4 for private subnets; nothing can connect in. A zonal NAT gateway sits in a public subnet in one AZ: create one per AZ and route each private subnet to its own AZ’s gateway.', facts: ['5 Gbps, scales to 100 Gbps', 'No security group; filter with NACLs'], update: 'A **regional** NAT gateway (Nov 2025) expands across AZs automatically and needs no public subnet.', whyNot: [['Internet gateway', 'needs public IPs and lets the internet in'], ['NAT instance', 'you patch and scale it; disable source/dest check']] },
      eigw: { title: 'Egress-only internet gateway', line: 'nat', text: 'Stateful, outbound-only for IPv6. Route `::/0` to it.', whyNot: [['NAT gateway', 'IPv6 needs no translation']] },
      saas: { title: 'VPC endpoint service (PrivateLink)', line: 'pl', text: 'The provider puts the service behind a Network Load Balancer (or a Gateway Load Balancer for appliances) and creates an endpoint service; each consumer creates an interface endpoint. One direction, one service, and overlapping CIDRs do not matter.', whyNot: [['VPC peering', 'exposes whole networks; fails on overlap'], ['Transit gateway', 'routes networks; cannot route overlapping ranges']] },
      peer: { title: 'VPC peering', line: 'peer', text: 'One connection per pair; no hourly charge; data within one AZ is free. Not transitive, no edge-to-edge, no overlapping CIDRs.', whyNot: [['Transit gateway', 'attachment-hours + per-GB for a pair: prestige distractor']] },
      tgw: { title: 'Transit Gateway', line: 'tgw', text: 'One hub per Region; each VPC, VPN and DX gateway attaches once. TGW route tables segment traffic. Share across accounts with AWS RAM.', whyNot: [['Full mesh peering', 'N×(N−1)/2 connections and route entries']] }
    }
  };

  S.learn = [
    /* ---------------------------------------------------------------- 1 */
    { id: 'ch1', title: 'How to read a networking question', domains: 'D1 D2 D3 D4', blocks: [
      'Networking is the cluster where you lose points in two different ways. Sometimes a single fact is missing (peering is not transitive). More often, an option contains a big, modern-sounding service — Transit Gateway, Global Accelerator, Network Firewall — and it wins because it sounds like what a senior architect would pick. This chapter is the reading habit that stops both.',
      { h: 'Your record on this cluster' },
      { table: { head: ['Question', 'Scenario in one line', 'What pulled you', 'Real cause'], rows: [
        ['Q7', 'VPC-A peered with B and with C; B must reach C', 'routing B → C through A', '**F** peering is not transitive'],
        ['Q46', 'admins must SSH to private instances through a bastion', 'bastion in the private subnet', '**R** misread which subnet is public'],
        ['6 others', 'various', 'Transit Gateway, Global Accelerator, Network Firewall …', '**C** prestige distractor: no role in the scenario']] } },
      { callout: 'In 6 baseline misses you chose an option containing a service with no job in the scenario. Three of those services live in this session: **Transit Gateway**, **Global Accelerator**, **Network Firewall**. Every drill below has at least one of them as a distractor or as the real answer, so you learn when each one earns its place.', kind: 'miss', title: 'Your misses' },
      { h: 'Every networking question is about two ends' },
      'Strip the story until you can say: **traffic goes from X to Y**. The two ends decide the family of answers before you read any option:',
      { table: { head: ['The two ends', 'Family of answers'], key: true, rows: [
        ['internet ↔ VPC', 'internet gateway, NAT gateway, egress-only IGW, bastion, public subnet'],
        ['inside one VPC', 'subnets, route tables, security groups, NACLs, Reachability Analyzer'],
        ['VPC ↔ VPC', '{peer|VPC peering}, {tgw|Transit Gateway}, (shared VPC via RAM)'],
        ['on-prem ↔ AWS', '{vpn|Site-to-Site VPN}, {dx|Direct Connect}, Client VPN, DX gateway'],
        ['VPC → a service', '{pl|gateway endpoint}, {pl|interface endpoint}, PrivateLink endpoint service']] } },
      { h: 'The stub for this session' },
      'Session 1’s slots (size, time, protocol) don’t describe networks, so this session uses four new ones. They are chosen because each one kills a different set of distractors:',
      { table: { head: ['Slot', 'Ask', 'Values', 'What it kills'], rows: [
        ['WHO ↔ WHO', 'Which two ends does the traffic join?', '`internet↔VPC` · `inside one VPC` · `VPC↔VPC` · `on-prem↔AWS` · `VPC→service`', 'every answer from another family (a DX answer to an S3-endpoint question)'],
        ['SCALE', 'One pair, or many joined through a hub?', '`one pair` · `many / hub` · `n/a`', 'Transit Gateway for one pair; peering for forty VPCs'],
        ['PATH', 'What does the traffic ride on?', '`public internet` · `encrypted tunnel` · `private AWS network` · `dedicated line` · `n/a`', 'DX when encryption is required; NAT when the internet is forbidden'],
        ['SUPERLATIVE', 'What is being optimised?', '`cheapest` · `least ops` · `most secure` · `resilient` · `fastest to set up` · `consistent bandwidth` · `none stated`', 'the answer that works but is not the one asked for']] } },
      { pre: S.method, label: 'The method' },
      { h: 'The prestige-distractor rule, for networking' },
      'For each option, say what the service was **built** for, in one line, before you judge the rest of the sentence:',
      { hooks: [
        ['Transit Gateway', 'a **hub** for many networks. Two VPCs never need it.'],
        ['Global Accelerator', 'static anycast IPs that bring **internet users** to your endpoints faster. Not a private link, not a VPC connector, not a path to S3.'],
        ['Network Firewall', '**deep inspection**: domain lists, IPS signatures, central egress control. Not for blocking one IP range.'],
        ['Direct Connect', 'a **private line**, weeks to provision, **unencrypted** by default.']], label: 'Built for' },
      'If the one-line job does not match the stub, cross the option out, however sensible the rest reads. Chapter 11 drills this on its own.',
      { h: 'Try it on Q7' },
      'Your exam miss. Fill the four slots before looking at any option; the drill makes you do the same.',
      { widget: 'stubTrainer', args: { drill: 'Q7', title: 'Stub trainer · Exam Q7', why: {
        who: 'B and C are both VPCs.',
        scale: 'one new pair: B with C. A is already fine.',
        path: 'VPC-to-VPC traffic stays on the AWS network.',
        sup: '“most cost-effective … least configuration”.' } } },
      { check: { id: 'ch1-q7', src: 'Exam Q7', q: 'Which single fact decides Q7?', opts: [
        { t: 'Peering connections are limited per VPC.', why: 'true, but three VPCs are nowhere near a quota.' },
        { t: 'Peering is not transitive.', why: 'A never forwards between its peers, so B–C needs its own connection.' },
        { t: 'Peering needs DNS resolution enabled.', why: 'only for resolving private hostnames; it does not create routes.' },
        { t: 'Peering only works in one account.', why: 'false: cross-account and cross-Region both work.' }], a: 1,
        why: 'Not transitive. Once you know that, SCALE = one pair and SUPERLATIVE = cheapest point straight at a B–C peering connection, and the transit gateway is a prestige distractor.' } }
    ] },

    /* ---------------------------------------------------------------- 2 */
    { id: 'ch2', title: 'The VPC: addresses, subnets, route tables, the front door', domains: 'D1 D2', blocks: [
      'A VPC is a private IP range in one Region. Everything else in this session is a way to connect that range to something, or to filter what crosses it.',
      { h: 'The address range' },
      { ul: [
        'You give the VPC an IPv4 **CIDR block between /16 and /28**. A /16 is 65,536 addresses; a /28 is 16. Pick private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) and plan them so they **never overlap** with other VPCs or on-prem: overlap later blocks peering and makes hybrid routing painful.',
        'A VPC can grow: by default you can have **5 IPv4 CIDR blocks** per VPC (the primary plus 4 secondary), adjustable up to 50.',
        'IPv6 is optional: the VPC gets a **/56**, each subnet a **/64**. IPv6 addresses are globally unique, so “private” for IPv6 is done with routing and an egress-only gateway, not with address ranges.',
        'At scale, **Amazon VPC IPAM** plans, allocates and tracks CIDRs across accounts and Regions, and flags overlaps.'] },
      { h: 'Subnets and the 5 reserved addresses' },
      'A subnet is a slice of the VPC range that lives in **exactly one Availability Zone**. For high availability you create matching subnets in two or three AZs. Subnets follow the same /16–/28 limits.',
      'AWS keeps **five addresses in every subnet**. In 10.0.0.0/24:',
      { table: { head: ['Address', 'Used for'], rows: [
        ['10.0.0.0', 'network address'], ['10.0.0.1', 'the VPC router'], ['10.0.0.2', 'the Amazon DNS server (base of the VPC + 2)'], ['10.0.0.3', 'reserved for future use'], ['10.0.0.255', 'broadcast (not supported in a VPC, so reserved)']] } },
      'So a /24 gives **251** usable addresses, a /25 gives 123, a /26 gives 59, a /28 gives 11. Exam sizing questions are always “how many do I need, minus 5”.',
      { widget: 'cidrCalc' },
      { h: 'Route tables decide what “public” means' },
      'Every subnet is associated with one route table. Each table starts with a **local** route that covers the whole VPC, which is why any two subnets in a VPC can reach each other without extra routes. Everything else is an explicit route to a target: an internet gateway, a NAT gateway, a peering connection, a transit gateway, a virtual private gateway, a gateway endpoint.',
      { callout: 'A subnet is **public** only because its route table has a route to an **internet gateway** (0.0.0.0/0, or ::/0 for IPv6). A subnet without that route is **private** — and an instance there cannot talk to the internet even if it has a public IP. Attaching an internet gateway to the VPC does nothing until a route table points at it.', kind: 'note', title: 'The rule behind Q46' },
      { h: 'The internet gateway' },
      { ul: [
        'Horizontally scaled, redundant, no bandwidth limit of its own, **no charge** (you pay normal data transfer).',
        'It does the one-to-one NAT between an instance’s private IP and its **public IPv4 or Elastic IP**. No public IP → no internet, even in a public subnet.',
        'Two things are needed for an instance to be reachable from the internet: a **route to the IGW** in its subnet’s route table, and a **public IPv4 / Elastic IP** (plus security group and NACL rules that allow the traffic).'] },
      { check: fromDrill('K2') },
      { check: fromDrill('K1') },
      { drills: ['K1', 'K2'] }
    ] },

    /* ---------------------------------------------------------------- 3 */
    { id: 'ch3', title: 'Getting out without letting anyone in: NAT', domains: 'D1 D2 D4', blocks: [
      'Private instances often need to start connections outward: OS patches, package repositories, a partner’s public API. They must not be reachable from the internet. That one-way door is {nat|NAT}.',
      { h: 'NAT gateway' },
      { ul: [
        'A managed service. Private instances route 0.0.0.0/0 to it; it translates their private IPs to its own public IP and forwards through the internet gateway. **Connections can only start from inside.**',
        'Bandwidth: **5 Gbps, scaling automatically to 100 Gbps**; 1 million packets per second scaling to 10 million. For more, split subnets across several NAT gateways.',
        '**You cannot attach a security group** to a NAT gateway. Filter with the NACL of its subnet and with the instances’ security groups.',
        'Billed per hour and **per GB processed**. That per-GB charge is why S3 traffic through a NAT gateway is an exam cost trap (chapter 8).'] },
      { h: 'Zonal NAT gateway: one per AZ' },
      'The classic NAT gateway is **zonal**: it lives in one AZ, in a **public** subnet, and is redundant only inside that AZ. If every private subnet in three AZs routes to one NAT gateway and its AZ goes down, all of them lose the internet. The resilient pattern is **one NAT gateway per AZ**, and each private subnet routes to the NAT gateway in its own AZ.',
      { callout: 'Since **November 2025** a NAT gateway can be **regional**: one NAT gateway ID that expands automatically to every AZ that has workloads (it can take up to 60 minutes to expand to a new AZ), needs **no public subnet**, and comes with its own route table. Zonal NAT gateways still exist and are required for private NAT. Question banks still describe “one NAT gateway per AZ in a public subnet” — that is still a correct design, just no longer the only one.', kind: 'update' },
      { h: 'NAT instance' },
      'The old way: an EC2 instance that does NAT. You pick its size, patch it, and script its failover. Two exam facts: its **source/destination check must be disabled** (every instance drops traffic not addressed to itself by default), and, unlike a NAT gateway, it **has a security group** and can double as a bastion. The AWS NAT AMI is built on Amazon Linux AMI 2018.03, which is past end of maintenance; AWS recommends moving to NAT gateways.',
      { pair: 'nat' },
      { h: 'IPv6: the egress-only internet gateway' },
      'IPv6 addresses are public by design; there is nothing to translate. To let IPv6 instances out but not in, route `::/0` to an **egress-only internet gateway**. It is stateful, it carries IPv6 only, and it has no security group.',
      { h: 'Triggers' },
      { ul: [
        '“private instances download patches”, “no inbound from the internet” → **NAT gateway**',
        '“survive an AZ failure” → **a NAT gateway per AZ** (or a regional NAT gateway)',
        '“least operational overhead” → **NAT gateway**, not instance',
        '“NAT instance stopped forwarding” → **source/destination check**',
        '“IPv6, outbound only” → **egress-only internet gateway**'] },
      { callout: '**NAT for inbound traffic.** A NAT gateway never forwards a connection that starts outside. “Allow the internet to reach private instances” is a load balancer in a public subnet, or an access service — never NAT.', kind: 'note', title: 'Trap' },
      { check: fromDrill('K3') },
      { check: fromDrill('K4') },
      { drills: ['K3', 'K4', 'K15'] }
    ] },

    /* ---------------------------------------------------------------- 4 */
    { id: 'ch4', title: 'Filtering: security groups and network ACLs', domains: 'D1', blocks: [
      'Two filters sit on every path into an instance, and they behave differently in exactly the ways the exam tests.',
      { table: { head: ['', 'Security group', 'Network ACL'], key: true, rows: [
        ['Attached to', 'the instance’s network interface (ENI)', 'the subnet: every instance in it'],
        ['Rules', '**allow only**', '**allow and deny**'],
        ['Order', 'all rules are evaluated together', 'numbered; **lowest matching number wins**, the rest are ignored'],
        ['State', '**stateful**: the reply to allowed traffic is allowed automatically', '**stateless**: the reply is checked like a new packet'],
        ['Default', 'new SG: no inbound, all outbound', 'default NACL: allow all; a new custom NACL: deny all (the `*` rule)'],
        ['Can name', 'CIDRs, prefix lists, **other security groups**', 'CIDRs only']] } },
      { h: 'Ephemeral ports' },
      'When a client connects to your server on 443, the client picks a random **source** port from its ephemeral range. The server’s reply goes back **to that port**. A security group remembers the connection and lets the reply out. A NACL does not: it needs an **outbound** rule that allows the client’s ephemeral range. Ranges differ by OS (Linux uses 32768–61000, Windows Server 2008+ uses 49152–65535, ELB and NAT gateways use 1024–65535), so the safe rule is **1024–65535**.',
      'The mirror case: when an instance **starts** a connection (downloading a patch), the reply comes **in** to the instance’s ephemeral port, so the NACL needs an **inbound** rule for 1024–65535.',
      { widget: 'packetWalker' },
      { h: 'Three patterns the exam loves' },
      { ol: [
        '**Block an IP range** → a NACL **deny** rule numbered **before** the allow rules. A security group cannot deny.',
        '**Only the web tier may call the app tier** → an app-tier SG rule whose source is the **web-tier security group**. It follows membership, so it survives Auto Scaling.',
        '**“The SG allows it but it still fails”** → look at the NACL, especially ephemeral ports and rule order.'] },
      { pair: 'sg-nacl' },
      { callout: '**AWS Network Firewall to block one IP range.** It works, but it is a managed firewall with its own subnets, endpoints and hourly charges. A NACL deny rule does the same job for free. Network Firewall earns its place only with domain lists, IPS signatures or central inspection (chapter 11).', kind: 'note', title: 'Prestige trap' },
      { check: fromDrill('K5') },
      { check: fromDrill('K6') },
      { check: fromDrill('K7') },
      { drills: ['K5', 'K6', 'K7'] }
    ] },

    /* ---------------------------------------------------------------- 5 */
    { id: 'ch5', title: 'Getting in to manage instances: bastion, Session Manager, EIC Endpoint', domains: 'D1', blocks: [
      'Private instances have no public IP and no route from the internet. Administrators still need a shell. There are three ways, and the exam uses all three.',
      { h: 'The bastion host (what Q46 tested)' },
      'A bastion (jump box) is a small, hardened EC2 instance that admins SSH to first, then hop from to the private instances. For that to work, admins must be able to reach it, so it goes in a **public subnet** with a public IP.',
      { widget: 'stepper', args: { title: 'Build a bastion that passes the exam', line: 'access', steps: [
        { title: 'Put it in a PUBLIC subnet', text: 'The subnet’s route table has 0.0.0.0/0 → internet gateway. Give the bastion a public IPv4 or Elastic IP. In a private subnet it is unreachable, Elastic IP or not — the mistake in Q46.' },
        { title: 'Lock the bastion’s security group to your range', text: 'Inbound TCP 22 **only from the corporate IP range** (for example 203.0.113.0/24). Never 0.0.0.0/0.' },
        { title: 'Let the private instances trust only the bastion', text: 'In the application servers’ security group, allow TCP 22 with the **bastion’s security group as the source**. Nothing else can SSH to them.' },
        { title: 'Harden and watch it', text: 'Minimal OS, patched, no other software; one bastion (or one per AZ for resilience). Log who connects.', note: 'Today AWS prefers not to run a bastion at all: Session Manager or EC2 Instance Connect Endpoint remove the public host entirely.' }] } },
      { callout: '**Q46.** You placed the bastion in a private subnet. The fix is a reading habit: the moment a question says “bastion”, ask **which subnet has the route to the internet gateway** — that is where the bastion goes.', kind: 'miss', title: 'Your misses' },
      { h: 'Session Manager' },
      'Part of AWS Systems Manager. The SSM Agent on the instance opens an outbound connection to Systems Manager; you get a shell in the console or CLI, authorised by IAM. **No inbound ports, no SSH keys, no bastion**, and every session can be **logged to S3 or CloudWatch Logs**. Private instances need a path to Systems Manager: interface endpoints (chapter 8) or a NAT gateway. It can also port-forward to an RDS database through an instance.',
      { h: 'EC2 Instance Connect Endpoint' },
      'An identity-aware TCP proxy you create in a subnet. You SSH or RDP to an instance’s **private IP** from your laptop; the tunnel is authenticated and authorised with IAM before it reaches the VPC. No public IP and no bastion — but the instances’ security group still allows port 22 (or 3389) **from the endpoint**.',
      { pair: 'access' },
      { callout: 'Banks still ask where the bastion goes (public subnet). For “no open ports, no keys, audit”, the current answer is **Session Manager**; for “native SSH to a private IP, no bastion”, **EC2 Instance Connect Endpoint**.', kind: 'update' },
      { check: fromDrill('Q46', 'Exam Q46') },
      { check: fromDrill('K25') },
      { drills: ['Q46', 'K25'] }
    ] },

    /* ---------------------------------------------------------------- 6 */
    { id: 'ch6', title: 'VPC to VPC, one pair at a time: peering', domains: 'D1 D2 D4', blocks: [
      '{peer|VPC peering} joins exactly two VPCs so that instances in either can reach the other using private IPs, as if they were one network. It is the simplest and cheapest VPC-to-VPC link.',
      { h: 'What it can do' },
      { ul: [
        'Same account or **another account**; same Region or **another Region** (traffic stays on the AWS backbone).',
        '**No charge to create it.** Data inside one AZ is free, even between accounts; crossing AZs or Regions is charged per GB.',
        'No gateway, no single point of failure, no bandwidth bottleneck.',
        'You add routes on **both sides** (the peer’s CIDR → the peering connection) and open the security groups.'] },
      { h: 'The three rules it can’t break' },
      { ol: [
        '**Not transitive.** If A is peered with B and A is peered with C, B and C have **no** relationship. A will not forward between them. B↔C needs its own peering connection.',
        '**No edge-to-edge routing.** Through a peering connection, B **cannot** use A’s internet gateway, NAT gateway, VPN connection, Direct Connect connection or S3 gateway endpoint.',
        '**No overlapping CIDRs.** If any IPv4 or IPv6 CIDR overlaps, the peering request fails — even if you only meant to use the non-overlapping parts.'] },
      { callout: '**Q7** was rule 1. The mental image: a peering connection is a **wire with two plugs**, not a network. Nothing ever travels **through** a VPC to reach another.', kind: 'miss', title: 'Your misses' },
      { h: 'Simulate it' },
      'Start with B → C over peering. Then add the B–C peering. Then try B → on-prem and B → internet: those are the edge-to-edge cases. Finally switch the wiring to a transit gateway and try the same paths.',
      { widget: 'routeSim' },
      { h: 'How many connections?' },
      'Full-mesh peering of N VPCs needs **N×(N−1)/2** connections, and every VPC’s route table needs an entry for every other. 3 VPCs = 3 connections. 10 VPCs = 45. 40 VPCs = 780. Somewhere past a handful, “unmanageable” appears in the question and the answer becomes a hub (next chapter).',
      { check: fromDrill('Q7', 'Exam Q7') },
      { check: fromDrill('K16') },
      { drills: ['Q7', 'K14', 'K16'] }
    ] },

    /* ---------------------------------------------------------------- 7 */
    { id: 'ch7', title: 'Many networks: Transit Gateway', domains: 'D2 D3 D4', blocks: [
      'A {tgw|transit gateway} is a regional router that you **attach** networks to. Instead of wiring every VPC to every other, each network plugs into the hub once.',
      { h: 'What attaches' },
      { ul: [
        '**VPCs** (in your account or shared from others with **AWS RAM**).',
        '**Site-to-Site VPN** connections: one VPN reaches every attached VPC. VPNs on a TGW support **ECMP** across tunnels and **accelerated VPN**.',
        '**Direct Connect gateways** (through a transit VIF, chapter 10).',
        '**Connect** attachments: GRE tunnels + BGP for SD-WAN appliances.',
        '**Peering** with another transit gateway, including **inter-Region** (static routes).',
        '**Network function** attachments (AWS Network Firewall).'] },
      { h: 'Route tables are the segmentation' },
      'A transit gateway has its own route tables. Each attachment is **associated with exactly one** of them, and attachments **propagate** their routes into tables. That is how you build “dev and prod both reach shared services, but never each other”: dev and prod use a table that only knows shared services; shared services uses a table that knows both. There are **no security groups on a transit gateway** — no route, no path.',
      { h: 'Other things it does' },
      { ul: [
        '**Centralised egress:** spokes send 0.0.0.0/0 to one egress VPC with NAT gateways. Allowed here because the TGW routes it — through peering it would be edge-to-edge.',
        '**Centralised inspection:** route traffic through an inspection VPC with Network Firewall or a Gateway Load Balancer (chapter 11).',
        '**Multicast** between attached VPCs.',
        'Bandwidth: up to 100 Gbps per VPC attachment per AZ.'] },
      { h: 'The bill' },
      'You pay **per attachment per hour** plus **per GB processed**. That is the whole reason it loses to peering for two or three VPCs, and the reason it is a prestige distractor when the question says “two VPCs, lowest cost”.',
      { pair: 'peer-tgw' },
      { h: 'Alternative: share the VPC instead of connecting VPCs' },
      '**VPC sharing** (AWS RAM) lets a central account share **subnets** with other accounts in the same AWS Organization. Participants launch their own resources into those subnets; the network is one VPC, so there is nothing to peer. It fits “many accounts, one tightly-connected application, central network team”.',
      { h: 'Triggers' },
      { ul: [
        '“dozens of VPCs”, “hub-and-spoke”, “full mesh is unmanageable”, “on-prem to every VPC” → **Transit Gateway**',
        '“isolate dev from prod on the same hub” → **TGW route tables**',
        '“connect hubs in two Regions” → **TGW inter-Region peering**',
        '“two or three VPCs, cheapest” → **peering**, not TGW'] },
      { check: fromDrill('K12') },
      { check: fromDrill('K13') },
      { drills: ['K12', 'K13', 'K14'] }
    ] },

    /* ---------------------------------------------------------------- 8 */
    { id: 'ch8', title: 'Reaching AWS services privately: endpoints and PrivateLink', domains: 'D1 D4', blocks: [
      'Most AWS services have **public** endpoints. A private instance can reach them through a NAT gateway, but that sends the traffic toward the internet and pays NAT processing per GB. {pl|VPC endpoints} keep it on the AWS network.',
      { h: 'Gateway endpoints' },
      { ul: [
        'Exist for **Amazon S3 and DynamoDB only**.',
        'Not a network interface: a **route-table target** (a prefix list) that you add to the route tables of the subnets that need it.',
        '**No charge.**',
        'Work only for traffic that starts **inside that VPC**: **not** from on-premises, **not** from a peered VPC in another Region, **not** through a transit gateway.',
        'Control access with an endpoint policy, and in bucket policies with the `aws:SourceVpce` condition.'] },
      { h: 'Interface endpoints (AWS PrivateLink)' },
      { ul: [
        'An **elastic network interface with a private IP** in each subnet you pick. Most AWS services support them — SQS, SNS, KMS, Secrets Manager, Systems Manager, ECR, CloudWatch, STS … and S3 and DynamoDB as well.',
        'With **private DNS**, the service’s normal name resolves to the private IPs, so code does not change.',
        'Because it is an IP in your VPC, it is reachable **from on-premises** over DX or VPN, and from peered or TGW-connected VPCs.',
        'Billed **per hour per AZ plus per GB**.'] },
      { pair: 'endpoints' },
      { callout: 'PrivateLink **cross-Region connectivity** (2025): an interface endpoint can now reach select AWS services (such as S3, Route 53, ECR) and endpoint services in **another Region**. Older material says interface endpoints are same-Region only.', kind: 'update' },
      { h: 'Publishing your own service: endpoint services' },
      'The same technology works for your own services. A provider puts a service behind a **Network Load Balancer** and creates a **VPC endpoint service**; consumers in other VPCs and accounts create **interface endpoints** to it (the provider can require acceptance). Traffic flows one way, to one service. The consumer never sees the provider’s network, and **overlapping CIDRs do not matter**. Gateway Load Balancer endpoint services work the same way for inspection appliances.',
      { pair: 'peer-pl' },
      { h: 'VPC Lattice (recognise it)' },
      'Amazon VPC Lattice is a newer application-layer service network: services (HTTP, HTTPS, gRPC, TCP) across VPCs and accounts discover and call each other with IAM auth policies, without you managing load balancers or peering. It rarely appears in SAA-C03 banks; if it does, the trigger is “service-to-service connectivity across many VPCs and accounts with auth policies, no network plumbing”.',
      { h: 'Choose' },
      { widget: 'chooser', args: { title: 'Endpoint chooser', tree: ENDPOINT } },
      { callout: '**Global Accelerator for private access to S3** or any AWS service. It gives internet users anycast IPs into your endpoints. It never makes traffic from a VPC private. Cross it out.', kind: 'note', title: 'Prestige trap' },
      { check: fromDrill('K8') },
      { check: fromDrill('K9') },
      { check: fromDrill('K11') },
      { drills: ['K8', 'K9', 'K10', 'K11'] }
    ] },

    /* ---------------------------------------------------------------- 9 */
    { id: 'ch9', title: 'On-premises over the internet: Site-to-Site VPN and Client VPN', domains: 'D1 D2', blocks: [
      'The quickest way to join a data center to AWS is an encrypted tunnel over the internet link you already have.',
      { h: 'Site-to-Site VPN' },
      { ul: [
        'Your side: a **customer gateway** (the device or software, plus its public IP). AWS side: a **virtual private gateway** attached to **one VPC**, or a **transit gateway** that reaches **many**.',
        'Each VPN connection has **two IPsec tunnels**, each ending in a **different AZ**. Configure both: AWS maintenance takes one down from time to time and traffic fails over.',
        'Up to **1.25 Gbps per standard tunnel**. On a transit gateway you can aggregate tunnels with **ECMP** (needs BGP); a virtual private gateway does not do ECMP.',
        'Routing: **static**, or **dynamic with BGP** (recommended; needed for ECMP and for fast failover).',
        'Set up in **hours**. Always encrypted.'] },
      { widget: 'stepper', args: { title: 'Site-to-Site VPN, step by step', line: 'vpn', steps: [
        { title: 'Customer gateway', text: 'Register your on-prem device: its public IP and (for BGP) its ASN.' },
        { title: 'AWS side: VGW or TGW', text: 'A **virtual private gateway** attached to the VPC for one VPC, or a **transit gateway** when the VPN must reach many VPCs (and for ECMP, acceleration, large bandwidth tunnels).' },
        { title: 'VPN connection: two tunnels', text: 'AWS creates **two IPsec tunnels** in two AZs. Download the configuration for your device and bring up **both**.' },
        { title: 'Routes', text: 'Enable **route propagation** from the VGW into the VPC route tables (or add static routes), and on-prem routes toward the tunnels. With BGP, both sides learn routes automatically.' },
        { title: 'Security groups and NACLs', text: 'Allow the on-prem CIDR in. The tunnel carries packets; the filters still decide.' }] } },
      { callout: '**Large Bandwidth Tunnels** — up to **5 Gbps per tunnel** — exist for VPN connections on a transit gateway or Cloud WAN. Standard tunnels are still 1.25 Gbps and are what banks quote.', kind: 'update' },
      { h: 'Variants the exam names' },
      { ul: [
        '**Accelerated Site-to-Site VPN**: enters the AWS network at the nearest edge location (Global Accelerator underneath). **Transit gateway only.** Trigger: “VPN performance from far away”.',
        '**VPN CloudHub**: several branch offices, each with a VPN to the **same virtual private gateway**, unique BGP ASNs, non-overlapping ranges; the VGW re-advertises routes so **branches reach each other**. Cheap hub-and-spoke over existing internet links.',
        '**AWS Client VPN**: a managed, OpenVPN-based service for **people** — laptops at home or travelling — to reach VPCs and, through them, on-prem. Authenticates with Active Directory, certificates or SAML.',
        '**VPN as a DX backup**: the cheap second path (chapter 10).'] },
      { callout: '**Global Accelerator as a hybrid link.** Accelerated VPN uses it internally, but “use Global Accelerator to connect the data center” is never the answer.', kind: 'note', title: 'Prestige trap' },
      { check: fromDrill('K17') },
      { check: fromDrill('K18') },
      { drills: ['K17', 'K18', 'K19'] }
    ] },

    /* ---------------------------------------------------------------- 10 */
    { id: 'ch10', title: 'On-premises over a private line: Direct Connect', domains: 'D1 D2 D3 D4', blocks: [
      '{dx|Direct Connect} is a physical, private network connection from your data center to AWS, through a **Direct Connect location** (a colocation facility where AWS has routers). It does not touch the internet, so latency and throughput are **consistent**.',
      { h: 'Connection types' },
      { table: { head: ['Type', 'Speeds', 'How you get it'], key: true, rows: [
        ['Dedicated', '**1, 10, 100, 400 Gbps** ports', 'request a port from AWS, get a Letter of Authorization (LOA-CFA), order a cross-connect at the DX location'],
        ['Hosted', '**50 Mbps to 25 Gbps** (50, 100, 200, 300, 400, 500 Mbps; 1, 2, 5, 10, 25 Gbps)', 'through an AWS Direct Connect Partner, which provisions it on its own port; you accept it']] } },
      { h: 'Lead time' },
      'AWS’s own hybrid-connectivity whitepaper puts a **net-new dedicated connection at several weeks to months**; a dedicated port when your equipment is already in the DX location at days; a hosted connection on a partner’s existing port at hours to days. The exam shortcut stays: **“within a week” is never a new Direct Connect.**',
      { h: 'Virtual interfaces (VIFs)' },
      { table: { head: ['VIF', 'Reaches'], key: true, rows: [
        ['Private VIF', 'one VPC’s virtual private gateway (same Region) — or, through a **Direct Connect gateway**, VGWs in any Region and account'],
        ['Transit VIF', 'one or more **transit gateways** through a Direct Connect gateway'],
        ['Public VIF', 'AWS **public** endpoints (S3, DynamoDB public endpoints, VPN endpoints) over the private line']] } },
      { h: 'Direct Connect gateway' },
      'A **global** resource. One DX connection + one private (or transit) VIF to a DX gateway reaches VPCs in **many Regions and accounts** (not China). It does **not** route traffic between the VPCs associated with it — for VPC-to-VPC use peering or a transit gateway.',
      { h: 'Encryption: not by default' },
      'Direct Connect **does not encrypt traffic in transit by default**. Two ways to add it:',
      { ul: [
        '**MACsec** (IEEE 802.1AE): layer-2, point-to-point encryption on **10, 100 and 400 Gbps dedicated** connections at supported locations. Not on 1 Gbps or hosted connections.',
        '**IPsec VPN over DX**: a Site-to-Site VPN over a **public VIF**, or a **Private IP VPN** over a transit VIF to a transit gateway. End-to-end encryption with DX’s consistency (tunnels still have per-tunnel limits).'] },
      { h: 'Resilience' },
      'One connection is one fibre and one device. The **Direct Connect Resiliency Toolkit** offers three models:',
      { table: { head: ['Model', 'Design', 'Survives'], key: true, rows: [
        ['Maximum Resiliency', 'separate connections on separate devices in **more than one location**', 'device, fibre and whole-location failure (99.99% SLA model)'],
        ['High Resiliency', 'one connection at each of **two locations**', 'fibre cut, device failure, location failure (99.9% SLA model)'],
        ['Development and Test', 'two connections on separate devices in **one location**', 'device failure only']] } },
      'The **low-cost** backup is a **Site-to-Site VPN** over the internet, with BGP preferring DX. AWS advises it for DX connections up to about 1 Gbps, because standard tunnels carry up to 1.25 Gbps.',
      { h: 'SiteLink' },
      '**Direct Connect SiteLink** sends traffic **between your own sites** across the AWS backbone, from one DX location to another, without entering an AWS Region. Trigger: “connect our offices to each other using our DX connections”.',
      { h: 'Choose, with the numbers' },
      { widget: 'hybridCalc' },
      { pair: 'vpn-dx' },
      { check: fromDrill('K20') },
      { check: fromDrill('K21') },
      { check: fromDrill('K24') },
      { drills: ['K20', 'K21', 'K22', 'K23', 'K24'] }
    ] },

    /* ---------------------------------------------------------------- 11 */
    { id: 'ch11', title: 'Inspection, troubleshooting, and the prestige distractors', domains: 'D1 D3', blocks: [
      'This chapter covers the services that are **right sometimes** and **tempting always**. Learn the words that earn them.',
      { h: '{inspect|AWS Network Firewall}' },
      'A managed, stateful network firewall that you put in the path with firewall endpoints in dedicated subnets, often in a central **inspection VPC** behind a transit gateway. It does what SGs and NACLs cannot: **domain allow/deny lists** (HTTP host header, TLS SNI), **Suricata-compatible IPS rules**, stateful protocol inspection, central policy. **Earning words:** intrusion prevention, only approved domains, deep packet inspection, centralised inspection.',
      { h: '{inspect|Gateway Load Balancer}' },
      'Inserts **your own (third-party) virtual appliances** — firewalls, IDS/IPS — transparently into the traffic path and scales them. It works at layer 3, listens on all ports, and exchanges traffic with appliances using **GENEVE on port 6081**. Other VPCs send traffic to it through **Gateway Load Balancer endpoints** as a route-table next hop. **Earning words:** we already license vendor X, third-party appliances, transparent, scale the fleet.',
      { pair: 'nfw-gwlb' },
      { h: 'Troubleshooting tools' },
      { ul: [
        '**VPC Flow Logs** capture IP traffic metadata (source, destination, ports, protocol, ACCEPT/REJECT) for a VPC, subnet or ENI, to CloudWatch Logs, S3 or Firehose. No packet contents; no impact on performance. Trigger: “which traffic was rejected”, “who talks to this instance”.',
        '**VPC Reachability Analyzer** builds a model of your configuration and tells you whether a path from a source to a destination is reachable, and which component blocks it. **It sends no packets.** Trigger: “why can’t A reach B, without generating traffic”.',
        '**CloudTrail** records API calls (who changed the security group), not traffic.',
        'DNS across the boundary is **Route 53 VPC Resolver** inbound/outbound endpoints — Session 2, chapter 9. [[../02-migration/#learn/ch9|Session 2, hybrid DNS →]]'] },
      { h: 'The prestige distractors, one line each' },
      { table: { head: ['Service', 'Built for', 'Crossed out when'], key: true, rows: [
        ['Transit Gateway', 'hub for many networks', 'two or three VPCs; “cheapest”'],
        ['Global Accelerator', 'internet users → your endpoints via static anycast IPs, fast Regional failover (Session 4 goes deep)', 'anything private: VPC↔VPC, VPC→S3, on-prem links'],
        ['Network Firewall', 'domains, IPS, central inspection', 'block one IP range; encrypt a link'],
        ['Direct Connect', 'consistent private line, weeks', 'deadline in days; “encrypted” with nothing added'],
        ['Interface endpoint', 'private access to most services, from anywhere routable', 'S3/DynamoDB from inside the VPC at lowest cost (gateway endpoint)']] } },
      { widget: 'sorter', args: { title: 'Needed or prestige?', lead: 'Each line pairs a requirement with a service. Is the service the job, or a senior-sounding distractor?', buckets: [{ id: 'need', short: 'needed', label: 'Built for this requirement' }, { id: 'pres', short: 'prestige', label: 'Prestige distractor here' }], items: [
        { t: 'Two VPCs in one account must share a database, lowest cost → Transit Gateway', b: 'pres', why: 'one pair: peering.' },
        { t: '40 VPCs and two data centers, all-to-all → Transit Gateway', b: 'need', why: 'the hub is the job.' },
        { t: 'Private instances read S3 without the internet → Global Accelerator', b: 'pres', why: 'gateway endpoint.' },
        { t: 'Game clients worldwide need two static IPs and fast failover between Regions → Global Accelerator', b: 'need', why: 'exactly what it was built for.' },
        { t: 'Block one IP range from a public subnet → Network Firewall', b: 'pres', why: 'NACL deny rule.' },
        { t: 'Allow outbound traffic only to approved domains, with IPS, for 30 VPCs → Network Firewall', b: 'need', why: 'domain lists + IPS + central.' },
        { t: 'Encrypt traffic over an existing Direct Connect link → Network Firewall', b: 'pres', why: 'MACsec or VPN over DX.' },
        { t: 'Our licensed third-party firewalls must sit transparently in the path → Gateway Load Balancer', b: 'need', why: 'your appliances, transparent, scaled.' }] } },
      { check: fromDrill('K26') },
      { check: fromDrill('K28') },
      { drills: ['K26', 'K27', 'K28'] }
    ] },

    /* ---------------------------------------------------------------- 12 */
    { id: 'ch12', title: 'Triggers, traps, cheat block and record', blocks: [
      'The whole session on one map: tap a line to see what it was built for, its triggers, its traps and your misses on it.',
      { map: true },
      { widget: 'triggerTable' },
      { link: '#traps', text: 'All 15 traps, each linked to the drills that test it →' },
      { pre: S.cheat, label: 'Cheat block · copy it by hand' },
      { h: 'Your record' },
      { log: true },
      'Q7 and Q46 are your baseline misses and are marked as yours in the drill. Run the 30 scenarios once; your new misses appear in Progress.',
      { link: '#drill', text: 'Go to the drill (30 scenarios)', btn: true }
    ] }
  ];
})();
