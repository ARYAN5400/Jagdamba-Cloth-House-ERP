import express from 'express';
import { query, getOne, run } from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const suppliers = await query('SELECT * FROM suppliers ORDER BY name ASC');
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, company_name, phone, email, address, gstin, notes, current_balance } = req.body;
    const result = await run(`
      INSERT INTO suppliers (name, company_name, phone, email, address, gstin, notes, current_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, company_name || '', phone || '', email || '', address || '', gstin || '', notes || '', parseFloat(current_balance || 0)]);

    const created = await getOne('SELECT * FROM suppliers WHERE id = ?', [result.lastID]);
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
