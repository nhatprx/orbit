import { useState, type FormEvent } from 'react';
import { DollarSign, KeyRound, Link2, Unlink, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { AiUsageSummary } from '../../types/ai.types';
import { formatDate } from '../../utils/format';
import { startOpenRouterOAuth } from './openRouterPkce';

interface AiUsageDrawerProps {
  usage: AiUsageSummary | null;
  loading: boolean;
  onSavePersonalKey: (apiKey: string) => Promise<void>;
  onClearPersonalKey: () => Promise<void>;
  onClose: () => void;
}

export function AiUsageDrawer({
  usage,
  loading,
  onSavePersonalKey,
  onClearPersonalKey,
  onClose,
}: AiUsageDrawerProps) {
  const [manualKey, setManualKey] = useState('');
  const [busy, setBusy] = useState(false);

  const spent = usage?.currentMonthCostUsd ?? 0;
  const budget = usage?.monthlyBudgetUsd ?? 0;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  async function handleSaveKey(e: FormEvent) {
    e.preventDefault();
    if (!manualKey.trim() || busy) return;
    setBusy(true);
    try {
      await onSavePersonalKey(manualKey.trim());
      setManualKey('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-[#30363D] bg-[#161B22]">
      <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E6EDF3]">
            AI Spend &amp; Keys
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close usage drawer" className="text-[#8B949E] hover:text-[#E6EDF3]">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
        <div className="border border-[#30363D] bg-[#0D1117] p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8B949E]">This Month</span>
            <Badge tone={usage?.keySource === 'PERSONAL' ? 'green' : 'neutral'}>
              {usage?.keySource ?? 'SYSTEM'}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-lg font-semibold text-[#22C55E]">
            ${spent.toFixed(4)}
            {budget > 0 && <span className="text-xs font-normal text-[#7D8590]"> / ${budget.toFixed(2)}</span>}
          </p>
          {budget > 0 && (
            <div className="mt-2 h-1.5 w-full bg-[#21262D]">
              <div className="h-full bg-[#22C55E]" style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="mt-2 flex justify-between font-mono text-[11px] text-[#7D8590]">
            <span>All-time: ${(usage?.totalCostUsd ?? 0).toFixed(4)}</span>
            <span>
              {((usage?.currentMonthInputTokens ?? 0) + (usage?.currentMonthOutputTokens ?? 0)).toLocaleString()} tok
            </span>
          </div>
        </div>

        <div className="space-y-2 border border-[#30363D] bg-[#0D1117] p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E6EDF3]">
            <KeyRound className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
            Personal OpenRouter Key (Optional)
          </div>
          {usage?.hasPersonalKey ? (
            <div className="space-y-2">
              <p className="font-mono text-[11px] text-[#22C55E]">Connected: {usage.personalKeyPreview}</p>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || loading}
                onClick={() => void onClearPersonalKey()}
                className="w-full justify-center"
              >
                <Unlink className="h-3.5 w-3.5" strokeWidth={1.5} />
                Disconnect Personal Key
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button type="button" variant="primary" onClick={() => void startOpenRouterOAuth()} className="w-full justify-center">
                <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                Connect with OpenRouter
              </Button>
              <form onSubmit={handleSaveKey} className="flex gap-1.5">
                <input
                  type="password"
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="Or paste sk-or-v1-..."
                  className="h-8 min-w-0 flex-1 border border-[#30363D] bg-[#161B22] px-2 font-mono text-[11px] text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none"
                />
                <Button type="submit" variant="secondary" disabled={busy || !manualKey.trim()}>
                  Save
                </Button>
              </form>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#7D8590]">Recent Requests</p>
          {(!usage || usage.recentEntries.length === 0) && (
            <p className="border border-[#30363D] bg-[#0D1117] p-3 text-xs text-[#7D8590]">
              No AI usage recorded yet.
            </p>
          )}
          {usage?.recentEntries.map((item) => (
            <div key={item.id} className="border border-[#30363D] bg-[#0D1117] p-2.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-[#E6EDF3]">
                <span className="truncate">{item.modelUsed}</span>
                <span className="text-[#22C55E]">${item.costUsd.toFixed(5)}</span>
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-[#7D8590]">
                <span>{item.inputTokens + item.outputTokens} tok ({item.keySource})</span>
                <span>{formatDate(item.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
