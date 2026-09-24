# Checks (CONTEXT §9 step 4)

    python3 -m http.server 8765 &      # from the repo root
    cd tools/check && npm i
    node check.js 01-storage           # 390x844 + 1440x900, light + dark
    ROOT=https://soosdev.github.io/saa/ node check.js 02-migration   # against Pages

`check.js` runs the generic checks (console errors, fonts, every tab and chapter, no horizontal scroll,
one drill end to end, one card rated, every checkpoint) and then `widgets-<session>.js`, which must
interact with every widget of that session once. `shots.js` / `sbs.js` produce the mockup comparison
screenshots in design/compare/ (git-ignored).
