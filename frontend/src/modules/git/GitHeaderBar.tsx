import { useState } from 'react';
import {
  Check,
  Copy,
  GitBranch,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { GitBranchDto, GitRepositoryDto } from '../../types/git.types';

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

export function GitHeaderBar({
  repo,
  scopeLabel,
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
    <div className="flex flex-wrap items-center justify-between gap-3 border border-[#30363D] bg-[#161B22] p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="font-mono text-base font-semibold text-[#E6EDF3]">{repo.slug}</h1>
        <Badge tone="neutral">{repo.visibility.toLowerCase()}</Badge>
        <Badge tone="green">{repo.tokenHint}</Badge>
        {scopeLabel && (
          <span className="font-mono text-xs text-[#8A8A8A]">{scopeLabel}</span>
        )}
        <span className="font-mono text-[11px] text-[#8A8A8A]">
          {repo.lastSyncedAt ? `Synced ${repo.lastSyncedAt}` : 'Not synced yet'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center border border-[#30363D] bg-[#0D1117] px-2">
          <GitBranch className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          <select
            aria-label="Active branch"
            value={activeBranch}
            onChange={(e) => onSelectBranch(e.target.value)}
            className="h-7 bg-transparent px-1.5 font-mono text-xs text-[#E6EDF3] focus:outline-none"
          >
            {branchNames.map((name) => (
              <option key={name} value={name} className="bg-[#161B22]">
                {name}
              </option>
            ))}
          </select>
        </div>

        <Button type="button" variant="secondary" onClick={onOpenBranches}>
          <GitBranch className="h-3.5 w-3.5" strokeWidth={1.5} />
          Branches
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={syncingCommits}
          onClick={onPullCommits}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${syncingCommits ? 'animate-spin text-[#22C55E]' : ''}`}
            strokeWidth={1.5}
          />
          {syncingCommits ? 'Pulling...' : 'Pull Commits'}
        </Button>

        <Button type="button" variant="secondary" onClick={onOpenAccess}>
          <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
          GitHub Access
        </Button>

        <Button type="button" variant="primary" onClick={() => void handleCopyClone()}>
          {copiedClone ? (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
              Copied URL
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
              Copy Clone URL
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
