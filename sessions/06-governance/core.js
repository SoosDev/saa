/* Session 6 — Multi-account & governance: meta, lines, organization map, stub, method, cheat sheet, compare, traps, log.
   Colour rule: a service keeps its colour on every page. The eleven earlier hues are not reused and no new hue is
   added (docs/session-06-governance.md, "Colour rule"). Every Session 6 family is an ink line (4 px) with its own
   dash pattern and station shape, and every line is labelled. Facts: docs/session-06-governance.md, "Facts verified". */
(function () {
  'use strict';
  const S = (window.SESSION = window.SESSION || {});
  const INK = 'fill:var(--surface);stroke:var(--ink);stroke-width:3';
  const FONT = 'Atkinson Hyperlegible, sans-serif';
  const HALO = ';paint-order:stroke;stroke:var(--surface);stroke-width:5px;stroke-linejoin:round';
  const sub = (x, y, text, lines, anchor, halo) => ({ el: 'text', lines, a: { x, y, 'font-size': 11.5, 'font-family': FONT, 'text-anchor': anchor || null }, style: 'fill:var(--ink2)' + (halo == null ? HALO : halo), text });
  const T = (x, y, text, lines, anchor) => ({ el: 'text', pick: lines, a: { x, y, 'font-size': 13, 'font-weight': 700, 'font-family': FONT, 'text-anchor': anchor || null }, style: 'fill:var(--ink)' + HALO, text });
  const shape = (d, lines, pick) => Object.assign({ lines: pick ? undefined : lines, pick: pick ? lines : undefined, style: INK }, d);
  const circle = (cx, cy, lines, pick) => shape({ el: 'circle', a: { cx, cy, r: 8 } }, lines, pick);
  const big = (cx, cy, lines, pick) => shape({ el: 'circle', a: { cx, cy, r: 11 } }, lines, pick);
  const ring = (cx, cy, lines) => [shape({ el: 'circle', a: { cx, cy, r: 10 } }, lines, true), { el: 'circle', pick: lines, a: { cx, cy, r: 3.5 }, style: 'fill:var(--ink)' }];
  const square = (cx, cy, lines, pick) => shape({ el: 'rect', a: { x: cx - 8, y: cy - 8, width: 16, height: 16 } }, lines, pick);
  const diamond = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx} ${cy - 10} L${cx + 10} ${cy} L${cx} ${cy + 10} L${cx - 10} ${cy} Z` } }, lines, pick);
  const triangle = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx} ${cy - 10} L${cx + 10} ${cy + 7} L${cx - 10} ${cy + 7} Z` } }, lines, pick);
  const hexa = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx - 5} ${cy - 9} H${cx + 5} L${cx + 10} ${cy} L${cx + 5} ${cy + 9} H${cx - 5} L${cx - 10} ${cy} Z` } }, lines, pick);
  const penta = (cx, cy, lines, pick) => shape({ el: 'path', a: { d: `M${cx} ${cy - 10} L${cx + 10} ${cy - 2} L${cx + 6} ${cy + 9} L${cx - 6} ${cy + 9} L${cx - 10} ${cy - 2} Z` } }, lines, pick);
  const LABELS = [];
  const box = (x, y, w, hgt, label, right) => {
    LABELS.push({ el: 'text', a: { x: right ? x + w - 10 : x + 10, y: y + 18, 'font-size': 11, 'font-weight': 800, 'letter-spacing': 1, 'text-anchor': right ? 'end' : null }, style: 'fill:var(--ink2)' + HALO, text: label });
    return [{ el: 'rect', a: { x, y, width: w, height: hgt, rx: 8 }, style: 'fill:var(--surface);stroke:var(--chip-border);stroke-width:1.5' }];
  };
  const zoneLabel = (x, y, t, anchor) => ({ el: 'text', a: { x, y, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5, 'text-anchor': anchor || null }, style: 'fill:var(--ink2)', text: t });

  Object.assign(S, {
    meta: { id: '06-governance', n: 6, title: 'Multi-account & Governance', brand: 'Governance Transit Map', home: '../../', updated: '2026-09-25' },

    lines: [
      { id: 'org', name: 'Organizations · SCP · RCP', short: 'Orgs/SCP', cls: 'ink', width: 4, alias: ['Organizations', 'AWS Organizations', 'SCP', 'service control policy', 'RCP', 'resource control policy', 'declarative policy', 'OU', 'organizational unit', 'management account', 'delegated administrator'],
        verb: 'groups accounts and sets their ceiling', from: 'management account → Root → OUs → member accounts; policies attached at any level flow down',
        built: 'The **account container**. One **management account** owns the organization; member accounts sit in a tree of **OUs**. With **all features** on you attach policies: **SCPs** set the maximum permissions for IAM users and roles (the root user too) **in member accounts**, **RCPs** set the maximum permissions on **resources** in member accounts, and **declarative, tag, backup** and other policies push settings. SCPs and RCPs **grant nothing** and **never apply to the management account**.',
        says: ['prevent every account from', 'even administrators cannot', 'deny all Regions except', 'prevent accounts from leaving the organization', 'guardrail for all accounts', 'maximum permissions', 'organizational units', 'central management of many accounts'],
        switch: [{ to: 'iam', when: 'the question is about what one role or user may do (grant, trust, boundary)' }, { to: 'ct', when: 'a whole governed landing zone must be set up with least effort' }, { to: 'config', when: 'the need is to detect or report non-compliant resources, not to block' }],
        misses: 'The prestige reflex here is **Control Tower**: it sounds like the complete answer to any multi-account question. When the organization exists and the need is **one guardrail** (deny a Region, stop leaving the org, deny disabling CloudTrail), the answer is **an SCP** attached to the right OU.',
        traps: ['Expecting an SCP to grant access: it only filters; IAM must still allow.', 'Attaching an SCP to restrict the management account: SCPs never apply there.', 'Thinking an account administrator or the member root user can bypass an SCP: they cannot.', 'SCPs in an organization with consolidated billing only: policies need all features.'],
        update: 'SCPs now support the **full IAM policy language** (Sept 2025: conditions, resource ARNs and NotAction in Allow statements). Quotas doubled in May 2026: **10 SCPs per root, OU or account, 10,240 characters each**. New policy types: **RCPs** (Nov 2024), **declarative policies** (Dec 2024) and more. Accounts can now **transfer directly** between organizations (Nov 2025).' },
      { id: 'iam', name: 'IAM policies · roles · STS', short: 'IAM/STS', cls: 'ink', width: 4, dash: '2 7', alias: ['IAM', 'identity-based policy', 'resource-based policy', 'bucket policy', 'permission boundary', 'permissions boundary', 'session policy', 'AssumeRole', 'STS', 'trust policy', 'external ID', 'Access Analyzer', 'ABAC', 'aws:PrincipalOrgID', 'Roles Anywhere'],
        verb: 'grants, trusts and delegates access', from: 'principal → STS AssumeRole (trust policy) → temporary credentials → identity policy ∩ boundary ∩ session policy ∩ SCP → resource (resource policy, RCP)',
        built: 'The **permission engine**. **Identity policies** grant a user or role; **resource policies** (bucket, key, queue policies) grant on the resource and can name other accounts; **permission boundaries** and **session policies** cap what a principal can do; an **explicit Deny** anywhere wins. **Roles** are assumed through **STS** for temporary credentials: the **trust policy** says who may assume, the **external ID** stops the confused deputy. **Access Analyzer** finds access from outside your account or organization.',
        says: ['cross-account access', 'temporary credentials', 'third-party vendor needs access', 'external ID', 'delegate permission management to developers', 'maximum permissions a developer can grant', 'only principals from our organization', 'resources shared with an external entity', 'attribute-based access control'],
        switch: [{ to: 'org', when: 'the limit must apply to every account or OU at once, including their administrators' }, { to: 'idc', when: 'the principals are the company’s own people signing in to many accounts' }, { to: 'ram', when: 'the resource type can be shared with RAM and the account owners should see it natively' }],
        misses: 'Look-alike pair from your record: **permission boundary vs SCP**. Both are ceilings. A boundary caps **one user or role** and is set **inside the account** (typically to let developers create roles safely); an SCP caps **every principal in an account or OU** and is set from the organization.',
        traps: ['A permission boundary that “grants” access: it only caps.', 'Cross-account access with only a bucket policy: the caller’s own identity policy must allow it too.', 'Sharing long-term access keys with a partner instead of a role with an external ID.', 'Listing every account ID in a bucket policy instead of `aws:PrincipalOrgID`.'],
        update: 'Evaluation now starts with **RCPs** (Nov 2024). IAM quotas: **20 managed policies per role by default** (up to 25; older material: 10) and role trust policies up to **8,192 characters** on request. IAM Access Analyzer now has three analyzer types: **external access** (free), **internal access** and **unused access** (both paid).' },
      { id: 'idc', name: 'IAM Identity Center', short: 'Identity Center', cls: 'ink', width: 4, dash: '10 6', alias: ['IAM Identity Center', 'Identity Center', 'AWS SSO', 'Single Sign-On', 'SSO', 'permission set', 'access portal', 'SCIM', 'SAML'],
        verb: 'signs your workforce in to every account', from: 'corporate IdP (Entra ID, Okta, AD) → SAML 2.0 + SCIM → IAM Identity Center → permission set → role in each account',
        built: 'Single sign-on for **your own people** across **all accounts** of the organization and business apps. Users come from its own directory, **Active Directory** (Managed Microsoft AD or AD Connector) or an **external IdP** over **SAML 2.0** with **SCIM** provisioning. You define **permission sets** once and assign them to users or groups per account; Identity Center creates the matching IAM role in each account. No IAM users, no long-term keys. Formerly **AWS Single Sign-On**; no extra charge.',
        says: ['employees sign in once', 'single sign-on to multiple accounts', 'corporate identity provider', 'Okta', 'Microsoft Entra ID', 'Active Directory users need AWS console access', 'permission sets', 'workforce identities'],
        switch: [{ to: 'iam', when: 'the principal is an application, a service or a third party, not a person of the company' }],
        misses: 'Three-way look-alike: **Identity Center** (your workforce, many accounts), **IAM users** (legacy, one account, long-term keys), **Cognito** (your app’s customers — Session 5). “Employees” + “multiple accounts” = Identity Center, whatever else is on offer.',
        traps: ['Creating IAM users in each account for employees.', 'Cognito for workforce access to the AWS console.', 'Configuring SAML federation separately in every account when Identity Center does it once.', 'An account instance of Identity Center for multi-account access: only the organization instance assigns permission sets to accounts.'],
        update: 'AWS Single Sign-On was **renamed IAM Identity Center on 26 July 2022** (older questions say “AWS SSO”). **Multi-Region replication** (GA Feb 2026) lets an organization instance with an external IdP serve the access portal from additional Regions.' },
      { id: 'ct', name: 'Control Tower', short: 'Control Tower', cls: 'ink', width: 4, dash: '16 5 3 5', alias: ['Control Tower', 'landing zone', 'guardrail', 'controls', 'Account Factory', 'AFT', 'Account Factory for Terraform', 'preventive control', 'detective control', 'proactive control'],
        verb: 'builds and governs a landing zone', from: 'management account → Control Tower → landing zone (OUs, Log Archive, Audit, Identity Center) → controls on OUs → Account Factory for new accounts',
        built: 'An **orchestration layer on Organizations**. It sets up a **landing zone** — a well-architected multi-account baseline (log archive and audit accounts, an organization trail, Config, Identity Center) — and applies **controls** (formerly **guardrails**) to OUs: **preventive** (SCPs, RCPs, declarative policies), **detective** (Config rules) and **proactive** (CloudFormation Hooks). **Account Factory** vends new accounts that are governed from the first minute. No extra charge; you pay for the services it uses.',
        says: ['set up a multi-account environment', 'landing zone', 'least operational overhead for new accounts', 'guardrails', 'governed account vending', 'best practices for multiple accounts', 'dashboard of compliance across accounts'],
        switch: [{ to: 'org', when: 'the organization exists and one specific restriction is needed' }, { to: 'config', when: 'only compliance detection or remediation of resources is asked' }],
        misses: 'Your prestige distractor for this session. **Control Tower is right** when the question asks to **set up or standardise many accounts** with the least effort (landing zone, account vending, guardrails out of the box). It is **wrong** when an organization already exists and the need is one guardrail (an SCP), one share (RAM) or one rule (Config).',
        traps: ['Control Tower to deny one Region in an existing organization (an SCP does it).', 'Control Tower to share subnets or a transit gateway (RAM).', 'Expecting a detective control to block (it reports).', 'Proactive controls catching console changes (they only see CloudFormation).'],
        update: '“Guardrails” are now called **controls**. Preventive controls now also use **RCPs and declarative policies** (since Nov/Dec 2024). **Landing zone 4.0** (Nov 2025) makes Config, CloudTrail, Backup and the Security OU **optional** and allows a controls-only setup; the **Control Catalog** replaced the controls library (2025).' },
      { id: 'ram', name: 'RAM · resource sharing', short: 'RAM', cls: 'ink', width: 4, dash: '1 9', alias: ['RAM', 'Resource Access Manager', 'resource share', 'VPC sharing', 'shared subnet', 'shared VPC'],
        verb: 'shares one resource with other accounts', from: 'owner account → resource share (RAM) → accounts, OUs or the whole org → they use the resource in place',
        built: 'Share a resource **you own** with other accounts, OUs or the whole organization so they use it **as if it were theirs**, without copying it or assuming a role. Built for **VPC subnets (VPC sharing)**, **transit gateways**, **Route 53 VPC Resolver rules**, **prefix lists**, **IPAM pools**, **License Manager** configurations, **Aurora clusters**, **Network Firewall policies**, **security groups** and more. Inside an organization with sharing enabled there are **no invitations**.',
        says: ['share subnets with other accounts', 'centrally managed VPC', 'share the transit gateway', 'share Route 53 Resolver rules', 'share across accounts without duplicating', 'one network team owns the VPC'],
        switch: [{ to: 'iam', when: 'the resource type is not RAM-shareable and access is by API (cross-account role or resource policy)' }],
        misses: 'The other half of your prestige pattern: **Transit Gateway** looks right in any “many accounts, one network” question. If the accounts only need to **put resources into a central VPC**, **VPC sharing via RAM** is simpler and cheaper — no attachments, no peering, one VPC. Transit Gateway is right when **many separate VPCs** must route to each other or to on-premises.',
        traps: ['VPC peering or Transit Gateway when shared subnets would do.', 'Participants changing the owner’s route tables or NACLs (they cannot).', 'Sharing a subnet of a default VPC (not allowed) or across organizations (subnets only within the org).', 'Copying an AMI or TGW per account instead of sharing.'],
        update: 'Shareable types keep growing: **security groups** (org only, for shared VPCs), **Route 53 Profiles**, **EBS volumes**, placement groups, S3 Access Grants … Route 53 Resolver is now called **Route 53 VPC Resolver**.' },
      { id: 'config', name: 'AWS Config', short: 'Config', cls: 'ink', width: 4, dash: '24 8', alias: ['Config', 'AWS Config', 'Config rule', 'conformance pack', 'aggregator', 'configuration item', 'configuration recorder', 'remediation'],
        verb: 'records configuration and checks compliance', from: 'resources → configuration recorder (configuration items) → Config rules → compliant / NONCOMPLIANT → SSM Automation remediation · aggregator for all accounts',
        built: 'The **configuration history and compliance** service. The recorder keeps a timeline of **configuration items** for every resource (what it looked like, when it changed, what it relates to). **Config rules** (AWS managed, or custom with Lambda or Guard) evaluate resources on **change** or **periodically**; **conformance packs** bundle rules; an **aggregator** shows compliance for all accounts and Regions; **remediation** runs **SSM Automation** runbooks, manually or automatically. Config **detects**; it does not prevent.',
        says: ['configuration changes over time', 'what did this resource look like last week', 'check compliance', 'noncompliant resources', 'automatically remediate', 'conformance pack', 'compliance across all accounts and Regions', 'audit resource configuration'],
        switch: [{ to: 'org', when: 'the change must be blocked before it happens (SCP)' }, { to: 'iam', when: 'the question is who made an API call — that is CloudTrail (Session 11)' }],
        misses: 'From your baseline: Q49 “**config changes**” → **Config** was a missed keyword. The trio to keep apart: **CloudTrail = who called which API**, **Config = what the resource looked like and whether it complies**, **SCP = stop the call**.',
        traps: ['Config to prevent a change: it detects and can remediate afterwards.', 'CloudTrail to see a resource’s configuration history (Config).', 'Writing a Lambda per account to check compliance instead of an organization conformance pack.', 'Forgetting that remediation uses SSM Automation documents.'],
        update: 'The recorder can now record **daily** instead of continuously (Nov 2023; one item per day, only if changed). Rules can run in **proactive** mode (evaluate a resource definition before deployment; it does not block). Newer rule type: **Guard custom policy rules** (no Lambda).' },
      { id: 'billing', name: 'Consolidated billing · cost tags', short: 'Billing', cls: 'ink', width: 4, dash: '6 4', alias: ['consolidated billing', 'payer account', 'Reserved Instance sharing', 'Savings Plans sharing', 'volume discount', 'cost allocation tag', 'tag policy', 'Billing Conductor'],
        verb: 'one bill, pooled discounts, costs by tag', from: 'every member account’s usage → management account → one bill · combined volume tiers · RI and Savings Plans shared',
        built: 'Every organization gets **consolidated billing**: the management account pays **one bill** for all accounts, usage is **combined for volume pricing tiers**, and **Reserved Instance and Savings Plans discounts are shared** across accounts by default (the management account can turn sharing off per account or share within groups). Costs are split back with **cost allocation tags** activated in Billing, standardised with **tag policies**.',
        says: ['one bill for all accounts', 'volume discounts', 'share Reserved Instances across accounts', 'unused Savings Plans', 'charge back costs to departments', 'cost allocation tags', 'standardise tags'],
        switch: [{ to: 'org', when: 'untagged resources must be blocked at creation (SCP with a tag condition)' }],
        traps: ['Buying RIs per account to get the discount (sharing already pools them).', 'Expecting tag policies to block untagged resources: they check the tags you set; an SCP must require the tag.', 'Forgetting to activate the tag as a cost allocation tag.'],
        update: 'RI and Savings Plans sharing can now be scoped to **groups of accounts** (prioritized or restricted group sharing, defined with Cost Categories). **Billing transfer** lets an external organization manage and pay the bill. One consolidated bill is produced per seller of record.' }
    ],
    topics: { nbr: 'Neighbours: Service Catalog · CloudTrail · Directory' },

    map: {
      title: 'The organization map', lead: 'Outside AWS at the top, then your organization: the management account, the Security OU, the network account and two workload accounts. Tap a line or a station.',
      viewBox: '0 0 1000 880', defaultLine: 'org',
      caption: 'No new hues: every governance family is an ink line, told apart by its dash and its station shape — Organizations/SCP solid with squares, IAM/STS short dashes with circles, Identity Center dashes with triangles, Control Tower dash-dot with hexagons, RAM dots with diamonds, Config long dashes with rings, billing tight dashes with pentagons. Every line is labelled; colour is never the only cue.',
      items: [
        { el: 'rect', a: { x: 0, y: 0, width: 1000, height: 96 }, style: 'fill:var(--muted-fill)' },
        { el: 'rect', a: { x: 0, y: 104, width: 1000, height: 776 }, style: 'fill:var(--zone-aws)' },
        zoneLabel(18, 22, 'OUTSIDE AWS'),
        zoneLabel(982, 124, 'YOUR ORGANIZATION', 'end'),

        ...box(20, 130, 300, 330, 'MANAGEMENT ACCOUNT'),
        ...box(350, 130, 290, 330, 'SECURITY OU'),
        ...box(680, 130, 300, 330, 'INFRASTRUCTURE OU · NETWORK'),
        ...box(20, 525, 460, 340, 'PROD ACCOUNT · WORKLOADS OU', true),
        ...box(520, 525, 460, 340, 'DEV ACCOUNT · WORKLOADS OU', true),

        /* ---- lines ---- */
        { el: 'line', line: 'billing', paths: ['M900 830 H45 V440 H130'], labels: [{ x: 560, y: 822, t: 'CONSOLIDATED BILLING', size: 10.5 }] },
        { el: 'line', line: 'config', paths: ['M420 250 H600 V780', 'M110 780 H900'], labels: [{ x: 444, y: 240, t: 'CONFIG', size: 10.5 }] },
        { el: 'line', line: 'ram', paths: ['M900 250 H740 V700 H110'], labels: [{ x: 752, y: 300, t: 'RAM · SHARING', size: 10.5 }] },
        { el: 'line', line: 'ct', paths: ['M110 400 H560'], labels: [{ x: 290, y: 392, t: 'CONTROL TOWER', size: 10.5 }] },
        { el: 'line', line: 'iam', paths: ['M660 50 V505 H500 V660 H250 V600', 'M250 660 V740 H380', 'M860 50 V98 H660', 'M660 330 H520'], labels: [{ x: 672, y: 88, t: 'STS · ASSUMEROLE', size: 10.5 }] },
        { el: 'line', line: 'idc', paths: ['M250 50 V600 H750'], labels: [{ x: 262, y: 124, t: 'IDENTITY CENTER', size: 10.5 }] },
        { el: 'line', line: 'org', paths: ['M70 180 H960', 'M70 180 V480 H960'], labels: [{ x: 290, y: 474, t: 'SCPS FLOW ROOT → OU → ACCOUNT', size: 10.5 }] },

        /* ---- stations ---- */
        /* outside */
        triangle(250, 50, ['idc'], true), T(266, 54, 'Corporate IdP', ['idc']), sub(266, 70, 'Entra ID · Okta · AD — SAML + SCIM', ['idc']),
        big(660, 50, ['iam'], true), T(644, 54, 'Third-party account', ['iam'], 'end'), sub(644, 70, 'assumes a role · external ID', ['iam'], 'end'),
        circle(860, 50, ['iam'], true), T(876, 54, 'On-prem servers', ['iam']), sub(876, 70, 'IAM Roles Anywhere', ['iam']),
        /* management account */
        square(70, 180, ['org'], true), sub(86, 170, 'Organizations root', ['org']),
        square(70, 260, ['org'], true), sub(86, 264, 'SCPs · RCPs · declarative', ['org']), sub(86, 279, 'tag · backup policies', ['org']),
        triangle(250, 330, ['idc'], true), sub(236, 334, 'IAM Identity Center', ['idc'], 'end'), sub(236, 349, 'permission sets', ['idc'], 'end'),
        hexa(110, 400, ['ct'], true), sub(110, 382, 'Control Tower', ['ct'], 'middle'), sub(126, 423, 'Account Factory', ['ct']),
        penta(130, 440, ['billing'], true), sub(146, 452, 'one bill · RI/SP shared', ['billing']),
        /* security OU */
        square(495, 180, ['org'], true),
        ...ring(420, 250, ['config']), sub(420, 274, 'org trail · logs', ['config'], 'middle'),
        ...ring(600, 250, ['config']), sub(600, 274, 'aggregator', ['config'], 'middle'),
        circle(520, 330, ['iam'], true), sub(520, 352, 'Access Analyzer', ['iam'], 'middle'),
        hexa(420, 400, ['ct'], true), sub(420, 424, 'Log Archive', ['ct'], 'middle'),
        hexa(560, 400, ['ct'], true), sub(560, 424, 'Audit', ['ct'], 'middle'),
        /* network */
        square(830, 180, ['org'], true),
        diamond(740, 250, ['ram'], true), sub(740, 274, 'Shared VPC', ['ram'], 'middle'),
        diamond(900, 250, ['ram'], true), sub(900, 274, 'Transit Gateway', ['ram'], 'middle'),
        diamond(740, 380, ['ram'], true), sub(756, 384, 'VPC Resolver rules', ['ram']), sub(756, 399, 'prefix lists', ['ram']),
        /* workloads */
        square(250, 480, ['org'], true), square(750, 480, ['org'], true),
        big(250, 600, ['idc', 'iam'], false), sub(266, 590, 'Role from permission set', ['idc', 'iam']),
        big(750, 600, ['idc'], false), sub(766, 590, 'Role from permission set', ['idc']),
        circle(380, 740, ['iam'], true), sub(396, 744, 'S3 bucket policy', ['iam']), sub(396, 759, 'aws:PrincipalOrgID', ['iam']),
        diamond(110, 700, ['ram'], true), sub(110, 724, 'EC2 in shared subnet', ['ram'], 'middle'),
        diamond(740, 700, ['ram'], true), sub(756, 724, 'EC2 in shared subnet', ['ram']),
        ...ring(110, 780, ['config']), sub(110, 804, 'Config rules', ['config'], 'middle'),
        ...ring(290, 780, ['config']), sub(290, 804, 'SSM Automation fix', ['config'], 'middle'),
        ...ring(760, 780, ['config']), sub(760, 804, 'Config rules', ['config'], 'middle'),
        penta(380, 830, ['billing'], true), sub(396, 852, 'Prod usage', ['billing']),
        penta(900, 830, ['billing'], true), sub(884, 852, 'Dev usage', ['billing'], 'end'),
        ...LABELS
      ]
    },

    stub: [
      { id: 'scope', label: 'SCOPE', short: 'SCOPE', values: ['one account', 'OU', 'whole org', 'cross-account'] },
      { id: 'control', label: 'CONTROL', short: 'CONTROL', values: ['prevent', 'detect', 'grant', 'share', 'remediate', 'provision'] },
      { id: 'who', label: 'WHO', short: 'WHO', values: ['workforce human', 'workload', 'app customer', 'third party', 'AWS service'] },
      { id: 'sup', label: 'SUPERLATIVE', short: 'SUP', values: ['least ops', 'least privilege', 'cheapest', 'fastest', 'none stated'] }
    ],

    method:
`1. Strip the story. Keep WHERE it must apply (one account, an OU, every account,
   another account) and WHAT must happen (block it, find it, grant it, share it, fix it,
   create accounts).
