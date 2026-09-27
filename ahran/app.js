/* AHRAN · Personal OS — everything runs in the browser.
   Live data: Open-Meteo (weather + air quality), Frankfurter (FX), GitHub (repos),
   data/schedule.json (calendar). Personal state lives in localStorage. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- config
  const BIRTH = '1986-03-16';
  const GH_USER = 'wecoutez';
  const TZ = 'Asia/Seoul';
  const CITIES = [
    { id: 'seoul', name: 'SEOUL', ko: '서울', flag: '🇰🇷', tz: 'Asia/Seoul', lat: 37.5665, lon: 126.978, fx: 'USD', fxLabel: '🇺🇸 1달러 환율' },
    { id: 'tokyo', name: 'TOKYO', ko: '도쿄', flag: '🇯🇵', tz: 'Asia/Tokyo', lat: 35.6762, lon: 139.6503, fx: 'JPY', fxLabel: '🇯🇵 100엔 환율' },
    { id: 'paris', name: 'PARIS', ko: '파리', flag: '🇫🇷', tz: 'Europe/Paris', lat: 48.8566, lon: 2.3522, fx: 'EUR', fxLabel: '🇪🇺 1유로 환율' },
    { id: 'la', name: 'LOS ANGELES', ko: '로스앤젤레스', flag: '🇺🇸', tz: 'America/Los_Angeles', lat: 34.0522, lon: -118.2437, fx: 'USD', fxLabel: '🇺🇸 1달러 환율' },
    { id: 'sf', name: 'SAN FRANCISCO', ko: '샌프란시스코', flag: '🇺🇸', tz: 'America/Los_Angeles', lat: 37.7749, lon: -122.4194, fx: 'USD', fxLabel: '🇺🇸 1달러 환율' },
  ];
  const AREAS = ['건강', '성장', '일', '관계', '마음', '재정'];
  const RITUAL = ['물 한 잔 · 스트레칭', '명상 15분', '오늘의 3가지 목표', '영어 / 일본어 20분', '감사 3줄'];
  // 2026 public holidays (KR), incl. substitute days
  const HOLIDAYS = {
    '2026-01-01': '신정', '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '설날 연휴', '2026-03-01': '삼일절', '2026-03-02': '대체공휴일',
    '2026-05-05': '어린이날', '2026-05-24': '부처님오신날', '2026-05-25': '대체공휴일', '2026-06-03': '지방선거', '2026-06-06': '현충일',
    '2026-08-15': '광복절', '2026-08-17': '대체공휴일', '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴',
    '2026-10-03': '개천절', '2026-10-05': '대체공휴일', '2026-10-09': '한글날', '2026-12-25': '크리스마스',
    '2027-01-01': '신정', '2027-03-01': '삼일절', '2027-05-05': '어린이날', '2027-06-06': '현충일', '2027-08-15': '광복절', '2027-10-03': '개천절', '2027-10-09': '한글날', '2027-12-25': '크리스마스',
  };

  // ---------------------------------------------------------------- helpers
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ahran.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ahran.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  const parts = (date, tz, opts) => Object.fromEntries(new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz, hourCycle: 'h23' }, opts)).formatToParts(date).map(p => [p.type, p.value]));
  const ymd = (date, tz = TZ) => { const p = parts(date, tz, { year: 'numeric', month: '2-digit', day: '2-digit' }); return `${p.year}-${p.month}-${p.day}`; };
  const dayNum = s => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5);
  const addDays = (s, n) => new Date((dayNum(s) + n) * 864e5).toISOString().slice(0, 10);
  const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], WDK = ['일', '월', '화', '수', '목', '금', '토'];
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const wday = s => new Date(dayNum(s) * 864e5).getUTCDay();
  const label = s => `${WD[wday(s)]} · ${s.slice(8)} ${MON[+s.slice(5, 7) - 1]}`;
  const fmt = (n, d = 2) => n == null || isNaN(n) ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const tzOffsetMin = (tz, date = new Date()) => { const p = parts(date, tz, { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }); return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(date.getTime() / 6e4) * 6e4) / 6e4; };
  const ampm = hhmm => { if (!hhmm) return ''; const [h, m] = hhmm.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const range = (a, b) => { if (!b) return ampm(a); const A = ampm(a), B = ampm(b); return A.slice(-2) === B.slice(-2) ? `${A.slice(0, -3)}–${B}` : `${A}–${B}`; };
  const mix = (a, b, t) => { const h = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); const A = h(a), B = h(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const desat = (c, t) => { const v = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); const g = Math.round(v.reduce((a, b) => a + b) / 3); return mix(c, '#' + [g, g, g].map(x => x.toString(16).padStart(2, '0')).join(''), t); };

  async function getJSON(url, cacheKey, maxAgeMin) {
    const cached = cacheKey && store.get('cache.' + cacheKey);
    if (cached && Date.now() - cached.t < maxAgeMin * 6e4) return cached.v;
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const v = await r.json();
      if (cacheKey) store.set('cache.' + cacheKey, { t: Date.now(), v });
      return v;
    } catch (e) {
      if (cached) return cached.v; // stale beats nothing
      throw e;
    }
  }

  const state = { today: ymd(new Date()), weather: null, air: null, fx: null, events: [], repos: null, feeds: {} };

  // ---------------------------------------------------------------- clock + dates
  function lunar(date) {
    try { const p = Object.fromEntries(new Intl.DateTimeFormat('ko-KR-u-ca-chinese', { timeZone: TZ, month: 'numeric', day: 'numeric' }).formatToParts(date).map(x => [x.type, x.value])); return `음력 ${parseInt(p.month)}.${parseInt(p.day)}`; } catch (e) { return ''; }
  }
  function tick() {
    const now = new Date(), p = parts(now, TZ, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    $('#clock').innerHTML = `${+p.hour % 12 || 12}:${p.minute}<span>:${p.second} ${+p.hour < 12 ? 'AM' : 'PM'} KST</span>`;
    const t = ymd(now);
    $('#clockDate').textContent = `${WD[wday(t)]} · ${t.slice(8)} ${MON[+t.slice(5, 7) - 1]} ${t.slice(0, 4)} · ${lunar(now)}`;
    if (t !== state.today) { state.today = t; renderAll(); }
    if (now.getSeconds() === 0) renderCities();
  }

  // ---------------------------------------------------------------- biorhythm
  function bio(dayOffset = 0) {
    const n = dayNum(state.today) - dayNum(BIRTH) + dayOffset;
    return { n, p: Math.round(100 * Math.sin(2 * Math.PI * n / 23)), e: Math.round(100 * Math.sin(2 * Math.PI * n / 28)), i: Math.round(100 * Math.sin(2 * Math.PI * n / 33)) };
  }
  const bioColor = v => v >= 30 ? 'gr' : v <= -30 ? 'rd' : 'or';
  function bioAdvice(b) {
    const avg = (b.p + b.e + b.i) / 3;
    const best = [['신체', b.p], ['감성', b.e], ['지성', b.i]].sort((a, c) => c[1] - a[1])[0];
    let recover = '';
    for (let d = 1; d < 23; d++) { const x = bio(d); if (x.p > 0 && b.p <= 0) { recover = ` 신체 리듬은 ${+addDays(state.today, d).slice(5, 7)}/${+addDays(state.today, d).slice(8)}부터 회복.`; break; } }
    if (avg > 50) return `컨디션 최상 · ${best[0]} 리듬이 가장 좋아요. 중요한 결정·발표에 쓰기 좋은 날.`;
    if (avg > 0) return `무난한 흐름 · ${best[0]}(${best[1] > 0 ? '+' : ''}${best[1]})을 살리는 일정을 앞에 배치하세요.`;
    if (avg > -50) return `살짝 낮은 날 · 무리한 약속은 줄이고 ${best[0]} 쪽 일에 집중.` + recover;
    return `저점 구간 · 큰 결정은 미루고 휴식·정리 모드 추천.` + recover;
  }
  function renderBio() {
    const b = bio();
    $('#bioDay').textContent = `DAY ${b.n.toLocaleString()}`;
    $('#bioVals').innerHTML = [['신체 · 23일', b.p], ['감성 · 28일', b.e], ['지성 · 33일', b.i]].map(([l, v]) =>
      `<div class="bio"><div class="v ${bioColor(v)}">${v > 0 ? '+' : ''}${v}</div><div class="l">${l}</div></div>`).join('');
    const svg = $('#bio');
    let h = '';
    for (let x = 0; x <= 302; x += 30.2) h += `<line x1="${x}" y1="4" x2="${x}" y2="96" stroke="rgba(79,214,255,.08)"/>`;
    h += `<line x1="0" y1="50" x2="302" y2="50" stroke="rgba(79,214,255,.25)" stroke-dasharray="2 4"/>`;
    [[23, '#ff6b7d'], [28, '#a896ff'], [33, '#ffa94d']].forEach(([per, c]) => {
      let d = ''; for (let x = 0; x <= 302; x += 3) { const t = b.n - 7 + x / 302 * 21; d += (x ? 'L' : 'M') + x + ',' + (50 - Math.sin(2 * Math.PI * t / per) * 40).toFixed(1); }
      h += `<path d="${d}" stroke="${c}" stroke-width="1.8" fill="none"/>`;
    });
    const tx = 302 * 7 / 21;
    h += `<line x1="${tx}" y1="2" x2="${tx}" y2="98" stroke="#4fd6ff"/><text x="${tx + 5}" y="12" font-size="10" fill="#4fd6ff" font-family="Inter">TODAY</text>`;
    svg.innerHTML = h;
    $('#bioNote').textContent = bioAdvice(b);
  }

  // ---------------------------------------------------------------- year
  function renderYear() {
    const y = +state.today.slice(0, 4), start = dayNum(`${y}-01-01`), len = dayNum(`${y + 1}-01-01`) - start, d = dayNum(state.today) - start + 1;
    const pct = Math.floor(d / len * 100);
    const today = dayNum(state.today), thu = today - (wday(state.today) + 6) % 7 + 3, ty = new Date(thu * 864e5).getUTCFullYear(), week = Math.floor((thu - dayNum(`${ty}-01-01`)) / 7) + 1; // ISO week
    $('#yearPct').innerHTML = `${pct}<span>%</span>`;
    $('#yearTxt').textContent = `Day ${d} / ${len} · D-${len - d}`;
    $('#weekNo').textContent = `WEEK ${week}`;
    $('#yearBar').innerHTML = Array.from({ length: 30 }, (_, i) => `<i class="${i < Math.round(pct / 100 * 30) ? 'on' : ''}"></i>`).join('');
  }

  // ---------------------------------------------------------------- ritual
  function streak(i) {
    let n = 0;
    for (let k = 0; k < 400; k++) {
      const day = addDays(state.today, -k), done = store.get('ritual.' + day, []).includes(i);
      if (done) n++; else if (k > 0) break;
    }
    return n;
  }
  function renderRitual() {
    const done = store.get('ritual.' + state.today, []);
    $('#ritualCount').textContent = `${done.length} / ${RITUAL.length}`;
    $('#ritual').innerHTML = RITUAL.map((t, i) => { const s = streak(i); return `<button class="habit ${done.includes(i) ? 'on' : ''}" data-i="${i}"><span class="chk"></span>${esc(t)}<span class="s ${s ? '' : 'dim'}">${s ? '🔥 ' + s + '일' : '—'}</span></button>`; }).join('');
  }
  $('#ritual').addEventListener('click', e => {
    const b = e.target.closest('.habit'); if (!b) return;
    const i = +b.dataset.i, k = 'ritual.' + state.today, done = store.get(k, []);
    store.set(k, done.includes(i) ? done.filter(x => x !== i) : done.concat(i));
    renderRitual();
  });

  // ---------------------------------------------------------------- life areas
  const areas = () => Object.assign(Object.fromEntries(AREAS.map(a => [a, 70])), store.get('areas', {}));
  const lifeIndex = () => { const a = areas(); return Math.round(AREAS.reduce((t, k) => t + a[k], 0) / AREAS.length); };
  function renderNodes() {
    const a = areas();
    $('#nodes').innerHTML = AREAS.map(k => `<div class="area"><span>${k}</span><b>${a[k]}</b><em><i style="width:${a[k]}%"></i></em><div class="adj"><button data-a="${k}" data-d="-5" aria-label="${k} 낮추기">−</button><button data-a="${k}" data-d="5" aria-label="${k} 올리기">+</button></div></div>`).join('');
    const hist = store.get('lifeHistory', {}); hist[state.today] = lifeIndex(); store.set('lifeHistory', hist);
  }
  $('#nodes').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const a = areas(); a[b.dataset.a] = Math.max(0, Math.min(100, a[b.dataset.a] + +b.dataset.d)); store.set('areas', a);
    renderNodes(); renderTreeInfo();
  });

  // ---------------------------------------------------------------- weather / air
  const WMO = c => c === 0 ? ['맑음', 'clear'] : c <= 2 ? ['대체로 맑음', 'clear'] : c === 3 ? ['흐림', 'cloud'] : c <= 48 ? ['안개', 'fog'] : c <= 57 ? ['이슬비', 'rain'] : c <= 67 ? ['비', 'rain'] : c <= 77 ? ['눈', 'snow'] : c <= 82 ? ['소나기', 'rain'] : c <= 86 ? ['눈 소나기', 'snow'] : ['뇌우', 'rain'];
  const ICON = {
    clear: '<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="4.5" fill="none" stroke="#ffcf6b" stroke-width="1.6"/><g stroke="#ffcf6b" stroke-width="1.4" stroke-linecap="round"><path d="M11 1.5v2.5M11 18v2.5M1.5 11h2.5M18 11h2.5M4.3 4.3l1.8 1.8M15.9 15.9l1.8 1.8M4.3 17.7l1.8-1.8M15.9 6.1l1.8-1.8"/></g></svg>',
    night: '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M15.5 14.5A7 7 0 017.5 4.5a7 7 0 108 10z" fill="none" stroke="#a896ff" stroke-width="1.6"/></svg>',
    cloud: '<svg width="24" height="22" viewBox="0 0 24 22"><path d="M6 17h12a4 4 0 000-8 5.5 5.5 0 00-10.6 1.4A3.4 3.4 0 006 17z" fill="none" stroke="#4fd6ff" stroke-width="1.5"/></svg>',
    fog: '<svg width="24" height="22" viewBox="0 0 24 22"><path d="M3 8h18M6 12h15M3 16h14" stroke="#8fb0c4" stroke-width="1.6" stroke-linecap="round"/></svg>',
    rain: '<svg width="24" height="22" viewBox="0 0 24 22"><path d="M6 13h12a4 4 0 000-8 5.5 5.5 0 00-10.6 1.4A3.4 3.4 0 006 13z" fill="none" stroke="#4fd6ff" stroke-width="1.5"/><path d="M8 16l-1 3M12 16l-1 3M16 16l-1 3" stroke="#8fdcff" stroke-width="1.5" stroke-linecap="round"/></svg>',
    snow: '<svg width="24" height="22" viewBox="0 0 24 22"><path d="M6 13h12a4 4 0 000-8 5.5 5.5 0 00-10.6 1.4A3.4 3.4 0 006 13z" fill="none" stroke="#dff6ff" stroke-width="1.5"/><g fill="#fff"><circle cx="8" cy="17" r="1.2"/><circle cx="12" cy="19" r="1.2"/><circle cx="16" cy="17" r="1.2"/></g></svg>',
  };
  // Korean Ministry of Environment grades; overall = worse of PM10 / PM2.5
  function aqGrade(pm10, pm25) {
    if (pm10 == null && pm25 == null) return null;
    const g10 = pm10 == null ? 0 : pm10 <= 30 ? 1 : pm10 <= 80 ? 2 : pm10 <= 150 ? 3 : 4;
    const g25 = pm25 == null ? 0 : pm25 <= 15 ? 1 : pm25 <= 35 ? 2 : pm25 <= 75 ? 3 : 4;
    const g = Math.max(g10, g25);
    return { g, name: ['', '좋음', '보통', '나쁨', '매우나쁨'][g], emoji: ['', '😊', '🙂', '😷', '🚨'][g], cls: ['', 'cy', 'gr', 'or', 'rd'][g], pm10, pm25 };
  }
  async function loadWeather() {
    const lat = CITIES.map(c => c.lat).join(','), lon = CITIES.map(c => c.lon).join(',');
    try {
      const w = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`, 'weather', 15);
      state.weather = Array.isArray(w) ? w : [w]; state.feeds.weather = 'ok';
    } catch (e) { state.feeds.weather = 'err'; }
    try {
      const a = await getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5&timezone=auto`, 'air', 30);
      state.air = Array.isArray(a) ? a : [a]; state.feeds.air = 'ok';
    } catch (e) { state.feeds.air = 'err'; }
  }
  const cityWx = i => { const w = state.weather && state.weather[i]; if (!w || !w.current) return null; const [desc, kind] = WMO(w.current.weather_code); return { t: Math.round(w.current.temperature_2m), code: w.current.weather_code, desc, kind, day: w.current.is_day, wind: w.current.wind_speed_10m, hi: w.daily && Math.round(w.daily.temperature_2m_max[0]), lo: w.daily && Math.round(w.daily.temperature_2m_min[0]), pop: w.daily && w.daily.precipitation_probability_max && w.daily.precipitation_probability_max[0] }; };
  const cityAq = i => { const a = state.air && state.air[i]; return a && a.current ? aqGrade(a.current.pm10, a.current.pm2_5) : null; };

  // ---------------------------------------------------------------- FX
  async function loadFx() {
    const start = addDays(state.today, -14);
    const tries = [`https://api.frankfurter.dev/v1/${start}..?base=USD&symbols=KRW,JPY,EUR`, `https://api.frankfurter.app/${start}..?from=USD&to=KRW,JPY,EUR`];
    for (const u of tries) {
      try {
        const r = await getJSON(u, 'fx', 120);
        const days = Object.keys(r.rates).sort();
        const series = { USD: [], JPY: [], EUR: [] };
        days.forEach(d => { const x = r.rates[d]; series.USD.push(x.KRW); series.JPY.push(x.KRW / x.JPY * 100); series.EUR.push(x.KRW / x.EUR); });
        state.fx = { date: days[days.length - 1], series }; state.feeds.fx = 'ok'; return;
      } catch (e) { /* try next */ }
    }
    try {
      const r = await getJSON('https://open.er-api.com/v6/latest/USD', 'fx2', 180), x = r.rates;
      state.fx = { date: (r.time_last_update_utc || '').slice(5, 16), series: { USD: [x.KRW], JPY: [x.KRW / x.JPY * 100], EUR: [x.KRW / x.EUR] } }; state.feeds.fx = 'warn';
    } catch (e) { state.feeds.fx = 'err'; }
  }
  const fxOf = cur => { if (!state.fx) return null; const s = state.fx.series[cur], v = s[s.length - 1], p = s.length > 1 ? s[s.length - 2] : null; return { v, chg: p ? (v - p) / p * 100 : null, s }; };
  const spark = (s, up) => { if (!s || s.length < 2) return ''; const mn = Math.min(...s), mx = Math.max(...s), rg = mx - mn || 1; return `<svg viewBox="0 0 100 26" preserveAspectRatio="none"><path d="${s.map((v, i) => (i ? 'L' : 'M') + (i / (s.length - 1) * 100).toFixed(1) + ',' + (23 - (v - mn) / rg * 20).toFixed(1)).join('')}" stroke="${up ? '#3ddc97' : '#ff5b6b'}" stroke-width="1.5" fill="none" vector-effect="non-scaling-stroke"/></svg>`; };

  // ---------------------------------------------------------------- cities
  function renderCities() {
    const now = new Date(), seoulOff = tzOffsetMin(TZ, now);
    $('#cities').innerHTML = CITIES.map((c, i) => {
      const p = parts(now, c.tz, { hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' });
      const h = +p.hour, ap = h < 12 ? 'AM' : 'PM', diff = (tzOffsetMin(c.tz, now) - seoulOff) / 60;
      const d = `${p.year}-${p.month}-${p.day}`, pos = (h * 60 + +p.minute) / 1440 * 100;
      const w = cityWx(i), aq = cityAq(i), fx = fxOf(c.fx);
      const icon = w ? (w.kind === 'clear' && !w.day ? ICON.night : ICON[w.kind]) : '';
      return `<div class="panel city">
        <div class="top"><div><h3><span class="flag">${c.flag}</span>${c.name}</h3><small>${c.ko}</small></div><span class="tag">${i === 0 ? '기준' : (diff > 0 ? '+' : diff < 0 ? '−' : '±') + Math.abs(diff) + 'H'}</span></div>
        <div class="time">${h % 12 || 12}:${p.minute}<span>${ap}</span></div><div class="dt">${label(d)}</div>
        <div class="dn"><i style="left:calc(${pos}% - 5px)"></i></div>
        <div class="wx">${w ? `${icon}<b>${w.t}°</b><span>${w.desc}</span><span class="hl">${w.hi}° / ${w.lo}°</span>` : '<span class="dim">날씨 불러오는 중…</span>'}</div>
        <div class="aq">${aq ? `${aq.emoji} 미세먼지 <span class="${aq.cls}">${aq.name}</span><span class="hl">PM2.5 ${Math.round(aq.pm25)}</span>` : '&nbsp;'}</div>
        <div class="fx"><span class="k">${c.fxLabel}</span><span class="v">${fx ? fmt(fx.v) + '<small>원</small>' : '—'}</span><span class="c ${fx && fx.chg != null ? (fx.chg >= 0 ? 'gr' : 'rd') : 'dim'}">${fx && fx.chg != null ? (fx.chg >= 0 ? '▲ +' : '▼ ') + fmt(fx.chg) + '%' : ''}</span>${fx ? spark(fx.s, fx.chg == null || fx.chg >= 0) : ''}</div>
      </div>`;
    }).join('');
  }

  // ---------------------------------------------------------------- tree
  function treeConfig() {
    const m = +state.today.slice(5, 7), w = cityWx(0), aq = cityAq(0);
    const season = m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
    const cfg = { seed: +state.today.replace(/-/g, ''), season, barkA: '#1b8fd6', barkB: '#8fe9ff', twig: '#7fe3ff', twigHot: '#ff9d3c', ring: '#4fd6ff', ambient: '#1b8fd6', sparkle: '#ffd166', sparkles: 50, falling: 0, fallen: 0, precip: null, haze: 0, hazeColor: '#000000' };
    let colors;
    if (season === 'autumn') {
      const y = +state.today.slice(0, 4), prog = Math.min(1, Math.max(0, (dayNum(state.today) - dayNum(`${y}-09-01`)) / 91));
      cfg.leaves = .22 - prog * .17; // only a few leaves left, fewer each week
      const t = w ? w.t : 15;
      colors = t >= 20 ? ['#ffd166', '#ffb454', '#ff9d3c', '#f4c95d', '#ffcf6b'] : t >= 10 ? ['#ff9d3c', '#ff7b39', '#ffd166', '#e8603c', '#ffb454'] : ['#e8484d', '#c7373f', '#ff6b4a', '#b5452f', '#ff9d3c'];
      colors.push('#4fd6ff');
      cfg.falling = 14; cfg.fallen = 52;
    } else if (season === 'winter') { cfg.leaves = 0; colors = ['#dff6ff']; cfg.sparkle = '#ffffff'; cfg.sparkles = 80; }
    else if (season === 'spring') { cfg.leaves = .75; colors = ['#ffb3c7', '#ffd6e0', '#ffffff', '#9ef0c9', '#ff8fb1']; cfg.falling = 10; cfg.fallen = 20; }
    else { cfg.leaves = .95; colors = ['#1fa596', '#27b3a2', '#4fd6ff', '#3cc2b0', '#6fd3c4', '#2aa9e0']; }
    if (w) {
      if (w.kind === 'clear') { cfg.sparkles += 30; cfg.sparkle = w.day ? '#ffd166' : '#bfe9ff'; }
      if (w.kind === 'cloud') { cfg.sparkles = 20; colors = colors.map(c => desat(c, .2)); }
      if (w.kind === 'fog') { cfg.haze += .16; cfg.hazeColor = '#9fb3c0'; cfg.sparkles = 10; }
      if (w.kind === 'rain') { cfg.precip = 'rain'; cfg.sparkles = 10; cfg.falling = Math.round(cfg.falling / 2); colors = colors.map(c => mix(c, '#4fd6ff', .15)); }
      if (w.kind === 'snow') { cfg.precip = 'snow'; }
      if (!w.day) { cfg.ambient = '#3a2f8a'; }
    }
    if (aq) {
      cfg.ring = ['', '#4fd6ff', '#3ddc97', '#ff9d3c', '#ff5b6b'][aq.g];
      if (aq.g >= 3) { colors = colors.map(c => desat(c, aq.g === 3 ? .35 : .6)); cfg.haze += aq.g === 3 ? .12 : .24; cfg.hazeColor = '#9a7442'; cfg.sparkles = Math.round(cfg.sparkles / 3); cfg.barkB = desat(cfg.barkB, .4); }
    }
    cfg.leafColors = colors;
    return { cfg, season, w, aq };
  }
  function renderTree() { const { cfg } = treeConfig(); window.drawTree($('#tree'), cfg); renderTreeInfo(); }
  function renderTreeInfo() {
    const { cfg, season, w, aq } = treeConfig();
    const sName = { spring: '🌸 봄', summer: '🌿 여름', autumn: '🍂 가을', winter: '❄️ 겨울' }[season];
    const chips = [
      `<span class="chip">${sName} · 잎 <b>${Math.round(cfg.leaves * 100)}%</b></span>`,
      w ? `<span class="chip">서울 ${w.desc} <b>${w.t}°</b></span>` : '',
      aq ? `<span class="chip"><span class="dot ${aq.cls}"></span>미세먼지 <b class="${aq.cls}">${aq.name}</b></span>` : '',
      `<span class="chip">LIFE INDEX <b class="cy">${lifeIndex()}</b></span>`,
    ];
    $('#treeInfo').innerHTML = chips.join('');
    let note = '오늘의 나무 · ';
    if (aq && aq.g >= 3) note += '공기가 탁해서 나무도 뿌옇게 바랬어요. 마스크 챙기세요.';
    else if (w && w.kind === 'rain') note += '비가 내려 잎이 차갑게 젖었어요. 우산 챙기세요.';
    else if (w && w.kind === 'snow') note += '눈이 내려 가지에 서리가 앉았어요.';
    else if (w && w.kind === 'fog') note += '안개 속에 나무가 흐릿해요. 운전 조심.';
    else if (season === 'autumn') note += w && w.t < 10 ? '쌀쌀한 공기에 잎이 붉게 물들었어요.' : '맑은 가을빛에 남은 잎이 황금색으로 반짝여요.';
    else note += '맑은 공기 속에서 나무가 선명하게 빛나요.';
    $('#treeNote').textContent = note;
  }

  // ---------------------------------------------------------------- schedule + todos
  async function loadSchedule() {
    const hm = iso => { const p = parts(new Date(iso), TZ, { hour: '2-digit', minute: '2-digit' }); return `${p.hour}:${p.minute}`; };
    try {
      let j;
      if (state.pk) {
        const r = await fetch('data/schedule.enc.json', { cache: 'no-store' });
        if (!r.ok) throw new Error(r.status);
        j = await window.AhranLock.decryptJSON(state.pk, await r.json());
      } else {
        const r = await fetch('data/schedule.json', { cache: 'no-store' }); // only used when no lock is set up
        if (!r.ok) throw new Error(r.status);
        j = await r.json();
      }
      state.events = (j.events || []).map(e => ({ ...e, date: e.date || ymd(new Date(e.start)), time: e.allDay ? '' : hm(e.start), endTime: e.allDay || !e.end ? '' : hm(e.end) }));
      state.calUpdated = j.updated; state.feeds.cal = 'ok';
    } catch (e) { state.events = []; state.feeds.cal = 'warn'; }
  }
  function allEvents() {
    const local = store.get('events', []).map(e => ({ ...e, local: true }));
    const hol = Object.entries(HOLIDAYS).map(([date, title]) => ({ date, title, allDay: true, holiday: true }));
    return state.events.concat(local, hol).sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')));
  }
  const eventsOn = d => allEvents().filter(e => e.date === d);
  function renderSchedule() {
    const days = Array.from({ length: 6 }, (_, i) => addDays(state.today, i));
    let h = '';
    days.forEach((d, i) => {
      const ev = eventsOn(d);
      if (i > 0 && !ev.length) return;
      const n = ev.filter(e => !e.holiday).length;
      h += `<div class="day"><span>${i === 0 ? 'TODAY · ' : ''}${label(d)}</span><span class="${n >= 3 ? 'or' : 'dim'}">${ev.length && ev.every(e => e.holiday) ? 'HOLIDAY' : n + (n === 1 ? ' EVENT' : ' EVENTS')}</span></div>`;
      if (!ev.length) h += `<div class="empty">등록된 일정 없음 · 자유 시간 ✦</div>`;
      ev.forEach(e => {
        const c = e.holiday ? 'var(--gr)' : e.allDay ? 'var(--or)' : e.local ? 'var(--vi)' : 'var(--cy)';
        const t = e.allDay || !e.time ? 'ALL DAY' : range(e.time, e.endTime);
        const sub = [e.location && esc(e.location), e.meet && `<a href="${esc(e.meet)}" target="_blank" rel="noopener">Meet 참여</a>`, e.local && '직접 추가'].filter(Boolean).join(' · ');
        h += `<div class="ev" style="--c:${c}"><time>${t}</time><div class="n">${e.local ? `<button class="x" data-del="${esc(e.id)}" aria-label="삭제">✕</button>` : ''}${esc(e.title)}${sub ? `<small>${sub}</small>` : ''}</div></div>`;
      });
    });
    $('#sched').innerHTML = h;
    $('#calSrc').textContent = state.feeds.cal === 'ok' ? 'GOOGLE CALENDAR' : 'LOCAL';
  }
  $('#sched').addEventListener('click', e => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    store.set('events', store.get('events', []).filter(x => x.id !== b.dataset.del)); renderSchedule(); renderBrief();
  });
  function renderTodos() {
    const t = store.get('todos', []);
    $('#todoCount').textContent = `${t.filter(x => !x.done).length} OPEN`;
    $('#todos').innerHTML = t.length ? t.map((x, i) => `<div class="todo ${x.done ? 'done' : ''}"><button class="habit ${x.done ? 'on' : ''}" data-t="${i}" style="width:auto;padding:0"><span class="chk"></span></button><span>${esc(x.text)}</span><button class="del" data-tdel="${i}" aria-label="삭제">✕</button></div>`).join('')
      : `<div class="empty">명령어 창에 "할 일 추가 …" 라고 입력해 보세요</div>`;
  }
  $('#todos').addEventListener('click', e => {
    const t = store.get('todos', []), a = e.target.closest('[data-t]'), d = e.target.closest('[data-tdel]');
    if (a) t[+a.dataset.t].done = !t[+a.dataset.t].done; else if (d) t.splice(+d.dataset.tdel, 1); else return;
    store.set('todos', t); renderTodos(); renderBrief();
  });

  // ---------------------------------------------------------------- briefing
  function briefing(scope = 'today') {
    const hr = +parts(new Date(), TZ, { hour: '2-digit' }).hour;
    const hi = hr < 5 ? '늦은 밤이에요' : hr < 12 ? '좋은 아침이에요' : hr < 18 ? '좋은 오후예요' : '좋은 저녁이에요';
    const today = eventsOn(state.today).filter(e => !e.holiday), hol = eventsOn(state.today).find(e => e.holiday);
    const b = bio(), avg = (b.p + b.e + b.i) / 3, w = cityWx(0), aq = cityAq(0);
    const cond = avg > 50 ? '최상' : avg > 0 ? '양호' : avg > -50 ? '조금 낮은 편' : '전부 저점';
    let lead = `${hi}, 아란. 오늘은 `;
    lead += today.length ? `<b>일정 ${today.length}건</b>이 있어요${today[0].time ? ` — 첫 일정은 <b>${ampm(today[0].time)} ${esc(today[0].title)}</b>` : ''}.` : `<b>일정이 비어 있는 ${WDK[wday(state.today)]}요일</b>이에요${hol ? ` (${hol.title})` : ''}.`;
    lead += ` 컨디션은 <b>${cond}</b>`;
    lead += w ? `, 서울은 <b>${w.desc} ${w.t}°</b>${aq ? ` · 미세먼지 <b>${aq.name}</b>` : ''}.` : '.';
    const items = [];
    const week = Array.from({ length: 7 }, (_, i) => addDays(state.today, i + 1)).map(d => [d, eventsOn(d).filter(e => !e.holiday)]);
    const busiest = week.slice().sort((a, c) => c[1].length - a[1].length)[0];
    if (busiest && busiest[1].length >= 2) items.push(`이번 주 핵심은 <b>${WDK[wday(busiest[0])]}요일 ${+busiest[0].slice(5, 7)}/${+busiest[0].slice(8)}</b> — ${busiest[1].map(e => esc(e.title)).join(' · ')}`);
    if (scope === 'week') week.forEach(([d, ev]) => { if (ev.length) items.push(`${WDK[wday(d)]} ${+d.slice(5, 7)}/${+d.slice(8)} · ${ev.map(e => (e.time ? ampm(e.time) + ' ' : '') + esc(e.title)).join(', ')}`); });
    const nextHol = week.map(([d]) => [d, HOLIDAYS[d]]).find(x => x[1]);
    if (nextHol) items.push(`${WDK[wday(nextHol[0])]}요일 ${+nextHol[0].slice(5, 7)}/${+nextHol[0].slice(8)} ${nextHol[1]} · 쉬는 날 계획 체크`);
    if (w && w.pop >= 50) items.push(`오늘 강수확률 ${w.pop}% · 우산 챙기기 ☂️`);
    if (aq && aq.g >= 3) items.push(`미세먼지 ${aq.name} · 마스크 챙기고 야외 운동은 실내로 😷`);
    const fx = fxOf('USD'); if (fx && fx.chg != null && Math.abs(fx.chg) >= .5) items.push(`달러 환율 ${fx.chg > 0 ? '상승' : '하락'} ${fmt(Math.abs(fx.chg))}% · 1달러 ${fmt(fx.v)}원`);
    const open = store.get('todos', []).filter(t => !t.done); if (open.length) items.push(`남은 할 일 ${open.length}개 · ${esc(open[0].text)}${open.length > 1 ? ' 외' : ''}`);
    if (avg <= -50) items.push('리듬 저점 · 무리한 약속보다 회복과 정리에 쓰기 좋은 날');
    return { lead, items: items.slice(0, scope === 'week' ? 10 : 3) };
  }
  function renderBrief() {
    const { lead, items } = briefing();
    $('#brief').innerHTML = `<p>${lead}</p>` + items.map((t, i) => `<div class="li"><i>${String(i + 1).padStart(2, '0')}</i><span>${t}</span></div>`).join('');
    const p = parts(new Date(), TZ, { hour: '2-digit', minute: '2-digit' });
    $('#briefTime').textContent = `AUTO · ${ampm(p.hour + ':' + p.minute)}`;
  }

  // ---------------------------------------------------------------- repos
  const LANG = { HTML: '#ff9d3c', JavaScript: '#ffd166', TypeScript: '#4fd6ff', Python: '#3ddc97', CSS: '#a896ff' };
  const ago = iso => { const d = (Date.now() - new Date(iso)) / 864e5; return d < 1 ? '오늘' : d < 2 ? '어제' : d < 30 ? Math.floor(d) + '일 전' : new Date(iso).toISOString().slice(0, 10); };
  async function loadRepos() {
    try { state.repos = (await getJSON(`https://api.github.com/users/${GH_USER}/repos?sort=pushed&per_page=50`, 'repos', 30)).filter(r => !r.fork); state.feeds.gh = 'ok'; }
    catch (e) { state.feeds.gh = 'err'; }
  }
  function renderRepos() {
    const r = state.repos;
    $('#repoCount').textContent = r ? `${r.length} repositories · 최근 작업 순` : '불러오는 중…';
    if (!r) { $('#repos').innerHTML = ''; return; }
    $('#repos').innerHTML = r.map(x => {
      const c = LANG[x.language] || '#8fb0c4', fresh = (Date.now() - new Date(x.pushed_at)) / 864e5 < 2;
      const site = x.homepage || (x.name.includes('.') ? 'https://' + x.name : '');
      return `<a class="panel repo" href="projects.html#${esc(x.name)}">
        <div class="n"><span class="d" style="background:${c};box-shadow:0 0 8px ${c}"></span>${esc(x.name)}</div>
        <div class="o">${esc(x.description || (site ? site.replace('https://', '') : `${GH_USER}/${x.name}`))}</div>
        <div class="s"><span class="${fresh ? 'gr' : ''}">● ${ago(x.pushed_at)}</span><span>${esc(x.language || '')}</span></div></a>`;
    }).join('');
  }

  // ---------------------------------------------------------------- feeds strip
  function renderStrip() {
    const f = state.feeds, led = s => s === 'ok' ? 'ok' : s === 'warn' ? 'warn' : s === 'err' ? 'err' : '';
    const cal = f.cal === 'ok' ? `${state.calUpdated ? '업데이트 ' + (d => `${+d.slice(5, 7)}/${+d.slice(8)} ${ampm(parts(new Date(state.calUpdated), TZ, { hour: '2-digit', minute: '2-digit' }).hour + ':' + parts(new Date(state.calUpdated), TZ, { hour: '2-digit', minute: '2-digit' }).minute)}`)(ymd(new Date(state.calUpdated))) : 'synced'}` : '일정 파일 없음';
    $('#strip').innerHTML = [
      ['GOOGLE CALENDAR', cal, f.cal], ['GITHUB', state.repos ? `${state.repos.length} repos · live` : '연결 실패', f.gh],
      ['WEATHER · AIR', f.weather === 'ok' ? `5 cities · 15 min${f.air === 'ok' ? ' · PM ok' : ''}` : '연결 실패', f.weather === 'ok' && f.air !== 'ok' ? 'warn' : f.weather],
      ['FX FEED', state.fx ? `원화 기준 · ${state.fx.date}` : '연결 실패', f.fx], ['COMMAND', '/ 키로 바로 입력', 'ok'],
    ].map(([b, s, st]) => `<div><span class="led ${led(st)}"></span><span><b>${b}</b><small>${esc(s)}</small></span></div>`).join('');
  }

  // ---------------------------------------------------------------- commands
  const reply = (q, html) => { const r = $('#reply'); r.innerHTML = `<div class="q">&gt; ${esc(q)}</div>${html}`; r.classList.add('show'); };
  const HELP = `<b>명령어</b><br>
    · 오늘 일정 정리 / 이번 주 브리핑<br>
    · 할 일 추가 <i>내용</i> · 할 일 · 완료 <i>번호</i><br>
    · 일정 추가 <i>10/1 오후 2시 미팅</i> (시간 생략 가능)<br>
    · 서울/도쿄/파리/LA/SF 날씨 · 미세먼지 · 환율 · 컨디션 · 루틴<br>
    · 점수 건강 80 (인생 영역 점수 설정)<br>
    · 검색 <i>검색어</i> · 그 외 문장은 Claude에게 바로 물어볼 수 있어요`;
  function run(q) {
    q = q.trim(); if (!q) return;
    let m;
    if (/^(도움|도움말|help|\?|명령어)/i.test(q)) return reply(q, HELP);
    if ((m = q.match(/^(?:할\s*일|todo)\s*추가\s*[:：]?\s*(.+)$/i)) || (m = q.match(/^todo\s+(.+)$/i))) {
      const t = store.get('todos', []); t.push({ text: m[1], done: false, created: state.today }); store.set('todos', t); renderTodos(); renderBrief();
      return reply(q, `✅ 할 일 추가: <b>${esc(m[1])}</b> (총 ${t.filter(x => !x.done).length}개 남음)`);
    }
    if ((m = q.match(/^(?:완료|done)\s*(\d+)/i))) {
      const t = store.get('todos', []), open = t.filter(x => !x.done), x = open[+m[1] - 1];
      if (!x) return reply(q, '해당 번호의 할 일이 없어요.');
      x.done = true; store.set('todos', t); renderTodos(); renderBrief(); return reply(q, `✔︎ 완료: <b>${esc(x.text)}</b>`);
    }
    if (/^(할\s*일|todo)(\s*(목록|보기))?$/i.test(q)) {
      const open = store.get('todos', []).filter(x => !x.done);
      return reply(q, open.length ? open.map((x, i) => `${i + 1}. ${esc(x.text)}`).join('<br>') : '남은 할 일이 없어요 🎉');
    }
    if ((m = q.match(/^일정\s*추가\s*(\d{1,2})[\/.\-월]\s*(\d{1,2})일?\s*(오전|오후|am|pm)?\s*(?:(\d{1,2})(?::(\d{2})|시)?\s*(am|pm)?)?\s+(.+)$/i))) {
      const mer = (m[3] || m[6] || '').toLowerCase(); let hh = m[4] ? +m[4] : null;
      if (hh != null && (mer === '오후' || mer === 'pm') && hh < 12) hh += 12; if (hh === 12 && (mer === '오전' || mer === 'am')) hh = 0;
      m = [m[0], m[1], m[2], hh, m[5], m[7]];
      const y = +state.today.slice(0, 4), mm = String(m[1]).padStart(2, '0'), dd = String(m[2]).padStart(2, '0');
      let date = `${y}-${mm}-${dd}`; if (date < state.today) date = `${y + 1}-${mm}-${dd}`;
      const time = m[3] != null ? `${String(m[3]).padStart(2, '0')}:${m[4] || '00'}` : '';
      const ev = store.get('events', []); ev.push({ id: 'l' + Date.now(), date, time, title: m[5], allDay: !time }); store.set('events', ev);
      renderSchedule(); renderBrief();
      return reply(q, `🗓 일정 추가: <b>${+mm}/${+dd} ${WDK[wday(date)]}요일 ${ampm(time)} ${esc(m[5])}</b><br><span class="muted">이 브라우저에만 저장돼요. 구글 캘린더에도 넣으려면 <a href="https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(m[5])}&dates=${date.replace(/-/g, '')}${time ? 'T' + time.replace(':', '') + '00' : ''}/${date.replace(/-/g, '')}${time ? 'T' + time.replace(':', '') + '00' : ''}&ctz=${TZ}" target="_blank" rel="noopener">여기를 눌러 구글 캘린더에 추가</a></span>`);
    }
    if (/(이번\s*주|주간|week)/i.test(q) && /(일정|브리핑|스케줄|정리)/.test(q)) { const b = briefing('week'); return reply(q, b.lead + '<br><br>' + b.items.map(t => '· ' + t).join('<br>')); }
    if (/(일정|스케줄|브리핑|schedule|정리)/i.test(q)) {
      const ev = eventsOn(state.today), b = briefing();
      return reply(q, b.lead + '<br><br>' + (ev.length ? '<b>오늘</b><br>' + ev.map(e => `· ${e.time ? ampm(e.time) : '종일'} ${esc(e.title)}`).join('<br>') + '<br><br>' : '') + b.items.map(t => '· ' + t).join('<br>'));
    }
    const ci = CITIES.findIndex(c => q.toLowerCase().includes(c.ko.toLowerCase()) || q.toLowerCase().includes(c.name.toLowerCase()) || (c.id === 'la' && /\bla\b|로스/i.test(q)) || (c.id === 'sf' && /\bsf\b|샌프/i.test(q)));
    if (/(날씨|기온|weather)/i.test(q) || (ci >= 0 && !/(환율|먼지)/.test(q))) {
      const list = ci >= 0 ? [ci] : CITIES.map((_, i) => i);
      return reply(q, list.map(i => { const w = cityWx(i), aq = cityAq(i), c = CITIES[i]; return `<span class="flag">${c.flag}</span> <b>${c.ko}</b> ${w ? `${w.desc} ${w.t}° (최고 ${w.hi}° / 최저 ${w.lo}°)${w.pop != null ? ` · 강수 ${w.pop}%` : ''}` : '날씨 정보 없음'}${aq ? ` · 미세먼지 ${aq.name}` : ''}`; }).join('<br>'));
    }
    if (/(미세먼지|먼지|공기|pm)/i.test(q)) return reply(q, CITIES.map((c, i) => { const a = cityAq(i); return `<span class="flag">${c.flag}</span> <b>${c.ko}</b> ${a ? `${a.emoji} ${a.name} · PM2.5 ${Math.round(a.pm25)} · PM10 ${Math.round(a.pm10)}` : '정보 없음'}`; }).join('<br>'));
    if (/(환율|달러|엔화|유로|fx|usd|jpy|eur)/i.test(q)) return reply(q, ['USD', 'JPY', 'EUR'].map(k => { const f = fxOf(k); return `<b>${{ USD: '🇺🇸 1달러', JPY: '🇯🇵 100엔', EUR: '🇪🇺 1유로' }[k]}</b> = ${f ? fmt(f.v) + '원' : '—'} ${f && f.chg != null ? `(${f.chg >= 0 ? '+' : ''}${fmt(f.chg)}%)` : ''}`; }).join('<br>') + (state.fx ? `<br><span class="muted">기준일 ${state.fx.date} · ECB 고시 환율</span>` : ''));
    if (/(컨디션|바이오|biorhythm)/i.test(q)) { const b = bio(); return reply(q, `신체 <b>${b.p}</b> · 감성 <b>${b.e}</b> · 지성 <b>${b.i}</b><br>${bioAdvice(b)}`); }
    if (/(루틴|ritual)/i.test(q)) { const d = store.get('ritual.' + state.today, []); return reply(q, RITUAL.map((t, i) => `${d.includes(i) ? '◆' : '◇'} ${t}`).join('<br>')); }
    if ((m = q.match(/^점수\s*(\S+)\s*(\d{1,3})$/))) {
      const k = AREAS.find(a => m[1].includes(a)); if (!k) return reply(q, `영역: ${AREAS.join(', ')}`);
      const a = areas(); a[k] = Math.min(100, +m[2]); store.set('areas', a); renderNodes(); renderTreeInfo(); return reply(q, `${k} 점수 → <b>${a[k]}</b> · LIFE INDEX ${lifeIndex()}`);
    }
    if ((m = q.match(/^(?:검색|구글|google)\s+(.+)$/i))) return reply(q, `<a href="https://www.google.com/search?q=${encodeURIComponent(m[1])}" target="_blank" rel="noopener">🔎 "${esc(m[1])}" 구글 검색 열기</a>`);
    return reply(q, `이건 제가 여기서 바로 처리할 수 없는 요청이에요.<br><a href="https://claude.ai/new?q=${encodeURIComponent(q)}" target="_blank" rel="noopener">✦ Claude에게 물어보기</a> &nbsp;·&nbsp; <a href="https://www.google.com/search?q=${encodeURIComponent(q)}" target="_blank" rel="noopener">🔎 구글 검색</a> &nbsp;·&nbsp; <span class="muted">"도움말"로 명령어 보기</span>`);
  }
  $('#cmdForm').addEventListener('submit', e => { e.preventDefault(); const i = $('#cmd'); run(i.value); i.value = ''; });
  document.querySelectorAll('.sugg button').forEach(b => b.addEventListener('click', () => { const c = b.dataset.cmd; if (c.endsWith(' ')) { $('#cmd').value = c; $('#cmd').focus(); } else run(c); }));
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== $('#cmd')) { e.preventDefault(); $('#cmd').focus(); }
    if (e.key === 'Escape') { $('#reply').classList.remove('show'); $('#cmd').blur(); }
  });

  // ---------------------------------------------------------------- boot
  function renderAll() { renderBio(); renderYear(); renderRitual(); renderNodes(); renderTree(); renderSchedule(); renderTodos(); renderBrief(); renderCities(); renderRepos(); renderStrip(); }
  $('#lockBtn').addEventListener('click', e => { e.preventDefault(); window.AhranLock.lockNow(); });
  window.AhranLock.gate().then(pk => {
    state.pk = pk;
    renderAll(); tick(); setInterval(tick, 1000);
    Promise.allSettled([loadSchedule(), loadWeather(), loadFx(), loadRepos()]).then(renderAll);
  });
  setInterval(() => state.pk !== undefined && Promise.allSettled([loadWeather(), loadFx()]).then(() => { renderCities(); renderTree(); renderBrief(); renderStrip(); }), 15 * 6e4);
})();
