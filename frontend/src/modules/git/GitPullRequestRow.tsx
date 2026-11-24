import { useState } from 'react';
import { Bot, ChevronDown, ChevronRight, ExternalLink, GitMerge, GitPullRequest, Share2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { GitPullRequestDto, MergeGitPullRequest } from '../../types/git.types';
import { formatGitTimestamp } from './gitFormat';
import type { ShareToChatPayload } from './GitShareToChatModal';

type MergeMethod = NonNullable<MergeGitPullRequest['mergeMethod']>;

interface GitPullRequestRowProps {
  pr: GitPullRequestDto;
  bordered: boolean;
  canWrite: boolean;
  merging: boolean;
  onMerge: (pullNumber: number, body: MergeGitPullRequest) => Promise<void>;
  onInspectPr?: (pullNumber: number) => void;
  onShareToChat?: (payload: ShareToChatPayload) => void;
}

export function GitPullRequestRow({
  pr, bordered, canWrite, merging, onMerge, onInspectPr, onShareToChat,
}: GitPullRequestRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [mergeMethod, setMergeMethod] = useState<MergeMethod>('merge');
  const hasDescription = Boolean(pr.description && pr.description.trim().length > 0);

  return (
    <div className={`px-5 py-4 ${bordered ? 'border-t border-[#30363D]' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={`Toggle description for PR #${pr.number}`}
              onClick={() => setExpanded((prev) => !prev)}
              className="border border-transparent p-0.5 text-[#8A8A8A] hover:border-[#30363D] hover:text-[#E6EDF3]"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
            </button>
            <GitPullRequest className="h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
            <span className="truncate text-sm font-semibold text-[#E6EDF3]">{pr.title}</span>
            <span className="font-mono text-xs text-[#8A8A8A]">#{pr.number}</span>
            {pr.htmlUrl && (
              <a
                href={pr.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open PR #${pr.number} on GitHub`}
                className="inline-flex items-center gap-1 border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[11px] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#22C55E]"
              >
                <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                GitHub
              </a>
            )}
          </div>
          <p className="mt-1 pl-6 font-mono text-xs text-[#8A8A8A]">
            {pr.author} wants to merge{' '}
            <span className="text-[#BDBDBD]">{pr.sourceBranch}</span> into{' '}
            <span className="text-[#22C55E]">{pr.targetBranch}</span> —{' '}
            <time dateTime={pr.updatedAt} title={pr.updatedAt}>
              {formatGitTimestamp(pr.updatedAt)}
            </time>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={pr.status === 'open' ? 'green' : pr.status === 'closed' ? 'danger' : 'neutral'}
            withDot
          >
            {pr.status}
          </Badge>
          {onInspectPr && (
            <Button type="button" variant="secondary" onClick={() => onInspectPr(pr.number)}>
              <Bot className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
              Diff &amp; AI Review
            </Button>
          )}
          {onShareToChat && (
            <button
              type="button"
              aria-label={`Share PR #${pr.number} to chat`}
              onClick={() => onShareToChat({
                title: `PR #${pr.number}`,
                body: `[Git PR #${pr.number}] ${pr.title}\nBranch: ${pr.sourceBranch} -> ${pr.targetBranch} (${pr.status}) by ${pr.author}${pr.htmlUrl ? `\n${pr.htmlUrl}` : ''}`,
              })}
              className="flex h-8 w-8 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#8A8A8A] hover:border-[#22C55E] hover:text-[#E6EDF3]"
            >
              <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
          {canWrite && pr.status === 'open' && (
            <>
              <select
                aria-label={`Merge method for PR #${pr.number}`}
                value={mergeMethod}
                disabled={merging}
                onChange={(e) => setMergeMethod(e.target.value as MergeMethod)}
                className="h-8 border border-[#30363D] bg-[#0D1117] px-2 font-mono text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
              >
                <option value="merge">Merge commit</option>
                <option value="squash">Squash and merge</option>
                <option value="rebase">Rebase and merge</option>
              </select>
              <Button
                type="button"
                variant="secondary"
                disabled={merging}
                onClick={() => void onMerge(pr.number, { mergeMethod })}
              >
                <GitMerge className="h-3.5 w-3.5" strokeWidth={1.5} />
                {merging ? 'Merging...' : 'Merge PR'}
              </Button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 ml-6 border border-[#30363D] bg-[#0D1117] px-4 py-3 text-xs leading-relaxed text-[#BDBDBD]">
          {hasDescription ? (
            <p className="whitespace-pre-wrap">{pr.description}</p>
          ) : (
            <p className="text-[#8A8A8A]">No description provided.</p>
          )}
        </div>
      )}
    </div>
  );
}
