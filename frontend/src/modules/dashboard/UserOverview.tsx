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
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#30363D] bg-[#161B22] p-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#E6EDF3]">
            Welcome back, {user.name}
          </h2>
          <p className="mt-1 text-sm text-[#BDBDBD]">
            Workspace: <span className="font-mono text-[#E6EDF3]">{user.workspaceId}</span>
          </p>
        </div>
        <Badge tone="green" withDot>
          ROLE: {user.role.toUpperCase()}
        </Badge>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#BDBDBD]">
          Workspace Areas
        </h3>
        {loading ? (
          <div className="border border-[#30363D] bg-[#161B22] p-6 text-sm text-[#8A8A8A]">
            Loading workspace areas...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px border border-[#30363D] bg-[#30363D] sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => onSelectArea(area.id)}
                className="flex flex-col items-start justify-between bg-[#161B22] p-6 text-left transition-colors hover:bg-[#21262D]"
              >
                <div className="mb-3 flex w-full items-center justify-between">
                  <span className="text-base font-semibold text-[#E6EDF3]">
                    {area.name}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
                </div>
                <p className="mb-4 text-sm text-[#BDBDBD]">{area.summary}</p>
                <Badge tone="green" withDot>ACTIVE</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#BDBDBD]">
          Recent Workspace Activity
        </h3>
        <div className="border border-[#30363D] bg-[#161B22]">
          {activity.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center justify-between px-5 py-3.5 text-sm ${
                idx > 0 ? 'border-t border-[#30363D]' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 bg-[#22C55E]" />
                <span className="font-medium text-[#E6EDF3]">{item.actor}</span>
                <span className="text-[#BDBDBD]">{item.action}</span>
              </div>
              <span className="font-mono text-xs text-[#8A8A8A]">{item.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
