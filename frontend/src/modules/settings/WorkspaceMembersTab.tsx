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
  const members = useResource(() => memberService.listWorkspaceMembers(workspace.id, page, PAGE_SIZE), [workspace.id, page]);
  const roles = useResource(
    async () => (can(perms, 'role.view') ? roleService.listWorkspaceRoles(workspace.id) : []),
    [workspace.id]
  );

  const assign = useAsyncAction(async (member: MemberDto, roleId: string) => {
    await memberService.assignWorkspaceMemberRole(workspace.id, member.userId, { roleId });
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

  if (members.loading && !members.data) return <LoadingView label="Loading members..." />;
  if (members.error) return <ErrorView message={members.error} onRetry={members.reload} />;
  const data = members.data;
  if (!data) return null;

  return (
    <Panel title={`Members (${data.totalElements})`} description="People with access to this workspace.">
      {assign.error && (
        <p role="alert" className="mb-3 text-xs text-[#EF4444]">
          {assign.error}
        </p>
      )}
      <MembersTable
        members={data.items}
        roles={roles.data ?? []}
        currentUserId={user.id}
        canAssign={can(perms, 'member.assign_role')}
        canRemove={can(perms, 'member.remove')}
        page={data.page}
        totalPages={data.totalPages}
        onPage={setPage}
        onAssign={async (member, roleId) => void (await assign.run(member, roleId))}
        onRemove={handleRemove}
      />
    </Panel>
  );
}
