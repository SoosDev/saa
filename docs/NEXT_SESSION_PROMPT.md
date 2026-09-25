# Prompt for a fresh Claude Code session

Paste everything below the line into a new session opened in this repo.

---

You are continuing work on **SAA Transit Maps** (https://soosdev.github.io/saa/). It is a study site for the
AWS Certified Solutions Architect – Associate exam (SAA-C03), built for one learner. It is plain HTML/CSS/vanilla JS
with no build step, served by GitHub Pages from `main`. Remote: `git@github-personal:SoosDev/saa.git`.
Commit attribution: end commit messages with `Co-Authored-By: Claude …` as your harness instructs.

## Read before touching anything, in this order
1. `docs/CONTEXT.md`. It covers the learner and his diagnosis, the reduction method, the verified-facts table in §6,
   the design rules in §7, the architecture in §8 and the per-session workflow in §9. It is the source of truth.
2. `design/DESIGN.md` and all six `design/mockups/*.html`. The mockups win over any text.
3. `docs/SCHEMA.md`, the data format the engine renders.
4. The most recent complete session: `docs/session-05-security.md` and all of `sessions/05-security/*.js`.
   Copy its structure, depth and tone. `sessions/04-global/` is the other reference.
5. `tools/check/README.md`, the Playwright check harness.

Don't ask the user to re-explain context. It's all in those files.

## Current state (2026-09-25)
| # | Session | Status | Totals (chapters / drills / cards) |
|---|---|---|---|
| 1 | Storage & data movement | live | 12 / 42 / 52 |
| 2 | Migration & hybrid | live, facts re-verified via AWS MCP | 10 / 30 / 40 |
| 3 | Networking & connectivity | live | 12 / 30 / 40 |
| 4 | Global architecture & edge | live | 12 / 30 / 40 |
| 5 | Security services & identity | live | 12 / 30 / 40 |
| 6–13 | see CONTEXT §5 and `sessions/manifest.js` (`soon: true`) | not built | — |

**Next up: Session 6, Multi-account & governance.** It covers Organizations, SCPs, IAM Identity Center, Control
Tower, RAM and Config (plus the IAM policy mechanics Session 5 left as boundaries); the §5 weight is D1 ●● D4 ●.
Then 7, 8 … 13, in the order in CONTEXT §5.

**Open items**
- Session 2 quiz M1–M6 and S7 has no answers recorded yet. When the learner reports them, set `mine: true` and
  `tag` on the missed drills in `sessions/02-migration/drills.js` and add a `log` entry in `core.js`.
- Sessions 3, 4 and 5 also have "not taken yet" log entries. Update them the same way when results arrive.
- Three facts rest on web or SDK sources, not the AWS MCP docs: SMS dates, the EKS Anywhere provider removals, and
  OpsWorks EOL. Re-check them if the MCP docs ever cover them.

## Workflow for each new session (CONTEXT §9, as it is actually done)
1. **Verify facts with the AWS MCP server.** Load the tools with ToolSearch
   `select:mcp__aws-mcp__aws___search_documentation,mcp__aws-mcp__aws___read_documentation`.
   Every number, limit, date and "no longer available" claim gets a doc URL. Where current docs differ from older
   course material, add a "Changed since the exam guide" callout and a row in the brief's change table.
   Never print a limit you didn't verify. Spot-check anything surprising yourself, even when a subagent reports it.
   Lambda@Edge quotas and the regional NAT gateway were both surprising and both turned out true.
2. **Write the brief** `docs/session-NN-name.md`, in the same shape as `session-05-security.md`. It holds:
   - colour rule and declared colours, domains
   - facts with URLs and the change table
   - the session's own 4 stub slots with a reason for each
   - chapter outline with ▶ widgets, traps, cheat block, compare pairs, card list, drill specs
3. **Build `sessions/NN-name/`**:
   - `index.html`: copy the previous shell and change the title and description.
   - `core.js`: meta, lines, map, stub, method, cheat, 8 compare pairs, ~15 traps, a log with a "not taken yet" entry.
   - `drills.js`: 30 exam-style drills. Every option has a `why`. `words` must be verbatim, case-insensitive
     substrings of `q`. Include 2 "select TWO" drills and vary the position of the correct answer. His exam misses
     get `mine: true`, `src: 'Exam Qn'` and a `tag`.
   - `cards.js`: 40 cards.
   - `widgets.js`: session widgets.
   - `learn.js`: 10–12 chapters of **full lesson prose**, in second person, plain and direct, with a checkpoint
     after each idea.
   - Wrap every data file in an IIFE; no top-level `const`.
4. **Register it.** Replace the `soon` entry in `sessions/manifest.js` with `path` and `totals`.
5. **Check.** From the repo root run `python3 -m http.server 8765 &`. Then `cd tools/check && npm i`, and write
   `widgets-NN-name.js`, which must interact with every widget once.
   - Run `node check.js NN-name` until ALL PASS, then re-run every earlier session to prove nothing regressed.
   - After pushing, run `ROOT=https://soosdev.github.io/saa/ node check.js NN-name`.
   - The harness covers 390×844 and 1440×900 in light and dark: zero console errors, fonts load, every tab and
     chapter renders, one drill end to end, one card rated, every checkpoint answered, no horizontal scroll.
6. **Screenshots.** Take them with Playwright into `design/compare/sNN-*.png` (git-ignored) and **look at them**.
   Fix overlapping labels, clipped text, crowded charts at 390px and horizontal scroll. Re-shoot after fixing.
7. **Merge the new facts into CONTEXT §6** as compact rows that point to the brief for the URLs.
8. **Commit and push.** The message lists the facts verified and corrected, plus the check results. Then confirm
   Pages is serving the new page (curl the session URL until it's live).
9. **Report to the user:** the URL, what was built, the facts that changed (old → new) and anything skipped, with why.

**Delegation that worked:** one general-purpose subagent builds a whole session in the background from a detailed
prompt: read list, fact list to verify, deliverables, colour budget, checks, "don't commit" and "don't edit
CONTEXT.md". A second subagent runs in parallel when re-verifying an existing session. Tell each one which files the
other owns. Afterwards, review the diff, spot-check facts and screenshots, merge CONTEXT §6, run all suites, commit.

## Gotchas learned the hard way
- **In `map.items`, `el: 'line'` means a transit line.** For a plain SVG line use `el: 'path'` with `d: 'M… H…'`,
  or the map crashes (`Cannot read properties of undefined (reading 'name')`).
- Map stations use `lines: [...]` to fade when another line is selected and `pick: [...]` to be clickable without
  fading.
- **Colour budget.** Hues already taken, which must never be reused for other services:
  - DataSync `--ds`, Storage Gateway `--gw`, Transfer Family `--tf`, the truck `--dtt` (grey, dashed), DMS `--dms`,
    MGN `--mgn` (DRS is the same red, dashed and two-way)
  - Direct Connect `--dx`, Transit Gateway `--tgw`, PrivateLink/endpoints `--pl`
  - CloudFront `--cf`, Global Accelerator `--ga`

  That is 11 hues. Every further family should be an **ink line** (`cls: 'ink'`, `width: 4`, distinct dash and
  station shape). Add a new hue only when unavoidable: at most 1–2, defined in all three theme blocks of
  `assets/css/transit.css`, with contrast ≥ 4.5:1 and CVD separation computed against every existing hue.
  Chart bars stay ink; identity comes from a swatch plus a label.
- `--ok`/`--bad` are only for right/wrong feedback, and `--hl` only for deciding words after submit.
  No shadows, no gradients. Radii are 6 / 8 / 10 / 999 by role.
- Fonts must load on every page. The `<head>` link block is in DESIGN.md, and the CSS has probes that force all
  three families to load.
- Charts go through `SAA.mountChart(draw)` / `SAA.hbars`. They redraw at the container width, so check them at 390px
  and give narrow widths their own label offsets or shorter labels.
- The tooltip hides on scroll by design. In tests, scroll into view before hovering.
- The engine exports `SAA.h/s/md/hbars/mountChart/callout/table/treeWidget/swatch/color/tcolor/…`.
  Generic widgets: `sorter`, `stubTrainer`, `triggerTable`, `stepper`, `chooser`.
  Session 1's `widgets.js` (pipe calculator, class picker …) can be reused by loading `../01-storage/widgets.js`.
- Inline markup: `**bold**`, `` `code` ``, `{lineId|Service}`, `[[#tab|link]]`, `==highlight==`.
- `localStorage` keys are `saa:<sessionId>:{learn,check,drill,cards,ui}`. Never change a session's `meta.id`.
- Don't use the AWS CLI via Bash. Use the AWS MCP tools. The learner's AWS account isn't needed for the site.
