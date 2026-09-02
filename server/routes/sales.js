import express from 'express';
import { query, getOne, run } from '../db/index.js';

const router = express.Router();

// GET sales history with items attached
router.get('/', async (req, res) => {
  try {
    const sales = await query(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.id DESC
    `);

    for (const s of sales) {
      s.items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [s.id]);
    }

    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET sales count
router.get('/count', async (req, res) => {
  try {
    const row = await getOne('SELECT COUNT(*) as count FROM sales');
    res.json(row ? row.count : 0);
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

    sale.items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);

    res.json({ sale, items: sale.items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Sale (POS Billing)
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const settings = await getOne('SELECT * FROM settings WHERE id = 1');
    const prefix = settings?.invoice_prefix || 'JCH';

    const countRow = await getOne('SELECT MAX(id) as maxId FROM sales');
    const nextSeq = (countRow?.maxId || 0) + 1;
    const invoiceNo = `${prefix}-${String(nextSeq).padStart(5, '0')}`;

    const customerId = data.customer_id || 1;
    let customerName = data.customer_name || 'Walk-in Customer';
    let customerGstin = data.customer_gstin || '';

    if (customerId && (!data.customer_name || data.customer_name === 'Walk-in Customer')) {
      const cust = await getOne('SELECT name, gstin FROM customers WHERE id = ?', [customerId]);
      if (cust) {
        customerName = cust.name;
        if (!customerGstin) customerGstin = cust.gstin || '';
      }
    }

    const { items = [], discount = 0, payment_mode = 'Cash', notes = '', state_code = '' } = data;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Sale items list is empty.' });
    }

    let subtotal = 0;
    let taxAmount = 0;

    items.forEach(item => {
      const itemSub = parseFloat(item.quantity || 1) * parseFloat(item.unit_price || 0);
      const gstRate = parseFloat(item.gst_rate !== undefined ? item.gst_rate : 5);
      const itemTax = itemSub * (gstRate / 100);
      subtotal += itemSub;
      taxAmount += itemTax;
    });

    const cgstAmount = taxAmount / 2;
    const sgstAmount = taxAmount / 2;
    const netAmount = Math.max(0, subtotal + taxAmount - parseFloat(discount));
    const paidAmount = payment_mode === 'Credit' ? 0 : parseFloat(data.paid_amount !== undefined ? data.paid_amount : netAmount);
    const dueAmount = Math.max(0, netAmount - paidAmount);
    const paymentStatus = dueAmount === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'CREDIT');

    const todayDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('en-IN', { hour12: false });

    await run('BEGIN TRANSACTION');

    try {
      const saleRes = await run(
        `INSERT INTO sales (invoice_no, customer_id, customer_name, customer_gstin, state_code, sale_date, sale_time, subtotal, discount, tax_amount, cgst_amount, sgst_amount, net_amount, paid_amount, due_amount, payment_mode, payment_status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoiceNo, customerId, customerName, customerGstin, state_code, todayDate, currentTime, subtotal, discount, taxAmount, cgstAmount, sgstAmount, netAmount, paidAmount, dueAmount, payment_mode, paymentStatus, notes]
      );

      const saleId = saleRes.lastID;

      for (const item of items) {
        const itemSub = parseFloat(item.quantity || 1) * parseFloat(item.unit_price || 0);
        const gstRate = parseFloat(item.gst_rate !== undefined ? item.gst_rate : 5);
        const itemTax = itemSub * (gstRate / 100);
        const itemCgst = itemTax / 2;
        const itemSgst = itemTax / 2;
        const itemTotal = itemSub + itemTax - parseFloat(item.discount || 0);

        await run(
          `INSERT INTO sale_items (sale_id, product_id, product_name, design_no, description, unit_type, quantity, unit_price, discount, gst_rate, tax_amount, cgst_amount, sgst_amount, total_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            saleId,
            item.product_id || null,
            item.name || item.product_name || 'Item',
            item.design_no || '',
            item.description || '',
            item.unit_type || 'piece',
            parseFloat(item.quantity || 1),
            parseFloat(item.unit_price || 0),
            parseFloat(item.discount || 0),
            gstRate,
            itemTax,
            itemCgst,
            itemSgst,
            itemTotal
          ]
        );

        if (item.product_id) {
          await run(
            `UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [parseFloat(item.quantity), item.product_id]
          );
        }
      }

      if (dueAmount > 0 && customerId && customerId !== 1) {
        await run('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?', [dueAmount, customerId]);
        await run(
          `INSERT INTO customer_transactions (customer_id, sale_id, type, amount, payment_mode, notes) VALUES (?, ?, 'DEBIT', ?, ?, ?)`,
          [customerId, saleId, dueAmount, payment_mode, `Invoice #${invoiceNo} Sale Udhar`]
        );
      }

      await run('COMMIT');

      const createdSale = await getOne('SELECT * FROM sales WHERE id = ?', [saleId]);
      if (createdSale) {
        createdSale.items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);
      }

      res.status(201).json({ success: true, invoiceNo, saleId, sale: createdSale, data: createdSale });
    } catch (txErr) {
      await run('ROLLBACK');
      throw txErr;
    }
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// CANCEL / DELETE Sale
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await getOne('SELECT * FROM sales WHERE id = ?', [id]);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [id]);

    for (const item of items) {
      if (item.product_id) {
        await run(
          `UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [parseFloat(item.quantity), item.product_id]
        );
      }
    }

    if (sale.due_amount > 0 && sale.customer_id && sale.customer_id !== 1) {
      await run('UPDATE customers SET current_balance = MAX(0, current_balance - ?) WHERE id = ?', [sale.due_amount, sale.customer_id]);
    }

    await run('DELETE FROM sale_items WHERE sale_id = ?', [id]);
    await run('DELETE FROM customer_transactions WHERE sale_id = ?', [id]);
    await run('DELETE FROM sales WHERE id = ?', [id]);

    res.json({ success: true, message: 'Sale cancelled and stock restored successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
