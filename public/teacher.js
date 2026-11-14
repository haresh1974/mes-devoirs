/* Teacher area */
const T = { classes: [], name: '', tab: 'hw', htab: 'timings' };
async function loadClasses() {
  const d = await api('/classes');
  T.classes = d.classes; T.name = d.teacher.name; VOICE.cloud = !!d.tts;
}
function shell(active, content) {
  const cls = T.classes.map((c) => `<button class="nav ${active === c.id ? 'on' : ''}" data-act="openClass" data-id="${esc(c.id)}"><span>${(LANG[c.language] || LANG.French).flag}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</span></button>`).join('');
  $('#app').innerHTML = `<button class="menubtn" data-act="menu">☰</button><div class="shell">
    <aside class="side" id="side">
      <div class="logo">🥖 Mon Devoir <small>teachers</small></div>
      <button class="nav ${active === 'home' ? 'on' : ''}" data-act="tHome">🏠 Home</button>
      <button class="nav ${active === 'help' ? 'on' : ''}" data-act="tHelp">❓ Help</button>
      <div class="sidehead">CLASSES</div>
      <div class="grow">${cls}<button class="nav" style="color:var(--blue)" data-act="newClass">＋ Create class</button></div>
      <div class="userbox"><div class="avatar">${esc((T.name || '?')[0].toUpperCase())}</div><div style="flex:1;min-width:0"><b>${esc(T.name)}</b></div><button class="icon-btn" title="Sign out" data-act="logout">↪</button></div>
    </aside><main class="main">${content}</main></div>`;
}
ACT.voiceTest = () => voiceModal('fr-FR');
ACT.menu = () => $('#side').classList.toggle('open');
ACT.tHome = () => go('#/t');
ACT.tHelp = () => go('#/t/help');
ACT.openClass = (t) => go('#/t/class/' + t.dataset.id);

