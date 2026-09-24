/* Session 3 — Networking & connectivity: meta, lines, network map, stub, method, cheat sheet, compare, traps, log.
   Colour rule: a service keeps its colour on every page. Three new hues for the most-confused families:
   Direct Connect (--dx magenta), Transit Gateway (--tgw teal), VPC endpoints / PrivateLink (--pl olive).
   Everything else is an ink line (4 px) with its own dash pattern and station shape.
   Facts: docs/session-03-networking.md, "Facts verified 2026-09-24". */
(function () {
  'use strict';
  const S = (window.SESSION = window.SESSION || {});
  const INK = 'fill:var(--surface);stroke:var(--ink);stroke-width:3';
  const FONT = 'Atkinson Hyperlegible, sans-serif';
  const T = (x, y, text, lines, o) => ({ el: 'text', [o && o.pick ? 'pick' : 'lines']: lines, a: Object.assign({ x, y, 'font-size': 13, 'font-weight': 700, 'font-family': FONT }, (o && o.a) || {}), style: 'fill:var(--ink)', text });
  const sub = (x, y, text, lines, anchor) => ({ el: 'text', lines, a: { x, y, 'font-size': 11.5, 'font-family': FONT, 'text-anchor': anchor || null }, style: 'fill:var(--ink2)', text });
  const shape = (d, lines, pick) => Object.assign({ lines: pick ? undefined : lines, pick: pick ? lines : undefined, style: INK }, d);
  const circle = (cx, cy, lines, pick) => shape({ el: 'circle', a: { cx, cy, r: 8 } }, lines, pick);
  const square = (cx, cy, lines, pick) => shape({ el: 'rect', a: { x: cx - 8, y: cy - 8, width: 16, height: 16 } }, lines, pick);
  const diamond = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx} ${cy - 10} L${cx + 10} ${cy} L${cx} ${cy + 10} L${cx - 10} ${cy} Z` } }, lines, pick);
  const triangle = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx} ${cy - 10} L${cx + 10} ${cy + 7} L${cx - 10} ${cy + 7} Z` } }, lines, pick);
  const hexa = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx - 5} ${cy - 9} H${cx + 5} L${cx + 10} ${cy} L${cx + 5} ${cy + 9} H${cx - 5} L${cx - 10} ${cy} Z` } }, lines, pick);
  const pill = (x, y, w, hgt, lines) => ({ el: 'rect', lines, a: { x, y, width: w, height: hgt, rx: hgt / 2 }, style: INK });
  /* box and subnet labels are drawn after the lines, with a surface halo, so a line never crosses their text */
  const HALO = ';paint-order:stroke;stroke:var(--surface);stroke-width:5px;stroke-linejoin:round';
  const LABELS = [];
  const box = (x, y, w, hgt, label, dashed) => {
    LABELS.push({ el: 'text', a: { x: x + 10, y: y + 18, 'font-size': 11, 'font-weight': 800, 'letter-spacing': 1 }, style: 'fill:var(--ink2)' + HALO, text: label });
    return [{ el: 'rect', a: { x, y, width: w, height: hgt, rx: 8 }, style: 'fill:var(--surface);stroke:var(--chip-border);stroke-width:1.5' + (dashed ? ';stroke-dasharray:5 4' : '') }];
  };
  const subnet = (x, y, w, hgt, label) => {
    LABELS.push({ el: 'text', a: { x: x + 8, y: y + 15, 'font-size': 10.5, 'letter-spacing': .5, 'font-family': FONT }, style: 'fill:var(--ink2)' + HALO, text: label });
    return [{ el: 'rect', a: { x, y, width: w, height: hgt, rx: 6 }, style: 'fill:none;stroke:var(--chip-border);stroke-width:1;stroke-dasharray:4 4' }];
  };
  const zoneLabel = (x, y, t, anchor) => ({ el: 'text', a: { x, y, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5, 'text-anchor': anchor || null }, style: 'fill:var(--ink2)', text: t });
  const chev = (d, v) => ({ el: 'path', a: { d, fill: 'none', style: 'stroke:var(' + v + ');stroke-width:4;stroke-linecap:round;stroke-linejoin:round' } });

  Object.assign(S, {
    meta: { id: '03-networking', n: 3, title: 'Networking & Connectivity', brand: 'Network Transit Map', home: '../../', updated: '2026-09-24' },

    lines: [
      { id: 'vpc', name: 'VPC · subnets · IGW', short: 'VPC', cls: 'ink', width: 4, alias: ['internet gateway', 'IGW', 'route table', 'CIDR', 'subnet'],
        verb: 'draws the network and its front door', from: 'CIDR → subnets → route tables → internet gateway',
        built: 'The **ground floor**. A VPC is a private IP range (/16 to /28) in one Region, cut into subnets that each live in one AZ. A subnet is **public only because its route table sends 0.0.0.0/0 to an internet gateway**, and an instance there still needs a public IP. Every subnet loses **5 addresses** to AWS.',
        says: ['public subnet', 'private subnet', 'route table', 'internet gateway', 'CIDR', 'how many IP addresses'],
        switch: [{ to: 'nat', when: 'private instances only need to get out' }, { to: 'filter', when: 'the route is there but traffic still dies' }],
        traps: ['“The subnet has an internet gateway” — IGWs attach to the VPC; the route table decides who is public.', 'Forgetting the 5 reserved addresses when sizing a subnet.'] },
      { id: 'access', name: 'Bastion · Session Manager', short: 'Access', cls: 'ink', width: 4, dash: '2 7', alias: ['bastion', 'Session Manager', 'Instance Connect', 'jump'],
        verb: 'lets admins in to private instances', from: 'admin → (bastion in a PUBLIC subnet | SSM | EIC Endpoint) → private instance',
        built: 'The **admin door**. A bastion is a hardened host in a **public** subnet that admins SSH to, then hop to private instances. Today AWS prefers **Session Manager** (no inbound ports, no SSH keys, logged sessions) or **EC2 Instance Connect Endpoint** (SSH/RDP to a private IP, authorised by IAM, no public IP).',
        says: ['bastion host', 'jump box', 'no inbound SSH', 'no SSH keys', 'audit sessions', 'private IP only'],
        switch: [{ to: 'vpc', when: 'the question is really which subnet is public' }, { to: 'vpn', when: 'many users need network access, not a shell' }],
        misses: '**Q46** (exam, 2 Sept): you put the bastion in a private subnet. A private subnet has no route to the internet gateway, so nobody outside can reach it, Elastic IP or not.',
        traps: ['Bastion in a private subnet (Q46).', 'Opening SSH to 0.0.0.0/0 on the application servers instead of only from the bastion’s security group.'],
        update: 'Question banks still expect a bastion in a public subnet. AWS’s current guidance for new designs is **Session Manager** or **EC2 Instance Connect Endpoint**: no public bastion at all.' },
      { id: 'nat', name: 'NAT gateway', short: 'NAT', cls: 'ink', width: 4, dash: '10 6', alias: ['NAT gateway', 'NAT instance', 'egress-only'],
        verb: 'lets private subnets out, never in', from: 'private subnet → NAT → internet gateway → internet',
        built: 'The **one-way door**. A NAT gateway lets instances without public IPs start connections to the internet; nothing on the internet can start one back. A classic (zonal) NAT gateway lives in **one AZ** in a public subnet: one per AZ for resilience. IPv6 uses an **egress-only internet gateway** instead.',
        says: ['download patches', 'private subnet needs internet', 'outbound only', 'no inbound connections', 'IPv6 outbound only'],
        switch: [{ to: 'pl', when: 'the destination is an AWS service (S3, DynamoDB, SQS …)' }, { to: 'vpc', when: 'the instance must also accept inbound traffic' }],
        traps: ['NAT for inbound traffic: it only carries connections the instance started.', 'One zonal NAT gateway for every AZ: that AZ fails, everyone loses the internet.', 'Paying NAT data processing to reach S3 when a free gateway endpoint exists.'],
        update: 'Since Nov 2025 a NAT gateway can be **regional**: one NAT gateway that expands to every AZ with workloads, needs **no public subnet**, and has its own route table. Zonal NAT gateways still exist (and are required for private NAT). Banks still say “one NAT gateway per AZ in a public subnet”.' },
      { id: 'filter', name: 'Security groups · NACLs', short: 'Filter', cls: 'ink', width: 4, alias: ['security group', 'network ACL', 'NACL'],
        verb: 'decides which packets may pass', from: 'NACL at the subnet edge → SG at the instance',
        built: 'Two filters. A **security group** sits on the instance’s network interface: **allow rules only, stateful** (replies go back automatically). A **network ACL** sits on the subnet: **allow and deny, numbered rules, lowest number wins, stateless** (you must allow the return traffic, usually ephemeral ports 1024–65535).',
        says: ['block an IP address', 'deny rule', 'stateless', 'stateful', 'ephemeral ports', 'only from the web tier'],
        switch: [{ to: 'inspect', when: 'you need domain names, IPS signatures or third-party appliances' }],
        traps: ['A deny rule in a security group: impossible.', 'A NACL deny numbered after the allow that matches first.', 'A custom NACL without outbound ephemeral ports.'] },
      { id: 'peer', name: 'VPC peering', short: 'Peering', cls: 'ink', width: 4, dash: '1 9', alias: ['peering'],
        verb: 'wires exactly two VPCs together', from: 'VPC ⇄ VPC · same or other account · same or other Region',
        built: 'A **private wire between two VPCs**. No hourly charge, no bandwidth bottleneck, works across accounts and Regions. **Not transitive**: A–B and A–C does not give B–C. **No edge-to-edge**: B cannot use A’s internet gateway, NAT, VPN, Direct Connect or gateway endpoint. **No overlapping CIDRs.**',
        says: ['two VPCs', 'cross-account', 'inter-Region', 'lowest cost', 'no single point of failure'],
        switch: [{ to: 'tgw', when: 'many VPCs, or on-prem, must all reach each other' }, { to: 'pl', when: 'only one service should be exposed, or CIDRs overlap' }],
        misses: '**Q7** (exam, 2 Sept): you assumed traffic could pass through a peered VPC. Peering is not transitive.',
        traps: ['Transitive peering (Q7).', 'Using a peer’s NAT gateway, internet gateway, VPN or DX (edge-to-edge).', 'Peering VPCs whose CIDRs overlap.'] },
      { id: 'tgw', name: 'Transit Gateway', short: 'TGW', cls: 'tgw', textVar: 'tgw-text', alias: ['Transit Gateway', 'TGW'],
        verb: 'is the hub every network plugs into', from: 'many VPCs + VPN + Direct Connect gateway → one regional router',
        built: 'A **regional router you attach networks to**: VPCs, VPN connections, Direct Connect gateways, Connect (SD-WAN), other transit gateways (inter-Region peering). **Route tables on the TGW** decide who reaches whom, so you can segment dev from prod. You pay **per attachment per hour plus per GB processed**.',
        says: ['dozens of VPCs', 'hub-and-spoke', 'full mesh is unmanageable', 'on-prem to all VPCs', 'centralised egress / inspection', 'isolate dev from prod'],
        switch: [{ to: 'peer', when: 'there are only two or three VPCs and cost matters' }, { to: 'dx', when: 'the question is about the physical link to on-prem' }],
        traps: ['Transit Gateway for two VPCs: works, costs attachment-hours and per-GB for nothing (prestige distractor).', 'Security groups on a transit gateway: segmentation is done with TGW route tables.'] },
      { id: 'pl', name: 'VPC endpoints · PrivateLink', short: 'Endpoints', cls: 'pl', alias: ['gateway endpoint', 'interface endpoint', 'PrivateLink', 'endpoint service'],
        verb: 'reaches a service without the internet', from: 'private subnet → endpoint → S3 · DynamoDB · SQS · KMS · your SaaS',
        built: 'Two kinds. A **gateway endpoint** is a route-table target for **S3 and DynamoDB only**, and it is **free**; it works only from inside that VPC. An **interface endpoint** (PrivateLink) is an ENI with a private IP in your subnet for **most AWS services, S3 included, and for services other accounts publish behind an NLB**; you pay per hour per AZ plus per GB, and it can be reached from on-prem and peered or TGW-connected VPCs.',
        says: ['without traversing the internet', 'no NAT gateway', 'private connectivity to S3', 'expose a service to other VPCs', 'overlapping CIDRs', 'SaaS provider'],
        switch: [{ to: 'nat', when: 'the destination is the public internet, not an AWS service' }, { to: 'peer', when: 'whole networks must talk, both directions' }],
        traps: ['Gateway endpoint for SQS, KMS or any service other than S3/DynamoDB.', 'Gateway endpoint used from on-prem, another Region or through a TGW.', 'Interface endpoint for S3 when only in-VPC access is needed and cost matters.'],
        update: 'Interface endpoints can now reach **select AWS services and endpoint services in other Regions** (PrivateLink cross-Region connectivity, 2025). Older material says “same Region only”.' },
      { id: 'vpn', name: 'Site-to-Site VPN · Client VPN', short: 'VPN', cls: 'ink', width: 4, dash: '12 8', alias: ['Site-to-Site', 'Client VPN', 'CloudHub', 'VPN'],
        verb: 'encrypts a tunnel over the internet', from: 'customer gateway ⇄ 2 IPsec tunnels ⇄ VGW or TGW',
        built: 'The **fast, encrypted, internet-borne link**. Each Site-to-Site VPN connection has **two IPsec tunnels** in different AZs, up to **1.25 Gbps each** (standard). It terminates on a **virtual private gateway** (one VPC) or a **transit gateway** (many VPCs, ECMP, acceleration). Up in hours. **Client VPN** is for people’s laptops; **CloudHub** lets branches reach each other through one VGW.',
        says: ['encrypted', 'quickly', 'over the internet', 'backup for Direct Connect', 'remote employees', 'branch offices'],
        switch: [{ to: 'dx', when: 'consistent bandwidth and latency matter and weeks are available' }, { to: 'tgw', when: 'one VPN must reach many VPCs' }],
        traps: ['Direct Connect when the deadline is days.', 'Expecting more than 1.25 Gbps per standard tunnel, or ECMP on a virtual private gateway.'],
        update: '**Large Bandwidth Tunnels** (up to 5 Gbps per tunnel) exist for VPNs on a transit gateway or Cloud WAN; standard tunnels stay at 1.25 Gbps. Banks still quote 1.25 Gbps.' },
      { id: 'dx', name: 'Direct Connect', short: 'DX', cls: 'dx', alias: ['Direct Connect', 'DX'],
        verb: 'runs a private line into AWS', from: 'data center → DX location → private / public / transit VIF',
        built: 'The **dedicated private line**. Dedicated ports of **1, 10, 100 or 400 Gbps**, or partner **hosted connections from 50 Mbps to 25 Gbps**. Consistent latency, but **weeks to months** to provision and **not encrypted by default** (add MACsec on 10/100/400 Gbps dedicated ports, or run a VPN over it). A **Direct Connect gateway** reaches VPCs in any Region.',
        says: ['consistent network performance', 'dedicated private connection', 'large volumes every day', 'bypass the internet', 'several Regions over one link'],
        switch: [{ to: 'vpn', when: 'the deadline is days, or you need a cheap backup' }, { to: 'tgw', when: 'one link must fan out to many VPCs' }],
        traps: ['Assuming DX is encrypted.', 'DX with a deadline of days.', 'One DX connection called “highly available”.'] },
      { id: 'inspect', name: 'Network Firewall · GWLB', short: 'Inspect', cls: 'ink', width: 4, alias: ['Network Firewall', 'Gateway Load Balancer', 'GWLB'],
        verb: 'inspects traffic in the path', from: 'VPC / TGW → firewall endpoint or GWLB endpoint → back',
        built: 'The **checkpoint**. **AWS Network Firewall** is managed, stateful, with domain allow/deny lists and Suricata-compatible IPS rules. **Gateway Load Balancer** puts **your own third-party appliances** transparently in the path (GENEVE on port 6081) and scales them. Both are real answers only when the question asks for deep inspection; for one IP range a NACL is enough.',
        says: ['intrusion prevention', 'allow only these domains', 'third-party firewall appliances', 'deep packet inspection', 'centralised inspection'],
        switch: [{ to: 'filter', when: 'a simple IP or port rule is all that is asked' }],
        traps: ['Network Firewall to block one IP range (prestige distractor): a NACL deny does it for free.'] }
    ],
    topics: { observe: 'Flow Logs · tools' },

    map: {
      title: 'The network map', lead: 'One VPC in detail, two neighbours, the internet above, your data center on the left, services below. Tap a line or a station.',
      viewBox: '0 0 1000 820', defaultLine: 'peer',
      caption: 'Three hues carry the three families you confuse most: Direct Connect magenta, Transit Gateway teal, endpoints / PrivateLink olive. Ink lines are told apart by their dash (VPN long dashes, NAT dashes, bastion short dashes, peering dots) and station shapes. Every line is labelled; colour is never the only cue.',
      items: [
        /* zones */
        { el: 'rect', a: { x: 0, y: 0, width: 1000, height: 96 }, style: 'fill:var(--muted-fill)' },
        { el: 'rect', a: { x: 0, y: 104, width: 232, height: 716 }, style: 'fill:var(--zone-onprem)' },
        { el: 'rect', a: { x: 240, y: 104, width: 760, height: 716 }, style: 'fill:var(--zone-aws)' },
        zoneLabel(18, 26, 'INTERNET'),
        zoneLabel(18, 130, 'ON-PREMISES'),
        zoneLabel(982, 814, 'AWS REGION', 'end'),

        ...box(280, 150, 300, 330, 'VPC A · 10.0.0.0/16'),
        ...subnet(292, 176, 276, 104, 'public subnet · route 0.0.0.0/0 → IGW'),
        ...subnet(292, 330, 276, 136, 'private subnet · no route to IGW'),
        ...box(612, 150, 170, 180, 'VPC B · 10.1.0.0/16'),
        ...box(820, 150, 168, 180, 'VPC C · 10.2.0.0/16'),
        ...box(820, 470, 168, 118, 'INSPECTION VPC'),
        ...box(280, 640, 300, 164, 'AWS SERVICES'),
        ...box(612, 640, 376, 164, 'PROVIDER VPC (another account)', true),
        { el: 'rect', a: { x: 30, y: 180, width: 170, height: 440, rx: 8 }, style: 'fill:var(--surface);stroke:var(--chip-border);stroke-width:1.5' },
        { el: 'text', a: { x: 40, y: 198, 'font-size': 11, 'font-weight': 800, 'letter-spacing': 1 }, style: 'fill:var(--ink2)', text: 'DATA CENTER' },

        /* not transitive: B and C are not peered */
        { el: 'text', lines: ['peer'], a: { x: 801, y: 246, 'font-size': 20, 'font-weight': 800, 'text-anchor': 'middle' }, style: 'fill:var(--ink)', text: '✕' },
        { el: 'text', lines: ['peer'], a: { x: 801, y: 264, 'font-size': 10.5, 'text-anchor': 'middle', 'font-family': FONT }, style: 'fill:var(--ink2)', text: 'no B–C' },

        /* ---- lines ---- */
        { el: 'line', line: 'access', paths: ['M330 58 V410'], labels: [{ x: 322, y: 124, t: 'ACCESS', size: 11, anchor: 'end' }] },
        { el: 'line', line: 'vpc', paths: ['M420 58 V240'], labels: [{ x: 428, y: 124, t: 'IGW', size: 11 }] },
        { el: 'line', line: 'nat', paths: ['M514 400 V58'], labels: [{ x: 522, y: 124, t: 'NAT · OUT ONLY', size: 11 }],
          extra: [{ el: 'path', a: { d: 'M506 72 L514 62 L522 72', fill: 'none', style: 'stroke:var(--ink);stroke-width:3;stroke-linecap:round;stroke-linejoin:round' } }] },
        { el: 'line', line: 'filter', paths: ['M292 305 H568'], labels: [{ x: 486, y: 323, t: 'FILTER · NACL + SG', size: 10.5 }] },
        { el: 'line', line: 'peer', paths: ['M580 232 H690', 'M580 190 H596 Q600 132 640 132 H955 Q975 132 975 160 V214'], labels: [{ x: 640, y: 124, t: 'PEERING · 1 : 1 · NOT TRANSITIVE', size: 11 }] },
        { el: 'line', line: 'tgw', paths: ['M580 420 H904 V282', 'M690 420 V282', 'M904 420 V512'], labels: [{ x: 596, y: 452, t: 'TRANSIT GATEWAY · HUB', size: 12 }] },
        { el: 'line', line: 'inspect', paths: ['M904 512 H960', 'M904 512 H850'], labels: [{ x: 834, y: 572, t: 'INSPECT', size: 11 }] },
        { el: 'line', line: 'vpn', paths: ['M150 470 H300 V466'], labels: [{ x: 40, y: 456, t: 'VPN · IPsec · 2 tunnels', size: 11 }] },
        { el: 'line', line: 'dx', paths: ['M150 560 H760 V436'], labels: [{ x: 40, y: 546, t: 'DIRECT CONNECT', size: 12 }, { x: 250, y: 584, t: 'private line · weeks to provision', size: 10.5, ls: .3 }] },
        { el: 'line', line: 'pl', paths: ['M476 410 V740 H880', 'M476 690 H380'], labels: [{ x: 486, y: 626, t: 'ENDPOINTS · PRIVATELINK', size: 11 }] },

        /* ---- stations ---- */
        /* internet */
        circle(330, 58, ['access'], true), T(322, 50, 'Admin', ['access'], { a: { 'text-anchor': 'end' }, pick: true }),
        circle(420, 58, ['vpc'], true), T(412, 50, 'Users', ['vpc'], { a: { 'text-anchor': 'end' }, pick: true }),
        circle(514, 58, ['nat']), T(530, 62, 'Patch repos, public APIs', ['nat'], { pick: true }),
        /* VPC A public subnet */
        square(420, 150, ['vpc'], true),
        square(330, 240, ['access'], true), sub(324, 262, 'bastion', ['access'], 'end'),
        square(420, 240, ['vpc'], true), sub(428, 262, 'web / ALB', ['vpc']),
        hexa(514, 240, ['nat'], true), sub(522, 262, 'NAT gw', ['nat']),
        /* filter */
        diamond(390, 305, ['filter'], true), diamond(470, 305, ['filter'], true),
        /* VPC A private subnet */
        circle(330, 410, ['access'], true), sub(338, 432, 'private EC2', ['access']),
        pill(462, 392, 66, 26, ['nat', 'pl']), T(495, 452, 'app servers', ['nat', 'pl'], { a: { 'text-anchor': 'middle', 'font-size': 12 } }),
        /* VGW */
        triangle(300, 470, ['vpn'], true), sub(310, 494, 'VGW', ['vpn']),
        /* peering */
        circle(690, 232, ['peer'], true), sub(690, 256, 'peering connection', ['peer'], 'middle'),
        circle(975, 214, ['peer'], true), sub(965, 238, 'peered with A', ['peer'], 'end'),
        /* TGW hub */
        pill(716, 405, 110, 30, ['tgw']), T(771, 425, 'TGW', ['tgw'], { a: { 'text-anchor': 'middle', 'font-size': 13 }, pick: true }),
        circle(690, 282, ['tgw'], true), circle(904, 282, ['tgw'], true),
        /* inspection */
        triangle(850, 512, ['inspect'], true), triangle(960, 512, ['inspect'], true),
        sub(850, 540, 'Network', ['inspect'], 'middle'), sub(850, 554, 'Firewall', ['inspect'], 'middle'),
        sub(960, 540, 'GWLB +', ['inspect'], 'middle'), sub(960, 554, 'appliances', ['inspect'], 'middle'),
        /* on-prem */
        triangle(150, 470, ['vpn'], true), sub(142, 492, 'customer gateway', ['vpn'], 'end'),
        square(150, 560, ['dx'], true), sub(142, 582, 'your router', ['dx'], 'end'),
        diamond(240, 560, ['dx'], true), sub(250, 600, 'DX location', ['dx']),
        square(760, 560, ['dx'], true), sub(770, 604, 'DX gateway', ['dx']),
        T(40, 236, 'Servers, users,', null), T(40, 254, 'on-prem DNS', null),
        /* services */
        square(380, 690, ['pl'], true), T(372, 682, 'S3 · DynamoDB', ['pl'], { a: { 'text-anchor': 'end', 'font-size': 12 }, pick: true }), sub(372, 712, 'gateway endpoint · free', ['pl'], 'end'),
        circle(476, 740, ['pl'], true), sub(468, 766, 'SQS · KMS · SSM · S3 …', ['pl'], 'end'), sub(468, 782, 'interface endpoint · ENI', ['pl'], 'end'),
        circle(880, 740, ['pl'], true), T(872, 712, 'your SaaS behind an NLB', ['pl'], { a: { 'text-anchor': 'end', 'font-size': 12 }, pick: true }), sub(872, 772, 'endpoint service', ['pl'], 'end'),
        ...LABELS
      ]
    },

    stub: [
      { id: 'who', label: 'WHO ↔ WHO', short: 'WHO', values: ['internet↔VPC', 'inside one VPC', 'VPC↔VPC', 'on-prem↔AWS', 'VPC→service'] },
      { id: 'scale', label: 'SCALE', short: 'SCALE', values: ['one pair', 'many / hub', 'n/a'] },
      { id: 'path', label: 'PATH', short: 'PATH', values: ['public internet', 'encrypted tunnel', 'private AWS network', 'dedicated line', 'n/a'] },
      { id: 'sup', label: 'SUPERLATIVE', short: 'SUP', values: ['cheapest', 'least ops', 'most secure', 'resilient', 'fastest to set up', 'consistent bandwidth', 'none stated'] }
    ],

    method:
`1. Strip the story. Keep the two ENDS of the traffic and the verb (reach, block, expose, connect).
2. Fill the stub, the same 4 slots for this session:
   WHO <-> WHO (internet<->VPC / inside one VPC / VPC<->VPC / on-prem<->AWS / VPC->service) ____
   SCALE (one pair / many-hub / n/a) ____
   PATH (public internet / encrypted tunnel / private AWS network / dedicated line / n/a) ____
   SUPERLATIVE ____
