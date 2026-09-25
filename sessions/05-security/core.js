/* Session 5 — Security services & identity: meta, lines, security map, stub, method, cheat sheet, compare, traps, log.
   Colour rule: a service keeps its colour on every page. The eleven earlier hues are not reused and no new hue
   is added (docs/session-05-security.md, "Colour rule": the palette has no free hue left that separates under
   colour-blind simulation). Every Session 5 family is an ink line (4 px) with its own dash pattern and station
   shape, and every line is labelled. Facts: docs/session-05-security.md, "Facts verified 2026-09-25". */
(function () {
  'use strict';
  const S = (window.SESSION = window.SESSION || {});
  const INK = 'fill:var(--surface);stroke:var(--ink);stroke-width:3';
  const FONT = 'Atkinson Hyperlegible, sans-serif';
  const HALO = ';paint-order:stroke;stroke:var(--surface);stroke-width:5px;stroke-linejoin:round';
  const T = (x, y, text, lines, o) => ({ el: 'text', [o && o.pick ? 'pick' : 'lines']: lines, a: Object.assign({ x, y, 'font-size': 13, 'font-weight': 700, 'font-family': FONT }, (o && o.a) || {}), style: 'fill:var(--ink)' + ((o && o.halo) || ''), text });
  const sub = (x, y, text, lines, anchor, halo) => ({ el: 'text', lines, a: { x, y, 'font-size': 11.5, 'font-family': FONT, 'text-anchor': anchor || null }, style: 'fill:var(--ink2)' + (halo || HALO), text });
  const shape = (d, lines, pick) => Object.assign({ lines: pick ? undefined : lines, pick: pick ? lines : undefined, style: INK }, d);
  const circle = (cx, cy, lines, pick) => shape({ el: 'circle', a: { cx, cy, r: 8 } }, lines, pick);
  const big = (cx, cy, lines, pick) => shape({ el: 'circle', a: { cx, cy, r: 11 } }, lines, pick);
  const ring = (cx, cy, lines) => [shape({ el: 'circle', a: { cx, cy, r: 10 } }, lines, true), { el: 'circle', pick: lines, a: { cx, cy, r: 3.5 }, style: 'fill:var(--ink)' }];
  const square = (cx, cy, lines, pick) => shape({ el: 'rect', a: { x: cx - 8, y: cy - 8, width: 16, height: 16 } }, lines, pick);
  const bar = (cx, cy, lines, pick) => shape({ el: 'rect', a: { x: cx - 14, y: cy - 7, width: 28, height: 14, rx: 4 } }, lines, pick);
  const diamond = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx} ${cy - 10} L${cx + 10} ${cy} L${cx} ${cy + 10} L${cx - 10} ${cy} Z` } }, lines, pick);
  const triangle = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx} ${cy - 10} L${cx + 10} ${cy + 7} L${cx - 10} ${cy + 7} Z` } }, lines, pick);
  const vtri = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx - 10} ${cy - 7} L${cx + 10} ${cy - 7} L${cx} ${cy + 10} Z` } }, lines, pick);
  const hexa = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx - 5} ${cy - 9} H${cx + 5} L${cx + 10} ${cy} L${cx + 5} ${cy + 9} H${cx - 5} L${cx - 10} ${cy} Z` } }, lines, pick);
  const penta = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx} ${cy - 10} L${cx + 10} ${cy - 2} L${cx + 6} ${cy + 9} L${cx - 6} ${cy + 9} L${cx - 10} ${cy - 2} Z` } }, lines, pick);
  const LABELS = [];
  const box = (x, y, w, hgt, label, dashed) => {
    LABELS.push({ el: 'text', a: { x: x + 10, y: y + hgt - 12, 'font-size': 11, 'font-weight': 800, 'letter-spacing': 1 }, style: 'fill:var(--ink2)' + HALO, text: label });
    return [{ el: 'rect', a: { x, y, width: w, height: hgt, rx: 8 }, style: 'fill:var(--surface);stroke:var(--chip-border);stroke-width:1.5' + (dashed ? ';stroke-dasharray:5 4' : '') }];
  };
  const zoneLabel = (x, y, t, anchor) => ({ el: 'text', a: { x, y, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5, 'text-anchor': anchor || null }, style: 'fill:var(--ink2)', text: t });

  Object.assign(S, {
    meta: { id: '05-security', n: 5, title: 'Security Services & Identity', brand: 'Security Transit Map', home: '../../', updated: '2026-09-25' },

    lines: [
      { id: 'kms', name: 'KMS · CloudHSM', short: 'KMS', cls: 'ink', width: 4, alias: ['KMS', 'Key Management Service', 'customer managed key', 'CloudHSM', 'envelope encryption', 'data key', 'multi-Region key', 'key policy'],
        verb: 'encrypts with keys you control', from: 'service or app → KMS key (never leaves the HSM) → data key → your data (S3, EBS, RDS, anything)',
        built: 'The **key service**. A KMS key lives inside FIPS 140-3 Level 3 HSMs and never leaves them unencrypted; services ask KMS to generate and decrypt **data keys**, which encrypt the actual data (**envelope encryption**). Access needs the **key policy**, every call is logged in CloudTrail, and keys are **regional**. **CloudHSM** is the other end: **single-tenant** HSMs in your VPC where you alone manage users and keys.',
        says: ['encryption at rest', 'audit who used the key', 'control key rotation', 'customer managed key', 'single-tenant HSM', 'FIPS 140-3 Level 3', 'encrypt data larger than 4 KB', 'decrypt in another Region'],
        switch: [{ to: 'secrets', when: 'the thing to protect is a password or API key that must be stored and rotated' }, { to: 'acm', when: 'the data is in transit and the need is a TLS certificate' }],
        misses: 'This line carries the most D1 facts. The trap next door is **ACM**: certificates protect data **in transit**; they never encrypt data at rest. You picked ACM once in the baseline where it had no job.',
        traps: ['ACM to encrypt S3 or EBS data (certificates are for TLS in transit).', 'Sharing a snapshot encrypted with the AWS managed key (aws/ebs, aws/rds): not possible; use a customer managed key.', 'Calling Encrypt for a 5 GB file: the plaintext limit is 4 KB; use a data key.', 'CloudHSM when “AWS-managed, least ops, audit in CloudTrail” is enough: that is KMS.'],
        update: 'Automatic rotation is now **configurable, 90–2,560 days** (default 365), and **on-demand rotation** exists (both April 2024); since June 2025 on-demand rotation also works for imported key material. AWS managed keys rotate **every year** (was every three years until 2022) and are a **legacy key type** no longer created for new services. KMS HSMs are **FIPS 140-3 Level 3**. Request quotas are now 10,000 / 20,000 / 100,000 per second depending on the Region.' },
      { id: 'secrets', name: 'Secrets Manager · Parameter Store', short: 'Secrets', cls: 'ink', width: 4, dash: '2 7', alias: ['Secrets Manager', 'Parameter Store', 'SecureString', 'secret', 'rotation'],
        verb: 'stores secrets and config, rotates passwords', from: 'app at run time → GetSecretValue / GetParameter → value decrypted with KMS',
        built: 'Two stores for values your code reads at run time. **Secrets Manager** is built for **credentials that rotate**: managed rotation for RDS, Aurora, DocumentDB and Redshift (a Lambda function for anything else), **cross-Region replication**, $0.40 per secret per month. **SSM Parameter Store** is built for **configuration**: plain strings and **SecureString** values encrypted with KMS, free in the standard tier, **no built-in rotation**.',
        says: ['rotate database credentials automatically', 'store an API key', 'configuration values', 'feature flags', 'hard-coded password in the code', 'replicate the secret to another Region', 'cheapest place for config'],
        switch: [{ to: 'kms', when: 'the need is to encrypt data, not to store a value' }, { to: 'acm', when: 'the “secret” is a TLS certificate and its private key' }],
        traps: ['Parameter Store for a password that must rotate automatically: no built-in rotation.', 'Secrets Manager for hundreds of plain config values “at the lowest cost”: Parameter Store standard is free.', 'Environment variables or user data for credentials.'],
        update: 'Managed rotation (no Lambda to maintain) now covers RDS, Aurora, DocumentDB and Redshift, and RDS/Aurora can manage the master password in Secrets Manager for you (`ManageMasterUserPassword`). The shortest rotation schedule is **every 4 hours**.' },
      { id: 'acm', name: 'ACM · Private CA', short: 'ACM', cls: 'ink', width: 4, dash: '1 9', alias: ['ACM', 'Certificate Manager', 'certificate', 'Private CA', 'TLS certificate', 'HTTPS'],
        verb: 'issues and renews TLS certificates', from: 'ACM certificate → attached to ALB, CloudFront (us-east-1), API Gateway … → HTTPS to clients',
        built: 'The **certificate service**. ACM issues **public TLS certificates at no charge** for integrated services (ELB, CloudFront, API Gateway, App Runner, Amplify …) and **renews DNS-validated ones automatically**. **Imported** certificates are never renewed by ACM; it only warns before they expire. **AWS Private CA** runs your own private certificate authority for internal names. Certificates protect data **in transit**; they encrypt nothing at rest.',
        says: ['HTTPS on the load balancer', 'certificate renewal', 'certificate expires', 'custom domain on CloudFront', 'internal TLS for microservices', 'private certificate authority'],
        switch: [{ to: 'kms', when: 'the data must be encrypted at rest' }, { to: 'edge', when: 'the attack is on the application (SQL injection, bots, floods)' }],
        misses: 'The **prestige pattern**: in the baseline you chose an option containing **ACM** where no certificate was involved. ACM has a job only when the question is about **TLS/HTTPS certificates**. Everything else is someone else’s line.',
        traps: ['ACM for encryption at rest.', 'ACM as a firewall or WAF: a certificate does not filter traffic.', 'Expecting ACM to renew an imported certificate.', 'A CloudFront certificate outside us-east-1.'],
        update: 'Public certificates are now valid for **198 days** (was 13 months) and ACM renews them **45 days** before expiry (was 60). Since June 2025 ACM can issue **exportable public certificates** you can install on EC2 or on-premises (a per-certificate fee).' },
      { id: 'edge', name: 'WAF · Shield · Firewall Manager', short: 'WAF/Shield', cls: 'ink', width: 4, dash: '10 6', alias: ['WAF', 'web ACL', 'rate-based', 'Shield', 'Shield Advanced', 'Firewall Manager', 'DDoS'],
        verb: 'filters web requests and absorbs DDoS', from: 'client → [Shield: L3/L4 DDoS] → [WAF web ACL: L7 rules] → CloudFront · ALB · API Gateway · AppSync · Cognito …',
        built: '**AWS WAF** inspects **HTTP requests** at CloudFront, ALB, API Gateway REST APIs, AppSync, Cognito user pools, App Runner, Verified Access and Amplify: managed rules (SQL injection, bad inputs, IP reputation), **rate-based rules**, geo match, IP sets, Bot Control, CAPTCHA. **Shield Standard** absorbs L3/L4 DDoS for everyone at no charge; **Shield Advanced** ($3,000/month, 1-year commitment) adds the Shield Response Team, **DDoS cost protection** and automatic L7 mitigation. **Firewall Manager** pushes these policies across every account in an Organization.',
        says: ['SQL injection', 'cross-site scripting', 'too many requests from one IP', 'block countries', 'bots', 'DDoS', 'cost protection during an attack', 'apply the same rules to every account'],
        switch: [{ to: 'nfw', when: 'the traffic is not HTTP to a web entry point, or must be inspected inside or between VPCs' }, { to: 'detect', when: 'the question wants to detect, not block' }],
        misses: 'The mirror of the prestige habit: **Shield Advanced** sounds like the strongest option in any attack question. It is right when the words are **DDoS + response team / cost protection**; for SQL injection, bots or one noisy IP, **WAF** is the job and costs a fraction.',
        traps: ['Network Firewall for SQL injection on an ALB or CloudFront (WAF’s job).', 'Shield Advanced for a login brute force from a few IPs (a WAF rate-based rule).', 'WAF on a Network Load Balancer (not a supported resource).', 'A CloudFront web ACL created outside us-east-1.'],
        update: 'Rate-based rules now go down to **10 requests** and use a **60, 120, 300 or 600 second** window (older material: minimum 100 per fixed 5 minutes). WAF now also protects Cognito user pools, App Runner, Verified Access and Amplify, and the console calls a web ACL a **protection pack**. Shield Advanced now includes WAF usage for protected resources.' },
      { id: 'nfw', name: 'Network Firewall', short: 'NFW', cls: 'ink', width: 4, dash: '16 5 3 5', alias: ['Network Firewall', 'firewall subnet', 'Suricata', 'IPS', 'domain list'],
        verb: 'inspects traffic in and out of VPCs', from: 'IGW / TGW → firewall endpoint in a firewall subnet → stateless + stateful (Suricata) rules → workload subnets',
        built: 'A **managed, stateful network firewall for VPCs**. Firewall endpoints sit in dedicated **firewall subnets** (one per AZ) and route tables send traffic through them; since 2025 it can also attach **natively to a Transit Gateway**. Stateless and stateful rules, **Suricata-compatible IPS signatures**, **domain allow/deny lists** (HTTP Host / TLS SNI), TLS inspection. It filters **any protocol between networks** — it does not sit in front of CloudFront and it is not the web-attack answer.',
        says: ['allow outbound traffic only to approved domains', 'intrusion prevention (IPS)', 'inspect traffic between VPCs', 'centralised egress filtering', 'Suricata rules', 'deep packet inspection'],
        switch: [{ to: 'edge', when: 'the threat is an HTTP application attack at CloudFront, ALB or API Gateway' }],
        misses: 'You chose **Network Firewall** in the baseline where it had no role. Its test: is the traffic flowing **through a VPC boundary** and does it need **stateful inspection, IPS or domain filtering** that security groups and NACLs cannot do? No → cross it out.',
        traps: ['Network Firewall to stop SQL injection at an ALB: WAF.', 'Network Firewall to block one IP range cheaply: a NACL deny rule (Session 3).', 'Network Firewall in front of CloudFront or S3: it lives in your VPC routing.'],
        update: '**Native Transit Gateway attachment** (June–July 2025): attach the firewall to a TGW with no inspection VPC or firewall subnets to manage. Also newer: one firewall serving several VPCs through endpoint associations, geographic IP and URL-category filtering.' },
      { id: 'detect', name: 'GuardDuty · Detective', short: 'GuardDuty', cls: 'ink', width: 4, dash: '24 8', alias: ['GuardDuty', 'Detective', 'threat detection', 'behavior graph', 'finding'],
        verb: 'detects threats and explains them', from: 'CloudTrail · VPC Flow Logs · DNS logs (+ protection plans) → GuardDuty findings → Detective behaviour graph',
        built: '**GuardDuty** is **threat detection**: it reads CloudTrail management events, VPC Flow Logs and DNS logs **by itself** (you enable nothing) plus optional protection plans (S3, EKS, Runtime Monitoring, Malware Protection, RDS, Lambda) and raises findings such as crypto-mining, credential exfiltration or calls from known-bad IPs. It **detects**; it blocks nothing — findings go to EventBridge for automated response. **Detective** builds a **behaviour graph** from the same logs and GuardDuty findings to **investigate** root cause after the fact.',
        says: ['detect compromised instances', 'crypto mining', 'unusual API calls', 'malicious IP addresses', 'continuous threat detection', 'root cause of a finding', 'investigate'],
        switch: [{ to: 'scan', when: 'the question is about software vulnerabilities (CVEs) or sensitive data in S3' }, { to: 'hub', when: 'findings from many services and accounts must be aggregated and scored' }, { to: 'edge', when: 'the requests must be blocked, not detected' }],
        traps: ['GuardDuty to block traffic: it detects; blocking is WAF, NACL or a Lambda response.', 'Enabling VPC Flow Logs first “so GuardDuty can read them”: it uses its own copy.', 'GuardDuty to find PII in S3: Macie.', 'Detective to detect: it investigates GuardDuty findings.'],
        update: '**Extended Threat Detection** (Dec 2024) is on by default at no extra cost and raises **attack sequence** findings across several signals. New protection plans since most courses: Runtime Monitoring, Malware Protection for S3 and for AWS Backup, AI Protection. Detective no longer lists a “GuardDuty for 48 hours” prerequisite.' },
      { id: 'scan', name: 'Inspector · Macie', short: 'Inspector/Macie', cls: 'ink', width: 4, dash: '6 4', alias: ['Inspector', 'Macie', 'vulnerability', 'CVE', 'sensitive data', 'PII'],
        verb: 'scans workloads for CVEs and S3 for sensitive data', from: 'Inspector → EC2 · ECR images · Lambda (CVEs, reachability) · Macie → S3 objects (PII, credentials)',
        built: '**Amazon Inspector** finds **software vulnerabilities (CVEs) and unintended network exposure** in **EC2** instances (SSM agent, or agentless EBS snapshots in hybrid mode), **ECR container images** and **Lambda functions**, continuously, with a risk score. **Amazon Macie** finds **sensitive data (PII, financial data, credentials) in S3** with managed and custom data identifiers and flags buckets that are public or unencrypted. Both detect; neither fixes.',
        says: ['vulnerabilities', 'CVE', 'container images in ECR', 'patch', 'network reachability', 'PII in S3', 'personally identifiable information', 'credit card numbers in buckets'],
        switch: [{ to: 'detect', when: 'the question is about active threats from account or network activity' }, { to: 'hub', when: 'the findings must be combined with other tools and scored against standards' }],
        traps: ['Macie for anything outside S3 (it only analyses S3).', 'Inspector to find PII, or Macie to find CVEs.', 'GuardDuty for software vulnerabilities.'],
        update: 'Inspector Classic reached **end of support on 20 May 2026**. Current Inspector scans EC2 **agentless** too (hybrid mode, the default for new customers), adds CIS benchmark scans and **code security** for repositories (GA June 2025). Its free trial is 15 days.' },
      { id: 'hub', name: 'Security Hub · Security Lake', short: 'Security Hub', cls: 'ink', width: 4, dash: '14 4 3 4 3 4', alias: ['Security Hub', 'Security Hub CSPM', 'Security Lake', 'Audit Manager', 'Artifact', 'OCSF', 'security standard'],
        verb: 'aggregates findings and checks posture', from: 'GuardDuty · Inspector · Macie · Config-based checks (all accounts, all Regions) → Security Hub → EventBridge / Security Lake (S3, OCSF)',
        built: '**Security Hub CSPM** (the original Security Hub, renamed 2025) runs **automated checks against standards** — AWS Foundational Security Best Practices, CIS, PCI DSS, NIST — using **AWS Config**, and **aggregates findings** from GuardDuty, Inspector, Macie and partners across accounts and Regions. The new **AWS Security Hub** (GA Dec 2025) correlates those signals into prioritised **exposure findings** in OCSF. **Security Lake** stores security logs as a data lake in **your S3**, in OCSF. **Artifact** hands you AWS’s own compliance reports.',
        says: ['single pane of glass', 'aggregate findings from many accounts', 'CIS benchmark', 'security score', 'compliance with PCI DSS', 'centralise security logs', 'AWS SOC report'],
        switch: [{ to: 'detect', when: 'the question is to investigate one finding’s root cause (Detective) or to detect threats (GuardDuty)' }],
        traps: ['Security Hub as a detector: it aggregates and checks; GuardDuty, Inspector and Macie find.', 'Security Hub CSPM without AWS Config recording: controls need it.', 'Security Hub to investigate a finding’s root cause: Detective.', 'Audit Manager for a new account: closed to new customers since April 2026.'],
        update: 'The original service is now **AWS Security Hub CSPM**; a new **AWS Security Hub** (preview June 2025, **GA 2 Dec 2025**) correlates GuardDuty, Inspector, Macie and CSPM findings into exposure findings with an attack path graph, in **OCSF**. **AWS Audit Manager is no longer open to new customers** (2026). Banks answer “Security Hub”; both names point to the same idea.' },
      { id: 'cognito', name: 'Cognito', short: 'Cognito', cls: 'ink', width: 4, dash: '18 4', alias: ['Cognito', 'user pool', 'identity pool', 'managed login', 'hosted UI'],
        verb: 'signs in app users and hands out AWS credentials', from: 'app user → user pool (sign-in, JWT) → your API / ALB · or → identity pool → STS temporary AWS credentials → S3, DynamoDB',
        built: 'Identity for **your application’s end users** (not your staff — that is IAM Identity Center, Session 6). A **user pool** is a user directory: sign-up, sign-in, MFA, federation with Google, Apple, SAML or OIDC, managed login pages, and it returns **JWTs** that an **ALB**, **API Gateway** or your code checks. An **identity pool** exchanges a token (or nothing, for guests) for **temporary AWS credentials** through an IAM role, so the app can call S3 or DynamoDB directly.',
        says: ['sign-up and sign-in for a mobile app', 'social login', 'millions of users', 'JWT', 'temporary AWS credentials for app users', 'guest access', 'authenticate users on the ALB'],
        switch: [{ to: 'edge', when: 'the question is about blocking attacks on the sign-in page (WAF can protect a user pool)' }],
        traps: ['An identity pool to sign users in with a password: user pools do that.', 'A user pool when the app must call S3 directly with AWS credentials: add an identity pool.', 'IAM users for millions of app customers.'],
        update: 'Since Nov 2024: **feature plans Lite / Essentials / Plus** (Essentials is the default for new user pools), the hosted UI became **managed login**, **passwordless** sign-in (passkeys, email/SMS codes), and “advanced security features” became **threat protection** in Plus. Free tier: 10,000 monthly active users for Lite and Essentials.' }
    ],
    topics: { rest: 'Encryption at rest: S3 · EBS · RDS' },

    map: {
      title: 'The security map', lead: 'Internet at the top, the AWS edge below it, then one Region of your account: the VPC, the data, the activity logs, the posture view and app sign-in. Tap a line or a station.',
      viewBox: '0 0 1000 880', defaultLine: 'kms',
      caption: 'No new hues: every security family is an ink line, told apart by its dash and its station shape — KMS solid with circles, Secrets short dashes with squares, ACM dots with triangles, WAF/Shield dashes with diamonds, Network Firewall dash-dot with hexagons, GuardDuty long dashes with rings, Inspector/Macie tight dashes with pentagons, Security Hub dash-dot-dot with bars, Cognito long dashes with inverted triangles. Every line is labelled; colour is never the only cue.',
      items: [
        /* zones */
        { el: 'rect', a: { x: 0, y: 0, width: 1000, height: 104 }, style: 'fill:var(--muted-fill)' },
        { el: 'rect', a: { x: 0, y: 112, width: 1000, height: 176 }, style: 'fill:var(--zone-onprem)' },
        { el: 'rect', a: { x: 0, y: 296, width: 1000, height: 584 }, style: 'fill:var(--zone-aws)' },
        zoneLabel(18, 22, 'INTERNET'),
        zoneLabel(922, 136, 'AWS EDGE', 'end'),
        { el: 'text', a: { x: 922, y: 154, 'font-size': 11, 'text-anchor': 'end', 'font-family': FONT }, style: 'fill:var(--ink2)', text: 'CloudFront · global services' },
        zoneLabel(922, 318, 'YOUR ACCOUNT · ONE REGION', 'end'),

        ...box(20, 334, 470, 266, 'VPC'),
        ...box(510, 334, 470, 266, 'DATA · KEYS · SECRETS'),
        ...box(20, 630, 470, 230, 'ACCOUNT & API ACTIVITY'),
        ...box(510, 630, 250, 230, 'POSTURE'),
        ...box(780, 630, 200, 230, 'APP SIGN-IN'),

        /* ---- lines ---- */
        { el: 'line', line: 'acm', paths: ['M110 70 V550', 'M110 470 H170'], labels: [{ x: 122, y: 136, t: 'ACM · CERTIFICATES', size: 11 }] },
        { el: 'line', line: 'nfw', paths: ['M250 300 V550'], labels: [{ x: 262, y: 322, t: 'NETWORK FIREWALL', size: 11 }] },
        { el: 'line', line: 'secrets', paths: ['M250 550 V505 H560 V380 H600', 'M560 450 H600'], labels: [{ x: 440, y: 497, t: 'SECRETS', size: 10.5 }] },
        { el: 'line', line: 'edge', paths: ['M420 70 V470', 'M420 236 H700'], labels: [{ x: 432, y: 124, t: 'WAF · SHIELD', size: 11 }] },
        { el: 'line', line: 'kms', paths: ['M740 380 H890', 'M800 380 V520 H660'], labels: [{ x: 812, y: 456, t: 'KMS · KEYS', size: 11 }] },
        { el: 'line', line: 'scan', paths: ['M410 540 V615 H880 V520'], labels: [{ x: 640, y: 609, t: 'SCAN · FINDINGS', size: 10 }] },
        { el: 'line', line: 'detect', paths: ['M90 690 H410'], labels: [{ x: 32, y: 654, t: 'DETECT → INVESTIGATE', size: 10.5 }] },
        { el: 'line', line: 'hub', paths: ['M600 615 V790', 'M250 690 V750 H600'], labels: [{ x: 612, y: 745, t: 'POSTURE', size: 10.5 }] },
        { el: 'line', line: 'cognito', paths: ['M940 70 V790'], labels: [{ x: 928, y: 212, t: 'COGNITO', size: 11, anchor: 'end' }] },

        /* ---- stations ---- */
        /* internet */
        big(110, 70, ['acm'], true), T(110, 48, 'Users', ['acm', 'nfw'], { a: { 'text-anchor': 'middle' }, pick: true }),
        big(420, 70, ['edge'], true), T(420, 48, 'Attackers · bots', ['edge'], { a: { 'text-anchor': 'middle' }, pick: true }),
        big(940, 70, ['cognito'], true), T(940, 48, 'App users', ['cognito'], { a: { 'text-anchor': 'middle' }, pick: true }),
        /* edge */
        diamond(420, 160, ['edge'], true), sub(436, 164, 'Shield Standard (free) · Advanced', ['edge'], null, ''),
        diamond(420, 236, ['edge'], true), sub(436, 262, 'WAF web ACL · CloudFront scope (us-east-1)', ['edge'], null, ''),
        triangle(110, 236, ['acm'], true), sub(126, 240, 'ACM cert · us-east-1', ['acm'], null, ''),
        diamond(700, 236, ['edge'], true), sub(716, 240, 'Firewall Manager', ['edge'], null, ''), sub(716, 256, 'org-wide policies', ['edge'], null, ''),
        /* VPC */
        hexa(250, 380, ['nfw'], true), sub(266, 384, 'Network Firewall', ['nfw']), sub(266, 399, 'firewall subnet', ['nfw']),
        big(250, 470, ['acm', 'edge', 'nfw'], false), sub(250, 497, 'ALB', ['acm', 'edge', 'nfw', 'cognito'], 'middle'),
        triangle(170, 470, ['acm'], true), sub(170, 494, 'ACM cert', ['acm'], 'middle'),
        diamond(420, 470, ['edge'], true), sub(436, 474, 'WAF (regional)', ['edge']),
        square(250, 550, ['secrets', 'nfw'], false), sub(266, 554, 'EC2 / ECS app', ['secrets', 'nfw', 'scan']), sub(266, 588, 'SG · NACL (Session 3)', ['nfw']),
        triangle(110, 550, ['acm'], true), sub(110, 574, 'Private CA', ['acm'], 'middle'),
        penta(410, 540, ['scan'], true), sub(410, 566, 'Inspector', ['scan'], 'middle'),
        /* data */
        square(600, 380, ['secrets'], true), sub(616, 384, 'Secrets Manager', ['secrets']),
        square(600, 450, ['secrets'], true), sub(616, 454, 'Parameter Store', ['secrets']),
        big(800, 380, ['kms'], true), sub(800, 358, 'KMS key', ['kms'], 'middle'),
        circle(890, 380, ['kms'], true), sub(890, 358, 'CloudHSM', ['kms'], 'middle'),
        circle(800, 520, ['kms', 'scan'], false), sub(800, 548, 'S3 bucket', ['kms', 'scan'], 'middle'),
        circle(660, 520, ['kms'], true), sub(660, 548, 'EBS · RDS', ['kms'], 'middle'),
        penta(880, 520, ['scan'], true), sub(880, 548, 'Macie', ['scan'], 'middle'),
        /* activity */
        square(90, 690, ['detect'], true), sub(90, 716, 'CloudTrail ·', ['detect'], 'middle'), sub(90, 731, 'Flow Logs · DNS', ['detect'], 'middle'),
        ...ring(250, 690, ['detect']), sub(250, 668, 'GuardDuty', ['detect', 'hub'], 'middle'),
        ...ring(410, 690, ['detect']), sub(410, 668, 'Detective', ['detect'], 'middle'), sub(410, 716, 'behaviour graph', ['detect'], 'middle'),
        /* posture */
        bar(600, 690, ['hub'], true), sub(620, 694, 'Security Hub', ['hub']), sub(620, 709, 'CSPM · standards', ['hub']),
        bar(600, 790, ['hub'], true), sub(620, 794, 'Security Lake', ['hub']), sub(620, 809, 'OCSF · your S3', ['hub']),
        /* sign-in */
        vtri(940, 690, ['cognito'], true), sub(926, 674, 'User pool', ['cognito'], 'end'), sub(926, 710, 'sign-in · JWT', ['cognito'], 'end'),
        vtri(940, 790, ['cognito'], true), sub(926, 774, 'Identity pool', ['cognito'], 'end'), sub(926, 810, 'temp AWS creds', ['cognito'], 'end'),
        ...LABELS
      ]
    },

    stub: [
      { id: 'asset', label: 'ASSET', short: 'ASSET', values: ['data at rest', 'secrets & config', 'TLS certificates', 'web requests', 'network traffic', 'API & account activity', 'workloads & images', 'app users'] },
      { id: 'layer', label: 'LAYER', short: 'LAYER', values: ['entry point', 'VPC', 'workload', 'data store', 'account / org', 'app sign-in'] },
      { id: 'mode', label: 'MODE', short: 'MODE', values: ['prevent', 'detect', 'investigate', 'report / audit'] },
      { id: 'sup', label: 'SUPERLATIVE', short: 'SUP', values: ['least ops', 'cheapest', 'most control', 'compliance', 'fastest', 'none stated'] }
    ],

    method:
`1. Strip the story. Keep WHAT is protected (data, secrets, certificates, requests,
   traffic, activity, workloads, users) and WHAT must happen (block it? find it?).
