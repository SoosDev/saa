/* Session 4 — the lesson. 12 chapters. Facts: docs/session-04-global.md (verified 2026-09-24). */
(function () {
  'use strict';
  const S = window.SESSION;
  const fromDrill = (id, src) => {
    const d = S.drills.find(x => x.id === id);
    return { id: 'ck-' + id, src: src || d.src, q: d.q, opts: d.opts.map(o => ({ t: o.t, why: o.why })), a: d.opts.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0), why: d.expl };
  };

  const EDGEFN = {
    start: 'root',
    nodes: {
      root: { q: 'What must the logic do?', opts: [
        { label: 'Change headers, redirect, rewrite the URL, normalise the cache key, simple auth on a token', sub: 'no network call, no request body', next: 'where' },
        { label: 'Call another service, read or change the body, pick the origin, resize an image', next: 'le' },
        { label: 'Business logic that needs a database, long run times, or VPC access', next: 'origin' }] },
      where: { q: 'Must it run on every request, or only when CloudFront goes to the origin?', opts: [
        { label: 'Every request, before or after the cache (viewer events)', sub: 'millions of requests per second, lowest cost', next: 'cff' },
        { label: 'Only on cache misses (origin request / origin response)', next: 'le' }] }
    },
    results: {
      cff: { title: 'CloudFront Functions', line: 'edge', text: 'Lightweight JavaScript that runs at the edge locations on **viewer request** and **viewer response**. Sub-millisecond, scales to millions of requests per second, the cheapest option.', facts: ['No network, file-system or request-body access', '2 MB memory, 10 KB code', 'CloudFront KeyValueStore for small lookup tables (runtime 2.0)'], whyNot: [['Lambda@Edge', 'works, but costs more per request and adds latency for simple header work'], ['A response headers policy', 'even simpler if all you need is fixed security headers — no code at all']] },
      le: { title: 'Lambda@Edge', line: 'edge', text: 'Node.js or Python functions on **viewer request/response and origin request/response**. Network access, request body, can change the origin. Origin triggers run only on cache misses, at the regional edge caches.', facts: ['Create it in us-east-1 and attach a numbered version', 'Up to 10,000 requests per second per Region', 'No VPC access, layers or environment variables'], update: 'Quotas now show **30 s** and **50 MB** for every trigger; older material says 5 s / 1 MB for viewer triggers.', whyNot: [['CloudFront Functions', 'no network or body access, viewer events only']] },
      origin: { title: 'Keep it at the origin', line: 'alb', text: 'Edge functions are for request/response manipulation close to the viewer. Anything that needs your database, a VPC or minutes of work belongs in the application behind the ALB (or in Lambda in the Region).', whyNot: [['Lambda@Edge', 'no VPC access; seconds, not minutes']] }
    }
  };

  S.learn = [
    /* ---------------------------------------------------------------- 1 */
    { id: 'ch1', title: 'How to read an edge and global question', domains: 'D2 D3', blocks: [
      'This cluster is where a question gives you a map of the world — users on several continents, one or two Regions, a domain name — and asks what sits in between. Three services dominate: {cf|CloudFront}, {ga|Global Accelerator} and {r53|Route 53}. They are easy to confuse because all three make a global application “faster” or “more available”. They do it in completely different places.',
      { h: 'Your record on this cluster' },
      { table: { head: ['Question', 'Scenario in one line', 'What pulled you', 'Real cause'], rows: [
        ['Q4', 'users worldwide download files from S3 slowly', 'S3 Transfer Acceleration', '**C** confused TA (uploads to one bucket) with CloudFront (cache for many users)'],
        ['Q53', 'static website on S3 at example.com via Route 53', 'a wrong bucket name / record type', '**F** bucket name = domain; alias record to the website endpoint'],
        ['Q43', 'route /orders and /users to different services', 'not ALB', '**K** missed the keyword “path/host-based routing” → ALB'],
        ['2 others', 'various', 'Global Accelerator', '**C** prestige distractor: GA had no role']] } },
      { callout: 'You chose **Global Accelerator twice** where it had no job. It sounds like the most advanced option in any “global” question. This session teaches the boundary: GA is right for **non-HTTP traffic, static IPs, and failover that must not wait for DNS**. Everywhere else it is a distractor. Every drill below either tempts you with GA or makes it the real answer.', kind: 'miss', title: 'Your misses' },
      { h: 'Ask first: what travels, and who is in the path?' },
      'Strip the story until you can say **what** goes over the wire and **where** the users are. That alone picks the family:',
      { table: { head: ['What travels', 'Family of answers'], key: true, rows: [
        ['files and pages many people read (static content)', '{cf|CloudFront} (cache), S3 website behind it'],
        ['API calls, logins, dynamic pages over HTTP', '{cf|CloudFront} (no cache, AWS network), {alb|ALB} in the Region'],
        ['UDP, MQTT, custom TCP, game or voice traffic', '{ga|Global Accelerator}'],
        ['a DNS name that must point somewhere', '{r53|Route 53} records and routing policies'],
        ['uploads from far away into one bucket', '{s3web|S3 Transfer Acceleration}']] } },
      { h: 'The stub for this session' },
      'Session 3’s slots (two ends, path) do not separate these services. This session uses four new ones:',
      { table: { head: ['Slot', 'Ask', 'Values', 'What it kills'], rows: [
        ['WHAT', 'What travels?', '`static content` · `dynamic HTTP` · `non-HTTP TCP/UDP` · `DNS name` · `uploads to S3`', 'CloudFront for UDP; GA for cacheable files; TA for downloads'],
        ['SCOPE', 'Where are users and Regions?', '`one Region` · `multi-Region active-passive` · `multi-Region active-active` · `global users`', 'multi-Region machinery for a one-Region question'],
        ['NEED', 'What must the service add?', '`cache` · `faster transfer` · `static IP` · `DNS steering` · `failover` · `restrict access` · `edge logic` · `path routing`', 'the service built for a different need (GA has no cache; Route 53 has no paths)'],
        ['SUPERLATIVE', 'What is optimised?', '`cheapest` · `least ops` · `lowest latency` · `fastest failover` · `most secure` · `none stated`', 'GA when “cheapest” and DNS is enough; Route 53 when “fastest failover”']] } },
      { pre: S.method, label: 'The method' },
      { h: 'Built for — one line each' },
      { hooks: [
        ['CloudFront', 'an **HTTP cache** at the edge (plus HTTPS, WAF, signed URLs, edge code). In the data path.'],
        ['Global Accelerator', '**two static anycast IPs** into the AWS backbone for **TCP/UDP**, fast Regional failover. In the data path. **No cache.**'],
        ['Route 53', '**DNS**: answers the name. Never in the data path.'],
        ['S3 Transfer Acceleration', 'faster transfers **into one bucket** from far away. No cache.'],
        ['ALB', 'layer-7 routing **by path and host** inside **one Region**.']], label: 'Built for' },
      { h: 'Try it on Q4' },
      'Your exam miss. Fill the four slots before looking at any option.',
      { widget: 'stubTrainer', args: { drill: 'Q4', title: 'Stub trainer · Exam Q4', why: {
        what: 'installation packages: the same files, read many times.',
        scope: 'customers in Europe, Asia and South America.',
        need: '“the same packages many times a day” — the word that means cache.',
        sup: '“most cost-effective”.' } } },
      { check: { id: 'ch1-q4', src: 'Exam Q4', q: 'Which single fact decides Q4?', opts: [
        { t: 'Transfer Acceleration only works for uploads.', why: 'not quite: it accelerates transfers to and from one bucket — but it never caches.' },
        { t: 'CloudFront caches objects at the edge; Transfer Acceleration caches nothing.', why: 'repeat downloads of the same file are served from the edge only with a cache.' },
        { t: 'Global Accelerator is cheaper than CloudFront.', why: 'irrelevant: GA cannot use S3 as an endpoint at all.' },
        { t: 'S3 cannot serve files to other continents.', why: 'false: it can, just slowly.' }], a: 1,
        why: 'NEED = cache. Only CloudFront caches. Transfer Acceleration shortens each trip but every download still starts in us-east-1.' } }
    ] },

    /* ---------------------------------------------------------------- 2 */
    { id: 'ch2', title: 'The AWS edge: who sits in the path?', domains: 'D2 D3', blocks: [
      'AWS has two kinds of global infrastructure outside the Regions. **Edge locations** (points of presence) sit in hundreds of cities, close to users; **regional edge caches** are fewer, larger caches between the edge locations and your origins. Both are connected to the Regions by the **AWS global network** (the backbone). CloudFront, Global Accelerator, Route 53, S3 Transfer Acceleration and Shield all use this edge.',
      { h: 'Three services, three positions' },
      { table: { head: ['', '{cf|CloudFront}', '{ga|Global Accelerator}', '{r53|Route 53}'], key: true, rows: [
        ['Where it sits', 'in the data path, layer 7 (HTTP)', 'in the data path, layer 4 (TCP/UDP)', 'beside the path: answers DNS, then the client connects'],
        ['What the client sees', 'your domain → CloudFront edge IPs', '2 static anycast IPs (4 dual-stack)', 'whatever IPs the chosen record holds'],
        ['Caches content', '**yes**', 'no', 'no (resolvers cache answers for the TTL)'],
        ['Protocols', 'HTTP, HTTPS, WebSocket, gRPC', 'any TCP or UDP', 'DNS'],
        ['Chooses a Region by', 'cache behaviour → origin (and origin failover)', 'nearest healthy endpoint group, traffic dials, weights', 'routing policy + health checks'],
        ['Failover speed', 'per request, to a secondary origin', 'under a minute, same IPs', 'health check time + TTL'],
        ['Typical words', 'static content, video, cache, HTTPS for S3', 'UDP, gaming, static IPs, allowlist', 'domain, latency, geolocation, active-passive']] } },
      'The shortcut: **CloudFront is a cache, Global Accelerator is a lane, Route 53 is a signpost.** A cache helps only when many users want the same bytes. A lane helps any traffic, cacheable or not, including UDP. A signpost costs almost nothing and never touches the traffic.',
      { callout: 'CloudFront also speeds up **dynamic** HTTP (API calls, logins): viewers connect to a nearby edge, and CloudFront carries the request over the AWS network to the origin with persistent connections. So “dynamic content” alone does not mean Global Accelerator. GA wins when the traffic is **not HTTP**, or when **static IPs** or **DNS-free failover** are required.', kind: 'note', title: 'The boundary' },
      { h: 'Sort them' },
      { widget: 'sorter', args: { title: 'Which one answers this?', lead: 'Each requirement has exactly one best fit among the three. Decide before you check.', buckets: [{ id: 'cf', short: 'CloudFront', label: 'CloudFront' }, { id: 'ga', short: 'GA', label: 'Global Accelerator' }, { id: 'r53', short: 'Route 53', label: 'Route 53' }], items: [
        { t: 'Cache product images for shoppers on four continents', b: 'cf', why: 'cacheable HTTP content.' },
        { t: 'A UDP game needs low latency and two fixed IPs', b: 'ga', why: 'UDP + static IPs.' },
        { t: 'Send EU users to eu-central-1 because of data residency', b: 'r53', why: 'geolocation routing.' },
        { t: 'HTTPS on a custom domain for an S3 static website', b: 'cf', why: 'the website endpoint is HTTP only.' },
        { t: 'Customers must allowlist the API’s IP addresses in their firewalls', b: 'ga', why: 'static anycast IPs.' },
        { t: 'Point the zone apex example.com at an ALB', b: 'r53', why: 'alias record.' },
        { t: 'Block viewers from three countries for licensing', b: 'cf', why: 'geo restriction.' },
        { t: 'Move 10% of users to a new stack for a canary, using DNS', b: 'r53', why: 'weighted records.' },
        { t: 'IoT devices cache DNS for a day; fail over between Regions within a minute', b: 'ga', why: 'no DNS involved in failover.' }] } },
      { check: { id: 'ch2-a', q: 'A question says “improve performance for users worldwide of an application that serves **dynamic HTTP** content”. Nothing about IPs or protocols. Which is the safer first reading?', opts: [
        { t: 'Global Accelerator: dynamic content cannot use CloudFront.', why: 'false: CloudFront accelerates dynamic HTTP over the AWS network too.' },
        { t: 'CloudFront, unless another requirement (UDP, static IPs, DNS-free failover) points to GA.', why: 'CloudFront is the HTTP answer; GA needs a reason.' },
        { t: 'Route 53 latency routing, always.', why: 'only helps if there are several Regions to choose from.' },
        { t: 'S3 Transfer Acceleration.', why: 'for transfers into a bucket.' }], a: 1,
        why: 'HTTP → CloudFront by default. Look for the words that earn GA: UDP / non-HTTP, static or fixed IPs, allowlisting, failover without DNS.' } }
    ] },

    /* ---------------------------------------------------------------- 3 */
    { id: 'ch3', title: 'CloudFront: distributions, origins and behaviours', domains: 'D2 D3', blocks: [
      'A **distribution** is one CloudFront configuration with its own domain (dxxxx.cloudfront.net) and optionally your **alternate domain names** (app.example.com). Viewers resolve that name, connect to the nearest edge location, and CloudFront either answers from cache or fetches from an **origin**.',
      { h: 'The request path' },
      { ol: [
        'The viewer connects to the **edge location** closest in network terms. If the object is cached and fresh, it is answered there.',
        'On a miss, the edge asks its **regional edge cache**. These are larger and keep less popular objects longer.',
        'On a second miss, the regional edge cache fetches from the **origin** and both caches keep the object for its TTL.',
        'Some requests skip the regional edge cache and go straight from the edge location to the origin: **PUT, POST, PATCH, OPTIONS, DELETE**, requests CloudFront treats as dynamic, and S3 origins whose best regional edge cache is in the bucket’s own Region.'] },
      { h: 'Origins' },
      { table: { head: ['Origin', 'Use it for', 'Note'], key: true, rows: [
        ['S3 bucket (REST endpoint)', 'static files, private bucket', 'lock it with **origin access control** (chapter 5)'],
        ['S3 website endpoint', 'redirect rules / index documents of website hosting', 'a **custom origin**, **HTTP only**, bucket must be public'],
        ['ALB, EC2, any HTTP server (on-prem too)', 'dynamic pages, APIs', 'custom origin; protect it from direct access (chapter 5)'],
        ['VPC origins', 'a **private** ALB, NLB or EC2 instance in private subnets', 'since Nov 2024: no public exposure at all'],
        ['MediaPackage, Lambda function URL, API Gateway', 'video packaging, serverless APIs', '']] } },
      { callout: '**VPC origins** (GA November 2024) let CloudFront reach an internal ALB, NLB or EC2 instance with no internet-facing endpoint. Older material and most banks protect a public ALB with the CloudFront prefix list and a secret header — still valid. CloudFront also supports **gRPC** (Nov 2024) and **WebSocket**.', kind: 'update' },
      { h: 'Cache behaviours: routing by path at the edge' },
      'A distribution has a **default behaviour** (path pattern `*`) and optional extra behaviours such as `/api/*`, `/images/*` or `*.mp4`. CloudFront checks them **in the order you list them** and uses the first match; `*` is always last. Each behaviour chooses:',
      { ul: [
        'the **origin** (so one domain can serve `/api/*` from an ALB and everything else from S3),',
        'the **viewer protocol policy** (HTTP and HTTPS, redirect HTTP to HTTPS, HTTPS only),',
        'the **allowed methods** (GET/HEAD; +OPTIONS; or all seven including POST, PUT, DELETE) — only GET and HEAD (and optionally OPTIONS) responses are cached,',
        'a **cache policy**, an **origin request policy**, a **response headers policy**, edge functions, and whether requests must be signed.'] },
      { h: 'Cache policy vs origin request policy' },
      { table: { head: ['Policy', 'Controls', 'Why it matters'], key: true, rows: [
        ['Cache policy', 'the **cache key** (which headers, cookies, query strings make an object unique) and the TTLs', 'every value in the key is also forwarded; more values → more variants → lower hit ratio'],
        ['Origin request policy', 'extra values sent **to the origin** without being in the cache key', 'the origin gets what it needs while the hit ratio stays high'],
        ['Response headers policy', 'headers added to responses: CORS, HSTS and other security headers', 'no code needed for standard headers']] } },
      { h: 'Behaviours vs ALB rules (your Q43)' },
      'Both “route by path”, which is why the exam puts them side by side. **CloudFront behaviours** pick an **origin** worldwide, by path pattern only. **ALB listener rules** pick a **target group** inside one Region, by path, host, header, method, query string or source IP. If the question says microservices, target groups, host names or containers in one Region, it is the ALB.',
      { pair: 'alb-cf' },
      { callout: '**Q43** was a keyword miss. “Path-based routing” and “host-based routing” are ALB phrases. Route 53 cannot see paths (DNS only sees names) and an NLB works on ports.', kind: 'miss', title: 'Your misses' },
      { check: fromDrill('Q43', 'Exam Q43') },
      { check: { id: 'ch3-beh', q: 'One domain must serve `/api/*` from an ALB in eu-west-1 and everything else from an S3 bucket, to users worldwide, with caching for the static files. What do you configure?', opts: [
        { t: 'Two Route 53 records, one per path.', why: 'DNS cannot see the path.' },
        { t: 'One CloudFront distribution with two origins and a `/api/*` behaviour (caching disabled) plus the default behaviour to S3.', why: 'behaviours route by path to origins, each with its own cache settings.' },
        { t: 'An ALB with a rule that forwards everything that is not /api/* to S3.', why: 'ALB target groups cannot be S3 buckets, and it caches nothing.' },
        { t: 'Global Accelerator with two endpoint groups.', why: 'GA routes by Region, not by path.' }], a: 1,
        why: 'Worldwide + caching + split by path across different origins → CloudFront cache behaviours.' } }
    ] },

    /* ---------------------------------------------------------------- 4 */
    { id: 'ch4', title: 'Caching: TTLs, hit ratio, invalidation vs versioned names', domains: 'D3 D4', blocks: [
      'CloudFront pays off only when it can answer from cache. The **hit ratio** — the share of requests answered without the origin — is what you tune.',
      { h: 'How long an object stays: TTL' },
      { ul: [
        'The origin can set `Cache-Control: max-age` / `s-maxage` or `Expires`. The cache policy’s **minimum** and **maximum TTL** clamp those values.',
        'If the origin sends nothing, CloudFront uses the **default TTL: 86,400 seconds (24 hours)**. The default maximum is one year.',
        'Longer TTL → higher hit ratio, lower origin load, lower cost — and **stale content lives longer** after a change.'] },
      { h: 'What makes a request “the same”: the cache key' },
      'By default the key is the domain and the URL path. Every header, cookie or query string you add to the cache key multiplies the variants. Forward to the origin only what it needs with an **origin request policy**, and keep the cache key small.',
      { h: 'Getting a new version out' },
      { table: { head: ['Approach', 'How it works', 'Cost and effect'], key: true, rows: [
        ['Wait for the TTL', 'nothing to do', 'users get the old file until each cached copy expires'],
        ['Invalidation', 'remove paths (`/app.js`, `/images/*`) from every edge location and regional edge cache', '**first 1,000 paths a month free**, then per path; a wildcard counts as one; the next requests all miss'],
        ['Versioned file names', 'publish `app.3f9c.js`; the HTML (short TTL) references the new name', 'no invalidation, no stale copies, old files keep their long TTL; **AWS’s advice for frequent changes**']] } },
      { h: 'Simulate it' },
      'Start with TTL 1 h and “just wait”: count the users who get the old file. Switch to invalidation, then to versioned names. Then turn the regional edge cache off and use 40 edge locations: more locations means more first-time misses, and the regional edge cache absorbs them.',
      { widget: 'cacheSim' },
      { h: 'Two more layers' },
      { ul: [
        '**Regional edge caches** are always on; you do not configure them.',
        '**Origin Shield** is an optional extra cache in **one Region you choose** (near the origin). All regional edge caches ask it first, so the origin sees one request per object instead of one per regional cache. Trigger: “reduce load on the origin further”, origins outside AWS, live video.'] },
      { h: 'Price classes' },
      'You can limit which edge locations serve your distribution to cut cost: **Price Class 100** (United States, Mexico, Canada, Europe, Israel, Türkiye), **Price Class 200** (adds most of Asia, India, Africa and the Middle East), **All** (adds South America, Australia and New Zealand). Viewers elsewhere are still served, from a farther location.',
      { callout: 'Since November 2025 CloudFront also has **flat-rate pricing plans** (Free, Pro, Business, Premium) that bundle the CDN with WAF, DDoS protection, Route 53 DNS and S3 credits, with no overage charges. Pay-as-you-go still exists. Banks will not ask about it yet.', kind: 'update' },
      { check: fromDrill('G6') },
      { check: { id: 'ch4-ttl', q: 'An origin sends no Cache-Control or Expires headers and the cache policy uses its defaults. How long does CloudFront keep an object?', opts: [
        { t: 'Not at all', why: 'CloudFront caches by default.' }, { t: '60 seconds', why: 'a common choice for dynamic content, not the default.' },
        { t: '24 hours (86,400 s)', why: 'the default TTL.' }, { t: 'One year', why: 'the default maximum TTL.' }], a: 2,
        why: 'Default TTL = 86,400 s, used only when the origin sends no caching headers.' } },
      { drills: ['G1', 'G5', 'G6'] }
    ] },

    /* ---------------------------------------------------------------- 5 */
    { id: 'ch5', title: 'Securing CloudFront: OAC, signed URLs and cookies, HTTPS, WAF', domains: 'D1', blocks: [
      'There are two separate questions: **who may reach the origin** (only CloudFront) and **which viewers may get the content** (members only, certain countries). Keep them apart and the options sort themselves.',
      { h: 'Behind CloudFront: lock the origin' },
      { ul: [
        '**S3 origin → Origin Access Control (OAC).** CloudFront signs every request to the bucket (SigV4); the bucket policy allows only the CloudFront service principal for **your distribution**. Works in all Regions, with **SSE-KMS**, and for PUT/POST/DELETE.',
        '**Origin Access Identity (OAI)** is the **legacy** mechanism: no SSE-KMS, no write methods, not in Regions launched after January 2023. Banks still mention it; pick OAC when both appear.',
        '**ALB or custom origin → no OAC.** Allow the **CloudFront managed prefix list** in the security group and check a **secret custom header** in an ALB rule or WAF — or use a **VPC origin** so the ALB is not public at all.'] },
      { h: 'In front of CloudFront: who gets the content' },
      { table: { head: ['Tool', 'Use when', 'Detail'], key: true, rows: [
        ['Signed URL', 'one file; a client that cannot use cookies; a download link', 'expiry, optional start time and source IP range in the policy'],
        ['Signed cookies', 'many files; URLs must not change (members’ area, HLS video)', 'the same policy, carried in cookies'],
        ['Geographic restriction', 'licensing: allow or block **countries**', 'country level, returns 403, applies to the whole distribution'],
        ['AWS WAF web ACL', 'SQL injection, bots, rate limits, IP sets, geo match with conditions', 'created with CLOUDFRONT scope in **us-east-1**'],
        ['Field-level encryption', 'encrypt specific form fields (card numbers) at the edge for one backend service', 'up to 10 fields per request'],
        ['AWS Shield Standard', 'layer 3/4 DDoS', '**always on, no charge**; Shield Advanced is optional']] } },
      'Signing uses **trusted key groups**: you upload public keys to CloudFront and sign with the private key. The old way — a CloudFront key pair created by the **root user** — is legacy.',
      { pair: 'access' },
      { h: 'HTTPS on your own domain' },
      { ol: [
        'Request or import the certificate in **ACM in us-east-1** (N. Virginia). CloudFront never sees certificates from other Regions.',
        'Add the name as an **alternate domain name** on the distribution and select the certificate.',
        'Serve it with **SNI** (no extra charge). A **dedicated IP** custom SSL costs $600 a month and is only for very old clients.',
        'Set the viewer protocol policy to **Redirect HTTP to HTTPS** or **HTTPS only**.',
        'Point the name at the distribution with a Route 53 **alias record** (chapter 9).'] },
      { callout: '**Geo restriction vs Route 53 geolocation.** Geolocation routing **steers** users to a record; anybody can still reach the content another way. Geo restriction **blocks** at CloudFront. “Must not be delivered to” → geo restriction.', kind: 'note', title: 'Trap' },
      { check: fromDrill('G19') },
      { check: fromDrill('G20') },
      { check: fromDrill('G25') },
      { drills: ['G4', 'G19', 'G20', 'G21', 'G25'] }
    ] },

    /* ---------------------------------------------------------------- 6 */
    { id: 'ch6', title: 'Code at the edge: CloudFront Functions vs Lambda@Edge', domains: 'D3 D4', blocks: [
      'Sometimes a request needs a small change before it hits the cache or the origin: a redirect, a header, a rewritten URL, an authentication check. CloudFront gives you two places to run code, and the exam wants you to pick the cheaper one when it is enough.',
      { h: 'Four events' },
      { table: { head: ['Event', 'When it runs', 'CloudFront Functions', 'Lambda@Edge'], key: true, rows: [
        ['Viewer request', 'every request, before the cache', 'yes', 'yes'],
        ['Origin request', 'only on a cache miss, before the origin', '—', 'yes'],
        ['Origin response', 'only on a cache miss, after the origin', '—', 'yes'],
        ['Viewer response', 'every response, before the viewer', 'yes', 'yes']] } },
      { h: 'The two runtimes' },
      { table: { head: ['', 'CloudFront Functions', 'Lambda@Edge'], key: true, rows: [
        ['Language', 'JavaScript (cloudfront-js 1.0 / 2.0)', 'Node.js, Python'],
        ['Where it runs', 'edge locations', 'regional edge caches'],
        ['Scale', 'millions of requests per second', 'up to 10,000 requests per second per Region'],
        ['Run time', 'sub-millisecond', 'up to 30 s'],
        ['Memory / code', '2 MB / 10 KB', '128 MB (viewer) up to 10,240 MB (origin) / 50 MB'],
        ['Generated response', '—', '40 KB (viewer) · 1 MB (origin)'],
        ['Network, body access', 'no, no', 'yes, yes'],
        ['Created in', 'CloudFront', 'Lambda in **us-east-1**, numbered version'],
        ['Good for', 'headers, redirects, URL rewrites, cache-key normalisation, token checks', 'calls to other services, origin selection, image resizing, body changes']] } },
      { callout: 'Lambda@Edge quotas now show **30 seconds and 50 MB for every trigger**. Older material says viewer triggers are limited to 5 s and 1 MB. The exam distinction is unchanged: CloudFront Functions = viewer only, tiny, cheapest; Lambda@Edge = all four triggers, network, body.', kind: 'update' },
      { h: 'Choose' },
      { widget: 'chooser', args: { title: 'Edge-compute chooser', tree: EDGEFN } },
      { pair: 'edgefn' },
      { check: fromDrill('G22') },
      { check: fromDrill('G23') },
      { drills: ['G22', 'G23'] }
    ] },

    /* ---------------------------------------------------------------- 7 */
    { id: 'ch7', title: 'S3 at the edge: website hosting, Route 53, Transfer Acceleration', domains: 'D2 D3', blocks: [
      'Two of your baseline misses live here. They are fact questions: learn the facts once and they are free points.',
      { h: 'S3 static website hosting' },
      { ul: [
        'Turn on **static website hosting** for a bucket, set an **index document** (index.html) and an optional **error document**, and optionally redirect rules.',
        'S3 serves it on a **website endpoint**: `bucket-name.s3-website-region.amazonaws.com` (or `s3-website.region` in newer Regions).',
        'The website endpoint is **HTTP only**, serves **public** content only (turn off Block Public Access for the bucket and add a public-read bucket policy), and supports only GET and HEAD.'] },
      { h: 'Using your own domain (Q53)' },
      { widget: 'stepper', args: { title: 'Host example.com on S3 with Route 53', line: 's3web', steps: [
        { title: 'Name the bucket exactly like the domain', text: 'Create a bucket named **example.com** (and one named **www.example.com** if you want both). The website endpoint answers by host name, so the bucket name must match the record name exactly. This was the fact behind Q53.' },
        { title: 'Enable static website hosting', text: 'Set the index document (index.html) and an error document. On the www bucket you can instead configure a redirect to example.com.' },
        { title: 'Make the content public', text: 'Turn off Block Public Access for this bucket and add a bucket policy that allows `s3:GetObject` to everyone. The website endpoint cannot serve private objects.' },
        { title: 'Create an alias record in Route 53', text: 'In the hosted zone for example.com, create an **A record, alias = yes**, target = the **S3 website endpoint** in the bucket’s Region. A CNAME is impossible at the zone apex; alias queries to S3 website endpoints are free.' },
        { title: 'Need HTTPS or a private bucket? Put CloudFront in front', text: 'The website endpoint is HTTP only. For HTTPS: CloudFront + ACM certificate from us-east-1, bucket REST endpoint as origin with OAC (bucket stays private), and the alias record points at the distribution instead.', note: 'The S3 user guide now lists AWS Amplify Hosting as the recommended way to add HTTPS to an S3-hosted site, with CloudFront as the alternative. Banks answer CloudFront.' }] } },
      { callout: '**Q53.** Two facts: **bucket name = domain name**, and **alias A record → S3 website endpoint**. Say them out loud whenever a question mentions an S3 website and Route 53.', kind: 'miss', title: 'Your misses' },
      { check: fromDrill('Q53', 'Exam Q53') },
      { h: 'S3 Transfer Acceleration' },
      { ul: [
        'Turn it on per bucket; clients use `bucket-name.s3-accelerate.amazonaws.com`. The bucket name must be DNS-compliant **without dots**.',
        'The transfer enters AWS at the **nearest edge location** and crosses the AWS network to the bucket.',
        'It is for **long-distance transfers to and from one bucket**, typically **uploads** from other continents (combine with multipart upload). You pay only when it is likely to be faster.',
        'It **caches nothing**. Ten thousand users downloading the same file make ten thousand transfers from the bucket.'] },
      { pair: 'cf-ta' },
      { callout: '**Q4.** “Users download” + “the same files” = CloudFront. “Users upload” + “to one bucket from far away” = Transfer Acceleration. The direction and the word **same** decide it.', kind: 'miss', title: 'Your misses' },
      { check: fromDrill('Q4', 'Exam Q4') },
      { check: fromDrill('G24') },
      { drills: ['Q53', 'Q4', 'G2', 'G24'] }
    ] },

    /* ---------------------------------------------------------------- 8 */
    { id: 'ch8', title: 'Global Accelerator: static IPs and a fast lane, no cache', domains: 'D2 D3', blocks: [
      'Global Accelerator is the service you over-pick. Learn what it is, then learn the three situations where it is the only good answer.',
      { h: 'How it works' },
      { ul: [
        'An **accelerator** gets **two static anycast IPv4 addresses** (dual-stack: two IPv4 + two IPv6). Every edge location announces them, so each client reaches the **nearest** one. You can bring your own IPs (BYOIP).',
        'A **listener** accepts **TCP or UDP** on ports or port ranges, with optional client affinity by source IP.',
        '**Endpoint groups**: one per Region per listener. Each has a **traffic dial** (percentage of traffic that Region receives) and health-check settings.',
        '**Endpoints** in a group: **ALB** (internet-facing or internal), **NLB**, **EC2 instance**, **Elastic IP**. Each has a **weight** (0–255, default 128). **Not S3, not CloudFront.**',
        'Traffic crosses the **AWS backbone** from the edge to the Region. Nothing is cached.',
        'Health: ALB/NLB endpoints use their load balancer health checks; EC2/EIP endpoints use GA’s own. An unhealthy endpoint is taken out of service in **under a minute**, and because the IPs never change, **DNS caching does not delay failover**.',
        '**Client IP preservation** for ALB, EC2 and NLB with security groups (not for Elastic IP endpoints).',
        'Shield Standard included. Billed per accelerator per hour plus premium data transfer.'] },
      { h: 'Custom routing accelerators' },
      'A second type: instead of balancing, it **maps** each listener port to a **specific EC2 instance and port** in VPC subnets, chosen by your own application (a matchmaking service for games, a session server for VoIP). Endpoints are VPC subnets; only EC2; traffic is denied until you allow it.',
      { h: 'When GA is the answer' },
      { ol: [
        '**Non-HTTP traffic** worldwide: UDP games, VoIP, MQTT/IoT, custom TCP.',
        '**Static IP addresses** for an application in one or several Regions (firewall allowlists, hard-coded clients) — an ALB cannot have one.',
        '**Fast, deterministic Regional failover** that must not wait for DNS caches.'] },
      { h: 'When GA is a distractor' },
      { table: { head: ['Scenario', 'Why GA is wrong', 'Answer'], key: true, rows: [
        ['cache images, video, downloads', 'no cache', '{cf|CloudFront}'],
        ['anything in front of S3', 'S3 is not an endpoint', '{cf|CloudFront} or {s3web|Transfer Acceleration}'],
        ['HTTPS certificate for your domain, WAF, geo restriction', 'layer 4 pass-through', '{cf|CloudFront}'],
        ['nearest Region for an HTTP app, “most cost-effective”, no IP requirement', 'hourly fee + premium data transfer for something DNS does', '{r53|Route 53 latency}'],
        ['route by URL path', 'no layer-7 rules', '{alb|ALB}'],
        ['connect VPCs or on-prem privately', 'internet users only', 'Session 3: peering, TGW, VPN, DX']] } },
      { pair: 'cf-ga' },
      { callout: 'Before choosing GA, name which of the three reasons applies: **non-HTTP**, **static IPs**, **failover without DNS**. If you cannot name one, cross it out. You chose it twice in the baseline where none applied.', kind: 'miss', title: 'Your misses' },
      { check: fromDrill('G7') },
      { check: fromDrill('G3') },
      { check: fromDrill('G9') },
      { drills: ['G7', 'G8', 'G9', 'G26', 'G3', 'G1'] }
    ] },

    /* ---------------------------------------------------------------- 9 */
    { id: 'ch9', title: 'Route 53: records, alias, hosted zones, health checks', domains: 'D1 D2', blocks: [
      'Route 53 is AWS’s DNS: a registrar, an authoritative DNS service and a health checker in one. It never carries your traffic; it tells clients where to connect.',
      { h: 'Hosted zones' },
      { ul: [
        'A **public hosted zone** answers the internet for a domain (example.com). $0.50 per zone per month for the first 25.',
        'A **private hosted zone** answers only inside the **VPCs you associate** with it (corp.internal). The VPCs need **enableDnsHostnames** and **enableDnsSupport** turned on. Queries are free.',
        'The same name can exist in both (split-view DNS): inside the VPC the private answer wins.',
        'Route 53 can also **register domains**, sign zones with **DNSSEC** (KMS key in us-east-1) and log queries.'] },
      { h: 'Records you need' },
      { table: { head: ['Record', 'Maps', 'Note'], key: true, rows: [
        ['A / AAAA', 'name → IPv4 / IPv6', ''],
        ['CNAME', 'name → another name', '**never at the zone apex**; queries are charged'],
        ['Alias (A/AAAA)', 'name → an AWS resource', 'Route 53 extension; **works at the apex**; **free queries** to AWS targets; TTL comes from the target'],
        ['NS / SOA', 'delegation / zone authority', 'created with the zone'],
        ['MX, TXT, CAA …', 'mail, verification, which CAs may issue', '']] } },
      'Alias targets: **CloudFront** distributions, **ELB** (ALB, NLB, CLB), **S3 website endpoints**, **API Gateway**, **Global Accelerator**, **VPC interface endpoints**, **Elastic Beanstalk**, **App Runner**, **AppSync**, OpenSearch custom domains, and another record in the same zone. **Not** an EC2 instance’s DNS name.',
      { pair: 'alias' },
      { h: 'TTL' },
      'Resolvers cache an answer for its **TTL**. A long TTL means fewer queries (cheaper, faster lookups) and **slower change**: after you change a record or a failover happens, clients keep the old answer until their copy expires. Alias records take the target’s TTL.',
      { h: 'Health checks' },
      { table: { head: ['Type', 'Checks', 'Use for'], key: true, rows: [
        ['Endpoint', 'HTTP, HTTPS or TCP to an IP or domain, optionally a string in the first 5,120 bytes', 'public endpoints'],
        ['Calculated', 'combines other health checks (AND/OR/at least N)', '“healthy if 2 of 3 web servers are up”'],
        ['CloudWatch alarm', 'the state of an alarm', '**private resources** (health checkers are on the internet), or any metric']] } },
      { ul: [
        'Checkers run from several AWS Regions; an endpoint is healthy if **more than 18%** of them say so.',
        'Interval **30 s** (or **10 s** fast), **failure threshold** 1–10, default **3**.',
        'Alias records can **evaluate target health** instead of a separate check (not for CloudFront targets).'] },
      { callout: '**Route 53 Resolver** is now called **Route 53 VPC Resolver** (Session 2, hybrid DNS). New since the course: **Route 53 Profiles** (April 2024) share private hosted zone associations, resolver rules and DNS Firewall settings across VPCs and accounts through RAM; **Route 53 Global Resolver** (GA March 2026) is an internet-reachable anycast resolver for on-prem and remote clients with DNS filtering. Recognise the names; banks rarely ask.', kind: 'update' },
      { check: fromDrill('G10') },
      { check: fromDrill('G16') },
      { check: fromDrill('G17') },
      { drills: ['G10', 'G16', 'G17', 'Q53'] }
    ] },

    /* ---------------------------------------------------------------- 10 */
    { id: 'ch10', title: 'Route 53 routing policies', domains: 'D2 D3', blocks: [
      'Every routing policy answers one question differently: **which record does this user get?** The exam gives you the reason for the choice; map the reason to the policy.',
      { table: { head: ['Policy', 'Answers with', 'Health checks', 'Exam words'], key: true, rows: [
        ['Simple', 'all values of one record, random order', 'no', 'one resource, nothing special'],
        ['Weighted', 'records in proportion to weight (0–255)', 'yes', 'canary, 10% of traffic, A/B, gradual shift'],
        ['Latency', 'the Region with the lowest measured latency', 'yes', 'best performance, lowest latency, several Regions'],
        ['Failover', 'primary while healthy, else secondary', 'required on primary', 'active-passive, disaster recovery, standby'],
        ['Geolocation', 'by the user’s continent, country or US state; **Default** for the rest', 'yes', 'law, residency, language, licensing'],
        ['Geoproximity', 'by distance to your resources, adjusted by **bias** (−99…+99)', 'yes', 'shift traffic to a Region, grow its area'],
        ['Multivalue answer', 'up to **8 healthy** records, random', 'yes', 'several healthy IPs, client-side retry'],
        ['IP-based', 'by the client’s IP range (CIDR collections), default “*”', 'yes', 'ISP ranges, known networks']] } },
      { h: 'Simulate them' },
      'Pick each policy in turn. Then fail a Region’s health check. Things to notice: **simple** keeps handing out the dead Region; **latency** moves Mumbai when Singapore fails; **geolocation** without a Default leaves São Paulo and Sydney with no answer; a **+80 bias** on eu-west-1 pulls New York across the Atlantic; **failover** ignores Singapore entirely.',
      { widget: 'routingSim' },
      { pair: 'r53-geo' },
      { callout: 'Geoproximity records can be created directly in the console since **January 2024**; older material says Traffic Flow is required. **Traffic Flow** (visual traffic policies, $50 per policy record per month) still exists for complex trees such as geolocation → failover → weighted.', kind: 'update' },
      { h: 'Combining policies' },
      'Policies can be nested with alias records: for example a **latency** record per Region whose target is a **failover** pair inside that Region, or **geolocation** for Europe pointing to a **weighted** canary. When a question needs two behaviours (“nearest Region, and a standby in each”), the answer is usually nesting, not a single policy.',
      { check: fromDrill('G13') },
      { check: fromDrill('G14') },
      { check: fromDrill('G15') },
      { check: fromDrill('G11') },
      { drills: ['G3', 'G11', 'G13', 'G14', 'G15', 'G27'] }
    ] },

    /* ---------------------------------------------------------------- 11 */
    { id: 'ch11', title: 'Multi-Region and failover: DNS, anycast or origin group', domains: 'D2', blocks: [
      'A multi-Region design has two shapes. **Active-passive**: one Region serves, the other waits (pilot light, warm standby) and takes over on failure. **Active-active**: every Region serves its share all the time, and a failure just removes one. Three services can move users between Regions; they differ in speed, scope and cost.',
      { h: 'The three failover mechanisms' },
      { table: { head: ['', '{r53|Route 53 failover}', '{ga|Global Accelerator}', '{cf|CloudFront origin group}'], key: true, rows: [
        ['What moves', 'the DNS answer', 'new connections, behind the same IPs', 'each request, to the secondary origin'],
        ['How long', '≈ interval × threshold + TTL (default 30 s × 3 + TTL)', 'under a minute', 'origin timeout × attempts per request (default 3 × 10 s)'],
        ['Depends on clients?', 'yes: they must respect the TTL', 'no', 'no'],
        ['Scope', 'anything with a name', 'TCP/UDP to ALB, NLB, EC2, EIP', 'GET, HEAD, OPTIONS only'],
        ['Cost', 'health check + queries (cheapest)', 'hourly fee + premium data transfer', 'part of CloudFront'],
        ['Typical question', 'standby Region, minutes OK, cheapest', 'static IPs, clients cache DNS, seconds matter', 'serve reads from a replicated S3 bucket']] } },
      { h: 'Race them' },
      'Start with the defaults, then set the TTL to 1 hour. Then switch the clients to devices that cache DNS for 24 hours. Finally shorten CloudFront’s origin timeout.',
      { widget: 'failoverRace' },
      { pair: 'failover' },
      { h: 'Build an active-passive setup with Route 53' },
      { widget: 'stepper', args: { title: 'Active-passive with Route 53 failover', line: 'r53', steps: [
        { title: 'Two stacks', text: 'The full application in the primary Region; a smaller copy (pilot light or warm standby) in the secondary. Data replicated: Aurora Global Database, DynamoDB global tables, S3 CRR.' },
        { title: 'A health check on the primary', text: 'An HTTP/HTTPS health check on the primary’s public endpoint — or **evaluate target health** on an alias to the ALB. For a private endpoint, a CloudWatch-alarm health check.' },
        { title: 'Two failover records', text: 'Same name and type. **Primary** → primary ALB (alias) with the health check; **secondary** → the standby ALB. Give the secondary its own health check if you want Route 53 to know when both are down.' },
        { title: 'A short TTL', text: 'Alias records to an ALB use the ALB’s TTL; for non-alias records use about **60 seconds**. Failover time ≈ health-check interval × threshold + TTL.' },
        { title: 'Test it', text: 'Fail the primary on purpose and watch the answer change. Amazon Application Recovery Controller (ARC) adds routing controls, zonal shift and Region switch for orchestrated failover.', note: 'Route 53 **Application Recovery Controller** is now named **Amazon Application Recovery Controller (ARC)**; its readiness checks are closed to new customers, and **Region switch** (2025) orchestrates multi-Region failover. Recognise the names.' }] } },
      { h: 'Active-active' },
      'Serve from every Region with **latency** (or geolocation / geoproximity) records plus health checks, or with **Global Accelerator** endpoint groups in each Region (traffic dials at 100%). The hard part is the data: the database must accept writes in several Regions (DynamoDB global tables) or the design is really active-passive for writes (Aurora Global Database has one writer Region). Session 7 goes deep on DR tiers.',
      { check: fromDrill('G12') },
      { check: fromDrill('G8') },
      { check: fromDrill('G18') },
      { drills: ['G12', 'G8', 'G18', 'G16'] }
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
      'Q4, Q53 and Q43 are your baseline misses and are marked as yours in the drill. Six drills tempt you with Global Accelerator where it has no role; four make it the right answer. Run the 30 scenarios once; your new misses appear in Progress.',
      { link: '#drill', text: 'Go to the drill (30 scenarios)', btn: true }
    ] }
  ];
})();
