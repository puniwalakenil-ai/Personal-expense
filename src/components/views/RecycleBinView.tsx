import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Search,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, formatDate, maskAccountNumber } from '../../utils/formatters';

export const RecycleBinView: React.FC = () => {
  const {
    deletedTransactions,
    deletedBankAccounts,
    transactions,
    restoreTransaction,
    permanentlyDeleteTransaction,
    restoreBankAccount,
    permanentlyDeleteBankAccount,
    emptyRecycleBin,
  } = useFinancial();

  const [activeTab, setActiveTab] = useState<'all' | 'transactions' | 'banks'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Permanent Delete Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'transaction' | 'bank' | 'empty-all';
    id?: string;
    title?: string;
    linkedTxnCount?: number;
  }>({
    isOpen: false,
    type: 'transaction',
  });

  const totalDeletedCount = deletedTransactions.length + deletedBankAccounts.length;

  // Filtered lists based on search
  const filteredTransactions = deletedTransactions.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.narration && t.narration.toLowerCase().includes(q)) ||
      (t.categoryName && t.categoryName.toLowerCase().includes(q)) ||
      (t.bankAccountName && t.bankAccountName.toLowerCase().includes(q))
    );
  });

  const filteredBanks = deletedBankAccounts.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return b.bankName.toLowerCase().includes(q) || b.accountNumber.includes(q);
  });

  const handleConfirmPermanentDelete = () => {
    if (confirmModal.type === 'empty-all') {
      emptyRecycleBin();
    } else if (confirmModal.type === 'transaction' && confirmModal.id) {
      permanentlyDeleteTransaction(confirmModal.id);
    } else if (confirmModal.type === 'bank' && confirmModal.id) {
      permanentlyDeleteBankAccount(confirmModal.id);
    }
    setConfirmModal({ isOpen: false, type: 'transaction' });
  };

  return (
    <div className="space-y-6">
      {/* Permanent Deletion Confirmation Modal (Requirement 2) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {confirmModal.type === 'empty-all'
                  ? 'Empty Entire Recycle Bin?'
                  : 'Permanently Delete Record?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {confirmModal.type === 'empty-all'
                  ? 'This will permanently erase all deleted transactions and bank accounts. This action CANNOT be undone.'
                  : `Are you sure you want to permanently erase "${confirmModal.title}"? This cannot be undone.`}
              </p>

              {confirmModal.linkedTxnCount !== undefined && confirmModal.linkedTxnCount > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-left text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Warning:</strong> This bank account has{' '}
                    <strong>{confirmModal.linkedTxnCount}</strong> transactions in history.
                    Permanently deleting it will detach those entries.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, type: 'transaction' })}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm shadow-rose-600/30 cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Recycle Bin · Safety Archive</span>
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>{totalDeletedCount} Deleted Record{totalDeletedCount === 1 ? '' : 's'}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Review soft-deleted entries and accounts. Restore them anytime to active records, or permanently purge them when appropriate.
          </p>
        </div>

        {totalDeletedCount > 0 && (
          <button
            type="button"
            onClick={() =>
              setConfirmModal({
                isOpen: true,
                type: 'empty-all',
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer shadow-rose-600/30"
          >
            <Trash2 className="w-4 h-4" />
            <span>Empty Recycle Bin</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items ({totalDeletedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Transactions ({deletedTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('banks')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'banks'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bank Accounts ({deletedBankAccounts.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search deleted records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
            />
          </div>
        </div>

        {/* Content Section */}
        {totalDeletedCount === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Recycle Bin is Empty</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              No soft-deleted records. When you delete transactions or bank accounts, they will be safely kept here for restoration.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Deleted Bank Accounts Section */}
            {(activeTab === 'all' || activeTab === 'banks') && filteredBanks.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                  Deleted Bank Accounts
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredBanks.map((bank) => {
                    const linkedTxnCount = transactions.filter((t) => t.bankAccountId === bank.id).length;
                    return (
                      <div
                        key={bank.id}
                        className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                <Landmark className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900">{bank.bankName}</h4>
                                <span className="text-[11px] font-mono text-slate-500">
                                  {maskAccountNumber(bank.accountNumber)} · {bank.accountType}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                              Deleted
                            </span>
                          </div>

                          {linkedTxnCount > 0 && (
                            <div className="mt-3 p-2 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Contains {linkedTxnCount} linked transactions</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">
                            {bank.deletedAt ? `Deleted ${formatDate(bank.deletedAt.slice(0, 10))}` : 'In Recycle Bin'}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => restoreBankAccount(bank.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-colors cursor-pointer"
                              title="Restore back to active bank accounts"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  type: 'bank',
                                  id: bank.id,
                                  title: bank.bankName,
                                  linkedTxnCount,
                                })
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-colors cursor-pointer"
                              title="Permanently remove bank account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Purge</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Deleted Transactions Section */}
            {(activeTab === 'all' || activeTab === 'transactions') && filteredTransactions.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                  Deleted Transactions & Entries
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                  {filteredTransactions.map((txn) => {
                    const isCredit = txn.type === 'Money Received' || txn.type === 'Loan Taken';
                    return (
                      <div
                        key={txn.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isCredit
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{txn.title}</span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {txn.type}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span>{formatDate(txn.date)}</span>
                              {txn.narration && (
                                <>
                                  <span>·</span>
                                  <span className="italic text-slate-500">"{txn.narration}"</span>
                                </>
                              )}
                              {txn.bankAccountName && (
                                <>
                                  <span>·</span>
                                  <span className="text-indigo-600 font-medium">
                                    {txn.bankAccountName}
                                  </span>
                                </>
                              )}
                              {txn.categoryName && (
                                <>
                                  <span>·</span>
                                  <span>{txn.categoryName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                          <div className="text-left sm:text-right">
                            <span
                              className={`text-xs font-bold font-mono ${
                                isCredit ? 'text-emerald-600' : 'text-slate-900'
                              }`}
                            >
                              {isCredit ? '+' : '-'}
                              {formatCurrency(txn.amount)}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {txn.deletedAt
                                ? `Deleted ${formatDate(txn.deletedAt.slice(0, 10))}`
                                : 'Soft Deleted'}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => restoreTransaction(txn.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-colors cursor-pointer"
                              title="Restore entry back into passbook and balances"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  type: 'transaction',
                                  id: txn.id,
                                  title: `${txn.title} (${formatCurrency(txn.amount)})`,
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Permanently erase record"
                              aria-label={`Permanently delete ${txn.title}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
