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
/index.html                  hub: diagnosis, exam, knowledge map, method, sessions (from sessions/manifest.js)
/assets/css/transit.css      tokens + both themes + every component
/assets/js/engine.js         generic engine: chrome, router, learn, map, tree, compare, cards, drill, traps, cheat, progress, charts, widgets
/sessions/manifest.js        sessions list + hub content
/sessions/NN-name/           index.html (thin shell) + core.js, drills.js, cards.js, widgets.js, learn.js
/design/                     approved mockups + DESIGN.md (compare/ is git-ignored screenshots)
/docs/                       CONTEXT.md (the brief), SCHEMA.md, session briefs
```

See `docs/SCHEMA.md` for the data format and `docs/CONTEXT.md` §9 for the per-session workflow.
