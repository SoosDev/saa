# Session 3 — Networking & Connectivity: build brief

Built as `sessions/03-networking/` on the same engine and design as Sessions 1 and 2. Follows CONTEXT.md §9. Cluster 3 in §5: DX / VPN / TGW / peering / PrivateLink / endpoints / NAT. Networking is weak for him; his misses here are **Q7** (peering is not transitive, tag F) and **Q46** (bastion in a private subnet, tag R), plus the **prestige-distractor** habit (Transit Gateway, Global Accelerator, Network Firewall picked where they had no role).

## Colour rule

The same service keeps the same colour on every page. The six Session 1 hues (DataSync blue, Gateway orange, Transfer purple, truck grey dashed, DMS green, MGN red) are **not** reused. Session 3 declares **three new hues** for the three most-confused families; everything else is an ink line.

| Token | Line | Light | Dark | Text variant |
|---|---|---|---|---|
| `--dx` | Direct Connect | `#A3237A` magenta | `#E27BBE` | not needed (6.82:1 on white, 5.73:1 on `--zone-aws`) |
| `--tgw` | Transit Gateway | `#0A7A99` teal | `#4DB6D9` | `--tgw-text` `#086A85` light (6.16:1 on white, 5.17:1 on zone), `#4DB6D9` dark |
| `--pl` | VPC endpoints / PrivateLink | `#736400` olive | `#C2C25A` | not needed (5.91:1 on white) |

Dark contrast on `#182029`: DX 6.11, TGW 7.05, PL ≥ 7 (all ≥ 4.5).

**Colour-blind check** (CIEDE2000 after Machado-2009 simulation, worst pair involving a new hue, light theme): normal 14.8 (TGW–truck grey); deuteranopia 5.6 (DX–truck grey), protanopia 7.8 (PL–MGN), tritanopia 4.3 (TGW–DMS). Nine hues cannot all separate under CVD, so the rule from CONTEXT §7 holds: every line is **labelled**, the truck is always dashed, charts use ink bars with swatch + label, and DX / truck / DMS never share a Session 3 page. Dark theme worst: protanopia PL–Gateway orange 5.0 (Gateway does not appear in Session 3).

**Ink lines (4 px)**, told apart by dash and station shape:

| Line | Dash | Stations |
|---|---|---|
| VPC · subnets · IGW (`vpc`) | solid | squares |
| Bastion · Session Manager (`access`) | `2 7` short dashes | squares / circles |
| NAT gateway (`nat`) | `10 6` dashes + up-chevron | hexagon |
| Security groups · NACLs (`filter`) | solid, horizontal | diamonds |
| VPC peering (`peer`) | `1 9` round dots | circles |
| Site-to-Site VPN · Client VPN (`vpn`) | `12 8` long dashes | triangles |
| Network Firewall · GWLB (`inspect`) | solid | triangles |

Topic (neutral chip, no hue): `observe` = Flow Logs · Reachability Analyzer. Global Accelerator is **not** a line here (Session 4 owns it); it appears only as a named distractor.

Domains: D1 (SG/NACL, bastion/SSM, DX encryption, endpoints), D2 (NAT per AZ, DX resiliency, VPN tunnels), D3 (DX bandwidth, TGW), D4 (gateway endpoint vs NAT, peering vs TGW cost).

## Facts verified 2026-09-24 (AWS docs via the AWS MCP server)

