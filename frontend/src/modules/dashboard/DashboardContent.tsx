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
}

/** Areas that fill the viewport instead of scrolling inside a padded column. */
export const FULL_HEIGHT_AREAS = ['ai', 'mail', 'cloud', 'chat'] as const;

export function DashboardContent({ user, nav, onCreateWorkspace, onCreateProject }: DashboardContentProps) {
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
      return <AiChatPage workspaceName={workspace?.name ?? 'Workspace'} />;
    case 'mail':
      return <MailPage />;
    case 'cloud':
      return <CloudFilesPage user={{ ...user, workspaceId: workspace?.id ?? user.workspaceId }} />;
    case 'profile':
      return <ProfilePage user={user} nav={nav} section={nav.profileSection} onSectionChange={nav.openProfile} />;
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
