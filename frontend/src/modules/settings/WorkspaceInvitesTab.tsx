import { useState } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Panel } from '../../components/ui/Panel';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useResource } from '../../hooks/useResource';
import { invitationService, roleService } from '../../services/workspace/services';
import type { InvitationDto, WorkspaceDto } from '../../types/workspace.types';
import { InvitationsTable } from './InvitationsTable';
import { InviteCreators } from './InviteCreators';
import { can } from './permissionCatalog';

export function WorkspaceInvitesTab({ workspace }: { workspace: WorkspaceDto }) {
  const [revoking, setRevoking] = useState<InvitationDto | null>(null);
  const invitations = useResource(() => invitationService.listInvitations(workspace.id, 0, 50), [workspace.id]);
  const roles = useResource(
    async () => (can(workspace.myPermissions, 'role.view') ? roleService.listWorkspaceRoles(workspace.id) : []),
    [workspace.id]
  );

  if (invitations.loading && !invitations.data) return <LoadingView label="Loading invitations..." />;
  if (invitations.error) return <ErrorView message={invitations.error} onRetry={invitations.reload} />;

  return (
    <div className="space-y-5">
      <Panel title="Invite people" description="Email invitations and reusable links.">
        <InviteCreators workspaceId={workspace.id} roles={roles.data ?? []} onCreated={invitations.reload} />
      </Panel>

      <Panel title={`Invitations (${invitations.data?.totalElements ?? 0})`}>
        <InvitationsTable
          invitations={invitations.data?.items ?? []}
          canRevoke={can(workspace.myPermissions, 'member.invite')}
          onRevoke={setRevoking}
        />
      </Panel>

      <ConfirmDialog
        open={revoking !== null}
        danger
        title="Revoke invitation"
        message="Revoking stops this invitation from being used. People who already joined keep their access."
        confirmLabel="Revoke"
        onConfirm={async () => {
          if (!revoking) return;
          await invitationService.revokeInvitation(workspace.id, revoking.id);
          invitations.reload();
        }}
        onClose={() => setRevoking(null)}
      />
    </div>
  );
}
