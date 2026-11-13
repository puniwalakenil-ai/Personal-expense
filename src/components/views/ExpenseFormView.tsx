import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingDown,
  Calendar,
  CreditCard as CardIcon,
  Landmark,
  Banknote,
  QrCode,
  Plus,
  Check,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PaymentMethod, PageView } from '../../types';
import { getTodayDateString, formatCurrency, normalizeCategoryName } from '../../utils/formatters';
import { InlineDropdown } from '../common/InlineDropdown';

interface Props {
  editId?: string;
  restoredState?: {
    title: string;
    categoryId: string;
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

export const ExpenseFormView: React.FC<Props> = ({ editId, restoredState, returnTo }) => {
  const {
    categories,
    bankAccountsWithBalances,
    creditCardsWithOutstanding,
    currentCashBalance,
    savedItemNames,
    savedExpenseDetails,
    getItemNameCategory,
    addSavedItemName,
    addExpense,
    updateTransaction,
    transactions,
    navigateTo,
    goBack,
  } = useFinancial();

  const existingTxn = editId ? transactions.find((t) => t.id === editId) : null;

  // Restore exact state if returning from Create Name full page (Requirement 4)
  const [date, setDate] = useState<string>(
    restoredState?.date || existingTxn?.date || getTodayDateString()
  );
  const [title, setTitle] = useState<string>(
    restoredState?.title || existingTxn?.title || ''
  );
  const [categoryId, setCategoryId] = useState<string>(
    restoredState?.categoryId || existingTxn?.categoryId || ''
  );
  const [amount, setAmount] = useState<string>(
    restoredState ? restoredState.amount : existingTxn ? String(existingTxn.amount) : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    restoredState?.paymentMethod || existingTxn?.paymentMethod || 'UPI'
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

  // Dropdown state for "Detail / Name"
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const detailContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (detailContainerRef.current && !detailContainerRef.current.contains(e.target as Node)) {
        setIsDetailOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Compute all available Detail / Names (from savedItemNames + savedDetails + past transactions)
  const availableDetails = useMemo(() => {
    const map = new Map<string, string>(); // lowercase -> display string
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
      .filter((t) => t.type === 'Expense')
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

  // Filtered details based on current input
  const filteredDetails = useMemo(() => {
    if (!title.trim()) return availableDetails;
    const q = title.toLowerCase().trim();
    return availableDetails.filter((d) => d.toLowerCase().includes(q));
  }, [availableDetails, title]);

  // Check if current typed title exactly matches an existing item
  const isExactMatch = useMemo(() => {
    if (!title.trim()) return true;
    return availableDetails.some(
      (d) => d.toLowerCase() === title.trim().toLowerCase()
    );
  }, [availableDetails, title]);

  // Requirement 3: CATEGORY AUTO-ASSIGNMENT
  // Whenever that Name is selected or typed, automatically use its saved category.
  const handleSelectDetail = (selectedName: string) => {
    setTitle(selectedName);
    setIsDetailOpen(false);

    const linkedCatId = getItemNameCategory(selectedName);
    if (linkedCatId) {
      setCategoryId(linkedCatId);
    }
  };

  // Check if current selected/typed title has an auto-assigned category
  const linkedCategoryId = useMemo(() => {
    if (!title.trim()) return undefined;
    return getItemNameCategory(title.trim());
  }, [title, getItemNameCategory, savedItemNames]);

  // Auto-apply linked category if title matches a known name and categoryId is either not set or different
  useEffect(() => {
    if (title.trim()) {
      const linked = getItemNameCategory(title.trim());
      if (linked && (!categoryId || categoryId !== linked)) {
        setCategoryId(linked);
      }
    }
  }, [title, getItemNameCategory]);

  // Requirement 1: If user types a name that does not exist, clicking "Create New"
  // opens a separate FULL PAGE (NOT a popup), preserving all form data (Requirement 4)
  const handleOpenCreateNamePage = () => {
    setIsDetailOpen(false);
    navigateTo({
      name: 'create-name-form',
      initialName: title.trim(),
      formStateToRestore: {
        formType: 'expense',
        editId,
        date,
        amount,
        paymentMethod,
        bankAccountId,
        creditCardId,
        upiId,
        notes,
      },
      returnTo: {
        name: 'expense-form',
        editId,
        returnTo,
      },
    });
  };

  // Requirement 2: Create new category option directly from expense workflow
  const handleCreateNewCategory = () => {
    navigateTo({
      name: 'category-form',
      defaultType: 'Expense',
      returnTo: {
        name: 'expense-form',
        editId,
        restoredState: {
          title,
          categoryId,
          date,
          amount,
          paymentMethod,
          bankAccountId,
          creditCardId,
          upiId,
          notes,
        },
        returnTo,
      },
    });
  };

  // Default selections if none selected
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      const expenseCats = categories.filter((c) => c.type === 'Expense' || c.type === 'Both');
      if (expenseCats.length > 0) {
        setCategoryId(expenseCats[0].id);
      } else {
        setCategoryId(categories[0].id);
      }
    }
  }, [categories, categoryId]);

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
      setError('Please select or enter Detail / Name (e.g. Petrol, D-Mart).');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0.');
      return;
    }

    if (!categoryId) {
      setError('Please select an expense category.');
      return;
    }

    if (paymentMethod === 'Bank Account' && !bankAccountId) {
      setError('Please select a bank account or create a new one.');
      return;
    }

    if (paymentMethod === 'Credit Card' && !creditCardId) {
      setError('Please select a credit card or create a new one.');
      return;
    }

    if (title.trim() && categoryId) {
      addSavedItemName(title.trim(), categoryId);
    }

    if (editId && existingTxn) {
      updateTransaction(editId, {
        date,
        title: title.trim(),
        categoryId,
        amount: numAmount,
        paymentMethod,
        bankAccountId: paymentMethod === 'Bank Account' || paymentMethod === 'UPI' ? bankAccountId : undefined,
        creditCardId: paymentMethod === 'Credit Card' ? creditCardId : undefined,
        upiId: paymentMethod === 'UPI' ? upiId : undefined,
        notes: notes.trim(),
      });
    } else {
      addExpense({
        date,
        title: title.trim(),
        categoryId,
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
      navigateTo({ name: 'section', section: 'Expenses' });
    }
  };

  // Helper for Requirement 9: Smart Create New Bank Account & Return
  const handleCreateNewBank = () => {
    navigateTo({
      name: 'bank-account-form',
      returnTo: {
        name: 'expense-form',
        editId,
        restoredState: {
          title,
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

  // Helper for Requirement 9: Smart Create New Credit Card & Return
  const handleCreateNewCard = () => {
    navigateTo({
      name: 'credit-card-form',
      returnTo: {
        name: 'expense-form',
        editId,
        restoredState: {
          title,
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
      {/* Full Page Container (Requirement 5 & 7: Forms open as proper full pages, NEVER popups) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Form Title Banner */}
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {editId ? 'Edit Personal Expense' : 'Record Personal Expense'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Personal expense with smart category auto-assignment
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Expense Date
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Amount (₹)
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
                  autoFocus={!editId && !title}
                />
              </div>
            </div>
          </div>

          {/* 
            Requirement 1 & 5:
            - Label is "Detail / Name"
            - In any entry form, "Name" must be a searchable/selectable field.
            - Do NOT show a permanent "Create" option next to the Name field.
            - If user types a name that does not exist, automatically show a small "Create New" option directly below the Name field.
            - Clicking "Create New" opens a separate full page (NOT a normal popup/modal).
          */}
          <div ref={detailContainerRef} className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Detail / Name
            </label>

            {/* Searchable / Selectable Combobox Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search or type detail / name (e.g. Petrol, D-Mart, Milk)..."
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

            {/* Requirement 1: Small "Create New" option directly below the Name field if name does not exist */}
            {title.trim() && !isExactMatch && (
              <div className="mt-2 p-2.5 bg-purple-50/80 border border-purple-200/80 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-1">
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

            {/* Requirement 2: Modern Inline Dropdown (Expands naturally within page layout, NOT floating popup) */}
            {isDetailOpen && (
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs max-h-56 overflow-y-auto space-y-1 transition-all">
                {/* Available Items */}
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
                    <p className="font-semibold text-slate-700">No matching name in saved list</p>
                    {title.trim() && (
                      <p className="text-[11px] text-purple-600 mt-1">
                        Click "Create New" above to add "{title.trim()}" on a full page!
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 
            Requirement 2 & 3:
            Expense Category Selection with permanent auto-assignment status
            and direct Create New Category option
          */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-bold text-slate-700">
                  Expense Category
                </label>
                {linkedCategoryId && selectedCategoryObj && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Auto-assigned from "{title.trim()}"</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleCreateNewCategory}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 cursor-pointer"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Create New Category</span>
              </button>
            </div>

            {linkedCategoryId && selectedCategoryObj ? (
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: selectedCategoryObj.color || '#4f46e5' }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {selectedCategoryObj.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      Fixed to "{title.trim()}" (cannot change at entry time)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                    {selectedCategoryObj.type}
                  </span>
                  <span
                    className="p-1.5 rounded-lg bg-slate-200/70 text-slate-600"
                    title="Category is locked for this name"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ) : uniqueCategories.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
                <span>No custom categories yet.</span>
                <button
                  type="button"
                  onClick={handleCreateNewCategory}
                  className="font-bold text-indigo-600 underline cursor-pointer"
                >
                  Create One Now
                </button>
              </div>
            ) : (
              <InlineDropdown
                id="expense-category-inline-select"
                value={categoryId}
                onChange={(val) => setCategoryId(val)}
                options={uniqueCategories.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                  badge: cat.type,
                  color: cat.color,
                }))}
                placeholder="Select expense category..."
                searchPlaceholder="Search categories..."
                actionButton={{
                  label: 'Create New Category',
                  onClick: handleCreateNewCategory,
                }}
              />
            )}
          </div>

          {/* Payment Method Management (Requirement 7) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['UPI', 'Cash', 'Bank Account', 'Credit Card'] as PaymentMethod[]).map((method) => {
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
                    {method === 'UPI' && <QrCode className="w-3.5 h-3.5" />}
                    {method === 'Cash' && <Banknote className="w-3.5 h-3.5" />}
                    {method === 'Bank Account' && <Landmark className="w-3.5 h-3.5" />}
                    {method === 'Credit Card' && <CardIcon className="w-3.5 h-3.5" />}
                    <span>{method}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Source Details depending on selection */}
          {paymentMethod === 'Cash' && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center justify-between">
              <span>Cash will be deducted from your physical wallet.</span>
              <span className="font-mono font-bold">
                Available: {formatCurrency(currentCashBalance)}
              </span>
            </div>
          )}

          {paymentMethod === 'Bank Account' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Select Bank Account
                </label>
                <button
                  type="button"
                  onClick={handleCreateNewBank}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Bank Account</span>
                </button>
              </div>

              {bankAccountsWithBalances.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
                  <span>No bank accounts created yet.</span>
                  <button
                    type="button"
                    onClick={handleCreateNewBank}
                    className="font-bold underline cursor-pointer"
                  >
                    + Add Bank Account
                  </button>
                </div>
              ) : (
                <InlineDropdown
                  id="expense-bank-inline-select"
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
                <label className="block text-xs font-bold text-slate-700">
                  Select Credit Card
                </label>
                <button
                  type="button"
                  onClick={handleCreateNewCard}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Credit Card</span>
                </button>
              </div>

              {creditCardsWithOutstanding.length === 0 ? (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
                  <span>No credit cards created yet.</span>
                  <button
                    type="button"
                    onClick={handleCreateNewCard}
                    className="font-bold underline cursor-pointer"
                  >
                    + Add Credit Card
                  </button>
                </div>
              ) : (
                <InlineDropdown
                  id="expense-card-inline-select"
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    UPI Debited From Bank
                  </label>
                  <button
                    type="button"
                    onClick={handleCreateNewBank}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Bank</span>
                  </button>
                </div>
                {bankAccountsWithBalances.length > 0 ? (
                  <InlineDropdown
                    id="expense-upi-bank-inline-select"
                    value={bankAccountId}
                    onChange={(val) => setBankAccountId(val)}
                    options={bankAccountsWithBalances.map((b) => ({
                      value: b.id,
                      label: b.bankName,
                      subtitle: `•••• ${b.accountNumber.slice(-4)}`,
                      badge: `Bal: ${formatCurrency(b.currentBalance)}`,
                      icon: <Landmark className="w-3.5 h-3.5" />,
                    }))}
                    placeholder="(Select linked bank account)"
                    searchPlaceholder="Search bank accounts..."
                  />
                ) : (
                  <p className="text-[11px] text-slate-500">
                    No bank account linked. You can specify a UPI VPA below.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  UPI VPA / App Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. GPay, PhonePe, merchant@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Notes / Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Bill reference, receipt number, or itemized details..."
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
              <span>{editId ? 'Update Expense' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
