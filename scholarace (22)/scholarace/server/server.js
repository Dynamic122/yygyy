// ScholarAce optional backend: sends real verification codes by email and SMS.
// No npm packages needed (Node 18+). Run:  node server/server.js   then open http://localhost:3000
// The site still works WITHOUT this server (just open index.html); the server only adds automatic codes.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const subtle = crypto.webcrypto.subtle;
// load settings from server/.env (KEY=value per line) so you do not have to type them every time
try { for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m && !l.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch (_) {}
const ROOT = path.join(__dirname, '..');
const env = (k, d = '') => process.env[k] || d;
const PORT = Number(env('PORT', '3000'));
const KEYS_FILE = env('OWNER_KEYS_FILE', path.join(__dirname, 'owner-keys.json'));
const ALLOW = env('ALLOWED_ORIGIN', '*');           // set to your website address in production
const DEV = env('DEV_SHOW_CODES', '') === '1';      // prints codes in this window instead of sending (testing only)
const b64u = (buf) => Buffer.from(buf).toString('base64url');

// ---- signing key (same format as the owner key made in owner.html) ----
let keys;
async function loadKeys() {
  if (fs.existsSync(KEYS_FILE)) { keys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')); }
  else {
    const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    keys = { publicJwk: await subtle.exportKey('jwk', kp.publicKey), privateJwk: await subtle.exportKey('jwk', kp.privateKey) };
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
    console.log('\nNew signing key saved to', KEYS_FILE);
  }
  const pub = { kty: keys.publicJwk.kty, crv: keys.publicJwk.crv, x: keys.publicJwk.x, y: keys.publicJwk.y };
  console.log('\nPut this in js/config.js as ownerPublicKey (only if it is not there already):\n' + JSON.stringify(pub) + '\n');
}
async function verifyOwn(token) {
  const t = String(token || '').trim().replace(/\s+/g, '');
  if (!t.startsWith('SA1.') || t.split('.').length !== 3) throw new Error('BAD');
  const [, bb, sb] = t.split('.');
  const key = await subtle.importKey('jwk', keys.publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const body = Buffer.from(bb, 'base64url');
  if (!(await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, Buffer.from(sb, 'base64url'), body))) throw new Error('BAD');
  return JSON.parse(body.toString());
}
const accounts = require('./accounts')((t) => verifyOwn(t));
async function sign(payload) {
  const key = await subtle.importKey('jwk', keys.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const body = Buffer.from(JSON.stringify(payload));
  const sig = Buffer.from(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, body));
  return 'SA1.' + b64u(body) + '.' + b64u(sig);
}

// ---- sending ----
async function sendEmail(to, code, purpose) {
  const text = `Your ScholarAce ${purpose} code is ${code}. It expires in 10 minutes. If you did not ask for it, ignore this email.`;
  if (DEV) return console.log(`[DEV] email to ${to}: ${code}`);
  if (!env('RESEND_API_KEY')) throw new Error('Email is not set up on the server (RESEND_API_KEY).');
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env('RESEND_API_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env('EMAIL_FROM', 'ScholarAce <onboarding@resend.dev>'), to: [to], subject: 'Your ScholarAce code: ' + code, text }) });
  if (!r.ok) throw new Error('Email provider refused the message.');
}
async function sendSms(phone10, code, purpose) {
  const msg = `Your ScholarAce ${purpose} code is ${code}. It expires in 10 minutes.`;
  if (DEV) return console.log(`[DEV] sms to 0${phone10}: ${code}`);
  if (!env('TERMII_API_KEY')) throw new Error('SMS is not set up on the server (TERMII_API_KEY).');
  const r = await fetch('https://api.ng.termii.com/api/sms/send', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: '234' + phone10, from: env('TERMII_SENDER', 'ScholarAce'), sms: msg, type: 'plain', channel: env('TERMII_CHANNEL', 'generic'), api_key: env('TERMII_API_KEY') }) });
  if (!r.ok) throw new Error('SMS provider refused the message.');
}

// ---- code store (memory) ----
const pending = new Map(); // id -> { emailHash, smsHash, phone, email, purpose, exp, tries }
const sends = new Map();   // rate limit key -> [timestamps]
const used = new Set();
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const six = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const phoneOk = (p) => /^[789][01]\d{8}$/.test(last10(p)) && last10(p).length === 10;
function limited(key, max, windowMs) {
  const now = Date.now(), a = (sends.get(key) || []).filter((t) => now - t < windowMs);
  if (a.length >= max) return true; a.push(now); sends.set(key, a); return false;
}
setInterval(() => { const n = Date.now(); for (const [k, v] of pending) if (v.exp < n) pending.delete(k); }, 60000).unref();

