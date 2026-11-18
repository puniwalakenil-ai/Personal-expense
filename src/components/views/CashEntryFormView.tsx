import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Banknote,
  Calendar,
  ChevronDown,
  Sparkles,
  Plus,
  Check,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Landmark,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { useAuth } from '../../context/AuthContext';
import { PageView, PendingAttachmentDraft, TransactionAttachmentMeta } from '../../types';
import { getTodayDateString, formatCurrency, normalizeCategoryName, generateId } from '../../utils/formatters';
import { InlineDropdown } from '../common/InlineDropdown';
import { TechExpensesVideoLoader } from '../common/TechExpensesLogo';
import { AttachmentPicker } from '../common/AttachmentPicker';
import { savePendingAttachmentsToVault, deleteAttachmentsFromVault } from '../../services/attachmentService';

interface Props {
  editId?: string;
  defaultDirection?: 'Cash In' | 'Cash Out';
  restoredState?: {
    date: string;
    title: string;
    amount: string;
    direction: 'Cash In' | 'Cash Out';
    cashOutType?: 'Expense' | 'Money Paid';
    categoryId: string;
    narration?: string;
    notes?: string;
    pendingAttachments?: PendingAttachmentDraft[];
    removedAttachmentIds?: string[];
  };
  returnTo?: PageView;
}

