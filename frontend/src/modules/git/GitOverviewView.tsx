import { Download, Eye, ExternalLink, GitFork, GitPullRequest, PlayCircle, Star, Users } from 'lucide-react';
import { UserAvatar } from '../../components/ui/UserAvatar';
import type { GitCollaboratorDto, GitRepoStatsDto, GitWorkflowRunDto } from '../../types/git-insights.types';
import type { GitBranchDto, GitCommitDto, GitPullRequestDto } from '../../types/git.types';
import { renderRunStatus } from './GitActionsView';
import { GitBranchGraph } from './GitBranchGraph';
import { GitContributorsChart } from './GitContributorsChart';
import type { ShareToChatPayload } from './GitShareToChatModal';
import type { GitTab } from './GitWorkspaceChrome';

interface GitOverviewViewProps {
  branches: GitBranchDto[];
  activeBranch: string;
  commits: GitCommitDto[];
  pullRequests: GitPullRequestDto[];
  runs: GitWorkflowRunDto[];
  collaborators: GitCollaboratorDto[];
  stats?: GitRepoStatsDto | null;
  canWrite?: boolean;
  onSelectBranch: (name: string) => void;
  onManageBranches: () => void;
  onCompareBranch?: (baseBranch: string, headBranch: string) => void;
  onQuickPr?: (headBranch: string) => void;
  onInspectCommit: (sha: string) => void;
  onInspectPr?: (pullNumber: number) => void;
  onShareToChat?: (payload: ShareToChatPayload) => void;
  onSwitchTab: (tab: GitTab) => void;
}

