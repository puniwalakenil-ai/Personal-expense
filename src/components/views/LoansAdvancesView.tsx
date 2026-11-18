import React, { useState, useMemo } from 'react';
import {
  HandCoins,
  Plus,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  List,
  Search,
  User,
} from 'lucide-react';
import { useFinancial, getLoanDirection } from '../../context/FinancialContext';
import { formatCurrency, formatDate, getDueStatus } from '../../utils/formatters';
import { Transaction, PaymentMethod, LoanEntry } from '../../types';
import { ExportPdfLedgerModal } from '../common/ExportPdfLedgerModal';

interface PersonSummary {
  personName: string;
  receivableOriginal: number;
  receivableSettled: number;
  receivablePending: number;
  payableOriginal: number;
  payableSettled: number;
  payablePending: number;
  netBalance: number;
  categories: string[];
  recordCount: number;
  lastActivityDate: string;
}

export const LoansAdvancesView: React.FC = () => {
  const {
    loans,
    totalLoansGivenPending,
    totalLoansTakenPending,
    navigateTo,
  } = useFinancial();

  const [viewMode, setViewMode] = useState<'persons' | 'records'>('persons');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'given' | 'taken'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Loan & Advance' | 'Unsecured Loan'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const matchesCategoryFilter = (loan: LoanEntry) => {
    if (categoryFilter === 'ALL') return true;
    const catLabel = loan.categoryName || loan.loanType;
    if (categoryFilter === 'Loan & Advance') {
      return catLabel === 'Loan & Advance' || loan.loanType === 'Loan & Advance' || loan.loanType === 'Money Given';
    }
    return (
      catLabel === 'Unsecured Loan' ||
      loan.loanType === 'Unsecured Loan' ||
      loan.loanType === 'Money Taken' ||
      loan.loanType === 'Secured Loan'
    );
  };

  // Filtered individual loans
  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      const dir = getLoanDirection(l);
      if (directionFilter === 'given' && dir !== 'Receivable') return false;
      if (directionFilter === 'taken' && dir !== 'Payable') return false;
      if (!matchesCategoryFilter(l)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          l.personName.toLowerCase().includes(q) ||
          (l.reason && l.reason.toLowerCase().includes(q)) ||
          (l.categoryName && l.categoryName.toLowerCase().includes(q)) ||
          (l.notes && l.notes.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [loans, directionFilter, categoryFilter, searchQuery]);

  // Group loans person-wise
  const personSummaries: PersonSummary[] = useMemo(() => {
    const map = new Map<string, PersonSummary>();

    filteredLoans.forEach((loan) => {
      const key = loan.personName.trim().toLowerCase();
      const existing = map.get(key) || {
        personName: loan.personName.trim(),
        receivableOriginal: 0,
        receivableSettled: 0,
        receivablePending: 0,
        payableOriginal: 0,
        payableSettled: 0,
        payablePending: 0,
        netBalance: 0,
        categories: [],
        recordCount: 0,
        lastActivityDate: loan.date,
      };

      const dir = getLoanDirection(loan);
      const orig = Number(loan.originalAmount) || 0;
      const settled = Number(loan.settledAmount) || 0;
      const pending = Math.max(0, orig - settled);

      if (dir === 'Receivable') {
        existing.receivableOriginal += orig;
        existing.receivableSettled += settled;
        existing.receivablePending += pending;
      } else {
        existing.payableOriginal += orig;
        existing.payableSettled += settled;
        existing.payablePending += pending;
      }

      existing.netBalance = existing.receivablePending - existing.payablePending;
      existing.recordCount += 1;
      if (loan.date > existing.lastActivityDate) existing.lastActivityDate = loan.date;
      (loan.repayments || []).forEach((r) => {
        if (r.date > existing.lastActivityDate) existing.lastActivityDate = r.date;
      });

      const catLabel = loan.categoryName || loan.loanType;
      if (catLabel && !existing.categories.includes(catLabel)) {
        existing.categories.push(catLabel);
      }

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => {
      const aActive = Math.abs(a.receivablePending) + Math.abs(a.payablePending);
      const bActive = Math.abs(b.receivablePending) + Math.abs(b.payablePending);
      if (bActive !== aActive) return bActive - aActive;
      return b.lastActivityDate.localeCompare(a.lastActivityDate);
    });
  }, [filteredLoans]);

  const loansGivenCount = loans.filter((l) => getLoanDirection(l) === 'Receivable' && l.status !== 'Settled').length;
  const loansTakenCount = loans.filter((l) => getLoanDirection(l) === 'Payable' && l.status !== 'Settled').length;

  // Build transactions list for PDF export
  const exportTxns: Transaction[] = useMemo(() => {
    const result: Transaction[] = [];
    filteredLoans.forEach((loan) => {
      const dir = getLoanDirection(loan);
      const isReceivable = dir === 'Receivable';
      const catLabel = loan.categoryName || loan.loanType;
      result.push({
        id: `loan_init_${loan.id}`,
        title: `${loan.personName}${loan.reason ? ` - ${loan.reason}` : ''}`,
        amount: loan.originalAmount,
        type: isReceivable ? 'Loan Given' : 'Loan Taken',
        loanDirection: dir,
        date: loan.date,
        categoryName: catLabel,
        personName: loan.personName,
        paymentMethod: (loan.paymentMethod as PaymentMethod) || 'Adjustment',
        notes: loan.notes || `${loan.entryKind || loan.loanType} · Status: ${loan.status}`,
        createdAt: loan.createdAt || new Date().toISOString(),
      });
      (loan.repayments || []).forEach((rep) => {
        result.push({
          id: rep.id,
          title: `${isReceivable ? 'Received' : 'Repaid'}: ${loan.personName}`,
          amount: rep.amount,
          type: 'Loan Repayment',
          loanDirection: dir,
          date: rep.date,
          categoryName: catLabel,
          personName: loan.personName,
          paymentMethod: (rep.paymentMethod as PaymentMethod) || 'Cash',
          bankAccountName: rep.bankAccountName,
          notes: rep.notes,
          createdAt: rep.date,
        });
      });
    });
    return result;
  }, [filteredLoans]);

  return (
    <div className="space-y-6">
      {/* 2 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={() => setDirectionFilter(directionFilter === 'given' ? 'all' : 'given')}
          className={`p-6 rounded-2xl border transition-all cursor-pointer ${
            directionFilter === 'given'
              ? 'bg-emerald-950 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500/50'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                directionFilter === 'given' ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              Who Owes Me (Receivables)
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                directionFilter === 'given' ? 'bg-emerald-800/80 text-emerald-200' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight">
            {formatCurrency(totalLoansGivenPending)}
          </div>
          <p className={`text-xs mt-1 ${directionFilter === 'given' ? 'text-slate-300' : 'text-slate-500'}`}>
            {loansGivenCount} pending receivable record{loansGivenCount === 1 ? '' : 's'}
          </p>
        </div>

        <div
          onClick={() => setDirectionFilter(directionFilter === 'taken' ? 'all' : 'taken')}
          className={`p-6 rounded-2xl border transition-all cursor-pointer ${
            directionFilter === 'taken'
              ? 'bg-rose-950 text-white border-rose-900 shadow-md ring-2 ring-rose-500/50'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                directionFilter === 'taken' ? 'text-rose-400' : 'text-slate-500'
              }`}
            >
              Whom I Owe (Payables)
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                directionFilter === 'taken' ? 'bg-rose-800/80 text-rose-200' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight">
            {formatCurrency(totalLoansTakenPending)}
          </div>
          <p className={`text-xs mt-1 ${directionFilter === 'taken' ? 'text-slate-300' : 'text-slate-500'}`}>
            {loansTakenCount} pending payable record{loansTakenCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Main Ledger Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
        {/* Action Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* View Mode Toggle: Person-Wise vs All Records */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setViewMode('persons')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                  viewMode === 'persons' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Person-Wise ({personSummaries.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('records')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                  viewMode === 'records' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5 text-indigo-600" />
                <span>All Entries ({filteredLoans.length})</span>
              </button>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={() =>
                navigateTo({
                  name: 'loan-repay-form',
                  mode: 'receive',
                  returnTo: { name: 'section', section: 'Loans & Advances' },
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Receive Money</span>
            </button>

            <button
              type="button"
              onClick={() =>
                navigateTo({
                  name: 'loan-repay-form',
                  mode: 'pay',
                  returnTo: { name: 'section', section: 'Loans & Advances' },
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Pay Outstanding</span>
            </button>

            <button
              type="button"
              onClick={() =>
                navigateTo({
                  name: 'loan-form',
                  defaultDirection: directionFilter === 'taken' ? 'Payable' : 'Receivable',
                  returnTo: { name: 'section', section: 'Loans & Advances' },
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>
          </div>
        </div>

        {/* Search + Direction + Category Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search person, reason, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direction filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'given', label: 'Receivable' },
                  { id: 'taken', label: 'Payable' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDirectionFilter(t.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    directionFilter === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
              {(['ALL', 'Loan & Advance', 'Unsecured Loan'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    categoryFilter === c ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c === 'ALL' ? 'All Categories' : c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredLoans.length === 0 ? (
          <div className="py-16 text-center">
            <HandCoins className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-xs font-bold text-slate-800">No Loan & Advance Records Found</h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
              Track money given to someone, money owed (like shared bills a friend paid), or adjustment entries organized person-wise under Loan & Advance or Unsecured Loan.
            </p>
            <button
              type="button"
              onClick={() =>
                navigateTo({
                  name: 'loan-form',
                  returnTo: { name: 'section', section: 'Loans & Advances' },
                })
              }
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Entry</span>
            </button>
          </div>
        ) : viewMode === 'persons' ? (
          /* PERSON-WISE LEDGER CARDS */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personSummaries.map((person) => {
              const isNetReceivable = person.netBalance > 0;
              const isNetPayable = person.netBalance < 0;
              const isSettled = person.receivablePending === 0 && person.payablePending === 0;

              return (
                <div
                  key={person.personName}
                  onClick={() =>
                    navigateTo({
                      name: 'person-loan-detail',
                      personName: person.personName,
                      returnTo: { name: 'section', section: 'Loans & Advances' },
                    })
                  }
                  className="p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between bg-white"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                            {person.personName}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {person.recordCount} entr{person.recordCount === 1 ? 'y' : 'ies'} · Last:{' '}
                            {formatDate(person.lastActivityDate)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-extrabold font-mono ${
                            isNetReceivable
                              ? 'text-emerald-600'
                              : isNetPayable
                              ? 'text-rose-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {isNetReceivable ? '+' : isNetPayable ? '-' : ''}
                          {formatCurrency(Math.abs(person.netBalance))}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400">
                          {isSettled
                            ? 'Settled'
                            : isNetReceivable
                            ? 'Owes You'
                            : isNetPayable
                            ? 'You Owe'
                            : 'Balanced'}
                        </div>
                      </div>
                    </div>

                    {/* Category tags */}
                    {person.categories.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {person.categories.map((cat) => (
                          <span
                            key={cat}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Receivable & Payable Breakdown */}
                    <div className="mt-3 grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Receivable Pending</div>
                        <div className="font-mono font-bold text-emerald-700 mt-0.5">
                          {formatCurrency(person.receivablePending)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Payable Pending</div>
                        <div className="font-mono font-bold text-rose-700 mt-0.5">
                          {formatCurrency(person.payablePending)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Person Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {person.receivablePending > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateTo({
                              name: 'loan-repay-form',
                              personName: person.personName,
                              mode: 'receive',
                              returnTo: { name: 'section', section: 'Loans & Advances' },
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] cursor-pointer"
                        >
                          Receive
                        </button>
                      )}
                      {person.payablePending > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateTo({
                              name: 'loan-repay-form',
                              personName: person.personName,
                              mode: 'pay',
                              returnTo: { name: 'section', section: 'Loans & Advances' },
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px] cursor-pointer"
                        >
                          Pay Back
                        </button>
                      )}
                      {isSettled && (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settled</span>
                        </span>
                      )}
                    </div>

                    <span className="text-slate-400 group-hover:text-indigo-600 font-semibold inline-flex items-center gap-1 text-[11px]">
                      <span>Person Ledger</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ALL INDIVIDUAL RECORDS VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLoans.map((loan) => {
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
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${
                              isReceivable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {isReceivable ? 'Receivable' : 'Payable'}
                          </span>
                          <span>{catLabel}</span>
                          <span>·</span>
                          <span>{formatDate(loan.date)}</span>
                        </div>
                        {loan.reason && (
                          <div className="text-[11px] text-slate-600 mt-1 font-medium">{loan.reason}</div>
                        )}
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

                    <div className="mt-4 grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-center">
                      <div>
                        <div className="text-[10px] text-slate-400">Original</div>
                        <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                          {formatCurrency(loan.originalAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">
                          {isReceivable ? 'Received' : 'Repaid'}
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
                            personName: loan.personName,
                            mode: isReceivable ? 'receive' : 'pay',
                            returnTo: { name: 'section', section: 'Loans & Advances' },
                          });
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        + Record {isReceivable ? 'Money Received' : 'Repayment'}
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
        title={
          directionFilter === 'given'
            ? 'Loans & Advances Receivable Ledger'
            : directionFilter === 'taken'
            ? 'Loans & Advances Payable Ledger'
            : 'Master Loans & Advances Ledger'
        }
        subtitle={`${categoryFilter === 'ALL' ? 'Loan & Advance + Unsecured Loan' : categoryFilter} · ${personSummaries.length} Person(s) · ${filteredLoans.length} Record(s)`}
        ledgerType="loan"
        transactions={exportTxns}
        baseOpeningBalance={0}
      />
    </div>
  );
};
