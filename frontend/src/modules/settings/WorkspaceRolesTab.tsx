import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Panel } from '../../components/ui/Panel';
import { useResource } from '../../hooks/useResource';
import { roleService } from '../../services/workspace/services';
import type { WorkspaceDto } from '../../types/workspace.types';
import { can, WORKSPACE_PERMISSIONS } from './permissionCatalog';
import { RolesManager, type RoleApi } from './RolesManager';

export function WorkspaceRolesTab({ workspace }: { workspace: WorkspaceDto }) {
  const roles = useResource(() => roleService.listWorkspaceRoles(workspace.id), [workspace.id]);
  const perms = workspace.myPermissions;

  const api: RoleApi = {
    create: (request) => roleService.createWorkspaceRole(workspace.id, request),
    update: (roleId, request) => roleService.updateWorkspaceRole(workspace.id, roleId, request),
    remove: (roleId) => roleService.deleteWorkspaceRole(workspace.id, roleId),
  };

  if (roles.loading && !roles.data) return <LoadingView label="Loading roles..." />;
  if (roles.error) return <ErrorView message={roles.error} onRetry={roles.reload} />;

  return (
    <Panel title="Workspace roles" description="Custom roles for this workspace. Project roles are managed separately.">
      <RolesManager
        roles={roles.data ?? []}
        definitions={WORKSPACE_PERMISSIONS}
        callerPermissions={perms}
        canCreate={can(perms, 'role.create')}
        canEdit={can(perms, 'role.edit')}
        canDelete={can(perms, 'role.delete')}
        baselineKey="workspace.view"
        api={api}
        onChanged={roles.reload}
      />
    </Panel>
  );
}
