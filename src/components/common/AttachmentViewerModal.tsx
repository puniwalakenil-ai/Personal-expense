import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { formatFileSize, triggerBlobDownload } from '../../services/attachmentService';
import { TechExpensesVideoLoader } from './TechExpensesLogo';

export interface PreviewableAttachmentItem {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  blobUrl?: string;
}

interface Props {
  isOpen: boolean;
  items: PreviewableAttachmentItem[];
  activeIndex: number;
  isLoading?: boolean;
  errorMessage?: string;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
}

export const AttachmentViewerModal: React.FC<Props> = ({
  isOpen,
  items,
  activeIndex,
  isLoading = false,
  errorMessage,
  onChangeIndex,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);

  const currentItem = items[activeIndex];
  const isPdf =
    currentItem?.mimeType === 'application/pdf' ||
    currentItem?.fileName.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    setZoom(1);
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && activeIndex > 0) onChangeIndex(activeIndex - 1);
      if (e.key === 'ArrowRight' && activeIndex < items.length - 1) onChangeIndex(activeIndex + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, activeIndex, items.length, onChangeIndex, onClose]);

  if (!isOpen || !currentItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${currentItem.fileName}`}
    >
      {/* Top Toolbar */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isPdf ? 'bg-rose-500/20 text-rose-300' : 'bg-indigo-500/20 text-indigo-300'
            }`}
          >
            {isPdf ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold truncate">{currentItem.fileName}</div>
            <div className="text-[11px] text-slate-400">
              {formatFileSize(currentItem.fileSize)}
              {items.length > 1 && ` · ${activeIndex + 1} of ${items.length}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isPdf && currentItem.blobUrl && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-slate-200">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {currentItem.blobUrl && (
            <>
              <a
                href={currentItem.blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
                title="Open in new browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open</span>
              </a>

              <button
                type="button"
                onClick={() => triggerBlobDownload(currentItem.blobUrl!, currentItem.fileName)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
            aria-label="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Stage */}
      <div className="flex-1 relative overflow-auto flex items-center justify-center p-3 sm:p-6">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-white">
            <TechExpensesVideoLoader size="md" mode="loop" />
            <p className="text-xs font-medium text-slate-300">Loading attachment...</p>
          </div>
        ) : errorMessage ? (
          <div className="max-w-md p-6 bg-slate-900 border border-rose-500/40 rounded-2xl text-center text-white space-y-2">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <div className="text-sm font-bold">Unable to Load Attachment</div>
            <p className="text-xs text-slate-300">{errorMessage}</p>
          </div>
        ) : !currentItem.blobUrl ? (
          <div className="text-xs text-slate-400">Preview not ready.</div>
        ) : isPdf ? (
          <div className="w-full h-full max-w-4xl flex flex-col gap-3">
            <iframe
              src={currentItem.blobUrl}
              title={currentItem.fileName}
              className="w-full flex-1 min-h-[70vh] rounded-2xl bg-white border border-slate-700 shadow-xl"
            />
            <div className="flex items-center justify-center gap-3 text-xs text-slate-300 sm:hidden">
              <a
                href={currentItem.blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open PDF</span>
              </a>
              <button
                type="button"
                onClick={() => triggerBlobDownload(currentItem.blobUrl!, currentItem.fileName)}
                className="px-3.5 py-2 rounded-xl bg-white text-slate-900 font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-full max-h-full overflow-auto flex items-center justify-center">
            <img
              src={currentItem.blobUrl}
              alt={currentItem.fileName}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              className="max-h-[82vh] max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl transition-transform duration-150"
            />
          </div>
        )}

        {/* Prev / Next Navigation */}
        {items.length > 1 && (
          <>
            {activeIndex > 0 && (
              <button
                type="button"
                onClick={() => onChangeIndex(activeIndex - 1)}
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-lg cursor-pointer"
                aria-label="Previous attachment"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {activeIndex < items.length - 1 && (
              <button
                type="button"
                onClick={() => onChangeIndex(activeIndex + 1)}
                className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-lg cursor-pointer"
                aria-label="Next attachment"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
