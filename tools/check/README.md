# Checks (CONTEXT §9 step 4)

    python3 -m http.server 8765 &      # from the repo root
    cd tools/check && npm i
    node check.js 01-storage           # 390x844 + 1440x900, light + dark
    ROOT=https://soosdev.github.io/saa/ node check.js 02-migration   # against Pages
    node feed.js                       # the feed at the site root, same four viewports

`check.js` runs the generic checks (hub at `hub.html`: fonts, scroll, session cards; then the session:
console errors, fonts, every tab and chapter, no horizontal scroll, "All sessions" → `hub.html`, one drill
end to end, one card rated, every checkpoint, More-sheet tap targets) and then `widgets-<session>.js`, which
must interact with every widget of that session once. `feed.js` checks the feed (`index.html`): every
bite on the page and at least 4 per written session, each a title, a read and 3–5 questions; infinite
scroll; nothing revealed before Check; a question answered wrong and right in place, written to
`saa:feed:bites` and to no session key; a fresh browser interleaves sessions in a random order and loops
in rounds without repeats; each domain chip; resume after reload; theme; 44px tap targets and the 56px
phone header; footer links into the lesson and to the hub; none of the old item kinds; and once, the
migration of a `v:1` feed state and the day rolling over. Both print `ALL PASS` or `FAILED n` on the last
line and set no exit code. `shots.js` / `sbs.js` produce the mockup comparison
screenshots in design/compare/ (git-ignored).

Question quality (no browser needed):

    node options.js [NN-name]        # flags answers findable by length: answer longest, stub-length distractors;
                                     #   bites also: every option within 20% of the mean length
    node drills-lint.js [NN-name]    # syntax, words in q, stub chip values, no "option B" letter references;
                                     #   then bites/: structure, markup, sources, numbers, watchlist, wiring, coverage
    node bites.js --selftest         # proves every bite rule fires on a deliberately broken bite

Both lints include the feed's bites (`bites/NN-name.js`, through `bites.js`). With no argument they also
enforce coverage: every written session has at least 4 bites, each exam domain at least 6. A digit in a
bite's read, update note, explanation or why must appear in its source chapters, its session's
`docs/session-NN-*.md`, CONTEXT §6, or a "New facts" row of `docs/feed-bites.md`.
