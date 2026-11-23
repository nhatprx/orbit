import { Check } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { UserAvatar } from '../../components/ui/UserAvatar';
import type { AdminUserSummary } from '../../types/admin.types';
import { formatDate } from '../../utils/format';

interface AdminUsersTableProps {
  users: AdminUserSummary[];
  currentUserId: string;
  selectedId?: string | null;
  checkedIds: ReadonlySet<string>;
  onSelect: (userId: string) => void;
  onToggleCheck: (userId: string) => void;
  onToggleAll: (userIds: string[]) => void;
}

export function RoleBadge({ role }: { role: AdminUserSummary['role'] }) {
  return <Badge tone={role === 'admin' ? 'green' : 'neutral'}>{role}</Badge>;
}

export function StatusBadge({ status }: { status: AdminUserSummary['status'] }) {
  return status === 'ACTIVE' ? (
    <Badge tone="green" withDot>
      Active
    </Badge>
  ) : (
    <Badge tone="danger" withDot>
      Disabled
    </Badge>
  );
}

function ColoredCheckbox(props: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label className="relative inline-flex h-3.5 w-3.5 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        aria-label={props.label}
        checked={props.checked}
        disabled={props.disabled}
        onChange={props.onChange}
        className="peer sr-only"
      />
      <span className="flex h-3 w-3 items-center justify-center border border-[#22C55E] bg-[#0D1117] text-[#0D1117] transition-colors hover:bg-[#052E16] peer-checked:bg-[#22C55E] peer-disabled:cursor-not-allowed peer-disabled:opacity-40">
        {props.checked && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </span>
    </label>
  );
}

export function AdminUsersTable({
  users,
  currentUserId,
  selectedId = null,
  checkedIds,
  onSelect,
  onToggleCheck,
  onToggleAll,
}: AdminUsersTableProps) {
  const selectableIds = users
    .filter((u) => u.id !== currentUserId && u.role !== 'admin')
    .map((u) => u.id);
  const allChecked = selectableIds.length > 0 && selectableIds.every((id) => checkedIds.has(id));

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col border border-[#30363D] bg-[#161B22]">
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[#30363D] bg-[#0D1117] text-[#8B949E]">
            <th scope="col" className="w-10 px-3 py-2">
              {selectableIds.length > 0 && (
                <ColoredCheckbox
                  label="Select all users on page"
                  checked={allChecked}
                  onChange={() => onToggleAll(selectableIds)}
                />
              )}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">User</th>
            <th scope="col" className="px-3 py-2 font-medium">Username</th>
            <th scope="col" className="px-3 py-2 font-medium">Email</th>
            <th scope="col" className="px-3 py-2 font-medium">Role</th>
            <th scope="col" className="px-3 py-2 font-medium">Status</th>
            <th scope="col" className="px-3 py-2 font-medium">2FA</th>
            <th scope="col" className="px-3 py-2 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelected = user.id === selectedId;
            const isSelf = user.id === currentUserId;
            const isAdmin = user.role === 'admin';
            const isChecked = checkedIds.has(user.id);
            return (
              <tr
                key={user.id}
                onClick={() => onSelect(user.id)}
                className={`cursor-pointer border-t border-[#30363D] transition-colors ${
                  isSelected ? 'bg-[#052E16]/60' : isChecked ? 'bg-[#052E16]/30' : 'hover:bg-[#21262D]'
                }`}
              >
                <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                  {!isAdmin && !isSelf && (
                    <ColoredCheckbox
                      label={`Select ${user.username}`}
                      checked={isChecked}
                      onChange={() => onToggleCheck(user.id)}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      name={user.displayName}
                      avatarUrl={user.avatarUrl}
                      size="sm"
                      className="border-[#3B434B] bg-[#0D1117] text-[11px]"
                    />
                    <p className="truncate font-medium text-[#E6EDF3]">
                      {user.displayName}{' '}
                      {isSelf && <span className="text-xs text-[#7D8590]">(you)</span>}
                    </p>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-[#8B949E]">@{user.username}</td>
                <td className="px-3 py-2 font-mono text-xs text-[#A3A3A3]">{user.email}</td>
                <td className="px-3 py-2"><RoleBadge role={user.role} /></td>
                <td className="px-3 py-2"><StatusBadge status={user.status} /></td>
                <td className="px-3 py-2">
                  <Badge tone={user.totpEnabled ? 'green' : 'neutral'}>{user.totpEnabled ? 'On' : 'Off'}</Badge>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-[#8B949E]">{formatDate(user.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>
  );
}
