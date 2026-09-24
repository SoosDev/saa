# Session 4 — Global Architecture & Edge: build brief

Built as `sessions/04-global/` on the same engine and design as Sessions 1–3. Follows CONTEXT.md §9. Cluster 4 in §5: CloudFront / Global Accelerator / Route 53 (D2 ●● D3 ●●, weak). His misses here: **Q4** (CloudFront vs S3 Transfer Acceleration, tag C — also taught in Session 1, repeated here as a mine drill and card), **Q53** (S3 static website + Route 53, tag F), **Q43** (“path/host-based routing” → ALB, tag K), and the **prestige-distractor** habit: **Global Accelerator chosen twice** where it had no role.

## Colour rule

The same service keeps the same colour on every page. The nine earlier hues (DataSync blue, Gateway orange, Transfer purple, truck grey dashed, DMS green, MGN red, DX magenta, TGW teal, PrivateLink olive) are **not** reused. Session 4 declares **two new hues** for the most-confused pair; everything else is an ink line.

| Token | Line | Light | Dark (line) | Text variant |
|---|---|---|---|---|
| `--cf` | CloudFront | `#8A1538` wine | `#F04880` | `--cf-text`: light `#8A1538`, dark `#F45C8C` |
| `--ga` | Global Accelerator | `#4B2BB0` indigo | `#8078F8` | `--ga-text`: light `#4B2BB0`, dark `#8C86FA` |

Contrast (WCAG): light CF 9.35:1 / GA 9.24:1 on `#FFFFFF`, 7.85 / 7.76 on `--zone-aws`. Dark line colours 4.65 / 4.67 on `#182029`; the dark text variants reach 5.29 / 5.41 on `#182029` and 5.01 / 5.12 on the dark `--zone-aws` (`#16243A`), where the base colours would be 4.41 — hence the `*-text` tokens. Tokens are in all three theme blocks of `assets/css/transit.css`.

**Colour-blind check** (CIEDE2000 after Machado-2009 simulation at severity 1.0, each new hue against all nine existing hues, the ink and each other; worst pair):

| Theme | Normal | Deuteranopia | Protanopia | Tritanopia |
|---|---|---|---|---|
| Light | 9.3 (GA–Transfer) | 9.2 (GA–DataSync) | 7.3 (GA–Transfer) | 9.9 (CF–DX) |
| Dark | 12.0 (GA–Transfer) | 7.2 (GA–DataSync) | 6.9 (GA–Transfer) | 8.4 (CF–MGN) |

CF vs GA: ≥ 22.6 under every simulation. All worst pairs are better than Session 3’s (4.3). Neither Transfer Family nor DataSync appears in Session 4; every line is still **labelled**, and charts use ink bars with swatch + label.

**Ink lines (4 px)**, told apart by dash and station shape:

| Line | Dash | Stations |
|---|---|---|
| Route 53 (`r53`) | `12 8` long dashes (never in the data path) | diamonds |
| CloudFront Functions · Lambda@Edge (`edge`) | `2 7` short dashes | triangles |
| S3 website · Transfer Acceleration (`s3web`) | `1 9` dots | squares |
| ALB listener rules (`alb`) | solid | hexagons / circles |
| Edge security: OAC · signed URLs · WAF (`protect`) | `10 6` dashes | diamonds |

Topic (neutral chip, no hue): `multi` = Multi-Region patterns. S3 itself has no line colour; Transfer Acceleration is ink.

Domains: D1 (OAC, signed URLs/cookies, WAF, geo restriction, HTTPS/ACM), D2 (failover: Route 53, GA, origin groups; active-passive/active-active), D3 (caching, edge code, latency routing, GA), D4 (versioned names vs invalidation, price classes, Route 53 vs GA cost).

## Facts verified 2026-09-24 (AWS docs via the AWS MCP server)

