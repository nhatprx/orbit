import { FileDiff, GitCommitHorizontal, RefreshCw } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { GitCommitDto } from '../../types/git.types';

interface GitCommitsViewProps {
  branch: string;
  commits: GitCommitDto[];
  syncing: boolean;
  onSyncCommits: () => void;
  onInspectCommit: (sha: string) => void;
}

export function GitCommitsView({
  branch,
  commits,
  syncing,
  onSyncCommits,
  onInspectCommit,
}: GitCommitsViewProps) {
  return (
    <div className="border border-[#30363D] bg-[#161B22]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#BDBDBD]">
            Commit History ({commits.length})
          </span>
          <Badge tone="green">{branch}</Badge>
        </div>

        <Button type="button" variant="secondary" disabled={syncing} onClick={onSyncCommits}>
          <RefreshCw
            className={`h-3.5 w-3.5 ${syncing ? 'animate-spin text-[#22C55E]' : ''}`}
            strokeWidth={1.5}
          />
          {syncing ? 'Pulling History...' : 'Pull Commit History'}
        </Button>
      </div>

      <div>
        {commits.length === 0 ? (
          <div className="p-6 text-xs text-[#8A8A8A]">
            No commits cached for this branch. Click Pull Commit History to sync from GitHub.
          </div>
        ) : (
          commits.map((commit, idx) => (
            <div
              key={commit.sha}
              className={`flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 ${
                idx > 0 ? 'border-t border-[#30363D]' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <GitCommitHorizontal
                    className="h-4 w-4 shrink-0 text-[#22C55E]"
                    strokeWidth={1.5}
                  />
                  <span className="truncate text-sm font-medium text-[#E6EDF3]">
                    {commit.message}
                  </span>
                </div>
                <p className="mt-1 pl-6 text-xs text-[#8A8A8A]">
                  <span className="font-mono text-[#BDBDBD]">{commit.authorName}</span> committed{' '}
                  {commit.committedAt} — {commit.filesChanged} files (
                  <span className="font-mono text-[#4ADE80]">+{commit.additions}</span> /{' '}
                  <span className="font-mono text-[#EF4444]">-{commit.deletions}</span>)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="border border-[#3B434B] bg-[#0D1117] px-2.5 py-1 font-mono text-xs text-[#22C55E]">
                  {commit.sha.slice(0, 7)}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onInspectCommit(commit.sha)}
                >
                  <FileDiff className="h-3.5 w-3.5" strokeWidth={1.5} />
                  View Diff
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
