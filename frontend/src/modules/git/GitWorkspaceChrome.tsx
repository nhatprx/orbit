import { AlertCircle, Code2, GitCommitHorizontal, GitPullRequest, RefreshCw, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export type GitTab = 'code' | 'commits' | 'prs';

interface GitLoadErrorViewProps {
  error: string;
  scopeLabel?: string;
  onRetry: () => void;
}

export function GitLoadErrorView({ error, scopeLabel, onRetry }: GitLoadErrorViewProps) {
  return (
    <div className="border border-[#EF4444] bg-[#161B22] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#EF4444]">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>Unable to load Git repository</span>
            {scopeLabel && (
              <span className="font-mono text-xs font-normal text-[#8A8A8A]">({scopeLabel})</span>
            )}
          </div>
          <p role="alert" className="pl-6 text-xs leading-relaxed text-[#E6EDF3]">
            {error}
          </p>
        </div>

        <Button type="button" variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
          Retry
        </Button>
      </div>
    </div>
  );
}

interface GitStatusBannersProps {
  error: string | null;
  notice: string | null;
  onClearError: () => void;
  onClearNotice: () => void;
}

export function GitStatusBanners({
  error,
  notice,
  onClearError,
  onClearNotice,
}: GitStatusBannersProps) {
  return (
    <>
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between border border-[#EF4444] bg-[#161B22] px-4 py-2.5 text-xs text-[#EF4444]"
        >
          <span>{error}</span>
          <button type="button" aria-label="Dismiss error" onClick={onClearError}>
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {notice && (
        <div className="flex items-center justify-between border border-[#22C55E] bg-[#052E16] px-4 py-2.5 text-xs text-[#4ADE80]">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss notice" onClick={onClearNotice}>
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}
    </>
  );
}

interface GitTabBarProps {
  tab: GitTab;
  commitsCount: number;
  prsCount: number;
  onSelectTab: (tab: GitTab) => void;
}

export function GitTabBar({ tab, commitsCount, prsCount, onSelectTab }: GitTabBarProps) {
  const tabs = [
    { id: 'code' as const, label: 'Code', icon: Code2 },
    { id: 'commits' as const, label: `Commits (${commitsCount})`, icon: GitCommitHorizontal },
    { id: 'prs' as const, label: `Pull Requests (${prsCount})`, icon: GitPullRequest },
  ];

  return (
    <div className="flex gap-1 border-b border-[#30363D]">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelectTab(id)}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === id
              ? 'border-[#22C55E] text-[#22C55E]'
              : 'border-transparent text-[#BDBDBD] hover:text-[#E6EDF3]'
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
