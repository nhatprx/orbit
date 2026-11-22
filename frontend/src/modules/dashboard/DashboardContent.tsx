import { workspaceActions } from '../../store/workspaceActions';
import { useActiveProject, useActiveWorkspace } from '../../store/workspaceStore';
import type { AuthUser } from '../../types/auth.types';
import { EmptyView } from '../../components/ui/StateViews';
import { AiChatPage } from '../ai/AiChatPage';
import { CloudFilesPage } from '../cloud/CloudFilesPage';
import { MailPage } from '../mail/MailPage';
import { ProfilePage } from '../profile/ProfilePage';
import { ProjectSettingsPage } from '../settings/ProjectSettingsPage';
import { WorkspaceSettingsPage } from '../settings/WorkspaceSettingsPage';
import { isModuleKey } from '../workspace/moduleMeta';
import { AdminOverview } from './AdminOverview';
import { ModuleArea } from './ModuleArea';
import { WorkspaceOverview } from './WorkspaceOverview';
import type { DashboardNavigation } from './useDashboardNavigation';

interface DashboardContentProps {
  user: AuthUser;
  nav: DashboardNavigation;
  onCreateWorkspace: () => void;
  onCreateProject: () => void;
  onUserUpdated?: (user: AuthUser) => void;
}

/** Areas that fill the viewport instead of scrolling inside a padded column. */
export const FULL_HEIGHT_AREAS = ['ai', 'mail', 'cloud', 'docs', 'sheets', 'slides', 'personal-cloud', 'chat', 'issues', 'whiteboard'] as const;

export function DashboardContent({
  user,
  nav,
  onCreateWorkspace,
  onCreateProject,
  onUserUpdated,
}: DashboardContentProps) {
  const workspace = useActiveWorkspace();
  const project = useActiveProject();
  const { active } = nav;

  switch (active) {
    case 'overview':
      return (
        <WorkspaceOverview
          user={user}
          nav={nav}
          onCreateWorkspace={onCreateWorkspace}
          onCreateProject={onCreateProject}
        />
      );
    case 'ai':
      return (
        <AiChatPage
          workspaceId={workspace?.id ?? null}
          workspaceName={workspace?.name ?? 'Workspace'}
          projectId={project?.id ?? null}
          projectName={project?.name ?? null}
        />
      );
    case 'mail':
      return <MailPage />;
    case 'personal-cloud':
      return <CloudFilesPage scope={{ type: 'USER' }} />;
    case 'profile':
      return (
        <ProfilePage
          user={user}
          nav={nav}
          section={nav.profileSection}
          onSectionChange={nav.openProfile}
          onUserUpdated={onUserUpdated}
        />
      );
    case 'admin':
      return <AdminOverview user={user} />;
    case 'workspace-settings':
      return workspace ? (
        <WorkspaceSettingsPage
          workspace={workspace}
          user={user}
          onChanged={() => workspaceActions.refreshAll()}
          onLeft={() => {
            nav.go('overview');
            return workspaceActions.refreshAll();
          }}
        />
      ) : (
        <EmptyView title="No workspace selected" description="Create or select a workspace first." />
      );
    case 'project-settings':
      return workspace && project ? (
        <ProjectSettingsPage
          workspace={workspace}
          project={project}
          user={user}
          onChanged={() => workspaceActions.refreshAll()}
          onDeleted={async () => {
            workspaceActions.selectProject(null);
            nav.go('overview');
            await workspaceActions.refreshAll();
          }}
        />
      ) : (
        <EmptyView title="No project selected" description="Select a project from the sidebar." />
      );
    default:
      return isModuleKey(active) ? <ModuleArea module={active} nav={nav} /> : null;
  }
}
