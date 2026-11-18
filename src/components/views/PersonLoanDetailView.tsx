import React, { useState, useMemo } from 'react';
import {
  User,
  ArrowLeft,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  CheckCircle2,
  HandCoins,
  Calendar,
  Landmark,
  Banknote,
  SlidersHorizontal,
} from 'lucide-react';
import { useFinancial, getLoanDirection } from '../../context/FinancialContext';
import { LoanEntry, PageView, Transaction, PaymentMethod } from '../../types';
import { formatCurrency, formatDate, getDueStatus } from '../../utils/formatters';
import { ExportPdfLedgerModal } from '../common/ExportPdfLedgerModal';

interface Props {
  personName: string;
  returnTo?: PageView;
}

export const PersonLoanDetailView: React.FC<Props> = ({ personName, returnTo }) => {
  const { loans, transactions, navigateTo, goBack } = useFinancial();
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Loan & Advance' | 'Unsecured Loan'>('ALL');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const normTarget = personName.trim().toLowerCase();

  const personLoans = useMemo(() => {
    return loans
      .filter((l) => l.personName.trim().toLowerCase() === normTarget)
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [loans, normTarget]);

  const canonicalName = personLoans[0]?.personName || personName;

  const filteredLoans = useMemo(() => {
    if (categoryFilter === 'ALL') return personLoans;
    return personLoans.filter((l) => {
      const catLabel = l.categoryName || l.loanType;
      if (categoryFilter === 'Loan & Advance') {
        return catLabel === 'Loan & Advance' || l.loanType === 'Loan & Advance' || l.loanType === 'Money Given';
      }
      return catLabel === 'Unsecured Loan' || l.loanType === 'Unsecured Loan' || l.loanType === 'Money Taken' || l.loanType === 'Secured Loan';
    });
  }, [personLoans, categoryFilter]);

  const summary = useMemo(() => {
    let receivableOriginal = 0;
    let receivableSettled = 0;
    let receivablePending = 0;
    let payableOriginal = 0;
    let payableSettled = 0;
    let payablePending = 0;

    filteredLoans.forEach((loan) => {
      const dir = getLoanDirection(loan);
      const orig = Number(loan.originalAmount) || 0;
      const settled = Number(loan.settledAmount) || 0;
      const pending = Math.max(0, orig - settled);

      if (dir === 'Receivable') {
        receivableOriginal += orig;
        receivableSettled += settled;
        receivablePending += pending;
      } else {
        payableOriginal += orig;
        payableSettled += settled;
        payablePending += pending;
      }
    });

    return {
      receivableOriginal,
      receivableSettled,
      receivablePending,
      payableOriginal,
      payableSettled,
      payablePending,
      netBalance: receivablePending - payablePending,
    };
  }, [filteredLoans]);

  // Build chronological ledger items combining loans + repayments (plus matching settlement transactions)
  const personLedgerTransactions: Transaction[] = useMemo(() => {
    const items: Transaction[] = [];
    const seenRepTxnIds = new Set<string>();

    filteredLoans.forEach((loan) => {
      const dir = getLoanDirection(loan);
      const isReceivable = dir === 'Receivable';
      const catLabel = loan.categoryName || loan.loanType;

      items.push({
        id: `loan_init_${loan.id}`,
        date: loan.date,
        type: isReceivable ? 'Loan Given' : 'Loan Taken',
        loanDirection: dir,
        title: loan.reason ? `${loan.reason}` : `${loan.entryKind || (isReceivable ? 'Money Given' : 'Money Owed')}`,
        narration: loan.notes || `Category: ${catLabel}`,
        categoryName: catLabel,
        amount: loan.originalAmount,
        paymentMethod: (loan.paymentMethod as PaymentMethod) || 'Adjustment',
        personName: canonicalName,
        isAdjustment: loan.paymentMethod === 'Adjustment' || loan.entryKind === 'Money Owed',
        createdAt: loan.createdAt,
      });

      (loan.repayments || []).forEach((rep) => {
        if (rep.linkedTransactionId && seenRepTxnIds.has(rep.linkedTransactionId)) {
          // If one settlement transaction was split across multiple loans FIFO, sum or show individual allocation clearly
        }
        if (rep.linkedTransactionId) seenRepTxnIds.add(rep.linkedTransactionId);

        items.push({
          id: rep.id,
          date: rep.date,
          type: 'Loan Repayment',
          loanDirection: dir,
          title: isReceivable
            ? `Money Received (${loan.reason || catLabel})`
            : `Repayment Paid (${loan.reason || catLabel})`,
          narration: rep.notes || `Via ${rep.paymentMethod}${rep.bankAccountName ? ` (${rep.bankAccountName})` : ''}`,
          categoryName: catLabel,
          amount: rep.amount,
          paymentMethod: (rep.paymentMethod as PaymentMethod) || 'Cash',
          bankAccountId: rep.bankAccountId,
          bankAccountName: rep.bankAccountName,
          personName: canonicalName,
          createdAt: rep.date,
        });
      });
    });

    return items.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [filteredLoans, canonicalName]);

  // Also collect recent direct Cash/Bank settlement transactions for this person
  const settlementHistory = useMemo(() => {
    const allReps: {
      id: string;
      loanId: string;
      date: string;
      amount: number;
      paymentMethod: PaymentMethod;
      bankAccountName?: string;
      direction: 'Receivable' | 'Payable';
      reason?: string;
      categoryName?: string;
      notes?: string;
    }[] = [];

    filteredLoans.forEach((loan) => {
      const dir = getLoanDirection(loan);
      (loan.repayments || []).forEach((rep) => {
        allReps.push({
          id: rep.id,
          loanId: loan.id,
          date: rep.date,
          amount: rep.amount,
          paymentMethod: rep.paymentMethod,
          bankAccountName: rep.bankAccountName,
          direction: dir,
          reason: loan.reason,
          categoryName: loan.categoryName || loan.loanType,
          notes: rep.notes,
        });
      });
    });

    return allReps.sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredLoans]);

  const linkedTxnCount = useMemo(() => {
    return transactions.filter((t) => t.personName?.trim().toLowerCase() === normTarget).length;
  }, [transactions, normTarget]);

  const getMethodIcon = (method?: PaymentMethod) => {
    if (method === 'Bank Account' || method === 'UPI') return <Landmark className="w-3 h-3" />;
    if (method === 'Adjustment') return <SlidersHorizontal className="w-3 h-3" />;
    return <Banknote className="w-3 h-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-13 h-13 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
              Person-Wise Loan & Advance Ledger
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white mt-0.5">{canonicalName}</h2>
            <p className="text-xs text-slate-400 mt-1">
              {personLoans.length} loan/advance record{personLoans.length === 1 ? '' : 's'} · {settlementHistory.length} settlement{settlementHistory.length === 1 ? '' : 's'} · {linkedTxnCount} cash/bank linked entries
            </p>
          </div>
        </div>

        <div className="text-left md:text-right">
          <div className="text-xs text-slate-400 font-medium">Net Standing</div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold font-mono mt-0.5 ${
              summary.netBalance > 0
                ? 'text-emerald-400'
                : summary.netBalance < 0
                ? 'text-rose-400'
                : 'text-slate-200'
            }`}
          >
            {summary.netBalance > 0 ? '+' : summary.netBalance < 0 ? '-' : ''}
            {formatCurrency(Math.abs(summary.netBalance))}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {summary.netBalance > 0
              ? `${canonicalName} owes you`
              : summary.netBalance < 0
              ? `You owe ${canonicalName}`
              : 'All accounts settled'}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Loans & Advances</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export PDF</span>
          </button>

          {summary.receivablePending > 0 && (
            <button
              type="button"
              onClick={() =>
                navigateTo({
                  name: 'loan-repay-form',
                  personName: canonicalName,
                  mode: 'receive',
                  returnTo: { name: 'person-loan-detail', personName: canonicalName, returnTo },
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Receive Money</span>
            </button>
          )}

          {summary.payablePending > 0 && (
            <button
              type="button"
              onClick={() =>
                navigateTo({
                  name: 'loan-repay-form',
                  personName: canonicalName,
                  mode: 'pay',
                  returnTo: { name: 'person-loan-detail', personName: canonicalName, returnTo },
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Pay Outstanding</span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              navigateTo({
                name: 'loan-form',
                defaultPersonName: canonicalName,
                defaultDirection: summary.payablePending > summary.receivablePending ? 'Payable' : 'Receivable',
                returnTo: { name: 'person-loan-detail', personName: canonicalName, returnTo },
              })
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
            Receivable Pending ({canonicalName} Owes You)
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900 mt-1">
            {formatCurrency(summary.receivablePending)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Given: {formatCurrency(summary.receivableOriginal)} · Received: {formatCurrency(summary.receivableSettled)}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
            Payable Pending (You Owe {canonicalName})
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900 mt-1">
            {formatCurrency(summary.payablePending)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Owed: {formatCurrency(summary.payableOriginal)} · Repaid: {formatCurrency(summary.payableSettled)}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
            Filter by Category
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(['ALL', 'Loan & Advance', 'Unsecured Loan'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Loan / Advance Entries */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Individual Loan & Advance Records ({filteredLoans.length})
          </h3>
        </div>

        {filteredLoans.length === 0 ? (
          <div className="py-12 text-center">
            <HandCoins className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No entries match this filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLoans.map((loan: LoanEntry) => {
              const dir = getLoanDirection(loan);
              const isReceivable = dir === 'Receivable';
              const pending = Math.max(0, loan.originalAmount - (loan.settledAmount || 0));
              const dueInfo = getDueStatus(loan.dueDate);
              const catLabel = loan.categoryName || loan.loanType;

              return (
                <div
                  key={loan.id}
                  onClick={() =>
                    navigateTo({
                      name: 'loan-detail',
                      loanId: loan.id,
                      returnTo: { name: 'person-loan-detail', personName: canonicalName, returnTo },
                    })
                  }
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 bg-slate-50/40 hover:bg-white transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isReceivable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isReceivable ? 'Receivable' : 'Payable'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                          {catLabel}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1.5">
                        {loan.reason || loan.entryKind || loan.loanType}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(loan.date)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          {getMethodIcon(loan.paymentMethod)}
                          {loan.paymentMethod || 'Cash'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                        loan.status === 'Settled'
                          ? 'bg-emerald-100 text-emerald-800'
                          : loan.status === 'Partially Settled'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {loan.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-white rounded-xl border border-slate-100 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400">Original</div>
                      <div className="font-mono font-bold text-xs text-slate-800">
                        {formatCurrency(loan.originalAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">{isReceivable ? 'Received' : 'Paid'}</div>
                      <div className="font-mono font-bold text-xs text-emerald-600">
                        {formatCurrency(loan.settledAmount || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Pending</div>
                      <div className="font-mono font-bold text-xs text-slate-900">
                        {formatCurrency(pending)}
                      </div>
                    </div>
                  </div>

                  {loan.dueDate && loan.status !== 'Settled' && (
                    <div className="text-[11px] flex items-center justify-between text-slate-500">
                      <span>Due: {formatDate(loan.dueDate)}</span>
                      <span className={dueInfo.isOverdue ? 'text-rose-600 font-semibold' : ''}>{dueInfo.text}</span>
                    </div>
                  )}

                  {loan.status === 'Settled' && (
                    <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Settled</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Combined Payment / Receipt History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-4">
          Payment & Receipt History ({settlementHistory.length})
        </h3>

        {settlementHistory.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            No repayments or receipts logged for {canonicalName} yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {settlementHistory.map((rep) => (
              <div key={rep.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>
                      {rep.direction === 'Receivable' ? 'Money Received from' : 'Repayment Paid to'} {canonicalName}
                    </span>
                    {rep.categoryName && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {rep.categoryName}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {formatDate(rep.date)} · {rep.paymentMethod}
                    {rep.bankAccountName ? ` (${rep.bankAccountName})` : ''}
                    {rep.reason ? ` · For: ${rep.reason}` : ''}
                    {rep.notes ? ` · ${rep.notes}` : ''}
                  </div>
                </div>

                <div
                  className={`text-xs font-extrabold font-mono shrink-0 ${
                    rep.direction === 'Receivable' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {rep.direction === 'Receivable' ? '+' : '-'}
                  {formatCurrency(rep.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Person PDF Ledger Modal */}
      <ExportPdfLedgerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title={`Person Ledger - ${canonicalName}`}
        subtitle={`Loan & Advance & Unsecured Loan Statement · Net: ${formatCurrency(summary.netBalance)}`}
        ledgerType="loan"
        accountInfo={{
          accountType: 'Person Ledger',
          identifier: canonicalName,
        }}
        transactions={personLedgerTransactions}
        baseOpeningBalance={0}
      />
    </div>
  );
};
