# Session 6 — Multi-account & Governance: build brief

Built as `sessions/06-governance/` on the same engine and design as Sessions 1–5. Follows CONTEXT.md §9. Cluster 6 in §5: Organizations / SCP / RCP / declarative, tag and backup policies / IAM Identity Center / Control Tower / RAM / Config, plus the IAM policy mechanics Session 5 left as boundaries (evaluation logic, permission boundaries, session policies, roles and trust policies, STS, external ID, org condition keys, Access Analyzer, ABAC, Roles Anywhere). D4: consolidated billing and tag governance. Domains **D1 ●● D4 ●** (weak).

His record here: baseline **Q49** (“config changes” → Config, tag **K**) and the **prestige-distractor pattern** (CONTEXT §3) with **Transit Gateway**; the session adds **Control Tower** as the governance-flavoured prestige service. Drills **G1–G5** and cards **c01, c18, c28, c32, c33** carry `mine: true`, `src: 'Exam pattern'`, tag **C**. CloudTrail (deep), Trusted Advisor and monitoring Config belong to **Session 11**; Firewall Manager to **Session 5**; Directory Service to **Session 2** — boundaries only.

## Colour rule

The same service keeps the same colour on every page. The eleven existing hues are **not** reused. **Session 6 adds no hue.**

Why: Session 5’s search of the sRGB cube (CIEDE2000 after Machado-2009 CVD simulation, contrast ≥ 4.5:1, L\* ≥ 30) found no candidate that separates from all 11 hues + ink (best worst-pair 8.2, a blue-violet sibling of DataSync and GA). Nothing has changed in the palette since, so every Session 6 family is an **ink line** (4 px), told apart by dash and station shape and always labelled. Chart bars stay ink with swatch + label.

| Line (`id`) | Dash | Stations |
|---|---|---|
| Organizations · SCP · RCP (`org`) | solid | squares |
| IAM policies · roles · STS (`iam`) | `2 7` short dashes | circles |
| IAM Identity Center (`idc`) | `10 6` dashes | triangles |
| Control Tower (`ct`) | `16 5 3 5` dash-dot | hexagons |
| RAM · resource sharing (`ram`) | `1 9` dots | diamonds |
| AWS Config (`config`) | `24 8` long dashes | rings (circle + dot) |
| Consolidated billing · cost tags (`billing`) | `6 4` tight dashes | pentagons |

Topic (neutral chip, no hue): `nbr` = Neighbours: Service Catalog · CloudTrail · Directory.

Known limit (engine, unchanged): the phone “Pick a line” cards draw dashed lines with the fixed `12 8` pattern (same as Sessions 4–5).

Domains: D1 throughout (guardrails, permissions, identity, sharing, compliance); D4 in chapter 11 (consolidated billing, RI/SP sharing, cost allocation tags) and cost notes in RAM/VPC sharing and Control Tower.

## Facts verified 2026-09-25 (AWS docs via the AWS MCP server)

