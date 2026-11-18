import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Check,
  Landmark,
  FileText,
  Search,
  ArrowUpDown,
  BookOpen,
  Calendar,
  Trash2,
  ArrowLeftRight,
  Paperclip,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ExportPdfLedgerModal } from '../common/ExportPdfLedgerModal';
import { Transaction } from '../../types';

export const CashView: React.FC = () => {
  const {
    currentCashBalance,
    cashOpeningBalance,
    setCashOpeningBalance,
    transactions,
    softDeleteTransaction,
    navigateTo,
  } = useFinancial();

  const [isEditingOpening, setIsEditingOpening] = useState(false);
  const [tempOpening, setTempOpening] = useState(String(cashOpeningBalance));
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | '30days'>('all');
  const [flowFilter, setFlowFilter] = useState<'all' | 'in' | 'out'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Standalone Cash-in-Hand transactions only (excludes bank-linked Cheque/Direct entries and non-cash adjustments)
  const cashTransactions = useMemo(() => {
    return transactions.filter(
      (t) =>
        !t.isDeleted &&
        t.paymentMethod === 'Cash' &&
        !t.bankAccountId &&
        !t.isAdjustment &&
        t.type !== 'Adjustment'
    );
  }, [transactions]);

  const isCashInTxn = (txn: Transaction): boolean => {
    if (txn.type === 'ATM Withdrawal') return txn.transferDirection !== 'out';
    if (txn.type === 'Loan Repayment') return txn.loanDirection !== 'Payable';
    return txn.type === 'Money Received' || txn.type === 'Loan Taken';
  };

  // Chronological Cash Passbook with running balance
  const chronologicalPassbook = useMemo(() => {
    const opening = Number(cashOpeningBalance) || 0;
    const sorted = [...cashTransactions].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    let running = opening;
    return sorted.map((txn) => {
      const isCredit = isCashInTxn(txn);
      const creditAmount = isCredit ? Number(txn.amount) || 0 : 0;
      const debitAmount = !isCredit ? Number(txn.amount) || 0 : 0;
      running = running + creditAmount - debitAmount;

      return {
        ...txn,
        isCredit,
        creditAmount,
        debitAmount,
        runningBalance: running,
      };
    });
  }, [cashTransactions, cashOpeningBalance]);

  const totals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    chronologicalPassbook.forEach((row) => {
      totalIn += row.creditAmount;
      totalOut += row.debitAmount;
    });
    return { totalIn, totalOut };
  }, [chronologicalPassbook]);

  const displayedEntries = useMemo(() => {
    let list = [...chronologicalPassbook];

    if (flowFilter === 'in') {
      list = list.filter((r) => r.isCredit);
    } else if (flowFilter === 'out') {
      list = list.filter((r) => !r.isCredit);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.narration && t.narration.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          (t.categoryName && t.categoryName.toLowerCase().includes(q)) ||
          (t.personName && t.personName.toLowerCase().includes(q)) ||
          (t.relatedBankAccountName && t.relatedBankAccountName.toLowerCase().includes(q))
      );
    }

    if (dateFilter === 'month') {
      const currentMonth = new Date().toISOString().slice(0, 7);
      list = list.filter((t) => t.date.startsWith(currentMonth));
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isoThreshold = thirtyDaysAgo.toISOString().slice(0, 10);
      list = list.filter((t) => t.date >= isoThreshold);
    }

    if (sortOrder === 'desc') {
      list.reverse();
    }

    return list;
  }, [chronologicalPassbook, flowFilter, searchQuery, dateFilter, sortOrder]);

  const handleSaveOpening = () => {
    setCashOpeningBalance(Number(tempOpening) || 0);
    setIsEditingOpening(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-br from-amber-950 via-slate-900 to-slate-900 text-white rounded-3xl border border-slate-800 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Banknote className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Cash / Cash-in-Hand Wallet
            </div>
            <div className="mt-1 text-3xl font-extrabold font-mono tracking-tight text-white">
              {formatCurrency(currentCashBalance)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Separate Cash dashboard & passbook · Linked automatically with Bank ATM withdrawals
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              navigateTo({
                name: 'cash-entry-form',
                defaultDirection: 'Cash Out',
                returnTo: { name: 'section', section: 'Cash' },
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-amber-50 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-600 stroke-[2.5]" />
            <span>Add Cash Entry</span>
          </button>

          <button
            type="button"
            onClick={() =>
              navigateTo({
                name: 'atm-withdrawal-form',
                returnTo: { name: 'section', section: 'Cash' },
              })
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>ATM Withdrawal</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-amber-200 bg-amber-900/60 hover:bg-amber-800/80 border border-amber-700/60 rounded-xl transition-colors cursor-pointer shadow-xs"
            title="Export cash ledger statement as PDF"
          >
            <FileText className="w-3.5 h-3.5 text-amber-300" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Quick Action Strip & Opening Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Opening Cash
            </div>
            <div className="mt-1 text-base sm:text-lg font-bold font-mono text-slate-900">
              {formatCurrency(cashOpeningBalance)}
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Cash In</span>
            </div>
            <div className="mt-1 text-base sm:text-lg font-bold font-mono text-emerald-600">
              +{formatCurrency(totals.totalIn)}
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Cash Out</span>
            </div>
            <div className="mt-1 text-base sm:text-lg font-bold font-mono text-rose-600">
              -{formatCurrency(totals.totalOut)}
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Cash in Hand
            </div>
            <div className="mt-1 text-base sm:text-lg font-bold font-mono text-amber-700">
              {formatCurrency(currentCashBalance)}
            </div>
          </div>
        </div>

        {/* Opening Balance Configuration Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900">Opening Cash Balance</div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
              Starting cash before recorded entries
            </div>
          </div>

          {isEditingOpening ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-500">₹</span>
              <input
                type="number"
                value={tempOpening}
                onChange={(e) => setTempOpening(e.target.value)}
                className="w-28 px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                placeholder="0"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveOpening}
                className="p-2 text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 cursor-pointer"
                title="Save Opening Balance"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTempOpening(String(cashOpeningBalance));
                  setIsEditingOpening(true);
                }}
                className="px-3 py-1.5 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Entry Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() =>
            navigateTo({
              name: 'cash-entry-form',
              defaultDirection: 'Cash In',
              returnTo: { name: 'section', section: 'Cash' },
            })
          }
          className="p-4 bg-white hover:bg-emerald-50/50 rounded-2xl border border-slate-200/80 hover:border-emerald-300 transition-all text-left flex items-center gap-3 cursor-pointer group shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Record Cash In</div>
            <div className="text-[11px] text-slate-500">Cash receipts, income or additions</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            navigateTo({
              name: 'cash-entry-form',
              defaultDirection: 'Cash Out',
              returnTo: { name: 'section', section: 'Cash' },
            })
          }
          className="p-4 bg-white hover:bg-rose-50/50 rounded-2xl border border-slate-200/80 hover:border-rose-300 transition-all text-left flex items-center gap-3 cursor-pointer group shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Record Cash Out</div>
            <div className="text-[11px] text-slate-500">Cash expenses or direct payments</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            navigateTo({
              name: 'atm-withdrawal-form',
              returnTo: { name: 'section', section: 'Cash' },
            })
          }
          className="p-4 bg-white hover:bg-indigo-50/50 rounded-2xl border border-slate-200/80 hover:border-indigo-300 transition-all text-left flex items-center gap-3 cursor-pointer group shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">ATM Cash Withdrawal</div>
            <div className="text-[11px] text-slate-500">Debit bank & credit Cash-in-Hand</div>
          </div>
        </button>
      </div>

      {/* Cash Passbook Statement Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Cash Passbook & Ledger</h2>
              <p className="text-xs text-slate-500">
                Date-wise Cash In / Cash Out statement with running Cash-in-Hand balance
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search cash entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-slate-900"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              {(['all', 'in', 'out'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFlowFilter(f)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    flowFilter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'in' ? 'Cash In' : 'Cash Out'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              {(['all', 'month', '30days'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDateFilter(d)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    dateFilter === d ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {d === 'all' ? 'All Dates' : d === 'month' ? 'This Month' : '30 Days'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {displayedEntries.length === 0 ? (
          <div className="py-16 text-center">
            <Banknote className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800">No cash transactions yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Add a Cash In / Cash Out entry or record an ATM Cash Withdrawal from your bank account.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() =>
                  navigateTo({
                    name: 'cash-entry-form',
                    defaultDirection: 'Cash Out',
                    returnTo: { name: 'section', section: 'Cash' },
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Cash Entry</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  navigateTo({
                    name: 'atm-withdrawal-form',
                    returnTo: { name: 'section', section: 'Cash' },
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl cursor-pointer"
              >
                <Landmark className="w-4 h-4" />
                <span>ATM Withdrawal</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Passbook Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 w-28">Date</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Details / Name</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Category / Mode / Notes</th>
                    <th className="py-3.5 px-4 text-right w-32 text-emerald-700">Cash In (₹)</th>
                    <th className="py-3.5 px-4 text-right w-32 text-rose-700">Cash Out (₹)</th>
                    <th className="py-3.5 px-4 text-right w-36 text-amber-900">Balance (₹)</th>
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
                          returnTo: { name: 'section', section: 'Cash' },
                        })
                      }
                      className="hover:bg-amber-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {formatDate(row.date)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors flex flex-wrap items-center gap-1.5">
                          <span>{row.title}</span>
                          {row.type === 'ATM Withdrawal' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                              ATM Transfer
                            </span>
                          )}
                          {row.attachments && row.attachments.length > 0 && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md"
                              title={`${row.attachments.length} attachment(s)`}
                            >
                              <Paperclip className="w-2.5 h-2.5" />
                              {row.attachments.length}
                            </span>
                          )}
                        </div>
                        {row.personName && (
                          <div className="text-[11px] text-slate-500 mt-0.5">Person: {row.personName}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md">
                            {row.categoryName || row.type}
                          </span>
                          {row.relatedBankAccountName && (
                            <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                              From: {row.relatedBankAccountName}
                            </span>
                          )}
                        </div>
                        {(row.narration || row.notes) && (
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">
                            {row.narration || row.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {row.isCredit ? (
                          <span className="text-emerald-600">+{formatCurrency(row.creditAmount)}</span>
                        ) : (
                          <span className="text-slate-300 font-light">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {!row.isCredit ? (
                          <span className="text-slate-900">-{formatCurrency(row.debitAmount)}</span>
                        ) : (
                          <span className="text-slate-300 font-light">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                        {formatCurrency(row.runningBalance)}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            softDeleteTransaction(row.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Move to Recycle Bin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {displayedEntries.map((row) => (
                <div
                  key={row.id}
                  onClick={() =>
                    navigateTo({
                      name: 'entry-detail',
                      entryId: row.id,
                      returnTo: { name: 'section', section: 'Cash' },
                    })
                  }
                  className="p-4 space-y-2 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{row.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Calendar className="w-3 h-3 inline" />
                        <span>{formatDate(row.date)}</span>
                        <span>·</span>
                        <span>{row.categoryName || row.type}</span>
                        {row.attachments && row.attachments.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md">
                            <Paperclip className="w-2.5 h-2.5" />
                            {row.attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-extrabold font-mono ${
                          row.isCredit ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {row.isCredit
                          ? `+${formatCurrency(row.creditAmount)}`
                          : `-${formatCurrency(row.debitAmount)}`}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {row.isCredit ? 'Cash In' : 'Cash Out'}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl flex items-center justify-between">
                    <span className="truncate">{row.narration || row.notes || 'Cash Wallet'}</span>
                    <div className="text-right shrink-0 pl-2">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Bal:</span>{' '}
                      <strong className="font-mono text-xs text-amber-700">
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

      <ExportPdfLedgerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="Cash / Cash-in-Hand Ledger Statement"
        subtitle="Physical cash passbook with opening balance, ATM withdrawals, and running balance"
        ledgerType="cash"
        transactions={cashTransactions}
        baseOpeningBalance={cashOpeningBalance}
      />
    </div>
  );
};
