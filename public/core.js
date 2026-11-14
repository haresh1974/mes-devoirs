/* Shared helpers, router, landing and sign-in pages */
const $ = (s, r) => (r || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ACT = {};          // click actions: data-act="name"
const ROUTES = [];       // [regex, handler]
let cleanup = null;      // called when leaving a screen

async function api(path, method, body) {
  const r = await fetch('/api' + path, {
    method: method || 'GET', credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  let d = {};
  try { d = await r.json(); } catch (e) {}
  if (!r.ok) { const e = new Error(d.error || 'Something went wrong.'); e.status = r.status; throw e; }
  return d;
}

let toastT;
function toast(t) {
  document.querySelectorAll('.toast').forEach((x) => x.remove());
  const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.appendChild(e);
  clearTimeout(toastT); toastT = setTimeout(() => e.remove(), 2300);
}
function copyText(text) {
  const fallback = () => {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Copied'); } catch (e) { toast('Press Ctrl+C to copy'); }
    ta.remove();
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => toast('Copied'), fallback);
  else fallback();
}

/* modal */
let modalEl = null;
function modal(html, wide) {
  closeModal();
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = '<div class="modal' + (wide ? ' wide' : '') + '">' + html + '</div>';
  o.addEventListener('mousedown', (e) => { if (e.target === o) closeModal(); });
  document.body.appendChild(o); modalEl = o;
  return o.firstChild;
}
function setModal(html) { if (modalEl) modalEl.firstChild.innerHTML = html; }
function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* printing (paper cards, instructions) */
function printHTML(html) {
  const p = $('#print'); p.innerHTML = html;
  setTimeout(() => { window.print(); setTimeout(() => { p.innerHTML = ''; }, 800); }, 50);
}

/* formatting */
function fmtDur(s) {
  s = Math.round(s || 0);
  if (s < 60) return s > 0 ? '<1m' : '0m';
  const m = Math.round(s / 60); return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
}
function fmtDate(ms) {
  if (!ms) return 'No due date';
  return new Date(ms).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}
function ago(ms) {
  if (!ms) return 'Never';
  const s = (Date.now() - ms) / 1000;
  if (s < 90) return 'Just now'; if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago';
}
function dueLeft(ms) {
  if (!ms) return 'No due date';
  const d = Math.ceil((ms - Date.now()) / 86400000);
  if (ms < Date.now()) return 'Past due';
  return d <= 1 ? 'Due today' : d + ' days to go';
}
const LANG = { French: { flag: '🇫🇷', tts: 'fr-FR' }, Spanish: { flag: '🇪🇸', tts: 'es-ES' } };


/* ---------- voice: best available device voice, optional natural cloud voice ---------- */
const VOICE = { cloud: false, cache: new Map(), cur: null, el: null, unlocked: false };
try { VOICE.pref = JSON.parse(localStorage.getItem('md_voice') || '{}'); } catch (e) { VOICE.pref = {}; }
const hasTTS = 'speechSynthesis' in window;
function langPrefix(l) { return l.slice(0, 2).toLowerCase(); }
function voiceScore(v) {
  const n = v.name; let s = 0;
  if (/natural|neural|online/i.test(n)) s += 6;
  if (/premium|enhanced/i.test(n)) s += 5;
  if (/google/i.test(n)) s += 4;
  if (/am[eé]lie|thomas|audrey|denise|henri|eloise|vivienne|remy|r[eé]mi|paulina|m[oó]nica|sabina|helena|jorge|elvira|alvaro|álvaro/i.test(n)) s += 3;
  if (!v.localService) s += 1;
  if (v.lang.replace('_', '-').toLowerCase() === 'fr-fr' || v.lang.replace('_', '-').toLowerCase() === 'es-es') s += 2;
  if (/compact|eloquence|novelty|espeak/i.test(n)) s -= 5;
  return s;
}
function voicesFor(lang) {
  if (!hasTTS) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().indexOf(langPrefix(lang)) === 0).sort((a, b) => voiceScore(b) - voiceScore(a));
}
function bestVoice(lang) {
  const list = voicesFor(lang), saved = VOICE.pref[lang];
  return (saved && list.find((v) => v.name === saved)) || list[0] || null;
}
if (hasTTS) { try { speechSynthesis.onvoiceschanged = () => {}; speechSynthesis.getVoices(); } catch (e) {} }
function stopSpeech() {
  try { if (VOICE.el) VOICE.el.pause(); } catch (e) {}
  try { if (hasTTS) speechSynthesis.cancel(); } catch (e) {}
}
function cloudUrl(text, lang, slow) {
  const key = lang + '|' + (slow ? 1 : 0) + '|' + text;
  if (!VOICE.cache.has(key)) {
    VOICE.cache.set(key, fetch('/api/tts?lang=' + encodeURIComponent(lang) + '&slow=' + (slow ? 1 : 0) + '&text=' + encodeURIComponent(text), { credentials: 'same-origin' })
      .then((r) => { if (!r.ok) throw new Error('tts'); return r.blob(); }).then((b) => URL.createObjectURL(b)));
    VOICE.cache.get(key).catch(() => VOICE.cache.delete(key));
  }
  return VOICE.cache.get(key);
}
function prefetchVoice(texts, lang) { if (VOICE.cloud) texts.forEach((t) => { cloudUrl(t, lang, false).catch(() => {}); }); }
async function speakText(text, lang, slow) {
  stopSpeech();
  if (VOICE.cloud) {
    try {
      const url = await cloudUrl(text, lang, slow);
      if (!VOICE.el) VOICE.el = new Audio();
      VOICE.el.src = url; await VOICE.el.play(); return true;
    } catch (e) { /* fall back to the device voice */ }
  }
  if (!hasTTS) return false;
  try {
    const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = (slow ? 0.55 : 0.88) * (VOICE.pref.rate || 1);
    const v = bestVoice(lang); if (v) u.voice = v;
    speechSynthesis.speak(u); return true;
  } catch (e) { return false; }
}
document.addEventListener('pointerdown', () => { // lets phones play sound later without another tap
  if (VOICE.unlocked) return; VOICE.unlocked = true;
  try { VOICE.el = VOICE.el || new Audio(); VOICE.el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='; VOICE.el.play().catch(() => {}); } catch (e) {}
  try { if (hasTTS) speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) {}
}, { once: false });

let VM = null;
function voiceModal(lang) {
  VM = { lang: lang || 'fr-FR' };
  const sample = VM.lang === 'es-ES' ? 'Hola, ¿cómo estás? Me gusta aprender español.' : 'Bonjour! Je m’appelle Marie. J’habite près de la gare.';
  VM.sample = sample;
  const list = voicesFor(VM.lang), cur = bestVoice(VM.lang);
  modal(`<h2>🔊 Voice</h2>
    ${VOICE.cloud ? '<div class="pbox">✅ Natural voice is on for this website. It is used automatically.</div>' : ''}
    ${hasTTS ? (list.length ? `<label class="f">Voice on this device</label><select id="vsel">${list.map((v) => `<option value="${esc(v.name)}" ${cur && cur.name === v.name ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select>` : '<p class="err">This device has no voice for this language. Words will be read in its default voice, which may not sound right. Try Chrome or Edge, or install a French voice in the device settings.</p>') : '<p class="err">This browser cannot speak. Listening exercises will switch to reading versions.</p>'}
    <label class="f">Speed</label><select id="vrate"><option value="1" ${(VOICE.pref.rate || 1) === 1 ? 'selected' : ''}>Normal</option><option value="0.8" ${VOICE.pref.rate === 0.8 ? 'selected' : ''}>Slower</option></select>
    <div class="pbox" style="margin-top:14px">${esc(sample)}</div>
    <div class="foot"><button class="btn ghost" data-act="close">Close</button><button class="btn" data-act="vplay">🔊 Play sample</button></div>`);
}
ACT.vplay = () => {
  const sel = $('#vsel'), rate = $('#vrate');
  if (sel) VOICE.pref[VM.lang] = sel.value;
  VOICE.pref.rate = parseFloat(rate.value) || 1;
  try { localStorage.setItem('md_voice', JSON.stringify(VOICE.pref)); } catch (e) {}
  speakText(VM.sample, VM.lang, false);
};

/* router */
function go(h) { if (location.hash === h) route(); else location.hash = h; }
async function route() {
  if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
  closeModal();
  const h = location.hash.replace(/^#/, '') || '/';
  for (const [re, fn] of ROUTES) {
    const m = h.match(re);
    if (m) {
      try { await fn(...m.slice(1)); }
      catch (e) {
        if (e.status === 401) { go('#/'); return; }
        $('#app').innerHTML = '<div class="landing"><div class="authbox"><h2>Oops</h2><p>' + esc(e.message) + '</p><button class="btn" data-act="home">Back</button></div></div>';
      }
      window.scrollTo(0, 0);
      return;
    }
  }
  go('#/');
}
window.addEventListener('hashchange', route);
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const fn = ACT[t.dataset.act];
  if (fn) { e.preventDefault(); fn(t, e); }
});
ACT.home = () => go('#/');
ACT.close = () => closeModal();
ACT.logout = async () => { try { await api('/logout', 'POST', {}); } catch (e) {} go('#/'); };

/* landing & sign-in */
function studentLoginPage(prefill) {
  $('#app').innerHTML = `<div class="landing"><div style="font-size:54px">🥖</div><h1>Mon Devoir</h1><div class="authbox">
    <h2>Student sign in</h2><p class="mute" style="margin-top:0">Ask your teacher for the class code and your PIN.</p>
    <label class="f">Class code</label><input id="code" type="text" maxlength="8" autocomplete="off" autocapitalize="characters" placeholder="e.g. ABCDEF" value="${esc(prefill || '')}" style="text-transform:uppercase;letter-spacing:4px;font-weight:800">
    <label class="f">Your PIN</label><input id="pin" type="text" inputmode="numeric" maxlength="8" autocomplete="off" class="pin" placeholder="• • • •">
    <div class="err" id="err"></div>
    <button class="btn green" style="width:100%;margin-top:6px;padding:14px" data-act="doStudentLogin">Let's go</button></div></div>`;
  $('#pin').addEventListener('keydown', (e) => { if (e.key === 'Enter') ACT.doStudentLogin(); });
  (prefill ? $('#pin') : $('#code')).focus();
}
/* The public address only shows student sign-in. Teachers use #/teacher-login directly. */
ROUTES.push([/^\/$/, async () => {
  const me = await api('/me');
  if (me.role === 'teacher') return go('#/t');
  if (me.role === 'student') return go('#/s');
  studentLoginPage();
}]);
ROUTES.push([/^\/join\/(\w+)$/, async (code) => { const me = await api('/me'); if (me.role === 'student') return go('#/s'); studentLoginPage(code.toUpperCase()); }]);
ROUTES.push([/^\/student-login$/, async () => studentLoginPage()]);
ACT.doStudentLogin = async () => {
  try { await api('/student/login', 'POST', { code: $('#code').value, pin: $('#pin').value }); go('#/s'); }
  catch (e) { $('#err').textContent = e.message; }
};

let teacherMode = 'login';
ROUTES.push([/^\/teacher-login$/, async () => {
  const reg = teacherMode === 'register';
  $('#app').innerHTML = `<div class="landing"><div class="authbox">
    <h2>${reg ? 'Create your teacher account' : 'Teacher sign in'}</h2>
    <p class="mute" style="margin-top:0">${reg ? 'Set up your account, then create your first class.' : 'Welcome back.'}</p>
    ${reg ? '<label class="f">Your name</label><input id="nm" type="text" maxlength="60" autocomplete="name">' : ''}
    <label class="f">Email</label><input id="em" type="email" autocomplete="email">
    <label class="f">Password ${reg ? '<span class="mute small">(8+ characters)</span>' : ''}</label><input id="pw" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}">
    <div class="err" id="err"></div>
    <button class="btn" style="width:100%;margin-top:6px;padding:14px" data-act="doTeacher">${reg ? 'Create account' : 'Sign in'}</button>
    <p style="text-align:center;margin:14px 0 0"><button class="linkbtn" data-act="swapMode">${reg ? 'I already have an account' : 'New here? Create an account'}</button> &nbsp; <button class="linkbtn" data-act="home">← Back</button></p></div></div>`;
  $('#pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') ACT.doTeacher(); });
}]);
ACT.swapMode = () => { teacherMode = teacherMode === 'login' ? 'register' : 'login'; route(); };
ACT.doTeacher = async () => {
  try {
    if (teacherMode === 'register') await api('/teacher/register', 'POST', { name: $('#nm').value, email: $('#em').value, password: $('#pw').value });
    else await api('/teacher/login', 'POST', { email: $('#em').value, password: $('#pw').value });
    go('#/t');
  } catch (e) { $('#err').textContent = e.message; }
};
