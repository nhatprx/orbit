import { useState } from 'react';
import { FileCode, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { UpsertGitFileRequest } from '../../types/git.types';

interface GitFileEditorModalProps {
  mode: 'create' | 'edit';
  branch: string;
  initialPath?: string;
  initialContent?: string;
  sha?: string | null;
  onClose: () => void;
  onSaveFile: (req: UpsertGitFileRequest) => Promise<void>;
}

export function GitFileEditorModal({
  mode,
  branch,
  initialPath = '',
  initialContent = '',
  sha = null,
  onClose,
  onSaveFile,
}: GitFileEditorModalProps) {
  const [path, setPath] = useState(initialPath);
  const [content, setContent] = useState(initialContent);
  const [commitMessage, setCommitMessage] = useState(
    mode === 'edit' ? `Update ${initialPath}` : 'Add new file'
  );
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!path.trim() || !commitMessage.trim()) return;
    setSaving(true);
    setLocalError(null);
    try {
      await onSaveFile({
        branch,
        path: path.trim(),
        content,
        commitMessage: commitMessage.trim(),
        sha,
      });
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to commit file');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl border border-[#30363D] bg-[#161B22]">
        <div className="flex items-center justify-between border-b border-[#30363D] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-[#E6EDF3]">
              {mode === 'create' ? 'Create File' : 'Edit File'} on{' '}
              <span className="font-mono text-[#22C55E]">{branch}</span>
            </h2>
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

          <div>
            <label htmlFor="git-file-path" className="mb-1 block text-xs text-[#BDBDBD]">
              File Path
            </label>
            <input
              id="git-file-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              readOnly={mode === 'edit'}
              placeholder="src/example.ts"
              required
              className="w-full border border-[#30363D] bg-[#0D1117] px-3 py-2 font-mono text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none read-only:opacity-70"
            />
          </div>

          <div>
            <label htmlFor="git-file-content" className="mb-1 block text-xs text-[#BDBDBD]">
              Content
            </label>
            <textarea
              id="git-file-content"
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border border-[#30363D] bg-[#0D1117] p-3 font-mono text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="git-file-commit-msg" className="mb-1 block text-xs text-[#BDBDBD]">
              Commit Message
            </label>
            <input
              id="git-file-commit-msg"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              required
              className="w-full border border-[#30363D] bg-[#0D1117] px-3 py-2 text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || !path.trim() || !commitMessage.trim()}
            >
              {saving ? 'Committing...' : 'Commit to GitHub'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
