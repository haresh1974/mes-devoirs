/* IGCSE French Reading — interactive papers · Learn French with Haresh Sir */
(function () {
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const G = window.GLOSS || {};
const INDEX = window.PAPER_INDEX || [];
const MASTER_HINT = '';

/* ---------- tiny storage helpers (may be blocked in some frames) ---------- */
let mem = {};
function sget(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return mem[k] !== undefined ? mem[k] : d; } }
function sset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } }

const state = { paper: null, aids: true, split: !(window.innerWidth>=900), ratio: 0, answers: {}, unlocked: {}, reveal: false, saved: sget('fh-saved', {}), active: null, sec: 0, zoomK: 1 };
const panes = {};
let accentTarget = null;

/* ---------- home ---------- */
function renderHome() {
  const box = $('#paperlist'); box.innerHTML = '';
  const years = {};
  INDEX.forEach(p => (years[p.year] = years[p.year] || []).push(p));
  Object.keys(years).sort().forEach(y => {
    const sec = document.createElement('div'); sec.className = 'yr';
    sec.innerHTML = `<h2>${y}</h2>`;
    years[y].forEach(p => {
      const b = document.createElement('button');
      b.className = 'pc' + (p.ready ? '' : ' soon');
      b.innerHTML = `<span class="badge">${p.badge}</span><span><b>${p.label}</b><small>${p.sub || ''}</small></span><span class="go">${p.ready ? 'Open ›' : 'Coming soon'}</span>`;
      if (p.ready) b.onclick = () => { location.hash = p.id; };
      sec.appendChild(b);
    });
    box.appendChild(sec);
  });
}

function route() {
  const id = (location.hash || '').replace('#', '');
  const p = INDEX.find(x => x.id === id && x.ready);
  if (!p) { $('#reader').hidden = true; $('#home').hidden = false; document.body.classList.remove('aids'); return; }
  loadPaper(p);
}

function loadPaper(p) {
  const go = () => openPaper(window.PAPERS[p.id]);
  if (window.PAPERS && window.PAPERS[p.id]) return go();
  const s = document.createElement('script'); s.src = `data/${p.id}.js`; s.onload = go;
  s.onerror = () => alert('Could not load this paper.');
  document.head.appendChild(s);
}

/* ---------- paper ---------- */
function openPaper(P) {
  state.paper = P; state.active = null; state.sec = 0; state.reveal = false;
  document.body.classList.remove('reveal');
  state.answers = sget('fh-ans-' + P.id, {});
  $('#home').hidden = true; $('#reader').hidden = false;
  $('#ptitle').textContent = 'Reading · Paper ' + P.code.split('/')[1]; $('#psub').textContent = P.session;
  document.body.classList.toggle('aids', state.aids);
  $('#btnAids').classList.toggle('on', state.aids);
  // sections chips
  const ch = $('#chips'); ch.innerHTML = '';
  P.sections.forEach((s, i) => {
    const b = document.createElement('button'); b.textContent = 'Q' + s.n; b.dataset.i = i;
    b.onclick = () => gotoSection(i, true); ch.appendChild(b);
  });
  ['A', 'B'].forEach(k => {
    const el = $('#pane' + k); const sc = $('.scroller', el);
    sc.innerHTML = ''; panes[k] = { el, sc, pages: [] };
    P.pages.forEach((pg, pi) => { if (pg.words.length || pg.fields.length || true) panes[k].pages.push(buildPage(P, pg, pi, k, sc)); });
  });
  layout(true);
  applyUnlock();
  gotoSection(0, true);
  setSheet('idle');
}

function pageEl(k, pi) { return panes[k].pages[pi]; }

