import type { Resource } from '../../hooks/useResource';
import type { AdminUserStats } from '../../types/admin.types';

interface AdminUserStatsStripProps {
  stats: Resource<AdminUserStats>;
}

const TILES: { key: keyof AdminUserStats; label: string }[] = [
  { key: 'total', label: 'Total users' },
  { key: 'admins', label: 'Administrators' },
  { key: 'disabled', label: 'Disabled' },
  { key: 'newLast7Days', label: 'Joined in 7 days' },
];

export function AdminUserStatsStrip({ stats }: AdminUserStatsStripProps) {
  return (
    <div
      aria-label="User totals"
      className="grid grid-cols-2 gap-px border border-[#30363D] bg-[#30363D] lg:grid-cols-4"
    >
      {TILES.map((tile) => (
        <div key={tile.key} className="bg-[#161B22] p-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs text-[#8B949E]">{tile.label}</span>
            <span className={`h-1.5 w-1.5 ${tile.key === 'disabled' ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`} />
          </div>
          <div className="font-mono text-lg font-semibold text-[#E6EDF3]">
            {stats.data ? stats.data[tile.key] : stats.error ? 'n/a' : '...'}
          </div>
        </div>
      ))}
    </div>
  );
}
