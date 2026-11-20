/* Class tests: teachers assign online tests to a class and see marks; students only see what their class has been given */
const TS = { data: null };
const fmtMark = (n) => { if (n == null) return '–'; const w = Math.floor(n + 1e-9); return n % 1 ? (w ? w : '') + '½' : String(w); };

/* tests can sit in a folder (and a sub-folder): group them under headings */
const grpHtml = (items, card) => {
  const keys = []; const m = {};
  items.forEach((t) => { const k = (t.folder || '') + '\u0001' + (t.sub || ''); if (!m[k]) { m[k] = []; keys.push(k); } m[k].push(t); });
  keys.sort((a, b) => (a.startsWith('\u0001') ? 0 : 1) - (b.startsWith('\u0001') ? 0 : 1));
  let lastF = null;
  return keys.map((k) => {
    const [f, sb] = k.split('\u0001');
    let h = '';
    if (f && f !== lastF) h += `<div class="sidehead" style="margin:18px 0 6px 2px">📁 ${esc(f)}</div>`;
    lastF = f;
    if (sb) h += `<div class="small" style="margin:6px 0 8px 14px;font-weight:800;color:var(--navy,#1b2a4a)">📂 ${esc(sb)}</div>`;
    return h + `<div${f ? ' style="margin-left:12px"' : ''}>${m[k].map(card).join('')}</div>`;
  }).join('');
};

/* ---------- teacher: list + assign ---------- */
ROUTES.push([/^\/t\/tests$/, async () => {
  await loadClasses();
  const d = TS.data = await api('/tests');
  const tests = grpHtml(d.tests, (t) => `<div class="card" style="margin:0 0 12px">
      <div class="spread"><h3 style="margin:0">${esc(t.title)}</h3><span class="chip">${t.kind === 'guided' ? '📘 Guided paper · ' : ''}${t.marks} marks</span></div>
      <p class="mute" style="margin:6px 0 12px">${esc(t.desc)}</p>
      <div class="row"><a class="btn ghost sm" href="/tests/preview/${esc(t.id)}" target="_blank" rel="noopener" style="text-decoration:none">👁 Preview</a><button class="btn sm" data-act="tAssign" data-id="${esc(t.id)}">Assign to a class</button></div></div>`);
  const asg = grpHtml(d.assignments, (a) => {
    const now = Date.now(), state = a.start_at > now ? '<span class="chip">Scheduled</span>' : (a.due_at && a.due_at < now ? '<span class="chip">Closed</span>' : '<span class="badge g">Open</span>');
    return `<div class="card" style="margin:0 0 12px">
      <div class="spread"><div><b style="font-size:17px">${esc(a.title)}</b><div class="mute small">${esc(a.class_name)} · Opens ${esc(fmtDate(a.start_at))} · ${a.due_at ? 'Closes ' + esc(fmtDate(a.due_at)) : 'No closing time'}</div></div>${state}</div>
      <div class="small" style="margin:8px 0;font-weight:800">${a.kind === 'guided' ? `Answers shown to ${a.released} of ${a.students} students` : `${a.done} of ${a.students} finished${a.started > a.done ? ` · ${a.started - a.done} in progress` : ''}${a.avg != null ? ` · class average ${fmtMark(a.avg)} / ${a.marks}` : ''} · ${a.lock_on ? '🔒 tab-lock on (' + a.max_leaves + ' leaves)' : 'tab-lock off'}`}</div>
      <div class="row"><button class="btn sm" data-act="tResults" data-id="${esc(a.id)}">${a.kind === 'guided' ? '🔑 Students and answers' : '📊 Results'}</button><button class="btn ghost sm" data-act="tEditAsg" data-id="${esc(a.id)}" data-s="${a.start_at}" data-d="${a.due_at || ''}" data-l="${a.lock_on ? 1 : 0}" data-m="${a.max_leaves}">Change times</button><button class="btn ghost sm" data-act="tRmAsg" data-id="${esc(a.id)}">Remove</button></div></div>`;
  });
  shell('tests', `<h1 style="margin:0 0 4px">📝 Class tests</h1>
    <p class="mute" style="margin:0 0 18px">Students only see a test once you assign it to their class. They sit it once, see their marks straight away, then correct their mistakes in the Fix-it round. You see every mark here.</p>
    <div class="sidehead" style="margin-left:2px">TESTS</div>${tests || '<div class="card mute">No tests yet.</div>'}
    <div class="sidehead" style="margin:18px 0 6px 2px">ASSIGNED TO CLASSES</div>${asg || '<div class="card mute" style="text-align:center">Nothing assigned yet. Press “Assign to a class” on a test.</div>'}`);
}]);