async function start(body, purpose, ip) {
  const email = String(body.email || '').trim().toLowerCase(), phone = last10(body.phone);
  if (!emailOk(email)) throw [400, 'Enter a valid email address.'];
  if (!phoneOk(phone)) throw [400, 'Enter a valid Nigerian phone number.'];
  if (limited('ip:' + ip, 20, 3600e3) || limited('p:' + phone, 5, 3600e3) || limited('e:' + email, 5, 3600e3)) throw [429, 'Too many code requests. Please wait an hour and try again.'];
  const ec = six(), sc = six(), id = crypto.randomBytes(12).toString('hex');
  await Promise.all([sendEmail(email, ec, purpose), sendSms(phone, sc, purpose)]).catch((e) => { throw [502, e.message]; });
  pending.set(id, { eh: sha(id + ec), sh: sha(id + sc), phone, email, purpose, exp: Date.now() + 10 * 60e3, tries: 0 });
  return { id, expiresIn: 600, sentTo: { email: email.replace(/^(.).*(@.*)$/, '$1***$2'), phone: '0' + phone.slice(0, 2) + '*****' + phone.slice(-3) } };
}
async function verify(body, purpose) {
  const p = pending.get(String(body.id || ''));
  if (!p || p.purpose !== purpose || p.exp < Date.now()) throw [400, 'This code has expired. Request a new one.'];
  if (++p.tries > 5) { pending.delete(String(body.id)); throw [429, 'Too many wrong attempts. Request a new code.']; }
  const ok = sha(body.id + String(body.emailCode || '').trim()) === p.eh && sha(body.id + String(body.smsCode || '').trim()) === p.sh;
  if (!ok) throw [400, 'One or both codes are wrong. Check the email and the text message.'];
  pending.delete(String(body.id));
  const n = crypto.randomBytes(8).toString('hex');
  const by = Date.now() + (purpose === 'registration' ? 3 * 86400e3 : 10 * 60e3);
  const kind = { 'sign-in': 'login', registration: 'reg', reset: 'reset' }[purpose];
  const token = await sign({ v: 1, k: kind, n, p: p.phone, m: p.email, by });
  return { token };
}

// ---- http ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  const cors = { 'Access-Control-Allow-Origin': ALLOW, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
  const json = (code, obj) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, cors)); res.end(JSON.stringify(obj)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    try {
      if (req.method === 'GET' && url.pathname === '/api/health') return json(200, { ok: true, dev: DEV });
      if (req.method !== 'POST') return json(405, { message: 'Use POST.' });
      let raw = ''; for await (const c of req) { raw += c; if (raw.length > (url.pathname === '/api/account/data' ? 4e6 : 5000)) return json(413, { message: 'Too large.' }); }
      const body = JSON.parse(raw || '{}'), ip = req.socket.remoteAddress || '';
      const routes = { '/api/register/start': () => start(body, 'registration', ip), '/api/register/verify': () => verify(body, 'registration'),
        '/api/login/start': () => start(body, 'sign-in', ip), '/api/login/verify': () => verify(body, 'sign-in'),
        '/api/reset/start': () => start(body, 'reset', ip), '/api/reset/verify': () => verify(body, 'reset') };
      if (url.pathname.startsWith('/api/account/')) { const h = accounts[url.pathname.slice('/api/account'.length)]; if (!h) return json(404, { message: 'Not found.' }); return json(200, await h(body, (req.headers.authorization || '').replace(/^Bearer /, ''))); }
      if (!routes[url.pathname]) return json(404, { message: 'Not found.' });
      return json(200, await routes[url.pathname]());
    } catch (e) { if (!Array.isArray(e)) console.log(e); return Array.isArray(e) ? json(e[0], Object.assign({ message: e[1] }, e.extra || {})) : json(400, { message: 'Bad request.' }); }
  }
  // static site (so http://localhost:3000 serves the whole website)
  let f = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)));
  if (!f.startsWith(ROOT) || f.startsWith(path.join(ROOT, 'server')) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
function warnings() {
  const w = [];
  if (!DEV && !env('RESEND_API_KEY')) w.push('RESEND_API_KEY is missing: email codes cannot be sent.');
  if (!DEV && !env('TERMII_API_KEY')) w.push('TERMII_API_KEY is missing: SMS codes cannot be sent.');
  if (ALLOW === '*') w.push('ALLOWED_ORIGIN is * (any website may call this server). Set it to your site address when you go live.');
  w.forEach((x) => console.log('WARNING: ' + x));
}
loadKeys().then(() => { warnings(); return server.listen(PORT, () => console.log(`ScholarAce server on http://localhost:${PORT}  ${DEV ? '(DEV: codes print here)' : ''}`)); });
