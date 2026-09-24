# SAA Transit Maps — full context handoff

Written 2026-09-24. It replaces everything in the earlier `CLAUDE_CODE_BRIEF.md` (kept as `docs/CLAUDE_CODE_BRIEF.superseded.md`); where they disagree, this file wins. Design questions are settled by `design/` (mockups + DESIGN.md), which wins over any wording here.

## 1. The learner

- Mitja is preparing for **AWS Certified Solutions Architect – Associate (SAA-C03)**. He holds Cloud Practitioner and manages AWS infrastructure at work (EC2, S3, ALB/ELB, ECS, IAM, VPC basics). He has finished Stéphane Maarek's full SAA course and takes Maarek and Tutorials Dojo practice exams.
- He scores about **50%** and wants a stable **80%+** before booking the exam.
- His problem is not exposure. It is **telling similar services apart** and **mapping the scenario to the service built for that problem**, mostly for less common services: DataSync, Storage Gateway, Transfer Family, Snow, Migration Hub, MGN, DMS, Backup, Global Accelerator, CloudFront edge cases, DX vs VPN, VPC connectivity, and specialised storage, security, monitoring, analytics and integration services.
- He wants **mental maps, not a textbook**. Every topic goes problem → the family of look-alike services → decision tree → "exam says X → think Y" → confusable pairs with the tempting wrong answer → traps → a compact block to copy by hand → scenario questions he must reason through before seeing the answer.
- **He wants all studying to happen in the site, not in chat.** Reading is not enough. Every session needs the **complete lesson** (not a summary) plus interactivity: diagrams, charts, calculators, drills, questions, spaced-repetition cards. Content must be **up to date** (see §6).
- Tone in the UI: plain, direct, no filler, no pleasantries. It suggests; it never orders.

## 2. Exam facts (from the official AWS SAA-C03 exam guide)

- 65 questions: 50 scored + 15 unscored.
- Passing score is 720/1000. Scoring is compensatory (no per-domain minimum).
- Question types: multiple choice and multiple response. No penalty for guessing.
- Domains: **D1 Secure 30% · D2 Resilient 26% · D3 High-Performing 24% · D4 Cost-Optimized 20%**.
- Some third-party blogs claim an "SAA-C04" exists. AWS's own documentation still lists SAA-C03, and there is no official AWS announcement of a C04. Show this as a note on the hub.

## 3. Diagnosis (baseline practice exam, 2026-09-02)

He tagged 29 wrong answers himself: F=17, C=11, R=1. After re-reading every question, the real split was:

```
F/L  fact or limit gap    9   Q7 (peering not transitive) 11 33 (EBS AZ scope) 40 (SWF) 44 (CW agent for swap) 53 (S3 website + R53) 61 (Multi-AZ CNAME) +22 47
C    confused similar     9   Q1 (Firehose vs Lambda) 4 (CloudFront vs S3 TA) 8 (DataSync vs Gateway) 12 54 (truck) 29 (DLM vs Backup) 56 (DataSync vs DMS) +22 47 58
K    missed keyword       6   Q41 "tape" · Q43 "path/host-based routing"→ALB · Q49 "config changes"→Config · Q50 "least ops"→Glue · Q57 "big data + SQL/BI"→EMR+Redshift · Q18
A/R  reasoning / misread  6   Q15 (raised Lambda concurrency; needed RDS Proxy) · Q16 · Q35 · Q46 (bastion in private subnet) · Q55 (EBS answer to S3 question) · Q59
```

- **The biggest single pattern** is "prestige distractors": in 6 misses he chose an option containing a service with no role in the scenario (Global Accelerator twice, Transit Gateway, Transfer Family, Network Firewall, ACM). Fixing only that habit and keyword reading would take the score from about 55% to about 72%.
- Session 1 quiz (2026-09-02): **2/6**. He got Q1 and Q6 right and Q3 half right.
  - Q2 missed: didn't do the pipe math.
  - Q3 missed: picked "DataSync full load + CDC".
  - Q4 missed: sent data to Flexible instead of Deep Archive, and ignored the 60-day occasional reads.
  - Q5 missed: tried S3 CRR on snapshots.
  - Q2 and Q3 repeated exam misses he had just been taught. The habit failed, not the knowledge.
- Session 1 retest: **2/3**.
  - R1 missed: read "within a month / never edited" as ongoing instead of one-off.
  - His cross-outs said "ops overhead" instead of naming the violated constraint.
- In the site, all of this goes on the hub (diagnosis chart + table) and in each session's Progress → "Session log". Drills and cards that come from his misses carry `mine: true` and a source label.

## 4. The method the site must train

**The reduction method**, shown in every drill and on every cheat sheet:

```
1. Strip the story. Keep DATA nouns and MOVE / STORE / ACCESS verbs.
2. Fill the stub, always the same 4 slots:
   SIZE/NET · TIME (one-off / ongoing) · PROTOCOL/APP · SUPERLATIVE (cheapest / least ops / fastest …)
3. For EACH option: "what problem was this service BUILT for?" No match → cross it out, whatever the rest says.
4. Among survivors, the one that satisfies the SUPERLATIVE wins.
```

