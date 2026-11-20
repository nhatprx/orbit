import { useState } from 'react';
import { AlertTriangle, Blocks, Settings, Shield, Users } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import type { AuthUser } from '../../types/auth.types';
import type { ProjectDto, WorkspaceDto } from '../../types/workspace.types';
import { pluralize } from '../../utils/format';
import { ProjectDangerTab } from './ProjectDangerTab';
import { ProjectGeneralTab } from './ProjectGeneralTab';
import { ProjectMembersTab } from './ProjectMembersTab';
import { ProjectModulesTab } from './ProjectModulesTab';
import { ProjectRolesTab } from './ProjectRolesTab';

type TabId = 'general' | 'members' | 'roles' | 'modules' | 'danger';

const TABS: TabItem<TabId>[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'roles', label: 'Roles', icon: Shield },
  { id: 'modules', label: 'Modules', icon: Blocks },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

interface ProjectSettingsPageProps {
  workspace: WorkspaceDto;
  project: ProjectDto;
  user: AuthUser;
  onChanged: () => Promise<void>;
  /** Called after the project is deleted or the user leaves it. */
  onDeleted: () => Promise<void>;
}

export function ProjectSettingsPage({ workspace, project, user, onChanged, onDeleted }: ProjectSettingsPageProps) {
  const [tab, setTab] = useState<TabId>('general');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-[#30363D] bg-[#161B22] p-4">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-[#E6EDF3]">{project.name} - Settings</h1>
          <p className="mt-0.5 font-mono text-xs text-[#7D8590]">
            {workspace.name} / {project.slug}
          </p>
        </div>
        <Badge tone="green" withDot>
          {pluralize(project.memberCount, 'member')}
        </Badge>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div>
        {tab === 'general' && <ProjectGeneralTab workspace={workspace} project={project} onChanged={onChanged} />}
        {tab === 'members' && <ProjectMembersTab workspace={workspace} project={project} user={user} onChanged={onChanged} onLeft={onDeleted} />}
        {tab === 'roles' && <ProjectRolesTab workspace={workspace} project={project} />}
        {tab === 'modules' && <ProjectModulesTab workspace={workspace} project={project} onChanged={onChanged} />}
        {tab === 'danger' && <ProjectDangerTab workspace={workspace} project={project} user={user} onDeleted={onDeleted} />}
      </div>
    </div>
  );
}
