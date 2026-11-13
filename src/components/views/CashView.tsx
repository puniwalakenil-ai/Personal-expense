import React, { useState } from 'react';
import { Banknote, Plus, ArrowDownLeft, ArrowUpRight, Edit2, Check, Landmark, FileText } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ExportPdfLedgerModal } from '../common/ExportPdfLedgerModal';

export const CashView: React.FC = () => {
  const {
    currentCashBalance,
    cashOpeningBalance,
    setCashOpeningBalance,
    transactions,
    navigateTo,
  } = useFinancial();

  const [isEditingOpening, setIsEditingOpening] = useState(false);
  const [tempOpening, setTempOpening] = useState(String(cashOpeningBalance));
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const cashTransactions = transactions.filter((t) => t.paymentMethod === 'Cash');

  const cashInflow = cashTransactions
    .filter((t) => t.type === 'Money Received' || t.type === 'Loan Taken')
    .reduce((sum, t) => sum + t.amount, 0);

  const cashOutflow = cashTransactions
    .filter((t) => t.type === 'Expense' || t.type === 'Money Paid' || t.type === 'Loan Given' || t.type === 'Credit Card Payment')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleSaveOpening = () => {
    setCashOpeningBalance(Number(tempOpening) || 0);
    setIsEditingOpening(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-br from-amber-950 via-slate-900 to-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Current Cash in Hand
          </div>
          <div className="mt-1 text-3xl font-extrabold font-mono tracking-tight text-white">
            {formatCurrency(currentCashBalance)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Physical cash in your wallet and home safe
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-200 bg-amber-900/60 hover:bg-amber-800/80 border border-amber-700/60 rounded-xl transition-colors cursor-pointer shadow-xs"
            title="Export cash ledger statement as PDF"
          >
            <FileText className="w-3.5 h-3.5 text-amber-300" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo({ name: 'section', section: 'Bank Accounts' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5 text-indigo-600" />
            <span>Select Bank to Add Entry</span>
          </button>
        </div>
      </div>

      {/* Opening Balance Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-slate-900">Physical Cash Opening Balance</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Initial cash amount before recording transactions
          </div>
        </div>

        {isEditingOpening ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">₹</span>
            <input
              type="number"
              value={tempOpening}
              onChange={(e) => setTempOpening(e.target.value)}
              className="w-32 px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
              placeholder="0"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveOpening}
              className="p-2 text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 cursor-pointer"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono font-bold text-slate-900">
              {formatCurrency(cashOpeningBalance)}
            </span>
            <button
              type="button"
              onClick={() => {
                setTempOpening(String(cashOpeningBalance));
                setIsEditingOpening(true);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>
        )}
      </div>

      {/* Inflow vs Outflow Mini stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>Total Cash Inflow</span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-600">
            +{formatCurrency(cashInflow)}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            <span>Total Cash Outflow</span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-rose-600">
            -{formatCurrency(cashOutflow)}
          </div>
        </div>
      </div>

      {/* Cash Statement Log */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-4">Cash Transaction History</h2>

        {cashTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <Banknote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No cash transactions yet</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Select "Cash" as payment method when adding expenses or payments.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {cashTransactions.map((txn) => {
              const isOutflow =
                txn.type === 'Expense' || txn.type === 'Money Paid' || txn.type === 'Loan Given';
              return (
                <div
                  key={txn.id}
                  onClick={() =>
                    navigateTo({
                      name: 'entry-detail',
                      entryId: txn.id,
                      returnTo: { name: 'section', section: 'Cash' },
                    })
                  }
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isOutflow ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {isOutflow ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{txn.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        <span>{formatDate(txn.date)}</span>
                        <span> · </span>
                        <span>{txn.categoryName || txn.type}</span>
                        {txn.personName && <span> · {txn.personName}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-bold font-mono ${
                        isOutflow ? 'text-slate-900' : 'text-emerald-600'
                      }`}
                    >
                      {isOutflow ? '-' : '+'}
                      {formatCurrency(txn.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{txn.type}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ExportPdfLedgerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="Physical Cash Ledger Statement"
        subtitle="Physical cash passbook with opening balance and running transactions"
        ledgerType="cash"
        transactions={cashTransactions}
        baseOpeningBalance={cashOpeningBalance}
      />
    </div>
  );
};