Sessions may redefine the stub slots when a cluster needs different ones (Session 2 does, see its file). The mechanics stay the same:

- Options are locked until the stub is filled.
- The user crosses out options with a reason chip (violates SIZE / TIME / PROTOCOL / SUPERLATIVE, wrong job for the service, false/impossible).
- Feedback shows a ✓/✕ per stub slot, the deciding words highlighted in the scenario, a why for every option, and a miss-tag picker (F fact · C confused · K keyword · R misread · A reasoning · L limit).

Learning principles to build in:

- Recall before reveal.
- Stub before options.
- Leitner spaced repetition: boxes 1→5, intervals 1/2/4/8 days, Missed → box 1.
- Interleaved, shuffled drill sets with filters (by line/topic, my misses, not yet solved).
- Dual coding: every service family is a coloured transit line with one verb.
- Checkpoints inside the lesson, after each idea, not only at the end.

## 5. Knowledge map and study order

| # | Cluster | D1 | D2 | D3 | D4 | Start |
|---|---|---|---|---|---|---|
| 1 | Storage & data movement | ● | ●● | ●● | ●● | weak |
| 2 | Migration & hybrid | ● | ● | ● | ●● | weak |
| 3 | Networking & connectivity (DX/VPN/TGW/peering/PrivateLink/endpoints/NAT) | ●● | ●● | ●● | ● | weak |
| 4 | Global architecture & edge (CloudFront/GA/Route 53) | ● | ●● | ●● | ● | weak |
| 5 | Security services & identity (KMS/Secrets/ACM/WAF/Shield/GuardDuty/Inspector/Macie/Security Hub) | ●●● | · | · | · | mixed |
| 6 | Multi-account & governance (Orgs/SCP/Identity Center/Control Tower/RAM/Config) | ●● | · | · | ● | weak |
| 7 | HA & disaster recovery (RTO/RPO, 4 DR tiers, failover mechanisms) | · | ●●● | ● | ● | mixed |
| 8 | Databases & caching (RDS/Aurora/DynamoDB/ElastiCache/Redshift) | ● | ●● | ●●● | ● | mixed |
| 9 | Serverless, events, integration & analytics (SQS/SNS/EventBridge/Kinesis/Step Functions/Glue/Athena/EMR) | · | ●● | ●● | ●● | mixed |
| 10 | Compute & scaling (comparison layer only) | · | ●● | ●● | ●● | strong |
| 11 | Monitoring & operations (CloudWatch/CloudTrail/Config/SSM/X-Ray/Trusted Advisor) | ● | ● | ● | ● | weak |
| 12 | Cost & purchasing (consolidation; cost is a constraint in every session) | · | · | · | ●●● | mixed |
| 13 | Integration drill (long mixed scenarios, re-diagnosis) | all | | | | |

The hub shows this matrix (dots), the domain-weight chart, the study order, the method, the diagnosis, and session cards with progress read from localStorage.

## 6. Freshness: verified 2026-09-02 → 2026-09-24 against AWS docs

Show these as "Changed since the exam guide" callouts. Keep the exam-bank answer recognisable ("practice exams still use X; today AWS says Y").

| Fact | Status |
|---|---|
| AWS Snow Family | **No longer orderable by new customers** (since 7 Nov 2025; existing customers unaffected). AWS points to DataSync (online), **AWS Data Transfer Terminal** (offline: reserve a slot at a facility and bring your own devices), Marketplace partners, and Outposts for edge compute. Tutorials Dojo banks already use DTT as the answer. |
| Amazon FSx File Gateway | **No longer available to new customers** (since 28 Oct 2024). AWS suggests FSx for Windows File Server directly. S3 File Gateway, Volume Gateway and Tape Gateway are unaffected. |
| EBS gp3 | **80,000 IOPS · 2,000 MiB/s · 64 TiB** max (older material says 16,000 / 1,000 / 16 TiB). gp2: 16,000 / 250 MiB/s / 16 TiB. io2 Block Express: 256,000 IOPS · 4,000 MiB/s · 64 TiB · 99.999% durability. io1: 64,000 · 1,000 MiB/s · 16 TiB. st1: 500 MiB/s, 500 IOPS; sc1: 250 MiB/s, 250 IOPS; both 125 GiB–16 TiB and cannot be boot volumes. On Outposts gp3 stays at 16 TiB / 16,000 / 1,000. |
| EBS Multi-Attach | io1 and io2 only, same AZ, up to 16 Nitro instances, needs a cluster-aware file system. Windows: io2 only; io1 Multi-Attach only in a few Regions. |
| EFS | Throughput: Elastic (default, recommended), Provisioned, Bursting. Max I/O performance mode is previous generation. |
| S3 classes | IA 30 d min; Glacier IR 90 d (ms); Glacier Flexible 90 d (Expedited 1–5 min, Standard 3–5 h, Bulk 5–12 h); Deep Archive 180 d (Standard ≤12 h, Bulk ≤48 h); One Zone-IA 1 AZ; Express One Zone 1 AZ, single-digit ms, **no minimum storage duration** (AWS class table; the earlier "1 h min" was wrong — corrected 2026-09-24). |
| S3 lifecycle waterfall | Standard → any; Standard-IA → IT, One Zone-IA, Glacier IR/FR/DA; IT → One Zone-IA, Glacier IR/FR/DA; **One Zone-IA → only Glacier Flexible or Deep Archive**; Glacier IR → FR/DA; FR → DA. ≥30 days before any IA transition. |
| DataSync | Sources: NFS, SMB, HDFS, self-managed object storage, other clouds (Azure Blob/Files, GCS, …), AWS storage. One task can saturate a 10 Gbps link. Writes directly to any S3 class, including Deep Archive. |
| AWS Migration Hub & Application Discovery Service | **Closed to new customers since 7 Nov 2025.** Replaced by **AWS Transform**. MGN docs now say "AWS Transform MGN". |
| Route 53 Resolver | Now called **Route 53 VPC Resolver** in AWS docs (renamed when Route 53 Global Resolver was introduced). Inbound and outbound endpoints are unchanged. |
| DMS | DMS Schema Conversion (in console) and AWS SCT (desktop, recommended for large data warehouses) both exist. DMS Serverless exists. The source stays operational during migration. |
| AD Connector | Proxy only. **Not compatible with RDS for SQL Server or FSx for Windows** (AWS whitepaper). |

