import React from 'react';
import { Landmark, Plus, ArrowRight, ShieldCheck, QrCode } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, maskAccountNumber } from '../../utils/formatters';

export const BankAccountsView: React.FC = () => {
  const { bankAccountsWithBalances, totalBankBalances, navigateTo } = useFinancial();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            Total Net Bank Balances
          </div>
          <div className="mt-1 text-3xl font-extrabold font-mono tracking-tight text-white">
            {formatCurrency(totalBankBalances)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Across {bankAccountsWithBalances.length} personal bank account{bankAccountsWithBalances.length === 1 ? '' : 's'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateTo({ name: 'bank-account-form' })}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-indigo-600" />
          <span>Create New Bank</span>
        </button>
      </div>

      {/* Bank Accounts Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Your Bank Accounts</h2>
            <p className="text-[11px] text-slate-500">
              Click any account to view complete passbook statement & transactions
            </p>
          </div>
        </div>

        {bankAccountsWithBalances.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200/80 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Landmark className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No bank accounts linked yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Create your first bank account with an opening balance to begin tracking money flow.
            </p>
            <button
              type="button"
              onClick={() => navigateTo({ name: 'bank-account-form' })}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Bank</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccountsWithBalances.map((bank) => (
              <div
                key={bank.id}
                onClick={() =>
                  navigateTo({
                    name: 'bank-detail',
                    bankId: bank.id,
                    returnTo: { name: 'section', section: 'Bank Accounts' },
                  })
                }
                className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {bank.bankName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {maskAccountNumber(bank.accountNumber)}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {bank.accountType}
                    </span>
                  </div>

                  <div className="mt-5">
                    <div className="text-[11px] text-slate-400 font-medium">Available Balance</div>
                    <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                      {formatCurrency(bank.currentBalance)}
                    </div>
                  </div>

                  {bank.upiId && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                      <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-mono text-xs">{bank.upiId}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-semibold">
                  <span>View Statement</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
