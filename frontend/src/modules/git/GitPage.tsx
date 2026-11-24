import { useState } from 'react';
import type { GitApi } from '../../services/git/gitApi';
import {
  getGitPermissions,
  type GitCommitDetailDto,
  type GitFileContentDto,
  type GitScope,
} from '../../types/git.types';
import { GitActionsView } from './GitActionsView';
import { GitBranchCompareModal } from './GitBranchCompareModal';
import { GitCodeView } from './GitCodeView';
import { GitCommitsView } from './GitCommitsView';
import { GitConnectPanel } from './GitConnectPanel';
import { GitHeaderBar } from './GitHeaderBar';
import { GitModals } from './GitModals';
import { GitOverviewView } from './GitOverviewView';
import { GitPrDetailModal } from './GitPrDetailModal';
import { GitPullRequestsView } from './GitPullRequestsView';
import { GitShareToChatModal, type ShareToChatPayload } from './GitShareToChatModal';
import { GitLoadErrorView, GitStatusBanners, GitTabBar, type GitTab } from './GitWorkspaceChrome';
import { useGitInsights } from './useGitInsights';
import { useGitWorkspace } from './useGitWorkspace';

interface GitPageProps {
  scope: GitScope;
  scopeLabel?: string;
  api?: GitApi;
}

const EMPTY_COMMIT_MODAL = { open: false, loading: false, detail: null as GitCommitDetailDto | null };

