import { Button } from '../../components/ui/Button';
import type { GitHubRemoteRepoDto } from '../../types/git.types';

interface GitConnectFormFieldsProps {
  mode: 'connect' | 'create';
  repositories: GitHubRemoteRepoDto[];
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  description: string;
  privateRepo: boolean;
  canSubmit: boolean;
  submitting: boolean;
  onSelectRemote: (fullName: string) => void;
  onChangeOwner: (value: string) => void;
  onChangeName: (value: string) => void;
  onChangeBranch: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangePrivate: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const INPUT_CLASS =
  'w-full border border-[#30363D] bg-[#0D1117] px-3 py-2 text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none';

export function GitConnectFormFields({
  mode,
  repositories,
  repoOwner,
  repoName,
  defaultBranch,
  description,
  privateRepo,
  canSubmit,
  submitting,
  onSelectRemote,
  onChangeOwner,
  onChangeName,
  onChangeBranch,
  onChangeDescription,
  onChangePrivate,
  onSubmit,
}: GitConnectFormFieldsProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {mode === 'connect' ? (
        <>
          {repositories.length > 0 && (
            <div>
              <label htmlFor="git-remote-select" className="mb-1 block text-xs text-[#BDBDBD]">
                Select Verified Repository
              </label>
              <select
                id="git-remote-select"
                value={repoOwner && repoName ? `${repoOwner}/${repoName}` : ''}
                onChange={(e) => onSelectRemote(e.target.value)}
                className={`${INPUT_CLASS} font-mono`}
              >
                {repositories.map((r) => (
                  <option key={r.fullName} value={r.fullName} className="bg-[#161B22]">
                    {r.fullName} ({r.privateRepo ? 'private' : 'public'})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="git-owner-input" className="mb-1 block text-xs text-[#BDBDBD]">
                Repository Owner
              </label>
              <input
                id="git-owner-input"
                value={repoOwner}
                onChange={(e) => onChangeOwner(e.target.value)}
                placeholder="octocat"
                required
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="git-name-input" className="mb-1 block text-xs text-[#BDBDBD]">
                Repository Name
              </label>
              <input
                id="git-name-input"
                value={repoName}
                onChange={(e) => onChangeName(e.target.value)}
                placeholder="orbit-core"
                required
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="git-branch-input" className="mb-1 block text-xs text-[#BDBDBD]">
                Default Branch
              </label>
              <input
                id="git-branch-input"
                value={defaultBranch}
                onChange={(e) => onChangeBranch(e.target.value)}
                placeholder="main"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label htmlFor="git-create-name" className="mb-1 block text-xs text-[#BDBDBD]">
              New Repository Name
            </label>
            <input
              id="git-create-name"
              value={repoName}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="orbit-service"
              required
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>
          <div>
            <label htmlFor="git-create-desc" className="mb-1 block text-xs text-[#BDBDBD]">
              Description (optional)
            </label>
            <input
              id="git-create-desc"
              value={description}
              onChange={(e) => onChangeDescription(e.target.value)}
              placeholder="Managed from Orbit"
              className={INPUT_CLASS}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-[#BDBDBD]">
            <input
              type="checkbox"
              checked={privateRepo}
              onChange={(e) => onChangePrivate(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#22C55E]"
            />
            Private repository
          </label>
        </div>
      )}

      <div className="pt-2">
        <Button type="submit" variant="primary" disabled={submitting || !canSubmit}>
          {submitting
            ? 'Saving...'
            : mode === 'connect'
              ? 'Connect Repository'
              : 'Create & Connect Repository'}
        </Button>
      </div>
    </form>
  );
}
