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
  // people shown on the Today scene; 하임's details are filled in once known
  const FAMILY = [
    { id: 'ahran', name: '원아란', sex: 'f', birth: BIRTH, color: '#4fd6ff' },
    { id: 'haim', name: '하임', kind: 'cat', breed: '러시안블루', born: '시카고', birth: '2014-07-05', color: '#b7c6ff', eye: '#5fe3a1' },
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
    const x = personalIndex(), C = 2 * Math.PI * 44;
    $('#bioDay').textContent = x.label;
    $('#bioVals').innerHTML = `<div class="idx-ring"><svg viewBox="0 0 110 110" width="118" height="118"><circle cx="55" cy="55" r="44" fill="none" stroke="rgba(79,214,255,.12)" stroke-width="9"/><circle cx="55" cy="55" r="44" fill="none" stroke="var(--cy)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(x.s / 100 * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 55 55)"/></svg><div><b>${x.s}</b><span>${x.label}</span></div></div>
      <div class="idx-bars">${x.parts.map(([k, v]) => `<div class="ib"><span>${k}</span><em><i style="width:${v}%;background:${v >= 75 ? 'var(--gr)' : v >= 50 ? 'var(--cy)' : 'var(--or)'}"></i></em><b>${v}</b></div>`).join('')}</div>`;
    $('#bio').innerHTML = '';
    $('#bioNote').innerHTML = `${x.cali != null ? `오늘 서울은 LA 날씨와 <b>${x.cali}%</b> 닮았어요. ` : ''}${esc(x.tip)}<br><span class="dim">기준 · 좋아하는 것: ${PROFILE.likes.join(', ')} · 싫어하는 것: ${PROFILE.dislikes.join(', ')}</span>`;
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
    renderRitual(); renderBio(); renderScene();
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
      const w = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,cloud_cover,weather_code,is_day,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&forecast_days=1`, 'weather', 15);
      state.weather = Array.isArray(w) ? w : [w]; state.feeds.weather = 'ok';
    } catch (e) { state.feeds.weather = 'err'; }
    try {
      const a = await getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5&timezone=auto`, 'air', 30);
      state.air = Array.isArray(a) ? a : [a]; state.feeds.air = 'ok';
    } catch (e) { state.feeds.air = 'err'; }
  }
  const cityWx = i => { const w = state.weather && state.weather[i]; if (!w || !w.current) return null; const [desc, kind] = WMO(w.current.weather_code); return { t: Math.round(w.current.temperature_2m), rh: w.current.relative_humidity_2m, cloud: w.current.cloud_cover, code: w.current.weather_code, desc, kind, day: w.current.is_day, wind: w.current.wind_speed_10m, sr: w.daily && w.daily.sunrise && w.daily.sunrise[0], ss: w.daily && w.daily.sunset && w.daily.sunset[0], hi: w.daily && Math.round(w.daily.temperature_2m_max[0]), lo: w.daily && Math.round(w.daily.temperature_2m_min[0]), pop: w.daily && w.daily.precipitation_probability_max && w.daily.precipitation_probability_max[0] }; };
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

  // live sky behind each city card, from local time, sunrise/sunset and weather
  function skyHtml(mins, w) {
    const hm = iso => { if (!iso) return null; const t = iso.slice(11, 16).split(':'); return +t[0] * 60 + +t[1]; };
    const sr = (w && hm(w.sr)) ?? 390, ss = (w && hm(w.ss)) ?? 1110;
    const phase = mins < sr - 40 || mins > ss + 40 ? 'night' : mins < sr + 50 ? 'dawn' : mins > ss - 50 ? 'dusk' : 'day';
    const G = { night: ['#040a1c', '#0a1a34'], dawn: ['#2d2656', '#c9706a'], day: ['#1f6fc2', '#0e3a68'], dusk: ['#2e1f4e', '#e07a45'] }[phase];
    const kind = w ? w.kind : 'clear', grey = kind === 'rain' || kind === 'snow' || kind === 'fog';
    const g1 = grey ? (phase === 'night' ? '#0b1320' : '#34465a') : G[0], g2 = grey ? '#141f2c' : G[1];
    let svg = '';
    if (phase === 'night') {
      for (let i = 0; i < 22; i++) { const x = (Math.sin(i * 12.99) * 43758.5 % 1 + 1) % 1 * 100, y = (Math.cos(i * 78.23) * 1000 % 1 + 1) % 1 * 60; svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(.3 + (i % 3) * .25).toFixed(2)}" fill="#fff" class="tw" style="--t:${2 + i % 3}s;--d:${-(i % 4)}s" opacity=".85"/>`; }
      const nl = (1440 - ss) + sr, f = ((mins - ss + 1440) % 1440) / nl, x = 66 + 20 * Math.min(1, f), y = 19 - Math.sin(Math.PI * Math.min(1, f)) * 4;
      if (!grey) svg += `<circle cx="${x}" cy="${y}" r="4.2" fill="#f4f1dc" opacity=".9"/><circle cx="${x + 1.8}" cy="${y - 1.2}" r="3.8" fill="${g1}"/>`;
    } else {
      const f = Math.max(0, Math.min(1, (mins - sr) / (ss - sr))), x = 66 + 20 * f, y = 19 - Math.sin(Math.PI * f) * 4, sc = phase === 'day' ? '#ffe28a' : '#ffb46b';
      if (!grey) svg += `<circle cx="${x}" cy="${y}" r="9" fill="${sc}" opacity=".22"/><circle cx="${x}" cy="${y}" r="4.5" fill="${sc}"/>`;
    }
    if (kind === 'cloud' || grey) svg += [[40, 12, 8], [70, 8, 10], [88, 20, 7]].map(([x, y, r]) => `<g opacity="${grey ? .4 : .3}" fill="#dfe8f2"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .38}"/><ellipse cx="${x - r * .35}" cy="${y - r * .2}" rx="${r * .5}" ry="${r * .35}"/></g>`).join('');
    if (kind === 'rain') for (let i = 0; i < 18; i++) svg += `<line x1="${(i * 5.7) % 100}" y1="${(i * 11) % 40 + 20}" x2="${(i * 5.7) % 100 - 1.5}" y2="${(i * 11) % 40 + 26}" stroke="#9fd8ff" stroke-width=".6" opacity=".7"/>`;
    if (kind === 'snow') for (let i = 0; i < 18; i++) svg += `<circle cx="${(i * 5.7) % 100}" cy="${(i * 11) % 50 + 10}" r=".9" fill="#fff" opacity=".85"/>`;
    return `<div class="sky ${phase}" style="--g1:${g1};--g2:${g2}"><svg viewBox="0 0 100 70" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${svg}</svg></div>`;
  }

  // ---------------------------------------------------------------- cities
  function renderCities() {
    const now = new Date(), seoulOff = tzOffsetMin(TZ, now);
    $('#cities').innerHTML = CITIES.map((c, i) => {
      const p = parts(now, c.tz, { hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' });
      const h = +p.hour, ap = h < 12 ? 'AM' : 'PM', diff = (tzOffsetMin(c.tz, now) - seoulOff) / 60;
      const d = `${p.year}-${p.month}-${p.day}`, pos = (h * 60 + +p.minute) / 1440 * 100;
      const w = cityWx(i), aq = cityAq(i), fx = fxOf(c.fx);
      const icon = w ? (w.kind === 'clear' && !w.day ? ICON.night : ICON[w.kind]) : '';
      return `<div class="panel city">${skyHtml(h * 60 + +p.minute, w)}
        <div class="top"><div><h3><span class="flag">${c.flag}</span>${c.name}</h3><small>${c.ko}</small></div><span class="tag">${i === 0 ? '기준' : (diff > 0 ? '+' : diff < 0 ? '−' : '±') + Math.abs(diff) + 'H'}</span></div>
        <div class="fx fx-top"><span class="k">${c.fxLabel}</span><span class="v">${fx ? fmt(fx.v) + '<small>원</small>' : '—'}</span><span class="c ${fx && fx.chg != null ? (fx.chg >= 0 ? 'gr' : 'rd') : 'dim'}">${fx && fx.chg != null ? (fx.chg >= 0 ? '▲ +' : '▼ ') + fmt(fx.chg) + '%' : ''}</span>${fx ? spark(fx.s, fx.chg == null || fx.chg >= 0) : ''}</div>
        <div class="time">${h % 12 || 12}:${p.minute}<span>${ap}</span></div><div class="dt">${label(d)}</div>
        <div class="dn"><i style="left:calc(${pos}% - 5px)"></i></div>
        <div class="wx">${w ? `${icon}<b>${w.t}°</b><span>${w.desc}</span><span class="hl">${w.hi}° / ${w.lo}°</span>` : '<span class="dim">날씨 불러오는 중…</span>'}</div>
        <div class="aq">${aq ? `${aq.emoji} 미세먼지 <span class="${aq.cls}">${aq.name}</span><span class="hl">PM2.5 ${Math.round(aq.pm25)}</span>` : '&nbsp;'}</div>
      </div>`;
    }).join('');
  }

  // ---------------------------------------------------------------- people, age, condition
  const person = f => { const o = store.get('person.' + f.id, {}); return { ...f, ...o }; };
  function ageInfo(birth) {
    if (!birth) return null;
    const [y, m, d] = birth.split('-').map(Number), [ty, tm, td] = state.today.split('-').map(Number);
    const age = ty - y - ((tm < m || (tm === m && td < d)) ? 1 : 0);
    let next = `${ty}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; if (next < state.today) next = `${ty + 1}-${next.slice(5)}`;
    const zod = ['원숭이', '닭', '개', '돼지', '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양'][y % 12];
    const md = m * 100 + d, signs = [[120, '염소'], [219, '물병'], [321, '물고기'], [420, '양'], [521, '황소'], [622, '쌍둥이'], [723, '게'], [823, '사자'], [923, '처녀'], [1023, '천칭'], [1122, '전갈'], [1222, '사수'], [1232, '염소']];
    const sign = signs.find(([lim]) => md < lim)[1];
    return { age, days: dayNum(state.today) - dayNum(birth), dday: dayNum(next) - dayNum(state.today), zod, sign };
  }
  function bioOf(birth) { if (!birth) return null; const n = dayNum(state.today) - dayNum(birth); const f = p => Math.round(100 * Math.sin(2 * Math.PI * n / p)); return { p: f(23), e: f(28), i: f(33) }; }
  // biorhythm caution list (reference only) + which body parts to highlight
  function bioCautions(birth) {
    if (!birth) return { list: [], warn: {} };
    const n = dayNum(state.today) - dayNum(birth), val = (per, k) => Math.sin(2 * Math.PI * (n + k) / per);
    const out = [], warn = {};
    const crit = per => Math.sign(val(per, 0)) !== Math.sign(val(per, 1)) || Math.sign(val(per, -1)) !== Math.sign(val(per, 0));
    const P = Math.round(val(23, 0) * 100), E = Math.round(val(28, 0) * 100), I = Math.round(val(33, 0) * 100);
    if (crit(23)) { out.push(['신체', '전환일 · 컨디션 기복이 클 수 있어요. 운전·계단에서 한 번 더 조심']); warn.joints = true; }
    else if (P <= -50) { out.push(['신체', '체력 저점 · 무리한 운동과 야근은 피하고, 허리·무릎을 조심하세요. 일찍 자기']); warn.joints = true; }
    else if (P < 0) out.push(['신체', '체력이 조금 낮아요 · 가벼운 스트레칭 정도로']);
    if (crit(28)) { out.push(['감성', '전환일 · 기분이 쉽게 흔들려요. 예민한 대화는 하루 미루기']); warn.heart = true; }
    else if (E <= -50) { out.push(['감성', '감정 저점 · 예민해지기 쉬워요. 갈등이 생길 대화나 감정적인 결정은 미루고, 말은 한 번 더 생각하고']); warn.heart = true; }
    else if (E < 0) out.push(['감성', '감정이 조금 가라앉는 날 · 좋아하는 것으로 기분 챙기기']);
    if (crit(33)) { out.push(['지성', '전환일 · 실수하기 쉬워요. 숫자와 일정을 다시 확인']); warn.head = true; }
    else if (I <= -50) { out.push(['지성', '집중력 저점 · 계약서·숫자·송금은 두 번 확인하고, 큰 결정은 미루기']); warn.head = true; }
    else if (I < 0) out.push(['지성', '집중력이 조금 낮아요 · 새 공부보다 복습과 정리']);
    if (!out.length) out.push(['전체', '리듬이 모두 좋은 편이에요 · 중요한 일을 앞으로']);
    return { list: out, warn };
  }
  // Ahran's taste: dry, sunny, mild — California. Edit PROFILE to tune the daily index.
  const PROFILE = { likes: ['건조한 날씨', '캘리포니아 햇살', '맑은 하늘', '선선한 20도 안팎'], dislikes: ['습한 날', '미세먼지', '빽빽한 일정'], temp: [18, 26], dryRh: 45 };
  function personalIndex() {
    const w = cityWx(0), la = cityWx(3), aq = cityAq(0), parts = [], why = [], warn = {}, caut = [];
    const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
    // weather fit
    let climate = 70, cali = null;
    if (w) {
      const [lo, hi] = PROFILE.temp, d = w.t < lo ? lo - w.t : w.t > hi ? w.t - hi : 0, tS = clamp(100 - d * 7);
      const rh = w.rh == null ? 55 : w.rh, hS = rh <= PROFILE.dryRh ? 100 : rh <= 60 ? 100 - (rh - PROFILE.dryRh) * 2 : rh <= 80 ? 70 - (rh - 60) * 2 : 25;
      const sky = !w.day ? 75 : w.kind === 'clear' ? 100 : w.kind === 'cloud' ? 65 : w.kind === 'fog' ? 45 : w.kind === 'snow' ? 40 : 30;
      climate = clamp(tS * .45 + hS * .35 + sky * .2);
      if (rh <= PROFILE.dryRh) why.push(['+', `습도 ${Math.round(rh)}% · 좋아하는 건조한 공기`]); else if (rh >= 65) { why.push(['−', `습도 ${Math.round(rh)}% · 눅눅한 날`]); caut.push('습해서 몸이 무거울 수 있어요 · 제습기 켜고 실내를 건조하게'); warn.joints = true; }
      if (d === 0) why.push(['+', `${w.t}° · 딱 좋은 기온`]); else why.push(['−', `${w.t}° · ${w.t < lo ? '쌀쌀함' : '더움'}`]);
      if (w.kind === 'clear' && w.day) why.push(['+', '맑은 하늘 · 햇살']); else if (w.kind === 'rain' || w.kind === 'snow') why.push(['−', w.desc]);
      if (w.hi - w.lo >= 10) caut.push(`일교차 ${w.hi - w.lo}° · 겉옷 챙기고 따뜻한 물 자주`);
      if (la) {
        const skyMatch = (w.kind === la.kind) ? 0 : 15;
        cali = clamp(100 - Math.abs(w.t - la.t) * 3 - Math.abs((w.rh ?? 55) - (la.rh ?? 55)) * .6 - skyMatch);
      }
    }
    parts.push(['날씨 궁합', climate]);
    if (cali != null) parts.push(['캘리포니아 닮음', cali]);
    const air = aq ? [0, 100, 75, 35, 10][aq.g] : 70; parts.push(['공기', air]);
    if (aq && aq.g >= 3) { why.push(['−', `미세먼지 ${aq.name}`]); caut.push('미세먼지 · 마스크, 운동은 실내로'); }
    const n = eventsOn(state.today).filter(e => !e.holiday).length, sched = [95, 85, 70, 55][n] ?? 40; parts.push(['일정 여유', sched]);
    if (n >= 3) { why.push(['−', `일정 ${n}건`]); caut.push(`일정 ${n}건 · 회의 사이 10분씩 비워두기`); warn.head = true; } else if (n === 0) why.push(['+', '일정 여유']);
    const done = store.get('ritual.' + state.today, []).length, ritual = 50 + done * 10; parts.push(['모닝 루틴', ritual]);
    const rr = rrLast(), haim = rr && rr.d === state.today ? (rr.v < 30 ? 100 : rr.v <= 35 ? 60 : 30) : 80; parts.push(['하임이', haim]);
    if (rr && rr.d === state.today && rr.v >= 30) { why.push(['−', `하임 호흡 ${rr.v}/분`]); caut.push('하임이 호흡수가 목표보다 높아요 · 잘 때 한 번 더 재보기'); warn.heart = true; }
    const W = { '날씨 궁합': .35, '캘리포니아 닮음': .1, '공기': .15, '일정 여유': .2, '모닝 루틴': .1, '하임이': .1 };
    const tw = parts.reduce((t, [k]) => t + W[k], 0), score = clamp(parts.reduce((t, [k, v]) => t + v * W[k], 0) / tw);
    const label = score >= 88 ? '최상' : score >= 75 ? '좋음' : score >= 60 ? '보통' : score >= 45 ? '주의' : '쉬어가기';
    let tip;
    if (aq && aq.g >= 3) tip = '공기가 탁해요 · 실내에서 스트레칭';
    else if (w && (w.rh ?? 0) >= 65) tip = '제습기 켜고, 가벼운 옷으로 몸을 보송하게';
    else if (cali != null && cali >= 80 && w && w.day) tip = '오늘은 캘리포니아 같은 날 · 햇살 좋을 때 30분 걷기';
    else if (n >= 3) tip = '일정이 많아요 · 중요한 결정은 오전에';
    else if (w && w.kind === 'clear' && w.day) tip = '맑은 날 · 창문 열고 햇빛 쬐기';
    else tip = '따뜻한 차 한 잔 하고 천천히 시작하기';
    if (!caut.length) caut.push('특별히 조심할 건 없어요 · 좋아하는 날씨를 즐기세요');
    return { s: score, label, why: why.slice(0, 4), tip, parts, cali, caut, warn };
  }
  function condition() { return personalIndex(); }
  // AAHA/AAFP guide: 1y≈15, 2y≈24, then +4 per year
  const catHuman = y => y <= 0 ? 0 : y === 1 ? 15 : 24 + (y - 2) * 4;
  function catCondition(pp) {
    const w = cityWx(0), aq = cityAq(0), m = +state.today.slice(5, 7), why = [];
    let s = 80;
    if (m === 3 || m === 4 || m === 5 || m === 9 || m === 10 || m === 11) { why.push(['−', '환절기 털갈이 시즌']); s -= 3; }
    if (aq) { const d = [0, 2, 0, -6, -12][aq.g]; s += d; if (aq.g >= 3) why.push(['−', `미세먼지 ${aq.name} · 환기 줄이기`]); else why.push(['+', `미세먼지 ${aq.name} · 환기 OK`]); }
    if (w) { if (w.lo <= 5) { s -= 5; why.push(['−', `최저 ${w.lo}° · 쌀쌀한 밤`]); } if (w.hi >= 30) { s -= 5; why.push(['−', `최고 ${w.hi}° · 더위`]); } if (w.hi - w.lo >= 10) { s -= 3; why.push(['−', `일교차 ${w.hi - w.lo}°`]); } }
    const H = state.healthData && state.healthData.haim, rr = rrLast();
    if (H) {
      if (aq && aq.g >= 3) { s -= 8; }
      if (w && w.lo <= 10) { s -= 4; why.unshift(['−', `찬 공기 ${w.lo}° · 기침 주의`]); }
      if (rr && rr.d === state.today) { if (rr.v >= 30) { s -= 8; why.unshift(['−', `호흡수 ${rr.v}회/분 · 목표 30 미만`]); } else { s += 4; why.unshift(['+', `호흡수 ${rr.v}회/분 · 목표 안`]); } }
      else why.unshift(['·', '오늘 수면 중 호흡수 아직 안 잼']);
    }
    const age = ageInfo(pp.birth).age; if (!H && age >= 11) why.push(['·', '시니어 · 수분·체중 체크']);
    s = Math.max(5, Math.min(99, Math.round(s)));
    const label = s >= 88 ? '최상' : s >= 75 ? '좋음' : s >= 60 ? '보통' : s >= 45 ? '주의' : '돌봄 필요';
    let tip = '물그릇 여러 곳 · 습식 사료로 수분 챙기기';
    if (m >= 9 && m <= 11) tip = '털갈이 시즌 · 하루 한 번 빗질 (헤어볼 예방)';
    if (w && w.lo <= 5) tip = '창가 대신 따뜻한 자리 마련해주기';
    if (aq && aq.g >= 3) tip = '오늘은 창문 닫고 공기청정기 (폐 질환 관리)';
    if (H && !(rr && rr.d === state.today)) tip = '자는 동안 30초 호흡수 재기 — 목표 30회/분 미만';
    return { s, label, why: why.slice(0, 4), tip };
  }
  function haimSummary() {
    const H = state.healthData.haim, med = H.medications.current_daily, rr = rrLast();
    return `<div class="hsum">
      <div class="hsum-dx">${esc(H.main_condition.working_diagnosis.split(' (')[0])} <em>추정 · 확진 전</em></div>
      <div class="hsum-row"><span>오늘 약</span>${med.map(m => `<b>${esc(m.name.split(' (')[0])} ${esc(m.dose.replace('/일', ''))}</b>`).join(' · ')}</div>
      <div class="hsum-row"><span>호흡수</span>${rr ? `<b class="${rr.v >= 30 ? 'rd' : 'gr'}">${rr.v}회/분</b> ${esc(rr.d === state.today ? '오늘' : rr.d.slice(5).replace('-', '/'))}` : '<b class="dim">기록 없음</b>'} · 목표 30 미만</div>
      <div class="hsum-row"><span>체중</span><b>${H.patient.weight_kg}kg</b> · ${esc(H.patient.sex)}</div>
      <button type="button" class="hbtn" id="openHealth">건강 기록 · 호흡수 재기</button>
    </div>`;
  }
  const li = a => a.map(x => `<li>${esc(typeof x === 'string' ? x : [x.name || x.issue, x.dose, x.period, x.status || x.result || x.purpose, x.note].filter(Boolean).join(' · '))}</li>`).join('');
  function renderHealth() {
    const H = state.healthData && state.healthData.haim; if (!H) return;
    const mc = H.main_condition, f = mc.confirmed_findings, L = H.labs, M = H.medications, log = rrLog().slice(-10).reverse();
    $('#hBody').innerHTML = `
      <div class="h-head"><div class="pj-kind">러시안블루 · ${esc(H.patient.sex)} · 12살 · ${H.patient.weight_kg}kg</div><h2>하임이 건강 기록</h2><p class="dim">기준 ${esc(H.last_updated)} · ${esc(H.sources)} · 이 내용은 암호화되어 저장돼요</p></div>
      <div class="h-rr">
        <div><h3>수면 중 호흡수 재기</h3><p class="dim">자고 있을 때 가슴이 올라올 때마다 누르세요. 30초 뒤 1분 값으로 계산해요. 목표: 30회/분 미만</p></div>
        <div class="rr-ctl"><button type="button" class="hbtn big" id="rrStart">30초 시작</button><button type="button" class="hbtn tap" id="rrTap" disabled>숨 ●</button><span class="rr-now" id="rrNow"></span>
          <label class="rr-man">직접 입력 <input id="rrManual" type="number" min="5" max="120" inputmode="numeric" placeholder="회/분"><button type="button" class="hbtn" id="rrSave">저장</button></label></div>
        <ol class="rr-log">${log.map(r => `<li><time>${esc(r.d.slice(5).replace('-', '/'))} ${esc(r.t || '')}</time><b class="${r.v >= 30 ? 'rd' : 'gr'}">${r.v}</b><span class="bar"><i style="width:${Math.min(100, r.v / 50 * 100)}%;background:${r.v >= 30 ? 'var(--rd)' : 'var(--gr)'}"></i></span></li>`).join('') || '<li class="dim">아직 기록이 없어요 (이 기기에 저장)</li>'}</ol>
      </div>
      <div class="h-grid">
        <section><h3>진단 · 상태</h3><p><b>${esc(mc.working_diagnosis)}</b></p><p class="dim">${esc(mc.status)} · ${esc(mc.duration_note)}</p>
          <h4>증상</h4><ul>${li([`안정 호흡수 ${mc.symptoms.resting_respiratory_rate}`, mc.symptoms.cough, mc.symptoms.breathing_sounds, mc.symptoms.notes])}</ul></section>
        <section><h3>매일 약</h3><ul class="meds">${M.current_daily.map(m => `<li><b>${esc(m.name)}</b> ${esc(m.dose)}<small>${esc(m.note)}</small></li>`).join('')}</ul>
          <h4>보조제 · 케어</h4><ul>${li(M.supplements_and_care)}</ul><h4>이전에 써본 것</h4><ul>${li(M.tried_before)}</ul></section>
        <section><h3>검사 결과</h3><h4>CT 2024.09</h4><ul>${li(f.ct_2024_09)}</ul><h4>X-ray 2026.02.26</h4><ul>${li(f.xray_2026_02_26)}</ul><h4>기관 세척 2024</h4><ul>${li(f.tracheal_wash_2024)}</ul>
          <h4>혈액 2026.02</h4><ul>${li([`fSAA ${L.blood_2026_02.fSAA} · globulin ${L.blood_2026_02.globulin}`, L.blood_2026_02.interpretation, `ALT ${L.blood_2026_02.ALT}`])}</ul>
          <h4>모발 미네랄 2026.08</h4><ul>${li([`낮음: ${L.hair_mineral_analysis_2026_08.low.join(', ')}`, `높음: ${L.hair_mineral_analysis_2026_08.high.join(', ')}`, L.hair_mineral_analysis_2026_08.toxic, L.hair_mineral_analysis_2026_08.interpretation])}</ul></section>
        <section><h3>아직 안 한 검사</h3><ul class="todo-ish">${li(L.never_done)}</ul><h3>다음 할 일</h3><ol class="todo-list">${H.next_steps.map(n => `<li>${esc(n)}</li>`).join('')}</ol></section>
        <section><h3>감별 진단 (검토 중)</h3><ul>${li(H.differentials_under_consideration)}</ul><h3>기타 이슈</h3><ul>${li(H.other_issues)}</ul></section>
        <section><h3>식단</h3><ul>${li(H.diet.current)}</ul><p class="dim">검토 중: ${esc(H.diet.considering)}</p><h3>병원</h3><ul>${li([`한국: ${H.clinics.korea.join(', ')}`, `미국: ${H.clinics.usa.join(', ')}`, `의뢰 후보: ${H.clinics.referral_candidates.join(', ')}`])}</ul>
          <h3>환경 이력</h3><ul>${li(H.patient.environment_history)}</ul></section>
      </div>
      <p class="dim h-foot">이 페이지는 기록 정리용이에요. 약 변경·중단은 반드시 수의사와 상의하세요.</p>`;
  }
  let rrTimer = null;
  function openHealth() { renderHealth(); $('#hModal').hidden = false; document.body.classList.add('modal-open'); $('#hSheet').scrollTop = 0; }
  function closeHealth() { clearInterval(rrTimer); rrTimer = null; $('#hModal').hidden = true; document.body.classList.remove('modal-open'); }
  function saveRR(v) {
    const p = parts(new Date(), TZ, { hour: '2-digit', minute: '2-digit' });
    const mine = store.get('haim.rr', []); mine.push({ d: state.today, t: ampm(p.hour + ':' + p.minute), v }); store.set('haim.rr', mine.slice(-200)); renderHealth(); renderScene();
  }
  document.addEventListener('click', e => {
    if (e.target.closest('#openHealth')) return openHealth();
    if (e.target.id === 'hModal' || e.target.closest('#hClose')) return closeHealth();
    if (e.target.closest('#rrStart')) {
      let n = 0, left = 30; const tap = $('#rrTap'), now = $('#rrNow'), start = $('#rrStart');
      tap.disabled = false; start.disabled = true; now.textContent = `30초 · 0회`;
      tap.onclick = () => { n++; now.textContent = `${left}초 · ${n}회`; };
      rrTimer = setInterval(() => { left--; now.textContent = `${left}초 · ${n}회`; if (left <= 0) { clearInterval(rrTimer); rrTimer = null; tap.disabled = true; start.disabled = false; if (n > 0) saveRR(n * 2); } }, 1000);
      return;
    }
    if (e.target.closest('#rrSave')) { const v = +$('#rrManual').value; if (v >= 5 && v <= 120) saveRR(Math.round(v)); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#hModal').hidden) closeHealth(); });

  function renderScene() {
    const people = FAMILY.map(person);
    const cfg = [{ ...people[0], x: 246 }, { ...people[1], x: 390 }];
    cfg.forEach(p => { const a = ageInfo(p.birth); p.info = a; p.age = a ? a.age : null; p.cond = p.kind === 'cat' ? catCondition(p) : condition(p, p.age == null || p.age < 18); p.sex = p.sex || 'f'; if (p.kind !== 'cat') { p.caution = { list: p.cond.caut.map(t => ['', t]) }; p.warn = p.cond.warn; } });
    window.drawBodies($('#bodies'), cfg, 600);
    $('#callouts').innerHTML = cfg.map((p, i) => {
      const known = !!p.info, side = i === 0 ? 'l' : 'r', top = Math.max(2, p.anchor.top / 600 * 100 - 2);
      return `<div class="callout ${side} ${known ? '' : 'unknown'}" style="--c:${p.color};top:${top}%;${side === 'l' ? 'left' : 'right'}:0">
        <span class="nm">${esc(p.name)}</span>
        ${!known ? '<span class="ag">생일 입력 전</span>' : p.kind === 'cat' ? `<span class="ag">${p.info.age}살 · 러시안블루${rrLast() ? `<br>호흡 ${rrLast().v}회/분` : ''}</span>` : `<span class="ag">만 ${p.info.age}세 · ${esc(p.info.zod)}띠</span>`}
        <span class="sc"><b>${p.cond.s}</b><small>${p.kind === 'cat' ? '' : '바이오 지수 · '}${p.cond.label}</small></span>
      </div>`;
    }).join('');
    $('#condCards').innerHTML = cfg.map((p, i) => `<div class="cond" style="--c:${p.color}">
      <div class="cond-h"><span class="nm">${esc(p.name)}</span><span class="cs"><b>${p.cond.s}</b> / 100 · ${p.cond.label}</span></div>
      ${p.kind === 'cat' ? `<div class="cond-age">${esc(p.breed)} · ${esc(p.birth.replace(/-/g, '.'))} ${esc(p.born)} 출생 · ${p.info.age}살 · 생일 D-${p.info.dday}</div>` : p.info ? `<div class="cond-age">만 ${p.info.age}세 · ${esc(p.birth.replace(/-/g, '.'))} · ${esc(p.info.zod)}띠 · ${esc(p.info.sign)}자리 · 생일 D-${p.info.dday}</div>`
        : `<div class="cond-age dim">생년월일·성별을 알려주시면 나이·바이오리듬·체형이 반영돼요</div>`}
      ${p.kind !== 'cat' && state.healthData && state.healthData.ahran ? (h => `<div class="cond-age">키 ${h.height_cm}cm · ${h.weight_kg}kg · BMI ${(h.weight_kg / (h.height_cm / 100) ** 2).toFixed(1)} (정상 범위)${h.blood_type ? ` · ${esc(h.blood_type)}형` : ''}${h.allergies ? ` · 알레르기 ${esc(h.allergies)}` : ''}</div>`)(state.healthData.ahran) : ''}
      ${false ? `<div class="cond-bio">신체 <b class="${bioColor(p.cond.b.p)}">${p.cond.b.p}</b> · 감성 <b class="${bioColor(p.cond.b.e)}">${p.cond.b.e}</b> · 지성 <b class="${bioColor(p.cond.b.i)}">${p.cond.b.i}</b></div>` : ''}
      ${p.caution ? `<div class="caution"><h4>오늘 조심할 부분</h4><ul>${p.caution.list.map(([, t]) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      <ul>${p.cond.why.map(([sg, t]) => `<li class="${sg === '+' ? 'gr' : sg === '·' ? 'dim' : 'rd'}"><span>${sg}</span>${esc(t)}</li>`).join('')}</ul>
      <p class="tip">오늘의 팁 · ${esc(p.cond.tip)}</p>
      ${p.kind === 'cat' && state.healthData && state.healthData.haim ? haimSummary() : ''}<p class="health dim" ${(p.kind === 'cat' && state.healthData && state.healthData.haim) || (p.kind !== 'cat' && state.healthData && state.healthData.ahran) ? 'hidden' : ''}>건강 정보 · ${state.health && state.health[p.id] ? esc(state.health[p.id]) : p.kind === 'cat' ? '진료 기록 미입력 · 러시안블루 시니어 일반 체크: 체중(비만 경향) · 신장 · 요로 · 치아, 6개월마다 검진 권장' : '아직 입력 전 (키·체중·혈액형·알레르기·복용약 등)'}</p>
    </div>`).join('');
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
  function renderTree() { const { cfg } = treeConfig(); window.drawTree($('#tree'), cfg); renderTreeInfo(); renderScene(); }
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
  async function loadHealth() {
    if (!state.pk) return;
    try {
      const r = await fetch('data/health.enc.json', { cache: 'no-store' });
      if (r.ok) state.healthData = await window.AhranLock.decryptJSON(state.pk, await r.json());
    } catch (e) { state.healthData = null; }
  }
  // resting / sleeping respiratory rate log for 하임 (this device)
  // this device's log merged with entries saved in the encrypted record (shared across devices)
  const rrLog = () => {
    const shared = (state.healthData && state.healthData.haim && state.healthData.haim.rr_log) || [], local = store.get('haim.rr', []);
    const seen = new Set(), all = [];
    shared.concat(local).forEach(r => { const k = r.d + '|' + r.v + '|' + (r.t || ''); if (!seen.has(k)) { seen.add(k); all.push(r); } });
    return all.sort((a, b) => (a.d + (a.t || '')).localeCompare(b.d + (b.t || '')));
  };
  const rrLast = () => { const l = rrLog(); return l.length ? l[l.length - 1] : null; };
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
  // Korean particle by final consonant of the last Hangul syllable: j('개천절', '은', '는')
  const j = (w, withB, noB) => { const h = String(w).replace(/[^가-힣]/g, ''); const c = h ? (h.charCodeAt(h.length - 1) - 0xac00) % 28 : 0; return w + (c ? withB : noB); };
  const kday = d => `${+d.slice(5, 7)}월 ${+d.slice(8)}일(${WDK[wday(d)]})`;
  function briefing(scope = 'today') {
    const hr = +parts(new Date(), TZ, { hour: '2-digit' }).hour;
    const hi = hr < 5 ? '늦은 밤이에요' : hr < 12 ? '좋은 아침이에요' : hr < 18 ? '좋은 오후예요' : '좋은 저녁이에요';
    const today = eventsOn(state.today).filter(e => !e.holiday), hol = eventsOn(state.today).find(e => e.holiday);
    const b = bio(), avg = (b.p + b.e + b.i) / 3, w = cityWx(0), aq = cityAq(0);
    const px = personalIndex();
    const cond = `오늘 바이오 지수는 <b>${px.s}점(${px.label})</b>이에요.`;
    const dayTxt = today.length
      ? `오늘은 일정이 <b>${today.length}건</b> 있어요.${today[0].time ? ` 첫 일정은 <b>${ampm(today[0].time)} ${esc(today[0].title)}</b>.` : ''}`
      : `오늘은 <b>일정이 없는 ${WDK[wday(state.today)]}요일</b>이에요.${hol ? ` ${j(hol.title, '이에요', '예요')}.` : ''}`;
    const wxTxt = w ? ` 서울은 <b>${w.desc}, ${w.t}°</b>${aq ? `이고 미세먼지는 <b>${aq.name}</b>${j(aq.name, '이에요', '예요').slice(aq.name.length)}.` : '예요.'}` : '';
    const lead = `${hi}, 아란. ${dayTxt} ${cond}${wxTxt}`;
    const items = [];
    const week = Array.from({ length: 7 }, (_, i) => addDays(state.today, i + 1)).map(d => [d, eventsOn(d).filter(e => !e.holiday)]);
    const busiest = week.slice().sort((a, c) => c[1].length - a[1].length)[0];
    if (busiest && busiest[1].length >= 2) { const kd = kday(busiest[0]); items.push(`이번 주에 가장 바쁜 날은 <b>${kd}</b>${j(kd, '이에요', '예요').slice(kd.length)}. 일정: ${busiest[1].map(e => esc(e.title)).join(', ')}`); }
    if (scope === 'week') week.forEach(([d, ev]) => { if (ev.length) items.push(`${kday(d)} · ${ev.map(e => (e.time ? ampm(e.time) + ' ' : '') + esc(e.title)).join(', ')}`); });
    const nextHol = week.map(([d]) => [d, HOLIDAYS[d]]).find(x => x[1]);
    if (nextHol) items.push(`${j(kday(nextHol[0]), '은', '는')} ${j(nextHol[1], '이에요', '예요')}. 쉬는 날 계획을 세워 두세요.`);
    if (w && w.pop >= 50) items.push(`오늘 비 올 확률이 ${w.pop}%예요. 우산을 챙기세요.`);
    if (aq && aq.g >= 3) items.push(`미세먼지가 ${j(aq.name, '이에요', '예요')}. 마스크를 챙기고 운동은 실내에서 하세요.`);
    const fx = fxOf('USD'); if (fx && fx.chg != null && Math.abs(fx.chg) >= .5) items.push(`달러 환율이 ${fmt(Math.abs(fx.chg))}% ${fx.chg > 0 ? '올랐어요' : '내렸어요'}. 지금 1달러는 ${fmt(fx.v)}원이에요.`);
    const open = store.get('todos', []).filter(t => !t.done); if (open.length) items.push(`남은 할 일이 ${open.length}개 있어요. 먼저 "${esc(open[0].text)}"부터 해 보세요.`);
    if (px.s < 60) items.push(`컨디션 지수가 낮은 날이에요. ${px.tip}.`);
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
    if (/(컨디션|바이오|biorhythm)/i.test(q)) { const x = personalIndex(); return reply(q, `오늘 바이오 지수 <b>${x.s}점 · ${x.label}</b><br>${x.parts.map(([k, v]) => `${k} ${v}`).join(' · ')}<br>${x.why.map(([sg, t]) => `${sg} ${esc(t)}`).join('<br>')}<br><b>${esc(x.tip)}</b>`); }
    if (/(루틴|ritual)/i.test(q)) { const d = store.get('ritual.' + state.today, []); return reply(q, RITUAL.map((t, i) => `${d.includes(i) ? '◆' : '◇'} ${t}`).join('<br>')); }
    if ((m = q.match(/^점수\s*(\S+)\s*(\d{1,3})$/))) {
      const k = AREAS.find(a => m[1].includes(a)); if (!k) return reply(q, `영역: ${AREAS.join(', ')}`);
      const a = areas(); a[k] = Math.min(100, +m[2]); store.set('areas', a); renderNodes(); renderTreeInfo(); return reply(q, `${k} 점수 → <b>${a[k]}</b> · LIFE INDEX ${lifeIndex()}`);
    }
    if ((m = q.match(/^(하임|아란|원아란)\s*(생일|생년월일|성별)\s*[:：]?\s*(.+)$/))) {
      const id = m[1] === '하임' ? 'haim' : 'ahran', o = store.get('person.' + id, {});
      if (m[2] === '성별') o.sex = /남|m/i.test(m[3]) ? 'm' : 'f';
      else { const d = m[3].match(/(\d{4})\D?(\d{1,2})\D?(\d{1,2})/); if (!d) return reply(q, '예: 하임 생일 2019-05-01'); o.birth = `${d[1]}-${d[2].padStart(2, '0')}-${d[3].padStart(2, '0')}`; }
      store.set('person.' + id, o); renderScene(); return reply(q, `저장했어요 (이 기기). ${m[1]} ${m[2]} → <b>${esc(o.sex === 'm' ? '남' : o.sex === 'f' ? '여' : o.birth)}</b>`);
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
    Promise.allSettled([loadSchedule(), loadHealth(), loadWeather(), loadFx(), loadRepos()]).then(renderAll);
  });
  setInterval(() => state.pk !== undefined && Promise.allSettled([loadWeather(), loadFx()]).then(() => { renderCities(); renderTree(); renderBrief(); renderStrip(); }), 15 * 6e4);
})();
