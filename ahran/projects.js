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
    const real = mine ? mine.filter(c => !NOISE.test(c.msg)) : [];
    const uploads = mine ? mine.filter(c => /^Add files via upload/.test(c.msg)).length : 0;
    const fresh = last && (Date.now() - new Date(last)) / 864e5 < 2;
    const color = ['#8fb0c4', '#a896ff', '#ff9d3c', '#4fd6ff'][p.stage];
    const staff = p.staff || [];
    const chips = [
      `<span class="sc" style="--c:${color}">● ${STAGES[p.stage]} 단계</span>`,
      `<span class="sc ${fresh ? 'ok' : ''}">${last ? '업데이트 ' + ago(last) : '업데이트 기록 없음'}</span>`,
      `<span class="sc">할 일 ${p.next.length}개</span>`,
      staff.length ? `<span class="sc">AI 팀 ${staff.length}명</span>` : '',
    ].join('');
    const team = staff.length ? `<div class="team">${staff.map(st => `
        <div class="agent" role="button" tabindex="0" data-agent="${esc(p.id || p.repo)}|${esc(st.id)}" aria-label="${esc(st.person)} 업무 보기">
          ${face(st, color, 88)}
          <div class="who"><b>${esc(st.person || '')}</b><span class="ttl" style="--c:${color}">${esc(st.title || '')}${st.title2 ? ' · ' + esc(st.title2) : ''}</span>
          <span class="job">${esc(st.job || '')}</span><p>${esc(st.role)}</p><span class="more">할 일 ${(st.todo || []).length}개 보기 →</span><small>⏱ ${esc(String(st.schedule).replace(/^제안:\s*/, "").split(/ — | \(|\. 5회/)[0])}</small></div>
        </div>`).join('')}</div>` : (p.staff_note ? `<p class="team-note">${esc(p.staff_note)}</p>` : '');
    const tl = p.milestones.slice().reverse();
    const logRows = real.slice(0, 12).map(c => `<a class="cm" href="${esc(c.url)}" target="_blank" rel="noopener"><time>${kdate(c.date)}</time><span>${esc(c.msg)}</span></a>`).join('')
      + (uploads ? `<div class="cm dim"><time></time><span>GitHub 웹에서 파일 직접 업로드 ${uploads}건</span></div>` : '');
    return `<section class="panel pj" id="${esc(p.id || p.repo)}">
      <div class="pj-head">
        <div>
          <div class="pj-kind">${esc(p.kind)}</div>
          <h2>${esc(p.name)}</h2>
          <a class="pj-url" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))} ↗</a>
        </div>
        <div class="pj-chips">${chips}</div>
      </div>
      <p class="pj-sum">${esc(p.summary)}</p>
      ${team}
      <div class="pj-two">
        <div><h3>다음 할 일</h3><ol class="todo-list">${p.next.map(n => `<li>${esc(n)}</li>`).join('')}</ol></div>
        <div><h3>지금까지</h3><ol class="tl">${tl.slice(0, 5).map(m => `<li><time>${esc(m.date.slice(5).replace('-', '.'))}</time><span>${esc(m.text)}</span></li>`).join('')}</ol></div>
      </div>
      ${mine == null ? '<p class="team-note">GitHub 작업 기록을 불러오지 못했어요</p>' : `<details class="pj-log"><summary>GitHub 작업 기록 · ${real.length + uploads}건</summary><div>${logRows || '<div class="cm dim"><span>기록 없음</span></div>'}</div></details>`}
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
        <span class="orb has-ic">${sat}<img class="ic" src="img/pj/${esc(it.p.id || it.p.repo)}.webp?v=32" alt="" onerror="this.remove()"><b>${esc(it.p.short)}</b><small>${STAGES[it.p.stage]}</small></span>
        <span class="cap ${where}"><em>${esc(it.p.kind.split('·').pop().trim())}</em>${esc(it.p.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}<span class="${it.fresh ? 'gr' : 'dim'}">● ${it.last.getTime() ? ago(it.last.toISOString()) : '—'}</span></span>
      </button>`;
    }).join('') + subs.map((sb, k) => `<button class="mm-node sub ${selected === 's' + k ? 'sel' : ''}" data-s="${k}" style="left:${sb.x / W * 100}%;top:${sb.y / H * 100}%;--c:${STAGE_C[sb.p.stage]}" type="button">
        <span class="orb has-ic"><img class="ic" src="img/pj/phr.webp?v=32" alt="" onerror="this.remove()"><b>${esc(sb.p.short)}</b><small>${STAGES[sb.p.stage]}</small></span>
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
    bindAgents();
    openModal();
  }
  // direct handlers on each agent card (in addition to the delegated one)
  function bindAgents() {
    document.querySelectorAll('#pjDetail .agent[data-agent]').forEach(a => { a.onclick = ev => { ev.stopPropagation(); showAgent(a.dataset.agent); }; });
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
  const face = (st, color, size) => st.photo ? `<img class="avatar photo" src="${esc(st.photo)}?v=30" width="${size}" height="${size}" alt="${esc(st.person)}" style="--c:${color}" loading="lazy">` : window.ahranAvatar(st.avatar, color, size);
  let PK = null, DLV = [];
  const dlvFor = key => DLV.filter(x => x.key === key).sort((a, b) => (b.date + b.file).localeCompare(a.date + a.file));
  const KIT = 'https://claude.ai/artifact/EZ18A8mqCWAbgJMMs1Az4G';
  function askUrl(p, st, task) {
    const q = `너는 ${p.name}(${p.url})의 ${st.title}${st.title2 ? '(' + st.title2 + ')' : ''} ${st.person}이야. 직무: ${st.job}. 역할: ${st.role}\n규칙: 초안까지만 만들고 발송·게시·결제는 하지 않아. 모르는 사실은 [확인 필요]로 표시해.\n\n할 일: ${task}`;
    return 'https://claude.ai/new?q=' + encodeURIComponent(q);
  }
  function showAgent(key) {
    const [pk, sid] = key.split('|'), it = items.find(x => (x.p.id || x.p.repo) === pk); if (!it) return;
    const p = it.p, st = p.staff.find(x => x.id === sid), color = ['#8fb0c4', '#a896ff', '#ff9d3c', '#4fd6ff'][p.stage], back = items.indexOf(it);
    $('#pjDetail').innerHTML = `<div class="pj-nav"><button type="button" class="all" data-back="${back}">← ${esc(p.short)}</button><span class="hud-t">AI STAFF · ${esc(p.short)}</span></div>
      <section class="agent-page" style="--c:${color}">
        <div class="ap-head">${face(st, color, 128)}<div><span class="ttl">${esc(st.title)}${st.title2 ? ' · ' + esc(st.title2) : ''}</span><h2>${esc(st.person)}</h2><p class="job">${esc(st.job)} · ${esc(p.name)}</p><p>${esc(st.role)}</p><span class="stt">${esc(st.status)}</span></div></div>
        <div class="ap-grid">
          <div><h3>이번 주 할 일</h3><ol class="ap-todo">${(st.todo || []).map(t => `<li><span>${esc(t)}</span><a class="hbtn" href="${askUrl(p, st, t)}" target="_blank" rel="noopener">Claude에게 시키기 ↗</a></li>`).join('')}</ol>
            <form class="ap-ask" data-key="${esc(key)}"><label for="apTask">직접 일 시키기</label><textarea id="apTask" rows="3" placeholder="예: 이번 주 인스타 캡션 3개 더 써줘"></textarea><button class="hbtn" type="submit">Claude에게 보내기 ↗</button></form></div>
          <div><h3>맡은 업무</h3><ul class="ap-du">${(st.duties || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
            <h3>자동 딜리버리</h3><p class="dim">${st.deliver ? `<b class="gr">● 켜짐</b> · ${esc(st.deliver.label)} (한국시간)` : '예약 없음 · 필요할 때 직접 시키기'}</p>
            <h3>지키는 규칙</h3><ul class="ap-du"><li>초안까지만 · 발송·게시·결제는 직접</li><li>모르는 사실은 [확인 필요]로 표시</li><li>커넥터는 읽기 전용으로 시작</li></ul>
            <p class="dim ap-kit">더 정확하게 쓰려면 <a href="${KIT}" target="_blank" rel="noopener">세팅 키트</a>에서 이 직원의 프로젝트(지침·지식 파일)를 만들어 두세요.</p></div>
        </div>
        <div class="ap-dlv"><h3>받은 딜리버리 <span class="dim">${dlvFor(st.key).length}건</span></h3>${dlvFor(st.key).length ? `<ul>${dlvFor(st.key).map(x => `<li><button type="button" class="dlv" data-file="${esc(x.file)}"><span class="d">${esc(x.date.slice(5).replace('-', '/'))} ${esc(x.time || '')}</span><b>${esc(x.task)}</b><span class="op">열기 →</span></button><div class="dlv-body" hidden></div></li>`).join('')}</ul>` : `<p class="dim">아직 도착한 결과물이 없어요.${st.deliver ? ` 다음 예약: ${esc(st.deliver.label)}` : ''}</p>`}</div>
      </section>`;
    openModal();
  }
  async function openDelivery(btn) {
    const box = btn.nextElementSibling; if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false; box.innerHTML = '<p class="dim">여는 중…</p>';
    try {
      const x = await window.AhranLock.decryptJSON(PK, await (await fetch('data/deliveries/' + btn.dataset.file, { cache: 'no-store' })).json());
      box.innerHTML = `${x.summary ? `<p class="sum">${esc(x.summary)}</p>` : ''}<pre>${esc(x.body)}</pre><button type="button" class="hbtn copy">복사하기</button>`;
      box.querySelector('.copy').onclick = e => { navigator.clipboard && navigator.clipboard.writeText(x.body); e.target.textContent = '복사됐어요 ✓'; };
    } catch (e) { box.innerHTML = '<p class="dim">열 수 없어요 · 잠금을 풀었는지 확인해 주세요</p>'; }
  }
  function showAll() { selected = null; drawSvg(); drawNodes(); showDetail(true); }

  async function render() {
    const d = await (await fetch('data/projects.json', { cache: 'no-store' })).json();
    try { DLV = (await (await fetch('data/deliveries/index.json', { cache: 'no-store' })).json()).items || []; } catch (e) { DLV = []; }
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
      const bk = e.target.closest('[data-back]'); if (bk) return select(+bk.dataset.back);
      const dv = e.target.closest('.dlv[data-file]'); if (dv) return openDelivery(dv);
      if (e.target.closest('#showAll')) showAll();
    });
    $('#pjModal').addEventListener('submit', e => {
      const f = e.target.closest('.ap-ask'); if (!f) return; e.preventDefault();
      const t = f.querySelector('textarea').value.trim(); if (!t) return;
      const [pk, sid] = f.dataset.key.split('|'), it = items.find(x => (x.p.id || x.p.repo) === pk), st = it.p.staff.find(x => x.id === sid);
      const a = document.createElement('a'); a.href = askUrl(it.p, st, t); a.target = '_blank'; a.rel = 'noopener'; a.click();
    });
    $('#pjModal').addEventListener('keydown', e => { const ag = e.target.closest && e.target.closest('.agent[data-agent]'); if (ag && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showAgent(ag.dataset.agent); } });
    document.addEventListener('keydown', e => {
      if ($('#pjModal').hidden) return;
      if (e.key === 'Escape') closeModal();
      else if (typeof selected === 'number' && e.key === 'ArrowRight') select(selected + 1);
      else if (typeof selected === 'number' && e.key === 'ArrowLeft') select(selected - 1);
    });
  }

  $('#lockBtn').addEventListener('click', e => { e.preventDefault(); window.AhranLock.lockNow(); });
  window.AhranLock.gate().then(pk => { PK = pk; return render(); });
})();
