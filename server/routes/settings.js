import express from 'express';
import { getOne, run } from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const settings = await getOne('SELECT * FROM settings WHERE id = 1');
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const updateSettings = async (req, res) => {
  try {
    const {
      shop_name, owner_name, phone, email, address, gstin,
      invoice_prefix, financial_year, default_gst_rate, default_payment_mode,
      low_stock_threshold, currency, bank_name, account_no, ifsc, invoice_terms,
      signature_image
    } = req.body;

    await run(`
      UPDATE settings SET 
        shop_name = ?, owner_name = ?, phone = ?, email = ?, address = ?,
        gstin = ?, invoice_prefix = ?, financial_year = ?, default_gst_rate = ?,
        default_payment_mode = ?, low_stock_threshold = ?, currency = ?,
        bank_name = ?, account_no = ?, ifsc = ?, invoice_terms = ?,
        signature_image = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
      shop_name || 'Jagdamba Cloth House',
      owner_name || 'Retail Owner',
      phone || '7876413356',
      email || 'jagdambacloth@gmail.com',
      address || 'Main Bazar, GHANOUR',
      gstin || '03BMLPK3243D1ZH',
      invoice_prefix || 'JCH',
      financial_year || '2025-26',
      parseFloat(default_gst_rate || 5),
      default_payment_mode || 'Cash',
      parseFloat(low_stock_threshold || 5),
      currency || '₹',
      bank_name || 'State Bank of India',
      account_no || '12345678901',
      ifsc || 'SBIN0001234',
      invoice_terms || '',
      signature_image || ''
    ]);

    const updated = await getOne('SELECT * FROM settings WHERE id = 1');
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

router.put('/', updateSettings);
router.post('/', updateSettings);

export default router;
