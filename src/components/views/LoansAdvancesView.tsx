import React, { useState, useMemo } from 'react';
import { HandCoins, Plus, ArrowRight, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, FileText } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, formatDate, getDueStatus } from '../../utils/formatters';
import { LoanType, Transaction, PaymentMethod } from '../../types';
import { ExportPdfLedgerModal } from '../common/ExportPdfLedgerModal';

export const LoansAdvancesView: React.FC = () => {
  const {
    loans,
    totalLoansGivenPending,
    totalLoansTakenPending,
    navigateTo,
  } = useFinancial();

  const [activeTab, setActiveTab] = useState<'given' | 'taken'>('given');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Loans Given (Who owes me money)
  const loansGiven = loans.filter(
    (l) => l.loanType === 'Money Given' || l.loanType === 'Loan & Advance'
  );

  // Loans Taken (Whom I owe money to)
  const loansTaken = loans.filter(
    (l) => l.loanType === 'Money Taken' || l.loanType === 'Secured Loan' || l.loanType === 'Unsecured Loan'
  );

  const currentList = activeTab === 'given' ? loansGiven : loansTaken;

  const activeTabTxns: Transaction[] = useMemo(() => {
    const result: Transaction[] = [];
    currentList.forEach((loan) => {
      const isMoneyGiven = loan.loanType === 'Money Given' || loan.loanType === 'Loan & Advance';
      result.push({
        id: `loan_init_${loan.id}`,
        title: `${loan.personName} (${loan.loanType})`,
        amount: loan.originalAmount,
        type: isMoneyGiven ? 'Money Paid' : 'Money Received',
        date: loan.date,
        categoryName: 'Loans & Advances',
        personName: loan.personName,
        paymentMethod: (loan.paymentMethod as PaymentMethod) || 'Bank Account',
        notes: loan.notes || `Due: ${loan.dueDate || 'N/A'} - Status: ${loan.status}`,
        createdAt: loan.createdAt || new Date().toISOString(),
      });
      (loan.repayments || []).forEach((rep) => {
        result.push({
          id: rep.id,
          title: `Repayment: ${loan.personName}`,
          amount: rep.amount,
          type: isMoneyGiven ? 'Money Received' : 'Money Paid',
          date: rep.date,
          categoryName: 'Loan Repayment',
          personName: loan.personName,
          paymentMethod: (rep.paymentMethod as PaymentMethod) || 'Bank Account',
          notes: rep.notes,
          createdAt: rep.date,
        });
      });
    });
    return result;
  }, [currentList]);

  return (
    <div className="space-y-6">
      {/* 2 Big Stat Cards for Dual Visibility: Who owes me vs Whom I owe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Who Owes Me */}
        <div
          onClick={() => setActiveTab('given')}
          className={`p-6 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'given'
              ? 'bg-emerald-950 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500/50'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                activeTab === 'given' ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              Who Owes Me (Money Given)
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                activeTab === 'given' ? 'bg-emerald-800/80 text-emerald-200' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight">
            {formatCurrency(totalLoansGivenPending)}
          </div>
          <p
            className={`text-xs mt-1 ${
              activeTab === 'given' ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Pending to be received from {loansGiven.filter((l) => l.status !== 'Settled').length} borrower(s)
          </p>
        </div>

        {/* Whom I Owe */}
        <div
          onClick={() => setActiveTab('taken')}
          className={`p-6 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'taken'
              ? 'bg-rose-950 text-white border-rose-900 shadow-md ring-2 ring-rose-500/50'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                activeTab === 'taken' ? 'text-rose-400' : 'text-slate-500'
              }`}
            >
              Whom I Owe (Money Taken)
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                activeTab === 'taken' ? 'bg-rose-800/80 text-rose-200' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight">
            {formatCurrency(totalLoansTakenPending)}
          </div>
          <p
            className={`text-xs mt-1 ${
              activeTab === 'taken' ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Pending to be paid back to {loansTaken.filter((l) => l.status !== 'Settled').length} lender(s)
          </p>
        </div>
      </div>

      {/* Main Container with Tab Switcher & "+ New Loan" */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          {/* Segmented Tab */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('given')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'given'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Who Owes Me ({loansGiven.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('taken')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'taken'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Whom I Owe ({loansTaken.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer shadow-xs"
              title="Export loans statement as PDF"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={() =>
                navigateTo({
                  name: 'loan-form',
                  defaultType: activeTab === 'given' ? 'Money Given' : 'Money Taken',
                  returnTo: { name: 'section', section: 'Loans & Advances' },
                })
              }
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {activeTab === 'given' ? 'Record Money Given' : 'Record Money Taken'}
              </span>
            </button>
          </div>
        </div>

        {/* Current Tab List */}
        {currentList.length === 0 ? (
          <div className="py-16 text-center">
            <HandCoins className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-xs font-bold text-slate-800">
              No {activeTab === 'given' ? 'money given records' : 'money taken records'} yet
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              {activeTab === 'given'
                ? 'Keep track of friendly loans, advances given to friends or relatives, and who owes you.'
                : 'Keep track of borrowed money, personal loans, and who you need to repay.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentList.map((loan) => {
              const pending = Math.max(0, loan.originalAmount - (loan.settledAmount || 0));
              const dueInfo = getDueStatus(loan.dueDate);

              return (
                <div
                  key={loan.id}
                  onClick={() =>
                    navigateTo({
                      name: 'loan-detail',
                      loanId: loan.id,
                      returnTo: { name: 'section', section: 'Loans & Advances' },
                    })
                  }
                  className="p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {loan.personName}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {loan.loanType} · {formatDate(loan.date)}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          loan.status === 'Settled'
                            ? 'bg-emerald-100 text-emerald-800'
                            : loan.status === 'Partially Settled'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {loan.status}
                      </span>
                    </div>

                    {/* Progress Bar & Amounts */}
                    <div className="mt-4 grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-center">
                      <div>
                        <div className="text-[10px] text-slate-400">Original</div>
                        <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                          {formatCurrency(loan.originalAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">
                          {activeTab === 'given' ? 'Received' : 'Repaid'}
                        </div>
                        <div className="font-mono font-bold text-xs text-emerald-600 mt-0.5">
                          {formatCurrency(loan.settledAmount || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Pending</div>
                        <div className="font-mono font-bold text-xs text-slate-900 mt-0.5">
                          {formatCurrency(pending)}
                        </div>
                      </div>
                    </div>

                    {loan.dueDate && (
                      <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Due Date: {formatDate(loan.dueDate)}</span>
                        <span className={dueInfo.isOverdue ? 'text-rose-600 font-semibold' : ''}>
                          {dueInfo.text}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {loan.status !== 'Settled' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateTo({
                            name: 'loan-repay-form',
                            loanId: loan.id,
                            returnTo: { name: 'section', section: 'Loans & Advances' },
                          });
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        + Record {activeTab === 'given' ? 'Payment Received' : 'Repayment'}
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Fully Settled</span>
                      </span>
                    )}

                    <span className="text-slate-400 group-hover:text-slate-600 font-medium inline-flex items-center gap-1">
                      <span>Statement</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PDF Ledger Export Modal */}
      <ExportPdfLedgerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title={activeTab === 'given' ? 'Loans Given Ledger (Who Owes Me)' : 'Loans Taken Ledger (Whom I Owe)'}
        subtitle={`${activeTab === 'given' ? 'All Friendly Advances & Money Given' : 'All Borrowings & Loans Taken'} · Total ${currentList.length} Accounts`}
        ledgerType="loan"
        transactions={activeTabTxns}
        baseOpeningBalance={0}
      />
    </div>
  );
};
