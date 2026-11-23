import type {
  AdminRoleFilter,
  AdminStatusFilter,
  AdminUserDetail,
  AdminUserListParams,
  AdminUserSummary,
} from '../../types/admin.types';

export const PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const MAX_SEARCH_LENGTH = 100;
export const SEARCH_DEBOUNCE_MS = 300;
export const MAX_REASON_LENGTH = 255;

export const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'displayName,asc', label: 'Name A-Z' },
  { value: 'username,asc', label: 'Username A-Z' },
  { value: 'email,asc', label: 'Email A-Z' },
] as const;

/** Applied filters; `q` is the debounced search text that was actually sent. */
export interface AdminUserFilters {
  q: string;
  role: AdminRoleFilter;
  status: AdminStatusFilter;
  sort: string;
  page: number;
  size?: number;
}

export const DEFAULT_FILTERS: AdminUserFilters = {
  q: '',
  role: '',
  status: '',
  sort: SORT_OPTIONS[0].value,
  page: 0,
};

/** Trims, collapses whitespace runs, and caps the length the server accepts. */
export function normalizeSearch(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, MAX_SEARCH_LENGTH);
}

export function toListParams(filters: AdminUserFilters): AdminUserListParams {
  return {
    q: normalizeSearch(filters.q),
    role: filters.role,
    status: filters.status,
    sort: filters.sort,
    page: Math.max(0, filters.page),
    size: filters.size ?? PAGE_SIZE,
  };
}

/** Changing any filter returns to the first page; only a page change keeps its page. */
export function applyFilterChange(
  current: AdminUserFilters,
  change: Partial<Omit<AdminUserFilters, 'page'>>
): AdminUserFilters {
  return { ...current, ...change, page: 0 };
}

export function hasActiveFilters(filters: AdminUserFilters): boolean {
  return filters.q !== '' || filters.role !== '' || filters.status !== '';
}

export function summaryOf(detail: AdminUserDetail): AdminUserSummary {
  return {
    id: detail.id,
    username: detail.username,
    displayName: detail.displayName,
    email: detail.email,
    avatarUrl: detail.avatarUrl ?? null,
    role: detail.role,
    status: detail.status,
    totpEnabled: detail.totpEnabled,
    workspaceCount: detail.workspaceCount,
    createdAt: detail.createdAt,
    disabledAt: detail.disabledAt,
  };
}

/** Replaces the row with the same id; other rows keep their identity. */
export function replaceRow(items: AdminUserSummary[], updated: AdminUserSummary): AdminUserSummary[] {
  return items.map((item) => (item.id === updated.id ? updated : item));
}