- **VPC/subnet IPv4 CIDR /16 to /28; 5 reserved per subnet** (.0 network, .1 router, .2 DNS, .3 future, last = broadcast) — https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html
- **5 IPv4 CIDR blocks per VPC** (primary + 4 secondary; adjustable to 50); VPCs per Region 5; subnets per VPC 200 — https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- IPv6: VPC **/56**, subnet **/64** — https://docs.aws.amazon.com/whitepapers/latest/ipv6-on-aws/planning-ipv6-adoption-in-the-aws-cloud-network.html
- Public subnet = route table has a route to an IGW; instance needs public IPv4/EIP; **instances in a private subnet can't reach the internet even with a public IP**; IGW has no charge, no bandwidth constraint — https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- NAT gateway: created in one AZ, redundant in that AZ; one per AZ for resiliency; **5 Gbps → 100 Gbps**, 1M → 10M pps; TCP/UDP/ICMP; 55,000 connections per IP per destination; up to 8 IPs (zonal) — https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html
- **Regional NAT gateway** (Nov 2025): expands across AZs automatically (up to 60 min), **no public subnet needed**, own route table, up to 32 IPs per AZ, no private NAT (use zonal) — https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateways-regional.html · blog https://aws.amazon.com/blogs/networking-and-content-delivery/introducing-amazon-vpc-regional-nat-gateway/
- NAT instance: **disable source/destination check**; NAT AMI is on Amazon Linux AMI 2018.03 (end of maintenance 31 Dec 2023); AWS recommends NAT gateway — https://docs.aws.amazon.com/vpc/latest/userguide/work-with-nat-instances.html · https://docs.aws.amazon.com/vpc/latest/userguide/VPC_NAT_Instance.html
- Egress-only IGW: IPv6, stateful, outbound only, no security group — https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html
- Security groups: **allow rules only**, new SG no inbound / all outbound, rules aggregated — https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- NACL: numbered rules, **lowest first, first match applies**, allow/deny, `*` default deny — https://docs.aws.amazon.com/vpc/latest/userguide/nacl-rules.html
- Ephemeral ports: Linux 32768–61000, ELB 1024–65535, Windows 2008+ 49152–65535, NAT gateway 1024–65535; open 1024–65535 in practice — https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- SG stateful vs NACL stateless — https://repost.aws/knowledge-center/resolve-connection-sg-acl-inbound
- Bastion launched in the **public** subnet; instance SG allows SSH from the bastion SG — https://docs.aws.amazon.com/vpc/latest/privatelink/getting-started.html
- Session Manager: no inbound ports, no SSH keys, IAM; port forwarding to remote hosts — https://repost.aws/knowledge-center/systems-manager-ssh-vpc-resources · logs to S3 / CloudWatch Logs — https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-s3.html
- EC2 Instance Connect Endpoint: identity-aware TCP proxy, no public IP needed, SG rules allow management ports from the endpoint — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-with-ec2-instance-connect-endpoint.html
- VPC peering: **not transitive**, **no edge-to-edge** (IGW, NAT, VPN, DX, gateway endpoint), **no overlapping CIDRs** (any block), one peering per pair, inter-Region MTU 8500 — https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html · cross-account and cross-Region — https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateVpcPeeringConnection.html · **no charge to create; same-AZ data free** — https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html
- Transit Gateway: attachments (VPC, Connect, DX gateway, TGW peering incl. inter-Region, VPN, VPN Concentrator, Client VPN endpoint, network function); route tables, one association per attachment, propagation; peering needs static routes; MTU 8500 (VPN 1500); billed per attachment-hour + per GB — https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html · pricing + multicast data charge — https://aws.amazon.com/transit-gateway/pricing/ · 100 Gbps per VPC attachment per AZ, Connect peer 5 Gbps (4 per attachment) — https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html · Connect = GRE + BGP — https://docs.aws.amazon.com/vpc/latest/tgw/tgw-connect.html
- Gateway endpoints: **S3 and DynamoDB**, **no additional charge**, **not from on-prem, peered VPCs in other Regions, or through a TGW** — https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html · https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-ddb.html · S3 comparison table — https://docs.aws.amazon.com/AmazonS3/latest/userguide/privatelink-interface-endpoints.html
- Interface endpoints: ENI with private IP per subnet; billed per hour per AZ + per GB — https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html · https://aws.amazon.com/privatelink/faqs/
- Endpoint services behind NLB (one NLB → one endpoint service), source IP = NLB, cross-Region access option — https://docs.aws.amazon.com/vpc/latest/privatelink/create-endpoint-service.html · **PrivateLink cross-Region for AWS services (2025)** — https://aws.amazon.com/about-aws/whats-new/2025/11/aws-privatelink-cross-region-connectivity-aws-services/
- VPC Lattice: service networks, HTTP/HTTPS/gRPC/TCP, across VPCs/accounts, auth policies, RAM — https://aws.amazon.com/vpc/lattice/faqs/ (kept as “recognise it”; rare in SAA-C03 banks)
- Site-to-Site VPN: **2 tunnels, different AZs** — https://docs.aws.amazon.com/vpn/latest/s2svpn/VPNTunnels.html · **1.25 Gbps per standard tunnel, 140k pps; Large Bandwidth Tunnel 5 Gbps (TGW / Cloud WAN only); VPN Concentrator 100 Mbps**; ECMP only on TGW with dynamic routing — https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-limits.html
- Accelerated VPN: **TGW only**, not with DX public VIF, NAT-T required — https://docs.aws.amazon.com/vpn/latest/s2svpn/accelerated-vpn.html
- VPN CloudHub: VGW + multiple CGWs, unique BGP ASNs, non-overlapping ranges — https://docs.aws.amazon.com/whitepapers/latest/aws-vpc-connectivity-options/aws-vpn-cloudhub.html
- Client VPN: managed, OpenVPN-based; AD, mutual certificate, SAML auth — https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/what-is.html · https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/client-authentication.html
- Direct Connect: **dedicated 1/10/100/400 Gbps; hosted 50/100/200/300/400/500 Mbps, 1/2/5/10/25 Gbps** — https://docs.aws.amazon.com/directconnect/latest/UserGuide/connection_options.html · https://docs.aws.amazon.com/directconnect/latest/UserGuide/hosted_connection.html
- DX **not encrypted by default** — https://docs.aws.amazon.com/directconnect/latest/UserGuide/encryption-in-transit.html · **MACsec on 10/100/400 Gbps dedicated**, not on 1 Gbps or hosted — https://docs.aws.amazon.com/directconnect/latest/UserGuide/MACsec.html · IPsec over public/transit/private VIF, Private IP VPN — https://docs.aws.amazon.com/wellarchitected/latest/hybrid-networking-lens/aws-direct-connect-and-ipsec-vpn.html
- VIF types (private / public / transit); DX gateway reaches any Region except China — https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html · DX gateway does not route VPC↔VPC — https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-gateways-intro.html
- Lead time: net-new dedicated “several weeks to months”, hosted on existing partner port “hours to days” — https://docs.aws.amazon.com/whitepapers/latest/hybrid-connectivity/time-to-deploy.html · LOA-CFA, billing after 90 days — https://docs.aws.amazon.com/directconnect/latest/UserGuide/dedicated_connection.html
- Resiliency Toolkit: Maximum / High / Development and Test — https://docs.aws.amazon.com/directconnect/latest/UserGuide/disaster-recovery-resiliency.html · VPN backup recommended for DX ≤ 1 Gbps — https://aws.amazon.com/directconnect/resiliency-recommendation/
- SiteLink: DX location to DX location without entering a Region — https://docs.aws.amazon.com/reference-architecture-diagrams/latest/routing-scenarios-with-aws-direct-connect-sitelink/routing-scenarios-with-aws-direct-connect-sitelink.html
- Global Accelerator: 2 static anycast IPv4 (4 with dual-stack), endpoints ALB/NLB/EC2/EIP — https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html
- Network Firewall: domain lists via host header / SNI, Suricata rules — https://repost.aws/knowledge-center/network-firewall-configure-domain-rules
- Gateway Load Balancer: layer 3, GENEVE 6081, GWLB endpoints as route next hop — https://docs.aws.amazon.com/elasticloadbalancing/latest/gateway/introduction.html
- Flow Logs: VPC/subnet/ENI, to CloudWatch Logs/S3/Firehose, off the data path — https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html · Reachability Analyzer: config model, **sends no packets** — https://docs.aws.amazon.com/vpc/latest/reachability/how-reachability-analyzer-works.html
- RAM VPC sharing (subnets, same Organization) — https://docs.aws.amazon.com/vpc/latest/userguide/vpc-sharing.html · IPAM — https://docs.aws.amazon.com/prescriptive-guidance/latest/robust-network-design-control-tower/ipam.html
- Route 53 VPC Resolver: unchanged from Session 2 (CONTEXT §6).

