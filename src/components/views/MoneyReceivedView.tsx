import React, { useState } from 'react';
import { ArrowDownLeft, Plus, Search, Calendar, User, Landmark, Banknote, QrCode, Trash2, FileText } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ExportPdfLedgerModal } from '../common/ExportPdfLedgerModal';

export const MoneyReceivedView: React.FC = () => {
  const { transactions, totalMoneyReceived, navigateTo, deleteTransaction, requestDelete } = useFinancial();
  const [search, setSearch] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const receivedTxns = transactions.filter((t) => t.type === 'Money Received');

  const filtered = receivedTxns.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.personName && t.personName.toLowerCase().includes(q)) ||
      (t.categoryName && t.categoryName.toLowerCase().includes(q)) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Total Money Received
          </div>
          <div className="mt-1 text-3xl font-extrabold font-mono tracking-tight text-white">
            {formatCurrency(totalMoneyReceived)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Salary, returns, gifts, cashback & client receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-emerald-200 bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-700/60 rounded-xl transition-colors cursor-pointer shadow-xs"
            title="Export income ledger statement as PDF"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-300" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo({ name: 'section', section: 'Bank Accounts' })}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Landmark className="w-4 h-4 text-emerald-600" />
            <span>Select Bank to Add Entry</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Receipts Log</h2>
            <p className="text-[11px] text-slate-500">Every inflow to cash, bank, or UPI</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search receipts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <ArrowDownLeft className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No money receipts recorded</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Start by logging any income, repayments, or deposits.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((txn) => (
              <div
                key={txn.id}
                onClick={() =>
                  navigateTo({
                    name: 'entry-detail',
                    entryId: txn.id,
                    returnTo: { name: 'section', section: 'Money Received' },
                  })
                }
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    {txn.paymentMethod === 'Bank Account' ? (
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
                      {txn.personName && (
                        <>
                          <span className="text-slate-800 font-medium">From: {txn.personName}</span>
                          <span>·</span>
                        </>
                      )}
                      <span>{txn.categoryName || 'General Inflow'}</span>
                      <span>·</span>
                      <span>
                        {txn.paymentMethod} {txn.bankAccountName ? `(${txn.bankAccountName})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-emerald-600">
                      +{formatCurrency(txn.amount)}
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
                        'Money Received Entry',
                        txn.id,
                        `${txn.title} (+${formatCurrency(txn.amount)})`,
                        () => deleteTransaction(txn.id)
                      );
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete record"
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

      {/* PDF Ledger Export Modal */}
      <ExportPdfLedgerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="Money Received Ledger"
        subtitle="All Income & Receipts"
        ledgerType="income"
        transactions={receivedTxns}
        baseOpeningBalance={0}
      />
    </div>
  );
};
