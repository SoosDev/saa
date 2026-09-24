/* Session 2 — Migration & Hybrid: meta, lines, journey map, stub, method, cheat sheet, compare, traps, log.
   Colour rule: a service keeps its Session 1 colour everywhere. DRS = MGN red, dashed, two-way.
   Discovery and hybrid families are ink lines (4 px) with distinct station shapes. Facts: docs/CONTEXT.md §6. */
(function () {
  'use strict';
  const S = (window.SESSION = window.SESSION || {});
  const INK = 'fill:var(--surface);stroke:var(--ink);stroke-width:3';
  const T = (x, y, text, lines, o) => ({ el: 'text', [o && o.pick ? 'pick' : 'lines']: lines, a: Object.assign({ x, y, 'font-size': 14, 'font-weight': 700, 'font-family': 'Atkinson Hyperlegible, sans-serif' }, (o && o.a) || {}), style: 'fill:var(--ink)', text });
  const sub = (x, y, text, lines, anchor) => ({ el: 'text', lines, a: { x, y, 'font-size': 12, 'font-family': 'Atkinson Hyperlegible, sans-serif', 'text-anchor': anchor || null }, style: 'fill:var(--ink2)', text });
  const circle = (cx, cy, lines, pick) => ({ el: 'circle', lines: pick ? undefined : lines, pick: pick ? lines : undefined, a: { cx, cy, r: 9 }, style: INK });
  const square = (cx, cy, lines, pick) => ({ el: 'rect', lines: pick ? undefined : lines, pick: pick ? lines : undefined, a: { x: cx - 9, y: cy - 9, width: 18, height: 18 }, style: INK });
  const diamond = (cx, cy, lines, pick) => ({ el: 'path', lines: pick ? undefined : lines, pick: pick ? lines : undefined, a: { d: `M${cx} ${cy - 11} L${cx + 11} ${cy} L${cx} ${cy + 11} L${cx - 11} ${cy} Z` }, style: INK });
  const triangle = (cx, cy, lines, pick) => ({ el: 'path', lines: pick ? undefined : lines, pick: pick ? lines : undefined, a: { d: `M${cx} ${cy - 11} L${cx + 11} ${cy + 8} L${cx - 11} ${cy + 8} Z` }, style: INK });
  const hexa = (cx, cy, lines, pick) => ({ el: 'path', lines: pick ? undefined : lines, pick: pick ? lines : undefined, a: { d: `M${cx - 5} ${cy - 9} H${cx + 5} L${cx + 10} ${cy} L${cx + 5} ${cy + 9} H${cx - 5} L${cx - 10} ${cy} Z` }, style: INK });
  const MOVE = ['discover', 'mgn', 'dms', 'datasync', 'truck'];

  Object.assign(S, {
    meta: { id: '02-migration', n: 2, title: 'Migration & Hybrid', brand: 'Migration Transit Map', home: '../../', updated: '2026-09-24' },

    lines: [
      { id: 'discover', name: 'Discovery · AWS Transform', short: 'Discovery', cls: 'ink', width: 4, alias: ['Discovery', 'Migration Hub', 'AWS Transform', 'collector', 'agent'],
        verb: 'finds and plans before anything moves', from: 'servers, utilisation, dependencies → waves',
        built: 'The **planning** line. Discovery finds what you have (inventory and utilisation, and with agents which servers talk to each other), you group it into waves, and one place tracks progress. Today that is **AWS Transform**; question banks say Application Discovery Service and Migration Hub.',
        says: ['discover servers', 'utilisation before migrating', 'dependency mapping', 'which servers talk to each other', 'one dashboard for progress', 'migration waves'],
        switch: [{ to: 'mgn', when: 'the servers are planned and ready to move' }],
        traps: ['Agentless discovery when the question needs dependencies.', 'Old names: Migration Hub / ADS now mean AWS Transform.'],
        update: '**Migration Hub** and **Application Discovery Service** closed to new customers on 7 Nov 2025 (existing customers continue). AWS points to **AWS Transform**: an agentless discovery tool (OVA for vCenter, VHD for Hyper-V, or a CSV server import) that also collects utilisation and server-to-server connections over SSH/WinRM, then dependency mapping, wave planning, a business case and EC2 recommendations. Banks still use the old names and still tie dependencies to the agent; the trigger is the same.' },
      { id: 'mgn', name: 'MGN', short: 'MGN', cls: 'mgn', alias: ['MGN', 'Application Migration Service'],
        verb: 'rehosts whole servers', from: 'physical · VMware · Hyper-V · other cloud → EC2',
        built: 'A **server mover**. Continuous block-level replication of whole disks into a staging area, test launches, then cutover in minutes. **The target is always EC2.** AWS docs now call it “AWS Transform MGN”; banks may say SMS or CloudEndure Migration.',
        says: ['lift-and-shift', 'rehost', 'minimal changes', 'lease ends', 'physical / Hyper-V / other cloud', 'test before cutover'],
        switch: [{ to: 'dms', when: 'only the data moves, into RDS or Aurora' }, { to: 'drs', when: 'nothing is migrating; you need DR that fails back' }],
        traps: ['MGN into RDS: MGN always lands on EC2.', 'MGN used as a DR tool.'] },
      { id: 'drs', name: 'Elastic Disaster Recovery', short: 'DRS', cls: 'mgn', dash: '10 8', alias: ['DRS', 'Elastic Disaster Recovery'],
        verb: 'replicates forever, fails over and back', from: 'on-prem or cloud servers ⇄ AWS',
        built: 'The **round trip**. The same replication engine as MGN, but it never ends: servers keep replicating, you **fail over** to AWS in a disaster and **fail back** after repair. RPO in seconds, RTO in minutes.',
        says: ['disaster recovery', 'RPO in seconds', 'fail back', 'the servers are not migrating', 'recover in AWS'],
        switch: [{ to: 'mgn', when: 'the servers are leaving for good' }],
        traps: ['DRS used to migrate, or MGN used for DR.'] },
      { id: 'dms', name: 'DMS', short: 'DMS', cls: 'dms', alias: ['DMS', 'SCT', 'Schema Conversion'],
        verb: 'replicates database rows', from: 'DB engine → RDS / Aurora / Redshift / S3 · full load + CDC',
        built: 'A **row replicator**. Full load, CDC, or both, while the source stays online. It moves **data, not code**: schemas, views and stored procedures go through DMS Schema Conversion or AWS SCT first.',
        says: ['database migration', 'source stays online', 'ongoing replication / CDC', 'minimal downtime', 'heterogeneous engines', 'S3 as CSV / Parquet'],
        switch: [{ to: 'mgn', when: 'the database server moves as-is to EC2' }, { to: 'truck', when: 'the initial load is too big for the pipe' }],
        traps: ['“Migration” makes DMS look right everywhere; it is right only when the payload is rows.', 'Full load only under a downtime limit: needs CDC.', 'DMS converting schemas or stored procedures.'] },
      { id: 'datasync', name: 'DataSync', short: 'DataSync', cls: 'ds', alias: ['DataSync'],
        verb: 'moves files over the network', from: 'NAS / other cloud → S3 · EFS · FSx',
        built: 'The **file mover** from Session 1. In a migration it carries the file shares while MGN carries servers and DMS carries rows. [[../01-storage/#learn/ch8|Session 1, chapter 8 →]]',
        says: ['file shares', 'NFS / SMB', 'migrate a NAS', 'other cloud → S3'],
        switch: [{ to: 'gateway', when: 'on-prem apps must keep a live share' }] },
      { id: 'truck', name: 'DTT / Snow', short: 'the truck', cls: 'dtt', textVar: 'dtt-text', dash: '14 10', width: 6, alias: ['Data Transfer Terminal', 'DTT', 'Snow'],
        verb: 'seeds the bulk offline', from: 'many TB on a thin pipe → S3, then sync',
        built: 'The **truck** for the initial load when the pipe is thin. Seed offline, then DMS CDC or DataSync catches up online, so downtime stays minimal even for a huge database.',
        says: ['many TB, thin pipe', 'minimal downtime anyway', 'seed, then sync'],
        switch: [{ to: 'dms', when: 'after the seed, to stream the changes' }],
        update: 'Snow Family devices are not offered to new customers (since 7 Nov 2025). Offline transfer today: **AWS Data Transfer Terminal** or Marketplace partners. Data Transfer Terminal is currently available only to **Enterprise Support** customers (others ask AWS Support).' },
      { id: 'gateway', name: 'Storage Gateway', short: 'Gateway', cls: 'gw', textVar: 'gw-text', alias: ['Gateway'],
        verb: 'bridges; cache stays local', from: 'on-prem apps ⇄ S3',
        built: 'The **bridge** from Session 1: on-prem applications keep a file share at LAN speed while the data lives in S3.',
        says: ['keep LAN-speed access', 'SMB share', 'stop buying on-prem storage'],
        switch: [{ to: 'datasync', when: 'the files leave on-prem for good' }] },
      { id: 'placement', name: 'Outposts · Local Zones · Wavelength', short: 'Placement', cls: 'ink', width: 4, alias: ['Outposts', 'Local Zone', 'Wavelength', 'Anywhere'],
        verb: 'puts AWS compute where it must run', from: 'your building · a city · a 5G network',
        built: 'The **whose building?** line. **Outposts**: AWS-managed racks in your data center or factory. **Local Zones**: AWS sites in a metro area, near users. **Wavelength**: AWS inside a telco 5G network. **ECS Anywhere**: your own servers, the ECS control plane in AWS (**EKS Anywhere** runs the whole Kubernetes cluster, control plane too, on your servers).',
        says: ['data must stay in our facility', 'single-digit ms for users in one city', '5G / mobile edge', 'AWS APIs on-premises', 'containers on our own servers'],
        switch: [{ to: 'ops', when: 'you only need to manage existing on-prem servers' }],
        traps: ['Local Zones for “data must stay in our facility”: that is Outposts.'],
        update: 'The 1U and 2U **Outposts servers** are no longer sold to new customers; **Outposts racks** remain (second generation since 2025, single-rack option since Sept 2026).' },
      { id: 'identity', name: 'Directory Service', short: 'Identity', cls: 'ink', width: 4, alias: ['AD Connector', 'Managed Microsoft AD', 'Managed AD', 'Simple AD'],
        verb: 'connects AWS to your Active Directory', from: 'on-prem AD ⇄ AWS',
        built: '**Proxy or real AD?** **AD Connector** forwards every request to on-prem AD and stores nothing. **AWS Managed Microsoft AD** is a real domain (two DCs in two AZs) with trusts. **Simple AD** is small Samba, no trusts.',
        update: '**Simple AD** closed to new customers on 30 Jul 2026 (existing customers keep it and can still create directories). AWS points to Managed Microsoft AD or AD Connector. Banks still use Simple AD as the “small and cheap” answer.',
        says: ['sign in with existing AD credentials', 'RDS SQL Server Windows auth', 'FSx for Windows domain', 'trust with on-prem forest', 'survive a link outage'],
        switch: [{ to: 'dns', when: 'the problem is resolving names, not signing in' }],
        traps: ['AD Connector for RDS SQL Server or FSx for Windows.', 'AD Connector when authentication must survive a link outage.'] },
      { id: 'dns', name: 'Route 53 VPC Resolver', short: 'DNS', cls: 'ink', width: 4, alias: ['Resolver', 'Inbound', 'Outbound'],
        verb: 'answers DNS across the boundary', from: 'on-prem DNS ⇄ VPC',
        built: 'Name the endpoint after the direction the query travels **relative to the VPC**. On-prem asks about AWS names → **inbound**. The VPC asks about on-prem names → **outbound** plus a forwarding rule.',
        says: ['on-prem resolves a private hosted zone', 'EC2 resolves corp.internal', 'conditional forwarder', 'forwarding rule', 'share rules with RAM'],
        switch: [{ to: 'identity', when: 'the problem is signing in, not resolving names' }],
        traps: ['Endpoint direction flipped. Say out loud who sends the query.'],
        update: 'Route 53 Resolver is now called **Route 53 VPC Resolver** (renamed when Route 53 Global Resolver arrived). Inbound and outbound endpoints are unchanged.' },
      { id: 'ops', name: 'Systems Manager (hybrid)', short: 'Ops', cls: 'ink', width: 4, alias: ['Systems Manager', 'SSM'],
        verb: 'manages on-prem servers from AWS', from: 'on-prem + EC2 → one place',
        built: 'SSM **hybrid activations** register on-prem and other-cloud servers as managed nodes (`mi-` IDs). Patch, run commands, collect inventory and open sessions on them alongside EC2, from one place.',
        says: ['patch on-prem and EC2', 'run commands everywhere', 'one place to manage servers'],
        switch: [{ to: 'placement', when: 'you need AWS compute on-site, not just management' }] }
    ],
    topics: { '7r': 'The 7 Rs', bytes: 'Getting the bytes there' },

    map: {
      title: 'The migration journey', lead: 'Discover → plan → move on four lines → test → cut over. Below: what runs in both places. Tap a line or a station.',
      viewBox: '0 0 1000 800', defaultLine: 'mgn',
      caption: 'Colours match Session 1: MGN red, DMS green, DataSync blue, the truck grey dashed. DRS is MGN red, dashed and two-way. Ink lines are planning and hybrid services; their stations have distinct shapes.',
      items: [
        { el: 'rect', a: { x: 0, y: 0, width: 300, height: 800 }, style: 'fill:var(--zone-onprem)' },
        { el: 'rect', a: { x: 700, y: 0, width: 300, height: 800 }, style: 'fill:var(--zone-aws)' },
        { el: 'text', a: { x: 20, y: 34, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5 }, style: 'fill:var(--ink2)', text: 'ON-PREMISES' },
        { el: 'text', a: { x: 500, y: 34, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5, 'text-anchor': 'middle' }, style: 'fill:var(--ink2)', text: 'THE PIPE' },
        { el: 'text', a: { x: 500, y: 52, 'font-size': 12, 'text-anchor': 'middle' }, style: 'fill:var(--ink2)', text: 'VPN now · Direct Connect later' },
        { el: 'text', a: { x: 720, y: 34, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5 }, style: 'fill:var(--ink2)', text: 'AWS' },
        { el: 'path', a: { d: 'M20 512 H980', fill: 'none', 'stroke-dasharray': '2 6' }, style: 'stroke:var(--chip-border);stroke-width:2' },
        { el: 'text', a: { x: 500, y: 540, 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.5, 'text-anchor': 'middle' }, style: 'fill:var(--ink2)', text: 'RUNNING IN BOTH PLACES · RETAIN / HYBRID' },
        { el: 'text', a: { x: 500, y: 790, 'font-size': 12, 'text-anchor': 'middle', 'font-family': 'Overpass Mono, monospace' }, style: 'fill:var(--ink2)', text: 'DX takes weeks: VPN now · seed offline, then sync online' },

        /* the four move lines between the MOVE and TEST pills */
        { el: 'line', line: 'truck', paths: ['M294 400 H706'], labels: [{ x: 320, y: 388, t: 'DTT / SNOW — seed the bulk, then sync' }] },
        { el: 'line', line: 'datasync', paths: ['M294 330 H706'], labels: [{ x: 320, y: 318, t: 'DATASYNC — file shares (Session 1)' }] },
        { el: 'line', line: 'dms', paths: ['M294 260 H706'], labels: [{ x: 320, y: 248, t: 'DMS — rows · full load + CDC' }] },
        { el: 'line', line: 'mgn', paths: ['M294 190 H706'], labels: [{ x: 320, y: 178, t: 'MGN — whole servers → EC2', size: 13 }] },
        /* DRS: same red, dashed, two-way */
        { el: 'line', line: 'drs', paths: ['M250 470 H742'], labels: [{ x: 320, y: 458, t: 'DRS — replicate forever · fail over + fail back' }],
          extra: [{ el: 'path', a: { d: 'M268 459 L254 470 L268 481', fill: 'none', style: 'stroke:var(--mgn);stroke-width:4;stroke-linecap:round;stroke-linejoin:round' } }, { el: 'path', a: { d: 'M724 459 L738 470 L724 481', fill: 'none', style: 'stroke:var(--mgn);stroke-width:4;stroke-linecap:round;stroke-linejoin:round' } }] },
        /* hybrid ink lines */
        { el: 'line', line: 'placement', paths: ['M250 580 H742'], labels: [{ x: 320, y: 570, t: 'PLACEMENT — whose building?' }] },
        { el: 'line', line: 'identity', paths: ['M250 640 H742'], labels: [{ x: 320, y: 630, t: 'IDENTITY — proxy or real AD?' }] },
        { el: 'line', line: 'dns', paths: ['M250 700 H742'], labels: [{ x: 320, y: 690, t: 'DNS — which way does the query travel?' }] },
        { el: 'line', line: 'ops', paths: ['M250 760 H742'], labels: [{ x: 320, y: 750, t: 'OPS — manage on-prem from AWS' }] },
        /* the journey trunk (discovery line) */
        { el: 'line', line: 'discover', paths: ['M80 110 H262', 'M722 170 V110 H930'], labels: [{ x: 60, y: 76, t: 'JOURNEY — discover · plan · move · test · cut over', size: 12 }] },

        /* stations */
        circle(80, 110, ['discover']), T(80, 138, 'Discover', ['discover'], { a: { 'text-anchor': 'middle' } }),
        circle(180, 110, ['discover']), T(180, 138, 'Plan · 7 Rs', ['discover'], { a: { 'text-anchor': 'middle' } }),
        { el: 'rect', lines: MOVE, a: { x: 262, y: 96, width: 32, height: 320, rx: 16 }, style: INK },
        { el: 'text', lines: MOVE, a: { x: 278, y: 440, 'font-size': 16, 'font-weight': 800, 'text-anchor': 'middle' }, style: 'fill:var(--ink)', text: 'MOVE' },
        ...[[186, 'Servers / VMs', ['mgn']], [256, 'Databases', ['dms']], [326, 'File shares', ['datasync']], [396, 'Huge datasets', ['truck']]].map(([y, t, l]) => T(250, y, t, l, { a: { 'text-anchor': 'end', 'font-size': 13 }, pick: true })),
        { el: 'rect', lines: MOVE, a: { x: 706, y: 170, width: 32, height: 250, rx: 16 }, style: INK },
        { el: 'text', lines: MOVE, a: { x: 722, y: 444, 'font-size': 16, 'font-weight': 800, 'text-anchor': 'middle' }, style: 'fill:var(--ink)', text: 'TEST' },
        ...[[195, 'EC2', ['mgn']], [265, 'RDS · Aurora · Redshift · S3', ['dms']], [335, 'S3 · EFS · FSx', ['datasync']], [405, 'S3, then sync', ['truck']]].map(([y, t, l]) => T(750, y, t, l, { a: { 'font-size': 13 } })),
        circle(820, 110, ['discover']), T(820, 138, 'Cut over', ['discover'], { a: { 'text-anchor': 'middle' } }),
        circle(930, 110, ['discover']), T(930, 138, 'Operate', ['discover'], { a: { 'text-anchor': 'middle' } }),
        sub(930, 154, 'optimise', ['discover'], 'middle'),

        circle(250, 470, ['drs'], true), T(232, 468, 'Servers that stay', ['drs'], { a: { 'text-anchor': 'end', 'font-size': 13 }, pick: true }), sub(232, 484, 'on-prem or other cloud', null, 'end'),
        circle(742, 470, ['drs']), T(760, 468, 'Recovery in AWS', ['drs'], { a: { 'font-size': 13 } }), sub(760, 484, 'fail over · fail back', ['drs']),

        square(250, 580, ['placement'], true), T(232, 578, 'Your site / users', ['placement'], { a: { 'text-anchor': 'end', 'font-size': 13 }, pick: true }), sub(232, 594, 'factory · city · 5G phones', null, 'end'),
        square(742, 580, ['placement']), T(760, 578, 'Outposts · Local Zones', ['placement'], { a: { 'font-size': 13 } }), sub(760, 594, 'Wavelength · ECS/EKS Anywhere', ['placement']),
        diamond(250, 640, ['identity'], true), T(232, 638, 'On-prem AD', ['identity'], { a: { 'text-anchor': 'end', 'font-size': 13 }, pick: true }), sub(232, 654, 'users, groups, credentials', null, 'end'),
        diamond(742, 640, ['identity']), T(760, 638, 'AD Connector · Managed AD', ['identity'], { a: { 'font-size': 13 } }), sub(760, 654, 'Simple AD', ['identity']),
        triangle(250, 700, ['dns'], true), T(232, 698, 'On-prem DNS', ['dns'], { a: { 'text-anchor': 'end', 'font-size': 13 }, pick: true }), sub(232, 714, 'corp.internal', null, 'end'),
        triangle(742, 700, ['dns']), T(760, 698, 'Inbound ⇄ outbound', ['dns'], { a: { 'font-size': 13 } }), sub(760, 714, 'endpoints + forwarding rules', ['dns']),
        hexa(250, 760, ['ops'], true), T(232, 758, 'On-prem servers', ['ops'], { a: { 'text-anchor': 'end', 'font-size': 13 }, pick: true }), sub(232, 774, 'patch, run, inventory', null, 'end'),
        hexa(742, 760, ['ops']), T(760, 758, 'SSM hybrid activation', ['ops'], { a: { 'font-size': 13 } }), sub(760, 774, 'mi- managed nodes', ['ops'])
      ]
    },

    stub: [
      { id: 'what', label: 'WHAT MOVES / WHAT IS IT', short: 'WHAT', values: ['servers', 'database', 'files', 'inventory/plan', 'identity', 'DNS', 'placement'] },
      { id: 'change', label: 'CHANGE ALLOWED', short: 'CHANGE', values: ['none (rehost)', 'replatform', 'refactor/rebuy', 'n/a'] },
      { id: 'down', label: 'DOWNTIME', short: 'DOWN', values: ['hours OK', 'minimal', 'n/a'] },
      { id: 'sup', label: 'SUPERLATIVE', short: 'SUP', values: ['cheapest', 'least ops', 'fastest', 'resilient', 'none stated'] }
    ],

    method:
`1. Strip the story. Keep WHAT moves (or runs in both places) and the verbs.
2. Fill the stub, the same 4 slots for this session:
   WHAT (servers / database / files / inventory / identity / DNS / placement) ____
   CHANGE (none = rehost / replatform / refactor-rebuy / n/a) ____
   DOWNTIME (hours OK / minimal / n/a) ____   SUPERLATIVE ____
3. For EACH option ask: "what problem was this service BUILT for?"
   No match with the stub -> cross it out, whatever the rest of the sentence says.
4. Among the survivors, the one that satisfies the SUPERLATIVE wins.`,

    cheat:
`MIGRATION = WHAT moves? + HOW MUCH change? + WHAT stays up?
7R: Retire Retain Rehost Relocate Replatform Repurchase Refactor (less -> more change)
    quick/minimal change = REHOST   managed DB, same app = REPLATFORM
DISCOVER  -> App Discovery (agentless = VM inventory, AGENT = dependencies)
TRACK     -> Migration Hub   (both now AWS Transform; closed to new since 7 Nov 2025)
SERVERS   -> MGN   blocks -> staging -> test -> cutover · target ALWAYS EC2
DR (stay) -> DRS   same engine, fail over + fail BACK
DB        -> DMS   rows · source stays online · full load + CDC = minimal downtime
   diff engine -> SCT / DMS Schema Conversion (schema+code) + DMS (data)
   DW -> Redshift -> SCT (+ extraction agents)
   RDS MySQL/PG -> Aurora -> Aurora READ REPLICA -> promote
   huge + thin pipe -> truck initial load + DMS CDC
BYTES     VPN now, DX later (weeks) · seed offline + sync online
HYBRID    your building -> Outposts · city -> Local Zones · 5G -> Wavelength
   containers on own servers -> ECS Anywhere / EKS Anywhere · patch on-prem -> SSM hybrid
   AD: proxy only -> AD Connector (no RDS SQL/FSx, dies with link) · real AD -> Managed AD · tiny -> Simple AD (closed to new 30 Jul 2026)
   DNS: on-prem asks AWS -> INBOUND · AWS asks on-prem -> OUTBOUND + rule
RELOCATE  vSphere as-is -> VMware Cloud on AWS (banks) · today Amazon EVS + HCX
NEVER: MGN->RDS · DMS converts schema · full-load-only for "minimal downtime" ·
       Local Zone for "in our facility" · DX with a 2-week deadline`,

    compare: [
      { id: 'mgn-dms', short: 'MGN · DMS', title: 'MGN vs DMS — blocks vs rows',
        sides: [{ name: 'MGN', line: 'mgn', fig: { dir: 'one' }, gist: 'Copies **blocks**: the whole server, OS and all, onto EC2.' }, { name: 'DMS', line: 'dms', fig: { dir: 'one', keep: true }, gist: 'Copies **rows** into a managed engine; the source stays online.' }],
        rows: [['Deciding words', 'lift-and-shift, as-is, servers, EC2', 'RDS / Aurora, managed database, CDC'], ['Lands on', 'EC2, always', 'RDS, Aurora, Redshift, DynamoDB, Kinesis, S3'], ['Tempting wrong', 'for “move the database into RDS”', 'for “move the whole server”']],
        check: { q: '“Move the Oracle data into Amazon RDS for Oracle with minimal downtime.”', opts: ['MGN', 'DMS'], a: 1, why: 'The target is a managed database, and MGN only lands on EC2. Rows + minimal downtime = DMS full load + CDC.' } },
      { id: 'mgn-drs', short: 'MGN · DRS', title: 'MGN vs Elastic Disaster Recovery — one way vs round trip',
        sides: [{ name: 'MGN', line: 'mgn', fig: { dir: 'one' }, gist: 'Replicates until **cutover**, then the source is decommissioned.' }, { name: 'DRS', line: 'drs', fig: { dir: 'both', keep: true }, gist: 'Replicates **forever**; fail over to AWS, fail back after repair.' }],
        rows: [['Ends?', 'yes: cutover, then decommission', 'never: replication keeps running'], ['Deciding words', 'migrate, lease ends, rehost', 'DR, RPO seconds, RTO minutes, fail back'], ['Engine', 'Both use the same continuous block-level replication.']],
        check: { q: '“Replicate on-prem servers continuously so we can recover in AWS and fail back after repair.”', opts: ['MGN', 'DRS'], a: 1, why: 'Nothing is leaving for good, and failback is required: that is the round trip.' } },
      { id: 'sct-dms', short: 'SCT · DMS', title: 'Schema Conversion vs DMS — structure vs data',
        sides: [{ name: 'SCT / DMS Schema Conversion', fig: { dir: 'one', left: 'SCHEMA', right: 'TARGET', keep: true }, gist: 'Converts **schema and code**: tables, views, stored procedures, functions.' }, { name: 'DMS', line: 'dms', fig: { dir: 'one', keep: true }, gist: 'Moves the **data**, and keeps it in sync with CDC.' }],
        rows: [['Deciding words', 'convert PL/SQL, T-SQL, stored procedures, different engine', 'migrate data, ongoing changes, minimal downtime'], ['Data warehouse', 'SCT (+ data extraction agents) for Teradata, Netezza … → Redshift', 'not alone'], ['Both?', 'Heterogeneous moves use both: convert first, then DMS for data.']],
        check: { q: '“Convert PL/SQL stored procedures for Aurora PostgreSQL.”', opts: ['SCT / Schema Conversion', 'A DMS task'], a: 0, why: 'DMS never converts code. Schema Conversion (console) or SCT (desktop) does.' } },
      { id: 'cdc', short: 'Full load · + CDC', title: 'Full load vs full load + CDC — what the downtime is',
        sides: [{ name: 'Full load', line: 'dms', fig: { dir: 'one' }, gist: 'Writes stop for the **whole copy**. Downtime = the copy.' }, { name: 'Full load + CDC', line: 'dms', fig: { dir: 'one', keep: true }, gist: 'The source stays online; changes stream until **cutover**. Downtime = minutes.' }],
        rows: [['Use when', 'a downtime window longer than the copy is fine', 'any “minimal downtime” or “under N minutes”'], ['Tempting wrong', 'picked because it is simpler', '—']],
        check: { q: '“A 4 TB database may be down for at most 30 minutes.”', opts: ['Full load', 'Full load + CDC'], a: 1, why: 'Copying 4 TB takes hours. Only CDC shrinks downtime to the final catch-up.' } },
      { id: 'replica', short: 'Read replica · DMS', title: 'RDS → Aurora: Aurora read replica vs DMS',
        sides: [{ name: 'Aurora read replica', fig: { dir: 'one', left: 'RDS', right: 'AURORA', keep: true }, gist: 'Native: create an Aurora replica of the RDS instance, **promote** at zero lag.' }, { name: 'DMS', line: 'dms', fig: { dir: 'one', keep: true }, gist: 'Flexible and cross-engine, but more to set up and run.' }],
        rows: [['Use when', 'RDS MySQL / PostgreSQL → Aurora, same family, least effort', 'different engines, or a source outside RDS'], ['Downtime-OK path', 'snapshot, then restore as Aurora', '—']],
        check: { q: '“RDS for MySQL → Aurora MySQL with the least effort and minimal downtime.”', opts: ['Aurora read replica, promote', 'DMS full load + CDC'], a: 0, why: 'Same family: the native replica does it with nothing extra to manage.' } },
      { id: 'place', short: 'Outposts · LZ · Wavelength', title: 'Outposts vs Local Zones vs Wavelength — whose building?',
        sides: [{ name: 'Outposts', line: 'placement', fig: { dir: 'one', left: 'AWS', right: 'YOURS', keep: true }, gist: 'AWS racks in **your** building. Data residency, local processing, low latency to on-prem systems.' }, { name: 'Local Zones', line: 'placement', fig: { dir: 'one', left: 'REGION', right: 'CITY', keep: true }, gist: 'AWS-run site in a **metro area**, near users.' }, { name: 'Wavelength', line: 'placement', fig: { dir: 'one', left: 'REGION', right: '5G', keep: true }, gist: 'AWS inside a telco **5G** network, for mobile devices.' }],
        rows: [['Deciding words', 'our facility, factory, data must stay on-site', 'users in one city, single-digit ms', '5G, mobile, AR/VR on phones'], ['Who runs the building', 'you', 'AWS', 'the telco']],
        check: { q: '“Data must never leave our plant, and we want AWS APIs on-site.”', opts: ['Outposts', 'Local Zones', 'Wavelength'], a: 0, why: 'Only Outposts puts AWS in your own building.' } },
      { id: 'ad', short: 'AD Connector · Managed AD', title: 'AD Connector vs Managed Microsoft AD vs Simple AD',
        sides: [{ name: 'AD Connector', line: 'identity', fig: { dir: 'both', left: 'AWS', right: 'ON-PREM' }, gist: 'A **proxy**. Stores nothing; every request goes to on-prem AD.' }, { name: 'Managed Microsoft AD', line: 'identity', fig: { dir: 'both', cache: true, cacheLabel: 'AD', left: 'ON-PREM', right: 'AWS' }, gist: 'A **real AD** in AWS (2 DCs, 2 AZs) with a trust to on-prem.' }, { name: 'Simple AD', line: 'identity', fig: { dir: 'none', left: 'AWS', right: 'AWS' }, gist: '**Tiny**, Samba-based, no trusts. Closed to new customers since 30 Jul 2026.' }],
        rows: [['RDS SQL Server / FSx for Windows', 'not compatible', 'yes', 'no'], ['Link to on-prem down', 'sign-in fails', 'keeps working', 'n/a'], ['Deciding words', 'console sign-in with AD, store nothing, cheapest', 'Windows auth, domain join, trust, resilient', 'small, basic, no on-prem AD']],
        check: { q: '“FSx for Windows must join the domain; staff keep their on-prem credentials.”', opts: ['AD Connector', 'Managed AD + trust', 'Simple AD'], a: 1, why: 'FSx for Windows does not support AD Connector. A real AD with a trust keeps the on-prem credentials.' } },
      { id: 'resolver', short: 'Inbound · Outbound', title: 'Resolver inbound vs outbound — which way does the query go?',
        sides: [{ name: 'Inbound endpoint', line: 'dns', fig: { dir: 'one', left: 'ON-PREM', right: 'VPC' }, gist: 'Queries come **into** the VPC: on-prem resolves AWS private names.' }, { name: 'Outbound endpoint', line: 'dns', fig: { dir: 'one', left: 'VPC', right: 'ON-PREM' }, gist: 'Queries go **out** of the VPC, with a forwarding rule per domain.' }],
        rows: [['Who asks', 'an on-prem server', 'an EC2 instance'], ['Whose name', 'a private hosted zone', 'corp.internal (on-prem)'], ['Also needed', 'a conditional forwarder on on-prem DNS', 'a forwarding rule (shareable with RAM)']],
        check: { q: '“EC2 instances must resolve corp.internal.”', opts: ['Inbound endpoint', 'Outbound endpoint + rule'], a: 1, why: 'The query leaves the VPC toward on-prem: outbound, with a rule for corp.internal.' } }
    ],

    traps: [
      { title: '“Migration” makes DMS look right everywhere', x: 'It is DMS only if the payload is rows. Servers go by MGN, files by DataSync.', drills: ['M1', 'N20'] },
      { title: 'MGN into RDS', x: 'MGN always targets EC2. A managed database target means DMS (or a native replica).', drills: ['M3', 'N4'] },
      { title: 'Full load only under a downtime limit', x: 'A full load stops writes for the whole copy. “Minimal downtime” needs CDC.', drills: ['M3', 'N5'] },
      { title: 'DMS converting schemas or code', x: 'DMS moves data. Stored procedures, views and schemas go through DMS Schema Conversion or SCT.', drills: ['M3', 'N4', 'N23'] },
      { title: 'DRS used to migrate, or MGN used for DR', x: 'Same engine, different ending: MGN cuts over and stops; DRS replicates forever and fails back.', drills: ['M1', 'N7', 'N8'] },
      { title: 'Local Zones for “data must stay in our facility”', x: 'A Local Zone is an AWS building in a city. Your own facility means Outposts.', drills: ['N9', 'N10'] },
      { title: 'AD Connector for RDS SQL Server or FSx for Windows', x: 'Not compatible. They need AWS Managed Microsoft AD (or self-managed AD).', drills: ['M6'] },
      { title: 'AD Connector when auth must survive a link outage', x: 'AD Connector stores nothing; if the link drops, sign-in fails. Managed AD with a trust keeps working.', drills: ['M6', 'N12'] },
      { title: 'Resolver endpoint direction flipped', x: 'Name it after the direction the query travels relative to the VPC. On-prem asks → inbound. EC2 asks → outbound + rule.', drills: ['M5', 'N14', 'N15'] },
      { title: 'Direct Connect with a 2-week deadline', x: 'DX takes weeks to provision. Use a Site-to-Site VPN or the internet now; order DX for later.', drills: ['N22', 'N5'] },
      { title: 'Old names as distractors or as answers', x: 'SMS and CloudEndure Migration mean MGN. Migration Hub and Application Discovery Service mean AWS Transform. Answer the trigger.', drills: ['M2', 'N2', 'N8'] },
      { title: '“Refactor” when the scenario says quickly with minimal changes', x: 'Quick + minimal change = rehost. Refactoring is the slowest R.', drills: ['M1', 'N18'] },
      { title: 'Agentless discovery when the question needs dependencies', x: 'In exam banks the agentless collector sees VM inventory and utilisation, and dependencies (network connections, processes) need the agent. Today AWS Transform’s agentless tool also collects connections, but the banks’ rule still decides the answer.', drills: ['M2', 'N1'] }
    ],

    log: [
      { when: '—', what: 'Session 2 quiz (M1–M6, S7)', result: 'not taken yet', lesson: 'Answer M1–S7 in the drill (they are marked “Quiz”). When the results are in, misses get `mine` and a line here.' }
    ]
  });
})();
