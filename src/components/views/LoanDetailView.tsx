import React, { useState, useMemo } from 'react';
import { HandCoins, ArrowLeft, Edit2, Trash2, Plus, Calendar, CheckCircle2, FileText } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PageView, Transaction } from '../../types';
import { formatCurrency, formatDate, getDueStatus } from '../../utils/formatters';
import { ExportPdfLedgerModal } from '../common/ExportPdfLedgerModal';

interface Props {
  loanId: string;
  returnTo?: PageView;
}

export const LoanDetailView: React.FC<Props> = ({ loanId, returnTo }) => {
  const { loans, deleteLoan, requestDelete, navigateTo, goBack } = useFinancial();
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const loan = loans.find((l) => l.id === loanId);

  if (!loan) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-white rounded-2xl border border-slate-200 text-center">
        <HandCoins className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-900">Loan Record Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">This record may have been removed.</p>
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

  const isMoneyGiven = loan.loanType === 'Money Given' || loan.loanType === 'Loan & Advance';
  const pending = Math.max(0, loan.originalAmount - (loan.settledAmount || 0));
  const dueInfo = getDueStatus(loan.dueDate);

  const loanTransactions: Transaction[] = useMemo(() => {
    if (!loan) return [];
    const list: Transaction[] = [
      {
        id: `loan_init_${loan.id}`,
        title: `${loan.loanType}: ${loan.personName}`,
        amount: loan.originalAmount,
        type: isMoneyGiven ? 'Money Paid' : 'Money Received',
        date: loan.date,
        categoryName: 'Loans & Advances',
        paymentMethod: (loan.paymentMethod as any) || 'Bank Account',
        personName: loan.personName,
        notes: loan.notes || 'Initial principal amount',
        createdAt: loan.createdAt || new Date().toISOString(),
      },
      ...(loan.repayments || []).map((rep) => ({
        id: rep.id,
        title: `Repayment - ${loan.personName}`,
        amount: rep.amount,
        type: isMoneyGiven ? 'Money Received' : 'Money Paid',
        date: rep.date,
        categoryName: 'Loan Repayment',
        paymentMethod: (rep.paymentMethod as any) || 'Bank Account',
        personName: loan.personName,
        notes: rep.notes,
        createdAt: rep.date,
      })),
    ];
    return list;
  }, [loan, isMoneyGiven]);

  const handleDelete = () => {
    requestDelete(
      'Loan Record',
      loan.id,
      `${loan.personName} (${formatCurrency(loan.originalAmount)})`,
      () => {
        deleteLoan(loan.id);
        if (returnTo) {
          navigateTo(returnTo);
        } else {
          navigateTo({ name: 'section', section: 'Loans & Advances' });
        }
      }
    );
  };

  const handleEdit = () => {
    navigateTo({
      name: 'loan-form',
      editId: loan.id,
      returnTo: { name: 'loan-detail', loanId: loan.id, returnTo },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-block text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
            {loan.loanType} · {loan.status}
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">{loan.personName}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Disbursed on: {formatDate(loan.date)}
            {loan.dueDate ? ` · Due: ${formatDate(loan.dueDate)}` : ''}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-xs text-slate-400 font-medium">Pending Balance</div>
          <div
            className={`text-3xl font-extrabold font-mono mt-1 ${
              isMoneyGiven ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(pending)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Original: {formatCurrency(loan.originalAmount)} · Settled:{' '}
            {formatCurrency(loan.settledAmount || 0)}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-xs"
            title="Export loan statement as PDF"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export PDF</span>
          </button>

          {loan.status !== 'Settled' && (
            <button
              type="button"
              onClick={() =>
                navigateTo({
                  name: 'loan-repay-form',
                  loanId: loan.id,
                  returnTo: { name: 'loan-detail', loanId: loan.id, returnTo },
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Repayment</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer shadow-rose-600/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Notes & Terms */}
      {loan.notes && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-slate-900">Notes & Agreement</div>
          <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{loan.notes}</p>
        </div>
      )}

      {/* Repayments History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-4">
          Repayment & Settlement History
        </h3>

        {!loan.repayments || loan.repayments.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-xs font-semibold text-slate-700">No repayments recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-1">
              When payment is made or received, click "Record Repayment" above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {loan.repayments.map((rep) => (
              <div key={rep.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Payment via {rep.paymentMethod}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {formatDate(rep.date)} {rep.notes ? `· ${rep.notes}` : ''}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold font-mono text-emerald-600">
                    +{formatCurrency(rep.amount)}
                  </div>
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
        title={`Loan Statement - ${loan.personName}`}
        subtitle={`${loan.loanType} · Current Status: ${loan.status}`}
        ledgerType="loan"
        accountInfo={{
          accountType: loan.loanType,
          identifier: loan.personName,
        }}
        transactions={loanTransactions}
        baseOpeningBalance={0}
      />
    </div>
  );
};
