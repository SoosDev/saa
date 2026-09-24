/* SAA Transit Maps — generic engine.
   Sessions are data only: see README.md for the data.js schema.
   No innerHTML with data; every node is built with createElement/textContent. */
(function () {
  'use strict';

  var SAA = (window.SAA = window.SAA || {});
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------------- storage (always guarded) ---------------- */
  function lsGet(key) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }
  SAA.lsGet = lsGet; SAA.lsSet = lsSet;

  /* ---------------- tiny DOM helpers ---------------- */
  function h(tag, props, kids) {
    var el = document.createElement(tag);
    apply(el, props);
    add(el, kids);
    return el;
  }
  function s(tag, props, kids) {
    var el = document.createElementNS(SVGNS, tag);
    apply(el, props, true);
    add(el, kids);
    return el;
  }
  function apply(el, props, isSvg) {
    if (!props) return;
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') { el.textContent = String(v); return; }
      if (k === 'cls') { if (isSvg) el.setAttribute('class', v); else el.className = v; return; }
      if (k === 'on') { Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); }); return; }
      if (k === 'style' && typeof v === 'object') { Object.keys(v).forEach(function (p) { el.style[p] = v[p]; }); return; }
      if (k === 'data') { Object.keys(v).forEach(function (p) { el.setAttribute('data-' + p, v[p]); }); return; }
      if (!isSvg && (k === 'disabled' || k === 'checked' || k === 'hidden')) { el[k] = !!v; return; }
      el.setAttribute(k, v === true ? '' : String(v));
    });
  }
  function add(el, kids) {
    if (kids === null || kids === undefined) return;
    if (!Array.isArray(kids)) kids = [kids];
    kids.forEach(function (k) {
      if (k === null || k === undefined || k === false) return;
      el.appendChild(typeof k === 'object' && k.nodeType ? k : document.createTextNode(String(k)));
    });
  }
  function clear(el) {
    /* Atomic: removing a focused child fires blur synchronously, which can re-enter
       a repaint. replaceChildren() empties the node in one step so the re-entrant
       pass sees an already-empty parent instead of a half-drained child list. */
    if (el.replaceChildren) { el.replaceChildren(); return; }
    var c;
    while ((c = el.firstChild)) { if (c.parentNode !== el) break; el.removeChild(c); }
  }
  SAA.h = h; SAA.s = s;

  function label(t) { return h('p', { cls: 'seclabel', text: t }); }
  function shuffle(a) {
    var r = a.slice();
    for (var i = r.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = r[i]; r[i] = r[j]; r[j] = t; }
    return r;
  }
  function cvar(token) { return token ? 'var(--' + token + ')' : 'var(--ink2)'; }

  /* ---------------- theme: system -> light -> dark ---------------- */
  var THEME_KEY = 'saa:theme';
  var THEME_ORDER = ['system', 'light', 'dark'];
  function themeGet() {
    var t = lsGet(THEME_KEY);
    return THEME_ORDER.indexOf(t) >= 0 ? t : 'system';
  }
  function themeApply(t) {
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }
  function themeButton() {
    var btn = h('button', { cls: 'tbtn', type: 'button', title: 'Theme: system / light / dark' });
    function paint() {
      var t = themeGet();
      btn.textContent = t === 'system' ? 'Auto' : (t === 'light' ? 'Light' : 'Dark');
      btn.setAttribute('aria-label', 'Theme: ' + t + '. Click to change.');
    }
    btn.addEventListener('click', function () {
      var next = THEME_ORDER[(THEME_ORDER.indexOf(themeGet()) + 1) % 3];
      lsSet(THEME_KEY, next); themeApply(next); paint();
    });
    themeApply(themeGet()); paint();
    return btn;
  }
  SAA.initTheme = function () { themeApply(themeGet()); return themeButton(); };

  /* ---------------- Leitner ---------------- */
  var DAY = 86400000;
  var BOX_DAYS = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 3650 };
  function cardBox(state, id) { var e = state[id]; return e && e.box ? e.box : 1; }
  function cardDue(state, id) { var e = state[id]; return !e || !e.due || e.due <= Date.now(); }

  /* ---------------- progress read (hub + header) ---------------- */
  SAA.readProgress = function (sessionId) {
    var cards = lsGet('saa:' + sessionId + ':cards') || {};
    var drill = lsGet('saa:' + sessionId + ':drill') || {};
    var known = 0;
    Object.keys(cards).forEach(function (k) { if (cards[k] && cards[k].box >= 5) known++; });
    var res = drill.results || {};
    var ids = Object.keys(res), ok = 0;
    ids.forEach(function (k) { if (res[k] && res[k].correct) ok++; });
    return { cardsKnown: known, drillsCorrect: ok, drillsSeen: ids.length };
  };

  /* ================================================================
     MOUNT
     ================================================================ */
  var TABS = [
    { key: 'map',     label: 'Map',            phone: 'Lines',   need: 'map',     primary: true },
    { key: 'tree',    label: 'Where it lives', phone: 'Tree',    need: 'tree',    primary: true },
    { key: 'classes', label: 'S3 classes',     phone: 'Classes', need: 'classes' },
    { key: 'compare', label: 'Compare',        phone: 'Compare', need: 'pairs',   primary: true },
    { key: 'cards',   label: 'Trigger cards',  phone: 'Cards',   need: 'cards',   primary: true },
    { key: 'drill',   label: 'Drill',          phone: 'Drill',   need: 'drills',  primary: true },
    { key: 'traps',   label: 'Traps',          phone: 'Traps',   need: 'traps' },
    { key: 'cheat',   label: 'Cheat sheet',    phone: 'Cheat',   need: 'cheat' }
  ];

  SAA.mount = function (session) {
    var D = session || {};
    var meta = D.meta || {};
    var SID = meta.id || 'session';
    var tabs = TABS.filter(function (t) {
      var v = D[t.need];
      return v && (!Array.isArray(v) || v.length);
    });
    if (!tabs.length) return;

    /* topic lookup: transit lines + non-line topics, both usable as filters/badges */
    var topics = {};
    (D.lines || []).forEach(function (l) { topics[l.id] = { id: l.id, name: l.name, color: l.color, line: true }; });
    Object.keys(D.topics || {}).forEach(function (k) {
      if (!topics[k]) topics[k] = { id: k, name: D.topics[k].name, color: D.topics[k].color, line: false };
    });
    function topic(id) { return topics[id] || { id: id, name: id, color: null, line: false }; }

    var state = {
      tab: null,
      line: null,                                  /* map selection */
      cards: lsGet('saa:' + SID + ':cards') || {},
      drill: lsGet('saa:' + SID + ':drill') || { results: {}, log: [], stubMiss: {}, tags: {} },
      drillFilter: { mode: 'all', line: null },
      drillOrder: null, drillIdx: 0, drillView: null,
      cardMode: 'due', cardOrder: null, cardIdx: 0, cardShown: false,
      pair: (D.pairs && D.pairs[0] && D.pairs[0].id) || null,
      tree: [],
      picker: { access: 'frequent', retrieval: 'ms', recreatable: 'no', days: 365 },
      lifecycle: []
    };
    if (!state.drill.results) state.drill.results = {};
    if (!state.drill.log) state.drill.log = [];
    if (!state.drill.stubMiss) state.drill.stubMiss = {};
    if (!state.drill.tags) state.drill.tags = {};

    function saveCards() { lsSet('saa:' + SID + ':cards', state.cards); paintMastery(); }
    function saveDrill() { lsSet('saa:' + SID + ':drill', state.drill); }

    /* ---------- chrome ---------- */
    var root = document.getElementById('app') || document.body;
    clear(root);

    var masteryTxt = h('span', { text: '' });
    var masteryBar = h('i');
    var hdr = h('header', { cls: 'hdr' }, [
      h('div', { cls: 'hdr-in' }, [
        h('div', { cls: 'brand' }, [
          h('b', { text: meta.brand || meta.title || 'SAA Transit Maps' }),
          h('span', { text: meta.subtitle || '' })
        ]),
        h('div', { cls: 'hdr-sp' }),
        h('div', { cls: 'mastery' }, [masteryTxt, h('div', { cls: 'bar' }, masteryBar)]),
        SAA.initTheme()
      ])
    ]);
    function paintMastery() {
      var total = (D.cards || []).length, known = 0;
      (D.cards || []).forEach(function (c) { if (cardBox(state.cards, c.id) >= 5) known++; });
      masteryTxt.textContent = known + ' / ' + total + ' cards known';
      masteryBar.style.width = total ? Math.round((known / total) * 100) + '%' : '0%';
    }

    var tabRow = h('div', { cls: 'tabs-in', role: 'tablist' });
    var tabBtns = {};
    tabs.forEach(function (t) {
      var b = h('button', {
        cls: 'tab', type: 'button', role: 'tab', text: t.label,
        on: { click: function () { go(t.key); } }
      });
      tabBtns[t.key] = b; tabRow.appendChild(b);
    });
    var panel = h('div', { cls: 'panel', role: 'tabpanel' });

    /* phone bottom bar */
    var primary = tabs.filter(function (t) { return t.primary; }).slice(0, 5);
    var more = tabs.filter(function (t) { return primary.indexOf(t) < 0; });
    var bbtns = {};
    var bbar = h('nav', { cls: 'bbar', 'aria-label': 'Sections' });
    primary.forEach(function (t) {
      var b = h('button', { type: 'button', 'aria-selected': 'false', on: { click: function () { go(t.key); } } },
        [h('i'), h('span', { text: t.phone })]);
      bbtns[t.key] = b; bbar.appendChild(b);
    });
    var sheet = h('div', { cls: 'sheet' });
    var sheetBd = h('div', { cls: 'sheet-bd', style: { display: 'none' }, on: { click: closeSheet } });
    function openSheet() {
      clear(sheet);
      sheet.appendChild(label('More'));
      more.forEach(function (t) {
        sheet.appendChild(h('button', { cls: 'bigopt', type: 'button', text: t.label, on: { click: function () { closeSheet(); go(t.key); } } }));
      });
      sheet.appendChild(h('button', { cls: 'btn ghost wide', type: 'button', text: 'Close', on: { click: closeSheet } }));
      sheet.classList.add('open'); sheetBd.style.display = 'block';
    }
    function closeSheet() { sheet.classList.remove('open'); sheetBd.style.display = 'none'; }
    if (more.length) {
      bbar.appendChild(h('button', { type: 'button', 'aria-selected': 'false', on: { click: openSheet } },
        [h('i'), h('span', { text: 'More' })]));
    }

    root.appendChild(hdr);
    root.appendChild(h('div', { cls: 'tabs' }, tabRow));
    root.appendChild(h('main', null, panel));
    root.appendChild(bbar);
    root.appendChild(sheetBd);
    root.appendChild(sheet);
    paintMastery();

    /* ---------- routing ---------- */
    function keyFromHash() {
      var k = (location.hash || '').replace(/^#/, '');
      return tabs.some(function (t) { return t.key === k; }) ? k : tabs[0].key;
    }
    function go(key, replace) {
      if (location.hash.replace(/^#/, '') !== key) {
        if (replace) location.replace('#' + key); else location.hash = key;
        return; /* hashchange will render */
      }
      render(key);
    }
    function render(key) {
      state.tab = key;
      tabs.forEach(function (t) {
        tabBtns[t.key].setAttribute('aria-selected', t.key === key ? 'true' : 'false');
        if (bbtns[t.key]) bbtns[t.key].setAttribute('aria-selected', t.key === key ? 'true' : 'false');
      });
      clear(panel);
      var fn = VIEWS[key];
      if (fn) fn(panel);
      window.scrollTo(0, 0);
    }
    window.addEventListener('hashchange', function () { render(keyFromHash()); });

    function ptitle(t, sub) {
      return h('div', { cls: 'ptitle' }, [h('h2', { text: t }), sub ? h('p', { text: sub }) : null]);
    }

    /* ================================================================
       1. MAP
       ================================================================ */
    function phone() { return window.matchMedia('(max-width:760px)').matches; }

    function miniLine(l, w) {
      var dash = (l.pattern === 'dashed') ? '14 10' : null;
      return s('svg', { viewBox: '0 0 ' + (w || 120) + ' 12', width: w || 120, height: 12, 'aria-hidden': 'true' }, [
        s('path', {
          d: 'M2 6 H' + ((w || 120) - 2), cls: 'mline',
          stroke: cvar(l.color), 'stroke-width': 8, 'stroke-dasharray': dash
        })
      ]);
    }

    function lineSvg() {
      var m = D.map || {};
      var svg = s('svg', { viewBox: m.viewBox || '0 0 1000 744', role: 'img', 'aria-label': 'Transit map of data movement into AWS' });
      var groups = {};   /* line id -> [nodes] */
      var stationNodes = [];
      var neutral = [];

      function reg(node, item) {
        if (item.line) { (groups[item.line] = groups[item.line] || []).push(node); }
        else if (item.lines) { stationNodes.push({ node: node, lines: item.lines }); }
        else neutral.push(node);
      }

      (m.items || []).forEach(function (it) {
        var g = s('g', { cls: 'mg' });
        if (it.type === 'zone') {
          g.appendChild(s('rect', { x: it.x, y: it.y, width: it.w, height: it.h, fill: cvar(it.fill) }));
        } else if (it.type === 'text') {
          g.appendChild(s('text', { x: it.x, y: it.y, cls: it.cls || 'msub', fill: it.fill ? cvar(it.fill) : 'var(--ink2)', 'text-anchor': it.anchor || 'start', text: it.text }));
        } else if (it.type === 'path') {
          var dash = it.dash || ((it.line && lineById(it.line) && lineById(it.line).pattern === 'dashed') ? '14 10' : null);
          g.appendChild(s('path', { d: it.d, cls: 'mline', stroke: cvar(colorOf(it.line)), 'stroke-width': it.w || 8, 'stroke-dasharray': dash }));
          if (it.line) {
            var hit = s('path', { d: it.d, cls: 'mhit' });
            hit.addEventListener('click', function () { selectLine(it.line); });
            g.appendChild(hit);
          }
        } else if (it.type === 'station') {
          var shape = it.shape || 'circle';
          if (shape === 'circle') g.appendChild(s('circle', { cx: it.x, cy: it.y, r: it.r || 9, fill: 'var(--surface)', stroke: 'var(--ink)', 'stroke-width': 3 }));
          else g.appendChild(s('rect', { x: it.x - (it.w || 26) / 2, y: it.y - (it.h || 26) / 2, width: it.w || 26, height: it.h || 26, fill: 'var(--surface)', stroke: it.stroke ? cvar(it.stroke) : 'var(--ink)', 'stroke-width': 3 }));
          if (it.name) g.appendChild(s('text', { x: it.tx !== undefined ? it.tx : it.x, y: it.y + 4, cls: 'mstat', 'text-anchor': it.anchor || 'start', text: it.name }));
          if (it.sub) g.appendChild(s('text', { x: it.tx !== undefined ? it.tx : it.x, y: it.y + 20, cls: 'mstat2', 'text-anchor': it.anchor || 'start', text: it.sub }));
        } else if (it.type === 'box') {
          g.appendChild(s('rect', { x: it.x, y: it.y, width: it.w, height: it.h, rx: it.rx === undefined ? 6 : it.rx, fill: 'var(--surface)', stroke: cvar(colorOf(it.line) || it.stroke), 'stroke-width': 3 }));
          if (it.text) g.appendChild(s('text', { x: it.x + it.w / 2, y: it.y + it.h / 2 + 5, cls: 'mlabel', 'text-anchor': 'middle', fill: cvar(it.tcolor || colorOf(it.line)), text: it.text }));
        } else if (it.type === 'pill') {
          g.appendChild(s('rect', { x: it.x, y: it.y, width: it.w, height: it.h, rx: it.rx, fill: cvar(it.fill || 'ink2'), stroke: 'var(--ink)', 'stroke-width': 2 }));
        } else if (it.type === 'label') {
          var t = s('text', { x: it.x, y: it.y, cls: 'mlabel', fill: cvar(colorOf(it.line) || it.color), text: it.text });
          t.addEventListener('click', function () { selectLine(it.line); });
          g.appendChild(t);
          if (it.sub) g.appendChild(s('text', { x: it.sub.x, y: it.sub.y, cls: 'msub', fill: cvar(colorOf(it.line) || it.color), text: it.sub.text }));
          if (it.line) {
            g.setAttribute('tabindex', '0');
            g.setAttribute('role', 'button');
            g.setAttribute('aria-label', it.text);
            g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectLine(it.line); } });
          }
        }
        reg(g, it);
        svg.appendChild(g);
      });

      function paint() {
        var sel = state.line;
        Object.keys(groups).forEach(function (id) {
          groups[id].forEach(function (n) { n.style.opacity = !sel ? '1' : (id === sel ? '1' : '0.22'); });
        });
        stationNodes.forEach(function (o) {
          o.node.style.opacity = !sel ? '1' : (o.lines.indexOf(sel) >= 0 ? '1' : '0.4');
        });
      }
      svg._paint = paint;
      paint();
      return svg;
    }
    function lineById(id) { return (D.lines || []).filter(function (l) { return l.id === id; })[0]; }
    function colorOf(id) { var l = lineById(id); return l ? l.color : (topics[id] ? topics[id].color : null); }

    var mapSvgEl = null, sidePanelEl = null;
    function selectLine(id) {
      state.line = (state.line === id) ? null : id;
      if (mapSvgEl && mapSvgEl._paint) mapSvgEl._paint();
      if (sidePanelEl) paintSide(sidePanelEl);
    }

    function myMissesOn(lineId) {
      return (D.drills || []).filter(function (d) { return d.line === lineId && d.mine; });
    }

    function paintSide(box) {
      clear(box);
      var l = lineById(state.line);
      if (!l) {
        box.appendChild(label('Lines'));
        box.appendChild(h('p', { cls: 'muted', style: { margin: '0 0 10px' }, text: 'Pick a line on the map — or a card below — to see what it is for and when to switch.' }));
        (D.lines || []).forEach(function (ln) {
          box.appendChild(h('button', {
            cls: 'swrow', type: 'button', on: { click: function () { selectLine(ln.id); } }
          }, [
            h('span', { cls: 'dot', style: { background: cvar(ln.color) } }),
            h('span', null, [h('b', { text: ln.name }), ' — ', h('span', { cls: 'muted', text: ln.verbShort || ln.verb })])
          ]));
        });
        return;
      }
      box.appendChild(h('p', { cls: 'seclabel', text: 'Line' }));
      box.appendChild(h('h3', { style: { color: cvar(l.color) }, text: l.name }));
      box.appendChild(h('p', { cls: 'verb', text: l.verb }));
      box.appendChild(h('div', { style: { marginTop: '12px' } }, [
        label('Built for'), h('p', { style: { margin: '0 0 10px' }, text: l.builtFor })
      ]));
      if (l.examSays && l.examSays.length) {
        box.appendChild(label('Exam says'));
        box.appendChild(h('div', { cls: 'chiprow', style: { marginBottom: '12px' } },
          l.examSays.map(function (x) { return h('span', { cls: 'tag', text: x }); })));
      }
      box.appendChild(h('div', null, [label('From → to'), h('p', { cls: 'small muted', style: { margin: '0 0 10px' }, text: l.from + ' → ' + l.to })]));
      if (l.switchWhen && l.switchWhen.length) {
        box.appendChild(label('Switch lines when'));
        l.switchWhen.forEach(function (sw) {
          var t = topic(sw.to);
          box.appendChild(h('button', { cls: 'swrow', type: 'button', on: { click: function () { if (lineById(sw.to)) { state.line = sw.to; if (mapSvgEl && mapSvgEl._paint) mapSvgEl._paint(); paintSide(box); } } } }, [
            h('span', { cls: 'dot', style: { background: cvar(t.color) } }),
            h('span', null, [sw.cond, ' → ', h('b', { style: { color: cvar(t.color) }, text: t.name })])
          ]));
        });
      }
      var misses = myMissesOn(l.id);
      box.appendChild(h('div', { style: { marginTop: '14px' } }, [
        label('Your misses on this line'),
        misses.length
          ? h('ul', { style: { margin: '0 0 10px', paddingLeft: '18px', fontSize: '13.5px' } },
              misses.map(function (d) { return h('li', { text: d.ref ? d.ref + ' — ' + shortText(d.text) : shortText(d.text) }); }))
          : h('p', { cls: 'small muted', style: { margin: '0 0 10px' }, text: 'None recorded on this line.' })
      ]));
      var n = (D.drills || []).filter(function (d) { return d.line === l.id; }).length;
      box.appendChild(h('button', {
        cls: 'btn wide', type: 'button', text: 'Drill ' + l.name + ' · ' + n + (n === 1 ? ' scenario' : ' scenarios'),
        disabled: !n,
        on: { click: function () { state.drillFilter = { mode: 'line', line: l.id }; state.drillOrder = null; go('drill'); } }
      }));
      box.appendChild(h('button', { cls: 'btn ghost wide', type: 'button', style: { marginTop: '8px' }, text: 'Clear selection', on: { click: function () { selectLine(l.id); } } }));
    }
    function shortText(t) { return t.length > 84 ? t.slice(0, 82) + '…' : t; }

    var VIEWS_map = function (p) {
      p.appendChild(ptitle(phone() ? 'Lines' : 'Map', 'Each way data moves is a line with one verb. Tap a line to isolate it.'));
      var side = h('aside', { cls: 'side' });
      sidePanelEl = side;

      if (phone()) {
        var cardsWrap = h('div', { cls: 'grid' }, (D.lines || []).map(function (l) {
          return h('button', { cls: 'linecard', type: 'button', on: { click: function () { selectLine(l.id); side.scrollIntoView({ block: 'nearest' }); } } }, [
            miniLine(l, 260),
            h('b', { style: { color: cvar(l.color) }, text: l.name }),
            h('span', { cls: 'small', text: l.verb }),
            h('span', { cls: 'small muted mono', text: l.from + ' → ' + l.to })
          ]);
        }));
        p.appendChild(cardsWrap);
        var full = h('div', { style: { marginTop: '12px' } });
        var toggled = false;
        p.appendChild(h('button', {
          cls: 'btn ghost wide', type: 'button', text: 'Full map', on: {
            click: function (e) {
              toggled = !toggled; clear(full);
              e.target.textContent = toggled ? 'Hide map' : 'Full map';
              if (toggled) { mapSvgEl = lineSvg(); full.appendChild(h('div', { cls: 'mapbox' }, mapSvgEl)); }
            }
          }
        }));
        p.appendChild(full);
        p.appendChild(h('div', { style: { marginTop: '12px' } }, side));
      } else {
        mapSvgEl = lineSvg();
        p.appendChild(h('div', { cls: 'maplay' }, [h('div', { cls: 'mapbox' }, mapSvgEl), side]));
      }
      paintSide(side);
    };

    /* ================================================================
       2. TREE
       ================================================================ */
    function factCard(key) {
      var f = (D.facts || {})[key];
      if (!f) return null;
      return h('div', { cls: 'card' }, [
        label(f.title || 'Key facts'),
        h('ul', { style: { margin: 0, paddingLeft: '20px', fontSize: '14.5px' } },
          (f.bullets || []).map(function (b) { return h('li', { text: b, style: { marginBottom: '4px' } }); }))
      ]);
    }

    var VIEWS_tree = function (p) {
      var T = D.tree || {};
      p.appendChild(ptitle('Where it lives', 'One question at a time. The answer is the service; the neighbours tell you why not.'));
      var crumbs = h('div', { cls: 'crumbs' });
      var body = h('div');
      p.appendChild(crumbs); p.appendChild(body);

      function paint() {
        clear(crumbs); clear(body);
        crumbs.appendChild(h('button', { type: 'button', text: 'Start over', on: { click: function () { state.tree = []; paint(); } } }));
        state.tree.forEach(function (step, i) {
          crumbs.appendChild(h('span', { text: '›' }));
          crumbs.appendChild(h('button', { type: 'button', text: step.answer, on: { click: function () { state.tree = state.tree.slice(0, i); paint(); } } }));
        });

        var nodeId = state.tree.length ? state.tree[state.tree.length - 1].next : T.root;
        var node = (T.nodes || {})[nodeId];
        if (!node) { body.appendChild(h('p', { cls: 'muted', text: 'Nothing here.' })); return; }

        if (node.q) {
          body.appendChild(h('div', { cls: 'card' }, [
            label('Question ' + (state.tree.length + 1)),
            h('h3', { style: { fontSize: '20px', marginBottom: '12px' }, text: node.q }),
            h('div', null, (node.options || []).map(function (o) {
              return h('button', { cls: 'bigopt', type: 'button', text: o.label, on: { click: function () { state.tree = state.tree.concat([{ answer: o.label, next: o.next }]); paint(); } } });
            }))
          ]));
          return;
        }
        var r = node.result;
        body.appendChild(h('div', { cls: 'card result' }, [
          label('Answer'),
          h('h3', { text: r.service }),
          r.why ? h('p', { style: { marginBottom: '6px' }, text: r.why }) : null,
          r.link ? h('button', { cls: 'btn ghost', type: 'button', style: { marginTop: '6px' }, text: r.link.text, on: { click: function () { go(r.link.tab); } } }) : null
        ]));
        (r.facts || []).forEach(function (k) { var c = factCard(k); if (c) body.appendChild(c); });
        if (r.neighbours && r.neighbours.length) {
          body.appendChild(h('div', { cls: 'card' }, [
            label('Why not the neighbours'),
            h('ul', { style: { margin: 0, paddingLeft: '20px', fontSize: '14.5px' } },
              r.neighbours.map(function (n) { return h('li', { style: { marginBottom: '4px' } }, [h('b', { text: n.svc }), ' — ' + n.why]); }))
          ]));
        }
      }
      paint();
    };

    /* ================================================================
       3. S3 CLASSES (picker + lifecycle builder)
       ================================================================ */
    var ACCESS_RANK = { frequent: 0, unknown: 1, monthly: 2, quarterly: 3, yearly: 4, audit: 5 };
    var RETR_RANK = { ms: 0, minutes: 1, hours: 2, h12: 3, h48: 4 };

    function scoreClasses() {
      var C = D.classes || {};
      var pk = state.picker;
      var need = RETR_RANK[pk.retrieval];
      var acc = ACCESS_RANK[pk.access];
      var recreatable = pk.recreatable === 'yes';
      var out = (C.rows || []).map(function (r) {
        var lose = null;
        if (r.minDays && pk.days < r.minDays) lose = 'minimum billable duration is ' + r.minDays + ' days; you keep the data ' + pk.days + ' days';
        else if (r.retrievalRank > need) lose = 'retrieval is too slow for "' + labelFor(C.retrievalOptions, pk.retrieval) + '"';
        else if (r.singleAZ && !recreatable) lose = 'single Availability Zone — not for a copy you could not re-create';
        else if (r.forUnknown && pk.access !== 'unknown') lose = 'monitoring fee per object for an access pattern you already know';
        else if (!r.forUnknown && pk.access === 'unknown') lose = 'needs you to know the access pattern — you do not';
        else if (acc < r.accessMin) lose = 'read this often it costs more than a warmer class (retrieval fees / min duration)';
        else if (acc > r.accessMax) lose = 'read this rarely, a colder class stores it for less';
        else if (r.nicheOnly) lose = r.nicheOnly;
        return { row: r, lose: lose };
      });
      var winners = out.filter(function (o) { return !o.lose; });
      winners.sort(function (a, b) { return a.row.cost - b.row.cost; });
      var win = winners[0] || null;
      out.forEach(function (o) {
        if (win && o !== win && !o.lose) o.lose = 'valid, but ' + win.row.name + ' stores the same data for less';
      });
      return { win: win, all: out };
    }
    function labelFor(opts, v) {
      var m = (opts || []).filter(function (o) { return o.v === v; })[0];
      return m ? m.label : v;
    }

    var VIEWS_classes = function (p) {
      var C = D.classes || {};
      p.appendChild(ptitle('S3 classes', 'Answer the four questions the exam always asks. The winner is highlighted; every loser says why it lost.'));

      var out = h('div');
      var ctrls = h('div', { cls: 'card' });
      p.appendChild(ctrls); p.appendChild(out);

      function group(title, opts, key) {
        var row = h('div', { cls: 'chiprow' }, opts.map(function (o) {
          var b = h('button', {
            cls: 'chip sm', type: 'button', text: o.label,
            'aria-pressed': String(state.picker[key] === o.v),
            on: { click: function () { state.picker[key] = o.v; paint(); } }
          });
          return b;
        }));
        return h('div', { style: { marginBottom: '12px' } }, [label(title), row]);
      }

      function paint() {
        clear(ctrls); clear(out);
        ctrls.appendChild(group('Access frequency', C.accessOptions || [], 'access'));
        ctrls.appendChild(group('Retrieval time needed', C.retrievalOptions || [], 'retrieval'));
        ctrls.appendChild(group('Data re-creatable?', [{ v: 'yes', label: 'yes' }, { v: 'no', label: 'no' }], 'recreatable'));
        ctrls.appendChild(group('Retention', C.retentionOptions || [], 'days'));

        var sc = scoreClasses();
        if (sc.win) {
          out.appendChild(h('div', { cls: 'card', style: { background: 'var(--ok-bg)', borderColor: 'var(--ok)', borderWidth: '2px' } }, [
            label('Winner'),
            h('h3', { style: { fontSize: '21px' }, text: sc.win.row.name }),
            h('p', { style: { margin: '6px 0 0' }, text: sc.win.row.winBecause || sc.win.row.examSays })
          ]));
        } else {
          out.appendChild(h('div', { cls: 'card' }, [h('p', { cls: 'muted', text: 'No class satisfies all four constraints — loosen one.' })]));
        }

        var tbody = h('tbody', null, sc.all.map(function (o) {
          return h('tr', { cls: (sc.win && o === sc.win) ? 'win' : '' }, [
            h('td', { text: o.row.name }),
            h('td', { cls: 'mono', text: o.row.azs }),
            h('td', { cls: 'mono', text: o.row.minDays ? o.row.minDays + ' d' : '—' }),
            h('td', { text: o.row.retrieval }),
            h('td', { text: o.row.examSays }),
            h('td', { cls: 'lose', text: o.lose ? 'loses because ' + o.lose : '✓ winner' })
          ]);
        }));
        out.appendChild(h('div', { cls: 'tblwrap', style: { marginTop: '12px' } }, h('table', null, [
          h('thead', null, h('tr', null, ['Class', 'AZs', 'Min duration', 'Retrieval', 'Exam says', 'Verdict'].map(function (t) { return h('th', { text: t }); }))),
          tbody
        ])));

        if (C.rules && C.rules.length) {
          out.appendChild(h('div', { cls: 'card', style: { marginTop: '12px' } }, [
            label('Rules to memorise'),
            h('ul', { style: { margin: 0, paddingLeft: '20px', fontSize: '14.5px' } },
              C.rules.map(function (r) { return h('li', { text: r, style: { marginBottom: '4px' } }); }))
          ]));
        }
        out.appendChild(lifecycleBuilder());
      }

      function lifecycleBuilder() {
        var C2 = D.classes || {};
        var box = h('div', { cls: 'card', style: { marginTop: '12px' } });
        var lcBusy = false;
        function paintLC() {
          clear(box);
          box.appendChild(label('Lifecycle builder'));
          box.appendChild(h('p', { cls: 'small muted', style: { margin: '0 0 10px' }, text: 'Add transitions in order. The validator applies the same minimums the exam tests.' }));
          box.appendChild(h('div', { cls: 'chiprow', style: { marginBottom: '10px' } },
            (C2.rows || []).filter(function (r) { return r.lifecycleTarget; }).map(function (r) {
              return h('button', { cls: 'chip sm', type: 'button', text: '+ ' + r.name, on: { click: function () { state.lifecycle = state.lifecycle.concat([{ id: r.id, day: r.minDays || 30 }]); paintLC(); } } });
            })));
          if (!state.lifecycle.length) {
            box.appendChild(h('p', { cls: 'small muted', text: 'No transitions yet. Objects stay in S3 Standard.' }));
            return;
          }
          var prevDay = 0, prevName = 'S3 Standard';
          state.lifecycle.forEach(function (t, i) {
            var r = (C2.rows || []).filter(function (x) { return x.id === t.id; })[0] || { name: t.id, minDays: 0 };
            var errs = [];
            if (r.minDays && t.day < r.minDays) errs.push(r.name + ' needs at least ' + r.minDays + ' days in a warmer class first (you set day ' + t.day + ')');
            if (t.day <= prevDay) errs.push('day ' + t.day + ' is not after the previous transition (day ' + prevDay + ')');
            var dayIn = h('input', { type: 'number', min: '1', max: '3650', value: String(t.day), style: { width: '92px', minHeight: '44px', font: 'inherit', fontFamily: 'var(--f-mono)', padding: '0 8px', borderRadius: '8px', border: '1px solid var(--chip-border)', background: 'var(--surface)', color: 'var(--ink)' } });
            dayIn.addEventListener('change', function () {
              if (lcBusy) return;
              lcBusy = true;
              t.day = Math.max(1, parseInt(dayIn.value, 10) || 1);
              paintLC();
              lcBusy = false;
            });
            box.appendChild(h('div', { style: { borderTop: '1px solid var(--rule)', padding: '10px 0', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } }, [
              h('span', { cls: 'mono small', text: prevName + ' →' }),
              h('b', { text: r.name }),
              h('span', { cls: 'small muted', text: 'at day' }), dayIn,
              h('button', { cls: 'btn ghost', type: 'button', text: 'Remove', on: { click: function () { state.lifecycle = state.lifecycle.filter(function (x, j) { return j !== i; }); paintLC(); } } }),
              errs.length ? h('div', { style: { flexBasis: '100%', color: 'var(--bad)', fontSize: '13.5px' }, text: '✕ ' + errs.join(' · ') } ) : h('div', { style: { flexBasis: '100%', color: 'var(--ok)', fontSize: '13.5px' }, text: '✓ valid' })
            ]));
            prevDay = t.day; prevName = r.name;
          });
          box.appendChild(h('button', { cls: 'btn ghost', type: 'button', style: { marginTop: '8px' }, text: 'Clear', on: { click: function () { state.lifecycle = []; paintLC(); } } }));
        }
        paintLC();
        return box;
      }
      paint();
    };

    /* ================================================================
       4. COMPARE
       ================================================================ */
    function miniDiagram(mini) {
      var svg = s('svg', { viewBox: '0 0 300 110', 'aria-hidden': 'true' });
      function box(x, y, w, hh, t, sub) {
        svg.appendChild(s('rect', { x: x, y: y, width: w, height: hh, rx: 6, fill: 'var(--surface)', stroke: 'var(--rule)', 'stroke-width': 2 }));
        svg.appendChild(s('text', { x: x + w / 2, y: y + (sub ? hh / 2 - 2 : hh / 2 + 5), cls: 'mstat', 'text-anchor': 'middle', text: t }));
        if (sub) svg.appendChild(s('text', { x: x + w / 2, y: y + hh / 2 + 15, cls: 'mstat2', 'text-anchor': 'middle', text: sub }));
      }
      var col = cvar(mini.color);
      box(4, 30, 104, 50, mini.left || 'On-prem', mini.leftSub);
      box(192, 30, 104, 50, mini.right || 'AWS', mini.rightSub);
      if (mini.cache) {
        svg.appendChild(s('rect', { x: 118, y: 4, width: 64, height: 26, rx: 6, fill: 'var(--muted-fill)', stroke: col, 'stroke-width': 2 }));
        svg.appendChild(s('text', { x: 150, y: 22, cls: 'msub', 'text-anchor': 'middle', fill: 'var(--ink2)', text: 'cache' }));
        svg.appendChild(s('path', { d: 'M150 30 V44', cls: 'mline', stroke: col, 'stroke-width': 3 }));
      }
      var dashed = mini.dashed ? '10 7' : null;
      svg.appendChild(s('path', { d: 'M110 55 H190', cls: 'mline', stroke: col, 'stroke-width': 6, 'stroke-dasharray': dashed }));
      svg.appendChild(s('path', { d: 'M182 48 L192 55 L182 62 Z', fill: col }));
      if (mini.dir === 'both') svg.appendChild(s('path', { d: 'M118 48 L108 55 L118 62 Z', fill: col }));
      svg.appendChild(s('text', { x: 150, y: 92, cls: 'msub', 'text-anchor': 'middle', fill: 'var(--ink2)', text: mini.note || '' }));
      return svg;
    }

    var VIEWS_compare = function (p) {
      p.appendChild(ptitle('Compare', 'Eight pairs that the exam keeps swapping. Read the deciding words, then take the quick check.'));
      var picker = h('div', { cls: 'chiprow', style: { marginBottom: '14px' } });
      var body = h('div');
      p.appendChild(picker); p.appendChild(body);

      function paint() {
        clear(picker); clear(body);
        (D.pairs || []).forEach(function (pr, i) {
          picker.appendChild(h('button', {
            cls: 'chip sm', type: 'button', text: (i + 1) + ' · ' + pr.short,
            'aria-pressed': String(state.pair === pr.id),
            on: { click: function () { state.pair = pr.id; paint(); } }
          }));
        });
        var pr = (D.pairs || []).filter(function (x) { return x.id === state.pair; })[0];
        if (!pr) return;

        body.appendChild(h('h3', { style: { fontSize: '19px', marginBottom: '10px' }, text: pr.title }));
        body.appendChild(h('div', { cls: 'pair' }, [pr.a, pr.b].map(function (side) {
          return h('div', { cls: 'pcard', style: { borderTopColor: cvar(side.color) } }, [
            miniDiagram(Object.assign({ color: side.color }, side.mini || {})),
            h('h4', { style: { color: cvar(side.color) }, text: side.name }),
            h('div', { cls: 'prow' }, [label('Job'), h('div', { text: side.job })]),
            h('div', { cls: 'prow' }, [label('Deciding words'), h('div', { cls: 'mono small', text: side.words })]),
            h('div', { cls: 'prow' }, [label('Lands in'), h('div', { text: side.lands })]),
            h('div', { cls: 'prow' }, [label('Tempting wrong answer'), h('div', { cls: 'small', text: side.tempting })])
          ]);
        })));
        body.appendChild(h('div', { cls: 'card' }, [label('Can both be right?'), h('div', { text: pr.both })]));
        body.appendChild(quickCheck(pr));
      }

      function quickCheck(pr) {
        var box = h('div', { cls: 'card' });
        function paintQ(chosen) {
          clear(box);
          box.appendChild(label('Quick check'));
          box.appendChild(h('p', { style: { margin: '0 0 10px', fontSize: '15.5px' }, text: pr.check.q }));
          pr.check.options.forEach(function (o) {
            var btn = h('button', { cls: 'bigopt', type: 'button', on: { click: function () { if (!chosen) paintQ(o); } } }, [
              h('b', { text: o.label }),
              chosen && chosen === o ? h('div', { cls: 'small', style: { marginTop: '4px' }, text: o.why } ) : null
            ]);
            if (chosen) {
              btn.style.background = o.ok ? 'var(--ok-bg)' : (o === chosen ? 'var(--bad-bg)' : 'var(--surface)');
              btn.style.borderColor = o.ok ? 'var(--ok)' : (o === chosen ? 'var(--bad)' : 'var(--chip-border)');
              btn.style.borderWidth = (o.ok || o === chosen) ? '2px' : '1px';
            }
            box.appendChild(btn);
          });
          if (chosen) {
            box.appendChild(h('p', { style: { margin: '8px 0 0' }, text: (chosen.ok ? '✓ ' : '✕ ') + (chosen.ok ? 'Right. ' : '') + (pr.check.explain || '') }));
            box.appendChild(h('button', { cls: 'btn ghost', type: 'button', style: { marginTop: '8px' }, text: 'Try again', on: { click: function () { paintQ(null); } } }));
          }
        }
        paintQ(null);
        return box;
      }
      paint();
    };

    /* ================================================================
       5. TRIGGER CARDS (Leitner)
       ================================================================ */
    function cardPool() {
      var all = D.cards || [];
      if (state.cardMode === 'mine') return all.filter(function (c) { return c.mine; });
      if (state.cardMode === 'all') return shuffle(all);
      return all.filter(function (c) { return cardDue(state.cards, c.id); });
    }

    var VIEWS_cards = function (p) {
      var head = h('div');
      var body = h('div');
      p.appendChild(ptitle('Trigger cards', 'Front is the exam phrase. Commit to an answer before you reveal.'));
      p.appendChild(head); p.appendChild(body);

      function paint() {
        clear(head); clear(body);
        var due = (D.cards || []).filter(function (c) { return cardDue(state.cards, c.id); }).length;
        var counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        (D.cards || []).forEach(function (c) { counts[cardBox(state.cards, c.id)]++; });

        head.appendChild(h('div', { cls: 'card', style: { marginBottom: '12px' } }, [
          h('div', { style: { display: 'flex', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' } }, [
            h('b', { style: { fontFamily: 'var(--f-display)', fontSize: '17px' }, text: due + ' due today' }),
            h('div', { cls: 'boxes' }, [1, 2, 3, 4, 5].map(function (b) {
              return h('span', { cls: 'tag' }, [h('b', { text: 'box ' + b }), ' ' + counts[b]]);
            }))
          ]),
          h('div', { cls: 'chiprow', style: { marginTop: '10px' } }, [
            mode('due', 'Due'), mode('all', 'All shuffled'), mode('mine', 'Only my misses'),
            resetBtn()
          ])
        ]));

        var pool = state.cardOrder && state.cardOrderMode === state.cardMode ? state.cardOrder : (state.cardOrder = cardPool(), state.cardOrderMode = state.cardMode, state.cardIdx = 0, state.cardOrder);
        if (!pool.length) {
          body.appendChild(h('div', { cls: 'card' }, [h('p', { cls: 'muted', text: state.cardMode === 'due' ? 'Nothing due — switch to “All shuffled” to keep going.' : 'No cards in this mode.' })]));
          return;
        }
        if (state.cardIdx >= pool.length) state.cardIdx = 0;
        var c = pool[state.cardIdx];
        var t = topic(c.line);

        var fc = h('div', { cls: 'fc' }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' } }, [
            h('p', { cls: 'seclabel', style: { margin: 0, color: cvar(t.color) }, text: t.name }),
            h('span', { cls: 'tag mono', text: (state.cardIdx + 1) + ' / ' + pool.length + ' · box ' + cardBox(state.cards, c.id) })
          ]),
          h('div', { cls: 'front', text: c.front })
        ]);

        if (!state.cardShown) {
          fc.appendChild(h('div', { cls: 'hdr-sp' }));
          fc.appendChild(h('button', { cls: 'btn wide', type: 'button', text: 'Reveal', on: { click: function () { state.cardShown = true; paint(); } } }));
        } else {
          if (c.mine) fc.appendChild(h('p', { cls: 'seclabel', style: { color: 'var(--bad)', margin: '4px 0 0' }, text: 'You missed this before' }));
          fc.appendChild(h('div', { cls: 'svc', style: { color: cvar(t.color) }, text: c.service }));
          fc.appendChild(h('p', { style: { margin: 0 }, text: c.why }));
          if (c.tempting) {
            fc.appendChild(h('div', { cls: 'temp' }, [h('b', { text: 'Tempting: ' }), c.tempting.answer + ' — ' + c.tempting.why]));
          }
          fc.appendChild(h('div', { cls: 'chiprow', style: { marginTop: 'auto', paddingTop: '10px' } }, [
            h('button', { cls: 'btn ghost', type: 'button', style: { borderColor: 'var(--bad)', color: 'var(--bad)' }, text: 'Missed', on: { click: function () { rate(c, 'missed'); } } }),
            h('button', { cls: 'btn ghost', type: 'button', text: 'Hesitated', on: { click: function () { rate(c, 'hesitated'); } } }),
            h('button', { cls: 'btn ghost', type: 'button', style: { borderColor: 'var(--ok)', color: 'var(--ok)' }, text: 'Knew it', on: { click: function () { rate(c, 'knew'); } } })
          ]));
        }
        body.appendChild(fc);
        body.appendChild(h('div', { cls: 'chiprow', style: { marginTop: '10px' } }, [
          h('button', { cls: 'btn ghost', type: 'button', text: '‹ Previous', on: { click: function () { state.cardIdx = (state.cardIdx - 1 + pool.length) % pool.length; state.cardShown = false; paint(); } } }),
          h('button', { cls: 'btn ghost', type: 'button', text: 'Skip ›', on: { click: function () { state.cardIdx = (state.cardIdx + 1) % pool.length; state.cardShown = false; paint(); } } })
        ]));

        function rate(card, how) {
          var box = cardBox(state.cards, card.id);
          if (how === 'missed') box = 1;
          else if (how === 'knew') box = Math.min(5, box + 1);
          state.cards[card.id] = { box: box, due: Date.now() + BOX_DAYS[box] * DAY };
          saveCards();
          state.cardShown = false;
          if (state.cardMode === 'due') { state.cardOrder = null; }
          else { state.cardIdx = (state.cardIdx + 1) % pool.length; }
          paint();
        }
      }
      function mode(v, t) {
        return h('button', { cls: 'chip sm', type: 'button', text: t, 'aria-pressed': String(state.cardMode === v), on: { click: function () { state.cardMode = v; state.cardOrder = null; state.cardShown = false; paint(); } } });
      }
      function resetBtn() {
        var wrap = h('span');
        function ask() {
          clear(wrap);
          wrap.appendChild(h('span', { cls: 'small', style: { marginRight: '6px' }, text: 'Reset all boxes?' }));
          wrap.appendChild(h('button', { cls: 'chip sm', type: 'button', text: 'Yes, reset', on: { click: function () { state.cards = {}; saveCards(); state.cardOrder = null; state.cardShown = false; paint(); } } }));
          wrap.appendChild(h('button', { cls: 'chip sm', type: 'button', text: 'Cancel', on: { click: idle } }));
        }
        function idle() { clear(wrap); wrap.appendChild(h('button', { cls: 'chip sm', type: 'button', text: 'Reset', on: { click: ask } })); }
        idle();
        return wrap;
      }
      paint();
    };

    /* ================================================================
       6. DRILL
       ================================================================ */
    var STUB_SLOTS = [
      { k: 'size', label: 'SIZE / NET' },
      { k: 'time', label: 'TIME' },
      { k: 'proto', label: 'PROTOCOL / APP' },
      { k: 'sup', label: 'SUPERLATIVE' }
    ];
    var REASONS = [
      { k: 'size', label: 'violates SIZE/NET' },
      { k: 'time', label: 'violates TIME' },
      { k: 'proto', label: 'violates PROTOCOL/APP' },
      { k: 'sup', label: 'violates SUPERLATIVE' },
      { k: 'job', label: 'wrong service for the job' },
      { k: 'false', label: 'not possible / false fact' }
    ];
    var TAGS = [
      { k: 'F', label: 'F · fact' }, { k: 'C', label: 'C · confused two services' },
      { k: 'K', label: 'K · missed a keyword' }, { k: 'R', label: 'R · misread' },
      { k: 'A', label: 'A · reasoning' }, { k: 'L', label: 'L · limit' }
    ];
    var KEY = ['A', 'B', 'C', 'D', 'E'];

    function drillPool() {
      var all = D.drills || [];
      var f = state.drillFilter;
      if (f.mode === 'line') return all.filter(function (d) { return d.line === f.line; });
      if (f.mode === 'mine') return all.filter(function (d) { return d.mine; });
      if (f.mode === 'todo') return all.filter(function (d) { var r = state.drill.results[d.id]; return !r || !r.correct; });
      return shuffle(all);
    }

    var VIEWS_drill = function (p) {
      p.appendChild(ptitle('Drill', 'Stub before options. Cross out with a reason. Then choose.'));
      if (D.method && D.method.length) {
        p.appendChild(h('details', { cls: 'method' }, [
          h('summary', { text: 'The reduction method' }),
          h('ol', null, D.method.map(function (m) { return h('li', { text: m }); }))
        ]));
      }
      var filters = h('div', { cls: 'chiprow', style: { marginBottom: '12px' } });
      var body = h('div');
      var stats = h('div', { style: { marginTop: '18px' } });
      p.appendChild(filters); p.appendChild(body); p.appendChild(stats);

      function paintFilters() {
        clear(filters);
        [['all', 'All (shuffled)'], ['mine', 'Only my misses'], ['todo', 'Not yet correct']].forEach(function (m) {
          filters.appendChild(h('button', {
            cls: 'chip sm', type: 'button', text: m[1],
            'aria-pressed': String(state.drillFilter.mode === m[0]),
            on: { click: function () { state.drillFilter = { mode: m[0], line: null }; state.drillOrder = null; paintAll(); } }
          }));
        });
        var lineIds = {};
        (D.drills || []).forEach(function (d) { lineIds[d.line] = true; });
        Object.keys(lineIds).forEach(function (id) {
          var t = topic(id);
          filters.appendChild(h('button', {
            cls: 'chip sm', type: 'button',
            'aria-pressed': String(state.drillFilter.mode === 'line' && state.drillFilter.line === id),
            on: { click: function () { state.drillFilter = { mode: 'line', line: id }; state.drillOrder = null; paintAll(); } }
          }, [h('span', { cls: 'dot', style: { background: cvar(t.color) } }), t.name]));
        });
      }

      function paintAll() { paintFilters(); paintCard(); paintStats(); }

      function paintCard() {
        clear(body);
        if (!state.drillOrder) { state.drillOrder = drillPool(); state.drillIdx = 0; state.drillView = null; }
        var pool = state.drillOrder;
        if (!pool.length) {
          body.appendChild(h('div', { cls: 'card' }, [h('p', { cls: 'muted', text: 'No scenarios match this filter.' })]));
          return;
        }
        if (state.drillIdx >= pool.length) state.drillIdx = 0;
        var d = pool[state.drillIdx];
        if (!state.drillView || state.drillView.id !== d.id) {
          state.drillView = { id: d.id, stub: {}, cross: {}, reason: {}, pick: [], submitted: false, tag: null };
        }
        var V = state.drillView;
        var t = topic(d.line);

        var card = h('div', { cls: 'card' });
        card.appendChild(h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' } }, [
          h('p', { cls: 'seclabel', style: { margin: 0, color: cvar(t.color) }, text: t.name + (d.mine ? ' · you missed this' : '') }),
          h('span', { cls: 'tag mono', text: (state.drillIdx + 1) + ' / ' + pool.length + (d.ref ? ' · ' + d.ref : '') })
        ]));
        card.appendChild(scenText(d, V.submitted));
        if (d.multi) card.appendChild(h('p', { cls: 'seclabel', style: { color: 'var(--bad)', marginTop: '8px' }, text: 'Select TWO' }));

        /* stub */
        card.appendChild(h('div', { style: { marginTop: '14px' } }, label('Fill the stub first')));
        var stub = h('div', { cls: 'stub' });
        STUB_SLOTS.forEach(function (sl) {
          var row = h('div', { cls: 'stubrow' }, [
            h('span', { cls: 'seclabel', style: { margin: 0, paddingTop: '12px' }, text: sl.label }),
            h('div', { cls: 'chiprow' }, ((D.stubChoices || {})[sl.k] || []).map(function (ch) {
              return h('button', {
                cls: 'chip sm', type: 'button', text: ch, 'aria-pressed': String(V.stub[sl.k] === ch),
                disabled: V.submitted,
                on: { click: function () { V.stub[sl.k] = ch; paintCard(); } }
              });
            }))
          ]);
          if (V.submitted) {
            var truth = (d.stub || {})[sl.k];
            var okSlot = truth === 'any' || truth === V.stub[sl.k];
            row.appendChild(h('div', { style: { gridColumn: '1 / -1', fontSize: '13.5px' } }, [
              h('span', { cls: 'mark ' + (okSlot ? 'y' : 'n'), text: okSlot ? '✓ ' : '✕ ' }),
              okSlot ? (truth === 'any' ? 'any value accepted' : 'right') : ('truth: ' + truth)
            ]));
          }
          stub.appendChild(row);
        });
        card.appendChild(stub);

        var filled = STUB_SLOTS.every(function (sl) { return V.stub[sl.k]; });

        /* options */
        var opts = h('div', { cls: 'grid', style: { marginTop: '16px' } });
        if (!filled) opts.classList.add('locked');
        card.appendChild(h('div', { style: { marginTop: '16px' } }, [
          label(filled ? 'Options' : 'Options — locked until the stub is full'),
        ]));
        d.options.forEach(function (o, i) {
          var picked = V.pick.indexOf(o.id) >= 0;
          var crossed = !!V.cross[o.id];
          var cls = 'opt';
          if (V.submitted) {
            if (o.ok) cls += ' correct';
            else if (picked) cls += ' wrong';
            else if (crossed) cls += ' crossed';
          } else {
            if (crossed) cls += ' crossed';
            if (picked) cls += ' picked';
          }
          var row = h('div', { cls: cls, tabindex: V.submitted ? null : '0', data: { key: KEY[i] } });
          row.appendChild(h('div', { cls: 'otop' }, [
            h('span', { cls: 'okey', text: KEY[i] + '.' }),
            h('span', { cls: 'otxt', text: o.label }),
            V.submitted ? h('span', { cls: 'mark ' + (o.ok ? 'y' : (picked ? 'n' : '')), text: o.ok ? '✓' : (picked ? '✕' : '') }) : null
          ]));
          if (!V.submitted) {
            row.appendChild(h('div', { cls: 'oacts' }, [
              h('button', { cls: 'chip sm', type: 'button', text: crossed ? 'Un-cross' : 'Cross out', on: { click: function () { if (crossed) { delete V.cross[o.id]; delete V.reason[o.id]; } else { V.cross[o.id] = true; V.pick = V.pick.filter(function (x) { return x !== o.id; }); } paintCard(); } } }),
              h('button', { cls: 'chip sm', type: 'button', text: picked ? 'Chosen' : 'Choose', 'aria-pressed': String(picked), on: { click: function () { choose(o); } } })
            ]));
            if (crossed) {
              row.appendChild(h('div', { style: { marginTop: '8px' } }, [
                h('p', { cls: 'seclabel', style: { margin: '0 0 6px' }, text: 'Reason' }),
                h('div', { cls: 'chiprow' }, REASONS.map(function (r) {
                  return h('button', { cls: 'chip sm', type: 'button', text: r.label, 'aria-pressed': String(V.reason[o.id] === r.k), on: { click: function () { V.reason[o.id] = r.k; paintCard(); } } });
                }))
              ]));
            }
          } else {
            if (o.why) row.appendChild(h('div', { cls: 'why', text: (o.ok ? 'Why right: ' : 'Why wrong: ') + o.why }));
            if (o.ok && crossed) row.appendChild(h('div', { cls: 'why', style: { color: 'var(--bad)' }, text: '✕ You crossed out the right answer.' }));
            if (!o.ok && crossed && o.rk) {
              var mine = V.reason[o.id];
              row.appendChild(h('div', { cls: 'why', style: { color: mine === o.rk ? 'var(--ok)' : 'var(--ink2)' }, text: mine === o.rk ? '✓ Your elimination reason matches.' : 'Strongest reason here: ' + rlabel(o.rk) + (mine ? ' (you said ' + rlabel(mine) + ')' : ' (no reason given)') }));
            }
          }
          opts.appendChild(row);
        });
        card.appendChild(opts);

        function choose(o) {
          if (V.submitted) return;
          delete V.cross[o.id]; delete V.reason[o.id];
          var max = d.multi ? 2 : 1;
          var at = V.pick.indexOf(o.id);
          if (at >= 0) V.pick.splice(at, 1);
          else { V.pick.push(o.id); if (V.pick.length > max) V.pick.shift(); }
          paintCard();
        }

        /* submit / feedback */
        if (!V.submitted) {
          var need = d.multi ? 2 : 1;
          card.appendChild(h('button', {
            cls: 'btn wide', type: 'button', style: { marginTop: '12px' }, data: { submit: '1' },
            text: 'Submit' + (V.pick.length < need ? ' — choose ' + need : ''),
            disabled: !filled || V.pick.length < need,
            on: { click: submit }
          }));
        } else {
          card.appendChild(feedback(d, V));
        }
        body.appendChild(card);

        body.appendChild(h('div', { cls: 'chiprow', style: { marginTop: '10px' } }, [
          h('button', { cls: 'btn ghost', type: 'button', text: '‹ Previous', on: { click: function () { state.drillIdx = (state.drillIdx - 1 + pool.length) % pool.length; state.drillView = null; paintCard(); } } }),
          h('button', { cls: 'btn', type: 'button', text: 'Next ›', on: { click: function () { state.drillIdx = (state.drillIdx + 1) % pool.length; state.drillView = null; paintCard(); } } })
        ]));

        function submit() {
          V.submitted = true;
          var correctIds = d.options.filter(function (o) { return o.ok; }).map(function (o) { return o.id; });
          var ok = V.pick.length === correctIds.length && correctIds.every(function (id) { return V.pick.indexOf(id) >= 0; });
          state.drill.results[d.id] = { correct: ok, ts: Date.now() };
          state.drill.log.push({ id: d.id, line: d.line, correct: ok, ts: Date.now() });
          if (state.drill.log.length > 200) state.drill.log = state.drill.log.slice(-200);
          STUB_SLOTS.forEach(function (sl) {
            var truth = (d.stub || {})[sl.k];
            if (truth && truth !== 'any' && V.stub[sl.k] !== truth) {
              state.drill.stubMiss[sl.k] = (state.drill.stubMiss[sl.k] || 0) + 1;
            }
          });
          saveDrill();
          paintCard(); paintStats();
        }

        function rlabel(k) { var r = REASONS.filter(function (x) { return x.k === k; })[0]; return r ? r.label : k; }

        function feedback(d, V) {
          var wrap = h('div', { style: { marginTop: '14px' } });
          var correctIds = d.options.filter(function (o) { return o.ok; }).map(function (o) { return o.id; });
          var ok = V.pick.length === correctIds.length && correctIds.every(function (id) { return V.pick.indexOf(id) >= 0; });
          wrap.appendChild(h('div', {
            cls: 'card',
            style: { background: ok ? 'var(--ok-bg)' : 'var(--bad-bg)', borderColor: ok ? 'var(--ok)' : 'var(--bad)', borderWidth: '2px' }
          }, [
            label(ok ? 'Correct' : 'Not right'),
            h('p', { style: { margin: '0 0 6px' } }, [h('b', { text: 'Answer: ' }), correctIds.map(function (id) { return KEY[indexOfOpt(d, id)]; }).join(', ')]),
            h('p', { style: { margin: 0 }, text: d.explain })
          ]));
          if (d.deciding && d.deciding.length) {
            wrap.appendChild(h('div', { cls: 'card' }, [
              label('Deciding words'),
              h('div', { cls: 'chiprow' }, d.deciding.map(function (w) { return h('span', { cls: 'tag mono', style: { background: 'var(--hl)' }, text: w }); }))
            ]));
          }
          var tagBox = h('div', { cls: 'card' });
          function paintTag() {
            clear(tagBox);
            tagBox.appendChild(label('Error tag' + (d.tag ? ' — suggested: ' + d.tag : '')));
            tagBox.appendChild(h('p', { cls: 'small muted', style: { margin: '0 0 8px' }, text: 'Confirm what went wrong so the stats know what to drill.' }));
            tagBox.appendChild(h('div', { cls: 'chiprow' }, TAGS.map(function (tg) {
              return h('button', {
                cls: 'chip sm', type: 'button', text: tg.label, 'aria-pressed': String(V.tag === tg.k),
                on: { click: function () { V.tag = tg.k; state.drill.tags[tg.k] = (state.drill.tags[tg.k] || 0) + 1; saveDrill(); paintTag(); paintStats(); } }
              });
            })));
          }
          paintTag();
          wrap.appendChild(tagBox);
          return wrap;
        }
        function indexOfOpt(d, id) {
          for (var i = 0; i < d.options.length; i++) if (d.options[i].id === id) return i;
          return 0;
        }
      }

      function scenText(d, showMarks) {
        var el = h('p', { cls: 'scen', style: { margin: 0 } });
        if (!showMarks || !d.deciding || !d.deciding.length) { el.textContent = d.text; return el; }
        var text = d.text, ranges = [];
        d.deciding.forEach(function (w) {
          var i = text.toLowerCase().indexOf(w.toLowerCase());
          while (i >= 0) { ranges.push([i, i + w.length]); i = text.toLowerCase().indexOf(w.toLowerCase(), i + w.length); }
        });
        ranges.sort(function (a, b) { return a[0] - b[0]; });
        var merged = [];
        ranges.forEach(function (r) {
          var last = merged[merged.length - 1];
          if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push(r.slice());
        });
        var pos = 0;
        merged.forEach(function (r) {
          if (r[0] > pos) el.appendChild(document.createTextNode(text.slice(pos, r[0])));
          el.appendChild(h('mark', { text: text.slice(r[0], r[1]) }));
          pos = r[1];
        });
        if (pos < text.length) el.appendChild(document.createTextNode(text.slice(pos)));
        return el;
      }

      function paintStats() {
        clear(stats);
        var log = state.drill.log || [];
        var res = state.drill.results || {};
        var ids = Object.keys(res), ok = 0;
        ids.forEach(function (k) { if (res[k].correct) ok++; });
        var perLine = {};
        log.forEach(function (e) {
          var b = perLine[e.line] = perLine[e.line] || { n: 0, ok: 0 };
          b.n++; if (e.correct) b.ok++;
        });
        var worst = null;
        Object.keys(state.drill.stubMiss).forEach(function (k) {
          if (!worst || state.drill.stubMiss[k] > state.drill.stubMiss[worst]) worst = k;
        });
        var last20 = log.slice(-20);

        stats.appendChild(label('Stats'));
        stats.appendChild(h('div', { cls: 'stats' }, [
          h('div', { cls: 'stat' }, [h('b', { text: ids.length ? Math.round((ok / ids.length) * 100) + '%' : '—' }), h('span', { cls: 'small muted', text: 'accuracy (' + ok + ' / ' + ids.length + ' answered)' })]),
          h('div', { cls: 'stat' }, [h('b', { text: String((D.drills || []).length - ids.length) }), h('span', { cls: 'small muted', text: 'never attempted' })]),
          h('div', { cls: 'stat' }, [
            h('span', { cls: 'small muted', text: 'last 20' }),
            h('div', { cls: 'last20', style: { marginTop: '6px' } }, last20.map(function (e) { return h('i', { cls: e.correct ? 'y' : 'n', title: e.id }); }))
          ]),
          h('div', { cls: 'stat' }, [
            h('b', { style: { fontSize: '15px' }, text: worst ? (STUB_SLOTS.filter(function (x) { return x.k === worst; })[0] || {}).label : '—' }),
            h('span', { cls: 'small muted', text: 'weakest stub slot' + (worst ? ' (' + state.drill.stubMiss[worst] + ' misses)' : '') })
          ])
        ]));
        var lines = Object.keys(perLine);
        if (lines.length) {
          stats.appendChild(h('div', { cls: 'card', style: { marginTop: '12px' } }, [
            label('Per line'),
            h('div', null, lines.map(function (id) {
              var t = topic(id), b = perLine[id];
              return h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', padding: '5px 0', fontSize: '14px' } }, [
                h('span', { cls: 'dot', style: { background: cvar(t.color) } }),
                h('span', { style: { flex: '1' }, text: t.name }),
                h('span', { cls: 'mono', text: b.ok + ' / ' + b.n })
              ]);
            }))
          ]));
        }
        stats.appendChild(h('button', {
          cls: 'btn ghost', type: 'button', style: { marginTop: '10px' }, text: 'Reset drill stats',
          on: {
            click: function (e) {
              var btn = e.target;
              if (btn.dataset.armed) {
                state.drill = { results: {}, log: [], stubMiss: {}, tags: {} }; saveDrill(); paintAll();
              } else { btn.dataset.armed = '1'; btn.textContent = 'Click again to confirm reset'; }
            }
          }
        }));
      }

      paintAll();
    };

    /* ================================================================
       7. TRAPS
       ================================================================ */
    var VIEWS_traps = function (p) {
      p.appendChild(ptitle('Traps', 'The wrong answers that keep working on people. Each links to the drills that test it.'));
      p.appendChild(h('div', { cls: 'grid g2' }, (D.traps || []).map(function (t) {
        return h('div', { cls: 'trap' }, [
          h('p', { cls: 'eyebrow', text: 'Trap' }),
          h('h4', { text: t.title }),
          h('p', { style: { margin: '0 0 10px', fontSize: '14.5px' }, text: t.text }),
          (t.drills && t.drills.length) ? h('div', { cls: 'chiprow' }, t.drills.map(function (id) {
            return h('button', {
              cls: 'chip sm', type: 'button', text: id,
              on: {
                click: function () {
                  var all = D.drills || [];
                  var i = -1;
                  for (var j = 0; j < all.length; j++) if (all[j].id === id) i = j;
                  if (i < 0) return;
                  state.drillFilter = { mode: 'all', line: null };
                  state.drillOrder = all.slice(); state.drillIdx = i; state.drillView = null;
                  go('drill');
                }
              }
            });
          })) : null
        ]);
      })));
    };

    /* ================================================================
       8. CHEAT SHEET
       ================================================================ */
    var VIEWS_cheat = function (p) {
      p.appendChild(ptitle('Cheat sheet', 'Print it: one half-page, black on white.'));
      p.appendChild(h('div', { cls: 'noprint', style: { marginBottom: '12px' } },
        h('button', { cls: 'btn ghost', type: 'button', text: 'Print', on: { click: function () { window.print(); } } })));
      if (phone()) p.appendChild(h('p', { cls: 'small muted noprint', style: { margin: '0 0 8px' }, text: 'Scroll the block sideways to read the full lines \u2014 or print it.' }));
      p.appendChild(h('div', { cls: 'cheat' }, h('pre', { text: D.cheat || '' })));
    };

    var VIEWS = {
      map: VIEWS_map, tree: VIEWS_tree, classes: VIEWS_classes, compare: VIEWS_compare,
      cards: VIEWS_cards, drill: VIEWS_drill, traps: VIEWS_traps, cheat: VIEWS_cheat
    };

    /* keyboard in the drill tab: 1-5 choose, X cross out, Enter submit — registered once */
    document.addEventListener('keydown', function (e) {
      if (state.tab !== 'drill') return;
      var tgt = e.target;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SUMMARY')) return;
      var V = state.drillView;
      if (!V || V.submitted) return;
      var rows = panel.querySelectorAll('.opt');
      var idx = ['1', '2', '3', '4', '5'].indexOf(e.key);
      if (idx >= 0 && rows[idx]) {
        var ch = rows[idx].querySelectorAll('.oacts .chip')[1];
        if (ch) { e.preventDefault(); ch.click(); }
        return;
      }
      if (e.key === 'x' || e.key === 'X') {
        var row = (tgt && tgt.closest) ? tgt.closest('.opt') : null;
        if (!row) row = rows[0];
        if (row) { var cb = row.querySelectorAll('.oacts .chip')[0]; if (cb) { e.preventDefault(); cb.click(); } }
        return;
      }
      if (e.key === 'Enter') {
        var sb = panel.querySelector('[data-submit]');
        if (sb && !sb.disabled) { e.preventDefault(); sb.click(); }
      }
    });

    /* first render */
    if (!location.hash) { render(tabs[0].key); }
    else { render(keyFromHash()); }
    window.addEventListener('resize', (function () {
      var wasPhone = phone();
      return function () { if (phone() !== wasPhone) { wasPhone = phone(); render(state.tab); } };
    })());
  };
})();
