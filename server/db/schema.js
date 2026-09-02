import { run, query } from "./index.js";

export async function initializeDatabaseSchema() {
  console.log("[Database Schema] Initializing database tables...");

  // Settings Table
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      shop_name TEXT NOT NULL DEFAULT 'Jagdamba Cloth House',
      owner_name TEXT DEFAULT 'Retail Owner',
      phone TEXT DEFAULT '7876413356',
      email TEXT DEFAULT 'jagdambacloth@gmail.com',
      address TEXT DEFAULT 'Main Bazar, GHANOUR',
      gstin TEXT DEFAULT '03BMLPK3243D1ZH',
      bank_name TEXT DEFAULT 'State Bank of India',
      account_no TEXT DEFAULT '12345678901',
      ifsc TEXT DEFAULT 'SBIN0001234',
      invoice_terms TEXT DEFAULT '1. Goods once sold will not be taken back.\n2. 2% p.m. Interest will be charged after 15 days.\n3. Fixed Price, No Exchange, No Return.',
      signature_image TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Ensure signature_image column exists on older database files
  try {
    await run(`ALTER TABLE settings ADD COLUMN signature_image TEXT`);
  } catch (e) {
    // Column already exists
  }

  // Ensure default setting row exists
  const existingSetting = await query("SELECT * FROM settings WHERE id = 1");
  if (existingSetting.length === 0) {
    await run(`INSERT INTO settings (id) VALUES (1)`);
  }

  // Enforce permanent shop details in SQLite row 1
  await run(`
    UPDATE settings SET 
      shop_name = 'Jagdamba Cloth House',
      phone = '7876413356',
      address = 'Main Bazar, GHANOUR',
      gstin = '03BMLPK3243D1ZH'
    WHERE id = 1
  `);

  // Categories Table
  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT DEFAULT 'Suits',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Brands Table
  await run(`
    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products Table (Tailored for Unstitched Clothing & Fabric)
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku_code TEXT UNIQUE,
      barcode TEXT UNIQUE,
      design_no TEXT NOT NULL,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
      fabric_type TEXT DEFAULT 'Cotton',
      unit_type TEXT NOT NULL DEFAULT 'piece', -- 'piece', 'meter', 'set'
      purchase_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      wholesale_price REAL DEFAULT 0,
      mrp REAL DEFAULT 0,
      gst_rate REAL DEFAULT 5,
      hsn_code TEXT DEFAULT '5407',
      stock_quantity REAL DEFAULT 0,
      min_stock_alert REAL DEFAULT 5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Suppliers Table
  await run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company_name TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      gstin TEXT,
      current_balance REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Customers Table (Retail & Udhar Khata)
  await run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      address TEXT,
      city TEXT DEFAULT 'Local',
      gstin TEXT,
      credit_limit REAL DEFAULT 20000,
      current_balance REAL DEFAULT 0, -- Positive means customer owes money (Udhar)
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Default Cash Customer
  const cashCust = await query("SELECT * FROM customers WHERE phone = 'CASH'");
  if (cashCust.length === 0) {
    await run(`
      INSERT INTO customers (name, phone, address, city, credit_limit, current_balance)
      VALUES ('Cash Customer', 'CASH', 'Counter Sale', 'Local', 0, 0)
    `);
  }

  // Purchase Invoices
  await run(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      supplier_id INTEGER REFERENCES suppliers(id),
      purchase_date DATE DEFAULT (DATE('now')),
      total_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'PAID', -- 'PAID', 'PARTIAL', 'DUE'
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Purchase Items
  await run(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      gst_rate REAL DEFAULT 5,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL
    )
  `);

  // Sales / POS Invoices
  await run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      customer_id INTEGER REFERENCES customers(id),
      sale_date DATE DEFAULT (DATE('now')),
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      payment_mode TEXT DEFAULT 'Cash', -- 'Cash', 'UPI', 'Card', 'Credit', 'Split'
      payment_status TEXT DEFAULT 'PAID', -- 'PAID', 'PARTIAL', 'DUE'
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sale Items
  await run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      quantity REAL NOT NULL, -- e.g. 2.5 meters or 1 piece
      unit_price REAL NOT NULL,
      gst_rate REAL DEFAULT 5,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL
    )
  `);

  // Customer Ledger (Khata Transactions)
  await run(`
    CREATE TABLE IF NOT EXISTS customer_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
      type TEXT NOT NULL, -- 'DEBIT' (Sale/Udhar), 'CREDIT' (Payment Received)
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'Cash',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Supplier Ledger (Transactions)
  await run(`
    CREATE TABLE IF NOT EXISTS supplier_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      purchase_id INTEGER REFERENCES purchases(id) ON DELETE SET NULL,
      type TEXT NOT NULL, -- 'CREDIT' (Purchase/Bill), 'DEBIT' (Paid to Supplier)
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'Bank Transfer',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("[Database Schema] Database initialization complete.");
}
