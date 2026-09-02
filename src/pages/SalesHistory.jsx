import React, { useState, useEffect } from 'react';
import { Search, Printer, FileText, Trash2, Eye, Calendar, Filter, RefreshCw, AlertTriangle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { generatePDFDocument, printThermalReceipt, printDocumentHtml } from '../components/common/PrintInvoice';
import { exportSalesToExcel } from '../utils/excelExport';
import { generateSalesReportPDF } from '../utils/pdfReportExport';
import { exportSalesToWord, generateSingleInvoiceWordDocument } from '../utils/wordReportExport';
import { getShopSignatureImage } from '../utils/signatureHelper';
import { numberToWords } from '../utils/numberToWords';

export function SalesHistory() {
  const { addToast, shopSettings } = useApp();
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);

  // Selected Sale Modal for Viewing Details / Reprinting
  const [selectedSale, setSelectedSale] = useState(null);

  // Cancel / Delete Sale Modal
  const [cancelSaleId, setCancelSaleId] = useState(null);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales');
      setSales(res.data || []);
    } catch (err) {
      addToast('Failed to fetch sales history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handlePrint = async (sale) => {
    const htmlContent = printThermalReceipt(sale, shopSettings);
    await printDocumentHtml(htmlContent);
  };

  const handlePDF = (sale) => {
    const doc = generatePDFDocument(sale, shopSettings);
    doc.save(`${sale.invoice_no}.pdf`);
    addToast(`PDF downloaded for Invoice ${sale.invoice_no}`, 'success');
  };

  const handleWord = (sale) => {
    try {
      generateSingleInvoiceWordDocument(sale, shopSettings);
      addToast(`Word invoice downloaded for Invoice ${sale.invoice_no}`, 'success');
    } catch (err) {
      console.error('[Single Word Invoice Error]:', err);
      addToast(err.message || 'Unable to generate Word invoice. Please try again.', 'error');
    }
  };

  const handleCancelSale = async () => {
    if (!cancelSaleId) return;
    try {
      await api.delete(`/sales/${cancelSaleId}`);
      addToast('Sale cancelled successfully. Item stocks restored!', 'success');
      setCancelSaleId(null);
      fetchSales();
    } catch (err) {
      addToast('Failed to cancel sale', 'error');
    }
  };

  const handleExportExcel = async () => {
    if (filteredSales.length === 0) {
      addToast('No sales found for the selected date range.', 'warning');
      return;
    }

    setExportingExcel(true);
    try {
      await exportSalesToExcel(filteredSales, fromDate, toDate);
      addToast('Sales Excel exported successfully.', 'success');
    } catch (err) {
      console.error('[Excel Export Error]:', err);
      addToast(err.message || 'Failed to export sales Excel', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    if (filteredSales.length === 0) {
      addToast('No sales found for the selected date range.', 'warning');
      return;
    }

    setExportingPDF(true);
    try {
      const doc = generateSalesReportPDF(filteredSales, fromDate, toDate, shopSettings);
      const fromStr = fromDate ? fromDate.split('-').reverse().join('-') : 'Start';
      const toStr = toDate ? toDate.split('-').reverse().join('-') : 'End';
      doc.save(`Jagdamba_Sales_${fromStr}_to_${toStr}.pdf`);
      addToast('Sales PDF Report downloaded successfully.', 'success');
    } catch (err) {
      console.error('[PDF Export Error]:', err);
      addToast(err.message || 'Failed to export sales PDF', 'error');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportWord = async () => {
    if (filteredSales.length === 0) {
      addToast('No sales found for the selected date range.', 'warning');
      return;
    }

    setExportingWord(true);
    try {
      await exportSalesToWord(filteredSales, fromDate, toDate, shopSettings);
      addToast('Sales Word Report exported successfully.', 'success');
    } catch (err) {
      console.error('[Word Export Error]:', err);
      addToast(err.message || 'Failed to export sales Word report', 'error');
    } finally {
      setExportingWord(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    const searchTerm = search.trim().toLowerCase();
    const matchesSearch = 
      !searchTerm ||
      (s.invoice_no && s.invoice_no.toLowerCase().includes(searchTerm)) ||
      (s.customer_name && s.customer_name.toLowerCase().includes(searchTerm));

    const matchesMode = paymentFilter === 'All' || s.payment_mode === paymentFilter;

    // Clean YYYY-MM-DD date matching (inclusive of start and end date)
    const saleDateStr = (s.sale_date || '').split('T')[0].trim();
    const matchesFrom = !fromDate || (saleDateStr && saleDateStr >= fromDate);
    const matchesTo = !toDate || (saleDateStr && saleDateStr <= toDate);

    return matchesSearch && matchesMode && matchesFrom && matchesTo;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Sales Invoice History</h2>
          <p className="text-xs text-slate-500 mt-1">Review past counter sales, reprint bills, export PDFs, or export Excel/PDF/Word reports</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={fetchSales} icon={RefreshCw} className="flex-1 sm:flex-initial text-xs">
            Refresh
          </Button>
          <Button 
            onClick={handleExportExcel} 
            disabled={exportingExcel} 
            icon={FileSpreadsheet} 
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex-1 sm:flex-initial text-xs"
          >
            {exportingExcel ? 'Exporting...' : 'Excel'}
          </Button>
          <Button 
            onClick={handleExportPDF} 
            disabled={exportingPDF} 
            icon={FileText} 
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold flex-1 sm:flex-initial text-xs"
          >
            {exportingPDF ? 'Exporting...' : 'PDF'}
          </Button>
          <Button 
            onClick={handleExportWord} 
            disabled={exportingWord} 
            icon={FileText} 
            className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold flex-1 sm:flex-initial text-xs"
          >
            {exportingWord ? 'Exporting...' : 'Word'}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-3.5 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <Input
            placeholder="Search by Invoice No or Customer..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="All">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Credit">Credit (Udhar)</option>
          </select>

          <Input
            type="date"
            placeholder="From Date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />

          <Input
            type="date"
            placeholder="To Date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </Card>

      {/* Sales Table */}
      <Card>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 bg-slate-50/80">
                <th className="p-4">Invoice No & Date</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4 text-center">Items Count</th>
                <th className="p-4 text-right">Net Amount</th>
                <th className="p-4 text-right">Paid Amount</th>
                <th className="p-4 text-right">Balance Due</th>
                <th className="p-4 text-center">Mode & Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="8" className="p-12 text-center text-slate-400">Loading sales history...</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan="8" className="p-12 text-center text-slate-400">No sales transactions found matching criteria.</td></tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-extrabold text-brand-600">{s.invoice_no}</div>
                      <span className="text-xs text-slate-400">{s.sale_date} {s.sale_time}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-800">{s.customer_name || 'Walk-in Customer'}</td>
                    <td className="p-4 text-center font-bold text-slate-600">{(s.items || []).length} items</td>
                    <td className="p-4 text-right font-extrabold text-slate-900">₹{parseFloat(s.net_amount || 0).toFixed(2)}</td>
                    <td className="p-4 text-right font-mono text-emerald-600">₹{parseFloat(s.paid_amount || 0).toFixed(2)}</td>
                    <td className="p-4 text-right font-mono text-red-600">
                      {s.due_amount > 0 ? `₹${parseFloat(s.due_amount).toFixed(2)}` : '₹0'}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={s.payment_status === 'PAID' ? 'success' : 'amber'}>
                        {s.payment_mode} ({s.payment_status})
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedSale(s)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg"
                          title="View Invoice Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(s)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                          title="Reprint Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePDF(s)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg"
                          title="Download PDF Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleWord(s)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                          title="Download Word Invoice"
                        >
                          <FileText className="w-4 h-4 text-indigo-600" />
                        </button>
                        <button
                          onClick={() => setCancelSaleId(s.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Cancel/Delete Sale"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sale Details Modal */}
      {selectedSale && (
        <Modal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          title={`Invoice Preview: #${selectedSale.invoice_no}`}
        >
          <div className="space-y-4 max-h-[80vh] overflow-y-auto p-1 font-sans text-slate-900">
            {/* Clean Retail GST Tax Invoice Sheet */}
            <div className="bg-white text-slate-900 p-5 rounded-sm border border-slate-300 text-xs font-sans leading-relaxed">
              {/* 1. Header Section */}
              <div className="border border-slate-300 p-3.5 mb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-slate-600 uppercase mb-0.5">
                      RETAIL TAX INVOICE
                    </div>
                    <h1 className="text-lg font-bold text-slate-900 uppercase tracking-tight leading-tight">
                      JAGDAMBA CLOTH HOUSE
                    </h1>
                    <p className="text-slate-700 text-[11px] font-medium mt-0.5">Main Bazar, GHANOUR</p>
                    <div className="text-[11px] text-slate-700 mt-1 space-x-2">
                      <span><strong>GSTIN:</strong> 03BMLPK3243D1ZH</span>
                      <span className="text-slate-400">|</span>
                      <span><strong>Mob.:</strong> 7876413356</span>
                    </div>
                  </div>

                  <div className="text-right border-l border-slate-300 pl-4">
                    <table className="text-[11px] text-left border-collapse">
                      <tbody>
                        <tr>
                          <td className="pr-3 text-slate-600 font-medium py-0.5">Invoice No.:</td>
                          <td className="font-bold text-slate-900 py-0.5">{selectedSale.invoice_no}</td>
                        </tr>
                        <tr>
                          <td className="pr-3 text-slate-600 font-medium py-0.5">Date:</td>
                          <td className="font-semibold text-slate-900 py-0.5">{selectedSale.sale_date || new Date().toLocaleDateString('en-IN')}</td>
                        </tr>
                        <tr>
                          <td className="pr-3 text-slate-600 font-medium py-0.5">Time:</td>
                          <td className="font-semibold text-slate-900 py-0.5">{selectedSale.sale_time || '03:15 PM'}</td>
                        </tr>
                        <tr>
                          <td className="pr-3 text-slate-600 font-medium py-0.5">State Code:</td>
                          <td className="font-semibold text-slate-900 py-0.5">140702</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 2. Customer Information Grid (BILLED TO) */}
              <div className="border border-slate-300 p-3 mb-3 bg-slate-50/50">
                <div className="text-[10px] font-bold uppercase text-slate-600 tracking-wider mb-1.5 pb-1 border-b border-slate-200">
                  Billed To (Customer Details)
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <div className="flex">
                    <span className="text-slate-600 w-28 flex-shrink-0">Customer Name:</span>
                    <span className="font-bold text-slate-900">{selectedSale.customer_name || 'Walk-in Customer'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 w-28 flex-shrink-0">Payment Mode:</span>
                    <span className="font-bold text-slate-900 uppercase">{selectedSale.payment_mode || 'Cash'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 w-28 flex-shrink-0">Mobile Number:</span>
                    <span className="font-bold text-slate-900">{selectedSale.customer_phone || selectedSale.phone || 'N/A'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 w-28 flex-shrink-0">Customer GSTIN:</span>
                    <span className="font-bold text-slate-900">{selectedSale.customer_gstin || 'CASH'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Items Table */}
              <div className="border border-slate-300 mb-3 overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold text-[10px] uppercase tracking-wide border-b border-slate-300">
                      <th className="py-2 px-2.5 w-12 text-center border-r border-slate-300 font-bold text-slate-900">S.NO.</th>
                      <th className="py-2 px-2.5 w-14 text-center border-r border-slate-300 font-bold text-slate-900">QTY</th>
                      <th className="py-2 px-3 text-left border-r border-slate-300 font-bold text-slate-900">PARTICULARS / ITEM DESCRIPTION</th>
                      <th className="py-2 px-3 w-24 text-right border-r border-slate-300 font-bold text-slate-900">RATE (Rs.)</th>
                      <th className="py-2 px-3 w-28 text-right font-bold text-slate-900">AMOUNT (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(selectedSale.items || []).map((item, idx) => {
                      const qty = parseFloat(item.quantity || 1);
                      const rate = parseFloat(item.unit_price || 0);
                      const itemSub = parseFloat(item.total_amount || (qty * rate));
                      const unitType = item.unit_type ? item.unit_type.toUpperCase() : 'PCS';
                      const qtyDisplay = Number.isInteger(qty) ? `${qty} ${unitType}` : `${qty.toFixed(2)} ${unitType}`;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2 px-2.5 text-center text-slate-600 border-r border-slate-200">{idx + 1}</td>
                          <td className="py-2 px-2.5 text-center font-medium text-slate-900 border-r border-slate-200">{qtyDisplay}</td>
                          <td className="py-2 px-3 text-slate-900 border-r border-slate-200 font-semibold">
                            {item.product_name || item.name || 'Clothing Item'}
                            {item.design_no && <span className="ml-1 text-[10px] text-slate-500 font-normal">(Des: #{item.design_no})</span>}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-800 border-r border-slate-200">₹{rate.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">₹{itemSub.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 4. Totals & Payment Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="space-y-2">
                  <div className="border border-slate-300 p-2.5 bg-slate-50/30">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Amount in Words</span>
                    <p className="font-semibold italic text-slate-900 text-[11px] leading-snug">
                      {numberToWords(selectedSale.net_amount || 0)}
                    </p>
                  </div>

                  <div className="border border-slate-300 p-2.5 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Paid Amount:</span>
                      <span className="font-bold text-slate-900 font-mono">₹{parseFloat(selectedSale.paid_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1">
                      <span className="text-slate-600">Balance Due:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        ₹{parseFloat(selectedSale.due_amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-300 text-[11px]">
                  <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-semibold text-slate-900 font-mono">₹{parseFloat(selectedSale.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">Discount</span>
                    <span className="font-semibold text-slate-900 font-mono">-₹{parseFloat(selectedSale.discount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">CGST @ {selectedSale.tax_amount > 0 ? '2.5%' : '0%'}</span>
                    <span className="font-semibold text-slate-900 font-mono">₹{(parseFloat(selectedSale.tax_amount || 0) / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">SGST @ {selectedSale.tax_amount > 0 ? '2.5%' : '0%'}</span>
                    <span className="font-semibold text-slate-900 font-mono">₹{(parseFloat(selectedSale.tax_amount || 0) / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 bg-slate-100 border-t-2 border-slate-900 font-bold text-slate-900 text-xs">
                    <span>GRAND TOTAL</span>
                    <span className="font-mono text-xs">₹{parseFloat(selectedSale.net_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 5. Footer: Terms & Authorized Signatory */}
              <div className="border border-slate-300 p-3 grid grid-cols-2 gap-4 text-[10px]">
                <div>
                  <span className="font-bold text-slate-900 uppercase block mb-1">Terms & Conditions</span>
                  <ul className="text-slate-600 space-y-0.5 list-disc list-inside">
                    <li>Goods once sold will not be taken back.</li>
                    <li>2% p.m. interest will be charged after 15 days.</li>
                    <li>Fixed price, no exchange, no return.</li>
                  </ul>
                </div>

                <div className="text-center flex flex-col justify-between items-center pl-3 border-l border-slate-300">
                  <span className="font-bold text-slate-900 text-[10px]">For Jagdamba Cloth House</span>
                  <img 
                    src={getShopSignatureImage(shopSettings)} 
                    alt="Authorized Signature" 
                    className="h-8 max-w-[130px] object-contain my-0.5" 
                  />
                  <span className="border-t border-slate-400 w-3/4 pt-0.5 font-semibold text-slate-700">
                    Authorized Signatory
                  </span>
                </div>
              </div>

              {/* Thank You Note */}
              <div className="text-center mt-2.5 text-slate-600 text-[10px] font-medium">
                Thank you for shopping with Jagdamba Cloth House!
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button onClick={() => handlePrint(selectedSale)} icon={Printer} className="bg-slate-900 text-white font-semibold text-xs">Print Bill</Button>
              <Button onClick={() => handlePDF(selectedSale)} icon={FileText} variant="outline" className="border-slate-300 text-xs font-semibold">Download PDF</Button>
              <Button onClick={() => handleWord(selectedSale)} icon={FileText} variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs font-semibold">Word Export</Button>
              <Button variant="outline" onClick={() => setSelectedSale(null)} className="text-xs">Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelSaleId && (
        <Modal
          isOpen={!!cancelSaleId}
          onClose={() => setCancelSaleId(null)}
          title="Cancel Sale & Revert Stock"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to cancel this sale? Cancelling will delete the sale record and <b>automatically restore item stock quantities</b> in SQLite.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setCancelSaleId(null)}>Back</Button>
              <Button onClick={handleCancelSale} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