**CloudFront**
- Miss path: edge location (POP) → regional edge cache → origin; RECs keep less popular objects longer; **PUT/POST/PATCH/OPTIONS/DELETE, dynamic requests, and S3 origins whose best REC is in the bucket’s Region skip the REC**; invalidation clears POPs and RECs — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowCloudFrontWorks.html
- Network size (marketing page, not printed in the site): 750+ POPs, 15 RECs — https://aws.amazon.com/cloudfront/features/
- S3 website endpoint as origin = custom origin, **HTTP only** — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-cloudfront-to-custom-origin.html
- **VPC origins GA 20 Nov 2024** (private ALB, NLB, EC2) — https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-cloudfront-vpc-origins/
- Origin groups: two origins; failover codes **400, 403, 404, 416, 429, 500, 502, 503, 504**; default 3 connection attempts × 10 s; **GET, HEAD, OPTIONS (if cached) only**; stateless per request — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/high_availability_origin_failover.html
- **OAC recommended, OAI legacy**; OAI lacks SSE-KMS, dynamic methods, Regions after Jan 2023 — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html · https://docs.aws.amazon.com/help-panel/AmazonCloudFront/latest/console/distributions-origin-access.html · OAC launch (Aug 2022, SigV4, all methods) — https://aws.amazon.com/blogs/networking-and-content-delivery/amazon-cloudfront-introduces-origin-access-control-oac/ · OAC origin types S3, Lambda URL, MediaStore, MediaPackage v2 — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.OriginAccessControlOriginType.html
- Behaviours matched in list order, default `*` last — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.CfnDistribution.CacheBehaviorProperty.html · cache policy = cache key + TTLs — https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CachePolicyConfig.html · origin request policy — https://repost.aws/knowledge-center/cloudfront-cache-policies · response headers policy — https://aws.amazon.com/blogs/networking-and-content-delivery/adding-http-security-headers-using-amazon-cloudfront/
- **Default TTL 86,400 s**, default max 31,536,000 s, min/max clamp origin headers — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html
- Invalidation: **first 1,000 paths/month free**, wildcard = 1 path — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PayingForInvalidation.html · 3,000 objects + 15 wildcards in progress; versioned names recommended — https://aws.amazon.com/cloudfront/faqs/
- Signed URL (one file / no cookies) vs signed cookies (many files / keep URLs) — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-choosing-signed-urls-cookies.html · trusted key groups recommended, root key pairs legacy — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-trusted-signers.html · expiry, start time, IP range — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-overview.html
- Field-level encryption max 10 fields — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html · geo restriction country allow/block list, 403 — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/georestrictions.html · WAF web ACL CLOUDFRONT scope in us-east-1 — https://docs.aws.amazon.com/cdk/api/v2/dotnet/api/Amazon.CDK.AWS.WAFv2.ICfnWebACLProps.html · Shield Standard free, always on — https://repost.aws/knowledge-center/shield-standard-ddos-attack
- CloudFront Functions vs Lambda@Edge (triggers, runtimes, scale, memory, network/body) — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-choosing.html · **L@E 30 s and 50 MB for all triggers** — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html · L@E in us-east-1, numbered version, no VPC/layers/env vars — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-at-edge-function-restrictions.html · KeyValueStore — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-function-restrictions.html
- **ACM certificate for CloudFront in us-east-1** — https://aws.amazon.com/certificate-manager/faqs/ · SNI free, dedicated IP $600/month — https://aws.amazon.com/cloudfront/faqs/
- Price classes 100 / 200 / All (countries as printed) — https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/ · Origin Shield — https://docs.aws.amazon.com/whitepapers/latest/amazon-cloudfront-media/cloudfront-origin-shield.html
- **Flat-rate plans (18 Nov 2025)**: Free/Pro/Business/Premium bundling CDN, WAF, DDoS, Route 53, S3 credits — https://aws.amazon.com/about-aws/whats-new/2025/11/aws-flat-rate-pricing-plans/ · https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html
- WebSocket — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-working-with.websockets.html · **gRPC (20 Nov 2024)** — https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-cloudfront-supports-grpc-delivery/ · **anycast static IPs (Nov 2024)** — https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-cloudfront-anycast-static-ips/ · allowed/cached methods — https://docs.aws.amazon.com/aws-sdk-php/v3/api/api-cloudfront-2020-05-31.html

