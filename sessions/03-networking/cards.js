/* Session 3 trigger cards (Networking & connectivity). f = what the exam says, b = the answer. line = transit line id or topic. */
(function () {
  'use strict';
  const S = window.SESSION = window.SESSION || {};
  const _c = (id, line, f, b, why, tempt, extra) => Object.assign({ id, line, f, b, why, tempt }, extra || {});
  const RNAT = { update: 'Regional NAT gateways (Nov 2025) span every AZ with workloads and need no public subnet. Banks still expect one zonal NAT gateway per AZ.' };
  S.cards = [
    /* VPC */
    _c('c01', 'vpc', 'Smallest and largest IPv4 CIDR for a VPC or subnet', '/28 to /16', 'A /28 has 16 addresses, a /16 has 65,536. Add up to 4 secondary IPv4 CIDRs to grow a VPC (5 per VPC by default).', '/8 — far larger than AWS allows.'),
    _c('c02', 'vpc', 'Usable IP addresses in a /24 subnet', '251', '256 minus the 5 AWS reserves in every subnet.', '254 — the on-prem habit that forgets AWS’s extra 3.'),
    _c('c03', 'vpc', 'Which 5 addresses does AWS reserve in 10.0.0.0/24?', '.0 network · .1 router · .2 DNS · .3 future use · .255 broadcast', 'First four and the last in every subnet.', '“Only network and broadcast” — that is plain IPv4, not AWS.'),
    _c('c04', 'vpc', 'What makes a subnet public?', 'A route 0.0.0.0/0 → internet gateway in its route table', 'The instance also needs a public IPv4 or Elastic IP; without the route even a public IP is useless.', '“The VPC has an internet gateway” — attached to the VPC, but the route table decides.'),
    _c('c05', 'vpc', 'IPv6 sizes in a VPC', 'VPC /56 · subnet /64', 'IPv6 addresses are globally unique; outbound-only needs an egress-only IGW.', 'NAT gateway for IPv6 privacy.'),
    /* NAT */
    _c('c06', 'nat', 'Private instances need outbound internet, highly available, least ops', 'NAT gateway in each AZ (zonal) — or one regional NAT gateway', 'Managed, 5 → 100 Gbps; a zonal NAT gateway fails with its AZ.', 'One NAT gateway for all AZs.', RNAT),
    _c('c07', 'nat', 'A NAT instance does not forward traffic', 'Disable source/destination check', 'An instance drops traffic not addressed to itself unless the check is off.', 'Add an IAM role.'),
    _c('c08', 'nat', 'IPv6 outbound only, nothing may connect in', 'Egress-only internet gateway', 'Stateful, IPv6-only, outbound.', 'NAT gateway — IPv6 needs no translation.'),
    _c('c09', 'nat', 'Filter traffic through a NAT gateway', 'NACLs on its subnet (no security group on a NAT gateway)', 'You cannot attach a security group to a NAT gateway; NAT instances do have one.', 'Attach a security group to the NAT gateway.'),
    /* filter */
    _c('c10', 'filter', 'Stateful, allow rules only, on the instance', 'Security group', 'Replies are automatic; all rules are evaluated together.', 'Network ACL.'),
    _c('c11', 'filter', 'Stateless, allow AND deny, numbered rules, on the subnet', 'Network ACL', 'Lowest matching rule number wins; return traffic must be allowed.', 'Security group.'),
    _c('c12', 'filter', 'Block one IP range now, for a whole subnet', 'NACL deny rule numbered before the allow rules', 'Free, subnet-wide, instant.', 'AWS Network Firewall — prestige distractor for a one-line rule.'),
    _c('c13', 'filter', 'Custom NACL: connections open but responses time out', 'Allow ephemeral ports 1024–65535 (outbound for replies)', 'Stateless: the reply goes to the client’s ephemeral port.', 'Add a security group outbound rule — SGs are stateful.'),
    _c('c14', 'filter', 'App tier accepts traffic only from the web tier, IPs change', 'Security group rule with the web tier’s security group as source', 'Membership, not addresses.', 'Allow the VPC CIDR.'),
    /* access */
    _c('c15', 'access', 'SSH to private instances through a jump host', 'Bastion in a PUBLIC subnet; app SG allows 22 only from the bastion SG', 'A private subnet has no route to the IGW, so a bastion there is unreachable.', 'Bastion in a private subnet with an Elastic IP.', { mine: true, src: 'Exam Q46', update: 'Current AWS guidance prefers Session Manager or EC2 Instance Connect Endpoint to a bastion.' }),
    _c('c16', 'access', 'No inbound ports, no SSH keys, log every session', 'Systems Manager Session Manager', 'IAM-controlled shell; logs to S3 or CloudWatch Logs.', 'Bastion host with rotated keys.'),
    _c('c17', 'access', 'SSH or RDP to a private IP, no bastion, no public IP, IAM-authorised', 'EC2 Instance Connect Endpoint', 'Identity-aware TCP proxy in your subnet; instances still allow 22 from it.', 'NAT gateway.'),
    /* peering */
    _c('c18', 'peer', 'A↔B and A↔C are peered. Can B reach C?', 'No — peering is not transitive; peer B↔C (or use a transit gateway for many)', 'You have no peering relationship with VPCs you are not directly peered with.', 'Route B → C through A.', { mine: true, src: 'Exam Q7' }),
    _c('c19', 'peer', 'Peer two VPCs that both use 10.0.0.0/16', 'Impossible — overlapping CIDRs; re-address or use PrivateLink', 'Any overlap in any CIDR fails the peering.', 'Peer and filter with security groups.'),
    _c('c20', 'peer', 'Use a peer VPC’s internet gateway, NAT gateway, VPN, DX or S3 gateway endpoint', 'Not possible (no edge-to-edge routing)', 'Each VPC needs its own, or centralise through a transit gateway.', 'Add a route through the peering connection.'),
    _c('c21', 'peer', 'Two VPCs, lowest cost, cross-account or cross-Region', 'VPC peering', 'No charge to create; data within one AZ is free; works across accounts and Regions.', 'Transit Gateway — prestige distractor for one pair.'),
    /* TGW */
    _c('c22', 'tgw', 'Dozens of VPCs and on-prem networks, all-to-all, least ops', 'Transit Gateway (share across accounts with RAM)', 'One hub, one attachment per network.', 'Full mesh of peering.'),
    _c('c23', 'tgw', 'Dev must not reach prod on the same hub', 'Separate transit gateway route tables', 'Each attachment is associated with exactly one TGW route table.', 'A security group on the transit gateway.'),
    _c('c24', 'tgw', 'Connect hubs in two Regions', 'Transit gateway inter-Region peering (static routes)', 'Traffic stays on the AWS backbone.', 'VPC peering between every pair of VPCs.'),
    _c('c25', 'tgw', 'More VPN bandwidth than one tunnel gives', 'VPN on a transit gateway with ECMP (dynamic routing)', 'ECMP aggregates tunnels; Large Bandwidth Tunnels (5 Gbps) are also TGW-only.', 'More tunnels on a virtual private gateway — no ECMP there.'),
    _c('c26', 'observe', 'Which rule blocks the path? / What traffic was rejected last week?', 'VPC Reachability Analyzer / VPC Flow Logs', 'Reachability Analyzer models the configuration and names the blocking component, without sending packets. Flow Logs record real IP flows (accept/reject) to CloudWatch Logs, S3 or Firehose.', 'CloudTrail — it records API calls, not packets.'),
    /* endpoints */
    _c('c27', 'pl', 'S3 or DynamoDB from private subnets, no NAT, cheapest', 'Gateway VPC endpoint', 'Route-table target, no charge.', 'Interface endpoint — works, but billed.'),
    _c('c28', 'pl', 'SQS, KMS, Secrets Manager, SSM APIs from a private subnet, no internet', 'Interface VPC endpoint (PrivateLink)', 'An ENI with a private IP; private DNS keeps default names working.', 'Gateway endpoint — S3 and DynamoDB only.'),
    _c('c29', 'pl', 'S3 privately from on-premises over DX or VPN', 'Interface endpoint for S3', 'Gateway endpoints do not allow access from on-premises.', 'Gateway endpoint.'),
    _c('c30', 'pl', 'Expose one service to hundreds of VPCs, overlapping CIDRs', 'VPC endpoint service (PrivateLink) behind a Network Load Balancer', 'One direction, one service, no routing between networks.', 'VPC peering.'),
    /* VPN */
    _c('c31', 'vpn', 'Encrypted link to on-prem, needed in days', 'Site-to-Site VPN', 'Two IPsec tunnels in two AZs; up to 1.25 Gbps per standard tunnel.', 'Direct Connect — weeks, and unencrypted.', { update: 'Large Bandwidth Tunnels (up to 5 Gbps) exist for VPNs on a transit gateway or Cloud WAN.' }),
    _c('c32', 'vpn', 'Remote employees on laptops need network access', 'AWS Client VPN', 'Managed OpenVPN-based service; AD or certificate auth.', 'Site-to-Site VPN per laptop.'),
    _c('c33', 'vpn', 'Branch offices talk to each other through their VPNs to one VGW', 'AWS VPN CloudHub', 'VGW re-advertises each branch’s BGP routes; unique ASNs.', 'Direct Connect SiteLink — needs DX at each site.'),
    _c('c34', 'vpn', 'Better VPN performance from far away', 'Accelerated Site-to-Site VPN (transit gateway only)', 'Enters the AWS network at the nearest edge via Global Accelerator.', 'Accelerated VPN on a virtual private gateway — not supported.'),
    /* DX */
    _c('c35', 'dx', 'Consistent performance, private, lots of data daily, weeks OK', 'AWS Direct Connect', 'Dedicated 1/10/100/400 Gbps, or hosted 50 Mbps–25 Gbps from a partner.', 'Site-to-Site VPN.'),
    _c('c36', 'dx', 'Is Direct Connect encrypted?', 'No — add MACsec (10/100/400 Gbps dedicated) or run a VPN over DX', 'DX does not encrypt traffic in transit by default.', '“Yes, it’s private so it’s encrypted.”'),
    _c('c37', 'dx', 'One DX connection to VPCs in several Regions or accounts', 'Direct Connect gateway', 'Global resource; private VIF → VGWs, transit VIF → transit gateways.', 'Peer the local VPC to the others (edge-to-edge).'),
    _c('c38', 'dx', 'Low-cost backup for Direct Connect', 'Site-to-Site VPN, with BGP preferring DX', 'Cheap and fast; fits DX up to about 1 Gbps.', 'A second DX at the same location.'),
    _c('c39', 'dx', 'Survive device, fibre and whole-location failure', 'Maximum Resiliency: separate connections on separate devices at 2+ DX locations', 'Resiliency Toolkit models: Maximum, High, Development and Test.', 'Two connections at one location.'),
    /* inspection + tools */
    _c('c40', 'inspect', 'Domain allow-list and intrusion prevention for all VPC egress / your own appliances inline', 'AWS Network Firewall / Gateway Load Balancer', 'Network Firewall = AWS-managed rules; GWLB = your third-party appliances, transparently (GENEVE 6081).', 'NACLs or security groups — no domains, no IPS.')
  ];
})();
