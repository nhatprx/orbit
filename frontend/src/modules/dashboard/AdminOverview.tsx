import { useEffect, useState } from 'react';
import { KeyRound, ShieldAlert, Users } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { dashboardService } from '../../services/dashboard.service';
import type { AuthUser } from '../../types/auth.types';
import type { PlatformMetric } from '../../types/dashboard.types';
import { AdminAiConfigPanel } from './AdminAiConfigPanel';

type AdminTab = 'keys' | 'users';

interface AdminOverviewProps {
  user: AuthUser;
  onOpenUsers?: () => void;
}

export function AdminOverview({ user }: AdminOverviewProps) {
  const [metrics, setMetrics] = useState<PlatformMetric[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>('keys');

  useEffect(() => {
    if (user.role !== 'admin') return;
    let active = true;
    void dashboardService.getPlatformMetrics().then((metricData) => {
      if (active) setMetrics(metricData);
    });
    return () => {
      active = false;
    };
  }, [user.role]);

  if (user.role !== 'admin') {
    return (
      <div className="border border-[#EF4444] bg-[#161B22] p-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#EF4444]">
          <ShieldAlert className="h-4 w-4" strokeWidth={1.5} />
          403 — Admin Role Required
        </div>
        <p className="text-xs text-[#A3A3A3]">
          Your current session role ({user.role}) does not have permission to view
          platform administration controls.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border border-[#22C55E] bg-[#052E16] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-[#E6EDF3]">Admin Console</h2>
          <p className="mt-0.5 text-[13px] text-[#8B949E]">
            Platform governance, capacity targets, and AI provider controls.
          </p>
        </div>
        <Badge tone="green" withDot>ADMIN SESSION</Badge>
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-px border border-[#30363D] bg-[#30363D] sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.id} className="bg-[#161B22] px-4 py-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-[#8B949E]">{metric.label}</span>
              <span className="h-1.5 w-1.5 bg-[#22C55E]" />
            </div>
            <div className="font-mono text-lg font-semibold text-[#E6EDF3]">{metric.value}</div>
          </div>
        ))}
      </div>

      <div role="tablist" aria-label="Admin Console sections" className="flex shrink-0 border-b border-[#30363D]">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'keys'}
          onClick={() => setActiveTab('keys')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
            activeTab === 'keys'
              ? 'border-[#22C55E] bg-[#052E16]/40 text-[#22C55E]'
              : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
        >
          <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
          AI Keys &amp; Models
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
            activeTab === 'users'
              ? 'border-[#22C55E] bg-[#052E16]/40 text-[#22C55E]'
              : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
        >
          <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
          AI User Budgets
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AdminAiConfigPanel section={activeTab} />
      </div>
    </div>
  );
}