### Changed since the exam guide (shown as callouts)

| Old (banks / older courses) | Now | Source |
|---|---|---|
| One NAT gateway per AZ, always in a public subnet | Also **regional NAT gateway** (Nov 2025): multi-AZ, no public subnet | nat-gateways-regional.html |
| VPN tunnel max 1.25 Gbps | Still for standard tunnels; **Large Bandwidth Tunnels up to 5 Gbps** on TGW / Cloud WAN | vpn-limits.html |
| MACsec on 10 and 100 Gbps | **10, 100 and 400 Gbps** dedicated | MACsec.html |
| DX dedicated 1/10/100 Gbps | **400 Gbps** added; hosted up to **25 Gbps** | connection_options.html |
| Interface endpoints are same-Region only | **Cross-Region** PrivateLink for select AWS services and endpoint services | whats-new 2025/11 |
| NAT instance from the AWS NAT AMI | NAT AMI is past end of maintenance; build your own or use NAT gateway | VPC_NAT_Instance.html |
| Bastion in a public subnet is *the* admin answer | Still the bank answer; AWS now prefers **Session Manager** / **EC2 Instance Connect Endpoint** | EIC Endpoint docs |

## Stub for this session (replaces Session 1's slots)

| Slot | Values | Why this slot |
|---|---|---|
| WHO ↔ WHO | internet↔VPC · inside one VPC · VPC↔VPC · on-prem↔AWS · VPC→service | The two ends pick the family (gateway/NAT, SG/NACL, peering/TGW, VPN/DX, endpoints) before any option is read. It is the slot that kills a DX answer to an S3-endpoint question. |
| SCALE | one pair · many / hub · n/a | The peering-vs-TGW decision and the prestige trap (TGW for two VPCs; Q7). |
| PATH | public internet · encrypted tunnel · private AWS network · dedicated line · n/a | Separates VPN from DX, NAT from endpoints, and catches “must be encrypted” / “must not touch the internet”. |
| SUPERLATIVE | cheapest · least ops · most secure · resilient · fastest to set up · consistent bandwidth · none stated | Networking questions add “fastest to set up” (VPN vs DX lead time) and “consistent bandwidth” (DX) to the usual set. |

