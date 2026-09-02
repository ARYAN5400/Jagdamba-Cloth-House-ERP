import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let db = null;

export function getDatabasePath() {
  const userDataPath = app ? app.getPath('userData') : (process.env.APPDATA || '.');
  const dataDir = path.join(userDataPath, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'retail_erp.db');
}

export function initDatabase() {
  return new Promise((resolve, reject) => {
    const dbPath = getDatabasePath();
    const exists = fs.existsSync(dbPath);
    const size = exists ? fs.statSync(dbPath).size : 0;

    console.log('==================================================');
    console.log(`[Database] PATH: ${dbPath}`);
    console.log(`[Database] EXISTS: ${exists}`);
    console.log(`[Database] SIZE: ${size}`);
    console.log(`DATABASE PATH: ${dbPath}`);
    console.log(`DATABASE EXISTS: ${exists}`);
    console.log(`DATABASE SIZE: ${size}`);
    console.log('==================================================');

    sqlite3.verbose();
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('[Database Error] Failed to open SQLite database:', err);
        return reject(err);
      }
      console.log('[Database] SQLite connected successfully in Electron Main.');
      
      // Enable WAL mode and foreign keys for high performance and integrity
      db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON');
        db.run('PRAGMA journal_mode = WAL');

        // Log sales count
        db.get('SELECT COUNT(*) as salesCount FROM sales', [], (err, row) => {
          const salesCount = row ? row.salesCount : 0;
          console.log(`[Database] SALES COUNT: ${salesCount}`);
          console.log(`SALES COUNT: ${salesCount}`);
          console.log('==================================================');
          resolve(db);
        });
      });
    });
  });
}

export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not initialized'));
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

export const getOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not initialized'));
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not initialized'));
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Transaction wrapper for atomic operations (Sales / Purchases / Cancellations)
export const execTransaction = async (queriesWithParams) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not initialized'));
    db.serialize(async () => {
      db.run('BEGIN TRANSACTION');
      try {
        const results = [];
        for (const item of queriesWithParams) {
          const { sql, params = [] } = item;
          const res = await new Promise((resFn, rejFn) => {
            db.run(sql, params, function (err) {
              if (err) rejFn(err);
              else resFn({ lastID: this.lastID, changes: this.changes });
            });
          });
          results.push(res);
        }
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve(results);
        });
      } catch (err) {
        db.run('ROLLBACK');
        reject(err);
      }
    });
  });
};

// Database Backup Helper
export const backupDatabase = async (destinationPath) => {
  const currentDbPath = getDatabasePath();
  if (!fs.existsSync(currentDbPath)) {
    throw new Error('Database file does not exist to backup.');
  }
  // Check if target directory exists
  const destDir = path.dirname(destinationPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  // Copy file
  fs.copyFileSync(currentDbPath, destinationPath);
  return { success: true, path: destinationPath };
};

// Database Restore Helper
export const restoreDatabase = async (sourcePath) => {
  if (!fs.existsSync(sourcePath)) {
    throw new Error('Selected backup file does not exist.');
  }
  const currentDbPath = getDatabasePath();
  if (db) {
    await new Promise((resolve) => db.close(resolve));
  }
  fs.copyFileSync(sourcePath, currentDbPath);
  await initDatabase();
  return { success: true };
};
