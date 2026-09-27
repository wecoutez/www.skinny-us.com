// Holographic full-body figures (front view) for the Today page.
// drawBodies(svg, people): each person {name, sex:'f'|'m', age, x, color, score}
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  // right half of an adult outline, offsets from the centre line, in a 0..520 tall box
  const HALF = {
    f: [[11, 70], [13, 86], [36, 93], [48, 101], [54, 122], [58, 170], [63, 214], [70, 256], [74, 270], [69, 290], [59, 280], [57, 260], [50, 216], [43, 172], [37, 132], [35, 160], [28, 196], [36, 232], [42, 262], [38, 330], [31, 400], [29, 468], [25, 503], [33, 520], [8, 520], [10, 503], [11, 468], [11, 400], [7, 300], [0, 276]],
    m: [[13, 70], [15, 86], [44, 93], [56, 102], [62, 124], [66, 172], [70, 216], [76, 258], [80, 272], [75, 292], [64, 282], [62, 262], [56, 218], [49, 174], [42, 134], [40, 164], [36, 200], [38, 234], [40, 262], [37, 330], [32, 400], [30, 468], [26, 503], [34, 520], [8, 520], [10, 503], [12, 468], [12, 400], [8, 300], [0, 274]],
  };
  const el = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };

  function outline(sex) {
    const r = HALF[sex] || HALF.f, l = r.slice().reverse().map(([x, y]) => [-x, y]);
    const pts = r.concat(l.slice(1));
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      d += ` Q${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`;
    }
    return d + ' Z';
  }

  // Height as share of an adult, and head size ratio, by age
  function proportions(age) {
    if (age == null) return { h: 1, head: 1 };
    const a = Math.max(0, Math.min(20, age));
    const h = a >= 18 ? 1 : 0.42 + a * 0.032;
    const head = a >= 18 ? 1 : 1.32 - a * 0.018;
    return { h, head };
  }

  // sitting cat (front view), 0..260 tall, centred on x=0
  function drawCat(root, c, eye) {
    const body = 'M-24 92 C-44 118 -64 170 -64 214 C-64 236 -58 250 -44 252 L44 252 C58 250 64 236 64 214 C64 170 44 118 24 92 Z';
    el('ellipse', { cx: 0, cy: 256, rx: 88, ry: 11, fill: c, opacity: .35, filter: 'url(#bsoft)' }, root);
    el('ellipse', { cx: 0, cy: 256, rx: 60, ry: 6, fill: 'none', stroke: c, 'stroke-width': 1.5, opacity: .8 }, root);
    el('path', { d: 'M52 240 C96 252 112 214 98 186 C90 170 76 170 74 182', fill: 'none', stroke: c, 'stroke-width': 9, 'stroke-linecap': 'round', opacity: .35 }, root);
    el('path', { d: 'M52 240 C96 252 112 214 98 186 C90 170 76 170 74 182', fill: 'none', stroke: c, 'stroke-width': 1.6, filter: 'url(#bglow)' }, root);
    el('path', { d: body, fill: 'url(#catfill)', stroke: c, 'stroke-width': 1.6, filter: 'url(#bglow)' }, root);
    el('path', { d: 'M-40 32 L-44 -10 L-12 20 Z M40 32 L44 -10 L12 20 Z', fill: 'url(#catfill)', stroke: c, 'stroke-width': 1.6, 'stroke-linejoin': 'round', filter: 'url(#bglow)' }, root);
    el('ellipse', { cx: 0, cy: 58, rx: 44, ry: 38, fill: 'url(#catfill)', stroke: c, 'stroke-width': 1.6, filter: 'url(#bglow)' }, root);
    const sk = el('g', { stroke: c, fill: 'none', opacity: .5, 'stroke-width': 1 }, root);
    for (let i = 0; i < 5; i++) { const y = 124 + i * 13, w = 30 - Math.abs(i - 2) * 3; el('path', { d: `M-2 ${y} Q${-w} ${y + 3} ${-w + 5} ${y + 11} M2 ${y} Q${w} ${y + 3} ${w - 5} ${y + 11}` }, sk); }
    el('path', { d: 'M-18 180 V250 M18 180 V250', 'stroke-dasharray': '3 4' }, sk);
    el('path', { d: 'M-30 66 L-62 60 M-30 70 L-62 72 M30 66 L62 60 M30 70 L62 72', opacity: .8 }, sk);
    el('path', { d: 'M-4 70 L4 70 L0 75 Z', fill: '#ff9db0', stroke: 'none' }, root);
    [[-16, 54], [16, 54]].forEach(([x, y]) => { el('ellipse', { cx: x, cy: y, rx: 8, ry: 6, fill: eye, filter: 'url(#bglow)' }, root); el('ellipse', { cx: x, cy: y, rx: 1.6, ry: 5, fill: '#04101d' }, root); });
    const dots = el('g', { filter: 'url(#bglow)' }, root);
    [[-18, 250], [18, 250], [-44, 214], [44, 214]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 3, fill: c }, dots));
    el('circle', { cx: 6, cy: 146, r: 6, fill: '#ff6b7d', opacity: .9, class: 'pulse' }, dots);
    for (let i = 0; i < 18; i++) { const x = (Math.sin(i * 91.7) * 43758.5453 % 1) * 50, y = 40 + Math.abs(Math.cos(i * 33.1) * 1000 % 1) * 200; el('circle', { cx: x, cy: y, r: 1 + (i % 3) * .5, fill: '#e9fbff', opacity: .5, class: 'tw', style: `--t:${2 + (i % 4)}s;--d:${-(i % 5)}s` }, root); }
  }

  function drawBodies(svg, people, H) {
    svg.innerHTML = '';
    H = H || 600;
    const defs = el('defs', {}, svg);
    const g = el('filter', { id: 'bglow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: 2.4, result: 'b' }, g);
    const m = el('feMerge', {}, g); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);
    const soft = el('filter', { id: 'bsoft', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs); el('feGaussianBlur', { stdDeviation: 10 }, soft);

    const cg = el('linearGradient', { id: 'catfill', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    people.forEach((p, idx) => {
      const c = p.color || '#4fd6ff';
      if (p.kind === 'cat') {
        el('stop', { offset: 0, 'stop-color': c, 'stop-opacity': .32 }, cg); el('stop', { offset: 1, 'stop-color': c, 'stop-opacity': .08 }, cg);
        const scale = (H - 70) / 520 * 0.9 * 1.05, baseY = H - 38;
        const root = el('g', { transform: `translate(${p.x},${baseY - 256 * scale}) scale(${scale})` }, svg);
        drawCat(root, c, p.eye || '#5fe3a1');
        p.anchor = { top: baseY - (256 + 10) * scale };
        return;
      }
      const pr = proportions(p.age);
      const scale = (H - 70) / 520 * 0.9 * pr.h, baseY = H - 38;
      const grad = el('linearGradient', { id: 'bfill' + idx, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el('stop', { offset: 0, 'stop-color': c, 'stop-opacity': .28 }, grad); el('stop', { offset: 1, 'stop-color': c, 'stop-opacity': .06 }, grad);
      const root = el('g', { transform: `translate(${p.x},${baseY - 520 * scale}) scale(${scale})` }, svg);
      // floor glow
      el('ellipse', { cx: 0, cy: 522, rx: 70, ry: 10, fill: c, opacity: .35, filter: 'url(#bsoft)' }, root);
      el('ellipse', { cx: 0, cy: 522, rx: 46, ry: 5, fill: 'none', stroke: c, 'stroke-width': 1.5, opacity: .8 }, root);
      // body
      el('path', { d: outline(p.sex), fill: `url(#bfill${idx})`, stroke: c, 'stroke-width': 1.6, filter: 'url(#bglow)' }, root);
      const hr = 26 * pr.head;
      el('ellipse', { cx: 0, cy: 70 - hr * 1.05, rx: hr * .86, ry: hr * 1.06, fill: `url(#bfill${idx})`, stroke: c, 'stroke-width': 1.6, filter: 'url(#bglow)' }, root);
      // skeleton: spine, ribs, pelvis, collarbones
      const sk = el('g', { stroke: c, fill: 'none', opacity: .55, 'stroke-width': 1 }, root);
      el('path', { d: 'M0 76 V270', 'stroke-dasharray': '3 4' }, sk);
      for (let i = 0; i < 6; i++) { const y = 112 + i * 14, w = 30 - Math.abs(i - 2) * 2.5; el('path', { d: `M-2 ${y} Q${-w} ${y + 3} ${-w + 4} ${y + 12} M2 ${y} Q${w} ${y + 3} ${w - 4} ${y + 12}` }, sk); }
      el('path', { d: 'M-8 92 L-40 96 M8 92 L40 96' }, sk);
      el('path', { d: 'M-30 250 Q-34 272 -12 280 Q0 270 12 280 Q34 272 30 250' }, sk);
      // limbs centre lines
      el('path', { d: 'M-46 100 L-56 170 L-66 256 M46 100 L56 170 L66 256 M-20 282 L-22 400 L-20 505 M20 282 L22 400 L20 505', opacity: .6, 'stroke-dasharray': '2 5' }, sk);
      // joints + organs
      const dots = el('g', { filter: 'url(#bglow)' }, root);
      [[-46, 100], [46, 100], [-56, 170], [56, 170], [-66, 256], [66, 256], [-22, 400], [22, 400], [-20, 505], [20, 505]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 3.2, fill: c, opacity: .9 }, dots));
      el('circle', { cx: 8, cy: 128, r: 7, fill: '#ff6b7d', opacity: .9, class: 'pulse' }, dots); // heart
      el('circle', { cx: 0, cy: 70 - hr * 1.15, r: hr * .45, fill: c, opacity: .22 }, dots); // brain glow
      el('path', { d: 'M-24 120 Q-30 150 -18 172 Q-8 160 -8 124 Z M24 120 Q30 150 18 172 Q8 160 8 124 Z', fill: c, opacity: .12, stroke: c, 'stroke-opacity': .4 }, root); // lungs
      // particles
      for (let i = 0; i < 26; i++) {
        const x = (Math.sin((i + idx * 7) * 12.9898) * 43758.5453 % 1) * 60, y = 90 + Math.abs(Math.cos((i + idx) * 78.233) * 1000 % 1) * 400;
        el('circle', { cx: x, cy: y, r: 1 + (i % 3) * .6, fill: '#e9fbff', opacity: .55, class: 'tw', style: `--t:${2 + (i % 4)}s;--d:${-(i % 5)}s` }, root);
      }
      // anchors (in svg coords) for the HTML call-outs
      p.anchor = { head: [p.x, baseY - (520 - (70 - hr)) * scale], heart: [p.x + 8 * scale, baseY - (520 - 128) * scale], feet: [p.x, baseY], top: baseY - (520 - (70 - hr * 2.1)) * scale };
    });
    return people;
  }

  window.drawBodies = drawBodies;
})();
