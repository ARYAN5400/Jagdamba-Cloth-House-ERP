import express from 'express';
import { query, getOne } from '../db/index.js';

const router = express.Router();

// Executive Dashboard KPI Summary
router.get('/dashboard-summary', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = `${today.substring(0, 7)}-01`;

    // Today sales & bill count
    const todaySalesRow = await getOne('SELECT SUM(net_amount) as total, COUNT(*) as count FROM sales WHERE sale_date = ?', [today]);
    const todaySales = todaySalesRow?.total || 0;
    const todayBills = todaySalesRow?.count || 0;

    // Payment modes today
    const cashRow = await getOne("SELECT SUM(paid_amount) as total FROM sales WHERE sale_date = ? AND payment_mode = 'Cash'", [today]);
    const upiRow = await getOne("SELECT SUM(paid_amount) as total FROM sales WHERE sale_date = ? AND payment_mode = 'UPI'", [today]);
    const creditRow = await getOne("SELECT SUM(due_amount) as total FROM sales WHERE sale_date = ? AND (payment_mode = 'Credit' OR due_amount > 0)", [today]);

    // Month Sales
    const monthSalesRow = await getOne('SELECT SUM(net_amount) as total FROM sales WHERE sale_date >= ?', [firstDayOfMonth]);
    const monthSales = monthSalesRow?.total || 0;

    // Today Purchases
    const todayPurchasesRow = await getOne('SELECT SUM(net_amount) as total FROM purchases WHERE purchase_date = ?', [today]);
    const todayPurchases = todayPurchasesRow?.total || 0;

    // Today Expenses
    const todayExpensesRow = await getOne('SELECT SUM(amount) as total FROM expenses WHERE expense_date = ?', [today]);
    const todayExpenses = todayExpensesRow?.total || 0;

    // Profit Today (Estimated: Sales Net - Expense)
    const todayProfit = todaySales - todayExpenses;

    // Total Stock Valuation
    const stockRow = await getOne('SELECT SUM(stock_quantity * selling_price) as valuation, SUM(stock_quantity) as totalQty, COUNT(*) as itemCount FROM products');
    const totalStockValuation = stockRow?.valuation || 0;
    const totalStockQuantity = stockRow?.totalQty || 0;
    const totalItemTypes = stockRow?.itemCount || 0;

    // Udhar Balance
    const udharRow = await getOne('SELECT SUM(current_balance) as total FROM customers WHERE current_balance > 0');
    const totalUdharBalance = udharRow?.total || 0;

    // Low stock items
    const lowStockAlerts = await query(`
      SELECT p.*, b.name as brand_name, c.name as category_name 
      FROM products p 
      LEFT JOIN brands b ON p.brand_id = b.id 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.stock_quantity <= p.min_stock_alert 
      ORDER BY p.stock_quantity ASC
      LIMIT 10
    `);

    // Recent Sales
    const recentSales = await query(`
      SELECT s.*, c.name as customer_name 
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id 
      ORDER BY s.id DESC 
      LIMIT 10
    `);

    res.json({
      todaySales,
      todayBills,
      cashCollection: cashRow?.total || 0,
      upiCollection: upiRow?.total || 0,
      creditSales: creditRow?.total || 0,
      monthSales,
      todayPurchases,
      todayExpenses,
      todayProfit,
      totalStockValuation,
      totalStockQuantity,
      totalItemTypes,
      totalUdharBalance,
      lowStockAlerts,
      recentSales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sales Report & GST Report Data
const getSalesReportHandler = async (req, res) => {
  try {
    const { fromDate, toDate, startDate, endDate, paymentMode } = req.query;
    const start = fromDate || startDate;
    const end = toDate || endDate;

    let sql = `
      SELECT s.*, c.name as customer_name, c.gstin as customer_gstin, c.phone as customer_phone
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (start) {
      sql += ` AND s.sale_date >= ?`;
      params.push(start);
    }
    if (end) {
      sql += ` AND s.sale_date <= ?`;
      params.push(end);
    }
    if (paymentMode && paymentMode !== 'All') {
      sql += ` AND s.payment_mode = ?`;
      params.push(paymentMode);
    }

    sql += ` ORDER BY s.id DESC`;
    const sales = await query(sql, params);

    for (const s of sales) {
      s.items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [s.id]);
    }

    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

router.get('/sales', getSalesReportHandler);
router.get('/gst-sales-report', getSalesReportHandler);

// Purchase Report
router.get('/purchases', async (req, res) => {
  try {
    const { fromDate, toDate, startDate, endDate } = req.query;
    const start = fromDate || startDate;
    const end = toDate || endDate;

    let sql = `
      SELECT p.*, s.name as supplier_name, s.company_name 
      FROM purchases p 
      LEFT JOIN suppliers s ON p.supplier_id = s.id 
      WHERE 1=1
    `;
    const params = [];

    if (start) {
      sql += ` AND p.purchase_date >= ?`;
      params.push(start);
    }
    if (end) {
      sql += ` AND p.purchase_date <= ?`;
      params.push(end);
    }

    sql += ` ORDER BY p.id DESC`;
    const purchases = await query(sql, params);

    for (const p of purchases) {
      p.items = await query('SELECT * FROM purchase_items WHERE purchase_id = ?', [p.id]);
    }

    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Expense Report
router.get('/expenses', async (req, res) => {
  try {
    const { fromDate, toDate, startDate, endDate, category } = req.query;
    const start = fromDate || startDate;
    const end = toDate || endDate;

    let sql = `SELECT * FROM expenses WHERE 1=1`;
    const params = [];

    if (start) {
      sql += ` AND expense_date >= ?`;
      params.push(start);
    }
    if (end) {
      sql += ` AND expense_date <= ?`;
      params.push(end);
    }
    if (category && category !== 'All') {
      sql += ` AND category = ?`;
      params.push(category);
    }

    sql += ` ORDER BY id DESC`;
    const expenses = await query(sql, params);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
