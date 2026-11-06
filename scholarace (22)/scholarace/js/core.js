/* Core helpers: state, API, router, toast, modal. Plain JavaScript, no framework. */
(function () {
  const App = (window.App = { user: null, cfg: null, token: null, cleanup: null, routes: [] });

  // ---------- small utils ----------
  App.$ = (s, r) => (r || document).querySelector(s);
  App.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  App.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  App.naira = (n) => '₦' + Number(n).toLocaleString('en-NG');
  App.date = (t) => new Date(t).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  App.dateTime = (t) => new Date(t).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  App.clock = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    const p = (n) => String(n).padStart(2, '0');
    return (h ? h + ':' : '') + p(m) + ':' + p(x);
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} }
  };
  App.store = store;
  App.token = store.get('sa_token');

  // ---------- API ----------
  // Everything the old server did now runs in the browser (see store.js).
  App.api = async function (method, url, body) {
    try {
      return await window.SAStore.handle(method, url, body);
    } catch (err) {
      if (err.status === 401 && App.token && err.code !== 'BAD_LOGIN') {
        App.setSession(null, null);
        if (!location.hash.startsWith('#/login')) location.hash = '#/login';
      }
      throw err;
    }
  };
  App.setSession = (token, user) => {
    App.token = token; App.user = user;
    if (token) store.set('sa_token', token); else store.del('sa_token');
  };

  // ---------- toast ----------
  App.toast = (msg, type) => {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = msg;
    App.$('#toasts').appendChild(el);
    setTimeout(() => el.remove(), type === 'error' ? 6500 : 3800);
  };

  // ---------- modal ----------
  App.modal = (html, opts) => {
    opts = opts || {};
    const prevFocus = document.activeElement;
    const back = document.createElement('div');
    back.className = 'backdrop';
    back.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true" tabindex="-1">${html}</div>`;
    document.body.appendChild(back);
    const box = back.firstElementChild;
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); if (prevFocus && prevFocus.focus) prevFocus.focus(); if (opts.onClose) opts.onClose(); };
    const onKey = (e) => { if (e.key === 'Escape' && !opts.locked) close(); };
    document.addEventListener('keydown', onKey);
    back.addEventListener('mousedown', (e) => { if (e.target === back && !opts.locked) close(); });
    box.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    const first = box.querySelector('input,select,textarea,button') || box;
    setTimeout(() => first.focus(), 30);
    return { close, box };
  };
  App.confirm = (title, text, yes, danger) => new Promise((resolve) => {
    let answered = false;
    const m = App.modal(`<h2>${App.esc(title)}</h2><p>${text}</p><div class="actions"><button class="btn ghost" data-no>Cancel</button><button class="btn ${danger ? 'danger' : ''}" data-yes>${App.esc(yes)}</button></div>`, { onClose: () => { if (!answered) resolve(false); } });
    m.box.querySelector('[data-no]').onclick = () => { answered = true; m.close(); resolve(false); };
    m.box.querySelector('[data-yes]').onclick = () => { answered = true; m.close(); resolve(true); };
  });

  // ---------- router ----------
  App.route = (pattern, handler, opts) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    App.routes.push({ re, keys, handler, opts: opts || {} });
  };
  App.go = (hash) => { if (location.hash === hash) App.render(); else location.hash = hash; };

  App.render = async function () {
    if (App.cleanup) { try { App.cleanup(); } catch (_) {} App.cleanup = null; }
    document.body.classList.remove('in-exam');
    const hash = location.hash.replace(/^#/, '') || '/';
    const [pathPart, queryPart] = hash.split('?');
    for (const r of App.routes) {
      const m = r.re.exec(pathPart);
      if (!m) continue;
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      params.query = Object.fromEntries(new URLSearchParams(queryPart || ''));
      if (r.opts.auth && !App.user) { App.afterLogin = location.hash; return (location.hash = '#/login'); }
      if (r.opts.admin && (!App.user || App.user.role !== 'admin')) return (location.hash = '#/dashboard');
      if (r.opts.guest && App.user) return (location.hash = '#/dashboard');
      window.scrollTo(0, 0);
      try { await r.handler(params); } catch (e) { if (e.status === 401) return; /* signed out: the login redirect takes over */ console.error(e); App.view('<div class="wrap page"><div class="err">' + App.esc(e.message) + '</div></div>'); }
      return;
    }
    App.view('<div class="wrap page"><h1>Page not found</h1><p>That page does not exist. <a href="#/">Go to the home page</a>.</p></div>');
  };

  // ---------- layout shell ----------
  const LOGO = '<img src="icon.svg" alt="" width="38" height="38">';
  App.view = (inner, active, opts) => {
    const u = App.user, cfg = App.cfg || {};
    const items = u
      ? [['#/dashboard', 'Dashboard'], ['#/start', 'Start exam'], ['#/history', 'Results'], ['#/library', 'Library'], ['#/premium', u.premium ? 'My plan' : 'Premium']]
      : [['#/', 'Home'], ['#/premium', 'Pricing'], ['#/contact', 'Contact']];
    const nav = items.map(([h, t]) => `<a class="item" href="${h}" ${active === h ? 'aria-current="page"' : ''}>${t}</a>`).join('');
    const auth = u
      ? `${u.premium ? '<span class="chip pro" style="margin-left:6px">Premium</span>' : ''}<button class="btn ghost small" data-act="logout" style="margin-left:6px">Sign out</button>`
      : `<a class="item" href="#/login">Sign in</a><a class="btn small grad" href="#/register">Get started free</a>`;
    const year = new Date().getFullYear();
    document.getElementById('app').innerHTML = `
      ${cfg.announcement ? `<div class="announce">${App.esc(cfg.announcement)}</div>` : ''}
      <header class="site-head no-print"><div class="wrap">
        <a class="brand" href="${u ? '#/dashboard' : '#/'}">${LOGO}<span>Scholar<b>Ace</b></span></a>
        <button class="btn ghost small menu-btn" data-act="menu" aria-expanded="false" aria-controls="nav">Menu</button>
        <nav class="nav" id="nav" aria-label="Main">${nav}${auth}</nav>
      </div></header>
      <main id="main" tabindex="-1">${inner}</main>
      ${opts && opts.bare ? '' : `<footer class="site-foot no-print"><div class="wrap"><div class="cols">
        <div><a class="brand" href="#/">${LOGO}<span>Scholar<b>Ace</b></span></a><p>Practise JAMB on a screen that works like the real exam. Free daily questions, full mock exams and a study library on Premium.</p></div>
        <div><h4>Product</h4><ul><li><a href="#/">Home</a></li><li><a href="#/premium">Pricing</a></li><li><a href="#/library">Library</a></li><li><a href="#/register">Create account</a></li></ul></div>
        <div><h4>Company</h4><ul><li><a href="#/about">About</a></li><li><a href="#/contact">Contact</a></li><li><a href="#/terms">Terms</a></li><li><a href="#/privacy">Privacy</a></li></ul></div>
        <div><h4>Support</h4><ul><li><a href="https://wa.me/${App.esc(cfg.support ? cfg.support.whatsapp : '')}" target="_blank" rel="noopener">WhatsApp us</a></li><li><a href="tel:${App.esc(cfg.support ? cfg.support.phone : '')}">${App.esc(cfg.support ? cfg.support.phone : '')}</a></li></ul></div>
      </div><div class="legal">&copy; ${year} ScholarAce. Practise. Perform. Ace it.</div></div></footer>`}`;
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'logout') {
      App.api('POST', '/auth/logout').catch(() => {}).finally(() => { App.setSession(null, null); location.hash = '#/'; App.render(); });
    } else if (act === 'menu') {
      const n = App.$('#nav'); const open = n.classList.toggle('open'); b.setAttribute('aria-expanded', open);
    }
  });
  window.addEventListener('hashchange', () => App.render());
})();
