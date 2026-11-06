/* Small, dependency-free helpers: SHA-256, salted password hashing, random codes.
   Pure JavaScript so it works the same on every phone and when opened straight from a file. */
(function () {
  const enc = new TextEncoder();
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  // constants are derived from prime numbers, as the SHA-256 spec defines them
  const primes = [];
  for (let n = 2; primes.length < 64; n++) { if (primes.every((p) => n % p)) primes.push(n); }
  const frac = (v) => Math.floor((v - Math.floor(v)) * 4294967296) >>> 0;
  const K = primes.map((p) => frac(Math.cbrt(p)));
  const H0 = primes.slice(0, 8).map((p) => frac(Math.sqrt(p)));

  function sha256Bytes(bytes) {
    const h = H0.slice();
    const l = bytes.length;
    const total = l + 1 + ((56 - ((l + 1) % 64) + 64) % 64) + 8;
    const buf = new Uint8Array(total);
    buf.set(bytes); buf[l] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(total - 8, Math.floor((l * 8) / 4294967296));
    dv.setUint32(total - 4, (l * 8) >>> 0);
    const w = new Uint32Array(64);
    for (let i = 0; i < total; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[t] + w[t]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
    }
    return h;
  }
  const hex = (words) => words.map((x) => x.toString(16).padStart(8, '0')).join('');
  const sha256 = (str) => hex(sha256Bytes(enc.encode(str)));

  // Salted, many-round hash for passwords (slows down guessing on a stolen device).
  function hashPassword(password, salt) {
    let h = sha256(salt + ':' + password);
    for (let i = 0; i < 20000; i++) h = sha256(h + salt);
    return h;
  }
  // Fast, non-blocking password hashing: PBKDF2 in the browser's native crypto (about 50 ms), so signing in feels instant.
  // Falls back to a lighter pure-JS hash only where WebCrypto is unavailable (plain http pages).
  async function derivePassword(password, salt) {
    if (window.crypto && crypto.subtle) {
      const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('sa:' + salt), iterations: 120000 }, key, 256);
      return 'p2$' + Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = sha256(salt + ':' + password); for (let i = 0; i < 2000; i++) h = sha256(h + salt);
    return 'p1$' + h;
  }
  const randomBytes = (n) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; };
  const randomHex = (n) => Array.from(randomBytes(n), (b) => b.toString(16).padStart(2, '0')).join('');

  // Premium codes: ALR-XXXX-XXXX-XXXX using letters/digits that are hard to misread (no I, O, 0, 1)
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function makeCode() {
    const limit = 256 - (256 % ALPHABET.length);
    let s = '';
    while (s.length < 12) { for (const b of randomBytes(24)) { if (b < limit && s.length < 12) s += ALPHABET[b % ALPHABET.length]; } }
    return 'SA-' + s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12);
  }
  const normalizeCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const codeHash = (c) => sha256('scholarace-premium:' + normalizeCode(c));

  
  // ---------- signed activation links (ECDSA P-256 via WebCrypto) ----------
  // The owner signs a small payload with a PRIVATE key that never leaves the owner's browser.
  // The site only holds the PUBLIC key, so it can check a link is genuine but nobody can make one.
  const b64u = (bytes) => btoa(String.fromCharCode.apply(null, Array.from(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = (s) => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
  const subtle = () => { if (!window.crypto || !crypto.subtle) throw new Error('This browser cannot check activation links here. Open the site over https (the normal web address).'); return crypto.subtle; };
  const ALG = { name: 'ECDSA', namedCurve: 'P-256' }, SIG = { name: 'ECDSA', hash: 'SHA-256' };
  const TOKEN_PREFIX = 'SA1.';
  const last10 = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);

  async function generateKeys() {
    const kp = await subtle().generateKey(ALG, true, ['sign', 'verify']);
    return { publicJwk: await subtle().exportKey('jwk', kp.publicKey), privateJwk: await subtle().exportKey('jwk', kp.privateKey) };
  }
  async function signToken(privateJwk, payload) {
    const key = await subtle().importKey('jwk', privateJwk, ALG, false, ['sign']);
    const body = enc.encode(JSON.stringify(payload));
    const sig = new Uint8Array(await subtle().sign(SIG, key, body));
    return TOKEN_PREFIX + b64u(body) + '.' + b64u(sig);
  }
  // returns the payload if the signature is genuine, otherwise throws
  async function verifyToken(publicJwk, token) {
    const t = String(token || '').trim().replace(/^.*#\/(?:activate|verify)\//, '').replace(/\s+/g, '');
    if (!t.startsWith(TOKEN_PREFIX) || t.split('.').length !== 3) throw new Error('BAD_FORMAT');
    const [, bodyB64, sigB64] = t.split('.');
    let body, sig; try { body = unb64u(bodyB64); sig = unb64u(sigB64); } catch (_) { throw new Error('BAD_FORMAT'); }
    const key = await subtle().importKey('jwk', publicJwk, ALG, false, ['verify']);
    if (!(await subtle().verify(SIG, key, sig, body))) throw new Error('BAD_SIGNATURE');
    return JSON.parse(new TextDecoder().decode(body));
  }
  const tokenFromInput = (s) => String(s || '').trim().replace(/^.*#\/(?:activate|verify)\//, '').replace(/\s+/g, '');

  window.SACrypto = { sha256, hashPassword, derivePassword, randomHex, makeCode, normalizeCode, codeHash, generateKeys, signToken, verifyToken, tokenFromInput, last10 };
})();