## Learn: 12 chapters (full text in `learn.js`; ▶ = interactive)

1. **How to read a networking question** — his record (Q7, Q46, prestige), two-ends table, stub, prestige “built for” hooks. ▶ stub trainer on Q7 · ▶ checkpoint.
2. **The VPC** — CIDR /16–/28, secondary CIDRs, IPv6 /56 /64, IPAM, subnets per AZ, 5 reserved, route tables, public = route to IGW, IGW. ▶ **CIDR calculator** (usable hosts, reserved addresses strip chart with tooltips, smallest fitting prefix, overlap check for peering, canonical form) · ▶ K2, K1.
3. **NAT** — NAT gateway facts, zonal per AZ, regional callout, NAT instance (src/dst check), egress-only IGW, triggers. ▶ pair NAT gw · instance · ▶ K3, K4.
4. **SG vs NACL** — table, ephemeral ports both directions, three patterns, Network Firewall prestige trap. ▶ **packet walker** (6 flows: missing ephemeral, fixed, deny 200 too late, deny 50, instance-initiated missing inbound ephemeral, fixed; rule tables highlight matched rule; step hop by hop; “apply the fix”) · ▶ pair · ▶ K5, K6, K7.
5. **Admin access** — bastion (public subnet), Session Manager, EIC Endpoint. ▶ stepper “build a bastion” · ▶ pair (3 sides) · ▶ Q46, K25.
6. **Peering** — can/can't, three rules, N×(N−1)/2. ▶ **route simulator** (peering vs TGW; add B–C peering; segmentation; edge-to-edge to on-prem/internet; centralised egress) · ▶ Q7, K16.
7. **Transit Gateway** — attachments, route tables/segmentation, centralised egress/inspection, multicast, bandwidth, billing, VPC sharing. ▶ pair peering · TGW · ▶ K12, K13.
8. **Endpoints & PrivateLink** — gateway vs interface, cross-Region callout, endpoint services, VPC Lattice. ▶ pair · ▶ pair peering · PrivateLink · ▶ **endpoint chooser** (generic `chooser`) · ▶ K8, K9, K11.
9. **VPN** — S2S facts, LBT callout, accelerated, CloudHub, Client VPN, GA prestige trap. ▶ stepper VPN setup · ▶ K17, K18.
10. **Direct Connect** — types, lead time, VIFs, DX gateway, encryption, resiliency models, VPN backup, SiteLink. ▶ **hybrid link chooser** + **hand-built log-scale SVG bandwidth chart** (VPN standard / LBT, DX hosted / dedicated ports; ink bars, swatch + label, tooltips, need marker) · ▶ pair VPN · DX · ▶ K20, K21, K24.
11. **Inspection, troubleshooting, prestige distractors** — Network Firewall, GWLB, Flow Logs, Reachability Analyzer, Resolver link to Session 2, prestige table. ▶ pair · ▶ sorter “needed or prestige?” · ▶ K26, K28.
12. **Triggers, traps, cheat, record** — ▶ network map, trigger table, cheat block, log.

