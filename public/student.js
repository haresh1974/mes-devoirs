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
    ${list || '<div class="card mute" style="text-align:center">No homework yet. Check back soon!</div>'}</div>`;
}]);
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
  let inner = '';
  if (ST.tab === 'path') {
    let nextSet = false;
    inner = '<div class="path">' + hw.exercises.map((k, i) => {
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
ACT.sBubble = () => {
  const ss = (ST.hwData.items || []).filter((i) => i.s);
  const it = (ss.length ? ss : ST.hwData.items || [])[Math.floor(Math.random() * Math.max(1, (ss.length ? ss : ST.hwData.items || []).length))];
  if (!it) return;
  modal(`<div style="text-align:center"><div style="font-size:42px">💬</div><h2>Phrase du jour</h2><div style="font-size:22px;font-weight:800;margin:10px 0">${esc(it.fr)}</div><div class="mute">${esc(it.en)}</div><div class="audio" style="margin-top:16px"><button class="abtn" data-act="gSay" data-t="${esc(it.fr)}">${ICON_SPK}<span>Listen</span></button><button class="abtn slow" data-act="gSay" data-t="${esc(it.fr)}" data-slow="1">${ICON_SLOW}</button></div></div><div class="foot"><button class="btn" data-act="close">Merci!</button></div>`);
  setTimeout(() => speakText(it.fr, ST.lang), 300);
};
ACT.sTab = (t) => { ST.tab = t.dataset.k; route(); };
ACT.sPlay = (t) => {
  if (t.dataset.locked) { toast('Finish the activity before this one first'); return; }
  go('#/s/play/' + ST.hw + '/' + t.dataset.k);
};

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
    take(pool, 8).forEach((it) => qs.push({ t: 'pick', title: 'What does this mean?', prompt: it.fr, speak: it.fr, opts: shuffle([it].concat(others(it, pool, 2))).map((o) => o.en), answer: it.en, say: it.fr, total: 1 }));
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
function drawPlay() {
  const q = curQ(), s = G.st, ask = G.phase === 'ask';
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
  $('#app').innerHTML = `<div class="play"><div class="ptop"><button class="icon-btn sq" data-act="gQuit" title="Back to path">🏠</button><div class="track"><i style="width:${pct}%"></i></div><span class="coins">${G.coins + G.score * 10}</span></div><div class="pcard">${body}</div><div class="pbottom">${bottom}${stages}</div></div>`;
  const inp = $('#ans');
  if (inp && ask) {
    inp.focus();
    inp.addEventListener('input', () => { G.st.val = inp.value; const b = $('#chk'); if (b) b.disabled = !typedValue(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ACT.gCheck(); });
  }
}
ACT.gQuit = () => go('#/s/hw/' + G.id);
ACT.gSay = (t) => { t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 1800); say(t.dataset.t, !!t.dataset.slow); };
ACT.gPick = (t) => { const q = curQ(); G.st.sel = +t.dataset.i; drawPlay(); if (q.speakOpts) say(q.opts[G.st.sel]); };
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
  if (!ok && !q.retry) retryLater(q);
  if (!q.retry) { G.asked += q.total; if (ok) G.right += q.total; }
  bump(q);
  drawPlay();
  const after = q.afterSay || (q.t === 'tap' && q.enBuild ? q.sentence : null) || (q.t === 'tap' || q.t === 'spaces' || q.t === 'odd' ? q.sentence : null) || (q.t === 'type' ? q.answer : null);
  if (after) say(after);
};
ACT.gNext = () => { G.idx++; if (G.idx >= G.queue.length) finishPlay(); else nextQ(); };

async function finishPlay() {
  const secs = Math.round((Date.now() - G.t0) / 1000), g = G;
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
