import { CreditCard, Transaction, CreditCardStatementHistory, CreditCardBillStatus } from '../types';
import { formatDate, formatCurrency } from './formatters';

/**
 * Returns the last day of the given month (handles 28, 29, 30, 31 days and leap years).
 * monthZeroIndexed: 0 = January, 1 = February, ..., 11 = December.
 */
export function getLastDayOfMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

/**
 * Resolves the actual statement generation day for a given month and year.
 * If the configured billing day does not exist in this month (e.g., 31st chosen, in Feb or Apr),
 * automatically uses that month's last valid day (28/29/30).
 */
export function getActualStatementDay(year: number, monthZeroIndexed: number, configuredDay: number): number {
  const maxDay = getLastDayOfMonth(year, monthZeroIndexed);
  const day = Math.max(1, Math.min(configuredDay || 15, 31));
  return Math.min(day, maxDay);
}

export function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Calculates the exact statement date and due date for a specific year and month cycle.
 * Due Date is automatically calculated as statementDate + dueDays.
 * Handles month roll-over (e.g., statement Jan 25 + 20 days -> Feb 14) and year roll-over seamlessly.
 */
export function calculateCycleDates(
  year: number,
  monthZeroIndexed: number,
  billingDay: number,
  dueDays: number = 20
): { statementDate: string; dueDate: string; cycleStartDate: string } {
  const actualDay = getActualStatementDay(year, monthZeroIndexed, billingDay);
  const stmtDate = new Date(year, monthZeroIndexed, actualDay, 0, 0, 0, 0);

  // Due date = statementDate + dueDays
  const dueDateObj = new Date(stmtDate.getTime());
  dueDateObj.setDate(dueDateObj.getDate() + Math.max(1, dueDays || 20));

  // Cycle start date is the day after the previous month's statement date
  const prevMonthDate = new Date(year, monthZeroIndexed - 1, 1);
  const prevMonthActualDay = getActualStatementDay(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), billingDay);
  const prevStmtDate = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), prevMonthActualDay, 0, 0, 0, 0);
  const cycleStartObj = new Date(prevStmtDate.getTime());
  cycleStartObj.setDate(cycleStartObj.getDate() + 1);

  return {
    statementDate: formatYMD(stmtDate),
    dueDate: formatYMD(dueDateObj),
    cycleStartDate: formatYMD(cycleStartObj),
  };
}

/**
 * Returns current and upcoming billing dates based on today's reference date.
 */
export function getCurrentAndUpcomingBillingDates(
  billingDay: number,
  dueDays: number = 20,
  referenceDate: Date = new Date()
): {
  currentStatementDate: string;
  currentDueDate: string;
  nextStatementDate: string;
  nextDueDate: string;
  cycleStartDate: string;
} {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  const curYear = ref.getFullYear();
  const curMonth = ref.getMonth();
  const todayDay = ref.getDate();

  const thisMonthActualDay = getActualStatementDay(curYear, curMonth, billingDay);

  let activeYear = curYear;
  let activeMonth = curMonth;

  let nextYear = curYear;
  let nextMonth = curMonth;

  if (todayDay >= thisMonthActualDay) {
    // Current month's statement was generated on or before today
    activeYear = curYear;
    activeMonth = curMonth;

    const nextM = new Date(curYear, curMonth + 1, 1);
    nextYear = nextM.getFullYear();
    nextMonth = nextM.getMonth();
  } else {
    // Current month's statement has not generated yet; most recent statement was last month
    const prevM = new Date(curYear, curMonth - 1, 1);
    activeYear = prevM.getFullYear();
    activeMonth = prevM.getMonth();

    nextYear = curYear;
    nextMonth = curMonth;
  }

  const activeCycle = calculateCycleDates(activeYear, activeMonth, billingDay, dueDays);
  const nextCycle = calculateCycleDates(nextYear, nextMonth, billingDay, dueDays);

  return {
    currentStatementDate: activeCycle.statementDate,
    currentDueDate: activeCycle.dueDate,
    nextStatementDate: nextCycle.statementDate,
    nextDueDate: nextCycle.dueDate,
    cycleStartDate: activeCycle.cycleStartDate,
  };
}

