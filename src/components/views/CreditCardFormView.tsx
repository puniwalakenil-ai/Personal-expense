import React, { useState, useMemo } from 'react';
import { CreditCard as CardIcon, Calendar, Check, Clock, Sparkles } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PageView } from '../../types';
import { getCurrentAndUpcomingBillingDates } from '../../utils/creditCardBilling';
import { formatDate } from '../../utils/formatters';

interface Props {
  editId?: string;
  returnTo?: PageView;
}

export const CreditCardFormView: React.FC<Props> = ({ editId, returnTo }) => {
  const { creditCards, addCreditCard, updateCreditCard, navigateTo, goBack } = useFinancial();

  const existing = editId ? creditCards.find((c) => c.id === editId) : null;

  const [cardName, setCardName] = useState(existing?.cardName || '');
  const [cardIdentifier, setCardIdentifier] = useState(existing?.cardIdentifier || '');
  const [creditLimit, setCreditLimit] = useState(existing ? String(existing.creditLimit) : '');
  const [billingDay, setBillingDay] = useState(existing ? String(existing.billingDate || 15) : '15');
  const [dueDays, setDueDays] = useState(existing?.dueDays ? String(existing.dueDays) : '20');
  const [error, setError] = useState('');

  const numBillingDay = parseInt(billingDay, 10) || 15;
  const numDueDays = parseInt(dueDays, 10) || 20;

  // Real-time automatic calculation of current and next cycle
  const previewDates = useMemo(() => {
    return getCurrentAndUpcomingBillingDates(numBillingDay, numDueDays);
  }, [numBillingDay, numDueDays]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cardName.trim()) {
      setError('Please enter credit card name (e.g. HDFC Regalia, ICICI Amazon Pay).');
      return;
    }

    if (!cardIdentifier.trim()) {
      setError('Please enter last 4 digits of the card (e.g. 8821).');
      return;
    }

    const bDay = parseInt(billingDay, 10);
    if (isNaN(bDay) || bDay < 1 || bDay > 31) {
      setError('Please enter a valid billing statement generation day between 1 and 31.');
      return;
    }

    const dDays = parseInt(dueDays, 10);
    if (isNaN(dDays) || dDays < 1 || dDays > 90) {
      setError('Please enter valid payment due days (e.g. 15 to 30 days).');
      return;
    }

    const limitNum = parseFloat(creditLimit) || 0;

    // Automatically compute current statement date & payment due date
    const { currentStatementDate, currentDueDate } = getCurrentAndUpcomingBillingDates(bDay, dDays);

    const payload = {
      cardName: cardName.trim(),
      cardIdentifier: cardIdentifier.trim(),
      creditLimit: limitNum,
      billingDate: bDay,
      dueDays: dDays,
      billingStatementDate: currentStatementDate,
      paymentDueDate: currentDueDate,
    };

    if (editId && existing) {
      updateCreditCard(editId, payload);
    } else {
      addCreditCard(payload);
    }

    if (returnTo) {
      navigateTo(returnTo);
    } else {
      navigateTo({ name: 'section', section: 'Credit Cards' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <CardIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {editId ? 'Edit Credit Card' : 'Add Credit Card'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatic monthly billing cycle & payment due tracking
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
              Card Name
            </label>
            <input
              type="text"
              placeholder="e.g. HDFC Regalia, ICICI Amazon Pay, SBI Cashback"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
              required
              autoFocus={!editId}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Card Identifier / Last 4 Digits
              </label>
              <input
                type="text"
                placeholder="e.g. 8821 or •••• 8821"
                value={cardIdentifier}
                onChange={(e) => setCardIdentifier(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Credit Limit (₹) (Optional)
              </label>
              <div className="relative">
                <span className="text-xs font-bold text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 150000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Automatic Billing Settings (Requirement 2) */}
          <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                Automatic Recurring Billing Settings
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Setting A: Billing Statement Generation Day */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Billing Statement Generation Day</span>
                </label>
                <select
                  value={billingDay}
                  onChange={(e) => setBillingDay(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 text-slate-900 font-medium cursor-pointer"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Day {d} of every month {d === 31 ? '(or last day of month)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Automatically adjusts for February (28/29 days) and 30-day months.
                </p>
              </div>

              {/* Setting B: Payment Due Days */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  <span>Payment Due Days</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    placeholder="e.g. 20"
                    value={dueDays}
                    onChange={(e) => setDueDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 text-slate-900 font-bold"
                    required
                  />
                  <span className="text-[11px] text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    days after statement
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Grace period to pay the bill (standard is 15–25 days, default: 20).
                </p>
              </div>
            </div>

            {/* Live Calculation Preview */}
            <div className="pt-3 border-t border-purple-100/80 bg-white/70 p-3 rounded-xl border space-y-1.5 text-xs">
              <div className="text-[11px] font-bold text-slate-700">
                Live Automatic Calculation:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-900">
                  <span className="text-purple-600 block text-[10px] font-semibold uppercase">Current Cycle</span>
                  <span>Statement: <strong>{formatDate(previewDates.currentStatementDate)}</strong></span>
                  <br />
                  <span>Payment Due: <strong className="text-purple-700">{formatDate(previewDates.currentDueDate)}</strong></span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 text-slate-800">
                  <span className="text-slate-500 block text-[10px] font-semibold uppercase">Next Cycle</span>
                  <span>Statement: <strong>{formatDate(previewDates.nextStatementDate)}</strong></span>
                  <br />
                  <span>Payment Due: <strong>{formatDate(previewDates.nextDueDate)}</strong></span>
                </div>
              </div>
            </div>
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
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-xs shadow-purple-600/30 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editId ? 'Update Credit Card' : 'Save Credit Card'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

