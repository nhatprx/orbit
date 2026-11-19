import {
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
    <aside className="flex w-72 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22]">
      <div className="border-b border-[#30363D] p-3">
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">
          Workspace (Level 1)
        </p>
        <div className="flex items-center border border-[#3B434B] bg-[#0D1117] px-2.5 focus-within:border-[#22C55E]">
          <Building2 className="h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
          <select
            value={activeWorkspaceId}
            onChange={(e) => onSelectWorkspace(e.target.value)}
            className="h-9 w-full bg-transparent px-2 text-sm font-medium text-[#E6EDF3] focus:outline-none"
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
          className={`mt-2 flex w-full items-center gap-2.5 border px-3 py-2 text-sm font-medium transition-colors ${
            active === 'overview'
              ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
              : 'border-transparent text-[#BDBDBD] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
          }`}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>Workspace Overview</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">
            Projects (Level 2)
          </p>
          <button
            type="button"
            onClick={onOpenCreateProject}
            className="inline-flex items-center gap-1 border border-[#22C55E] bg-[#052E16] px-2 py-0.5 text-xs font-medium text-[#22C55E] hover:bg-[#22C55E] hover:text-[#0D1117]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            Create
          </button>
        </div>

        <div className="space-y-1">
          {projects.map((project) => {
            const isSelected = project.id === activeProject?.id;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project.id)}
                className={`flex w-full items-center justify-between border px-2.5 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'border-[#22C55E] bg-[#052E16] text-[#E6EDF3]'
                    : 'border-transparent text-[#BDBDBD] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <FolderGit2
                    className={`h-4 w-4 shrink-0 ${
                      isSelected ? 'text-[#22C55E]' : 'text-[#8A8A8A]'
                    }`}
                    strokeWidth={1.5}
                  />
                  <span className="truncate font-medium">{project.name}</span>
                </span>
                <span className="font-mono text-[11px] text-[#8A8A8A]">
                  {project.enabledModules.length}
                </span>
              </button>
            );
          })}
        </div>

        {activeProject && (
          <div className="mt-5 border-t border-[#30363D] pt-4">
            <p className="mb-2 px-2 font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">
              {activeProject.name} Modules
            </p>
            <nav className="space-y-1">
              {activeProject.enabledModules.map((modId) => {
                const meta = PROJECT_MODULE_META[modId];
                const Icon = meta.icon;
                const selected = active === modId;
                return (
                  <button
                    key={modId}
                    type="button"
                    onClick={() => onSelectArea(modId)}
                    className={`flex w-full items-center gap-3 border px-3 py-2 text-sm font-medium transition-colors ${
                      selected
                        ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                        : 'border-transparent text-[#BDBDBD] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span>{meta.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => onSelectArea('project-settings')}
                className={`flex w-full items-center gap-3 border px-3 py-2 text-sm font-medium transition-colors ${
                  active === 'project-settings'
                    ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                    : 'border-transparent text-[#8A8A8A] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>Project Settings</span>
              </button>
            </nav>
          </div>
        )}

        {user.role === 'admin' && (
          <div className="mt-5 border-t border-[#30363D] pt-4">
            <p className="mb-2 px-2 font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">
              Administration
            </p>
            <button
              type="button"
              onClick={() => onSelectArea('admin')}
              className={`flex w-full items-center gap-3 border px-3 py-2 text-sm font-medium transition-colors ${
                active === 'admin'
                  ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                  : 'border-transparent text-[#BDBDBD] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
              }`}
            >
              <Shield className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>Admin Console</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