**Organizations**
- All features vs consolidated billing only; billing-only has no policies or integrations; switch is one-way, every invited account approves — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_org_support-all-features.html · https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html
- Policy types: authorization (SCP, RCP) and declarative/management (EC2 declarative, backup, tag, chat applications, AI services opt-out, Security Hub, Inspector, Bedrock, upgrade rollout, S3); SCP/RCP don’t affect the management account, declarative types do — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies.html (read myself)
- Quotas: **10 SCPs per root/OU/account, SCP 10,240 characters** (RCP 5 per entity, 5,120 chars); OU nesting 5 levels; 2,000 OUs; default **10 accounts** (new orgs may start lower); invitations expire after 15 days; created account ≥ 4 days before removal — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_reference_limits.html (read myself) · change May 2026 — https://aws.amazon.com/about-aws/whats-new/2026/05/aws-organizations-increased-scp-quotas/
- **SCPs support the full IAM policy language (Sept 2025)**: conditions, resource ARNs, NotAction in Allow — https://aws.amazon.com/about-aws/whats-new/2025/09/aws-organizations-iam-language-service-control-policies/ (spot-checked) · syntax page (its Resource section still has a stale “only \*” sentence) — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_syntax.html
- SCPs don’t affect the management account or service-linked roles; they do affect member root users — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html · Allow needed at every level, Deny inherited, FullAWSAccess default — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_evaluation.html
- **RCPs**: restrict resources in member accounts for any caller incl. other orgs and root users; not the management account, not service-linked roles, not AWS managed KMS keys, not kms:RetireGrant; ~60 services (S3, STS, KMS, SQS, Secrets Manager, DynamoDB, ECR, CloudWatch Logs, Cognito …) — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_rcps.html (read myself)
- Declarative policies (EC2: VPC Block Public Access, snapshot block public access), maintained as APIs change — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_declarative_policies.html · https://docs.aws.amazon.com/ebs/latest/userguide/block-public-access-snapshots-enable.html
- Delegated administrator — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_integrate_services_list.html
- **Direct account transfer between organizations (Nov 2025)** — https://aws.amazon.com/about-aws/whats-new/2025/11/aws-organizations-direct-account-transfers/ (spot-checked) · requirements — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_account_migration.html · removal rules — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts_remove.html
- Centralized root access management: remove member root credentials, `sts:AssumeRoot` task sessions — https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html · (Nov 2024, blog) https://aws.amazon.com/blogs/security/secure-root-user-access-for-member-accounts-in-aws-organizations/
- Tag policies: noncompliant values prevented where enforced; **untagged resources not evaluated** — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies.html · backup policies — https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_backup.html

**IAM / STS**
- Evaluation: explicit Deny → RCP → SCP → resource-based → identity → boundary → session; same-account user ARN vs role ARN vs session ARN rule; cross-account needs both sides — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html · https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html · boundaries — https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- Quotas: **managed policies per role 20 (max 25)**, per user 10 (20); role trust policy 2,048 (max 8,192); managed policy 6,144; session policy 1 inline + 10 ARNs — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html (spot-checked)
- AssumeRole 900 s to role max (1–12 h), default 1 h; role chaining 1 h; external ID; aws:SourceArn/SourceAccount — https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html
- Condition keys PrincipalOrgID/Paths, ResourceOrgID, SourceOrgID, PrincipalTag/ResourceTag/RequestTag/TagKeys — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- Access Analyzer: external access (free), **internal access** and unused access (paid), custom policy checks (paid), policy generation — https://aws.amazon.com/iam/access-analyzer/pricing/ · https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-custom-policy-checks.html
- Roles Anywhere (X.509, trust anchor) — https://docs.aws.amazon.com/help-panel/rolesanywhere/latest/console/hp-roles-anywhere.html · ABAC/session tags — https://docs.aws.amazon.com/tag-editor/latest/userguide/tags-in-iam-policies.html

**IAM Identity Center**
- Renamed from AWS SSO 26 July 2022; organization vs account instance (account instance: no permission sets to accounts); permission sets → `AWSReservedSSO_` roles; identity sources (directory, AD, SAML 2.0 + SCIM); no extra charge — https://docs.aws.amazon.com/singlesignon/latest/userguide/identity-center-instances.html · https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html · https://docs.aws.amazon.com/singlesignon/latest/userguide/referencingpermissionsets.html
- **Multi-Region replication GA Feb 2026** (org instance, external IdP, multi-Region CMK) — https://docs.aws.amazon.com/singlesignon/latest/userguide/multi-region-iam-identity-center.html · https://aws.amazon.com/blogs/aws/aws-iam-identity-center-now-supports-multi-region-replication-for-aws-account-access-and-application-use/ (spot-checked)

