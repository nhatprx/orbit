import { useState } from 'react';
import { ChevronDown, ChevronRight, FolderGit2, Plus, ShieldAlert } from 'lucide-react';
import type {
  ConnectGitRepoRequest,
  CreateGitRepoRequest,
  InspectGitTokenResponse,
} from '../../types/git.types';
import { GitConnectFormFields } from './GitConnectFormFields';
import { GitTokenVerifyBox } from './GitTokenVerifyBox';
import { setCachedGitOAuthSession } from './gitWorkspaceCache';

interface GitConnectPanelProps {
  scopeLabel?: string;
  canManage: boolean;
  onAutoFetchToken?: () => Promise<string>;
  onInspectToken: (accessToken: string) => Promise<InspectGitTokenResponse>;
  onConnectRepo: (req: ConnectGitRepoRequest) => Promise<unknown>;
  onCreateRepo: (req: CreateGitRepoRequest) => Promise<unknown>;
}

const TAB_ACTIVE = 'border-b-2 border-b-[#22C55E] text-[#E6EDF3]';
const TAB_IDLE = 'border-b-2 border-b-transparent text-[#8B949E] hover:text-[#E6EDF3]';

export function GitConnectPanel({
  scopeLabel, canManage, onAutoFetchToken, onInspectToken, onConnectRepo, onCreateRepo,
}: GitConnectPanelProps) {
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [autoFetching, setAutoFetching] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<InspectGitTokenResponse | null>(null);
  const [mode, setMode] = useState<'connect' | 'create'>('connect');
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [privateRepo, setPrivateRepo] = useState(true);
  const [autoInit, setAutoInit] = useState(true);
  const [gitignoreTemplate, setGitignoreTemplate] = useState('');
  const [licenseTemplate, setLicenseTemplate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!canManage) {
    return (
      <div className="flex items-start gap-3 border border-[#30363D] bg-[#161B22] p-6">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#8A8A8A]" strokeWidth={1.5} />
        <div>
          <h2 className="text-sm font-semibold text-[#E6EDF3]">No GitHub Repository Connected</h2>
          <p className="mt-1 text-xs text-[#8A8A8A]">
            You have read-only access for {scopeLabel ?? 'this scope'}. Ask a workspace or project manager to connect a GitHub repository.
          </p>
        </div>
      </div>
    );
  }

  async function verifyRawToken(rawToken: string) {
    setVerifying(true); setLocalError(null);
    try {
      const info = await onInspectToken(rawToken);
      setTokenInfo(info); setCachedGitOAuthSession({ token: rawToken, info });
      const first = info.repositories[0];
      if (first && !repoOwner && !repoName) {
        setRepoOwner(first.owner); setRepoName(first.name); setDefaultBranch(first.defaultBranch || 'main');
      }
    } catch (err) {
      setTokenInfo(null); setLocalError(err instanceof Error ? err.message : 'Failed to verify GitHub token');
    } finally { setVerifying(false); }
  }

  async function handleAutoFetch() {
    if (!onAutoFetchToken) return;
    setAutoFetching(true); setLocalError(null);
    try {
      const fetched = (await onAutoFetchToken()).trim();
      setToken(fetched); await verifyRawToken(fetched);
    } catch (err) { setLocalError(err instanceof Error ? err.message : 'Failed to auto-fetch GitHub token'); }
    finally { setAutoFetching(false); }
  }

  function handleSelectRemote(fullName: string) {
    const found = tokenInfo?.repositories.find((r) => r.fullName === fullName);
    if (!found) return;
    setRepoOwner(found.owner); setRepoName(found.name); setDefaultBranch(found.defaultBranch || 'main');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setSubmitting(true); setLocalError(null);
    try {
      if (mode === 'connect') {
        await onConnectRepo({ accessToken: token.trim(), repoOwner: repoOwner.trim(), repoName: repoName.trim(), defaultBranch: defaultBranch.trim() || undefined });
      } else {
        await onCreateRepo({
          accessToken: token.trim(), repoName: repoName.trim(), privateRepo, autoInit,
          gitignoreTemplate: gitignoreTemplate || undefined,
          licenseTemplate: licenseTemplate || undefined,
        });
      }
    } catch (err) { setLocalError(err instanceof Error ? err.message : 'Failed to connect repository'); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-4 border border-[#30363D] bg-[#161B22] p-6">
      <div className="flex items-center gap-2.5">
        <FolderGit2 className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
        <div>
          <h2 className="text-sm font-semibold text-[#E6EDF3]">Connect GitHub Repository {scopeLabel ? `— ${scopeLabel}` : ''}</h2>
          <p className="text-xs text-[#8A8A8A]">Authenticate with GitHub once, then select or create a repository to link.</p>
        </div>
      </div>

      {localError && <div className="border border-[#EF4444] bg-[#0D1117] px-3 py-2 text-xs text-[#EF4444]">{localError}</div>}

      <div className="divide-y divide-[#21262D] border border-[#30363D] bg-[#0D1117]">
        <GitTokenVerifyBox
          verifying={verifying} autoFetching={autoFetching} tokenInfo={tokenInfo}
          onConnectGitHub={onAutoFetchToken ? () => void handleAutoFetch() : undefined}
          onResetToken={() => { setToken(''); setTokenInfo(null); setRepoOwner(''); setRepoName(''); }}
        />

        <div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center border font-mono text-[11px] font-semibold ${tokenInfo ? 'border-[#22C55E] bg-[#161B22] text-[#E6EDF3]' : 'border-[#30363D] bg-[#161B22] text-[#6E7681]'}`}>2</span>
              <div>
                <p className={`text-xs font-semibold ${tokenInfo ? 'text-[#E6EDF3]' : 'text-[#6E7681]'}`}>Select Repo</p>
                {!tokenInfo && <p className="mt-0.5 text-[11px] text-[#6E7681]">Complete GitHub Auth above to expand and choose a repository.</p>}
              </div>
            </div>
            {tokenInfo ? <ChevronDown className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} /> : <ChevronRight className="h-4 w-4 text-[#6E7681]" strokeWidth={1.5} />}
          </div>

          {tokenInfo && (
            <div className="space-y-4 border-t border-[#21262D] bg-[#161B22]/50 px-4 py-4">
              <div className="flex items-center gap-4 border-b border-[#21262D]">
                <button type="button" onClick={() => setMode('connect')} className={`pb-2 text-xs font-medium transition-colors ${mode === 'connect' ? TAB_ACTIVE : TAB_IDLE}`}>Connect Existing Repository</button>
                <button type="button" onClick={() => setMode('create')} className={`inline-flex items-center gap-1 pb-2 text-xs font-medium transition-colors ${mode === 'create' ? TAB_ACTIVE : TAB_IDLE}`}>
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />Create New GitHub Repository
                </button>
              </div>

              <GitConnectFormFields
                mode={mode} repositories={tokenInfo.repositories} repoOwner={repoOwner} repoName={repoName}
                defaultBranch={defaultBranch} privateRepo={privateRepo} autoInit={autoInit}
                gitignoreTemplate={gitignoreTemplate} licenseTemplate={licenseTemplate}
                canSubmit={Boolean(token.trim() && repoName.trim())} submitting={submitting}
                onSelectRemote={handleSelectRemote} onChangeName={setRepoName}
                onChangePrivate={setPrivateRepo} onChangeAutoInit={setAutoInit}
                onChangeGitignore={setGitignoreTemplate} onChangeLicense={setLicenseTemplate}
                onSubmit={(e) => void handleSubmit(e)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
