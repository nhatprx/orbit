import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, FolderKanban, RefreshCw } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { issuesService } from '../../services/issues/issues.service';
import { errorMessage } from '../../services/workspace/httpClient';
import type { WorkspaceIssuePortfolioDto } from '../../types/issues.types';
import { PortfolioIssueFeed } from './PortfolioIssueFeed';

export interface WorkspaceIssuesPortfolioProps {
  workspaceId: string;
  workspaceName: string;
  onOpenProject: (projectId: string) => void;
}

export function WorkspaceIssuesPortfolio({
  workspaceId,
  workspaceName,
  onOpenProject,
}: WorkspaceIssuesPortfolioProps) {
  const [portfolio, setPortfolio] = useState<WorkspaceIssuePortfolioDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPortfolio(await issuesService.getWorkspacePortfolio(workspaceId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  if (loading && !portfolio) return <LoadingView label="Loading workspace issues portfolio..." />;
  if (error && !portfolio) {
    return (
      <div className="p-5">
        <ErrorView message={error} onRetry={() => void loadPortfolio()} />
      </div>
    );
  }
  if (!portfolio) return null;

  const kpis = [
    { label: 'Total Issues', value: portfolio.totalIssues, accent: 'text-[#E6EDF3]' },
    { label: 'Open / Backlog', value: portfolio.openIssues, accent: 'text-[#E6EDF3]' },
    { label: 'In Progress', value: portfolio.inProgressIssues, accent: 'text-[#22C55E]' },
    { label: 'Done', value: portfolio.doneIssues, accent: 'text-[#4ADE80]' },
    { label: 'Critical Priority', value: portfolio.criticalIssues, accent: portfolio.criticalIssues > 0 ? 'text-[#EF4444]' : 'text-[#E6EDF3]' },
    { label: 'Active Sprints', value: portfolio.activeSprintsCount, accent: 'text-[#22C55E]' },
  ];

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto bg-[#0D1117] p-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            <h1 className="text-base font-semibold tracking-tight text-[#E6EDF3]">
              {workspaceName} — Issues Portfolio
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#8B949E]">
            Cross-project sprint velocity, lifecycle progress, and active work items.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void loadPortfolio()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          Refresh
        </Button>
      </header>

      {error && <ErrorView message={error} onRetry={() => void loadPortfolio()} />}

      <section aria-label="Workspace issue metrics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-none border border-[#30363D] bg-[#161B22] p-3.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#8B949E]">{kpi.label}</p>
            <p className={`mt-1.5 font-mono text-2xl font-semibold ${kpi.accent}`}>{kpi.value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
          Project Lifecycle Breakdown ({portfolio.projects.length})
        </h2>

        {portfolio.projects.length === 0 ? (
          <EmptyView
            title="No projects in this workspace"
            description="Create a project with the Issues & Sprints module enabled to track delivery."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {portfolio.projects.map((proj) => (
              <article key={proj.projectId} className="flex flex-col justify-between gap-3 rounded-none border border-[#30363D] bg-[#161B22] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#E6EDF3]">{proj.projectName}</h3>
                    <p className="font-mono text-[11px] text-[#8B949E]">{proj.projectSlug}</p>
                  </div>
                  {proj.activeSprintName ? (
                    <Badge tone="green" withDot>{proj.activeSprintName}</Badge>
                  ) : (
                    <Badge tone="neutral">No Active Sprint</Badge>
                  )}
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
                    <span className="text-[#8B949E]">Completion ({proj.doneCount}/{proj.totalIssues})</span>
                    <span className="text-[#22C55E]">{proj.completionPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#21262D]">
                    <div className="h-full bg-[#22C55E]" style={{ width: `${Math.min(100, Math.max(0, proj.completionPercent))}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 border-y border-[#21262D] py-2 font-mono text-[11px]">
                  <div><span className="block text-[#8B949E]">Todo</span><span className="text-[#E6EDF3]">{proj.todoCount}</span></div>
                  <div><span className="block text-[#8B949E]">In Prog</span><span className="text-[#22C55E]">{proj.inProgressCount}</span></div>
                  <div><span className="block text-[#8B949E]">Review</span><span className="text-[#EAB308]">{proj.inReviewCount}</span></div>
                  <div><span className="block text-[#8B949E]">Done</span><span className="text-[#4ADE80]">{proj.doneCount}</span></div>
                  <div>
                    <span className="block text-[#8B949E]">Critical</span>
                    <span className={proj.criticalCount > 0 ? 'text-[#EF4444]' : 'text-[#E6EDF3]'}>{proj.criticalCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#8B949E]">Backlog: {proj.backlogCount}</span>
                  <Button type="button" variant="secondary" onClick={() => onOpenProject(proj.projectId)}>
                    Open Project Board
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <PortfolioIssueFeed issues={portfolio.recentIssues} onOpenProject={onOpenProject} />
    </div>
  );
}
