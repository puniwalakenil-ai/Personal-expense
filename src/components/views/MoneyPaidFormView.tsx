import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Landmark,
  Banknote,
  QrCode,
  CreditCard as CardIcon,
  Plus,
  Check,
  ChevronDown,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PaymentMethod, PageView } from '../../types';
import { getTodayDateString, formatCurrency, normalizeCategoryName } from '../../utils/formatters';
import { InlineDropdown } from '../common/InlineDropdown';

interface Props {
  editId?: string;
  restoredState?: {
    title: string;
    personName?: string;
    categoryId?: string;
    date: string;
    amount: string;
    paymentMethod: PaymentMethod;
    bankAccountId?: string;
    creditCardId?: string;
    upiId?: string;
    notes?: string;
  };
  returnTo?: PageView;
}

export const MoneyPaidFormView: React.FC<Props> = ({ editId, restoredState, returnTo }) => {
  const {
    categories,
    bankAccountsWithBalances,
    creditCardsWithOutstanding,
    savedItemNames,
    savedExpenseDetails,
    getItemNameCategory,
    addMoneyPaid,
    updateTransaction,
    transactions,
    navigateTo,
    goBack,
  } = useFinancial();

  const existingTxn = editId ? transactions.find((t) => t.id === editId) : null;

  const [date, setDate] = useState<string>(
    restoredState?.date || existingTxn?.date || getTodayDateString()
  );
  const [title, setTitle] = useState<string>(
    restoredState?.title || existingTxn?.title || ''
  );
  const [personName, setPersonName] = useState<string>(
    restoredState?.personName || existingTxn?.personName || ''
  );
  const [categoryId, setCategoryId] = useState<string>(
    restoredState?.categoryId || existingTxn?.categoryId || ''
  );
  const [amount, setAmount] = useState<string>(
    restoredState ? restoredState.amount : existingTxn ? String(existingTxn.amount) : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    restoredState?.paymentMethod || existingTxn?.paymentMethod || 'Bank Account'
  );
  const [bankAccountId, setBankAccountId] = useState<string>(
    restoredState?.bankAccountId || existingTxn?.bankAccountId || ''
  );
  const [creditCardId, setCreditCardId] = useState<string>(
    restoredState?.creditCardId || existingTxn?.creditCardId || ''
  );
  const [upiId, setUpiId] = useState<string>(
    restoredState?.upiId || existingTxn?.upiId || ''
  );
  const [notes, setNotes] = useState<string>(
    restoredState?.notes || existingTxn?.notes || ''
  );
  const [error, setError] = useState<string>('');

  // Dropdown state for Detail / Name
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const detailContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (detailContainerRef.current && !detailContainerRef.current.contains(e.target as Node)) {
        setIsDetailOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Compute all available Detail / Names
  const availableDetails = useMemo(() => {
    const map = new Map<string, string>();
    (savedItemNames || []).forEach((item) => {
      if (item.name && item.name.trim()) {
        map.set(item.name.trim().toLowerCase(), item.name.trim());
      }
    });
    (savedExpenseDetails || []).forEach((d) => {
      if (d && d.trim() && !map.has(d.trim().toLowerCase())) {
        map.set(d.trim().toLowerCase(), d.trim());
      }
    });
    transactions
      .filter((t) => t.type === 'Money Paid' || t.type === 'Expense')
      .forEach((t) => {
        if (t.title && t.title.trim() && !map.has(t.title.trim().toLowerCase())) {
          map.set(t.title.trim().toLowerCase(), t.title.trim());
        }
      });
    return Array.from(map.values());
  }, [savedItemNames, savedExpenseDetails, transactions]);

  // Requirement 1 & 5: Ensure categories are unique by normalized name and ID
  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((cat) => {
      const norm = normalizeCategoryName(cat.name);
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  }, [categories]);

  const filteredDetails = useMemo(() => {
    if (!title.trim()) return availableDetails;
    const q = title.toLowerCase().trim();
    return availableDetails.filter((d) => d.toLowerCase().includes(q));
  }, [availableDetails, title]);

  const isExactMatch = useMemo(() => {
    if (!title.trim()) return true;
    return availableDetails.some(
      (d) => d.toLowerCase() === title.trim().toLowerCase()
    );
  }, [availableDetails, title]);

  const handleSelectDetail = (nameVal: string) => {
    setTitle(nameVal);
    setIsDetailOpen(false);

    const linked = getItemNameCategory(nameVal);
    if (linked) {
      setCategoryId(linked);
    }
  };

  const linkedCategoryId = useMemo(() => {
    if (!title.trim()) return undefined;
    return getItemNameCategory(title.trim());
  }, [title, getItemNameCategory, savedItemNames]);

  useEffect(() => {
    if (title.trim()) {
      const linked = getItemNameCategory(title.trim());
      if (linked && (!categoryId || categoryId !== linked)) {
        setCategoryId(linked);
      }
    }
  }, [title, getItemNameCategory]);

  const handleOpenCreateNamePage = () => {
    setIsDetailOpen(false);
    navigateTo({
      name: 'create-name-form',
      initialName: title.trim(),
      formStateToRestore: {
        formType: 'money-paid',
        editId,
        date,
        amount,
        paymentMethod,
        bankAccountId,
        creditCardId,
        upiId,
        personName,
        notes,
      },
      returnTo: {
        name: 'money-paid-form',
        editId,
        returnTo,
      },
    });
  };

  useEffect(() => {
    if (paymentMethod === 'Bank Account' && !bankAccountId && bankAccountsWithBalances.length > 0) {
      setBankAccountId(bankAccountsWithBalances[0].id);
    }
    if (paymentMethod === 'Credit Card' && !creditCardId && creditCardsWithOutstanding.length > 0) {
      setCreditCardId(creditCardsWithOutstanding[0].id);
    }
  }, [paymentMethod, bankAccountsWithBalances, creditCardsWithOutstanding, bankAccountId, creditCardId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter Detail / Name (e.g. Electrician charges, Rent, Services).');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0.');
      return;
    }

    if (paymentMethod === 'Bank Account' && !bankAccountId) {
      setError('Please select a source bank account or create a new one.');
      return;
    }

    if (paymentMethod === 'Credit Card' && !creditCardId) {
      setError('Please select a credit card or create a new one.');
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
        creditCardId: paymentMethod === 'Credit Card' ? creditCardId : undefined,
        upiId: paymentMethod === 'UPI' ? upiId : undefined,
        notes: notes.trim(),
      });
    } else {
      addMoneyPaid({
        date,
        title: title.trim(),
        personName: personName.trim(),
        categoryId: categoryId || undefined,
        amount: numAmount,
        paymentMethod,
        bankAccountId: paymentMethod === 'Bank Account' || paymentMethod === 'UPI' ? bankAccountId : undefined,
        creditCardId: paymentMethod === 'Credit Card' ? creditCardId : undefined,
        upiId: paymentMethod === 'UPI' ? upiId : undefined,
        notes: notes.trim(),
      });
    }

    if (returnTo) {
      navigateTo(returnTo);
    } else {
      navigateTo({ name: 'section', section: 'Money Paid' });
    }
  };

  const handleCreateNewBank = () => {
    navigateTo({
      name: 'bank-account-form',
      returnTo: {
        name: 'money-paid-form',
        editId,
        restoredState: {
          title,
          personName,
          categoryId,
          date,
          amount,
          paymentMethod,
          bankAccountId,
          creditCardId,
          upiId,
          notes,
        },
      },
    });
  };

  const handleCreateNewCard = () => {
    navigateTo({
      name: 'credit-card-form',
      returnTo: {
        name: 'money-paid-form',
        editId,
        restoredState: {
          title,
          personName,
          categoryId,
          date,
          amount,
          paymentMethod,
          bankAccountId,
          creditCardId,
          upiId,
          notes,
        },
      },
    });
  };

  const selectedCategoryObj = categories.find((c) => c.id === categoryId);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Banner */}
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {editId ? 'Edit Money Paid Entry' : 'Record Money Paid'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Track personal payments, vendor payouts, and outgoing funds
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
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
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
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
                  required
                  autoFocus={!editId && !title}
                />
              </div>
            </div>
          </div>

          {/* Detail / Name & Payee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div ref={detailContainerRef} className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Detail / Name
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search or type detail / name..."
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsDetailOpen(true);
                  }}
                  onFocus={() => setIsDetailOpen(true)}
                  className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(!isDetailOpen)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  aria-label="Toggle dropdown list"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDetailOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Requirement 1: Small "Create New" option directly below the Name field if not in list */}
              {title.trim() && !isExactMatch && (
                <div className="mt-2 p-2.5 bg-purple-50/80 border border-purple-200/80 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="text-xs text-purple-900 truncate">
                      "<strong>{title.trim()}</strong>" is not saved
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCreateNamePage}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs shadow-purple-600/30 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Create Now</span>
                  </button>
                </div>
              )}

              {/* Requirement 2: Modern Inline Dropdown (Expands naturally within page layout, NOT floating popup) */}
              {isDetailOpen && (
                <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs max-h-56 overflow-y-auto space-y-1 transition-all">
                  {filteredDetails.length > 0 ? (
                    filteredDetails.map((item) => {
                      const isSelected = title.trim().toLowerCase() === item.toLowerCase();
                      const linkedCat = getItemNameCategory(item);
                      const catObj = linkedCat ? categories.find((c) => c.id === linkedCat) : null;

                      return (
                        <div
                          key={item}
                          onClick={() => handleSelectDetail(item)}
                          className={`px-3 py-2.5 rounded-xl text-xs hover:bg-purple-50/70 cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-purple-50 text-purple-700 font-bold border border-purple-200/60' : 'text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span>{item}</span>
                            {catObj && (
                              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 truncate">
                                {catObj.name}
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 stroke-[2.5]" />}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">No matching name</p>
                      {title.trim() && (
                        <p className="text-[11px] text-purple-600 mt-1">
                          Click "Create New" above to add "{title.trim()}"!
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Paid To (Person / Payee)
              </label>
              <input
                type="text"
                placeholder="e.g. Amit Sharma, Landlord, Mechanic"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
              />
            </div>
          </div>

          {/* Category - Modern Inline Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Category (Optional)
              </label>
              {linkedCategoryId && selectedCategoryObj && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Auto-assigned from "{title.trim()}"</span>
                </span>
              )}
            </div>

            <InlineDropdown
              id="money-paid-category-inline-select"
              value={categoryId}
              onChange={(val) => setCategoryId(val)}
              options={[
                { value: '', label: '(None / General Payment)' },
                ...uniqueCategories.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                  badge: cat.type,
                  color: cat.color,
                })),
              ]}
              placeholder="(None / General Payment)"
              searchPlaceholder="Search categories..."
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Bank Account', 'UPI', 'Cash', 'Credit Card'] as PaymentMethod[]).map((method) => {
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
                    {method === 'UPI' && <QrCode className="w-3.5 h-3.5" />}
                    {method === 'Cash' && <Banknote className="w-3.5 h-3.5" />}
                    {method === 'Credit Card' && <CardIcon className="w-3.5 h-3.5" />}
                    <span>{method}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {paymentMethod === 'Bank Account' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Source Bank Account</label>
                <button
                  type="button"
                  onClick={handleCreateNewBank}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Bank</span>
                </button>
              </div>
              {bankAccountsWithBalances.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  No bank accounts found.{' '}
                  <button
                    type="button"
                    onClick={handleCreateNewBank}
                    className="font-bold underline cursor-pointer"
                  >
                    Create One
                  </button>
                </div>
              ) : (
                <InlineDropdown
                  id="paid-bank-inline-select"
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
              )}
            </div>
          )}

          {paymentMethod === 'Credit Card' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Source Credit Card</label>
                <button
                  type="button"
                  onClick={handleCreateNewCard}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Card</span>
                </button>
              </div>
              {creditCardsWithOutstanding.length === 0 ? (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800">
                  No credit cards found.{' '}
                  <button
                    type="button"
                    onClick={handleCreateNewCard}
                    className="font-bold underline cursor-pointer"
                  >
                    Create One
                  </button>
                </div>
              ) : (
                <InlineDropdown
                  id="paid-card-inline-select"
                  value={creditCardId}
                  onChange={(val) => setCreditCardId(val)}
                  options={creditCardsWithOutstanding.map((c) => ({
                    value: c.id,
                    label: c.cardName,
                    subtitle: `•••• ${c.cardIdentifier.slice(-4)}`,
                    badge: `Due: ${formatCurrency(c.outstandingAmount)}`,
                    icon: <CardIcon className="w-3.5 h-3.5" />,
                  }))}
                  placeholder="Select credit card..."
                  searchPlaceholder="Search credit cards..."
                />
              )}
            </div>
          )}

          {paymentMethod === 'UPI' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  UPI Debited From Bank
                </label>
                {bankAccountsWithBalances.length > 0 ? (
                  <InlineDropdown
                    id="paid-upi-bank-inline-select"
                    value={bankAccountId}
                    onChange={(val) => setBankAccountId(val)}
                    options={bankAccountsWithBalances.map((b) => ({
                      value: b.id,
                      label: b.bankName,
                      subtitle: `•••• ${b.accountNumber.slice(-4)}`,
                      badge: `Bal: ${formatCurrency(b.currentBalance)}`,
                      icon: <Landmark className="w-3.5 h-3.5" />,
                    }))}
                    placeholder="(Select linked bank)"
                    searchPlaceholder="Search bank accounts..."
                  />
                ) : (
                  <p className="text-[11px] text-slate-500">No bank linked.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">UPI ID / App</label>
                <input
                  type="text"
                  placeholder="e.g. PhonePe, GPay, recipient@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Payment receipt number, reason, remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
            />
          </div>

          {/* Action Buttons */}
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
              <span>{editId ? 'Update Payment' : 'Save Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
