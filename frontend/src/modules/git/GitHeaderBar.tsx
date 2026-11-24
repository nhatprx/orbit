import { useState } from 'react';
import { Check, ChevronDown, Copy, ExternalLink, GitBranch, RefreshCw, Settings } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { GitBranchDto, GitRepositoryDto } from '../../types/git.types';
import { formatGitTimestamp } from './gitFormat';

interface GitHeaderBarProps {
  repo: GitRepositoryDto;
  scopeLabel?: string;
  branches: GitBranchDto[];
  activeBranch: string;
  syncingCommits: boolean;
  onOpenBranches: () => void;
  onPullCommits: () => void;
  onOpenSettings: () => void;
}

const BTN =
  'inline-flex h-7 items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2.5 text-xs font-medium text-[#BDBDBD] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3] disabled:opacity-50';

export function GitHeaderBar({
  repo,
  branches,
  activeBranch,
  syncingCommits,
  onOpenBranches,
  onPullCommits,
  onOpenSettings,
}: GitHeaderBarProps) {
  const [copiedClone, setCopiedClone] = useState(false);

  async function handleCopyClone() {
    await navigator.clipboard.writeText(repo.cloneUrl);
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 1500);
  }

  const branchLabel = activeBranch || repo.defaultBranch || 'main';

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

        <button
          type="button"
          aria-label="Branches"
          onClick={onOpenBranches}
          className="inline-flex h-7 items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2.5 font-mono text-xs text-[#E6EDF3] transition-colors hover:border-[#22C55E]"
        >
          <GitBranch className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          <span className="max-w-[140px] truncate">{branchLabel}</span>
          <span className="text-[10px] text-[#8A8A8A]">({branches.length || 1})</span>
          <ChevronDown className="h-3.5 w-3.5 text-[#8A8A8A]" strokeWidth={1.5} />
        </button>

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

        <button type="button" onClick={onOpenSettings} className={BTN}>
          <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Settings</span>
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
