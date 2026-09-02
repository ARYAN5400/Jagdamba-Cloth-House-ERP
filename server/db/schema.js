import { run, query } from './index.js';

export async function initializeDatabaseSchema() {
  console.log('[Database Schema] Initializing database tables...');

  // 1. Settings Table
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      shop_name TEXT NOT NULL DEFAULT 'Jagdamba Cloth House',
      owner_name TEXT DEFAULT 'Retail Owner',
      phone TEXT DEFAULT '7876413356',
      email TEXT DEFAULT 'jagdambacloth@gmail.com',
      address TEXT DEFAULT 'Main Bazar, GHANOUR',
      gstin TEXT DEFAULT '03BMLPK3243D1ZH',
      invoice_prefix TEXT DEFAULT 'JCH',
      financial_year TEXT DEFAULT '2025-26',
      default_gst_rate REAL DEFAULT 5,
      default_payment_mode TEXT DEFAULT 'Cash',
      low_stock_threshold REAL DEFAULT 5,
      currency TEXT DEFAULT '₹',
      bank_name TEXT DEFAULT 'State Bank of India',
      account_no TEXT DEFAULT '12345678901',
      ifsc TEXT DEFAULT 'SBIN0001234',
      invoice_terms TEXT DEFAULT '1. Goods once sold will not be taken back.\n2. 2% p.m. Interest will be charged after 15 days.\n3. Fixed Price, No Exchange, No Return.',
      signature_image TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existingSetting = await query('SELECT * FROM settings WHERE id = 1');
  if (existingSetting.length === 0) {
    await run(`INSERT INTO settings (id) VALUES (1)`);
  }

  // 2. Categories Table
  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT DEFAULT 'Suits',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const catCount = await query('SELECT COUNT(*) as count FROM categories');
  if (catCount[0].count === 0) {
    await run(`INSERT INTO categories (name, type, description) VALUES 
      ('3-Piece Suit Set', 'Suits', 'Top, Bottom, and Dupatta unstitched cut'),
      ('2-Piece Kurti Set', 'Suits', 'Top and Dupatta / Bottom material'),
      ('Fabric Roll (per Meter)', 'Fabric', 'Running rolls for custom cuts'),
      ('Dupatta Heavy', 'Dupatta', 'Fancy Dupatta collection'),
      ('Dress Material (Cotton)', 'Dress', '100% Pure Premium Cotton Material')
    `);
  }

  // 3. Brands Table
  await run(`
    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const brandCount = await query('SELECT COUNT(*) as count FROM brands');
  if (brandCount[0].count === 0) {
    await run(`INSERT INTO brands (name, code, description) VALUES 
      ('Ganga Prints', 'GNG', 'Premium Pure Cotton & Silk Suits'),
      ('Ramtex Fabrics', 'RMT', 'High-end Heavy Lawn & Velvet'),
      ('Kesar Trends', 'KSR', 'Dailywear & Boutique Suits'),
      ('Bishnudas Mills', 'BND', 'Quality Shirting & Suiting Rolls'),
      ('Sahiba Prints', 'SHB', 'Designer Chiffon & Organza Suits')
    `);
  }

  // 4. Products Table
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku_code TEXT UNIQUE,
      barcode TEXT UNIQUE,
      design_no TEXT NOT NULL,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      category_name TEXT,
      brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
      brand_name TEXT,
      fabric_type TEXT DEFAULT 'Cotton',
      colour TEXT,
      size TEXT,
      unit_type TEXT NOT NULL DEFAULT 'piece',
      purchase_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      wholesale_price REAL DEFAULT 0,
      mrp REAL DEFAULT 0,
      gst_rate REAL DEFAULT 5,
      hsn_code TEXT DEFAULT '5407',
      opening_stock REAL DEFAULT 0,
      stock_quantity REAL DEFAULT 0,
      min_stock_alert REAL DEFAULT 5,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Suppliers Table
  await run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      gstin TEXT,
      notes TEXT,
      current_balance REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 6. Customers Table
  await run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      address TEXT,
      city TEXT DEFAULT 'Local',
      gstin TEXT,
      notes TEXT,
      credit_limit REAL DEFAULT 20000,
      current_balance REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const cashCust = await query("SELECT * FROM customers WHERE phone = 'CASH' OR name = 'Walk-in Customer'");
  if (cashCust.length === 0) {
    await run(`
      INSERT INTO customers (name, phone, address, city, credit_limit, current_balance)
      VALUES ('Walk-in Customer', 'CASH', 'Counter Sale', 'Local', 0, 0)
    `);
  }

  // 7. Purchase Invoices
  await run(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      supplier_id INTEGER REFERENCES suppliers(id),
      supplier_name TEXT,
      purchase_date DATE DEFAULT (DATE('now')),
      total_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      payment_mode TEXT DEFAULT 'Cash',
      payment_status TEXT DEFAULT 'PAID',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. Purchase Items
  await run(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT,
      design_no TEXT,
      unit_type TEXT DEFAULT 'piece',
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      gst_rate REAL DEFAULT 5,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL
    )
  `);

  // 9. Sales / POS Invoices
  await run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT DEFAULT 'Walk-in Customer',
      customer_gstin TEXT,
      state_code TEXT,
      sale_date DATE DEFAULT (DATE('now')),
      sale_time TIME DEFAULT (TIME('now')),
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      payment_mode TEXT DEFAULT 'Cash',
      payment_status TEXT DEFAULT 'PAID',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 10. Sale Items
  await run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT,
      design_no TEXT,
      description TEXT,
      unit_type TEXT DEFAULT 'piece',
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      gst_rate REAL DEFAULT 5,
      tax_amount REAL DEFAULT 0,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL
    )
  `);

  // 11. Expenses Table
  await run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_date DATE DEFAULT (DATE('now')),
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'Cash',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 12. Customer Ledger (Khata Transactions)
  await run(`
    CREATE TABLE IF NOT EXISTS customer_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'Cash',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 13. Supplier Ledger (Transactions)
  await run(`
    CREATE TABLE IF NOT EXISTS supplier_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      purchase_id INTEGER REFERENCES purchases(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'Bank Transfer',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 14. Automatic Schema Migrations
  await migrateDatabaseColumns();

  console.log('[Database Schema] Database initialization complete.');
}

async function migrateDatabaseColumns() {
  const salesColumns = [
    { name: 'customer_gstin', type: 'TEXT' },
    { name: 'state_code', type: 'TEXT' },
    { name: 'cgst_amount', type: 'REAL', defaultValue: '0' },
    { name: 'sgst_amount', type: 'REAL', defaultValue: '0' },
    { name: 'tax_amount', type: 'REAL', defaultValue: '0' },
    { name: 'discount', type: 'REAL', defaultValue: '0' },
    { name: 'paid_amount', type: 'REAL', defaultValue: '0' },
    { name: 'due_amount', type: 'REAL', defaultValue: '0' },
    { name: 'payment_mode', type: 'TEXT', defaultValue: "'Cash'" },
    { name: 'payment_status', type: 'TEXT', defaultValue: "'PAID'" }
  ];

  await ensureColumnsExist('sales', salesColumns);

  const saleItemColumns = [
    { name: 'description', type: 'TEXT' },
    { name: 'cgst_amount', type: 'REAL', defaultValue: '0' },
    { name: 'sgst_amount', type: 'REAL', defaultValue: '0' },
    { name: 'tax_amount', type: 'REAL', defaultValue: '0' },
    { name: 'discount', type: 'REAL', defaultValue: '0' },
    { name: 'gst_rate', type: 'REAL', defaultValue: '5' },
    { name: 'unit_type', type: 'TEXT', defaultValue: "'piece'" }
  ];

  await ensureColumnsExist('sale_items', saleItemColumns);

  const customerColumns = [
    { name: 'gstin', type: 'TEXT' },
    { name: 'state_code', type: 'TEXT' },
    { name: 'city', type: 'TEXT', defaultValue: "'Local'" }
  ];

  await ensureColumnsExist('customers', customerColumns);

  const productColumns = [
    { name: 'design_no', type: 'TEXT' },
    { name: 'fabric_type', type: 'TEXT', defaultValue: "'Cotton'" },
    { name: 'unit_type', type: 'TEXT', defaultValue: "'piece'" },
    { name: 'colour', type: 'TEXT' },
    { name: 'size', type: 'TEXT' },
    { name: 'notes', type: 'TEXT' },
    { name: 'opening_stock', type: 'REAL', defaultValue: '0' }
  ];

  await ensureColumnsExist('products', productColumns);

  const settingsColumns = [
    { name: 'signature_image', type: 'TEXT' },
    { name: 'invoice_prefix', type: 'TEXT', defaultValue: "'JCH'" },
    { name: 'financial_year', type: 'TEXT', defaultValue: "'2025-26'" },
    { name: 'default_gst_rate', type: 'REAL', defaultValue: '5' },
    { name: 'default_payment_mode', type: 'TEXT', defaultValue: "'Cash'" },
    { name: 'low_stock_threshold', type: 'REAL', defaultValue: '5' },
    { name: 'currency', type: 'TEXT', defaultValue: "'₹'" },
    { name: 'bank_name', type: 'TEXT', defaultValue: "'State Bank of India'" },
    { name: 'account_no', type: 'TEXT', defaultValue: "'12345678901'" },
    { name: 'ifsc', type: 'TEXT', defaultValue: "'SBIN0001234'" },
    { name: 'invoice_terms', type: 'TEXT' }
  ];

  await ensureColumnsExist('settings', settingsColumns);
}

async function ensureColumnsExist(tableName, columnsToEnsure) {
  try {
    const existingCols = await query(`PRAGMA table_info(${tableName})`);
    const existingNames = new Set(existingCols.map(c => c.name.toLowerCase()));

    for (const col of columnsToEnsure) {
      if (!existingNames.has(col.name.toLowerCase())) {
        let sql = `ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}`;
        if (col.defaultValue !== undefined) {
          sql += ` DEFAULT ${col.defaultValue}`;
        }
        await run(sql);
      }
    }
  } catch (err) {
    console.error(`[Database Migration Error] Failed migrating table '${tableName}':`, err);
  }
}
