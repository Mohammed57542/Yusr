import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function ensureMigrationTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);
}

export async function runMigrations(db) {
  ensureMigrationTable(db);

  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const appliedRows = db.prepare("SELECT name FROM schema_migrations ORDER BY name").all();
  const applied = appliedRows.map(r => r.name);

  for (const file of files) {
    if (applied.includes(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`[Migration] Running: ${file}`);
    try {
      db.exec('BEGIN');
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, datetime('now'))").run(file);
      db.exec('COMMIT');
      console.log(`[Migration] Done: ${file}`);
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch {}
      console.error(`[Migration] FAILED: ${file}`, err.message);
      throw err;
    }
  }
  console.log(`[Migration] All migrations complete (${files.length} total)`);
}
