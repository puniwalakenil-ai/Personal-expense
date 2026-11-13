import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  History,
  CalendarRange,
  Layers,
  X,
  Check,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { DashboardDateFilterMode, resolveDateRange, formatLocalDate } from '../../utils/dashboardDateFilter';
import { formatDate } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentMode: DashboardDateFilterMode;
  customStartDate?: string;
  customEndDate?: string;
  onSelectFilter: (mode: DashboardDateFilterMode, customStart?: string, customEnd?: string) => void;
}

export const DashboardDateFilterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentMode,
  customStartDate,
  customEndDate,
  onSelectFilter,
}) => {
  const todayStr = formatLocalDate(new Date());

  const [selectedMode, setSelectedMode] = useState<DashboardDateFilterMode>(currentMode);
  const [dateSubMode, setDateSubMode] = useState<'single' | 'range'>(
    customStartDate && customEndDate && customStartDate !== customEndDate ? 'range' : 'single'
  );
  const [singleDate, setSingleDate] = useState<string>(customStartDate || todayStr);
  const [rangeStart, setRangeStart] = useState<string>(customStartDate || todayStr);
  const [rangeEnd, setRangeEnd] = useState<string>(customEndDate || todayStr);

  if (!isOpen) return null;

  const handleApply = (modeToApply: DashboardDateFilterMode) => {
    if (modeToApply === 'date-wise') {
      if (dateSubMode === 'single') {
        onSelectFilter('date-wise', singleDate, singleDate);
      } else {
        const start = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
        const end = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
        onSelectFilter('date-wise', start, end);
      }
    } else {
      onSelectFilter(modeToApply);
    }
    onClose();
  };

  const todayInfo = resolveDateRange('today');
  const thisMonthInfo = resolveDateRange('this-month');
  const lastMonthInfo = resolveDateRange('last-month');
  const allInfo = resolveDateRange('all');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Dashboard Expense Summary Filter
              </h3>
              <p className="text-xs text-purple-200 mt-0.5">
                Select timeframe to calculate Income, Expenses, and Categories
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            aria-label="Close date filter"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Options List */}
        <div className="p-5 overflow-y-auto space-y-3">
          {/* Option A: TODAY */}
          <button
            type="button"
            onClick={() => handleApply('today')}
            className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
              currentMode === 'today'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-600/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  currentMode === 'today'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-600'
                }`}
              >
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Today</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                    {todayInfo.subLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Today's income, expenses, and category breakdown
                </p>
              </div>
            </div>

            {currentMode === 'today' && (
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
          </button>

          {/* Option D: THIS MONTH */}
          <button
            type="button"
            onClick={() => handleApply('this-month')}
            className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
              currentMode === 'this-month'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-600/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  currentMode === 'this-month'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">This Month</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                    {thisMonthInfo.subLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Current month from 1st day to today (auto-resets every new month)
                </p>
              </div>
            </div>

            {currentMode === 'this-month' && (
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
          </button>

          {/* Option E: LAST MONTH */}
          <button
            type="button"
            onClick={() => handleApply('last-month')}
            className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
              currentMode === 'last-month'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-600/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  currentMode === 'last-month'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Last Month</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    {lastMonthInfo.subLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Previous month's complete expenses, income & category totals
                </p>
              </div>
            </div>

            {currentMode === 'last-month' && (
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
          </button>

          {/* Option C: DATE-WISE (Specific Date or Range) */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              selectedMode === 'date-wise'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-600/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div
              onClick={() => setSelectedMode('date-wise')}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedMode === 'date-wise'
                      ? 'bg-purple-600 text-white'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">Date-wise</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      Custom Date / Range
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Filter by a specific day or custom date interval
                  </p>
                </div>
              </div>

              {selectedMode === 'date-wise' ? (
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </div>

            {/* Expanded Date Selector Controls */}
            {selectedMode === 'date-wise' && (
              <div className="mt-4 pt-4 border-t border-purple-200/60 space-y-3">
                {/* Single Day vs Date Range Toggle */}
                <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold w-fit">
                  <button
                    type="button"
                    onClick={() => setDateSubMode('single')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      dateSubMode === 'single'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Single Date
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateSubMode('range')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      dateSubMode === 'range'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Date Range
                  </button>
                </div>

                {dateSubMode === 'single' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Select Date:
                    </label>
                    <input
                      type="date"
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-purple-600 font-medium"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        From Date:
                      </label>
                      <input
                        type="date"
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-purple-600 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        To Date:
                      </label>
                      <input
                        type="date"
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-purple-600 font-medium"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleApply('date-wise')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <span>Apply Custom Dates</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option B: ALL */}
          <button
            type="button"
            onClick={() => handleApply('all')}
            className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
              currentMode === 'all'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-600/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  currentMode === 'all'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">All</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                    Lifetime
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Overall total income, total expenses, and full transaction history
                </p>
              </div>
            </div>

            {currentMode === 'all' && (
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
          </button>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Active filter calculates dashboard figures dynamically.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