export function GitOverviewView({
  branches, activeBranch, commits, pullRequests, runs, collaborators, stats = null, canWrite = false,
  onSelectBranch, onManageBranches, onCompareBranch, onQuickPr, onInspectCommit, onInspectPr, onShareToChat, onSwitchTab,
}: GitOverviewViewProps) {
  const openPrs = pullRequests.filter((p) => p.status === 'open');
  const contributors = stats?.topContributors ?? [];
  const avatarByAuthor: Record<string, string> = {};
  for (const col of collaborators) { if (col.avatarUrl) avatarByAuthor[col.login.toLowerCase()] = col.avatarUrl; }
  for (const ct of contributors) { if (ct.avatarUrl) avatarByAuthor[ct.login.toLowerCase()] = ct.avatarUrl; }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-4">
        <GitBranchGraph
          branches={branches} commits={commits} activeBranch={activeBranch} avatarByAuthor={avatarByAuthor} canWrite={canWrite}
          onSelectBranch={onSelectBranch} onManageBranches={onManageBranches}
          onCompareBranch={onCompareBranch} onQuickPr={onQuickPr}
          onInspectCommit={onInspectCommit} onShareToChat={onShareToChat}
          onBrowseCode={() => onSwitchTab('code')} onViewAllCommits={() => onSwitchTab('commits')}
        />
      </div>

      <div className="min-w-0 space-y-4 xl:col-span-8">
        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <div className="border border-[#30363D] bg-[#161B22] p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[#8A8A8A]"><Eye className="h-3 w-3 text-[#22C55E]" />Views (14d)</div>
            <p className="mt-1 font-mono text-base font-semibold text-[#E6EDF3]">{stats?.views14d ?? 0}</p>
            <p className="font-mono text-[10px] text-[#7D8590]">{stats?.uniqueVisitors14d ?? 0} unique</p>
          </div>
          <div className="border border-[#30363D] bg-[#161B22] p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[#8A8A8A]"><Download className="h-3 w-3 text-[#22C55E]" />Clones (14d)</div>
            <p className="mt-1 font-mono text-base font-semibold text-[#E6EDF3]">{stats?.clones14d ?? 0}</p>
            <p className="font-mono text-[10px] text-[#7D8590]">{stats?.uniqueCloners14d ?? 0} unique</p>
          </div>
          <div className="border border-[#30363D] bg-[#161B22] p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[#8A8A8A]"><Star className="h-3 w-3 text-[#EAB308]" />Stars</div>
            <p className="mt-1 font-mono text-base font-semibold text-[#E6EDF3]">{stats?.stars ?? 0}</p>
            <p className="font-mono text-[10px] text-[#7D8590]">{stats?.watchers ?? 0} watching</p>
          </div>
          <div className="border border-[#30363D] bg-[#161B22] p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[#8A8A8A]"><GitFork className="h-3 w-3 text-[#22C55E]" />Forks</div>
            <p className="mt-1 font-mono text-base font-semibold text-[#E6EDF3]">{stats?.forks ?? 0}</p>
            <p className="font-mono text-[10px] text-[#7D8590]">{stats?.openIssues ?? 0} open issues</p>
          </div>
          <div className="border border-[#30363D] bg-[#161B22] p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[#8A8A8A]"><Users className="h-3 w-3 text-[#22C55E]" />Team</div>
            <p className="mt-1 font-mono text-base font-semibold text-[#E6EDF3]">{collaborators.length}</p>
            <p className="font-mono text-[10px] text-[#7D8590]">{openPrs.length} open PRs</p>
          </div>
        </section>

        <section className="border border-[#30363D] bg-[#161B22]">
          <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#E6EDF3]">
              <PlayCircle className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
              <span>CI/CD &amp; GitHub Actions</span>
            </div>
            <button type="button" onClick={() => onSwitchTab('actions')} className="font-mono text-[11px] text-[#22C55E] hover:underline">
              View all ({runs.length})
            </button>
          </div>
          <div className="divide-y divide-[#21262D]">
            {runs.slice(0, 5).map((run) => (
              <div key={run.id} className="flex items-center justify-between gap-2 px-4 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#E6EDF3]">{run.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-[#8A8A8A]">{run.headBranch} · @{run.actorLogin}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {renderRunStatus(run.status, run.conclusion)}
                  {run.htmlUrl && (
                    <a href={run.htmlUrl} target="_blank" rel="noreferrer" aria-label={`Open ${run.name}`} className="text-[#8A8A8A] hover:text-[#4ADE80]">
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              </div>
            ))}
            {runs.length === 0 && <p className="px-4 py-5 text-xs text-[#8A8A8A]">No GitHub Actions runs detected.</p>}
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          <section className="flex flex-col border border-[#30363D] bg-[#161B22] lg:col-span-5">
            <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#E6EDF3]">
                <Users className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
                <span>Collaborators ({collaborators.length})</span>
              </div>
              <button type="button" onClick={() => onSwitchTab('prs')} className="font-mono text-[11px] text-[#22C55E] hover:underline">
                Open PRs ({openPrs.length})
              </button>
            </div>
            <div className="no-scrollbar max-h-60 divide-y divide-[#21262D] overflow-y-auto">
              {collaborators.length > 0 ? (
                collaborators.slice(0, 12).map((col) => (
                  <a
                    key={col.login}
                    href={col.htmlUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 px-4 py-2 text-xs transition-colors hover:bg-[#0D1117]"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <UserAvatar name={col.login} avatarUrl={col.avatarUrl} />
                      <span className="truncate font-mono text-[#E6EDF3]">@{col.login}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="border border-[#30363D] bg-[#0D1117] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#8A8A8A]">
                        {col.roleName}
                      </span>
                      <ExternalLink className="h-3 w-3 text-[#6E7681]" strokeWidth={1.5} />
                    </span>
                  </a>
                ))
              ) : (
                <p className="px-4 py-6 text-xs text-[#8A8A8A]">No collaborators returned.</p>
              )}
            </div>
            {openPrs.length > 0 && (
              <div className="border-t border-[#30363D] bg-[#0D1117] px-4 py-2">
                {openPrs.slice(0, 3).map((pr) => (
                  <button key={pr.number} type="button" onClick={() => onInspectPr?.(pr.number)} className="flex w-full items-center justify-between gap-2 py-1 text-left text-xs hover:text-[#4ADE80]">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-[#E6EDF3]">
                      <GitPullRequest className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                      <span className="truncate">#{pr.number} {pr.title}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-[#8A8A8A]">{pr.sourceBranch}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <GitContributorsChart contributors={contributors} className="lg:col-span-7" />
        </div>
      </div>
    </div>
  );
}
