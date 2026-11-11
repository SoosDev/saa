/* Feed bites — Session 4, global architecture & edge. Facts: sessions/04-global/learn.js chapters in src,
   docs/session-04-global.md (verified 2026-09-24). Ledger: docs/feed-bites.md. */
window.SAA_BITES = (window.SAA_BITES || []).concat([
  {
    id: 'edge-cf-vs-ga', sid: '04-global', title: 'CloudFront vs Global Accelerator', domains: ['D3', 'D2'], src: ['ch2', 'ch3', 'ch8'],
    text: 'Both put users on the AWS backbone at the nearest edge, but they do different jobs on that road. **CloudFront** is a depot at every on-ramp: it keeps copies of web content and speaks only HTTP, HTTPS, WebSocket and gRPC. **Global Accelerator** is a private lane with two fixed entrances: it carries any TCP or UDP traffic, keeps no copies, and switches Regions in under a minute without waiting for DNS. Web content picks CloudFront; UDP, fixed IPs or DNS-free failover pick Global Accelerator.',
    qs: [
      { id: 'q1', q: 'A recipe website serves the same photos and pages to readers on every continent from an Application Load Balancer in eu-west-1. The owner wants copies of those files kept close to readers, with the LEAST load on the ALB. Which design fits?', words: ['same photos and pages', 'copies of those files kept close'],
        expl: 'Many readers asking for the same bytes is the cache’s job, and CloudFront is the cache. Global Accelerator speeds the trip but keeps no copies, and Route 53 never touches the traffic.',
        opts: [
          { t: 'A Global Accelerator accelerator with the ALB as its endpoint, close to every reader', why: 'GA carries traffic over the backbone but caches nothing; every request still reaches the ALB.' },
          { t: 'A CloudFront distribution with the ALB as its origin, caching the photos at the edge', ok: true, why: 'A cached, fresh object is answered at the edge location, so repeat requests skip the ALB.' },
          { t: 'Route 53 latency records that point each reader to the ALB with the lowest latency', why: 'There is only one Region to choose, and DNS keeps no copies of the files.' },
          { t: 'A custom routing accelerator that maps each reader to one EC2 instance behind the ALB', why: 'Custom routing pins users to a specific instance and port; it still caches nothing.' }] },
      { id: 'q2', q: 'A banking API on an ALB in us-east-1 returns personalised JSON for every call, so nothing can be cached. Customers worldwide call it over HTTPS on api.example.com, and AWS WAF rules must run at the edge. Which design meets these requirements?', words: ['nothing can be cached', 'AWS WAF rules must run at the edge'],
        expl: '“Dynamic” alone does not earn Global Accelerator: CloudFront also speeds up dynamic HTTP over the AWS network, and it is where the WAF web ACL and the HTTPS certificate for your domain attach. GA is layer 4 pass-through.',
        opts: [
          { t: 'Global Accelerator in front of the ALB, with the WAF web ACL attached to the accelerator', why: 'GA is layer 4 pass-through: it takes no WAF web ACL and no certificate for your domain.' },
          { t: 'Route 53 latency alias records for the ALB, so each customer reaches the fastest Region', why: 'With one Region, latency has nothing to choose, and DNS never touches the traffic to filter it.' },
          { t: 'CloudFront in front of the ALB with caching off, plus geo restriction in place of WAF rules', why: 'Geo restriction only allows or blocks countries; the requirement is WAF rules at the edge.' },
          { t: 'CloudFront in front of the ALB with caching off, a WAF web ACL and the HTTPS certificate', ok: true, why: 'CloudFront speeds up dynamic HTTP over the AWS network and holds the web ACL and certificate.' }] },
      { id: 'q3', q: 'A company serves large, popular video files from an S3 bucket to viewers worldwide. A colleague proposes AWS Global Accelerator in front of the bucket to speed up playback. What is the flaw in that proposal?', words: ['in front of the bucket', 'popular video files'],
        expl: 'GA endpoints are ALBs, NLBs, EC2 instances and Elastic IPs, never S3, and GA caches nothing. Popular files fetched by many viewers are CloudFront’s case. GA does carry any TCP traffic, and it fails over without waiting for DNS.',
        opts: [
          { t: 'Global Accelerator carries only UDP traffic, so it cannot deliver the video over HTTPS', why: 'A listener accepts TCP or UDP, so HTTPS traffic passes through it.' },
          { t: 'Global Accelerator needs a separate accelerator in every Region where the viewers live', why: 'One accelerator’s static anycast IPs are announced by every edge location.' },
          { t: 'S3 is not a Global Accelerator endpoint, and the accelerator keeps no copies of files', ok: true, why: 'Endpoints are ALB, NLB, EC2 instance and Elastic IP only, and nothing is cached.' },
          { t: 'Global Accelerator moves traffic between Regions only after a DNS change propagates', why: 'The IPs never change, so DNS caching does not delay its failover.' }] },
      { id: 'q4', q: 'A company runs a web shop that shows the same product images to every visitor, and a separate voice-chat service that uses UDP. Images must be served from cache near visitors, and voice traffic must enter the AWS network at the nearest edge. Which pairing meets both requirements?', words: ['served from cache', 'uses UDP', 'enter the AWS network at the nearest edge'],
        expl: 'The deciding difference applies twice: cacheable web content goes to CloudFront, UDP goes to Global Accelerator. Neither does the other’s job, and Route 53 steers clients without carrying their traffic.',
        opts: [
          { t: 'Global Accelerator for both, with one listener for HTTPS and another for the UDP voice', why: 'GA would carry both, but it caches nothing, so the images never come from cache.' },
          { t: 'CloudFront for the web shop’s images, and Global Accelerator for the UDP voice chat', ok: true, why: 'Each service gets the traffic it was built for: the cache for images, the lane for UDP.' },
          { t: 'CloudFront for both, with one cache behaviour for the shop and another for voice chat', why: 'CloudFront speaks HTTP, HTTPS, WebSocket and gRPC, not UDP voice traffic.' },
          { t: 'CloudFront for the web shop’s images, and Route 53 latency records for the voice chat', why: 'Route 53 answers DNS beside the path and never touches the voice traffic itself.' }] }
    ]
  },
  {
    id: 'edge-r53-routing', sid: '04-global', title: 'Route 53 routing policies', domains: ['D2', 'D3'], src: ['ch10'],
    text: 'Route 53 is a signpost at a crossroads, and each routing policy is a different rule for which way it points a user. **Weighted** splits users by share, **latency** points to the fastest Region, **failover** points to the standby only when the primary is unhealthy, **geolocation** reads where the user is (a Default catches the rest), **geoproximity** measures distance stretched by a bias, and **multivalue** shows several healthy roads at once. The reason in the question picks the policy.',
    qs: [
      { id: 'q1', q: 'An online shop runs in us-east-1. If its ALB fails its health check, every user must be sent to a standby ALB in us-west-2 that shows a maintenance page, and otherwise nobody should reach it. Which Route 53 setup meets this?', words: ['fails its health check', 'otherwise nobody should reach it'],
        expl: 'Primary while healthy, else secondary: that is failover routing, with the health check required on the primary, and the shop must be the primary. Weighted and latency send some users to the maintenance page while the shop is healthy.',
        opts: [
          { t: 'Weighted alias records with weights of 255 and 1, and a health check on both ALBs', why: 'A weight of 1 out of 0–255 still sends a small share to the maintenance page.' },
          { t: 'Latency alias records for both ALBs, with evaluate target health turned on for each', why: 'Users who measure us-west-2 as faster get the maintenance page while the shop is up.' },
          { t: 'Failover alias records: the us-west-2 ALB as primary, the us-east-1 ALB as secondary', why: 'Reversed: the maintenance page answers while it is healthy, and the shop only when that fails.' },
          { t: 'Failover alias records: the us-east-1 ALB as primary, the us-west-2 ALB as secondary', ok: true, why: 'The secondary answers only when the primary’s health check fails.' }] },
      { id: 'q2', q: 'An app runs behind ALBs in three Regions. Geolocation records send each continent to one Region, but monitoring shows many users would get faster answers from a Region on another continent. No rule ties users to a place, and the goal is the LOWEST latency. What should change?', words: ['No rule ties users to a place', 'LOWEST latency'],
        expl: 'Geolocation reads where the user is, which is the tool for law, residency or licensing. With no such rule and a latency goal, latency routing picks the Region each user measures fastest.',
        opts: [
          { t: 'Keep geolocation, and add a Default record that points to the busiest Region’s ALB', why: 'A Default only catches unmatched locations; matched users still go by continent.' },
          { t: 'Replace the geolocation records with latency alias records for the three ALBs', ok: true, why: 'Latency routing answers with the Region of lowest measured latency for each user.' },
          { t: 'Replace the geolocation records with geoproximity records, each with a bias of 0', why: 'Geoproximity follows distance to your resources, not the measured network latency.' },
          { t: 'Replace the geolocation records with weighted records split evenly by Region', why: 'Weights split users by share, whatever each Region’s latency is for them.' }] },
      { id: 'q3', q: 'An app runs in eu-west-1 and ap-southeast-1, each Region with a main ALB and a standby ALB. Users must reach the Region with the lowest latency, and if a main ALB fails, its users must move to the standby in the same Region. Which design meets both needs?', words: ['lowest latency', 'standby in the same Region'],
        expl: 'Two behaviours need two policies nested with alias records: a latency record per Region whose target is a failover pair inside that Region. A single policy delivers only one of the two behaviours.',
        opts: [
          { t: 'Latency alias records for the two main ALBs, with evaluate target health turned on', why: 'A failed main drops its Region out, so users move to the other Region, not to the standby.' },
          { t: 'Geolocation alias records per continent, each targeting a failover pair of ALBs', why: 'The nesting is right, but location is not latency; the top policy must be latency.' },
          { t: 'Latency alias records per Region, each targeting a failover pair of main and standby', ok: true, why: 'Latency picks the Region; the nested failover pair picks main or standby inside it.' },
          { t: 'Failover alias records for main and standby in each Region, under one simple record', why: 'Simple routing returns its values in random order, so nothing picks the faster Region.' }] },
      { id: 'q4', q: 'Weighted alias records split traffic across three ALBs in one Region, with a weight of 100 each. One ALB stays healthy but must get no new DNS answers during a week of maintenance, with the LEAST change to the setup. What should the team do?', words: ['stays healthy', 'LEAST change'],
        expl: 'Weights run 0–255, and a weight of 0 stops traffic to that record. Any weight above 0, however small next to the others, still earns that ALB a share, and failover is a redesign.',
        opts: [
          { t: 'Set that ALB’s record weight to 0, and leave the other two records unchanged', ok: true, why: 'A weight of 0 stops traffic to that record; nothing else has to move.' },
          { t: 'Raise the other two records to a weight of 255 each, and leave the third at 100', why: 'Traffic still splits in proportion to weight, so the third keeps a share.' },
          { t: 'Set that ALB’s record weight to 1, and leave the other two records unchanged', why: 'A weight of 1 still sends it a small share; only a weight of 0 stops traffic to it.' },
          { t: 'Switch all three to failover records, with one primary and two secondary ALBs', why: 'Failover answers with one primary while healthy; it is a redesign, not the least change.' }] }
    ]
  },
  {
    id: 'edge-private-content', sid: '04-global', title: 'Private content: OAC, signed URLs and cookies', domains: ['D1'], src: ['ch5'],
    text: 'A private gallery behind CloudFront has two locks, and each answers a different question. The back door is **origin access control**: CloudFront signs its requests, and the S3 bucket lets in only your distribution, so nobody walks around CloudFront. The front door decides which viewers get in: a **signed URL** is a ticket for one file, and **signed cookies** are a wristband for many files whose URLs never change.',
    qs: [
      { id: 'q1', q: 'A software vendor emails each customer a link to one licensed installer delivered through CloudFront. The link must stop working after two days. Which control fits this need?', words: ['a link to one licensed installer', 'stop working after two days'],
        expl: 'One file behind a download link is the signed URL’s case, and its policy carries the expiry. Origin access control and geo restriction answer other questions: who reaches the origin, and which countries may view.',
        opts: [
          { t: 'CloudFront signed cookies on the installer path, expiring two days after sending', why: 'Cookies suit many files under unchanged URLs; a download link to one file is a signed URL.' },
          { t: 'Origin access control on the bucket, so the installer is reachable only via CloudFront', why: 'It stops bypassing CloudFront, but anyone holding the CloudFront link still gets the file.' },
          { t: 'A CloudFront signed URL for the installer, with an expiry two days after it is sent', ok: true, why: 'One file, a download link and an expiry in the policy: what signed URLs are for.' },
          { t: 'Geographic restriction on the distribution, allowing only the customers’ countries', why: 'Country-level blocking lets every viewer in an allowed country download it.' }] },
      { id: 'q2', q: 'A distribution already requires signed URLs for a library of training PDFs. An audit finds the same PDFs can be downloaded straight from the S3 bucket’s own URL, skipping the signatures. Which change closes this gap?', words: ['straight from the S3 bucket’s own URL'],
        expl: 'Two locks, two questions. Signed URLs already guard the front door; the audit found the back door open. Origin access control, with a bucket policy that allows only this distribution, closes the bucket to everyone else.',
        opts: [
          { t: 'Signed cookies instead of signed URLs, issued for the whole PDF library at sign-in', why: 'Cookies also guard only CloudFront’s front door; the bucket URL stays open.' },
          { t: 'Shorter expiry times on the signed URLs, so that each shared link dies within hours', why: 'Expiry limits CloudFront links, not requests made straight to the bucket.' },
          { t: 'An AWS WAF web ACL on the distribution that blocks bots and unknown IP ranges', why: 'A web ACL on the distribution sees only requests that pass through CloudFront.' },
          { t: 'Origin access control, with a bucket policy allowing only this distribution’s requests', ok: true, why: 'CloudFront signs its requests with SigV4, and the bucket accepts only your distribution.' }] },
      { id: 'q3', q: 'A team must start signing CloudFront URLs. Company policy forbids using the root user for routine tasks, and the team wants the method CloudFront recommends today. How should the signing keys be set up?', words: ['forbids using the root user', 'recommends today'],
        expl: 'Signing uses trusted key groups: you upload public keys to CloudFront and sign with the private key. Key pairs created by the root user are legacy. Origin access control and ACM certificates secure other legs of the trip.',
        opts: [
          { t: 'Upload a public key to a trusted key group, and sign the URLs with its private key', ok: true, why: 'Trusted key groups are the current way: CloudFront holds the public key you upload.' },
          { t: 'Have the root user create a CloudFront key pair, and sign the URLs with that key', why: 'Root-user key pairs are the legacy way, and the policy forbids the root user.' },
          { t: 'Use the distribution’s ACM certificate from us-east-1 to sign each viewer URL', why: 'ACM in us-east-1 gives HTTPS on your domain; URL signing uses a trusted key group.' },
          { t: 'Use origin access control’s SigV4 signing to sign each URL handed to viewers', why: 'OAC signs CloudFront’s own requests to the bucket, not the URLs viewers use.' }] }
    ]
  },
  {
    id: 'edge-functions', sid: '04-global', title: 'CloudFront Functions vs Lambda@Edge', domains: ['D3', 'D4'], src: ['ch6'],
    text: 'CloudFront gives your code two desks. **CloudFront Functions** is the clipboard at the door: tiny JavaScript at every edge location, run only on viewer requests and responses, in under a millisecond, for headers, redirects and URL rewrites, and the cheapest choice. **Lambda@Edge** is the back office at the regional edge caches: Node.js or Python on all four events, including the origin events that run only on cache misses, with network calls and access to the request body.',
    qs: [
      { id: 'q1', q: 'A site’s cache hit ratio is low because the same page is requested with mixed-case query strings. A small script must normalise them on every request before the cache lookup, with no network calls, at the LOWEST cost. Which option fits?', words: ['before the cache lookup', 'no network calls', 'LOWEST cost'],
        expl: 'Small logic on every request, no network, cheapest: CloudFront Functions on viewer request, which runs before the cache. Origin events run only after a miss, so they cannot change which cached copy is found.',
        opts: [
          { t: 'Lambda@Edge on the viewer request event, normalising the query strings there', why: 'It works, but Lambda@Edge costs more per request for logic this small.' },
          { t: 'Lambda@Edge on the origin request event, normalising the query strings there', why: 'Origin request runs only after a cache miss, too late to change the lookup.' },
          { t: 'CloudFront Functions on the origin request event, normalising the query strings', why: 'CloudFront Functions run on viewer events only; there is no origin trigger.' },
          { t: 'CloudFront Functions on the viewer request event, normalising the query strings', ok: true, why: 'Viewer request runs before the cache; tiny, sub-millisecond logic is its job.' }] },
      { id: 'q2', q: 'When the origin of a news site answers with a 503 error, viewers must instead get a page with status 200, built at the edge, that names the path they asked for. The origin’s own error body is not needed, and the code must run only when CloudFront has gone to the origin. Which option meets these requirements?', words: ['answers with a 503 error', 'only when CloudFront has gone to the origin'],
        expl: 'An origin-response function never sees the body the origin sent: it can only replace that body with one it generates, or remove it. That is all this page needs, and origin response is the event that runs only after a trip to the origin, once it has answered. Viewer response functions are not invoked at all when the origin returns a status of 400 or higher, and origin request runs before there is an answer.',
        opts: [
          { t: 'Lambda@Edge on the viewer response event, replacing the error with a generated page', why: 'Viewer response functions are not invoked when the origin returns a status of 400 or higher.' },
          { t: 'Lambda@Edge on the origin response event, replacing the error with a generated page', ok: true, why: 'Origin response runs after the origin answers, on misses only, and can set a new status and body.' },
          { t: 'Lambda@Edge on the origin request event, replacing the error with a generated page', why: 'Origin request runs before the origin has answered, so there is no error to replace yet.' },
          { t: 'CloudFront Functions on the viewer response event, writing the generated page body', why: 'No viewer response function is invoked on an origin status of 400 or higher, in either runtime.' }] },
      { id: 'q3', q: 'A team plans a Lambda@Edge origin request function that looks up each user in an Amazon RDS database in a private subnet of its VPC. Which statement explains why this plan fails?', words: ['private subnet of its VPC'],
        expl: 'Lambda@Edge has network access but no VPC access. Logic that needs your database or a VPC belongs in the application behind the ALB, or in Lambda in the Region.',
        opts: [
          { t: 'Lambda@Edge functions have no network access, so they cannot call anything at all', why: 'Lambda@Edge does have network access; it is CloudFront Functions that lack it.' },
          { t: 'Lambda@Edge functions have no VPC access, so they cannot reach the private subnet', ok: true, why: 'No VPC access is a Lambda@Edge restriction; keep database logic at the origin.' },
          { t: 'Lambda@Edge functions run only on viewer events, so they never see a cache miss', why: 'Lambda@Edge runs on all four events, origin request and response included.' },
          { t: 'Lambda@Edge functions must be created in the database’s Region to reach its VPC', why: 'Lambda@Edge is created in us-east-1, and it has no VPC access in any Region.' }] },
      { id: 'q4', q: 'A developer creates a Lambda@Edge function in eu-west-1, next to the origin, and tries to attach it to a distribution without publishing a version. CloudFront refuses. What must change so the function can be attached?', words: ['in eu-west-1', 'without publishing a version'],
        expl: 'Two rules, both broken here: Lambda@Edge functions are created in us-east-1, and CloudFront attaches a numbered version. Fixing only one still fails, and CloudFront Functions have no origin events.',
        opts: [
          { t: 'Create the function in us-east-1, publish a numbered version, and attach that one', ok: true, why: 'Lambda@Edge is created in us-east-1 and attached as a numbered version.' },
          { t: 'Create the function in us-east-1, and attach it to the distribution with no version', why: 'The Region is fixed, but CloudFront still needs a numbered version to attach.' },
          { t: 'Keep the function in eu-west-1, publish a numbered version, and attach that version', why: 'The version is fixed, but Lambda@Edge functions must be created in us-east-1.' },
          { t: 'Rewrite it as a CloudFront Function in eu-west-1, and attach it on origin request', why: 'CloudFront Functions are created in CloudFront and run on viewer events only.' }] }
    ]
  }
]);
