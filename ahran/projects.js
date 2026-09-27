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

  async function commits(repo) {
    const key = 'cache.commits.' + repo, c = store.get(key);
    if (c && Date.now() - c.t < 30 * 6e4) return c.v;
    try {
      const r = await fetch(`https://api.github.com/repos/${GH}/${repo}/commits?per_page=40`);
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
    </section>`;
  }

  async function render() {
    const d = await (await fetch('data/projects.json', { cache: 'no-store' })).json();
    const repos = [...new Set(d.projects.map(p => p.repo))];
    const logs = Object.fromEntries(await Promise.all(repos.map(async r => [r, await commits(r)])));
    const withLast = d.projects.map(p => { const l = logs[p.repo]; const own = l && l.filter(c => (p.id === 'ahran') === /^AHRAN|dashboard at \/ahran/.test(c.msg)); return { p, log: l, last: own && own[0] ? new Date(own[0].date) : new Date(0) }; })
      .sort((a, b) => b.last - a.last);
    const live = d.projects.filter(p => p.stage === 3).length, launch = d.projects.filter(p => p.stage === 2).length;
    const today = withLast.filter(x => (Date.now() - x.last) / 864e5 < 1).length;
    $('#pjCount').innerHTML = `${d.projects.length}<span> SITES</span>`;
    $('#pjSub').textContent = `정리 기준일 ${d.updated.replace(/-/g, '.')}`;
    $('#pjStats').innerHTML = [['운영 중', live], ['런칭 단계', launch], ['오늘 작업한 사이트', today]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
    $('#pjList').innerHTML = withLast.map(x => card(x.p, x.log)).join('');
    if (location.hash) { const t = document.querySelector(location.hash); if (t) t.scrollIntoView(); }
  }

  $('#lockBtn').addEventListener('click', e => { e.preventDefault(); window.AhranLock.lockNow(); });
  window.AhranLock.gate().then(render);
})();
