/* Activity boards: Vocab, Sentence, Listening and Dictation trainers.
   Pick a lesson, then pick an activity from the board (same layout idea as Language Gym).
   All exercises are built from our own lessons. Plays through the workout engine in workout.js. */
'use strict';
const BOARDS = {
  vocab: { name: 'Vocab Trainer', acts: [['list', 'Vocab List', '📋'], ['study', 'Self Study', '🍎'], ['one4', 'One In Four (Reading)', '🔢'], ['puzzle', 'Sentence Puzzle', '🧩'], ['match', 'Match Up', '🔗'], ['flow', 'Break the Flow', '✂️'], ['mc', 'Multiple Choice', '🔊'], ['gapfill', 'Gapfill Race', '🏁'], ['anag', 'Anagrams', '🔀'], ['dict', 'Dictation', '⏱️'], ['robot', 'Beat the Robot', '🤖'], ['trans', 'Translation', '🌍']] },
  sent: { name: 'Sentence Trainer', acts: [['puzzle', 'Sentence Puzzle', '🧩'], ['trap', 'Trapdoor', '🕳️'], ['gapped', 'Gapped Sentences', '✏️'], ['anag', 'Anagrams', '🔀'], ['robot', 'Beat the Robot', '🤖'], ['dict', 'Dictation', '⏱️'], ['ddict', 'Delayed Dictation', '⌛'], ['dcopy', 'Delayed Copying', '📝'], ['trans', 'Translation', '🌍']] },
  listen: { name: 'Listening Trainer', acts: [['study', 'Self Study', '🍎'], ['mc', 'Multiple Choice', '🔊'], ['tiles', 'Tiles', '🔠'], ['puzzle', 'Sentence Puzzle', '🧩'], ['gapend', 'Gapped Endings', '🔚'], ['gapped', 'Gapped Sentences', '✏️'], ['anag', 'Anagrams', '🔀'], ['ddict', 'Delayed Dictation', '⌛'], ['dtrans', 'Delayed Translation', '⏳']] },
  dict: { name: 'Dictation Trainer', acts: [['mc', 'Multiple Choice', '🔊'], ['detail', 'Missing Detail (Click)', '👆'], ['flow', 'Break the Flow', '✂️'], ['puzzle', 'Sentence Puzzle', '🧩'], ['spotword', 'Spot The Word', '🔍'], ['vowels', 'Missing Vowels', '🅰️'], ['cons', 'Missing Consonants', '🅱️'], ['guided', 'Guided Dictation', '🧭'], ['dict', 'Dictation', '⏱️']] },
};
const BD_GAMES = Object.keys(BOARDS);
const bdAct = (game, id) => (BOARDS[game].acts.find((a) => a[0] === id) || [id, id]);
const bdBoardUrl = (game, level, id) => '#/s/practice/board/' + game + '/' + level + '/' + id;

