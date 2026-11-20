import { Activity, Building2, CalendarDays, FolderKanban, MessageSquare } from 'lucide-react';
import type { UserActivitySummary } from '../../types/auth.types';
import { formatDate } from '../../utils/format';

interface ProfileActivityOverviewProps {
  summary: UserActivitySummary | null;
  loading: boolean;
}

export function ProfileActivityOverview({ summary, loading }: ProfileActivityOverviewProps) {
  if (loading && !summary) {
    return (
      <section className="border border-[#30363D] bg-[#161B22] p-5 text-xs text-[#8B949E]">
        Loading activity overview...
      </section>
    );
  }

  const data: UserActivitySummary = summary ?? {
    workspaceCount: 0,
    projectCount: 0,
    messagesTotal: 0,
    messagesLast30Days: 0,
    activeDaysLast30Days: 0,
    lastActiveAt: null,
  };

  const engagementPercent = Math.min(100, Math.round((data.activeDaysLast30Days / 30) * 100));

  const metrics = [
    { label: 'Workspaces', value: data.workspaceCount, icon: Building2 },
    { label: 'Projects', value: data.projectCount, icon: FolderKanban },
    { label: 'Messages (30d)', value: data.messagesLast30Days, icon: MessageSquare },
    { label: 'Active days (30d)', value: `${data.activeDaysLast30Days}/30`, icon: CalendarDays },
  ];

  return (
    <section className="border border-[#30363D] bg-[#161B22]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] px-5 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#E6EDF3]">
            Activity Overview
          </h2>
        </div>
        {data.lastActiveAt && (
          <span className="font-mono text-[11px] text-[#7D8590]">
            Last active {formatDate(data.lastActiveAt)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-px bg-[#30363D] sm:grid-cols-4">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-[#161B22] p-4">
              <div className="flex items-center justify-between text-[#7D8590]">
                <span className="text-[11px] uppercase tracking-wider">{item.label}</span>
                <Icon className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold text-[#E6EDF3]">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[#30363D] px-5 py-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-[#8B949E]">30-day workspace consistency</span>
          <span className="font-mono text-[#22C55E]">
            {engagementPercent}% ({data.messagesTotal} total messages)
          </span>
        </div>
        <div className="h-2 w-full border border-[#30363D] bg-[#0D1117]">
          <div
            className="h-full bg-[#22C55E] transition-all"
            style={{ width: `${engagementPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
