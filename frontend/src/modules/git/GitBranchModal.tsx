import { useState } from 'react';
import { GitBranch, Plus, Trash2, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { CreateGitBranchRequest, GitBranchDto } from '../../types/git.types';

interface GitBranchModalProps {
  branches: GitBranchDto[];
  activeBranch: string;
  canWrite: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSelectBranch: (branch: string) => void;
  onCreateBranch: (req: CreateGitBranchRequest) => Promise<void>;
  onDeleteBranch: (branchName: string) => Promise<void>;
}

export function GitBranchModal({
  branches,
  activeBranch,
  canWrite,
  canDelete,
  onClose,
  onSelectBranch,
  onCreateBranch,
  onDeleteBranch,
}: GitBranchModalProps) {
  const [branchName, setBranchName] = useState('');
  const [sourceBranch, setSourceBranch] = useState(activeBranch || branches[0]?.name || 'main');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!branchName.trim()) return;
    setBusy(true);
    setLocalError(null);
    try {
      await onCreateBranch({ branchName: branchName.trim(), sourceBranch });
      setBranchName('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to create branch');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(name: string) {
    setBusy(true);
    setLocalError(null);
    try {
      await onDeleteBranch(name);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to delete branch');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl border border-[#30363D] bg-[#161B22]">
        <div className="flex items-center justify-between border-b border-[#30363D] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-[#E6EDF3]">
              Branches ({branches.length})
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

        <div className="space-y-4 p-5">
          {localError && (
            <div className="border border-[#EF4444] bg-[#0D1117] px-3 py-2 text-xs text-[#EF4444]">
              {localError}
            </div>
          )}

          {canWrite && (
            <form
              onSubmit={(e) => void handleCreate(e)}
              className="grid grid-cols-1 gap-2 border border-[#30363D] bg-[#0D1117] p-3 sm:grid-cols-12"
            >
              <input
                aria-label="New branch name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="feature/new-branch"
                required
                className="border border-[#30363D] bg-[#161B22] px-2.5 py-1.5 font-mono text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none sm:col-span-5"
              />
              <select
                aria-label="Source branch"
                value={sourceBranch}
                onChange={(e) => setSourceBranch(e.target.value)}
                className="border border-[#30363D] bg-[#161B22] px-2 py-1.5 font-mono text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none sm:col-span-4"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    from {b.name}
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                variant="primary"
                disabled={busy || !branchName.trim()}
                className="sm:col-span-3"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Create
              </Button>
            </form>
          )}

          <div className="max-h-72 overflow-y-auto border border-[#30363D]">
            {branches.map((b, idx) => (
              <div
                key={b.name}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                  idx > 0 ? 'border-t border-[#30363D]' : ''
                } ${b.name === activeBranch ? 'bg-[#21262D]' : 'bg-[#0D1117]'}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectBranch(b.name);
                    onClose();
                  }}
                  className="flex min-w-0 items-center gap-2 text-left"
                >
                  <span className="truncate font-mono text-xs font-medium text-[#E6EDF3]">
                    {b.name}
                  </span>
                  {b.isDefault && <Badge tone="green">default</Badge>}
                  {b.isProtected && <Badge tone="warning">protected</Badge>}
                </button>
                <div className="flex items-center gap-2">
                  <span className="border border-[#30363D] bg-[#161B22] px-2 py-0.5 font-mono text-[11px] text-[#8A8A8A]">
                    {b.sha.slice(0, 7)}
                  </span>
                  {canDelete && !b.isDefault && !b.isProtected && (
                    <button
                      type="button"
                      aria-label={`Delete branch ${b.name}`}
                      disabled={busy}
                      onClick={() => void handleDelete(b.name)}
                      className="border border-[#30363D] bg-[#161B22] p-1 text-[#8A8A8A] hover:border-[#EF4444] hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
