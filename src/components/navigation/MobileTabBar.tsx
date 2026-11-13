import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  TrendingDown,
  Wallet,
  Landmark,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';

export const MobileTabBar: React.FC = () => {
  const { activeSection, navigateTo } = useFinancial();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg pb-safe">
      {/* 
        5-Column Grid ensures Column 3 (Central Bank icon) is mathematically 100% centered 
        Requirement 2: Replace central "+" action icon with clean, recognizable Bank icon/logo.
        When user clicks Bank icon, open dedicated full page listing all existing bank accounts.
      */}
      <div className="grid grid-cols-5 items-center w-full max-w-lg mx-auto px-1 py-1.5 relative">
        {/* Col 1: Home / Dashboard */}
        <button
          type="button"
          onClick={() => navigateTo({ name: 'section', section: 'Dashboard' })}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl cursor-pointer transition-colors ${
            activeSection === 'Dashboard' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none">Home</span>
        </button>

        {/* Col 2: Entries */}
        <button
          type="button"
          onClick={() => navigateTo({ name: 'section', section: 'Entries' })}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl cursor-pointer transition-colors ${
            activeSection === 'Entries' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none">Entries</span>
        </button>

        {/* Col 3: Exact Center Floating Bank Icon/Logo (Requirement 2) */}
        <div className="flex items-center justify-center relative h-10">
          <button
            type="button"
            onClick={() => navigateTo({ name: 'section', section: 'Bank Accounts' })}
            className={`absolute -top-5 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer ring-4 ring-white ${
              activeSection === 'Bank Accounts'
                ? 'bg-slate-900 text-white shadow-slate-900/40 scale-105'
                : 'bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-indigo-600/40 hover:scale-105 active:scale-95'
            }`}
            aria-label="View Bank Accounts"
            title="Bank Accounts"
          >
            <Landmark className="w-6 h-6 stroke-[2.2]" />
          </button>
        </div>

        {/* Col 4: Expenses */}
        <button
          type="button"
          onClick={() => navigateTo({ name: 'section', section: 'Expenses' })}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl cursor-pointer transition-colors ${
            activeSection === 'Expenses' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none">Expenses</span>
        </button>

        {/* Col 5: Accounts / Cards */}
        <button
          type="button"
          onClick={() => navigateTo({ name: 'section', section: 'Credit Cards' })}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl cursor-pointer transition-colors ${
            activeSection === 'Credit Cards' || activeSection === 'Cash' || activeSection === 'Loans & Advances'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none">Cards</span>
        </button>
      </div>
    </nav>
  );
};
