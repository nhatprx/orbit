import { useState } from 'react';
import { Code2, GitCommitHorizontal, GitPullRequest, X } from 'lucide-react';
import type { GitApi } from '../../services/git/gitApi';
import {
  getGitPermissions,
  type GitCommitDetailDto,
  type GitFileContentDto,
  type GitScope,
} from '../../types/git.types';
import { GitCodeView } from './GitCodeView';
import { GitCommitsView } from './GitCommitsView';
import { GitConnectPanel } from './GitConnectPanel';
import { GitHeaderBar } from './GitHeaderBar';
import { GitModals } from './GitModals';
import { GitPullRequestsView } from './GitPullRequestsView';
import { useGitWorkspace } from './useGitWorkspace';

interface GitPageProps {
  scope: GitScope;
  scopeLabel?: string;
  api?: GitApi;
}

type GitTab = 'code' | 'commits' | 'prs';

export function GitPage({ scope, scopeLabel, api }: GitPageProps) {
  const ws = useGitWorkspace(scope, api);
  const perms = getGitPermissions(scope);
  const [tab, setTab] = useState<GitTab>('code');
  const [showAccess, setShowAccess] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [showCreatePr, setShowCreatePr] = useState(false);
  const [fileEditor, setFileEditor] = useState<{
    mode: 'create' | 'edit';
    file?: GitFileContentDto;
  } | null>(null);
  const [commitModal, setCommitModal] = useState<{
    open: boolean;
    loading: boolean;
    detail: GitCommitDetailDto | null;
  }>({ open: false, loading: false, detail: null });

  async function handleInspectCommit(sha: string) {
    setCommitModal({ open: true, loading: true, detail: null });
    try {
      const detail = await ws.inspectCommit(sha);
      setCommitModal({ open: true, loading: false, detail });
    } catch {
      setCommitModal({ open: false, loading: false, detail: null });
    }
  }

  if (ws.loading) {
    return (
      <div className="border border-[#30363D] bg-[#161B22] p-6 text-sm text-[#8A8A8A]">
        Loading Git repository...
      </div>
    );
  }

  if (!ws.repo) {
    return (
      <GitConnectPanel
        scopeLabel={scopeLabel}
        canManage={perms.canManage}
        onInspectToken={(token) => ws.api.inspectToken(token)}
        onConnectRepo={(req) => ws.connectRepo(req)}
        onCreateRepo={(req) => ws.createRepo(req)}
      />
    );
  }

  const tabs = [
    { id: 'code' as const, label: 'Code', icon: Code2 },
    { id: 'commits' as const, label: `Commits (${ws.commits.length})`, icon: GitCommitHorizontal },
    { id: 'prs' as const, label: `Pull Requests (${ws.pullRequests.length})`, icon: GitPullRequest },
  ];

  return (
    <div className="space-y-4">
      <GitHeaderBar
        repo={ws.repo}
        scopeLabel={scopeLabel}
        branches={ws.branches}
        activeBranch={ws.activeBranch}
        syncingCommits={ws.syncingCommits}
        onSelectBranch={ws.setActiveBranch}
        onOpenBranches={() => setShowBranches(true)}
        onPullCommits={() => void ws.pullCommitHistory()}
        onOpenAccess={() => setShowAccess(true)}
      />

      {ws.error && (
        <div className="flex items-center justify-between border border-[#EF4444] bg-[#161B22] px-4 py-2.5 text-xs text-[#EF4444]">
          <span>{ws.error}</span>
          <button type="button" aria-label="Dismiss error" onClick={ws.clearError}>
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {ws.notice && (
        <div className="flex items-center justify-between border border-[#22C55E] bg-[#052E16] px-4 py-2.5 text-xs text-[#4ADE80]">
          <span>{ws.notice}</span>
          <button type="button" aria-label="Dismiss notice" onClick={ws.clearNotice}>
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div className="flex gap-1 border-b border-[#30363D]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === id
                ? 'border-[#22C55E] text-[#22C55E]'
                : 'border-transparent text-[#BDBDBD] hover:text-[#E6EDF3]'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {tab === 'code' && (
        <GitCodeView
          currentDir={ws.currentDir}
          tree={ws.tree}
          selectedFile={ws.selectedFile}
          fileLoading={ws.fileLoading}
          canWrite={perms.canWrite}
          canDelete={perms.canDelete}
          onNavigateDir={(dir) => void ws.navigateDir(dir)}
          onOpenFile={(path) => void ws.openFile(path)}
          onNewFile={() => setFileEditor({ mode: 'create' })}
          onEditFile={(file) => setFileEditor({ mode: 'edit', file })}
          onDeleteFile={async (file, commitMessage) => {
            await ws.removeFile({ branch: ws.activeBranch, path: file.path, sha: file.sha, commitMessage });
          }}
        />
      )}

      {tab === 'commits' && (
        <GitCommitsView
          branch={ws.activeBranch}
          commits={ws.commits}
          syncing={ws.syncingCommits}
          onSyncCommits={() => void ws.pullCommitHistory()}
          onInspectCommit={(sha) => void handleInspectCommit(sha)}
        />
      )}

      {tab === 'prs' && (
        <GitPullRequestsView
          pullRequests={ws.pullRequests}
          filter={ws.prFilter}
          canWrite={perms.canWrite}
          onFilterChange={ws.setPrFilter}
          onNewPr={() => setShowCreatePr(true)}
          onMergePr={async (num) => {
            await ws.mergePr(num);
          }}
        />
      )}

      <GitModals
        repo={ws.repo}
        branches={ws.branches}
        activeBranch={ws.activeBranch}
        currentDir={ws.currentDir}
        canWrite={perms.canWrite}
        canDelete={perms.canDelete}
        canManage={perms.canManage}
        showAccess={showAccess}
        showBranches={showBranches}
        showCreatePr={showCreatePr}
        fileEditor={fileEditor}
        commitModal={commitModal}
        onCloseAccess={() => setShowAccess(false)}
        onCloseBranches={() => setShowBranches(false)}
        onCloseCreatePr={() => setShowCreatePr(false)}
        onCloseFileEditor={() => setFileEditor(null)}
        onCloseCommitModal={() => setCommitModal({ open: false, loading: false, detail: null })}
        onSelectBranch={ws.setActiveBranch}
        onUpdateToken={ws.updateToken}
        onDisconnect={ws.disconnectRepo}
        onCreateBranch={ws.createBranch}
        onDeleteBranch={ws.deleteBranch}
        onSaveFile={ws.saveFile}
        onCreatePr={ws.createPr}
      />
    </div>
  );
}
