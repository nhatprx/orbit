import { vi } from 'vitest';
import type { WhiteboardService } from '../../services/whiteboard/whiteboard.service';
import type { WorkspaceDto } from '../../types/workspace.types';
import type {
  WhiteboardAsset,
  WhiteboardDetail,
  WhiteboardScope,
  WhiteboardSummary,
} from '../../types/whiteboard.types';
import type { WhiteboardSceneSnapshot } from './whiteboardSceneSync';

export const TEST_WS_SCOPE: WhiteboardScope = {
  type: 'WORKSPACE',
  workspaceId: 'ws-1',
  permissions: ['whiteboard.read', 'whiteboard.write'],
};

export function makeTestWorkspace(permissions: string[]): WorkspaceDto {
  return {
    id: 'ws-1',
    name: 'Acme',
    slug: 'acme',
    description: null,
    avatarUrl: null,
    ownerId: 'u-1',
    memberCount: 3,
    projectCount: 1,
    enabledModules: ['whiteboard'],
    myPermissions: permissions,
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
    deletedAt: null,
    purgeAfter: null,
  };
}

export function makeTestBoardSummary(overrides: Partial<WhiteboardSummary> = {}): WhiteboardSummary {
  return {
    id: 'b-1',
    workspaceId: 'ws-1',
    projectId: null,
    title: 'Architecture Map',
    description: 'Core services',
    elementCount: 12,
    version: 1,
    createdBy: 'u-1',
    updatedBy: 'u-1',
    createdAt: '2026-11-21T00:00:00Z',
    updatedAt: '2026-11-22T00:00:00Z',
    ...overrides,
  };
}

export function makeTestBoardDetail(version = 1): WhiteboardDetail {
  return {
    ...makeTestBoardSummary({ version }),
    sceneJson: { type: 'excalidraw', version: 2, elements: [], appState: {} },
  };
}

export function makeTestSnapshot(
  sceneVersion: number,
  activeFiles: WhiteboardSceneSnapshot['activeFiles'] = []
): WhiteboardSceneSnapshot {
  return {
    sceneVersion,
    fileSignature: activeFiles.map((f) => f.fileId).sort().join(','),
    sceneJson: { type: 'excalidraw', version: 2, elements: [{ id: `el-${sceneVersion}` }], appState: {} },
    elementCount: 1,
    activeFiles,
  };
}

export function makeMockWhiteboardService(
  overrides: Partial<WhiteboardService> = {}
): WhiteboardService {
  const summary = makeTestBoardSummary();
  const detail = makeTestBoardDetail(1);
  return {
    listBoards: vi.fn().mockResolvedValue({
      items: [summary],
      page: 0,
      size: 24,
      totalElements: 1,
      totalPages: 2,
      hasMore: true,
    }),
    createBoard: vi.fn().mockResolvedValue({ ...detail, id: 'b-2', title: 'New Flow' }),
    getBoard: vi.fn().mockResolvedValue(detail),
    updateBoard: vi.fn().mockResolvedValue({ ...summary, title: 'Renamed Map' }),
    saveScene: vi.fn().mockResolvedValue({
      id: 'b-1',
      version: 2,
      elementCount: 1,
      updatedBy: 'u-1',
      updatedAt: '2026-11-22T00:01:00Z',
    }),
    deleteBoard: vi.fn().mockResolvedValue(undefined),
    listAssets: vi.fn().mockResolvedValue([]),
    upsertAsset: vi.fn().mockResolvedValue({
      fileId: 'img-1',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,AAAA',
      byteSize: 3,
      createdAt: '2026-11-22T00:00:00Z',
    } satisfies WhiteboardAsset),
    deleteAsset: vi.fn().mockResolvedValue(undefined),
    setLocked: vi.fn().mockImplementation(async (_scope, _boardId, locked: boolean) => ({
      ...summary,
      locked,
    })),
    ...overrides,
  };
}
