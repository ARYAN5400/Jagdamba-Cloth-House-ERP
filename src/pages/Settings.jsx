import React, { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle2, DollarSign, FileText } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { getShopSignatureImage } from '../utils/signatureHelper';

export function Settings() {
  const { addToast, refreshSettings } = useApp();
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    shop_name: 'Jagdamba Cloth House',
    owner_name: 'Retail Owner',
    phone: '7876413356',
    email: 'jagdambacloth@gmail.com',
    address: 'Main Bazar, GHANOUR',
    gstin: '03BMLPK3243D1ZH',
    invoice_prefix: 'JCH',
    financial_year: '2025-26',
    default_gst_rate: 5,
    default_payment_mode: 'Cash',
    low_stock_threshold: 5,
    currency: '₹',
    bank_name: 'State Bank of India',
    account_no: '12345678901',
    ifsc: 'SBIN0001234',
    invoice_terms: '1. Goods once sold will not be taken back.\n2. 2% p.m. Interest will be charged after 15 days.\n3. Fixed Price, No Exchange, No Return.'
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.data) {
        setFormData(res.data);
      }
    } catch (err) {
      addToast('Failed to load store settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/settings', formData);
      addToast('Store settings updated successfully in SQLite!', 'success');
      refreshSettings();
    } catch (err) {
      addToast('Failed to save settings', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Store Settings & Configuration</h2>
        <p className="text-xs text-slate-500 mt-1">Configure shop header details, GSTIN, invoice prefixes, and financial year</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shop Info */}
        <Card title="Shop Identity & Contact Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Shop Name *"
              required
              value={formData.shop_name}
              onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
            />
            <Input
              label="Owner / Manager Name"
              value={formData.owner_name}
              onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
            />
            <Input
              label="Phone Number *"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <div className="md:col-span-2">
              <Input
                label="Full Shop Address *"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* GST & Financial Settings */}
        <Card title="GSTIN, Invoice & Financial Year Settings">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Shop GSTIN (Optional)"
              placeholder="03BMLPK3243D1ZH"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
            />
            <Input
              label="Invoice Number Prefix *"
              required
              placeholder="JCH"
              value={formData.invoice_prefix}
              onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
            />
            <div>
              <label className="text-xs font-semibold text-slate-700">Financial Year</label>
              <select
                className="w-full mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-800"
                value={formData.financial_year}
                onChange={(e) => setFormData({ ...formData, financial_year: e.target.value })}
              >
                <option value="2024-25">2024-25 (01/04/24 - 31/03/25)</option>
                <option value="2025-26">2025-26 (01/04/25 - 31/03/26)</option>
                <option value="2026-27">2026-27 (01/04/26 - 31/03/27)</option>
                <option value="2027-28">2027-28 (01/04/27 - 31/03/28)</option>
              </select>
            </div>
            <Input
              label="Default GST Rate (%)"
              type="number"
              value={formData.default_gst_rate}
              onChange={(e) => setFormData({ ...formData, default_gst_rate: e.target.value })}
            />
            <Input
              label="Low Stock Threshold Limit"
              type="number"
              value={formData.low_stock_threshold}
              onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
            />
            <Input
              label="Currency Symbol"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            />
          </div>
        </Card>

        {/* Bank & Invoice Footers */}
        <Card title="Bank Account Details (For Invoices)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Bank Name"
              value={formData.bank_name || ''}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
            />
            <Input
              label="Account Number"
              value={formData.account_no || ''}
              onChange={(e) => setFormData({ ...formData, account_no: e.target.value })}
            />
            <Input
              label="IFSC Code"
              value={formData.ifsc || ''}
              onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
            />
          </div>
        </Card>

        {/* Authorized Signature Card */}
        <Card title="Authorized Signature (Pre-Printed Invoice Signature)">
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Upload the shop owner's authorized signature image. Every future invoice (Preview, Print, PDF, Word) will automatically include this signature above "Authorized Signatory".
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-48 h-24 bg-white border border-slate-300 rounded-lg p-2 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                <span className="text-[10px] font-bold text-slate-400 mb-1">Pre-printed Signature Preview</span>
                <img 
                  src={getShopSignatureImage(formData)} 
                  alt="Authorized Signature" 
                  className="max-h-16 max-w-full object-contain filter drop-shadow-sm" 
                />
              </div>

              <div className="flex-1 space-y-2 w-full">
                <label className="block text-xs font-bold text-slate-700">
                  Select Signature Image File (PNG / JPG / SVG)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        addToast('Image size should be less than 2MB', 'warning');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (uploadEvent) => {
                        setFormData({ ...formData, signature_image: uploadEvent.target.result });
                        addToast('New signature image loaded! Click Save Store Settings to apply.', 'info');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
                
                {formData.signature_image && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, signature_image: '' });
                      addToast('Reset to default pre-printed signature', 'info');
                    }}
                    className="text-xs text-red-600 hover:underline font-semibold"
                  >
                    Reset to Default Signature
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" icon={Save} className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-8">
            Save Store Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
