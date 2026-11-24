import { useState } from 'react';
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
  onConnectGitHub?: () => void;
  onResetToken?: () => void;
}

export function GitTokenVerifyBox({
  token,
  verifying,
  autoFetching,
  tokenInfo,
  onChangeToken,
  onVerify,
  onConnectGitHub,
  onResetToken,
}: GitTokenVerifyBoxProps) {
  const [showPatInput, setShowPatInput] = useState(false);
  const busy = verifying || autoFetching;

  if (tokenInfo) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border border-[#1E5631] bg-[#052E16]/40 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <span className="font-mono font-semibold text-[#E6EDF3]">@{tokenInfo.username}</span>
          <span className="text-[#8B949E]">
            {tokenInfo.repositories.length} repositories accessible
          </span>
          {tokenInfo.scopes.map((s) => (
            <Badge key={s} tone="green">
              {s}
            </Badge>
          ))}
        </div>
        {onResetToken && (
          <button
            type="button"
            onClick={onResetToken}
            className="border border-[#30363D] bg-[#0D1117] px-2.5 py-1 text-[11px] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]"
          >
            Switch Account / PAT
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 border border-[#30363D] bg-[#0D1117] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#E6EDF3]">Authorize GitHub Access</p>
          <p className="mt-0.5 text-xs text-[#8A8A8A]">
            Connect your GitHub account or add a Personal Access Token to choose a repository for this workspace.
          </p>
        </div>
        {onConnectGitHub && (
          <Button type="button" variant="primary" disabled={busy} onClick={onConnectGitHub}>
            <Github className="h-4 w-4" strokeWidth={1.5} />
            {autoFetching ? 'Connecting GitHub...' : 'Connect GitHub'}
          </Button>
        )}
      </div>

      <div className="border-t border-[#21262D] pt-3">
        {!showPatInput ? (
          <button
            type="button"
            onClick={() => setShowPatInput(true)}
            className="inline-flex items-center gap-1.5 text-xs text-[#8B949E] transition-colors hover:text-[#4ADE80]"
          >
            <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
            Or add a GitHub Personal Access Token manually
          </button>
        ) : (
          <div className="space-y-2">
            <label htmlFor="git-pat-input" className="block text-xs font-medium text-[#BDBDBD]">
              GitHub Personal Access Token
            </label>
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
                  className="w-full border border-[#30363D] bg-[#161B22] py-2 pl-9 pr-3 font-mono text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
                />
              </div>
              <Button type="button" variant="secondary" disabled={busy || !token.trim()} onClick={onVerify}>
                {verifying ? 'Verifying...' : 'Verify Token'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
