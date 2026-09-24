import path from "node:path";
import fs from "node:fs";
import { DatabaseSync, backup } from "node:sqlite";
process.loadEnvFile("frontend/.env");
const raw = process.env.DATABASE_URL?.slice(5);
if (!process.env.DATABASE_URL?.startsWith("file:") || !raw)
  throw Error("Use database-native backups for PostgreSQL");
const db = new DatabaseSync(path.resolve("frontend/prisma", raw));
const target = path.resolve(
  "backups",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
fs.mkdirSync(target, { recursive: true });
await backup(db, path.join(target, "database.db"));
db.close();
if (
  process.env.PRIVATE_UPLOAD_DIR &&
  fs.existsSync(process.env.PRIVATE_UPLOAD_DIR)
)
  fs.cpSync(process.env.PRIVATE_UPLOAD_DIR, path.join(target, "media"), {
    recursive: true,
  });
console.log("Backup created:", target);