function bdCss() {
  if (document.getElementById('bdcss')) return;
  const st = document.createElement('style'); st.id = 'bdcss';
  st.textContent = `.bd{min-height:100vh;margin:-18px -14px;padding:18px 16px 60px;background-color:#e9e4da;background-image:linear-gradient(rgba(255,255,255,.55) 2px,transparent 2px),linear-gradient(90deg,rgba(255,255,255,.55) 2px,transparent 2px);background-size:46px 23px,92px 23px;position:relative}
.bd-top{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;max-width:900px;margin:0 auto}
.bd-lesson{background:#fff;border-radius:6px;padding:10px 14px;box-shadow:0 3px 8px rgba(0,0,0,.18);font:700 14px system-ui,sans-serif;color:#17407a;line-height:1.4;max-width:420px}.bd-lesson small{display:block;font-weight:600;color:#667}
.bd-top .sp{flex:1}.bd-top button{font:800 12px system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;border:0;border-radius:999px;padding:11px 16px;cursor:pointer;color:#fff;background:#1c3f6e;box-shadow:0 3px 8px rgba(0,0,0,.2)}.bd-top button.o{background:#ea580c}
.bd h1{text-align:center;font:600 44px "Montserrat",system-ui,sans-serif;margin:18px 0 26px;color:#111;text-shadow:0 2px 6px rgba(0,0,0,.12)}
.bd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px 22px;max-width:760px;margin:0 auto}
.bd-tile{position:relative;background:#fff;border:0;border-radius:4px;box-shadow:0 4px 10px rgba(0,0,0,.22);padding:26px 8px 16px;cursor:pointer;font:700 15px "Montserrat",system-ui,sans-serif;color:#111;display:flex;flex-direction:column;align-items:center;gap:12px;transition:transform .12s}
.bd-tile:hover{transform:translateY(-3px) rotate(-.6deg)}.bd-tile:active{transform:translateY(1px)}
.bd-tile .ic{font-size:58px;line-height:1;height:70px;display:flex;align-items:center}
.bd-tile i{position:absolute;left:-8px;top:-10px;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#4f78c4,#14306a);box-shadow:2px 4px 4px rgba(0,0,0,.3)}
@media(max-width:560px){.bd h1{font-size:30px}.bd-grid{gap:20px 12px}.bd-tile{font-size:12.5px;padding:20px 4px 12px}.bd-tile .ic{font-size:40px;height:50px}}
.bd-list{max-width:640px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.18);overflow:hidden}
.bd-list .r{display:flex;gap:10px;align-items:center;padding:12px 14px;border-bottom:1px solid #eef1f8}.bd-list .r:last-child{border:0}.bd-list .r b{flex:1;font-size:17px}.bd-list .r span{flex:1;color:#445;font-size:15px}
.bd-list button,.bd-card button.say{border:0;background:#e3f4fd;border-radius:10px;padding:7px 10px;font-size:18px;cursor:pointer}
.bd-card{max-width:520px;margin:0 auto}.bd-card .face{background:#fff;border-radius:18px;box-shadow:0 6px 18px rgba(0,0,0,.2);min-height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;cursor:pointer;font:800 26px system-ui,sans-serif;color:#17407a}.bd-card .face small{font:600 13px system-ui,sans-serif;color:#778}
.bd-card .row{display:flex;gap:10px;margin-top:14px}.bd-card .row button{flex:1;font:800 16px system-ui,sans-serif;border:0;border-radius:14px;padding:14px;cursor:pointer;color:#fff}.bd-card .no{background:#ea580c}.bd-card .yes{background:#16a34a}
.bd-card .cnt{text-align:center;margin:10px 0;font-weight:800;color:#445}`;
  document.head.appendChild(st);
}

async function bdLoad(ids) {
  const d = await api('/student/practice/lessons?ids=' + encodeURIComponent(ids));
  VOICE.cloud = !!d.tts; ST.lang = 'fr-FR';
  return d.lessons[0];
}

/* ---------- the board ---------- */
ROUTES.push([/^\/s\/practice\/board\/(\w+)\/(\w+)\/([\w-]+)$/, async (game, level, id) => {
  if (!BOARDS[game]) return go('#/s/practice');
  startHeartbeat(); ST.hw = null; bdCss();
  const L = await bdLoad(id); if (!L) return go('#/s/practice');
  cleanup = () => { stopSpeech(); };
  const B = BOARDS[game];
  $('#app').innerHTML = `<div class="bd"><div class="bd-top"><div class="bd-lesson">${esc(L.title || '')}<small>${esc(wlvName(level))}</small></div><span class="sp"></span><button data-act="bdBack">⬅ Change topic</button></div>
  <h1>${esc(B.name)}</h1>
  <div class="bd-grid">${B.acts.map(([a, nm, ic]) => `<button class="bd-tile" data-act="bdPlay" data-game="${game}" data-level="${level}" data-id="${esc(id)}" data-a="${a}"><i></i><div class="ic">${ic}</div>${esc(nm)}</button>`).join('')}</div></div>`;
  window.scrollTo(0, 0);
}]);
ACT.bdBack = () => { if (PH) { PH.step = 'lessons'; PH.keep = 'lessons'; } go('#/s/practice'); };
ACT.bdPlay = (t) => go('#/s/practice/act/' + t.dataset.game + '/' + t.dataset.level + '/' + t.dataset.id + '/' + t.dataset.a);

