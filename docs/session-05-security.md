# Session 5 — Security Services & Identity: build brief

Built as `sessions/05-security/` on the same engine and design as Sessions 1–4. Follows CONTEXT.md §9. Cluster 5 in §5: KMS / CloudHSM / Secrets Manager / Parameter Store / ACM / Private CA / WAF / Shield / Firewall Manager / Network Firewall / GuardDuty / Inspector / Macie / Security Hub / Detective / Security Lake / Cognito (D1 ●●●, mixed). His record here is not a question number but the **prestige-distractor pattern** (CONTEXT §3): in the baseline he kept options containing **ACM** and **Network Firewall** where neither had a role. Drills S1–S5 and cards c01, c22, c26, c32, c33 carry `mine: true`, `src: 'Exam pattern'`, tag **C**. IAM policy mechanics, Organizations/SCP, Identity Center, Control Tower and Config are **Session 6/11** and appear only as boundaries.

## Colour rule

The same service keeps the same colour on every page. The eleven existing hues (DataSync, Gateway, Transfer, truck, DMS, MGN, DX, TGW, PrivateLink, CloudFront, Global Accelerator) are **not** reused. **Session 5 adds no hue.**

Why: I searched the sRGB cube (step 6/255) for a candidate with ≥ 4.5:1 contrast on `#FFFFFF` and light `--zone-aws`, chroma ≥ 40 and L\* ≥ 30 (visibly coloured), maximising the worst CIEDE2000 distance after Machado-2009 simulation (severity 1.0; normal, deuteranopia, protanopia, tritanopia) against all 11 hues + ink. The best candidate is `#0000FC` with a worst pair of **8.2** (protanopia vs Transfer; 8.9 normal vs GA) — a third blue-violet next to DataSync blue and GA indigo, visually a sibling of both. Without the L\* floor the "best" candidates are near-black browns/purples (L\* ≈ 12) that read as ink. The palette is saturated; every Session 5 family is therefore an **ink line** (4 px), told apart by dash and station shape and always labelled. Chart bars stay ink with swatch + label. Script: pure-Python CIEDE2000 + Machado matrices (scratch, not committed).

| Line (`id`) | Dash | Stations |
|---|---|---|
| KMS · CloudHSM (`kms`) | solid | circles |
| Secrets Manager · Parameter Store (`secrets`) | `2 7` short dashes | squares |
| ACM · Private CA (`acm`) | `1 9` dots | triangles |
| WAF · Shield · Firewall Manager (`edge`) | `10 6` dashes | diamonds |
| Network Firewall (`nfw`) | `16 5 3 5` dash-dot | hexagons |
| GuardDuty · Detective (`detect`) | `24 8` long dashes | rings (circle + dot) |
| Inspector · Macie (`scan`) | `6 4` tight dashes | pentagons |
| Security Hub · Security Lake (`hub`) | `14 4 3 4 3 4` dash-dot-dot | rounded bars |
| Cognito (`cognito`) | `18 4` long dashes | inverted triangles |

Topic (neutral chip, no hue): `rest` = Encryption at rest: S3 · EBS · RDS.

Known limit (engine, not changed): the phone "Pick a line" cards draw every dashed line with the engine's fixed `12 8` pattern, so dash identity shows on the map and in swatches but not on those cards (same as Session 4). A one-line engine change (`L.dash` instead of `'12 8'`) would fix it but would alter Sessions 1–4's phone cards; left for the lead.

Domains: D1 throughout (encryption, secrets, certificates, WAF/Shield, detection, posture, Cognito); D2 touches (KMS multi-Region keys, secret replication, Shield Advanced, rate limiting); D4 touches (Bucket Keys, Parameter Store vs Secrets Manager, Shield Advanced cost).

## Facts verified 2026-09-25 (AWS docs via the AWS MCP server)

