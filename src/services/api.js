// Frontend API Adapter routing calls to Electron IPC local SQLite DB

const getElectronAPI = () => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  return null;
};

const api = {
  get: async (url, options = {}) => {
    const params = options.params || {};
    const electron = getElectronAPI();

    if (url === '/health') {
      if (!electron) {
        return { data: { status: 'DISCONNECTED', message: 'Electron IPC unavailable. Please open via Electron desktop app.' } };
      }
      const res = await electron.db?.health();
      return { data: res || { status: 'OK' } };
    }

    if (!electron) {
      console.warn(`[API] Electron API not found for GET ${url}`);
      return { data: null };
    }

    if (url === '/settings') {
      const settings = await electron.db?.getSettings();
      return { data: settings };
    }

    if (url === '/categories') {
      const categories = await electron.db?.getCategories();
      return { data: categories };
    }

    if (url === '/brands') {
      const brands = await electron.db?.getBrands();
      return { data: brands };
    }

    if (url === '/products') {
      const products = await electron.db?.getProducts(params);
      return { data: products };
    }

    if (url.startsWith('/products/')) {
      const id = url.split('/')[2];
      const product = await electron.db?.getProductById(id);
      return { data: product };
    }

    if (url === '/suppliers') {
      const suppliers = await electron.db?.getSuppliers();
      return { data: suppliers };
    }

    if (url === '/purchases') {
      const purchases = await electron.db?.getPurchases();
      return { data: purchases };
    }

    if (url === '/sales') {
      const sales = electron.sales
        ? await electron.sales.list()
        : await electron.db?.getSales();
      return { data: sales || [] };
    }

    if (url.startsWith('/sales/')) {
      const id = url.split('/')[2];
      if (id === 'count') {
        const count = electron.sales
          ? await electron.sales.count()
          : (await electron.db?.getSales())?.length || 0;
        return { data: count };
      }
      const sale = electron.sales
        ? await electron.sales.get(id)
        : await electron.db?.getSaleById(id);
      return { data: sale };
    }

    if (url === '/customers') {
      const customers = await electron.db?.getCustomers();
      return { data: customers };
    }

    if (url.startsWith('/customers/') && url.endsWith('/ledger')) {
      const parts = url.split('/');
      const customerId = parts[2];
      const ledger = await electron.db?.getCustomerLedger(customerId);
      return { data: ledger };
    }

    if (url === '/expenses') {
      const expenses = await electron.db?.getExpenses();
      return { data: expenses };
    }

    if (url === '/reports/dashboard-summary') {
      const summary = await electron.db?.getDashboardSummary();
      return { data: summary };
    }

    if (url === '/reports/sales' || url === '/reports/gst-sales-report') {
      const sales = electron.sales
        ? await electron.sales.export(params)
        : await electron.db?.getSalesReport(params);
      return { data: sales || [] };
    }

    if (url === '/reports/purchases') {
      const purchases = await electron.db?.getPurchaseReport(params);
      return { data: purchases };
    }

    if (url === '/reports/expenses') {
      const expenses = await electron.db?.getExpenseReport(params);
      return { data: expenses };
    }

    throw new Error(`API endpoint not found: ${url}`);
  },

  post: async (url, payload = {}) => {
    const electron = getElectronAPI();
    if (!electron) throw new Error('Electron IPC bridge is not available.');

    if (url === '/settings') {
      const res = await electron.db?.updateSettings(payload);
      return { data: res };
    }

    if (url === '/categories') {
      const res = await electron.db?.addCategory(payload);
      return { data: res };
    }

    if (url === '/brands') {
      const res = await electron.db?.addBrand(payload);
      return { data: res };
    }

    if (url === '/products') {
      const res = await electron.db?.addProduct(payload);
      return { data: res };
    }

    if (url === '/suppliers') {
      const res = await electron.db?.addSupplier(payload);
      return { data: res };
    }

    if (url === '/purchases') {
      const res = await electron.db?.createPurchase(payload);
      return { data: res };
    }

    if (url === '/sales') {
      const res = electron.sales
        ? await electron.sales.create(payload)
        : await electron.db?.createSale(payload);
      return res;
    }

    if (url === '/customers') {
      const res = await electron.db?.addCustomer(payload);
      return { data: res };
    }

    if (url.startsWith('/customers/') && url.endsWith('/payment')) {
      const parts = url.split('/');
      const customerId = parts[2];
      const res = await electron.db?.addCustomerPayment({ customer_id: customerId, ...payload });
      return { data: res };
    }

    if (url === '/expenses') {
      const res = await electron.db?.addExpense(payload);
      return { data: res };
    }

    if (url === '/backup/create') {
      const res = await electron.db?.createBackup();
      return { data: res };
    }

    if (url === '/backup/restore') {
      const res = await electron.db?.restoreBackup();
      return { data: res };
    }

    throw new Error(`API POST endpoint not found: ${url}`);
  },

  put: async (url, payload = {}) => {
    const electron = getElectronAPI();
    if (!electron) throw new Error('Electron IPC bridge is not available.');

    if (url.startsWith('/products/')) {
      const id = url.split('/')[2];
      const res = await electron.db?.updateProduct({ id, ...payload });
      return { data: res };
    }

    throw new Error(`API PUT endpoint not found: ${url}`);
  },

  delete: async (url) => {
    const electron = getElectronAPI();
    if (!electron) throw new Error('Electron IPC bridge is not available.');

    if (url.startsWith('/products/')) {
      const id = url.split('/')[2];
      const res = await electron.db?.deleteProduct(id);
      return { data: res };
    }

    if (url.startsWith('/sales/')) {
      const id = url.split('/')[2];
      const res = electron.sales
        ? await electron.sales.delete(id)
        : await electron.db?.cancelSale(id);
      return { data: res };
    }

    if (url.startsWith('/expenses/')) {
      const id = url.split('/')[2];
      const res = await electron.db?.deleteExpense(id);
      return { data: res };
    }

    throw new Error(`API DELETE endpoint not found: ${url}`);
  }
};

export default api;
