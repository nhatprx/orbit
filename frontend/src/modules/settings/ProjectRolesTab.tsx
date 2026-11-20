import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Panel } from '../../components/ui/Panel';
import { useResource } from '../../hooks/useResource';
import { roleService } from '../../services/workspace/services';
import type { ProjectDto, WorkspaceDto } from '../../types/workspace.types';
import { can, PROJECT_PERMISSIONS } from './permissionCatalog';
import { RolesManager, type RoleApi } from './RolesManager';

interface ProjectRolesTabProps {
  workspace: WorkspaceDto;
  project: ProjectDto;
}

export function ProjectRolesTab({ workspace, project }: ProjectRolesTabProps) {
  const roles = useResource(() => roleService.listProjectRoles(workspace.id, project.id), [workspace.id, project.id]);
  const perms = project.myPermissions;

  const api: RoleApi = {
    create: (request) => roleService.createProjectRole(workspace.id, project.id, request),
    update: (roleId, request) => roleService.updateProjectRole(workspace.id, project.id, roleId, request),
    remove: (roleId) => roleService.deleteProjectRole(workspace.id, project.id, roleId),
  };

  if (roles.loading && !roles.data) return <LoadingView label="Loading roles..." />;
  if (roles.error) return <ErrorView message={roles.error} onRetry={roles.reload} />;

  return (
    <Panel title="Project roles" description="Independent of workspace roles: they only apply inside this project.">
      <RolesManager
        roles={roles.data ?? []}
        definitions={PROJECT_PERMISSIONS}
        callerPermissions={perms}
        canCreate={can(perms, 'prole.create')}
        canEdit={can(perms, 'prole.edit')}
        canDelete={can(perms, 'prole.delete')}
        baselineKey="project.view"
        api={api}
        onChanged={roles.reload}
      />
    </Panel>
  );
}
