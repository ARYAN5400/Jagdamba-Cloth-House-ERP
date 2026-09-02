import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
export const getDataDir = () => {
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }
  if (process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'jagdamba-retail-erp', 'data');
  }
  return path.join(process.cwd(), 'data');
};

const dataDir = getDataDir();
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const getDbPath = () => path.join(getDataDir(), 'retail_erp.db');

const dbPath = getDbPath();
console.log(`[Database] Connecting to SQLite at: ${dbPath}`);

sqlite3.verbose();
let db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[Database Connection Error]:', err);
  } else {
    console.log('[Database] SQLite connected successfully.');
  }
});

// Enable PRAGMA foreign keys and WAL mode for high performance
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode = WAL');
});

// Async helper functions
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

export const getOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const closeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const reconnectDatabase = () => {
  const currentDbPath = getDbPath();
  db = new sqlite3.Database(currentDbPath, (err) => {
    if (err) {
      console.error('[Database Reconnection Error]:', err);
    } else {
      console.log('[Database] SQLite reconnected successfully.');
    }
  });
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');
    db.run('PRAGMA journal_mode = WAL');
  });
  return db;
};

export default db;
