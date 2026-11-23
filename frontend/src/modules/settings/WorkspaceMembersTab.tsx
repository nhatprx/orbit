import { useState } from 'react';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Panel } from '../../components/ui/Panel';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useResource } from '../../hooks/useResource';
import { memberService, roleService } from '../../services/workspace/services';
import type { AuthUser } from '../../types/auth.types';
import type { MemberDto, WorkspaceDto } from '../../types/workspace.types';
import { MembersTable } from './MembersTable';
import { can } from './permissionCatalog';
import { WorkspaceInvitesTab } from './WorkspaceInvitesTab';

const PAGE_SIZE = 25;

interface WorkspaceMembersTabProps {
  workspace: WorkspaceDto;
  user: AuthUser;
  onChanged: () => Promise<void>;
  onLeft: () => Promise<void>;
}

export function WorkspaceMembersTab({ workspace, user, onChanged, onLeft }: WorkspaceMembersTabProps) {
  const [page, setPage] = useState(0);
  const perms = workspace.myPermissions;
  const canViewMembers = can(perms, 'member.view');
  const canInvite = can(perms, 'member.invite');
  const members = useResource(
    async () => (canViewMembers ? memberService.listWorkspaceMembers(workspace.id, page, PAGE_SIZE) : null),
    [workspace.id, page, canViewMembers]
  );
  const roles = useResource(
    async () => (can(perms, 'role.view') ? roleService.listWorkspaceRoles(workspace.id) : []),
    [workspace.id]
  );

  const assign = useAsyncAction(async (member: MemberDto, roleId: string) => {
    await memberService.assignWorkspaceMemberRole(workspace.id, member.userId, { roleId });
    members.reload();
  });

  const updateSubRole = useAsyncAction(async (member: MemberDto, subRole: string) => {
    await memberService.updateWorkspaceMemberSubRole(workspace.id, member.userId, subRole);
    members.reload();
  });

  async function handleRemove(member: MemberDto): Promise<void> {
    await memberService.removeWorkspaceMember(workspace.id, member.userId);
    if (member.userId === user.id) {
      await onLeft();
    } else {
      members.reload();
      await onChanged();
    }
  }

  return (
    <div className="space-y-5">
      {canViewMembers && (
        members.loading && !members.data ? (
          <LoadingView label="Loading members..." />
        ) : members.error ? (
          <ErrorView message={members.error} onRetry={members.reload} />
        ) : members.data ? (
          <Panel title={`Members (${members.data.totalElements})`} description="People with access to this workspace.">
            {assign.error && (
              <p role="alert" className="mb-3 text-xs text-[#EF4444]">
                {assign.error}
              </p>
            )}
            <MembersTable
              members={members.data.items}
              roles={roles.data ?? []}
              currentUserId={user.id}
              canAssign={can(perms, 'member.assign_role')}
              canRemove={can(perms, 'member.remove')}
              page={members.data.page}
              totalPages={members.data.totalPages}
              onPage={setPage}
              onAssign={async (member, roleId) => void (await assign.run(member, roleId))}
              onUpdateSubRole={async (member, subRole) => void (await updateSubRole.run(member, subRole))}
              onRemove={handleRemove}
            />
          </Panel>
        ) : null
      )}

      {canInvite && <WorkspaceInvitesTab workspace={workspace} />}
    </div>
  );
}
