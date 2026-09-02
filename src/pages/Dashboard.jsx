import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IndianRupee, 
  ShoppingBag, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Package,
  BookOpen,
  Shirt,
  Truck,
  Receipt,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import api from '../services/api';

export function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    todaySales: 0,
    todayBills: 0,
    cashCollection: 0,
    upiCollection: 0,
    creditSales: 0,
    monthSales: 0,
    todayPurchases: 0,
    todayExpenses: 0,
    todayProfit: 0,
    totalStockValuation: 0,
    totalStockQuantity: 0,
    totalUdharBalance: 0,
    lowStockAlerts: [],
    recentSales: []
  });
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/dashboard-summary');
      if (res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome Banner & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Jagdamba Unstitched Clothing ERP</h2>
          <p className="text-slate-300 text-xs mt-1">
            Realtime Local SQLite Engine • 100% Offline Retail ERP
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => navigate('/pos')}
            className="bg-brand-500 hover:bg-brand-400 text-white font-bold shadow-lg text-xs"
            icon={Plus}
          >
            New Sale (POS)
          </Button>
          <Button
            onClick={() => navigate('/inventory')}
            variant="outline"
            className="border-slate-700 text-white hover:bg-slate-800 text-xs"
            icon={Package}
          >
            + Product
          </Button>
          <Button
            onClick={() => navigate('/purchases')}
            variant="outline"
            className="border-slate-700 text-white hover:bg-slate-800 text-xs"
            icon={Truck}
          >
            + Purchase
          </Button>
          <Button
            onClick={() => navigate('/expenses')}
            variant="outline"
            className="border-slate-700 text-white hover:bg-slate-800 text-xs"
            icon={Receipt}
          >
            + Expense
          </Button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales Collection"
          value={`₹${parseFloat(summary.todaySales || 0).toLocaleString('en-IN')}`}
          subtitle={`${summary.todayBills || 0} counter sales generated today`}
          icon={IndianRupee}
          color="blue"
        />
        <StatCard
          title="This Month Sales"
          value={`₹${parseFloat(summary.monthSales || 0).toLocaleString('en-IN')}`}
          subtitle="Monthly total collection"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Total Stock Value"
          value={`₹${parseFloat(summary.totalStockValuation || 0).toLocaleString('en-IN')}`}
          subtitle={`${summary.totalStockQuantity || 0} items / meters in shop`}
          icon={Shirt}
          color="indigo"
        />
        <StatCard
          title="Customer Udhar (Khata)"
          value={`₹${parseFloat(summary.totalUdharBalance || 0).toLocaleString('en-IN')}`}
          subtitle="Total pending customer credit"
          icon={BookOpen}
          color="rose"
        />
      </div>

      {/* Cash / UPI Collection & Profit Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Cash Collection Today</span>
            <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
              ₹{parseFloat(summary.cashCollection || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
            CASH
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">UPI / QR Collection Today</span>
            <div className="text-xl font-extrabold text-brand-600 font-mono mt-0.5">
              ₹{parseFloat(summary.upiCollection || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">
            UPI
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Estimated Net Profit Today</span>
            <div className={`text-xl font-extrabold font-mono mt-0.5 ${summary.todayProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ₹{parseFloat(summary.todayProfit || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            PROFIT
          </div>
        </div>
      </div>

      {/* Low Stock Alerts & Recent Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales Bills */}
        <Card
          className="lg:col-span-2"
          title="Recent Counter Invoices"
          subtitle="Latest sales saved permanently in SQLite"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/sales-history')} icon={ArrowRight}>
              Sales History
            </Button>
          }
        >
          {summary.recentSales.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No sales invoices recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                    <th className="pb-3">Invoice No</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Mode</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {summary.recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-bold text-brand-600">{sale.invoice_no}</td>
                      <td className="py-3 text-slate-800 font-semibold">{sale.customer_name || 'Walk-in Customer'}</td>
                      <td className="py-3 text-slate-600 text-xs font-bold">{sale.payment_mode}</td>
                      <td className="py-3 text-right font-extrabold text-slate-900">₹{parseFloat(sale.net_amount).toLocaleString('en-IN')}</td>
                      <td className="py-3 text-center">
                        <Badge variant={sale.payment_status === 'PAID' ? 'success' : 'amber'}>
                          {sale.payment_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Low Stock Alerts */}
        <Card
          title="Low Stock Alerts"
          subtitle="Products below minimum threshold"
          action={<AlertTriangle className="w-5 h-5 text-amber-500" />}
        >
          {summary.lowStockAlerts.length === 0 ? (
            <div className="text-center py-12 text-emerald-600 font-bold text-sm flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <span>All inventory stock levels are healthy!</span>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.lowStockAlerts.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                    <span className="text-xs text-slate-500">Design #{item.design_no} • {item.brand_name || 'Generic'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-amber-800 text-sm block">{item.stock_quantity} {item.unit_type}s</span>
                    <p className="text-[11px] text-amber-600">Threshold: {item.min_stock_alert}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
