import express from 'express';
import { query, getOne, run } from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const customers = await query('SELECT * FROM customers ORDER BY name ASC');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, address, city, gstin, notes, credit_limit } = req.body;
    const result = await run(`
      INSERT INTO customers (name, phone, address, city, gstin, notes, credit_limit, current_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `, [name, phone, address || '', city || 'Local', gstin || '', notes || '', parseFloat(credit_limit || 20000)]);

    const created = await getOne('SELECT * FROM customers WHERE id = ?', [result.lastID]);
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET customer ledger / Khata history
router.get('/:id/ledger', async (req, res) => {
  try {
    const customer = await getOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const transactions = await query(`
      SELECT t.*, s.invoice_no 
      FROM customer_transactions t
      LEFT JOIN sales s ON t.sale_id = s.id
      WHERE t.customer_id = ?
      ORDER BY t.id DESC
    `, [req.params.id]);

    res.json({ customer, transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record customer payment (Udhar collection)
router.post('/:id/payment', async (req, res) => {
  try {
    const { amount, payment_mode, notes } = req.body;
    const customerId = req.params.id;
    const amt = parseFloat(amount || 0);

    await run('UPDATE customers SET current_balance = current_balance - ? WHERE id = ?', [amt, customerId]);
    await run(`
      INSERT INTO customer_transactions (customer_id, type, amount, payment_mode, notes)
      VALUES (?, 'CREDIT', ?, ?, ?)
    `, [customerId, amt, payment_mode || 'Cash', notes || 'Udhar Payment Collection']);

    const updatedCustomer = await getOne('SELECT * FROM customers WHERE id = ?', [customerId]);
    res.json({ success: true, message: 'Payment recorded successfully', customer: updatedCustomer });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
