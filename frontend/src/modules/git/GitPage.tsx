import { useEffect, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { gitService } from '../../services/git.service';
import type { GitRepoData } from '../../types/git.types';
import { GitCodeView } from './GitCodeView';
import { GitCommitsView } from './GitCommitsView';
import { GitPullRequestsView } from './GitPullRequestsView';

interface GitPageProps {
  workspaceId: string;
}

type GitTab = 'code' | 'commits' | 'prs';

export function GitPage({ workspaceId }: GitPageProps) {
  const [repo, setRepo] = useState<GitRepoData | null>(null);
  const [branch, setBranch] = useState('main');
  const [tab, setTab] = useState<GitTab>('code');
  const [copiedClone, setCopiedClone] = useState(false);

  useEffect(() => {
    let active = true;
    gitService.getRepository(workspaceId).then((data) => {
      if (!active) return;
      setRepo(data);
      setBranch(data.defaultBranch);
    });
    return () => {
      active = false;
    };
  }, [workspaceId]);

  async function handleCopyClone() {
    if (!repo) return;
    await navigator.clipboard.writeText(repo.cloneUrl);
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 1500);
  }

  if (!repo) {
    return (
      <div className="border border-[#30363D] bg-[#161B22] p-6 text-sm text-[#8A8A8A]">
        Loading repository...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#30363D] bg-[#161B22] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-lg font-semibold text-[#E6EDF3]">
            {repo.slug}
          </h1>
          <Badge tone="neutral">{repo.visibility}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center border border-[#3B434B] bg-[#0D1117] px-2.5">
            <GitBranch className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="h-9 bg-transparent px-2 font-mono text-xs text-[#E6EDF3] focus:outline-none"
            >
              {repo.branches.map((b) => (
                <option key={b} value={b} className="bg-[#161B22]">
                  {b}
                </option>
              ))}
            </select>
          </div>

          <Button type="button" variant="primary" onClick={() => void handleCopyClone()}>
            {copiedClone ? (
              <>
                <Check className="h-4 w-4" strokeWidth={1.5} />
                SSH Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" strokeWidth={1.5} />
                Clone SSH
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[#30363D]">
        {[
          { id: 'code' as const, label: 'Code', icon: Code2 },
          { id: 'commits' as const, label: `Commits (${repo.commits.length})`, icon: GitCommitHorizontal },
          { id: 'prs' as const, label: `Pull Requests (${repo.pullRequests.length})`, icon: GitPullRequest },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'border-[#22C55E] text-[#22C55E]'
                  : 'border-transparent text-[#BDBDBD] hover:text-[#E6EDF3]'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'code' && <GitCodeView files={repo.files} />}
      {tab === 'commits' && <GitCommitsView commits={repo.commits} />}
      {tab === 'prs' && <GitPullRequestsView pullRequests={repo.pullRequests} />}
    </div>
  );
}