**KMS**
- Key types: AWS owned (invisible, free), AWS managed (viewable, policy not editable, same-account only, yearly rotation, **legacy — not created for new services since 2021**), customer managed ($1/month, own policy, cross-account) — https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html
- Key specs: SYMMETRIC_DEFAULT = AES-256-GCM; RSA, ECC, **ML-DSA**, HMAC; services use symmetric only — https://docs.aws.amazon.com/kms/latest/developerguide/symm-asymm-choose-key-spec.html · https://docs.aws.amazon.com/kms/latest/developerguide/mldsa.html
- **Encrypt ≤ 4,096 bytes**; GenerateDataKey returns plaintext + encrypted data key — https://docs.aws.amazon.com/cli/latest/reference/kms/encrypt.html · https://aws.amazon.com/kms/faqs/
- Exactly one key policy per key; IAM only effective if the key policy allows it; grants (eventually consistent ~5 min) — https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html · https://docs.aws.amazon.com/kms/latest/APIReference/API_CreateGrant.html · cross-account via key policy — https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
- Rotation: symmetric KMS-generated material only; **period 90–2,560 days (default 365)**, **on-demand rotation (Apr 2024)**; on-demand for **imported material (Jun 2025)**; imported/asymmetric/HMAC/custom-key-store keys no automatic rotation; AWS managed keys yearly (was 3 years until May 2022); first two rotations +$1/month each — https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html · https://aws.amazon.com/about-aws/whats-new/2024/04/aws-kms-automatic-key-rotation/ · https://aws.amazon.com/about-aws/whats-new/2025/06/aws-kms-on-demand-key-rotation-imported-keys/ · https://aws.amazon.com/kms/pricing/
- Multi-Region key rotation set on the primary, copied to replicas — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kms.CfnKey.html
- Deletion waiting period **7–30 days, default 30**, cancellable; Pending Deletion = all crypto calls fail — https://docs.aws.amazon.com/kms/latest/cryptographic-details/key-deletion.html
- Multi-Region keys: same key ID and material, independent regional resources, no conversion, not in custom key stores, $1/month each — https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html
- HSMs **FIPS 140-3 Security Level 3** — https://docs.aws.amazon.com/kms/latest/developerguide/overview.html
- Request quota shared per account per Region: **10,000/s default, 20,000/s in 7 Regions, 100,000/s in us-east-1, us-west-2, eu-west-1**; ThrottlingException — https://docs.aws.amazon.com/kms/latest/developerguide/requests-per-second.html
- Custom key stores: CloudHSM and external (XKS, "not recommended" unless required), symmetric only — https://docs.aws.amazon.com/kms/latest/developerguide/key-store-overview.html

**CloudHSM** — single-tenant, AWS no access; hsm2m.medium **FIPS 140-3 Level 3**, hsm1.medium (FIPS 140-2) not for new clusters; ≥ 2 HSMs in different AZs — https://docs.aws.amazon.com/cloudhsm/latest/userguide/fips-validation.html · https://docs.aws.amazon.com/cloudhsm/latest/userguide/cluster-high-availability-load-balancing.html · https://aws.amazon.com/cloudhsm/faqs/

**EBS / RDS / snapshots**
- RDS encryption only at creation; snapshot → encrypted copy → restore; replicas match source; Aurora: restore with encryption — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html · https://repost.aws/knowledge-center/encrypt-rds-snapshots
- EBS encryption by default per Region; existing volumes via snapshot copy — https://docs.aws.amazon.com/ebs/latest/userguide/encryption-by-default.html
- Snapshots encrypted with AWS managed keys cannot be shared; use a customer managed key; encrypted snapshots never public — https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modifying-snapshot-permissions.html · https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/share-encrypted-snapshot.html
- Cross-Region: RDS must specify a destination-Region key; EBS uses the default key if none given — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html · https://docs.aws.amazon.com/aws-sdk-php/v3/api/api-ec2-2016-04-01.html

**S3**
- SSE-S3 default for new objects since **5 Jan 2023** — https://docs.aws.amazon.com/AmazonS3/latest/userguide/serv-side-encryption.html
- DSSE-KMS (Jun 2023, no Bucket Keys) — https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingDSSEncryption.html · SSE-C HTTPS only, salted HMAC stored, key discarded — https://docs.aws.amazon.com/AmazonS3/latest/userguide/specifying-s3-c-encryption.html
- **SSE-C blocked by default on new general purpose buckets since April 2026** (and existing buckets in accounts without SSE-C objects); `BlockedEncryptionTypes` via PutBucketEncryption; 403 AccessDenied — https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-s3-c-encryption-setting-faq.html · https://docs.aws.amazon.com/AmazonS3/latest/userguide/blocking-unblocking-s3-c-encryption-gpb.html (spot-checked myself)
- Bucket Keys cut KMS request cost **up to 99%** — https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html
- `aws:SecureTransport` deny; SSE-KMS enforcement condition — https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html · https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html