**Control Tower**
- Landing zone structure; **4.0 (17 Nov 2025)**: optional Config/CloudTrail/Backup/security roles, **Security OU no longer required**, controls-only setup — https://docs.aws.amazon.com/controltower/latest/userguide/how-control-tower-works.html · https://docs.aws.amazon.com/controltower/latest/userguide/2025-all.html (spot-checked)
- Controls: preventive (SCP, RCP, declarative), detective (Config), proactive (CloudFormation Hooks); mandatory / strongly recommended / elective; “guardrails” = controls — https://docs.aws.amazon.com/controltower/latest/controlreference/control-behavior.html · https://docs.aws.amazon.com/controltower/latest/controlreference/doc-history.html
- Account Factory, AFT, AFC, drift — https://docs.aws.amazon.com/controltower/latest/userguide/taf-account-provisioning.html · https://docs.aws.amazon.com/controltower/latest/userguide/af-customization-page.html · https://docs.aws.amazon.com/controltower/latest/userguide/resolving-drift.html · no extra charge — https://docs.aws.amazon.com/controltower/latest/userguide/pricing.html

**RAM / VPC sharing / Service Catalog**
- Shareable types (subnets and **security groups** org-only; TGW, prefix lists, IPAM pools, Resolver rules, Route 53 Profiles, Aurora, License Manager, Network Firewall, EBS volumes …) — https://docs.aws.amazon.com/ram/latest/userguide/shareable.html · security group sharing (spot-checked) — https://docs.aws.amazon.com/vpc/latest/userguide/security-group-sharing.html
- No invitations inside an org with sharing enabled — https://docs.aws.amazon.com/ram/latest/userguide/getting-started-sharing.html
- VPC sharing: same org, no default-VPC subnets, participants can’t modify owner resources (can’t describe NAT gateways); billing split (owner pays NAT GW, endpoints, TGW, public IPv4) — https://docs.aws.amazon.com/vpc/latest/userguide/vpc-share-limitations.html · https://docs.aws.amazon.com/vpc/latest/userguide/vpc-share-billing.html
- Service Catalog launch constraints, org portfolio sharing — https://docs.aws.amazon.com/servicecatalog/latest/adminguide/constraints-launch.html · https://docs.aws.amazon.com/organizations/latest/userguide/services-that-can-integrate-servicecatalog.html

**Config**
- Continuous vs **daily** recording — https://docs.aws.amazon.com/config/latest/developerguide/select-resources.html
- Triggers change/periodic (1, 3, 6, 12, 24 h), detective and **proactive** modes (proactive does not block) — https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_components.html · https://aws.amazon.com/config/faqs/
- “Config rules do not prevent the user from making changes” — https://aws.amazon.com/config/faqs/
- Organization conformance packs, aggregators — https://docs.aws.amazon.com/config/latest/developerguide/conformance-pack-organization-apis.html · https://docs.aws.amazon.com/config/latest/developerguide/aggregate-data.html
- Remediation via SSM Automation, retries — https://docs.aws.amazon.com/config/latest/APIReference/API_PutRemediationConfigurations.html
- `s3-bucket-level-public-access-prohibited` is change-triggered — https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-level-public-access-prohibited.html (read myself)
- CloudTrail organization trail (members can’t modify) — https://docs.aws.amazon.com/awscloudtrail/latest/userguide/creating-trail-organization.html

**Billing**
- Consolidated billing: one bill per seller of record, combined volume pricing, RI/SP sharing — https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/consolidated-billing.html
- RI/SP sharing on by default; management account deactivates per account; buyer benefits first; both buyer and receiver must be active; **prioritized / restricted group sharing** via Cost Categories — https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html (read myself)
- Billing transfer — https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/orgs_transfer_billing.html · Billing Conductor — https://docs.aws.amazon.com/billingconductor/latest/userguide/understanding-proforma.html · cost allocation tag activation (up to 24 h) — https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html

### Changed since the exam guide (shown as callouts)

