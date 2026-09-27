// Password lock. The schedule is committed encrypted (see _tools/secure.mjs); the
// password unwraps the private key that decrypts it, entirely in this browser.
(function () {
  const subtle = crypto.subtle;
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const RSA = { name: 'RSA-OAEP', hash: 'SHA-256' };
  const PK = 'ahran.pk';

  async function keyInfo() {
    try { const r = await fetch('data/key.json', { cache: 'no-store' }); return r.ok ? r.json() : null; } catch (e) { return null; }
  }
  async function unwrap(info, pw) {
    const base = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    const kek = await subtle.deriveKey({ name: 'PBKDF2', salt: unb64(info.salt), iterations: info.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    return subtle.decrypt({ name: 'AES-GCM', iv: unb64(info.iv) }, kek, unb64(info.wrapped)); // throws on wrong password
  }
  const importPk = raw => subtle.importKey('pkcs8', raw, RSA, false, ['decrypt']);

  async function decryptJSON(pk, enc) {
    const raw = await subtle.decrypt({ name: 'RSA-OAEP' }, pk, unb64(enc.key));
    const aes = await subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    return JSON.parse(new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(enc.iv) }, aes, unb64(enc.data))));
  }

  // Resolves with the private key (or null when no lock is configured).
  async function gate() {
    const info = await keyInfo();
    if (!info) return null;
    try { const saved = localStorage.getItem(PK); if (saved) return await importPk(unb64(saved)); } catch (e) { localStorage.removeItem(PK); }
    document.body.classList.add('locked');
    const form = document.getElementById('lockForm'), input = document.getElementById('lockPw'), msg = document.getElementById('lockMsg');
    input.focus();
    return new Promise(resolve => {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        msg.textContent = '확인 중…';
        try {
          const raw = await unwrap(info, input.value);
          if (document.getElementById('lockRemember').checked) { try { localStorage.setItem(PK, b64(raw)); } catch (x) { /* private mode */ } }
          document.body.classList.remove('locked'); input.value = ''; msg.textContent = '';
          resolve(await importPk(raw));
        } catch (err) { msg.textContent = '비밀번호가 맞지 않아요'; input.select(); }
      });
    });
  }

  function lockNow() { try { localStorage.removeItem(PK); } catch (e) { /* ignore */ } location.reload(); }

  // reload once when a newer build is published (GitHub Pages may serve cached HTML for ~10 min)
  const BUILD = '16';
  fetch('data/version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(v => {
    if (v && v.build && v.build !== BUILD && !sessionStorage.getItem('ahran.reloaded.' + v.build)) {
      sessionStorage.setItem('ahran.reloaded.' + v.build, '1');
      location.replace(location.pathname + '?v=' + v.build + location.hash);
    }
  }).catch(() => {});

  window.AhranLock = { gate, decryptJSON, lockNow };
})();