/* ---- home ---- */
ROUTES.push([/^\/t$/, async () => {
  await loadClasses();
  const ov = await Promise.all(T.classes.map((c) => api('/classes/' + c.id + '/overview')));
  const hasClass = T.classes.length > 0, hasStud = ov.some((o) => o.students.length), hasHw = ov.some((o) => o.homework.length);
  let shared = false; try { shared = localStorage.getItem('md_shared') === '1'; } catch (e) {}
  const steps = [
    ['Create your first class', 'Your class gets a code and a home in the sidebar.', hasClass, hasClass ? '' : '<button class="btn sm" data-act="newClass">Create class</button>'],
    ['Add your students', 'Paste or type names and get a PIN for each child.', hasStud, hasClass && !hasStud ? '<button class="btn sm" data-act="firstClass">Add students</button>' : ''],
    ['Set your first homework', 'Paste or upload a vocab list. The exercises build themselves.', hasHw, hasStud && !hasHw ? '<button class="btn sm" data-act="firstClass">Set homework</button>' : ''],
    ['Get students onto the website', 'Share the link, class code and PINs.', shared, '<label class="row small" style="font-weight:800;gap:6px"><input type="checkbox" id="sharedChk" ' + (shared ? 'checked' : '') + '> Done</label>']
  ];
  const n = steps.filter((s) => s[2]).length;
  shell('home', `<h1>Welcome back</h1><p class="sub">Pick a class in the sidebar to see how your students are doing.</p>
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
    <ol style="line-height:1.9;padding-left:20px"><li>Open <b>${esc(url)}</b> on a phone, tablet or computer.</li><li>Tap <b>I'm a student</b>.</li><li>Type your <b>class code</b> and your <b>PIN</b>.</li><li>Open your homework and choose any activity. Earn coins and climb the leaderboard.</li></ol>
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
  if (c.step === 1) body = `<p class="mute">Which tiers does this class cover?</p>${['Foundation', 'Higher'].map((t) => `<button class="choice ${c.tiers.includes(t) ? 'on' : ''}" data-act="ccTier" data-v="${t}"><b>${t}</b></button>`).join('')}`;
  if (c.step === 2) {
    if (!c.code) { try { c.code = (await api('/classes/suggest-code')).code; } catch (e) {} }
    body = `<p class="mute">Students use this code with their PIN to sign in.</p><label class="f">Class code</label><div class="row"><input id="ccc" type="text" maxlength="8" value="${esc(c.code)}" style="flex:1;letter-spacing:6px;font-weight:800;font-size:22px;text-transform:uppercase"><button class="btn ghost sm" data-act="ccNew">New code</button></div>`;
  }
  if (c.step === 3) body = `<div class="pbox"><b>${esc(c.name)}</b><br>${LANG[c.language].flag} ${c.language} · ${c.tiers.join(' and ')}<br>Class code: <b style="letter-spacing:3px">${esc(c.code)}</b></div>`;
  const m = modalEl ? modalEl.firstChild : modal('');
  m.innerHTML = `<h2>Create a class</h2>${bar}${body}<div class="err">${esc(c.err)}</div>
    <div class="foot"><button class="btn ghost" data-act="${c.step ? 'ccBack' : 'close'}">${c.step ? '← Back' : 'Cancel'}</button><button class="btn" data-act="ccNext">${c.step === 3 ? 'Create class' : 'Next →'}</button></div>`;
  const n = $('#ccn'); if (n) n.focus();
}
ACT.ccLang = (t) => { CC.name = $('#ccn').value; CC.language = t.dataset.v; renderCC(); };
ACT.ccTier = (t) => { const v = t.dataset.v, i = CC.tiers.indexOf(v); if (i >= 0) CC.tiers.splice(i, 1); else CC.tiers.push(v); renderCC(); };
ACT.ccNew = async () => { CC.code = (await api('/classes/suggest-code')).code; renderCC(); };
ACT.ccBack = () => { CC.err = ''; CC.step--; renderCC(); };
ACT.ccNext = async () => {
  const c = CC; c.err = '';
  if (c.step === 0) { c.name = $('#ccn').value.trim(); if (!c.name) { c.err = 'Give the class a name.'; return renderCC(); } }
  if (c.step === 1 && !c.tiers.length) { c.err = 'Pick at least one tier.'; return renderCC(); }
  if (c.step === 2) { c.code = $('#ccc').value.toUpperCase().trim(); if (!/^[A-Z]{4,8}$/.test(c.code)) { c.err = 'Use 4 to 8 letters.'; return renderCC(); } }
  if (c.step === 3) {
    try { const r = await api('/classes', 'POST', { name: c.name, language: c.language, tiers: c.tiers, code: c.code }); closeModal(); go('#/t/class/' + r.id); }
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
    inner = `<div class="spread" style="margin-bottom:14px"><h3>Homework</h3><button class="btn" data-act="newHw">＋ New homework</button></div>` +
      (o.homework.length ? o.homework.map((h) => `<div class="hwcard" data-act="openHw" data-id="${esc(h.id)}"><div><b style="font-size:17px">${esc(h.title)}</b><div class="mute small">${esc(h.topic || '')}</div>
        <div class="mini"><span class="chip">${esc(h.tier)}</span><span class="badge g">${h.counts.complete} complete</span><span class="badge a">${h.counts.progress} in progress</span><span class="badge n">${h.counts.new} not started</span></div></div><div style="text-align:right" class="small mute">Due<br><b style="color:var(--ink)">${esc(fmtDate(h.due_at))}</b></div></div>`).join('')
        : '<div class="card mute">No homework yet. Create one by pasting or uploading a vocab list.</div>');
  } else {
    inner = `<div class="spread" style="margin-bottom:14px"><h3>Students</h3><div class="row"><button class="btn ghost" data-act="showPins">🔑 Student PINs</button><button class="btn" data-act="addStudents">＋ Add students</button></div></div>` +
      (o.students.length ? `<div class="card scroll" style="padding:6px 14px"><table><tr><th>Student</th><th>Time on app</th><th>Today</th><th>Yesterday</th><th>Last active</th><th>Done on time</th><th></th></tr>${o.students.map((s) => `<tr><td><b>${esc(s.name)}</b></td><td>${fmtDur(s.secsTotal)}</td><td>${fmtDur(s.secsToday)}</td><td>${fmtDur(s.secsYesterday)}</td><td>${esc(ago(s.lastActive))}</td><td>${s.onTime} / ${s.hwTotal}</td><td style="text-align:right;white-space:nowrap"><button class="btn ghost sm" data-act="newPin" data-id="${esc(s.id)}">New PIN</button> <button class="btn ghost sm" data-act="rmStudent" data-id="${esc(s.id)}">Remove</button></td></tr>`).join('')}</table></div>`
        : '<div class="card mute">No students yet. Add your class list to get a PIN for each child.</div>');
  }
  shell(c.id, `<div class="spread"><div class="row"><span style="font-size:34px">${flag}</span><h1>${esc(c.name)}</h1><span class="mute">${o.students.length} students</span></div>
    <div class="row"><div class="codechip"><span class="mute small" style="font-weight:800">CLASS CODE</span><b>${esc(c.code)}</b><button class="icon-btn" style="width:32px;height:32px" data-act="copyCode" title="Copy">⧉</button></div><button class="btn ghost" data-act="classSettings">⚙ Class settings</button></div></div>
    <div class="tabs" style="margin-top:18px"><button class="${T.tab === 'hw' ? 'on' : ''}" data-act="tabHw">📝 Homework ${o.homework.length}</button><button class="${T.tab === 'st' ? 'on' : ''}" data-act="tabSt">👥 Students ${o.students.length}</button></div>${inner}`);
}]);
ACT.tabHw = () => { T.tab = 'hw'; route(); };
ACT.tabSt = () => { T.tab = 'st'; route(); };
ACT.copyCode = () => copyText(CLS.cls.code);
ACT.openHw = (t) => go('#/t/hw/' + t.dataset.id);
ACT.newHw = () => go('#/t/class/' + CLS.cls.id + '/new');
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
ACT.copyPins = () => copyText('Student\tPIN\n' + PINLIST.map((s) => s.name + '\t' + s.pin).join('\n'));
ACT.paperCards = () => {
  printHTML('<div class="pcards">' + PINLIST.map((s) => `<div class="pcardp"><b>Mon Devoir</b><br>${esc(s.name)}<br>Website: ${esc(location.origin)}<br>Class code: <b>${esc(CLS.cls.code)}</b><br>PIN:<div class="big">${esc(s.pin)}</div></div>`).join('') + '</div>');
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
  try { const r = await api('/classes/' + CLS.cls.id + '/students', 'POST', { names }); AS.list = r.students; PINLIST = r.students; AS.step = 1; renderAS(); }
  catch (e) { AS.err = e.message; renderAS(); }
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
  const dt = init.due_at ? new Date(init.due_at - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  $('.main').innerHTML = `<p><button class="linkbtn" data-act="hwBack">← Back</button></p><h1>${esc(submitLabel)}</h1><p class="sub">Add your vocab, verbs and grammar, then choose which exercises children can use.</p>
    <div class="card"><label class="f" style="margin-top:0">Title</label><input id="hTitle" type="text" maxlength="80" placeholder="e.g. Comment je faisais la fête" value="${esc(init.title)}">
      <label class="f">Topic or learning goal</label><input id="hTopic" type="text" maxlength="120" placeholder="e.g. Form basic sentences, greet people" value="${esc(init.topic)}">
      <div class="row" style="align-items:flex-start"><div style="flex:1;min-width:180px"><label class="f">Tier</label><select id="hTier">${tiers.map((t) => `<option ${t === init.tier ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div style="flex:1;min-width:220px"><label class="f">Due date and time</label><input id="hDue" type="datetime-local" value="${dt}"></div></div></div>
    <div class="card"><h3>1. Vocabulary</h3><p class="mute small" style="margin:4px 0 8px">One item per line, French first then English. Words and sentences can be mixed. A line of 4+ words, or ending in . ! ?, counts as a sentence.</p>
      <textarea id="hItems" style="min-height:190px" placeholder="le voisin = neighbour&#10;la tante, aunt&#10;Ma tante habitait loin = My aunt lived far away">${esc(init.text)}</textarea>
      <div class="row" style="margin-top:10px"><label class="btn ghost sm" style="cursor:pointer">📄 Upload a file<input id="hFile" type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" style="display:none"></label><button class="btn ghost sm" data-act="template">⬇ Download template</button><button class="btn ghost sm" data-act="hwSample">🔊 Hear it</button><span class="mute small">CSV, TXT or Excel</span></div></div>
    <div class="card"><h3>2. Verbs <span class="mute small" style="font-weight:600">(optional)</span></h3><p class="mute small" style="margin:4px 0 8px">One verb per line: <b>infinitive | English | tense | the 6 forms</b> for je, tu, il/elle, nous, vous, ils/elles.</p>
      <textarea id="hVerbs" style="min-height:100px" placeholder="${esc(VERB_EX)}">${esc(init.verbs)}</textarea><div class="row" style="margin-top:8px"><button class="btn ghost sm" data-act="addEx" data-k="verbs">Add examples</button></div></div>
    <div class="card"><h3>3. Grammar questions <span class="mute small" style="font-weight:600">(optional)</span></h3><p class="mute small" style="margin:4px 0 8px">One per line: <b>sentence with ___ | correct answer | wrong options (comma separated) | hint</b>. Wrong options and hint are optional. With wrong options children can choose, without them they type.</p>
      <textarea id="hGram" style="min-height:100px" placeholder="${esc(GRAM_EX)}">${esc(init.gram)}</textarea><div class="row" style="margin-top:8px"><button class="btn ghost sm" data-act="addEx" data-k="gram">Add examples</button></div></div>
    <div class="pbox" id="hPrev"></div>
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
  const dueV = $('#hDue').value;
  const body = { title: $('#hTitle').value, topic: $('#hTopic').value, tier: $('#hTier').value, due_at: dueV ? new Date(dueV).getTime() : null, free_order: $('#hFree').checked, exercises: ex,
    items: C.items.map((i) => ({ fr: i.fr, en: i.en })), verbs: C.verbs, grammar: C.grammar };
  try {
    if (HF.id) { await api('/homework/' + HF.id, 'PUT', body); go('#/t/hw/' + HF.id); }
    else { const r = await api('/classes/' + HF.cid + '/homework', 'POST', body); go('#/t/hw/' + r.id); }
  } catch (e) { $('#hErr').textContent = e.message; window.scrollTo(0, document.body.scrollHeight); }
};
ROUTES.push([/^\/t\/class\/(\w+)\/new$/, async (cid) => {
  await loadClasses();
  CLS = await api('/classes/' + cid + '/overview');
  shell(cid, '');
  const d = new Date(Date.now() + 7 * 86400000); d.setHours(9, 0, 0, 0);
  hwForm({ cid, title: '', topic: '', tier: CLS.cls.tiers[0], due_at: d.getTime(), text: '', verbs: '', gram: '', free_order: 1, ex: null }, '#/t/class/' + cid, 'Create homework');
}]);
ROUTES.push([/^\/t\/hw\/(\w+)\/edit$/, async (id) => {
  await loadClasses();
  const d = await api('/homework/' + id);
  CLS = await api('/classes/' + d.cls.id + '/overview');
  shell(d.cls.id, '');
  const x = d.hw.extra || {};
  hwForm({ id, title: d.hw.title, topic: d.hw.topic, tier: d.hw.tier, due_at: d.hw.due_at, text: d.hw.items.map((i) => i.fr + ' = ' + i.en).join('\n'),
    verbs: (x.verbs || []).map((v) => [v.inf, v.en, v.tense, v.forms.join(', ')].join(' | ')).join('\n'),
    gram: (x.grammar || []).map((g) => [g.s, g.a, (g.o || []).join(', '), g.h || ''].join(' | ').replace(/( \| )+$/, '')).join('\n'),
    free_order: d.hw.free_order, ex: d.hw.exercises }, '#/t/hw/' + id, 'Save changes');
}]);

/* ---- homework detail ---- */
ROUTES.push([/^\/t\/hw\/(\w+)$/, async (id) => {
  await loadClasses();
  const d = await api('/homework/' + id);
  const { hw, students, days } = d;
  let inner = '';
  if (T.htab === 'timings') {
    const cs = Math.max(1, d.classSize);
    inner = `<div class="card"><div class="spread"><div><h3>Pupils logged on each day</h3><div class="mute small">Each notch is one pupil. Filled notches pack to the left.</div></div>
      <div class="row" style="gap:26px"><div style="text-align:right"><div class="bigstat">${d.loggedAny}/${d.classSize}</div><div class="mute small">logged on at all</div></div></div></div>
      <div class="daychart" style="margin-top:14px">${days.map((x) => `<div class="r"><div class="d">${esc(new Date(x.day + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }))}</div><div class="notches">${Array.from({ length: cs }, (_, i) => '<i class="' + (i < x.n ? 'on' : '') + '"></i>').join('')}</div></div>`).join('')}</div></div>
      <div class="kan">${[['new', 'Not started', 'c0'], ['progress', 'In progress', 'c1'], ['complete', 'Complete', 'c2']].map(([k, lbl, cl]) => {
        const g = students.filter((s) => s.status === k);
        return `<div class="col ${cl}"><h4>${lbl}<span class="chip">${g.length}</span></h4>${g.length ? g.map((s) => `<div class="scard"><div><b>${esc(s.name)}</b><div class="mute small">${s.coins} coins · ${fmtDur(s.secs)}</div></div><div class="ring" style="--p:${Math.round(s.done / Math.max(1, hw.exercises.length) * 100)}%"><span>${s.done}</span></div></div>`).join('') : '<div class="mute small" style="text-align:center;padding:14px">No pupils here</div>'}</div>`;
      }).join('')}</div>`;
  } else if (T.htab === 'results') {
    inner = `<div class="card scroll" style="padding:6px 14px"><table><tr><th>Student</th>${hw.exercises.map((k) => '<th>' + EXERCISES[k].name + '</th>').join('')}<th>Coins</th></tr>${students.map((s) => `<tr><td><b>${esc(s.name)}</b></td>${hw.exercises.map((k) => { const b = s.best[k]; return '<td>' + (b ? Math.round(b.score / b.total * 100) + '%' : '<span class="mute">–</span>') + '</td>'; }).join('')}<td>${s.coins}</td></tr>`).join('')}</table></div>
      <p class="mute small">Percentages show each student's best score on that activity.</p>`;
  } else {
    const ranked = students.slice().sort((a, b) => b.coins - a.coins || a.name.localeCompare(b.name));
    inner = ranked.map((s, i) => `<div class="lb"><div class="rk">${['🥇', '🥈', '🥉'][i] || i + 1}</div><div class="nm">${esc(s.name)}</div><div>${s.coins} 🪙</div></div>`).join('') || '<div class="card mute">No students yet.</div>';
  }
  shell(d.cls.id, `<p><button class="linkbtn" data-act="backClass" data-id="${esc(d.cls.id)}">← ${esc(d.cls.name)}</button></p>
    <div class="spread"><div><div class="row"><h1>${esc(hw.title)}</h1><span class="chip">${esc(hw.tier)}</span></div><div class="mute">${esc(hw.topic || '')}</div><div class="mute small">Set ${esc(fmtDate(hw.created))} → due ${esc(fmtDate(hw.due_at))} · ${hw.items.length} items · ${hw.exercises.length} activities</div></div>
    <div class="row"><button class="btn ghost sm" data-act="editHw" data-id="${esc(hw.id)}">✏ Edit</button><button class="btn ghost sm" data-act="delHw" data-id="${esc(hw.id)}">🗑 Delete</button></div></div>
    <div class="tabs" style="margin-top:16px">${[['timings', 'Timings'], ['results', 'Results'], ['board', 'Leaderboard']].map(([k, l]) => `<button class="${T.htab === k ? 'on' : ''}" data-act="htab" data-k="${k}">${l}</button>`).join('')}</div>${inner}`);
  ACT.delHw = () => modal(`<h2>Delete this homework?</h2><p>All results for <b>${esc(hw.title)}</b> will be removed.</p><div class="foot"><button class="btn ghost" data-act="close">Keep it</button><button class="btn red" data-act="delHw2">Delete</button></div>`);
  ACT.delHw2 = async () => { await api('/homework/' + hw.id, 'DELETE'); closeModal(); go('#/t/class/' + d.cls.id); };
}]);
ACT.backClass = (t) => go('#/t/class/' + t.dataset.id);
ACT.editHw = (t) => go('#/t/hw/' + t.dataset.id + '/edit');
ACT.htab = (t) => { T.htab = t.dataset.k; route(); };
