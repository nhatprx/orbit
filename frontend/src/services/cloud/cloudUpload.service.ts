import type { CloudNodeDto, CompletedPart, InitUploadResponse } from '../../types/cloud.types';
import type { CloudFilesApi } from './cloudApi';

export type PutChunkFn = (
  url: string,
  body: Blob,
  headers: Record<string, string>,
  onProgress: (loadedBytes: number) => void,
  signal?: AbortSignal
) => Promise<{ etag: string }>;

export interface CloudUploadOptions {
  api: CloudFilesApi;
  file: File;
  parentId: string | null;
  signal?: AbortSignal;
  concurrency?: number;
  putChunk?: PutChunkFn;
  onSessionCreated?: (sessionId: string) => void;
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
  onCompleting?: () => void;
}

const DEFAULT_CONCURRENCY = 3;
const SIGN_BATCH_SIZE = 20;

export class UploadCancelledError extends Error {
  constructor() {
    super('Upload cancelled.');
    this.name = 'UploadCancelledError';
  }
}

export function xhrPutChunk(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  onProgress: (loadedBytes: number) => void,
  signal?: AbortSignal
): Promise<{ etag: string }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadCancelledError());
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    const onAbort = () => {
      xhr.abort();
      reject(new UploadCancelledError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    xhr.onerror = () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new Error('Storage upload failed due to a network error.'));
    };
    xhr.onload = () => {
      signal?.removeEventListener('abort', onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(body.size);
        const rawEtag = xhr.getResponseHeader('ETag') ?? xhr.getResponseHeader('etag') ?? '';
        resolve({ etag: rawEtag.replace(/^"|"$/g, '') });
      } else {
        reject(new Error(`Storage upload failed (${xhr.status}).`));
      }
    };
    xhr.send(body);
  });
}

async function runMultipartUpload(
  init: InitUploadResponse,
  opts: CloudUploadOptions,
  putChunk: PutChunkFn
): Promise<CompletedPart[]> {
  const { api, file, signal, onProgress } = opts;
  const concurrency = Math.max(1, opts.concurrency ?? DEFAULT_CONCURRENCY);
  const totalParts = Math.max(1, init.totalParts);
  const partSize = init.partSizeBytes;

  const signedUrls = new Map<number, string>();
  for (let start = 1; start <= totalParts; start += SIGN_BATCH_SIZE) {
    const batch: number[] = [];
    for (let n = start; n < start + SIGN_BATCH_SIZE && n <= totalParts; n += 1) {
      batch.push(n);
    }
    const res = await api.signUploadParts(init.sessionId, { partNumbers: batch }, signal);
    for (const part of res.parts) {
      signedUrls.set(part.partNumber, part.uploadUrl);
    }
  }

  const loadedByPart = new Map<number, number>();
  const completed: CompletedPart[] = [];
  let cursor = 1;

  const reportTotal = () => {
    let sum = 0;
    for (const v of loadedByPart.values()) sum += v;
    onProgress?.(Math.min(sum, file.size), file.size);
  };

  async function worker() {
    while (cursor <= totalParts) {
      if (signal?.aborted) throw new UploadCancelledError();
      const partNumber = cursor;
      cursor += 1;
      const url = signedUrls.get(partNumber);
      if (!url) throw new Error(`Missing presigned URL for part ${partNumber}.`);

      const startByte = (partNumber - 1) * partSize;
      const endByte = Math.min(startByte + partSize, file.size);
      const chunk = file.slice(startByte, endByte);

      const { etag } = await putChunk(
        url,
        chunk,
        {},
        (loaded) => {
          loadedByPart.set(partNumber, loaded);
          reportTotal();
        },
        signal
      );
      loadedByPart.set(partNumber, chunk.size);
      reportTotal();
      completed.push({ partNumber, etag });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, totalParts) }, () => worker()));
  return completed.sort((a, b) => a.partNumber - b.partNumber);
}

export async function uploadCloudFile(opts: CloudUploadOptions): Promise<CloudNodeDto> {
  const { api, file, parentId, signal, onSessionCreated, onProgress, onCompleting } = opts;
  const putChunk = opts.putChunk ?? xhrPutChunk;

  const init = await api.initUpload(
    {
      parentId,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    },
    signal
  );
  onSessionCreated?.(init.sessionId);

  try {
    if (init.strategy === 'SINGLE') {
      if (!init.uploadUrl) throw new Error('Server did not return a presigned upload URL.');
      await putChunk(
        init.uploadUrl,
        file,
        init.uploadHeaders ?? {},
        (loaded) => onProgress?.(loaded, file.size),
        signal
      );
      onCompleting?.();
      return await api.completeUpload(init.sessionId, {}, signal);
    }

    const parts = await runMultipartUpload(init, opts, putChunk);
    onCompleting?.();
    return await api.completeUpload(init.sessionId, { parts }, signal);
  } catch (error) {
    await api.abortUpload(init.sessionId).catch(() => undefined);
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new UploadCancelledError();
    }
    throw error;
  }
}