| Old (banks / older courses) | Now | Source |
|---|---|---|
| SCP Allow statements: only `Resource: "*"`, no conditions | **Full IAM policy language** (Sept 2025) | whats-new 2025/09 |
| 5 SCPs per node, 5,120 characters | **10 per node, 10,240 characters** (May 2026) | orgs_reference_limits.html |
| Policy types: SCP, tag, backup, AI opt-out | + **RCP** (Nov 2024), **declarative** (Dec 2024), chat, Security Hub, Inspector, Bedrock, upgrade rollout, S3 | orgs_manage_policies.html |
| Move account: leave org, go standalone, accept invite | **Direct transfer** (Nov 2025) | whats-new 2025/11 |
| Member root credentials in every account | **Centralized root access management** (Nov 2024), `sts:AssumeRoot` | id_root-user.html |
| Evaluation starts with SCPs | **RCPs** checked too | policy-eval-denyallow.html |
| 10 managed policies per role; trust policy max 4,096 | **20 (max 25)**; trust policy max **8,192** | reference_iam-quotas.html |
| Access Analyzer = external access | + **internal access**, unused access (paid), custom checks | access-analyzer pricing |
| AWS Single Sign-On | **IAM Identity Center** (Jul 2022); multi-Region replication (Feb 2026) | what-is.html, multi-region page |
| Guardrails: preventive (SCP) + detective (Config); Security OU mandatory | **Controls** + proactive (Hooks); preventive also RCP/declarative; **landing zone 4.0** makes Security OU and integrations optional | control-behavior.html, 2025-all.html |
| Config records continuously | **Daily recording** option (Nov 2023); proactive rule mode | select-resources.html |
| RAM: subnets, TGW, Resolver rules, license configs | + **security groups**, Route 53 Profiles, EBS volumes, S3 Access Grants … | shareable.html |
| RI sharing on/off per account | + **group sharing** (prioritized / restricted); **billing transfer** | ri-turn-off.html |
| Route 53 Resolver | **Route 53 VPC Resolver** (Session 3/4) | — |

### Not verified → not printed
Exact date “guardrails” became “controls” (printed without a date); RCP/declarative launch dates rest on Control Tower doc history and blogs (printed as Nov/Dec 2024); root access management date from an AWS blog; Shield Network Security Director policy type (docs disagree — not printed); Access Analyzer and Config prices (internal/unused access paid, Config $0.003/CI verified but not printed); Config Guard rules printed without a doc quote (well known, noted by the verifier as not quoted); STS 600 req/s quota verified but not printed; an official page saying only the management account activates cost allocation tags (printed as “in the management account’s Billing console”, the standard procedure); cost allocation tag backfill (not claimed either way). No real AWS prices in the billing widget — all numbers are user inputs.

## Stub for this session (replaces Session 5’s slots)

| Slot | Values | Why this slot |
|---|---|---|
| SCOPE | one account · OU · whole org · cross-account | Kills a permission boundary for “every account”, an SCP for one role, Control Tower for one account; cross-account flags the both-sides rule. |
| CONTROL | prevent · detect · grant · share · remediate · provision | The Config-vs-SCP trap (detect vs prevent), the SCP-grants trap, TGW-to-share-one-VPC, Control Tower (provision) vs SCP (prevent). |
| WHO | workforce human · workload · app customer · third party · AWS service | Identity Center vs Cognito vs roles vs external ID vs aws:SourceArn. |
| SUPERLATIVE | least ops · least privilege · cheapest · fastest · none stated | “least privilege” is constant in IAM questions; “least ops” kills custom scripts vs landing zone / conformance packs. |

## Learn: 12 chapters (full text in `learn.js`; ▶ = interactive)

