import { GitCommitHorizontal } from 'lucide-react';
import type { GitCommit } from '../../types/git.types';

interface GitCommitsViewProps {
  commits: GitCommit[];
}

export function GitCommitsView({ commits }: GitCommitsViewProps) {
  return (
    <div className="border border-[#30363D] bg-[#161B22]">
      <div className="border-b border-[#30363D] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#BDBDBD]">
        Commit History ({commits.length})
      </div>
      <div>
        {commits.map((commit, idx) => (
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
                <span className="font-mono text-[#BDBDBD]">{commit.author}</span>{' '}
                committed {commit.timestamp} — {commit.filesChanged} files changed
              </p>
            </div>
            <span className="border border-[#3B434B] bg-[#0D1117] px-2.5 py-1 font-mono text-xs text-[#22C55E]">
              {commit.sha}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
