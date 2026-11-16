/* Teacher area */
const T = { classes: [], name: '', tab: 'hw', htab: 'timings' };
async function loadClasses() {
  const d = await api('/classes');
  T.classes = d.classes; T.name = d.teacher.name; VOICE.cloud = !!d.tts;
}
function shell(active, content) {
  const cls = T.classes.map((c) => `<button class="nav ${active === c.id ? 'on' : ''}" data-act="openClass" data-id="${esc(c.id)}"><span>${flagOf(c.language, 22)}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</span></button>`).join('');
  if (active === 'home') {
    const tile = (act, ic, name, d, col, extra) => `<button class="ttile" data-act="${act}" ${extra || ''} style="--c:${col}"><span class="ic">${ic}</span><b>${name}</b><small>${d}</small></button>`;
    const ctiles = T.classes.map((c) => `<button class="ttile cls" data-act="openClass" data-id="${esc(c.id)}" style="--c:#0f766e"><span class="ic">${flagOf(c.language, 34)}</span><b>${esc(c.name)}</b><small>Students, homework and results</small></button>`).join('');
    $('#app').innerHTML = `<div class="thome">
      <header class="thead"><img src="/logo.svg" alt="" style="width:44px;height:44px"><div style="flex:1;min-width:0"><b style="font-size:20px">French with Haresh</b><div class="mute small">Teacher home · ${esc(T.name || '')}</div></div><button class="btn ghost sm" data-act="logout">Sign out</button></header>
      <div class="sidehead" style="margin-left:2px">MY CLASSES</div>
      <div class="tgrid">${ctiles}${tile('newClass', '＋', 'Create class', 'Add a new class and its students', '#2f6bed')}</div>
      <div class="sidehead" style="margin-left:2px">TOOLS</div>
      <div class="tgrid">
        ${tile('tLib', '📚', 'Library', 'Create homework and assign it', '#2563eb')}
        ${tile('tPractice', '🎮', 'Practice games', 'Vocabulary, grammar, workouts and games', '#dc2626')}
        ${tile('tRes', '📎', 'Resources', 'ICSE and IGCSE material to assign', '#9333ea')}
        ${tile('tPres', '📈', 'Practice results', 'What students practised on their own', '#16a34a')}
        ${tile('tTl', '🗓', 'Timeline', 'Open and scheduled homework', '#d97706')}
        ${tile('tHelp', '❓', 'Help', 'How everything works', '#0891b2')}
      </div>
      <div style="margin-top:26px">${content}</div></div>`;
    return;
  }
  $('#app').innerHTML = `<button class="menubtn" data-act="menu">☰</button><div class="shell">
    <aside class="side" id="side">
      <div class="logo"><img src="/logo.svg" alt="" style="width:38px;height:38px;vertical-align:middle;margin-right:8px">French with Haresh <small>teachers</small></div>
      <button class="nav ${active === 'home' ? 'on' : ''}" data-act="tHome">🏠 Home</button>
      <button class="nav ${active === 'lib' ? 'on' : ''}" data-act="tLib">📚 Library</button>
      <button class="nav" data-act="tPractice">🎮 Practice games</button>
      <button class="nav" data-act="tRes">📎 Resources</button>
      <button class="nav ${active === 'pres' ? 'on' : ''}" data-act="tPres">📈 Practice results</button>
      <button class="nav ${active === 'tl' ? 'on' : ''}" data-act="tTl">🗓 Timeline</button>
      <button class="nav ${active === 'help' ? 'on' : ''}" data-act="tHelp">❓ Help</button>
      <div class="sidehead">CLASSES</div>
      <div class="grow">${cls}<button class="nav" style="color:var(--blue)" data-act="newClass">＋ Create class</button></div>
      <div class="userbox"><div class="avatar">${esc((T.name || '?')[0].toUpperCase())}</div><div style="flex:1;min-width:0"><b>${esc(T.name)}</b></div><button class="icon-btn" title="Sign out" data-act="logout">↪</button></div>
    </aside><main class="main">${content}</main></div>`;
}
ACT.voiceTest = () => voiceModal('fr-FR');
ACT.menu = () => $('#side').classList.toggle('open');
ACT.tHome = () => go('#/t');
ACT.tPractice = () => { if (typeof PH !== 'undefined' && PH) PH.keep = null; go('#/s/practice'); };
ACT.tRes = () => { location.href = '/resources/'; };
ACT.tPres = () => go('#/t/practice');
ACT.tLib = () => go('#/t/library');
ACT.tTl = () => go('#/t/timeline');
ACT.tHelp = () => go('#/t/help');
ACT.openClass = (t) => go('#/t/class/' + t.dataset.id);

/* ---- home ---- */
ROUTES.push([/^\/t$/, async () => {
  await loadClasses();
  const ov = await Promise.all(T.classes.map((c) => api('/classes/' + c.id + '/overview')));
  const hasClass = T.classes.length > 0, hasStud = ov.some((o) => o.students.length), hasHw = ov.some((o) => o.homework.length);
  let shared = false; try { shared = localStorage.getItem('md_shared') === '1'; } catch (e) {}
  const steps = [
    ['Create your first class', 'Your class gets a code and its own tile on this page.', hasClass, hasClass ? '' : '<button class="btn sm" data-act="newClass">Create class</button>'],
    ['Add your students', 'Paste or type names and get a PIN for each child.', hasStud, hasClass && !hasStud ? '<button class="btn sm" data-act="firstClass">Add students</button>' : ''],
    ['Add homework to your library, then assign it', 'Paste or upload a vocab list, then assign it to the class from the Library.', hasHw, hasStud && !hasHw ? '<button class="btn sm" data-act="tLib">Open library</button>' : ''],
    ['Get students onto the website', 'Share the link, class code and PINs.', shared, '<label class="row small" style="font-weight:800;gap:6px"><input type="checkbox" id="sharedChk" ' + (shared ? 'checked' : '') + '> Done</label>']
  ];
  const n = steps.filter((s) => s[2]).length;
  const feat = ov.find((o) => o.homework.length);
  if (feat && n === 4 || feat && T.homeFeat !== false) {
    const hs = feat.homework.slice().sort((x, y) => (y.start_at <= Date.now()) - (x.start_at <= Date.now()) || y.start_at - x.start_at);
    const pick = (T.homeHw && hs.find((h) => h.id === T.homeHw)) || hs[0];
    const d = await api('/homework/' + pick.id), c = feat.cls;
    const bar = `<div class="spread"><div class="row"><span style="font-size:34px">${flagOf(c.language, 40)}</span><h1>${esc(c.name)}</h1><span class="mute">${feat.students.length} students</span></div>
      <div class="row"><div class="codechip"><span class="mute small" style="font-weight:800">CLASS CODE</span><b>${esc(c.code)}</b><button class="icon-btn" style="width:32px;height:32px" data-act="copyCode2" data-c="${esc(c.code)}" title="Copy">⧉</button></div><button class="btn ghost" data-act="notify" data-id="${esc(c.id)}">🔔 Send notification</button><button class="btn ghost" data-act="openClass" data-id="${esc(c.id)}">All homework &amp; students</button></div></div>
      <div class="row" style="margin:16px 0 4px"><span class="mute small" style="font-weight:800">HOMEWORK</span><select id="homeHw" style="max-width:360px">${hs.map((h) => `<option value="${esc(h.id)}" ${h.id === pick.id ? 'selected' : ''}>${esc(h.title)}</option>`).join('')}</select>${n < 4 ? '<button class="btn ghost sm" data-act="hideSetup">Setup checklist</button>' : ''}</div>`;
    shell('home', bar + '<div class="card" style="margin-top:10px">' + hwHtml(d, false) + '</div>');
    $('#homeHw').addEventListener('change', (e) => { T.homeHw = e.target.value; route(); });
    ACT.copyCode2 = (t) => copyText(t.dataset.c);
    ACT.hideSetup = () => { T.homeFeat = false; route(); };
    return;
  }
  T.homeFeat = true;
  shell('home', `<h1>Welcome back</h1><p class="sub">Pick a class above to see how your students are doing.</p>
    <div class="card" style="padding:0"><div style="padding:18px 20px"><div class="spread"><div><h3>${n === 4 ? "You're all set!" : 'Get set up'}</h3><div class="mute small">${n === 4 ? 'Every step done. Your classes are live.' : 'Four quick steps.'}</div></div><b>${n} / 4</b></div>
      <div class="bars">${[0, 1, 2, 3].map((i) => '<i class="' + (i < n ? 'on' : '') + '"></i>').join('')}</div></div>
      ${steps.map((s, i) => `<div class="check ${s[2] ? 'done' : ''}"><div class="dot">${s[2] ? '✓' : i + 1}</div><div style="flex:1"><b>${s[0]}</b><div class="mute small">${s[1]}</div></div><div>${s[3]}</div></div>`).join('')}
    </div>
    <div class="card hwcard" data-act="instr"><div><b>Instructions to send to students</b><div class="mute small">Website link, how to sign in, and a printable page</div></div><span>›</span></div>`);
  const chk = $('#sharedChk');
  if (chk) chk.addEventListener('change', () => { try { localStorage.setItem('md_shared', chk.checked ? '1' : '0'); } catch (e) {} route(); });
  ACT.firstClass = () => go('#/t/class/' + T.classes[0].id);
}]);

