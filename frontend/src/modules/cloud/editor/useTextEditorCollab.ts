import { useCallback, useEffect, useRef, useState } from 'react';
import type { CloudFilesApi } from '../../../services/cloud/cloudApi';
import { isCloudNodeLocked, type CloudNodeDto } from '../../../types/cloud.types';
import { useCollabRoom } from '../../collab/useCollabRoom';
import type { CodeMirrorCursor } from './CodeMirrorHost';

const TEXT_SYNC_THROTTLE_MS = 120;
const CURSOR_THROTTLE_MS = 100;

export interface UseTextEditorCollabOptions {
  node: CloudNodeDto | null;
  api: CloudFilesApi;
  canWrite: boolean;
  canManage?: boolean;
  onRemoteContent: (content: string) => void;
  onRemoteCheckpoint: (updatedAt?: string, content?: string) => void;
  onSaved: (updated: CloudNodeDto) => void;
  onError: (msg: string) => void;
}

export function useTextEditorCollab({
  node,
  api,
  canWrite,
  canManage,
  onRemoteContent,
  onRemoteCheckpoint,
  onSaved,
  onError,
}: UseTextEditorCollabOptions) {
  const [isLocked, setIsLocked] = useState(() => isCloudNodeLocked(node));
  const [lockPending, setLockPending] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBroadcastRef = useRef<string | null>(null);
  const lastCursorSentRef = useRef(0);

  useEffect(() => {
    setIsLocked(isCloudNodeLocked(node));
  }, [node]);

  const effectiveCanWrite = canWrite && !isLocked;
  const canToggleLock = node?.canToggleLock ?? Boolean(canManage);

  const room = useCollabRoom({
    kind: 'cloud',
    resourceId: node?.id ?? null,
    enabled: Boolean(node),
    onContentDelta: (subType, payload) => {
      if ((subType === 'TEXT_SYNC' || !subType) && typeof payload.content === 'string') {
        onRemoteContent(payload.content);
      }
    },
    onSavedCheckpoint: (payload) => {
      onRemoteCheckpoint(
        typeof payload.updatedAt === 'string' ? payload.updatedAt : undefined,
        typeof payload.content === 'string' ? payload.content : undefined
      );
    },
    onLockChanged: (locked) => {
      setIsLocked(locked);
    },
  });

  const broadcastTextChange = useCallback(
    (nextVal: string) => {
      if (!effectiveCanWrite) return;
      pendingBroadcastRef.current = nextVal;
      if (syncTimerRef.current === null) {
        syncTimerRef.current = setTimeout(() => {
          syncTimerRef.current = null;
          if (pendingBroadcastRef.current !== null) {
            room.sendEdit('TEXT_SYNC', { content: pendingBroadcastRef.current });
            pendingBroadcastRef.current = null;
          }
        }, TEXT_SYNC_THROTTLE_MS);
      }
    },
    [effectiveCanWrite, room]
  );

  const handleCursorChange = useCallback(
    (cursor: CodeMirrorCursor) => {
      const now = Date.now();
      if (now - lastCursorSentRef.current < CURSOR_THROTTLE_MS) return;
      lastCursorSentRef.current = now;
      room.sendCursor({ line: cursor.line, col: cursor.col, offset: cursor.offset });
    },
    [room]
  );

  const handleToggleLock = useCallback(async () => {
    if (!node || !api.setNodeLocked || lockPending) return;
    setLockPending(true);
    const nextLocked = !isLocked;
    try {
      const updated = await api.setNodeLocked(node.id, nextLocked);
      setIsLocked(isCloudNodeLocked(updated));
      onSaved(updated);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Failed to update file lock.');
    } finally {
      setLockPending(false);
    }
  }, [api, isLocked, lockPending, node, onError, onSaved]);

  return {
    participants: room.participants,
    isLocked,
    lockPending,
    effectiveCanWrite,
    canToggleLock,
    broadcastTextChange,
    handleCursorChange,
    handleToggleLock,
  };
}
