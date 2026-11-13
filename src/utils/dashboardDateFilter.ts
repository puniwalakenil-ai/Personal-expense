import { Transaction } from '../types';
import { formatDate } from './formatters';

export type DashboardDateFilterMode = 'today' | 'this-month' | 'last-month' | 'date-wise' | 'all';

export interface DashboardDateRange {
  mode: DashboardDateFilterMode;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  label: string;
  subLabel: string;
}

/**
 * Format local Date as YYYY-MM-DD string without UTC shift issues
 */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Resolves exact start and end dates and human-friendly labels for any filter mode.
 */
export function resolveDateRange(
  mode: DashboardDateFilterMode,
  customStartDate?: string,
  customEndDate?: string,
  referenceDate: Date = new Date()
): DashboardDateRange {
  const ref = new Date(referenceDate);
  const curYear = ref.getFullYear();
  const curMonth = ref.getMonth(); // 0-indexed
  const todayStr = formatLocalDate(ref);

  switch (mode) {
    case 'today': {
      return {
        mode: 'today',
        startDate: todayStr,
        endDate: todayStr,
        label: 'Today',
        subLabel: formatDate(todayStr),
      };
    }

    case 'this-month': {
      const monthStart = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(curYear, curMonth + 1, 0).getDate();
      const monthEnd = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const monthName = ref.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      return {
        mode: 'this-month',
        startDate: monthStart,
        endDate: monthEnd,
        label: 'This Month',
        subLabel: monthName,
      };
    }

    case 'last-month': {
      // Handles year boundary and leap year February automatically
      const prevDate = new Date(curYear, curMonth - 1, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth();
      const prevLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();

      const lastMonthStart = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
      const lastMonthEnd = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;
      const prevMonthName = prevDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      return {
        mode: 'last-month',
        startDate: lastMonthStart,
        endDate: lastMonthEnd,
        label: 'Last Month',
        subLabel: prevMonthName,
      };
    }

    case 'date-wise': {
      const start = customStartDate || todayStr;
      const end = customEndDate || start;
      const isSingleDay = start === end;

      return {
        mode: 'date-wise',
        startDate: start <= end ? start : end,
        endDate: start <= end ? end : start,
        label: isSingleDay ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`,
        subLabel: isSingleDay ? 'Selected Day' : 'Date Range',
      };
    }

    case 'all':
    default: {
      return {
        mode: 'all',
        startDate: undefined,
        endDate: undefined,
        label: 'All Time',
        subLabel: 'All Records',
      };
    }
  }
}

/**
 * Checks whether a transaction date falls within the resolved filter range.
 */
export function isTransactionInDateRange(
  txnDate: string,
  startDate?: string,
  endDate?: string
): boolean {
  if (!txnDate) return false;
  // If no date boundary, it's 'all'
  if (!startDate && !endDate) return true;

  if (startDate && endDate) {
    return txnDate >= startDate && txnDate <= endDate;
  }
  if (startDate) {
    return txnDate >= startDate;
  }
  if (endDate) {
    return txnDate <= endDate;
  }
  return true;
}

export interface FilteredSummaryResult {
  totalIncome: number;
  totalExpenses: number;
  netDifference: number; // Income - Expense for this timeframe
  totalMoneyPaid: number;
  totalLoansGiven: number;
  totalLoansTaken: number;
  categoryExpenses: {
    categoryId: string;
    categoryName: string;
    total: number;
    count: number;
  }[];
  filteredTransactions: Transaction[];
}

/**
 * Calculates accurate income, expenses, and category breakdown for a set of transactions.
 * STRICTLY avoids double counting:
 * - Credit Card Payment is debt transfer / settlement, NOT a new expense.
 * - Bank Transfer is internal movement, NOT a new expense or income.
 */
export function computeFilteredDashboardSummary(
  allTransactions: Transaction[],
  range: DashboardDateRange
): FilteredSummaryResult {
  // 1. Filter out deleted transactions and check date range
  const filtered = allTransactions.filter((t) => {
    if (t.isDeleted) return false;
    return isTransactionInDateRange(t.date, range.startDate, range.endDate);
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalMoneyPaid = 0;
  let totalLoansGiven = 0;
  let totalLoansTaken = 0;

  const categoryMap = new Map<string, { categoryId: string; categoryName: string; total: number; count: number }>();

  filtered.forEach((t) => {
    const amt = Number(t.amount) || 0;

    if (t.type === 'Money Received') {
      totalIncome += amt;
    } else if (t.type === 'Loan Taken') {
      // Loan taken brings money in
      totalIncome += amt;
      totalLoansTaken += amt;
    } else if (t.type === 'Expense') {
      totalExpenses += amt;

      // Group into category
      const catId = t.categoryId || 'uncategorized';
      const catName = t.categoryName || 'Uncategorized';
      const cur = categoryMap.get(catId) || { categoryId: catId, categoryName: catName, total: 0, count: 0 };
      cur.total += amt;
      cur.count += 1;
      categoryMap.set(catId, cur);
    } else if (t.type === 'Money Paid') {
      // Money Paid is an outflow
      totalExpenses += amt;
      totalMoneyPaid += amt;

      const catId = t.categoryId || 'money_paid';
      const catName = t.categoryName || 'Money Paid';
      const cur = categoryMap.get(catId) || { categoryId: catId, categoryName: catName, total: 0, count: 0 };
      cur.total += amt;
      cur.count += 1;
      categoryMap.set(catId, cur);
    } else if (t.type === 'Loan Given') {
      totalLoansGiven += amt;
    }
    // Note: Credit Card Payment and Bank Transfer are intentionally NOT counted as expenses or income
    // to avoid double counting.
  });

  const categoryExpenses = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
  const netDifference = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netDifference,
    totalMoneyPaid,
    totalLoansGiven,
    totalLoansTaken,
    categoryExpenses,
    filteredTransactions: filtered,
  };
}
