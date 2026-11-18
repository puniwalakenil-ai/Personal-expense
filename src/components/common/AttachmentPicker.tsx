import React, { useRef, useState } from 'react';
import {
  Paperclip,
  FileText,
  Camera,
  Image as ImageIcon,
  Eye,
  Trash2,
  Undo2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  AttachmentSourceMethod,
  PendingAttachmentDraft,
  TransactionAttachmentMeta,
} from '../../types';
import {
  MAX_ATTACHMENTS_PER_ENTRY,
  formatFileSize,
  loadAttachmentBlobUrl,
  prepareAttachmentDraft,
} from '../../services/attachmentService';
import { useAuth } from '../../context/AuthContext';
import { AttachmentViewerModal, PreviewableAttachmentItem } from './AttachmentViewerModal';

interface Props {
  existingAttachments?: TransactionAttachmentMeta[];
  removedAttachmentIds?: string[];
  pendingAttachments: PendingAttachmentDraft[];
  onAddPending: (newDrafts: PendingAttachmentDraft[]) => void;
  onRemovePending: (draftId: string) => void;
  onToggleRemoveExisting?: (attachmentId: string) => void;
  disabled?: boolean;
  uploadProgress?: { percent: number; label: string } | null;
  accentColor?: 'indigo' | 'amber' | 'purple';
}

