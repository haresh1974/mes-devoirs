/* Student area: homework path and the exercises */
const ST = { tab: 'path', hw: null, lang: 'fr-FR' };
let hbTimer = null;
function startHeartbeat() {
  if (hbTimer) return;
  hbTimer = setInterval(() => {
    if (document.visibilityState !== 'visible' || !/^#\/s(\/|$)/.test(location.hash)) return;
    api('/student/ping', 'POST', { secs: 15, homework_id: ST.hw }).catch(() => {});
  }, 15000);
}
function sTop(coins, back) {
  return `<div class="stop">${back ? '<button class="icon-btn" data-act="sHome" title="Home">←</button>' : '<div style="font-weight:800;font-size:20px"><img src="/logo.svg" alt="" style="width:34px;height:34px;vertical-align:middle;margin-right:8px">French with Haresh</div>'}<div class="row">${coins == null ? '' : '<span class="coins">' + coins + '</span>'}<button class="icon-btn" title="Voice" data-act="sVoice">${ICON_SPK}</button><button class="icon-btn" title="Sign out" data-act="logout">↪</button></div></div>`;
}
ACT.sHome = () => { ST.hw = null; go('#/s'); };
ACT.sVoice = () => voiceModal(ST.lang);
const langOf = (name) => (LANG[name] || LANG.French).tts;

/* ---- home ---- */
ROUTES.push([/^\/s$/, async () => {
  startHeartbeat(); ST.hw = null;
  const d = await api('/student/home');
  VOICE.cloud = !!d.tts; ST.lang = langOf(d.cls.language);
  const list = d.homework.map((h) => {
    const pct = h.total ? Math.round(h.done / h.total * 100) : 0;
    return `<button class="hcard" data-act="sOpen" data-id="${esc(h.id)}"><div class="spread"><h3>${esc(h.title)}</h3>${h.status === 'complete' ? '<span class="badge g">✓ Done</span>' : ''}</div>
      <div class="mute">${esc(h.topic || '')}</div><div class="spread small" style="margin-top:8px;font-weight:800"><span>${esc(dueLeft(h.due_at))}</span><span>#${h.rank} of ${h.of}</span></div><div class="pbar"><i style="width:${pct}%"></i></div></button>`;
  }).join('');
  let seen = []; try { seen = JSON.parse(localStorage.getItem('md_seen') || '[]'); } catch (e) {}
  const notes = (d.notices || []).filter((n) => !seen.includes(n.id)).map((n) => `<div class="notice"><span>🔔</span><div style="flex:1"><b>Message from your teacher</b><div>${esc(n.message)}</div></div><button class="icon-btn" data-act="seeNote" data-id="${esc(n.id)}" style="width:30px;height:30px">✕</button></div>`).join('');
  $('#app').innerHTML = `<div class="sbody">${sTop(d.student.coins, false)}
    <h1 style="margin:6px 0 4px">Bonjour, ${esc(d.student.name)}! 👋</h1><p class="mute" style="margin:0 0 20px">${esc(d.cls.name)}</p>${notes}
    <button class="hcard" data-act="sPractice" style="background:linear-gradient(135deg,#1F4FBF,#6C4BDB);color:#fff"><div class="spread"><h3 style="color:#fff">🎮 Practice games</h3><span class="badge g">NEW</span></div><div style="opacity:.9">Vocab, sentences, verbs, listening, dictation and speed games</div></button><button class="hcard" data-act="sRes"><div class="spread"><h3>📎 Resources</h3></div><div class="mute small">Translation, IGCSE speaking and ICSE dialogues</div></button>
        ${list || '<div class="card mute" style="text-align:center">No homework yet. Check back soon!</div>'}</div>`;
}]);
ACT.sRes = () => { location.href = '/resources/'; };
ACT.sPractice = () => { if (PH) PH.keep = null; go('#/s/practice'); };
ACT.seeNote = (t) => { let a = []; try { a = JSON.parse(localStorage.getItem('md_seen') || '[]'); } catch (e) {} a.push(t.dataset.id); try { localStorage.setItem('md_seen', JSON.stringify(a.slice(-50))); } catch (e) {} route(); };
ACT.sOpen = (t) => go('#/s/hw/' + t.dataset.id);

/* ---- path ---- */
ROUTES.push([/^\/s\/hw\/(\w+)$/, async (id) => {
  startHeartbeat(); ST.hw = id;
  const d = await api('/student/homework/' + id);
  const { hw, done, board } = d;
  hw.mixed = (hw.exercises || []).some((k) => /^L\d+$/.test(k)); ST.hwData = hw;
  VOICE.cloud = !!d.tts; ST.lang = langOf(hw.language);
  const me = board.find((b) => b.me);
  ST.study = d.study || 0; STUDY_SECS = d.need || STUDY_SECS;
  const studied = ST.study >= STUDY_SECS;
  if (hw.extra && hw.extra.resource) {
    const r = hw.extra.resource, fin = !!done.RES;
    ST.resT0 = Date.now();
    $('#app').innerHTML = `<div class="sbody">${sTop(null, true)}
      <div class="hwhead"><div class="spread"><div class="t">${esc(r.skill || 'Resource')}</div><div class="small" style="font-weight:800">#${me.rank} of ${board.length} · ${me.coins} 🪙</div></div><h1>${esc(hw.title)}</h1><div>${esc(r.desc || hw.topic || '')}</div>
      <div class="due"><span>⏰ ${esc(dueLeft(hw.due_at))}</span><span>${hw.due_at ? 'Due ' + esc(fmtDate(hw.due_at)) : ''}</span></div></div>
      <div class="card" style="text-align:center"><div style="font-size:42px">📎</div><b style="font-size:18px">Step 1: open and do the task</b><div class="mute" style="margin:6px 0 14px">It opens in a new tab. Allow the microphone if it asks. Come back here when you have finished.</div><a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none">Open ${esc(hw.title)} ↗</a></div>
      <div class="card" style="text-align:center">${fin ? '<div style="font-size:40px">🎉</div><b>Done! Well played.</b><div class="mute small">You can open it again any time.</div>' : '<b style="font-size:18px">Step 2: tell your teacher you have finished</b><div class="mute" style="margin:6px 0 14px">Tap the button once you have really done the task.</div><button class="btn green" data-act="sResDone">✓ I have finished this</button>'}</div></div>`;
    return;
  }
  let inner = '';
  if (ST.tab === 'path') {
    let nextSet = false;
    inner = (studied ? `<div class="card" style="display:flex;align-items:center;gap:12px;justify-content:space-between"><div><b>📖 Study cards</b><div class="mute small">Studied ✓ You can revise any time.</div></div><button class="btn ghost sm" data-act="sStudy">Revise</button></div>`
      : `<div class="card" style="text-align:center;border:2px solid #f5b400;background:#fffbea"><div style="font-size:38px">📖</div><b style="font-size:18px">Study first!</b><div class="mute" style="margin:6px 0 12px">Read the words and listen to them for ${Math.round(STUDY_SECS / 60)} minutes before you start the practice.${ST.study ? ' You have done ' + Math.floor(ST.study / 60) + ' min ' + (ST.study % 60) + ' s so far.' : ''}</div><button class="btn green" data-act="sStudy">Start studying</button></div>`) + '<div class="path">' + hw.exercises.map((k, i) => {
      const dn = done[k], prevDone = hw.exercises.slice(0, i).every((p) => done[p]);
      const locked = !hw.free_order && !prevDone;
      const isNext = !dn && !nextSet && !locked; if (isNext) nextSet = true;
      const off = [0, -37, -71, -37, 0, 37, 71, 37][i % 8];
      const E = EXERCISES[k];
      const bub = hw.mixed && i === 2 ? '<button class="bubble" data-act="sBubble" title="Tap for a phrase">💬</button>' : '';
      return bub + `<button class="node ${locked ? 'lock' : ''} ${isNext ? 'next' : ''}" style="transform:translateX(${off}px)" data-act="sPlay" data-k="${k}" ${locked ? 'data-locked="1"' : ''}><div class="b">${locked ? '🔒' : dn ? '✓' : isNext ? '▶' : E.ic}</div><b class="l">${esc(E.name)}</b><small>${dn ? Math.round(dn.score / dn.total * 100) + '% · tap to replay' : locked ? 'Finish the one before' : esc(E.desc)}</small></button>`;
    }).join('') + '</div>' + (hw.exercises.every((k) => done[k]) ? '<div class="card" style="text-align:center"><div style="font-size:40px">🎉</div><b>Homework complete!</b><div class="mute small">Replay any activity to beat your score.</div></div>' : '');
  } else {
    inner = board.map((b) => `<div class="lb ${b.me ? 'me' : ''}"><div class="rk">${['🥇', '🥈', '🥉'][b.rank - 1] || b.rank}</div><div class="nm">${esc(b.name)}${b.me ? ' (you)' : ''}</div><div>${b.coins} 🪙</div></div>`).join('');
  }
  $('#app').innerHTML = `<div class="sbody">${sTop(null, true)}
    <div class="hwhead"><div class="spread"><div class="t">${esc(hw.tier)}</div><div class="small" style="font-weight:800">#${me.rank} of ${board.length} · ${me.coins} 🪙</div></div><h1>${esc(hw.title)}</h1><div>${esc(hw.topic || '')}</div>
      <div class="due"><span>⏰ ${esc(dueLeft(hw.due_at))}</span><span>${hw.due_at ? 'Due ' + esc(fmtDate(hw.due_at)) : ''}</span></div></div>
    <div class="stabs"><button class="${ST.tab === 'path' ? 'on' : ''}" data-act="sTab" data-k="path">Path</button><button class="${ST.tab === 'board' ? 'on' : ''}" data-act="sTab" data-k="board">Leaderboard</button></div>${inner}</div>`;
}]);
ACT.sResDone = async () => {
  try { await api('/student/attempt', 'POST', { homework_id: ST.hw, lesson: 'RES', score: 1, total: 1, secs: Math.min(3600, Math.round((Date.now() - (ST.resT0 || Date.now())) / 1000)) }); toast('Well done! Marked as finished.'); route(); }
  catch (e) { toast(e.message || 'Could not save. Try again.'); }
};
ACT.sBubble = () => {
  const ss = (ST.hwData.items || []).filter((i) => i.s);
  const it = (ss.length ? ss : ST.hwData.items || [])[Math.floor(Math.random() * Math.max(1, (ss.length ? ss : ST.hwData.items || []).length))];
  if (!it) return;
  modal(`<div style="text-align:center"><div style="font-size:42px">💬</div><h2>Phrase du jour</h2><div style="font-size:22px;font-weight:800;margin:10px 0">${esc(it.fr)}</div><div class="mute">${esc(it.en)}</div><div class="audio" style="margin-top:16px"><button class="abtn" data-act="gSay" data-t="${esc(it.fr)}">${ICON_SPK}<span>Listen</span></button><button class="abtn slow" data-act="gSay" data-t="${esc(it.fr)}" data-slow="1">${ICON_SLOW}</button></div></div><div class="foot"><button class="btn" data-act="close">Merci!</button></div>`);
  setTimeout(() => speakText(it.fr, ST.lang), 300);
};
ACT.sTab = (t) => { ST.tab = t.dataset.k; route(); };
ACT.sStudy = () => go('#/s/study/' + ST.hw);
ACT.sPlay = (t) => {
  if (t.dataset.locked) { toast('Finish the activity before this one first'); return; }
  if ((ST.study || 0) < STUDY_SECS) { toast('Study the words first (' + Math.round(STUDY_SECS / 60) + ' minutes)'); return go('#/s/study/' + ST.hw); }
  go('#/s/play/' + ST.hw + '/' + t.dataset.k);
};

/* ---- study cards (compulsory before practice) ---- */
let STUDY_SECS = 360;
let SD = null;
const fmtClock = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
ROUTES.push([/^\/s\/study\/(\w+)$/, async (id) => {
  startHeartbeat(); ST.hw = id;
  const d = await api('/student/homework/' + id);
  VOICE.cloud = !!d.tts; ST.lang = langOf(d.hw.language); STUDY_SECS = d.need || STUDY_SECS;
  const items = (d.hw.items || []).filter((i) => !i.s).concat((d.hw.items || []).filter((i) => i.s));
  SD = { id, items, i: 0, flip: false, mode: 'cards', secs: Math.min(STUDY_SECS, d.study || 0), sent: 0, title: d.hw.title };
  const tick = setInterval(async () => {
    if (!SD || SD.id !== id) return clearInterval(tick);
    if (document.visibilityState !== 'visible') return;
    if (SD.secs < STUDY_SECS) { SD.secs++; SD.sent++; }
    if (SD.sent >= 10 || (SD.secs >= STUDY_SECS && SD.sent)) { const n = SD.sent; SD.sent = 0; try { const r = await api('/student/study', 'POST', { homework_id: id, secs: n }); if (SD && r.secs < SD.secs - 12) SD.secs = r.secs; } catch (e) {} }
    drawClock();
  }, 1000);
  cleanup = () => { clearInterval(tick); stopSpeech(); const n = SD && SD.sent; if (n) api('/student/study', 'POST', { homework_id: id, secs: n }).catch(() => {}); SD = null; };
  drawStudy();
}]);
function drawClock() {
  const el = $('#stClock'), b = $('#stGo'); if (!el || !SD) return;
  const left = STUDY_SECS - SD.secs;
  el.innerHTML = left > 0 ? `⏳ Study time left <b>${fmtClock(left)}</b>` : '✅ Well done! Practice is unlocked.';
  $('#stBar').style.width = Math.round(SD.secs / STUDY_SECS * 100) + '%';
  b.disabled = left > 0; b.textContent = left > 0 ? 'Practice unlocks in ' + fmtClock(left) : "Start practice ▶";
}
function drawStudy() {
  const S = SD, it = S.items[S.i];
  const body = S.mode === 'cards'
    ? `<div class="card" style="text-align:center;padding:30px 18px;min-height:230px;cursor:pointer" data-act="stFlip"><div class="mute small">${S.i + 1} / ${S.items.length} · tap the card to ${S.flip ? 'hide' : 'see'} the English</div>
        <div style="font-size:${it.fr.length > 24 ? 24 : 32}px;font-weight:800;margin:20px 0 10px">${esc(it.fr)}</div>
        <div style="font-size:22px;min-height:32px;color:#1F4FBF;font-weight:700">${S.flip ? esc(it.en) : '•••'}</div></div>
      <div class="audio" style="justify-content:center;margin:12px 0"><button class="abtn" data-act="stSay" data-t="${esc(it.fr)}">${ICON_SPK}<span>Listen</span></button><button class="abtn slow" data-act="stSay" data-t="${esc(it.fr)}" data-slow="1">${ICON_SLOW}</button></div>
      <div class="row" style="justify-content:space-between"><button class="btn ghost" data-act="stPrev">← Back</button><button class="btn ghost" data-act="stShuffle">🔀 Shuffle</button><button class="btn" data-act="stNext">Next →</button></div>`
    : `<div class="card" style="padding:4px 14px">${S.items.map((x, n) => `<div class="spread" style="padding:9px 0;border-top:${n ? '1px solid var(--line)' : '0'}"><div><b>${esc(x.fr)}</b><div class="mute small">${esc(x.en)}</div></div><button class="abtn" style="flex:none" data-act="stSay" data-t="${esc(x.fr)}">${ICON_SPK}</button></div>`).join('')}</div>`;
  $('#app').innerHTML = `<div class="sbody">${sTop(null, true)}
    <div class="hwhead"><h1>📖 Study: ${esc(S.title)}</h1><div id="stClock" style="margin:6px 0"></div><div style="height:10px;background:rgba(255,255,255,.5);border-radius:6px;overflow:hidden"><div id="stBar" style="height:100%;width:0;background:#2ecc71;transition:width .4s"></div></div></div>
    <div class="stabs"><button class="${S.mode === 'cards' ? 'on' : ''}" data-act="stMode" data-k="cards">Flash cards</button><button class="${S.mode === 'list' ? 'on' : ''}" data-act="stMode" data-k="list">Word list</button></div>
    ${body}
    <button class="btn green" id="stGo" style="width:100%;margin-top:16px;padding:14px" data-act="stGo" disabled>Start practice</button></div>`;
  drawClock();
}
ACT.stFlip = () => { SD.flip = !SD.flip; drawStudy(); if (SD.flip) speakText(SD.items[SD.i].fr, ST.lang); };
ACT.stNext = () => { SD.i = (SD.i + 1) % SD.items.length; SD.flip = false; drawStudy(); speakText(SD.items[SD.i].fr, ST.lang); };
ACT.stPrev = () => { SD.i = (SD.i - 1 + SD.items.length) % SD.items.length; SD.flip = false; drawStudy(); speakText(SD.items[SD.i].fr, ST.lang); };
ACT.stShuffle = () => { SD.items = shuffle(SD.items); SD.i = 0; SD.flip = false; drawStudy(); };
ACT.stMode = (t) => { SD.mode = t.dataset.k; drawStudy(); };
ACT.stSay = (t) => { t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 1800); speakText(t.dataset.t, ST.lang, !!t.dataset.slow); };
ACT.stGo = () => { if (SD && SD.secs >= STUDY_SECS) go('#/s/hw/' + SD.id); };


