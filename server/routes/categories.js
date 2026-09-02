import express from 'express';
import { query, run, getOne } from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const categories = await query('SELECT * FROM categories ORDER BY name ASC');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, description } = req.body;
    const result = await run('INSERT INTO categories (name, type, description) VALUES (?, ?, ?)', [name, type || 'Suits', description || '']);
    const category = await getOne('SELECT * FROM categories WHERE id = ?', [result.lastID]);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
