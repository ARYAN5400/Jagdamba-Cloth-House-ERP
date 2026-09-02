import express from 'express';
import { query, getOne } from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const dbTest = await getOne('SELECT 1 as connected');
    const settings = await getOne('SELECT shop_name, phone, gstin FROM settings WHERE id = 1');
    
    res.json({
      status: 'OK',
      offlineMode: true,
      database: dbTest?.connected === 1 ? 'Connected (SQLite WAL)' : 'Error',
      timestamp: new Date().toISOString(),
      shopName: settings?.shop_name || 'Jagdamba Cloth House'
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

export default router;
