import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, Calendar, Landmark, Banknote, QrCode, Plus, Check } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PaymentMethod, PageView } from '../../types';
import { getTodayDateString, formatCurrency } from '../../utils/formatters';
import { InlineDropdown } from '../common/InlineDropdown';

interface Props {
  editId?: string;
  returnTo?: PageView;
}

export const MoneyReceivedFormView: React.FC<Props> = ({ editId, returnTo }) => {
  const {
    categories,
    bankAccountsWithBalances,
    addMoneyReceived,
    updateTransaction,
    transactions,
    navigateTo,
    goBack,
  } = useFinancial();

  const existingTxn = editId ? transactions.find((t) => t.id === editId) : null;

  const [date, setDate] = useState<string>(existingTxn?.date || getTodayDateString());
  const [title, setTitle] = useState<string>(existingTxn?.title || '');
  const [personName, setPersonName] = useState<string>(existingTxn?.personName || '');
  const [categoryId, setCategoryId] = useState<string>(existingTxn?.categoryId || '');
  const [amount, setAmount] = useState<string>(existingTxn ? String(existingTxn.amount) : '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(existingTxn?.paymentMethod || 'Bank Account');
  const [bankAccountId, setBankAccountId] = useState<string>(existingTxn?.bankAccountId || '');
  const [upiId, setUpiId] = useState<string>(existingTxn?.upiId || '');
  const [notes, setNotes] = useState<string>(existingTxn?.notes || '');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!bankAccountId && bankAccountsWithBalances.length > 0) {
      setBankAccountId(bankAccountsWithBalances[0].id);
    }
  }, [bankAccountsWithBalances, bankAccountId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a title or source (e.g. Salary, Client payment, Gift).');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (paymentMethod === 'Bank Account' && !bankAccountId) {
      setError('Please select a destination bank account or create a new one.');
      return;
    }

    if (editId && existingTxn) {
      updateTransaction(editId, {
        date,
        title: title.trim(),
        personName: personName.trim(),
        categoryId: categoryId || undefined,
        amount: numAmount,
        paymentMethod,
        bankAccountId: paymentMethod === 'Bank Account' || paymentMethod === 'UPI' ? bankAccountId : undefined,
        upiId: paymentMethod === 'UPI' ? upiId : undefined,
        notes: notes.trim(),
      });
    } else {
      addMoneyReceived({
        date,
        title: title.trim(),
        personName: personName.trim(),
        categoryId: categoryId || undefined,
        amount: numAmount,
        paymentMethod,
        bankAccountId: paymentMethod === 'Bank Account' || paymentMethod === 'UPI' ? bankAccountId : undefined,
        upiId: paymentMethod === 'UPI' ? upiId : undefined,
        notes: notes.trim(),
      });
    }

    if (returnTo) {
      navigateTo(returnTo);
    } else {
      navigateTo({ name: 'section', section: 'Money Received' });
    }
  };

  const handleCreateNewCategory = () => {
    navigateTo({
      name: 'category-form',
      defaultType: 'Income',
      returnTo: { name: 'money-received-form', editId },
    });
  };

  const handleCreateNewBank = () => {
    navigateTo({
      name: 'bank-account-form',
      returnTo: { name: 'money-received-form', editId },
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {editId ? 'Edit Money Received' : 'Record Money Received'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Log income, salary, client deposits, or cashback
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

          {/* Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Amount (₹)</label>
              <div className="relative">
                <span className="text-xs font-bold text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
                  required
                  autoFocus={!editId}
                />
              </div>
            </div>
          </div>

          {/* Title & Payer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Title / Income Source
              </label>
              <input
                type="text"
                placeholder="e.g. October Salary, Freelance project, Dividend"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Received From (Person / Client)
              </label>
              <input
                type="text"
                placeholder="e.g. ABC Corp, Rahul Patel"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
              />
            </div>
          </div>

          {/* Category - Modern Inline Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">Category (Optional)</label>
              <button
                type="button"
                onClick={handleCreateNewCategory}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Category</span>
              </button>
            </div>
            <InlineDropdown
              id="money-received-category-inline-select"
              value={categoryId}
              onChange={(val) => setCategoryId(val)}
              options={[
                { value: '', label: '(None / General Inflow)' },
                ...categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  badge: c.type,
                  color: c.color,
                })),
              ]}
              placeholder="(None / General Inflow)"
              searchPlaceholder="Search categories..."
            />
          </div>

          {/* Destination Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Received Into
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Bank Account', 'Cash', 'UPI'] as PaymentMethod[]).map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {method === 'Bank Account' && <Landmark className="w-3.5 h-3.5" />}
                    {method === 'Cash' && <Banknote className="w-3.5 h-3.5" />}
                    {method === 'UPI' && <QrCode className="w-3.5 h-3.5" />}
                    <span>{method}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bank selection - Modern Inline Dropdown */}
          {paymentMethod === 'Bank Account' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Bank Account</label>
                <button
                  type="button"
                  onClick={handleCreateNewBank}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Bank</span>
                </button>
              </div>
              {bankAccountsWithBalances.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                  <span>No bank accounts yet.</span>
                  <button
                    type="button"
                    onClick={handleCreateNewBank}
                    className="font-bold underline cursor-pointer"
                  >
                    Add Bank Account
                  </button>
                </div>
              ) : (
                <InlineDropdown
                  id="money-received-bank-inline-select"
                  value={bankAccountId}
                  onChange={(val) => setBankAccountId(val)}
                  options={bankAccountsWithBalances.map((b) => ({
                    value: b.id,
                    label: b.bankName,
                    subtitle: `•••• ${b.accountNumber.slice(-4)}`,
                    badge: `Bal: ${formatCurrency(b.currentBalance)}`,
                    icon: <Landmark className="w-3.5 h-3.5" />,
                  }))}
                  placeholder="Select destination bank account..."
                  searchPlaceholder="Search bank accounts..."
                />
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Any additional notes or invoice/reference numbers..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
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
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs shadow-emerald-600/30 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editId ? 'Update Receipt' : 'Save Money Received'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
