const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { open } = require('./db');

const PORT = process.env.PORT || 3000;
const TZ_OFFSET_MIN = parseInt(process.env.TZ_OFFSET_MIN || '330', 10); // 330 = India (IST)
const DAY = 86400000;
const SH = require('./public/shared.js');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

/* ---------- helpers ---------- */
const uid = () => crypto.randomBytes(9).toString('hex');
const now = () => Date.now();
const dayStr = (ms) => new Date(ms + TZ_OFFSET_MIN * 60000).toISOString().slice(0, 10);
const clean = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const potential = (score, total) => score * 10 + (total > 0 && score >= total ? 20 : 0);

function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function setSession(res, req, token) {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}${secure}`);
}

const hits = new Map();
function limited(key, max, windowMs) {
  const t = now();
  const h = hits.get(key);
  if (!h || h.reset < t) { hits.set(key, { n: 1, reset: t + windowMs }); return false; }
  h.n++;
  return h.n > max;
}
setInterval(() => { const t = now(); for (const [k, v] of hits) if (v.reset < t) hits.delete(k); }, 600000).unref();

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e); res.status(500).json({ error: 'Something went wrong. Please try again.' }); });

let db;
async function auth(req, kind) {
  const tok = parseCookies(req).sid;
  if (!tok) return null;
  const s = await db.get('SELECT * FROM sessions WHERE token = ?', [tok]);
  if (!s || s.kind !== kind || now() - s.created > 30 * DAY) return null;
  if (kind === 'teacher') return db.get('SELECT id, email, name FROM teachers WHERE id = ?', [s.user_id]);
  return db.get('SELECT * FROM students WHERE id = ?', [s.user_id]);
}
const teacherOnly = (fn) => wrap(async (req, res) => {
  const t = await auth(req, 'teacher');
  if (!t) return res.status(401).json({ error: 'Please sign in.' });
  req.teacher = t;
  return fn(req, res);
});
const studentOnly = (fn) => wrap(async (req, res) => {
  const s = await auth(req, 'student');
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  req.student = s;
  return fn(req, res);
});
async function ownClass(req, id) {
  return db.get('SELECT * FROM classes WHERE id = ? AND teacher_id = ?', [id, req.teacher.id]);
}

/* ---------- accounts ---------- */
app.post('/api/teacher/register', wrap(async (req, res) => {
  if (limited('reg:' + req.ip, 10, 3600000)) return res.status(429).json({ error: 'Too many attempts. Try later.' });
  const name = clean(req.body.name, 60), email = clean(req.body.email, 120).toLowerCase(), pw = String(req.body.password || '');
  if (!name) return res.status(400).json({ error: 'Please enter your name.' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email.' });
  if (pw.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (await db.get('SELECT id FROM teachers WHERE email = ?', [email])) return res.status(400).json({ error: 'That email already has an account. Try signing in.' });
  const salt = crypto.randomBytes(16).toString('hex'), id = uid();
  await db.run('INSERT INTO teachers (id,email,name,salt,hash,created) VALUES (?,?,?,?,?,?)', [id, email, name, salt, hashPw(pw, salt), now()]);
  const token = crypto.randomBytes(32).toString('hex');
  await db.run('INSERT INTO sessions (token,kind,user_id,created) VALUES (?,?,?,?)', [token, 'teacher', id, now()]);
  setSession(res, req, token);
  res.json({ ok: true });
}));

app.post('/api/teacher/login', wrap(async (req, res) => {
  const email = clean(req.body.email, 120).toLowerCase(), pw = String(req.body.password || '');
  if (limited('tl:' + req.ip + email, 8, 600000)) return res.status(429).json({ error: 'Too many attempts. Wait 10 minutes.' });
  const t = await db.get('SELECT * FROM teachers WHERE email = ?', [email]);
  const bad = () => res.status(400).json({ error: 'Email or password is not right.' });
  if (!t) return bad();
  const a = Buffer.from(hashPw(pw, t.salt), 'hex'), b = Buffer.from(t.hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return bad();
  const token = crypto.randomBytes(32).toString('hex');
  await db.run('INSERT INTO sessions (token,kind,user_id,created) VALUES (?,?,?,?)', [token, 'teacher', t.id, now()]);
  setSession(res, req, token);
  res.json({ ok: true });
}));

app.post('/api/student/login', wrap(async (req, res) => {
  const code = clean(req.body.code, 10).toUpperCase(), pin = clean(req.body.pin, 8);
  if (limited('sl:' + req.ip, 15, 600000) || limited('slc:' + code, 60, 600000)) return res.status(429).json({ error: 'Too many tries. Please wait a few minutes.' });
  const c = await db.get('SELECT id FROM classes WHERE code = ?', [code]);
  const s = c && await db.get('SELECT * FROM students WHERE class_id = ? AND pin = ?', [c.id, pin]);
  if (!s) return res.status(400).json({ error: 'Class code or PIN is not right.' });
  const token = crypto.randomBytes(32).toString('hex');
  await db.run('INSERT INTO sessions (token,kind,user_id,created) VALUES (?,?,?,?)', [token, 'student', s.id, now()]);
  await db.run('UPDATE students SET last_active = ? WHERE id = ?', [now(), s.id]);
  setSession(res, req, token);
  res.json({ ok: true });
}));

app.post('/api/logout', wrap(async (req, res) => {
  const tok = parseCookies(req).sid;
  if (tok) await db.run('DELETE FROM sessions WHERE token = ?', [tok]);
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; Max-Age=0');
  res.json({ ok: true });
}));

app.get('/api/me', wrap(async (req, res) => {
  const t = await auth(req, 'teacher');
  if (t) return res.json({ role: 'teacher', name: t.name, email: t.email });
  const s = await auth(req, 'student');
  if (s) return res.json({ role: 'student', name: s.name });
  res.json({ role: null });
}));

/* ---------- teacher: classes ---------- */
function newCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c = '';
  for (let i = 0; i < 6; i++) c += L[crypto.randomInt(L.length)];
  return c;
}
app.get('/api/classes', teacherOnly(async (req, res) => {
  const rows = await db.all('SELECT id,name,language,tiers,code FROM classes WHERE teacher_id = ? ORDER BY created', [req.teacher.id]);
  res.json({ classes: rows.map((c) => ({ ...c, tiers: JSON.parse(c.tiers) })), teacher: { name: req.teacher.name }, tts: ttsOn() });
}));

app.get('/api/classes/suggest-code', teacherOnly(async (req, res) => {
  for (let i = 0; i < 20; i++) {
    const c = newCode();
    if (!(await db.get('SELECT id FROM classes WHERE code = ?', [c]))) return res.json({ code: c });
  }
  res.status(500).json({ error: 'Try again.' });
}));

app.post('/api/classes', teacherOnly(async (req, res) => {
  const name = clean(req.body.name, 60), language = req.body.language === 'Spanish' ? 'Spanish' : 'French';
  let tiers = (Array.isArray(req.body.tiers) ? req.body.tiers : []).filter((t) => ['Foundation', 'Higher'].includes(t));
  if (!tiers.length) tiers = ['Foundation', 'Higher'];
  let code = clean(req.body.code, 10).toUpperCase();
  if (!name) return res.status(400).json({ error: 'Give the class a name.' });
  if (!code) code = newCode();
  if (!/^[A-Z]{4,8}$/.test(code)) return res.status(400).json({ error: 'Class code must be 4 to 8 letters.' });
  if (await db.get('SELECT id FROM classes WHERE code = ?', [code])) return res.status(400).json({ error: 'That class code is taken. Pick another.' });
  const id = uid();
  await db.run('INSERT INTO classes (id,teacher_id,name,language,tiers,code,created) VALUES (?,?,?,?,?,?,?)', [id, req.teacher.id, name, language, JSON.stringify(tiers), code, now()]);
  res.json({ id, code });
}));

app.delete('/api/classes/:id', teacherOnly(async (req, res) => {
  const c = await ownClass(req, req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const hws = await db.all('SELECT id FROM homework WHERE class_id = ?', [c.id]);
  const sts = await db.all('SELECT id FROM students WHERE class_id = ?', [c.id]);
  for (const h of hws) await db.run('DELETE FROM attempts WHERE homework_id = ?', [h.id]);
  for (const s of sts) { await db.run('DELETE FROM activity WHERE student_id = ?', [s.id]); await db.run('DELETE FROM sessions WHERE user_id = ?', [s.id]); }
  await db.run('DELETE FROM homework WHERE class_id = ?', [c.id]);
  await db.run('DELETE FROM students WHERE class_id = ?', [c.id]);
  await db.run('DELETE FROM classes WHERE id = ?', [c.id]);
  res.json({ ok: true });
}));

/* ---------- shared stats ---------- */
async function classData(c) {
  const students = await db.all('SELECT * FROM students WHERE class_id = ? ORDER BY name', [c.id]);
  const hws = await db.all('SELECT * FROM homework WHERE class_id = ? ORDER BY created DESC', [c.id]);
  const hwIds = hws.map((h) => h.id);
  const atts = await db.all('SELECT * FROM attempts WHERE homework_id IN (SELECT id FROM homework WHERE class_id = ?)', [c.id]);
  const acts = await db.all('SELECT * FROM activity WHERE student_id IN (SELECT id FROM students WHERE class_id = ?)', [c.id]);
  return { students, hws, atts, acts, hwIds };
}
function hwStatus(h, studentId, atts) {
  const ex = JSON.parse(h.exercises);
  const mine = atts.filter((a) => a.homework_id === h.id && a.student_id === studentId);
  const done = [...new Set(mine.map((a) => a.lesson))].filter((l) => ex.includes(l));
  const complete = ex.length > 0 && done.length >= ex.length;
  let finishedAt = null;
  if (complete) finishedAt = Math.max(...ex.map((l) => Math.min(...mine.filter((a) => a.lesson === l).map((a) => a.ts))));
  return { done, total: ex.length, status: complete ? 'complete' : (mine.length ? 'progress' : 'new'), finishedAt, coins: mine.reduce((n, a) => n + a.coins, 0) };
}

app.get('/api/classes/:id/overview', teacherOnly(async (req, res) => {
  const c = await ownClass(req, req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const { students, hws, atts, acts } = await classData(c);
  const today = dayStr(now()), yest = dayStr(now() - DAY);
  const sOut = students.map((s) => {
    const a = acts.filter((x) => x.student_id === s.id);
    const sum = (f) => a.filter(f).reduce((n, x) => n + x.secs, 0);
    let onTime = 0, tot = 0;
    hws.forEach((h) => {
      const st = hwStatus(h, s.id, atts); tot++;
      if (st.status === 'complete' && (!h.due_at || st.finishedAt <= h.due_at)) onTime++;
    });
    return { id: s.id, name: s.name, pin: s.pin, secsTotal: sum(() => true), secsToday: sum((x) => x.day === today), secsYesterday: sum((x) => x.day === yest), lastActive: s.last_active, onTime, hwTotal: tot };
  });
  const hOut = hws.map((h) => {
    const sts = students.map((s) => hwStatus(h, s.id, atts).status);
    return { id: h.id, title: h.title, topic: h.topic, tier: h.tier, due_at: h.due_at, created: h.created, lessons: JSON.parse(h.exercises).length,
      counts: { new: sts.filter((x) => x === 'new').length, progress: sts.filter((x) => x === 'progress').length, complete: sts.filter((x) => x === 'complete').length } };
  });
  res.json({ cls: { id: c.id, name: c.name, language: c.language, tiers: JSON.parse(c.tiers), code: c.code }, students: sOut, homework: hOut });
}));

/* ---------- teacher: students ---------- */
function newPin(taken) {
  for (let i = 0; i < 200; i++) { const p = String(crypto.randomInt(1000, 10000)); if (!taken.has(p)) { taken.add(p); return p; } }
  throw new Error('no pin');
}
app.post('/api/classes/:id/students', teacherOnly(async (req, res) => {
  const c = await ownClass(req, req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const names = (Array.isArray(req.body.names) ? req.body.names : []).map((n) => clean(n, 40)).filter(Boolean).slice(0, 80);
  if (!names.length) return res.status(400).json({ error: 'Add at least one name.' });
  const existing = await db.all('SELECT pin FROM students WHERE class_id = ?', [c.id]);
  const taken = new Set(existing.map((s) => s.pin));
  const out = [];
  for (const name of names) {
    const pin = newPin(taken), id = uid();
    await db.run('INSERT INTO students (id,class_id,name,pin,created,last_active) VALUES (?,?,?,?,?,?)', [id, c.id, name, pin, now(), null]);
    out.push({ id, name, pin });
  }
  res.json({ students: out });
}));

async function ownStudent(req) {
  const s = await db.get('SELECT * FROM students WHERE id = ?', [req.params.id]);
  if (!s) return null;
  return (await ownClass(req, s.class_id)) ? s : null;
}
app.post('/api/students/:id/newpin', teacherOnly(async (req, res) => {
  const s = await ownStudent(req);
  if (!s) return res.status(404).json({ error: 'Not found.' });
  const taken = new Set((await db.all('SELECT pin FROM students WHERE class_id = ?', [s.class_id])).map((x) => x.pin));
  const pin = newPin(taken);
  await db.run('UPDATE students SET pin = ? WHERE id = ?', [pin, s.id]);
  await db.run('DELETE FROM sessions WHERE user_id = ?', [s.id]);
  res.json({ pin });
}));
app.delete('/api/students/:id', teacherOnly(async (req, res) => {
  const s = await ownStudent(req);
  if (!s) return res.status(404).json({ error: 'Not found.' });
  await db.run('DELETE FROM attempts WHERE student_id = ?', [s.id]);
  await db.run('DELETE FROM activity WHERE student_id = ?', [s.id]);
  await db.run('DELETE FROM sessions WHERE user_id = ?', [s.id]);
  await db.run('DELETE FROM students WHERE id = ?', [s.id]);
  res.json({ ok: true });
}));

/* ---------- teacher: homework ---------- */
function buildHomework(body, cls) {
  const title = clean(body.title, 80), topic = clean(body.topic, 120);
  if (!title) return { error: 'Give the homework a title.' };
  const tiers = JSON.parse(cls.tiers);
  const tier = tiers.includes(body.tier) ? body.tier : tiers[0];
  const items = [], seen = new Set();
  (Array.isArray(body.items) ? body.items : []).slice(0, 300).forEach((it) => {
    const fr = clean(it && it.fr, 140), en = clean(it && it.en, 140);
    if (!fr || !en || seen.has(fr.toLowerCase())) return;
    seen.add(fr.toLowerCase());
    items.push({ fr, en, s: SH.isSentence(fr) ? 1 : 0 });
  });
  const verbs = [];
  (Array.isArray(body.verbs) ? body.verbs : []).slice(0, 40).forEach((v) => {
    const forms = (Array.isArray(v && v.forms) ? v.forms : []).map((f) => clean(f, 40));
    const inf = clean(v && v.inf, 40);
    if (!inf || forms.length !== 6 || forms.some((f) => !f)) return;
    verbs.push({ inf, en: clean(v.en, 60), tense: clean(v.tense, 40), forms });
  });
  const grammar = [];
  (Array.isArray(body.grammar) ? body.grammar : []).slice(0, 100).forEach((g) => {
    const sent = clean(g && g.s, 200).replace(/_{3,}/g, '___'), a = clean(g && g.a, 60);
    if (!sent.includes('___') || !a) return;
    const o = (Array.isArray(g.o) ? g.o : []).map((x) => clean(x, 60)).filter((x) => x && x.toLowerCase() !== a.toLowerCase()).slice(0, 4);
    grammar.push({ s: sent, a, o, h: clean(g.h, 100) });
  });
  const st = SH.contentStats(items, verbs, grammar);
  if (!items.length && !verbs.length && !grammar.length) return { error: 'Add some vocabulary, verbs or grammar questions.' };
  let ex = (Array.isArray(body.exercises) ? body.exercises : []).filter((e) => SH.EXERCISES[e]);
  ex = SH.CATALOG.map((c) => c.id).filter((e) => ex.includes(e) && SH.supports(e, st)); // canonical order, only those the content supports
  if (!ex.length) return { error: 'Pick at least one exercise that your content supports.' };
  let due = body.due_at ? parseInt(body.due_at, 10) : null;
  if (!due || isNaN(due)) due = null;
  return { title, topic, tier, items, extra: { verbs, grammar }, ex, due, free: body.free_order === false ? 0 : 1 };
}
app.post('/api/classes/:id/homework', teacherOnly(async (req, res) => {
  const c = await ownClass(req, req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const h = buildHomework(req.body, c);
  if (h.error) return res.status(400).json({ error: h.error });
  const id = uid();
  await db.run('INSERT INTO homework (id,class_id,title,topic,tier,due_at,free_order,exercises,items,extra,created) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [id, c.id, h.title, h.topic, h.tier, h.due, h.free, JSON.stringify(h.ex), JSON.stringify(h.items), JSON.stringify(h.extra), now()]);
  res.json({ id });
}));
app.put('/api/homework/:id', teacherOnly(async (req, res) => {
  const hw = await db.get('SELECT * FROM homework WHERE id = ?', [req.params.id]);
  const c = hw && await ownClass(req, hw.class_id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const h = buildHomework(req.body, c);
  if (h.error) return res.status(400).json({ error: h.error });
  await db.run('UPDATE homework SET title=?,topic=?,tier=?,due_at=?,free_order=?,exercises=?,items=?,extra=? WHERE id=?',
    [h.title, h.topic, h.tier, h.due, h.free, JSON.stringify(h.ex), JSON.stringify(h.items), JSON.stringify(h.extra), hw.id]);
  res.json({ ok: true });
}));
app.delete('/api/homework/:id', teacherOnly(async (req, res) => {
  const hw = await db.get('SELECT * FROM homework WHERE id = ?', [req.params.id]);
  if (!hw || !(await ownClass(req, hw.class_id))) return res.status(404).json({ error: 'Not found.' });
  await db.run('DELETE FROM attempts WHERE homework_id = ?', [hw.id]);
  await db.run('DELETE FROM activity WHERE homework_id = ?', [hw.id]);
  await db.run('DELETE FROM homework WHERE id = ?', [hw.id]);
  res.json({ ok: true });
}));
app.get('/api/homework/:id', teacherOnly(async (req, res) => {
  const hw = await db.get('SELECT * FROM homework WHERE id = ?', [req.params.id]);
  const c = hw && await ownClass(req, hw.class_id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const students = await db.all('SELECT * FROM students WHERE class_id = ? ORDER BY name', [c.id]);
  const atts = await db.all('SELECT * FROM attempts WHERE homework_id = ?', [hw.id]);
  const acts = await db.all('SELECT * FROM activity WHERE homework_id = ?', [hw.id]);
  const ex = JSON.parse(hw.exercises);
  const rows = students.map((s) => {
    const st = hwStatus(hw, s.id, atts);
    const best = {};
    atts.filter((a) => a.student_id === s.id).forEach((a) => {
      if (!best[a.lesson] || a.score / a.total > best[a.lesson].score / best[a.lesson].total) best[a.lesson] = { score: a.score, total: a.total };
    });
    const secs = acts.filter((a) => a.student_id === s.id).reduce((n, a) => n + a.secs, 0);
    return { id: s.id, name: s.name, status: st.status, done: st.done.length, coins: st.coins, best, secs, finishedAt: st.finishedAt };
  });
  // days chart: from creation day for up to 7 days (to due date if sooner)
  const start = Date.parse(dayStr(hw.created) + 'T00:00:00Z');
  const endMs = hw.due_at ? Date.parse(dayStr(hw.due_at) + 'T00:00:00Z') : start + 6 * DAY;
  const days = [];
  for (let d = start; d <= Math.max(start, Math.min(endMs, start + 13 * DAY)); d += DAY) {
    const key = new Date(d).toISOString().slice(0, 10);
    days.push({ day: key, n: new Set(acts.filter((a) => a.day === key).map((a) => a.student_id)).size });
  }
  const loggedAny = new Set(acts.map((a) => a.student_id)).size;
  res.json({
    hw: { id: hw.id, title: hw.title, topic: hw.topic, tier: hw.tier, due_at: hw.due_at, created: hw.created, free_order: hw.free_order, exercises: ex, items: JSON.parse(hw.items), extra: JSON.parse(hw.extra || '{}') },
    cls: { id: c.id, name: c.name }, students: rows, days, loggedAny, classSize: students.length
  });
}));

/* ---------- student ---------- */
async function studentHw(req, id) {
  const hw = await db.get('SELECT * FROM homework WHERE id = ?', [id]);
  return hw && hw.class_id === req.student.class_id ? hw : null;
}
async function board(hw) {
  const students = await db.all('SELECT id,name FROM students WHERE class_id = ?', [hw.class_id]);
  const atts = await db.all('SELECT student_id,coins FROM attempts WHERE homework_id = ?', [hw.id]);
  return students.map((s) => ({ id: s.id, name: s.name, coins: atts.filter((a) => a.student_id === s.id).reduce((n, a) => n + a.coins, 0) }))
    .sort((a, b) => b.coins - a.coins || a.name.localeCompare(b.name));
}
app.get('/api/student/home', studentOnly(async (req, res) => {
  const s = req.student;
  const c = await db.get('SELECT * FROM classes WHERE id = ?', [s.class_id]);
  const hws = await db.all('SELECT * FROM homework WHERE class_id = ? ORDER BY created DESC', [c.id]);
  const classmates = await db.all('SELECT id,name FROM students WHERE class_id = ?', [c.id]);
  const allAtts = await db.all('SELECT * FROM attempts WHERE homework_id IN (SELECT id FROM homework WHERE class_id = ?)', [c.id]);
  const byHw = {};
  allAtts.forEach((a) => { (byHw[a.homework_id] = byHw[a.homework_id] || []).push(a); });
  const out = [];
  let coins = 0;
  for (const h of hws) {
    const atts = byHw[h.id] || [];
    const st = hwStatus(h, s.id, atts);
    coins += st.coins;
    const b = classmates.map((m) => ({ id: m.id, name: m.name, coins: atts.filter((a) => a.student_id === m.id).reduce((n, a) => n + a.coins, 0) }))
      .sort((x, y) => y.coins - x.coins || x.name.localeCompare(y.name));
    out.push({ id: h.id, title: h.title, topic: h.topic, tier: h.tier, due_at: h.due_at, done: st.done.length, total: st.total, status: st.status, rank: b.findIndex((x) => x.id === s.id) + 1, of: b.length });
  }
  res.json({ student: { name: s.name, coins }, cls: { name: c.name, language: c.language }, homework: out, tts: ttsOn() });
}));
app.get('/api/student/homework/:id', studentOnly(async (req, res) => {
  const hw = await studentHw(req, req.params.id);
  if (!hw) return res.status(404).json({ error: 'Homework not found.' });
  const c = await db.get('SELECT language FROM classes WHERE id = ?', [hw.class_id]);
  const atts = await db.all('SELECT * FROM attempts WHERE homework_id = ? AND student_id = ?', [hw.id, req.student.id]);
  const done = {};
  atts.forEach((a) => { if (!done[a.lesson] || a.score / a.total > done[a.lesson].score / done[a.lesson].total) done[a.lesson] = { score: a.score, total: a.total }; });
  const b = await board(hw);
  res.json({
    hw: { id: hw.id, title: hw.title, topic: hw.topic, tier: hw.tier, due_at: hw.due_at, free_order: hw.free_order, exercises: JSON.parse(hw.exercises), items: JSON.parse(hw.items), extra: JSON.parse(hw.extra || '{}'), language: c.language },
    tts: ttsOn(),
    done, me: req.student.id, coins: b.find((x) => x.id === req.student.id).coins,
    board: b.map((x, i) => ({ rank: i + 1, name: x.name, coins: x.coins, me: x.id === req.student.id }))
  });
}));
app.post('/api/student/attempt', studentOnly(async (req, res) => {
  const hw = await studentHw(req, String(req.body.homework_id || ''));
  if (!hw) return res.status(404).json({ error: 'Homework not found.' });
  const lesson = String(req.body.lesson || '');
  if (!JSON.parse(hw.exercises).includes(lesson)) return res.status(400).json({ error: 'Unknown lesson.' });
  const total = Math.max(1, Math.min(40, parseInt(req.body.total, 10) || 1));
  const score = Math.max(0, Math.min(total, parseInt(req.body.score, 10) || 0));
  const secs = Math.max(0, Math.min(3600, parseInt(req.body.secs, 10) || 0));
  const prev = await db.all('SELECT score,total FROM attempts WHERE homework_id = ? AND student_id = ? AND lesson = ?', [hw.id, req.student.id, lesson]);
  const prevBest = prev.reduce((m, a) => Math.max(m, potential(a.score, a.total)), 0);
  const gain = Math.max(0, potential(score, total) - prevBest);
  await db.run('INSERT INTO attempts (id,student_id,homework_id,lesson,score,total,secs,coins,ts) VALUES (?,?,?,?,?,?,?,?,?)', [uid(), req.student.id, hw.id, lesson, score, total, secs, gain, now()]);
  await db.run('UPDATE students SET last_active = ? WHERE id = ?', [now(), req.student.id]);
  res.json({ gained: gain });
}));
app.post('/api/student/ping', studentOnly(async (req, res) => {
  const secs = Math.max(0, Math.min(60, parseInt(req.body.secs, 10) || 0));
  const hwId = req.body.homework_id ? String(req.body.homework_id) : null;
  if (hwId && !(await studentHw(req, hwId))) return res.json({ ok: true });
  const day = dayStr(now());
  const row = await db.get('SELECT * FROM activity WHERE student_id = ? AND day = ? AND ' + (hwId ? 'homework_id = ?' : 'homework_id IS NULL'), hwId ? [req.student.id, day, hwId] : [req.student.id, day]);
  if (row) await db.run('UPDATE activity SET secs = secs + ? WHERE id = ?', [secs, row.id]);
  else await db.run('INSERT INTO activity (id,student_id,homework_id,day,secs) VALUES (?,?,?,?,?)', [uid(), req.student.id, hwId, day, secs]);
  await db.run('UPDATE students SET last_active = ? WHERE id = ?', [now(), req.student.id]);
  res.json({ ok: true });
}));

/* ---------- optional cloud voice (Google Cloud Text-to-Speech) ---------- */
// Off by default. Set GOOGLE_TTS_API_KEY to use natural cloud voices; every phrase is cached in the database.
const TTS_KEY = process.env.GOOGLE_TTS_API_KEY || '';
const TTS_URL = process.env.TTS_API_URL || 'https://texttospeech.googleapis.com/v1/text:synthesize';
const TTS_VOICES = { 'fr-FR': process.env.TTS_VOICE_FR || 'fr-FR-Neural2-A', 'es-ES': process.env.TTS_VOICE_ES || 'es-ES-Neural2-A' };
function ttsOn() { return !!TTS_KEY; }
app.get('/api/tts', wrap(async (req, res) => {
  const u = (await auth(req, 'student')) || (await auth(req, 'teacher'));
  if (!u) return res.status(401).json({ error: 'Please sign in.' });
  if (!ttsOn()) return res.status(404).json({ error: 'Cloud voice is not set up.' });
  const lang = TTS_VOICES[req.query.lang] ? req.query.lang : 'fr-FR';
  const text = clean(req.query.text, 200), slow = req.query.slow === '1';
  if (!text) return res.status(400).json({ error: 'No text.' });
  if (limited('tts:' + u.id, 600, 3600000)) return res.status(429).json({ error: 'Too many audio requests.' });
  const key = crypto.createHash('sha1').update([lang, TTS_VOICES[lang], slow ? 's' : 'n', text].join('|')).digest('hex');
  let row = await db.get('SELECT mp3 FROM audio WHERE key = ?', [key]);
  if (!row) {
    const r = await fetch(TTS_URL + '?key=' + encodeURIComponent(TTS_KEY), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { text }, voice: { languageCode: lang, name: TTS_VOICES[lang] }, audioConfig: { audioEncoding: 'MP3', speakingRate: slow ? 0.7 : 0.92 } })
    });
    if (!r.ok) { console.error('TTS error', r.status); return res.status(502).json({ error: 'Voice service error.' }); }
    const j = await r.json();
    if (!j.audioContent) return res.status(502).json({ error: 'Voice service error.' });
    try { await db.run('INSERT INTO audio (key,mp3,created) VALUES (?,?,?)', [key, j.audioContent, now()]); } catch (e) { /* another request cached it first */ }
    row = { mp3: j.audioContent };
  }
  res.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=86400' });
  res.send(Buffer.from(row.mp3, 'base64'));
}));

/* ---------- static ---------- */
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

open().then((d) => {
  db = d;
  app.listen(PORT, () => console.log(`Mon Devoir running on port ${PORT} (${db.kind})`));
}).catch((e) => { console.error('Could not start:', e); process.exit(1); });
