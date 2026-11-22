import { CaptureUpdateAction, reconcileElements } from '@excalidraw/excalidraw';
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { RemoteExcalidrawElement } from '@excalidraw/excalidraw/data/reconcile';
import type {
  Collaborator,
  ExcalidrawImperativeAPI,
  SocketId,
} from '@excalidraw/excalidraw/types';
import { pickCollaboratorColor } from '../../services/collab/collabClient';
import type { CollabParticipant } from '../../types/collab.types';
import { mergeSceneElements } from './whiteboardSceneSync';

export interface PointerUpdatePayload {
  pointer: { x: number; y: number; tool: 'pointer' | 'laser' };
  button: 'down' | 'up';
}

export function reconcileRemoteExcalidrawElements(
  api: ExcalidrawImperativeAPI,
  rawElements: readonly Record<string, unknown>[],
  lastVersionById: Map<string, number>
): OrderedExcalidrawElement[] {
  for (const el of rawElements) {
    if (typeof el.id === 'string' && typeof el.version === 'number') {
      const cur = lastVersionById.get(el.id) ?? 0;
      if (el.version > cur) lastVersionById.set(el.id, el.version);
    }
  }

  const localElements =
    (api as { getSceneElementsIncludingDeleted?: () => readonly OrderedExcalidrawElement[] })
      .getSceneElementsIncludingDeleted?.() ?? api.getSceneElements();

  const merged = mergeSceneElements(
    localElements as unknown as readonly Record<string, unknown>[],
    rawElements
  );

  return reconcileElements(
    localElements,
    merged as unknown as readonly RemoteExcalidrawElement[],
    api.getAppState()
  );
}

export function getCaptureUpdateNever(): unknown {
  return CaptureUpdateAction.NEVER;
}

export function buildExcalidrawCollaboratorsMap(
  participants: readonly CollabParticipant[]
): Map<SocketId, Collaborator> {
  const collabMap = new Map<SocketId, Collaborator>();
  for (const p of participants) {
    const color = pickCollaboratorColor(p.userId || p.sessionId, p.color);
    const cursor = p.cursor ?? {};
    const ptr = cursor.pointer as { x?: number; y?: number; tool?: 'pointer' | 'laser' } | undefined;
    const socketId = (p.sessionId || p.userId) as SocketId;
    collabMap.set(socketId, {
      id: p.userId,
      socketId,
      username: p.displayName || 'Collaborator',
      color: { background: color, stroke: color },
      pointer:
        ptr && typeof ptr.x === 'number' && typeof ptr.y === 'number'
          ? { x: ptr.x, y: ptr.y, tool: ptr.tool === 'laser' ? 'laser' : 'pointer' }
          : undefined,
      button: cursor.button === 'down' ? 'down' : 'up',
      selectedElementIds:
        cursor.selectedElementIds && typeof cursor.selectedElementIds === 'object'
          ? (cursor.selectedElementIds as Record<string, true>)
          : undefined,
    });
  }
  return collabMap;
}
