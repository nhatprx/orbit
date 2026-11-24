import { useState } from 'react';
import { Check, Copy, ExternalLink, GitBranch, KeyRound, RefreshCw } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { GitBranchDto, GitRepositoryDto } from '../../types/git.types';
import { formatGitTimestamp } from './gitFormat';

interface GitHeaderBarProps {
  repo: GitRepositoryDto;
  scopeLabel?: string;
  branches: GitBranchDto[];
  activeBranch: string;
  syncingCommits: boolean;
  onSelectBranch: (branch: string) => void;
  onOpenBranches: () => void;
  onPullCommits: () => void;
  onOpenAccess: () => void;
}

const BTN = 'inline-flex h-7 items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2.5 text-xs font-medium text-[#BDBDBD] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3] disabled:opacity-50';

export function GitHeaderBar({
  repo,
  branches,
  activeBranch,
  syncingCommits,
  onSelectBranch,
  onOpenBranches,
  onPullCommits,
  onOpenAccess,
}: GitHeaderBarProps) {
  const [copiedClone, setCopiedClone] = useState(false);

  async function handleCopyClone() {
    await navigator.clipboard.writeText(repo.cloneUrl);
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 1500);
  }

  const branchNames =
    branches.length > 0 ? branches.map((b) => b.name) : [activeBranch || repo.defaultBranch];

  return (
    <header className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#30363D] bg-[#161B22] px-4 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <a
          href={repo.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-[#E6EDF3] hover:text-[#4ADE80]"
        >
          <span className="truncate">{repo.slug}</span>
          <ExternalLink className="h-3 w-3 shrink-0 text-[#8A8A8A]" strokeWidth={1.5} />
        </a>
        <Badge tone="neutral">{repo.visibility.toLowerCase()}</Badge>

        <div className="ml-1 flex h-7 items-center border border-[#30363D] bg-[#0D1117] px-2">
          <GitBranch className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          <select
            aria-label="Active branch"
            value={activeBranch}
            onChange={(e) => onSelectBranch(e.target.value)}
            className="h-full bg-transparent px-1.5 font-mono text-xs text-[#E6EDF3] focus:outline-none"
          >
            {branchNames.map((name) => (
              <option key={name} value={name} className="bg-[#161B22]">
                {name}
              </option>
            ))}
          </select>
        </div>

        {repo.lastSyncedAt && (
          <span className="hidden font-mono text-[11px] text-[#8A8A8A] xl:inline">
            Synced{' '}
            <time dateTime={repo.lastSyncedAt} title={repo.lastSyncedAt}>
              {formatGitTimestamp(repo.lastSyncedAt)}
            </time>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={onOpenBranches} className={BTN}>
          <GitBranch className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Branches</span>
        </button>

        <button
          type="button"
          disabled={syncingCommits}
          onClick={onPullCommits}
          className={BTN}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${syncingCommits ? 'animate-spin text-[#22C55E]' : ''}`}
            strokeWidth={1.5}
          />
          <span>{syncingCommits ? 'Pulling...' : 'Pull Commits'}</span>
        </button>

        <button type="button" onClick={onOpenAccess} className={BTN}>
          <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>GitHub Access</span>
        </button>

        <button
          type="button"
          onClick={() => void handleCopyClone()}
          className="inline-flex h-7 items-center gap-1.5 border border-[#22C55E] bg-[#052E16] px-2.5 text-xs font-medium text-[#4ADE80] transition-colors hover:bg-[#22C55E] hover:text-[#0D1117]"
        >
          {copiedClone ? (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Copied URL</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Copy Clone URL</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
