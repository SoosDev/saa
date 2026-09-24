/* Session 4 — Global architecture & edge: meta, lines, edge map, stub, method, cheat sheet, compare, traps, log.
   Colour rule: a service keeps its colour on every page. Two new hues for the most-confused pair:
   CloudFront (--cf wine) and Global Accelerator (--ga indigo). Route 53 and everything else are ink lines
   (4 px) with their own dash pattern and station shape. The nine earlier hues are not reused.
   Facts: docs/session-04-global.md, "Facts verified 2026-09-24". */
(function () {
  'use strict';
  const S = (window.SESSION = window.SESSION || {});
  const INK = 'fill:var(--surface);stroke:var(--ink);stroke-width:3';
  const FONT = 'Atkinson Hyperlegible, sans-serif';
  const HALO = ';paint-order:stroke;stroke:var(--surface);stroke-width:5px;stroke-linejoin:round';
  const T = (x, y, text, lines, o) => ({ el: 'text', [o && o.pick ? 'pick' : 'lines']: lines, a: Object.assign({ x, y, 'font-size': 13, 'font-weight': 700, 'font-family': FONT }, (o && o.a) || {}), style: 'fill:var(--ink)', text });
  const sub = (x, y, text, lines, anchor) => ({ el: 'text', lines, a: { x, y, 'font-size': 11.5, 'font-family': FONT, 'text-anchor': anchor || null }, style: 'fill:var(--ink2)' + HALO, text });
  const shape = (d, lines, pick) => Object.assign({ lines: pick ? undefined : lines, pick: pick ? lines : undefined, style: INK }, d);
  const circle = (cx, cy, lines, pick) => shape({ el: 'circle', a: { cx, cy, r: 8 } }, lines, pick);
  const big = (cx, cy, lines, pick) => shape({ el: 'circle', a: { cx, cy, r: 11 } }, lines, pick);
  const square = (cx, cy, lines, pick) => shape({ el: 'rect', a: { x: cx - 8, y: cy - 8, width: 16, height: 16 } }, lines, pick);
  const diamond = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx} ${cy - 10} L${cx + 10} ${cy} L${cx} ${cy + 10} L${cx - 10} ${cy} Z` } }, lines, pick);
  const triangle = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx} ${cy - 10} L${cx + 10} ${cy + 7} L${cx - 10} ${cy + 7} Z` } }, lines, pick);
  const hexa = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx - 5} ${cy - 9} H${cx + 5} L${cx + 10} ${cy} L${cx + 5} ${cy + 9} H${cx - 5} L${cx - 10} ${cy} Z` } }, lines, pick);
  const LABELS = [];
  const box = (x, y, w, hgt, label, dashed, bottom) => {
    LABELS.push({ el: 'text', a: { x: x + 10, y: bottom ? y + hgt - 12 : y + 18, 'font-size': 11, 'font-weight': 800, 'letter-spacing': 1 }, style: 'fill:var(--ink2)' + HALO, text: label });
    return [{ el: 'rect', a: { x, y, width: w, height: hgt, rx: 8 }, style: 'fill:var(--surface);stroke:var(--chip-border);stroke-width:1.5' + (dashed ? ';stroke-dasharray:5 4' : '') }];
  };
  const zoneLabel = (x, y, t, anchor) => ({ el: 'text', a: { x, y, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5, 'text-anchor': anchor || null }, style: 'fill:var(--ink2)', text: t });

  Object.assign(S, {
    meta: { id: '04-global', n: 4, title: 'Global Architecture & Edge', brand: 'Edge Transit Map', home: '../../', updated: '2026-09-24' },

    lines: [
      { id: 'cf', name: 'CloudFront', short: 'CloudFront', cls: 'cf', textVar: 'cf-text', alias: ['CloudFront', 'CDN', 'distribution', 'origin group'],
        verb: 'caches HTTP content at the edge', from: 'viewer → edge location → regional edge cache → origin (S3, ALB, EC2, any HTTP server)',
        built: 'The **content delivery network**. Viewers connect to the nearest edge location; a cache hit is answered there, a miss goes to a bigger **regional edge cache** and only then to your **origin**. It speaks **HTTP/HTTPS** (plus WebSocket and gRPC), caches GET/HEAD responses, carries dynamic requests over the AWS network, and is where you put HTTPS on a custom domain, WAF, geo restriction and signed URLs.',
        says: ['static content worldwide', 'reduce latency for downloads', 'cache', 'reduce load on the origin', 'HTTPS for an S3 website', 'video on demand', 'edge locations'],
        switch: [{ to: 'ga', when: 'the traffic is not HTTP (UDP, MQTT, custom TCP) or static IPs are required' }, { to: 's3web', when: 'users UPLOAD big files into one bucket' }, { to: 'alb', when: 'one Region, route by path or host to target groups' }],
        misses: '**Q4** (exam, 2 Sept): global users downloaded files from S3 slowly; you chose **S3 Transfer Acceleration**. Transfer Acceleration speeds transfers **into** a bucket and caches nothing; downloads to many users are CloudFront’s job.',
        traps: ['S3 Transfer Acceleration for downloads to many users (Q4).', 'Global Accelerator for cacheable web content (prestige distractor).', 'An ACM certificate in the application’s Region: CloudFront only uses certificates from **us-east-1**.', 'Invalidating on every deploy instead of versioned file names.'],
        update: 'Newer than most course material: **VPC origins** (Nov 2024) let CloudFront reach a private ALB, NLB or EC2 instance with no public exposure; **gRPC** (Nov 2024); **anycast static IPs** for allowlisting (Nov 2024); **flat-rate pricing plans** (Nov 2025) that bundle CloudFront, WAF, DDoS protection and Route 53. Origin failover codes now include **429**.' },
      { id: 'ga', name: 'Global Accelerator', short: 'GA', cls: 'ga', textVar: 'ga-text', alias: ['Global Accelerator', 'anycast', 'accelerator', 'traffic dial'],
        verb: 'gives two static anycast IPs a fast lane', from: 'client → 2 static anycast IPs at the nearest edge → AWS backbone → endpoint group (ALB, NLB, EC2, EIP)',
        built: 'The **network-layer front door**. You get **two static anycast IPv4 addresses** (four with dual-stack) announced from every edge location. Clients enter the AWS backbone at the closest one and reach **endpoint groups** in one or more Regions: ALBs, NLBs, EC2 instances, Elastic IPs. It proxies **TCP and UDP**, **caches nothing**, and fails over between Regions without waiting for DNS caches (unhealthy endpoints are out of service in **under a minute**).',
        says: ['static IP addresses', 'allowlist two IPs', 'UDP', 'gaming', 'VoIP', 'IoT / MQTT', 'fast regional failover', 'non-HTTP'],
        switch: [{ to: 'cf', when: 'the content is HTTP and cacheable, or you need WAF/HTTPS at the edge' }, { to: 'r53', when: 'DNS steering is enough and cost matters' }],
        misses: 'You picked Global Accelerator **twice** in the baseline exam where it had no role. The test before choosing it: is the traffic non-HTTP, or are static IPs required, or must failover beat DNS caching? No → cross it out.',
        traps: ['Global Accelerator in front of S3: S3 is not a supported endpoint.', 'Global Accelerator to cache content or terminate HTTPS for a domain: it caches nothing.', 'Global Accelerator where Route 53 latency routing is enough and “most cost-effective” is asked.'],
        update: 'Dual-stack accelerators (2022) give **4** static IPs (2 IPv4 + 2 IPv6). Since Aug 2023 an **NLB with security groups** keeps the client IP behind GA (older material: NLB never does). Cross-account endpoints since Nov 2023.' },
      { id: 'r53', name: 'Route 53', short: 'Route 53', cls: 'ink', width: 4, dash: '12 8', alias: ['Route 53', 'DNS', 'hosted zone', 'alias record', 'routing policy', 'health check'],
        verb: 'answers the name with the right address', from: 'resolver → Route 53 hosted zone → record chosen by a routing policy (+ health check)',
        built: 'The **DNS**. It is never in the data path: it answers “where is example.com?” and the client then connects. **Routing policies** choose the answer (simple, weighted, latency, failover, geolocation, geoproximity, multivalue, IP-based) and **health checks** remove dead answers. **Alias records** point the zone apex at AWS resources for free. Failover speed is bounded by health-check time **plus the TTL** that resolvers cache.',
        says: ['domain name', 'zone apex', 'route users to the nearest Region', 'active-passive failover', 'users in Europe must be served from Europe', 'send 10% of traffic', 'DNS'],
        switch: [{ to: 'ga', when: 'clients cache DNS too long, or failover must be near-instant' }, { to: 'alb', when: 'the routing depends on the URL path (DNS never sees paths)' }],
        misses: '**Q53** (exam, 2 Sept): an S3 static website on a Route 53 domain. The facts: the **bucket name must equal the domain name** and the record is an **alias A record to the S3 website endpoint**.',
        traps: ['A CNAME at the zone apex: impossible; use an alias record.', 'Route 53 routing by URL path: DNS sees names, never paths.', 'Expecting DNS failover faster than the TTL.', 'A public health checker probing a private IP: use a CloudWatch-alarm health check.'],
        update: '**Route 53 Resolver** is now called **Route 53 VPC Resolver**. New since the course: **Route 53 Profiles** (Apr 2024), **Global Resolver** (GA Mar 2026), **Accelerated Recovery** for public zones (Nov 2025), geoproximity records outside Traffic Flow (Jan 2024). **Application Recovery Controller** is now named Amazon ARC.' },
      { id: 'edge', name: 'CloudFront Functions · Lambda@Edge', short: 'Edge code', cls: 'ink', width: 4, dash: '2 7', alias: ['CloudFront Functions', 'Lambda@Edge', 'edge function', 'KeyValueStore'],
        verb: 'runs your code on the request', from: 'viewer request → [CF Function | Lambda@Edge] → cache → [Lambda@Edge origin request] → origin',
        built: 'Code that runs **inside CloudFront**. **CloudFront Functions**: lightweight JavaScript at the edge locations, **viewer request/response only**, sub-millisecond, millions of requests per second, no network or body access — headers, redirects, URL rewrites, cache-key normalisation. **Lambda@Edge**: Node.js or Python, **viewer and origin** triggers, network access and the request body, up to 30 s — authentication calls, origin selection, image resizing. Created in **us-east-1**.',
        says: ['rewrite the URL', 'add a security header', 'redirect by country or device', 'lowest cost at millions of requests', 'call an external service', 'choose the origin', 'modify the response body'],
        switch: [{ to: 'cf', when: 'a cache behaviour (path pattern) or policy already does it without code' }],
        traps: ['Lambda@Edge for a simple header rewrite at huge scale: CloudFront Functions is cheaper and faster.', 'CloudFront Functions to call an API or read the body: it has no network or body access.'],
        update: 'Lambda@Edge quotas now show **30 s** and **50 MB** for every trigger; older material says 5 s / 1 MB for viewer triggers. Banks may still quote the old figures — what matters for the exam is the split: CF Functions = viewer only, tiny, cheap; Lambda@Edge = all four triggers, network, body.' },
      { id: 's3web', name: 'S3 website · Transfer Acceleration', short: 'S3 edge', cls: 'ink', width: 4, dash: '1 9', alias: ['static website', 'website endpoint', 'Transfer Acceleration', 's3-accelerate'],
        verb: 'serves a bucket as a site, or speeds uploads into it', from: 'browser → bucket website endpoint (HTTP) · uploader → edge location → s3-accelerate → bucket',
        built: 'Two S3 features that live at the edge of this topic. **Static website hosting** serves a bucket over a **website endpoint** that is **HTTP only**, public, with index and error documents; for a custom domain the **bucket name must match the domain** and Route 53 uses an **alias record**. **S3 Transfer Acceleration** routes transfers to **one bucket** through the nearest edge location over the AWS network — the answer for **uploads from far away**, not for serving files to many users.',
        says: ['host a static website on S3', 'example.com bucket', 'uploads from around the world', 'long-distance transfers to a bucket', 's3-accelerate'],
        switch: [{ to: 'cf', when: 'HTTPS, caching, private bucket, or downloads to many users' }, { to: 'r53', when: 'the question is the DNS record for the site' }],
        misses: '**Q4**: you used Transfer Acceleration for downloads. **Q53**: the bucket name and alias record for the website.',
        traps: ['A bucket named differently from the domain behind a Route 53 alias.', 'HTTPS on the S3 website endpoint: not supported; put CloudFront (or Amplify Hosting) in front.', 'Transfer Acceleration to serve downloads to a worldwide audience (Q4).'],
        update: 'S3’s docs now list **Amplify Hosting** as the recommended way to add HTTPS to an S3-hosted site, with CloudFront as the alternative. Banks answer CloudFront, which is still correct. Transfer Acceleration is still available.' },
      { id: 'alb', name: 'ALB listener rules', short: 'ALB', cls: 'ink', width: 4, alias: ['Application Load Balancer', 'ALB', 'path-based', 'host-based', 'listener rule'],
        verb: 'routes requests by path and host inside a Region', from: 'listener → rules (path, host, header, method, query, source IP) → target groups',
        built: 'The **regional layer-7 router**. One ALB, many **listener rules**: `/api/*` to one target group, `/img/*` to another, `shop.example.com` to a third. It load-balances inside **one Region** and has **no static IP** (put an NLB or Global Accelerator in front for that). It appears here because the exam mixes it with CloudFront behaviours and Route 53.',
        says: ['path-based routing', 'host-based routing', 'route /orders and /users to different services', 'microservices behind one endpoint', 'containers behind one load balancer'],
        switch: [{ to: 'cf', when: 'the routing must happen at the edge, worldwide, with caching' }, { to: 'ga', when: 'the ALB needs static IPs' }],
        misses: '**Q43** (exam, 2 Sept): “path-based / host-based routing” was the keyword and the answer was an **ALB**; you missed the keyword.',
        traps: ['Route 53 for path-based routing (DNS never sees the path).', 'NLB for path routing (layer 4: no paths, no hosts).', 'Expecting a static IP on an ALB.'] },
      { id: 'protect', name: 'Edge security: OAC · signed URLs · WAF', short: 'Protect', cls: 'ink', width: 4, dash: '10 6', alias: ['Origin Access Control', 'OAC', 'OAI', 'signed URL', 'signed cookie', 'geo restriction', 'WAF', 'field-level encryption'],
        verb: 'decides who may reach the content', from: 'viewer → [WAF · geo restriction · signed URL/cookie] → CloudFront → [OAC] → origin',
        built: 'Two gates. **In front of CloudFront**: AWS WAF web ACLs, **geographic restriction** (country allowlist or blocklist), **signed URLs** (one file) or **signed cookies** (many files, URLs unchanged), field-level encryption for sensitive form fields; Shield Standard is always on. **Behind CloudFront**: **Origin Access Control** makes the S3 bucket reachable **only through the distribution** (OAI is the legacy version); for an ALB, a secret header or the CloudFront prefix list, or a **VPC origin**.',
        says: ['only through CloudFront', 'private S3 bucket', 'paid subscribers', 'block these countries', 'protect sensitive form fields', 'without changing the URLs'],
        switch: [{ to: 'cf', when: 'the question is about caching or delivery, not access' }],
        traps: ['OAI where the bucket uses SSE-KMS or a newer Region: OAI does not support them; OAC does.', 'Signed URLs for a subscriber area with hundreds of files: signed cookies.', 'Geo restriction by Route 53 geolocation: DNS steers, it does not block.'],
        update: 'AWS calls OAI **legacy** and recommends **OAC** (2022): all Regions, SSE-KMS, PUT/POST/DELETE. Trusted **key groups** replace root-account CloudFront key pairs for signing.' }
    ],
    topics: { multi: 'Multi-Region patterns' },

    map: {
      title: 'The edge map', lead: 'Users on three continents at the top, the AWS edge in the middle, two Regions below. Tap a line or a station.',
      viewBox: '0 0 1000 820', defaultLine: 'cf',
      caption: 'Two hues carry the pair you confuse most: CloudFront wine, Global Accelerator indigo. Ink lines are told apart by their dash (Route 53 long dashes, edge code short dashes, S3 dots, edge security dashes, ALB solid) and station shapes. Route 53 is dashed because it is never in the data path: it only answers the name. Every line is labelled; colour is never the only cue.',
      items: [
        /* zones */
        { el: 'rect', a: { x: 0, y: 0, width: 1000, height: 112 }, style: 'fill:var(--muted-fill)' },
        { el: 'rect', a: { x: 0, y: 120, width: 1000, height: 252 }, style: 'fill:var(--zone-onprem)' },
        { el: 'rect', a: { x: 0, y: 380, width: 1000, height: 440 }, style: 'fill:var(--zone-aws)' },
        zoneLabel(18, 22, 'INTERNET · USERS WORLDWIDE'),
        zoneLabel(982, 144, 'AWS EDGE', 'end'),
        { el: 'text', a: { x: 982, y: 162, 'font-size': 11, 'text-anchor': 'end', 'font-family': FONT }, style: 'fill:var(--ink2)', text: 'POPs + regional caches' },
        zoneLabel(982, 400, 'AWS REGIONS', 'end'),

        ...box(20, 440, 220, 190, 'GLOBAL DNS', true),
        ...box(270, 430, 340, 368, 'REGION A · us-east-1', false, true),
        ...box(640, 430, 350, 368, 'REGION B · eu-west-1', false, true),

        /* ---- lines ---- */
        { el: 'line', line: 'r53', paths: ['M130 74 V500', 'M130 500 V560 H372', 'M130 500 V810 H830 V568'], labels: [{ x: 142, y: 330, t: 'ROUTE 53', size: 11 }, { x: 142, y: 346, t: 'DNS ONLY', size: 10, ls: .5 }] },
        { el: 'line', line: 's3web', paths: ['M130 74 H250 V752 H532'], labels: [{ x: 262, y: 178, t: 'S3 · TRANSFER ACCEL.', size: 10.5 }] },
        { el: 'line', line: 'protect', paths: ['M340 230 H462'], labels: [{ x: 300, y: 206, t: 'PROTECT', size: 11 }] },
        { el: 'line', line: 'edge', paths: ['M478 230 H620', 'M478 320 H620'], labels: [{ x: 632, y: 280, t: 'EDGE CODE', size: 11 }] },
        { el: 'line', line: 'cf', paths: ['M470 74 V320', 'M470 320 V394 H540 V552', 'M470 394 H380 V552', 'M540 568 V604 H720 V632'], labels: [{ x: 482, y: 128, t: 'CLOUDFRONT · CACHE', size: 12 }, { x: 612, y: 598, t: 'ORIGIN FAILOVER', size: 10, ls: .5 }] },
        { el: 'line', line: 'ga', paths: ['M830 74 V552', 'M830 418 H300 V602'], labels: [{ x: 818, y: 128, t: 'GLOBAL ACCELERATOR', size: 12, anchor: 'end' }, { x: 818, y: 410, t: 'BACKBONE · NO CACHE', size: 10, ls: .5, anchor: 'end' }] },
        { el: 'line', line: 'alb', paths: ['M380 568 V670 H330 V700', 'M380 670 H430 V700'], labels: [{ x: 440, y: 648, t: 'ALB · PATH / HOST RULES', size: 10 }] },

        /* ---- stations ---- */
        /* users */
        big(130, 74, ['r53'], true), T(130, 50, 'Users · Europe', ['r53', 's3web'], { a: { 'text-anchor': 'middle' }, pick: true }),
        big(470, 74, ['cf'], true), T(470, 50, 'Users · Americas', ['cf'], { a: { 'text-anchor': 'middle' }, pick: true }),
        big(830, 74, ['ga'], true), T(830, 50, 'Users · Asia-Pacific', ['ga'], { a: { 'text-anchor': 'middle' }, pick: true }),
        /* edge */
        diamond(340, 230, ['protect'], true), sub(340, 256, 'WAF · Shield Std', ['protect'], 'middle'), sub(340, 271, 'geo restriction', ['protect'], 'middle'),
        square(250, 250, ['s3web'], true), sub(238, 250, 'S3 Transfer', ['s3web'], 'end'), sub(238, 265, 'Acceleration', ['s3web'], 'end'),
        circle(470, 230, ['cf'], true), sub(484, 252, 'edge location (POP)', ['cf']),
        circle(470, 320, ['cf'], true), sub(484, 342, 'regional edge cache', ['cf']),
        triangle(620, 230, ['edge'], true), sub(634, 234, 'CloudFront Functions', ['edge']),
        triangle(620, 320, ['edge'], true), sub(634, 324, 'Lambda@Edge', ['edge']),
        circle(830, 230, ['ga'], true), sub(844, 234, '2 static anycast IPs', ['ga']),
        /* Route 53 */
        diamond(130, 500, ['r53'], true), sub(144, 504, 'hosted zone', ['r53']), sub(144, 540, 'routing policies', ['r53']), sub(144, 600, 'health checks', ['r53']),
        /* Region A */
        diamond(540, 500, ['protect'], true), sub(554, 504, 'OAC', ['protect']),
        hexa(380, 560, ['alb'], true), sub(392, 590, 'ALB', ['alb', 'cf', 'r53']),
        square(540, 560, ['cf'], true), sub(540, 588, 'S3 origin', ['cf'], 'middle'),
        hexa(300, 610, ['ga'], true), sub(312, 630, 'NLB', ['ga']),
        circle(330, 700, ['alb'], true), sub(330, 724, '/api/*', ['alb'], 'middle'),
        circle(430, 700, ['alb'], true), sub(430, 724, '/img/*', ['alb'], 'middle'),
        square(540, 752, ['s3web'], true), sub(540, 776, 'bucket “example.com”', ['s3web'], 'middle'), sub(540, 791, 'website endpoint · HTTP', ['s3web'], 'middle'),
        /* Region B */
        square(720, 640, ['cf'], true), sub(720, 664, 'S3 replica', ['cf'], 'middle'),
        hexa(830, 560, ['ga'], true), sub(846, 590, 'ALB (endpoint)', ['ga', 'r53']),
        ...LABELS
      ]
    },

    stub: [
      { id: 'what', label: 'WHAT', short: 'WHAT', values: ['static content', 'dynamic HTTP', 'non-HTTP TCP/UDP', 'DNS name', 'uploads to S3'] },
      { id: 'scope', label: 'SCOPE', short: 'SCOPE', values: ['one Region', 'multi-Region active-passive', 'multi-Region active-active', 'global users'] },
      { id: 'need', label: 'NEED', short: 'NEED', values: ['cache', 'faster transfer', 'static IP', 'DNS steering', 'failover', 'restrict access', 'edge logic', 'path routing'] },
      { id: 'sup', label: 'SUPERLATIVE', short: 'SUP', values: ['cheapest', 'least ops', 'lowest latency', 'fastest failover', 'most secure', 'none stated'] }
    ],

    method:
