import type { ProjectDto, WorkspaceDto } from '../../types/workspace.types';
import type { WhiteboardPermissions, WhiteboardScope } from '../../types/whiteboard.types';

export const WHITEBOARD_PAGE_SIZE = 24;
export const WHITEBOARD_MAX_TITLE_LENGTH = 160;
export const WHITEBOARD_MAX_DESCRIPTION_LENGTH = 500;
export const WHITEBOARD_MAX_ASSET_BYTES = 5 * 1024 * 1024;
export const WHITEBOARD_AUTOSAVE_DEBOUNCE_MS = 1200;

export function buildWhiteboardScope(
  workspace: WorkspaceDto,
  project: ProjectDto | null
): WhiteboardScope {
  if (project) {
    return {
      type: 'PROJECT',
      workspaceId: workspace.id,
      projectId: project.id,
      permissions: project.myPermissions,
    };
  }
  return {
    type: 'WORKSPACE',
    workspaceId: workspace.id,
    permissions: workspace.myPermissions,
  };
}

export function whiteboardScopeKey(scope: WhiteboardScope): string {
  if (scope.type === 'PROJECT') {
    return `PROJECT:${scope.workspaceId}:${scope.projectId}`;
  }
  return `WORKSPACE:${scope.workspaceId}`;
}

export function resolveWhiteboardPermissions(scope: WhiteboardScope): WhiteboardPermissions {
  const prefix = scope.type === 'WORKSPACE' ? 'whiteboard' : 'pwhiteboard';
  const has = (action: string) => scope.permissions.includes(`${prefix}.${action}`);
  return {
    canRead: has('read'),
    canWrite: has('write'),
    canDelete: has('delete'),
    canManage: has('manage'),
  };
}
