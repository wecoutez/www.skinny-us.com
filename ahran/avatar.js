// Holographic portrait avatars for the AI staff, drawn as SVG (no external images).
(function () {
  const SKIN = ['#f3d6c1', '#e4b797', '#c8906c'];
  const SHADE = ['#e2bca3', '#cf9c7b', '#a9714f'];
  const HAIR = { f: '#241c22', m: '#1b1820' };
  let n = 0;
  function avatar(a, color, size) {
    a = a || {}; const id = 'av' + (++n), s = a.skin || 0, skin = SKIN[s], shade = SHADE[s], hair = HAIR[a.g] || HAIR.f, c = color || '#4fd6ff';
    const back = { long: `<path d="M36 58 C34 30 48 22 60 22 C74 22 86 30 84 58 L88 96 C78 100 42 100 32 96 Z" fill="${hair}"/>`,
                   bob: `<path d="M37 60 C35 31 48 23 60 23 C73 23 85 31 83 60 L84 74 C76 78 44 78 36 74 Z" fill="${hair}"/>` }[a.hair] || '';
    const front = {
      long: `<path d="M40 50 C41 34 50 28 60 28 C71 28 80 34 80 50 C74 41 66 37 58 38 C50 39 45 44 40 50 Z" fill="${hair}"/>`,
      bob: `<path d="M40 52 C40 34 50 27 60 27 C71 27 81 34 80 54 C77 44 70 38 60 38 C52 38 45 42 40 52 Z" fill="${hair}"/>`,
      bun: `<circle cx="60" cy="24" r="9" fill="${hair}"/><path d="M40 52 C40 34 50 29 60 29 C71 29 80 34 80 52 C76 42 69 38 60 38 C51 38 44 42 40 52 Z" fill="${hair}"/>`,
      side: `<path d="M39 54 C38 34 49 27 61 27 C73 27 82 35 80 52 C74 44 60 40 48 42 C44 44 41 48 39 54 Z" fill="${hair}"/>`,
      short: `<path d="M40 50 C40 33 50 28 60 28 C71 28 80 33 80 50 C77 41 70 37 60 37 C50 37 43 41 40 50 Z" fill="${hair}"/>`,
      crop: `<path d="M41 48 C42 35 50 30 60 30 C70 30 78 35 79 48 C75 42 68 39 60 39 C52 39 45 42 41 48 Z" fill="${hair}"/>`,
    }[a.hair] || '';
    const glasses = a.glasses ? `<g fill="none" stroke="${c}" stroke-width="1.6" opacity=".95"><rect x="45" y="51" width="12" height="9" rx="3.5"/><rect x="63" y="51" width="12" height="9" rx="3.5"/><path d="M57 55 H63"/></g>` : '';
    return `<svg class="avatar" width="${size || 72}" height="${size || 72}" viewBox="0 0 120 120" role="img" aria-hidden="true">
      <defs>
        <radialGradient id="${id}bg" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="${c}" stop-opacity=".45"/><stop offset="1" stop-color="#04101d"/></radialGradient>
        <clipPath id="${id}c"><circle cx="60" cy="60" r="56"/></clipPath>
        <pattern id="${id}scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.2" fill="${c}" opacity=".16"/></pattern>
        <linearGradient id="${id}suit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c3550"/><stop offset="1" stop-color="#0a1626"/></linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#${id}bg)"/>
      <g clip-path="url(#${id}c)">
        ${back}
        <path d="M12 122 C16 94 38 86 60 86 C82 86 104 94 108 122 Z" fill="url(#${id}suit)" stroke="${c}" stroke-opacity=".5"/>
        <path d="M50 86 L60 100 L70 86" fill="none" stroke="${c}" stroke-width="1.4" opacity=".8"/>
        <rect x="52" y="70" width="16" height="18" rx="6" fill="${shade}"/>
        <ellipse cx="41.5" cy="57" rx="3.5" ry="5" fill="${shade}"/><ellipse cx="78.5" cy="57" rx="3.5" ry="5" fill="${shade}"/>
        <ellipse cx="60" cy="55" rx="19" ry="23" fill="${skin}"/>
        ${front}
        <g fill="#2a2024"><ellipse cx="51.5" cy="56" rx="2.3" ry="2.7"/><ellipse cx="68.5" cy="56" rx="2.3" ry="2.7"/></g>
        <path d="M47.5 50.5 Q51.5 48.5 55.5 50.5 M64.5 50.5 Q68.5 48.5 72.5 50.5" stroke="${hair}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M59.5 58 Q58.5 63 60.5 64" stroke="${shade}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
        <path d="M54.5 68 Q60 71.5 65.5 68" stroke="#b2645c" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        ${glasses}
        <rect x="0" y="0" width="120" height="120" fill="url(#${id}scan)"/>
      </g>
      <circle cx="60" cy="60" r="57" fill="none" stroke="${c}" stroke-width="2"/>
      <circle cx="60" cy="60" r="52" fill="none" stroke="${c}" stroke-opacity=".3" stroke-dasharray="2 5"/>
    </svg>`;
  }
  window.ahranAvatar = avatar;
})();