## Map

`core.js` `map.items`, viewBox 1000×820: internet band, on-prem zone with data center, AWS Region with VPC A (public/private subnets), VPC B, VPC C, inspection VPC, AWS services box, provider VPC. Lines: access, IGW, NAT (up-chevron), filter (between subnets), peering (A–B, arc A–C, “no B–C” mark), TGW hub (A, B, C, inspection, DX gateway), inspect, VPN (CGW → VGW), DX (router → DX location → DX gateway → TGW), endpoints (app servers → S3/DynamoDB gateway endpoint, interface endpoint, provider NLB). Box and subnet labels are drawn last with a surface halo.

## Traps (15)
Transitive peering (Q7) · bastion in private subnet (Q46) · TGW for two VPCs · Global Accelerator as a connectivity answer · Network Firewall to block one IP · SG deny rule · NACL without ephemeral ports · NAT for inbound · one zonal NAT for every AZ · gateway endpoint for the wrong service / from on-prem · edge-to-edge through peering · overlapping CIDR peering · DX encrypted · DX with a deadline of days · single DX called highly available.

## Cheat block
See `S.cheat` in `core.js` (printed on the Cheat sheet tab and in chapter 12).

## Compare pairs (8)
peering · TGW · gateway · interface endpoint · NAT gateway · NAT instance · SG · NACL · VPN · DX · peering · PrivateLink · bastion · Session Manager · EIC Endpoint · Network Firewall · GWLB. Each has a quick check.

## Trigger cards (40)
c01–c05 VPC (CIDR limits, /24 = 251, reserved five, public subnet, IPv6 sizes) · c06–c09 NAT (per AZ/regional, src/dst check, egress-only, no SG on NAT gw) · c10–c14 filter · c15–c17 access (**c15 mine, Exam Q46**) · c18–c21 peering (**c18 mine, Exam Q7**) · c22–c25 TGW · c26 Flow Logs vs Reachability Analyzer (topic `observe`) · c27–c30 endpoints · c31–c34 VPN · c35–c39 DX · c40 Network Firewall / GWLB.

## Drills (30)
Stub values as above; every option has a why; `words` verbatim in `q`; two select-TWO (K2, K21); correct letters spread across A–D.

