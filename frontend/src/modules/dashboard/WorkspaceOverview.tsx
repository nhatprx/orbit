import { ArrowUpRight, Building2, FolderPlus, Settings } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useStore } from '../../store/createStore';
import { workspaceActions } from '../../store/workspaceActions';
import { useActiveWorkspace, workspaceStore } from '../../store/workspaceStore';
import type { AuthUser } from '../../types/auth.types';
import { formatRelative, pluralize } from '../../utils/format';
import { MODULE_META, orderModules } from '../workspace/moduleMeta';
import type { DashboardNavigation } from './useDashboardNavigation';

interface WorkspaceOverviewProps {
  user: AuthUser;
  nav: DashboardNavigation;
  onCreateWorkspace: () => void;
  onCreateProject: () => void;
}

const SECTION_TITLE = 'mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]';

export function WorkspaceOverview({ user, nav, onCreateWorkspace, onCreateProject }: WorkspaceOverviewProps) {
  const status = useStore(workspaceStore, (s) => s.status);
  const error = useStore(workspaceStore, (s) => s.error);
  const workspaces = useStore(workspaceStore, (s) => s.workspaces);
  const projects = useStore(workspaceStore, (s) => s.projects);
  const workspace = useActiveWorkspace();

  if (status === 'loading' || status === 'idle') return <LoadingView label="Loading your workspaces..." />;
  if (status === 'error') {
    return <ErrorView message={error ?? 'Could not load workspaces.'} onRetry={() => void workspaceActions.bootstrap(user.id)} />;
  }

  if (!workspace || workspaces.length === 0) {
    return (
      <EmptyView
        title="Create your first workspace"
        description="A workspace holds your projects, members, roles, and modules. Choose the modules you need and invite your team."
        action={
          <Button type="button" variant="primary" onClick={onCreateWorkspace}>
            <Building2 className="h-4 w-4" strokeWidth={1.5} />
            Create workspace
          </Button>
        }
      />
    );
  }

  const canCreateProject = workspace.myPermissions.includes('project.create');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#30363D] bg-[#161B22] p-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight text-[#E6EDF3]">{workspace.name}</h2>
          <p className="mt-0.5 text-[13px] text-[#8B949E]">
            {workspace.description ?? 'No description yet.'}
          </p>
          <p className="mt-1 font-mono text-[11px] text-[#7D8590]">
            {pluralize(workspace.projectCount, 'project')}, {pluralize(workspace.memberCount, 'member')}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex flex-wrap gap-1">
            {orderModules(workspace.enabledModules).map((key) => (
              <Badge key={key} tone="green">
                {MODULE_META[key].label}
              </Badge>
            ))}
          </div>
          {canCreateProject && (
            <Button type="button" variant="primary" onClick={onCreateProject}>
              <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
              Create Project
            </Button>
          )}
        </div>
      </div>

      <div>
        <h3 className={SECTION_TITLE}>Projects</h3>
        {projects.length === 0 ? (
          <EmptyView
            title="No projects yet"
            description={
              canCreateProject
                ? 'Create a project to start working with the modules this workspace has enabled.'
                : 'You are not a member of any project in this workspace yet.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-px border border-[#30363D] bg-[#30363D] md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const modules = orderModules(project.enabledModules);
              return (
                <div key={project.id} className="flex flex-col justify-between bg-[#161B22] p-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => nav.openProject(project.id, modules[0])}
                        className="flex min-w-0 items-center gap-1 text-sm font-semibold text-[#E6EDF3] hover:text-[#22C55E]"
                      >
                        <span className="truncate">{project.name}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        title="Project settings"
                        aria-label={`Settings for ${project.name}`}
                        onClick={() => void nav.openProjectSettings(project.workspaceId, project.id)}
                        className="text-[#7D8590] hover:text-[#22C55E]"
                      >
                        <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                    <p className="mb-3.5 text-[13px] leading-snug text-[#8B949E]">
                      {project.description ?? 'No description.'}
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap gap-1">
                      {modules.map((key) => (
                        <Badge key={key} tone="green">
                          {MODULE_META[key].label}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-[#30363D] pt-2 font-mono text-[11px] text-[#7D8590]">
                      <span>{pluralize(project.memberCount, 'member')}</span>
                      <span>{formatRelative(project.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
