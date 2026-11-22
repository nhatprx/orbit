import { useCallback, useEffect, useRef, useState } from 'react';
import type { CloudFilesApi } from '../../../../services/cloud/cloudApi';
import { isCloudNodeLocked, type CloudNodeDto } from '../../../../types/cloud.types';
import { useCollabRoom } from '../../../collab/useCollabRoom';
import type {
  OfficeDocContentDto,
  OfficeFormat,
  OfficeSheetContentDto,
  OfficeSlideContentDto,
} from './officeTypes';

const SLIDES_THROTTLE_MS = 80;
const DOC_DEBOUNCE_MS = 250;
const SHEET_SNAPSHOT_DEBOUNCE_MS = 350;
const CURSOR_THROTTLE_MS = 80;

export interface SheetMutationPayload {
  id: string;
  params: unknown;
}

export interface SheetCursorPayload {
  sheetName: string;
  row: number;
  col: number;
  cellLabel: string;
}

export interface UseOfficeCollabOptions {
  node: CloudNodeDto;
  api: CloudFilesApi;
  format: OfficeFormat;
  pdfMode: boolean;
  canWrite: boolean;
  canManage?: boolean;
  onRemoteDoc: (doc: OfficeDocContentDto) => void;
  onRemoteSheet: (sheet: OfficeSheetContentDto) => void;
  onRemoteSheetMutation: (mutation: SheetMutationPayload) => void;
  onRemoteSlide: (slide: OfficeSlideContentDto) => void;
  onRemoteCheckpoint: (updatedAt: string) => void;
  onSaved: (updated: CloudNodeDto) => void;
  onError: (msg: string) => void;
}

export function useOfficeCollab({
  node,
  api,
  format,
  pdfMode,
  canWrite,
  canManage,
  onRemoteDoc,
  onRemoteSheet,
  onRemoteSheetMutation,
  onRemoteSlide,
  onRemoteCheckpoint,
  onSaved,
  onError,
}: UseOfficeCollabOptions) {
  const [isLocked, setIsLocked] = useState(() => isCloudNodeLocked(node));
  const [lockPending, setLockPending] = useState(false);
  const [activeCellLabel, setActiveCellLabel] = useState<string | null>(null);

  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCursorSentRef = useRef(0);

  useEffect(() => {
    setIsLocked(isCloudNodeLocked(node));
  }, [node]);

  const effectiveCanWrite = !pdfMode && canWrite && !isLocked;
  const canToggleLock = node.canToggleLock ?? Boolean(canManage);

  const room = useCollabRoom({
    kind: 'cloud',
    resourceId: node.id,
    enabled: !pdfMode,
    onContentDelta: (subType, payload) => {
      if (subType === 'SHEET_MUTATION' && typeof payload.id === 'string') {
        onRemoteSheetMutation({ id: payload.id, params: payload.params });
      } else if (subType === 'SHEET_SNAPSHOT' && payload.sheet && typeof payload.sheet === 'object') {
        onRemoteSheet(payload.sheet as OfficeSheetContentDto);
      } else if (subType === 'SLIDES_SNAPSHOT' && Array.isArray(payload.slides)) {
        onRemoteSlide({ slides: payload.slides as OfficeSlideContentDto['slides'] });
      } else if (subType === 'DOC_SNAPSHOT' && payload.doc && typeof payload.doc === 'object') {
        onRemoteDoc(payload.doc as OfficeDocContentDto);
      }
    },
    onSavedCheckpoint: (payload) => {
      if (typeof payload.updatedAt === 'string') {
        onRemoteCheckpoint(payload.updatedAt);
      }
    },
    onLockChanged: (locked) => {
      setIsLocked(locked);
    },
  });

  const broadcastSheetMutation = useCallback(
    (mutation: SheetMutationPayload) => {
      if (!effectiveCanWrite) return;
      room.sendEdit('SHEET_MUTATION', { id: mutation.id, params: mutation.params });
    },
    [effectiveCanWrite, room]
  );

  const broadcastSheetSnapshot = useCallback(
    (sheet: OfficeSheetContentDto) => {
      if (!effectiveCanWrite) return;
      if (sheetTimerRef.current !== null) clearTimeout(sheetTimerRef.current);
      sheetTimerRef.current = setTimeout(() => {
        sheetTimerRef.current = null;
        room.sendEdit('SHEET_SNAPSHOT', { sheet });
      }, SHEET_SNAPSHOT_DEBOUNCE_MS);
    },
    [effectiveCanWrite, room]
  );

  const broadcastSlidesSnapshot = useCallback(
    (slide: OfficeSlideContentDto) => {
      if (!effectiveCanWrite) return;
      if (slideTimerRef.current !== null) clearTimeout(slideTimerRef.current);
      slideTimerRef.current = setTimeout(() => {
        slideTimerRef.current = null;
        room.sendEdit('SLIDES_SNAPSHOT', { slides: slide.slides });
      }, SLIDES_THROTTLE_MS);
    },
    [effectiveCanWrite, room]
  );

  const broadcastDocSnapshot = useCallback(
    (doc: OfficeDocContentDto) => {
      if (!effectiveCanWrite) return;
      if (docTimerRef.current !== null) clearTimeout(docTimerRef.current);
      docTimerRef.current = setTimeout(() => {
        docTimerRef.current = null;
        room.sendEdit('DOC_SNAPSHOT', { doc });
      }, DOC_DEBOUNCE_MS);
    },
    [effectiveCanWrite, room]
  );

  const broadcastSheetCursor = useCallback(
    (cursor: SheetCursorPayload) => {
      setActiveCellLabel(cursor.cellLabel);
      const now = Date.now();
      if (now - lastCursorSentRef.current < CURSOR_THROTTLE_MS) return;
      lastCursorSentRef.current = now;
      room.sendCursor({ ...cursor });
    },
    [room]
  );

  const broadcastSlideCursor = useCallback(
    (slideIndex: number) => {
      room.sendCursor({ slideIndex });
    },
    [room]
  );

  const handleToggleLock = useCallback(async () => {
    if (!api.setNodeLocked || lockPending) return;
    setLockPending(true);
    const nextLocked = !isLocked;
    try {
      const updated = await api.setNodeLocked(node.id, nextLocked);
      setIsLocked(isCloudNodeLocked(updated));
      onSaved(updated);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Failed to update document lock.');
    } finally {
      setLockPending(false);
    }
  }, [api, isLocked, lockPending, node.id, onError, onSaved]);

  const activeHint =
    format === 'XLSX' && activeCellLabel ? `Cell ${activeCellLabel}` : null;

  return {
    participants: room.participants,
    isLocked,
    lockPending,
    effectiveCanWrite,
    canToggleLock,
    activeHint,
    broadcastSheetMutation,
    broadcastSheetSnapshot,
    broadcastSlidesSnapshot,
    broadcastDocSnapshot,
    broadcastSheetCursor,
    broadcastSlideCursor,
    handleToggleLock,
  };
}
