import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Landmark,
  Banknote,
  QrCode,
  Edit2,
  Trash2,
  Receipt,
  FileText,
  SlidersHorizontal,
  Paperclip,
  Eye,
  ExternalLink,
  Download,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { useAuth } from '../../context/AuthContext';
import { PageView, TransactionAttachmentMeta } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  formatFileSize,
  loadAttachmentBlobUrl,
  triggerBlobDownload,
} from '../../services/attachmentService';
import {
  AttachmentViewerModal,
  PreviewableAttachmentItem,
} from '../common/AttachmentViewerModal';

interface Props {
  entryId: string;
  returnTo?: PageView;
}

export const EntryDetailView: React.FC<Props> = ({ entryId, returnTo }) => {
  const {
    transactions,
    deleteTransaction,
    requestDelete,
    navigateTo,
    goBack,
  } = useFinancial();
  const { currentUser, isAuthorized } = useAuth();

  const txn = transactions.find((t) => t.id === entryId);
  const attachments = txn?.attachments || [];

  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [attachmentError, setAttachmentError] = useState<string>('');

  // Viewer modal state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<PreviewableAttachmentItem[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState('');

  const activeUserId = isAuthorized ? currentUser?.uid : null;

  // Pre-warm blob URLs for attachments so "Open" works with a direct <a> click (no popup blocking)
  useEffect(() => {
    let cancelled = false;
    if (!attachments.length) return;

    attachments.forEach((meta) => {
      if (blobUrls[meta.id]) return;
      setLoadingMap((prev) => ({ ...prev, [meta.id]: true }));
      loadAttachmentBlobUrl({ userId: activeUserId, meta })
        .then(({ blobUrl }) => {
          if (cancelled) return;
          setBlobUrls((prev) => ({ ...prev, [meta.id]: blobUrl }));
        })
        .catch(() => {
          // On-demand retry still available when user clicks Preview / Download
        })
        .finally(() => {
          if (!cancelled) {
            setLoadingMap((prev) => ({ ...prev, [meta.id]: false }));
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [entryId, attachments.length, activeUserId]);

  if (!txn) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-white rounded-2xl border border-slate-200 text-center">
        <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-900">Transaction Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">This record may have been deleted.</p>
        <button
          type="button"
          onClick={goBack}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isOutflow =
    txn.type === 'Expense' ||
    txn.type === 'Money Paid' ||
    txn.type === 'Loan Given' ||
    txn.type === 'Credit Card Payment' ||
    (txn.type === 'Loan Repayment' && txn.loanDirection === 'Payable') ||
    (txn.type === 'ATM Withdrawal' && txn.transferDirection !== 'in');

  const handleDelete = () => {
    requestDelete(
      'Transaction Entry',
      txn.id,
      `${txn.title} (${formatCurrency(txn.amount)})`,
      () => {
        deleteTransaction(txn.id);
        if (returnTo) {
          navigateTo(returnTo);
        } else {
          navigateTo({ name: 'section', section: 'Entries' });
        }
      }
    );
  };

  const handleEdit = () => {
    if (txn.loanId) {
      navigateTo({ name: 'loan-detail', loanId: txn.loanId, returnTo });
      return;
    }
    if (txn.type === 'ATM Withdrawal' || txn.isInternalTransfer) {
      navigateTo({
        name: 'atm-withdrawal-form',
        defaultBankId: txn.bankAccountId || txn.relatedBankAccountId,
        returnTo,
      });
      return;
    }
    if (txn.creditCardId && !txn.bankAccountId) {
      navigateTo({
        name: 'credit-card-entry-form',
        cardId: txn.creditCardId,
        editId: txn.id,
        returnTo,
      });
      return;
    }
    if (txn.bankAccountId) {
      navigateTo({ name: 'bank-entry-form', bankId: txn.bankAccountId, editId: txn.id, returnTo });
      return;
    }
    if (txn.paymentMethod === 'Cash' && !txn.bankAccountId) {
      navigateTo({ name: 'cash-entry-form', editId: txn.id, returnTo });
      return;
    }
    if (txn.type === 'Expense') {
      navigateTo({ name: 'expense-form', editId: txn.id, returnTo });
    } else if (txn.type === 'Money Received') {
      navigateTo({ name: 'money-received-form', editId: txn.id, returnTo });
    } else if (txn.type === 'Money Paid') {
      navigateTo({ name: 'money-paid-form', editId: txn.id, returnTo });
    } else {
      navigateTo({ name: 'expense-form', editId: txn.id, returnTo });
    }
  };

  const ensureBlobLoaded = async (meta: TransactionAttachmentMeta): Promise<string> => {
    if (blobUrls[meta.id]) return blobUrls[meta.id];
    setLoadingMap((prev) => ({ ...prev, [meta.id]: true }));
    try {
      const { blobUrl } = await loadAttachmentBlobUrl({ userId: activeUserId, meta });
      setBlobUrls((prev) => ({ ...prev, [meta.id]: blobUrl }));
      return blobUrl;
    } finally {
      setLoadingMap((prev) => ({ ...prev, [meta.id]: false }));
    }
  };

  const handlePreviewAttachment = async (meta: TransactionAttachmentMeta) => {
    setAttachmentError('');
    const items: PreviewableAttachmentItem[] = attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
      blobUrl: blobUrls[a.id],
    }));
    const idx = Math.max(0, items.findIndex((i) => i.id === meta.id));
    setViewerItems(items);
    setViewerIndex(idx);
    setViewerError('');
    setViewerOpen(true);

    if (!blobUrls[meta.id]) {
      setViewerLoading(true);
      try {
        const url = await ensureBlobLoaded(meta);
        setViewerItems((prev) =>
          prev.map((item) => (item.id === meta.id ? { ...item, blobUrl: url } : item))
        );
      } catch (err) {
        setViewerError(err instanceof Error ? err.message : 'Unable to load attachment.');
      } finally {
        setViewerLoading(false);
      }
    } else {
      setViewerLoading(false);
    }
  };

  const handleViewerIndexChange = async (newIdx: number) => {
    setViewerIndex(newIdx);
    const target = viewerItems[newIdx];
    if (!target || target.blobUrl) return;
    const meta = attachments.find((a) => a.id === target.id);
    if (!meta) return;

    setViewerLoading(true);
    setViewerError('');
    try {
      const url = await ensureBlobLoaded(meta);
      setViewerItems((prev) =>
        prev.map((item) => (item.id === meta.id ? { ...item, blobUrl: url } : item))
      );
    } catch (err) {
      setViewerError(err instanceof Error ? err.message : 'Unable to load attachment.');
    } finally {
      setViewerLoading(false);
    }
  };

  const handleDownloadAttachment = async (meta: TransactionAttachmentMeta) => {
    setAttachmentError('');
    try {
      const url = await ensureBlobLoaded(meta);
      triggerBlobDownload(url, meta.fileName);
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : `Failed to download "${meta.fileName}".`);
    }
  };

  const supportsAttachmentEdit =
    !txn.loanId &&
    txn.type !== 'ATM Withdrawal' &&
    !txn.isInternalTransfer &&
    (Boolean(txn.bankAccountId) || Boolean(txn.creditCardId) || txn.paymentMethod === 'Cash');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Detail Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Top Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div>
            <div className="inline-block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {txn.type}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">{txn.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{formatDate(txn.date)}</p>
          </div>

          <div className="text-right">
            <div
              className={`text-2xl font-black font-mono tracking-tight ${
                isOutflow ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {isOutflow ? '-' : '+'}
              {formatCurrency(txn.amount)}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Category</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {txn.categoryName || '—'}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Payment Method</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                {txn.paymentMethod === 'Bank Account' && <Landmark className="w-4 h-4 text-blue-600" />}
                {txn.paymentMethod === 'Credit Card' && <CreditCard className="w-4 h-4 text-purple-600" />}
                {txn.paymentMethod === 'UPI' && <QrCode className="w-4 h-4 text-indigo-600" />}
                {txn.paymentMethod === 'Cash' && <Banknote className="w-4 h-4 text-amber-600" />}
                {txn.paymentMethod === 'Adjustment' && <SlidersHorizontal className="w-4 h-4 text-slate-600" />}
                <span>{txn.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Account Details */}
          {(txn.bankAccountName || txn.creditCardName || txn.upiId || txn.personName) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
              {txn.bankAccountName && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Bank Account</span>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">{txn.bankAccountName}</div>
                </div>
              )}

              {txn.creditCardName && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Credit Card</span>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">{txn.creditCardName}</div>
                </div>
              )}

              {txn.upiId && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">UPI Identifier</span>
                  <div className="text-xs font-mono font-semibold text-slate-800 mt-0.5">{txn.upiId}</div>
                </div>
              )}

              {txn.personName && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Party / Person</span>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">{txn.personName}</div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {txn.notes && (
            <div className="pb-4 border-b border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Notes</span>
              <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{txn.notes}</p>
            </div>
          )}

          {/* Attachments Section */}
          {(attachments.length > 0 || supportsAttachmentEdit) && (
            <div className="pb-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Attachments {attachments.length > 0 ? `(${attachments.length})` : ''}
                  </span>
                </div>
                {supportsAttachmentEdit && (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {attachments.length > 0 ? 'Add / Remove Files' : '+ Attach Bill / Receipt'}
                  </button>
                )}
              </div>

              {attachmentError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{attachmentError}</span>
                </div>
              )}

              {attachments.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                  No supporting bills, PDFs, or photos attached to this entry.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {attachments.map((meta) => {
                    const isPdf = meta.mimeType === 'application/pdf';
                    const isLoadingFile = Boolean(loadingMap[meta.id]);
                    const readyUrl = blobUrls[meta.id];
                    return (
                      <div
                        key={meta.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isPdf ? (
                            <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          ) : meta.thumbnailDataUrl || readyUrl ? (
                            <img
                              src={meta.thumbnailDataUrl || readyUrl}
                              alt={meta.fileName}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 cursor-pointer"
                              onClick={() => handlePreviewAttachment(meta)}
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {meta.fileName}
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span>{formatFileSize(meta.fileSize)}</span>
                              <span>·</span>
                              <span className="uppercase font-semibold">
                                {isPdf ? 'PDF' : 'Photo'}
                              </span>
                              {isLoadingFile && (
                                <>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-1 text-indigo-600">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Syncing...</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handlePreviewAttachment(meta)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Preview</span>
                          </button>

                          {readyUrl ? (
                            <a
                              href={readyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                              <span>Open</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePreviewAttachment(meta)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                              <span>Open</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(meta)}
                            disabled={isLoadingFile}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-60"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Created Timestamp */}
          <div className="text-[11px] text-slate-400 font-mono">
            Transaction ID: {txn.id} · Created: {new Date(txn.createdAt).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Bottom Actions: Edit & Delete */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            ← Return to list
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{txn.loanId ? 'View Loan' : txn.type === 'ATM Withdrawal' ? 'New ATM Transfer' : 'Edit'}</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs shadow-rose-600/20 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      <AttachmentViewerModal
        isOpen={viewerOpen}
        items={viewerItems}
        activeIndex={viewerIndex}
        isLoading={viewerLoading}
        errorMessage={viewerError}
        onChangeIndex={handleViewerIndexChange}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
};