/* ---------- playing one activity ---------- */
ROUTES.push([/^\/s\/practice\/act\/(\w+)\/(\w+)\/([\w-]+)\/(\w+)$/, async (game, level, id, act) => {
  if (!BOARDS[game]) return go('#/s/practice');
  startHeartbeat(); ST.hw = null; wkCss(); bdCss();
  const L = await bdLoad(id); if (!L) return go('#/s/practice');
  await waitVoices();
  const board = bdBoardUrl(game, level, id);
  PH_AGAIN = '#/s/practice/act/' + game + '/' + level + '/' + id + '/' + act;
  cleanup = () => { if (WKT) clearInterval(WKT); WKT = null; if (typeof BDT !== 'undefined' && BDT) clearInterval(BDT); BDT = null; stopSpeech(); WK = null; };
  if (act === 'list') return bdList(L, game, board);
  if (act === 'study') return bdStudy(L, game, level, id, board);
  const stage = bdBuild(game, act, L);
  if (!stage) { toast('Not enough content in this lesson for this activity'); return go(board); }
  stage.score = 0; stage.done = false; stage.si = 0; stage.items.forEach((it) => { it.st = {}; });
  WK = { L, level, game, mod: 'vocab', ids: id, stages: [stage], cur: 0, hints: 0, t0: Date.now(), total: stage.items.length, sw: false, board, hdr: BOARDS[game].name + ' · ' + bdAct(game, act)[1], lang: 'fr-FR' };
  if (WKT) clearInterval(WKT);
  WKT = setInterval(() => { const e = document.getElementById('wkClock'); if (e && WK) { const s = Math.round((Date.now() - WK.t0) / 1000); e.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); } }, 1000);
  if (stage.robot) { if (typeof BDT !== 'undefined' && BDT) clearInterval(BDT); BDT = setInterval(() => { if (!WK) return; const s = WK.stages[0], bot = document.getElementById('wkBot'); if (!bot) return; const p = wkBotPct(s); bot.style.width = p + '%'; if (p >= 100 && !s.done) s.botWon = true; }, 700); }
  wkDraw();
}]);
let BDT = null;

