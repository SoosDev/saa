# Session data schema

A session is `sessions/NN-name/index.html` (thin shell) plus data files that all write into
`window.SESSION`, loaded in this order: `core.js`, `drills.js`, `cards.js`, `widgets.js`
(session-specific widgets, optional), `learn.js`. Then `SAA.mount(window.SESSION)`.
A tab appears only when its key exists.

| Key | Tab | Shape |
|---|---|---|
| `meta` | header | `{ id, n, title, brand, home }`. `id` namespaces localStorage (`saa:<id>:learn/check/drill/cards/ui`); never change it. |
| `lines` | map, colours | `{ id, name, short, cls, textVar?, dash?, width?, alias[], verb, from, built, says[], switch[{to,when}], misses?, update? }`. `cls` is a CSS token (`ds`, `gw`, …) or `ink`. |
| `topics` | drill/card groups | `{ id: 'Label' }` for groups that are not lines (neutral chips, never a hue). |
| `learn` | Learn | `[{ id, title, domains?, blocks[] }]` |
| `pages` | extra tabs | `[{ key, label, title, lead, blocks[] }]` (e.g. S3 classes) |
| `map` | Map | `{ title, lead, viewBox, defaultLine, caption, items[] }`. Items: SVG elements (`el`, `a`, `style`, `text`, `lines[]` = fades when another line is selected, `pick[]` = click selects) or `{ el:'line', line, paths[], labels[], extra[] }`. |
| `tree` | Where it lives | `{ title, tab, lead, start, nodes{ q, opts[{label, sub, next}] }, results{ title, text, facts[], update, whyNot[[name, why]] } }` |
| `compare` | Compare | `[{ id, short, title, sides[{name, line?, fig{dir, cache, cacheLabel, left, right, keep, dash}, gist}], rows[[label, …]], check{q, opts[], a, why} }]` |
| `cards` | Trigger cards | `[{ id, line, f, b, why, tempt, mine?, src?, update? }]` |
| `drills` | Drill | `[{ id, src, line, mine?, tag?, q, opts[{t, ok, why}], stub{slotId: value|'any'}, words[], expl, update? }]`. `words` must appear verbatim in `q`. More than one `ok` = "pick N". |
| `stub` | Drill | `[{ id, label, short, values[] }]` — the session's slots. Optional and unscored in the drill; each drill's `stub` is shown after the answer as the setter's read. |
| `traps`, `method`, `cheat`, `log` | Traps, Cheat sheet, Progress | as in `sessions/01-storage/core.js` |

## Blocks (learn chapters and pages)

`'plain paragraph'` · `{h}` · `{h3}` · `{p}` · `{ul:[]}` · `{ol:[]}` · `{table:{head, rows, key?, label?}}` ·
`{callout, kind:'update'|'miss'|'note', title?}` · `{pre, label?}` · `{hooks:[[k,v]], label?}` ·
`{check:{id?, src?, q, opts:[{t, why}], a: n|[n…], why}}` · `{widget:'name', args}` · `{pair:'compareId'}` ·
`{map:true}` · `{lines:true}` · `{link:'#tab', text, btn?}` · `{log:true}` · `{mechanics:[[title, text]]}` · `{drills:['D01']}`.

Inline markup: `**bold**`, `` `code` ``, `{lineId|Service}`, `[[#tab|link]]`, `==highlight==`.

## Widgets

Generic (engine): `sorter`, `triggerTable`, `stepper`, `chooser`.
Session widgets register on `SAA.widgets[name] = (args, ctx) => Node` and may use `SAA.h/s/md/hbars/mountChart/…`.
Charts: hand-built SVG, ink marks, recessive grid, every mark has a `data-tip` tooltip, identity by swatch + label.

## Feed (`index.html`, `assets/js/feed.js`, `bites/`)

The feed has its own content: **bites**, one pack per session in `bites/NN-name.js`, loaded by static
`<script>` tags in `index.html` after `sessions/manifest.js`. A pack only appends data to `window.SAA_BITES`
(a convention next to "session files write into `window.SESSION`"); it calls nothing. The feed loads no
session data file and reads or writes no `saa:<sessionId>:*` key.

```js
window.SAA_BITES = (window.SAA_BITES || []).concat([
  { id: 'db-which-one',          // kebab-case, unique across all packs; permanent once shipped
    sid: '08-databases',         // equals the file name; a manifest session without `soon`
    title: 'Which database for which job',
    domains: ['D3', 'D4'],       // 1-2 of D1..D4
    src: ['ch2'],                // chapters of sessions/<sid>/learn.js it restates; 'NN-name/chN' for another session
    text: '...',                 // the plain-language read, 40-90 words (lint limits 30-110)
    update: '...',               // optional "changed since the exam guide" note
    qs: [                        // 3 to 5 (3-4 in practice: five is too tall on a phone)
      { id: 'q1', q: '...', words: ['...'], expl: '...',          // q ids q1..qN, permanent once shipped
        opts: [{ t: '...', ok: true, why: '...' }, { t: '...', why: '...' }, ...] } ] }
]);
```

- Options: 4 with one `ok`, or 5 with two `ok` (multiple response, at most one per bite). Every option has a
  `why`; `words` (1-4) appear verbatim in `q`, as in drills.
- Inline markup in a bite: `**bold**` and `` `code` `` only. No `{lineId|Service}` (no session lines are loaded,
  so no line hue can appear), no `[[#tab|link]]`, no `==highlight==` (`--hl` comes only from `words` after Check).
  The stem `q` takes no markup at all, not even `**` or backticks: after Check it is drawn by `SAA.markWords`,
  which marks the `words` and prints everything else as plain text.
- Facts: every claim restates the `src` chapters, the session's `docs/session-NN-*.md` or CONTEXT §6. The ledger
  `docs/feed-bites.md` lists each bite's sources; a new fact needs a "New facts" row there with its AWS URL.
- `tools/check/bites.js` (run by `drills-lint.js` and `options.js`) enforces the shape, the markup, sources,
  digit provenance, the watchlist of renamed or retired services (they need `update`), script tags = files,
  4 bites per written session, 6 bites per exam domain, and every option within 20% of the mean length.

On screen a bite is one `article.fitem[data-key=<biteId>][data-sid]`: the head (session, domains), the read in a
card, then every question in its own card (pick, then Check; nothing revealed before Check), then the footer
(`n of m right` once all are answered; links to the source chapters and the session's drills). Order: per
session least recently seen first, sessions shuffled and taken in turn, never-seen bites first; when every bite
of the filter has been shown a marker says so and the next round starts. A stop marker every 5 bites.

The feed's keys:

- `saa:feed:bites`: `{ <biteId>: { seen: ts, q: { <qid>: { ok, n, ever, tag, at } } } }`. Question records come
  from `SAA.rec.drill` (one record definition). `seen` is set when the bite scrolls above the viewport or one of
  its questions is answered.
- `saa:feed:state`: `{ v:2, day:'YYYY-MM-DD', today:{ answered, right }, streak:{ n, last:'YYYY-MM-DD' }, domain:'all'|'D1'…'D4' }`.
  A `v:1` object (the old feed) keeps `day`, `today`, `streak` and `domain`; its `seen`, `last` and `mode`
  indexed items that no longer exist and are dropped; it is written back as `v:2` on the next save. Anything
  else starts empty. Session records the old feed wrote stay as they are; they are the sessions' own data.