2. Fill the stub, the same 4 slots for this session:
   SCOPE (one account / OU / whole org / cross-account) ____
   CONTROL (prevent / detect / grant / share / remediate / provision) ____
   WHO (workforce human / workload / app customer / third party / AWS service) ____
   SUPERLATIVE (least ops / least privilege / cheapest / fastest / none) ____
3. For EACH option ask: "what problem was this service BUILT for?"
   No match with the stub -> cross it out, however complete it sounds
   (Control Tower for one guardrail, Transit Gateway to share one VPC, Config to block,
   an SCP to grant, Cognito for employees).
4. Among the survivors, the one that satisfies the SUPERLATIVE wins.`,

    cheat:
`GOVERNANCE = SCOPE + CONTROL (prevent / detect / grant / share / fix / provision) + WHO + SUP
ORGS        management account + OUs (5 levels) + member accounts · all features vs billing only
            policies need ALL FEATURES · delegated admin = a member account runs a service org-wide
SCP         ceiling for IAM users, roles AND member root user · GRANTS NOTHING · Deny wins
            never applies to: management account, service-linked roles
            Allow needed at EVERY level root -> OU -> account (FullAWSAccess by default)
            deny-list (keep FullAWSAccess + Deny) vs allow-list (replace it) · 10 per node, 10,240 chars