3. For EACH option ask: "what problem was this service BUILT for?"
   No match with the stub -> cross it out, however senior it sounds
   (Transit Gateway for 2 VPCs, Global Accelerator for a private link,
   Network Firewall for one IP range).
4. Among the survivors, the one that satisfies the SUPERLATIVE wins.`,

    cheat:
`NETWORK = WHO talks to WHO? + how MANY? + over WHAT path? + SUPERLATIVE
VPC      /16../28 · subnet = 1 AZ · 5 IPs reserved (.0 .1 router .2 DNS .3 spare, last)
         public subnet = route 0.0.0.0/0 -> IGW  (+ public IP on the instance)
OUT ONLY -> NAT gateway (zonal: 1 per AZ, in PUBLIC subnet · regional since 2025)
         NAT instance: disable source/dest check · IPv6 out-only -> egress-only IGW
FILTER   SG: instance, ALLOW only, stateful, can reference another SG
         NACL: subnet, allow+DENY, lowest rule # wins, stateless -> ephemeral 1024-65535
ADMIN    bastion in PUBLIC subnet, app SG allows 22 only from bastion SG
         no ports/keys + logs -> Session Manager · SSH by private IP -> EIC Endpoint
2 VPCs   -> PEERING  (not transitive · no edge-to-edge · no overlapping CIDR · no hourly fee)
MANY     -> TRANSIT GATEWAY (hub; TGW route tables segment; $/attachment-h + $/GB)
AWS SVC  S3/DynamoDB from the VPC -> GATEWAY endpoint (free, route table)
         anything else, or from on-prem/peer/TGW -> INTERFACE endpoint (ENI, $/h/AZ + $/GB)
