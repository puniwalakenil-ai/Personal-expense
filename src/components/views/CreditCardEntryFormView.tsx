import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CreditCard as CardIcon,
  Calendar,
  Sparkles,
  ChevronDown,
  Check,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Lock,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PaymentMethod, PageView } from '../../types';
import { getTodayDateString, formatCurrency, normalizeCategoryName } from '../../utils/formatters';

interface Props {
  cardId: string;
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

export const CreditCardEntryFormView: React.FC<Props> = ({ cardId, editId, restoredState, returnTo }) => {
  const {
    creditCardsWithOutstanding,
    transactions,
    categories,
    savedItemNames,
    savedExpenseDetails,
    getItemNameCategory,
    addSavedItemName,
    addTransaction,
    updateTransaction,
    triggerSaveCelebration,
    navigateTo,
    goBack,
  } = useFinancial();

  const card = creditCardsWithOutstanding.find((c) => c.id === cardId);
  const existingTxn = editId ? transactions.find((t) => t.id === editId) : null;

  // Form states
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

  // Open separate full page to create new Name and assign category
  const handleOpenCreateNamePage = () => {
    setIsDetailOpen(false);
    navigateTo({
      name: 'create-name-form',
      initialName: title.trim(),
      formStateToRestore: {
        formType: 'credit-card-entry',
        cardId,
        editId,
        date,
        amount,
        direction,
        paymentMethod: 'Credit Card',
        creditCardId: cardId,
        narration,
        notes,
      },
      returnTo: {
        name: 'credit-card-entry-form',
        cardId,
        editId,
        returnTo,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSaving) return;

    if (!card) {
      setError('Selected credit card was not found. Please select a valid card.');
      return;
    }

    if (!title.trim()) {
      setError('Please select or enter Details / Name (e.g. Swiggy, Amazon, Fuel, Flights).');
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
        paymentMethod: 'Credit Card' as const,
        creditCardId: card.id,
        creditCardName: card.cardName,
        notes: notes.trim() || undefined,
      };

      // Permanently lock Details/Name with this category
      if (title.trim() && categoryId) {
        addSavedItemName(title.trim(), categoryId);
      }

      if (editId && existingTxn) {
        updateTransaction(editId, txnPayload);
      } else {
        addTransaction(txnPayload);
      }

      // Trigger celebration toast
      triggerSaveCelebration({
        title: 'Entry Saved Successfully',
        subtitle:
          direction === 'Money In'
            ? `Credited into ${card.cardName} statement`
            : `Charged to ${card.cardName} card`,
        amount: numAmount,
        direction,
      });

      // Automatically return to credit card statement
      navigateTo({ name: 'credit-card-detail', cardId: card.id });
    } catch {
      setIsSaving(false);
      setError('Failed to save credit card entry. Please try again.');
    }
  };

  if (!card) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-white rounded-2xl border border-slate-200 text-center">
        <CardIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-900">Credit Card Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">Please select an existing credit card first.</p>
        <button
          type="button"
          onClick={() => navigateTo({ name: 'section', section: 'Credit Cards' })}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl cursor-pointer"
        >
          View Credit Cards
        </button>
      </div>
    );
  }

  const availableLimit = Math.max(0, (card.creditLimit || 0) - card.outstandingAmount);

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
          <span>Back to Card</span>
        </button>
        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
          Credit Card Statement Entry
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Card Context Header Banner */}
        <div className="p-5 bg-gradient-to-r from-slate-950 via-purple-950 to-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold">
              <CardIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
                Active Card Context
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">{card.cardName}</h2>
              <div className="text-xs text-slate-300 font-mono mt-0.5">
                •••• {card.cardIdentifier.slice(-4)} · Billing Day: {card.billingDate}th
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-medium">Outstanding Dues</div>
            <div className="text-lg font-extrabold font-mono text-amber-400">
              {formatCurrency(card.outstandingAmount)}
            </div>
            {card.creditLimit > 0 && (
              <div className="text-[10px] text-slate-400">
                Avail: <span className="font-mono text-slate-300">{formatCurrency(availableLimit)}</span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {error}
            </div>
          )}

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
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 font-medium text-slate-900"
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
                placeholder="Search or enter merchant/spend details (e.g. Swiggy, Amazon, Fuel, Flights)..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsDetailOpen(true);
                }}
                onFocus={() => setIsDetailOpen(true)}
                className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900 font-medium"
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

            {/* Create Now button directly below the field when typed name does not exist */}
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
                            ? 'bg-purple-50 font-bold text-purple-700'
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
                className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
                required
              />
            </div>
          </div>

          {/* 4. Transaction Direction: Money Out (Spend) vs Money In (Refund/Cashback) */}
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
                <span>Card Spend (Debit / Out)</span>
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
                <span>Refund / Credit (In)</span>
              </button>
            </div>
          </div>

          {/* Optional Narration */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Narration (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly grocery order, Flight ticket booking, Fuel refuel..."
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
            />
          </div>

          {/* Category Association - Permanently locked to Details / Name */}
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

            {/* Read-Only Locked Category Display */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: selectedCategory?.color || '#9333ea' }}
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

          {/* Notes / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Notes / Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Add personal notes, reference number, or remark..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
            />
          </div>

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
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-xs shadow-purple-600/30 cursor-pointer ${
                isSaving ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : editId ? 'Update Card Entry' : 'Save Card Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
