import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { TechExpensesVideoLoader } from './TechExpensesLogo';

export const DeleteConfirmationModal: React.FC = () => {
  const { deleteModalState, confirmDelete, completeDelete, cancelDelete } = useFinancial();
  const [progress, setProgress] = useState(0);

  if (!deleteModalState.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs antialiased">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {deleteModalState.isDeleting ? (
          /* Loading state displaying complete Tech Expenses MP4 logo animation from beginning to end */
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4">
            <TechExpensesVideoLoader
              mode="play-once"
              size="lg"
              onProgress={(pct) => setProgress(pct)}
              onEnded={() => {
                setProgress(0);
                completeDelete();
              }}
            />

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Tech Expenses
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Securely removing record from your vault...
              </p>
            </div>

            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#021329] via-[#0d6efd] to-[#00b894] rounded-full transition-all duration-150 ease-out"
                style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
              />
            </div>
          </div>
        ) : (
          /* Clear warning/confirmation screen with Cancel and Delete buttons */
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Confirm Deletion
                  </h3>
                  <button
                    type="button"
                    onClick={cancelDelete}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete this{' '}
                  <span className="font-semibold text-slate-900">{deleteModalState.itemType}</span>:
                </p>

                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-900 truncate">
                  {deleteModalState.itemTitle || 'Selected Item'}
                </div>

                <p className="mt-2 text-[11px] text-slate-600">
                  This action cannot be undone. Related totals and account balances will be recalculated automatically.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors shadow-xs shadow-rose-600/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
