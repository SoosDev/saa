# SAA Transit Maps

A static study site for the **AWS Certified Solutions Architect – Associate (SAA-C03)** exam.
Every way data moves is a coloured transit line with one verb; every tab makes you commit to an
answer before it reveals one.

Live: **https://soosdev.github.io/saa/**

Plain HTML, CSS and vanilla JS. No framework, no bundler, no npm, no build step — open
`index.html` and it works. Progress lives in `localStorage` in your own browser and is never sent
anywhere.

## Layout

```
/index.html                      hub: sessions from the manifest + per-session progress
/.nojekyll                       tell GitHub Pages not to run Jekyll
/assets/css/transit.css          all styles, design tokens, both themes, print stylesheet
/assets/js/engine.js             the generic renderer — every tab, for every session
/sessions/manifest.js            window.SAA_SESSIONS = [ … ]
/sessions/01-storage/index.html  thin shell: css + engine.js + data.js, then SAA.mount()
/sessions/01-storage/data.js     window.SESSION = { … all Session 1 content … }
```

## Adding a session

Three steps, none of which touch the engine:

1. `cp -r sessions/01-storage sessions/02-migration` and replace `data.js`.
2. Add one entry to `sessions/manifest.js`:
   `{ id: '02-migration', n: 2, title: 'Migration & hybrid', domains: ['D1'], path: 'sessions/02-migration/' }`
   (drop the placeholder `soon: true` entry that is already there).
3. Nothing else. The shell `index.html` needs no edits beyond its `<title>`.

**A tab appears only if its data key is present.** A session with no `classes` key simply has no
"S3 classes" tab. The minimum viable session is `meta` plus one content key.

## `data.js` schema

`window.SESSION` is one object. Every key except `meta` is optional.

### `meta` — required
```js
meta: { id: '01-storage', n: 1, title: '…', brand: 'Storage Transit Map', subtitle: 'SAA-C03 · Session 1' }
```
`id` is the localStorage namespace (`saa:<id>:cards`, `saa:<id>:drill`) — never change it once
someone has studied the session. `brand` and `subtitle` are the header text.

### `lines` → the **Map** tab side panel, compare-card colours, drill badges
```js
{ id: 'datasync', name: 'DataSync', color: 'ds',   // color = a CSS token name, used as var(--ds)
  pattern: 'solid' | 'dashed',
  verb: 'MOVES files over the network…',           // the memory hook
  verbShort: 'moves files, then stops',            // used in compact lists
  builtFor: '…', examSays: ['migrate', 'sync'],
  from: '…', to: '…',
  switchWhen: [ { to: 'gateway', cond: 'on-prem apps must keep using the files' } ] }
```

### `topics` → filter chips and badges for drills that are not about a transit line
```js
topics: { backup: { name: 'Backups & copies', color: 't-backup' } }
```

### `map` → the **Map** tab
Declarative SVG. The engine renders `items` in order and handles highlighting: an item with
`line` dims to 0.22 when another line is selected, an item with `lines: [ids]` dims to 0.4 when the
selected line is not in its list, and an item with neither never dims.

```js
map: { viewBox: '0 0 1000 744', items: [ … ] }
```

| `type`    | keys                                                            |
|-----------|-----------------------------------------------------------------|
| `zone`    | `x y w h fill`                                                  |
| `text`    | `x y text cls anchor fill`                                      |
| `path`    | `d line w dash` — gets a 24 px invisible hit-stroke if it has a `line` |
| `station` | `x y r` or `shape:'square' w h` · `name sub tx anchor stroke lines` |
| `box`     | `x y w h rx text tcolor line`                                   |
| `pill`    | `x y w h rx fill` — an interchange, never dimmed                |
| `label`   | `x y text line color sub:{x,y,text}` — clickable and focusable   |

`cls` values the stylesheet provides: `mzone` `mstat` `mstat2` `msub` `mfoot` `mlabel`.

### `tree` → the **Where it lives** tab
```js
tree: { root: 'q1', nodes: {
  q1:    { q: 'What does the application expect?', options: [ { label: '…', next: 'q_disk' } ] },
  r_gp3: { result: { service: 'EBS gp3', why: '…',
                     facts: ['ebs'],                       // keys into `facts`
                     neighbours: [ { svc: 'gp2', why: '…' } ],
                     link: { text: 'Pick a class →', tab: 'classes' } } }
} }
```
A node has either `q` + `options` or `result`. Arbitrary depth; the breadcrumb is built from the
path taken and every crumb is clickable to go back.

### `facts` → fact cards shown under a tree result
```js
facts: { ebs: { title: 'EBS — what the exam tests', bullets: ['…'] } }
```

### `classes` → the **S3 classes** tab (picker + lifecycle builder)
The picker is generic: it evaluates declarative constraints on each row, in this order, and the
first one that fails becomes that row's "loses because" line. The cheapest survivor (lowest
`cost`) wins.

