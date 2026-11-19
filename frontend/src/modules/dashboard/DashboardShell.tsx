import { useCallback, useEffect, useState } from 'react';
import { workspaceService } from '../../services/workspace.service';
import type { AuthSession } from '../../types/auth.types';
import type { WorkspaceAreaId } from '../../types/dashboard.types';
import type {
  CreateProjectPayload,
  OrbitProject,
  OrbitWorkspace,
  ProjectModuleId,
} from '../../types/workspace.types';
import { AiChatPage } from '../ai/AiChatPage';
import { CommunityChatPage } from '../chat/CommunityChatPage';
import { CloudFilesPage } from '../cloud/CloudFilesPage';
import { GitPage } from '../git/GitPage';
import { MailPage } from '../mail/MailPage';
import { ProfilePage } from '../profile/ProfilePage';
import { CreateProjectModal } from '../workspace/CreateProjectModal';
import { ProjectSettingsView } from '../workspace/ProjectSettingsView';
import { AdminOverview } from './AdminOverview';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { UserOverview } from './UserOverview';

interface DashboardShellProps {
  session: AuthSession;
  onNavigateHome: () => void;
  onLogout: () => void;
}

export function DashboardShell({
  session,
  onNavigateHome,
  onLogout,
}: DashboardShellProps) {
  const [active, setActive] = useState<WorkspaceAreaId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [workspaces, setWorkspaces] = useState<OrbitWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('ws_orbit_core');
  const [projects, setProjects] = useState<OrbitProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);

  const loadProjects = useCallback(async (wsId: string) => {
    const items = await workspaceService.listProjects(wsId);
    setProjects(items);
    setActiveProjectId((prev) =>
      items.some((p) => p.id === prev) ? prev : (items[0]?.id ?? '')
    );
  }, []);

  useEffect(() => {
    workspaceService.listWorkspaces().then(setWorkspaces);
  }, []);

  useEffect(() => {
    void loadProjects(activeWorkspaceId);
  }, [activeWorkspaceId, loadProjects]);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const activeProject =
    projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null;

  const currentUser = { ...session.user, workspaceId: activeWorkspaceId };

  function handleSelectProject(projectId: string) {
    setActiveProjectId(projectId);
    const next = projects.find((p) => p.id === projectId);
    if (next && next.enabledModules.length > 0) {
      setActive(next.enabledModules[0]!);
    } else {
      setActive('project-settings');
    }
  }

  async function handleCreateProject(payload: CreateProjectPayload) {
    const created = await workspaceService.createProject(payload);
    await loadProjects(activeWorkspaceId);
    setActiveProjectId(created.id);
    setActive(created.enabledModules[0] ?? 'project-settings');
  }

  async function handleToggleModule(projectId: string, moduleId: ProjectModuleId) {
    const updated = await workspaceService.toggleProjectModule(projectId, moduleId);
    await loadProjects(activeWorkspaceId);
    if (updated && active === moduleId && !updated.enabledModules.includes(moduleId)) {
      setActive('project-settings');
    }
  }

  async function handleDeleteProject(projectId: string) {
    await workspaceService.deleteProject(projectId);
    await loadProjects(activeWorkspaceId);
    setActive('overview');
  }

  const fullHeight =
    active === 'ai' || active === 'mail' || active === 'cloud' || active === 'chat';

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0D1117] text-[#E6EDF3]">
      <DashboardHeader
        user={currentUser}
        workspaceName={activeWorkspace?.name ?? 'Workspace'}
        projectName={activeProject?.name ?? ''}
        active={active}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onSelectArea={setActive}
        onNavigateHome={onNavigateHome}
        onLogout={onLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          user={currentUser}
          active={active}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          projects={projects}
          activeProject={activeProject}
          open={sidebarOpen}
          onSelectWorkspace={(wsId) => {
            setActiveWorkspaceId(wsId);
            setActive('overview');
          }}
          onSelectProject={handleSelectProject}
          onSelectArea={setActive}
          onOpenCreateProject={() => setCreateOpen(true)}
        />

        <main className={fullHeight ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto p-5'}>
          {active === 'ai' ? (
            <AiChatPage workspaceName={activeWorkspace?.name ?? 'Workspace'} />
          ) : active === 'mail' ? (
            <MailPage user={currentUser} />
          ) : active === 'cloud' ? (
            <CloudFilesPage user={currentUser} />
          ) : active === 'chat' ? (
            <CommunityChatPage user={currentUser} />
          ) : (
            <div className="mx-auto max-w-6xl">
              {active === 'overview' && (
                <UserOverview
                  user={currentUser}
                  workspace={activeWorkspace}
                  projects={projects}
                  onOpenProject={(p) => handleSelectProject(p.id)}
                  onOpenProjectSettings={(p) => {
                    setActiveProjectId(p.id);
                    setActive('project-settings');
                  }}
                  onOpenCreateProject={() => setCreateOpen(true)}
                />
              )}
              {active === 'git' && (
                <GitPage workspaceId={activeProject?.slug ?? activeWorkspaceId} />
              )}
              {active === 'project-settings' && activeProject && (
                <ProjectSettingsView
                  project={activeProject}
                  canDelete={projects.length > 1}
                  onToggleModule={(pid, mid) => void handleToggleModule(pid, mid)}
                  onDeleteProject={(pid) => void handleDeleteProject(pid)}
                />
              )}
              {active === 'profile' && <ProfilePage user={currentUser} />}
              {active === 'admin' && <AdminOverview user={currentUser} />}
              {['docs', 'sheets', 'ppt', 'markdown'].includes(active) && (
                <div className="border border-[#30363D] bg-[#161B22] p-8">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 bg-[#22C55E]" />
                    <h2 className="text-lg font-semibold uppercase text-[#E6EDF3]">
                      {activeProject?.name} — {active}
                    </h2>
                  </div>
                  <p className="text-sm text-[#BDBDBD]">
                    Module enabled for <span className="font-mono text-[#22C55E]">{activeProject?.slug}</span>.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <CreateProjectModal
        open={createOpen}
        workspaceId={activeWorkspaceId}
        workspaceName={activeWorkspace?.name ?? 'Workspace'}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
}
