// ScholarAce accounts on the server: one account per phone and email for everyone, passwords kept safely,
// Premium and activation codes that work once on ALL devices, and results that follow the student to any phone.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'db.json');
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
let db = { nextId: 1, users: {}, used: {}, sessions: {} };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (_) {}
let dirty = false;
const flush = () => { if (!dirty) return; dirty = false; const t = DB_FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify(db)); fs.renameSync(t, DB_FILE); };
setInterval(flush, 1500).unref(); process.on('exit', flush);
const touch = () => { dirty = true; };

// read the site's own settings and code fingerprints so there is a single source of truth
function loadWindowFile(rel) { const w = {}; try { vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), { window: w }); } catch (_) {} return w; }
const CFG = loadWindowFile('js/config.js').SA_CONFIG || {};
const CODES = loadWindowFile('js/codes.js').SA_CODES || [];
const sha256hex = (s) => crypto.createHash('sha256').update(s).digest('hex');
const normalize = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const emailOk = (e) => /^[^\s@]+@[^\s@]{1,}\.[^\s@]{2,}$/.test(e);
const now = () => Date.now();
const clean = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n || 200);
const fail = (code, msg, extra) => { throw Object.assign([code, msg], { extra }); };

function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex'); }
const checkPw = (u, pw) => { const a = Buffer.from(hashPw(pw, u.salt), 'hex'), b = Buffer.from(u.hash, 'hex'); return a.length === b.length && crypto.timingSafeEqual(a, b); };

const tries = new Map();
function tooMany(key, max, ms) { const t = (tries.get(key) || []).filter((x) => now() - x < ms); tries.set(key, t); if (t.length >= max) return true; t.push(now()); return false; }

const findByIdentifier = (id) => { id = String(id || '').trim().toLowerCase().replace(/\s/g, ''); return Object.values(db.users).find((u) => u.email === id || last10(u.phone) === last10(id)); };
const publicAccount = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, state: u.state, course: u.course, combo: u.combo, targetScore: u.targetScore, premiumUntil: u.premiumUntil || 0, premiumPlan: u.premiumPlan || null, usage: u.data.usage || null, attempts: u.data.attempts || [], counters: u.data.counters || {} });
function newSession(u) { const t = crypto.randomBytes(32).toString('hex'); db.sessions[t] = { uid: u.id, exp: now() + 90 * 86400000 }; touch(); return t; }
function auth(token) { const s = db.sessions[token]; if (!s || s.exp < now()) fail(401, 'Please sign in again.'); const u = db.users[s.uid]; if (!u) fail(401, 'Please sign in again.'); return u; }

