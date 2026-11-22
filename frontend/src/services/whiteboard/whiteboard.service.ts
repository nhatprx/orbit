import type { PageResponse } from '../../types/workspace.types';
import type {
  CreateWhiteboardRequest,
  ListWhiteboardsParams,
  SaveWhiteboardSceneRequest,
  UpdateWhiteboardRequest,
  UpsertWhiteboardAssetRequest,
  WhiteboardAsset,
  WhiteboardDetail,
  WhiteboardSceneSaveResult,
  WhiteboardScope,
  WhiteboardSummary,
} from '../../types/whiteboard.types';
import { ApiError, apiRequest, seg } from '../workspace/httpClient';

export const WHITEBOARD_CONFLICT_CODE = 'WHITEBOARD_VERSION_CONFLICT';

export interface WhiteboardService {
  listBoards(
    scope: WhiteboardScope,
    params?: ListWhiteboardsParams
  ): Promise<PageResponse<WhiteboardSummary>>;
  createBoard(scope: WhiteboardScope, request: CreateWhiteboardRequest): Promise<WhiteboardDetail>;
  getBoard(scope: WhiteboardScope, boardId: string): Promise<WhiteboardDetail>;
  updateBoard(
    scope: WhiteboardScope,
    boardId: string,
    request: UpdateWhiteboardRequest
  ): Promise<WhiteboardSummary>;
  saveScene(
    scope: WhiteboardScope,
    boardId: string,
    request: SaveWhiteboardSceneRequest
  ): Promise<WhiteboardSceneSaveResult>;
  deleteBoard(scope: WhiteboardScope, boardId: string): Promise<void>;
  listAssets(scope: WhiteboardScope, boardId: string): Promise<WhiteboardAsset[]>;
  upsertAsset(
    scope: WhiteboardScope,
    boardId: string,
    fileId: string,
    request: UpsertWhiteboardAssetRequest
  ): Promise<WhiteboardAsset>;
  deleteAsset(scope: WhiteboardScope, boardId: string, fileId: string): Promise<void>;
  setLocked?(scope: WhiteboardScope, boardId: string, locked: boolean): Promise<WhiteboardSummary>;
}

function boardBase(scope: WhiteboardScope): string {
  if (scope.type === 'PROJECT') {
    return `/api/v1/workspaces/${seg(scope.workspaceId)}/projects/${seg(scope.projectId)}/whiteboards`;
  }
  return `/api/v1/workspaces/${seg(scope.workspaceId)}/whiteboards`;
}

export function isWhiteboardConflictError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.code === WHITEBOARD_CONFLICT_CODE
  );
}

export function createHttpWhiteboardService(): WhiteboardService {
  return {
    listBoards(scope, params) {
      return apiRequest<PageResponse<WhiteboardSummary>>('GET', boardBase(scope), {
        query: {
          q: params?.q?.trim() || undefined,
          page: params?.page ?? 0,
          size: params?.size ?? 24,
        },
      });
    },

    createBoard(scope, request) {
      return apiRequest<WhiteboardDetail>('POST', boardBase(scope), { body: request });
    },

    getBoard(scope, boardId) {
      return apiRequest<WhiteboardDetail>('GET', `${boardBase(scope)}/${seg(boardId)}`);
    },

    updateBoard(scope, boardId, request) {
      return apiRequest<WhiteboardSummary>('PATCH', `${boardBase(scope)}/${seg(boardId)}`, {
        body: request,
      });
    },

    saveScene(scope, boardId, request) {
      return apiRequest<WhiteboardSceneSaveResult>(
        'PUT',
        `${boardBase(scope)}/${seg(boardId)}/scene`,
        { body: request }
      );
    },

    deleteBoard(scope, boardId) {
      return apiRequest<void>('DELETE', `${boardBase(scope)}/${seg(boardId)}`);
    },

    listAssets(scope, boardId) {
      return apiRequest<WhiteboardAsset[]>('GET', `${boardBase(scope)}/${seg(boardId)}/assets`);
    },

    upsertAsset(scope, boardId, fileId, request) {
      return apiRequest<WhiteboardAsset>(
        'PUT',
        `${boardBase(scope)}/${seg(boardId)}/assets/${seg(fileId)}`,
        { body: request }
      );
    },

    deleteAsset(scope, boardId, fileId) {
      return apiRequest<void>(
        'DELETE',
        `${boardBase(scope)}/${seg(boardId)}/assets/${seg(fileId)}`
      );
    },

    setLocked(scope, boardId, locked) {
      return apiRequest<WhiteboardSummary>(
        'PUT',
        `${boardBase(scope)}/${seg(boardId)}/lock`,
        { body: { locked } }
      );
    },
  };
}

export const httpWhiteboardService: WhiteboardService = createHttpWhiteboardService();
export const whiteboardService: WhiteboardService = httpWhiteboardService;
