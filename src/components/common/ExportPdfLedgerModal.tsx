import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Share2,
  Calendar,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { Transaction } from '../../types';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';
import {
  generateLedgerPdf,
  downloadLedgerPdf,
  shareLedgerPdf,
  LedgerPdfOptions,
  LedgerEntryItem,
} from '../../utils/pdfLedgerGenerator';

export type DateFilterPreset = 'all' | 'this_month' | 'last_month' | 'last_30_days' | 'this_year' | 'custom';

export interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  ledgerType: 'bank' | 'credit-card' | 'category' | 'cash' | 'loan' | 'general' | 'expense' | 'income';
  accountInfo?: {
    accountNumber?: string;
    accountType?: string;
    identifier?: string;
    ifscCode?: string;
    limit?: number;
  };
  transactions: Transaction[];
  baseOpeningBalance?: number;
}

export const ExportPdfLedgerModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  ledgerType,
  accountInfo,
  transactions,
  baseOpeningBalance = 0,
}) => {
  const [preset, setPreset] = useState<DateFilterPreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compute preset dates
  const handlePresetChange = (selected: DateFilterPreset) => {
    setPreset(selected);
    const today = new Date();
    const todayStr = getTodayDateString();

    if (selected === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (selected === 'this_month') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      setStartDate(`${year}-${month}-01`);
      setEndDate(todayStr);
    } else if (selected === 'last_month') {
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const year = lastMonthDate.getFullYear();
      const month = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, lastMonthDate.getMonth() + 1, 0).getDate();
      setStartDate(`${year}-${month}-01`);
      setEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
    } else if (selected === 'last_30_days') {
      const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const pastStr = past30.toISOString().slice(0, 10);
      setStartDate(pastStr);
      setEndDate(todayStr);
    } else if (selected === 'this_year') {
      const year = today.getFullYear();
      setStartDate(`${year}-01-01`);
      setEndDate(todayStr);
    } else if (selected === 'custom') {
      if (!startDate) setStartDate(todayStr);
      if (!endDate) setEndDate(todayStr);
    }
  };

  // Perform chronological calculation for this ledger
  const calculatedLedger = useMemo(() => {
    // 1. Sort all active transactions chronologically ascending
    const activeTxns = transactions.filter((t) => !t.isDeleted);
    const sorted = [...activeTxns].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    const isCreditCard = ledgerType === 'credit-card';
    const isCategory = ledgerType === 'category';

    // 2. Calculate Opening Balance before startDate
    let priorRunning = isCategory ? 0 : Number(baseOpeningBalance) || 0;

    const effectiveStart = startDate.trim() || undefined;
    const effectiveEnd = endDate.trim() || undefined;

    const inRangeTxns: Transaction[] = [];

    sorted.forEach((txn) => {
      const isCredit =
        txn.type === 'Money Received' ||
        txn.type === 'Loan Taken' ||
        txn.type === 'Credit Card Payment';
      const isDebit =
        txn.type === 'Expense' ||
        txn.type === 'Money Paid' ||
        txn.type === 'Loan Given';

      const creditAmount = isCredit ? Number(txn.amount) || 0 : 0;
      const debitAmount = isDebit ? Number(txn.amount) || 0 : 0;

      const isBeforeStart = effectiveStart && txn.date < effectiveStart;
      const isAfterEnd = effectiveEnd && txn.date > effectiveEnd;

      if (isBeforeStart) {
        if (isCreditCard) {
          // Debits (spends) increase outstanding, credits (payments) decrease
          priorRunning = Math.max(0, priorRunning + debitAmount - creditAmount);
        } else if (!isCategory) {
          // Bank, Cash, General: credits increase, debits decrease
          priorRunning = priorRunning + creditAmount - debitAmount;
        }
      } else if (!isAfterEnd) {
        inRangeTxns.push(txn);
      }
    });

    // 3. Process in-range entries row by row
    let currentRunning = priorRunning;
    let periodTotalDebit = 0;
    let periodTotalCredit = 0;

    const entries: LedgerEntryItem[] = inRangeTxns.map((txn) => {
      const isCredit =
        txn.type === 'Money Received' ||
        txn.type === 'Loan Taken' ||
        txn.type === 'Credit Card Payment';
      const isDebit =
        txn.type === 'Expense' ||
        txn.type === 'Money Paid' ||
        txn.type === 'Loan Given';

      const creditAmount = isCredit ? Number(txn.amount) || 0 : 0;
      const debitAmount = isDebit ? Number(txn.amount) || 0 : 0;

      periodTotalDebit += debitAmount;
      periodTotalCredit += creditAmount;

      if (isCreditCard) {
        currentRunning = Math.max(0, currentRunning + debitAmount - creditAmount);
      } else if (!isCategory) {
        currentRunning = currentRunning + creditAmount - debitAmount;
      } else {
        currentRunning += (Number(txn.amount) || 0);
      }

      return {
        date: formatDate(txn.date),
        details: txn.title,
        narration: txn.narration || txn.notes,
        category: txn.categoryName || 'General',
        type: txn.type,
        paymentMethod: txn.paymentMethod,
        debit: debitAmount,
        credit: creditAmount,
        runningBalance: isCategory ? undefined : currentRunning,
      };
    });

    let dateLabel = 'All Time';
    if (effectiveStart && effectiveEnd) {
      dateLabel = `${formatDate(effectiveStart)} to ${formatDate(effectiveEnd)}`;
    } else if (effectiveStart) {
      dateLabel = `From ${formatDate(effectiveStart)}`;
    } else if (effectiveEnd) {
      dateLabel = `Up to ${formatDate(effectiveEnd)}`;
    }

    return {
      periodOpening: isCategory ? undefined : priorRunning,
      entries,
      periodClosing: isCategory ? undefined : currentRunning,
      totalDebit: periodTotalDebit,
      totalCredit: periodTotalCredit,
      dateLabel,
    };
  }, [transactions, baseOpeningBalance, ledgerType, startDate, endDate]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const buildPdfOptions = (): LedgerPdfOptions => {
    return {
      title,
      subtitle: subtitle || 'Personal Financial Ledger Statement',
      ledgerType,
      accountInfo,
      dateRange: {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        label: calculatedLedger.dateLabel,
      },
      openingBalance: calculatedLedger.periodOpening,
      entries: calculatedLedger.entries,
      closingBalance: calculatedLedger.periodClosing,
      totalDebit: calculatedLedger.totalDebit,
      totalCredit: calculatedLedger.totalCredit,
    };
  };

  const handleDownload = () => {
    try {
      setIsGenerating(true);
      const pdfOpts = buildPdfOptions();
      const { doc, fileName } = generateLedgerPdf(pdfOpts);
      downloadLedgerPdf(doc, fileName);
      showToast(`Downloaded: ${fileName}`);
    } catch (err) {
      console.error(err);
      showToast('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsGenerating(true);
      const pdfOpts = buildPdfOptions();
      const { fileName, blob } = generateLedgerPdf(pdfOpts);
      const result = await shareLedgerPdf(blob, fileName, title);
      showToast(result.message);
    } catch (err) {
      console.error(err);
      showToast('Failed to share PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Export PDF Ledger Statement
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
                {title} · {calculatedLedger.entries.length} transactions included
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Date Range Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Select Ledger Statement Period
              </label>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {calculatedLedger.dateLabel}
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'last_30_days', label: 'Last 30 Days' },
                { id: 'this_year', label: 'This Year' },
                { id: 'custom', label: 'Custom Range' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id as DateFilterPreset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    preset === p.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Range Inputs */}
            {(preset === 'custom' || startDate || endDate) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setPreset('custom');
                      setStartDate(e.target.value);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setPreset('custom');
                      setEndDate(e.target.value);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Live Calculated Metric Summary Cards */}
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Statement Summary Preview
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {calculatedLedger.periodOpening !== undefined && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {ledgerType === 'credit-card' ? 'Opening Due' : 'Opening Bal'}
                  </div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5 truncate">
                    {formatCurrency(calculatedLedger.periodOpening)}
                  </div>
                </div>
              )}

              <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200">
                <div className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-rose-600" />
                  {ledgerType === 'credit-card' ? 'Total Spends' : 'Total Debits'}
                </div>
                <div className="text-sm font-bold font-mono text-rose-700 mt-0.5 truncate">
                  {formatCurrency(calculatedLedger.totalDebit)}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                  {ledgerType === 'credit-card' ? 'Payments' : 'Total Credits'}
                </div>
                <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5 truncate">
                  {formatCurrency(calculatedLedger.totalCredit)}
                </div>
              </div>

              {calculatedLedger.periodClosing !== undefined && (
                <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-200">
                  <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                    {ledgerType === 'credit-card' ? 'Closing Due' : 'Closing Bal'}
                  </div>
                  <div className="text-sm font-bold font-mono text-indigo-700 mt-0.5 truncate">
                    {formatCurrency(calculatedLedger.periodClosing)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Ledger Entries Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Preview ({calculatedLedger.entries.length} items)
              </span>
              <span className="text-[11px] text-slate-500">
                PDF will include all {calculatedLedger.entries.length} transactions
              </span>
            </div>

            {calculatedLedger.entries.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-600">
                  No transactions found for the selected period
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Try selecting 'All Time' or adjusting the date range
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 grid grid-cols-12 gap-2 text-[11px]">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-5">Particulars / Details</div>
                  <div className="col-span-2 text-right">Debit</div>
                  <div className="col-span-3 text-right">Credit / Bal</div>
                </div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {calculatedLedger.entries.slice(0, 5).map((row, idx) => (
                    <div key={idx} className="px-3 py-2 grid grid-cols-12 gap-2 text-[11px] hover:bg-slate-50">
                      <div className="col-span-2 text-slate-500 truncate">{row.date}</div>
                      <div className="col-span-5 font-medium text-slate-900 truncate">
                        {row.details}
                        {row.category && (
                          <span className="text-[10px] text-slate-400 ml-1.5 font-normal">
                            ({row.category})
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 text-right font-mono font-semibold text-rose-600">
                        {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                      </div>
                      <div className="col-span-3 text-right font-mono font-semibold text-emerald-600">
                        {row.credit > 0 ? formatCurrency(row.credit) : (row.runningBalance !== undefined ? formatCurrency(row.runningBalance) : '-')}
                      </div>
                    </div>
                  ))}
                </div>
                {calculatedLedger.entries.length > 5 && (
                  <div className="bg-slate-50 px-3 py-2 text-center text-[10px] text-slate-500 font-semibold border-t border-slate-100">
                    + {calculatedLedger.entries.length - 5} more transactions will be in the full PDF document
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Includes debit/credit totals, running balance, & opening/closing.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={isGenerating || calculatedLedger.entries.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Share PDF via AirDrop, WhatsApp, Email, or Files"
            >
              <Share2 className="w-4 h-4 text-indigo-600" />
              <span>Share PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || calculatedLedger.entries.length === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{isGenerating ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
