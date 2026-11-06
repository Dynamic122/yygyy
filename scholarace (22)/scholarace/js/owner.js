/* ScholarAce owner tools: activate students (signed links only you can make), library, questions. Runs in the browser. */
(function () {
  const CFG = window.SA_CONFIG, C = window.SACrypto;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} }
  };
  const toast = (msg, type) => { const el = document.createElement('div'); el.className = 'toast ' + (type || ''); el.textContent = msg; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 4200); };
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); toast('Copied', 'ok'); } catch (_) { toast('Copy failed. Select the text and copy it by hand.', 'error'); } };
  const download = (name, text) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const naira = (n) => '₦' + Number(n).toLocaleString('en-NG');
  const json = (k, d) => { try { const v = JSON.parse(store.get(k) || 'null'); return v == null ? d : v; } catch (_) { return d; } };

  // ================= keys =================
  const keys = () => json('sa_owner_keys', null); // { publicJwk, privateJwk }
  const liveKey = () => CFG.ownerPublicKey;
  const sameKey = (a, b) => a && b && a.x === b.x && a.y === b.y;

  // ================= Activate a student =================
  const log = () => json('sa_owner_log', []);
  const saveLog = (l) => store.set('sa_owner_log', JSON.stringify(l));
  const siteBase = () => store.get('sa_owner_base') || (location.protocol.startsWith('http') ? new URL('index.html', location.href).href : '');

  function activatePane(pane) {
    const k = keys();
    if (!k) { pane.innerHTML = `<div class="panel"><h2>First, create your owner key</h2><p>Premium links are signed with a private key that stays in this browser. You only do this once.</p><button class="btn grad" id="goSetup">Set up my key</button></div>`; $('#goSetup').onclick = () => show('setup'); return; }
    const live = sameKey(k.publicJwk, liveKey());
    const entries = log();
    const total = entries.reduce((n, e) => n + (e.amount || 0), 0);
    pane.innerHTML = `
      ${live ? '' : `<div class="err">Your site does not know your key yet, so links will be rejected. Go to <b>Setup and key</b>, copy the public key into <code>js/config.js</code> and upload the site once.</div>`}
      <div class="panel"><h2>Activate a student after they pay</h2>
        <p class="muted">1. Check the Opay credit. 2. Enter the phone number they registered with (it is in their WhatsApp message). 3. Send them the link. The link only works for that phone number, only once.</p>
        <div id="am"></div>
        <form id="af" novalidate>
          <div class="grid2">
            <div class="field"><label for="sn">Student name <span class="opt">(for your record)</span></label><input id="sn" placeholder="e.g. Ada Okafor"></div>
            <div class="field"><label for="sp">Student phone number</label><input id="sp" type="tel" inputmode="numeric" placeholder="08012345678"></div>
            <div class="field"><label for="pl">Plan paid for</label><select id="pl">${CFG.plans.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} (${naira(p.price)})</option>`).join('')}</select></div>
            <div class="field"><label for="by">Link works for</label><select id="by"><option value="3">3 days</option><option value="14" selected>14 days</option><option value="60">60 days</option></select><span class="hint">How long they have to open it. Premium time starts when they open it.</span></div>
          </div>
          <div class="field"><label for="base">Your website address</label><input id="base" value="${esc(siteBase())}" placeholder="https://your-site.netlify.app/index.html"><span class="hint">The link is built from this. Use the real address students visit.</span></div>
          <button class="btn grad" type="submit">Create activation link</button>
        </form>
        <div id="out" style="margin-top:18px"></div>
      </div>
      <div class="panel" style="margin-top:18px"><div class="row between"><h2 style="margin:0">Activations you have made</h2><span class="muted small">${entries.length} total · ${naira(total)}</span></div>
        <p class="small muted">Saved in this browser only. ${entries.length ? '' : 'Nothing yet.'}</p>
        ${entries.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Student</th><th>Phone</th><th>Plan</th><th></th></tr></thead><tbody>${entries.slice().reverse().slice(0, 100).map((e) => `<tr><td>${new Date(e.at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</td><td>${esc(e.name || '')}</td><td>${esc(e.phone)}</td><td>${esc(e.plan)} ${naira(e.amount)}</td><td><button class="btn ghost small" data-again="${e.at}">Resend</button></td></tr>`).join('')}</tbody></table></div><button class="btn ghost small" id="dllog" style="margin-top:12px">Download list (CSV)</button>` : ''}
      </div>
      <div class="panel" style="margin-top:18px"><h2>Check a link</h2>
        <div class="field"><label for="ck">Paste an activation link</label><textarea id="ck" rows="2" class="mono"></textarea></div><button class="btn ghost" id="ckgo">Check</button><div id="ckres" style="margin-top:12px"></div></div>`;
    const showLink = (link, name, phone, plan) => {
      const intl = '234' + C.last10(phone);
      const msg = `Hello${name ? ' ' + name.split(' ')[0] : ''}, your ScholarAce ${plan.name} payment is confirmed. Thank you!\n\nOpen this link while signed in to switch Premium on:\n${link}\n\nIt only works for ${phone} and only once. Any problem, reply here.`;
      $('#out').innerHTML = `<div class="okmsg">Link ready for ${esc(phone)}.</div>
        <div class="field"><label>Activation link</label><textarea class="mono" rows="3" readonly id="lk">${esc(link)}</textarea></div>
        <div class="row"><a class="btn grad" target="_blank" rel="noopener" href="https://wa.me/${intl}?text=${encodeURIComponent(msg)}">Send to student on WhatsApp</a><button class="btn ghost" id="cpl">Copy link</button><button class="btn ghost" id="cpm">Copy full message</button></div>`;
      $('#cpl').onclick = () => copy(link); $('#cpm').onclick = () => copy(msg);
    };
    $('#af').addEventListener('submit', async (e) => {
      e.preventDefault();
      const phone = $('#sp').value.replace(/[\s-]/g, ''), plan = CFG.plans.find((p) => p.id === $('#pl').value), name = $('#sn').value.trim();
      if (!/^(\+?234|0)[789][01]\d{8}$/.test(phone)) { $('#am').innerHTML = '<div class="err">Enter the student\'s Nigerian phone number, for example 08012345678.</div>'; return; }
      let base = $('#base').value.trim();
      if (!/^https?:\/\//.test(base)) { $('#am').innerHTML = '<div class="err">Enter your website address starting with https:// (the address students use). It cannot be a file on your computer.</div>'; return; }
      store.set('sa_owner_base', base); base = base.split('#')[0];
      const payload = { v: 1, n: C.randomHex(8), p: C.last10(phone), t: plan.id, by: Date.now() + Number($('#by').value) * 86400000 };
      if (plan.until) payload.u = Date.parse(CFG.jambDate + 'T23:59:59+01:00'); else payload.d = plan.days;
      if (payload.u && payload.u <= Date.now()) { $('#am').innerHTML = '<div class="err">The "Until JAMB" date in config.js (' + esc(CFG.jambDate) + ') has already passed. Update jambDate first.</div>'; return; }
      try {
        const token = await C.signToken(k.privateJwk, payload);
        const link = base + '#/activate/' + token;
        const l = log(); l.push({ at: Date.now(), name, phone, plan: plan.name, amount: plan.price, link, planId: plan.id }); saveLog(l);
        $('#am').innerHTML = ''; showLink(link, name, phone, plan);
        toast('Activation link created', 'ok');
      } catch (err) { $('#am').innerHTML = `<div class="err">${esc(err.message)}</div>`; }
    });
    $$('[data-again]').forEach((b) => (b.onclick = () => { const e = log().find((x) => x.at === Number(b.dataset.again)); if (e) { showLink(e.link, e.name, e.phone, CFG.plans.find((p) => p.id === e.planId) || { name: e.plan }); $('#out').scrollIntoView({ behavior: 'smooth' }); } }));
    const dl = $('#dllog'); if (dl) dl.onclick = () => download('scholarace-activations.csv', 'date,name,phone,plan,amount\n' + entries.map((e) => [new Date(e.at).toISOString().slice(0, 10), '"' + (e.name || '').replace(/"/g, '""') + '"', e.phone, e.plan, e.amount].join(',')).join('\n'));
    $('#ckgo').onclick = async () => {
      const out = $('#ckres');
      try {
        const p = await C.verifyToken(k.publicJwk, $('#ck').value);
        out.innerHTML = `<div class="okmsg">Genuine link. Phone ending <b>${esc(String(p.p).slice(-4))}</b>, plan <b>${esc(p.t)}</b>, ${p.u ? 'until ' + new Date(p.u).toLocaleDateString('en-NG') : p.d + ' days'}, open before ${new Date(p.by).toLocaleDateString('en-NG')}.</div>`;
      } catch (_) { out.innerHTML = '<div class="err">Not a valid link made with your key.</div>'; }
    };
  }

  // ================= Setup and key =================
  function setupPane(pane) {
    const k = keys(), live = k && sameKey(k.publicJwk, liveKey());
    pane.innerHTML = `
      <div class="panel"><h2>Your owner key</h2>
        <p class="muted">The <b>private key</b> never leaves this browser and lets only you create activation links. The <b>public key</b> goes into your website so it can check the links are real. Nobody can make a valid link without the private key.</p>
        ${k ? `<div class="${live ? 'okmsg' : 'note'}" style="margin-bottom:14px">${live ? 'Your site is using this key. Activation works.' : 'Next step: copy the public key below into <code>js/config.js</code> (replace <code>ownerPublicKey: null</code>), then upload your site again.'}</div>
        <div class="field"><label for="pub">Public key (safe to share)</label><textarea id="pub" class="mono" rows="4" readonly>${esc(JSON.stringify({ kty: k.publicJwk.kty, crv: k.publicJwk.crv, x: k.publicJwk.x, y: k.publicJwk.y }))}</textarea></div>
        <div class="row"><button class="btn ghost" id="cpub">Copy public key</button><button class="btn ghost" id="cline">Copy the whole config line</button></div>`
        : `<button class="btn grad" id="gen">Create my owner key</button>`}
      </div>
      <div class="panel" style="margin-top:18px"><h2>Back up your key</h2>
        <p class="muted">If you clear this browser or lose this phone, you can no longer make links, and you would have to make a new key and upload the site again. Keep a backup file somewhere safe (never share it).</p>
        <div class="row"><button class="btn" id="bk" ${k ? '' : 'disabled'}>Download key backup</button></div>
        <div class="field" style="margin-top:16px"><label for="imp">Restore from a backup file</label><input type="file" id="imp" accept=".json,application/json"></div>
      </div>
      ${k ? `<div class="panel" style="margin-top:18px"><h2>Make a new key</h2><p class="muted">Only if your private key was leaked. Every link made with the old key stops working, and you must put the new public key in config.js.</p><button class="btn danger" id="regen">Replace my key</button></div>` : ''}`;
    const make = async () => { const g = await C.generateKeys(); store.set('sa_owner_keys', JSON.stringify(g)); toast('Key created. Now back it up.', 'ok'); setupPane(pane); };
    if ($('#gen')) $('#gen').onclick = () => make().catch((e) => toast(e.message, 'error'));
    if ($('#regen')) $('#regen').onclick = () => { if (confirm('Replace your key? Old activation links will stop working.')) make().catch((e) => toast(e.message, 'error')); };
    if (k) {
      const pubJson = JSON.stringify({ kty: k.publicJwk.kty, crv: k.publicJwk.crv, x: k.publicJwk.x, y: k.publicJwk.y });
      $('#cpub').onclick = () => copy(pubJson); $('#cline').onclick = () => copy('ownerPublicKey: ' + pubJson);
    }
    $('#bk').onclick = () => download('scholarace-owner-key-BACKUP.json', JSON.stringify(keys(), null, 2));
    $('#imp').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { const d = JSON.parse(await f.text()); if (!d.privateJwk || !d.publicJwk) throw 0; store.set('sa_owner_keys', JSON.stringify(d)); toast('Key restored', 'ok'); setupPane(pane); }
      catch (_) { toast('That is not a ScholarAce key backup.', 'error'); }
    };
  }


  // ================= Activation codes =================
  let codeList = json('sa_owner_codes', null);
  if (!Array.isArray(codeList)) codeList = (window.SA_CODES || []).map((c) => Object.assign({}, c));
  const saveCodes = () => store.set('sa_owner_codes', JSON.stringify(codeList));
  const codesFile = () => `// ScholarAce activation codes. Only scrambled fingerprints are kept here, never the codes themselves.\n// p = plan, e = last moment the code can be used. Manage them from owner.html (Activation codes tab).\nwindow.SA_CODES = [\n${codeList.map((c) => '  ' + JSON.stringify(c)).join(',\n')}\n];\n`;
  const planName = (id) => (CFG.plans.find((p) => p.id === id) || { name: id }).name;
  function codesPane(pane) {
    const by = {}; codeList.forEach((c) => (by[c.p] = (by[c.p] || 0) + 1));
    const live = new Set((window.SA_CODES || []).map((c) => c.h));
    const unsaved = codeList.length !== (window.SA_CODES || []).length || codeList.some((c) => !live.has(c.h));
    pane.innerHTML = `
      <div class="panel"><h2>Your activation codes</h2>
        <p class="muted">${codeList.length} codes are on your site (${Object.keys(by).map((k) => by[k] + ' × ' + esc(planName(k))).join(', ')}). The full list of codes is in the private CSV file you were given. The site holds only scrambled fingerprints, so nobody can read the codes from it.</p>
        <ul class="small"><li>Each code works for <b>one student only</b>, once. Give each code to one student only after they pay.</li><li>A code stops working after its due date. Premium itself ends when the plan ends (30 days, 90 days, or JAMB day).</li><li>If a code leaks or is shared, cancel it below.</li></ul>
        ${unsaved ? `<div class="note" style="margin-top:12px">You have changes that are not on your site yet. Download <b>codes.js</b>, replace <code>js/codes.js</code> and upload the site again.</div>` : ''}
        <div class="row" style="margin-top:12px"><button class="btn small" id="dlc" ${unsaved ? '' : 'disabled'}>Download codes.js</button></div>
      </div>
      <div class="panel" style="margin-top:18px"><h2>Check or cancel a code</h2>
        <div class="field"><label for="cc">Code</label><input id="cc" placeholder="SA-XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off"></div>
        <div class="row"><button class="btn ghost" id="cchk">Check</button><button class="btn danger" id="ccan">Cancel this code</button></div><div id="ccres" style="margin-top:12px"></div></div>
      <div class="panel" style="margin-top:18px"><h2>Make more codes</h2><div id="mm"></div>
        <form id="mf" class="grid2" novalidate>
          <div class="field"><label for="mp">Plan</label><select id="mp">${CFG.plans.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} (${naira(p.price)})</option>`).join('')}</select></div>
          <div class="field"><label for="mq">How many</label><input id="mq" type="number" min="1" max="500" value="50"></div>
          <div class="field"><label for="md">Use by (due date)</label><input id="md" type="date" value="${esc(CFG.codeDeadline || CFG.jambDate)}"></div>
          <div class="field" style="align-self:end"><button class="btn grad" type="submit">Make codes</button></div>
        </form><div id="mout"></div></div>`;
    $('#dlc').onclick = () => download('codes.js', codesFile());
    const find = () => { const n = C.normalizeCode($('#cc').value); if (n.length !== 14) return null; const h = C.codeHash(n); return { h, e: codeList.find((c) => c.h === h) }; };
    $('#cchk').onclick = () => {
      const f = find(), out = $('#ccres');
      if (!f) { out.innerHTML = '<div class="err">Enter a full code, like SA-ABCD-EFGH-JKLM.</div>'; return; }
      if (!f.e) { out.innerHTML = '<div class="err">This code is not in your list (never made, or cancelled).</div>'; return; }
      const exp = f.e.e ? new Date(f.e.e) : null, dead = exp && exp < new Date();
      out.innerHTML = `<div class="${dead ? 'err' : 'okmsg'}">Valid code for <b>${esc(planName(f.e.p))}</b>${exp ? ', use by ' + exp.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) + (dead ? ' (expired)' : '') : ''}.</div>`;
    };
    $('#ccan').onclick = () => {
      const f = find(), out = $('#ccres');
      if (!f || !f.e) { out.innerHTML = '<div class="err">That code is not in your list.</div>'; return; }
      if (!confirm('Cancel this code? It will stop working once you upload the new codes.js.')) return;
      codeList = codeList.filter((c) => c.h !== f.h); saveCodes(); toast('Cancelled. Download codes.js and upload your site.', 'ok'); codesPane(pane);
    };
    $('#mf').addEventListener('submit', (e) => {
      e.preventDefault();
      const n = Math.min(500, Math.max(1, parseInt($('#mq').value, 10) || 0)), d = $('#md').value, plan = $('#mp').value;
      if (!d) { $('#mm').innerHTML = '<div class="err">Choose a due date.</div>'; return; }
      const expMs = Date.parse(d + 'T23:59:59+01:00'), made = [];
      for (let i = 0; i < n; i++) { const code = C.makeCode(); made.push(code); codeList.push({ h: C.codeHash(code), p: plan, e: expMs }); }
      saveCodes();
      codesPane(pane);
      $('#mout').innerHTML = `<div class="okmsg" style="margin-top:14px">${n} new ${esc(planName(plan))} codes made. Copy or download them now: they are not shown again.</div><textarea class="mono" rows="6" readonly id="newc">${esc(made.join('\n'))}</textarea><div class="row" style="margin-top:10px"><button class="btn ghost" id="cpn">Copy codes</button><button class="btn ghost" id="dln">Download list (CSV)</button></div>`;
      $('#cpn').onclick = () => copy(made.join('\n'));
      $('#dln').onclick = () => download('new-activation-codes.csv', 'Activation code,Plan,Use by\n' + made.map((c) => c + ',' + planName(plan) + ',' + d).join('\n'));
    });
  }

  // ================= Library =================
  let books = json('sa_owner_lib', null);
  if (!Array.isArray(books)) books = (window.SA_LIBRARY || []).map((b) => Object.assign({}, b));
  const saveBooks = () => store.set('sa_owner_lib', JSON.stringify(books));
  const libFile = () => `// ScholarAce study library. Premium students can download every file listed here.\n// Put each file in the "library" folder and upload your site again.\nwindow.SA_LIBRARY = [\n${books.map((b) => '  ' + JSON.stringify(b)).join(',\n')}\n];\n`;
  function libraryPane(pane) {
    const cats = ['Story books', 'Textbooks', 'Revision notes', 'Past questions'];
    pane.innerHTML = `
      <div class="panel"><div class="row between"><h2 style="margin:0">Library books</h2><button class="btn small" id="dll">Download library.js</button></div>
        <p class="muted small">${books.length} title${books.length === 1 ? '' : 's'}. Premium students download these from the Library page. Only add books you are allowed to share, such as your own notes, public-domain texts or titles you have a licence or permission to distribute. Copying commercial textbooks without permission can get you into legal trouble.</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Title</th><th>Category</th><th>File</th><th></th></tr></thead><tbody>${books.map((b, i) => `<tr><td>${esc(b.title)}<div class="small muted">${esc(b.author || '')}</div></td><td>${esc(b.category)}</td><td class="small">${esc(b.file)}</td><td><button class="btn ghost small" data-rm="${i}">Remove</button></td></tr>`).join('')}</tbody></table></div></div>
      <div class="panel" style="margin-top:18px"><h2>Add a book</h2><div id="lm"></div>
        <form id="lf" novalidate>
          <div class="grid2"><div class="field"><label for="bt">Title</label><input id="bt"></div><div class="field"><label for="ba">Author</label><input id="ba"></div>
          <div class="field"><label for="bc">Category</label><select id="bc">${cats.map((c) => `<option>${c}</option>`).join('')}</select></div><div class="field"><label for="bs">Subject</label><input id="bs" placeholder="e.g. Literature in English"></div>
          <div class="field"><label for="bf">File path</label><input id="bf" placeholder="library/my-book.pdf"><span class="hint">Copy the PDF into the library folder first, then type its name here.</span></div><div class="field"><label for="bz">File size <span class="opt">(optional)</span></label><input id="bz" placeholder="2.4 MB"></div></div>
          <div class="field"><label for="bd">Short description</label><textarea id="bd" rows="2"></textarea></div>
          <button class="btn grad" type="submit">Add to library</button></form></div>`;
    $('#dll').onclick = () => download('library.js', libFile());
    $('#lf').addEventListener('submit', (e) => {
      e.preventDefault();
      const b = { id: 'b' + Date.now().toString(36), title: $('#bt').value.trim(), author: $('#ba').value.trim(), subject: $('#bs').value.trim(), category: $('#bc').value, description: $('#bd').value.trim(), file: $('#bf').value.trim().replace(/^\/+/, ''), format: ($('#bf').value.split('.').pop() || 'pdf').toLowerCase(), size: $('#bz').value.trim() };
      if (!b.title || !b.file) { $('#lm').innerHTML = '<div class="err">Title and file path are required.</div>'; return; }
      books.push(b); saveBooks(); toast('Added. Download library.js and upload your site.', 'ok'); libraryPane(pane);
    });
    $$('[data-rm]', pane).forEach((x) => (x.onclick = () => { if (confirm('Remove this title from the library list?')) { books.splice(Number(x.dataset.rm), 1); saveBooks(); libraryPane(pane); } }));
  }

  // ================= Questions =================
  let bank = null;
  try { bank = JSON.parse(store.get('sa_owner_bank') || 'null'); } catch (_) { bank = null; }
  if (!Array.isArray(bank)) bank = (window.SA_QUESTIONS || []).map((q) => Object.assign({}, q));
  const saveBank = () => store.set('sa_owner_bank', JSON.stringify(bank));
  const nextId = () => bank.reduce((m, q) => Math.max(m, q.id || 0), 0) + 1;
  const bankFile = () => `// ScholarAce question bank. Add or remove questions with owner.html, or edit this file by hand.
// answer is the position of the correct option: 0 = A, 1 = B, 2 = C, 3 = D.
window.SA_QUESTIONS = [
${bank.map((q) => '  ' + JSON.stringify(q)).join(',\n')}
];
`;
  function parseCsv(text) {
    const rows = []; let row = [], cur = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') inQ = false; else cur += c; }
      else if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x.trim())) rows.push(row); row = []; }
      else cur += c;
    }
    row.push(cur); if (row.some((x) => x.trim())) rows.push(row);
    return rows;
  }
  const validQ = (b) => {
    const options = b.options.map((o) => String(o).trim());
    const last = options.reduce((n, o, i) => (o ? i : n), -1);
    const opts = options.slice(0, last + 1);
    if (!String(b.subject).trim()) return { error: 'Subject is required.' };
    if (String(b.text).trim().length < 5) return { error: 'Question text is required.' };
    if (opts.length < 2 || opts.some((o) => !o)) return { error: 'Fill at least options A and B, in order with no gaps.' };
    if (!Number.isInteger(b.answer) || b.answer < 0 || b.answer >= opts.length) return { error: 'Pick the correct option.' };
    return { q: { id: nextId(), subject: String(b.subject).trim(), topic: String(b.topic || '').trim(), text: String(b.text).trim(), options: opts, answer: b.answer, explanation: String(b.explanation || '').trim(), difficulty: 'medium', year: '' } };
  };

  let filter = { search: '', subject: '' };
  function questionsPane(pane) {
    const subjects = Array.from(new Set(bank.map((q) => q.subject))).sort();
    const list = bank.filter((q) => (!filter.subject || q.subject === filter.subject) && (!filter.search || (q.text + ' ' + (q.topic || '')).toLowerCase().includes(filter.search.toLowerCase())));
    pane.innerHTML = `
      <div class="panel"><div class="row between"><h2 style="margin:0">Question bank</h2><button class="btn small" id="dlq">Download questions.js</button></div>
        <p class="muted small">${bank.length} questions across ${subjects.length} subjects. Your edits are saved as a draft in this browser. Download <b>questions.js</b>, put it in the <code>js/data</code> folder of your site, and upload again to publish them.</p>
        <div class="chips">${subjects.map((s) => `<span class="chip">${esc(s)} ${bank.filter((q) => q.subject === s).length}</span>`).join(' ')}</div>
      </div>
      <div class="panel" style="margin-top:18px"><h2>Add a question</h2><div id="qm"></div>
        <form id="qf" novalidate>
          <div class="grid2"><div class="field"><label for="qs">Subject</label><input id="qs" list="subs" required><datalist id="subs">${subjects.map((s) => `<option value="${esc(s)}">`).join('')}</datalist></div><div class="field"><label for="qt">Topic</label><input id="qt"></div></div>
          <div class="field"><label for="qx">Question</label><textarea id="qx" rows="3"></textarea></div>
          <fieldset style="border:0;padding:0;margin:0 0 14px"><legend style="font-weight:700;margin-bottom:6px">Options (tick the correct one)</legend>
          ${[0, 1, 2, 3].map((i) => `<div class="opt-edit"><label><input type="radio" name="ans" value="${i}" ${i === 0 ? 'checked' : ''} aria-label="Option ${'ABCD'[i]} is correct"> ${'ABCD'[i]}</label><input class="oi" aria-label="Option ${'ABCD'[i]} text" style="width:100%;min-height:42px;padding:8px 10px;border:1.5px solid var(--line);border-radius:8px;background:var(--card)"></div>`).join('')}</fieldset>
          <div class="field"><label for="qe">Explanation</label><textarea id="qe" rows="2"></textarea></div>
          <button class="btn" type="submit">Add question</button>
        </form></div>
      <div class="panel" style="margin-top:18px"><h2>Import from a spreadsheet (CSV)</h2>
        <p class="small muted">One question per row, columns in this order: <code>subject, topic, question, optionA, optionB, optionC, optionD, answer (A to D), explanation</code>. A header row is optional. In Excel or Google Sheets use Save as CSV.</p>
        <div id="im"></div>
        <div class="field"><label for="csvf">CSV file</label><input type="file" id="csvf" accept=".csv,text/csv"></div>
        <div class="field"><label for="csvt">Or paste CSV text</label><textarea id="csvt" rows="5"></textarea></div>
        <button class="btn ghost" id="csvgo">Import</button></div>
      <div class="panel" style="margin-top:18px"><div class="row between"><h2 style="margin:0">All questions</h2><div class="row">
          <input id="sq" placeholder="Search" value="${esc(filter.search)}" aria-label="Search questions" style="min-height:42px;padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;background:var(--card)">
          <select id="ssub" aria-label="Filter by subject" style="min-height:42px;padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;background:var(--card)"><option value="">All subjects</option>${subjects.map((s) => `<option ${filter.subject === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
          <button class="btn ghost small" id="resetq">Reset to the live bank</button></div></div>
        <p class="small muted">Showing ${Math.min(list.length, 150)} of ${list.length}.</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Question</th><th>Subject</th><th>Answer</th><th></th></tr></thead><tbody>
        ${list.slice(0, 150).map((q) => `<tr><td style="min-width:240px">${esc(q.text.slice(0, 140))}${q.text.length > 140 ? '...' : ''}<div class="small muted">${esc(q.topic || '')}</div></td><td>${esc(q.subject)}</td><td>${'ABCDE'[q.answer]}</td><td><button class="btn ghost small" data-del="${q.id}">Delete</button></td></tr>`).join('')}
        </tbody></table></div></div>`;
    $('#dlq').onclick = () => download('questions.js', bankFile());
    $('#qf').addEventListener('submit', (e) => {
      e.preventDefault();
      const r = validQ({ subject: $('#qs').value, topic: $('#qt').value, text: $('#qx').value, options: $$('.oi').map((i) => i.value), answer: Number(($('input[name=ans]:checked') || {}).value), explanation: $('#qe').value });
      if (r.error) { $('#qm').innerHTML = `<div class="err" role="alert">${esc(r.error)}</div>`; return; }
      bank.push(r.q); saveBank(); toast('Question added', 'ok'); questionsPane(pane);
    });
    $('#csvf').onchange = (e) => { const f = e.target.files[0]; if (f) f.text().then((t) => ($('#csvt').value = t)); };
    $('#csvgo').onclick = () => {
      const rows = parseCsv($('#csvt').value);
      if (rows.length && /subject/i.test(rows[0][0])) rows.shift();
      let added = 0; const errors = [];
      rows.forEach((r, i) => {
        const v = validQ({ subject: r[0] || '', topic: r[1] || '', text: r[2] || '', options: [r[3] || '', r[4] || '', r[5] || '', r[6] || ''], answer: 'ABCDE'.indexOf(String(r[7] || '').trim().toUpperCase()), explanation: r[8] || '' });
        if (v.error) errors.push(`Row ${i + 1}: ${v.error}`); else { bank.push(v.q); added++; }
      });
      saveBank();
      if (added) { toast(added + ' question' + (added > 1 ? 's' : '') + ' added', 'ok'); questionsPane(pane); }
      $('#im').innerHTML = `<div class="${added ? 'okmsg' : 'err'}">${added} added.${errors.length ? '<br>' + errors.slice(0, 15).map(esc).join('<br>') : ''}</div>`;
    };
    let t; $('#sq').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { filter.search = e.target.value; questionsPane(pane); const i = $('#sq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); };
    $('#ssub').onchange = (e) => { filter.subject = e.target.value; questionsPane(pane); };
    $$('[data-del]', pane).forEach((b) => (b.onclick = () => { if (confirm('Delete this question from your draft?')) { bank = bank.filter((q) => q.id !== Number(b.dataset.del)); saveBank(); questionsPane(pane); } }));
    $('#resetq').onclick = () => { if (confirm('Throw away your draft and go back to the question bank that is live on your site?')) { bank = (window.SA_QUESTIONS || []).map((q) => Object.assign({}, q)); saveBank(); questionsPane(pane); } };
  }

  // ================= Publish help =================
  function publishPane(pane) {
    pane.innerHTML = `<div class="panel"><h2>Putting changes on your site</h2>
      <ol>
        <li>Make changes on the other tabs (codes, library, questions).</li>
        <li>Download the files they give you: <b>codes.js</b> goes in <code>js/</code>, <b>library.js</b> goes in <code>js/</code>, <b>questions.js</b> goes in <code>js/data/</code>. Put book PDFs in <code>library/</code>.</li>
        <li>Upload the whole folder again to your host (Netlify, GitHub Pages, Cloudflare Pages or any web host).</li>
        <li>Students may need to refresh once to get the new files.</li>
      </ol>
      <h3>How Premium stays yours</h3>
      <ul>
        <li>Premium can only be switched on by a link signed with your private key, which stays in this browser. Nobody else can make one, and you do not need to re-upload the site for each sale.</li>
        <li>Each link is tied to the student's phone number and works once.</li>
        <li>Keep <b>owner.html</b> private (do not link to it). It is useless without your key, but there is no reason to advertise it.</li>
      </ul>
      <h3>Honest limits of having no server</h3>
      <ul>
        <li>Students' accounts, daily limits and Premium are stored in their own browser. A technical student can edit their own browser data to skip the daily limit or fake Premium on their own device. Signed links stop casual sharing and forging, not a determined hacker.</li>
        <li>Library file addresses are public on a static host. Anyone who learns a file's exact address can download it. Do not treat library files as secret. Use only books you are allowed to share.</li>
        <li>You cannot see students or their results. Only the activation list on the first tab is kept (in this browser).</li>
        <li>For full protection (private downloads, one account on any device, you seeing every student) the site needs a real server later. The screens can stay the same.</li>
      </ul></div>`;
  }

  // ================= Verify a new student =================
  function verifyPane(pane) {
    const k = keys(), live = k && sameKey(k.publicJwk, liveKey());
    pane.innerHTML = `${live ? '' : '<div class="err">Your site does not know your key yet. Finish <b>Setup and key</b> first, then phone verification switches on.</div>'}
      <div class="panel"><h2>Verify a new student's phone number</h2>
        <p class="muted">A student asks for a code on WhatsApp. You send it back to <b>that same number</b>. Only the person holding that phone can read it, so only they can register. The code works for that exact phone number and email only, once, and for 3 days. Nobody you have not approved can register.</p>
        <div id="vm"></div>
        <form id="vf" novalidate><div class="grid2"><div class="field"><label for="vp">Student phone number</label><input id="vp" type="tel" inputmode="numeric" placeholder="08012345678"></div><div class="field"><label for="ve">Student email address</label><input id="ve" type="email" placeholder="name@example.com"></div></div>
        <button class="btn grad" type="submit">Create verification code</button></form><div id="vo" style="margin-top:14px"></div></div>`;
    $('#vf').addEventListener('submit', async (e) => {
      e.preventDefault();
      const phone = $('#vp').value.replace(/[\s-]/g, '');
      if (!/^(\+?234|0)[789][01]\d{8}$/.test(phone)) { $('#vm').innerHTML = '<div class="err">Enter a valid Nigerian phone number, for example 08012345678.</div>'; return; }
      const em = $('#ve').value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { $('#vm').innerHTML = '<div class="err">Enter the student\'s email address exactly as they gave it.</div>'; return; }
      if (!k) { $('#vm').innerHTML = '<div class="err">Create your key first in Setup and key.</div>'; return; }
      try {
        const token = await C.signToken(k.privateJwk, { v: 1, k: 'reg', n: C.randomHex(8), p: C.last10(phone), m: em, by: Date.now() + 3 * 86400000 });
        const base = (store.get('sa_owner_base') || '').split('#')[0];
        const link = base ? base + '#/verify/' + token : '';
        const msg = `Your ScholarAce verification code:\n\n${token}\n\n` + (link ? `Or tap this link to register:\n${link}\n\n` : '') + 'Paste it in the "Phone verification code" box when you create your account. It works for this number only.';
        $('#vm').innerHTML = '';
        $('#vo').innerHTML = `<div class="okmsg">Code ready for ${esc(phone)}.</div><div class="field"><label>Message to send</label><textarea class="mono" rows="6" readonly id="vt">${esc(msg)}</textarea></div>
          <div class="row"><a class="btn grad" target="_blank" rel="noopener" href="https://wa.me/234${C.last10(phone)}?text=${encodeURIComponent(msg)}">Send to student on WhatsApp</a><button class="btn ghost" id="vc">Copy message</button></div>`;
        $('#vc').onclick = () => copy(msg);
      } catch (err) { $('#vm').innerHTML = `<div class="err">${esc(err.message)}</div>`; }
    });
  }

  // ================= tabs =================
  const panes = { activate: activatePane, verify: verifyPane, setup: setupPane, codes: codesPane, library: libraryPane, questions: questionsPane, publish: publishPane };
  function show(tab) {
    $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    panes[tab]($('#pane'));
  }
  $$('[data-tab]').forEach((b) => (b.onclick = () => show(b.dataset.tab)));
  show(keys() ? 'activate' : 'setup');
})();
