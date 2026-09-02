import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  User, 
  FileText, 
  Edit3, 
  ShoppingCart, 
  Search,
  IndianRupee,
  RefreshCw,
  PlusCircle,
  Eye,
  Columns,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LiveInvoicePreview } from '../components/common/LiveInvoicePreview';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { generatePDFDocument, printThermalReceipt, printDocumentHtml } from '../components/common/PrintInvoice';

export function POSBilling() {
  const navigate = useNavigate();
  const { addToast, shopSettings } = useApp();

  const [customers, setCustomers] = useState([]);
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('1'); // Default Walk-in Customer
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');

  // Bill Cart State
  const [cart, setCart] = useState([]);
  const [billDiscount, setBillDiscount] = useState(0);
  
  // Checkout & Payment State
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [lastCompletedInvoice, setLastCompletedInvoice] = useState(null);

  // Inline Item Entry Form State (No Pop-up Modal!)
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  
  const initialItemForm = {
    product_id: null,
    name: '',
    design_no: '',
    description: '',
    quantity: '1',
    unit_type: 'piece', // 'piece', 'meter', 'set', 'other'
    unit_price: '',
    gst_rate: '5', // 0, 5, 12, 18, 28
    discount: '0'
  };
  const [itemForm, setItemForm] = useState(initialItemForm);

  // Quick Add Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', address: '' });

  const loadData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.get('/customers'),
        api.get('/products')
      ]);
      setCustomers(custRes.data || []);
      setInventoryProducts(prodRes.data || []);
    } catch (err) {
      console.error('Failed to load customers or products:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Populate item into inline form for editing
  const editItemInline = (index) => {
    const item = cart[index];
    const rateStr = (item.gst_rate !== undefined ? item.gst_rate : 5).toString();
    setEditingItemIndex(index);
    setItemForm({
      product_id: item.product_id || null,
      name: item.name || '',
      design_no: item.design_no || '',
      description: item.description || '',
      quantity: item.quantity.toString(),
      unit_type: item.unit_type || 'piece',
      unit_price: item.unit_price.toString(),
      gst_rate: rateStr,
      discount: (item.discount || 0).toString()
    });
  };

  const clearItemForm = () => {
    setEditingItemIndex(null);
    setItemForm(initialItemForm);
  };

  // Optional quick-pick from Inventory dropdown
  const handleInventoryPick = (e) => {
    const prodId = e.target.value;
    if (!prodId) return;
    const prod = inventoryProducts.find(p => p.id === parseInt(prodId));
    if (prod) {
      setEditingItemIndex(null);
      setItemForm({
        product_id: prod.id,
        name: prod.name || '',
        design_no: prod.design_no || '',
        description: `${prod.brand_name || ''} ${prod.fabric_type || ''}`.trim(),
        quantity: '1',
        unit_type: prod.unit_type || 'piece',
        unit_price: (prod.selling_price || 0).toString(),
        gst_rate: (prod.gst_rate || 5).toString(),
        discount: '0'
      });
    }
  };

  // Save / Add Item to Cart Inline
  const handleSaveItemToCart = (e) => {
    if (e) e.preventDefault();
    if (!itemForm.name.trim()) {
      addToast('Please enter Item Name', 'warning');
      return;
    }
    if (!itemForm.quantity || parseFloat(itemForm.quantity) <= 0) {
      addToast('Please enter a valid Quantity', 'warning');
      return;
    }
    if (!itemForm.unit_price || parseFloat(itemForm.unit_price) < 0) {
      addToast('Please enter a valid Selling Price / Rate', 'warning');
      return;
    }

    const qty = parseFloat(itemForm.quantity);
    const rate = parseFloat(itemForm.unit_price);
    const gstRate = parseFloat(itemForm.gst_rate || 0);
    const itemDiscount = parseFloat(itemForm.discount || 0);

    const sub = Math.round(qty * rate * 100) / 100;
    const tax = Math.round(sub * (gstRate / 100) * 100) / 100;
    const itemTotal = Math.max(0, Math.round((sub + tax - itemDiscount) * 100) / 100);

    const newItem = {
      product_id: itemForm.product_id,
      name: itemForm.name.trim(),
      design_no: itemForm.design_no.trim(),
      description: itemForm.description.trim(),
      quantity: qty,
      unit_type: itemForm.unit_type,
      unit_price: rate,
      gst_rate: gstRate,
      tax_amount: tax,
      discount: itemDiscount,
      total_amount: itemTotal
    };

    if (editingItemIndex !== null) {
      const updated = [...cart];
      updated[editingItemIndex] = newItem;
      setCart(updated);
      addToast(`Updated '${newItem.name}' in invoice!`, 'info');
    } else {
      setCart([...cart, newItem]);
      addToast(`Added '${newItem.name}' to invoice!`, 'success');
    }

    clearItemForm();
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
    if (editingItemIndex === index) {
      clearItemForm();
    }
  };

  // Calculations with zero rounding errors
  const rawSubtotal = Math.round(cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) * 100) / 100;
  const totalTaxAmount = Math.round(cart.reduce((sum, item) => sum + (item.tax_amount || 0), 0) * 100) / 100;
  const totalItemDiscounts = Math.round(cart.reduce((sum, item) => sum + (item.discount || 0), 0) * 100) / 100;
  const netSubtotal = Math.round((rawSubtotal + totalTaxAmount - totalItemDiscounts) * 100) / 100;
  
  const overallDiscount = parseFloat(billDiscount || 0);
  const grandTotal = Math.max(0, Math.round((netSubtotal - overallDiscount) * 100) / 100);

  // Real-time draft invoice object
  const selectedCustObj = customers.find(c => c.id === parseInt(selectedCustomerId));
  const draftInvoice = {
    invoice_no: 'JCH-DRAFT',
    sale_date: new Date().toLocaleDateString('en-IN'),
    sale_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    customer_name: customerName.trim() || selectedCustObj?.name || 'Walk-in Customer',
    customer_phone: customerPhone.trim() || (selectedCustObj?.phone !== 'CASH' ? selectedCustObj?.phone : ''),
    customer_gstin: selectedCustObj?.gstin || (selectedCustomerId === '1' ? 'CASH' : ''),
    items: cart,
    subtotal: rawSubtotal,
    tax_amount: totalTaxAmount,
    discount: overallDiscount,
    net_amount: grandTotal,
    paid_amount: paidAmount !== '' ? parseFloat(paidAmount) : (paymentMode === 'Credit' ? 0 : grandTotal),
    payment_mode: paymentMode,
    notes
  };

  const handlePrintDraft = async () => {
    if (cart.length === 0 && !itemForm.name) {
      addToast('Invoice is empty! Type item details to print.', 'warning');
      return;
    }
    const printData = cart.length > 0 ? draftInvoice : {
      ...draftInvoice,
      items: [{
        name: itemForm.name || 'Sample Item',
        design_no: itemForm.design_no,
        quantity: parseFloat(itemForm.quantity || 1),
        unit_price: parseFloat(itemForm.unit_price || 0),
        tax_amount: 0,
        discount: 0,
        total_amount: parseFloat(itemForm.unit_price || 0)
      }]
    };
    const htmlContent = printThermalReceipt(printData, shopSettings);
    await printDocumentHtml(htmlContent);
  };

  const handleDownloadPDFDraft = () => {
    if (cart.length === 0 && !itemForm.name) {
      addToast('Invoice is empty! Type item details to download PDF.', 'warning');
      return;
    }
    const printData = cart.length > 0 ? draftInvoice : {
      ...draftInvoice,
      items: [{
        name: itemForm.name || 'Sample Item',
        design_no: itemForm.design_no,
        quantity: parseFloat(itemForm.quantity || 1),
        unit_price: parseFloat(itemForm.unit_price || 0),
        tax_amount: 0,
        discount: 0,
        total_amount: parseFloat(itemForm.unit_price || 0)
      }]
    };
    const doc = generatePDFDocument(printData, shopSettings);
    doc.save(`Draft_Invoice_${new Date().getTime()}.pdf`);
    addToast('Live Invoice PDF downloaded!', 'success');
  };

  const [isSaving, setIsSaving] = useState(false);

  // Complete Sale Handler
  const handleCompleteSale = async () => {
    if (isSaving) return;
    if (cart.length === 0) {
      addToast('Invoice is empty! Please add at least 1 item.', 'warning');
      return;
    }

    setIsSaving(true);
    let selCust = customers.find(c => c.id === parseInt(selectedCustomerId));
    let targetCustId = parseInt(selectedCustomerId);
    let targetCustName = customerName.trim() || selCust?.name || 'Walk-in Customer';
    let targetCustPhone = customerPhone.trim() || (selCust?.phone !== 'CASH' ? selCust?.phone : '');

    const isCreditOrDueSale = paymentMode === 'Credit' || (paidAmount !== '' && parseFloat(paidAmount) < grandTotal);

    // If this is an Udhar/Credit sale with custom customer details, attach or register their individual customer account
    if (isCreditOrDueSale && targetCustName !== 'Walk-in Customer') {
      let match = null;
      if (targetCustPhone) {
        match = customers.find(c => c.phone === targetCustPhone);
      }
      if (!match && targetCustName) {
        match = customers.find(c => c.name.toLowerCase() === targetCustName.toLowerCase());
      }

      if (match) {
        targetCustId = match.id;
        selCust = match;
      } else {
        try {
          const regRes = await api.post('/customers', {
            name: targetCustName,
            phone: targetCustPhone || '',
            address: 'Counter Udhar Customer'
          });
          const newCustObj = regRes.data;
          if (newCustObj && newCustObj.id) {
            targetCustId = newCustObj.id;
            selCust = newCustObj;
            loadData();
          }
        } catch (regErr) {
          console.warn('[POSBilling] Auto customer registration for Udhar fallback:', regErr);
        }
      }
    }

    try {
      const result = await api.post('/sales', {
        customer_id: targetCustId,
        customer_name: targetCustName,
        customer_phone: targetCustPhone,
        customer_gstin: selCust?.gstin || (targetCustId === 1 ? 'CASH' : ''),
        state_code: selCust?.state_code || '',
        items: cart,
        subtotal: rawSubtotal,
        tax_amount: totalTaxAmount,
        cgst_amount: totalTaxAmount / 2,
        sgst_amount: totalTaxAmount / 2,
        discount: overallDiscount + totalItemDiscounts,
        net_amount: grandTotal,
        paid_amount: parseFloat(paidAmount !== '' ? paidAmount : (paymentMode === 'Credit' ? 0 : grandTotal)),
        payment_mode: paymentMode,
        notes
      });

      if (!result || result.success === false) {
        throw new Error(result?.error || 'Sale could not be saved to database.');
      }

      const completedSale = result?.sale || result?.data?.sale || result?.data;
      if (!completedSale || !completedSale.invoice_no) {
        throw new Error('Database did not return a valid invoice record.');
      }

      addToast(`Invoice #${completedSale.invoice_no} generated & saved to SQLite!`, 'success');

      setLastCompletedInvoice(completedSale);
      setCart([]);
      clearItemForm();
      setBillDiscount(0);
      setPaidAmount('');
      setNotes('');
      setIsCheckoutModalOpen(false);
      loadData();

      // Directly open system print command screen for the generated invoice
      handlePrint(completedSale);
    } catch (err) {
      console.error('[POSBilling Sale Error]:', err);
      addToast(err.message || 'Failed to complete sale', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async (targetSale = null) => {
    const saleToPrint = targetSale || lastCompletedInvoice;
    if (!saleToPrint) return;
    const printData = {
      ...saleToPrint,
      items: (saleToPrint.items && saleToPrint.items.length > 0)
        ? saleToPrint.items
        : (cart.length > 0 ? cart : (draftInvoice?.items || []))
    };
    const htmlContent = printThermalReceipt(printData, shopSettings);
    await printDocumentHtml(htmlContent);
  };

  const handleDownloadPDF = () => {
    if (!lastCompletedInvoice) return;
    const doc = generatePDFDocument(lastCompletedInvoice, shopSettings);
    doc.save(`${lastCompletedInvoice.invoice_no}.pdf`);
    addToast('PDF Invoice downloaded!', 'success');
  };

  const handleSaveQuickCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.name.trim()) return;
    try {
      const res = await api.post('/customers', customerForm);
      const newCust = res.data;
      addToast(`Customer '${newCust.name}' added!`, 'success');
      setIsCustomerModalOpen(false);
      setCustomerForm({ name: '', phone: '', address: '' });
      await loadData();
      if (newCust.id) setSelectedCustomerId(newCust.id.toString());
    } catch (err) {
      addToast('Failed to add customer', 'error');
    }
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col lg:flex-row gap-5 max-w-[1750px] mx-auto overflow-hidden">
      
      {/* LEFT COLUMN: Inline Entry Widgets & Cart Details Form (55% Width) */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 h-full overflow-y-auto pr-1">
        
        {/* Top Header Card: Customer Name & Customer Phone Options */}
        <Card className="p-3.5 bg-white flex-shrink-0 border border-slate-200 shadow-sm">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-brand-600 flex-shrink-0" />
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wide text-xs">
                  Customer Information Options
                </h4>
              </div>

              {/* Saved Customer Dropdown & Quick Add Customer */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold hidden sm:inline">Pick Saved:</span>
                <select
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                  value={selectedCustomerId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedCustomerId(id);
                    const cust = customers.find(c => c.id === parseInt(id));
                    if (cust) {
                      setCustomerName(cust.name || 'Walk-in Customer');
                      setCustomerPhone((cust.phone && cust.phone !== 'CASH') ? cust.phone : '');
                    }
                  }}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone && c.phone !== 'CASH' ? `(${c.phone})` : ''} {c.current_balance > 0 ? `• Udhar: ₹${c.current_balance}` : ''}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="px-2.5 py-1 text-brand-600 hover:bg-brand-50 rounded-xl transition-colors border border-brand-200 font-extrabold flex items-center gap-1 text-xs"
                  title="Add New Customer Account"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Customer</span>
                </button>

                {inventoryProducts.length > 0 && (
                  <select
                    className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
                    onChange={handleInventoryPick}
                    value=""
                  >
                    <option value="">Quick Pick ({inventoryProducts.length})...</option>
                    {inventoryProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} • ₹{p.selling_price}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 2 Explicit Options: Customer Name & Customer Mobile/Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Customer Name *"
                placeholder="e.g. Walk-in Customer / Sunita Sharma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <Input
                label="Customer Mobile / Phone Number"
                placeholder="e.g. 7876413356"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* CARD 1: INLINE ITEM DETAILS ENTRY WIDGET FORM (NO POPUP MODAL!) */}
        <Card className="p-4 bg-white border border-brand-200 shadow-card flex-shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                {editingItemIndex !== null ? "Edit Item Details" : "Item Entry Details Form"}
              </h3>
            </div>
            {editingItemIndex !== null && (
              <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200">
                Editing Line #{editingItemIndex + 1}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveItemToCart} className="space-y-3">
            <Input
              label="Item Name *"
              required
              placeholder="e.g. Kurta Pajama, Suit Set, Pure Cotton Fabric"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            />


            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Quantity / Length *"
                type="number"
                required
                step={itemForm.unit_type === 'meter' ? '0.25' : '1'}
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
              />
              <div>
                <label className="text-xs font-semibold text-slate-700">Unit *</label>
                <select
                  className="w-full mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800"
                  value={itemForm.unit_type}
                  onChange={(e) => setItemForm({ ...itemForm, unit_type: e.target.value })}
                >
                  <option value="piece">Piece</option>
                  <option value="meter">Meter</option>
                  <option value="set">Set</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Input
                label="Selling Price / Rate (₹) *"
                type="number"
                required
                placeholder="850"
                value={itemForm.unit_price}
                onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">GST Mode *</label>
                <select
                  className="w-full mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800"
                  value={itemForm.gst_rate}
                  onChange={(e) => setItemForm({ ...itemForm, gst_rate: e.target.value })}
                >
                  <option value="5">MODE 1: State GST (5% Total — CGST @ 2.5%, SGST @ 2.5%)</option>
                  <option value="0">MODE 2: No GST (0% Total — CGST @ 0%, SGST @ 0%)</option>
                </select>
              </div>
              <Input
                label="Item Discount (₹)"
                type="number"
                placeholder="0"
                value={itemForm.discount}
                onChange={(e) => setItemForm({ ...itemForm, discount: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={clearItemForm}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Form
              </button>

              <Button
                type="submit"
                icon={Plus}
                size="md"
                className="bg-brand-600 hover:bg-brand-500 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md text-xs"
              >
                {editingItemIndex !== null ? "Update Item on Invoice" : "+ Add Item to Invoice"}
              </Button>
            </div>
          </form>
        </Card>

        {/* CARD 2: ADDED SALES BILL ITEMS TABLE */}
        <Card className="flex-1 overflow-hidden flex flex-col p-0 border border-slate-200 shadow-card min-h-[200px]">
          <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-brand-400" />
              <h3 className="font-extrabold text-xs tracking-wide uppercase">Added Sales Bill Items</h3>
            </div>
            <span className="text-[11px] font-bold bg-slate-800 text-brand-300 px-2.5 py-0.5 rounded-full border border-slate-700">
              {cart.length} {cart.length === 1 ? 'item' : 'items'} in bill
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="font-bold text-slate-500 uppercase border-b border-slate-200 bg-slate-50">
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">Item Name & Design</th>
                  <th className="p-2.5 text-center">Qty / Unit</th>
                  <th className="p-2.5 text-right">Selling Rate</th>
                  <th className="p-2.5 text-right">GST %</th>
                  <th className="p-2.5 text-right">Total (₹)</th>
                  <th className="p-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs text-slate-400">
                        Type item details above to add items to your bill.
                      </p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${editingItemIndex === idx ? 'bg-amber-50/70 font-semibold' : ''}`}>
                      <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-2.5">
                        <div className="font-extrabold text-slate-900">{item.name}</div>
                      </td>
                      <td className="p-2.5 text-center font-bold">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.quantity} {item.unit_type}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{parseFloat(item.unit_price).toFixed(2)}</td>
                      <td className="p-2.5 text-right text-slate-500 font-semibold">{item.gst_rate}%</td>
                      <td className="p-2.5 text-right font-extrabold text-slate-900 font-mono">₹{parseFloat(item.total_amount).toFixed(2)}</td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => editItemInline(idx)}
                            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded"
                            title="Edit Item Inline"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeFromCart(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Remove Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* CARD 3: BILL TENDER & CHECKOUT ACTION BAR */}
        <Card className="p-3 bg-slate-900 text-white flex-shrink-0 border border-slate-800 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Bill Discount (₹):</span>
                <input
                  type="number"
                  className="w-20 px-2 py-1 text-right font-bold bg-slate-800 border border-slate-700 text-white rounded focus:border-brand-400 focus:outline-none"
                  value={billDiscount}
                  onChange={(e) => setBillDiscount(e.target.value)}
                />
              </div>

              <div className="text-slate-300">
                Grand Total: <span className="font-mono font-black text-brand-400 text-base ml-1">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={() => setIsCheckoutModalOpen(true)}
              disabled={cart.length === 0}
              size="md"
              className="bg-brand-500 hover:bg-brand-400 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-lg text-xs"
            >
              Proceed to Checkout (₹{grandTotal.toFixed(2)})
            </Button>
          </div>
        </Card>

      </div>

      {/* RIGHT COLUMN: LIVE REAL-TIME INVOICE LAYOUT PREVIEW (45% Width) */}
      <div className="w-full lg:w-[480px] xl:w-[540px] h-full flex-shrink-0">
        <LiveInvoicePreview
          sale={draftInvoice}
          shopSettings={shopSettings}
          typingItem={itemForm}
          onPrint={handlePrintDraft}
          onDownloadPDF={handleDownloadPDFDraft}
        />
      </div>

      {/* Checkout & Payment Tender Modal */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Complete Sale & Select Payment Mode"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 text-white flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-400 block">Total Bill Amount</span>
              <span className="text-2xl font-black text-brand-400 font-mono">₹{grandTotal.toFixed(2)}</span>
            </div>
            <Badge variant="success">Final Invoice</Badge>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Payment Mode</label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {['Cash', 'UPI', 'Card', 'Credit'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    paymentMode === mode
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Amount Received from Customer (₹)"
            type="number"
            placeholder={paymentMode === 'Credit' ? '0' : grandTotal.toString()}
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCheckoutModalOpen(false)}>Back</Button>
            <Button onClick={handleCompleteSale} disabled={isSaving} icon={CheckCircle2} className="bg-brand-600 text-white font-bold">
              {isSaving ? "Saving Invoice..." : "Generate Invoice & Save Sale"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="+ Register New Customer Account"
      >
        <form onSubmit={handleSaveQuickCustomer} className="space-y-3">
          <Input
            label="Customer Name *"
            required
            placeholder="e.g. Sunita Sharma"
            value={customerForm.name}
            onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
          />
          <Input
            label="Phone Number"
            placeholder="+91 98765 11111"
            value={customerForm.phone}
            onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
          />
          <Input
            label="Address (Optional)"
            placeholder="Model Town, City"
            value={customerForm.address}
            onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCustomerModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Customer</Button>
          </div>
        </form>
      </Modal>

      {/* Sale Complete Success Modal */}
      {lastCompletedInvoice && (
        <Modal
          isOpen={!!lastCompletedInvoice}
          onClose={() => setLastCompletedInvoice(null)}
          title="Sale Completed Successfully!"
        >
          <div className="text-center space-y-4 py-3">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Invoice #{lastCompletedInvoice.invoice_no}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Total Bill Amount: <span className="font-bold text-slate-800">₹{lastCompletedInvoice.net_amount}</span> ({lastCompletedInvoice.payment_mode})
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-4">
              <Button onClick={handlePrint} icon={Printer} className="bg-slate-900 text-white font-bold">
                Print Bill
              </Button>
              <Button onClick={handleDownloadPDF} icon={FileText} variant="outline" className="font-bold">
                Save as PDF
              </Button>
              <Button variant="outline" onClick={() => setLastCompletedInvoice(null)}>
                New Sale
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