export function GitPage({ scope, scopeLabel, api }: GitPageProps) {
  const ws = useGitWorkspace(scope, api);
  const insights = useGitInsights(scope, ws.repo?.id ?? null, !api);
  const perms = getGitPermissions(scope);
  const [tab, setTab] = useState<GitTab>('overview');
  const [showAccess, setShowAccess] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [showCreatePr, setShowCreatePr] = useState(false);
  const [fileEditor, setFileEditor] = useState<{ mode: 'create' | 'edit'; file?: GitFileContentDto } | null>(null);
  const [commitModal, setCommitModal] = useState(EMPTY_COMMIT_MODAL);
  const [inspectPrNumber, setInspectPrNumber] = useState<number | null>(null);
  const [compareState, setCompareState] = useState<{ base: string; head: string } | null>(null);
  const [sharePayload, setSharePayload] = useState<ShareToChatPayload | null>(null);

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
    return <div className="flex h-[calc(100vh-3rem)] items-center justify-center bg-[#0D1117] p-6 text-sm text-[#8A8A8A]">Loading Git repository...</div>;
  }

  if (!ws.repo && ws.error) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-start justify-center bg-[#0D1117] p-6">
        <div className="w-full max-w-2xl"><GitLoadErrorView error={ws.error} scopeLabel={scopeLabel} onRetry={() => void ws.reloadAll()} /></div>
      </div>
    );
  }

  if (!ws.repo) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-start justify-center overflow-y-auto bg-[#0D1117] p-6">
        <div className="w-full max-w-2xl">
          <GitConnectPanel
            scopeLabel={scopeLabel}
            canManage={perms.canManage}
            onAutoFetchToken={() => ws.api.fetchOAuthToken()}
            onInspectToken={(token) => ws.api.inspectToken(token)}
            onConnectRepo={(req) => ws.connectRepo(req)}
            onCreateRepo={(req) => ws.createRepo(req)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full flex-col overflow-hidden bg-[#0D1117]">
      <GitHeaderBar
        repo={ws.repo}
        scopeLabel={scopeLabel}
        branches={ws.branches}
        activeBranch={ws.activeBranch}
        syncingCommits={ws.syncingCommits}
        onOpenBranches={() => setShowBranches(true)}
        onPullCommits={() => void ws.pullCommitHistory()}
        onOpenSettings={() => setShowAccess(true)}
      />

      <GitTabBar
        tab={tab}
        commitsCount={ws.commits.length}
        actionsCount={insights.runs.length}
        prsCount={ws.pullRequests.length}
        onSelectTab={setTab}
      />

      <div className="no-scrollbar min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto p-4">
        <GitStatusBanners
          error={ws.error}
          notice={ws.notice}
          onClearError={ws.clearError}
          onClearNotice={ws.clearNotice}
        />

        {tab === 'overview' && (
          <GitOverviewView
            branches={ws.branches} activeBranch={ws.activeBranch} commits={ws.commits}
            pullRequests={ws.pullRequests} runs={insights.runs} collaborators={insights.collaborators}
            stats={insights.stats} canWrite={perms.canWrite} onSelectBranch={ws.setActiveBranch}
            onManageBranches={() => setShowBranches(true)}
            onCompareBranch={(base, head) => setCompareState({ base, head })}
            onQuickPr={(head) => { ws.setActiveBranch(head); setShowCreatePr(true); }}
            onInspectCommit={(sha) => void handleInspectCommit(sha)}
            onInspectPr={setInspectPrNumber} onShareToChat={setSharePayload} onSwitchTab={setTab}
          />
        )}

        {tab === 'actions' && (
          <GitActionsView
            scope={scope} runs={insights.runs} loading={insights.loading}
            canWrite={perms.canWrite} onRefresh={insights.refresh} onShareToChat={setSharePayload}
          />
        )}

        {tab === 'code' && (
          <GitCodeView
            scope={scope} api={ws.api} activeBranch={ws.activeBranch} enableFastTree={!api}
            currentDir={ws.currentDir} tree={ws.tree} selectedFile={ws.selectedFile}
            fileLoading={ws.fileLoading} canWrite={perms.canWrite} canDelete={perms.canDelete}
            onNavigateDir={(dir) => void ws.navigateDir(dir)} onOpenFile={(path) => void ws.openFile(path)}
            onSelectCachedFile={ws.setSelectedFile} onNewFile={() => setFileEditor({ mode: 'create' })}
            onSaveInlineFile={async (file, content, commitMessage) => {
              await ws.saveFile({ branch: ws.activeBranch, path: file.path, content, commitMessage, sha: file.sha });
            }}
            onDeleteFile={async (file, commitMessage) => {
              await ws.removeFile({ branch: ws.activeBranch, path: file.path, sha: file.sha, commitMessage });
            }}
          />
        )}

        {tab === 'commits' && (
          <GitCommitsView
            branch={ws.activeBranch} commits={ws.commits} syncing={ws.syncingCommits}
            onSyncCommits={() => void ws.pullCommitHistory()} onInspectCommit={(sha) => void handleInspectCommit(sha)}
          />
        )}

        {tab === 'prs' && (
          <GitPullRequestsView
            pullRequests={ws.pullRequests} filter={ws.prFilter} canWrite={perms.canWrite}
            onFilterChange={ws.setPrFilter} onNewPr={() => setShowCreatePr(true)}
            onMergePr={async (num, body) => { await ws.mergePr(num, body); }}
            onInspectPr={setInspectPrNumber} onShareToChat={setSharePayload}
          />
        )}
      </div>

      <GitPrDetailModal scope={scope} pullNumber={inspectPrNumber} canWrite={perms.canWrite} onClose={() => setInspectPrNumber(null)} onShareToChat={setSharePayload} />
      <GitBranchCompareModal
        open={Boolean(compareState)} scope={scope} branches={ws.branches}
        initialBase={compareState?.base ?? ws.repo.defaultBranch} initialHead={compareState?.head ?? ws.activeBranch}
        canWrite={perms.canWrite} onClose={() => setCompareState(null)}
        onCreatePrFromBranch={(head) => { ws.setActiveBranch(head); setShowCreatePr(true); }}
      />
      <GitShareToChatModal open={Boolean(sharePayload)} scope={scope} payload={sharePayload} onClose={() => setSharePayload(null)} />

      <GitModals
        repo={ws.repo} branches={ws.branches} activeBranch={ws.activeBranch} currentDir={ws.currentDir}
        canWrite={perms.canWrite} canDelete={perms.canDelete} canManage={perms.canManage}
        showAccess={showAccess} showBranches={showBranches} showCreatePr={showCreatePr}
        fileEditor={fileEditor} commitModal={commitModal}
        onCloseAccess={() => setShowAccess(false)} onCloseBranches={() => setShowBranches(false)}
        onCloseCreatePr={() => setShowCreatePr(false)} onCloseFileEditor={() => setFileEditor(null)}
        onCloseCommitModal={() => setCommitModal(EMPTY_COMMIT_MODAL)}
        onSelectBranch={ws.setActiveBranch} onAutoFetchToken={() => ws.api.fetchOAuthToken()}
        onInspectToken={(token) => ws.api.inspectToken(token)}
        onUpdateToken={ws.updateToken} onSwitchRepo={ws.connectRepo} onDisconnect={ws.disconnectRepo}
        onCreateBranch={ws.createBranch}
        onRenameBranch={async (oldName, newName) => {
          await ws.createBranch({ branchName: newName, sourceBranch: oldName });
          await ws.deleteBranch(oldName);
        }}
        onDeleteBranch={ws.deleteBranch}
        onSaveFile={ws.saveFile} onCreatePr={ws.createPr}
      />
    </div>
  );
}
