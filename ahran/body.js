// Holographic full-body figures (front view) for the Today page.
// drawBodies(svg, people): each person {name, sex:'f'|'m', age, x, color, score}
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  // right half of an adult outline (x offset from centre, y) in a 0..520 box, neck to crotch
  const HALF = {
    f: [[9, 66], [10, 80], [22, 86], [34, 90], [42, 96], [46, 106], [48, 125], [49, 150], [50, 172], [54, 200], [58, 228], [61, 250], [65, 262], [66, 276], [62, 290], [57, 294], [53, 286], [52, 270], [51, 252], [46, 226], [42, 196], [40, 172], [38, 150], [36, 128], [33, 118], [32, 134], [33, 146], [29, 160], [24, 186], [28, 210], [36, 238], [38, 258], [36, 300], [31, 345], [27, 380], [26, 396], [27, 425], [24, 460], [18, 492], [21, 505], [24, 515], [18, 520], [6, 520], [5, 508], [7, 492], [9, 455], [10, 420], [8, 392], [9, 378], [7, 330], [4, 290], [0, 272]],
    m: [[11, 66], [12, 80], [26, 86], [40, 90], [50, 97], [54, 108], [56, 128], [57, 152], [57, 174], [61, 202], [65, 230], [68, 252], [72, 264], [73, 278], [69, 292], [63, 296], [59, 288], [58, 272], [57, 254], [52, 228], [48, 198], [46, 174], [44, 152], [42, 130], [39, 120], [38, 140], [36, 170], [32, 196], [33, 220], [36, 244], [38, 262], [37, 305], [33, 348], [29, 382], [28, 398], [29, 428], [26, 462], [19, 494], [22, 506], [25, 516], [19, 520], [6, 520], [5, 508], [8, 494], [10, 458], [11, 422], [9, 394], [10, 380], [8, 332], [5, 292], [0, 274]],
  };
  const el = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };

  // closed Catmull-Rom spline through the mirrored outline -> smooth cubic path
  function outline(sex) {
    const r = HALF[sex] || HALF.f, l = r.slice(0, -1).reverse().map(([x, y]) => [-x, y]);
    const P = r.concat(l), n = P.length, t = 0.5;
    let d = `M${P[0][0]},${P[0][1]}`;
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3], c2 = [p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
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
        const scale = (H - 70) / 520 * 0.9 * 0.62, baseY = H - 38;
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
      const warn = p.warn || {}, RED = '#ff6b7d';
      el('ellipse', { cx: 0, cy: 522, rx: 70, ry: 10, fill: c, opacity: .35, filter: 'url(#bsoft)' }, root);
      el('ellipse', { cx: 0, cy: 522, rx: 46, ry: 5, fill: 'none', stroke: c, 'stroke-width': 1.5, opacity: .8 }, root);
      const hr = 21 * pr.head, hy = 66 - hr * 1.05;
      if (p.sex === 'f') el('path', { d: `M${-hr * 1.05} ${hy} C${-hr * 1.2} ${hy - hr * 1.5} ${hr * 1.2} ${hy - hr * 1.5} ${hr * 1.05} ${hy} C${hr * 1.25} ${hy + hr * .9} ${hr * 1.3} ${hy + hr * 1.9} ${hr * 1.15} ${hy + hr * 2.3} L${-hr * 1.15} ${hy + hr * 2.3} C${-hr * 1.3} ${hy + hr * 1.9} ${-hr * 1.25} ${hy + hr * .9} ${-hr * 1.05} ${hy} Z`, fill: c, opacity: .14, stroke: c, 'stroke-opacity': .5, 'stroke-width': 1 }, root);
      el('path', { d: outline(p.sex), fill: `url(#bfill${idx})`, stroke: c, 'stroke-width': 1.4, 'stroke-linejoin': 'round', filter: 'url(#bglow)' }, root);
      el('ellipse', { cx: 0, cy: hy, rx: hr * .82, ry: hr * 1.02, fill: `url(#bfill${idx})`, stroke: warn.head ? RED : c, 'stroke-width': 1.4, filter: 'url(#bglow)' }, root);
      if (p.sex === 'f') el('path', { d: `M${-hr * .84} ${hy - hr * .1} C${-hr * .7} ${hy - hr * 1.05} ${hr * .5} ${hy - hr * 1.15} ${hr * .84} ${hy - hr * .2} C${hr * .4} ${hy - hr * .7} ${-hr * .3} ${hy - hr * .75} ${-hr * .84} ${hy - hr * .1} Z`, fill: c, opacity: .35 }, root);
      // face
      const fc = el('g', { stroke: c, fill: 'none', 'stroke-width': .9, opacity: .75 }, root);
      el('path', { d: `M${-hr * .42} ${hy + hr * .05} q${hr * .14} ${-hr * .08} ${hr * .26} 0 M${hr * .16} ${hy + hr * .05} q${hr * .14} ${-hr * .08} ${hr * .26} 0 M0 ${hy + hr * .15} l${-hr * .06} ${hr * .3} l${hr * .1} 0 M${-hr * .18} ${hy + hr * .62} q${hr * .18} ${hr * .1} ${hr * .36} 0` }, fc);
      // brain network
      const bn = el('g', { stroke: warn.head ? RED : c, 'stroke-width': .6, opacity: warn.head ? .9 : .5 }, root);
      const nodes = [[-.45, -.45], [-.1, -.7], [.3, -.55], [.5, -.2], [-.5, -.1], [.05, -.3], [-.2, .0], [.25, .05]].map(([x, y]) => [x * hr, hy + y * hr]);
      [[0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [5, 2], [4, 6], [6, 5], [5, 7], [7, 3], [6, 7]].forEach(([a1, b1]) => el('line', { x1: nodes[a1][0], y1: nodes[a1][1], x2: nodes[b1][0], y2: nodes[b1][1] }, bn));
      nodes.forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 1.3, fill: warn.head ? RED : '#e9fbff', stroke: 'none' }, bn));
      // skeleton
      const sk = el('g', { stroke: c, fill: 'none', opacity: .5, 'stroke-width': .9, 'stroke-linecap': 'round' }, root);
      el('path', { d: 'M-6 88 Q-20 84 -40 94 M6 88 Q20 84 40 94' }, sk);
      el('path', { d: 'M0 92 V150' }, sk);
      el('path', { d: 'M0 72 V262', 'stroke-dasharray': '2 3', opacity: .9 }, sk);
      for (let i = 0; i < 8; i++) { const y = 100 + i * 9.5, w = 27 - Math.abs(i - 3) * 1.6 - (i > 5 ? 3 : 0); el('path', { d: `M-1 ${y} C${-w * .6} ${y - 2} ${-w} ${y + 3} ${-w + 3} ${y + 12} M1 ${y} C${w * .6} ${y - 2} ${w} ${y + 3} ${w - 3} ${y + 12}` }, sk); }
      el('path', { d: 'M-30 236 C-36 252 -24 268 -8 268 Q0 262 8 268 C24 268 36 252 30 236 M-30 236 Q-16 246 0 244 Q16 246 30 236' }, sk);
      el('path', { d: 'M-44 100 L-47 168 M44 100 L47 168 M-48 176 L-57 246 M-45 177 L-53 247 M48 176 L57 246 M45 177 L53 247' }, sk);
      el('path', { d: 'M-20 262 L-24 382 M20 262 L24 382 M-23 398 L-18 488 M-20 398 L-15 488 M23 398 L18 488 M20 398 L15 488' }, sk);
      // lungs + heart
      el('path', { d: 'M-5 104 C-20 104 -27 124 -25 150 C-24 166 -12 170 -6 160 Z M5 104 C20 104 27 124 25 150 C24 166 12 170 6 160 Z', fill: c, opacity: .1, stroke: c, 'stroke-opacity': .45, 'stroke-width': .8 }, root);
      const hc = warn.heart ? RED : '#ff6b7d';
      el('path', { d: 'M6 124 c-3 -5 -10 -3 -9 3 c1 5 9 9 9 9 c0 0 8 -4 9 -9 c1 -6 -6 -8 -9 -3 Z', fill: hc, opacity: .9, class: 'pulse', filter: 'url(#bglow)' }, root);
      // joints
      const dots = el('g', { filter: 'url(#bglow)' }, root);
      const J = [[-44, 100], [44, 100], [-48, 172], [48, 172], [-58, 250], [58, 250], [-22, 258], [22, 258], [-25, 390], [25, 390], [-16, 490], [16, 490], [0, 240]];
      J.forEach(([x, y], k) => { const hot = warn.joints && (k >= 6); el('circle', { cx: x, cy: y, r: hot ? 4.2 : 2.8, fill: hot ? RED : c, opacity: .95, class: hot ? 'pulse' : '' }, dots); });
      // particles
      for (let i = 0; i < 30; i++) {
        const x = (Math.sin((i + idx * 7) * 12.9898) * 43758.5453 % 1) * 55, y = 90 + Math.abs(Math.cos((i + idx) * 78.233) * 1000 % 1) * 400;
        el('circle', { cx: x, cy: y, r: .8 + (i % 3) * .5, fill: '#e9fbff', opacity: .5, class: 'tw', style: `--t:${2 + (i % 4)}s;--d:${-(i % 5)}s` }, root);
      }
      // anchors (in svg coords) for the HTML call-outs
      p.anchor = { top: baseY - (520 - (hy - hr * 1.2)) * scale };
    });
    return people;
  }

  window.drawBodies = drawBodies;
})();