**Global Accelerator**
- 2 static anycast IPv4, **4 with dual-stack** (Jul 2022); BYOIP — https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-components.html · https://docs.aws.amazon.com/global-accelerator/latest/dg/WhatsNew.html
- Nearest edge → AWS global network — https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html · TCP/UDP listeners, client affinity — https://docs.aws.amazon.com/boto3/latest/reference/services/globalaccelerator/client/create_listener.html
- One endpoint group per Region per listener — https://docs.aws.amazon.com/global-accelerator/latest/api/API_EndpointGroup.html · traffic dial (default 100%) — https://aws.amazon.com/global-accelerator/features/ · **weights 0–255**, default 128 — https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoints-endpoint-weights.html
- Endpoints **ALB, NLB, EC2, Elastic IP** only — https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoints.html
- Health: ALB/NLB use ELB checks; EC2/EIP GA checks — https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoint-groups-health-check-options.html · “take it out of service in **less than one minute**”, not a cache — https://aws.amazon.com/global-accelerator/faqs/
- Client IP preservation: ALB, EC2, **NLB with security groups (Aug 2023)**; not EIP — https://docs.aws.amazon.com/global-accelerator/latest/dg/preserve-client-ip-address.html
- Custom routing accelerators: VPC subnets, EC2 only, deny by default — https://docs.aws.amazon.com/global-accelerator/latest/dg/work-with-custom-routing-accelerators.html
- Pricing: hourly per accelerator + DT-Premium — https://aws.amazon.com/global-accelerator/pricing/

**Route 53**
- CNAME not at apex; alias targets list; alias TTL from target — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html · free alias queries to AWS targets; hosted zone $0.50/month (first 25); Traffic Flow $50/policy record — https://aws.amazon.com/route53/pricing/
- Weighted 0–255 — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-weighted.html · geolocation continent/country/US state + Default — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-geo.html · unhealthy geolocation record → larger region, then Default — https://repost.aws/knowledge-center/route-53-active-passive-failover
- Geoproximity: **biased distance = distance × (1 − bias/100)**, bias −99…+99 — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-geoproximity.html · geoproximity records outside Traffic Flow (Jan 2024) — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/History.html
- Multivalue: up to 8 healthy; all unhealthy → up to 8 unhealthy — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-multivalue.html · IP-based (CIDR collections, default “*”, public zones) — https://repost.aws/knowledge-center/route53-ip-based-routing
- Failover: both unhealthy → primary returned — https://repost.aws/knowledge-center/route-53-fix-failover-policy-errors
- Health checks: >18% healthy rule, checkers in several Regions — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html · https://aws.amazon.com/blogs/networking-and-content-delivery/creating-disaster-recovery-mechanisms-using-amazon-route-53/ · interval 30 s / 10 s, threshold 1–10 (default 3); failover ≈ TTL + interval × threshold — https://aws.amazon.com/blogs/aws/route-53-health-check-improvements-faster-interval-and-configurable-failover/ · CloudWatch-alarm checks for private resources — https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-route53-healthcheck.html · string match first 5,120 bytes — https://repost.aws/knowledge-center/route-53-fix-unhealthy-health-checks
- Private hosted zones need enableDnsHostnames + enableDnsSupport — https://repost.aws/knowledge-center/vpc-enable-private-hosted-zone · DNSSEC KMS key in us-east-1 — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-dnssec-cmk-requirements.html
- **VPC Resolver rename + Global Resolver** (preview Nov 2025, **GA Mar 2026**) — https://aws.amazon.com/about-aws/whats-new/2026/03/amazon-route-53-global-resolver/ · https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/gr-what-is-global-resolver.html
- **Profiles (Apr 2024)** — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/profiles.html · **Accelerated Recovery (Nov 2025)** — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/accelerated-recovery.html
- **Amazon ARC** (renamed; readiness checks closed to new customers; Region switch 2025) — https://docs.aws.amazon.com/r53recovery/latest/dg/arc-readiness-availability-change.html · https://aws.amazon.com/about-aws/whats-new/2025/08/amazon-application-recovery/

