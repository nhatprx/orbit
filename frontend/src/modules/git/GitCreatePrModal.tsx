import { useState } from 'react';
import { GitPullRequest, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { CreateGitPullRequest, GitBranchDto } from '../../types/git.types';

interface GitCreatePrModalProps {
  branches: GitBranchDto[];
  defaultBranch: string;
  activeBranch: string;
  onClose: () => void;
  onCreatePr: (req: CreateGitPullRequest) => Promise<void>;
}

export function GitCreatePrModal({
  branches,
  defaultBranch,
  activeBranch,
  onClose,
  onCreatePr,
}: GitCreatePrModalProps) {
  const initialSource =
    activeBranch !== defaultBranch
      ? activeBranch
      : branches.find((b) => b.name !== defaultBranch)?.name ?? activeBranch;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceBranch, setSourceBranch] = useState(initialSource);
  const [targetBranch, setTargetBranch] = useState(defaultBranch);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (sourceBranch === targetBranch) {
      setLocalError('Source and target branches must be different.');
      return;
    }
    setSaving(true);
    setLocalError(null);
    try {
      await onCreatePr({
        title: title.trim(),
        description: description.trim() || undefined,
        sourceBranch,
        targetBranch,
      });
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to create pull request');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full border border-[#30363D] bg-[#0D1117] px-3 py-2 text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg border border-[#30363D] bg-[#161B22]">
        <div className="flex items-center justify-between border-b border-[#30363D] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-[#E6EDF3]">New Pull Request</h2>
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

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 p-5">
          {localError && (
            <div className="border border-[#EF4444] bg-[#0D1117] px-3 py-2 text-xs text-[#EF4444]">
              {localError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pr-source-branch" className="mb-1 block text-xs text-[#BDBDBD]">
                Source Branch
              </label>
              <select
                id="pr-source-branch"
                value={sourceBranch}
                onChange={(e) => setSourceBranch(e.target.value)}
                className={`${inputClass} font-mono`}
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name} className="bg-[#161B22]">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pr-target-branch" className="mb-1 block text-xs text-[#BDBDBD]">
                Target Branch
              </label>
              <select
                id="pr-target-branch"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                className={`${inputClass} font-mono`}
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name} className="bg-[#161B22]">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="pr-title-input" className="mb-1 block text-xs text-[#BDBDBD]">
              Title
            </label>
            <input
              id="pr-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Describe your changes"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="pr-desc-input" className="mb-1 block text-xs text-[#BDBDBD]">
              Description (optional)
            </label>
            <textarea
              id="pr-desc-input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of changes..."
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving || !title.trim()}>
              {saving ? 'Creating...' : 'Create Pull Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
