import React, { useState, useEffect } from 'react';
import { BookOpen, UserCheck, Plus, IndianRupee, History, Phone, Search, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export function KhataLedger() {
  const { addToast } = useApp();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [search, setSearch] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [loadingLedger, setLoadingLedger] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      const list = res.data || [];
      setCustomers(list);
      return list;
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const viewLedger = async (customer) => {
    setSelectedCustomer(customer);
    setLoadingLedger(true);
    try {
      const res = await api.get(`/customers/${customer.id}/ledger`);
      setLedger(res.data?.transactions || []);
      if (res.data?.customer) {
        setSelectedCustomer(res.data.customer);
      }
    } catch (err) {
      addToast('Failed to fetch customer ledger', 'error');
    } finally {
      setLoadingLedger(false);
    }
  };

  const openPaymentModal = () => {
    if (!selectedCustomer) return;
    const due = parseFloat(selectedCustomer.current_balance || 0);
    setPaymentAmount(due > 0 ? due.toString() : '');
    setNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleCollectPayment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCustomer || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      addToast('Please enter a valid payment clearance amount', 'warning');
      return;
    }

    const targetCustId = selectedCustomer.id;
    const targetCustName = selectedCustomer.name;
    const payAmt = parseFloat(paymentAmount);

    try {
      await api.post(`/customers/${targetCustId}/payment`, {
        amount: payAmt,
        payment_mode: paymentMode,
        notes: notes || 'Udhar Payment Collection'
      });

      addToast(`Udhar Payment of ₹${payAmt} collected from ${targetCustName}!`, 'success');
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setNotes('');

      // Fetch fresh customer list & fresh ledger for targetCustId
      const [updatedList, ledgerRes] = await Promise.all([
        fetchCustomers(),
        api.get(`/customers/${targetCustId}/ledger`)
      ]);

      const freshCustObj = (updatedList || []).find(c => c.id === targetCustId) || ledgerRes.data?.customer;
      if (freshCustObj) {
        setSelectedCustomer(freshCustObj);
      }
      setLedger(ledgerRes.data?.transactions || []);
    } catch (err) {
      console.error('Payment collection error:', err);
      addToast('Failed to record payment clearance', 'error');
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (c.phone === 'CASH' && c.current_balance <= 0) return false;
    const s = search.toLowerCase().trim();
    if (!s) return true;
    return (
      (c.name && c.name.toLowerCase().includes(s)) ||
      (c.phone && c.phone.includes(s))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Khata & Udhar Register</h2>
          <p className="text-xs text-slate-500 mt-1">Track individual customer credit balances, payment receipts, and ledger statements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Directory List */}
        <Card className="lg:col-span-1" title="Customer Accounts">
          <div className="space-y-3">
            {/* Search Input Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search Customer Name or Phone..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-brand-500 font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="max-h-[600px] overflow-y-auto space-y-2 pr-1">
              {filteredCustomers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No customer accounts match '{search}'
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => viewLedger(c)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedCustomer?.id === c.id
                        ? 'bg-brand-50 border-brand-500 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs">{c.name}</h4>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" /> {c.phone && c.phone !== 'CASH' ? c.phone : 'No Phone'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-black ${parseFloat(c.current_balance || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {parseFloat(c.current_balance || 0) > 0 ? `Udhar: ₹${parseFloat(c.current_balance).toFixed(2)}` : 'Clear'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Selected Customer Ledger Statement */}
        <Card className="lg:col-span-2" title={selectedCustomer ? `${selectedCustomer.name}'s Ledger Statement` : 'Select a Customer Account'}>
          {selectedCustomer ? (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center p-4 rounded-xl bg-slate-900 text-white gap-4">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Individual Outstanding Udhar Balance</span>
                  <div className="text-2xl font-black text-brand-400 font-mono">
                    ₹{parseFloat(selectedCustomer.current_balance || 0).toFixed(2)}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Customer Account: {selectedCustomer.name} {selectedCustomer.phone && selectedCustomer.phone !== 'CASH' ? `(${selectedCustomer.phone})` : ''}
                  </span>
                </div>
                <Button
                  onClick={openPaymentModal}
                  disabled={parseFloat(selectedCustomer.current_balance || 0) <= 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md px-5 py-2.5 rounded-xl disabled:opacity-50"
                  icon={IndianRupee}
                >
                  Collect Udhar Payment
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="font-extrabold text-slate-500 uppercase border-b border-slate-200 bg-slate-50">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Transaction Type</th>
                      <th className="p-2.5">Payment Mode</th>
                      <th className="p-2.5">Notes</th>
                      <th className="p-2.5 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {loadingLedger ? (
                      <tr><td colSpan="5" className="p-6 text-center text-slate-400">Loading ledger statement...</td></tr>
                    ) : ledger.length === 0 ? (
                      <tr><td colSpan="5" className="p-6 text-center text-slate-400">No transactions recorded for this customer yet.</td></tr>
                    ) : (
                      ledger.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 text-slate-500 font-semibold">{new Date(t.created_at || t.date || Date.now()).toLocaleDateString('en-IN')}</td>
                          <td className="p-2.5">
                            <Badge variant={t.type === 'DEBIT' ? 'danger' : 'success'}>
                              {t.type === 'DEBIT' ? 'Sale Credit (Udhar)' : 'Payment Clearance Received'}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-slate-600 font-semibold">{t.payment_mode || 'Cash'}</td>
                          <td className="p-2.5 text-slate-500 text-[11px]">{t.notes || (t.invoice_no ? `Invoice #${t.invoice_no}` : '-')}</td>
                          <td className={`p-2.5 text-right font-extrabold font-mono ${t.type === 'DEBIT' ? 'text-red-600' : 'text-emerald-700'}`}>
                            {t.type === 'DEBIT' ? '+' : '-'}₹{parseFloat(t.amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 text-sm">
              <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
              Select a customer account from the left directory to view individual Udhar statement & collect payments.
            </div>
          )}
        </Card>
      </div>

      {/* Collect Udhar Payment Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Record Udhar Clearance for ${selectedCustomer.name}`}
        >
          <form onSubmit={handleCollectPayment} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex justify-between items-center">
              <span>Current Outstanding Udhar Balance:</span>
              <span className="font-extrabold text-sm font-mono text-red-700">
                ₹{parseFloat(selectedCustomer.current_balance || 0).toFixed(2)}
              </span>
            </div>

            <Input
              label="Payment Amount Received (₹) *"
              type="number"
              required
              step="0.01"
              placeholder="Enter amount cleared by customer"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />

            <div>
              <label className="text-xs font-semibold text-slate-700">Payment Mode *</label>
              <select
                className="w-full mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Bank Transfer">Bank Transfer / NEFT</option>
                <option value="Card">Credit / Debit Card</option>
              </select>
            </div>

            <Input
              label="Notes / Remarks (Optional)"
              placeholder="e.g. Cleared full balance via PhonePe"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
              <Button type="submit" icon={CheckCircle2} className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs">
                Record Payment Clearance
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
