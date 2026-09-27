/* 하임 one-line verdict from sleeping breathing rate (+ today's weather on the Today page). */
window.haimVerdict = function (rr, today, env) {
  env = env || {};
  if (!rr || !rr.length) return { c: 'or', t: '호흡수 기록이 없어요 — 오늘 밤 자는 동안 30초 재서 입력해 주세요.' };
  const last = rr[rr.length - 1], prev = rr.length > 1 ? rr[rr.length - 2] : null, v = last.v;
  const days = Math.round((new Date(today) - new Date(last.d)) / 864e5);
  const stale = days >= 3 ? `마지막 측정이 ${days}일 전이에요. ` : '';
  const streak = rr.slice(-3).length === 3 && rr.slice(-3).every(r => r.v >= 30);
  const air = env.aqG >= 3 ? '미세먼지가 나빠 창문 닫고 공기청정기 켜 두고, ' : env.lo != null && env.lo <= 10 ? `밤 최저 ${env.lo}°라 따뜻하게 해 주고, ` : '';
  if (v >= 40) return { c: 'rd', t: `${stale}호흡수 ${v}회로 높아요 — 오늘 해마루에 연락하고, 입 벌리고 숨 쉬면 바로 응급 진료 받으세요.` };
  if (streak) return { c: 'rd', t: `${stale}사흘 연속 30회 이상이에요 (${rr.slice(-3).map(r => r.v).join('→')}) — 이번 주 해마루 진료 예약을 권해요.` };
  if (v >= 35) return { c: 'rd', t: `${stale}호흡수 ${v}회로 목표보다 꽤 높아요 — ${air}내일 같은 시간에 다시 재서 35 이상이면 병원에 연락하세요.` };
  if (v >= 30) {
    const up = prev && v - prev.v >= 4 ? `지난번 ${prev.v}회보다 올랐어요` : '목표 30회보다 살짝 높아요';
    return { c: 'or', t: `${stale}호흡수 ${v}회, ${up} — ${air}약은 그대로 두고 2~3일 연속 30을 넘으면 해마루에 알려주세요.` };
  }
  return { c: 'gr', t: `${stale}호흡수 ${v}회로 안정 범위예요 — ${air}지금 약 그대로 유지하면 돼요.${days >= 1 ? ' 오늘 밤에도 한 번 재 주세요.' : ''}` };
};