ACT.instr = () => {
  const url = location.origin;
  const codes = T.classes.map((c) => `<tr><td>${esc(c.name)}</td><td><b style="letter-spacing:3px">${esc(c.code)}</b></td></tr>`).join('');
  const body = `<h2>Instructions for students</h2>
    <ol style="line-height:1.9;padding-left:20px"><li>Open <b>${esc(url)}</b> on a phone, tablet or computer.</li><li>Type your <b>class code</b> and your <b>PIN</b> on the student sign-in page.</li><li>Open your homework and choose any activity. Earn coins and climb the leaderboard.</li></ol>
    <table><tr><th>Class</th><th>Class code</th></tr>${codes}</table>
    <p class="mute small">Each student has their own PIN. Find them under Students, then Student PINs.</p>`;
  modal(body + `<div class="foot"><button class="btn ghost" data-act="close">Close</button><div class="row"><button class="btn ghost" data-act="copyLink">Copy link</button><button class="btn" data-act="printInstr">Print</button></div></div>`, true);
  ACT.copyLink = () => copyText(url);
  ACT.printInstr = () => printHTML('<div style="font-size:18px;padding:20px">' + body + '</div>');
};

/* ---- help ---- */
ROUTES.push([/^\/t\/help$/, async () => {
  await loadClasses();
  shell('help', `<h1>Help</h1><p class="sub">How everything works.</p>
    <div class="card"><h3>Setting homework from your own vocab</h3><p>Open a class, choose <b>Homework</b>, then <b>New homework</b>. Paste your list or upload a file. Put one item per line, French first, then English, split with a comma, tab, semicolon or <code>=</code>:</p>
    <div class="pbox">le voisin = neighbour<br>la tante, aunt<br>Ma tante habitait loin = My aunt lived far away</div>
    <p>Lines with three or more French words count as <b>sentences</b>. Words power Match, Translate and Listen. Sentences power Tap, Add spaces and Odd words out (you need at least 3).</p></div>
    <div class="card"><h3>Verbs and grammar</h3><p>Add verbs as <code>parler | to speak | present | parle, parles, parle, parlons, parlez, parlent</code> and grammar gaps as <code>Elle ___ au march\u00E9. | va | vais, vas, vont | aller</code>. The matching exercises (conjugation, fill the gap) appear automatically.</p></div>
    <div class="card"><h3>How do the words sound?</h3><p>Listening exercises use the voice on each child's device. Check how it sounds here, and you can pick a better voice if the device has one. For natural voices on every device, see "Natural voices" in the README.</p><button class="btn" data-act="voiceTest">\uD83D\uDD0A Test voice</button></div>
    <div class="card"><h3>Giving students control</h3><p>Students can open the activities in any order and repeat them. If you want a fixed order, untick <b>Children choose the order</b> on the homework.</p></div>
    <div class="card"><h3>Lost a PIN?</h3><p>Open the class, go to <b>Students</b> and use <b>New PIN</b> on that row.</p></div>`);
}]);

/* ---- create class ---- */
let CC = null;
ACT.newClass = () => { CC = { step: 0, name: '', language: 'French', tiers: ['Foundation', 'Higher'], code: '', err: '' }; renderCC(); };
function stepbar(labels, cur) {
  return '<div class="stepbar">' + labels.map((l, i) => `<div class="${i <= cur ? 'on' : ''}"><i></i><span>${l}</span></div>`).join('') + '</div>';
}
async function renderCC() {
  const c = CC; let body = '';
  const bar = stepbar(['Name', 'Tiers', 'Class code', 'Confirm'], c.step);
  if (c.step === 0) body = `<label class="f">Class name</label><input id="ccn" type="text" maxlength="60" placeholder="e.g. 10A French 2026" value="${esc(c.name)}">
    <label class="f">Language</label>${['French', 'Spanish'].map((l) => `<button class="choice ${c.language === l ? 'on' : ''}" data-act="ccLang" data-v="${l}"><span style="font-size:22px">${LANG[l].flag}</span><b>${l}</b></button>`).join('')}`;
  if (c.step === 1) body = `<p class="mute">Which board is this class studying?</p>${[['ICSE', 'ICSE'], ['IGCSE', 'IGCSE'], ['Both', 'Both (mixed class)']].map(([v, l]) => `<button class="choice ${(c.board || 'Both') === v ? 'on' : ''}" data-act="ccBoard" data-v="${v}"><b>${l}</b></button>`).join('')}<p class="mute" style="margin-top:14px">Which tiers does this class cover?</p>${['Foundation', 'Higher'].map((t) => `<button class="choice ${c.tiers.includes(t) ? 'on' : ''}" data-act="ccTier" data-v="${t}"><b>${t}</b></button>`).join('')}`;
  if (c.step === 2) {
    if (!c.code) { try { c.code = (await api('/classes/suggest-code')).code; } catch (e) {} }
    body = `<p class="mute">Students use this code with their PIN to sign in.</p><label class="f">Class code</label><div class="row"><input id="ccc" type="text" maxlength="8" value="${esc(c.code)}" style="flex:1;letter-spacing:6px;font-weight:800;font-size:22px;text-transform:uppercase"><button class="btn ghost sm" data-act="ccNew">New code</button></div>`;
  }
  if (c.step === 3) body = `<div class="pbox"><b>${esc(c.name)}</b><br>${LANG[c.language].flag} ${c.language} · ${c.tiers.join(' and ')} · ${c.board || 'Both'}<br>Class code: <b style="letter-spacing:3px">${esc(c.code)}</b></div>`;
  const m = modalEl ? modalEl.firstChild : modal('');
  m.innerHTML = `<h2>Create a class</h2>${bar}${body}<div class="err">${esc(c.err)}</div>
    <div class="foot"><button class="btn ghost" data-act="${c.step ? 'ccBack' : 'close'}">${c.step ? '← Back' : 'Cancel'}</button><button class="btn" data-act="ccNext">${c.step === 3 ? 'Create class' : 'Next →'}</button></div>`;
  const n = $('#ccn'); if (n) n.focus();
}
ACT.ccLang = (t) => { CC.name = $('#ccn').value; CC.language = t.dataset.v; renderCC(); };
ACT.ccBoard = (t) => { CC.board = t.dataset.v; renderCC(); };
ACT.ccTier = (t) => { const v = t.dataset.v, i = CC.tiers.indexOf(v); if (i >= 0) CC.tiers.splice(i, 1); else CC.tiers.push(v); renderCC(); };
ACT.ccNew = async () => { CC.code = (await api('/classes/suggest-code')).code; renderCC(); };
ACT.ccBack = () => { CC.err = ''; CC.step--; renderCC(); };
ACT.ccNext = async () => {
  const c = CC; c.err = '';
  if (c.step === 0) { c.name = $('#ccn').value.trim(); if (!c.name) { c.err = 'Give the class a name.'; return renderCC(); } }
  if (c.step === 1 && !c.tiers.length) { c.err = 'Pick at least one tier.'; return renderCC(); }
  if (c.step === 2) { c.code = $('#ccc').value.toUpperCase().trim(); if (!/^[A-Z]{4,8}$/.test(c.code)) { c.err = 'Use 4 to 8 letters.'; return renderCC(); } }
  if (c.step === 3) {
    try { const r = await api('/classes', 'POST', { name: c.name, language: c.language, tiers: c.tiers, code: c.code, board: c.board || 'Both' }); closeModal(); go('#/t/class/' + r.id); }
    catch (e) { c.err = e.message; if (/code/i.test(e.message)) c.step = 2; renderCC(); }
    return;
  }
  c.step++; renderCC();
};

