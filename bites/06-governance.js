/* Feed bites — Session 6, multi-account & governance. Facts: sessions/06-governance/learn.js chapters in src,
   docs/session-06-governance.md (verified 2026-09-25). Ledger: docs/feed-bites.md. */
window.SAA_BITES = (window.SAA_BITES || []).concat([
  {
    id: 'gov-scp-fence', sid: '06-governance', title: 'Organizations and SCPs: a fence, never a key', domains: ['D1'], src: ['ch3', 'ch4'],
    text: 'An **SCP** is a fence that **AWS Organizations** puts around member accounts. It marks the most that anyone inside may ever do, administrators and the account’s root user included, but it never hands out a key: a user or role still needs an IAM policy that allows the action. A Deny anywhere on the path down from the root fences in everything below it, and the **management account** always stands outside the fence.',
    update: 'Older material says SCP Allow statements may use only `"Resource": "*"` with no conditions, and allows 5 SCPs of 5,120 characters per node. SCPs support the full IAM policy language since Sept 2025, and since May 2026 each root, OU or account takes 10 SCPs of up to 10,240 characters each.',
    qs: [
      { id: 'q1', q: 'A company with AWS Organizations (all features) must make sure no member account can ever leave the organization, even when that account’s administrators or its root user try. Which solution meets this with the LEAST operational overhead?', words: ['even when', 'root user', 'LEAST operational overhead'],
        expl: 'A rule for every member account that binds admins and the root user is an SCP, and a Deny at the root reaches all of them. Boundaries and IAM policies live inside the account; a landing zone is too much for one rule.',
        opts: [
          { t: 'Add an inline IAM policy that denies leaving to the admin roles in every account', why: 'An IAM policy is set inside the account by its admins; an SCP is set from the organization and binds the root user too.' },
          { t: 'Attach an SCP at the organization root that denies organizations:LeaveOrganization', ok: true, why: 'A Deny at the root reaches every member account, and SCPs bind admins and the member root user.' },
          { t: 'Attach a permission boundary that denies leaving to every admin role in each account', why: 'A boundary caps one IAM user or role and is set inside the account; the root user is neither.' },
          { t: 'Set up AWS Control Tower over the organization and enable a control that blocks it', why: 'One guardrail in an existing organization is an SCP; a whole landing zone is far more work.' }] },
      { id: 'q2', q: 'An SCP on the Workloads OU denies a set of EC2 actions for every principal. The account’s logs later show one of those actions performed in a Workloads account by an AWS service through its service-linked role. Which statement explains this?', words: ['service-linked role'],
        expl: 'SCPs filter IAM users, roles and the member account’s root user, but they do not restrict service-linked roles, the roles AWS services use on your behalf. Inheritance, AdministratorAccess and FullAWSAccess cannot let a call past a Deny.',
        opts: [
          { t: 'The Deny must be attached at the root, because a Deny on an OU is not inherited', why: 'A Deny at any level applies to everything below it, so the OU is enough.' },
          { t: 'The service acted with AdministratorAccess, which overrides any SCP Deny statement', why: 'Even AdministratorAccess cannot exceed an SCP; that is not why the action ran.' },
          { t: 'SCPs do not restrict service-linked roles, the roles AWS services use for you', ok: true, why: 'SCPs filter users, roles and the member root user, but service-linked roles are exempt.' },
          { t: 'The OU still has FullAWSAccess attached, and its Allow overrides the Deny statement', why: 'FullAWSAccess is the default Allow that Deny statements are added to; the Deny still wins.' }] },
      { id: 'q3', q: 'A regulated OU may use only Amazon EC2, Amazon S3 and Amazon CloudWatch. Any AWS service launched in the future must stay blocked there until security approves it, and every other OU must keep access to all services. Which SCP design meets these requirements?', words: ['may use only', 'stay blocked'],
        expl: 'An Allow must exist at every level on the path. Swapping FullAWSAccess on the OU for an allow list makes every unlisted service, new ones included, impossible there. A deny list only blocks what it names.',
        opts: [
          { t: 'Keep FullAWSAccess on the OU and add an SCP that denies every other service by name', why: 'A deny list covers only the services it names, so a new service would be allowed.' },
          { t: 'Keep FullAWSAccess on the OU and add an SCP that allows only EC2, S3 and CloudWatch', why: 'FullAWSAccess at the same level still allows every service, so nothing is blocked.' },
          { t: 'Put the EC2, S3 and CloudWatch allow list on the root and FullAWSAccess on the OU', why: 'An Allow is needed at every level, so a root allow list also cuts every other OU to three services.' },
          { t: 'Replace FullAWSAccess on the OU with an SCP that allows only EC2, S3 and CloudWatch', ok: true, why: 'An allow list: anything not allowed at that level, new services included, is denied.' }] },
      { id: 'q4', q: 'An SCP at the root denies all Regions except eu-west-1. A break-glass role in each member account must still work in every Region during an incident. What change keeps the Region rule for everyone else?', words: ['break-glass role', 'everyone else'],
        expl: 'An exception to a Deny is written into the Deny itself, as a condition on aws:PrincipalArn. No Allow or admin policy lifts an inherited Deny, and the management account is outside the member accounts the role must work in.',
        opts: [
          { t: 'Attach the AdministratorAccess managed policy to the break-glass role in each account', why: 'An administrator cannot exceed an SCP, so the Region Deny still applies to the role.' },
          { t: 'Add a condition on aws:PrincipalArn to the Deny that leaves out the break-glass role', ok: true, why: 'A break-glass exception is written as an aws:PrincipalArn condition on the Deny statement.' },
          { t: 'Attach FullAWSAccess directly to every member account so its Allow covers the role', why: 'A Deny at the root applies to everything below; an Allow on the account does not lift it.' },
          { t: 'Move the break-glass role into the management account, where it reaches every Region', why: 'SCPs skip the management account, but the role has to act inside the member accounts.' }] }
    ]
  },
  {
    id: 'gov-roles-cross-account', sid: '06-governance', title: 'Roles and cross-account access', domains: ['D1'], src: ['ch6'],
    text: 'A **role** is a visitor badge that lives in the account it opens. Its **trust policy** lists who may pick it up, its permissions policies say which doors it opens, and **AWS STS** hands out temporary credentials while it is worn. Wearing the badge means leaving your own permissions at the door for that session. A **resource policy** works the other way round: the resource names you, and you keep your own permissions.',
    qs: [
      { id: 'q1', q: 'A deployment pipeline runs under a role in a tools account and must create CloudFormation stacks in three workload accounts. No long-term credentials may be stored in the pipeline. Which design meets this requirement?', words: ['three workload accounts', 'No long-term credentials'],
        expl: 'The badge lives in the account it opens: a role in each workload account, trusting the pipeline role. Cross-account, the caller also needs an identity policy allowing sts:AssumeRole. Access keys are long-term credentials.',
        opts: [
          { t: 'An IAM user with access keys in each workload account, stored as pipeline secrets', why: 'Access keys are long-term credentials, which the requirement rules out.' },
          { t: 'A role in each workload account that trusts the pipeline role, plus sts:AssumeRole', ok: true, why: 'Each role lives where it opens, and the cross-account caller also needs sts:AssumeRole.' },
          { t: 'One role in the tools account whose trust policy lists the three workload accounts', why: 'That lets the workload accounts into the tools account; the role must live in the account it opens.' },
          { t: 'A role in each workload account trusting the pipeline, with no new policy in tools', why: 'Cross-account, the caller also needs an identity policy allowing sts:AssumeRole on the role.' }] },
      { id: 'q2', q: 'A Lambda function in account A reads messages from an SQS queue in account B by assuming a role in account B. Since that change, its writes to a DynamoDB table in account A fail with AccessDenied, though they worked before. What is the cause?', words: ['assuming a role in account B', 'worked before'],
        expl: 'When you assume a role you give up your own permissions for that session. The write now goes out as the account B role, which has nothing on account A’s table. With a resource policy the function would keep its own permissions.',
        opts: [
          { t: 'The trust policy of the account B role needs an external ID before the write works', why: 'An external ID protects against the confused deputy; it grants no access to a table.' },
          { t: 'The function’s execution role lost its DynamoDB permissions when it called AssumeRole', why: 'The execution role keeps its policies; the function just stops using them while it acts as the other role.' },
          { t: 'The function needs an identity policy that allows sts:AssumeRole on the B role', why: 'The assume already works, since the reads succeed; the call that fails is the write.' },
          { t: 'It now acts as the account B role, whose permissions do not cover the DynamoDB table', ok: true, why: 'Assuming a role gives up the caller’s own permissions for that session.' }] },
      { id: 'q3', q: 'Twenty on-premises servers must upload reports to an Amazon S3 bucket. Security forbids access keys on their disks, and the company already runs its own certificate authority. Which solution meets these requirements?', words: ['on-premises servers', 'access keys on their disks', 'certificate authority'],
        expl: 'Code outside AWS that needs a role uses IAM Roles Anywhere: the server presents an X.509 certificate from a CA registered as a trust anchor and gets temporary credentials. Instance profiles are for EC2; Identity Center is for people.',
        opts: [
          { t: 'An IAM user for each server, with access keys that a script rotates every week', why: 'Rotated or not, access keys still sit on the disks, which security forbids.' },
          { t: 'An EC2 instance profile attached to each server so that it gets the role automatically', why: 'An instance profile is for EC2 instances; these servers run outside AWS.' },
          { t: 'IAM Roles Anywhere, with the company CA registered as a trust anchor for the servers', ok: true, why: 'Servers outside AWS present an X.509 certificate from the registered CA and get temporary credentials.' },
          { t: 'IAM Identity Center permission sets assigned to each server through the access portal', why: 'Identity Center is how the company’s people sign in, not code running on servers.' }] }
    ]
  },
  {
    id: 'gov-ct-orgs-ic', sid: '06-governance', title: 'Control Tower vs Organizations vs Identity Center', domains: ['D1', 'D4'], src: ['ch7', 'ch8'],
    text: '**AWS Organizations** is an office building: floors (OUs), rooms (accounts) and the house rules (SCPs). **IAM Identity Center** is its front desk, where staff sign in once and get keys to the rooms their group is assigned. **Control Tower** is the contractor who fits out a whole governed building at once (log and audit rooms, the front desk, controls) and builds every new room to plan. One new rule in a running building needs only Organizations.',
    update: 'Older material says guardrails, preventive and detective only, with a required Security OU. Today they are controls, with a third, proactive kind (CloudFormation Hooks), and landing zone 4.0 (November 2025) makes the Config, CloudTrail, Backup and security-role integrations optional and no longer requires a Security OU. Exams still describe the classic Security OU with Log Archive and Audit.',
    qs: [
      { id: 'q1', q: 'A 40-person startup with no corporate directory has an organization of six accounts. Engineers must sign in once and reach only the accounts their team uses, with temporary credentials. Which solution has the LEAST operational overhead?', words: ['sign in once', 'temporary credentials', 'LEAST operational overhead'],
        expl: 'People of the company into many accounts is Identity Center: one sign-in, a portal of assigned accounts, temporary credentials. With no IdP, its own directory holds the users. IAM users are per account, Cognito is for app customers, SCPs grant nothing. Identity Center costs nothing extra.',
        opts: [
          { t: 'IAM Identity Center with its own directory, permission sets assigned to team groups', ok: true, why: 'One sign-in and temporary credentials; the built-in directory needs no external IdP.' },
          { t: 'IAM users with passwords in each of the six accounts, grouped by team in every account', why: 'Long-term credentials, one account at a time, and six sign-ins instead of one.' },
          { t: 'An Amazon Cognito user pool for the engineers, with one group for each of the teams', why: 'Cognito user pools sign in an application’s customers; Identity Center is for the workforce.' },
          { t: 'SCPs on each team’s OU that allow the engineers into only that team’s accounts', why: 'An SCP grants nothing and signs nobody in; it only caps what principals may do.' }] },
      { id: 'q2', q: 'A company runs AWS Control Tower. The platform team wants each new account requested as a Terraform file in a Git repository, then created in the right OU with the baseline, controls and Identity Center access. Which option meets this with the LEAST operational overhead?', words: ['Terraform file in a Git repository', 'LEAST operational overhead'],
        expl: 'Account Factory creates the account in the chosen OU with the baseline, controls and Identity Center access; Account Factory for Terraform does the same from a Git repository. Plain CreateAccount leaves the baseline to you. Control Tower has no extra charge; you pay for the Config, CloudTrail and other services it sets up.',
        opts: [
          { t: 'The Account Factory console form, filled in by the platform team for each account', why: 'The same baseline, but each request is a console form, not a Terraform file in Git.' },
          { t: 'A pipeline that calls the Organizations CreateAccount API, then applies a baseline', why: 'CreateAccount gives a bare account; the baseline and controls become the team’s own work.' },
          { t: 'Identity Center permission sets kept as Terraform files and assigned from the repo', why: 'Permission sets give access to accounts that exist; they create no accounts.' },
          { t: 'Account Factory for Terraform (AFT), which turns each request file into an account', ok: true, why: 'AFT does what Account Factory does, from a Git repository where a request is a Terraform file.' }] },
      { id: 'q3', q: 'A team enabled IAM Identity Center as an account instance in one member account. It now cannot assign permission sets to the other accounts of the organization. What should a solutions architect do?', words: ['account instance', 'cannot assign permission sets'],
        expl: 'An account instance exists for a single account’s apps and cannot assign permission sets to AWS accounts. The organization instance, in the management account with administration delegated to a member, can.',
        opts: [
          { t: 'Attach an SCP to the root that allows every Identity Center action in all accounts', why: 'An SCP grants nothing; the limit here is the kind of instance, not a permission.' },
          { t: 'Use the organization instance in the management account, delegating admin to a member', ok: true, why: 'Only the organization instance assigns permission sets to the accounts.' },
          { t: 'Create the AWSReservedSSO_ roles by hand in each account and map the permission sets', why: 'Identity Center creates those roles itself from assignments, which an account instance cannot make.' },
          { t: 'Connect the corporate IdP over SAML 2.0 and SCIM so the instance reaches every account', why: 'A SAML 2.0 identity source sets where users live, not which accounts the instance can assign.' }] },
      { id: 'q4', q: 'A company with AWS Control Tower wants to see which enrolled accounts hold Amazon S3 buckets without versioning, including buckets that already exist. Nothing may be blocked. Which kind of control fits?', words: ['already exist', 'Nothing may be blocked'],
        expl: 'Detective controls are AWS Config rules: they report non-compliant resources, existing ones included, and block nothing. Preventive controls block the call; proactive ones only check templates before CloudFormation provisions them.',
        opts: [
          { t: 'A preventive control, which uses an SCP to deny creating buckets without versioning', why: 'A preventive control blocks the API call, which the requirement rules out.' },
          { t: 'A detective control, which uses AWS Config rules to report non-compliant buckets', ok: true, why: 'Detective controls report non-compliant resources and block nothing.' },
          { t: 'A proactive control, which uses a CloudFormation Hook to check buckets in templates', why: 'A Hook checks resources before CloudFormation provisions them; existing buckets go unchecked.' },
          { t: 'An Organizations tag policy, which reports buckets that lack a versioning tag value', why: 'Tag policies govern tag keys and values; versioning is a bucket setting, not a tag.' }] }
    ]
  },
  {
    id: 'gov-config-cloudtrail', sid: '06-governance', title: 'Config vs CloudTrail: what it looks like vs who did it', domains: ['D1'], src: ['ch10', 'ch2'],
    text: '**AWS Config** is the photo album of every resource: a new picture each time its settings change, a timeline to page back through, and rules that mark what breaks your standards. **CloudTrail** is the visitor book at the door: which identity called which API, and when. Neither locks the door; an SCP does that. “What did it look like?” is Config; “who did it?” is CloudTrail.',
    update: 'Older material says Config always records continuously. Since November 2023 you can choose daily recording, per resource type if you like: cheaper, but a daily snapshot misses intermediate states.',
    qs: [
      { id: 'q1', q: 'A compliance team must have every unencrypted EBS volume in an account flagged as non-compliant, including new volumes as they appear. Nothing may be blocked. Which solution meets these requirements?', words: ['flagged as non-compliant', 'Nothing may be blocked'],
        expl: 'A resource’s settings checked against a standard is Config: the recorder captures each volume and a managed rule marks it COMPLIANT or NON_COMPLIANT. CloudTrail answers who called the API; an SCP blocks; an aggregator only gathers results.',
        opts: [
          { t: 'Create a CloudTrail trail and search its log for every CreateVolume call made', why: 'CloudTrail shows who called which API, not each volume’s settings or compliance.' },
          { t: 'Attach an SCP that denies creating EBS volumes unless encryption is requested', why: 'An SCP blocks the call, which the requirement rules out, and checks no existing volume.' },
          { t: 'Record volumes with AWS Config and enable the encrypted-volumes managed rule', ok: true, why: 'Config records each volume’s settings and the rule marks the unencrypted ones NON_COMPLIANT.' },
          { t: 'Set up an AWS Config aggregator for the account and read its volume inventory', why: 'An aggregator is a read-only view of what rules report; without a rule nothing is flagged.' }] },
      { id: 'q2', q: 'Every API call in all 30 member accounts must be logged to a central bucket, and administrators in the member accounts must not be able to change or turn off that logging. Which solution meets these requirements?', words: ['Every API call', 'must not be able to change'],
        expl: 'API calls are CloudTrail’s job, and the organization trail, created in the management account or a delegated administrator, is the one member accounts cannot change. Config records configurations and compliance, not every call.',
        opts: [
          { t: 'A CloudTrail trail that the administrators of each member account create themselves', why: 'Those administrators own their trails, so they could change or stop them.' },
          { t: 'A CloudTrail organization trail created in the management account for all accounts', ok: true, why: 'An organization trail logs every account, and member accounts cannot change it.' },
          { t: 'An AWS Config recorder in every account, with an aggregator in the audit account', why: 'Config records resource configurations, not every API call made in the accounts.' },
          { t: 'An organization conformance pack of Config rules deployed to all member accounts', why: 'Members cannot change the pack, but rules check compliance; they log no API calls.' }] },
      { id: 'q3', q: 'To cut cost, a team set AWS Config to daily recording for every resource type. Security groups change several times a day, and investigators now need each of those states, while all other types stay as cheap as possible. Which change is MOST cost-effective?', words: ['each of those states', 'MOST cost-effective'],
        expl: 'A daily snapshot misses intermediate states, and recording frequency can be set per resource type. Continuous for security groups only captures every state and keeps the cheaper daily recording everywhere else.',
        opts: [
          { t: 'Switch every resource type back to continuous recording, security groups included', why: 'It captures the states, but pays for continuous recording on types that do not need it.' },
          { t: 'Keep daily recording and add a periodic Config rule that runs every hour on groups', why: 'A rule evaluates compliance; it records no extra configuration items.' },
          { t: 'Keep daily recording and use advanced queries to rebuild the states of each group', why: 'Advanced queries read recorded items; a daily snapshot never recorded the states in between.' },
          { t: 'Record security groups continuously and keep daily recording for every other type', ok: true, why: 'Frequency is set per resource type, and only continuous recording keeps every state.' }] }
    ]
  }
]);
