import type {
  AdminUserDetail,
  AdminUserListParams,
  AdminUserRole,
  AdminUserStats,
  AdminUserSummary,
} from '../../types/admin.types';
import type { PageResponse } from '../../types/workspace.types';

/** Admin-only user management. Every call is re-authorised by the server. */
export interface AdminUserService {
  list(params: AdminUserListParams): Promise<PageResponse<AdminUserSummary>>;
  stats(): Promise<AdminUserStats>;
  get(userId: string): Promise<AdminUserDetail>;
  /** Also signs the user out so the next token carries the new role. */
  changeRole(userId: string, role: AdminUserRole): Promise<AdminUserDetail>;
  disable(userId: string, reason?: string): Promise<AdminUserDetail>;
  enable(userId: string): Promise<AdminUserDetail>;
  revokeSessions(userId: string): Promise<void>;
}