RCP         ceiling on RESOURCES in member accounts (S3, KMS, STS, SQS, Secrets Mgr ...) -> outsiders
DECLARATIVE set a service config org-wide (EC2: VPC Block Public Access, snapshot block public access)
EVALUATION  explicit Deny? -> RCP -> SCP -> resource policy -> identity policy -> boundary -> session
            same account: identity OR resource Allow · cross-account: identity AND resource Allow
BOUNDARY    max for ONE user/role, set in the account · effective = identity AND boundary
STS         AssumeRole: trust policy (who) + permissions policy (what) · 15 min - 12 h (chain: 1 h)
            third party -> role + EXTERNAL ID (confused deputy) · services -> aws:SourceArn/Account
ORG KEYS    aws:PrincipalOrgID (caller in my org) · aws:ResourceOrgID (resource in my org)
            aws:SourceOrgID (AWS service acting for a resource in my org) · ABAC: PrincipalTag = ResourceTag
ANALYZER    Access Analyzer: external access (free) · internal + unused access (paid) · policy checks
IDENTITY    employees, many accounts -> IAM Identity Center (SAML 2.0 + SCIM, permission sets)
            app customers -> Cognito · workloads -> roles · outside AWS -> IAM Roles Anywhere
CONTROL TWR landing zone + controls + Account Factory, least ops for NEW multi-account setup
            preventive = SCP/RCP/declarative · detective = Config rule · proactive = CFN Hook
