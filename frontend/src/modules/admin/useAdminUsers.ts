import { useCallback, useEffect, useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useResource } from '../../hooks/useResource';
import type { AdminUserService } from '../../services/admin/adminUser.service';
import type { AdminRoleFilter, AdminStatusFilter, AdminUserDetail } from '../../types/admin.types';
import {
  DEFAULT_FILTERS,
  SEARCH_DEBOUNCE_MS,
  applyFilterChange,
  normalizeSearch,
  replaceRow,
  summaryOf,
  toListParams,
  type AdminUserFilters,
} from './adminUserQuery';

/**
 * Owns the table state: filters, the debounced search box, the loaded page and the totals.
 * Typing never fires a request per keystroke; the first page is requested once typing pauses.
 */
export function useAdminUsers(service: AdminUserService) {
  const [filters, setFilters] = useState<AdminUserFilters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const debouncedInput = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    const q = normalizeSearch(debouncedInput);
    setFilters((current) => (current.q === q ? current : applyFilterChange(current, { q })));
  }, [debouncedInput]);

  const list = useResource(() => service.list(toListParams(filters)), [filters, service]);
  const stats = useResource(() => service.stats(), [service]);
  const reloadStats = stats.reload;
  const setList = list.setData;
  const loaded = list.data;

  const setRole = useCallback(
    (role: AdminRoleFilter) => setFilters((current) => applyFilterChange(current, { role })),
    []
  );
  const setStatus = useCallback(
    (status: AdminStatusFilter) => setFilters((current) => applyFilterChange(current, { status })),
    []
  );
  const setSort = useCallback(
    (sort: string) => setFilters((current) => applyFilterChange(current, { sort })),
    []
  );
  const goToPage = useCallback(
    (page: number) => setFilters((current) => ({ ...current, page })),
    []
  );
  const setPageSize = useCallback(
    (size: number) => setFilters((current) => applyFilterChange(current, { size })),
    []
  );
  const clearFilters = useCallback(() => {
    setSearchInput('');
    setFilters((current) => applyFilterChange(current, { q: '', role: '', status: '' }));
  }, []);

  /** Patches the visible row in place and refreshes the totals after an admin action. */
  const applyUpdated = useCallback(
    (detail: AdminUserDetail) => {
      if (loaded) setList({ ...loaded, items: replaceRow(loaded.items, summaryOf(detail)) });
      reloadStats();
    },
    [loaded, setList, reloadStats]
  );

  return {
    filters,
    searchInput,
    setSearchInput,
    setRole,
    setStatus,
    setSort,
    goToPage,
    setPageSize,
    clearFilters,
    list,
    stats,
    applyUpdated,
  };
}
