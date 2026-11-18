import React, { useState, useMemo, useEffect } from 'react';
import {
  HandCoins,
  Calendar,
  Landmark,
  Banknote,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  User,
} from 'lucide-react';
import { useFinancial, getLoanDirection } from '../../context/FinancialContext';
import { PaymentMethod, PageView, LoanDirection } from '../../types';
import { getTodayDateString, formatCurrency } from '../../utils/formatters';
import { InlineDropdown } from '../common/InlineDropdown';

interface Props {
  loanId?: string;
  personName?: string;
  mode?: 'pay' | 'receive';
  returnTo?: PageView;
}

export const LoanRepayFormView: React.FC<Props> = ({ loanId, personName: initialPersonName, mode, returnTo }) => {
  const {
    loans,
    bankAccountsWithBalances,
    currentCashBalance,
    recordPersonSettlement,
    navigateTo,
    goBack,
  } = useFinancial();

  const targetedLoan = loanId ? loans.find((l) => l.id === loanId) : undefined;

  const initialDirection: LoanDirection = targetedLoan
    ? getLoanDirection(targetedLoan)
    : mode === 'receive'
    ? 'Receivable'
    : 'Payable';

  const [direction, setDirection] = useState<LoanDirection>(initialDirection);

  // Build people with pending balances for the active direction
  const peopleWithPending = useMemo(() => {
    const map = new Map<string, { personName: string; pending: number; count: number }>();
    loans.forEach((l) => {
      if (getLoanDirection(l) !== direction) return;
      const pend = Math.max(0, l.originalAmount - (l.settledAmount || 0));
      if (pend <= 0.001) return;
      const key = l.personName.trim().toLowerCase();
      const prev = map.get(key) || { personName: l.personName.trim(), pending: 0, count: 0 };
      prev.pending += pend;
      prev.count += 1;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.pending - a.pending);
  }, [loans, direction]);

  const [selectedPersonName, setSelectedPersonName] = useState<string>(
    targetedLoan?.personName || initialPersonName || ''
  );

  // Ensure selectedPersonName defaults cleanly when peopleWithPending loads
  useEffect(() => {
    if (targetedLoan) {
      setSelectedPersonName(targetedLoan.personName);
      return;
    }
    if (
      !selectedPersonName ||
      !peopleWithPending.some((p) => p.personName.toLowerCase() === selectedPersonName.trim().toLowerCase())
    ) {
      if (peopleWithPending.length > 0) {
        setSelectedPersonName(peopleWithPending[0].personName);
      }
    }
  }, [targetedLoan, peopleWithPending]);

  const activePending = useMemo(() => {
    if (targetedLoan) {
      return Math.max(0, targetedLoan.originalAmount - (targetedLoan.settledAmount || 0));
    }
    const found = peopleWithPending.find(
      (p) => p.personName.toLowerCase() === selectedPersonName.trim().toLowerCase()
    );
    return found ? found.pending : 0;
  }, [targetedLoan, peopleWithPending, selectedPersonName]);

  const [amount, setAmount] = useState(activePending > 0 ? String(activePending) : '');
  const [date, setDate] = useState(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Account');
  const [bankAccountId, setBankAccountId] = useState(
    bankAccountsWithBalances.length > 0 ? bankAccountsWithBalances[0].id : ''
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Auto-update suggested full amount when switching person or direction (if not manually edited)
  useEffect(() => {
    setAmount(activePending > 0 ? String(activePending) : '');
  }, [selectedPersonName, direction]);

  const isReceive = direction === 'Receivable';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const targetPerson = targetedLoan ? targetedLoan.personName : selectedPersonName.trim();
    if (!targetPerson) {
      setError('Please select a person.');
      return;
    }

    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (activePending > 0 && num > activePending + 0.01) {
      setError(`Amount cannot exceed the pending balance (${formatCurrency(activePending)}).`);
      return;
    }

    if (paymentMethod === 'Bank Account' && !bankAccountId) {
      setError('Please select a bank account.');
      return;
    }

    recordPersonSettlement({
      personName: targetPerson,
      direction,
      amount: num,
      paymentMethod,
      bankAccountId: paymentMethod === 'Bank Account' ? bankAccountId : undefined,
      date,
      notes: notes.trim() || undefined,
      loanId: targetedLoan?.id,
    });

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
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                isReceive
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              }`}
            >
              {isReceive ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isReceive ? 'Person-Wise Money Received' : 'Direct Repayment to Person'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isReceive
                  ? 'Record money returned to you via Cash or Bank Account (reduces receivable)'
                  : 'Repay an outstanding payable directly via Cash or Bank Account'}
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

          {/* Switch between Pay Payable & Receive Receivable when not locked to a specific loanId */}
          {!targetedLoan && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setDirection('Payable')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  direction === 'Payable' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Pay Outstanding (You Owe)</span>
              </button>
              <button
                type="button"
                onClick={() => setDirection('Receivable')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  direction === 'Receivable' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Money Received (Owes You)</span>
              </button>
            </div>
          )}

          {/* Person Selector or Locked Person Info */}
          {!targetedLoan ? (
            peopleWithPending.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                <HandCoins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-800">
                  No Pending {isReceive ? 'Receivable' : 'Payable'} Balances
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  All {isReceive ? 'money given' : 'money owed'} records are currently settled.
                </p>
              </div>
            ) : (
              <InlineDropdown
                id="settlement-person-select"
                label={isReceive ? 'Select Person Paying You Back' : 'Select Person to Repay'}
                value={selectedPersonName}
                onChange={(val) => setSelectedPersonName(val)}
                options={peopleWithPending.map((p) => ({
                  value: p.personName,
                  label: p.personName,
                  subtitle: `${p.count} pending entr${p.count === 1 ? 'y' : 'ies'}`,
                  badge: formatCurrency(p.pending),
                  icon: <User className="w-3.5 h-3.5" />,
                }))}
                placeholder="Select person..."
                searchPlaceholder="Search person name..."
              />
            )
          ) : null}

          {/* Pending Balance Summary Box */}
          {(targetedLoan || peopleWithPending.length > 0) && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  {targetedLoan
                    ? `${targetedLoan.personName} (${targetedLoan.categoryName || targetedLoan.loanType})`
                    : `${selectedPersonName || 'Person'} · Pending ${isReceive ? 'Receivable' : 'Payable'}`}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {targetedLoan
                    ? `Original: ${formatCurrency(targetedLoan.originalAmount)} · Settled: ${formatCurrency(targetedLoan.settledAmount || 0)}`
                    : 'Partial or full payment updates person ledger & balance automatically'}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-bold font-mono text-slate-900">
                  {formatCurrency(activePending)}
                </div>
                {activePending > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(activePending))}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Fill Full Amount
                  </button>
                )}
              </div>
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isReceive ? 'Amount Received (₹)' : 'Repayment Amount (₹)'}
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

          {/* Payment Method: Bank Account or Cash */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {isReceive ? 'Received Into' : 'Paid From'}
              </label>
              {paymentMethod === 'Cash' && (
                <span className="text-[11px] font-mono font-semibold text-emerald-700">
                  Cash-in-Hand: {formatCurrency(currentCashBalance)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['Bank Account', 'Cash'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer ${
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
              placeholder={
                isReceive
                  ? 'e.g. Received part payment via GPay / Cash'
                  : 'e.g. Repaid friend for dinner share'
              }
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
              disabled={!targetedLoan && peopleWithPending.length === 0}
              className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50 ${
                isReceive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isReceive ? 'Record Money Received' : 'Record Repayment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
