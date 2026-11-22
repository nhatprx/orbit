import { Bot, LayoutDashboard, Settings, Shield, Users } from 'lucide-react';
import { useStore } from '../../store/createStore';
import { useActiveWorkspace, workspaceStore } from '../../store/workspaceStore';
import type { AuthUser } from '../../types/auth.types';
import type { WorkspaceAreaId } from '../../types/dashboard.types';
import { MODULE_META, orderModules } from '../workspace/moduleMeta';
import { WorkspaceSwitcher } from '../workspace/WorkspaceSwitcher';
import { SidebarProjects } from './SidebarProjects';
import type { DashboardNavigation } from './useDashboardNavigation';

interface DashboardSidebarProps {
  user: AuthUser;
  open: boolean;
  nav: DashboardNavigation;
  onCreateWorkspace: () => void;
  onCreateProject: () => void;
}

const NAV_BTN =
  'flex w-full items-center gap-2 border px-2.5 py-1.5 text-[13px] font-medium transition-colors';
const NAV_ON = 'border-[#22C55E] bg-[#052E16] text-[#22C55E]';
const NAV_OFF =
  'border-transparent text-[#8B949E] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]';
const SECTION_LABEL = 'mb-1.5 px-1 font-mono text-[10px] uppercase tracking-widest text-[#7D8590]';

function NavItem(props: {
  area: WorkspaceAreaId;
  active: WorkspaceAreaId;
  label: string;
  icon: typeof Bot;
  onClick: () => void;
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`${NAV_BTN} ${props.active === props.area ? NAV_ON : NAV_OFF}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
      <span>{props.label}</span>
    </button>
  );
}

export function DashboardSidebar({ user, open, nav, onCreateWorkspace, onCreateProject }: DashboardSidebarProps) {
  const workspaces = useStore(workspaceStore, (s) => s.workspaces);
  const projects = useStore(workspaceStore, (s) => s.projects);
  const hasMore = useStore(workspaceStore, (s) => s.projectsHasMore);
  const activeProjectId = useStore(workspaceStore, (s) => s.activeProjectId);
  const workspace = useActiveWorkspace();

  if (!open) return null;

  const isAdminUser = user.role === 'admin';
  const scopedToWorkspace = activeProjectId === null;
  const modules = workspace ? orderModules(workspace.enabledModules) : [];
  const canCreateProject = workspace?.myPermissions.includes('project.create') ?? false;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22]">
      {!isAdminUser && (
        <div className="border-b border-[#30363D] p-2.5">
          <p className={SECTION_LABEL}>Workspace</p>
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={workspace?.id ?? null}
            onSelect={(id) => void nav.switchWorkspace(id)}
            onCreate={onCreateWorkspace}
          />
          <div className="mt-1.5 space-y-0.5">
            <NavItem area="overview" active={nav.active} label="Overview" icon={LayoutDashboard} onClick={() => nav.go('overview')} />
            <NavItem area="ai" active={nav.active} label="AI Chat" icon={Bot} onClick={() => nav.go('ai')} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2.5 py-3">
        {!isAdminUser && workspace && (
          <>
            <p className={SECTION_LABEL}>Workspace modules</p>
            <nav className="space-y-0.5" aria-label="Workspace modules">
              {modules.length === 0 && <p className="px-1 text-xs text-[#7D8590]">No modules enabled.</p>}
              {modules.map((key) => (
                <NavItem
                  key={key}
                  area={key}
                  active={scopedToWorkspace ? nav.active : 'overview'}
                  label={MODULE_META[key].label}
                  icon={MODULE_META[key].icon}
                  onClick={() => nav.openWorkspaceModule(key)}
                />
              ))}
              <NavItem
                area="workspace-settings"
                active={nav.active}
                label="Workspace Settings"
                icon={Settings}
                onClick={() => void nav.openWorkspaceSettings()}
              />
            </nav>

            <SidebarProjects
              projects={projects}
              hasMore={hasMore}
              activeProjectId={activeProjectId}
              active={nav.active}
              canCreate={canCreateProject}
              nav={nav}
              onCreateProject={onCreateProject}
            />
          </>
        )}

        {isAdminUser && (
          <div className="space-y-0.5">
            <p className={SECTION_LABEL}>Admin</p>
            <NavItem area="admin" active={nav.active} label="Admin Console" icon={Shield} onClick={() => nav.go('admin')} />
            <NavItem area="admin-users" active={nav.active} label="User Management" icon={Users} onClick={() => nav.go('admin-users')} />
            <NavItem area="ai" active={nav.active} label="AI Chat" icon={Bot} onClick={() => nav.go('ai')} />
          </div>
        )}
      </div>
    </aside>
  );
}