function buildPage(P, pg, pi, k, sc) {
  const d = document.createElement('div'); d.className = 'page'; d.dataset.p = pi;
  const img = document.createElement('img'); img.src = pg.img; img.alt = 'Page ' + (pi + 1); img.loading = 'lazy'; img.draggable = false;
  d.appendChild(img);
  const ov = document.createElement('div'); ov.className = 'ov'; d.appendChild(ov);
  const W = pg.w, H = pg.h;
  const place = (el, r, pad) => {
    pad = pad || 0;
    el.style.left = ((r[0] - pad) / W * 100) + '%'; el.style.top = ((r[1] - pad) / H * 100) + '%';
    el.style.width = ((r[2] - r[0] + 2 * pad) / W * 100) + '%'; el.style.height = ((r[3] - r[1] + 2 * pad) / H * 100) + '%';
  };
  // phrase underlines
  P.occs.forEach((o, oi) => o.rects.forEach(r => { if (o.page !== pi) return; const e = document.createElement('u'); e.className = 'ph'; place(e, [r[0], r[1] + 1, r[2], r[3] + 2]); ov.appendChild(e); }));
  // evidence
  pg.ev.forEach(ev => ev.rects.forEach(r => { const e = document.createElement('b'); e.className = 'ev'; e.dataset.q = ev.q; place(e, r, 1.5); ov.appendChild(e); }));
  // word hot-spots
  pg.words.forEach((w, wi) => {
    if (w[5] === -2) return;
    if (/^[.…]+$/.test(w[4])) return;
    const e = document.createElement('i'); e.className = 'w'; e.dataset.i = wi; place(e, [w[0], w[1] + 1, w[2], w[3]], 0.6); ov.appendChild(e);
  });
  // pictures
  pg.pics.forEach(c => { const e = document.createElement('button'); e.className = 'pic'; e.dataset.q = c.q; e.dataset.id = c.id; e.title = c.fr; e.setAttribute('aria-label', c.id + ': ' + c.fr); place(e, c.r); ov.appendChild(e); });
  // pins
  pg.pins.forEach(pn => { const e = document.createElement('button'); e.className = 'pin'; e.dataset.q = pn.q; e.textContent = '💡'; e.title = 'Help for this question'; e.style.left = ((pn.x - 27) / W * 100) + '%'; e.style.top = ((pn.y) / H * 100) + '%'; ov.appendChild(e); });
  // answer fields
  pg.fields.forEach(f => {
    let e;
    const key = f.q + '|' + f.o;
    if (f.t === 'tick') {
      e = document.createElement('button'); e.className = 'tk'; e.type = 'button'; e.setAttribute('aria-label', 'Tick option ' + f.o + ' for question ' + f.q);
      e.dataset.q = f.q; e.dataset.o = f.o;
      e.onclick = () => { const cur = state.answers[f.q + '|']; setAnswer(f.q, '', cur === f.o ? '' : f.o); };
    } else {
      e = document.createElement('input'); e.type = 'text'; e.className = f.t === 'line' ? 'fl' : 'fb';
      e.autocomplete = 'off'; e.autocapitalize = 'off'; e.spellcheck = false; e.lang = 'fr';
      if (f.t !== 'line') { e.maxLength = 1; e.autocapitalize = 'characters'; }
      if (f.t === 'num') e.inputMode = 'numeric';
      e.dataset.q = f.q; e.dataset.o = f.o;
      e.setAttribute('aria-label', 'Answer for question ' + f.q + (f.o ? ' line ' + f.o : ''));
      e.addEventListener('input', () => setAnswer(f.q, f.o, e.value, e));
      e.addEventListener('focus', () => { accentTarget = e; setSheet('type'); });
      e.addEventListener('blur', () => { setTimeout(() => { if (document.activeElement !== accentTarget && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('#sheet'))) { accentTarget = null; if (state.sheet === 'type') setSheet('idle'); } }, 120); });
    }
    e.dataset.t = f.t; place(e, f.r);
    ov.appendChild(e);
    const a = document.createElement('em'); a.className = 'ansl'; a.dataset.q = f.q; a.dataset.o = f.o; a.dataset.t = f.t;
    if (f.t === 'line') { a.style.left = (f.r[0] / W * 100) + '%'; a.style.top = ((f.r[3] + 0.5) / H * 100) + '%'; }
    else if (f.t === 'tick') { a.style.display = 'none'; }
    else { a.style.left = ((f.r[2] + 6) / W * 100) + '%'; a.style.top = ((f.r[1] + 3) / H * 100) + '%'; }
    ov.appendChild(a);
  });
  sc.appendChild(d);
  return d;
}

