import type {
  ConnectGitRepoRequest,
  CreateGitBranchRequest,
  CreateGitPullRequest,
  GitBranchDto,
  GitCommitDetailDto,
  GitFileContentDto,
  GitRepositoryDto,
  InspectGitTokenResponse,
  UpsertGitFileRequest,
} from '../../types/git.types';
import { GitAccessModal } from './GitAccessModal';
import { GitBranchModal } from './GitBranchModal';
import { GitCommitDetailModal } from './GitCommitDetailModal';
import { GitCreatePrModal } from './GitCreatePrModal';
import { GitFileEditorModal } from './GitFileEditorModal';

interface GitModalsProps {
  repo: GitRepositoryDto;
  branches: GitBranchDto[];
  activeBranch: string;
  currentDir: string;
  canWrite: boolean;
  canDelete: boolean;
  canManage: boolean;
  showAccess: boolean;
  showBranches: boolean;
  showCreatePr: boolean;
  fileEditor: { mode: 'create' | 'edit'; file?: GitFileContentDto } | null;
  commitModal: { open: boolean; loading: boolean; detail: GitCommitDetailDto | null };
  onCloseAccess: () => void;
  onCloseBranches: () => void;
  onCloseCreatePr: () => void;
  onCloseFileEditor: () => void;
  onCloseCommitModal: () => void;
  onSelectBranch: (branch: string) => void;
  onAutoFetchToken?: () => Promise<string>;
  onInspectToken: (token: string) => Promise<InspectGitTokenResponse>;
  onUpdateToken: (token: string) => Promise<unknown>;
  onSwitchRepo: (req: ConnectGitRepoRequest) => Promise<unknown>;
  onDisconnect: () => Promise<unknown>;
  onCreateBranch: (req: CreateGitBranchRequest) => Promise<unknown>;
  onRenameBranch: (oldName: string, newName: string) => Promise<unknown>;
  onDeleteBranch: (name: string) => Promise<unknown>;
  onSaveFile: (req: UpsertGitFileRequest) => Promise<unknown>;
  onCreatePr: (req: CreateGitPullRequest) => Promise<unknown>;
}

export function GitModals({
  repo, branches, activeBranch, currentDir, canWrite, canDelete, canManage,
  showAccess, showBranches, showCreatePr, fileEditor, commitModal,
  onCloseAccess, onCloseBranches, onCloseCreatePr, onCloseFileEditor, onCloseCommitModal,
  onSelectBranch, onAutoFetchToken, onInspectToken, onUpdateToken, onSwitchRepo, onDisconnect,
  onCreateBranch, onRenameBranch, onDeleteBranch, onSaveFile, onCreatePr,
}: GitModalsProps) {
  return (
    <>
      {showAccess && (
        <GitAccessModal
          repo={repo}
          canManage={canManage}
          onClose={onCloseAccess}
          onAutoFetchToken={onAutoFetchToken}
          onInspectToken={onInspectToken}
          onUpdateToken={async (token) => { await onUpdateToken(token); }}
          onSwitchRepo={async (req) => { await onSwitchRepo(req); }}
          onDisconnect={async () => { await onDisconnect(); }}
        />
      )}

      {showBranches && (
        <GitBranchModal
          branches={branches}
          activeBranch={activeBranch}
          canWrite={canWrite}
          canDelete={canDelete}
          onClose={onCloseBranches}
          onSelectBranch={onSelectBranch}
          onCreateBranch={async (req) => { await onCreateBranch(req); }}
          onRenameBranch={async (oldName, newName) => { await onRenameBranch(oldName, newName); }}
          onDeleteBranch={async (name) => { await onDeleteBranch(name); }}
        />
      )}

      {fileEditor && (
        <GitFileEditorModal
          mode={fileEditor.mode}
          branch={activeBranch}
          initialPath={
            fileEditor.mode === 'edit'
              ? fileEditor.file?.path ?? ''
              : currentDir
                ? `${currentDir}/`
                : ''
          }
          initialContent={fileEditor.file?.content ?? ''}
          sha={fileEditor.file?.sha ?? null}
          onClose={onCloseFileEditor}
          onSaveFile={async (req) => {
            await onSaveFile(req);
          }}
        />
      )}

      {commitModal.open && (
        <GitCommitDetailModal
          commit={commitModal.detail}
          loading={commitModal.loading}
          onClose={onCloseCommitModal}
        />
      )}

      {showCreatePr && (
        <GitCreatePrModal
          branches={branches}
          defaultBranch={repo.defaultBranch}
          activeBranch={activeBranch}
          onClose={onCloseCreatePr}
          onCreatePr={async (req) => {
            await onCreatePr(req);
          }}
        />
      )}
    </>
  );
}
