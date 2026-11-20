import { useCallback, useEffect, useRef, useState } from 'react';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import { UploadCancelledError, uploadCloudFile } from '../../services/cloud/cloudUpload.service';
import { errorMessage } from '../../services/workspace/httpClient';
import type { CloudQuotaDto, UploadTaskItem } from '../../types/cloud.types';
import { formatBytes } from './cloudFormat';

let nextLocalId = 1;

export interface CloudUploadsState {
  tasks: UploadTaskItem[];
  enqueueFiles: (files: File[], parentId: string | null) => void;
  cancelTask: (localId: string) => void;
  dismissTask: (localId: string) => void;
  clearFinished: () => void;
}

export function useCloudUploads(
  api: CloudFilesApi,
  scopeKey: string,
  quota: CloudQuotaDto | null,
  onUploaded: () => void
): CloudUploadsState {
  const [tasks, setTasks] = useState<UploadTaskItem[]>([]);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    for (const ctrl of controllersRef.current.values()) ctrl.abort();
    controllersRef.current.clear();
    setTasks([]);
  }, [scopeKey]);

  const updateTask = useCallback((localId: string, patch: Partial<UploadTaskItem>) => {
    setTasks((prev) => prev.map((t) => (t.localId === localId ? { ...t, ...patch } : t)));
  }, []);

  const enqueueFiles = useCallback(
    (files: File[], parentId: string | null) => {
      for (const file of files) {
        const localId = `upload-${nextLocalId++}`;
        const maxSize = quota?.maxFileSizeBytes;
        if (maxSize && file.size > maxSize) {
          setTasks((prev) => [
            {
              localId,
              fileName: file.name,
              sizeBytes: file.size,
              uploadedBytes: 0,
              progress: 0,
              status: 'error',
              error: `File exceeds maximum size of ${formatBytes(maxSize)}.`,
              sessionId: null,
            },
            ...prev,
          ]);
          continue;
        }

        const controller = new AbortController();
        controllersRef.current.set(localId, controller);

        setTasks((prev) => [
          {
            localId,
            fileName: file.name,
            sizeBytes: file.size,
            uploadedBytes: 0,
            progress: 0,
            status: 'uploading',
            error: null,
            sessionId: null,
          },
          ...prev,
        ]);

        void uploadCloudFile({
          api,
          file,
          parentId,
          signal: controller.signal,
          onSessionCreated: (sessionId) => updateTask(localId, { sessionId }),
          onProgress: (uploadedBytes, totalBytes) => {
            const pct = totalBytes > 0 ? Math.min(99, Math.round((uploadedBytes / totalBytes) * 100)) : 99;
            updateTask(localId, { uploadedBytes, progress: pct });
          },
          onCompleting: () => updateTask(localId, { status: 'completing', progress: 99 }),
        })
          .then(() => {
            updateTask(localId, { status: 'done', uploadedBytes: file.size, progress: 100 });
            onUploaded();
          })
          .catch((err) => {
            if (err instanceof UploadCancelledError) {
              updateTask(localId, { status: 'cancelled', error: null });
            } else {
              updateTask(localId, {
                status: 'error',
                error: errorMessage(err, 'Upload failed.'),
              });
            }
          })
          .finally(() => {
            controllersRef.current.delete(localId);
          });
      }
    },
    [api, quota, onUploaded, updateTask]
  );

  const cancelTask = useCallback((localId: string) => {
    controllersRef.current.get(localId)?.abort();
  }, []);

  const dismissTask = useCallback((localId: string) => {
    controllersRef.current.get(localId)?.abort();
    controllersRef.current.delete(localId);
    setTasks((prev) => prev.filter((t) => t.localId !== localId));
  }, []);

  const clearFinished = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status === 'queued' || t.status === 'uploading' || t.status === 'completing'));
  }, []);

  return { tasks, enqueueFiles, cancelTask, dismissTask, clearFinished };
}
