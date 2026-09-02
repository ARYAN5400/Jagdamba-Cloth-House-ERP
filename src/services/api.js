// Universal API Adapter supporting both Web Browsers (HTTP /api) and Electron IPC

const getElectronAPI = () => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  return null;
};

// Base URL for web HTTP requests (relative '/api' works on Render, localhost, or any public domain)
const API_BASE_URL = typeof window !== 'undefined' && window.__API_URL__
  ? window.__API_URL__
  : '/api';

const buildUrl = (endpoint, params = {}) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${API_BASE_URL}${cleanEndpoint}`, window.location.origin);
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
};

const handleHttpResponse = async (response) => {
  let json;
  try {
    json = await response.json();
  } catch (e) {
    json = null;
  }

  if (!response.ok) {
    const errorMsg = json?.error || json?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(errorMsg);
  }

  // Normalize response so that res.data is always populated
  // If json is already an object/array, return both top-level and .data
  if (json && typeof json === 'object') {
    if (json.data !== undefined) {
      return json;
    }
    return { ...json, data: json };
  }

  return { data: json };
};

const api = {
  get: async (url, options = {}) => {
    const params = options.params || {};
    const electron = getElectronAPI();

    // 1. Electron Desktop Mode
    if (electron) {
      if (url === '/health') {
        const res = await electron.db?.health();
        return { data: res || { status: 'OK' } };
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
    }

    // 2. Web Browser Mode (Fetch from HTTP API)
    const requestUrl = buildUrl(url, params);
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    return await handleHttpResponse(response);
  },

  post: async (url, payload = {}) => {
    const electron = getElectronAPI();

    // 1. Electron Desktop Mode
    if (electron) {
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
    }

    // 2. Web Browser Mode (Fetch from HTTP API)
    const requestUrl = buildUrl(url);
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: isFormData ? {} : {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: isFormData ? payload : JSON.stringify(payload)
    });

    return await handleHttpResponse(response);
  },

  put: async (url, payload = {}) => {
    const electron = getElectronAPI();

    // 1. Electron Desktop Mode
    if (electron) {
      if (url.startsWith('/products/')) {
        const id = url.split('/')[2];
        const res = await electron.db?.updateProduct({ id, ...payload });
        return { data: res };
      }
      if (url === '/settings') {
        const res = await electron.db?.updateSettings(payload);
        return { data: res };
      }
    }

    // 2. Web Browser Mode (Fetch from HTTP API)
    const requestUrl = buildUrl(url);
    const response = await fetch(requestUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return await handleHttpResponse(response);
  },

  delete: async (url) => {
    const electron = getElectronAPI();

    // 1. Electron Desktop Mode
    if (electron) {
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
    }

    // 2. Web Browser Mode (Fetch from HTTP API)
    const requestUrl = buildUrl(url);
    const response = await fetch(requestUrl, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json'
      }
    });

    return await handleHttpResponse(response);
  }
};

export default api;