**Rule for every new session:** before publishing, check every number and every "is it still available" claim against current AWS docs. Add new changes to this table and to the session's callouts. Never print a limit you did not verify.

## 7. Design

Follow `design/DESIGN.md` and the six mockups exactly. Known drift from the first build that must be fixed:

- Fonts not loading. Link Overpass, Overpass Mono and Atkinson Hyperlegible in every `<head>`, and assert with `document.fonts.check`.
- Invented tag colours: `--t-backup`, `--t-where`, `--t-classes`, `--t-edge`. Non-line tags must use neutral chips.
- Radii flattened to 8px everywhere. Use 6 / 8 / 10 / 999 by role.
- Screens without mockups that don't reuse mockup components.

**Additions this round** (they follow the mockup vocabulary):

- **Learn tab** is new and becomes the default tab.
  - Desktop: sticky chapter list on the left (number, title, ✓ when done), chapter on the right (max ~820px), prev/next at the bottom.
  - Phone: a chapter `<select>` at the top.
  - Phone bottom bar: **Learn · Lines · Cards · Drill · More**. "More" opens a sheet with Tree, Classes, Compare, Traps, Cheat sheet, Progress, All sessions.
- **Checkpoint** component: the same option rows as the drill (neutral → correct/wrong), one question, instant why, "Try again".
- **Charts**: hand-built SVG, one axis, recessive grid, ink bars. Identity comes from a line-colour swatch plus a text label, never colour alone. Every bar has a hover tooltip. Charts work in dark mode. The line palette fails colour-blind separation between DMS green and the grey truck line, which is why the truck line is always dashed and labelled and why chart bars stay ink.
- **Progress tab**: drill accuracy by line, stub slots missed, Leitner box distribution, miss-tag counts, chapters done, session log.
- Mastery in the header = (chapters done + drills solved on last try + cards in box ≥3) / total.

## 8. Architecture (keep or refactor what exists, but end up here)

```
/index.html                  hub
/assets/css/transit.css      tokens (3-state theme: bare :root light, prefers-color-scheme dark guarded by :root:not([data-theme=light]), [data-theme=dark])
/assets/js/engine.js         generic: chrome, router (#tab/arg), learn, map, tree, classes, compare, cards, drill, traps, cheat, progress, charts, widgets registry
/sessions/manifest.js        sessions list + hub content
/sessions/NN-name/index.html thin shell
/sessions/NN-name/*.js       data only (+ session-specific widgets)
/design/                     mockups + DESIGN.md
/docs/                       CONTEXT.md (this file), SCHEMA.md, session briefs
```

- Plain HTML/CSS/vanilla JS. No framework, no build step.
- localStorage keys are `saa:<sessionId>:*`, and every access is wrapped in try/catch.
- Build DOM with createElement/textContent. The lesson text uses a tiny inline markup:
  - `**bold**` and `` `code` ``
  - `{lineId|Service}` renders the name in its line colour
  - `[[#tab|link]]` renders a link
  - `==highlight==` renders a highlight

## 9. Workflow for every session (Session 1 now, then 2, 3 …)

1. Read this file, `design/`, and the session brief.
2. Verify facts (§6 rule). Update §6 and the callouts.
3. Build the session. **Every chapter's full text goes into Learn**; it is the lesson. The brief's widgets, charts and checkpoints are required, not optional.
4. Playwright at 390×844 and 1440×900, light and dark:
   - zero console errors
   - fonts pass `document.fonts.check`
   - every tab renders
   - one drill completed end to end
   - one card rated
   - one checkpoint answered
   - every widget interacted with once
   - no horizontal scroll at 390px
   - side-by-side screenshots against the mockups; fix what differs
5. Commit (list verified facts and anything corrected), push, and confirm GitHub Pages serves https://soosdev.github.io/saa/.
6. Report back: URL, what was built, facts changed, anything skipped and why.
