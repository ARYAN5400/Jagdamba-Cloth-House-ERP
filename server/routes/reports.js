import express from 'express';
import { query, getOne } from '../db/index.js';

const router = express.Router();

// Executive Dashboard KPI Summary
router.get('/dashboard-summary', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const todaySales = await getOne(`
      SELECT COUNT(*) as bill_count, COALESCE(SUM(net_amount), 0) as total_sales 
      FROM sales WHERE sale_date = ?
    `, [today]);

    const monthSales = await getOne(`
      SELECT COALESCE(SUM(net_amount), 0) as total_sales 
      FROM sales WHERE strftime('%Y-%m', sale_date) = strftime('%Y-%m', 'now')
    `);

    const totalStock = await getOne(`
      SELECT COUNT(*) as item_count, COALESCE(SUM(stock_quantity), 0) as total_quantity, COALESCE(SUM(stock_quantity * purchase_price), 0) as stock_valuation 
      FROM products
    `);

    const lowStockAlerts = await query(`
      SELECT p.*, c.name as category_name, b.name as brand_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.stock_quantity <= p.min_stock_alert
      ORDER BY p.stock_quantity ASC
    `);

    const totalUdhar = await getOne(`
      SELECT COALESCE(SUM(current_balance), 0) as total_udhar FROM customers WHERE current_balance > 0
    `);

    const recentSales = await query(`
      SELECT s.*, c.name as customer_name 
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id 
      ORDER BY s.id DESC LIMIT 5
    `);

    res.json({
      todaySales: todaySales.total_sales,
      todayBills: todaySales.bill_count,
      monthSales: monthSales.total_sales,
      totalStockValuation: totalStock.stock_valuation,
      totalStockQuantity: totalStock.total_quantity,
      totalItemTypes: totalStock.item_count,
      totalUdharBalance: totalUdhar.total_udhar,
      lowStockAlerts,
      recentSales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GST Sales Report Data (for CA Export)
router.get('/gst-sales-report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let sql = `
      SELECT s.invoice_no, s.sale_date, c.name as customer_name, c.gstin as customer_gstin,
             s.subtotal, s.discount, s.tax_amount, s.net_amount, s.payment_mode
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      sql += ` AND s.sale_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    sql += ` ORDER BY s.sale_date ASC`;
    const salesReport = await query(sql, params);
    res.json(salesReport);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