/* ---------- layout / zoom ---------- */
function layout(initial) {
  const P = state.paper; if (!P) return;
  const pn = $('#panes');
  pn.classList.toggle('single', !state.split);
  pn.classList.toggle('split-a', state.split && state.ratio === 1);
  pn.classList.toggle('split-b', state.split && state.ratio === 2);
  ['A', 'B'].forEach(k => {
    const pane = panes[k]; if (!pane) return;
    const W = pane.el.clientWidth || window.innerWidth;
    const base = Math.min(W * 1.17, 1050) * (pane.z || 1);
    pane.pw = base;
    pane.pages.forEach((d, pi) => {
      const pg = P.pages[pi];
      d.style.setProperty('--pw', base + 'px'); d.style.width = base + 'px'; d.style.height = (base * pg.h / pg.w) + 'px';
    });
    if (initial) pane.sc.scrollLeft = 38 / 595 * base * 1.0;
  });
}
function zoom(k, dir) {
  const pane = panes[k]; const old = pane.z || 1; const z = Math.max(0.7, Math.min(3, old * (dir > 0 ? 1.25 : 0.8)));
  const sc = pane.sc; const cx = sc.scrollLeft + sc.clientWidth / 2, cy = sc.scrollTop + sc.clientHeight / 2;
  pane.z = z; layout(false);
  const f = z / old; sc.scrollLeft = cx * f - sc.clientWidth / 2; sc.scrollTop = cy * f - sc.clientHeight / 2;
}
window.addEventListener('resize', () => layout(false));

function scrollPane(k, pi, y, frac) {
  const pane = panes[k]; if (!pane) return; if (k === 'A' && !state.split) k = 'B';
  const p = panes[k]; const d = p.pages[pi]; const pg = state.paper.pages[pi];
  const top = d.offsetTop + (y / pg.h) * d.offsetHeight;
  p.sc.scrollTo({ top: Math.max(0, top - p.sc.clientHeight * (frac === undefined ? 0.04 : frac)), behavior: 'smooth' });
}

/* ---------- sections ---------- */
function sectionTargets(i) {
  const P = state.paper, s = P.sections[i];
  let A = { p: s.page, y: Math.max(0, s.y - 8) }, B = { p: s.qpage, y: Math.max(0, s.qy - 36) };
  if (s.kind === 'match') { A = { p: s.qpage + 1 <= P.pages.length - 1 ? s.qpage + 1 : s.page, y: 30 }; B = { p: s.qpage, y: Math.max(0, s.y - 8) }; }
  if (s.kind === 'pictures') { A = { p: s.page, y: Math.max(0, s.y - 8) }; B = { p: s.qpage, y: Math.max(0, s.qy - 60) }; }
  return { A, B };
}
function gotoSection(i, scroll) {
  state.sec = i;
  $$('#chips button').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
  const chip = $('#chips button.on'); if (chip && chip.scrollIntoView) chip.scrollIntoView({ inline: 'center', block: 'nearest' });
  if (!scroll) return;
  const t = sectionTargets(i);
  if (state.split) { scrollPane('A', t.A.p, t.A.y, 0.02); scrollPane('B', t.B.p, t.B.y, 0.02); }
  else scrollPane('B', t.A.p, t.A.y, 0.02);
}
// keep the pinned text in step with the questions while scrolling
let followT = null;
function onScrollB() {
  if (!state.split) return;
  clearTimeout(followT);
  followT = setTimeout(() => {
    const P = state.paper, p = panes.B, sc = p.sc; const mid = sc.scrollTop + sc.clientHeight * 0.25;
    let cur = 0;
    P.sections.forEach((s, i) => { const d = p.pages[s.qpage]; const y = d.offsetTop + s.qy / P.pages[s.qpage].h * d.offsetHeight - 50; if (mid >= y) cur = i; });
    if (cur !== state.sec) { gotoSection(cur, false); const t = sectionTargets(cur); scrollPane('A', t.A.p, t.A.y, 0.02); }
  }, 220);
}

