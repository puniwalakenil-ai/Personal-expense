import React, { useState } from 'react';
import {
  TrendingDown,
  Plus,
  ArrowRight,
  Search,
  Filter,
  Calendar,
  CreditCard,
  Banknote,
  Landmark,
  QrCode,
  Trash2,
  FileText,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ExportPdfLedgerModal } from '../common/ExportPdfLedgerModal';

export const ExpensesView: React.FC = () => {
  const {
    navigateTo,
    totalExpenses,
    categoryExpenseTotals,
    transactions,
    deleteTransaction,
    requestDelete,
  } = useFinancial();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const expenseTxns = transactions.filter((t) => t.type === 'Expense');

  const filteredExpenses = expenseTxns.filter((txn) => {
    const matchesSearch =
      txn.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (txn.categoryName && txn.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (txn.notes && txn.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedMonth !== 'all') {
      return txn.date.startsWith(selectedMonth);
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Stat & Action */}
      <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl text-white border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Personal Expenses
          </div>
          <div className="mt-1 text-3xl font-extrabold font-mono tracking-tight text-white">
            {formatCurrency(totalExpenses)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Across {expenseTxns.length} expense record{expenseTxns.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-rose-200 bg-rose-900/60 hover:bg-rose-800/80 border border-rose-700/60 rounded-xl transition-colors cursor-pointer shadow-xs"
            title="Export expenses ledger as PDF"
          >
            <FileText className="w-3.5 h-3.5 text-rose-300" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo({ name: 'section', section: 'Bank Accounts' })}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Landmark className="w-4 h-4 text-indigo-600" />
            <span>Select Bank to Add Entry</span>
          </button>
        </div>
      </div>

      {/* Requirement 16: Category-Wise Expense Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Expense Categories</h2>
            <p className="text-[11px] text-slate-500">
              Click any category to open its full summary and transactions
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigateTo({ name: 'category-form', defaultType: 'Expense' })}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </div>

        {categoryExpenseTotals.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 text-center">
            <p className="text-xs text-slate-500">No expense categories active yet.</p>
            <button
              type="button"
              onClick={() => navigateTo({ name: 'category-form', defaultType: 'Expense' })}
              className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-xl cursor-pointer hover:bg-indigo-700"
            >
              + Create First Category
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {categoryExpenseTotals.map((cat) => {
              const percent = totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0;
              return (
                <div
                  key={cat.categoryId}
                  onClick={() =>
                    navigateTo({
                      name: 'category-detail',
                      categoryId: cat.categoryId,
                      returnTo: { name: 'section', section: 'Expenses' },
                    })
                  }
                  className="p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {cat.categoryName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {cat.count} txns
                    </span>
                  </div>

                  <div className="mt-2 text-lg font-bold font-mono text-slate-900">
                    {formatCurrency(cat.total)}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{percent}% of expenses</span>
                    <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center">
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Requirement 16: Recent Expenses List with filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">All Expenses</h2>
            <p className="text-[11px] text-slate-500">History of money spent</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center">
            <TrendingDown className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No expenses found</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {searchQuery ? 'Try changing your search keywords.' : 'Add your first personal expense.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map((txn) => (
              <div
                key={txn.id}
                onClick={() =>
                  navigateTo({
                    name: 'entry-detail',
                    entryId: txn.id,
                    returnTo: { name: 'section', section: 'Expenses' },
                  })
                }
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    {txn.paymentMethod === 'Credit Card' ? (
                      <CreditCard className="w-4 h-4" />
                    ) : txn.paymentMethod === 'Bank Account' ? (
                      <Landmark className="w-4 h-4" />
                    ) : txn.paymentMethod === 'UPI' ? (
                      <QrCode className="w-4 h-4" />
                    ) : (
                      <Banknote className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {txn.title}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>{formatDate(txn.date)}</span>
                      <span>·</span>
                      <span className="font-medium text-slate-700">{txn.categoryName}</span>
                      <span>·</span>
                      <span>
                        {txn.paymentMethod}
                        {txn.bankAccountName ? ` (${txn.bankAccountName})` : ''}
                        {txn.creditCardName ? ` (${txn.creditCardName})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-slate-900">
                      -{formatCurrency(txn.amount)}
                    </div>
                    {txn.notes && (
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5">
                        {txn.notes}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDelete(
                        'Expense Entry',
                        txn.id,
                        `${txn.title} (${formatCurrency(txn.amount)})`,
                        () => deleteTransaction(txn.id)
                      );
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete expense"
                    aria-label={`Delete ${txn.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ExportPdfLedgerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="Personal Expenses Ledger Statement"
        subtitle="Complete record of all expense entries, payment modes, and categories"
        ledgerType="expense"
        transactions={filteredExpenses}
      />
    </div>
  );
};