**Secrets Manager / Parameter Store**
- Managed rotation (no Lambda) for RDS, Aurora, DocumentDB, Redshift; Lambda otherwise; shortest schedule **every 4 hours** — https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_managed.html · https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_schedule.html
- Replication to other Regions, promote replica, replica billed — https://docs.aws.amazon.com/secretsmanager/latest/userguide/replicate-secrets.html
- **$0.40/secret/month, $0.05 per 10,000 calls** (from pricing-page examples) — https://aws.amazon.com/secrets-manager/pricing/
- RDS-managed master password (`ManageMasterUserPassword`) — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- Parameter Store standard 10,000 / 4 KB / free; advanced 100,000 / 8 KB / policies / sharing / **$0.05 per parameter per month**, no downgrade — https://docs.aws.amazon.com/general/latest/gr/ssm.html · https://aws.amazon.com/systems-manager/pricing/ · https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-shared-parameters.html
- Default **40 TPS**; higher throughput: GetParameter 10,000 TPS (charged) — https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-throughput.html · no built-in rotation — https://docs.aws.amazon.com/secretsmanager/latest/userguide/integrating_parameterstore.html · `/aws/reference/secretsmanager/` — https://docs.aws.amazon.com/systems-manager/latest/userguide/integration-ps-secretsmanager.html

**ACM / Private CA**
- Public certificates free for integrated services — https://aws.amazon.com/certificate-manager/pricing/ · integrated services list (ELB, CloudFront, API Gateway, App Runner, Amplify, Beanstalk, Nitro Enclaves, Network Firewall …) — https://docs.aws.amazon.com/acm/latest/userguide/acm-services.html
- **Validity 198 days, renewal 45 days before expiry** (legacy 395-day certs renew at 60) — https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html · https://docs.aws.amazon.com/acm/latest/userguide/dns-renewal-validation.html · https://docs.aws.amazon.com/acm/latest/userguide/email-validation.html (spot-checked) · change effective 18 Feb 2026 — https://aws.amazon.com/about-aws/whats-new/2026/02/aws-certificate-manager-updates-default/ · schedule to 2029 — https://aws.amazon.com/certificate-manager/faqs/
- Imported certificates not renewed; expiry events daily from 45 days (configurable DaysBeforeExpiry); Config rule `acm-certificate-expiration-check` — https://docs.aws.amazon.com/acm/latest/userguide/supported-events.html · https://docs.aws.amazon.com/acm/latest/APIReference/API_PutAccountConfiguration.html · https://docs.aws.amazon.com/config/latest/developerguide/acm-certificate-expiration-check.html
- **Exportable public certificates (17 Jun 2025)**; now **$7 per FQDN, $79 per wildcard** — https://aws.amazon.com/about-aws/whats-new/2025/06/aws-certificate-manager-public-certificates-use-anywhere/ · https://docs.aws.amazon.com/acm/latest/userguide/acm-exportable-certificates.html · ACME (Jul 2026) — https://aws.amazon.com/about-aws/whats-new/2026/07/aws-certificate-manager-acme/
- Regional; CloudFront us-east-1 — https://repost.aws/knowledge-center/migrate-ssl-cert-us-east
- Private CA **$400/CA/month general-purpose, $50 short-lived (≤ 7 days)** — https://aws.amazon.com/private-ca/pricing/ · https://docs.aws.amazon.com/privateca/latest/userguide/short-lived-certificates.html

**WAF**
- Resources: CloudFront, ALB, API Gateway REST, AppSync, Cognito user pool, App Runner, Verified Access, Amplify (+ Bedrock AgentCore Gateway); one web ACL per resource; CloudFront/Amplify in us-east-1 — https://docs.aws.amazon.com/waf/latest/developerguide/how-aws-waf-works-resources.html · REST (not HTTP) API for WAF — https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html
- Rate-based: **windows 60/120/300/600 s (default 300), minimum limit 10**, any action except Allow, aggregation keys — https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html (spot-checked) · checks ~every 10 s, range 10–2,000,000,000 — https://repost.aws/knowledge-center/waf-rate-based-rule-not-blocking · https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-aggregation-options.html
- Statements and WCU (IP set 1, SQLi 20, XSS 40 …) — https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statements-match.html · 1,500 WCU included, up to 5,000 — https://docs.aws.amazon.com/waf/latest/developerguide/aws-waf-capacity-units.html
- Actions Allow/Block/Count/CAPTCHA/Challenge; Bot Control; ATP/ACFP; $5/web ACL, $1/rule, $0.60/M requests — https://aws.amazon.com/waf/pricing/
- SQL database + core rule set managed groups for SQLi/XSS — https://repost.aws/knowledge-center/waf-rule-prevent-sqli-xss (spot-checked)

