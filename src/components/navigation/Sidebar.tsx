import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Banknote,
  QrCode,
  CreditCard,
  HandCoins,
  Tags,
  Trash2,
  Settings,
  X,
  LogOut,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { useAuth } from '../../context/AuthContext';
import { NavSection } from '../../types';
import { formatCompactCurrency } from '../../utils/formatters';

interface NavItemConfig {
  id: NavSection;
  label: string;
  icon: React.ElementType;
}

export const Sidebar: React.FC = () => {
  const {
    activeSection,
    navigateTo,
    isSidebarOpen,
    setIsSidebarOpen,
    totalExpenses,
    currentCashBalance,
    totalBankBalances,
    totalCreditCardOutstanding,
    deletedTransactions,
    deletedBankAccounts,
  } = useFinancial();
  const { currentUser, logout } = useAuth();

  const totalDeletedCount = deletedTransactions.length + deletedBankAccounts.length;

  // Main sections as required by Requirement 4
  const primaryNavItems: NavItemConfig[] = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Entries', label: 'Entries', icon: Receipt },
    { id: 'Expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'Money Received', label: 'Money Received', icon: ArrowDownLeft },
    { id: 'Money Paid', label: 'Money Paid', icon: ArrowUpRight },
  ];

  const accountsNavItems: NavItemConfig[] = [
    { id: 'Bank Accounts', label: 'Bank Accounts', icon: Landmark },
    { id: 'Cash', label: 'Cash', icon: Banknote },
    { id: 'UPI', label: 'UPI', icon: QrCode },
    { id: 'Credit Cards', label: 'Credit Cards', icon: CreditCard },
    { id: 'Loans & Advances', label: 'Loans & Advances', icon: HandCoins },
  ];

  const managementNavItems: NavItemConfig[] = [
    { id: 'Categories', label: 'Categories', icon: Tags },
    { id: 'Recycle Bin', label: 'Recycle Bin', icon: Trash2 },
    { id: 'Settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (section: NavSection) => {
    navigateTo({ name: 'section', section });
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="main-sidebar"
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800/80 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('Dashboard')}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            {/* Tech Expenses Unique Brand Icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-[1px] shadow-sm">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center text-white font-black text-sm tracking-tight">
                TE
              </div>
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-tight leading-none group-hover:text-indigo-300 transition-colors">
                Tech Expenses
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">Personal Finance</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Bank Accounts / Entry Action Button */}
        <div className="p-3 border-b border-slate-800/60 shrink-0">
          <button
            type="button"
            onClick={() => {
              navigateTo({ name: 'section', section: 'Bank Accounts' });
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 rounded-xl transition-all shadow-sm shadow-indigo-600/30 cursor-pointer"
          >
            <Landmark className="w-4 h-4 stroke-[2.2]" />
            <span>Bank Accounts & Entries</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-3 px-3 overflow-y-auto space-y-4">
          {/* Main Group */}
          <div className="space-y-0.5">
            <div className="px-3 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Transactions
            </div>
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Accounts & Wallets */}
          <div className="space-y-0.5">
            <div className="px-3 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Money & Accounts
            </div>
            {accountsNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Settings & Categories */}
          <div className="space-y-0.5">
            <div className="px-3 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Manage
            </div>
            {managementNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'Recycle Bin' && totalDeletedCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 rounded-md border border-rose-500/30">
                      {totalDeletedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Snapshot Card */}
        <div className="p-3 m-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span>Cash</span>
            <span className="font-mono font-medium text-slate-200">
              {formatCompactCurrency(currentCashBalance)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Bank Total</span>
            <span className="font-mono font-medium text-slate-200">
              {formatCompactCurrency(totalBankBalances)}
            </span>
          </div>
          {totalCreditCardOutstanding > 0 && (
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-amber-400">Card Due</span>
              <span className="font-mono font-medium text-amber-400">
                {formatCompactCurrency(totalCreditCardOutstanding)}
              </span>
            </div>
          )}
        </div>

        {/* Private Vault Owner Footer */}
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                PK
              </div>
              <div className="truncate">
                <p className="text-[11px] font-bold text-slate-200 truncate">
                  {currentUser?.email || 'puniwalakenil@gmail.com'}
                </p>
                <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Private Cloud Sync</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign Out of Private Vault"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
