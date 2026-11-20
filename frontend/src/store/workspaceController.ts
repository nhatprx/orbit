import type {
  CreateProjectRequest,
  CreateWorkspaceRequest,
  ProjectDto,
  WorkspaceDto,
} from '../types/workspace.types';
import { errorMessage } from '../services/workspace/httpClient';
import type { ProjectService, WorkspaceService } from '../services/workspace/workspace.service';
import type { Store } from './createStore';
import { INITIAL_WORKSPACE_STATE, type WorkspaceState } from './workspaceStore';

export interface WorkspaceControllerDeps {
  workspaces: WorkspaceService;
  projects: ProjectService;
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
}

/** Bounded first page for the Sidebar; the UI shows a hint when more exist. */
const PAGE_SIZE = 100;

const lastWorkspaceKey = (userId: string) => `orbit_last_workspace:${userId}`;

/** Loads and switches the active Workspace/Project, remembering the last Workspace per user. */
export function createWorkspaceController(store: Store<WorkspaceState>, deps: WorkspaceControllerDeps) {
  // Bumped on every context switch so slower, older responses never overwrite newer state.
  let epoch = 0;

  const remember = (userId: string | null, workspaceId: string | null) => {
    if (!userId) return;
    try {
      if (workspaceId) deps.storage.setItem(lastWorkspaceKey(userId), workspaceId);
      else deps.storage.removeItem(lastWorkspaceKey(userId));
    } catch {
      // Remembering the selection is a convenience only.
    }
  };

  const recall = (userId: string): string | null => {
    try {
      return deps.storage.getItem(lastWorkspaceKey(userId));
    } catch {
      return null;
    }
  };

  async function fetchWorkspaces(): Promise<WorkspaceDto[]> {
    return (await deps.workspaces.listWorkspaces({ page: 0, size: PAGE_SIZE })).items;
  }

  async function loadProjectsFor(workspaceId: string, current: number): Promise<void> {
    const page = await deps.projects.listProjects(workspaceId, 0, PAGE_SIZE);
    if (current !== epoch) return;
    const { activeProjectId } = store.getState();
    store.setState({
      projects: page.items,
      projectsHasMore: page.hasMore,
      activeProjectId: page.items.some((p) => p.id === activeProjectId) ? activeProjectId : null,
    });
  }

  async function activate(workspaceId: string | null, workspaces: WorkspaceDto[]): Promise<void> {
    const current = ++epoch;
    const { userId } = store.getState();
    remember(userId, workspaceId);
    store.setState({
      workspaces,
      activeWorkspaceId: workspaceId,
      activeProjectId: null,
      projects: [],
      projectsHasMore: false,
    });
    if (workspaceId) await loadProjectsFor(workspaceId, current);
  }

  return {
    /** Loads the user's Workspaces; `preferredId` (for example a just-joined one) beats the remembered one. */
    async bootstrap(userId: string, preferredId?: string | null): Promise<void> {
      store.setState({ ...INITIAL_WORKSPACE_STATE, userId, status: 'loading' });
      try {
        const workspaces = await fetchWorkspaces();
        const remembered = recall(userId);
        const target =
          workspaces.find((w) => w.id === preferredId) ??
          workspaces.find((w) => w.id === remembered) ??
          workspaces[0] ??
          null;
        await activate(target?.id ?? null, workspaces);
        store.setState({ status: 'ready', error: null });
      } catch (error) {
        store.setState({ status: 'error', error: errorMessage(error, 'Could not load workspaces.') });
      }
    },

    async selectWorkspace(workspaceId: string): Promise<void> {
      const { workspaces, activeWorkspaceId } = store.getState();
      if (workspaceId === activeWorkspaceId || !workspaces.some((w) => w.id === workspaceId)) return;
      await activate(workspaceId, workspaces);
    },

    selectProject(projectId: string | null): void {
      const { projects } = store.getState();
      if (projectId === null || projects.some((p) => p.id === projectId)) {
        store.setState({ activeProjectId: projectId });
      }
    },

    /** Re-reads workspaces (counts, modules, permissions) and keeps the selection when possible. */
    async refreshWorkspaces(): Promise<void> {
      const workspaces = await fetchWorkspaces();
      const { activeWorkspaceId } = store.getState();
      if (activeWorkspaceId && !workspaces.some((w) => w.id === activeWorkspaceId)) {
        await activate(workspaces[0]?.id ?? null, workspaces);
      } else {
        store.setState({ workspaces });
      }
    },

    async refreshProjects(): Promise<void> {
      const { activeWorkspaceId } = store.getState();
      if (activeWorkspaceId) await loadProjectsFor(activeWorkspaceId, epoch);
    },

    /** Refreshes both lists after a change that affects counts or effective modules. */
    async refreshAll(): Promise<void> {
      await this.refreshWorkspaces();
      await this.refreshProjects();
    },

    async createWorkspace(request: CreateWorkspaceRequest): Promise<WorkspaceDto> {
      const created = await deps.workspaces.createWorkspace(request);
      const workspaces = await fetchWorkspaces();
      await activate(created.id, workspaces);
      return created;
    },

    /** Selects a Workspace that was joined elsewhere (for example through an invitation). */
    async enterWorkspace(workspaceId: string): Promise<void> {
      const workspaces = await fetchWorkspaces();
      await activate(workspaces.some((w) => w.id === workspaceId) ? workspaceId : (workspaces[0]?.id ?? null), workspaces);
      store.setState({ status: 'ready', error: null });
    },

    async createProject(request: CreateProjectRequest): Promise<ProjectDto> {
      const { activeWorkspaceId } = store.getState();
      if (!activeWorkspaceId) throw new Error('Select a workspace first.');
      const created = await deps.projects.createProject(activeWorkspaceId, request);
      await this.refreshAll();
      store.setState({ activeProjectId: created.id });
      return created;
    },

    reset(): void {
      epoch += 1;
      store.setState({ ...INITIAL_WORKSPACE_STATE });
    },
  };
}

export type WorkspaceController = ReturnType<typeof createWorkspaceController>;
