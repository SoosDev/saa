/* Feed bites — Session 2, migration & hybrid. Facts: sessions/02-migration/learn.js chapters in src,
   docs/session-02-migration.md (verified 2026-09-24). Ledger: docs/feed-bites.md. */
window.SAA_BITES = (window.SAA_BITES || []).concat([
  {
    id: 'mig-7rs', sid: '02-migration', title: 'The 7 Rs in one breath', domains: ['D4'], src: ['ch2'],
    text: 'Moving to AWS is like moving house, and the 7 Rs are what you do with each thing, from least change to most. **Retire** throws it out; **Retain** leaves it behind for now; **Rehost** carries it as it is to EC2; **Relocate** moves the hypervisor, not the VMs; **Replatform** keeps the app but swaps in a managed part, such as RDS; **Repurchase** buys a SaaS product instead; **Refactor** rebuilds it cloud-native. How much change is allowed picks the R.',
    qs: [
      { id: 'q1', q: 'A company runs a self-managed payroll package on two on-premises servers. A SaaS payroll provider covers every feature the company uses, and the finance team wants to stop operating payroll software altogether. Which strategy has the LEAST operational overhead?', words: ['stop operating payroll software', 'LEAST operational overhead'],
        expl: 'Stop running the software entirely, and a SaaS product covers it: Repurchase. Every other R keeps the company running payroll software, only in a different place or shape.',
        opts: [
          { t: 'Rehost: lift both payroll servers to Amazon EC2 as they are, using MGN', why: 'The servers move to EC2, but the team still runs the payroll software on them.' },
          { t: 'Replatform: keep the payroll package and move its database to Amazon RDS', why: 'A managed database cuts DBA work, but the package itself still has to be run.' },
          { t: 'Repurchase: subscribe to the SaaS payroll provider, switch off both servers', ok: true, why: 'Buying the service instead of running it leaves nothing to operate.' },
          { t: 'Refactor: rebuild the payroll package as Lambda functions with DynamoDB', why: 'A rebuild is the most change, and the team would still run its own code.' }] },
      { id: 'q2', q: 'A web shop must move to AWS this month with no changes to its application code. Its self-managed MySQL server takes most of the DBA team’s week, and the company wants that work gone. Which plan meets both goals with the LEAST change?', words: ['no changes to its application code', 'DBA team’s week'],
        expl: 'Code unchanged rules out Refactor. DBA work gone rules out anything that keeps a self-managed MySQL server, including Rehost, because MGN always lands on EC2. Same app, managed database is Replatform.',
        opts: [
          { t: 'Rehost the web servers and the MySQL server to Amazon EC2 together, using MGN', why: 'MGN lands the MySQL server on EC2 as it is, so the DBA team still runs it.' },
          { t: 'Replatform: web servers unchanged, MySQL moved into Amazon RDS with DMS', ok: true, why: 'The app is untouched and the database becomes a managed service: lift, tinker, shift.' },
          { t: 'Refactor the shop onto Lambda and DynamoDB so no database server remains', why: 'Rebuilding on DynamoDB rewrites the application code, which must not change.' },
          { t: 'Retain the MySQL server on-premises and rehost only the web servers to EC2', why: 'The database stays on-premises, so the DBA work stays with it.' }] },
      { id: 'q3', q: 'A reporting job runs for an hour each night on servers that sit idle the rest of the day. The company wants it rebuilt so each step scales on its own and is billed per request, and it accepts a full code rewrite. Which strategy fits?', words: ['billed per request', 'full code rewrite'],
        expl: '“Scales on its own”, “billed per request” and an accepted rewrite are the Refactor triggers. Every other R keeps the code as it is or replaces it with someone else’s product.',
        opts: [
          { t: 'Rehost the reporting servers to Amazon EC2 as they are, using MGN', why: 'Same servers on EC2: nothing is rebuilt, and nothing scales per step.' },
          { t: 'Replatform the job onto Elastic Beanstalk with no change to its code', why: 'Same code on a managed platform: the rebuild the company asked for never happens.' },
          { t: 'Repurchase a SaaS reporting product and retire the reporting servers', why: 'It buys someone else’s product; the company asked for its own job rebuilt.' },
          { t: 'Refactor the job into Lambda functions that each handle one step', ok: true, why: 'A cloud-native rebuild: each part scales on its own and is paid per request.' }] },
      { id: 'q4', q: 'An assessment covers a lab system that staff still use daily. A regulator requires it to run in the company’s own facility for two more years; after that it may move. Which strategy applies to the lab system for now?', words: ['still use daily', 'own facility'],
        expl: 'Daily use rules out Retire; the facility rule rules out every R that moves the system. “Stay on-prem for now” is Retain.',
        opts: [
          { t: 'Retain: keep it running in the facility and revisit it in two years', ok: true, why: 'It must stay on-prem until a date: Retain, and revisit it then.' },
          { t: 'Retire: archive the lab system’s data and switch off its servers now', why: 'Staff use it every day; Retire is for systems nobody uses.' },
          { t: 'Rehost: lift the lab system to Amazon EC2 as it is, using MGN', why: 'It moves the system out of the facility the regulator requires.' },
          { t: 'Repurchase: replace the lab system with a SaaS product hosted elsewhere', why: 'A SaaS product runs outside the facility the regulator requires.' }] }
    ]
  },
  {
    id: 'mig-mgn-dms', sid: '02-migration', title: 'Servers vs databases: MGN vs DMS', domains: ['D2', 'D3'], src: ['ch4', 'ch5'],
    text: '**MGN** moves a server the way a crane lifts a whole shed: operating system, applications and data, block by block, always set down on **EC2**. **DMS** moves only what is inside, the rows, into a managed target such as RDS, Aurora, Redshift, DynamoDB or S3, while the source database stays online. The machine as it is means MGN; the data in a managed engine means DMS.',
    qs: [
      { id: 'q1', q: 'A company wants its on-premises SQL Server database in Amazon RDS for SQL Server so it no longer patches the database host. The database must keep taking orders while the data is copied. Which approach meets these requirements?', words: ['Amazon RDS for SQL Server', 'keep taking orders'],
        expl: 'The target is a managed database, so the payload is rows: DMS, with CDC so the source keeps taking writes. MGN copies whole servers and only ever lands on EC2.',
        opts: [
          { t: 'AWS Application Migration Service replicating the database server into RDS', why: 'MGN always lands on EC2; it cannot set a server down in RDS.' },
          { t: 'AWS DMS with a full load plus CDC task into the RDS for SQL Server instance', ok: true, why: 'DMS moves the rows into the managed engine while the source stays online.' },
          { t: 'AWS Application Migration Service replicating the database server to EC2', why: 'It moves the server, but the company would still patch the database host on EC2.' },
          { t: 'AWS DataSync copying the database files on a schedule into the RDS instance', why: 'DataSync copies files; moving rows into a managed engine is DMS’s job.' }] },
      { id: 'q2', q: 'A vendor application and its embedded database run together on one Windows server, and the vendor supports only that exact OS install. The company must move it to AWS with the fewest changes and only minutes of downtime at cutover. Which solution fits?', words: ['exact OS install', 'minutes of downtime'],
        expl: 'The machine must arrive as it is, OS and all: that is MGN’s block-level copy to EC2. DMS takes only the rows, VM Import/Export works from an offline image, and DRS is the disaster recovery twin.',
        opts: [
          { t: 'Move the embedded database into Amazon RDS with DMS and reinstall the app', why: 'DMS moves rows; the reinstall breaks the exact OS install the vendor supports.' },
          { t: 'Export the server as an image with VM Import/Export and launch it on EC2', why: 'An offline image means longer downtime and no continuous replication.' },
          { t: 'Replicate the server with Elastic Disaster Recovery and fail over to AWS', why: 'DRS is built to protect servers that stay and fail back; a one-way move is MGN’s job.' },
          { t: 'Replicate the server to Amazon EC2 with MGN, test-launch it, then cut over', ok: true, why: 'A block-level copy of the whole server, OS included, with minutes of downtime at cutover.' }] },
      { id: 'q3', q: 'A company is moving 12 Linux application servers and their PostgreSQL database to AWS. The app servers must arrive unchanged on EC2; the database must land in Amazon Aurora PostgreSQL. Which combination meets these requirements?', words: ['arrive unchanged on EC2', 'Amazon Aurora PostgreSQL'],
        expl: 'Split by payload: whole servers as they are go to EC2 with MGN; rows into Aurora go with DMS. Each tool alone covers only half of the move.',
        opts: [
          { t: 'MGN for all 13 servers, with the database server set down directly in Aurora', why: 'MGN always lands on EC2; it cannot set the database down in Aurora.' },
          { t: 'MGN for the 12 app servers to EC2, and DMS for the database into Aurora', ok: true, why: 'Whole servers as they are go on MGN; rows into a managed engine go on DMS.' },
          { t: 'DMS for all 13 servers, replicating the app servers and the database rows', why: 'DMS moves rows; it does not copy whole application servers.' },
          { t: 'DataSync for the 12 app servers, and DMS for the database into Aurora', why: 'DataSync copies files, not bootable servers; the app servers never arrive.' }] },
      { id: 'q4', q: 'A runbook says: “Replicate the MySQL server with AWS Application Migration Service into Amazon RDS for MySQL, then cut over.” A reviewer flags the step. What is the flaw in it?', words: ['into Amazon RDS for MySQL'],
        expl: 'MGN copies whole servers and only sets them down on EC2. Landing the data in RDS is a DMS job: rows into a managed engine.',
        opts: [
          { t: 'MGN replicates only physical servers, so a virtual MySQL server cannot use it', why: 'MGN takes physical, VMware, Hyper-V and other-cloud servers alike.' },
          { t: 'MGN stops the source server while it replicates, so writes are lost meanwhile', why: 'The source keeps running while blocks stream to the staging area.' },
          { t: 'MGN always lands on EC2, so an RDS target means moving the rows with DMS', ok: true, why: 'The target is always EC2; a managed database target is DMS.' },
          { t: 'RDS for MySQL accepts no migrated data, so the database must be rebuilt by hand', why: 'RDS is one of DMS’s targets; the rows can be moved into it.' }] }
    ]
  },
  {
    id: 'mig-dms-sct', sid: '02-migration', title: 'DMS and schema conversion: same engine vs different engine', domains: ['D3', 'D4'], src: ['ch5'],
    text: 'Moving a database to the same engine is like moving books to a new shelf: **DMS** carries the rows and nothing needs rewriting. Moving to a different engine is moving to a country with another language: the schema, views, stored procedures and functions must first be translated by **DMS Schema Conversion** (in the console) or **SCT** (on the desktop). Only then does DMS carry the rows, because DMS never translates code.',
    qs: [
      { id: 'q1', q: 'A company moves an on-premises MySQL database to Amazon RDS for MySQL. The engine stays the same, the source must keep serving writes until cutover, and the team wants the LEAST effort. Which plan fits?', words: ['engine stays the same', 'keep serving writes', 'LEAST effort'],
        expl: 'Same engine means no translation step. “Keep serving writes” needs CDC, so one DMS full load plus CDC task does the whole move.',
        opts: [
          { t: 'Convert the schema with AWS SCT first, then run a DMS full load plus CDC task', why: 'Same engine: there is nothing to translate, so the SCT step is extra work.' },
          { t: 'Convert the schema with DMS Schema Conversion and let it copy the rows too', why: 'Schema Conversion converts structure and code; DMS is what moves the rows.' },
          { t: 'Run a DMS full load plus CDC task from the MySQL source into RDS for MySQL', ok: true, why: 'Same engine needs no conversion; DMS moves the rows and CDC keeps the source live.' },
          { t: 'Run a DMS full-load-only task into RDS for MySQL during a weekend outage', why: 'Without CDC the writes stop for the whole copy, which the stem rules out.' }] },
      { id: 'q2', q: 'A team ran a DMS full load plus CDC task from on-premises SQL Server to Amazon Aurora PostgreSQL. Every table arrived, but the application fails because its stored procedures and views are missing in the target. What should the team have done first?', words: ['stored procedures and views are missing'],
        expl: 'SQL Server to Aurora PostgreSQL is a heterogeneous move. DMS moves data only; the schema, views and stored procedures need DMS Schema Conversion or SCT before the rows go.',
        opts: [
          { t: 'Converted the schema and code with DMS Schema Conversion before the task', ok: true, why: 'Different engine: structure and code are translated first, then DMS moves the rows.' },
          { t: 'Run the DMS task as full load only, so that the code was copied with the tables', why: 'No DMS mode converts code; full load only just adds downtime.' },
          { t: 'Made the DMS replication instance Multi-AZ, so that the code survived the copy', why: 'Multi-AZ keeps a long CDC phase alive through an AZ failure; it converts nothing.' },
          { t: 'Used DMS Serverless instead of a replication instance, so it converted the code', why: 'Serverless is another way to run DMS, and DMS moves rows, never code.' }] },
      { id: 'q3', q: 'A company converting an Oracle schema for Amazon RDS for PostgreSQL wants to run the conversion from the AWS console, without installing any desktop software on its workstations. Which tool meets this requirement?', words: ['without installing any desktop software'],
        expl: 'Both SCT and DMS Schema Conversion translate schema and code; the console requirement picks DMS Schema Conversion. DMS and MGN translate nothing.',
        opts: [
          { t: 'AWS Schema Conversion Tool, run on an architect’s workstation to convert the code', why: 'SCT converts the same things, but it is a desktop tool to install.' },
          { t: 'An AWS DMS full load task, set to convert the schema while it copies the tables', why: 'DMS moves data; it never converts schemas or code.' },
          { t: 'AWS Application Migration Service, replicating the server and switching engines', why: 'MGN lands the same Oracle server on EC2; it cannot change the engine.' },
          { t: 'DMS Schema Conversion, run in the DMS console to convert the schema and code', ok: true, why: 'Schema Conversion runs in the console and converts the schema and the code.' }] }
    ]
  },
  {
    id: 'mig-edge-compute', sid: '02-migration', title: 'AWS closer to you: Outposts, Local Zones, Wavelength', domains: ['D3', 'D2'], src: ['ch7'],
    text: 'The three ways to put AWS close to the work differ in whose building they sit in. **Outposts** are AWS-managed racks in **your** building, linked to a parent Region, for data that must stay on-site; **Local Zones** are AWS-run sites in a metro area, near users in that city, with no hardware of yours. **Wavelength** puts AWS inside a telco’s 5G network, next to mobile devices.',
    update: 'The 1U and 2U **Outposts servers** are no longer sold to new customers; **Outposts racks** remain (second generation since 2025, a single-rack option since Sept 2026). Older material describes “racks or servers”.',
    qs: [
      { id: 'q1', q: 'A post-production studio in one city runs editing workstations on Amazon EC2, and its editors complain of lag from the nearest Region. The studio wants single-digit millisecond latency and will not house any hardware. Which placement fits?', words: ['single-digit millisecond latency', 'will not house any hardware'],
        expl: 'Users in one city, no hardware of their own: a Local Zone. Outposts means your own building, Wavelength means a 5G carrier network, and CloudFront caches rather than runs servers.',
        opts: [
          { t: 'Run the workstations in an AWS Local Zone in the studio’s metro area', ok: true, why: 'An AWS-run site in the city: single-digit ms for local users, no hardware of theirs.' },
          { t: 'Install AWS Outposts racks in the studio and run the workstations there', why: 'The studio would buy and house the hardware, which it refuses to do.' },
          { t: 'Run the workstations in a Wavelength Zone of the studio’s 5G carrier', why: 'Wavelength sits inside a 5G carrier network, for mobile devices, not office desks.' },
          { t: 'Put Amazon CloudFront in front of the workstations in the nearest Region', why: 'CloudFront caches content; it runs no application servers near the editors.' }] },
      { id: 'q2', q: 'A carmaker’s connected vehicles stream sensor data over a carrier’s 5G network to an inference service. The traffic should not leave the carrier network, to keep latency to the vehicles as low as possible. Which placement fits?', words: ['should not leave the carrier network'],
        expl: 'Mobile devices on 5G, traffic kept inside the carrier: Wavelength. A Local Zone is an AWS site outside the carrier network; Outposts sit in your own building.',
        opts: [
          { t: 'Run the inference service in an AWS Local Zone in the largest metro area', why: 'A Local Zone is near a city, but outside the carrier network.' },
          { t: 'Install AWS Outposts racks in the carmaker’s plant for the inference service', why: 'The plant is the carmaker’s building; the vehicles are on the carrier’s network.' },
          { t: 'Run the inference service in a Wavelength Zone inside the carrier’s network', ok: true, why: 'AWS compute inside the 5G network: traffic from the vehicles never leaves it.' },
          { t: 'Serve the inference service through Amazon CloudFront edge locations', why: 'CloudFront caches content; it runs no application servers.' }] },
      { id: 'q3', q: 'A bank’s compliance rule says customer records must never leave its own data center, but it wants AWS services next to them. An engineer proposes an AWS Local Zone in the bank’s city. Why does that proposal fail the rule?', words: ['never leave its own data center'],
        expl: 'Whose building? A Local Zone is AWS’s, in a metro area. Data that must stay in your own facility, with AWS services on-site, means Outposts.',
        opts: [
          { t: 'A Local Zone serves only 5G mobile devices from inside a carrier network', why: 'That describes Wavelength; a Local Zone is an AWS site in a metro area.' },
          { t: 'A Local Zone must be bought, installed and powered by the bank on its site', why: 'Local Zones are run by AWS; buying and housing hardware is the Outposts model.' },
          { t: 'A Local Zone is an AWS-run site in the city, so the records leave the bank', ok: true, why: 'An AWS building is not the bank’s building; its own facility means Outposts.' },
          { t: 'A Local Zone only caches content at the edge and runs no application servers', why: 'That describes CloudFront; a Local Zone is AWS infrastructure close to end users.' }] },
      { id: 'q4', q: 'A mining company wants AWS-managed racks with the same AWS APIs at a remote site that will have no network connection to any AWS Region. A consultant proposes AWS Outposts. What is the flaw in this proposal?', words: ['no network connection'],
        expl: 'Outposts put AWS racks in your building, but each Outpost is linked to its parent Region and needs that link. A site with no connection at all cannot provide it.',
        opts: [
          { t: 'Outposts run only in AWS-run metro sites, never in a customer’s own building', why: 'That is a Local Zone; Outposts are AWS-managed racks in your own building.' },
          { t: 'Outposts racks are no longer sold; only the 1U and 2U servers remain on offer', why: 'The reverse: the 1U and 2U servers are no longer sold to new customers; racks remain.' },
          { t: 'Outposts run only inside a telco 5G network, next to the mobile devices', why: 'That is Wavelength; Outposts sit in the customer’s own building.' },
          { t: 'Outposts need a link back to their parent Region, and this site has none', ok: true, why: 'An Outpost is linked to a parent Region and needs a link back to it.' }] }
    ]
  }
]);