/* ---------- Vocab list and Self Study ---------- */
function bdItems(L) { return (L.items || []).filter((i) => i.fr && i.en && !i.q && !i.g); }
function bdList(L, game, board) {
  const its = bdItems(L);
  $('#app').innerHTML = `<div class="bd"><div class="bd-top"><button data-act="go" data-to="${board}">⬅ Activities</button><span class="sp"></span></div><h1>Vocab List</h1>
  <div class="bd-list">${its.map((it, i) => `<div class="r"><button data-act="bdSay" data-t="${esc(it.fr)}">🔊</button><b>${esc(it.fr)}</b><span>${esc(it.en)}</span></div>`).join('')}</div></div>`;
}
ACT.bdSay = (t) => speakText(t.dataset.t, 'fr-FR', false);
ACT.go = (t) => go(t.dataset.to);
let BS = null;
function bdStudy(L, game, level, id, board) {
  BS = { its: shuffle(bdItems(L)), i: 0, flip: false, know: 0, game, level, id, board, t0: Date.now(), audioFirst: game === 'listen' };
  bdStudyDraw();
}
function bdStudyDraw() {
  const S = BS; if (!S) return;
  if (S.i >= S.its.length) {
    try { api('/student/practice/result', 'POST', { game: S.game, level: S.level, ids: [S.id], score: S.know, total: S.its.length, secs: Math.round((Date.now() - S.t0) / 1000) }); } catch (e) { /* ignore */ }
    $('#app').innerHTML = `<div class="bd"><div class="bd-top"><button data-act="go" data-to="${S.board}">⬅ Activities</button></div><h1>Self Study</h1><div class="bd-card"><div class="face">🎉<span>You knew ${S.know} of ${S.its.length}</span><small>Study again to practise the rest.</small></div><div class="row"><button class="yes" data-act="bdStudyAgain">Study again</button></div></div></div>`;
    return;
  }
  const it = S.its[S.i], front = S.audioFirst ? '🔊' : it.fr, back = it.fr + '  =  ' + it.en;
  $('#app').innerHTML = `<div class="bd"><div class="bd-top"><button data-act="go" data-to="${S.board}">⬅ Activities</button></div><h1>Self Study</h1>
  <div class="bd-card"><div class="cnt">${S.i + 1} / ${S.its.length}</div><div class="face" data-act="bdFlip">${S.flip ? `<span>${esc(it.fr)}</span><span style="color:#16a34a">${esc(it.en)}</span>` : `<span>${front}</span><small>${S.audioFirst ? 'Tap to listen and see the answer' : 'Tap the card to flip'}</small>`}<button class="say" data-act="bdSay" data-t="${esc(it.fr)}">🔊</button></div>
  ${S.flip ? '<div class="row"><button class="no" data-act="bdKnow" data-v="0">Still learning</button><button class="yes" data-act="bdKnow" data-v="1">I knew it</button></div>' : '<div class="row"><button class="yes" data-act="bdFlip">Show answer</button></div>'}</div></div>`;
  if (S.audioFirst && !S.flip) speakText(it.fr, 'fr-FR', false);
}
ACT.bdFlip = (t, e) => { if (e && e.target && e.target.closest && e.target.closest('.say')) return; if (BS) { BS.flip = true; bdStudyDraw(); } };
ACT.bdKnow = (t) => { BS.know += +t.dataset.v; BS.i++; BS.flip = false; bdStudyDraw(); };
ACT.bdStudyAgain = () => { BS.its = shuffle(BS.its); BS.i = 0; BS.know = 0; BS.flip = false; BS.t0 = Date.now(); bdStudyDraw(); };

