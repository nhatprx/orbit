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
  uploadedIds: Set<string>,
  onAssetUploaded?: (fileId: string) => void
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
    onAssetUploaded?.(file.fileId);
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
  uploadedIds: Set<string>,
  onAssetUploaded?: (fileId: string) => void,
  autoReconcile = false
): Promise<WhiteboardSceneSaveResult> {
  await uploadPendingAssets(
    service,
    scope,
    boardId,
    snapshot.activeFiles,
    uploadedIds,
    onAssetUploaded
  );
  try {
    return await service.saveScene(scope, boardId, {
      expectedVersion,
      sceneJson: snapshot.sceneJson,
      elementCount: snapshot.elementCount,
    });
  } catch (err) {
    if (!autoReconcile || !isWhiteboardConflictError(err)) throw err;
    const latest = await service.getBoard(scope, boardId);
    const merged = mergeSceneElements(
      latest.sceneJson?.elements ?? [],
      snapshot.sceneJson.elements ?? []
    );
    return service.saveScene(scope, boardId, {
      expectedVersion: latest.version,
      sceneJson: { ...snapshot.sceneJson, elements: merged },
      elementCount: merged.filter((el) => !el.isDeleted).length,
    });
  }
}

export function mergeSceneElements(
  localElements: readonly Record<string, unknown>[],
  remoteElements: readonly Record<string, unknown>[]
): Record<string, unknown>[] {
  const byId = new Map<string, Record<string, unknown>>();
  for (const el of localElements) {
    if (typeof el.id === 'string') byId.set(el.id, el);
  }
  for (const rEl of remoteElements) {
    const id = typeof rEl.id === 'string' ? rEl.id : null;
    if (!id) continue;
    const cur = byId.get(id);
    if (!cur) {
      byId.set(id, rEl);
      continue;
    }
    const lv = typeof cur.version === 'number' ? cur.version : 0;
    const rv = typeof rEl.version === 'number' ? rEl.version : 0;
    const ln = typeof cur.versionNonce === 'number' ? cur.versionNonce : 0;
    const rn = typeof rEl.versionNonce === 'number' ? rEl.versionNonce : 0;
    if (rv > lv || (rv === lv && rn < ln)) {
      byId.set(id, rEl);
    }
  }
  return [...byId.values()];
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