**Shield / Firewall Manager / Network Firewall**
- Shield Standard free, automatic L3/L4; Advanced **$3,000/month per payer (org), 1-year**, WAF included for protected resources — https://aws.amazon.com/shield/pricing/ · SRT needs Business/Enterprise Support — https://docs.aws.amazon.com/waf/latest/developerguide/authorize-srt.html · protected types (EC2/NLB via EIP) — https://docs.aws.amazon.com/waf/latest/DDOSAPIReference/API_CreateProtection.html · cost protection — https://aws.amazon.com/shield/faqs/ · auto L7 mitigation CloudFront + ALB — https://docs.aws.amazon.com/waf/latest/developerguide/shield-policies-auto-app-layer-mitigation.html · health-based detection — https://docs.aws.amazon.com/waf/latest/developerguide/ddos-get-started-health-checks.html
- **Shield network security director: public preview** (Jun 2025; multi-account Dec 2025; Security Hub findings Mar 2026) — https://docs.aws.amazon.com/waf/latest/developerguide/nsd-enablement.html
- Firewall Manager prerequisites (Organizations all features, admin account, Config) and policy types incl. **NACL** and third-party — https://docs.aws.amazon.com/waf/latest/developerguide/fms-prereq.html · https://docs.aws.amazon.com/waf/latest/developerguide/working-with-policies.html · billed per policy per Region — https://aws.amazon.com/firewall-manager/pricing/
- Network Firewall: Suricata stateful rules — https://docs.aws.amazon.com/network-firewall/latest/developerguide/stateful-rule-group-options.html · domain lists on Host/SNI — https://docs.aws.amazon.com/network-firewall/latest/developerguide/stateful-rule-groups-domain-names.html · firewall subnets per AZ — https://aws.amazon.com/blogs/networking-and-content-delivery/deployment-models-for-aws-network-firewall/ · **native TGW attachment (Jun/Jul 2025)** — https://aws.amazon.com/about-aws/whats-new/2025/07/aws-network-firewall-native-transit-gateway-support/ · WAF vs NFW — https://aws.amazon.com/compare/network-firewall-and-waf/

**Detection / posture**
- GuardDuty foundational sources, independent copy of flow logs — https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_data-sources.html · plans — https://docs.aws.amazon.com/guardduty/latest/ug/protection-plans-overview.html · **Extended Threat Detection (Dec 2024), on by default, no extra cost** — https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-extended-threat-detection.html · EC2/ECS Dec 2025 — https://aws.amazon.com/about-aws/whats-new/2025/12/guardduty-extended-threat-detection-ec2-ecs/ · Malware Protection for Backup — https://aws.amazon.com/about-aws/whats-new/2025/11/amazon-guardduty-malware-protection-backup/ · 30-day trial — https://aws.amazon.com/guardduty/pricing/ · EventBridge — https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html · delegated admin — https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_organizations.html · entity lists — https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_upload-lists.html
- Inspector: EC2 agent/hybrid agentless, ECR, Lambda, CIS, reachability — https://docs.aws.amazon.com/inspector/latest/user/scanning-ec2.html · https://docs.aws.amazon.com/inspector/latest/user/scanning-cis.html · **code security GA Jun 2025** — https://aws.amazon.com/about-aws/whats-new/2025/06/amazon-inspector-code-security-shift-security-development/ · **15-day trial** — https://aws.amazon.com/inspector/pricing/ · **Inspector Classic end of support 20 May 2026** — https://docs.aws.amazon.com/managedservices/latest/userguide/inspector.html
- Macie: S3 only, automated discovery + jobs, identifiers, 30-day trial — https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html · https://docs.aws.amazon.com/macie/latest/user/account-mgmt-free-trial.html
- **Security Hub CSPM** (renamed) and new **AWS Security Hub** (preview 17 Jun 2025, **GA 2 Dec 2025**, OCSF, exposure findings, attack path graph) — https://docs.aws.amazon.com/securityhub/latest/userguide/what-is-securityhub-v2.html · https://docs.aws.amazon.com/securityhub/latest/userguide/what-is-securityhub.html (both read myself) · https://aws.amazon.com/blogs/aws/aws-security-hub-now-generally-available-with-near-real-time-analytics-and-risk-prioritization/ · standards — https://docs.aws.amazon.com/securityhub/latest/userguide/standards-reference.html · aggregation Region — https://docs.aws.amazon.com/securityhub/latest/userguide/finding-aggregation.html · central configuration — https://docs.aws.amazon.com/securityhub/latest/userguide/start-central-configuration.html
- Detective: sources, 1 year, 30-day trial; **no "GuardDuty 48 h" prerequisite any more** (recommended same admin account) — https://docs.aws.amazon.com/detective/latest/userguide/detective-prerequisites.html · https://docs.aws.amazon.com/detective/latest/userguide/detective-source-data-about.html · https://aws.amazon.com/detective/faqs/
- Security Lake sources/subscribers, OCSF in your S3 — https://docs.aws.amazon.com/security-lake/latest/userguide/internal-sources.html · https://docs.aws.amazon.com/security-lake/latest/userguide/subscriber-query-access.html
- **Audit Manager no longer open to new customers** — https://docs.aws.amazon.com/audit-manager/latest/userguide/what-is.html · https://aws.amazon.com/about-aws/whats-new/2026/03/aws-service-availability/ (spot-checked)
- Artifact reports and agreements — https://docs.aws.amazon.com/prescriptive-guidance/latest/security-reference-architecture/org-management.html

