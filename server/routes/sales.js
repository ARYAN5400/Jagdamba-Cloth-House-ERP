import express from 'express';
import { query, getOne, run } from '../db/index.js';

const router = express.Router();

// GET sales history
router.get('/', async (req, res) => {
  try {
    const sales = await query(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.id DESC
    `);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single sale with items
router.get('/:id', async (req, res) => {
  try {
    const sale = await getOne(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address, c.gstin as customer_gstin
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (!sale) return res.status(404).json({ error: 'Invoice not found' });

    const items = await query(`
      SELECT si.*, p.name as product_name, p.design_no, p.sku_code, p.unit_type, p.hsn_code, b.name as brand_name
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE si.sale_id = ?
    `, [req.params.id]);

    res.json({ sale, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Sale (POS Billing)
router.post('/', async (req, res) => {
  try {
    const { customer_id, items, subtotal, discount, tax_amount, net_amount, paid_amount, payment_mode, notes } = req.body;

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const dueAmount = net_amount - (paid_amount || 0);
    const paymentStatus = dueAmount <= 0 ? 'PAID' : (paid_amount > 0 ? 'PARTIAL' : 'DUE');

    // Create Sale Header
    const saleResult = await run(`
      INSERT INTO sales (
        invoice_no, customer_id, subtotal, discount, tax_amount, net_amount, paid_amount, due_amount, payment_mode, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoiceNo, customer_id || 1, subtotal, discount || 0, tax_amount || 0, net_amount, paid_amount || 0, dueAmount, payment_mode || 'Cash', paymentStatus, notes || ''
    ]);

    const saleId = saleResult.lastID;

    // Insert Sale Items & Deduct Stock
    for (const item of items) {
      await run(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, gst_rate, tax_amount, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [saleId, item.product_id, item.quantity, item.unit_price, item.gst_rate || 5, item.tax_amount || 0, item.total_amount]);

      // Deduct stock quantity
      await run('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    // Handle Customer Ledger / Udhar if balance due
    if (customer_id && customer_id !== 1) {
      if (dueAmount > 0) {
        await run(`
          INSERT INTO customer_transactions (customer_id, sale_id, type, amount, payment_mode, notes)
          VALUES (?, ?, 'DEBIT', ?, ?, 'Sale Credit Invoice')
        `, [customer_id, saleId, dueAmount, payment_mode]);

        await run('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?', [dueAmount, customer_id]);
      }
    }

    const createdSale = await getOne('SELECT * FROM sales WHERE id = ?', [saleId]);
    if (createdSale) {
      createdSale.items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);
    }
    res.status(201).json({ invoiceNo, saleId, sale: createdSale });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
