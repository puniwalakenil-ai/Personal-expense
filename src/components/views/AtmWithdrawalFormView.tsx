import React, { useState } from 'react';
import {
  Landmark,
  Banknote,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  ArrowLeftRight,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { useAuth } from '../../context/AuthContext';
import { PageView, PendingAttachmentDraft, TransactionAttachmentMeta } from '../../types';
import { formatCurrency, getTodayDateString, maskAccountNumber, generateId } from '../../utils/formatters';
import { InlineDropdown } from '../common/InlineDropdown';
import { TechExpensesVideoLoader } from '../common/TechExpensesLogo';
import { AttachmentPicker } from '../common/AttachmentPicker';
import { savePendingAttachmentsToVault } from '../../services/attachmentService';

interface Props {
  defaultBankId?: string;
  returnTo?: PageView;
}

export const AtmWithdrawalFormView: React.FC<Props> = ({ defaultBankId, returnTo }) => {
  const {
    bankAccountsWithBalances,
    currentCashBalance,
    recordAtmWithdrawal,
    triggerSaveCelebration,
    navigateTo,
    goBack,
  } = useFinancial();

  const { currentUser, isAuthorized } = useAuth();
  const [bankAccountId, setBankAccountId] = useState(
    defaultBankId || (bankAccountsWithBalances.length > 0 ? bankAccountsWithBalances[0].id : '')
  );
  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachmentDraft[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; label: string } | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedBank = bankAccountsWithBalances.find((b) => b.id === bankAccountId);
  const numAmount = parseFloat(amount) || 0;
  const exceedsBankBalance = selectedBank ? numAmount > selectedBank.currentBalance : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isSaving) return;

    if (!selectedBank) {
      setError('Please select a bank account.');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid withdrawal amount greater than 0.');
      return;
    }

    setIsSaving(true);
    setUploadProgress(null);
    const activeUserId = isAuthorized ? currentUser?.uid : null;

    try {
      const owner: 'bank' | 'cash' = defaultBankId ? 'bank' : 'cash';
      const bankTxnId = generateId('atmbank');
      const cashTxnId = generateId('atmcash');
      const targetTxnId = owner === 'bank' ? bankTxnId : cashTxnId;

      let uploadedMetas: TransactionAttachmentMeta[] = [];
      if (pendingAttachments.length > 0) {
        uploadedMetas = await savePendingAttachmentsToVault({
          userId: activeUserId,
          transactionId: targetTxnId,
          moduleType: owner,
          accountScopeId: owner === 'bank' ? selectedBank.id : 'cash-wallet',
          drafts: pendingAttachments,
          onProgress: (percent, label) => setUploadProgress({ percent, label }),
        });
      }

      const result = recordAtmWithdrawal({
        bankAccountId: selectedBank.id,
        amount: numAmount,
        date,
        notes: notes.trim() || undefined,
        bankTxnId,
        cashTxnId,
        attachments: uploadedMetas,
        attachmentOwner: owner,
      });

      if (!result) {
        setIsSaving(false);
        setUploadProgress(null);
        setError('Could not process ATM withdrawal. Please check your input.');
        return;
      }

      triggerSaveCelebration({
        title: 'ATM Withdrawal Recorded',
        subtitle: `${formatCurrency(numAmount)} moved from ${selectedBank.bankName} to Cash-in-Hand`,
        amount: numAmount,
        direction: 'Money In',
        bankName: selectedBank.bankName,
        bankId: selectedBank.id,
      });

      if (returnTo) {
        navigateTo(returnTo);
      } else {
        navigateTo({ name: 'section', section: 'Cash' });
      }
    } catch (err) {
      setIsSaving(false);
      setUploadProgress(null);
      setError(err instanceof Error ? err.message : 'Failed to record ATM withdrawal. Please try again.');
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
          <span>Back</span>
        </button>

        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
          Internal Transfer · Bank → Cash
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-amber-950 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">ATM Cash Withdrawal</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Automatically debits selected Bank Account and credits Cash-in-Hand
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-400">Cash in Hand</div>
            <div className="text-base font-extrabold font-mono text-amber-400">
              {formatCurrency(currentCashBalance)}
            </div>
          </div>
        </div>

        {bankAccountsWithBalances.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Landmark className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">No Bank Accounts Added</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add a bank account first so ATM cash withdrawals can automatically debit it.
            </p>
            <button
              type="button"
              onClick={() =>
                navigateTo({
                  name: 'bank-account-form',
                  returnTo: { name: 'atm-withdrawal-form', returnTo },
                })
              }
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
            >
              + Add Bank Account
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <InlineDropdown
                id="atm-bank-select"
                label="Select Source Bank Account"
                value={bankAccountId}
                onChange={(val) => setBankAccountId(val)}
                options={bankAccountsWithBalances.map((b) => ({
                  value: b.id,
                  label: b.bankName,
                  subtitle: `${maskAccountNumber(b.accountNumber)} · ${b.accountType}`,
                  badge: `Bal: ${formatCurrency(b.currentBalance)}`,
                  icon: <Landmark className="w-3.5 h-3.5" />,
                }))}
                placeholder="Choose bank account..."
                searchPlaceholder="Search banks..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Withdrawal Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Withdrawal Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="text-xs font-bold text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">₹</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                    required
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {exceedsBankBalance && selectedBank && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Amount exceeds {selectedBank.bankName}'s current balance ({formatCurrency(selectedBank.currentBalance)}). You can still proceed if recording historical data.
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ATM Location / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC ATM near City Center, cash for weekend expenses"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
              />
            </div>

            {/* Live Double-Entry Preview */}
            {selectedBank && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-2.5">
                <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Linked Ledger Impact Preview (Internal Transfer)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-indigo-100">
                    <div className="text-[10px] font-bold uppercase text-rose-600">
                      1. {selectedBank.bankName} (Money Out)
                    </div>
                    <div className="font-mono font-bold text-slate-900 mt-1">
                      {formatCurrency(selectedBank.currentBalance)} <ArrowRight className="w-3 h-3 inline mx-1 text-slate-400" />{' '}
                      <span className="text-rose-600">{formatCurrency(selectedBank.currentBalance - numAmount)}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-100">
                    <div className="text-[10px] font-bold uppercase text-emerald-600">
                      2. Cash-in-Hand (Cash In)
                    </div>
                    <div className="font-mono font-bold text-slate-900 mt-1">
                      {formatCurrency(currentCashBalance)} <ArrowRight className="w-3 h-3 inline mx-1 text-slate-400" />{' '}
                      <span className="text-emerald-600">{formatCurrency(currentCashBalance + numAmount)}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-indigo-800">
                  Treated as an internal transfer — NOT counted as income or expense in reports.
                </p>
              </div>
            )}

            {/* Attach Section (PDF, Camera, Gallery) */}
            <AttachmentPicker
              pendingAttachments={pendingAttachments}
              onAddPending={(drafts) => setPendingAttachments((prev) => [...prev, ...drafts])}
              onRemovePending={(id) => setPendingAttachments((prev) => prev.filter((d) => d.id !== id))}
              disabled={isSaving}
              uploadProgress={uploadProgress}
              accentColor="indigo"
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
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-70"
              >
                {isSaving ? <TechExpensesVideoLoader size="xs" mode="loop" /> : <Check className="w-4 h-4" />}
                <span>Withdraw & Link Entries</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
