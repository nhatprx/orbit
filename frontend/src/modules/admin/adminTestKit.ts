import { vi } from 'vitest';
import type { AdminUserService } from '../../services/admin/adminUser.service';
import type { AdminUserDetail, AdminUserStats, AdminUserSummary } from '../../types/admin.types';
import type { AuthUser } from '../../types/auth.types';
import type { PageResponse } from '../../types/workspace.types';

export const ME: AuthUser = { id: 'u-me', name: 'Ada Admin', email: 'ada@orbit.test', role: 'admin', workspaceId: 'w' };

export function summary(patch: Partial<AdminUserSummary> = {}): AdminUserSummary {
  return {
    id: 'u-alice',
    username: 'alice',
    displayName: 'Alice Doe',
    email: 'alice@orbit.test',
    avatarUrl: null,
    role: 'user',
    status: 'ACTIVE',
    totpEnabled: false,
    workspaceCount: 2,
    createdAt: '2026-11-01T08:00:00Z',
    disabledAt: null,
    ...patch,
  };
}

export function detail(patch: Partial<AdminUserDetail> = {}): AdminUserDetail {
  return {
    ...summary(),
    disabledReason: null,
    disabledByUsername: null,
    country: 'Vietnam',
    organization: null,
    location: null,
    website: null,
    bio: null,
    linkedProviders: [],
    workspaces: [],
    ...patch,
  };
}

export function pageOf(
  items: AdminUserSummary[],
  patch: Partial<PageResponse<AdminUserSummary>> = {}
): PageResponse<AdminUserSummary> {
  return { items, page: 0, size: 20, totalElements: items.length, totalPages: 1, hasMore: false, ...patch };
}

const STATS: AdminUserStats = { total: 3, admins: 1, disabled: 1, newLast7Days: 2 };

/** A service whose every method is a spy with a sensible default answer. */
export function fakeService() {
  return {
    list: vi.fn<AdminUserService['list']>().mockResolvedValue(pageOf([summary()])),
    stats: vi.fn<AdminUserService['stats']>().mockResolvedValue(STATS),
    get: vi.fn<AdminUserService['get']>().mockResolvedValue(detail()),
    changeRole: vi.fn<AdminUserService['changeRole']>(),
    disable: vi.fn<AdminUserService['disable']>(),
    enable: vi.fn<AdminUserService['enable']>(),
    revokeSessions: vi.fn<AdminUserService['revokeSessions']>().mockResolvedValue(undefined),
  } satisfies AdminUserService;
}
