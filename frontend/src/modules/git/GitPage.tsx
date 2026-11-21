import { useState } from 'react';
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
import { GitLoadErrorView, GitStatusBanners, GitTabBar, type GitTab } from './GitWorkspaceChrome';
import { useGitWorkspace } from './useGitWorkspace';

interface GitPageProps {
  scope: GitScope;
  scopeLabel?: string;
  api?: GitApi;
}

const EMPTY_COMMIT_MODAL = { open: false, loading: false, detail: null as GitCommitDetailDto | null };

export function GitPage({ scope, scopeLabel, api }: GitPageProps) {
  const ws = useGitWorkspace(scope, api);
  const perms = getGitPermissions(scope);
  const [tab, setTab] = useState<GitTab>('code');
  const [showAccess, setShowAccess] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [showCreatePr, setShowCreatePr] = useState(false);
  const [fileEditor, setFileEditor] = useState<{ mode: 'create' | 'edit'; file?: GitFileContentDto } | null>(null);
  const [commitModal, setCommitModal] = useState(EMPTY_COMMIT_MODAL);

  async function handleInspectCommit(sha: string) {
    setCommitModal({ open: true, loading: true, detail: null });
    try {
      const detail = await ws.inspectCommit(sha);
      setCommitModal({ open: true, loading: false, detail });
    } catch {
      setCommitModal(EMPTY_COMMIT_MODAL);
    }
  }

  if (ws.loading) {
    return (
      <div className="border border-[#30363D] bg-[#161B22] p-6 text-sm text-[#8A8A8A]">
        Loading Git repository...
      </div>
    );
  }

  if (!ws.repo && ws.error) {
    return (
      <GitLoadErrorView
        error={ws.error}
        scopeLabel={scopeLabel}
        onRetry={() => void ws.reloadAll()}
      />
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

      <GitStatusBanners
        error={ws.error}
        notice={ws.notice}
        onClearError={ws.clearError}
        onClearNotice={ws.clearNotice}
      />

      <GitTabBar
        tab={tab}
        commitsCount={ws.commits.length}
        prsCount={ws.pullRequests.length}
        onSelectTab={setTab}
      />

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
          onMergePr={async (num, body) => {
            await ws.mergePr(num, body);
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
        onCloseCommitModal={() => setCommitModal(EMPTY_COMMIT_MODAL)}
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
