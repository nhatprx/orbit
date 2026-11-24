import { useState } from 'react';
import { Ban, LogOut, ShieldCheck, UserCheck, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/toastStore';
import type { AdminUserService } from '../../services/admin/adminUser.service';
import type { AdminUserDetail, AdminUserRole } from '../../types/admin.types';
import { AdminDisableDialog } from './AdminDisableDialog';

interface AdminBulkActionsBarProps {
  selectedIds: string[];
  service: AdminUserService;
  onUpdatedMany: (details: AdminUserDetail[]) => void;
  onClearSelection: () => void;
}

type BulkActionKind = 'make-admin' | 'make-user' | 'enable' | 'revoke' | null;

export function AdminBulkActionsBar({
  selectedIds,
  service,
  onUpdatedMany,
  onClearSelection,
}: AdminBulkActionsBarProps) {
  const [pending, setPending] = useState<BulkActionKind>(null);
  const [disabling, setDisabling] = useState(false);
  const setNotice = (msg: string | null) => { if (msg) toast.success(msg); };
  const count = selectedIds.length;

  if (count === 0) return null;

  const targetText = count === 1 ? '1 selected user' : `${count} selected users`;

  async function runBulkUpdate(fn: (id: string) => Promise<AdminUserDetail>, successMsg: string) {
    const updated: AdminUserDetail[] = [];
    for (const id of selectedIds) {
      updated.push(await fn(id));
    }
    onUpdatedMany(updated);
    onClearSelection();
    setNotice(successMsg);
  }

  async function runBulkRole(role: AdminUserRole) {
    await runBulkUpdate((id) => service.changeRole(id, role), `Updated role to ${role} for ${targetText}.`);
  }

  return (
    <div
      aria-label="Bulk user actions"
      className="space-y-2 border border-[#22C55E] bg-[#052E16]/50 px-3 py-2.5"
    >
      {count > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[#E6EDF3]">
            <span className="h-1.5 w-1.5 bg-[#22C55E]" />
            <span>{count} selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button type="button" onClick={() => setPending('make-admin')}>
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              Make Admin
            </Button>
            <Button type="button" onClick={() => setPending('make-user')}>
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              Make User
            </Button>
            <Button type="button" onClick={() => setPending('enable')}>
              <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              Enable
            </Button>
            <Button type="button" variant="danger" onClick={() => setDisabling(true)}>
              <Ban className="h-3.5 w-3.5" strokeWidth={1.5} />
              Disable
            </Button>
            <Button type="button" onClick={() => setPending('revoke')}>
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              Sign out
            </Button>
            <Button type="button" variant="ghost" onClick={onClearSelection}>
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              Clear selection
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pending === 'make-admin' || pending === 'make-user'}
        title="Bulk change role"
        message={`Change role of ${targetText} to ${pending === 'make-admin' ? 'admin' : 'user'}?`}
        confirmLabel="Apply role"
        requireText={pending === 'make-admin' ? 'ADMIN' : undefined}
        onConfirm={() => runBulkRole(pending === 'make-admin' ? 'admin' : 'user')}
        onClose={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending === 'enable'}
        title="Bulk enable accounts"
        message={`Allow ${targetText} to sign in again?`}
        confirmLabel="Enable accounts"
        onConfirm={() => runBulkUpdate((id) => service.enable(id), `Enabled ${targetText}.`)}
        onClose={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending === 'revoke'}
        danger
        title="Bulk sign out"
        message={`End every active session for ${targetText}?`}
        confirmLabel="Sign out all"
        onConfirm={async () => {
          for (const id of selectedIds) await service.revokeSessions(id);
          onClearSelection();
          setNotice(`Ended all sessions for ${targetText}.`);
        }}
        onClose={() => setPending(null)}
      />
      <AdminDisableDialog
        open={disabling}
        username={targetText}
        onSubmit={(reason) => runBulkUpdate((id) => service.disable(id, reason), `Disabled ${targetText}.`)}
        onClose={() => setDisabling(false)}
      />
    </div>
  );
}
