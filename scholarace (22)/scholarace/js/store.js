/* ScholarAce engine. This is everything a server used to do (accounts, exam building, marking, the daily
   limit, Premium activation), written in plain JavaScript and saved in the browser's localStorage.

   Honest limits of a site with no server:
   - Accounts and progress live on the device they were created on.
   - The daily limit and Premium are enforced by this script, so a determined student who edits
     their own browser data can get around them. That is the trade-off of having no back end. */
(function () {
  const CFG = window.SA_CONFIG;
  const QS = (window.SA_QUESTIONS || []).filter((q) => q && q.options && q.options.length >= 2);
  const LIB = window.SA_LIBRARY || [];
  const CODES = window.SA_CODES || [];
  const C = window.SACrypto;
  const KEY = 'scholarace_db_v1';
  const TZ = 'Africa/Lagos';
  let memoryOnly = false;

  const blank = () => ({ users: [], attempts: [], redeemed: [], counters: {}, session: null });
  try { localStorage.setItem('sa_probe', '1'); localStorage.removeItem('sa_probe'); } catch (_) { memoryOnly = true; }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); if (d && Array.isArray(d.users)) return Object.assign(blank(), d); } } catch (_) {}
    return blank();
  }
  let db = load();
  function save() { if (!memoryOnly) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (_) { memoryOnly = true; } } try { schedulePush(); } catch (_) {} }
  // ---------- cloud accounts (only when the optional server is running) ----------
  const cloud = () => !!(window.SA_BACKEND_ON && window.SA_BACKEND_BASE && CFG.cloudAccounts !== false);
  const getCS = () => { try { return localStorage.getItem('sa_cloud') || ''; } catch (_) { return ''; } };
  const setCS = (t) => { try { t ? localStorage.setItem('sa_cloud', t) : localStorage.removeItem('sa_cloud'); } catch (_) {} };
  async function cpost(path, body, token) {
    let r;
    try { r = await fetch(window.SA_BACKEND_BASE + '/api/account' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (token || '') }, body: JSON.stringify(body || {}) }); }
    catch (_) { const e = new Error('Could not reach the ScholarAce server. Check your connection and try again.'); e.status = 0; e.offline = true; e.data = { error: e.message }; throw e; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.message || 'Something went wrong.'); e.status = r.status; e.code = j.code; e.data = { error: e.message, code: j.code }; throw e; }
    return j;
  }
  function installAccount(a) {
    let u = db.users.find((x) => x.id === a.id);
    const base = { id: a.id, name: a.name, email: a.email, phone: a.phone, state: a.state || '', course: a.course || '', combo: a.combo || [], targetScore: a.targetScore || null, salt: '', passwordHash: 'cloud', premiumUntil: a.premiumUntil || null, premiumPlan: a.premiumPlan || null };
    if (u) Object.assign(u, base); else { u = Object.assign({ createdAt: now(), usage: null, seen: [] }, base); db.users.push(u); }
    if (a.usage) u.usage = a.usage;
    if (a.seen) u.seen = a.seen;
    const mine = new Map(db.attempts.filter((x) => x.userId === a.id).map((x) => [x.id, x]));
    for (const x of a.attempts || []) { const l = mine.get(x.id); if (!l || (x.status === 'submitted' && l.status !== 'submitted')) mine.set(x.id, x); }
    db.attempts = db.attempts.filter((x) => x.userId !== a.id).concat(Array.from(mine.values()));
    const maxA = Math.max(0, ...db.attempts.map((x) => x.id), (a.counters && a.counters.a) || 0); db.counters.a = Math.max(db.counters.a || 0, maxA);
    return u;
  }
  let pushTimer = null;
  async function pushNow() {
      const u = db.users.find((x) => x.id === db.session); if (!u || !cloud() || !getCS()) return;
      let atts = db.attempts.filter((x) => x.userId === u.id).sort((x, y) => y.id - x.id), size = 0, keep = [];
      for (const x of atts) { const n = JSON.stringify(x).length; if (size + n > 2.5e6 || keep.length >= 40) break; size += n; keep.push(x); }
      try { await cpost('/data', { data: { usage: u.usage, seen: (u.seen || []).slice(-3000), attempts: keep, counters: { a: db.counters.a || 0 } } }, getCS()); } catch (e) { if (e.status === 401) { setCS(''); } }
  }
  function schedulePush() { if (!cloud() || !getCS() || pushTimer) return; pushTimer = setTimeout(() => { pushTimer = null; pushNow(); }, 1500); }
  async function pullMe(u) {
    if (!cloud() || !getCS()) return;
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 2500);
      const r = await fetch(window.SA_BACKEND_BASE + '/api/account/me', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getCS() }, body: '{}', signal: ctl.signal }); clearTimeout(t);
      if (r.status === 401) { setCS(''); db.session = null; save(); throw E(401, 'Please sign in again.', 'UNAUTH'); }
      if (r.ok) { installAccount(await r.json()); }
    } catch (e) { if (e && e.status === 401) throw e; }
  }
  const nextId = (name) => (db.counters[name] = (db.counters[name] || 0) + 1);

  // ---------- helpers ----------
  const now = () => Date.now();
  function todayLagos() {
    try { return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); }
    catch (_) { return new Date(now() + 3600000).toISOString().slice(0, 10); }
  }
  const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const clean = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n || 200);
  const clone = (o) => (o === undefined ? o : JSON.parse(JSON.stringify(o)));
  const isPremium = (u) => !!u.premiumUntil && u.premiumUntil > now();
  function E(status, error, code, extra) { const e = new Error(error); e.status = status; e.code = code; e.data = Object.assign({ error, code }, extra || {}); return e; }

  function usageToday(u) {
    const d = todayLagos();
    if (!u.usage || u.usage.date !== d) u.usage = { date: d, count: 0 };
    return u.usage;
  }
  function publicUser(u) {
    const us = usageToday(u), prem = isPremium(u);
    return {
      id: u.id, name: u.name, email: u.email, phone: u.phone, state: u.state, course: u.course, combo: u.combo || [], targetScore: u.targetScore || null, role: 'student',
      premium: prem, premiumUntil: prem ? u.premiumUntil : null, premiumPlan: prem ? (u.premiumPlan || null) : null, usedToday: us.count,
      dailyLimit: prem ? null : CFG.dailyLimit, remainingToday: prem ? null : Math.max(0, CFG.dailyLimit - us.count)
    };
  }
  const GROUPS = [
    { id: 'science', name: 'Science', subjects: ['Physics', 'Chemistry', 'Biology', 'Agricultural Science', 'Computer Studies', 'Geography'] },
    { id: 'arts', name: 'Arts and Humanities', subjects: ['Literature in English', 'Government', 'History', 'Christian Religious Studies', 'Islamic Studies', 'Art', 'Music', 'Home Economics'] },
    { id: 'commercial', name: 'Commercial and Social Science', subjects: ['Economics', 'Commerce', 'Principles of Accounts'] },
    { id: 'languages', name: 'Languages', subjects: ['French', 'Yoruba', 'Igbo', 'Hausa'] }
  ];
  const subjectCounts = () => { const s = {}; for (const q of QS) s[q.subject] = (s[q.subject] || 0) + 1; return s; };
  const qById = (id) => QS.find((q) => q.id === id);

  // ---------- exams ----------
  function buildItems(user, subjects, perSubject, topic) {
    const seen = new Set(user.seen || []);
    const picked = [];
    for (const subj of subjects) {
      const pool = QS.filter((q) => q.subject === subj && (!topic || q.topic === topic));
      const ordered = shuffle(pool.filter((q) => !seen.has(q.id))).concat(shuffle(pool.filter((q) => seen.has(q.id))));
      for (const q of ordered.slice(0, perSubject[subj] || perSubject.default)) {
        picked.push({ id: q.id, subject: subj, perm: shuffle(q.options.map((_, i) => i)) });
      }
    }
    return picked;
  }
  function questionView(item) {
    const q = qById(item.id);
    return { id: q.id, subject: item.subject, topic: q.topic, text: q.text, options: item.perm.map((i) => q.options[i]) };
  }
  function attemptView(a) {
    return { id: a.id, mode: a.mode, title: a.title, subjects: a.subjects, feedback: a.feedback, startedAt: a.startedAt, endsAt: a.endsAt, serverNow: now(), untimed: !!a.untimed, paced: !!a.paced, begun: a.begun !== false, dur: a.dur || 0, status: a.status, questions: a.items.map(questionView), answers: a.answers };
  }
  function grade(a) {
    const perSubject = {}; let correct = 0, answered = 0;
    const review = a.items.map((item) => {
      const q = qById(item.id), chosen = a.answers[item.id];
      const correctShown = item.perm.indexOf(q.answer), ok = chosen === correctShown;
      const ps = (perSubject[item.subject] = perSubject[item.subject] || { total: 0, correct: 0, answered: 0 });
      ps.total++; if (chosen != null) { ps.answered++; answered++; } if (ok) { ps.correct++; correct++; }
      return { id: q.id, subject: item.subject, topic: q.topic, text: q.text, options: item.perm.map((i) => q.options[i]), chosen: chosen == null ? null : chosen, correct: correctShown, isCorrect: ok, explanation: q.explanation || '' };
    });
    const total = a.items.length;
    const result = { total, answered, correct, percentage: total ? Math.round((correct / total) * 100) : 0, perSubject, review };
    if (a.mode === 'mock') {
      let score = 0;
      for (const s of Object.values(perSubject)) { s.score = s.total ? Math.round((s.correct / s.total) * 100) : 0; score += s.score; }
      result.jambScore = score; result.outOf = 100 * Object.keys(perSubject).length;
    }
    return result;
  }
  function finish(a, user, auto) {
    if (a.status === 'submitted') return a.result;
    a.status = 'submitted'; a.submittedAt = Math.min(now(), a.endsAt); a.auto = !!auto; a.result = grade(a);
    user.seen = Array.from(new Set((user.seen || []).concat(a.items.map((i) => i.id)))).slice(-1500);
    // keep the browser data small: remember only the 60 newest finished exams per student
    const mine = db.attempts.filter((x) => x.userId === user.id && x.status === 'submitted').sort((x, y) => y.submittedAt - x.submittedAt);
    const drop = new Set(mine.slice(60).map((x) => x.id));
    if (drop.size) db.attempts = db.attempts.filter((x) => !drop.has(x.id));
    save();
    return a.result;
  }
  function own(user, id) {
    const a = db.attempts.find((x) => x.id === Number(id) && x.userId === user.id);
    if (!a) throw E(404, 'Exam not found.');
    return a;
  }

  // ---------- route table ----------
  const routes = [];
  const R = (method, pattern, fn, auth) => routes.push({ method, re: new RegExp('^' + pattern.replace(':id', '(\\d+)') + '$'), fn, auth: auth !== false });
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, phoneRe = /^(\+?234|0)[789][01]\d{8}$/;

  const planView = (p) => Object.assign({}, p, { endsOn: p.until ? CFG.jambDate : null });
  R('GET', '/config', () => ({
    requireVerification: !!(CFG.requireVerification !== false && CFG.ownerPublicKey), brand: CFG.brand, tagline: CFG.tagline, support: CFG.support, dailyLimit: CFG.dailyLimit, plans: CFG.plans.map(planView), jambDate: CFG.jambDate,
    announcement: CFG.announcement || '', secondsPerQuestion: CFG.secondsPerQuestion, mockMaxMinutes: CFG.mockMaxMinutes, payment: CFG.payment,
    subjects: subjectCounts(), groups: GROUPS, storageOk: !memoryOnly, libraryCount: LIB.length
  }), false);

  R('POST', '/auth/register', async ({ body }) => {
    if (cloud()) {
      try {
        const r = await cpost('/register', body);
        setCS(r.session); const u = installAccount(r.account); db.session = u.id; save();
        return { token: String(u.id), user: publicUser(u) };
      } catch (e) { if (e.status && e.data && e.data.code) throw e; throw e; }
    }
    const name = clean(body.name, 80), email = clean(body.email, 120).toLowerCase(), phone = clean(body.phone, 20).replace(/[\s-]/g, '');
    const password = String(body.password || '');
    if (name.split(/\s+/).filter(Boolean).length < 2 || name.length < 5) throw E(400, 'Please enter your first and last name.', 'name');
    if (!emailRe.test(email)) throw E(400, 'Enter a valid email address.', 'email');
    if (!phoneRe.test(phone)) throw E(400, 'Enter a valid Nigerian phone number, for example 08012345678.', 'phone');
    let vp = null;
    if (CFG.requireVerification !== false && CFG.ownerPublicKey) {
      try { vp = await C.verifyToken(CFG.ownerPublicKey, body.verify); } catch (_) { throw E(400, 'Enter the verification code we sent to your phone on WhatsApp.', 'verify'); }
      if (vp.k !== 'reg' || vp.p !== C.last10(phone)) throw E(400, 'This code was made for a different phone number. Check the number above.', 'verify');
      if (String(vp.m || '').toLowerCase() !== email) throw E(400, 'This code was made for a different email address. Use the exact email you gave us.', 'verify');
      if (vp.by < Date.now()) throw E(400, 'This code has expired. Ask for a new one on WhatsApp.', 'verify');
      if (db.redeemed.includes(vp.n)) throw E(409, 'This verification code has already been used.', 'verify');
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw E(400, 'Use a password of at least 8 characters with a letter and a number.', 'password');
    if (password !== String(body.confirmPassword || '')) throw E(400, 'The two passwords do not match.', 'confirmPassword');
    if (!body.terms) throw E(400, 'Please accept the Terms and Privacy policy to continue.', 'terms');
    if (db.users.some((u) => u.email === email)) throw E(409, 'An account with this email already exists on this device. Sign in instead.', 'email');
    if (db.users.some((u) => C.last10(u.phone) === C.last10(phone))) throw E(409, 'An account with this phone number already exists on this device. Sign in instead.', 'phone');
    const known = subjectCounts();
    const combo = (Array.isArray(body.combo) ? body.combo : []).map((x) => clean(x, 40)).filter((x) => known[x]).slice(0, 4);
    const target = parseInt(body.targetScore, 10);
    const salt = C.randomHex(12);
    const u = { id: nextId('u'), name, email, phone, state: clean(body.state, 40), course: clean(body.course, 80), combo, targetScore: target >= 100 && target <= 400 ? target : null, salt, passwordHash: await C.derivePassword(password, salt), createdAt: now(), premiumUntil: null, usage: null, seen: [] };
    if (vp) db.redeemed.push(vp.n);
    u.phoneVerified = !!vp;
    db.users.push(u); db.session = u.id; save();
    return { token: String(u.id), user: publicUser(u) };
  }, false);

  const cloudLoginErr = (e) => { if (e.status === 401 || e.status === 429) { e.code = 'BAD_LOGIN'; e.data = Object.assign({}, e.data, { noRedirect: true }); } return e; };
  async function checkLogin(body) {
    const id = clean(body.identifier, 120).toLowerCase().replace(/\s/g, '');
    const u = db.users.find((x) => x.email === id || C.last10(x.phone) === C.last10(id));
    const pw = String(body.password || '');
    let good = false;
    if (u) {
      if (/^p[12]\$/.test(u.passwordHash)) good = (await C.derivePassword(pw, u.salt)) === u.passwordHash;
      else if (C.hashPassword(pw, u.salt) === u.passwordHash) { good = true; u.passwordHash = await C.derivePassword(pw, u.salt); } // upgrade an old account to the fast hash
    }
    if (!good) throw E(401, 'Incorrect email/phone or password. Accounts are saved on the device you registered on.', 'BAD_LOGIN', { noRedirect: true });
    return u;
  }
  const needLoginCode = () => !!(window.SA_BACKEND_ON && CFG.ownerPublicKey && CFG.requireVerification !== false);
  // Step 1 of sign-in when the code server is on: check the password, then tell the page where the code must go
  R('POST', '/auth/login-check', async ({ body }) => {
    if (cloud()) { try { const r = await cpost('/login-check', body); return { needCode: true, phone: r.phone, email: r.email }; } catch (e) { throw cloudLoginErr(e); } }
    const u = await checkLogin(body);
    return { needCode: needLoginCode(), phone: u.phone, email: u.email };
  }, false);

  R('POST', '/auth/login', async ({ body }) => {
    if (cloud()) {
      try { const r = await cpost('/login', body); setCS(r.session); const u = installAccount(r.account); db.session = u.id; save(); return { token: String(u.id), user: publicUser(u) }; }
      catch (e) { throw cloudLoginErr(e); }
    }
    const u = await checkLogin(body);
    if (needLoginCode()) {
      let vp; try { vp = await C.verifyToken(CFG.ownerPublicKey, body.verify); } catch (_) { throw E(401, 'Enter the sign-in code we sent to your email and phone.', 'BAD_LOGIN', { noRedirect: true }); }
      if (vp.k !== 'login' || vp.p !== C.last10(u.phone) || String(vp.m || '').toLowerCase() !== u.email || vp.by < Date.now()) throw E(401, 'That sign-in code is not valid or has expired. Request a new one.', 'BAD_LOGIN', { noRedirect: true });
      if (db.redeemed.includes(vp.n)) throw E(401, 'That sign-in code was already used.', 'BAD_LOGIN', { noRedirect: true });
      db.redeemed.push(vp.n);
    }
    db.session = u.id; save();
    return { token: String(u.id), user: publicUser(u) };
  }, false);

  R('GET', '/auth/me', async ({ user }) => { await pullMe(user); const u = db.users.find((x) => x.id === user.id) || user; save(); return { user: publicUser(u) }; });
  R('POST', '/auth/logout', async () => { if (cloud() && getCS()) { try { await pushNow(); await cpost('/logout', {}, getCS()); } catch (_) {} } setCS(''); db.session = null; save(); return { ok: true }; }, false);

  // Forgot password: with no server there is nobody to email, so the student can erase the account on this device and start again.
  R('POST', '/auth/reset-local', ({ body }) => {
    const id = clean(body.identifier, 120).toLowerCase().replace(/\s/g, '');
    const u = db.users.find((x) => x.email === id || C.last10(x.phone) === C.last10(id));
    if (!u) throw E(404, 'No account with that email or phone number was found on this device.');
    db.attempts = db.attempts.filter((a) => a.userId !== u.id);
    db.users = db.users.filter((x) => x.id !== u.id);
    if (db.session === u.id) db.session = null;
    save(); return { ok: true };
  }, false);

  R('POST', '/exams/start', ({ user: u, body: b }) => {
    const premium = isPremium(u), us = usageToday(u);
    const remaining = premium ? Infinity : Math.max(0, CFG.dailyLimit - us.count);
    // Free: 'practice' (you choose the time). Premium: 'mock' or 'test' (fixed JAMB pace, no choice of time).
    let mode = ['mock', 'test', 'practice'].includes(b.mode) ? b.mode : 'practice';
    if (premium && mode === 'practice') mode = 'test';
    const open = db.attempts.find((a) => a.userId === u.id && a.status === 'in_progress' && a.endsAt > now());
    if (open) throw E(409, 'You have an exam in progress. Resume it first.', undefined, { attemptId: open.id });
    for (const a of db.attempts) if (a.userId === u.id && a.status === 'in_progress' && a.endsAt <= now()) finish(a, u, true);
    if (remaining <= 0) throw E(403, `You have used your ${CFG.dailyLimit} free questions for today. Upgrade to Premium for unlimited practice.`, 'LIMIT_REACHED');
    const available = subjectCounts();
    let subjects, perSubject = {}, title, feedback = false, topic = null;
    if (mode === 'mock') {
      if (!premium) throw E(403, 'The full JAMB mock is a Premium feature. Free students can use Practice with any timing they like.', 'PREMIUM_ONLY');
      const chosen = Array.from(new Set((Array.isArray(b.subjects) ? b.subjects : []).map((x) => clean(x, 40)).filter((x) => x !== 'English' && available[x])));
      if (chosen.length !== 3) throw E(400, 'Choose exactly 3 subjects besides English.');
      subjects = ['English'].concat(chosen); perSubject = { English: 60, default: 40 }; title = 'Full JAMB Mock: ' + subjects.join(', ');
    } else {
      const subj = clean(b.subject, 40);
      if (!available[subj]) throw E(400, 'Choose a valid subject.');
      subjects = [subj]; topic = b.topic ? clean(b.topic, 60) : null;
      let n = parseInt(b.count, 10);
      n = premium ? ([10, 20, 40, 60].includes(n) ? n : 20) : Math.min(Math.max(n || 20, 5), 60);
      perSubject = { default: n };
      feedback = !premium && b.feedback !== false;
      title = (premium ? 'Subject Test: ' : 'Practice: ') + subj;
    }
    let items = buildItems(u, subjects, perSubject, topic);
    if (!items.length) throw E(400, 'No questions available for that choice yet.');
    if (!premium && items.length > remaining) items = items.slice(0, remaining);
    // Time: Premium is locked to the JAMB pace. Free students choose any time (or none).
    let ms, untimed = false, paced = false;
    if (premium) {
      paced = true; ms = items.length * CFG.secondsPerQuestion * 1000;
      if (mode === 'mock') ms = Math.min(ms, CFG.mockMaxMinutes * 60000);
    } else {
      const mins = b.minutes === 0 || b.minutes === '0' || b.minutes === null || b.minutes === 'none' ? 0 : parseInt(b.minutes, 10);
      if (!mins) { untimed = true; ms = 12 * 3600000; }
      else ms = Math.min(Math.max(mins, 1), 240) * 60000;
    }
    const a = { id: nextId('a'), userId: u.id, mode, title, subjects, feedback, untimed, paced, items, answers: {}, counted: [], startedAt: now(), endsAt: now() + ms, status: 'in_progress' };
    if (paced) { a.begun = false; a.dur = ms; a.endsAt = now() + ms + 30 * 60000; } // clock starts when the candidate presses Begin
    db.attempts.push(a); save();
    return { attempt: attemptView(a), user: publicUser(u) };
  });

  R('GET', '/exams/current', ({ user: u }) => {
    const a = db.attempts.find((x) => x.userId === u.id && x.status === 'in_progress');
    if (!a) return { attempt: null };
    if (a.endsAt <= now()) { finish(a, u, true); return { attempt: null, finishedId: a.id }; }
    return { attempt: attemptView(a) };
  });

  R('GET', '/exams/:id', ({ user: u, params }) => {
    const a = own(u, params[0]);
    if (a.status === 'in_progress' && a.endsAt <= now()) finish(a, u, true);
    if (a.status === 'in_progress') return { attempt: attemptView(a) };
    return { attempt: { id: a.id, title: a.title, mode: a.mode, status: a.status, startedAt: a.startedAt, submittedAt: a.submittedAt, auto: a.auto }, result: a.result };
  });

  R('POST', '/exams/:id/begin', ({ user: u, params }) => {
    const a = own(u, params[0]);
    if (a.status === 'in_progress' && a.begun === false) { a.begun = true; a.startedAt = now(); a.endsAt = now() + a.dur; save(); }
    return { attempt: attemptView(a) };
  });

  R('PUT', '/exams/:id/answer', ({ user: u, params, body }) => {
    const a = own(u, params[0]);
    if (a.status !== 'in_progress') throw E(400, 'This exam is already submitted.');
    if (a.endsAt <= now()) { finish(a, u, true); throw E(400, 'Time is up. Your exam was submitted.', 'TIME_UP'); }
    const qid = Number(body.questionId), item = a.items.find((i) => i.id === qid);
    if (!item) throw E(400, 'Question not in this exam.');
    if (body.choice === null) { delete a.answers[qid]; save(); return { ok: true, user: publicUser(u) }; }
    const c = Number(body.choice);
    if (!Number.isInteger(c) || c < 0 || c >= item.perm.length) throw E(400, 'Invalid option.');
    if (a.feedback && a.answers[qid] !== undefined) throw E(409, 'You have already answered this question.', 'LOCKED');
    if (!a.counted.includes(qid)) {
      const us = usageToday(u);
      if (!isPremium(u) && us.count >= CFG.dailyLimit) throw E(403, 'Daily limit reached. Upgrade to Premium to keep practising.', 'LIMIT_REACHED', { user: publicUser(u) });
      us.count++; a.counted.push(qid);
    }
    a.answers[qid] = c; save();
    const out = { ok: true, user: publicUser(u) };
    if (a.feedback) { const q = qById(qid); out.correct = item.perm.indexOf(q.answer); out.explanation = q.explanation || ''; }
    return out;
  });

  R('POST', '/exams/:id/submit', ({ user: u, params }) => { const a = own(u, params[0]); return { result: finish(a, u, false), attemptId: a.id }; });

  R('GET', '/me/history', ({ user: u }) => {
    const done = db.attempts.filter((a) => a.userId === u.id && a.status === 'submitted').sort((x, y) => y.submittedAt - x.submittedAt);
    const history = done.map((a) => ({ id: a.id, title: a.title, mode: a.mode, date: a.submittedAt, total: a.result.total, correct: a.result.correct, percentage: a.result.percentage, jambScore: a.result.jambScore || null, outOf: a.result.outOf || null }));
    const subj = {};
    for (const a of done) for (const [k, v] of Object.entries(a.result.perSubject)) { const s = (subj[k] = subj[k] || { correct: 0, total: 0 }); s.correct += v.correct; s.total += v.total; }
    const subjects = Object.entries(subj).map(([name, v]) => ({ name, correct: v.correct, total: v.total, percentage: v.total ? Math.round((v.correct / v.total) * 100) : 0 })).sort((a, b) => b.percentage - a.percentage);
    return { history: history.slice(0, 50), subjects, average: history.length ? Math.round(history.reduce((t, x) => t + x.percentage, 0) / history.length) : 0, exams: history.length };
  });

  // ---------- Premium ----------
  R('POST', '/payments', ({ body }) => {
    const plan = CFG.plans.find((p) => p.id === body.planId);
    if (!plan) throw E(400, 'Choose a valid plan.');
    return { payment: { planId: plan.id, planName: plan.name, amount: plan.price, reference: 'SA-' + C.randomHex(3).toUpperCase() }, payTo: CFG.payment };
  });

  // Activation links are signed by the owner (see owner.html). The site only holds the public key, so it can
  // check that a link is genuine but cannot make one. Each link is tied to one phone number and works once.
  // Pre-made activation codes (js/codes.js). The site stores only a scrambled fingerprint of each code.
  // A code works once on a device and stops working after its due date. (A site with no server cannot see other devices,
  // so the owner hands each code to one student only and can cancel a code from owner.html.)
  function redeemCode(u, raw) {
    db.tries = (db.tries || []).filter((t) => now() - t < 15 * 60000);
    if (db.tries.length >= 8) throw E(429, 'Too many wrong attempts. Please wait 15 minutes and try again.', 'TOO_MANY');
    const n = C.normalizeCode(raw), bad = () => { db.tries.push(now()); save(); return E(400, 'That code is not valid. Check it carefully (no spaces or letter O / zero mix-ups) or message us on WhatsApp.', 'BAD_CODE'); };
    if (n.length !== 14 || !n.startsWith('SA')) throw bad();
    const h = C.codeHash(n), entry = CODES.find((c) => c.h === h);
    if (!entry) throw bad();
    if (entry.e && now() > entry.e) throw E(400, 'This code expired on ' + new Date(entry.e).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) + ' and can no longer be used. Message us for a new one.', 'CODE_EXPIRED');
    if (db.redeemed.includes(h)) throw E(409, 'This code has already been used.', 'CODE_USED');
    const plan = CFG.plans.find((p) => p.id === entry.p);
    if (!plan) throw E(400, 'This code is for a plan that no longer exists. Message us.', 'BAD_CODE');
    let until, label;
    if (plan.until) {
      const end = Date.parse(CFG.jambDate + 'T23:59:59+01:00');
      if (end <= now()) throw E(400, 'The JAMB date for this plan has passed. Message us.', 'CODE_EXPIRED');
      until = Math.max(end, u.premiumUntil || 0); label = 'until your JAMB exam';
    } else { until = Math.max(u.premiumUntil || 0, now()) + plan.days * 86400000; label = 'for ' + plan.days + ' days'; }
    u.premiumUntil = until; u.premiumPlan = plan.id; db.redeemed.push(h); db.tries = []; save();
    return { user: publicUser(u), label };
  }

  R('POST', '/premium/redeem', async ({ user: u, body }) => {
    if (cloud()) {
      if (!getCS()) throw E(401, 'Please sign in again.', 'UNAUTH');
      let r; r = await cpost('/redeem', { code: body.code }, getCS());
      u.premiumUntil = r.premiumUntil; u.premiumPlan = r.premiumPlan; save();
      return { user: publicUser(u), label: r.label };
    }
    if (!/SA1\./.test(String(body.code || ''))) return redeemCode(u, body.code);
    const pub = CFG.ownerPublicKey;
    if (!pub) throw E(400, 'Premium activation is not switched on for this site yet. Please message us on WhatsApp.', 'NO_KEY');
    const token = C.tokenFromInput(body.code);
    if (token.length < 40) throw E(400, 'Enter the activation code we sent you on WhatsApp.', 'BAD_CODE');
    let p;
    try { p = await C.verifyToken(pub, token); }
    catch (err) {
      if (err.message === 'BAD_FORMAT' || err.message === 'BAD_SIGNATURE') throw E(400, 'That activation link is not valid. Copy the whole link again, or message us on WhatsApp.', 'BAD_CODE');
      throw E(400, err.message, 'NO_CRYPTO');
    }
    if (!p || p.v !== 1 || !p.n || !p.p) throw E(400, 'That activation link is not valid.', 'BAD_CODE');
    if (p.p !== C.last10(u.phone)) throw E(400, 'This activation was made for a different phone number. Sign in with the account you registered with when you paid, or message us.', 'WRONG_PHONE');
    if (p.by && now() > p.by) throw E(400, 'This activation link has expired. Message us and we will send a new one.', 'CODE_EXPIRED');
    if (db.redeemed.includes(p.n)) throw E(409, 'This activation link has already been used.', 'CODE_USED');
    const base = Math.max(u.premiumUntil || 0, now());
    let until, label;
    if (p.u) { if (p.u <= now()) throw E(400, 'That plan has already ended. Message us.', 'CODE_EXPIRED'); until = Math.max(p.u, u.premiumUntil || 0); label = 'until your JAMB exam'; }
    else { until = base + (p.d || 30) * 86400000; label = 'for ' + (p.d || 30) + ' days'; }
    u.premiumUntil = until; u.premiumPlan = p.t || null;
    db.redeemed.push(p.n); save();
    return { user: publicUser(u), label };
  });

  R('GET', '/library', ({ user: u }) => {
    const prem = isPremium(u);
    return { premium: prem, items: LIB.map((b) => Object.assign({}, b, { file: prem ? b.file : null })) };
  });

  // ---------- entry point used by the pages ----------
  async function handle(method, url, body) {
    if (!memoryOnly) db = load();
    const path = String(url).split('?')[0];
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(path); if (!m) continue;
      let user = null;
      if (r.auth) {
        user = db.users.find((x) => x.id === db.session);
        if (!user) throw E(401, 'Please sign in.');
      }
      return clone(await r.fn({ user, params: m.slice(1), body: body || {} }));
    }
    throw E(404, 'Not found.');
  }
  window.SAStore = { handle, hasSession: () => !!db.users.find((x) => x.id === db.session) };
})();
