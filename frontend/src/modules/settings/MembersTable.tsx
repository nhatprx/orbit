import { useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CONTROL_CLASS } from '../../components/ui/Field';
import type { MemberDto, RoleDto } from '../../types/workspace.types';
import { formatDate, initialsOf } from '../../utils/format';

interface MembersTableProps {
  members: MemberDto[];
  roles: RoleDto[];
  currentUserId: string;
  canAssign: boolean;
  canRemove: boolean;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  onAssign: (member: MemberDto, roleId: string) => Promise<void>;
  onRemove: (member: MemberDto) => Promise<void>;
}

export function MembersTable({
  members,
  roles,
  currentUserId,
  canAssign,
  canRemove,
  page,
  totalPages,
  onPage,
  onAssign,
  onRemove,
}: MembersTableProps) {
  const [target, setTarget] = useState<MemberDto | null>(null);
  const assignable = roles.filter((r) => !r.immutable);
  const leaving = target?.userId === currentUserId;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-[#30363D]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#30363D] bg-[#0D1117] text-left text-[#8B949E]">
              <th scope="col" className="px-3 py-2 font-medium">Member</th>
              <th scope="col" className="px-3 py-2 font-medium">Role</th>
              <th scope="col" className="px-3 py-2 font-medium">Joined</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const self = member.userId === currentUserId;
              return (
                <tr key={member.userId} className="border-t border-[#30363D]">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#3B434B] bg-[#0D1117] font-mono text-[11px] text-[#22C55E]">
                        {initialsOf(member.displayName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#E6EDF3]">
                          {member.displayName} {self && <span className="text-xs text-[#7D8590]">(you)</span>}
                        </p>
                        <p className="truncate text-xs text-[#8B949E]">
                          @{member.username} - {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {member.isOwner ? (
                      <Badge tone="green" withDot>Owner</Badge>
                    ) : (
                      <select
                        aria-label={`Role of ${member.displayName}`}
                        value={member.roleId}
                        disabled={!canAssign}
                        onChange={(e) => void onAssign(member, e.target.value)}
                        className={`${CONTROL_CLASS} py-1 text-[13px]`}
                      >
                        {!assignable.some((r) => r.id === member.roleId) && (
                          <option value={member.roleId}>{member.roleName}</option>
                        )}
                        {assignable.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-[#8B949E]">{formatDate(member.joinedAt)}</td>
                  <td className="px-3 py-2 text-right">
                    {!member.isOwner && (self || canRemove) && (
                      <Button type="button" variant="ghost" onClick={() => setTarget(member)}>
                        {self ? (
                          <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        )}
                        {self ? 'Leave' : 'Remove'}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 font-mono text-xs text-[#8B949E]">
          <Button type="button" variant="secondary" disabled={page <= 0} onClick={() => onPage(page - 1)}>
            Previous
          </Button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <Button type="button" variant="secondary" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>
            Next
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={target !== null}
        danger
        title={leaving ? 'Leave' : 'Remove member'}
        message={
          leaving
            ? 'You will lose access immediately. You can rejoin only with a new invitation.'
            : `Remove ${target?.displayName ?? 'this member'}? They lose access immediately.`
        }
        confirmLabel={leaving ? 'Leave' : 'Remove'}
        onConfirm={async () => {
          if (target) await onRemove(target);
        }}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
