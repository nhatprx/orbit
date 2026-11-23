/** Contract of docs/API_ADMIN_USERS.md: platform administration of user accounts. */

export type AdminUserRole = 'user' | 'admin';
export type AdminUserStatus = 'ACTIVE' | 'DISABLED';

export interface AdminUserSummary {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  totpEnabled: boolean;
  workspaceCount: number;
  createdAt: string;
  disabledAt: string | null;
}

export interface AdminLinkedProvider {
  provider: string;
  providerEmail: string | null;
  connectedAt: string;
}

export interface AdminUserWorkspace {
  id: string;
  name: string;
  roleName: string;
  owner: boolean;
}

export interface AdminUserDetail extends AdminUserSummary {
  disabledReason: string | null;
  disabledByUsername: string | null;
  country: string | null;
  organization: string | null;
  location: string | null;
  website: string | null;
  bio: string | null;
  linkedProviders: AdminLinkedProvider[];
  workspaces: AdminUserWorkspace[];
}

export interface AdminUserStats {
  total: number;
  admins: number;
  disabled: number;
  newLast7Days: number;
}

export type AdminRoleFilter = '' | AdminUserRole;
export type AdminStatusFilter = '' | 'active' | 'disabled';

/** Filters sent to the list endpoint; an empty string means "no filter". */
export interface AdminUserListParams {
  q: string;
  role: AdminRoleFilter;
  status: AdminStatusFilter;
  sort: string;
  page: number;
  size: number;
}