| ID | Line | Scenario → answer | Prestige/other distractors |
|---|---|---|---|
| **Q7** (mine, F) | peer | A–B, A–C peered; B needs C; cheapest, least config → peer B–C | route via A, **TGW**, DNS resolution |
| **Q46** (mine, R) | access | single hardened bastion, minimal exposure → bastion in public subnet, SG from corp range, app SG from bastion SG | bastion in private subnet + EIP, NAT inbound, 0.0.0.0/0 |
| K1 | vpc | 120 addresses, smallest subnet → /25 | /24, /26, /27 |
| K2 | vpc | (TWO) new subnet unreachable → route to IGW + public IP | NAT, SG ephemeral, egress-only IGW |
| K3 | nat | outbound only, survive AZ loss, least ops → NAT gw per AZ | NAT instance, egress-only, IGW |
| K4 | nat | new NAT instance fails → src/dst check | NAT AMI only, egress-only, IAM |
| K15 | nat | IPv6 out only → egress-only IGW | NAT gw, IPv4, **GA** |
| K5 | filter | custom NACL, requests time out → NACL outbound 1024–65535 | SG outbound, NACL inbound, **Network Firewall** |
| K6 | filter | block 198.51.100.0/24, cheapest → NACL deny rule 50 | SG deny, rule 200, **Network Firewall** |
| K7 | filter | app tier only from web tier → SG references SG | VPC CIDR, Lambda, NACL |
| K8 | pl | S3 via NAT expensive → gateway endpoint | interface endpoint, **GA**, NAT instance |
| K9 | pl | on-prem over DX to S3 privately → interface endpoint | gateway endpoint, public VIF, Transfer Acceleration |
| K10 | pl | SQS + KMS no internet → interface endpoints | gateway endpoints, NAT, peering |
| K11 | pl | SaaS to hundreds of VPCs, same CIDR → endpoint service + NLB | peering, TGW, **GA** |
| K14 | peer | two VPCs, cheapest → peering | **TGW**, VPN, endpoint service |
| K16 | peer | B uses A's NAT via peering → NAT in B | route back, DNS, TGW egress |
| K12 | tgw | 40 VPCs/12 accounts + 2 DCs → TGW + RAM | mesh, transit VPC, DX gateway |
| K13 | tgw | dev never reaches prod → TGW route tables | NACLs, SG on TGW, TGW per env |
| K17 | vpn | 1 week, encrypted → S2S VPN | DX, Client VPN, **GA** |
| K18 | vpn | 800 remote laptops, AD → Client VPN | S2S per laptop, bastion, DX |
| K19 | vpn | branches to each other, same VGW → CloudHub | SiteLink, peering, **Network Firewall** |
| K20 | dx | consistent 10 Gbps, 3 months → 10G dedicated DX | VGW ECMP, accelerated VPN, **GA** |
| K21 | dx | (TWO) encrypt DX → MACsec, VPN over DX | “encrypted by default”, **Network Firewall**, VIF setting |
| K22 | dx | survive location loss, highest → Maximum Resiliency | dev/test, VPN backup, **GA** |
| K23 | dx | low-cost DX backup → S2S VPN | second DX, hosted, TGW Connect |
| K24 | dx | one DX to 3 Regions → DX gateway | private VIF per Region, peering relay, **GA** |
| K25 | access | no inbound SSH, no keys, logs → Session Manager | bastion, EIC Endpoint, Client VPN |
| K26 | inspect | domain allow-list + IPS for 30 VPCs → **Network Firewall** (the real use) | SG, NACL, Flow Logs |
| K27 | inspect | licensed third-party appliances transparent → GWLB | ALB, Network Firewall, NLB |
| K28 | observe | find blocking component without traffic → Reachability Analyzer | Flow Logs, CloudTrail, NFW logs |

## Checks (CONTEXT §9 step 4)
`tools/check/widgets-03-networking.js` interacts with every Session 3 widget (stub trainer, CIDR calculator incl. tooltip, packet walker incl. fix, two steppers, route simulator incl. segmentation, endpoint chooser, hybrid chooser incl. chart tooltip, sorter, map, trigger table, three pair quick checks, progress charts). `node check.js 03-networking` → ALL PASS; 01-storage and 02-migration re-run → ALL PASS. Screenshots: `design/compare/s3-*.png`.

## Done when
12 chapters with all ▶ elements, 8 pairs, 40 cards, 30 drills, 15 traps, cheat sheet, progress, manifest entry; the lead merges “Facts verified” and “Changed since the exam guide” into CONTEXT §6.
