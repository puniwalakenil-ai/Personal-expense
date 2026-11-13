import React, { useState, useMemo } from 'react';
import {
  CreditCard as CardIcon,
  Plus,
  Search,
  BookOpen,
  Trash2,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Edit3,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  FileText,
  History,
  Clock,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PageView } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { computeCardStatementHistory, getBillDueStatusText } from '../../utils/creditCardBilling';
import { ExportPdfLedgerModal } from '../common/ExportPdfLedgerModal';

interface Props {
  cardId: string;
  returnTo?: PageView;
}

export const CreditCardDetailView: React.FC<Props> = ({ cardId, returnTo }) => {
  const {
    creditCardsWithOutstanding,
    transactions,
    softDeleteTransaction,
    deleteCreditCard,
    requestDelete,
    navigateTo,
    goBack,
  } = useFinancial();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | '30days'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'passbook' | 'statements'>('passbook');

  const card = creditCardsWithOutstanding.find((c) => c.id === cardId);

  // Active transactions for this credit card
  const cardTransactions = useMemo(() => {
    return transactions.filter((t) => t.creditCardId === cardId && !t.isDeleted);
  }, [transactions, cardId]);

  // Calculate running outstanding balance chronologically
  // Debits (Expenses/Spends) increase outstanding
  // Credits (Bill Payments, Money Received/Refunds) decrease outstanding
  const chronologicalPassbook = useMemo(() => {
    if (!card) return [];

    // Sort chronologically ascending (oldest date first)
    const sorted = [...cardTransactions].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    let running = 0;
    return sorted.map((txn) => {
      const isCredit = txn.type === 'Credit Card Payment' || txn.type === 'Money Received';
      const isDebit = txn.type === 'Expense' || txn.type === 'Money Paid';

      const creditAmount = isCredit ? Number(txn.amount) || 0 : 0;
      const debitAmount = isDebit ? Number(txn.amount) || 0 : 0;
      running = Math.max(0, running + debitAmount - creditAmount);

      return {
        ...txn,
        isCredit,
        isDebit,
        creditAmount,
        debitAmount,
        runningBalance: running,
      };
    });
  }, [card, cardTransactions]);

  // Compute total credits and debits for this card
  const totals = useMemo(() => {
    let totalCredit = 0;
    let totalDebit = 0;
    chronologicalPassbook.forEach((item) => {
      totalCredit += item.creditAmount;
      totalDebit += item.debitAmount;
    });
    return { totalCredit, totalDebit };
  }, [chronologicalPassbook]);

  // Computed monthly statements history (mathematically derived, never duplicates transactions)
  const statementHistory = useMemo(() => {
    if (!card) return [];
    return computeCardStatementHistory(card, transactions, 12);
  }, [card, transactions]);

  // Filter and sort for passbook display
  const displayedEntries = useMemo(() => {
    let list = [...chronologicalPassbook];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.narration && t.narration.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          (t.categoryName && t.categoryName.toLowerCase().includes(q))
      );
    }

    // Date range filter
    if (dateFilter === 'month') {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      list = list.filter((t) => t.date.startsWith(currentMonth));
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isoThreshold = thirtyDaysAgo.toISOString().slice(0, 10);
      list = list.filter((t) => t.date >= isoThreshold);
    }

    // Order: Descending (latest on top) or Ascending (statement sequence)
    if (sortOrder === 'desc') {
      list.reverse();
    }

    return list;
  }, [chronologicalPassbook, searchQuery, dateFilter, sortOrder]);

  if (!card) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-white rounded-2xl border border-slate-200 text-center">
        <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-900">Credit Card Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">This card may have been removed.</p>
        <button
          type="button"
          onClick={goBack}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const handleEdit = () => {
    navigateTo({
      name: 'credit-card-form',
      editId: card.id,
      returnTo: { name: 'credit-card-detail', cardId: card.id, returnTo },
    });
  };

  const handleAddEntry = () => {
    navigateTo({
      name: 'credit-card-entry-form',
      cardId: card.id,
      returnTo: { name: 'credit-card-detail', cardId: card.id, returnTo },
    });
  };

  const handlePayBill = () => {
    navigateTo({
      name: 'credit-card-payment-form',
      cardId: card.id,
      returnTo: { name: 'credit-card-detail', cardId: card.id, returnTo },
    });
  };

  const availableLimit = Math.max(0, (card.creditLimit || 0) - card.outstandingAmount);

  return (
    <div className="space-y-6">
      {/* Top Passbook Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-950 via-purple-950 to-slate-900 text-white rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle ambient lighting */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <CardIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-800/60">
                Credit Card Passbook
              </span>
              <span className="text-slate-400 text-xs font-mono">
                •••• {card.cardIdentifier.slice(-4)}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  card.outstandingAmount > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {card.outstandingAmount > 0 ? 'Dues Pending' : 'Paid in Full'}
              </span>
            </div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {card.cardName}
            </h2>
            <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
              <span>Limit: <strong className="font-mono text-slate-300">{formatCurrency(card.creditLimit || 0)}</strong></span>
              <span>· Billing Day: <strong className="font-mono text-slate-300">{card.billingDate}th</strong></span>
              <span>
                · Due Date:{' '}
                <strong className="font-mono text-slate-300">
                  {card.paymentDueDate ? formatDate(card.paymentDueDate) : 'Not configured'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Balance & Card Actions */}
        <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between w-full md:w-auto gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800/80">
          <div className="text-left md:text-right">
            <div className="text-xs text-slate-400 font-medium">Current Outstanding Dues</div>
            <div className="text-3xl font-extrabold font-mono text-amber-400 tracking-tight mt-0.5">
              {formatCurrency(card.outstandingAmount)}
            </div>
            {card.creditLimit > 0 && (
              <div className="text-[11px] text-slate-400 mt-0.5">
                Available Limit: <span className="font-mono text-emerald-400">{formatCurrency(availableLimit)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleAddEntry}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded-xl transition-all shadow-md shadow-purple-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Entry</span>
            </button>

            <button
              type="button"
              onClick={handlePayBill}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pay Bill</span>
            </button>

            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 rounded-xl transition-colors cursor-pointer"
              title="Edit credit card parameters"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-300" />
              <span>Edit Card</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-purple-200 bg-purple-900/60 hover:bg-purple-800/80 border border-purple-700/60 rounded-xl transition-colors cursor-pointer shadow-xs"
              title="Export credit card statement as PDF"
            >
              <FileText className="w-3.5 h-3.5 text-purple-300" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Credit Limit
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-slate-800">
            {formatCurrency(card.creditLimit || 0)}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Total Spends (Debits)</span>
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-rose-600">
            +{formatCurrency(totals.totalDebit)}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Payments / Credits</span>
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-emerald-600">
            -{formatCurrency(totals.totalCredit)}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">
            Current Outstanding
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-purple-700">
            {formatCurrency(card.outstandingAmount)}
          </div>
        </div>
      </div>

      {/* TABS: Passbook Ledger vs Billing Statements History */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('passbook')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'passbook'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-purple-600" />
          <span>Passbook Ledger</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
            {displayedEntries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('statements')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'statements'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4 text-purple-600" />
          <span>Billing Statements History</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
            {statementHistory.length}
          </span>
        </button>
      </div>

      {activeTab === 'passbook' ? (
        /* PASSBOOK-STYLE TRANSACTION TABLE */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Table Controls & Filter Bar */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Credit Card Passbook Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Chronological statement with real-time running outstanding balances
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search details, merchant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
              />
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  dateFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('month')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  dateFilter === 'month'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('30days')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  dateFilter === '30days'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30 Days
              </button>
            </div>

            {/* Sort Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Toggle sorting order"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Passbook Table / Cards */}
        {displayedEntries.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Statement Entries Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Record your first purchase, spend, or bill payment to build this card's statement.
            </p>
            <button
              type="button"
              onClick={handleAddEntry}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add New Entry</span>
            </button>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Passbook Statement Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 w-28">Date</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Details / Name</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Narration</th>
                    <th className="py-3.5 px-4 text-right w-32 text-emerald-700">Credit (₹)</th>
                    <th className="py-3.5 px-4 text-right w-32 text-rose-700">Debit (₹)</th>
                    <th className="py-3.5 px-4 text-right w-36 text-purple-900">Outstanding (₹)</th>
                    <th className="py-3.5 px-4 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {displayedEntries.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() =>
                        navigateTo({
                          name: 'entry-detail',
                          entryId: row.id,
                          returnTo: { name: 'credit-card-detail', cardId: card.id, returnTo },
                        })
                      }
                      className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {formatDate(row.date)}
                      </td>

                      {/* Details / Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                          {row.title}
                        </div>
                        {row.categoryName && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                            {row.categoryName}
                          </span>
                        )}
                      </td>

                      {/* Narration */}
                      <td className="py-3.5 px-4 text-slate-500">
                        {row.narration ? (
                          <span className="italic text-slate-700 font-normal">{row.narration}</span>
                        ) : row.notes ? (
                          <span className="text-slate-500">{row.notes}</span>
                        ) : (
                          <span className="text-slate-300 font-light">—</span>
                        )}
                      </td>

                      {/* Credit (Bill Payment / Refund) */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {row.isCredit ? (
                          <span className="text-emerald-600">
                            -{formatCurrency(row.creditAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-light">—</span>
                        )}
                      </td>

                      {/* Debit (Spend / Purchase) */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {row.isDebit ? (
                          <span className="text-rose-600">
                            +{formatCurrency(row.debitAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-light">—</span>
                        )}
                      </td>

                      {/* Running Outstanding Balance */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                        {formatCurrency(row.runningBalance)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            softDeleteTransaction(row.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Move to Recycle Bin"
                          aria-label={`Delete ${row.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Passbook Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {displayedEntries.map((row) => (
                <div
                  key={row.id}
                  onClick={() =>
                    navigateTo({
                      name: 'entry-detail',
                      entryId: row.id,
                      returnTo: { name: 'credit-card-detail', cardId: card.id, returnTo },
                    })
                  }
                  className="p-4 space-y-2 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {row.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-400 inline" />
                        <span>{formatDate(row.date)}</span>
                        {row.categoryName && (
                          <>
                            <span>·</span>
                            <span>{row.categoryName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {row.isCredit ? (
                        <div className="text-xs font-extrabold font-mono text-emerald-600">
                          -{formatCurrency(row.creditAmount)}
                        </div>
                      ) : (
                        <div className="text-xs font-extrabold font-mono text-rose-600">
                          +{formatCurrency(row.debitAmount)}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400">
                        {row.isCredit ? 'Payment / Credit' : 'Card Spend'}
                      </div>
                    </div>
                  </div>

                  {/* Narration line */}
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl flex items-center justify-between">
                    <span className="truncate">
                      <strong>Narration:</strong>{' '}
                      {row.narration || row.notes || <span className="text-slate-400">—</span>}
                    </span>
                    <div className="text-right shrink-0 pl-2">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Due:</span>{' '}
                      <strong className="font-mono text-xs text-purple-700">
                        {formatCurrency(row.runningBalance)}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        </div>
      ) : (
        /* BILLING STATEMENTS HISTORY */
        <div className="space-y-4">
          {/* Billing Automation Info Card */}
          <div className="p-5 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                  Automated Recurring Billing Schedule
                </h4>
                <p className="text-xs text-purple-900 mt-0.5">
                  Statement generated on the <strong>{card.billingDate}th</strong> of every month · Payment due within <strong>{card.dueDays || 20} days</strong>
                </p>
                <p className="text-[11px] text-purple-700/80 mt-1">
                  Statements are derived directly from transactions. Generating statements never creates duplicate expenses.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePayBill}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Record Bill Payment</span>
            </button>
          </div>

          {/* Statements Table Container */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Monthly Statement Records
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological billing cycles with spend totals, payments, and real-time settlement status
                </p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60">
                {statementHistory.length} Statement{statementHistory.length === 1 ? '' : 's'}
              </span>
            </div>

            {statementHistory.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
                  <History className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Billing Cycles Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Statements will automatically appear here once transactions are recorded against this card.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3.5 px-4">Statement Date</th>
                        <th className="py-3.5 px-4">Cycle Period</th>
                        <th className="py-3.5 px-4">Payment Due Date</th>
                        <th className="py-3.5 px-4 text-right">Total Billed</th>
                        <th className="py-3.5 px-4 text-right">Amount Paid</th>
                        <th className="py-3.5 px-4 text-right">Outstanding</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {statementHistory.map((stmt) => {
                        const statusBadge = getBillDueStatusText(stmt.daysRemaining, stmt.isOverdue, stmt.status);
                        return (
                          <tr key={stmt.id} className="hover:bg-purple-50/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                              {formatDate(stmt.statementDate)}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                              {formatDate(stmt.cycleStartDate)} – {formatDate(stmt.statementDate)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-800">
                                {formatDate(stmt.dueDate)}
                              </div>
                              <div className="mt-0.5">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusBadge.colorClass}`}>
                                  {statusBadge.text}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {formatCurrency(stmt.totalBilledAmount)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600 whitespace-nowrap">
                              {stmt.amountPaid > 0 ? `-${formatCurrency(stmt.amountPaid)}` : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-extrabold whitespace-nowrap">
                              <span className={stmt.outstandingAmount > 0 ? 'text-amber-600' : 'text-slate-400'}>
                                {formatCurrency(stmt.outstandingAmount)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 ${
                                  stmt.status === 'Paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : stmt.status === 'Partially Paid'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {stmt.status === 'Paid' ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                ) : stmt.status === 'Partially Paid' ? (
                                  <Clock className="w-3 h-3 text-amber-600" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                )}
                                <span>{stmt.status}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {stmt.status !== 'Paid' && stmt.outstandingAmount > 0 ? (
                                <button
                                  type="button"
                                  onClick={handlePayBill}
                                  className="px-3 py-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                                >
                                  Pay Bill
                                </button>
                              ) : (
                                <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Settled</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-slate-100">
                  {statementHistory.map((stmt) => {
                    const statusBadge = getBillDueStatusText(stmt.daysRemaining, stmt.isOverdue, stmt.status);
                    return (
                      <div key={stmt.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              Statement: {formatDate(stmt.statementDate)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Due: {formatDate(stmt.dueDate)}
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              stmt.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : stmt.status === 'Partially Paid'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {stmt.status}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <div className="text-[10px] text-slate-400 font-medium">Billed</div>
                            <div className="font-mono font-bold text-slate-900 mt-0.5">
                              {formatCurrency(stmt.totalBilledAmount)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-medium">Paid</div>
                            <div className="font-mono font-semibold text-emerald-600 mt-0.5">
                              {formatCurrency(stmt.amountPaid)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-medium">Due</div>
                            <div className="font-mono font-extrabold text-amber-600 mt-0.5">
                              {formatCurrency(stmt.outstandingAmount)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusBadge.colorClass}`}>
                            {statusBadge.text}
                          </span>

                          {stmt.status !== 'Paid' && stmt.outstandingAmount > 0 ? (
                            <button
                              type="button"
                              onClick={handlePayBill}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                            >
                              Pay Bill
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Settled</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {card && (
        <ExportPdfLedgerModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          title={`${card.cardName} Credit Card Statement`}
          subtitle={`Credit Card · ${card.cardIdentifier}`}
          ledgerType="credit-card"
          accountInfo={{
            identifier: card.cardIdentifier,
            limit: card.creditLimit,
          }}
          transactions={cardTransactions}
          baseOpeningBalance={0}
        />
      )}
    </div>
  );
};