/**
 * Computes chronological monthly billing statement history for a credit card.
 * NEVER creates duplicate expense records! Derives all statements mathematically
 * from the card's transaction history and configured billing parameters.
 */
export function computeCardStatementHistory(
  card: CreditCard,
  allCardTransactions: Transaction[],
  monthsBack: number = 6
): CreditCardStatementHistory[] {
  const billingDay = card.billingDate || 15;
  const dueDays = card.dueDays || 20;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const statements: CreditCardStatementHistory[] = [];

  // Active transactions for this card
  const cardTxns = allCardTransactions.filter(
    (t) => t.creditCardId === card.id && !t.isDeleted
  );

  // Determine starting point: from current month going back `monthsBack` months
  for (let i = 0; i <= monthsBack; i++) {
    const cycleRef = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = cycleRef.getFullYear();
    const m = cycleRef.getMonth();

    const { statementDate, dueDate, cycleStartDate } = calculateCycleDates(y, m, billingDay, dueDays);

    // Filter spends (debits) in this cycle window
    const cycleDebits = cardTxns
      .filter(
        (t) =>
          (t.type === 'Expense' || t.type === 'Money Paid') &&
          t.date >= cycleStartDate &&
          t.date <= statementDate
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Filter payments (credits) made in this cycle window up to due date
    const cycleCredits = cardTxns
      .filter(
        (t) =>
          (t.type === 'Credit Card Payment' || t.type === 'Money Received') &&
          t.date >= cycleStartDate &&
          t.date <= dueDate
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // For the most recent cycle, also compare against card.outstandingAmount
    let billed = cycleDebits;
    let paid = cycleCredits;
    let outstanding = Math.max(0, billed - paid);

    if (i === 0 && card.outstandingAmount !== undefined) {
      // Current active cycle reflects real-time card outstanding
      outstanding = card.outstandingAmount;
      if (billed === 0 && card.outstandingAmount > 0) {
        billed = card.outstandingAmount;
      }
      paid = Math.max(0, billed - outstanding);
    }

    // Determine status
    let status: CreditCardBillStatus = 'Unpaid';
    if (outstanding <= 0) {
      status = 'Paid';
    } else if (paid > 0 && outstanding < billed) {
      status = 'Partially Paid';
    } else {
      status = 'Unpaid';
    }

    const dueObj = parseYMD(dueDate);
    const diffTime = dueObj.getTime() - today.getTime();
    const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const isOverdue = status !== 'Paid' && daysRemaining < 0;

    // Only include statement if it has activity or is the latest/current statement
    if (billed > 0 || paid > 0 || i === 0) {
      statements.push({
        id: `stmt_${card.id}_${statementDate}`,
        cardId: card.id,
        cardName: card.cardName,
        statementDate,
        dueDate,
        cycleStartDate,
        totalBilledAmount: billed,
        amountPaid: paid,
        outstandingAmount: outstanding,
        status,
        isOverdue,
        daysRemaining,
      });
    }
  }

  // Sort latest statement date first
  return statements.sort((a, b) => b.statementDate.localeCompare(a.statementDate));
}

/**
 * Returns human-readable due status text
 */
export function getBillDueStatusText(daysRemaining: number, isOverdue: boolean, status: CreditCardBillStatus): { text: string; colorClass: string } {
  if (status === 'Paid') {
    return { text: 'Paid in Full', colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  }

  if (isOverdue) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      text: `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'}`,
      colorClass: 'text-rose-700 bg-rose-50 border-rose-200',
    };
  }

  if (daysRemaining === 0) {
    return { text: 'Due Today', colorClass: 'text-amber-800 bg-amber-50 border-amber-200 font-bold' };
  }

  if (daysRemaining === 1) {
    return { text: 'Due Tomorrow', colorClass: 'text-amber-700 bg-amber-50 border-amber-200' };
  }

  return {
    text: `Due in ${daysRemaining} days`,
    colorClass: 'text-purple-700 bg-purple-50 border-purple-200',
  };
}
