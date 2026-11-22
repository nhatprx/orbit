import { Search } from 'lucide-react';
import { useId } from 'react';
import { Button } from '../../components/ui/Button';
import { CONTROL_CLASS, SelectField } from '../../components/ui/Field';
import type { AdminRoleFilter, AdminStatusFilter } from '../../types/admin.types';
import { MAX_SEARCH_LENGTH, SORT_OPTIONS, hasActiveFilters, type AdminUserFilters } from './adminUserQuery';

interface AdminUsersFiltersProps {
  filters: AdminUserFilters;
  searchInput: string;
  onSearchInput: (text: string) => void;
  onRole: (role: AdminRoleFilter) => void;
  onStatus: (status: AdminStatusFilter) => void;
  onSort: (sort: string) => void;
  onClear: () => void;
}

export function AdminUsersFilters({
  filters,
  searchInput,
  onSearchInput,
  onRole,
  onStatus,
  onSort,
  onClear,
}: AdminUsersFiltersProps) {
  const searchId = useId();
  const showClear = hasActiveFilters(filters) || searchInput !== '';

  return (
    <div className="flex flex-wrap items-end gap-3 border border-[#30363D] bg-[#161B22] p-3">
      <div className="min-w-[220px] flex-1">
        <label htmlFor={searchId} className="mb-1 block text-xs text-[#BDBDBD]">
          Search
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A8A8A]"
            strokeWidth={1.5}
          />
          <input
            id={searchId}
            type="search"
            value={searchInput}
            maxLength={MAX_SEARCH_LENGTH}
            placeholder="Name, username, or email"
            autoComplete="off"
            onChange={(event) => onSearchInput(event.target.value)}
            className={`${CONTROL_CLASS} pl-8`}
          />
        </div>
      </div>
      <div className="w-36">
        <SelectField label="Role" value={filters.role} onChange={(e) => onRole(e.target.value as AdminRoleFilter)}>
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </SelectField>
      </div>
      <div className="w-36">
        <SelectField
          label="Status"
          value={filters.status}
          onChange={(e) => onStatus(e.target.value as AdminStatusFilter)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </SelectField>
      </div>
      <div className="w-40">
        <SelectField label="Sort by" value={filters.sort} onChange={(e) => onSort(e.target.value)}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>
      {showClear && (
        <Button type="button" variant="ghost" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
