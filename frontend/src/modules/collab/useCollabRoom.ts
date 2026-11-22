import { useCallback, useEffect, useRef, useState } from 'react';
import { getStoredSession } from '../../services/auth.storage';
import {
  collabClient,
  pickCollaboratorColor,
  type CollabStompClient,
} from '../../services/collab/collabClient';
import type {
  CollabDestinationKind,
  CollabParticipant,
  CollabRoomEvent,
} from '../../types/collab.types';

export interface UseCollabRoomOptions {
  kind: CollabDestinationKind;
  resourceId: string | null;
  enabled?: boolean;
  client?: CollabStompClient;
  onContentDelta?: (subType: string, payload: Record<string, unknown>, event: CollabRoomEvent) => void;
  onAssetReady?: (payload: Record<string, unknown>, event: CollabRoomEvent) => void;
  onSavedCheckpoint?: (payload: Record<string, unknown>, event: CollabRoomEvent) => void;
  onLockChanged?: (locked: boolean, payload: Record<string, unknown>, event: CollabRoomEvent) => void;
}

export function unwrapDeltaPayload(raw?: Record<string, unknown> | null): {
  subType: string;
  inner: Record<string, unknown>;
} {
  if (!raw) return { subType: '', inner: {} };
  const subType = typeof raw.subType === 'string' ? raw.subType : '';
  const nested = raw.payload;
  const inner =
    nested && typeof nested === 'object' && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : raw;
  return { subType, inner };
}

export function useCollabRoom({
  kind,
  resourceId,
  enabled = true,
  client = collabClient,
  onContentDelta,
  onAssetReady,
  onSavedCheckpoint,
  onLockChanged,
}: UseCollabRoomOptions) {
  const [participants, setParticipants] = useState<CollabParticipant[]>([]);
  const clientIdRef = useRef(`tab-${Math.random().toString(36).slice(2, 10)}`);
  const handlersRef = useRef({ onContentDelta, onAssetReady, onSavedCheckpoint, onLockChanged });
  handlersRef.current = { onContentDelta, onAssetReady, onSavedCheckpoint, onLockChanged };

  useEffect(() => {
    setParticipants([]);
    if (!enabled || !resourceId) return;

    const currentUserId = getStoredSession()?.user?.id ?? null;

    const unsubscribe = client.subscribeRoom(kind, resourceId, (event) => {
      if (Array.isArray(event.participants)) {
        setParticipants(event.participants);
      }

      const { subType, inner } = unwrapDeltaPayload(event.payload);
      const isSelfTab =
        typeof inner._clientId === 'string'
          ? inner._clientId === clientIdRef.current
          : Boolean(currentUserId && event.senderUserId === currentUserId);

      if (event.type === 'CURSOR_UPDATE' && !Array.isArray(event.participants)) {
        const cursorObj =
          (inner.cursor && typeof inner.cursor === 'object'
            ? (inner.cursor as Record<string, unknown>)
            : event.payload) ?? null;
        const key = event.senderSessionId || event.senderUserId;
        if (key) {
          setParticipants((prev) => {
            const idx = prev.findIndex((p) => p.sessionId === key || p.userId === key);
            if (idx >= 0) {
              return prev.map((p, i) => (i === idx ? { ...p, cursor: cursorObj } : p));
            }
            return [
              ...prev,
              {
                userId: event.senderUserId ?? key,
                sessionId: event.senderSessionId ?? key,
                displayName: event.senderDisplayName ?? 'Collaborator',
                color: pickCollaboratorColor(key),
                cursor: cursorObj,
              },
            ];
          });
        }
        return;
      }

      if (event.type === 'CONTENT_DELTA') {
        if (!isSelfTab) {
          handlersRef.current.onContentDelta?.(subType, inner, event);
        }
      } else if (event.type === 'ASSET_READY') {
        if (!isSelfTab) {
          handlersRef.current.onAssetReady?.(inner, event);
        }
      } else if (event.type === 'SAVED_CHECKPOINT') {
        if (!isSelfTab) {
          handlersRef.current.onSavedCheckpoint?.(inner, event);
        }
      } else if (event.type === 'LOCK_CHANGED') {
        const locked = Boolean(
          inner.locked ?? event.payload?.locked ?? (event as unknown as { locked?: boolean }).locked
        );
        handlersRef.current.onLockChanged?.(locked, inner, event);
      }
    });

    return () => {
      unsubscribe();
      setParticipants([]);
    };
  }, [client, enabled, kind, resourceId]);

  const sendCursor = useCallback(
    (cursor: Record<string, unknown> | null) => {
      if (!enabled || !resourceId) return;
      client.sendPresence(kind, resourceId, { action: 'CURSOR', cursor });
    },
    [client, enabled, kind, resourceId]
  );

  const sendEdit = useCallback(
    (subType: string, payload: Record<string, unknown>) => {
      if (!enabled || !resourceId) return;
      client.sendEdit(kind, resourceId, subType, {
        ...payload,
        _clientId: clientIdRef.current,
      });
    },
    [client, enabled, kind, resourceId]
  );

  return {
    participants,
    clientId: clientIdRef.current,
    sendCursor,
    sendEdit,
  };
}
