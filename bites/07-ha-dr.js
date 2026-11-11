/* Feed bites — Session 7, HA & disaster recovery. Facts: sessions/07-ha-dr/learn.js chapters in src,
   docs/session-07-ha-dr.md (verified 2026-09-25). Ledger: docs/feed-bites.md. */
window.SAA_BITES = (window.SAA_BITES || []).concat([
  {
    id: 'dr-rto-rpo', sid: '07-ha-dr', title: 'RTO vs RPO: the two clocks', domains: ['D2'], src: ['ch2'],
    text: 'After an outage, two clocks run. **RTO** counts forward from the crash: how long the service may stay down, and it decides how much must already be running at the recovery site. **RPO** counts back from the crash: how old the last good copy of the data may be, and it decides how the data is copied, from nightly backups to continuous replication to synchronous writes. Both are business choices; the design is the cheapest one that meets them.',
    qs: [
      { id: 'q1', q: 'After a Region outage, a retailer’s board allows the checkout to be down for at most two hours and accepts losing at most five minutes of orders. How do these map to the recovery objectives?', words: ['down for at most two hours', 'losing at most five minutes'],
        expl: 'RTO is about downtime: the delay until service is restored. RPO is about data loss: how old the last recovery point may be. The board sets both; the architect picks the cheapest design that meets them.',
        opts: [
          { t: 'RPO is the two hours of downtime; RTO is the five minutes of lost orders', why: 'Swapped: downtime is the recovery time objective, lost data the recovery point objective.' },
          { t: 'RTO is the two hours of downtime; RPO is the five minutes of lost orders', ok: true, why: 'RTO limits the delay until service returns; RPO limits how much data may be lost.' },
          { t: 'Both are RTO targets: one for the checkout and one for the order database', why: 'Only the downtime is an RTO; how much data may be lost is the RPO.' },
          { t: 'Both are RPO targets, because each one limits what the business may lose', why: 'RPO limits lost data only; time out of service is the RTO.' }] },
      { id: 'q2', q: 'A company copies nightly database backups to a second Region and would rebuild there from templates after a disaster. A new rule cuts the allowed data loss from a day to a few seconds; the allowed downtime does not change. Which change addresses the new rule?', words: ['allowed data loss', 'a few seconds'],
        expl: 'Allowed data loss is the RPO, and the RPO decides how data is copied: nightly backups mean up to a day, continuous replication means seconds. Running or pre-deployed compute moves the other clock, the RTO, which did not change.',
        opts: [
          { t: 'Keep the nightly backups and run a scaled-down copy of the app tier in the second Region', why: 'Running compute shortens the RTO; the data is still up to a day old.' },
          { t: 'Keep the nightly backups and pre-deploy the whole stack from templates in the second Region', why: 'Pre-deployed infrastructure cuts the rebuild time, an RTO lever; the RPO stays a day.' },
          { t: 'Replicate the database continuously to the second Region instead of nightly backups', ok: true, why: 'Continuous replication gives an RPO of seconds; nightly backups give up to a day.' },
          { t: 'Keep the nightly backups and copy each one to a third Region as well as the second', why: 'More copies of the same nightly backup are just as old: the RPO is still up to a day.' }] },
      { id: 'q3', q: 'A company backs up its Amazon RDS database continuously, so point-in-time recovery can restore it to about five minutes before a failure, and copies the backups to a second Region where nothing else runs. Its RPO is 15 minutes, and leadership now also wants an RTO of a few minutes. How does the current design measure up?', words: ['RPO is 15 minutes', 'nothing else runs', 'RTO of a few minutes'],
        expl: 'The two clocks are independent. Point-in-time recovery to about five minutes back fits the RPO of 15 minutes, but with nothing running in the second Region the RTO is still the time to deploy, restore and switch traffic. An RTO of minutes needs something already running there.',
        opts: [
          { t: 'It meets both targets, since a restore to five minutes back means minutes of downtime', why: 'Five minutes back is the recovery point, the RPO; the downtime still includes the rebuild.' },
          { t: 'It meets the RTO but not the RPO: continuous backups still lose up to a day of data', why: 'Point-in-time recovery reaches about five minutes back; a day is the nightly-backup case.' },
          { t: 'It meets neither: backups copied to another Region cannot be restored in that Region', why: 'Backup and restore does exactly that: deploy from code there, restore the data, switch traffic.' },
          { t: 'It meets the RPO but not the RTO: recovery still waits for a rebuild in the Region', ok: true, why: 'Five minutes back fits the RPO of 15 minutes; with nothing running, the RTO is the rebuild.' }] }
    ]
  },
  {
    id: 'dr-four-strategies', sid: '07-ha-dr', title: 'The four DR strategies', domains: ['D2', 'D4'], src: ['ch2', 'ch4'],
    text: 'Four ways to keep a spare shop in another Region, cheapest first. **Backup and restore** keeps only boxes of copies there and builds the shop after the disaster. **Pilot light** keeps the stock live but the lights off: compute must start before anyone is served. **Warm standby** runs a small working shop that serves at once, then grows. **Multi-site** runs two full shops serving customers all the time. The cheapest one that meets both RTO and RPO wins.',
    qs: [
      { id: 'q1', q: 'A DR Region holds a live replica of the database and launch templates for the app tier, but no servers are running. In a test, traffic is switched there straight away and every request fails. What explains the result?', words: ['no servers are running', 'switched there straight away'],
        expl: 'Data live, compute switched off: a pilot light. AWS draws the line in one sentence: a pilot light cannot process requests without additional action, while a warm standby handles traffic at reduced capacity immediately.',
        opts: [
          { t: 'It is a warm standby: a scaled-down copy rejects traffic until it is scaled up first', why: 'A warm standby serves at reduced capacity immediately; with no servers running, this is not one.' },
          { t: 'It is backup and restore: the database must be restored from backups before it serves', why: 'The database is already a live replica; only the compute is missing.' },
          { t: 'It is a pilot light: compute has to be started and scaled before it can take traffic', ok: true, why: 'Data stores replicate live, compute is switched off, so nothing can serve until it starts.' },
          { t: 'It is multi-site: the second Region serves only after the first one has been shut down', why: 'Multi-site serves users from both Regions all the time; nothing here is serving.' }] },
      { id: 'q2', q: 'An application on Amazon RDS needs DR in a second Region in case the whole primary Region is lost. The business accepts an RPO of 24 hours and an RTO of 24 hours. Which design is the MOST cost-effective that meets both targets?', words: ['whole primary Region is lost', 'RPO of 24 hours', 'MOST cost-effective'],
        expl: 'Cheapest tier that meets both. A nightly copy loses at most a day of data, and a 24-hour RTO leaves time to rebuild from code: backup and restore. Pilot light and warm standby keep a replica or compute running that the targets do not ask for, and a copy left in the primary Region is lost with it.',
        opts: [
          { t: 'Pilot light, with a cross-Region read replica and the app tier switched off there', why: 'It meets both, but pays for a running replica instance the targets do not need.' },
          { t: 'Backup and restore, copying one nightly RDS snapshot to the second Region each day', ok: true, why: 'Nightly copies mean up to a day of data loss, and a rebuild fits the RTO of 24 hours or less.' },
          { t: 'Backup and restore, keeping one nightly RDS snapshot each day in the primary Region', why: 'The snapshots would be lost with the primary Region, so nothing is left to restore.' },
          { t: 'Warm standby, with a cross-Region read replica and a small app tier running there', why: 'It meets both, but pays for running compute and a replica all year.' }] },
      { id: 'q3', q: 'In a second Region, a company keeps two small EC2 instances of each tier running behind a load balancer that receives no traffic, and replicates its database continuously. Which recovery targets is this design built to meet?', words: ['two small EC2 instances', 'replicates its database continuously'],
        expl: 'A scaled-down but fully functional copy is a warm standby: Well-Architected gives it an RPO of seconds and an RTO of minutes. It differs from a pilot light because it can take traffic now, and from multi-site because it is not serving users at full size.',
        opts: [
          { t: 'An RPO of hours and an RTO of up to a day, since the stack is rebuilt from backups', why: 'Nothing is rebuilt here: the data is live and every tier already runs.' },
          { t: 'An RPO of minutes and an RTO of tens of minutes, since compute must start first', why: 'That is a pilot light; here compute is already running and able to serve.' },
          { t: 'An RPO near zero and an RTO of potentially zero, since both Regions serve users', why: 'Multi-site serves users at full size in both Regions; this copy is small and idle.' },
          { t: 'An RPO of seconds and an RTO of minutes, since the small copy can serve at once', ok: true, why: 'A scaled-down, fully functional copy is a warm standby: seconds and minutes.' }] },
      { id: 'q4', q: 'A company runs a warm standby in a second Region. The business has relaxed its targets to an RPO of minutes and an RTO of under an hour. Which change cuts cost the MOST while still meeting both targets?', words: ['relaxed its targets', 'cuts cost the MOST'],
        expl: 'Relaxed targets move the cheapest fit down a tier. An RPO of minutes still needs the data replicating live, which rules out nightly snapshots; an RTO of under an hour leaves time to start compute, so the app tier can be switched off: a pilot light.',
        opts: [
          { t: 'Switch the app tier off in the second Region and keep the database replicating live', ok: true, why: 'A pilot light: data live for the RPO, compute started on failover within tens of minutes.' },
          { t: 'Stop the database replication and copy nightly snapshots to the second Region instead', why: 'Nightly copies mean up to a day of data loss, which fails the RPO of minutes.' },
          { t: 'Keep the warm standby but shrink it to one small instance in each of its tiers', why: 'It still pays for running compute all year; switching it off cuts more and still meets both.' },
          { t: 'Replace it with multi-site so both Regions share the load and neither sits idle', why: 'Multi-site is the most expensive of the four strategies; it raises cost.' }] }
    ]
  },
  {
    id: 'dr-multiaz-replica', sid: '07-ha-dr', title: 'Multi-AZ vs read replica', domains: ['D2', 'D3'], src: ['ch4'],
    text: 'RDS makes two kinds of copy for two jobs. A **Multi-AZ** DB instance keeps a standby, the understudy in the wings: it learns every line synchronously, never goes on stage while the lead is well, and when the lead falls RDS points the same endpoint name at it. A **read replica** is a second cast playing to part of the audience: asynchronous and readable, but it never takes over on its own; someone must promote it. Failover needs the standby; read load needs the replica.',
    qs: [
      { id: 'q1', q: 'An Amazon RDS for MySQL DB instance in one AZ must keep running automatically if that AZ fails, with no one on call to act. Reads are light. Which change meets this?', words: ['automatically', 'no one on call'],
        expl: 'Automatic failover inside a Region is the Multi-AZ standby’s job: RDS promotes it and points the same endpoint at it. Read replicas and restores both need someone to act.',
        opts: [
          { t: 'Create a read replica in another AZ and point the app at it if the primary fails', why: 'A read replica is promoted manually; with no one on call, nothing takes over.' },
          { t: 'Create a read replica in another Region and promote it if the primary’s AZ fails', why: 'Still a manual promotion, and another Region is more than an AZ failure needs.' },
          { t: 'Convert the DB instance to a Multi-AZ deployment with a standby in another AZ', ok: true, why: 'A synchronous standby that RDS promotes on its own, behind the same endpoint name.' },
          { t: 'Keep automated backups and restore a new instance in another AZ if the AZ fails', why: 'A point-in-time restore is a manual step into a new instance, not an automatic failover.' }] },
      { id: 'q2', q: 'An Amazon RDS for PostgreSQL Multi-AZ DB instance slows down every night when an analytics job runs heavy read queries. Automatic failover must stay in place. Which change offloads the job with the LEAST operational overhead?', words: ['heavy read queries', 'Automatic failover must stay', 'LEAST operational overhead'],
        expl: 'Read load needs the replica, failover needs the standby, and this stem wants both. A read replica takes the job’s queries off the primary while Multi-AZ keeps failing over automatically; the standby itself serves no reads.',
        opts: [
          { t: 'Point the analytics job at the Multi-AZ standby, which already holds every write', why: 'The standby of a Multi-AZ DB instance serves no reads; it exists only to take over.' },
          { t: 'Create a read replica and point the analytics job at the replica’s own endpoint', ok: true, why: 'An asynchronous, readable copy takes the read load; the Multi-AZ standby stays as it is.' },
          { t: 'Create a read replica for the job and turn off Multi-AZ to pay for the replica', why: 'Turning off Multi-AZ removes the automatic failover that must stay.' },
          { t: 'Restore a point-in-time copy every night and run the analytics job against it', why: 'It offloads the reads, but a nightly restore into a new instance is ongoing work.' }] },
      { id: 'q3', q: 'A team runs an Amazon RDS for MySQL Single-AZ primary with a read replica in a second AZ and calls it highly available. The primary’s AZ fails. What happens to the database?', words: ['Single-AZ primary', 'read replica'],
        expl: 'A read replica is for read scaling. It is asynchronous and promoted manually, so losing the primary’s AZ stops writes until someone acts. Automatic failover behind the same endpoint is what Multi-AZ adds.',
        opts: [
          { t: 'RDS promotes the replica and points the primary endpoint at it in 60–120 seconds', why: 'That is Multi-AZ failover, typically 60–120 seconds; a read replica is promoted manually.' },
          { t: 'Writes stop until someone promotes the replica; it never takes over on its own', ok: true, why: 'A read replica is promoted manually; until then there is no writer.' },
          { t: 'RDS fails over to the replica with no data lost, because it is written synchronously', why: 'Read replicas are asynchronous; it is the Multi-AZ standby that commits every write.' },
          { t: 'The replica starts accepting writes on its own until the primary comes back', why: 'A replica never takes over on its own; it becomes a writer only when someone promotes it.' }] },
      { id: 'q4', q: 'A payments ledger on Amazon RDS for MySQL must lose no committed transaction if its AZ fails, and failover must be automatic. A read replica in a second AZ already serves reports. Which addition meets the requirement?', words: ['lose no committed transaction', 'failover must be automatic'],
        expl: 'Zero data loss plus automatic failover is the Multi-AZ standby: every write is committed on both, so failover loses nothing, and RDS promotes it on its own. Replicas are asynchronous and promoted by hand; backups restore to a point a few minutes back.',
        opts: [
          { t: 'Script a promotion of the existing read replica that runs when the primary fails', why: 'Asynchronous replication can trail the primary; only synchronous writes give an RPO of zero.' },
          { t: 'Enable Multi-AZ so a synchronous standby in another AZ takes over automatically', ok: true, why: 'Every write is committed on both, so failover loses nothing (RPO zero), and it is automatic.' },
          { t: 'Add a second read replica in a third AZ so two copies of the ledger survive', why: 'More asynchronous copies, still promoted manually: no automatic failover, no RPO of zero.' },
          { t: 'Enable cross-Region automated backup replication for point-in-time restore', why: 'A point-in-time restore reaches about the last 5 minutes, into a new instance, by hand.' }] }
    ]
  },
  {
    id: 'dr-replication-backup', sid: '07-ha-dr', title: 'Replication is not a backup', domains: ['D2', 'D1'], src: ['ch7', 'ch8'],
    text: 'A replica is carbon paper under the notebook: every line, mistakes included, lands on the copy at once. That saves the page when the notebook burns, but a bad deploy, a careless `DELETE` or ransomware arrive too. A backup is a dated photocopy in a locked drawer, from before the mistake. **AWS Backup** keeps those copies for many services under one plan, sends them to vaults in other Regions or accounts, and **Vault Lock** in compliance mode, once its grace time passes, stops anyone, even root, deleting them early.',
    qs: [
      { id: 'q1', q: 'Ransomware encrypted the files on an Amazon EFS file system an hour ago. EFS replication copies it to another Region, and AWS Backup takes a daily backup. How does the team get the original files back?', words: ['encrypted the files', 'an hour ago'],
        expl: 'The damage is bad data, not a lost machine, so the cure is a copy from before the mistake. Replication copies whatever is written, encrypted files included, within minutes; only the backup predates the attack.',
        opts: [
          { t: 'Fail over to the EFS replica in the other Region and point the instances at that copy', why: 'Replication copied the encrypted files within minutes; the replica holds them too.' },
          { t: 'Reverse the replication so that the replica copies its own files back over the source', why: 'The replica holds the same encrypted files, so failback would copy them straight back.' },
          { t: 'Pause the replication now so the replica keeps the files from before the attack began', why: 'Too late: with an RPO of 15 minutes, the encrypted files reached the replica long ago.' },
          { t: 'Restore the file system from an AWS Backup recovery point taken before the attack', ok: true, why: 'A backup is a point-in-time copy from before the mistake, so it holds the original files.' }] },
      { id: 'q2', q: 'A bucket replicates to another Region with S3 Cross-Region Replication. Using stolen credentials, an attacker permanently deletes specific object versions in the source bucket. What happens to those versions in the destination?', words: ['specific object versions', 'destination'],
        expl: 'S3 replication never replicates the deletion of a specific object version, a small protection against malicious deletes. It is still not a backup: an overwrite creates a new version, and that new version is replicated.',
        opts: [
          { t: 'They are deleted too, because replication copies every change to the source', why: 'New objects and overwrites replicate, but a version delete is never replicated.' },
          { t: 'They stay, because deleting a specific object version is never replicated', ok: true, why: 'Version deletes never replicate, which keeps the destination’s copies of them.' },
          { t: 'They stay only if delete marker replication was left at its default setting', why: 'Delete markers are a separate matter; a version delete is never replicated either way.' },
          { t: 'They stay only if the replication rule has S3 Replication Time Control on', why: 'RTC sets how fast objects replicate, not which deletes do.' }] },
      { id: 'q3', q: 'A team wants to trial AWS Backup Vault Lock on a vault, with a minimum and maximum retention, while keeping the option to remove the lock if the settings prove wrong. Which setup fits?', words: ['trial', 'option to remove the lock'],
        expl: 'Governance mode can be removed by users with the right IAM permissions, so it suits a trial. Compliance mode, once its grace time passes, cannot be changed by anyone; it is the mode to switch to after testing.',
        opts: [
          { t: 'Vault Lock in compliance mode, with the root user able to remove it if needed', why: 'After the grace time of at least 72 hours, nobody can change a compliance-mode lock, not even root.' },
          { t: 'Vault Lock in governance mode, which users with the right permissions can remove', ok: true, why: 'Governance mode is the one to test settings with; privileged users can remove it.' },
          { t: 'A vault access policy that denies deletes, which administrators edit when needed', why: 'A deny policy is not a lock: an administrator can edit it, so it is not the Vault Lock being trialled.' },
          { t: 'S3 Object Lock in governance mode on a bucket that receives the recovery points', why: 'Recovery points live in the backup vault, so the lock belongs on the vault; Object Lock guards a bucket.' }] },
      { id: 'q4', q: 'An Amazon RDS for PostgreSQL database must be restorable to any second of the last three weeks after a bad script, and managed in one place with the company’s other backups. Which design meets this?', words: ['any second', 'in one place'],
        expl: 'A bad script is bad data: the cure is a copy from before it. AWS Backup continuous backup restores RDS to a chosen second, up to 35 days back, under the same plans as the other services; replicas and standbys receive the script’s changes too.',
        opts: [
          { t: 'A cross-Region read replica that is promoted at the second before the script', why: 'A replica copies whatever is written within milliseconds to minutes, the script’s changes included.' },
          { t: 'Daily AWS Backup snapshots of the database, kept for 35 days in the vault', why: 'Snapshots kept 35 days still restore only to the moment each was taken, not to any second.' },
          { t: 'AWS Backup continuous backup for the database, retained for up to 35 days', ok: true, why: 'Continuous backup gives RDS point-in-time restore with 1-second precision, up to 35 days.' },
          { t: 'A Multi-AZ DB cluster whose readable standbys keep the data from before it', why: 'The standbys are kept in sync, so the script’s changes reach them as well.' }] }
    ]
  }
]);
