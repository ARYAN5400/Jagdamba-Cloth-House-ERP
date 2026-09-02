const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  printDocument: (htmlContent) => ipcRenderer.invoke('print-document', htmlContent),

  // SQLite IPC API Bridge
  db: {
    health: () => ipcRenderer.invoke('db:health'),
    getSettings: () => ipcRenderer.invoke('db:settings:get'),
    updateSettings: (data) => ipcRenderer.invoke('db:settings:update', data),
    
    getCategories: () => ipcRenderer.invoke('db:categories:getAll'),
    addCategory: (data) => ipcRenderer.invoke('db:categories:add', data),
    getBrands: () => ipcRenderer.invoke('db:brands:getAll'),
    addBrand: (data) => ipcRenderer.invoke('db:brands:add', data),

    getProducts: (filters) => ipcRenderer.invoke('db:products:getAll', filters),
    getProductById: (id) => ipcRenderer.invoke('db:products:getById', id),
    addProduct: (data) => ipcRenderer.invoke('db:products:add', data),
    updateProduct: (data) => ipcRenderer.invoke('db:products:update', data),
    deleteProduct: (id) => ipcRenderer.invoke('db:products:delete', id),

    getPurchases: () => ipcRenderer.invoke('db:purchases:getAll'),
    createPurchase: (data) => ipcRenderer.invoke('db:purchases:create', data),
    getSuppliers: () => ipcRenderer.invoke('db:suppliers:getAll'),
    addSupplier: (data) => ipcRenderer.invoke('db:suppliers:add', data),

    getSales: () => ipcRenderer.invoke('db:sales:getAll'),
    getSaleById: (id) => ipcRenderer.invoke('db:sales:getById', id),
    createSale: (data) => ipcRenderer.invoke('db:sales:create', data),
    cancelSale: (id) => ipcRenderer.invoke('db:sales:cancel', id),

    getCustomers: () => ipcRenderer.invoke('db:customers:getAll'),
    addCustomer: (data) => ipcRenderer.invoke('db:customers:add', data),
    getCustomerLedger: (id) => ipcRenderer.invoke('db:customers:getLedger', id),
    addCustomerPayment: (data) => ipcRenderer.invoke('db:customers:addPayment', data),

    getExpenses: () => ipcRenderer.invoke('db:expenses:getAll'),
    addExpense: (data) => ipcRenderer.invoke('db:expenses:add', data),
    deleteExpense: (id) => ipcRenderer.invoke('db:expenses:delete', id),

    getDashboardSummary: () => ipcRenderer.invoke('db:reports:dashboardSummary'),
    getSalesReport: (params) => ipcRenderer.invoke('db:reports:salesReport', params),
    getPurchaseReport: (params) => ipcRenderer.invoke('db:reports:purchaseReport', params),
    getExpenseReport: (params) => ipcRenderer.invoke('db:reports:expenseReport', params),

    createBackup: () => ipcRenderer.invoke('db:backup:create'),
    restoreBackup: () => ipcRenderer.invoke('db:backup:restore')
  },

  // Direct Sales IPC API
  sales: {
    list: () => ipcRenderer.invoke('sales:list'),
    get: (id) => ipcRenderer.invoke('sales:get', id),
    create: (data) => ipcRenderer.invoke('sales:create', data),
    delete: (id) => ipcRenderer.invoke('sales:delete', id),
    count: () => ipcRenderer.invoke('sales:count'),
    export: (params) => ipcRenderer.invoke('sales:export', params)
  }
});
