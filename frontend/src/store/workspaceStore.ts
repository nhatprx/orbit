import type { ProjectDto, WorkspaceDto } from '../types/workspace.types';
import { createStore, useStore } from './createStore';

export interface WorkspaceState {
  userId: string | null;
  workspaces: WorkspaceDto[];
  activeWorkspaceId: string | null;
  projects: ProjectDto[];
  projectsHasMore: boolean;
  activeProjectId: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
}

export const INITIAL_WORKSPACE_STATE: WorkspaceState = {
  userId: null,
  workspaces: [],
  activeWorkspaceId: null,
  projects: [],
  projectsHasMore: false,
  activeProjectId: null,
  status: 'idle',
  error: null,
};

export const workspaceStore = createStore<WorkspaceState>(INITIAL_WORKSPACE_STATE);

export const selectActiveWorkspace = (state: WorkspaceState): WorkspaceDto | null =>
  state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? null;

export const selectActiveProject = (state: WorkspaceState): ProjectDto | null =>
  state.projects.find((p) => p.id === state.activeProjectId) ?? null;

export function useActiveWorkspace(): WorkspaceDto | null {
  return useStore(workspaceStore, selectActiveWorkspace);
}

export function useActiveProject(): ProjectDto | null {
  return useStore(workspaceStore, selectActiveProject);
}
