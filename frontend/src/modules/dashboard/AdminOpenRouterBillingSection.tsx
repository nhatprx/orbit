import { useState } from 'react';
import { KeyRound, RefreshCw, Search } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Pager } from '../../components/ui/Pager';
import type { AdminUserAiUsage, AdminUserAiUsagePage, OpenRouterCredits } from '../../types/ai.types';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

interface AdminOpenRouterBillingSectionProps {
  credits: OpenRouterCredits | null;
  usagePage: AdminUserAiUsagePage | null;
  search: string;
  mgmtConfigured: boolean;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  onRefresh: () => Promise<void>;
  onUpdateBudget: (userId: string, monthlyBudgetUsd: number, provisionSubKey: boolean) => Promise<void>;
}

export function AdminOpenRouterBillingSection({
  credits,
  usagePage,
  search,
  mgmtConfigured,
  onSearchChange,
  onPageChange,
  onSizeChange,
  onRefresh,
  onUpdateBudget,
}: AdminOpenRouterBillingSectionProps) {
  const [draftBudgets, setDraftBudgets] = useState<Record<string, string>>({});
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const users = usagePage?.items ?? [];

  async function handleSave(user: AdminUserAiUsage, provisionSubKey: boolean) {
    const raw = draftBudgets[user.userId] ?? String(user.monthlyBudgetUsd);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setBusyUserId(user.userId);
    try {
      await onUpdateBudget(user.userId, parsed, provisionSubKey);
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#E6EDF3]">
            OpenRouter Credits &amp; User Budgets
          </h4>
          <p className="text-[11px] text-[#7D8590]">
            Monitor account balance, models used, search users, and set monthly AI limits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[#7D8590]" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search user or email..."
              className="h-8 border border-[#30363D] bg-[#0D1117] pl-8 pr-2.5 font-mono text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none"
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => void onRefresh()}>
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
            Refresh
          </Button>
        </div>
      </div>

      {credits && (
        <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="border border-[#30363D] bg-[#0D1117] p-2.5 font-mono text-xs">
            <span className="text-[#7D8590]">Total Credits</span>
            <p className="mt-0.5 text-sm font-semibold text-[#E6EDF3]">${credits.totalCreditsUsd.toFixed(2)}</p>
          </div>
          <div className="border border-[#30363D] bg-[#0D1117] p-2.5 font-mono text-xs">
            <span className="text-[#7D8590]">Total Used</span>
            <p className="mt-0.5 text-sm font-semibold text-[#E6EDF3]">${credits.totalUsageUsd.toFixed(4)}</p>
          </div>
          <div className="border border-[#30363D] bg-[#0D1117] p-2.5 font-mono text-xs">
            <span className="text-[#7D8590]">Remaining Balance</span>
            <p className="mt-0.5 text-sm font-semibold text-[#22C55E]">${credits.remainingCreditsUsd.toFixed(2)}</p>
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div className="min-h-0 flex-1 overflow-auto border border-[#30363D] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="sticky top-0 z-10 border-b border-[#30363D] bg-[#0D1117] text-[#7D8590]">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Models Used</th>
                <th className="px-3 py-2">Month Spend</th>
                <th className="px-3 py-2">Tokens</th>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Budget (USD)</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D] bg-[#161B22]">
              {users.map((u) => (
                <tr key={u.userId}>
                  <td className="px-3 py-2 text-[#E6EDF3]">
                    <div>{u.fullName}</div>
                    <div className="text-[10px] text-[#7D8590]">{u.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    {u.modelsUsed && u.modelsUsed.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.modelsUsed.map((m) => (
                          <Badge key={m} tone="green">{m}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#7D8590]">None yet</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[#22C55E]">${u.currentMonthCostUsd.toFixed(4)}</td>
                  <td className="px-3 py-2 text-[#BDBDBD]">{u.currentMonthTokens.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <Badge tone={u.hasPersonalKey || u.hasProvisionedKey ? 'green' : 'neutral'}>
                      {u.hasPersonalKey ? 'PERSONAL' : u.hasProvisionedKey ? 'SUB-KEY' : 'SYSTEM'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={draftBudgets[u.userId] ?? String(u.monthlyBudgetUsd)}
                      onChange={(e) => setDraftBudgets((prev) => ({ ...prev, [u.userId]: e.target.value }))}
                      className="h-7 w-20 border border-[#30363D] bg-[#0D1117] px-2 text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <Button type="button" variant="secondary" disabled={busyUserId === u.userId} onClick={() => void handleSave(u, false)}>
                        Set
                      </Button>
                      {mgmtConfigured && (
                        <Button type="button" variant="secondary" disabled={busyUserId === u.userId} onClick={() => void handleSave(u, true)}>
                          <KeyRound className="h-3 w-3" strokeWidth={1.5} />
                          Sub-Key
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {usagePage && (
        <div className="shrink-0">
          <Pager
            page={usagePage.page}
            totalPages={usagePage.totalPages}
            totalElements={usagePage.totalElements}
            noun={usagePage.totalElements === 1 ? 'user' : 'users'}
            onPage={onPageChange}
            size={usagePage.size}
            sizeOptions={PAGE_SIZE_OPTIONS}
            onSizeChange={onSizeChange}
          />
        </div>
      )}
    </div>
  );
}