/* ---------- glossary look-up ---------- */
function partsOf(t) {
  t = t.replace(/'/g, '’').replace(/ /g, ' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}’]+$/gu, '');
  const re = /week-end|états-unis|science-fiction|est-ce|-t-|\p{L}+’(?=\p{L})|\p{L}+|\d+/giu;
  const out = []; let m;
  while ((m = re.exec(t))) { const k = m[0].toLowerCase(); if (k === '-t-' || /^\d+$/.test(k)) continue; out.push(k); }
  return out;
}
function clearSel() { $$('.sel').forEach(e => e.remove()); }
function addSel(o) {
  const P = state.paper;
  ['A', 'B'].forEach(k => { const d = panes[k].pages[o.page]; const ov = $('.ov', d); const pg = P.pages[o.page];
    o.rects.forEach(r => { const e = document.createElement('b'); e.className = 'sel'; e.style.left = (r[0] / pg.w * 100) + '%'; e.style.top = (r[1] / pg.h * 100) + '%'; e.style.width = ((r[2] - r[0]) / pg.w * 100) + '%'; e.style.height = ((r[3] - r[1]) / pg.h * 100) + '%'; ov.appendChild(e); }); });
}
function onWord(pi, wi) {
  const P = state.paper, w = P.pages[pi].words[wi];
  clearSel();
  const parts = partsOf(w[4]);
  const occ = w[5] >= 0 ? P.occs[w[5]] : null;
  if (occ) addSel(occ);
  else addSel({ page: pi, rects: [[w[0], w[1], w[2], w[3]]] });
  setSheet('word', { word: w[4].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}’]+$/gu, ''), parts, occ });
}

