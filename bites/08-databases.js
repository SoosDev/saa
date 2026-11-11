/* Feed bites — Session 8, databases & caching. Facts: sessions/08-databases/learn.js chapters in src,
   docs/session-08-databases.md (verified 2026-10-03). Ledger: docs/feed-bites.md. */
window.SAA_BITES = (window.SAA_BITES || []).concat([
  {
    id: 'db-which-one', sid: '08-databases', title: 'Which database for which job', domains: ['D3', 'D4'], src: ['ch2'],
    text: 'Each database is a shelf built for one way of reaching in. **RDS** and **Aurora** are the relational shelf: tables joined with SQL inside transactions. **DynamoDB** hands back one item by its key, fast at any scale, but never joins. **Redshift** is the warehouse that scans years of history for dashboards. Graphs go to **Neptune**, MongoDB apps to **DocumentDB**, full-text search to **OpenSearch**. The data model picks the service.',
    qs: [
      { id: 'q1', q: 'An order system joins customers, orders and invoices inside SQL transactions. It must move to a managed AWS database with the LEAST operational overhead. Which service fits its data model?', words: ['joins', 'SQL transactions'],
        expl: 'The data model decides: joins inside transactions are relational OLTP, which RDS (or Aurora) runs for you. Each other option is a good service for a different model.',
        opts: [
          { t: 'Amazon RDS, a managed relational engine that runs the joins and transactions', ok: true, why: 'Joins and transactions are the relational model, and RDS runs it as a managed service.' },
          { t: 'Amazon DynamoDB, a managed key-value store that returns each order by its key', why: 'DynamoDB has no joins; the invoices and customers would have to be stitched together in code.' },
          { t: 'Amazon Redshift, a managed warehouse that runs SQL across the whole order history', why: 'A warehouse is built for analytics (OLAP), not for an order system’s transactions (OLTP).' },
          { t: 'Amazon Neptune, a managed graph store that follows the links between the orders', why: 'A graph store is built for relationships many hops deep, not for transactional SQL.' }] },
      { id: 'q2', q: 'Analysts want dashboards that aggregate five years of sales across billions of rows with complex SQL. No dashboard query may run on any instance of the production Aurora MySQL cluster, its readers included. Which design meets these requirements?', words: ['aggregate five years', 'complex SQL', 'its readers included'],
        expl: 'Complex SQL over years of history for BI is the warehouse model (OLAP), and the warehouse is a separate service, away from the production cluster. Aurora Replicas are instances of that cluster, which the stem rules out; DynamoDB and OpenSearch are built for other access patterns.',
        opts: [
          { t: 'Load the sales history into Amazon Redshift and point the dashboards at it', ok: true, why: 'BI and complex SQL over TB of history is what a columnar warehouse is built for.' },
          { t: 'Add Aurora Replicas and point the dashboards at the cluster reader endpoint', why: 'Replicas spare the writer, but they are instances of the production cluster, which is ruled out.' },
          { t: 'Copy the sales history into DynamoDB tables keyed by date and scan them', why: 'DynamoDB has no joins or aggregation; scanning it for dashboards is the wrong shelf.' },
          { t: 'Index the sales history in Amazon OpenSearch and query it for dashboards', why: 'OpenSearch is built for search and relevance, not for complex SQL over years of sales.' }] },
      { id: 'q3', q: 'A professional network shows each member “people you may know”: members two or three introductions away who worked at the same companies. The list must appear while the member’s home page loads. Which database is built for this access pattern?', words: ['two or three introductions away', 'while the member’s home page loads'],
        expl: 'People a few introductions away are links followed hop by hop, which is the graph model, and Neptune is the graph shelf. Recursive joins slow down with every hop, key lookups make the app walk each hop itself, and a warehouse answers in batches.',
        opts: [
          { t: 'Amazon Neptune, with members as vertices and introductions as edges to traverse', ok: true, why: 'Following relationships hop by hop is the graph model Neptune is built for.' },
          { t: 'Amazon Aurora PostgreSQL, with a link table followed by recursive self-joins', why: 'It can be written, but recursive joins slow down with every hop added.' },
          { t: 'Amazon DynamoDB, keyed by member ID, with the application looking up each hop in turn', why: 'Fast per key, but the application must walk every hop with a lookup of its own.' },
          { t: 'Amazon Redshift, loading the links nightly and joining them for each member', why: 'A warehouse for analytics; a nightly batch is not ready while a page loads.' }] },
      { id: 'q4', q: 'A new mobile game keeps each player’s profile as one JSON document. Every read and every write fetches or replaces a whole profile by player ID, and no request ever touches two profiles. Traffic may grow to millions of requests per second, and no MongoDB code exists. Which service fits this access pattern with the LEAST operational overhead?', words: ['by player ID', 'no MongoDB code exists', 'LEAST operational overhead'],
        expl: 'JSON is the format, not the access pattern: every request reads or writes one item by its key, at any scale, which is DynamoDB. DocumentDB earns its place when an app already speaks the MongoDB API; Aurora has one writer, and OpenSearch is built for search.',
        opts: [
          { t: 'Amazon DynamoDB, with each profile stored as one item keyed by the player ID', ok: true, why: 'One item by its key, at any scale, with no servers to run, is DynamoDB’s model.' },
          { t: 'Amazon DocumentDB, with each profile stored as one JSON document by player', why: 'Built for apps that keep MongoDB drivers; with none here, it is a cluster to run.' },
          { t: 'Amazon Aurora MySQL, with each profile stored as a JSON column keyed by player ID', why: 'Relational with one writer: it works, but it is not built for key lookups at any scale.' },
          { t: 'Amazon OpenSearch Service, with each profile indexed as a document by player', why: 'Built for full-text search and relevance; nothing here searches inside profiles.' }] }
    ]
  },
  {
    id: 'db-proxy-storm', sid: '08-databases', title: 'RDS Proxy and the connection storm', domains: ['D3', 'D2'], src: ['ch4'],
    text: 'A relational database has a fixed number of chairs: each open connection takes one, and the instance’s memory sets how many there are. A normal server reuses a few chairs. **Lambda** does not, because every concurrent copy of a function holds its own. A burst fills every chair while the CPU sits nearly idle. **RDS Proxy** is the doorman: it keeps a pool of connections, lends one only while a statement runs, and queues the rest instead of refusing them.',
    qs: [
      { id: 'q1', q: 'A ticketing site runs AWS Lambda functions that write orders to an Amazon RDS for PostgreSQL DB instance. When a concert goes on sale, the database refuses new connections while its CPU stays low. Which change fixes this with the LEAST code change?', words: ['refuses new connections', 'CPU stays low'],
        expl: 'Refused connections at low CPU means the connection ceiling, not compute. RDS Proxy pools and multiplexes the functions’ connections and queues the excess; the rest add clients or change nothing.',
        opts: [
          { t: 'Put RDS Proxy in front of the DB instance and point the functions at its endpoint', ok: true, why: 'The proxy pools connections, lends them per statement, and queues the excess instead of refusing it.' },
          { t: 'Raise the Lambda concurrency limit so that more invocations can run during the sale', why: 'More concurrent invocations means more connections; it multiplies the refusals.' },
          { t: 'Increase the function timeout so each invocation waits longer for a connection', why: 'Without a proxy nothing queues the connection; the database refuses it at once.' },
          { t: 'Store the database password in Secrets Manager so each function connects faster', why: 'Where the password lives does not change how many connections the functions open.' }] },
      { id: 'q2', q: 'A web tier of four EC2 instances uses a connection pool to Amazon RDS for MySQL and has never hit the connection limit. The same code is moving to AWS Lambda, with up to 1,000 concurrent invocations at peak. What keeps the database accepting connections with the LEAST operational overhead?', words: ['connection pool', 'concurrent invocations'],
        expl: 'A pool in the code works on four long-lived servers. On Lambda each concurrent execution environment holds its own pool, so 1,000 environments open 1,000 sets. The pool has to move out of the function, into RDS Proxy.',
        opts: [
          { t: 'Add RDS Proxy and connect the functions to its endpoint instead of the instance', ok: true, why: 'One shared pool outside the functions, lending connections only while a statement runs.' },
          { t: 'Keep the connection pool library in the function code, as on the EC2 instances', why: 'Each concurrent environment holds its own pool, so the database sees one per environment.' },
          { t: 'Set reserved concurrency of 1,000 on the function so the peak is always covered', why: 'Guaranteeing 1,000 environments guarantees the connections that overflow the database.' },
          { t: 'Add a read replica and send every query from the functions to the replica', why: 'Each function still opens its own connection, so the replica meets the same ceiling.' }] },
      { id: 'q3', q: 'Lambda bursts overwhelm an Amazon RDS for Oracle DB instance with connections. A colleague proposes RDS Proxy as the fix. Which statement explains why that plan fails?', words: ['RDS for Oracle'],
        expl: 'RDS Proxy supports Aurora MySQL and PostgreSQL and RDS for MySQL, PostgreSQL, MariaDB and SQL Server, not Oracle or Db2. It lives in the VPC, is never public, and targets the writer of an RDS instance.',
        opts: [
          { t: 'RDS Proxy does not support the Oracle engine, so it cannot front this instance', ok: true, why: 'The supported engines leave out Oracle and Db2.' },
          { t: 'RDS Proxy must be publicly accessible, so it cannot reach a DB in the VPC', why: 'The opposite: the proxy lives in the database’s VPC and is never publicly accessible.' },
          { t: 'RDS Proxy can only target read replicas, so it cannot take the writes', why: 'For an RDS instance the proxy targets the writer, not a read replica.' },
          { t: 'RDS Proxy needs Aurora storage, so it cannot sit in front of RDS at all', why: 'It also fronts RDS for MySQL, PostgreSQL, MariaDB and SQL Server.' }] }
    ]
  },
  {
    id: 'db-ddb-modes', sid: '08-databases', title: 'DynamoDB on-demand vs provisioned', domains: ['D4', 'D3'], src: ['ch8'],
    text: 'DynamoDB sells throughput two ways. **On-demand** is the taxi meter: you pay per request, plan nothing, and the table absorbs sudden growth up to about double its previous peak. **Provisioned** is the monthly lease: you set reads and writes per second and pay every hour whether you use them or not; auto scaling adjusts the lease, but over minutes. Steady traffic near the leased level is cheaper on the lease; spiky, idle or unknown traffic is cheaper on the meter.',
    update: 'Older material treats provisioned as the default cost answer. DynamoDB cut on-demand prices by 50% (effective 1 November 2024), and AWS now recommends on-demand by default; provisioned wins only for steady, predictable load.',
    qs: [
      { id: 'q1', q: 'An internal survey tool on DynamoDB is busy for two days each quarter and almost idle in between. The team wants no capacity planning. Which capacity setup has the LOWEST cost?', words: ['almost idle', 'no capacity planning'],
        expl: 'Long idle stretches and short peaks are the meter’s case: on-demand charges per request, so the quiet months cost almost nothing and nobody plans capacity. Every provisioned variant bills reserved throughput by the hour.',
        opts: [
          { t: 'On-demand mode, which bills only for the requests the tool actually makes', ok: true, why: 'Pay per request: idle months cost almost nothing, and there is no capacity to set.' },
          { t: 'Provisioned mode with auto scaling between a low floor and the quarterly peak', why: 'Auto scaling reacts over minutes and still bills the floor every hour of the quiet months.' },
          { t: 'Provisioned mode with reserved capacity bought for the quarterly peak level', why: 'Reserved capacity discounts a committed base; here the base would sit unused most of the year.' },
          { t: 'Provisioned mode set at the quarterly peak and lowered by hand each quarter', why: 'It pays by the hour for unused throughput and needs the capacity planning the team wants to avoid.' }] },
      { id: 'q2', q: 'A table in provisioned mode with auto scaling throttles for the first minutes every time a push notification sends users into the app at once. Between pushes, traffic is low. Which change stops the throttling with the LEAST operational overhead?', words: ['first minutes', 'push notification'],
        expl: 'Auto scaling reacts over minutes, so a sudden spike throttles before it catches up. On-demand serves up to double the previous peak instantly, and the earlier pushes set that peak.',
        opts: [
          { t: 'Switch the table to on-demand mode, which serves sudden bursts as they arrive', ok: true, why: 'On-demand serves up to double the previous peak at once; nothing to plan or tune.' },
          { t: 'Keep provisioned mode and buy reserved capacity to discount the base load', why: 'Reserved capacity lowers the price of a committed base; it adds no burst headroom.' },
          { t: 'Keep provisioned mode and rely on auto scaling to catch each burst as it lands', why: 'That is the current design: auto scaling reacts over minutes, which is the throttling window.' },
          { t: 'Keep provisioned mode and move the table to the Standard-IA table class', why: 'The table class changes storage and request prices, not how fast capacity grows.' }] },
      { id: 'q3', q: 'A table will take a steady, known write load around the clock during a six-week data migration. After that, traffic will be unpredictable. Which plan is MOST cost-effective?', words: ['steady, known', 'unpredictable', 'MOST cost-effective'],
        expl: 'The deciding difference applies twice: steady traffic near a known level is cheaper provisioned; unpredictable traffic is cheaper on-demand. You can switch to on-demand later.',
        opts: [
          { t: 'Provisioned at the known migration level, then switch to on-demand afterwards', ok: true, why: 'Each phase gets the mode its traffic shape favours.' },
          { t: 'On-demand for the migration weeks, then switch to provisioned for the launch', why: 'Backwards: the steady phase is the provisioned case, the unpredictable one is on-demand.' },
          { t: 'On-demand for both phases, so that nobody has to plan any capacity at all', why: 'It works, but the steady migration weeks would cost more than provisioned capacity.' },
          { t: 'Provisioned for both phases, with auto scaling to follow the later traffic', why: 'Auto scaling reacts over minutes; unpredictable spikes after the migration would throttle.' }] }
    ]
  },
  {
    id: 'db-cache-or-replica', sid: '08-databases', title: 'Read replica or cache', domains: ['D3', 'D4'], src: ['ch5', 'ch9'],
    text: 'Two kinds of read pain need two cures. Many different queries need more database to run them: a **read replica** is a second kitchen cooking every order from scratch. The same few answers asked for again and again need memory: a **cache** is the counter where finished plates wait. **ElastiCache** sits in front of RDS or Aurora; **DAX** speaks DynamoDB’s own API and returns cached items in microseconds. Neither helps writes.',
    qs: [
      { id: 'q1', q: 'An Aurora PostgreSQL writer is overloaded by an internal search page where each user types different filters, so almost no two queries repeat. All users are in one Region, and the reads must stay in that Region. Which change takes the MOST of this read load off the writer?', words: ['almost no two queries repeat', 'reads must stay in that Region', 'MOST of this read load'],
        expl: 'Broad read load of different queries needs more database capacity: Aurora Replicas behind the reader endpoint. A cache only pays off for repeated reads, and a Global Database secondary serves its reads from another Region.',
        opts: [
          { t: 'Add Aurora Replicas and send the search page to the cluster reader endpoint', ok: true, why: 'Different queries need more capacity to run them; replicas share the same cluster volume.' },
          { t: 'Add ElastiCache with lazy loading in front of the cluster for the search page', why: 'A cache helps only when the same answers repeat; here almost every read would miss.' },
          { t: 'Add an Aurora Global Database secondary Region and read the search page there', why: 'Its readers sit in another Region, and the reads must stay in the users’ Region.' },
          { t: 'Add DynamoDB Accelerator in front of the cluster to serve the search results', why: 'DAX works with DynamoDB only; it cannot sit in front of Aurora.' }] },
      { id: 'q2', q: 'A team puts DynamoDB Accelerator (DAX) in front of a table, but its checkout reads are no faster. The checkout code requests strongly consistent reads. Why did DAX not help?', words: ['strongly consistent reads'],
        expl: 'DAX caches eventually consistent reads; strongly consistent reads pass straight through to DynamoDB. Writes go through DAX to the table.',
        opts: [
          { t: 'DAX passes strongly consistent reads straight through to the table', ok: true, why: 'Only eventually consistent reads are served from the DAX cache.' },
          { t: 'DAX caches only the writes that go through it and never caches the reads', why: 'Reads of cached items are exactly what DAX serves; writes go through it to the table.' },
          { t: 'DAX needs an ElastiCache cluster underneath it before it caches any reads', why: 'DAX is its own managed cluster in the VPC that speaks the DynamoDB API.' },
          { t: 'DAX serves cached reads only to clients outside the VPC of the table', why: 'DAX is a managed cluster inside your VPC; the checkout code reaches it there.' }] },
      { id: 'q3', q: 'An RDS for PostgreSQL database slows down because a batch job writes millions of rows every hour, while reads are light. A colleague proposes ElastiCache in front of it. What is the flaw in that proposal?', words: ['writes millions of rows', 'reads are light'],
        expl: 'Caches and read replicas both relieve reads. Neither takes write work off the primary, which is where this load is.',
        opts: [
          { t: 'A cache relieves repeated reads, and this database is slowed by its writes', ok: true, why: 'The load is writes; a cache does not take write work off the database.' },
          { t: 'ElastiCache works only with DynamoDB tables, never with an RDS database', why: 'ElastiCache sits in front of RDS or Aurora; DAX is the DynamoDB-only cache.' },
          { t: 'A cache adds a second copy that must be written, so it doubles the writes', why: 'Only write-through writes the cache too; the real flaw is that the load is writes.' },
          { t: 'ElastiCache must replace the database, because it keeps the only copy', why: 'A cache sits in front of the database; it does not replace it.' }] }
    ]
  }
]);
