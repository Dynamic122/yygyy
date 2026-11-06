/* ScholarAce pages: landing, sign in / create account, dashboard, exam setup, results, Premium, library */
(function () {
  const A = window.App, esc = A.esc;
  const P = (A.pages = A.pages || {});

  const STATES = ['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'];
  const ICON = {
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c1-4 4-5.5 7.500-5.500s6.500 1.500 7.500 5.500"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.500" y="10.500" width="15" height="10" rx="2.500"/><path d="M8 10.500V8a4 4 0 0 1 8 0v2.500"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5.500c0 4.500 3 8 7 9.500 4-1.500 7-5 7-9.500V6z"/><path d="m9 12 2.200 2.200L15 10"/></svg>'
  };
  // Buttons never change their look or text while working; this only blocks accidental double clicks.
  const busy = (btn, on) => { btn.style.pointerEvents = on ? 'none' : ''; btn.dataset.working = on ? '1' : ''; };
  const groups = () => {
    const have = (A.cfg && A.cfg.subjects) || {};
    const g = [{ id: 'core', name: 'Core subjects', subjects: ['English', 'Mathematics'] }].concat((A.cfg.groups || []));
    return g.map((x) => ({ id: x.id, name: x.name, subjects: x.subjects.filter((s) => have[s]) })).filter((x) => x.subjects.length);
  };
  const subjectCount = () => Object.keys(A.cfg.subjects || {}).length;
  const minLabel = (ms) => { const m = Math.round(ms / 60000); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60 ? (m % 60) + ' min' : '') : m + ' min'; };
  const planPrice = (p) => A.naira(p.price);
  const planSub = (p) => (p.until ? 'until your JAMB exam' : p.days === 30 ? 'per month' : 'for ' + p.days + ' days');
  const perks = (p) => ['Unlimited questions every day', 'Full 400-point JAMB mock exams', 'Real JAMB timing (you cannot pause or change it)', 'Download JAMB story books and textbooks'].concat(p.until ? ['One payment covers you until exam day'] : []);

  const planCards = (opts) => A.cfg.plans.map((p) => `
    <div class="plan ${p.best ? 'best' : ''}">
      ${p.best ? '<span class="badge">BEST VALUE</span>' : ''}
      <strong>${esc(p.name)}</strong>
      <div class="price">${planPrice(p)} <small>${esc(planSub(p))}</small></div>
      <p class="muted small" style="margin:0">${esc(p.blurb || '')}</p>
      <ul>${perks(p).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      ${opts.button(p)}
    </div>`).join('');

  // =============== LANDING ===============
  P.landing = async function () {
    const cfg = A.cfg, lim = cfg.dailyLimit, nSub = subjectCount();
    const gcls = { core: 'g-core', science: 'g-science', arts: 'g-arts', commercial: 'g-commercial', languages: 'g-languages' };
    A.view(`
    <section class="hero"><div class="wrap">
      <div>
        <span class="eyebrow">★ Built for JAMB UTME candidates</span>
        <h1>Practise JAMB on a screen that feels <span>exactly like the real exam.</span></h1>
        <p class="lead">Computer-based tests with the real layout, instant marking with explanations, and ${lim} free questions every day. All ${nSub} JAMB subjects: science, arts and commercial.</p>
        <div class="row" style="margin-top:22px"><a class="btn grad" href="#/register">Create free account</a><a class="btn ghost" href="#/premium">View Premium plans</a></div>
        <div class="trust"><div><strong>${nSub}</strong><span>subjects</span></div><div><strong>${lim}</strong><span>free questions a day</span></div><div><strong>400</strong><span>point mock exams</span></div></div>
      </div>
      <div class="sheet" id="sample" aria-label="Sample question">
        <div class="sheet-top"><span>Mathematics</span><span class="timer" id="demo-clock" aria-label="Time left">1:59:59</span></div>
        <p class="q-text">If 3<sup>x</sup> = 81, find x.</p>
        <div class="opts" role="radiogroup" aria-label="Choose an answer">
          ${['2', '3', '4', '5'].map((t, i) => `<button type="button" class="opt" role="radio" aria-checked="false" data-i="${i}"><span class="bubble">${'ABCD'[i]}</span><span>${t}</span><span class="mark"></span></button>`).join('')}
        </div>
        <p class="sheet-note" id="sample-note" aria-live="polite">Try it: pick an option and see how marking works.</p>
      </div>
    </div></section>

    <section class="section"><div class="wrap">
      <div class="section-head"><h2>Everything you need to walk into the hall confident</h2><p>Practise the way you will sit the exam, then learn from every mistake.</p></div>
      <div class="feat-grid">
        <div class="feat"><div class="ico c-indigo">▣</div><h3>The real CBT layout</h3><p>Subject tabs, question navigator, running clock, flag for review and calculator, just like the exam hall.</p></div>
        <div class="feat"><div class="ico c-teal">✓</div><h3>Instant marking</h3><p>See your score, your mistakes and the right answers with a short explanation the moment you submit.</p></div>
        <div class="feat"><div class="ico c-amber">★</div><h3>${lim} free questions daily</h3><p>Come back every day. Free students even choose their own time, or no time at all.</p></div>
        <div class="feat"><div class="ico c-rose">◷</div><h3>Real JAMB pacing</h3><p>On Premium the clock is fixed at the JAMB pace of 40 seconds a question. No pausing, no changing it.</p></div>
        <div class="feat"><div class="ico c-green">▤</div><h3>Study library</h3><p>Premium members download JAMB literature story books, textbooks and revision notes.</p></div>
        <div class="feat"><div class="ico c-violet">↗</div><h3>Track your progress</h3><p>Your dashboard shows average score and which subjects need more work.</p></div>
      </div>
    </div></section>

    <section class="section alt"><div class="wrap">
      <div class="section-head"><h2>Every JAMB subject, in one place</h2><p>Pick any combination: science, arts, commercial or languages.</p></div>
      <div class="groups">${groups().map((g) => `<div class="group ${gcls[g.id] || 'g-core'}"><h3>${esc(g.name)} <small>${g.subjects.length}</small></h3><ul>${g.subjects.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>`).join('')}</div>
    </div></section>

    <section class="section"><div class="wrap">
      <div class="section-head"><h2>How it works</h2></div>
      <ol class="steps">
        <li><strong>Create your account</strong><p>Two quick steps. It takes about a minute.</p></li>
        <li><strong>Choose what to practise</strong><p>Any subject, any number of questions, any time you like.</p></li>
        <li><strong>Sit it on the CBT screen</strong><p>It submits itself when the time is up.</p></li>
        <li><strong>Review and improve</strong><p>Check every answer and read why.</p></li>
      </ol>
    </div></section>

    <section class="section alt" id="pricing"><div class="wrap">
      <div class="section-head center"><h2>Simple pricing</h2><p>Start free. Upgrade when you want the real JAMB experience.</p></div>
      <div class="plans" style="margin-top:34px">${planCards({ button: (p) => `<a class="btn ${p.best ? 'grad' : 'ghost'} block" href="#/premium">Choose ${esc(p.name)}</a>` })}</div>
      <div class="tbl-wrap" style="margin-top:34px"><table class="compare">
        <thead><tr><th scope="col">What you get</th><th scope="col">Free</th><th scope="col">Premium</th></tr></thead>
        <tbody>
          <tr><th scope="row">Questions per day</th><td>${lim}</td><td class="yes">Unlimited</td></tr>
          <tr><th scope="row">All ${nSub} subjects</th><td class="yes">Yes</td><td class="yes">Yes</td></tr>
          <tr><th scope="row">Choose your own time</th><td class="yes">Yes, or no timer</td><td class="no">No: real JAMB pace</td></tr>
          <tr><th scope="row">Full 400-point JAMB mock</th><td class="no">No</td><td class="yes">Yes</td></tr>
          <tr><th scope="row">Download story books and textbooks</th><td class="no">No</td><td class="yes">Yes</td></tr>
        </tbody>
      </table></div>
      <p class="muted small" style="margin-top:14px;text-align:center"><b>Send your payment to our Opay account only.</b> Then send your receipt on WhatsApp and we send you your personal activation code.</p>
    </div></section>

    <section class="section"><div class="wrap" style="max-width:820px">
      <div class="section-head"><h2>Questions people ask</h2></div>
      <details class="faq"><summary>How close is it to the real exam?</summary><p>Very close. The screen layout, the timing and the 400-point scoring follow the JAMB UTME computer-based test, and the questions are written at UTME level to cover the syllabus, so the exam hall feels familiar on the day.</p></details>
      <details class="faq"><summary>Why can Free students choose the time but Premium cannot?</summary><p>Free practice is flexible so you can learn at your own speed. Premium is built to feel like the real exam, so the clock is fixed at JAMB pace and cannot be changed.</p></details>
      <details class="faq"><summary>How do I pay and activate Premium?</summary><p>Choose a plan, transfer the amount to our Opay account, and send your receipt on WhatsApp. We check it and send you an activation code. Enter it on the Premium page and Premium starts. Only we can give out codes.</p></details>
      <details class="faq"><summary>Can I use my account on another phone?</summary><p>Your account and progress are saved on the device you registered on. On a new device, create an account with the same phone number and message us. We will send a fresh activation code.</p></details>
      <details class="faq"><summary>I forgot my password. What do I do?</summary><p>Use <b>Forgot password?</b> on the sign-in page. It clears the account from your device so you can register again. Message us first if you have Premium.</p></details>
    </div></section>

    <section class="section" style="padding-top:0"><div class="wrap"><div class="cta-band"><div><h2>Ready to ace JAMB?</h2><p>Create a free account and answer your first questions today.</p></div><a class="btn gold" href="#/register">Create free account</a></div></div></section>`);

    let secs = 7199;
    const clock = A.$('#demo-clock');
    const t = setInterval(() => { secs = secs > 0 ? secs - 1 : 7199; clock.textContent = A.clock(secs * 1000); }, 1000);
    A.cleanup = () => clearInterval(t);
    const note = A.$('#sample-note');
    A.$$('#sample .opt').forEach((b) => b.addEventListener('click', () => {
      const pick = Number(b.dataset.i), correct = 2;
      A.$$('#sample .opt').forEach((o) => { o.setAttribute('aria-checked', 'false'); o.classList.remove('right', 'wrong'); o.querySelector('.mark').textContent = ''; });
      b.setAttribute('aria-checked', 'true');
      const right = A.$$('#sample .opt')[correct];
      right.classList.add('right'); right.querySelector('.mark').textContent = 'Correct';
      if (pick !== correct) { b.classList.add('wrong'); b.querySelector('.mark').textContent = 'Not this one'; }
      note.innerHTML = '3<sup>4</sup> = 81, so x = 4. ' + (pick === correct ? 'Well done! ' : 'Every question comes with an explanation like this. ') + '<a href="#/register">Create a free account</a> to keep going.';
    }));
  };

  // =============== STATIC PAGES ===============
  const staticPage = (title, body) => () => A.view(`<div class="page"><div class="wrap" style="max-width:780px"><h1>${title}</h1>${body()}</div></div>`);
  P.about = staticPage('About ScholarAce', () => `<p>ScholarAce gives JAMB candidates a place to practise on a computer-based test that looks, times and scores like the real one.</p><p>Practising on paper does not prepare you for a screen, a countdown and a question navigator. Sit enough sessions here and the exam hall will feel familiar.</p><p>Our questions are written at UTME standard to cover the full syllabus, with a clear explanation for every answer.</p>`);
  P.contact = staticPage('Contact us', () => `<p>Questions about your account, a payment or a wrong answer? Reach us here.</p><ul><li>Phone and WhatsApp: <a href="https://wa.me/${esc(A.cfg.support.whatsapp)}" target="_blank" rel="noopener">${esc(A.cfg.support.phone)}</a></li><li>Email: <a href="mailto:${esc(A.cfg.support.email)}">${esc(A.cfg.support.email)}</a></li></ul><p>For payment issues include your payment reference (it starts with SA-) and the name on your Opay account.</p>`);
  P.terms = staticPage('Terms of use', () => `<p>By creating an account you agree to use ScholarAce for personal study only.</p><ul><li>Keep your password private. One account is for one person.</li><li>Do not copy, resell or share the questions, books or activation codes.</li><li>Premium is paid in advance and starts when we confirm your transfer and send your activation code. Payments are not refundable once Premium has been switched on, except where we made an error.</li><li>Downloads in the library are for your own study and may not be shared or sold.</li><li>We may suspend accounts that break these rules.</li><li>Practice results do not predict your JAMB score.</li></ul>`);
  P.privacy = staticPage('Privacy', () => `<p>ScholarAce has no accounts server. What you enter when you register (name, email, phone, state, course), your exam answers and your results are saved <b>only in your own browser</b> on the device you use.</p><ul><li>We cannot see your account, your answers or your results.</li><li>If you send us a payment receipt on WhatsApp or email, we use it only to check your payment and send your activation code.</li><li>We do not sell your data.</li><li>Clearing your browser data removes your ScholarAce account from that device.</li></ul>`);

  // =============== AUTH ===============
  const authSide = (title, text) => `<aside class="auth-side">
      <div><h2>${title}</h2><p>${text}</p>
        <ul>
          <li><i>1</i><div><b>Real JAMB CBT screen</b><span>Navigator, timer, flagging and calculator.</span></div></li>
          <li><i>2</i><div><b>All ${subjectCount()} subjects</b><span>Science, arts, commercial and languages.</span></div></li>
          <li><i>3</i><div><b>${A.cfg.dailyLimit} free questions a day</b><span>Upgrade any time for full mocks and the library.</span></div></li>
        </ul></div>
      <p class="quote">Trusted practice for UTME candidates across Nigeria.</p>
    </aside>`;
  const pwField = (id, label, auto, extra) => `<div class="field" data-f="${id}"><label for="${id}">${label}</label><div class="pw">${ICON.lock}<input id="${id}" name="${id}" type="password" autocomplete="${auto}" ${extra || ''}><button type="button" data-show="${id}" aria-label="Show or hide password">Show</button></div><div class="msg"></div></div>`;
  const bindShow = () => A.$$('[data-show]').forEach((b) => b.addEventListener('click', () => { const i = A.$('#' + b.dataset.show); const s = i.type === 'password'; i.type = s ? 'text' : 'password'; b.textContent = s ? 'Hide' : 'Show'; }));
  const setErr = (id, text) => { const f = A.$(`[data-f="${id}"]`); if (!f) return; f.classList.toggle('bad', !!text); const inp = A.$('#' + id); f.classList.toggle('good', !text && !!(inp && inp.value)); const m = f.querySelector('.msg'); if (m) m.textContent = text || ''; };
  const phoneRe = /^(\+?234|0)[789][01]\d{8}$/, emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const pwScore = (v) => { let s = 0; if (v.length >= 8) s++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) s++; return v ? Math.max(1, s) : 0; };

  // Sign-in step 2: send a code to the account's email and phone, and wait for the student to type both
  function askLoginCode(chk) {
    return new Promise((resolve) => {
      let id = null, done = false;
      const m = A.modal(`<h2>Confirm it is you</h2><div id="lm"></div><div id="lbody"><p>For your safety we send a code to the email and phone number on this account.</p><div class="actions"><button class="btn ghost" data-close>Cancel</button><button class="btn grad" id="lsend">Send codes</button></div></div>`, { onClose: () => finish('') });
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const msg = (t) => (m.box.querySelector('#lm').innerHTML = t ? `<div class="err" role="alert">${esc(t)}</div>` : '');
      const send = async () => {
        msg('');
        const b = m.box.querySelector('#lsend'); if (b) { b.dataset.working = '1'; b.style.pointerEvents = 'none'; }
        try {
          const r = await A.backendPost('/api/login/start', { phone: chk.phone, email: chk.email }); id = r.id;
          m.box.querySelector('#lbody').innerHTML = `<p>We sent one code to <b>${esc(r.sentTo.email)}</b> and another to <b>${esc(r.sentTo.phone)}</b>. Type both. They expire in 10 minutes.</p>
            <div class="grid2"><div class="field"><label for="lec">Email code</label><input id="lec" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div><div class="field"><label for="lsc">Text message code</label><input id="lsc" inputmode="numeric" maxlength="6"></div></div>
            <div class="actions"><button class="btn ghost" id="lre" type="button">Send again</button><button class="btn grad" id="lok" type="button">Sign in</button></div>`;
          m.box.querySelector('#lre').onclick = () => { m.box.querySelector('#lbody').innerHTML = ''; send(); };
          m.box.querySelector('#lok').onclick = async () => {
            try { const v = await A.backendPost('/api/login/verify', { id, emailCode: m.box.querySelector('#lec').value, smsCode: m.box.querySelector('#lsc').value }); finish(v.token); m.close(); }
            catch (e) { msg(e.message); }
          };
          m.box.querySelector('#lec').focus();
        } catch (e) { msg(e.message); m.box.querySelector('#lbody').innerHTML = '<div class="actions"><button class="btn ghost" data-close>Close</button><button class="btn grad" id="lsend2">Try again</button></div>'; m.box.querySelector('#lsend2').onclick = () => { m.box.querySelector('#lbody').innerHTML = ''; send(); }; }
      };
      m.box.querySelector('#lsend').onclick = send;
    });
  }

  // Forgot password with the server: codes to email and phone, then a new password
  function cloudForgot() {
    let id = null, ident = '';
    const m = A.modal(`<h2>Reset your password</h2><div id="fm"></div><div id="fbody"><div class="field"><label for="fid">Your email or phone number</label><input id="fid" autocomplete="username"></div><div class="actions"><button class="btn ghost" data-close>Cancel</button><button class="btn grad" id="fnext">Send codes</button></div></div>`);
    const msg = (t) => (m.box.querySelector('#fm').innerHTML = t ? `<div class="err" role="alert">${esc(t)}</div>` : '');
    const body = m.box.querySelector('#fbody');
    m.box.querySelector('#fnext').onclick = async () => {
      msg(''); ident = m.box.querySelector('#fid').value.trim(); if (!ident) return msg('Enter your email or phone number.');
      try {
        const acct = await A.backendPost('/api/account/reset-lookup', { identifier: ident });
        const r = await A.backendPost('/api/reset/start', { phone: acct.phone, email: acct.email }); id = r.id;
        body.innerHTML = `<p>We sent one code to <b>${esc(r.sentTo.email)}</b> and another to <b>${esc(r.sentTo.phone)}</b>.</p>
          <div class="grid2"><div class="field"><label for="fec">Email code</label><input id="fec" inputmode="numeric" maxlength="6"></div><div class="field"><label for="fsc">Text message code</label><input id="fsc" inputmode="numeric" maxlength="6"></div></div>
          <div class="field"><label for="fpw">New password</label><input id="fpw" type="password" autocomplete="new-password" placeholder="8+ characters, a letter and a number"></div>
          <div class="actions"><button class="btn ghost" data-close>Cancel</button><button class="btn grad" id="fgo">Change password</button></div>`;
        m.box.querySelector('#fgo').onclick = async () => {
          msg('');
          try {
            const v = await A.backendPost('/api/reset/verify', { id, emailCode: m.box.querySelector('#fec').value, smsCode: m.box.querySelector('#fsc').value });
            await A.backendPost('/api/account/reset', { identifier: ident, newPassword: m.box.querySelector('#fpw').value, verify: v.token });
            m.close(); A.toast('Password changed. Sign in with your new password.', 'ok');
          } catch (e) { msg(e.message); }
        };
      } catch (e) { msg(e.message); }
    };
  }

  P.login = function () {
    A.view(`<div class="auth-shell">
      ${authSide('Welcome back.', 'Sign in to continue your JAMB preparation exactly where you stopped.')}
      <div class="auth-main"><div class="auth-card">
        <h1>Sign in</h1><p class="sub">Use the email or phone number you registered with.</p>
        <div id="msg"></div>
        <form id="f" novalidate>
          <div class="field" data-f="identifier"><label for="identifier">Email or phone number</label><div class="iconfield">${ICON.user}<input id="identifier" name="identifier" autocomplete="username" placeholder="you@example.com or 08012345678"></div><div class="msg"></div></div>
          ${pwField('password', 'Password', 'current-password', 'placeholder="Your password"')}
          <div class="row between" style="margin:-4px 0 18px"><span></span><button class="link small" id="forgot" type="button">Forgot password?</button></div>
          <button class="btn grad block" type="submit">Sign in</button>
        </form>
        <div class="divider"><span>New to ScholarAce?</span></div>
        <a class="btn ghost block" href="#/register">Create a free account</a>
        <p class="secure">${ICON.shield.replace('<svg', '<svg width="16" height="16"')} ${A.backend.on ? 'Your account is stored securely on the ScholarAce server.' : 'Your password is scrambled and kept only on this device.'}</p>
      </div></div></div>`, null, { bare: true });
    bindShow();
    const idf = A.$('#identifier'), last = A.store.get('sa_last_id');
    if (last) { idf.value = last; A.$('#password').focus(); } else idf.focus();
    A.$('#forgot').onclick = () => {
      if (A.backend.on) return cloudForgot();
      const m = A.modal(`<h2>Forgot your password?</h2>
        <p>ScholarAce saves your account on this device only, so there is no email to send a reset link to. You can clear your account from this device and register again.</p>
        <p><b>Your results and Premium on this device will be lost.</b> If you have Premium, message us on WhatsApp (${esc(A.cfg.support.phone)}) first so we can send a new activation code.</p>
        <div id="fm"></div>
        <div class="field"><label for="fid">Your email or phone number</label><input id="fid" autocomplete="username"></div>
        <div class="actions"><button class="btn ghost" data-close>Cancel</button><button class="btn danger" id="fgo">Clear account from this device</button></div>`);
      m.box.querySelector('#fgo').onclick = async () => {
        try { await A.api('POST', '/auth/reset-local', { identifier: m.box.querySelector('#fid').value }); m.close(); A.toast('Account cleared. You can register again.', 'ok'); location.hash = '#/register'; }
        catch (err) { m.box.querySelector('#fm').innerHTML = `<div class="err" role="alert">${esc(err.message)}</div>`; }
      };
    };
    A.$('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = A.$('#identifier').value.trim(), pw = A.$('#password').value;
      setErr('identifier', id ? '' : 'Enter your email or phone number.'); setErr('password', pw ? '' : 'Enter your password.');
      if (!id || !pw) return;
      const btn = e.target.querySelector('button[type=submit]'); if (btn.dataset.working) return; busy(btn, true);
      try { A.store.set('sa_last_id', id); } catch (_) {}
      try {
        const chk = await A.api('POST', '/auth/login-check', { identifier: id, password: pw });
        let verify = '';
        if (chk.needCode) { busy(btn, false); verify = await askLoginCode(chk); if (!verify) return; busy(btn, true); }
        const r = await A.api('POST', '/auth/login', { identifier: id, password: pw, verify });
        A.setSession(r.token, r.user);
        const next = A.afterLogin; A.afterLogin = null;
        location.hash = next && !next.startsWith('#/login') ? next : '#/dashboard';
        A.render();
      } catch (err) { A.$('#msg').innerHTML = `<div class="err shake" role="alert">${esc(err.message)}</div>`; busy(btn, false); const pf = A.$('#password'); pf.value = ''; pf.focus(); }
    });
  };

  P.register = function () {
    const d = { name: '', email: '', phone: '', verify: '', password: '', confirmPassword: '', state: '', course: '', combo: [], targetScore: '', terms: false };
    try { const pv = sessionStorage.getItem('sa_verify'); if (pv) { d.verify = pv; const m = pv.match(/^SA1\.([^.]+)\./); if (m) { const pl = JSON.parse(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))); if (pl && pl.p) d.phone = '0' + pl.p; } } } catch (_) {}
    const needV = !!A.cfg.requireVerification;
    let step = 1;
    const stepper = () => `<div class="stepper"><div class="st ${step === 1 ? 'on' : 'done'}"><i>${step === 1 ? '1' : '✓'}</i>Account</div><div class="bar"></div><div class="st ${step === 2 ? 'on' : ''}"><i>2</i>Your JAMB plan</div></div>`;
    const draw = () => {
      A.view(`<div class="auth-shell">
        ${authSide('Start your JAMB journey.', `Create a free account and get ${A.cfg.dailyLimit} practice questions every day.`)}
        <div class="auth-main"><div class="auth-card">
          <h1>Create your account</h1><p class="sub">Free forever. Upgrade only when you want to.</p>
          ${stepper()}
          <div id="msg"></div>
          <form id="f" novalidate>${step === 1 ? `
            <div class="field" data-f="name"><label for="name">Full name</label><div class="iconfield">${ICON.user}<input id="name" autocomplete="name" placeholder="First and last name" value="${esc(d.name)}"></div><div class="msg"></div></div>
            <div class="field" data-f="email"><label for="email">Email address</label><div class="iconfield">${ICON.mail}<input id="email" type="email" autocomplete="email" placeholder="you@example.com" value="${esc(d.email)}"></div><div class="msg"></div></div>
            <div class="field" data-f="phone"><label for="phone">Phone number</label><div class="iconfield">${ICON.phone}<input id="phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="08012345678" value="${esc(d.phone)}"></div><span class="hint">Use the number you will pay with. Your Premium link is tied to it.</span><div class="msg"></div></div>
            ${needV ? (A.backend.on ? `<div class="field" data-f="verify"><label>Verify your email and phone</label><div id="vbox"></div><div class="msg"></div></div>` : `<div class="field" data-f="verify"><label for="verify">Phone verification code</label><textarea id="verify" rows="2" class="mono" placeholder="Paste the code we send to your WhatsApp" autocomplete="off" spellcheck="false">${esc(d.verify)}</textarea><div class="msg"></div><span class="hint">Only people we approve can register. We send this code to your own WhatsApp for this exact phone and email. <a href="#" id="getcode">Send me a code</a></span></div>`) : ''}
            ${pwField('password', 'Create password', 'new-password', 'placeholder="At least 8 characters"')}
            <div class="strength" id="strength" data-s="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
            <ul class="rules" id="rules"><li data-r="len">8+ characters</li><li data-r="let">A letter</li><li data-r="num">A number</li></ul>
            <div style="height:14px"></div>
            ${pwField('confirmPassword', 'Confirm password', 'new-password', 'placeholder="Type it again"')}
            <button class="btn grad block" type="submit">Continue</button>` : `
            <div class="grid2">
              <div class="field" data-f="state"><label for="state">State <span class="opt">(optional)</span></label><select id="state"><option value="">Choose your state</option>${STATES.map((s) => `<option ${d.state === s ? 'selected' : ''}>${s}</option>`).join('')}</select><div class="msg"></div></div>
              <div class="field" data-f="targetScore"><label for="targetScore">Target JAMB score <span class="opt">(optional)</span></label><select id="targetScore"><option value="">Not sure yet</option>${[200, 250, 280, 300, 320, 350, 380].map((n) => `<option ${String(d.targetScore) === String(n) ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
            </div>
            <div class="field" data-f="course"><label for="course">Course you want to study <span class="opt">(optional)</span></label><input id="course" placeholder="e.g. Medicine and Surgery" value="${esc(d.course)}"></div>
            <div class="field combo-grid"><div class="lbl">Your subject combination <small>(English is always included. Pick up to 3 more.)</small></div>
              ${groups().filter((g) => g.id !== 'core').map((g) => `<div class="group-pick ${g.id}"><h4>${esc(g.name)}</h4><div class="chips">${g.subjects.map((s) => `<button type="button" data-c="${esc(s)}" aria-pressed="${d.combo.includes(s)}" ${!d.combo.includes(s) && d.combo.length >= 3 ? 'disabled' : ''}>${esc(s)}</button>`).join('')}</div></div>`).join('')}
              <div class="group-pick core"><h4>Core</h4><div class="chips"><button type="button" data-c="Mathematics" aria-pressed="${d.combo.includes('Mathematics')}" ${!d.combo.includes('Mathematics') && d.combo.length >= 3 ? 'disabled' : ''}>Mathematics</button></div></div>
            </div>
            <div class="field" data-f="terms"><label class="checkrow"><input type="checkbox" id="terms" ${d.terms ? 'checked' : ''}><span>I agree to the <a href="#/terms" target="_blank" rel="noopener">Terms</a> and <a href="#/privacy" target="_blank" rel="noopener">Privacy policy</a>.</span></label><div class="msg"></div></div>
            <div class="row" style="flex-wrap:nowrap"><button class="btn ghost" type="button" id="back">Back</button><button class="btn grad" type="submit" style="flex:1">Create my account</button></div>`}
          </form>
          <p class="small" style="margin-top:18px;text-align:center">Already registered? <a href="#/login">Sign in</a></p>
          <p class="secure">${ICON.shield.replace('<svg', '<svg width="16" height="16"')} ${A.backend.on ? 'Your account is stored securely. We never sell your data.' : 'Your details stay on this device. We never sell your data.'}</p>
        </div></div></div>`, null, { bare: true });
      bindShow(); wire();
    };
    const val = {
      name: (v) => (v.trim().split(/\s+/).filter(Boolean).length >= 2 && v.trim().length >= 5 ? '' : 'Enter your first and last name.'),
      email: (v) => (emailRe.test(v.trim()) ? '' : 'Enter a valid email address.'),
      phone: (v) => (phoneRe.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a valid Nigerian number, for example 08012345678.'),
      verify: (v) => (!needV || (v || d.verify || '').trim().length > 20 ? '' : 'Paste the verification code sent to your WhatsApp.'),
      password: (v) => (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v) ? '' : 'Use 8+ characters with a letter and a number.'),
      confirmPassword: (v) => (v && v === A.$('#password').value ? '' : 'The two passwords do not match.')
    };
    function wire() {
      if (step === 1) {
        ['name', 'email', 'phone', 'verify', 'password', 'confirmPassword'].forEach((k) => {
          const el = A.$('#' + k); if (!el) return;
          el.addEventListener('blur', () => { if (el.value) setErr(k, val[k](el.value)); });
          el.addEventListener('input', () => { d[k] = el.value; if (A.$(`[data-f="${k}"]`).classList.contains('bad')) setErr(k, val[k](el.value)); });
        });
        if (A.backend.on && A.$('#vbox')) {
          const vb = A.$('#vbox'); let vid = null, sent = null;
          const vmsg = (t) => setErr('verify', t);
          const vdraw = () => {
            if (d.verify) { vb.innerHTML = '<div class="okmsg">✓ Email and phone verified</div>'; return; }
            if (!vid) { vb.innerHTML = '<p class="small muted" style="margin:0 0 8px">We send one code to your email and another to your phone to confirm they are yours.</p><button type="button" class="btn ghost small" id="vsend">Send my codes</button>'; A.$('#vsend').onclick = vsend; return; }
            vb.innerHTML = `<p class="small muted" style="margin:0 0 8px">Codes sent to <b>${esc(sent.email)}</b> and <b>${esc(sent.phone)}</b>.</p><div class="grid2"><div><input id="vec" inputmode="numeric" maxlength="6" placeholder="Email code" autocomplete="one-time-code"></div><div><input id="vsc" inputmode="numeric" maxlength="6" placeholder="Text message code"></div></div><div class="row" style="margin-top:8px"><button type="button" class="btn small" id="vok">Confirm</button><button type="button" class="btn ghost small" id="vagain">Send again</button></div>`;
            A.$('#vok').onclick = vconfirm; A.$('#vagain').onclick = () => { vid = null; vsend(); };
          };
          const vsend = async () => {
            const e1 = val.email(A.$('#email').value), p1 = val.phone(A.$('#phone').value.replace(/[\s-]/g, ''));
            if (e1) { setErr('email', e1); A.$('#email').focus(); return; } if (p1) { setErr('phone', p1); A.$('#phone').focus(); return; }
            vmsg(''); const b = A.$('#vsend') || A.$('#vagain'); if (b) { b.style.pointerEvents = 'none'; b.dataset.working = '1'; }
            try { const r = await A.backendPost('/api/register/start', { email: A.$('#email').value.trim(), phone: A.$('#phone').value }); vid = r.id; sent = r.sentTo; }
            catch (e) { vmsg(e.message); vid = null; }
            vdraw();
          };
          const vconfirm = async () => {
            vmsg('');
            try { const r = await A.backendPost('/api/register/verify', { id: vid, emailCode: A.$('#vec').value, smsCode: A.$('#vsc').value }); d.verify = r.token; A.toast('Email and phone verified', 'ok'); vdraw(); }
            catch (e) { vmsg(e.message); }
          };
          ['email', 'phone'].forEach((k) => A.$('#' + k).addEventListener('input', () => { if (d.verify || vid) { d.verify = ''; vid = null; vdraw(); } }));
          vdraw();
        }
        const gc = A.$('#getcode');
        if (gc) gc.onclick = (e) => {
          e.preventDefault();
          const ph = A.$('#phone').value.replace(/[\s-]/g, '');
          if (val.phone(ph)) { setErr('phone', val.phone(ph)); A.$('#phone').focus(); return; }
          const em = A.$('#email').value.trim();
          if (val.email(em)) { setErr('email', val.email(em)); A.$('#email').focus(); return; }
          const msg = `Hello, I am ${A.$('#name').value.trim() || 'a new student'}. Please send me my ScholarAce verification code.\nPhone: ${ph}\nEmail: ${em}`;
          window.open('https://wa.me/' + A.cfg.support.whatsapp + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
          A.toast('Send the message. We reply with your code on the same number.', 'ok');
        };
        const pw = A.$('#password');
        pw.addEventListener('input', () => {
          const v = pw.value; A.$('#strength').dataset.s = pwScore(v);
          const ok = { len: v.length >= 8, let: /[A-Za-z]/.test(v), num: /\d/.test(v) };
          A.$$('#rules li').forEach((li) => li.classList.toggle('ok', ok[li.dataset.r]));
        });
        pw.dispatchEvent(new Event('input'));
      } else {
        ['state', 'targetScore', 'course'].forEach((k) => A.$('#' + k).addEventListener('input', (e) => (d[k] = e.target.value)));
        A.$('#terms').addEventListener('change', (e) => { d.terms = e.target.checked; if (d.terms) setErr('terms', ''); });
        A.$$('[data-c]').forEach((b) => (b.onclick = () => { const s = b.dataset.c; d.combo = d.combo.includes(s) ? d.combo.filter((x) => x !== s) : d.combo.concat(s); const y = window.scrollY; draw(); window.scrollTo(0, y); }));
        A.$('#back').onclick = () => { step = 1; draw(); };
      }
      A.$('#f').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (step === 1) {
          let bad = false;
          ['name', 'email', 'phone', 'verify', 'password', 'confirmPassword'].forEach((k) => { if (!A.$('#' + k) && !(k === 'verify' && A.backend.on)) return; const m = val[k](k === 'verify' && A.backend.on ? d.verify : A.$('#' + k).value); setErr(k, m); if (m) bad = true; });
          if (bad) { const f = A.$('.field.bad input'); if (f) f.focus(); return; }
          step = 2; draw(); window.scrollTo(0, 0); return;
        }
        if (!d.terms) { setErr('terms', 'Please accept the Terms and Privacy policy to continue.'); return; }
        const btn = e.target.querySelector('button[type=submit]'); if (btn.dataset.working) return; busy(btn, true);
        try {
          const r = await A.api('POST', '/auth/register', Object.assign({}, d));
          try { sessionStorage.removeItem('sa_verify'); } catch (_) {}
          A.setSession(r.token, r.user);
          A.toast('Welcome to ScholarAce, ' + r.user.name.split(' ')[0] + '!', 'ok');
          const next = A.afterLogin; A.afterLogin = null;
          location.hash = next && !next.startsWith('#/login') && !next.startsWith('#/register') ? next : '#/dashboard'; A.render();
        } catch (err) {
          busy(btn, false);
          if (['name', 'email', 'phone', 'verify', 'password', 'confirmPassword'].includes(err.code)) { step = 1; draw(); setErr(err.code, err.message); const ef = A.$('#' + err.code); if (ef) ef.focus(); }
          else { A.$('#msg').innerHTML = `<div class="err" role="alert">${esc(err.message)}</div>`; window.scrollTo(0, 0); }
        }
      });
    }
    draw();
  };

  // =============== DASHBOARD ===============
  P.dashboard = async function () {
    A.view('<div class="page"><div class="wrap"><div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:180px;margin-top:20px"></div></div></div>', '#/dashboard');
    const [me, hist, cur] = await Promise.all([A.api('GET', '/auth/me'), A.api('GET', '/me/history'), A.api('GET', '/exams/current').catch(() => ({ attempt: null }))]);
    A.user = me.user; const u = me.user;
    const ticks = u.premium ? '' : (() => {
      const n = u.dailyLimit, on = Math.min(n, Math.round((u.usedToday / u.dailyLimit) * n));
      return `<div class="meter ${u.remainingToday === 0 ? 'full' : ''}" style="grid-template-columns:repeat(${n},1fr)" role="img" aria-label="${u.usedToday} of ${u.dailyLimit} questions used today">${Array.from({ length: n }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</div>`;
    })();
    const planCard = u.premium
      ? `<span class="chip pro">★ Premium</span><p class="big">Unlimited <span>questions</span></p><p class="muted">Your Premium runs ${u.premiumPlan === 'exam' ? '<b>until your JAMB exam</b>' : 'until <b>' + A.date(u.premiumUntil) + '</b>'}.</p><div class="row"><a class="btn small" href="#/library">Open library</a><a class="btn ghost small" href="#/premium">My plan</a></div>`
      : `<span class="chip">Free plan</span><p class="big">${u.remainingToday} <span>of ${u.dailyLimit} questions left today</span></p>${ticks}<p class="muted small">Resets at midnight, Nigerian time.</p><a class="btn gold small" href="#/premium">Upgrade to Premium</a>`;
    const weakest = hist.subjects.slice().sort((a, b) => a.percentage - b.percentage)[0];
    const combo = (u.combo || []).length ? ['English'].concat(u.combo) : [];
    A.view(`<div class="page"><div class="wrap">
      <div class="welcome"><div><h1>Hello, ${esc(u.name.split(' ')[0])} 👋</h1><p>${u.targetScore ? 'Your target is ' + u.targetScore + '. Let us get you there.' : 'Ready for today\'s practice?'}</p></div><a class="btn gold" href="#/start">Start an exam</a></div>
      ${cur.attempt ? `<div class="okmsg row between"><span>You have an exam in progress: ${esc(cur.attempt.title)}.</span><a class="btn small" href="#/exam/${cur.attempt.id}">Resume exam</a></div>` : ''}
      <div class="stats">
        <div class="stat" style="--c:var(--indigo)"><span>Exams taken</span><strong>${hist.exams}</strong></div>
        <div class="stat" style="--c:var(--teal)"><span>Average score</span><strong>${hist.exams ? hist.average + '%' : '–'}</strong></div>
        <div class="stat" style="--c:var(--amber)"><span>Answered today</span><strong>${u.usedToday}${u.premium ? '' : '<span class="muted" style="font-size:1rem;font-weight:600"> / ' + u.dailyLimit + '</span>'}</strong></div>
        <div class="stat" style="--c:${u.premium ? 'var(--violet)' : 'var(--rose)'}"><span>Plan</span><strong>${u.premium ? 'Premium' : 'Free'}</strong></div>
      </div>
      <div class="dash">
        <div class="stack">
          <div class="panel"><div class="row between"><h2 style="margin:0">Recent results</h2><a href="#/history">All results</a></div>
            ${hist.history.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Exam</th><th>Score</th><th>Date</th><th></th></tr></thead><tbody>${hist.history.slice(0, 5).map((h) => `<tr><td>${esc(h.title)}</td><td class="num">${h.jambScore != null ? h.jambScore + '/' + h.outOf : h.correct + '/' + h.total + ' (' + h.percentage + '%)'}</td><td>${A.date(h.date)}</td><td><a href="#/result/${h.id}">Review</a></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted" style="margin-top:12px">No exams yet. Start your first one and your results will show here.</p>`}
          </div>
          <div class="panel"><h2>Your subjects</h2>
            ${hist.subjects.length ? hist.subjects.map((s) => `<div class="bar"><span>${esc(s.name)}</span><span class="track"><span class="fill ${s.percentage < 50 ? 'weak' : ''}" style="display:block;width:${s.percentage}%"></span></span><span class="num">${s.percentage}%</span></div>`).join('') + (weakest && weakest.percentage < 60 ? `<p class="small muted">Spend more time on ${esc(weakest.name)}.</p>` : '') : '<p class="muted">Finish an exam to see which subjects are strongest.</p>'}
          </div>
        </div>
        <div class="stack">
          <div class="panel">${planCard}</div>
          ${combo.length ? `<div class="panel"><h2>My combination</h2><div class="chips">${combo.map((s) => `<button type="button" disabled style="opacity:1;cursor:default">${esc(s)}</button>`).join('')}</div></div>` : ''}
          <div class="panel"><h2>Quick links</h2><div class="quick">
            <a class="c-indigo" href="#/start">Practice<small>Pick a subject</small></a><a class="c-green" href="#/library">Library<small>Books and notes</small></a>
            <a class="c-amber" href="#/history">Results<small>Review mistakes</small></a><a class="c-violet" href="#/premium">Premium<small>Plans and activation</small></a></div></div>
        </div>
      </div>
    </div></div>`, '#/dashboard');
  };

  // =============== START EXAM ===============
  P.start = async function () {
    const me = await A.api('GET', '/auth/me'); A.user = me.user; const u = me.user;
    const cfg = A.cfg, counts = cfg.subjects, pace = cfg.secondsPerQuestion;
    const first = (u.combo && u.combo[0]) || 'English';
    const st = { mode: u.premium ? 'mock' : 'practice', subject: counts[first] ? first : 'English', subjects: (u.combo || []).filter((s) => s !== 'English' && counts[s]).slice(0, 3), count: u.premium ? 20 : 5, minutes: 30, custom: false, feedback: true, showMock: false };
    const draw = () => {
      const outOfQs = !u.premium && u.remainingToday === 0;
      const freeMax = u.premium ? 60 : Math.min(60, u.remainingToday);
      const mockQs = st.subjects.length === 3 ? Math.min(60, counts.English || 0) + st.subjects.reduce((n, s) => n + Math.min(40, counts[s] || 0), 0) : 0;
      let nQ, timeText;
      if (st.mode === 'mock') { nQ = mockQs; timeText = nQ ? minLabel(Math.min(cfg.mockMaxMinutes * 60000, nQ * pace * 1000)) : '–'; }
      else { nQ = Math.min(st.count, counts[st.subject] || 0, freeMax || 0); timeText = u.premium ? minLabel(nQ * pace * 1000) : st.minutes === 0 ? 'No time limit' : st.minutes + ' min'; }
      const lockedMock = st.mode === 'mock' && !u.premium;
      const tabs = u.premium ? [['mock', 'Full JAMB mock'], ['test', 'Subject test']] : [['practice', 'Practice'], ['mock', 'Full JAMB mock 🔒']];
      A.view(`<div class="page"><div class="wrap" style="max-width:860px">
        <h1>Start an exam</h1>
        ${!u.premium ? `<p class="muted">You have <b>${u.remainingToday}</b> of ${u.dailyLimit} free questions left today.</p>` : `<p class="muted">Premium: you sit it like the real JAMB, so the time is fixed.</p>`}
        ${outOfQs ? `<div class="err">You have used all ${u.dailyLimit} free questions today. They unlock again at midnight. <a href="#/premium">Upgrade for unlimited practice</a>.</div>` : ''}
        <div class="mode-tabs" role="tablist">${tabs.map(([k, t]) => `<button role="tab" aria-selected="${st.mode === k}" data-mode="${k}">${t}</button>`).join('')}</div>
        <div class="panel">
          ${st.mode === 'mock' ? `
            <p><b>English is included.</b> Choose 3 more subjects (${st.subjects.length} of 3 chosen):</p>
            ${groups().map((g) => { const subs = g.subjects.filter((s) => s !== 'English'); return subs.length ? `<div class="group-pick ${g.id}"><h4>${esc(g.name)}</h4><div class="chips">${subs.map((s) => `<button type="button" data-sub="${esc(s)}" aria-pressed="${st.subjects.includes(s)}" ${!st.subjects.includes(s) && st.subjects.length >= 3 ? 'disabled' : ''}>${esc(s)}</button>`).join('')}</div></div>` : ''; }).join('')}
          ` : `
            <div class="field"><div class="lbl">Subject</div>${groups().map((g) => `<div class="group-pick ${g.id}"><h4>${esc(g.name)}</h4><div class="chips">${g.subjects.map((s) => `<button type="button" data-one="${esc(s)}" aria-pressed="${st.subject === s}">${esc(s)}</button>`).join('')}</div></div>`).join('')}</div>
            <div class="field"><div class="lbl">Number of questions</div><div class="chips">${(u.premium ? [10, 20, 40, 60] : [5]).map((n) => `<button type="button" data-n="${n}" aria-pressed="${st.count === n}">${n}</button>`).join('')}</div>${!u.premium ? '<span class="hint">Free accounts are limited to what is left of today\'s allowance.</span>' : ''}</div>
          `}
          ${u.premium ? `<div class="timebox locked">${ICON.lock}<div><b>Time is fixed, like the real JAMB.</b><br><span class="small">${pace} seconds per question${st.mode === 'mock' ? ', up to ' + cfg.mockMaxMinutes + ' minutes' : ''}. You cannot pause or change it, and answers show only after you submit.</span></div></div>` : (st.mode === 'mock' ? '' : `
            <div class="field"><div class="lbl">How long do you want?</div>
              <div class="timebox"><div class="chips">
                <button type="button" data-t="0" aria-pressed="${!st.custom && st.minutes === 0}">No time limit</button>
                ${[10, 15, 20, 30, 45, 60, 90].map((m) => `<button type="button" data-t="${m}" aria-pressed="${!st.custom && st.minutes === m}">${m} min</button>`).join('')}
                <button type="button" data-t="custom" aria-pressed="${st.custom}">Custom</button></div>
                ${st.custom ? `<div class="custom-time"><input id="cm" type="number" min="1" max="240" value="${st.minutes || ''}" placeholder="Minutes" aria-label="Custom minutes"><span class="muted small">minutes (1 to 240)</span></div>` : ''}
                <span class="hint">As a Free student you decide the time. Premium uses real JAMB timing.</span></div></div>
            <label class="checkrow"><input type="checkbox" id="fb" ${st.feedback ? 'checked' : ''}><span><b>Show the answer after each question</b><br><span class="muted small">Answers are final once you choose. Turn off to practise like the real exam.</span></span></label>`)}
          ${lockedMock ? `<div class="infomsg" style="margin-top:14px">The full mock uses real JAMB timing and is for Premium members. <a href="#/premium">See Premium plans</a>.</div>` : `<div class="summary"><div><span>Questions</span><b>${nQ || '–'}</b></div><div><span>Time</span><b>${esc(timeText)}</b></div><div><span>Subject</span><b>${st.mode === 'mock' ? 'English + ' + (st.subjects.join(', ') || '…') : esc(st.subject)}</b></div></div>`}
          <button class="btn grad" id="go" ${lockedMock || outOfQs ? 'disabled' : ''}>Start exam</button>
          <div id="msg" style="margin-top:12px"></div>
        </div>
      </div></div>`, '#/start');
      A.$$('[data-mode]').forEach((b) => (b.onclick = () => { st.mode = b.dataset.mode; draw(); }));
      A.$$('[data-one]').forEach((b) => (b.onclick = () => { st.subject = b.dataset.one; draw(); }));
      A.$$('[data-n]').forEach((b) => (b.onclick = () => { st.count = Number(b.dataset.n); draw(); }));
      A.$$('[data-t]').forEach((b) => (b.onclick = () => { if (b.dataset.t === 'custom') { st.custom = true; st.minutes = st.minutes || 25; } else { st.custom = false; st.minutes = Number(b.dataset.t); } draw(); if (st.custom) A.$('#cm').focus(); }));
      A.$$('[data-sub]').forEach((b) => (b.onclick = () => { const s = b.dataset.sub; st.subjects = st.subjects.includes(s) ? st.subjects.filter((x) => x !== s) : st.subjects.concat(s); draw(); }));
      const cm = A.$('#cm'); if (cm) cm.oninput = () => { st.minutes = Math.max(0, parseInt(cm.value, 10) || 0); };
      const fb = A.$('#fb'); if (fb) fb.onchange = () => (st.feedback = fb.checked);
      A.$('#go').onclick = async (e) => {
        const btn = e.currentTarget;
        if (st.mode === 'mock' && st.subjects.length !== 3) { A.$('#msg').innerHTML = '<div class="err">Choose exactly 3 subjects besides English.</div>'; return; }
        if (!u.premium && st.custom && !(st.minutes >= 1)) { A.$('#msg').innerHTML = '<div class="err">Enter how many minutes you want (1 to 240).</div>'; return; }
        busy(btn, true, 'Preparing your exam...');
        try {
          const body = st.mode === 'mock' ? { mode: 'mock', subjects: st.subjects } : { mode: u.premium ? 'test' : 'practice', subject: st.subject, count: st.count, feedback: st.feedback, minutes: st.minutes };
          const r = await A.api('POST', '/exams/start', body);
          A.user = r.user; location.hash = '#/exam/' + r.attempt.id;
        } catch (err) {
          if (err.status === 409 && err.data && err.data.attemptId) { location.hash = '#/exam/' + err.data.attemptId; return; }
          A.$('#msg').innerHTML = `<div class="err" role="alert">${esc(err.message)}${err.code === 'LIMIT_REACHED' || err.code === 'PREMIUM_ONLY' ? ' <a href="#/premium">See Premium</a>' : ''}</div>`;
          busy(btn, false);
        }
      };
    };
    draw();
  };

  // =============== HISTORY ===============
  P.history = async function () {
    A.view('<div class="page"><div class="wrap"><div class="skeleton" style="height:200px"></div></div></div>', '#/history');
    const h = await A.api('GET', '/me/history');
    A.view(`<div class="page"><div class="wrap"><h1>Your results</h1><div class="panel">
      ${h.history.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Exam</th><th>Score</th><th>Percent</th><th>Date</th><th></th></tr></thead><tbody>${h.history.map((x) => `<tr><td>${esc(x.title)}</td><td class="num">${x.jambScore != null ? x.jambScore + ' / ' + x.outOf : x.correct + ' / ' + x.total}</td><td class="num">${x.percentage}%</td><td>${A.dateTime(x.date)}</td><td><a href="#/result/${x.id}">Review</a></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">You have not finished an exam yet. <a href="#/start">Start one now</a>.</p>'}
    </div></div></div>`, '#/history');
  };

  // =============== RESULT ===============
  P.result = async function (p) {
    A.view('<div class="page"><div class="wrap"><div class="skeleton" style="height:240px"></div></div></div>');
    const r = await A.api('GET', '/exams/' + p.id);
    if (r.attempt.status === 'in_progress') return (location.hash = '#/exam/' + p.id);
    const res = r.result, at = r.attempt;
    const main = res.jambScore != null ? res.jambScore : res.percentage;
    const sub = res.jambScore != null ? 'out of ' + res.outOf : 'percent';
    const ring = res.jambScore != null ? Math.round((res.jambScore / res.outOf) * 100) : res.percentage;
    const label = ring >= 70 ? 'Strong performance. Keep it up!' : ring >= 50 ? 'A fair start. Review the misses below.' : 'Keep practising. Review each miss below.';
    const shareText = `I scored ${res.jambScore != null ? res.jambScore + '/' + res.outOf : res.correct + '/' + res.total} on ScholarAce. Try it: ${location.origin}`;
    const draw = (filter) => {
      const items = res.review.filter((q) => filter === 'wrong' ? !q.isCorrect : true);
      A.$('#review').innerHTML = items.length ? items.map((q) => `<div class="review-item"><div class="small muted">${esc(q.subject)}, ${esc(q.topic || 'General')}</div>
        <p class="q-text">${esc(q.text)}</p>
        <div class="opts">${q.options.map((o, i) => `<div class="opt ${i === q.correct ? 'right' : i === q.chosen ? 'wrong' : ''}"><span class="bubble">${'ABCDE'[i]}</span><span>${esc(o)}</span><span class="mark">${i === q.correct ? 'Correct answer' : i === q.chosen ? 'Your answer' : ''}</span></div>`).join('')}</div>
        ${q.chosen == null ? '<p class="small" style="color:var(--rose);font-weight:700;margin-top:8px">You did not answer this question.</p>' : ''}
        ${q.explanation ? `<div class="explain">${esc(q.explanation)}</div>` : ''}</div>`).join('') : '<p class="okmsg">Nothing to show here. Every question was answered correctly.</p>';
    };
    A.view(`<div class="page"><div class="wrap" style="max-width:860px">
      <h1>${esc(at.title)}</h1>
      <div class="panel"><div class="score-hero">
        <div class="score-ring" style="--p:${ring}"><div><span>${main}<small>${sub}</small></span></div></div>
        <div><p style="font-size:1.2rem;font-weight:700;margin-bottom:4px;color:var(--ink)">${res.correct} of ${res.total} correct. ${res.answered < res.total ? `${res.total - res.answered} unanswered.` : ''}</p>
        <p class="muted">${label}${at.auto ? ' Your time ran out, so this exam was submitted automatically.' : ''}</p>
        ${Object.entries(res.perSubject).map(([k, v]) => `<div class="bar"><span>${esc(k)}</span><span class="track"><span class="fill ${v.correct / v.total < .5 ? 'weak' : ''}" style="display:block;width:${v.total ? (v.correct / v.total) * 100 : 0}%"></span></span><span class="num">${v.correct}/${v.total}</span></div>`).join('')}
        <div class="row no-print" style="margin-top:14px"><button class="btn small" id="pr">Print or save as PDF</button><button class="btn ghost small" id="sh">Share score</button><a class="btn ghost small" href="#/start">Take another</a></div></div>
      </div></div>
      <div class="panel" style="margin-top:20px"><div class="row between"><h2 style="margin:0">Review your answers</h2>
        <div class="mode-tabs no-print" style="margin:0"><button data-f="all" aria-selected="true">All</button><button data-f="wrong" aria-selected="false">Missed only</button></div></div>
        <div id="review"></div></div>
    </div></div>`);
    draw('all');
    A.$$('[data-f]').forEach((b) => (b.onclick = () => { A.$$('[data-f]').forEach((x) => x.setAttribute('aria-selected', x === b)); draw(b.dataset.f); }));
    A.$('#pr').onclick = () => window.print();
    A.$('#sh').onclick = async () => {
      try { if (navigator.share) await navigator.share({ text: shareText }); else { await navigator.clipboard.writeText(shareText); A.toast('Score copied. Paste it anywhere.', 'ok'); } } catch (_) {}
    };
  };

  // =============== PREMIUM / PAYMENT ===============
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); A.toast('Copied', 'ok'); } catch (_) { A.toast('Copy failed. Select and copy it by hand.', 'error'); } };
  const waLink = (text) => 'https://wa.me/' + A.cfg.support.whatsapp + '?text=' + encodeURIComponent(text);

  function paymentModal(payment, payTo) {
    const u = A.user;
    const msg = `Hello, I want ScholarAce Premium (${payment.planName}, ${A.naira(payment.amount)}).\nName: ${u.name}\nPhone: ${u.phone}\nPayment reference: ${payment.reference}\nI paid to ${payTo.bank} ${payTo.accountNumber}. My receipt is attached.`;
    const mail = 'mailto:' + A.cfg.support.email + '?subject=' + encodeURIComponent('ScholarAce Premium payment ' + payment.reference) + '&body=' + encodeURIComponent(msg);
    const m = A.modal(`<h2>Pay for ${esc(payment.planName)}</h2>
      <div class="err" style="margin-bottom:12px"><b>Send the money to our Opay account below, and nowhere else.</b></div><p>Transfer exactly <b>${A.naira(payment.amount)}</b> to this Opay account and put your reference in the transfer note.</p>
      <div class="copyline"><span>Account number<br><b>${esc(payTo.accountNumber)}</b></span><button class="btn ghost small" data-copy="${esc(payTo.accountNumber)}">Copy</button></div>
      <p class="small" style="margin:0 0 4px">${esc(payTo.bank)}, account name <b>${esc(payTo.accountName)}</b></p>
      <div class="copyline"><span>Your reference<br><b>${esc(payment.reference)}</b></span><button class="btn ghost small" data-copy="${esc(payment.reference)}">Copy</button></div>
      <hr style="border:0;border-top:1px solid var(--line);margin:16px 0">
      <h3>After you have paid</h3>
      <p>Send your receipt screenshot to us on WhatsApp. We confirm the payment and send you an <b>activation code</b>. Enter it on the Premium page while signed in and Premium starts. Each code works for one student only and only once.</p>
      <div class="actions"><button type="button" class="btn ghost" data-close>Pay later</button><a class="btn grad" href="${waLink(msg)}" target="_blank" rel="noopener">Send receipt on WhatsApp</a></div>
      <p class="small muted" style="margin-top:12px">Prefer email? <a href="${mail}">Email your receipt</a> with the same details.</p>`, { wide: true });
    m.box.querySelectorAll('[data-copy]').forEach((b) => (b.onclick = () => copy(b.dataset.copy)));
  }

  P.premium = async function () {
    const cfg = A.cfg;
    if (A.user) { try { A.user = (await A.api('GET', '/auth/me')).user; } catch (_) {} }
    const u = A.user;
    A.view(`<div class="page"><div class="wrap">
      <div class="section-head center"><h1>${u && u.premium ? 'Your Premium plan' : 'Go Premium'}</h1>
      <p>${u && u.premium ? `You are on Premium ${u.premiumPlan === 'exam' ? '<b>until your JAMB exam</b>' : 'until <b>' + A.date(u.premiumUntil) + '</b>'}. Activating another code adds time on top.` : 'Sit the real JAMB experience: full mocks at exam pace, unlimited questions and a downloadable study library.'}</p></div>
      <div class="plans" style="margin-top:34px">${planCards({ button: (p) => `<button class="btn ${p.best ? 'grad' : 'ghost'} block" data-plan="${esc(p.id)}">${u ? 'Choose ' + esc(p.name) : 'Create account to buy'}</button>` })}</div>
      <div class="dash" style="margin-top:28px">
        <div class="panel"><h2>How to get Premium</h2>
          <ol><li><b>Choose a plan.</b> You will see our Opay account number and your payment reference.</li><li><b>Send the exact amount to our Opay account</b> with the reference in the note. Pay nobody else.</li><li><b>Send your receipt on WhatsApp.</b> We confirm your payment.</li><li><b>We send you an activation code.</b> Type it in the box on this page (or open the activation link if we sent one).</li></ol>
          <p class="small muted">Payment problem? Call or message <a href="https://wa.me/${esc(cfg.support.whatsapp)}" target="_blank" rel="noopener">${esc(cfg.support.phone)}</a> with your reference.</p></div>
        ${u ? `<div class="panel"><h2>Have an activation code?</h2><p class="muted small">Type the code we sent you on WhatsApp. A code works for one student only, once.</p><div id="cmsg"></div>
          <form id="cf" novalidate><div class="field"><label for="code">Activation code</label><textarea id="code" rows="2" placeholder="SA-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false"></textarea></div><button class="btn grad block" type="submit">Activate Premium</button></form></div>` : `<div class="panel"><h2>Already paid?</h2><p class="muted">Sign in first, then enter your activation code here.</p><a class="btn block" href="#/login">Sign in</a></div>`}
      </div>
    </div></div>`, '#/premium');
    A.$$('[data-plan]').forEach((b) => (b.onclick = async () => {
      if (!A.user) { A.afterLogin = '#/premium'; location.hash = '#/register'; return; }
      busy(b, true, 'One moment...');
      try { const r = await A.api('POST', '/payments', { planId: b.dataset.plan }); busy(b, false); paymentModal(r.payment, r.payTo); }
      catch (err) { busy(b, false); A.toast(err.message, 'error'); }
    }));
    const cf = A.$('#cf');
    if (cf) cf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = cf.querySelector('button'); busy(btn, true, 'Checking...');
      try {
        const r = await A.api('POST', '/premium/redeem', { code: A.$('#code').value });
        A.user = r.user; P.premium();
        const m = A.modal(`<div style="text-align:center"><div style="font-size:3rem;line-height:1">✅</div><h2 style="margin:10px 0 6px">Premium successfully activated!</h2><p>Congratulations${A.user.name ? ', ' + esc(A.user.name.split(' ')[0]) : ''}. Your Premium is on ${esc(r.label)}.</p><p class="muted small">Full JAMB mocks, unlimited questions and the study library are now unlocked.</p><div class="actions" style="justify-content:center"><a class="btn grad" href="#/start" data-close>Start a full mock</a><a class="btn ghost" href="#/library" data-close>Open the library</a></div></div>`);
      } catch (err) { A.$('#cmsg').innerHTML = `<div class="err" role="alert">${esc(err.message)}</div>`; busy(btn, false); }
    });
  };

  // Opened from the verification link: #/verify/<token> -> goes to registration with the code filled in
  P.verifyLink = function (p) {
    try { sessionStorage.setItem('sa_verify', p.token); } catch (_) {}
    location.hash = '#/register';
  };

  // Opened from the personal activation link: #/activate/<token>
  P.activate = async function (p) {
    A.view('<div class="page"><div class="wrap" style="max-width:560px"><div class="skeleton" style="height:180px"></div></div></div>');
    let body;
    try {
      const r = await A.api('POST', '/premium/redeem', { code: p.token });
      A.user = r.user;
      body = `<div class="okmsg" style="font-size:1.05rem">✓ Premium successfully activated! It is on ${esc(r.label)}.</div><h1>You are Premium!</h1><p>Unlimited questions, full JAMB mocks and the study library are now unlocked.</p><div class="row"><a class="btn grad" href="#/start">Start a full mock</a><a class="btn ghost" href="#/library">Open the library</a></div>`;
    } catch (err) {
      if (err.status === 401) return;
      body = `<div class="err" role="alert">${esc(err.message)}</div><h1>Activation problem</h1><p>Message us on WhatsApp and we will sort it out quickly.</p><div class="row"><a class="btn" href="https://wa.me/${esc(A.cfg.support.whatsapp)}" target="_blank" rel="noopener">WhatsApp us</a><a class="btn ghost" href="#/premium">Back to Premium</a></div>`;
    }
    A.view(`<div class="page"><div class="wrap" style="max-width:560px">${body}</div></div>`, '#/premium');
  };

  // =============== LIBRARY ===============
  P.library = async function () {
    A.view('<div class="page"><div class="wrap"><div class="skeleton" style="height:240px"></div></div></div>', '#/library');
    const r = await A.api('GET', '/library');
    const cats = Array.from(new Set(r.items.map((b) => b.category)));
    const colours = { 'Story books': 'linear-gradient(135deg,#be123c,#f97316)', Textbooks: 'linear-gradient(135deg,#4338ca,#0ea5e9)', 'Revision notes': 'linear-gradient(135deg,#0f766e,#166534)', 'Past questions': 'linear-gradient(135deg,#7c3aed,#db2777)' };
    let cat = '';
    const draw = () => {
      const list = r.items.filter((b) => !cat || b.category === cat);
      A.$('#lib').innerHTML = list.length ? list.map((b) => `<article class="book"><div class="cover" style="background:${colours[b.category] || 'var(--grad)'}">${!r.premium ? `<span class="lock-tag">🔒 Premium</span>` : ''}<small>${esc(b.category)}</small><strong>${esc(b.title)}</strong></div>
        <div class="body"><span class="small muted">${esc([b.author, b.subject].filter(Boolean).join(' · '))}</span><p>${esc(b.description || '')}</p>
        ${r.premium && b.file ? `<a class="btn small grad" href="${esc(b.file)}" data-dl="${esc(b.file)}" download="${esc(b.file.split('/').pop())}">Download ${esc((b.format || 'PDF').toUpperCase())}${b.size ? ' (' + esc(b.size) + ')' : ''}</a>` : `<a class="btn small gold" href="#/premium">Unlock with Premium</a>`}</div></article>`).join('') : '<p class="muted">Nothing here yet.</p>';
    };
    A.view(`<div class="page"><div class="wrap">
      <div class="row between"><div><h1>Study library</h1><p class="muted">JAMB story books, textbooks and revision notes. ${r.premium ? 'Download any title.' : 'Premium members can download every title.'}</p></div>${r.premium ? '' : '<a class="btn gold" href="#/premium">Unlock the library</a>'}</div>
      ${r.items.length ? `<div class="chips" style="margin:6px 0 20px"><button type="button" data-cat="" aria-pressed="true">All</button>${cats.map((c) => `<button type="button" data-cat="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}</div><div class="lib-grid" id="lib"></div>` : '<div class="panel"><p>The library is being stocked. Check back soon.</p></div>'}
    </div></div>`, '#/library');
    // Downloads work one after another, with no refresh: each click fetches the file and saves it, then the button is ready again
    A.$('#lib') && A.$('#lib').addEventListener('click', async (e) => {
      const a = e.target.closest('[data-dl]'); if (!a) return;
      e.preventDefault();
      if (a.dataset.busy === '1') return; a.dataset.busy = '1';
      const label = a.textContent, url = a.dataset.dl, name = url.split('/').pop();
      const save = (href) => { const l = document.createElement('a'); l.href = href; l.download = name; l.style.display = 'none'; document.body.appendChild(l); l.click(); setTimeout(() => l.remove(), 1000); };
      a.textContent = 'Downloading...';
      try {
        if (location.protocol === 'file:') throw new Error('file');
        const res = await fetch(url, { cache: 'no-store' }); if (!res.ok) throw new Error('bad');
        const blob = await res.blob(); const href = URL.createObjectURL(blob); save(href); setTimeout(() => URL.revokeObjectURL(href), 30000);
        A.toast('Download started: ' + name, 'ok');
      } catch (_) { save(url); }
      setTimeout(() => { a.textContent = label; a.dataset.busy = ''; }, 1200);
    });
    if (r.items.length) {
      draw();
      A.$$('[data-cat]').forEach((b) => (b.onclick = () => { cat = b.dataset.cat; A.$$('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(); }));
    }
  };
})();
