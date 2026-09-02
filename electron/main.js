import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase, query, getOne, run, execTransaction, backupDatabase, restoreDatabase } from './db/index.js';
import { initializeDatabaseSchema } from './db/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false, // Modern custom frameless header
    icon: path.join(__dirname, '../public/favicon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

  if (isDev) {
    const devUrl = 'http://127.0.0.1:5173';
    console.log(`[Electron] Loading development URL:\n${devUrl}`);
    mainWindow.loadURL(devUrl).catch((err) => {
      console.error('[Electron Startup ERROR] Failed loading development URL:', err);
    });
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow?.close());
  safeIpcHandle('get-app-version', () => app.getVersion());
}

function safeIpcHandle(channel, listener) {
  try {
    ipcMain.removeHandler(channel);
  } catch (e) {}
  ipcMain.handle(channel, listener);
}

// Register secure Electron IPC Database Handlers
function registerIpcHandlers() {
  // DB Health Check
  safeIpcHandle('db:health', async () => {
    return { status: 'OK', message: 'SQLite Local Database Connected' };
  });

  // Settings
  ipcMain.handle('db:settings:get', async () => {
    const row = await getOne('SELECT * FROM settings WHERE id = 1');
    return row || {};
  });

  ipcMain.handle('db:settings:update', async (_, data) => {
    await run(
      `UPDATE settings SET 
        shop_name = ?, owner_name = ?, phone = ?, email = ?, address = ?, 
        gstin = ?, invoice_prefix = ?, financial_year = ?, default_gst_rate = ?, 
        default_payment_mode = ?, low_stock_threshold = ?, currency = ?, 
        bank_name = ?, account_no = ?, ifsc = ?, invoice_terms = ?, 
        updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [
        data.shop_name, data.owner_name, data.phone, data.email, data.address,
        data.gstin, data.invoice_prefix, data.financial_year, data.default_gst_rate,
        data.default_payment_mode, data.low_stock_threshold, data.currency,
        data.bank_name, data.account_no, data.ifsc, data.invoice_terms
      ]
    );
    return await getOne('SELECT * FROM settings WHERE id = 1');
  });

  // Categories & Brands
  ipcMain.handle('db:categories:getAll', async () => {
    return await query('SELECT * FROM categories ORDER BY name ASC');
  });

  ipcMain.handle('db:categories:add', async (_, { name, type, description }) => {
    const res = await run('INSERT INTO categories (name, type, description) VALUES (?, ?, ?)', [name, type || 'Suits', description]);
    return { id: res.lastID, name, type, description };
  });

  ipcMain.handle('db:brands:getAll', async () => {
    return await query('SELECT * FROM brands ORDER BY name ASC');
  });

  ipcMain.handle('db:brands:add', async (_, { name, code, description }) => {
    const res = await run('INSERT INTO brands (name, code, description) VALUES (?, ?, ?)', [name, code, description]);
    return { id: res.lastID, name, code, description };
  });

  // Products CRUD
  ipcMain.handle('db:products:getAll', async (_, filters = {}) => {
    let sql = `
      SELECT p.*, c.name as category_name, b.name as brand_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      sql += ` AND (p.name LIKE ? OR p.design_no LIKE ? OR p.barcode LIKE ? OR p.fabric_type LIKE ?)`;
      const term = `%${filters.search}%`;
      params.push(term, term, term, term);
    }

    if (filters.category_id) {
      sql += ` AND p.category_id = ?`;
      params.push(filters.category_id);
    }

    if (filters.brand_id) {
      sql += ` AND p.brand_id = ?`;
      params.push(filters.brand_id);
    }

    if (filters.low_stock) {
      sql += ` AND p.stock_quantity <= p.min_stock_alert`;
    }

    sql += ` ORDER BY p.name ASC`;
    return await query(sql, params);
  });

  ipcMain.handle('db:products:getById', async (_, id) => {
    return await getOne('SELECT * FROM products WHERE id = ?', [id]);
  });

  ipcMain.handle('db:products:add', async (_, data) => {
    const barcode = data.barcode || `890${Math.floor(10000000 + Math.random() * 90000000)}`;
    const sku = data.sku_code || `SKU-${data.design_no.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const res = await run(
      `INSERT INTO products 
        (sku_code, barcode, design_no, name, category_id, brand_id, fabric_type, colour, size, unit_type, purchase_price, selling_price, wholesale_price, mrp, gst_rate, hsn_code, opening_stock, stock_quantity, min_stock_alert, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sku, barcode, data.design_no, data.name, data.category_id || null, data.brand_id || null,
        data.fabric_type || 'Cotton', data.colour || '', data.size || '', data.unit_type || 'piece',
        parseFloat(data.purchase_price || 0), parseFloat(data.selling_price || 0), parseFloat(data.wholesale_price || 0),
        parseFloat(data.mrp || 0), parseFloat(data.gst_rate || 5), data.hsn_code || '5407',
        parseFloat(data.stock_quantity || 0), parseFloat(data.stock_quantity || 0), parseFloat(data.min_stock_alert || 5),
        data.notes || ''
      ]
    );
    return await getOne('SELECT * FROM products WHERE id = ?', [res.lastID]);
  });

  ipcMain.handle('db:products:update', async (_, { id, ...data }) => {
    await run(
      `UPDATE products SET 
        design_no = ?, name = ?, category_id = ?, brand_id = ?, fabric_type = ?, colour = ?, size = ?, 
        unit_type = ?, purchase_price = ?, selling_price = ?, wholesale_price = ?, mrp = ?, gst_rate = ?, 
        hsn_code = ?, stock_quantity = ?, min_stock_alert = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.design_no, data.name, data.category_id || null, data.brand_id || null, data.fabric_type,
        data.colour || '', data.size || '', data.unit_type, parseFloat(data.purchase_price || 0),
        parseFloat(data.selling_price || 0), parseFloat(data.wholesale_price || 0), parseFloat(data.mrp || 0),
        parseFloat(data.gst_rate || 5), data.hsn_code || '5407', parseFloat(data.stock_quantity || 0),
        parseFloat(data.min_stock_alert || 5), data.notes || '', id
      ]
    );
    return await getOne('SELECT * FROM products WHERE id = ?', [id]);
  });

  ipcMain.handle('db:products:delete', async (_, id) => {
    await run('DELETE FROM products WHERE id = ?', [id]);
    return { success: true };
  });

  // Suppliers & Purchases
  ipcMain.handle('db:suppliers:getAll', async () => {
    return await query('SELECT * FROM suppliers ORDER BY name ASC');
  });

  ipcMain.handle('db:suppliers:add', async (_, data) => {
    const res = await run(
      `INSERT INTO suppliers (name, company_name, phone, email, address, gstin, notes, current_balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.company_name || '', data.phone || '', data.email || '', data.address || '', data.gstin || '', data.notes || '', parseFloat(data.current_balance || 0)]
    );
    return await getOne('SELECT * FROM suppliers WHERE id = ?', [res.lastID]);
  });

  ipcMain.handle('db:purchases:getAll', async () => {
    const purchases = await query(`
      SELECT p.*, s.name as supplier_name 
      FROM purchases p 
      LEFT JOIN suppliers s ON p.supplier_id = s.id 
      ORDER BY p.id DESC
    `);
    return purchases;
  });

  // ATOMIC PURCHASE CREATION (Increases Stock)
  ipcMain.handle('db:purchases:create', async (_, data) => {
    const { supplier_id, invoice_no, purchase_date, items, payment_mode, notes } = data;

    let subtotal = 0;
    let taxAmount = 0;

    items.forEach(item => {
      const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
      const itemTax = itemTotal * (parseFloat(item.gst_rate || 5) / 100);
      subtotal += itemTotal;
      taxAmount += itemTax;
    });

    const netAmount = subtotal + taxAmount;
    const paidAmount = parseFloat(data.paid_amount !== undefined ? data.paid_amount : netAmount);
    const dueAmount = Math.max(0, netAmount - paidAmount);
    const paymentStatus = dueAmount === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'DUE');

    // Supplier Name
    let supplierName = 'Wholesaler Supplier';
    if (supplier_id) {
      const sup = await getOne('SELECT name FROM suppliers WHERE id = ?', [supplier_id]);
      if (sup) supplierName = sup.name;
    }

    const txQueries = [
      {
        sql: `INSERT INTO purchases (invoice_no, supplier_id, supplier_name, purchase_date, total_amount, tax_amount, net_amount, paid_amount, due_amount, payment_mode, payment_status, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [invoice_no, supplier_id || null, supplierName, purchase_date || new Date().toISOString().split('T')[0], subtotal, taxAmount, netAmount, paidAmount, dueAmount, payment_mode || 'Cash', paymentStatus, notes || '']
      }
    ];

    // Execute purchase header insert first
    const purchaseRes = await run(txQueries[0].sql, txQueries[0].params);
    const purchaseId = purchaseRes.lastID;

    // Add item inserts and stock increase queries
    for (const item of items) {
      const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
      const itemTax = itemTotal * (parseFloat(item.gst_rate || 5) / 100);

      // Insert Purchase Item
      await run(
        `INSERT INTO purchase_items (purchase_id, product_id, product_name, design_no, unit_type, quantity, unit_price, gst_rate, tax_amount, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [purchaseId, item.product_id, item.name || '', item.design_no || '', item.unit_type || 'piece', parseFloat(item.quantity), parseFloat(item.unit_price), parseFloat(item.gst_rate || 5), itemTax, itemTotal]
      );

      // Increase Product Stock!
      await run(
        `UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [parseFloat(item.quantity), item.product_id]
      );
    }

    // Update Supplier Balance if credit / due amount
    if (supplier_id && dueAmount > 0) {
      await run(`UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?`, [dueAmount, supplier_id]);
      await run(
        `INSERT INTO supplier_transactions (supplier_id, purchase_id, type, amount, payment_mode, notes) VALUES (?, ?, 'CREDIT', ?, ?, ?)`,
        [supplier_id, purchaseId, dueAmount, payment_mode, `Purchase Invoice #${invoice_no}`]
      );
    }

    return await getOne('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
  });

  // Customers & Ledger
  ipcMain.handle('db:customers:getAll', async () => {
    return await query('SELECT * FROM customers ORDER BY name ASC');
  });

  ipcMain.handle('db:customers:add', async (_, data) => {
    const res = await run(
      `INSERT INTO customers (name, phone, address, city, gstin, notes, credit_limit, current_balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.phone, data.address || '', data.city || 'Local', data.gstin || '', data.notes || '', parseFloat(data.credit_limit || 20000), 0]
    );
    return await getOne('SELECT * FROM customers WHERE id = ?', [res.lastID]);
  });

  ipcMain.handle('db:customers:getLedger', async (_, customerId) => {
    const customer = await getOne('SELECT * FROM customers WHERE id = ?', [customerId]);
    const transactions = await query(
      'SELECT * FROM customer_transactions WHERE customer_id = ? ORDER BY id DESC',
      [customerId]
    );
    return { customer, transactions };
  });

  ipcMain.handle('db:customers:addPayment', async (_, { customer_id, amount, payment_mode, notes }) => {
    const amt = parseFloat(amount);
    await run('UPDATE customers SET current_balance = current_balance - ? WHERE id = ?', [amt, customer_id]);
    await run(
      `INSERT INTO customer_transactions (customer_id, type, amount, payment_mode, notes) VALUES (?, 'CREDIT', ?, ?, ?)`,
      [customer_id, amt, payment_mode || 'Cash', notes || 'Udhar Payment Collection']
    );
    return await getOne('SELECT * FROM customers WHERE id = ?', [customer_id]);
  });

  // Sales & POS Billing Helpers & Handlers
  const getAllSalesHandler = async () => {
    const sales = await query(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.id DESC
    `);

    for (const s of sales) {
      s.items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [s.id]);
    }
    return sales;
  };

  const getSaleByIdHandler = async (id) => {
    const sale = await getOne('SELECT s.*, c.name as customer_name, c.phone as customer_phone FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?', [id]);
    if (sale) {
      sale.items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [id]);
    }
    return sale;
  };

  const createSaleHandler = async (data) => {
    console.log('[IPC sales:create] Received sale payload:', JSON.stringify(data, null, 2));

    try {
      await initializeDatabaseSchema();

      const settings = await getOne('SELECT * FROM settings WHERE id = 1');
      const prefix = settings?.invoice_prefix || 'JCH';

      const countRow = await getOne('SELECT MAX(id) as maxId FROM sales');
      const nextSeq = (countRow?.maxId || 0) + 1;
      const invoiceNo = `${prefix}-${String(nextSeq).padStart(5, '0')}`;
      console.log(`[IPC sales:create] Generated invoiceNo: ${invoiceNo}`);

      const customerId = data.customer_id || 1;
      let customerName = data.customer_name || 'Walk-in Customer';
      if (customerId && (!data.customer_name || data.customer_name === 'Walk-in Customer')) {
        const cust = await getOne('SELECT name, gstin FROM customers WHERE id = ?', [customerId]);
        if (cust) {
          customerName = cust.name;
          if (!data.customer_gstin) data.customer_gstin = cust.gstin || '';
        }
      }

      const { items = [], discount = 0, payment_mode = 'Cash', notes = '', customer_gstin = '', state_code = '' } = data;

      if (!items || items.length === 0) {
        throw new Error('Sale items list is empty.');
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
          [invoiceNo, customerId, customerName, customer_gstin || '', state_code || '', todayDate, currentTime, subtotal, discount, taxAmount, cgstAmount, sgstAmount, netAmount, paidAmount, dueAmount, payment_mode, paymentStatus, notes]
        );

        const saleId = saleRes.lastID;
        console.log(`[IPC sales:create] Inserted sales header row ID: ${saleId}`);

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

        if (dueAmount > 0 && customerId) {
          await run('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?', [dueAmount, customerId]);
          await run(
            `INSERT INTO customer_transactions (customer_id, sale_id, type, amount, payment_mode, notes) VALUES (?, ?, 'DEBIT', ?, ?, ?)`,
            [customerId, saleId, dueAmount, payment_mode, `Invoice #${invoiceNo} Sale Udhar`]
          );
        }

        await run('COMMIT');

        const createdSale = await getOne('SELECT * FROM sales WHERE id = ?', [saleId]);
        createdSale.items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);

        console.log('[IPC sales:create] Transaction committed & sale created:', createdSale.invoice_no);
        return { success: true, sale: createdSale };
      } catch (txErr) {
        console.error('[IPC sales:create TRANSACTION ERROR]:', txErr);
        await run('ROLLBACK');
        throw txErr;
      }
    } catch (err) {
      console.error('[IPC sales:create CRITICAL ERROR]:', err);
      return { success: false, error: `SQLite Sale Error: ${err.message}` };
    }
  };

  const cancelSaleHandler = async (id) => {
    const sale = await getOne('SELECT * FROM sales WHERE id = ?', [id]);
    if (!sale) throw new Error('Sale not found');

    const items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [id]);

    for (const item of items) {
      if (item.product_id) {
        await run(
          `UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [parseFloat(item.quantity), item.product_id]
        );
      }
    }

    if (sale.due_amount > 0 && sale.customer_id) {
      await run('UPDATE customers SET current_balance = MAX(0, current_balance - ?) WHERE id = ?', [sale.due_amount, sale.customer_id]);
    }

    await run('DELETE FROM sale_items WHERE sale_id = ?', [id]);
    await run('DELETE FROM sales WHERE id = ?', [id]);
    return { success: true };
  };

  // Register both naming styles for compatibility
  ipcMain.handle('db:sales:getAll', getAllSalesHandler);
  ipcMain.handle('sales:list', getAllSalesHandler);

  ipcMain.handle('db:sales:getById', (_, id) => getSaleByIdHandler(id));
  ipcMain.handle('sales:get', (_, id) => getSaleByIdHandler(id));

  ipcMain.handle('db:sales:create', (_, data) => createSaleHandler(data));
  ipcMain.handle('sales:create', (_, data) => createSaleHandler(data));

  ipcMain.handle('db:sales:cancel', (_, id) => cancelSaleHandler(id));
  ipcMain.handle('sales:delete', (_, id) => cancelSaleHandler(id));

  ipcMain.handle('sales:count', async () => {
    const row = await getOne('SELECT COUNT(*) as count FROM sales');
    return row ? row.count : 0;
  });

  ipcMain.handle('sales:export', async (_, params = {}) => {
    return await getAllSalesHandler();
  });

  // Expenses CRUD
  ipcMain.handle('db:expenses:getAll', async () => {
    return await query('SELECT * FROM expenses ORDER BY id DESC');
  });

  ipcMain.handle('db:expenses:add', async (_, data) => {
    const res = await run(
      `INSERT INTO expenses (expense_date, category, description, amount, payment_mode, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.expense_date || new Date().toISOString().split('T')[0], data.category, data.description || '', parseFloat(data.amount), data.payment_mode || 'Cash', data.notes || '']
    );
    return await getOne('SELECT * FROM expenses WHERE id = ?', [res.lastID]);
  });

  ipcMain.handle('db:expenses:delete', async (_, id) => {
    await run('DELETE FROM expenses WHERE id = ?', [id]);
    return { success: true };
  });

  // Dashboard & Real Metrics
  ipcMain.handle('db:reports:dashboardSummary', async () => {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = `${today.substring(0, 7)}-01`;

    // Today sales
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

    // Profit Today (Estimated: Sales Net - Expense - Purchase)
    const todayProfit = todaySales - todayExpenses;

    // Total Stock Valuation
    const stockRow = await getOne('SELECT SUM(stock_quantity * selling_price) as valuation, SUM(stock_quantity) as totalQty FROM products');
    const totalStockValuation = stockRow?.valuation || 0;
    const totalStockQuantity = stockRow?.totalQty || 0;

    // Udhar Balance
    const udharRow = await getOne('SELECT SUM(current_balance) as total FROM customers');
    const totalUdharBalance = udharRow?.total || 0;

    // Low stock items
    const lowStockAlerts = await query(`
      SELECT p.*, b.name as brand_name 
      FROM products p 
      LEFT JOIN brands b ON p.brand_id = b.id 
      WHERE p.stock_quantity <= p.min_stock_alert 
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

    return {
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
      totalUdharBalance,
      lowStockAlerts,
      recentSales
    };
  });

  // CA Reports & Custom Date Range Queries
  ipcMain.handle('db:reports:salesReport', async (_, { fromDate, toDate, paymentMode }) => {
    let sql = `
      SELECT s.*, c.name as customer_name, c.gstin as customer_gstin, c.phone as customer_phone
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (fromDate) {
      sql += ` AND s.sale_date >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      sql += ` AND s.sale_date <= ?`;
      params.push(toDate);
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
    return sales;
  });

  ipcMain.handle('db:reports:purchaseReport', async (_, { fromDate, toDate }) => {
    let sql = `SELECT * FROM purchases WHERE 1=1`;
    const params = [];
    if (fromDate) { sql += ` AND purchase_date >= ?`; params.push(fromDate); }
    if (toDate) { sql += ` AND purchase_date <= ?`; params.push(toDate); }
    sql += ` ORDER BY id DESC`;
    const purchases = await query(sql, params);
    for (const p of purchases) {
      p.items = await query('SELECT * FROM purchase_items WHERE purchase_id = ?', [p.id]);
    }
    return purchases;
  });

  ipcMain.handle('db:reports:expenseReport', async (_, { fromDate, toDate, category }) => {
    let sql = `SELECT * FROM expenses WHERE 1=1`;
    const params = [];
    if (fromDate) { sql += ` AND expense_date >= ?`; params.push(fromDate); }
    if (toDate) { sql += ` AND expense_date <= ?`; params.push(toDate); }
    if (category && category !== 'All') { sql += ` AND category = ?`; params.push(category); }
    sql += ` ORDER BY id DESC`;
    return await query(sql, params);
  });

  // Backup & Restore
  ipcMain.handle('db:backup:create', async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const defaultFileName = `JAGDAMBA_BACKUP_${timestamp}.db`;

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Local SQLite Backup',
      defaultPath: defaultFileName,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    });

    if (!filePath) return { cancelled: true };
    return await backupDatabase(filePath);
  });

  ipcMain.handle('db:backup:restore', async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Backup Database to Restore',
      properties: ['openFile'],
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    });

    if (!filePaths || filePaths.length === 0) return { cancelled: true };
    return await restoreDatabase(filePaths[0]);
  });

  // Physical Document Printing via Electron Native Printer (Direct Print Screen Trigger)
  ipcMain.handle('print-document', async (_, htmlContent) => {
    return new Promise((resolve) => {
      try {
        const tempPath = path.join(app.getPath('temp'), `jagdamba_invoice_${Date.now()}.html`);
        fs.writeFileSync(tempPath, htmlContent, 'utf8');

        let printWin = new BrowserWindow({
          width: 850,
          height: 900,
          show: false,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false
          }
        });

        printWin.loadFile(tempPath);

        let printed = false;
        const doPrint = () => {
          if (printed || !printWin || printWin.isDestroyed()) return;
          printed = true;
          printWin.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
            setTimeout(() => {
              if (printWin && !printWin.isDestroyed()) {
                printWin.close();
              }
              try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
            }, 1000);

            if (!success) resolve({ success: false, error: errorType });
            else resolve({ success: true });
          });
        };

        printWin.webContents.on('did-finish-load', doPrint);
        setTimeout(doPrint, 800);
      } catch (err) {
        console.error('[Electron IPC print-document Error]:', err);
        resolve({ success: false, error: err.message });
      }
    });
  });
}

app.whenReady().then(async () => {
  try {
    console.log('[Electron Startup] Starting SQLite & Application Initialization...');
    await initDatabase();
    await initializeDatabaseSchema();
    registerIpcHandlers();
    createWindow();
    console.log('[Electron Startup] Application initialized successfully.');
  } catch (err) {
    console.error('[Electron Startup ERROR] Fatal Initialization Failure:');
    console.error(err);
    if (err && err.stack) {
      console.error(err.stack);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