2. Fill the stub, the same 4 slots for this session:
   ASSET (data at rest / secrets & config / TLS certificates / web requests / network traffic /
          API & account activity / workloads & images / app users) ____
   LAYER (entry point / VPC / workload / data store / account-org / app sign-in) ____
   MODE (prevent / detect / investigate / report-audit) ____
   SUPERLATIVE ____
3. For EACH option ask: "what problem was this service BUILT for?"
   No match with the stub -> cross it out, however senior it sounds
   (ACM for data at rest, Network Firewall for SQL injection, Shield Advanced for one
   noisy IP, GuardDuty to block, Security Hub to investigate).
4. Among the survivors, the one that satisfies the SUPERLATIVE wins.`,

    cheat:
`SECURITY = ASSET + LAYER + MODE (prevent / detect / investigate / audit) + SUPERLATIVE
KMS         keys in FIPS 140-3 L3 HSMs · regional · key policy REQUIRED (IAM alone is not enough)
            AWS owned (invisible) · AWS managed aws/ebs (legacy, yearly rotation, no sharing)
            customer managed ($1/mo): own policy, grants, rotation 90-2,560 d, on-demand, share
            Encrypt <= 4 KB -> bigger data: GenerateDataKey = ENVELOPE (plaintext + encrypted key)
            delete: wait 7-30 d (default 30), cancel meanwhile · multi-Region keys = same ID+material
