import React, { useState, useMemo } from 'react';
import { Tags, Plus, ArrowRight, Search } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { CategoryType } from '../../types';
import { formatCurrency, normalizeCategoryName } from '../../utils/formatters';

export const CategoriesView: React.FC = () => {
  const { categories, transactions, navigateTo } = useFinancial();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Requirement 1 & 5: Ensure each category is displayed only once
  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((cat) => {
      const norm = normalizeCategoryName(cat.name);
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  }, [categories]);

  const filteredCategories = uniqueCategories.filter((cat) => {
    if (filterType !== 'ALL') {
      if (filterType === 'Both') {
        if (cat.type !== 'Both') return false;
      } else if (cat.type !== filterType && cat.type !== 'Both') {
        return false;
      }
    }
    if (!search.trim()) return true;
    return cat.name.toLowerCase().includes(search.toLowerCase());
  });

  // Calculate totals per category grouping all transactions assigned to that category (Requirement 1)
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { total: number; count: number }>();
    uniqueCategories.forEach((cat) => {
      const normCatName = normalizeCategoryName(cat.name);
      let total = 0;
      let count = 0;
      transactions.forEach((txn) => {
        const matchesId = txn.categoryId === cat.id;
        const matchesName = txn.categoryName && normalizeCategoryName(txn.categoryName) === normCatName;
        if (matchesId || matchesName) {
          total += txn.amount;
          count += 1;
        }
      });
      stats.set(cat.id, { total, count });
    });
    return stats;
  }, [uniqueCategories, transactions]);

  const getBadgeStyle = (type: CategoryType) => {
    switch (type) {
      case 'Expense':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Income':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Capital':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Loan':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Advance':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Investment':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Both':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filterTabs = [
    'ALL',
    'Expense',
    'Income',
    'Capital',
    'Loan',
    'Advance',
    'Investment',
    'Other',
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            Category Management Setup
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {uniqueCategories.length} Financial Categories
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Organized across Income, Expense, Capital, Loan, Advance, and Investments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateTo({ name: 'category-form' })}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-indigo-600" />
          <span>Create New Category</span>
        </button>
      </div>

      {/* Controls & Filter */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search category name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-900"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs overflow-x-auto scrollbar-none">
            {filterTabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  filterType === t
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'ALL' ? 'All Types' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length === 0 ? (
          <div className="py-16 text-center">
            <Tags className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-xs font-bold text-slate-800">No categories found</h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Create your custom category under {filterType === 'ALL' ? 'any financial type' : filterType}.
            </p>
            <button
              type="button"
              onClick={() =>
                navigateTo({
                  name: 'category-form',
                  defaultType: (filterType !== 'ALL' ? filterType : 'Expense') as CategoryType,
                })
              }
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Category</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            {filteredCategories.map((cat) => {
              const stat = categoryStats.get(cat.id) || { total: 0, count: 0 };
              return (
                <div
                  key={cat.id}
                  onClick={() =>
                    navigateTo({
                      name: 'category-detail',
                      categoryId: cat.id,
                      returnTo: { name: 'section', section: 'Categories' },
                    })
                  }
                  className="p-4 bg-slate-50/60 hover:bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {cat.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {stat.count} transaction{stat.count === 1 ? '' : 's'}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getBadgeStyle(
                        cat.type
                      )}`}
                    >
                      {cat.type}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400">Total Volume:</span>{' '}
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {formatCurrency(stat.total)}
                      </span>
                    </div>

                    <span className="text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
