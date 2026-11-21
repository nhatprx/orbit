import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { GitPullRequestDto, MergeGitPullRequest } from '../../types/git.types';
import { GitPullRequestRow } from './GitPullRequestRow';

interface GitPullRequestsViewProps {
  pullRequests: GitPullRequestDto[];
  filter: 'all' | 'open' | 'closed';
  canWrite: boolean;
  onFilterChange: (filter: 'all' | 'open' | 'closed') => void;
  onNewPr: () => void;
  onMergePr: (pullNumber: number, body?: MergeGitPullRequest) => Promise<void>;
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

  async function handleMerge(pullNumber: number, body: MergeGitPullRequest) {
    setMergingNumber(pullNumber);
    try {
      await onMergePr(pullNumber, body);
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
            <GitPullRequestRow
              key={pr.number}
              pr={pr}
              bordered={idx > 0}
              canWrite={canWrite}
              merging={mergingNumber === pr.number}
              onMerge={handleMerge}
            />
          ))
        )}
      </div>
    </div>
  );
}
