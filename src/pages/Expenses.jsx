import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Trash2, Calendar, IndianRupee, RefreshCw } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export function Expenses() {
  const { addToast } = useApp();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'Rent',
    description: '',
    amount: '',
    payment_mode: 'Cash',
    notes: ''
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data || []);
    } catch (err) {
      addToast('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      addToast('Please enter a valid expense amount', 'warning');
      return;
    }

    try {
      await api.post('/expenses', formData);
      addToast(`Expense of ₹${formData.amount} (${formData.category}) recorded!`, 'success');
      setIsModalOpen(false);
      setFormData({
        expense_date: new Date().toISOString().split('T')[0],
        category: 'Rent',
        description: '',
        amount: '',
        payment_mode: 'Cash',
        notes: ''
      });
      fetchExpenses();
    } catch (err) {
      addToast('Failed to record expense', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      addToast('Expense deleted', 'success');
      fetchExpenses();
    } catch (err) {
      addToast('Failed to delete expense', 'error');
    }
  };

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Shop Expenses Register</h2>
          <p className="text-xs text-slate-500 mt-1">Track operational shop costs (Rent, Electricity, Salary, Transport, Internet)</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={Plus} className="bg-brand-600 hover:bg-brand-500 text-white font-bold w-full sm:w-auto text-xs">
          + Record New Expense
        </Button>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <span className="text-xs text-slate-400 font-semibold">Total Expenses Recorded</span>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono mt-1">₹{totalExpenseAmount.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-slate-400 mt-1">{expenses.length} total entries in database</p>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card title="Expense Voucher Records">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[540px]">
            <thead>
              <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 bg-slate-50/80">
                <th className="p-3 sm:p-4">Date</th>
                <th className="p-3 sm:p-4">Category</th>
                <th className="p-3 sm:p-4">Description / Notes</th>
                <th className="p-3 sm:p-4 text-center">Payment Mode</th>
                <th className="p-3 sm:p-4 text-right">Amount (₹)</th>
                <th className="p-3 sm:p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-400">Loading expenses...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-400">No expense records found. Click <b>+ Record New Expense</b> to add one.</td></tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 sm:p-4 font-medium text-slate-600 text-xs">{e.expense_date}</td>
                    <td className="p-3 sm:p-4 font-bold text-slate-900">
                      <Badge variant="amber">{e.category}</Badge>
                    </td>
                    <td className="p-3 sm:p-4 text-slate-700 text-xs">{e.description || e.notes || '—'}</td>
                    <td className="p-3 sm:p-4 text-center text-xs text-slate-600">{e.payment_mode}</td>
                    <td className="p-3 sm:p-4 text-right font-extrabold text-rose-600 text-xs sm:text-sm">₹{parseFloat(e.amount).toFixed(2)}</td>
                    <td className="p-3 sm:p-4 text-center">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Expense Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="+ Record New Shop Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Expense Category *</label>
              <select
                className="w-full mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-800"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Rent">Rent</option>
                <option value="Electricity">Electricity</option>
                <option value="Salary">Salary</option>
                <option value="Transport">Transport / Freight</option>
                <option value="Internet">Internet / Phone</option>
                <option value="Maintenance">Maintenance & Repairs</option>
                <option value="Other">Other Miscellaneous</option>
              </select>
            </div>

            <Input
              label="Expense Date *"
              type="date"
              required
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            />
          </div>

          <Input
            label="Amount Paid (₹) *"
            type="number"
            required
            placeholder="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />

          <Input
            label="Description / Purpose"
            placeholder="e.g. Shop rent for the month of August"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div>
            <label className="text-xs font-semibold text-slate-700">Payment Mode</label>
            <select
              className="w-full mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium"
              value={formData.payment_mode}
              onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / GPay / PhonePe</option>
              <option value="Bank Transfer">Bank Transfer / Cheque</option>
            </select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" className="bg-brand-600 text-white font-bold w-full sm:w-auto">Save Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
