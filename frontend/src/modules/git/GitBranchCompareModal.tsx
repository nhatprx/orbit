import { useEffect, useState } from 'react';
import { ArrowRight, GitCompare, GitPullRequest, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { compareGitBranches } from '../../services/git/gitInsightsApi';
import { errorMessage } from '../../services/workspace/httpClient';
import type { GitBranchCompareDto } from '../../types/git-insights.types';
import type { GitBranchDto, GitScope } from '../../types/git.types';

interface GitBranchCompareModalProps {
  open: boolean;
  scope: GitScope;
  branches: GitBranchDto[];
  initialBase: string;
  initialHead: string;
  canWrite: boolean;
  onClose: () => void;
  onCreatePrFromBranch: (sourceBranch: string, targetBranch: string) => void;
}

export function GitBranchCompareModal({
  open, scope, branches, initialBase, initialHead, canWrite, onClose, onCreatePrFromBranch,
}: GitBranchCompareModalProps) {
  const [base, setBase] = useState(initialBase);
  const [head, setHead] = useState(initialHead);
  const [data, setData] = useState<GitBranchCompareDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBase(initialBase);
    setHead(initialHead);
  }, [open, initialBase, initialHead]);

  useEffect(() => {
    if (!open || !base || !head) return;
    const ctrl = new AbortController();
    setLoading(true); setError(null);
    compareGitBranches(scope, base, head, ctrl.signal)
      .then(setData)
      .catch((err) => { if (!ctrl.signal.aborted) setError(errorMessage(err, 'Failed to compare branches.')); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [open, scope, base, head]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col border border-[#30363D] bg-[#161B22]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#E6EDF3]">
            <GitCompare className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            <span>Compare Branches</span>
          </div>
          <div className="flex items-center gap-2">
            <select aria-label="Base branch" value={base} onChange={(e) => setBase(e.target.value)} className="h-8 border border-[#30363D] bg-[#0D1117] px-2 font-mono text-xs text-[#E6EDF3]">
              {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
            <ArrowRight className="h-3.5 w-3.5 text-[#8A8A8A]" />
            <select aria-label="Head branch" value={head} onChange={(e) => setHead(e.target.value)} className="h-8 border border-[#30363D] bg-[#0D1117] px-2 font-mono text-xs text-[#E6EDF3]">
              {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
            {canWrite && base !== head && (
              <Button type="button" variant="primary" onClick={() => { onClose(); onCreatePrFromBranch(head, base); }}>
                <GitPullRequest className="h-3.5 w-3.5" strokeWidth={1.5} />
                Create PR
              </Button>
            )}
            <button type="button" aria-label="Close compare modal" onClick={onClose} className="flex h-8 w-8 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#8A8A8A] hover:text-[#E6EDF3]">
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {error && <div role="alert" className="border border-[#EF4444] bg-[#0D1117] px-3 py-2 text-xs text-[#EF4444]">{error}</div>}
          {loading ? (
            <p className="text-xs text-[#8A8A8A]">Comparing {base}...{head}...</p>
          ) : data && (
            <>
              <div className="flex flex-wrap items-center gap-3 border border-[#30363D] bg-[#0D1117] px-4 py-2.5 font-mono text-xs">
                <span className="text-[#4ADE80]">+{data.aheadBy} ahead</span>
                <span className="text-[#8A8A8A]">/</span>
                <span className="text-[#EAB308]">-{data.behindBy} behind</span>
                <span className="text-[#8A8A8A]">·</span>
                <span className="text-[#E6EDF3]">{data.totalCommits} commits</span>
                <span className="text-[#8A8A8A]">·</span>
                <span className="text-[#E6EDF3]">{data.files.length} files changed</span>
              </div>

              {data.commits.length > 0 && (
                <div className="border border-[#30363D] bg-[#0D1117] divide-y divide-[#21262D]">
                  {data.commits.slice(0, 15).map((c) => (
                    <div key={c.sha} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                      <span className="truncate text-[#E6EDF3]">{c.message}</span>
                      <span className="shrink-0 font-mono text-[11px] text-[#4ADE80]">{c.sha.slice(0, 7)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {data.files.map((f) => (
                  <div key={f.filename} className="border border-[#30363D] bg-[#0D1117]">
                    <div className="flex items-center justify-between border-b border-[#21262D] px-3 py-2 font-mono text-xs">
                      <span className="truncate text-[#E6EDF3]">{f.filename}</span>
                      <span><span className="text-[#22C55E]">+{f.additions}</span> <span className="text-[#EF4444]">-{f.deletions}</span></span>
                    </div>
                    {f.patch && (
                      <pre className="max-h-60 overflow-auto p-3 font-mono text-[11px] leading-relaxed">
                        {f.patch.split('\n').map((line, i) => (
                          <div key={i} className={line.startsWith('+') && !line.startsWith('+++') ? 'bg-[#052E16]/70 text-[#4ADE80]' : line.startsWith('-') && !line.startsWith('---') ? 'bg-[#EF4444]/15 text-[#F87171]' : 'text-[#BDBDBD]'}>{line}</div>
                        ))}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
