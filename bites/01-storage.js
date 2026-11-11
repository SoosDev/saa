/* Feed bites — Session 1, storage & data movement. Facts: sessions/01-storage/learn.js chapters in src,
   docs/session-01-storage.md (verified 2026-09-24). Ledger: docs/feed-bites.md. */
window.SAA_BITES = (window.SAA_BITES || []).concat([
  {
    id: 'st-block-file-object', sid: '01-storage', title: 'Block, file, object: EBS vs EFS vs S3', domains: ['D3', 'D4'], src: ['ch3', 'ch5', 'ch6'],
    text: 'Storage comes in three shapes, like the rooms of an office: **block** (EBS) is the drawer in one desk, a raw disk that one server plugs in and formats, where a database keeps its files. **File** (EFS, FSx) is the shared cabinet, a network folder many servers mount at once; **object** (S3) is the mailroom, taking whole parcels in and out by label over HTTP, with no mounting and no edits in place. What the application expects picks the shape, not what sounds modern.',
    qs: [
      { id: 'q1', q: 'A self-managed database engine runs on one EC2 instance. It expects a disk it can format with its own file system for its data files, and the data must survive a stop of the instance. Which storage fits?', words: ['expects a disk', 'survive a stop'],
        expl: 'One server that wants a disk to format is the block shape, and EBS is the block storage that outlives the instance. Instance store is a disk too but dies with the box; EFS and S3 are the other two shapes.',
        opts: [
          { t: 'An EBS gp3 volume attached to the instance and formatted by the engine', ok: true, why: 'A raw disk one server plugs in and formats, and it persists independently of the instance.' },
          { t: 'An instance store volume on the same instance, formatted by the engine', why: 'A disk, but instance store “dies with the box”: it is scratch space that does not survive.' },
          { t: 'An EFS file system mounted on the instance over NFS for the data files', why: 'A shared network folder, not a raw disk the engine can format with its own file system.' },
          { t: 'An S3 bucket that holds each data file as an object the engine reads', why: 'Objects are never mounted or edited in place, so there is no disk for the engine to format.' }] },
      { id: 'q2', q: 'A Linux content management system runs on EC2 instances in an Auto Scaling group across two Availability Zones. Each instance writes user uploads to a local directory, so the other instances cannot see them. Which solution lets every instance see every upload, with no change to the CMS code?', words: ['across two Availability Zones', 'no change to the CMS code'],
        expl: 'Many Linux servers in several AZs sharing one directory is the file shape: EFS over NFS, mounted where the code already writes. Multi-Attach stays inside one AZ, S3 needs code that PUTs and GETs objects, and FSx for Windows speaks SMB.',
        opts: [
          { t: 'Mount one Amazon EFS file system at the uploads directory on every instance', ok: true, why: 'A shared NFS folder for Linux across AZs; the code keeps writing to the same path.' },
          { t: 'Attach one EBS io2 volume with Multi-Attach to every instance in the group', why: 'Multi-Attach works in one AZ only and needs a cluster-aware file system.' },
          { t: 'Store each upload as an object in one S3 bucket that every instance can read', why: 'Shared, but S3 has no mounting: the CMS code would have to PUT and GET objects.' },
          { t: 'Mount one FSx for Windows File Server share at the uploads directory on each', why: 'A Windows file server that speaks SMB; the Linux fleet expects an NFS mount.' }] },
      { id: 'q3', q: 'A video team’s editing tool rewrites small ranges in the middle of 50 GB project files many times a minute. A developer proposes keeping the projects in an S3 bucket instead of on EBS volumes. What is the flaw in that proposal?', words: ['rewrites small ranges', 'in the middle'],
        expl: 'Object storage has no partial edits: you PUT and GET whole objects. Small in-place writes are what a block disk is for. The size and consistency objections are false: objects go to 50 TB, and reads after a write are strongly consistent.',
        opts: [
          { t: 'S3 has no partial edits, so every small change rewrites the whole object', ok: true, why: 'Objects are PUT and read whole; small in-place writes are the block shape’s job.' },
          { t: 'S3 objects are limited to 5 GB, so a 50 GB project file cannot be stored', why: 'Objects go up to 50 TB; multipart upload is required over 5 GB, not ruled out.' },
          { t: 'S3 reads are eventually consistent, so the tool may read an older version', why: 'S3 gives strong read-after-write consistency: a read after a write returns new data.' },
          { t: 'S3 must be mounted over NFS first, which adds latency to every single edit', why: 'S3 is never mounted; objects travel over HTTP, which is why there are no partial edits.' }] },
      { id: 'q4', q: 'A database on one EC2 instance writes a dump every night. The dumps are written once, restored rarely, and must survive the loss of the Availability Zone where the instance runs. Where should the dumps go?', words: ['written once', 'loss of the Availability Zone'],
        expl: 'Backups want objects, and S3 Standard keeps them beyond one AZ. EBS is bound to one AZ, EFS One Zone sits in one AZ by design, and instance store dies with its instance.',
        opts: [
          { t: 'Upload each dump as an object to an S3 bucket in the S3 Standard class', ok: true, why: 'Backups are the object shape, and only the One Zone classes keep data in a single AZ.' },
          { t: 'Write each dump to a second EBS gp3 volume attached to the same instance', why: 'EBS is bound to one AZ and replicates only inside it, so the AZ loss takes it too.' },
          { t: 'Write each dump to an EFS One Zone file system mounted on the instance', why: 'One Zone keeps the file system in a single AZ, the one that would be lost.' },
          { t: 'Copy each dump to the instance store volume of a second EC2 instance', why: 'Instance store dies with its instance, and that instance can sit in the same AZ.' }] }
    ]
  },
  {
    id: 'st-s3-classes', sid: '01-storage', title: 'S3 storage classes, hot to frozen', domains: ['D4', 'D3'], src: ['ch6'],
    text: 'S3 classes are rooms from the kitchen counter to a storage unit across town: **Standard** for data read often, the **IA** classes for data read now and then but needed back in milliseconds, **Glacier Instant** for rare reads still in milliseconds, **Glacier Flexible** when minutes to hours will do, and **Deep Archive**, the cheapest, when half a day is fine. The colder the room, the cheaper the rent and the longer the minimum stay. Unknown habits go to **Intelligent-Tiering**; data you can re-create may sit in **One Zone-IA**.',
    qs: [
      { id: 'q1', q: 'Signed contracts scanned years ago must be kept for eight more years. Auditors open a few of them once a year and accept waiting until the next day. Which storage class has the LOWEST storage cost?', words: ['until the next day', 'LOWEST storage cost'],
        expl: 'Read about once a year, and a next-day wait is fine: that is the coldest room. Deep Archive is the cheapest class, and its standard retrieval comes back within 12 hours.',
        opts: [
          { t: 'S3 Glacier Flexible Retrieval, with Bulk retrievals for each audit request', why: 'Bulk takes 5–12 hours, which fits, but Flexible costs more to keep than Deep Archive.' },
          { t: 'S3 Glacier Deep Archive, with standard retrievals for each audit request', ok: true, why: 'The cheapest class; a standard retrieval within 12 hours fits a next-day wait.' },
          { t: 'S3 Glacier Instant Retrieval, so each requested contract opens at once', why: 'Millisecond reads the auditors do not need, at a higher storage price than Deep Archive.' },
          { t: 'S3 Standard-IA, with a lifecycle rule that expires each contract later', why: 'Built for data read now and then in milliseconds; dearer to keep than any Glacier class.' }] },
      { id: 'q2', q: 'A machine-learning team trains on EC2 instances in one Availability Zone. Each epoch reads millions of small objects at very high request rates and needs single-digit millisecond latency. The objects are a copy; the master data stays in another bucket. Which storage class meets the latency requirement?', words: ['single-digit millisecond', 'one Availability Zone'],
        expl: 'Single-digit milliseconds is the job S3 Express One Zone is built for, and it lives in one AZ next to the compute. Losing that AZ is acceptable here because the master copy is elsewhere.',
        opts: [
          { t: 'S3 Standard, which keeps the copy across several Availability Zones', why: 'Milliseconds, but single-digit-millisecond latency is the job of Express One Zone.' },
          { t: 'S3 One Zone-IA, which keeps the copy in the training instances’ zone', why: 'One AZ, but an IA class is built for infrequent reads, not reads every epoch.' },
          { t: 'S3 Intelligent-Tiering, which keeps hot objects in its frequent tier', why: 'Built for unknown or changing access patterns, not single-digit milliseconds.' },
          { t: 'S3 Express One Zone, in the same Availability Zone as the instances', ok: true, why: 'One AZ and single-digit milliseconds; the master copy covers the AZ risk.' }] },
      { id: 'q3', q: 'Rendered map tiles sit in S3 One Zone-IA because they can be regenerated. The team adds a lifecycle rule to move tiles older than 120 days to S3 Glacier Instant Retrieval, and the transition is not supported. Which statement explains why?', words: ['One Zone-IA', 'not supported'],
        expl: 'Lifecycle moves objects down the waterfall, but not every downward step exists: from One Zone-IA the only moves are to Glacier Flexible Retrieval or Deep Archive. Minimum durations charge for leaving early; they never block an object from arriving.',
        opts: [
          { t: 'Objects must spend 30 days in Standard before any lifecycle move at all', why: 'The 30-day rule covers the move into an IA class; these tiles already left Standard.' },
          { t: 'Glacier Instant has a 90-day minimum, so older tiles cannot enter it', why: 'The 90-day minimum charges for leaving early; it does not stop objects arriving.' },
          { t: 'One Zone-IA can move only to Glacier Flexible Retrieval or Deep Archive', ok: true, why: 'That is the one restricted step in the waterfall, and Glacier Instant is not on it.' },
          { t: 'Lifecycle rules never move objects out of a single-AZ storage class', why: 'One Zone-IA objects can move on, but only to Glacier Flexible or Deep Archive.' }] }
    ]
  },
  {
    id: 'st-efs-fsx', sid: '01-storage', title: 'EFS and the four FSx', domains: ['D3', 'D2'], src: ['ch5'],
    text: 'A shared file system is a cabinet many servers open at once, and the key the clients already carry picks the cabinet: **EFS** for Linux over NFS, growing by itself; **FSx for Windows** for SMB with Active Directory; **FSx for Lustre** for HPC and ML jobs that pull their files from S3; **FSx for ONTAP** for NetApp shops serving NFS, SMB and iSCSI from one file system; **FSx for OpenZFS** for ZFS over very low-latency NFS. The operating system and one protocol word decide; the rest is detail.',
    qs: [
      { id: 'q1', q: 'An office moves its Windows users’ home directories to AWS. The shares must keep SMB access, NTFS permissions and the existing Active Directory groups. Which solution meets these requirements with the LEAST operational overhead?', words: ['SMB access', 'Active Directory groups', 'LEAST operational overhead'],
        expl: 'Windows, SMB, AD and home directories are the triggers for FSx for Windows File Server, a managed Windows file server. EFS and OpenZFS speak NFS; Lustre is the HPC file system.',
        opts: [
          { t: 'Amazon FSx for Windows File Server joined to the existing AD domain', ok: true, why: 'A managed Windows file server: SMB, NTFS ACLs, AD, home directories.' },
          { t: 'Amazon EFS with POSIX permissions mapped to the Active Directory groups', why: 'EFS is NFS for Linux; there is no SMB and no NTFS permission model.' },
          { t: 'Amazon FSx for OpenZFS with NFS exports for each user’s home directory', why: 'ZFS over NFS; the Windows clients and their SMB shares have no place here.' },
          { t: 'Amazon FSx for Lustre linked to an S3 bucket that holds the directories', why: 'A parallel file system for HPC and ML on Linux, not Windows home shares.' }] },
      { id: 'q2', q: 'A company will run FSx for Windows File Server for its EC2 application servers. All users and groups live in the company’s self-managed Active Directory on premises, reached over a VPN. Which design lets the file system use those identities?', words: ['self-managed Active Directory'],
        expl: 'FSx for Windows joins AWS Managed Microsoft AD or your self-managed AD. It does not work through AD Connector, a proxy that is not compatible with it. OpenZFS and EFS have no AD-joined SMB shares.',
        opts: [
          { t: 'Join FSx for Windows File Server to an AD Connector for the on-prem domain', why: 'AD Connector is a proxy only, and it is not compatible with FSx for Windows.' },
          { t: 'Join FSx for Windows File Server directly to the self-managed on-prem domain', ok: true, why: 'FSx for Windows joins your self-managed AD (or AWS Managed Microsoft AD).' },
          { t: 'Use FSx for OpenZFS instead and join its shares to the on-prem AD domain', why: 'OpenZFS serves ZFS over NFS; it is not the AD-joined SMB file server.' },
          { t: 'Use Amazon EFS instead and map its access points to the on-prem AD users', why: 'EFS is NFS for Linux with POSIX permissions, not an AD-joined SMB share.' }] },
      { id: 'q3', q: 'An ML platform trains models every day for months on data in an S3 bucket and needs a high-throughput parallel file system. The file system must keep its data if a file server fails, without reloading it from S3. Which file system meets these requirements?', words: ['every day for months', 'if a file server fails'],
        expl: 'High-throughput parallel access to S3 data is FSx for Lustre. Scratch is temporary and has no replication; Persistent is replicated within one AZ and built for longer-running work.',
        opts: [
          { t: 'FSx for Lustre with a Scratch file system that lazy-loads from the bucket', why: 'Scratch is temporary and not replicated, so a failed server loses its data.' },
          { t: 'FSx for Lustre with a Persistent file system that is linked to the bucket', ok: true, why: 'Persistent is replicated within one AZ and built for longer-running work.' },
          { t: 'Amazon EFS with Elastic throughput, mounted on every training instance', why: 'Shared and Regional, but EFS is not the parallel file system for HPC and ML.' },
          { t: 'FSx for OpenZFS with snapshots taken daily and copied back to the bucket', why: 'Low-latency NFS, but not the parallel file system that links to S3 data.' }] },
      { id: 'q4', q: 'Linux servers must reach a dataset over NFS while Windows servers reach the same files over SMB, and two database hosts need iSCSI LUNs. Which solution serves all three protocols from one managed service?', words: ['same files', 'iSCSI LUNs', 'one managed service'],
        expl: 'NFS, SMB and iSCSI from the same file system is FSx for NetApp ONTAP, even when the word NetApp is missing. Every other option covers only one protocol or splits the data into copies.',
        opts: [
          { t: 'FSx for Windows File Server with SMB shares for both kinds of server', why: 'SMB only: no NFS for the Linux servers and no iSCSI LUNs for the hosts.' },
          { t: 'Amazon EFS for the Linux side, synced by DataSync to FSx for Windows', why: 'Two services and two copies of the files, and still no iSCSI for the hosts.' },
          { t: 'FSx for NetApp ONTAP serving NFS, SMB and iSCSI from one file system', ok: true, why: 'Multi-protocol from the same file system is what ONTAP is built for.' },
          { t: 'FSx for OpenZFS with NFS exports for all servers and every database', why: 'ZFS over NFS only; the Windows SMB clients and iSCSI hosts are left out.' }] }
    ]
  },
  {
    id: 'st-moving-data', sid: '01-storage', title: 'Moving data: DataSync vs Storage Gateway vs Transfer Family', domains: ['D3', 'D4'], src: ['ch7', 'ch8', 'ch9'],
    text: 'Three services carry files between your site and AWS: **DataSync** is the moving van that copies data across, once or on a schedule, verifies it and is done. **Storage Gateway** is the bridge: on-premises applications keep using the share, volume or tape library they know, while the real data lives in AWS behind a local cache; **Transfer Family** is the front desk where outside parties drop files over SFTP, FTPS, FTP or AS2, with no servers to run. Whether data leaves, stays in use, or arrives from others decides.',
    qs: [
      { id: 'q1', q: 'Lab instruments write result files to an on-premises NFS share all day and must keep writing to it. Each night the new files must be copied to an S3 bucket for analysis. Which approach has the LEAST operational overhead?', words: ['keep writing to it', 'Each night', 'LEAST operational overhead'],
        expl: 'Copying files on a schedule from a share that stays where it is, is the mover’s job: DataSync runs scheduled tasks and copies only what changed after the first run. A gateway or a front desk would make the instruments write somewhere new.',
        opts: [
          { t: 'A DataSync agent reading the NFS share, with a nightly scheduled task to S3', ok: true, why: 'Scheduled, incremental after the first run, verified; the share stays as it is.' },
          { t: 'An S3 File Gateway NFS share that the instruments are repointed to write to', why: 'A bridge; the instruments would stop writing to the share they must keep using.' },
          { t: 'A Transfer Family SFTP endpoint that the instruments upload each file to', why: 'A door for outside parties; the instruments would need new upload tooling.' },
          { t: 'A nightly script on an on-prem server that runs an S3 copy of the NFS share', why: 'It works, but you write, run and watch the script, without built-in verification.' }] },
      { id: 'q2', q: 'Video editors write finished renders to an on-premises NFS mount. The NAS behind it is being retired, editors must keep an NFS mount with fast access to recent renders, and every render must be stored as an object in Amazon S3. Which solution meets these requirements?', words: ['being retired', 'keep an NFS mount', 'stored as an object'],
        expl: 'On-prem users keep a protocol they know while the data lives in S3: that is the bridge, S3 File Gateway, with its local cache for recent files. DataSync needs a source that stays; Volume Gateway speaks iSCSI blocks.',
        opts: [
          { t: 'A DataSync task that copies new renders from the NAS to S3 every night', why: 'A mover needs the NAS as its source, and the NAS is being retired.' },
          { t: 'An S3 File Gateway NFS share, with its local cache for recent renders', ok: true, why: 'NFS on-prem, objects in S3, recent data cached locally: the bridge.' },
          { t: 'A Volume Gateway with cached volumes that keep the recent renders local', why: 'Speaks iSCSI blocks, not an NFS share, and holds volumes, not files.' },
          { t: 'A Transfer Family SFTP endpoint that stores each render in the S3 bucket', why: 'Objects in S3, but editors get an upload door, not a mount or a cache.' }] },
      { id: 'q3', q: 'A bank’s business customers send statement files from their own systems over SFTP to a server the bank runs on EC2. The bank wants to retire that server, keep the customers’ SFTP clients unchanged, and land the files in Amazon EFS for a Linux batch job. Which solution meets these requirements?', words: ['retire that server', 'SFTP clients unchanged', 'Amazon EFS'],
        expl: 'Outside parties pushing files over SFTP is the front desk: Transfer Family runs the endpoint, stores the files in S3 or EFS, and leaves no server to manage. DataSync and gateways sit at sites you control.',
        opts: [
          { t: 'A Transfer Family SFTP server that stores incoming files in Amazon EFS', ok: true, why: 'Managed SFTP that writes to S3 or EFS; customers keep their clients.' },
          { t: 'A DataSync agent at each customer site copying its files into Amazon EFS', why: 'An agent per customer is not something the bank can install everywhere.' },
          { t: 'An S3 File Gateway at each customer with its share synced to Amazon EFS', why: 'A bridge for your own on-prem apps, and it stores objects in S3, not EFS.' },
          { t: 'The SFTP server on EC2 in an Auto Scaling group that writes to Amazon EFS', why: 'Still a server the bank runs, which is what it wants to retire.' }] },
      { id: 'q4', q: 'Every week the contents of an Amazon EFS file system must be copied to an S3 bucket in the same Region for analytics. Which approach has the LEAST operational overhead?', words: ['every week', 'LEAST operational overhead'],
        expl: 'A scheduled copy is the mover’s job, and between AWS services DataSync needs no agent at all. Running an agent or a script on EC2 adds a machine to look after.',
        opts: [
          { t: 'A DataSync agent on an EC2 instance, with a weekly task from EFS to S3', why: 'It works, but no agent is needed between AWS services; the instance is extra.' },
          { t: 'A weekly script on an EC2 instance that mounts EFS and copies it to S3', why: 'It works, but you run the instance and the script, with no built-in verification.' },
          { t: 'A DataSync task from EFS to S3 on a weekly schedule, with no agent', ok: true, why: 'AWS to AWS needs no agent; scheduled, incremental and verified.' },
          { t: 'An S3 File Gateway on an EC2 instance that exposes the bucket to the EFS', why: 'A bridge for on-prem applications, and an extra machine for an AWS copy.' }] }
    ]
  }
]);
