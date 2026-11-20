import { FolderGit2, Plus, Settings } from 'lucide-react';
import type { WorkspaceAreaId } from '../../types/dashboard.types';
import type { ProjectDto } from '../../types/workspace.types';
import { MODULE_META, orderModules } from '../workspace/moduleMeta';
import type { DashboardNavigation } from './useDashboardNavigation';

const NAV_BTN =
  'flex w-full items-center gap-2 border px-2.5 py-1.5 text-[13px] font-medium transition-colors';
const NAV_ON = 'border-[#22C55E] bg-[#052E16] text-[#22C55E]';
const NAV_OFF =
  'border-transparent text-[#8B949E] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]';

interface SidebarProjectsProps {
  projects: ProjectDto[];
  hasMore: boolean;
  activeProjectId: string | null;
  active: WorkspaceAreaId;
  canCreate: boolean;
  nav: DashboardNavigation;
  onCreateProject: () => void;
}

export function SidebarProjects({
  projects,
  hasMore,
  activeProjectId,
  active,
  canCreate,
  nav,
  onCreateProject,
}: SidebarProjectsProps) {
  return (
    <div className="mt-4 border-t border-[#30363D] pt-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#7D8590]">Projects</p>
        {canCreate && (
          <button
            type="button"
            onClick={onCreateProject}
            className="inline-flex items-center gap-1 border border-[#22C55E] bg-[#052E16] px-1.5 py-0.5 text-[11px] font-medium text-[#22C55E] hover:bg-[#22C55E] hover:text-[#0D1117]"
          >
            <Plus className="h-3 w-3" strokeWidth={1.5} />
            New
          </button>
        )}
      </div>

      {projects.length === 0 && (
        <p className="px-1 text-xs text-[#7D8590]">No projects visible to you yet.</p>
      )}

      <div className="space-y-0.5">
        {projects.map((project) => {
          const selected = project.id === activeProjectId;
          const modules = orderModules(project.enabledModules);
          return (
            <div key={project.id}>
              <button
                type="button"
                onClick={() => nav.openProject(project.id, modules[0])}
                className={`flex w-full items-center justify-between border px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                  selected ? 'border-[#22C55E] bg-[#052E16] text-[#E6EDF3]' : NAV_OFF
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FolderGit2
                    className={`h-3.5 w-3.5 shrink-0 ${selected ? 'text-[#22C55E]' : 'text-[#7D8590]'}`}
                    strokeWidth={1.5}
                  />
                  <span className="truncate font-medium">{project.name}</span>
                </span>
                <span className="font-mono text-[10px] text-[#7D8590]">{modules.length}</span>
              </button>

              {selected && (
                <nav className="ml-3 mt-0.5 space-y-0.5 border-l border-[#30363D] pl-2" aria-label={`${project.name} modules`}>
                  {modules.map((key) => {
                    const meta = MODULE_META[key];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => nav.openProjectModule(project.id, key)}
                        className={`${NAV_BTN} ${active === key ? NAV_ON : NAV_OFF}`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                        <span>{meta.label}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => nav.go('project-settings')}
                    className={`${NAV_BTN} ${active === 'project-settings' ? NAV_ON : NAV_OFF}`}
                  >
                    <Settings className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    <span>Project Settings</span>
                  </button>
                </nav>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <p className="mt-2 px-1 text-[11px] text-[#7D8590]">Showing the first 100 projects.</p>
      )}
    </div>
  );
}
