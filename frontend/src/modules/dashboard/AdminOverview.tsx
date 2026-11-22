import { useEffect, useState } from 'react';
import { ArrowRight, ShieldAlert, Users } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { dashboardService } from '../../services/dashboard.service';
import type { AuthUser } from '../../types/auth.types';
import type { PlatformMetric } from '../../types/dashboard.types';
import { AdminAiConfigPanel } from './AdminAiConfigPanel';

interface AdminOverviewProps {
  user: AuthUser;
  onOpenUsers: () => void;
}

export function AdminOverview({ user, onOpenUsers }: AdminOverviewProps) {
  const [metrics, setMetrics] = useState<PlatformMetric[]>([]);

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#22C55E] bg-[#052E16] p-4">
        <div>
          <h2 className="text-base font-semibold text-[#E6EDF3]">
            Admin Console
          </h2>
          <p className="mt-0.5 text-[13px] text-[#8B949E]">
            Platform governance, capacity targets, and user administration.
          </p>
        </div>
        <Badge tone="green" withDot>
          ADMIN SESSION
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-px border border-[#30363D] bg-[#30363D] sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.id} className="bg-[#161B22] p-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-[#8B949E]">{metric.label}</span>
              <span className="h-1.5 w-1.5 bg-[#22C55E]" />
            </div>
            <div className="font-mono text-lg font-semibold text-[#E6EDF3]">
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <Panel
        title="User Management"
        description="Search accounts, change roles, disable access, and end sessions."
        actions={<Users className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />}
      >
        <Button type="button" variant="primary" onClick={onOpenUsers}>
          Open user management
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </Panel>

      <AdminAiConfigPanel />
    </div>
  );
}
