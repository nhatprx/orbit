import { useState } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Panel } from '../../components/ui/Panel';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useResource } from '../../hooks/useResource';
import { moduleService } from '../../services/workspace/services';
import type { ModuleKey, WorkspaceDto, WorkspaceModuleDto } from '../../types/workspace.types';
import { MODULE_ORDER, isModuleKey } from '../workspace/moduleMeta';
import { ModuleToggleList, type ModuleToggleItem } from './ModuleToggleList';
import { can } from './permissionCatalog';

interface WorkspaceModulesTabProps {
  workspace: WorkspaceDto;
  onChanged: () => Promise<void>;
}

export function WorkspaceModulesTab({ workspace, onChanged }: WorkspaceModulesTabProps) {
  const modules = useResource(() => moduleService.listWorkspaceModules(workspace.id), [workspace.id]);
  const [pendingKey, setPendingKey] = useState<ModuleKey | null>(null);
  const [warning, setWarning] = useState<WorkspaceModuleDto | null>(null);

  const apply = useAsyncAction(async (key: ModuleKey, enabled: boolean) => {
    setPendingKey(key);
    try {
      await moduleService.setWorkspaceModule(workspace.id, key, enabled);
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
      enabled: dto.enabled,
      note: dto.activeProjectCount > 0 ? `Used by ${dto.activeProjectCount} project(s)` : undefined,
    }];
  });

  function toggle(item: ModuleToggleItem) {
    const dto = byKey.get(item.key);
    if (!dto) return;
    if (item.enabled && dto.activeProjectCount > 0) setWarning(dto);
    else void apply.run(item.key, !item.enabled);
  }

  return (
    <Panel title="Workspace modules" description="Projects can only use modules enabled here. Disabling a module hides it everywhere but keeps its data.">
      {apply.error && (
        <p role="alert" className="mb-3 text-xs text-[#EF4444]">
          {apply.error}
        </p>
      )}
      <ModuleToggleList
        items={items}
        pendingKey={pendingKey}
        canToggle={(item) => can(workspace.myPermissions, item.enabled ? 'module.disable' : 'module.enable')}
        onToggle={toggle}
      />
      <ConfirmDialog
        open={warning !== null}
        danger
        title="Disable module"
        message={`${warning?.name ?? 'This module'} is used by ${warning?.activeProjectCount ?? 0} project(s). It will be hidden from all of them. Its data is kept and returns if you enable it again.`}
        confirmLabel="Disable module"
        onConfirm={async () => {
          if (warning && isModuleKey(warning.key)) await moduleService.setWorkspaceModule(workspace.id, warning.key, false);
          modules.reload();
          await onChanged();
        }}
        onClose={() => setWarning(null)}
      />
    </Panel>
  );
}
