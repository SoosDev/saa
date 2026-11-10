# Checks (CONTEXT §9 step 4)

    python3 -m http.server 8765 &      # from the repo root
    cd tools/check && npm i
    node check.js 01-storage           # 390x844 + 1440x900, light + dark
    ROOT=https://soosdev.github.io/saa/ node check.js 02-migration   # against Pages
    node feed.js                       # the feed at the site root, same four viewports

`check.js` runs the generic checks (hub at `hub.html`: fonts, scroll, session cards; then the session:
console errors, fonts, every tab and chapter, no horizontal scroll, "All sessions" → `hub.html`, one drill
end to end, one card rated, every checkpoint, More-sheet tap targets) and then `widgets-<session>.js`, which
must interact with every widget of that session once. `feed.js` checks the feed (`index.html`): all
sessions load, infinite scroll, a question answered in place writes the session's drill record, a card
rated to box 2, Mix interleaves sessions, each domain chip, resume after reload, theme, 44px tap targets
and the 56px phone header, links into a session drill and to the hub. Both print `ALL PASS` or `FAILED n`
on the last line and set no exit code. `shots.js` / `sbs.js` produce the mockup comparison
screenshots in design/compare/ (git-ignored).

Question quality (no browser needed):

    node options.js [NN-name]        # flags answers findable by length: answer longest, stub-length distractors
    node drills-lint.js [NN-name]    # syntax, words in q, stub chip values, no "option B" letter references