/* ---------- building each activity ---------- */
function bdBuild(game, act, L) {
  const items = bdItems(L), tk = toks;
  if (items.length < 3) return null;
  const cap = (a, n) => shuffle(a).slice(0, n);
  const sp = canSpeak();
  const enOpts = (it, n) => shuffle([it.en].concat(shuffle([...new Set(items.filter((x) => x.en !== it.en).map((x) => x.en))]).slice(0, n - 1)));
  const frOpts = (it, n) => shuffle([it.fr].concat(shuffle([...new Set(items.filter((x) => x.fr !== it.fr).map((x) => x.fr))]).slice(0, n - 1)));
  const pat = (a) => tk(a).map((w) => Array.from(w).map((c, i) => (i === 0 || !/\p{L}/u.test(c) ? c : '·')).join('')).join(' ');
  const keyWord = (it) => { const t = tk(it.fr).map(coreWord); let bi = -1, bl = 0; t.forEach((w, i) => { const n = Array.from(w).filter((c) => /\p{L}/u.test(c)).length; if (n > bl && n >= 3) { bl = n; bi = i; } }); return bi < 0 ? null : { t, i: bi, w: t[bi] }; };
  const withKey = items.map((it) => ({ it, k: keyWord(it) })).filter((x) => x.k);
  const multi = items.filter((it) => tk(it.fr).length >= 3 && tk(it.fr).length <= 12);
  const phr = multi.length >= 4 ? multi : items.filter((it) => tk(it.fr).length >= 2 && tk(it.fr).length <= 14);
  const AU = 'Listen 🔊';
  const mk = (name, instr, t, its, extra) => (its && its.length >= (t === 'match' ? 3 : 2) ? Object.assign({ id: act, name, instr, t, items: its }, extra || {}) : null);
  const blank = (k) => k.t.map((w, i) => (i === k.i ? '_____' : w)).join(' ');
  const order = (it, audio) => { const t = tk(it.fr); return { q: audio ? AU : it.en, sub: audio ? it.en : '', ans: t, bank: shuffle(t.slice()), say: it.fr, audio: audio ? it.fr : undefined, auto: !!audio && false }; };
  const A = {
    one4: () => mk('One In Four', 'Read the French, then choose the correct English from four options.', 'pick', cap(items, 12).map((it) => ({ q: it.fr, ans: it.en, opts: enOpts(it, 4), audio: it.fr }))),
    puzzle: () => mk('Sentence Puzzle', game === 'dict' || game === 'listen' ? 'Listen, then tap the words in the order you hear them.' : 'Tap the words to build the sentence in French.', 'order', cap(phr, 8).map((it) => order(it, game === 'dict' || game === 'listen'))),
    match: () => mk('Match Up', 'Tap an English item, then its French match.', 'match', cap(items, 8).map((it) => ({ l: it.en, r: it.fr }))),
    flow: () => mk('Break the Flow', 'The words have run together. Tap between the letters to break them apart.', 'break', cap(phr.filter((it) => tk(it.fr).length <= 8), 8).map((it) => { const t = tk(it.fr); return { q: game === 'dict' ? AU : it.en, sub: game === 'dict' ? it.en : '', str: t.join(''), ans: t, audio: it.fr }; })),
    mc: () => mk('Multiple Choice', sp ? 'Listen, then choose the correct English meaning.' : 'Choose the correct English meaning.', 'pick', cap(items, 10).map((it) => (game === 'dict' ? { q: AU, audio: it.fr, ans: it.fr, opts: frOpts(it, 3) } : { q: sp ? AU : it.fr, audio: it.fr, ans: it.en, opts: enOpts(it, 3) }))),
    gapfill: () => mk('Gapfill Race', 'Type the whole word. Letters are missing. Beat your best time!', 'type', cap(withKey, 10).map(({ it, k }) => { const cs = Array.from(k.w); const pos = shuffle(cs.map((c, i) => i).filter((i) => /\p{L}/u.test(cs[i]) && i > 0)).slice(0, Math.min(3, Math.max(1, Math.floor(cs.length / 3)))); const w2 = cs.map((c, i) => (pos.includes(i) ? '_' : c)).join(''); return { q: k.t.map((w, i) => (i === k.i ? w2 : w)).join(' '), sub: it.en, ans: k.w, after: it.fr }; }), { seq: true }),
    anag: () => mk('Anagrams', 'Unscramble the highlighted word and type it.', 'type', cap(withKey.filter((x) => Array.from(x.k.w).length >= 4), 10).map(({ it, k }) => { let sc = k.w, n = 0; while (sc === k.w && n++ < 12) sc = shuffle(Array.from(k.w)).join(''); return { q: k.t.map((w, i) => (i === k.i ? '[ ' + Array.from(sc).join(' ') + ' ]' : w)).join(' '), sub: it.en, ans: k.w, audio: game === 'listen' ? it.fr : undefined }; })),
    dict: () => mk('Dictation', 'Listen and type what you hear.', 'type', cap(items, 8).map((it) => ({ q: AU, sub: sp ? '' : it.en, audio: it.fr, ans: it.fr, ph: pat(it.fr) }))),
    robot: () => mk('Beat the Robot', 'Answer before the robot reaches the finish line!', 'pick', cap(items, 10).map((it, i) => (i % 2 ? { q: it.en, ans: it.fr, opts: frOpts(it, 3) } : { q: it.fr, ans: it.en, opts: enOpts(it, 3), audio: it.fr })), { seq: true, robot: { pace: 6500 } }),
    trans: () => mk('Translation', 'Read the English and type the French.', 'type', cap(game === 'sent' && phr.length >= 4 ? phr : items, 10).map((it) => ({ q: it.en, ans: it.fr, ph: pat(it.fr), say: it.fr }))),
    trap: () => mk('Trapdoor', 'Read the sentence before the words fall away, then type it from memory.', 'type', cap(phr, 6).map((it) => ({ q: 'Type the sentence', sub: it.en, show: it.fr, flash: { mode: 'trap' }, ans: it.fr, ph: pat(it.fr), say: it.fr })), { seq: true }),
    gapped: () => mk('Gapped Sentences', game === 'listen' ? 'Listen and type the missing word.' : 'Type the missing word. The English will help you.', 'type', cap(withKey.filter((x) => tk(x.it.fr).length >= 2), 10).map(({ it, k }) => ({ q: blank(k), sub: it.en, ans: k.w, ph: pat(k.w), after: it.fr, audio: game === 'listen' ? it.fr : undefined }))),
    ddict: () => mk('Delayed Dictation', 'Listen carefully. The sentence plays only once. Then type it.', 'type', cap(phr, 8).map((it) => ({ q: AU, sub: sp ? '' : it.en, audio: it.fr, once: true, auto: true, ans: it.fr, ph: pat(it.fr) })), { seq: true }),
    dcopy: () => mk('Delayed Copying', 'Memorise the sentence. It will disappear, then type it from memory.', 'type', cap(phr, 8).map((it) => ({ q: 'Type the sentence you saw', sub: it.en, show: it.fr, flash: { ms: Math.min(9000, 2500 + tk(it.fr).length * 700) }, ans: it.fr, ph: pat(it.fr), say: it.fr })), { seq: true }),
    dtrans: () => mk('Delayed Translation', 'Listen once, then type the English.', 'type', cap(phr, 8).map((it) => ({ q: AU, audio: it.fr, once: true, auto: true, ans: it.en, ph: '' })), { seq: true }),
    tiles: () => mk('Tiles', 'Listen, then tap the tile with the sentence you heard.', 'pick', cap(phr, 8).map((it) => ({ q: AU, audio: it.fr, ans: it.fr, opts: frOpts(it, 4) }))),
    gapend: () => mk('Gapped Endings', 'Listen. The endings of two words are missing. Type the whole word.', 'type', cap(withKey.filter((x) => Array.from(x.k.w).length >= 5), 10).map(({ it, k }) => { const cs = Array.from(k.w), cut = Math.max(2, Math.floor(cs.length / 3)); return { q: k.t.map((w, i) => (i === k.i ? cs.slice(0, cs.length - cut).join('') + '_'.repeat(cut) : w)).join(' '), sub: it.en, ans: k.w, audio: it.fr, after: it.fr }; })),
    detail: () => mk('Missing Detail', 'Listen. One word in the text is different. Tap the wrong word.', 'pick', cap(withKey.filter((x) => tk(x.it.fr).length >= 3), 8).map(({ it, k }) => { const d = distractors(it.fr, items, 1)[0]; if (!d) return null; const words = k.t.map((w, i) => (i === k.i ? d : w)); return { q: 'Tap the word that is not what you heard', audio: it.fr, ans: d, opts: words, after: it.fr, grid: true }; }).filter(Boolean)),
    spotword: () => mk('Spot The Word', 'Listen, then choose the word missing from the sentence.', 'pick', cap(withKey.filter((x) => tk(x.it.fr).length >= 2), 10).map(({ it, k }) => ({ q: blank(k), audio: it.fr, ans: k.w, opts: shuffle([...new Set([k.w].concat(distractors(it.fr, items, 3)))]), after: it.fr }))),
    vowels: () => mk('Missing Vowels', 'The vowels are missing. Listen and type the full sentence.', 'type', cap(phr, 8).map((it) => ({ q: it.fr.replace(/[aeiouyàâäéèêëîïôöùûüœæAEIOUY]/g, '_'), sub: it.en, audio: it.fr, ans: it.fr, ph: '' }))),
    cons: () => mk('Missing Consonants', 'The consonants are missing. Listen and type the full sentence.', 'type', cap(phr, 8).map((it) => ({ q: it.fr.replace(/[bcdfghjklmnpqrstvwxzçBCDFGHJKLMNPQRSTVWXZ]/g, '_'), sub: it.en, audio: it.fr, ans: it.fr, ph: '' }))),
    guided: () => mk('Guided Dictation', 'Listen and type the sentence. The first letters help you.', 'type', cap(phr, 8).map((it) => ({ q: AU, audio: it.fr, sub: pat(it.fr), ans: it.fr, ph: pat(it.fr) }))),
  };
  const f = A[act]; return f ? f() : null;
}
