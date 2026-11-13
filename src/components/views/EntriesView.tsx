import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  CreditCard,
  HandCoins,
  Trash2,
  Landmark,
  FileText,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TransactionType, PaymentMethod } from '../../types';
import { InlineDropdown } from '../common/InlineDropdown';
import { ExportPdfLedgerModal } from '../common/ExportPdfLedgerModal';

export const EntriesView: React.FC = () => {
  const { transactions, deleteTransaction, requestDelete, navigateTo } = useFinancial();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const filteredTransactions = transactions.filter((txn) => {
    // Type filter
    if (typeFilter !== 'ALL' && txn.type !== typeFilter) {
      return false;
    }

    // Method filter
    if (methodFilter !== 'ALL' && txn.paymentMethod !== methodFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        txn.title.toLowerCase().includes(q) ||
        (txn.categoryName && txn.categoryName.toLowerCase().includes(q)) ||
        (txn.personName && txn.personName.toLowerCase().includes(q)) ||
        (txn.bankAccountName && txn.bankAccountName.toLowerCase().includes(q)) ||
        (txn.creditCardName && txn.creditCardName.toLowerCase().includes(q)) ||
        (txn.notes && txn.notes.toLowerCase().includes(q));
      if (!matches) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Central Ledger Entries</h2>
            <p className="text-xs text-slate-500">
              Complete chronological audit of personal financial activities
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer shadow-xs"
              title="Export complete ledger statement as PDF"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo({ name: 'section', section: 'Bank Accounts' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Select Bank to Add Entry</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-2 border-t border-slate-100">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, category, party, note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Type Segmented Controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs">
            {(['ALL', 'Expense', 'Money Received', 'Money Paid', 'Credit Card Payment'] as const).map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    typeFilter === t
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t === 'ALL' ? 'All Types' : t}
                </button>
              )
            )}
          </div>

          {/* Payment Method Filter - Modern Inline Dropdown */}
          <div className="w-full sm:w-48">
            <InlineDropdown
              id="entries-method-filter"
              value={methodFilter}
              onChange={(val) => setMethodFilter(val)}
              options={[
                { value: 'ALL', label: 'All Payment Sources' },
                { value: 'Cash', label: 'Cash' },
                { value: 'UPI', label: 'UPI' },
                { value: 'Bank Account', label: 'Bank Account' },
                { value: 'Credit Card', label: 'Credit Card' },
              ]}
              searchable={false}
              placeholder="All Sources"
            />
          </div>
        </div>
      </div>

      {/* Entries List / Table (Requirement 17: Date, Type, Name/Description, Category, Amount, Payment Source, Relevant account, Status) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-xs font-bold text-slate-800">No entries found</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {transactions.length === 0
                ? 'Your entries ledger is completely clean.'
                : 'No transactions match the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Name / Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payment Source & Account</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((txn) => {
                  const isOutflow =
                    txn.type === 'Expense' ||
                    txn.type === 'Money Paid' ||
                    txn.type === 'Loan Given' ||
                    txn.type === 'Credit Card Payment';

                  return (
                    <tr
                      key={txn.id}
                      onClick={() =>
                        navigateTo({
                          name: 'entry-detail',
                          entryId: txn.id,
                          returnTo: { name: 'section', section: 'Entries' },
                        })
                      }
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {formatDate(txn.date)}
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-700">
                          {txn.type}
                        </span>
                      </td>

                      {/* Name / Title */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 truncate max-w-xs">
                          {txn.title}
                        </div>
                        {txn.personName && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                            Party: {txn.personName}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {txn.categoryName || '—'}
                      </td>

                      {/* Payment Source & Account */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-medium">{txn.paymentMethod}</div>
                        <div className="text-[11px] text-slate-400">
                          {txn.bankAccountName || txn.creditCardName || (txn.upiId ? txn.upiId : '—')}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={isOutflow ? 'text-slate-900' : 'text-emerald-600'}>
                          {isOutflow ? '-' : '+'}
                          {formatCurrency(txn.amount)}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-purple-600 hover:text-purple-800 font-semibold text-xs">
                            View →
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDelete(
                                'Transaction Entry',
                                txn.id,
                                `${txn.title} (${formatCurrency(txn.amount)})`,
                                () => deleteTransaction(txn.id)
                              );
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete entry"
                            aria-label={`Delete ${txn.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExportPdfLedgerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="Master Financial Transactions Ledger"
        subtitle="Complete chronological audit of all personal accounts and transactions"
        ledgerType="general"
        transactions={filteredTransactions}
      />
    </div>
  );
};
