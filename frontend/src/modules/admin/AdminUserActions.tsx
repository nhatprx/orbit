import { useEffect, useState, type ReactNode } from 'react';
import { Ban, LogOut, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { AdminUserService } from '../../services/admin/adminUser.service';
import type { AdminUserDetail, AdminUserRole } from '../../types/admin.types';
import { AdminDisableDialog } from './AdminDisableDialog';

interface AdminUserActionsProps {
  detail: AdminUserDetail;
  /** True when the signed-in administrator is looking at their own account. */
  self: boolean;
  service: AdminUserService;
  onUpdated: (detail: AdminUserDetail) => void;
  onNotice: (text: string) => void;
}

type Pending = 'role' | 'enable' | 'revoke' | null;

function Row({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_198px] items-center gap-3 bg-[#161B22] px-3 py-2.5 xl:grid-cols-[minmax(0,1fr)_212px]">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#E6EDF3]">{title}</p>
        <p className="line-clamp-2 text-xs leading-snug text-[#8B949E]">{hint}</p>
      </div>
      <div className="flex min-w-0 items-center justify-end">{children}</div>
    </div>
  );
}

export function AdminUserActions({ detail, self, service, onUpdated, onNotice }: AdminUserActionsProps) {
  const [role, setRole] = useState<AdminUserRole>(detail.role);
  const [pending, setPending] = useState<Pending>(null);
  const [disabling, setDisabling] = useState(false);
  const label = `@${detail.username}`;
  const isProtectedAdmin = self || detail.role === 'admin';

  useEffect(() => setRole(detail.role), [detail.role]);

  /** Errors propagate to the dialog that triggered the call, which shows them. */
  async function apply(request: Promise<AdminUserDetail>, notice: string) {
    onUpdated(await request);
    onNotice(notice);
  }

  return (
    <section aria-label="Account actions" className="space-y-2">
      <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">Actions</h3>
      <div className="space-y-px border border-[#30363D] bg-[#30363D]">
        <Row title="Platform role" hint="Signs user out to apply the new role.">
          <div className="flex w-full min-w-0 items-center gap-1.5">
            <select
              aria-label="Role"
              value={role}
              disabled={isProtectedAdmin}
              onChange={(event) => setRole(event.target.value as AdminUserRole)}
              className="min-w-0 flex-1 border border-[#3B434B] bg-[#0D1117] px-2 py-1.5 text-[13px] text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <Button
              type="button"
              disabled={isProtectedAdmin || role === detail.role}
              onClick={() => setPending('role')}
              className="shrink-0 whitespace-nowrap px-2.5 py-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              Change role
            </Button>
          </div>
        </Row>

        <Row
          title="Account access"
          hint={detail.status === 'ACTIVE' ? 'Block sign-in and end all sessions.' : 'Allow this user to sign in again.'}
        >
          {detail.status === 'ACTIVE' ? (
            <Button type="button" variant="danger" disabled={isProtectedAdmin} onClick={() => setDisabling(true)}>
              <Ban className="h-3.5 w-3.5" strokeWidth={1.5} />
              Disable account
            </Button>
          ) : (
            <Button type="button" disabled={isProtectedAdmin} onClick={() => setPending('enable')}>
              <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              Enable account
            </Button>
          )}
        </Row>

        <Row title="Active sessions" hint="End all active sessions immediately.">
          <Button type="button" disabled={isProtectedAdmin} onClick={() => setPending('revoke')}>
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            Sign out everywhere
          </Button>
        </Row>
      </div>
      {self && (
        <p className="text-xs text-[#EAB308]">
          You cannot change your own account here. Ask another administrator.
        </p>
      )}
      {!self && detail.role === 'admin' && (
        <p className="text-xs text-[#EAB308]">
          Administrators cannot modify or disable other administrator accounts.
        </p>
      )}

      <ConfirmDialog
        open={pending === 'role'}
        size="lg"
        title="Change role"
        message={`Make ${label} ${role === 'admin' ? 'an administrator' : 'a regular user'}? They are signed out and must sign in again.`}
        confirmLabel="Change role"
        requireText={role === 'admin' ? detail.username : undefined}
        onConfirm={() => apply(service.changeRole(detail.id, role), `Role changed to ${role}. ${label} was signed out.`)}
        onClose={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending === 'enable'}
        title="Enable account"
        message={`Allow ${label} to sign in again?`}
        confirmLabel="Enable account"
        onConfirm={() => apply(service.enable(detail.id), `${label} can sign in again.`)}
        onClose={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending === 'revoke'}
        danger
        title="Sign out everywhere"
        message={`End every active session of ${label}? They can sign in again straight away.`}
        confirmLabel="Sign out"
        onConfirm={async () => {
          await service.revokeSessions(detail.id);
          onNotice(`All sessions of ${label} were ended.`);
        }}
        onClose={() => setPending(null)}
      />
      <AdminDisableDialog
        open={disabling}
        username={detail.username}
        onSubmit={(reason) => apply(service.disable(detail.id, reason), `${label} was disabled and signed out.`)}
        onClose={() => setDisabling(false)}
      />
    </section>
  );
}
