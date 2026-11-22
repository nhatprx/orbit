import { useState } from 'react';
import { FolderGit2, Plus, ShieldAlert } from 'lucide-react';
import type {
  ConnectGitRepoRequest,
  CreateGitRepoRequest,
  InspectGitTokenResponse,
} from '../../types/git.types';
import { GitConnectFormFields } from './GitConnectFormFields';
import { GitTokenVerifyBox } from './GitTokenVerifyBox';

interface GitConnectPanelProps {
  scopeLabel?: string;
  canManage: boolean;
  onAutoFetchToken?: () => Promise<string>;
  onInspectToken: (accessToken: string) => Promise<InspectGitTokenResponse>;
  onConnectRepo: (req: ConnectGitRepoRequest) => Promise<unknown>;
  onCreateRepo: (req: CreateGitRepoRequest) => Promise<unknown>;
}

const TAB_ACTIVE = 'border-[#22C55E] bg-[#052E16] text-[#22C55E]';
const TAB_IDLE = 'border-[#30363D] bg-[#0D1117] text-[#BDBDBD] hover:text-[#E6EDF3]';

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
  const [description, setDescription] = useState('');
  const [privateRepo, setPrivateRepo] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!canManage) {
    return (
      <div className="border border-[#30363D] bg-[#161B22] p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#8A8A8A]" strokeWidth={1.5} />
          <div>
            <h2 className="text-sm font-semibold text-[#E6EDF3]">No GitHub Repository Connected</h2>
            <p className="mt-1 text-xs text-[#8A8A8A]">
              You have read-only access for {scopeLabel ?? 'this scope'}. Ask a workspace or
              project manager to connect a GitHub repository.
            </p>
          </div>
        </div>
      </div>
    );
  }

  async function verifyRawToken(rawToken: string) {
    setVerifying(true);
    setLocalError(null);
    try {
      const info = await onInspectToken(rawToken);
      setTokenInfo(info);
      const first = info.repositories[0];
      if (first && !repoOwner && !repoName) {
        setRepoOwner(first.owner);
        setRepoName(first.name);
        setDefaultBranch(first.defaultBranch || 'main');
      }
    } catch (err) {
      setTokenInfo(null);
      setLocalError(err instanceof Error ? err.message : 'Failed to verify GitHub token');
    } finally {
      setVerifying(false);
    }
  }

  async function handleAutoFetch() {
    if (!onAutoFetchToken) return;
    setAutoFetching(true);
    setLocalError(null);
    try {
      const fetched = (await onAutoFetchToken()).trim();
      setToken(fetched);
      await verifyRawToken(fetched);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to auto-fetch GitHub token');
    } finally {
      setAutoFetching(false);
    }
  }

  function handleSelectRemote(fullName: string) {
    const found = tokenInfo?.repositories.find((r) => r.fullName === fullName);
    if (!found) return;
    setRepoOwner(found.owner);
    setRepoName(found.name);
    setDefaultBranch(found.defaultBranch || 'main');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      if (mode === 'connect') {
        await onConnectRepo({
          accessToken: token.trim(),
          repoOwner: repoOwner.trim(),
          repoName: repoName.trim(),
          defaultBranch: defaultBranch.trim() || undefined,
        });
      } else {
        await onCreateRepo({
          accessToken: token.trim(),
          repoName: repoName.trim(),
          description: description.trim() || undefined,
          privateRepo,
        });
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to connect repository');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 border border-[#30363D] bg-[#161B22] p-6">
      <div className="flex items-center gap-2.5 border-b border-[#30363D] pb-4">
        <FolderGit2 className="h-5 w-5 text-[#22C55E]" strokeWidth={1.5} />
        <div>
          <h2 className="text-sm font-semibold text-[#E6EDF3]">
            Connect GitHub Repository {scopeLabel ? `— ${scopeLabel}` : ''}
          </h2>
          <p className="text-xs text-[#8A8A8A]">
            Authorize a GitHub Personal Access Token to link an existing repository or create one.
          </p>
        </div>
      </div>

      {localError && (
        <div className="border border-[#EF4444] bg-[#0D1117] px-3 py-2 text-xs text-[#EF4444]">
          {localError}
        </div>
      )}

      <GitTokenVerifyBox
        token={token}
        verifying={verifying}
        autoFetching={autoFetching}
        tokenInfo={tokenInfo}
        onChangeToken={setToken}
        onVerify={() => { if (token.trim()) void verifyRawToken(token.trim()); }}
        onAutoFetch={onAutoFetchToken ? () => void handleAutoFetch() : undefined}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('connect')}
          className={`border px-3 py-1.5 text-xs font-medium ${mode === 'connect' ? TAB_ACTIVE : TAB_IDLE}`}
        >
          Connect Existing Repository
        </button>
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium ${mode === 'create' ? TAB_ACTIVE : TAB_IDLE}`}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Create New GitHub Repository
        </button>
      </div>

      <GitConnectFormFields
        mode={mode}
        repositories={tokenInfo?.repositories ?? []}
        repoOwner={repoOwner}
        repoName={repoName}
        defaultBranch={defaultBranch}
        description={description}
        privateRepo={privateRepo}
        canSubmit={Boolean(token.trim() && repoName.trim())}
        submitting={submitting}
        onSelectRemote={handleSelectRemote}
        onChangeOwner={setRepoOwner}
        onChangeName={setRepoName}
        onChangeBranch={setDefaultBranch}
        onChangeDescription={setDescription}
        onChangePrivate={setPrivateRepo}
        onSubmit={(e) => void handleSubmit(e)}
      />
    </div>
  );
}
