import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Landmark,
  Calendar,
  Sparkles,
  ChevronDown,
  Check,
  ArrowLeft,
  QrCode,
  CreditCard as CardIcon,
  Globe,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Lock,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PaymentMethod, PageView } from '../../types';
import { getTodayDateString, formatCurrency, formatDate, maskAccountNumber, normalizeCategoryName } from '../../utils/formatters';
import { InlineDropdown } from '../common/InlineDropdown';

interface Props {
  bankId: string;
  editId?: string;
  restoredState?: {
    date: string;
    title: string;
    amount: string;
    direction: 'Money Out' | 'Money In';
    paymentMethod: PaymentMethod;
    categoryId: string;
    narration?: string;
    notes?: string;
  };
  returnTo?: PageView;
}

export const BankEntryFormView: React.FC<Props> = ({ bankId, editId, restoredState, returnTo }) => {
  const {
    bankAccountsWithBalances,
    creditCardsWithOutstanding,
    transactions,
    categories,
    savedItemNames,
    savedExpenseDetails,
    getItemNameCategory,
    addSavedItemName,
    addTransaction,
    updateTransaction,
    recordCreditCardPayment,
    triggerSaveCelebration,
    navigateTo,
    goBack,
  } = useFinancial();

  const bank = bankAccountsWithBalances.find((b) => b.id === bankId);
  const existingTxn = editId ? transactions.find((t) => t.id === editId) : null;

  // Dedicated "Credit Card Bill Payment" mode (Requirement 6)
  const [entryMode, setEntryMode] = useState<'standard' | 'cc-payment'>('standard');
  const [selectedCardId, setSelectedCardId] = useState<string>(
    creditCardsWithOutstanding.length > 0 ? creditCardsWithOutstanding[0].id : ''
  );

  // Form states initialized with restoredState or existingTxn or defaults
  const [date, setDate] = useState(
    restoredState?.date || existingTxn?.date || getTodayDateString()
  );
  const [title, setTitle] = useState(
    restoredState?.title || existingTxn?.title || ''
  );
  const [amount, setAmount] = useState(
    restoredState?.amount || (existingTxn ? String(existingTxn.amount) : '')
  );
  const [direction, setDirection] = useState<'Money Out' | 'Money In'>(
    restoredState?.direction ||
      (existingTxn?.type === 'Money Received' ? 'Money In' : 'Money Out')
  );
  // Requirement 8: Payment Method inside bank (UPI, Card, Net Banking, Cheque)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    restoredState?.paymentMethod ||
      (existingTxn?.paymentMethod === 'UPI' ? 'UPI' : 'UPI')
  );
  const [categoryId, setCategoryId] = useState(
    restoredState?.categoryId || existingTxn?.categoryId || ''
  );
  const [narration, setNarration] = useState(
    restoredState?.narration || existingTxn?.narration || ''
  );
  const [notes, setNotes] = useState(
    restoredState?.notes || existingTxn?.notes || ''
  );
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Dropdown open states
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const detailContainerRef = useRef<HTMLDivElement>(null);

  // Close combobox when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        detailContainerRef.current &&
        !detailContainerRef.current.contains(e.target as Node)
      ) {
        setIsDetailOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute available details from saved item names, pre-saved details, and existing transactions
  const availableDetails = useMemo(() => {
    const map = new Map<string, string>();
    savedExpenseDetails.forEach((d) => map.set(d.toLowerCase(), d));
    savedItemNames.forEach((item) => map.set(item.name.toLowerCase(), item.name));
    transactions.forEach((t) => {
      if (t.title) map.set(t.title.toLowerCase(), t.title);
    });
    return Array.from(map.values());
  }, [savedItemNames, savedExpenseDetails, transactions]);

  // Unique categories deduplicated by normalized name and ID
  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((cat) => {
      const norm = normalizeCategoryName(cat.name);
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  }, [categories]);

  // Filtered names for inline search
  const filteredDetails = useMemo(() => {
    if (!title.trim()) return availableDetails;
    const q = title.toLowerCase().trim();
    return availableDetails.filter((d) => d.toLowerCase().includes(q));
  }, [availableDetails, title]);

  // Exact match check
  const isExactMatch = useMemo(() => {
    if (!title.trim()) return true;
    return availableDetails.some(
      (d) => d.toLowerCase() === title.trim().toLowerCase()
    );
  }, [availableDetails, title]);

  // Auto-assign and permanently lock category whenever Name is selected or typed
  const handleSelectDetail = (selectedName: string) => {
    setTitle(selectedName);
    setIsDetailOpen(false);

    const linkedCatId = getItemNameCategory(selectedName);
    if (linkedCatId) {
      setCategoryId(linkedCatId);
    } else {
      // If name does not have an assigned category yet, bind to default category for this direction
      const defaultCat =
        uniqueCategories.find((c) =>
          direction === 'Money Out'
            ? c.type === 'Expense' || c.type === 'Both'
            : c.type === 'Income' || c.type === 'Both'
        ) || uniqueCategories[0];
      if (defaultCat) {
        setCategoryId(defaultCat.id);
        addSavedItemName(selectedName, defaultCat.id);
      }
    }
  };

  const linkedCategoryId = useMemo(() => {
    if (!title.trim()) return undefined;
    return getItemNameCategory(title.trim());
  }, [title, getItemNameCategory, savedItemNames]);

  // Keep category synchronized and locked to the selected or typed Name
  useEffect(() => {
    if (title.trim()) {
      const linked = getItemNameCategory(title.trim());
      if (linked) {
        setCategoryId(linked);
      }
    }
  }, [title, getItemNameCategory]);

  // Category must ALWAYS have a default set - never empty
  useEffect(() => {
    if (title.trim()) {
      const linked = getItemNameCategory(title.trim());
      if (linked) {
        setCategoryId(linked);
        return;
      }
    }

    if (!categoryId && uniqueCategories.length > 0) {
      const preferred = uniqueCategories.find((c) =>
        direction === 'Money Out'
          ? c.type === 'Expense' || c.type === 'Both'
          : c.type === 'Income' || c.type === 'Both'
      );
      if (preferred) {
        setCategoryId(preferred.id);
      } else {
        setCategoryId(uniqueCategories[0].id);
      }
    }
  }, [uniqueCategories, categoryId, direction, title, getItemNameCategory]);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId) || uniqueCategories[0];
  }, [categories, categoryId, uniqueCategories]);

  // Requirement 7: Open separate full page to create new Name and assign category
  const handleOpenCreateNamePage = () => {
    setIsDetailOpen(false);
    navigateTo({
      name: 'create-name-form',
      initialName: title.trim(),
      formStateToRestore: {
        formType: 'bank-entry',
        bankId,
        editId,
        date,
        amount,
        direction,
        paymentMethod,
        narration,
        notes,
      },
      returnTo: {
        name: 'bank-entry-form',
        bankId,
        editId,
        returnTo,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSaving) return;

    if (!bank) {
      setError('Selected bank account was not found. Please select a valid bank.');
      return;
    }

    // Dedicated Credit Card Bill Payment Submission (Requirement 6, 7 & 8)
    if (entryMode === 'cc-payment') {
      const card = creditCardsWithOutstanding.find((c) => c.id === selectedCardId);
      if (!card) {
        setError('Please select a valid credit card to pay.');
        return;
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setError('Please enter a valid bill payment amount greater than 0.');
        return;
      }

      setIsSaving(true);

      try {
        recordCreditCardPayment(
          card.id,
          numAmount,
          'Bank Account',
          bank.id,
          date,
          narration.trim() || notes.trim() || undefined
        );

        triggerSaveCelebration({
          title: 'Entry Saved Successfully',
          subtitle: `Paid ${formatCurrency(numAmount)} for ${card.cardName} from ${bank.bankName}`,
          amount: numAmount,
          direction: 'Money Out',
          bankName: bank.bankName,
          bankId: bank.id,
        });

        navigateTo({ name: 'bank-detail', bankId: bank.id });
      } catch {
        setIsSaving(false);
        setError('Failed to record credit card bill payment. Please try again.');
      }
      return;
    }

    if (!title.trim()) {
      setError('Please select or enter Details / Name (e.g. D-Mart, Salary, Petrol).');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    setIsSaving(true);

    try {
      const selectedCat = categories.find((c) => c.id === categoryId);

      const txnPayload = {
        date,
        title: title.trim(),
        narration: narration.trim() || undefined,
        categoryId: categoryId || undefined,
        categoryName: selectedCat?.name,
        amount: numAmount,
        type: direction === 'Money In' ? ('Money Received' as const) : ('Expense' as const),
        paymentMethod,
        bankAccountId: bank.id,
        bankAccountName: bank.bankName,
        notes: notes.trim() || undefined,
      };

      // Permanently lock Details/Name with this category for all future entries
      if (title.trim() && categoryId) {
        addSavedItemName(title.trim(), categoryId);
      }

      if (editId && existingTxn) {
        updateTransaction(editId, txnPayload);
      } else {
        addTransaction(txnPayload);
      }

      // Requirement 2: Centered success message with exact text "Entry Saved Successfully"
      triggerSaveCelebration({
        title: 'Entry Saved Successfully',
        subtitle:
          direction === 'Money In'
            ? `Credited into ${bank.bankName} passbook`
            : `Debited from ${bank.bankName} passbook`,
        amount: numAmount,
        direction,
        bankName: bank.bankName,
        bankId: bank.id,
      });

      // Requirement 2: Automatically save entry, close entry form, and return to selected bank's passbook page
      navigateTo({ name: 'bank-detail', bankId: bank.id });
    } catch {
      setIsSaving(false);
      setError('Failed to save bank entry. Please try again.');
    }
  };

  // Requirement 2: Allow users to create custom categories directly from the workflow
  const handleCreateNewCategory = () => {
    navigateTo({
      name: 'category-form',
      defaultType: direction === 'Money In' ? 'Income' : 'Expense',
      returnTo: {
        name: 'bank-entry-form',
        bankId,
        editId,
        restoredState: {
          date,
          title,
          amount,
          direction,
          paymentMethod,
          categoryId,
          narration,
          notes,
        },
        returnTo,
      },
    });
  };

  if (!bank) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-white rounded-2xl border border-slate-200 text-center">
        <Landmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-900">Bank Account Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">Please select an existing bank account first.</p>
        <button
          type="button"
          onClick={() => navigateTo({ name: 'section', section: 'Bank Accounts' })}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl cursor-pointer"
        >
          View Bank Accounts
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back Button & Page Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Bank</span>
        </button>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
          Bank Passbook Entry
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Bank Context Header Banner */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                Active Bank Account Context
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">{bank.bankName}</h2>
              <div className="text-xs text-slate-300 font-mono mt-0.5">
                {maskAccountNumber(bank.accountNumber)} · {bank.accountType}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-medium">Available Balance</div>
            <div className="text-lg font-extrabold font-mono text-emerald-400">
              {formatCurrency(bank.currentBalance)}
            </div>
          </div>
        </div>

        {/* Entry Mode Selector: Standard Bank Entry vs Dedicated Credit Card Bill Payment (Requirement 6) */}
        {!editId && (
          <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200/80 rounded-xl shadow-2xs w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setEntryMode('standard')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  entryMode === 'standard'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard Bank Entry
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntryMode('cc-payment');
                  if (!selectedCardId && creditCardsWithOutstanding.length > 0) {
                    setSelectedCardId(creditCardsWithOutstanding[0].id);
                  }
                }}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  entryMode === 'cc-payment'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-700 hover:bg-purple-50'
                }`}
              >
                <CardIcon className="w-3.5 h-3.5" />
                <span>Credit Card Bill Payment</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {error}
            </div>
          )}

          {entryMode === 'cc-payment' ? (
            /* Dedicated Credit Card Bill Payment Fields (Requirement 6, 7 & 8) */
            <>
              {creditCardsWithOutstanding.length === 0 ? (
                <div className="p-8 text-center bg-purple-50/50 rounded-2xl border border-purple-200">
                  <CardIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">No Credit Cards Found</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    You haven't added any credit cards yet. Add your credit card first to record bill payments.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      navigateTo({
                        name: 'credit-card-form',
                        returnTo: { name: 'bank-entry-form', bankId, returnTo },
                      })
                    }
                    className="mt-4 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors cursor-pointer"
                  >
                    + Add Credit Card
                  </button>
                </div>
              ) : (
                <>
                  {/* Select Credit Card */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Select Credit Card to Pay <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {creditCardsWithOutstanding.map((c) => {
                        const isSelected = selectedCardId === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCardId(c.id);
                              if (c.outstandingAmount > 0) {
                                setAmount(String(c.outstandingAmount));
                              }
                            }}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-600/20 shadow-xs'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-xs text-slate-900">{c.cardName}</div>
                              <span className="text-[10px] font-mono text-slate-400">
                                •••• {c.cardIdentifier.slice(-4)}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="text-[11px] text-slate-500">Outstanding:</span>
                              <span className="font-mono font-bold text-amber-600">
                                {formatCurrency(c.outstandingAmount)}
                              </span>
                            </div>
                            {c.paymentDueDate && (
                              <div className="text-[10px] text-slate-400 mt-1">
                                Due: {formatDate(c.paymentDueDate)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Payment Date <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 font-medium text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  {/* Bill Payment Amount with quick Pay Full Due button */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Payment Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      {selectedCardId && (() => {
                        const activeCard = creditCardsWithOutstanding.find(
                          (c) => c.id === selectedCardId
                        );
                        if (activeCard && activeCard.outstandingAmount > 0) {
                          return (
                            <button
                              type="button"
                              onClick={() => setAmount(String(activeCard.outstandingAmount))}
                              className="text-[11px] font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
                            >
                              Pay Total Outstanding ({formatCurrency(activeCard.outstandingAmount)})
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
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
                      />
                    </div>
                  </div>

                  {/* Narration */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Narration (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Card monthly bill payment, NetBanking transfer..."
                      value={narration}
                      onChange={(e) => setNarration(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Notes / Reference Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UTR / Ref #, acknowledgment"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
                    />
                  </div>

                  {/* Double-entry notice */}
                  <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl text-xs text-purple-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-purple-950">
                      <Check className="w-3.5 h-3.5 text-purple-600" />
                      <span>Linked Automatic Passbook Updates</span>
                    </div>
                    <p className="text-[11px] text-purple-800">
                      Saving this payment automatically creates linked entries:
                      <br />• <strong>{bank.bankName}</strong>: Money Out (Debit)
                      <br />• <strong>{creditCardsWithOutstanding.find((c) => c.id === selectedCardId)?.cardName || 'Selected Card'}</strong>: Bill Payment (Credit, reduces outstanding dues)
                      <br />• Original purchases are already counted, so this is NOT added as a new expense.
                    </p>
                  </div>
                </>
              )}
            </>
          ) : (
            /* Standard Bank Entry Fields */
            <>

          {/* 
            Requirement 7: Established field order:
            1. Date first
            2. Details / Name
            3. Amount
            4. Transaction direction (Money Out / Money In)
            5. Payment Method
            6. Category association
            7. Notes
          */}

          {/* 1. Date First */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Entry Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium text-slate-900"
                required
              />
            </div>
          </div>

          {/* 2. Details / Name with Inline Searchable Dropdown and Create Now workflow */}
          <div ref={detailContainerRef} className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Details / Name <span className="text-rose-500">*</span>
            </label>

            <div className="relative">
              <input
                type="text"
                placeholder="Search or enter details/name (e.g. Petrol, D-Mart, Salary, Rent)..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsDetailOpen(true);
                }}
                onFocus={() => setIsDetailOpen(true)}
                className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 font-medium"
                required
                autoFocus={!editId && !title}
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

            {/* Requirement 7: Create Now button directly below the field when typed name does not exist */}
            {title.trim() && !isExactMatch && (
              <div className="mt-2 p-2.5 bg-purple-50/90 border border-purple-200 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="text-xs text-purple-900 truncate">
                    "<strong>{title.trim()}</strong>" is not saved yet
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

            {/* Inline Dropdown for Details/Name */}
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
                        className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 font-bold text-indigo-700'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <span className="truncate">{item}</span>
                        {catObj && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                            {catObj.name}
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No matching names found. Click "Create Now" above to add it.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Amount */}
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                required
              />
            </div>
          </div>

          {/* 4. Transaction Direction: Money Out vs Money In */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Transaction Direction <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDirection('Money Out')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  direction === 'Money Out'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Money Out (Expense / Debit)</span>
              </button>

              <button
                type="button"
                onClick={() => setDirection('Money In')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  direction === 'Money In'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>Money In (Income / Credit)</span>
              </button>
            </div>
          </div>

          {/* Optional Narration (Passbook column requirement) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Narration (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Salary transfer, ATM cash withdrawal, Rent payment..."
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
            />
          </div>

          {/* 
            5. Payment Method Field (Requirement 8)
            - Inside selected bank, do NOT show Cash or Bank Account selector options.
            - Provide Payment Method recording how transaction was paid/received: UPI, Card, Net Banking, Cheque.
            - Selecting UPI or Card must not create a separate bank account or change the selected bank context.
          */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Payment Method
              </label>
              <span className="text-[11px] text-slate-400">
                Through {bank.bankName}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { method: 'UPI' as PaymentMethod, label: 'UPI / QR', icon: <QrCode className="w-3.5 h-3.5" /> },
                { method: 'Credit Card' as PaymentMethod, label: 'Card / ATM', icon: <CardIcon className="w-3.5 h-3.5" /> },
                { method: 'Bank Account' as PaymentMethod, label: 'Net Banking', icon: <Globe className="w-3.5 h-3.5" /> },
                { method: 'Cash' as PaymentMethod, label: 'Cheque / Direct', icon: <FileText className="w-3.5 h-3.5" /> },
              ].map(({ method, label, icon }) => {
                const isSelected = paymentMethod === method;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Category Association - Permanently locked to Details / Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-bold text-slate-700">
                  Category
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Fixed to Name</span>
                </span>
              </div>

              {title.trim() && (
                <button
                  type="button"
                  onClick={handleOpenCreateNamePage}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 cursor-pointer"
                  title="Change master category for this name in setup"
                >
                  <span>Edit Name Setup</span>
                </button>
              )}
            </div>

            {/* Read-Only Locked Category Display (Cannot be changed during entry time) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: selectedCategory?.color || '#4f46e5' }}
                />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {selectedCategory?.name || 'Home Expenses'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {title.trim()
                      ? `Permanently linked to "${title.trim()}"`
                      : 'Default category for this transaction'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
                  {selectedCategory?.type || 'Expense'}
                </span>
                <span
                  className="p-1.5 rounded-lg bg-slate-200/70 text-slate-600"
                  title="Category is locked and cannot be changed at entry time"
                >
                  <Lock className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 pl-1">
              Category is set by default from Details/Name and locked during entry creation.
            </p>
          </div>

          {/* 7. Notes / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Notes / Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Add personal notes, reference number, or remark..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
            />
          </div>
          </>
          )}

          {/* Form Actions */}
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
              disabled={isSaving}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white ${
                entryMode === 'cc-payment'
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
              } rounded-xl transition-colors shadow-xs cursor-pointer ${
                isSaving ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Saving...'
                  : entryMode === 'cc-payment'
                  ? 'Record Bill Payment'
                  : editId
                  ? 'Update Bank Entry'
                  : 'Save Bank Entry'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
