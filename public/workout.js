const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
/* Workout: one lesson played as a chain of full-page activities (about 8 to 16 stages) */
let WK = null, WKT = null;
function wkCss() {
  if (document.getElementById('wkcss')) return;
  const st = document.createElement('style'); st.id = 'wkcss';
  st.textContent = `.wk{max-width:760px;margin:0 auto;padding:12px 14px 40px}
.wk-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
.wk-top button{font:inherit;font-weight:800;font-size:13px;border:2px solid var(--line);background:#fff;border-radius:12px;padding:8px 12px;cursor:pointer;color:var(--ink)}
.wk-top .sp{flex:1}
.wk-head{background:linear-gradient(135deg,#0891B2,#2563eb);color:#fff;border-radius:20px;padding:16px 18px;margin-bottom:12px;box-shadow:0 8px 20px rgba(8,145,178,.25)}
.wk-head small{opacity:.85;font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:11px}
.wk-head h2{font-size:21px;margin:4px 0 4px}
.wk-head p{font-size:14px;opacity:.95;margin:0}
.wk-stats{display:flex;gap:14px;flex-wrap:wrap;font-weight:800;font-size:13px;margin:0 2px 12px;color:var(--ink)}
.wk-stats span{background:#fff;border:2px solid var(--line);border-radius:999px;padding:5px 12px}
.wk-bar{height:8px;background:#dfe6f5;border-radius:6px;overflow:hidden;margin-bottom:12px}
.wk-bar i{display:block;height:100%;background:#0891B2;transition:width .3s}
.wk-card{background:#fff;border:2px solid var(--line);border-radius:20px;padding:6px 14px}
.wk-it{display:flex;gap:10px;align-items:flex-start;padding:13px 2px;border-bottom:1px solid #eef1f8}
.wk-it:last-child{border-bottom:0}
.wk-n{flex:none;width:26px;height:26px;border-radius:50%;background:#e3f4fd;color:#0b6fa5;font-weight:900;font-size:13px;display:flex;align-items:center;justify-content:center;margin-top:2px}
.wk-it.ok .wk-n{background:#16a34a;color:#fff}.wk-it.bad .wk-n{background:#dc2626;color:#fff}.wk-it.half .wk-n{background:#f59e0b;color:#fff}
.wk-b{flex:1;min-width:0}
.wk-q{font-weight:800;font-size:17px;margin-bottom:8px;word-break:break-word}
.wk-s{font-size:13px;color:#667;margin:-4px 0 8px;font-weight:600}
.wk-o{display:flex;flex-wrap:wrap;gap:8px}
.wk-o button{font:inherit;font-weight:700;font-size:15px;border:2px solid var(--line);background:#fff;border-radius:12px;padding:8px 13px;cursor:pointer;color:var(--ink);box-shadow:0 3px 0 var(--line)}
.wk-o button.sel{border-color:#1aa7ec;background:#e3f4fd}
.wk-o button.ok{border-color:#16a34a;background:#e4f8ee}.wk-o button.bad{border-color:#dc2626;background:#fde8e8}
.wk-o button.off{opacity:.35;text-decoration:line-through}
.wk-in{width:100%;box-sizing:border-box;font:inherit;font-weight:700;font-size:17px;border:2px solid var(--line);border-radius:12px;padding:10px 12px}
.wk-in:disabled{background:#f6f8fc}
.wk-fix{margin-top:6px;font-size:14px;font-weight:700;color:#b91c1c}.wk-fix b{color:#15803d}
.wk-h{flex:none;border:0;background:#fff7e0;border-radius:10px;font-size:17px;padding:6px 8px;cursor:pointer}
.wk-tiles{display:flex;flex-wrap:wrap;gap:7px;min-height:38px;padding:6px;background:#f2f5fb;border-radius:12px;margin-bottom:8px}
.wk-tiles button,.wk-bank button{font:inherit;font-weight:700;font-size:15px;border:2px solid var(--line);background:#fff;border-radius:10px;padding:6px 11px;cursor:pointer;color:var(--ink)}
.wk-bank{display:flex;flex-wrap:wrap;gap:7px}.wk-bank .gh{opacity:.25;pointer-events:none}
.wk-mt{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px 0}
.wk-mt button{font:inherit;font-weight:700;font-size:15px;border:2px solid var(--line);background:#fff;border-radius:12px;padding:11px 10px;cursor:pointer;color:var(--ink);text-align:left}
.wk-mt button.sel{border-color:#1aa7ec;background:#e3f4fd}.wk-mt button.got{border-color:#16a34a;background:#e4f8ee;opacity:.75;pointer-events:none}.wk-mt button.wrong{border-color:#dc2626;background:#fde8e8}
.wk-nav{display:flex;gap:10px;margin-top:14px}
.wk-nav button{font:inherit;font-weight:900;font-size:16px;border-radius:14px;padding:13px 18px;border:2px solid var(--line);background:#fff;cursor:pointer;color:var(--ink)}
.wk-nav .go{flex:1;background:#16a34a;border-color:#15803d;color:#fff;box-shadow:0 4px 0 #15803d}
.wk-nav .go.nx{background:#2563eb;border-color:#1d4ed8;box-shadow:0 4px 0 #1d4ed8}
.wk-nav .cnt{flex:none;align-self:center;font-weight:800;color:#667;border:0;background:none}
.wk-sw{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:50;display:flex;align-items:flex-end;justify-content:center}
.wk-sw>div{background:#fff;width:100%;max-width:560px;border-radius:22px 22px 0 0;padding:18px;max-height:80vh;overflow:auto}
.wk-sw h3{margin:0 0 10px}
.wk-sw button{display:flex;gap:10px;align-items:center;width:100%;text-align:left;font:inherit;font-weight:700;border:2px solid var(--line);background:#fff;border-radius:12px;padding:10px 12px;margin:6px 0;cursor:pointer;color:var(--ink)}
.wk-sw button.cur{border-color:#2563eb;background:#eaf1ff}.wk-sw button i{font-style:normal;margin-left:auto;font-size:13px;color:#667}
.wk-res .row{display:flex;justify-content:space-between;padding:9px 4px;border-bottom:1px solid #eef1f8;font-weight:700}`;
  document.head.appendChild(st);
}
ROUTES.push([/^\/s\/practice\/workout\/(\w+)\/([\w,-]+)$/, async (level, ids) => {
  startHeartbeat(); ST.hw = null; wkCss();
  const d = await api('/student/practice/lessons?ids=' + encodeURIComponent(ids.split(',')[0]));
  VOICE.cloud = !!d.tts; ST.lang = 'fr-FR';
  const L = d.lessons[0];
  if (!L) return go('#/s/practice');
  await waitVoices();
  const stages = wkBuild(L);
  if (!stages.length) { toast('Not enough content in this lesson for a workout'); return go('#/s/practice'); }
  const total = stages.reduce((n, s) => n + s.items.length, 0);
  WK = { L, level, ids: ids.split(',')[0], stages, cur: 0, hints: 0, t0: Date.now(), total, sw: false };
  PH_AGAIN = '#/s/practice/workout/' + level + '/' + WK.ids;
  if (WKT) clearInterval(WKT);
  WKT = setInterval(() => { const e = document.getElementById('wkClock'); if (e && WK) { const s = Math.round((Date.now() - WK.t0) / 1000); e.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); } }, 1000);
  cleanup = () => { if (WKT) clearInterval(WKT); WKT = null; stopSpeech(); WK = null; };
  wkDraw();
}]);
/* ---------- building the stages ---------- */
function wkBuild(L) {
  const out = [];
  const items = (L.items || []).filter((i) => i.fr && i.en);
  const verbs = L.verbs || [];
  const cap = (arr, n) => shuffle(arr).slice(0, n);
  const tk = (s) => toks(s);
  const keyWord = (it) => { const t = tk(it.fr).map(coreWord); let bi = -1, bl = 0; t.forEach((w, i) => { const n = Array.from(w).filter((c) => /\p{L}/u.test(c)).length; if (n > bl && n >= 3) { bl = n; bi = i; } }); if (bi < 0) return null; return { t, i: bi, w: t[bi] }; };
  const enOpts = (it, pool, n) => shuffle([it.en].concat(shuffle([...new Set(pool.filter((x) => x.en !== it.en).map((x) => x.en))]).slice(0, n - 1)));
  const frOpts = (it, pool, n) => shuffle([it.fr].concat(shuffle([...new Set(pool.filter((x) => x.fr !== it.fr).map((x) => x.fr))]).slice(0, n - 1)));
  const pat = (a) => tk(a).map((w) => Array.from(w).map((c, i) => (i === 0 || !/\p{L}/u.test(c) ? c : '·')).join('')).join(' ');
  const add = (id, name, instr, t, its, extra) => { if (its && its.length >= (t === 'match' ? 3 : 2)) out.push(Object.assign({ id, name, instr, t, items: its }, extra || {})); };
  if (items.length >= 4 && !verbs.length && !items.some((i) => i.g)) {
    const sents = items.filter((i) => i.s || tk(i.fr).length >= 3), words = items.filter((i) => !(i.s || tk(i.fr).length >= 3));
    const isSent = sents.length >= Math.max(4, items.length / 2);
    const base = isSent ? sents : items;
    const N = 12;
    add('mcq', 'Multiple choice quiz', 'Choose the correct English meaning.', 'pick', cap(base, N).map((it) => ({ q: it.fr, ans: it.en, opts: enOpts(it, items, 3), audio: it.fr })));
    add('match', 'Match English and French', 'Tap an English item, then its French match.', 'match', cap(base, 8).map((it) => ({ l: it.en, r: it.fr })));
    add('frmcq', 'Choose the French', 'Choose the correct French.', 'pick', cap(base, N).map((it) => ({ q: it.en, ans: it.fr, opts: frOpts(it, items, 3), audio: it.fr })));
    if (isSent) {
      add('halves', 'Match the sentence halves', 'Join each beginning to its ending.', 'match', cap(base.filter((it) => tk(it.fr).length >= 4), 7).map((it) => { const t = tk(it.fr), h = Math.ceil(t.length / 2); return { l: t.slice(0, h).join(' ') + ' …', r: '… ' + t.slice(h).join(' ') }; }));
      add('order', 'Ordering task', 'Put the words in the right order. Tap the words to build the sentence.', 'order', cap(base.filter((it) => tk(it.fr).length >= 3 && tk(it.fr).length <= 12), 8).map((it) => { const t = tk(it.fr); return { q: it.en, ans: t, bank: shuffle(t.map((w, i) => ({ w, i }))).map((x) => x.w), say: it.fr }; }));
      add('enorder', 'Build the English', 'Put the English words in the right order.', 'order', cap(base.filter((it) => tk(it.en).length >= 3 && tk(it.en).length <= 11), 6).map((it) => { const t = tk(it.en); return { q: it.fr, ans: t, bank: shuffle(t.slice()), say: it.fr, audio: it.fr }; }));
    }
    const kw = cap(base.map((it) => ({ it, k: keyWord(it) })).filter((x) => x.k), N);
    add('broken', 'Broken words', 'Each word has been cut in two. Choose the missing second part.', 'pick', kw.map(({ it, k }) => { const cs = Array.from(k.w), h = Math.max(1, Math.ceil(cs.length / 2)), a = cs.slice(0, h).join(''), b = cs.slice(h).join(''); const others = shuffle(kw.map((x) => Array.from(x.k.w)).filter((c) => c.length > 1).map((c) => c.slice(Math.ceil(c.length / 2)).join('')).filter((x) => x && x !== b)); const opts = shuffle([b].concat([...new Set(others)].slice(0, 2))); return { q: k.t.map((w, i) => (i === k.i ? a + ' ‥' : w)).join(' '), sub: it.en, ans: b, opts }; }));
    add('missing', 'Missing letter challenge', 'Two letters are missing. Type the whole word.', 'type', kw.map(({ it, k }) => { const cs = Array.from(k.w); const pos = shuffle(cs.map((c, i) => i).filter((i) => /\p{L}/u.test(cs[i]) && i > 0)).slice(0, 2); const w2 = cs.map((c, i) => (pos.includes(i) ? '_' : c)).join(''); return { q: k.t.map((w, i) => (i === k.i ? w2 : w)).join(' '), sub: it.en, ans: k.w, whole: false, ph: '' }; }));
    add('anagram', 'Anagrams', 'Unscramble the highlighted word and type it.', 'type', kw.filter((x) => Array.from(x.k.w).length >= 4).slice(0, N).map(({ it, k }) => { let sc = k.w, n = 0; while (sc === k.w && n++ < 12) sc = shuffle(Array.from(k.w)).join(''); return { q: k.t.map((w, i) => (i === k.i ? '[ ' + Array.from(sc).join(' ') + ' ]' : w)).join(' '), sub: it.en, ans: k.w }; }));
    add('entofr', 'English to French translation', 'Type the French.', 'type', cap(base, 10).map((it) => ({ q: it.en, ans: it.fr, ph: pat(it.fr), say: it.fr })));
    add('spot', 'Spot the error and rewrite', 'One word is wrong. Type the correct version.', 'type', cap(base.filter((it) => keyWord(it)), 8).map((it) => { const k = keyWord(it), d = distractors(it.fr, items, 1)[0]; if (!d) return null; return { q: k.t.map((w, i) => (i === k.i ? d : w)).join(' '), sub: it.en, ans: it.fr, ph: pat(it.fr), say: it.fr }; }).filter(Boolean));
    add('cloze', 'Complete with the correct option', 'Choose the word that fits the gap.', 'pick', cap(base.map((it) => ({ it, k: keyWord(it) })).filter((x) => x.k && tk(x.it.fr).length >= 2), N).map(({ it, k }) => ({ q: k.t.map((w, i) => (i === k.i ? '_____' : w)).join(' '), sub: it.en, ans: k.w, opts: shuffle([k.w].concat(distractors(it.fr, items, 2))), after: it.fr })));
    add('memory', 'Complete from memory', 'Type the missing word. The English will help you.', 'type', cap(base.map((it) => ({ it, k: keyWord(it) })).filter((x) => x.k && tk(x.it.fr).length >= 2), N).map(({ it, k }) => ({ q: k.t.map((w, i) => (i === k.i ? '_____' : w)).join(' '), sub: it.en, ans: k.w, ph: pat(k.w), after: it.fr })));
    add('tf', 'True or false', 'Does the French match the English?', 'pick', cap(base, N).map((it, i) => { const w = shuffle(items.filter((x) => x.en !== it.en))[0]; const t = i % 2 === 0 || !w; return { q: it.fr + '  =  ' + (t ? it.en : w.en), ans: t ? 'True' : 'False', opts: ['True', 'False'], after: it.fr + ' = ' + it.en }; }));
    if (canSpeak()) add('listen', 'Listen and choose', 'Listen, then choose what you hear.', 'pick', cap(base, 10).map((it) => ({ q: 'Listen 🔊', audio: it.fr, auto: false, ans: it.fr, opts: frOpts(it, items, 3) })));
    if (canSpeak()) add('dict', 'Dictation', 'Listen and type what you hear.', 'type', cap(base, 8).map((it) => ({ q: 'Listen 🔊', audio: it.fr, ans: it.fr, ph: pat(it.fr) })));
    if (!isSent) add('frtoen', 'French to English translation', 'Choose the English for each French word.', 'pick', cap(words.length >= 4 ? words : items, N).map((it) => ({ q: it.fr, ans: it.en, opts: enOpts(it, items, 4) })));
    else add('translate', 'Translate into French', 'Type the sentence in French.', 'type', cap(base, 8).map((it) => ({ q: it.en, ans: it.fr, ph: pat(it.fr), say: it.fr })));
  } else if (verbs.length) {
    const combos = []; verbs.forEach((v) => v.forms.forEach((f, i) => combos.push({ v, i, f })));
    const lab = (c) => pronounFor(c.i, c.f) + ' ____  (' + c.v.inf + ')';
    cap(verbs, 3).forEach((v, k) => add('vm' + k, 'Match the forms: ' + v.inf, 'Match each pronoun to its form of ' + v.inf + (v.tense ? ' (' + v.tense + ')' : '') + '.', 'match', v.forms.map((f, i) => ({ l: pronounFor(i, f), r: f }))));
    add('mcq', 'Multiple choice conjugation', 'Pick the correct form.', 'pick', cap(combos, 12).map((c) => ({ q: lab(c), sub: [c.v.en, c.v.tense].filter(Boolean).join(' · '), ans: c.f, opts: shuffle([c.f].concat(shuffle([...new Set(c.v.forms.filter((x) => x !== c.f))]).slice(0, 3))), after: pronounFor(c.i, c.f) + ' ' + c.f })));
    add('type', 'Conjugate the verb', 'Type the correct form.', 'type', cap(combos, 12).map((c) => ({ q: lab(c), sub: [c.v.en, c.v.tense].filter(Boolean).join(' · '), ans: c.f, ph: pat(c.f), after: pronounFor(c.i, c.f) + ' ' + c.f })));
    add('spot', 'Spot the error and rewrite', 'The verb form is wrong. Type the correct one.', 'type', cap(combos, 10).map((c) => { const w = shuffle([...new Set(c.v.forms.filter((x) => x !== c.f))])[0]; return w ? { q: pronounFor(c.i, c.f) + ' ' + w + '  (' + c.v.inf + ')', ans: c.f, ph: pat(c.f), sub: c.v.tense || '' } : null; }).filter(Boolean));
    add('missing', 'Missing letter challenge', 'Two letters are missing. Type the whole form.', 'type', cap(combos, 10).map((c) => { const cs = Array.from(c.f), pos = shuffle(cs.map((x, i) => i).filter((i) => i > 0 && /\p{L}/u.test(cs[i]))).slice(0, 2); return { q: pronounFor(c.i, c.f) + ' ' + cs.map((x, i) => (pos.includes(i) ? '_' : x)).join(''), sub: c.v.inf + (c.v.tense ? ' · ' + c.v.tense : ''), ans: c.f }; }));
    add('anagram', 'Anagrams', 'Unscramble the verb form and type it.', 'type', cap(combos.filter((c) => Array.from(c.f).length >= 4), 10).map((c) => { let sc = c.f, n = 0; while (sc === c.f && n++ < 12) sc = shuffle(Array.from(c.f)).join(''); return { q: pronounFor(c.i, c.f) + ' [ ' + Array.from(sc).join(' ') + ' ]', sub: c.v.inf, ans: c.f }; }));
    add('tf', 'True or false', 'Is the verb form correct?', 'pick', cap(combos, 12).map((c, i) => { const w = shuffle([...new Set(c.v.forms.filter((x) => x !== c.f))])[0]; const t = i % 2 === 0 || !w; return { q: pronounFor(c.i, c.f) + ' ' + (t ? c.f : w) + '  (' + c.v.inf + ')', ans: t ? 'True' : 'False', opts: ['True', 'False'], after: pronounFor(c.i, c.f) + ' ' + c.f }; }));
    cap(verbs, 2).forEach((v, k) => add('tbl' + k, 'Complete the table: ' + v.inf, 'Type all six forms of ' + v.inf + (v.tense ? ' (' + v.tense + ')' : '') + ' from memory.', 'type', v.forms.map((f, i) => ({ q: pronounFor(i, f) + ' …', ans: f, sub: i === 0 ? v.en : '', ph: pat(f) }))));
    if (canSpeak()) add('dict', 'Dictation', 'Listen and type the form you hear.', 'type', cap(combos, 8).map((c) => ({ q: 'Listen 🔊', audio: pronounFor(c.i, c.f) + ' ' + c.f, ans: pronounFor(c.i, c.f) + ' ' + c.f })));
  } else {
    const gram = items.filter((i) => i.g);
    const G2 = (L.items || []).filter((g) => g.s && g.a);
    add('gap', 'Complete with the correct option', 'Choose the word that fills the gap.', 'pick', cap(G2.filter((g) => g.o && g.o.length), 12).map((g) => ({ q: g.s.replace('___', '_____'), sub: g.h, ans: g.a, opts: shuffle([g.a].concat(g.o.slice(0, 3))), after: g.s.replace('___', g.a) })));
    add('gaptype', 'Complete from memory', 'Type the missing word.', 'type', cap(G2, 12).map((g) => ({ q: g.s.replace('___', '_____'), sub: g.h, ans: g.a, ph: pat(g.a), after: g.s.replace('___', g.a) })));
    add('tf', 'True or false', 'Is the sentence correct?', 'pick', cap(G2.filter((g) => g.o && g.o.length), 12).map((g, i) => { const t = i % 2 === 0; return { q: g.s.replace('___', t ? g.a : g.o[0]), ans: t ? 'True' : 'False', opts: ['True', 'False'], after: g.s.replace('___', g.a) }; }));
    add('order', 'Ordering task', 'Put the words in the right order.', 'order', cap(G2.filter((g) => tk(g.s.replace('___', g.a)).length >= 3 && tk(g.s.replace('___', g.a)).length <= 12), 8).map((g) => { const t = tk(g.s.replace('___', g.a)); return { q: g.h || 'Build the sentence', ans: t, bank: shuffle(t.slice()) }; }));
    add('rewrite', 'Rewrite the sentence', 'Type the whole sentence with the gap filled in.', 'type', cap(G2, 8).map((g) => ({ q: g.s.replace('___', '_____'), sub: g.h, ans: g.s.replace('___', g.a), ph: pat(g.s.replace('___', g.a)) })));
    add('spot', 'Spot the error and rewrite', 'One word is wrong. Type the correct sentence.', 'type', cap(G2.filter((g) => g.o && g.o.length), 8).map((g) => ({ q: g.s.replace('___', g.o[0]), sub: g.h, ans: g.s.replace('___', g.a), ph: pat(g.s.replace('___', g.a)) })));
  }
  out.forEach((s, si) => { s.items.forEach((it) => { it.st = {}; }); s.si = si; s.done = false; s.score = 0; });
  return out;
}
/* ---------- drawing ---------- */
const wkStage = () => WK.stages[WK.cur];
const wkOverall = () => WK.stages.reduce((n, s) => n + s.score, 0);
function wkDraw() {
  const s = wkStage(), W = WK, ic = s.items.length;
  const pct = Math.round(W.stages.filter((x) => x.done).length / W.stages.length * 100);
  let body = '';
  if (s.t === 'match') body = wkMatch(s);
  else body = '<div class="wk-card">' + s.items.map((it, i) => wkItem(s, it, i)).join('') + '</div>';
  const mt = s.t === 'match';
  $('#app').innerHTML = `<div class="wk"><div class="wk-top"><button data-act="wkQuit">⬅ Menu</button><button data-act="wkSw">🔀 Switch activity</button><span class="sp"></span><button data-act="wkPrint" title="Print this stage">🖨</button></div>
  <div class="wk-head"><small>Workout · ${esc(W.L.title || '')}</small><h2>${esc(s.name)}</h2><p>${esc(s.instr)}</p></div>
  <div class="wk-stats"><span>Score: ${s.done ? s.score : 0} / ${ic}</span><span>Overall: ${wkOverall()} / ${W.total}</span><span>💡 Hints: ${W.hints}</span><span>⏱ <b id="wkClock">00:00</b></span></div>
  <div class="wk-bar"><i style="width:${pct}%"></i></div>${body}
  <div class="wk-nav"><button data-act="wkPrev" ${W.cur ? '' : 'disabled'}>Back</button>${s.done || mt && s.done ? '<button class="go nx" data-act="wkNext">' + (W.cur === W.stages.length - 1 ? 'Finish' : 'Next ▶') + '</button>' : mt ? '<button class="go nx" data-act="wkNext">Skip ▶</button>' : '<button class="go" data-act="wkCheck">Check</button>'}<span class="cnt">${W.cur + 1}/${W.stages.length}</span></div>
  ${W.sw ? wkSwitch() : ''}</div>`;
  $$('.wk-in').forEach((inp) => { inp.addEventListener('input', () => { s.items[+inp.dataset.i].st.v = inp.value; }); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const n = $$('.wk-in')[+inp.dataset.i + 1]; if (n && !s.done) n.focus(); else if (!s.done) ACT.wkCheck(); } }); });
}
function wkItem(s, it, i) {
  const st = it.st, done = s.done;
  const cls = done ? (st.res === 1 ? 'ok' : st.res > 0 ? 'half' : 'bad') : '';
  const aud = it.audio ? `<button class="wk-h" style="background:#e3f4fd" data-act="wkSay" data-t="${esc(it.audio)}" title="Listen">🔊</button>` : '';
  let ctl = '';
  if (s.t === 'pick') ctl = '<div class="wk-o">' + it.opts.map((o, k) => { let c = ''; if (done) c = o === it.ans ? 'ok' : (st.sel === k ? 'bad' : ''); else if (st.sel === k) c = 'sel'; else if (st.off && st.off.includes(k)) c = 'off'; return `<button class="${c}" data-act="wkPick" data-i="${i}" data-k="${k}" ${done ? 'disabled' : ''}>${esc(o)}</button>`; }).join('') + '</div>';
  if (s.t === 'type') ctl = `<input class="wk-in" data-i="${i}" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(st.v || '')}" placeholder="${esc(st.hint ? it.ph || '' : 'Type here')}" ${done ? 'disabled' : ''}>`;
  if (s.t === 'order') { const ch = st.chosen || []; ctl = `<div class="wk-tiles">${ch.map((b, k) => `<button data-act="wkUn" data-i="${i}" data-k="${k}" ${done ? 'disabled' : ''}>${esc(it.bank[b])}</button>`).join('')}</div><div class="wk-bank">${it.bank.map((w, b) => `<button class="${ch.includes(b) ? 'gh' : ''}" data-act="wkTile" data-i="${i}" data-b="${b}" ${done ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div>`; }
  let fix = '';
  if (done && st.res < 1) fix = `<div class="wk-fix">${st.res > 0 ? 'Almost, check the accents. ' : ''}Answer: <b>${esc(s.t === 'order' ? it.ans.join(' ') : it.ans)}</b>${it.after && s.t !== 'order' && it.after !== it.ans ? ' · ' + esc(it.after) : ''}</div>`;
  return `<div class="wk-it ${cls}"><div class="wk-n">${i + 1}</div><div class="wk-b"><div class="wk-q">${esc(it.q)}</div>${it.sub ? '<div class="wk-s">' + esc(it.sub) + '</div>' : ''}${ctl}${fix}</div>${aud}${done ? '' : `<button class="wk-h" data-act="wkHint" data-i="${i}" title="Hint (costs half a point)">💡</button>`}</div>`;
}
function wkMatch(s) {
  const st = s.ms || (s.ms = { sel: null, got: {}, miss: {}, bad: null, L: shuffle(s.items.map((_, i) => i)), R: shuffle(s.items.map((_, i) => i)) });
  const col = (arr, side) => '<div style="display:grid;gap:10px">' + arr.map((i) => `<button class="${st.got[i] ? 'got' : ''} ${st.sel && st.sel.side === side && st.sel.i === i ? 'sel' : ''} ${st.bad && st.bad.side === side && st.bad.i === i ? 'wrong' : ''}" data-act="wkM" data-side="${side}" data-i="${i}">${esc(side === 'L' ? s.items[i].l : s.items[i].r)}</button>`).join('') + '</div>';
  return `<div class="wk-card"><div class="wk-mt">${col(st.L, 'L')}${col(st.R, 'R')}</div></div>`;
}
function wkSwitch() {
  return `<div class="wk-sw" data-act="wkSwClose"><div><h3>Activities available</h3>${WK.stages.map((s, i) => `<button class="${i === WK.cur ? 'cur' : ''}" data-act="wkGo" data-i="${i}"><span>${i + 1}.</span> ${esc(s.name)}<i>${s.done ? s.score + '/' + s.items.length : ''}</i></button>`).join('')}</div></div>`;
}
/* ---------- actions ---------- */
ACT.wkQuit = () => go('#/s/practice');
ACT.wkSw = () => { WK.sw = true; wkDraw(); };
ACT.wkSwClose = (t, e) => { if (e && e.target !== t) return; WK.sw = false; wkDraw(); };
ACT.wkGo = (t) => { WK.cur = +t.dataset.i; WK.sw = false; wkDraw(); window.scrollTo(0, 0); };
ACT.wkPrev = () => { if (WK.cur) { WK.cur--; wkDraw(); window.scrollTo(0, 0); } };
ACT.wkPrint = () => window.print();
ACT.wkSay = (t) => speakText(t.dataset.t, 'fr-FR', false);
ACT.wkPick = (t) => { const it = wkStage().items[+t.dataset.i]; it.st.sel = +t.dataset.k; if (it.audio && wkStage().id !== 'listen') { /* keep silent */ } wkDraw(); };
ACT.wkTile = (t) => { const it = wkStage().items[+t.dataset.i]; (it.st.chosen = it.st.chosen || []).push(+t.dataset.b); wkDraw(); };
ACT.wkUn = (t) => { const it = wkStage().items[+t.dataset.i]; it.st.chosen.splice(+t.dataset.k, 1); wkDraw(); };
ACT.wkHint = (t) => {
  const s = wkStage(), it = s.items[+t.dataset.i], st = it.st; if (st.hint) return toast('Hint already used here');
  st.hint = true; WK.hints++;
  if (s.t === 'pick') { const wrong = it.opts.map((o, k) => k).filter((k) => it.opts[k] !== it.ans && k !== st.sel); st.off = shuffle(wrong).slice(0, Math.max(1, Math.floor(it.opts.length / 2) - (it.opts.length === 2 ? 0 : 0))).slice(0, it.opts.length === 2 ? 0 : 1); if (!st.off.length) toast('Think about the meaning'); }
  if (s.t === 'order') { const need = it.ans[(st.chosen || []).length]; const b = it.bank.findIndex((w, k) => w === need && !(st.chosen || []).includes(k)); if (b >= 0) (st.chosen = st.chosen || []).push(b); }
  wkDraw();
};
ACT.wkM = (t) => {
  const s = wkStage(), st = s.ms, side = t.dataset.side, i = +t.dataset.i;
  if (s.done) return;
  if (side === 'L' && s.id.startsWith('vm') === false && canSpeak() && s.id === 'match') { /* silent */ }
  if (!st.sel || st.sel.side === side) { st.sel = { side, i }; st.bad = null; return wkDraw(); }
  const a = st.sel, ok = a.i === i;
  if (ok) { st.got[i] = true; st.sel = null; st.bad = null; if (s.id === 'match' || s.id === 'halves') { const it = s.items[i]; if (s.id === 'match') speakText(it.r, 'fr-FR', false); } if (Object.keys(st.got).length === s.items.length) { s.score = s.items.filter((_, k) => !st.miss[k]).length; s.done = true; } }
  else { st.miss[a.i] = true; st.miss[i] = true; st.bad = { side, i }; st.sel = null; setTimeout(() => { if (WK && st.bad) { st.bad = null; wkDraw(); } }, 600); }
  wkDraw();
};
ACT.wkCheck = () => {
  const s = wkStage(); if (s.done) return;
  let score = 0;
  s.items.forEach((it) => {
    const st = it.st; let r = 0;
    if (s.t === 'pick') r = st.sel != null && it.opts[st.sel] === it.ans ? 1 : 0;
    else if (s.t === 'type') { const c = checkTyped(st.v || '', it.ans); r = c === 'ok' ? 1 : c === 'accent' ? 0.5 : 0; }
    else if (s.t === 'order') r = (st.chosen || []).length && normT((st.chosen || []).map((b) => it.bank[b]).join(' ')) === normT(it.ans.join(' ')) ? 1 : 0;
    if (r > 0 && st.hint) r = Math.max(0.5, r - 0.5);
    st.res = r; score += r;
  });
  s.score = Math.round(score * 2) / 2; s.done = true;
  wkDraw();
};
ACT.wkNext = () => { if (WK.cur < WK.stages.length - 1) { WK.cur++; wkDraw(); window.scrollTo(0, 0); } else wkFinish(); };
async function wkFinish() {
  const W = WK, secs = Math.round((Date.now() - W.t0) / 1000), score = Math.round(wkOverall());
  const pct = Math.round(score / W.total * 100);
  try { await api('/student/practice/result', 'POST', { game: 'work', level: W.level, ids: [W.ids], score, total: W.total, secs }); } catch (e) { if (e.status === 401) { sessionStorage.setItem('kicked', '1'); return go('#/'); } }
  if (WKT) clearInterval(WKT);
  $('#app').innerHTML = `<div class="sbody"><div class="finish"><div class="conf">${pct >= 90 ? '🏆' : pct >= 60 ? '🎉' : '💪'}</div><div class="kick">WORKOUT COMPLETE</div>
    <div class="stat3b"><div><b>${score}/${W.total}</b><span>POINTS</span></div><div><b>${pct}%</b><span>ACCURACY</span></div><div><b>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</b><span>TIME</span></div></div>
    <div class="card wk-res" style="text-align:left;margin:14px 0">${W.stages.map((s) => `<div class="row"><span>${esc(s.name)}</span><span>${s.done ? s.score : 0}/${s.items.length}</span></div>`).join('')}</div>
    <button class="bigblue" data-act="phAgain">Do this workout again</button><button class="btn ghost" style="width:100%;margin-top:10px" data-act="phHub">Back to games</button></div></div>`;
}
