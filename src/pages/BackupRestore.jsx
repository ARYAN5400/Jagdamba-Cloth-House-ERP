import React, { useState } from 'react';
import { Database, Download, Upload, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export function BackupRestore() {
  const { addToast } = useApp();
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const res = await api.post('/backup/create');
      if (res.data && !res.data.cancelled) {
        addToast(`Backup created successfully at: ${res.data.path}`, 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to create backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoreModalOpen(false);
    setLoading(true);
    try {
      const res = await api.post('/backup/restore');
      if (res.data && !res.data.cancelled) {
        addToast('Database restored successfully! Application reloaded.', 'success');
        window.location.reload();
      }
    } catch (err) {
      addToast(err.message || 'Failed to restore database', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Database Backup & Security</h2>
        <p className="text-xs text-slate-500 mt-1">Export local SQLite snapshots to protect your business records from hardware failures</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <Card title="Export Local Database Backup">
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-brand-50/60 border border-brand-100 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-brand-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800 block text-sm">Recommended Daily Routine</span>
                Create a copy of your <b>retail_erp.db</b> database file onto a USB flash drive or secondary drive at the end of every business day.
              </div>
            </div>

            <Button
              onClick={handleBackup}
              disabled={loading}
              icon={Download}
              size="lg"
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3"
            >
              {loading ? 'Processing...' : 'Backup Now (.db File)'}
            </Button>
          </div>
        </Card>

        {/* Restore Card */}
        <Card title="Restore Database Backup">
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-amber-900 block text-sm">Caution Before Restoring</span>
                Restoring a backup file will <b>overwrite all current inventory, sales, and settings</b> in the application with the data from the selected backup file.
              </div>
            </div>

            <Button
              onClick={() => setIsRestoreModalOpen(true)}
              disabled={loading}
              variant="outline"
              icon={Upload}
              size="lg"
              className="w-full border-amber-300 text-amber-900 hover:bg-amber-100 font-bold py-3"
            >
              Restore Previous Backup
            </Button>
          </div>
        </Card>
      </div>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        title="⚠️ Confirm Database Restore"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Are you sure you want to restore a database backup? This will replace all your current products, sales invoices, and ledger records.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsRestoreModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRestore} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
              Yes, Choose Backup File & Restore
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