export const CashEntryFormView: React.FC<Props> = ({
  editId,
  defaultDirection = 'Cash Out',
  restoredState,
  returnTo,
}) => {
  const {
    currentCashBalance,
    transactions,
    categories,
    savedItemNames,
    savedExpenseDetails,
    getItemNameCategory,
    addSavedItemName,
    addTransaction,
    updateTransaction,
    triggerSaveCelebration,
    navigateTo,
    goBack,
  } = useFinancial();

  const { currentUser, isAuthorized } = useAuth();
  const existingTxn = editId ? transactions.find((t) => t.id === editId) : null;

  const inferredExistingDirection: 'Cash In' | 'Cash Out' | undefined = existingTxn
    ? existingTxn.type === 'Money Received'
      ? 'Cash In'
      : 'Cash Out'
    : undefined;

  const [date, setDate] = useState(
    restoredState?.date || existingTxn?.date || getTodayDateString()
  );
  const [title, setTitle] = useState(
    restoredState?.title || existingTxn?.title || ''
  );
  const [amount, setAmount] = useState(
    restoredState?.amount || (existingTxn ? String(existingTxn.amount) : '')
  );
  const [direction, setDirection] = useState<'Cash In' | 'Cash Out'>(
    restoredState?.direction || inferredExistingDirection || defaultDirection
  );
  const [cashOutType, setCashOutType] = useState<'Expense' | 'Money Paid'>(
    restoredState?.cashOutType ||
      (existingTxn?.type === 'Money Paid' ? 'Money Paid' : 'Expense')
  );
  const [cashModeLabel, setCashModeLabel] = useState<string>(
    restoredState?.narration || existingTxn?.narration || 'Physical Cash'
  );
  const [categoryId, setCategoryId] = useState(
    restoredState?.categoryId || existingTxn?.categoryId || ''
  );
  const [notes, setNotes] = useState(
    restoredState?.notes || existingTxn?.notes || ''
  );
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachmentDraft[]>(
    restoredState?.pendingAttachments || []
  );
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>(
    restoredState?.removedAttachmentIds || []
  );
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; label: string } | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const detailContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (detailContainerRef.current && !detailContainerRef.current.contains(e.target as Node)) {
        setIsDetailOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableDetails = useMemo(() => {
    const map = new Map<string, string>();
    savedExpenseDetails.forEach((d) => map.set(d.toLowerCase(), d));
    savedItemNames.forEach((item) => map.set(item.name.toLowerCase(), item.name));
    transactions.forEach((t) => {
      if (t.title) map.set(t.title.toLowerCase(), t.title);
    });
    return Array.from(map.values());
  }, [savedItemNames, savedExpenseDetails, transactions]);

  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((cat) => {
      const norm = normalizeCategoryName(cat.name);
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  }, [categories]);

  const filteredDetails = useMemo(() => {
    if (!title.trim()) return availableDetails;
    const q = title.toLowerCase().trim();
    return availableDetails.filter((d) => d.toLowerCase().includes(q));
  }, [availableDetails, title]);

  const isExactMatch = useMemo(() => {
    if (!title.trim()) return true;
    return availableDetails.some((d) => d.toLowerCase() === title.trim().toLowerCase());
  }, [availableDetails, title]);

  const linkedCategoryId = useMemo(() => {
    if (!title.trim()) return undefined;
    return getItemNameCategory(title.trim());
  }, [title, getItemNameCategory, savedItemNames]);

  useEffect(() => {
    if (title.trim()) {
      const linked = getItemNameCategory(title.trim());
      if (linked) {
        setCategoryId(linked);
        return;
      }
    }
    if (!categoryId && uniqueCategories.length > 0) {
      const preferred = uniqueCategories.find((c) =>
        direction === 'Cash In'
          ? c.type === 'Income' || c.type === 'Both'
          : c.type === 'Expense' || c.type === 'Both'
      );
      setCategoryId((preferred || uniqueCategories[0]).id);
    }
  }, [uniqueCategories, categoryId, direction, title, getItemNameCategory]);

  const handleSelectDetail = (selectedName: string) => {
    setTitle(selectedName);
    setIsDetailOpen(false);
    const linked = getItemNameCategory(selectedName);
    if (linked) {
      setCategoryId(linked);
    }
  };

  const handleOpenCreateNamePage = () => {
    setIsDetailOpen(false);
    navigateTo({
      name: 'create-name-form',
      initialName: title.trim(),
      formStateToRestore: {
        formType: 'cash-entry',
        editId,
        date,
        amount,
        cashDirection: direction,
        cashOutType,
        paymentMethod: 'Cash',
        narration: cashModeLabel,
        notes,
        pendingAttachments,
        removedAttachmentIds,
      },
      returnTo: {
        name: 'cash-entry-form',
        editId,
        defaultDirection: direction,
        returnTo,
      },
    });
  };

  const handleToggleRemoveExistingAttachment = (attachmentId: string) => {
    setRemovedAttachmentIds((prev) =>
      prev.includes(attachmentId) ? prev.filter((id) => id !== attachmentId) : [...prev, attachmentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isSaving) return;

    if (!title.trim()) {
      setError('Please enter Details / Name (e.g. Tea, Vegetables, Cash Sales).');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    setIsSaving(true);
    setUploadProgress(null);
    const activeUserId = isAuthorized ? currentUser?.uid : null;

    try {
      const selectedCat = categories.find((c) => c.id === categoryId);
      const txnType =
        editId && existingTxn && existingTxn.type === 'Credit Card Payment'
          ? existingTxn.type
          : direction === 'Cash In'
          ? ('Money Received' as const)
          : cashOutType === 'Money Paid'
          ? ('Money Paid' as const)
          : ('Expense' as const);

      const targetTxnId = existingTxn?.id || generateId(txnType === 'Money Received' ? 'rec' : 'exp');

      const existingKept = (existingTxn?.attachments || []).filter(
        (a) => !removedAttachmentIds.includes(a.id)
      );
      const removedList = (existingTxn?.attachments || []).filter((a) =>
        removedAttachmentIds.includes(a.id)
      );

      let newlyUploaded: TransactionAttachmentMeta[] = [];
      if (pendingAttachments.length > 0) {
        newlyUploaded = await savePendingAttachmentsToVault({
          userId: activeUserId,
          transactionId: targetTxnId,
          moduleType: 'cash',
          accountScopeId: 'cash-wallet',
          drafts: pendingAttachments,
          onProgress: (percent, label) => setUploadProgress({ percent, label }),
        });
      }

      const combinedAttachments = [...existingKept, ...newlyUploaded];

      const payload = {
        date,
        title: title.trim(),
        narration: cashModeLabel.trim() || 'Physical Cash',
        categoryId: categoryId || undefined,
        categoryName: selectedCat?.name || (direction === 'Cash In' ? 'Cash Receipt' : 'Cash Expense'),
        amount: numAmount,
        type: txnType,
        paymentMethod: 'Cash' as const,
        bankAccountId: undefined,
        bankAccountName: undefined,
        notes: notes.trim() || undefined,
        ...(editId
          ? { attachments: combinedAttachments }
          : combinedAttachments.length > 0
          ? { attachments: combinedAttachments }
          : {}),
      };

      if (title.trim() && categoryId) {
        addSavedItemName(title.trim(), categoryId);
      }

      if (editId && existingTxn) {
        updateTransaction(editId, payload);
        if (removedList.length > 0) {
          deleteAttachmentsFromVault({
            userId: activeUserId,
            attachments: removedList,
          }).catch((err) => console.error('Failed to delete removed attachments:', err));
        }
      } else {
        addTransaction({ ...payload, id: targetTxnId });
      }

      triggerSaveCelebration({
        title: 'Cash Entry Saved Successfully',
        subtitle:
          direction === 'Cash In'
            ? `Added ${formatCurrency(numAmount)} to Cash-in-Hand`
            : `Paid ${formatCurrency(numAmount)} from Cash-in-Hand`,
        amount: numAmount,
        direction: direction === 'Cash In' ? 'Money In' : 'Money Out',
      });

      if (returnTo) {
        navigateTo(returnTo);
      } else {
        navigateTo({ name: 'section', section: 'Cash' });
      }
    } catch (err) {
      setIsSaving(false);
      setUploadProgress(null);
      setError(err instanceof Error ? err.message : 'Failed to save cash entry. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cash</span>
        </button>

        {!editId && (
          <button
            type="button"
            onClick={() =>
              navigateTo({
                name: 'atm-withdrawal-form',
                returnTo: returnTo || { name: 'section', section: 'Cash' },
              })
            }
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1.5 cursor-pointer bg-indigo-50 px-3 py-1.5 rounded-xl"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Switch to ATM Withdrawal</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                Cash / Cash-in-Hand Entry
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {editId ? 'Edit Cash Entry' : 'Record Cash In / Cash Out'}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-medium">Available Cash</div>
            <div className="text-lg font-extrabold font-mono text-amber-400">
              {formatCurrency(currentCashBalance)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {error}
            </div>
          )}

          {/* 1. Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Entry Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-600 font-medium text-slate-900"
                required
              />
            </div>
          </div>

          {/* 2. Details / Name */}
          <div ref={detailContainerRef} className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Details / Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Groceries, Tea & Snacks, Petty Cash Receipt..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsDetailOpen(true);
                }}
                onFocus={() => setIsDetailOpen(true)}
                className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-600 text-slate-900 font-medium"
                required
                autoFocus={!editId && !title}
              />
              <button
                type="button"
                onClick={() => setIsDetailOpen(!isDetailOpen)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isDetailOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {title.trim() && !isExactMatch && (
              <div className="mt-2 p-2.5 bg-purple-50/90 border border-purple-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="text-xs text-purple-900 truncate">
                    "<strong>{title.trim()}</strong>" is not saved yet
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateNamePage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Create Now</span>
                </button>
              </div>
            )}

            {isDetailOpen && (
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs max-h-48 overflow-y-auto space-y-1">
                {filteredDetails.length > 0 ? (
                  filteredDetails.map((item) => {
                    const linkedCat = getItemNameCategory(item);
                    const catObj = linkedCat ? categories.find((c) => c.id === linkedCat) : null;
                    return (
                      <div
                        key={item}
                        onClick={() => handleSelectDetail(item)}
                        className="p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer hover:bg-slate-50 text-slate-800"
                      >
                        <span className="truncate">{item}</span>
                        {catObj && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                            {catObj.name}
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No saved names match. Click "Create Now" to save with a category.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="text-xs font-bold text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">₹</span>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-600 text-slate-900"
                required
              />
            </div>
          </div>

          {/* 4. Cash Direction */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Cash Flow Direction <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDirection('Cash Out')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  direction === 'Cash Out'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Cash Out (Paid / Expense)</span>
              </button>

              <button
                type="button"
                onClick={() => setDirection('Cash In')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  direction === 'Cash In'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>Cash In (Received)</span>
              </button>
            </div>
          </div>

          {direction === 'Cash Out' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Entry Classification</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Expense', 'Money Paid'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCashOutType(t)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                      cashOutType === t
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t === 'Expense' ? 'Expense (Counts in Expenses)' : 'General Payment'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Category & Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Category</label>
                {linkedCategoryId && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <Lock className="w-3 h-3" /> Linked to Name
                  </span>
                )}
              </div>
              <InlineDropdown
                id="cash-category-select"
                value={categoryId}
                onChange={(val) => setCategoryId(val)}
                options={uniqueCategories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  badge: c.type,
                  color: c.color,
                }))}
                placeholder="Select category..."
                searchPlaceholder="Search categories..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Method / Mode</label>
              <InlineDropdown
                id="cash-mode-select"
                value={cashModeLabel}
                onChange={(val) => setCashModeLabel(val)}
                options={[
                  { value: 'Physical Cash', label: 'Physical Cash (Wallet)' },
                  { value: 'Home Safe Cash', label: 'Home Safe Cash' },
                  { value: 'Petty Cash', label: 'Petty Cash' },
                ]}
                searchable={false}
                placeholder="Select cash mode..."
              />
            </div>
          </div>

          {/* 6. Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Notes (Optional)</label>
            <input
              type="text"
              placeholder="Add bill reference, shop name, or remark..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-600 text-slate-900"
            />
          </div>

          {/* 7. Attach Section (PDF, Camera, Gallery) */}
          <AttachmentPicker
            existingAttachments={existingTxn?.attachments || []}
            removedAttachmentIds={removedAttachmentIds}
            pendingAttachments={pendingAttachments}
            onAddPending={(drafts) => setPendingAttachments((prev) => [...prev, ...drafts])}
            onRemovePending={(id) => setPendingAttachments((prev) => prev.filter((d) => d.id !== id))}
            onToggleRemoveExisting={handleToggleRemoveExistingAttachment}
            disabled={isSaving}
            uploadProgress={uploadProgress}
            accentColor="amber"
          />

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={goBack}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-70"
            >
              {isSaving ? <TechExpensesVideoLoader size="xs" mode="loop" /> : <Check className="w-4 h-4" />}
              <span>{editId ? 'Update Cash Entry' : 'Save Cash Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
