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
| `stub` | Drill | `[{ id, label, short, values[] }]` — the session's slots. |
| `traps`, `method`, `cheat`, `log` | Traps, Cheat sheet, Progress | as in `sessions/01-storage/core.js` |

## Blocks (learn chapters and pages)

`'plain paragraph'` · `{h}` · `{h3}` · `{p}` · `{ul:[]}` · `{ol:[]}` · `{table:{head, rows, key?, label?}}` ·
`{callout, kind:'update'|'miss'|'note', title?}` · `{pre, label?}` · `{hooks:[[k,v]], label?}` ·
`{check:{id?, src?, q, opts:[{t, why}], a: n|[n…], why}}` · `{widget:'name', args}` · `{pair:'compareId'}` ·
`{map:true}` · `{lines:true}` · `{link:'#tab', text, btn?}` · `{log:true}` · `{mechanics:[[title, text]]}` · `{drills:['D01']}`.

Inline markup: `**bold**`, `` `code` ``, `{lineId|Service}`, `[[#tab|link]]`, `==highlight==`.

## Widgets

Generic (engine): `sorter`, `stubTrainer`, `triggerTable`, `stepper`, `chooser`.
Session widgets register on `SAA.widgets[name] = (args, ctx) => Node` and may use `SAA.h/s/md/hbars/mountChart/…`.
Charts: hand-built SVG, ink marks, recessive grid, every mark has a `data-tip` tooltip, identity by swatch + label.
