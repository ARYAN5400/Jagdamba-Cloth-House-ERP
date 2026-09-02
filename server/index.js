import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeDatabaseSchema } from './db/schema.js';
import { seedSampleData } from './db/seed.js';

import healthRoutes from './routes/health.js';
import productsRoutes from './routes/products.js';
import categoriesRoutes from './routes/categories.js';
import brandsRoutes from './routes/brands.js';
import customersRoutes from './routes/customers.js';
import suppliersRoutes from './routes/suppliers.js';
import salesRoutes from './routes/sales.js';
import purchasesRoutes from './routes/purchases.js';
import expensesRoutes from './routes/expenses.js';
import reportsRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import backupRoutes from './routes/backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Register API Endpoints
app.use('/api/health', healthRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/backup', backupRoutes);

// Serve static frontend build files in production
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  console.log(`[Static Frontend] Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // SPA fallback for React Router navigation
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log('[Static Frontend] dist folder not found. Run "npm run build" to create production frontend.');
  app.get('/', (req, res) => {
    res.json({
      status: 'OK',
      message: 'Jagdamba Cloth House ERP Backend API is running. Build frontend with npm run build to serve the UI.'
    });
  });
}

// Global 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Initialize DB and launch server
async function startServer() {
  try {
    await initializeDatabaseSchema();
    await seedSampleData();

    app.listen(PORT, HOST, () => {
      console.log(`===================================================`);
      console.log(`[Jagdamba ERP Web Server] Running on http://${HOST}:${PORT}`);
      console.log(`[Environment] ${process.env.NODE_ENV || 'production'}`);
      console.log(`[Database] SQLite ready and initialized.`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('[Backend Launch Error]:', error);
    process.exit(1);
  }
}

startServer();

export default app;
