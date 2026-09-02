import express from 'express';
import { query, getOne, run } from '../db/index.js';

const router = express.Router();

// GET all products with Category & Brand names
router.get('/', async (req, res) => {
  try {
    const { search, category_id, brand_id, low_stock } = req.query;
    let sql = `
      SELECT p.*, c.name as category_name, b.name as brand_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (p.name LIKE ? OR p.design_no LIKE ? OR p.barcode LIKE ? OR p.sku_code LIKE ? OR p.fabric_type LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (category_id) {
      sql += ` AND p.category_id = ?`;
      params.push(category_id);
    }

    if (brand_id) {
      sql += ` AND p.brand_id = ?`;
      params.push(brand_id);
    }

    if (low_stock === 'true' || low_stock === true || low_stock === '1') {
      sql += ` AND p.stock_quantity <= p.min_stock_alert`;
    }

    sql += ` ORDER BY p.name ASC`;
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

// GET single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await getOne(`
      SELECT p.*, c.name as category_name, b.name as brand_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = ?
    `, [req.params.id]);

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
    const data = req.body;
    const barcode = data.barcode || `890${Math.floor(10000000 + Math.random() * 90000000)}`;
    const sku = data.sku_code || `SKU-${(data.design_no || 'ITM').toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const result = await run(`
      INSERT INTO products (
        sku_code, barcode, design_no, name, category_id, brand_id, fabric_type, colour, size,
        unit_type, purchase_price, selling_price, wholesale_price, mrp, gst_rate, hsn_code, opening_stock, stock_quantity, min_stock_alert, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sku, barcode, data.design_no || '', data.name, data.category_id || null, data.brand_id || null, data.fabric_type || 'Cotton',
      data.colour || '', data.size || '', data.unit_type || 'piece',
      parseFloat(data.purchase_price || 0), parseFloat(data.selling_price || 0), parseFloat(data.wholesale_price || 0),
      parseFloat(data.mrp || 0), parseFloat(data.gst_rate || 5), data.hsn_code || '5407',
      parseFloat(data.stock_quantity || 0), parseFloat(data.stock_quantity || 0), parseFloat(data.min_stock_alert || 5),
      data.notes || ''
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
    const data = req.body;

    await run(`
      UPDATE products SET 
        design_no = ?, name = ?, category_id = ?, brand_id = ?, fabric_type = ?, colour = ?, size = ?,
        unit_type = ?, purchase_price = ?, selling_price = ?, wholesale_price = ?, mrp = ?, gst_rate = ?, 
        hsn_code = ?, stock_quantity = ?, min_stock_alert = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      data.design_no, data.name, data.category_id || null, data.brand_id || null, data.fabric_type,
      data.colour || '', data.size || '', data.unit_type, parseFloat(data.purchase_price || 0),
      parseFloat(data.selling_price || 0), parseFloat(data.wholesale_price || 0), parseFloat(data.mrp || 0),
      parseFloat(data.gst_rate || 5), data.hsn_code || '5407', parseFloat(data.stock_quantity || 0),
      parseFloat(data.min_stock_alert || 5), data.notes || '', id
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
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
