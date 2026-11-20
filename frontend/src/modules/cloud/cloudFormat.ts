import type { CloudNodeDto, CloudScope, CloudScopeType } from '../../types/cloud.types';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

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
    return {
      badge: 'Personal Cloud',
      layerLabel: 'Personal',
      subtitle: scopeLabel ?? 'Private user storage',
    };
  }
  if (scope.type === 'WORKSPACE') {
    return {
      badge: 'Workspace Cloud',
      layerLabel: 'Workspace',
      subtitle: scopeLabel ?? 'Shared workspace storage',
    };
  }
  return {
    badge: 'Project Cloud',
    layerLabel: 'Project',
    subtitle: scopeLabel ?? 'Scoped project storage',
  };
}

export function scopeTypeLabel(type: CloudScopeType): string {
  if (type === 'USER') return 'Personal Cloud';
  if (type === 'WORKSPACE') return 'Workspace Cloud';
  return 'Project Cloud';
}

export function nodeTypeLabel(node: CloudNodeDto): string {
  if (node.nodeType === 'FOLDER') return 'Folder';
  if (!node.mimeType) return 'File';
  const [, subtype] = node.mimeType.split('/');
  return subtype ? subtype.toUpperCase() : node.mimeType;
}
