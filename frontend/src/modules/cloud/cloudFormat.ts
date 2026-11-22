import type {
  CloudNodeDto,
  CloudNodeType,
  CloudScope,
  CloudScopeType,
  CloudView,
  MoveCloudNodesRequest,
} from '../../types/cloud.types';
import { getFileExtension } from './editor/fileEditorRegistry';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
export const CLOUD_DRAG_MIME = 'application/x-orbit-cloud-nodes';

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const decimals = unitIndex === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(decimals)} ${UNITS[unitIndex]}`;
}

export function scopeDisplay(
  scope: CloudScope,
  scopeLabel?: string
): { badge: string; layerLabel: string; subtitle: string } {
  if (scope.type === 'USER') {
    return { badge: 'Personal Cloud', layerLabel: 'Personal', subtitle: scopeLabel ?? 'Private user storage' };
  }
  if (scope.type === 'WORKSPACE') {
    return { badge: 'Workspace Cloud', layerLabel: 'Workspace', subtitle: scopeLabel ?? 'Shared workspace storage' };
  }
  return { badge: 'Project Cloud', layerLabel: 'Project', subtitle: scopeLabel ?? 'Scoped project storage' };
}

export function scopeTypeLabel(type: CloudScopeType): string {
  if (type === 'USER') return 'Personal Cloud';
  if (type === 'WORKSPACE') return 'Workspace Cloud';
  return 'Project Cloud';
}

const EXT_KIND: Record<string, string> = {
  docx: 'Word Document',
  xlsx: 'Spreadsheet',
  csv: 'CSV Spreadsheet',
  pptx: 'Presentation',
  pdf: 'PDF Document',
  md: 'Markdown',
  markdown: 'Markdown',
  txt: 'Plain Text',
  json: 'JSON File',
  ts: 'TypeScript',
  tsx: 'TypeScript JSX',
  js: 'JavaScript',
  jsx: 'JavaScript JSX',
  py: 'Python Script',
  java: 'Java Source',
  sql: 'SQL Query',
  html: 'HTML Document',
  css: 'Stylesheet',
  png: 'PNG Image',
  jpg: 'JPEG Image',
  jpeg: 'JPEG Image',
  gif: 'GIF Image',
  webp: 'WebP Image',
  svg: 'SVG Vector',
  zip: 'ZIP Archive',
};

export function nodeTypeLabel(node: CloudNodeDto): string {
  if (node.nodeType === 'FOLDER') return 'Folder';
  const ext = getFileExtension(node.name);
  if (ext && EXT_KIND[ext]) return EXT_KIND[ext];
  if (node.mimeType?.startsWith('image/')) return 'Image';
  if (!node.mimeType) return 'File';
  const [, subtype] = node.mimeType.split('/');
  return subtype ? subtype.toUpperCase() : node.mimeType;
}

export function splitFileName(name: string, nodeType: CloudNodeType): { base: string; ext: string } {
  if (nodeType === 'FOLDER') return { base: name, ext: '' };
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return { base: name, ext: '' };
  return { base: name.slice(0, dot), ext: name.slice(dot) };
}

export function isFlatCloudView(view: CloudView): boolean {
  return view !== 'ALL';
}

export function viewDisplayTitle(view: CloudView): string {
  switch (view) {
    case 'RECENTS':
      return 'Recents';
    case 'STARRED':
      return 'Starred';
    case 'DOCS':
      return 'Documents';
    case 'SHEETS':
      return 'Spreadsheets';
    case 'SLIDES':
      return 'Presentations';
    case 'TRASH':
      return 'Trash';
    default:
      return 'All Files';
  }
}

export function buildMoveRequest(
  nodeIds: string[],
  sourceScope: CloudScope,
  targetScope: CloudScope,
  targetParentId: string | null
): MoveCloudNodesRequest {
  return {
    nodeIds,
    sourceScopeType: sourceScope.type,
    sourceWorkspaceId: sourceScope.type === 'USER' ? null : sourceScope.workspaceId,
    sourceProjectId: sourceScope.type === 'PROJECT' ? sourceScope.projectId : null,
    targetScopeType: targetScope.type,
    targetWorkspaceId: targetScope.type === 'USER' ? null : targetScope.workspaceId,
    targetProjectId: targetScope.type === 'PROJECT' ? targetScope.projectId : null,
    targetParentId,
  };
}

export function triggerInlineDownload(url: string, filename: string): void {
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function writeDraggedNodeIds(dataTransfer: DataTransfer, nodeIds: string[]): void {
  dataTransfer.setData(CLOUD_DRAG_MIME, JSON.stringify(nodeIds));
  dataTransfer.effectAllowed = 'move';
}

export function readDraggedNodeIds(dataTransfer: DataTransfer): string[] {
  const raw = dataTransfer.getData(CLOUD_DRAG_MIME);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function isInternalNodeDrag(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(CLOUD_DRAG_MIME);
}
