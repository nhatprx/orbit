import { CheckCircle2, Github } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { InspectGitTokenResponse } from '../../types/git.types';

interface GitTokenVerifyBoxProps {
  verifying: boolean;
  autoFetching: boolean;
  tokenInfo: InspectGitTokenResponse | null;
  onConnectGitHub?: () => void;
  onResetToken?: () => void;
}

export function GitTokenVerifyBox({
  verifying,
  autoFetching,
  tokenInfo,
  onConnectGitHub,
  onResetToken,
}: GitTokenVerifyBoxProps) {
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
            Switch GitHub Account
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-[#30363D] bg-[#0D1117] p-5">
      <div>
        <p className="text-sm font-semibold text-[#E6EDF3]">Login with GitHub</p>
        <p className="mt-0.5 text-xs text-[#8A8A8A]">
          Authorize your GitHub account via OAuth to automatically fetch and link your repositories.
        </p>
      </div>
      {onConnectGitHub && (
        <Button type="button" variant="primary" disabled={busy} onClick={onConnectGitHub}>
          <Github className="h-4 w-4" strokeWidth={1.5} />
          {autoFetching ? 'Connecting GitHub...' : 'Connect GitHub'}
        </Button>
      )}
    </div>
  );
}
