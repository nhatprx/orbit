import { useState } from 'react';
import { ExternalLink, Github, KeyRound, Unplug, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { GitRepositoryDto } from '../../types/git.types';

interface GitAccessModalProps {
  repo: GitRepositoryDto;
  canManage: boolean;
  onClose: () => void;
  onAutoFetchToken?: () => Promise<string>;
  onUpdateToken: (accessToken: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function GitAccessModal({
  repo, canManage, onClose, onAutoFetchToken, onUpdateToken, onDisconnect,
}: GitAccessModalProps) {
  const [newToken, setNewToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoFetching, setAutoFetching] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function applyToken(rawToken: string) {
    setSaving(true);
    setLocalError(null);
    try {
      await onUpdateToken(rawToken);
      setNewToken('');
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to update token');
    } finally {
      setSaving(false);
    }
  }

  async function handleRotate(e: React.FormEvent) {
    e.preventDefault();
    if (!newToken.trim()) return;
    await applyToken(newToken.trim());
  }

  async function handleAutoFetchAndSet() {
    if (!onAutoFetchToken) return;
    setAutoFetching(true);
    setLocalError(null);
    try {
      const fetched = (await onAutoFetchToken()).trim();
      setNewToken(fetched);
      await applyToken(fetched);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to auto-fetch GitHub token');
    } finally {
      setAutoFetching(false);
    }
  }

  async function handleDisconnect() {
    setSaving(true);
    setLocalError(null);
    try {
      await onDisconnect();
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to disconnect repository');
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || autoFetching;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg border border-[#30363D] bg-[#161B22]">
        <div className="flex items-center justify-between border-b border-[#30363D] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-[#E6EDF3]">GitHub Access & Connection</h2>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="border border-transparent p-1 text-[#8A8A8A] hover:border-[#30363D] hover:text-[#E6EDF3]"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {localError && (
            <div className="border border-[#EF4444] bg-[#0D1117] px-3 py-2 text-xs text-[#EF4444]">
              {localError}
            </div>
          )}

          <div className="space-y-2 border border-[#30363D] bg-[#0D1117] p-4 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#8A8A8A]">Repository</span>
              <span className="font-mono font-semibold text-[#E6EDF3]">{repo.slug}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#8A8A8A]">Token Hint</span>
              <Badge tone="green">{repo.tokenHint}</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#8A8A8A]">GitHub URL</span>
              <a
                href={repo.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[#22C55E] hover:underline"
              >
                {repo.htmlUrl}
                <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {canManage ? (
            <>
              <form onSubmit={(e) => void handleRotate(e)} className="space-y-2">
                <label htmlFor="rotate-pat-input" className="block text-xs text-[#BDBDBD]">
                  Rotate GitHub Personal Access Token
                </label>
                <input
                  id="rotate-pat-input"
                  type="password"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="Enter new ghp_... or github_pat_..."
                  className="w-full border border-[#30363D] bg-[#0D1117] px-3 py-2 font-mono text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" variant="primary" disabled={busy || !newToken.trim()}>
                    {saving ? 'Updating...' : 'Update Token'}
                  </Button>
                  {onAutoFetchToken && (
                    <Button type="button" variant="secondary" disabled={busy} onClick={() => void handleAutoFetchAndSet()}>
                      <Github className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {autoFetching ? 'Authorizing GitHub...' : 'Auto-Fetch & Set from GitHub'}
                    </Button>
                  )}
                </div>
              </form>

              <div className="border-t border-[#30363D] pt-4">
                {!confirmDisconnect ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDisconnect(true)}
                    className="inline-flex items-center gap-1.5 border border-[#EF4444] bg-[#0D1117] px-3 py-1.5 text-xs font-medium text-[#EF4444] hover:bg-[#21262D]"
                  >
                    <Unplug className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Disconnect Repository
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 border border-[#EF4444] bg-[#0D1117] p-3">
                    <span className="text-xs text-[#E6EDF3]">Disconnect {repo.slug} from Orbit?</span>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => setConfirmDisconnect(false)}>Cancel</Button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDisconnect()}
                        className="border border-[#EF4444] bg-[#EF4444] px-3 py-1.5 text-xs font-medium text-[#0D1117] disabled:opacity-50"
                      >
                        Confirm Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-[#8A8A8A]">
              Only managers can rotate the GitHub token or disconnect this repository.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
