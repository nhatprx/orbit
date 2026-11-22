import { useState } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Pager } from '../../components/ui/Pager';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { adminUserService } from '../../services/admin/services';
import type { AdminUserService } from '../../services/admin/adminUser.service';
import type { AuthUser } from '../../types/auth.types';
import { AdminBulkActionsBar } from './AdminBulkActionsBar';
import { AdminUserDialog } from './AdminUserDialog';
import { PAGE_SIZE, PAGE_SIZE_OPTIONS } from './adminUserQuery';
import { AdminUserStatsStrip } from './AdminUserStatsStrip';
import { AdminUsersFilters } from './AdminUsersFilters';
import { AdminUsersTable } from './AdminUsersTable';
import { useAdminUsers } from './useAdminUsers';

interface AdminUsersPageProps {
  currentUser: AuthUser;
  /** Defaults to the HTTP adapter; tests and Storybook-style callers pass their own. */
  service?: AdminUserService;
}

export function AdminUsersPage({ currentUser, service = adminUserService }: AdminUsersPageProps) {
  if (currentUser.role !== 'admin') {
    return (
      <div className="border border-[#EF4444] bg-[#161B22] p-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#EF4444]">
          <ShieldAlert className="h-4 w-4" strokeWidth={1.5} />
          403 - Admin Role Required
        </div>
        <p className="text-xs text-[#A3A3A3]">
          Your current session role ({currentUser.role}) cannot manage platform users.
        </p>
      </div>
    );
  }
  return <AdminUsersContent currentUser={currentUser} service={service} />;
}

function AdminUsersContent({ currentUser, service }: { currentUser: AuthUser; service: AdminUserService }) {
  const users = useAdminUsers(service);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const { list, stats } = users;
  const page = list.data;

  function toggleCheck(userId: string) {
    if (userId === currentUser.id) return;
    const target = page?.items.find((u) => u.id === userId);
    if (target?.role === 'admin') return;
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleAll(pageIds: string[]) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      const allSelected = pageIds.length > 0 && pageIds.every((id) => next.has(id));
      for (const id of pageIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#E6EDF3]">User Management</h2>
            <p className="mt-0.5 text-[13px] text-[#8B949E]">
              Search every account, change roles, and disable access across the platform.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              list.reload();
              stats.reload();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
            Refresh
          </Button>
        </div>

        <AdminUserStatsStrip stats={stats} />

        <AdminUsersFilters
          filters={users.filters}
          searchInput={users.searchInput}
          onSearchInput={users.setSearchInput}
          onRole={users.setRole}
          onStatus={users.setStatus}
          onSort={users.setSort}
          onClear={users.clearFilters}
        />

        <AdminBulkActionsBar
          selectedIds={Array.from(checkedIds)}
          service={service}
          onUpdatedMany={(details) => {
            details.forEach((d) => users.applyUpdated(d));
            setCheckedIds((prev) => {
              const next = new Set(prev);
              for (const d of details) {
                if (d.role === 'admin') next.delete(d.id);
              }
              return next;
            });
          }}
          onClearSelection={() => setCheckedIds(new Set())}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {list.error && <ErrorView message={list.error} onRetry={list.reload} />}
          {!page && list.loading && <LoadingView label="Loading users..." />}
          {page && page.items.length === 0 && (
            <EmptyView title="No users match" description="Try a different search or clear the filters." />
          )}
          {page && page.items.length > 0 && (
            <div
              aria-busy={list.loading}
              className={`flex min-h-0 flex-1 flex-col ${list.loading ? 'opacity-60' : ''}`}
            >
              <AdminUsersTable
                users={page.items}
                currentUserId={currentUser.id}
                selectedId={selectedId}
                checkedIds={checkedIds}
                onSelect={setSelectedId}
                onToggleCheck={toggleCheck}
                onToggleAll={toggleAll}
              />
            </div>
          )}
        </div>

        {page && (
          <div className="shrink-0">
            <Pager
              page={page.page}
              totalPages={page.totalPages}
              totalElements={page.totalElements}
              noun={page.totalElements === 1 ? 'user' : 'users'}
              onPage={users.goToPage}
              size={users.filters.size ?? PAGE_SIZE}
              sizeOptions={PAGE_SIZE_OPTIONS}
              onSizeChange={users.setPageSize}
            />
          </div>
        )}
      </div>

      <AdminUserDialog
        userId={selectedId}
        currentUserId={currentUser.id}
        service={service}
        onClose={() => setSelectedId(null)}
        onChanged={users.applyUpdated}
      />
    </div>
  );
}