**S3 and ELB**
- Website endpoint formats, **no HTTPS**, public content, GET/HEAD; Amplify Hosting recommended for HTTPS, CloudFront alternative — https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html · **bucket name must match the domain**, alias to website endpoint — https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/getting-started-s3.html · https://docs.aws.amazon.com/whitepapers/latest/build-static-websites-aws/use-amazon-s3-website-hosting-to-host-without-a-single-web-server.html
- Transfer Acceleration still available; edge locations; no dots in bucket name; `s3-accelerate` endpoint — https://docs.aws.amazon.com/AmazonS3/latest/userguide/transfer-acceleration.html · charged only when faster — https://aws.amazon.com/s3/faqs/
- ALB condition types (host-header, path-pattern, http-header, method, query-string, source-ip) — https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-condition-types.html · no static IP on ALB (NLB in front, GA, IPAM) — https://repost.aws/knowledge-center/alb-static-ip

### Changed since the exam guide (shown as callouts)

| Old (banks / older courses) | Now | Source |
|---|---|---|
| Protect a public ALB origin with prefix list + secret header | Still valid; **VPC origins** (Nov 2024) reach a private ALB/NLB/EC2 | whats-new 2024/11 vpc-origins |
| OAI restricts S3 to CloudFront | **OAI legacy**, OAC recommended (SSE-KMS, all Regions, all methods) | private-content-restricting-access-to-s3.html |
| Origin failover on 400/403/404/416/500/502/503/504 | **429** added | high_availability_origin_failover.html |
| Lambda@Edge viewer triggers 5 s / 1 MB | **30 s / 50 MB for all triggers** (no launch post found; banks may keep old figures) | cloudfront-limits.html |
| HTTPS for an S3 site → CloudFront | S3 guide recommends **Amplify Hosting** first, CloudFront alternative | WebsiteEndpoints.html |
| GA: 2 static IPs; NLB loses client IP | **4 with dual-stack**; **NLB with security groups** keeps client IP | GA WhatsNew.html |
| Geoproximity needs Traffic Flow | plain geoproximity records since **Jan 2024** | Route 53 History.html |
| Route 53 Resolver | **Route 53 VPC Resolver**; new **Global Resolver** (GA Mar 2026) | whats-new 2026/03 |
| Route 53 ARC | **Amazon ARC**; readiness checks closed to new customers; **Region switch** | arc-readiness-availability-change.html |
| CloudFront pay-as-you-go only | **Flat-rate plans** (Nov 2025) alongside | whats-new 2025/11 flat-rate |
| — | New: CloudFront gRPC and anycast static IPs (Nov 2024), Route 53 Profiles (Apr 2024), Accelerated Recovery (Nov 2025) | see above |

## Stub for this session (replaces Session 3’s slots)

| Slot | Values | Why this slot |
|---|---|---|
| WHAT | static content · dynamic HTTP · non-HTTP TCP/UDP · DNS name · uploads to S3 | What travels picks the family: cache (CloudFront), backbone lane (GA), signpost (Route 53), upload path (TA). It kills CloudFront for UDP, GA for cacheable files, TA for downloads (Q4). |
| SCOPE | one Region · multi-Region active-passive · multi-Region active-active · global users | Stops multi-Region machinery in one-Region questions (Q43 → ALB) and separates failover from latency routing. |
| NEED | cache · faster transfer · static IP · DNS steering · failover · restrict access · edge logic · path routing | The job the option must do. GA has no cache; Route 53 has no paths; OAC ≠ signed cookies. This is the slot that makes the prestige test concrete: GA must match *static IP*, *failover* or non-HTTP WHAT. |
| SUPERLATIVE | cheapest · least ops · lowest latency · fastest failover · most secure · none stated | Adds “fastest failover” (GA vs Route 53 TTL) and “lowest latency” to the usual set; “cheapest” kills GA where DNS suffices. |

## Learn: 12 chapters (full text in `learn.js`; ▶ = interactive)

