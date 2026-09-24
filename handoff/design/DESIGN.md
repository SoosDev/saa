# Design source of truth

The files in `design/mockups/` are the approved design. They are static HTML: open them in a browser at the width in the file name (desktop 1440, phone 390). **When the brief's words and the mockups disagree, the mockups win.** Every new tab, session or component must look like it belongs in these six files.

## How to check your work (required, every session)

1. Render each mockup and the matching live page at the same viewport with Playwright (1440×900 desktop, 390×844 phone), save screenshots side by side in `design/compare/` (git-ignored).
2. Look at each pair and list the differences in type, colour, spacing, radius, borders and layout. Fix them, or explain in the commit message why the difference is intended.
3. For screens with no mockup (tree, S3 classes, traps, cheat sheet, hub, new session tabs), build them only from the components that are in the mockups. Don't invent new components when an existing one fits.

## Non-negotiables

**Fonts actually load.** Every HTML page's `<head>` contains exactly:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Overpass:wght@400;600;800&family=Overpass+Mono:wght@400;600&family=Atkinson+Hyperlegible:wght@400;700&display=swap">
```
Test it: in Playwright, `document.fonts.check('800 20px Overpass')`, `document.fonts.check('16px "Atkinson Hyperlegible"')` and `document.fonts.check('14px "Overpass Mono"')` must all be true after `document.fonts.ready`. A page that silently falls back to system-ui is the biggest visible drift.

**Type roles.**
- Overpass 800 is for headings, service names, line names and the brand.
- Overpass 600 uppercase at 11–13px with letter-spacing .1em is for section labels and eyebrows.
- Atkinson Hyperlegible is for all reading text: scenarios, explanations, card backs.
- Overpass Mono is for stub chips, counters, the cheat sheet and pipe math.
- Nothing else.

**Colour carries meaning, nothing else does.**
- The six line colours (DataSync, Gateway, Transfer, DTT/Snow, DMS, MGN) are used only for those services. Later sessions add their own lines and declare their colours in the session brief.
- Drill-filter tags that aren't lines (`backup`, `where`, `classes`, `edge`, …) use neutral chips: surface fill, `--chip-border` outline, ink text. They never get new hues. Remove `--t-backup`, `--t-where`, `--t-classes` and `--t-edge`.
- `--ok` and `--bad` appear only for correct/incorrect feedback.
- `--hl` appears only for highlighted deciding words after submit.

**Shapes.**
- Radius is 6px for option rows, chips inside cards and small panels; 8px for cards and panels; 10px only for the trigger card; 999px for pills.
- No shadows, no gradients.
- The only coloured edges are the 6px top border on compare cards (line colour) and the 8px colour bar on the trigger card.
- Borders are 1px `--rule`. The 2px borders are `--ok`/`--bad` on submitted options and `--ink` on the active Leitner box.

**Layout.**
- Desktop has a white header (64px), a white tab row (52px) with the active tab shown by a 3px ink underline, the content on `--ground`, and the map + 352px side panel.
- Phone has a 56px header and a 72px bottom tab bar with 5 items (24px stroke icons, 11px labels), with 16px gutters.
- Tap targets are ≥44px.

**Map.** Use the SVG geometry from `01-desktop-map.html` as-is: zones, station positions, path data, label positions. Selection fades the other lines to 0.22 opacity, never recolours them.
