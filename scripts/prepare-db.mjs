import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync, backup } from "node:sqlite";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(path.join(root, "frontend/.env"));
} catch {}
const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:"))
  throw Error(
    "This migration runner is for SQLite. Use the documented PostgreSQL migration rehearsal before switching providers.",
  );
const raw = url.slice(5);
const dbFile = path.isAbsolute(raw)
  ? raw
  : path.resolve(root, "frontend/prisma", raw);
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const exists = fs.existsSync(dbFile) && fs.statSync(dbFile).size > 0;
const db = new DatabaseSync(dbFile);
db.exec("PRAGMA busy_timeout=10000; PRAGMA foreign_keys=ON;");
if (exists) {
  const dir = path.join(root, "backups");
  fs.mkdirSync(dir, { recursive: true });
  await backup(db, path.join(dir, "before-security-" + Date.now() + ".db"));
  console.log("Database snapshot saved in backups.");
}
db.exec(
  "CREATE TABLE IF NOT EXISTS _FamVaultMigration (id TEXT PRIMARY KEY, appliedAt TEXT NOT NULL)",
);
for (const name of fs
  .readdirSync(path.join(root, "migrations"))
  .filter((n) => n.endsWith(".sql"))
  .sort()) {
  if (db.prepare("SELECT id FROM _FamVaultMigration WHERE id=?").get(name))
    continue;
  if (name.startsWith("001") && exists) {
    db.prepare("INSERT INTO _FamVaultMigration VALUES (?,?)").run(
      name,
      new Date().toISOString(),
    );
    continue;
  }
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(fs.readFileSync(path.join(root, "migrations", name), "utf8"));
    db.prepare("INSERT INTO _FamVaultMigration VALUES (?,?)").run(
      name,
      new Date().toISOString(),
    );
    db.exec("COMMIT");
    console.log("Applied", name);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
db.close();