RAM         share subnets (VPC sharing, same org), TGW, Resolver rules, prefix lists, SGs, Aurora
            in org: no invitations · participants can't touch owner's route tables/NACLs
CONFIG      records config items · rules on change / periodic · conformance packs · aggregator
            remediation = SSM Automation · DETECTS, never prevents · CloudTrail = who called
BILLING     one bill · volume tiers combined · RI + SP shared by default (off per account)
            cost allocation tags: activate in Billing · tag policy standardises, SCP requires
NEVER: Control Tower for one SCP · TGW to share one VPC · Config to block · SCP to grant ·
       SCP on the management account · IAM users for employees · Cognito for staff`,

    compare: [
      { id: 'scp-pb', short: 'SCP · Boundary · IAM', title: 'SCP vs permission boundary vs identity policy — two ceilings and a grant',
        sides: [{ name: 'SCP', line: 'org', fig: { dir: 'one', left: 'ORG', right: 'ACCT', keep: true }, gist: 'A **ceiling for every principal in an account or OU**, set from the organization. Grants nothing. Admins and the member root user are bound by it.' }, { name: 'Permission boundary', line: 'iam', fig: { dir: 'one', left: 'ADMIN', right: '1 ROLE' }, gist: 'A **ceiling for one IAM user or role**, set inside the account. Grants nothing. Used to let developers create roles that can never exceed it.' }, { name: 'Identity policy', line: 'iam', fig: { dir: 'one', left: 'POLICY', right: 'ROLE', keep: true }, gist: 'The **grant**. Nothing is allowed until an identity (or resource) policy allows it.' }],
        rows: [['Grants access', 'no', 'no', '**yes**'], ['Applies to', 'all IAM principals in member accounts (not the management account, not service-linked roles)', 'the one user or role it is attached to', 'the user, group or role it is attached to'], ['Set by', 'the organization (management account or delegated admin)', 'an account admin', 'an account admin'], ['Deciding words', 'every account, even administrators, deny Region, cannot leave the org', 'delegate role creation, developers must not escalate', 'allow this role to …'], ['Tempting wrong', 'to give one team access', 'to restrict a whole account', 'to restrict other accounts']],
        check: { q: '“Developers may create IAM roles for their Lambda functions, but no role they create may ever have more permissions than the developers’ own set.”', opts: ['SCP', 'Permission boundary', 'Identity policy'], a: 1, why: 'Delegated role creation inside one account is the permission-boundary pattern: require the boundary on every role the developers create. An SCP would restrict the whole account.' } },
      { id: 'scp-rcp', short: 'SCP · RCP', title: 'SCP vs RCP — the principal side vs the resource side',
        sides: [{ name: 'SCP', line: 'org', fig: { dir: 'one', left: 'MY ROLE', right: 'ANY RES' }, gist: 'Limits what **your principals** (in member accounts) can do, **on any resource anywhere**.' }, { name: 'RCP', line: 'org', fig: { dir: 'one', left: 'ANYONE', right: 'MY RES' }, gist: 'Limits what **anyone** — including principals from other organizations — can do **to your resources** in member accounts.' }],
        rows: [['Restricts', 'IAM users and roles in member accounts', 'resources in member accounts (S3, KMS, STS, SQS, Secrets Manager and dozens more)'], ['Stops', 'my people doing X anywhere', 'outsiders doing X to my data, even if a bucket policy allows it'], ['Not applied to', 'management account, service-linked roles', 'management account resources, service-linked roles, AWS managed KMS keys'], ['Grants', 'nothing', 'nothing'], ['Deciding words', 'our accounts must not, even admins', 'no identity outside our organization may access our buckets, data perimeter'], ['Since', '2017', 'Nov 2024 (newer than most practice banks)']],
        check: { q: '“Whatever bucket policies developers write, no principal outside the organization may ever read objects from S3 buckets in member accounts.”', opts: ['SCP', 'RCP'], a: 1, why: 'The restriction is on the resources, against outside callers. An SCP never sees principals from other organizations. (Before RCPs, the answer was an aws:PrincipalOrgID condition in every bucket policy.)' } },
      { id: 'idc-iam-cog', short: 'Identity Center · IAM · Cognito', title: 'IAM Identity Center vs IAM users vs Cognito — who is signing in?',
        sides: [{ name: 'IAM Identity Center', line: 'idc', fig: { dir: 'one', left: 'STAFF', right: 'ACCTS', keep: true }, gist: '**Your workforce** into **many accounts** and business apps. Corporate IdP via SAML 2.0 + SCIM, permission sets, temporary credentials.' }, { name: 'IAM users', line: 'iam', fig: { dir: 'one', left: 'PERSON', right: '1 ACCT' }, gist: 'Long-term identities in **one account** with passwords and access keys. AWS recommends federation or roles instead.' }, { name: 'Cognito', line: null, fig: { dir: 'one', left: 'USER', right: 'APP' }, gist: '**Your application’s customers** (Session 5): sign-up, social login, JWTs, temporary AWS credentials for the app.' }],
        rows: [['Who', 'employees, contractors', 'a few humans or legacy tools', 'end users of your app, often millions'], ['Where they sign in', 'AWS access portal, then any assigned account', 'one account’s console or API', 'your app’s login page'], ['Credentials', 'temporary, per permission set', 'long-term password + keys', 'JWTs; temporary AWS credentials via identity pool'], ['Deciding words', 'employees, corporate IdP, single sign-on, many accounts', 'emergency access, a tool that cannot federate', 'customers, mobile app, social login, sign-up']],
        check: { q: '“1,500 employees already in Microsoft Entra ID need console access to 40 AWS accounts, with access removed automatically when they leave.”', opts: ['IAM Identity Center', 'IAM users', 'Cognito'], a: 0, why: 'Workforce + many accounts + corporate IdP: Identity Center with Entra ID over SAML 2.0 and SCIM provisioning — a leaver is disabled in Entra and loses access everywhere.' } },
      { id: 'ct-orgs', short: 'Control Tower · Orgs', title: 'Control Tower vs Organizations alone',
        sides: [{ name: 'Control Tower', line: 'ct', fig: { dir: 'one', left: 'SETUP', right: 'LZ', keep: true }, gist: 'Builds a **governed landing zone** on top of Organizations: shared log and audit accounts, org trail, Config, Identity Center, **controls**, **Account Factory**.' }, { name: 'Organizations', line: 'org', fig: { dir: 'one', left: 'MGMT', right: 'OUs' }, gist: 'The **raw building blocks**: accounts, OUs, SCPs, RCPs and other policies, consolidated billing. You design and wire everything else yourself.' }],
        rows: [['What you get', 'a multi-account baseline in hours, pre-built controls, a compliance dashboard', 'the structure and policy engine only'], ['New accounts', 'Account Factory (console, Service Catalog, AFT for Terraform), governed on day one', 'CreateAccount, then your own baseline'], ['Guardrails', 'preventive, detective and proactive controls from the Control Catalog', 'SCPs/RCPs you write; Config rules you deploy'], ['Cost', 'no extra charge; you pay for Config, CloudTrail, etc.', 'free'], ['Deciding words', 'set up, landing zone, least effort for many new accounts, best practices', 'one guardrail, deny Region, stop leaving, existing org'], ['Tempting wrong', 'for one SCP in an existing org (your prestige pick)', 'for “set up a governed multi-account environment with least effort”']],
        check: { q: '“A startup is moving to 20 AWS accounts. It needs central logging, a security audit account, SSO and baseline guardrails applied to every new account automatically, with the least operational overhead.”', opts: ['Control Tower', 'Organizations alone'], a: 0, why: 'A whole governed baseline plus account vending is exactly a Control Tower landing zone. Doing it with Organizations alone means building every piece yourself.' } },
      { id: 'ram-peer-tgw', short: 'VPC sharing · Peering · TGW', title: 'VPC sharing (RAM) vs VPC peering vs Transit Gateway',
        sides: [{ name: 'VPC sharing (RAM)', line: 'ram', fig: { dir: 'none', left: 'OWNER', right: 'ACCTS' }, gist: '**One VPC**, owned by a network account; subnets shared with other accounts in the org, which launch their resources **into** it.' }, { name: 'VPC peering', line: null, fig: { dir: 'both', left: 'VPC A', right: 'VPC B' }, gist: 'A private link between **two** VPCs (Session 3). Not transitive, no overlapping CIDRs, no fee for the peering itself.' }, { name: 'Transit Gateway', line: null, fig: { dir: 'both', left: 'VPCs', right: 'HUB', cache: true, cacheLabel: 'TGW' }, gist: 'A regional **hub** connecting **many VPCs** and on-premises (Session 3), with route tables; can itself be shared via RAM.' }],
        rows: [['Number of VPCs', 'one, shared', 'pairs', 'many, full mesh through the hub'], ['Who owns routing', 'the owner account (participants cannot change it)', 'each side', 'the TGW owner'], ['Cost', 'no extra network charge; resources billed to whoever owns them', 'no peering fee; data transfer', 'per attachment-hour + per GB'], ['Deciding words', 'central network team, accounts deploy into the same VPC, fewer VPCs', 'two VPCs, low cost, no transitive', 'dozens of VPCs, on-prem, transitive routing'], ['Tempting wrong', 'when VPCs are separate and must stay separate', 'for 30 VPCs (mesh explodes)', 'when one shared VPC would do (your prestige pick)']],
        check: { q: '“A network team must own and manage one VPC; application teams in 12 accounts of the organization launch their own EC2 instances into its subnets.”', opts: ['VPC sharing (RAM)', 'VPC peering', 'Transit Gateway'], a: 0, why: 'Resources from many accounts in one centrally owned VPC is VPC sharing. Peering and Transit Gateway connect separate VPCs.' } },
      { id: 'role-rbp', short: 'Role · Resource policy', title: 'Cross-account role (AssumeRole) vs resource-based policy',
        sides: [{ name: 'Cross-account role', line: 'iam', fig: { dir: 'one', left: 'ACCT A', right: 'ROLE B', keep: true }, gist: 'The caller **assumes a role in the other account** (trust policy + external ID for third parties) and **gives up its own permissions** while in the role.' }, { name: 'Resource-based policy', line: 'iam', fig: { dir: 'one', left: 'ACCT A', right: 'S3 IN B' }, gist: 'The resource (bucket, key, queue, topic, Lambda) **names the other account or principal**. The caller keeps its own identity and permissions.' }],
        rows: [['Works for', 'any service and action', 'only services with resource policies (S3, KMS, SQS, SNS, Lambda …)'], ['Caller keeps own permissions', 'no — acts as the role', 'yes — useful to copy data between its own and the other account'], ['Needs on the caller side', 'permission to call sts:AssumeRole', 'an identity policy allowing the action'], ['Deciding words', 'third-party vendor, external ID, many services, audit who assumed', 'bucket shared with another account, copy objects between accounts, org-wide bucket access']],
        check: { q: '“A Lambda function in account A must read objects from a bucket in account B and write the results to a bucket in account A in the same call.”', opts: ['Cross-account role', 'Resource-based policy'], a: 1, why: 'A bucket policy in B granting A’s role lets the function keep its own permissions for its own bucket. Assuming a role in B would drop A’s permissions for the write.' } },
      { id: 'cfg-trail-scp', short: 'Config · CloudTrail · SCP', title: 'Config vs CloudTrail vs SCP — record, audit, prevent',
        sides: [{ name: 'AWS Config', line: 'config', fig: { dir: 'one', left: 'RES', right: 'HISTORY' }, gist: '**What a resource looks like** now and over time, and whether it **complies** with rules. Detects, can remediate afterwards.' }, { name: 'CloudTrail', line: null, fig: { dir: 'one', left: 'API', right: 'LOG' }, gist: '**Who called which API**, when, from where (Session 11). An organization trail logs every account.' }, { name: 'SCP', line: 'org', fig: { dir: 'one', left: 'API', right: 'DENIED', keep: true }, gist: '**Stops the call** before anything changes, in every member account.' }],
        rows: [['Question answered', 'what changed, is it compliant?', 'who did it?', 'can it happen at all?'], ['Timing', 'after the change', 'after the call', 'before — the call fails'], ['Deciding words', 'configuration history, noncompliant, conformance pack, remediate', 'who deleted, audit API activity, user activity', 'prevent, deny, no account may'], ['Tempting wrong', 'to prevent', 'to see how a resource was configured', 'to find out who did something']],
        check: { q: '“Security wants to know which IAM user deleted a production security group yesterday.”', opts: ['AWS Config', 'CloudTrail', 'SCP'], a: 1, why: 'Who called DeleteSecurityGroup is an API-activity question: CloudTrail. Config shows the group’s configuration timeline, not the caller as its primary job.' } },
      { id: 'tag-scp', short: 'Tag policy · SCP', title: 'Tag policy vs SCP requiring tags',
        sides: [{ name: 'Tag policy', line: 'org', fig: { dir: 'one', left: 'TAGS', right: 'RULES' }, gist: '**Standardises** tag keys, capitalisation and allowed values. With enforcement, blocks **non-compliant** tag values on chosen resource types. Untagged resources are **not** evaluated.' }, { name: 'SCP with tag condition', line: 'org', fig: { dir: 'one', left: 'CREATE', right: 'DENIED', keep: true }, gist: 'Denies create calls when a tag is **missing** (`aws:RequestTag`, `Null` condition) or blocks deleting tags (`aws:TagKeys`).' }],
        rows: [['Stops untagged resources', 'no', '**yes**'], ['Stops a wrong value (CostCenter = “abc”)', 'yes, where enforced', 'possible, but awkward'], ['Reports compliance', 'yes, per account and org-wide', 'no'], ['Deciding words', 'consistent tag keys and values, capitalisation, report', 'must be tagged at creation, deny if tag missing'], ['Tempting wrong', 'for “no resource may be created without a CostCenter tag”', 'for “standardise the capitalisation of tag keys”']],
        check: { q: '“No EC2 instance may be launched in any member account without a CostCenter tag.”', opts: ['Tag policy', 'SCP with tag condition'], a: 1, why: 'A missing tag is only stopped by denying the call: an SCP that denies ec2:RunInstances when aws:RequestTag/CostCenter is null. Tag policies do not evaluate untagged resources.' } }
    ],

    traps: [
      { title: 'Control Tower for one guardrail', x: 'Prestige distractor. The organization exists; the need is one restriction (deny a Region, stop leaving the org). An SCP attached to the right OU does it with no landing zone.', drills: ['G1', 'G4'] },
      { title: 'Transit Gateway to share one VPC', x: 'Prestige distractor. Accounts that only need to place resources in a central VPC use VPC sharing through RAM: no attachments, no hourly hub.', drills: ['G2', 'G5'] },
      { title: 'Network Firewall to keep data inside the org', x: 'Prestige distractor. Who may call S3 is an authorization question: `aws:PrincipalOrgID` in the bucket policy (or an RCP), not a packet filter.', drills: ['G3'] },
      { title: 'An SCP that “grants” access', x: 'SCPs and RCPs only filter. With FullAWSAccess attached, a role still needs an identity (or resource) policy that allows the action.', drills: ['G6', 'G8'] },
      { title: 'An SCP on the management account', x: 'SCPs and RCPs never apply to the management account. Keep workloads out of it; protect it with MFA and few users.', drills: ['G7'] },
      { title: 'Account admin or member root user bypassing an SCP', x: 'No principal in a member account escapes an SCP — administrators and the root user included. Only service-linked roles are exempt.', drills: ['G6'] },
      { title: 'Permission boundary vs SCP', x: 'A boundary caps one user or role, set inside the account. An SCP caps every principal in accounts or OUs, set by the organization. Both grant nothing.', drills: ['G9', 'G10'] },
      { title: 'Cross-account access with only one side', x: 'Across accounts, the caller’s identity policy AND the resource policy must allow the action. In the same account either one is enough.', drills: ['G11'] },
      { title: 'Access keys for a third party', x: 'Give a vendor a role to assume with an external ID in the trust policy. Never IAM user keys.', drills: ['G12'] },
      { title: 'Listing account IDs in a bucket policy', x: 'Use `aws:PrincipalOrgID` (or `aws:PrincipalOrgPaths` for OUs): new accounts are covered automatically.', drills: ['G3', 'G14'] },
      { title: 'IAM users or Cognito for employees', x: 'Workforce + many accounts = IAM Identity Center with the corporate IdP (SAML 2.0 + SCIM). Cognito is for your app’s customers.', drills: ['G16', 'G17'] },
      { title: 'Config to prevent', x: 'Config records and evaluates after the change; remediation fixes it afterwards with SSM Automation. Prevent = SCP (or a proactive control for CloudFormation).', drills: ['G22', 'G24'] },
      { title: 'CloudTrail vs Config', x: 'Who made the API call → CloudTrail. What the resource looked like and whether it complies → Config.', drills: ['G23'] },
      { title: 'Buying RIs per account', x: 'Consolidated billing already shares RI and Savings Plans discounts across the organization by default.', drills: ['G27'] },
      { title: 'Tag policy to block untagged resources', x: 'Tag policies standardise keys and values; untagged resources are not evaluated. Require a tag at creation with an SCP condition.', drills: ['G29'] },
      { title: 'Participants managing a shared VPC', x: 'In VPC sharing, only the owner manages the VPC, subnets, route tables, NACLs and gateways. Participants manage their own resources.', drills: ['G19'] }
    ],

    log: [
      { when: '2 Sept 2026', what: 'Baseline practice exam, governance pattern', result: 'Q49 “config changes” missed; Transit Gateway picked where it had no role', lesson: 'Missed keyword: “configuration changes over time” is AWS Config. Prestige distractor: an option with Transit Gateway looked more complete. The fix: name the job first (share a VPC → RAM; one guardrail → SCP). The pattern is trained in drills G1–G5.' },
      { when: '—', what: 'Session 6 quiz', result: 'not taken yet', lesson: 'Run all 30 scenarios once. Misses are tagged in “Where it broke” and show up in Progress.' }
    ]
  });
})();
