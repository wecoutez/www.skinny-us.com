// Holographic "life tree". Shape is fixed (seeded by birthday) so it is always
// the same tree; leaves, colours and weather effects change with each day's input.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const rng = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

  const CX = 310, CY = 270, BASE = 492;

  function drawTree(svg, cfg) {
    svg.innerHTML = '';
    const shapeR = rng(19860316), R = rng(cfg.seed);
    const defs = el('defs', {}, svg);
    const glow = el('filter', { id: 'tglow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: 2.2, result: 'b' }, glow);
    const mg = el('feMerge', {}, glow); el('feMergeNode', { in: 'b' }, mg); el('feMergeNode', { in: 'b' }, mg); el('feMergeNode', { in: 'SourceGraphic' }, mg);
    const soft = el('filter', { id: 'tsoft', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs); el('feGaussianBlur', { stdDeviation: 14 }, soft);
    const beam = el('linearGradient', { id: 'tbeam', x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    el('stop', { offset: 0, 'stop-color': cfg.ring, 'stop-opacity': .5 }, beam); el('stop', { offset: 1, 'stop-color': cfg.ring, 'stop-opacity': 0 }, beam);
    const bark = el('linearGradient', { id: 'tbark', x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    el('stop', { offset: 0, 'stop-color': cfg.barkA }, bark); el('stop', { offset: 1, 'stop-color': cfg.barkB }, bark);

    // ambient + haze
    el('circle', { cx: CX, cy: CY, r: 180, fill: cfg.ambient, opacity: .22, filter: 'url(#tsoft)' }, svg);

    // HUD rings (slowly rotating)
    const hud = el('g', { class: 'spin' }, svg), hud2 = el('g', { class: 'spin rev' }, svg);
    const ring = (g, r, a) => el('circle', Object.assign({ cx: CX, cy: CY, r, fill: 'none' }, a), g);
    ring(svg, 262, { stroke: 'rgba(79,214,255,.16)', 'stroke-width': 1 });
    ring(hud, 254, { stroke: 'rgba(79,214,255,.32)', 'stroke-width': 1, 'stroke-dasharray': '2 6' });
    ring(svg, 234, { stroke: 'rgba(79,214,255,.10)', 'stroke-width': 12 });
    for (let i = 0; i < 120; i++) {
      const a = i / 120 * Math.PI * 2, l = i % 10 === 0 ? 10 : 4;
      el('line', { x1: CX + Math.cos(a) * 218, y1: CY + Math.sin(a) * 218, x2: CX + Math.cos(a) * (218 - l), y2: CY + Math.sin(a) * (218 - l), stroke: i % 10 === 0 ? cfg.ring : 'rgba(79,214,255,.35)', 'stroke-width': i % 10 === 0 ? 1.5 : 1 }, hud2);
    }
    const arc = (g, r, a0, a1, c, w) => {
      const p0 = [CX + Math.cos(a0) * r, CY + Math.sin(a0) * r], p1 = [CX + Math.cos(a1) * r, CY + Math.sin(a1) * r];
      el('path', { d: `M${p0} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p1}`, stroke: c, 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round', filter: 'url(#tglow)' }, g);
    };
    arc(hud, 234, -2.6, -1.3, '#4fd6ff', 3); arc(hud, 234, -.9, -.3, cfg.ring, 3); arc(hud, 234, .2, .9, '#4fd6ff', 3); arc(hud, 234, 2.2, 2.7, cfg.ring, 3);
    arc(hud2, 272, -2.0, -1.1, 'rgba(79,214,255,.7)', 1.4); arc(hud2, 272, -.3, .4, 'rgba(79,214,255,.7)', 1.4); arc(hud2, 272, 1.4, 1.8, cfg.ring, 1.4);

    // branches (fixed shape)
    const bG = el('g', { filter: 'url(#tglow)' }, svg), lG = el('g', {}, svg), sG = el('g', { filter: 'url(#tglow)' }, svg);
    const tips = [], twigs = [];
    function branch(x, y, ang, len, w, depth) {
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      const cx = x + Math.cos(ang + (shapeR() - .5) * .6) * len * .5, cy = y + Math.sin(ang + (shapeR() - .5) * .6) * len * .5;
      const hot = shapeR() > .86;
      el('path', { d: `M${x},${y} Q${cx},${cy} ${x2},${y2}`, stroke: depth > 4 ? 'url(#tbark)' : (hot ? cfg.twigHot : cfg.twig), 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round', opacity: depth > 4 ? .95 : .8 }, bG);
      if (depth <= 2) twigs.push([x2, y2]);
      if (depth === 0 || len < 8) { tips.push([x2, y2]); return; }
      const n = depth > 5 ? 2 : (shapeR() > .3 ? 2 : 3);
      for (let i = 0; i < n; i++) { const sp = (i - (n - 1) / 2) * (.42 + shapeR() * .3) + (shapeR() - .5) * .25; branch(x2, y2, ang + sp, len * (.68 + shapeR() * .14), w * .66, depth - 1); }
    }
    for (let k = 0; k < 5; k++) {
      const o = (k - 2) * 4;
      el('path', { d: `M${CX + o * 2},${BASE} C${CX - 5 + o},${BASE - 45} ${CX + 8 - o},${BASE - 95} ${CX - 2 + o * .5},${BASE - 145} S${CX - 3 + o},${BASE - 195} ${CX + o * .3},${BASE - 222}`, stroke: 'url(#tbark)', 'stroke-width': 5 - Math.abs(k - 2) * .8, fill: 'none', opacity: .85 }, bG);
    }
    branch(CX, BASE - 220, -Math.PI / 2, 58, 9, 8);
    branch(CX - 3, BASE - 192, -Math.PI / 2 - .95, 54, 7, 6);
    branch(CX + 3, BASE - 196, -Math.PI / 2 + .95, 54, 7, 6);

    // leaves: density and colours come from the day's config
    const lc = cfg.leafColors;
    tips.forEach(([x, y]) => {
      const c = 5 + Math.floor(R() * 7);
      for (let i = 0; i < c; i++) {
        if (R() > cfg.leaves) continue;
        const a = R() * Math.PI * 2, r = R() * 22, lx = x + Math.cos(a) * r, ly = y + Math.sin(a) * r * .8, sz = 2 + R() * 3.6;
        el('ellipse', { cx: lx, cy: ly, rx: sz, ry: sz * .62, transform: `rotate(${R() * 180} ${lx} ${ly})`, fill: lc[Math.floor(R() * lc.length)], opacity: .55 + R() * .45 }, lG);
      }
    });
    // fallen leaves on the projector disc
    for (let i = 0; i < cfg.fallen; i++) {
      const a = R() * Math.PI * 2, r = 30 + R() * 110, fx = CX + Math.cos(a) * r, fy = BASE + 22 + Math.sin(a) * r * .16;
      el('ellipse', { cx: fx, cy: fy, rx: 2.6, ry: 1.4, transform: `rotate(${R() * 180} ${fx} ${fy})`, fill: lc[Math.floor(R() * lc.length)], opacity: .7 }, svg);
    }
    // sparkles
    for (let i = 0; i < cfg.sparkles; i++) {
      const t = tips[Math.floor(R() * tips.length)];
      el('circle', { cx: t[0] + (R() - .5) * 44, cy: t[1] + (R() - .5) * 34, r: .7 + R() * 1.4, fill: R() > .6 ? cfg.sparkle : '#e9fbff', class: 'tw', style: `--t:${2 + R() * 3}s;--d:${-R() * 4}s` }, sG);
    }
    // roots
    for (let i = 0; i < 9; i++) {
      const o = i - 4, ex = CX + o * 23 + (shapeR() - .5) * 12;
      el('path', { d: `M${CX + o * 1.6},${BASE} C${CX + o * 5},${BASE + 10} ${ex},${BASE + 8} ${ex},${BASE + 28}`, stroke: cfg.barkA, 'stroke-width': 1.4, fill: 'none', opacity: .85 }, bG);
      el('circle', { cx: ex, cy: BASE + 28, r: 2.2, fill: i % 3 ? '#4fd6ff' : cfg.ring }, sG);
    }
    // projector
    const BY = 540;
    el('path', { d: `M${CX - 125},${BY} L${CX - 26},${BASE - 34} L${CX + 26},${BASE - 34} L${CX + 125},${BY} Z`, fill: 'url(#tbeam)', opacity: .3 }, svg);
    [[140, 22, .25], [116, 17, .5], [86, 12, .8], [52, 7, 1]].forEach(([rx, ry, o], i) =>
      el('ellipse', { cx: CX, cy: BY + i * 5, rx, ry, fill: 'none', stroke: i % 2 ? cfg.ring : '#4fd6ff', 'stroke-width': i === 3 ? 2.2 : 1.3, opacity: o, filter: 'url(#tglow)' }, svg));
    el('ellipse', { cx: CX, cy: BY + 8, rx: 160, ry: 28, fill: '#1b8fd6', opacity: .25, filter: 'url(#tsoft)' }, svg);

    // falling leaves
    for (let i = 0; i < cfg.falling; i++) {
      const t = twigs[Math.floor(R() * twigs.length)];
      el('ellipse', { cx: t[0], cy: t[1], rx: 3, ry: 1.7, fill: lc[Math.floor(R() * lc.length)], class: 'falling',
        style: `--dx:${(R() - .3) * 90}px;--dy:${BASE - t[1] + 20}px;--rot:${360 + R() * 360}deg;--t:${7 + R() * 6}s;--d:${-R() * 12}s` }, svg);
    }
    // weather
    if (cfg.precip) {
      const pg = el('g', {}, svg), snow = cfg.precip === 'snow';
      for (let i = 0; i < (snow ? 50 : 70); i++) {
        const x = 90 + R() * 440, y = R() * 120;
        if (snow) el('circle', { cx: x, cy: y, r: 1 + R() * 1.6, fill: '#fff', opacity: .85, class: 'drop', style: `--t:${6 + R() * 5}s;--d:${-R() * 8}s` }, pg);
        else el('line', { x1: x, y1: y, x2: x - 2, y2: y + 10, stroke: '#8fdcff', 'stroke-width': 1, opacity: .7, class: 'drop', style: `--t:${1 + R() * .8}s;--d:${-R() * 2}s` }, pg);
      }
    }
    if (cfg.haze > 0) el('ellipse', { cx: CX, cy: CY + 20, rx: 250, ry: 260, fill: cfg.hazeColor, opacity: cfg.haze, filter: 'url(#tsoft)', 'pointer-events': 'none' }, svg);
  }

  window.drawTree = drawTree;
})();
