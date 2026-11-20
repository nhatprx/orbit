import type { ProjectService, WorkspaceService } from '../services/workspace/workspace.service';
import type { PageResponse, ProjectDto, WorkspaceDto } from '../types/workspace.types';
import { createStore } from './createStore';
import { createWorkspaceController } from './workspaceController';
import { INITIAL_WORKSPACE_STATE, type WorkspaceState } from './workspaceStore';

export const page = <T,>(items: T[], hasMore = false): PageResponse<T> => ({
  items, page: 0, size: 100, totalElements: items.length, totalPages: 1, hasMore,
});

export const workspace = (id: string): WorkspaceDto => ({
  id, name: `Workspace ${id}`, slug: id, description: null, avatarUrl: null, ownerId: 'u1', memberCount: 1,
  projectCount: 0, enabledModules: ['git'], myPermissions: ['workspace.view'], createdAt: 'x', updatedAt: 'x',
  deletedAt: null, purgeAfter: null,
});

export const project = (id: string, workspaceId: string): ProjectDto => ({
  id, workspaceId, workspaceName: workspaceId, name: id, slug: id, description: null, memberCount: 1,
  enabledModules: ['git'], myPermissions: ['project.view'], createdAt: 'x', updatedAt: 'x',
});

function unexpected(): never {
  throw new Error('unexpected service call');
}

export interface SetupOptions {
  workspaces?: WorkspaceDto[];
  projects?: Record<string, ProjectDto[]>;
  workspaceService?: Partial<WorkspaceService>;
  projectService?: Partial<ProjectService>;
  storage?: Storage | null;
}

/** Builds a controller over in-memory fakes; any service method not provided fails the test if called. */
export function setup(options: SetupOptions) {
  const store = createStore<WorkspaceState>(INITIAL_WORKSPACE_STATE);
  const memory = new Map<string, string>();
  const storage = options.storage ?? {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  };
  const workspaces: WorkspaceService = {
    listWorkspaces: async () => page(options.workspaces ?? []),
    createWorkspace: unexpected, getWorkspace: unexpected, updateWorkspace: unexpected,
    deleteWorkspace: unexpected, restoreWorkspace: unexpected, transferOwnership: unexpected,
    ...options.workspaceService,
  };
  const projects: ProjectService = {
    listProjects: async (id) => page(options.projects?.[id] ?? []),
    listMyProjects: unexpected, createProject: unexpected, getProject: unexpected,
    updateProject: unexpected, deleteProject: unexpected,
    ...options.projectService,
  };
  return { store, memory, controller: createWorkspaceController(store, { workspaces, projects, storage }) };
}
