import React, { useState } from 'react';
import { QrCode, Check, Landmark } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PageView } from '../../types';
import { InlineDropdown } from '../common/InlineDropdown';

interface Props {
  editId?: string;
  returnTo?: PageView;
}

export const UpiFormView: React.FC<Props> = ({ editId, returnTo }) => {
  const { upiAccounts, bankAccounts, addUpiAccount, updateUpiAccount, navigateTo, goBack } = useFinancial();

  const existing = editId ? upiAccounts.find((u) => u.id === editId) : null;

  const [upiId, setUpiId] = useState(existing?.upiId || '');
  const [label, setLabel] = useState(existing?.label || '');
  const [bankAccountId, setBankAccountId] = useState(existing?.bankAccountId || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!upiId.trim()) {
      setError('Please enter UPI handle / VPA (e.g. name@okhdfcbank).');
      return;
    }

    if (!label.trim()) {
      setError('Please enter a display label (e.g. Primary GPay, PhonePe).');
      return;
    }

    if (editId && existing) {
      updateUpiAccount(editId, {
        upiId: upiId.trim(),
        label: label.trim(),
        bankAccountId: bankAccountId || undefined,
      });
    } else {
      addUpiAccount({
        upiId: upiId.trim(),
        label: label.trim(),
        bankAccountId: bankAccountId || undefined,
      });
    }

    if (returnTo) {
      navigateTo(returnTo);
    } else {
      navigateTo({ name: 'section', section: 'UPI' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {editId ? 'Edit UPI Account' : 'Register UPI ID'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Link virtual payment addresses (VPAs) for instant transfers
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              UPI Handle / VPA
            </label>
            <input
              type="text"
              placeholder="e.g. user@okhdfcbank, 9876543210@paytm, name@ibl"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 font-mono"
              required
              autoFocus={!editId}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Label / Nickname
            </label>
            <input
              type="text"
              placeholder="e.g. Primary GPay, Work PhonePe, Paytm QR"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
              required
            />
          </div>

          <div>
            <InlineDropdown
              id="upi-linked-bank-select"
              label="Linked Bank Account (Optional)"
              value={bankAccountId}
              onChange={(val) => setBankAccountId(val)}
              options={[
                { value: '', label: '(None / No linked bank)' },
                ...bankAccounts.map((b) => ({
                  value: b.id,
                  label: b.bankName,
                  subtitle: `•••• ${b.accountNumber.slice(-4)}`,
                  icon: <Landmark className="w-3.5 h-3.5" />,
                })),
              ]}
              placeholder="Select linked bank account..."
              searchPlaceholder="Search bank accounts..."
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={goBack}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs shadow-indigo-600/30 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editId ? 'Update UPI' : 'Register UPI'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
