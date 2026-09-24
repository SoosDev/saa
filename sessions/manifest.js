/* One entry per session. Adding a session = one entry here + sessions/<id>/{index.html,data.js}. */
window.SAA_SESSIONS = [
  { id: '01-storage', n: 1, title: 'Storage & Data Movement', domains: ['D1', 'D2', 'D3', 'D4'], path: 'sessions/01-storage/' },

  /* Sessions 2–13 — add data.js + flip `soon` off when built. */
  { id: '02-migration',   n: 2,  title: 'Migration & hybrid',               soon: true },
  { id: '03-networking',  n: 3,  title: 'Networking & connectivity',        soon: true },
  { id: '04-global',      n: 4,  title: 'Global architecture & edge',       soon: true },
  { id: '05-security',    n: 5,  title: 'Security services & identity',     soon: true },
  { id: '06-governance',  n: 6,  title: 'Multi-account & governance',       soon: true },
  { id: '07-ha-dr',       n: 7,  title: 'HA & disaster recovery',           soon: true },
  { id: '08-databases',   n: 8,  title: 'Databases & caching',              soon: true },
  { id: '09-serverless',  n: 9,  title: 'Serverless, events & analytics',   soon: true },
  { id: '10-compute',     n: 10, title: 'Compute & scaling',                soon: true },
  { id: '11-monitoring',  n: 11, title: 'Monitoring & operations',          soon: true },
  { id: '12-cost',        n: 12, title: 'Cost & purchasing',                soon: true },
  { id: '13-integration', n: 13, title: 'Integration drill',                soon: true }
];
