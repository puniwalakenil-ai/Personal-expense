import {
  doc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AttachmentModuleType,
  AttachmentSourceMethod,
  PendingAttachmentDraft,
  TransactionAttachmentMeta,
} from '../types';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
] as const;

export const MAX_STORED_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per stored attachment
export const MAX_RAW_IMAGE_BYTES = 50 * 1024 * 1024; // 50 MB raw camera photo before optimization
export const MAX_ATTACHMENTS_PER_ENTRY = 15;
const CHUNK_CHAR_LIMIT = 250_000; // ~250 KB Base64 text per chunk doc (safely < 1MB Firestore limit)

const IDB_NAME = 'tech_expenses_attachments_v1';
const IDB_STORE = 'files';
const IDB_VERSION = 1;

// In-memory Blob URL cache scoped by `${userId}:${attachmentId}`
const objectUrlCache = new Map<string, { blobUrl: string; blob: Blob; mimeType: string }>();

function getCacheKey(userId: string, attachmentId: string): string {
  return `${userId}:${attachmentId}`;
}

export function createAttachmentId(): string {
  const rand = Math.random().toString(36).slice(2, 9);
  const ts = Date.now().toString(36);
  return `att_${ts}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Open IndexedDB safely (gracefully no-ops in restricted private tabs)
function openAttachmentDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(IDB_STORE)) {
          database.createObjectStore(IDB_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGetBlob(key: string): Promise<{ blob: Blob; mimeType: string } | null> {
  const database = await openAttachmentDB();
  if (!database) return null;
  return new Promise((resolve) => {
    try {
      const tx = database.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const val = req.result;
        if (val && val.blob instanceof Blob) {
          resolve({ blob: val.blob, mimeType: val.mimeType || val.blob.type });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPutBlob(key: string, blob: Blob, mimeType: string, fileName: string): Promise<void> {
  const database = await openAttachmentDB();
  if (!database) return;
  return new Promise((resolve) => {
    try {
      const tx = database.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({
        key,
        blob,
        mimeType,
        fileName,
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function idbDeleteBlob(key: string): Promise<void> {
  const database = await openAttachmentDB();
  if (!database) return;
  return new Promise((resolve) => {
    try {
      const tx = database.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  return btoa(parts.join(''));
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback deterministic digest if subtle crypto is absent
  const bytes = new Uint8Array(buffer);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < bytes.length; i++) {
    h1 ^= bytes[i];
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ bytes[i], 0x85ebca6b);
  }
  return `fb_${(h1 >>> 0).toString(16)}_${(h2 >>> 0).toString(16)}_${bytes.length}`;
}

function validateMagicBytes(bytes: Uint8Array, expected: 'pdf' | 'image'): boolean {
  if (bytes.length < 4) return false;

  if (expected === 'pdf') {
    // Allow optional leading whitespace/BOM before %PDF-
    const headLimit = Math.min(bytes.length - 4, 1024);
    for (let i = 0; i <= headLimit; i++) {
      if (
        bytes[i] === 0x25 && // %
        bytes[i + 1] === 0x50 && // P
        bytes[i + 2] === 0x44 && // D
        bytes[i + 3] === 0x46 // F
      ) {
        return true;
      }
    }
    return false;
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  // GIF: GIF8
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
  // WEBP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }
  // HEIC / HEIF / AVIF ISO BMFF ftyp box at byte offset 4
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && // f
    bytes[5] === 0x74 && // t
    bytes[6] === 0x79 && // y
    bytes[7] === 0x70 // p
  ) {
    return true;
  }
  // BMP: BM
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return true;

  return false;
}

async function decodeImageForCanvas(file: Blob): Promise<{
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement
    }
  }

  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        cleanup: () => URL.revokeObjectURL(url),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Selected image file is corrupted or unsupported on this browser.'));
    };
    img.src = url;
  });
}

async function optimizeImageAndThumbnail(
  file: File
): Promise<{
  blob: Blob;
  mimeType: string;
  thumbnailDataUrl: string;
}> {
  const decoded = await decodeImageForCanvas(file);
  try {
    const { width, height, draw } = decoded;
    if (!width || !height) {
      throw new Error('Could not read image dimensions.');
    }

    // Generate compact preview thumbnail (max 160px)
    const thumbScale = Math.min(1, 160 / Math.max(width, height));
    const thumbW = Math.max(1, Math.round(width * thumbScale));
    const thumbH = Math.max(1, Math.round(height * thumbScale));
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbW;
    thumbCanvas.height = thumbH;
    const thumbCtx = thumbCanvas.getContext('2d');
    let thumbnailDataUrl = '';
    if (thumbCtx) {
      thumbCtx.fillStyle = '#ffffff';
      thumbCtx.fillRect(0, 0, thumbW, thumbH);
      draw(thumbCtx, thumbW, thumbH);
      thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.72);
      if (thumbnailDataUrl.length > 75_000) {
        thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.5);
      }
    }

    // Keep animated GIFs or already-compact WebP/JPEG/PNG if <= 1.2 MB and <= 1800px
    const isStandardSupported =
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      file.type === 'image/webp' ||
      file.type === 'image/gif';

    if (
      isStandardSupported &&
      file.size <= 1.2 * 1024 * 1024 &&
      Math.max(width, height) <= 1800
    ) {
      return {
        blob: file,
        mimeType: file.type,
        thumbnailDataUrl,
      };
    }

    // Resize & compress to JPEG (max 1800px) so mobile photos upload fast and reliably
    const maxDim = 1800;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { blob: file, mimeType: file.type || 'image/jpeg', thumbnailDataUrl };
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    draw(ctx, targetW, targetH);

    const outMime = file.type === 'image/png' && file.size <= 2 * 1024 * 1024 ? 'image/png' : 'image/jpeg';
    const quality = outMime === 'image/jpeg' ? 0.84 : undefined;

    const compressedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to process photo.'))),
        outMime,
        quality
      );
    });

    // If PNG stayed larger than JPEG fallback, re-encode as JPEG
    if (compressedBlob.size > MAX_STORED_FILE_BYTES) {
      const jpegRetry = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Photo exceeds 10 MB limit after compression.'))),
          'image/jpeg',
          0.7
        );
      });
      return {
        blob: jpegRetry,
        mimeType: 'image/jpeg',
        thumbnailDataUrl,
      };
    }

    return {
      blob: compressedBlob,
      mimeType: compressedBlob.type || outMime,
      thumbnailDataUrl,
    };
  } finally {
    decoded.cleanup();
  }
}

export async function prepareAttachmentDraft(
  file: File,
  sourceMethod: AttachmentSourceMethod,
  existingHashes: Set<string>,
  onProgress?: (percent: number, stage: string) => void
): Promise<PendingAttachmentDraft> {
  if (!file || file.size <= 0) {
    throw new Error('The selected file is empty (0 bytes).');
  }

  const lowerName = (file.name || '').toLowerCase();
  const isPdfMethod = sourceMethod === 'pdf';
  const looksLikePdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
  const looksLikeImage =
    ALLOWED_IMAGE_MIME_TYPES.includes(file.type as any) ||
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(lowerName);

  if (isPdfMethod && !looksLikePdf) {
    throw new Error(`"${file.name}" is not a valid PDF document.`);
  }
  if (!isPdfMethod && !looksLikeImage) {
    throw new Error(`"${file.name}" is not a supported image format (JPG, PNG, WEBP, GIF, HEIC).`);
  }

  if (looksLikePdf && file.size > MAX_STORED_FILE_BYTES) {
    throw new Error(
      `"${file.name}" (${formatFileSize(file.size)}) exceeds the 10 MB PDF size limit.`
    );
  }
  if (!looksLikePdf && file.size > MAX_RAW_IMAGE_BYTES) {
    throw new Error(
      `"${file.name}" (${formatFileSize(file.size)}) exceeds the 50 MB photo input limit.`
    );
  }

  onProgress?.(15, 'Validating file...');
  const rawBuffer = await file.arrayBuffer();
  const rawBytes = new Uint8Array(rawBuffer);

  if (looksLikePdf) {
    if (!validateMagicBytes(rawBytes, 'pdf')) {
      throw new Error(`"${file.name}" failed PDF header validation. Please choose a valid PDF file.`);
    }
  } else {
    if (!validateMagicBytes(rawBytes, 'image')) {
      // Allow browser decode check below to confirm if valid image format
      await decodeImageForCanvas(file).then((d) => d.cleanup());
    }
  }

  onProgress?.(35, 'Checking for duplicates...');
  const contentHash = await computeSha256Hex(rawBuffer);
  if (existingHashes.has(contentHash)) {
    throw new Error(`"${file.name}" is already attached to this entry.`);
  }

  let finalBlob: Blob = file;
  let finalMime: string = looksLikePdf ? 'application/pdf' : file.type || 'image/jpeg';
  let thumbnailDataUrl: string | undefined;

  if (!looksLikePdf) {
    onProgress?.(55, 'Optimizing photo...');
    const processed = await optimizeImageAndThumbnail(file);
    finalBlob = processed.blob;
    finalMime = processed.mimeType;
    thumbnailDataUrl = processed.thumbnailDataUrl || undefined;
  }

  if (finalBlob.size > MAX_STORED_FILE_BYTES) {
    throw new Error(
      `"${file.name}" (${formatFileSize(finalBlob.size)}) exceeds the 10 MB maximum attachment size.`
    );
  }

  // Normalize safe file extension if missing
  let cleanFileName = (file.name || (looksLikePdf ? 'document.pdf' : 'photo.jpg')).trim();
  if (cleanFileName.length > 240) {
    cleanFileName = cleanFileName.slice(0, 240);
  }
  if (!looksLikePdf && finalMime === 'image/jpeg' && !/\.(jpe?g)$/i.test(cleanFileName)) {
    cleanFileName = cleanFileName.replace(/\.[^.]+$/, '') + '.jpg';
  }

  onProgress?.(85, 'Preparing preview...');
  const finalBuffer = await finalBlob.arrayBuffer();
  const base64Data = arrayBufferToBase64(finalBuffer);
  const previewUrl = URL.createObjectURL(finalBlob);

  onProgress?.(100, 'Ready');
  return {
    id: createAttachmentId(),
    fileName: cleanFileName,
    mimeType: finalMime,
    fileSize: finalBlob.size,
    originalSize: file.size,
    sourceMethod,
    contentHash,
    base64Data,
    previewUrl,
    thumbnailDataUrl,
    createdAt: new Date().toISOString(),
  };
}

export async function savePendingAttachmentsToVault(params: {
  userId?: string | null;
  transactionId: string;
  moduleType: AttachmentModuleType;
  accountScopeId?: string;
  drafts: PendingAttachmentDraft[];
  onProgress?: (percent: number, label: string) => void;
}): Promise<TransactionAttachmentMeta[]> {
  const { userId, transactionId, moduleType, accountScopeId, drafts, onProgress } = params;
  if (!drafts.length) return [];

  const totalSteps = drafts.reduce(
    (sum, d) => sum + 1 + Math.max(1, Math.ceil(d.base64Data.length / CHUNK_CHAR_LIMIT)),
    0
  );
  let completedSteps = 0;

  const savedMetas: TransactionAttachmentMeta[] = [];

  for (let idx = 0; idx < drafts.length; idx++) {
    const draft = drafts[idx];
    const chunkCount = Math.max(1, Math.ceil(draft.base64Data.length / CHUNK_CHAR_LIMIT));

    if (chunkCount > 80) {
      throw new Error(`"${draft.fileName}" is too large to upload safely. Please keep files under 10 MB.`);
    }

    const meta: TransactionAttachmentMeta = {
      id: draft.id,
      fileName: draft.fileName,
      mimeType: draft.mimeType,
      fileSize: draft.fileSize,
      ...(draft.originalSize ? { originalSize: draft.originalSize } : {}),
      sourceMethod: draft.sourceMethod,
      contentHash: draft.contentHash,
      moduleType,
      ...(accountScopeId ? { accountScopeId } : {}),
      chunkCount,
      ...(draft.thumbnailDataUrl ? { thumbnailDataUrl: draft.thumbnailDataUrl } : {}),
      createdAt: draft.createdAt,
    };

    // Always cache locally in IndexedDB + memory first for instant offline/preview responsiveness
    const cacheScopeUid = userId || 'local';
    const blob = base64ToBlob(draft.base64Data, draft.mimeType);
    const cacheKey = getCacheKey(cacheScopeUid, draft.id);
    if (!objectUrlCache.has(cacheKey)) {
      const blobUrl = URL.createObjectURL(blob);
      objectUrlCache.set(cacheKey, { blobUrl, blob, mimeType: draft.mimeType });
    }
    await idbPutBlob(cacheKey, blob, draft.mimeType, draft.fileName);

    if (userId) {
      // Upload attachment metadata doc + chunk slices in safe <=10-doc writeBatches
      const attachmentDocPayload: Record<string, any> = {
        id: meta.id,
        transactionId,
        moduleType,
        fileName: meta.fileName,
        mimeType: meta.mimeType,
        fileSize: meta.fileSize,
        sourceMethod: meta.sourceMethod,
        contentHash: meta.contentHash,
        chunkCount: meta.chunkCount,
        createdAt: meta.createdAt,
      };
      if (accountScopeId) attachmentDocPayload.accountScopeId = accountScopeId;
      if (meta.originalSize) attachmentDocPayload.originalSize = meta.originalSize;
      if (meta.thumbnailDataUrl) attachmentDocPayload.thumbnailDataUrl = meta.thumbnailDataUrl;

      try {
        const metaBatch = writeBatch(db);
        metaBatch.set(
          doc(db, 'users', userId, 'attachments', meta.id),
          attachmentDocPayload
        );
        await metaBatch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${userId}/attachments/${meta.id}`);
      }

      completedSteps += 1;
      onProgress?.(
        Math.min(99, Math.round((completedSteps / totalSteps) * 100)),
        `Uploading ${draft.fileName} (${idx + 1}/${drafts.length})...`
      );

      // Write chunks in batches of up to 8 chunks (~2 MB per batch)
      const CHUNKS_PER_BATCH = 8;
      for (let start = 0; start < chunkCount; start += CHUNKS_PER_BATCH) {
        const batch = writeBatch(db);
        const end = Math.min(chunkCount, start + CHUNKS_PER_BATCH);
        for (let c = start; c < end; c++) {
          const slice = draft.base64Data.slice(c * CHUNK_CHAR_LIMIT, (c + 1) * CHUNK_CHAR_LIMIT);
          const chunkId = `${meta.id}_chunk_${c}`;
          batch.set(doc(db, 'users', userId, 'attachmentChunks', chunkId), {
            id: chunkId,
            attachmentId: meta.id,
            transactionId,
            chunkIndex: c,
            data: slice,
            createdAt: meta.createdAt,
          });
        }
        try {
          await batch.commit();
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.CREATE,
            `users/${userId}/attachmentChunks/${meta.id}_chunk_${start}`
          );
        }
        completedSteps += end - start;
        onProgress?.(
          Math.min(99, Math.round((completedSteps / totalSteps) * 100)),
          `Uploading ${draft.fileName} (${idx + 1}/${drafts.length})...`
        );
      }
    } else {
      completedSteps += 1 + chunkCount;
      onProgress?.(Math.min(99, Math.round((completedSteps / totalSteps) * 100)), `Saved ${draft.fileName}`);
    }

    savedMetas.push(meta);
  }

  onProgress?.(100, 'Upload complete');
  return savedMetas;
}

