import express from 'express';
import { query, run, getOne } from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const brands = await query('SELECT * FROM brands ORDER BY name ASC');
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const result = await run('INSERT INTO brands (name, code, description) VALUES (?, ?, ?)', [name, code || '', description || '']);
    const brand = await getOne('SELECT * FROM brands WHERE id = ?', [result.lastID]);
    res.status(201).json(brand);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
