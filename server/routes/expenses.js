import express from 'express';
import { query, getOne, run } from '../db/index.js';

const router = express.Router();

// GET all expenses
router.get('/', async (req, res) => {
  try {
    const expenses = await query('SELECT * FROM expenses ORDER BY id DESC');
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE expense
router.post('/', async (req, res) => {
  try {
    const { expense_date, category, description, amount, payment_mode, notes } = req.body;
    const result = await run(`
      INSERT INTO expenses (expense_date, category, description, amount, payment_mode, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      expense_date || new Date().toISOString().split('T')[0],
      category || 'Other',
      description || '',
      parseFloat(amount || 0),
      payment_mode || 'Cash',
      notes || ''
    ]);

    const created = await getOne('SELECT * FROM expenses WHERE id = ?', [result.lastID]);
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE expense
router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
