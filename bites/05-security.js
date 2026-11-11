/* Feed bites — Session 5, security services & identity. Facts: sessions/05-security/learn.js chapters in src,
   docs/session-05-security.md (verified 2026-09-25). Ledger: docs/feed-bites.md. */
window.SAA_BITES = (window.SAA_BITES || []).concat([
  {
    id: 'sec-kms-envelope', sid: '05-security', title: 'KMS and envelope encryption', domains: ['D1'], src: ['ch3', 'ch4'],
    text: 'A **KMS key** is a master key locked in a vault: it never leaves, and the vault’s slot takes only something small, such as a password or another key. So data is locked with a **data key** instead. **GenerateDataKey** hands that key out twice, once plain and once sealed under the KMS key; you encrypt the data locally, erase the plain copy and store the sealed one beside the ciphertext. Reading means asking KMS to unseal it, which checks the key policy and logs the call.',
    qs: [
      { id: 'q1', q: 'A web app must encrypt two things under one customer managed KMS key: each user’s 1 KB API token, and nightly 300 MB report files. Which approach works with the FEWEST calls to KMS?', words: ['1 KB API token', '300 MB report files', 'FEWEST calls'],
        expl: 'Encrypt takes at most 4 KB of plaintext: enough for a token, nowhere near enough for a report. The reports need envelope encryption: one GenerateDataKey call per file, the data encrypted locally, and the sealed data key stored beside it.',
        opts: [
          { t: 'Call Encrypt per token, and send each whole report file to Encrypt in one call', why: 'Encrypt accepts at most 4 KB of plaintext, so every report call is refused.' },
          { t: 'Call Encrypt per token, and GenerateDataKey once per report to encrypt it locally', ok: true, why: 'The token fits the Encrypt limit; each report costs one call for its data key and is encrypted locally.' },
          { t: 'Call Encrypt per token, and call Encrypt on every 4 KB chunk of each report', why: 'It works, but 4 KB chunks turn every report into thousands of KMS calls: slow, expensive and throttled.' },
          { t: 'Call Encrypt per token, and GenerateDataKeyWithoutPlaintext to encrypt each report', why: 'That call returns only the encrypted data key; there is no plaintext key to encrypt the report with.' }] },
      { id: 'q2', q: 'Backups are envelope-encrypted under one customer managed KMS key and copied to three accounts and an on-premises archive. During an investigation of unknown length no copy may be decrypted, but access must be restorable afterwards. Which action meets these requirements with the LEAST effort?', words: ['no copy may be decrypted', 'restorable afterwards', 'unknown length'],
        expl: 'Every copy, wherever it lives, needs a KMS call to unseal its data key. Disabling the key closes that one gate for all copies at once and can be undone. Deletion becomes final after its waiting period, and rotation keeps the old material working.',
        opts: [
          { t: 'Schedule the KMS key for deletion, and cancel it once the investigation ends', why: 'Calls fail while it waits, but the wait is 7 to 30 days; if the investigation runs longer, every copy is lost.' },
          { t: 'Rotate the KMS key on demand, so its old key material no longer opens the data keys', why: 'Rotation keeps every old version of the key material, so older ciphertext still decrypts.' },
          { t: 'Disable the KMS key, so every Decrypt call for the data keys fails until re-enabled', ok: true, why: 'Each copy depends on KMS to unseal its data key; disabling the key stops that and is reversible at any time.' },
          { t: 'Find every copy and delete the encrypted data key stored beside its ciphertext', why: 'Every location must be visited, and a copy without its sealed data key can never be decrypted again.' }] },
      { id: 'q3', q: 'A production account envelope-encrypts export files, and a separate analytics account must decrypt them. Every decryption must be logged in CloudTrail, with the LEAST operational overhead. Which key setup works?', words: ['separate analytics account', 'logged in CloudTrail'],
        expl: 'KMS checks the key policy first, and the key policy is the only way to let another account use a key. AWS managed keys never leave their own account. Copying plain data keys out skips KMS, and with it the CloudTrail record of each use.',
        opts: [
          { t: 'The AWS managed key aws/s3, with an IAM policy in analytics that allows Decrypt', why: 'An AWS managed key cannot be used from another account, and its key policy cannot be edited.' },
          { t: 'A customer managed key whose key policy lets the analytics account call Decrypt', ok: true, why: 'The key policy is the way to let another account use the key, and each Decrypt call is logged.' },
          { t: 'A customer managed key, and a production IAM policy that names the analytics role', why: 'IAM in the key’s account cannot let another account in; only the key policy can.' },
          { t: 'A customer managed key, with each plain data key shared through Secrets Manager', why: 'Analytics would decrypt with the plain key and never call KMS, so nothing would be logged in CloudTrail.' }] }
    ]
  },
  {
    id: 'sec-secrets-params', sid: '05-security', title: 'Secrets Manager vs Parameter Store', domains: ['D1', 'D4'], src: ['ch6'],
    text: '**Secrets Manager** is a locker that changes its own combination: it holds passwords, API keys and tokens, **rotates** them on a schedule and can copy them to another Region. **Parameter Store** is a labelled filing cabinet for configuration such as endpoints, feature flags and IDs; a **SecureString** value is encrypted with KMS, and the standard tier is free. The cabinet never rotates anything. A value that must change itself goes in the locker; plain settings, kept cheaply, go in the cabinet.',
    qs: [
      { id: 'q1', q: 'A Lambda function calls a payment provider with an API key. The provider’s API can issue a new key, and the company must rotate the key automatically every 60 days with no manual steps. Which solution meets this requirement?', words: ['rotate the key automatically', 'payment provider'],
        expl: 'Rotation is why Secrets Manager exists. Managed rotation is built in only for RDS, Aurora, DocumentDB and Redshift credentials; a third-party key needs a Lambda rotation function that asks the provider for a new key. Parameter Store never rotates.',
        opts: [
          { t: 'Store it in Secrets Manager and turn on managed rotation, so no function is needed', why: 'Managed rotation covers RDS, Aurora, DocumentDB and Redshift credentials; anything else uses a Lambda rotation function.' },
          { t: 'Store it as an advanced SecureString parameter with a policy that rotates it', why: 'Parameter Store has no built-in rotation; advanced parameter policies only expire a value or notify.' },
          { t: 'Store it in a file encrypted under a customer managed KMS key with automatic rotation', why: 'Rotating the KMS key changes its key material, not the provider’s API key.' },
          { t: 'Store it in Secrets Manager with a Lambda rotation function that calls the provider', ok: true, why: 'A secret outside the managed-rotation engines rotates through a Lambda rotation function.' }] },
      { id: 'q2', q: 'A team is creating an Amazon RDS for PostgreSQL DB instance. Nobody should ever see or type the master user password, and it must be generated, stored and rotated. Which solution meets these requirements with the LEAST operational overhead?', words: ['master user password', 'Nobody should ever see', 'LEAST operational overhead'],
        expl: '`ManageMasterUserPassword` hands the whole job to RDS: it generates the master password, stores it in Secrets Manager and rotates it. Typing a password means someone has seen it, and Parameter Store cannot rotate.',
        opts: [
          { t: 'Have RDS manage the master user password in Secrets Manager for the instance', ok: true, why: 'RDS generates the password, stores it in Secrets Manager and rotates it; no person handles it.' },
          { t: 'Type a password, store it in Secrets Manager, and write a Lambda rotation function', why: 'Someone typed the password, and the function is code to maintain; RDS can manage it for you.' },
          { t: 'Type a password, and store it as a SecureString parameter for the app to read', why: 'Someone has seen the password, and Parameter Store has no built-in rotation.' },
          { t: 'Let RDS generate the password, and keep it in Parameter Store with an expiry policy', why: 'RDS manages the master password in Secrets Manager, and a parameter policy only expires a value or notifies.' }] },
      { id: 'q3', q: 'A service reads a 6 KB JSON settings document per environment, as one value in one call. Nothing in it is secret and nothing rotates. Which storage meets this at the LOWEST cost?', words: ['6 KB', 'one value', 'LOWEST cost'],
        expl: 'Over 4 KB rules out the free standard tier. Advanced parameters hold values up to 8 KB for $0.05 per parameter per month. Secrets Manager charges $0.40 per secret and is built for values that rotate.',
        opts: [
          { t: 'A Parameter Store standard parameter, free of charge, under each environment path', why: 'Standard parameters are free but hold at most 4 KB, so the document does not fit.' },
          { t: 'A Parameter Store advanced parameter, holding values up to 8 KB, per environment', ok: true, why: 'Advanced parameters take values up to 8 KB, at $0.05 per parameter per month.' },
          { t: 'A Parameter Store standard StringList parameter, with each setting as one list item', why: 'A StringList is still one standard value, limited to 4 KB.' },
          { t: 'A Secrets Manager secret per environment, read at start-up with GetSecretValue', why: 'At $0.40 per secret per month it costs eight times an advanced parameter, for a value that is not secret.' }] },
      { id: 'q4', q: 'A central account publishes approved AMI IDs and endpoint names that 20 member accounts in the same Region must read directly from the source. The values are plain configuration. Which solution has the LEAST operational overhead?', words: ['20 member accounts', 'read directly from the source', 'LEAST operational overhead'],
        expl: 'Sharing with other accounts is an advanced-tier feature, next to 8 KB values and parameter policies. Secrets Manager replication copies secrets to other Regions, not to other accounts.',
        opts: [
          { t: 'Standard parameters in the central account, shared with each of the member accounts', why: 'Sharing with other accounts is an advanced-tier feature; standard parameters cannot be shared.' },
          { t: 'Standard parameters copied into every member account by a scheduled Lambda function', why: 'It works, but the copy job is code to maintain, and the members read copies, not the source.' },
          { t: 'Secrets Manager secrets in the central account, replicated to each member account', why: 'Replication copies a secret to other Regions, not to other accounts, and each replica is billed.' },
          { t: 'Advanced parameters in the central account, shared with each of the member accounts', ok: true, why: 'Advanced parameters can be shared with other accounts, so the members read the central values.' }] }
    ]
  },
  {
    id: 'sec-waf-shield-nfw', sid: '05-security', title: 'WAF vs Shield vs Network Firewall', domains: ['D1'], src: ['ch7', 'ch8'],
    text: '**AWS WAF** is the receptionist at the front door: it reads each HTTP request arriving at CloudFront, an ALB or an API Gateway REST API and turns away SQL injection, bad bots and clients asking too often. **Shield** is the flood wall against DDoS: Standard is free and always on, Advanced adds a response team and cost protection. **Network Firewall** guards the roads in and out of your VPCs, filtering any protocol by domain or IPS signature. Requests, floods, networks.',
    qs: [
      { id: 'q1', q: 'A payments VPC and eight application VPCs are connected through a transit gateway. All traffic between them must pass stateful intrusion prevention with Suricata-compatible signatures. Which solution meets this requirement?', words: ['traffic between them', 'intrusion prevention'],
        expl: 'Stateful IPS on traffic crossing VPC boundaries is Network Firewall’s built-for job, and since 2025 it attaches to a transit gateway natively. WAF reads HTTP at web entry points, Shield handles floods, and security groups know only ports and addresses.',
        opts: [
          { t: 'Associate an AWS WAF web ACL with the transit gateway, using the core rule set group', why: 'WAF attaches to web entry points such as CloudFront, ALB and API Gateway, not to a transit gateway.' },
          { t: 'Attach AWS Network Firewall to the transit gateway, with stateful Suricata IPS rules', ok: true, why: 'Stateful IPS between VPCs is its job, and it can attach natively to a transit gateway.' },
          { t: 'Subscribe to AWS Shield Advanced, and protect the transit gateway of all nine VPCs', why: 'Shield Advanced protects resources such as CloudFront, ALB and Elastic IPs from DDoS; it runs no IPS signatures.' },
          { t: 'Add security group rules in each VPC that allow only the payment ports between them', why: 'Security groups filter ports and IP ranges; they cannot run intrusion signatures.' }] },
      { id: 'q2', q: 'A startup’s website runs behind an internet-facing Application Load Balancer. It wants protection against common network-layer (L3/L4) DDoS attacks at NO additional cost. What should it do?', words: ['NO additional cost', 'L3/L4'],
        expl: 'Shield Standard is free and on for every customer, against common L3/L4 DDoS on all AWS resources. Shield Advanced costs $3,000 a month, and WAF and Network Firewall are built for other jobs.',
        opts: [
          { t: 'Subscribe to AWS Shield Advanced, and add the ALB to it as a protected resource', why: 'Shield Advanced costs $3,000 per month with a one-year commitment, which is not no additional cost.' },
          { t: 'Associate an AWS WAF web ACL with the ALB, with a rate-based rule on each source IP', why: 'WAF is billed per web ACL, rule and request, and it reads HTTP requests, not L3/L4 floods.' },
          { t: 'Rely on AWS Shield Standard, which already guards the ALB against common L3/L4 attacks', ok: true, why: 'Shield Standard is free, on for every customer, and covers common L3/L4 DDoS on all AWS resources.' },
          { t: 'Deploy AWS Network Firewall in front of the ALB, with stateless rules that drop floods', why: 'It adds firewall endpoints and route changes to run, while Shield Standard already covers common L3/L4 DDoS for free.' }] },
      { id: 'q3', q: 'A multiplayer game runs on EC2 instances behind a Network Load Balancer with Elastic IPs. After large DDoS attacks, the company, which has Enterprise Support, requires 24/7 help from AWS DDoS experts during attacks. Which solution meets this requirement?', words: ['Network Load Balancer', 'AWS DDoS experts'],
        expl: 'DDoS experts on call means the Shield Response Team, which comes with Shield Advanced (and needs Business or Enterprise Support). Shield Advanced protects an NLB through its Elastic IPs; WAF cannot attach to an NLB at all.',
        opts: [
          { t: 'Subscribe to Shield Advanced, and protect the Network Load Balancer’s Elastic IPs', ok: true, why: 'The Shield Response Team comes with Shield Advanced, which protects EC2 and NLB through their Elastic IPs.' },
          { t: 'Associate an AWS WAF web ACL with the Network Load Balancer, with rate-based rules', why: 'A web ACL cannot be associated with a Network Load Balancer.' },
          { t: 'Rely on Shield Standard, which already covers the Elastic IPs, and alarm on attacks', why: 'Shield Standard has no response team; the experts come only with Shield Advanced.' },
          { t: 'Deploy AWS Network Firewall in the game VPC, with rules that drop attack flows', why: 'Network Firewall inspects VPC traffic and brings no Shield Response Team with it.' }] },
      { id: 'q4', q: 'An Amazon API Gateway HTTP API receives SQL injection attempts. The team wants AWS managed WAF rules to inspect every request, including clients that call the API endpoint directly. Which change works?', words: ['HTTP API', 'call the API endpoint directly'],
        expl: 'WAF attaches to API Gateway REST APIs, not HTTP APIs. CloudFront in front leaves the API’s own endpoint open, and Network Firewall filters VPC traffic, not requests at the API’s public front door.',
        opts: [
          { t: 'Associate the web ACL with the HTTP API stage, using the SQL database managed group', why: 'WAF does not support API Gateway HTTP APIs.' },
          { t: 'Put CloudFront in front of the HTTP API, and attach the web ACL to the distribution', why: 'Clients can still call the API’s own endpoint directly, so their requests skip the web ACL.' },
          { t: 'Deploy AWS Network Firewall in the backend’s VPC, with SQL injection signature rules', why: 'The public endpoint never passes the firewall, and it does not read HTTP requests the way WAF does.' },
          { t: 'Move the API to an API Gateway REST API, and associate the web ACL with its stage', ok: true, why: 'REST APIs are supported WAF resources; HTTP APIs are not.' }] }
    ]
  },
  {
    id: 'sec-detect', sid: '05-security', title: 'GuardDuty vs Inspector vs Macie', domains: ['D1'], src: ['ch9'],
    text: 'Three detectors patrol different things. **GuardDuty** is the guard at the cameras: it reads account and network activity for attacks and misuse, such as crypto-mining or stolen credentials. **Inspector** is the building inspector: it checks software on EC2, container images and Lambda for known vulnerabilities (CVEs). **Macie** is the auditor reading the filing cabinets, and its only cabinets are S3 buckets: it finds personal data and public or unencrypted buckets. None of them locks a door; each raises findings.',
    qs: [
      { id: 'q1', q: 'A new CVE is published for an OpenSSL package. The team must find every affected EC2 instance, including instances that do not run the SSM Agent. Which approach meets this requirement with the LEAST effort?', words: ['every affected EC2 instance', 'do not run the SSM Agent'],
        expl: 'Known CVEs in installed software are Inspector’s question. Hybrid mode adds agentless scans of EBS snapshots for instances without the SSM Agent; GuardDuty’s plans look for threats and malware, not vulnerable packages.',
        opts: [
          { t: 'Amazon Inspector in agent-based mode, which scans each instance through its SSM Agent', why: 'Agent-based scanning misses exactly the instances that do not run the SSM Agent.' },
          { t: 'GuardDuty Malware Protection for EC2, which scans the EBS volumes of every instance', why: 'It looks for malware, not for packages with known CVEs.' },
          { t: 'Amazon Inspector in hybrid mode, with agentless EBS snapshot scans for the rest', ok: true, why: 'Hybrid mode scans EBS snapshots of instances without the agent, and rescans when a new CVE is published.' },
          { t: 'GuardDuty Runtime Monitoring, which watches each instance’s processes through an agent', why: 'It watches runtime behaviour for threats, needs its own agent, and does not inventory package CVEs.' }] },
      { id: 'q2', q: 'When GuardDuty reports that an EC2 instance is talking to a command-and-control server, the instance must be isolated automatically, without waiting for a person. Which design meets this requirement?', words: ['isolated automatically', 'without waiting for a person'],
        expl: 'GuardDuty, Inspector and Macie never block anything. Their findings go to EventBridge for automated response, so a rule there starts whatever isolates the instance.',
        opts: [
          { t: 'Add the server’s IP to a GuardDuty threat list, so that GuardDuty blocks its traffic', why: 'Threat lists (now entity lists) tune findings; GuardDuty never blocks traffic itself.' },
          { t: 'An EventBridge rule on the finding that invokes a function to isolate the instance', ok: true, why: 'GuardDuty only detects; EventBridge is where its findings start an automated response.' },
          { t: 'Enable Inspector network reachability on the instance, so that the open path is closed', why: 'Inspector reports reachability paths; like every detector here, it closes nothing.' },
          { t: 'Turn on GuardDuty Runtime Monitoring, whose agent drops the connection on a finding', why: 'The Runtime Monitoring agent observes; like every GuardDuty plan, it detects and never blocks.' }] },
      { id: 'q3', q: 'Applications on EC2 write log files to their attached EBS volumes, and some lines may hold credit card numbers. A colleague proposes Amazon Macie to find them. Why does that plan fail?', words: ['EBS volumes', 'Amazon Macie'],
        expl: 'Macie is S3 only: it inventories buckets and samples their objects. Data on EBS volumes is outside its reach, whatever identifiers it has.',
        opts: [
          { t: 'Macie has no managed data identifier for credit card numbers, so it would find nothing', why: 'Credit-card numbers are among Macie’s managed data identifiers.' },
          { t: 'Macie needs the SSM Agent on each instance, and these log files are read only through it', why: 'That describes Inspector’s agent-based EC2 scanning; Macie reads S3 objects.' },
          { t: 'Macie runs only as one-time jobs, so log lines written later would never be checked', why: 'Automated sensitive data discovery samples continuously, and discovery jobs can also run on a schedule.' },
          { t: 'Macie inspects objects in S3 only, so files on the EBS volumes are outside its reach', ok: true, why: 'Macie works on S3 buckets and their objects; EBS volumes are not among them.' }] },
      { id: 'q4', q: 'Before enabling GuardDuty in 30 new accounts, a team plans to turn on VPC Flow Logs and a CloudTrail trail in each one to feed it. The company wants the LEAST setup work. What should the team know?', words: ['VPC Flow Logs', 'LEAST setup work'],
        expl: 'GuardDuty reads CloudTrail management events, VPC Flow Logs and Route 53 DNS query logs from its own independent copy. Nothing needs enabling first, and it does not hand those logs to you.',
        opts: [
          { t: 'GuardDuty reads only the flow logs, so the trail can be skipped while the flow logs stay', why: 'Its foundational sources are CloudTrail management events, flow logs and DNS logs, all from its own copy.' },
          { t: 'GuardDuty reads its own copy of those sources, so neither has to be turned on for it', ok: true, why: 'It uses an independent copy of CloudTrail management events, flow logs and DNS logs.' },
          { t: 'GuardDuty needs both sources first, plus Route 53 DNS query logging in every VPC', why: 'None of these needs enabling: GuardDuty reads its own copy of all three.' },
          { t: 'GuardDuty needs both, and then it exports the flow logs and trail to the team’s bucket', why: 'It does not give you those logs; it uses its own copy and returns findings.' }] }
    ]
  }
]);
