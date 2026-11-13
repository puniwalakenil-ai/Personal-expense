import React, { useState, useEffect, useRef } from 'react';
import { Landmark, ArrowLeft, Check, AlertCircle, ShieldCheck, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { BankAccountType, PageView } from '../../types';
import { InlineDropdown } from '../common/InlineDropdown';

interface Props {
  editId?: string;
  returnTo?: PageView;
}

export const BankAccountFormView: React.FC<Props> = ({ editId, returnTo }) => {
  const { bankAccounts, transactions, addBankAccount, updateBankAccount, softDeleteBankAccount, navigateTo, goBack } = useFinancial();

  const existing = editId ? bankAccounts.find((b) => b.id === editId) : null;

  const [bankName, setBankName] = useState(existing?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(existing?.accountNumber || '');
  const [accountType, setAccountType] = useState<BankAccountType>(existing?.accountType || 'Savings');
  const [openingBalance, setOpeningBalance] = useState(existing ? String(existing.openingBalance) : '0');
  const [upiId, setUpiId] = useState(existing?.upiId || '');
  const [ifscCode, setIfscCode] = useState(existing?.ifscCode || '');
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Active transactions linked to this bank account
  const linkedTxnCount = editId
    ? transactions.filter((t) => t.bankAccountId === editId && !t.isDeleted).length
    : 0;

  // Requirement 5: Bank Creation Loading Animation State
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'saving' | 'complete' | 'error'>('saving');
  const [overlayError, setOverlayError] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStartCreationAnimation = (savedBankName: string) => {
    setIsOverlayOpen(true);
    setProgress(0);
    setStage('saving');
    setOverlayError('');

    // Smoothly progress from 0% to 100% over approx 5 seconds (5000ms)
    // 50ms interval * 100 steps = 5000ms
    const intervalTime = 50;
    const increment = 1;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          setStage('complete');
          // Automatically navigate after brief success confirmation
          setTimeout(() => {
            if (returnTo) {
              navigateTo(returnTo);
            } else {
              navigateTo({ name: 'section', section: 'Bank Accounts' });
            }
          }, 1200);
          return 100;
        }
        return next;
      });
    }, intervalTime);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!bankName.trim()) {
      setError('Please enter bank name (e.g. HDFC Bank, ICICI Bank, SBI).');
      return;
    }

    if (!accountNumber.trim()) {
      setError('Please enter account identifier or account number (e.g. 4092).');
      return;
    }

    const numOpening = parseFloat(openingBalance);
    if (isNaN(numOpening)) {
      setError('Please enter a valid numeric opening balance.');
      return;
    }

    try {
      if (editId && existing) {
        updateBankAccount(editId, {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountType,
          openingBalance: numOpening,
          upiId: upiId.trim(),
          ifscCode: ifscCode.trim(),
        });
      } else {
        // Requirement 4: Save bank securely first
        addBankAccount({
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountType,
          openingBalance: numOpening,
          upiId: upiId.trim(),
          ifscCode: ifscCode.trim(),
        });
      }

      // Requirement 5: Start centered visually prominent loading overlay
      handleStartCreationAnimation(bankName.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save bank account. Please try again.';
      setError(msg);
      setOverlayError(msg);
      setStage('error');
    }
  };

  const handleRetry = () => {
    setIsOverlayOpen(false);
    setProgress(0);
  };

  const getStepText = (pct: number) => {
    if (pct < 25) return 'Initializing secure bank vault...';
    if (pct < 55) return 'Creating passbook ledger & account identifier...';
    if (pct < 85) return 'Connecting category links & payment methods...';
    if (pct < 100) return 'Finalizing opening balance verification...';
    return 'Bank Successfully Created!';
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* 
        Requirement 5: Centered Visually Prominent Progress Overlay 
        - Exception to no-popup rule as explicitly specified
      */}
      {isOverlayOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center text-white relative overflow-hidden">
            {/* Top ambient glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Brand Header */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tech Expenses</span>
            </div>

            {/* Visual Icon / Animation */}
            <div className="my-4 flex items-center justify-center">
              {stage === 'error' ? (
                <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 animate-in zoom-in-95">
                  <AlertCircle className="w-10 h-10" />
                </div>
              ) : stage === 'complete' ? (
                <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-in zoom-in-95">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>
              ) : (
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <div className="w-14 h-14 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shadow-inner">
                    <Landmark className="w-7 h-7 animate-pulse" />
                  </div>
                </div>
              )}
            </div>

            {/* Headings */}
            <h3 className="text-xl font-bold tracking-tight text-white">
              {stage === 'error'
                ? 'Creation Failed'
                : stage === 'complete'
                ? 'Bank Successfully Created'
                : editId
                ? 'Updating Bank Account...'
                : 'Creating Bank Account...'}
            </h3>

            <p className="text-xs text-slate-400 mt-1.5 px-2">
              {stage === 'error'
                ? overlayError || 'An error occurred while saving the bank account.'
                : stage === 'complete'
                ? `"${bankName.trim()}" is now registered and ready for financial entries.`
                : getStepText(progress)}
            </p>

            {/* Progress Percentage & Bar */}
            {stage !== 'error' && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold px-1">
                  <span className="text-slate-400 font-mono text-[11px]">{bankName.trim()}</span>
                  <span className="text-indigo-400 font-mono font-bold text-sm">{Math.floor(progress)}%</span>
                </div>

                <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ease-out ${
                      stage === 'complete'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action buttons on Complete or Error */}
            {stage === 'error' && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {stage === 'complete' && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    if (returnTo) {
                      navigateTo(returnTo);
                    } else {
                      navigateTo({ name: 'section', section: 'Bank Accounts' });
                    }
                  }}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-lg shadow-emerald-600/30"
                >
                  Continue to Bank Accounts
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Bank Account Form Page */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {editId ? 'Edit Bank Account' : 'Create New Bank'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Register a personal bank account for accurate passbook tracking and entries
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Bank Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India, Axis"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 font-medium"
              required
              autoFocus={!editId}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Account Number / Identifier <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. •••• 4092 or 501002349081"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 font-mono"
                required
              />
            </div>

            <div>
              <InlineDropdown
                id="bank-account-type-select"
                label="Account Type"
                value={accountType}
                onChange={(val) => setAccountType(val as BankAccountType)}
                options={[
                  { value: 'Savings', label: 'Savings Account' },
                  { value: 'Salary', label: 'Salary Account' },
                  { value: 'Current', label: 'Current Account' },
                  { value: 'Fixed Deposit', label: 'Fixed Deposit / Investment' },
                ]}
                placeholder="Select account type..."
                searchable={false}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Opening Balance (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="text-xs font-bold text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Linked UPI Handle (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. name@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              IFSC Code (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. HDFC0001234"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 font-mono uppercase"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {editId && existing ? (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Recycle Bin</span>
              </button>
            ) : <div />}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs shadow-indigo-600/30 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editId ? 'Update Bank Account' : 'Save Bank Account'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Safe Bank Account Deletion Confirmation Modal */}
      {showDeleteModal && existing && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Move "{existing.bankName}" to Recycle Bin?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                This account will be archived and moved to the Recycle Bin. You can restore it anytime or delete it permanently later.
              </p>

              {linkedTxnCount > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-left text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Transaction Notice:</strong> This bank account currently contains{' '}
                    <strong>{linkedTxnCount}</strong> transactions in its passbook history.
                    Transactions will be preserved and accessible in the Recycle Bin.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  softDeleteBankAccount(existing.id);
                  setShowDeleteModal(false);
                  navigateTo({ name: 'section', section: 'Bank Accounts' });
                }}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm shadow-rose-600/30 cursor-pointer"
              >
                Move to Recycle Bin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
