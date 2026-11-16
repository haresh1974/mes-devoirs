/* Verb Trainer setup: Mode > Question order > Tenses > Pronouns > Verbs */
const VT_PRON = ['je', 'tu', 'il / on', 'elle', 'nous', 'vous', 'ils', 'elles'];
const VT_IDX = [0, 1, 2, 2, 3, 4, 5, 5];
const VT_TENSES = ['Present Indicative', 'Immediate future', 'Imperfect Indicative', 'Perfect Indicative', 'Pluperfect Indicative', 'Future Indicative', 'Present Subjunctive', 'Present Conditional', 'Past Conditional'];
const VT_ETRE = /(^|[\s'])(suis|es|est|sommes|êtes|sont|étais|était|étions|étiez|étaient|serais|serait|serions|seriez|seraient) (\S+)$/;
/* feminine agreement for elle / elles when the auxiliary is être */
function vtForm(v, p) {
  let f = v.forms[VT_IDX[p]];
  if ((p === 3 || p === 7) && /Perfect|Pluperfect|Past Conditional|passé composé|plus-que-parfait|past conditional/i.test(v.tense || '') && VT_ETRE.test(f)) f = /s$/.test(f) ? f.replace(/e?s$/, 'es') : f + 'e';
  return f;
}
function vtPron(p, form) {
  if (p === 0) return /^[aeiouhàâéèêëîïôùûœ]/i.test(form) ? "j'" : 'je';
  return ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'][p];
}
const VT_IRR = ['être', 'avoir', 'aller', 'faire', 'pouvoir', 'vouloir', 'devoir', 'savoir', 'venir', 'revenir', 'devenir', 'prendre', 'apprendre', 'comprendre', 'mettre', 'dire', 'lire', 'écrire', 'voir', 'croire', 'boire', 'connaître', 'recevoir', 'suivre', 'vivre', 'courir', 'partir', 'sortir', 'dormir', 'ouvrir', 'offrir', 'envoyer'];
const VT_TOPIC = {
  'Daily routine': ['se réveiller', 'se lever', 'se laver', "s'habiller", 'se dépêcher', 'se coucher', 'manger', 'boire', 'dormir', 'prendre', 'préparer', 'rentrer'],
  'Education and future plans': ['étudier', 'apprendre', 'comprendre', 'écrire', 'lire', 'répondre', 'réfléchir', 'réussir', 'travailler', 'commencer', 'finir', 'devenir', 'vouloir', 'savoir'],
  'Family life': ['aimer', 'aider', 'habiter', 'vivre', 'grandir', 'parler', 'donner', 'offrir', 'connaître', 'être', 'avoir'],
  'Leisure and free time': ['jouer', 'danser', 'chanter', 'regarder', 'écouter', 'lire', 'sortir', 'voir', 'courir', "s'amuser", 'se promener', 'faire'],
  'Shopping': ['acheter', 'vendre', 'choisir', 'chercher', 'trouver', 'porter', 'payer', 'offrir', 'demander', 'montrer', 'vouloir'],
  'Travel and transport': ['aller', 'venir', 'partir', 'arriver', 'rentrer', 'revenir', 'rester', 'monter', 'tomber', 'entrer', 'voyager', 'visiter', 'marcher', 'prendre']
};
function vtGroups(infs) {
  const refl = (v) => /^(se |s')/.test(v), irr = (v) => VT_IRR.includes(v), reg = (v) => !refl(v) && !irr(v);
  const G = [
    ['All verbs', infs],
    ['All regular verbs', infs.filter(reg)],
    ['All irregular verbs', infs.filter(irr)],
    ['Basic irregular verbs (être, avoir, aller, faire)', infs.filter((v) => ['être', 'avoir', 'aller', 'faire'].includes(v))],
    ['Regular -er verbs', infs.filter((v) => reg(v) && /er$/.test(v))],
    ['Regular -ir verbs', infs.filter((v) => reg(v) && /ir$/.test(v))],
    ['Regular -re verbs', infs.filter((v) => reg(v) && /re$/.test(v))],
    ['Irregular -ir verbs', infs.filter((v) => irr(v) && /ir$/.test(v) && !/oir$/.test(v))],
    ['Reflexive verbs', infs.filter(refl)],
    ['Verbs that take être in the perfect', infs.filter((v) => refl(v) || ['aller', 'venir', 'arriver', 'partir', 'entrer', 'sortir', 'monter', 'tomber', 'rester', 'rentrer', 'revenir', 'devenir'].includes(v))]
  ];
  Object.keys(VT_TOPIC).forEach((k) => G.push([k, infs.filter((v) => VT_TOPIC[k].includes(v))]));
  return G.filter((g) => g[1].length);
}
let VT = null;
ROUTES.push([/^\/s\/practice\/verbs$/, async () => {
  startHeartbeat(); ST.hw = null; phCss();
  if (!VT) {
    const d = await api('/student/practice/verbs');
    let o = null; try { o = JSON.parse(sessionStorage.getItem('vtopt') || 'null'); } catch (e) { o = null; }
    VT = Object.assign({ step: 0, mode: 'practice', n: 20, min: 5, order: 'random', tenses: [], pron: [0, 1, 2, 3, 4, 5, 6, 7], verbs: [], q: '' }, o || {}, { all: d.verbs, step: 0, q: '' });
  }
  vtDraw();
}]);
const VT_STEPS = ['Mode', 'Order', 'Tenses', 'Pronouns', 'Verbs'];
function vtInfs() { const ok = VT.tenses.length ? VT.all.filter((v) => VT.tenses.includes(v.tense)) : VT.all; return [...new Set(ok.map((v) => v.inf))].sort((a, b) => a.replace(/^(se |s')/, '').localeCompare(b.replace(/^(se |s')/, ''), 'fr')); }
function vtDraw() {
  const o = VT, s = o.step;
  const r = (on, act, id, txt, sub) => `<button class="ph-opt ${on ? 'on' : ''}" data-act="${act}" data-id="${id}"><span class="r"></span><div><b>${txt}</b><div class="mute small">${sub}</div></div></button>`;
  const chip = (on, act, id, txt) => `<button class="ph-pron ${on ? 'on' : ''}" data-act="${act}" data-id="${esc(String(id))}">${esc(txt)}</button>`;
  const steps = `<div class="vt-steps">${VT_STEPS.map((n, i) => `<button class="${i === s ? 'cur' : i < s ? 'done' : ''}" data-act="vtStep" data-id="${i}" ${i > s ? 'disabled' : ''}><i>${i < s ? '✓' : i + 1}</i>${n}</button>`).join('')}</div>`;
  let body = '', ok = true, sel = '';
  if (s === 0) {
    body = `<div class="ph-sec">Game mode</div>` + r(o.mode === 'practice', 'vtSet', 'mode:practice', 'Practice mode', 'Unlimited time. The answer is shown after every question.') + r(o.mode === 'normal', 'vtSet', 'mode:normal', 'Normal mode', 'Race the clock. Choose how many minutes.') + r(o.mode === 'test', 'vtSet', 'mode:test', 'Test mode', 'No feedback until the end, then review your mistakes.') +
      (o.mode === 'normal' ? `<div class="ph-sec">Time limit (minutes)</div><div class="vt-chips">${[1, 2, 3, 4, 5, 7, 10, 15].map((n) => chip(+o.min === n, 'vtSet', 'min:' + n, n)).join('')}</div>` : '') +
      (o.mode === 'test' ? `<div class="ph-sec">Number of questions</div><div class="vt-chips">${[10, 20, 30, 40, 50].map((n) => chip(+o.n === n, 'vtSet', 'n:' + n, n)).join('')}</div>` : '');
    sel = o.mode[0].toUpperCase() + o.mode.slice(1) + ' mode' + (o.mode === 'test' ? ' · ' + o.n + ' questions' : o.mode === 'normal' ? ' · ' + o.min + ' min' : '');
  } else if (s === 1) {
    body = `<div class="ph-sec">Question order</div>` + r(o.order === 'normal', 'vtSet', 'order:normal', 'Normal order', 'Verb by verb, from je to elles.') + r(o.order === 'random', 'vtSet', 'order:random', 'Random order', 'Verbs and pronouns are mixed up.');
    sel = o.order === 'normal' ? 'Normal order' : 'Random order';
  } else if (s === 2) {
    const have = VT_TENSES.filter((t) => o.all.some((v) => v.tense === t));
    body = `<div class="ph-sec">Select at least one tense</div><div class="ph-cats"><button class="ph-cat all" data-act="vtAll" data-id="tenses"><span class="e">⭐</span><div><b style="margin:0">${o.tenses.length === have.length ? 'Clear all' : 'Select all'}</b><small>${have.length} tenses</small></div></button>` + have.map((t) => { const on = o.tenses.includes(t), n = new Set(o.all.filter((v) => v.tense === t).map((v) => v.inf)).size; return `<button class="ph-cat ${on ? 'on' : ''}" data-act="vtTog" data-id="tenses:${esc(t)}"><span class="e">${on ? '✅' : '⏱'}</span><div><b>${esc(t)}</b><small>${n} verbs</small></div></button>`; }).join('') + '</div>';
    ok = o.tenses.length > 0; sel = ok ? o.tenses.length + ' tense' + (o.tenses.length > 1 ? 's' : '') : 'No tense selected';
  } else if (s === 3) {
    body = `<div class="ph-sec">Select at least one pronoun</div><div class="vt-chips">${chip(o.pron.length === 8, 'vtAll', 'pron', o.pron.length === 8 ? 'Clear all' : 'Select all')}</div><div class="vt-chips big" style="margin-top:12px">${VT_PRON.map((n, i) => chip(o.pron.includes(i), 'vtTog', 'pron:' + i, n)).join('')}</div>`;
    ok = o.pron.length > 0; sel = ok ? o.pron.length + ' pronoun' + (o.pron.length > 1 ? 's' : '') : 'No pronoun selected';
  } else {
    const infs = vtInfs(); o.verbs = o.verbs.filter((v) => infs.includes(v));
    const q = o.q.toLowerCase(), en = {}; o.all.forEach((v) => { en[v.inf] = v.en; });
    const shown = infs.filter((v) => !q || v.toLowerCase().includes(q) || (en[v] || '').toLowerCase().includes(q));
    body = `<div class="ph-sec">Verb groups</div><div class="vt-chips">${vtGroups(infs).map(([n, vs]) => chip(vs.length && vs.every((v) => o.verbs.includes(v)) && (n !== 'All verbs' || o.verbs.length === infs.length), 'vtGroup', n, n + ' (' + vs.length + ')')).join('')}</div>` +
      `<div class="ph-sec">Or pick verbs one by one</div><input id="vtQ" type="text" placeholder="🔎  Search verbs" value="${esc(o.q)}" style="margin-bottom:12px"><div class="vt-chips">${shown.map((v) => `<button class="ph-pron vt-v ${o.verbs.includes(v) ? 'on' : ''}" data-act="vtTog" data-id="verbs:${esc(v)}">${esc(v)}<small>${esc(en[v] || '')}</small></button>`).join('') || '<span class="mute">No verbs match.</span>'}</div>`;
    ok = o.verbs.length > 0; sel = ok ? o.verbs.length + ' verb' + (o.verbs.length > 1 ? 's' : '') + ' selected' : 'No verb selected';
  }
  $('#app').innerHTML = `<div class="sbody"><div class="stop"><button class="icon-btn" data-act="vtBack" title="Back">←</button><div style="font-weight:800;font-size:18px">Verb Trainer</div><span style="width:40px"></span></div>${steps}${body}
    <div class="ph-bar"><div class="sel">${sel}<small>Step ${s + 1} of 5</small></div>${s > 0 ? '<button class="btn ghost" data-act="vtBack">Back</button>' : ''}<button class="btn green" data-act="vtNext" ${ok ? '' : 'disabled'}>${s === 4 ? 'Start' : 'Next'}</button></div></div>`;
  if (!document.getElementById('vtcss')) { const st = document.createElement('style'); st.id = 'vtcss'; st.textContent = `.vt-steps{display:flex;gap:5px;margin:4px 0 14px;flex-wrap:wrap}.vt-steps button{flex:1 1 auto;display:flex;align-items:center;gap:5px;justify-content:center;font:inherit;font-weight:800;font-size:12px;border:2px solid var(--line);background:#fff;color:var(--mute);border-radius:999px;padding:6px 8px;cursor:pointer;white-space:nowrap}.vt-steps button i{font-style:normal;width:22px;height:22px;border-radius:50%;background:#e8ecf7;display:flex;align-items:center;justify-content:center;font-size:12px}.vt-steps button.cur{border-color:#E1342F;color:#E1342F}.vt-steps button.cur i{background:#E1342F;color:#fff}.vt-steps button.done{color:var(--ink)}.vt-steps button.done i{background:#16a34a;color:#fff}.vt-steps button:disabled{opacity:.6;cursor:default}.vt-chips{display:flex;flex-wrap:wrap;gap:8px}.vt-chips.big .ph-pron{font-size:17px;padding:14px 20px;min-width:96px}.vt-v{display:flex;flex-direction:column;align-items:flex-start;line-height:1.2}.vt-v small{font-weight:600;font-size:11px;opacity:.7}`; document.head.appendChild(st); }
  const qi = $('#vtQ'); if (qi) qi.addEventListener('input', (e) => { VT.q = e.target.value; const p = e.target.selectionStart; vtDraw(); const i = $('#vtQ'); i.focus(); i.setSelectionRange(p, p); });
}
ACT.vtSet = (t) => { const [k, v] = t.dataset.id.split(':'); VT[k] = v; vtDraw(); };
ACT.vtTog = (t) => { const k = t.dataset.id.split(':')[0], raw = t.dataset.id.slice(k.length + 1), v = k === 'pron' ? +raw : raw, a = VT[k], i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); if (k === 'pron') a.sort((x, y) => x - y); vtDraw(); };
ACT.vtAll = (t) => { if (t.dataset.id === 'pron') VT.pron = VT.pron.length === 8 ? [] : [0, 1, 2, 3, 4, 5, 6, 7]; else { const have = VT_TENSES.filter((x) => VT.all.some((v) => v.tense === x)); VT.tenses = VT.tenses.length === have.length ? [] : have; } vtDraw(); };
ACT.vtGroup = (t) => { const infs = vtInfs(), g = vtGroups(infs).find((x) => x[0] === t.dataset.id); if (!g) return; const all = g[1].every((v) => VT.verbs.includes(v)); if (all) VT.verbs = VT.verbs.filter((v) => !g[1].includes(v)); else g[1].forEach((v) => { if (!VT.verbs.includes(v)) VT.verbs.push(v); }); vtDraw(); };
ACT.vtStep = (t) => { const i = +t.dataset.id; if (i <= VT.step) { VT.step = i; vtDraw(); } };
ACT.vtBack = () => { if (VT.step > 0) { VT.step--; vtDraw(); } else { VT = null; if (PH) PH.keep = null; go('#/s/practice'); } };
ACT.vtNext = () => {
  if (VT.step < 4) { VT.step++; VT.q = ''; return vtDraw(); }
  if (!VT.verbs.length) return;
  const keep = { mode: VT.mode, n: VT.n, min: VT.min, order: VT.order, tenses: VT.tenses, pron: VT.pron, verbs: VT.verbs };
  try { sessionStorage.setItem('vtopt', JSON.stringify(keep)); sessionStorage.setItem('vtsel', JSON.stringify({ tenses: VT.tenses, pron: VT.pron, verbs: VT.verbs })); sessionStorage.setItem('vopt', JSON.stringify({ mode: VT.mode, order: VT.order, n: String(VT.n), min: String(VT.min), pron: [0, 1, 2, 3, 4, 5] })); } catch (e) { /* ignore */ }
  go('#/s/practice/play/verb/all/vt');
};