/* ---- practice hub: game type > level > up to 3 lessons ---- */
const GICON = {
  vocab: '<rect x="9" y="12" width="22" height="26" rx="4"/><rect x="17" y="8" width="22" height="26" rx="4" fill="#fff" fill-opacity=".25"/><path d="M22 18h12M22 24h12M22 30h7"/>',
  sent: '<rect x="6" y="9" width="17" height="11" rx="3"/><rect x="25" y="9" width="17" height="11" rx="3"/><rect x="6" y="28" width="26" height="11" rx="3"/><path d="M36 28v11" stroke-dasharray="2 4"/>',
  verb: '<circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="9"/><circle cx="24" cy="24" r="2.5" fill="#fff"/><path d="M24 24L38 10M34 9l4 1 1 4"/>',
  gram: '<path d="M15 9H9v30h6M33 9h6v30h-6"/><path d="M17 31h14" stroke-width="3.5"/><path d="M19 23l5-9 5 9M20.5 20h7"/>',
  listen: '<path d="M9 28v-4a15 15 0 0130 0v4"/><rect x="7" y="27" width="8" height="12" rx="3" fill="#fff" fill-opacity=".3"/><rect x="33" y="27" width="8" height="12" rx="3" fill="#fff" fill-opacity=".3"/>',
  dict: '<path d="M10 38h28"/><path d="M14 30l16-16 5 5-16 16-7 2z" fill="#fff" fill-opacity=".25"/><path d="M27 17l5 5"/>',
  work: '<path d="M16 24h16"/><rect x="8" y="15" width="6" height="18" rx="2" fill="#fff" fill-opacity=".3"/><rect x="34" y="15" width="6" height="18" rx="2" fill="#fff" fill-opacity=".3"/><path d="M4 21v6M44 21v6"/>',
  box: '<path d="M14 18c0-5 4-8 9-8h6c6 0 10 4 10 10v8c0 6-4 10-10 10h-7c-5 0-8-3-8-8z" fill="#fff" fill-opacity=".25"/><path d="M14 33h26M22 10v9"/>',
  abox: '<path d="M10 20v8M17 14v20M24 8v32M31 14v20M38 20v8"/>',
  climb: '<path d="M4 40L19 14l8 12 5-7 12 21z" fill="#fff" fill-opacity=".25"/><path d="M19 14V6l7 3-7 3"/>'
};
const gIcon = (id, sz) => `<svg viewBox="0 0 48 48" width="${sz || 40}" height="${sz || 40}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GICON[id] || ''}</svg>`;
const GAMES = [
  { id: 'vocab', ic: '📚', name: 'Vocab Trainer', d: 'Learn and test words', col: '#1F4FBF', src: ['vocab'], kinds: [['flash', 6], ['match', 2], ['translate', 6], ['meaning', 5], ['typeit', 6], ['truefalse', 5]] },
  { id: 'sent', ic: '🧱', name: 'Sentence Trainer', d: 'Build and complete sentences', col: '#7B3FE4', src: ['sent'], kinds: [['build', 5], ['cloze', 6], ['spaces', 3], ['odd', 3], ['tap', 4]] },
  { id: 'verb', ic: '🎯', name: 'Verb Trainer', d: 'Conjugate in every tense', col: '#E1342F', src: ['verb'], kinds: [['conjmatch', 3], ['conjpick', 8], ['conjtype', 8]] },
  { id: 'listen', ic: '👂', name: 'Listening Trainer', d: 'Train your ear', col: '#0E9F6E', src: ['vocab', 'sent'], kinds: [['listen', 10], ['tap', 8]] },
  { id: 'dict', ic: '✍️', name: 'Dictation Trainer', d: 'Hear it, then type it', col: '#D97706', src: ['vocab', 'sent'], kinds: [['dictation', 12], ['tap', 4]] },
  { id: 'work', ic: '🏋️', name: 'Workouts', d: 'One lesson, a dozen activities', col: '#0891B2', src: ['vocab', 'sent', 'verb', 'gram'], kinds: [['gappick', 3], ['flash', 3], ['translate', 4], ['typeit', 4], ['cloze', 4], ['conjpick', 3], ['listen', 3], ['dictation', 3]] },
  { id: 'box', ic: '🥊', name: 'Boxing Game', d: '2 minutes, 3 lives, go fast!', col: '#DC2626', src: ['vocab', 'sent', 'verb', 'gram'], fast: 'box', kinds: [['meaning', 60]] },
  { id: 'abox', ic: '🎧', name: 'Audio Boxing', d: 'Fast game with sounds only', col: '#9333EA', src: ['vocab', 'sent'], fast: 'abox', kinds: [['audmean', 60]] },
  { id: 'climb', ic: '🧗', name: 'Rock Climbing', d: 'Right goes up, wrong slides down', col: '#65A30D', src: ['vocab', 'sent', 'verb', 'gram'], fast: 'climb', kinds: [['translate', 40], ['meaning', 40], ['cloze', 20], ['conjpick', 20], ['gappick', 20]] }
];
const LEVELS = [['primary', 'Primary'], ['beginner', 'Beginner'], ['preint', 'Pre-intermediate'], ['inter', 'Intermediate'], ['higher', 'Higher'], ['tri1', 'Trilogy 1'], ['tri2', 'Trilogy 2'], ['tri3', 'Trilogy 3'], ['advanced', 'Advanced'], ['aqa', 'AQA GCSE'], ['igcse', 'IGCSE - CIE'], ['pearson', 'Pearson GCSE']];
const TENSE_ORDER = ['Present Indicative', 'Immediate future', 'Imperfect Indicative', 'Perfect Indicative', 'Future Indicative', 'Present Subjunctive', 'Present Conditional', 'Past Conditional'];
const KIND_NAME = { vocab: 'Vocab', sent: 'Sentences', verb: 'Verbs', gram: 'Grammar', read: 'Reading', speak: 'Speaking', lis: 'Listening' };
let PH = null, PH_AGAIN = '';
ROUTES.push([/^\/s\/practice$/, async () => {
  startHeartbeat(); ST.hw = null;
  const d = await api('/student/practice');
  VOICE.cloud = !!d.tts; ST.lang = 'fr-FR';
  PH = { all: d.lessons, step: (PH && PH.keep) || 'game', game: PH && PH.game, level: PH && PH.level, wm: PH && PH.wm, wq: '', sel: [], q: '', cat: PH && PH.cat, cats: (PH && PH.cats) || [], opt: (PH && PH.opt) || { mode: 'practice', order: 'random', pron: [0, 1, 2, 3, 4, 5], n: '20', min: '5' } };
  drawHub();
}]);
const gameOf = (id) => GAMES.find((g) => g.id === id);
function hubLessons() { const g = gameOf(PH.game); return PH.all.filter((l) => l.level === PH.level && g.src.includes(l.kind) && (g.id === 'verb' ? (!PH.cats || !PH.cats.length || PH.cats.includes(l.topic)) : (!PH.cat || l.topic === PH.cat))); }
function hubCats() { const g = gameOf(PH.game), m = {}; PH.all.filter((l) => l.level === PH.level && g.src.includes(l.kind)).forEach((l) => { const c = l.topic || 'Other'; m[c] = (m[c] || 0) + 1; }); return Object.entries(m).sort((a, b) => { const ia = TENSE_ORDER.indexOf(a[0]), ib = TENSE_ORDER.indexOf(b[0]); return ia >= 0 || ib >= 0 ? (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) : a[0].localeCompare(b[0]); }); }
const CAT_IC = [['animal', '🐾'], ['birthday', '🎂'], ['body', '🧍'], ['colour', '🎨'], ['countr', '🌏'], ['daily', '⏰'], ['routine', '⏰'], ['describ', '🙂'], ['drink', '🥤'], ['like', '👍'], ['family', '👪'], ['food', '🍽️'], ['free time', '🎮'], ['health', '🩺'], ['house chore', '🧹'], ['house', '🏠'], ['home', '🏠'], ['job', '💼'], ['work', '💼'], ['national', '🏳️'], ['number', '🔢'], ['school', '🎒'], ['study', '📚'], ['education', '📚'], ['weather', '⛅'], ['time', '🕒'], ['area', '🏙️'], ['town', '🏙️'], ['verb', '🔤'], ['tense', '🔤'], ['grammar', '📐'], ['negative', '🚫'], ['connect', '🔗'], ['question', '❓'], ['clothes', '👕'], ['festival', '🎉'], ['environment', '🌿'], ['media', '📺'], ['technology', '💻'], ['relation', '🤝'], ['holiday', '🏖️'], ['travel', '✈️'], ['introduc', '👋'], ['possess', '🔖'], ['agreement', '🧩'], ['indicat', '📍'], ['opinion', '💬'], ['social', '🌐'], ['culture', '🎭'], ['cinema', '🎬'], ['music', '🎵'], ['sport', '⚽'], ['theme 1', '🪪'], ['theme 2', '🌍'], ['theme 3', '🎓'], ['identity', '🪪'], ['global', '🌍'], ['personal', '🌟'], ['healthy', '🍎'], ['adjective', '🎨'], ['article', '📰'], ['pronoun', '👤'], ['preposition', '📍'], ['comparison', '⚖️'], ['noun', '🏷️'], ['determiner', '🔖'], ['present', '▶️'], ['future', '⏭️'], ['past', '⏮️'], ['perfect', '⏮️'], ['imperfect', '⏪'], ['conditional', '🤔'], ['subjunctive', '💭'], ['immediate', '⏩'], ['shop', '🛍️'], ['money', '💶']];
const catIcon = (n) => { const t = String(n).toLowerCase(); const h = CAT_IC.find(([k]) => t.includes(k)); return h ? h[1] : '📘'; };
const LV_COL = ['#16a34a', '#0ea5e9', '#6366f1', '#a855f7', '#e11d48', '#f97316', '#0f766e', '#475569', '#b45309', '#be185d', '#0369a1', '#4d7c0f'];
function phCss() {
  if (document.getElementById('phcss')) return;
  const st = document.createElement('style'); st.id = 'phcss';
  st.textContent = `.ph-hero{position:relative;overflow:hidden;border-radius:24px;padding:20px 20px 18px;color:#fff;background:linear-gradient(135deg,#1c3faa,#6d3fe0 60%,#c04fe0);margin-bottom:18px;box-shadow:0 10px 24px rgba(60,50,170,.28)}
.ph-hero:after{content:"";position:absolute;right:-40px;top:-40px;width:170px;height:170px;border-radius:50%;background:rgba(255,255,255,.12)}
.ph-hero:before{content:"";position:absolute;right:50px;bottom:-60px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.08)}
.ph-hero h2{margin:0;font-size:25px;letter-spacing:-.3px}.ph-hero p{margin:4px 0 0;opacity:.92;font-size:14px}
.ph-stats{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;position:relative;z-index:1}.ph-stats span{background:rgba(255,255,255,.18);border-radius:999px;padding:5px 12px;font-weight:800;font-size:13px}
.ph-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:560px){.ph-game{padding:12px 9px}.ph-game b{font-size:13.5px}.ph-game small{font-size:10.5px}.ph-game .gi{width:42px;height:42px}.ph-cat b{font-size:13px}.ph-cats{gap:8px}.ph-lvl h3{font-size:14px}}
.ph-game{position:relative;border:0;border-radius:22px;padding:16px 14px 15px;color:#fff;text-align:left;cursor:pointer;overflow:hidden;box-shadow:0 6px 0 rgba(0,0,0,.2),0 12px 20px rgba(0,0,0,.08);transition:transform .12s,box-shadow .12s;font:inherit;background-image:linear-gradient(160deg,rgba(255,255,255,.26),rgba(255,255,255,0) 55%,rgba(0,0,0,.2))}
.ph-game:active{transform:translateY(4px);box-shadow:0 2px 0 rgba(0,0,0,.2)}
.ph-game:after{content:"";position:absolute;right:-26px;bottom:-26px;width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,.14)}
.ph-game .gi{width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 2px rgba(255,255,255,.25);margin-bottom:10px}
.ph-game b{display:block;font-size:17px;line-height:1.15}.ph-game small{display:block;margin-top:3px;font-size:12px;opacity:.92;line-height:1.3}
.ph-new{position:absolute;right:10px;top:10px;background:#fde047;color:#713f12;font-size:10px;font-weight:900;border-radius:999px;padding:2px 8px;letter-spacing:.5px;z-index:1}
.ph-crumb{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 14px;font-size:13px;font-weight:800;color:var(--mute)}
.ph-crumb span.c{background:#eef2ff;color:#3b4fb8;border-radius:999px;padding:4px 11px}.ph-crumb i{font-style:normal;opacity:.5}
.ph-lvl{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:#fff;border:2px solid var(--line);border-radius:20px;padding:13px 16px;margin-bottom:12px;cursor:pointer;font:inherit;color:var(--ink);box-shadow:0 4px 0 var(--line);transition:transform .1s}
.ph-lvl:active{transform:translateY(3px);box-shadow:0 1px 0 var(--line)}.ph-lvl[disabled]{opacity:.45;cursor:default}
.ph-lvl .n{width:46px;height:46px;border-radius:15px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:20px;flex:none}
.ph-lvl h3{margin:0;font-size:18px}.ph-lvl .d{display:flex;gap:4px;margin-top:6px}.ph-lvl .d i{width:18px;height:6px;border-radius:3px;background:#e2e8f0}
.ph-cats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.ph-lvls{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.ph-lvls .ph-lvl{flex-direction:column;text-align:center;margin:0;padding:14px 8px;gap:8px}.ph-lvls .ph-lvl .d{justify-content:center;flex-wrap:wrap}.ph-lvls .ph-lvl .d{gap:3px;flex-wrap:nowrap}.ph-lvls .ph-lvl .d i{width:6px;height:5px}.ph-lvls .badge{white-space:nowrap;font-size:11px;padding:3px 7px}
.ph-cat{background:#fff;border:2px solid var(--line);border-radius:20px;padding:14px 12px;text-align:left;cursor:pointer;font:inherit;color:var(--ink);box-shadow:0 4px 0 var(--line);min-height:104px;display:flex;flex-direction:column;justify-content:space-between;transition:transform .1s}
.ph-cat:active{transform:translateY(3px);box-shadow:0 1px 0 var(--line)}.ph-cat .e{font-size:28px;line-height:1}.ph-cat b{font-size:15px;line-height:1.2;margin-top:8px;display:block}.ph-cat small{color:var(--mute);font-weight:700}
.ph-cat.on{border-color:#4f46e5;background:#eef2ff;box-shadow:0 4px 0 #c7d2fe}.ph-cat.all{grid-column:1/-1;flex-direction:row;justify-content:flex-start;align-items:center;min-height:0;gap:12px;background:linear-gradient(135deg,#eef2ff,#faf5ff)}
.ph-les{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#fff;border:2px solid var(--line);border-radius:18px;padding:12px 14px;margin-bottom:10px;cursor:pointer;font:inherit;color:var(--ink);box-shadow:0 3px 0 var(--line)}
.ph-les.on{border-color:#4f46e5;background:#eef2ff;box-shadow:0 3px 0 #c7d2fe}
.ph-les .ck{width:28px;height:28px;border-radius:50%;border:2.5px solid #cbd5e1;flex:none;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:15px}
.ph-les.on .ck{background:#4f46e5;border-color:#4f46e5}.ph-les .t{flex:1;min-width:0;font-weight:800;font-size:15px;line-height:1.25}.ph-les .m{font-size:12px;color:var(--mute);font-weight:700;margin-top:3px}
.ph-bar{position:sticky;bottom:10px;margin-top:14px;display:flex;gap:10px;align-items:center;background:rgba(255,255,255,.92);backdrop-filter:blur(6px);border:2px solid var(--line);border-radius:20px;padding:10px 12px;box-shadow:0 8px 22px rgba(0,0,0,.12)}
.ph-bar .sel{flex:1;font-weight:800;font-size:14px;color:var(--ink)}.ph-bar .sel small{display:block;color:var(--mute);font-weight:700;font-size:12px}
.ph-opt{display:flex;gap:12px;align-items:center;width:100%;text-align:left;background:#fff;border:2px solid var(--line);border-radius:18px;padding:12px 14px;margin-bottom:10px;cursor:pointer;font:inherit;color:var(--ink);box-shadow:0 3px 0 var(--line)}
.ph-opt.on{border-color:#4f46e5;background:#eef2ff;box-shadow:0 3px 0 #c7d2fe}.ph-opt .r{width:22px;height:22px;border-radius:50%;border:2.5px solid #cbd5e1;flex:none}.ph-opt.on .r{border:7px solid #4f46e5}
.ph-sec{font-weight:900;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:var(--mute);margin:16px 2px 8px}
.ph-pron{padding:11px 18px;border-radius:999px;border:2px solid var(--line);background:#fff;font:inherit;font-weight:800;font-size:16px;cursor:pointer}.ph-pron.on{background:#4f46e5;border-color:#4f46e5;color:#fff}`;
  document.head.appendChild(st);
}
function drawHub() {
  phCss();
  if (PH.game === 'work' && ['wmod', 'wlevel', 'wcat', 'wles'].includes(PH.step)) return drawWork();
  const P = PH; let body = '', title = 'Practice', crumb = '';
  const gm = P.game ? gameOf(P.game) : null, lvName = P.level ? (LEVELS.find((x) => x[0] === P.level) || [0, ''])[1] : '';
  const mk = (...a) => '<div class="ph-crumb">' + a.filter(Boolean).map((x, i) => (i ? '<i>›</i>' : '') + `<span class="c">${esc(x)}</span>`).join('') + '</div>';
  if (P.step === 'game') {
    const nL = P.all.length;
    body = `<div class="ph-hero"><h2>Practice games</h2><p>Pick a game, a level and a topic, then play.</p><div class="ph-stats"><span>📚 ${nL} lessons</span><span>🎮 ${GAMES.length} games</span><span>🎓 ${LEVELS.length} levels</span></div></div>` +
      `<div class="ph-grid">${GAMES.map((g) => `<button class="ph-game" data-act="phGame" data-id="${g.id}" style="background-color:${g.col}">${g.id === 'gram' ? '<span class="ph-new">NEW</span>' : ''}<div class="gi">${gIcon(g.id, 34)}</div><b>${g.name}</b><small>${g.d}</small></button>`).join('')}</div>`;
  } else if (P.step === 'level') {
    title = gm.name;
    body = mk(gm.name) + `<div class="ph-sec">Select your difficulty level</div>` + '<div class="ph-lvls">' + LEVELS.map(([id, nm], k) => {
      const n = P.all.filter((l) => l.level === id && gm.src.includes(l.kind)).length;
      const dots = Array.from({ length: 12 }, (_, d) => `<i style="${d <= k ? 'background:' + LV_COL[k] : ''}"></i>`).join('');
      return `<button class="ph-lvl" data-act="phLevel" data-id="${id}" ${n ? '' : 'disabled'}><div class="n" style="background:${LV_COL[k]}">${k + 1}</div><div style="flex:1"><h3>${nm}</h3><div class="d">${dots}</div></div><span class="badge ${n ? 'g' : ''}">${n ? n + ' lessons' : 'Soon'}</span></button>`;
    }).join('') + '</div>';
  } else if (P.step === 'cat') {
    title = gm.name; const cs = hubCats(), tot = cs.reduce((n, c) => n + c[1], 0);
    if (gm.id === 'verb') {
      const on = PH.cats || [];
      body = mk(gm.name, lvName) + `<div class="ph-sec">Select at least one tense</div><div class="ph-cats"><button class="ph-cat all" data-act="phTenseAll"><span class="e">⭐</span><div><b style="margin:0">Select all tenses</b><small>${tot} lessons</small></div></button>` + cs.map(([c, n]) => `<button class="ph-cat ${on.includes(c) ? 'on' : ''}" data-act="phTense" data-id="${esc(c)}"><span class="e">${on.includes(c) ? '✅' : catIcon(c)}</span><div><b>${esc(c)}</b><small>${n} lesson${n > 1 ? 's' : ''}</small></div></button>`).join('') + `</div>` +
        `<div class="ph-bar"><div class="sel">${on.length ? on.length + ' tense' + (on.length > 1 ? 's' : '') + ' selected' : 'No tense selected'}</div><button class="btn green" data-act="phTenseGo" ${on.length ? '' : 'disabled'}>Next</button></div>`;
    } else body = mk(gm.name, lvName) + `<div class="ph-sec">Choose a category</div><div class="ph-cats"><button class="ph-cat all" data-act="phCat" data-id=""><span class="e">⭐</span><div><b style="margin:0">All categories</b><small>${tot} lessons</small></div></button>` + cs.map(([c, n]) => `<button class="ph-cat" data-act="phCat" data-id="${esc(c)}"><span class="e">${catIcon(c)}</span><div><b>${esc(c)}</b><small>${n} lesson${n > 1 ? 's' : ''}</small></div></button>`).join('') + '</div>';
  } else if (P.step === 'opts') {
    const o = P.opt, r = (on, id, txt, sub) => `<button class="ph-opt ${on ? 'on' : ''}" data-act="phOpt" data-id="${id}"><span class="r"></span><div><b>${txt}</b><div class="mute small">${sub}</div></div></button>`;
    title = 'Verb Trainer'; 
    body = mk(gm.name, lvName, 'Options') + `<div class="ph-sec">Game mode</div>` + r(o.mode === 'practice', 'mode:practice', 'Practice mode', 'Unlimited time, answer shown after every question') + r(o.mode === 'normal', 'mode:normal', 'Normal mode', 'Race the clock: choose how many minutes') + r(o.mode === 'test', 'mode:test', 'Test mode', 'No feedback until the end, then review your mistakes') +
      (o.mode === 'test' ? `<div class="ph-sec">Number of questions</div><div style="display:flex;flex-wrap:wrap;gap:8px">${[10, 20, 30, 40, 50].map((n) => `<button class="ph-pron ${+o.n === n ? 'on' : ''}" data-act="phOpt" data-id="n:${n}">${n}</button>`).join('')}</div>` : '') + (o.mode === 'normal' ? `<div class="ph-sec">Time limit (minutes)</div><div style="display:flex;flex-wrap:wrap;gap:8px">${[1, 2, 3, 5, 7, 10, 15].map((n) => `<button class="ph-pron ${+o.min === n ? 'on' : ''}" data-act="phOpt" data-id="min:${n}">${n}</button>`).join('')}</div>` : '') + `<div class="ph-sec">Question order</div>` + r(o.order === 'normal', 'order:normal', 'Normal order', 'Verb by verb, je to ils') + r(o.order === 'random', 'order:random', 'Random order', 'Mixed up') +
      `<div class="ph-sec">Pronouns</div><div style="display:flex;flex-wrap:wrap;gap:8px">${['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'].map((n, i) => `<button class="ph-pron ${o.pron.includes(i) ? 'on' : ''}" data-act="phPron" data-id="${i}">${n}</button>`).join('')}</div>` +
      `<div class="ph-bar"><div class="sel">${o.mode[0].toUpperCase() + o.mode.slice(1)}${o.mode === 'test' ? ' · ' + o.n + ' q' : o.mode === 'normal' ? ' · ' + o.min + ' min' : ''} · ${o.order} · ${o.pron.length} pronoun${o.pron.length > 1 ? 's' : ''}</div><button class="btn green" data-act="phStart" ${o.pron.length ? '' : 'disabled'}>Start</button></div>`;
  } else {
    title = gm.name;
    const q = P.q.toLowerCase(), list = hubLessons().filter((l) => !q || (l.title + ' ' + l.topic).toLowerCase().includes(q));
    const cat = P.cat || (P.cats && P.cats.length && P.cats.length < 8 ? P.cats.join(', ') : '');
    body = mk(gm.name, lvName, cat) + `<input id="phQ" type="text" placeholder="🔎  Search lessons" value="${esc(P.q)}" style="margin-bottom:14px">` + list.map((l) => {
      const on = P.sel.includes(l.id), sub = l.topic && l.title.startsWith(l.topic + ': ') ? l.title.slice(l.topic.length + 2) : l.title;
      return `<button class="ph-les ${on ? 'on' : ''}" data-act="phPick" data-id="${esc(l.id)}"><span class="ck">${on ? '✓' : ''}</span><div class="t">${esc(sub)}<div class="m">${esc(l.topic || '')} · ${l.n} items</div></div><span class="chip">${KIND_NAME[l.kind]}</span></button>`;
    }).join('') + (list.length ? '' : '<div class="card mute">No lessons match.</div>') +
      `<div class="ph-bar"><div class="sel">${P.sel.length ? P.sel.length + ((P.game === 'work' || (typeof BOARDS !== 'undefined' && BOARDS[P.game])) ? ' lesson selected' : ' of 3 selected') : ((P.game === 'work' || (typeof BOARDS !== 'undefined' && BOARDS[P.game])) ? 'Pick a lesson' : 'Pick up to 3 lessons')}<small>${P.sel.length ? 'Tap a lesson again to remove it' : list.length + ' lessons here'}</small></div><button class="btn green" data-act="phGo" ${P.sel.length ? '' : 'disabled'}>${P.game === 'verb' ? 'Next' : 'Start'}</button></div>`;
  }
  $('#app').innerHTML = `<div class="sbody"><div class="stop"><button class="icon-btn" data-act="phBack" title="Back">←</button><div style="font-weight:800;font-size:18px">${esc(title)}</div><span style="width:40px"></span></div>${body}</div>`;
  const qi = $('#phQ'); if (qi) qi.addEventListener('input', (e) => { PH.q = e.target.value; const p = e.target.selectionStart; drawHub(); const i = $('#phQ'); i.focus(); i.setSelectionRange(p, p); });
}
ACT.phGame = (t) => { PH.game = t.dataset.id; PH.step = t.dataset.id === 'work' ? 'wmod' : 'level'; PH.sel = []; drawHub(); };
ACT.phLevel = (t) => { PH.level = t.dataset.id; PH.step = 'cat'; PH.cat = ''; PH.cats = []; PH.sel = []; PH.q = ''; drawHub(); };
ACT.phTense = (t) => { const c = PH.cats || (PH.cats = []), i = c.indexOf(t.dataset.id); if (i >= 0) c.splice(i, 1); else c.push(t.dataset.id); drawHub(); };
ACT.phTenseAll = () => { PH.cats = hubCats().map((c) => c[0]); drawHub(); };
ACT.phTenseGo = () => { if (PH.cats && PH.cats.length) { PH.step = 'lessons'; PH.sel = []; PH.q = ''; drawHub(); } };
ACT.phOpt = (t) => { const [k, v] = t.dataset.id.split(':'); PH.opt[k] = v; drawHub(); };
ACT.phPron = (t) => { const i = +t.dataset.id, p = PH.opt.pron, j = p.indexOf(i); if (j >= 0) p.splice(j, 1); else p.push(i); p.sort(); drawHub(); };
ACT.phStart = () => { if (!PH.opt.pron.length) return; try { sessionStorage.setItem('vopt', JSON.stringify(PH.opt)); } catch (e) { /* ignore */ } PH.keep = 'opts'; go('#/s/practice/play/verb/' + PH.level + '/' + PH.sel.join(',')); };
ACT.phCat = (t) => { PH.cat = t.dataset.id || ''; PH.step = 'lessons'; PH.sel = []; PH.q = ''; drawHub(); };
ACT.phPick = (t) => { const id = t.dataset.id, i = PH.sel.indexOf(id); if (i >= 0) PH.sel.splice(i, 1); else if (PH.game === 'work' || (typeof BOARDS !== 'undefined' && BOARDS[PH.game])) PH.sel = [id]; else if (PH.sel.length < 3) PH.sel.push(id); else toast('You can pick up to 3 lessons'); drawHub(); };
ACT.phAgain = () => { const u = PH_AGAIN; if (location.hash === u) route(); else go(u); };
ACT.phHub = () => { if (PH) { PH.step = 'game'; PH.keep = null; } go('#/s/practice'); };
ACT.phBack = () => { if (PH.step === 'opts') { PH.step = 'lessons'; drawHub(); } else if (PH.step === 'lessons') { PH.step = 'cat'; drawHub(); } else if (PH.step === 'cat') { PH.step = 'level'; drawHub(); } else if (PH.step === 'level') { PH.step = 'game'; drawHub(); } else go(typeof T !== 'undefined' && T.name ? '#/t' : '#/s'); };
ACT.phGo = () => { if (PH.sel.length && typeof BOARDS !== 'undefined' && BOARDS[PH.game]) { PH.keep = 'lessons'; go('#/s/practice/board/' + PH.game + '/' + PH.level + '/' + PH.sel[0]); } else if (PH.sel.length && PH.game === 'verb') { PH.step = 'opts'; drawHub(); } else if (PH.sel.length && PH.game === 'work') { PH.keep = 'lessons'; go('#/s/practice/workout/' + PH.level + '/' + PH.sel[0]); } else if (PH.sel.length) { PH.keep = 'lessons'; go('#/s/practice/play/' + PH.game + '/' + PH.level + '/' + PH.sel.join(',')); } };
ROUTES.push([/^\/s\/practice\/play\/(\w+)\/(\w+)\/([\w,-]+)$/, async (game, level, ids) => {
  startHeartbeat(); ST.hw = null;
  const g = gameOf(game); if (!g) return go('#/s/practice');
  const d = await api('/student/practice/lessons?ids=' + encodeURIComponent(ids));
  VOICE.cloud = !!d.tts; ST.lang = 'fr-FR';
  const data = { items: [], verbs: [], grammar: [], N: 1, li: 0 };
  d.lessons.forEach((l) => { l.items.forEach((i) => (i.g ? data.grammar : data.items).push(i)); data.verbs.push(...l.verbs); });
  const build = () => {
    const out = [];
    g.kinds.forEach(([k, n]) => {
      let qs = []; try { qs = buildQuestions(k, data); } catch (e) { qs = []; }
      if (g.fast) qs = qs.filter((q) => q.t === 'pick');
      out.push(...shuffle(qs).slice(0, n));
    });
    return g.fast ? shuffle(out) : out;
  };
  let vopt = null;
  if (game === 'verb') {
    try { vopt = JSON.parse(sessionStorage.getItem('vopt') || 'null'); } catch (e) { vopt = null; }
    vopt = Object.assign({ n: '20', min: '5' }, vopt || { mode: 'practice', order: 'random', pron: [0, 1, 2, 3, 4, 5] });
  }
  const buildVerb = () => {
    const out = [];
    data.verbs.forEach((v) => vopt.pron.forEach((i) => {
      const form = v.forms[i], pr = pronounFor(i, form), prompt = pr + ' ____  (' + v.inf + ')', sub = [v.en, v.tense].filter(Boolean).join(' · ');
      const asPick = vopt.mode === 'practice' && Math.random() < 0.4;
      if (asPick) { const wrong = shuffle([...new Set(v.forms.filter((f) => f !== form))]).slice(0, 3); out.push({ t: 'pick', title: 'Pick the correct form', prompt, sub, opts: shuffle([form].concat(wrong)), answer: form, afterSay: pr + ' ' + form, total: 1 }); }
      else out.push({ t: 'type', title: 'Conjugate the verb', prompt, sub, answer: form, afterSay: pr + ' ' + form, total: 1 });
    }));
    const lim = vopt.mode === 'test' ? +vopt.n || 20 : 72; return vopt.order === 'random' ? shuffle(out).slice(0, Math.min(lim, 60 + (vopt.mode === 'test' ? 10 : 0))) : out.slice(0, lim);
  };
  let qs = vopt ? buildVerb() : build();
  if (!g.fast && !vopt) qs = qs.slice(0, 40);
  if (!qs.length) { toast('Not enough content in these lessons for this game'); return go('#/s/practice'); }
  G = { id: 'practice', kind: game, lang: 'fr-FR', queue: qs, idx: 0, planned: qs.length, answered: 0, score: 0, total: qs.reduce((n, q) => n + q.total, 0), t0: Date.now(), coins: 0, phase: 'ask', st: {}, staged: false, stageN: [0, 0, 0], stageA: [0, 0, 0], right: 0, asked: 0, practice: { game, level, ids: ids.split(','), mode: vopt ? vopt.mode : '' } };
  if (vopt) { G.vmode = vopt.mode; G.noRetry = vopt.mode !== 'practice'; G.miss = []; if (vopt.mode === 'normal') G.endAt = Date.now() + (+vopt.min || 5) * 60000; }
  if (g.fast) { Object.assign(G, { fast: true, mode: g.fast, lives: 3, climb: 0, top: 10, endAt: Date.now() + (g.fast === 'climb' ? 60000 : 120000), refill: () => build().filter((q) => !q.retry) }); G.planned = 999; }
  let tick = null;
  if (G.vmode === 'normal') tick = setInterval(() => { if (!G) return; const left = Math.max(0, Math.ceil((G.endAt - Date.now()) / 1000)), el = $('#gQT'); if (el) { el.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); el.parentElement.style.color = left <= 15 ? '#DC2626' : ''; } if (left <= 0 && G.phase === 'ask') { clearInterval(tick); finishPlay(); } }, 400);
  if (G.mode === 'box' || G.mode === 'abox' || G.mode === 'climb') tick = setInterval(() => { if (!G) return; const left = Math.ceil((G.endAt - Date.now()) / 1000), el = $('#gClock'); if (el) el.textContent =  Math.floor(Math.max(0, left) / 60) + ':' + String(Math.max(0, left) % 60).padStart(2, '0'); if (left <= 0 && G.phase === 'ask') { clearInterval(tick); finishPlay(); } }, 500);
  cleanup = () => { if (tick) clearInterval(tick); stopSpeech(); G = null; };
  await waitVoices();
  nextQ();
}]);
/* ---- helpers for questions ---- */
const canSpeak = () => VOICE.cloud || (hasTTS && voicesFor((G && G.lang) || ST.lang || 'fr-FR').length > 0);
const waitVoices = () => new Promise((res) => { if (VOICE.cloud || !hasTTS || voicesFor(ST.lang || 'fr-FR').length) return res(); let n = 0; const t = setInterval(() => { if (voicesFor(ST.lang || 'fr-FR').length || ++n > 12) { clearInterval(t); res(); } }, 100); });
const say = (text, slow) => { if (G) speakText(text, G.lang, slow); };
const toks = (s) => s.split(/\s+/).filter(Boolean);
const lc = (s) => s.toLowerCase();
const normT = (s) => String(s).toLowerCase().replace(/[’]/g, "'").replace(/[.,!?;:«»"¡¿]/g, '').replace(/\s+/g, ' ').trim();
const stripAcc = (s) => normT(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
function checkTyped(input, answer) {
  if (normT(input) === normT(answer)) return 'ok';
  if (stripAcc(input) === stripAcc(answer)) return 'accent';
  return 'bad';
}
const coreWord = (w) => w.replace(/[.,!?;:]+$/, '');
function distractors(sentence, items, n) {
  const mine = new Set(toks(sentence).map((t) => lc(coreWord(t))));
  const pool = [];
  items.forEach((it) => { if (it.fr !== sentence) toks(it.fr).forEach((t) => { const c = coreWord(t); if (/[\p{L}]/u.test(c) && !mine.has(lc(c)) && c.length > 1) pool.push(c); }); });
  return shuffle([...new Set(pool.map(lc))]).slice(0, n);
}
const ACCENTS = { 'fr-FR': ['é', 'è', 'ê', 'à', 'â', 'ç', 'ù', 'û', 'î', 'ï', 'ô', 'œ', 'ë'], 'es-ES': ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'] };

function buildQuestions(kind, data) {
  if (/^L\d+$/.test(kind)) return buildLesson(data);
  const items = data.items, verbs = data.verbs || [], gram = data.grammar || [];
  const words = items.filter((i) => !i.s), sents = items.filter((i) => i.s);
  const pool = words.length >= 4 ? words : items;
  const qs = [];
  const take = (arr, n) => shuffle(arr).slice(0, n);
  const others = (it, arr, n) => shuffle(arr.filter((x) => x !== it)).slice(0, n);
  if (kind === 'match') {
    const p = take(pool, 15), boards = Math.max(1, Math.ceil(p.length / 5));
    for (let b = 0; b < boards; b++) { const part = p.filter((_, i) => i % boards === b); if (part.length) qs.push({ t: 'match', pairs: part, total: part.length }); }
  } else if (kind === 'translate') {
    take(pool, 8).forEach((it) => qs.push({ t: 'pick', title: 'Translate this', prompt: it.en, opts: shuffle([it].concat(others(it, pool, 2))).map((o) => o.fr), answer: it.fr, say: it.fr, speakOpts: true, total: 1 }));
  } else if (kind === 'meaning') {
    take(pool, 8).forEach((it) => qs.push({ t: 'pick', title: 'What does this mean?', prompt: it.fr, speak: it.fr, opts: shuffle([it].concat(others(it, pool, 3))).map((o) => o.en), answer: it.en, say: it.fr, total: 1 }));
  } else if (kind === 'audmean') {
    take(items, 12).forEach((it) => qs.push({ t: 'pick', title: 'Listen: what does it mean?', audio: it.fr, opts: shuffle([it].concat(others(it, items, 3))).map((o) => o.en), answer: it.en, say: it.fr, total: 1 }));
  } else if (kind === 'flash') {
    take(pool, 8).forEach((it) => qs.push({ t: 'flash', fr: it.fr, en: it.en, total: 1 }));
  } else if (kind === 'typeit') {
    take(pool, 8).forEach((it) => qs.push({ t: 'type', title: 'Type this in ' + (G.lang === 'es-ES' ? 'Spanish' : 'French'), prompt: it.en, answer: it.fr, say: it.fr, total: 1 }));
  } else if (kind === 'article') {
    const nouns = words.map((w) => Object.assign({ p: parseArticle(w.fr) }, w)).filter((w) => w.p);
    const used = [...new Set(nouns.map((n) => n.p.art))];
    take(nouns, 8).forEach((n) => {
      let arts = used.slice(); ['le', 'la', "l'"].forEach((a) => { if (arts.length < 3 && !arts.includes(a)) arts.push(a); });
      arts = shuffle(arts.filter((a) => a !== n.p.art)).slice(0, 3).concat([n.p.art]);
      qs.push({ t: 'pick', title: 'Which article goes with this word?', prompt: n.p.noun, sub: n.en, opts: shuffle(arts), answer: n.p.art, say: n.fr, correctText: n.fr, total: 1 });
    });
  } else if (kind === 'truefalse') {
    take(pool, 8).forEach((it, i) => {
      const truth = i % 2 === 0, wrong = others(it, pool.filter((x) => x.en !== it.en), 1)[0];
      const shown = truth || !wrong ? it.en : wrong.en, isTrue = shown === it.en;
      qs.push({ t: 'pick', title: 'Is this translation right?', prompt: it.fr + '  =  ' + shown, speak: it.fr, opts: ['True', 'False'], answer: isTrue ? 'True' : 'False', say: it.fr, correctText: it.fr + ' = ' + it.en, total: 1 });
    });
  } else if (kind === 'listen') {
    take(pool, 8).forEach((it) => {
      const opts = shuffle([it].concat(others(it, pool, 2)));
      if (canSpeak()) qs.push({ t: 'pick', title: 'What do you hear?', audio: it.fr, opts: opts.map((o) => o.fr), answer: it.fr, say: it.fr, speakOpts: true, total: 1 });
      else qs.push({ t: 'pick', title: 'What does this mean?', prompt: it.fr, opts: opts.map((o) => o.en), answer: it.en, total: 1 });
    });
  } else if (kind === 'dictation') {
    take(items, 8).forEach((it) => {
      if (canSpeak()) qs.push({ t: 'type', title: 'Type what you hear', audio: it.fr, sub: it.s ? 'A sentence. Listen as many times as you like.' : '', answer: it.fr, total: 1 });
      else qs.push({ t: 'type', title: 'Type this in French', prompt: it.en, answer: it.fr, total: 1 });
    });
  } else if (kind === 'tap' || kind === 'build') {
    take(sents, 6).forEach((it) => {
      const tk = toks(it.fr), extra = distractors(it.fr, items, 3);
      qs.push({ t: 'tap', noAudio: kind === 'build', title: kind === 'build' ? 'Translate this sentence' : null, sentence: it.fr, hint: it.en, tokens: tk, bank: shuffle(tk.map((x) => ({ w: x })).concat(extra.map((x) => ({ w: x })))), total: 1 });
    });
  } else if (kind === 'spaces') {
    take(sents, 6).forEach((it) => {
      const tk = toks(it.fr);
      qs.push({ t: 'spaces', sentence: it.fr, hint: it.en, chars: Array.from(tk.join('')), expect: tk.reduce((a, w, i) => { if (i < tk.length - 1) a.push((a.length ? a[a.length - 1] : 0) + Array.from(w).length); return a; }, []), total: 1 });
    });
  } else if (kind === 'odd') {
    take(sents, 6).forEach((it) => {
      const tk = toks(it.fr), extra = distractors(it.fr, items, 2);
      qs.push({ t: 'odd', sentence: it.fr, hint: it.en, extras: extra, bank: shuffle(tk.map((x) => ({ w: x, x: false })).concat(extra.map((x) => ({ w: x, x: true })))), total: 1 });
    });
  } else if (kind === 'cloze') {
    take(sents, 8).forEach((it) => {
      const tk = toks(it.fr);
      const cand = tk.map((t, i) => i).filter((i) => coreWord(tk[i]).length >= 3);
      const bi = (cand.length ? cand : tk.map((t, i) => i))[Math.floor(Math.random() * (cand.length || tk.length))];
      const ans = coreWord(tk[bi]), tail = tk[bi].slice(ans.length);
      const shown = tk.map((t, i) => (i === bi ? '____' + tail : t)).join(' ');
      const wrong = distractors(it.fr, items, 2);
      qs.push({ t: 'pick', title: 'Choose the missing word', prompt: shown, sub: it.en, opts: shuffle([ans].concat(wrong)), answer: ans, afterSay: it.fr, correctText: it.fr, total: 1 });
    });
  } else if (kind === 'conjpick' || kind === 'conjtype') {
    const combos = [];
    verbs.forEach((v) => v.forms.forEach((f, i) => combos.push({ v, i })));
    take(combos, 8).forEach(({ v, i }) => {
      const form = v.forms[i], pr = pronounFor(i, form), prompt = pr + ' ____  (' + v.inf + ')', sub = [v.en, v.tense].filter(Boolean).join(' · ');
      if (kind === 'conjtype') qs.push({ t: 'type', title: 'Conjugate the verb', prompt, sub, answer: form, afterSay: pr + ' ' + form, total: 1 });
      else {
        const wrong = shuffle([...new Set(v.forms.filter((f) => f !== form))]).slice(0, 3);
        qs.push({ t: 'pick', title: 'Pick the correct form', prompt, sub, opts: shuffle([form].concat(wrong)), answer: form, afterSay: pr + ' ' + form, total: 1 });
      }
    });
  } else if (kind === 'conjmatch') {
    take(verbs, 3).forEach((v) => qs.push({ t: 'match', noSpeak: true, title: 'Match the forms of ' + v.inf + (v.tense ? ' (' + v.tense + ')' : ''), pairs: v.forms.map((f, i) => ({ fr: pronounFor(i, f), en: f })), total: 6 }));
  } else if (kind === 'gappick') {
    take(gram.filter((g) => g.o && g.o.length), 8).forEach((g) => qs.push({ t: 'pick', title: 'Choose the correct word', prompt: g.s.replace('___', '____'), sub: g.h, opts: shuffle([g.a].concat(g.o.slice(0, 3))), answer: g.a, afterSay: g.s.replace('___', g.a), correctText: g.s.replace('___', g.a), total: 1 }));
  } else if (kind === 'gaptype') {
    take(gram, 8).forEach((g) => qs.push({ t: 'type', title: 'Type the missing word', prompt: g.s.replace('___', '____'), sub: g.h, answer: g.a, afterSay: g.s.replace('___', g.a), total: 1 }));
  }
  return qs;
}


/* ---- mixed lessons: three stages (see and match, hear and produce, sentences) ---- */
function buildLesson(data) {
  const items = data.items, N = Math.max(1, data.N || 1), li = Math.max(0, data.li || 0);
  const verbs = data.verbs || [], gram = data.grammar || [];
  const words = items.filter((i) => !i.s), sents = items.filter((i) => i.s);
  const pool = words.length >= 4 ? words : items;
  const aud = canSpeak();
  const win = (arr, n) => { const out = []; if (!arr.length) return out; const st = Math.floor(li * arr.length / N); for (let i = 0; i < Math.min(n, arr.length); i++) out.push(arr[(st + i) % arr.length]); return out; };
  const W = shuffle(win(pool, Math.max(8, Math.ceil(pool.length / N)))), S = shuffle(win(sents, Math.max(5, Math.ceil(sents.length / N))));
  const w = (i) => W[i % W.length], sn = (i) => (S.length ? S[i % S.length] : null);
  const others = (it, arr, n) => shuffle(arr.filter((x) => x !== it && x.en !== it.en && x.fr !== it.fr)).slice(0, n);
  const noPunct = (x) => x.replace(/\s*[.?!]+$/, '');
  const cap = (x) => x;
  const enToks = (en, avoid, n) => {
    const mine = new Set(toks(noPunct(en)).map(lc)), p = [];
    items.forEach((it) => { if (it.en !== en) toks(noPunct(it.en)).forEach((t) => { const c = coreWord(t); if (/[\p{L}]/u.test(c) && c.length > 1 && !mine.has(lc(c))) p.push(c); }); });
    return shuffle([...new Set(p.map(lc))]).slice(0, n);
  };
  const frExtra = (it, n) => { const d = (it.d || []).filter(Boolean).slice(0, n); return d.length >= n ? d : d.concat(distractors(it.fr, items, n - d.length)); };
  const keyOf = (it) => {
    const tk = toks(it.fr).map(coreWord);
    if (it.k && tk.includes(coreWord(it.k))) return coreWord(it.k);
    const cand = tk.filter((t) => t.length >= 3); return (cand.length ? cand : tk)[Math.floor(Math.random() * (cand.length || tk.length))];
  };
  // --- vocabulary questions
  const qMatch = (arr, audioL) => ({ t: 'match', title: 'Tap the matching pairs', pairs: arr, audioL: audioL && aud, total: arr.length });
  const qEnFr = (it) => ({ t: 'pick', title: 'Translate this', prompt: it.en, opts: shuffle([it].concat(others(it, pool, 2))).map((o) => o.fr), answer: it.fr, say: it.fr, speakOpts: true, total: 1 });
  const qEnFrAud = (it) => (aud ? { t: 'pick', title: 'Pick the French you hear', prompt: it.en, opts: shuffle([it].concat(others(it, pool, 2))).map((o) => o.fr), answer: it.fr, audioOpts: true, speakOpts: true, say: it.fr, total: 1 } : qEnFr(it));
  const qHearEnWord = (it) => (aud ? { t: 'pick', title: 'Translate the French audio', audio: it.fr, opts: shuffle([it].concat(others(it, pool, 2))).map((o) => o.en), answer: it.en, say: it.fr, total: 1 }
    : { t: 'pick', title: 'What does this mean?', prompt: it.fr, opts: shuffle([it].concat(others(it, pool, 2))).map((o) => o.en), answer: it.en, say: it.fr, total: 1 });
  const qHearPick = (it) => (aud ? { t: 'pick', title: 'What do you hear?', audio: it.fr, opts: shuffle([it].concat(others(it, pool, 2))).map((o) => o.fr), answer: it.fr, say: it.fr, speakOpts: true, total: 1 } : qEnFr(it));
  const qTypeIt = (it) => ({ t: 'type', title: 'Type this in ' + (G.lang === 'es-ES' ? 'Spanish' : 'French'), prompt: it.en, answer: it.fr, say: it.fr, total: 1 });
  // --- sentence questions
  const qTapHear = (s) => { const tk = toks(noPunct(s.fr)), ex = frExtra(s, 3); return { t: 'tap', noAudio: !aud, title: aud ? 'Tap what you hear' : 'Build this sentence', sentence: s.fr, hint: aud ? '' : s.en, tokens: tk, bank: shuffle(tk.map((x) => ({ w: x })).concat(ex.map((x) => ({ w: x })))), total: 1 }; };
  const qBuildFr = (s) => { const tk = toks(noPunct(s.fr)), ex = frExtra(s, 3); return { t: 'tap', noAudio: true, title: 'Translate this sentence', sentence: s.fr, hint: s.en, tokens: tk, bank: shuffle(tk.map((x) => ({ w: x })).concat(ex.map((x) => ({ w: x })))), total: 1 }; };
  const qHearBuildEn = (s) => { const tk = toks(noPunct(s.en)), ex = enToks(s.en, null, 3); return { t: 'tap', enBuild: true, noAudio: !aud, title: aud ? 'Translate what you hear' : 'Translate this sentence', sentence: s.fr, hint: aud ? '' : s.fr, answerText: noPunct(s.en), tokens: tk, bank: shuffle(tk.map((x) => ({ w: x })).concat(ex.map((x) => ({ w: x })))), total: 1 }; };
  const qGap = (s) => {
    const tk = toks(s.fr), key = keyOf(s);
    let done = false;
    const shown = tk.map((t) => { if (!done && coreWord(t) === key) { done = true; return '____' + t.slice(key.length); } return t; }).join(' ');
    return { t: 'type', title: 'Spell the missing word', audio: aud ? s.fr : null, prompt: shown, sub: aud ? '' : s.en, answer: key, afterSay: s.fr, total: 1 };
  };
  const qOdd = (s) => { const tk = toks(noPunct(s.fr)), ex = frExtra(s, 2); return { t: 'odd', sentence: s.fr, hint: aud ? '' : s.en, extras: ex, bank: shuffle(tk.map((x) => ({ w: x, x: false })).concat(ex.map((x) => ({ w: x, x: true })))), total: 1 }; };
  const qHearEnSent = (s) => {
    const opts = shuffle([s.en].concat(shuffle(sents.filter((x) => x.en !== s.en)).slice(0, 2).map((x) => x.en)));
    return aud ? { t: 'pick', title: 'Translate the French audio', audio: s.fr, opts, answer: s.en, say: s.fr, total: 1 } : { t: 'pick', title: 'What does this mean?', prompt: s.fr, opts, answer: s.en, say: s.fr, total: 1 };
  };
  const qHearSpell = (s) => {
    const key = keyOf(s), alts = [];
    (s.d || []).forEach((d) => { let done = false; const v = toks(s.fr).map((t) => { if (!done && coreWord(t) === key) { done = true; return d + t.slice(key.length); } return t; }).join(' '); if (v !== s.fr) alts.push(v); });
    if (alts.length < 2) shuffle(sents.filter((x) => x.fr !== s.fr)).slice(0, 2 - alts.length).forEach((x) => alts.push(x.fr));
    const opts = shuffle([s.fr].concat(alts.slice(0, 2)));
    return aud ? { t: 'pick', title: 'Which sentence do you hear?', audio: s.fr, opts, answer: s.fr, say: s.fr, total: 1 } : qBuildFr(s);
  };
  const qDict = (s) => (aud ? { t: 'type', title: 'Type what you hear', audio: s.fr, sub: 'A sentence. Listen as many times as you like.', answer: s.fr, total: 1 } : { t: 'type', title: 'Type this in French', prompt: s.en, answer: s.fr, total: 1 });
  const hasS = S.length > 0;
  const st1 = [qMatch(W.slice(0, 5)), qEnFr(w(5)), qMatch(W.slice(1, 5), true), qEnFrAud(w(6)), qHearEnWord(w(7))];
  const st2 = hasS ? [qTapHear(sn(0)), qGap(sn(1)), qHearBuildEn(sn(2)), qHearSpell(sn(3)), qEnFrAud(w(2)), qHearPick(w(3))]
    : [qHearPick(w(0)), qEnFrAud(w(1)), qHearEnWord(w(2)), qMatch(W.slice(2, 7), true), qTypeIt(w(3)), qHearPick(w(4))];
  const st3 = hasS ? [qBuildFr(sn(4)), qOdd(sn(0)), qHearEnSent(sn(1)), qDict(sn(2)), qBuildFr(sn(3)), qTypeIt(w(1))]
    : [qTypeIt(w(0)), qHearEnWord(w(5)), qEnFr(w(6)), qTypeIt(w(7)), qMatch(W.slice(0, 5)), qHearPick(w(2))];
  gram.filter((g) => g.o && g.o.length).slice(0, 1).forEach((g) => st3.push({ t: 'pick', title: 'Choose the correct word', prompt: g.s.replace('___', '____'), sub: g.h, opts: shuffle([g.a].concat(g.o.slice(0, 3))), answer: g.a, afterSay: g.s.replace('___', g.a), correctText: g.s.replace('___', g.a), total: 1 }));
  verbs.slice(0, 1).forEach((v) => { const i = Math.floor(Math.random() * 6), form = v.forms[i], pr = pronounFor(i, form); st3.push({ t: 'type', title: 'Conjugate the verb', prompt: pr + ' ____  (' + v.inf + ')', sub: [v.en, v.tense].filter(Boolean).join(' · '), answer: form, afterSay: pr + ' ' + form, total: 1 }); });
  const qs = [];
  [st1, st2, st3].forEach((st, si) => st.forEach((q) => { if (q && (q.t !== 'match' || q.pairs.length >= 2)) { q.stage = si + 1; qs.push(q); } }));
  return qs;
}

/* ---- play ---- */
let G = null;
ROUTES.push([/^\/s\/play\/(\w+)\/(\w+)$/, async (id, kind) => {
  startHeartbeat(); ST.hw = id;
  const d = await api('/student/homework/' + id);
  if (!d.hw.exercises.includes(kind)) return go('#/s/hw/' + id);
  STUDY_SECS = d.need || STUDY_SECS;
  if ((d.study || 0) < STUDY_SECS) return go('#/s/study/' + id);
  VOICE.cloud = !!d.tts;
  G = { id, kind, lang: langOf(d.hw.language), queue: [], idx: 0, planned: 0, answered: 0, score: 0, total: 0, t0: Date.now(), coins: d.coins, phase: 'ask', st: {} };
  await waitVoices();
  if (!canSpeak()) toast('No French voice found on this device, so audio questions may be silent. Tap 🔊 on the home screen to choose a voice.');
  const qs = buildQuestions(kind, { items: d.hw.items, verbs: (d.hw.extra || {}).verbs, grammar: (d.hw.extra || {}).grammar, N: d.hw.exercises.length, li: d.hw.exercises.indexOf(kind) });
  if (!qs.length) { toast('Not enough content for this activity'); return go('#/s/hw/' + id); }
  Object.assign(G, { queue: qs.slice(), planned: qs.length, total: qs.reduce((n, q) => n + q.total, 0), staged: qs.some((q) => q.stage), stageN: [0, 0, 0], stageA: [0, 0, 0], right: 0, asked: 0 });
  qs.forEach((q) => { if (q.stage) G.stageN[q.stage - 1]++; });
  cleanup = () => { stopSpeech(); G = null; };
  const pre = [];
  qs.forEach((q) => { [q.audio, q.say, q.afterSay, q.speak, q.afterSay, q.t === 'tap' && !q.noAudio ? q.sentence : null, q.t === 'spaces' || q.t === 'odd' ? q.sentence : null].forEach((x) => { if (x) pre.push(x); }); });
  prefetchVoice([...new Set(pre)].slice(0, 40), G.lang);
  nextQ();
}]);
const curQ = () => G.queue[G.idx];
function nextQ() {
  const q = curQ();
  G.phase = 'ask'; G.st = {};
  if (q.t === 'tap' || q.t === 'odd') G.st = { chosen: [] };
  if (q.t === 'spaces') G.st = { gaps: [], caret: Math.min(1, q.chars.length) };
  if (q.t === 'match') G.st = { sel: null, gotL: {}, gotR: {}, miss: {}, left: shuffle(q.pairs.map((_, i) => i)), right: shuffle(q.pairs.map((_, i) => i)) };
  if (q.t === 'pick') G.st = { sel: null };
  if (q.t === 'type') G.st = { val: '' };
  if (q.t === 'flash') G.st = { flip: false };
  drawPlay();
  if (q.audio) setTimeout(() => say(q.audio), 250);
  else if ((q.t === 'tap' && !q.noAudio) || q.t === 'spaces' || (q.t === 'odd' && canSpeak())) setTimeout(() => say(q.sentence), 250);
  else if (q.t === 'flash') setTimeout(() => say(q.fr), 250);
}
function typedValue() { return (G.st.val || '').trim(); }
function canCheck() {
  const q = curQ(), s = G.st;
  if (q.t === 'pick') return s.sel != null;
  if (q.t === 'tap' || q.t === 'odd') return s.chosen.length > 0;
  if (q.t === 'spaces') return s.gaps.length > 0;
  if (q.t === 'type') return typedValue().length > 0;
  return false;
}
const wave = (i) => Array.from({ length: 13 }, (_, k) => '<i style="height:' + (8 + ((k * 7 + i * 5) % 6) * 5) + 'px"></i>').join('');
const audioRow = (txt) => canSpeak() ? `<div class="audio"><button class="abtn" data-act="gSay" data-t="${esc(txt)}">${ICON_SPK}<span>Listen</span></button><button class="abtn slow" data-act="gSay" data-t="${esc(txt)}" data-slow="1" title="Slowly">${ICON_SLOW}</button></div>` : '';


function drawWall(q, s, ask) {
  if (!document.getElementById('wallCss')) {
    const st = document.createElement('style'); st.id = 'wallCss';
    st.textContent = `.wall{position:relative;width:100%;max-width:900px;box-sizing:border-box;margin:0 auto;border-radius:14px;overflow:hidden;min-height:520px;background:repeating-linear-gradient(0deg,#eef1f6 0 78px,#cfd6e2 78px 80px),#eef1f6;border:3px solid #cfd6e2}
.wall .wtop{padding-left:56px!important;display:flex;justify-content:space-between;align-items:center;padding:8px 16px;font-size:24px;font-weight:800;color:#12305a}
.wall .wq{margin:8px auto 0;width:min(80%,520px);background:#fff;border:3px solid #12305a;border-radius:10px;padding:14px 18px;text-align:center;font-size:20px;font-weight:700;color:#12305a;box-shadow:0 4px 10px #0002}
.wall .holds{display:grid;grid-template-columns:repeat(2,1fr);gap:22px 18px;padding:26px 90px 30px}
.wall .hold{border:0;border-radius:46% 54% 50% 50%/55% 45% 55% 45%;min-height:78px;font-size:16px;font-weight:700;color:#fff;cursor:pointer;padding:10px 14px;box-shadow:0 5px 0 #0003;transition:transform .15s}
.wall .hold:hover{transform:scale(1.05)}
.wall .hold:nth-child(1){background:#e74c3c}.wall .hold:nth-child(2){background:#3498db}.wall .hold:nth-child(3){background:#f39c12}.wall .hold:nth-child(4){background:#8e44ad}
.wall .hold.ok{background:#2ecc71!important}.wall .hold.bad{background:#555!important;animation:bagshake .3s}
.wall .climber{position:absolute;left:14px;font-size:44px;transition:bottom .5s}
.wall .rope{position:absolute;left:34px;bottom:0;top:0;width:4px;background:#9aa7bd}
.wall .top{position:absolute;left:8px;top:6px;font-size:24px}`;
    document.head.appendChild(st);
  }
  const clock = Math.max(0, Math.ceil((G.endAt - Date.now()) / 1000));
  const mm = Math.floor(clock / 60) + ':' + String(clock % 60).padStart(2, '0');
  const pos = 6 + Math.round(G.climb / G.top * 78);
  const holds = q.opts.map((o, i) => { let c = ''; if (!ask) c = o === q.answer ? ' ok' : (i === s.sel ? ' bad' : ''); return `<button class="hold${c}" data-act="gPick" data-i="${i}" ${ask ? '' : 'disabled'}>${esc(o)}</button>`; }).join('');
  $('#app').innerHTML = `<div class="play"><div class="ptop"><button class="icon-btn sq" data-act="gQuit" title="Back">🏠</button><div class="track"></div><span class="coins">⭐ ${G.score}</span></div><div class="wall"><div class="rope"></div><div class="top">🏁</div><div class="climber" style="bottom:${pos}%">🧗</div><div class="wtop"><span>⛰️ ${G.climb} / ${G.top}</span><span style="font-size:22px">${'❤️'.repeat(Math.max(0, G.lives))}${'🖤'.repeat(Math.max(0, 3 - G.lives))}</span><span><b id="gClock">${mm}</b></span></div><div class="wq">${esc(q.prompt || q.title)}</div><div class="holds">${holds}</div></div></div>`;
}
function drawRing(q, s, ask) {
  if (!document.getElementById('bxCss')) {
    const st = document.createElement('style'); st.id = 'bxCss';
    st.textContent = `.bx{position:relative;width:100%;max-width:940px;box-sizing:border-box;margin:0 auto;border-radius:14px;overflow:hidden;height:min(78vw,560px);min-height:440px;background:radial-gradient(circle at 18% 28%,#ff4fb4aa 0,transparent 24%),radial-gradient(circle at 82% 28%,#d84cffaa 0,transparent 24%),linear-gradient(#20093f,#43175f 55%,#7a2c86);font-family:Georgia,'Times New Roman',serif;color:#fff;user-select:none}
.bx *{box-sizing:border-box}
.bx-hud{position:absolute;left:0;right:0;top:0;height:50px;background:linear-gradient(#e9c88d,#d6a35a);color:#2b1a05;display:flex;align-items:center;justify-content:space-between;padding:0 18px;font-size:26px;font-weight:800;letter-spacing:1px;z-index:5;box-shadow:0 3px 8px #0006}
.bx-hud .hs{font-size:22px;letter-spacing:2px}
.bx-lights{position:absolute;top:56px;left:0;right:0;height:100px;pointer-events:none}
.bx-lights i{position:absolute;width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 0 12px 3px #fff9}
.bx-sign{position:absolute;top:62px;left:50%;transform:translateX(-50%);width:min(60%,420px);background:#fff;color:#2a2a2a;border:4px solid #b9372f;border-radius:6px;padding:12px 16px;text-align:center;font-size:clamp(15px,2.6vw,21px);line-height:1.25;min-height:62px;display:flex;align-items:center;justify-content:center;z-index:4;box-shadow:0 6px 14px #0007;animation:bxDrop .35s ease-out}
.bx-sign:before,.bx-sign:after{content:'★ ★ ★';position:absolute;left:0;right:0;text-align:center;color:#b9372f;font-size:12px;letter-spacing:6px}
.bx-sign:before{top:-18px}.bx-sign:after{bottom:-18px}
.bx-sign.hid{cursor:pointer;font-size:38px}
@keyframes bxDrop{from{transform:translate(-50%,-30px);opacity:0}}
.bx-bags{position:absolute;left:0;right:0;top:150px;bottom:92px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:0 10px;z-index:3}
.bx-bag{position:relative;border:0;background:none;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;transform-origin:50% -60px;transition:transform .2s}
.bx-bag:before{content:'';position:absolute;left:50%;top:-90px;height:90px;width:3px;background:#d8d8e0;transform:translateX(-50%)}
.bx-bag .bd{position:absolute;left:14%;right:14%;top:0;bottom:6%;border-radius:18px 18px 22px 22px;background:linear-gradient(90deg,#0a5e78,#19a5c9 40%,#0a5e78);box-shadow:inset 0 10px 0 #0b4a60,inset 0 -10px 0 #0b4a60,0 10px 20px #0007}
.bx-bag .lb{position:relative;z-index:1;background:#fff;color:#222;font-size:clamp(12px,1.8vw,16px);line-height:1.25;padding:12px 8px;width:112%;box-shadow:0 3px 8px #0006;text-align:center;transition:background .12s}
.bx-bag .lb:before,.bx-bag .lb:after{content:'';position:absolute;top:0;bottom:0;width:14px;background:#b6b6bc}
.bx-bag .lb:before{left:-14px;clip-path:polygon(100% 0,0 50%,100% 100%)}.bx-bag .lb:after{right:-14px;clip-path:polygon(0 0,100% 50%,0 100%)}
.bx-bag:not(:disabled):hover{transform:rotate(-2deg) scale(1.03)}
.bx-bag.hit{animation:bxSwing .9s ease-out}
@keyframes bxSwing{0%{transform:rotate(0)}18%{transform:rotate(14deg)}45%{transform:rotate(-9deg)}70%{transform:rotate(5deg)}100%{transform:rotate(0)}}
.bx-bag.ok .lb{background:#2ecc71;color:#fff}.bx-bag.ok .lb:before,.bx-bag.ok .lb:after{background:#1f9d54}
.bx-bag.bad .lb{background:#e74c3c;color:#fff}.bx-bag.bad .lb:before,.bx-bag.bad .lb:after{background:#b83a2d}
.bx-ring{position:absolute;left:0;right:0;bottom:0;height:92px;background:linear-gradient(transparent,#240a3dcc 40%,#e8a4a0 41%,#e8a4a0 46%,#2a1240 47%);z-index:2}
.bx-ring:before{content:'';position:absolute;left:8%;right:8%;top:30px;height:4px;background:#fff;box-shadow:0 14px 0 #fff,0 28px 0 #e0524b}
.bx-glove{position:absolute;bottom:-26px;font-size:92px;z-index:6;transition:left .18s,bottom .18s,transform .18s;filter:drop-shadow(0 6px 6px #0008)}
#bxL{left:36%;transform:rotate(-20deg)}#bxR{left:52%;transform:scaleX(-1) rotate(-20deg)}
.bx-tools{position:absolute;right:12px;top:58px;z-index:7;font-size:13px;display:flex;gap:10px;align-items:center;background:#0006;padding:5px 10px;border-radius:14px}
.bx-tools label{cursor:pointer}
@media(max-width:560px){.bx-bag .lb{padding:8px 4px}.bx-bag .bd{left:8%;right:8%}.bx-glove{font-size:70px}}`;
    document.head.appendChild(st);
  }
  const hearts = '❤️'.repeat(Math.max(0, G.lives)) + '🖤'.repeat(Math.max(0, 3 - G.lives));
  const clock = Math.max(0, Math.ceil((G.endAt - Date.now()) / 1000));
  const mm = Math.floor(clock / 60) + ':' + String(clock % 60).padStart(2, '0');
  const hide = G.mode === 'abox' && !G.showS;
  const sign = hide ? `<div class="bx-sign hid" data-act="gSay" data-t="${esc(q.audio)}">🔊</div>` : `<div class="bx-sign">${esc(q.prompt || q.audio)}</div>`;
  const bags = q.opts.map((o, i) => { let c = ''; if (!ask) c = o === q.answer ? ' ok' : (i === s.sel ? ' bad' : ''); if (!ask && i === s.sel) c += ' hit'; return `<button class="bx-bag${c}" data-act="gPick" data-i="${i}" ${ask ? '' : 'disabled'}><span class="bd"></span><span class="lb">${esc(o)}</span></button>`; }).join('');
  const bulbs = Array.from({ length: 12 }, (_, k) => `<i style="top:${(k % 2) * 22 + 6}px;left:${k < 6 ? 8 + Math.floor(k / 2) * 7 : 66 + Math.floor((k - 6) / 2) * 7}%"></i>`).join('');
  const tools = G.mode === 'abox' ? `<div class="bx-tools"><label><input type="checkbox" data-act="gShowS" ${G.showS ? 'checked' : ''}> Show sentence</label><button class="abtn" data-act="gSay" data-t="${esc(q.audio)}" style="display:inline-flex;padding:4px 8px">${ICON_SPK}<span>Replay</span></button></div>` : '';
  $('#app').innerHTML = `<div class="play"><div class="ptop"><button class="icon-btn sq" data-act="gQuit" title="Back">🏠</button><div class="track"></div><span class="coins">⭐ ${G.score}</span></div><div class="bx"><div class="bx-hud"><span>SCORE : ${G.right}</span><span class="hs">${hearts}</span><span><b id="gClock">${mm}</b></span></div><div class="bx-lights">${bulbs}</div>${tools}${sign}<div class="bx-bags">${bags}</div><div class="bx-ring"></div><div class="bx-glove" id="bxL">🥊</div><div class="bx-glove" id="bxR">🥊</div></div></div>`;
  if (!ask && s.sel != null) {
    const bags2 = document.querySelectorAll('.bx-bag'), b = bags2[s.sel], bx = document.querySelector('.bx');
    if (b && bx) { const r = b.getBoundingClientRect(), R = bx.getBoundingClientRect(), g = document.getElementById(s.sel % 2 ? 'bxR' : 'bxL'); if (g) { g.style.left = (r.left - R.left + r.width / 2 - 46) + 'px'; g.style.bottom = (R.bottom - r.bottom + r.height * 0.35) + 'px'; } }
  }
}
ACT.gShowS = () => { G.showS = !G.showS; drawPlay(); };
function drawPlay() {
  const q = curQ(), s = G.st, ask = G.phase === 'ask';
  if ((G.mode === 'box' || G.mode === 'abox') && q.t === 'pick') return drawRing(q, s, ask);
  if (G.mode === 'climb' && q.t === 'pick') return drawWall(q, s, ask);
  const pct = Math.round(G.answered / (G.planned + 0.0001) * 100);
  let body = '';
  const sub = (x) => (x ? `<div class="hint">${esc(x)}</div>` : '');
  if (q.t === 'pick') {
    body = `<h2>${esc(q.title)}</h2>${q.audio ? audioRow(q.audio) : ''}${q.prompt ? '<div class="prompt">' + esc(q.prompt) + '</div>' : ''}${q.speak ? audioRow(q.speak) : ''}${sub(q.sub)}` +
      q.opts.map((o, i) => { let c = ''; if (!ask) c = o === q.answer ? ' ok' : (i === s.sel ? ' bad' : ''); else if (i === s.sel) c = ' sel'; return `<button class="opt2${c}${q.audioOpts && ask ? ' aopt' : ''}" data-act="gPick" data-i="${i}" ${ask ? '' : 'disabled'}>${q.audioOpts && ask ? '<span class="wave">' + wave(i) + '</span>' : esc(o)}</button>`; }).join('');
  }
  if (q.t === 'type') {
    const acc = (ACCENTS[G.lang] || ACCENTS['fr-FR']).map((a) => `<button type="button" data-act="gAcc" data-c="${esc(a)}">${esc(a)}</button>`).join('');
    body = `<h2>${esc(q.title)}</h2>${q.audio ? audioRow(q.audio) : ''}${q.prompt ? '<div class="prompt">' + esc(q.prompt) + '</div>' : ''}${sub(q.sub)}
      <input id="ans" class="tin" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(s.val || '')}" ${ask ? '' : 'disabled'} placeholder="Type here">${ask ? '<div class="acc">' + acc + '</div>' : ''}`;
  }
  if (q.t === 'flash') {
    body = `<h2>Flashcard</h2><div class="flip ${s.flip ? 'back' : ''}" data-act="gFlip">${s.flip ? esc(q.en) : esc(q.fr) + '<div style="font-size:14px;font-weight:600;margin-top:12px;opacity:.7">Tap the card to flip</div>'}</div>${audioRow(q.fr)}`;
  }
  if (q.t === 'match') {
    body = `<h2>${esc(q.title || 'Tap the matching pairs')}</h2><div class="pairs"><div style="display:grid;gap:12px">${s.left.map((i) => `<button class="${s.gotL[i] ? 'got' : ''} ${s.sel === i ? 'sel' : ''} ${s.bad && s.bad[0] === i ? 'wrong' : ''}" data-act="mL" data-i="${i}">${q.audioL && !s.gotL[i] ? '<span class="wave">' + wave(i) + '</span>' : (canSpeak() && !q.noSpeak && !q.audioL ? '🔈 ' : '') + esc(q.pairs[i].fr)}</button>`).join('')}</div><div style="display:grid;gap:12px">${s.right.map((i) => `<button class="${s.gotR[i] ? 'got' : ''} ${s.bad && s.bad[1] === i ? 'wrong' : ''}" data-act="mR" data-i="${i}">${esc(q.pairs[i].en)}</button>`).join('')}</div></div>`;
  }
  if (q.t === 'tap') {
    const heading = q.title || (canSpeak() ? 'Tap what you hear' : 'Build this sentence');
    body = `<h2>${esc(heading)}</h2>${q.noAudio || !canSpeak() ? '' : audioRow(q.sentence)}${q.hint ? '<div class="prompt" style="font-size:' + (q.noAudio ? 20 : 16) + 'px">' + esc(q.hint) + '</div>' : ''}
      <div class="words ans">${s.chosen.map((bi, k) => `<button class="tile" data-act="gUntap" data-k="${k}" ${ask ? '' : 'disabled'}>${esc(q.bank[bi].w)}</button>`).join('')}</div>
      <div class="bank">${q.bank.map((b, i) => s.chosen.includes(i) ? '<span class="tile ghost">' + esc(b.w) + '</span>' : `<button class="tile" data-act="gTap" data-i="${i}" ${ask ? '' : 'disabled'}>${esc(b.w)}</button>`).join('')}</div>`;
  }
  if (q.t === 'odd') {
    body = `<h2>Pull out the words that don't belong</h2>${audioRow(q.sentence)}${q.hint ? '<div class="prompt" style="font-size:16px">' + esc(q.hint) + '</div>' : ''}
      <div class="words">${s.chosen.map((bi) => `<button class="tile" data-act="gUntap2" data-i="${bi}" ${ask ? '' : 'disabled'}>${esc(q.bank[bi].w)}</button>`).join('')}</div>
      <div class="bank" style="background:#eef1f8;border-radius:16px;padding:14px">${q.bank.map((b, i) => s.chosen.includes(i) ? '' : `<button class="tile" data-act="gPull" data-i="${i}" ${ask ? '' : 'disabled'}>${esc(b.w)}</button>`).join('')}</div>`;
  }
  if (q.t === 'spaces') {
    let sp = '';
    for (let i = 0; i <= q.chars.length; i++) {
      if (ask && s.caret === i) sp += '<span class="caret"></span>';
      if (i < q.chars.length) { sp += `<span class="ch" data-act="gCaret" data-i="${i + 1}">${esc(q.chars[i])}</span>`; if (s.gaps.includes(i + 1) && i + 1 < q.chars.length) sp += '<span class="sp"></span>'; }
    }
    body = `<h2>Add spaces where they belong</h2>${audioRow(q.sentence)}<div class="prompt" style="font-size:16px">${esc(q.hint)}</div><div class="spaces">${sp}</div>` +
      (ask ? '<div class="kbd"><button data-act="gBack" title="Delete space">⌫</button><button data-act="gLeft">‹</button><button class="space" data-act="gSpace">SPACE</button><button data-act="gRight">›</button></div>' : '');
  }
  let bottom = '';
  if (q.t === 'match') bottom = '';
  else if (q.t === 'flash') bottom = s.flip ? '<div class="row" style="gap:12px"><button class="btn red" style="flex:1;padding:15px" data-act="gAgain">Again 😅</button><button class="btn green" style="flex:1;padding:15px" data-act="gKnew">Got it 😀</button></div>' : '<button class="check-btn" data-act="gFlip">Show answer</button>';
  else if (ask) bottom = `<button class="check-btn" id="chk" data-act="gCheck" ${canCheck() ? '' : 'disabled'}>Check</button>`;
  else bottom = `<div class="fb ${G.ok ? 'ok' : 'bad'}"><b>${G.ok ? ['Excellent!', 'Bravo!', 'Parfait!', 'Super!'][Math.floor(Math.random() * 4)] : (G.almost ? 'Almost!' : 'Not quite')}</b>${G.ok ? '' : '<div>' + esc(G.correct) + '</div>'}<button class="btn" data-act="gNext">Continue</button></div>`;
  const stages = G.staged ? '<div class="stages">' + [0, 1, 2].map((i) => '<i><b style="width:' + Math.min(100, Math.round(G.stageA[i] / Math.max(1, G.stageN[i]) * 100)) + '%"></b></i>').join('') + '</div>' : '';
  const modeBar = G.mode === 'box' || G.mode === 'abox'
    ? `<div class="spread" style="font-weight:800;margin:6px 4px"><span style="font-size:22px">${'❤️'.repeat(Math.max(0, G.lives))}${'🖤'.repeat(Math.max(0, 3 - G.lives))}</span><span>⏱ <b id="gClock">${Math.max(0, Math.ceil((G.endAt - Date.now()) / 1000))}</b>s · ✅ ${G.right}</span></div>`
    : G.mode === 'climb'
      ? `<div style="margin:6px 4px;font-weight:800"><div class="spread"><span>⛰️ Reach the summit!</span><span>⏱ <b id="gClock">${Math.floor(Math.max(0, Math.ceil((G.endAt - Date.now()) / 1000)) / 60)}:${String(Math.max(0, Math.ceil((G.endAt - Date.now()) / 1000)) % 60).padStart(2, '0')}</b> · ${G.climb} / ${G.top}</span></div><div style="position:relative;height:14px;background:#dfe6f5;border-radius:8px;margin-top:6px"><i style="display:block;height:100%;width:${Math.round(G.climb / G.top * 100)}%;background:#2ecc71;border-radius:8px;transition:width .4s"></i><span style="position:absolute;top:-12px;left:calc(${Math.round(G.climb / G.top * 100)}% - 12px);font-size:22px;transition:left .4s">🧗</span></div></div>`
      : G.vmode === 'normal' ? `<div class="spread" style="font-weight:800;margin:6px 4px"><span>Normal mode</span><span>⏱ <b id="gQT">${Math.floor(Math.max(0, Math.ceil((G.endAt - Date.now()) / 1000)) / 60)}:${String(Math.max(0, Math.ceil((G.endAt - Date.now()) / 1000)) % 60).padStart(2, '0')}</b></span></div>` : G.vmode === 'test' ? '<div style="font-weight:800;margin:6px 4px">📝 Test mode: answers are shown at the end</div>' : '';
  $('#app').innerHTML = `<div class="play"><div class="ptop"><button class="icon-btn sq" data-act="gQuit" title="Back to path">🏠</button><div class="track"><i style="width:${pct}%"></i></div><span class="coins">${G.practice ? '⭐ ' + G.score : G.coins + G.score * 10}</span></div>${modeBar}<div class="pcard">${body}</div><div class="pbottom">${bottom}${stages}</div></div>`;
  const inp = $('#ans');
  if (inp && ask) {
    inp.focus();
    inp.addEventListener('input', () => { G.st.val = inp.value; const b = $('#chk'); if (b) b.disabled = !typedValue(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ACT.gCheck(); });
  }
}
ACT.gQuit = () => go(G && G.practice ? '#/s/practice' : '#/s/hw/' + G.id);
ACT.gSay = (t) => { t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 1800); say(t.dataset.t, !!t.dataset.slow); };
ACT.gPick = (t) => {
  const q = curQ(); G.st.sel = +t.dataset.i; drawPlay(); if (q.speakOpts) say(q.opts[G.st.sel]);
  if (G.fast && G.phase === 'ask') { ACT.gCheck(); const mine = G.idx; setTimeout(() => { if (G && G.idx === mine && G.phase === 'fb') ACT.gNext(); }, G.ok ? 650 : 1500); }
};
ACT.gTap = (t) => { G.st.chosen.push(+t.dataset.i); drawPlay(); };
ACT.gUntap = (t) => { G.st.chosen.splice(+t.dataset.k, 1); drawPlay(); };
ACT.gPull = (t) => { G.st.chosen.push(+t.dataset.i); drawPlay(); };
ACT.gUntap2 = (t) => { G.st.chosen = G.st.chosen.filter((x) => x !== +t.dataset.i); drawPlay(); };
ACT.gCaret = (t) => { if (G.phase === 'ask') { G.st.caret = +t.dataset.i; drawPlay(); } };
ACT.gLeft = () => { G.st.caret = Math.max(0, G.st.caret - 1); drawPlay(); };
ACT.gRight = () => { G.st.caret = Math.min(curQ().chars.length, G.st.caret + 1); drawPlay(); };
ACT.gSpace = () => { const s = G.st, n = curQ().chars.length; if (s.caret >= 1 && s.caret < n && !s.gaps.includes(s.caret)) s.gaps.push(s.caret); if (s.caret < n) s.caret++; drawPlay(); };
ACT.gBack = () => {
  const s = G.st; const near = s.gaps.filter((g) => g <= s.caret).sort((a, b) => b - a)[0];
  if (near != null) { s.gaps = s.gaps.filter((g) => g !== near); s.caret = near; drawPlay(); }
};
ACT.gAcc = (t) => {
  const inp = $('#ans'); if (!inp) return;
  const a = inp.selectionStart == null ? inp.value.length : inp.selectionStart, b = inp.selectionEnd == null ? a : inp.selectionEnd;
  inp.value = inp.value.slice(0, a) + t.dataset.c + inp.value.slice(b);
  G.st.val = inp.value; inp.focus(); try { inp.setSelectionRange(a + 1, a + 1); } catch (e) {}
  const c = $('#chk'); if (c) c.disabled = !typedValue();
};
/* flashcards */
ACT.gFlip = () => { G.st.flip = !G.st.flip; drawPlay(); if (G.st.flip) say(curQ().fr); };
function retryLater(q) {
  G.queue.splice(Math.min(G.idx + 4, G.queue.length), 0, Object.assign({}, q, { retry: true })); G.planned++;
  if (q.stage) G.stageN[q.stage - 1]++;
}
function bump(q) { G.answered++; if (q.stage) G.stageA[q.stage - 1]++; }
function finishFlash(ok) {
  const q = curQ();
  if (!q.retry) { G.asked += q.total; if (ok) G.right += q.total; }
  if (ok && !q.retry) G.score += q.total;
  if (!ok && !q.retry) retryLater(q);
  bump(q); G.idx++;
  if (G.idx >= G.queue.length) finishPlay(); else nextQ();
}
ACT.gKnew = () => finishFlash(true);
ACT.gAgain = () => finishFlash(false);
/* match */
ACT.mL = (t) => { const s = G.st, i = +t.dataset.i, q = curQ(); if (s.gotL[i] || s.finished) return; s.sel = i; s.bad = null; if (!q.noSpeak) say(q.pairs[i].fr); drawPlay(); };
ACT.mR = (t) => {
  const s = G.st, q = curQ(), r = +t.dataset.i;
  if (s.sel == null || s.gotR[r] || s.finished) return;
  if (q.pairs[r].en === q.pairs[s.sel].en) {
    s.gotL[s.sel] = 1; s.gotR[r] = 1; s.sel = null; s.bad = null;
    if (Object.keys(s.gotL).length === q.pairs.length) {
      G.score += q.pairs.length - Object.keys(s.miss).length; bump(q); s.finished = true; G.right += q.pairs.length - Object.keys(s.miss).length; G.asked += q.pairs.length;
      drawPlay();
      setTimeout(() => { if (!G) return; G.idx++; if (G.idx >= G.queue.length) finishPlay(); else nextQ(); }, 450);
      return;
    }
  } else { s.miss[s.sel] = 1; s.bad = [s.sel, r]; s.sel = null; setTimeout(() => { if (G && G.st === s) { s.bad = null; drawPlay(); } }, 650); }
  drawPlay();
};
/* checking */
ACT.gCheck = () => {
  const q = curQ(), s = G.st;
  if (G.phase !== 'ask' || !canCheck()) return;
  let ok = false, correct = '', almost = false;
  if (q.t === 'pick') { ok = q.opts[s.sel] === q.answer; correct = 'Correct answer: ' + (q.correctText || q.answer); }
  if (q.t === 'tap') { ok = s.chosen.map((i) => lc(q.bank[i].w)).join(' ') === q.tokens.map(lc).join(' '); correct = q.answerText || q.sentence; }
  if (q.t === 'odd') { const sel = s.chosen.slice().sort().join(','), want = q.bank.map((b, i) => (b.x ? i : -1)).filter((i) => i >= 0).sort().join(','); ok = sel === want; correct = q.sentence + '  (extra: ' + q.extras.join(', ') + ')'; }
  if (q.t === 'spaces') { ok = s.gaps.slice().sort((a, b) => a - b).join(',') === q.expect.join(','); correct = q.sentence; }
  if (q.t === 'type') {
    const r = checkTyped(s.val, q.answer); ok = r === 'ok'; almost = r === 'accent';
    correct = (almost ? 'Check the accents: ' : 'Correct answer: ') + q.answer;
  }
  G.ok = ok; G.correct = correct; G.almost = almost; G.phase = 'fb';
  if (ok && !q.retry) G.score += q.total;
  if (!ok && !q.retry && !G.fast && !G.noRetry) retryLater(q);
  if (!ok && G.miss) G.miss.push({ p: q.prompt.replace('____', '…'), a: q.answer, g: q.t === 'type' ? s.val : (q.opts ? q.opts[s.sel] : '') });
  if (!q.retry) { G.asked += q.total; if (ok) G.right += q.total; }
  if (G.mode === 'box' || G.mode === 'abox') { if (!ok) G.lives--; }
  if (G.mode === 'climb') { G.climb = ok ? G.climb + 1 : Math.max(0, G.climb - 1); if (!ok) G.lives--; }
  bump(q);
  if (G.vmode === 'test') { G.qEnd = 0; return ACT.gNext(); }
  drawPlay();
  const after = q.afterSay || (q.t === 'tap' && q.enBuild ? q.sentence : null) || (q.t === 'tap' || q.t === 'spaces' || q.t === 'odd' ? q.sentence : null) || (q.t === 'type' ? q.answer : null);
  if (after) say(after);
};
ACT.gNext = () => {
  if (G.fast) {
    const over = (G.mode === 'climb' && (G.climb >= G.top || G.lives <= 0 || G.asked >= 30 || Date.now() >= G.endAt)) || ((G.mode === 'box' || G.mode === 'abox') && (G.lives <= 0 || Date.now() >= G.endAt));
    if (over) return finishPlay();
    G.idx++;
    if (G.idx >= G.queue.length) { const more = G.refill(); if (!more.length) return finishPlay(); G.queue.push(...more); }
    return nextQ();
  }
  G.idx++; if (G.idx >= G.queue.length) finishPlay(); else nextQ();
};

async function finishPlay() {
  const secs = Math.round((Date.now() - G.t0) / 1000), g = G;
  if (g.practice) {
    if (g.fast) g.total = Math.max(1, g.asked);
    const pct = Math.round(g.score / g.total * 100);
    try { await api('/student/practice/result', 'POST', { game: g.practice.game + (g.practice.mode ? '·' + g.practice.mode : ''), level: g.practice.level, ids: g.practice.ids, score: Math.round(g.score), total: g.total, secs }); } catch (e) { if (e.status === 401) { sessionStorage.setItem('kicked', '1'); return go('#/'); } }
    const summit = g.mode === 'climb' && g.climb >= g.top;
    $('#app').innerHTML = `<div class="sbody"><div class="finish"><div class="conf">${summit ? '🏔️' : pct >= 90 ? '🏆' : pct >= 60 ? '🎉' : '💪'}</div><div class="kick">${summit ? 'YOU REACHED THE SUMMIT!' : 'SESSION COMPLETE'}</div>
      <div class="stat3b"><div><b>${Math.round(g.score)}/${g.total}</b><span>CORRECT</span></div><div><b>${pct}%</b><span>ACCURACY</span></div><div><b>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</b><span>TIME</span></div></div>
      ${g.miss && g.miss.length ? '<div class="card" style="text-align:left;margin:14px 0"><b>Review your mistakes</b>' + g.miss.map((m) => `<div style="margin-top:8px">${esc(m.p)} <b style="color:#16a34a">${esc(m.a)}</b>${m.g ? ` <span class="mute">(you: ${esc(m.g)})</span>` : ''}</div>`).join('') + '</div>' : ''}
      <button class="bigblue" data-act="phAgain">Play again</button><button class="btn ghost" style="width:100%;margin-top:10px" data-act="phHub">Back to games</button></div></div>`;
    G.again = '#/s/practice/play/' + g.practice.game + '/' + g.practice.level + '/' + g.practice.ids.join(',');
    PH_AGAIN = G.again; return;
  }
  let gained = 0, failed = false;
  try { gained = (await api('/student/attempt', 'POST', { homework_id: g.id, lesson: g.kind, score: Math.round(g.score), total: g.total, secs })).gained; }
  catch (e) { failed = true; if (e.status === 401) { sessionStorage.setItem('kicked', '1'); return go('#/'); } }
  const pct = Math.round(g.score / g.total * 100), balance = (g.coins || 0) + (gained || 0);
  $('#app').innerHTML = `<div class="sbody"><div class="finish"><div class="conf">${pct >= 90 ? '🏆' : pct >= 60 ? '🎉' : '💪'}</div><div class="kick">SESSION COMPLETE</div>
    <div class="bigcoin"><span class="coinic">🪙</span>${gained || 0}</div><div class="mute" style="font-weight:800;font-size:19px">coins earned</div>
    <div class="stat3b"><div><b>${Math.round(g.score)}/${g.total}</b><span>CORRECT</span></div><div><b>${pct}%</b><span>ACCURACY</span></div><div><b>🪙 ${balance}</b><span>BALANCE</span></div></div>
    ${failed ? '<p class="err">Could not save this result. Check your connection and try again.</p>' : ''}
    <button class="bigblue" data-act="gQuit">Back to Home</button></div></div>`;
}