1. **How to read a governance question** — record table (Q49, TGW, CT), scope × control table, stub, built-for hooks. ▶ stub trainer on G1 · ▶ 2 checkpoints (CT, TGW prestige tests).
2. **The governance map** — six jobs, prevent vs detect words, boundary callout. ▶ **“Which service answers this?” sorter** (12 items, 6 buckets) · ▶ 2 checkpoints.
3. **Organizations** — parts, feature sets table, management account, delegated admin, root access management, moving accounts (update). ▶ **stepper “Move an account”** · ▶ G7, G30 + billing-only checkpoint.
4. **SCPs, RCPs, declarative policies** — what SCPs do, inheritance, deny/allow-list, SCP language + quota update, RCPs, declarative + other policy types (update). ▶ **SCP inheritance tree** (10 nodes, 4 policies, 4 actions, management account exempt, tooltips) · ▶ pair SCP · RCP · ▶ G6 + inheritance + RCP checkpoints.
5. **Policy evaluation** — policy types table, 7-step evaluation, fine print, boundaries, session policies. ▶ **policy evaluation simulator** (4 principals, same/cross account, SCP/RCP/identity/resource/boundary/session chips, 7 predict-first presets, gate diagram with tooltips) · ▶ pair SCP · boundary · identity · ▶ G11, G9 + explicit-Deny checkpoint.
6. **Roles, STS, cross-account** — trust vs permissions, durations, external ID, role vs resource policy, org condition keys, Access Analyzer (update), Roles Anywhere. ▶ **stepper “third-party vendor”** · ▶ pair role · resource policy · ▶ **condition-key sorter** · ▶ G12, G13, G3, G15.
7. **IAM Identity Center and ABAC** — rename + multi-Region (updates), how it works, org vs account instance. ▶ **identity chooser** · ▶ pair Identity Center · IAM · Cognito · ▶ G16, G17, G18.
8. **Control Tower** — landing zone, 4.0 (update), controls table, guardrails→controls (update). ▶ **control timeline** (5 controls × console/CloudFormation, exposure chart, tooltips) · ▶ **preventive/detective/proactive sorter** · ▶ Account Factory · ▶ pair CT · Orgs · miss callout · ▶ G21, G4.
9. **Sharing** — RAM, shareable table, VPC sharing split table. ▶ **stepper “Set up VPC sharing”** · ▶ **sharing chooser** · ▶ pair VPC sharing · peering · TGW · miss callout · ▶ G19, G2, G20, G26 (Service Catalog).
10. **AWS Config** — recording (update), rules table, remediation. ▶ **stepper “Detect and fix public buckets”** · ▶ pair Config · CloudTrail · SCP · ▶ G24, G23, G22, G25.
11. **Consolidated billing and tags** — benefits, group sharing / billing transfer (update), cost allocation tags, tag governance. ▶ **RI/SP sharing calculator** (user-set commitment, discount, sharing mode; hbars with tooltips; per-account table) · ▶ pair tag policy · SCP · ▶ G27, G28, G29 + activation checkpoint.
12. **Triggers, traps, cheat, record** — ▶ organization map, trigger table, cheat block, log.

## Map
`core.js` `map.items`, viewBox 1000×880: OUTSIDE AWS band (Corporate IdP, third-party account, on-prem servers); YOUR ORGANIZATION zone with boxes MANAGEMENT ACCOUNT (root, policies, Identity Center, Control Tower + Account Factory, consolidated bill), SECURITY OU (Config logs + aggregator, Access Analyzer, Log Archive, Audit), INFRASTRUCTURE OU · NETWORK (shared VPC, Transit Gateway, VPC Resolver rules), PROD and DEV ACCOUNT · WORKLOADS OU (roles from permission sets, S3 bucket policy with aws:PrincipalOrgID, EC2 in shared subnets, Config rules, SSM Automation fix, usage). SCP trunk runs root → OUs → accounts. Box labels at the top (bottom-right boxes right-aligned) so the billing line clears them; the STS label moved into the outside band after the first screenshot (it was hidden under the SCP trunk). No `el:'line'` used for plain SVG.

## Traps (16)
Control Tower for one guardrail · TGW to share one VPC · Network Firewall to keep data in the org · SCP that grants · SCP on the management account · admin/member root bypassing an SCP · boundary vs SCP · cross-account with one side · access keys for a third party · listing account IDs · IAM users or Cognito for employees · Config to prevent · CloudTrail vs Config · buying RIs per account · tag policy to block untagged · participants managing a shared VPC.

## Compare pairs (8)
SCP · boundary · identity policy · SCP · RCP · Identity Center · IAM users · Cognito · Control Tower · Organizations · VPC sharing · peering · TGW · cross-account role · resource policy · Config · CloudTrail · SCP · tag policy · SCP with tag condition. Each has a quick check.

## Trigger cards (40)
c01–c12 Organizations/SCP/RCP (**c01 mine**) · c13–c23 IAM mechanics (**c18 mine**) · c24–c27 Identity Center · c28–c31 Control Tower (**c28 mine**) · c32–c35 RAM (**c32, c33 mine**) · c36–c38 Config · c39–c40 billing. Mine cards: `src: 'Exam pattern'`.

