import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SelectField } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useResource } from '../../hooks/useResource';
import { memberService, roleService } from '../../services/workspace/services';
import type { AuthUser } from '../../types/auth.types';
import type { MemberDto, ProjectDto, WorkspaceDto } from '../../types/workspace.types';
import { MembersTable } from './MembersTable';
import { can } from './permissionCatalog';
import { ProjectInviteLink } from './ProjectInviteLink';

const PAGE_SIZE = 25;

interface ProjectMembersTabProps {
  workspace: WorkspaceDto;
  project: ProjectDto;
  user: AuthUser;
  onChanged: () => Promise<void>;
  onLeft: () => Promise<void>;
}

export function ProjectMembersTab({ workspace, project, user, onChanged, onLeft }: ProjectMembersTabProps) {
  const [page, setPage] = useState(0);
  const [candidateId, setCandidateId] = useState('');
  const [roleId, setRoleId] = useState('');
  const perms = project.myPermissions;
  const canAdd = can(perms, 'pmember.invite');

  const members = useResource(() => memberService.listProjectMembers(workspace.id, project.id, page, PAGE_SIZE), [workspace.id, project.id, page]);
  const roles = useResource(() => roleService.listProjectRoles(workspace.id, project.id), [workspace.id, project.id]);
  const projectRoles = roles.data ?? [];
  const grantable = projectRoles.filter((r) => !r.immutable);
  const defaultRoleId = grantable.find((r) => r.name === 'Member')?.id ?? grantable[0]?.id ?? '';
  const pool = useResource(
    async () =>
      canAdd && can(workspace.myPermissions, 'member.view')
        ? (await memberService.listWorkspaceMembers(workspace.id, 0, 100)).items
        : [],
    [workspace.id, canAdd]
  );

  const assign = useAsyncAction(async (member: MemberDto, nextRoleId: string) => {
    await memberService.assignProjectMemberRole(workspace.id, project.id, member.userId, { roleId: nextRoleId });
    members.reload();
  });
  const add = useAsyncAction(async () => {
    await memberService.addProjectMember(workspace.id, project.id, { userId: candidateId, roleId: roleId || defaultRoleId });
    setCandidateId('');
    members.reload();
    await onChanged();
  });

  if (members.loading && !members.data) return <LoadingView label="Loading members..." />;
  if (members.error) return <ErrorView message={members.error} onRetry={members.reload} />;
  const data = members.data;
  if (!data) return null;

  const memberIds = new Set(data.items.map((m) => m.userId));
  const candidates = (pool.data ?? []).filter((m) => !memberIds.has(m.userId));

  return (
    <div className="space-y-5">
      {canAdd && (
        <Panel title="Add a workspace member" description="Only existing workspace members can join a project.">
          {candidates.length === 0 ? (
            <p className="text-xs text-[#8B949E]">Everyone you can see is already in this project.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1">
                <SelectField label="Member" value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
                  <option value="">Select a member</option>
                  {candidates.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName} ({m.email})
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="min-w-40">
                <SelectField label="Role" value={roleId || defaultRoleId} onChange={(e) => setRoleId(e.target.value)}>
                  {grantable.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <Button type="button" variant="primary" disabled={!candidateId || add.pending} onClick={() => void add.run()}>
                <UserPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Add
              </Button>
            </div>
          )}
          {add.error && (
            <p role="alert" className="mt-2 text-xs text-[#EF4444]">
              {add.error}
            </p>
          )}
          <ProjectInviteLink workspace={workspace} project={project} roles={grantable} />
        </Panel>
      )}

      <Panel title={`Project members (${data.totalElements})`}>
        {assign.error && (
          <p role="alert" className="mb-3 text-xs text-[#EF4444]">
            {assign.error}
          </p>
        )}
        <MembersTable
          members={data.items}
          roles={projectRoles}
          currentUserId={user.id}
          canAssign={can(perms, 'pmember.assign_role')}
          canRemove={can(perms, 'pmember.remove')}
          page={data.page}
          totalPages={data.totalPages}
          onPage={setPage}
          onAssign={async (member, nextRoleId) => void (await assign.run(member, nextRoleId))}
          onRemove={async (member) => {
            await memberService.removeProjectMember(workspace.id, project.id, member.userId);
            if (member.userId === user.id) {
              await onLeft();
            } else {
              members.reload();
              await onChanged();
            }
          }}
        />
      </Panel>
    </div>
  );
}
