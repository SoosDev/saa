# Ship profile: SAA Transit Maps (SoosDev/saa)

Autoship reads this file to learn how *this* repo works. Written 2026-11-10 from the repo
itself, `gh api repos/SoosDev/saa/pages` and `gh run list`. No build step, no framework:
plain HTML/CSS/vanilla JS served by GitHub Pages.

## Branches

- integration: main (the only branch, local and remote)
- production: main (the same branch; GitHub Pages serves `main` at `/`, build_type `legacy`)
- work-on: integration directly (history is 17 linear commits straight onto main, no feature branches, no merges)
- promote: `git push origin main` (there is no separate promotion step; the push IS the deploy)

## Gate

Where autoship stops. One of:

- `commit` -- stop with changes made but nothing committed
- `integration` -- commit, push the integration branch, wait for green CI, then stop
- `production` -- go all the way, including promotion and deploy verification

gate: commit

Why `commit`: the integration branch is the production branch. Every push to main is live
at https://soosdev.github.io/saa/ about 25 seconds later, and no CI gates it. `integration`
would therefore be `production` under another name.

## Check gate

Commands run before committing. Autoship runs these itself, not only the subagent.

```
# 1. data lints, no browser (about 1 s). Both exit 1 on a problem.
cd tools/check && node drills-lint.js && node options.js

# 2. browser checks: serve the repo root, then one run per session (about 70 s each).
#    Start the server from the REPO ROOT, in the background, and kill it afterwards.
python3 -m http.server 8765        # from the repo root
cd tools/check && for s in 01-storage 02-migration 03-networking 04-global 05-security 06-governance 07-ha-dr 08-databases; do node check.js $s | tail -3; done
cd tools/check && node feed.js | tail -3     # the feed at the site root
```

Notes:
- `check.js` does NOT set an exit code. It prints `ALL PASS` or `FAILED n` on the last
  line; read that line, never `$?`.
- The site root `index.html` is the feed (`assets/js/feed.js`); the hub is `hub.html`. `feed.js` covers
  the feed (same output contract as `check.js`: read the last line). A change to `assets/js/feed.js`
  needs `node feed.js`; a change to `engine.js` or `transit.css` needs it too, alongside all eight sessions.
- `check.js` covers the hub (`hub.html`) for fonts, horizontal scroll and session cards, then one session:
  390x844 and 1440x900, light and dark, console errors, every tab and chapter, one drill
  end to end, one card rated, every checkpoint, every widget (`widgets-<session>.js`).
  A new page (anything that is not the hub or a `sessions/NN-name/` page) has NO coverage
  until the run adds a check script for it. Adding one is part of the change.
- A change to `assets/js/engine.js`, `assets/css/transit.css` or `index.html` needs all
  eight sessions run. A change inside one session needs that session plus the lints.
- Needs `tools/check/node_modules` (playwright + its chromium; present on this machine,
  git-ignored, `npm i` in `tools/check` on a fresh clone) and network access for Google
  Fonts, since the font assertion fails offline.
- Verified working on 2026-11-10: both lints exit 0 (0 flagged of 464), `check.js 01-storage` ALL PASS.
- `shots*.js` / `sbs.js` write mockup-comparison screenshots to `design/compare/` (git-ignored).
  DESIGN.md requires looking at them for any visual change; they are evidence, not an
  automated pass/fail.

## CI

- watch: `gh run list --repo SoosDev/saa --branch main --limit 3`, then `gh run watch <id> --repo SoosDev/saa --exit-status --interval 15`
- gotchas: the only workflow is GitHub's built-in `pages build and deployment` (there is no
  `.github/` directory). It publishes; it tests nothing. Green means "the files were
  uploaded", not "the site works". `.nojekyll` is present, so there is no Jekyll build to
  fail either. A broken page deploys green.

## Deploy

- triggered by: any push to `main` runs `pages build and deployment` (about 20-25 s) and publishes the repo root to https://soosdev.github.io/saa/
- health check: `curl -sSf -o /dev/null -w '%{http_code}\n' https://soosdev.github.io/saa/` for 200, then the real proof: `cd tools/check && ROOT=https://soosdev.github.io/saa/ node check.js <session>` and read the last line. Pages caches for up to 10 minutes; a check straight after the workflow can still see the old files.
- logs: none server-side (static hosting). Runtime errors surface only in the browser console, which `check.js` asserts is empty.
- ordering hazards: none on the server. One on the client: learner progress lives in each browser's `localStorage` under `saa:<sessionId>:*`. A deploy that renames a session `meta.id`, a storage key, or a drill/card/chapter/checkpoint id orphans that progress with no way to migrate it back. Treat those ids as a schema.

## Reviewers

Project agents (`.claude/agents/*.md`) that review alongside the plan-reviewer, each with
the condition under which it runs. Read-only agents only.

- none (the repo has no `.claude/agents/`, and there is no `~/.claude/agents/` either)

## Invariants

Rules the reviewer checks on every diff. Sources: `docs/CONTEXT.md`, `docs/SCHEMA.md`,
`design/DESIGN.md`, `tools/check/*`.