1. **How to read an edge and global question** — record (Q4, Q53, Q43, GA twice), what-travels table, stub, built-for hooks. ▶ stub trainer on Q4 · ▶ checkpoint.
2. **The AWS edge: who sits in the path?** — POPs, RECs, backbone; CF vs GA vs R53 table; boundary callout. ▶ **“Which one answers this?” sorter** (9 items, 3 buckets) · ▶ checkpoint.
3. **CloudFront: distributions, origins, behaviours** — request path, origins incl. VPC origins, behaviours, policies. ▶ pair ALB rules · CF behaviours · ▶ Q43 · ▶ checkpoint.
4. **Caching** — TTLs, cache key, invalidation vs versioned names, Origin Shield, price classes, flat-rate callout. ▶ **cache simulator** (TTL, edge locations, REC on/off, wait/invalidate/version; stats; hand-built TTL-effect bar chart and origin-fetch timeline with tooltips) · ▶ G6 · ▶ checkpoint.
5. **Securing CloudFront** — OAC vs OAI, custom origins, signed URL/cookie, geo restriction, WAF, FLE, Shield, HTTPS/ACM us-east-1. ▶ pair OAC · signed URL · cookie · ▶ G19, G20, G25.
6. **Edge code** — four events, CF Functions vs L@E table, quota callout. ▶ **edge-compute chooser** (generic `chooser`) · ▶ pair · ▶ G22, G23.
7. **S3 at the edge** — website hosting, Q53 stepper “Host example.com on S3 with Route 53”, Transfer Acceleration. ▶ stepper · ▶ pair CF · TA · ▶ Q53, Q4, G24.
8. **Global Accelerator** — how it works, custom routing, when right / when a distractor. ▶ pair CF · GA · ▶ G7, G3, G9.
9. **Route 53 basics** — hosted zones, records, alias, TTL, health checks, Resolver/Profiles/Global Resolver callout. ▶ pair alias · CNAME · ▶ G10, G16, G17.
10. **Routing policies** — table of 8. ▶ **routing-policy simulator** (8 policies, health toggles, weights, Default, bias; world map + table with tooltips) · ▶ pair latency · geo · geoproximity · ▶ G13, G14, G15, G11.
11. **Multi-Region and failover** — three mechanisms table. ▶ **failover race** (TTL, interval × threshold, client DNS caching, CF attempts × timeout; hand-built log-scale SVG chart, ink bars, swatch + label, tooltips) · ▶ pair · ▶ stepper “Active-passive with Route 53 failover” · ▶ G12, G8, G18.
12. **Triggers, traps, cheat, record** — ▶ edge map, trigger table, cheat block, log.

