import { BarChart3 } from 'lucide-react';
import { UserAvatar } from '../../components/ui/UserAvatar';
import type { GitContributorStatDto } from '../../types/git-insights.types';

interface GitContributorsChartProps {
  contributors: GitContributorStatDto[];
}

export function GitContributorsChart({ contributors }: GitContributorsChartProps) {
  const visible = contributors.slice(0, 8);
  const maxContrib = Math.max(1, ...visible.map((c) => c.contributions));
  const totalCommits = visible.reduce((sum, c) => sum + c.contributions, 0);

  return (
    <section className="flex flex-col border border-[#30363D] bg-[#161B22]">
      <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#E6EDF3]">
          <BarChart3 className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          <span>Contributors ({contributors.length})</span>
        </div>
        <span className="font-mono text-[10px] text-[#8A8A8A]">
          {totalCommits} commits
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-6 text-xs text-[#8A8A8A]">No contributor statistics available.</p>
      ) : (
        <div className="flex flex-1 flex-col justify-end p-4">
          <div className="relative flex h-40 items-end gap-3 border-b border-l border-[#30363D] bg-[#0D1117] px-3 pt-6">
            <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-dashed border-[#21262D]" />
            <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-dashed border-[#21262D]" />

            {visible.map((ct) => {
              const pct = Math.max(8, Math.round((ct.contributions / maxContrib) * 100));
              return (
                <div
                  key={ct.login}
                  title={`@${ct.login}: ${ct.contributions} commits`}
                  className="group relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                >
                  <span className="mb-1 font-mono text-[10px] font-semibold text-[#4ADE80]">
                    {ct.contributions}
                  </span>
                  <div
                    className="w-full max-w-[36px] border border-[#22C55E] bg-[#22C55E]/75 transition-colors group-hover:bg-[#4ADE80]"
                    style={{ height: `${pct}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex items-start gap-3 px-3">
            {visible.map((ct) => (
              <div key={ct.login} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <UserAvatar name={ct.login} avatarUrl={ct.avatarUrl} />
                <span
                  title={`@${ct.login}`}
                  className="w-full truncate text-center font-mono text-[10px] text-[#BDBDBD]"
                >
                  @{ct.login}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
