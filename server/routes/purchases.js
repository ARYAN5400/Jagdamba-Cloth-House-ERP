import express from 'express';
import { query, getOne, run } from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const purchases = await query(`
      SELECT p.*, s.name as supplier_name, s.company_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.id DESC
    `);
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { invoice_no, supplier_id, purchase_date, items, total_amount, discount, tax_amount, net_amount, paid_amount, notes } = req.body;

    const dueAmount = net_amount - (paid_amount || 0);
    const paymentStatus = dueAmount <= 0 ? 'PAID' : (paid_amount > 0 ? 'PARTIAL' : 'DUE');

    const result = await run(`
      INSERT INTO purchases (invoice_no, supplier_id, purchase_date, total_amount, discount, tax_amount, net_amount, paid_amount, due_amount, payment_status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [invoice_no, supplier_id, purchase_date || new Date().toISOString().split('T')[0], total_amount, discount || 0, tax_amount || 0, net_amount, paid_amount || 0, dueAmount, paymentStatus, notes || '']);

    const purchaseId = result.lastID;

    for (const item of items) {
      await run(`
        INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, gst_rate, tax_amount, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [purchaseId, item.product_id, item.quantity, item.unit_price, item.gst_rate || 5, item.tax_amount || 0, item.total_amount]);

      // Add to stock quantity
      await run('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    if (dueAmount > 0 && supplier_id) {
      await run('UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?', [dueAmount, supplier_id]);
    }

    const created = await getOne('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
