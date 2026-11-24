import { useState } from 'react';
import { AlertTriangle, ExternalLink, Github, RefreshCw, Settings, Unplug, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { ConnectGitRepoRequest, GitRepositoryDto, InspectGitTokenResponse } from '../../types/git.types';
import { formatGitTimestamp } from './gitFormat';

interface GitAccessModalProps {
  repo: GitRepositoryDto;
  canManage: boolean;
  onClose: () => void;
  onAutoFetchToken?: () => Promise<string>;
  onInspectToken: (accessToken: string) => Promise<InspectGitTokenResponse>;
  onUpdateToken: (accessToken: string) => Promise<void>;
  onSwitchRepo: (req: ConnectGitRepoRequest) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function GitAccessModal({
  repo, canManage, onClose, onAutoFetchToken, onInspectToken, onUpdateToken, onSwitchRepo, onDisconnect,
}: GitAccessModalProps) {
  const [fetchedToken, setFetchedToken] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<InspectGitTokenResponse | null>(null);
  const [selectedSlug, setSelectedSlug] = useState(repo.slug);
  const [saving, setSaving] = useState(false);
  const [autoFetching, setAutoFetching] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedRemote = tokenInfo?.repositories.find((r) => r.fullName === selectedSlug) ?? null;
  const isSwitchingRepo = Boolean(selectedRemote && selectedRemote.fullName.toLowerCase() !== repo.slug.toLowerCase());
  const busy = saving || autoFetching;
  const ownerUrl = `https://github.com/${encodeURIComponent(repo.repoOwner)}`;

  async function handleLoginGitHub() {
    if (!onAutoFetchToken) return;
    setAutoFetching(true); setLocalError(null);
    try {
      const token = (await onAutoFetchToken()).trim();
      const info = await onInspectToken(token);
      setFetchedToken(token); setTokenInfo(info); setSelectedSlug(repo.slug);
    } catch (err) { setLocalError(err instanceof Error ? err.message : 'Failed to authorize with GitHub'); }
    finally { setAutoFetching(false); }
  }

  async function handleRefreshToken() {
    if (!fetchedToken) return;
    setSaving(true); setLocalError(null);
    try { await onUpdateToken(fetchedToken); onClose(); }
    catch (err) { setLocalError(err instanceof Error ? err.message : 'Failed to refresh GitHub authorization'); }
    finally { setSaving(false); }
  }

  async function handleConfirmSwitch() {
    if (!fetchedToken || !selectedRemote) return;
    setSaving(true); setLocalError(null);
    try {
      await onSwitchRepo({
        accessToken: fetchedToken, repoOwner: selectedRemote.owner,
        repoName: selectedRemote.name, defaultBranch: selectedRemote.defaultBranch || 'main',
      });
      onClose();
    } catch (err) { setLocalError(err instanceof Error ? err.message : 'Failed to switch repository'); }
    finally { setSaving(false); }
  }

  async function handleDisconnect() {
    setSaving(true); setLocalError(null);
    try { await onDisconnect(); onClose(); }
    catch (err) { setLocalError(err instanceof Error ? err.message : 'Failed to disconnect repository'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl border border-[#30363D] bg-[#161B22]">
        <div className="flex items-center justify-between border-b border-[#30363D] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-[#E6EDF3]">Repository Settings</h2>
          </div>
          <button type="button" aria-label="Close modal" onClick={onClose} className="border border-transparent p-1 text-[#8A8A8A] hover:border-[#30363D] hover:text-[#E6EDF3]">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {localError && <div className="border border-[#EF4444] bg-[#0D1117] px-3 py-2 text-xs text-[#EF4444]">{localError}</div>}

          <div className="space-y-2.5 border border-[#30363D] bg-[#0D1117] p-4 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#8A8A8A]">Repository Owner</span>
              <a href={ownerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#E6EDF3] hover:text-[#4ADE80]">
                <img src={`https://github.com/${encodeURIComponent(repo.repoOwner)}.png?size=32`} alt={repo.repoOwner} className="h-4 w-4 border border-[#30363D] object-cover" />
                <span>@{repo.repoOwner}</span>
                <ExternalLink className="h-3 w-3 text-[#8A8A8A]" strokeWidth={1.5} />
              </a>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#8A8A8A]">Repository</span>
              <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono font-semibold text-[#4ADE80] hover:underline">
                {repo.slug}<ExternalLink className="h-3 w-3" strokeWidth={1.5} />
              </a>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#8A8A8A]">Default Branch / Visibility</span>
              <div className="flex items-center gap-1.5">
                <Badge tone="green">{repo.defaultBranch}</Badge>
                <Badge tone="neutral">{repo.visibility.toLowerCase()}</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#8A8A8A]">Connected / Synced</span>
              <span className="font-mono text-[11px] text-[#BDBDBD]">{formatGitTimestamp(repo.createdAt)} · {formatGitTimestamp(repo.lastSyncedAt, 'Not synced')}</span>
            </div>
          </div>

          {canManage ? (
            <>
              <div className="space-y-3 border border-[#30363D] bg-[#0D1117] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-[#E6EDF3]">GitHub OAuth & Switch Repository</p>
                    <p className="mt-0.5 text-[11px] text-[#8A8A8A]">
                      {tokenInfo ? `Signed in as @${tokenInfo.username} (${tokenInfo.repositories.length} repos available).` : 'Login with GitHub to refresh authorization or switch to another repository.'}
                    </p>
                  </div>
                  {onAutoFetchToken && (
                    <Button type="button" variant={tokenInfo ? 'secondary' : 'primary'} disabled={busy} onClick={() => void handleLoginGitHub()}>
                      <Github className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {autoFetching ? 'Authorizing GitHub...' : tokenInfo ? 'Re-login GitHub' : 'Login with GitHub'}
                    </Button>
                  )}
                </div>

                {tokenInfo && (
                  <div className="space-y-3 border-t border-[#21262D] pt-3">
                    <div className="space-y-1">
                      <label htmlFor="switch-repo-select" className="block text-[11px] font-medium text-[#BDBDBD]">Target Repository</label>
                      <select id="switch-repo-select" value={selectedSlug} onChange={(e) => setSelectedSlug(e.target.value)} className="w-full border border-[#30363D] bg-[#161B22] px-2.5 py-1.5 font-mono text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none">
                        {!tokenInfo.repositories.some((r) => r.fullName === repo.slug) && <option value={repo.slug}>{repo.slug} (current)</option>}
                        {tokenInfo.repositories.map((r) => (
                          <option key={r.fullName} value={r.fullName}>{r.fullName}{r.fullName.toLowerCase() === repo.slug.toLowerCase() ? ' (current)' : ''} — {r.privateRepo ? 'private' : 'public'}</option>
                        ))}
                      </select>
                    </div>

                    {isSwitchingRepo && selectedRemote ? (
                      <div className="space-y-2.5 border border-[#EAB308] bg-[#422006]/30 p-3 text-xs">
                        <div className="flex items-start gap-2 text-[#FACC15]">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                          <div>
                            <p className="font-semibold">Warning: Switching Repository</p>
                            <p className="mt-0.5 text-[11px] text-[#E6EDF3]">
                              Switching from <span className="font-mono text-[#FACC15]">{repo.slug}</span> to <span className="font-mono text-[#4ADE80]">{selectedRemote.fullName}</span> (owner <span className="font-mono">@{selectedRemote.owner}</span>) will replace the linked repository for all members, clear cached commit history, branches, and code views, and reset sync state.
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="secondary" onClick={() => setSelectedSlug(repo.slug)}>Cancel</Button>
                          <Button type="button" variant="primary" disabled={busy} onClick={() => void handleConfirmSwitch()}>{saving ? 'Switching...' : 'Confirm Switch Repository'}</Button>
                        </div>
                      </div>
                    ) : (
                      <Button type="button" variant="primary" disabled={busy} onClick={() => void handleRefreshToken()}>
                        <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />{saving ? 'Updating...' : 'Refresh Repository Authorization'}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-[#30363D] pt-3">
                {!confirmDisconnect ? (
                  <button type="button" onClick={() => setConfirmDisconnect(true)} className="inline-flex items-center gap-1.5 border border-[#EF4444] bg-[#0D1117] px-3 py-1.5 text-xs font-medium text-[#EF4444] hover:bg-[#21262D]">
                    <Unplug className="h-3.5 w-3.5" strokeWidth={1.5} />Disconnect Repository
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 border border-[#EF4444] bg-[#0D1117] p-3">
                    <span className="text-xs text-[#E6EDF3]">Disconnect {repo.slug} from Orbit?</span>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => setConfirmDisconnect(false)}>Cancel</Button>
                      <button type="button" disabled={busy} onClick={() => void handleDisconnect()} className="border border-[#EF4444] bg-[#EF4444] px-3 py-1.5 text-xs font-medium text-[#0D1117] disabled:opacity-50">Confirm Disconnect</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-[#8A8A8A]">Only managers can switch repositories, refresh GitHub authorization, or disconnect this repository.</p>
          )}
        </div>
      </div>
    </div>
  );
}
