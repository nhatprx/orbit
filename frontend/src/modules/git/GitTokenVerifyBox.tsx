import { CheckCircle2, Github, KeyRound } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { InspectGitTokenResponse } from '../../types/git.types';

interface GitTokenVerifyBoxProps {
  token: string;
  verifying: boolean;
  autoFetching: boolean;
  tokenInfo: InspectGitTokenResponse | null;
  onChangeToken: (value: string) => void;
  onVerify: () => void;
  onAutoFetch?: () => void;
}

export function GitTokenVerifyBox({
  token,
  verifying,
  autoFetching,
  tokenInfo,
  onChangeToken,
  onVerify,
  onAutoFetch,
}: GitTokenVerifyBoxProps) {
  const busy = verifying || autoFetching;

  return (
    <div className="space-y-2 border border-[#30363D] bg-[#0D1117] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="git-pat-input" className="block text-xs font-medium text-[#BDBDBD]">
          GitHub Personal Access Token
        </label>
        {onAutoFetch && (
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            onClick={onAutoFetch}
          >
            <Github className="h-3.5 w-3.5" strokeWidth={1.5} />
            {autoFetching ? 'Authorizing GitHub...' : 'Auto-Fetch from GitHub'}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1">
          <KeyRound
            className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8A8A8A]"
            strokeWidth={1.5}
          />
          <input
            id="git-pat-input"
            type="password"
            value={token}
            onChange={(e) => onChangeToken(e.target.value)}
            placeholder="ghp_... or github_pat_..."
            className="w-full border border-[#30363D] bg-[#0D1117] py-2 pl-9 pr-3 font-mono text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !token.trim()}
          onClick={onVerify}
        >
          {verifying ? 'Verifying...' : 'Verify GitHub Access'}
        </Button>
      </div>

      {tokenInfo && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#30363D] pt-3 text-xs">
          <CheckCircle2 className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <span className="font-mono text-[#E6EDF3]">@{tokenInfo.username}</span>
          <span className="text-[#8A8A8A]">
            {tokenInfo.repositories.length} repositories accessible
          </span>
          {tokenInfo.scopes.map((s) => (
            <Badge key={s} tone="green">
              {s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