/* ---- class page ---- */
let CLS = null;
ROUTES.push([/^\/t\/class\/(\w+)$/, async (id) => {
  await loadClasses();
  const o = await api('/classes/' + id + '/overview');
  CLS = o;
  const c = o.cls, flag = (LANG[c.language] || LANG.French).flag;
  let inner = '';
  if (T.tab === 'hw') {
    inner = `<div class="spread" style="margin-bottom:14px"><h3>Assigned homework</h3><div class="row"><button class="btn ghost" data-act="tLib">📚 Library</button><button class="btn" data-act="assignFromClass">＋ Assign from library</button></div></div>` +
      (o.homework.length ? o.homework.map((h) => `<div class="hwcard" data-act="openHw" data-id="${esc(h.id)}"><div><b style="font-size:17px">${esc(h.title)}</b><div class="mute small">${esc(h.topic || '')}</div>
        <div class="mini"><span class="chip">${esc(h.tier)}</span><span class="chip">${esc(audLabel(h.audience))}</span><span class="badge g">${h.counts.complete} complete</span><span class="badge a">${h.counts.progress} in progress</span><span class="badge n">${h.counts.new} not started</span></div></div><div style="text-align:right" class="small mute">${h.start_at > Date.now() ? 'Starts ' + esc(fmtDate(h.start_at)) + '<br>' : ''}Due<br><b style="color:var(--ink)">${esc(fmtDate(h.due_at))}</b></div></div>`).join('')
        : '<div class="card mute">Nothing assigned to this class yet. Open the Library and assign a homework.</div>');
  } else {
    inner = `<div class="spread" style="margin-bottom:14px"><h3>Students</h3><div class="row"><button class="btn ghost" data-act="showPins">🔑 Student PINs</button><button class="btn" data-act="addStudents">＋ Add students</button></div></div>` +
      (o.students.length ? `<div class="card scroll" style="padding:6px 14px"><table><tr><th>Student</th><th>Time on app</th><th>Today</th><th>Yesterday</th><th>Last active</th><th>Done on time</th><th></th></tr>${o.students.map((s) => `<tr><td><b>${esc(s.name)}</b></td><td>${fmtDur(s.secsTotal)}</td><td>${fmtDur(s.secsToday)}</td><td>${fmtDur(s.secsYesterday)}</td><td>${esc(ago(s.lastActive))}</td><td>${s.onTime} / ${s.hwTotal}</td><td style="text-align:right;white-space:nowrap"><button class="btn ghost sm" data-act="pinCard" data-id="${esc(s.id)}">🖨 PIN card</button> <button class="btn ghost sm" data-act="newPin" data-id="${esc(s.id)}">New PIN</button> <button class="btn ghost sm" data-act="rmStudent" data-id="${esc(s.id)}">Remove</button></td></tr>`).join('')}</table></div>`
        : '<div class="card mute">No students yet. Add your class list to get a PIN for each child.</div>');
  }
  shell(c.id, `<div class="spread"><div class="row"><span style="font-size:34px">${flagOf(c.language, 40)}</span><h1>${esc(c.name)}</h1><span class="mute">${o.students.length} students</span><select data-act="setBoard" title="Board: decides which resources this class sees" style="padding:6px 10px;border-radius:10px;border:2px solid var(--line);font-weight:800">${['ICSE', 'IGCSE', 'Both'].map((b) => `<option ${((c.board || 'Both') === b) ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
    <div class="row"><div class="codechip"><span class="mute small" style="font-weight:800">CLASS CODE</span><b>${esc(c.code)}</b><button class="icon-btn" style="width:32px;height:32px" data-act="copyCode" title="Copy">⧉</button></div><button class="btn ghost" data-act="notify" data-id="${esc(c.id)}">🔔 Send notification</button><button class="btn ghost" data-act="classSettings">⚙ Class settings</button></div></div>
    <div class="tabs" style="margin-top:18px"><button class="${T.tab === 'hw' ? 'on' : ''}" data-act="tabHw">📝 Homework ${o.homework.length}</button><button class="${T.tab === 'st' ? 'on' : ''}" data-act="tabSt">👥 Students ${o.students.length}</button></div>${inner}`);
}]);
ACT.setBoard = async (t) => { try { await api('/classes/' + CLS.cls.id + '/board', 'PUT', { board: t.value }); toast('Board set to ' + t.value); } catch (e) { toast(e.message); } };
ACT.tabHw = () => { T.tab = 'hw'; route(); };
ACT.tabSt = () => { T.tab = 'st'; route(); };
ACT.copyCode = () => copyText(CLS.cls.code);
ACT.openHw = (t) => go('#/t/hw/' + t.dataset.id);
ACT.newHw = () => go('#/t/class/' + CLS.cls.id + '/new');
ACT.assignFromClass = () => go('#/t/library?class=' + CLS.cls.id);
ACT.classSettings = () => {
  modal(`<h2>Class settings</h2><p><b>${esc(CLS.cls.name)}</b><br><span class="mute">Class code ${esc(CLS.cls.code)}</span></p>
    <div class="pbox">Deleting a class removes its students, homework and results. This cannot be undone.</div>
    <div class="foot"><button class="btn ghost" data-act="close">Close</button><button class="btn red" data-act="delClass">Delete class</button></div>`);
};
ACT.delClass = () => {
  setModal(`<h2>Delete this class?</h2><p>This removes <b>${esc(CLS.cls.name)}</b>, all its students and all results. Are you sure?</p><div class="foot"><button class="btn ghost" data-act="close">Keep it</button><button class="btn red" data-act="delClass2">Yes, delete</button></div>`);
};
ACT.delClass2 = async () => { await api('/classes/' + CLS.cls.id, 'DELETE'); closeModal(); go('#/t'); };
ACT.newPin = async (t) => { const r = await api('/students/' + t.dataset.id + '/newpin', 'POST', {}); const s = CLS.students.find((x) => x.id === t.dataset.id); modal(`<h2>New PIN</h2><p><b>${esc(s.name)}</b> now signs in with PIN</p><div class="big" style="font-size:40px;letter-spacing:10px;font-weight:800;text-align:center;margin:14px 0">${esc(r.pin)}</div><div class="foot"><span></span><button class="btn" data-act="doneReload">Done</button></div>`); };
ACT.rmStudent = (t) => {
  const s = CLS.students.find((x) => x.id === t.dataset.id);
  modal(`<h2>Remove ${esc(s.name)}?</h2><p>Their results will be deleted too.</p><div class="foot"><button class="btn ghost" data-act="close">Cancel</button><button class="btn red" data-act="rmStudent2" data-id="${esc(s.id)}">Remove</button></div>`);
};
ACT.rmStudent2 = async (t) => { await api('/students/' + t.dataset.id, 'DELETE'); closeModal(); route(); };
ACT.doneReload = () => { closeModal(); route(); };

/* PINs */
function pinTable(list) {
  return `<div class="card scroll" style="padding:4px 14px;max-height:340px;overflow:auto"><table><tr><th>Student</th><th style="text-align:right">PIN</th></tr>${list.map((s) => `<tr><td>${esc(s.name)}</td><td style="text-align:right;font-weight:800;letter-spacing:5px">${esc(s.pin)}</td></tr>`).join('')}</table></div>`;
}
let PINLIST = [];
function pinFoot() {
  return `<div class="row" style="justify-content:space-between"><div class="row"><button class="btn ghost" data-act="copyPins">⧉ Copy table</button><button class="btn ghost" data-act="paperCards">🖨 Paper cards</button></div><button class="btn" data-act="doneReload">Done</button></div>`;
}
ACT.showPins = () => { PINLIST = CLS.students; modal('<h2>Student PINs</h2>' + (PINLIST.length ? pinTable(PINLIST) : '<p class="mute">No students yet.</p>') + pinFoot()); };
const cardHtml = (s) => `<div class="pcardp"><img src="/logo.svg" alt="" style="width:64px;height:64px;float:right"><b>French with Haresh</b><br>${esc(s.name)}<br>Website: ${esc(location.origin)}<br>Class code: <b>${esc(CLS.cls.code)}</b><br>PIN:<div class="big">${esc(s.pin)}</div><div style="font-size:12px;color:#666">Personal to you. Please do not share it: it works on one device at a time.</div></div>`;
ACT.pinCard = (t) => {
  const s = CLS.students.find((x) => x.id === t.dataset.id); if (!s) return;
  PINLIST = [s];
  modal(`<h2>${esc(s.name)}</h2><div class="pbox" style="text-align:center">Class code <b style="letter-spacing:3px">${esc(CLS.cls.code)}</b><div style="font-size:40px;letter-spacing:10px;font-weight:800;margin:10px 0">${esc(s.pin)}</div><span class="mute small">${esc(location.origin)}</span></div><div class="foot"><button class="btn ghost" data-act="close">Close</button><button class="btn" data-act="printOne">🖨 Print card</button></div>`);
};
ACT.printOne = () => printHTML('<div class="pcards">' + cardHtml(PINLIST[0]) + '</div>');
ACT.copyPins = () => copyText('Student\tPIN\n' + PINLIST.map((s) => s.name + '\t' + s.pin).join('\n'));
ACT.paperCards = () => {
  printHTML('<div class="pcards">' + PINLIST.map((s) => cardHtml(s)).join('') + '</div>');
};

/* add students */
let AS = null;
ACT.addStudents = () => { AS = { step: 0, mode: '', text: '', err: '' }; renderAS(); };
function renderAS() {
  const a = AS, bar = stepbar(['Enter students', 'Generate PINs', 'Confirm'], a.step === 0 ? 0 : 2);
  let body = '', foot = '';
  if (a.step === 0 && !a.mode) {
    body = `<p class="mute" style="text-align:center">How would you like to add your students?</p><div class="pick" style="margin:10px auto">
      <button class="opt" data-act="asMode" data-v="paste"><b>Paste a list</b><span class="mute small">Copy the name column from Excel or Google Sheets.</span></button>
      <button class="opt" data-act="asMode" data-v="type"><b>Type in the names</b><span class="mute small">One name per line.</span></button></div>`;
    foot = '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button><span></span></div>';
  } else if (a.step === 0) {
    body = `<label class="f">${a.mode === 'paste' ? 'Paste names here' : 'Type one name per line'}</label><textarea id="asText" placeholder="Resham C&#10;Asha K&#10;...">${esc(a.text)}</textarea><div class="mute small">First names or initials are enough.</div>`;
    foot = `<div class="err">${esc(a.err)}</div><div class="foot"><button class="btn ghost" data-act="asBack">← Back</button><button class="btn" data-act="asGo">Generate PINs →</button></div>`;
  } else {
    body = `<p class="mute">${a.list.length} student${a.list.length > 1 ? 's' : ''} added. Share these PINs with them.</p>` + pinTable(a.list);
    foot = '<div class="foot" style="display:block">' + pinFoot() + '</div>';
  }
  const m = modalEl ? modalEl.firstChild : modal('', true);
  modalEl.firstChild.classList.add('wide');
  m.innerHTML = `<h2>Add students</h2>${bar}${body}${foot}`;
}
ACT.asMode = (t) => { AS.mode = t.dataset.v; renderAS(); };
ACT.asBack = () => { AS.mode = ''; renderAS(); };
ACT.asGo = async () => {
  AS.text = $('#asText').value;
  const names = AS.text.split(/\r?\n/).map((l) => l.split('\t')[0].trim()).filter(Boolean);
  if (!names.length) { AS.err = 'Add at least one name.'; return renderAS(); }
  if (AS.busy) return;
  AS.busy = true; AS.err = '';
  const btn = document.querySelector('[data-act=asGo]'); if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }
  try { const r = await api('/classes/' + CLS.cls.id + '/students', 'POST', { names }); AS.list = r.students; PINLIST = r.students; AS.step = 1; AS.busy = false; renderAS(); }
  catch (e) { AS.busy = false; AS.err = e.message; renderAS(); }
};

/* ---- homework form (create / edit) ---- */
const DEFAULT_EX = ['match', 'translate', 'listen', 'typeit', 'dictation', 'tap', 'spaces', 'odd', 'conjpick', 'gappick'];
const VERB_EX = 'parler | to speak | present | parle, parles, parle, parlons, parlez, parlent\naller | to go | present | vais, vas, va, allons, allez, vont\nfinir | to finish | present | finis, finis, finit, finissons, finissez, finissent';
const GRAM_EX = 'Elle ___ au marché. | va | vais, vas, vont | aller (present)\nNous ___ la télé. | regardons | regardez, regardent | regarder (present)\nIl ___ un garçon. | est | es, sont | être (present)';

function parseContent(text) {
  const items = [], bad = [];
  String(text || '').split(/\r?\n/).forEach((raw, idx) => {
    const l = raw.trim();
    if (!l || l[0] === '#') return;
    if (idx === 0 && /^"?(french|fran[cç]ais|spanish|word|fr|vocab)/i.test(l) && /(english|anglais|en)"?\s*$/i.test(l)) return;
    let parts = null;
    if (l.includes('\t')) parts = l.split('\t');
    else if (l.includes(' = ')) parts = l.split(' = ');
    else if (l.includes('=')) parts = l.split('=');
    else if (l.includes(';')) parts = l.split(';');
    else if (l.includes('|')) parts = l.split('|');
    else if (/ [-–—] /.test(l)) parts = l.split(/ [-–—] /);
    else if (l.includes(',')) {
      parts = [];
      const re = /("([^"]*)"|[^,]*)(,|$)/g; let m;
      while ((m = re.exec(l)) && m[0] !== '') { parts.push(m[2] != null ? m[2] : m[1]); if (m[3] === '') break; }
    }
    if (!parts || parts.length < 2) { bad.push(idx + 1); return; }
    const fr = parts[0].replace(/^"|"$/g, '').trim(), en = parts.slice(1).join(' ').replace(/^"|"$/g, '').trim();
    if (!fr || !en) { bad.push(idx + 1); return; }
    items.push({ fr, en, s: isSentence(fr) });
  });
  return { items, bad };
}
function parseVerbs(text) {
  const verbs = [], bad = [];
  String(text || '').split(/\r?\n/).forEach((raw, idx) => {
    const l = raw.trim(); if (!l || l[0] === '#' || /^infinitive/i.test(l)) return;
    const p = l.split('|').map((x) => x.trim());
    if (p.length < 3) { bad.push(idx + 1); return; }
    const forms = p[p.length - 1].split(/[,;]/).map((x) => x.trim()).filter(Boolean);
    if (forms.length !== 6 || !p[0]) { bad.push(idx + 1); return; }
    verbs.push({ inf: p[0], en: p[1], tense: p.length >= 4 ? p[2] : '', forms });
  });
  return { verbs, bad };
}
function parseGrammar(text) {
  const grammar = [], bad = [];
  String(text || '').split(/\r?\n/).forEach((raw, idx) => {
    const l = raw.trim(); if (!l || l[0] === '#') return;
    const p = l.split('|').map((x) => x.trim());
    if (p.length < 2 || !/_{3,}/.test(p[0]) || !p[1]) { bad.push(idx + 1); return; }
    grammar.push({ s: p[0].replace(/_{3,}/g, '___'), a: p[1], o: (p[2] || '').split(',').map((x) => x.trim()).filter(Boolean), h: p[3] || '' });
  });
  return { grammar, bad };
}
let HF = null;
function hwForm(init, backHash, submitLabel) {
  HF = init;
  const tiers = (CLS && CLS.cls.tiers) || ['Foundation', 'Higher'];
  const folders = [...new Set(((window.LIBF) || []).filter(Boolean))];
  $('.main').innerHTML = `<p><button class="linkbtn" data-act="hwBack">← Back</button></p><h1>${esc(submitLabel)}</h1><p class="sub">Add your vocab, verbs and grammar, then choose which exercises children can use.</p>
    <div class="card"><label class="f" style="margin-top:0">Title</label><input id="hTitle" type="text" maxlength="80" placeholder="e.g. Comment je faisais la fête" value="${esc(init.title)}">
      <label class="f">Topic or learning goal</label><input id="hTopic" type="text" maxlength="120" placeholder="e.g. Form basic sentences, greet people" value="${esc(init.topic)}">
      <div class="row" style="align-items:flex-start"><div style="flex:1;min-width:180px"><label class="f">Tier</label><select id="hTier">${tiers.map((t) => `<option ${t === init.tier ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div style="flex:1;min-width:220px"><label class="f">Folder</label><input id="hFolder" type="text" list="hFolders" maxlength="60" placeholder="e.g. A · Everyday activities" value="${esc(init.folder || '')}"><datalist id="hFolders">${folders.map((f) => `<option value="${esc(f)}">`).join('')}</datalist></div></div></div>
    <div class="card"><h3>1. Vocabulary</h3><p class="mute small" style="margin:4px 0 8px">One item per line, French first then English. Words and sentences can be mixed. A line of 4+ words, or ending in . ! ?, counts as a sentence.</p>
      <textarea id="hItems" style="min-height:190px" placeholder="le voisin = neighbour&#10;la tante, aunt&#10;Ma tante habitait loin = My aunt lived far away">${esc(init.text)}</textarea>
      <div class="row" style="margin-top:10px"><label class="btn ghost sm" style="cursor:pointer">📄 Upload a file<input id="hFile" type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" style="display:none"></label><button class="btn ghost sm" data-act="template">⬇ Download template</button><button class="btn ghost sm" data-act="hwSample">🔊 Hear it</button><span class="mute small">CSV, TXT or Excel</span></div></div>
    <div class="card"><h3>2. Verbs <span class="mute small" style="font-weight:600">(optional)</span></h3><p class="mute small" style="margin:4px 0 8px">One verb per line: <b>infinitive | English | tense | the 6 forms</b> for je, tu, il/elle, nous, vous, ils/elles.</p>
      <textarea id="hVerbs" style="min-height:100px" placeholder="${esc(VERB_EX)}">${esc(init.verbs)}</textarea><div class="row" style="margin-top:8px"><button class="btn ghost sm" data-act="addEx" data-k="verbs">Add examples</button></div></div>
    <div class="card"><h3>3. Grammar questions <span class="mute small" style="font-weight:600">(optional)</span></h3><p class="mute small" style="margin:4px 0 8px">One per line: <b>sentence with ___ | correct answer | wrong options (comma separated) | hint</b>. Wrong options and hint are optional. With wrong options children can choose, without them they type.</p>
      <textarea id="hGram" style="min-height:100px" placeholder="${esc(GRAM_EX)}">${esc(init.gram)}</textarea><div class="row" style="margin-top:8px"><button class="btn ghost sm" data-act="addEx" data-k="gram">Add examples</button></div></div>
    <div class="pbox" id="hPrev"></div>
    <div class="card" style="margin-top:16px"><label class="row" style="font-weight:800"><input id="hMixed" type="checkbox" style="width:18px;height:18px" ${init.mixed ? 'checked' : ''}> Mixed lessons (recommended): each step mixes words, sounds and sentences, like a real lesson. Needs at least 4 items.</label></div>
    <div class="card" style="margin-top:16px"><div class="spread"><div><h3>4. Exercises for this homework</h3><p class="mute small" style="margin:4px 0 0">Tick what children can use. Each becomes a step on their path. Greyed ones need more content.</p></div><div class="row"><button class="btn ghost sm" data-act="exRec">Recommended</button><button class="btn ghost sm" data-act="exAll">Select all</button><button class="btn ghost sm" data-act="exNone">Clear</button></div></div><div id="hEx"></div>
      <label class="row" style="margin-top:14px;font-weight:800"><input id="hFree" type="checkbox" style="width:18px;height:18px" ${init.free_order ? 'checked' : ''}> Children choose the order (untick to unlock steps one by one)</label></div>
    <div class="err" id="hErr"></div><div class="row"><button class="btn" data-act="hwSave">${esc(submitLabel)}</button><button class="btn ghost" data-act="hwBack">Cancel</button></div>`;
  HF.back = backHash;
  ['#hItems', '#hVerbs', '#hGram'].forEach((s) => $(s).addEventListener('input', refreshForm));
  $('#hFile').addEventListener('change', onFile);
  refreshForm();
}
function formContent() {
  const a = parseContent($('#hItems').value), v = parseVerbs($('#hVerbs').value), g = parseGrammar($('#hGram').value);
  return { items: a.items, verbs: v.verbs, grammar: g.grammar, bad: { v: a.bad, vb: v.bad, g: g.bad } };
}
function refreshForm() {
  const C = formContent(), st = contentStats(C.items, C.verbs, C.grammar);
  const lines = (arr) => arr.slice(0, 8).join(', ') + (arr.length > 8 ? '...' : '');
  $('#hPrev').innerHTML = `✅ <b>${st.i - st.s}</b> words, <b>${st.s}</b> sentences, <b>${st.v}</b> verbs, <b>${st.g}</b> grammar questions found.` +
    (C.bad.v.length ? `<br><span style="color:var(--red)">Vocabulary: could not read line ${lines(C.bad.v)}. Put French and English on the same line.</span>` : '') +
    (C.bad.vb.length ? `<br><span style="color:var(--red)">Verbs: check line ${lines(C.bad.vb)}. You need a name, English and exactly 6 forms.</span>` : '') +
    (C.bad.g.length ? `<br><span style="color:var(--red)">Grammar: check line ${lines(C.bad.g)}. Use ___ for the gap and give the answer after a |.</span>` : '');
  const box = $('#hEx'), checked = {};
  box.querySelectorAll('input:not(:disabled)').forEach((i) => { checked[i.value] = i.checked; });
  box.innerHTML = CATEGORIES.map((cat) => `<div class="exh">${cat.name}</div>` + CATALOG.filter((c) => c.cat === cat.id).map((c) => {
    const ok = supports(c.id, st);
    const on = ok && (c.id in checked ? checked[c.id] : (HF.ex ? HF.ex.includes(c.id) : DEFAULT_EX.includes(c.id)));
    return `<label class="ex ${ok ? '' : 'off'}"><input type="checkbox" value="${c.id}" ${on ? 'checked' : ''} ${ok ? '' : 'disabled'}><div><b>${c.ic} ${esc(c.name)}</b><span class="mute small">${esc(c.desc)}${ok ? '' : ' Needs ' + esc(NEED_TEXT[c.need]) + '.'}</span></div></label>`;
  }).join('')).join('');
}
ACT.exAll = () => document.querySelectorAll('#hEx input:not(:disabled)').forEach((i) => { i.checked = true; });
ACT.exNone = () => document.querySelectorAll('#hEx input').forEach((i) => { i.checked = false; });
ACT.exRec = () => document.querySelectorAll('#hEx input:not(:disabled)').forEach((i) => { i.checked = DEFAULT_EX.includes(i.value); });
ACT.addEx = (t) => { const el = $(t.dataset.k === 'verbs' ? '#hVerbs' : '#hGram'); el.value = (el.value.trim() ? el.value.trim() + '\n' : '') + (t.dataset.k === 'verbs' ? VERB_EX : GRAM_EX); refreshForm(); };
ACT.hwSample = () => {
  const first = parseContent($('#hItems').value).items[0];
  const lang = (LANG[CLS.cls.language] || LANG.French).tts;
  if (first) { speakText(first.fr, lang, false); toast('Playing: ' + first.fr); } else voiceModal(lang);
};
async function onFile(e) {
  const f = e.target.files[0]; if (!f) return;
  try {
    let text = '';
    if (/\.xlsx?$/i.test(f.name)) {
      if (!window.XLSX) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = () => rej(new Error('Could not load the Excel reader. Save the sheet as CSV and upload that instead.')); document.head.appendChild(s); });
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      text = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]], { FS: '\t' });
    } else text = await f.text();
    const cur = $('#hItems').value.trim();
    $('#hItems').value = (cur ? cur + '\n' : '') + text.replace(/^﻿/, '').trim();
    if (!$('#hTitle').value) $('#hTitle').value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    refreshForm(); toast('File added');
  } catch (err) { $('#hErr').textContent = err.message; }
  e.target.value = '';
}
ACT.template = () => {
  const csv = 'French,English\nle voisin,neighbour\nla tante,aunt\nloin,far\nhabiter,to live\nMa tante habitait loin,My aunt lived far away\nLes voisins habitaient loin,The neighbours lived far away\nNous offrions des cadeaux aux voisins,We gave presents to the neighbours\n';
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'homework-template.csv'; document.body.appendChild(a); a.click(); a.remove();
};
ACT.hwBack = () => go(HF.back);
ACT.hwSave = async () => {
  const C = formContent();
  const ex = [...document.querySelectorAll('#hEx input:checked')].map((i) => i.value);
  const body = { title: $('#hTitle').value, topic: $('#hTopic').value, tier: $('#hTier').value, folder: $('#hFolder').value, free_order: $('#hFree').checked, exercises: ex, mixed: $('#hMixed').checked,
    items: C.items.map((i) => Object.assign({ fr: i.fr, en: i.en }, (HF.meta || {})[i.fr] || {})), verbs: C.verbs, grammar: C.grammar };
  try {
    if (HF.id) { await api('/homework/' + HF.id, 'PUT', body); go('#/t/hw/' + HF.id); }
    else { const r = await api('/classes/' + HF.cid + '/homework', 'POST', body); go('#/t/library'); }
  } catch (e) { $('#hErr').textContent = e.message; window.scrollTo(0, document.body.scrollHeight); }
};
ROUTES.push([/^\/t\/class\/(\w+)\/new$/, async (cid) => {
  await loadClasses();
  CLS = await api('/classes/' + cid + '/overview');
  shell(cid, '');
  try { window.LIBF = (await api('/library')).homework.map((h) => h.folder); } catch (e) {}
  hwForm({ cid, title: '', topic: '', tier: CLS.cls.tiers[0], folder: '', text: '', verbs: '', gram: '', free_order: 0, ex: null, mixed: true }, '#/t/class/' + cid, 'Create homework');
}]);
ROUTES.push([/^\/t\/hw\/(\w+)\/edit$/, async (id) => {
  await loadClasses();
  const d = await api('/homework/' + id);
  CLS = await api('/classes/' + d.cls.id + '/overview');
  shell(d.cls.id, '');
  const x = d.hw.extra || {};
  try { window.LIBF = (await api('/library')).homework.map((h) => h.folder); } catch (e) {}
  hwForm({ id, title: d.hw.title, topic: d.hw.topic, tier: d.hw.tier, folder: d.hw.folder || '', text: d.hw.items.map((i) => i.fr + ' = ' + i.en).join('\n'),
    verbs: (x.verbs || []).map((v) => [v.inf, v.en, v.tense, v.forms.join(', ')].join(' | ')).join('\n'),
    gram: (x.grammar || []).map((g) => [g.s, g.a, (g.o || []).join(', '), g.h || ''].join(' | ').replace(/( \| )+$/, '')).join('\n'),
    free_order: d.hw.free_order, ex: d.hw.exercises, mixed: !!x.mixed,
    meta: Object.fromEntries(d.hw.items.map((i) => [i.fr, { s: i.s, k: i.k, d: i.d }])) }, '#/t/hw/' + id, 'Save changes');
}]);

/* ---- homework detail ---- */
function hwHtml(d, standalone) {
  const { hw, students, days } = d;
  let inner = '';
  if (T.htab === 'timings') {
    const cs = Math.max(1, d.classSize);
    inner = `<div class="card"><div class="spread"><div><h3>Pupils logged on each day</h3><div class="mute small">Bar length shows how much of the class logged on each day.</div></div>
      <div class="row" style="gap:26px"><div style="text-align:right"><div class="bigstat">${d.loggedAny}/${d.classSize}</div><div class="mute small">logged on at all</div></div><div style="text-align:right"><div class="bigstat">${(days.reduce((t, x) => t + x.n, 0) / cs).toFixed(1)} of ${days.length}</div><div class="mute small">average days per pupil</div></div></div></div>
      <div class="daychart" style="margin-top:14px">${days.map((x) => `<div class="r"><div class="d">${esc(new Date(x.day + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }))}</div><div class="hbar"><i style="width:${Math.round(x.n / cs * 100)}%"></i></div><div class="hn">${x.n}/${d.classSize}</div></div>`).join('')}</div></div>
      <div class="kan">${[['new', 'Not started', 'c0'], ['progress', 'In progress', 'c1'], ['complete', 'Complete', 'c2']].map(([k, lbl, cl]) => {
        const g = students.filter((s) => s.status === k);
        return `<div class="col ${cl}"><h4>${lbl}<span class="chip">${g.length}</span></h4>${g.length ? g.map((s) => `<div class="scard"><div><b>${esc(s.name)}</b><div class="mute small">${esc(s.cls || '')}${s.cls ? ' · ' : ''}${s.coins} coins · ${fmtDur(s.secs)}${s.status === 'complete' ? (s.onTime ? ' · ✅ on time' : ' · ⏰ late') : ''}</div></div><div class="ring" style="--p:${Math.round(s.done / Math.max(1, hw.exercises.length) * 100)}%"><span>${s.done}</span></div></div>`).join('') : '<div class="mute small" style="text-align:center;padding:14px">No pupils here</div>'}</div>`;
      }).join('')}</div>`;
  } else if (T.htab === 'results') {
    inner = `<div class="card scroll" style="padding:6px 14px"><table><tr><th>Student</th>${hw.exercises.map((k) => '<th>' + EXERCISES[k].name + '</th>').join('')}<th>Coins</th></tr>${students.map((s) => `<tr><td><b>${esc(s.name)}</b></td>${hw.exercises.map((k) => { const b = s.best[k]; return '<td>' + (b ? Math.round(b.score / b.total * 100) + '%' : '<span class="mute">–</span>') + '</td>'; }).join('')}<td>${s.coins}</td></tr>`).join('')}</table></div>
      <p class="mute small">Percentages show each student's best score on that activity.</p>`;
  } else {
    const ranked = students.slice().sort((a, b) => b.coins - a.coins || a.name.localeCompare(b.name));
    inner = ranked.map((s, i) => `<div class="lb"><div class="rk">${['🥇', '🥈', '🥉'][i] || i + 1}</div><div class="nm">${esc(s.name)}</div><div>${s.coins} 🪙</div></div>`).join('') || '<div class="card mute">No students yet.</div>';
  }
  const html = `${standalone ? `<p><button class="linkbtn" data-act="backClass" data-id="${esc(d.cls.id)}">← ${esc(d.cls.name)}</button></p>` : ''}
    <div class="spread"><div><div class="row"><h1>${esc(hw.title)}</h1><span class="chip">${esc(hw.tier)}</span></div><div class="mute">${esc(hw.topic || '')}</div><div class="mute small">${hw.folder ? '📁 ' + esc(hw.folder) + ' · ' : ''}${hw.items.length} items · ${hw.exercises.length} activities</div></div>
    <div class="row"><button class="btn ghost sm" data-act="paperQ" data-id="${esc(hw.id)}">🖨 Paper quizzes</button><button class="btn ghost sm" data-act="editHw" data-id="${esc(hw.id)}">✏ Edit</button><button class="btn ghost sm" data-act="delHw" data-id="${esc(hw.id)}">🗑 Delete</button></div></div>
    <details class="card" style="margin-top:14px" open><summary style="cursor:pointer"><b>Words and sentences</b> <span class="chip">${hw.items.length}</span></summary><div class="scroll" style="max-height:420px;overflow:auto;margin-top:8px"><table><tr><th>#</th><th>French</th><th>English</th><th></th></tr>${hw.items.map((i, n) => `<tr><td class="mute">${n + 1}</td><td><b>${esc(i.fr)}</b></td><td>${esc(i.en)}</td><td>${i.s ? '<span class="chip">sentence</span>' : ''}</td></tr>`).join('')}</table></div></details>
    <div class="card" style="margin-top:14px"><div class="spread"><h3>Assignments</h3></div>${(d.assignments || []).length ? (d.assignments).map((a) => `<div class="spread" style="padding:8px 0;border-top:1px solid var(--line)"><div><b>${esc(a.class_name)}</b> <span class="chip">${esc(audLabel(a.audience))}</span> <span class="mute small">${a.size} students · ${esc(fmtDate(a.start_at))} → ${esc(fmtDate(a.due_at))}</span></div><div class="row"><button class="btn ghost sm" data-act="editAsg" data-id="${esc(a.id)}" data-s="${a.start_at}" data-d="${a.due_at || ''}">Dates</button><button class="btn ghost sm" data-act="rmAsg" data-id="${esc(a.id)}">Remove</button></div></div>`).join('') : '<p class="mute" style="margin:8px 0 0">Not assigned to anyone yet.</p>'}</div>
    <div class="tabs" style="margin-top:16px">${[['timings', 'Timings'], ['results', 'Results'], ['board', 'Leaderboard']].map(([k, l]) => `<button class="${T.htab === k ? 'on' : ''}" data-act="htab" data-k="${k}">${l}</button>`).join('')}</div>${inner}`;
  ACT.delHw = () => modal(`<h2>Delete this homework?</h2><p><b>${esc(hw.title)}</b> will be deleted from your library and from every class it is assigned to, with all results.</p><div class="foot"><button class="btn ghost" data-act="close">Keep it</button><button class="btn red" data-act="delHw2">Delete</button></div>`);
  ACT.delHw2 = async () => { await api('/homework/' + hw.id, 'DELETE'); closeModal(); go('#/t/library'); };
  return html;
}
ROUTES.push([/^\/t\/hw\/(\w+)$/, async (id) => {
  await loadClasses();
  const d = await api('/homework/' + id);
  shell(d.cls.id, hwHtml(d, true));
}]);
ACT.backClass = (t) => go('#/t/class/' + t.dataset.id);
ACT.editHw = (t) => go('#/t/hw/' + t.dataset.id + '/edit');
ACT.htab = (t) => { T.htab = t.dataset.k; route(); };


