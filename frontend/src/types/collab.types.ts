export type CollabResourceKind = 'WHITEBOARD' | 'CLOUD_NODE';
export type CollabDestinationKind = 'whiteboard' | 'cloud';

export type CollabEventType =
  | 'PRESENCE_SYNC'
  | 'CURSOR_UPDATE'
  | 'CONTENT_DELTA'
  | 'ASSET_READY'
  | 'SAVED_CHECKPOINT'
  | 'LOCK_CHANGED';

export interface CollabParticipant {
  userId: string;
  sessionId: string;
  displayName: string;
  color: string;
  cursor?: Record<string, unknown> | null;
  updatedAt?: string;
}

export interface CollabRoomEvent {
  type: CollabEventType;
  resourceKind: CollabResourceKind;
  resourceId: string;
  senderUserId: string | null;
  senderSessionId: string | null;
  senderDisplayName: string | null;
  seq: number;
  timestamp: string;
  participants?: CollabParticipant[];
  payload?: Record<string, unknown> | null;
}

export interface CollabPresenceRequest {
  action: 'JOIN' | 'LEAVE' | 'CURSOR';
  cursor?: Record<string, unknown> | null;
}

export interface CollabEditRequest {
  subType: string;
  payload: Record<string, unknown>;
}

export type CollabCatalogModule = 'whiteboard' | 'cloud' | 'issues';

export interface ScopeCatalogEvent {
  type?: string;
  module: CollabCatalogModule;
  action: string;
  resourceId: string;
  locked?: boolean;
}
