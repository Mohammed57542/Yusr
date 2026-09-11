import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'yusr.db');

const db = new DatabaseSync(dbPath);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
`);

// ─── Prepared statement cache ───
const stmtCache = new Map();

function prepare(sql) {
  if (!stmtCache.has(sql)) {
    stmtCache.set(sql, db.prepare(sql));
  }
  return stmtCache.get(sql);
}

// ─── SQLite adapter — same API as the old db.js ───
const adapter = {
  db,
  prepare,
  exec(sql) {
    return db.exec(sql);
  },
  pragma(sql) {
    return db.pragma(sql);
  },
  transaction(fn) {
    return db.transaction(fn)();
  },
  // Duck-typed `run` helper: executes SQL directly (no prepare needed)
  run(sql, ...params) {
    if (params.length === 0) {
      db.exec(sql);
      return { changes: 0 };
    }
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return result;
  },
  get(sql, ...params) {
    const stmt = db.prepare(sql);
    return stmt.get(...params);
  },
  all(sql, ...params) {
    const stmt = db.prepare(sql);
    if (params.length === 0) return stmt.all();
    return stmt.all(...params);
  },
  // PRAGMA table_info helper (used for migration checks)
  tableInfo(tableName) {
    try {
      return db.prepare(`PRAGMA table_info(${tableName})`).all();
    } catch {
      return [];
    }
  },
  close() {
    stmtCache.clear();
    db.close();
  },
};

export default adapter;
