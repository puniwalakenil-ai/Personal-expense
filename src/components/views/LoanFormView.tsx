import React, { useState, useMemo } from 'react';
import {
  HandCoins,
  Calendar,
  Landmark,
  Banknote,
  Check,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
} from 'lucide-react';
import { useFinancial, getLoanDirection } from '../../context/FinancialContext';
import { LoanType, LoanDirection, PaymentMethod, PageView } from '../../types';
import { getTodayDateString, formatCurrency, normalizeCategoryName } from '../../utils/formatters';
import { InlineDropdown } from '../common/InlineDropdown';

interface Props {
  editId?: string;
  defaultType?: LoanType;
  defaultDirection?: LoanDirection;
  defaultPersonName?: string;
  returnTo?: PageView;
}

type EntryMode = 'Money Given' | 'Money Owed' | 'Adjustment';

export const LoanFormView: React.FC<Props> = ({
  editId,
  defaultType = 'Loan & Advance',
  defaultDirection,
  defaultPersonName,
  returnTo,
}) => {
  const {
    loans,
    categories,
    bankAccountsWithBalances,
    currentCashBalance,
    addLoan,
    updateLoan,
    navigateTo,
    goBack,
  } = useFinancial();

  const existing = editId ? loans.find((l) => l.id === editId) : null;

  const initialEntryKind: EntryMode = useMemo(() => {
    if (existing?.entryKind) return existing.entryKind;
    if (existing) {
      return getLoanDirection(existing) === 'Receivable' ? 'Money Given' : 'Money Owed';
    }
    if (defaultDirection === 'Payable' || defaultType === 'Money Taken') return 'Money Owed';
    return 'Money Given';
  }, [existing, defaultDirection, defaultType]);

  const [entryKind, setEntryKind] = useState<EntryMode>(initialEntryKind);
  const [adjustmentDirection, setAdjustmentDirection] = useState<LoanDirection>(
    existing ? getLoanDirection(existing) : defaultDirection || 'Receivable'
  );
  const [loanCategoryChoice, setLoanCategoryChoice] = useState<'Loan & Advance' | 'Unsecured Loan'>(() => {
    if (existing?.categoryName === 'Unsecured Loan' || existing?.loanType === 'Unsecured Loan' || existing?.loanType === 'Secured Loan') {
      return 'Unsecured Loan';
    }
    if (defaultType === 'Unsecured Loan') return 'Unsecured Loan';
    return 'Loan & Advance';
  });

  const [personName, setPersonName] = useState(existing?.personName || defaultPersonName || '');
  const [reason, setReason] = useState(existing?.reason || '');
  const [originalAmount, setOriginalAmount] = useState(existing ? String(existing.originalAmount) : '');
  const [date, setDate] = useState(existing?.date || getTodayDateString());
  const [dueDate, setDueDate] = useState(existing?.dueDate || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    existing?.paymentMethod ||
      (initialEntryKind === 'Money Given' ? 'Cash' : 'Adjustment')
  );
  const [bankAccountId, setBankAccountId] = useState(
    existing?.bankAccountId || (bankAccountsWithBalances.length > 0 ? bankAccountsWithBalances[0].id : '')
  );
  const [notes, setNotes] = useState(existing?.notes || '');
  const [error, setError] = useState('');

  // Existing known person names for quick autocomplete chips
  const knownPeople = useMemo(() => {
    const seen = new Map<string, string>();
    loans.forEach((l) => {
      const k = l.personName.trim().toLowerCase();
      if (k && !seen.has(k)) seen.set(k, l.personName.trim());
    });
    return Array.from(seen.values());
  }, [loans]);

  const handleModeSwitch = (mode: EntryMode) => {
    setEntryKind(mode);
    if (mode === 'Money Given') {
      if (paymentMethod === 'Adjustment') setPaymentMethod('Cash');
    } else if (mode === 'Money Owed') {
      setPaymentMethod('Adjustment');
    } else {
      setPaymentMethod('Adjustment');
    }
  };

  const resolvedDirection: LoanDirection =
    entryKind === 'Money Given'
      ? 'Receivable'
      : entryKind === 'Money Owed'
      ? 'Payable'
      : adjustmentDirection;

  const isReceivable = resolvedDirection === 'Receivable';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!personName.trim()) {
      setError('Please enter person name.');
      return;
    }

    const num = parseFloat(originalAmount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (paymentMethod === 'Bank Account' && !bankAccountId) {
      setError('Please select a bank account.');
      return;
    }

    const matchedCategory = categories.find(
      (c) => normalizeCategoryName(c.name) === normalizeCategoryName(loanCategoryChoice)
    );

    const effectivePaymentMethod: PaymentMethod =
      entryKind === 'Adjustment' ? 'Adjustment' : paymentMethod;

    const effectiveLoanType: LoanType = loanCategoryChoice;

    if (editId && existing) {
      updateLoan(editId, {
        personName: personName.trim(),
        loanType: effectiveLoanType,
        direction: resolvedDirection,
        entryKind,
        reason: reason.trim() || undefined,
        categoryId: matchedCategory?.id,
        categoryName: matchedCategory?.name || loanCategoryChoice,
        originalAmount: num,
        date,
        dueDate: dueDate.trim() || undefined,
        paymentMethod: effectivePaymentMethod,
        bankAccountId: effectivePaymentMethod === 'Bank Account' ? bankAccountId : undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addLoan({
        personName: personName.trim(),
        loanType: effectiveLoanType,
        direction: resolvedDirection,
        entryKind,
        reason: reason.trim() || undefined,
        categoryId: matchedCategory?.id,
        categoryName: matchedCategory?.name || loanCategoryChoice,
        originalAmount: num,
        date,
        dueDate: dueDate.trim() || undefined,
        paymentMethod: effectivePaymentMethod,
        bankAccountId: effectivePaymentMethod === 'Bank Account' ? bankAccountId : undefined,
        notes: notes.trim() || undefined,
      });
    }

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
                {editId ? 'Edit Loan / Advance Entry' : 'Record Person-Wise Loan or Advance'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isReceivable
                  ? 'Money given / receivable from someone (They owe you)'
                  : 'Money owed / payable to someone (You owe them)'}
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

          {/* Scenario Selector (A, B, C) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Entry Scenario
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleModeSwitch('Money Given')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  entryKind === 'Money Given'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Money Given</span>
                </div>
                <div className={`text-[10px] mt-1 ${entryKind === 'Money Given' ? 'text-emerald-100' : 'text-slate-500'}`}>
                  You paid/lent via Cash, Bank, or Adjustment
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeSwitch('Money Owed')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  entryKind === 'Money Owed'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Money Owed</span>
                </div>
                <div className={`text-[10px] mt-1 ${entryKind === 'Money Owed' ? 'text-rose-100' : 'text-slate-500'}`}>
                  Someone paid for you; record payable only
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeSwitch('Adjustment')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  entryKind === 'Adjustment'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Adjustment Entry</span>
                </div>
                <div className={`text-[10px] mt-1 ${entryKind === 'Adjustment' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Track balance without Cash/Bank change
                </div>
              </button>
            </div>
          </div>

          {/* Direction toggle when Adjustment Entry is selected */}
          {entryKind === 'Adjustment' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Adjustment Direction
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentDirection('Receivable')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                    adjustmentDirection === 'Receivable'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  They Owe Me (Receivable)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentDirection('Payable')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                    adjustmentDirection === 'Payable'
                      ? 'bg-rose-50 text-rose-800 border-rose-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  I Owe Them (Payable)
                </button>
              </div>
            </div>
          )}

          {/* Category: Loan & Advance vs Unsecured Loan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Loan & Advance', 'Unsecured Loan'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setLoanCategoryChoice(cat)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    loanCategoryChoice === cat
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Person Name & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Person's Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="known-loan-people"
                placeholder="e.g. Ramesh Bhai, Amit, Friend"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 font-medium"
                required
                autoFocus={!editId && !defaultPersonName}
              />
              <datalist id="known-loan-people">
                {knownPeople.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Amount (₹) <span className="text-rose-500">*</span>
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

          {/* Details / Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Details / Reason
            </label>
            <input
              type="text"
              placeholder="e.g. Friend paid dinner share, Trip advance, Short-term help"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
            />
          </div>

          {/* Dates */}
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
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
              />
            </div>
          </div>

          {/* Payment Method */}
          {entryKind === 'Money Given' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Payment Method</label>
                {paymentMethod === 'Cash' && (
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                    Cash-in-Hand: {formatCurrency(currentCashBalance)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'Cash', label: 'Cash', icon: Banknote },
                    { id: 'Bank Account', label: 'Bank Account', icon: Landmark },
                    { id: 'Adjustment', label: 'Adjustment', icon: SlidersHorizontal },
                  ] as const
                ).map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === m.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Recorded as Adjustment — No Cash or Bank Change</div>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  {entryKind === 'Money Owed'
                    ? 'When someone else pays your share, your Cash-in-Hand and Bank balances remain untouched while your outstanding payable is tracked.'
                    : 'Adjustment entries update the person-wise Loan/Advance ledger without creating any Cash or Bank deduction.'}
                </p>
              </div>
            </div>
          )}

          {entryKind === 'Money Given' && paymentMethod === 'Bank Account' && (
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Split dinner bill, return by month end..."
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
              <span>{editId ? 'Update Entry' : 'Save Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
