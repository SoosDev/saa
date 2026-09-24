const { chromium } = require('playwright');
const DIR = '/home/dima/dev/personal/saa-exam/design/compare/';
const pairs = [['01-map-mock.png','01-map-live.png','01-sbs.png',1440],['02-lines-mock.png','02-lines-live.png','02-sbs.png',390],['03-drill-mock.png','03-drill-live.png','03-sbs.png',390],['04-compare-mock.png','04-compare-live.png','04-sbs.png',390],['05-cards-mock.png','05-cards-live.png','05-sbs.png',390]];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1000,height:800}});
  for (const [a,c,o,w] of pairs) {
    const W = w*2+30;
    await p.setViewportSize({width:W,height:800});
    await p.goto("http://localhost:8765/"); await p.setContent(`<body style="margin:0;display:flex;gap:30px;background:#888;align-items:flex-start"><img src="http://localhost:8765/design/compare/${a}" width=${w}><img src="http://localhost:8765/design/compare/${c}" width=${w}></body>`);
    await p.waitForTimeout(200);
    await p.screenshot({path: DIR+o, fullPage:true});
  }
  await b.close();
})();
