import { Settings } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useResource } from '../../hooks/useResource';
import { projectService } from '../../services/workspace/services';
import type { ProjectDto } from '../../types/workspace.types';
import type { DashboardNavigation } from '../dashboard/useDashboardNavigation';
import { MODULE_META, orderModules } from '../workspace/moduleMeta';

interface WorkspaceGroup {
  workspaceId: string;
  workspaceName: string;
  projects: ProjectDto[];
}

/** O-08: projects from every Workspace, grouped by Workspace. */
export function groupByWorkspace(projects: ProjectDto[]): WorkspaceGroup[] {
  const groups = new Map<string, WorkspaceGroup>();
  for (const project of projects) {
    const group = groups.get(project.workspaceId) ?? {
      workspaceId: project.workspaceId,
      workspaceName: project.workspaceName,
      projects: [],
    };
    group.projects.push(project);
    groups.set(project.workspaceId, group);
  }
  return [...groups.values()];
}

export function ProfileProjectsSection({ nav }: { nav: DashboardNavigation }) {
  const list = useResource(() => projectService.listMyProjects(0, 100), []);

  if (list.loading && !list.data) return <LoadingView label="Loading your projects..." />;
  if (list.error) return <ErrorView message={list.error} onRetry={list.reload} />;
  const groups = groupByWorkspace(list.data?.items ?? []);
  if (groups.length === 0) {
    return <EmptyView title="No projects yet" description="Projects you belong to appear here, grouped by workspace." />;
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.workspaceId}>
          <h3 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
            {group.workspaceName}
          </h3>
          <div className="divide-y divide-[#30363D] border border-[#30363D] bg-[#161B22]">
            {group.projects.map((project) => {
              const modules = orderModules(project.enabledModules);
              return (
                <div key={project.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => void nav.openProjectIn(project.workspaceId, project.id, modules[0])}
                      className="truncate text-[13px] font-semibold text-[#E6EDF3] hover:text-[#22C55E]"
                    >
                      {project.name}
                    </button>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {modules.map((key) => (
                        <Badge key={key} tone="green">
                          {MODULE_META[key].label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => void nav.openProjectSettings(project.workspaceId, project.id)}>
                    <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Settings
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
