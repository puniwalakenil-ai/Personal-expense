import React, { useState } from 'react';
import { HandCoins, Calendar, Landmark, Banknote, Check } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PaymentMethod, PageView } from '../../types';
import { getTodayDateString, formatCurrency } from '../../utils/formatters';
import { InlineDropdown } from '../common/InlineDropdown';

interface Props {
  loanId: string;
  returnTo?: PageView;
}

export const LoanRepayFormView: React.FC<Props> = ({ loanId, returnTo }) => {
  const {
    loans,
    bankAccountsWithBalances,
    recordLoanRepayment,
    navigateTo,
    goBack,
  } = useFinancial();

  const loan = loans.find((l) => l.id === loanId);
  const pending = loan ? Math.max(0, loan.originalAmount - (loan.settledAmount || 0)) : 0;

  const [amount, setAmount] = useState(pending > 0 ? String(pending) : '');
  const [date, setDate] = useState(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Account');
  const [bankAccountId, setBankAccountId] = useState(
    bankAccountsWithBalances.length > 0 ? bankAccountsWithBalances[0].id : ''
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const isMoneyGiven = loan?.loanType === 'Money Given' || loan?.loanType === 'Loan & Advance';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loan) {
      setError('Loan record not found.');
      return;
    }

    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid repayment amount greater than 0.');
      return;
    }

    recordLoanRepayment(
      loan.id,
      num,
      paymentMethod,
      paymentMethod === 'Bank Account' ? bankAccountId : undefined,
      date,
      notes.trim()
    );

    if (returnTo) {
      navigateTo(returnTo);
    } else {
      navigateTo({ name: 'section', section: 'Loans & Advances' });
    }
  };

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
                {isMoneyGiven ? 'Record Repayment Received' : 'Record Repayment Paid'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {loan ? `${loan.personName} (${loan.loanType})` : 'Loan settlement'}
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

          {loan && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-900">Current Outstanding Balance</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Original: {formatCurrency(loan.originalAmount)} · Repaid so far: {formatCurrency(loan.settledAmount || 0)}
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900">
                {formatCurrency(pending)}
              </div>
            </div>
          )}

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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Repayment Amount (₹)
              </label>
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
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isMoneyGiven ? 'Received Into' : 'Paid From'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Bank Account', 'Cash'] as PaymentMethod[]).map((m) => (
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
                  {m === 'Bank Account' ? <Landmark className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
                  <span>{m}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'Bank Account' && (
            <div>
              <InlineDropdown
                id="loan-repay-bank-select"
                label="Select Bank Account"
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Part payment, final settlement via UPI / Cheque"
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
              <span>Record Settlement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