CLOUDHSM    single-tenant, YOU own users and keys, AWS cannot see them · cluster 2+ HSMs in 2 AZs
AT REST     S3: SSE-S3 default (2023) · SSE-KMS (audit, Bucket Keys cut calls up to 99%)
            DSSE-KMS (2 layers) · SSE-C (you send the key; blocked on new buckets since Apr 2026)
            TLS only -> bucket policy Deny aws:SecureTransport = false
            EBS: encryption by default per Region · RDS: only at creation -> snapshot, copy encrypted, restore
            share encrypted snapshot -> customer managed key + share the key (never aws/ebs, aws/rds)
SECRETS     rotate DB password -> Secrets Manager (managed rotation RDS/Aurora/DocDB/Redshift; >= 4 h)
            replicate to another Region -> Secrets Manager · config / flags, cheapest -> Parameter Store
            Parameter Store: standard free 10,000 x 4 KB · advanced 100,000 x 8 KB, policies, $0.05/mo
ACM         TLS IN TRANSIT only · public certs free, 198 d, DNS-validated auto-renew · imported: no renew
            CloudFront -> cert in us-east-1 · internal names -> Private CA ($400/mo per CA)
WAF         L7 HTTP: CloudFront ALB API-GW(REST) AppSync Cognito AppRunner VerifiedAccess Amplify (NOT NLB)
            rules in priority order · managed rules (SQLi, bad inputs) · rate-based >= 10 / 1-10 min
            actions Allow Block Count CAPTCHA Challenge · CloudFront scope in us-east-1
