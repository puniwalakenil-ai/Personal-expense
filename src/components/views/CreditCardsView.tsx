import React from 'react';
import { CreditCard as CardIcon, Plus, ArrowRight } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const CreditCardsView: React.FC = () => {
  const {
    creditCardsWithOutstanding,
    totalCreditCardOutstanding,
    navigateTo,
  } = useFinancial();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-br from-purple-950 via-slate-900 to-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
            Total Credit Card Outstanding
          </div>
          <div className="mt-1 text-3xl font-extrabold font-mono tracking-tight text-white">
            {formatCurrency(totalCreditCardOutstanding)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Across {creditCardsWithOutstanding.length} active credit card{creditCardsWithOutstanding.length === 1 ? '' : 's'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateTo({ name: 'credit-card-form' })}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-purple-600" />
          <span>Add Credit Card</span>
        </button>
      </div>


      {/* Credit Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Your Cards</h2>
            <p className="text-[11px] text-slate-500">
              Click any card to see transactions, billing cycle & payment history
            </p>
          </div>
        </div>

        {creditCardsWithOutstanding.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200/80 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
              <CardIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">No credit cards added</h3>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
              Add your credit cards to track billing dates, payment due dates, and outstanding balances.
            </p>
            <button
              type="button"
              onClick={() => navigateTo({ name: 'credit-card-form' })}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              + Add First Credit Card
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creditCardsWithOutstanding.map((card) => {
              const availableLimit = Math.max(0, (card.creditLimit || 0) - card.outstandingAmount);
              return (
                <div
                  key={card.id}
                  onClick={() =>
                    navigateTo({
                      name: 'credit-card-detail',
                      cardId: card.id,
                      returnTo: { name: 'section', section: 'Credit Cards' },
                    })
                  }
                  className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
                          <CardIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {card.cardName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            •••• {card.cardIdentifier.slice(-4)}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          card.outstandingAmount > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {card.outstandingAmount > 0 ? 'Dues Pending' : 'Paid in Full'}
                      </span>
                    </div>

                    <div className="mt-5">
                      <div className="text-[11px] text-slate-400 font-medium">Outstanding Dues</div>
                      <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                        {formatCurrency(card.outstandingAmount)}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400">Statement Gen:</span>{' '}
                        <span className="font-semibold text-slate-700">
                          {card.billingStatementDate ? formatDate(card.billingStatementDate) : `${card.billingDate}th of month`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Payment Due:</span>{' '}
                        <span className="font-semibold text-purple-700">
                          {card.paymentDueDate ? formatDate(card.paymentDueDate) : 'Not set'}
                        </span>
                      </div>
                      {card.creditLimit > 0 && (
                        <div className="col-span-2">
                          <span className="text-slate-400">Available Limit:</span>{' '}
                          <span className="font-semibold font-mono text-slate-700">
                            {formatCurrency(availableLimit)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateTo({
                            name: 'credit-card-entry-form',
                            cardId: card.id,
                            returnTo: { name: 'section', section: 'Credit Cards' },
                          });
                        }}
                        className="text-xs font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                      >
                        + Add Entry
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateTo({
                            name: 'credit-card-payment-form',
                            cardId: card.id,
                            returnTo: { name: 'section', section: 'Credit Cards' },
                          });
                        }}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                      >
                        Pay Bill
                      </button>
                    </div>
                    <span className="text-slate-400 group-hover:text-purple-600 font-medium inline-flex items-center gap-1">
                      <span>Passbook</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
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
