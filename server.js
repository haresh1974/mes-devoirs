const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
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

const STUDY_SECS = +process.env.STUDY_SECS || 360;
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
const practiceUser = (fn) => wrap(async (req, res) => {
  const s = await auth(req, 'student');
  if (s) { req.student = s; return fn(req, res); }
  const t = await auth(req, 'teacher');
  if (!t) return res.status(401).json({ error: 'Please sign in.' });
  req.teacher = t; req.student = null; // teachers can try the games; nothing is saved
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
  await db.run('DELETE FROM sessions WHERE kind = ? AND user_id = ?', ['student', s.id]); // one device per PIN
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
  const rows = await db.all('SELECT id,name,language,tiers,code,board FROM classes WHERE teacher_id = ? ORDER BY created', [req.teacher.id]);
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
  const board = ['ICSE', 'IGCSE', 'Both'].includes(req.body.board) ? req.body.board : 'Both';
  await db.run('INSERT INTO classes (id,teacher_id,name,language,tiers,code,board,created) VALUES (?,?,?,?,?,?,?,?)', [id, req.teacher.id, name, language, JSON.stringify(tiers), code, board, now()]);
  res.json({ id, code });
}));

app.put('/api/classes/:id/board', teacherOnly(async (req, res) => {
  const c = await ownClass(req, req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const board = ['ICSE', 'IGCSE', 'Both'].includes(req.body.board) ? req.body.board : 'Both';
  await db.run('UPDATE classes SET board = ? WHERE id = ?', [board, c.id]);
  res.json({ ok: true, board });
}));
app.delete('/api/classes/:id', teacherOnly(async (req, res) => {
  const c = await ownClass(req, req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const hws = await db.all('SELECT id FROM homework WHERE class_id = ?', [c.id]);
  const sts = await db.all('SELECT id FROM students WHERE class_id = ?', [c.id]);
  for (const h of hws) { await db.run('DELETE FROM attempts WHERE homework_id = ?', [h.id]); await db.run('DELETE FROM assignments WHERE homework_id = ?', [h.id]); await db.run('DELETE FROM activity WHERE homework_id = ?', [h.id]); }
  await db.run('DELETE FROM assignments WHERE class_id = ?', [c.id]);
  for (const s of sts) { await db.run('DELETE FROM activity WHERE student_id = ?', [s.id]); await db.run('DELETE FROM sessions WHERE user_id = ?', [s.id]); }
  await db.run('DELETE FROM homework WHERE class_id = ?', [c.id]);
  await db.run('DELETE FROM students WHERE class_id = ?', [c.id]);
  await db.run('DELETE FROM classes WHERE id = ?', [c.id]);
  res.json({ ok: true });
}));

/* ---------- shared stats ---------- */
function hwStatus(h, studentId, atts) {
  const ex = JSON.parse(h.exercises);
  const mine = atts.filter((a) => a.homework_id === h.id && a.student_id === studentId);
  const done = [...new Set(mine.map((a) => a.lesson))].filter((l) => ex.includes(l));
  const complete = ex.length > 0 && done.length >= ex.length;
  let finishedAt = null;
  if (complete) finishedAt = Math.max(...ex.map((l) => Math.min(...mine.filter((a) => a.lesson === l).map((a) => a.ts))));
  return { done, total: ex.length, status: complete ? 'complete' : (mine.length ? 'progress' : 'new'), finishedAt, coins: mine.reduce((n, a) => n + a.coins, 0) };
}
const listOf = (a) => { try { return JSON.parse(a.student_ids || '[]'); } catch (e) { return []; } };
const idsOf = (a, classStudents) => (a.audience === 'all' ? classStudents.map((s) => s.id) : listOf(a));
const onTime = (st, due) => st.status === 'complete' && (!due || st.finishedAt <= due);
const inList = (arr) => arr.map(() => '?').join(',');
function summarise(a, h, classStudents, atts, className) {
  const ids = idsOf(a, classStudents);
  const counts = { new: 0, progress: 0, complete: 0 };
  ids.forEach((sid) => { counts[hwStatus(h, sid, atts).status]++; });
  return { id: a.id, homework_id: h.id, class_id: a.class_id, class_name: className, start_at: a.start_at, due_at: a.due_at, audience: a.audience,
    size: ids.length, student_ids: ids, counts };
}

app.get('/api/classes/:id/overview', teacherOnly(async (req, res) => {
  const c = await ownClass(req, req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const students = await db.all('SELECT * FROM students WHERE class_id = ? ORDER BY name', [c.id]);
  const asg = await db.all('SELECT * FROM assignments WHERE class_id = ? ORDER BY start_at DESC', [c.id]);
  const hws = await db.all('SELECT * FROM homework WHERE id IN (SELECT homework_id FROM assignments WHERE class_id = ?)', [c.id]);
  const atts = await db.all('SELECT * FROM attempts WHERE homework_id IN (SELECT homework_id FROM assignments WHERE class_id = ?)', [c.id]);
  const acts = await db.all('SELECT * FROM activity WHERE student_id IN (SELECT id FROM students WHERE class_id = ?)', [c.id]);
  const hwBy = {}; hws.forEach((h) => { hwBy[h.id] = h; });
  const today = dayStr(now()), yest = dayStr(now() - DAY), t = now();
  const sOut = students.map((s) => {
    const a = acts.filter((x) => x.student_id === s.id);
    const sum = (f) => a.filter(f).reduce((n, x) => n + x.secs, 0);
    let ok = 0, tot = 0;
    asg.forEach((x) => {
      if (x.start_at > t || !hwBy[x.homework_id] || !idsOf(x, students).includes(s.id)) return;
      tot++; if (onTime(hwStatus(hwBy[x.homework_id], s.id, atts), x.due_at)) ok++;
    });
    return { id: s.id, name: s.name, pin: s.pin, secsTotal: sum(() => true), secsToday: sum((x) => x.day === today), secsYesterday: sum((x) => x.day === yest), lastActive: s.last_active, onTime: ok, hwTotal: tot };
  });
  const hOut = asg.filter((x) => hwBy[x.homework_id]).map((x) => {
    const h = hwBy[x.homework_id], sm = summarise(x, h, students, atts, c.name);
    return { id: h.id, aid: x.id, title: h.title, topic: h.topic, tier: h.tier, start_at: x.start_at, due_at: x.due_at, audience: x.audience, size: sm.size,
      lessons: JSON.parse(h.exercises).length, counts: sm.counts };
  });
  res.json({ cls: { id: c.id, name: c.name, language: c.language, tiers: JSON.parse(c.tiers), code: c.code, board: c.board || 'Both' }, students: sOut, homework: hOut });
}));

/* ---------- library, assigning and timeline ---------- */
async function teacherData(tid) {
  const classes = await db.all('SELECT * FROM classes WHERE teacher_id = ? ORDER BY created', [tid]);
  const students = await db.all('SELECT s.* FROM students s JOIN classes c ON c.id = s.class_id WHERE c.teacher_id = ? ORDER BY s.name', [tid]);
  const hws = await db.all('SELECT h.* FROM homework h JOIN classes c ON c.id = h.class_id WHERE c.teacher_id = ? ORDER BY h.created, h.id', [tid]);
  const asg = await db.all('SELECT a.* FROM assignments a JOIN classes c ON c.id = a.class_id WHERE c.teacher_id = ? ORDER BY a.start_at', [tid]);
  const atts = await db.all('SELECT a.* FROM attempts a JOIN homework h ON h.id = a.homework_id JOIN classes c ON c.id = h.class_id WHERE c.teacher_id = ?', [tid]);
  const stByClass = {}; students.forEach((s) => { (stByClass[s.class_id] = stByClass[s.class_id] || []).push(s); });
  const clsBy = {}; classes.forEach((c) => { clsBy[c.id] = c; });
  const hwBy = {}; hws.forEach((h) => { hwBy[h.id] = h; });
  const summaries = asg.filter((a) => hwBy[a.homework_id] && clsBy[a.class_id]).map((a) => summarise(a, hwBy[a.homework_id], stByClass[a.class_id] || [], atts, clsBy[a.class_id].name));
  return { classes, hws, stByClass, summaries, hwBy, clsBy, atts };
}
/* ---------- resources: organised by board, assignable as homework ---------- */
let RESOURCES = [];
try { RESOURCES = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed', 'resources.json'), 'utf8')); } catch (e) { /* none */ }
const boardOk = (r, board) => !board || board === 'Both' || r.boards.includes(board);
app.get('/api/resources', wrap(async (req, res) => {
  const t = await auth(req, 'teacher');
  if (t) {
    const classes = await db.all('SELECT id,name,board FROM classes WHERE teacher_id = ? ORDER BY created', [t.id]);
    return res.json({ role: 'teacher', classes, resources: RESOURCES });
  }
  const st = await auth(req, 'student');
  if (!st) return res.status(401).json({ error: 'Please sign in.' });
  const c = await db.get('SELECT board FROM classes WHERE id = ?', [st.class_id]);
  res.json({ role: 'student', board: (c && c.board) || 'Both', resources: RESOURCES.filter((r) => r.access === 'open' && boardOk(r, c && c.board)) });
}));
app.post('/api/resources/assign', teacherOnly(async (req, res) => {
  const b = req.body || {};
  const rids = [...new Set((Array.isArray(b.resource_ids) ? b.resource_ids : []).map(String))].slice(0, 100);
  const cids = [...new Set((Array.isArray(b.class_ids) ? b.class_ids : []).map(String))];
  const picks = rids.map((id) => RESOURCES.find((r) => r.id === id)).filter(Boolean);
  if (!picks.length) return res.status(400).json({ error: 'Choose at least one resource.' });
  const classes = [];
  for (const id of cids) { const c = await ownClass(req, id); if (c) classes.push(c); }
  if (!classes.length) return res.status(400).json({ error: 'Choose at least one class.' });
  const start = parseInt(b.start_at, 10) || now();
  const due = b.due_at ? parseInt(b.due_at, 10) : null;
  if (due && due <= start) return res.status(400).json({ error: 'The due date must be after the start date.' });
  let made = 0;
  for (const c of classes) {
    const students = await db.all('SELECT id FROM students WHERE class_id = ?', [c.id]);
    if (!students.length) continue;
    for (const r of picks) {
      let hw = await db.get('SELECT id FROM homework WHERE class_id = ? AND extra LIKE ?', [c.id, '%"rid":"' + r.id + '"%']);
      if (!hw) {
        const id = uid();
        await db.run('INSERT INTO homework (id,class_id,title,topic,folder,tier,due_at,free_order,exercises,items,extra,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          [id, c.id, r.title, r.group, 'Resources / ' + r.skill, 'Higher', null, 1, JSON.stringify(['RES']), '[]', JSON.stringify({ verbs: [], grammar: [], mixed: false, resource: { rid: r.id, url: r.url, title: r.title, desc: r.desc, skill: r.skill } }), now()]);
        hw = { id };
      }
      await db.run('INSERT INTO assignments (id,homework_id,class_id,start_at,due_at,audience,student_ids,created) VALUES (?,?,?,?,?,?,?,?)', [uid(), hw.id, c.id, start, due, 'all', null, now()]);
      made++;
    }
  }
  if (!made) return res.status(400).json({ error: 'Those classes have no students yet.' });
  res.json({ ok: true, made, classes: classes.length });
}));
app.get('/api/library', teacherOnly(async (req, res) => {
  const D = await teacherData(req.teacher.id);
  const by = {}; D.summaries.forEach((x) => { (by[x.homework_id] = by[x.homework_id] || []).push(x); });
  res.json({
    classes: D.classes.map((c) => ({ id: c.id, name: c.name, language: c.language, n: (D.stByClass[c.id] || []).length })),
    homework: D.hws.map((h) => ({ id: h.id, title: h.title, topic: h.topic, tier: h.tier, folder: h.folder || '', items: JSON.parse(h.items).length, lessons: JSON.parse(h.exercises).length, created: h.created, assignments: by[h.id] || [] }))
  });
}));
app.get('/api/timeline', teacherOnly(async (req, res) => {
  const D = await teacherData(req.teacher.id);
  res.json({
    classes: D.classes.map((c) => ({ id: c.id, name: c.name, language: c.language })),
    assignments: D.summaries.map((x) => ({ ...x, title: D.hwBy[x.homework_id].title, tier: D.hwBy[x.homework_id].tier }))
  });
}));
app.post('/api/assign', teacherOnly(async (req, res) => {
  const b = req.body || {};
  const c = await ownClass(req, String(b.class_id || ''));
  if (!c) return res.status(400).json({ error: 'Choose a class.' });
  const ids = [...new Set((Array.isArray(b.homework_ids) ? b.homework_ids : []).map(String))].slice(0, 60);
  if (!ids.length) return res.status(400).json({ error: 'Choose at least one homework.' });
  const start = parseInt(b.start_at, 10) || now();
  const due = b.due_at ? parseInt(b.due_at, 10) : null;
  if (due && due <= start) return res.status(400).json({ error: 'The due date must be after the start date.' });
  const students = await db.all('SELECT * FROM students WHERE class_id = ? ORDER BY name', [c.id]);
  let audience = 'all', list = null;
  if (b.audience === 'students') {
    const want = new Set((Array.isArray(b.student_ids) ? b.student_ids : []).map(String));
    list = students.filter((s) => want.has(s.id)).map((s) => s.id);
    audience = 'students';
  } else if (b.audience === 'ontime' || b.audience === 'notontime') {
    const prev = await db.get('SELECT * FROM homework WHERE id = ?', [String(b.after_hw_id || '')]);
    const pc = prev && await ownClass(req, prev.class_id);
    if (!pc) return res.status(400).json({ error: 'Choose which homework to check.' });
    const pa = await db.all('SELECT * FROM assignments WHERE homework_id = ? AND class_id = ?', [prev.id, c.id]);
    if (!pa.length) return res.status(400).json({ error: 'That homework has not been assigned to this class yet.' });
    const atts = await db.all('SELECT * FROM attempts WHERE homework_id = ?', [prev.id]);
    list = students.filter((s) => {
      const mine = pa.filter((a) => idsOf(a, students).includes(s.id));
      if (!mine.length) return false; // was never given it, so leave out of both groups
      const st = hwStatus(prev, s.id, atts);
      const good = mine.some((a) => onTime(st, a.due_at));
      return b.audience === 'ontime' ? good : !good;
    }).map((s) => s.id);
    audience = 'students';
  }
  if (audience === 'all' && !students.length) return res.status(400).json({ error: 'This class has no students yet. Add students first.' });
  if (audience === 'students' && !list.length) return res.status(400).json({ error: 'No students match that choice.' });
  let made = 0;
  for (const hid of ids) {
    const h = await db.get('SELECT * FROM homework WHERE id = ?', [hid]);
    if (!h || !(await ownClass(req, h.class_id))) continue;
    await db.run('INSERT INTO assignments (id,homework_id,class_id,start_at,due_at,audience,student_ids,created) VALUES (?,?,?,?,?,?,?,?)',
      [uid(), h.id, c.id, start, due, audience, list ? JSON.stringify(list) : null, now()]);
    made++;
  }
  res.json({ ok: true, made, students: audience === 'all' ? students.length : list.length });
}));
async function ownAssignment(req, id) {
  const a = await db.get('SELECT * FROM assignments WHERE id = ?', [id]);
  return a && (await ownClass(req, a.class_id)) ? a : null;
}
app.put('/api/assignments/:id', teacherOnly(async (req, res) => {
  const a = await ownAssignment(req, req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found.' });
  const start = parseInt(req.body.start_at, 10) || a.start_at;
  const due = req.body.due_at ? parseInt(req.body.due_at, 10) : null;
  if (due && due <= start) return res.status(400).json({ error: 'The due date must be after the start date.' });
  await db.run('UPDATE assignments SET start_at = ?, due_at = ? WHERE id = ?', [start, due, a.id]);
  res.json({ ok: true });
}));
app.delete('/api/assignments/:id', teacherOnly(async (req, res) => {
  const a = await ownAssignment(req, req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found.' });
  await db.run('DELETE FROM assignments WHERE id = ?', [a.id]);
  res.json({ ok: true });
}));

/* ---------- teacher: students ---------- */
function newPin(taken) {
  for (let i = 0; i < 200; i++) { const p = String(crypto.randomInt(1000, 10000)); if (!taken.has(p)) { taken.add(p); return p; } }
  throw new Error('no pin');
}
app.post('/api/classes/:id/notify', teacherOnly(async (req, res) => {
  const c = await ownClass(req, req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const m = clean(req.body.message, 300);
  if (!m) return res.status(400).json({ error: 'Type a message first.' });
  await db.run('INSERT INTO notices (id, class_id, message, created) VALUES (?,?,?,?)', [uid(), c.id, m, Date.now()]);
  res.json({ ok: true });
}));
app.post('/api/classes/:id/students', teacherOnly(async (req, res) => {
  const c = await ownClass(req, req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const names = (Array.isArray(req.body.names) ? req.body.names : []).map((n) => clean(n, 40)).filter(Boolean).slice(0, 80);
  if (!names.length) return res.status(400).json({ error: 'Add at least one name.' });
  const existing = await db.all('SELECT pin FROM students WHERE class_id = ?', [c.id]);
  const taken = new Set(existing.map((s) => s.pin));
  const out = names.map((name) => ({ id: uid(), name, pin: newPin(taken) }));
  const t = now();
  await db.run('INSERT INTO students (id,class_id,name,pin,created,last_active) VALUES ' + out.map(() => '(?,?,?,?,?,?)').join(','),
    out.flatMap((o) => [o.id, c.id, o.name, o.pin, t, null]));
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
  const title = clean(body.title, 80), topic = clean(body.topic, 120), folder = clean(body.folder, 60);
  if (!title) return { error: 'Give the homework a title.' };
  const tiers = JSON.parse(cls.tiers);
  const tier = tiers.includes(body.tier) ? body.tier : tiers[0];
  const items = [], seen = new Set();
  (Array.isArray(body.items) ? body.items : []).slice(0, 300).forEach((it) => {
    const fr = clean(it && it.fr, 140), en = clean(it && it.en, 140);
    if (!fr || !en || seen.has(fr.toLowerCase())) return;
    seen.add(fr.toLowerCase());
    const row = { fr, en, s: it.s != null ? (it.s ? 1 : 0) : (SH.isSentence(fr) ? 1 : 0) };
    const k = clean(it.k, 60); if (k) row.k = k;
    const d = (Array.isArray(it.d) ? it.d : []).map((x) => clean(x, 40)).filter(Boolean).slice(0, 3); if (d.length) row.d = d;
    items.push(row);
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
  const mixed = !!body.mixed && items.length >= 4;
  let ex = (Array.isArray(body.exercises) ? body.exercises : []).filter((e) => SH.EXERCISES[e] && !SH.isLesson(e));
  ex = SH.CATALOG.map((c) => c.id).filter((e) => ex.includes(e) && SH.supports(e, st)); // canonical order, only those the content supports
  if (mixed) ex = Array.from({ length: SH.lessonCount(items) }, (_, i) => 'L' + (i + 1));
  if (!ex.length) return { error: 'Pick at least one exercise that your content supports.' };
  let due = body.due_at ? parseInt(body.due_at, 10) : null;
  if (!due || isNaN(due)) due = null;
  return { title, topic, folder, tier, items, extra: { verbs, grammar, mixed }, ex, due, free: body.free_order === false ? 0 : 1 };
}
app.post('/api/classes/:id/homework', teacherOnly(async (req, res) => {
  const c = await ownClass(req, req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const h = buildHomework(req.body, c);
  if (h.error) return res.status(400).json({ error: h.error });
  const id = uid();
  await db.run('INSERT INTO homework (id,class_id,title,topic,folder,tier,due_at,free_order,exercises,items,extra,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [id, c.id, h.title, h.topic, h.folder, h.tier, null, h.free, JSON.stringify(h.ex), JSON.stringify(h.items), JSON.stringify(h.extra), now()]);
  res.json({ id });
}));
app.put('/api/homework/:id', teacherOnly(async (req, res) => {
  const hw = await db.get('SELECT * FROM homework WHERE id = ?', [req.params.id]);
  const c = hw && await ownClass(req, hw.class_id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const h = buildHomework(req.body, c);
  if (h.error) return res.status(400).json({ error: h.error });
  await db.run('UPDATE homework SET title=?,topic=?,folder=?,tier=?,free_order=?,exercises=?,items=?,extra=? WHERE id=?',
    [h.title, h.topic, h.folder, h.tier, h.free, JSON.stringify(h.ex), JSON.stringify(h.items), JSON.stringify(h.extra), hw.id]);
  res.json({ ok: true });
}));
app.delete('/api/homework/:id', teacherOnly(async (req, res) => {
  const hw = await db.get('SELECT * FROM homework WHERE id = ?', [req.params.id]);
  if (!hw || !(await ownClass(req, hw.class_id))) return res.status(404).json({ error: 'Not found.' });
  await db.run('DELETE FROM attempts WHERE homework_id = ?', [hw.id]);
  await db.run('DELETE FROM activity WHERE homework_id = ?', [hw.id]);
  await db.run('DELETE FROM assignments WHERE homework_id = ?', [hw.id]);
  await db.run('DELETE FROM homework WHERE id = ?', [hw.id]);
  res.json({ ok: true });
}));
app.get('/api/homework/:id', teacherOnly(async (req, res) => {
  const hw = await db.get('SELECT * FROM homework WHERE id = ?', [req.params.id]);
  const c = hw && await ownClass(req, hw.class_id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const asg = await db.all('SELECT a.*, c.name AS cname FROM assignments a JOIN classes c ON c.id = a.class_id WHERE a.homework_id = ? AND c.teacher_id = ? ORDER BY a.start_at', [hw.id, req.teacher.id]);
  const allSt = await db.all('SELECT s.*, c.name AS cname FROM students s JOIN classes c ON c.id = s.class_id WHERE c.teacher_id = ? ORDER BY s.name', [req.teacher.id]);
  const atts = await db.all('SELECT * FROM attempts WHERE homework_id = ?', [hw.id]);
  const acts = await db.all('SELECT * FROM activity WHERE homework_id = ?', [hw.id]);
  const ex = JSON.parse(hw.exercises);
  const seen = new Map();
  asg.forEach((a) => { idsOf(a, allSt.filter((s) => s.class_id === a.class_id)).forEach((sid) => { if (!seen.has(sid)) seen.set(sid, a); }); });
  const students = allSt.filter((s) => seen.has(s.id));
  const rows = students.map((s) => {
    const st = hwStatus(hw, s.id, atts);
    const best = {};
    atts.filter((a) => a.student_id === s.id).forEach((a) => {
      if (!best[a.lesson] || a.score / a.total > best[a.lesson].score / best[a.lesson].total) best[a.lesson] = { score: a.score, total: a.total };
    });
    const secs = acts.filter((a) => a.student_id === s.id).reduce((n, a) => n + a.secs, 0);
    return { id: s.id, name: s.name, cls: s.cname, status: st.status, done: st.done.length, coins: st.coins, best, secs, finishedAt: st.finishedAt, onTime: onTime(st, seen.get(s.id).due_at) };
  });
  const firstStart = asg.length ? Math.min(...asg.map((a) => a.start_at)) : hw.created;
  const dues = asg.filter((a) => a.due_at).map((a) => a.due_at);
  const start = Date.parse(dayStr(firstStart) + 'T00:00:00Z');
  const endMs = dues.length ? Date.parse(dayStr(Math.max(...dues)) + 'T00:00:00Z') : start + 6 * DAY;
  const days = [];
  for (let d = start; d <= Math.max(start, Math.min(endMs, start + 13 * DAY)); d += DAY) {
    const key = new Date(d).toISOString().slice(0, 10);
    days.push({ day: key, n: new Set(acts.filter((a) => a.day === key).map((a) => a.student_id)).size });
  }
  const loggedAny = new Set(acts.map((a) => a.student_id)).size;
  res.json({
    hw: { id: hw.id, title: hw.title, topic: hw.topic, folder: hw.folder || '', tier: hw.tier, created: hw.created, free_order: hw.free_order, exercises: ex, items: JSON.parse(hw.items), extra: JSON.parse(hw.extra || '{}') },
    assignments: asg.map((a) => ({ id: a.id, class_id: a.class_id, class_name: a.cname, start_at: a.start_at, due_at: a.due_at, audience: a.audience, size: idsOf(a, allSt.filter((s) => s.class_id === a.class_id)).length })),
    cls: { id: c.id, name: c.name }, students: rows, days, loggedAny, classSize: students.length
  });
}));

/* ---------- student ---------- */
/* A student sees a homework only when an assignment that has started covers them. */
async function myAssignments(student) {
  const asg = await db.all('SELECT * FROM assignments WHERE class_id = ? AND start_at <= ?', [student.class_id, now()]);
  return asg.filter((a) => a.audience === 'all' || listOf(a).includes(student.id));
}
const dueOf = (asg) => { const d = asg.filter((a) => a.due_at).map((a) => a.due_at); return d.length ? Math.min(...d) : null; };
async function studentHw(req, id) {
  const mine = (await myAssignments(req.student)).filter((a) => a.homework_id === id);
  if (!mine.length) return null;
  const hw = await db.get('SELECT * FROM homework WHERE id = ?', [id]);
  if (hw) hw.due_at = dueOf(mine);
  return hw || null;
}
async function board(hw, student) {
  const asg = (await db.all('SELECT * FROM assignments WHERE class_id = ? AND homework_id = ?', [student.class_id, hw.id]));
  const students = await db.all('SELECT id,name FROM students WHERE class_id = ?', [student.class_id]);
  const covered = new Set(); asg.forEach((a) => idsOf(a, students).forEach((i) => covered.add(i)));
  const atts = await db.all('SELECT student_id,coins FROM attempts WHERE homework_id = ?', [hw.id]);
  return students.filter((s) => covered.has(s.id)).map((s) => ({ id: s.id, name: s.name, coins: atts.filter((a) => a.student_id === s.id).reduce((n, a) => n + a.coins, 0) }))
    .sort((a, b) => b.coins - a.coins || a.name.localeCompare(b.name));
}
/* one child, several classes: each class has its own student record, linked by link_id */
async function linkedStudents(s) {
  const key = s.link_id || s.id;
  return db.all('SELECT s.id, s.class_id, c.name AS cname, c.language FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ? OR s.link_id = ? ORDER BY s.created', [key, key]);
}
async function switchStudent(req, id) {
  const tok = parseCookies(req).sid;
  await db.run('DELETE FROM sessions WHERE kind = ? AND user_id = ? AND token <> ?', ['student', id, tok]);
  await db.run('UPDATE sessions SET user_id = ? WHERE token = ? AND kind = ?', [id, tok, 'student']);
  await db.run('UPDATE students SET last_active = ? WHERE id = ?', [now(), id]);
}
app.get('/api/student/classes', studentOnly(async (req, res) => {
  const rows = await linkedStudents(req.student);
  res.json({ classes: rows.map((r) => ({ id: r.id, name: r.cname, language: r.language, current: r.id === req.student.id })) });
}));
app.post('/api/student/switch', studentOnly(async (req, res) => {
  const rows = await linkedStudents(req.student), t = rows.find((r) => r.id === String(req.body.id || ''));
  if (!t) return res.status(404).json({ error: 'Class not found.' });
  await switchStudent(req, t.id);
  res.json({ ok: true });
}));
app.post('/api/student/join', studentOnly(async (req, res) => {
  const s = req.student, code = clean(req.body.code, 10).toUpperCase();
  if (limited('sj:' + s.id, 10, 600000)) return res.status(429).json({ error: 'Too many tries. Please wait a few minutes.' });
  const c = code && await db.get('SELECT * FROM classes WHERE code = ?', [code]);
  if (!c) return res.status(400).json({ error: 'That class code is not right. Check it with your teacher.' });
  const rows = await linkedStudents(s), have = rows.find((r) => r.class_id === c.id);
  if (have) { await switchStudent(req, have.id); return res.json({ ok: true, already: true, name: c.name }); }
  if (rows.length >= 6) return res.status(400).json({ error: 'You are already in 6 classes. Ask your teacher for help.' });
  const key = s.link_id || s.id;
  if (!s.link_id) await db.run('UPDATE students SET link_id = ? WHERE id = ?', [key, s.id]);
  const taken = new Set((await db.all('SELECT pin FROM students WHERE class_id = ?', [c.id])).map((x) => x.pin));
  const pin = taken.has(s.pin) ? newPin(taken) : s.pin, id = uid();
  await db.run('INSERT INTO students (id,class_id,name,pin,created,last_active,link_id) VALUES (?,?,?,?,?,?,?)', [id, c.id, s.name, pin, now(), now(), key]);
  await switchStudent(req, id);
  res.json({ ok: true, name: c.name, pin, samePin: pin === s.pin });
}));
app.get('/api/student/home', studentOnly(async (req, res) => {
  const s = req.student;
  const c = await db.get('SELECT * FROM classes WHERE id = ?', [s.class_id]);
  const mine = (await myAssignments(s)).sort((a, b) => b.start_at - a.start_at);
  const hwIds = [...new Set(mine.map((a) => a.homework_id))];
  const hws = hwIds.length ? await db.all('SELECT * FROM homework WHERE id IN (' + inList(hwIds) + ')', hwIds) : [];
  const hwBy = {}; hws.forEach((h) => { hwBy[h.id] = h; });
  const classmates = await db.all('SELECT id,name FROM students WHERE class_id = ?', [c.id]);
  const allAsg = await db.all('SELECT * FROM assignments WHERE class_id = ?', [c.id]);
  const allAtts = hwIds.length ? await db.all('SELECT * FROM attempts WHERE homework_id IN (' + inList(hwIds) + ')', hwIds) : [];
  const out = [];
  let coins = 0;
  for (const id of hwIds) {
    const h = hwBy[id]; if (!h) continue;
    const atts = allAtts.filter((a) => a.homework_id === id);
    const st = hwStatus(h, s.id, atts);
    coins += st.coins;
    const covered = new Set(); allAsg.filter((a) => a.homework_id === id).forEach((a) => idsOf(a, classmates).forEach((i) => covered.add(i)));
    const b = classmates.filter((m) => covered.has(m.id)).map((m) => ({ id: m.id, coins: atts.filter((a) => a.student_id === m.id).reduce((n, a) => n + a.coins, 0), name: m.name }))
      .sort((x, y) => y.coins - x.coins || x.name.localeCompare(y.name));
    out.push({ id: h.id, title: h.title, topic: h.topic, tier: h.tier, due_at: dueOf(mine.filter((a) => a.homework_id === id)), done: st.done.length, total: st.total, status: st.status, rank: b.findIndex((x) => x.id === s.id) + 1, of: b.length });
  }
  const notices = await db.all('SELECT id, message, created FROM notices WHERE class_id = ? AND created > ? ORDER BY created DESC LIMIT 3', [c.id, Date.now() - 14 * 86400000]);
  const tAsg = await db.all('SELECT id,due_at FROM test_assignments WHERE class_id = ? AND start_at <= ?', [c.id, now()]);
  let tTodo = 0;
  for (const a of tAsg) { const r = await db.get('SELECT status FROM test_results WHERE assignment_id = ? AND student_id = ?', [a.id, s.id]); if (!r && !(a.due_at && a.due_at < now())) tTodo++; }
  const linked = await linkedStudents(s);
  res.json({ classes: linked.map((r) => ({ id: r.id, name: r.cname, current: r.id === s.id })), student: { name: s.name, coins }, cls: { name: c.name, language: c.language }, homework: out, notices, tts: ttsOn(), tests: { total: tAsg.length, todo: tTodo } });
}));
app.get('/api/student/homework/:id', studentOnly(async (req, res) => {
  const hw = await studentHw(req, req.params.id);
  if (!hw) return res.status(404).json({ error: 'Homework not found.' });
  const c = await db.get('SELECT language FROM classes WHERE id = ?', [req.student.class_id]);
  const atts = await db.all('SELECT * FROM attempts WHERE homework_id = ? AND student_id = ?', [hw.id, req.student.id]);
  const done = {};
  atts.forEach((a) => { if (!done[a.lesson] || a.score / a.total > done[a.lesson].score / done[a.lesson].total) done[a.lesson] = { score: a.score, total: a.total }; });
  const b = await board(hw, req.student);
  const stRow = await db.get('SELECT secs FROM study WHERE id = ?', [req.student.id + ':' + hw.id]);
  res.json({
    study: stRow ? stRow.secs : 0, need: STUDY_SECS,
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
  const total = Math.max(1, Math.min(80, parseInt(req.body.total, 10) || 1));
  const score = Math.max(0, Math.min(total, parseInt(req.body.score, 10) || 0));
  const secs = Math.max(0, Math.min(3600, parseInt(req.body.secs, 10) || 0));
  const prev = await db.all('SELECT score,total FROM attempts WHERE homework_id = ? AND student_id = ? AND lesson = ?', [hw.id, req.student.id, lesson]);
  const prevBest = prev.reduce((m, a) => Math.max(m, potential(a.score, a.total)), 0);
  const gain = Math.max(0, potential(score, total) - prevBest);
  await db.run('INSERT INTO attempts (id,student_id,homework_id,lesson,score,total,secs,coins,ts) VALUES (?,?,?,?,?,?,?,?,?)', [uid(), req.student.id, hw.id, lesson, score, total, secs, gain, now()]);
  await db.run('UPDATE students SET last_active = ? WHERE id = ?', [now(), req.student.id]);
  res.json({ gained: gain });
}));
/* ---------- practice hub (game type > level > up to 3 lessons) ---------- */
async function seedLessons() {
  let seed = [];
  try { seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed', 'practice.json'), 'utf8')); } catch (e) { return; }
  const have = new Set((await db.all('SELECT id FROM lessons')).map((r) => r.id));
  let n = 0;
  for (const [i, l] of seed.entries()) {
    const vals = [l.kind, l.level, l.title, l.topic || '', JSON.stringify(l.items || []), JSON.stringify(l.verbs || []), i];
    if (have.has(l.id)) await db.run('UPDATE lessons SET kind=?,level=?,title=?,topic=?,items=?,verbs=?,sort=? WHERE id=?', [...vals, l.id]);
    else { await db.run('INSERT INTO lessons (kind,level,title,topic,items,verbs,sort,id) VALUES (?,?,?,?,?,?,?,?)', [...vals, l.id]); n++; }
  }
  const ids = new Set(seed.map((l) => l.id));
  for (const id of have) if (!ids.has(id)) await db.run('DELETE FROM lessons WHERE id = ?', [id]);
  if (n) console.log('Practice lessons added:', n);
}
app.get('/api/teacher/practice', teacherOnly(async (req, res) => {
  const classes = await db.all('SELECT id,name FROM classes WHERE teacher_id = ? ORDER BY created', [req.teacher.id]);
  const cids = classes.map((c) => c.id);
  if (!cids.length) return res.json({ classes: [], students: [] });
  const students = await db.all('SELECT id,name,class_id FROM students WHERE class_id IN (' + inList(cids) + ') ORDER BY name', cids);
  const sids = students.map((x) => x.id);
  const rows = sids.length ? await db.all('SELECT * FROM practice_results WHERE student_id IN (' + inList(sids) + ') ORDER BY ts DESC', sids) : [];
  const lids = new Set(); rows.forEach((r) => { try { JSON.parse(r.lesson_ids).forEach((i) => lids.add(i)); } catch (e) { /* ignore */ } });
  const L = lids.size ? await db.all('SELECT id,title FROM lessons WHERE id IN (' + inList([...lids]) + ')', [...lids]) : [];
  const titles = {}; L.forEach((l) => { titles[l.id] = l.title; });
  const out = students.map((st) => {
    const r = rows.filter((x) => x.student_id === st.id);
    const score = r.reduce((n, x) => n + x.score, 0), total = r.reduce((n, x) => n + x.total, 0);
    const games = {}; r.forEach((x) => { const g = String(x.game).split('·')[0]; games[g] = (games[g] || 0) + 1; });
    return { id: st.id, name: st.name, class_id: st.class_id, sessions: r.length, pct: total ? Math.round(score / total * 100) : null, secs: r.reduce((n, x) => n + x.secs, 0), last: r[0] ? r[0].ts : null, games,
      recent: r.slice(0, 40).map((x) => { let ids = []; try { ids = JSON.parse(x.lesson_ids); } catch (e) { /* ignore */ } return { game: x.game, level: x.level, lessons: ids.map((i) => titles[i] || i), score: x.score, total: x.total, secs: x.secs, ts: x.ts }; }) };
  });
  res.json({ classes, students: out });
}));
app.get('/api/student/practice', practiceUser(async (req, res) => {
  const rows = await db.all('SELECT id,kind,level,title,topic,items,verbs FROM lessons ORDER BY sort');
  res.json({ tts: ttsOn(), lessons: rows.map((r) => ({ id: r.id, kind: r.kind, level: r.level, title: r.title, topic: r.topic, n: JSON.parse(r.items).length + JSON.parse(r.verbs).length * 6 })) });
}));
app.get('/api/student/practice/verbs', practiceUser(async (req, res) => {
  const rows = await db.all("SELECT verbs FROM lessons WHERE kind = 'verb' ORDER BY sort");
  const TN = { 'présent': 'Present Indicative', 'futur proche': 'Immediate future', 'imparfait': 'Imperfect Indicative', 'passé composé': 'Perfect Indicative', 'futur simple': 'Future Indicative', 'present subjunctive': 'Present Subjunctive', 'subjonctif présent': 'Present Subjunctive', 'conditionnel': 'Present Conditional', 'conditionnel présent': 'Present Conditional', 'past conditional': 'Past Conditional', 'plus-que-parfait': 'Pluperfect Indicative' };
  const seen = new Set(), out = [];
  rows.forEach((r) => JSON.parse(r.verbs).forEach((v) => { const t = TN[v.tense] || v.tense, k = v.inf + '|' + t; if (seen.has(k) || !v.forms || v.forms.length !== 6) return; seen.add(k); out.push({ inf: v.inf, en: v.en, tense: t, forms: v.forms }); }));
  res.json({ tts: ttsOn(), verbs: out });
}));
app.get('/api/student/practice/lessons', practiceUser(async (req, res) => {
  const ids = String(req.query.ids || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 3);
  if (!ids.length) return res.json({ tts: ttsOn(), lessons: [] });
  const rows = await db.all('SELECT * FROM lessons WHERE id IN (' + inList(ids) + ')', ids);
  res.json({ tts: ttsOn(), lessons: rows.map((r) => ({ id: r.id, kind: r.kind, level: r.level, title: r.title, items: JSON.parse(r.items), verbs: JSON.parse(r.verbs) })) });
}));
app.post('/api/student/practice/result', practiceUser(async (req, res) => {
  if (!req.student) return res.json({ ok: true });
  const b = req.body || {};
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(String).slice(0, 3);
  const total = Math.max(1, Math.min(200, parseInt(b.total, 10) || 1));
  const score = Math.max(0, Math.min(total, parseInt(b.score, 10) || 0));
  const secs = Math.max(0, Math.min(7200, parseInt(b.secs, 10) || 0));
  await db.run('INSERT INTO practice_results (id,student_id,game,level,lesson_ids,score,total,secs,ts) VALUES (?,?,?,?,?,?,?,?,?)', [uid(), req.student.id, clean(b.game, 20), clean(b.level, 20), JSON.stringify(ids), score, total, secs, now()]);
  await db.run('UPDATE students SET last_active = ? WHERE id = ?', [now(), req.student.id]);
  res.json({ ok: true });
}));
app.post('/api/student/study', studentOnly(async (req, res) => {
  const hw = await studentHw(req, String(req.body.homework_id || ''));
  if (!hw) return res.status(404).json({ error: 'Homework not found.' });
  const id = req.student.id + ':' + hw.id, t = now();
  const row = await db.get('SELECT * FROM study WHERE id = ?', [id]);
  const asked = Math.max(0, Math.min(30, parseInt(req.body.secs, 10) || 0));
  const gap = row ? Math.ceil((t - row.ts) / 1000) + 2 : 30; // cannot count more time than has really passed
  const add = Math.min(asked, gap);
  const secs = Math.min(STUDY_SECS, (row ? row.secs : 0) + add);
  if (row) await db.run('UPDATE study SET secs = ?, ts = ? WHERE id = ?', [secs, t, id]);
  else await db.run('INSERT INTO study (id,student_id,homework_id,secs,ts) VALUES (?,?,?,?,?)', [id, req.student.id, hw.id, secs, t]);
  res.json({ secs, need: STUDY_SECS });
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
let EDGE = null; try { EDGE = require('msedge-tts'); } catch (e) { /* optional */ }
const EDGE_VOICES = { 'fr-FR': 'fr-FR-DeniseNeural', 'es-ES': 'es-ES-ElviraNeural' };
let edgeFails = 0, edgeOffUntil = 0;
function ttsOn() { return !!TTS_KEY || (!!EDGE && Date.now() > edgeOffUntil); }
const xmlEsc = (t) => t.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
async function edgeSynth(text, lang, slow) {
  const tts = new EDGE.MsEdgeTTS();
  await tts.setMetadata(EDGE_VOICES[lang], EDGE.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(xmlEsc(text), { rate: slow ? '-35%' : '-8%' });
  const chunks = [];
  await new Promise((ok, bad) => { const to = setTimeout(() => bad(new Error('timeout')), 15000); audioStream.on('data', (d) => chunks.push(d)); audioStream.on('close', () => { clearTimeout(to); ok(); }); audioStream.on('error', bad); });
  const buf = Buffer.concat(chunks); if (buf.length < 500) throw new Error('empty');
  return buf.toString('base64');
}
async function googleSynth(text, lang, slow) {
  const r = await fetch(TTS_URL + '?key=' + encodeURIComponent(TTS_KEY), { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: lang, name: TTS_VOICES[lang] }, audioConfig: { audioEncoding: 'MP3', speakingRate: slow ? 0.7 : 0.92 } }) });
  if (!r.ok) throw new Error('google ' + r.status);
  const j = await r.json(); if (!j.audioContent) throw new Error('empty'); return j.audioContent;
}
async function synth(text, lang, slow) {
  if (TTS_KEY) return googleSynth(text, lang, slow);
  try { const a = await edgeSynth(text, lang, slow); edgeFails = 0; return a; }
  catch (e) { if (++edgeFails >= 3) { edgeOffUntil = Date.now() + 600000; edgeFails = 0; } console.error('Edge TTS failed:', e.message); throw e; }
}
app.get('/api/tts', wrap(async (req, res) => {
  const u = (await auth(req, 'student')) || (await auth(req, 'teacher'));
  if (!u) return res.status(401).json({ error: 'Please sign in.' });
  if (!ttsOn()) return res.status(404).json({ error: 'Cloud voice is not set up.' });
  const lang = TTS_VOICES[req.query.lang] ? req.query.lang : 'fr-FR';
  const text = clean(req.query.text, 200), slow = req.query.slow === '1';
  if (!text) return res.status(400).json({ error: 'No text.' });
  if (limited('tts:' + u.id, 600, 3600000)) return res.status(429).json({ error: 'Too many audio requests.' });
  const engine = TTS_KEY ? TTS_VOICES[lang] : EDGE_VOICES[lang];
  const key = crypto.createHash('sha1').update([lang, engine, slow ? 's' : 'n', text].join('|')).digest('hex');
  let row = await db.get('SELECT mp3 FROM audio WHERE key = ?', [key]);
  if (!row) {
    let mp3; try { mp3 = await synth(text, lang, slow); } catch (e) { return res.status(502).json({ error: 'Voice service error.' }); }
    try { await db.run('INSERT INTO audio (key,mp3,created) VALUES (?,?,?)', [key, mp3, now()]); } catch (e) { /* cached by another request */ }
    row = { mp3 };
  }
  res.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=86400' });
  res.send(Buffer.from(row.mp3, 'base64'));
}));
// Teacher: pre-generate the voice for every word and sentence so lessons play instantly.
app.post('/api/library/warm', wrap(async (req, res) => {
  const t = await auth(req, 'teacher');
  if (!t) return res.status(401).json({ error: 'Please sign in.' });
  if (!ttsOn()) return res.status(404).json({ error: 'Cloud voice is not set up.' });
  const rows = await db.all('SELECT h.items FROM homework h JOIN classes c ON c.id = h.class_id WHERE c.teacher_id = ?', [t.id]);
  const texts = new Set();
  rows.forEach((r) => JSON.parse(r.items).forEach((i) => texts.add(clean(i.fr, 200))));
  let done = 0, skipped = 0;
  for (const text of texts) {
    const key = crypto.createHash('sha1').update(['fr-FR', TTS_KEY ? TTS_VOICES['fr-FR'] : EDGE_VOICES['fr-FR'], 'n', text].join('|')).digest('hex');
    if (await db.get('SELECT key FROM audio WHERE key = ?', [key])) { skipped++; continue; }
    if (done >= 150) break;
    let mp3; try { mp3 = await synth(text, 'fr-FR', false); } catch (e) { break; }
    try { await db.run('INSERT INTO audio (key,mp3,created) VALUES (?,?,?)', [key, mp3, now()]); } catch (e) {}
    done++;
  }
  res.json({ generated: done, already: skipped, remaining: Math.max(0, texts.size - done - skipped) });
}));

/* ---------- class tests: assigned to a class, hidden from everyone else ---------- */
let TESTBANK = [];
try { TESTBANK = JSON.parse(fs.readFileSync(path.join(__dirname, 'testbank', 'registry.json'), 'utf8')); } catch (e) { /* none */ }
const testById = (id) => TESTBANK.find((t) => t.id === id);
const pubTest = (t) => ({ id: t.id, title: t.title, marks: t.marks, skill: t.skill, desc: t.desc, folder: t.folder || '', sub: t.sub || '', kind: t.kind || 'test' });
const isGuided = (t) => !!t && t.kind === 'guided';
const SAFE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;
const ownTestAsg = async (req, id) => {
  const a = await db.get('SELECT * FROM test_assignments WHERE id = ?', [id]);
  if (!a) return null;
  const c = await ownClass(req, a.class_id);
  return c ? { a, c } : null;
};
// a student can only reach an assignment given to their own class, once it has started
async function studentTestAsg(student, id) {
  const a = await db.get('SELECT * FROM test_assignments WHERE id = ? AND class_id = ?', [id, student.class_id]);
  return a && a.start_at <= now() && testById(a.test_id) ? a : null;
}
const nz = (v, d) => (Number.isFinite(+v) ? +v : d);

app.get('/api/tests', teacherOnly(async (req, res) => {
  const classes = await db.all('SELECT id,name FROM classes WHERE teacher_id = ? ORDER BY created', [req.teacher.id]);
  const out = [];
  for (const c of classes) {
    const asg = await db.all('SELECT * FROM test_assignments WHERE class_id = ? ORDER BY start_at DESC', [c.id]);
    if (!asg.length) continue;
    const n = (await db.get('SELECT COUNT(*) AS n FROM students WHERE class_id = ?', [c.id])).n;
    for (const a of asg) {
      const t = testById(a.test_id); if (!t) continue;
      const rs = await db.all('SELECT status, score FROM test_results WHERE assignment_id = ?', [a.id]);
      const done = rs.filter((r) => r.status === 'done');
      out.push({ id: a.id, test_id: a.test_id, title: t.title, marks: t.marks, folder: t.folder || '', sub: t.sub || '', kind: t.kind || 'test', released: (await db.get('SELECT COUNT(*) AS n FROM test_releases WHERE assignment_id = ?', [a.id])).n, class_id: c.id, class_name: c.name, start_at: a.start_at, due_at: a.due_at, lock_on: !!a.lock_on, max_leaves: a.max_leaves,
        students: n, started: rs.length, done: done.length, avg: done.length ? Math.round(done.reduce((x, r) => x + r.score, 0) / done.length * 10) / 10 : null });
    }
  }
  res.json({ tests: TESTBANK.map(pubTest), classes, assignments: out });
}));
app.post('/api/tests/assign', teacherOnly(async (req, res) => {
  const b = req.body || {};
  const t = testById(String(b.test_id || ''));
  if (!t) return res.status(400).json({ error: 'Choose a test.' });
  const cids = [...new Set((Array.isArray(b.class_ids) ? b.class_ids : []).map(String))];
  const classes = [];
  for (const id of cids) { const c = await ownClass(req, id); if (c) classes.push(c); }
  if (!classes.length) return res.status(400).json({ error: 'Choose at least one class.' });
  const start = parseInt(b.start_at, 10) || now();
  const due = b.due_at ? parseInt(b.due_at, 10) : null;
  if (due && due <= start) return res.status(400).json({ error: 'The closing time must be after the start time.' });
  const lock = b.lock_on === false ? 0 : 1;
  const max = Math.min(10, Math.max(1, parseInt(b.max_leaves, 10) || 3));
  let made = 0, skipped = [];
  for (const c of classes) {
    if (await db.get('SELECT id FROM test_assignments WHERE test_id = ? AND class_id = ?', [t.id, c.id])) { skipped.push(c.name); continue; }
    await db.run('INSERT INTO test_assignments (id,test_id,class_id,start_at,due_at,lock_on,max_leaves,created) VALUES (?,?,?,?,?,?,?,?)', [uid(), t.id, c.id, start, due, lock, max, now()]);
    made++;
  }
  if (!made) return res.status(400).json({ error: 'This test is already assigned to ' + skipped.join(', ') + '. Remove that assignment first if you want to set it again.' });
  res.json({ ok: true, made, skipped });
}));
app.put('/api/tests/assignments/:id', teacherOnly(async (req, res) => {
  const o = await ownTestAsg(req, req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found.' });
  const b = req.body || {};
  const start = parseInt(b.start_at, 10) || o.a.start_at, due = b.due_at ? parseInt(b.due_at, 10) : null;
  if (due && due <= start) return res.status(400).json({ error: 'The closing time must be after the start time.' });
  await db.run('UPDATE test_assignments SET start_at = ?, due_at = ?, lock_on = ?, max_leaves = ? WHERE id = ?',
    [start, due, b.lock_on === false ? 0 : 1, Math.min(10, Math.max(1, parseInt(b.max_leaves, 10) || o.a.max_leaves)), o.a.id]);
  res.json({ ok: true });
}));
app.delete('/api/tests/assignments/:id', teacherOnly(async (req, res) => {
  const o = await ownTestAsg(req, req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found.' });
  await db.run('DELETE FROM test_results WHERE assignment_id = ?', [o.a.id]);
  await db.run('DELETE FROM test_assignments WHERE id = ?', [o.a.id]);
  res.json({ ok: true });
}));
app.get('/api/tests/assignments/:id/results', teacherOnly(async (req, res) => {
  const o = await ownTestAsg(req, req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found.' });
  const t = testById(o.a.test_id);
  const students = await db.all('SELECT id,name FROM students WHERE class_id = ? ORDER BY name', [o.c.id]);
  const rs = await db.all('SELECT id,student_id,status,started_at,finished_at,score,out_of,percent,secs,leaves,away_secs,auto,fix_done,fix_total FROM test_results WHERE assignment_id = ?', [o.a.id]);
  const by = {}; rs.forEach((r) => { by[r.student_id] = r; });
  const rel = new Set((await db.all('SELECT student_id FROM test_releases WHERE assignment_id = ?', [o.a.id])).map((x) => x.student_id));
  const subs = {}; (await db.all('SELECT student_id, submitted_at FROM guided_subs WHERE assignment_id = ?', [o.a.id])).forEach((x) => { subs[x.student_id] = x.submitted_at ? Number(x.submitted_at) : 0; });
  res.json({
    assignment: { id: o.a.id, start_at: o.a.start_at, due_at: o.a.due_at, lock_on: !!o.a.lock_on, max_leaves: o.a.max_leaves },
    test: pubTest(t), cls: { id: o.c.id, name: o.c.name },
    students: students.map((s) => { const r = by[s.id]; return { id: s.id, name: s.name, released: rel.has(s.id), has_draft: s.id in subs, submitted_at: subs[s.id] || null, result_id: r ? r.id : null, status: r ? r.status : 'none',
      score: r ? r.score : null, out_of: r ? r.out_of : null, percent: r ? r.percent : null, secs: r ? r.secs : null, leaves: r ? r.leaves : 0, away: r ? r.away_secs : 0, auto: r ? !!r.auto : false,
      fix_done: r ? r.fix_done : null, fix_total: r ? r.fix_total : null, finished_at: r ? r.finished_at : null, started_at: r ? r.started_at : null }; })
  });
}));
app.get('/api/tests/results/:rid', teacherOnly(async (req, res) => {
  const r = await db.get('SELECT * FROM test_results WHERE id = ?', [req.params.rid]);
  const o = r && await ownTestAsg(req, r.assignment_id);
  if (!o) return res.status(404).json({ error: 'Not found.' });
  const st = await db.get('SELECT name FROM students WHERE id = ?', [r.student_id]);
  let report = null; try { report = JSON.parse(r.report || 'null'); } catch (e) { /* none */ }
  res.json({ student: st ? st.name : '', score: r.score, out_of: r.out_of, report });
}));
app.post('/api/tests/results/:rid/reset', teacherOnly(async (req, res) => {
  const r = await db.get('SELECT * FROM test_results WHERE id = ?', [req.params.rid]);
  const o = r && await ownTestAsg(req, r.assignment_id);
  if (!o) return res.status(404).json({ error: 'Not found.' });
  await db.run('DELETE FROM test_results WHERE id = ?', [r.id]);
  res.json({ ok: true });
}));


/* ---------- guided papers: a study page whose answers the teacher releases student by student ---------- */
app.post('/api/tests/assignments/:id/release', teacherOnly(async (req, res) => {
  const o = await ownTestAsg(req, req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found.' });
  if (!isGuided(testById(o.a.test_id))) return res.status(400).json({ error: 'This test has no answer release.' });
  const b = req.body || {}, on = b.on !== false;
  const mine = (await db.all('SELECT id FROM students WHERE class_id = ?', [o.c.id])).map((x) => x.id);
  const ids = b.all ? mine : [String(b.student_id || '')].filter((x) => mine.includes(x));
  if (!ids.length) return res.status(400).json({ error: 'Choose a student.' });
  for (const sid of ids) {
    await db.run('DELETE FROM test_releases WHERE assignment_id = ? AND student_id = ?', [o.a.id, sid]);
    if (on) await db.run('INSERT INTO test_releases (assignment_id,student_id,released_at) VALUES (?,?,?)', [o.a.id, sid, now()]);
  }
  res.json({ ok: true, changed: ids.length });
}));
const answersFile = (t) => path.join(__dirname, 'testbank', t.id + '.answers.json');
app.get('/api/student/tests/:aid/answers', studentOnly(async (req, res) => {
  const a = await studentTestAsg(req.student, req.params.aid);
  const t = a && testById(a.test_id);
  if (!isGuided(t)) return res.status(404).json({ error: 'Not found.' });
  const rel = await db.get('SELECT 1 AS x FROM test_releases WHERE assignment_id = ? AND student_id = ?', [a.id, req.student.id]);
  res.set('Cache-Control', 'no-store');
  if (!rel) return res.json({ released: false });
  res.json({ released: true, answers: JSON.parse(fs.readFileSync(answersFile(t), 'utf8')) });
}));
const cleanAnswers = (b) => {
  const g = {}, c = {};
  const src = b && typeof b === 'object' ? b : {};
  Object.entries(src.g || {}).slice(0, 120).forEach(([k, v]) => { if (SAFE_FILE.test(k) && Number.isInteger(v) && v >= 0 && v < 12) g[k] = v; });
  Object.entries(src.c || {}).slice(0, 40).forEach(([k, v]) => { if (SAFE_FILE.test(k) && typeof v === 'string') c[k] = v.slice(0, 2000); });
  return { g, c };
};
app.get('/api/student/tests/:aid/mine', studentOnly(async (req, res) => {
  const a = await studentTestAsg(req.student, req.params.aid);
  if (!isGuided(a && testById(a.test_id))) return res.status(404).json({ error: 'Not found.' });
  const r = await db.get('SELECT answers, submitted_at FROM guided_subs WHERE assignment_id = ? AND student_id = ?', [a.id, req.student.id]);
  res.set('Cache-Control', 'no-store');
  let answers = null; try { answers = r ? JSON.parse(r.answers) : null; } catch (e) { /* none */ }
  res.json({ answers, submitted_at: r && r.submitted_at ? Number(r.submitted_at) : null });
}));
app.post('/api/student/tests/:aid/mine', studentOnly(async (req, res) => {
  const a = await studentTestAsg(req.student, req.params.aid);
  if (!isGuided(a && testById(a.test_id))) return res.status(404).json({ error: 'Not found.' });
  const rel = await db.get('SELECT 1 AS x FROM test_releases WHERE assignment_id = ? AND student_id = ?', [a.id, req.student.id]);
  if (rel) return res.status(403).json({ error: 'Your teacher has already unlocked the answers, so your answers are locked.' });
  const ans = JSON.stringify(cleanAnswers((req.body || {}).answers));
  const final = !!(req.body || {}).submit;
  const old = await db.get('SELECT submitted_at FROM guided_subs WHERE assignment_id = ? AND student_id = ?', [a.id, req.student.id]);
  const subAt = final ? now() : (old && old.submitted_at ? Number(old.submitted_at) : null);
  await db.run('DELETE FROM guided_subs WHERE assignment_id = ? AND student_id = ?', [a.id, req.student.id]);
  await db.run('INSERT INTO guided_subs (assignment_id,student_id,answers,submitted_at,updated_at) VALUES (?,?,?,?,?)', [a.id, req.student.id, ans, subAt, now()]);
  res.json({ ok: true, submitted_at: subAt });
}));
app.get('/api/tests/assignments/:id/submission/:sid', teacherOnly(async (req, res) => {
  const o = await ownTestAsg(req, req.params.id);
  const t = o && testById(o.a.test_id);
  if (!isGuided(t)) return res.status(404).json({ error: 'Not found.' });
  const st = await db.get('SELECT id,name FROM students WHERE id = ? AND class_id = ?', [req.params.sid, o.c.id]);
  if (!st) return res.status(404).json({ error: 'Not found.' });
  const r = await db.get('SELECT answers, submitted_at FROM guided_subs WHERE assignment_id = ? AND student_id = ?', [o.a.id, st.id]);
  let answers = null; try { answers = r ? JSON.parse(r.answers) : null; } catch (e) { /* none */ }
  res.set('Cache-Control', 'no-store');
  res.json({ student: st.name, answers, submitted_at: r && r.submitted_at ? Number(r.submitted_at) : null, key: JSON.parse(fs.readFileSync(answersFile(t), 'utf8')) });
}));
app.get('/tests/review/:aid/:sid', wrap(async (req, res) => {
  const tc = await auth(req, 'teacher');
  if (!tc) return res.redirect('/');
  req.teacher = tc;
  const o = await ownTestAsg(req, req.params.aid);
  const t = o && testById(o.a.test_id);
  if (!isGuided(t)) return res.redirect('/#/t/tests');
  const st = await db.get('SELECT id,name FROM students WHERE id = ? AND class_id = ?', [req.params.sid, o.c.id]);
  if (!st) return res.redirect('/#/t/tests');
  await sendTest(res, t, { mode: 'review', assignment: o.a.id, sid: st.id, sname: st.name, kind: 'guided', title: t.title + ' · ' + st.name, assetBase: '/tests/asset-preview/' + t.id + '/' });
}));
app.get('/api/tests/answers/:tid', teacherOnly(async (req, res) => {
  const t = testById(req.params.tid);
  if (!isGuided(t)) return res.status(404).json({ error: 'Not found.' });
  res.set('Cache-Control', 'no-store');
  res.json({ released: true, answers: JSON.parse(fs.readFileSync(answersFile(t), 'utf8')) });
}));

app.get('/api/student/tests', studentOnly(async (req, res) => {
  const asg = await db.all('SELECT * FROM test_assignments WHERE class_id = ? AND start_at <= ? ORDER BY start_at DESC', [req.student.class_id, now()]);
  const out = [];
  for (const a of asg) {
    const t = testById(a.test_id); if (!t) continue;
    const r = await db.get('SELECT status,score,out_of,percent FROM test_results WHERE assignment_id = ? AND student_id = ?', [a.id, req.student.id]);
    const closed = !!(a.due_at && a.due_at < now());
    if (isGuided(t)) {
      const rel = await db.get('SELECT 1 AS x FROM test_releases WHERE assignment_id = ? AND student_id = ?', [a.id, req.student.id]);
      out.push({ id: a.id, title: t.title, marks: t.marks, skill: t.skill, desc: t.desc, folder: t.folder || '', sub: t.sub || '', kind: 'guided', due_at: a.due_at, closed: false, status: 'open', released: !!rel });
      continue;
    }
    out.push({ id: a.id, title: t.title, folder: t.folder || '', sub: t.sub || '', kind: 'test', marks: t.marks, skill: t.skill, desc: t.desc, due_at: a.due_at, closed,
      status: r ? r.status : (closed ? 'missed' : 'todo'), score: r && r.status === 'done' ? r.score : null, out_of: r ? r.out_of : null, percent: r ? r.percent : null });
  }
  res.json({ tests: out });
}));
app.post('/api/student/tests/:aid/start', studentOnly(async (req, res) => {
  const a = await studentTestAsg(req.student, req.params.aid);
  if (!a) return res.status(404).json({ error: 'Test not found.' });
  const r = await db.get('SELECT id,status FROM test_results WHERE assignment_id = ? AND student_id = ?', [a.id, req.student.id]);
  if (r && r.status === 'done') return res.status(409).json({ error: 'You have already finished this test.' });
  if (r) return res.status(409).json({ error: 'You already started this test earlier. Ask your teacher to reset it so you can take it again.' });
  if (a.due_at && a.due_at < now()) return res.status(409).json({ error: 'This test is closed. Ask your teacher.' });
  try {
    await db.run('INSERT INTO test_results (id,assignment_id,student_id,status,started_at,leaves) VALUES (?,?,?,?,?,0)', [uid(), a.id, req.student.id, 'started', now()]);
  } catch (e) { return res.status(409).json({ error: 'You already started this test earlier. Ask your teacher to reset it so you can take it again.' }); }
  res.json({ ok: true });
}));
app.post('/api/student/tests/:aid/event', studentOnly(async (req, res) => {
  const a = await studentTestAsg(req.student, req.params.aid);
  if (!a) return res.status(404).json({ error: 'Test not found.' });
  const n = Math.min(50, Math.max(0, Math.round(nz(req.body.leaves, 0))));
  await db.run("UPDATE test_results SET leaves = ? WHERE assignment_id = ? AND student_id = ? AND status = 'started' AND leaves < ?", [n, a.id, req.student.id, n]);
  res.json({ ok: true });
}));
app.post('/api/student/tests/:aid/submit', studentOnly(async (req, res) => {
  const a = await studentTestAsg(req.student, req.params.aid);
  if (!a) return res.status(404).json({ error: 'Test not found.' });
  const t = testById(a.test_id);
  const r = await db.get('SELECT id,status,started_at,leaves FROM test_results WHERE assignment_id = ? AND student_id = ?', [a.id, req.student.id]);
  if (!r) return res.status(400).json({ error: 'Please start the test first.' });
  if (r.status === 'done') return res.status(409).json({ error: 'This test was already submitted.' });
  const rep = req.body && req.body.report;
  if (!rep || !Array.isArray(rep.questions) || !rep.questions.length || rep.questions.length > 60) return res.status(400).json({ error: 'The result could not be read. Please try again.' });
  // the score is re-added from the individual marks, so it cannot disagree with the answers
  const qs = rep.questions.map((q) => ({ n: Math.round(nz(q.n, 0)), section: clean(q.section, 2), prompt: clean(q.prompt, 200), given: clean(q.given, 300), ans: clean(q.ans, 300),
    marks: [0, 0.5, 1].includes(+q.marks) ? +q.marks : 0, attempts: Math.min(20, Math.max(0, Math.round(nz(q.attempts, 0)))) }));
  const score = qs.reduce((n, q) => n + q.marks, 0);
  const out = t.marks;
  const secs = Math.max(1, Math.round((now() - r.started_at) / 1000));
  const leaves = Math.max(r.leaves, Math.min(50, Math.round(nz(rep.tabLeaves, 0))));
  const fix = rep.fixIt || {};
  const clientSections = Array.isArray(rep.sections) ? rep.sections.slice(0, 12).map((s) => ({ id: clean(s.id, 2), got: nz(s.got, 0), max: nz(s.max, 0) })) : [];
  const report = JSON.stringify({ questions: qs, sections: clientSections, late: !!(a.due_at && a.due_at < now()) });
  await db.run("UPDATE test_results SET status='done', finished_at=?, score=?, out_of=?, percent=?, secs=?, leaves=?, away_secs=?, auto=?, fix_done=?, fix_total=?, report=? WHERE id = ?",
    [now(), score, out, Math.round(score / out * 100), secs, leaves, Math.min(86400, Math.max(0, Math.round(nz(rep.secondsAway, 0)))), rep.autoSubmitted ? 1 : 0,
      Math.max(0, Math.round(nz(fix.done, 0))), Math.max(0, Math.round(nz(fix.total, 0))), report, r.id]);
  res.json({ ok: true, score });
}));
app.post('/api/student/tests/:aid/fix', studentOnly(async (req, res) => {
  const a = await studentTestAsg(req.student, req.params.aid);
  if (!a) return res.status(404).json({ error: 'Test not found.' });
  await db.run("UPDATE test_results SET fix_done = ?, fix_total = ? WHERE assignment_id = ? AND student_id = ? AND status = 'done'",
    [Math.max(0, Math.round(nz(req.body.done, 0))), Math.max(0, Math.round(nz(req.body.total, 0))), a.id, req.student.id]);
  res.json({ ok: true });
}));

// The test pages. Not public files: a student only gets the page for a test assigned to their class.
async function sendTest(res, t, site) {
  let html = fs.readFileSync(path.join(__dirname, 'testbank', t.file), 'utf8');
  html = html.replace('/*__SITE__*/null', () => JSON.stringify(site).replace(/</g, '\\u003c'));
  res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Content-Type': 'text/html; charset=utf-8' });
  res.send(html);
}
app.get('/tests/run/:aid', wrap(async (req, res) => {
  const st = await auth(req, 'student');
  if (!st) return res.redirect('/');
  const a = await studentTestAsg(st, req.params.aid);
  if (!a) return res.redirect('/#/s');
  const c = await db.get('SELECT name FROM classes WHERE id = ?', [st.class_id]);
  const tt = testById(a.test_id);
  await sendTest(res, tt, { mode: 'student', assignment: a.id, title: tt.title, kind: tt.kind || 'test', assetBase: '/tests/asset/' + a.id + '/', student: { name: st.name, cls: c ? c.name : '' }, lock: { on: !!a.lock_on, max: a.max_leaves } });
}));
app.get('/tests/preview/:tid', wrap(async (req, res) => {
  const t = await auth(req, 'teacher');
  if (!t) return res.redirect('/');
  const test = testById(req.params.tid);
  if (!test) return res.redirect('/#/t/tests');
  await sendTest(res, test, { mode: 'preview', test: test.id, kind: test.kind || 'test', title: test.title, assetBase: '/tests/asset-preview/' + test.id + '/' });
}));
// Files that belong to a guided paper (idea maps, videos). Only a signed-in teacher, or a student whose class was given that paper.
const sendAsset = (res, t, file) => {
  if (!isGuided(t) || !t.assets || !SAFE_FILE.test(file)) return res.status(404).end();
  const fp = path.join(__dirname, 'testbank', 'assets', t.assets, file);
  if (!fp.startsWith(path.join(__dirname, 'testbank', 'assets', t.assets) + path.sep) || !fs.existsSync(fp)) return res.status(404).end();
  res.set({ 'Cache-Control': 'private, max-age=3600', 'X-Robots-Tag': 'noindex' });
  res.sendFile(fp);
};
app.get('/tests/asset/:aid/:file', wrap(async (req, res) => {
  const st = await auth(req, 'student');
  if (!st) return res.status(403).end();
  const a = await studentTestAsg(st, req.params.aid);
  if (!a) return res.status(404).end();
  sendAsset(res, testById(a.test_id), req.params.file);
}));
app.get('/tests/asset-preview/:tid/:file', wrap(async (req, res) => {
  if (!(await auth(req, 'teacher'))) return res.status(403).end();
  sendAsset(res, testById(req.params.tid), req.params.file);
}));

/* ---------- static ---------- */
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
// Private resources: a signed-in teacher, or a student whose class has been assigned that resource.
app.use('/resources/teacher', (req, res, next) => {
  (async () => {
    if (await auth(req, 'teacher')) return true;
    const st = await auth(req, 'student');
    if (!st) return false;
    const seg = req.path.split('/').filter(Boolean)[0];
    if (!seg) return false;
    const mine = await myAssignments(st);
    if (!mine.length) return false;
    const ids = [...new Set(mine.map((a) => a.homework_id))];
    const hws = await db.all('SELECT extra FROM homework WHERE id IN (' + inList(ids) + ')', ids);
    return hws.some((h) => (h.extra || '').includes('/resources/teacher/' + seg + '/'));
  })().then((ok) => { if (!ok) return res.redirect('/'); res.set('Cache-Control', 'private, no-cache'); next(); }).catch(next);
}, express.static(path.join(__dirname, 'private')));
app.use(express.static(path.join(__dirname, 'public'), { etag: true, setHeaders: (res, f) => { if (/\.(js|css|html)$/.test(f)) res.set('Cache-Control', 'no-cache'); } }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

open().then(async (d) => {
  db = d;
  await seedLessons();
  app.listen(PORT, () => console.log(`French with Haresh running on port ${PORT} (${db.kind})`));
}).catch((e) => { console.error('Could not start:', e); process.exit(1); });
