import { FileDiff, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { GitCommitDetailDto } from '../../types/git.types';

interface GitCommitDetailModalProps {
  commit: GitCommitDetailDto | null;
  loading: boolean;
  onClose: () => void;
}

function diffLineClass(line: string): string {
  if (line.startsWith('+')) return 'bg-[#052E16] text-[#4ADE80]';
  if (line.startsWith('-')) return 'bg-[#2B1418] text-[#EF4444]';
  if (line.startsWith('@@')) return 'bg-[#21262D] text-[#8A8A8A]';
  return 'text-[#E6EDF3]';
}

export function GitCommitDetailModal({
  commit,
  loading,
  onClose,
}: GitCommitDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col border border-[#30363D] bg-[#161B22]">
        <div className="flex items-center justify-between border-b border-[#30363D] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FileDiff className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-[#E6EDF3]">Commit Diff</h2>
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

        <div className="overflow-y-auto p-5">
          {loading || !commit ? (
            <div className="text-xs text-[#8A8A8A]">Loading commit details...</div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5 border border-[#30363D] bg-[#0D1117] p-4">
                <div className="text-sm font-semibold text-[#E6EDF3]">{commit.message}</div>
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-[#8A8A8A]">
                  <span>{commit.sha}</span>
                  <span className="text-[#BDBDBD]">{commit.authorName}</span>
                  <span>{commit.committedAt}</span>
                  <span className="text-[#4ADE80]">+{commit.additions}</span>
                  <span className="text-[#EF4444]">-{commit.deletions}</span>
                </div>
              </div>

              <div className="space-y-3">
                {commit.files.map((file) => (
                  <div key={file.filename} className="border border-[#30363D] bg-[#0D1117]">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] bg-[#161B22] px-4 py-2">
                      <span className="font-mono text-xs font-semibold text-[#E6EDF3]">
                        {file.filename}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <Badge tone="neutral">{file.status}</Badge>
                        <span className="text-[#4ADE80]">+{file.additions}</span>
                        <span className="text-[#EF4444]">-{file.deletions}</span>
                      </div>
                    </div>

                    {file.patch ? (
                      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
                        {file.patch.split('\n').map((line, i) => (
                          <div key={i} className={`px-2 ${diffLineClass(line)}`}>
                            {line || ' '}
                          </div>
                        ))}
                      </pre>
                    ) : (
                      <div className="px-4 py-3 text-xs text-[#8A8A8A]">
                        No textual diff available for this file.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
