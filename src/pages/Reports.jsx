import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, FileText, Calendar, Filter, RefreshCw, Download, BarChart3 } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function Reports() {
  const { addToast, shopSettings } = useApp();
  const [reportType, setReportType] = useState('sales'); // 'sales', 'purchases', 'expenses', 'stock'
  const [preset, setPreset] = useState('thisMonth');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Set date preset helpers
  const applyPreset = (presetKey) => {
    setPreset(presetKey);
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (presetKey === 'today') {
      start = today;
      end = today;
    } else if (presetKey === 'yesterday') {
      start = new Date(today);
      start.setDate(today.getDate() - 1);
      end = start;
    } else if (presetKey === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = today;
    } else if (presetKey === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (presetKey === 'last3Months') {
      start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
      end = today;
    } else if (presetKey === 'fy2025_26') {
      start = new Date('2025-04-01');
      end = new Date('2026-03-31');
    } else if (presetKey === 'fy2026_27') {
      start = new Date('2026-04-01');
      end = new Date('2027-03-31');
    }

    setFromDate(start.toISOString().split('T')[0]);
    setToDate(end.toISOString().split('T')[0]);
  };

  useEffect(() => {
    applyPreset('thisMonth');
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'sales') {
        const res = await api.get('/reports/sales', { params: { fromDate, toDate } });
        setReportData(res.data || []);
      } else if (reportType === 'purchases') {
        const res = await api.get('/reports/purchases', { params: { fromDate, toDate } });
        setReportData(res.data || []);
      } else if (reportType === 'expenses') {
        const res = await api.get('/reports/expenses', { params: { fromDate, toDate } });
        setReportData(res.data || []);
      } else if (reportType === 'stock') {
        const res = await api.get('/products');
        setReportData(res.data || []);
      }
    } catch (err) {
      addToast('Failed to fetch report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fromDate && toDate) {
      fetchReport();
    }
  }, [reportType, fromDate, toDate]);

  const exportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(`${reportType.toUpperCase()} Report`);

      sheet.addRow([shopSettings.shop_name || 'JAGDAMBA CLOTH HOUSE']);
      sheet.addRow([`Report Type: ${reportType.toUpperCase()} | Date Range: ${fromDate} to ${toDate}`]);
      sheet.addRow([`GSTIN: ${shopSettings.gstin || 'N/A'}`]);
      sheet.addRow([]);

      if (reportType === 'sales') {
        sheet.addRow(['Invoice No', 'Date', 'Customer', 'Subtotal (₹)', 'CGST (₹)', 'SGST (₹)', 'Total Tax (₹)', 'Grand Total (₹)', 'Paid (₹)', 'Balance (₹)', 'Mode']);
        sheet.getRow(5).font = { bold: true };

        reportData.forEach((row) => {
          const cgst = row.cgst_amount !== undefined ? row.cgst_amount : (row.tax_amount / 2);
          const sgst = row.sgst_amount !== undefined ? row.sgst_amount : (row.tax_amount / 2);
          sheet.addRow([
            row.invoice_no,
            row.sale_date,
            row.customer_name || 'Walk-in',
            row.subtotal,
            cgst,
            sgst,
            row.tax_amount,
            row.net_amount,
            row.paid_amount,
            row.due_amount,
            row.payment_mode
          ]);
        });
      } else if (reportType === 'purchases') {
        sheet.addRow(['Invoice No', 'Date', 'Supplier', 'Subtotal (₹)', 'Tax (₹)', 'Net Total (₹)', 'Paid (₹)', 'Status']);
        sheet.getRow(5).font = { bold: true };

        reportData.forEach((row) => {
          sheet.addRow([
            row.invoice_no,
            row.purchase_date,
            row.supplier_name || 'Wholesaler',
            row.total_amount,
            row.tax_amount,
            row.net_amount,
            row.paid_amount,
            row.payment_status
          ]);
        });
      } else if (reportType === 'expenses') {
        sheet.addRow(['Date', 'Category', 'Description', 'Amount (₹)', 'Mode']);
        sheet.getRow(5).font = { bold: true };

        reportData.forEach((row) => {
          sheet.addRow([
            row.expense_date,
            row.category,
            row.description || '',
            row.amount,
            row.payment_mode
          ]);
        });
      } else if (reportType === 'stock') {
        sheet.addRow(['Product Name', 'Design No', 'Brand', 'Category', 'Unit', 'Purchase Price', 'Selling Price', 'Stock Qty', 'Valuation']);
        sheet.getRow(5).font = { bold: true };

        reportData.forEach((p) => {
          sheet.addRow([
            p.name,
            p.design_no,
            p.brand_name || '',
            p.category_name || '',
            p.unit_type,
            p.purchase_price,
            p.selling_price,
            p.stock_quantity,
            p.stock_quantity * p.selling_price
          ]);
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JAGDAMBA_${reportType.toUpperCase()}_${fromDate}_to_${toDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      addToast(`Excel report generated for CA!`, 'success');
    } catch (err) {
      addToast('Failed to export Excel', 'error');
    }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(shopSettings.shop_name || 'JAGDAMBA CLOTH HOUSE', 14, 18);
      doc.setFontSize(10);
      doc.text(`Official ${reportType.toUpperCase()} Statement (${fromDate} to ${toDate})`, 14, 24);

      let head = [];
      let body = [];

      if (reportType === 'sales') {
        head = [['Invoice #', 'Date', 'Customer', 'Net Amount', 'Paid', 'Balance', 'Mode']];
        body = reportData.map(r => [r.invoice_no, r.sale_date, r.customer_name || 'Walk-in', `₹${r.net_amount}`, `₹${r.paid_amount}`, `₹${r.due_amount}`, r.payment_mode]);
      } else if (reportType === 'purchases') {
        head = [['Invoice #', 'Date', 'Supplier', 'Net Total', 'Paid', 'Status']];
        body = reportData.map(r => [r.invoice_no, r.purchase_date, r.supplier_name || 'Wholesaler', `₹${r.net_amount}`, `₹${r.paid_amount}`, r.payment_status]);
      } else if (reportType === 'expenses') {
        head = [['Date', 'Category', 'Description', 'Amount', 'Mode']];
        body = reportData.map(r => [r.expense_date, r.category, r.description || '', `₹${r.amount}`, r.payment_mode]);
      } else {
        head = [['Product', 'Design', 'Unit', 'Selling Rate', 'Stock Qty', 'Valuation']];
        body = reportData.map(p => [p.name, p.design_no, p.unit_type, `₹${p.selling_price}`, p.stock_quantity, `₹${(p.stock_quantity * p.selling_price).toFixed(2)}`]);
      }

      doc.autoTable({
        startY: 30,
        head: head,
        body: body,
        theme: 'grid'
      });

      doc.save(`JAGDAMBA_${reportType.toUpperCase()}_Report_${fromDate}.pdf`);
      addToast('PDF Report downloaded successfully!', 'success');
    } catch (err) {
      addToast('Failed to export PDF', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">CA Reports & Business Intelligence</h2>
          <p className="text-xs text-slate-500 mt-1">Export formatted Excel spreadsheets and PDF audit statements for your Chartered Accountant</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={exportExcel} icon={FileSpreadsheet} className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white">
            Export Excel for CA (.xlsx)
          </Button>
          <Button onClick={exportPDF} icon={FileText} variant="outline" className="font-bold">
            Export PDF Statement
          </Button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-700 mr-2">Report Module:</span>
          {[
            { key: 'sales', label: 'Sales Register' },
            { key: 'purchases', label: 'Purchases Register' },
            { key: 'expenses', label: 'Expenses Register' },
            { key: 'stock', label: 'Stock Valuation' }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setReportType(item.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                reportType === item.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-500">Quick Date Presets</label>
            <select
              className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800"
              value={preset}
              onChange={(e) => applyPreset(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="last3Months">Last 3 Months</option>
              <option value="fy2025_26">Financial Year 2025-26 (01/04/25 - 31/03/26)</option>
              <option value="fy2026_27">Financial Year 2026-27 (01/04/26 - 31/03/27)</option>
            </select>
          </div>

          <Input
            label="From Date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />

          <Input
            label="To Date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />

          <div className="flex items-end">
            <Button onClick={fetchReport} icon={RefreshCw} className="w-full">
              Generate Report
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Table Preview */}
      <Card title={`${reportType.toUpperCase()} Report Preview (${fromDate} to ${toDate})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 bg-slate-50/80">
                {reportType === 'sales' && (
                  <>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-right">GST Tax</th>
                    <th className="p-3 text-right">Net Bill</th>
                    <th className="p-3 text-center">Mode</th>
                  </>
                )}
                {reportType === 'purchases' && (
                  <>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Supplier</th>
                    <th className="p-3 text-right">Tax</th>
                    <th className="p-3 text-right">Grand Total</th>
                    <th className="p-3 text-center">Status</th>
                  </>
                )}
                {reportType === 'expenses' && (
                  <>
                    <th className="p-3">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Mode</th>
                  </>
                )}
                {reportType === 'stock' && (
                  <>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Design #</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3 text-right">Selling Rate</th>
                    <th className="p-3 text-center">Stock Qty</th>
                    <th className="p-3 text-right">Total Valuation</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="7" className="p-12 text-center text-slate-400">Querying SQLite database...</td></tr>
              ) : reportData.length === 0 ? (
                <tr><td colSpan="7" className="p-12 text-center text-slate-400">No records found for the selected date range.</td></tr>
              ) : (
                reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    {reportType === 'sales' && (
                      <>
                        <td className="p-3 font-bold text-brand-600">{row.invoice_no}</td>
                        <td className="p-3 text-xs text-slate-500">{row.sale_date}</td>
                        <td className="p-3 text-slate-800 font-semibold">{row.customer_name || 'Walk-in'}</td>
                        <td className="p-3 text-right font-mono">₹{parseFloat(row.subtotal || 0).toFixed(2)}</td>
                        <td className="p-3 text-right font-mono">₹{parseFloat(row.tax_amount || 0).toFixed(2)}</td>
                        <td className="p-3 text-right font-extrabold text-slate-900">₹{parseFloat(row.net_amount || 0).toFixed(2)}</td>
                        <td className="p-3 text-center text-xs font-bold">{row.payment_mode}</td>
                      </>
                    )}
                    {reportType === 'purchases' && (
                      <>
                        <td className="p-3 font-bold text-brand-600">{row.invoice_no}</td>
                        <td className="p-3 text-xs text-slate-500">{row.purchase_date}</td>
                        <td className="p-3 text-slate-800 font-semibold">{row.supplier_name}</td>
                        <td className="p-3 text-right font-mono">₹{parseFloat(row.tax_amount || 0).toFixed(2)}</td>
                        <td className="p-3 text-right font-extrabold text-slate-900">₹{parseFloat(row.net_amount || 0).toFixed(2)}</td>
                        <td className="p-3 text-center text-xs font-bold">{row.payment_status}</td>
                      </>
                    )}
                    {reportType === 'expenses' && (
                      <>
                        <td className="p-3 text-xs text-slate-500">{row.expense_date}</td>
                        <td className="p-3 font-bold text-slate-800">{row.category}</td>
                        <td className="p-3 text-xs text-slate-600">{row.description || '—'}</td>
                        <td className="p-3 text-right font-bold text-rose-600">₹{parseFloat(row.amount).toFixed(2)}</td>
                        <td className="p-3 text-center text-xs">{row.payment_mode}</td>
                      </>
                    )}
                    {reportType === 'stock' && (
                      <>
                        <td className="p-3 font-bold text-slate-900">{row.name}</td>
                        <td className="p-3 text-xs font-mono">#{row.design_no}</td>
                        <td className="p-3 text-xs text-slate-600">{row.brand_name || 'Generic'}</td>
                        <td className="p-3 text-right font-mono">₹{row.selling_price}</td>
                        <td className="p-3 text-center font-bold">{row.stock_quantity} {row.unit_type}s</td>
                        <td className="p-3 text-right font-extrabold text-emerald-600">
                          ₹{(row.stock_quantity * row.selling_price).toFixed(2)}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
