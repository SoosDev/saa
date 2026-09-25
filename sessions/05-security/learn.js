/* Session 5 — the lesson. 12 chapters. Facts: docs/session-05-security.md (verified 2026-09-25). */
(function () {
  'use strict';
  const S = window.SESSION;
  const fromDrill = (id, src) => {
    const d = S.drills.find(x => x.id === id);
    return { id: 'ck-' + id, src: src || d.src, q: d.q, opts: d.opts.map(o => ({ t: o.t, why: o.why })), a: d.opts.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0), why: d.expl };
  };

  const STORE = {
    start: 'root',
    nodes: {
      root: { q: 'What do you need to protect or provide?', opts: [
        { label: 'A password, token or API key that code reads at run time', next: 'rot' },
        { label: 'Plain configuration: endpoints, feature flags, IDs', sub: 'nothing secret, or only mildly sensitive', next: 'ps' },
        { label: 'A key that encrypts data (files, volumes, databases)', next: 'keyctl' },
        { label: 'A TLS certificate for HTTPS', next: 'cert' }] },
      rot: { q: 'Must it rotate automatically, or be available in another Region?', opts: [
        { label: 'Yes: automatic rotation, or a replica in a DR Region', next: 'sm' },
        { label: 'No: changed by hand now and then; cheapest option', next: 'pss' }] },
      keyctl: { q: 'Who may operate the HSMs that hold the key?', opts: [
        { label: 'AWS-operated HSMs are fine; we control use through policies', sub: 'least operational overhead, integrated with S3, EBS, RDS', next: 'kms' },
        { label: 'Dedicated HSMs that only our own administrators manage', sub: 'single-tenant, AWS has no access', next: 'hsm' }] },
      cert: { q: 'Where will the certificate be used?', opts: [
        { label: 'A public name on ALB, CloudFront, API Gateway, App Runner …', next: 'acm' },
        { label: 'Internal names only (orders.corp.internal)', next: 'pca' },
        { label: 'Installed on EC2 instances, containers or on-premises servers', next: 'acmexp' }] }
    },
    results: {
      sm: { title: 'AWS Secrets Manager', line: 'secrets', text: 'Built for credentials that **rotate**. Managed rotation for RDS, Aurora, DocumentDB and Redshift; a Lambda rotation function for anything else. Secrets can be **replicated to other Regions**.', facts: ['$0.40 per secret per month + $0.05 per 10,000 API calls', 'Shortest rotation schedule: every 4 hours', 'Encrypted with a KMS key (AWS managed or yours)'], whyNot: [['Parameter Store', 'no built-in rotation, no cross-Region replication']] },
      pss: { title: 'Parameter Store · SecureString', line: 'secrets', text: 'A **SecureString** parameter encrypted with a KMS key. Standard tier is free; values up to 4 KB.', facts: ['No automatic rotation — you change it yourself', 'Can also reference Secrets Manager secrets through `/aws/reference/secretsmanager/…`'], whyNot: [['Secrets Manager', 'works, but you pay per secret for features you do not use']] },
      ps: { title: 'SSM Parameter Store', line: 'secrets', text: 'Hierarchical configuration (`/app/prod/db-url`), versioned, with IAM per path. **Standard** parameters are free.', facts: ['Standard: 10,000 per Region, 4 KB each, free', 'Advanced: 100,000 per Region, 8 KB, parameter policies (expiry), $0.05 per parameter per month', 'Default throughput 40 TPS; higher throughput up to 10,000 TPS for GetParameter (charged)'], whyNot: [['Secrets Manager', '$0.40 per value per month for plain config']] },
      kms: { title: 'AWS KMS', line: 'kms', text: 'A customer managed KMS key: your key policy, CloudTrail audit, rotation every 90–2,560 days, and native integration with S3, EBS, RDS, Secrets Manager and most services.', facts: ['$1 per key per month + requests', 'Keys are regional; multi-Region keys when you need the same key elsewhere'], whyNot: [['CloudHSM', 'you would run the HSM cluster yourself for no requirement that needs it']] },
      hsm: { title: 'AWS CloudHSM', line: 'kms', text: '**Single-tenant** HSMs (FIPS 140-3 Level 3) in your VPC. You create the crypto users and keys; AWS cannot access them. Put a **KMS custom key store** on top if AWS services must still use the keys.', facts: ['Run at least 2 HSMs in different AZs', 'Standard interfaces: PKCS#11, JCE, OpenSSL'], whyNot: [['KMS', 'multi-tenant and AWS-operated, even though it is FIPS 140-3 Level 3 too']] },
      acm: { title: 'ACM public certificate', line: 'acm', text: 'Free for integrated services, **renewed automatically** when DNS-validated and in use.', facts: ['Valid 198 days; renewal starts 45 days before expiry', 'CloudFront needs the certificate in us-east-1'], update: 'Validity dropped from 13 months to 198 days in February 2026 (CA/Browser Forum rules) and will keep shrinking in 2027 and 2029.', whyNot: [['Imported certificate', 'ACM never renews it']] },
      pca: { title: 'AWS Private CA', line: 'acm', text: 'Your own managed private certificate authority. Issue private certificates through ACM (renewed by ACM) or directly for mTLS, devices and internal services.', facts: ['$400 per CA per month (general-purpose mode)', '$50 per CA per month in short-lived certificate mode (certificates ≤ 7 days)'], whyNot: [['Public ACM certificate', 'public CAs cannot sign private names']] },
      acmexp: { title: 'ACM exportable public certificate', line: 'acm', text: 'Since June 2025 ACM can issue public certificates **with an exportable private key**, for EC2, containers or on-premises servers. ACM still renews them; you install each renewal.', facts: ['A fee per certificate ($7 per name, $79 per wildcard since Feb 2026)', 'Only certificates requested as exportable can be exported'], update: 'Older material: “ACM public certificates cannot be installed on EC2” — true for ordinary ACM certificates, which stay inside integrated services.', whyNot: [['Ordinary ACM certificate', 'cannot be exported'], ['Self-signed certificate', 'browsers reject it']] }
    }
  };

  const S3ENC = {
    start: 'root',
    nodes: {
      root: { q: 'What must be true about the key?', opts: [
        { label: 'Nothing special: just encrypted at rest', next: 'sses3' },
        { label: 'We must audit key use, control who may use the key, or disable it', next: 'kmsq' },
        { label: 'AWS must never store our key', next: 'out' }] },
      kmsq: { q: 'Does a compliance rule demand two independent layers of encryption?', opts: [
        { label: 'No', next: 'ssekms' },
        { label: 'Yes: dual-layer encryption is mandated', next: 'dsse' }] },
      out: { q: 'May S3 handle the plaintext while it processes the request?', opts: [
        { label: 'Yes: S3 may encrypt with our key, as long as it forgets the key', next: 'ssec' },
        { label: 'No: data must be encrypted before it leaves our systems', next: 'client' }] }
    },
    results: {
      sses3: { title: 'SSE-S3 (the default)', line: 'kms', text: 'S3-managed keys, AES-256, applied automatically to every new object since January 2023. No cost, nothing to configure.', whyNot: [['SSE-KMS', 'adds cost and key management no requirement asks for']] },
      ssekms: { title: 'SSE-KMS', line: 'kms', text: 'Objects encrypted with data keys from a KMS key. The key policy is a second permission gate, CloudTrail logs each decrypt, and you can disable or rotate the key. Turn on **S3 Bucket Keys** to cut KMS requests by up to 99%.', facts: ['Customer managed key for full control; AWS managed aws/s3 for simplicity', 'Enforce it with a bucket policy that denies uploads without the KMS encryption header'], whyNot: [['SSE-S3', 'no key audit, no separate key permissions']] },
      dsse: { title: 'DSSE-KMS', line: 'kms', text: 'Dual-layer server-side encryption with KMS keys: two independent layers of AES-256 (June 2023), for rules that require it.', facts: ['S3 Bucket Keys are not supported with DSSE-KMS'], whyNot: [['SSE-KMS', 'one layer — enough unless a standard demands two']] },
      ssec: { title: 'SSE-C', line: 'kms', text: 'You send a 256-bit key with every PUT and GET, over **HTTPS only**. S3 encrypts, keeps a salted HMAC of the key to validate later requests, and discards the key. Lose the key and you lose the object.', update: 'Since **April 2026** new general purpose buckets **block SSE-C** until you allow it with `PutBucketEncryption` (BlockedEncryptionTypes = NONE). Existing buckets in accounts that never used SSE-C were blocked too.', whyNot: [['SSE-KMS with imported key material', 'KMS then stores the material']] },
      client: { title: 'Client-side encryption', line: 'kms', text: 'Encrypt before upload (for example with the AWS Encryption SDK or the S3 encryption client, using a KMS key or your own). S3 only ever stores ciphertext.', whyNot: [['SSE-C', 'S3 sees the plaintext during the request']] }
    }
  };

  S.learn = [
    /* ---------------------------------------------------------------- 1 */
    { id: 'ch1', title: 'How to read a security question', domains: 'D1', blocks: [
      'Security is the heaviest domain on the exam — **D1 is 30%** of the scored questions — and this cluster is where most of it lives. The services have similar names and overlapping marketing: several of them “protect”, several “detect”, several “encrypt”. The exam uses that. It hands you a scenario with one clear job and four options that each contain a real security service. Three of those services are real, useful and wrong.',
      { h: 'Your record on this cluster' },
      'There is no single question number here. What the baseline showed is a **pattern**: twice you kept an option because it contained an impressive security service that had nothing to do in the scenario.',
      { table: { head: ['Where', 'What pulled you', 'What it is actually built for', 'Tag'], rows: [
        ['baseline, a question with no certificate in it', '**ACM**', 'issuing and renewing TLS certificates — data **in transit** only', '**C** prestige distractor'],
        ['baseline, a question with no VPC-level inspection', '**Network Firewall**', 'stateful inspection, IPS and domain filtering of traffic **crossing a VPC boundary**', '**C** prestige distractor'],
        ['same habit in Sessions 3 and 4', 'Global Accelerator, Transit Gateway', 'static IPs / non-HTTP; many-VPC hub', '**C**']] } },
      { callout: 'Drills **S1–S5** and a few cards come from this pattern. They are marked as yours with the source **“Exam pattern”** (no question number) and tag **C**. In S1–S3, ACM, Network Firewall and Shield Advanced are tempting and wrong; in S4 and S5, ACM and Network Firewall are genuinely right. The skill is not avoiding those services — it is naming their job before keeping them.', kind: 'miss', title: 'Your misses' },
      { h: 'Ask first: what is protected, and must it be stopped or found?' },
      'Strip the scenario to two things: the **asset** (what is being protected) and the **mode** (must something be blocked, or only found, or explained, or reported?). That alone picks the family:',
      { table: { head: ['What is protected', 'Stop it (prevent)', 'Find it (detect / investigate / report)'], key: true, rows: [
        ['data at rest in S3, EBS, RDS', '{kms|KMS} (SSE-KMS, EBS/RDS encryption), CloudHSM', '{scan|Macie} (sensitive data in S3)'],
        ['passwords, API keys, config', '{secrets|Secrets Manager}, {secrets|Parameter Store}', '—'],
        ['data in transit (TLS)', '{acm|ACM}, Private CA', 'ACM expiry events'],
        ['HTTP requests to a web entry point', '{edge|WAF}, {edge|Shield}', 'WAF logs, Shield Advanced diagnostics'],
        ['traffic between networks and VPCs', '{nfw|Network Firewall}, SG, NACL', 'Network Firewall alert logs, Flow Logs'],
        ['account and API activity', '(IAM, SCPs — Session 6)', '{detect|GuardDuty}, {detect|Detective}'],
        ['EC2, containers, Lambda', '(patching — Session 11)', '{scan|Inspector}'],
        ['the whole estate', '{edge|Firewall Manager} (enforce)', '{hub|Security Hub} (aggregate, score)'],
        ['your app’s end users', '{cognito|Cognito}', 'Cognito threat protection']] } },
      { h: 'The stub for this session' },
      'Session 4’s slots (what travels, scope, need) do not separate these services. This session uses four new ones:',
      { table: { head: ['Slot', 'Ask', 'Values', 'What it kills'], rows: [
        ['ASSET', 'What is protected?', '`data at rest` · `secrets & config` · `TLS certificates` · `web requests` · `network traffic` · `API & account activity` · `workloads & images` · `app users`', 'ACM for data at rest; Macie for anything but S3 contents; Inspector for API activity'],
        ['LAYER', 'Where does the protection act?', '`entry point` · `VPC` · `workload` · `data store` · `account / org` · `app sign-in`', 'Network Firewall for an attack arriving at CloudFront or an ALB; WAF inside a VPC'],
        ['MODE', 'Stop it, find it, explain it, or report it?', '`prevent` · `detect` · `investigate` · `report / audit`', 'GuardDuty when something must be blocked; WAF when it only must be found; Security Hub when the root cause is asked'],
        ['SUPERLATIVE', 'What is optimised?', '`least ops` · `cheapest` · `most control` · `compliance` · `fastest` · `none stated`', 'CloudHSM under “least ops”; Secrets Manager under “cheapest config”; Shield Advanced under “cost-effective”']] } },
      'An **entry point** here means the front door the attack reaches first: CloudFront, an ALB, API Gateway, AppSync, a Cognito user pool. WAF, Shield and ACM act there. **VPC** means traffic inside or between your networks — Network Firewall, security groups and NACLs act there.',
      { pre: S.method, label: 'The method' },
      { h: 'Built for — one line each' },
      { hooks: [
        ['KMS', '**encrypts data at rest** with keys you control through key policies; logs every use.'],
        ['CloudHSM', '**single-tenant HSMs** only you administer.'],
        ['Secrets Manager', 'stores credentials and **rotates** them; replicates across Regions.'],
        ['Parameter Store', 'stores **configuration** (and SecureStrings) cheaply; no rotation.'],
        ['ACM', 'issues and renews **TLS certificates** for data **in transit**. Nothing at rest.'],
        ['WAF', 'filters **HTTP requests** at the entry point: SQLi, XSS, bots, rate limits, countries.'],
        ['Shield Advanced', '**DDoS** response team, cost protection, L7 auto-mitigation. $3,000/month.'],
        ['Firewall Manager', 'the **same firewall policies in every account** of an Organization.'],
        ['Network Firewall', '**stateful inspection of traffic crossing VPC boundaries**: IPS, domain lists.'],
        ['GuardDuty', '**detects threats** in account, network and DNS activity. Blocks nothing.'],
        ['Inspector', 'finds **CVEs** and exposure in EC2, ECR images, Lambda.'],
        ['Macie', 'finds **sensitive data in S3**. Only S3.'],
        ['Security Hub', '**aggregates** findings and **scores** accounts against standards.'],
        ['Detective', '**investigates** a finding: root cause, scope, timeline.'],
        ['Cognito', '**signs in app users** (user pool) and hands them **AWS credentials** (identity pool).']], label: 'Built for' },
      { h: 'Try it on S1' },
      'One of your pattern drills. Fill the four slots before you look at any option. Then ask of the option with ACM in it: which slot does it fail?',
      { widget: 'stubTrainer', args: { drill: 'S1', title: 'Stub trainer · S1 (exam pattern)', why: {
        asset: 'customer contracts stored in S3 — data at rest.',
        layer: 'the protection acts on the bucket’s objects: the data store.',
        mode: '“encrypted”, “can be disabled” — this must prevent reading, not find something.',
        sup: '“least operational overhead”.' } } },
      { check: { id: 'ch1-acm', src: 'Exam pattern', q: 'An option says “Use AWS Certificate Manager to encrypt the S3 objects”. Which stub slot rules it out immediately?', opts: [
        { t: 'MODE: ACM detects, it does not prevent.', why: 'ACM neither detects nor prevents at rest; the mismatch is earlier.' },
        { t: 'ASSET: ACM protects data in transit (TLS), and the asset is data at rest.', why: 'Certificates secure connections. Nothing in ACM encrypts stored objects.' },
        { t: 'SUPERLATIVE: ACM is expensive.', why: 'public ACM certificates are free — cost is not the problem.' },
        { t: 'None: ACM can encrypt S3 objects with a private key.', why: 'false; that is SSE-KMS or SSE-C.' }], a: 1,
        why: 'Name the built-for job first: ACM = TLS certificates. The asset is data at rest → KMS. Crossing it out on ASSET is the whole prestige test.' } },
      { check: { id: 'ch1-nfw', src: 'Exam pattern', q: 'Before keeping an option that contains **Network Firewall**, which question should you be able to answer “yes”?', opts: [
        { t: 'Is the attack serious?', why: 'every attack in an exam question is serious; that selects nothing.' },
        { t: 'Does traffic cross a VPC boundary and need stateful inspection, IPS or domain filtering that SGs and NACLs cannot do?', why: 'that is its built-for job.' },
        { t: 'Is the application behind CloudFront?', why: 'CloudFront traffic is filtered by WAF, not by a VPC firewall.' },
        { t: 'Does the company have many accounts?', why: 'that points to Firewall Manager, which can deploy Network Firewall — but only if Network Firewall is needed at all.' }], a: 1,
        why: 'Network Firewall = VPC-level, stateful, any protocol, IPS and domains. No VPC-boundary traffic to inspect → cross it out.' } }
    ] },

    /* ---------------------------------------------------------------- 2 */
    { id: 'ch2', title: 'The security map: prevent, detect, investigate', domains: 'D1', blocks: [
      'Before the details, the shape. AWS security services fall into a few jobs, and almost every exam question asks for exactly one of them. Most wrong options are a correct service doing a **neighbouring** job.',
      { h: 'Five jobs' },
      { table: { head: ['Job', 'Services', 'What “done” looks like'], key: true, rows: [
        ['**Encrypt and keep secrets**', '{kms|KMS}, CloudHSM, {secrets|Secrets Manager}, {secrets|Parameter Store}, {acm|ACM}, Private CA', 'data unreadable without a key; credentials out of code; TLS everywhere'],
        ['**Filter and absorb**', '{edge|WAF}, {edge|Shield}, {nfw|Network Firewall}, security groups, NACLs', 'bad traffic never reaches the workload'],
        ['**Detect**', '{detect|GuardDuty}, {scan|Inspector}, {scan|Macie} (and Config for configuration)', 'a finding appears; nothing is blocked'],
        ['**Aggregate and investigate**', '{hub|Security Hub}, {detect|Detective}, {hub|Security Lake}', 'one view of all findings; the root cause of one'],
        ['**Enforce everywhere**', '{edge|Firewall Manager} (and SCPs, Control Tower in Session 6)', 'the same policy in every account, new ones included'],
        ['**Identify app users**', '{cognito|Cognito}', 'your customers sign in; your app gets tokens or AWS credentials']] } },
      'Two words do most of the sorting. **Block, stop, prevent, deny, encrypt** point to the first two rows. **Detect, identify, find, alert, discover** point to the detectors. A question that asks to block with an option containing only a detector is asking you to spot that the detector blocks nothing.',
      { callout: 'The shared responsibility model sits under all of this: AWS secures the infrastructure; you configure the services on top. Everything in this session is on **your** side. Identity for your own staff (IAM, IAM Identity Center), guardrails across accounts (Organizations, SCPs, Control Tower) and configuration recording (AWS Config) are **Session 6** and **Session 11** — they appear here only as boundaries.', kind: 'note', title: 'The boundary' },
      { h: 'Sort them' },
      { widget: 'sorter', args: { title: 'Which service answers this?', lead: 'Twelve requirements, six services, two each. Decide before you check.', buckets: [{ id: 'kms', short: 'KMS', label: 'KMS' }, { id: 'secrets', short: 'Secrets', label: 'Secrets Manager' }, { id: 'acm', short: 'ACM', label: 'ACM / Private CA' }, { id: 'waf', short: 'WAF', label: 'AWS WAF' }, { id: 'shield', short: 'Shield Adv', label: 'Shield Advanced' }, { id: 'nfw', short: 'NFW', label: 'Network Firewall' }], items: [
        { t: 'Encrypt EBS volumes with a key the team can disable', b: 'kms', why: 'customer managed KMS key.' },
        { t: 'HTTPS on an ALB, renewed without anyone noticing', b: 'acm', why: 'ACM public certificate, DNS validation.' },
        { t: 'Block SQL injection against an API Gateway REST API', b: 'waf', why: 'WAF managed rules.' },
        { t: 'Credits for scaling costs caused by a DDoS attack', b: 'shield', why: 'DDoS cost protection.' },
        { t: 'Rotate the RDS master password every 30 days', b: 'secrets', why: 'managed rotation.' },
        { t: 'Outbound traffic from 20 VPCs only to approved domains', b: 'nfw', why: 'stateful domain allow list.' },
        { t: 'Limit each client IP to 100 login attempts per 5 minutes', b: 'waf', why: 'rate-based rule.' },
        { t: 'Encrypt a 3 GB file with a key that never leaves AWS', b: 'kms', why: 'envelope encryption with a data key.' },
        { t: 'Certificates for internal names such as orders.corp.internal', b: 'acm', why: 'AWS Private CA.' },
        { t: 'IPS signatures on traffic between VPCs attached to a transit gateway', b: 'nfw', why: 'Suricata-compatible stateful rules.' },
        { t: '24/7 access to AWS DDoS experts during an attack', b: 'shield', why: 'Shield Response Team.' },
        { t: 'Database credentials available in the DR Region, same name', b: 'secrets', why: 'secret replication.' }] } },
      { check: { id: 'ch2-mode', q: 'A question asks to “**prevent** EC2 instances from communicating with known malicious IP addresses”. One option is “Enable Amazon GuardDuty”. Keep it or cross it out?', opts: [
        { t: 'Keep it: GuardDuty knows the malicious IPs.', why: 'it knows them and raises a finding — then the traffic has already happened.' },
        { t: 'Cross it out on MODE: GuardDuty detects; it prevents nothing on its own.', why: 'prevention needs a filter (Network Firewall, NACL, DNS Firewall) or an automated response wired to the finding.' },
        { t: 'Cross it out on ASSET: GuardDuty only reads S3.', why: 'false; it reads CloudTrail, flow logs and DNS logs.' }], a: 1,
        why: 'MODE = prevent. GuardDuty is a detector. If the option said “GuardDuty + EventBridge + Lambda that updates a NACL”, it would be a detect-and-respond design — read options to the end.' } },
      { check: { id: 'ch2-staff', q: 'Employees must sign in once with the corporate identity provider and reach 30 AWS accounts. Which service family is this?', opts: [
        { t: 'Cognito user pools', why: 'Cognito is for your application’s end users, not your workforce.' },
        { t: 'IAM Identity Center (Session 6)', why: 'workforce single sign-on across accounts.' },
        { t: 'Secrets Manager', why: 'stores credentials; it signs nobody in.' }], a: 1,
        why: 'Boundary: customers of your app → Cognito. Your own staff across accounts → IAM Identity Center, taught in Session 6.' } }
    ] },

    /* ---------------------------------------------------------------- 3 */
    { id: 'ch3', title: 'KMS: keys, key policies and envelope encryption', domains: 'D1', blocks: [
      'AWS Key Management Service holds the keys that most AWS services use to encrypt data at rest. When the exam says S3, EBS, RDS, DynamoDB, Secrets Manager or CloudTrail logs are “encrypted”, KMS is almost always underneath.',
      { h: 'What a KMS key is' },
      { ul: [
        'A **KMS key** is a logical key: an ID, an ARN, a key policy, a state (enabled, disabled, pending deletion) and one or more versions of **key material**.',
        'The key material is generated in and **never leaves** KMS’s hardware security modules unencrypted. The HSMs are validated at **FIPS 140-3 Security Level 3**.',
        'Keys are **regional**: a key in eu-west-1 cannot be used from us-east-1 (multi-Region keys, next chapter, are the exception by design).',
        'Every use of a key is an API call that is authorised by policy and **logged in CloudTrail**.'] },
      { h: 'Three kinds of key' },
      { table: { head: ['', 'AWS owned', 'AWS managed (`aws/s3`, `aws/ebs` …)', 'Customer managed'], key: true, rows: [
        ['In your account?', 'no — invisible to you', 'yes, you can view it and read its policy', 'yes'],
        ['Key policy', 'AWS’s', 'fixed by the service; you cannot edit it', '**yours to write**'],
        ['Rotation', 'decided by AWS', '**every year**, fixed', 'optional, **90–2,560 days**, plus on demand'],
        ['Use from another account', 'no', '**no** (so no sharing of what it encrypts)', 'yes, through the key policy and grants'],
        ['Delete', 'no', 'no', 'yes, after 7–30 days'],
        ['Cost', 'free', 'no monthly fee; requests charged', '$1 per month + requests']] } },
      { callout: 'The KMS docs now call **AWS managed keys a legacy key type**: no new service has created one since 2021, and services increasingly default to **AWS owned keys**. AWS managed keys rotate **every year** (every three years until 2022). The exam distinction is unchanged: you cannot share or control an AWS managed key; a customer managed key you can.', kind: 'update' },
      'Key **types** matter less for this exam. A **symmetric** key (the default, AES-256-GCM) encrypts and decrypts and is the only kind AWS services use for encryption at rest. **Asymmetric** keys (RSA, elliptic curve, and now ML-DSA for post-quantum signatures) sign or encrypt where the other party only holds the public key. **HMAC** keys create and verify message authentication codes.',
      { h: 'Who may use a key' },
      'Here KMS differs from almost every other AWS service. Every KMS key has **exactly one key policy**, and the key policy is the primary authority. **An IAM policy alone cannot grant access to a key** unless the key policy allows IAM to be used. The default key policy does exactly that (it trusts the account’s IAM policies), which is why many teams never notice.',
      { ul: [
        '**Key policy**: who may administer and use this key. Required. The only way to let **another account** use the key.',
        '**IAM policy**: works only if the key policy delegates to IAM. Can always narrow (deny).',
        '**Grants**: temporary, programmatic permissions a service creates for itself — this is how EBS lets an EC2 instance use a key to attach an encrypted volume. Eventually consistent (usually within 5 minutes).'] },
      { check: { id: 'ch3-policy', q: 'A role has an IAM policy allowing `kms:Decrypt` on a key, yet every Decrypt call is denied. The key was created with a custom key policy. What is the most likely cause?', opts: [
        { t: 'KMS needs a VPC endpoint.', why: 'without a route the call would time out, not be denied.' },
        { t: 'The key policy does not allow the account’s IAM policies (or the role) to use the key.', why: 'without that statement, IAM permissions have no effect on the key.' },
        { t: 'The role also needs an ACM certificate.', why: 'certificates have nothing to do with KMS permissions.' },
        { t: 'Decrypt is only allowed for the root user.', why: 'false.' }], a: 1,
        why: 'Key policy first. IAM counts only when the key policy lets it count.' } },
      { h: 'Envelope encryption' },
      'The KMS **Encrypt** API accepts at most **4 KB (4,096 bytes)** of plaintext. That is enough for a password or another key, and nowhere near enough for a file. So KMS encrypts **keys**, and those keys encrypt the data. This is **envelope encryption**, and it is how every integrated service works:',
      { ol: [
        '**GenerateDataKey** returns a fresh data key twice: in plaintext, and encrypted under your KMS key.',
        'Encrypt the data locally with the plaintext data key, then erase that key from memory.',
        'Store the **encrypted data key next to the ciphertext**.',
        'To read, send the encrypted data key to **Decrypt**; KMS checks the key policy, logs the call and returns the plaintext data key; decrypt locally.'] },
      'The data never travels to KMS, so size and throughput are not KMS’s problem. And because the data key is useless without KMS, **revoking access to the KMS key revokes access to every copy of the data**, wherever it was copied.',
      { widget: 'envelope' },
      { check: fromDrill('S6') },
      { check: { id: 'ch3-types', q: 'An EBS snapshot is encrypted with `aws/ebs`. Which statement is true?', opts: [
        { t: 'You can edit the key policy of aws/ebs to add a partner account.', why: 'AWS managed key policies cannot be edited.' },
        { t: 'Only principals in the same account can use aws/ebs, so the snapshot cannot be shared as it is.', why: 'this is why sharing needs a re-encrypted copy with a customer managed key.' },
        { t: 'aws/ebs rotates every three years.', why: 'every year since 2022.' }], a: 1,
        why: 'AWS managed keys: visible, not controllable, not shareable. Chapter 5 walks through the sharing procedure.' } },
      { drills: ['S1', 'S6'] }
    ] },

    /* ---------------------------------------------------------------- 4 */
    { id: 'ch4', title: 'Operating keys: rotation, deletion, multi-Region, CloudHSM', domains: 'D1 D2', blocks: [
      'Knowing what a key is gets you half the KMS questions. The other half are about its life: how it rotates, how it dies, how it reaches another Region, and when it should live in hardware you control.',
      { h: 'Rotation' },
      { ul: [
        '**Automatic rotation** creates new key material on a schedule and keeps every old version, so older ciphertext still decrypts. The key ID, ARN and aliases **do not change** — applications need no changes.',
        'Customer managed keys: automatic rotation is **optional**, with a period of **90 to 2,560 days** (default 365). **On-demand rotation** rotates immediately, independent of the schedule.',
        'Automatic rotation works only for **symmetric keys whose material KMS generated**. Keys with **imported** material, asymmetric and HMAC keys, and keys in **custom key stores** do not rotate automatically.',
        'AWS managed keys rotate **every year**; you cannot change it.',
        'Rotation cost: the first and second rotations each add $1 per month to the key; later ones are free.'] },
      { callout: 'Older material: “KMS rotates customer managed keys **once a year**; for any other period, create a new key and move the alias.” Since **April 2024** the period is configurable (90–2,560 days) and **on-demand rotation** exists; since **June 2025** on-demand rotation also works for **imported key material**. The alias-switch answer still works, it is just no longer needed.', kind: 'update' },
      { h: 'Deletion' },
      'Deleting a key destroys its material and makes every ciphertext encrypted under it **unrecoverable**. KMS therefore forces a **waiting period of 7 to 30 days (default 30)**. During the wait the key is **Pending Deletion**: disabled, every cryptographic call fails (a good moment to see in CloudTrail who still uses it), and you can **cancel**. If you only want to stop use, **disable** the key instead — that is reversible at any time.',
      { h: 'Multi-Region keys' },
      'A KMS key never leaves its Region. **Multi-Region keys** are a set of related keys in different Regions with the **same key ID and the same key material**: data encrypted in us-east-1 decrypts in eu-west-1 with a **local** call. Each one is still an independent regional key with its own key policy, grants and aliases; one is the primary, the others replicas. You cannot convert an existing single-Region key. Use them for client-side encryption of globally replicated data (DynamoDB global tables, S3 replication of client-encrypted objects) and for DR. Rotation is set on the primary and copied to the replicas. Each replica costs $1 per month.',
      { h: 'Request quotas' },
      'Cryptographic calls share one **request quota per account per Region** across all symmetric keys (and AWS managed keys count; AWS owned keys do not). Exceed it and callers get **ThrottlingException**. The fixes: fewer calls (**S3 Bucket Keys**, data key caching in the Encryption SDK), then a quota increase. More keys do not help.',
      { callout: 'Symmetric cryptographic operations: **10,000 per second** by default, **20,000** in seven larger Regions, **100,000** in us-east-1, us-west-2 and eu-west-1. Older material lists 5,500 / 10,000 / 30,000–50,000.', kind: 'update' },
      { check: fromDrill('S12') },
      { check: fromDrill('S13') },
      { check: fromDrill('S9') },
      { h: 'CloudHSM and custom key stores' },
      'KMS is **multi-tenant**: AWS operates the HSMs and many customers’ keys live in them, isolated by software and policy. Some regulations require keys in hardware **dedicated to one customer**, administered **only** by that customer. That is **AWS CloudHSM**:',
      { ul: [
        '**Single-tenant** HSMs in your VPC. You create the crypto officers, crypto users and keys; **AWS cannot access your keys**. AWS manages the hardware, patching and backups.',
        'Current HSMs (hsm2m.medium) are validated at **FIPS 140-3 Level 3**. The older hsm1.medium (FIPS 140-2) can no longer be used for new clusters.',
        'You build a **cluster**; for availability run **at least two HSMs in different AZs**.',
        'Applications talk to it with standard interfaces (PKCS#11, JCE, OpenSSL): SSL/TLS offload, Oracle TDE, document signing, your own PKI.'] },
      'Need AWS services such as S3 or EBS to use keys that live in your own HSMs? Put a **KMS custom key store** on top of a CloudHSM cluster: services keep calling KMS, the key material stays in your cluster. (An **external key store** keeps keys outside AWS entirely; AWS docs now say it is **not recommended** unless a regulation demands it — lowest throughput, no SLA.)',
      { pair: 'kms-hsm' },
      { callout: 'Do not decide KMS vs CloudHSM on the FIPS level: **both** are FIPS 140-3 Level 3 today. Older material says KMS is FIPS 140-2 (Level 2 in places) and CloudHSM Level 3, and banks still use that as the discriminator. The deciding words that stay true: **single-tenant**, **dedicated**, **exclusive control**, **AWS has no access** → CloudHSM.', kind: 'update' },
      { h: 'Try the key types' },
      'Pick each key type and read what you can do with it. Then use the requirements at the bottom: choose one, then tap the key type that makes it possible.',
      { widget: 'keySim' },
      { check: fromDrill('S7') },
      { drills: ['S7', 'S9', 'S12', 'S13', 'S10'] }
    ] },

    /* ---------------------------------------------------------------- 5 */
    { id: 'ch5', title: 'Encryption at rest: S3, EBS, RDS and snapshots', domains: 'D1', blocks: [
      'Most “encrypt the data” questions are about three stores. Each has one rule the exam loves.',
      { h: 'S3: five ways to encrypt an object' },
      { table: { head: ['Option', 'Who holds the key', 'Use when'], key: true, rows: [
        ['**SSE-S3**', 'S3 (AES-256)', 'nothing special is required — it is the **default for every new object since January 2023**'],
        ['**SSE-KMS**', 'a KMS key (AWS managed aws/s3 or yours)', 'audit of key use, separate key permissions, disable/rotate the key'],
        ['**DSSE-KMS**', 'KMS, two independent layers', 'a standard that demands dual-layer encryption (June 2023)'],
        ['**SSE-C**', 'you — sent with every request over HTTPS', 'AWS must never store the key'],
        ['**Client-side**', 'you — before upload', 'data must be encrypted before it leaves your systems']] } },
      'With SSE-KMS, every object write and read calls KMS. Busy buckets hit the KMS request quota and the KMS bill; **S3 Bucket Keys** make S3 use a short-lived bucket-level key derived from the KMS key and cut KMS requests **by up to 99%**. (Not available with DSSE-KMS.)',
      { callout: 'Since **April 2026**, S3 **blocks SSE-C by default on every new general purpose bucket**, and on existing buckets in accounts that had no SSE-C objects. Uploads with SSE-C headers get **403 AccessDenied** until you allow it with `PutBucketEncryption` (setting `BlockedEncryptionTypes` to NONE). Banks still answer “use SSE-C” without that step; in a real account it is one extra call.', kind: 'update' },
      { h: 'Enforce it with a bucket policy' },
      { ul: [
        '**Encryption in transit**: deny every request where `aws:SecureTransport` is `false`. Default encryption does nothing for the connection.',
        '**A particular key type**: deny `s3:PutObject` when the request does not specify SSE-KMS (the KMS encryption header or key ID is missing). Default encryption already covers most cases; the deny makes it a rule.'] },
      { widget: 'chooser', args: { title: 'S3 encryption chooser', tree: S3ENC } },
      { pair: 'sse' },
      { check: fromDrill('S14') },
      { check: fromDrill('S15') },
      { h: 'EBS' },
      { ul: [
        'Encryption happens at the volume level with KMS data keys; snapshots of an encrypted volume and volumes restored from them are encrypted too.',
        '**EBS encryption by default** is an account setting **per Region**: once on, every new volume and snapshot copy there is encrypted (with aws/ebs or the key you choose). It does not touch existing volumes.',
        'An existing **unencrypted** volume cannot be encrypted in place: snapshot it, **copy the snapshot with encryption**, create a new volume from the copy.'] },
      { h: 'RDS and Aurora' },
      'RDS encryption is chosen **at creation** and can never be turned on (or off) later. A **read replica** has the same encryption state as its source. So an audit that finds an unencrypted database leads to one procedure:',
      { widget: 'stepper', args: { title: 'Encrypt an existing RDS database', line: 'kms', steps: [
        { title: 'Take a snapshot', text: 'Create a manual DB snapshot of the unencrypted instance. It is unencrypted, like its source.' },
        { title: 'Copy the snapshot with encryption', text: 'Copy the snapshot and enable encryption, choosing a **KMS key** (a customer managed key if you will ever share it). Copying is the step that can add encryption.' },
        { title: 'Restore a new instance from the copy', text: 'Restoring from the encrypted snapshot creates an **encrypted DB instance** with a new endpoint.' },
        { title: 'Switch the application', text: 'Plan a short write freeze (or take the snapshot during a maintenance window), point the application at the new endpoint, verify.', note: 'Aurora differs: you cannot add encryption by copying a cluster snapshot; restore the snapshot with encryption turned on instead.' },
        { title: 'Clean up', text: 'Delete the old instance and the unencrypted snapshots when the new one is verified — otherwise the audit finding is still true.' }] } },
      { check: fromDrill('S11') },
      { h: 'Snapshots across accounts and Regions' },
      'AWS managed keys can only be used inside their own account, so a snapshot encrypted with **aws/ebs** or **aws/rds** can never be shared. Encrypted snapshots can never be public either.',
      { widget: 'stepper', args: { title: 'Share an encrypted snapshot with another account', line: 'kms', steps: [
        { title: 'Check the key', text: 'If the snapshot is encrypted with **aws/ebs** or **aws/rds**, it cannot be shared as it is.' },
        { title: 'Copy with a customer managed key', text: 'Copy the snapshot and re-encrypt it with a **customer managed KMS key** in your account.' },
        { title: 'Allow the other account in the key policy', text: 'Add the other account as a principal in the key policy so it may use the key for this snapshot.' },
        { title: 'Share the snapshot', text: 'Modify the snapshot’s permissions and add the other account ID.' },
        { title: 'The other account copies it', text: 'Account B copies the shared snapshot, usually re-encrypting it with its own key, so it no longer depends on your key.' }] } },
      'Across **Regions**: KMS keys are regional, so a copied encrypted snapshot must be encrypted with a key **in the destination Region** — RDS requires you to name it; EBS uses the Region’s default key if you do not.',
      { check: fromDrill('S8') },
      { check: fromDrill('S10') },
      { drills: ['S1', 'S8', 'S10', 'S11', 'S14', 'S15', 'S16'] }
    ] },

    /* ---------------------------------------------------------------- 6 */
    { id: 'ch6', title: 'Secrets, parameters and certificates', domains: 'D1', blocks: [
      'Three services store things your applications need at run time. They overlap just enough to be confused: all three hold something sensitive, and all three can involve KMS. The question is **what** is stored and **what must happen to it**.',
      { h: 'AWS Secrets Manager' },
      { ul: [
        'Stores secrets (database credentials, API keys, OAuth tokens) encrypted with a KMS key; applications fetch them at run time with `GetSecretValue` through their IAM role.',
        '**Rotation** is the reason it exists. **Managed rotation** (no Lambda to maintain) covers RDS, Aurora, DocumentDB and Redshift credentials; anything else uses a **Lambda rotation function**. The shortest schedule is **every 4 hours**.',
        '**RDS and Aurora can manage the master user password in Secrets Manager for you** (`ManageMasterUserPassword`): RDS generates it, stores it and rotates it.',
        '**Replication**: a secret can be replicated to other Regions; rotation of the primary updates the replicas, and a replica can be promoted in a disaster.',
        'Price: **$0.40 per secret per month** plus $0.05 per 10,000 API calls; each replica counts as a secret.'] },
      { h: 'SSM Parameter Store' },
      { table: { head: ['', 'Standard', 'Advanced'], key: true, rows: [
        ['Parameters per account per Region', '10,000', '100,000'],
        ['Value size', '4 KB', '8 KB'],
        ['Parameter policies (expiry, notifications)', 'no', 'yes'],
        ['Share with other accounts', 'no', 'yes'],
        ['Storage price', 'free', '$0.05 per parameter per month'],
        ['Change tier', 'upgrade any time', 'cannot go back to standard']] } },
      'Parameters are String, StringList or **SecureString** (encrypted with a KMS key). Paths such as `/app/prod/db-url` let IAM grant one environment’s values at a time. Parameter Store has **no built-in rotation**. Throughput defaults to **40 transactions per second**; **higher throughput** (charged) raises GetParameter to 10,000 TPS. It can also pass through Secrets Manager secrets via `/aws/reference/secretsmanager/…`.',
      { pair: 'sm-ps' },
      { check: fromDrill('S17') },
      { check: fromDrill('S18') },
      { check: fromDrill('S19') },
      { h: 'ACM: certificates for data in transit' },
      'AWS Certificate Manager issues and manages **TLS certificates**. It is the answer whenever HTTPS needs a certificate on an AWS front door — and never otherwise.',
      { ul: [
        '**Public certificates are free** for use with integrated services: Elastic Load Balancing, CloudFront, API Gateway, App Runner, Amplify, Elastic Beanstalk, Nitro Enclaves, Network Firewall (TLS inspection) and a few more. Validation by **DNS** (a CNAME record) or **email**.',
        '**Managed renewal**: DNS-validated certificates that are **in use** renew automatically, as long as the CNAME is still there. Email-validated ones need the domain owner to click.',
        '**Imported** certificates (from another CA) are **never renewed by ACM**. ACM sends daily “Certificate Approaching Expiration” events to EventBridge from **45 days** before expiry (configurable), and the AWS Config rule `acm-certificate-expiration-check` flags them.',
        'Certificates are **regional**: use one in the same Region as the load balancer or API. **CloudFront** only reads certificates from **us-east-1** (Session 4).',
        'Ordinary ACM certificates cannot be exported — their private key stays inside the integrated service.'] },
      { callout: 'Public ACM certificates are now valid for **198 days** (older material: 13 months / 395 days) and renew **45 days** before expiry (was 60), following the CA/Browser Forum’s 200-day limit from March 2026; validity will shrink again in 2027 and 2029. Since **June 2025** ACM also issues **exportable public certificates** (private key included, for EC2 or on-premises; a fee per certificate), and since July 2026 it speaks the **ACME** protocol for short-lived certificates outside integrated services.', kind: 'update' },
      '**AWS Private CA** is a managed **private certificate authority**: certificates for internal names (orders.corp.internal), mutual TLS between services, devices. Private certificates issued through ACM are renewed by ACM. It costs **$400 per CA per month** in general-purpose mode, or **$50** in **short-lived certificate** mode (certificates valid at most 7 days).',
      { callout: 'This is where the prestige habit hides. ACM appears in options about **encryption at rest** (“use ACM to encrypt the bucket”), about **firewalls** (“ACM certificate on the WAF”), about **secrets** (“store the API key in ACM”). Every one of those fails the ASSET slot: ACM only issues **TLS certificates**. When there is no certificate in the scenario, ACM has no job.', kind: 'miss', title: 'Your misses' },
      { h: 'Choose' },
      { widget: 'chooser', args: { title: 'Secrets Manager, Parameter Store, KMS or ACM?', tree: STORE } },
      { check: fromDrill('S4', 'Exam pattern') },
      { check: fromDrill('S20') },
      { check: fromDrill('S21') },
      { drills: ['S4', 'S17', 'S18', 'S19', 'S20', 'S21'] }
    ] },

    /* ---------------------------------------------------------------- 7 */
    { id: 'ch7', title: 'AWS WAF: rules, priorities and rate limits', domains: 'D1 D2', blocks: [
      'AWS WAF is a **web application firewall**: it reads each **HTTP request** — IP, country, headers, URI, query string, body — and decides before the request reaches your application. It is the answer for SQL injection, cross-site scripting, bad bots, scrapers, credential stuffing, and “block these countries” at a web front door.',
      { h: 'Where it attaches' },
      'A **web ACL** (the console now calls it a **protection pack**) is associated with a resource. Supported resources: **CloudFront** distributions, **Application Load Balancers**, **API Gateway REST APIs**, **AppSync** GraphQL APIs, **Cognito user pools**, **App Runner** services, **Verified Access** instances and **Amplify** apps. **Not** a Network Load Balancer, not an EC2 instance directly, not API Gateway HTTP APIs. A resource has at most one web ACL.',
      'For CloudFront (and Amplify) the web ACL and everything it uses are created with **CLOUDFRONT scope in us-east-1**; for regional resources, in the resource’s Region.',
      { h: 'Rules and statements' },
      { table: { head: ['Statement', 'Matches', 'Typical use'], key: true, rows: [
        ['IP set', 'source IP in a list of CIDRs', 'allow the office, block known offenders'],
        ['Geo match', 'country (or region) of the source IP', 'licensing, sanctions'],
        ['String / regex / size', 'parts of the request', 'block a path, cap body size'],
        ['SQL injection, XSS', 'attack patterns in chosen request parts', 'custom protections'],
        ['Managed rule groups', 'AWS or Marketplace rule sets', '**core rule set** (OWASP-style), **SQL database**, known bad inputs, **Amazon IP reputation**, Bot Control, Fraud Control'],
        ['Rate-based', 'too many requests per key in a window', 'brute force, scraping, HTTP floods'],
        ['Label match', 'labels added by earlier rules', 'combine managed rules with your own logic']] } },
      'Each rule has an **action**: **Allow**, **Block**, **Count**, **CAPTCHA** or **Challenge**. Allow and Block (and a solved/failed CAPTCHA) are **terminating**: evaluation stops. **Count** only records the match and adds labels; evaluation continues — the way to test a rule safely. Rules run in **priority order** (lowest number first), and if nothing terminates, the web ACL’s **default action** (Allow or Block) applies.',
      { h: 'Rate-based rules' },
      { ul: [
        'Count requests per **aggregation key** — by default the **source IP**; also a forwarded IP header, ASN, or custom keys (header, cookie, query argument, method, combinations).',
        'Over a trailing **evaluation window of 60, 120, 300 or 600 seconds** (default 300). The **rate limit** can be as low as **10**.',
        'When a key exceeds the limit, the rule’s action (anything except Allow) applies to that key’s further requests until its rate falls again.',
        'A **scope-down statement** narrows what is counted, for example only `POST /login`.',
        'WAF checks the counts about every 10 seconds and does not guarantee an exact limit, so a few requests pass after the threshold. Shorter windows react sooner.'] },
      { callout: 'Older material: rate-based rules count per **fixed 5 minutes** with a **minimum of 100** requests, keyed by IP only. Now: **60/120/300/600 s**, **minimum 10**, and custom aggregation keys.', kind: 'update' },
      { h: 'Capacity and the rest' },
      'Rules cost **web ACL capacity units (WCU)** by complexity (an IP set 1, a SQL injection statement 20, an XSS statement 40). The base price covers **1,500 WCU** per web ACL; you can go up to 5,000 for an extra per-request fee. Price basics: about $5 per web ACL and $1 per rule per month plus $0.60 per million requests. **Bot Control** (common and targeted bots) and **Fraud Control** — **account takeover prevention (ATP)** for login pages and **account creation fraud prevention (ACFP)** for sign-up pages — are paid managed rule groups on top.',
      { h: 'Simulate a web ACL' },
      'Start with the defaults: limit 100 per 5 minutes, Block. Count how many password guesses the bot gets through. Then set the limit to 10 and the window to 1 minute. Switch the action to **Count** and watch the bot walk in. Finally move the office allow rule **last** and see its pentest request get blocked — priority order at work.',
      { widget: 'wafSim' },
      { check: fromDrill('S2', 'Exam pattern') },
      { check: fromDrill('S3', 'Exam pattern') },
      { check: { id: 'ch7-count', q: 'A new managed rule group might block legitimate traffic. How do you see what it would block without affecting users?', opts: [
        { t: 'Add it with its rule actions overridden to Count, review the logs and metrics, then switch to Block.', why: 'Count records matches and lets requests continue.' },
        { t: 'Set the web ACL default action to Block.', why: 'that blocks everything no rule allows.' },
        { t: 'Enable Shield Advanced first.', why: 'unrelated to rule testing.' }], a: 0,
        why: 'Count is WAF’s dry-run mode: non-terminating, visible in metrics, sampled requests and logs.' } },
      { check: fromDrill('S23') },
      { drills: ['S2', 'S3', 'S23'] }
    ] },

    /* ---------------------------------------------------------------- 8 */
    { id: 'ch8', title: 'Shield, Firewall Manager and Network Firewall', domains: 'D1 D2', blocks: [
      'WAF reads requests. Three neighbouring services are about **volume**, **scale across accounts** and **networks**. Each is the right answer to one kind of question and the prestige distractor in the others.',
      { h: 'AWS Shield' },
      { table: { head: ['', 'Shield Standard', 'Shield Advanced'], key: true, rows: [
        ['Cost', '**free**, on for every customer', '**$3,000 per month** per organization, **1-year** commitment, plus data transfer fees'],
        ['Protects', 'common L3/L4 DDoS against all AWS resources', 'CloudFront, Route 53 hosted zones, Global Accelerator, ALB, CLB, **Elastic IPs** (EC2 and NLB are protected through their EIPs)'],
        ['Layer 7', '—', 'detection, and **automatic application-layer mitigation** for CloudFront and ALB using WAF'],
        ['People', '—', '**Shield Response Team (SRT)** 24/7 — requires **Business or Enterprise Support**; proactive engagement with Route 53 health checks'],
        ['Money', '—', '**DDoS cost protection**: credits for scaling charges caused by an attack'],
        ['WAF', 'separate', 'WAF for protected resources included (up to set limits)']] } },
      'Shield Advanced is right when the question says **DDoS** and one of: **response team / experts**, **cost protection**, **visibility into attacks**, protection for **EIPs, Route 53 or Global Accelerator**. It is wrong for SQL injection (WAF), for a few noisy IPs (a WAF rate-based rule), and wherever “cost-effective” rules out $36,000 a year.',
      { pair: 'waf-shield' },
      { callout: '**Shield network security director** (preview since June 2025) maps your network topology and flags missing or misconfigured WAF, security groups and NACLs, with findings in Security Hub since March 2026. Still a preview; not on the exam.', kind: 'update' },
      { check: fromDrill('S22') },
      { h: 'AWS Firewall Manager' },
      'Firewall Manager is **policy distribution** for an **AWS Organization**. You define a policy once; it is applied to every in-scope account and resource, **including accounts and resources created later**, and non-compliant resources are reported. Policy types: **AWS WAF**, **Shield Advanced**, **security groups** (common, content audit, usage audit), **network ACLs**, **Network Firewall**, **Route 53 Resolver DNS Firewall**, and third-party firewalls (Palo Alto Cloud NGFW, Fortigate). Prerequisites: **Organizations** with all features, a Firewall Manager **administrator account**, and **AWS Config** enabled in the accounts. It is billed per policy per Region.',
      'The tell: “**all accounts** in the organization”, “**new accounts automatically**”, “**centrally** manage firewall rules”. Security Hub would only report the gap; StackSets would create resources but not keep them associated and compliant.',
      { check: fromDrill('S24') },
      { h: 'AWS Network Firewall' },
      { ul: [
        'A managed, **stateful network firewall and IPS for VPCs**. Firewall **endpoints** sit in dedicated **firewall subnets**, one per AZ; you change **route tables** so traffic passes through them (internet ingress/egress, between subnets, or centralised in an inspection VPC behind a transit gateway).',
        'Rules: **stateless** (5-tuple, fast) and **stateful** — **Suricata-compatible IPS signatures**, **domain lists** matched on the HTTP Host header and TLS SNI, protocol detection, geographic IP filtering, TLS inspection with ACM certificates.',
        'It filters **any protocol**, in and out, between networks. It is the answer to “only these domains outbound”, “IPS between VPCs”, “inspect all traffic centrally”.',
        'It is **not** in front of CloudFront, S3 or API Gateway, it does not read HTTP requests the way WAF does, and for one blocked CIDR a free NACL rule is cheaper (Session 3).'] },
      { callout: 'Since **June–July 2025** Network Firewall can attach **natively to a Transit Gateway** (attachment type “network function”, appliance mode on automatically): no inspection VPC or firewall subnets to build. Older designs with an inspection VPC are still valid answers.', kind: 'update' },
      { pair: 'waf-nfw' },
      { table: { head: ['Scenario', 'Network Firewall?', 'Answer'], key: true, label: 'When Network Firewall is a distractor', rows: [
        ['SQL injection / XSS on an ALB or CloudFront', 'no — HTTP at the entry point', '{edge|WAF}'],
        ['one IP range must be blocked, cheapest', 'no — overkill', 'NACL deny rule'],
        ['DDoS on CloudFront / Route 53', 'no — edge volume', '{edge|Shield}'],
        ['detect compromised instances', 'no — detection', '{detect|GuardDuty}'],
        ['outbound only to approved domains, IPS, many VPCs', '**yes**', '{nfw|Network Firewall}']] } },
      { callout: 'You picked Network Firewall in the baseline where nothing crossed a VPC boundary needing stateful inspection. The line to remember: **WAF for requests, Network Firewall for networks, NACLs for single ranges, Shield for floods.**', kind: 'miss', title: 'Your misses' },
      { check: fromDrill('S5', 'Exam pattern') },
      { drills: ['S5', 'S22', 'S24', 'S2', 'S3'] }
    ] },

    /* ---------------------------------------------------------------- 9 */
    { id: 'ch9', title: 'Detection: GuardDuty, Inspector, Macie', domains: 'D1', blocks: [
      'Three managed detectors, three different questions. None of them blocks anything; each produces **findings** that go to the console, to **EventBridge** (for automated response) and to Security Hub.',
      { h: 'Amazon GuardDuty — “is someone attacking or misusing my account?”' },
      { ul: [
        '**Foundational sources**, read automatically: **CloudTrail management events**, **VPC Flow Logs** and **Route 53 DNS query logs**. GuardDuty uses its **own independent copy** — you do not need to enable flow logs or a trail for it, and it does not give you those logs.',
        '**Protection plans** extend it: **S3 Protection** (S3 data events), **EKS Protection** (audit logs), **Runtime Monitoring** (an agent on EKS, ECS including Fargate, EC2), **Malware Protection** for EC2 (scans EBS volumes) and for S3 (new uploads), **RDS Protection** (login activity), **Lambda Protection** (network activity).',
        'Findings: crypto-mining, communication with command-and-control servers, credential exfiltration, calls from Tor or known-bad IPs, unusual API activity, malware.',
        'Multi-account: a **delegated administrator** in AWS Organizations enables it for member accounts, per Region. 30-day free trial per account and Region.',
        'Tuning: **suppression rules** auto-archive expected findings; trusted and threat lists (now “entity lists”, which also take domains and file hashes).'] },
      { callout: '**Extended Threat Detection** (December 2024) is on by default at no extra cost: it correlates several signals over time into critical **attack sequence** findings (for EKS, and since December 2025 for EC2 and ECS). New plans since most courses: Runtime Monitoring, Malware Protection for S3 and for AWS Backup, AI Protection.', kind: 'update' },
      { h: 'Amazon Inspector — “is my software vulnerable?”' },
      { ul: [
        'Continuous **vulnerability management**: known **CVEs** in OS and language packages, and **network reachability** (paths from the internet to open ports).',
        '**EC2**: agent-based through the **SSM Agent**, or **hybrid** mode that adds **agentless** scanning of EBS snapshots for instances without the agent (the default for new customers). CIS benchmark scans on demand or scheduled.',
        '**ECR**: enhanced scanning of container images on push and continuously afterwards.',
        '**Lambda**: package vulnerabilities, and code scanning.',
        'Rescans automatically when a new CVE is published; the **Inspector score** adjusts CVSS for your environment.'] },
      { callout: '**Inspector Classic** (the assessment-template version in older courses) reached **end of support on 20 May 2026**. Current Inspector adds agentless EC2 scanning and **code security** for GitHub/GitLab repositories (GA June 2025). Its free trial is **15 days**.', kind: 'update' },
      { h: 'Amazon Macie — “is sensitive data sitting in S3?”' },
      { ul: [
        '**S3 only.** It inventories your buckets and flags those that are **public, unencrypted or shared** outside the account (policy findings).',
        '**Automated sensitive data discovery** samples objects across buckets continuously; **sensitive data discovery jobs** run once or on a schedule against chosen buckets.',
        '**Managed data identifiers** (names, addresses, passport and credit-card numbers, credentials …) and **custom** ones (your regex and keywords); allow lists for known-safe values.',
        'Multi-account through a delegated administrator; 30-day free trial for bucket monitoring and automated discovery.'] },
      { h: 'Route the signal' },
      { widget: 'findingRouter' },
      { pair: 'detect3' },
      { check: fromDrill('S25') },
      { check: fromDrill('S27') },
      { check: fromDrill('S28') },
      { drills: ['S25', 'S27', 'S28'] }
    ] },

    /* ---------------------------------------------------------------- 10 */
    { id: 'ch10', title: 'Posture and investigation: Security Hub, Detective, Security Lake', domains: 'D1', blocks: [
      'Once the detectors produce findings in 30 accounts and four Regions, two new questions appear: **how do we see all of it in one place and know how we score?** and **what exactly happened in this one incident?** Two different services answer them.',
      { h: 'AWS Security Hub (CSPM)' },
      { ul: [
        '**Aggregates findings** from GuardDuty, Inspector, Macie, IAM Access Analyzer, Firewall Manager and partner tools into one normalised format.',
        'Runs **security standards** as automated **controls**: **AWS Foundational Security Best Practices**, **CIS AWS Foundations Benchmark**, **PCI DSS**, **NIST SP 800-53** (and more), producing a **security score** per standard.',
        'Most controls are evaluated with **AWS Config rules**, so **AWS Config recording must be on** in every account and Region you check.',
        '**Multi-account**: a delegated administrator in Organizations with **central configuration**. **Multi-Region**: choose an **aggregation (home) Region** and link the others.',
        '**Automation rules** update findings automatically; findings and custom actions go to **EventBridge** for response.'] },
      { callout: 'In 2025 the original service was renamed **AWS Security Hub CSPM** (cloud security posture management: the standards, controls and aggregation above). A new **AWS Security Hub** (preview June 2025, **GA 2 December 2025**) sits on top: it **correlates** CSPM, GuardDuty, Inspector and Macie signals into prioritised **exposure findings** with an attack path graph, in **OCSF** format. Banks say “Security Hub” and mean the aggregation and standards — the answer does not change.', kind: 'update' },
      { h: 'Amazon Detective' },
      'Detective **investigates**. It continuously builds a **behaviour graph** from CloudTrail logs, VPC Flow Logs, GuardDuty findings, EKS audit logs and Security Hub findings, keeping up to a year of history. From a finding you pivot to an IP address, a role or an instance and see what it did, with whom, since when, and what is unusual about it. It answers **root cause** and **blast radius** questions. It does not detect on its own and it blocks nothing. AWS recommends using the same administrator account as GuardDuty and Security Hub.',
      { pair: 'hub-det' },
      { check: fromDrill('S26') },
      { check: fromDrill('S29') },
      { h: 'Three more names to recognise' },
      { table: { head: ['Service', 'Built for', 'Exam words'], key: true, rows: [
        ['{hub|Amazon Security Lake}', 'a **security data lake in your own S3**, normalised to **OCSF** (CloudTrail, VPC Flow Logs, Route 53 resolver logs, Security Hub findings, EKS audit logs, WAF logs, third-party sources), queried with Athena and others', 'centralise security logs from many accounts, long-term analysis, OCSF'],
        ['{hub|AWS Artifact}', 'on-demand download of **AWS’s own compliance reports** (SOC, PCI, ISO) and acceptance of **agreements** such as a HIPAA BAA', 'auditor wants AWS’s SOC 2 report, sign a BAA'],
        ['AWS Audit Manager', 'continuously collecting evidence of your AWS usage against audit frameworks', 'prepare for an audit, collect evidence']] } },
      { callout: '**AWS Audit Manager is no longer open to new customers** (availability change announced in 2026; existing customers keep using it). Recognise it in older questions; in new designs, evidence comes from Security Hub CSPM standards, Config conformance packs and Artifact.', kind: 'update' },
      { check: { id: 'ch10-artifact', q: 'An external auditor asks for AWS’s latest SOC 2 report for the data centres that host the company’s workloads. Where does the company get it?', opts: [
        { t: 'AWS Artifact', why: 'AWS’s own compliance reports, on demand.' },
        { t: 'Security Hub CSPM', why: 'scores your configuration, not AWS’s data centres.' },
        { t: 'Amazon Macie', why: 'finds sensitive data in S3.' },
        { t: 'AWS Config', why: 'records your resources’ configuration.' }], a: 0,
        why: 'Reports about AWS itself → Artifact. Reports about your own configuration → Security Hub CSPM / Config.' } },
      { drills: ['S26', 'S29'] }
    ] },

    /* ---------------------------------------------------------------- 11 */
    { id: 'ch11', title: 'Cognito: user pools and identity pools', domains: 'D1', blocks: [
      'Amazon Cognito handles the **end users of your application** — the people who download your app or sign up on your website. (Your own employees reaching AWS accounts are IAM Identity Center, Session 6.) It has two halves that the exam keeps separate.',
      { h: 'User pools: who is this user?' },
      { ul: [
        'A **user directory** that scales to millions: sign-up, sign-in, password policies, account recovery, **MFA** (SMS, authenticator apps, email).',
        '**Federation**: sign in with **Google, Apple, Facebook, Amazon**, or any **SAML** or **OIDC** identity provider; the user pool normalises them into one set of tokens.',
        'Ready-made sign-in pages: **managed login** (formerly the hosted UI) on your own domain, or your own UI through the API.',
        'Output: an **ID token** and an **access token** (both **JWTs**) and a refresh token.',
        '**Lambda triggers** customise the flow: pre sign-up, pre and post authentication, pre token generation, migrate user, custom challenges.',
        'The tokens are checked by an **ALB** (`authenticate-cognito` action on an HTTPS listener), by **API Gateway** (Cognito user pool authorizer for REST, JWT authorizer for HTTP APIs), or by your own code.'] },
      { h: 'Identity pools: what AWS resources may this user call?' },
      { ul: [
        'An identity pool **exchanges a token** — from a user pool, Google, Apple, SAML, OIDC — **for temporary AWS credentials** (STS), using an **IAM role** you attach.',
        '**Authenticated** users get one role; **guest (unauthenticated)** users can get another, narrow role — no sign-in at all.',
        'Role-based access control: choose the role from token claims or rules; the role’s policy can use the identity ID to confine each user to their own S3 prefix or DynamoDB items.',
        'Use it when the app calls **AWS services directly** (S3 uploads, DynamoDB, IoT) without a backend in between.'] },
      { widget: 'cognitoFlow' },
      { pair: 'cognito' },
      { h: 'Feature plans' },
      { table: { head: ['Plan', 'Adds', 'Notes'], key: true, rows: [
        ['Lite', 'sign-up, sign-in, classic hosted UI, social / SAML / OIDC federation', 'what existing pools were moved to'],
        ['Essentials', '**managed login**, **passwordless** (passkeys, email or SMS codes), email MFA, access-token customisation', '**default for new user pools**'],
        ['Plus', '**threat protection** (formerly “advanced security features”): adaptive authentication, compromised-credential detection, user activity logs', 'no free tier']] } },
      { callout: 'Since **November 2024**: feature plans **Lite / Essentials / Plus**, the hosted UI became **managed login**, **passwordless** sign-in, and “advanced security features” became **threat protection** in Plus. The free tier is **10,000 monthly active users** for Lite and Essentials (older material: 50,000). Identity pools are free. WAF can also protect a user pool against sign-in abuse.', kind: 'update' },
      { check: fromDrill('S30') },
      { check: { id: 'ch11-alb', q: 'An internal web app on EC2 behind an ALB must require users to sign in, with the least code changes. Users are in a Cognito user pool. What do you configure?', opts: [
        { t: 'An identity pool and IAM roles for each user.', why: 'AWS credentials are not needed to reach a web page.' },
        { t: 'A listener rule with the authenticate-cognito action on the ALB’s HTTPS listener, then forward to the target group.', why: 'the ALB handles the login redirect and passes the user’s claims to the app.' },
        { t: 'A WAF rule that checks for a password header.', why: 'WAF filters requests; it does not sign users in.' },
        { t: 'An ACM certificate on each instance.', why: 'TLS is not authentication.' }], a: 1,
        why: 'ALB + user pool: authentication at the load balancer, HTTPS listener required, session cookie afterwards. The app reads the claims from headers.' } },
      { drills: ['S30'] }
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
      'S1–S5 carry your prestige pattern and are marked as yours in the drill (source “Exam pattern”, tag C). In S1–S3 ACM, Network Firewall and Shield Advanced are tempting and wrong; in S4 and S5 ACM and Network Firewall are the answer. More than a dozen other drills put a prestige service among the options. Run the 30 scenarios once; your new misses appear in Progress.',
      { link: '#drill', text: 'Go to the drill (30 scenarios)', btn: true }
    ] }
  ];
})();