/* ---- assignments, library, timeline ---- */
function audLabel(a) { return { all: 'Whole class', students: 'Chosen students', ontime: 'On-time finishers', notontime: 'Late / unfinished' }[a] || 'Whole class'; }
function loc(ms) { return new Date(ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
let LIB = null, ASG = null;
ROUTES.push([/^\/t\/library(?:\?.*)?$/, async () => {
  await loadClasses();
  LIB = await api('/library');
  window.LIBF = LIB.homework.map((h) => h.folder);
  LIB.q = LIB.q || '';
  shell('lib', '<div id="libBody"></div>');
  drawLib();
}]);
function drawLib() {
  const q = (LIB.q || '').toLowerCase();
  const cm = /class=(\w+)/.exec(location.hash), cid = cm && cm[1], ccls = cid && (T.classes || []).find((c) => c.id === cid);
  const gotAll = (h) => ccls && h.assignments.some((a) => a.class_id === cid && a.audience === 'all');
  const hidden = ccls && !LIB.showAll ? LIB.homework.filter(gotAll).length : 0;
  const list = LIB.homework.filter((h) => !(ccls && !LIB.showAll && gotAll(h))).filter((h) => !q || (h.title + ' ' + (h.topic || '') + ' ' + (h.folder || '')).toLowerCase().includes(q));
  const groups = {};
  list.forEach((h) => { (groups[h.folder || 'Unfiled'] = groups[h.folder || 'Unfiled'] || []).push(h); });
  const names = Object.keys(groups).sort((a, b) => a === 'Unfiled' ? 1 : b === 'Unfiled' ? -1 : a.localeCompare(b));
  const row = (h) => `<div class="librow"><input type="checkbox" class="lck" value="${esc(h.id)}" ${LIB.sel && LIB.sel[h.id] ? 'checked' : ''}><div style="flex:1;min-width:0"><b>${esc(h.title)}</b> <span class="chip">${esc(h.tier)}</span><div class="mute small">${esc(h.topic || '')} · ${h.items} items · ${h.lessons} steps</div>
    ${h.assignments.length ? '<div class="mini">' + h.assignments.map((a) => `<span class="badge ${a.start_at > Date.now() ? 'n' : 'g'}" title="${esc(audLabel(a.audience))}">${esc(a.class_name)} · due ${esc(fmtShort(a.due_at))} · ${a.counts.complete}/${a.size}</span>`).join('') + '</div>' : ''}</div>
    <div class="row" style="flex:none"><button class="btn sm" data-act="assignOne" data-id="${esc(h.id)}">Assign</button><button class="btn ghost sm" data-act="openHw" data-id="${esc(h.id)}">Open</button><button class="btn ghost sm" data-act="editHw" data-id="${esc(h.id)}">Edit</button></div></div>`;
  $('#libBody').innerHTML = `<div class="spread"><div><h1>Homework library</h1><p class="sub">All your homework lives here. Pick one or several (a week's pack) and assign them to a class or to chosen students.</p></div><button class="btn" data-act="libNew">＋ New homework</button></div>
    ${ccls ? `<div class="card" style="margin-bottom:14px;background:#eef4ff"><b>Assigning to ${esc(ccls.name)}</b><div class="mute small">Homework this whole class already has is hidden${hidden ? ' (' + hidden + ' hidden)' : ''}. Press Assign on any homework, then choose the whole class or specific students.</div><label class="row" style="margin-top:6px"><input type="checkbox" id="libAll" ${LIB.showAll ? 'checked' : ''}> Show homework already assigned to this class</label></div>` : ''}
    <div class="row" style="margin-bottom:14px"><input id="libQ" type="text" placeholder="Search homework or folder" value="${esc(LIB.q || '')}" style="max-width:340px"><button class="btn ghost" data-act="assignSel">Assign ticked…</button><span class="mute small">${LIB.homework.length} homework</span></div>
    ${names.map((n) => `<details class="folder" ${q || !LIB.closed || !LIB.closed[n] ? 'open' : ''} data-f="${esc(n)}"><summary>📁 ${esc(n)} <span class="chip">${groups[n].length}</span></summary>${groups[n].map(row).join('')}</details>`).join('') || '<div class="card mute">No homework yet. Create one with “New homework”.</div>'}`;
  if ($('#libAll')) $('#libAll').addEventListener('change', (e) => { LIB.showAll = e.target.checked; drawLib(); });
  $('#libQ').addEventListener('input', (e) => { LIB.q = e.target.value; const p = e.target.selectionStart; drawLib(); const i = $('#libQ'); i.focus(); i.setSelectionRange(p, p); });
  document.querySelectorAll('.lck').forEach((c) => c.addEventListener('change', () => { LIB.sel = LIB.sel || {}; LIB.sel[c.value] = c.checked; }));
  document.querySelectorAll('details.folder').forEach((d) => d.addEventListener('toggle', () => { LIB.closed = LIB.closed || {}; LIB.closed[d.dataset.f] = !d.open; }));
}
function fmtShort(ms) { return ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'no date'; }
ACT.libNew = () => {
  if (!T.classes.length) return toast && toast('Create a class first');
  go('#/t/class/' + T.classes[0].id + '/new');
};
ACT.assignOne = (t) => openAssign([t.dataset.id]);
ACT.assignSel = () => {
  const ids = Object.keys(LIB.sel || {}).filter((k) => LIB.sel[k]);
  if (!ids.length) { modal('<h2>Tick some homework first</h2><p>Tick the boxes next to the homework you want to assign this week.</p><div class="foot"><button class="btn" data-act="close">OK</button></div>'); return; }
  openAssign(ids);
};
async function openAssign(ids) {
  if (!T.classes.length) { modal('<h2>Create a class first</h2><div class="foot"><button class="btn" data-act="close">OK</button></div>'); return; }
  if (!LIB) LIB = await api('/library');
  const m = /class=(\w+)/.exec(location.hash);
  ASG = { ids, cid: (m && m[1]) || T.classes[0].id };
  const start = new Date(); start.setSeconds(0, 0);
  const due = new Date(Date.now() + 7 * 86400000); due.setHours(9, 0, 0, 0);
  ASG.start = start.getTime(); ASG.due = due.getTime();
  const titles = ids.map((i) => (LIB.homework.find((h) => h.id === i) || {}).title).filter(Boolean);
  modal(`<h2>Assign homework</h2><p class="mute small" style="margin:0 0 8px">${titles.map(esc).join(' · ')}</p>
    <label class="f">Class</label><select id="asC">${T.classes.map((c) => `<option value="${esc(c.id)}" ${c.id === ASG.cid ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <label class="f">Who gets it?</label>
    <label class="row"><input type="radio" name="asW" value="all" checked> Whole class</label>
    <label class="row"><input type="radio" name="asW" value="ontime"> Students who finished a previous homework on time</label>
    <label class="row"><input type="radio" name="asW" value="notontime"> Students who did not finish it on time</label>
    <label class="row"><input type="radio" name="asW" value="students"> Choose students</label>
    <div id="asX"></div>
    <div class="row" style="align-items:flex-start;margin-top:6px"><div style="flex:1;min-width:170px"><label class="f">Starts</label><input id="asS" type="datetime-local" value="${loc(ASG.start)}"></div><div style="flex:1;min-width:170px"><label class="f">Due</label><input id="asD" type="datetime-local" value="${loc(ASG.due)}"></div></div>
    <div class="err" id="asE"></div><div class="foot"><button class="btn ghost" data-act="close">Cancel</button><button class="btn" data-act="assignGo">Assign</button></div>`, true);
  $('#asC').addEventListener('change', drawAsX);
  document.querySelectorAll('input[name=asW]').forEach((r) => r.addEventListener('change', drawAsX));
  drawAsX();
}
async function drawAsX() {
  const cid = $('#asC').value, w = document.querySelector('input[name=asW]:checked').value, box = $('#asX');
  if (w === 'all') { box.innerHTML = ''; return; }
  if (w === 'students') {
    box.innerHTML = '<div class="mute small">Loading…</div>';
    const o = await api('/classes/' + cid + '/overview');
    box.innerHTML = '<div class="card" style="max-height:200px;overflow:auto;padding:10px 14px;margin:8px 0">' + (o.students.map((s) => { const has = ASG.ids.length && ASG.ids.every((id) => (LIB.homework.find((h) => h.id === id) || { assignments: [] }).assignments.some((a) => a.class_id === cid && (a.student_ids || []).includes(s.id))); return `<label class="row"><input type="checkbox" class="asSt" value="${esc(s.id)}" ${has ? 'disabled' : ''}> ${esc(s.name)} ${has ? '<span class="chip">already has it</span>' : `<span class="mute small">${s.onTime}/${s.hwTotal} on time</span>`}</label>`; }).join('') || '<span class="mute">No students in this class.</span>') + '</div>';
    return;
  }
  const prev = LIB.homework.filter((h) => h.assignments.some((a) => a.class_id === cid));
  box.innerHTML = prev.length ? `<label class="f">Previous homework</label><select id="asP">${prev.map((h) => `<option value="${esc(h.id)}">${esc(h.title)}</option>`).join('')}</select>` : '<div class="mute small" style="margin:8px 0">Nothing has been assigned to this class yet, so there is no previous homework to compare.</div>';
}
ACT.assignGo = async () => {
  const w = document.querySelector('input[name=asW]:checked').value;
  const body = { class_id: $('#asC').value, homework_ids: ASG.ids, audience: w, start_at: new Date($('#asS').value).getTime(), due_at: $('#asD').value ? new Date($('#asD').value).getTime() : null };
  if (w === 'students') body.student_ids = [...document.querySelectorAll('.asSt:checked')].map((c) => c.value);
  if (w === 'ontime' || w === 'notontime') body.after_hw_id = ($('#asP') || {}).value;
  try {
    const r = await api('/assign', 'POST', body);
    closeModal(); LIB = null; if (LIB === null) route();
    toast && toast('Assigned to ' + r.students + ' student' + (r.students === 1 ? '' : 's'));
  } catch (e) { $('#asE').textContent = e.message; }
};
ACT.rmAsg = (t) => modal(`<h2>Remove this assignment?</h2><p>Students will no longer see it. The homework stays in your library.</p><div class="foot"><button class="btn ghost" data-act="close">Keep</button><button class="btn red" data-act="rmAsg2" data-id="${esc(t.dataset.id)}">Remove</button></div>`);
ACT.rmAsg2 = async (t) => { await api('/assignments/' + t.dataset.id, 'DELETE'); closeModal(); route(); };
ACT.editAsg = (t) => modal(`<h2>Change dates</h2><div class="row" style="align-items:flex-start"><div style="flex:1"><label class="f">Starts</label><input id="eS" type="datetime-local" value="${loc(+t.dataset.s)}"></div><div style="flex:1"><label class="f">Due</label><input id="eD" type="datetime-local" value="${t.dataset.d ? loc(+t.dataset.d) : ''}"></div></div><div class="err" id="eE"></div><div class="foot"><button class="btn ghost" data-act="close">Cancel</button><button class="btn" data-act="editAsg2" data-id="${esc(t.dataset.id)}">Save</button></div>`);
ACT.editAsg2 = async (t) => {
  try { await api('/assignments/' + t.dataset.id, 'PUT', { start_at: new Date($('#eS').value).getTime(), due_at: $('#eD').value ? new Date($('#eD').value).getTime() : null }); closeModal(); route(); }
  catch (e) { $('#eE').textContent = e.message; }
};

/* timeline */
const TL = { zoom: 56, off: 0 };
ROUTES.push([/^\/t\/timeline$/, async () => {
  await loadClasses();
  TL.d = await api('/timeline');
  shell('tl', '<div id="tlBody"></div>');
  drawTL();
}]);
function dayStart(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
function barColor(a) {
  const n = Date.now();
  if (a.start_at > n) return null;
  const t = Math.max(1, a.size), c = a.counts;
  if (c.complete >= t) return '#2fc08a';
  if (c.complete + c.progress === 0) return '#f2a0a6';
  const f = Math.min(1, (c.complete + c.progress * 0.4) / t);
  const mix = (x, y) => Math.round(x + (y - x) * f);
  return `rgb(${mix(250, 90)},${mix(210, 195)},${mix(110, 120)})`;
}
function drawTL() {
  const D = 86400000, today = dayStart(Date.now()), z = TL.zoom;
  const as = TL.d.assignments, open = as.filter((a) => a.start_at <= Date.now() && (!a.due_at || a.due_at >= Date.now())).length, sched = as.filter((a) => a.start_at > Date.now()).length;
  const from = today - 10 * D + TL.off * 7 * D, days = 56, to = from + days * D;
  const xOf = (ms) => (ms - from) / D * z;
  const hdr = Array.from({ length: days }, (_, i) => { const t = from + i * D, d = new Date(t); const first = d.getDay() === 1 || i === 0; return `<div class="tlday ${t === today ? 'today' : ''} ${d.getDay() === 0 || d.getDay() === 6 ? 'we' : ''}" style="left:${i * z}px;width:${z}px"><span>${d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}</span><b>${d.getDate()}</b></div>${first ? `<div class="tlwk" style="left:${i * z}px">${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>` : ''}`; }).join('');
  const rows = TL.d.classes.map((c) => {
    const mine = as.filter((a) => a.class_id === c.id && (a.due_at || a.start_at + 7 * D) >= from && a.start_at <= to).sort((a, b) => a.start_at - b.start_at);
    const lanes = [];
    const bars = mine.map((a) => {
      const end = a.due_at || a.start_at + 7 * D;
      let l = lanes.findIndex((e) => e <= a.start_at); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = end;
      const x = Math.max(0, xOf(a.start_at)), w = Math.max(30, xOf(end) - x), col = barColor(a);
      return `<div class="tlbar ${col ? '' : 'sch'}" style="left:${x}px;width:${w}px;top:${l * 34 + 6}px;${col ? 'background:' + col : ''}" data-act="openHw" data-id="${esc(a.id)}" title="${esc(a.title)} · ${esc(audLabel(a.audience))} · ${a.counts.complete}/${a.size} done"><span>${esc(a.title)}</span><b>${a.counts.complete}/${a.size}</b></div>`;
    }).join('');
    return `<div class="tlrow" style="height:${Math.max(1, lanes.length) * 34 + 12}px"><div class="tlname">${esc(c.name)}</div><div class="tltrack" style="width:${days * z}px">${bars}</div></div>`;
  }).join('');
  const tx = xOf(Date.now());
  $('#tlBody').innerHTML = `<div class="spread"><div><h1>Timeline</h1><p class="sub"><b>${open}</b> open now · <b>${sched}</b> scheduled</p></div><button class="btn" data-act="tLib">＋ Set homework</button></div>
    <div class="tlleg"><span><i style="background:#f2a0a6"></i>Nobody started</span><span><i style="background:linear-gradient(90deg,#f5d36e,#5ac378)"></i>In progress</span><span><i style="background:#2fc08a"></i>Everyone completed</span><span><i class="sch"></i>Scheduled</span>
      <span style="flex:1"></span><button class="btn ghost sm" data-act="tlPrev">‹</button><button class="btn ghost sm" data-act="tlToday">Today</button><button class="btn ghost sm" data-act="tlNext">›</button><button class="btn ghost sm" data-act="tlZ" data-d="-1">−</button><span class="mute small">${Math.round(z / 56 * 100)}%</span><button class="btn ghost sm" data-act="tlZ" data-d="1">＋</button></div>
    <div class="card tlwrap"><div class="tlscroll"><div class="tlhead"><div class="tlname"></div><div class="tltrack" style="width:${days * z}px;height:50px">${hdr}</div></div>${rows || '<div class="mute" style="padding:20px">No classes yet.</div>'}<div class="tlnow" style="left:${150 + tx}px"></div></div></div>`;
  const sc = document.querySelector('.tlscroll'); if (sc) sc.scrollLeft = Math.max(0, xOf(today) - 120);
}
ACT.tlPrev = () => { TL.off--; drawTL(); };
ACT.tlNext = () => { TL.off++; drawTL(); };
ACT.tlToday = () => { TL.off = 0; drawTL(); };
ACT.tlZ = (t) => { TL.zoom = Math.min(120, Math.max(28, TL.zoom + (+t.dataset.d) * 14)); drawTL(); };

/* notifications + paper quizzes */
ACT.notify = (t) => modal(`<h2>🔔 Send notification</h2><p class="mute small" style="margin:0 0 8px">Every student in this class sees your message at the top of their home screen for two weeks.</p><textarea id="nMsg" maxlength="300" style="min-height:90px" placeholder="e.g. Bonne semaine ! Please finish the Family vocab by Friday."></textarea><div class="err" id="nErr"></div><div class="foot"><button class="btn ghost" data-act="close">Cancel</button><button class="btn" data-act="notify2" data-id="${esc(t.dataset.id)}">Send</button></div>`);
ACT.notify2 = async (t) => {
  try { await api('/classes/' + t.dataset.id + '/notify', 'POST', { message: $('#nMsg').value }); closeModal(); toast('Notification sent'); }
  catch (e) { $('#nErr').textContent = e.message; }
};
ACT.paperQ = async (t) => {
  const d = await api('/homework/' + t.dataset.id);
  PQ = d.hw;
  modal(`<h2>🖨 Paper quiz</h2><p class="mute small" style="margin:0 0 8px">${esc(PQ.title)} · ${PQ.items.length} items</p>
    <label class="f">Type</label><select id="pqT"><option value="fr">Translate French → English</option><option value="en">Translate English → French</option><option value="mix">Mixed</option></select>
    <label class="f">Number of questions</label><input id="pqN" type="text" value="${Math.min(20, PQ.items.length)}">
    <label class="row" style="margin-top:12px"><input type="checkbox" id="pqK" checked> Include answer key on a separate page</label>
    <div class="foot"><button class="btn ghost" data-act="close">Cancel</button><button class="btn" data-act="pqGo">Print</button></div>`);
};
let PQ = null;
ACT.pqGo = () => {
  const n = Math.max(1, Math.min(PQ.items.length, parseInt($('#pqN').value, 10) || 10)), ty = $('#pqT').value, key = $('#pqK').checked;
  const its = PQ.items.slice().sort(() => Math.random() - 0.5).slice(0, n).map((i, k) => ({ ...i, dir: ty === 'mix' ? (k % 2 ? 'en' : 'fr') : ty }));
  const q = its.map((i, k) => `<div class="q">${k + 1}. <b>${esc(i.dir === 'fr' ? i.fr : i.en)}</b> &nbsp; ________________________________</div>`).join('');
  const a = its.map((i, k) => `<div class="q">${k + 1}. ${esc(i.dir === 'fr' ? i.fr : i.en)} → <b>${esc(i.dir === 'fr' ? i.en : i.fr)}</b></div>`).join('');
  closeModal();
  printHTML(`<div class="pq" style="font-family:sans-serif;padding:24px"><h2>${esc(PQ.title)}</h2><p>Name: ______________________ &nbsp; Date: ____________ &nbsp; Score: ____ / ${n}</p>${q}${key ? '<div class="pb"><h2>Answer key</h2>' + a + '</div>' : ''}</div>`);
};

/* ---- practice results (teacher) ---- */
let PR = null;
const GAME_LBL = { vocab: 'Vocab', sent: 'Sentence', verb: 'Verb', gram: 'Grammar', listen: 'Listening', dict: 'Dictation', work: 'Workout', box: 'Boxing', abox: 'Audio boxing', climb: 'Climbing' };
const LEVEL_LBL = { primary: 'Primary', beginner: 'Beginner', preint: 'Pre-int.', inter: 'Intermediate', higher: 'Higher', tri1: 'Trilogy 1', tri2: 'Trilogy 2', tri3: 'Trilogy 3', advanced: 'Advanced', aqa: 'AQA GCSE', igcse: 'IGCSE', pearson: 'Pearson GCSE' };
ROUTES.push([/^\/t\/practice$/, async () => {
  await loadClasses();
  const d = await api('/teacher/practice');
  PR = { classes: d.classes, students: d.students, cls: (PR && PR.cls) || '', open: null };
  shell('pres', '<div id="prBody"></div>');
  drawPR();
}]);
const agoTxt = (ts) => { if (!ts) return 'never'; const m = Math.round((Date.now() - ts) / 60000); return m < 2 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
function drawPR() {
  const list = PR.students.filter((s) => !PR.cls || s.class_id === PR.cls);
  const sel = `<select id="prCls" style="max-width:260px"><option value="">All classes</option>${PR.classes.map((c) => `<option value="${esc(c.id)}" ${PR.cls === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`;
  const cname = (id) => (PR.classes.find((c) => c.id === id) || {}).name || '';
  let rows = list.map((s) => `<tr data-act="prOpen" data-id="${esc(s.id)}" style="cursor:pointer"><td><b>${esc(s.name)}</b><div class="mute small">${esc(cname(s.class_id))}</div></td><td>${s.sessions}</td><td>${s.pct == null ? '–' : `<span class="badge ${s.pct >= 80 ? 'g' : ''}">${s.pct}%</span>`}</td><td>${Math.round(s.secs / 60)} min</td><td>${Object.entries(s.games).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g, n]) => esc(GAME_LBL[g] || g) + ' ×' + n).join(', ') || '–'}</td><td>${agoTxt(s.last)}</td></tr>`).join('');
  const tot = list.reduce((n, s) => n + s.sessions, 0), active = list.filter((s) => s.sessions).length;
  let detail = '';
  if (PR.open) {
    const s = PR.students.find((x) => x.id === PR.open);
    if (s) detail = `<div class="card" style="margin-top:16px"><div class="spread"><h3 style="margin:0">${esc(s.name)} · recent practice</h3><button class="btn ghost" data-act="prClose">Close</button></div>` + (s.recent.length ? `<div style="overflow:auto"><table class="tbl" style="width:100%"><tr><th>When</th><th>Game</th><th>Level</th><th>Lessons</th><th>Score</th><th>Time</th></tr>${s.recent.map((r) => { const g = String(r.game).split('·'); const pc = Math.round(r.score / r.total * 100); return `<tr><td>${agoTxt(r.ts)}</td><td>${esc(GAME_LBL[g[0]] || g[0])}${g[1] ? ' <span class="chip">' + esc(g[1]) + '</span>' : ''}</td><td>${esc(LEVEL_LBL[r.level] || r.level)}</td><td class="small">${r.lessons.map(esc).join('<br>')}</td><td><span class="badge ${pc >= 80 ? 'g' : ''}">${r.score}/${r.total} · ${pc}%</span></td><td>${Math.floor(r.secs / 60)}:${String(r.secs % 60).padStart(2, '0')}</td></tr>`; }).join('')}</table></div>` : '<p class="mute">No practice yet.</p>') + '</div>';
  }
  $('#prBody').innerHTML = `<div class="spread" style="margin-bottom:14px;flex-wrap:wrap;gap:10px"><div><h1 style="margin:0">Practice results</h1><div class="mute">${tot} practice session${tot === 1 ? '' : 's'} · ${active} of ${list.length} student${list.length === 1 ? '' : 's'} active</div></div>${sel}</div>` +
    (list.length ? `<div class="card" style="overflow:auto"><table class="tbl" style="width:100%"><tr><th>Student</th><th>Sessions</th><th>Accuracy</th><th>Time</th><th>Favourite games</th><th>Last practice</th></tr>${rows}</table></div>` : '<div class="card mute">No students yet.</div>') + detail;
  const c = $('#prCls'); if (c) c.addEventListener('change', (e) => { PR.cls = e.target.value; PR.open = null; drawPR(); });
}
ACT.prOpen = (t) => { PR.open = t.dataset.id; drawPR(); };
ACT.prClose = () => { PR.open = null; drawPR(); };
