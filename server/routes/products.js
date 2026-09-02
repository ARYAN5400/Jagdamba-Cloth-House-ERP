import express from 'express';
import { query, getOne, run } from '../db/index.js';

const router = express.Router();

// GET all products with Category & Brand names
router.get('/', async (req, res) => {
  try {
    const { search, category_id, brand_id } = req.query;
    let sql = `
      SELECT p.*, c.name as category_name, b.name as brand_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (p.name LIKE ? OR p.design_no LIKE ? OR p.barcode LIKE ? OR p.sku_code LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (category_id) {
      sql += ` AND p.category_id = ?`;
      params.push(category_id);
    }

    if (brand_id) {
      sql += ` AND p.brand_id = ?`;
      params.push(brand_id);
    }

    sql += ` ORDER BY p.id DESC`;
    const products = await query(sql, params);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single product by Barcode or ID
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const product = await getOne(`
      SELECT p.*, c.name as category_name, b.name as brand_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.barcode = ? OR p.design_no = ? OR p.sku_code = ?
    `, [req.params.barcode, req.params.barcode, req.params.barcode]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE new Product
router.post('/', async (req, res) => {
  try {
    const {
      sku_code, barcode, design_no, name, category_id, brand_id, fabric_type,
      unit_type, purchase_price, selling_price, wholesale_price, mrp, gst_rate, hsn_code, stock_quantity, min_stock_alert
    } = req.body;

    const generatedBarcode = barcode || `890${Date.now().toString().slice(-7)}`;
    const generatedSku = sku_code || `SKU-${Date.now().toString().slice(-6)}`;

    const result = await run(`
      INSERT INTO products (
        sku_code, barcode, design_no, name, category_id, brand_id, fabric_type,
        unit_type, purchase_price, selling_price, wholesale_price, mrp, gst_rate, hsn_code, stock_quantity, min_stock_alert
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      generatedSku, generatedBarcode, design_no || name, name, category_id || null, brand_id || null, fabric_type || 'Cotton',
      unit_type || 'piece', purchase_price || 0, selling_price || 0, wholesale_price || 0, mrp || 0, gst_rate || 5, hsn_code || '5407', stock_quantity || 0, min_stock_alert || 5
    ]);

    const created = await getOne('SELECT * FROM products WHERE id = ?', [result.lastID]);
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// UPDATE Product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sku_code, barcode, design_no, name, category_id, brand_id, fabric_type,
      unit_type, purchase_price, selling_price, wholesale_price, mrp, gst_rate, hsn_code, stock_quantity, min_stock_alert
    } = req.body;

    await run(`
      UPDATE products SET 
        sku_code = ?, barcode = ?, design_no = ?, name = ?, category_id = ?, brand_id = ?, fabric_type = ?,
        unit_type = ?, purchase_price = ?, selling_price = ?, wholesale_price = ?, mrp = ?, gst_rate = ?, hsn_code = ?, stock_quantity = ?, min_stock_alert = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      sku_code, barcode, design_no, name, category_id, brand_id, fabric_type,
      unit_type, purchase_price, selling_price, wholesale_price, mrp, gst_rate, hsn_code, stock_quantity, min_stock_alert, id
    ]);

    const updated = await getOne('SELECT * FROM products WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE Product
router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
