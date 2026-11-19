import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { dashboardService } from '../../services/dashboard.service';
import type { AuthUser } from '../../types/auth.types';
import type { DirectoryUser, PlatformMetric } from '../../types/dashboard.types';

interface AdminOverviewProps {
  user: AuthUser;
}

export function AdminOverview({ user }: AdminOverviewProps) {
  const [metrics, setMetrics] = useState<PlatformMetric[]>([]);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role !== 'admin') return;
    let active = true;
    Promise.all([
      dashboardService.getPlatformMetrics(),
      dashboardService.getDirectoryUsers(10),
    ]).then(([metricData, userData]) => {
      if (!active) return;
      setMetrics(metricData);
      setUsers(userData);
      setLoading(false);
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
            Platform governance, capacity targets, and workspace user directory.
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

      <div>
        <h3 className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
          Workspace User Directory (Page 1 / Limit 10)
        </h3>
        <div className="overflow-x-auto border border-[#30363D] bg-[#161B22]">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#30363D] bg-[#21262D] text-[11px] uppercase tracking-wider text-[#8B949E]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-[#666666]">
                    Loading directory...
                  </td>
                </tr>
              ) : (
                users.map((entry) => (
                  <tr key={entry.id} className="border-t border-[#30363D]">
                    <td className="px-4 py-3 font-medium text-[#E6EDF3]">
                      {entry.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#A3A3A3]">
                      {entry.email}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={entry.role === 'admin' ? 'green' : 'neutral'}>
                        {entry.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={entry.status === 'active' ? 'green' : 'warning'}
                        withDot
                      >
                        {entry.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
