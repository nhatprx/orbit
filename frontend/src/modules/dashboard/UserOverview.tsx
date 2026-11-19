import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { dashboardService } from '../../services/dashboard.service';
import type { AuthUser } from '../../types/auth.types';
import type {
  ActivityRecord,
  WorkspaceAreaId,
  WorkspaceAreaTile,
} from '../../types/dashboard.types';

interface UserOverviewProps {
  user: AuthUser;
  onSelectArea: (area: WorkspaceAreaId) => void;
}

export function UserOverview({ user, onSelectArea }: UserOverviewProps) {
  const [areas, setAreas] = useState<WorkspaceAreaTile[]>([]);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      dashboardService.getWorkspaceAreas(),
      dashboardService.getRecentActivity(5),
    ]).then(([areaData, activityData]) => {
      if (!active) return;
      setAreas(areaData);
      setActivity(activityData);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#1F1F1F] bg-[#0A0A0A] p-5">
        <div>
          <h2 className="text-base font-semibold text-[#F5F5F5]">
            Welcome back, {user.name}
          </h2>
          <p className="mt-1 text-xs text-[#A3A3A3]">
            Workspace: <span className="font-mono text-[#F5F5F5]">{user.workspaceId}</span>
          </p>
        </div>
        <Badge tone="green" withDot>
          ROLE: {user.role.toUpperCase()}
        </Badge>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
          Workspace Areas
        </h3>
        {loading ? (
          <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-6 text-xs text-[#666666]">
            Loading workspace areas...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px border border-[#1F1F1F] bg-[#1F1F1F] sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => onSelectArea(area.id)}
                className="flex flex-col items-start justify-between bg-[#0A0A0A] p-5 text-left transition-colors hover:bg-[#111111]"
              >
                <div className="mb-3 flex w-full items-center justify-between">
                  <span className="text-sm font-semibold text-[#F5F5F5]">
                    {area.name}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
                </div>
                <p className="mb-3 text-xs text-[#A3A3A3]">{area.summary}</p>
                <Badge tone="neutral">MOCKUP READY</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
          Recent Workspace Activity
        </h3>
        <div className="border border-[#1F1F1F] bg-[#0A0A0A]">
          {activity.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center justify-between px-4 py-3 text-xs ${
                idx > 0 ? 'border-t border-[#1F1F1F]' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 bg-[#22C55E]" />
                <span className="font-medium text-[#F5F5F5]">{item.actor}</span>
                <span className="text-[#A3A3A3]">{item.action}</span>
              </div>
              <span className="font-mono text-[#666666]">{item.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
