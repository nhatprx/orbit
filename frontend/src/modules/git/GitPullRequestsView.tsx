import { useState } from 'react';
import { GitMerge, GitPullRequest, Plus } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { GitPullRequestDto } from '../../types/git.types';

interface GitPullRequestsViewProps {
  pullRequests: GitPullRequestDto[];
  filter: 'all' | 'open' | 'closed';
  canWrite: boolean;
  onFilterChange: (filter: 'all' | 'open' | 'closed') => void;
  onNewPr: () => void;
  onMergePr: (pullNumber: number) => Promise<void>;
}

export function GitPullRequestsView({
  pullRequests,
  filter,
  canWrite,
  onFilterChange,
  onNewPr,
  onMergePr,
}: GitPullRequestsViewProps) {
  const [mergingNumber, setMergingNumber] = useState<number | null>(null);

  async function handleMerge(pullNumber: number) {
    setMergingNumber(pullNumber);
    try {
      await onMergePr(pullNumber);
    } finally {
      setMergingNumber(null);
    }
  }

  return (
    <div className="border border-[#30363D] bg-[#161B22]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#BDBDBD]">
          Pull Requests ({pullRequests.length})
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {(['all', 'open', 'closed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onFilterChange(tab)}
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

          {canWrite && (
            <Button type="button" variant="primary" onClick={onNewPr}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              New Pull Request
            </Button>
          )}
        </div>
      </div>

      <div>
        {pullRequests.length === 0 ? (
          <div className="p-6 text-xs text-[#8A8A8A]">
            No pull requests match the current filter.
          </div>
        ) : (
          pullRequests.map((pr, idx) => (
            <div
              key={pr.number}
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
                  <span className="font-mono text-xs text-[#8A8A8A]">#{pr.number}</span>
                </div>
                <p className="mt-1 pl-6 font-mono text-xs text-[#8A8A8A]">
                  {pr.author} wants to merge{' '}
                  <span className="text-[#BDBDBD]">{pr.sourceBranch}</span> into{' '}
                  <span className="text-[#22C55E]">{pr.targetBranch}</span> — {pr.updatedAt}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  tone={
                    pr.status === 'open'
                      ? 'green'
                      : pr.status === 'closed'
                        ? 'danger'
                        : 'neutral'
                  }
                  withDot
                >
                  {pr.status}
                </Badge>
                {canWrite && pr.status === 'open' && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={mergingNumber === pr.number}
                    onClick={() => void handleMerge(pr.number)}
                  >
                    <GitMerge className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {mergingNumber === pr.number ? 'Merging...' : 'Merge PR'}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
