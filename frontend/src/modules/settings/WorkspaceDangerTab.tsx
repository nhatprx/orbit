import { useState } from 'react';
import { ArrowRightLeft, LogOut, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SelectField } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { useResource } from '../../hooks/useResource';
import { memberService, workspaceService } from '../../services/workspace/services';
import type { AuthUser } from '../../types/auth.types';
import type { WorkspaceDto } from '../../types/workspace.types';
import { can } from './permissionCatalog';

interface WorkspaceDangerTabProps {
  workspace: WorkspaceDto;
  user: AuthUser;
  onChanged: () => Promise<void>;
  onLeft: () => Promise<void>;
}

const DANGER_BTN =
  'border-[#EF4444] text-[#EF4444] hover:border-[#EF4444] hover:bg-[#EF4444] hover:text-[#0D1117]';

export function WorkspaceDangerTab({ workspace, user, onChanged, onLeft }: WorkspaceDangerTabProps) {
  const isOwner = workspace.ownerId === user.id;
  const canTransfer = isOwner && can(workspace.myPermissions, 'workspace.transfer_owner');
  const canDelete = isOwner && can(workspace.myPermissions, 'workspace.delete');
  const [dialog, setDialog] = useState<'leave' | 'transfer' | 'delete' | null>(null);
  const [targetId, setTargetId] = useState('');
  const members = useResource(
    async () => (canTransfer ? (await memberService.listWorkspaceMembers(workspace.id, 0, 100)).items : []),
    [workspace.id, canTransfer]
  );
  const candidates = (members.data ?? []).filter((m) => m.userId !== user.id);
  const chosen = candidates.find((m) => m.userId === targetId);

  return (
    <div className="space-y-5">
      {!isOwner && (
        <Panel tone="danger" title="Leave workspace" description="You lose access to this workspace and its projects.">
          <Button type="button" variant="secondary" className={DANGER_BTN} onClick={() => setDialog('leave')}>
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            Leave workspace
          </Button>
        </Panel>
      )}

      {canTransfer && (
        <Panel tone="danger" title="Transfer ownership" description="The new owner gets full control; you become an Admin.">
          <div className="flex max-w-xl flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <SelectField label="New owner" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                <option value="">Select a member</option>
                {candidates.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName} ({m.email})
                  </option>
                ))}
              </SelectField>
            </div>
            <Button type="button" variant="secondary" className={DANGER_BTN} disabled={!chosen} onClick={() => setDialog('transfer')}>
              <ArrowRightLeft className="h-4 w-4" strokeWidth={1.5} />
              Transfer
            </Button>
          </div>
        </Panel>
      )}

      {canDelete && (
        <Panel tone="danger" title="Delete workspace" description="Soft delete: restorable by you for 30 days, then permanently removed.">
          <Button type="button" variant="secondary" className={DANGER_BTN} onClick={() => setDialog('delete')}>
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            Delete workspace
          </Button>
        </Panel>
      )}

      {isOwner && !canTransfer && !canDelete && (
        <p className="text-xs text-[#7D8590]">Your role does not allow destructive workspace actions.</p>
      )}

      <ConfirmDialog
        open={dialog === 'leave'}
        danger
        title="Leave workspace"
        message={`Leave ${workspace.name}? You can only rejoin with a new invitation.`}
        confirmLabel="Leave"
        onConfirm={async () => {
          await memberService.removeWorkspaceMember(workspace.id, user.id);
          await onLeft();
        }}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'transfer'}
        danger
        title="Transfer ownership"
        message={`Make ${chosen?.displayName ?? 'this member'} the owner of ${workspace.name}? You will become an Admin.`}
        confirmLabel="Transfer ownership"
        requireText={workspace.name}
        onConfirm={async () => {
          await workspaceService.transferOwnership(workspace.id, { targetUserId: targetId });
          setTargetId('');
          await onChanged();
        }}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        danger
        title="Delete workspace"
        message="All projects, members, and data become hidden immediately. You can restore the workspace from your Profile for 30 days."
        confirmLabel="Delete workspace"
        requireText={workspace.name}
        onConfirm={async () => {
          await workspaceService.deleteWorkspace(workspace.id, { confirmName: workspace.name });
          await onLeft();
        }}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
