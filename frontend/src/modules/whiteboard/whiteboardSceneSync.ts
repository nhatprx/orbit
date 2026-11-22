import { errorMessage } from '../../services/workspace/httpClient';
import {
  isWhiteboardConflictError,
  type WhiteboardService,
} from '../../services/whiteboard/whiteboard.service';
import type {
  WhiteboardAsset,
  WhiteboardDetail,
  WhiteboardSaveState,
  WhiteboardScenePayload,
  WhiteboardSceneSaveResult,
  WhiteboardScope,
} from '../../types/whiteboard.types';
import { WHITEBOARD_MAX_ASSET_BYTES } from './whiteboardPermissions';

export interface WhiteboardPendingFile {
  fileId: string;
  mimeType: string;
  dataUrl: string;
  byteSize: number;
}

export interface WhiteboardSceneSnapshot {
  sceneVersion: number;
  fileSignature: string;
  sceneJson: WhiteboardScenePayload;
  elementCount: number;
  activeFiles: WhiteboardPendingFile[];
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl.length;
  const header = dataUrl.slice(0, commaIdx);
  const payload = dataUrl.slice(commaIdx + 1);
  if (header.includes(';base64')) {
    const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
  }
  return new TextEncoder().encode(payload).byteLength;
}

export function buildFileSignature(fileIds: readonly string[]): string {
  return [...new Set(fileIds)].sort().join(',');
}

export async function uploadPendingAssets(
  service: WhiteboardService,
  scope: WhiteboardScope,
  boardId: string,
  activeFiles: readonly WhiteboardPendingFile[],
  uploadedIds: Set<string>
): Promise<void> {
  for (const file of activeFiles) {
    if (uploadedIds.has(file.fileId)) continue;
    const dataUrlBytes = new TextEncoder().encode(file.dataUrl).byteLength;
    const maxBytes = Math.max(dataUrlBytes, file.byteSize);
    if (maxBytes > WHITEBOARD_MAX_ASSET_BYTES) {
      throw new Error(
        `Image asset exceeds the 5 MB limit (${(maxBytes / (1024 * 1024)).toFixed(1)} MB).`
      );
    }
    await service.upsertAsset(scope, boardId, file.fileId, {
      mimeType: file.mimeType,
      dataUrl: file.dataUrl,
    });
    uploadedIds.add(file.fileId);
  }
}

export async function loadBoardWithAssets(
  service: WhiteboardService,
  scope: WhiteboardScope,
  boardId: string
): Promise<{ detail: WhiteboardDetail; assets: WhiteboardAsset[] }> {
  const [detail, assets] = await Promise.all([
    service.getBoard(scope, boardId),
    service.listAssets(scope, boardId),
  ]);
  return { detail, assets };
}

export async function persistSceneWithAssets(
  service: WhiteboardService,
  scope: WhiteboardScope,
  boardId: string,
  expectedVersion: number,
  snapshot: WhiteboardSceneSnapshot,
  uploadedIds: Set<string>
): Promise<WhiteboardSceneSaveResult> {
  await uploadPendingAssets(service, scope, boardId, snapshot.activeFiles, uploadedIds);
  return service.saveScene(scope, boardId, {
    expectedVersion,
    sceneJson: snapshot.sceneJson,
    elementCount: snapshot.elementCount,
  });
}

export function classifySaveError(err: unknown): { state: WhiteboardSaveState; message: string } {
  if (isWhiteboardConflictError(err)) {
    return {
      state: 'conflict',
      message: 'This whiteboard was updated elsewhere. Reload latest or overwrite server.',
    };
  }
  return {
    state: 'error',
    message: errorMessage(err, 'Failed to save whiteboard changes.'),
  };
}
