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

    for (const p of purchases) {
      p.items = await query('SELECT * FROM purchase_items WHERE purchase_id = ?', [p.id]);
    }

    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { supplier_id, invoice_no, purchase_date, items = [], total_amount, discount = 0, tax_amount, net_amount, paid_amount, payment_mode = 'Cash', notes = '' } = req.body;

    let subtotal = 0;
    let computedTax = 0;

    items.forEach(item => {
      const itemTotal = parseFloat(item.quantity || 1) * parseFloat(item.unit_price || 0);
      const itemTax = itemTotal * (parseFloat(item.gst_rate !== undefined ? item.gst_rate : 5) / 100);
      subtotal += itemTotal;
      computedTax += itemTax;
    });

    const finalSubtotal = total_amount !== undefined ? parseFloat(total_amount) : subtotal;
    const finalTax = tax_amount !== undefined ? parseFloat(tax_amount) : computedTax;
    const finalNet = net_amount !== undefined ? parseFloat(net_amount) : (finalSubtotal + finalTax - parseFloat(discount));
    const paid = parseFloat(paid_amount !== undefined ? paid_amount : finalNet);
    const dueAmount = Math.max(0, finalNet - paid);
    const paymentStatus = dueAmount === 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'DUE');

    let supplierName = 'Wholesaler Supplier';
    if (supplier_id) {
      const sup = await getOne('SELECT name FROM suppliers WHERE id = ?', [supplier_id]);
      if (sup) supplierName = sup.name;
    }

    const genInvoiceNo = invoice_no || `PUR-${Date.now().toString().slice(-6)}`;

    await run('BEGIN TRANSACTION');

    try {
      const result = await run(`
        INSERT INTO purchases (invoice_no, supplier_id, supplier_name, purchase_date, total_amount, discount, tax_amount, net_amount, paid_amount, due_amount, payment_mode, payment_status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        genInvoiceNo, supplier_id || null, supplierName, purchase_date || new Date().toISOString().split('T')[0],
        finalSubtotal, parseFloat(discount), finalTax, finalNet, paid, dueAmount, payment_mode, paymentStatus, notes
      ]);

      const purchaseId = result.lastID;

      for (const item of items) {
        const itemQty = parseFloat(item.quantity || 1);
        const itemPrice = parseFloat(item.unit_price || 0);
        const itemGst = parseFloat(item.gst_rate !== undefined ? item.gst_rate : 5);
        const itemTax = itemQty * itemPrice * (itemGst / 100);
        const itemTotal = (itemQty * itemPrice) + itemTax;

        await run(`
          INSERT INTO purchase_items (purchase_id, product_id, product_name, design_no, unit_type, quantity, unit_price, gst_rate, tax_amount, total_amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          purchaseId, item.product_id || null, item.name || item.product_name || '', item.design_no || '',
          item.unit_type || 'piece', itemQty, itemPrice, itemGst, itemTax, itemTotal
        ]);

        if (item.product_id) {
          await run('UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [itemQty, item.product_id]);
        }
      }

      if (dueAmount > 0 && supplier_id) {
        await run('UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?', [dueAmount, supplier_id]);
        await run(
          `INSERT INTO supplier_transactions (supplier_id, purchase_id, type, amount, payment_mode, notes) VALUES (?, ?, 'CREDIT', ?, ?, ?)`,
          [supplier_id, purchaseId, dueAmount, payment_mode, `Purchase Invoice #${genInvoiceNo}`]
        );
      }

      await run('COMMIT');

      const created = await getOne('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
      if (created) {
        created.items = await query('SELECT * FROM purchase_items WHERE purchase_id = ?', [purchaseId]);
      }
      res.status(201).json(created);
    } catch (txErr) {
      await run('ROLLBACK');
      throw txErr;
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
