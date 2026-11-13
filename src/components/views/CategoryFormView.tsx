import React, { useState } from 'react';
import {
  Tags,
  Check,
  ArrowLeft,
  TrendingDown,
  ArrowDownLeft,
  Coins,
  HandCoins,
  FileSpreadsheet,
  PiggyBank,
  Shuffle,
  HelpCircle,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { CategoryType, PageView } from '../../types';
import { normalizeCategoryName } from '../../utils/formatters';

interface Props {
  editId?: string;
  defaultType?: CategoryType;
  returnTo?: PageView;
}

interface TypeOptionConfig {
  type: CategoryType;
  label: string;
  desc: string;
  icon: React.ElementType;
  badgeBg: string;
}

export const CategoryFormView: React.FC<Props> = ({ editId, defaultType = 'Expense', returnTo }) => {
  const { categories, addCategory, updateCategory, navigateTo, goBack } = useFinancial();

  const existing = editId ? categories.find((c) => c.id === editId) : null;

  const [name, setName] = useState(existing?.name || '');
  const [type, setType] = useState<CategoryType>(existing?.type || defaultType);
  const [color, setColor] = useState(existing?.color || '#4f46e5');
  const [error, setError] = useState('');

  const typeOptions: TypeOptionConfig[] = [
    {
      type: 'Expense',
      label: 'Expense',
      desc: 'Day-to-day spending, bills, purchases, living costs',
      icon: TrendingDown,
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      type: 'Income',
      label: 'Income',
      desc: 'Salary, consulting, business revenues, earnings',
      icon: ArrowDownLeft,
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      type: 'Capital',
      label: 'Capital',
      desc: 'Owner capital introduced, partner equity, investments into business',
      icon: Coins,
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      type: 'Loan',
      label: 'Loan',
      desc: 'Borrowings, personal/bank loans, debt financing, loan settlements',
      icon: HandCoins,
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      type: 'Advance',
      label: 'Advance',
      desc: 'Security deposits, staff advance, supplier advance, prepayments',
      icon: FileSpreadsheet,
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      type: 'Investment',
      label: 'Investment',
      desc: 'Fixed deposits, mutual funds, gold, property, savings',
      icon: PiggyBank,
      badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    {
      type: 'Both',
      label: 'Both / Mixed',
      desc: 'Dual-purpose category for both income and expense',
      icon: Shuffle,
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      type: 'Other',
      label: 'Other',
      desc: 'General financial records, internal transfers, adjustments',
      icon: HelpCircle,
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  ];

  const handleReturnWithCategory = (createdId: string) => {
    if (!returnTo) {
      navigateTo({ name: 'category-detail', categoryId: createdId });
      return;
    }

    if (returnTo.name === 'bank-entry-form') {
      navigateTo({
        ...returnTo,
        restoredState: {
          ...(returnTo.restoredState || {
            date: '',
            title: '',
            amount: '',
            direction: type === 'Income' ? 'Money In' : 'Money Out',
            paymentMethod: 'UPI',
          }),
          categoryId: createdId,
        },
      });
      return;
    }

    if (returnTo.name === 'expense-form') {
      navigateTo({
        ...returnTo,
        restoredState: {
          ...(returnTo.restoredState || {
            title: '',
            categoryId: '',
            date: '',
            amount: '',
            paymentMethod: 'UPI',
          }),
          categoryId: createdId,
        },
      });
      return;
    }

    navigateTo(returnTo);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      setError('Please enter a category name (e.g. Petrol, Groceries, Partner Capital, Salary).');
      return;
    }

    const norm = normalizeCategoryName(trimmed);

    if (editId && existing) {
      updateCategory(editId, {
        name: trimmed,
        type,
        color,
      });
      if (returnTo) {
        navigateTo(returnTo);
      } else {
        navigateTo({ name: 'category-detail', categoryId: editId });
      }
    } else {
      // Check if duplicate category already exists
      const duplicate = categories.find((c) => normalizeCategoryName(c.name) === norm);
      if (duplicate) {
        // Reuse existing category instead of creating duplicate
        const reused = addCategory({
          name: trimmed,
          type,
          color,
        });
        handleReturnWithCategory(reused.id);
        return;
      }

      const created = addCategory({
        name: trimmed,
        type,
        color,
      });

      handleReturnWithCategory(created.id);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
          Category Setup Page
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Banner */}
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {editId ? `Edit Category: ${existing?.name}` : 'Create New Financial Category'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Categories are fully configurable and immediately available across bank entries & expense workflows
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

          {/* Category Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Petrol, Groceries, D-Mart, Salary, Capital Investment, Vendor Advance..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 font-medium"
              required
              autoFocus={!editId}
            />
          </div>

          {/* Category Type Configuration */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Category Type <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Selected: <strong className="text-indigo-600">{type}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {typeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = type === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setType(opt.type)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-500/10 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${opt.badgeBg}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
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
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs shadow-indigo-600/30 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editId ? 'Update Category' : 'Save Category'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