SHIELD      Standard free L3/L4 · Advanced $3,000/mo org, 1 yr: SRT (Business/Enterprise support),
            cost protection, auto L7 mitigation (CloudFront, ALB) · EIP for EC2/NLB
FW MANAGER  Organizations + Config -> same WAF/Shield/SG/NACL/NFW/DNS FW policies in every account
NETWORK FW  VPC: firewall subnets or native TGW attachment · stateful, Suricata IPS, domain lists
DETECT      GuardDuty: CloudTrail + Flow Logs + DNS (own copy) -> findings -> EventBridge; blocks nothing
            Inspector: CVEs in EC2 / ECR / Lambda · Macie: PII in S3 only · Detective: root cause
POSTURE     Security Hub (CSPM): standards FSBP CIS PCI NIST via Config, aggregate accounts + Regions
            Security Lake: logs in your S3, OCSF · Artifact: AWS compliance reports
COGNITO     user pool = sign-in, MFA, social/SAML, JWT (ALB, API GW) · identity pool = temp AWS creds
NEVER: ACM for data at rest · NFW for SQLi · Shield Adv for one IP · GuardDuty to block ·
       Macie outside S3 · share an aws/ebs snapshot · Encrypt a 5 GB file · identity pool to log in`,

    compare: [
      { id: 'kms-hsm', short: 'KMS · CloudHSM', title: 'KMS vs CloudHSM — a managed key service vs your own HSMs',
        sides: [{ name: 'AWS KMS', line: 'kms', fig: { dir: 'one', left: 'SERVICE', right: 'KMS KEY', keep: true }, gist: '**Managed, multi-tenant** key service in FIPS 140-3 Level 3 HSMs. Integrated with almost every service, key policies, CloudTrail, rotation. You never touch an HSM.' }, { name: 'AWS CloudHSM', line: 'kms', fig: { dir: 'both', left: 'YOUR APP', right: 'YOUR HSM' }, gist: '**Single-tenant** HSMs in your VPC. **You** create the crypto users and keys; AWS cannot see them. Standard APIs (PKCS#11, JCE, OpenSSL).' }],
        rows: [['Tenancy', 'shared service, keys isolated', 'dedicated HSMs, one customer'], ['Who controls the keys', 'you control use through policies; AWS operates the HSMs', 'you alone (AWS manages hardware only)'], ['Integration', 'S3, EBS, RDS, Secrets Manager … out of the box', 'your own code, or KMS **custom key store** on top'], ['High availability', 'built in', 'a cluster with 2+ HSMs in different AZs'], ['Deciding words', 'encrypt S3/EBS/RDS, audit key use, least ops', 'single-tenant, exclusive control, keys never shared with AWS, SSL offload, Oracle TDE'], ['Tempting wrong', 'for “single-tenant HSM” (KMS is multi-tenant)', 'for “least operational overhead”']],
        check: { q: '“A regulator requires that encryption keys live in HSMs dedicated to the company, that only the company’s administrators can manage them, and that AWS staff have no access.”', opts: ['AWS KMS', 'AWS CloudHSM'], a: 1, why: 'Dedicated (single-tenant) HSMs under exclusive customer control is what CloudHSM is. KMS HSMs are FIPS 140-3 Level 3 too, but shared and operated by AWS.' } },
      { id: 'sm-ps', short: 'Secrets · Parameters', title: 'Secrets Manager vs SSM Parameter Store',
        sides: [{ name: 'Secrets Manager', line: 'secrets', fig: { dir: 'both', left: 'APP', right: 'SECRET', keep: true }, gist: 'Built for **credentials that rotate**: managed rotation for RDS, Aurora, DocumentDB, Redshift; Lambda rotation for anything else; cross-Region replicas.' }, { name: 'Parameter Store', line: 'secrets', fig: { dir: 'one', left: 'APP', right: 'CONFIG' }, gist: 'Built for **configuration**: String, StringList and **SecureString** (KMS). Standard tier free. **No built-in rotation.**' }],
        rows: [['Rotation', 'built in (every 4 h at the shortest)', 'none — build it yourself'], ['Price', '$0.40 per secret per month + $0.05 per 10,000 calls', 'standard: free · advanced: $0.05 per parameter per month'], ['Size / count', '—', 'standard 4 KB, 10,000 per Region · advanced 8 KB, 100,000'], ['Cross-Region', 'replicate secrets', 'no'], ['Deciding words', 'rotate automatically, database credentials, replicate to DR Region', 'configuration, feature flags, cheapest, hierarchy /app/prod/…'], ['Tempting wrong', 'for hundreds of plain config values', 'for “rotate the password every 30 days”']],
        check: { q: '“Database credentials must rotate automatically every 30 days with the least operational overhead.”', opts: ['Secrets Manager', 'Parameter Store'], a: 0, why: 'Automatic rotation is the one thing Parameter Store does not do. Secrets Manager has managed rotation for RDS with no Lambda to write.' } },
      { id: 'sse', short: 'SSE-S3 · KMS · C', title: 'S3 encryption: SSE-S3 vs SSE-KMS vs SSE-C',
        sides: [{ name: 'SSE-S3', line: 'kms', fig: { dir: 'one', left: 'PUT', right: 'S3 KEY', keep: true }, gist: 'S3 owns and manages the keys. **Default for every new object since Jan 2023.** No cost, no audit of key use.' }, { name: 'SSE-KMS', line: 'kms', fig: { dir: 'one', left: 'PUT', right: 'KMS', keep: true }, gist: 'A **KMS key** (AWS managed or yours): key policy as a second permission, **CloudTrail audit**, rotation. **Bucket Keys** cut KMS calls.' }, { name: 'SSE-C', line: 'kms', fig: { dir: 'one', left: 'YOUR KEY', right: 'S3' }, gist: '**You send the key with every request** (HTTPS only); S3 uses and forgets it. **Blocked on new buckets since April 2026** until you allow it.' }],
        rows: [['Who manages the key', 'S3', 'KMS (you, if customer managed)', 'you, outside AWS'], ['Audit of key use', 'no', 'yes, CloudTrail', 'no'], ['Extra cost', 'none', 'KMS requests (Bucket Keys: up to 99% fewer)', 'none, but you run key management'], ['Deciding words', 'default, no requirements', 'audit, control, separate permissions, rotate', 'company-managed keys, AWS must not store the key'], ['Also', '—', 'DSSE-KMS: two layers, for compliance that demands it', 'client-side: encrypt before upload']],
        check: { q: '“Security must see in CloudTrail every time a key is used to decrypt objects, and must be able to disable the key.”', opts: ['SSE-S3', 'SSE-KMS', 'SSE-C'], a: 1, why: 'Audit and control of the key is what KMS adds. SSE-S3 keys are invisible; SSE-C keys never reach AWS’s logs.' } },
      { id: 'waf-shield', short: 'WAF · Shield Adv', title: 'AWS WAF vs Shield Advanced — rules vs a DDoS insurance policy',
        sides: [{ name: 'AWS WAF', line: 'edge', fig: { dir: 'one', left: 'REQUEST', right: 'APP', cache: true, cacheLabel: 'RULES' }, gist: '**Layer-7 rules** on HTTP requests: SQL injection, XSS, bad bots, rate limits per IP, countries, IP sets. Pay per web ACL, rule and request.' }, { name: 'Shield Advanced', line: 'edge', fig: { dir: 'one', left: 'FLOOD', right: 'EDGE', keep: true }, gist: '**Managed DDoS protection**: Shield Response Team, **cost protection** for scaling during an attack, automatic L7 mitigation, attack diagnostics. $3,000/month + 1-year commitment.' }],
        rows: [['Protects against', 'application attacks and abusive clients', 'large DDoS on L3/L4 and L7'], ['Resources', 'CloudFront, ALB, API GW REST, AppSync, Cognito, App Runner, Verified Access, Amplify', 'CloudFront, Route 53 zones, Global Accelerator, ALB, CLB, Elastic IPs (EC2, NLB)'], ['Human help', 'no', 'SRT 24/7 (needs Business or Enterprise Support)'], ['Cost', 'small, per rule and request', '$3,000/month per organization, 1 year'], ['Deciding words', 'SQL injection, bots, rate limit, block countries', 'DDoS response team, cost protection, attack visibility'], ['Tempting wrong', 'alone, for “24/7 DDoS experts”', 'for a login brute force from 3 IPs (your prestige reflex)']],
        check: { q: '“A login page receives thousands of password guesses per minute from a handful of IP addresses. Stop it at the lowest cost.”', opts: ['AWS WAF', 'Shield Advanced'], a: 0, why: 'A rate-based WAF rule on /login blocks each IP above its limit for a few dollars a month. Shield Advanced is for DDoS at scale and costs $3,000 a month.' } },
      { id: 'waf-nfw', short: 'WAF · NFW · SG/NACL', title: 'WAF vs Network Firewall vs security groups and NACLs',
        sides: [{ name: 'AWS WAF', line: 'edge', fig: { dir: 'one', left: 'HTTP', right: 'ALB CF', cache: true, cacheLabel: 'L7' }, gist: 'Reads **HTTP requests** at the web entry point (CloudFront, ALB, API Gateway …). SQLi, XSS, bots, rate limits.' }, { name: 'Network Firewall', line: 'nfw', fig: { dir: 'both', left: 'VPC', right: 'NET', cache: true, cacheLabel: 'IPS' }, gist: '**Stateful inspection of any traffic crossing a VPC boundary**: IPS signatures, domain allow lists for egress, TLS inspection, central inspection with TGW.' }, { name: 'SG · NACL', line: null, fig: { dir: 'one', left: 'PORT', right: 'ENI' }, gist: '**Ports and IP ranges** (Session 3). SG: allow-only, stateful, on the ENI. NACL: allow + deny, stateless, on the subnet. Free.' }],
        rows: [['Looks at', 'HTTP method, path, headers, body, IP, country', 'packets and flows, domains (Host/SNI), signatures', 'protocol, port, IP range'], ['Where', 'CloudFront, ALB, API GW, AppSync …', 'firewall subnets / TGW attachment', 'ENI / subnet'], ['Deciding words', 'SQL injection, XSS, rate limit, bots', 'approved domains only, IPS, inspect between VPCs', 'allow port 443, block one CIDR, cheapest'], ['Tempting wrong', 'on an NLB or for non-HTTP traffic', 'for SQL injection at an ALB (your prestige pick)', 'for SQL injection (they cannot read HTTP)']],
        check: { q: '“EC2 instances in private subnets of 20 VPCs may connect out only to three approved update domains; everything else must be blocked and logged.”', opts: ['AWS WAF', 'Network Firewall', 'SG · NACL'], a: 1, why: 'Egress filtering by domain name across VPCs is Network Firewall’s job (domain lists on Host/SNI). SGs and NACLs only know IPs; WAF only sits in front of web entry points.' } },
      { id: 'detect3', short: 'GuardDuty · Inspector · Macie', title: 'GuardDuty vs Inspector vs Macie — three detectors, three different questions',
        sides: [{ name: 'GuardDuty', line: 'detect', fig: { dir: 'one', left: 'LOGS', right: 'FINDING' }, gist: '“**Is someone attacking or misusing my account right now?**” Reads CloudTrail, Flow Logs, DNS (+ plans).' }, { name: 'Inspector', line: 'scan', fig: { dir: 'one', left: 'EC2 ECR', right: 'CVE' }, gist: '“**Is my software vulnerable?**” CVEs and network exposure in EC2, ECR images, Lambda.' }, { name: 'Macie', line: 'scan', fig: { dir: 'one', left: 'S3', right: 'PII' }, gist: '“**Is sensitive data sitting in S3?**” PII, financial data, credentials — and public or unencrypted buckets.' }],
        rows: [['Looks at', 'activity: API calls, network flows, DNS', 'software packages, code, reachability', 'S3 object contents and bucket settings'], ['Finds', 'crypto mining, stolen credentials, known-bad IPs', 'CVEs, open paths from the internet', 'names, passports, card numbers, keys'], ['Scope', 'account, EC2, EKS, S3, RDS, Lambda …', 'EC2, ECR, Lambda, code repos', 'S3 only'], ['Deciding words', 'threat, compromised, anomalous, malicious IP', 'vulnerability, CVE, patch, image scanning', 'PII, sensitive data, GDPR discovery']],
        check: { q: '“Find out which S3 buckets across the organization contain customers’ passport numbers.”', opts: ['GuardDuty', 'Inspector', 'Macie'], a: 2, why: 'Sensitive data in S3 is exactly and only Macie’s job. GuardDuty S3 Protection watches access patterns, not object contents.' } },
      { id: 'hub-det', short: 'Security Hub · Detective', title: 'Security Hub vs Detective vs GuardDuty — aggregate, investigate, detect',
        sides: [{ name: 'Security Hub', line: 'hub', fig: { dir: 'one', left: 'FINDINGS', right: 'SCORE', keep: true }, gist: '**Aggregates** findings from many services, accounts and Regions and **checks posture** against standards (CSPM: FSBP, CIS, PCI, NIST).' }, { name: 'Detective', line: 'detect', fig: { dir: 'one', left: 'FINDING', right: 'GRAPH' }, gist: '**Investigates**: a behaviour graph of up to a year of activity to answer “what happened, who, from where, since when”.' }, { name: 'GuardDuty', line: 'detect', fig: { dir: 'one', left: 'LOGS', right: 'FINDING' }, gist: '**Detects** threats and raises the finding in the first place.' }],
        rows: [['Question it answers', 'how secure are we overall, where are the worst gaps?', 'what is the root cause and blast radius of this finding?', 'is something malicious happening?'], ['Needs', 'AWS Config for CSPM controls', 'CloudTrail, Flow Logs, GuardDuty findings (own copies)', 'nothing to enable first'], ['Deciding words', 'single pane of glass, compliance score, CIS, many accounts', 'investigate, root cause, visualise, timeline', 'detect, threat, anomalous'], ['Tempting wrong', 'for “find the root cause”', 'for “detect” or “aggregate”', 'for “aggregate findings and score against CIS”']],
        check: { q: '“After a GuardDuty finding, analysts need to see which IP addresses and roles the compromised credentials touched over the last three weeks.”', opts: ['Security Hub', 'Detective', 'GuardDuty'], a: 1, why: 'Root-cause investigation over a time range is Detective’s behaviour graph. Security Hub would only list the finding again.' } },
      { id: 'cognito', short: 'User pool · Identity pool', title: 'Cognito user pool vs identity pool',
        sides: [{ name: 'User pool', line: 'cognito', fig: { dir: 'one', left: 'USER', right: 'JWT', keep: true }, gist: 'A **user directory**: sign-up, sign-in, MFA, social/SAML/OIDC federation, managed login. Output: **JWT tokens** for your API, ALB or app.' }, { name: 'Identity pool', line: 'cognito', fig: { dir: 'one', left: 'TOKEN', right: 'AWS CREDS' }, gist: 'A **credentials vending machine**: swaps a token (or nothing, for guests) for **temporary AWS credentials** of an IAM role.' }],
        rows: [['Answers', 'who is this user?', 'what AWS resources may this user call?'], ['Output', 'ID, access and refresh tokens (JWT)', 'temporary AWS credentials (STS)'], ['Used by', 'ALB authenticate action, API Gateway authorizer, your backend', 'the app calling S3, DynamoDB, IoT directly'], ['Guests', 'no', 'yes: unauthenticated role'], ['Deciding words', 'sign-up, sign-in, social login, MFA, JWT', 'access AWS services directly, temporary credentials, guest users']],
        check: { q: '“A mobile app must let signed-in users upload photos straight into S3 without a backend server.”', opts: ['User pool', 'Identity pool'], a: 1, why: 'Calling S3 directly needs AWS credentials; the identity pool exchanges the user-pool token for temporary credentials scoped by an IAM role. (The user pool still does the sign-in.)' } }
    ],

    traps: [
      { title: 'ACM to encrypt data at rest', x: 'Prestige distractor from your record. A certificate protects data in transit (TLS). S3, EBS and RDS at rest → KMS.', drills: ['S1', 'S7'] },
      { title: 'Network Firewall for SQL injection', x: 'Prestige distractor from your record. SQLi and XSS are HTTP attacks at the entry point → WAF managed rules on the ALB / CloudFront / API Gateway.', drills: ['S2', 'S23'] },
      { title: 'Shield Advanced for a handful of noisy IPs', x: '$3,000 a month for DDoS response and cost protection. A few IPs hammering a login page → WAF rate-based rule.', drills: ['S3', 'S22'] },
      { title: 'GuardDuty to block', x: 'GuardDuty detects and raises findings; it blocks nothing. Blocking needs WAF, a NACL, or an EventBridge rule that triggers a response.', drills: ['S25'] },
      { title: 'Security Hub to investigate', x: 'Security Hub aggregates and scores. The root cause of one finding → Detective.', drills: ['S26', 'S29'] },
      { title: 'Macie outside S3, Inspector for PII', x: 'Macie only analyses S3. Inspector finds CVEs, not personal data. GuardDuty finds neither.', drills: ['S27', 'S28'] },
      { title: 'Calling KMS Encrypt on a large file', x: 'Encrypt accepts at most 4 KB of plaintext. Anything bigger: GenerateDataKey, encrypt locally, store the encrypted data key with the data (envelope encryption).', drills: ['S6'] },
      { title: 'Sharing a snapshot encrypted with aws/ebs or aws/rds', x: 'AWS managed keys cannot be used by another account. Re-encrypt (copy) with a customer managed key, share the key in its key policy, then share the snapshot.', drills: ['S8'] },
      { title: 'Enabling encryption on an existing RDS instance', x: 'Only at creation. Snapshot → copy with encryption → restore → switch the application.', drills: ['S11'] },
      { title: 'Parameter Store for automatic rotation', x: 'Parameter Store has no built-in rotation. Credentials that must rotate → Secrets Manager.', drills: ['S17'] },
      { title: 'Secrets Manager for plain config at the lowest cost', x: '$0.40 per secret per month adds up. Configuration values → Parameter Store standard (free), SecureString for the sensitive ones.', drills: ['S18'] },
      { title: 'Expecting ACM to renew an imported certificate', x: 'ACM renews only certificates it issued. Imported ones: watch the expiry events in EventBridge or the Config rule, and re-import.', drills: ['S20'] },
      { title: 'WAF on a Network Load Balancer', x: 'Not a supported resource. Put an ALB, CloudFront or API Gateway in front, or use Shield Advanced on the NLB’s Elastic IPs for DDoS.', drills: ['S23'] },
      { title: 'CloudHSM when least ops is asked', x: 'You run the cluster, users and keys yourself. Unless the question says single-tenant or exclusive control, KMS wins.', drills: ['S7', 'S1'] },
      { title: 'Identity pool to sign users in', x: 'Identity pools hand out AWS credentials; they have no user directory. Sign-up and sign-in → user pool.', drills: ['S30'] },
      { title: 'Security Hub CSPM without AWS Config', x: 'CSPM controls are evaluated with AWS Config rules: Config recording must be on in every account and Region you check.', drills: ['S29'] }
    ],

    log: [
      { when: '2 Sept 2026', what: 'Baseline practice exam, security pattern', result: 'ACM and Network Firewall picked where they had no role', lesson: 'Prestige distractors: an option containing ACM (no certificate in the scenario) and one containing Network Firewall (no VPC-level inspection needed) looked “more complete”. The fix: name the service’s built-for job before keeping it. No single question number; the pattern is trained in drills S1–S5.' },
      { when: '—', what: 'Session 5 quiz', result: 'not taken yet', lesson: 'Run all 30 scenarios once. Misses are tagged in “Where it broke” and show up in Progress.' }
    ]
  });
})();
