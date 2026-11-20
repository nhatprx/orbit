import { useState } from 'react';
import { AlertTriangle, Blocks, Link2, Mail, Settings, Shield, Users } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import type { AuthUser } from '../../types/auth.types';
import type { WorkspaceDto } from '../../types/workspace.types';
import { can } from './permissionCatalog';
import { WorkspaceDangerTab } from './WorkspaceDangerTab';
import { WorkspaceGeneralTab } from './WorkspaceGeneralTab';
import { WorkspaceIntegrationsTab } from './WorkspaceIntegrationsTab';
import { WorkspaceInvitesTab } from './WorkspaceInvitesTab';
import { WorkspaceMembersTab } from './WorkspaceMembersTab';
import { WorkspaceModulesTab } from './WorkspaceModulesTab';
import { WorkspaceRolesTab } from './WorkspaceRolesTab';

type TabId = 'general' | 'members' | 'roles' | 'invites' | 'modules' | 'integrations' | 'danger';

const TABS: (TabItem<TabId> & { permission?: string })[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users, permission: 'member.view' },
  { id: 'roles', label: 'Roles', icon: Shield, permission: 'role.view' },
  { id: 'invites', label: 'Invites', icon: Mail, permission: 'member.invite' },
  { id: 'modules', label: 'Modules', icon: Blocks },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

interface WorkspaceSettingsPageProps {
  workspace: WorkspaceDto;
  user: AuthUser;
  onChanged: () => Promise<void>;
  onLeft: () => Promise<void>;
}

export function WorkspaceSettingsPage({ workspace, user, onChanged, onLeft }: WorkspaceSettingsPageProps) {
  const [requested, setRequested] = useState<TabId>('general');
  const visible = TABS.filter((tab) => !tab.permission || can(workspace.myPermissions, tab.permission));
  const active = visible.some((tab) => tab.id === requested) ? requested : 'general';
  const isOwner = workspace.ownerId === user.id;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-[#30363D] bg-[#161B22] p-4">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-[#E6EDF3]">{workspace.name} - Settings</h1>
          <p className="mt-0.5 font-mono text-xs text-[#7D8590]">{workspace.slug}</p>
        </div>
        <Badge tone={isOwner ? 'green' : 'neutral'} withDot>
          {isOwner ? 'Owner' : 'Member'}
        </Badge>
      </div>

      <Tabs tabs={visible} active={active} onChange={setRequested} />

      <div>
        {active === 'general' && <WorkspaceGeneralTab workspace={workspace} onChanged={onChanged} />}
        {active === 'members' && (
          <WorkspaceMembersTab workspace={workspace} user={user} onChanged={onChanged} onLeft={onLeft} />
        )}
        {active === 'roles' && <WorkspaceRolesTab workspace={workspace} />}
        {active === 'invites' && <WorkspaceInvitesTab workspace={workspace} />}
        {active === 'modules' && <WorkspaceModulesTab workspace={workspace} onChanged={onChanged} />}
        {active === 'integrations' && <WorkspaceIntegrationsTab />}
        {active === 'danger' && (
          <WorkspaceDangerTab workspace={workspace} user={user} onChanged={onChanged} onLeft={onLeft} />
        )}
      </div>
    </div>
  );
}
