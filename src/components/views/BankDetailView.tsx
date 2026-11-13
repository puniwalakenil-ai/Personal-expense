import React, { useState, useMemo } from 'react';
import {
  Landmark,
  ArrowLeft,
  Edit3,
  Plus,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  ArrowUpDown,
  BookOpen,
  Trash2,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PageView } from '../../types';
import { formatCurrency, formatDate, maskAccountNumber } from '../../utils/formatters';
import { ExportPdfLedgerModal } from '../common/ExportPdfLedgerModal';

interface Props {
  bankId: string;
  returnTo?: PageView;
}

export const BankDetailView: React.FC<Props> = ({ bankId, returnTo }) => {
  const {
    bankAccountsWithBalances,
    transactions,
    softDeleteTransaction,
    navigateTo,
    goBack,
  } = useFinancial();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | '30days'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const bank = bankAccountsWithBalances.find((b) => b.id === bankId);

  // Active transactions for this bank
  const bankTransactions = useMemo(() => {
    return transactions.filter((t) => t.bankAccountId === bankId && !t.isDeleted);
  }, [transactions, bankId]);

  // Requirement 4: Calculate running balance chronologically from opening balance
  const chronologicalPassbook = useMemo(() => {
    if (!bank) return [];
    const openingBalance = Number(bank.openingBalance) || 0;

    // Sort chronologically ascending (oldest date first)
    const sorted = [...bankTransactions].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    let running = openingBalance;
    return sorted.map((txn) => {
      const isCredit = txn.type === 'Money Received' || txn.type === 'Loan Taken';
      const isDebit =
        txn.type === 'Expense' ||
        txn.type === 'Money Paid' ||
        txn.type === 'Credit Card Payment' ||
        txn.type === 'Loan Given';

      const creditAmount = isCredit ? Number(txn.amount) || 0 : 0;
      const debitAmount = isDebit ? Number(txn.amount) || 0 : 0;
      running = running + creditAmount - debitAmount;

      return {
        ...txn,
        isCredit,
        isDebit,
        creditAmount,
        debitAmount,
        runningBalance: running,
      };
    });
  }, [bank, bankTransactions]);

  // Compute total credits and debits for this account
  const totals = useMemo(() => {
    let totalCredit = 0;
    let totalDebit = 0;
    chronologicalPassbook.forEach((item) => {
      totalCredit += item.creditAmount;
      totalDebit += item.debitAmount;
    });
    return { totalCredit, totalDebit };
  }, [chronologicalPassbook]);

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

    // Order: Descending (latest on top) or Ascending (passbook sequence)
    if (sortOrder === 'desc') {
      list.reverse();
    }

    return list;
  }, [chronologicalPassbook, searchQuery, dateFilter, sortOrder]);

  if (!bank) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-white rounded-2xl border border-slate-200 text-center">
        <Landmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-900">Bank Account Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">This account may have been moved to the Recycle Bin.</p>
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
      name: 'bank-account-form',
      editId: bank.id,
      returnTo: { name: 'bank-detail', bankId: bank.id, returnTo },
    });
  };

  const handleAddEntry = () => {
    navigateTo({
      name: 'bank-entry-form',
      bankId: bank.id,
      returnTo: { name: 'bank-detail', bankId: bank.id, returnTo },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Passbook Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle ambient lighting */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Landmark className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800/60">
                {bank.accountType} Passbook
              </span>
              <span className="text-slate-400 text-xs font-mono">
                {maskAccountNumber(bank.accountNumber)}
              </span>
            </div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {bank.bankName}
            </h2>
            <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
              <span>Opening: <strong className="font-mono text-slate-300">{formatCurrency(bank.openingBalance)}</strong></span>
              {bank.ifscCode && <span>· IFSC: <strong className="font-mono text-slate-300">{bank.ifscCode}</strong></span>}
              {bank.upiId && <span>· UPI: <strong className="font-mono text-slate-300">{bank.upiId}</strong></span>}
            </div>
          </div>
        </div>

        {/* Balance & Account Actions */}
        <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between w-full md:w-auto gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800/80">
          <div className="text-left md:text-right">
            <div className="text-xs text-slate-400 font-medium">Current Running Balance</div>
            <div className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight mt-0.5">
              {formatCurrency(bank.currentBalance)}
            </div>
          </div>

          {/* 
            Requirement 1: ACCOUNT ACTION BUTTONS
            - Redesigned as clean, professional icon-based actions
            - Keep Add Entry and Edit Account
            - Removed Delete Account completely from bank details page
          */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleAddEntry}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add New</span>
            </button>

            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 rounded-xl transition-colors cursor-pointer"
              title="Edit bank account parameters"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-300" />
              <span>Edit Account</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-indigo-200 bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/60 rounded-xl transition-colors cursor-pointer shadow-xs"
              title="Export ledger statement as PDF"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-300" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Passbook Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Opening Balance
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-slate-800">
            {formatCurrency(bank.openingBalance)}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Total Credit (In)</span>
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-emerald-600">
            +{formatCurrency(totals.totalCredit)}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Total Debit (Out)</span>
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-rose-600">
            -{formatCurrency(totals.totalDebit)}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
            Closing Balance
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-indigo-700">
            {formatCurrency(bank.currentBalance)}
          </div>
        </div>
      </div>

      {/* 
        Requirement 4: BANK PASSBOOK-STYLE TRANSACTION TABLE
        Columns: Date | Details / Name | Narration | Credit | Debit | Balance
      */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Controls & Filter Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Account Passbook Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Real-time chronological bank statement with computed running balances
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search details, narration..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
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
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Passbook Entries Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Record your first money in or money out transaction to build this bank's statement.
            </p>
            <button
              type="button"
              onClick={handleAddEntry}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-xs"
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
                    <th className="py-3.5 px-4 text-right w-36 text-indigo-900">Balance (₹)</th>
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
                          returnTo: { name: 'bank-detail', bankId: bank.id, returnTo },
                        })
                      }
                      className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {formatDate(row.date)}
                      </td>

                      {/* Details / Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
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

                      {/* Credit */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {row.isCredit ? (
                          <span className="text-emerald-600">
                            +{formatCurrency(row.creditAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-light">—</span>
                        )}
                      </td>

                      {/* Debit */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {row.isDebit ? (
                          <span className="text-slate-900">
                            -{formatCurrency(row.debitAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-light">—</span>
                        )}
                      </td>

                      {/* Running Balance */}
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

            {/* Mobile Responsive Passbook Cards (No horizontal page overflow) */}
            <div className="md:hidden divide-y divide-slate-100">
              {displayedEntries.map((row) => (
                <div
                  key={row.id}
                  onClick={() =>
                    navigateTo({
                      name: 'entry-detail',
                      entryId: row.id,
                      returnTo: { name: 'bank-detail', bankId: bank.id, returnTo },
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
                          +{formatCurrency(row.creditAmount)}
                        </div>
                      ) : (
                        <div className="text-xs font-extrabold font-mono text-slate-900">
                          -{formatCurrency(row.debitAmount)}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400">
                        {row.isCredit ? 'Credit (In)' : 'Debit (Out)'}
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
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Bal:</span>{' '}
                      <strong className="font-mono text-xs text-indigo-700">
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

      {bank && (
        <ExportPdfLedgerModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          title={`${bank.bankName} Passbook Ledger`}
          subtitle={`${bank.accountType} Account · ${maskAccountNumber(bank.accountNumber)}`}
          ledgerType="bank"
          accountInfo={{
            accountNumber: bank.accountNumber,
            accountType: bank.accountType,
            ifscCode: bank.ifscCode,
          }}
          transactions={bankTransactions}
          baseOpeningBalance={bank.openingBalance}
        />
      )}
    </div>
  );
};
