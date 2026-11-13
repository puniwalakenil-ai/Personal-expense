import React, { useState } from 'react';
import { HandCoins, Calendar, Landmark, Banknote, Check } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { LoanType, PaymentMethod, PageView } from '../../types';
import { getTodayDateString, formatCurrency } from '../../utils/formatters';
import { InlineDropdown } from '../common/InlineDropdown';

interface Props {
  editId?: string;
  defaultType?: LoanType;
  returnTo?: PageView;
}

export const LoanFormView: React.FC<Props> = ({ editId, defaultType = 'Money Given', returnTo }) => {
  const {
    loans,
    bankAccountsWithBalances,
    addLoan,
    updateLoan,
    navigateTo,
    goBack,
  } = useFinancial();

  const existing = editId ? loans.find((l) => l.id === editId) : null;

  const [personName, setPersonName] = useState(existing?.personName || '');
  const [loanType, setLoanType] = useState<LoanType>(existing?.loanType || defaultType);
  const [originalAmount, setOriginalAmount] = useState(existing ? String(existing.originalAmount) : '');
  const [date, setDate] = useState(existing?.date || getTodayDateString());
  const [dueDate, setDueDate] = useState(existing?.dueDate || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(existing?.paymentMethod || 'Cash');
  const [bankAccountId, setBankAccountId] = useState(
    existing?.bankAccountId || (bankAccountsWithBalances.length > 0 ? bankAccountsWithBalances[0].id : '')
  );
  const [notes, setNotes] = useState(existing?.notes || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!personName.trim()) {
      setError('Please enter person or organization name.');
      return;
    }

    const num = parseFloat(originalAmount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid loan amount greater than 0.');
      return;
    }

    if (editId && existing) {
      updateLoan(editId, {
        personName: personName.trim(),
        loanType,
        originalAmount: num,
        date,
        dueDate: dueDate.trim() || undefined,
        paymentMethod,
        bankAccountId: paymentMethod === 'Bank Account' ? bankAccountId : undefined,
        notes: notes.trim(),
      });
    } else {
      addLoan({
        personName: personName.trim(),
        loanType,
        originalAmount: num,
        date,
        dueDate: dueDate.trim() || undefined,
        paymentMethod,
        bankAccountId: paymentMethod === 'Bank Account' ? bankAccountId : undefined,
        notes: notes.trim(),
      });
    }

    if (returnTo) {
      navigateTo(returnTo);
    } else {
      navigateTo({ name: 'section', section: 'Loans & Advances' });
    }
  };

  const isMoneyGiven = loanType === 'Money Given' || loanType === 'Loan & Advance';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {editId ? 'Edit Loan Record' : 'Record Loan or Advance'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isMoneyGiven
                  ? 'Money lent to someone (They owe you)'
                  : 'Money borrowed from someone (You owe them)'}
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

          {/* Loan Category Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Loan Type & Purpose
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  'Money Given',
                  'Money Taken',
                  'Loan & Advance',
                  'Secured Loan',
                  'Unsecured Loan',
                ] as LoanType[]
              ).map((type) => {
                const isSelected = loanType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLoanType(type)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Person Name & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isMoneyGiven ? 'Borrower Name (Who owes you)' : 'Lender Name (Whom you owe)'}
              </label>
              <input
                type="text"
                placeholder="e.g. Ramesh Bhai, Amit Sharma, Friend"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
                required
                autoFocus={!editId}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Loan Amount (₹)
              </label>
              <div className="relative">
                <span className="text-xs font-bold text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={originalAmount}
                  onChange={(e) => setOriginalAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
                  required
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Disbursement Date
              </label>
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Due Date for Repayment (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
              />
            </div>
          </div>

          {/* Payment Method Used for Disbursement */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Disbursed Via
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Cash', 'Bank Account'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer ${
                    paymentMethod === m
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m === 'Cash' ? <Banknote className="w-3.5 h-3.5" /> : <Landmark className="w-3.5 h-3.5" />}
                  <span>{m}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'Bank Account' && (
            <div>
              <InlineDropdown
                id="loan-bank-select"
                label="Bank Account"
                value={bankAccountId}
                onChange={(val) => setBankAccountId(val)}
                options={bankAccountsWithBalances.map((b) => ({
                  value: b.id,
                  label: b.bankName,
                  subtitle: `•••• ${b.accountNumber.slice(-4)}`,
                  badge: `Bal: ${formatCurrency(b.currentBalance)}`,
                  icon: <Landmark className="w-3.5 h-3.5" />,
                }))}
                placeholder="Select bank account..."
                searchPlaceholder="Search bank accounts..."
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Notes & Terms (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 0% interest, promised return by month end..."
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
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs shadow-indigo-600/30 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editId ? 'Update Loan Record' : 'Save Loan Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
