import { useState } from 'react';
import {
  AlertTriangle,
  Blocks,
  Link2,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { AuthUser } from '../../types/auth.types';
import type { WorkspaceDto } from '../../types/workspace.types';
import { can } from './permissionCatalog';
import { WorkspaceDangerTab } from './WorkspaceDangerTab';
import { WorkspaceGeneralTab } from './WorkspaceGeneralTab';
import { WorkspaceIntegrationsTab } from './WorkspaceIntegrationsTab';
import { WorkspaceMembersTab } from './WorkspaceMembersTab';
import { WorkspaceModulesTab } from './WorkspaceModulesTab';
import { WorkspaceRolesTab } from './WorkspaceRolesTab';

type TabId = 'general' | 'members' | 'roles' | 'modules' | 'integrations' | 'danger';

interface SettingsTabDef {
  id: TabId;
  label: string;
  description: string;
  section: 'General & Access' | 'Workspace' | 'Administration';
  icon: LucideIcon;
  permissions?: string[];
  danger?: boolean;
}

const TABS: SettingsTabDef[] = [
  { id: 'general', label: 'General', description: 'Workspace identity, name, and description.', section: 'General & Access', icon: Settings },
  { id: 'members', label: 'Members', description: 'Manage workspace members, roles, and invitations.', section: 'General & Access', icon: Users, permissions: ['member.view', 'member.invite'] },
  { id: 'roles', label: 'Roles', description: 'Configure RBAC roles and permission matrices.', section: 'General & Access', icon: Shield, permissions: ['role.view'] },
  { id: 'modules', label: 'Modules', description: 'Enable or disable Orbit modules for this workspace.', section: 'Workspace', icon: Blocks },
  { id: 'integrations', label: 'Integrations', description: 'Connect external webhooks and developer tools.', section: 'Workspace', icon: Link2 },
  { id: 'danger', label: 'Danger Zone', description: 'Transfer ownership, leave, or permanently delete workspace.', section: 'Administration', icon: AlertTriangle, danger: true },
];

const SECTIONS: SettingsTabDef['section'][] = ['General & Access', 'Workspace', 'Administration'];

interface WorkspaceSettingsPageProps {
  workspace: WorkspaceDto;
  user: AuthUser;
  onChanged: () => Promise<void>;
  onLeft: () => Promise<void>;
}

export function WorkspaceSettingsPage({ workspace, user, onChanged, onLeft }: WorkspaceSettingsPageProps) {
  const [requested, setRequested] = useState<TabId>('general');
  const visible = TABS.filter(
    (tab) => !tab.permissions || tab.permissions.some((perm) => can(workspace.myPermissions, perm))
  );
  const activeTab = visible.find((tab) => tab.id === requested) ?? visible[0]!;
  const active = activeTab.id;
  const ActiveIcon = activeTab.icon;
  const isOwner = workspace.ownerId === user.id;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-[#30363D] bg-[#161B22] px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="border border-[#30363D] bg-[#21262D] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#BDBDBD]">
              WORKSPACE SETTINGS
            </span>
            <span className="font-mono text-xs text-[#7D8590]">/{workspace.slug}</span>
          </div>
          <h1 className="mt-1 truncate text-lg font-semibold text-[#E6EDF3]">{workspace.name}</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="border border-[#30363D] bg-[#0D1117] px-2.5 py-1 font-mono text-[11px] text-[#8B949E]">
            {workspace.enabledModules.length} modules active
          </span>
          <Badge tone={isOwner ? 'green' : 'neutral'} withDot>
            {isOwner ? 'Owner' : 'Member'}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <aside aria-label="Workspace settings navigation" className="w-full shrink-0 border border-[#30363D] bg-[#161B22] lg:w-60">
          {SECTIONS.map((section) => {
            const sectionTabs = visible.filter((t) => t.section === section);
            if (sectionTabs.length === 0) return null;
            return (
              <div key={section} className="border-b border-[#21262D] p-2 last:border-b-0">
                <p className="px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#7D8590]">
                  {section}
                </p>
                <div className="space-y-0.5" role="tablist" aria-label={section}>
                  {sectionTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tab.id === active;
                    const activeTone = tab.danger
                      ? 'border-l-2 border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444]'
                      : 'border-l-2 border-[#22C55E] bg-[#052E16]/50 text-[#4ADE80]';
                    const idleTone = tab.danger
                      ? 'border-l-2 border-transparent text-[#8B949E] hover:bg-[#0D1117] hover:text-[#EF4444]'
                      : 'border-l-2 border-transparent text-[#BDBDBD] hover:bg-[#0D1117] hover:text-[#E6EDF3]';
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setRequested(tab.id)}
                        className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium transition-colors ${isActive ? activeTone : idleTone}`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>

        <section className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center gap-2.5 border border-[#30363D] bg-[#161B22] px-4 py-3">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center border ${activeTab.danger ? 'border-[#EF4444]/50 bg-[#EF4444]/10 text-[#EF4444]' : 'border-[#1E5631] bg-[#052E16] text-[#22C55E]'}`}>
              <ActiveIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[#E6EDF3]">{activeTab.label}</h2>
              <p className="text-xs text-[#7D8590]">{activeTab.description}</p>
            </div>
          </div>

          <div>
            {active === 'general' && <WorkspaceGeneralTab workspace={workspace} onChanged={onChanged} />}
            {active === 'members' && (
              <WorkspaceMembersTab workspace={workspace} user={user} onChanged={onChanged} onLeft={onLeft} />
            )}
            {active === 'roles' && <WorkspaceRolesTab workspace={workspace} />}
            {active === 'modules' && <WorkspaceModulesTab workspace={workspace} onChanged={onChanged} />}
            {active === 'integrations' && <WorkspaceIntegrationsTab />}
            {active === 'danger' && (
              <WorkspaceDangerTab workspace={workspace} user={user} onChanged={onChanged} onLeft={onLeft} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
