import React, { useState, useEffect, useMemo } from 'react';
import { Tag, ArrowLeft, Check, Sparkles, Plus } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PageView, PaymentMethod } from '../../types';
import { normalizeCategoryName } from '../../utils/formatters';
import { InlineDropdown } from '../common/InlineDropdown';

interface FormStateToRestore {
  formType: 'expense' | 'money-paid' | 'money-received' | 'bank-entry' | 'credit-card-entry';
  date: string;
  amount: string;
  direction?: 'Money Out' | 'Money In';
  paymentMethod: PaymentMethod;
  bankId?: string;
  cardId?: string;
  bankAccountId?: string;
  creditCardId?: string;
  upiId?: string;
  personName?: string;
  narration?: string;
  notes?: string;
  editId?: string;
}

interface Props {
  initialName: string;
  formStateToRestore?: FormStateToRestore;
  returnTo?: PageView;
}

export const CreateNameFormView: React.FC<Props> = ({
  initialName,
  formStateToRestore,
  returnTo,
}) => {
  const {
    categories,
    ensureDefaultExpenseCategories,
    addSavedItemName,
    getItemNameCategory,
    navigateTo,
    goBack,
  } = useFinancial();

  const [name, setName] = useState<string>(initialName || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // If the name already has a saved category, preselect it
    if (initialName) {
      const existing = getItemNameCategory(initialName);
      if (existing) {
        setSelectedCategoryId(existing);
        return;
      }
    }

    // Ensure default categories are present so the dropdown is never empty
    const available = ensureDefaultExpenseCategories();
    const expenseCats = available.filter((c) => c.type === 'Expense' || c.type === 'Both');
    const targetCats = expenseCats.length > 0 ? expenseCats : available;

    if (targetCats.length > 0) {
      const preferred =
        targetCats.find((c) => c.name.toLowerCase().includes('home') || c.name.toLowerCase().includes('expense')) ||
        targetCats[0];
      setSelectedCategoryId(preferred.id);
    }
  }, [initialName, getItemNameCategory, ensureDefaultExpenseCategories]);

  const displayCats = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((cat) => {
      const norm = normalizeCategoryName(cat.name);
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  }, [categories]);

  const handleCancel = () => {
    if (formStateToRestore) {
      if (formStateToRestore.formType === 'expense') {
        navigateTo({
          name: 'expense-form',
          editId: formStateToRestore.editId,
          restoredState: {
            title: initialName,
            categoryId: selectedCategoryId,
            date: formStateToRestore.date,
            amount: formStateToRestore.amount,
            paymentMethod: formStateToRestore.paymentMethod,
            bankAccountId: formStateToRestore.bankAccountId,
            creditCardId: formStateToRestore.creditCardId,
            upiId: formStateToRestore.upiId,
            notes: formStateToRestore.notes,
          },
          returnTo,
        });
        return;
      }
      if (formStateToRestore.formType === 'money-paid') {
        navigateTo({
          name: 'money-paid-form',
          editId: formStateToRestore.editId,
          restoredState: {
            title: initialName,
            personName: formStateToRestore.personName,
            categoryId: selectedCategoryId,
            date: formStateToRestore.date,
            amount: formStateToRestore.amount,
            paymentMethod: formStateToRestore.paymentMethod,
            bankAccountId: formStateToRestore.bankAccountId,
            upiId: formStateToRestore.upiId,
            notes: formStateToRestore.notes,
          },
          returnTo,
        });
        return;
      }
      if (formStateToRestore.formType === 'bank-entry' && formStateToRestore.bankId) {
        navigateTo({
          name: 'bank-entry-form',
          bankId: formStateToRestore.bankId,
          editId: formStateToRestore.editId,
          restoredState: {
            title: initialName,
            categoryId: selectedCategoryId,
            date: formStateToRestore.date,
            amount: formStateToRestore.amount,
            direction: formStateToRestore.direction || 'Money Out',
            paymentMethod: formStateToRestore.paymentMethod,
            narration: formStateToRestore.narration,
            notes: formStateToRestore.notes,
          },
          returnTo,
        });
        return;
      }
      if (formStateToRestore.formType === 'credit-card-entry' && formStateToRestore.cardId) {
        navigateTo({
          name: 'credit-card-entry-form',
          cardId: formStateToRestore.cardId,
          editId: formStateToRestore.editId,
          restoredState: {
            title: initialName,
            categoryId: selectedCategoryId,
            date: formStateToRestore.date,
            amount: formStateToRestore.amount,
            direction: formStateToRestore.direction || 'Money Out',
            paymentMethod: formStateToRestore.paymentMethod,
            narration: formStateToRestore.narration,
            notes: formStateToRestore.notes,
          },
          returnTo,
        });
        return;
      }
    }
    if (returnTo) {
      navigateTo(returnTo);
    } else {
      goBack();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a Name (e.g. D-Mart, Petrol, Netflix).');
      return;
    }

    if (!selectedCategoryId) {
      setError('Please select an Expense Category.');
      return;
    }

    // Permanently link Name → Expense Category
    addSavedItemName(trimmedName, selectedCategoryId);

    // Requirement 4 & 7: CONTINUE FROM WHERE THE USER STOPPED
    // Preserve all previously entered form data. Return user to the exact same entry page and workflow.
    // Do NOT reset the form. Keep all previously entered information exactly as it was.
    if (formStateToRestore) {
      if (formStateToRestore.formType === 'bank-entry' && formStateToRestore.bankId) {
        navigateTo({
          name: 'bank-entry-form',
          bankId: formStateToRestore.bankId,
          editId: formStateToRestore.editId,
          restoredState: {
            title: trimmedName,
            categoryId: selectedCategoryId,
            date: formStateToRestore.date,
            amount: formStateToRestore.amount,
            direction: formStateToRestore.direction || 'Money Out',
            paymentMethod: formStateToRestore.paymentMethod,
            narration: formStateToRestore.narration,
            notes: formStateToRestore.notes,
          },
          returnTo,
        });
        return;
      }
      if (formStateToRestore.formType === 'credit-card-entry' && formStateToRestore.cardId) {
        navigateTo({
          name: 'credit-card-entry-form',
          cardId: formStateToRestore.cardId,
          editId: formStateToRestore.editId,
          restoredState: {
            title: trimmedName,
            categoryId: selectedCategoryId,
            date: formStateToRestore.date,
            amount: formStateToRestore.amount,
            direction: formStateToRestore.direction || 'Money Out',
            paymentMethod: formStateToRestore.paymentMethod,
            narration: formStateToRestore.narration,
            notes: formStateToRestore.notes,
          },
          returnTo,
        });
        return;
      }
      if (formStateToRestore.formType === 'expense') {
        navigateTo({
          name: 'expense-form',
          editId: formStateToRestore.editId,
          restoredState: {
            title: trimmedName,
            categoryId: selectedCategoryId,
            date: formStateToRestore.date,
            amount: formStateToRestore.amount,
            paymentMethod: formStateToRestore.paymentMethod,
            bankAccountId: formStateToRestore.bankAccountId,
            creditCardId: formStateToRestore.creditCardId,
            upiId: formStateToRestore.upiId,
            notes: formStateToRestore.notes,
          },
          returnTo,
        });
        return;
      }
      if (formStateToRestore.formType === 'money-paid') {
        navigateTo({
          name: 'money-paid-form',
          editId: formStateToRestore.editId,
          restoredState: {
            title: trimmedName,
            personName: formStateToRestore.personName,
            categoryId: selectedCategoryId,
            date: formStateToRestore.date,
            amount: formStateToRestore.amount,
            paymentMethod: formStateToRestore.paymentMethod,
            bankAccountId: formStateToRestore.bankAccountId,
            creditCardId: formStateToRestore.creditCardId,
            upiId: formStateToRestore.upiId,
            notes: formStateToRestore.notes,
          },
          returnTo,
        });
        return;
      }
    }

    // Default fallback return
    if (returnTo) {
      navigateTo(returnTo);
    } else {
      navigateTo({ name: 'section', section: 'Expenses' });
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Full Page Container (Requirement 1 & 7: Separate full page, NEVER a normal popup/modal) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Banner */}
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Create New Name
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assign category permanently to this item name
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Return without saving"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Informative helper callout */}
        <div className="p-4 bg-purple-50/70 border-b border-purple-100/80 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-xs text-purple-900 space-y-1">
            <p className="font-semibold">Category Auto-Assignment</p>
            <p className="text-purple-700 leading-relaxed">
              When you save, this category is permanently associated with this name. Whenever{' '}
              <span className="font-bold underline">{name || 'this name'}</span> is selected in any entry form,
              Tech Expenses will automatically select this category for you.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {error}
            </div>
          )}

          {/* 1. Name Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Name
            </label>
            <input
              type="text"
              placeholder="e.g. D-Mart, Petrol, Starbucks, Electricity Bill"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900 font-medium"
              required
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Example: D-Mart, Petrol, Zomato, Rent, Internet Bill
            </p>
          </div>

          {/* 2. Expense Category Field (Requirement 2 & Modern Inline Dropdown) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Expense Category
              </label>
              <button
                type="button"
                onClick={() =>
                  navigateTo({
                    name: 'category-form',
                    defaultType: 'Expense',
                    returnTo: {
                      name: 'create-name-form',
                      initialName: name || initialName,
                      formStateToRestore,
                      returnTo,
                    },
                  })
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 cursor-pointer"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Create New Category</span>
              </button>
            </div>

            <InlineDropdown
              id="expense-category-select"
              value={selectedCategoryId}
              onChange={(val) => setSelectedCategoryId(val)}
              options={displayCats.map((cat) => ({
                value: cat.id,
                label: cat.name,
                badge: cat.type,
                color: cat.color,
              }))}
              placeholder="Select an expense category..."
              searchPlaceholder="Search categories..."
              actionButton={{
                label: 'Create New Category',
                onClick: () =>
                  navigateTo({
                    name: 'category-form',
                    defaultType: 'Expense',
                    returnTo: {
                      name: 'create-name-form',
                      initialName: name || initialName,
                      formStateToRestore,
                      returnTo,
                    },
                  }),
              }}
              helperText={`Available by default. Whenever you select "${name || 'this name'}" later, this category will be auto-assigned.`}
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-xs shadow-purple-600/30 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save & Continue</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
