import { Settings } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyView } from '../../components/ui/StateViews';
import { useActiveProject, useActiveWorkspace } from '../../store/workspaceStore';
import type { ModuleKey } from '../../types/workspace.types';
import { ChatPage } from '../chat/ChatPage';
import { CloudFilesPage } from '../cloud/CloudFilesPage';
import { OfficeModulePage } from '../cloud/OfficeModulePage';
import { GitPage } from '../git/GitPage';
import { IssuesPage } from '../issues/IssuesPage';
import { WhiteboardPage } from '../whiteboard/WhiteboardPage';
import { MODULE_META } from '../workspace/moduleMeta';
import type { DashboardNavigation } from './useDashboardNavigation';

interface ModuleAreaProps {
  module: ModuleKey;
  nav: DashboardNavigation;
}

/** Renders a module for the current scope, or explains why it is unavailable (BR-09). */
export function ModuleArea({ module, nav }: ModuleAreaProps) {
  const workspace = useActiveWorkspace();
  const project = useActiveProject();
  const scope = project ?? workspace;
  const meta = MODULE_META[module];

  if (!workspace || !scope) {
    return <EmptyView title="Select a workspace" description="Pick or create a workspace to use this module." />;
  }

  if (!scope.enabledModules.includes(module)) {
    const settings = project
      ? () => nav.go('project-settings')
      : () => void nav.openWorkspaceSettings();
    return (
      <EmptyView
        title={`${meta.label} is not enabled`}
        description={`This ${project ? 'project' : 'workspace'} does not have the ${meta.label} module enabled. Existing data is kept and returns when it is enabled again.`}
        action={
          <Button type="button" variant="secondary" onClick={settings}>
            <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
            Open settings
          </Button>
        }
      />
    );
  }

  if (module === 'chat') {
    return <ChatPage workspace={workspace} project={project} />;
  }
  if (module === 'whiteboard') {
    return <WhiteboardPage workspace={workspace} project={project} />;
  }
  if (module === 'issues') {
    return (
      <IssuesPage
        workspace={workspace}
        project={project}
        onOpenProject={(projectId) => nav.openProject(projectId, 'issues')}
      />
    );
  }
  if (module === 'docs' || module === 'sheets' || module === 'slides') {
    const cloudScope = project
      ? {
          type: 'PROJECT' as const,
          workspaceId: workspace.id,
          projectId: project.id,
          permissions: project.myPermissions,
        }
      : {
          type: 'WORKSPACE' as const,
          workspaceId: workspace.id,
          permissions: workspace.myPermissions,
        };
    return (
      <OfficeModulePage
        scope={cloudScope}
        scopeLabel={project ? project.name : workspace.name}
        officeModule={module}
      />
    );
  }
  if (module === 'cloud') {
    const cloudScope = project
      ? {
          type: 'PROJECT' as const,
          workspaceId: workspace.id,
          projectId: project.id,
          permissions: project.myPermissions,
        }
      : {
          type: 'WORKSPACE' as const,
          workspaceId: workspace.id,
          permissions: workspace.myPermissions,
        };
    return <CloudFilesPage scope={cloudScope} scopeLabel={project ? project.name : workspace.name} />;
  }
  if (module === 'git') {
    if (project) {
      return (
        <GitPage
          scope={{
            type: 'PROJECT',
            workspaceId: workspace.id,
            projectId: project.id,
            permissions: project.myPermissions,
          }}
          scopeLabel={project.name}
        />
      );
    }
    return (
      <GitPage
        scope={{
          type: 'WORKSPACE',
          workspaceId: workspace.id,
          permissions: workspace.myPermissions,
        }}
        scopeLabel={workspace.name}
      />
    );
  }
  const Icon = meta.icon;
  return (
    <div className="border border-[#30363D] bg-[#161B22] p-8">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
        <h2 className="text-lg font-semibold text-[#E6EDF3]">
          {scope.name} - {meta.label}
        </h2>
      </div>
      <p className="text-sm text-[#BDBDBD]">
        The {meta.label} module is enabled for <span className="font-mono text-[#22C55E]">{scope.slug}</span>.
        Its workspace experience is coming soon.
      </p>
    </div>
  );
}
