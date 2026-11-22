import {
  exportToBlob,
  exportToSvg,
  getSceneVersion,
  loadFromBlob,
  serializeAsJSON,
} from '@excalidraw/excalidraw';
import type { ExcalidrawElement, FileId, OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  DataURL,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types';
import type {
  WhiteboardAsset,
  WhiteboardScenePayload,
} from '../../types/whiteboard.types';
import {
  buildFileSignature,
  estimateDataUrlBytes,
  type WhiteboardPendingFile,
  type WhiteboardSceneSnapshot,
} from './whiteboardSceneSync';

function sanitizeFileSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'whiteboard';
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function toExcalidrawBinaryFiles(assets: readonly WhiteboardAsset[]): BinaryFileData[] {
  return assets.map((asset) => ({
    id: asset.fileId as FileId,
    mimeType: asset.mimeType as BinaryFileData['mimeType'],
    dataURL: asset.dataUrl as DataURL,
    created: Date.parse(asset.createdAt) || Date.now(),
  }));
}

export function buildSceneSnapshot(
  elements: readonly OrderedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles
): WhiteboardSceneSnapshot {
  const serialized = serializeAsJSON(elements, appState, files, 'database');
  const sceneJson = JSON.parse(serialized) as WhiteboardScenePayload;
  const activeFiles: WhiteboardPendingFile[] = [];
  const seenFileIds = new Set<string>();
  let elementCount = 0;

  for (const element of elements) {
    if (element.isDeleted) continue;
    elementCount += 1;
    if ('fileId' in element && element.fileId && !seenFileIds.has(element.fileId)) {
      const fileData = files[element.fileId];
      if (fileData?.dataURL) {
        seenFileIds.add(element.fileId);
        activeFiles.push({
          fileId: element.fileId,
          mimeType: fileData.mimeType,
          dataUrl: fileData.dataURL,
          byteSize: estimateDataUrlBytes(fileData.dataURL),
        });
      }
    }
  }

  return {
    sceneVersion: getSceneVersion(elements),
    fileSignature: buildFileSignature([...seenFileIds]),
    sceneJson,
    elementCount,
    activeFiles,
  };
}

export async function exportBoardAsPng(
  api: ExcalidrawImperativeAPI,
  title: string,
  darkMode: boolean
): Promise<void> {
  const blob = await exportToBlob({
    elements: api.getSceneElements(),
    appState: { ...api.getAppState(), exportWithDarkMode: darkMode, exportBackground: true },
    files: api.getFiles(),
    mimeType: 'image/png',
  });
  triggerDownload(blob, `${sanitizeFileSlug(title)}.png`);
}

export async function exportBoardAsSvg(
  api: ExcalidrawImperativeAPI,
  title: string,
  darkMode: boolean
): Promise<void> {
  const svg = await exportToSvg({
    elements: api.getSceneElements(),
    appState: { ...api.getAppState(), exportWithDarkMode: darkMode, exportBackground: true },
    files: api.getFiles(),
  });
  const markup = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, `${sanitizeFileSlug(title)}.svg`);
}

export function exportBoardAsExcalidraw(api: ExcalidrawImperativeAPI, title: string): void {
  const json = serializeAsJSON(
    api.getSceneElements(),
    api.getAppState(),
    api.getFiles(),
    'local'
  );
  const blob = new Blob([json], { type: 'application/vnd.excalidraw+json' });
  triggerDownload(blob, `${sanitizeFileSlug(title)}.excalidraw`);
}

export async function importExcalidrawFile(
  file: File,
  api: ExcalidrawImperativeAPI
): Promise<{ elements: readonly ExcalidrawElement[]; files: BinaryFiles }> {
  const restored = await loadFromBlob(file, api.getAppState(), api.getSceneElements());
  const files = restored.files ?? {};
  const fileValues = Object.values(files);
  if (fileValues.length > 0) api.addFiles(fileValues);
  api.updateScene({
    elements: restored.elements,
    appState: {
      ...(restored.appState ?? {}),
      collaborators: new Map(),
    },
  });
  return { elements: restored.elements, files };
}
