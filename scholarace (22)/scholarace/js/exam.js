/* The CBT exam screen */
(function () {
  const A = window.App, esc = A.esc;
  const CALC_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Economics', 'Accounting', 'Commerce', 'Geography'];

  A.pages.exam = async function (p) {
    const r = await A.api('GET', '/exams/' + p.id);
    if (r.attempt.status !== 'in_progress') return (location.hash = '#/result/' + p.id);
    const at = r.attempt;
    document.body.classList.add('in-exam');

    const qs = at.questions;
    const subjects = Array.from(new Set(qs.map((q) => q.subject)));
    const answers = Object.assign({}, at.answers); // qid -> displayed option index
    const flags = new Set();
    const fb = {}; // qid -> {correct, explanation} (instant feedback mode)
    const pending = new Map(); // qid -> choice not yet saved
    let offset = at.serverNow - Date.now();
    let endsAt = at.endsAt;
    let cur = Math.max(0, qs.findIndex((q) => answers[q.id] === undefined)); if (cur < 0) cur = 0;
    let finishing = false, calcOpen = false, awayCount = 0, saveMsg = '', saveBad = false;
    const key = (qid) => 'sa_flags_' + at.id + '_' + qid;
    qs.forEach((q) => { try { if (localStorage.getItem(key(q.id))) flags.add(q.id); } catch (_) {} });

    const subjIndexes = (s) => qs.map((q, i) => (q.subject === s ? i : -1)).filter((i) => i >= 0);

    // ---------- timer ----------
    const left = () => endsAt - (Date.now() + offset);
    const tick = () => {
      const el = A.$('#clock'); if (!el) return;
      if (at.untimed) { el.textContent = 'No time limit'; el.classList.add('free'); return; }
      const ms = left();
      el.textContent = A.clock(ms);
      el.classList.toggle('low', ms <= 5 * 60 * 1000);
      el.setAttribute('aria-label', 'Time left ' + A.clock(ms));
      if (ms <= 0 && !finishing) finish(true);
    };
    const timer = setInterval(tick, 500);

    // ---------- saving ----------
    async function save(qid, choice) {
      try {
        const res = await A.api('PUT', `/exams/${at.id}/answer`, { questionId: qid, choice });
        pending.delete(qid);
        if (res.user) A.user = res.user;
        if (res.correct !== undefined) fb[qid] = { correct: res.correct, explanation: res.explanation };
        saveMsg = 'Saved'; saveBad = false;
      } catch (e) {
        if (e.offline) { pending.set(qid, choice); saveMsg = 'No connection. Your answers are kept and will save when you are back online.'; saveBad = true; }
        else if (e.code === 'LIMIT_REACHED') {
          delete answers[qid]; pending.delete(qid); saveMsg = '';
          A.modal(`<h2>Daily limit reached</h2><p>${esc(e.message)}</p><div class="actions"><button class="btn ghost" data-close>Close</button><a class="btn gold" href="#/premium" data-close>See Premium</a></div>`);
        } else if (e.code === 'TIME_UP') { finish(true, true); return; }
        else if (e.code === 'LOCKED') { pending.delete(qid); }
        else { pending.delete(qid); saveMsg = e.message; saveBad = true; }
      }
      draw();
    }
    const retry = setInterval(() => { for (const [qid, c] of Array.from(pending)) save(qid, c); }, 5000);

    function choose(i) {
      const q = qs[cur];
      if (at.feedback && answers[q.id] !== undefined) return; // final in feedback mode
      answers[q.id] = i; saveMsg = 'Saving...'; saveBad = false;
      draw(); save(q.id, i);
    }
    function clearAnswer() {
      const q = qs[cur];
      if (at.feedback || answers[q.id] === undefined) return;
      delete answers[q.id]; draw(); save(q.id, null);
    }
    function toggleFlag() {
      const q = qs[cur];
      if (flags.has(q.id)) { flags.delete(q.id); try { localStorage.removeItem(key(q.id)); } catch (_) {} }
      else { flags.add(q.id); try { localStorage.setItem(key(q.id), '1'); } catch (_) {} }
      draw();
    }
    const go = (i) => { cur = Math.min(qs.length - 1, Math.max(0, i)); draw(); };

    // ---------- finish ----------
    async function finish(auto, alreadyDone) {
      if (finishing) return; finishing = true;
      try {
        if (!alreadyDone) {
          for (let n = 0; n < 3 && pending.size; n++) { for (const [qid, c] of Array.from(pending)) await save(qid, c); }
          if (auto) A.toast('Time is up. Submitting your exam.', 'ok');
          await A.api('POST', `/exams/${at.id}/submit`, {});
        }
        location.hash = '#/result/' + at.id;
      } catch (e) {
        finishing = false;
        A.toast(e.message + ' Your answers are safe. Try submitting again.', 'error');
      }
    }
    function confirmSubmit() {
      const answered = qs.filter((q) => answers[q.id] !== undefined).length;
      const m = A.modal(`<h2>Submit your exam?</h2>
        <p>You answered <b>${answered}</b> of <b>${qs.length}</b> questions.${qs.length - answered ? ` <b style="color:var(--rose)">${qs.length - answered} unanswered</b> will be marked wrong.` : ''}${flags.size ? ` ${flags.size} flagged for review.` : ''}</p>
        <p class="muted small">You cannot change your answers after you submit.</p>
        <div class="actions"><button class="btn ghost" data-close>Keep working</button><button class="btn" id="yes">Submit now</button></div>`);
      m.box.querySelector('#yes').onclick = () => { m.close(); finish(false); };
    }

    // ---------- calculator ----------
    const calc = { disp: '0', acc: null, op: null, fresh: true };
    function calcKey(k) {
      const num = () => parseFloat(calc.disp);
      const apply = () => {
        if (calc.op === null || calc.acc === null) return num();
        const a = calc.acc, b = num();
        return calc.op === '+' ? a + b : calc.op === '-' ? a - b : calc.op === '×' ? a * b : b === 0 ? NaN : a / b;
      };
      const fmt = (v) => (Number.isFinite(v) ? String(parseFloat(v.toPrecision(12))) : 'Error');
      if (/^\d$/.test(k)) { calc.disp = calc.fresh || calc.disp === '0' ? k : calc.disp + k; calc.fresh = false; }
      else if (k === '.') { if (calc.fresh) { calc.disp = '0.'; calc.fresh = false; } else if (!calc.disp.includes('.')) calc.disp += '.'; }
      else if (['+', '-', '×', '÷'].includes(k)) { calc.acc = apply(); calc.disp = fmt(calc.acc); calc.op = k; calc.fresh = true; }
      else if (k === '=') { const v = apply(); calc.disp = fmt(v); calc.acc = null; calc.op = null; calc.fresh = true; }
      else if (k === 'C') { calc.disp = '0'; calc.acc = null; calc.op = null; calc.fresh = true; }
      else if (k === '⌫') { calc.disp = calc.fresh || calc.disp.length <= 1 ? '0' : calc.disp.slice(0, -1); }
      else if (k === '±') { calc.disp = fmt(-num()); }
      else if (k === '√') { calc.disp = fmt(Math.sqrt(num())); calc.fresh = true; }
      else if (k === 'x²') { calc.disp = fmt(num() * num()); calc.fresh = true; }
      const s = A.$('#calc-scr'); if (s) s.textContent = calc.disp;
    }

    // ---------- render ----------
    function draw() {
      if (!A.$('#exam-root')) { A.$('#app').innerHTML = '<div id="exam-root" class="exam"></div>'; }
      const q = qs[cur], chosen = answers[q.id];
      const sIdx = subjIndexes(q.subject), posInSubj = sIdx.indexOf(cur);
      const info = fb[q.id];
      const showCalc = CALC_SUBJECTS.includes(q.subject);
      const locked = at.feedback && chosen !== undefined;
      A.$('#exam-root').innerHTML = `
        ${awayCount ? `<div class="warn-banner" role="alert">You left the exam page ${awayCount} time${awayCount > 1 ? 's' : ''}. In the real exam this can get you flagged. Stay on this page.</div>` : ''}
        <div class="exam-bar">
          <div class="who">${esc(A.user.name)}<small>Reg. No. ${regNo()} · ${esc(at.title)}</small></div>
          <div class="row"><div class="exam-clock" id="clock" role="timer">--:--</div><button class="btn gold small" data-x="submit">Submit</button></div>
        </div>
        <div class="tabs-bar" role="tablist">${subjects.map((s) => `<button role="tab" aria-selected="${s === q.subject}" data-subj="${esc(s)}">${esc(s)}</button>`).join('')}</div>
        <div class="exam-main">
          <section class="q-panel" aria-live="polite">
            <div class="q-head"><span>Question ${posInSubj + 1} of ${sIdx.length}</span><span class="muted">${esc(q.topic || '')}</span></div>
            <p class="q-text">${esc(q.text)}</p>
            <div class="opts" role="radiogroup" aria-label="Answer options">
              ${q.options.map((o, i) => {
                let cls = '', mark = '';
                if (info && chosen !== undefined) { if (i === info.correct) { cls = 'right'; mark = 'Correct'; } else if (i === chosen) { cls = 'wrong'; mark = 'Your answer'; } }
                return `<button type="button" class="opt ${cls}" role="radio" aria-checked="${chosen === i}" data-opt="${i}" ${locked ? 'disabled' : ''}><span class="bubble">${'ABCDE'[i]}</span><span>${esc(o)}</span><span class="mark">${mark}</span></button>`;
              }).join('')}
            </div>
            ${info && info.explanation && chosen !== undefined ? `<div class="explain">${esc(info.explanation)}</div>` : ''}
            ${locked && !info ? '<p class="small muted" style="margin-top:10px">Answer saved.</p>' : ''}
            <div class="q-actions">
              <button class="btn ghost" data-x="prev" ${cur === 0 ? 'disabled' : ''}>Previous</button>
              <button class="btn" data-x="next" ${cur === qs.length - 1 ? 'disabled' : ''}>Next</button>
              <span class="spacer"></span>
              <button class="btn ghost small" data-x="flag" aria-pressed="${flags.has(q.id)}">${flags.has(q.id) ? 'Remove flag' : 'Flag for review'}</button>
              ${at.feedback ? '' : `<button class="btn ghost small" data-x="clear" ${chosen === undefined ? 'disabled' : ''}>Clear answer</button>`}
              ${showCalc ? '<button class="btn ghost small" data-x="calc">Calculator</button>' : ''}
            </div>
            <p class="savestate ${saveBad ? 'bad' : ''}" aria-live="polite">${esc(saveMsg)}</p>
            <p class="small muted">Keys: A to D choose, N next, P previous, F flag, S submit.</p>
          </section>
          <aside class="navigator" aria-label="Question navigator">
            <h3>${esc(q.subject)}</h3>
            <div class="nav-grid">${sIdx.map((gi, n) => `<button data-go="${gi}" class="${answers[qs[gi].id] !== undefined ? 'done' : ''} ${flags.has(qs[gi].id) ? 'flag' : ''} ${gi === cur ? 'here' : ''}" aria-label="Question ${n + 1}${answers[qs[gi].id] !== undefined ? ', answered' : ', not answered'}${flags.has(qs[gi].id) ? ', flagged' : ''}">${n + 1}</button>`).join('')}</div>
            <div class="legend"><span><i class="d"></i>Answered</span><span><i></i>Not answered</span><span><i class="f"></i>Flagged</span></div>
            <p class="small muted" style="margin-top:10px">${qs.filter((x) => answers[x.id] !== undefined).length} of ${qs.length} answered in total.</p>
          </aside>
        </div>
        ${calcOpen ? `<div class="calc" role="dialog" aria-label="Calculator"><div class="head"><span>Calculator</span><button class="link" data-x="calc">Close</button></div><div class="scr" id="calc-scr">${esc(calc.disp)}</div><div class="keys">
          ${['C', '⌫', '√', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '±', '0', '.', '=', 'x²'].map((k) => `<button data-k="${k}" class="${'÷×-+'.includes(k) ? 'op' : k === '=' ? 'eq' : ''}">${k}</button>`).join('')}</div></div>` : ''}`;
      tick();
    }

    // ---------- events ----------
    const root = A.$('#app');
    const onClick = (e) => {
      const t = e.target.closest('button'); if (!t || !A.$('#exam-root') || !A.$('#exam-root').contains(t)) return;
      if (t.dataset.opt !== undefined) choose(Number(t.dataset.opt));
      else if (t.dataset.go !== undefined) go(Number(t.dataset.go));
      else if (t.dataset.subj) go(subjIndexes(t.dataset.subj)[0]);
      else if (t.dataset.k) calcKey(t.dataset.k);
      else if (t.dataset.x === 'next') go(cur + 1);
      else if (t.dataset.x === 'prev') go(cur - 1);
      else if (t.dataset.x === 'flag') toggleFlag();
      else if (t.dataset.x === 'clear') clearAnswer();
      else if (t.dataset.x === 'calc') { calcOpen = !calcOpen; draw(); }
      else if (t.dataset.x === 'submit') confirmSubmit();
    };
    const onKey = (e) => {
      if (at.begun === false || document.querySelector('.backdrop') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if ('abcde'.includes(k) && k.length === 1) { if ('abcde'.indexOf(k) < qs[cur].options.length) choose('abcde'.indexOf(k)); }
      else if (k === 'n' || k === 'arrowright') go(cur + 1);
      else if (k === 'p' || k === 'arrowleft') go(cur - 1);
      else if (k === 'f') toggleFlag();
      else if (k === 's') confirmSubmit();
    };
    const onLeave = (e) => { if (!finishing && at.begun !== false) { e.preventDefault(); e.returnValue = ''; } };
    const onHide = () => { if (document.hidden && !finishing && at.begun !== false) { awayCount++; draw(); } };
    const block = (e) => e.preventDefault();
    root.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    document.addEventListener('visibilitychange', onHide);
    ['copy', 'cut', 'paste', 'contextmenu'].forEach((ev) => document.addEventListener(ev, block));
    window.addEventListener('online', () => { for (const [qid, c] of Array.from(pending)) save(qid, c); });

    A.cleanup = () => {
      clearInterval(timer); clearInterval(retry);
      root.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onLeave);
      document.removeEventListener('visibilitychange', onHide);
      ['copy', 'cut', 'paste', 'contextmenu'].forEach((ev) => document.removeEventListener(ev, block));
    };
    if (at.begun === false) instructions(); else draw();

    function regNo() {
      let h = 0; const s = String(A.user.id || A.user.phone || A.user.name);
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return String(2026) + String(h % 100000000).padStart(8, '0') + 'AC';
    }
    function instructions() {
      const mins = Math.round((at.dur || 0) / 60000);
      const per = subjects.map((sj) => `<li><b>${esc(sj)}</b>: ${subjIndexes(sj).length} questions</li>`).join('');
      A.$('#app').innerHTML = `<div id="exam-root" class="exam"><div class="exam-bar"><div class="who">ScholarAce Computer-Based Test<small>${esc(at.title)}</small></div></div>
        <div class="instr"><div class="cand"><div class="avatar">${esc((A.user.name || '?').trim()[0].toUpperCase())}</div>
          <dl><dt>Candidate</dt><dd>${esc(A.user.name)}</dd><dt>Registration No.</dt><dd>${regNo()}</dd><dt>Subjects</dt><dd>${esc(subjects.join(', '))}</dd><dt>Duration</dt><dd>${mins} minutes</dd></dl></div>
          <div class="rules"><h2>Read these instructions carefully</h2>
          <ol>
            <li>This paper has <b>${qs.length} questions</b>:<ul>${per}</ul></li>
            <li>You have <b>${mins} minutes</b>. The clock starts the moment you press <b>Begin Exam</b> and cannot be paused.</li>
            <li>Each question has four options (A to D). Choose the one best answer. Every question carries equal marks and a wrong answer carries no penalty, so attempt all of them.</li>
            <li>Use the subject tabs and the numbered grid to move between questions. Use <b>Flag</b> to mark a question you want to revisit.</li>
            <li>Keyboard: <b>A–D</b> choose, <b>N</b> next, <b>P</b> previous, <b>F</b> flag, <b>S</b> submit.</li>
            <li>Leaving this page is recorded. When time runs out your answers are submitted automatically.</li>
          </ol>
          <label class="agree"><input type="checkbox" id="agree"> I have read and understood the instructions.</label>
          <div class="actions"><a class="btn ghost" href="#/dashboard">Cancel</a><button class="btn gold" id="begin" disabled>Begin Exam</button></div></div></div></div>`;
      const cb = A.$('#agree'), bt = A.$('#begin');
      cb.onchange = () => { bt.disabled = !cb.checked; };
      bt.onclick = async () => {
        bt.disabled = true;
        try {
          const r2 = await A.api('POST', `/exams/${at.id}/begin`, {});
          at.endsAt = r2.attempt.endsAt; endsAt = r2.attempt.endsAt; offset = r2.attempt.serverNow - Date.now(); at.begun = true;
          draw();
        } catch (e) { bt.disabled = false; A.toast(e.message, 'error'); }
      };
    }
  };
})();