/* ---------- bottom sheet ---------- */
function speak(txt) { try { const u = new SpeechSynthesisUtterance(txt); u.lang = 'fr-FR'; u.rate = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} }
function setSheet(mode, data) {
  state.sheet = mode; const b = $('#sheetBody'); b.innerHTML = '';
  if (mode === 'idle') {
    const d = document.createElement('div'); d.className = 'idle';
    d.innerHTML = state.aids ? '👆 Tap any word for its meaning · <b style="color:#d9650d">orange dotted</b> = a phrase (read it as one chunk) · tap <b>💡</b> beside a question for help · tap a picture to see what it is in French' : '✏️ Test mode — aides are off. Write your answers on the paper.';
    b.appendChild(d); return;
  }
  if (mode === 'type') {
    const k = document.createElement('div'); k.className = 'keys';
    'é è ê ë à â ç î ï ô û ù ü œ É'.split(' ').forEach(ch => { const x = document.createElement('button'); x.type = 'button'; x.textContent = ch; x.onmousedown = x.ontouchstart = ev => ev.preventDefault();
      x.onclick = () => insertChar(ch); k.appendChild(x); });
    b.appendChild(k); return;
  }
  if (mode === 'word') {
    const { word, parts, occ } = data; const wrap = document.createElement('div');
    if (occ) { const ph = state.paper.phrases[occ.p]; const pb = document.createElement('div'); pb.className = 'pbox'; pb.innerHTML = `🔗 <b>${esc(ph[0])}</b> = ${esc(ph[1])}`; wrap.appendChild(pb); }
    const row = document.createElement('div'); row.className = 'wd';
    const t = document.createElement('div'); t.className = 't';
    const seen = parts.filter(k => G[k]);
    if (!seen.length) t.innerHTML = `<div class="fr">${esc(word)}</div><div class="nt">No entry for this word yet.</div>`;
    seen.forEach((k, idx) => { const g = G[k]; const p = document.createElement('div'); p.className = 'part';
      p.innerHTML = `<span class="fr">${esc(k)}</span> <span class="en">— ${esc(g[0])}</span>` + (g[1] ? `<div class="nt">${esc(g[1])}</div>` : ''); t.appendChild(p); });
    row.appendChild(t);
    const sp = document.createElement('button'); sp.className = 'mini'; sp.textContent = '🔊'; sp.title = 'Listen'; sp.onclick = () => speak(occ ? state.paper.phrases[occ.p][0] : word); row.appendChild(sp);
    const main = seen.length ? (seen.length > 1 ? seen[seen.length - 1] : seen[0]) : null;
    if (main) { const key = occ ? state.paper.phrases[occ.p][0] : main; const mean = occ ? state.paper.phrases[occ.p][1] : G[main][0];
      const st = document.createElement('button'); st.className = 'mini' + (state.saved[key] ? ' on' : ''); st.textContent = '⭐'; st.title = 'Save to my words';
      st.onclick = () => { if (state.saved[key]) delete state.saved[key]; else state.saved[key] = mean; sset('fh-saved', state.saved); st.classList.toggle('on', !!state.saved[key]); };
      row.appendChild(st); }
    wrap.appendChild(row); b.appendChild(wrap); return;
  }
  if (mode === 'pic') {
    const c = data; const d = document.createElement('div'); d.className = 'wd';
    d.innerHTML = `<div class="t"><div class="fr">${esc(c.id)} · ${esc(c.fr)}</div><div class="en">${esc(c.en)}</div></div>`;
    const sp = document.createElement('button'); sp.className = 'mini'; sp.textContent = '🔊'; sp.onclick = () => speak(c.fr.split('—')[0]); d.appendChild(sp);
    b.appendChild(d); return;
  }
  if (mode === 'help') renderHelp(data.q, data.tab);
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function insertChar(ch) {
  const e = accentTarget; if (!e) return; e.focus();
  const s = e.selectionStart || 0, t = e.selectionEnd || 0; if (e.maxLength > 0 && e.maxLength < 2) { e.value = ch.toUpperCase(); }
  else e.value = e.value.slice(0, s) + ch + e.value.slice(t);
  const pos = s + ch.length; try { e.setSelectionRange(pos, pos); } catch (x) {}
  e.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ---------- question help ---------- */
function qLabel(qid) { const m = /^(\d+)(\w)$/.exec(qid); return `Q${m[1]}(${m[2]})`; }
function renderHelp(qid, tab) {
  const P = state.paper, q = P.qs[qid]; const b = $('#sheetBody'); b.innerHTML = '';
  const tabs = [];
  const evs = P.pages.some(pg => pg.ev.some(e => e.q === qid));
  if (q.ask) tabs.push(['where', '🔍 Where?']);
  if (q.start || (q.convert && q.convert.length)) tabs.push(['start', '✍️ How to start']);
  if (q.watch || (q.swap && q.swap.length)) tabs.push(['care', '⚠️ Careful']);
  tabs.push(['ans', state.unlocked[P.id] ? '✅ Answer' : '🔒 Answer']);
  tab = tab || (tabs[0] && tabs[0][0]);
  const hd = document.createElement('div'); hd.className = 'hd';
  hd.innerHTML = `<b>${qLabel(qid)}${q.marks ? ' · ' + q.marks + (q.marks > 1 ? ' marks' : ' mark') : ''}</b>`;
  const x = document.createElement('button'); x.className = 'mini'; x.textContent = '✕'; x.onclick = () => closeHelp(); hd.appendChild(x); b.appendChild(hd);
  const tb = document.createElement('div'); tb.className = 'tabs';
  tabs.forEach(([k, l]) => { const t = document.createElement('button'); t.textContent = l; t.className = k === tab ? 'on' : ''; t.onclick = () => renderHelp(qid, k); tb.appendChild(t); });
  b.appendChild(tb);
  const c = document.createElement('div'); c.className = 'hint'; b.appendChild(c);
  if (tab === 'where') {
    c.innerHTML = `<p>${esc(q.ask)}</p>` + (evs ? '<p class="idle">The yellow highlight on the text shows where to look.</p>' : '');
    showEvidence(qid);
  } else { hideEvidence(); }
  if (tab === 'start') {
    if (q.start) c.innerHTML += `<div class="starter">${esc(q.start)}</div>`;
    if (q.convert && q.convert.length) { c.innerHTML += '<p class="idle">Change of person — do not copy these as they are:</p><div class="chips2">' + q.convert.map(x => `<span class="cv">${esc(x[0])} <i>→</i> <b>${esc(x[1])}</b></span>`).join('') + '</div>'; }
  }
  if (tab === 'care') {
    if (q.swap && q.swap.length) c.innerHTML += '<div class="chips2">' + q.swap.map(x => `<span class="cv">${esc(x[0])} <i>=</i> <b>${esc(x[1])}</b></span>`).join('') + '</div>';
    if (q.watch) c.innerHTML += `<div class="warn">${esc(q.watch)}</div>`;
  }
  if (tab === 'ans') {
    const A = state.unlocked[P.id];
    if (!A) { c.innerHTML = '<p>The answers are revealed by your teacher.</p>'; const bt = document.createElement('button'); bt.className = 'primary'; bt.textContent = '🔒 Teacher code'; bt.onclick = openLock; c.appendChild(bt); }
    else { const a = A[qid]; const arr = Array.isArray(a.a) ? a.a : [a.a];
      c.innerHTML = '<div class="ansbox">' + arr.map((t, i) => `<div class="a">${arr.length > 1 ? (i + 1) + ' ' : ''}${esc(t)}</div>`).join('') + (a.n ? `<div class="n">Examiner note — ${esc(a.n)}</div>` : '') + '</div>'; }
  }
  state.active = qid; $$('.pin').forEach(p => p.classList.toggle('on', p.dataset.q === qid));
}
function closeHelp() { hideEvidence(); state.active = null; $$('.pin').forEach(p => p.classList.remove('on')); setSheet('idle'); }
function showEvidence(qid) {
  hideEvidence(); const els = $$('.ev[data-q="' + qid + '"]'); els.forEach(e => e.classList.add('on'));
  const P = state.paper; let first = null;
  P.pages.forEach((pg, pi) => pg.ev.forEach(e => { if (e.q === qid && !first) first = { pi, y: e.rects[0][1] }; }));
  if (first) { if (state.split) scrollPane('A', first.pi, first.y, 0.35); else scrollPane('B', first.pi, first.y, 0.35); }
}
function hideEvidence() { $$('.ev.on').forEach(e => e.classList.remove('on')); }

/* ---------- answers ---------- */
function setAnswer(q, o, val, src) {
  const key = q + '|' + o; state.answers[key] = val; sset('fh-ans-' + state.paper.id, state.answers);
  $$('input[data-q="' + q + '"]').forEach(e => { if (e.dataset.o === o && e !== src) e.value = val; });
  syncTicks(q); gradeAll();
}
function syncTicks(q) { const cur = state.answers[q + '|']; $$('.tk[data-q="' + q + '"]').forEach(e => e.classList.toggle('on', e.dataset.o === cur)); }
function restoreAnswers() {
  Object.keys(state.answers).forEach(k => { const [q, o] = k.split('|'); const v = state.answers[k];
    $$('input[data-q="' + q + '"]').forEach(e => { if (e.dataset.o === o) e.value = v; }); });
  const qs = new Set(Object.keys(state.answers).map(k => k.split('|')[0])); qs.forEach(syncTicks);
}

/* ---------- teacher unlock (answers are encrypted in the data file) ---------- */
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function tryCode(P, code) {
  const enc = new TextEncoder(); const salt = b64(P.enc.salt);
  const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
  const kek = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  for (const w of P.enc.w) {
    try {
      const K = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(w.iv) }, kek, b64(w.ct));
      const key = await crypto.subtle.importKey('raw', K, 'AES-GCM', false, ['decrypt']);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(P.enc.iv) }, key, b64(P.enc.ct));
      return JSON.parse(new TextDecoder().decode(pt));
    } catch (e) { /* try next wrapped key */ }
  }
  return null;
}
function openModal(html) { $('#modalCard').innerHTML = html; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
function openLock() {
  const P = state.paper;
  if (state.unlocked[P.id]) {
    openModal(`<h3>🔓 Teacher mode</h3><p>Answers for this paper are unlocked on this device.</p>
      <label class="sw"><input type="checkbox" id="swReveal" ${state.reveal ? 'checked' : ''}> <span><b>Show the answers on the paper</b><br><small class="legend">Marks ✓ / ✗ on letters and numbers; prints the official answer under each written line.</small></span></label>
      <p class="legend"><b>Examiner codes:</b> HA = harmless extra · INV = this extra word cancels the mark · tc = not enough on its own.</p>
      <div class="row"><button class="ghost" id="mClose">Close</button><button class="ghost" id="mLock">Lock again</button></div>`);
    $('#swReveal').onchange = e => setReveal(e.target.checked);
    $('#mClose').onclick = closeModal; $('#mLock').onclick = () => { delete state.unlocked[P.id]; sessSet(P.id, null); setReveal(false); applyUnlock(); closeModal(); };
    return;
  }
  openModal(`<h3>🔒 Teacher code</h3><p>Enter the code for this paper to see the official answers.</p>
    <input type="password" id="code" placeholder="Code" autocomplete="off"><div class="err" id="err"></div>
    <div class="row"><button class="ghost" id="mClose">Cancel</button><button class="primary" id="mGo">Unlock</button></div>`);
  $('#mClose').onclick = closeModal;
  const go = async () => {
    $('#err').textContent = 'Checking…';
    try { const A = await tryCode(P, $('#code').value.trim());
      if (!A) { $('#err').textContent = 'That code does not open this paper.'; return; }
      state.unlocked[P.id] = A; sessSet(P.id, A); applyUnlock(); closeModal(); if (state.active) renderHelp(state.active, 'ans');
    } catch (e) { $('#err').textContent = 'This browser cannot check codes here.'; }
  };
  $('#mGo').onclick = go; $('#code').onkeydown = e => { if (e.key === 'Enter') go(); }; setTimeout(() => $('#code').focus(), 50);
}
function sessSet(id, A) { try { if (A) sessionStorage.setItem('fh-un-' + id, JSON.stringify(A)); else sessionStorage.removeItem('fh-un-' + id); } catch (e) {} }
function sessGet(id) { try { const v = sessionStorage.getItem('fh-un-' + id); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function applyUnlock() {
  const P = state.paper; if (!state.unlocked[P.id]) { const s = sessGet(P.id); if (s) state.unlocked[P.id] = s; }
  const A = state.unlocked[P.id]; $('#btnLock').textContent = A ? '🔓' : '🔒';
  $$('.ansl').forEach(e => { e.textContent = ''; });
  $$('.tk').forEach(e => e.classList.remove('right'));
  if (A) {
    $$('.ansl').forEach(e => { const a = A[e.dataset.q]; if (!a || e.dataset.t === 'tick') return;
      const arr = Array.isArray(a.a) ? a.a : [a.a]; const idx = e.dataset.o ? +e.dataset.o - 1 : 0; e.textContent = e.dataset.t === 'line' ? '✔ ' + (arr[idx] || '') : '= ' + arr[0]; });
    $$('.tk').forEach(e => { const a = A[e.dataset.q]; if (a && a.a === e.dataset.o) e.classList.add('right'); });
  }
  restoreAnswers(); gradeAll();
}
function setReveal(on) { state.reveal = on; document.body.classList.toggle('reveal', on); gradeAll(); }
function gradeAll() {
  const A = state.unlocked[state.paper.id]; $$('.ok,.bad').forEach(e => e.classList.remove('ok', 'bad'));
  if (!A || !state.reveal) return;
  $$('input.fb').forEach(e => { const v = (e.value || '').trim().toUpperCase(); if (!v) return; const a = A[e.dataset.q]; if (a) e.classList.add(String(a.a).toUpperCase() === v ? 'ok' : 'bad'); });
  $$('.tk.on').forEach(e => { const a = A[e.dataset.q]; if (a) e.classList.add(a.a === e.dataset.o ? 'ok' : 'bad'); });
}

/* ---------- saved words ---------- */
function openNotes() {
  const ks = Object.keys(state.saved);
  openModal(`<h3>⭐ My words</h3>` + (ks.length ? ks.map(k => `<div class="nl"><b>${esc(k)}</b><span>${esc(state.saved[k])}</span><button class="mini" data-k="${esc(k)}" title="Remove">✕</button></div>`).join('') : '<p class="legend">Tap a word, then ⭐ to keep it here for revision.</p>') +
    '<div class="row"><button class="primary" id="mClose">Close</button></div>');
  $('#mClose').onclick = closeModal;
  $$('#modalCard .mini').forEach(b => b.onclick = () => { delete state.saved[b.dataset.k]; sset('fh-saved', state.saved); openNotes(); });
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  const w = t.closest && t.closest('.w'); if (w && state.aids) { const pg = w.closest('.page'); onWord(+pg.dataset.p, +w.dataset.i); return; }
  const pin = t.closest && t.closest('.pin'); if (pin) { renderHelp(pin.dataset.q); setSheet('help', { q: pin.dataset.q }); return; }
  const pic = t.closest && t.closest('.pic'); if (pic) { const pg = state.paper.pages[+pic.closest('.page').dataset.p]; const c = pg.pics.find(x => x.q === pic.dataset.q && x.id === pic.dataset.id); $$('.pic.on').forEach(x => x.classList.remove('on')); pic.classList.add('on'); clearSel(); setSheet('pic', c); return; }
  const z = t.closest && t.closest('.zoom button'); if (z) { zoom(z.closest('.pane').id.slice(-1), +z.dataset.z); return; }
});
document.addEventListener('mouseover', e => { const pic = e.target.closest && e.target.closest('.pic'); if (pic && state.aids && matchMedia('(hover:hover)').matches) { const pg = state.paper.pages[+pic.closest('.page').dataset.p]; const c = pg.pics.find(x => x.q === pic.dataset.q && x.id === pic.dataset.id); if (state.sheet !== 'help' && state.sheet !== 'type') setSheet('pic', c); } });
$('#back').onclick = () => { location.hash = ''; };
$('#btnAids').onclick = () => { state.aids = !state.aids; document.body.classList.toggle('aids', state.aids); $('#btnAids').classList.toggle('on', state.aids); clearSel(); if (!state.aids) closeHelp(); else setSheet('idle'); };
$('#btnSplit').onclick = () => { if (!state.split) { state.split = true; state.ratio = 0; } else if (state.ratio === 0) state.ratio = 1; else if (state.ratio === 1) state.ratio = 2; else state.split = false;
  layout(false); gotoSection(state.sec, true); };
$('#btnNotes').onclick = openNotes;
$('#btnLock').onclick = openLock;
window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', () => {});
document.addEventListener('scroll', e => { if (e.target && e.target.parentElement && e.target.parentElement.id === 'paneB') onScrollB(); }, true);

renderHome(); route();
})();
