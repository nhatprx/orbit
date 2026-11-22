import type {
  AdminUserDetail,
  AdminUserListParams,
  AdminUserRole,
  AdminUserStats,
  AdminUserSummary,
} from '../../types/admin.types';
import type { PageResponse } from '../../types/workspace.types';
import { apiRequest, seg } from '../workspace/httpClient';
import type { AdminUserService } from './adminUser.service';

const BASE = '/api/v1/admin/users';

class HttpAdminUserService implements AdminUserService {
  list(params: AdminUserListParams) {
    return apiRequest<PageResponse<AdminUserSummary>>('GET', BASE, {
      query: {
        q: params.q || undefined,
        role: params.role || undefined,
        status: params.status || undefined,
        sort: params.sort || undefined,
        page: params.page,
        size: params.size,
      },
    });
  }

  stats() {
    return apiRequest<AdminUserStats>('GET', `${BASE}/stats`);
  }

  get(userId: string) {
    return apiRequest<AdminUserDetail>('GET', `${BASE}/${seg(userId)}`);
  }

  changeRole(userId: string, role: AdminUserRole) {
    return apiRequest<AdminUserDetail>('PATCH', `${BASE}/${seg(userId)}/role`, { body: { role } });
  }

  disable(userId: string, reason?: string) {
    const trimmed = reason?.trim();
    return apiRequest<AdminUserDetail>('POST', `${BASE}/${seg(userId)}/disable`, {
      body: trimmed ? { reason: trimmed } : {},
    });
  }

  enable(userId: string) {
    return apiRequest<AdminUserDetail>('POST', `${BASE}/${seg(userId)}/enable`);
  }

  revokeSessions(userId: string) {
    return apiRequest<void>('POST', `${BASE}/${seg(userId)}/revoke-sessions`);
  }
}

export const httpAdminUserService: AdminUserService = new HttpAdminUserService();
