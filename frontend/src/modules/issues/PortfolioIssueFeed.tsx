import { useMemo, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyView } from '../../components/ui/StateViews';
import type { IssueDto, IssuePriority, IssueStatus } from '../../types/issues.types';
import { formatRelative } from '../../utils/format';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  PRIORITY_DOT_CLASS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  TYPE_LABELS,
} from './issueDetailMeta';

interface PortfolioIssueFeedProps {
  issues: IssueDto[];
  onOpenProject: (projectId: string) => void;
}

const PAGE_SIZE = 20;

export function PortfolioIssueFeed({ issues, onOpenProject }: PortfolioIssueFeedProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | 'ALL'>('ALL');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter((issue) => {
      if (statusFilter !== 'ALL' && issue.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && issue.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        issue.issueKey.toLowerCase().includes(q) ||
        issue.title.toLowerCase().includes(q) ||
        issue.projectName.toLowerCase().includes(q) ||
        issue.labels.some((lbl) => lbl.toLowerCase().includes(q))
      );
    });
  }, [issues, query, statusFilter, priorityFilter]);

  const displayed = filtered.slice(0, visibleCount);

  return (
    <section className="rounded-none border border-[#30363D] bg-[#161B22]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] px-4 py-3">
        <div>
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
            Cross-Project Issue Feed
          </h2>
          <p className="mt-0.5 text-xs text-[#8B949E]">
            Showing <span className="font-mono text-[#E6EDF3]">{displayed.length}</span> of{' '}
            <span className="font-mono text-[#E6EDF3]">{filtered.length}</span> matching issues
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8B949E]"
              strokeWidth={1.5}
            />
            <input
              type="text"
              aria-label="Search workspace issues"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="Search key, title, project..."
              className="h-8 w-56 rounded-none border border-[#30363D] bg-[#0D1117] pl-8 pr-2.5 text-xs text-[#E6EDF3] placeholder-[#8B949E] focus:border-[#22C55E] focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter feed by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as IssueStatus | 'ALL')}
            className="h-8 rounded-none border border-[#30363D] bg-[#0D1117] px-2.5 text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            {ISSUE_STATUSES.map((st) => (
              <option key={st} value={st}>{STATUS_LABELS[st]}</option>
            ))}
          </select>

          <select
            aria-label="Filter feed by priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as IssuePriority | 'ALL')}
            className="h-8 rounded-none border border-[#30363D] bg-[#0D1117] px-2.5 text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            {ISSUE_PRIORITIES.map((pr) => (
              <option key={pr} value={pr}>{PRIORITY_LABELS[pr]}</option>
            ))}
          </select>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="p-4">
          <EmptyView
            title="No matching issues"
            description="Adjust the status, priority, or search filter to inspect workspace activity."
          />
        </div>
      ) : (
        <div className="divide-y divide-[#21262D]">
          {displayed.map((issue) => (
            <div
              key={issue.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#21262D]/60"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span
                  title={PRIORITY_LABELS[issue.priority]}
                  className={`h-1.5 w-1.5 shrink-0 ${PRIORITY_DOT_CLASS[issue.priority]}`}
                />
                <span className="shrink-0 font-mono text-xs font-medium text-[#22C55E]">
                  {issue.issueKey}
                </span>
                <Badge tone="neutral">{TYPE_LABELS[issue.type]}</Badge>
                <span className="truncate text-[13px] font-medium text-[#E6EDF3]">
                  {issue.title}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[11px] text-[#8B949E]">
                  {issue.projectName}
                </span>
                <Badge tone={STATUS_TONE[issue.status]} withDot>
                  {STATUS_LABELS[issue.status]}
                </Badge>
                {issue.storyPoints !== null && (
                  <span className="font-mono text-[11px] text-[#8B949E]">{issue.storyPoints} SP</span>
                )}
                <span className="font-mono text-[11px] text-[#8B949E]">
                  {formatRelative(issue.updatedAt)}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenProject(issue.projectId)}
                  className="inline-flex items-center gap-1 border border-[#30363D] bg-[#0D1117] px-2 py-1 text-[11px] text-[#E6EDF3] hover:border-[#22C55E] hover:text-[#22C55E]"
                >
                  Board
                  <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > visibleCount && (
        <div className="flex justify-center border-t border-[#30363D] p-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          >
            Load More ({filtered.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </section>
  );
}