## Map
`core.js` `map.items`, viewBox 1000×820: internet band with users in Europe, the Americas and Asia-Pacific; AWS edge band (edge location, regional edge cache, WAF/geo restriction, Transfer Acceleration entry, CF Functions, Lambda@Edge, GA anycast IPs); AWS Regions band with a global DNS box and Regions A (ALB with /api/* and /img/* target groups, S3 origin with OAC, NLB, website bucket “example.com”) and B (S3 replica for origin failover, ALB endpoint). Region labels sit at the bottom of their boxes, all box labels have a surface halo, no `el:'line'` used for plain SVG.

## Traps (16)
TA for downloads (Q4) · website bucket not named after the domain (Q53) · Route 53/NLB for path routing (Q43) · GA for cacheable content · GA in front of S3 · GA for HTTPS/WAF · GA where latency routing is enough · ACM cert outside us-east-1 · CNAME at apex · DNS failover faster than TTL · public health check on a private resource · OAI with SSE-KMS · signed URLs for a members’ area · invalidating every deploy · latency routing for a legal rule · Lambda@Edge for a header rewrite.

## Compare pairs (8)
CloudFront · GA · CloudFront · S3 TA · OAC · signed URL · signed cookie · CF Functions · Lambda@Edge · latency · geolocation · geoproximity · alias · CNAME · Route 53 failover · GA · CF origin group · ALB rules · CF behaviours. Each has a quick check.

## Trigger cards (40)
c01–c12 CloudFront (**c01 mine, Exam Q4**) · c13–c20 protect · c21–c22 edge code · c23–c25 S3 website/TA (**c23 mine, Exam Q53**) · c26–c32 GA · c33–c39 Route 53 · c40 ALB (**mine, Exam Q43**).

## Drills (30)
Stub values as above; every option has a why; `words` verbatim in `q`; two select-TWO (G17, G25); correct letters A 6 · B 7 · C 7 · D 8 · AC 2.

| ID | Line | Scenario → answer | GA role |
|---|---|---|---|
| **Q4** (mine, C) | cf | installers downloaded worldwide, cheapest → CloudFront + OAC | distractor (S3 endpoint) |
| **Q53** (mine, F) | s3web | example.com on S3 website → bucket example.com + public read + alias to website endpoint | distractor |
| **Q43** (mine, K) | alb | /orders, /users, admin host → ALB rules | distractor |
| G1 | cf | news site, cache + API → CloudFront | **tempting, wrong** |
| G5 | cf | VOD to millions → CloudFront + Origin Shield | **tempting, wrong** |
| G6 | cf | 20 deploys/day → versioned names | — |
| G18 | cf | S3 replica, no DNS change → origin group | distractor |
| G21 | cf | cert not listed → ACM us-east-1 | — |
| G4 | protect | block 3 countries → geo restriction | **tempting, wrong** |
| G19 | protect | SSE-KMS bucket, new Region → OAC | — |
| G20 | protect | members’ area, URLs unchanged → signed cookies | — |
| G25 | protect | (TWO) ALB only via CloudFront → prefix list + secret header | distractor |
| G22 | edge | headers/redirects at scale → CloudFront Functions | — |
| G23 | edge | entitlement API, pick origin, misses only → L@E origin request | — |
| G2 | s3web | HTTPS + private bucket → CloudFront + ACM + OAC | **tempting, wrong** |
| G24 | s3web | uploads from 3 continents → Transfer Acceleration | **tempting, wrong** |
| G7 | ga | UDP game, 2 fixed IPs, fast failover → **GA** | right |
| G8 | ga | MQTT devices cache DNS 24 h → **GA** | right |
| G9 | ga | allowlist IPs for ALBs in 2 Regions → **GA** | right |
| G26 | ga | specific instance + port → **custom routing accelerator** | right |
| G3 | r53 | nearest Region, no static IPs, cheapest → latency records | **tempting, wrong** |
| G10 | r53 | apex → alias to ALB | — |
| G11 | r53 | 10% canary → weighted | distractor |
| G12 | multi | active-passive, minutes OK, cheapest → failover records | distractor |
| G13 | r53 | EU law → geolocation + Default | — |
| G14 | r53 | grow a Region’s area → geoproximity bias | — |
| G15 | r53 | several healthy IPs → multivalue | — |
| G16 | r53 | private IP health → CloudWatch-alarm check | — |
| G17 | r53 | (TWO) internal names → PHZ + DNS hostnames/support | distractor |
| G27 | r53 | ISP ranges → IP-based routing | — |

## Checks (CONTEXT §9 step 4)
`tools/check/widgets-04-global.js` interacts with every Session 4 widget (stub trainer, which-one sorter, cache simulator incl. modes and chart tooltip, edge chooser, two steppers, routing simulator incl. health, Default, bias, simple and map tooltip, failover race incl. device clients and GA tooltip, eight pair quick checks, edge map, trigger table, progress charts). `node check.js 04-global` → ALL PASS; 01-storage, 02-migration, 03-networking re-run → ALL PASS. Screenshots: `node shots-04.js` → `design/compare/s4-*.png`.

Engine/CSS: no engine change. CSS: the two token pairs above, and `overflow-wrap:break-word` on inline `code` (long endpoint names overflowed at 390 px; wraps only when needed, Sessions 1–3 unaffected).

## Done when
12 chapters with all ▶ elements, 8 pairs, 40 cards, 30 drills, 16 traps, cheat sheet, progress, manifest entry; the lead merges “Facts verified” and “Changed since the exam guide” into CONTEXT §6.
