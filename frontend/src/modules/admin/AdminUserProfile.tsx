import type { ReactNode } from 'react';
import { Badge } from '../../components/ui/Badge';
import { UserAvatar } from '../../components/ui/UserAvatar';
import type { AdminUserDetail } from '../../types/admin.types';
import { formatDateTime } from '../../utils/format';
import { RoleBadge, StatusBadge } from './AdminUsersTable';

interface AdminUserProfileProps {
  detail: AdminUserDetail;
  self: boolean;
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[#8B949E]">{label}</dt>
      <dd className="truncate text-[13px] text-[#E6EDF3]">{value || <span className="text-[#7D8590]">Not set</span>}</dd>
    </div>
  );
}

export function AdminUserProfile({ detail, self }: AdminUserProfileProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <UserAvatar
          name={detail.displayName}
          avatarUrl={detail.avatarUrl}
          size="sm"
          className="h-11 w-11 text-sm"
        />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[#E6EDF3]">
            {detail.displayName} {self && <span className="text-xs font-normal text-[#7D8590]">(you)</span>}
          </p>
          <p className="font-mono text-xs text-[#8B949E]">@{detail.username}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <RoleBadge role={detail.role} />
            <StatusBadge status={detail.status} />
            <Badge tone={detail.totpEnabled ? 'green' : 'neutral'}>2FA {detail.totpEnabled ? 'on' : 'off'}</Badge>
          </div>
        </div>
      </div>

      {detail.status === 'DISABLED' && detail.disabledAt && (
        <div role="note" className="border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#E6EDF3]">
          Disabled {formatDateTime(detail.disabledAt)} by @{detail.disabledByUsername ?? 'unknown'}.{' '}
          <span className="text-[#BDBDBD]">Reason: {detail.disabledReason ?? 'not given'}.</span>
        </div>
      )}

      <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
        <Fact label="Email" value={detail.email} />
        <Fact label="Joined" value={formatDateTime(detail.createdAt)} />
        <Fact label="Country" value={detail.country} />
        <Fact label="Organization" value={detail.organization} />
        <Fact label="Location" value={detail.location} />
        <Fact label="Website" value={detail.website} />
      </dl>
    </div>
  );
}
