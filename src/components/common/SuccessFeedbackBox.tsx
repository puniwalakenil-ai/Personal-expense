import React from 'react';
import { Check } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';

export const SuccessFeedbackBox: React.FC = () => {
  const { successFeedback } = useFinancial();

  if (!successFeedback || !successFeedback.visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
      {/* Polished rectangular confirmation box with checkmark/success animation */}
      <div className="flex items-center gap-3.5 px-4 py-3.5 bg-slate-900 text-white rounded-xl shadow-xl shadow-slate-950/20 border border-slate-800 min-w-[280px] max-w-md">
        {/* Animated Checkmark Circle */}
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 stroke-[2.5]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold tracking-tight text-white">
            {successFeedback.title}
          </div>
          {successFeedback.subtitle && (
            <div className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
              {successFeedback.subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
