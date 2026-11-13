import React, { useState, useMemo } from 'react';
import {
  Eye,
  EyeOff,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  AlertCircle,
  TrendingDown,
  ShoppingBag,
  Briefcase,
  Utensils,
  Car,
  Home,
  Gift,
  HelpCircle,
  CreditCard,
  Landmark,
  Banknote,
  QrCode,
  Calendar,
  ChevronRight,
  ChevronDown,
  HandCoins,
  Filter,
  CalendarRange,
  Clock,
  History,
  Layers,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, formatDate, normalizeCategoryName, maskAccountNumber } from '../../utils/formatters';
import {
  DashboardDateFilterMode,
  resolveDateRange,
  computeFilteredDashboardSummary,
} from '../../utils/dashboardDateFilter';
import { DashboardDateFilterModal } from '../common/DashboardDateFilterModal';
import { ThreeDFinancialChart } from '../common/ThreeDFinancialChart';

export const DashboardView: React.FC = () => {
  const {
    navigateTo,
    totalExpenses: lifetimeExpenses,
    totalMoneyReceived: lifetimeMoneyReceived,
    totalMoneyPaid,
    currentCashBalance,
    totalBankBalances,
    totalCreditCardOutstanding,
    totalLoansGivenPending,
    totalLoansTakenPending,
    upcomingCreditCardBills,
    categoryExpenseTotals: lifetimeCategoryTotals,
    transactions,
    categories,
    bankAccounts,
    bankAccountsWithBalances,
  } = useFinancial();

  // Hide / Show Balance Toggle (like eye icon in the user's image)
  const [showBalance, setShowBalance] = useState(true);

  // Dashboard Date Filter: Today (default), This Month, Last Month, Date-wise, All
  const [dateFilterMode, setDateFilterMode] = useState<DashboardDateFilterMode>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);

  // Tab filter on transactions stream: All, Income, Expense, Loans (like phone in image)
  const [activeTab, setActiveTab] = useState<'All' | 'Income' | 'Expense' | 'Loans'>('All');

  // Net Liquid Lifetime Balance = Total Bank + Current Cash - Credit Card Outstanding
  const netTotalBalance = totalBankBalances + currentCashBalance - totalCreditCardOutstanding;

  // Resolved date range for the active filter
  const dateRange = useMemo(() => {
    return resolveDateRange(dateFilterMode, customStartDate, customEndDate);
  }, [dateFilterMode, customStartDate, customEndDate]);

  // Dynamically compute filtered totals, category expenses, and transactions for the selected timeframe
  const summary = useMemo(() => {
    return computeFilteredDashboardSummary(transactions, dateRange);
  }, [transactions, dateRange]);

  // 3D Chart Data dynamically reflecting the filtered timeframe
  const [chartTimeframe, setChartTimeframe] = useState<'month' | 'all'>('all');
  const chartData = useMemo(() => {
    let income = 0;
    let expense = 0;
    let paidOut = 0;

    summary.filteredTransactions.forEach((t) => {
      if (t.type === 'Money Received' || t.type === 'Loan Taken') {
        income += t.amount;
      } else if (t.type === 'Expense') {
        expense += t.amount;
      } else if (
        t.type === 'Money Paid' ||
        t.type === 'Credit Card Payment' ||
        t.type === 'Loan Given'
      ) {
        paidOut += t.amount;
      }
    });

    return {
      income,
      expense,
      paidOut,
      bankBal: totalBankBalances,
    };
  }, [summary.filteredTransactions, totalBankBalances]);

  // Requirement 1: On Home/Dashboard page, display each category only once using unique ID
  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((cat) => {
      const norm = normalizeCategoryName(cat.name);
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  }, [categories]);

  // Filter transactions based on tab and active date filter
  const filteredTxns = useMemo(() => {
    switch (activeTab) {
      case 'Income':
        return summary.filteredTransactions.filter((t) => t.type === 'Money Received' || t.type === 'Loan Taken');
      case 'Expense':
        return summary.filteredTransactions.filter((t) => t.type === 'Expense' || t.type === 'Money Paid');
      case 'Loans':
        return summary.filteredTransactions.filter((t) => t.type === 'Loan Given' || t.type === 'Loan Taken');
      default:
        return summary.filteredTransactions;
    }
  }, [summary.filteredTransactions, activeTab]);

  // Group transactions by date (as in the screenshot: "Wed, 14 January" with day total)
  const groupedTransactions = useMemo(() => {
    const map = new Map<string, { date: string; items: typeof transactions; dayTotal: number }>();

    filteredTxns.forEach((txn) => {
      const existing = map.get(txn.date) || { date: txn.date, items: [], dayTotal: 0 };
      existing.items.push(txn);
      if (txn.type === 'Expense' || txn.type === 'Money Paid' || txn.type === 'Loan Given') {
        existing.dayTotal -= txn.amount;
      } else {
        existing.dayTotal += txn.amount;
      }
      map.set(txn.date, existing);
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredTxns]);

  // Quick category icons mapper
  const getCategoryIcon = (categoryName?: string) => {
    const name = (categoryName || '').toLowerCase();
    if (name.includes('salary') || name.includes('earn')) return { icon: Briefcase, bg: 'bg-emerald-50 text-emerald-600' };
    if (name.includes('food') || name.includes('din') || name.includes('cafe')) return { icon: Utensils, bg: 'bg-amber-50 text-amber-600' };
    if (name.includes('shop') || name.includes('cloth') || name.includes('mart')) return { icon: ShoppingBag, bg: 'bg-pink-50 text-pink-600' };
    if (name.includes('travel') || name.includes('fuel') || name.includes('petrol')) return { icon: Car, bg: 'bg-blue-50 text-blue-600' };
    if (name.includes('home') || name.includes('util') || name.includes('rent')) return { icon: Home, bg: 'bg-purple-50 text-purple-600' };
    if (name.includes('gift') || name.includes('reward') || name.includes('cashback')) return { icon: Gift, bg: 'bg-indigo-50 text-indigo-600' };
    return { icon: HelpCircle, bg: 'bg-slate-100 text-slate-600' };
  };

  // Color palette for Donut Chart
  const donutColors = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Hero Gradient Card + Desktop Liquidity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Main Gradient Card - Compact, balanced height on both PC and mobile */}
        <div className="lg:col-span-7 xl:col-span-7 relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-violet-600 via-purple-600 to-rose-500 text-white shadow-lg shadow-purple-500/15 flex flex-col justify-between">
          {/* Subtle background decorative circular accents */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-12 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between space-y-4">
            {/* Card Top Row: Title, Date Badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/85 tracking-wide">
                Total Net Balance
              </span>

              <button
                type="button"
                onClick={() => setIsDateFilterModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-full text-[11px] font-bold text-white cursor-pointer border border-white/30 transition-all shadow-xs"
                title="Change Date Filter (Today, This Month, Last Month, Date-wise, All)"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{dateRange.label}</span>
                <ChevronDown className="w-3 h-3 opacity-80" />
              </button>
            </div>

            {/* Balance with Eye Toggle & Period Net Summary */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="text-2xl sm:text-3xl lg:text-3xl xl:text-4xl font-extrabold font-mono tracking-tight text-white">
                  {showBalance ? formatCurrency(netTotalBalance) : '₹ ••••••••'}
                </div>
                <button
                  type="button"
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                  aria-label="Toggle balance visibility"
                >
                  {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              {/* Net Difference for this timeframe */}
              <div className="px-2.5 py-1 rounded-xl bg-white/15 border border-white/25 backdrop-blur-md text-[11px] text-white">
                <span className="text-white/70">{dateRange.label} Net:</span>{' '}
                <strong className="font-mono font-bold">
                  {summary.netDifference >= 0 ? '+' : ''}
                  {showBalance ? formatCurrency(summary.netDifference) : '₹ ••••'}
                </strong>
              </div>
            </div>

            {/* Bottom Dual Translucent Glass Capsules: Filtered Income & Filtered Expense */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Total Income Pill */}
              <div className="flex items-center gap-2.5 px-3 py-2 sm:py-2.5 bg-white/15 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20">
                <div className="w-7 h-7 rounded-full bg-emerald-400/25 border border-emerald-300/40 text-emerald-300 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-white/70 font-medium leading-none flex items-center gap-1">
                    <span>Income</span>
                    <span className="text-[9px] text-white/50 truncate">({dateRange.label})</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold font-mono text-white truncate mt-0.5">
                    {showBalance ? formatCurrency(summary.totalIncome) : '₹ ••••'}
                  </div>
                </div>
              </div>

              {/* Total Expense Pill */}
              <div className="flex items-center gap-2.5 px-3 py-2 sm:py-2.5 bg-white/15 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20">
                <div className="w-7 h-7 rounded-full bg-rose-400/25 border border-rose-300/40 text-rose-300 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-white/70 font-medium leading-none flex items-center gap-1">
                    <span>Expense</span>
                    <span className="text-[9px] text-white/50 truncate">({dateRange.label})</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold font-mono text-white truncate mt-0.5">
                    {showBalance ? formatCurrency(summary.totalExpenses) : '₹ ••••'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Quick Accounts Strip: Bank Accounts & Credit Cards (Requirement 1) */}
        <div className="lg:hidden grid grid-cols-2 gap-2.5">
          <div
            onClick={() => navigateTo({ name: 'section', section: 'Bank Accounts' })}
            className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs cursor-pointer flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Banks</span>
              <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                {showBalance ? formatCurrency(totalBankBalances) : '₹ ••••'}
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => navigateTo({ name: 'section', section: 'Credit Cards' })}
            className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs cursor-pointer flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cards Due</span>
              <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                {showBalance ? formatCurrency(totalCreditCardOutstanding) : '₹ ••••'}
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Windows / PC Liquidity Pulse Cards (5 columns on desktop, clean and compact) */}
        <div className="hidden lg:grid lg:col-span-5 xl:col-span-5 grid-cols-2 gap-3">
          {/* Bank Deposits */}
          <div
            onClick={() => navigateTo({ name: 'section', section: 'Bank Accounts' })}
            className="p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bank Balance</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Landmark className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-base xl:text-lg font-bold font-mono text-slate-900 group-hover:text-indigo-600 transition-colors">
                {showBalance ? formatCurrency(totalBankBalances) : '₹ ••••'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{bankAccounts.length} Connected Banks</p>
            </div>
          </div>

          {/* Cash In Hand */}
          <div
            onClick={() => navigateTo({ name: 'section', section: 'Cash' })}
            className="p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cash in Hand</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Banknote className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-base xl:text-lg font-bold font-mono text-slate-900 group-hover:text-emerald-600 transition-colors">
                {showBalance ? formatCurrency(currentCashBalance) : '₹ ••••'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Physical Wallet</p>
            </div>
          </div>

          {/* Credit Card Dues */}
          <div
            onClick={() => navigateTo({ name: 'section', section: 'Credit Cards' })}
            className="p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cards Due</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-base xl:text-lg font-bold font-mono text-slate-900 group-hover:text-amber-600 transition-colors">
                {showBalance ? formatCurrency(totalCreditCardOutstanding) : '₹ ••••'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Pending Payments</p>
            </div>
          </div>

          {/* Loans / Advances */}
          <div
            onClick={() => navigateTo({ name: 'section', section: 'Loans & Advances' })}
            className="p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Loans</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <HandCoins className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-base xl:text-lg font-bold font-mono text-slate-900 group-hover:text-purple-600 transition-colors">
                {showBalance ? formatCurrency(totalLoansGivenPending - totalLoansTakenPending) : '₹ ••••'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {totalLoansGivenPending >= totalLoansTakenPending ? 'Receivable' : 'Payable'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Timeframe Filter Bar (Today, This Month, Last Month, Date-wise, All) */}
      <div className="p-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-2 pr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-purple-600" />
            <span>Timeframe:</span>
          </span>

          <button
            type="button"
            onClick={() => setDateFilterMode('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilterMode === 'today'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => setDateFilterMode('this-month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilterMode === 'this-month'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            This Month
          </button>

          <button
            type="button"
            onClick={() => setDateFilterMode('last-month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilterMode === 'last-month'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Last Month
          </button>

          <button
            type="button"
            onClick={() => {
              setDateFilterMode('date-wise');
              setIsDateFilterModalOpen(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              dateFilterMode === 'date-wise'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>{dateFilterMode === 'date-wise' ? dateRange.label : 'Date-wise'}</span>
            <CalendarRange className="w-3.5 h-3.5 opacity-80" />
          </button>

          <button
            type="button"
            onClick={() => setDateFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilterMode === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Records
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsDateFilterModalOpen(true)}
          className="text-xs font-semibold text-purple-600 hover:text-purple-700 px-3 py-1.5 rounded-xl hover:bg-purple-50 transition-colors shrink-0 cursor-pointer hidden sm:block"
        >
          Custom Date Filter
        </button>
      </div>

      {/* Clean Quick Categories Scroll Strip (Clean and uncluttered, only categories) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Quick Categories
          </span>
          <button
            type="button"
            onClick={() => navigateTo({ name: 'section', section: 'Categories' })}
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 cursor-pointer"
          >
            View All ({uniqueCategories.length})
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto lg:grid lg:grid-cols-9 lg:overflow-visible pb-2 scrollbar-none">
          {/* Add Category Quick Pill */}
          <button
            type="button"
            onClick={() => navigateTo({ name: 'category-form' })}
            className="flex flex-col items-center justify-center min-w-[76px] lg:min-w-0 p-3 bg-white hover:bg-purple-50/50 rounded-2xl border border-dashed border-purple-300 text-purple-600 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold mt-2 truncate w-full text-center">Add New</span>
          </button>

          {/* User Categories Tiles (Requirement 1: Each category displayed only once by unique ID) */}
          {uniqueCategories.slice(0, 8).map((cat) => {
            const iconConfig = getCategoryIcon(cat.name);
            const Icon = iconConfig.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  navigateTo({
                    name: 'category-detail',
                    categoryId: cat.id,
                    returnTo: { name: 'section', section: 'Dashboard' },
                  })
                }
                className="flex flex-col items-center justify-center min-w-[76px] lg:min-w-0 p-3 bg-white hover:border-purple-300 rounded-2xl border border-slate-200/80 text-slate-800 transition-all cursor-pointer shadow-xs shrink-0 group"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${iconConfig.bg}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold mt-2 truncate max-w-[70px] lg:max-w-full text-center">
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Smart & Powerful Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Insight Card 1: 3D Isometric Financial Chart */}
        <ThreeDFinancialChart
          income={chartData.income}
          expense={chartData.expense}
          paidOut={chartData.paidOut}
          bankBal={chartData.bankBal}
          timeframe={chartTimeframe}
          setTimeframe={setChartTimeframe}
        />

        {/* Insight Card 2: Overview Donut Chart / Category Breakdown dynamically filtered */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Overview</span>
                <span>·</span>
                <span className="text-purple-600 font-bold">{dateRange.label}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">Category Expenses</h3>
            </div>
            <button
              type="button"
              onClick={() => navigateTo({ name: 'section', section: 'Expenses' })}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 cursor-pointer"
            >
              See Breakdown
            </button>
          </div>

          {summary.categoryExpenses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center text-slate-400 mb-2">
                <TrendingDown className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No expenses logged for {dateRange.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Switch timeframe or record new expenses to see the category ring visualization.
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2 flex-1">
              {/* SVG Donut Ring */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    className="text-slate-100"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  {/* Dynamic Slices */}
                  {(() => {
                    let cumulative = 0;
                    return summary.categoryExpenses.slice(0, 5).map((cat, idx) => {
                      const percent = summary.totalExpenses > 0 ? (cat.total / summary.totalExpenses) * 100 : 0;
                      const circumference = 2 * Math.PI * 38; // ~238.76
                      const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((cumulative / 100) * circumference);
                      cumulative += percent;
                      return (
                        <circle
                          key={cat.categoryId}
                          cx="50"
                          cy="50"
                          r="38"
                          stroke={donutColors[idx % donutColors.length]}
                          strokeWidth="12"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          fill="transparent"
                          className="transition-all duration-700"
                        />
                      );
                    });
                  })()}
                </svg>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-slate-400 font-medium">Expense</span>
                  <span className="text-xs font-extrabold font-mono text-slate-900">
                    {formatCurrency(summary.totalExpenses)}
                  </span>
                </div>
              </div>

              {/* Legend with percent dots - Clicking a category opens its full summary page */}
              <div className="space-y-1.5 text-xs flex-1 max-w-[190px]">
                {summary.categoryExpenses.slice(0, 5).map((cat, idx) => {
                  const percent = summary.totalExpenses > 0 ? Math.round((cat.total / summary.totalExpenses) * 100) : 0;
                  return (
                    <button
                      key={cat.categoryId}
                      type="button"
                      onClick={() =>
                        navigateTo({
                          name: 'category-detail',
                          categoryId: cat.categoryId,
                          returnTo: { name: 'section', section: 'Dashboard' },
                        })
                      }
                      title={`View all ${cat.categoryName} transactions`}
                      className="w-full flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-purple-50/70 transition-colors text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: donutColors[idx % donutColors.length] }}
                        />
                        <span className="text-slate-700 group-hover:text-purple-700 font-medium truncate">
                          {cat.categoryName}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-purple-700 text-[11px]">
                          {formatCurrency(cat.total)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {percent}%
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
            <span>Expenses Distribution ({dateRange.label})</span>
            <span className="font-semibold text-purple-600 font-mono">
              {summary.categoryExpenses.length} Active Categories
            </span>
          </div>
        </div>
      </div>

      {/* Tabbed Transactions Stream (dynamically filtered by selected timeframe) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        {/* Stream Header & Segmented Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Transactions</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                {dateRange.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Showing {filteredTxns.length} entries for {dateRange.label} ({dateRange.subLabel})
            </p>
          </div>

          {/* Segmented Tab Controls: Income, Expense, Loans, All */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl text-xs font-semibold">
            {(['All', 'Income', 'Expense', 'Loans'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white text-purple-700 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Grouped Date Stream */}
        {groupedTransactions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">
              No transactions for {dateRange.label}
            </h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1">
              No records match the current filter. Switch timeframe or record a new transaction to populate your vault.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDateFilterMode('all')}
                className="px-3.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
              >
                View All Records
              </button>
              <button
                type="button"
                onClick={() => navigateTo({ name: 'section', section: 'Bank Accounts' })}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Select Bank to Add Entry</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedTransactions.map((group) => (
              <div key={group.date} className="space-y-2">
                {/* Date Header with Day Total (as seen in screenshot: "Wed, 14 January  $3500") */}
                <div className="flex items-center justify-between text-xs px-2 text-slate-500 border-b border-slate-100 pb-1 font-medium">
                  <span>{formatDate(group.date)}</span>
                  <span className="font-mono font-semibold text-slate-700">
                    Day Total: {formatCurrency(group.dayTotal)}
                  </span>
                </div>

                {/* Items in this date */}
                <div className="divide-y divide-slate-100">
                  {group.items.map((txn) => {
                    const isOutflow =
                      txn.type === 'Expense' ||
                      txn.type === 'Money Paid' ||
                      txn.type === 'Loan Given' ||
                      txn.type === 'Credit Card Payment';
                    const iconConfig = getCategoryIcon(txn.categoryName || txn.title);
                    const Icon = iconConfig.icon;

                    return (
                      <div
                        key={txn.id}
                        onClick={() =>
                          navigateTo({
                            name: 'entry-detail',
                            entryId: txn.id,
                            returnTo: { name: 'section', section: 'Dashboard' },
                          })
                        }
                        className="py-3 px-2 flex items-center justify-between gap-4 hover:bg-purple-50/40 rounded-2xl transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Colorful Rounded Icon (matching screenshot style) */}
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                              isOutflow
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {txn.title}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
                              <span className="text-slate-600 font-medium">
                                {txn.categoryName || txn.type}
                              </span>
                              <span>·</span>
                              <span>{txn.paymentMethod}</span>
                              {txn.bankAccountName && (
                                <span className="hidden sm:inline">
                                  <span>·</span> {txn.bankAccountName}
                                </span>
                              )}
                              {txn.personName && (
                                <>
                                  <span>·</span>
                                  <span className="text-purple-600 font-medium truncate">
                                    {txn.personName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Middle metadata column on PC / Windows screen */}
                        <div className="hidden lg:flex items-center gap-4 text-xs shrink-0 max-w-sm text-slate-500">
                          {txn.narration && (
                            <span className="truncate italic text-slate-600 max-w-[200px]" title={txn.narration}>
                              "{txn.narration}"
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium shrink-0">
                            {txn.paymentMethod}
                          </span>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <div
                            className={`text-xs sm:text-base font-bold font-mono ${
                              isOutflow ? 'text-slate-900' : 'text-emerald-600'
                            }`}
                          >
                            {isOutflow ? '-' : '+'}
                            {formatCurrency(txn.amount)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {txn.type}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date Filter Selection Modal */}
      <DashboardDateFilterModal
        isOpen={isDateFilterModalOpen}
        onClose={() => setIsDateFilterModalOpen(false)}
        currentMode={dateFilterMode}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onSelectFilter={(mode, start, end) => {
          setDateFilterMode(mode);
          if (start !== undefined) setCustomStartDate(start);
          if (end !== undefined) setCustomEndDate(end);
        }}
      />
    </div>
  );
};