`1. Strip the story. Keep WHAT travels (static files, API calls, UDP packets, a DNS name,
   uploads) and WHERE the users are.
2. Fill the stub, the same 4 slots for this session:
   WHAT (static content / dynamic HTTP / non-HTTP TCP-UDP / DNS name / uploads to S3) ____
   SCOPE (one Region / multi-Region active-passive / active-active / global users) ____
   NEED (cache / faster transfer / static IP / DNS steering / failover / restrict access / edge logic / path routing) ____
   SUPERLATIVE ____
3. For EACH option ask: "what problem was this service BUILT for?"
   No match with the stub -> cross it out, however senior it sounds
   (Global Accelerator for cacheable files, Global Accelerator in front of S3,
   Transfer Acceleration for downloads, Route 53 for URL paths).
4. Among the survivors, the one that satisfies the SUPERLATIVE wins.`,

    cheat:
`EDGE = WHAT travels? + WHERE are users? + what do you NEED? + SUPERLATIVE
CLOUDFRONT  HTTP(S) CDN · edge location -> regional edge cache -> origin (S3, ALB, EC2, any HTTP)
            cache GET/HEAD · default TTL 86,400 s · behaviours by path (* = default)
            deploy often -> versioned names; invalidation: 1,000 paths/month free, * = 1 path
            HTTPS custom domain -> ACM cert in us-east-1 · SNI free (dedicated IP $600/mo)
            origin group: 2 origins, fail over on 5xx/4xx codes you pick, GET/HEAD/OPTIONS only
PROTECT     bucket only via CloudFront -> OAC (OAI = legacy; no SSE-KMS)
            one file -> signed URL · many files / keep URLs -> signed cookies (key groups)
            countries -> geo restriction · rules/bots -> WAF (us-east-1) · Shield Std free
EDGE CODE   headers/redirect/rewrite, huge scale -> CloudFront Functions (viewer only, JS)
            network call / body / origin choice -> Lambda@Edge (4 triggers, us-east-1)
GLOBAL ACC  2 static anycast IPs (4 dual-stack) · TCP/UDP · backbone · NO cache
            endpoints ALB NLB EC2 EIP (not S3) · traffic dial per Region · weights 0-255
            failover < 1 min, no DNS caching · custom routing -> specific EC2 + port
ROUTE 53    apex -> ALIAS (free for AWS targets) · CNAME never at apex
            simple · weighted (canary) · latency (nearest Region) · failover (active-passive)
            geolocation (law/language, add Default) · geoproximity (bias -99..+99)
            multivalue (up to 8 healthy) · IP-based (CIDR collections)
            DNS failover ~ interval x threshold + TTL · private target -> CloudWatch alarm check
S3 SITE     bucket name = domain · alias A -> website endpoint · HTTP only -> CloudFront for HTTPS
S3 TA       UPLOADS from far away into one bucket (s3-accelerate) · downloads -> CloudFront
ALB         path / host / header rules, one Region, no static IP -> NLB or GA in front
NEVER: GA for cacheable HTTP · GA in front of S3 · TA for downloads · CNAME at apex ·
       Route 53 by URL path · cert outside us-east-1 for CloudFront · OAI with SSE-KMS`,

    compare: [
      { id: 'cf-ga', short: 'CloudFront · GA', title: 'CloudFront vs Global Accelerator — a cache vs a fast lane',
        sides: [{ name: 'CloudFront', line: 'cf', fig: { dir: 'one', left: 'USERS', right: 'ORIGIN', cache: true, cacheLabel: 'CACHE' }, gist: '**HTTP(S) CDN**: caches at the edge, terminates TLS for your domain, WAF, signed URLs, edge code.' }, { name: 'Global Accelerator', line: 'ga', fig: { dir: 'both', left: 'USERS', right: 'ALB NLB' }, gist: '**2 static anycast IPs** into the AWS backbone; proxies **TCP/UDP**; caches nothing; fast Regional failover.' }],
        rows: [['Layer', 'HTTP / HTTPS (WebSocket, gRPC)', 'TCP and UDP'], ['Caching', 'yes: the point of it', 'none'], ['IP addresses', 'many, changing (anycast static IPs are an extra option)', '2 static anycast IPv4 (4 dual-stack)'], ['Origins / endpoints', 'S3, ALB, EC2, any HTTP server, VPC origins', 'ALB, NLB, EC2, Elastic IP (not S3)'], ['Deciding words', 'static content, video, cache, HTTPS for a site, WAF', 'UDP, gaming, VoIP, allowlist fixed IPs, failover without DNS'], ['Tempting wrong', 'for a UDP game', 'for “deliver images and videos worldwide” (your prestige pick)']],
        check: { q: '“A multiplayer game uses UDP. Players worldwide need low latency, two fixed IP addresses and fast failover between two Regions.”', opts: ['CloudFront', 'Global Accelerator'], a: 1, why: 'UDP rules out CloudFront, which is HTTP only. Static anycast IPs and failover without DNS are what GA was built for.' } },
      { id: 'cf-ta', short: 'CloudFront · S3 TA', title: 'CloudFront vs S3 Transfer Acceleration — out to many vs in to one',
        sides: [{ name: 'CloudFront', line: 'cf', fig: { dir: 'one', left: 'S3', right: 'USERS', cache: true, cacheLabel: 'EDGE' }, gist: 'Serves objects **out** to many viewers and **caches** them at the edge.' }, { name: 'S3 Transfer Acceleration', line: 's3web', fig: { dir: 'one', left: 'UPLOADER', right: 'BUCKET' }, gist: 'Speeds transfers **into** (or out of) **one bucket** over long distances through an edge location. Caches nothing.' }],
        rows: [['Direction that matters', 'downloads to many users', 'uploads from far-away clients'], ['Cache', 'yes', 'no'], ['Endpoint', 'your domain or dxxxx.cloudfront.net', '`bucket.s3-accelerate.amazonaws.com`'], ['Deciding words', 'users worldwide download / stream / view', 'upload large files to a central bucket from other continents'], ['Your miss', '—', '**Q4**: chosen for downloads']],
        check: { q: '“Customers on five continents download 2 GB installers from one S3 bucket. Downloads are slow.”', opts: ['CloudFront', 'S3 Transfer Acceleration'], a: 0, why: 'Many users downloading the same objects: cache them at the edge. Transfer Acceleration speeds each transfer but caches nothing — your Q4 miss.' } },
      { id: 'access', short: 'OAC · signed URL · cookie', title: 'Who may reach it: OAC vs signed URL vs signed cookie',
        sides: [{ name: 'OAC', line: 'protect', fig: { dir: 'one', left: 'CF', right: 'S3', keep: true }, gist: 'Protects the **origin**: the bucket accepts only requests signed by your distribution. **OAI is the legacy version.**' }, { name: 'Signed URL', line: 'protect', fig: { dir: 'one', left: 'VIEWER', right: 'CF' }, gist: 'Protects **one file**: the URL carries the policy and signature (expiry, optional IP range).' }, { name: 'Signed cookie', line: 'protect', fig: { dir: 'one', left: 'VIEWER', right: 'CF', keep: true }, gist: 'Protects **many files** without changing their URLs (a subscriber area, HLS video segments).' }],
        rows: [['Protects', 'the S3 bucket from direct access', 'one object per URL', 'every object the cookie’s policy covers'], ['Legacy look-alike', 'OAI: no SSE-KMS, no PUT/POST, not in newer Regions', 'CloudFront key pair via root user → use trusted key groups', 'same key groups'], ['Deciding words', 'only through CloudFront, private bucket', 'one download link, client without cookies', 'paid members, many files, keep URLs']],
        check: { q: '“Paying members may view hundreds of training videos. The site’s URLs must not change.”', opts: ['OAC', 'Signed URL', 'Signed cookie'], a: 2, why: 'Many files and unchanged URLs: signed cookies. OAC protects the bucket, not individual viewers.' } },
      { id: 'edgefn', short: 'CF Functions · L@E', title: 'CloudFront Functions vs Lambda@Edge',
        sides: [{ name: 'CloudFront Functions', line: 'edge', fig: { dir: 'one', left: 'VIEWER', right: 'EDGE', keep: true }, gist: 'Tiny JavaScript at **edge locations**, **viewer request/response only**, sub-millisecond, millions of RPS, cheapest.' }, { name: 'Lambda@Edge', line: 'edge', fig: { dir: 'one', left: 'EDGE', right: 'ORIGIN' }, gist: 'Node.js / Python, **viewer and origin** triggers, network and body access, seconds of run time.' }],
        rows: [['Triggers', 'viewer request, viewer response', 'viewer request/response + origin request/response'], ['Runtime', 'JavaScript (cloudfront-js)', 'Node.js, Python'], ['Network / body access', 'no / no', 'yes / yes'], ['Scale and limits', 'millions of RPS · 2 MB memory · 10 KB code', 'up to 10,000 RPS per Region · up to 30 s · created in us-east-1'], ['Deciding words', 'header, redirect, rewrite, normalise cache key, lowest cost', 'call an auth service, pick the origin, resize images, read the body']],
        check: { q: '“Add security headers to every response and redirect old URLs, at tens of millions of requests per day, at the lowest cost.”', opts: ['CloudFront Functions', 'Lambda@Edge'], a: 0, why: 'Header and URL work on viewer events with no network access: CloudFront Functions, far cheaper at that volume.' } },
      { id: 'r53-geo', short: 'Latency · Geo · Geoprox', title: 'Latency vs geolocation vs geoproximity routing',
        sides: [{ name: 'Latency', line: 'r53', fig: { dir: 'one', left: 'USER', right: 'FASTEST' }, gist: 'Answers with the Region that has the **lowest measured latency** from the user’s network.' }, { name: 'Geolocation', line: 'r53', fig: { dir: 'one', left: 'COUNTRY', right: 'RECORD', keep: true }, gist: 'Answers by **where the user is**: continent, country, US state. Add a **Default** record.' }, { name: 'Geoproximity', line: 'r53', fig: { dir: 'one', left: 'USER', right: 'NEAREST' }, gist: 'Answers by **distance to your resources**, with a **bias** (−99 to +99) that grows or shrinks a Region’s area.' }],
        rows: [['Decides by', 'network latency', 'the user’s location', 'distance × (1 − bias/100)'], ['Deciding words', 'best performance, lowest latency', 'law, language, licensing, “must be served from”', 'shift more traffic to one Region, bias'], ['Tempting wrong', 'for “EU data must stay in the EU”', 'for “fastest response”', 'for anything without “bias” or “shift”']],
        check: { q: '“Users in Germany must always be served by the Frankfurt deployment for legal reasons.”', opts: ['Latency', 'Geolocation', 'Geoproximity'], a: 1, why: 'A rule tied to the user’s country is geolocation. Latency could send a German user elsewhere on a bad day.' } },
      { id: 'alias', short: 'Alias · CNAME', title: 'Alias record vs CNAME',
        sides: [{ name: 'Alias record', line: 'r53', fig: { dir: 'one', left: 'APEX', right: 'AWS', keep: true }, gist: 'A Route 53 extension: an **A/AAAA record** that points at an AWS resource. **Works at the zone apex**; queries to AWS targets are **free**.' }, { name: 'CNAME', line: 'r53', fig: { dir: 'one', left: 'NAME', right: 'NAME' }, gist: 'Standard DNS: one name points to another name. **Never at the zone apex.** Queries are charged.' }],
        rows: [['Zone apex (example.com)', 'yes', 'no'], ['Targets', 'CloudFront, ELB, S3 website, API Gateway, GA, VPC endpoint, Beanstalk, App Runner, AppSync, another record in the zone', 'any DNS name'], ['TTL', 'taken from the target', 'you set it'], ['Deciding words', 'apex, ALB/CloudFront/S3 website, no query charge', 'www to a non-AWS host, any DNS provider']],
        check: { q: '“Point example.com (no www) at an Application Load Balancer.”', opts: ['Alias record', 'CNAME'], a: 0, why: 'The zone apex cannot hold a CNAME. An alias A record to the ALB works and its queries are free.' } },
      { id: 'failover', short: 'R53 · GA · CF failover', title: 'Route 53 failover vs Global Accelerator vs CloudFront origin failover',
        sides: [{ name: 'Route 53 failover', line: 'r53', fig: { dir: 'one', left: 'DNS', right: 'STANDBY' }, gist: 'Health check fails → DNS answers the secondary. Clients switch **after their cached TTL expires**.' }, { name: 'Global Accelerator', line: 'ga', fig: { dir: 'both', left: 'SAME IPs', right: 'REGION' }, gist: 'Same static IPs; unhealthy endpoint out of service in **under a minute**; new connections go to the next Region.' }, { name: 'CloudFront origin group', line: 'cf', fig: { dir: 'one', left: 'EDGE', right: 'BACKUP', cache: true, cacheLabel: 'CF' }, gist: 'Per request: primary returns a chosen error or times out → CloudFront retries the **secondary origin**. GET/HEAD/OPTIONS only.' }],
        rows: [['Bounded by', 'health-check interval × threshold + TTL', 'endpoint health checks', 'origin timeout × attempts (default 3 × 10 s)'], ['Works for', 'anything with a DNS name', 'TCP/UDP to ALB, NLB, EC2, EIP', 'cacheable HTTP reads'], ['Deciding words', 'active-passive, DNS, cheapest, standby Region', 'fast failover, static IPs, clients cache DNS', 'S3 replica as backup origin, keep serving reads']],
        check: { q: '“IoT devices cache DNS for hours. Traffic must move to a second Region within a minute when the first fails.”', opts: ['Route 53 failover', 'Global Accelerator', 'CloudFront origin group'], a: 1, why: 'DNS failover waits for caches the devices ignore. GA keeps the same IPs and moves new connections itself.' } },
      { id: 'alb-cf', short: 'ALB rules · CF behaviours', title: 'ALB path routing vs CloudFront cache behaviours',
        sides: [{ name: 'ALB listener rules', line: 'alb', fig: { dir: 'one', left: 'LISTENER', right: 'TARGETS', keep: true }, gist: '**Inside one Region**: path, host, header, method, query-string, source-IP rules → **target groups**.' }, { name: 'CloudFront behaviours', line: 'cf', fig: { dir: 'one', left: 'EDGE', right: 'ORIGINS', cache: true, cacheLabel: 'PATH' }, gist: '**At the edge**: a path pattern (`/api/*`, `*.jpg`) picks the **origin** and its cache settings.' }],
        rows: [['Routes to', 'target groups (instances, IPs, Lambda, containers)', 'origins (S3, ALB, custom), each with its own TTLs'], ['Match on', 'path, host, headers, method, query string, source IP', 'path pattern only (first match in list order; `*` last)'], ['Scope', 'one Region', 'global'], ['Deciding words', 'microservices, /orders and /users, host-based, containers', 'static from S3, API to ALB, one domain worldwide, cache'], ['Your miss', '**Q43**: the keyword was “path-based routing”', '—']],
        check: { q: '“One Region. Requests to /orders go to the order service and /users to the user service, both on ECS.”', opts: ['ALB listener rules', 'CloudFront behaviours'], a: 0, why: 'Path-based routing to target groups in one Region is the ALB’s job. CloudFront picks origins, not target groups.' } }
    ],

    traps: [
      { title: 'Transfer Acceleration for downloads', x: 'It speeds long-distance transfers to one bucket and caches nothing. Many users downloading the same files → CloudFront. (Your Q4.)', drills: ['Q4', 'G24'] },
      { title: 'Website bucket not named after the domain', x: 'A Route 53 alias to an S3 website endpoint only works when the bucket is named exactly like the record (example.com, www.example.com). (Your Q53.)', drills: ['Q53'] },
      { title: 'Route 53 or NLB for path-based routing', x: 'DNS never sees the URL path and an NLB is layer 4. “Path-based” or “host-based” → ALB listener rules. (Your Q43.)', drills: ['Q43'] },
      { title: 'Global Accelerator for cacheable web content', x: 'Prestige distractor. GA caches nothing; images, video and downloads worldwide → CloudFront.', drills: ['G1', 'G5'] },
      { title: 'Global Accelerator in front of S3', x: 'S3 is not a GA endpoint (ALB, NLB, EC2, Elastic IP only). S3 delivery → CloudFront; S3 uploads → Transfer Acceleration.', drills: ['Q4', 'G24'] },
      { title: 'Global Accelerator for HTTPS on a domain or for WAF', x: 'GA is TCP/UDP pass-through. Certificates for a custom domain, WAF, geo restriction and signed URLs live on CloudFront.', drills: ['G2', 'G4'] },
      { title: 'Global Accelerator where Route 53 latency routing is enough', x: 'For an HTTP app with no static-IP need and “most cost-effective”, latency records beat GA’s hourly fee plus premium data transfer.', drills: ['G3'] },
      { title: 'ACM certificate in the app’s Region for CloudFront', x: 'CloudFront uses certificates from us-east-1 only. Request or import it there.', drills: ['G21'] },
      { title: 'CNAME at the zone apex', x: 'Impossible in DNS. Use an alias A/AAAA record (free queries to AWS targets).', drills: ['G10', 'Q53'] },
      { title: 'DNS failover faster than the TTL', x: 'Resolvers keep the old answer until the TTL expires; failover ≈ interval × threshold + TTL. Faster, cache-proof → Global Accelerator.', drills: ['G8', 'G12'] },
      { title: 'Public health check on a private resource', x: 'Route 53 health checkers are on the internet. For a private IP, alarm on a CloudWatch metric and use a CloudWatch-alarm health check.', drills: ['G16'] },
      { title: 'OAI for an SSE-KMS bucket', x: 'OAI is legacy and cannot use SSE-KMS or write methods. Use Origin Access Control.', drills: ['G19'] },
      { title: 'Signed URLs for a whole members’ area', x: 'One URL per file, and every URL changes. Many files with unchanged URLs → signed cookies.', drills: ['G20'] },
      { title: 'Invalidating on every deploy', x: 'Invalidations take time and cost beyond 1,000 paths a month. Frequent releases → versioned file names (app.v42.js).', drills: ['G6'] },
      { title: 'Latency routing for a legal location rule', x: 'Latency can send a user to another Region. “Must be served from” a country or continent → geolocation (with a Default record).', drills: ['G13'] },
      { title: 'Lambda@Edge for a header rewrite at huge scale', x: 'Viewer-only, no network call → CloudFront Functions: cheaper, sub-millisecond, millions of RPS.', drills: ['G22'] }
    ],

    log: [
      { when: '2 Sept 2026', what: 'Baseline practice exam, edge and global misses', result: 'Q4, Q53, Q43 wrong', lesson: 'Q4: Transfer Acceleration chosen for downloads (confused with CloudFront). Q53: S3 website + Route 53 facts missing (bucket name = domain, alias to the website endpoint). Q43: missed the keyword “path/host-based routing” → ALB. Plus the prestige habit: Global Accelerator picked twice where it had no role.' },
      { when: '—', what: 'Session 4 drill', result: 'not taken yet', lesson: 'Run all 30 scenarios once. Misses are tagged in “Where it broke” and show up in Progress.' }
    ]
  });
})();