**Cognito**
- User pools: JWTs, managed login (Nov 2024), federation, MFA incl. email, triggers, passwordless — https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html · https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-cognito-managed-login/ · https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-cognito-passwordless-authentication-low-friction-secure-logins/
- Identity pools: guest role, RBAC, AssumeRoleWithWebIdentity — https://docs.aws.amazon.com/cognito/latest/developerguide/role-based-access-control.html · https://docs.aws.amazon.com/help-panel/cognito/latest/console/hp-cip-guest-role.html
- ALB authenticate-cognito on HTTPS listeners, cookie 7 days — https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-authenticate-users.html · API Gateway authorizers — https://repost.aws/knowledge-center/api-gateway-cognito-user-pool-authorizer
- **Feature plans Lite / Essentials (default) / Plus (threat protection)** — https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-sign-in-feature-plans.html · **free tier 10,000 MAU (Lite, Essentials), none for Plus** — https://aws.amazon.com/cognito/pricing/

### Changed since the exam guide (shown as callouts)

| Old (banks / older courses) | Now | Source |
|---|---|---|
| KMS rotation fixed yearly; other periods = new key + alias | **90–2,560 days** + **on-demand** (Apr 2024); on-demand for imported material (Jun 2025) | rotate-keys.html, whats-new 2024/04, 2025/06 |
| AWS managed keys rotate every 3 years; standard default | **Every year** (since 2022); **legacy key type**, AWS owned keys are the default for new services | concepts.html |
| KMS FIPS 140-2; CloudHSM "the FIPS L3 one" | **Both FIPS 140-3 Level 3**; decide on single-tenant / exclusive control | kms overview.html, cloudhsm fips-validation.html |
| KMS quotas 5,500 / 10,000 / 30,000–50,000 per s | **10,000 / 20,000 / 100,000** | requests-per-second.html |
| SSE-C available on every bucket | **Blocked by default on new buckets since Apr 2026** (BlockedEncryptionTypes) | default-s3-c-encryption-setting-faq.html |
| S3: three SSE options | + **DSSE-KMS** (Jun 2023) | UsingDSSEncryption.html |
| Secrets Manager rotation = Lambda | **Managed rotation** for RDS/Aurora/DocumentDB/Redshift; RDS-managed master password | rotate-secrets_managed.html |
| ACM public certs 13 months, renew 60 days before | **198 days, renew 45 days before** (Feb 2026; shrinking 2027, 2029) | gs-acm-request-public.html |
| ACM public certs can't be installed on EC2 | **Exportable public certificates** (Jun 2025, $7 / $79); ACME (Jul 2026) | acm pricing, whats-new 2025/06 |
| WAF rate-based: ≥ 100 per fixed 5 min, per IP | **≥ 10**, windows **1/2/5/10 min**, custom keys | rate-based high-level settings |
| WAF: CloudFront, ALB, API GW, AppSync; 1,500 WCU hard | + Cognito, App Runner, Verified Access, Amplify; 1,500 included, up to 5,000; "protection pack" | how-aws-waf-works-resources.html, aws-waf-capacity-units.html |
| Network Firewall needs an inspection VPC with firewall subnets | **Native TGW attachment** (Jun/Jul 2025) | whats-new 2025/07 |
| Firewall Manager: WAF, Shield, SG, NFW, DNS FW | + **NACL** and third-party firewall policies | working-with-policies.html |
| GuardDuty: CloudTrail/flow/DNS + S3/EKS | + Runtime Monitoring, Malware Protection for S3 and Backup, RDS, Lambda, AI; **Extended Threat Detection** | guardduty FAQs, extended-threat-detection |
| Inspector Classic / agent required | **Classic ended 20 May 2026**; agentless hybrid EC2; code security; 15-day trial | managedservices inspector.html, scanning-ec2.html |
| Security Hub | Renamed **Security Hub CSPM**; new **AWS Security Hub** GA 2 Dec 2025 (OCSF, exposure findings) | what-is-securityhub-v2.html |
| Detective needs GuardDuty for 48 h | not a prerequisite any more | detective-prerequisites.html |
| Audit Manager | **closed to new customers** (2026) | audit-manager what-is.html |
| Cognito hosted UI, advanced security features, 50,000 MAU free | **Managed login**, **threat protection (Plus)**, plans Lite/Essentials/Plus, **10,000 MAU** free | cognito-sign-in-feature-plans.html, cognito pricing |
| — | New and not on the exam: Shield network security director (preview) | nsd-enablement.html |

