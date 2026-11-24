import { Download, Eye, ExternalLink, GitFork, GitPullRequest, PlayCircle, Star, Users } from 'lucide-react';
import { UserAvatar } from '../../components/ui/UserAvatar';
import type { GitCollaboratorDto, GitRepoStatsDto, GitWorkflowRunDto } from '../../types/git-insights.types';
import type { GitBranchDto, GitCommitDto, GitPullRequestDto } from '../../types/git.types';
import { renderRunStatus } from './GitActionsView';
import { GitBranchGraph } from './GitBranchGraph';
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
  const maxContrib = Math.max(1, ...contributors.map((c) => c.contributions));

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="xl:col-span-4">
        <GitBranchGraph
          branches={branches} commits={commits} activeBranch={activeBranch} canWrite={canWrite}
          onSelectBranch={onSelectBranch} onManageBranches={onManageBranches}
          onCompareBranch={onCompareBranch} onQuickPr={onQuickPr}
          onInspectCommit={onInspectCommit} onShareToChat={onShareToChat}
          onBrowseCode={() => onSwitchTab('code')} onViewAllCommits={() => onSwitchTab('commits')}
        />
      </div>

      <div className="space-y-4 xl:col-span-8">
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

        <section className="border border-[#30363D] bg-[#161B22]">
          <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#E6EDF3]">
              <Users className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
              <span>Collaboration &amp; Contributors</span>
            </div>
            <button type="button" onClick={() => onSwitchTab('prs')} className="font-mono text-[11px] text-[#22C55E] hover:underline">
              Open PRs ({openPrs.length})
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 p-3.5 md:grid-cols-2">
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase text-[#8A8A8A]">Collaborators ({collaborators.length})</p>
              {collaborators.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {collaborators.slice(0, 10).map((col) => (
                    <a key={col.login} href={col.htmlUrl || undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-[#30363D] bg-[#0D1117] px-2 py-1 text-xs hover:border-[#22C55E]">
                      <UserAvatar name={col.login} avatarUrl={col.avatarUrl} />
                      <span className="font-mono text-[#E6EDF3]">@{col.login}</span>
                      <span className="border border-[#21262D] bg-[#161B22] px-1 py-0.5 font-mono text-[9px] text-[#8A8A8A]">{col.roleName}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8A8A8A]">No collaborators returned.</p>
              )}
              {openPrs.length > 0 && (
                <div className="border-t border-[#21262D] pt-2">
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
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase text-[#8A8A8A]">Top Contributors</p>
              {contributors.length > 0 ? (
                <div className="space-y-1.5">
                  {contributors.slice(0, 6).map((ct) => (
                    <div key={ct.login} className="space-y-1">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="truncate text-[#E6EDF3]">@{ct.login}</span>
                        <span className="text-[#4ADE80]">{ct.contributions} commits</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#0D1117]">
                        <div className="h-full bg-[#22C55E]" style={{ width: `${Math.max(6, Math.round((ct.contributions / maxContrib) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8A8A8A]">No contributor statistics available.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