Stack
- Plain HTML, CSS and vanilla JS. No framework, no bundler, no npm dependency in the site, no build step. `tools/check` is the only place with a `package.json`.
- Every URL in the site is relative. It is served under the `/saa/` subpath and must also work from `python3 -m http.server` at the root; a leading-slash path breaks one of them.
- Session files only write data into `window.SESSION`; behaviour lives in `assets/js/engine.js`. Load order: `core.js`, `drills.js`, `cards.js`, `widgets.js`, `learn.js`, then `SAA.mount`.
- DOM is built with `createElement`/`textContent` (`SAA.h`/`SAA.s`). No `innerHTML` with content strings. Lesson text uses only the inline markup in SCHEMA.md.

Storage
- localStorage keys are `saa:<sessionId>:*`; every read and write is wrapped in try/catch. Nothing is sent anywhere.
- Never change an existing `meta.id`, storage key, or the id of a drill, card, chapter or checkpoint.

Design (`design/DESIGN.md` and the six mockups win over any prose)
- Every HTML page's `<head>` carries the exact three Google Fonts `<link>` lines from DESIGN.md. `document.fonts.check` must pass for `800 20px Overpass`, `16px "Atkinson Hyperlegible"`, `14px "Overpass Mono"`.
- Type roles: Overpass 800 headings and names; Overpass 600 uppercase 11-13px labels; Atkinson Hyperlegible for reading text; Overpass Mono for chips, counters, cheat sheet. Nothing else.
- Colour carries meaning only. Line hues belong to their services. Non-line tags are neutral chips. `--ok`/`--bad` only for right/wrong feedback, `--hl` only for deciding words after submit. No new hue without a session brief declaring it.
- Radius 6 / 8 / 10 (trigger card only) / 999 by role. No shadows, no gradients. Borders 1px `--rule`.
- Three-state theme: bare `:root` light, `prefers-color-scheme: dark` guarded by `:root:not([data-theme=light])`, and `[data-theme=dark]`. Every screen works in both.
- Phone (390px): no horizontal scroll, 16px gutters, tap targets at least 44px, 56px header, 72px bottom bar with 5 items.
- Charts are hand-built SVG with ink marks, a recessive grid, a `data-tip` tooltip on every mark, identity by swatch plus label, never colour alone.
- New screens reuse mockup components. Do not invent a component when an existing one fits.

Questions (`docs/CONTEXT.md` section 4; `options.js` and `drills-lint.js` enforce the measurable ones)
- All options of a question are within about 20% of each other in length; the answer is the longest option in at most about a third of a session's questions.
- Every distractor is a full, plausible design wrong in ONE detail. The deciding qualifier (MOST cost-effective, LEAST operational overhead) is stated in the stem.
- `why` and `expl` never refer to an option by letter; options are shuffled per attempt.
- Each drill's `words` appear verbatim in its `q`; every option has a `why`; stub values are chips of that session's slots.
- The stub is optional and never scored. Results are graded on the answer only.
- Recall before reveal: the learner commits to an answer before the explanation shows.

Facts (`docs/CONTEXT.md` section 6)
- Never print an AWS limit, price, date or availability claim that was not checked against current AWS docs. New or changed facts go into the CONTEXT section 6 table and the session's `docs/session-NN-*.md` with the source URL. Reusing text already in a verified session is fine; writing a new number is not.
- UI tone: plain, direct, no filler. It suggests; it never orders.

## Standing authorizations

What autoship may do without asking.

- git: `user.name` SoosDev, `user.email` from the repo's git config, picked up automatically. The remote is `https://github.com/SoosDev/saa.git`, rewritten by `url.insteadOf` to the SSH host alias `github-personal`; do not change the remote or pass a different key.
- gh: two accounts are logged in and the ACTIVE one is `SoDmitry`, not the repo owner `SoosDev`. Read-only calls (`gh run list`, `gh run watch`, `gh api repos/SoosDev/saa/pages`) worked as-is on 2026-11-10; always pass `--repo SoosDev/saa`. Do not run `gh auth switch`.
- local: starting and stopping `python3 -m http.server 8765` and running Playwright from `tools/check` are routine.
- commits: one commit per run, imperative subject, body listing what was built and which facts were verified or corrected (the convention in `git log`). No AI trailer, no `Co-Authored-By`, no "Generated with" line. Note: every commit up to 09e5a48 does carry a `Co-Authored-By: Claude ...` line, so this rule follows `/ship`, not the history. If the history is the preference, change this line.

## Never

Hard stops. The mechanical ones are also `deny` rules in `.claude/settings.json`.

- force-push, or rewrite history that is already on `origin/main` (the branch is the live site)
- change repository or GitHub Pages settings, visibility, or delete the repo
- any mutating `gh api` call
- push when this run's gate is `commit` (instruction only: a plain push is deliberately not denied, because it is the only deploy path when a task explicitly asks to deploy)
- change an existing `meta.id`, `saa:*` storage key, or drill/card/chapter/checkpoint id
- add a framework, bundler, build step, analytics, or any request that sends learner data off the device
- edit `design/mockups/*` (the approved design; the site follows them, not the reverse)
- commit `tools/check/node_modules/`, `design/compare/` or `.ship/`

## Scratch

Directory for plan files and run artifacts. Must be gitignored.

scratch: .ship/