export async function loadAttachmentBlobUrl(params: {
  userId?: string | null;
  meta: TransactionAttachmentMeta;
  onProgress?: (percent: number) => void;
}): Promise<{ blobUrl: string; blob: Blob; mimeType: string }> {
  const { userId, meta, onProgress } = params;
  const cacheScopeUid = userId || 'local';
  const key = getCacheKey(cacheScopeUid, meta.id);

  const memHit = objectUrlCache.get(key);
  if (memHit) {
    onProgress?.(100);
    return memHit;
  }

  onProgress?.(10);
  const idbHit = await idbGetBlob(key);
  if (idbHit) {
    const blobUrl = URL.createObjectURL(idbHit.blob);
    const entry = { blobUrl, blob: idbHit.blob, mimeType: idbHit.mimeType || meta.mimeType };
    objectUrlCache.set(key, entry);
    onProgress?.(100);
    return entry;
  }

  if (!userId) {
    throw new Error(`Attachment "${meta.fileName}" is not available offline. Please sign in to load from cloud.`);
  }

  const chunkCount = Math.max(1, meta.chunkCount || 1);
  const base64Parts: string[] = new Array(chunkCount);

  for (let i = 0; i < chunkCount; i++) {
    const chunkId = `${meta.id}_chunk_${i}`;
    const chunkRef = doc(db, 'users', userId, 'attachmentChunks', chunkId);
    let snap;
    try {
      snap = await getDoc(chunkRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${userId}/attachmentChunks/${chunkId}`);
    }
    if (!snap || !snap.exists()) {
      throw new Error(`Attachment chunk ${i + 1} of ${chunkCount} for "${meta.fileName}" is missing.`);
    }
    const chunkData = snap.data() as { data?: string };
    if (!chunkData?.data) {
      throw new Error(`Corrupted attachment payload for "${meta.fileName}".`);
    }
    base64Parts[i] = chunkData.data;
    onProgress?.(Math.min(95, Math.round(((i + 1) / chunkCount) * 90)));
  }

  const blob = base64ToBlob(base64Parts.join(''), meta.mimeType);
  await idbPutBlob(key, blob, meta.mimeType, meta.fileName);

  const blobUrl = URL.createObjectURL(blob);
  const entry = { blobUrl, blob, mimeType: meta.mimeType };
  objectUrlCache.set(key, entry);
  onProgress?.(100);
  return entry;
}

export async function deleteAttachmentsFromVault(params: {
  userId?: string | null;
  attachments: TransactionAttachmentMeta[];
}): Promise<void> {
  const { userId, attachments } = params;
  if (!attachments.length) return;

  const cacheScopeUid = userId || 'local';

  for (const meta of attachments) {
    const key = getCacheKey(cacheScopeUid, meta.id);
    const mem = objectUrlCache.get(key);
    if (mem) {
      URL.revokeObjectURL(mem.blobUrl);
      objectUrlCache.delete(key);
    }
    await idbDeleteBlob(key);

    if (userId) {
      const chunkCount = Math.max(1, meta.chunkCount || 1);
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', userId, 'attachments', meta.id));
      for (let i = 0; i < chunkCount; i++) {
        batch.delete(doc(db, 'users', userId, 'attachmentChunks', `${meta.id}_chunk_${i}`));
      }
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}/attachments/${meta.id}`);
      }
    }
  }
}

export function triggerBlobDownload(blobUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName || 'attachment';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
