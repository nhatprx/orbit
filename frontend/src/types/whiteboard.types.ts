export type WhiteboardScope =
  | { type: 'WORKSPACE'; workspaceId: string; permissions: readonly string[] }
  | { type: 'PROJECT'; workspaceId: string; projectId: string; permissions: readonly string[] };

export interface WhiteboardPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManage: boolean;
}

export interface WhiteboardScenePayload {
  type?: string;
  version?: number;
  source?: string;
  elements: readonly Record<string, unknown>[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}

export interface WhiteboardSummary {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  description: string;
  elementCount: number;
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhiteboardDetail extends WhiteboardSummary {
  sceneJson: WhiteboardScenePayload;
}

export interface WhiteboardSceneSaveResult {
  id: string;
  version: number;
  elementCount: number;
  updatedBy: string | null;
  updatedAt: string;
}

export interface WhiteboardAsset {
  fileId: string;
  mimeType: string;
  dataUrl: string;
  byteSize: number;
  createdAt: string;
}

export interface ListWhiteboardsParams {
  q?: string;
  page?: number;
  size?: number;
}

export interface CreateWhiteboardRequest {
  title: string;
  description?: string;
}

export interface UpdateWhiteboardRequest {
  title?: string;
  description?: string;
}

export interface SaveWhiteboardSceneRequest {
  expectedVersion: number;
  sceneJson: WhiteboardScenePayload;
  elementCount: number;
}

export interface UpsertWhiteboardAssetRequest {
  mimeType: string;
  dataUrl: string;
}

export type WhiteboardSaveState = 'saved' | 'saving' | 'unsaved' | 'conflict' | 'error';

export type WhiteboardCanvasTheme = 'dark' | 'light';

export const EMPTY_WHITEBOARD_SCENE: WhiteboardScenePayload = {
  type: 'excalidraw',
  version: 2,
  elements: [],
  appState: {},
};
