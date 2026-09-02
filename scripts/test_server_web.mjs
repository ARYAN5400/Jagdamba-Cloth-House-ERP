import '../server/index.js';

async function testAll() {
  console.log('Waiting for server initialization...');
  await new Promise(r => setTimeout(r, 2000));

  const testEndpoints = [
    'http://localhost:5000/api/health',
    'http://localhost:5000/api/settings',
    'http://localhost:5000/api/categories',
    'http://localhost:5000/api/brands',
    'http://localhost:5000/api/products',
    'http://localhost:5000/api/customers',
    'http://localhost:5000/api/suppliers',
    'http://localhost:5000/api/sales',
    'http://localhost:5000/api/purchases',
    'http://localhost:5000/api/expenses',
    'http://localhost:5000/api/reports/dashboard-summary',
    'http://localhost:5000/'
  ];

  let failed = 0;
  for (const url of testEndpoints) {
    try {
      const res = await fetch(url);
      const isOk = res.status === 200 || res.status === 304;
      if (isOk) {
        console.log(`[PASS] ${url} -> Status: ${res.status}`);
      } else {
        console.error(`[FAIL] ${url} -> Status: ${res.status}`);
        failed++;
      }
    } catch (e) {
      console.error(`[FAIL] ${url} -> Error: ${e.message}`);
      failed++;
    }
  }

  // Test creating a sale via POST /api/sales
  try {
    const salePayload = {
      customer_id: 1,
      customer_name: 'Test Web Customer',
      items: [
        {
          name: 'Test Cotton Suit',
          design_no: 'TEST-01',
          quantity: 1,
          unit_price: 1500,
          gst_rate: 5
        }
      ],
      payment_mode: 'Cash',
      paid_amount: 1575
    };
    const saleRes = await fetch('http://localhost:5000/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salePayload)
    });
    const saleJson = await saleRes.json();
    if (saleJson.success) {
      console.log(`[PASS] POST /api/sales -> Created Invoice: ${saleJson.invoiceNo}`);
    } else {
      console.error(`[FAIL] POST /api/sales -> Error:`, saleJson);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] POST /api/sales Exception:`, err.message);
    failed++;
  }

  // Test creating an expense via POST /api/expenses
  try {
    const expPayload = {
      category: 'Rent',
      amount: 5000,
      description: 'Monthly Store Rent',
      payment_mode: 'UPI'
    };
    const expRes = await fetch('http://localhost:5000/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expPayload)
    });
    const expJson = await expRes.json();
    if (expJson.id) {
      console.log(`[PASS] POST /api/expenses -> Created Expense ID: ${expJson.id}`);
    } else {
      console.error(`[FAIL] POST /api/expenses -> Error:`, expJson);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] POST /api/expenses Exception:`, err.message);
    failed++;
  }

  if (failed === 0) {
    console.log('\n=========================================');
    console.log('ALL API & WEB ENDPOINTS PASSED PERFECTLY!');
    console.log('=========================================\n');
    process.exit(0);
  } else {
    console.error(`\nFAILED ${failed} test(s)`);
    process.exit(1);
  }
}

testAll();