export const AttachmentPicker: React.FC<Props> = ({
  existingAttachments = [],
  removedAttachmentIds = [],
  pendingAttachments,
  onAddPending,
  onRemovePending,
  onToggleRemoveExisting,
  disabled = false,
  uploadProgress = null,
  accentColor = 'indigo',
}) => {
  const { currentUser } = useAuth();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingState, setProcessingState] = useState<{ percent: number; label: string } | null>(null);
  const [statusError, setStatusError] = useState<string>('');
  const [statusSuccess, setStatusSuccess] = useState<string>('');

  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<PreviewableAttachmentItem[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState('');

  const removedSet = new Set(removedAttachmentIds);
  const activeExisting = existingAttachments.filter((a) => !removedSet.has(a.id));
  const totalCount = activeExisting.length + pendingAttachments.length;

  const accentClasses =
    accentColor === 'amber'
      ? {
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          hoverBtn: 'hover:border-amber-400 hover:bg-amber-50/70',
          bar: 'bg-amber-600',
        }
      : accentColor === 'purple'
      ? {
          badge: 'bg-purple-50 text-purple-700 border-purple-200',
          hoverBtn: 'hover:border-purple-400 hover:bg-purple-50/70',
          bar: 'bg-purple-600',
        }
      : {
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          hoverBtn: 'hover:border-indigo-400 hover:bg-indigo-50/70',
          bar: 'bg-indigo-600',
        };

  const handleFilesSelected = async (
    fileList: FileList | null,
    sourceMethod: AttachmentSourceMethod
  ) => {
    if (!fileList || fileList.length === 0 || disabled || isProcessing) return;

    setStatusError('');
    setStatusSuccess('');

    const files = Array.from(fileList);
    const remainingSlots = MAX_ATTACHMENTS_PER_ENTRY - totalCount;

    if (remainingSlots <= 0) {
      setStatusError(`Maximum ${MAX_ATTACHMENTS_PER_ENTRY} attachments allowed per transaction.`);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const knownHashes = new Set<string>([
      ...activeExisting.map((a) => a.contentHash),
      ...pendingAttachments.map((d) => d.contentHash),
    ]);

    setIsProcessing(true);
    const added: PendingAttachmentDraft[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        try {
          const draft = await prepareAttachmentDraft(
            file,
            sourceMethod,
            knownHashes,
            (percent, stage) => {
              const overall = Math.round(((i + percent / 100) / filesToProcess.length) * 100);
              setProcessingState({
                percent: overall,
                label: filesToProcess.length > 1
                  ? `${stage} (${i + 1}/${filesToProcess.length})`
                  : stage,
              });
            }
          );
          knownHashes.add(draft.contentHash);
          added.push(draft);
        } catch (err) {
          errors.push(err instanceof Error ? err.message : `Failed to attach "${file.name}".`);
        }
      }

      if (files.length > remainingSlots) {
        errors.push(`Only ${remainingSlots} file(s) could be added (max ${MAX_ATTACHMENTS_PER_ENTRY} per entry).`);
      }

      if (added.length > 0) {
        onAddPending(added);
        setStatusSuccess(
          added.length === 1
            ? `Attached "${added[0].fileName}" ready to save.`
            : `Attached ${added.length} files ready to save.`
        );
      }

      if (errors.length > 0) {
        setStatusError(errors.join(' '));
      }
    } finally {
      setIsProcessing(false);
      setProcessingState(null);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const openPendingPreview = (draftId: string) => {
    const items: PreviewableAttachmentItem[] = pendingAttachments.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      blobUrl: d.previewUrl,
    }));
    const idx = Math.max(0, items.findIndex((i) => i.id === draftId));
    setViewerItems(items);
    setViewerIndex(idx);
    setViewerError('');
    setViewerLoading(false);
    setViewerOpen(true);
  };

  const openExistingPreview = async (meta: TransactionAttachmentMeta) => {
    const items: PreviewableAttachmentItem[] = activeExisting.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
      blobUrl: undefined,
    }));
    const idx = Math.max(0, items.findIndex((i) => i.id === meta.id));
    setViewerItems(items);
    setViewerIndex(idx);
    setViewerError('');
    setViewerLoading(true);
    setViewerOpen(true);

    try {
      const { blobUrl } = await loadAttachmentBlobUrl({
        userId: currentUser?.uid,
        meta,
      });
      setViewerItems((prev) =>
        prev.map((item) => (item.id === meta.id ? { ...item, blobUrl } : item))
      );
    } catch (err) {
      setViewerError(err instanceof Error ? err.message : 'Unable to load attachment.');
    } finally {
      setViewerLoading(false);
    }
  };

  const handleViewerIndexChange = async (newIdx: number) => {
    setViewerIndex(newIdx);
    const target = viewerItems[newIdx];
    if (!target || target.blobUrl) return;
    const existingMeta = existingAttachments.find((a) => a.id === target.id);
    if (!existingMeta) return;

    setViewerLoading(true);
    setViewerError('');
    try {
      const { blobUrl } = await loadAttachmentBlobUrl({
        userId: currentUser?.uid,
        meta: existingMeta,
      });
      setViewerItems((prev) =>
        prev.map((item) => (item.id === existingMeta.id ? { ...item, blobUrl } : item))
      );
    } catch (err) {
      setViewerError(err instanceof Error ? err.message : 'Unable to load attachment.');
    } finally {
      setViewerLoading(false);
    }
  };

  const activeProgress = uploadProgress || processingState;

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Paperclip className="w-3.5 h-3.5 text-slate-600" />
          <label className="text-xs font-bold text-slate-700">
            Attach <span className="font-normal text-slate-400">(Bills, Receipts, Photos · PDF / Image)</span>
          </label>
        </div>
        {totalCount > 0 && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${accentClasses.badge}`}>
            {totalCount} {totalCount === 1 ? 'file' : 'files'}
          </span>
        )}
      </div>

      {/* Hidden File Inputs with exact platform attributes (zero await before click) */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files, 'pdf')}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files, 'camera')}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files, 'gallery')}
      />

      {/* Three Consistent Attachment Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          disabled={disabled || isProcessing}
          onClick={() => pdfInputRef.current?.click()}
          className={`p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${accentClasses.hoverBtn}`}
        >
          <FileText className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Upload PDF</span>
        </button>

        <button
          type="button"
          disabled={disabled || isProcessing}
          onClick={() => cameraInputRef.current?.click()}
          className={`p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${accentClasses.hoverBtn}`}
        >
          <Camera className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Take Photo</span>
        </button>

        <button
          type="button"
          disabled={disabled || isProcessing}
          onClick={() => galleryInputRef.current?.click()}
          className={`p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${accentClasses.hoverBtn}`}
        >
          <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Choose from Gallery</span>
        </button>
      </div>

      {/* Real Progress Bar (Validation or Cloud Upload) */}
      {activeProgress && (
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span className="truncate">{activeProgress.label}</span>
            <span className="font-mono">{activeProgress.percent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${accentClasses.bar}`}
              style={{ width: `${activeProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Clear Feedback Banners */}
      {statusError && (
        <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{statusError}</span>
        </div>
      )}
      {statusSuccess && !statusError && (
        <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{statusSuccess}</span>
        </div>
      )}

      {/* Existing Saved Attachments (Edit Mode) */}
      {existingAttachments.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Saved Attachments
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {existingAttachments.map((meta) => {
              const isMarkedForRemoval = removedSet.has(meta.id);
              const isPdf = meta.mimeType === 'application/pdf';
              return (
                <div
                  key={meta.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                    isMarkedForRemoval
                      ? 'bg-rose-50/60 border-rose-200 opacity-70'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isPdf ? (
                      <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    ) : meta.thumbnailDataUrl ? (
                      <img
                        src={meta.thumbnailDataUrl}
                        alt={meta.fileName}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-semibold truncate ${
                          isMarkedForRemoval ? 'line-through text-rose-700' : 'text-slate-900'
                        }`}
                      >
                        {meta.fileName}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {formatFileSize(meta.fileSize)} · {isMarkedForRemoval ? 'Will remove on update' : 'Saved'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isMarkedForRemoval && (
                      <button
                        type="button"
                        onClick={() => openExistingPreview(meta)}
                        className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
                        title="Preview attachment"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onToggleRemoveExisting && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onToggleRemoveExisting(meta.id)}
                        className={`p-1.5 rounded-lg cursor-pointer ${
                          isMarkedForRemoval
                            ? 'text-slate-700 hover:bg-slate-200'
                            : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title={isMarkedForRemoval ? 'Keep attachment' : 'Remove attachment'}
                      >
                        {isMarkedForRemoval ? (
                          <Undo2 className="w-3.5 h-3.5" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Newly Staged Attachments (Pending Save) */}
      {pendingAttachments.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Selected Attachments (Ready to Save)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {pendingAttachments.map((draft) => {
              const isPdf = draft.mimeType === 'application/pdf';
              return (
                <div
                  key={draft.id}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2.5 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isPdf ? (
                      <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    ) : (
                      <img
                        src={draft.thumbnailDataUrl || draft.previewUrl}
                        alt={draft.fileName}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {draft.fileName}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {formatFileSize(draft.fileSize)} ·{' '}
                        {draft.sourceMethod === 'pdf'
                          ? 'PDF'
                          : draft.sourceMethod === 'camera'
                          ? 'Camera'
                          : 'Gallery'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openPendingPreview(draft.id)}
                      className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
                      title="Preview before saving"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onRemovePending(draft.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
