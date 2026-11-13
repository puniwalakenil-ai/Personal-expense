import React from 'react';
import { QrCode, Plus, ArrowDownLeft, ArrowUpRight, Landmark, ExternalLink } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const UpiView: React.FC = () => {
  const { upiAccounts, transactions, bankAccounts, navigateTo } = useFinancial();

  const upiTransactions = transactions.filter((t) => t.paymentMethod === 'UPI');

  const upiInflow = upiTransactions
    .filter((t) => t.type === 'Money Received' || t.type === 'Loan Taken')
    .reduce((sum, t) => sum + t.amount, 0);

  const upiOutflow = upiTransactions
    .filter((t) => t.type === 'Expense' || t.type === 'Money Paid' || t.type === 'Credit Card Payment' || t.type === 'Loan Given')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            UPI Payments & Transfers
          </div>
          <div className="mt-1 text-3xl font-extrabold font-mono tracking-tight text-white">
            {formatCurrency(upiOutflow)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Total out via Google Pay, PhonePe, Paytm & BHIM
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateTo({ name: 'upi-form' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Add UPI ID</span>
          </button>
        </div>
      </div>

      {/* UPI IDs list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Registered UPI IDs</h2>
            <p className="text-[11px] text-slate-500">VPAs linked to your bank accounts</p>
          </div>
        </div>

        {upiAccounts.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200/80 text-center">
            <QrCode className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No UPI handles saved</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Save your VPAs (e.g. yourname@okhdfcbank) for easy reference and linking.
            </p>
            <button
              type="button"
              onClick={() => navigateTo({ name: 'upi-form' })}
              className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 cursor-pointer"
            >
              + Register UPI Handle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {upiAccounts.map((u) => {
              const bank = bankAccounts.find((b) => b.id === u.bankAccountId);
              return (
                <div
                  key={u.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold font-mono text-slate-900 truncate">
                        {u.upiId}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {u.label} {bank ? `· ${bank.bankName}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* UPI Statement History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-4">UPI Transactions</h2>

        {upiTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-xs font-semibold text-slate-700">No UPI transactions yet</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Select "UPI" when creating an expense or receiving money.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {upiTransactions.map((txn) => {
              const isOutflow =
                txn.type === 'Expense' || txn.type === 'Money Paid' || txn.type === 'Loan Given';
              return (
                <div
                  key={txn.id}
                  onClick={() =>
                    navigateTo({
                      name: 'entry-detail',
                      entryId: txn.id,
                      returnTo: { name: 'section', section: 'UPI' },
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
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{txn.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        <span>{formatDate(txn.date)}</span>
                        <span> · </span>
                        <span>{txn.categoryName || txn.type}</span>
                        {txn.bankAccountName && <span> · Bank: {txn.bankAccountName}</span>}
                        {txn.upiId && <span> · VPA: {txn.upiId}</span>}
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
    </div>
  );
};
