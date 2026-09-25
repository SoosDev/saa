/* Session 6 — the lesson. 12 chapters. Facts: docs/session-06-governance.md (verified 2026-09-25). */
(function () {
  'use strict';
  const S = window.SESSION;
  const fromDrill = (id, src) => {
    const d = S.drills.find(x => x.id === id);
    return { id: 'ck-' + id, src: src || d.src, q: d.q, opts: d.opts.map(o => ({ t: o.t, why: o.why })), a: d.opts.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0), why: d.expl };
  };

  const WHO = {
    start: 'root',
    nodes: {
      root: { q: 'Who needs to reach AWS?', opts: [
        { label: 'People who work for the company', sub: 'employees, contractors, admins', next: 'staff' },
        { label: 'Customers of an application the company builds', next: 'cust' },
        { label: 'Code running on AWS (EC2, Lambda, ECS …)', next: 'aws' },
        { label: 'Code running outside AWS (on-premises servers, another cloud)', next: 'out' },
        { label: 'Another company’s AWS account (a vendor or partner)', next: 'third' }] },
      staff: { q: 'Where are the employees’ identities today?', opts: [
        { label: 'In a cloud IdP such as Okta or Microsoft Entra ID', next: 'idcExt' },
        { label: 'In Active Directory (on premises or AWS Managed Microsoft AD)', next: 'idcAd' },
        { label: 'Nowhere yet; a small team', next: 'idcDir' }] }
    },
    results: {
      idcExt: { title: 'IAM Identity Center + external IdP', line: 'idc', text: 'Connect the IdP over **SAML 2.0** for sign-in and **SCIM** for automatic user and group provisioning. Assign **permission sets** to groups per account.', facts: ['A leaver disabled in the IdP loses access to every account', 'Organization instance in the management account (or a delegated admin)', 'No additional charge'], whyNot: [['IAM users', 'long-term credentials, one account at a time'], ['A SAML provider in every account', 'works, but N configurations to maintain']] },
      idcAd: { title: 'IAM Identity Center + Active Directory', line: 'idc', text: 'Use **AWS Managed Microsoft AD** as the identity source, or **AD Connector** to proxy sign-in to your self-managed AD (nothing is stored in AWS).', facts: ['AD groups map to permission sets', 'AD Connector caches nothing — it forwards each request'], whyNot: [['Simple AD', 'a separate Samba directory, and closed to new customers']] },
      idcDir: { title: 'IAM Identity Center directory', line: 'idc', text: 'Create users and groups in Identity Center’s own directory; you can switch to an external IdP later.', whyNot: [['IAM users', 'AWS recommends federation or Identity Center for humans']] },
      cust: { title: 'Amazon Cognito', text: 'User pools sign customers in (social, SAML, passwordless) and issue JWTs; identity pools hand out temporary AWS credentials. Session 5.', whyNot: [['IAM Identity Center', 'workforce only, not app customers']] },
      aws: { title: 'An IAM role', line: 'iam', text: 'An **instance profile** for EC2, an **execution role** for Lambda, a **task role** for ECS. Credentials are temporary and rotated automatically.', whyNot: [['Access keys in code or environment variables', 'long-term secrets that leak']] },
      out: { title: 'IAM Roles Anywhere', line: 'iam', text: 'The workload presents an **X.509 certificate** from a trusted CA (AWS Private CA or your own) and receives temporary credentials for a role.', facts: ['SCPs and permission boundaries still apply', 'For hybrid servers managed by SSM, the SSM hybrid activation provides its own credentials'], whyNot: [['IAM user access keys on the server', 'long-term keys to rotate and protect']] },
      third: { title: 'Cross-account role with an external ID', line: 'iam', text: 'The vendor assumes a role in your account. The trust policy names the vendor’s account and requires an **external ID** that is unique to you.', facts: ['Protects against the confused deputy', 'Revoke by editing the trust policy'], whyNot: [['Sharing keys or root credentials', 'never']] }
    }
  };

  const SHARE = {
    start: 'root',
    nodes: {
      root: { q: 'What must other accounts be able to use?', opts: [
        { label: 'A network: subnets, a transit gateway, DNS rules, prefix lists', next: 'net' },
        { label: 'Data in S3, a KMS key, an SQS queue, an SNS topic, a Lambda function', next: 'data' },
        { label: 'Many AWS services and actions in my account', sub: 'e.g. a vendor or an ops team working in the account', next: 'role' },
        { label: 'Approved CloudFormation / Terraform products to launch', next: 'sc' }] },
      net: { q: 'Should the other accounts put their resources into your VPC, or keep their own VPCs?', opts: [
        { label: 'Into one central VPC the network team owns', next: 'vpcshare' },
        { label: 'Keep their own VPCs; they must route to each other or on-premises', sub: 'many VPCs', next: 'tgw' },
        { label: 'Just two VPCs need to talk, cheaply', next: 'peer' },
        { label: 'Use shared DNS forwarding rules or prefix lists', next: 'ramdns' }] }
    },
    results: {
      vpcshare: { title: 'VPC sharing through AWS RAM', line: 'ram', text: 'Share subnets from the network account with accounts or OUs **in the same organization**. Participants launch EC2, RDS, Lambda … into them; the owner keeps the VPC, route tables, NACLs and gateways.', facts: ['Subnets of a default VPC cannot be shared', 'Security groups can also be shared (org only)', 'Participants pay for their resources; the owner pays for NAT gateways, VPC endpoints and similar'], whyNot: [['Transit Gateway', 'connects separate VPCs; here there is one'], ['VPC peering', 'still one VPC per account']] },
      tgw: { title: 'Transit Gateway shared through AWS RAM', line: 'ram', text: 'Create the transit gateway in a network account, share it with the organization through RAM, and let each account attach its VPCs. Route tables in the TGW control who reaches whom; a Direct Connect gateway or VPN connects on-premises.', facts: ['Billed per attachment-hour and per GB (Session 3)'], whyNot: [['Full-mesh peering', 'not transitive, n×(n−1)/2 connections']] },
      peer: { title: 'VPC peering', text: 'A direct, non-transitive link between two VPCs, also across accounts and Regions (Session 3). No RAM needed: one side requests, the other accepts.', whyNot: [['Transit Gateway', 'hourly attachments for two VPCs']] },
      ramdns: { title: 'AWS RAM resource share', line: 'ram', text: 'Share Route 53 VPC Resolver rules, DNS Firewall rule groups, prefix lists or IPAM pools with the organization; accounts associate them with their VPCs.', facts: ['No invitations inside an organization with sharing enabled'], whyNot: [['Copies in every account', 'drift and duplicate endpoint charges']] },
      data: { title: 'Resource-based policy', line: 'iam', text: 'Grant the other account (or the whole organization with `aws:PrincipalOrgID`) in the bucket, key, queue, topic or function policy. The caller also needs an identity policy that allows the action.', facts: ['S3 buckets are not shared through RAM'], whyNot: [['AWS RAM', 'not a shareable type for these']] },
      role: { title: 'Cross-account IAM role', line: 'iam', text: 'Create a role in your account whose trust policy names the other account (plus an external ID for a third party) and whose permissions policy grants what they need.', whyNot: [['IAM users', 'long-term credentials for outsiders']] },
      sc: { title: 'AWS Service Catalog portfolio', text: 'Share a portfolio of approved products with the organization or OUs; a launch constraint role provisions the resources so users need no underlying permissions.', whyNot: [['Handing out templates', 'users would need every underlying permission']] }
    }
  };

  S.learn = [
    /* ---------------------------------------------------------------- 1 */
    { id: 'ch1', title: 'How to read a governance question', domains: 'D1 D4', blocks: [
      'This cluster sits in **D1 (Secure, 30%)** with a slice of **D4 (Cost-optimized, 20%)**. The questions share a shape: a company with several or many AWS accounts wants something to be true everywhere — nobody may use a Region, employees sign in once, one network is shared, every account is checked, one bill is paid. The options are all real governance services. Most of them are too big, too small or aimed at the wrong side of the problem.',
      { h: 'Your record on this cluster' },
      { table: { head: ['Where', 'What happened', 'What it teaches', 'Tag'], rows: [
        ['baseline Q49', 'missed “**config changes**” → AWS Config', 'a keyword that names a service', '**K** missed keyword'],
        ['baseline, a multi-VPC question', '**Transit Gateway** picked where it had no role', 'name the job before keeping a big service', '**C** prestige distractor'],
        ['same habit in Sessions 3–5', 'Global Accelerator, Network Firewall, ACM', 'the most impressive option is rarely the answer', '**C**']] } },
      { callout: 'Drills **G1–G5** and five cards come from this pattern and are marked as yours (source **“Exam pattern”**, tag **C**). In G1–G3 **Control Tower**, **Transit Gateway** and **Network Firewall** are tempting and wrong; in G4 and G5 Control Tower and Transit Gateway are genuinely right. The skill is to say what each one is built for before you keep it.', kind: 'miss', title: 'Your misses' },
      { h: 'Ask first: where must it apply, and what must happen?' },
      'Strip the scenario to two things. **Scope**: one account, an OU, the whole organization, or another account? **Control**: must something be **prevented**, **detected**, **granted**, **shared**, **remediated**, or must accounts be **provisioned**? Those two pick the family almost every time:',
      { table: { head: ['Control', 'One account', 'OU or whole organization', 'Across accounts'], key: true, rows: [
        ['prevent', 'IAM policy, {iam|permission boundary}', '{org|SCP}, {org|RCP}, declarative policy', '{org|RCP} (outsiders on your resources)'],
        ['detect', '{config|Config rule}, CloudTrail', '{config|conformance pack} + aggregator, {iam|Access Analyzer}', '{iam|Access Analyzer} (external access)'],
        ['grant', '{iam|identity / resource policy}', '{idc|Identity Center} permission sets', '{iam|role + trust policy}, resource policy'],
        ['share', '—', '{ram|RAM} (VPC sharing, TGW, Resolver rules)', '{ram|RAM}, resource policy'],
        ['remediate', '{config|Config + SSM Automation}', 'org conformance pack with remediation', '—'],
        ['provision', 'Service Catalog', '{ct|Control Tower} + Account Factory', '—']] } },
      { h: 'The stub for this session' },
      'Session 5’s slots (asset, layer, mode) do not separate these services: almost everything here protects “the account”. This session uses four new slots:',
      { table: { head: ['Slot', 'Ask', 'Values', 'What it kills'], rows: [
        ['SCOPE', 'Where must it hold?', '`one account` · `OU` · `whole org` · `cross-account`', 'a permission boundary for “every account”; an SCP for one role; Control Tower for one account'],
        ['CONTROL', 'What must happen?', '`prevent` · `detect` · `grant` · `share` · `remediate` · `provision`', 'Config to prevent; an SCP to grant; Transit Gateway to share one VPC'],
        ['WHO', 'Who is acting?', '`workforce human` · `workload` · `app customer` · `third party` · `AWS service`', 'Cognito for employees; IAM users for a vendor; `aws:PrincipalOrgID` for a service principal'],
        ['SUPERLATIVE', 'What is optimised?', '`least ops` · `least privilege` · `cheapest` · `fastest` · `none stated`', 'custom scripts under “least ops”; AdministratorAccess under “least privilege”']] } },
      '**Least privilege** gets its own value here because IAM questions use it constantly: of two options that both work, the one that grants less wins.',
      { pre: S.method, label: 'The method' },
      { h: 'Built for — one line each' },
      { hooks: [
        ['Organizations', '**groups accounts** into OUs, one bill, and attaches policies to them.'],
        ['SCP', 'the **maximum permissions** for principals in member accounts. Grants nothing.'],
        ['RCP', 'the **maximum permissions on resources** in member accounts, against any caller.'],
        ['Declarative policy', '**sets a service configuration** (EC2, VPC) in every account and keeps it.'],
        ['IAM policies', '**grant** (identity, resource) or **cap** (boundary, session policy) one principal’s access.'],
        ['STS / roles', '**temporary credentials** by assuming a role; trust policy says who may.'],
        ['Access Analyzer', 'finds resources and roles **reachable from outside** your account or organization.'],
        ['IAM Identity Center', 'your **workforce** signs in once to **many accounts**.'],
        ['Control Tower', 'builds and governs a **landing zone**; vends governed accounts.'],
        ['RAM', '**shares a resource** (subnets, TGW, DNS rules …) with other accounts.'],
        ['AWS Config', '**records configuration** and **checks compliance**; remediates via SSM.'],
        ['Consolidated billing', '**one bill**, pooled volume tiers, **shared RI/SP discounts**.']], label: 'Built for' },
      { h: 'Try it on G1' },
      'One of your pattern drills. Fill the four slots before you look at the options. Then ask of the option with Control Tower in it: which slot does it fail?',
      { widget: 'stubTrainer', args: { drill: 'G1', title: 'Stub trainer · G1 (exam pattern)', why: {
        scope: '60 member accounts in several OUs — the whole organization.',
        control: '“no one … can create” — the action must be blocked, not found.',
        who: 'the people in the accounts, administrators included.',
        sup: '“least operational overhead”.' } } },
      { check: { id: 'ch1-ct', src: 'Exam pattern', q: 'An option says “Set up AWS Control Tower and enable its Region deny control” for an organization that already exists and needs only that one rule. Why cross it out?', opts: [
        { t: 'Control Tower cannot deny Regions.', why: 'it can — its Region deny control is an SCP underneath.' },
        { t: 'It fails the SUPERLATIVE: a whole landing zone and account enrollment for what one SCP does.', why: 'the job is one guardrail; the built-for job of Control Tower is a governed landing zone.' },
        { t: 'It fails SCOPE: Control Tower works on one account only.', why: 'false; it governs OUs and accounts across the organization.' },
        { t: 'Control Tower costs a large monthly fee.', why: 'there is no extra charge; you pay for the services it uses.' }], a: 1,
        why: 'Name the built-for job first: Control Tower = set up and govern many accounts. When the organization exists and the need is one restriction, an SCP is the least-effort answer.' } },
      { check: { id: 'ch1-tgw', src: 'Exam pattern', q: 'Before keeping an option with **Transit Gateway** in it, which question should you be able to answer “yes”?', opts: [
        { t: 'Are there many accounts?', why: 'many accounts can share one VPC with RAM and no transit gateway at all.' },
        { t: 'Do many separate VPCs (or on-premises networks) need to route to each other?', why: 'that is its built-for job: a transitive hub.' },
        { t: 'Is the question about networking?', why: 'most networking questions have simpler answers (peering, VPC sharing, endpoints).' }], a: 1,
        why: 'Transit Gateway = hub for many separate VPCs and on-premises. One central VPC for many accounts → VPC sharing (RAM).' } }
    ] },

    /* ---------------------------------------------------------------- 2 */
    { id: 'ch2', title: 'The governance map: structure, guardrails, identity, sharing, records', domains: 'D1 D4', blocks: [
      'Why many accounts at all? An AWS account is the strongest **boundary** AWS has: for security (a compromised role in Dev cannot touch Prod), for quotas, and for billing (costs split by account). Companies therefore run tens or thousands of accounts. Every service in this session exists because many accounts need to be managed **as one**.',
      { h: 'Six jobs' },
      { table: { head: ['Job', 'Services', 'What “done” looks like'], key: true, rows: [
        ['**Structure**', '{org|Organizations}: management account, OUs, member accounts', 'accounts grouped by purpose (Security, Infrastructure, Workloads, Sandbox)'],
        ['**Guardrails**', '{org|SCPs}, {org|RCPs}, declarative policies, {ct|Control Tower controls}', 'some things are impossible in every account, whatever IAM says'],
        ['**Permissions**', '{iam|IAM policies, roles, STS}, {iam|Access Analyzer}', 'each principal can do exactly its job, across accounts when needed'],
        ['**Workforce identity**', '{idc|IAM Identity Center}', 'employees sign in once and reach the accounts they need'],
        ['**Sharing**', '{ram|RAM}, resource policies, Service Catalog', 'one VPC, one transit gateway, one set of DNS rules used by many accounts'],
        ['**Records and money**', '{config|AWS Config}, CloudTrail (Session 11), {billing|consolidated billing}', 'every change recorded and checked; one bill with pooled discounts']] } },
      'Two words do most of the sorting. **Prevent, deny, restrict, cannot, even administrators** point to guardrails. **Detect, audit, report, noncompliant, history** point to Config (and CloudTrail for “who”). A question that asks to prevent something and offers only Config is testing whether you notice that Config never blocks.',
      { callout: 'Two neighbours appear here only as boundaries. **CloudTrail** (who called which API) and the deep monitoring side of Config belong to **Session 11**. **Firewall Manager** (the same WAF, Shield, security group and Network Firewall policies in every account) was **Session 5** — it needs Organizations and Config, which is why it lives next door.', kind: 'note', title: 'The boundary' },
      { h: 'Sort them' },
      { widget: 'sorter', args: { title: 'Which service answers this?', lead: 'Twelve requirements, six services, two each. Decide before you check.', buckets: [{ id: 'scp', short: 'SCP', label: 'Organizations SCP' }, { id: 'iam', short: 'IAM', label: 'IAM policy / role' }, { id: 'idc', short: 'Identity Center', label: 'IAM Identity Center' }, { id: 'ct', short: 'Control Tower', label: 'AWS Control Tower' }, { id: 'ram', short: 'RAM', label: 'AWS RAM' }, { id: 'config', short: 'Config', label: 'AWS Config' }], items: [
        { t: 'No account in the Sandbox OU may launch GPU instances, admins included', b: 'scp', why: 'SCP with an instance-type condition on the OU.' },
        { t: 'Employees in Entra ID reach 30 accounts with one sign-in', b: 'idc', why: 'SAML 2.0 + SCIM, permission sets.' },
        { t: 'Application teams launch EC2 into subnets owned by the network team', b: 'ram', why: 'VPC sharing.' },
        { t: 'Show every security group that allows SSH from anywhere, in all accounts', b: 'config', why: 'managed rule + aggregator.' },
        { t: 'Build a new multi-account environment with log archive and audit accounts, least effort', b: 'ct', why: 'landing zone.' },
        { t: 'A vendor reads CloudWatch metrics in one account with temporary credentials', b: 'iam', why: 'role with an external ID.' },
        { t: 'Member accounts must never be able to leave the organization', b: 'scp', why: 'deny organizations:LeaveOrganization.' },
        { t: 'Assign the same ReadOnly access to the auditors group in every account', b: 'idc', why: 'a permission set assigned to a group.' },
        { t: 'All accounts use the network account’s DNS forwarding rules', b: 'ram', why: 'share Resolver rules.' },
        { t: 'What did this bucket’s policy look like before yesterday’s change?', b: 'config', why: 'configuration timeline.' },
        { t: 'New accounts arrive already governed, through a self-service catalog', b: 'ct', why: 'Account Factory.' },
        { t: 'Developers can create roles, never beyond a defined maximum', b: 'iam', why: 'permission boundary.' }] } },
      { check: { id: 'ch2-prevent', q: 'A question asks to “**prevent** anyone in the Dev accounts from deleting CloudTrail trails”. One option is “Create an AWS Config rule that checks CloudTrail is enabled”. Keep it or cross it out?', opts: [
        { t: 'Keep it: Config watches CloudTrail.', why: 'it would notice afterwards — the trail has already been deleted.' },
        { t: 'Cross it out on CONTROL: Config detects; the requirement is to prevent.', why: 'prevention = an SCP denying cloudtrail:DeleteTrail and StopLogging.' },
        { t: 'Cross it out on SCOPE: Config works only in one Region.', why: 'Config is regional per recorder, but aggregators cover all Regions; that is not the problem.' }], a: 1,
        why: 'CONTROL = prevent → SCP. Config would be the right half of a detect-and-remediate design, not a preventive control.' } },
      { check: { id: 'ch2-cognito', q: 'Employees must sign in once with the corporate IdP and reach 30 AWS accounts. Which is the look-alike you must cross out?', opts: [
        { t: 'IAM Identity Center', why: 'this is the answer: workforce + many accounts.' },
        { t: 'Amazon Cognito', why: 'Cognito signs in your application’s customers, not employees into AWS accounts.' }], a: 1,
        why: 'WHO = workforce human → Identity Center. WHO = app customer → Cognito (Session 5).' } }
    ] },

    /* ---------------------------------------------------------------- 3 */
    { id: 'ch3', title: 'AWS Organizations: accounts, OUs and the management account', domains: 'D1 D4', blocks: [
      'AWS Organizations turns a set of accounts into one managed unit. It is free. Almost everything else in this session — SCPs, Identity Center, Control Tower, organization-wide RAM sharing, Config aggregators — builds on it.',
      { h: 'The parts' },
      { ul: [
        'The **management account** creates the organization, pays the consolidated bill and manages policies. There is exactly one, and it cannot be changed without deleting the organization. (Older material: “master account”.)',
        '**Member accounts** are either **created** inside the organization or **invited** from outside.',
        'The **root** is the top container; below it you build **organizational units (OUs)**, up to **five levels deep**, and put accounts into them. An account sits in exactly one OU (or directly under the root).',
        'Policies attach to the **root**, an **OU** or an **account**, and apply to everything below.'] },
      { h: 'Two feature sets' },
      { table: { head: ['', 'Consolidated billing only', 'All features (default)'], key: true, rows: [
        ['One bill, combined volume tiers, shared RI/SP discounts', 'yes', 'yes'],
        ['SCPs, RCPs, declarative, tag, backup … policies', '**no**', 'yes'],
        ['Integrations with other services (trusted access, delegated administrators)', '**no**', 'yes'],
        ['Switching', 'can move to all features — every invited account must approve', 'cannot go back']] } },
      'If a question says the company “uses Organizations for billing only” and now wants SCPs, the first step is **enabling all features**.',
      { h: 'The management account is special' },
      'Treat it as a vault. **SCPs and RCPs never apply to it**, so an administrator in the management account can do things no policy can stop. AWS’s guidance is to run **no workloads** there, keep few users, require MFA, and hand day-to-day service administration to member accounts as **delegated administrators** — for example the security account as delegated admin for GuardDuty, Security Hub, Config, IAM Access Analyzer or Firewall Manager.',
      { check: fromDrill('G7') },
      { h: 'Useful organization features' },
      { ul: [
        '**Centralized root access management** (IAM, Nov 2024): from the management account (or an IAM delegated admin) you can **remove the root user credentials** of member accounts, and new accounts are created without them. When a root-only task is needed — for example unlocking an S3 bucket policy that denies everyone — you run a short, task-scoped root session with `sts:AssumeRoot`.',
        '**Tag and group accounts** with OUs and account tags; account tags can now also be used as cost allocation tags.',
        '**Quotas** you may see: 10 accounts by default (raised through Service Quotas; new organizations can start lower), 2,000 OUs, OUs five levels deep.'] },
      { h: 'Moving an account between organizations' },
      'An acquisition brings an account that belongs to another organization. The classic procedure: remove it from the old organization (it must first get its own payment method, contact details and support plan so it can stand alone), then accept an invitation from the new one. An account **created** inside an organization must be at least **4 days** old before it can be removed.',
      { callout: 'Practice exams still describe “leave the old organization, then accept the new invitation”. Since **November 2025** AWS Organizations supports **direct account transfers**: the new organization’s management account sends an invitation and the account accepts it — no standalone period, no payment method or support plan to set up, consolidated-billing benefits kept. Conditions include: the destination organization at least 7 days old, the account not a delegated administrator, the same seller of record. If both answers appear, direct transfer is the least-effort one.', kind: 'update' },
      { widget: 'stepper', args: { title: 'Move an account to another organization', line: 'org', steps: [
        { title: 'Check the account', text: 'Make sure it is not a delegated administrator in the old organization and that nothing depends on the old organization’s SCPs, RAM shares or Identity Center assignments — those stop applying when it moves.' },
        { title: 'Invite from the new organization', text: 'In the destination organization’s management account, invite the account by its ID or email address. The invitation (a handshake) expires after 15 days.' },
        { title: 'Accept in the account', text: 'Sign in to the account and accept. With a **direct transfer** it moves straight from the old organization to the new one; there is no standalone period.', note: 'Before Nov 2025 the account had to leave first and stand alone with its own payment method. Banks still show that path.' },
        { title: 'Place it in an OU', text: 'The account lands under the root. Move it into the right OU so the intended SCPs, RCPs and other policies apply, and so Control Tower (if used) enrolls it.' },
        { title: 'Re-create access and billing extras', text: 'Assign Identity Center permission sets in the new organization, re-share RAM resources, and re-activate cost allocation tags if needed.' }] } },
      { check: fromDrill('G30') },
      { check: { id: 'ch3-billing', q: 'A company uses AWS Organizations with **consolidated billing only** and now wants to attach SCPs. What must happen first?', opts: [
        { t: 'Nothing; SCPs work in every organization.', why: 'policies are an all-features capability.' },
        { t: 'Enable all features; every invited member account must approve the change.', why: 'the one-way switch that unlocks policies and integrations.' },
        { t: 'Create a new organization.', why: 'unnecessary; the existing one can be upgraded.' }], a: 1,
        why: 'All features adds policies and service integrations on top of consolidated billing, which it keeps.' } },
      { drills: ['G7', 'G30', 'G28'] }
    ] },

    /* ---------------------------------------------------------------- 4 */
    { id: 'ch4', title: 'SCPs, RCPs and declarative policies', domains: 'D1', blocks: [
      'This is the most tested part of Organizations. A **service control policy** is a guardrail: it defines the **maximum** permissions that IAM users and roles in a member account can have. It **never grants anything**.',
      { h: 'What an SCP does and does not do' },
      { ul: [
        'It filters every request made by a principal in a member account: IAM users, roles, and **the member account’s root user**. An administrator with AdministratorAccess cannot exceed it.',
        'It **grants nothing**. Effective permissions = what the SCPs allow **∩** what IAM policies allow. With only SCPs and no IAM policy, the answer is still “denied”.',
        'It **never applies to the management account**, and it does **not restrict service-linked roles** (the roles AWS services use on your behalf).',
        'It controls **principals in your organization**. It does nothing to a user from another organization who accesses your bucket through a bucket policy — that is the job of RCPs.'] },
      { h: 'Inheritance: an Allow at every level, a Deny anywhere' },
      'SCPs evaluate as “deny by default”. For an action to be possible in an account, an **Allow** for it must exist at **every level** on the path: the root, each OU, and the account itself. That is why AWS attaches **FullAWSAccess** (allow everything) to every node when you enable SCPs; your own policies then add **Deny** statements. A **Deny** at any level applies to everything below.',
      { table: { head: ['Strategy', 'How', 'When'], rows: [
        ['**Deny list** (default)', 'keep FullAWSAccess everywhere, add SCPs with Deny statements', 'most organizations: block a few dangerous actions'],
        ['**Allow list**', 'replace FullAWSAccess with SCPs that Allow only approved services', 'strict environments; every new service must be added']] } },
      'Classic deny-list SCPs: deny Regions outside an approved list (`aws:RequestedRegion`, with global services excluded), deny `organizations:LeaveOrganization`, deny stopping or deleting CloudTrail and Config, deny disabling GuardDuty, deny launching instance types outside a list, deny creating resources without a required tag. An exception for a break-glass role is written with a condition on `aws:PrincipalArn`.',
      { callout: 'Two changes most courses miss. **Sept 2025**: SCPs support the **full IAM policy language** — conditions, individual resource ARNs, `NotAction` in Allow statements (older material: Allow statements could only use `"Resource": "*"` without conditions). **May 2026**: you can attach **10 SCPs** per root, OU or account (was 5), each up to **10,240 characters** (was 5,120). Banks still quote 5 and 5,120.', kind: 'update' },
      { h: 'See inheritance work' },
      'Pick a node, attach or detach policies, pick an action and read each account’s result. Try removing FullAWSAccess from the Workloads OU; replace it with the EC2 + S3 allow list; move the Region deny to the root; and watch the management account row never change.',
      { widget: 'scpTree' },
      { check: fromDrill('G6') },
      { check: { id: 'ch4-inherit', q: 'The root has FullAWSAccess. The Workloads OU has only an SCP that **allows** `ec2:*` and `s3:*` (FullAWSAccess removed). The Prod account under it has FullAWSAccess. Can an administrator in Prod create a DynamoDB table?', opts: [
        { t: 'Yes: the account has FullAWSAccess.', why: 'every level on the path must allow it; the OU does not.' },
        { t: 'No: the Workloads OU level has no Allow for DynamoDB.', why: 'an Allow must exist at the root, every OU and the account.' },
        { t: 'Yes: administrators are not affected by SCPs.', why: 'they are; only the management account and service-linked roles are exempt.' }], a: 1,
        why: 'Allow-list SCPs work because the Allow must be present at every level. The OU becomes the narrowest filter for everything below it.' } },
      { h: 'Resource control policies (RCPs)' },
      'An SCP looks at **who** is calling from inside your organization. An **RCP** (November 2024) looks at **your resources**: it sets the maximum permissions **on resources in member accounts**, whoever the caller is — including principals from **other** organizations. Typical use: a **data perimeter** (“no identity outside our organization may ever read our S3 objects or use our KMS keys, whatever a bucket policy says”, “every S3 request must use TLS”).',
      { ul: [
        'Like SCPs they **grant nothing**; `RCPFullAWSAccess` is attached everywhere and cannot be detached.',
        'They do **not** apply to resources in the **management account**, to calls by **service-linked roles**, or to **AWS managed KMS keys**.',
        'At launch they covered S3, STS, KMS, SQS and Secrets Manager; the list now covers dozens of services (DynamoDB, ECR, CloudWatch Logs, Cognito and more).',
        'Up to 5 per root, OU or account, 5,120 characters each.'] },
      { pair: 'scp-rcp' },
      { h: 'Declarative and other management policies' },
      'Authorization policies (SCP, RCP) filter API calls. **Declarative policies** (December 2024) do something else: they **declare a service configuration** that every account keeps — for EC2, for example, **VPC Block Public Access** or **block public access for EBS snapshots** — and the setting stays enforced even when the service adds new APIs. Unlike SCPs, declarative policies **also apply to the management account**. Other policy types push settings the same way:',
      { table: { head: ['Policy type', 'What it sets'], rows: [
        ['**Tag policies**', 'allowed tag keys, capitalisation and values (Chapter 11)'],
        ['**Backup policies**', 'AWS Backup plans in every account (schedules, vaults, tag-based selection)'],
        ['**AI services opt-out**', 'whether AWS AI services may store content to improve themselves'],
        ['**Chat applications**', 'what Slack and Teams channels may do in the accounts'],
        ['newer (2025–26)', 'Security Hub, Amazon Inspector, Amazon Bedrock guardrails, upgrade rollout, Amazon S3 policies']] } },
      { callout: 'Older material lists four policy types (SCP, tag, backup, AI opt-out). Today Organizations groups them as **authorization** policies (SCP, RCP) and **declarative / management** policies (EC2 declarative, backup, tag, chat, AI opt-out, Security Hub, Inspector, Bedrock, upgrade rollout, S3). For the exam, SCPs and tag policies remain the ones asked about.', kind: 'update' },
      { check: { id: 'ch4-rcp', q: 'A partner company’s role can read a bucket in one of your member accounts because a developer wrote a permissive bucket policy. Security wants a central rule that stops **all principals outside your organization** from reading any S3 object in member accounts. What is it?', opts: [
        { t: 'An SCP denying s3:GetObject unless aws:PrincipalOrgID is yours.', why: 'SCPs only apply to your own principals; the partner’s role is not in your organization.' },
        { t: 'An RCP denying s3:GetObject when aws:PrincipalOrgID is not yours.', why: 'RCPs restrict access to your resources whoever the caller is.' },
        { t: 'A permission boundary on the bucket.', why: 'boundaries attach to users and roles, not resources.' }], a: 1,
        why: 'Resource side + outsiders = RCP. (Add exceptions for AWS service principals where needed.)' } },
      { drills: ['G1', 'G6', 'G8', 'G10', 'G29'] }
    ] },

    /* ---------------------------------------------------------------- 5 */
    { id: 'ch5', title: 'How AWS decides: policy evaluation, boundaries, session policies', domains: 'D1', blocks: [
      'Every AWS request is evaluated the same way. Once you can run this evaluation in your head, most “why is this denied?” and “which policy do I change?” questions become mechanical.',
      { h: 'The policy types' },
      { table: { head: ['Policy', 'Attached to', 'Grants?', 'Role in the evaluation'], key: true, rows: [
        ['**Identity-based policy**', 'IAM user, group, role', 'yes', 'what this principal may do'],
        ['**Resource-based policy**', 'bucket, KMS key, queue, topic, Lambda, role trust policy …', 'yes', 'who may use this resource (can name other accounts)'],
        ['**Permission boundary**', 'one IAM user or role', 'no', 'maximum for that principal'],
        ['**Session policy**', 'passed with AssumeRole / federation', 'no', 'maximum for that one session'],
        ['**SCP**', 'root, OU, account', 'no', 'maximum for principals in member accounts'],
        ['**RCP**', 'root, OU, account', 'no', 'maximum for resources in member accounts']] } },
      { h: 'The evaluation, step by step' },
      { ol: [
        'Start from **implicit deny**: nothing is allowed unless something allows it.',
        'Any **explicit Deny** in any applicable policy → **denied**. Nothing overrides it.',
        '**RCPs** of the resource’s account must allow it (if it is a member account).',
        '**SCPs** of the principal’s account must allow it (if it is a member account).',
        'A **resource-based policy** or an **identity-based policy** must allow it — in the same account **either** is enough; across accounts **both** are needed.',
        'A **permission boundary**, if set, must allow it.',
        'A **session policy**, if used, must allow it.'] },
      'The ceilings (RCP, SCP, boundary, session policy) only ever **remove** permissions. Only identity and resource policies **add** them.',
      { callout: 'A subtle rule you will rarely need: in the same account, a resource policy that names an **IAM user** grants access even if that user’s boundary leaves it out; one that names an **IAM role** is still limited by the role’s boundary and session policy. The exam simply expects “boundaries cap identity policies; cross-account needs both sides”.', kind: 'note', title: 'Fine print' },
      { h: 'Run it' },
      'Load one of the classic traps, **predict** allowed or denied, then read each gate. Afterwards change the chips freely: make it cross-account, add a boundary, switch to the root user or to the management account.',
      { widget: 'policyEval' },
      { check: fromDrill('G11') },
      { h: 'Permission boundaries' },
      'A **permission boundary** is a managed policy set on one IAM user or role as its **maximum**. Effective permissions = identity policy **∩** boundary. It grants nothing. Its classic use is **delegation**: let developers create roles for their own applications, but only if the new role carries the boundary — enforced with the `iam:PermissionsBoundary` condition key — and deny them editing or removing the boundary. Then no role they create can exceed it, and they cannot escalate themselves.',
      { pair: 'scp-pb' },
      { check: fromDrill('G9') },
      { h: 'Session policies' },
      'When you assume a role (or federate) you can pass a **session policy** — one inline JSON policy and up to 10 managed policy ARNs. The session gets the **intersection** of the role’s permissions and the session policy. Use it when one role serves many callers and each session should get less, for example a broker that hands each tenant credentials scoped to its own S3 prefix.',
      { check: { id: 'ch5-deny', q: 'A role has AdministratorAccess. An inline policy on the same role denies `s3:DeleteBucket`. The SCP path allows everything. Can the role delete a bucket?', opts: [
        { t: 'Yes: AdministratorAccess allows everything.', why: 'an explicit Deny beats any Allow.' },
        { t: 'No: the explicit Deny in the inline policy wins.', why: 'explicit Deny is checked first and ends the evaluation.' },
        { t: 'Only from the root user.', why: 'the question is about the role.' }], a: 1,
        why: 'Explicit Deny anywhere → denied. It does not matter which policy type contains it.' } },
      { drills: ['G6', 'G8', 'G9', 'G11', 'G13'] }
    ] },

    /* ---------------------------------------------------------------- 6 */
    { id: 'ch6', title: 'Roles, STS and cross-account access', domains: 'D1', blocks: [
      'In a multi-account world almost all access is through **roles**. A role has no long-term credentials; you **assume** it through **AWS STS** and get **temporary credentials**.',
      { h: 'Two policies on every role' },
      { ul: [
        'The **trust policy** (a resource-based policy on the role) says **who may assume it**: an account, a role, an AWS service (`ec2.amazonaws.com`, `lambda.amazonaws.com`), a SAML or OIDC provider.',
        'The **permissions policies** say **what the role may do** once assumed.',
        'For cross-account use, the caller also needs an identity policy allowing `sts:AssumeRole` on the role.'] },
      'Sessions last from **15 minutes** up to the role’s **maximum session duration** (configurable **1–12 hours**; the default request is 1 hour). **Role chaining** — using one role’s credentials to assume another — is limited to **1 hour**.',
      { h: 'Third parties and the confused deputy' },
      'A vendor that serves many customers assumes roles in all of them from its own account. If your role trusted only the vendor’s account, another customer could give the vendor **your** role ARN and have the vendor act on your account — the **confused deputy**. The fix: the trust policy requires an **external ID** (`sts:ExternalId`) that is unique to you and that the vendor stores for your tenancy.',
      { widget: 'stepper', args: { title: 'Give a third-party vendor access to your account', line: 'iam', steps: [
        { title: 'Get the vendor’s account ID and your external ID', text: 'The vendor tells you its AWS account ID and generates (or you agree) an external ID unique to your company.' },
        { title: 'Create the role', text: 'In your account create a role with a **trust policy** allowing `sts:AssumeRole` for the vendor’s account **only when** `sts:ExternalId` equals your ID.' },
        { title: 'Attach least-privilege permissions', text: 'Attach only what the vendor needs, for example CloudWatch read-only and ec2:Describe*. Consider a permission boundary if the vendor may create resources.' },
        { title: 'The vendor assumes the role', text: 'The vendor’s service calls **AssumeRole** with your role ARN and external ID and gets temporary credentials. CloudTrail in your account records every call made with them.' },
        { title: 'Revoke when needed', text: 'Edit or delete the trust policy (or the role). No keys to hunt down, no passwords to rotate.' }] } },
      { check: fromDrill('G12') },
      { h: 'Role or resource policy?' },
      'Across accounts you can either **assume a role in the other account** or have the other account’s **resource policy** name you. The difference that the exam tests: when you assume a role you **give up your own permissions** for that session; with a resource policy you **keep them**.',
      { pair: 'role-rbp' },
      { check: fromDrill('G13') },
      { h: 'Organization condition keys' },
      'Resource policies often need to say “anyone in our organization” without listing account IDs. Global condition keys do that, and they follow accounts as they join, leave or move:',
      { table: { head: ['Key', 'Matches', 'Typical use'], key: true, rows: [
        ['`aws:PrincipalOrgID`', 'the organization of the **calling principal**', 'bucket or key policy: only principals from our organization'],
        ['`aws:PrincipalOrgPaths`', 'the OU path of the caller’s account', 'only accounts in the Finance OU'],
        ['`aws:ResourceOrgID`', 'the organization of the account that **owns the resource**', 'SCP or endpoint policy: our principals may only use resources inside our organization'],
        ['`aws:SourceOrgID` / `aws:SourceAccount` / `aws:SourceArn`', 'the resource an **AWS service** is acting for', 'bucket policy for CloudTrail or SNS: only on behalf of our org / account / trail (confused deputy for services)'],
        ['`aws:PrincipalTag` / `aws:ResourceTag` / `aws:RequestTag`', 'tags on the caller, the resource, the request', 'ABAC (Chapter 7), required tags (Chapter 11)']] } },
      { widget: 'sorter', args: { title: 'Which condition key?', lead: 'Eight requirements, four keys. Decide before you check.', buckets: [{ id: 'porg', short: 'PrincipalOrgID', label: 'aws:PrincipalOrgID' }, { id: 'ppath', short: 'PrincipalOrgPaths', label: 'aws:PrincipalOrgPaths' }, { id: 'rorg', short: 'ResourceOrgID', label: 'aws:ResourceOrgID' }, { id: 'src', short: 'SourceArn/OrgID', label: 'aws:SourceArn / aws:SourceOrgID' }], items: [
        { t: 'Bucket readable by every account in the organization, now and later', b: 'porg', why: 'caller’s organization.' },
        { t: 'KMS key usable only by accounts under the Finance OU', b: 'ppath', why: 'OU path.' },
        { t: 'Our roles must never write data to S3 buckets outside our organization', b: 'rorg', why: 'resource owner’s organization.' },
        { t: 'Only our CloudTrail trail (the service) may write into this log bucket', b: 'src', why: 'service acting for a specific resource.' },
        { t: 'An SNS topic accepts messages only from S3 buckets owned by our organization', b: 'src', why: 'aws:SourceOrgID for service-to-service calls.' },
        { t: 'Deny any principal from outside our organization in an RCP', b: 'porg', why: 'caller’s organization.' },
        { t: 'Only the Security and Audit OUs may read the log archive', b: 'ppath', why: 'OU paths.' },
        { t: 'A VPC endpoint policy that allows access only to our organization’s resources', b: 'rorg', why: 'resource perimeter.' }] } },
      { check: fromDrill('G3', 'Exam pattern') },
      { h: 'IAM Access Analyzer' },
      'You set a **zone of trust** — your account or your organization — and Access Analyzer reads resource policies and role trust policies to report every resource reachable from **outside** it: S3 buckets, KMS keys, IAM roles, SQS queues, Secrets Manager secrets, Lambda functions, snapshots and more. It also **validates** policies as you write them and can **generate** a least-privilege policy from CloudTrail activity.',
      { callout: 'Access Analyzer now has **three analyzers**: **external access** (the classic one, free), **internal access** (which roles inside the organization can reach critical resources) and **unused access** (unused roles, keys, passwords and permissions) — the last two are paid. **Custom policy checks** (for example “does this policy grant new access?” in a CI pipeline) are paid per check.', kind: 'update' },
      { check: fromDrill('G15') },
      { h: 'Workloads outside AWS' },
      '**IAM Roles Anywhere** gives servers outside AWS temporary credentials for a role: the server presents an **X.509 certificate** issued by a CA you register as a **trust anchor** (AWS Private CA or your own CA). No access keys on disks.',
      { drills: ['G3', 'G11', 'G12', 'G13', 'G14', 'G15'] }
    ] },

    /* ---------------------------------------------------------------- 7 */
    { id: 'ch7', title: 'IAM Identity Center and ABAC', domains: 'D1', blocks: [
      'IAM Identity Center is how **your company’s people** reach AWS: one sign-in, a portal that lists the accounts and roles each person may use, temporary credentials for the console and the CLI. It is the successor of **AWS Single Sign-On** and costs nothing extra.',
      { callout: 'AWS Single Sign-On was **renamed IAM Identity Center on 26 July 2022**. Older questions and many banks still say “AWS SSO”; the answer is the same service. (The API names still start with `sso`.)', kind: 'update' },
      { h: 'How it works' },
      { ol: [
        '**Identity source** — where users live: Identity Center’s own directory, **Active Directory** (AWS Managed Microsoft AD, or AD Connector to your own AD), or an **external IdP** such as Okta or Microsoft Entra ID over **SAML 2.0**, with **SCIM** to provision users and groups automatically.',
        '**Permission sets** — templates of permissions (AWS managed or custom policies, a boundary, session length).',
        '**Assignments** — group X gets permission set Y in accounts A, B and C. Identity Center creates a matching IAM role (`AWSReservedSSO_…`) in each account.',
        'Users open the **access portal**, pick an account and role, and get temporary credentials.'] },
      'Use the **organization instance** (in the management account, administration delegated to a member account). An **account instance** exists for a single account’s apps only — it cannot assign permission sets to AWS accounts.',
      { callout: 'Since **February 2026** an organization instance connected to an external IdP can be **replicated to additional Regions** (it needs a multi-Region customer managed KMS key), giving the workforce an access portal in more than one Region if the primary Region is disrupted. Not on the exam; useful when a question asks for resilient workforce sign-in.', kind: 'update' },
      { h: 'Who is signing in?' },
      { widget: 'chooser', args: { title: 'Which identity service?', tree: WHO } },
      { pair: 'idc-iam-cog' },
      { check: fromDrill('G16') },
      { check: fromDrill('G17') },
      { h: 'ABAC: attribute-based access control' },
      'Role-based access needs a role or policy per team or project. **ABAC** needs one policy: “allow the action when the **principal’s tag** equals the **resource’s tag**” — `aws:ResourceTag/project` = `${aws:PrincipalTag/project}`. New projects need a new tag value, not a new policy. With Identity Center, user attributes from the identity source (department, cost centre, project) arrive as **session tags** through **attributes for access control**. With plain IAM federation, the IdP passes session tags in the SAML assertion (the role’s trust policy must allow `sts:TagSession`).',
      { check: fromDrill('G18') },
      { drills: ['G16', 'G17', 'G18'] }
    ] },

    /* ---------------------------------------------------------------- 8 */
    { id: 'ch8', title: 'Control Tower: landing zones and controls', domains: 'D1', blocks: [
      'Control Tower is an **orchestration layer on top of Organizations**. It does not replace anything in the previous chapters; it wires them together into a **landing zone** — a pre-built, well-architected multi-account baseline — and keeps it governed.',
      { h: 'What a landing zone contains (classic design)' },
      { ul: [
        'The **management account**, where Control Tower runs.',
        'A **Security OU** with two shared accounts: **Log Archive** (the organization CloudTrail and Config logs in S3) and **Audit** (read and security access to all accounts, a home for security tools and notifications).',
        'Optionally a **Sandbox OU** for experiments, and your own OUs for workloads.',
        '**IAM Identity Center** for sign-in (you can choose to manage identity yourself).',
        '**Controls** enabled on OUs, and a **dashboard** of compliance per OU and account.'] },
      { callout: '**Landing zone 4.0** (November 2025) loosened the design: the Config, CloudTrail, Backup and security-role integrations are each **optional**, a **Security OU is no longer required** (the shared accounts just need to share an OU), and a **controls-only** setup is possible. The classic Security OU with Log Archive and Audit is still the default and what exams describe.', kind: 'update' },
      { h: 'Controls (formerly guardrails)' },
      { table: { head: ['Behaviour', 'Implemented with', 'What it does', 'Example'], key: true, rows: [
        ['**Preventive**', 'SCPs, RCPs, declarative policies', 'blocks the API call in every enrolled account', 'disallow changes to the log archive bucket; deny Regions'],
        ['**Detective**', 'AWS Config rules', 'reports non-compliant resources; blocks nothing', 'detect S3 buckets without versioning; detect root user access keys'],
        ['**Proactive**', 'CloudFormation Hooks', 'checks resources **before** CloudFormation provisions them; fails the stack', 'require encryption on new S3 buckets in templates']] } },
      'Controls also have a **guidance** level: **mandatory** (always on, cannot be removed), **strongly recommended**, and **elective**. The catalogue of available controls is now called the **Control Catalog**.',
      { callout: 'Older material says **guardrails**, and only preventive (SCP) and detective (Config) ones. Today they are **controls**, with a third behaviour (**proactive**, CloudFormation Hooks), and preventive controls can also be **RCPs** and **declarative policies** (since November–December 2024).', kind: 'update' },
      { h: 'See the difference' },
      'The same bad change against each kind of control. Try **Proactive** with the console, then with CloudFormation; then compare **Detective** with **Detective + auto-remediation**.',
      { widget: 'controlTimeline' },
      { widget: 'sorter', args: { title: 'Preventive, detective or proactive?', lead: 'Ten controls. Which behaviour is each? Decide before you check.', buckets: [{ id: 'prev', short: 'Preventive', label: 'Preventive (SCP / RCP / declarative)' }, { id: 'det', short: 'Detective', label: 'Detective (Config rule)' }, { id: 'pro', short: 'Proactive', label: 'Proactive (CloudFormation Hook)' }], items: [
        { t: 'Nobody in enrolled accounts may delete the CloudTrail trail', b: 'prev', why: 'deny the API call.' },
        { t: 'Report EBS volumes that are not encrypted', b: 'det', why: 'Config evaluates existing volumes.' },
        { t: 'Fail any stack that defines an RDS instance without Multi-AZ', b: 'pro', why: 'checked in the template before provisioning.' },
        { t: 'Deny all Regions except eu-west-1', b: 'prev', why: 'SCP Region deny.' },
        { t: 'Flag accounts where the root user has access keys', b: 'det', why: 'a detective check.' },
        { t: 'Block public sharing of EBS snapshots in every account, whatever APIs appear later', b: 'prev', why: 'a declarative policy.' },
        { t: 'Reject a CloudFormation template that creates an unencrypted S3 bucket', b: 'pro', why: 'CloudFormation Hook.' },
        { t: 'Show security groups that allow unrestricted SSH', b: 'det', why: 'Config rule.' },
        { t: 'Principals outside the organization can never read S3 objects in member accounts', b: 'prev', why: 'an RCP.' },
        { t: 'Stop a stack from creating a Lambda function outside a VPC', b: 'pro', why: 'template check.' }] } },
      { check: fromDrill('G21') },
      { h: 'Account Factory' },
      'New accounts come from **Account Factory**: a form in the console (built on Service Catalog) that creates the account in the chosen OU, applies the baseline and controls, and assigns Identity Center access. **Account Factory for Terraform (AFT)** does the same from a Git repository (an account request is a Terraform file), and **Account Factory Customization** applies blueprints (CloudFormation or Terraform products) to new or existing accounts. Existing accounts can be **enrolled**; changes made outside Control Tower show as **drift**.',
      { h: 'Control Tower or Organizations alone?' },
      { pair: 'ct-orgs' },
      { callout: 'This is your prestige distractor for the session. Control Tower sounds like the complete answer to any multi-account question. It is **right** for “set up / standardise a multi-account environment with least effort” (G4). It is **wrong** for one guardrail in an existing organization (an SCP, G1), for sharing a network (RAM), or for one compliance rule (Config).', kind: 'miss', title: 'Your misses' },
      { check: fromDrill('G4', 'Exam pattern') },
      { drills: ['G4', 'G1', 'G21'] }
    ] },

    /* ---------------------------------------------------------------- 9 */
    { id: 'ch9', title: 'Sharing: RAM, VPC sharing and Service Catalog', domains: 'D1 D4', blocks: [
      'Many accounts often need **the same thing**: one network, one transit gateway, one set of DNS rules, one license configuration. Copying it into every account costs money and drifts. **AWS Resource Access Manager (RAM)** lets the owner account share it instead; the other accounts use it in place, as if it were theirs.',
      { h: 'How RAM works' },
      { ul: [
        'The owner creates a **resource share**: the resources, the principals (accounts, OUs or the whole organization), and a managed permission (what they may do with it).',
        'After **sharing with AWS Organizations** is enabled (once, from the management account), shares inside the organization need **no invitations**. Accounts outside the organization receive an invitation to accept — for resource types that allow it.',
        'The owner keeps ownership and control; unsharing removes access.'] },
      { table: { head: ['Commonly shared', 'Why', 'Scope'], rows: [
        ['**VPC subnets** (VPC sharing)', 'many accounts deploy into one central VPC', 'same organization only'],
        ['**Security groups**', 'owner-managed SGs used by participants in a shared VPC', 'same organization only'],
        ['**Transit gateways**', 'accounts attach their VPCs to one hub', 'any account'],
        ['**Route 53 VPC Resolver rules**, DNS Firewall rule groups, Route 53 Profiles', 'one hybrid DNS setup for every VPC', 'any account'],
        ['**Prefix lists**, **IPAM pools**', 'one list of CIDRs, one address plan', 'any account'],
        ['**License Manager configurations**, **Aurora DB clusters** (clones), **Network Firewall policies**, Capacity Reservations, Dedicated Hosts', 'use without duplicating', 'varies']] } },
      'Not everything is shared through RAM. **S3 buckets, KMS keys, SQS queues, SNS topics and Lambda functions** are shared with **resource-based policies**; AMIs and EBS snapshots through their own launch/create-volume permissions.',
      { h: 'VPC sharing in detail' },
      'The network account (**owner**) shares subnets with **participant** accounts in the **same organization**. Participants launch their own EC2 instances, RDS databases, Lambda functions and load balancers into the shared subnets. The split is strict:',
      { table: { head: ['', 'Owner', 'Participant'], key: true, rows: [
        ['VPC, subnets, route tables, NACLs, internet/NAT gateways, endpoints', 'creates and manages', 'can use; cannot modify (and cannot even describe NAT gateways)'],
        ['Their own instances, databases, security groups', 'cannot modify participants’ resources', 'full control of their own'],
        ['Bills', 'NAT gateways, VPC endpoints, transit gateway attachments, public IPv4', 'their own resources and data transfer']] } },
      'Limits to remember: subnets of a **default VPC** cannot be shared; subnets can only be shared **inside the organization**; everything stays in **one Region**.',
      { widget: 'stepper', args: { title: 'Set up VPC sharing', line: 'ram', steps: [
        { title: 'Enable sharing with Organizations', text: 'Once, from the management account: RAM → Settings → enable sharing with AWS Organizations. Shares inside the organization then need no invitations.' },
        { title: 'Build the VPC in the network account', text: 'The network team creates the VPC, subnets per AZ, route tables, NAT gateways, endpoints and NACLs — everything participants must not change.' },
        { title: 'Create the resource share', text: 'In RAM, share the chosen subnets (and optionally owner-managed security groups) with the application accounts or their OU.' },
        { title: 'Participants deploy', text: 'The subnets appear in the participant accounts. Teams launch EC2, RDS and Lambda into them with their own IAM permissions and their own security groups.' },
        { title: 'Operate', text: 'Routing and network changes go through the network account. Participants manage and pay for their own resources; the owner pays for shared infrastructure such as NAT gateways.' }] } },
      { check: fromDrill('G19') },
      { h: 'Which sharing mechanism?' },
      { widget: 'chooser', args: { title: 'Share it with RAM, a policy, a role — or something else?', tree: SHARE } },
      { pair: 'ram-peer-tgw' },
      { callout: 'Your recorded prestige pick. Transit Gateway appears in every “many accounts, one network” question. Ask: must **separate VPCs** route to each other (then TGW, shared through RAM — G5), or do the accounts only need to **put resources into one network** (then VPC sharing — G2)?', kind: 'miss', title: 'Your misses' },
      { check: fromDrill('G2', 'Exam pattern') },
      { check: fromDrill('G20') },
      { h: 'Service Catalog' },
      '**AWS Service Catalog** shares something different: **approved products** (CloudFormation or Terraform templates) in **portfolios**. A **launch constraint** is an IAM role that Service Catalog assumes to create the resources, so users only need permission to launch the product, not to create EC2, IAM or S3 themselves. Portfolios can be shared with the whole organization or with OUs. Control Tower’s Account Factory is itself a Service Catalog product.',
      { check: fromDrill('G26') },
      { drills: ['G2', 'G5', 'G19', 'G20', 'G26'] }
    ] },

    /* ---------------------------------------------------------------- 10 */
    { id: 'ch10', title: 'AWS Config: record, evaluate, remediate', domains: 'D1', blocks: [
      'Your baseline Q49 hinged on one phrase: “**configuration changes**”. That phrase is AWS Config. Config answers two questions about every resource: **what did it look like, and when did that change?** and **does it comply with our rules?**',
      { h: 'Recording' },
      { ul: [
        'The **configuration recorder** (per account, per Region) records a **configuration item** each time a supported resource changes: its settings, relationships (this ENI belongs to that instance, in that subnet, with these security groups) and the related CloudTrail event.',
        'The result is a **configuration timeline** per resource, delivered to an S3 bucket and queryable with **advanced queries** (SQL-like).',
        '**Recording frequency**: continuous, or **daily** (one item per day, only if the resource changed — cheaper, but a daily snapshot misses intermediate states).'] },
      { callout: 'Older material: Config always records continuously. Since **November 2023** you can choose **daily** recording, per resource type if you like. Config rules can also run in **proactive** mode (evaluate a resource definition before deployment) next to the classic **detective** mode — proactive evaluation reports, it does not block.', kind: 'update' },
      { h: 'Rules' },
      { table: { head: ['', 'Options'], key: true, rows: [
        ['Rule source', '**AWS managed rules** (hundreds, e.g. `restricted-ssh`, `encrypted-volumes`, `s3-bucket-level-public-access-prohibited`, `required-tags`) · **custom rules** with a Lambda function or with **Guard** (a policy-as-code language, no Lambda)'],
        ['Trigger', '**configuration change** (when a matching resource changes) · **periodic** (every 1, 3, 6, 12 or 24 hours) · or both'],
        ['Result', 'COMPLIANT / NON_COMPLIANT per resource; events to EventBridge for notifications'],
        ['Bundles', '**conformance packs**: rules + remediation actions deployed together, per account or **organization-wide** (members cannot change them)'],
        ['Multi-account view', '**aggregator**: read-only view of configuration and compliance across accounts and Regions, or the whole organization']] } },
      { h: 'Remediation' },
      'A non-compliant resource can be fixed by **remediation actions**: **AWS Systems Manager Automation** runbooks (AWS-provided or your own), run **manually** or **automatically**, with retries. Examples: re-enable S3 Block Public Access, remove an open SSH rule, enable versioning. Remediation always runs **after** the change — there is a window in which the resource was non-compliant.',
      { widget: 'stepper', args: { title: 'Detect and fix public buckets automatically', line: 'config', steps: [
        { title: 'Turn on recording', text: 'Enable the configuration recorder for S3 buckets in every account and Region you care about (Control Tower or an organization setup does this for you).' },
        { title: 'Add the managed rule', text: 'Enable `s3-bucket-level-public-access-prohibited`. It is change-triggered: every time a bucket’s configuration changes, the rule evaluates it.' },
        { title: 'A bucket goes public', text: 'Someone switches off Block Public Access. The recorder writes a configuration item; the rule marks the bucket NON_COMPLIANT.' },
        { title: 'Automatic remediation', text: 'The remediation action runs an SSM Automation runbook with a role Config passes to it, turning Block Public Access back on. Retries are configurable.' },
        { title: 'Roll it out everywhere', text: 'Put the rule and its remediation into an **organization conformance pack** and view compliance in an **aggregator** in the audit account.', note: 'To make the change impossible in the first place, add an SCP denying s3:PutBucketPublicAccessBlock for everyone but a break-glass role.' }] } },
      { check: fromDrill('G24') },
      { h: 'Config vs CloudTrail vs SCP' },
      { pair: 'cfg-trail-scp' },
      { check: fromDrill('G23') },
      { check: fromDrill('G22') },
      { check: fromDrill('G25') },
      { callout: 'Two services use Config underneath and need it recording: **Security Hub CSPM** (Session 5) evaluates its controls with Config rules, and **Firewall Manager** needs Config in every account it manages. **CloudTrail** — the organization trail, created in the management account or a delegated administrator, that member accounts cannot change — is covered in Session 11.', kind: 'note', title: 'Neighbours' },
      { drills: ['G22', 'G23', 'G24', 'G25'] }
    ] },

    /* ---------------------------------------------------------------- 11 */
    { id: 'ch11', title: 'Consolidated billing and tag governance', domains: 'D4', blocks: [
      'The D4 half of this session. Every organization gets **consolidated billing** at no charge, even with the consolidated-billing-only feature set.',
      { h: 'What consolidated billing gives you' },
      { ul: [
        '**One bill**, paid by the management account (one per seller of record), with a line per account.',
        '**Combined usage for volume pricing**: services with tiered prices (S3 storage, data transfer …) add up every account’s usage before the tiers apply, so the organization reaches cheaper tiers sooner.',
        '**Shared Reserved Instance and Savings Plans discounts**: unused commitment in one account applies to matching usage in other accounts. The purchasing account benefits first.',
        'Sharing is **on by default**. The management account can turn it off per account (both the buyer and the receiver must have it on for a discount to flow).'] },
      { callout: 'Newer than most banks: RI and Savings Plans sharing can also be scoped to **groups of accounts** — **prioritized group sharing** (the group first, then the rest of the organization) or **restricted group sharing** (only inside the group) — with groups defined by Cost Categories. **Billing transfer** lets another organization’s management account manage and pay your bill (for example a reseller). Banks only know “sharing on or off per account”.', kind: 'update' },
      { h: 'Try the sharing' },
      'Account A bought a commitment. Change its size, the discount you assume, and the sharing setting, and watch the whole organization’s cost per hour. The prices are **your inputs**, not AWS prices.',
      { widget: 'billingSim' },
      { check: fromDrill('G27') },
      { check: fromDrill('G28') },
      { h: 'Splitting the bill: cost allocation tags' },
      'Accounts already split costs by account. For finer charge-back (department, project, environment), tag resources and **activate those keys as cost allocation tags** in the Billing console of the management account; only then do they appear as columns in Cost Explorer and the Cost and Usage Report (it can take up to 24 hours).',
      { h: 'Governing tags' },
      { ul: [
        '**Tag policies** (Organizations) define the allowed keys, their capitalisation and allowed values, and report compliance. With enforcement for chosen resource types, a request that sets a **non-compliant** value is rejected. **Untagged resources are not evaluated** — a tag policy does not force anyone to add a tag.',
        '**SCPs** make a tag **mandatory**: deny `ec2:RunInstances` when `aws:RequestTag/CostCenter` is null, and deny `ec2:DeleteTags` for that key.',
        '**Config** `required-tags` finds resources that already lack tags.'] },
      { pair: 'tag-scp' },
      { check: fromDrill('G29') },
      { check: { id: 'ch11-tags', q: 'Tags are on every resource, but the finance team cannot see a CostCenter column in Cost Explorer. What is missing?', opts: [
        { t: 'A tag policy for CostCenter.', why: 'tag policies standardise values; they do not make tags visible in billing.' },
        { t: 'Activating CostCenter as a cost allocation tag in the management account’s Billing console.', why: 'tags appear in cost tools only after activation.' },
        { t: 'An SCP requiring the tag.', why: 'the tags already exist.' }], a: 1,
        why: 'Billing ignores tags until they are activated as cost allocation tags.' } },
      { drills: ['G27', 'G28', 'G29'] }
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
      'G1–G5 carry your prestige pattern and are marked as yours in the drill (source “Exam pattern”, tag C). In G1–G3 Control Tower, Transit Gateway and Network Firewall are tempting and wrong; in G4 and G5 Control Tower and Transit Gateway are the answer. Ten more drills put a prestige service among the options. Run the 30 scenarios once; your new misses appear in Progress.',
      { link: '#drill', text: 'Go to the drill (30 scenarios)', btn: true }
    ] }
  ];
})();
