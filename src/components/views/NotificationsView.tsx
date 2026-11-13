import React from 'react';
import {
  Bell,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  CreditCard as CardIcon,
  Calendar,
  Clock,
  Landmark,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PageView } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getBillDueStatusText } from '../../utils/creditCardBilling';

interface Props {
  returnTo?: PageView;
}

export const NotificationsView: React.FC<Props> = ({ returnTo }) => {
  const {
    upcomingCreditCardBills,
    creditCardsWithOutstanding,
    navigateTo,
    goBack,
  } = useFinancial();

  const pendingCount = upcomingCreditCardBills.length;
  const totalPendingAmount = upcomingCreditCardBills.reduce(
    (sum, b) => sum + (Number(b.outstandingAmount) || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Banner */}
      <div className="p-6 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold uppercase tracking-wider border border-purple-500/30">
              <Bell className="w-3.5 h-3.5" />
              <span>Credit Card Notification Center</span>
            </span>
            {pendingCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-black animate-pulse">
                {pendingCount} Pending
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                All Settled
              </span>
            )}
          </div>

          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Pending Bill Alerts
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Live tracking for credit card bills. Fully paid bills automatically disappear from pending alerts. Partially paid and unpaid bills remain visible until completely settled.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="text-left sm:text-right bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 shrink-0">
            <div className="text-xs font-semibold text-slate-400">Total Pending Dues</div>
            <div className="mt-1 text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-400">
              {formatCurrency(totalPendingAmount)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Across {pendingCount} credit card {pendingCount === 1 ? 'account' : 'accounts'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation & Action Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (returnTo) {
              navigateTo(returnTo);
            } else {
              goBack();
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo({ name: 'section', section: 'Credit Cards' })}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer"
        >
          <CardIcon className="w-3.5 h-3.5" />
          <span>Manage All Cards</span>
        </button>
      </div>

      {/* Pending Bills Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Pending Credit Card Bills</span>
            <span className="text-xs font-normal text-slate-500">
              ({pendingCount} requiring payment)
            </span>
          </h2>
        </div>

        {pendingCount === 0 ? (
          <div className="p-10 sm:p-12 bg-white rounded-3xl border border-slate-200/80 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">All Credit Card Bills Are Settled!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              You currently have 0 unpaid or overdue bills. When monthly statements are generated or new expenses are recorded on your cards, pending alerts will automatically appear here.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigateTo({ name: 'section', section: 'Dashboard' })}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={() => navigateTo({ name: 'section', section: 'Credit Cards' })}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                View Credit Cards
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {upcomingCreditCardBills.map((bill) => {
              const dueInfo = getBillDueStatusText(
                bill.daysRemaining,
                bill.isOverdue,
                bill.status || 'Unpaid'
              );

              return (
                <div
                  key={bill.cardId}
                  className={`p-5 sm:p-6 bg-white rounded-3xl border shadow-xs transition-all flex flex-col justify-between gap-5 ${
                    bill.isOverdue
                      ? 'border-rose-300 ring-1 ring-rose-200/80'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                          bill.isOverdue
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        <CardIcon className="w-6 h-6" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-slate-900">
                            {bill.cardName}
                          </h3>
                          <span className="text-xs font-mono text-slate-400">
                            •••• {bill.cardIdentifier.slice(-4)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {bill.reminderText}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Bill Status Pill */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                          bill.status === 'Partially Paid'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {bill.status === 'Partially Paid' ? 'Partially Paid' : 'Unpaid'}
                      </span>

                      {/* Due Status Pill */}
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${dueInfo.colorClass}`}>
                        {dueInfo.text}
                      </span>
                    </div>
                  </div>

                  {/* Card Details & Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                        Statement Date
                      </span>
                      <strong className="font-semibold text-slate-700 mt-0.5 block">
                        {bill.statementDate || 'Configured Day'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                        Payment Due Date
                      </span>
                      <strong
                        className={`mt-0.5 block ${
                          bill.isOverdue ? 'text-rose-600 font-extrabold' : 'text-purple-700 font-bold'
                        }`}
                      >
                        {bill.paymentDueDate}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                        Total Spends
                      </span>
                      <strong className="font-mono text-slate-700 mt-0.5 block">
                        {formatCurrency(bill.totalBilledAmount || bill.outstandingAmount)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                        Outstanding Due
                      </span>
                      <strong className="font-mono text-sm text-slate-900 font-extrabold mt-0.5 block">
                        {formatCurrency(bill.outstandingAmount)}
                      </strong>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">
                      💡 Recording a payment will automatically reduce or clear this notification.
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigateTo({
                            name: 'credit-card-detail',
                            cardId: bill.cardId,
                            returnTo: { name: 'notifications' },
                          })
                        }
                        className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                      >
                        View Statement
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigateTo({
                            name: 'credit-card-payment-form',
                            cardId: bill.cardId,
                            returnTo: { name: 'notifications' },
                          })
                        }
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Pay Bill Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overview of All Cards */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              All Configured Credit Cards & Schedule
            </h3>
            <p className="text-[11px] text-slate-500">
              Recurring statement generation day & payment grace period
            </p>
          </div>
        </div>

        {creditCardsWithOutstanding.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No credit cards added yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {creditCardsWithOutstanding.map((c) => (
              <div
                key={c.id}
                onClick={() =>
                  navigateTo({
                    name: 'credit-card-detail',
                    cardId: c.id,
                    returnTo: { name: 'notifications' },
                  })
                }
                className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                    <CardIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {c.cardName} <span className="font-mono text-slate-400 font-normal">•••• {c.cardIdentifier.slice(-4)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Statement Day: <strong>{c.billingDate}th of month</strong></span>
                      <span>·</span>
                      <span>Grace Period: <strong>{c.dueDays || 20} days</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-slate-900">
                      {formatCurrency(c.outstandingAmount)}
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                        c.outstandingAmount > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {c.outstandingAmount > 0 ? 'Dues Pending' : 'Paid in Full'}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