### Not verified → not printed
Firewall Manager's per-policy price (only a $100 *example* found; the site says "billed per policy per Region"); on-demand rotation count limit (docs say 25, FAQ says 10 — omitted); KMS per-request price; the RDS-managed password default rotation interval; exact GuardDuty member limit is verified (50,000) but not printed; Macie automated discovery "on by default" (only a blog) — the site does not claim it; "Network Firewall doesn't protect CloudFront" is phrased as an inference from the two resource lists, not quoted.

## Stub for this session (replaces Session 4's slots)

| Slot | Values | Why this slot |
|---|---|---|
| ASSET | data at rest · secrets & config · TLS certificates · web requests · network traffic · API & account activity · workloads & images · app users | The prestige killer: ACM fails on anything but TLS certificates; Macie on anything but data at rest in S3; Inspector on API activity. |
| LAYER | entry point · VPC · workload · data store · account / org · app sign-in | Where the protection acts. Network Firewall is VPC; an attack arriving at CloudFront/ALB/API Gateway is the entry point (WAF, Shield, ACM). Firewall Manager / Security Hub = account/org. |
| MODE | prevent · detect · investigate · report / audit | The detector trap: GuardDuty/Inspector/Macie never block; Security Hub reports, Detective investigates. |
| SUPERLATIVE | least ops · cheapest · most control · compliance · fastest · none stated | CloudHSM only under "most control"; Parameter Store under "cheapest"; Shield Advanced fails "cost-effective". |

## Learn: 12 chapters (full text in `learn.js`; ▶ = interactive)

