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
    const { shop_name, owner_name, phone, email, address, gstin, bank_name, account_no, ifsc, invoice_terms, signature_image } = req.body;
    await run(`
      UPDATE settings SET 
        shop_name = ?, owner_name = ?, phone = ?, email = ?, address = ?,
        gstin = ?, bank_name = ?, account_no = ?, ifsc = ?, invoice_terms = ?,
        signature_image = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [shop_name, owner_name, phone, email, address, gstin, bank_name, account_no, ifsc, invoice_terms, signature_image || '']);

    const updated = await getOne('SELECT * FROM settings WHERE id = 1');
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

router.put('/', updateSettings);
router.post('/', updateSettings);

export default router;
