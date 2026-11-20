import { useState } from 'react';
import { Panel } from '../../components/ui/Panel';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useResource } from '../../hooks/useResource';
import { moduleService } from '../../services/workspace/services';
import type { ModuleKey, ProjectDto, WorkspaceDto } from '../../types/workspace.types';
import { MODULE_ORDER } from '../workspace/moduleMeta';
import { ModuleToggleList, type ModuleToggleItem } from './ModuleToggleList';
import { can } from './permissionCatalog';

interface ProjectModulesTabProps {
  workspace: WorkspaceDto;
  project: ProjectDto;
  onChanged: () => Promise<void>;
}

/** Project modules are a subset of the workspace modules (BR-02). */
export function ProjectModulesTab({ workspace, project, onChanged }: ProjectModulesTabProps) {
  const modules = useResource(() => moduleService.listProjectModules(workspace.id, project.id), [workspace.id, project.id]);
  const [pendingKey, setPendingKey] = useState<ModuleKey | null>(null);

  const apply = useAsyncAction(async (key: ModuleKey, enabled: boolean) => {
    setPendingKey(key);
    try {
      await moduleService.setProjectModule(workspace.id, project.id, key, enabled);
      modules.reload();
      await onChanged();
    } finally {
      setPendingKey(null);
    }
  });

  if (modules.loading && !modules.data) return <LoadingView label="Loading modules..." />;
  if (modules.error) return <ErrorView message={modules.error} onRetry={modules.reload} />;

  const byKey = new Map((modules.data ?? []).map((m) => [m.key, m]));
  const items: ModuleToggleItem[] = MODULE_ORDER.flatMap((key) => {
    const dto = byKey.get(key);
    if (!dto) return [];
    return [{
      key,
      enabled: dto.enabledInProject,
      lockedReason: dto.enabledInWorkspace ? undefined : 'Disabled on the workspace. Enable it there first.',
      note: dto.enabledInProject && !dto.enabledInWorkspace ? 'Kept, but hidden until the workspace re-enables it' : undefined,
    }];
  });

  return (
    <Panel title="Project modules" description="Choose which of the workspace's enabled modules this project uses.">
      {apply.error && (
        <p role="alert" className="mb-3 text-xs text-[#EF4444]">
          {apply.error}
        </p>
      )}
      <ModuleToggleList
        items={items}
        pendingKey={pendingKey}
        canToggle={() => can(project.myPermissions, 'pmodule.select')}
        onToggle={(item) => void apply.run(item.key, !item.enabled)}
      />
    </Panel>
  );
}
