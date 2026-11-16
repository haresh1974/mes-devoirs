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
.wk-mic{font:inherit;font-weight:800;font-size:16px;border:2px solid #0891B2;background:#e6f7fb;color:#0b6f87;border-radius:14px;padding:12px 18px;cursor:pointer}.wk-mic.on{background:#fde8e8;border-color:#dc2626;color:#b91c1c}
.wk-pass{background:#fffbea;border:2px solid #f3e3a1;border-radius:16px;padding:12px 14px;margin-bottom:12px;font-size:16px;line-height:1.55}.wk-pass b{display:block;margin-bottom:4px}
.wk-fix{margin-top:6px;font-size:14px;font-weight:700;color:#b91c1c}.wk-fix b{color:#15803d}
.wk-h{flex:none;border:0;background:#fff7e0;border-radius:10px;font-size:17px;padding:6px 8px;cursor:pointer}
.wk-tiles{display:flex;flex-wrap:wrap;gap:7px;min-height:38px;padding:6px;background:#f2f5fb;border-radius:12px;margin-bottom:8px}
.wk-tiles button,.wk-bank button{font:inherit;font-weight:700;font-size:15px;border:2px solid var(--line);background:#fff;border-radius:10px;padding:6px 11px;cursor:pointer;color:var(--ink)}
.wk-bank{display:flex;flex-wrap:wrap;gap:7px}.wk-bank .gh{opacity:.25;pointer-events:none}
.wk-mt{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px 0}
.wk-mt button{font:inherit;font-weight:700;font-size:15px;border:2px solid var(--line);background:#fff;border-radius:12px;padding:11px 10px;cursor:pointer;color:var(--ink);text-align:left}
.wk-mt button.sel{border-color:#1aa7ec;background:#e3f4fd}.wk-mt button.got{border-color:#16a34a;background:#e4f8ee;opacity:.75;pointer-events:none}.wk-mt button.wrong{border-color:#dc2626;background:#fde8e8}
.wk-brk{display:flex;flex-wrap:wrap;align-items:center;font:800 20px ui-monospace,Menlo,monospace;margin:6px 0;line-height:2.1}.wk-brk b{display:inline-block;width:12px;height:36px;margin:0 1px;cursor:pointer;border-radius:5px;background:#eef2f9;vertical-align:middle}.wk-brk b:hover{background:#cfe4fb}.wk-brk b.on{width:14px;background:#2563eb}
.wk-rob{margin:8px 0}.wk-rob>div{display:flex;align-items:center;gap:8px;margin:3px 0;font-size:20px}.wk-rob u{flex:1;height:12px;border-radius:8px;background:#e6ebf5;overflow:hidden;text-decoration:none;display:block}.wk-rob i{display:block;height:100%;background:#16a34a;transition:width .4s}.wk-rob i.r{background:#ea580c;transition:width 1s linear}
.wk-nav{display:flex;gap:10px;margin-top:14px}
.wk-nav button{font:inherit;font-weight:900;font-size:16px;border-radius:14px;padding:13px 18px;border:2px solid var(--line);background:#fff;cursor:pointer;color:var(--ink)}
.wk-nav .go{flex:1;background:#16a34a;border-color:#15803d;color:#fff;box-shadow:0 4px 0 #15803d}
.wk-nav .go.nx{background:#2563eb;border-color:#1d4ed8;box-shadow:0 4px 0 #1d4ed8}
.wk-nav .nx2{flex:1;color:#667;border-style:dashed}
.wk-nav .cnt{flex:none;align-self:center;font-weight:800;color:#667;border:0;background:none}
.wk-sw{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:50;display:flex;align-items:flex-end;justify-content:center}
.wk-sw>div{background:#fff;width:100%;max-width:560px;border-radius:22px 22px 0 0;padding:18px;max-height:80vh;overflow:auto}
.wk-sw h3{margin:0 0 10px}
.wk-sw button{display:flex;gap:10px;align-items:center;width:100%;text-align:left;font:inherit;font-weight:700;border:2px solid var(--line);background:#fff;border-radius:12px;padding:10px 12px;margin:6px 0;cursor:pointer;color:var(--ink)}
.wk-sw button.cur{border-color:#2563eb;background:#eaf1ff}.wk-sw button i{font-style:normal;margin-left:auto;font-size:13px;color:#667}
.wk-res .row{display:flex;justify-content:space-between;padding:9px 4px;border-bottom:1px solid #eef1f8;font-weight:700}`;
  document.head.appendChild(st);
}
ROUTES.push([/^\/s\/practice\/workout\/(\w+)\/([\w,-]+)(?:\/(\w+))?$/, async (level, ids, mod) => {
  startHeartbeat(); ST.hw = null; wkCss();
  const d = await api('/student/practice/lessons?ids=' + encodeURIComponent(ids.split(',')[0]));
  VOICE.cloud = !!d.tts; ST.lang = 'fr-FR';
  const L = d.lessons[0];
  if (!L) return go('#/s/practice');
  const need = L.kind === 'gram' ? 10 : (L.kind === 'vocab' || L.kind === 'sent' || L.kind === 'speak' || L.kind === 'lis') ? 6 : 0;
  if (need && (L.items || []).length < need) {
    try {
      const all = (PH.all && PH.all.length ? PH.all : (await api('/student/practice')).lessons) || [];
      const me = all.find((y) => y.id === L.id) || {};
      const sib = all.filter((x) => x.kind === L.kind && x.level === L.level && x.id !== L.id && x.topic === me.topic).slice(0, 6).map((x) => x.id);
      const seen = new Set((L.items || []).map((g) => g.fr || g.s));
      for (let i = 0; i < sib.length && L.items.length < need + 4; i += 3) {
        const r = await api('/student/practice/lessons?ids=' + sib.slice(i, i + 3).join(','));
        (r.lessons || []).forEach((l) => (l.items || []).forEach((g) => { const k = g.fr || g.s; if (k && !seen.has(k) && !g.q && (L.kind === 'gram' ? g.s && g.a : g.fr && g.en)) { seen.add(k); L.items.push(g); } }));
      }
    } catch (e) {}
  }
  await waitVoices();
  const stages = wkBuild(L, mod || (L.kind === 'read' ? 'read' : L.kind === 'speak' ? 'speak' : L.kind === 'lis' ? 'listen' : 'vocab'));
  if (!stages.length) { toast('Not enough content in this lesson for a workout'); return go('#/s/practice'); }
  const total = stages.reduce((n, s) => n + s.items.length, 0);
  WK = { L, level, mod: mod || 'vocab', ids: ids.split(',')[0], stages, cur: 0, hints: 0, t0: Date.now(), total, sw: false };
  PH_AGAIN = '#/s/practice/workout/' + level + '/' + WK.ids + '/' + WK.mod;
  if (WKT) clearInterval(WKT);
  WKT = setInterval(() => { const e = document.getElementById('wkClock'); if (e && WK) { const s = Math.round((Date.now() - WK.t0) / 1000); e.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); } }, 1000);
  cleanup = () => { if (WKT) clearInterval(WKT); WKT = null; stopSpeech(); WK = null; };
  wkDraw();
}]);
/* ---------- building the stages ---------- */
function wkBuild(L, mod) {
  const out = [];
  const qitems = (L.items || []).filter((i) => i.q);
  const items = (L.items || []).filter((i) => i.fr && i.en && !i.q);
  const verbs = L.verbs || [];
  const cap = (arr, n) => shuffle(arr).slice(0, n);
  const tk = (s) => toks(s);
  const keyWord = (it) => { const t = tk(it.fr).map(coreWord); let bi = -1, bl = 0; t.forEach((w, i) => { const n = Array.from(w).filter((c) => /\p{L}/u.test(c)).length; if (n > bl && n >= 3) { bl = n; bi = i; } }); if (bi < 0) return null; return { t, i: bi, w: t[bi] }; };
  const enOpts = (it, pool, n) => shuffle([it.en].concat(shuffle([...new Set(pool.filter((x) => x.en !== it.en).map((x) => x.en))]).slice(0, n - 1)));
  const frOpts = (it, pool, n) => shuffle([it.fr].concat(shuffle([...new Set(pool.filter((x) => x.fr !== it.fr).map((x) => x.fr))]).slice(0, n - 1)));
  const pat = (a) => tk(a).map((w) => Array.from(w).map((c, i) => (i === 0 || !/\p{L}/u.test(c) ? c : '·')).join('')).join(' ');
  const add = (id, name, instr, t, its, extra) => { if (its && its.length >= (t === 'match' ? 3 : 2)) out.push(Object.assign({ id, name, instr, t, items: its }, extra || {})); };
  if (items.length >= 3 && !verbs.length && !items.some((i) => i.g)) {
    const sents = items.filter((i) => i.s || tk(i.fr).length >= 3), words = items.filter((i) => !(i.s || tk(i.fr).length >= 3));
    const isSent = mod === 'read' || sents.length >= Math.max(4, items.length / 2);
    const base0 = isSent ? sents : items, base = base0.filter((it) => !/[()]/.test(it.fr + it.en)).length >= 3 ? base0.filter((it) => !/[()]/.test(it.fr + it.en)) : base0;
    const uq = (arr) => { const a = new Set(), b = new Set(); return arr.filter((x) => { if (a.has(x.l) || b.has(x.r)) return false; a.add(x.l); b.add(x.r); return true; }); };
    const N = 12;
    if (mod === 'read') {
      add('rcomp', 'Comprehension questions', 'Read the text, then choose the correct answer.', 'pick', cap(qitems.filter((q) => q.o), 10).map((q) => ({ q: q.q, ans: q.a, opts: shuffle([q.a].concat(q.o)) })));
      const mtf = cap(qitems.filter((q) => q.o && q.o.length), 8).map((q, i) => { const t = i % 2 === 0; return { q: q.q + '  →  ' + (t ? q.a : q.o[0]), ans: t ? 'True' : 'False', opts: ['True', 'False'], after: q.q + ' → ' + q.a }; });
      add('rtf', 'True or false', 'According to the text, is each statement true or false?', 'pick', cap(qitems.filter((q) => !q.o), 10).map((q) => ({ q: q.q, ans: q.a, opts: ['True', 'False'] })).concat(mtf));
    }
    if (mod === 'listen') {
      const au = (it) => it.fr;
      add('l1', 'Listen and choose', 'Listen, then choose what you hear.', 'pick', cap(base, N).map((it) => ({ q: 'Listen 🔊', audio: au(it), ans: it.fr, opts: frOpts(it, items, 3) })));
      add('l2', 'Listen and choose the meaning', 'Listen, then choose the English meaning.', 'pick', cap(base, N).map((it) => ({ q: 'Listen 🔊', audio: au(it), ans: it.en, opts: enOpts(it, items, 3) })));
      add('l3', 'Listen and type', 'Listen and type what you hear.', 'type', cap(base, 10).map((it) => ({ q: 'Listen 🔊', audio: au(it), ans: it.fr, ph: pat(it.fr) })));
      add('l4', 'Listen and order the words', 'Listen, then tap the words in the order you hear them.', 'order', cap(base.filter((it) => tk(it.fr).length >= 3 && tk(it.fr).length <= 12), 8).map((it) => { const t = tk(it.fr); return { q: 'Listen 🔊', audio: au(it), ans: t, bank: shuffle(t.slice()) }; }));
      add('l5', 'Listen and complete', 'Listen and choose the word missing from the text.', 'pick', cap(base.map((it) => ({ it, k: keyWord(it) })).filter((x) => x.k && tk(x.it.fr).length >= 2), N).map(({ it, k }) => ({ q: k.t.map((w, i) => (i === k.i ? '_____' : w)).join(' '), audio: au(it), ans: k.w, opts: shuffle([k.w].concat(distractors(it.fr, items, 2))) })));
      add('l6', 'Listen: true or false', 'Listen. Is the English translation correct?', 'pick', cap(base, N).map((it, i) => { const w = shuffle(items.filter((x) => x.en !== it.en))[0]; const t = i % 2 === 0 || !w; return { q: t ? it.en : w.en, audio: au(it), ans: t ? 'True' : 'False', opts: ['True', 'False'], after: it.fr + ' = ' + it.en }; }));
      add('l7', 'Listen and write the missing word', 'Listen and type the missing word.', 'type', cap(base.map((it) => ({ it, k: keyWord(it) })).filter((x) => x.k && tk(x.it.fr).length >= 2), N).map(({ it, k }) => ({ q: k.t.map((w, i) => (i === k.i ? '_____' : w)).join(' '), sub: it.en, audio: au(it), ans: k.w, ph: pat(k.w), after: it.fr })));
      add('l8', 'Listen and write what you hear (English)', 'Listen and choose the best English translation.', 'pick', cap(base, 10).map((it) => ({ q: 'Listen 🔊', audio: au(it), ans: it.en, opts: enOpts(it, items, 4) })));
    } else if (mod === 'speak') {
      const sp = (id, name, instr, arr, mk) => add(id, name, instr, 'speak', cap(arr, 8).map(mk));
      sp('s1', 'Listen and repeat', 'Listen to the model, then say it aloud.', base, (it) => ({ q: it.fr, sub: it.en, audio: it.fr, ans: it.fr }));
      sp('s2', 'Say it in French', 'Say each phrase in French. Tap 💡 if you need to see it.', base, (it) => ({ q: it.en, ans: it.fr, audio: it.fr, noAudioFirst: true }));
      sp('s3', 'Read aloud', 'Read each sentence aloud as clearly as you can.', base, (it) => ({ q: it.fr, ans: it.fr }));
      sp('s4', 'Complete and say it', 'Say the whole sentence, filling the gap.', base.map((it) => ({ it, k: keyWord(it) })).filter((x) => x.k && tk(x.it.fr).length >= 2), ({ it, k }) => ({ q: k.t.map((w, i) => (i === k.i ? '_____' : w)).join(' '), sub: it.en, ans: it.fr, audio: it.fr, noAudioFirst: true }));
      sp('s5', 'Translate aloud', 'Read the English, then say it in French.', base.slice().reverse(), (it) => ({ q: it.en, ans: it.fr, audio: it.fr, noAudioFirst: true }));
    } else {
    add('mcq', 'Multiple choice quiz', 'Choose the correct English meaning.', 'pick', cap(base, N).map((it) => ({ q: it.fr, ans: it.en, opts: enOpts(it, items, 3), audio: it.fr })));
    add('dmatch', 'Drag and match', 'Match each French item to its English meaning.', 'match', uq(cap(base, 10).map((it) => ({ l: it.fr, r: it.en }))).slice(0, 8));
    add('match', 'Match English and French', 'Tap an English item, then its French match.', 'match', uq(cap(base, 10).map((it) => ({ l: it.en, r: it.fr }))).slice(0, 8));
    add('frmcq', 'One of three', 'Choose the correct French from the three options.', 'pick', cap(base, N).map((it) => ({ q: it.en, ans: it.fr, opts: frOpts(it, items, 3), audio: it.fr })));
    if (isSent) {
      add('halves', 'Match the sentence halves', 'Join each beginning to its ending.', 'match', uq(cap(base.filter((it) => tk(it.fr).length >= 4), 9).map((it) => { const t = tk(it.fr), h = Math.ceil(t.length / 2); return { l: t.slice(0, h).join(' ') + ' …', r: '… ' + t.slice(h).join(' ') }; })).slice(0, 7));
      add('order', 'Ordering task', 'Put the words in the right order. Tap the words to build the sentence.', 'order', cap(base.filter((it) => tk(it.fr).length >= 3 && tk(it.fr).length <= 12), 8).map((it) => { const t = tk(it.fr); return { q: it.en, ans: t, bank: shuffle(t.map((w, i) => ({ w, i }))).map((x) => x.w), say: it.fr }; }));
      add('enorder', 'Build the English', 'Put the English words in the right order.', 'order', cap(base.filter((it) => tk(it.en).length >= 3 && tk(it.en).length <= 11 && !/[()]/.test(it.en)), 6).map((it) => { const t = tk(it.en); return { q: it.fr, ans: t, bank: shuffle(t.slice()), say: it.fr, audio: it.fr }; }));
    }
    const kw = cap(base.map((it) => ({ it, k: keyWord(it) })).filter((x) => x.k), N);
    add('broken', 'Broken words', 'Each word has been cut in two. Choose the missing second part.', 'pick', kw.map(({ it, k }) => { const cs = Array.from(k.w), h = Math.max(1, Math.ceil(cs.length / 2)), a = cs.slice(0, h).join(''), b = cs.slice(h).join(''); const others = shuffle(kw.map((x) => Array.from(x.k.w)).filter((c) => c.length > 1).map((c) => c.slice(Math.ceil(c.length / 2)).join('')).filter((x) => x && x !== b)); const opts = shuffle([b].concat([...new Set(others)].slice(0, 2))); return { q: k.t.map((w, i) => (i === k.i ? a + ' ‥' : w)).join(' '), sub: it.en, ans: b, opts }; }));
    add('cwords', 'Complete the words', 'Every other letter is missing. Type the whole word.', 'type', cap(base.map((it) => ({ it, k: keyWord(it) })).filter((x) => x.k && Array.from(x.k.w).length >= 5), 10).map(({ it, k }) => { const cs = Array.from(k.w); const shown = cs.map((c, i) => (i % 2 === 0 || !/\p{L}/u.test(c) ? c : '_')).join(''); return { q: k.t.map((w, i) => (i === k.i ? shown : w)).join(' '), sub: it.en, ans: k.w, ph: shown, say: it.fr }; }));
    add('missing', 'Missing letter challenge', 'Two letters are missing. Type the whole word.', 'type', kw.map(({ it, k }) => { const cs = Array.from(k.w); const pos = shuffle(cs.map((c, i) => i).filter((i) => /\p{L}/u.test(cs[i]) && i > 0)).slice(0, 2); const w2 = cs.map((c, i) => (pos.includes(i) ? '_' : c)).join(''); return { q: k.t.map((w, i) => (i === k.i ? w2 : w)).join(' '), sub: it.en, ans: k.w, whole: false, ph: '' }; }));
    add('anagram', 'Anagrams', 'Unscramble the highlighted word and type it.', 'type', kw.filter((x) => Array.from(x.k.w).length >= 4).slice(0, N).map(({ it, k }) => { let sc = k.w, n = 0; while (sc === k.w && n++ < 12) sc = shuffle(Array.from(k.w)).join(''); return { q: k.t.map((w, i) => (i === k.i ? '[ ' + Array.from(sc).join(' ') + ' ]' : w)).join(' '), sub: it.en, ans: k.w }; }));
    add('entofr', 'English to French translation', 'Type the French.', 'type', cap(base, 10).map((it) => ({ q: it.en, ans: it.fr, ph: pat(it.fr), say: it.fr })));
    add('spot', 'Spot the error and rewrite', 'One word is wrong. Type the correct version.', 'type', cap(base.filter((it) => keyWord(it)), 8).map((it) => { const k = keyWord(it), d = distractors(it.fr, items, 1)[0]; if (!d) return null; return { q: k.t.map((w, i) => (i === k.i ? d : w)).join(' '), sub: it.en, ans: it.fr, ph: pat(it.fr), say: it.fr }; }).filter(Boolean));
    add('cloze', 'Gapped sentences', 'Choose the word that fits the gap.', 'pick', cap(base.map((it) => ({ it, k: keyWord(it) })).filter((x) => x.k && tk(x.it.fr).length >= 2), N).map(({ it, k }) => ({ q: k.t.map((w, i) => (i === k.i ? '_____' : w)).join(' '), sub: it.en, ans: k.w, opts: shuffle([k.w].concat(distractors(it.fr, items, 2))), after: it.fr })));
    add('memory', 'Gap fill from memory', 'Type the missing word. The English will help you.', 'type', cap(base.map((it) => ({ it, k: keyWord(it) })).filter((x) => x.k && tk(x.it.fr).length >= 2), N).map(({ it, k }) => ({ q: k.t.map((w, i) => (i === k.i ? '_____' : w)).join(' '), sub: it.en, ans: k.w, ph: pat(k.w), after: it.fr })));
    add('tf', 'True or false', 'Does the French match the English?', 'pick', cap(base, N).map((it, i) => { const w = shuffle(items.filter((x) => x.en !== it.en))[0]; const t = i % 2 === 0 || !w; return { q: it.fr + '  =  ' + (t ? it.en : w.en), ans: t ? 'True' : 'False', opts: ['True', 'False'], after: it.fr + ' = ' + it.en }; }));
    if (canSpeak()) add('listen', 'Listen and choose', 'Listen, then choose what you hear.', 'pick', cap(base, 10).map((it) => ({ q: 'Listen 🔊', audio: it.fr, auto: false, ans: it.fr, opts: frOpts(it, items, 3) })));
    if (canSpeak()) add('dict', 'Dictation', 'Listen and type what you hear.', 'type', cap(base, 8).map((it) => ({ q: 'Listen 🔊', audio: it.fr, ans: it.fr, ph: pat(it.fr) })));
    if (!isSent) add('frtoen', 'French to English translation', 'Choose the English for each French word.', 'pick', cap(words.length >= 4 ? words : items, N).map((it) => ({ q: it.fr, ans: it.en, opts: enOpts(it, items, 4) })));
    else add('translate', 'Translate into French', 'Type the sentence in French.', 'type', cap(base, 8).map((it) => ({ q: it.en, ans: it.fr, ph: pat(it.fr), say: it.fr })));
    }
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
    const G2 = (L.items || []).filter((g) => g.s && g.a).map((g) => { const hs = (g.s.match(/\([^)]*\)/g) || []).map((x) => x.slice(1, -1)); return hs.length ? Object.assign({}, g, { s: g.s.replace(/\s*\([^)]*\)/g, '').replace(/\s+([.?!,])/g, '$1').trim(), h: [hs.join(', '), g.h].filter(Boolean).join(' · ') }) : g; }).filter((g) => g.s.includes('___'));
    add('gap', 'Complete with the correct option', 'Choose the word that fills the gap.', 'pick', cap(G2.filter((g) => g.o && g.o.length), 12).map((g) => ({ q: g.s.replace('___', '_____'), sub: g.h, ans: g.a, opts: shuffle([g.a].concat(g.o.slice(0, 3))), after: g.s.replace('___', g.a) })));
    add('gaptype', 'Complete from memory', 'Type the missing word.', 'type', cap(G2, 12).map((g) => ({ q: g.s.replace('___', '_____'), sub: g.h, ans: g.a, ph: pat(g.a), after: g.s.replace('___', g.a) })));
    add('tf', 'True or false', 'Is the sentence correct?', 'pick', cap(G2.filter((g) => g.o && g.o.length), 12).map((g, i) => { const t = i % 2 === 0; return { q: g.s.replace('___', t ? g.a : g.o[0]), ans: t ? 'True' : 'False', opts: ['True', 'False'], after: g.s.replace('___', g.a) }; }));
    const full = (g) => g.s.replace('___', g.a), sm = (g) => g.s.replace('___', '_____');
    add('gmatch', 'Match', 'Match each sentence to the word that completes it.', 'match', cap(G2, 6).map((g) => ({ l: sm(g), r: g.a })));
    add('ganag', 'Anagrams', 'Unscramble the missing word and type it.', 'type', cap(G2.filter((g) => Array.from(g.a).length >= 4 && !/\s/.test(g.a)), 8).map((g) => { let sc = g.a, n = 0; while (sc === g.a && n++ < 12) sc = shuffle(Array.from(g.a)).join(''); return { q: sm(g) + '  [ ' + Array.from(sc).join(' ') + ' ]', sub: g.h, ans: g.a, after: full(g) }; }));
    add('gcorrect', 'Choose the correct sentence', 'Which sentence is correct?', 'pick', cap(G2.filter((g) => g.o && g.o.length >= 2), 10).map((g) => { const c = full(g), opts = shuffle([c, g.s.replace('___', g.o[0]), g.s.replace('___', g.o[1])]); return { q: g.h || 'Pick the correct sentence', ans: c, opts, after: c }; }));
    add('gbroken', 'Broken words', 'The missing word has been cut in two. Choose the second part.', 'pick', cap(G2.filter((g) => Array.from(g.a).length >= 4 && !/\s/.test(g.a)), 8).map((g) => { const cs = Array.from(g.a), h = Math.ceil(cs.length / 2), a = cs.slice(0, h).join(''), b = cs.slice(h).join(''), alt = shuffle([...new Set((g.o || []).map((o) => Array.from(o).slice(Math.ceil(Array.from(o).length / 2)).join('')).filter((x) => x && x !== b))]).slice(0, 2); return alt.length >= 1 ? { q: g.s.replace('___', a + '…'), ans: b, opts: shuffle([b].concat(alt)), after: full(g) } : null; }).filter(Boolean));
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
  else if (s.seq) { let ci = s.items.findIndex((x) => !x.st.fin); const alldone = ci < 0; if (alldone) ci = s.items.length - 1; if (!alldone) wkBegin(s, ci); body = '<div class="wk-card">' + wkItem(s, s.items[ci], ci) + '</div>'; }
  else body = '<div class="wk-card">' + s.items.map((it, i) => wkItem(s, it, i)).join('') + '</div>';
  const mt = s.t === 'match';
  const pass = W.mod === 'read' ? `<div class="wk-pass"><b>📖 ${esc(W.L.title || '')} <button class="wk-h" data-act="wkSay" data-t="${esc((W.L.items || []).filter((x) => x.fr && !x.q).map((x) => x.fr).join(' '))}">🔊</button></b>${(W.L.items || []).filter((x) => x.fr && !x.q).map((x) => esc(x.fr)).join(' ')}</div>` : '';
  $('#app').innerHTML = `<div class="wk"><div class="wk-top"><button data-act="wkQuit">${W.board ? '⬅ Activities' : '⬅ Menu'}</button>${W.board ? '' : '<button data-act="wkSw">🔀 Switch activity</button>'}<span class="sp"></span><button data-act="wkPrint" title="Print this stage">🖨</button></div>
  <div class="wk-head"><small>${esc(W.hdr || 'Workout · ' + (W.L.title || ''))}</small><h2>${esc(s.name)}</h2><p>${esc(s.instr)}</p></div>
  ${pass}<div class="wk-stats"><span>Score: ${s.score} / ${ic}</span><span>Overall: ${wkOverall()} / ${W.total}</span><span>💡 Hints: ${W.hints}</span><span>⏱ <b id="wkClock">00:00</b></span></div>
  <div class="wk-bar"><i style="width:${pct}%"></i></div>${s.robot ? wkRobot(s) : ''}${body}
  <div class="wk-nav">${W.board ? '' : `<button data-act="wkPrev" ${W.cur ? '' : 'disabled'}>Back</button>`}${s.done ? '<button class="go nx" data-act="wkNext">' + (W.cur === W.stages.length - 1 ? 'Finish' : 'Next ▶') + '</button>' : '<button class="nx2" data-act="wkNext">' + (W.board ? 'End activity' : W.cur === W.stages.length - 1 ? 'Finish' : 'Skip ▶') + '</button>'}<span class="cnt">${W.board ? s.items.filter((x) => x.st.fin).length + '/' + ic : (W.cur + 1) + '/' + W.stages.length}</span></div>
  ${W.sw ? wkSwitch() : ''}</div>`;
  if (s.seq) { const f = $$('.wk-in:not(:disabled)')[0]; if (f && !('ontouchstart' in window)) f.focus(); }
  $$('.wk-in').forEach((inp) => { inp.addEventListener('input', () => { const it = s.items[+inp.dataset.i]; it.st.v = inp.value; if (checkTyped(inp.value, it.ans) === 'ok') { wkResolve(+inp.dataset.i); const n = $$('.wk-in:not(:disabled)')[0]; if (n) n.focus(); } }); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { wkResolve(+inp.dataset.i); const n = $$('.wk-in:not(:disabled)')[0]; if (n) n.focus(); } }); });
}
function wkItem(s, it, i) {
  const st = it.st, done = !!st.fin;
  const cls = done ? (st.res === 1 ? 'ok' : st.res > 0 ? 'half' : 'bad') : '';
  const aud = it.audio && !(it.noAudioFirst && !done && !st.hint) && !(it.once && st.played && !done) ? `<button class="wk-h" style="background:#e3f4fd" data-act="wkSay" data-i="${i}" data-t="${esc(it.audio)}" title="Listen">🔊</button>` : '';
  if (it.flash && !done && !st.hid) {
    const tks = toks(it.show);
    return `<div class="wk-it"><div class="wk-n">${i + 1}</div><div class="wk-b"><div class="wk-q">${it.flash.mode === 'trap' ? tks.map((w, k) => `<span style="${k < (st.gone || 0) ? 'visibility:hidden' : ''}">${esc(w)}</span>`).join(' ') : esc(it.show)}</div><div class="wk-s">${it.flash.mode === 'trap' ? 'Read it fast. The words are about to fall through the trapdoor!' : 'Memorise it. It will disappear in a few seconds.'}</div></div></div>`;
  }
  let ctl = '';
  if (s.t === 'break') {
    const chars = Array.from(it.str), br = st.br || [];
    ctl = '<div class="wk-brk">' + chars.map((c, k) => `<span>${esc(c)}</span>${k < chars.length - 1 ? `<b class="${br.includes(k + 1) ? 'on' : ''}" data-act="wkBr" data-i="${i}" data-p="${k + 1}"></b>` : ''}`).join('') + '</div><div class="wk-s">Tap between the letters to cut the string into words.</div>';
  }
  if (s.t === 'pick') ctl = '<div class="wk-o">' + it.opts.map((o, k) => { let c = ''; if (done) c = o === it.ans ? 'ok' : (st.sel === k ? 'bad' : ''); else if (st.sel === k) c = 'sel'; else if (st.off && st.off.includes(k)) c = 'off'; return `<button class="${c}" data-act="wkPick" data-i="${i}" data-k="${k}" ${done ? 'disabled' : ''}>${esc(o)}</button>`; }).join('') + '</div>';
  if (s.t === 'type') ctl = `<input class="wk-in" data-i="${i}" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(st.v || '')}" placeholder="${esc(st.hint ? it.ph || '' : 'Type here')}" ${done ? 'disabled' : ''}>${done ? '' : `<button class="wk-h" style="margin-top:6px;background:#e4f8ee;font-weight:800;font-size:13px" data-act="wkCheck" data-i="${i}">Enter ↵</button>`}`;
  if (s.t === 'order') { const ch = st.chosen || []; ctl = `<div class="wk-tiles">${ch.map((b, k) => `<button data-act="wkUn" data-i="${i}" data-k="${k}" ${done ? 'disabled' : ''}>${esc(it.bank[b])}</button>`).join('')}</div><div class="wk-bank">${it.bank.map((w, b) => `<button class="${ch.includes(b) ? 'gh' : ''}" data-act="wkTile" data-i="${i}" data-b="${b}" ${done ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div>`; }
  if (s.t === 'speak') {
    const rec = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    ctl = (rec ? `<button class="wk-mic ${st.rec ? 'on' : ''}" data-act="wkRec" data-i="${i}" ${done ? 'disabled' : ''}>${st.rec ? '⏺ Listening…' : '🎤 Tap and speak'}</button>` : `<div class="wk-o"><button class="${st.self === 1 ? 'sel' : ''}" data-act="wkSelf" data-i="${i}" data-v="1" ${done ? 'disabled' : ''}>I said it well</button><button class="${st.self === 0 ? 'sel' : ''}" data-act="wkSelf" data-i="${i}" data-v="0" ${done ? 'disabled' : ''}>I need more practice</button></div>`) + (st.v ? `<div class="wk-s" style="margin-top:8px">I heard: <b>${esc(st.v)}</b></div>` : '') + (st.hint ? `<div class="wk-s">${esc(it.ans)}</div>` : '');
  }
  let fix = '';
  if (done && st.res < 1) fix = `<div class="wk-fix">${st.res > 0 ? 'Almost, check the accents. ' : ''}Answer: <b>${esc(s.t === 'order' || s.t === 'break' ? it.ans.join(' ') : it.ans)}</b>${it.after && s.t !== 'order' && it.after !== it.ans ? ' · ' + esc(it.after) : ''}</div>`;
  return `<div class="wk-it ${cls}"><div class="wk-n">${i + 1}</div><div class="wk-b"><div class="wk-q">${esc(it.q)}</div>${it.sub ? '<div class="wk-s">' + esc(it.sub) + '</div>' : ''}${ctl}${fix}</div>${aud}${done || s.t === 'break' ? '' : `<button class="wk-h" data-act="wkHint" data-i="${i}" title="Hint (costs half a point)">💡</button>`}</div>`;
}
function wkMatch(s) {
  const st = s.ms || (s.ms = { sel: null, got: {}, miss: {}, bad: null, L: shuffle(s.items.map((_, i) => i)), R: shuffle(s.items.map((_, i) => i)) });
  const col = (arr, side) => '<div style="display:grid;gap:10px">' + arr.map((i) => `<button class="${st.got[i] ? 'got' : ''} ${st.sel && st.sel.side === side && st.sel.i === i ? 'sel' : ''} ${st.bad && st.bad.side === side && st.bad.i === i ? 'wrong' : ''}" data-act="wkM" data-side="${side}" data-i="${i}">${esc(side === 'L' ? s.items[i].l : s.items[i].r)}</button>`).join('') + '</div>';
  return `<div class="wk-card"><div class="wk-mt">${col(st.L, 'L')}${col(st.R, 'R')}</div></div>`;
}
function wkSwitch() {
  return `<div class="wk-sw" data-act="wkSwClose"><div><h3>Activities available</h3>${WK.stages.map((s, i) => `<button class="${i === WK.cur ? 'cur' : ''}" data-act="wkGo" data-i="${i}"><span>${i + 1}.</span> ${esc(s.name)}<i>${s.score || s.done ? s.score + '/' + s.items.length : ''}</i></button>`).join('')}</div></div>`;
}
/* ---------- actions ---------- */
ACT.wkQuit = () => go(WK && WK.board ? WK.board : '#/s/practice');
ACT.wkSw = () => { WK.sw = true; wkDraw(); };
ACT.wkSwClose = (t, e) => { if (e && e.target !== t) return; WK.sw = false; wkDraw(); };
ACT.wkGo = (t) => { WK.cur = +t.dataset.i; WK.sw = false; wkDraw(); window.scrollTo(0, 0); };
ACT.wkPrev = () => { if (WK.cur) { WK.cur--; wkDraw(); window.scrollTo(0, 0); } };
ACT.wkPrint = () => window.print();
ACT.wkSay = (t) => { const s = wkStage(), it = t.dataset.i != null && s ? s.items[+t.dataset.i] : null; if (it && it.once) { if (it.st.played) return; it.st.played = true; setTimeout(() => { if (WK) wkDraw(); }, 60); } speakText(t.dataset.t, WK && WK.lang || 'fr-FR', false); };
ACT.wkBr = (t) => { const it = wkStage().items[+t.dataset.i], st = it.st; if (st.fin) return; const p = +t.dataset.p; st.br = st.br || []; const k = st.br.indexOf(p); if (k >= 0) st.br.splice(k, 1); else st.br.push(p); if (st.br.length >= it.ans.length - 1) wkResolve(+t.dataset.i); else wkDraw(); };
function wkBegin(s, i) {
  const it = s.items[i], st = it.st; if (st.begun) return; st.begun = true;
  const alive = () => WK && wkStage() === s && !st.fin;
  if (it.flash) {
    if (it.flash.mode === 'trap') { const n = toks(it.show).length; for (let k = 1; k <= n; k++) setTimeout(() => { if (alive()) { st.gone = k; wkDraw(); } }, 2200 + k * 850); setTimeout(() => { if (alive()) { st.hid = true; wkDraw(); } }, 2200 + (n + 1) * 850); }
    else setTimeout(() => { if (alive()) { st.hid = true; wkDraw(); } }, it.flash.ms);
  }
  if (it.audio && it.auto && canSpeak()) { st.played = true; speakText(it.audio, WK.lang || 'fr-FR', false); setTimeout(() => { if (alive()) wkDraw(); }, 60); }
}
function wkRobot(s) {
  const n = s.items.length, me = s.items.filter((x) => x.st.fin).length;
  return `<div class="wk-rob" id="wkRob"><div><span>🧑</span><u><i id="wkMe" style="width:${Math.round(me / n * 100)}%"></i></u></div><div><span>🤖</span><u><i id="wkBot" class="r" style="width:${wkBotPct(s)}%"></i></u></div></div>`;
}
function wkBotPct(s) { const n = s.items.length; return Math.min(100, Math.round((Date.now() - WK.t0) / (s.robot.pace * n) * 100)); }
ACT.wkPick = (t) => { const it = wkStage().items[+t.dataset.i]; if (it.st.fin) return; it.st.sel = +t.dataset.k; wkResolve(+t.dataset.i); };
ACT.wkTile = (t) => { const it = wkStage().items[+t.dataset.i]; if (it.st.fin) return; (it.st.chosen = it.st.chosen || []).push(+t.dataset.b); if (it.st.chosen.length >= it.ans.length) wkResolve(+t.dataset.i); else wkDraw(); };
ACT.wkUn = (t) => { const it = wkStage().items[+t.dataset.i]; if (it.st.fin) return; it.st.chosen.splice(+t.dataset.k, 1); wkDraw(); };
ACT.wkHint = (t) => {
  const s = wkStage(), it = s.items[+t.dataset.i], st = it.st; if (st.hint) return toast('Hint already used here');
  st.hint = true; WK.hints++;
  if (s.t === 'pick') { const wrong = it.opts.map((o, k) => k).filter((k) => it.opts[k] !== it.ans && k !== st.sel); st.off = shuffle(wrong).slice(0, Math.max(1, Math.floor(it.opts.length / 2) - (it.opts.length === 2 ? 0 : 0))).slice(0, it.opts.length === 2 ? 0 : 1); if (!st.off.length) toast('Think about the meaning'); }
  if (s.t === 'order') { const need = it.ans[(st.chosen || []).length]; const b = it.bank.findIndex((w, k) => w === need && !(st.chosen || []).includes(k)); if (b >= 0) (st.chosen = st.chosen || []).push(b); }
  wkDraw();
};
ACT.wkSelf = (t) => { const it = wkStage().items[+t.dataset.i]; if (it.st.fin) return; it.st.self = +t.dataset.v; wkResolve(+t.dataset.i); };
ACT.wkRec = (t) => {
  const it = wkStage().items[+t.dataset.i], st = it.st, R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (st.rec) return; const r = new R(); r.lang = 'fr-FR'; r.interimResults = false; r.maxAlternatives = 3; st.rec = true; wkDraw();
  r.onresult = (e) => { st.v = e.results[0][0].transcript; st.got = true; };
  r.onerror = () => { toast('Could not hear you. Check the microphone permission.'); };
  r.onend = () => { st.rec = false; if (WK) { if (st.got) { st.got = false; wkResolve(+t.dataset.i); } else wkDraw(); } };
  try { r.start(); } catch (e) { st.rec = false; wkDraw(); }
};
ACT.wkM = (t) => {
  const s = wkStage(), st = s.ms, side = t.dataset.side, i = +t.dataset.i;
  if (s.done) return;
  if (side === 'L' && s.id.startsWith('vm') === false && canSpeak() && s.id === 'match') { /* silent */ }
  if (!st.sel || st.sel.side === side) { st.sel = { side, i }; st.bad = null; return wkDraw(); }
  const a = st.sel, ok = a.i === i;
  if (ok) { wkTone(true); st.got[i] = true; st.sel = null; st.bad = null; if (s.id === 'match' || s.id === 'halves') { const it = s.items[i]; if (s.id === 'match') speakText(it.r, 'fr-FR', false); } s.score = Object.keys(st.got).filter((k) => !st.miss[k]).length; if (Object.keys(st.got).length === s.items.length) s.done = true; }
  else { wkTone(false); st.miss[a.i] = true; st.miss[i] = true; st.bad = { side, i }; st.sel = null; setTimeout(() => { if (WK && st.bad) { st.bad = null; wkDraw(); } }, 600); }
  wkDraw();
};
let WKAC = null;
function wkTone(ok) {
  try {
    WKAC = WKAC || new (window.AudioContext || window.webkitAudioContext)(); if (WKAC.state === 'suspended') WKAC.resume();
    const t0 = WKAC.currentTime, seq = ok ? [[660, 0], [880, 0.11], [1175, 0.22]] : [[220, 0], [165, 0.14]];
    seq.forEach(([f, d]) => { const o = WKAC.createOscillator(), g = WKAC.createGain(); o.type = ok ? 'sine' : 'sawtooth'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(ok ? 0.22 : 0.12, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + (ok ? 0.2 : 0.22)); o.connect(g); g.connect(WKAC.destination); o.start(t0 + d); o.stop(t0 + d + 0.25); });
  } catch (e) {}
}
function wkEval(s, it) {
  const st = it.st; let r = 0;
  if (s.t === 'pick') r = st.sel != null && it.opts[st.sel] === it.ans ? 1 : 0;
  else if (s.t === 'type') { const c = checkTyped(st.v || '', it.ans); r = c === 'ok' ? 1 : c === 'accent' ? 0.5 : 0; }
  else if (s.t === 'order') r = (st.chosen || []).length && normT((st.chosen || []).map((b) => it.bank[b]).join(' ')) === normT(it.ans.join(' ')) ? 1 : 0;
  else if (s.t === 'break') { const exp = []; let n = 0; it.ans.forEach((w, k) => { n += Array.from(w).length; if (k < it.ans.length - 1) exp.push(n); }); const got = (st.br || []).slice().sort((a, b) => a - b); r = got.length === exp.length && got.every((v, k) => v === exp[k]) ? 1 : 0; }
  else if (s.t === 'speak') { if (st.self != null) r = st.self; else { const A = stripAcc(it.ans).split(' ').filter(Boolean), H = stripAcc(st.v || '').split(' '); const hit = A.filter((w) => H.includes(w)).length / Math.max(1, A.length); r = hit >= 0.85 ? 1 : hit >= 0.6 ? 0.5 : 0; } }
  if (r > 0 && st.hint) r = Math.max(0.5, r - 0.5);
  return r;
}
function wkResolve(i) {
  const s = wkStage(), it = s.items[i], st = it.st; if (st.fin) return;
  st.res = wkEval(s, it); st.fin = true; wkTone(st.res > 0);
  s.score = Math.round(s.items.reduce((n, x) => n + (x.st.fin ? x.st.res : 0), 0) * 2) / 2;
  if (s.items.every((x) => x.st.fin)) s.done = true;
  wkDraw();
}
ACT.wkCheck = (t) => { const i = t && t.dataset && t.dataset.i != null ? +t.dataset.i : null; if (i != null) wkResolve(i); };
ACT.wkNext = () => { if (WK.cur < WK.stages.length - 1) { WK.cur++; wkDraw(); window.scrollTo(0, 0); } else wkFinish(); };
async function wkFinish() {
  const W = WK, secs = Math.round((Date.now() - W.t0) / 1000), score = Math.round(wkOverall());
  const pct = Math.round(score / W.total * 100);
  try { await api('/student/practice/result', 'POST', { game: W.game || 'work', level: W.level, ids: [W.ids], score, total: W.total, secs }); } catch (e) { if (e.status === 401) { sessionStorage.setItem('kicked', '1'); return go('#/'); } }
  if (WKT) clearInterval(WKT);
  $('#app').innerHTML = `<div class="sbody"><div class="finish"><div class="conf">${pct >= 90 ? '🏆' : pct >= 60 ? '🎉' : '💪'}</div><div class="kick">${W.board ? 'ACTIVITY COMPLETE' : 'WORKOUT COMPLETE'}</div>${W.stages[0] && W.stages[0].robot ? `<p style="font-weight:800;font-size:18px">${wkBotPct(W.stages[0]) >= 100 && W.stages[0].items.some((x) => !x.st.fin) ? '' : (W.stages[0].botWon ? '🤖 The robot won this time!' : '🏆 You beat the robot!')}</p>` : ''}
    <div class="stat3b"><div><b>${score}/${W.total}</b><span>POINTS</span></div><div><b>${pct}%</b><span>ACCURACY</span></div><div><b>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</b><span>TIME</span></div></div>
    <div class="card wk-res" style="text-align:left;margin:14px 0">${W.stages.map((s) => `<div class="row"><span>${esc(s.name)}</span><span>${s.score}/${s.items.length}</span></div>`).join('')}</div>
    <button class="bigblue" data-act="phAgain">${W.board ? 'Play again' : 'Do this workout again'}</button>${W.board ? '<button class="btn ghost" style="width:100%;margin-top:10px" data-act="wkQuit">Back to activities</button>' : ''}<button class="btn ghost" style="width:100%;margin-top:10px" data-act="phHub">Back to games</button></div></div>`;
}
/* ---------- Workouts menu: Module Type > Level > Category > Lesson (as on Language Gym) ---------- */
const WMODS = [['vocab', 'Vocabulary Modules', ['vocab', 'sent']], ['gram', 'Grammar Modules', ['gram', 'verb']], ['read', 'Reading Modules', ['read']], ['speak', 'Speaking Modules', ['speak']], ['listen', 'Listening Modules', ['lis']]];
const wmName = (m) => (WMODS.find((x) => x[0] === m) || [0, ''])[1];
const wmOf = (l) => (l.kind === 'read' ? 'read' : l.kind === 'speak' ? 'speak' : l.kind === 'lis' ? 'listen' : l.kind === 'gram' || l.kind === 'verb' ? 'gram' : 'vocab');
const wmLessons = (m) => { const d = WMODS.find((x) => x[0] === m); return PH.all.filter((l) => d[2].includes(l.kind) && !l.id.startsWith('ps-')); };
const wlvName = (id) => (LEVELS.find((x) => x[0] === id) || [0, id])[1];
function wlgCss() {
  if (document.getElementById('wlgcss')) return;
  const st = document.createElement('style'); st.id = 'wlgcss';
  st.textContent = `.wlg{max-width:760px;margin:0 auto;padding:18px 14px 50px;text-align:center;font-family:"Rockwell","Roboto Slab",Georgia,serif;color:#111}
.wlg .home{position:absolute;left:12px;top:12px;font:700 13px system-ui,sans-serif;border:2px solid var(--line);background:#fff;border-radius:12px;padding:7px 12px;cursor:pointer}
.wlg h1{font-size:30px;margin:22px 0 4px}.wlg .sub{font:500 16px "Montserrat",system-ui,sans-serif;margin:3px 0}
.wlg-box{margin:18px auto 0;border:2px solid #4a8fa3;border-radius:22px;padding:14px;background:#fff;box-shadow:0 8px 22px rgba(0,0,0,.18);text-align:left}
.wlg-list{border:1px solid #c9ced6;border-radius:6px;max-height:380px;overflow:auto;min-height:150px;background:#fff}
.wlg-o{display:flex;justify-content:space-between;gap:10px;align-items:center;width:100%;text-align:left;font:inherit;font-size:16px;background:#fff;border:0;border-bottom:1px solid #f0f1f4;padding:8px 10px;cursor:pointer;color:#111}
.wlg-o:hover{background:#eaf4f8}.wlg-o.on{background:#1f5fbf;color:#fff}.wlg-o small{font:600 12px system-ui,sans-serif;opacity:.65;white-space:nowrap}
.wlg-nav{display:flex;gap:12px;margin-top:14px}
.wlg-back,.wlg-go{font:700 14px "Rockwell",Georgia,serif;letter-spacing:.03em;text-transform:uppercase;border:0;border-radius:999px;padding:14px 26px;color:#fff;background:#1c3f6e;cursor:pointer;box-shadow:0 5px 12px rgba(0,0,0,.25)}
.wlg-go{background:#16a34a;margin-left:auto}.wlg-go:disabled{opacity:.4;cursor:default}
.wlg .or{font:700 15px system-ui,sans-serif;margin:22px 0 6px}
.wlg .srch{display:flex;gap:10px;max-width:520px;margin:10px auto 0}.wlg .srch input{flex:1;font:16px system-ui,sans-serif;border:1px solid #c9ced6;border-radius:8px;padding:11px}
.wlg .srch button{font:700 14px "Rockwell",Georgia,serif;border:0;border-radius:999px;padding:0 24px;background:#1c3f6e;color:#fff;cursor:pointer}`;
  document.head.appendChild(st);
}
function drawWork() {
  wlgCss(); const P = PH, st = P.step; let head = '', box = '', nav = '', extra = '';
  const rows = (arr) => `<div class="wlg-list">${arr.map(([id, t, n, on]) => `<button class="wlg-o ${on ? 'on' : ''}" data-act="wPick" data-id="${esc(id)}"><span>${esc(t)}</span>${n != null ? '<small>' + n + '</small>' : ''}</button>`).join('') || '<div style="padding:14px;color:#777">Nothing here yet.</div>'}</div>`;
  const back = '<button class="wlg-back" data-act="wBack">‹ Back</button>';
  if (st === 'wmod') {
    head = '<h1>Module Type</h1><div class="sub">Select a module type</div>';
    box = rows(WMODS.map(([id, n]) => [id, n, wmLessons(id).length + ' lessons']));
    nav = '';
    const q = (P.wq || '').trim().toLowerCase();
    const hits = q.length > 1 ? PH.all.filter((l) => l.kind !== 'sent' || !l.id.startsWith('ps-')).filter((l) => (l.title + ' ' + l.topic).toLowerCase().includes(q)).slice(0, 30) : [];
    extra = `<div class="or">OR</div><div class="sub">Or you can search by lesson title</div><div class="srch"><input id="wq" type="text" placeholder="e.g. daily routine" value="${esc(P.wq || '')}"><button data-act="wSearch">SEARCH</button></div>` + (P.wq && P.wq.trim().length > 1 ? `<div class="wlg-box"><div class="wlg-list">${hits.map((l) => `<button class="wlg-o" data-act="wHit" data-id="${esc(l.id)}"><span>${esc(l.title)}</span><small>${esc(wmName(wmOf(l)).replace(' Modules', ''))} · ${esc(wlvName(l.level))}</small></button>`).join('') || '<div style="padding:14px;color:#777">No lessons match.</div>'}</div></div>` : '');
  } else if (st === 'wlevel') {
    const ls = wmLessons(P.wm);
    head = `<h1>Level</h1><div class="sub">Select a level</div><div class="sub">Module: ${esc(wmName(P.wm))}</div>`;
    box = rows(LEVELS.filter(([id]) => ls.some((l) => l.level === id)).map(([id, n]) => [id, n, ls.filter((l) => l.level === id).length + ' lessons']));
    nav = `<div class="wlg-nav">${back}</div>`;
  } else if (st === 'wcat') {
    const ls = wmLessons(P.wm).filter((l) => l.level === P.level), m = {};
    ls.forEach((l) => { const c = l.topic || 'Other'; m[c] = (m[c] || 0) + 1; });
    head = `<h1>Category</h1><div class="sub">Select a category</div><div class="sub">Module: ${esc(wmName(P.wm))}</div><div class="sub">Level: ${esc(wlvName(P.level))}</div>`;
    box = rows(Object.entries(m).sort((a, b) => { const ia = TENSE_ORDER.indexOf(a[0]), ib = TENSE_ORDER.indexOf(b[0]); return ia >= 0 || ib >= 0 ? (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) : a[0].localeCompare(b[0]); }).map(([c, n]) => [c, c, n + ' lessons']));
    nav = `<div class="wlg-nav">${back}</div>`;
  } else {
    const ls = wmLessons(P.wm).filter((l) => l.level === P.level && (l.topic || 'Other') === P.cat);
    head = `<h1>Lesson</h1><div class="sub">Select a lesson</div><div class="sub">Module: ${esc(wmName(P.wm))}</div><div class="sub">Level: ${esc(wlvName(P.level))}</div><div class="sub">Category: ${esc(P.cat)}</div>`;
    box = rows(ls.map((l) => [l.id, l.topic && l.title.startsWith(l.topic + ': ') ? l.title.slice(l.topic.length + 2) : l.title, l.n + ' items', P.sel[0] === l.id]));
    nav = `<div class="wlg-nav">${back}<button class="wlg-go" data-act="wStart" ${P.sel.length ? '' : 'disabled'}>START</button></div>`;
  }
  $('#app').innerHTML = `<div class="wlg" style="position:relative"><button class="home" data-act="phHub">← Games</button>${head}<div class="wlg-box">${box}${nav}</div>${extra}</div>`;
  const qi = $('#wq'); if (qi) { qi.addEventListener('input', (e) => { P.wq = e.target.value; }); qi.addEventListener('keydown', (e) => { if (e.key === 'Enter') ACT.wSearch(); }); }
}
ACT.wSearch = () => { const i = $('#wq'); if (i) PH.wq = i.value; drawWork(); const j = $('#wq'); if (j) j.focus(); };
ACT.wHit = (t) => { const l = PH.all.find((x) => x.id === t.dataset.id); if (l) { PH.keep = 'lessons'; go('#/s/practice/workout/' + l.level + '/' + l.id + '/' + wmOf(l)); } };
ACT.wPick = (t) => {
  const id = t.dataset.id, P = PH;
  if (P.step === 'wmod') { P.wm = id; P.step = 'wlevel'; }
  else if (P.step === 'wlevel') { P.level = id; P.step = 'wcat'; }
  else if (P.step === 'wcat') { P.cat = id; P.step = 'wles'; P.sel = []; }
  else P.sel = [id];
  drawWork();
};
ACT.wBack = () => { const P = PH; P.step = P.step === 'wles' ? 'wcat' : P.step === 'wcat' ? 'wlevel' : 'wmod'; drawWork(); };
ACT.wStart = () => { if (PH.sel.length) { PH.keep = 'wles'; go('#/s/practice/workout/' + PH.level + '/' + PH.sel[0] + '/' + PH.wm); } };
