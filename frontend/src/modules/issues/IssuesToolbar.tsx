import { Columns3, Flag, Layers, Plus, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { IssuePriority, IssueType, SprintDto } from '../../types/issues.types';
import { hasActiveIssueFilters, type ProjectIssueFilters } from './issueFilters';
import {
  ISSUE_PRIORITY_META,
  ISSUE_PRIORITY_ORDER,
  ISSUE_TYPE_META,
  ISSUE_TYPE_ORDER,
} from './issueVisuals';

export type IssuesViewMode = 'board' | 'backlog' | 'epics';

interface IssuesToolbarProps {
  projectName: string;
  totalCount: number;
  filteredCount: number;
  activeSprint: SprintDto | null;
  sprints: SprintDto[];
  view: IssuesViewMode;
  filters: ProjectIssueFilters;
  loading: boolean;
  canWrite: boolean;
  onViewChange: (view: IssuesViewMode) => void;
  onFilterChange: <K extends keyof ProjectIssueFilters>(key: K, value: ProjectIssueFilters[K]) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
  onNewSprint: () => void;
  onNewIssue: () => void;
}

const VIEW_TABS: readonly { id: IssuesViewMode; label: string; icon: typeof Columns3 }[] = [
  { id: 'board', label: 'Board', icon: Columns3 },
  { id: 'backlog', label: 'Backlog & Sprints', icon: Layers },
  { id: 'epics', label: 'Epics', icon: Flag },
];

const SELECT_CLS =
  'h-8 border border-[#30363D] bg-[#0D1117] px-2 text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

export function IssuesToolbar(props: IssuesToolbarProps) {
  const { projectName, totalCount, filteredCount, activeSprint, sprints, view, filters } = props;
  const hasFilters = hasActiveIssueFilters(filters);

  return (
    <header className="shrink-0 border-b border-[#30363D] bg-[#161B22]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-base font-semibold text-[#E6EDF3]">{projectName}</h1>
          <span className="border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[11px] text-[#8B949E]">
            {hasFilters ? `${filteredCount}/${totalCount}` : totalCount} issues
          </span>
          {activeSprint && (
            <span className="inline-flex items-center gap-1.5 border border-[#22C55E] bg-[#052E16] px-2 py-0.5 font-mono text-[11px] text-[#22C55E]">
              <span className="h-1.5 w-1.5 bg-[#22C55E]" />
              {activeSprint.name}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" onClick={props.onRefresh} disabled={props.loading} aria-label="Refresh issues">
            <RefreshCw className={`h-3.5 w-3.5 ${props.loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          </Button>
          {props.canWrite && (
            <>
              <Button type="button" variant="secondary" onClick={props.onNewSprint}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                New Sprint
              </Button>
              <Button type="button" variant="primary" onClick={props.onNewIssue}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                New Issue
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#21262D] px-5 py-2">
        <div className="flex items-center gap-1" role="tablist" aria-label="Issues views">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => props.onViewChange(tab.id)}
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                    : 'border-transparent text-[#8B949E] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#8B949E]" strokeWidth={1.5} />
            <input
              type="search"
              value={filters.q}
              onChange={(e) => props.onFilterChange('q', e.target.value)}
              placeholder="Search key, title, label..."
              aria-label="Search issues"
              className="h-8 w-48 border border-[#30363D] bg-[#0D1117] pl-8 pr-2 text-xs text-[#E6EDF3] placeholder:text-[#7D8590] focus:border-[#22C55E] focus:outline-none sm:w-56"
            />
          </div>

          <select
            aria-label="Filter by type"
            value={filters.type}
            onChange={(e) => props.onFilterChange('type', e.target.value as IssueType | 'ALL')}
            className={SELECT_CLS}
          >
            <option value="ALL">All Types</option>
            {ISSUE_TYPE_ORDER.map((type) => (
              <option key={type} value={type}>{ISSUE_TYPE_META[type].label}</option>
            ))}
          </select>

          <select
            aria-label="Filter by priority"
            value={filters.priority}
            onChange={(e) => props.onFilterChange('priority', e.target.value as IssuePriority | 'ALL')}
            className={SELECT_CLS}
          >
            <option value="ALL">All Priorities</option>
            {ISSUE_PRIORITY_ORDER.map((priority) => (
              <option key={priority} value={priority}>{ISSUE_PRIORITY_META[priority].label}</option>
            ))}
          </select>

          <select
            aria-label="Filter by sprint"
            value={filters.sprintId}
            onChange={(e) => props.onFilterChange('sprintId', e.target.value)}
            className={SELECT_CLS}
          >
            <option value="ALL">All Sprints</option>
            <option value="BACKLOG">Backlog Only</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={props.onResetFilters}
              className="inline-flex h-8 items-center gap-1 border border-[#30363D] bg-[#21262D] px-2 text-xs text-[#8B949E] hover:border-[#22C55E] hover:text-[#E6EDF3]"
            >
              <X className="h-3 w-3" strokeWidth={1.5} />
              Clear
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
