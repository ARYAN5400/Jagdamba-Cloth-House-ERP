import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { POSBilling } from './pages/POSBilling';
import { SalesHistory } from './pages/SalesHistory';
import { Purchases } from './pages/Purchases';
import { KhataLedger } from './pages/KhataLedger';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { BackupRestore } from './pages/BackupRestore';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="pos" element={<POSBilling />} />
            <Route path="sales-history" element={<SalesHistory />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="khata" element={<KhataLedger />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="backup" element={<BackupRestore />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
