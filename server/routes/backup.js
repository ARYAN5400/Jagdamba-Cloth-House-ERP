import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { getDbPath, closeDatabase, reconnectDatabase } from '../db/index.js';
import { initializeDatabaseSchema } from '../db/schema.js';

const router = express.Router();
const upload = multer({ dest: path.join(process.cwd(), 'temp_uploads') });

// Ensure temp upload dir exists
const tempDir = path.join(process.cwd(), 'temp_uploads');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Download SQLite Database Backup File
router.get('/download', (req, res) => {
  try {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const fileName = `JAGDAMBA_BACKUP_${timestamp}.db`;

    res.download(dbPath, fileName);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/create', (req, res) => {
  try {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const fileName = `JAGDAMBA_BACKUP_${timestamp}.db`;

    res.json({
      success: true,
      path: dbPath,
      downloadUrl: '/api/backup/download',
      fileName
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore SQLite Database from uploaded file
router.post('/restore', upload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No backup file uploaded' });
    }

    const uploadedFilePath = req.file.path;
    const targetDbPath = getDbPath();

    // Verify SQLite file header (first 16 bytes: "SQLite format 3\0")
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(uploadedFilePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    if (!buffer.toString().startsWith('SQLite format 3')) {
      fs.unlinkSync(uploadedFilePath);
      return res.status(400).json({ error: 'Invalid database file format. Must be a valid SQLite .db file.' });
    }

    // Close current connection, replace DB, and reconnect
    await closeDatabase();
    fs.copyFileSync(uploadedFilePath, targetDbPath);
    try { fs.unlinkSync(uploadedFilePath); } catch (e) {}

    reconnectDatabase();

    res.json({ success: true, message: 'Database restored successfully' });
  } catch (error) {
    console.error('[Backup Restore Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
