import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DB_FILE_PATH = path.join(
  process.cwd(),
  "data",
  "sources",
  "static",
  "movielens.db"
);

let dbInstance: DatabaseSync | null = null;

/**
 * Mengembalikan koneksi singleton SQLite dalam mode Read-Only.
 */
export function getSqliteDatabase(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_FILE_PATH, { readOnly: true });
  }
  return dbInstance;
}
