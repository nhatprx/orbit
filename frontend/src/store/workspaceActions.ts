import { projectService, workspaceService } from '../services/workspace/services';
import { createWorkspaceController } from './workspaceController';
import { workspaceStore } from './workspaceStore';

/** App-wide controller wired to the real services and browser storage. */
export const workspaceActions = createWorkspaceController(workspaceStore, {
  workspaces: workspaceService,
  projects: projectService,
  storage: window.localStorage,
});