ACT.tAssign = (t) => {
  const d = TS.data, test = d.tests.find((x) => x.id === t.dataset.id);
  if (!d.classes.length) { modal('<h2>Create a class first</h2><p>Tests are assigned to a class, so create one (and add its students) first.</p><div class="foot"><button class="btn" data-act="close">OK</button></div>'); return; }
  const start = new Date(); start.setSeconds(0, 0);
  modal(`<h2>Assign “${esc(test.title)}”</h2>
    <label class="f">Which classes? <span class="mute small">(only these classes will ever see it)</span></label>
    ${d.classes.map((c) => `<label class="row"><input type="checkbox" class="tAc" value="${esc(c.id)}"> ${esc(c.name)}</label>`).join('')}
    <div class="row" style="align-items:flex-start;margin-top:8px"><div style="flex:1;min-width:170px"><label class="f">Opens</label><input id="tS" type="datetime-local" value="${loc(start.getTime())}"></div><div style="flex:1;min-width:170px"><label class="f">Closes <span class="mute small">(optional)</span></label><input id="tD" type="datetime-local"></div></div>
    <label class="row" style="margin-top:10px"><input type="checkbox" id="tL" checked> 🔒 Tab-lock: warn when a student leaves the test page, and submit it automatically after</label>
    <div class="row"><select id="tM" style="width:auto">${[2, 3, 4, 5].map((n) => `<option value="${n}" ${n === 3 ? 'selected' : ''}>${n}</option>`).join('')}</select> <span class="mute small">times</span></div>
    <div class="err" id="tE"></div><div class="foot"><button class="btn ghost" data-act="close">Cancel</button><button class="btn" data-act="tAssignGo" data-id="${esc(test.id)}">Assign</button></div>`, true);
};
ACT.tAssignGo = async (t) => {
  const ids = [...document.querySelectorAll('.tAc:checked')].map((c) => c.value);
  try {
    const r = await api('/tests/assign', 'POST', { test_id: t.dataset.id, class_ids: ids, start_at: new Date($('#tS').value).getTime(), due_at: $('#tD').value ? new Date($('#tD').value).getTime() : null, lock_on: $('#tL').checked, max_leaves: +$('#tM').value });
    closeModal(); toast('Assigned to ' + r.made + ' class' + (r.made === 1 ? '' : 'es') + (r.skipped.length ? ' (already had it: ' + r.skipped.join(', ') + ')' : '')); route();
  } catch (e) { $('#tE').textContent = e.message; }
};
ACT.tEditAsg = (t) => modal(`<h2>Change times and tab-lock</h2>
  <div class="row" style="align-items:flex-start"><div style="flex:1;min-width:170px"><label class="f">Opens</label><input id="eS" type="datetime-local" value="${loc(+t.dataset.s)}"></div><div style="flex:1;min-width:170px"><label class="f">Closes</label><input id="eD" type="datetime-local" value="${t.dataset.d ? loc(+t.dataset.d) : ''}"></div></div>
  <label class="row" style="margin-top:10px"><input type="checkbox" id="eL" ${t.dataset.l === '1' ? 'checked' : ''}> 🔒 Tab-lock</label>
  <div class="row"><select id="eM" style="width:auto">${[2, 3, 4, 5].map((n) => `<option value="${n}" ${n === +t.dataset.m ? 'selected' : ''}>${n}</option>`).join('')}</select> <span class="mute small">leaves before auto-submit</span></div>
  <div class="err" id="eE"></div><div class="foot"><button class="btn ghost" data-act="close">Cancel</button><button class="btn" data-act="tEditGo" data-id="${esc(t.dataset.id)}">Save</button></div>`);