1. **How to read a security question** — pattern record table (ACM, Network Firewall), asset × prevent/detect table, stub, built-for hooks. ▶ stub trainer on S1 · ▶ 2 checkpoints (ACM, NFW prestige tests).
2. **The security map** — five jobs, block vs detect words, boundary callout (IAM/SCP/Identity Center/Config → Sessions 6/11). ▶ **"Which service answers this?" sorter** (12 items, 6 buckets) · ▶ 2 checkpoints.
3. **KMS: keys, key policies, envelope encryption** — key types table, legacy AWS managed keys callout, key policy vs IAM vs grants. ▶ **envelope-encryption walk-through** (sizes 1 KB–5 GB, direct Encrypt vs GenerateDataKey, 4,096-byte refusal, SVG diagram with tooltips, phone layout) · ▶ S6 · ▶ 2 checkpoints.
4. **Operating keys** — rotation (update callout), deletion, multi-Region keys, quotas (update), CloudHSM, custom key stores, XKS. ▶ **KMS key-type simulator** (6 types × 8 capabilities, 5 requirement puzzles) · ▶ pair KMS · CloudHSM · ▶ S12, S13, S9, S7.
5. **Encryption at rest** — S3 five options, SSE-C callout, Bucket Keys, bucket policies, EBS, RDS, snapshots. ▶ **S3 encryption chooser** (generic) · ▶ pair SSE · ▶ **stepper "Encrypt an existing RDS database"** · ▶ **stepper "Share an encrypted snapshot"** · ▶ S14, S15, S11, S8, S10.
6. **Secrets, parameters and certificates** — Secrets Manager, Parameter Store tiers table, ACM (update callout), Private CA, prestige miss callout. ▶ pair · ▶ **chooser Secrets Manager / Parameter Store / KMS / ACM** (generic) · ▶ S17, S18, S19, S4, S20, S21.
7. **AWS WAF** — resources, statements table, actions and priority, rate-based (update), WCU and pricing, Bot/Fraud Control. ▶ **WAF web ACL simulator** (1,630 requests over 10 min; rate limit 10/100/500/2000; window 1/2/5/10 min; Block/CAPTCHA/Count; allow-rule priority; default action; ~10 s detection; hbars chart by terminating rule + per-minute bot chart; tooltips) · ▶ S2, S3, S23 + Count checkpoint.
8. **Shield, Firewall Manager, Network Firewall** — Shield table, NSD preview callout, FMS, NFW (TGW update), "when NFW is a distractor" table, miss callout. ▶ pairs WAF · Shield Adv and WAF · NFW · SG/NACL · ▶ S22, S24, S5.
9. **Detection** — GuardDuty (update), Inspector (update), Macie. ▶ **security finding router** (8 signals × 6 tools, detect-vs-protect matrix highlights the chosen tool) · ▶ pair · ▶ S25, S27, S28.
10. **Posture and investigation** — Security Hub CSPM + new Security Hub (update), Detective, Security Lake / Artifact / Audit Manager (update). ▶ pair · ▶ S26, S29 + Artifact checkpoint.
11. **Cognito** — user pools, identity pools, feature plans table (update). ▶ **Cognito flow** (4 goals: API, S3 upload, guests, ALB; actor diagram with arc arrows; which-pool verdict) · ▶ pair · ▶ S30 + ALB checkpoint.
12. **Triggers, traps, cheat, record** — ▶ security map, trigger table, cheat block, log.

## Map
`core.js` `map.items`, viewBox 1000×880: internet band (Users, Attackers · bots, App users); AWS edge band (Shield, WAF CloudFront scope, ACM cert us-east-1, Firewall Manager); one Region with boxes VPC (Network Firewall in firewall subnet, ALB with ACM cert and regional WAF, EC2/ECS app, SG · NACL note, Private CA, Inspector), DATA (Secrets Manager, Parameter Store, KMS key, CloudHSM, EBS · RDS, S3, Macie), ACCOUNT & API ACTIVITY (CloudTrail · Flow Logs · DNS → GuardDuty → Detective), POSTURE (Security Hub, Security Lake), APP SIGN-IN (user pool, identity pool). Box labels at the bottom, surface halos, zone labels kept clear of the Cognito line (moved to x = 940 after the first screenshot), no `el:'line'` used for plain SVG.

## Traps (16)
ACM for data at rest · Network Firewall for SQLi · Shield Advanced for a few noisy IPs · GuardDuty to block · Security Hub to investigate · Macie outside S3 / Inspector for PII · KMS Encrypt on a large file · sharing an aws/ebs snapshot · enabling encryption on existing RDS · Parameter Store for rotation · Secrets Manager for plain config · ACM renewing imported certs · WAF on an NLB · CloudHSM under least ops · identity pool to sign in · Security Hub CSPM without Config.

## Compare pairs (8)
KMS · CloudHSM · Secrets Manager · Parameter Store · SSE-S3 · SSE-KMS · SSE-C · WAF · Shield Advanced · WAF · Network Firewall · SG/NACL · GuardDuty · Inspector · Macie · Security Hub · Detective · GuardDuty · Cognito user pool · identity pool. Each has a quick check.

## Trigger cards (40)
c01–c10 KMS/CloudHSM (**c01 mine**) · c11–c16 at rest (`rest`) · c17–c21 secrets · c22–c25 ACM (**c22 mine**) · c26–c31 WAF/Shield/FMS (**c26 mine**) · c32–c33 Network Firewall (**both mine**) · c34–c35 GuardDuty/Detective · c36–c37 Inspector/Macie · c38 Security Hub · c39–c40 Cognito. Mine cards: `src: 'Exam pattern'`.

## Drills (30)
Stub values as above; every option has a why; `words` verbatim in `q` (script-checked); two select-TWO (S11, S29); correct letters **A 7 · B 7 · C 7 · D 7 · AD 1 · BC 1**.

