import type {
  CreateGitBranchRequest,
  CreateGitPullRequest,
  GitBranchDto,
  GitCommitDetailDto,
  GitFileContentDto,
  GitRepositoryDto,
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
  onUpdateToken: (token: string) => Promise<unknown>;
  onDisconnect: () => Promise<unknown>;
  onCreateBranch: (req: CreateGitBranchRequest) => Promise<unknown>;
  onDeleteBranch: (name: string) => Promise<unknown>;
  onSaveFile: (req: UpsertGitFileRequest) => Promise<unknown>;
  onCreatePr: (req: CreateGitPullRequest) => Promise<unknown>;
}

export function GitModals({
  repo,
  branches,
  activeBranch,
  currentDir,
  canWrite,
  canDelete,
  canManage,
  showAccess,
  showBranches,
  showCreatePr,
  fileEditor,
  commitModal,
  onCloseAccess,
  onCloseBranches,
  onCloseCreatePr,
  onCloseFileEditor,
  onCloseCommitModal,
  onSelectBranch,
  onAutoFetchToken,
  onUpdateToken,
  onDisconnect,
  onCreateBranch,
  onDeleteBranch,
  onSaveFile,
  onCreatePr,
}: GitModalsProps) {
  return (
    <>
      {showAccess && (
        <GitAccessModal
          repo={repo}
          canManage={canManage}
          onClose={onCloseAccess}
          onAutoFetchToken={onAutoFetchToken}
          onUpdateToken={async (token) => {
            await onUpdateToken(token);
          }}
          onDisconnect={async () => {
            await onDisconnect();
          }}
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
          onCreateBranch={async (req) => {
            await onCreateBranch(req);
          }}
          onDeleteBranch={async (name) => {
            await onDeleteBranch(name);
          }}
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
