import type {
  CollabDestinationKind,
  CollabEditRequest,
  CollabPresenceRequest,
  CollabRoomEvent,
  ScopeCatalogEvent,
} from '../../types/collab.types';
import { chatConnection } from '../workspace/httpChat.service';
import type { StompConnection } from '../workspace/stomp/StompConnection';

export const COLLAB_PALETTE = [
  '#22C55E',
  '#38BDF8',
  '#F59E0B',
  '#60A5FA',
  '#A3E635',
  '#2DD4BF',
] as const;

export function pickCollaboratorColor(seed: string, preferred?: string | null): string {
  if (preferred && /^#[0-9A-Fa-f]{6}$/.test(preferred)) return preferred;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return COLLAB_PALETTE[Math.abs(hash) % COLLAB_PALETTE.length] ?? '#22C55E';
}

export interface CollabScopeTarget {
  type: 'WORKSPACE' | 'PROJECT';
  workspaceId: string;
  projectId?: string | null;
}

export class CollabStompClient {
  constructor(private readonly connection: StompConnection = chatConnection) {}

  getConnection(): StompConnection {
    return this.connection;
  }

  subscribeRoom(
    kind: CollabDestinationKind,
    resourceId: string,
    onEvent: (event: CollabRoomEvent) => void,
    onError?: (message: string) => void
  ): () => void {
    const topic = `/topic/collab.${kind}.${resourceId}`;
    const sendJoin = () => this.sendPresence(kind, resourceId, { action: 'JOIN' });

    const unsubscribeTopic = this.connection.subscribe(topic, (frame) => {
      try {
        const parsed = JSON.parse(frame.body) as CollabRoomEvent;
        if (parsed && typeof parsed.type === 'string') {
          onEvent(parsed);
        }
      } catch {
        // Ignore malformed room frames without dropping the subscription.
      }
    });

    const unsubscribeErrors = this.connection.subscribe('/user/queue/errors', (frame) => {
      if (!onError) return;
      try {
        const parsed = JSON.parse(frame.body) as { message?: string; error?: string };
        onError(parsed.message ?? parsed.error ?? 'Collaboration action rejected.');
      } catch {
        if (frame.body) onError(frame.body);
      }
    });

    if (this.connection.getState() === 'connected') {
      sendJoin();
    }

    const detachState = this.connection.onStateChange((state) => {
      if (state === 'connected') {
        sendJoin();
      }
    });

    return () => {
      detachState();
      this.sendPresence(kind, resourceId, { action: 'LEAVE' });
      unsubscribeErrors();
      unsubscribeTopic();
    };
  }

  sendPresence(
    kind: CollabDestinationKind,
    resourceId: string,
    request: CollabPresenceRequest
  ): void {
    if (this.connection.getState() !== 'connected') return;
    try {
      this.connection.send(`/app/collab.${kind}.${resourceId}.presence`, request);
    } catch {
      // Best-effort presence broadcast; reconnect handler will re-sync on recovery.
    }
  }

  sendEdit(
    kind: CollabDestinationKind,
    resourceId: string,
    subType: string,
    payload: Record<string, unknown>
  ): void {
    if (this.connection.getState() !== 'connected') return;
    const body: CollabEditRequest = { subType, payload };
    try {
      this.connection.send(`/app/collab.${kind}.${resourceId}.edit`, body);
    } catch {
      // Ignore transient disconnected send; auto-save persists via REST.
    }
  }

  subscribeScopeCatalog(
    scope: CollabScopeTarget,
    onEvent: (event: ScopeCatalogEvent) => void
  ): () => void {
    const destination =
      scope.type === 'PROJECT' && scope.projectId
        ? `/topic/collab.project.${scope.projectId}`
        : `/topic/collab.workspace.${scope.workspaceId}`;

    return this.connection.subscribe(destination, (frame) => {
      try {
        const parsed = JSON.parse(frame.body) as ScopeCatalogEvent;
        if (parsed && typeof parsed.module === 'string') {
          onEvent(parsed);
        }
      } catch {
        // Ignore malformed catalog broadcast.
      }
    });
  }
}

export const collabClient = new CollabStompClient();
