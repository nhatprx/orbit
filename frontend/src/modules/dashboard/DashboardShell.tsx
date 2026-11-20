import { useEffect, useState } from 'react';
import { workspaceActions } from '../../store/workspaceActions';
import { useStore } from '../../store/createStore';
import { useActiveProject, useActiveWorkspace, workspaceStore } from '../../store/workspaceStore';
import type { AuthSession } from '../../types/auth.types';
import { CreateProjectModal } from '../workspace/CreateProjectModal';
import { CreateWorkspaceWizard } from '../workspace/CreateWorkspaceWizard';
import { DashboardContent, FULL_HEIGHT_AREAS } from './DashboardContent';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { useDashboardNavigation } from './useDashboardNavigation';

interface DashboardShellProps {
  session: AuthSession;
  /** A Workspace joined through an invitation, opened first. */
  initialWorkspaceId?: string | null;
  notice?: string | null;
  onNavigateHome: () => void;
  onLogout: () => void;
}

export function DashboardShell({
  session,
  initialWorkspaceId = null,
  notice = null,
  onNavigateHome,
  onLogout,
}: DashboardShellProps) {
  const user = session.user;
  const nav = useDashboardNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const workspace = useActiveWorkspace();
  const project = useActiveProject();
  const userId = useStore(workspaceStore, (s) => s.userId);

  useEffect(() => {
    void workspaceActions.bootstrap(user.id, initialWorkspaceId);
    return () => workspaceActions.reset();
  }, [user.id, initialWorkspaceId]);

  const canCreateProject = workspace?.myPermissions.includes('project.create') ?? false;
  const fullHeight = (FULL_HEIGHT_AREAS as readonly string[]).includes(nav.active);

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0D1117] text-[#E6EDF3]">
      <DashboardHeader
        user={user}
        workspaceName={workspace?.name ?? null}
        projectName={project?.name ?? null}
        nav={nav}
        canCreateProject={canCreateProject}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onCreateWorkspace={() => setWizardOpen(true)}
        onCreateProject={() => setProjectOpen(true)}
        onNavigateHome={onNavigateHome}
        onLogout={onLogout}
      />

      {notice && (
        <p role="status" className="border-b border-[#EAB308] bg-[#161B22] px-4 py-2 text-xs text-[#EAB308]">
          {notice}
        </p>
      )}

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          user={user}
          open={sidebarOpen}
          nav={nav}
          onCreateWorkspace={() => setWizardOpen(true)}
          onCreateProject={() => setProjectOpen(true)}
        />

        <main className={fullHeight ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto p-5'}>
          <div className={fullHeight ? 'h-full' : 'mx-auto max-w-6xl'}>
            {userId && (
              <DashboardContent
                user={user}
                nav={nav}
                onCreateWorkspace={() => setWizardOpen(true)}
                onCreateProject={() => setProjectOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      {wizardOpen && (
        <CreateWorkspaceWizard
          open
          onClose={() => setWizardOpen(false)}
          onCreate={async (request) => {
            await workspaceActions.createWorkspace(request);
            nav.go('overview');
          }}
        />
      )}

      <CreateProjectModal
        open={projectOpen}
        workspaceName={workspace?.name ?? 'Workspace'}
        inheritedModules={workspace?.enabledModules ?? []}
        onClose={() => setProjectOpen(false)}
        onCreate={async (request) => {
          const created = await workspaceActions.createProject(request);
          nav.openProject(created.id, created.enabledModules[0]);
        }}
      />
    </div>
  );
}