module.exports = function (verifyToken) {
  // verifyToken(token) -> payload or throws; made by server.js with the server's own key
  const needToken = async (token, kind, phone, email) => {
    let p; try { p = await verifyToken(token); } catch (_) { fail(400, 'Enter the codes we sent to your email and phone.'); }
    if (p.k !== kind || p.p !== last10(phone) || String(p.m || '').toLowerCase() !== email || p.by < now()) fail(400, 'That verification is not valid or has expired. Request new codes.');
    if (db.used['n:' + p.n]) fail(400, 'That verification was already used. Request new codes.');
    db.used['n:' + p.n] = 1; touch();
  };
  const r = {};

  r['/register'] = async (b) => {
    const name = clean(b.name, 80), email = clean(b.email, 120).toLowerCase(), phone = clean(b.phone, 20).replace(/[\s-]/g, ''), password = String(b.password || '');
    if (name.split(/\s+/).filter(Boolean).length < 2) fail(400, 'Please enter your first and last name.', { code: 'name' });
    if (!emailOk(email)) fail(400, 'Enter a valid email address.', { code: 'email' });
    if (!/^(\+?234|0)[789][01]\d{8}$/.test(phone)) fail(400, 'Enter a valid Nigerian phone number, for example 08012345678.', { code: 'phone' });
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) fail(400, 'Use a password of at least 8 characters with a letter and a number.', { code: 'password' });
    if (Object.values(db.users).some((u) => u.email === email)) fail(409, 'An account with this email already exists. Sign in instead.', { code: 'email' });
    if (Object.values(db.users).some((u) => last10(u.phone) === last10(phone))) fail(409, 'An account with this phone number already exists. Sign in instead.', { code: 'phone' });
    await needToken(b.verify, 'reg', phone, email);
    const salt = crypto.randomBytes(16).toString('hex'), id = db.nextId++;
    const target = parseInt(b.targetScore, 10);
    const u = db.users[id] = { id, name, email, phone, state: clean(b.state, 40), course: clean(b.course, 80), combo: (Array.isArray(b.combo) ? b.combo : []).map((x) => clean(x, 40)).slice(0, 4), targetScore: target >= 100 && target <= 400 ? target : null, salt, hash: hashPw(password, salt), premiumUntil: 0, premiumPlan: null, data: {}, created: now() };
    touch(); return { session: newSession(u), account: publicAccount(u) };
  };

  const checkLogin = (b) => {
    const u = findByIdentifier(b.identifier);
    if (tooMany('login:' + String(b.identifier || '').toLowerCase(), 10, 15 * 60000)) fail(429, 'Too many tries. Please wait 15 minutes.');
    if (!u || !checkPw(u, String(b.password || ''))) fail(401, 'Incorrect email/phone or password.', { code: 'BAD_LOGIN' });
    return u;
  };
  r['/login-check'] = async (b) => { const u = checkLogin(b); return { phone: u.phone, email: u.email }; };
  r['/login'] = async (b) => { const u = checkLogin(b); await needToken(b.verify, 'login', u.phone, u.email); return { session: newSession(u), account: publicAccount(u) }; };

  // forgot password: needs both codes, then sets a new password
  r['/reset-lookup'] = async (b) => { const u = findByIdentifier(b.identifier); if (!u) fail(404, 'No account found with that email or phone number.'); return { phone: u.phone, email: u.email }; };
  r['/reset'] = async (b) => {
    const u = findByIdentifier(b.identifier); if (!u) fail(404, 'No account found with that email or phone number.');
    const pw = String(b.newPassword || ''); if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) fail(400, 'Use a password of at least 8 characters with a letter and a number.');
    await needToken(b.verify, 'reset', u.phone, u.email);
    u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(pw, u.salt);
    for (const [t, s] of Object.entries(db.sessions)) if (s.uid === u.id) delete db.sessions[t];
    touch(); return { ok: true };
  };

  r['/me'] = async (b, token) => publicAccount(auth(token));
  r['/data'] = async (b, token) => {
    const u = auth(token), d = b.data || {};
    u.data = { usage: d.usage || null, attempts: Array.isArray(d.attempts) ? d.attempts.slice(0, 60) : [], counters: d.counters || {} };
    // profile changes the student may make
    touch(); return { ok: true };
  };
  r['/logout'] = async (b, token) => { delete db.sessions[token]; touch(); return { ok: true }; };

  // Premium: a code or an activation link works once for everyone, on every device
  r['/redeem'] = async (b, token) => {
    const u = auth(token);
    if (tooMany('redeem:' + u.id, 8, 15 * 60000)) fail(429, 'Too many wrong attempts. Please wait 15 minutes and try again.');
    const raw = String(b.code || '');
    const days = (plan) => CFG.plans.find((p) => p.id === plan);
    let plan, key, label, until;
    if (/SA1\./.test(raw)) {
      let p; try { p = await verifyToken(raw.trim().replace(/^.*#\/activate\//, '').replace(/\s+/g, '')); } catch (_) { fail(400, 'That activation link is not valid. Copy the whole link again, or message us on WhatsApp.'); }
      if (!p || p.v !== 1 || !p.n || !p.p) fail(400, 'That activation link is not valid.');
      if (p.p !== last10(u.phone)) fail(400, 'This activation was made for a different phone number. Sign in with the account you registered with when you paid, or message us.');
      if (p.by && now() > p.by) fail(400, 'This activation link has expired. Message us and we will send a new one.');
      key = 'n:' + p.n; if (db.used[key]) fail(409, 'This activation link has already been used.');
      if (p.u) { if (p.u <= now()) fail(400, 'That plan has already ended. Message us.'); until = Math.max(p.u, u.premiumUntil || 0); label = 'until your JAMB exam'; plan = p.t || 'exam'; }
      else { until = Math.max(u.premiumUntil || 0, now()) + (p.d || 30) * 86400000; label = 'for ' + (p.d || 30) + ' days'; plan = p.t || null; }
    } else {
      const n = normalize(raw);
      if (n.length !== 14 || !n.startsWith('SA')) fail(400, 'That code is not valid. Check it carefully or message us on WhatsApp.');
      const h = sha256hex('scholarace-premium:' + n), entry = CODES.find((c) => c.h === h);
      if (!entry) fail(400, 'That code is not valid. Check it carefully (no spaces or letter O / zero mix-ups) or message us on WhatsApp.');
      if (entry.e && now() > entry.e) fail(400, 'This code has expired and can no longer be used. Message us for a new one.');
      key = 'c:' + h; if (db.used[key]) fail(409, 'This code has already been used.');
      const pl = days(entry.p); if (!pl) fail(400, 'This code is for a plan that no longer exists. Message us.');
      plan = pl.id;
      if (pl.until) { const end = Date.parse(CFG.jambDate + 'T23:59:59+01:00'); if (end <= now()) fail(400, 'The JAMB date for this plan has passed. Message us.'); until = Math.max(end, u.premiumUntil || 0); label = 'until your JAMB exam'; }
      else { until = Math.max(u.premiumUntil || 0, now()) + pl.days * 86400000; label = 'for ' + pl.days + ' days'; }
    }
    db.used[key] = u.id; u.premiumUntil = until; u.premiumPlan = plan; touch();
    return { premiumUntil: until, premiumPlan: plan, label };
  };
  return r;
};
