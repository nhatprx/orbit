import { useCallback, useEffect, useRef } from 'react';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useCollabRoom } from '../collab/useCollabRoom';
import {
  buildExcalidrawCollaboratorsMap,
  getCaptureUpdateNever,
  reconcileRemoteExcalidrawElements,
  type PointerUpdatePayload,
} from './whiteboardCollabHelpers';
import type { WhiteboardSceneSnapshot } from './whiteboardSceneSync';

const DELTA_THROTTLE_MS = 60;
const CURSOR_THROTTLE_MS = 60;

export interface UseWhiteboardCollabOptions {
  boardId: string;
  canWrite: boolean;
  enabled?: boolean;
  onSceneChange: (snapshot: WhiteboardSceneSnapshot) => void;
  onRemoteCheckpoint: (version: number, updatedAt?: string) => void;
  onRemoteLockChanged: (locked: boolean, lockedBy?: string | null, lockedAt?: string | null) => void;
  onRemoteAssetReady: () => void;
}

export function useWhiteboardCollab({
  boardId,
  canWrite,
  enabled = true,
  onSceneChange,
  onRemoteCheckpoint,
  onRemoteLockChanged,
  onRemoteAssetReady,
}: UseWhiteboardCollabOptions) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const lastVersionByIdRef = useRef<Map<string, number>>(new Map());
  const pendingDeltaRef = useRef<Map<string, Record<string, unknown>>>(new Map());
  const deltaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCursorSentAtRef = useRef(0);

  const applyIncomingElements = useCallback((rawElements: readonly Record<string, unknown>[]) => {
    const api = apiRef.current;
    if (!api || rawElements.length === 0) return;
    const nextElements = reconcileRemoteExcalidrawElements(api, rawElements, lastVersionByIdRef.current);
    const captureNever = getCaptureUpdateNever();
    isApplyingRemoteRef.current = true;
    try {
      api.updateScene({
        elements: nextElements,
        ...(captureNever ? { captureUpdate: captureNever as never } : {}),
      });
    } finally {
      isApplyingRemoteRef.current = false;
    }
  }, []);

  const room = useCollabRoom({
    kind: 'whiteboard',
    resourceId: boardId,
    enabled,
    onContentDelta: (subType, payload) => {
      if (subType === 'ASSET_READY') {
        onRemoteAssetReady();
        return;
      }
      if (subType === 'EXCALIDRAW_ELEMENTS' || Array.isArray(payload.elements)) {
        const elements = Array.isArray(payload.elements)
          ? (payload.elements as Record<string, unknown>[])
          : [];
        applyIncomingElements(elements);
      }
    },
    onAssetReady: () => onRemoteAssetReady(),
    onSavedCheckpoint: (payload) => {
      const version = typeof payload.version === 'number' ? payload.version : null;
      const updatedAt = typeof payload.updatedAt === 'string' ? payload.updatedAt : undefined;
      if (version !== null) onRemoteCheckpoint(version, updatedAt);
    },
    onLockChanged: (locked, payload) => {
      onRemoteLockChanged(
        locked,
        typeof payload.lockedBy === 'string' ? payload.lockedBy : null,
        typeof payload.lockedAt === 'string' ? payload.lockedAt : null
      );
    },
  });

  useEffect(() => {
    lastVersionByIdRef.current.clear();
    pendingDeltaRef.current.clear();
    if (deltaTimerRef.current !== null) {
      clearTimeout(deltaTimerRef.current);
      deltaTimerRef.current = null;
    }
  }, [boardId]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const collaborators = buildExcalidrawCollaboratorsMap(room.participants);
    isApplyingRemoteRef.current = true;
    try {
      api.updateScene({ collaborators });
    } finally {
      isApplyingRemoteRef.current = false;
    }
  }, [room.participants]);

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI | null) => {
    apiRef.current = api;
    if (!api) return;
    lastVersionByIdRef.current.clear();
    for (const el of api.getSceneElements()) {
      lastVersionByIdRef.current.set(el.id, el.version);
    }
  }, []);

  const handleCollabSceneChange = useCallback(
    (snapshot: WhiteboardSceneSnapshot) => {
      if (isApplyingRemoteRef.current) return;
      onSceneChange(snapshot);
      if (!canWrite) return;

      const elements = snapshot.sceneJson.elements ?? [];
      const hasSeeded = lastVersionByIdRef.current.size > 0;
      for (const el of elements) {
        const id = typeof el.id === 'string' ? el.id : null;
        const ver = typeof el.version === 'number' ? el.version : 0;
        if (!id) continue;
        const prevVer = lastVersionByIdRef.current.get(id);
        lastVersionByIdRef.current.set(id, ver);
        if (hasSeeded && (prevVer === undefined || ver > prevVer)) {
          pendingDeltaRef.current.set(id, el);
        }
      }

      if (pendingDeltaRef.current.size > 0 && deltaTimerRef.current === null) {
        deltaTimerRef.current = setTimeout(() => {
          deltaTimerRef.current = null;
          const batch = [...pendingDeltaRef.current.values()];
          pendingDeltaRef.current.clear();
          if (batch.length > 0) room.sendEdit('EXCALIDRAW_ELEMENTS', { elements: batch });
        }, DELTA_THROTTLE_MS);
      }
    },
    [canWrite, onSceneChange, room]
  );

  const handlePointerUpdate = useCallback(
    (payload: PointerUpdatePayload) => {
      const now = Date.now();
      if (now - lastCursorSentAtRef.current < CURSOR_THROTTLE_MS) return;
      lastCursorSentAtRef.current = now;
      room.sendCursor({
        pointer: payload.pointer,
        button: payload.button,
        selectedElementIds: apiRef.current?.getAppState?.()?.selectedElementIds ?? {},
      });
    },
    [room]
  );

  const notifyAssetUploaded = useCallback(
    (fileId: string) => room.sendEdit('ASSET_READY', { fileId }),
    [room]
  );

  return {
    participants: room.participants,
    handleApiReady,
    handleCollabSceneChange,
    handlePointerUpdate,
    notifyAssetUploaded,
  };
}