ACT.tEditGo = async (t) => {
  try { await api('/tests/assignments/' + t.dataset.id, 'PUT', { start_at: new Date($('#eS').value).getTime(), due_at: $('#eD').value ? new Date($('#eD').value).getTime() : null, lock_on: $('#eL').checked, max_leaves: +$('#eM').value }); closeModal(); route(); }
  catch (e) { $('#eE').textContent = e.message; }
};
ACT.tRmAsg = (t) => modal(`<h2>Remove this test from the class?</h2><p>Students will no longer see it and <b>all marks for it will be deleted</b>.</p><div class="foot"><button class="btn ghost" data-act="close">Keep</button><button class="btn red" data-act="tRmAsg2" data-id="${esc(t.dataset.id)}">Remove</button></div>`);
ACT.tRmAsg2 = async (t) => { await api('/tests/assignments/' + t.dataset.id, 'DELETE'); closeModal(); route(); };
ACT.tResults = (t) => go('#/t/tests/' + t.dataset.id);
ACT.tBackTests = () => go('#/t/tests');

/* ---------- teacher: results for one assignment ---------- */
ROUTES.push([/^\/t\/tests\/(\w+)$/, async (id) => {
  await loadClasses();
  const d = TS.res = await api('/tests/assignments/' + id + '/results');
  if (d.test.kind === 'guided') {
    const n = d.students.filter((s) => s.released).length;
    const rows = d.students.map((s) => `<tr><td><b>${esc(s.name)}</b></td><td>${s.released ? '<span class="badge g">Answers shown</span>' : '<span class="mute">Hidden</span>'}</td>
      <td style="white-space:nowrap"><button class="btn ${s.released ? 'ghost' : 'green'} sm" data-act="tRel" data-id="${esc(d.assignment.id)}" data-s="${esc(s.id)}" data-on="${s.released ? 0 : 1}">${s.released ? '🔒 Hide answers' : '🔑 Show answers'}</button></td></tr>`).join('');
    shell('tests', `<button class="linkbtn" data-act="tBackTests">← Class tests</button>
      <h1 style="margin:6px 0 2px">${esc(d.test.title)}</h1><p class="mute" style="margin:0 0 14px">${esc(d.cls.name)} · ${d.test.folder ? esc(d.test.folder) + ' › ' : ''}${esc(d.test.sub || '')}</p>
      <div class="row" style="margin-bottom:12px"><button class="btn green sm" data-act="tRel" data-id="${esc(d.assignment.id)}" data-all="1" data-on="1">🔑 Show answers to everyone</button><button class="btn ghost sm" data-act="tRel" data-id="${esc(d.assignment.id)}" data-all="1" data-on="0">🔒 Hide from everyone</button><span class="mute small">${n} of ${d.students.length} students can see the answers</span></div>
      <div class="card" style="overflow:auto;padding:6px 10px"><table><thead><tr><th>Student</th><th>Answers</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="3" class="mute">No students in this class yet.</td></tr>'}</tbody></table></div>
      <p class="mute small">Students can open the paper, the idea maps and the videos at any time. The model answers stay locked until you press <b>Show answers</b> for that student, so you can unlock them child by child after you have collected their paper. A student who already has the page open sees the answers after pressing “Check for answers”.</p>`);
    return;
  }
  const done = d.students.filter((s) => s.status === 'done'), prog = d.students.filter((s) => s.status === 'started');
  const avg = done.length ? done.reduce((n, s) => n + s.score, 0) / done.length : null;
  const flagged = d.students.filter((s) => s.leaves > 0).length;
  const stat = (v, l) => `<div class="card" style="flex:1;min-width:130px;margin:0;text-align:center"><div style="font-size:26px;font-weight:900;color:var(--navy,#1b2a4a)">${v}</div><div class="mute small">${l}</div></div>`;
  const rows = d.students.map((s) => {
    const status = s.status === 'done' ? '<span class="badge g">Finished</span>' : s.status === 'started' ? '<span class="chip">In progress</span>' : '<span class="mute">Not started</span>';
    const fix = s.status === 'done' ? (s.fix_total ? `${s.fix_done}/${s.fix_total}` : '–') : '';
    const lv = s.leaves ? `<span style="color:#c62f3a;font-weight:800">${s.leaves}×${s.auto ? ' · auto-submitted' : ''}</span>` : (s.status === 'none' ? '' : '0');
    return `<tr><td><b>${esc(s.name)}</b></td><td>${status}</td><td><b>${s.status === 'done' ? fmtMark(s.score) + ' / ' + s.out_of : ''}</b></td><td>${s.status === 'done' ? s.percent + '%' : ''}</td><td>${s.status === 'done' ? esc(fmtDur(s.secs)) : ''}</td><td>${lv}</td><td>${fix}</td>
      <td style="white-space:nowrap">${s.status === 'done' ? `<button class="btn ghost sm" data-act="tView" data-id="${esc(s.result_id)}">Answers</button> ` : ''}${s.result_id ? `<button class="btn ghost sm" data-act="tReset" data-id="${esc(s.result_id)}" data-n="${esc(s.name)}">Reset</button>` : ''}</td></tr>`;
  }).join('');
  shell('tests', `<button class="linkbtn" data-act="tBackTests">← Class tests</button>
    <h1 style="margin:6px 0 2px">${esc(d.test.title)}</h1><p class="mute" style="margin:0 0 14px">${esc(d.cls.name)} · Opens ${esc(fmtDate(d.assignment.start_at))} · ${d.assignment.due_at ? 'Closes ' + esc(fmtDate(d.assignment.due_at)) : 'No closing time'}</p>
    <div class="row" style="gap:10px;align-items:stretch;margin-bottom:14px">${stat(done.length + ' / ' + d.students.length, 'finished')}${stat(avg == null ? '–' : fmtMark(Math.round(avg * 2) / 2) + ' / ' + d.test.marks, 'class average')}${stat(prog.length, 'in progress')}${stat(flagged, 'left the test page')}</div>
    <div class="card" style="overflow:auto;padding:6px 10px"><table><thead><tr><th>Student</th><th>Status</th><th>Marks</th><th>%</th><th>Time</th><th>Left page</th><th>Fix-it</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="8" class="mute">No students in this class yet.</td></tr>'}</tbody></table></div>
    <p class="mute small">“In progress” for a long time usually means the student closed or refreshed the page. Press <b>Reset</b> to let them take the test again (their old attempt is deleted). Short answers earn 1 mark on the 1st try, ½ on the 2nd, 0 after that.</p>`);
}]);
ACT.tRel = async (t) => {
  try { await api('/tests/assignments/' + t.dataset.id + '/release', 'POST', { student_id: t.dataset.s || null, all: t.dataset.all === '1', on: t.dataset.on === '1' }); route(); }
  catch (e) { toast(e.message); }
};
ACT.tReset = (t) => modal(`<h2>Reset ${esc(t.dataset.n)}?</h2><p>Their attempt and mark are deleted and they can take the test again.</p><div class="foot"><button class="btn ghost" data-act="close">Cancel</button><button class="btn red" data-act="tReset2" data-id="${esc(t.dataset.id)}">Reset</button></div>`);
ACT.tReset2 = async (t) => { await api('/tests/results/' + t.dataset.id + '/reset', 'POST', {}); closeModal(); route(); };
ACT.tView = async (t) => {
  const d = await api('/tests/results/' + t.dataset.id);
  const qs = ((d.report && d.report.questions) || []);
  const miss = qs.filter((q) => q.marks < 1);
  modal(`<h2>${esc(d.student)} — ${fmtMark(d.score)} / ${d.out_of}</h2>
    ${miss.length ? `<p class="mute small" style="margin:0 0 8px">Answers that lost marks (${miss.length}):</p><div style="max-height:55vh;overflow:auto"><table><thead><tr><th>#</th><th>Question</th><th>Student wrote</th><th>Correct</th><th>Marks</th></tr></thead><tbody>${miss.map((q) => `<tr><td>${q.n}</td><td>${esc(q.prompt)}</td><td style="color:#c62f3a">${esc(q.given) || '<span class="mute">blank</span>'}</td><td style="color:#1b8f4c">${esc(q.ans)}</td><td>${fmtMark(q.marks)}</td></tr>`).join('')}</tbody></table></div>` : '<p>🎉 Full marks. Nothing to show.</p>'}
    <div class="foot"><button class="btn" data-act="close">Close</button></div>`, true);
};

/* ---------- student: only what has been assigned to their class ---------- */
ROUTES.push([/^\/s\/tests$/, async () => {
  const d = await api('/student/tests');
  const card = (t) => {
    let right = '';
    if (t.kind === 'guided') return `<div class="card"><div class="spread" style="gap:12px"><div style="flex:1;min-width:0"><b style="font-size:18px">${esc(t.title)}</b><div class="mute small">${esc(t.desc || '')}</div><div class="small" style="margin-top:6px">${t.released ? '<span class="badge g">✔ Answers unlocked</span>' : '<span class="chip">🔒 Answers are locked until your teacher unlocks them</span>'}</div></div><a class="btn green" href="/tests/run/${esc(t.id)}" style="text-decoration:none">Open ▶</a></div></div>`;
    if (t.status === 'done') right = `<div style="text-align:right"><div style="font-size:26px;font-weight:900">${fmtMark(t.score)} / ${t.out_of}</div><div class="mute small">${t.percent}%</div></div>`;
    else if (t.status === 'todo') right = `<button class="btn green" data-act="sTestGo" data-id="${esc(t.id)}">Start ▶</button>`;
    else if (t.status === 'started') right = '<span class="chip">Started earlier</span>';
    else right = '<span class="chip">Closed</span>';
    const note = t.status === 'started' ? '<div class="small" style="color:#b86a00;margin-top:6px">You already opened this test. Ask your teacher to reset it so you can take it again.</div>'
      : t.status === 'missed' ? '<div class="small mute" style="margin-top:6px">This test closed. Ask your teacher.</div>' : '';
    return `<div class="card"><div class="spread" style="gap:12px"><div style="flex:1;min-width:0"><b style="font-size:18px">${esc(t.title)}</b><div class="mute small">${t.marks} marks · ${t.due_at ? esc(dueLeft(t.due_at)) + ' · closes ' + esc(fmtDate(t.due_at)) : 'No closing time'}</div></div>${right}</div>${note}</div>`;
  };
  $('#app').innerHTML = `<div class="sbody">${sTop(null, true)}<h1 style="margin:6px 0 4px">📝 Class tests</h1><p class="mute" style="margin:0 0 16px">You can take each test once. Stay on the test page until you finish.</p>
    ${grpHtml(d.tests, card) || '<div class="card mute" style="text-align:center">No tests yet. Check back soon!</div>'}</div>`;
}]);
ACT.sTestGo = (t) => modal(`<h2>Ready for your test?</h2>
  <ul style="margin:8px 0 0;padding-left:20px"><li>You can take it <b>only once</b>.</li><li>Stay on this page. If you switch tabs or apps, it is recorded and the test can be submitted automatically.</li><li>Find a quiet place and keep going until you submit.</li></ul>
  <div class="foot"><button class="btn ghost" data-act="close">Not yet</button><button class="btn green" data-act="sTestGo2" data-id="${esc(t.dataset.id)}">I'm ready ▶</button></div>`);
ACT.sTestGo2 = (t) => { location.href = '/tests/run/' + t.dataset.id; };