EXPOSE   one service to many VPCs, overlapping CIDRs -> PrivateLink endpoint service + NLB
ON-PREM  days + encrypted -> Site-to-Site VPN (2 tunnels x 1.25 Gbps, VGW or TGW)
         consistent + big, weeks OK -> DIRECT CONNECT (1/10/100/400 dedicated · 50M-25G hosted)
         DX not encrypted: MACsec (10/100/400 dedicated) or VPN over DX
         DX to many Regions -> DX gateway · cheap DX backup -> VPN · max resiliency -> 2 locations x 2
         laptops -> Client VPN · branches to each other -> VPN CloudHub
INSPECT  domains / IPS -> Network Firewall · your appliances -> Gateway Load Balancer
DEBUG    what happened -> Flow Logs · why is it blocked (no traffic) -> Reachability Analyzer
NEVER: transitive peering · bastion in private subnet · SG deny · NAT for inbound ·
       gateway endpoint from on-prem · TGW/GA/Network Firewall where nothing asks for them`,

    compare: [
      { id: 'peer-tgw', short: 'Peering · TGW', title: 'VPC peering vs Transit Gateway — a wire vs a hub',
        sides: [{ name: 'VPC peering', line: 'peer', fig: { dir: 'both', left: 'VPC', right: 'VPC', keep: true }, gist: 'One private **wire** between exactly two VPCs. Nothing passes through.' }, { name: 'Transit Gateway', line: 'tgw', fig: { dir: 'both', cache: true, cacheLabel: 'HUB', left: 'VPCs', right: 'ON-PREM' }, gist: 'A regional **router**: every VPC, VPN and DX gateway attaches once; TGW route tables decide who reaches whom.' }],
        rows: [['Transitive?', 'no — A–B and A–C never gives B–C', 'yes, through the hub (as the route tables allow)'], ['Cost', 'no hourly charge; data transfer only (free within one AZ)', 'per attachment per hour + per GB processed'], ['Deciding words', 'two VPCs, cheapest, cross-account or inter-Region pair', 'dozens of VPCs, on-prem to all, segment dev/prod, centralised egress'], ['Tempting wrong', 'for “50 VPCs + on-prem” (N×(N−1)/2 connections)', 'for “two VPCs, lowest cost” (prestige)']],
        check: { q: '“Two VPCs in one account must share a database. No more VPCs are planned. Lowest cost.”', opts: ['VPC peering', 'Transit Gateway'], a: 0, why: 'Two VPCs: one peering connection, no hourly charge. A transit gateway adds two attachment-hours and a per-GB fee for nothing.' } },
      { id: 'endpoints', short: 'Gateway · Interface', title: 'Gateway endpoint vs interface endpoint',
        sides: [{ name: 'Gateway endpoint', line: 'pl', fig: { dir: 'one', left: 'VPC', right: 'S3 · DDB' }, gist: 'A **route-table target** for S3 and DynamoDB. **Free.** Only from inside that VPC.' }, { name: 'Interface endpoint', line: 'pl', fig: { dir: 'one', left: 'VPC', right: 'SERVICE', keep: true }, gist: 'An **ENI with a private IP** in your subnet (PrivateLink). Most AWS services, S3 included. Paid per hour per AZ + per GB.' }],
        rows: [['Services', 'S3 and DynamoDB only', 'most AWS services, S3 and DynamoDB included, plus endpoint services'], ['From on-prem / peer in another Region / through TGW', 'no', 'yes'], ['Cost', 'no charge', 'hourly per AZ + per GB'], ['Deciding words', 'S3 from private subnets, cheapest, no NAT', 'SQS, KMS, SSM, API calls; S3 from on-premises over DX/VPN']],
        check: { q: '“On-premises servers must reach S3 over Direct Connect using private IP addresses.”', opts: ['Gateway endpoint', 'Interface endpoint'], a: 1, why: 'Gateway endpoints are not reachable from on-premises. An interface endpoint gives S3 a private IP in the VPC that DX traffic can reach.' } },
      { id: 'nat', short: 'NAT gw · NAT instance', title: 'NAT gateway vs NAT instance',
        sides: [{ name: 'NAT gateway', line: 'nat', fig: { dir: 'one', left: 'PRIVATE', right: 'NET' }, gist: '**Managed**, scales from 5 to 100 Gbps, redundant inside its AZ. No security group; filter with NACLs.' }, { name: 'NAT instance', line: 'nat', fig: { dir: 'one', left: 'PRIVATE', right: 'NET', keep: true }, gist: 'An EC2 instance **you** run: patch it, size it, fail it over. Needs **source/destination check disabled**.' }],
        rows: [['Operations', 'none', 'yours: AMI, patching, HA scripts'], ['Security group', 'cannot attach one', 'yes, like any instance'], ['Also usable as', '—', 'bastion or port-forwarder (banks love this)'], ['Deciding words', 'least ops, highly available, high bandwidth', 'cheapest at tiny scale, full control']],
        check: { q: '“Private instances need outbound internet with the least operational overhead.”', opts: ['NAT gateway', 'NAT instance'], a: 0, why: 'Managed, scales itself, no patching. AWS also recommends migrating NAT instances to NAT gateways.' } },
      { id: 'sg-nacl', short: 'SG · NACL', title: 'Security group vs network ACL',
        sides: [{ name: 'Security group', line: 'filter', fig: { dir: 'both', left: 'SUBNET', right: 'ENI', keep: true }, gist: 'On the **instance** (ENI). **Allow only.** **Stateful**: replies go back automatically.' }, { name: 'Network ACL', line: 'filter', fig: { dir: 'both', left: 'NET', right: 'SUBNET' }, gist: 'On the **subnet**. **Allow and deny**, numbered, lowest first. **Stateless**: allow the replies too.' }],
        rows: [['Deny rules', 'no', 'yes'], ['Return traffic', 'automatic', 'must be allowed (ephemeral 1024–65535)'], ['Rule order', 'all rules evaluated together', 'lowest number that matches wins'], ['Deciding words', 'only from the web tier, reference a group', 'block this IP range, subnet-wide, explicit deny']],
        check: { q: '“Block 198.51.100.0/24 from every instance in a subnet, now.”', opts: ['Security group', 'Network ACL'], a: 1, why: 'Security groups cannot deny. A NACL deny rule numbered before the allow rules blocks the range for the whole subnet.' } },
      { id: 'vpn-dx', short: 'VPN · DX', title: 'Site-to-Site VPN vs Direct Connect',
        sides: [{ name: 'Site-to-Site VPN', line: 'vpn', fig: { dir: 'both', left: 'ON-PREM', right: 'AWS' }, gist: '**Encrypted** IPsec over the **internet**. Up in hours. 2 tunnels × 1.25 Gbps.' }, { name: 'Direct Connect', line: 'dx', fig: { dir: 'both', left: 'ON-PREM', right: 'AWS' }, gist: '**Private line**: consistent latency, 1–400 Gbps dedicated. **Weeks** to provision. **Not encrypted** by default.' }],
        rows: [['Time to set up', 'hours', 'weeks to months (hosted from a partner can be days)'], ['Encryption', 'always (IPsec)', 'none by default; MACsec or VPN over DX'], ['Performance', 'internet: variable', 'consistent'], ['Together', 'VPN is the cheap **backup** for DX; VPN over DX gives encryption on the private line.']],
        check: { q: '“Connect the data center within a week; traffic must be encrypted.”', opts: ['Site-to-Site VPN', 'Direct Connect'], a: 0, why: 'DX takes weeks and does not encrypt by itself. A VPN is encrypted and up the same day.' } },
      { id: 'peer-pl', short: 'Peering · PrivateLink', title: 'VPC peering vs PrivateLink — a network vs one service',
        sides: [{ name: 'VPC peering', line: 'peer', fig: { dir: 'both', left: 'VPC', right: 'VPC', keep: true }, gist: 'Joins **whole networks**: everything routable, both directions. CIDRs must not overlap.' }, { name: 'PrivateLink', line: 'pl', fig: { dir: 'one', left: 'YOU', right: 'NLB' }, gist: 'Exposes **one service** behind an NLB; consumers get an interface endpoint. One direction; **overlapping CIDRs are fine**.' }],
        rows: [['Direction', 'both ways', 'consumer → provider only'], ['Overlapping CIDRs', 'impossible', 'no problem'], ['Scale', 'a handful of VPCs', 'hundreds or thousands of consumer VPCs'], ['Deciding words', 'two teams share resources both ways', 'SaaS, expose only this API, customers’ VPCs, same CIDR']],
        check: { q: '“Expose one TCP API to 300 customer VPCs, many of which use 10.0.0.0/16 like ours.”', opts: ['VPC peering', 'PrivateLink'], a: 1, why: 'Overlapping CIDRs rule out peering, and peering would expose the whole VPC. An endpoint service behind an NLB exposes only the API.' } },
      { id: 'access', short: 'Bastion · SSM · EIC', title: 'Bastion host vs Session Manager vs EC2 Instance Connect Endpoint',
        sides: [{ name: 'Bastion host', line: 'access', fig: { dir: 'one', left: 'ADMIN', right: 'PUBLIC' }, gist: 'A hardened EC2 in a **public** subnet; SSH from your IP; then hop.' }, { name: 'Session Manager', line: 'access', fig: { dir: 'one', left: 'IAM', right: 'EC2', keep: true }, gist: '**No inbound ports, no SSH keys**, IAM-controlled, sessions logged.' }, { name: 'EIC Endpoint', line: 'access', fig: { dir: 'one', left: 'IAM', right: 'EC2' }, gist: 'SSH/RDP to a **private IP** through an identity-aware proxy in your VPC; no public IP.' }],
        rows: [['Public exposure', 'the bastion itself', 'none', 'none'], ['Inbound rule on the instance', '22 from the bastion SG', 'none', '22 (or 3389) from the endpoint'], ['Deciding words', 'jump box, bastion, (banks)', 'no open ports, no keys, audit/log sessions', 'SSH by private IP, no bastion, native SSH client']],
        check: { q: '“No inbound ports may be opened and SSH keys are forbidden; log every session.”', opts: ['Bastion host', 'Session Manager', 'EIC Endpoint'], a: 1, why: 'Only Session Manager needs no inbound rule and no keys, and it logs sessions. EIC Endpoint still needs port 22 from the endpoint.' } },
      { id: 'nfw-gwlb', short: 'Network Firewall · GWLB', title: 'AWS Network Firewall vs Gateway Load Balancer',
        sides: [{ name: 'Network Firewall', line: 'inspect', fig: { dir: 'one', left: 'VPC', right: 'NET', cache: true, cacheLabel: 'FW' }, gist: '**AWS-managed** stateful firewall: domain lists, Suricata-compatible IPS rules.' }, { name: 'Gateway Load Balancer', line: 'inspect', fig: { dir: 'both', left: 'VPC', right: 'VENDOR', keep: true }, gist: 'Runs **your third-party appliances** transparently in the path and scales them (GENEVE 6081).' }],
        rows: [['Who writes the rules', 'you, in AWS', 'the appliance vendor’s software'], ['Deciding words', 'managed, domain allowlist, IPS, least ops', 'we already license vendor X, transparent, scale appliances'], ['Wrong when', 'one IP range must be blocked (NACL)', 'no appliance is mentioned']],
        check: { q: '“Keep using our licensed next-gen firewall appliances, scaled automatically, in the path of every VPC.”', opts: ['Network Firewall', 'Gateway Load Balancer'], a: 1, why: 'The appliances are theirs: GWLB inserts and scales third-party appliances. Network Firewall is AWS’s own engine.' } }
    ],

    traps: [
      { title: 'Peering is transitive', x: 'A–B and A–C peered never lets B reach C. Peer B–C directly, or use a transit gateway for many VPCs. (Your Q7.)', drills: ['Q7', 'K14'] },
      { title: 'Bastion host in a private subnet', x: 'A private subnet has no route to the internet gateway; nothing outside can reach it, even with an Elastic IP. The bastion goes in a public subnet. (Your Q46.)', drills: ['Q46', 'K25'] },
      { title: 'Transit Gateway where two VPCs need one wire', x: 'Prestige distractor. A TGW costs per attachment-hour plus per GB. Two or three VPCs → peering.', drills: ['Q7', 'K14'] },
      { title: 'Global Accelerator as a connectivity answer', x: 'Global Accelerator gives internet users static anycast IPs into your endpoints. It does not connect VPCs, reach S3 privately or replace DX.', drills: ['K8', 'K24'] },
      { title: 'Network Firewall to block one IP range', x: 'A NACL deny rule, numbered before the allows, does it for free. Network Firewall is for domain lists, IPS and central inspection.', drills: ['K6', 'K26'] },
      { title: 'A deny rule in a security group', x: 'Security groups have allow rules only. Denying needs a NACL (or a firewall).', drills: ['K6'] },
      { title: 'A custom NACL without ephemeral ports', x: 'NACLs are stateless. Replies leave on ports 1024–65535; allow them outbound (and inbound for instance-initiated traffic).', drills: ['K5'] },
      { title: 'NAT for inbound traffic', x: 'NAT carries only connections the private instance starts. Inbound needs a public subnet, a public IP, a load balancer, or an access service.', drills: ['Q46', 'K3'] },
      { title: 'One zonal NAT gateway for every AZ', x: 'A zonal NAT gateway lives in one AZ. If that AZ fails, every private subnet routed to it loses the internet. One per AZ (or a regional NAT gateway).', drills: ['K3'] },
      { title: 'Gateway endpoint for the wrong service or from the wrong place', x: 'Gateway endpoints are S3 and DynamoDB only, and only from inside that VPC — not from on-prem, another Region or through a TGW.', drills: ['K9', 'K10'] },
      { title: 'Using a peer’s gateway (edge-to-edge)', x: 'Through peering you cannot use the other VPC’s internet gateway, NAT gateway, VPN, Direct Connect or gateway endpoint.', drills: ['K16', 'K24'] },
      { title: 'Peering overlapping CIDRs', x: 'Peering fails if any CIDR overlaps. Re-address, or expose just the service with PrivateLink.', drills: ['K11'] },
      { title: 'Direct Connect is encrypted', x: 'It is not, by default. Add MACsec (10/100/400 Gbps dedicated) or run a VPN over it.', drills: ['K21'] },
      { title: 'Direct Connect with a deadline of days', x: 'Dedicated DX takes weeks to months. A Site-to-Site VPN is up in hours.', drills: ['K17', 'K20'] },
      { title: 'A single DX connection called highly available', x: 'One connection is one fibre and one device. Resilience means two connections, ideally at two DX locations, or a VPN backup.', drills: ['K22', 'K23'] }
    ],

    log: [
      { when: '2 Sept 2026', what: 'Baseline practice exam, networking misses', result: 'Q7 and Q46 wrong', lesson: 'Q7: peering is not transitive (fact gap). Q46: bastion placed in a private subnet (misread which subnet is public). Plus the prestige-distractor habit: Transit Gateway, Global Accelerator and Network Firewall chosen where they had no role.' },
      { when: '—', what: 'Session 3 drill', result: 'not taken yet', lesson: 'Run all 30 scenarios once. Misses are tagged in “Where it broke” and show up in Progress.' }
    ]
  });
})();
