import type { AccountStatus, AuthUser } from '../../types/auth.types';

export interface ActiveStatusOption {
  value: AccountStatus;
  label: string;
  description: string;
  tone: 'green' | 'danger' | 'warning' | 'neutral';
  dotClass: string;
}

const STATUS_BY_VALUE: Record<AccountStatus, ActiveStatusOption> = {
  ONLINE: {
    value: 'ONLINE',
    label: 'Online',
    description: 'Available and active across Orbit.',
    tone: 'green',
    dotClass: 'bg-[#22C55E]',
  },
  BUSY: {
    value: 'BUSY',
    label: 'Busy',
    description: 'Focused on work; notifications muted.',
    tone: 'danger',
    dotClass: 'bg-[#EF4444]',
  },
  AWAY: {
    value: 'AWAY',
    label: 'Away',
    description: 'Taking a break and away from keyboard.',
    tone: 'warning',
    dotClass: 'bg-[#EAB308]',
  },
  OFFLINE: {
    value: 'OFFLINE',
    label: 'Offline',
    description: 'Appear offline to teammates.',
    tone: 'neutral',
    dotClass: 'bg-[#666666]',
  },
};

export const ACTIVE_STATUS_OPTIONS: ActiveStatusOption[] = [
  STATUS_BY_VALUE.ONLINE,
  STATUS_BY_VALUE.BUSY,
  STATUS_BY_VALUE.AWAY,
  STATUS_BY_VALUE.OFFLINE,
];

export function resolveAccountStatus(user?: AuthUser): AccountStatus {
  if (user?.activeStatus && user.activeStatus in STATUS_BY_VALUE) {
    return user.activeStatus;
  }
  return user?.activeStatusEnabled === false ? 'OFFLINE' : 'ONLINE';
}

export function getStatusMeta(status: AccountStatus): ActiveStatusOption {
  return STATUS_BY_VALUE[status];
}
