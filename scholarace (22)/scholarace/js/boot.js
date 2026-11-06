/* Start-up: load settings + session, register routes, render. */
(async function () {
  const A = window.App, P = A.pages;

  A.route('/', P.landing);
  A.route('/login', P.login, { guest: true });
  A.route('/register', P.register, { guest: true });
  A.route('/about', P.about);
  A.route('/contact', P.contact);
  A.route('/terms', P.terms);
  A.route('/privacy', P.privacy);
  A.route('/premium', P.premium);
  A.route('/dashboard', P.dashboard, { auth: true });
  A.route('/start', P.start, { auth: true });
  A.route('/history', P.history, { auth: true });
  A.route('/result/:id', P.result, { auth: true });
  A.route('/exam/:id', P.exam, { auth: true });
  A.route('/library', P.library, { auth: true });
  A.route('/verify/:token', P.verifyLink);
  A.route('/activate/:token', P.activate, { auth: true });

  // Optional backend (server/server.js) that sends real codes by email and SMS
  A.backend = { on: false, base: '' };
  try {
    const base = (window.SA_CONFIG && window.SA_CONFIG.backendUrl || '').replace(/\/$/, '') || (location.protocol.startsWith('http') ? location.origin : '');
    if (base) {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 1500);
      const r = await fetch(base + '/api/health', { signal: ctl.signal }); clearTimeout(t);
      if (r.ok && (await r.json()).ok) A.backend = { on: true, base };
    }
  } catch (_) {}
  window.SA_BACKEND_ON = A.backend.on; window.SA_BACKEND_BASE = A.backend.base;
  A.backendPost = async (path, body) => {
    let r; try { r = await fetch(A.backend.base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch (_) { throw new Error('Could not reach the verification server. Check your connection and try again.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || 'Something went wrong. Try again.');
    return j;
  };
  A.cfg = await A.api('GET', '/config');
  A.cfg.backend = A.backend.on;
  document.title = A.cfg.brand + ' | JAMB mock exams';
  if (!A.cfg.storageOk) A.toast('Your browser is not saving data (private window?). ScholarAce works, but your account will be lost when you close this tab.', 'error');

  if (A.token) {
    try { A.user = (await A.api('GET', '/auth/me')).user; } catch (_) { A.setSession(null, null); }
  }
  if (A.user && (!location.hash || location.hash === '#/')) location.hash = '#/dashboard';
  A.render();

  // Lets the site open on weak networks (only works when hosted, not from a local file)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
