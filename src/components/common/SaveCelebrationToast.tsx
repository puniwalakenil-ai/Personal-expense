import React, { useEffect } from 'react';
import { Check, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency } from '../../utils/formatters';

export const SaveCelebrationToast: React.FC = () => {
  const { saveCelebration, dismissSaveCelebration } = useFinancial();

  const isVisible = !!(saveCelebration && saveCelebration.visible);
  const isCredit = saveCelebration?.direction === 'Money In';

  // Requirement 2: Automatically dismiss the success message after approximately 1–2 seconds (1.6s)
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      dismissSaveCelebration();
    }, 1600);

    return () => clearTimeout(timer);
  }, [isVisible, dismissSaveCelebration]);

  if (!isVisible || !saveCelebration) return null;

  return (
    /* 
      Requirement 2: Bank Entry Save & Close Workflow
      - Display a success message in the exact center of the screen with a checkmark icon and the text: "Entry Saved Successfully"
      - Do not show duplicate success messages at the top or bottom of the screen
      - Automatically dismiss the success message after approximately 1–2 seconds
      - Return to the selected bank's passbook page and display the newly saved entry immediately (rendered underneath)
      - Do not ask the user whether they want to close the form or create another entry
      - Do not automatically open a new entry form
      - User manually clicks the "+ Add New" button whenever they want to create another entry
    */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-[2px] animate-in fade-in duration-150"
      role="status"
      aria-live="polite"
      onClick={dismissSaveCelebration}
    >
      <div
        className="relative max-w-xs w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center overflow-hidden animate-in zoom-in-95 duration-200 space-y-3 cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Top Glow */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 bg-emerald-500/15 blur-2xl rounded-full pointer-events-none" />

        {/* Clean Centered Success Animation with Checkmark Icon */}
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-40" />
          <div className="relative w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-600 shadow-inner">
            <Check className="w-8 h-8 stroke-[3] animate-in zoom-in-75 duration-200" />
          </div>
        </div>

        {/* Success Message Header */}
        <div>
          <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
            Entry Saved Successfully
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {saveCelebration.bankName
              ? `Recorded in ${saveCelebration.bankName} passbook`
              : 'Passbook & balance updated'}
          </p>
        </div>

        {/* Amount Badge Confirmation */}
        {saveCelebration.amount !== undefined && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-50 border border-slate-200 mt-1">
            {isCredit ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+{formatCurrency(saveCelebration.amount)}</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md font-sans uppercase font-bold">
                  Credit
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-600">
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>-{formatCurrency(saveCelebration.amount)}</span>
                <span className="text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md font-sans uppercase font-bold">
                  Debit
                </span>
              </span>
            )}
          </div>
        )}

        {/* 1.6s Auto-Dismiss Progress Indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
          <div
            className="h-full bg-emerald-500"
            style={{
              animation: 'shrinkWidth 1.6s linear forwards',
            }}
          />
        </div>
      </div>
    </div>
  );
};