```js
classes: {
  accessOptions:    [ { v: 'frequent', label: 'frequent' }, … ],   // ranks: frequent unknown monthly quarterly yearly audit
  retrievalOptions: [ { v: 'ms', label: 'milliseconds' }, … ],     // ranks: ms minutes hours h12 h48
  retentionOptions: [ { v: 30, label: '30 d' }, … ],
  rows: [ {
    id, name, azs, examSays,
    minDays: 30,           // eliminated if retention < minDays
    retrievalRank: 0,      // eliminated if retrievalRank > what the user asked for
    singleAZ: true,        // eliminated unless the data is re-creatable
    forUnknown: true,      // only survives when access === 'unknown'; others only when it isn't
    accessMin: 2, accessMax: 3,   // access-frequency band this class is economical for
    cost: 4,               // relative storage price; lowest surviving row wins
    nicheOnly: '…',        // always loses, with this sentence as the reason
    lifecycleTarget: true, // offered as a transition in the lifecycle builder
    winBecause: '…'        // shown when it wins
  } ],
  rules: ['…']
}
```
The lifecycle builder validates each transition against that row's `minDays` and against the
previous transition's day.

### `pairs` → the **Compare** tab
```js
{ id: 'p1', short: 'DataSync vs S3 File Gateway', title: '…',
  a: { name, color, job, words, lands, tempting,
       mini: { left, right, leftSub, rightSub, dir: 'one'|'both', cache: true, dashed: true, note } },
  b: { … },
  both: 'Can both be right? …',
  check: { q: '…', options: [ { label, ok: true, why } ], explain: '…' } }
```
`mini` drives a generated two-box diagram — no hand-drawn SVG per pair.

### `cards` → the **Trigger cards** tab (Leitner boxes 1→5)
```js
{ id: 'c01', line: 'datasync', mine: true,
  front: 'the exam phrase', service: 'AWS DataSync', why: '…',
  tempting: { answer: 'Storage Gateway', why: 'a bridge, not a mover.' } }
```
`id` is the spaced-repetition key — stable ids are what let you edit prose without resetting
someone's boxes. Intervals: box 1 daily, 2 every 2 days, 3 every 4, 4 every 8, 5 = known.
Missed → box 1. Hesitated → stays. Knew it → +1. `mine: true` feeds the "Only my misses" mode.

### `drills` → the **Drill** tab
```js
{ id: 'D01', ref: 'quiz Q1', mine: true, line: 'gateway', multi: false, tag: 'K',
  text: 'the scenario',
  options: [ { id: 'a', label: 'verbatim option text', ok: false, rk: 'proto', why: '…' } ],
  stub: { size: 'any', time: 'ongoing', proto: 'NFS/SMB', sup: 'least ops' },
  deciding: ['Windows', 'SMB'],        // highlighted in the scenario AFTER submission only
  explain: 'the teaching point' }
```
`multi: true` means "Select TWO" and expects exactly two `ok` options. `stub` values must come
from `stubChoices` (or be the literal `'any'`, which accepts anything). `rk` is the strongest
elimination reason for a wrong option — `size` `time` `proto` `sup` `job` `false` — and the engine
tells the user when their crossing-out reason was weaker. `tag` is the suggested error tag
(F fact · C confused · K keyword · R misread · A reasoning · L limit).

### `stubChoices` → the chips offered for each stub slot
```js
stubChoices: { size: [...], time: [...], proto: [...], sup: [...] }
```

### `traps` → the **Traps** tab
```js
{ title: 'Gateway for migration', text: '…', drills: ['D07', 'D10'] }
```
Each drill id becomes a button that jumps straight to that scenario.

### `method` → the collapsible reduction method at the top of the Drill tab
```js
method: ['Strip the story…', 'Fill the stub…', …]
```

### `cheat` → the **Cheat sheet** tab
One preformatted string. The print stylesheet strips the chrome and fits it on A5.

## Design system

Tokens live in a bare `:root` in `transit.css` (light), are redefined under
`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` and again under
`:root[data-theme="dark"]`. The header toggle cycles system → light → dark and stores the choice.
Fonts: Overpass (display/UI), Atkinson Hyperlegible (body), Overpass Mono (chips, stubs, cheat
sheet). Touch targets are ≥44 px, focus rings are visible, and `prefers-reduced-motion` is
respected.

Line colours are tokens, referenced from data by name: `--ds` DataSync, `--gw` Storage Gateway,
`--tf` Transfer Family, `--dtt` DTT/Snow, `--dms` DMS, `--mgn` MGN. Topic accents are `--t-backup`,
`--t-where`, `--t-classes`, `--t-edge`.

## Conventions the engine relies on

- **No `innerHTML` with content.** Every node is built with `createElement`/`textContent` via the
  `h()` and `s()` helpers. Content is ours, but the habit stays.
- **All `localStorage` access is wrapped in try/catch.** The site works with storage disabled or
  full; you just lose progress between visits.
- **Tab state lives in the URL hash** (`#drill`), so tabs deep-link and the back button works.

## Facts

Session 1 content was verified against the AWS documentation on 2026-09-24. Where the source
material had gone stale — S3 Express One Zone's minimum storage duration, DataSync's supported
destination classes, Snow Family availability, AWS Backup's VMware scope, gp3 and io2 Block
Express ceilings — the data reflects the current docs. See the commit message for the list.
