import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const ROOT_DIR = process.cwd();
const STATIC_DIR = path.join(ROOT_DIR, "data", "sources", "static");
const DATASET_DIR = path.resolve(ROOT_DIR, "..", "..", "dataset", "ml-100k");
const DB_PATH = path.join(STATIC_DIR, "movielens.db");

fs.mkdirSync(STATIC_DIR, { recursive: true });

// Salin u.item dan u.user dari dataset/ml-100k jika tersedia
const filesToCopy = [
  "u.item",
  "u.user",
  "u1.base",
  "u1.test",
  "u2.base",
  "u2.test",
  "u3.base",
  "u3.test",
  "u4.base",
  "u4.test",
  "u5.base",
  "u5.test",
];

for (const fname of filesToCopy) {
  const src = path.join(DATASET_DIR, fname);
  const dest = path.join(STATIC_DIR, fname);
  if (fs.existsSync(src) && src !== dest) {
    fs.copyFileSync(src, dest);
  }
}

if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = OFF;
  PRAGMA synchronous = OFF;

  CREATE TABLE movies (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    link TEXT
  );

  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    age INTEGER NOT NULL,
    occupation TEXT NOT NULL
  );

  CREATE TABLE ratings_train (
    fold INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    PRIMARY KEY (fold, user_id, item_id)
  );

  CREATE TABLE ratings_test (
    fold INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    PRIMARY KEY (fold, user_id, item_id)
  );

  CREATE INDEX idx_ratings_test_fold_user ON ratings_test (fold, user_id);

  CREATE TABLE user_clusters (
    fold INTEGER NOT NULL,
    k INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    cluster INTEGER NOT NULL,
    PRIMARY KEY (fold, k, user_id)
  );

  CREATE TABLE item_clusters (
    fold INTEGER NOT NULL,
    k INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    cluster INTEGER NOT NULL,
    PRIMARY KEY (fold, k, item_id)
  );
`);

// 1. Seed movies (u.item)
const rawItems = fs.readFileSync(path.join(STATIC_DIR, "u.item"), "latin1");
const insertMovie = db.prepare(
  "INSERT INTO movies (id, title, link) VALUES (?, ?, ?)"
);
db.exec("BEGIN TRANSACTION");
for (const line of rawItems.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const parts = trimmed.split("|");
  const id = Number.parseInt(parts[0], 10);
  const title = parts[1] ?? "";
  const link = parts[4] ?? "";
  if (!Number.isNaN(id)) {
    insertMovie.run(id, title, link);
  }
}
db.exec("COMMIT");

// 2. Seed users (u.user)
const rawUsers = fs.readFileSync(path.join(STATIC_DIR, "u.user"), "utf-8");
const insertUser = db.prepare(
  "INSERT INTO users (id, age, occupation) VALUES (?, ?, ?)"
);
db.exec("BEGIN TRANSACTION");
for (const line of rawUsers.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const parts = trimmed.split("|");
  const id = Number.parseInt(parts[0], 10);
  const age = Number.parseInt(parts[1], 10);
  const occupation = parts[3] ?? "";
  if (!Number.isNaN(id) && !Number.isNaN(age)) {
    insertUser.run(id, age, occupation);
  }
}
db.exec("COMMIT");

// 3. Seed ratings_train & ratings_test untuk fold 1..5
const insertTrain = db.prepare(
  "INSERT OR REPLACE INTO ratings_train (fold, user_id, item_id, rating) VALUES (?, ?, ?, ?)"
);
const insertTest = db.prepare(
  "INSERT OR REPLACE INTO ratings_test (fold, user_id, item_id, rating) VALUES (?, ?, ?, ?)"
);

for (let fold = 1; fold <= 5; fold++) {
  const trainPath = path.join(STATIC_DIR, `u${fold}.base`);
  if (fs.existsSync(trainPath)) {
    const rawTrain = fs.readFileSync(trainPath, "utf-8");
    db.exec("BEGIN TRANSACTION");
    for (const line of rawTrain.split(/\r?\n/)) {
      if (!line) continue;
      const parts = line.split("\t");
      if (parts.length >= 3) {
        insertTrain.run(
          fold,
          Number.parseInt(parts[0], 10),
          Number.parseInt(parts[1], 10),
          Number.parseInt(parts[2], 10)
        );
      }
    }
    db.exec("COMMIT");
  }

  const testPath = path.join(STATIC_DIR, `u${fold}.test`);
  if (fs.existsSync(testPath)) {
    const rawTest = fs.readFileSync(testPath, "utf-8");
    db.exec("BEGIN TRANSACTION");
    for (const line of rawTest.split(/\r?\n/)) {
      if (!line) continue;
      const parts = line.split("\t");
      if (parts.length >= 3) {
        insertTest.run(
          fold,
          Number.parseInt(parts[0], 10),
          Number.parseInt(parts[1], 10),
          Number.parseInt(parts[2], 10)
        );
      }
    }
    db.exec("COMMIT");
  }
}

// 4. Seed user_clusters & item_clusters dari clusters.json
const clustersPath = path.join(STATIC_DIR, "clusters.json");
if (fs.existsSync(clustersPath)) {
  const clustersData = JSON.parse(fs.readFileSync(clustersPath, "utf-8"));
  const insertUserCluster = db.prepare(
    "INSERT INTO user_clusters (fold, k, user_id, cluster) VALUES (?, ?, ?, ?)"
  );
  const insertItemCluster = db.prepare(
    "INSERT INTO item_clusters (fold, k, item_id, cluster) VALUES (?, ?, ?, ?)"
  );

  db.exec("BEGIN TRANSACTION");
  for (const [foldStr, kMap] of Object.entries(clustersData.user)) {
    const fold = Number.parseInt(foldStr, 10);
    for (const [kStr, uMap] of Object.entries(kMap)) {
      const k = Number.parseInt(kStr, 10);
      for (const [uStr, cl] of Object.entries(uMap)) {
        insertUserCluster.run(fold, k, Number.parseInt(uStr, 10), Number(cl));
      }
    }
  }
  for (const [foldStr, kMap] of Object.entries(clustersData.item)) {
    const fold = Number.parseInt(foldStr, 10);
    for (const [kStr, iMap] of Object.entries(kMap)) {
      const k = Number.parseInt(kStr, 10);
      for (const [iStr, cl] of Object.entries(iMap)) {
        insertItemCluster.run(fold, k, Number.parseInt(iStr, 10), Number(cl));
      }
    }
  }
  db.exec("COMMIT");
}

console.log("Seeding SQLite selesai!");
console.log(
  "Counts:",
  db
    .prepare(
      `SELECT 
        (SELECT COUNT(*) FROM movies) AS movies,
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM ratings_train) AS train,
        (SELECT COUNT(*) FROM ratings_test) AS test,
        (SELECT COUNT(*) FROM user_clusters) AS user_clusters,
        (SELECT COUNT(*) FROM item_clusters) AS item_clusters`
    )
    .get()
);

db.close();
