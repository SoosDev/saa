/* Session 4 trigger cards (Global architecture & edge). f = what the exam says, b = the answer. line = transit line id or topic. */
(function () {
  'use strict';
  const S = window.SESSION = window.SESSION || {};
  const _c = (id, line, f, b, why, tempt, extra) => Object.assign({ id, line, f, b, why, tempt }, extra || {});
  S.cards = [
    /* CloudFront */
    _c('c01', 'cf', 'Users worldwide download the same files from one S3 bucket; downloads are slow', 'CloudFront with the bucket as origin', 'Cache the objects at edge locations near the users; repeat downloads never reach S3.', 'S3 Transfer Acceleration — speeds each transfer, caches nothing.', { mine: true, src: 'Exam Q4' }),
    _c('c02', 'cf', 'Path of a CloudFront cache miss', 'Edge location → regional edge cache → origin', 'Regional edge caches are bigger and keep less-popular objects longer. Dynamic and PUT/POST requests skip them.', 'Edge location straight to the origin every time.'),
    _c('c03', 'cf', 'Origins CloudFront can use', 'S3 bucket, S3 website endpoint, ALB, EC2, any HTTP server, MediaPackage, Lambda URL, VPC origins', 'VPC origins (Nov 2024) reach a private ALB, NLB or EC2 with no public exposure.', 'Only S3.', { update: 'VPC origins (GA Nov 2024) are newer than most course material.' }),
    _c('c04', 'cf', 'Route /api/* to the ALB and everything else to S3 on one CloudFront domain', 'Cache behaviours with path patterns', 'Each behaviour picks an origin and its cache settings; first match in list order, default `*` last.', 'Two distributions behind Route 53 weighted records.'),
    _c('c05', 'cf', 'Default TTL when the origin sends no Cache-Control or Expires', '86,400 s (24 hours)', 'Minimum and maximum TTL clamp whatever the origin sends; default maximum is 1 year.', '0 — nothing cached by default.'),
    _c('c06', 'cf', 'New JavaScript must reach users right after frequent deploys', 'Versioned file names (app.v42.js)', 'A new name is a new cache key; nothing to invalidate, hit ratio stays high.', 'Invalidate /* after every deploy.'),
    _c('c07', 'cf', 'Invalidation cost', 'First 1,000 paths per month free, then per path; a wildcard counts as one path', 'Up to 3,000 object paths and 15 wildcard paths can be in progress per distribution.', '“Invalidations are always free.”'),
    _c('c08', 'cf', 'Serve from an S3 replica automatically when the primary bucket returns 5xx', 'CloudFront origin group (origin failover)', 'Two origins; you choose the codes (400, 403, 404, 416, 429, 500, 502, 503, 504). GET, HEAD, OPTIONS only.', 'Route 53 failover between two distributions.', { update: 'The failover code list now includes 429.' }),
    _c('c09', 'cf', 'CloudFront does not list the ACM certificate you created', 'Request or import it in us-east-1', 'CloudFront reads ACM certificates from N. Virginia only; the origin ALB keeps its regional one.', 'Dedicated IP custom SSL.'),
    _c('c10', 'cf', 'SNI vs dedicated IP custom SSL on CloudFront', 'SNI: no extra charge · dedicated IP: $600 a month', 'Dedicated IPs are only for very old clients without SNI.', 'Dedicated IP “for security”.'),
    _c('c11', 'cf', 'Serve only from the cheapest edge locations (US, Canada, Mexico, Europe, Israel, Türkiye)', 'Price Class 100', 'Price Class 200 adds most of Asia, Africa and the Middle East; All adds South America, Australia and New Zealand.', 'Geo restriction.'),
    _c('c12', 'cf', 'Extra caching layer in front of the origin to cut origin load further', 'Origin Shield', 'One chosen Region between the regional edge caches and the origin; collapses duplicate misses.', 'Another distribution.'),
    /* protect */
    _c('c13', 'protect', 'S3 content must be reachable only through CloudFront', 'Origin access control (OAC) + bucket policy for the distribution', 'OAC signs requests with SigV4, works in all Regions, supports SSE-KMS and PUT/POST.', 'Origin access identity (OAI) — legacy.', { update: 'AWS calls OAI legacy; OAC since 2022.' }),
    _c('c14', 'protect', 'Restrict access to ONE file, or a client that cannot use cookies', 'CloudFront signed URL', 'The policy (expiry, optional start time and IP range) and signature ride in the URL.', 'Signed cookies.'),
    _c('c15', 'protect', 'Many restricted files, URLs must not change', 'CloudFront signed cookies', 'One cookie covers everything its policy matches (subscriber area, HLS segments).', 'A signed URL per file.'),
    _c('c16', 'protect', 'What signs CloudFront URLs today', 'Trusted key groups (public keys you upload)', 'The old way used a CloudFront key pair created by the root user.', 'An IAM user’s access key.'),
    _c('c17', 'protect', 'Block viewers from specific countries', 'CloudFront geographic restriction (allowlist or blocklist)', 'Country level, returns 403; WAF geo match adds more conditions.', 'Route 53 geolocation — steers, never blocks.'),
    _c('c18', 'protect', 'Encrypt credit-card fields at the edge so only one backend service can read them', 'CloudFront field-level encryption', 'Public key at CloudFront, private key only in the service; up to 10 fields per request.', 'HTTPS only — decrypted at every hop.'),
    _c('c19', 'protect', 'Only CloudFront may reach the public ALB origin', 'CloudFront prefix list in the ALB security group + secret custom header checked by the ALB', 'Or a VPC origin: a private ALB CloudFront reaches without internet exposure.', 'OAC for the ALB — OAC is for S3 and a few other origin types.'),
    _c('c20', 'protect', 'DDoS protection that comes free with CloudFront, GA and Route 53', 'AWS Shield Standard', 'Always on, no charge; Shield Advanced adds response team and cost protection.', 'Buy Shield Advanced first.'),
    /* edge code */
    _c('c21', 'edge', 'Header, redirect or URL rewrite on every request, millions per second, lowest cost', 'CloudFront Functions', 'JavaScript at edge locations, viewer request/response only, sub-millisecond, no network or body access.', 'Lambda@Edge.'),
    _c('c22', 'edge', 'Call an external API or choose the origin at the edge, only on cache misses', 'Lambda@Edge on the origin request trigger', 'Node.js or Python, four triggers, network and body access; created in us-east-1.', 'CloudFront Functions — no network access.', { update: 'Lambda@Edge quotas now show 30 s and 50 MB for every trigger (older: 5 s / 1 MB for viewer).' }),
    /* S3 website + TA */
    _c('c23', 's3web', 'Host example.com on S3 website hosting with Route 53', 'Bucket named example.com + alias A record to the S3 website endpoint', 'The website endpoint answers only for a bucket named like the host; apex needs alias.', 'Any bucket name + CNAME at the apex.', { mine: true, src: 'Exam Q53' }),
    _c('c24', 's3web', 'HTTPS for a site on S3 static website hosting', 'CloudFront (ACM cert in us-east-1) in front — or Amplify Hosting', 'The website endpoint is HTTP only.', 'Upload a certificate to the bucket.', { update: 'The S3 guide now recommends Amplify Hosting first, CloudFront as the alternative.' }),
    _c('c25', 's3web', 'Users on other continents UPLOAD large files to one bucket', 'S3 Transfer Acceleration (bucket.s3-accelerate.amazonaws.com)', 'Enter at the nearest edge location, then the AWS network; pay only when it is faster.', 'CloudFront or Global Accelerator.'),
    /* Global Accelerator */
    _c('c26', 'ga', 'Two fixed IP addresses for an application in several Regions', 'Global Accelerator', '2 static anycast IPv4 (4 with dual-stack) announced from every edge location.', 'Elastic IPs on the ALBs — ALBs cannot take them.'),
    _c('c27', 'ga', 'UDP game or VoIP traffic, worldwide, low latency', 'Global Accelerator', 'Proxies TCP and UDP over the AWS backbone; CloudFront is HTTP only.', 'CloudFront.'),
    _c('c28', 'ga', 'Global Accelerator endpoint types', 'ALB, NLB, EC2 instance, Elastic IP', 'Internal ALBs and private instances work. S3 and CloudFront are not endpoints.', 'An S3 bucket.'),
    _c('c29', 'ga', 'Shift 20% of traffic away from one Region with GA', 'Traffic dial on that Region’s endpoint group', 'Dials are per endpoint group (Region); weights 0–255 split inside a group.', 'Route 53 weighted records.'),
    _c('c30', 'ga', 'Clients cache DNS for hours; failover to another Region must take under a minute', 'Global Accelerator', 'Same IPs, endpoint out of service in under a minute, no DNS involved.', 'Route 53 failover with a low TTL.'),
    _c('c31', 'ga', 'Pin each user to a specific EC2 instance and port', 'Custom routing accelerator', 'Maps listener ports to instance IPs and ports in VPC subnets; EC2 only.', 'Standard accelerator with weights.'),
    _c('c32', 'ga', 'The application must see the client’s real IP behind Global Accelerator', 'Client IP preservation (ALB, EC2, NLB with security groups)', 'Not for Elastic IP endpoints or NLBs without security groups.', '“GA always hides the client IP.”', { update: 'NLBs with security groups gained client IP preservation in Aug 2023.' }),
    /* Route 53 */
    _c('c33', 'r53', 'Point the zone apex (example.com) at an ALB or CloudFront', 'Alias A/AAAA record', 'Works at the apex, TTL from the target, no charge for queries to AWS targets.', 'CNAME.'),
    _c('c34', 'r53', 'Send 10% of traffic to the new version', 'Weighted routing (weights 0–255)', 'Weight 0 stops traffic to a record.', 'Failover routing.'),
    _c('c35', 'r53', 'Users must be served from their own continent or country (law, language)', 'Geolocation routing + a Default record', 'Continent, country or US state; Default catches the rest.', 'Latency routing.'),
    _c('c36', 'r53', 'Grow or shrink the area a Region serves', 'Geoproximity routing with bias (−99 … +99)', 'Biased distance = distance × (1 − bias/100).', 'Geolocation lists.', { update: 'Geoproximity records can be created outside Traffic Flow since Jan 2024.' }),
    _c('c37', 'r53', 'Return several healthy IPs so clients can retry', 'Multivalue answer (up to 8 healthy records)', 'Each record has its own health check; not a load balancer.', 'Simple routing — no health checks.'),
    _c('c38', 'r53', 'Health-check a resource that has only a private IP', 'CloudWatch-alarm-based Route 53 health check', 'Health checkers are on the internet; alarm on a metric instead.', 'HTTP health check on the private IP.'),
    _c('c39', 'r53', 'How long DNS failover takes', 'Health-check interval × failure threshold + record TTL', 'Default 30 s × 3; fast interval 10 s. Resolvers keep old answers until the TTL expires.', '“Instant.”'),
    /* ALB */
    _c('c40', 'alb', 'Route by URL path or host name to different services in one Region', 'Application Load Balancer listener rules', 'Conditions: path-pattern, host-header, http-header, method, query-string, source-ip.', 'Route 53 or an NLB.', { mine: true, src: 'Exam Q43' })
  ];
})();