| ID | Line | Scenario → answer | Prestige role |
|---|---|---|---|
| **S1** (mine, C) | kms | S3 contracts, key team controls + audit → customer managed key, SSE-KMS + Bucket Keys | **ACM tempting, wrong** |
| **S2** (mine, C) | edge | SQLi + XSS on ALB → WAF managed rules | **Network Firewall tempting, wrong**; Shield Adv distractor |
| **S3** (mine, C) | edge | password guessing from few IPs, cheapest → WAF rate-based rule | **Shield Advanced tempting, wrong**; NFW distractor |
| **S4** (mine, C) | acm | HTTPS on ALB, no manual renewals → ACM public cert, DNS validation | **ACM right** |
| **S5** (mine, C) | nfw | 15 VPCs, egress only to approved domains + IPS → Network Firewall (TGW) | **Network Firewall right**; WAF, GuardDuty distractors |
| S6 | kms | 5 GB file → envelope (GenerateDataKey) | ACM distractor |
| S7 | kms | dedicated HSMs, exclusive control → CloudHSM | Private CA distractor |
| S8 | rest | share aws/ebs snapshot → copy with CMK, share key + snapshot | — |
| S9 | kms | decrypt in eu-west-1 locally → multi-Region keys | — |
| S10 | rest | SSE-KMS throttling → S3 Bucket Keys | ACM distractor |
| S11 | rest | (TWO) encrypt existing RDS → snapshot copy encrypted + restore | — |
| S12 | kms | rotate every 90 days → automatic rotation 90 d | — |
| S13 | kms | key scheduled for deletion → cancel deletion | — |
| S14 | rest | AWS must never store key, new bucket → allow SSE-C, send key | Private CA distractor |
| S15 | rest | uploads over HTTP → deny aws:SecureTransport false | ACM distractor |
| S16 | rest | all new EBS encrypted → encryption by default per Region | Macie distractor |
| S17 | secrets | Aurora password rotate 30 d → Secrets Manager managed rotation | — |
| S18 | secrets | 300 config values, cheapest → Parameter Store standard + SecureString | ACM distractor |
| S19 | secrets | secret in DR Region → secret replication | KMS MRK look-alike |
| S20 | acm | imported cert expiry warning → EventBridge event / Config rule | **ACM right**; Shield Adv distractor |
| S21 | acm | internal TLS names → Private CA | **ACM/Private CA right**; NFW distractor |
| S22 | edge | DDoS experts + cost protection → Shield Advanced | **Shield Adv right**; GuardDuty distractor |
| S23 | edge | block 3 countries on REST API → WAF geo match | NFW distractor |
| S24 | edge | same WAF rules in 40 accounts → Firewall Manager | **FMS right**; Security Hub distractor |
| S25 | detect | crypto-mining, credential misuse, no agents → GuardDuty | **GuardDuty right**; NFW distractor |
| S26 | detect | root cause of a finding → Detective | **Security Hub tempting, wrong** |
| S27 | scan | CVEs in ECR + Lambda → Inspector | GuardDuty, Security Hub distractors |
| S28 | scan | passport numbers in 3,000 buckets → Macie | GuardDuty S3 Protection distractor |
| S29 | hub | (TWO) findings + CIS across accounts/Regions → Security Hub CSPM + Config | **Security Hub right**; Detective, NFW distractors |
| S30 | cognito | Google sign-in + direct S3 upload → user pool + identity pool | ACM distractor |

## Checks (CONTEXT §9 step 4)
`tools/check/widgets-05-security.js` interacts with every Session 5 widget (stub trainer, sorter, envelope walk-through incl. 5 GB refusal and diagram tooltip, key-type simulator incl. right/wrong puzzles, two choosers, two steppers, WAF simulator incl. Count, priority, 10/1 min and both chart tooltips, finding router, Cognito flow incl. all goals and tooltip, eight pair quick checks, security map, trigger table, progress charts). Results 2026-09-25: `node check.js 05-security` → ALL PASS; 01-storage, 02-migration, 03-networking, 04-global → ALL PASS. Screenshots: `node shots-05.js` → `design/compare/s5-*.png`.

Engine/CSS: **no change**.

## Done when
12 chapters with all ▶ elements, 8 pairs, 40 cards, 30 drills, 16 traps, cheat sheet, progress, manifest entry; the lead merges "Facts verified" and "Changed since the exam guide" into CONTEXT §6.
