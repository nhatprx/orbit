import { useState } from 'react';
import { GitPullRequest } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { GitPullRequest as PullRequestItem } from '../../types/git.types';

interface GitPullRequestsViewProps {
  pullRequests: PullRequestItem[];
}

export function GitPullRequestsView({ pullRequests }: GitPullRequestsViewProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'merged'>('all');

  const visible = pullRequests.filter((pr) =>
    filter === 'all' ? true : pr.status === filter
  );

  return (
    <div className="border border-[#30363D] bg-[#161B22]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#BDBDBD]">
          Pull Requests ({visible.length})
        </span>
        <div className="flex gap-1">
          {(['all', 'open', 'merged'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`border px-2.5 py-1 font-mono text-xs uppercase ${
                filter === tab
                  ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                  : 'border-[#30363D] bg-[#0D1117] text-[#BDBDBD] hover:text-[#E6EDF3]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div>
        {visible.map((pr, idx) => (
          <div
            key={pr.id}
            className={`flex flex-wrap items-center justify-between gap-4 px-5 py-4 ${
              idx > 0 ? 'border-t border-[#30363D]' : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <GitPullRequest
                  className="h-4 w-4 shrink-0 text-[#22C55E]"
                  strokeWidth={1.5}
                />
                <span className="truncate text-sm font-semibold text-[#E6EDF3]">
                  {pr.title}
                </span>
                <span className="font-mono text-xs text-[#8A8A8A]">#{pr.id}</span>
              </div>
              <p className="mt-1 pl-6 font-mono text-xs text-[#8A8A8A]">
                {pr.author} wants to merge{' '}
                <span className="text-[#BDBDBD]">{pr.sourceBranch}</span> into{' '}
                <span className="text-[#22C55E]">{pr.targetBranch}</span> — {pr.updatedAt}
              </p>
            </div>

            <Badge tone={pr.status === 'open' ? 'green' : 'neutral'} withDot>
              {pr.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
