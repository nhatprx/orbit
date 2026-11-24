import { AlertCircle, Code2, GitCommitHorizontal, GitPullRequest, LayoutDashboard, PlayCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export type GitTab = 'overview' | 'code' | 'commits' | 'actions' | 'prs';

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

export function GitStatusBanners(_props: GitStatusBannersProps) {
  return null;
}

interface GitTabBarProps {
  tab: GitTab;
  commitsCount: number;
  actionsCount: number;
  prsCount: number;
  onSelectTab: (tab: GitTab) => void;
}

export function GitTabBar({ tab, commitsCount, actionsCount, prsCount, onSelectTab }: GitTabBarProps) {
  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'code' as const, label: 'Code', icon: Code2 },
    { id: 'commits' as const, label: `Commits (${commitsCount})`, icon: GitCommitHorizontal },
    { id: 'actions' as const, label: `Actions (${actionsCount})`, icon: PlayCircle },
    { id: 'prs' as const, label: `Pull Requests (${prsCount})`, icon: GitPullRequest },
  ];

  return (
    <div className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[#30363D] bg-[#0D1117] px-4">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelectTab(id)}
          className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
            tab === id
              ? 'border-[#22C55E] text-[#4ADE80]'
              : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
