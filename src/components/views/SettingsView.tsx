import React, { useRef } from 'react';
import { Settings, RefreshCw, Download, Upload, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';

export const SettingsView: React.FC = () => {
  const {
    loadDefaultCategories,
    resetAllData,
    requestDelete,
    showSuccessFeedback,
    categories,
    bankAccounts,
    creditCards,
    transactions,
    loans,
  } = useFinancial();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup Export
  const handleExportBackup = () => {
    try {
      const data = {
        app: 'Tech Expenses',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        categories,
        bankAccounts,
        creditCards,
        loans,
        transactions,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tech-expenses-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showSuccessFeedback('Successfully Exported', 'Backup file downloaded');
    } catch (e) {
      console.error(e);
    }
  };

  // Restore Import
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.categories && Array.isArray(parsed.categories)) {
          localStorage.setItem('tech_expenses_finance_v1_categories', JSON.stringify(parsed.categories));
        }
        if (parsed.bankAccounts && Array.isArray(parsed.bankAccounts)) {
          localStorage.setItem('tech_expenses_finance_v1_banks', JSON.stringify(parsed.bankAccounts));
        }
        if (parsed.creditCards && Array.isArray(parsed.creditCards)) {
          localStorage.setItem('tech_expenses_finance_v1_cards', JSON.stringify(parsed.creditCards));
        }
        if (parsed.loans && Array.isArray(parsed.loans)) {
          localStorage.setItem('tech_expenses_finance_v1_loans', JSON.stringify(parsed.loans));
        }
        if (parsed.transactions && Array.isArray(parsed.transactions)) {
          localStorage.setItem('tech_expenses_finance_v1_transactions', JSON.stringify(parsed.transactions));
        }

        showSuccessFeedback('Successfully Imported', 'Reloading vault...');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDataClick = () => {
    requestDelete(
      'All Personal Financial Data',
      'all_data',
      'All accounts, transactions, expenses, cards, loans and categories',
      () => {
        resetAllData();
      }
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Brand Profile Banner */}
      <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-400 p-0.5 shadow-md shrink-0">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-xl text-white">
            TE
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Tech Expenses</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Personal Finance & Money Management Vault
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
            <span>Clean Architecture</span>
            <span>·</span>
            <span>Strict Zero-Popup Navigation</span>
            <span>·</span>
            <span>Local Vault Storage</span>
          </div>
        </div>
      </div>

      {/* Starter Templates */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Quick Category Setup</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Populate standard personal finance categories with one click (Petrol, Food, Utilities, Shopping, D-Mart, Salary, etc.)
          </p>
        </div>

        <button
          type="button"
          onClick={loadDefaultCategories}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer border border-indigo-200/60"
        >
          <span>Load Recommended Categories</span>
        </button>
      </div>

      {/* Data Backup & Restore */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Data Backup & Sync</h3>
          <p className="text-xs text-slate-500 mt-1">
            Export a full JSON backup of your records or import onto another device.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Backup</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON Backup</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: Zero-Data Reset */}
      <div className="bg-rose-50/50 rounded-2xl border border-rose-200/80 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-rose-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Reset Vault to Clean Zero Data</span>
          </h3>
          <p className="text-xs text-rose-700/80 mt-1">
            Wipes all transactions, accounts, credit cards, loans, and categories. Confirmed via the Tech Expenses verification process.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDataClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer shadow-rose-600/20"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset All Data to Zero</span>
        </button>
      </div>
    </div>
  );
};
