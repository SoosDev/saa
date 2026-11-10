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

## Feed (`index.html`, `assets/js/feed.js`)

The feed reads a session's existing data only; it never writes to it and adds no keys to it. It loads
`core.js`, `drills.js`, `cards.js`, `learn.js` (never `widgets.js`) one session at a time, with
`window.SESSION` reset to `{}` before each session. Session files must therefore keep writing only into
`window.SESSION` and must not call the engine at load time.

| Read | Becomes | Item key |
|---|---|---|
| `drills[]` | question | `<sid>\|drill\|<drillId>` |
| `{check}` blocks whose id does not start with `ck-` | question | `<sid>\|check\|<checkId>` |
| `compare[]` with a `check` | quick check, then the sides | `<sid>\|pair\|<pairId>` |
| `cards[]` | trigger card (only when due) | `<sid>\|card\|<cardId>` |
| `lines[]` | line card + exam says + switch lines | `<sid>\|line\|<lineId>` |
| `traps[]` | trap | `<sid>\|trap\|t<index>` |
| `{callout, kind:'update'}` blocks | update callout | `<sid>\|update\|<chapterId>.<blockIndex>` |
| `{hooks}` blocks | memory hooks | `<sid>\|hooks\|<chapterId>.<blockIndex>` |

Domains: a chapter's `domains` (`D1`–`D4`); a drill takes the domains of the chapters that list it in a
`{drills}` block or hold its `ck-` checkpoint; cards and lines take the union over drills on the same `line`,
traps over their `drills`; anything left takes the manifest entry's `domains`.

Answers write the session's own records with `SAA.rec` (one definition, shared with the session views):
`saa:<sid>:drill[<id>] = { ok, n, ever, tag, at }`, `saa:<sid>:check[<id>] = { ok, n, ever }`,
`saa:<sid>:cards[<id>] = { box, due, n, last }`.

The feed's own key, `saa:feed:state`:
`{ v:1, day:'YYYY-MM-DD', today:{ answered, right }, streak:{ n, last:'YYYY-MM-DD' }, seen:{ <itemKey>: ts }, last:{ <sid>: ts }, mode:'mix'|'questions'|'cards'|'reading', domain:'all'|'D1'…'D4' }`.
`seen` holds read items once scrolled past and questions once answered; `last` orders which session loads first.
