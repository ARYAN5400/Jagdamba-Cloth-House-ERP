import express from 'express';
import cors from 'cors';
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
import reportsRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Register API Endpoints
app.use('/api/health', healthRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);

// Initialize DB and launch server
async function startServer() {
  try {
    await initializeDatabaseSchema();
    await seedSampleData();

    app.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`[Jagdamba ERP Backend] Running on http://localhost:${PORT}`);
      console.log(`[Offline Mode] Local SQLite DB ready.`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('[Backend Launch Error]:', error);
  }
}

startServer();
