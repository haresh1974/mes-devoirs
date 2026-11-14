// Tiny database layer. Uses Postgres when DATABASE_URL is set (production),
// otherwise a local SQLite file (development). All SQL is written to work on both.
const path = require('path');
const fs = require('fs');

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    salt TEXT NOT NULL, hash TEXT NOT NULL, created BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, kind TEXT NOT NULL, user_id TEXT NOT NULL, created BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, name TEXT NOT NULL, language TEXT NOT NULL,
    tiers TEXT NOT NULL, code TEXT UNIQUE NOT NULL, created BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY, class_id TEXT NOT NULL, name TEXT NOT NULL, pin TEXT NOT NULL,
    created BIGINT NOT NULL, last_active BIGINT)`,
  `CREATE TABLE IF NOT EXISTS homework (
    id TEXT PRIMARY KEY, class_id TEXT NOT NULL, title TEXT NOT NULL, topic TEXT NOT NULL,
    tier TEXT NOT NULL, due_at BIGINT, free_order INTEGER NOT NULL, exercises TEXT NOT NULL,
    items TEXT NOT NULL, extra TEXT, created BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY, student_id TEXT NOT NULL, homework_id TEXT NOT NULL, lesson TEXT NOT NULL,
    score INTEGER NOT NULL, total INTEGER NOT NULL, secs INTEGER NOT NULL, coins INTEGER NOT NULL, ts BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY, student_id TEXT NOT NULL, homework_id TEXT, day TEXT NOT NULL, secs INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY, homework_id TEXT NOT NULL, class_id TEXT NOT NULL, start_at BIGINT NOT NULL,
    due_at BIGINT, audience TEXT NOT NULL, student_ids TEXT, created BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`,
  `CREATE TABLE IF NOT EXISTS notices (id TEXT PRIMARY KEY, class_id TEXT, message TEXT, created BIGINT)`,
  `CREATE INDEX IF NOT EXISTS i_notice_class ON notices(class_id)`,
  `CREATE TABLE IF NOT EXISTS audio (
    key TEXT PRIMARY KEY, mp3 TEXT NOT NULL, created BIGINT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS i_students_class ON students(class_id)`,
  `CREATE INDEX IF NOT EXISTS i_assign_class ON assignments(class_id)`,
  `CREATE INDEX IF NOT EXISTS i_assign_hw ON assignments(homework_id)`,
  `CREATE INDEX IF NOT EXISTS i_attempts_hw ON attempts(homework_id)`,
  `CREATE INDEX IF NOT EXISTS i_activity_student ON activity(student_id)`
];

async function open() {
  if (process.env.DATABASE_URL) {
    const pg = require('pg');
    const { Pool } = pg;
    pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // BIGINT -> number
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false }
    });
    const conv = (sql) => { let i = 0; return sql.replace(/\?/g, () => '$' + (++i)); };
    const db = {
      kind: 'postgres',
      all: async (sql, p = []) => (await pool.query(conv(sql), p)).rows,
      get: async (sql, p = []) => (await pool.query(conv(sql), p)).rows[0],
      run: async (sql, p = []) => { await pool.query(conv(sql), p); }
    };
    for (const s of SCHEMA) await db.run(s);
    await upgrade(db);
    return db;
  }
  const Database = require('better-sqlite3');
  const dir = process.env.DATA_DIR || path.join(__dirname, 'data');
  fs.mkdirSync(dir, { recursive: true });
  const sq = new Database(path.join(dir, 'mondevoir.db'));
  sq.pragma('journal_mode = WAL');
  const db = {
    kind: 'sqlite',
    all: async (sql, p = []) => sq.prepare(sql).all(...p),
    get: async (sql, p = []) => sq.prepare(sql).get(...p),
    run: async (sql, p = []) => { sq.prepare(sql).run(...p); }
  };
  for (const s of SCHEMA) await db.run(s);
  await upgrade(db);
  return db;
}

/* Small upgrades for databases created by earlier versions. Safe to run on every start. */
async function upgrade(db) {
  for (const col of ['extra TEXT', 'folder TEXT']) {
    try { await db.run('ALTER TABLE homework ADD COLUMN ' + col); } catch (e) { /* already there */ }
  }
  // Homework that was already given to a class (it has a due date) becomes an assignment to the whole class, once.
  const done = await db.get("SELECT v FROM meta WHERE k = 'assign_migrated'");
  if (!done) {
    const old = await db.all('SELECT id, class_id, due_at, created FROM homework WHERE due_at IS NOT NULL');
    for (const h of old) {
      await db.run('INSERT INTO assignments (id,homework_id,class_id,start_at,due_at,audience,student_ids,created) VALUES (?,?,?,?,?,?,?,?)',
        [require('crypto').randomBytes(9).toString('hex'), h.id, h.class_id, h.created, h.due_at, 'all', null, Date.now()]);
    }
    await db.run("INSERT INTO meta (k,v) VALUES ('assign_migrated','1')");
  }
}

module.exports = { open };
