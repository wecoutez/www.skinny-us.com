/* 하임 health page: encrypted vet record + this-device additions (breathing rate, new entries). */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get(k, d) { try { const v = localStorage.getItem('ahran.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('ahran.' + k, JSON.stringify(v)); } catch (e) { /* private */ } } };
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const KC = { 검사: '#4fd6ff', 진료: '#3ddc97', 접종: '#ffd166', 약: '#a896ff', 증상: '#ff6b7d', 측정: '#b7c6ff', 진단: '#ff9d3c' };
  let H = null, filter = '전체';

  const rrAll = () => {
    const seen = new Set(), out = [];
    ((H && H.rr_log) || []).concat(store.get('haim.rr', [])).forEach(r => { const k = r.d + r.v + (r.t || ''); if (!seen.has(k)) { seen.add(k); out.push(r); } });
    return out.sort((a, b) => (a.d + (a.t || '')).localeCompare(b.d + (b.t || '')));
  };
  const entries = () => (H ? H.timeline : []).map(e => ({ ...e })).concat(store.get('haim.tl', []).map(e => ({ ...e, mine: true })))
    .sort((a, b) => String(b.d).localeCompare(String(a.d)));

  function renderHead() {
    const age = Math.floor((new Date(today) - new Date('2014-07-05')) / 3.15576e10), rr = rrAll().slice(-1)[0];
    $('#hmSub').textContent = H ? `${H.patient.sex} · ${age}살 · ${H.main_condition.working_diagnosis}` : '';
    $('#hmStats').innerHTML = [
      ['체중', H ? H.patient.weight_kg + 'kg' : '—'],
      ['최근 호흡수', rr ? `<b class="${rr.v >= 30 ? 'rd' : 'gr'}">${rr.v}</b>회/분` : '—'],
      ['매일 약', H ? H.medications.current_daily.map(m => m.name.split(' (')[0]).join(' · ') : '—'],
      ['광견병', H && H.vaccines && H.vaccines[0] ? H.vaccines[0].date : '—'],
    ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  }
  function renderRR() {
    const L = rrAll().slice(-30), svg = $('#rrChart'), W = 520, Hh = 180, P = 28, max = 50, min = 15;
    const x = i => P + (L.length < 2 ? (W - 2 * P) / 2 : i / (L.length - 1) * (W - 2 * P)), y = v => Hh - P - (Math.min(max, Math.max(min, v)) - min) / (max - min) * (Hh - 2 * P);
    let h = `<rect x="${P}" y="${y(max)}" width="${W - 2 * P}" height="${y(30) - y(max)}" fill="rgba(255,107,125,.06)"/>`;
    [20, 30, 40].forEach(v => { h += `<line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 30 ? 'rgba(255,157,60,.7)' : 'rgba(79,214,255,.12)'}" ${v === 30 ? 'stroke-dasharray="4 4"' : ''}/><text x="${P - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#8fb0c4">${v}</text>`; });
    h += `<text x="${W - P}" y="${y(30) - 6}" text-anchor="end" font-size="11" fill="#ff9d3c">목표 30</text>`;
    if (L.length) {
      h += `<path d="${L.map((r, i) => (i ? 'L' : 'M') + x(i) + ',' + y(r.v)).join('')}" fill="none" stroke="#b7c6ff" stroke-width="2"/>`;
      L.forEach((r, i) => { h += `<circle cx="${x(i)}" cy="${y(r.v)}" r="${i === L.length - 1 ? 5 : 3.5}" fill="${r.v >= 30 ? '#ff6b7d' : '#3ddc97'}" stroke="#02060c" stroke-width="2"><title>${r.d} ${r.t || ''} · ${r.v}회/분</title></circle>`; });
      const last = L[L.length - 1]; h += `<text x="${x(L.length - 1)}" y="${y(last.v) - 10}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${last.v}</text>`;
      h += `<text x="${P}" y="${Hh - 6}" font-size="11" fill="#56768c">${L[0].d}</text><text x="${W - P}" y="${Hh - 6}" text-anchor="end" font-size="11" fill="#56768c">${last.d}</text>`;
    } else h += `<text x="${W / 2}" y="${Hh / 2}" text-anchor="middle" font-size="13" fill="#8fb0c4">아직 기록이 없어요</text>`;
    svg.innerHTML = h;
  }
  function renderDue() {
    const due = [];
    const rr = rrAll().slice(-1)[0];
    due.push([rr && rr.d === today ? '✔' : '•', rr && rr.d === today ? `오늘 호흡수 측정 완료 (${rr.v}회/분)` : '오늘 잠잘 때 호흡수 재기', rr && rr.d === today ? 'gr' : 'or']);
    if (H) {
      H.labs.never_done.slice(0, 3).forEach(t => due.push(['•', `아직 안 한 검사: ${t}`, '']));
      due.push(['•', 'Huron Vet(미국) 방문 전 — 원본 영상·약 타임라인·검사지 챙기기', '']);
      if (H.vaccines && H.vaccines[0] && /확인 필요/.test(H.vaccines[0].note)) due.push(['?', '광견병 접종 날짜·병원 입력하기 (증명서 확인)', 'or']);
    }
    $('#hmDue').innerHTML = due.map(([i, t, c]) => `<li class="${c}"><span>${i}</span>${esc(t)}</li>`).join('');
  }
  function renderTL() {
    const all = entries(), kinds = ['전체', ...Object.keys(KC).filter(k => all.some(e => e.k === k))];
    $('#hmFilter').innerHTML = kinds.map(k => `<button type="button" class="${k === filter ? 'on' : ''}" data-f="${k}">${k}</button>`).join('');
    $('#hmTl').innerHTML = all.filter(e => filter === '전체' || e.k === filter).map((e, i) => `<li style="--c:${KC[e.k] || '#8fb0c4'}"><time>${esc(String(e.d).replace(/-/g, '.'))}</time><span class="k">${esc(e.k)}</span><span class="t">${esc(e.t)}${e.mine ? ` <button type="button" class="del" data-del="${esc(e.id)}" aria-label="삭제">✕</button>` : ''}</span></li>`).join('');
  }
  const li = a => a.map(x => `<li>${esc(typeof x === 'string' ? x : [x.name || x.issue, x.dose, x.period, x.status || x.result || x.purpose, x.note].filter(Boolean).join(' · '))}</li>`).join('');
  function renderFull() {
    if (!H) return;
    const mc = H.main_condition, f = mc.confirmed_findings, L = H.labs, M = H.medications;
    $('#hBody').innerHTML = `<div class="h-grid">
      <section><h3>진단 · 상태</h3><p><b>${esc(mc.working_diagnosis)}</b></p><p class="dim">${esc(mc.status)}</p><h4>증상</h4><ul>${li([`안정 호흡수 ${mc.symptoms.resting_respiratory_rate}`, mc.symptoms.cough, mc.symptoms.breathing_sounds, mc.symptoms.notes])}</ul></section>
      <section><h3>매일 약</h3><ul class="meds">${M.current_daily.map(m => `<li><b>${esc(m.name)}</b> ${esc(m.dose)}<small>${esc(m.note)}</small></li>`).join('')}</ul><h4>보조제 · 케어</h4><ul>${li(M.supplements_and_care)}</ul></section>
      <section><h3>검사 결과</h3><h4>CT 2024.09</h4><ul>${li(f.ct_2024_09)}</ul><h4>X-ray 2026.02.26</h4><ul>${li(f.xray_2026_02_26)}</ul><h4>혈액 2026.02</h4><ul>${li([`fSAA ${L.blood_2026_02.fSAA} · globulin ${L.blood_2026_02.globulin}`, L.blood_2026_02.interpretation])}</ul></section>
      <section><h3>감별 진단</h3><ul>${li(H.differentials_under_consideration)}</ul><h3>식단</h3><ul>${li(H.diet.current)}</ul></section>
      <section><h3>병원</h3><ul>${li([`한국: ${H.clinics.korea.join(', ')}`, `미국: ${H.clinics.usa.join(', ')}`, `의뢰 후보: ${H.clinics.referral_candidates.join(', ')}`])}</ul><h3>환경 이력</h3><ul>${li(H.patient.environment_history)}</ul></section>
    </div>`;
  }
  function renderAll() { renderHead(); renderRR(); renderDue(); renderTL(); renderFull(); }

  // breathing-rate counter
  let timer = null;
  function saveRR(v) { const l = store.get('haim.rr', []), t = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit' }); l.push({ d: today, t, v }); store.set('haim.rr', l.slice(-300)); renderAll(); }
  document.addEventListener('click', e => {
    const f = e.target.closest('[data-f]'); if (f) { filter = f.dataset.f; return renderTL(); }
    const d = e.target.closest('[data-del]'); if (d) { store.set('haim.tl', store.get('haim.tl', []).filter(x => x.id !== d.dataset.del)); return renderTL(); }
    if (e.target.closest('#rrStart')) {
      let n = 0, left = 30; const tap = $('#rrTap'), now = $('#rrNow'), st = $('#rrStart');
      tap.disabled = false; st.disabled = true; now.textContent = '30초 · 0회';
      tap.onclick = () => { n++; now.textContent = `${left}초 · ${n}회`; };
      timer = setInterval(() => { left--; now.textContent = `${left}초 · ${n}회`; if (left <= 0) { clearInterval(timer); tap.disabled = true; st.disabled = false; if (n) saveRR(n * 2); } }, 1000);
    }
    if (e.target.closest('#rrSave')) { const v = +$('#rrManual').value; if (v >= 5 && v <= 120) { saveRR(Math.round(v)); $('#rrManual').value = ''; } }
  });
  $('#hmAdd').addEventListener('submit', e => {
    e.preventDefault();
    const l = store.get('haim.tl', []); l.push({ id: 'm' + Date.now(), d: $('#addDate').value, k: $('#addKind').value, t: $('#addText').value.trim() });
    store.set('haim.tl', l); $('#addText').value = ''; filter = '전체'; renderTL();
  });
  $('#addDate').value = today;
  $('#lockBtn').addEventListener('click', e => { e.preventDefault(); window.AhranLock.lockNow(); });
  window.AhranLock.gate().then(async pk => {
    try { const r = await fetch('data/health.enc.json', { cache: 'no-store' }); if (pk && r.ok) H = (await window.AhranLock.decryptJSON(pk, await r.json())).haim; } catch (e) { H = null; }
    renderAll();
  });
})();
