/* Feed bites — Session 3, networking & connectivity. Facts: sessions/03-networking/learn.js chapters in src,
   docs/session-03-networking.md (verified 2026-09-24). Ledger: docs/feed-bites.md. */
window.SAA_BITES = (window.SAA_BITES || []).concat([
  {
    id: 'net-subnets-nat', sid: '03-networking', title: 'Public or private subnet, internet gateway or NAT', domains: ['D1', 'D3'], src: ['ch2', 'ch3', 'ch4'],
    text: 'A VPC is a building and the **internet gateway** is its front door: a subnet is public only when its route table points there, and an instance also needs a public IP to be reached. A private subnet has no such route. When its instances must still fetch patches, a **NAT gateway** is a one-way door: they can start connections out through it, and the internet can never start one in.',
    update: 'Since November 2025 a NAT gateway can also be **regional**: it expands across AZs by itself and needs no public subnet. The design most practice exams expect, one zonal NAT gateway per AZ in a public subnet, is still correct, just no longer the only one.',
    qs: [
      { id: 'q1', q: 'A team moves a reporting server into a private subnet so that nothing on the internet can reach it. The server must still upload reports to a partner’s public IPv4 API over HTTPS. Which design meets both requirements?', words: ['nothing on the internet can reach it', 'public IPv4 API'],
        expl: 'Out but never in is the one-way door: a NAT gateway, reached through the private subnet’s 0.0.0.0/0 route. A route to the internet gateway would make the subnet public again, an Elastic IP does nothing without that route, and an egress-only gateway carries IPv6 only.',
        opts: [
          { t: 'Create a NAT gateway in a public subnet and route the private subnet’s 0.0.0.0/0 to it', ok: true, why: 'Connections can only start from inside, so the upload works and nothing comes in.' },
          { t: 'Route the private subnet’s 0.0.0.0/0 to the internet gateway and give the server an Elastic IP', why: 'That route makes the subnet public, and with the Elastic IP the internet can reach the server.' },
          { t: 'Leave the private subnet’s routes unchanged and attach an Elastic IP address to the server', why: 'Without a route to an internet gateway, an instance cannot reach the internet even with a public IP.' },
          { t: 'Create an egress-only internet gateway and route the private subnet’s ::/0 traffic to it', why: 'An egress-only gateway carries IPv6 only; the partner’s API is IPv4.' }] },
      { id: 'q2', q: 'Customers on the internet must reach a web application that runs on EC2 instances in private subnets. The instances must keep private IP addresses only. A colleague proposes a NAT gateway. Which design meets the requirement?', words: ['Customers on the internet must reach', 'private IP addresses only'],
        expl: 'A NAT gateway is the one-way door: it never forwards a connection that starts outside. Letting the internet reach private instances is a load balancer in a public subnet. Without public IPs, neither an internet gateway route nor an open security group gives the internet a way to address the instances.',
        opts: [
          { t: 'Put a NAT gateway in a public subnet and route the private subnets’ 0.0.0.0/0 to it', why: 'A NAT gateway never forwards a connection that starts outside; it is for outbound traffic only.' },
          { t: 'Route the private subnets’ 0.0.0.0/0 to the internet gateway and keep the private IPs', why: 'The internet gateway maps an instance to its public IPv4 or Elastic IP; with none, nothing can address it.' },
          { t: 'Put a load balancer in public subnets that forwards the requests to the private instances', ok: true, why: 'The load balancer takes the connections from the internet; the instances stay private.' },
          { t: 'Allow inbound HTTPS from 0.0.0.0/0 in the instances’ security groups and keep them private', why: 'Filters only allow traffic on a path; with no internet gateway route and no public IP, there is none.' }] },
      { id: 'q3', q: 'Instances in private subnets reach the internet through a NAT gateway. The security team wants their outbound internet traffic limited to HTTPS only, using controls that already exist in the VPC. Which approach meets this requirement?', words: ['limited to HTTPS only'],
        expl: 'You cannot attach a security group to a NAT gateway; the path is filtered with the instances’ security groups or the NACL of the NAT gateway’s subnet. Outbound rules set what may leave, and the stateful group admits the replies. The egress-only gateway is IPv6 and has no security group either.',
        opts: [
          { t: 'Attach a security group to the NAT gateway that allows only outbound TCP 443', why: 'You cannot attach a security group to a NAT gateway.' },
          { t: 'Add an inbound rule for TCP 443 to the security groups of the private instances', why: 'These connections start outbound; inbound rules do not limit them, and the stateful group admits replies.' },
          { t: 'Swap the NAT gateway for an egress-only internet gateway that allows only TCP 443', why: 'An egress-only gateway carries IPv6 only and has no security group to hold such a rule.' },
          { t: 'Replace the instances’ default outbound rule with one that allows only TCP 443', ok: true, why: 'The instances’ security groups are where the NAT path is filtered; outbound rules set what may leave.' }] },
      { id: 'q4', q: 'A three-tier application has a load balancer, application servers and a database. Only the load balancer may be reachable from the internet. The application servers must download patches, and the database must have no internet path at all. Which subnet layout meets these requirements?', words: ['no internet path at all', 'download patches'],
        expl: 'Public means a route to the internet gateway, so only the load balancer belongs there. The application servers go out through a NAT gateway; the database gets no route to the internet at all. A public subnet does not help an instance without a public IP: it still has no internet access.',
        opts: [
          { t: 'Load balancer public; app servers public with no public IPs; database private, no internet route', why: 'Without a public IP an instance has no internet access, even in a public subnet; patches would fail.' },
          { t: 'Load balancer public; app servers private with a NAT route; database private, no internet route', ok: true, why: 'Each tier gets exactly the door it needs: in for the load balancer, out for the servers, none for the database.' },
          { t: 'Load balancer public; app servers private with a NAT route; database private with a NAT route', why: 'The NAT route gives the database an outbound internet path, which the requirement forbids.' },
          { t: 'Load balancer, app servers and database all public, with security groups that admit only the LB', why: 'A public subnet gives the database a route to the internet gateway: an internet path.' }] }
    ]
  },
  {
    id: 'net-sg-nacl', sid: '03-networking', title: 'Security group vs network ACL', domains: ['D1'], src: ['ch4'],
    text: 'A **security group** is the guest list on each instance’s own door: it can only allow, and it remembers who came in, so their replies walk straight back out. A **network ACL** is the checkpoint at the subnet’s gate: its numbered rules can allow or deny, the lowest matching number wins, and it remembers no one, so every reply is checked again like a new arrival.',
    qs: [
      { id: 'q1', q: 'A web server’s security group allows inbound TCP 443 from 0.0.0.0/0. To harden it, the team deleted the group’s default outbound rule, so it has no outbound rules at all. The subnet’s network ACL allows all traffic. Do HTTPS clients still get responses?', words: ['no outbound rules', 'allows all traffic'],
        expl: 'A security group is stateful: the reply to traffic it allowed in is allowed out automatically, whatever its outbound rules say. The network ACL here allows everything, so nothing else blocks the replies; it does not override the group, because traffic must pass both.',
        opts: [
          { t: 'No: the group needs an outbound rule that allows TCP 1024–65535 to 0.0.0.0/0 for replies', why: 'A stateful group does not check replies against its outbound rules; that rule changes nothing.' },
          { t: 'Yes: the group is stateful, so replies to the allowed inbound traffic leave automatically', ok: true, why: 'The group remembers the connection it let in and lets the reply out.' },
          { t: 'Yes: the network ACL allows all traffic, and its allow overrides the group’s missing rule', why: 'Both layers must allow traffic and neither overrides the other; the group’s state lets replies out.' },
          { t: 'No: the network ACL needs an outbound rule for the ephemeral ports before replies can leave', why: 'This network ACL already allows all traffic; only a stricter custom NACL would need that rule.' }] },
      { id: 'q2', q: 'Instances in a private subnet download patches over HTTPS through a NAT gateway, whose own subnet uses the default network ACL. The instances’ security group keeps its default outbound rule. Their subnet has a custom network ACL: outbound allows TCP 443 to 0.0.0.0/0, inbound allows TCP 22 from the office range, then the default deny. The downloads time out. What should a solutions architect change?', words: ['download patches', 'custom network ACL'],
        expl: 'The instances start these connections, so the replies come in to their ephemeral ports. A stateless NACL checks those replies like new packets and needs an inbound allow for 1024–65535. The security group is stateful and already lets the replies in.',
        opts: [
          { t: 'Add an outbound network ACL rule that allows TCP 1024–65535 to 0.0.0.0/0', why: 'That serves replies to connections that clients start; here the replies come in, not out.' },
          { t: 'Add an inbound security group rule that allows TCP 1024–65535 from 0.0.0.0/0', why: 'The stateful group already admits replies to its own outbound traffic; the NACL drops them.' },
          { t: 'Add an outbound security group rule that allows TCP 443 to 0.0.0.0/0 for patches', why: 'The default outbound rule already allows all outbound traffic.' },
          { t: 'Add an inbound network ACL rule that allows TCP 1024–65535 from 0.0.0.0/0', ok: true, why: 'The replies return to the instances’ ephemeral ports, and the stateless NACL must let them in.' }] },
      { id: 'q3', q: 'A team creates a new custom network ACL for a subnet of working web servers, planning to add its rules later, and associates it with the subnet right away. All traffic to and from the servers stops at once, although their security groups did not change. What explains this?', words: ['new custom network ACL', 'security groups did not change'],
        expl: 'A new custom NACL starts with only the deny-all `*` rules, inbound and outbound, and it applies to every instance in the subnet. The default NACL allows all; a new custom one allows nothing until rules are added.',
        opts: [
          { t: 'Associating a new network ACL resets the subnet’s security groups to deny all traffic', why: 'Security groups sit on each instance’s network interface; the subnet’s ACL does not change them.' },
          { t: 'A new custom network ACL allows all traffic, so the security groups now drop the replies', why: 'It is the default NACL that allows all; a new custom one denies all, and groups pass replies.' },
          { t: 'A network ACL evaluates its highest-numbered rule first, so the `*` rule matched first', why: 'Rules run lowest number first; here the deny-all `*` rule is simply the only rule there is.' },
          { t: 'A new custom network ACL denies all inbound and outbound traffic until rules are added', ok: true, why: 'Its only rules are the `*` deny rules, and it applies to every instance in the subnet.' }] }
    ]
  },
  {
    id: 'net-peering-tgw-privatelink', sid: '03-networking', title: 'Peering vs Transit Gateway vs PrivateLink', domains: ['D3', 'D1'], src: ['ch6', 'ch7', 'ch8'],
    text: '**VPC peering** is a cable with two plugs: it joins exactly two networks, costs nothing to create, and never carries traffic on to a third. A **transit gateway** is the hub each network plugs into once, with route tables that decide who reaches whom, billed per attachment-hour and per GB. **PrivateLink** opens one service, not a network: consumers reach a provider’s Network Load Balancer through an interface endpoint, so overlapping address ranges do not matter.',
    qs: [
      { id: 'q1', q: 'After an acquisition, the acquired company’s VPC uses 10.0.0.0/16, the same CIDR block as the main VPC. Applications in the main VPC must call one inventory API in the acquired VPC, and nothing else there. Which solution meets these requirements?', words: ['same CIDR block', 'one inventory API'],
        expl: 'Overlapping ranges rule out anything that routes networks: peering fails on any overlap, and a transit gateway cannot route overlapping ranges. PrivateLink publishes one service behind a Network Load Balancer, and overlap does not matter.',
        opts: [
          { t: 'Peer the two VPCs and route only the inventory subnet’s range across the peering connection', why: 'If any CIDR overlaps, the peering request fails, even if only the other parts were meant to be used.' },
          { t: 'Put the API behind an NLB as a VPC endpoint service and add an interface endpoint to it', ok: true, why: 'One service, one direction, and overlapping CIDRs do not matter.' },
          { t: 'Attach both VPCs to a transit gateway and route the inventory subnet’s range through it', why: 'A transit gateway routes networks; it cannot route overlapping ranges.' },
          { t: 'Create a gateway VPC endpoint in the main VPC that targets the inventory API’s service', why: 'Gateway endpoints exist only for Amazon S3 and DynamoDB.' }] },
      { id: 'q2', q: 'A company has 15 VPCs attached to a transit gateway in eu-west-1 and 12 attached to another transit gateway in us-east-1. The VPCs in each Region must now reach the VPCs in the other. Which solution meets this requirement with the LEAST operational overhead?', words: ['LEAST operational overhead', 'reach the VPCs in the other'],
        expl: 'Two regional hubs join through transit gateway peering, which works between Regions and uses static routes. A mesh of VPC peering connections would also work, but needs one connection per pair and a route in every table.',
        opts: [
          { t: 'Attach the us-east-1 VPCs to the eu-west-1 transit gateway as extra VPC attachments', why: 'A transit gateway is a regional router: one hub per Region.' },
          { t: 'Peer each eu-west-1 VPC with each us-east-1 VPC by using inter-Region VPC peering', why: 'It works, but one connection per pair and a route in every table is the most upkeep.' },
          { t: 'Peer the two transit gateways across Regions and add static routes for each side’s VPCs', ok: true, why: 'Transit gateway peering joins hubs, including inter-Region, with static routes.' },
          { t: 'Join the two transit gateways with a Connect attachment that runs GRE tunnels and BGP', why: 'Connect attachments are for SD-WAN appliances; hubs in two Regions use transit gateway peering.' }] },
      { id: 'q3', q: 'Twenty VPCs attached to one transit gateway each run their own NAT gateways for outbound internet access. The network team wants all outbound internet traffic to leave through NAT gateways in one place. Which solution meets this requirement with the LEAST operational overhead?', words: ['in one place', 'LEAST operational overhead'],
        expl: 'Centralised egress is a transit gateway job: spokes send 0.0.0.0/0 to the hub, which routes it to one egress VPC with NAT gateways. Through peering the same path would be edge-to-edge routing, which peering never allows.',
        opts: [
          { t: 'Build one egress VPC with NAT gateways; peer it with each spoke and route 0.0.0.0/0 to it', why: 'Through peering, a VPC cannot use another VPC’s NAT gateway: no edge-to-edge routing.' },
          { t: 'Build one egress VPC and publish its NAT gateways to the spokes as a VPC endpoint service', why: 'An endpoint service carries traffic one way to one service behind a load balancer, not to the internet.' },
          { t: 'Build one egress VPC with NAT gateways; send each spoke’s 0.0.0.0/0 to the transit gateway', ok: true, why: 'The transit gateway routes the spokes’ internet traffic to the shared NAT gateways.' },
          { t: 'Keep a NAT gateway in each spoke and add a gateway endpoint in each spoke for the internet', why: 'Gateway endpoints exist only for Amazon S3 and DynamoDB, and nothing moves to one place.' }] },
      { id: 'q4', q: 'An analytics VPC in eu-west-1 must exchange traffic in both directions with a VPC in us-west-2 that a partner company owns in its own AWS account. The CIDR blocks do not overlap, and no other networks will join. Which solution is the MOST cost-effective?', words: ['both directions', 'partner company', 'MOST cost-effective'],
        expl: 'Two networks, both directions, no overlap: peering. It works across accounts and Regions and costs nothing to create; data that crosses Regions is charged per GB. Transit gateways add attachment-hours, PrivateLink opens one service one way, and VPC sharing stays inside one Organization.',
        opts: [
          { t: 'Attach each VPC to a transit gateway in its own Region and peer the two transit gateways', why: 'It works, but each attachment is billed per hour on top of the per-GB charge.' },
          { t: 'Publish the partner’s VPC as a VPC endpoint service and create an interface endpoint in ours', why: 'PrivateLink carries traffic one way to one service; the VPCs need both directions.' },
          { t: 'Share the analytics VPC’s subnets with the partner’s account through AWS RAM VPC sharing', why: 'VPC sharing works only between accounts in the same AWS Organization; the partner is outside it.' },
          { t: 'Create an inter-Region VPC peering connection between the two VPCs and add routes on both', ok: true, why: 'Peering joins two VPCs across accounts and Regions, with no charge to create it.' }] }
    ]
  },
  {
    id: 'net-vpn-dx', sid: '03-networking', title: 'Site-to-Site VPN vs Direct Connect', domains: ['D2', 'D3'], src: ['ch9', 'ch10'],
    text: 'A **Site-to-Site VPN** is an armoured van on the public motorway: encrypted, running on the internet link you already have, ready in hours, but stuck in the same traffic as everyone else. **Direct Connect** is your own private road to AWS: it never touches the internet, so latency and throughput stay consistent, but a new dedicated road takes weeks to months to build, and nothing on it is encrypted by default.',
    qs: [
      { id: 'q1', q: 'A company already reaches AWS from its head office over a 10 Gbps dedicated Direct Connect connection. A new sales office with only an internet link must reach one VPC from tomorrow, and the traffic must be encrypted. Which solution meets these requirements?', words: ['from tomorrow', 'must be encrypted'],
        expl: 'A deadline of one day rules out a new dedicated connection, which takes weeks to months, and Direct Connect is not encrypted by default anyway. A Site-to-Site VPN runs over the office’s internet link, is set up in hours and is always encrypted.',
        opts: [
          { t: 'Order a new 1 Gbps dedicated Direct Connect connection for the sales office with MACsec', why: 'A new dedicated connection takes weeks to months, and MACsec is not offered on 1 Gbps connections.' },
          { t: 'Set up a Site-to-Site VPN from the office router to a virtual private gateway on the VPC', ok: true, why: 'Set up in hours over the existing internet link, and always encrypted.' },
          { t: 'Order a hosted Direct Connect connection for the office and send its traffic over it as is', why: 'Direct Connect does not encrypt traffic in transit by default; the requirement says encrypted.' },
          { t: 'Set up an accelerated Site-to-Site VPN from the office to a virtual private gateway', why: 'Acceleration works only with a transit gateway, not with a virtual private gateway.' }] },
      { id: 'q2', q: 'A company’s Site-to-Site VPN drops for a while several times a year, each time during AWS maintenance on the tunnel endpoint. Only the first of the connection’s two tunnels is configured on the on-premises router, with static routes. Which change keeps traffic flowing during maintenance with the LEAST cost?', words: ['during AWS maintenance', 'Only the first', 'LEAST cost'],
        expl: 'Every VPN connection already has two tunnels ending in different AZs, because AWS maintenance takes one down from time to time. Configuring the second, with BGP for fast failover, uses what is already there. A new line or acceleration solves a different problem.',
        opts: [
          { t: 'Order a dedicated Direct Connect connection as the main path, keep the single tunnel as backup', why: 'A new dedicated line takes weeks to months; the spare tunnel is already part of the connection.' },
          { t: 'Move the VPN connection to a transit gateway and turn on acceleration for the one tunnel', why: 'Acceleration changes the path into AWS, not the number of tunnels; one tunnel still drops.' },
          { t: 'Keep the single tunnel and switch to dynamic routing with BGP so that it reconnects faster', why: 'BGP speeds failover between tunnels; with one tunnel there is nothing to fail over to.' },
          { t: 'Configure the second tunnel on the router as well, and use BGP to fail over between them', ok: true, why: 'Both tunnels come with the connection, in different AZs; BGP gives the fast failover.' }] },
      { id: 'q3', q: 'A data center sends encrypted backups over a Site-to-Site VPN to a virtual private gateway, and throughput stops near the 1.25 Gbps limit of one standard tunnel. A Direct Connect line arrives in four months; until then the company needs about three times that rate over its existing internet link. Which change provides it?', words: ['three times that rate', 'existing internet link'],
        expl: 'More than one tunnel’s worth over the internet means aggregating tunnels with ECMP, which a transit gateway does and a virtual private gateway does not, and which needs BGP. Acceleration is also transit-gateway only. Large Bandwidth Tunnels, on a transit gateway or Cloud WAN, are another way past one standard tunnel.',
        opts: [
          { t: 'Keep the virtual private gateway and turn on ECMP across both tunnels of the connection', why: 'A virtual private gateway does not do ECMP, so the rate stays at one tunnel’s limit.' },
          { t: 'Move the VPN to a transit gateway and spread the traffic over tunnels with ECMP and BGP', ok: true, why: 'On a transit gateway, ECMP with BGP aggregates tunnels past one tunnel’s 1.25 Gbps.' },
          { t: 'Keep the virtual private gateway and turn on acceleration for the existing VPN connection', why: 'Accelerated VPN works only on a transit gateway, and it improves the path, not the tunnel limit.' },
          { t: 'Order a new dedicated Direct Connect connection to carry the backups from this month', why: 'A new dedicated connection takes weeks to months; the rate is needed before any line arrives.' }] },
      { id: 'q4', q: 'A company has two Direct Connect connections on separate devices, both at one Direct Connect location. An audit now requires connectivity that survives a fibre cut, a device failure and the loss of a whole location, still with two connections. Which change meets the audit?', words: ['loss of a whole location', 'still with two connections'],
        expl: 'Two connections in one location is the Development and Test model: it survives a device failure only. One connection at each of two locations is High Resiliency, which also survives a fibre cut and a location failure. Encryption and a Direct Connect gateway add no second location.',
        opts: [
          { t: 'Keep both at the location and add MACsec encryption to each of the two connections', why: 'MACsec encrypts the traffic; both connections still depend on one location.' },
          { t: 'Replace both with a single 100 Gbps dedicated connection at the same DX location', why: 'One connection is one fibre and one device in one location; 100 Gbps adds speed, not survival.' },
          { t: 'Move one of the connections to a second Direct Connect location, one connection at each', ok: true, why: 'One connection at each of two locations is High Resiliency: fibre, device and location failure.' },
          { t: 'Keep both at the location and associate them with a Direct Connect gateway for redundancy', why: 'A Direct Connect gateway reaches VPCs in many Regions; it does not add a second location.' }] }
    ]
  }
]);
