import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, CheckCircle2, User, FileText, Calendar, IndianRupee, ArrowDownRight } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export function Purchases() {
  const { addToast } = useApp();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Purchase Modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Selected item to add to purchase cart
  const [selectedProductId, setSelectedProductId] = useState('');
  const [inputQty, setInputQty] = useState('1');
  const [inputRate, setInputRate] = useState('');
  const [inputGst, setInputGst] = useState('5');

  // New Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '', company_name: '', phone: '', address: '', gstin: '', notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [purRes, supRes, prodRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/suppliers'),
        api.get('/products')
      ]);
      setPurchases(purRes.data || []);
      setSuppliers(supRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      addToast('Failed to load purchases data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProductSelect = (e) => {
    const prodId = e.target.value;
    setSelectedProductId(prodId);
    const matched = products.find(p => p.id === parseInt(prodId));
    if (matched) {
      setInputRate(matched.purchase_price ? matched.purchase_price.toString() : '');
      setInputGst(matched.gst_rate ? matched.gst_rate.toString() : '5');
    }
  };

  const addItemToPurchase = () => {
    if (!selectedProductId || !inputQty || !inputRate) {
      addToast('Please select product, quantity and purchase rate', 'warning');
      return;
    }
    const matched = products.find(p => p.id === parseInt(selectedProductId));
    if (!matched) return;

    const qty = parseFloat(inputQty);
    const rate = parseFloat(inputRate);
    const gst = parseFloat(inputGst || 5);
    const sub = qty * rate;
    const tax = sub * (gst / 100);

    setPurchaseItems([
      ...purchaseItems,
      {
        product_id: matched.id,
        name: matched.name,
        design_no: matched.design_no,
        unit_type: matched.unit_type,
        quantity: qty,
        unit_price: rate,
        gst_rate: gst,
        tax_amount: tax,
        total_amount: sub + tax
      }
    ]);

    setSelectedProductId('');
    setInputQty('1');
    setInputRate('');
  };

  const removeItem = (idx) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== idx));
  };

  const subtotal = purchaseItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const totalTax = purchaseItems.reduce((acc, item) => acc + item.tax_amount, 0);
  const grandTotal = subtotal + totalTax;

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    if (!invoiceNo.trim()) {
      addToast('Please enter Wholesaler Invoice Number', 'warning');
      return;
    }
    if (purchaseItems.length === 0) {
      addToast('Purchase bill must contain at least 1 product item', 'warning');
      return;
    }

    try {
      await api.post('/purchases', {
        supplier_id: supplierId ? parseInt(supplierId) : null,
        invoice_no: invoiceNo,
        purchase_date: purchaseDate,
        items: purchaseItems,
        paid_amount: paidAmount !== '' ? parseFloat(paidAmount) : grandTotal,
        payment_mode: paymentMode,
        notes
      });

      addToast(`Purchase Invoice ${invoiceNo} saved! Stock increased automatically.`, 'success');
      setIsPurchaseModalOpen(false);
      setInvoiceNo('');
      setPurchaseItems([]);
      setPaidAmount('');
      setNotes('');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to save purchase invoice', 'error');
    }
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    try {
      await api.post('/suppliers', supplierForm);
      addToast(`Supplier '${supplierForm.name}' added successfully!`, 'success');
      setIsSupplierModalOpen(false);
      setSupplierForm({ name: '', company_name: '', phone: '', address: '', gstin: '', notes: '' });
      fetchData();
    } catch (err) {
      addToast('Failed to add supplier', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Wholesaler Purchases & Stock In</h2>
          <p className="text-xs text-slate-500 mt-1">Record supplier purchase bills to automatically increase inventory stock</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsSupplierModalOpen(true)} icon={User}>
            + Add Supplier
          </Button>
          <Button onClick={() => setIsPurchaseModalOpen(true)} icon={Plus} className="bg-brand-600 hover:bg-brand-500 text-white font-bold">
            + New Purchase Bill
          </Button>
        </div>
      </div>

      {/* Suppliers Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suppliers.map(s => (
          <div key={s.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-card flex justify-between items-center">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
              <span className="text-xs text-slate-500">{s.company_name || 'Wholesaler Agent'} • {s.phone || 'No phone'}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Current Balance</span>
              <span className={`text-sm font-extrabold ${s.current_balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ₹{s.current_balance || 0}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Invoices Table */}
      <Card title="Recorded Purchase Bills">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 bg-slate-50/80">
                <th className="p-4">Invoice No</th>
                <th className="p-4">Purchase Date</th>
                <th className="p-4">Supplier</th>
                <th className="p-4 text-right">Tax Amount</th>
                <th className="p-4 text-right">Grand Total</th>
                <th className="p-4 text-center">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-400">
                    No purchase invoices recorded yet. Click <b>+ New Purchase Bill</b> to enter wholesaler stock.
                  </td>
                </tr>
              ) : (
                purchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-brand-600">{p.invoice_no}</td>
                    <td className="p-4 text-xs text-slate-500">{p.purchase_date}</td>
                    <td className="p-4 font-semibold text-slate-800">{p.supplier_name || 'Generic Supplier'}</td>
                    <td className="p-4 text-right font-mono text-slate-600">₹{parseFloat(p.tax_amount || 0).toFixed(2)}</td>
                    <td className="p-4 text-right font-extrabold text-slate-900">₹{parseFloat(p.net_amount || 0).toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <Badge variant={p.payment_status === 'PAID' ? 'success' : 'amber'}>
                        {p.payment_status} ({p.payment_mode})
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Purchase Modal */}
      <Modal isOpen={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} title="Record Wholesaler Purchase Invoice">
        <form onSubmit={handleSavePurchase} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Supplier *</label>
              <select
                className="w-full mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.company_name})</option>)}
              </select>
            </div>

            <Input
              label="Wholesaler Invoice No *"
              required
              placeholder="e.g. SURAT-8910"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />

            <Input
              label="Purchase Date *"
              type="date"
              required
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>

          {/* Add Item Builder */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-brand-600" /> Add Product Item to Purchase Bill
            </h5>

            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2">
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800"
                  value={selectedProductId}
                  onChange={handleProductSelect}
                >
                  <option value="">Choose Existing Product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (#{p.design_no}) • Stock: {p.stock_quantity}</option>
                  ))}
                </select>
              </div>

              <input
                type="number"
                placeholder="Qty / Length"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-center"
                value={inputQty}
                onChange={(e) => setInputQty(e.target.value)}
              />

              <input
                type="number"
                placeholder="Purchase Rate (₹)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-center"
                value={inputRate}
                onChange={(e) => setInputRate(e.target.value)}
              />
            </div>

            <Button type="button" size="sm" onClick={addItemToPurchase} className="w-full bg-slate-800 text-white font-bold">
              Add Item to Bill Table
            </Button>
          </div>

          {/* Purchase Items List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 font-bold text-slate-600 border-b">
                <tr>
                  <th className="p-2.5">Product & Design</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Rate</th>
                  <th className="p-2.5 text-right">GST %</th>
                  <th className="p-2.5 text-right">Total</th>
                  <th className="p-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseItems.length === 0 ? (
                  <tr><td colSpan="6" className="p-4 text-center text-slate-400">No items added to purchase list yet.</td></tr>
                ) : (
                  purchaseItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-slate-800">{item.name} (#{item.design_no})</td>
                      <td className="p-2.5 text-center font-bold">{item.quantity} {item.unit_type}s</td>
                      <td className="p-2.5 text-right">₹{item.unit_price}</td>
                      <td className="p-2.5 text-right">{item.gst_rate}%</td>
                      <td className="p-2.5 text-right font-extrabold text-slate-900">₹{item.total_amount.toFixed(2)}</td>
                      <td className="p-2.5 text-center">
                        <button type="button" onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bill Totals & Payment */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="flex justify-between text-sm font-bold">
              <span>Grand Total Payable</span>
              <span className="text-brand-400 font-mono text-xl">₹{grandTotal.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-xs text-slate-400">Payment Mode</label>
                <select
                  className="w-full mt-1 rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-1.5 text-xs font-bold"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="UPI">UPI</option>
                  <option value="Credit">Credit (Udhar)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Amount Paid Now (₹)</label>
                <input
                  type="number"
                  placeholder={grandTotal.toString()}
                  className="w-full mt-1 rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-1.5 text-xs font-bold text-right"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsPurchaseModalOpen(false)}>Cancel</Button>
            <Button type="submit" icon={CheckCircle2} className="bg-brand-600 text-white font-bold">
              Save Purchase & Increase Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Supplier Modal */}
      <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="+ Register New Wholesaler / Supplier">
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <Input
            label="Supplier Contact Person Name *"
            required
            placeholder="e.g. Rajesh Kumar"
            value={supplierForm.name}
            onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
          />
          <Input
            label="Company / Mill Name"
            placeholder="e.g. Ganga Prints Agency, Surat"
            value={supplierForm.company_name}
            onChange={(e) => setSupplierForm({ ...supplierForm, company_name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="+91 98123 45678"
              value={supplierForm.phone}
              onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
            />
            <Input
              label="GSTIN (Optional)"
              placeholder="24AAAAA1234A1Z1"
              value={supplierForm.gstin}
              onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value })}
            />
          </div>
          <Input
            label="Address"
            placeholder="Textile Market, Surat, Gujarat"
            value={supplierForm.address}
            onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsSupplierModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Supplier</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
