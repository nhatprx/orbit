import {
  Bot,
  Building2,
  FolderGit2,
  LayoutDashboard,
  Plus,
  Settings,
  Shield,
} from 'lucide-react';
import type { AuthUser } from '../../types/auth.types';
import type { WorkspaceAreaId } from '../../types/dashboard.types';
import type { OrbitProject, OrbitWorkspace } from '../../types/workspace.types';
import { PROJECT_MODULE_META } from './projectModuleMeta';

interface DashboardSidebarProps {
  user: AuthUser;
  active: WorkspaceAreaId;
  workspaces: OrbitWorkspace[];
  activeWorkspaceId: string;
  projects: OrbitProject[];
  activeProject: OrbitProject | null;
  open: boolean;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectProject: (projectId: string) => void;
  onSelectArea: (area: WorkspaceAreaId) => void;
  onOpenCreateProject: () => void;
}

const NAV_BTN =
  'flex w-full items-center gap-2 border px-2.5 py-1.5 text-[13px] font-medium transition-colors';
const NAV_ON = 'border-[#22C55E] bg-[#052E16] text-[#22C55E]';
const NAV_OFF =
  'border-transparent text-[#8B949E] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]';

export function DashboardSidebar({
  user,
  active,
  workspaces,
  activeWorkspaceId,
  projects,
  activeProject,
  open,
  onSelectWorkspace,
  onSelectProject,
  onSelectArea,
  onOpenCreateProject,
}: DashboardSidebarProps) {
  if (!open) return null;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22]">
      <div className="border-b border-[#30363D] p-2.5">
        <p className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-widest text-[#7D8590]">
          Workspace
        </p>
        <div className="flex items-center border border-[#30363D] bg-[#0D1117] px-2 focus-within:border-[#22C55E]">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
          <select
            value={activeWorkspaceId}
            onChange={(e) => onSelectWorkspace(e.target.value)}
            className="h-8 w-full bg-transparent px-1.5 text-[13px] font-medium text-[#E6EDF3] focus:outline-none"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id} className="bg-[#161B22]">
                {ws.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => onSelectArea('overview')}
          className={`mt-1.5 ${NAV_BTN} ${active === 'overview' ? NAV_ON : NAV_OFF}`}
        >
          <LayoutDashboard className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectArea('ai')}
          className={`mt-0.5 ${NAV_BTN} ${active === 'ai' ? NAV_ON : NAV_OFF}`}
        >
          <Bot className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span>AI Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#7D8590]">
            Projects
          </p>
          <button
            type="button"
            onClick={onOpenCreateProject}
            className="inline-flex items-center gap-1 border border-[#22C55E] bg-[#052E16] px-1.5 py-0.5 text-[11px] font-medium text-[#22C55E] hover:bg-[#22C55E] hover:text-[#0D1117]"
          >
            <Plus className="h-3 w-3" strokeWidth={1.5} />
            New
          </button>
        </div>

        <div className="space-y-0.5">
          {projects.map((project) => {
            const isSelected = project.id === activeProject?.id;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project.id)}
                className={`flex w-full items-center justify-between border px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                  isSelected ? 'border-[#22C55E] bg-[#052E16] text-[#E6EDF3]' : NAV_OFF
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FolderGit2
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isSelected ? 'text-[#22C55E]' : 'text-[#7D8590]'
                    }`}
                    strokeWidth={1.5}
                  />
                  <span className="truncate font-medium">{project.name}</span>
                </span>
                <span className="font-mono text-[10px] text-[#7D8590]">
                  {project.enabledModules.length}
                </span>
              </button>
            );
          })}
        </div>

        {activeProject && (
          <div className="mt-4 border-t border-[#30363D] pt-3">
            <p className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-widest text-[#7D8590]">
              {activeProject.name}
            </p>
            <nav className="space-y-0.5">
              {activeProject.enabledModules.map((modId) => {
                const meta = PROJECT_MODULE_META[modId];
                const Icon = meta.icon;
                return (
                  <button
                    key={modId}
                    type="button"
                    onClick={() => onSelectArea(modId)}
                    className={`${NAV_BTN} ${active === modId ? NAV_ON : NAV_OFF}`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    <span>{meta.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => onSelectArea('project-settings')}
                className={`${NAV_BTN} ${active === 'project-settings' ? NAV_ON : NAV_OFF}`}
              >
                <Settings className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <span>Project Settings</span>
              </button>
            </nav>
          </div>
        )}

        {user.role === 'admin' && (
          <div className="mt-4 border-t border-[#30363D] pt-3">
            <p className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-widest text-[#7D8590]">
              Admin
            </p>
            <button
              type="button"
              onClick={() => onSelectArea('admin')}
              className={`${NAV_BTN} ${active === 'admin' ? NAV_ON : NAV_OFF}`}
            >
              <Shield className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              <span>Admin Console</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
