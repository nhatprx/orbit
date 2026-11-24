import { Check, Github } from 'lucide-react';
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

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center border font-mono text-[11px] font-semibold ${
            tokenInfo
              ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
              : 'border-[#22C55E] bg-[#161B22] text-[#E6EDF3]'
          }`}
        >
          {tokenInfo ? <Check className="h-3 w-3" strokeWidth={2} /> : '1'}
        </span>

        {tokenInfo ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-[#E6EDF3]">GitHub Auth</span>
            <span className="text-[#30363D]">·</span>
            <img
              src={`https://github.com/${encodeURIComponent(tokenInfo.username)}.png?size=32`}
              alt={tokenInfo.username}
              className="h-4 w-4 border border-[#30363D] object-cover"
            />
            <span className="font-mono font-semibold text-[#E6EDF3]">@{tokenInfo.username}</span>
            <span className="font-mono text-[11px] text-[#4ADE80]">
              Token synced ({tokenInfo.repositories.length} repos)
            </span>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#E6EDF3]">GitHub Auth</p>
            <p className="mt-0.5 text-[11px] text-[#8A8A8A]">
              Login with GitHub to automatically generate and attach your access token.
            </p>
          </div>
        )}
      </div>

      {tokenInfo ? (
        onResetToken && (
          <button
            type="button"
            onClick={onResetToken}
            className="font-mono text-[11px] text-[#8B949E] transition-colors hover:text-[#E6EDF3]"
          >
            Switch account
          </button>
        )
      ) : (
        onConnectGitHub && (
          <Button type="button" variant="primary" disabled={busy} onClick={onConnectGitHub}>
            <Github className="h-3.5 w-3.5" strokeWidth={1.5} />
            {autoFetching ? 'Connecting GitHub...' : 'Connect GitHub'}
          </Button>
        )
      )}
    </div>
  );
}
