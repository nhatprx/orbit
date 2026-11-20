import { useCallback, useMemo, useState } from 'react';
import { workspaceActions } from '../../store/workspaceActions';
import type { ProfileSectionId, WorkspaceAreaId } from '../../types/dashboard.types';
import type { ModuleKey } from '../../types/workspace.types';

export interface DashboardNavigation {
  active: WorkspaceAreaId;
  profileSection: ProfileSectionId;
  go: (area: WorkspaceAreaId) => void;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  openWorkspaceModule: (key: ModuleKey) => void;
  openProject: (projectId: string, firstModule?: ModuleKey) => void;
  openProjectModule: (projectId: string, key: ModuleKey) => void;
  /** Opens a project that may live in another Workspace (used by Profile). */
  openProjectIn: (workspaceId: string, projectId: string, firstModule?: ModuleKey) => Promise<void>;
  openProfile: (section?: ProfileSectionId) => void;
  openWorkspaceSettings: (workspaceId?: string) => Promise<void>;
  openProjectSettings: (workspaceId: string, projectId: string) => Promise<void>;
}

/** Owns which area is on screen and keeps the Workspace/Project scope in sync with it. */
export function useDashboardNavigation(): DashboardNavigation {
  const [active, setActive] = useState<WorkspaceAreaId>('overview');
  const [profileSection, setProfileSection] = useState<ProfileSectionId>('overview');

  const go = useCallback((area: WorkspaceAreaId) => setActive(area), []);

  return useMemo<DashboardNavigation>(
    () => ({
      active,
      profileSection,
      go,
      async switchWorkspace(workspaceId) {
        await workspaceActions.selectWorkspace(workspaceId);
        setActive('overview');
      },
      openWorkspaceModule(key) {
        workspaceActions.selectProject(null);
        setActive(key);
      },
      openProject(projectId, firstModule) {
        workspaceActions.selectProject(projectId);
        setActive(firstModule ?? 'project-settings');
      },
      openProjectModule(projectId, key) {
        workspaceActions.selectProject(projectId);
        setActive(key);
      },
      async openProjectIn(workspaceId, projectId, firstModule) {
        await workspaceActions.selectWorkspace(workspaceId);
        workspaceActions.selectProject(projectId);
        setActive(firstModule ?? 'project-settings');
      },
      openProfile(section = 'overview') {
        setProfileSection(section);
        setActive('profile');
      },
      async openWorkspaceSettings(workspaceId) {
        if (workspaceId) await workspaceActions.selectWorkspace(workspaceId);
        workspaceActions.selectProject(null);
        setActive('workspace-settings');
      },
      async openProjectSettings(workspaceId, projectId) {
        await workspaceActions.selectWorkspace(workspaceId);
        workspaceActions.selectProject(projectId);
        setActive('project-settings');
      },
    }),
    [active, profileSection, go]
  );
}
