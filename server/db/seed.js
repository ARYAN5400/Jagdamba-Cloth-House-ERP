import { query, run } from './index.js';

export async function seedSampleData() {
  const productsCount = await query('SELECT COUNT(*) as count FROM products');
  if (productsCount[0].count > 0) {
    console.log('[Database Seed] Data already exists, skipping initial seed.');
    return;
  }

  console.log('[Database Seed] Seeding sample data for unstitched clothing...');

  // Seed Categories
  await run(`INSERT OR IGNORE INTO categories (name, type, description) VALUES 
    ('3-Piece Suit Set', 'Suits', 'Top, Bottom, and Dupatta unstitched cut'),
    ('2-Piece Kurti Set', 'Suits', 'Top and Dupatta / Bottom material'),
    ('Fabric Roll (per Meter)', 'Fabric', 'Running rolls for custom cuts'),
    ('Dupatta Heavy', 'Dupatta', 'Fancy Dupatta collection'),
    ('Dress Material (Cotton)', 'Dress', '100% Pure Premium Cotton Material')
  `);

  // Seed Brands
  await run(`INSERT OR IGNORE INTO brands (name, code, description) VALUES 
    ('Ganga Prints', 'GNG', 'Premium Pure Cotton & Silk Suits'),
    ('Ramtex Fabrics', 'RMT', 'High-end Heavy Lawn & Velvet'),
    ('Kesar Trends', 'KSR', 'Dailywear & Boutique Suits'),
    ('Bishnudas Mills', 'BND', 'Quality Shirting & Suiting Rolls'),
    ('Sahiba Prints', 'SHB', 'Designer Chiffon & Organza Suits')
  `);

  // Fetch Category and Brand IDs
  const categories = await query('SELECT * FROM categories');
  const brands = await query('SELECT * FROM brands');

  const catSuit = categories.find(c => c.name.includes('3-Piece'))?.id || 1;
  const catRoll = categories.find(c => c.name.includes('Fabric Roll'))?.id || 3;
  const catDress = categories.find(c => c.name.includes('Dress Material'))?.id || 5;

  const brandGanga = brands.find(b => b.name.includes('Ganga'))?.id || 1;
  const brandRamtex = brands.find(b => b.name.includes('Ramtex'))?.id || 2;
  const brandKesar = brands.find(b => b.name.includes('Kesar'))?.id || 3;

  // Seed Products
  await run(`INSERT OR IGNORE INTO products 
    (sku_code, barcode, design_no, name, category_id, brand_id, fabric_type, unit_type, purchase_price, selling_price, wholesale_price, mrp, gst_rate, hsn_code, stock_quantity, min_stock_alert) 
    VALUES 
    ('SKU-GNG-101', '8901001001', 'D-101', 'Ganga Premium Jam Silk Unstitched Suit', ${catSuit}, ${brandGanga}, 'Jam Silk', 'piece', 1250, 1850, 1500, 2200, 5, '5407', 24, 5),
    ('SKU-RMT-204', '8901001002', 'R-204', 'Ramtex Cotton Lawn Digital Print 3PC', ${catSuit}, ${brandRamtex}, 'Cotton Lawn', 'piece', 980, 1450, 1200, 1750, 5, '5407', 18, 5),
    ('SKU-KSR-502', '8901001003', 'K-502', 'Kesar Embroidery Chiffon Dupatta Set', ${catDress}, ${brandKesar}, 'Chiffon / Cotton', 'piece', 850, 1290, 1050, 1500, 5, '5407', 15, 3),
    ('SKU-FAB-901', '8901001004', 'F-901', 'Pure Cotton Fine Dye Running Roll', ${catRoll}, ${brandRamtex}, 'Pure Cotton', 'meter', 140, 220, 180, 260, 5, '5208', 150.5, 30),
    ('SKU-FAB-902', '8901001005', 'F-902', 'Rayon Foil Print Dress Fabric', ${catRoll}, ${brandKesar}, 'Rayon', 'meter', 110, 175, 140, 200, 5, '5407', 80.0, 20)
  `);

  // Seed Suppliers
  await run(`INSERT OR IGNORE INTO suppliers (name, company_name, phone, email, address, gstin, current_balance) VALUES
    ('Rajesh Textiles', 'Ganga Prints Agency', '+91 98123 45678', 'rajesh@gangaprints.com', 'Textile Market, Surat, Gujarat', '24AAAAA1234A1Z1', 45000),
    ('Sunil Kapoor', 'Ramtex Fabrics Depot', '+91 98987 65432', 'sunil@ramtex.com', 'Wholesale Cloth Market, Ahmedabad', '24BBBBB5678B1Z2', 12500)
  `);

  // Seed Customers
  await run(`INSERT OR IGNORE INTO customers (name, phone, address, city, credit_limit, current_balance) VALUES
    ('Sunita Sharma', '+91 98765 11111', 'House #42, Model Town', 'Local', 25000, 3450),
    ('Pooja Verma', '+91 98765 22222', 'Civil Lines', 'Local', 15000, 0),
    ('Anita Gupta', '+91 98765 33333', 'Sector 14', 'Local', 30000, 7800)
  `);

  console.log('[Database Seed] Sample data seeded successfully.');
}
