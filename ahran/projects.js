/* AHRAN · Projects — curated notes (data/projects.json) + live commits from GitHub. */
(function () {
  'use strict';
  const GH = 'wecoutez';
  const STAGES = ['기획', '개발', '런칭', '운영'];
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ahran.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ahran.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  const kdate = iso => { const d = new Date(iso); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`; };
  const ago = iso => { const d = (Date.now() - new Date(iso)) / 864e5; return d < 1 ? '오늘' : d < 2 ? '어제' : d < 31 ? Math.floor(d) + '일 전' : Math.floor(d / 30) + '달 전'; };
  const NOISE = /^(Add files via upload|Update CNAME|Create CNAME|Delete |Rename |Merge pull request|Merge branch|clean|clear)/i;

  async function commits(repo, path) {
    const key = 'cache.commits.' + repo + (path ? ':' + path : ''), c = store.get(key);
    if (c && Date.now() - c.t < 30 * 6e4) return c.v;
    try {
      const r = await fetch(`https://api.github.com/repos/${GH}/${repo}/commits?per_page=40${path ? '&path=' + encodeURIComponent(path) : ''}`);
      if (!r.ok) throw new Error(r.status);
      const v = (await r.json()).map(x => ({ msg: x.commit.message.split('\n')[0], date: x.commit.author.date, url: x.html_url }));
      store.set(key, { t: Date.now(), v }); return v;
    } catch (e) { return c ? c.v : null; }
  }

  function stepper(stage) {
    return `<div class="stepper">${STAGES.map((s, i) => `<span class="${i < stage ? 'done' : i === stage ? 'now' : ''}"><i></i>${s}</span>`).join('')}</div>`;
  }

  function card(p, log) {
    const mine = p.id === 'ahran' ? log && log.filter(c => /^AHRAN|dashboard at \/ahran/.test(c.msg)) : log && log.filter(c => !/^AHRAN|dashboard at \/ahran/.test(c.msg));
    const last = mine && mine[0] ? mine[0].date : null;
    const real = mine ? mine.filter(c => !NOISE.test(c.msg)).slice(0, 6) : [];
    const uploads = mine ? mine.filter(c => /^Add files via upload/.test(c.msg)).length : 0;
    const fresh = last && (Date.now() - new Date(last)) / 864e5 < 2;
    const recent = mine == null ? '<div class="empty">GitHub에서 불러오지 못했어요</div>'
      : (real.length ? real.map(c => `<a class="cm" href="${esc(c.url)}" target="_blank" rel="noopener"><time>${kdate(c.date)}</time><span>${esc(c.msg)}</span></a>`).join('') : '')
        + (uploads ? `<div class="cm dim"><time></time><span>GitHub 웹에서 파일 직접 업로드 ${uploads}건${real.length ? '' : ' (설명 없는 업데이트)'}</span></div>` : '');
    return `<section class="panel pj" id="${esc(p.id || p.repo)}">
      <div class="pj-head">
        <div>
          <div class="pj-kind">${esc(p.kind)}</div>
          <h2>${esc(p.name)}</h2>
          <a class="pj-url" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))} ↗</a>
        </div>
        <div class="pj-meta">
          <span class="pj-live ${fresh ? 'gr' : ''}">● ${last ? '마지막 업데이트 ' + ago(last) : '—'}</span>
          <span class="dim">시작 ${esc(p.started.replace(/-/g, '.'))} · ${mine ? mine.length + '+ 커밋' : ''}</span>
        </div>
      </div>
      ${stepper(p.stage)}
      <p class="pj-sum">${esc(p.summary)}</p>
      <div class="pj-cols">
        <div><h3>지금까지</h3><ol class="tl">${p.milestones.slice().reverse().map(m => `<li><time>${esc(m.date.slice(5).replace('-', '.'))}</time><span>${esc(m.text)}</span></li>`).join('')}</ol></div>
        <div><h3>최근 작업 기록 <small>GitHub</small></h3>${recent}</div>
        <div><h3>다음 할 일</h3><ul class="nx">${p.next.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>
      </div>
      ${p.staff && p.staff.length ? `<div class="staff"><h3>AI 직원 <small>${p.staff.length}명</small></h3><div class="staff-row">${p.staff.map(st => `<div class="st"><span class="st-no">${esc(st.id)}</span><b>${esc(st.name)}</b><p>${esc(st.role)}</p><small>${esc(st.schedule)}</small><em>${esc(st.status)}</em></div>`).join('')}</div></div>` : ''}
    </section>`;
  }

  // ---------------------------------------------------------------- mind map
  const W = 1200, H = 780, CX = 600, CY = 360, RX = 440, RY = 272, HUB = 96, NODE = 60;
  const STAGE_C = ['#8fb0c4', '#a896ff', '#ff9d3c', '#4fd6ff'];
  const ownLog = (p, log) => log && log.filter(c => (p.id === 'ahran') === /^AHRAN|dashboard at \/ahran/.test(c.msg));
  let items = [], subs = [], selected = null;

  function drawSvg() {
    const svg = $('#mmSvg');
    let h = `<defs>
      <filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
      <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fd6ff" stop-opacity="0"/><stop offset=".45" stop-color="#4fd6ff" stop-opacity=".35"/><stop offset="1" stop-color="#4fd6ff" stop-opacity=".05"/></linearGradient>
    </defs>`;
    // light beam + code rain behind the hub
    h += `<rect x="${CX - 26}" y="0" width="52" height="${H - 60}" fill="url(#beam)" filter="url(#soft)"/><rect x="${CX - 1.5}" y="0" width="3" height="${CY - HUB}" fill="#bff1ff" opacity=".5"/>`;
    for (let i = 0; i < 70; i++) { const x = CX + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 150, y = Math.abs(Math.cos(i * 78.233) * 12345.678 % 1) * (CY - 40); h += `<rect class="rain" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="1.6" height="${(4 + (i % 5) * 3)}" fill="#4fd6ff" opacity="${(.15 + (i % 4) * .12).toFixed(2)}" style="--d:${-(i % 9) * .6}s"/>`; }
    // orbit + hub rings
    h += `<ellipse cx="${CX}" cy="${CY}" rx="${RX}" ry="${RY}" fill="none" stroke="rgba(79,214,255,.12)" stroke-dasharray="2 8"/>`;
    h += `<circle cx="${CX}" cy="${CY}" r="${HUB + 40}" fill="#1b8fd6" opacity=".22" filter="url(#soft)"/>`;
    h += `<g class="spin-hub"><circle cx="${CX}" cy="${CY}" r="${HUB + 22}" fill="none" stroke="rgba(79,214,255,.35)" stroke-dasharray="3 7"/>`;
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2, r1 = HUB + 12, r2 = r1 + (i % 6 ? 3 : 7); h += `<line x1="${CX + Math.cos(a) * r1}" y1="${CY + Math.sin(a) * r1}" x2="${CX + Math.cos(a) * r2}" y2="${CY + Math.sin(a) * r2}" stroke="#4fd6ff" opacity="${i % 6 ? .35 : .8}"/>`; }
    h += `</g><circle cx="${CX}" cy="${CY}" r="${HUB + 2}" fill="none" stroke="#4fd6ff" stroke-width="2.5" filter="url(#g)"/>`;
    // connectors
    items.forEach((it, i) => {
      const dx = it.x - CX, dy = it.y - CY, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const x1 = CX + ux * (HUB + 26), y1 = CY + uy * (HUB + 26), x2 = it.x - ux * (NODE + 10), y2 = it.y - uy * (NODE + 10);
      const c = STAGE_C[it.p.stage], on = selected === i;
      h += `<path id="ln${i}" d="M${x1},${y1} L${x2},${y2}" stroke="${c}" stroke-width="${on ? 2.4 : 1.4}" opacity="${it.fresh || on ? .95 : .45}" fill="none" filter="url(#g)"/>`;
      h += `<path d="M${x1},${y1} L${x2},${y2}" stroke="#e9fbff" stroke-width="1" fill="none" class="flow" opacity="${it.fresh ? .8 : .25}"/>`;
      h += `<circle cx="${x1}" cy="${y1}" r="3" fill="${c}"/><circle cx="${x2}" cy="${y2}" r="3.5" fill="${c}" filter="url(#g)"/>`;
      if (it.fresh) h += `<circle r="3.2" fill="#fff" filter="url(#g)"><animateMotion dur="${2.2 + i * .25}s" repeatCount="indefinite"><mpath href="#ln${i}"/></animateMotion></circle>`;
    });
    subs.forEach((sb, k) => {
      const c = STAGE_C[sb.p.stage], par = items[sb.parent], dx = sb.x - par.x, dy = sb.y - par.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      h += `<path d="M${par.x + ux * (NODE + 4)},${par.y + uy * (NODE + 4)} L${sb.x - ux * 34},${sb.y - uy * 34}" stroke="${c}" stroke-width="1.2" stroke-dasharray="3 5" opacity=".8" fill="none" filter="url(#g)"/>`;
    });
    // projector under the hub
    const BY = H - 44;
    [[210, 26, .2], [168, 20, .4], [122, 14, .7], [74, 8, 1]].forEach(([rx, ry, o], i) => { h += `<ellipse cx="${CX}" cy="${BY + i * 4}" rx="${rx}" ry="${ry}" fill="none" stroke="${i % 2 ? '#ff9d3c' : '#4fd6ff'}" stroke-width="${i === 3 ? 2.2 : 1.2}" opacity="${o}" filter="url(#g)"/>`; });
    h += `<ellipse cx="${CX}" cy="${BY + 6}" rx="240" ry="34" fill="#1b8fd6" opacity=".22" filter="url(#soft)"/><rect x="${CX - 1}" y="${CY + HUB + 26}" width="2" height="${BY - CY - HUB - 30}" fill="#4fd6ff" opacity=".45"/>`;
    svg.innerHTML = h;
  }

  function drawNodes() {
    $('#mmNodes').innerHTML = items.map((it, i) => {
      const c = STAGE_C[it.p.stage], dots = Math.min(10, it.week);
      const sat = Array.from({ length: dots }, (_, k) => { const a = -Math.PI / 2 + k / 10 * Math.PI * 2; return `<i style="left:${50 + Math.cos(a) * 58}%;top:${50 + Math.sin(a) * 58}%"></i>`; }).join('');
      const where = it.y < 200 ? 'top' : it.x < CX - 200 ? 'left' : it.x > CX + 200 ? 'right' : 'bottom';
      return `<button class="mm-node ${it.fresh ? 'fresh' : ''} ${selected === i ? 'sel' : ''}" data-i="${i}" style="left:${it.x / W * 100}%;top:${it.y / H * 100}%;--c:${c}" type="button">
        <span class="orb">${sat}<b>${esc(it.p.short)}</b><small>${STAGES[it.p.stage]}</small></span>
        <span class="cap ${where}"><em>${esc(it.p.kind.split('·').pop().trim())}</em>${esc(it.p.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}<span class="${it.fresh ? 'gr' : 'dim'}">● ${it.last.getTime() ? ago(it.last.toISOString()) : '—'}</span></span>
      </button>`;
    }).join('') + subs.map((sb, k) => `<button class="mm-node sub ${selected === 's' + k ? 'sel' : ''}" data-s="${k}" style="left:${sb.x / W * 100}%;top:${sb.y / H * 100}%;--c:${STAGE_C[sb.p.stage]}" type="button">
        <span class="orb"><b>${esc(sb.p.short)}</b><small>${STAGES[sb.p.stage]}</small></span>
        <span class="cap ${sb.y > items[sb.parent].y ? 'bottom' : 'top'}"><em>${esc(sb.p.kind.split('·')[0].trim())}</em>${esc(sb.p.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</span>
      </button>`).join('');
  }

  // detail opens as a floating 90% sheet over the map
  function openModal() {
    const m = $('#pjModal'); m.hidden = false; document.body.classList.add('modal-open');
    $('#pjSheet').scrollTop = 0; $('#pjClose').focus({ preventScroll: true });
  }
  function closeModal() {
    $('#pjModal').hidden = true; document.body.classList.remove('modal-open');
    selected = null; drawSvg(); drawNodes();
    if (location.hash) history.replaceState(null, '', location.pathname);
  }
  function showDetail(all) {
    const list = all ? items : [items[selected]];
    const nav = all ? `<div class="pj-nav"><span class="hud-t">ALL SITES · ${items.length}</span></div>`
      : `<div class="pj-nav"><button type="button" data-step="-1" aria-label="이전 사이트">←</button><span class="hud-t">${selected + 1} / ${items.length}</span><button type="button" data-step="1" aria-label="다음 사이트">→</button><button type="button" class="all" id="showAll">전체 보기</button></div>`;
    $('#pjDetail').innerHTML = nav + list.map(it => card(it.p, it.log)).join('');
    openModal();
  }
  function select(i) {
    selected = (i + items.length) % items.length; drawSvg(); drawNodes(); showDetail(false);
  }
  function showSub(k) {
    selected = 's' + k; drawSvg(); drawNodes();
    const sb = subs[k], par = items[sb.parent];
    $('#pjDetail').innerHTML = `<div class="pj-nav"><button type="button" class="all" data-parent="${sb.parent}">← ${esc(par.p.short)}</button><span class="hud-t">SUB · ${esc(par.p.short)}</span></div>` + card(sb.p, sb.log);
    openModal();
  }
  function showAll() { selected = null; drawSvg(); drawNodes(); showDetail(true); }

  async function render() {
    const d = await (await fetch('data/projects.json', { cache: 'no-store' })).json();
    const repos = [...new Set(d.projects.map(p => p.repo))];
    const logs = Object.fromEntries(await Promise.all(repos.map(async r => [r, await commits(r)])));
    items = d.projects.map(p => { const l = logs[p.repo], own = ownLog(p, l); const last = own && own[0] ? new Date(own[0].date) : new Date(0);
      return { p, log: l, last, fresh: (Date.now() - last) / 864e5 < 1, week: own ? own.filter(c => (Date.now() - new Date(c.date)) / 864e5 < 7).length : 0 }; })
      .sort((a, b) => b.last - a.last);
    items.forEach((it, i) => { const a = -Math.PI / 2 + i / items.length * Math.PI * 2; it.x = CX + Math.cos(a) * RX; it.y = CY + Math.sin(a) * RY; });
    subs = [];
    for (const [pi, it] of items.entries()) for (const sp of (it.p.subs || [])) {
      const log = await commits(it.p.repo, sp.path);
      const a = Math.atan2(it.y - CY, it.x - CX) + (it.x > CX ? -0.95 : 0.95), dist = 150;
      let x = it.x + Math.cos(a) * dist, y = it.y + Math.sin(a) * dist;
      x = Math.max(70, Math.min(W - 70, x)); y = Math.max(70, Math.min(H - 90, y));
      subs.push({ p: sp, parent: pi, log, x, y });
    }
    const live = d.projects.filter(p => p.stage === 3).length, launch = d.projects.filter(p => p.stage === 2).length, today = items.filter(x => x.fresh).length;
    $('#pjCount').innerHTML = `${d.projects.length}<span> SITES</span>`;
    $('#pjSub').textContent = `정리 기준일 ${d.updated.replace(/-/g, '.')}`;
    $('#mmHubSub').textContent = `${d.projects.length} SITES · 오늘 ${today}`;
    $('#pjStats').innerHTML = [['운영 중', live, STAGE_C[3]], ['런칭 단계', launch, STAGE_C[2]], ['오늘 작업한 사이트', today, '#3ddc97']].map(([k, v, c]) => `<div><b>${v}</b><span><i style="background:${c}"></i>${k}</span></div>`).join('');
    const hash = decodeURIComponent(location.hash.slice(1)), hi = items.findIndex(it => (it.p.id || it.p.repo) === hash);
    drawSvg(); drawNodes();
    if (hi >= 0) select(hi);
    $('#mmNodes').addEventListener('click', e => { const n = e.target.closest('.mm-node'); if (!n) return; if (n.dataset.s != null) showSub(+n.dataset.s); else select(+n.dataset.i); });
    $('#mmHub').addEventListener('click', showAll);
    $('#pjModal').addEventListener('click', e => {
      if (e.target.id === 'pjModal' || e.target.closest('#pjClose')) return closeModal();
      const st = e.target.closest('[data-step]'); if (st) return select(selected + +st.dataset.step);
      const pa = e.target.closest('[data-parent]'); if (pa) return select(+pa.dataset.parent);
      if (e.target.closest('#showAll')) showAll();
    });
    document.addEventListener('keydown', e => {
      if ($('#pjModal').hidden) return;
      if (e.key === 'Escape') closeModal();
      else if (typeof selected === 'number' && e.key === 'ArrowRight') select(selected + 1);
      else if (typeof selected === 'number' && e.key === 'ArrowLeft') select(selected - 1);
    });
  }

  $('#lockBtn').addEventListener('click', e => { e.preventDefault(); window.AhranLock.lockNow(); });
  window.AhranLock.gate().then(render);
})();