## Drills (30)
Stub values as above; every option has a why; `words` verbatim in `q` (script-checked); two select-TWO (G13, G24); correct letters **A 7 · B 7 · C 7 · D 7 · AC 1 · BD 1**.

| ID | Line | Scenario → answer | Prestige role |
|---|---|---|---|
| **G1** (mine, C) | org | existing org, deny Regions incl. admins → SCP at root | **Control Tower tempting, wrong** |
| **G2** (mine, C) | ram | 15 accounts deploy into network team’s subnets → VPC sharing | **Transit Gateway tempting, wrong** |
| **G3** (mine, C) | iam | bucket only for org principals, future accounts → aws:PrincipalOrgID | **Network Firewall tempting, wrong** |
| **G4** (mine, C) | ct | 1 → 30 accounts, log archive, audit, SSO, guardrails → Control Tower | **Control Tower right** |
| **G5** (mine, C) | ram | 60 separate VPCs + DX, transitive → TGW shared via RAM | **Transit Gateway right**; CT distractor |
| G6 | org | admin AccessDenied in one Region → SCP | CT distractor |
| G7 | org | SCP didn’t stop management-account user → move workloads out | — |
| G8 | org | FullAWSAccess but no IAM policy → attach identity policy | — |
| G9 | iam | developers create roles safely → permission boundary | — |
| G10 | org | sandbox instance types, admins can’t remove → SCP on OU | CT distractor |
| G11 | iam | cross-account, bucket policy only → add identity policy | — |
| G12 | iam | SaaS vendor, confused deputy → role + external ID | — |
| G13 | iam | (TWO) Lambda writes cross-account → identity + bucket policy | — |
| G14 | iam | only Finance OU → aws:PrincipalOrgPaths | — |
| G15 | iam | resources shared outside org → Access Analyzer | CT distractor |
| G16 | idc | Okta, 40 accounts, leavers → Identity Center + SAML + SCIM | — |
| G17 | idc | on-prem AD, no passwords in AWS → Identity Center + AD Connector | — |
| G18 | idc | per-project access, new projects weekly → ABAC | — |
| G19 | ram | participant can’t change route table → owner does it | TGW distractor |
| G20 | ram | Resolver rules for 25 accounts → RAM share | TGW distractor |
| G21 | ct | stop unversioned buckets in stacks before provisioning → proactive control | — |
| G22 | config | SSH-open SGs, all accounts, no blocking → Config rule + aggregator | NFW distractor |
| G23 | config | SG configuration last Tuesday → Config timeline | — |
| G24 | config | (TWO) auto re-enable BPA → managed rule + SSM remediation | — |
| G25 | config | 25 rules to 80 accounts, immutable → org conformance pack | — |
| G26 | nbr | approved stacks without underlying permissions → Service Catalog | — |
| G27 | billing | unused RIs in A → sharing (default) | — |
| G28 | billing | 5 separate bills → create org, invite | CT distractor |
| G29 | billing | no instance without CostCenter tag → SCP with aws:RequestTag | — |
| G30 | org | move account between orgs → direct transfer | CT distractor |

## Checks (CONTEXT §9 step 4)
`tools/check/widgets-06-governance.js` interacts with every Session 6 widget (stub trainer, three sorters, three steppers, SCP tree incl. removing FullAWSAccess, allow list, DynamoDB denial and management-account tooltip, policy simulator incl. two predict-first presets, cross-account, boundary and gate tooltip, two choosers, control timeline incl. proactive console vs CloudFormation, remediation, SCP and tooltip, billing calculator incl. sharing off and tooltip, eight pair quick checks, organization map, trigger table, progress charts). Screenshots: `node shots-06.js` → `design/compare/s6-*.png`.

Engine/CSS: **no change**.

## Done when
12 chapters with all ▶ elements, 8 pairs, 40 cards, 30 drills, 16 traps, cheat sheet, progress, manifest entry; the lead merges “Facts verified” and “Changed since the exam guide” into CONTEXT §6.
